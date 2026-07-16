# Task

## Header
- ID: LUC-1304
- Title: Source-control closure for the LUC-1296 intake doc-link packet
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Review
- Depends on: LUC-1296
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Intake documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: source-control coherence, redaction safety, task-index status drift
- Iteration: 2026-07-16-LUC-1304
- Operation Mode: BUILDER
- Mission ID: LUC-1304-SOURCE-CONTROL-CLOSURE
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
- Mission objective: classify the local dirty packet produced by [LUC-1296](/LUC/issues/LUC-1296), prove it is coherent and redact-safe, remove the observable task-status ambiguity, and close it with an attributable local commit when the scanner can represent the task as finished.
- Release objective advanced: keep the Roost workspace free of anonymous generated/state churn before the next routed proof or docs lane starts.
- Included slices: bounded git review, representative generated readback, one finished-state normalization in the LUC-1296 packet, closure packet, source-of-truth state updates, and local commit.
- Explicit exclusions: no runtime feature edits, no deploy, no push, no restart, no production mutation, no new app-completion proof work, and no secret disclosure.
- Checkpoint cadence: single heartbeat.
- Stop conditions: mixed ownership, unscoped dirty paths, redaction hit, verification contradiction, or generated readback showing unrelated drift.
- Handoff expectation: route scanner/task-status follow-up to Engineering Delivery Lead if the packet remains coherent but the generated architecture task node cannot reach a finished state.

## Context
`LUC-1296` linked the exact `src/app.ts#/intake` mount to the accepted Intake API contract in `docs/API.md`, refreshed the generated architecture/status outputs, and updated the source-of-truth state files. That left a local dirty packet of state, generated docs, one documentation-links row, and the new `LUC-1296` task artifacts. A first pass found one scanner-visible inconsistency: the refreshed architecture graph classified the task entity as `in_progress` instead of a finished state. [LUC-1305](/LUC/issues/LUC-1305) then normalized the packet shape and reran the refresh chain so the same task entity now scans as `verified`.

## Goal
Classify the LUC-1296 dirty packet as current or stale, confirm the generated architecture task node now represents a finished state, and close the packet with a local commit.

## Scope
- `.codex/tasks/luc-1296-prove-account-access-missing-doc-link-for-use-intake.md`
- `.codex/tasks/luc-1296-completion-evidence.md`
- `.codex/tasks/luc-1304-source-control-closure-for-luc-1296-intake-doc-link-packet.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `docs/graphs/**`
- `docs/status/**`

## Implementation Plan
1. Inspect the dirty packet with bounded git commands and focused diffs.
2. Read back representative generated artifacts to verify they reflect the LUC-1296 doc-link change and isolate any internal inconsistency.
3. Attempt the smallest safe local corrections for the false `in_progress` task classification.
4. Refresh generated architecture outputs, rerun closure-specific validation, and either close the packet or record the exact blocker plus next owner.

## Acceptance Criteria
- [x] The dirty path groups are classified with provenance tied to LUC-1296.
- [x] Validation commands, readback results, and redaction outcome are recorded.
- [x] The commit vs no-commit decision is explicit and justified.
- [x] The task-status ambiguity that scanned `LUC-1296` as `in_progress` is either corrected or recorded as a first-class blocker with evidence.

## Deliverable For This Stage
An evidence-backed source-control review record for the LUC-1296 packet, including packet classification, scanner-resolution confirmation, and the final local commit decision.

## Definition Of Done
- [x] The dirty packet is classified and either committed or explicitly held with reason.
- [x] Source-of-truth files reflect the completed closure outcome.
- [x] The issue can end with repository path, files changed, validation, commit status, push status, deploy impact, and residual follow-up.

## Result Report
- Dirty path groups reviewed:
  - source-of-truth state: `.codex/context/*`, `.agents/state/*`
  - authored documentation linkage/task artifacts: `docs/architecture/relations/documentation-links.csv`, `.codex/tasks/luc-1296-*.md`
  - generated outputs: `docs/graphs/*`, `docs/status/*`
- Classification: `current`, coherent, and attributable to the LUC-1296 doc-link refresh chain.
- Readback result before correction: the exact `src/app.ts#/intake` doc-link gap was closed, but the refreshed architecture proof register initially classified `.codex/tasks/luc-1296-prove-account-access-missing-doc-link-for-use-intake.md` as `in_progress`.
- Correction attempts applied:
  - normalized the LUC-1296 task header to the same finished-state wording/schema used by earlier verified doc-link packets;
  - added a narrow `docs/architecture/scanner-overrides.json` entry for `.codex/tasks/luc-1296-prove-account-access-missing-doc-link-for-use-intake.md`.
- Resolution result: [LUC-1305](/LUC/issues/LUC-1305) expanded the LUC-1296 task packet to the same evidence-rich task-contract shape already recognized by neighboring verified packets, reran the architecture/app-completion/Project Truth refresh chain, and moved `task:task:77784c1c77` to `verified` in both `docs/graphs/architecture-awareness.csv` and `docs/graphs/architecture-proof-register.csv`.
- Validation:
  - `git status --short --branch`
  - `git diff --stat`
  - `git diff --numstat`
  - focused `git diff --` on authored/state/generated representative files
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/LuckySparrowSoftwareHouse/skills/architecture/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/LuckySparrowSoftwareHouse/skills/project-truth/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=http://127.0.0.1:3000 ROOST_API_PUBLIC_URL=http://127.0.0.1:3000 node C:/Personal/Projekty/Aplikacje/LuckySparrowSoftwareHouse/skills/project-truth/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
  - `git diff --check`
  - JSON parse checks for `docs/graphs/architecture-awareness.json`, `docs/status/app-completion-index.json`, and `docs/status/project-truth-index.json`
  - bounded high-confidence redaction scan across changed paths
- Commit decision: committed after scanner resolution and bounded closure verification
- Commit status: local closure commit created for the coherent LUC-1296/LUC-1305/LUC-1304 packet
- Push status: not performed
- Deploy impact: none
- Residual risk: source-control closure is complete for this packet. Product follow-up still belongs to the docs-owned `src/app.ts#/connection` gap and the next QA-owned routed proof gap on `src/app.ts#/interactions`.
