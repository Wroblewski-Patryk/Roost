# Task

## Header
- ID: LUC-1151
- Title: Unclassified user workflow `USE /api/build-info` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1135](/LUC/issues/LUC-1135)
- Priority: P1
- Coverage Ledger Rows: Unclassified user workflow `src/app.ts#/api/build-info` `missing_doc_link`
- Module Confidence Rows: `Unclassified user workflow api/build-info documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route documentation-link drift for public build metadata alias
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1151-USE-API-BUILD-INFO-DOC-LINK
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: close the routed Project Truth `missing_doc_link` gap for
  `src/app.ts#/api/build-info` by documenting the public build metadata alias in
  an accepted API contract, linking the exact entity to that doc, and
  refreshing generated truth artifacts.
- Release objective advanced: remove the first routed unclassified
  documentation gap without changing runtime behavior.
- Included slices: one API-contract addition, one documentation-links registry
  row, generated truth refresh, and narrow source-of-truth state updates.
- Explicit exclusions: no route or middleware logic changes, no protected smoke,
  no deployment, no production mutation, no new proof harness.
- Checkpoint cadence: confirm the exact gap, add doc contract and link, run the
  generated refresh chain, then close if the routed item disappears.
- Stop conditions: generated refresh fails, the exact gap persists, or the
  documentation source proves too weak to justify the link.
- Handoff expectation: close the issue if the row clears; otherwise route the
  residual exact blocker with evidence.

## Context
`LUC-1135` already proved the exact `src/app.ts#/api/build-info` endpoint with
existing API tests and moved the same symbol from `missing_test_link` to
`missing_doc_link`. The remaining work is documentation stewardship only: add a
durable source-of-truth contract for the public build metadata alias and link
the exact route mount to that doc.

## Goal
Document the public `/api/build-info` compatibility route in an accepted API
contract, link `src/app.ts#/api/build-info` to that contract, refresh generated
truth, and prove the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1151-prove-unclassified-user-workflow-missing-doc-link-for-use-api-build-info.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated first gap is the exact `src/app.ts#/api/build-info`
   `missing_doc_link` row.
2. Add the public build metadata alias contract to `docs/API.md`.
3. Link `src/app.ts#/api/build-info` to that contract in
   `docs/architecture/relations/documentation-links.csv`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth
   outputs.
5. Update state files and issue evidence for the new routed gap after the exact
   row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/api/build-info` as the first
  unclassified `missing_doc_link`.
- Gaps: `docs/API.md` did not explicitly document the public `/api/build-info`
  alias, and the documentation-links registry had no exact row for the mount.
- Inconsistencies: route behavior and test proof already exist, but the
  generated completion index could not discover accepted docs for the exact
  mount.
- Architecture constraints: stay inside documentation and generated-truth
  refresh; do not rewrite route behavior or duplicate tests.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/tests/api.test.ts`, `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/status/app-completion-index.md`, `docs/status/project-truth-index.md`,
  `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, and
  `.agents/state/next-steps.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv`
  now includes the exact `src/app.ts#/api/build-info` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface
  for public route contracts like `/health`, `/ready`, and `/api/build-info`.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not missing
  runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /api/build-info` missing-doc-link closure (first gap).
- Priority rationale: it is the current routed Project Truth gap for the
  unclassified user workflow.
- Why other candidates were deferred: they depend on the post-refresh queue and
  should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  generated truth artifacts, and narrow source-of-truth state summaries.
- Logic: use the existing API contract to document public build metadata aliases
  and attach the exact route-mount entity to that contract.
- Edge cases: if the row persists after the link, record whether app-completion
  needs a stronger doc reference or another exact-entity relation.

### 4. Execute Implementation
- Implementation notes: `docs/API.md` now states that `/v1/health`, `/ready`,
  `/v1/ready`, and `/api/build-info` are public runtime metadata aliases that
  stay outside `requireApiKey`; the documentation-links registry now links
  `src/app.ts#/api/build-info` to that contract.

### 5. Verify and Test
- Validation performed:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. Generated truth no longer reports `src/app.ts#/api/build-info`
  as `missing_doc_link`; app-completion now reports `missingDocLink=0`, and
  Project Truth advances the first gap to `src/app.ts#/assets`
  `missing_test_link`.

### 6. Self-Review
- Simpler option considered: add only the CSV row without documenting the
  behavior in `docs/API.md`; rejected because the link would point to an
  incomplete source-of-truth surface.
- Technical debt introduced: no
- Scalability assessment: the fix follows the same narrow doc-link pattern used
  for other exact entity closures.
- Refinements made: scope stayed on one exact route alias and avoided broader
  health-route doc cleanup.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, documentation-links registry, generated outputs,
  and this task packet.
- Context updated: yes
- Learning journal updated: not applicable

## Completion Evidence
- Completion artifact: `.codex/tasks/luc-1151-completion-evidence.md`
- Closeout rule: the task packet now uses terminal `Status: DONE` and terminal
  `Mission Status: DONE`, and the sibling completion-evidence artifact records
  the durable closure evidence consumed by architecture-awareness indexing.

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes public
  `/api/build-info` behavior and its no-API-key guard posture.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/app.ts#/api/build-info` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/api/build-info`
  as `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted source-of-truth docs.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files reflect the next routed gap.
- [x] Paperclip issue disposition includes evidence and residual risk.

## Result Report
- Outcome: completed focused documentation-link closure for
  `src/app.ts#/api/build-info`.
- Evidence added:
  - `docs/API.md`
  - `docs/architecture/relations/documentation-links.csv`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3029` entities / `7631` relations / `16522` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`missingTestLink=33`, `missingDocLink=0`)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS with public probes `pass` and first gap advanced to `src/app.ts#/assets` `missing_test_link`
  - `npm run architecture:status` PASS (`GREEN`, `454/765/35`)
- Residual risk: the exact `/api/build-info` doc gap is closed; the next routed
  unclassified verification gap is `src/app.ts#/assets` `missing_test_link`,
  which belongs to Test Automation Engineer + QA Regression Lead rather than
  this documentation lane.
