let activeLogLevelFilter = 'ALL';
let currentLogActor = 'local-viewer';

const LOG_LEVEL_FILTERS = ['ALL', ...SYSTEM_LOG_LEVELS];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatLogTime(isoString) {
  if (!isoString) return '-';
  return formatKst(isoString);
}

function stringifyContext(context) {
  try {
    return JSON.stringify(context ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function getLogLevelClass(logLevel) {
  return `level-${normalizeLogLevel(logLevel).toLowerCase()}`;
}

function getDefectStateText(log) {
  if (!isDefectLogLevel(log.log_level)) return '일반 로그';
  const acknowledgeText = log.is_acknowledged ? '확인 완료' : '미확인';
  const resolveText = log.is_resolved ? '해결 완료' : '미해결';
  return `${acknowledgeText} / ${resolveText}`;
}

function renderConnectionStatus(result) {
  const target = document.getElementById('systemLogConnectionStatus');
  if (!target) return;

  const connectionState = getSupabaseConnectionState();
  const storageText = result?.storageMode === 'supabase'
    ? 'DB 로그 조회 중'
    : '로컬 대체 로그 조회 중';
  target.textContent = `${connectionState.message} (${storageText})`;
}

function renderLogLevelFilters() {
  const target = document.getElementById('logLevelFilters');
  if (!target) return;

  target.innerHTML = LOG_LEVEL_FILTERS.map((level) => `
    <button class="tab-button ${level === activeLogLevelFilter ? 'active' : ''}" data-log-level="${level}">
      ${level === 'ALL' ? '전체' : level}
    </button>
  `).join('');

  target.querySelectorAll('[data-log-level]').forEach((button) => {
    button.addEventListener('click', async () => {
      activeLogLevelFilter = button.dataset.logLevel;
      renderLogLevelFilters();
      await loadAndRenderLogs();
    });
  });
}

function renderSummaryCards(summary = {}, storageMode = 'local-fallback') {
  const target = document.getElementById('logSummaryCards');
  if (!target) return;

  const storageLabel = storageMode === 'supabase' ? 'Supabase DB' : '로컬 대체 로그';
  const latestDefect = summary.latestDefect;
  target.innerHTML = `
    <article class="summary-card severity-card ${summary.unresolvedDefectCount > 0 ? 'danger' : 'stable'}">
      <div class="preview-label">미해결 ERROR 이상</div>
      <h3>${summary.unresolvedDefectCount ?? 0}</h3>
      <div>해결 처리가 필요한 결함 로그입니다.</div>
    </article>
    <article class="summary-card severity-card ${summary.unacknowledgedDefectCount > 0 ? 'warning' : 'stable'}">
      <div class="preview-label">미확인 ERROR 이상</div>
      <h3>${summary.unacknowledgedDefectCount ?? 0}</h3>
      <div>담당자가 아직 확인하지 않은 결함입니다.</div>
    </article>
    <article class="summary-card severity-card ${summary.criticalDefectCount > 0 ? 'danger' : 'stable'}">
      <div class="preview-label">FATAL/CRITICAL</div>
      <h3>${summary.criticalDefectCount ?? 0}</h3>
      <div>서비스 중단 가능성이 있는 핵심 장애입니다.</div>
    </article>
    <article class="summary-card">
      <div class="preview-label">최근 결함</div>
      <h3>${latestDefect ? escapeHtml(latestDefect.log_level) : '없음'}</h3>
      <div>${latestDefect ? escapeHtml(latestDefect.message) : '최근 ERROR 이상 로그가 없습니다.'}</div>
      <div class="report-meta">${storageLabel}</div>
    </article>
  `;
}

function createLogCard(log, compact = false) {
  const defect = isDefectLogLevel(log.log_level);
  const level = normalizeLogLevel(log.log_level);
  const contextText = escapeHtml(stringifyContext(log.context));
  const storageLabel = log.storage_mode ? ` · ${log.storage_mode}` : '';
  const actionMarkup = defect ? `
    <div class="log-actions">
      <button class="control-button" data-log-action="acknowledge" ${log.is_acknowledged ? 'disabled' : ''}>
        확인 처리
      </button>
      <input
        class="resolution-input"
        type="text"
        value="${escapeHtml(log.resolution_note ?? '')}"
        placeholder="해결 메모"
        ${log.is_resolved ? 'disabled' : ''}
      />
      <button class="control-button primary" data-log-action="resolve" ${log.is_resolved ? 'disabled' : ''}>
        해결 처리
      </button>
    </div>
  ` : '';

  return `
    <article class="log-card ${defect ? 'defect-log' : ''}" data-log-id="${escapeHtml(log.id)}">
      <div class="log-title-row">
        <span class="level-pill ${getLogLevelClass(level)}">${level}</span>
        <h3>${escapeHtml(log.message)}</h3>
      </div>
      <div class="report-meta">
        ${formatLogTime(log.created_at)} · ${escapeHtml(log.event_name ?? log.log_type ?? '-')} · ${escapeHtml(log.source ?? 'client')}${storageLabel}
      </div>
      <div class="log-status-row">
        <span class="defect-status ${log.is_resolved ? 'resolved' : 'open'}">${getDefectStateText(log)}</span>
        <span class="report-meta">fingerprint ${escapeHtml(log.fingerprint ?? '-')}</span>
      </div>
      <div class="report-meta">페이지 ${escapeHtml(log.page_url ?? '-')}</div>
      ${compact ? '' : `
        <details class="context-details">
          <summary>컨텍스트 보기</summary>
          <pre>${contextText}</pre>
        </details>
      `}
      ${actionMarkup}
    </article>
  `;
}

function renderPriorityDefects(logs = []) {
  const target = document.getElementById('priorityDefectList');
  if (!target) return;

  const priorityLogs = logs.filter((log) => isDefectLogLevel(log.log_level)).slice(0, 8);
  if (!priorityLogs.length) {
    target.innerHTML = '<div class="report-item">우선 확인이 필요한 ERROR 이상 로그가 없습니다.</div>';
    return;
  }

  target.innerHTML = priorityLogs.map((log) => createLogCard(log, false)).join('');
}

function renderSystemLogList(logs = []) {
  const target = document.getElementById('systemLogList');
  if (!target) return;

  if (!logs.length) {
    target.innerHTML = '<div class="report-item">선택한 조건에 해당하는 로그가 없습니다.</div>';
    return;
  }

  target.innerHTML = logs.map((log) => createLogCard(log, true)).join('');
}

function getFilterOptions() {
  if (activeLogLevelFilter === 'ALL') {
    return { limit: 100 };
  }

  return {
    limit: 100,
    levels: [activeLogLevelFilter]
  };
}

async function seedLocalDefectLogsForValidation() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('seedTestLogs') !== '1' || isSupabaseConfigured()) return;

  await writeSystemLog('validation_error_sample', 'ERROR', '검증용 ERROR 로그입니다.', {
    source: 'validation',
    page: 'system-logs',
    eventName: 'validation_error_sample'
  });
  await writeSystemLog('validation_critical_sample', 'CRITICAL', '검증용 CRITICAL 로그입니다.', {
    source: 'validation',
    page: 'system-logs',
    eventName: 'validation_critical_sample'
  });
}

async function loadAndRenderLogs() {
  const [summaryResult, priorityResult, listResult] = await Promise.all([
    fetchSystemLogSummary(),
    fetchSystemLogs({ onlyDefects: true, limit: 50 }),
    fetchSystemLogs(getFilterOptions())
  ]);

  renderConnectionStatus(summaryResult);
  renderSummaryCards(summaryResult.summary, summaryResult.storageMode);
  renderPriorityDefects(priorityResult.data ?? []);
  renderSystemLogList(listResult.data ?? []);
}

async function bindLogActions() {
  document.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-log-action]');
    if (!actionButton) return;

    const card = actionButton.closest('[data-log-id]');
    const logId = card?.dataset.logId;
    if (!logId) return;

    actionButton.disabled = true;
    const action = actionButton.dataset.logAction;
    const note = card.querySelector('.resolution-input')?.value ?? '';
    const result = action === 'resolve'
      ? await resolveSystemLog(logId, currentLogActor, note)
      : await acknowledgeSystemLog(logId, currentLogActor);

    if (!result.success) {
      actionButton.disabled = false;
      await writeSystemLog('system_log_state_update_failed', 'ERROR', '시스템 로그 상태 변경에 실패했습니다.', {
        source: 'client',
        page: 'system-logs',
        logId,
        action,
        reason: result.reason ?? result.error?.message ?? 'unknown'
      });
    }

    await loadAndRenderLogs();
  });
}

