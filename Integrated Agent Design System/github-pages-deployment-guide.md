# GitHub Pages Deployment Guide

## 1. 문서 폴더와 실행 파일의 역할 분리
현재 Builder 구조에서는 다음 원칙을 사용한다.
- `Integrated Agent Design System/` 폴더는 설계 문서만 보관한다.
- 실제 실행 파일과 배포 대상 파일은 루트 경로에 둔다.

현재 기준 구조:

```text
/
├── index.html
├── pages/
├── reports/
├── data/
├── assets/
├── supabase/
└── Integrated Agent Design System/
    ├── agent-design-spec.md
    ├── project-tree.md
    ├── github-pages-deployment-guide.md
    └── supabase-integration-points.md
```

## 2. 배포 대상 저장소 구조
실제 GitHub Pages 배포용 저장소는 아래 구조를 기준으로 한다.

```text
report-hub-site/
├── index.html
├── 404.html
├── pages/
│   └── report-detail.html
├── reports/
│   ├── plan/
│   ├── test-scenario/
│   ├── test-result/
│   └── worklog/
├── data/
│   └── reports.json
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── detail.css
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── main.js
│   │   ├── detail.js
│   │   └── markdown.js
│   └── icons/
├── supabase/
│   ├── schema.sql
│   └── policies.sql
├── scripts/
│   ├── build-report-index.js
│   └── sync-report-metadata.js
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── README.md
└── package.json
```

## 3. 브랜치 및 배포 전략
- 기본 브랜치: `main`
- GitHub Pages 배포 소스: GitHub Actions
- 정적 산출물 위치: 저장소 루트 또는 빌드 결과 디렉터리
- 권장 방식: `main` 브랜치 푸시 → Actions 빌드 → Pages 배포

## 4. 경로 규칙
### 기본 원칙
- 내부 파일명과 경로는 영어 기반을 유지한다.
- 화면 텍스트와 라벨만 한국어를 사용한다.
- 모든 정적 파일은 상대 경로 또는 base path 기반 함수로 참조한다.

### 경로 예시
- 메인 페이지: `/index.html`
- 상세 페이지: `/pages/report-detail.html?reportId={report_id}`
- 보고서 Markdown: `/reports/{category}/{filename}.md`
- 메타데이터 JSON: `/data/reports.json`
- JS/CSS: `/assets/...`

### GitHub Pages base path 규칙
사용자/조직 페이지가 아닌 프로젝트 페이지인 경우 base path를 고려해야 한다.

예시:
- 저장소: `https://github.com/org/report-hub-site`
- Pages URL: `https://org.github.io/report-hub-site/`
- base path: `/report-hub-site`

따라서 프런트엔드에서는 아래 규칙을 사용한다.
- 하드코딩된 절대경로(`/assets/...`)를 피한다.
- `config.js` 에 `BASE_PATH` 를 두고 모든 fetch/link 생성 시 이를 경유한다.

## 5. config.js 규칙
권장 예시:
```js
window.APP_CONFIG = {
  BASE_PATH: window.location.hostname.endsWith('github.io')
    ? '/report-hub-site'
    : '',
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  TIMEZONE: 'Asia/Seoul'
};
```

## 6. 링크 생성 규칙
### 메인 → 상세
```text
${BASE_PATH}/pages/report-detail.html?reportId={report_id}
```

### 상세 → Markdown 로드
```text
${BASE_PATH}/{file_path}
```

### 메타데이터 로드
```text
${BASE_PATH}/data/reports.json
```

## 7. 404 처리 규칙
GitHub Pages는 SPA 라우팅이 기본적으로 없으므로 다음 중 하나를 선택한다.
- 현재 구조처럼 쿼리스트링 기반 상세 페이지 사용
- 또는 `404.html` 에서 메인으로 리다이렉트 처리

현재 설계에서는 `pages/report-detail.html?reportId=...` 방식을 기본으로 유지한다.

## 8. 보고서 생성 및 반영 흐름
1. 에이전트가 Markdown 보고서를 생성한다.
2. `reports/` 하위 카테고리 디렉터리에 저장한다.
3. `scripts/build-report-index.js` 또는 동등한 스크립트가 frontmatter를 읽어 `data/reports.json` 을 갱신한다.
4. 변경사항을 GitHub 저장소에 커밋한다.
5. GitHub Actions가 Pages를 재배포한다.

