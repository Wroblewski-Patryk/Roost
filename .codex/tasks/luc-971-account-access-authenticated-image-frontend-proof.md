# Task

## Header
- ID: LUC-971
- Title: Add frontend proof for AuthenticatedImage auth surface
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: ASSETS-IMAGE-PREVIEW-004
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Account access AuthenticatedImage frontend proof
- Requirement Rows: REQ-ASSETS-IMAGE-PREVIEW-004
- Quality Scenario Rows: not applicable
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-07-13-BUILDER
- Operation Mode: BUILDER
- Mission ID: LUC-971-authenticated-image-frontend-proof
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the operating-system startup path.
- [x] Missing or template-like state tables were not blocking this scoped proof task.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: add durable frontend proof that `AuthenticatedImage` fetches protected image previews with owner auth and renders the resulting blob in the Assets route.
- Release objective advanced: close the current Account access app-completion `missing_test_link` gap for `web/src/features/departments/assets-route.tsx#AuthenticatedImage`.
- Included slices: focused proof packet, frontend browser verification, scanner proof-link metadata, generated readback refresh, source-of-truth updates.
- Explicit exclusions: backend route changes, Google Drive provider calls, production smoke, deploy, push, and broader Assets UX redesign.
- Checkpoint cadence: one proof run, one metadata/update pass, one readback pass.
- Stop conditions: the web build fails, the route cannot render under mocked owner auth, or the proof cannot demonstrate the preview request bearer header.
- Handoff expectation: after readback confirms the row is no longer `missing_test_link`, the issue can close with frontend evidence only.

## Context
Current generated Project Truth maps the active Account access frontend gap to
`web/src/features/departments/assets-route.tsx#AuthenticatedImage`. The
original `ASSETS-IMAGE-PREVIEW-004` task proved the route behavior in May 2026,
but the exact function entity still lacks a durable proof link in the current
scanner/index exports.

## Goal
Produce current, inspectable frontend evidence that `AuthenticatedImage`
requests `/v1/assets/files/:id/preview` with the owner bearer token and renders
the authenticated blob preview in the Assets files view.

## Scope
- `.codex/tasks/luc-971-account-access-authenticated-image-frontend-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/ux/evidence/luc-971-authenticated-image-proof/`
- Generated architecture/app-completion/Project Truth/state files touched by
  the verification refresh

## Implementation Plan
1. Confirm the current gap is proof-link debt on `AuthenticatedImage`, not a fresh frontend defect.
2. Run the smallest local browser proof that serves the built React app, injects an owner token, mocks the Assets packet and preview endpoint, and records request/header/render evidence.
3. Link the resulting proof packet to `web/src/features/departments/assets-route.tsx#AuthenticatedImage` in scanner overrides.
4. Refresh the generated indexes and source-of-truth files, then read back the target row status.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues:
  - `docs/status/app-completion-index.md` still lists `AuthenticatedImage` as `missing_test_link`.
  - Existing Assets image-preview proof lives in broader task docs, not as a direct function-level proof link for the current scanner export.
- Gaps:
  - No current function-level test/proof relation points to `web/src/features/departments/assets-route.tsx#AuthenticatedImage`.
- Inconsistencies:
  - The route requirement row is verified, but the exact function entity remains a generated proof gap.
- Architecture constraints:
  - Reuse the existing Assets route and owner-token contract.
  - Do not add public image access, provider calls, or backend changes.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned:
  - `.agents/core/project-memory-index.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `docs/planning/assets-image-preview-task-contract.md`
  - `docs/planning/assets-files-folders-premium-audit-task-contract.md`
  - `web/src/features/departments/assets-route.tsx`
  - `docs/status/app-completion-index.md`
  - `docs/status/project-truth-index.md`
- Rows created or corrected: pending proof row closure for `AuthenticatedImage`
- Assumptions recorded:
  - Existing Assets preview behavior is still correct and needs refreshed evidence plus proof-link metadata.
- Blocking unknowns: none
- Why it was safe to continue:
  - The task is a bounded frontend proof lane over an existing verified route.

### 2. Select One Priority Mission Objective
- Selected task: LUC-971
- Priority rationale:
  - It is the current generated Account access frontend proof gap and fits FEW ownership.
- Why other candidates were deferred:
  - No broader Assets or backend work is required to close this function-level evidence gap.

### 3. Plan Implementation
- Files or surfaces to modify:
  - Proof packet
  - scanner overrides
  - generated readback/state files
  - browser evidence artifacts
- Logic:
  - Use a focused mocked-browser proof instead of broader backend or provider validation.
- Edge cases:
  - Missing owner token
  - missing/incorrect bearer header on preview fetch
  - image preview fallback instead of rendered blob
  - cleanup of proof-owned browser/server resources

### 4. Execute Implementation
- Added `docs/planning/luc-971-account-access-authenticated-image-frontend-proof.md` as the focused proof packet for the exact function row.
- Added scanner overrides that classify the proof packet as `test`, link it to `web/src/features/departments/assets-route.tsx#AuthenticatedImage`, and mark the exact function entity `verified` with current evidence.
- Ran a focused local browser proof against the built React app with mocked authenticated Assets responses and captured desktop/mobile screenshots plus a structured JSON report.

