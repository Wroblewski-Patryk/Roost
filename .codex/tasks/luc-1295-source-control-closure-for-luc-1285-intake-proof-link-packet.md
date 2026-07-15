# Task

## Header
- ID: LUC-1295
- Title: Source-control closure for the LUC-1285 intake proof-link packet
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Review
- Depends on: LUC-1285
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Intake proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: source-control coherence, redaction safety, task-index status drift
- Iteration: 2026-07-16-LUC-1295
- Operation Mode: BUILDER
- Mission ID: LUC-1295-SOURCE-CONTROL-CLOSURE
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
- Mission objective: classify the local dirty packet produced by [LUC-1285](/LUC/issues/LUC-1285), prove it is coherent and redact-safe, remove the observable task-status ambiguity, and close it with an attributable local commit.
- Release objective advanced: keep the Roost workspace free of anonymous generated/state churn before the next routed proof or docs lane starts.
- Included slices: bounded git review, representative generated readback, redaction check, one task-packet normalization for scanner alignment, closure packet, source-of-truth state updates, and local commit.
- Explicit exclusions: no runtime feature edits, no deploy, no push, no restart, no production mutation, no new proof rerun, and no secret disclosure.
- Checkpoint cadence: single heartbeat.
- Stop conditions: mixed ownership, unscoped dirty paths, redaction hit, verification contradiction, or generated readback showing unrelated drift.
- Handoff expectation: none if the packet remains coherent and commit-ready.

## Context
`LUC-1285` linked the exact `src/app.ts#/intake` mount to the existing protected
API proof, refreshed architecture/app-completion/Project Truth outputs, and
updated the source-of-truth state files. That left one local dirty packet of
state, generated docs, the new LUC-1285 task packet, and no runtime feature
edits.

## Goal
Classify the LUC-1285 dirty packet as current or stale, record the decision,
remove task-status ambiguity if needed, and close it with a local commit if the
packet is coherent.

## Scope
- `.codex/tasks/luc-1285-prove-unclassified-user-workflow-missing-test-link-for-use-intake.md`
- `.codex/tasks/luc-1295-source-control-closure-for-luc-1285-intake-proof-link-packet.md`
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
2. Read back representative generated artifacts to verify they reflect the LUC-1285 proof-link closure and next routed gaps.
3. Run closure-specific validation, JSON parse checks, and a bounded redaction scan.
4. Normalize any scanner-visible task-status ambiguity that would otherwise leave the packet internally inconsistent.
5. Record the classification, update source-of-truth wording from open packet to closed packet, and commit the coherent packet locally.

## Acceptance Criteria
- [x] The dirty path groups are classified with provenance tied to LUC-1285.
- [x] Validation commands, readback results, and redaction outcome are recorded.
- [x] The commit vs no-commit decision is explicit and justified.
- [x] Any scanner-visible task-status ambiguity in the packet is either corrected or recorded as an accepted residual risk.

## Result Report
- Dirty path groups reviewed:
  - source-of-truth state: `.agents/state/*`, `.codex/context/*`
  - authored proof-link packet: `.codex/tasks/luc-1285-*.md`, `docs/architecture/scanner-overrides.json`
  - generated graphs and status indexes: `docs/graphs/*`, `docs/status/*`
- Classification: `current`
- Provenance: LUC-1285 proof-link closure for `src/app.ts#/intake` plus the expected architecture-awareness, app-completion, and Project Truth regeneration chain
- Validation:
  - `git status --short --branch`
  - `git diff --stat`
  - `git diff --numstat`
  - focused `git diff --` on authored/state/generated representative files
  - `git diff --check`
  - JSON parse checks for `docs/status/app-completion-index.json` and `docs/status/project-truth-index.json`
  - bounded high-confidence redaction scan across changed paths
- Readback result: `USE /intake` no longer appears as `missing_test_link`; app-completion now reports `missingTestLink=21` and keeps `USE /intake` only as `missing_doc_link`; Project Truth routes `USE /interactions` as the next QA-owned `missing_test_link` gap while `src/app.ts#/connection` remains the other docs-owned gap.
- Task-index drift review: the new LUC-1285 task packet initially declared `Status: DONE` while keeping `Mission Status: VERIFIED`; the packet was normalized to `Mission Status: DONE` so the closure bundle uses one finished-state contract.
- Commit decision: commit locally
- Commit SHA: recorded in the issue closeout evidence after the local commit
- Push status: not performed
- Deploy impact: none
- Residual risk: the LUC-1285 proof-link gap is closed and committed; remaining product follow-up belongs to the docs-owned `src/app.ts#/intake` gap and the next QA-owned routed proof gap on `src/app.ts#/interactions`.
