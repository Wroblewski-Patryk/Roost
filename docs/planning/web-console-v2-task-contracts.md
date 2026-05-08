# Web Console V2 Task Contracts

## UXA-001 CompanyCore V1 UX/UI Audit

- Task Type: design/research
- Current Stage: verification
- Deliverable For This Stage: evidence-driven UX/UI audit and implementation
  plan for owner-console polish.
- Goal: Evaluate CompanyCore v1 from the owner's point of view and translate
  the findings into a small implementation queue.
- Scope:
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
- Implementation Plan:
  - Review project UX contracts, design memory, scorecard, screen checklist,
    and anti-patterns.
  - Inspect public/auth routes in the Browser plugin on production.
  - Start a local Docker runtime on a non-production port and inspect seeded
    authenticated API state.
  - Audit private screens from source, local API state, and existing UX
    patterns when authenticated Browser entry is blocked.
  - Publish a prioritized UX implementation queue.
- Acceptance Criteria:
  - Audit identifies current strengths, user-facing problems, severity, and
    implementation slices.
  - Audit includes production/browser evidence and local runtime evidence.
  - Authenticated screenshot limitation is recorded honestly instead of hidden.
  - Canonical queue files point at the first executable UX slice.
- Definition of Done:
  - `git diff --check` passes.
  - Browser evidence covers public entry, login, register, and mobile auth.
  - Local runtime health and seeded authenticated API state are recorded.
  - Project state, task board, next-commits, and agent state are updated.
- Result Report:
  - Added `docs/ux/companycore-v1-ux-ui-audit.md`.
  - Scored the current owner console average at `3.42/5`.
  - Identified P0 issues in dashboard command focus and mobile auth action
    order.
  - Queued the next implementation wave as `UXA-002..UXA-006`.
  - Browser could not complete authenticated private-route clickthrough because
    this Browser runtime failed typing into `input[type=email]` and blocked
    `javascript:` session injection; the next task explicitly creates an
    approved authenticated evidence path.

## UXA-002 Authenticated Private Route UX Evidence Harness

- Task Type: qa/design-tooling
- Current Stage: done
- Deliverable For This Stage: approved local authenticated screenshot and
  interaction smoke for private owner-console UX review.
- Goal: Unblock evidence-driven private-route polish without production writes
  or Browser security-policy bypasses.
- Scope:
  - `scripts/owner-console-ux-smoke.mjs`
  - `package.json`
  - `package-lock.json`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.agents/state/known-issues.md`
- Implementation Plan:
  - Add a local Playwright smoke script that authenticates through
    `/auth/login`, seeds the owner token into session storage before page load,
    and captures private routes without submitting write actions.
  - Cover `/dashboard`, `/data`, `/data/tasks`, `/areas`, `/relationships`,
    `/settings/drive`, and `/settings/api` at desktop, tablet, and mobile
    viewports.
  - Add desktop interaction proof for the module switcher, data filter, typed
    tasks editor draft state, and disabled Drive import setup control.
  - Save screenshots and a JSON report outside the repository by default.
  - Update planning and state files so UXA-003 can start from real private-route
    evidence.
- Acceptance Criteria:
  - Private-route screenshots exist for all priority routes at desktop, tablet,
    and mobile.
  - Smoke proves signed-in hydration and fails on page errors, console
    warnings/errors, missing signed-in state, or enabled Drive import without
    setup.
  - Interaction proof covers navigation/module switcher, one filter, one
    editor draft state, and one disabled setup form state.
  - The workflow does not create production users, write production data, or
    rely on `javascript:` URL injection.
- Definition of Done:
  - `node --check scripts/owner-console-ux-smoke.mjs` passes.
  - `npm run owner-console:ux-smoke` passes against local Docker runtime on
    `http://localhost:3000`.
  - `git diff --check` passes.
  - Task board, next steps, project state, system health, and UX audit evidence
    are updated.