### 5. Verify and Test
- Validation performed:
  - `npm run build:web`
  - focused local Playwright proof against `/areas?area=08-zasoby&view=files`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. The browser proof recorded authenticated preview requests with bearer headers, blob-backed image rendering, no runtime errors, and no horizontal overflow. Refreshed app-completion and Project Truth readback no longer report `web/src/features/departments/assets-route.tsx#AuthenticatedImage` as `missing_test_link`.

### 6. Self-Review
- Simpler option considered:
  - linking only the May 2026 task packet without rerunning the frontend proof.
  - Rejected because a current focused proof gives stronger confidence and cleaner FEW closure evidence.
- Technical debt introduced: no
- Scalability assessment:
  - The proof is local and bounded; it adds evidence without adding runtime complexity.
- Refinements made:
  - Confirmed the remaining mismatch was not a product defect: `app-completion-index.json` stores only priority risk rows, so the target symbol disappearing from that queue is the correct success signal.

### 7. Update Documentation and Knowledge
- Docs updated:
  - `docs/planning/luc-971-account-access-authenticated-image-frontend-proof.md`
  - `docs/architecture/scanner-overrides.json`
  - `docs/status/*` generated truth exports
- Context updated:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Learning journal updated: not applicable unless a recurring proof-harness issue appears

## Acceptance Criteria
- [x] A current local frontend proof demonstrates `AuthenticatedImage` sends `Authorization: Bearer <owner token>` to the preview endpoint.
- [x] The same proof demonstrates the image renders from the authenticated blob path in the Assets files view.
- [x] `docs/architecture/scanner-overrides.json` links the proof packet to `web/src/features/departments/assets-route.tsx#AuthenticatedImage`.
- [x] Generated app-completion / Project Truth readback no longer reports `AuthenticatedImage` as `missing_test_link`.

## Success Signal
- User or operator problem:
  - the current generated confidence index still treats the authenticated image preview component as unproven.
- Expected product or reliability outcome:
  - the auth-sensitive image preview surface has direct frontend proof linked to the exact function entity.
- How success will be observed:
  - browser proof artifacts, refreshed index readback, and scanner-linked evidence for the function row.
- Post-launch learning needed: no

## Deliverable For This Stage
Verified proof packet, browser artifacts, and proof-link metadata for the
`AuthenticatedImage` auth surface.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] The affected frontend auth surface works through the recorded local browser proof.
- [x] No workaround or duplicate authenticated image path was introduced.
- [x] Relevant source-of-truth files were updated.
- [x] Behavior is reproducible from the recorded commands and artifacts below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests:
  - `npm run build:web`
  - `npm run architecture:status`
- Manual checks:
  - focused local Playwright proof confirmed desktop/mobile Assets files view rendering
  - JSON readback confirmed the target symbol is absent from `docs/status/project-truth-index.json` gaps
- Screenshots/logs:
  - `docs/ux/evidence/luc-971-authenticated-image-proof/report.json`
  - `docs/ux/evidence/luc-971-authenticated-image-proof/desktop-assets-authenticated-image.png`
  - `docs/ux/evidence/luc-971-authenticated-image-proof/mobile-assets-authenticated-image.png`
