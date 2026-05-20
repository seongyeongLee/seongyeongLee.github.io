# 작업 검증 테스트 시나리오

## 작업 개요
- 작업명: BASE_PATH 수정 및 시스템 상태 로그 검증 시나리오
- 작업 유형: 신규 작업
- 작성 일시: 2026-05-20

## 테스트 목적
루트 배포 환경에서 BASE_PATH가 올바르게 계산되는지 확인하고, 메인 페이지 초기화 성공/실패 로그가 Supabase에 남는지 검증한다.

## 사전 조건
- 서비스 주소: `https://chatgpt-agent-test.github.io/`
- Supabase 프로젝트 연결 정보가 실제 값으로 설정되어 있어야 한다.
- `system_logs` 테이블이 생성되어 있어야 한다.

## 테스트 시나리오

### 시나리오 1. 메인 페이지 초기 진입 성공 확인
- 절차:
  1. 브라우저 캐시를 비우고 메인 페이지에 접속한다.
  2. 시스템 상태, 보고서 바로가기, 카테고리 요약, 보고서 목록 렌더링 여부를 확인한다.
- 기대 결과:
  - 오류 문구 대신 실제 데이터가 보인다.
  - Supabase `system_logs`에 `Main page initialization started`, `Main page initialization completed` 로그가 남는다.

### 시나리오 2. 잘못된 BASE_PATH 재현 차단 확인
- 절차:
  1. 개발자 도구 Network 탭을 연다.
  2. 메인 페이지를 새로고침한다.
  3. `reports.json` 요청 경로를 확인한다.
- 기대 결과:
  - 요청 경로는 `/data/reports.json` 또는 루트 기준 절대 URL이다.
  - `/report-hub-site/data/reports.json` 형식 요청이 발생하지 않는다.

### 시나리오 3. 초기화 실패 시 오류 로그 확인
- 절차:
  1. `reports.json` 경로를 의도적으로 깨뜨리거나 테스트 환경에서 fetch 실패를 유도한다.
  2. 메인 페이지를 다시 로드한다.
- 기대 결과:
  - 화면에는 현재와 같은 실패 문구가 표시된다.
  - Supabase `system_logs`에 `Main page initialization failed` 로그가 남는다.
  - 로그 context에는 page, base_path, pathname, error_message가 포함된다.

### 시나리오 4. Supabase 미연결 폴백 확인
- 절차:
  1. Supabase 연결 정보를 비활성화한 테스트 상태로 메인 페이지를 연다.
- 기대 결과:
  - 화면은 로컬 기준으로 동작한다.
  - 시스템 상태 문구에 Supabase 미설정 안내가 표시된다.
  - system_logs는 건너뛰더라도 메인 화면이 전체 실패로 무너지지 않는다.

## 합격 기준
- BASE_PATH 수정 후 메인 화면 로딩이 정상 동작한다.
- 실패 시 Supabase에 원인 추적용 로그가 남는다.
- 성공 시에도 시작/완료 로그가 남는다.
- 루트 배포 기준 경로 계산이 일관되게 유지된다.