- Result Report:
  - Added `scripts/owner-console-ux-smoke.mjs` and the
    `owner-console:ux-smoke` package command.
  - Added Playwright as a dev dependency in package metadata for the local UX
    evidence workflow.
  - Local run passed against `http://localhost:3000`.
  - Artifacts were written to
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T19-47-08-826Z`.
  - Captured all seven private routes at `1440x960`, `834x1112`, and `390x844`,
    plus desktop interaction screenshots for module search, data filtering,
    tasks editor draft state, and disabled Drive import.
  - Console issues were empty, and all signed-in/private-route assertions
    passed.
  - Screenshot observations confirm UXA-003: the dashboard first viewport is
    still too panel-heavy and mobile dashboard pushes the primary action below
    the fold.

## UXA-003 Dashboard First-Viewport Command Polish

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: a tighter `/dashboard` first viewport that makes
  the current priority, blockers, and next action dominant before secondary
  module exploration.
- Process Self-Audit:
  - Analyze current state: UXA-002 screenshots and v1 UX audit reviewed.
  - Select exactly one priority task: UXA-003 only.
  - Plan implementation: reuse the existing command center, attention queue,
    readiness lanes, summary cards, and module launch patterns.
  - Execute implementation: scoped to dashboard markup, dashboard render logic,
    shared CSS, and source-of-truth docs.
  - Verify and test: build, syntax check, integration test, and authenticated UX
    smoke with desktop/tablet/mobile screenshots.
  - Self-review: confirm no architecture/API/backend behavior changed and no
    duplicate dashboard mechanism was introduced.
  - Update documentation and knowledge: task board, project state, next steps,
    and UX memory if the refined pattern should be reused.
- Goal: Make the owner dashboard answer "what matters now, what is blocked, and
  what should I click next" within the first viewport.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Move workspace, ClickUp, Drive, and data readiness evidence into a compact
    strip inside the existing cockpit instead of presenting separate competing
    health cards immediately below it.
  - Keep the attention queue beside the cockpit on desktop and stacked below it
    on mobile, but cap visible attention items so the first screen remains
    decisive.
  - Turn the large module launcher into a secondary exploration section below
    the command decision area.
  - Reduce the lower next-action panel to a short continuation path instead of
    a directory of equal-weight buttons.
  - Tighten dashboard mobile spacing so the dominant action appears earlier
    without hiding context.
- Acceptance Criteria:
  - First viewport shows one dominant current-priority action and one secondary
    action.
  - Blocker count and reason are visible without scrolling on desktop and near
    the top on mobile.
  - Module launch grid reads as secondary exploration, not a competing command
    center.
  - Lower next-action panel has no more than three action links.
  - Desktop, tablet, and mobile screenshots show no overlap, horizontal
    overflow, or developer-looking diagnostic text.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Integration test command passes against the local Docker backend service.
  - `npm run owner-console:ux-smoke` passes and records desktop/tablet/mobile
    screenshots for `/dashboard`.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Container-scoped Prisma migration plus Node integration test passed inside
    the backend service.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa003` at `http://localhost:3002`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-00-12-315Z`.
- Result Report:
  - Moved workspace, ClickUp, Google Drive, and data readiness evidence into a
    compact cockpit strip.
  - Removed the competing first-viewport health-card row.
  - Limited visible attention rows to the top three signals with a concise
    overflow note when more signals exist.
  - Renamed the module launcher to secondary `Explore modules` context and
    moved it below the command decision area.
  - Reduced the lower next-action panel from ten links to three continuation
    links.
  - Removed secondary header shortcuts that appeared above the primary action
    on mobile.
  - Updated design memory with the refined command-center pattern and captured
    a local smoke isolation guardrail in the learning journal.

## UXA-004 Mobile Auth Action-First Layout

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: mobile `/auth/login` and `/auth/register` show
  the form before onboarding context while preserving desktop two-column auth.
- Process Self-Audit:
  - Analyze current state: UX audit P0 mobile auth finding and existing auth
    context pattern reviewed.
  - Select exactly one priority task: UXA-004 only.
  - Plan implementation: keep existing auth markup and desktop pattern; use
    responsive ordering and spacing only.
  - Execute implementation: scoped to auth CSS plus source-of-truth docs.
  - Verify and test: syntax/build, rendered public auth screenshots, and
    regression checks.
  - Self-review: confirm auth logic, routes, validation, and copy remain stable.
  - Update documentation and knowledge: task board, project state, next steps,
    and design memory when the responsive pattern should guide future auth work.
- Goal: Let returning owners reach sign-in and account creation fields before
  static onboarding context on phone-sized screens.
- Scope:
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Keep desktop auth as context panel plus form in the current two-column
    layout.
  - On responsive stacked layouts, order `.auth-card` before
    `.auth-context-card`.
  - Tighten mobile auth spacing enough that the primary form and submit action
    appear early without hiding context below.
  - Verify login and register at mobile and desktop widths.
- Acceptance Criteria:
  - Mobile login shows the sign-in form before onboarding context.
  - Mobile register shows account creation fields before onboarding context.
  - Desktop login/register preserve the existing two-column layout.
  - Required fields, submit buttons, links, focus styling, and auth route
    redirects remain intact.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Rendered screenshots verify mobile login/register and desktop auth.
  - `git diff --check` passes.
- Validation Evidence:
  - Browser plugin page identity and DOM check passed for
    `http://localhost:3003/auth/login`; console warnings/errors were empty.
  - Browser screenshot capture timed out, so rendered viewport evidence fell
    back to local Playwright screenshots.
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - Local Playwright auth smoke passed for desktop `1440x960` and mobile
    `390x844`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-auth-ux-smoke\2026-05-08T20-08-09-640Z`.
- Result Report:
  - Added responsive ordering so `.auth-card` appears before
    `.auth-context-card` when the auth grid stacks.
  - Preserved desktop login/register as two-column context plus form layouts.
  - Tightened mobile auth spacing and context-card padding.
  - Verified mobile login and register show their forms before context and keep
    submit buttons visible inside the first viewport.

## UXA-005 Workbench Visual Role Cleanup

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: dense owner-console workbenches have clearer
  visual roles for filters, lists, selected details, compact rows, and
  relationship review items.
- Process Self-Audit:
  - Analyze current state: v1 UX audit P1 dense-workbench finding and existing
    workbench design memory reviewed.
  - Select exactly one priority task: UXA-005 only.
  - Plan implementation: reuse existing `workbench-*`, filter-bar,
    `record-list`, `record-inspector`, `relationship-row`, and `compact-row`
    patterns instead of adding route-local variants.
  - Execute implementation: scoped to shared CSS plus source-of-truth docs.
  - Verify and test: syntax/build, authenticated smoke screenshots, and
    regression checks for desktop/tablet/mobile.
  - Self-review: confirm no route behavior, auth, API, or data contract
    changed.
  - Update documentation and knowledge: task board, project state, next steps,
    and design memory when the role cleanup becomes reusable guidance.
- Goal: Reduce equal-weight panel fatigue across dense routes so operators can
  scan filters, lists, selected details, and remediation rows faster.
- Scope:
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Make filter surfaces quieter than content surfaces.
  - Reduce repeated list-row shadow/weight and give list zones a distinct
    quiet background.
  - Strengthen selected-row and selected-detail treatment without relying only
    on color.
  - Keep compact relationship/area rows lightweight and readable.
  - Validate `/data`, `/data/tasks`, `/areas`, and `/relationships` through the
    authenticated UX smoke screenshots.
- Acceptance Criteria:
  - Filters are visually quieter than lists/details.
  - Selected rows/details are stronger and do not rely only on color.
  - Repeated rows use less shadow and clearer hover/focus states.
  - No new page-local component family is introduced.
  - Desktop/tablet/mobile screenshots show no overlap or horizontal overflow.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Container-scoped integration test passes.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project and captures the priority workbench routes.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Container-scoped Prisma migration plus Node integration test passed inside
    isolated compose project `companycore_uxa005`.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa005` at `http://localhost:3004`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-13-50-112Z`.
  - `git diff --check` passed.
- Result Report:
  - Made shared filter bars quieter with a low-emphasis background and border.
  - Reduced repeated workbench row weight by removing raised hover shadows and
    using subtle inset state markers.
  - Gave record lists a quiet list-zone background and strengthened selected
    rows with a non-color-only left inset.
  - Strengthened selected-detail/inspector treatment with a distinct border,
    soft surface, and light depth.
  - Made relationship and compact rows lighter while preserving readable row
    boundaries.
  - Updated design memory with reusable visual-role guidance for dense
    workbenches.

## UXA-006 Local Action Feedback Placement

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: TESTER
- Deliverable For This Stage: auth, provider setup, Drive import, typed editor,
  and API-key lifecycle actions keep status/error/success feedback close to the
  action while the global result panel remains available for cross-route
  outcomes and result metrics.
- Process Self-Audit:
  - Analyze current state: reviewed existing `showResult`, auth forms,
    ClickUp setup, Google Drive setup/import, typed editor status helpers, and
    API key lifecycle status.
  - Select exactly one priority task: UXA-006 only.
  - Plan implementation: add local status slots where feedback was still only
    global, and reuse existing `form-note` tone classes instead of creating a
    new notification system.
  - Execute implementation: scoped to public HTML, frontend JS, shared CSS, and
    source-of-truth docs.
  - Verify and test: syntax/build, rendered Playwright feedback checks,
    authenticated owner-console smoke, and container integration tests.
  - Self-review: confirm auth, provider, Drive, API key, and typed editor
    feedback still uses approved existing mechanisms with no raw backend
    errors exposed.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, UX audit, and design memory.
- Goal: Reduce user uncertainty after form and setup actions by placing
  immediate feedback next to the action that caused it.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Add local `aria-live` status slots for login, registration, ClickUp setup,
    and Google Drive setup/import.
  - Add a shared `setLocalStatus` helper and use it before, after, and on error
    for auth, ClickUp, and Drive actions.
  - Keep `showResult` for broad cross-route outcomes and sync/import metrics.
  - Preserve existing local feedback for typed editors and API key lifecycle
    actions.
  - Validate desktop/mobile rendered behavior plus private-route smoke.
- Acceptance Criteria:
  - Auth errors appear next to the auth form as well as in global feedback.
  - ClickUp setup and Drive setup/import actions have local status feedback.
  - Empty local status slots are hidden and do not add layout noise.
  - Typed editor and API key local status behavior is preserved.
  - Global result panel still handles cross-route outcomes and metric payloads.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Rendered Playwright checks prove local auth feedback and hidden empty
    ClickUp/Drive status slots.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration plus Node integration test passes.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Browser path opened `http://localhost:3005/auth/login`, but interaction
    fallback was required because Browser failed on `locator.fill` with a
    virtual clipboard/runtime error.
  - Playwright fallback confirmed invalid login renders
    `Email or password is incorrect.` in `#loginStatus` with
    `form-note local-status is-error`; the only console event was the expected
    `401` from the intentional failed login.
  - Playwright fallback confirmed `#clickupActionStatus` and
    `#googleDriveActionStatus` exist and stay hidden while empty.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa006` at `http://localhost:3005`; artifacts:
    `.tmp/uxa006-owner-console-rerun`.
  - Container-scoped Prisma migration plus Node integration test passed inside
    isolated compose project `companycore_uxa006`.
- Result Report:
  - Added local live-status slots for login, registration, ClickUp setup, and
    Google Drive setup/import surfaces.
  - Added shared local status helpers and wired auth, ClickUp, and Drive action
    handlers to pending/success/error feedback.
  - Preserved the global result panel for broader outcomes and sync/import
    metric details.
  - Preserved existing typed editor and API-key lifecycle local feedback.
  - Recorded the reusable local action feedback rule in design memory.

## V2WEB-049 Table Workbench Empty State Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: the table workbench shows actionable empty states
  for unsupported tables, signed-out access, empty record lists, filtered-out
  lists, and inspector selection.
- Goal: Make route-level business editing surfaces feel intentional even when
  no records are loaded yet, so operators know the next action without reading
  raw table context.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable table-workbench empty state helper with title, message, and
    optional local action.
  - Replace generic table record and inspector empty notes with actionable
    states for unsupported, signed-out, no-records, filtered, and select-record
    conditions.
  - Add a clear-filters action and a new-draft action through existing table
    workbench state.
  - Style the empty state as a compact reusable panel that works inside lists
    and inspector surfaces.
  - Validate syntax/build, tests, and desktop/mobile table workbench rendering.
- Acceptance Criteria:
  - Empty record lists explain whether the table has no records or filters are
    hiding matches.
  - Typed editable tables offer `New draft` from the empty record-list state.
  - Filtered-out lists offer `Clear filters` and update the table view.
  - Inspector empty state explains selection or creation without raw backend
    language.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies table empty, filtered, and inspector states,
    responsive layout, and no console errors.
- Result Report:
  - Added a reusable table-workbench empty state helper with title, message,
    and optional local action.
  - Replaced generic `/data-table` record-list and inspector notes with
    actionable states for unsupported table routes, protected signed-out
    routing, empty record lists, filtered-out lists, and selection/creation
    context.
  - Added local `New draft` and `Clear filters` actions through existing table
    workbench state; no backend behavior, API routes, or CRUD semantics were
    changed.
  - Added compact empty-state styling that works inside record lists and
    inspector panels on desktop and mobile.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55505`.
  - Passed local Playwright smoke against disposable Postgres on port `55504`;
    smoke verified protected `/data/notes` sign-in feedback, new-workspace
    empty Notes state, `New draft`, note creation, filtered-out record-list and
    inspector states, `Clear filters`, mobile layout, and no console/page
    errors or horizontal overflow.
  - Browser plugin fallback was required because the Browser tool was not
    exposed in this session.

## V2WEB-048 Global Feedback Panel Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: the shared `#resultPanel` shows clearer action
  feedback for success and error states.
- Goal: Make global action feedback easier to scan across auth, ClickUp,
  Google Drive, CRUD, and API workflows without changing backend behavior.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an accessible live region and tone label to the shared result panel.
  - Update `showResult` to mark success versus attention states on the panel.
  - Style success/error result states with the existing compact panel language.
  - Preserve existing result messages, sync metrics, and action behavior.
  - Validate syntax/build, tests, and desktop/mobile feedback rendering.
