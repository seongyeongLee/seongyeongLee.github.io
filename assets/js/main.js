let activeCategory = 'plan';
let acknowledgementSet = new Set();

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function sortByCreatedAtAsc(items) {
  return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function getBasePathSummary() {
  const configuredBasePath = window.APP_CONFIG?.BASE_PATH ?? '';
  return configuredBasePath || '/';
}

function getSupabaseStatusSummary() {
  if (typeof getSupabaseConnectionState === 'function') {
    return getSupabaseConnectionState();
  }

  return {
    enabled: false,
    mode: 'unknown',
    severity: 'WARN',
    message: 'Supabase 연결 상태 확인 함수를 찾을 수 없습니다.'
  };
}

function buildMainLogContext(extra = {}) {
  return {
    page: 'main',
    basePath: getBasePath() || '/',
    pathname: window.location.pathname,
    ...extra
  };
}

async function writeClientLogSafely(logLevel, message, context = {}) {
  if (typeof writeSystemLog !== 'function') return;

  try {
    await writeSystemLog(
      'main_page_initialization',
      logLevel,
      message,
      buildMainLogContext(context)
    );
  } catch (error) {
    console.error('Failed to write main page log', error);
  }
}

function normalizeCategories(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  if (categories.length > 0) return categories;

  return [
    { key: 'plan', label: '작업 수행 계획서' },
    { key: 'test-scenario', label: '작업 검증 테스트 시나리오' },
    { key: 'test-result', label: '작업 검증 결과 보고서' },
    { key: 'worklog', label: '작업 내역 보고서' }
  ];
}

function ensureActiveCategory(cards) {
  const hasActive = cards.some((card) => card.key === activeCategory);
  if (hasActive) return;
  activeCategory = cards[0]?.key ?? 'plan';
}

function buildCategorySummary(data) {
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const categories = normalizeCategories(data);

  return categories.map((category) => {
    const items = reports.filter((report) => report.category === category.key);
    const latestReport = sortByCreatedAtDesc(items)[0] || null;
    const unreadItems = items.filter((item) => !acknowledgementSet.has(item.report_id));
    const oldestUnreadReport = sortByCreatedAtAsc(unreadItems)[0] || null;

    return {
      ...category,
      totalCount: items.length,
      unreadCount: unreadItems.length,
      latestReport,
      oldestUnreadReport,
      items: sortByCreatedAtDesc(items)
    };
  });
}

function renderSystemStatus(data, viewer) {
  const target = document.getElementById('systemStatus');
  const connectionStatus = document.getElementById('connectionStatus');
  if (!target || !connectionStatus) return;

  const supabaseState = getSupabaseStatusSummary();
  const connectionText = supabaseState.enabled ? 'Supabase 연동 활성' : 'Supabase 연동 미설정';
  const healthText = supabaseState.enabled ? '정상' : '제한 동작';
  const badgeClass = supabaseState.enabled ? 'info' : 'warn';

  target.innerHTML = `
    <div class="status-stack">
      <div class="status-line">
        <strong>운영 상태</strong>
        <span class="status-badge ${badgeClass}">${healthText}</span>
      </div>
      <div class="report-meta">Base path: ${getBasePathSummary()}</div>
      <div class="report-meta">사용자 식별 방식: ${viewer.source}</div>
      <div class="report-meta">연결 상태: ${connectionText}</div>
      <div class="report-meta">DB 로그 저장: ${supabaseState.enabled ? '가능' : '불가'}</div>
      <div class="report-meta">데이터 생성 시각: ${formatKst(data.generated_at)}</div>
      <div id="systemLogHealth" class="report-meta">시스템 로그 요약을 확인하는 중입니다.</div>
      <a class="report-link" href="${buildAppPath('/pages/system-logs.html')}">시스템 로그 관리로 이동</a>
    </div>
  `;

  connectionStatus.textContent = supabaseState.message;
}

async function renderSystemLogHealthSummary() {
  const target = document.getElementById('systemLogHealth');
  if (!target || typeof fetchSystemLogSummary !== 'function') return;

  const result = await fetchSystemLogSummary();
  const summary = result.summary ?? {};
  const storageLabel = result.storageMode === 'supabase' ? 'Supabase DB' : '로컬 대체 로그';
  target.textContent = `로그 저장소: ${storageLabel} · 미해결 ERROR 이상 ${summary.unresolvedDefectCount ?? 0}건 · 미확인 ${summary.unacknowledgedDefectCount ?? 0}건`;
}

function renderQuickReportLinks(data) {
  const target = document.getElementById('quickReportLinks');
  if (!target) return;

  const categories = normalizeCategories(data);
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const orderedReports = categories
    .map((category) => reports.find((report) => report.category === category.key))
    .filter(Boolean);

  if (!orderedReports.length) {
    target.innerHTML = '<div class="report-item">바로 이동할 보고서가 없습니다.</div>';
    return;
  }

  target.innerHTML = orderedReports.map((report) => `
    <article class="summary-card">
      <div class="preview-label">${report.category_label ?? report.category}</div>
      <h3>${report.title}</h3>
      <div>${report.summary ?? ''}</div>
      <div class="report-meta">수정 ${formatKst(report.updated_at)}</div>
      <a class="report-link" href="${buildDetailPath(report.report_id)}">상세 페이지로 이동</a>
    </article>
  `).join('');
}

function renderSummary(cards) {
  const target = document.getElementById('categorySummary');
  if (!target) return;

  target.innerHTML = cards.map((card) => `
    <article class="summary-card">
      <h3>${card.label}</h3>
      <div class="count-badge">미확인 ${card.unreadCount} / 전체 ${card.totalCount}</div>
      <div class="preview-block">
        <div class="preview-label">최신 보고서</div>
        <strong>${card.latestReport?.title ?? '보고서 없음'}</strong>
        <div>${card.latestReport?.summary ?? ''}</div>
      </div>
      <div class="preview-block">
        <div class="preview-label">먼저 확인할 보고서</div>
        <strong>${card.oldestUnreadReport?.title ?? '미확인 보고서 없음'}</strong>
        <div>${card.oldestUnreadReport?.summary ?? ''}</div>
      </div>
    </article>
  `).join('');
}

function renderList(items) {
  const target = document.getElementById('reportList');
  if (!target) return;

  if (!items.length) {
    target.innerHTML = '<div class="report-item">선택한 카테고리에 표시할 보고서가 없습니다.</div>';
    return;
  }

  target.innerHTML = items.map((item) => {
    const isRead = acknowledgementSet.has(item.report_id);
    return `
      <article class="report-item">
        <h3>${item.title}</h3>
        <p>${item.summary ?? ''}</p>
        <div class="report-meta">등록 ${formatKst(item.created_at)} · 수정 ${formatKst(item.updated_at)}</div>
        <div class="report-meta">상태 ${isRead ? '확인 완료' : '미확인'}</div>
        <a class="report-link" href="${buildDetailPath(item.report_id)}">상세 보기</a>
      </article>
    `;
  }).join('');
}

function renderTabs(cards) {
  const target = document.getElementById('categoryTabs');
  if (!target) return;

  target.innerHTML = cards.map((card) => `
    <button class="tab-button ${card.key === activeCategory ? 'active' : ''}" data-category="${card.key}">${card.label}</button>
  `).join('');

  target.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderTabs(cards);
      renderList(cards.find((card) => card.key === activeCategory)?.items ?? []);
    });
  });
}

