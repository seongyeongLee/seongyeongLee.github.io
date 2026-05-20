function getDetailSupabaseStatusSummary() {
  const configured = typeof isSupabaseConfigured === 'function' && isSupabaseConfigured();

  if (configured) {
    return {
      enabled: true,
      message: 'Supabase 조회 및 확인 상태 저장이 활성화되어 있습니다.'
    };
  }

  return {
    enabled: false,
    message: 'Supabase 연결 정보가 없어 상세 화면은 로컬 기준으로 표시됩니다.'
  };
}

function renderDetailNotFound() {
  const detailContent = document.getElementById('detailContent');
  if (detailContent) {
    detailContent.innerHTML = '<p>보고서를 찾을 수 없습니다.</p>';
  }
}

function renderDetailHeader(report) {
  const detailHeader = document.getElementById('detailHeader');
  if (!detailHeader) return;

  detailHeader.innerHTML = `
    <h1>${report.title}</h1>
    <p>${report.summary ?? ''}</p>
  `;
}

function renderDetailMeta(report, connectionState) {
  const detailMeta = document.getElementById('detailMeta');
  if (!detailMeta) return;

  detailMeta.innerHTML = `
    <div class="meta-grid">
      <div class="meta-card"><strong>카테고리</strong><div>${report.category}</div></div>
      <div class="meta-card"><strong>프로젝트</strong><div>${report.project_key ?? '-'}</div></div>
      <div class="meta-card"><strong>등록일</strong><div>${formatKst(report.created_at)}</div></div>
      <div class="meta-card"><strong>수정일</strong><div>${formatKst(report.updated_at)}</div></div>
      <div class="meta-card"><strong>Base path</strong><div>${getBasePath() || '/'}</div></div>
      <div class="meta-card"><strong>연결 상태</strong><div>${connectionState.enabled ? 'Supabase 연결됨' : '로컬 기준 동작'}</div></div>
    </div>
  `;
}

function renderDetailActions(connectionState) {
  const detailActions = document.getElementById('detailActions');
  if (!detailActions) return;

  detailActions.innerHTML = `
    <button id="acknowledgeButton" class="ack-button">확인 완료 처리</button>
    <div class="report-meta">상세 페이지 진입 시 조회 이력이 기록됩니다.</div>
    <div class="report-meta">${connectionState.message}</div>
  `;
}

async function renderDetailContent(report) {
  const markdown = await fetchMarkdownFile(report.file_path);
  const detailContent = document.getElementById('detailContent');
  if (!detailContent) return;

  detailContent.innerHTML = parseSimpleMarkdown(markdown);
}

async function bindAcknowledgeAction(reportId, viewerId, connectionState) {
  const button = document.getElementById('acknowledgeButton');
  if (!button) return;

  if (!connectionState.enabled) {
    button.disabled = true;
    button.textContent = '확인 상태 저장 미설정';
    return;
  }

  button.addEventListener('click', async () => {
    const result = await upsertAcknowledgement(reportId, viewerId);
    if (result.success) {
      button.textContent = '확인 완료됨';
      button.disabled = true;
      return;
    }

    button.textContent = '확인 저장 실패';
  });
}

async function initDetail() {
  const reportId = getQueryParam('reportId');
  if (!reportId) {
    renderDetailNotFound();
    return;
  }

  const [data, viewer] = await Promise.all([
    fetchReports(),
    getCurrentViewer()
  ]);

  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const report = reports.find((item) => item.report_id === reportId);

  if (!report) {
    renderDetailNotFound();
    return;
  }

  const connectionState = getDetailSupabaseStatusSummary();

  document.title = `${report.title} - 보고서 상세`;
  renderDetailHeader(report);
  renderDetailMeta(report, connectionState);
  renderDetailActions(connectionState);
  await renderDetailContent(report);

  await insertReportView(report.report_id, viewer.viewerId, {
    page: 'report-detail',
    projectKey: report.project_key ?? null,
    basePath: getBasePath() || '/'
  });

  await bindAcknowledgeAction(report.report_id, viewer.viewerId, connectionState);
}

initDetail().catch((error) => {
  console.error(error);

  const detailContent = document.getElementById('detailContent');
  const detailActions = document.getElementById('detailActions');

  if (detailActions) {
    detailActions.innerHTML = '<div class="report-meta">상세 화면 초기화 중 문제가 발생했습니다.</div>';
  }

  if (detailContent) {
    detailContent.innerHTML = '<p>상세 내용을 불러오지 못했습니다.</p>';
  }
});