## 9. reports.json 생성 규칙
`reports.json` 에는 다음이 반드시 포함되어야 한다.
- `generated_at`
- `timezone`
- `categories[]`
- `reports[]`

각 report item 필수 필드:
- `report_id`
- `category`
- `title`
- `summary`
- `file_path`
- `detail_page_path`
- `created_at`
- `updated_at`
- `project_key`

## 10. Supabase 연결 포인트
정적 사이트에서 Supabase는 아래 용도로만 연결한다.
- 보고서 조회 이벤트 기록
- 사용자별 확인 상태 조회
- 사용자별 확인 상태 저장
- 운영 로그 적재(선택)

정적 콘텐츠 자체(Markdown, HTML, JSON)는 GitHub Pages가 제공하고, 동적 상태만 Supabase가 담당한다.

## 11. 프런트엔드에서 Supabase를 호출하는 지점
### 메인 페이지
- 사용자 식별 후 acknowledgement 데이터 조회
- 카테고리별 unread count 계산
- 최신 보고서/미확인 보고서 미리보기 계산 시 acknowledgement 반영

### 상세 페이지
- 페이지 진입 시 `report_views` insert
- 사용자가 확인 버튼 클릭 시 `report_acknowledgements` upsert
- 선택적으로 오류/예외 시 `system_logs` insert

## 12. Supabase 호출 책임 분리
### 읽기
- `getViewerAcknowledgements(viewerId)`
- `getCategorySummary(viewerId)`

### 쓰기
- `recordReportView(reportId, viewerId, viewedAt)`
- `acknowledgeReport(reportId, viewerId, acknowledgedAt)`
- `writeSystemLog(logType, logLevel, message, context)`

## 13. viewer_id 규칙
`viewer_id` 는 다음 중 하나로 정한다.
- Supabase Auth 사용자 id
- 사내 SSO 연동 id
- 인증이 없다면 임시 로컬 식별자

실서비스 기준으로는 Supabase Auth 사용자 id 사용을 권장한다.

## 14. 환경 변수 규칙
정적 GitHub Pages는 서버 환경 변수를 직접 숨길 수 없으므로 다음을 구분한다.
- 공개 가능: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- 비공개 유지 필요: service role key

주의:
- service role key 는 프런트엔드에 절대 포함하지 않는다.
- 관리자 작업이나 대량 동기화는 GitHub Actions 또는 별도 백엔드에서 수행한다.

## 15. 보안 및 정책 권장
- `report_views`: insert 허용, 읽기 제한 가능
- `report_acknowledgements`: 사용자 본인 row만 select/insert/upsert 허용
- `system_logs`: 일반 사용자 직접 쓰기 제한, 필요 시 edge function 통해 기록
- `reports`: 읽기 전용 또는 빌드 파이프라인 전용 쓰기 허용

## 16. GitHub Actions 역할
`deploy-pages.yml` 은 다음 순서로 구성한다.
1. 저장소 checkout
2. Node 환경 설치
3. 메타데이터 생성 스크립트 실행
4. 정적 파일 검증
5. GitHub Pages 배포

## 17. 권장 추가 파일
- `assets/js/config.js`: base path, Supabase URL/Key, timezone 설정
- `supabase/policies.sql`: RLS 정책 정의
- `scripts/build-report-index.js`: Markdown frontmatter → reports.json 생성
- `scripts/sync-report-metadata.js`: 필요 시 Supabase reports 테이블 동기화

## 18. 최종 역할 분리
### GitHub Pages
- 정적 파일 호스팅
- Markdown/HTML/CSS/JS 배포
- 빠른 읽기 성능 제공

### Supabase
- 사용자별 조회/확인 상태 저장
- 운영 로그 적재
- 필요 시 Auth 제공

### 에이전트
- 보고서 생성
- 메타데이터 구조 유지
- 저장소 반영용 파일 초안 생성
- 프런트엔드/DB/API 설계 및 코드 초안 작성
