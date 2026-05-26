---
report_id: rpt_20260526_004
category: worklog
title: 상세 페이지 Markdown 본문 로딩 오류 수정 작업 내역 보고서
status: published
created_at: 2026-05-26T09:12:00+09:00
updated_at: 2026-05-26T09:12:00+09:00
author: Codex_AI
project_key: report-hub-detail-markdown-loading-fix
tags:
  - worklog
  - github-pages
  - markdown
  - detail-page
summary: GitHub Pages Markdown 원문 배포 오류 원인 분석, .nojekyll 추가, 상세 본문 실패 분리 처리, 배포 검증 작업 내역
---

# 상세 페이지 Markdown 본문 로딩 오류 수정 작업 내역 보고서

## 작업 개요
GitHub Pages 배포 환경에서 보고서 상세 페이지의 제목과 메타데이터는 표시되지만 본문이 표시되지 않는 문제를 분석하고 수정했다.

## 원인 분석
상세 페이지는 `data/reports.json`에서 보고서 메타데이터를 정상으로 찾았지만, 본문 로딩 시 `reports/.../*.md` 경로 요청이 404로 실패했다.

확인 사항:
- `.md` 경로: 404
- `.html` 경로: 200
- 루트 `.nojekyll` 없음

따라서 GitHub Pages가 Jekyll 처리를 수행하면서 Markdown 원문 파일을 그대로 배포하지 않은 것이 직접 원인이었다.

## 변경 파일
- `.nojekyll`
- `assets/js/api.js`
- `assets/js/detail.js`
- `pages/report-detail.html`
- `data/reports.json`
- `reports/plan/2026-05-26-plan-detail-markdown-loading-fix.md`
- `reports/test-scenario/2026-05-26-test-scenario-detail-markdown-loading-fix.md`
- `reports/test-result/2026-05-26-test-result-detail-markdown-loading-fix.md`
- `reports/worklog/2026-05-26-worklog-detail-markdown-loading-fix.md`

## 주요 작업 내역
### 1. 작업 계획서 및 테스트 시나리오 선반영
사용자 요청 순서에 맞춰 작업 계획서와 검증 테스트 시나리오를 먼저 작성하고 `data/reports.json`에 연결했다.

1차 커밋:
- `7b9e1fa`
- `docs: add detail markdown loading fix plan`

### 2. `.nojekyll` 추가
루트에 `.nojekyll` 파일을 추가했다. 이 파일은 GitHub Pages가 Jekyll 변환을 수행하지 않고 저장소 파일을 정적 파일로 그대로 배포하게 한다.

### 3. Markdown fetch 오류 정보 보강
`assets/js/api.js`의 `fetchReports()`와 `fetchMarkdownFile()`에서 HTTP 상태 코드, 상태 메시지, 요청 경로를 오류 객체에 담도록 수정했다.

### 4. 상세 페이지 본문 실패 분리 처리
`assets/js/detail.js`에서 Markdown 본문 로딩 실패를 `initDetail()` 전체 실패로 전파하지 않도록 수정했다.

수정 후 동작:
- 상세 헤더 유지
- 메타데이터 유지
- 확인 버튼 영역 유지
- 본문 영역에만 실패 경로와 오류 상태 표시
- 시스템 로그에 ERROR 레벨로 실패 경로 기록

### 5. 캐시 회피 버전 갱신
`pages/report-detail.html`에서 `api.js`, `detail.js` 참조에 새 버전 쿼리를 적용했다.

### 6. 배포 소스 반영
GitHub Pages가 `main` 기준으로 서비스되는 상태를 확인하고, `develop` 수정사항을 `main`에 병합해 배포 소스에 반영했다.

수정 커밋:
- `e9979cc`
- `fix: preserve markdown reports on pages`

배포 반영 병합 커밋:
- `f56f24e`
- `Merge branch 'develop'`

## 검증 내역
검증은 계획서에 작성한 시나리오대로 진행했다.

검증 결과:
- 수정 전 원인 재현 완료
- 로컬 상세 본문 렌더링 정상
- 실제 배포 Markdown 원문 응답 정상
- 실제 배포 상세 본문 렌더링 정상
- 본문 로딩 실패 분리 처리 정상
- 보고서 연결 검증 정상
- 신규 브라우저 콘솔 오류 없음

## 남은 참고 사항
GitHub Pages 배포 반영에는 짧은 지연이 있을 수 있다. 이번 수정은 `develop`과 실제 배포 소스인 `main`에 모두 반영했다.
