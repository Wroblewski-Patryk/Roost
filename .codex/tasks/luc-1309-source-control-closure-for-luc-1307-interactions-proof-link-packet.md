# Task

## Header
- ID: LUC-1309
- Title: Source-control closure for the LUC-1307 interactions proof-link packet
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Roost Product Manager
- Depends on: LUC-1307
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Interactions proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: source-control coherence, redaction safety, generated-status drift
- Iteration: 2026-07-16-LUC-1309
- Operation Mode: BUILDER
- Mission ID: LUC-1309-SOURCE-CONTROL-CLOSURE
- Mission Status: DONE

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
- Mission objective: classify the local dirty packet produced by [LUC-1307](/LUC/issues/LUC-1307), prove it is coherent and redact-safe, and close it with an attributable local commit.
- Release objective advanced: keep the Roost workspace free of anonymous generated/state churn before the next docs or QA lane starts.
- Included slices: bounded git review, representative generated readback, redaction check, closure packet, source-of-truth state updates, and local commit.
- Explicit exclusions: no runtime feature edits, no deploy, no push, no restart, no production mutation, no new proof rerun, and no secret disclosure.
- Checkpoint cadence: single heartbeat.
- Stop conditions: mixed ownership, unscoped dirty paths, redaction hit, verification contradiction, or generated readback showing unrelated drift.
- Handoff expectation: none if the packet remains coherent and commit-ready.

## Context
`LUC-1307` linked the exact `src/app.ts#/interactions` mount to the existing
protected API proof, refreshed architecture/app-completion/Project Truth
outputs, and updated the source-of-truth state files. That left one local dirty
packet of state, generated docs, the new LUC-1307 task packet, and no runtime
feature edits.

## Goal
Classify the LUC-1307 dirty packet as current or stale, record the decision,
and close it with a local commit if the packet is coherent.

## Scope
- `.codex/tasks/luc-1307-prove-unclassified-user-workflow-missing-test-link-for-use-interactions.md`
- `.codex/tasks/luc-1309-source-control-closure-for-luc-1307-interactions-proof-link-packet.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `docs/architecture/scanner-overrides.json`
- `docs/graphs/**`
- `docs/status/**`

## Implementation Plan
1. Inspect the dirty packet with bounded git commands and focused diffs.
2. Read back representative generated artifacts to verify they reflect the LUC-1307 proof-link closure and next routed gaps.
3. Run closure-specific validation, JSON parse checks, and a bounded redaction scan.
4. Record the classification, update source-of-truth wording from open follow-up to closed packet, and commit the coherent packet locally.

## Acceptance Criteria
- [x] The dirty path groups are classified with provenance tied to LUC-1307.
- [x] Validation commands, readback results, and redaction outcome are recorded.
- [x] The commit vs no-commit decision is explicit and justified.
- [x] Source-of-truth files no longer describe the closure packet as still open.

## Result Report
- Dirty path groups reviewed:
  - source-of-truth state: `.agents/state/*`, `.codex/context/*`
  - authored proof-link packet: `.codex/tasks/luc-1307-*.md`, `docs/architecture/scanner-overrides.json`
  - generated graphs and status indexes: `docs/graphs/*`, `docs/status/*`
- Classification: `current`
- Provenance: LUC-1307 proof-link closure for `src/app.ts#/interactions` plus the expected architecture-awareness, app-completion, and Project Truth regeneration chain
- Validation:
  - `git status --short`
  - `git diff --stat`
  - `git diff --numstat`
  - focused `git diff --` on authored/state/generated representative files
  - `git diff --check`
  - JSON parse checks for `docs/architecture/scanner-overrides.json`, `docs/graphs/architecture-awareness.json`, `docs/status/app-completion-index.json`, and `docs/status/project-truth-index.json`
  - bounded high-confidence redaction scan across changed paths
- Readback result: `USE /interactions` no longer appears as `missing_test_link`; app-completion now reports `missingTestLink=20` and keeps `USE /interactions` only as `missing_doc_link`; Project Truth routes the same symbol to Docs Memory Lead + Project Manager and advances the next QA-owned `missing_test_link` gap to `src/app.ts#/mcp`.
- Commit decision: commit locally
- Commit SHA: recorded in the issue closeout evidence after the local commit
- Push status: held for batch
- Deploy impact: none
- Residual risk: the LUC-1307 proof-link gap is closed and committed; remaining product follow-up belongs to the docs-owned `src/app.ts#/interactions` gap and the next QA-owned routed proof gap on `src/app.ts#/mcp`.
