# UX100-W03 Relationship/Data Provenance And AI Safety Labels

## Header
- ID: UX100-W03
- Title: Relationship/Data Provenance And AI Safety Labels
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: UX100-W02
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Web authenticated shell and data/relationship workbenches
- Requirement Rows: UX100-S031, UX100-S032, UX100-S037, UX100-S041, UX100-S045, UX100-S049
- Quality Scenario Rows: usability, accessibility, AI-context safety, responsive layout
- Risk Rows: AI context trust, relationship confidence ambiguity, data provenance ambiguity
- Iteration: UX100 wave 03
- Operation Mode: BUILDER
- Mission ID: UX100-W03
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the active UX100 implementation wave.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by making AI/data trust visible.

## Mission Block
- Mission objective: make relationship confidence, record provenance, and AI context readiness visible across the relationship and data workbenches.
- Release objective advanced: improve the web foundation so owners and AI/MCP operators can understand what is trustworthy before V2 visual expansion.
- Included slices: `/relationships`, `/data`, `/data/:slug`, shared provenance badge CSS, documentation and state updates.
- Explicit exclusions: new database tables, new graph-write behavior, fake relationship data, V2 Company City or mobile app work.
- Checkpoint cadence: implement one cohesive UI slice, then run static, API, browser, and cleanup validation.
- Stop conditions: architecture mismatch, data provenance cannot be derived from existing state, or validation failure that cannot be fixed safely in scope.
- Handoff expectation: leave UX100-W04 as the next executable task after evidence is recorded.

## Context
UX100-W01 and UX100-W02 improved first-viewport decision clarity and route-level next actions. The next usability gap is trust: owners can see rows and graph edges, but the UI does not consistently explain source, confidence, review status, or whether a record/relationship is safe for AI-assisted use.

## Goal
Add clear provenance and AI-safety labels to relationship and data surfaces so the user can quickly answer: what created this item, how trustworthy is it, what is blocked, and whether AI can use it as context.

## Scope
- `public/relationship-workbench.js`
- `public/app.js`
- `public/styles.css`
- `docs/planning/ux100-w03-relationship-data-provenance-task-contract.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `.agents/state/module-confidence-ledger.md`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/design-memory.md`

## Implementation Plan
1. Inspect current relationship graph rows, data index rows, table brief, record row, and inspector rendering.
2. Add provenance helpers that derive labels from existing confidence, source, route, editor, area, and record metadata.
3. Render compact badges in relationship rows, review queues, data index rows, table context, record rows, and inspector header.
4. Add responsive CSS that preserves mobile/tablet/desktop layout and avoids clipping or overflow.
5. Validate public JS, full validate gate, API tests, browser route proof, cleanup, and state docs.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Relationship rows show confidence but not source meaning or AI-safe state. Data rows show source names but not provenance quality or AI-readiness.
- Gaps: `/data` lacks business meaning around why a module is safe or not safe for agent context. Record inspector lacks a persistent provenance summary.
- Inconsistencies: Direct, provider-derived, route-inferred, review, and unsupported relationship families are known in the graph model but not equally visible in UI.
- Architecture constraints: reuse existing graph/read APIs, operating model state, table catalog, and shared shell. Do not create new relation storage.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `.agents/core/project-memory-index.md`, `.agents/state/next-steps.md`, `.codex/context/TASK_BOARD.md`, `public/relationship-workbench.js`, `public/app.js`, `public/styles.css`
- Rows created or corrected: pending final documentation update
- Assumptions recorded: source and AI-safety labels are derived presentation state, not new authority.
- Blocking unknowns: none
- Why it was safe to continue: current graph and table state already contains confidence, source, route, editor, and review signals.

### 2. Select One Priority Mission Objective
- Selected task: UX100-W03 Relationship/Data Provenance And AI Safety Labels.
- Priority rationale: it directly reduces user confusion and AI context risk after route command clarity was added.
- Why other candidates were deferred: pipeline/task pressure summaries depend on this trust vocabulary being stable first.

### 3. Plan Implementation
- Files or surfaces to modify: relationship workbench, data operations, table workbench, shared CSS, planning/state docs.
- Logic: derive labels from existing runtime state; show safe/review/blocked tones consistently.
- Edge cases: signed-out state, empty data tables, unsupported graph families, unmapped areas, read-only modules, no API route modules.

### 4. Execute Implementation
- Implementation notes: added relationship provenance helpers and badges in
  `public/relationship-workbench.js`; added data/record provenance and
  table AI-readiness helpers in `public/app.js`; added shared provenance badge
  and AI safety tone styles in `public/styles.css`.

### 5. Verify and Test
- Validation performed: `npm run check:public-js`, `npm run validate`,
  `git diff --check`, `npm run test:api` on portable PostgreSQL
  `localhost:55475`, and Playwright fallback browser proof on
  `http://127.0.0.1:3122`.
- Result: all checks passed.

### 6. Self-Review
- Simpler option considered: show only confidence badges in relationships and
  source text in records. Rejected because it did not answer whether AI can use
  the context safely.
- Technical debt introduced: no
- Scalability assessment: labels are derived from existing state and can be
  reused by future integration/MCP/Company City surfaces.
- Refinements made: replaced raw backend model names in the primary
  provenance badges with owner-facing labels such as `Provider mapping` and
  `Google Drive file`.

