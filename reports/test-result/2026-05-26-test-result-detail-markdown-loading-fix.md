---
report_id: rpt_20260526_003
category: test-result
title: 상세 페이지 Markdown 본문 로딩 오류 수정 검증 결과 보고서
status: published
created_at: 2026-05-26T09:12:00+09:00
updated_at: 2026-05-26T09:12:00+09:00
author: Codex_AI
project_key: report-hub-detail-markdown-loading-fix
tags:
  - test-result
  - github-pages
  - markdown
  - detail-page
summary: .nojekyll 적용, Markdown 원문 배포, 상세 본문 렌더링, 본문 로딩 실패 분리 처리 검증 결과
---

# 상세 페이지 Markdown 본문 로딩 오류 수정 검증 결과 보고서

## 검증 환경
- 로컬 서버: `http://127.0.0.1:8000/`
- 배포 URL: `https://chatgpt-agent-test.github.io/`
- 브라우저: Codex 인앱 브라우저
- 브랜치 반영:
  - `develop`: `e9979cc`
  - `main`: `f56f24e`
- 검증 시각: 2026-05-26 09:04~09:11 KST

## 검증 결과 요약
| 항목 | 결과 | 확인 내용 |
| --- | --- | --- |
| 원인 재현 | 통과 | 수정 전 Markdown 원문 URL이 404로 응답하는 것을 확인 |
| 로컬 상세 본문 렌더링 | 통과 | `rpt_20260526_001` 본문이 로컬에서 정상 표시 |
| 배포 Markdown 원문 응답 | 통과 | 기존 Markdown URL이 Markdown 원문 텍스트로 응답 |
| 배포 상세 본문 렌더링 | 통과 | `rpt_20260521_005`, `rpt_20260526_001` 본문 표시 정상 |
| 본문 로딩 실패 분리 처리 | 통과 | 본문 실패 시 헤더/메타/동작 영역 유지, 본문 영역에 실패 경로 표시 |
| 보고서 연결 | 통과 | 신규 보고서 연결 및 전체 파일 경로 검증 통과 |
| 브라우저 콘솔 오류 | 통과 | 수정 후 배포 상세 검증 구간에서 신규 콘솔 error 없음 |

## 상세 검증 기록
### 시나리오 1. 원인 재현 확인
수정 전 실제 배포 URL에서 아래 요청을 확인했다.

```text
https://chatgpt-agent-test.github.io/reports/plan/2026-05-21-plan-system-log-defect-management.md
```

결과:
- 404 File not found
- 같은 파일명의 `.html` 경로는 200으로 응답
- 상세 페이지 콘솔 오류는 `Markdown 파일을 불러오지 못했습니다.`

판정: 통과

### 시나리오 2. 로컬 상세 본문 렌더링
검증 URL:

```text
http://127.0.0.1:8000/pages/report-detail.html?reportId=rpt_20260526_001
```

확인 결과:
- 제목: `상세 페이지 Markdown 본문 로딩 오류 수정 작업 수행 계획서`
- 메타데이터 표시: 정상
- 본문에 `작업 배경`, `작업 목표` 등 Markdown 내용 표시
- 현재 로컬 URL 기준 콘솔 error 없음

판정: 통과

### 시나리오 3. 실제 배포 Markdown 원문 응답
검증 URL:

```text
https://chatgpt-agent-test.github.io/reports/plan/2026-05-21-plan-system-log-defect-management.md
```

확인 결과:
- 404 화면이 아니라 Markdown 원문 텍스트가 표시됨
- frontmatter의 `report_id: rpt_20260521_005` 확인
- `.nojekyll` 적용 후 GitHub Pages가 Markdown 파일을 원문 그대로 제공함

판정: 통과

### 시나리오 4. 실제 배포 상세 본문 렌더링
검증 URL:

```text
https://chatgpt-agent-test.github.io/pages/report-detail.html?reportId=rpt_20260521_005
https://chatgpt-agent-test.github.io/pages/report-detail.html?reportId=rpt_20260526_001
```

확인 결과:
- 두 페이지 모두 제목과 메타데이터 표시 정상
- 두 페이지 모두 Markdown 본문 표시 정상
- `본문을 불러오지 못했습니다.` 실패 제목 없음
- 검증 구간의 신규 브라우저 콘솔 error 없음

판정: 통과

### 시나리오 5. 본문 로딩 실패 분리 처리
로컬 VM 검증으로 `fetchMarkdownFile()`이 404 오류를 던지도록 구성했다.

확인 결과:
```json
{
  "headerPreserved": true,
  "metaPreserved": true,
  "actionsPreserved": true,
  "contentFailureSeparated": true,
  "genericInitFailure": false
}
```

판정: 통과

### 시나리오 6. 보고서 연결 검증
검증 결과:

```json
{
  "reports": 22,
  "missingFiles": [],
  "badDetailPaths": [],
  "hasNoJekyll": true
}
```

판정: 통과

## 결론
상세 본문이 표시되지 않던 직접 원인은 GitHub Pages의 Jekyll 처리로 Markdown 원문 파일이 `.md` 경로에 배포되지 않은 것이었다.

루트 `.nojekyll` 추가 후 실제 배포 URL에서 Markdown 원문 파일이 정상 제공되었고, 상세 페이지도 본문을 정상 렌더링했다. 추가로 본문 로딩 실패가 발생해도 상세 화면 전체가 실패 상태로 바뀌지 않도록 분리 처리했다.
