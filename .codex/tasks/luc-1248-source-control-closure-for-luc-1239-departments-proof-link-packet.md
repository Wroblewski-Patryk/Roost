# Task

## Header
- ID: LUC-1248
- Title: Source-control closure for the LUC-1239 departments proof-link packet
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Review
- Depends on: LUC-1239
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Departments proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: source-control coherence, redaction safety, task-index status drift
- Iteration: 2026-07-15-LUC-1248
- Operation Mode: BUILDER
- Mission ID: LUC-1248-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

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
- Mission objective: classify the local dirty packet produced by [LUC-1239](/LUC/issues/LUC-1239), prove it is coherent and redact-safe, and close it with an attributable local commit.
- Release objective advanced: keep the Roost workspace free of anonymous generated/state churn before the next routed proof or docs lane starts.
- Included slices: bounded git review, generated artifact readback, redaction check, closure packet, source-of-truth wording cleanup, and local commit.
- Explicit exclusions: no runtime feature edits, no deploy, no push, no restart, no production mutation, no new proof-generation rerun, and no secret disclosure.
- Checkpoint cadence: single heartbeat.
- Stop conditions: mixed ownership, unscoped dirty paths, redaction hit, or validation contradiction.
- Handoff expectation: none if the packet remains coherent and commit-ready.

## Context
`LUC-1239` linked the existing `/v1/departments` API proof to
`src/app.ts#/departments`, refreshed architecture/app-completion/Project Truth
artifacts, and updated the source-of-truth state files. That left a single
local dirty packet of state, generated docs, one scanner override, and the new
LUC-1239 task packet. This issue owns the source-control closure decision for
that packet.

## Goal
Classify the LUC-1239 dirty packet as current or stale, record the decision,
and close it with a local commit if the packet is coherent.

## Scope
- `.codex/tasks/luc-1239-prove-unclassified-user-workflow-missing-test-link-for-use-departments.md`
- `.codex/tasks/luc-1248-source-control-closure-for-luc-1239-departments-proof-link-packet.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `docs/architecture/scanner-overrides.json`
- `docs/graphs/**`
- `docs/status/**`

## Implementation Plan
1. Inspect the dirty packet with bounded git commands and focused diffs.
2. Read back the representative generated artifacts to verify they reflect the LUC-1239 proof-link change.
3. Run closure-specific validation and redaction checks.
4. Record the classification, update source-of-truth wording from routed to closed, and commit the coherent packet locally.

## Acceptance Criteria
- [x] The dirty path groups are classified with provenance tied to LUC-1239.
- [x] Validation commands, readback results, and redaction outcome are recorded.
- [x] The commit vs no-commit decision is explicit and justified.

## Result Report
- Dirty path groups reviewed:
  - source-of-truth state: `.agents/state/*`, `.codex/context/*`
  - authored proof-link docs: `.codex/tasks/luc-1239-*.md`, `docs/architecture/scanner-overrides.json`
  - generated graphs and status indexes: `docs/graphs/*`, `docs/status/*`
- Classification: `current`
- Provenance: LUC-1239 proof-link closure for `src/app.ts#/departments` plus the expected architecture-awareness, app-completion, and Project Truth regeneration chain
- Validation:
  - `git status --short --branch`
  - `git diff --stat`
  - `git diff --numstat`
  - focused `git diff --` on authored/state/generated representative files
  - `git diff --check`
  - bounded high-confidence redaction scan across authored dirty paths
- Readback result: `USE /departments` left `missing_test_link`; app-completion now reports `missingTestLink=25` and `missingDocLink=2`; Project Truth routes the same symbol as docs-owned `missing_doc_link` while the next QA-owned routed gap is `USE /events`.
- Commit decision: commit locally
- Commit SHA: recorded in the issue closeout evidence after the local commit
- Push status: not performed
- Deploy impact: none
- Residual risk: the LUC-1239 route proof gap is closed and committed; the remaining product follow-up belongs to the docs-owned `missing_doc_link` on `src/app.ts#/departments` and the QA-owned routed proof gap on `src/app.ts#/events`.
