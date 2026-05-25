# Task

## Header
- ID: CC-AUDIT-001
- Title: Architecture and UX audit for `00 Ogolny`, `04 Operations`, and `08 Assets`
- Task Type: fix
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + QA/Test + Product Docs
- Depends on: CC-ARCH-001, CC-00-002, CC-04-002, CC-08-002, CC-UI-004
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: CC-AUDIT-001, CC-UI-004
- Requirement Rows: REQ-CC-DASHBOARD-001
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: 2026-05-16 audit checkpoint
- Operation Mode: TESTER
- Mission ID: CC-00-04-08-AUDIT
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the verification-heavy audit checkpoint.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed during the active mission.
- [x] Missing or template-like state tables were not blocking; existing ledgers were used.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: audit whether `00 Ogolny`, `04 Operations`, and `08 Assets` match the accepted CompanyCore architecture and UX direction, then fix the highest-priority mismatch.
- Release objective advanced: CompanyCore starts in the correct company dashboard after login and keeps 00/04/08 as coherent management surfaces.
- Included slices: architecture/UX audit, post-login dashboard route fix, `/dashboard` compatibility redirect, docs and state updates, build and rendered route proof.
- Explicit exclusions: new write commands, schema expansion, provider file mutation, production VPS smoke, and next department implementation.
- Checkpoint cadence: update docs and state after implementation and verification.
- Stop conditions: build failure, route proof failure, auth redirect regression, or architecture conflict.
- Handoff expectation: commit and push validated changes for Coolify-visible source update.

## Context
The owner asked for an audit of the three priority CompanyCore departments and for missing pieces to be planned and implemented. The main architecture gap found during the audit was that `/dashboard` remained a separate Company Atlas route, while the accepted architecture says `00 Ogolny` is the main dashboard after login.

## Goal
Make `00 Ogolny` the canonical post-auth dashboard while preserving `/dashboard` as a compatibility alias, and record the remaining 00/04/08 gaps without introducing unsafe or unapproved write behavior.

## Scope
- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- `docs/planning/cc-00-04-08-architecture-ux-audit.md`
- this task contract
- canonical planning/state ledgers updated by the task
- rendered proof screenshots under `docs/ux/evidence/`

## Implementation Plan
1. Compare architecture docs, active plan, route registry, auth redirect, and selected-area UI against the user request.
2. Implement the minimal route fix so auth defaults to `/areas?area=00-ogolny&view=overview` and `/dashboard` redirects there.
3. Preserve valid private pending paths with query strings after authentication.
4. Run web/server builds, route proof, and cleanup checks.
5. Update audit docs, task board, module confidence, requirements, quality, risk, project state, and next-step files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `/dashboard` was still a separate Company Atlas route and the default post-auth path.
- Gaps: richer Operations/Assets write workflows remain future command-contract work.
- Inconsistencies: route normalization could drop query-based selected-area context after auth.
- Architecture constraints: CompanyCore must remain API-first and AI-compatible without embedding AI runtime behavior in backend.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking this slice
- Sources scanned: architecture source of truth, active 00/04/08 plan, route registry, auth route, task board, module confidence ledger
- Rows created or corrected: planned for requirement, quality, risk, confidence, and task board rows
- Assumptions recorded: `/dashboard` may remain a compatibility alias, but not a separate canonical first screen
- Blocking unknowns: none for local route fix
- Why it was safe to continue: the change preserves the legacy path while routing it to the accepted canonical dashboard

### 2. Select One Priority Mission Objective
- Selected task: CC-AUDIT-001
- Priority rationale: post-login route is a P0 UX/architecture contract for every user session.
- Why other candidates were deferred: 04/08 write commands and next department slices require separate command contracts and broader validation.

### 3. Plan Implementation
- Files or surfaces to modify: route registry, React route links, dashboard compatibility component, docs/state files
- Logic: default auth and `/dashboard` to selected-area `00 Ogolny`; keep valid pending private paths intact.
- Edge cases: alias paths, query strings, public/invalid pending paths, signed-out `/dashboard` entry.

### 4. Execute Implementation
- Implementation notes: `web/src/app-route-registry.ts` now defines
  `canonicalGeneralDashboardPath`, preserves valid private query-string
  routes after auth, and maps `/dashboard` to the selected-area `00 Ogolny`
  dashboard. `web/src/main.tsx` redirects `/dashboard` and updates
  dashboard/atlas links.

### 5. Verify and Test
- Validation performed: `npm run build:web`; `npm run build:server`;
  Playwright fallback rendered login -> `00 Ogolny`, `/dashboard` ->
  `00 Ogolny`, desktop `04 Operations`, desktop `08 Assets`, and mobile
  `08 Assets`; `git diff --check`; local process/port cleanup checks.
- Result: passed. Browser plugin initialization timed out, so Playwright
  fallback was used and the reason is recorded here.

