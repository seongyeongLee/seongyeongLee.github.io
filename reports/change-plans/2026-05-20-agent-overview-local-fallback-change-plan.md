# agent-overview local fallback change plan

## Request Background And Goal
- Retry the previous failed `agent-overview` document loading work and complete an actual fix.
- Prevent the overview page from collapsing into a `Failed to fetch` state when a user opens the HTML directly from a local file path.

## Scope
- Update `docs/agent-overview.html`.
- Add retry-cycle report documents under the English `reports/` structure.
- Reflect the new report set from the report hub entry point.

## Target Files Or Components
- `docs/agent-overview.html`
- `reports/index.html`
- `reports/change-plans/2026-05-20-agent-overview-local-fallback-change-plan.md`
- `reports/test-scenarios/2026-05-20-agent-overview-local-fallback-test-scenario.md`
- `reports/test-results/passed/2026-05-20-agent-overview-local-fallback-test-result.md`
- `reports/diff-analysis-and-change-reports/2026-05-20-agent-overview-local-fallback-diff-analysis-and-change-report.md`

## Implementation Plan
1. Keep the Markdown-first structure so HTTP environments still load `agent-overview.md` directly.
2. Add a local-file-safe fallback summary path inside `docs/agent-overview.html`.
3. Show a clear notice about whether the page is reading live Markdown or a prepared fallback summary.
4. Add retry-cycle report documents under the standard English report folders.
5. Update the main report hub so the new reports are visible from the top-level report page.

## Expected Impact
- Local file viewing no longer ends with a blank or error-only experience.
- HTTP and GitHub Pages environments continue to show live Markdown-based summaries.
- The retry work becomes traceable through the standard report set.

## Verification Plan
- Check that the HTML uses fallback summaries when `window.location.protocol` is `file:`.
- Check that the HTML still uses live Markdown loading in HTTP-style environments.
- Check that the notice text changes according to the loading mode.
- Check that the report hub contains direct links to the newly added report documents.

## Git Reflection Summary
- Apply the viewer fix and the four report documents together on the `dev` branch of `ChatGPT-Agent-Test/ChatGPT-Agent-Test.github.io`.