- Acceptance Criteria:
  - Success feedback shows a `Success` tone label and readable message box.
  - Error feedback shows a `Needs attention` tone label and readable message
    box.
  - Existing sync/detail metrics still render inside the result panel.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies error and success feedback states,
    responsive layout, and no console errors.
- Result Report:
  - Added an accessible live region, tone label, and bordered message box to
    the shared `#resultPanel`.
  - Updated `showResult` so success feedback shows `Success` and error
    feedback shows `Needs attention` while preserving existing result messages,
    sync metrics, and action behavior.
  - Added tone-aware success/error styling using the existing compact panel
    language.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55503`.
  - Passed local Playwright desktop/mobile smoke for wrong-login error feedback
    and successful workspace creation feedback; smoke verified tone labels,
    message boxes, no horizontal overflow, and no unexpected console/page
    errors. The expected `401 Unauthorized` response from the wrong-login
    action was filtered as the tested failure path.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-047 Public Entry Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/` shows a stronger public entry context for
  CompanyCore v1 before owner login or workspace creation.
- Goal: Make the public landing route explain the operational console, core
  integration surfaces, and agent API value before the user chooses sign-in or
  registration.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add public entry pills for ClickUp, Drive, agent API, and operating areas.
  - Replace the minimal Web UI status chip with a compact operational console
    card.
  - Preserve public sign-in/register navigation and auth behavior.
  - Validate syntax/build, tests, and desktop/mobile public-entry rendering.
- Acceptance Criteria:
  - `/` explains the operational console and core integration surfaces before
    auth.
  - `Sign in` and `Create account` keep navigating to existing auth routes.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies public entry context, auth navigation,
    responsive layout, and no console errors.
- Result Report:
  - Added public entry pills for ClickUp, Google Drive, agent-safe API, and
    operating areas.
  - Replaced the minimal Web UI status chip with a compact operational console
    card.
  - Preserved public sign-in/register navigation and auth behavior.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55501`.
  - Passed local Playwright desktop/mobile `/` smoke with no console errors or
    horizontal overflow; smoke verified public entry copy and navigation to
    `/auth/login` plus `/auth/register`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-046 Auth Onboarding Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/auth/login` and `/auth/register` show compact
  onboarding context panels beside the owner forms.
- Goal: Make the public entry screens explain the workspace, integration,
  operating-area, and agent API context before an owner signs in or creates a
  workspace.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a static owner onboarding context panel beside the login form.
  - Add a static workspace bootstrap context panel beside the registration
    form.
  - Style both panels with the established compact context-panel visual
    language and responsive single-column collapse.
  - Preserve existing login, registration, form validation, and navigation
    behavior.
  - Validate syntax/build, tests, and desktop/mobile auth rendering.
- Acceptance Criteria:
  - `/auth/login` explains owner onboarding before sign-in.
  - `/auth/register` explains workspace bootstrap before account creation.
  - Existing auth form submissions and auth navigation continue to work.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies login/register context, auth navigation,
    successful registration, responsive layout, and no console errors.
- Result Report:
  - Added owner onboarding context to `/auth/login`.
  - Added workspace bootstrap context to `/auth/register`.
  - Reused the compact context-panel visual language with responsive
    single-column collapse while preserving existing auth forms and behavior.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55499`.
  - Passed local Playwright desktop/mobile auth smoke with no console errors or
    horizontal overflow; smoke verified login/register context copy, navigation
    between auth routes, and successful registration redirect to `/dashboard`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-045 ClickUp Setup Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings` shows a compact ClickUp adapter
  command panel before the ClickUp setup form.
- Goal: Make the ClickUp setup screen immediately explain connection status,
  token readiness, selected workspace/list scope, import mode, synced ClickUp
  task count, and next actions before the owner works through the form.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a ClickUp context slot above the existing setup form.
  - Render ClickUp status, token readiness, workspace selection state,
    selected/saved/loaded List counts, ClickUp task count, and import mode from
    existing frontend state.
  - Add local actions to the setup form, task adapter, and integration map
    through existing SPA navigation.
  - Preserve the existing token check, refresh, Workspace select, List picker,
    import mode, save, and sync controls.
  - Validate syntax, build, tests, and desktop/mobile `/settings` rendering.
- Acceptance Criteria:
  - `/settings` explains the ClickUp adapter command state before the setup
    form.
  - `Setup form`, `Review tasks`, and `Integration map` navigate through the
    SPA to existing dedicated surfaces or the local setup anchor.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies ClickUp context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic ClickUp adapter command panel to `/settings`.
  - Added ClickUp status, token readiness, workspace selection, selected/saved/
    loaded List counts, ClickUp task count, and import mode pills plus actions
    to the setup form, task review, and integration map.
  - Shortened the ClickUp token placeholder so the mobile form stays readable.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55497`.
  - Passed local Playwright desktop/mobile `/settings` smoke with no console
    errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, local setup anchor behavior, and SPA navigation to
    `/tasks-adapter` plus `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-044 Account Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/account` shows a compact workspace
  command profile before account cards.
- Goal: Make the account screen immediately explain owner session readiness,
  workspace identity, integration readiness, API route exposure, service key
  state, and operating-area coverage before the owner scans readiness links.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an account context slot above the existing owner/workspace cards.
  - Render owner session state, workspace name, ClickUp state, Drive state,
    API route count, active key count, scoped key count, and operating-area
    count from existing frontend state.
  - Add local actions to the integration map, agent API settings, and
    operating areas through existing SPA navigation.
  - Preserve existing owner/workspace cards and readiness grid.
  - Validate syntax, build, tests, and desktop/mobile `/settings/account`
    rendering.
- Acceptance Criteria:
  - `/settings/account` explains workspace command profile before account
    cards.
  - `Integration map`, `Agent API`, and `Operating areas` navigate through the
    SPA to existing dedicated surfaces.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies account context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic workspace command profile to `/settings/account`.
  - Added owner session, ClickUp state, Drive state, API route, active key,
    scoped key, and operating-area pills plus actions to the integration map,
    agent API settings, and operating areas.
  - Kept the context panel from exposing the raw missing-email fallback when
    owner details are not returned by the current connection payload.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55495`.
  - Passed local Playwright desktop/mobile `/settings/account` smoke with no
    console errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, and SPA navigation to `/settings/integrations`,
    `/settings/api`, and `/areas`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-043 Integration Map Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/integrations` shows a compact
  integration command map before provider group cards.
- Goal: Make the integration map immediately explain provider APIs, operating
  areas, ClickUp tasks, Drive folders, pipeline records, and agent API routes
  before the owner scans integration cards or setup rows.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an integration command context slot above the existing integration
    group grid.
  - Render readiness, implemented group count, operating-area count, ClickUp
    task count, Drive folder count, pipeline record count, API route count,
    and Drive status from existing frontend state.
  - Add local actions to ClickUp setup, Drive setup, and agent API settings
    through existing SPA navigation.
  - Preserve existing integration group cards, provider setup rows, integration
    filters, and operating-area data matrix.
  - Validate syntax, build, tests, and desktop/mobile
    `/settings/integrations` rendering.
- Acceptance Criteria:
  - `/settings/integrations` explains the integration command map before the
    provider group cards.
  - `ClickUp setup`, `Drive setup`, and `Agent API` navigate through the SPA to
    the existing dedicated setup surfaces.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies integration context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic integration command map to `/settings/integrations`.
  - Added readiness, implemented group, operating-area, ClickUp task, Drive
    folder, pipeline record, API route, and Drive status pills plus actions to
    ClickUp setup, Drive setup, and agent API settings.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55493`.
  - Passed local Playwright desktop/mobile `/settings/integrations` smoke with
    no console errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, and SPA navigation to `/settings`,
    `/settings/drive`, and `/settings/api`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-042 Google Drive Import Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/drive` shows a compact Drive import
  context panel before OAuth setup.
- Goal: Make the Google Drive settings screen immediately explain OAuth client
  readiness, consent state, selected/discovered folders, imported items, and
  folder review needs before the owner follows the detailed setup guide.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a Drive import context slot above the existing Drive setup panel.
  - Render OAuth client state, consent state, selected folder count,
    discovered folder count, imported item count, folder review count, and
    Drive setup status from existing client state.
  - Add local actions to Drive setup and relationship review through existing
    page anchors and SPA navigation.
  - Preserve existing OAuth form, setup guide, folder picker, import mode,
    Drive file filters, preview actions, and description editing.
  - Validate syntax, build, tests, and desktop/mobile `/settings/drive`
    rendering.
- Acceptance Criteria:
  - `/settings/drive` explains Drive import readiness before OAuth setup.
  - `Setup Drive` moves context to the existing Drive setup panel.
  - `Review folders` navigates to `/relationships` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies Drive context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic Drive import context panel to `/settings/drive`.
  - Added OAuth client, consent, selected folder, discovered folder, imported
    item, and folder-review pills plus actions to setup and review folders.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55491`.
  - Passed local Playwright desktop/mobile `/settings/drive` smoke with no
    console errors or horizontal overflow; smoke verified context copy,
    OAuth/client readiness pills, selected/discovered/imported folder counts,
    setup anchor behavior, and SPA navigation to `/relationships`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-041 Operating Area Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/areas` shows a compact operating model context
  panel before the company operating map.
- Goal: Make the operating-area screen immediately explain how the selected
  company area fits into tables, records, Drive files, provider mappings, and
  agent-readable context before the owner scans the area rail and workbench.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an operating model context slot above the existing operating map.
  - Render area count, table count, record count, provider mapping count,
    Drive item count, selected-area signal count, and selected-area status.
  - Add local actions to relationship review and the integration map through
    existing SPA navigation.
  - Preserve existing area rail, selected-area detail, filters, workbench,
    delete guardrails, assignment controls, and linked-content previews.
  - Validate syntax, build, tests, and desktop/mobile `/areas` rendering.
- Acceptance Criteria:
  - `/areas` explains company-area context before the operating map.
  - `Review mappings` navigates to `/relationships` through the SPA.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies area context, both actions, responsive layout,
    and no console errors.
- Result Report:
  - Added a dynamic operating model context panel to `/areas`.
  - Added area, table, record, provider mapping, Drive item, and selected-area
    signal pills plus actions to review mappings and open the integration map.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55489`.
  - Passed local Playwright desktop/mobile `/areas` smoke with no console
    errors or horizontal overflow; smoke verified context copy, inventory
    pills, selected-area status, and SPA navigation to `/relationships` plus
    `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-040 API Agent Access Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/api` shows a compact agent API
  command context panel above API cards and key management.
