---
report_id: rpt_20260526_002
category: test-scenario
title: 상세 페이지 Markdown 본문 로딩 오류 검증 테스트 시나리오
status: published
created_at: 2026-05-26T09:02:00+09:00
updated_at: 2026-05-26T09:02:00+09:00
author: Codex_AI
project_key: report-hub-detail-markdown-loading-fix
tags:
  - validation
  - github-pages
  - markdown
  - detail-page
summary: GitHub Pages 배포 환경의 Markdown 원문 응답, 상세 본문 렌더링, 실패 분리 처리를 검증하는 테스트 시나리오
---

# 상세 페이지 Markdown 본문 로딩 오류 검증 테스트 시나리오

## 테스트 목적
GitHub Pages 배포 환경에서 Markdown 원문 파일이 404로 응답해 상세 본문이 표시되지 않는 문제를 수정하고, 수정 결과가 로컬과 실제 배포 URL에서 정상 동작하는지 검증한다.

## 사전 조건
- 로컬 서버가 `http://127.0.0.1:8000/`에서 실행 중이다.
- `develop` 브랜치의 변경 사항이 GitHub Pages 배포 소스에 반영될 수 있다.
- Supabase 설정은 placeholder 상태일 수 있다.
- 실제 배포 검증은 GitHub Pages 반영 지연을 고려해 커밋/푸시 후 수행한다.

## 시나리오 1. 원인 재현 확인
절차:
1. 실제 배포 URL `https://chatgpt-agent-test.github.io/pages/report-detail.html?reportId=rpt_20260521_005`에 접속한다.
2. 브라우저 화면과 콘솔 오류를 확인한다.
3. `https://chatgpt-agent-test.github.io/reports/plan/2026-05-21-plan-system-log-defect-management.md`의 HTTP 상태를 확인한다.

기대 결과:
- 수정 전에는 상세 본문이 표시되지 않는다.
- 수정 전에는 Markdown 원문 파일 요청이 404로 확인된다.
- 원인이 보고서 데이터 로드 실패가 아니라 Markdown 원문 배포 문제임을 확인한다.

## 시나리오 2. 로컬 상세 본문 렌더링
절차:
1. `http://127.0.0.1:8000/pages/report-detail.html?reportId=rpt_20260526_001`에 접속한다.
2. 상세 제목과 메타데이터가 표시되는지 확인한다.
3. Markdown 본문이 HTML로 렌더링되는지 확인한다.

기대 결과:
- 제목과 메타데이터가 정상 표시된다.
- 본문에 `상세 페이지 Markdown 본문 로딩 오류 수정 작업 수행 계획서` 내용이 표시된다.
- `상세 내용을 불러오지 못했습니다.` 문구가 표시되지 않는다.

## 시나리오 3. 실제 배포 Markdown 원문 응답
절차:
1. 수정사항 커밋/푸시 후 GitHub Pages 배포 반영을 기다린다.
2. `https://chatgpt-agent-test.github.io/reports/plan/2026-05-21-plan-system-log-defect-management.md`를 요청한다.
3. 신규 계획서 Markdown URL도 요청한다.

기대 결과:
- 기존 Markdown URL이 200으로 응답한다.
- 신규 계획서 Markdown URL이 200으로 응답한다.
- 응답 본문이 Markdown 원문 텍스트로 확인된다.

## 시나리오 4. 실제 배포 상세 본문 렌더링
절차:
1. `https://chatgpt-agent-test.github.io/pages/report-detail.html?reportId=rpt_20260521_005`에 접속한다.
2. `https://chatgpt-agent-test.github.io/pages/report-detail.html?reportId=rpt_20260526_001`에 접속한다.
3. 본문과 콘솔 오류를 확인한다.

기대 결과:
- 두 상세 페이지 모두 Markdown 본문이 표시된다.
- 브라우저 콘솔에 Markdown 로딩 실패 오류가 남지 않는다.

## 시나리오 5. 본문 로딩 실패 분리 처리
절차:
1. 브라우저에서 임시로 존재하지 않는 `file_path`를 가진 보고서를 주입하거나, 로컬 검증 스크립트로 본문 로딩 실패 함수를 호출한다.
2. 상세 헤더와 메타데이터 영역이 유지되는지 확인한다.
3. 본문 영역에 실패 경로와 원인 메시지가 표시되는지 확인한다.

기대 결과:
- 상세 화면 전체가 `상세 화면 초기화 중 문제가 발생했습니다.` 상태로 바뀌지 않는다.
- 본문 영역에만 로딩 실패 안내가 표시된다.
- 시스템 로그에는 ERROR 레벨로 실패 경로가 기록된다.

## 시나리오 6. 보고서 연결 검증
절차:
1. `data/reports.json`을 파싱한다.
2. 신규 보고서 ID `rpt_20260526_001`, `rpt_20260526_002`가 연결되었는지 확인한다.
3. 모든 `file_path`가 실제 파일과 일치하는지 확인한다.
4. 모든 `detail_page_path`가 `pages/report-detail.html?reportId={report_id}` 규칙과 일치하는지 확인한다.

기대 결과:
- JSON 파싱 오류가 없다.
- 신규 보고서가 페이지 데이터에 연결되어 있다.
- 누락된 Markdown 파일이 없다.
- 상세 페이지 경로 규칙 위반이 없다.
