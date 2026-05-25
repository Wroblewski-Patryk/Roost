# Task

## Header
- ID: ASSETS-FILES-PREMIUM-005
- Title: Assets files and folders premium workbench audit and polish
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: ASSETS-IMAGE-PREVIEW-004
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: ASSETS-FILES-PREMIUM-005
- Requirement Rows: REQ-ASSETS-FILES-PREMIUM-005
- Quality Scenario Rows: QA-ASSETS-FILES-PREMIUM-005
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-06
- Operation Mode: BUILDER
- Mission ID: MISSION-ASSETS-FILES-PREMIUM-005
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the operating-system startup path.
- [x] Missing or template-like state tables were not blocking this scoped UI task.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: audit and improve `08 Assets -> Files and folders` so browsing, filtering, and inspecting resources feels clearer and faster.
- Release objective advanced: make the active `00 -> 04 -> 08` operating loop more usable for daily company work.
- Included slices: UX audit, type filter rail, visible scope summary, card path context, folder tree icon clarity, rendered proof.
- Explicit exclusions: backend schema changes, new provider sync behavior, non-text media editors, raw table editing, broad route redesign.
- Checkpoint cadence: one implementation checkpoint followed by validation and state updates.
- Stop conditions: build failure, architecture mismatch, or rendered proof failure.
- Handoff expectation: next work can continue with real-data production smoke or deeper folder/file command contracts.

## Context
`08 Assets -> Files and folders` already has root-folder filtering, a folder tree, resource cards, inline previews, Drive image preview routing, folder editing, and text content editing. The owner wanted a premium audit pass that makes the panel more useful and intuitive without adding clutter.

## Goal
Improve the existing Assets files/folders workbench so the user can understand the active scope, narrow content by type quickly, and keep folder location context visible while browsing.

## Scope
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- Source-of-truth state and planning docs for this task

## Implementation Plan
1. Inspect the current workbench, shared selector, i18n, and UX contracts.
2. Add a compact reusable type-filter rail inside the Assets workbench using the existing packet data.
3. Add visible count context and folder path context without adding decorative counters.
4. Improve resource cards and folder tree rows so file type and folder location are easier to scan.
5. Validate with web build, global validation, diff hygiene, and rendered proof.
6. Update state docs and commit/push if validation passes.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues:
  - File type filtering was hidden in a select, which was slower than one-click filtering for common resource types.
  - The main panel only said how many items were visible, but not whether that was the full current scope or a narrowed subset.
  - Cards did not show the parent folder path, so search results from different folders lost context.
  - Folder tree file icons used one muted tone even when the preview type was known.
- Gaps:
  - No fast type affordance for images, Markdown, CSV, JSON, PDF, and folders.
  - Limited at-a-glance orientation after root folder or folder-tree filtering.
- Inconsistencies:
  - Preview panel had path context, but resource cards did not.
  - Asset type semantics existed in code, but the primary filter did not expose them as direct actions.
