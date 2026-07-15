# Task

## Header
- ID: LUC-1219
- Title: Unclassified user workflow `USE /deals` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1197](/LUC/issues/LUC-1197)
- Priority: P1
- Coverage Ledger Rows: Unclassified user workflow `src/app.ts#/deals` `missing_doc_link`
- Module Confidence Rows: `Deals documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route documentation-link drift for protected Deals aliases
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1219-USE-DEALS-DOC-LINK
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
  `src/app.ts#/deals` by documenting the protected Deals endpoint family in an
  accepted API contract, linking the exact route mount to that doc, and
  refreshing generated truth artifacts.
- Release objective advanced: remove the current unclassified documentation
  gap without changing runtime behavior.
- Included slices: one API-contract refinement, one documentation-links
  registry row, generated truth refresh, and narrow source-of-truth state
  updates.
- Explicit exclusions: no route or middleware logic changes, no protected
  smoke, no deployment, no production mutation, no new proof harness.
- Checkpoint cadence: confirm the exact gap, add doc contract and link, run
  the generated refresh chain, then close if the routed item disappears.
- Stop conditions: generated refresh fails, the exact gap persists, or the
  documentation source proves too weak to justify the link.
- Handoff expectation: close the issue if the row clears; otherwise route the
  residual exact blocker with evidence.

## Context
`LUC-1197` already proved the exact `src/app.ts#/deals` endpoint with existing
API tests and moved the same symbol from `missing_test_link` to
`missing_doc_link`. The remaining work is documentation stewardship only: make
the accepted API contract explicit for the protected Deals aliases and link the
exact route mount to that doc.

## Goal
Document the protected `/v1/deals` and compatibility `/deals` route family in
the accepted API contract, link `src/app.ts#/deals` to that contract, refresh
generated truth, and prove the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1219-prove-unclassified-user-workflow-missing-doc-link-for-use-deals.md`
- `.codex/tasks/luc-1219-completion-evidence.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated first gap is the exact `src/app.ts#/deals`
   `missing_doc_link` row.
2. Refine `docs/API.md` so the Deals section explicitly covers both `/v1` and
   compatibility aliases plus workspace-scoped behavior.
3. Link `src/app.ts#/deals` to that contract in
   `docs/architecture/relations/documentation-links.csv`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth
   outputs.
5. Update state files and issue evidence for the new routed gap after the
   exact row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/deals` as the first unclassified
  `missing_doc_link`.
- Gaps: `docs/API.md` listed only compatibility `/deals` routes and the
  documentation-links registry had no exact row for the mount.
- Inconsistencies: route behavior and test proof already exist, but the
  generated completion index could not discover accepted docs for the exact
  mount.
- Architecture constraints: stay inside documentation and generated-truth
  refresh; do not rewrite route behavior or duplicate tests.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/deals/deals.routes.ts`,
  `src/tests/api.test.ts`, `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/status/app-completion-index.md`,
  `docs/status/app-completion-index.json`,
  `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, and
  `.agents/state/next-steps.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv`
  now includes the exact `src/app.ts#/deals` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface
  for protected route contracts like Clients and Deals.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not
  missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /deals` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth gap for the
  unclassified user workflow.
- Why other candidates were deferred: they depend on the post-refresh queue
  and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  completion-evidence packet, generated truth artifacts, and narrow
  source-of-truth state summaries.
- Logic: use the existing API contract to document the protected Deals
  endpoint family and attach the exact route-mount entity to that contract.
- Edge cases: if the row persists after the link, record whether
  app-completion needs a stronger doc reference or another exact-entity
  relation.

### 4. Execute Implementation
- Implementation notes: `docs/API.md` now documents the protected
  `/v1/deals` routes alongside the compatibility `/deals` aliases, archive
  semantics, and workspace-scoped relation checks; the documentation-links
  registry now links the exact `src/app.ts#/deals` mount to that accepted API
  contract.

### 5. Verify and Test
- Validation performed:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. The first downstream refresh wave was launched in parallel with
  the graph rebuild and left stale app-completion routing for `USE /deals`;
  rerunning architecture-awareness, app-completion, and Project Truth
  sequentially against the refreshed graph cleared `src/app.ts#/deals`.
  App-completion now reports `missingDocLink=1`, and Project Truth advances the
  first routed gap to `src/app.ts#/decisions` `missing_test_link`.

### 6. Self-Review
- Simpler option considered: add only the CSV row without clarifying the `/v1`
  aliases in `docs/API.md`; rejected because the link would point to a weaker
  source-of-truth surface than adjacent protected route families.
- Technical debt introduced: no
- Scalability assessment: the fix should follow the same narrow doc-link
  pattern used for other exact route-mount closures.
- Refinements made: reran the downstream generators sequentially after the
  first stale readback so the final evidence reflects the refreshed graph
  rather than a parallel race.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, documentation-links registry, generated outputs,
  this task packet, sibling completion evidence, and narrow source-of-truth
  state summaries.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes protected
  `/v1/deals` behavior plus the compatibility `/deals` aliases.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/app.ts#/deals` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/deals` as
  `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted
  source-of-truth docs.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files reflect the next routed gap.
- [x] Paperclip issue disposition includes evidence and residual risk.

## Completion Evidence
- Completion artifact: `.codex/tasks/luc-1219-completion-evidence.md`
- Closeout rule: the task packet now uses terminal `Status: DONE` and terminal
  `Mission Status: DONE`, and the sibling completion-evidence artifact records
  the durable closure evidence consumed by architecture-awareness indexing.

## Result Report
- Outcome: completed focused documentation-link closure for
  `src/app.ts#/deals`.
- Evidence added:
  - `docs/API.md`
  - `docs/architecture/relations/documentation-links.csv`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3045` entities / `7775` relations / `16523` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`46` items / `4` flows / `27` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked)
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS at `2026-07-15T01:35:51.334Z` with public probes `pass`; first routed gap advanced to `src/app.ts#/decisions` `missing_test_link`
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`)
- Residual risk: the exact `/deals` doc gap is closed; the only remaining
  doc-link gap is user-configuration `src/app.ts#/connection`, while the first
  routed overall verification gap is `src/app.ts#/decisions`
  `missing_test_link`, which belongs to Test Automation Engineer + QA
  Regression Lead rather than this documentation lane.
