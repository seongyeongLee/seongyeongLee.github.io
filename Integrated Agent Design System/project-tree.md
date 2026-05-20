# Project File Tree

## Current Builder Structure

```text
/
├── index.html
├── pages/
│   └── report-detail.html
├── reports/
│   ├── plan/
│   │   └── 2026-05-20-plan-report-hub.md
│   ├── test-scenario/
│   │   └── 2026-05-20-test-scenario-report-hub.md
│   ├── test-result/
│   │   └── 2026-05-20-test-result-report-hub.md
│   └── worklog/
│       └── 2026-05-20-worklog-report-hub.md
├── data/
│   └── reports.json
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── detail.css
│   └── js/
│       ├── api.js
│       ├── main.js
│       ├── detail.js
│       └── markdown.js
├── supabase/
│   └── schema.sql
└── Integrated Agent Design System/
    ├── agent-design-spec.md
    ├── project-tree.md
    ├── github-pages-deployment-guide.md
    └── supabase-integration-points.md
```

## Document Folder Role
- `Integrated Agent Design System/` 폴더는 설계 문서 전용 폴더다.
- 실제 실행 파일과 배포 대상 파일은 모두 상위 루트에 둔다.
- 따라서 `assets`, `pages`, `data`, `reports`, `supabase`, `index.html` 은 문서 폴더 밖에서 관리한다.

## Recommended Production Repository Tree
```text
report-hub-site/
├── index.html
├── 404.html
├── pages/
│   └── report-detail.html
├── reports/
├── data/
│   └── reports.json
├── assets/
│   ├── css/
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── main.js
│   │   ├── detail.js
│   │   ├── markdown.js
│   │   └── supabase-client.js
├── supabase/
│   ├── schema.sql
│   └── policies.sql
├── scripts/
│   ├── build-report-index.js
│   └── sync-report-metadata.js
└── .github/workflows/
    └── deploy-pages.yml
```

## Category Mapping
- `plan`: 작업 수행 계획서
- `test-scenario`: 작업 검증 테스트 시나리오
- `test-result`: 작업 검증 결과 보고서
- `worklog`: 작업 내역 보고서

## Report Filename Rule
`YYYY-MM-DD-{category}-{slug}.md`

## Required Metadata Fields
- `report_id`
- `category`
- `title`
- `summary`
- `created_at`
- `updated_at`
- `project_key`
- `tags`
- `file_path`