- Goal: Make the API settings screen immediately explain whether agent access
  is ready, how many scoped service keys exist, and how much route/capability
  surface is available before the owner creates or hands off a key.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an API context slot above the existing API summary cards.
  - Render active key count, inactive key count, scoped key count, capability
    count, route count, and write-route count from existing client state.
  - Add local actions for key creation and integration map review.
  - Preserve existing scoped-key form, copy-once raw key behavior, key list,
    capability chips, route filters, and route list.
  - Validate syntax, build, tests, and desktop/mobile `/settings/api`
    rendering.
- Acceptance Criteria:
  - `/settings/api` explains agent API readiness before key management.
  - `Create key` moves focus context to the existing key form without a new
    backend path.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies API context, both actions, responsive layout,
    and no console errors.
- Result Report:
  - Added a dynamic agent API context panel to `/settings/api`.
  - Added active/inactive/scoped key, capability, route, and write-route pills
    plus actions to create a key and open the integration map.
  - Fixed context refresh after scoped key creation so the panel updates from
    `No active keys` to `Agent access ready` with current key counts.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55487`.
  - Passed local Playwright desktop/mobile `/settings/api` smoke with no
    console errors or horizontal overflow; smoke verified initial context,
    create-key anchor behavior, scoped key creation, copy-once raw key display,
    post-create context refresh, and SPA navigation to `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-039 Relationships Mapping Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/relationships` shows a compact mapping context
  panel before the review queue.
- Goal: Make the relationship review center immediately explain provider and
  Drive area mapping health, what needs review, and where the owner should go
  next to fix operating-area context.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a relationship context slot above the existing review queue.
  - Render mapping health, provider mapping count, Drive folder count, review
    item count, and filtered visibility.
  - Add local actions to open the operating area map and integration map
    through existing SPA navigation.
  - Preserve existing relationship filters, review queue rows, assign-area
    controls, and provider/Drive lists.
  - Validate syntax, build, tests, and desktop/mobile `/relationships`
    rendering.
- Acceptance Criteria:
  - `/relationships` explains provider/Drive area mapping before the review
    queue.
  - `Open area map` navigates to `/areas` through the SPA.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies relationship context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic mapping context panel to `/relationships`.
  - Added provider mapping, Drive folder, review item, and visible relationship
    pills plus actions to `/areas` and `/settings/integrations`.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55485`.
  - Passed local Playwright desktop/mobile `/relationships` smoke with no
    console errors or horizontal overflow; smoke verified context copy, pills,
    and both SPA navigation actions.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-038 Pipeline Workflow Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/pipeline` shows a compact workflow context
  panel before stats, filters, and the record feed.
- Goal: Make the pipeline screen immediately explain that pipeline stages are
  reusable cross-department workflow infrastructure while clients, deals, and
  interactions are the current CRM usage records.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a pipeline context slot above the stats strip.
  - Render workflow readiness, reusable stage count, CRM usage record count,
    visible filtered count, and implemented table count.
  - Add local actions to open pipeline stages and CRM client records in the Data
    workbench through existing SPA navigation.
  - Preserve existing pipeline stats, filters, feed, and list sections.
  - Validate syntax, build, tests, and desktop/mobile `/pipeline` rendering.
- Acceptance Criteria:
  - `/pipeline` explains shared stages versus CRM usage before the stats strip.
  - `Open stages` navigates to `/data/pipeline-stages` through the SPA.
  - `Open CRM records` navigates to `/data/clients` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies pipeline context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic workflow context panel to `/pipeline`.
  - Added shared-stage versus CRM-usage copy, workflow status, context pills,
    and actions to `/data/pipeline-stages` and `/data/clients`.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55483`.
  - Local Playwright `/pipeline` smoke passed on desktop `1440x960` and mobile
    `390x844`: workflow context rendered, shared-stage versus CRM-usage copy
    and pills were visible, `Open stages` navigated through the SPA to
    `/data/pipeline-stages`, `Open CRM records` navigated through the SPA to
    `/data/clients`, there were no console errors, and there was no horizontal
    overflow. Browser plugin validation was attempted first but remained
    blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-037 Tasks Adapter Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/tasks-adapter` shows a compact adapter context
  panel before task counts and the task table.
- Goal: Make the ClickUp/CompanyCore task adapter screen communicate source
  status, selected ClickUp scope, current workload health, and the right next
  action before the owner scans the task table.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable adapter-context slot above the task stats strip.
  - Render ClickUp connection status, ClickUp/local record split, selected List
    count, open/due workload signal, and sync state.
  - Add local actions to open the typed task editor and ClickUp configuration
    through existing SPA navigation.
  - Preserve existing task stats, filters, table rendering, and refresh
    behavior.
  - Validate syntax, build, tests, and desktop/mobile `/tasks-adapter`
    rendering.
- Acceptance Criteria:
  - `/tasks-adapter` shows adapter status and source/scope context before task
    stats.
  - `Open task editor` navigates to `/data/tasks` through the SPA.
  - `Configure ClickUp` navigates to `/settings` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies adapter context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic adapter context panel to `/tasks-adapter`.
  - Added source split, selected ClickUp List count, workload health, sync
    state, and actions to `/data/tasks` and `/settings`.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55481`.
  - Local Playwright `/tasks-adapter` smoke passed on desktop `1440x960` and
    mobile `390x844`: adapter context rendered, ClickUp disconnected state was
    visible, source/scope/workload/sync pills rendered, `Open task editor`
    navigated through the SPA to `/data/tasks`, `Configure ClickUp` navigated
    through the SPA to `/settings`, there were no console errors, and there was
    no horizontal overflow. Browser plugin validation was attempted first but
    remained blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-036 Table Workbench Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/data/:table` workbench shows a compact table
  context panel with capability, API, source, field, and primary action
  information.
- Goal: Make the table-detail workbench feel like a continuation of the Data
  operations center, so owners can understand editability, source coverage, and
  next action before scanning records or opening the inspector.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable table-context slot above the table workbench panel.
  - Render typed-editor versus read-only capability, API methods, write action
    availability, sources, visible field count, and loaded record count.
  - Provide a local `New draft` action for typed modules and an API review link
    for read-only modules.
  - Preserve existing table filters, record selection, typed editors, and route
    paths.
  - Validate syntax, build, tests, and desktop/mobile `/data/:table` rendering.
- Acceptance Criteria:
  - `/data/tasks` shows a typed-editor context panel and a `New draft` action
    that opens the create form without leaving the route.
  - A read-only module shows read-only/API review context instead of implying
    an editor exists.
  - Dynamic links in the new panel use existing SPA navigation behavior.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies typed and read-only table context states,
    `New draft`, API-review navigation, and responsive layout with no console
    errors.
- Result Report:
  - Added a dynamic table context panel above `/data/:table` workbenches.
  - Added typed/read-only capability status, API/write/source/field pills,
    loaded-record/API route counts, `New draft` for typed modules, and `Review
    API` for read-only modules.
  - Moved the context panel above the stats strip so mobile users see table
    meaning and primary action before secondary counts.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55479`.
  - Local Playwright `/data/:table` smoke passed on desktop `1440x960` and
    mobile `390x844`: `/data/tasks` rendered typed context with `New draft`,
    the new-draft action opened the create-task editor, `/data/goals` rendered
    read-only context with `Review API`, the review link navigated through the
    SPA to `/settings/api`, there were no console errors, and there was no
    horizontal overflow. Browser plugin validation was attempted first but
    remained blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-035 Data Operations Index Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/data` database module index communicates
  editability, API coverage, record/source counts, and next action without
  changing existing routes.
- Goal: Make the database operations center easier to scan so the owner and
  agents can quickly choose the right module, understand whether it is editable,
  and open the existing table workbench.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Reuse the existing `workbench-index-row` pattern instead of adding a
    page-local list component.
  - Add row-level capability status for typed editors versus read-only modules.
  - Add compact operational tags for API coverage, write actions, and mapped
    area.
  - Move metrics, provider/source metadata, and the open action into a
    responsive side panel.
  - Validate syntax, build, tests, and desktop/mobile `/data` rendering.
- Acceptance Criteria:
  - `/data` rows show whether a module has a typed editor or is read-only.
  - Rows still navigate through the existing `data-link` SPA route behavior.
  - API coverage, write action availability, mapped area, records, routes, and
    sources are visible without opening a module.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies `/data` row statuses, filtering/navigation, and
    responsive layout with no console errors.
- Result Report:
  - Updated database module rows with capability badges, operational tags, a
    compact metrics/source side panel, and preserved route navigation.
  - Extended the reusable workbench index CSS pattern with editable/read-only
    status styling and mobile-safe stacking.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55476`.
  - Local Playwright `/data` smoke passed on desktop `1440x960` and mobile
    `390x844`: 13 module rows rendered, 5 typed-editor rows were marked,
    read-only badges rendered, operation tags rendered, the `tasks` filter
    narrowed the list, `/data/tasks` navigation worked, there were no console
    errors, and there was no horizontal overflow. Browser plugin validation was
    attempted first but remained blocked because its Node REPL requires Node
    `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-034 Command Bar Module Switcher Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: top command bar and module switcher use the same
  semantic lane model as the sidebar and expose clearer active-module context.
- Goal: Make cross-module navigation feel intentional and fast from every
  screen without changing route behavior or adding backend state.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Rename the topbar search affordance from "Open module" to "Jump to module",
    replace long workspace-name eyebrow text with stable current-module copy,
    and tighten route title styling.
  - Align module switcher groups with sidebar lanes: Command, Operate,
    Integrations, and Workspace.
  - Render grouped search results with group headings and active-module state.
  - Validate syntax, build, tests, and desktop/mobile command-bar rendering.
- Acceptance Criteria:
  - Module switcher results are grouped by the same job-family labels as the
    sidebar.
  - The current module is marked as selected in the switcher result list.
  - Enter-first-result navigation and click navigation keep using existing
    route paths.
  - Desktop and mobile topbar layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies module search/open behavior on desktop and
    mobile with no console errors or horizontal overflow.
- Result Report:
  - Updated topbar copy to "Jump to module", changed the signed-in eyebrow to
    "Current module", and tightened route title chrome.
  - Aligned `moduleRoutes` groups to Command, Operate, Integrations, and
    Workspace.
  - Added grouped switcher result headings and active-result state while
    preserving the same navigation paths.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55473`.
  - Local Playwright command-bar smoke passed on desktop `1440x960` and mobile
    `390x844`: "Jump to module" rendered, grouped results appeared, active
    Dashboard result was marked selected, Enter navigation opened API settings,
    there were no console errors, and no horizontal overflow. Browser plugin
    validation was attempted first but remained blocked because its Node REPL
    requires Node `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-033 App Shell Navigation Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: owner console navigation is grouped into
  command, operate, integration, and workspace lanes without changing route
  behavior.
- Goal: Make the application shell feel like a usable operating center across
  all screens by reducing sidebar scanning cost and making active navigation
  state clearer.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Group existing sidebar routes into semantic sections while preserving all
    hrefs and `data-nav` attributes.
  - Improve active, hover, and scroll behavior through shared sidebar styles.
  - Keep mobile drawer behavior compatible with the existing menu button.
  - Validate syntax, build, tests, and desktop/mobile navigation rendering.
- Acceptance Criteria:
  - Sidebar links are grouped by operational purpose.
  - Existing route navigation and active-route highlighting still work.
  - Sidebar can scroll independently when viewport height is constrained.
  - Mobile drawer remains usable with no horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies `/dashboard` shell rendering on desktop and
    mobile with no console errors or horizontal overflow.
- Result Report:
  - Grouped sidebar navigation into Command, Operate, Integrations, and
    Workspace sections.
  - Added reusable sidebar-section styling, clearer active route affordance,
    hover border, and independent sidebar scrolling.
  - Preserved all route URLs, `data-link`, and `data-nav` attributes.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55471`.
  - Local `/dashboard` Playwright shell smoke passed on desktop `1440x960` and
    mobile `390x844`: four sidebar groups rendered, active dashboard route was
    preserved, there were no console errors, and no horizontal overflow.
    Browser plugin validation was attempted first but remained blocked because
    its Node REPL requires Node `>=22.22.0` while this workstation exposes Node
    `22.13.0`.

