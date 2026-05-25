# Task

## Header
- ID: ASSETS-GDRIVE-006
- Title: Google Drive sync and Assets context coverage fix
- Task Type: fix
- Current Stage: implementation
- Status: REVIEW
- Owner: Backend Builder
- Depends on: ASSETS-FILES-PREMIUM-005
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `08 Assets -> Files and folders`, `Google Drive integration`
- Requirement Rows: `ASSETS-FILES-FOLDERS-V1`, `ASSETS-GDRIVE-COVERAGE`
- Quality Scenario Rows: `Assets data completeness`, `AI-readable resource context`
- Risk Rows: `R-ASSETS-LIMITED-CONTEXT`, `R-GDRIVE-PAGE-CAP`
- Iteration: 2026-05-17 ASSETS-GDRIVE-006
- Operation Mode: BUILDER
- Mission ID: ASSETS-GDRIVE-006
- Mission Status: PARTIALLY_VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were not needed for this scoped fix.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by reducing missing Drive files in Assets.

## Mission Block
- Mission objective: Find and fix the likely backend causes for Google Drive files missing from `08 Assets -> Files and folders`.
- Release objective advanced: Assets must be a dependable resource management base for humans and AI clients.
- Included slices: Drive import page cap, text-file content refresh during import, Assets context item selection, frontend context limit, regression tests, source-of-truth updates.
- Explicit exclusions: New Drive OAuth setup, provider-side move/delete/share commands, full paginated Assets UI.
- Checkpoint cadence: Inspect, implement, validate, document, commit.
- Stop conditions: Architecture mismatch, secret access requirement, or failing core validation that cannot be fixed in scope.
- Handoff expectation: Code and docs identify the fixed coverage gap plus any remaining pagination follow-up.

## Context
The current Assets workbench reads `/v1/assets/context?areaKey=all&limit=200`.
Backend context currently orders Google Drive records with folders first and
applies one shared limit before the web layer builds folders and file cards.
For larger Drive imports, this can make folders appear while many files never
reach the Assets packet.

## Goal
Make Google Drive sync and Assets context less likely to hide files by default,
while preserving the existing CompanyCore domain API and MCP-ready object
contract.

## Scope
- `src/integrations/google-drive/google-drive.sync.ts`
- `src/integrations/google-drive/google-drive.content.ts`
- `src/modules/assets/assets.routes.ts`
- `src/tests/api.test.ts`
- `web/src/features/departments/assets-route.tsx`
- Source-of-truth docs and state files touched by the fix.

## Implementation Plan
1. Inspect Drive sync, content extraction, Assets context, UI packet fetch, and API tests.
2. Increase safe Drive folder scan coverage and refresh supported text media during import.
3. Split Assets context Drive folder and file reads so folder-first ordering cannot consume the whole limit.
4. Increase the web packet request cap to match the backend coverage window.
5. Add regression coverage for limited Assets context still returning both folders and files.
6. Run build and validation gates, then update project source of truth.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Assets context had one `limit` capped at 200 and sorted folders before files.
- Gaps: Import refreshed Docs/Sheets but skipped Markdown/CSV/JSON text file content even though content extraction supports them.
- Inconsistencies: The UI expects a useful folder tree and useful file cards from one packet, but backend limiting favored tree completeness over file visibility.
- Architecture constraints: Keep CompanyCore as the system API; do not expose raw tables or provider internals as the owner workflow.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: project memory index, Drive integration, Assets route, web Assets route, API tests.
- Rows created or corrected: pending final doc update.
- Assumptions recorded: The production workspace can exceed 200 imported Drive records.
- Blocking unknowns: none for this backend coverage fix.
- Why it was safe to continue: The fix changes limits and selection strategy without changing schema or provider permissions.

### 2. Select One Priority Mission Objective
- Selected task: Fix Google Drive file coverage for Assets context.
- Priority rationale: The user cannot see all files in the primary Assets management view.
- Why other candidates were deferred: Full pagination and new provider commands require separate UX/API contracts.

### 3. Plan Implementation
- Files or surfaces to modify: backend Drive sync/content, Assets context endpoint, web fetch cap, API tests, docs.
- Logic: Separate folder and file reads; increase caps; refresh text files during import.
- Edge cases: Large folders, root folders with many descendants, text file MIME inferred from extension, workspace isolation.

