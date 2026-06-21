# Task

## Header
- ID: LUC-5410
- Title: Flow classification and missing-doc-link curation from LUC-5407
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Depends on: [LUC-5407](/LUC/issues/LUC-5407)
- Priority: P1
- Coverage Ledger Rows: app-completion index curation
- Module Confidence Rows: architecture scanner/app-completion evidence
- Requirement Rows: not applicable; evidence mapping only
- Quality Scenario Rows: architecture evidence quality
- Risk Rows: scanner false-positive classification
- Iteration: 2026-06-21 LUC-5410
- Operation Mode: ARCHITECT
- Mission ID: LUC-5410-FLOW-CLASSIFICATION-DOC-LINK-CURATION
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the architecture curation lane.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was considered through the active
      AGENTS startup contract.
- [x] `.agents/core/mission-control.md` was considered through the active
      mission packet.
- [x] Missing or template-like state tables were not required for this narrow
      curation.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were marked not
      applicable or evidence-only.
- [x] The task improves release confidence by reducing false browser/doc-link
      debt in generated completion evidence.

## Mission Block
- Mission objective: reduce unclassified browser-review and missing-doc-link
  noise from the [LUC-5407](/LUC/issues/LUC-5407) app-completion evidence
  without runtime behavior changes.
- Release objective advanced: Roost thin readiness known-state confidence.
- Included slices: inspect generated app-completion evidence, add scanner
  override mappings, rerun awareness/app-completion/status gates, update
  durable state.
- Explicit exclusions: feature code, schema, migrations, deploy, push, restart,
  protected smoke, production mutation, credentials, secrets, browser proof,
  database, Docker, and runtime server processes.
- Checkpoint cadence: single heartbeat verification.
- Stop conditions: architecture status fails, curation requires product flow
  invention, or protected runtime proof becomes necessary.
- Handoff expectation: source-control closure delegated to
  [LUC-5411](/LUC/issues/LUC-5411).

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | [LUC-5410](/LUC/issues/LUC-5410), `AGENTS.md` | Integration and final Paperclip disposition | This packet and issue update | Parent issue status update | DONE |
| Architecture | Technical Solution Architect | `docs/status/app-completion-index.json`, `docs/graphs/architecture-health.json` | `docs/architecture/scanner-overrides.json` | Targeted override curation | Scanner/app-completion/status rerun | DONE |
| Documentation/Memory | Technical Solution Architect | `.agents/state/*`, `.codex/context/*` | Planning and state notes | Durable evidence and next-state updates | State file diff plus issue comment | DONE |

### Lane Checks
- [x] `.agents/state/active-mission.md` was refreshed.
- [x] Responsibility stayed single-lane because the work was a narrow
      architecture evidence curation.
- [x] No two write lanes owned the same file.
- [x] Each lane has output and validation.
- [x] No missing or unclear ownership required responsibility-learning updates.

## Context
[LUC-5407](/LUC/issues/LUC-5407) reported app-completion false-positive debt:
`10` browser-review needs and `2` missing doc links, including
`Unclassified user workflow` browser/doc-link candidates. The issue explicitly
allowed architecture/docs evidence mapping only.

## Goal
Classify or neutralize defensible false-positive browser/doc-link candidates in
the app-completion evidence while leaving runtime behavior unchanged.

## Scope
- `docs/architecture/scanner-overrides.json`
- generated architecture-awareness/status/app-completion outputs
- `docs/planning/luc-5410-flow-classification-doc-link-curation.md`
- source-of-truth state/context notes

## Implementation Plan
1. Inspect `docs/status/app-completion-index.json` and
   `docs/graphs/architecture-health.json`.
2. Reconstruct the full app-completion classifier view because the generated
   priority queue is capped before many unclassified rows.
3. Add scanner overrides only for defensible false positives:
   - web API utility files under `web/src/api/*` that are not standalone
     browser routes.
   - shared UI primitives whose browser evidence belongs to consuming routes.
   - missing documentation relations for `src/tests/api.test.ts#registerOwner`
     and `scripts/test-api-local.mjs`.
4. Rerun scanner/status gates and record residual risk.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: app-completion reported `needsBrowserReview=10` and
  `missingDocLink=2`.
- Gaps: the capped priority queue did not show all unclassified rows.
- Inconsistencies: `/api/` utility files and shared components were interpreted
  as browser-review routes.
- Architecture constraints: no runtime behavior changes.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: app-completion index, architecture-health, scanner override
  semantics, architecture-awareness graph.
- Assumptions recorded: shared primitives are not standalone flows; their
  browser evidence belongs to consuming routes.
- Blocking unknowns: none for the targeted evidence curation.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-5410](/LUC/issues/LUC-5410).
- Priority rationale: it directly closes the delegated curation lane from
  [LUC-5407](/LUC/issues/LUC-5407).
- Why other candidates were deferred: source-control closure and QA proof are
  owned by sibling issues.

### 3. Plan Implementation
- Files or surfaces to modify: scanner overrides plus generated evidence.
- Logic: use existing scanner override mechanism rather than editing generated
  reports by hand.
- Edge cases: do not force-classify generic API mount rows into a user flow.

### 4. Execute Implementation
- Added `10` entity overrides for `web/src/api/auth-token.ts`,
  `web/src/api/client.ts`, `web/src/api/errors.ts`, and seven shared
  `web/src/components/cc-*` primitives.
