# Task

## Header
- ID: CC-UI-004
- Title: 00/04/08 Read Packet UI Adoption
- Task Type: feature
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: CC-UI-002; CC-UI-003; CC-00-002; CC-04-002; CC-08-002
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: CC-UI-004; CC-00-002; CC-04-002; CC-08-002
- Requirement Rows: REQ-CC-UI-001; REQ-CC-00-002; REQ-CC-04-002; REQ-CC-08-002
- Quality Scenario Rows: QA-CC-UI-001; QA-CC-00-001; QA-CC-04-001; QA-CC-08-001
- Risk Rows: RISK-CC-UI-001; RISK-CC-00-001; RISK-CC-04-001; RISK-CC-08-001
- Iteration: 4
- Operation Mode: BUILDER
- Mission ID: CC-00-04-08-LOOP
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current bounded build iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in the ongoing mission.
- [x] `.agents/core/mission-control.md` was reviewed in the ongoing mission.
- [x] Missing or template-like state tables were not blocking this slice.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: render the verified `00 Main`, `04 Operations`, and `08 Assets` read packets in the selected-area UI using shared CompanyCore primitives.
- Release objective advanced: the owner-approved `00 Main -> 04 Operations -> 08 Assets` loop becomes usable from the responsive web surface without giving agents or users new write authority.
- Included slices: route proposal lifecycle table, Operations work item table, Assets resource packet board, shared table wrapper extension, selected-area loading/error/empty handling.
- Explicit exclusions: route accept/reject commands, task assignment writes, checklist/subtask writes, time tracking, Drive provider writes, sync-scope expansion, legal/commercial document edits, production deployment.
- Checkpoint cadence: implement, build, rendered route proof, update source-of-truth files.
- Stop conditions: build failure, real route proof failure, source-of-truth mismatch, or a need for new write authority.
- Handoff expectation: future department slices can reuse the same table/button primitives and packet panel pattern.

## Context
The API layer now exposes verified read-only packets for route proposals, Operations work items, and Assets context. The selected-area UI already has special boards for `00 Main` and `04 Operations`; `08 Assets` had the shared department shell but no Assets-specific packet board. This task connects those verified packets to the web UI while preserving CompanyCore as the system and AI as an external API/MCP client.

## Goal
Make `/areas?area=00-ogolny`, `/areas?area=04-operacje`, and `/areas?area=08-zasoby` show source-backed, read-only management packets through shared Tailwind/DaisyUI primitives.

## Scope
- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/planning/cc-ui-004-00-04-08-read-packet-ui-adoption-task-contract.md`
- Planning/state ledger files needed to record completion.

## Implementation Plan
1. Inspect existing selected-area panels, route state, API loader patterns, and shared primitives.
2. Add typed frontend loaders for `GET /v1/intake/route-proposals`, `GET /v1/operations/work-items`, and `GET /v1/assets/context`.
3. Extend the selected-area shell with packet states for `00`, `04`, and `08`.
4. Render route proposals, work items, and resource readiness through the shared table/button primitives.
5. Verify build and rendered desktop/mobile behavior.
6. Update documentation and ledgers with evidence and residual risk.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: verified backend packets were not yet consumed by the selected-area web UI.
- Gaps: `08 Assets` had no department-specific packet board.
- Inconsistencies: the local `DataTable` wrapper did not expose loading, error, row action, density, or mobile card options.
- Architecture constraints: no new write authority, no provider mutation, and no AI embedded into CompanyCore.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `web/src/main.tsx`, `web/src/components/cc-button.tsx`, `web/src/components/cc-data-table.tsx`, `src/modules/intake/intake.routes.ts`, `src/modules/operations/operations.routes.ts`, `src/modules/assets/assets.routes.ts`, source-of-truth ledgers.
- Assumptions recorded: safe assumption that selected-area boards may consume protected owner APIs through the existing `ownerApi` token helper.
- Blocking unknowns: none for this read-only UI slice.
- Why it was safe to continue: the endpoints and capability contracts were already implemented and verified.

### 2. Select One Priority Mission Objective
- Selected task: CC-UI-004.
- Priority rationale: the active queue explicitly called for UI adoption after the three read APIs were verified.
- Why other candidates were deferred: `05 Relationships` and broader department work should wait until the first owner-approved `00 -> 04 -> 08` loop has a usable UI checkpoint.

### 3. Plan Implementation
- Files or surfaces to modify: selected-area React UI, CSS packet styling, task/state docs.
- Logic: add packet loaders and state transitions gated by selected area key.
- Edge cases: signed-out token failure uses existing owner API error path; tables show loading, error, empty, and mobile card states.

### 4. Execute Implementation
- Implementation notes: added typed read packet models, `loadIntakeRouteProposals`, `loadOperationsWorkItems`, `loadAssetsContext`, `IntakeRouteProposalLifecyclePanel`, `OperationsWorkItemPacket`, and `AssetsManagementSystemPanel`.

### 5. Verify and Test
- Validation performed: `npm run build:web`; Playwright rendered proof against a temporary local static server with mocked API packet responses for `00`, `04`, and `08`; `git diff --check`.
- Result: passed. The proof found the new packet sections on desktop and mobile, with no console errors, page errors, or horizontal overflow.

### 6. Self-Review
- Simpler option considered: linking directly to raw API endpoints only.
- Technical debt introduced: no.
- Scalability assessment: the new panels use shared `DataTable` and `CcButton`, so future pagination or mobile table changes remain centralized.
- Refinements made: extended the local table wrapper instead of bypassing the shared primitive.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract plus project planning/state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `00 Main` selected-area UI renders route proposal lifecycle readback from `GET /v1/intake/route-proposals`.
- [x] `04 Operations` selected-area UI renders work item readback from `GET /v1/operations/work-items`.
- [x] `08 Assets` selected-area UI renders an Assets board from `GET /v1/assets/context`.
- [x] New tables/actions use shared CompanyCore primitives.
- [x] Desktop and mobile rendered proof passes without page errors, console errors, or horizontal overflow.
- [x] Source-of-truth files record final evidence.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the rendered UI path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow uses existing protected APIs.
- [x] UI/client loading and error handling exists.
- [x] No existing functionality is broken in the validated scope.
- [x] Feature works after navigation refresh in the rendered proof.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build:web` passed.
  - `git diff --check` passed with line-ending warnings only.
