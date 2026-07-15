# Task

## Header
- ID: LUC-1253
- Title: Source-control closure for the LUC-1252 departments doc-link packet
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Review
- Depends on: LUC-1252
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Departments documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: source-control coherence, redaction safety, task-index status drift
- Iteration: 2026-07-15-LUC-1253
- Operation Mode: BUILDER
- Mission ID: LUC-1253-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task improves release confidence without changing product runtime behavior.

## Mission Block
- Mission objective: classify the local dirty packet produced by [LUC-1252](/LUC/issues/LUC-1252), prove it is coherent and redact-safe, remove the observable task-index status ambiguity, and close it with an attributable local commit.
- Release objective advanced: keep the Roost workspace free of anonymous generated/state churn before the next routed proof lane starts.
- Included slices: bounded git review, representative generated readback, redaction check, one task-packet normalization for scanner alignment, closure packet, source-of-truth state updates, and local commit.
- Explicit exclusions: no runtime feature edits, no deploy, no push, no restart, no production mutation, no new app-completion or Project Truth rerun, and no secret disclosure.
- Checkpoint cadence: single heartbeat.
- Stop conditions: mixed ownership, unscoped dirty paths, redaction hit, verification contradiction, or generated refresh showing new unrelated drift.
- Handoff expectation: none if the packet remains coherent and commit-ready.

## Context
`LUC-1252` documented the exact `src/app.ts#/departments` route family in the
accepted API contract, linked the route mount in the documentation-link
registry, refreshed architecture/app-completion/Project Truth outputs, and
updated the source-of-truth state files. That left one local dirty packet of
state, generated docs, the new LUC-1252 task artifacts, and no runtime code
changes.

## Goal
Classify the LUC-1252 dirty packet as current or stale, record the decision,
remove scanner ambiguity if needed, and close it with a local commit if the
packet is coherent.

## Scope
- `.codex/tasks/luc-1252-prove-unclassified-user-workflow-missing-doc-link-for-use-departments.md`
- `.codex/tasks/luc-1252-completion-evidence.md`
- `.codex/tasks/luc-1253-source-control-closure-for-luc-1252-departments-doc-link-packet.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `docs/graphs/**`
- `docs/status/**`

## Implementation Plan
1. Inspect the dirty packet with bounded git commands and focused diffs.
2. Read back representative generated artifacts to verify they reflect the LUC-1252 doc-link closure and next routed gap.
3. Run closure-specific validation and a bounded redaction scan.
4. Normalize any scanner-visible task-status ambiguity that would otherwise leave the packet internally inconsistent.
5. Record the classification, update source-of-truth wording from routed to closed, and commit the coherent packet locally.

## Acceptance Criteria
- [x] The dirty path groups are classified with provenance tied to LUC-1252.
- [x] Validation commands, readback results, and redaction outcome are recorded.
- [x] The commit vs no-commit decision is explicit and justified.
- [x] Any scanner-visible task status ambiguity in the packet is either corrected or recorded as an accepted residual risk.

## Result Report
- Dirty path groups reviewed:
  - source-of-truth state: `.agents/state/*`, `.codex/context/*`
  - authored doc-link packet: `.codex/tasks/luc-1252-*.md`, `docs/API.md`, `docs/architecture/relations/documentation-links.csv`
  - generated graphs and status indexes: `docs/graphs/*`, `docs/status/*`
- Classification: `current`
- Provenance: LUC-1252 doc-link closure for `src/app.ts#/departments` plus the expected architecture-awareness, app-completion, and Project Truth regeneration chain
- Validation:
  - `git status --short`
  - `git diff --stat`
  - `git diff --numstat`
  - focused `git diff --` on authored/state/generated representative files
  - `git diff --check`
  - bounded high-confidence redaction scan across changed paths
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
- Readback result: `USE /departments` no longer appears as `missing_doc_link`; app-completion now reports `missingDocLink=1`; Project Truth routes `USE /events` as the next proof-owned gap while `src/app.ts#/connection` remains the only docs-owned gap.
- Task-index drift review: the refreshed proof register initially marked the new LUC-1252 task packet `in_progress` while the file declared `Status: DONE`; the packet was normalized by changing `Mission Status: VERIFIED` to `Mission Status: DONE` to match the established doc-link packet shape before refresh.
- Commit decision: commit locally
- Commit SHA: recorded in the issue closeout evidence after the local commit
- Push status: not performed
- Deploy impact: none
- Residual risk: the LUC-1252 docs gap is closed and committed; remaining product follow-up belongs to the docs-owned `src/app.ts#/connection` gap and the QA-owned routed proof gap on `src/app.ts#/events`.
