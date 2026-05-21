create table if not exists report_views (
  id bigint generated always as identity primary key,
  report_id text not null,
  viewer_id text not null,
  viewed_at timestamptz not null default now(),
  view_source text not null default 'web',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_report_views_report_id
  on report_views (report_id);

create index if not exists idx_report_views_viewer_id
  on report_views (viewer_id);

create table if not exists report_acknowledgements (
  report_id text not null,
  viewer_id text not null,
  acknowledged_at timestamptz not null default now(),
  primary key (report_id, viewer_id)
);

create index if not exists idx_report_acknowledgements_viewer_id
  on report_acknowledgements (viewer_id);

create table if not exists system_logs (
  id bigint generated always as identity primary key,
  log_type text not null,
  log_level text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  is_acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  acknowledged_by text,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text,
  source text not null default 'client',
  page_url text,
  event_name text,
  fingerprint text,
  created_at timestamptz not null default now()
);

alter table system_logs
  add column if not exists is_acknowledged boolean not null default false,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by text,
  add column if not exists is_resolved boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text,
  add column if not exists resolution_note text,
  add column if not exists source text not null default 'client',
  add column if not exists page_url text,
  add column if not exists event_name text,
  add column if not exists fingerprint text;

update system_logs
set log_level = upper(log_level)
where log_level <> upper(log_level);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_system_logs_log_level'
  ) then
    alter table system_logs
      add constraint chk_system_logs_log_level
      check (log_level in ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'CRITICAL'));
  end if;
end $$;

create index if not exists idx_system_logs_created_at
  on system_logs (created_at desc);

create index if not exists idx_system_logs_type_level
  on system_logs (log_type, log_level);

create index if not exists idx_system_logs_level_created_at
  on system_logs (log_level, created_at desc);

create index if not exists idx_system_logs_error_priority
  on system_logs (is_resolved, is_acknowledged, created_at desc)
  where log_level in ('ERROR', 'FATAL', 'CRITICAL');

create index if not exists idx_system_logs_fingerprint
  on system_logs (fingerprint);