## V2WEB-032 Dashboard Command Layout Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dashboard first viewport behaves more like an
  operational command center by pairing priority, readiness lanes, and the
  attention queue in one scan path.
- Goal: Make the owner console dashboard answer "what matters now, what is
  blocked, and where do I click next" faster without adding new backend
  behavior.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Place the operational cockpit and attention queue in a shared responsive
    dashboard command layout.
  - Keep readiness lanes inside the cockpit and move workspace/provider status
    cards into a tighter health strip.
  - Preserve existing IDs and JavaScript data wiring so dashboard behavior,
    links, and attention ranking remain unchanged.
  - Validate syntax, build, tests, and desktop/mobile dashboard render.
- Acceptance Criteria:
  - Desktop dashboard first viewport shows current priority, readiness lanes,
    and attention items side by side without layout overflow.
  - Mobile stacks the same cockpit, attention queue, and health strip in a
    readable order without horizontal scrolling.
  - Existing dashboard links and dynamic text still render from current state.
  - No new backend endpoints, tables, or placeholder-only data are introduced.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies `/dashboard` on desktop and mobile with no
    console errors or horizontal overflow.
- Result Report:
  - Added a reusable `dashboard-command-layout` that pairs the cockpit and
    attention queue on desktop and stacks cleanly on mobile.
  - Reused existing `command-focus`, `command-panel`, `operational-step`,
    `summary-card`, and `button-link` patterns instead of introducing a new UI
    system.
  - Tightened the dashboard health cards through a `health-grid` variant while
    preserving existing workspace, ClickUp, API, and Drive state wiring.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55469`.
  - Local `/dashboard` Playwright smoke passed on desktop `1440x960` and mobile
    `390x844`: the command layout rendered once, attention queue stayed in the
    cockpit scan path, there were no console errors, and no horizontal
    overflow. Browser plugin validation was attempted first but remained
    blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-031 Cross-Department Pipeline Semantics

- Task Type: product/frontend/docs
- Current Stage: done
- Deliverable For This Stage: owner console and source-of-truth docs describe
  pipelines as shared workflow infrastructure rather than a CRM-owned module.
- Goal: Keep CompanyCore domain language aligned with the product decision that
  CRM can use pipelines, but pipelines must be usable by every department.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `docs/architecture/system-architecture.md`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `docs/ux/design-memory.md`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Update `/pipeline`, module-switcher, dashboard, and integration taxonomy
    copy to say shared pipeline plus current CRM usage records.
  - Move `pipeline-stages` UI grouping from CRM to workflow while keeping
    routes, table names, and API contracts stable.
  - Record the confirmed domain boundary in architecture, API, database, UX,
    planning, task-board, and project-state docs.
- Acceptance Criteria:
  - `/pipeline` no longer presents pipelines as CRM-owned.
  - CRM clients/deals/interactions remain visible as current consumers of the
    shared pipeline workbench.
  - No API route, database table, or persisted slug is renamed in this slice.
  - Validation covers frontend syntax, build, tests, and a browser smoke.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Desktop and mobile `/pipeline` smoke confirm the corrected copy renders
    without console errors or horizontal overflow.
- Result Report:
  - Reworded dashboard, module switcher, integration taxonomy, and `/pipeline`
    copy around shared pipeline infrastructure and current CRM usage records.
  - Moved Pipeline route search grouping and `pipeline-stages` catalog grouping
    from CRM to Workflow.
  - Updated architecture, API, database, UX, project-state, task-board, and
    next-commits docs with the cross-department pipeline decision.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55466`.
  - Local `/pipeline` Playwright smoke passed on desktop `1440x960` and mobile
    `390x844`: corrected shared-workflow copy rendered, search input accepted
    text, there were no console errors, and no horizontal overflow. Browser
    plugin validation was attempted first but blocked because its Node REPL
    requires Node `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-020 Main Operating Area Foundation

- Task Type: backend/frontend
- Current Stage: done
- Deliverable For This Stage: workspace operating model includes immutable
  `00. Glowny` fallback area for unclassified ClickUp/Drive/company elements.
- Goal: Give ClickUp Lists and other imported records without a clear company
  department a stable home instead of forcing them into an unrelated internal
  department.
- Scope:
  - `src/operating-model/catalog.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `src/tests/api.test.ts`
  - `public/app.js`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `main-general` as position `0` in the operating-area catalog.
  - Make unclassified provider names fall back to `main-general`.
  - Ensure existing workspaces receive the new area during connection and
    operating-model reads.
  - Update frontend area metadata/order so `00. Glowny` appears first.
  - Update tests from 12 to 13 areas and verify unknown ClickUp lists map to
    the new fallback area.