- High-risk checks:
  - bearer-header assertion on every protected preview request
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: Account access AuthenticatedImage frontend proof
- Requirements matrix updated: not applicable
- Requirement rows closed or changed: not applicable
- Quality scenarios updated: not applicable
- Quality scenario rows closed or changed: not applicable
- Risk register updated: not applicable
- Risk rows closed or changed: not applicable
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes, through mocked authenticated preview requests
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: no, intentionally out of scope for this proof-only lane
- Refresh/restart behavior verified: not applicable
- Regression check performed: yes, exact function row readback plus route render proof

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: authenticated owner using `08 Assets -> Files and folders`
- Existing workaround or pain: exact component proof is missing from the generated confidence model
- Smallest useful slice: focused local frontend proof plus scanner linkage
- Success metric or signal: direct function row readback moves off `missing_test_link`
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: not applicable

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable
- Feedback item IDs: not applicable
- Feedback accepted: not applicable
- Feedback needs clarification: none
- Feedback conflicts: none
- Feedback deferred or rejected: none
- Active task changed by feedback: no
- New task created from feedback: not applicable
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: signed-in owner opens Assets files view and sees a protected image preview render
- SLI: authenticated preview request succeeds and image element renders
- SLO: not applicable
- Error budget posture: not applicable
- Health/readiness check: `npm run architecture:status` PASS; public runtime probes in Project Truth apply PASS
- Logs, dashboard, or alert route: proof report artifact
- Smoke command or manual smoke: focused local Playwright proof
- Rollback or disable path: remove proof-link metadata only; runtime behavior unchanged

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: authenticated workspace asset preview
- Trust boundaries: browser session token -> protected preview endpoint
- Permission or ownership checks: proof must verify bearer header is sent on preview fetch
- Abuse cases: no public image URL fallback for protected preview path
- Secret handling: proof uses disposable local token string only
- Security tests or scans: focused auth-header assertion PASS via proof report
- Fail-closed behavior: not expanded in this lane; no public image URL fallback was used in the passing proof
- Residual risk: production/provider-backed image rendering remains outside this local mocked proof

## Architecture Evidence
- Architecture source reviewed: `docs/planning/assets-image-preview-task-contract.md`, `docs/architecture/web-layer-react-ownership.md`
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no
- Approval reference if architecture changed: not applicable
- Follow-up architecture doc updates: generated scanner readback only

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: existing Assets files/folders route proof and current route behavior
- Canonical visual target: existing `08 Assets -> Files and folders` preview surface
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: no
- Primary user question answered within 3 seconds: yes, whether the image preview renders
- Next action visibility: yes
- Blocked-state visibility: pending fallback assertion
- Stitch used: no
- Stitch artifact reference (if used): not applicable
- Experience-quality bar reviewed: no
- Visual-direction brief reviewed: no
- Existing shared pattern reused: existing Assets preview panel
- New shared pattern introduced: no
- Design-memory entry reused: not applicable
- Design-memory update required: no
- Pattern-gallery reference: not applicable
- Visual gap audit completed: no
- Background or decorative asset strategy: not applicable
- Canonical asset extraction required: no
- Screenshot comparison pass completed: no
- Remaining mismatches: not applicable for this proof lane
- Anti-patterns checked: no
- Screen-quality checklist reviewed: no
- UI scorecard used: no
- Surface strategy checked: desktop | mobile
- State checks: success
- Feedback locality checked: yes
- Raw technical errors hidden from end users: yes
- Responsive checks: desktop | mobile
- Input-mode checks: pointer
- Accessibility checks: not applicable beyond existing route semantics
- Parity evidence: pending screenshots/report

## Deployment / Ops Evidence
- Deploy impact: none
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: no
- Rollback note: revert proof metadata/doc updates only
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
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
- [ ] Learning journal was updated if a recurring pitfall was confirmed.
- [x] Required responsibility lanes were integrated, rejected, or tracked as follow-up.
- [x] Parent validation ran after accepted lane integration.

## Result Report
- Task summary: Added a current frontend proof packet for `AuthenticatedImage`, linked it directly into scanner metadata, refreshed generated truth exports, and confirmed the exact function row is no longer routed as `missing_test_link`.
- Files changed:
  - `.codex/tasks/luc-971-account-access-authenticated-image-frontend-proof.md`
  - `docs/planning/luc-971-account-access-authenticated-image-frontend-proof.md`
  - `docs/architecture/scanner-overrides.json`
  - `docs/ux/evidence/luc-971-authenticated-image-proof/*`
  - generated `docs/status/*` readback files
  - canonical state files updated for closure
- How tested:
  - `npm run build:web`
  - focused local Playwright proof with authenticated preview/header assertions
  - architecture/app-completion/Project Truth regeneration
  - `npm run architecture:status`
- What is incomplete: nothing for the scoped FEW proof lane
- Next steps: the next routed Project Truth gap is `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor` `missing_test_link`, owned by Test Automation Engineer + QA Regression Lead
- Decisions made:
  - kept the lane proof-only with no runtime code change because the gap was evidence debt, not a reproduced frontend defect
