# Task

## Header
- ID: LUC-958
- Title: Roost source-control closure for LUC-949 dirty state
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Depends on: [LUC-949](/LUC/issues/LUC-949)
- Priority: high
- Iteration: 2026-07-13 closure heartbeat
- Operation Mode: BUILDER
- Mission ID: LUC-958-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

## Goal
Classify the current local dirty state tied to [LUC-949](/LUC/issues/LUC-949),
rerun the smallest safe local validation for the current packet, and make a
durable local commit/no-commit decision.

## Scope
- Allowed: local git inspection, dirty-state classification, redaction-oriented
  inspection, durable closure packet, source-of-truth sync, and a local commit
  when the packet is coherent and secret-safe.
- Not allowed: push, deploy, protected smoke, production mutation, credential
  access, or runtime feature changes beyond preserving the already-created
  [LUC-949](/LUC/issues/LUC-949) proof packet.

## Implementation Plan
1. Refresh the exact dirty worktree facts from git instead of reusing the
   previous verification packet.
2. Separate current [LUC-949](/LUC/issues/LUC-949)-owned files from unrelated
   churn and confirm whether the test file and generated artifacts remain one
   coherent packet.
3. Re-run the smallest meaningful local validation for the current packet and
   inspect it for redaction risk.
4. Commit the coherent local proof/state/generated packet if it remains
   current, non-secret, and commit-eligible.

## Acceptance Criteria
- [x] The current dirty worktree is classified from fresh git output with exact
  in-scope buckets.
- [x] Local validation is recorded for the current packet.
- [x] Redaction-oriented inspection records whether the dirty bundle is safe to
  preserve locally.
- [x] The issue records the final local commit decision with verification and
  remaining dirty-path status.

## Deliverable For This Stage
A source-control closure packet for the current [LUC-949](/LUC/issues/LUC-949)
dirty state with exact git facts, validation, redaction-oriented inspection,
and the final local commit decision.

## Current State
- `git status --short --branch` reports `main...origin/main [ahead 11]`.
- Fresh porcelain before this closure packet shows `29` modified tracked paths
  plus `2` untracked task-owned files:
  `.codex/tasks/luc-949-account-access-secrets-proof.md` and
  `src/tests/secrets.test.ts`.
- The dirty set contains the current [LUC-949](/LUC/issues/LUC-949) proof
  packet and its derivative generated/state refresh; no unrelated runtime
  implementation files, local env files, or secret-bearing artifacts are dirty.

## Dirty-State Classification
- `agent_core`: `1` current source-of-truth path:
  `.agents/core/project-memory-index.md`.
- `agent_state`: `5` current source-of-truth paths under `.agents/state`:
  `active-mission.md`, `current-focus.md`, `module-confidence-ledger.md`,
  `next-steps.md`, and `system-health.md`.
- `codex_context`: `2` current source-of-truth paths:
  `.codex/context/PROJECT_STATE.md` and `.codex/context/TASK_BOARD.md`.
- `project_docs_generated`: `21` current generated/config/planning paths:
  `docs/architecture/scanner-overrides.json`, `docs/graphs/*` (`5`),
  `docs/planning/mvp-next-commits.md`, and `docs/status/*` (`14`).
- `task_packets`: `2` local packets:
  `.codex/tasks/luc-949-account-access-secrets-proof.md` and this closure
  packet after it is created.
- `behavior_tests`: `1` path: `src/tests/secrets.test.ts`.
- `behavior_or_runtime_paths_outside_scope`: `0`.
- `stale_or_out_of_scope`: `0`.

## LUC-949 Ownership Decision
- `src/tests/secrets.test.ts`, `docs/architecture/scanner-overrides.json`, the
  generated graph/status artifacts, the task packet, and the related
  `.agents/*` and `.codex/context/*` updates are current and in-scope for
  [LUC-949](/LUC/issues/LUC-949).
- The remaining dirty files are derivative churn from the same proof/status
  refresh and are coherent with the exact local verification packet rather than
  unrelated user-owned work.
- No stale, secret-risk, unresolved user-owned, or out-of-scope dirty paths
  were found in this closure pass.

## Validation Evidence
- `git rev-list --left-right --count origin/main...HEAD` -> `0 11`
- `git diff --check` PASS with LF-to-CRLF warnings only
- `git diff --stat` -> `29` tracked files changed before this closure packet
  (`9746` insertions, `9387` deletions), all inside docs/state/generated
  surfaces; plus `2` untracked task-owned files
- `npm run build:server` PASS
- `node --test dist/tests/secrets.test.js` PASS (`3/3`)
- Redaction-oriented inspection across the current packet found no live-token
  markers such as `BEGIN PRIVATE KEY`, `ghp_`, `xox`, `AIza`, or provider
  secret values; matches were synthetic test strings and documentation/code
  references only

## Commit / Push / Deploy Decision
- Commit status: `committed in this closure lane`
- Push status: `not needed`
- Deploy impact: `none`
- Reason: the current worktree is a coherent proof/state/generated packet for
  [LUC-949](/LUC/issues/LUC-949) plus this closure record, validation is
  clean, and the bundle contains no runtime drift beyond the new focused proof
  test or redaction blocker.

## Result Report
- Task summary: classified the current [LUC-949](/LUC/issues/LUC-949) dirty
  set, confirmed it is entirely the exact proof/test plus derivative
  docs/state/generated churn, recorded a redaction-safe validation pass, and
  closed the lane with a local commit.
- Files changed: `src/tests/secrets.test.ts`,
  `.codex/tasks/luc-949-account-access-secrets-proof.md`,
  `.codex/tasks/luc-958-source-control-closure-for-luc-949.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `.agents/core/project-memory-index.md`, `.agents/state/active-mission.md`,
  `.agents/state/current-focus.md`, `.agents/state/module-confidence-ledger.md`,
  `.agents/state/next-steps.md`, `.agents/state/system-health.md`,
  `docs/architecture/scanner-overrides.json`, `docs/graphs/*`,
  `docs/planning/mvp-next-commits.md`, and `docs/status/*`.
- Residual risk: the [LUC-949](/LUC/issues/LUC-949) packet is preserved
  locally, but the next first Project Truth gap is now
  `src/modules/company-os/company-os.routes.ts#authActor`
  `missing_test_link`.
- Next owner: Test Automation Engineer + QA Regression Lead for the new first
  Project Truth gap; no further PM source-control action is needed for the
  [LUC-949](/LUC/issues/LUC-949) packet after this commit.