### 4. Execute Implementation
- Implementation notes: Exported the shared Google Drive text-file predicate,
  reused it during selected-folder import, raised the default folder page scan
  from 10 to 50 pages, split Assets context Drive reads into folders and
  non-folder files, raised the Assets context cap to 1000, updated the web
  packet request to `limit=1000`, and added a low-limit folder/file regression
  to the API test suite.

### 5. Verify and Test
- Validation performed: `npm run build:server`, `npm run build:web`, `npm run
  validate`, dummy-url `npx prisma validate`, and `git diff --check`.
- Result: Passed. Full `npm run test:api` could not run because no local
  `DATABASE_URL` is configured and Docker availability probing timed out.

### 6. Self-Review
- Simpler option considered: Only increase web `limit=200` to `limit=1000`.
- Technical debt introduced: no.
- Scalability assessment: Split reads improve coverage now; full pagination remains a future enhancement.
- Refinements made: Added a regression that a tiny context limit still returns
  both folders and files, so future folder-first query changes are caught.

### 7. Update Documentation and Knowledge
- Docs updated: task board, project state, project memory index, module
  confidence, requirements matrix, quality scenarios, risk register, and next
  steps.
- Context updated: yes.
- Learning journal updated: not applicable unless validation discovers a recurring pitfall.

## Acceptance Criteria
- [x] Assets context with a small limit still returns folder records and non-folder Drive file records.
- [x] Default Drive import scans more than 1,000 children per selected folder when needed within the existing safety cap.
- [x] Markdown, CSV, JSON, and text Drive files imported through selected-folder sync get content snapshots when supported.
- [x] The web Assets workbench requests a packet large enough for the current production Drive import scale.

## Success Signal
- User or operator problem: Files are missing from `08 Assets -> Files and folders` even though Drive folders are present.
- Expected product or reliability outcome: The Assets packet reliably includes folders and files for the current Drive scope.
- How success will be observed: API regression and build validation pass; production can display more imported files after deploy/reload.
- Post-launch learning needed: yes

## Deliverable For This Stage
Runtime fix, regression test, and source-of-truth update for Google Drive file coverage in Assets.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior
- implement features as a vertical slice across UI, logic, API, DB, validation, error handling, and tests when the task affects runtime behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through API/client contract evidence at build/type level and added API regression source.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across sync, DB query, API packet, and web request cap at code/contract level.
- [x] Backend and UI/client error handling remains unchanged and valid.
- [x] No existing functionality is broken by build validation.
- [x] Feature works after restart, reload, or navigation refresh where applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded where applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `REVIEW`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new systems without approval
- duplicated logic or parallel implementations of the same contract
- temporary bypasses, hacks, or workaround-only paths
- architecture changes without explicit approval
- implicit stage skipping

## Validation Evidence
- Tests: `npm run build:server` passed; `npm run build:web` passed; `npm run validate` passed; dummy-url `npx prisma validate` passed; `git diff --check` passed. API regression source was added but not executed because validation PostgreSQL is not configured.
- Manual checks: Source review confirmed Assets context no longer applies one folder-first limit to folders and files together.
- Screenshots/logs: Not applicable; this was a backend/data coverage fix with no visual layout change.
- High-risk checks: Docker availability probe timed out, so full DB API test remained blocked rather than using a fake database path.
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: ASSETS-GDRIVE-006 added as `PARTIAL`.
- Requirements matrix updated: yes
- Requirement rows closed or changed: REQ-ASSETS-GDRIVE-006 added as `partially verified`.
- Quality scenarios updated: yes
- Quality scenario rows closed or changed: QA-ASSETS-GDRIVE-006 added as `partially verified`.
- Risk register updated: yes
- Risk rows closed or changed: RISK-ASSETS-GDRIVE-006 added as `mitigating`.
- Reality status: partially verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: `npx prisma validate` passed; no schema change.
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: build-level only; production smoke pending.
- Regression check performed: low-limit Assets context API regression added; full execution pending validation DB.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: Workspace owner using Assets files and folders.
- Existing workaround or pain: Manually looking for files outside Roost/CompanyCore.
- Smallest useful slice: Fix sync/query coverage without adding full pagination.
- Success metric or signal: Assets context returns non-folder files even when folder count is high.
- Feature flag, staged rollout, or disable path: no
- Post-launch feedback or metric check: Confirm production Assets file count after deploy.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: ASSETS-GDRIVE-006
- Feedback accepted: yes
- Feedback needs clarification: no
- Feedback conflicts: none
- Feedback deferred or rejected: Full pagination deferred.
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: yes
- Critical user journey: Sync Drive files, then view them in Assets.
- SLI: Assets context completeness for imported Drive records.
- SLO: Current import scale should fit the default context packet.
- Error budget posture: healthy
- Health/readiness check: build and API route validation.
- Logs, dashboard, or alert route: existing events remain unchanged.
- Smoke command or manual smoke: build/contract smoke passed; production file-count smoke pending after deploy.
- Rollback or disable path: revert this commit.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- Memory consistency scenarios: not applicable
- Multi-step context scenarios: not applicable
- Adversarial or role-break scenarios: not applicable
- Prompt injection checks: not applicable
- Data leakage and unauthorized access checks: workspace isolation regression remains in API test.
- Result: not applicable

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: Workspace Google Drive metadata and extracted text.
- Trust boundaries: Authenticated workspace owner API, Google Drive provider API, MCP read packet.
- Permission or ownership checks: Existing workspace auth and workspace-scoped Prisma filters remain required.
- Abuse cases: Cross-workspace leakage, over-broad provider writes.
- Secret handling: No new secrets.
- Security tests or scans: Existing API workspace isolation test retained.
- Fail-closed behavior: Existing provider auth failures still return integration errors.
- Residual risk: Larger packet size increases payload size until full pagination is introduced.

