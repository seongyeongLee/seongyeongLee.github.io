---
report_id: rpt_20260521_008
category: worklog
title: 시스템 로그 및 결함 관리 기능 보강 작업 내역 보고서
status: published
created_at: 2026-05-21T11:41:00+09:00
updated_at: 2026-05-21T11:41:00+09:00
author: Codex_AI
project_key: report-hub-system-log-defect-management
tags:
  - worklog
  - system-logs
  - defect-management
  - report-hub
summary: system_logs 스키마 확장, 로그 클라이언트 보강, 시스템 로그 관리 페이지 추가, 메인 상태 연결, 검증 보고서 작성 내역
---

# 시스템 로그 및 결함 관리 기능 보강 작업 내역 보고서

## 작업 개요
Supabase 미설정 상태에서 단순 안내 문구만 표시되던 구조를 보강해, 정적 화면은 정상인지 DB 연동 기능은 제한 상태인지 사용자가 구분할 수 있게 했다. 또한 ERROR 이상 로그를 결함으로 관리할 수 있도록 확인 및 해결 상태 필드와 관리 화면을 추가했다.

## 변경 파일
- `supabase/schema.sql`
- `assets/js/supabase-client.js`
- `assets/js/main.js`
- `assets/js/detail.js`
- `assets/js/system-logs.js`
- `assets/css/main.css`
- `index.html`
- `pages/report-detail.html`
- `pages/system-logs.html`
- `data/reports.json`
- `reports/plan/2026-05-21-plan-system-log-defect-management.md`
- `reports/test-scenario/2026-05-21-test-scenario-system-log-defect-management.md`
- `reports/test-result/2026-05-21-test-result-system-log-defect-management.md`
- `reports/worklog/2026-05-21-worklog-system-log-defect-management.md`

## 주요 작업 내역
### 1. 작업 계획서 문서화
사용자 확인을 받은 작업 계획을 Markdown 보고서로 작성하고 `data/reports.json`에 연결했다.

### 2. DB 스키마 확장
`system_logs` 테이블에 확인 및 해결 관리를 위한 컬럼을 추가했다.

추가한 관리 필드:
- `is_acknowledged`
- `acknowledged_at`
- `acknowledged_by`
- `is_resolved`
- `resolved_at`
- `resolved_by`
- `resolution_note`
- `source`
- `page_url`
- `event_name`
- `fingerprint`

추가한 제약 및 인덱스:
- 로그 레벨 체크 제약
- 레벨/생성시각 인덱스
- ERROR 이상 우선 조회 인덱스
- fingerprint 인덱스

### 3. 로그 클라이언트 보강
`assets/js/supabase-client.js`에 로그 레벨 표준화, DB 로그 저장, 로컬 대체 로그 저장, 로그 조회, 확인 처리, 해결 처리 함수를 추가했다.

로그 레벨:
- TRACE
- DEBUG
- INFO
- WARN
- ERROR
- FATAL
- CRITICAL

ERROR 이상 로그는 기본적으로 미확인, 미해결 상태로 생성된다.

### 4. 시스템 로그 관리 페이지 추가
`pages/system-logs.html`과 `assets/js/system-logs.js`를 추가했다.

주요 기능:
- 결함 우선 요약 카드
- 로그 레벨 필터
- ERROR 이상 우선 확인 목록
- 전체 로그 목록
- 확인 처리 버튼
- 해결 메모 및 해결 처리 버튼
- Supabase 미설정 시 로컬 대체 로그 표시

### 5. 메인 화면 상태 연결
메인 화면의 시스템 상태 영역을 보강했다.

추가 표시 항목:
- 운영 상태
- DB 로그 저장 가능 여부
- 로그 저장소 상태
- 미해결 ERROR 이상 건수
- 미확인 ERROR 이상 건수
- 시스템 로그 관리 페이지 링크

### 6. 상세 화면 로그 보강
보고서 상세 화면 초기화 시작, 완료, reportId 누락, 보고서 미존재, 초기화 실패 상황을 시스템 로그로 기록하도록 보강했다.

### 7. 검증 및 보고서 연결
테스트 시나리오 문서와 테스트 결과 보고서를 작성하고 `data/reports.json`에 연결했다.

## 검증 결과
검증은 로컬 서버와 Codex 인앱 브라우저에서 수행했다.

결과:
- 메인 화면 시스템 상태 표시 정상
- 시스템 로그 관리 화면 로딩 정상
- 로그 레벨 필터 표시 정상
- 검증용 ERROR/CRITICAL 로그 우선 조회 정상
- 확인/해결 처리 정상
- 신규 보고서 상세 페이지 렌더링 정상
- 브라우저 콘솔 오류 없음
- 보고서 데이터 연결 검증 통과

## 남은 운영 작업
실제 DB 로그 저장을 사용하려면 운영 Supabase 프로젝트에 `supabase/schema.sql`을 적용하고, 배포 환경에서 `SUPABASE_URL`과 `SUPABASE_ANON_KEY`를 실제 값으로 주입해야 한다.