- Acceptance Criteria:
  - New and existing workspaces expose `main-general` / `00. Glowny` first.
  - Unknown ClickUp List names classify to `main-general`.
  - Existing business table mappings remain in their current operating areas.
  - Connection and operating-model endpoints keep returning the full hierarchy.
  - Delete-area UX is not shipped in this slice and remains planned separately.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Production smoke confirms `/v1/connection`, `/v1/operating-model`, and the
    frontend bundle include the main area behavior.
- Result Report:
  - Added `main-general` / `00. Główny` as position `0` in the operating-area
    catalog.
  - Unclassified provider names now fall back to `main-general`; explicit
    operations and AI/Jarvis names still classify to their specific areas.
  - Existing workspaces receive the new area during `/v1/connection` and
    `/v1/operating-model` reads.
  - Updated frontend area metadata and copy from a strict 12-area model to
    `00` fallback plus 12 company departments.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, and `npm test`.

## V2WEB-019 Relationship Review Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable relationship review filters backed by
  existing provider mappings and imported Google Drive folders.
- Goal: Make `/relationships` usable as the correction surface for misplaced
  ClickUp/Drive elements by letting an operator quickly narrow the review queue
  and supporting lists without changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and source/status controls to the Relationships view.
  - Filter the review queue, provider mapping list, and Drive folder list from
    already loaded frontend state.
  - Keep existing assignment controls and update the relationship summary to
    show filtered versus loaded relationships.
  - Preserve empty states for signed-out, no data, and filtered no-match cases.
  - Validate syntax, build, tests, local browser smoke, and production smoke.
- Acceptance Criteria:
  - `/relationships` supports search across provider mapping, Drive folder,
    provider/source, entity type, and assigned area names.
  - Source/status filter supports all, needs review, provider mappings, and
    Drive folders.
  - Review queue and supporting lists update without reloading and preserve
    existing area assignment controls.
  - Summary reflects filtered relationship count and unresolved review count.
  - Responsive layout remains usable on desktop and mobile.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies relationship search, source/status filtering,
    filtered empty state, assignment control persistence, and mobile layout.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added search and source/status filters to `/relationships` for all,
    needs-review, provider mapping, and Drive folder views.
  - The review queue, provider mapping list, and Drive folder list now filter
    from existing frontend state while preserving area assignment controls.
  - Relationship summary now reports filtered count versus loaded count and
    unresolved review count.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright relationship-filter
    smoke.

## V2WEB-018 Global Module Switcher

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable module switcher in the private
  workspace topbar backed by implemented web console routes.
- Goal: Make the growing v2 web console easier to use by letting an operator
  quickly find and open existing modules, settings, and review surfaces without
  memorizing sidebar structure.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a compact search input and result menu to the private workspace
    topbar.
  - Build result rows from existing implemented routes only.
  - Include current state hints such as tasks, mappings, Drive files, selected
    ClickUp Lists, and API routes where available.
  - Support mouse selection, Enter-to-open, Escape-to-close, and filtered empty
    state.
  - Validate syntax, build, tests, desktop/mobile route rendering, and
    production smoke.
- Acceptance Criteria:
  - Signed-in users can search and open Dashboard, Areas, Relationships,
    Tasks, Pipeline, Account, Integrations, ClickUp, Drive, and API surfaces.
  - Result descriptions reflect existing frontend state and do not invent data.
  - Empty state appears when no module matches the query.
  - Keyboard Enter opens the first filtered result and Escape closes the menu.
  - Layout remains usable on desktop and mobile topbar widths.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies search, click navigation, Enter navigation, Escape
    close, empty state, and mobile layout.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a private topbar module switcher that searches implemented console
    routes and opens modules without a full page reload.
  - Result rows include existing state hints for areas, relationships, tasks,
    pipeline records, ClickUp Lists, Drive files, and API routes.
  - Keyboard support covers Enter-to-open and Escape-to-close, with filtered
    empty-state copy and mobile viewport containment.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright module-switcher smoke.

## V2WEB-017 ClickUp List Tree Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable ClickUp List selection tree backed by
  implemented ClickUp discovery data.
- Goal: Make `/settings` usable when a ClickUp Workspace has many Spaces,
  Folders, and Lists by adding local list-selection filters without changing
  ClickUp backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and selected-state controls above the ClickUp List tree.
  - Filter existing discovered ClickUp Lists client-side by Space, Folder, and
    List name.
  - Preserve existing checkbox selection, select all, clear all, save, and sync
    behavior.
  - Update list summary and empty states to distinguish no loaded Lists from no
    filter matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings` supports search across ClickUp Space, Folder, and List names.
  - Selected-state filtering shows all, selected, or unselected Lists without
    reloading.
  - Summary reflects filtered count versus loaded count and selected count.
  - Empty state explains when filters hide all loaded Lists.
  - Existing list checkbox selection and save/sync enablement still work.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies list search, selected filtering, filtered empty
    state, checkbox persistence, and save enablement on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a searchable ClickUp List filter bar in `/settings` with search
    across Space, Folder, and List names plus all/selected/unselected filters.
  - Preserved existing selected List IDs, select-all, clear, save, and sync
    enablement while updating the summary to show visible versus loaded Lists.
  - Fixed the ClickUp setup panel enabled state so `aria-disabled` matches the
    active controls for browser automation and assistive technology.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright ClickUp list filter
    smoke.

## V2WEB-016 API Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable API route workbench backed by the
  implemented adapter manifest returned by `/v1/connection`.
- Goal: Make `/settings/api` useful for agents, adapters, and internal tools by
  showing implemented API routes as searchable workbench rows instead of only
  static capability badges.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Store the existing `adapterManifest` from `/v1/connection` in frontend
    state.
  - Add search and method filters to `/settings/api`.
  - Flatten implemented adapter manifest route groups into one route workbench.
  - Preserve the existing capability badge list.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/api` supports search across route group, method, path, and
    capability.
  - Method filtering updates route rows without reloading.
  - Summary reflects filtered count versus total implemented API routes.
  - Empty state explains when filters hide all API routes.
  - Existing capability badges still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies API search, method filtering, filtered empty state,
    and capability badges on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Stored the existing `adapterManifest` from `/v1/connection` in frontend
    state.
  - Added a searchable route workbench to `/settings/api`.
  - Added method filtering for implemented API manifest routes.
  - Flattened adapter manifest route groups into readable route rows with
    method, path, group, and capability context.
  - Preserved the existing capability badge list.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified API route search, method filtering, filtered
    empty state, and capability badges on desktop.

## V2WEB-015 Google Drive Files Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable imported Drive file table backed by
  implemented Google Drive metadata.
- Goal: Make `/settings/drive` usable after importing many folders and files by
  adding local filters without changing Google Drive backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, kind, operating-area, and scan-status controls above the
    imported Drive files table.
  - Filter existing `/v1/google-drive/files` data client-side.
  - Keep Drive folder assignment selectors in the filtered table rows.
  - Update summary and empty states to distinguish no imported files from no
    filter matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/drive` supports search across file name, kind, area, scan
    status, and modified date.
  - Kind, operating-area, and scan-status filters update the table without
    reloading.
  - Summary reflects filtered count versus total imported Drive items.
  - Empty state explains when filters hide all imported Drive items.
  - Existing folder assignment selectors still render in filtered rows.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies search, kind filtering, scan filtering, filtered
    empty state, and folder assignment selectors on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added Drive file search plus kind, operating-area, and scan-status filters
    to `/settings/drive`.
  - Filtered existing `/v1/google-drive/files` data client-side without
    changing backend contracts.
  - Updated Drive file summary to show filtered count versus total imported
    Drive items.
  - Added a filter-specific empty state when no imported Drive item matches the
    current controls.
  - Preserved folder assignment selectors in filtered table rows.
  - Corrected the Google Drive panel `aria-disabled` state so signed-in filter
    controls are accessible and browser-testable.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified Drive search, folder filtering, scan filtering,
    filtered empty state, and folder assignment selectors on desktop.

## V2WEB-014 Integration Matrix Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable integration operating-area matrix
  backed by implemented workspace data.
- Goal: Make `/settings/integrations` usable as a control-map view when the
  company has many areas, mappings, Drive folders, and records.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and data-type controls to the operating-area data map.
  - Filter existing area rows client-side by area label, table names, provider
    mappings, Drive files, and record counts.
  - Keep implemented integration/data group cards visible.
  - Use the established `areaId` mapping relation when counting provider
    mappings.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/integrations` supports search across operating-area matrix rows.
  - Data-type filtering shows only rows with tables, records, mappings, or
    Drive items as selected.
  - Matrix summary reflects filtered count versus total operating areas.
  - Empty state explains when filters hide all matrix rows.
  - Existing integration group cards and "Correct mapping" link still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies matrix search, data-type filtering, filtered empty
    state, and the provider mapping count on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added integration matrix search and data-type filters to
    `/settings/integrations`.
  - Filtered existing operating-area rows client-side by area labels, table
    names, provider mappings, Drive files, and selected metric type.
  - Updated the matrix summary to show filtered count versus total operating
    areas.
  - Added a filter-specific empty state when no operating-area row matches the
    current controls.
  - Corrected provider mapping counts in the matrix by honoring the established
    `areaId` relation, with compatibility for older `operatingAreaId` and
    table-level mappings.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified matrix search, provider-mapping type filtering,
    filtered empty state, and mapping count on desktop.