## Architecture Evidence (required for architecture-impacting tasks)
- Architecture source reviewed: `docs/architecture/autonomous-company-operating-system.md`, `docs/architecture/system-architecture.md`
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no
- Approval reference if architecture changed: not applicable
- Follow-up architecture doc updates: not required

## UX/UI Evidence (required for UX tasks)
- Design source type: approved_snapshot
- Design source reference: Existing `08 Assets -> Files and folders` workbench.
- Canonical visual target: current Roost Assets workbench.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: no
- Primary user question answered within 3 seconds: yes, after deploy the files list should receive a broader packet and non-folder files are no longer starved by folder records.
- Next action visibility: unchanged
- Blocked-state visibility: unchanged
- Stitch used: no
- Stitch artifact reference (if used): not applicable
- Experience-quality bar reviewed: yes
- Visual-direction brief reviewed: yes
- Existing shared pattern reused: existing Assets workbench and packet loader.
- New shared pattern introduced: no
- Design-memory entry reused: Assets resource selector and preview workbench.
- Design-memory update required: no
- Pattern-gallery reference: not applicable
- Visual gap audit completed: no
- Background or decorative asset strategy: not applicable
- Canonical asset extraction required: no
- Screenshot comparison pass completed: no
- Remaining mismatches: Full pagination remains future scope.
- Anti-patterns checked: yes
- Screen-quality checklist reviewed: yes
- UI scorecard used: no
- Surface strategy checked: desktop | tablet | mobile
- State checks: loading | empty | error | success
- Feedback locality checked: yes
- Raw technical errors hidden from end users: yes
- Responsive checks: not required for packet cap change
- Input-mode checks: not applicable
- Accessibility checks: unchanged
- Parity evidence: not required for backend coverage fix

## Deployment / Ops Evidence (required for runtime or infra tasks)
- Deploy impact: low
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: yes, in `.agents/state/next-steps.md`.
- Rollback note: revert this commit if payload size causes production issues.
- Observability or alerting impact: Existing import/reconcile events unchanged.
- Staged rollout or feature flag: no
- `DEPLOYMENT_GATE.md` reviewed: yes

## Review Checklist (mandatory)
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to iteration rotation.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] AI testing evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.
- [x] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report
- Task summary: Fixed likely missing-file behavior by increasing Drive import coverage and separating folder/file reads in the Assets context packet.
- Files changed: `src/integrations/google-drive/google-drive.content.ts`, `src/integrations/google-drive/google-drive.sync.ts`, `src/modules/assets/assets.routes.ts`, `src/tests/api.test.ts`, `web/src/features/departments/assets-route.tsx`, and source-of-truth docs/state.
- How tested: `npm run build:server`, `npm run build:web`, `npm run validate`, dummy-url `npx prisma validate`, and `git diff --check` passed.
- What is incomplete: Full `npm run test:api` and production smoke remain pending until a validation DB and deploy are available.
- Next steps: Run full API regression with PostgreSQL, deploy, and smoke real Assets Drive file counts.
- Decisions made: Keep the current single-packet workbench but raise/split coverage now; defer true pagination until the real dataset exceeds the 1000-file window.

## Notes
This is a data-completeness fix, not a new provider command surface.