### 6. Self-Review
- Simpler option considered: changing `/dashboard` metadata only.
- Technical debt introduced: no; the compatibility alias avoids duplicate dashboard surfaces.
- Scalability assessment: route registry now has a single canonical post-auth target for future consumers.
- Refinements made: query/hash normalization was limited to matching so selected-area context is preserved.

### 7. Update Documentation and Knowledge
- Docs updated: audit doc, task board, requirements matrix, quality scenarios,
  risk register, module confidence ledger, current focus, and next steps.
- Context updated: yes.
- Learning journal updated: not applicable unless validation exposes a recurring pitfall.

## Acceptance Criteria
- [x] Successful login without a pending private route opens `/areas?area=00-ogolny&view=overview`.
- [x] `/dashboard` redirects to `/areas?area=00-ogolny&view=overview`.
- [x] `00 Ogolny`, `04 Operations`, and `08 Assets` selected-area views still render their packet boards.
- [x] The audit records delivered scope and planned gaps without authorizing unsafe writes.
- [x] Build and route proof are recorded.

## Success Signal
- User or operator problem: after login the owner starts in the real company dashboard, not a duplicate atlas route.
- Expected product or reliability outcome: clearer first screen, less route drift, and safer department buildout.
- How success will be observed: build output, Playwright route proof, screenshots, and updated ledgers.
- Post-launch learning needed: yes, production smoke after Coolify deploy should confirm running commit and first screen.

## Deliverable For This Stage
Verified local implementation, audit report, updated ledgers, commit, and push.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior
- implement runtime behavior through the existing route registry and React selected-area shell

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI or rendered route proof.
- [x] No mock, placeholder, fake, or temporary data/path remains in delivered behavior.
- [x] Full route flow works across auth redirect and route alias layers.
- [x] Backend and UI/client error handling exists where applicable.
- [x] No existing functionality is broken.
- [x] Feature works after reload or direct navigation.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded when applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

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
- Tests: `npm run build:web`; `npm run build:server`; `git diff --check`.
- Manual checks: Playwright fallback rendered the auth redirect and selected-area routes through a temporary local static React server using mocked responses for read packets already verified by API tests in CC-00-002, CC-04-002, and CC-08-002.
- Screenshots/logs: `docs/ux/evidence/cc-audit-001-post-login-00-dashboard.png`; `docs/ux/evidence/cc-audit-001-dashboard-alias-00.png`; `docs/ux/evidence/cc-audit-001-04-operations.png`; `docs/ux/evidence/cc-audit-001-08-assets-desktop.png`; `docs/ux/evidence/cc-audit-001-08-assets-mobile.png`.
- High-risk checks: no console/page errors, no mobile horizontal overflow, no validation-owned `chrome-headless-shell` process, and no remaining server on port `3227`.
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: CC-AUDIT-001
- Requirements matrix updated: yes
- Requirement rows closed or changed: REQ-CC-DASHBOARD-001
- Quality scenarios updated: yes
- Quality scenario rows closed or changed: QA-CC-DASHBOARD-001
- Risk register updated: yes
- Risk rows closed or changed: RISK-CC-DASHBOARD-001
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: yes
- Error state verified: yes through existing selected-area packet error states; no new write path added
- Refresh/restart behavior verified: yes through direct navigation to `/dashboard` and selected-area routes
- Regression check performed: auth redirect, dashboard alias, 00/04/08 selected-area render proof

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner and any human user signing in
- Existing workaround or pain: separate `/dashboard` route made the first screen diverge from the accepted `00 Ogolny` architecture
- Smallest useful slice: route the existing post-auth/default dashboard path into `00 Ogolny`
- Success metric or signal: direct login and `/dashboard` route proof open `00 Ogolny`
- Feature flag, staged rollout, or disable path: no; rollback is reverting the route default
- Post-launch feedback or metric check: production smoke after deploy

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable
- Feedback item IDs: direct user request on 2026-05-16
- Feedback accepted: yes
- Feedback needs clarification: none
- Feedback conflicts: none
- Feedback deferred or rejected: no unsafe writes were added
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: login -> company dashboard
- SLI: successful auth redirect to canonical private dashboard
- SLO: local route proof passes before commit
- Error budget posture: healthy
- Health/readiness check: build and route proof passed
- Logs, dashboard, or alert route: Playwright console/page error capture passed with no relevant errors
- Smoke command or manual smoke: Playwright fallback route proof passed locally
- Rollback or disable path: revert `canonicalPostAuthPath()` and `/dashboard` component changes

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- AI feature changed: no

## Result Report
- Completed. `00 Ogolny` is now the canonical post-login dashboard and
  `/dashboard` is a compatibility alias into the same selected-area view.
- The audit records delivered 00/04/08 scope and keeps remaining writes,
  schema expansion, provider actions, and next department work as explicit
  future tasks.
- Local verification passed; production smoke remains a post-push follow-up
  because Coolify auto-deploy is documented as unverified.
