---
report_id: rpt_20260521_005
category: plan
title: 시스템 로그 및 결함 관리 기능 보강 작업 수행 계획서
status: published
created_at: 2026-05-21T11:30:00+09:00
updated_at: 2026-05-21T11:30:00+09:00
author: Codex_AI
project_key: report-hub-system-log-defect-management
tags:
  - system-logs
  - supabase
  - defect-management
  - operation-status
summary: Supabase 연결 상태와 시스템 로그를 레벨별로 기록하고 ERROR 이상 로그의 확인 및 해결 상태를 관리하는 기능 보강 계획
---

# 시스템 로그 및 결함 관리 기능 보강 작업 수행 계획서

## 작업 배경
현재 리포트 허브는 Supabase 연결 정보가 placeholder 상태이면 정적 보고서 화면을 로컬 기준으로 표시한다. 이 상태에서는 보고서 목록과 상세 화면은 사용할 수 있지만, DB 기반 조회 이력, 확인 상태, 시스템 로그 저장은 수행되지 않는다.

사용자가 화면만 보고도 서비스가 정상 동작 중인지, DB 연동이 제한된 상태인지, ERROR 이상의 결함이 해결되지 않은 상태인지 판단할 수 있도록 로그 구조와 확인 화면을 보강한다.

## 작업 목표
- `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `CRITICAL` 로그 레벨을 표준화한다.
- Supabase가 설정된 경우 `system_logs` 테이블에 클라이언트 로그를 기록한다.
- Supabase가 미설정인 경우 로컬 대체 로그로 현재 제한 상태를 화면에서 확인할 수 있게 한다.
- ERROR 이상 로그는 확인 여부와 해결 여부를 별도 관리한다.
- 미해결 ERROR 이상 로그가 우선 조회되도록 시스템 로그 페이지를 추가한다.
- 메인 화면 시스템 상태에서 DB 로그 저장 가능 여부와 로그 페이지 이동 경로를 제공한다.

## DB 변경 계획
기존 `system_logs` 테이블을 유지하면서 운영 관리에 필요한 컬럼을 추가한다.

추가 컬럼:
- `is_acknowledged`: 로그 확인 여부
- `acknowledged_at`: 확인 처리 시각
- `acknowledged_by`: 확인 처리자
- `is_resolved`: 해결 여부
- `resolved_at`: 해결 처리 시각
- `resolved_by`: 해결 처리자
- `resolution_note`: 해결 메모
- `source`: 로그 발생 출처
- `page_url`: 발생 페이지 URL
- `event_name`: 이벤트명
- `fingerprint`: 재발 식별용 키

인덱스:
- ERROR 이상 미해결 로그 우선 조회용 인덱스
- 레벨/생성시각 조회용 인덱스
- fingerprint 조회용 인덱스

## 화면 변경 계획
### 메인 화면
- 시스템 상태를 `정상`, `제한 동작`, `오류` 성격으로 구분해 표시한다.
- Supabase 미설정 시 DB 로그 저장이 불가능하다는 사실을 명확히 표시한다.
- 시스템 로그 관리 페이지로 이동하는 링크를 제공한다.

### 시스템 로그 관리 화면
신규 페이지 `pages/system-logs.html`을 추가한다.

핵심 기능:
- ERROR, FATAL, CRITICAL 로그를 최상단 우선 노출
- 미확인 오류, 미해결 오류, 치명 로그, 최근 오류 요약 카드 제공
- 로그 레벨별 필터 제공
- ERROR 이상 로그의 확인 처리
- ERROR 이상 로그의 해결 처리 및 해결 메모 저장
- 발생 페이지, 이벤트명, 메시지, 컨텍스트, fingerprint 표시

우선 정렬 기준:
1. FATAL/CRITICAL 미해결
2. ERROR 미해결
3. 미확인 ERROR 이상
4. 최근 발생 로그

## 제외 범위
- 실제 Supabase URL 및 anon key 값을 저장소에 직접 커밋하지 않는다.
- 관리자 인증/RLS 정책 전체 운영 설계는 별도 보안 작업으로 분리한다.
- 서버 사이드 Edge Function 도입은 이번 작업에서 제외한다.

## 완료 기준
- 시스템 로그 페이지가 로컬과 GitHub Pages 경로 기준에서 열릴 수 있다.
- Supabase 미설정 상태가 WARN 성격의 제한 동작으로 표시된다.
- 로그 레벨별 필터와 ERROR 이상 우선 조회 UI가 표시된다.
- ERROR 이상 로그의 확인/해결 상태 관리 함수가 구현된다.
- 테스트 시나리오, 테스트 결과, 작업 내역 보고서가 작성되고 페이지에 연결된다.
