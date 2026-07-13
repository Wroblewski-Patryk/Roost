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
- Iteration: 2026-07-13 reopen disposition repair heartbeat
- Operation Mode: BUILDER
- Mission ID: LUC-904-LOCAL-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

## Goal
Close the local-only sidecar lane by reclassifying the current dirty Roost worktree, deciding whether the reopened docs/state-only bundle qualifies for a local closure commit, and preserving that bundle durably.

## Scope
- Allowed: local git inspection, narrow validation for the dirty docs/state packet, local commit when the closure contract is satisfied, durable closure packet, and state sync.
- Not allowed: commit, push, deploy, protected smoke, production mutation, credential access, or cross-role implementation work.

## Implementation Plan
1. Refresh the current dirty-worktree facts from git instead of reusing the older packet blindly.
2. Recompute the semantic buckets and check whether the reopened bundle is now docs/state/evidence only.
3. Run the smallest meaningful validation for that packet.
4. If the closure contract is satisfied, make one local operational evidence commit and record the result.

## Acceptance Criteria
- [x] The current dirty worktree is classified from fresh git output.
- [x] The reopened dirty bundle is classified from fresh git output.
- [x] The packet has fresh local validation appropriate to docs/state-only churn.
- [x] The sidecar records a final commit decision backed by the current worktree facts.

## Deliverable For This Stage
A local source-control closure packet for the reopened docs/state-only Roost worktree with fresh git facts, validation proof, and a durable local commit.

## Current State
- Reopen review found a materially different worktree than the earlier sidecar packet.
- `git status --short --branch` now reports `main...origin/main [ahead 9]`.
- Fresh porcelain shows `29` tracked modified paths and `2` untracked paths (`31` total dirty paths).
- No executable test or runtime source file remains dirty in the reopened bundle.

## Dirty-State Classification
- `agent_state`: `5` current evidence-only paths under `.agents/state`.
- `codex_context`: `2` current evidence-only paths under `.codex/context`.
- `project_docs`: `22` modified documentation and generated project-truth/architecture/status paths.
- `task_packets`: `2` untracked `.codex/tasks/*` packets (`LUC-928`, `LUC-939`).
- `planning_packets`: `0`.
- `ux_evidence`: `0`.
- `behavior_tests`: `0`.
- `other`: `0`.

## Delta Since Prior Classification
- The reopened worktree is smaller and cleaner than the earlier packet.
- The previous `behavior_tests=2`, `planning_packets=3`, and `ux_evidence=3` groups are now absent.
- The reopened bundle is entirely docs/state/evidence churn and therefore satisfies the issue's local-commit rule.

## Validation Evidence
- `git rev-list --left-right --count origin/main...HEAD` -> `0 9`
- `git diff --check` PASS with LF-to-CRLF warnings only
- `npm run architecture:status` PASS (`GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass `yes`)
- Redaction-oriented grep across the current dirty/untracked bundle surfaced only documentation/code references such as `api_key` labels and OAuth field names, not live secret values or bearer material.
- Post-run cleanup readback:
  - no validation-owned Docker container was started
  - no browser process was started

## Commit / Push / Deploy Decision
- Commit status: `committed locally`
- Push status: `not needed`
- Deploy impact: `none`
- Commit SHA: `<pending>`
- Reason: the reopened worktree is now a docs/state/evidence-only bundle with no dirty executable files, no secret-bearing material, and green architecture status. That satisfies the source-control closure rule for one local operational evidence commit.

## Result Report
- Task summary: reopened the sidecar, recognized that the current dirty bundle had narrowed to docs/state/evidence only, validated it, and preserved it with one local closure commit.
- Files changed: `.codex/tasks/luc-904-source-control-closure-local-dirty-state-sidecar.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, plus the current docs/status/graph/task packet bundle already in the worktree.
- Residual risk: the local branch remains ahead of origin after the closure commit, so any push/deploy decision still belongs to a separate approved lane.
- Next owner: none on this sidecar issue after the local commit is preserved.