- Architecture constraints:
  - CompanyCore remains a system used by humans and AI through UI/API/MCP; this task must not add embedded AI behavior or raw database editing.
  - Use Tailwind/DaisyUI, Roost/CompanyCore tokens, and existing shared primitives before creating new patterns.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: `.agents/core/project-memory-index.md`, `docs/ux/design-system-contract.md`, `docs/ux/experience-quality-bar.md`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`
- Rows created or corrected: REQ-ASSETS-FILES-PREMIUM-005, QA-ASSETS-FILES-PREMIUM-005, ASSETS-FILES-PREMIUM-005 evidence
- Assumptions recorded: the current `/v1/assets/context` packet remains the source of truth for this UI.
- Blocking unknowns: none
- Why it was safe to continue: the task only changes presentation and filtering over existing data.

### 2. Select One Priority Mission Objective
- Selected task: ASSETS-FILES-PREMIUM-005
- Priority rationale: this is the active owner-requested module polish for a core `08 Assets` journey.
- Why other candidates were deferred: deeper sync, provider commands, and media editors need separate backend/API contracts.

### 3. Plan Implementation
- Files or surfaces to modify: Assets React route, i18n messages, task/state docs.
- Logic: derive type counts from the current scoped resources before type filtering; reuse the existing preview kind classifier.
- Edge cases: empty filters, selected resource hidden by filters, root folder selection, mobile wrapping, image preview fallback.

### 4. Execute Implementation
- Implementation notes: Added `AssetTypeFilterRail` with scoped type counts, changed the main Assets list to derive type counts before type filtering, added visible `{visible} of {total}` scope copy, added folder-path context to resource cards, and made folder-tree file icons use the same preview-type tones as cards/previews.

### 5. Verify and Test
- Validation performed: `npm run build:web`, `npm run validate`, `git diff --check`, and Playwright fallback rendered proof on temporary port `3396`.
- Result: passed. The rendered proof opened `08 Assets -> Files and folders`, clicked `Images`, verified one image card with `Company Drive / Brand system` path context, verified authenticated image preview rendering, clicked `Markdown`, verified Markdown preview text, confirmed zero-count type filters are hidden, and checked desktop/mobile no horizontal overflow and no console/page errors.

### 6. Self-Review
- Simpler option considered: keeping the select only; rejected because the owner asked for a premium, faster daily-use workbench.
- Technical debt introduced: no
- Scalability assessment: the type rail is local to Assets but built from the same typed resource model and can become a shared pattern later if another module needs it.
- Refinements made: Removed the horizontal-scroll-only type rail after screenshot review showed hidden controls, then hid zero-count type chips to reduce dead-option clutter.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract, requirements matrix, quality scenarios, risk register, module confidence ledger, system health, project memory, project state, task board, and next steps.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] Assets files/folders has fast one-click type filters with accessible labels and visible active state.
- [x] The main workbench tells the user how many resources are visible inside the current scope.
- [x] Resource cards preserve folder/path context while staying compact.
- [x] Folder tree file icons reflect the resource preview type.
- [x] Web build, validation, diff hygiene, and rendered proof pass.

## Success Signal
- User or operator problem: browsing Drive-imported resources feels slower and less obvious than it should.
- Expected product or reliability outcome: the user can narrow and inspect files without losing context.
- How success was observed: rendered proof showed the route, filter interaction, selected image preview, Markdown preview, and responsive layout without runtime errors.
- Post-launch learning needed: yes, production smoke with real Drive data after deploy.

## Deliverable For This Stage
Implemented and verified UI polish slice for `08 Assets -> Files and folders`.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the rendered UI path.
- [x] No mock, placeholder, fake, or temporary data/path remains in delivered behavior.
- [x] Existing data flow stays on `/v1/assets/context` and authenticated preview routes.
- [x] UI/client error handling remains intact.
- [x] No existing functionality is broken.
- [x] Feature works after reload/navigation refresh where applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from validation evidence.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run build:web` passed; `npm run validate` passed; `git diff --check` passed with line-ending warnings only.
- Manual checks: Playwright fallback route proof passed on `http://127.0.0.1:3396/areas?area=08-zasoby&view=files`.
- Screenshots/logs: screenshots saved outside the repo at `C:\Users\wrobl\AppData\Local\Temp\assets-files-premium-desktop.png` and `C:\Users\wrobl\AppData\Local\Temp\assets-files-premium-mobile.png`.
- High-risk checks: no horizontal overflow on desktop `1440x900` or mobile `390x844`; no console/page errors; no backend/provider write behavior added.
- Coverage ledger updated: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: ASSETS-FILES-PREMIUM-005
- Requirements matrix updated: yes
- Requirement rows closed or changed: REQ-ASSETS-FILES-PREMIUM-005
- Quality scenarios updated: yes
- Quality scenario rows closed or changed: QA-ASSETS-FILES-PREMIUM-005
- Risk register updated: yes
- Risk rows closed or changed: RISK-WEB-DENSE-WORKBENCH-001
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: rendered proof uses a mocked already-existing `/v1/assets/context` packet; production smoke remains separate
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable for this UI polish
- Error state verified: not applicable for this UI polish
- Refresh/restart behavior verified: yes, rendered proof reloaded the route in mobile viewport and repeated the image filter interaction.
- Regression check performed: build, validate, diff hygiene, and rendered desktop/mobile route proof.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner using `08 Assets -> Files and folders`
- Existing workaround or pain: select-only type filtering and card context loss while browsing.
- Smallest useful slice: improve filtering/orientation without backend changes.
- Success metric or signal: faster selection of images/docs/tables and clear context in rendered proof.
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: production real-data smoke after deploy

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable for a narrow follow-up polish
- Feedback item IDs: owner feedback 2026-05-17
- Feedback accepted: improve files/folders UX/UI toward a premium workbench
- Feedback needs clarification: none
- Feedback conflicts: none
- Feedback deferred or rejected: deeper backend sync/media editors remain separate tasks
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: authenticated owner opens `08 Assets -> Files and folders`, filters resources, selects a file, and sees preview/context.
- SLI: route renders without app errors and controls update visible state.
- SLO: not applicable
- Error budget posture: not applicable
- Health/readiness check: build and validation passed
- Logs, dashboard, or alert route: not applicable
- Smoke command or manual smoke: Playwright fallback rendered proof passed
- Rollback or disable path: revert the UI commit

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable; no AI feature added.