### 7. Update Documentation and Knowledge
- Docs updated: task contract, design memory, planning queue.
- Context updated: task board, project state, next steps, system health, module
  confidence ledger.
- Learning journal updated: yes, Playwright cleanup verification pitfall.

## Acceptance Criteria
- [x] `/relationships` explains relationship source, confidence meaning, and AI-safe/review/blocked status for graph rows and review queue rows.
- [x] `/data` and `/data/:slug` show per-module, per-table, and per-record provenance/readiness labels derived from existing state.
- [x] Labels are usable on desktop, tablet, and mobile without overflow, clipping, or unnamed interactive controls.
- [x] Existing data and relationship behavior still passes static, API, and browser validation.

## Success Signal
- User or operator problem: owners cannot tell which records and relationships are trustworthy for AI-assisted company management.
- Expected product or reliability outcome: AI-context trust is visible before V2 gamified UX expansion.
- How success will be observed: browser proof shows provenance and AI safety labels across relationship/data routes.
- Post-launch learning needed: yes

## Deliverable For This Stage
Implemented and verified UI provenance labels plus updated canonical task/state evidence.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- no placeholders, mock-only paths, or temporary solutions in delivered behavior
- all repository artifacts must be in English

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across UI state and API-backed records.
- [x] No existing functionality is broken.
- [x] Feature works after navigation refresh where applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches implementation and verification stage expectations.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run check:public-js`, `npm run validate`, `git diff --check`,
  `npm run test:api`.
- Manual checks: Playwright fallback verified `/relationships`, `/data`,
  `/data/tasks`, and `/data/clients` at desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844`.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux100w03-verified\report.json`,
  `desktop-relationships.png`, and `mobile-data-tasks.png`.
- High-risk checks: browser proof reported `badCount=0`, `consoleIssues=0`,
  `failedRequests=0`, no horizontal overflow, zero unnamed visible controls,
  and provenance/AI labels present. Post-proof cleanup found and stopped four
  leftover validation-owned `chrome-headless-shell` processes.
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: UX100-W03 added as `VERIFIED`.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- Loading state verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes
- Regression check performed: static, build, API, and browser route proof.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: existing implemented CompanyCore authenticated shell and UX100 audit plan
- Canonical visual target: structurally faithful continuation of the W01/W02 command-shell style
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes
- Primary user question answered within 3 seconds: yes, provenance and
  AI-readiness badges appear in the first visible rows/context panels.
- Next action visibility: yes
- Blocked-state visibility: yes
- Experience-quality bar reviewed: yes
- Visual-direction brief reviewed: yes
- Existing shared pattern reused: route command strip, workbench context cards, compact badges, record rows
- New shared pattern introduced: yes, provenance and AI-readiness badges.
- Design-memory update required: yes
- Anti-patterns checked: yes
- Screen-quality checklist reviewed: yes
- Surface strategy checked: mobile | tablet | desktop
- State checks: loading | empty | error | success
- Feedback locality checked: yes
- Raw technical errors hidden from end users: not applicable
- Responsive checks: desktop, tablet, mobile
- Input-mode checks: touch, pointer, keyboard focusability smoke through
  unnamed-control audit
- Accessibility checks: visible labels, no unnamed visible controls, badge
  groups use `aria-label`
- Parity evidence: Playwright report under
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux100w03-verified`.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: yes
- Memory consistency scenarios: provenance labels distinguish source and safety.
- Multi-step context scenarios: route proof covered relationship graph,
  data index, table workbench, record row, and inspector contexts.
- Adversarial or role-break scenarios: labels do not grant new AI authority.
- Prompt injection checks: labels do not trust or render external content as
  authority; no new AI execution path was added.
- Data leakage and unauthorized access checks: unchanged private-route and API
  auth boundaries; browser proof used signed-in owner context.
- Result: passed for UI safety-label scope.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: workspace operational metadata
- Trust boundaries: UI labels do not bypass workspace auth or API scopes.
- Permission or ownership checks: unchanged existing private routes and API auth.
- Abuse cases: avoid labeling review/unsupported data as AI-safe.
- Secret handling: no secret changes.
- Fail-closed behavior: unsupported and review items remain blocked/review tone.
- Residual risk: production signed-in route proof remains optional after the
  next deploy; no local product risk remains.

## Deployment / Ops Evidence
- Deploy impact: low
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: task board and system health record the browser proof.
- Rollback note: revert this UI/docs commit.
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: pending

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Current stage is declared and respected.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Relevant validations were run.
- [x] Docs or context were updated.

## Result Report
- Task summary: implemented provenance and AI readiness labels across
  relationship and data workbenches.
- Files changed: `public/relationship-workbench.js`, `public/app.js`,
  `public/styles.css`, task/state/planning/UX docs.
- How tested: static public JS check, full validate build, API tests against
  portable PostgreSQL, diff check, and Playwright desktop/tablet/mobile route
  proof.
- What is incomplete: production signed-in proof is optional after deploy.
- Next steps: UX100-W04 Tasks/Pipeline Operating Pressure Summaries.
- Decisions made: provenance labels are derived UI state, not new authority or
  schema; review/unsupported context remains not AI-safe.

## Notes
Untracked V1 canonical dashboard planning and image artifacts were present before this task and are intentionally excluded from this UX100-W03 scope.
