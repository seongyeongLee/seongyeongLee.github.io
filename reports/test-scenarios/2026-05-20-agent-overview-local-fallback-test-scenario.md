# agent-overview local fallback test scenario

## Feature Under Test
- `docs/agent-overview.html` Markdown loading and fallback behavior
- Report hub visibility for the retry-cycle report set

## Preconditions
- `docs/agent-overview.md` exists in the same folder as `docs/agent-overview.html`.
- The page can be opened either from a local file path or from an HTTP-style static host.
- The new report files are present under `reports/`.

## Test Cases
1. Local file fallback activation
2. HTTP live Markdown loading
3. Fallback notice text rendering
4. Report hub link exposure

## Normal Flow
1. Open the page in a local file-style environment and confirm that summary cards still render.
2. Simulate or open the page in an HTTP-style environment and confirm that Markdown fetch remains the primary path.
3. Confirm that the source note explains which mode is being used.
4. Open the report hub and confirm that the retry report links are visible.

## Failure Or Exception Flow
1. If Markdown fetch fails in HTTP mode, the page should switch to prepared summaries instead of leaving a raw fetch error.
2. If fallback summaries are missing, the page should be treated as failed because the local-file use case is no longer protected.
3. If report links are missing from the hub, the work should be treated as incomplete because navigation to the new report set is broken.

## Expected Result
- The page renders readable summary cards in both local-file and HTTP-style environments.
- Users see a clear explanation of whether live Markdown or fallback summaries are being used.
- The new retry report documents are reachable from the main report hub.

## Items To Check When A Test Fails
- `window.location.protocol` handling in the loader
- fallback summary data presence
- fetch error recovery path
- report hub link paths
