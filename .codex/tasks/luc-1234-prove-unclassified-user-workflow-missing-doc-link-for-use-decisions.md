# Task

## Header
- ID: LUC-1234
- Title: Unclassified user workflow `USE /decisions` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1226](/LUC/issues/LUC-1226)
- Priority: P1
- Coverage Ledger Rows: Unclassified user workflow `src/app.ts#/decisions` `missing_doc_link`
- Module Confidence Rows: `Decisions documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route documentation-link drift for protected Decisions aliases
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1234-USE-DECISIONS-DOC-LINK
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
  `src/app.ts#/decisions` by strengthening the accepted Decisions API contract,
  linking the exact route mount to that contract, and refreshing generated
  truth artifacts.
- Release objective advanced: remove the current unclassified documentation
  gap without changing runtime behavior.
- Included slices: one API-contract refinement, one documentation-links
  registry row, generated truth refresh, one completion-evidence packet, and
  narrow source-of-truth state updates.
- Explicit exclusions: no route or middleware logic changes, no protected
  runtime smoke, no deployment, no production mutation, and no new test
  harness authoring.
- Checkpoint cadence: confirm the exact gap, strengthen the Decisions docs and
  relation, run the refresh chain, then update state and close if the routed
  row disappears.
- Stop conditions: generated refresh fails, the exact gap persists, or the
  accepted API section proves too weak to justify the link.
- Handoff expectation: close the issue if the row clears; otherwise route the
  residual exact blocker with evidence.

## Context
`LUC-1226` already proved the exact `src/app.ts#/decisions` endpoint family
with existing API tests and moved the same symbol from `missing_test_link` to
`missing_doc_link`. `docs/API.md` already contained the Decisions route list,
but it did not fully state the workspace-scoped contract, archive-on-delete
behavior, project visibility guard, or emitted lifecycle events that the exact
route mount depends on, and `docs/architecture/relations/documentation-links.csv`
had no exact row for `src/app.ts#/decisions`.

## Goal
Document the protected `/v1/decisions` and compatibility `/decisions` route
family in the accepted API contract strongly enough for the graph to treat it
as source-of-truth documentation, link `src/app.ts#/decisions` to that
contract, refresh generated truth, and prove the `missing_doc_link` row is
cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1234-prove-unclassified-user-workflow-missing-doc-link-for-use-decisions.md`
- `.codex/tasks/luc-1234-completion-evidence.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated first gap is the exact `src/app.ts#/decisions`
   `missing_doc_link` row.
2. Refine `docs/API.md` so the Decisions section explicitly covers both `/v1`
   and compatibility aliases plus workspace-scoped behavior, archive semantics,
   and emitted lifecycle events.
3. Link `src/app.ts#/decisions` to that contract in
   `docs/architecture/relations/documentation-links.csv`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth
   outputs.
5. Update state files and issue evidence for the new routed gap after the
   exact row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/decisions` as the first
  unclassified `missing_doc_link`.
- Gaps: the accepted API docs listed Decisions endpoints, but the exact
  route-mount relation was missing and the section lacked the verified behavior
  details already exercised by the protected API suite.
- Inconsistencies: route behavior and test proof already exist, but generated
  completion truth could not discover accepted docs for the exact mount.
- Architecture constraints: stay inside documentation and generated-truth
  refresh; do not rewrite route behavior or duplicate tests.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/decisions/decisions.routes.ts`,
  `src/tests/api.test.ts`, `src/modules/decisions/README.md`, `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/status/app-completion-index.json`,
  `docs/status/project-truth-index.json`,
  `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, and
  `.agents/state/next-steps.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv`
  now includes the exact `src/app.ts#/decisions` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface
  for protected route contracts like Clients, Deals, and Decisions.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not
  missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /decisions` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth gap for the
  unclassified user workflow.
- Why other candidates were deferred: they depend on the post-refresh queue
  and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  the sibling completion-evidence packet, generated truth artifacts, and
  narrow source-of-truth state summaries.
- Logic: strengthen the existing Decisions API contract and attach the exact
  route-mount entity to that contract.
- Edge cases: if the row persists after the stronger docs and exact relation,
  record whether the app-completion pipeline needs another exact-entity
  document relation or a graph refresh ordering fix.

### 4. Execute Implementation
- Implementation notes: `docs/API.md` now documents the protected
  `/v1/decisions` routes alongside the compatibility `/decisions` aliases,
  workspace scoping, project visibility guard, archive-on-delete semantics,
  and emitted lifecycle events; the documentation-links registry now links the
  exact `src/app.ts#/decisions` mount to that accepted API contract.

### 5. Verify and Test
- Validation performed:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. Refreshed architecture-awareness materialized the exact
  documentation relation, app-completion no longer reports
  `api_endpoint:use-decisions:b29cd45684` as `missing_doc_link`, and Project
  Truth advances the first routed gap to `src/app.ts#/departments`
  `missing_test_link`.

### 6. Self-Review
- Simpler option considered: add only the CSV row without strengthening the
  Decisions section in `docs/API.md`; rejected because the exact route would
  have pointed at a weaker source-of-truth surface than adjacent protected
  CRUD route families.
- Technical debt introduced: no
- Scalability assessment: the fix follows the same narrow doc-link pattern
  used for Deals and Clients while making the Decisions contract explicit
  enough for future route-mount reuse.
- Refinements made: reused the existing accepted API surface instead of
  creating a new docs file or parallel contract.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, documentation-links registry, generated outputs,
  this task packet, sibling completion evidence, and narrow source-of-truth
  state summaries.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes protected
  `/v1/decisions` behavior plus the compatibility `/decisions` aliases.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/app.ts#/decisions` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/decisions` as
  `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted
  source-of-truth docs.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files reflect the next routed gap.
- [x] Paperclip issue disposition includes evidence and residual risk.

## Completion Evidence
- Completion artifact: `.codex/tasks/luc-1234-completion-evidence.md`
- Closeout rule: the task packet now uses terminal `Status: DONE` and terminal
  `Mission Status: DONE`, and the sibling completion-evidence artifact records
  the durable closure evidence consumed by architecture-awareness indexing.

## Result Report
- Outcome: completed focused documentation-link closure for
  `src/app.ts#/decisions`.
- Evidence added:
  - `docs/API.md`
  - `docs/architecture/relations/documentation-links.csv`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS with public probes `pass` and first routed gap advanced to `src/app.ts#/departments` `missing_test_link`
  - `npm run architecture:status` PASS
- Residual risk: the exact `/decisions` doc gap is closed. The next routed
  overall verification gap is `src/app.ts#/departments` `missing_test_link`,
  which belongs to Test Automation Engineer + QA Regression Lead rather than
  this documentation lane.