- Added `3` relation overrides documenting `registerOwner` and
  `test-api-local.mjs` through testing docs/generated test node evidence.

### 5. Verify and Test
- Validation performed:
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `npm run architecture:status`
- Result:
  - scanner PASS, generated `2026-06-21T01:50:10.196Z`
  - overrides applied: `10` entity overrides, `3` relation overrides
  - app-completion PASS: `837` items / `7` flows / `0` browser-review needs /
    `0` missing doc links / `2` blocked items
  - architecture status PASS: `GREEN`, graph `454/765/35`, evidence queue
    `0`, chain worklist `0`, delta `0/0/0`, all gates pass

### 6. Self-Review
- Simpler option considered: editing generated JSON directly.
- Technical debt introduced: no; existing scanner override mechanism was reused.
- Scalability assessment: future false positives can use the same override
  contract with explicit evidence.
- Refinements made: added `auth-token.ts` after the first rerun showed it as
  the last browser-review false positive.

### 7. Update Documentation and Knowledge
- Docs updated: this task packet, scanner overrides, generated evidence.
- Context updated: `.agents/state/active-mission.md`,
  `.agents/state/next-steps.md`, `.agents/state/module-confidence-ledger.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`.
- Learning journal updated: not applicable; no recurring new pitfall beyond
  existing scanner override use.

## Acceptance Criteria
- [x] Priority unclassified browser-review/doc-link candidates are inspected.
- [x] Defensible mappings are represented through architecture/docs evidence,
      not runtime changes.
- [x] App-completion `needsBrowserReview` is reduced to `0`.
- [x] App-completion `missingDocLink` is reduced to `0`.
- [x] Architecture status remains green.

## Success Signal
- User or operator problem: generated app-completion evidence no longer
  overstates browser/doc-link debt for utility/shared primitive files.
- Expected product or reliability outcome: Roost readiness evidence is easier
  to triage and does not send QA toward false standalone screens.
- How success will be observed: app-completion counts and scanner override
  application counts.
- Post-launch learning needed: no.

## Deliverable For This Stage
Verified architecture evidence curation packet and refreshed generated status
outputs.

## Constraints
- Existing scanner override mechanism used.
- No runtime behavior, API contract, schema, migration, deploy, push, restart,
  protected smoke, production mutation, credential, secret, browser, database,
  Docker, server, provider, or watcher action.

## Definition of Done
- [x] Code builds without errors: not applicable; no runtime code changed.
- [x] Feature works manually through the real UI, API, CLI, or operator path:
      not applicable; evidence-only curation.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers: not applicable.
- [x] Backend and UI/client error handling exists where applicable: not
      applicable.
- [x] No existing functionality is broken by this evidence-only change.
- [x] Feature works after restart, reload, or navigation refresh where
      applicable: not applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded
      where applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: scanner rerun, app-completion rerun, `npm run architecture:status`.
- Manual checks: full classifier extraction identified targeted rows before
  override.
- Screenshots/logs: terminal output recorded in issue closure.
- High-risk checks: no protected/runtime path touched.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Requirements matrix updated: not applicable.
- Quality scenarios updated: not applicable.
- Risk register updated: not applicable.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: evidence-only, not applicable.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: architecture status gate passed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: not applicable.
- Data classification: public repository architecture/status evidence.
- Trust boundaries: no credential or production access.
- Secret handling: no secret access; no protected smoke.
- Security tests or scans: not required for docs-only evidence curation.
- Fail-closed behavior: protected actions stayed excluded.
- Residual risk: source-control closure for this dirty evidence batch remains
  with the appropriate closure lane.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/scanner-overrides.json`,
  `docs/graphs/architecture-health.json`,
  `docs/status/app-completion-index.json`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no.
- Approval reference if architecture changed: evidence mapping only.
- Follow-up architecture doc updates: none beyond scanner overrides and state.

## Deployment / Ops Evidence
- Deploy impact: none.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: none.
- Rollback note: revert `docs/architecture/scanner-overrides.json` entries and
  rerun scanner/app-completion.
- Observability or alerting impact: none.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: not applicable; no deploy path.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to the architecture lane.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] AI testing evidence is not applicable.
- [x] Deployment gate evidence is not applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated because repository truth changed.
- [x] Learning journal was not updated because no recurring pitfall was
      confirmed.
- [x] Required responsibility lanes were integrated.
- [x] Parent validation ran after accepted lane integration.

## Result Report
- Task summary: targeted app-completion evidence curation reduced browser
  review needs from `10` to `0` and missing doc links from `2` to `0`.
- Files changed: `docs/architecture/scanner-overrides.json`, generated
  architecture/app-completion/status outputs, this task packet, and state
  context files.
- How tested: scanner rerun, app-completion rerun, `npm run
  architecture:status`.
- What is incomplete: broad app-completion missing-test debt remains outside
  this issue.
- Next steps: source-control closure for the refreshed generated/status packet
  is delegated to [LUC-5411](/LUC/issues/LUC-5411).
- Decisions made: generic API mount rows were not force-classified into a user
  flow; only defensible utility/shared primitive false positives were curated.

## Notes
Residual unclassified workflow count remains scanner-level missing-test debt,
not browser/doc-link debt. It should be handled through future proof selection
or classifier design, not by inventing product flows in this lane.