async function init() {
  writeClientLogSafely('info', 'Main page initialization started');

  const [data, viewer] = await Promise.all([
    fetchReports(),
    getCurrentViewer()
  ]);

  const acknowledgements = await fetchAcknowledgements(viewer.viewerId);
  acknowledgementSet = new Set((acknowledgements || []).map((item) => item.report_id));

  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated) {
    lastUpdated.textContent = `마지막 갱신 ${formatKst(data.generated_at)}`;
  }

  renderSystemStatus(data, viewer);

  if (!getSupabaseStatusSummary().enabled) {
    await writeClientLogSafely('warn', 'Supabase is not configured; DB-backed status features are unavailable', {
      eventName: 'supabase_unconfigured'
    });
  }

  await renderSystemLogHealthSummary();
  renderQuickReportLinks(data);

  const cards = buildCategorySummary(data);
  ensureActiveCategory(cards);
  renderSummary(cards);
  renderTabs(cards);
  renderList(cards.find((card) => card.key === activeCategory)?.items ?? []);

  writeClientLogSafely('info', 'Main page initialization completed', {
    reportCount: Array.isArray(data?.reports) ? data.reports.length : 0,
    categoryCount: cards.length
  });
}

init().catch((error) => {
  console.error(error);

  const systemStatus = document.getElementById('systemStatus');
  const connectionStatus = document.getElementById('connectionStatus');
  const quickReportLinks = document.getElementById('quickReportLinks');
  const reportList = document.getElementById('reportList');

  if (systemStatus) {
    systemStatus.textContent = '시스템 상태를 불러오지 못했습니다.';
  }

  if (connectionStatus) {
    connectionStatus.textContent = '초기 로딩 중 문제가 발생했습니다.';
  }

  if (quickReportLinks) {
    quickReportLinks.innerHTML = '<div class="report-item">보고서 바로가기 정보를 불러오지 못했습니다.</div>';
  }

  if (reportList) {
    reportList.innerHTML = '<div class="report-item">데이터를 불러오지 못했습니다.</div>';
  }

  writeClientLogSafely('error', 'Main page initialization failed', {
    errorMessage: error?.message ?? String(error)
  });
});
