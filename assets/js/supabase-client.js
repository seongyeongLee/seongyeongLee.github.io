const SYSTEM_LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'CRITICAL'];
const DEFECT_LOG_LEVELS = ['ERROR', 'FATAL', 'CRITICAL'];
const SYSTEM_LOG_LEVEL_RANK = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
  CRITICAL: 70
};
const LOCAL_SYSTEM_LOG_STORAGE_KEY = 'report-hub-local-system-logs';

function normalizeLogLevel(logLevel = 'INFO') {
  const normalized = String(logLevel).toUpperCase();
  return SYSTEM_LOG_LEVELS.includes(normalized) ? normalized : 'INFO';
}

function isDefectLogLevel(logLevel) {
  return DEFECT_LOG_LEVELS.includes(normalizeLogLevel(logLevel));
}

function getLogLevelRank(logLevel) {
  return SYSTEM_LOG_LEVEL_RANK[normalizeLogLevel(logLevel)] ?? SYSTEM_LOG_LEVEL_RANK.INFO;
}

function isSupabaseConfigured() {
  const url = window.APP_CONFIG?.SUPABASE_URL;
  const key = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  const enabled = window.APP_CONFIG?.FEATURES?.enableSupabase !== false;
  return Boolean(
    enabled &&
      url &&
      key &&
      !url.includes('YOUR_PROJECT') &&
      !key.includes('YOUR_SUPABASE')
  );
}

function createSupabaseClientInstance() {
  if (!window.supabase?.createClient || !isSupabaseConfigured()) {
    return null;
  }

  if (!window.__reportHubSupabaseClient) {
    window.__reportHubSupabaseClient = window.supabase.createClient(
      window.APP_CONFIG.SUPABASE_URL,
      window.APP_CONFIG.SUPABASE_ANON_KEY
    );
  }

  return window.__reportHubSupabaseClient;
}

function getSupabaseConnectionState() {
  const client = createSupabaseClientInstance();
  if (!client) {
    return {
      enabled: false,
      mode: 'local-fallback',
      severity: 'WARN',
      message: 'Supabase 연결 정보가 없어 정적 화면은 로컬 기준으로 표시되며 DB 로그 저장은 수행되지 않습니다.'
    };
  }

  return {
    enabled: true,
    mode: 'supabase',
    severity: 'INFO',
    message: 'Supabase 연결이 설정되어 조회 이력, 확인 상태, 시스템 로그를 DB에 기록할 수 있습니다.'
  };
}

async function getCurrentViewer() {
  const client = createSupabaseClientInstance();
  if (!client) {
    return {
      viewerId: getLocalViewerId(),
      source: 'local'
    };
  }

  const { data } = await client.auth.getUser();
  if (data?.user?.id) {
    return {
      viewerId: data.user.id,
      source: 'supabase-auth'
    };
  }

  return {
    viewerId: getLocalViewerId(),
    source: 'local'
  };
}

function getLocalViewerId() {
  const storageKey = 'report-hub-viewer-id';
  let viewerId = window.localStorage.getItem(storageKey);
  if (!viewerId) {
    viewerId = `local-${crypto.randomUUID()}`;
    window.localStorage.setItem(storageKey, viewerId);
  }
  return viewerId;
}

async function fetchAcknowledgements(viewerId) {
  const client = createSupabaseClientInstance();
  if (!client || window.APP_CONFIG?.FEATURES?.enableAcknowledgement === false) return [];

  const { data, error } = await client
    .from('report_acknowledgements')
    .select('report_id, acknowledged_at')
    .eq('viewer_id', viewerId);

  if (error) {
    console.error('Failed to fetch acknowledgements', error);
    return [];
  }

  return data ?? [];
}

async function insertReportView(reportId, viewerId, metadata = {}) {
  const client = createSupabaseClientInstance();
  if (!client || window.APP_CONFIG?.FEATURES?.enableViewLogging === false) {
    return { success: false, skipped: true };
  }

  const { error } = await client.from('report_views').insert({
    report_id: reportId,
    viewer_id: viewerId,
    viewed_at: new Date().toISOString(),
    view_source: 'web',
    metadata
  });

  if (error) {
    console.error('Failed to record report view', error);
    await writeSystemLog('report_view_insert_failed', 'ERROR', '보고서 조회 이력 저장에 실패했습니다.', {
      reportId,
      viewerId,
      errorMessage: error.message,
      metadata
    });
    return { success: false, skipped: false, error };
  }

  return { success: true };
}

