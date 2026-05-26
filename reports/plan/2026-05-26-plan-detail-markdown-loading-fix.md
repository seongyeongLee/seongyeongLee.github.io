---
report_id: rpt_20260526_001
category: plan
title: 상세 페이지 Markdown 본문 로딩 오류 수정 작업 수행 계획서
status: published
created_at: 2026-05-26T09:00:00+09:00
updated_at: 2026-05-26T09:00:00+09:00
author: Codex_AI
project_key: report-hub-detail-markdown-loading-fix
tags:
  - github-pages
  - jekyll
  - markdown
  - detail-page
summary: GitHub Pages 배포 환경에서 Markdown 원문 파일이 404로 응답해 상세 본문이 표시되지 않는 문제를 수정하기 위한 작업 계획
---

# 상세 페이지 Markdown 본문 로딩 오류 수정 작업 수행 계획서

## 작업 배경
GitHub Pages 배포 URL에서 보고서 상세 페이지를 열면 제목과 메타데이터는 표시되지만 본문 영역에 `상세 내용을 불러오지 못했습니다.`가 표시된다.

원인 확인 결과 `data/reports.json`은 정상으로 로드되지만, 상세 본문을 가져오기 위한 `reports/.../*.md` 요청이 GitHub Pages에서 404로 응답한다. 반면 같은 파일명의 `.html` 경로는 200으로 응답한다.

이는 루트에 `.nojekyll` 파일이 없어 GitHub Pages가 Jekyll 처리를 수행하고, Markdown 원문 파일을 그대로 배포하지 않는 배포 동작과 일치한다.

## 작업 목표
- GitHub Pages가 Markdown 파일을 원문 그대로 배포하도록 루트에 `.nojekyll`을 추가한다.
- 상세 페이지에서 Markdown 본문 로딩 실패 시 제목, 메타데이터, 확인 버튼 영역 전체가 실패 화면으로 바뀌지 않게 한다.
- 본문 로딩 실패가 발생하면 실패한 파일 경로와 원인을 화면 및 시스템 로그에서 확인할 수 있게 한다.
- 수정 후 로컬 서버와 실제 GitHub Pages 배포 URL에서 상세 본문 렌더링을 검증한다.
- 작업 계획서, 테스트 시나리오, 테스트 결과, 작업 내역 보고서를 작성하고 페이지에 연결한다.

## 수정 범위
- `.nojekyll`
- `assets/js/api.js`
- `assets/js/detail.js`
- `data/reports.json`
- `reports/plan/2026-05-26-plan-detail-markdown-loading-fix.md`
- `reports/test-scenario/2026-05-26-test-scenario-detail-markdown-loading-fix.md`
- `reports/test-result/2026-05-26-test-result-detail-markdown-loading-fix.md`
- `reports/worklog/2026-05-26-worklog-detail-markdown-loading-fix.md`

## 구현 계획
### 1. GitHub Pages Jekyll 처리 비활성화
루트에 `.nojekyll` 파일을 추가한다. 이 파일은 GitHub Pages가 Jekyll 변환을 수행하지 않고 저장소의 정적 파일을 그대로 배포하게 하는 배포 제어 파일이다.

### 2. Markdown fetch 오류 메시지 개선
`fetchMarkdownFile(path)`에서 실패한 URL과 HTTP 상태 코드를 포함한 오류를 생성하도록 보강한다.

예상 오류 정보:
- 요청 경로
- HTTP 상태 코드
- status text

### 3. 상세 페이지 본문 실패 분리 처리
현재 상세 페이지는 본문 로딩 실패가 `initDetail()` 전체 실패로 전파되어 동작 영역까지 오류 메시지로 대체된다.

수정 후에는:
- 보고서 메타데이터 렌더링은 유지한다.
- 조회 이력 기록과 확인 버튼 바인딩은 가능한 범위에서 계속 수행한다.
- 본문 영역에만 파일 경로와 오류 원인을 표시한다.
- 시스템 로그에는 `ERROR` 레벨로 실패 경로를 기록한다.

### 4. 보고서 연결
신규 계획서와 테스트 시나리오를 먼저 `data/reports.json`에 연결하고 1차 커밋/푸시한다. 이후 수정과 검증이 끝나면 테스트 결과와 작업 내역 보고서를 추가 연결한다.

## 테스트 계획
- 로컬 상세 페이지에서 `rpt_20260526_001` 본문 표시 확인
- 실제 GitHub Pages에서 `.md` 파일이 200으로 응답하는지 확인
- 실제 GitHub Pages에서 `rpt_20260521_005` 상세 본문 표시 확인
- 기존 보고서 상세 페이지도 정상 표시되는지 확인
- 본문 파일이 없는 테스트 케이스에서 화면 전체가 무너지지 않고 본문 오류만 표시되는지 확인
- 브라우저 콘솔 오류가 남지 않는지 확인

## 완료 기준
- GitHub Pages 배포 환경에서 `reports/.../*.md` 요청이 200으로 응답한다.
- 상세 페이지에서 Markdown 본문이 정상 렌더링된다.
- 본문 로딩 실패가 발생해도 상세 화면의 제목과 메타데이터는 유지된다.
- 테스트 시나리오와 결과 보고서가 페이지에 연결된다.
- 변경 사항이 `Codex_AI` author로 커밋되고 `develop` 브랜치에 푸시된다.