async function initSystemLogsPage() {
  const viewer = await getCurrentViewer();
  currentLogActor = viewer.viewerId;

  renderLogLevelFilters();
  await seedLocalDefectLogsForValidation();

  await writeSystemLog('system_logs_page_viewed', 'DEBUG', '시스템 로그 관리 화면에 진입했습니다.', {
    source: 'client',
    page: 'system-logs',
    viewerSource: viewer.source
  });

  if (!isSupabaseConfigured()) {
    await writeSystemLog('supabase_unconfigured', 'WARN', 'Supabase 연결 정보가 없어 DB 로그 저장 대신 로컬 대체 로그를 사용합니다.', {
      source: 'client',
      page: 'system-logs',
      eventName: 'supabase_unconfigured'
    });
  }

  document.getElementById('refreshLogsButton')?.addEventListener('click', loadAndRenderLogs);
  await bindLogActions();
  await loadAndRenderLogs();
}

initSystemLogsPage().catch((error) => {
  console.error(error);
  const summaryCards = document.getElementById('logSummaryCards');
  const systemLogList = document.getElementById('systemLogList');

  if (summaryCards) {
    summaryCards.innerHTML = '<div class="report-item">로그 요약을 불러오지 못했습니다.</div>';
  }

  if (systemLogList) {
    systemLogList.innerHTML = '<div class="report-item">시스템 로그 화면 초기화 중 문제가 발생했습니다.</div>';
  }
});