async function upsertAcknowledgement(reportId, viewerId) {
  const client = createSupabaseClientInstance();
  if (!client || window.APP_CONFIG?.FEATURES?.enableAcknowledgement === false) {
    return { success: false, skipped: true };
  }

  const { error } = await client.from('report_acknowledgements').upsert(
    {
      report_id: reportId,
      viewer_id: viewerId,
      acknowledged_at: new Date().toISOString()
    },
    {
      onConflict: 'report_id,viewer_id'
    }
  );

  if (error) {
    console.error('Failed to acknowledge report', error);
    await writeSystemLog('report_acknowledgement_failed', 'ERROR', '보고서 확인 상태 저장에 실패했습니다.', {
      reportId,
      viewerId,
      errorMessage: error.message
    });
    return { success: false, skipped: false, error };
  }

  return { success: true };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadLocalSystemLogs() {
  return safeJsonParse(window.localStorage.getItem(LOCAL_SYSTEM_LOG_STORAGE_KEY) || '[]', []);
}

function saveLocalSystemLogs(logs) {
  const cappedLogs = logs
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 200);
  window.localStorage.setItem(LOCAL_SYSTEM_LOG_STORAGE_KEY, JSON.stringify(cappedLogs));
}

function buildLogFingerprint(logType, logLevel, message, context = {}) {
  const source = [
    normalizeLogLevel(logLevel),
    logType,
    message,
    context.page ?? '',
    context.pathname ?? window.location.pathname
  ].join('|');

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }

  return `log-${Math.abs(hash).toString(36)}`;
}

function buildSystemLogPayload(logType, logLevel, message, context = {}) {
  const normalizedLevel = normalizeLogLevel(logLevel);
  const defect = isDefectLogLevel(normalizedLevel);
  const timestamp = new Date().toISOString();

  return {
    log_type: logType,
    log_level: normalizedLevel,
    message,
    context,
    is_acknowledged: defect ? false : true,
    acknowledged_at: defect ? null : timestamp,
    acknowledged_by: defect ? null : 'system',
    is_resolved: defect ? false : true,
    resolved_at: defect ? null : timestamp,
    resolved_by: defect ? null : 'system',
    resolution_note: null,
    source: context.source ?? 'client',
    page_url: context.pageUrl ?? window.location.href,
    event_name: context.eventName ?? logType,
    fingerprint: context.fingerprint ?? buildLogFingerprint(logType, normalizedLevel, message, context),
    created_at: timestamp
  };
}

function persistLocalSystemLog(payload, storageReason = 'local-fallback') {
  const localLog = {
    ...payload,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storage_mode: storageReason
  };
  const logs = loadLocalSystemLogs();
  logs.unshift(localLog);
  saveLocalSystemLogs(logs);
  return localLog;
}

async function writeSystemLog(logType, logLevel, message, context = {}) {
  if (window.APP_CONFIG?.FEATURES?.enableSystemLogging === false) {
    return { success: false, skipped: true, reason: 'feature-disabled' };
  }

  const payload = buildSystemLogPayload(logType, logLevel, message, context);
  const client = createSupabaseClientInstance();
  if (!client) {
    const localLog = persistLocalSystemLog(payload, 'supabase-unconfigured');
    return { success: false, skipped: true, localLog, reason: 'supabase-unconfigured' };
  }

  const { data, error } = await client
    .from('system_logs')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to write system log', error);
    const localLog = persistLocalSystemLog({
      ...payload,
      log_level: isDefectLogLevel(payload.log_level) ? payload.log_level : 'ERROR',
      message: `${payload.message} / DB 로그 저장 실패: ${error.message}`,
      is_acknowledged: false,
      is_resolved: false,
      context: {
        ...payload.context,
        dbLogError: error.message
      }
    }, 'supabase-insert-failed');
    return { success: false, skipped: false, error, localLog };
  }

  return { success: true, id: data?.id ?? null };
}

function sortSystemLogsByPriority(logs = []) {
  return [...logs].sort((a, b) => {
    const aRank = getLogLevelRank(a.log_level);
    const bRank = getLogLevelRank(b.log_level);
    const aDefect = isDefectLogLevel(a.log_level);
    const bDefect = isDefectLogLevel(b.log_level);

    const aPriority = [
      aDefect && !a.is_resolved ? 1 : 0,
      aDefect && !a.is_acknowledged ? 1 : 0,
      aRank,
      new Date(a.created_at).getTime()
    ];
    const bPriority = [
      bDefect && !b.is_resolved ? 1 : 0,
      bDefect && !b.is_acknowledged ? 1 : 0,
      bRank,
      new Date(b.created_at).getTime()
    ];

    for (let index = 0; index < aPriority.length; index += 1) {
      if (aPriority[index] !== bPriority[index]) {
        return bPriority[index] - aPriority[index];
      }
    }

    return 0;
  });
}

