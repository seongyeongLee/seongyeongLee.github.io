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
      message: 'Supabase 연결 정보가 없어 로컬 기준으로 동작합니다.'
    };
  }

  return {
    enabled: true,
    mode: 'supabase',
    message: 'Supabase 연결이 설정되어 조회 이력과 확인 상태를 동기화합니다.'
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
    return { success: false, skipped: false, error };
  }

  return { success: true };
}