## V2WEB-013 Operating Area Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable selected-area workbench feed backed by
  implemented operating model data.
- Goal: Make `/areas` easier to use as the place where owners browse one
  business area and correct provider or Drive relationships without hunting
  through separate columns.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and content-type controls to the selected area detail.
  - Normalize existing area tables, Drive files, provider mappings, and table
    record previews into one local area workbench feed.
  - Preserve existing columns and relationship assignment selectors.
  - Reuse current scope editor endpoints for Drive folders and provider
    mappings inside the workbench feed.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/areas` supports search across visible selected-area content.
  - Content-type filtering updates the selected-area workbench without reloading.
  - Summary reflects filtered count versus total selected-area workbench items.
  - Empty state explains when filters hide all selected-area items.
  - Existing area columns and assignment selectors still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies area search, type filtering, empty filtered state,
    and existing assignment selectors on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added selected-area search and content-type filters to `/areas`.
  - Added a unified area workbench feed over existing mapped tables, Drive
    items, provider mappings, and table record previews.
  - Reused current Drive and provider mapping scope editors inside the
    workbench feed so relationship correction remains available from the
    selected business area.
  - Updated selected-area summary to show filtered count versus total
    workbench items.
  - Added a filter-specific empty state when no selected-area item matches the
    current controls.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified area search, mapping type filtering, filtered
    empty state, Drive assignment selector, and provider mapping selector on
    desktop.

## V2WEB-012 Pipeline Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable shared pipeline workbench feed backed
  by implemented pipeline stage and CRM usage tables.
- Goal: Make `/pipeline` useful once shared pipeline and CRM usage records grow
  by adding a unified feed, search, and filters without adding backend
  contracts or placeholder data.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, record-type, and status controls to `/pipeline`.
  - Normalize existing `clients`, `pipeline-stages`, `deals`, and
    `interactions` records into one local workbench feed.
  - Keep the existing overview cards and type-specific lists visible.
  - Update summary and empty states to distinguish no records from no filter
    matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/pipeline` supports search across visible shared pipeline and CRM usage
    fields.
  - Record-type and status filters update the feed without reloading.
  - Summary reflects filtered count versus total implemented records.
  - Empty state explains when filters hide all pipeline records.
  - Existing pipeline overview lists still render from implemented tables.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies filters and filtered feed rows on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added pipeline search plus record-type and status filters to `/pipeline`.
  - Added a unified workbench feed normalized from existing `clients`,
    `pipeline-stages`, `deals`, and `interactions` records.
  - Updated pipeline summary to show filtered count versus total implemented
    records.
  - Added a filter-specific empty state when no pipeline record matches the
    current controls.
  - Kept the existing overview cards and type-specific lists intact.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified search, type filtering, status filtering,
    filtered empty state, and matching filtered feed rows on desktop.

## V2WEB-011 Task Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: task workbench controls for searching and
  filtering implemented task records.
- Goal: Make `/tasks-adapter` usable once ClickUp imports many tasks by adding
  local search and filters without changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, status, source, and list filters to `/tasks-adapter`.
  - Filter the existing `/v1/tasks` data client-side.
  - Update summary and empty states to distinguish no tasks from no filter
    matches.
  - Keep refresh and ClickUp settings actions in the same workbench surface.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/tasks-adapter` supports search by title/status/list/source.
  - Status, source, and task-list filters update the table without reloading.
  - Summary reflects filtered count versus total count.
  - Empty state explains when filters hide all tasks.
  - Existing task refresh still works.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies filters and filtered table rows on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added task search plus status, source, and task-list filters to
    `/tasks-adapter`.
  - Implemented client-side filtering against existing `/v1/tasks` data only.
  - Updated task summary to show filtered count versus total count.
  - Added a filter-specific empty state when no task matches the current
    controls.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified search, source filtering, empty filtered state,
    and matching filtered rows on desktop.

## V2WEB-010 Relationship Review Center

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/relationships` owner-console view
  for reviewing and correcting implemented provider and Drive area
  assignments.
- Goal: Make relationship correction a first-class workflow so owners can
  quickly move ClickUp mappings and Drive folders into the right operating
  area.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/relationships` to authenticated frontend and Express web routes.
  - Add signed-in navigation and dashboard links for relationship review.
  - Render a review queue for unmapped provider mappings and unassigned Drive
    folders.
  - Render all implemented provider and Drive relationships with existing area
    selectors.
  - Reuse existing scope update endpoints and validation.
- Acceptance Criteria:
  - Signed-in navigation includes `Relationships`.
  - `/relationships` shows a review queue when mappings or Drive folders need
    assignment.
  - Owners can use the existing area selectors from this route.
  - Empty states are clear when everything is mapped.
  - Existing `/areas` mapping controls still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/relationships`, queue rows, assignment selectors,
    and dashboard links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/relationships` to authenticated frontend and Express web routes.
  - Added sidebar, dashboard module, and next-action links to the relationship
    review center.
  - Added a review queue for unassigned provider mappings and Drive folders.
  - Added provider mapping and Drive folder lists that reuse the existing area
    selectors and scope update endpoints.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified `/relationships`, queue rows, provider rows,
    Drive rows, assignment selectors, active navigation, and dashboard links.

## V2WEB-009 Account Settings View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/settings/account` owner-console view
  for signed-in user and workspace context.
- Goal: Complete the first Settings information architecture with account,
  integrations, ClickUp, Drive, and API surfaces backed by implemented data.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/settings/account` to authenticated frontend and Express web routes.
  - Add signed-in navigation and settings links to account settings.
  - Render user, workspace, session, and integration readiness using existing
    connection state only.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Account`.
  - `/settings/account` renders owner and workspace context after sign-in.
  - Account settings link to implemented integration and API settings routes.
  - Existing settings routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/settings/account`, account cards, and settings
    links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/account` to the authenticated frontend route list, signed
    in navigation, topbar actions, dashboard actions, and Express web app route
    allowlist.
  - Rendered owner name/email, workspace name/id, session readiness, and links
    to implemented settings surfaces using existing connection state.
  - Updated connection hydration so the owner user returned by `/v1/connection`
    is available after direct route refresh.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified `/settings/account`, owner/workspace cards,
    readiness links, and active navigation on desktop.

## V2WEB-008 Dashboard Command Center

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dashboard command-center polish that surfaces
  attention items, module counts, and the next recommended action from
  implemented data.
- Goal: Make the signed-in landing screen immediately usable as the company
  control point instead of a static link hub.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a dashboard attention panel that uses existing task, Drive,
    integration, and mapping state.
  - Add live module metadata to dashboard module links.
  - Add a recommended next action message based on implemented readiness gaps.
  - Keep all actions linked to existing routes.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Dashboard explains what matters now after sign-in.
  - Attention items are data-driven and have links to existing implemented
    routes.
  - Module links show useful counts rather than generic descriptions only.
  - The next action updates when ClickUp, Drive, mapping, task, or pipeline data
    is available.
  - Existing module routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies dashboard attention items, module metadata, and
    route links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a dashboard command-center attention panel driven by existing
    ClickUp, Drive, task, pipeline, and operating-model state.
  - Added live module metadata to dashboard links for areas, tasks, pipeline,
    Drive, ClickUp, and integration taxonomy.
  - Added a recommended next action that prioritizes connection gaps, unmapped
    provider mappings, unassigned Drive folders, due tasks, and empty pipeline
    data.
  - Kept every action linked to an existing implemented route.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified dashboard attention items, module metadata,
    next-action copy, active navigation, and route links on desktop.

## V2WEB-007 Dedicated Pipeline View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/pipeline` owner-console route that
  reuses implemented CompanyCore shared pipeline and CRM usage tables.
- Goal: Add the first pipeline module surface using existing clients,
  pipeline stages, deals, and interactions data without adding new backend
  behavior.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/pipeline` to authenticated web routes and signed-in navigation.
  - Render shared pipeline and CRM usage summary cards from existing database
    snapshots.
  - Render compact lists for stages, deals, clients, and interactions.
  - Link dashboard and integration taxonomy to the implemented pipeline view.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Pipeline`.
  - `/pipeline` renders existing implemented shared pipeline and CRM usage
    records.
  - Empty states are clear when no shared pipeline or CRM usage records exist.
  - No placeholder provider integration or unimplemented pipeline write flow is
    introduced.
  - Existing `/settings/integrations`, `/tasks-adapter`, `/areas`, and
    settings routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/pipeline`, summary cards, record lists, and
    dashboard links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/pipeline` to the authenticated frontend route list, signed-in
    navigation, dashboard links, integration taxonomy links, and Express web
    app route allowlist.
  - Added pipeline summary cards for clients, stages, deals, and interactions
    using existing CompanyCore table snapshots.
  - Added compact lists for implemented pipeline stages, deals, clients, and
    interactions with clear empty states.
  - Introduced no new backend contracts, provider integrations, or unimplemented
    write flows.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/pipeline`, summary cards, record lists,
    active navigation, and dashboard links.

## V2WEB-006 Settings Integration Taxonomy View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/settings/integrations` owner-console
  route that groups already implemented integrations and data paths by data
  type and company operating area.