function filterLocalSystemLogs(options = {}) {
  const levels = Array.isArray(options.levels)
    ? options.levels.map(normalizeLogLevel)
    : null;
  const limit = options.limit ?? 100;
  let logs = loadLocalSystemLogs();

  if (levels?.length) {
    logs = logs.filter((log) => levels.includes(normalizeLogLevel(log.log_level)));
  }

  if (options.onlyDefects) {
    logs = logs.filter((log) => isDefectLogLevel(log.log_level));
  }

  if (options.onlyUnresolved) {
    logs = logs.filter((log) => isDefectLogLevel(log.log_level) && !log.is_resolved);
  }

  return sortSystemLogsByPriority(logs).slice(0, limit);
}

async function fetchSystemLogs(options = {}) {
  const client = createSupabaseClientInstance();
  if (!client) {
    return {
      success: false,
      skipped: true,
      storageMode: 'local-fallback',
      data: filterLocalSystemLogs(options)
    };
  }

  let query = client
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100);

  if (Array.isArray(options.levels) && options.levels.length > 0) {
    query = query.in('log_level', options.levels.map(normalizeLogLevel));
  }

  if (options.onlyDefects) {
    query = query.in('log_level', DEFECT_LOG_LEVELS);
  }

  if (options.onlyUnresolved) {
    query = query.eq('is_resolved', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch system logs', error);
    const localLog = persistLocalSystemLog(buildSystemLogPayload(
      'system_logs_fetch_failed',
      'ERROR',
      '시스템 로그 조회에 실패했습니다.',
      { errorMessage: error.message }
    ), 'supabase-fetch-failed');
    return {
      success: false,
      skipped: false,
      error,
      localLog,
      storageMode: 'local-fallback',
      data: filterLocalSystemLogs(options)
    };
  }

  return {
    success: true,
    storageMode: 'supabase',
    data: sortSystemLogsByPriority(data ?? [])
  };
}

function updateLocalSystemLog(logId, updates) {
  const logs = loadLocalSystemLogs();
  const index = logs.findIndex((log) => String(log.id) === String(logId));
  if (index === -1) {
    return { success: false, skipped: true, reason: 'local-log-not-found' };
  }

  logs[index] = {
    ...logs[index],
    ...updates
  };
  saveLocalSystemLogs(logs);
  return { success: true, storageMode: 'local-fallback', data: logs[index] };
}

async function acknowledgeSystemLog(logId, actor = 'local-viewer') {
  const timestamp = new Date().toISOString();
  const updates = {
    is_acknowledged: true,
    acknowledged_at: timestamp,
    acknowledged_by: actor
  };

  if (String(logId).startsWith('local-')) {
    return updateLocalSystemLog(logId, updates);
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return { success: false, skipped: true, reason: 'supabase-unconfigured' };
  }

  const { error } = await client
    .from('system_logs')
    .update(updates)
    .eq('id', logId);

  if (error) {
    console.error('Failed to acknowledge system log', error);
    return { success: false, skipped: false, error };
  }

  return { success: true, storageMode: 'supabase' };
}

async function resolveSystemLog(logId, actor = 'local-viewer', resolutionNote = '') {
  const timestamp = new Date().toISOString();
  const updates = {
    is_acknowledged: true,
    acknowledged_at: timestamp,
    acknowledged_by: actor,
    is_resolved: true,
    resolved_at: timestamp,
    resolved_by: actor,
    resolution_note: resolutionNote
  };

  if (String(logId).startsWith('local-')) {
    return updateLocalSystemLog(logId, updates);
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return { success: false, skipped: true, reason: 'supabase-unconfigured' };
  }

  const { error } = await client
    .from('system_logs')
    .update(updates)
    .eq('id', logId);

  if (error) {
    console.error('Failed to resolve system log', error);
    return { success: false, skipped: false, error };
  }

  return { success: true, storageMode: 'supabase' };
}

async function fetchSystemLogSummary() {
  const result = await fetchSystemLogs({ limit: 100 });
  const logs = result.data ?? [];
  const defectLogs = logs.filter((log) => isDefectLogLevel(log.log_level));
  const unresolvedDefects = defectLogs.filter((log) => !log.is_resolved);
  const unacknowledgedDefects = defectLogs.filter((log) => !log.is_acknowledged);
  const criticalDefects = defectLogs.filter((log) => ['FATAL', 'CRITICAL'].includes(normalizeLogLevel(log.log_level)));

  return {
    ...result,
    summary: {
      total: logs.length,
      defectCount: defectLogs.length,
      unresolvedDefectCount: unresolvedDefects.length,
      unacknowledgedDefectCount: unacknowledgedDefects.length,
      criticalDefectCount: criticalDefects.length,
      latestDefect: sortSystemLogsByPriority(defectLogs)[0] ?? null
    }
  };
}
