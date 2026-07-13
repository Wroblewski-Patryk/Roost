# Task

## Header
- ID: LUC-904
- Title: Roost source-control closure local dirty state sidecar
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Depends on: [LUC-721](/LUC/issues/LUC-721), [LUC-726](/LUC/issues/LUC-726), [LUC-727](/LUC/issues/LUC-727), [LUC-736](/LUC/issues/LUC-736), [LUC-742](/LUC/issues/LUC-742), [LUC-754](/LUC/issues/LUC-754), [LUC-776](/LUC/issues/LUC-776), [LUC-777](/LUC/issues/LUC-777), [LUC-778](/LUC/issues/LUC-778), [LUC-786](/LUC/issues/LUC-786), [LUC-787](/LUC/issues/LUC-787), [LUC-788](/LUC/issues/LUC-788), [LUC-822](/LUC/issues/LUC-822), [LUC-893](/LUC/issues/LUC-893), [LUC-894](/LUC/issues/LUC-894)
- Priority: high
- Iteration: 2026-07-13 sidecar closure heartbeat
- Operation Mode: BUILDER
- Mission ID: LUC-904-LOCAL-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

## Goal
Close the local-only sidecar lane by reclassifying the current dirty Roost worktree, refreshing the proof for the two executable dirty files, and reporting a commit/no-commit decision back to the blocked parent path.

## Scope
- Allowed: local git inspection, focused validation for the dirty executable tests, durable closure packet, and state sync.
- Not allowed: commit, push, deploy, protected smoke, production mutation, credential access, or cross-role implementation work.

## Implementation Plan
1. Refresh the current dirty-worktree facts from git instead of reusing the older packet blindly.
2. Recompute the semantic buckets and note the delta since [LUC-822](/LUC/issues/LUC-822).
3. Re-run the smallest meaningful proof for the two dirty executable files.
4. Record the local closure decision and hand the evidence back to the blocked parent path.

## Acceptance Criteria
- [x] The current dirty worktree is classified from fresh git output.
- [x] The dirty executable test files have fresh proof in the current checkout.
- [x] The sidecar issue records an explicit `not committed` local closure decision and names the next owner.

## Deliverable For This Stage
A local source-control closure packet for the mixed dirty Roost worktree with fresh git facts, focused proof, and a durable no-commit decision.

## Current State
- `git status --short --branch` still reports `main...origin/main [ahead 4]`.
- Fresh porcelain shows `90` tracked modified paths and `19` untracked paths (`109` total dirty paths).
- The worktree remains mixed and cannot be safely collapsed into one coherent commit from a PM closure lane.

## Dirty-State Classification
- `agent_state`: `6` current evidence-only paths under `.agents/core` and `.agents/state`.
- `codex_context`: `3` current evidence-only paths under `.codex/context`.
- `project_docs`: `79` modified documentation and generated project-truth/architecture/status paths.
- `task_packets`: `13` untracked `.codex/tasks/*` packets.
- `planning_packets`: `3` untracked `docs/planning/luc-*` packets.
- `ux_evidence`: `3` untracked `docs/ux/evidence/luc-727-strategy-route-local-proof/*` artifacts.
- `behavior_tests`: `2` modified executable proof files: `src/tests/api.test.ts` and `src/tests/google-drive-auth.test.ts`.
- `other`: `0`.

## Delta Since Prior Classification
- The semantic shape is unchanged from [LUC-822](/LUC/issues/LUC-822): the only behavior-impacting dirty paths are still the two test files.
- Untracked evidence grew from the earlier packet because newer proof/task artifacts are now present for [LUC-893](/LUC/issues/LUC-893) and [LUC-894](/LUC/issues/LUC-894), plus the Strategy proof screenshots/report surfaced as individual untracked files.
- No new runtime source file outside the existing test surfaces entered the dirty bundle.

## Validation Evidence
- `git rev-list --left-right --count origin/main...HEAD` -> `0 4`
- `git diff --check` PASS with LF-to-CRLF warnings only
- `npm run build:server` PASS
- `node --test dist/tests/google-drive-auth.test.js` PASS (`10/10`)
- `npm run test:api:local` PASS (`8/8`)
- Post-run cleanup readback:
  - `docker ps --format "{{.Names}}" | Select-String -Pattern 'companycore-luc-'` -> no validation-owned container remained
  - `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` -> no process remained

## Commit / Push / Deploy Decision
- Commit status: `not committed`
- Push status: `not needed`
- Deploy impact: `none`
- Reason: the worktree is still a mixed packet spanning prior completed proof lanes, generated status churn, shared state pointers, planning artifacts, UX evidence, and the two already-validated executable proof files. A PM sidecar closure lane can classify and verify this state, but it should not manufacture a synthetic commit that crosses many already-completed issue packets.

## Result Report
- Task summary: refreshed the local dirty-state classification, re-proved the two executable dirty tests, and closed the sidecar lane with a durable no-commit decision.
- Files changed: `.codex/tasks/luc-904-source-control-closure-local-dirty-state-sidecar.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`.
- Residual risk: the shared Roost worktree remains intentionally dirty and ahead of origin, so any later commit lane must still stage a coherent subset rather than sweep this whole packet together.
- Next owner: the blocked parent delivery-gate path should consume this local closure evidence; no further PM action remains on this sidecar issue unless the dirty bundle changes again.