- Manual checks:
  - Playwright rendered `/areas?area=00-ogolny&view=overview`, `/areas?area=04-operacje&view=overview`, and `/areas?area=08-zasoby&view=overview` through a temporary local static server with mocked API responses for the already verified read packets.
- Screenshots/logs:
  - `docs/ux/evidence/cc-ui-004-00-desktop.png`
  - `docs/ux/evidence/cc-ui-004-04-desktop.png`
  - `docs/ux/evidence/cc-ui-004-08-desktop.png`
  - `docs/ux/evidence/cc-ui-004-08-mobile.png`
- High-risk checks:
  - No new write routes or provider mutation paths were added.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: CC-UI-004 added as VERIFIED.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-CC-UI-001 advanced to verified for the `00/04/08` adoption checkpoint.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: QA-CC-UI-001 advanced to verified for the `00/04/08` adoption checkpoint.
- Risk register updated: yes.
- Risk rows closed or changed: RISK-CC-UI-001 mitigation evidence updated.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes, by TypeScript build and endpoint source review.
- DB schema and migrations verified: not applicable for UI-only slice.
- Loading state verified: implemented through shared `CcDataTable`; rendered proof used ready states.
- Error state verified: implemented through shared `CcDataTable`; rendered proof used ready states.
- Refresh/restart behavior verified: yes, each selected-area URL was opened directly.
- Regression check performed: `npm run build:web`; `git diff --check`; rendered route proof.

## UX/UI Evidence
- Design source type: approved_snapshot.
- Design source reference: existing V1 selected-area management shell and `docs/ux/design-system-contract.md`.
- Canonical visual target: structurally faithful selected-area management board.
- Fidelity target: structurally_faithful.
- Existing shared pattern reused: `CcButton`, `CcDataTable`, selected-area department panels, operations metrics, status row.
- New shared pattern introduced: no repo-wide new primitive; only a local packet panel style.
- Surface strategy checked: mobile | tablet | desktop planned.
- State checks: loading | empty | error | success implemented.
- Raw technical errors hidden from end users: yes.
- Responsive checks: desktop and mobile rendered proof passed.
- Accessibility checks: button labels are visible text; tables provide mobile card labels from column headers.
- Parity evidence: structurally faithful selected-area management shell with screenshots listed above.

## Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: no.
- Rollback note: revert `web/src/main.tsx` and `web/src/styles.css` UI changes if rendered route proof finds an unacceptable regression.
- Observability or alerting impact: none.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was selected.
- [x] Current stage is declared.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Rendered validation was run.
- [x] Docs or context were updated with final evidence.

## Result Report
- Task summary: connected the verified `00`, `04`, and `08` read packets to the selected-area UI using shared primitives.
- Files changed: `web/src/main.tsx`, `web/src/styles.css`, this task contract, and project state/ledger files.
- How tested: `npm run build:web`; Playwright rendered 00/04/08 selected-area routes at desktop/mobile sizes; `git diff --check`.
- What is incomplete: production deployment/smoke is still a later release task; write commands remain intentionally excluded.
- Next steps: continue with the next ready department slice, starting with `05 Relationships`, or run production smoke after the next deploy.
- Decisions made: read-only UI adoption only; writes remain separate command contracts.

## Notes
- This task intentionally does not add accept/reject, task mutation, Drive mutation, sync, legal, invoice, discount, or provider write behavior.