- Goal: Make Settings usable as a control center for implemented integrations
  without adding unimplemented provider behavior or changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/settings/integrations` to authenticated web routes and navigation.
  - Render implemented integration/data groups for tasks, Drive files, API
    capabilities, and pipeline/CRM data.
  - Render an operating-area matrix showing existing tables, provider mappings,
    and Drive files per area.
  - Link each group to the already implemented module/configuration route.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes an integration taxonomy entry.
  - `/settings/integrations` shows only implemented data paths.
  - Integration groups link to existing routes instead of placeholder pages.
  - The area matrix reflects the current operating model and imported Drive or
    provider mapping data.
  - Existing `/settings`, `/settings/drive`, `/settings/api`,
    `/tasks-adapter`, and `/areas` routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/settings/integrations` and dashboard links render
    on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/integrations` to the authenticated frontend route list,
    signed-in navigation, dashboard module links, and Express web app route
    allowlist.
  - Added integration group cards for implemented task, Drive, pipeline/CRM,
    and API data paths only.
  - Added an operating-area matrix that summarizes implemented tables,
    database records, provider mappings, and Drive records per area.
  - Linked every group to an existing implemented route instead of a
    placeholder module.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/settings/integrations`, active
    navigation, integration cards, area rows, and dashboard links.

## V2WEB-005 Dedicated Tasks Adapter View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/tasks-adapter` owner-console route that
  reuses the implemented `/v1/tasks` data path and keeps dashboard as a
  summary/navigation surface.
- Goal: Move task and ClickUp adapter data toward the target module
  architecture without inventing new backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/tasks-adapter` to authenticated web routes and signed-in navigation.
  - Move the existing implemented task table out of dashboard into the new
    route.
  - Add compact task summary cards for total, ClickUp, open, and due-soon
    records.
  - Keep links back to ClickUp settings so adapter configuration remains
    discoverable.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Tasks & adapters`.
  - `/tasks-adapter` renders the implemented task records from `/v1/tasks`.
  - Dashboard links to `/tasks-adapter` but no longer owns the task table
    surface.
  - Direct refresh of `/tasks-adapter` returns the SPA shell.
  - Legacy API `/tasks` remains protected API-compatible.
  - Task table rendering does not inject provider-controlled fields as HTML.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/tasks-adapter` and `/dashboard` render on
    desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/tasks-adapter` to the authenticated frontend route list and Express
    web app route allowlist.
  - Moved the implemented task table out of the dashboard into a dedicated
    Tasks & adapters view.
  - Added total, ClickUp, open, and due-soon task stat cards.
  - Preserved legacy protected API `/tasks` by avoiding a web route collision;
    the GUI reads the implemented `/v1/tasks` endpoint.
  - Replaced provider-controlled task table HTML injection with text-node cell
    rendering.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/tasks-adapter` route rendering,
    active navigation, task rows, summary stats, and dashboard module links.

## V2WEB-004 Dedicated Operating Areas View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/areas` owner-console route that
  reuses the existing operating-map data and manual mapping controls without
  changing backend contracts.
- Goal: Move the 12-area company operating map toward the target information
  architecture by giving operating areas their own module view while keeping
  the dashboard focused on summary and navigation.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/areas` to the authenticated web route allowlist and signed-in
    navigation.
  - Move the existing operating-map panel into a dedicated `/areas` view,
    preserving all DOM IDs used by current render and mapping logic.
  - Replace the dashboard embedded map with a concise module launch panel that
    links to the new route.
  - Validate JavaScript syntax, build, integration tests, and desktop/mobile
    route rendering.
- Acceptance Criteria:
  - Signed-in navigation includes `Operating areas` as its own route.
  - `/areas` renders the existing 12-area operating map and manual mapping
    controls.
  - Dashboard remains a summary surface with a clear link to `/areas`.
  - Existing `/settings`, `/settings/drive`, and `/settings/api` routes still
    render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/dashboard` and `/areas` render on desktop and
    mobile.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/areas` to the authenticated frontend route list and Express web
    app route allowlist.
  - Moved the existing operating map into a dedicated Operating Areas view
    without changing backend contracts or duplicating mapping logic.
  - Replaced the dashboard embedded map with a module launch panel linking to
    Operating Areas, ClickUp settings, and Google Drive.
  - Preserved the existing manual provider/Drive area selectors because the
    original operating-map DOM IDs remain single-owner in the new route.
  - Verified direct `/areas` refresh returns `index.html` instead of falling
    through to protected API auth.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/areas`, desktop `/dashboard`, and
    mobile sidebar behavior.

## V2WEB-002 Manual Provider Scope Mapping

- Task Type: frontend/backend-integration
- Current Stage: done
- Deliverable For This Stage: editable provider-to-operating-area mapping in
  the owner web console, with API support for ClickUp mappings and Google Drive
  folders.
- Goal: Let the operator correct automatic integration mapping so ClickUp
  Lists/Folders/Spaces and Google Drive parent folders can be assigned to the
  right company area after import.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `src/modules/google-drive/google-drive.routes.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/operating-model/clickup-structure.ts`
  - `src/tests/api.test.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add owner API endpoints for updating an external provider mapping scope and
    a Google Drive file/folder scope.
  - Preserve manual ClickUp area overrides during future structure refreshes.
  - Persist Google Drive folder-to-area mappings in integration settings so
    future imports keep the selected area.
  - Add compact area selectors in the dashboard provider mapping and Drive
    folder lists.
  - Cover the new manifest capabilities, ClickUp mapping scope update, and
    Drive folder descendant update in integration tests.
- Acceptance Criteria:
  - An owner can move a ClickUp List mapping to another operating area.
  - The linked ClickUp operating table moves with the mapping.
  - Future ClickUp structure refreshes preserve the manual area override.
  - An owner can move a Google Drive folder to another operating area.
  - Existing Drive descendants move with the folder and the folder mapping is
    persisted for future imports.
  - Jarvis/Paperclip can discover the new write capabilities through
    `/v1/connection`.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Dashboard controls use the existing operating-map design system.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `PATCH /v1/operating-model/external-mappings/:id/scope`.
  - Added `PATCH /v1/google-drive/files/:id/scope`.
  - Added adapter manifest capabilities for provider mapping writes and Drive
    file scope writes.
  - Added dashboard selectors for ClickUp provider mappings and Google Drive
    folders.
  - ClickUp manual area overrides are stored in mapping raw data and table
    sync policy, then preserved during structure refreshes.
  - Google Drive folder area choices update descendants and persist an
    `operatingScopeMappings` entry for future imports.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.

## V2WEB-001 Operating Map And Google Drive Console

- Task Type: frontend/backend-routing
- Current Stage: done
- Deliverable For This Stage: owner web console that exposes the 12 company
  areas, mapped CompanyCore tables, live database counts, ClickUp/Drive
  provider mappings, and Google Drive connection actions.
- Goal: Let an owner see how CompanyCore is filling the company database after
  ClickUp and Google Drive are connected.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add `/settings/drive` to the web app route allowlist.
  - Extend the dashboard with a 12-area company operating map that follows the
    provided folder-style visual reference.
  - Read `/v1/connection`, `/v1/operating-model`, `/v1/tasks`, and
    `/v1/google-drive/files` into one dashboard state.
  - Show CompanyCore table counts, provider mappings, Drive files, and record
    previews per operating area.
  - Add a Google Drive settings screen for OAuth URL generation, authorization
    code exchange, folder import, change reconciliation, and imported-file
    review.
  - Keep raw tokens and API keys out of UI output and docs.
- Acceptance Criteria:
  - Owner dashboard shows all 12 company areas.
  - Selecting an area updates tables, Drive files, mappings, and database
    preview without a page reload.
  - Google Drive settings support OAuth URL generation, code exchange, import,
    reconcile, and file refresh actions.
  - The web app can deep-link to `/settings/drive`.
  - Build and tests pass.
- Definition of Done:
  - `git diff --check`, `npm run build`, and `npm test` pass.
  - Browser smoke verifies dashboard and Drive settings render.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/drive` to the web app route allowlist and top navigation.
  - Added a dashboard operating map with 12 company areas in the operator's
    folder order: Strategy, Product, Sales, Operations, Relationships, People,
    Finance, Assets, Technology, Legal, Innovation, and Management.
  - Dashboard now combines the operating model, table counts, provider
    mappings, Drive files, and record previews from protected CompanyCore APIs.
  - Added Google Drive settings UI for OAuth URL generation, authorization-code
    exchange, folder import, change reconciliation, file refresh, and imported
    file review.
  - Verified desktop and mobile browser rendering with Playwright screenshots.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Deployed to production as backend image
    `rnqqkhl3o3dut4qv56mlxly2_backend:6b4d57a6e98159e64d9f065427e7201238b47ab5`.
  - Production public smoke passed for `/health`, `/v1/health`, web root, and
    `/settings/drive`.
  - Production protected smoke returned workspace `LuckySparrow`, 12 operating
    areas, 47 capabilities, Google Drive unconfigured, and 0 imported Drive
    files.
