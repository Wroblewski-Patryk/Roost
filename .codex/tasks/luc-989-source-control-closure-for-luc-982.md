# Task

## Header
- ID: LUC-989
- Title: Roost source-control closure for LUC-982 dirty state
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Depends on: [LUC-982](/LUC/issues/LUC-982)
- Priority: medium
- Iteration: 2026-07-14 closure heartbeat
- Operation Mode: BUILDER
- Mission ID: LUC-989-SOURCE-CONTROL-CLOSURE
- Mission Status: VERIFIED

## Goal
Classify the current local dirty state tied to [LUC-982](/LUC/issues/LUC-982),
decide whether the proof packet is still safely commit-eligible, and record a
durable local closure outcome.

## Scope
- Allowed: local git inspection, dirty-state classification, redaction-oriented
  inspection, durable closure packet, and source-of-truth state sync for the
  current [LUC-982](/LUC/issues/LUC-982) packet.
- Not allowed: push, deploy, protected smoke, production mutation, credential
  access, or runtime feature changes beyond preserving the already-created
  [LUC-982](/LUC/issues/LUC-982) proof packet.

## Implementation Plan
1. Refresh the exact dirty worktree facts from git instead of reusing the
   earlier sidecar snapshot.
2. Separate current [LUC-982](/LUC/issues/LUC-982)-owned files from later
   proof, doc-link, UX-evidence, and planning churn.
3. Confirm whether the current mixed packet is commit-safe or requires a
   truthful no-commit decision.
4. Preserve the outcome in a durable closure packet and canonical state files.

## Acceptance Criteria
- [x] The current dirty worktree is classified from fresh git output with exact
  tracked and untracked counts.
- [x] The closure packet records whether [LUC-982](/LUC/issues/LUC-982) is
  still locally isolatable.
- [x] The final local commit decision is recorded with git evidence and the
  next owner path.
- [x] Canonical state files point future runs to the closure packet instead of
  reopening the same recount.

## Deliverable For This Stage
A source-control closure packet for the current [LUC-982](/LUC/issues/LUC-982)
dirty state with exact git facts, mixed-packet classification, and the final
local no-commit decision.

## Current State
- `git status --short --branch` reports `main...origin/main [ahead 13]`.
- Fresh porcelain before this closure packet showed `32` modified tracked paths
  and `15` untracked paths.
- The dirty set still includes core [LUC-982](/LUC/issues/LUC-982) proof
  surfaces such as `src/tests/api.test.ts`,
  `docs/architecture/scanner-overrides.json`,
  `.codex/tasks/luc-982-account-access-intake-authactor-proof.md`,
  `docs/graphs/*`, `docs/status/*`, and source-of-truth state files.
- The same dirty set also includes later-lane churn outside a clean
  [LUC-982](/LUC/issues/LUC-982) closure boundary, including
  [LUC-988](/LUC/issues/LUC-988) and [LUC-990](/LUC/issues/LUC-990)
  doc-link packets, [LUC-971](/LUC/issues/LUC-971) and
  [LUC-998](/LUC/issues/LUC-998) UX proof artifacts, and newer workforce
  proof packets such as [LUC-997](/LUC/issues/LUC-997) and
  [LUC-997](/LUC/issues/LUC-997).

## Dirty-State Classification
- `agent_state`: `5` current source-of-truth paths under `.agents/state`:
  `active-mission.md`, `current-focus.md`, `module-confidence-ledger.md`,
  `next-steps.md`, and `system-health.md`.
- `codex_context`: `2` current source-of-truth paths:
  `.codex/context/PROJECT_STATE.md` and `.codex/context/TASK_BOARD.md`.
- `project_docs_current`: `2` modified documentation paths outside the original
  [LUC-982](/LUC/issues/LUC-982) proof bundle: `docs/API.md` and
  `docs/architecture/relations/documentation-links.csv`.
- `project_docs_generated`: `15` modified generated/config/planning paths:
  `docs/architecture/scanner-overrides.json`, `docs/graphs/*` (`5`),
  `docs/planning/mvp-next-commits.md`, and `docs/status/*` (`8`).
- `task_packets`: current untracked task/planning/evidence/script paths include
  the original [LUC-982](/LUC/issues/LUC-982) packet plus later packets for
  [LUC-971](/LUC/issues/LUC-971), [LUC-988](/LUC/issues/LUC-988),
  [LUC-990](/LUC/issues/LUC-990), [LUC-997](/LUC/issues/LUC-997),
  [LUC-998](/LUC/issues/LUC-998), and [LUC-997](/LUC/issues/LUC-997).
- `behavior_tests`: `1` shared path: `src/tests/api.test.ts`.
- `behavior_or_runtime_paths_outside_scope`: `1` shared runtime-adjacent doc
  surface, `docs/API.md`, plus later issue packets that depend on newer state.
- `stale_or_out_of_scope`: mixed later-lane artifacts are present, so the dirty
  bundle is no longer one isolated [LUC-982](/LUC/issues/LUC-982) packet.

## LUC-982 Ownership Decision
- The original [LUC-982](/LUC/issues/LUC-982) proof evidence is still present
  locally and remains readable through
  `.codex/tasks/luc-982-account-access-intake-authactor-proof.md`.
- The current worktree is no longer safely isolatable to just
  [LUC-982](/LUC/issues/LUC-982) because the shared dirty state now includes
  later Account access doc-link work, newer workforce proof packets, dashboard
  frontend evidence, and updated docs/state/generated files that represent a
  newer combined packet.
- Creating a local commit in this sidecar would either omit currently dirty
  later-lane dependencies or misrepresent the resulting commit as an isolated
  [LUC-982](/LUC/issues/LUC-982) closure.
- No secret-risk blocker was found in this closure pass; the blocker is packet
  isolation, not redaction safety.

## Validation Evidence
- `git rev-list --left-right --count origin/main...HEAD` -> `0 13`
- `git diff --check` PASS with LF-to-CRLF warnings only
- `git status --short --branch` fresh readback: `32` modified tracked paths and
  `15` untracked paths before this closure packet
- Focused readback confirms the original [LUC-982](/LUC/issues/LUC-982) proof
  surfaces are still dirty locally, but they are mixed with later packets such
  as `.codex/tasks/luc-988-account-access-intake-authactor-doc-link.md`,
  `.codex/tasks/luc-990-account-access-intake-authactor-doc-link.md`,
  `docs/ux/evidence/luc-971-authenticated-image-proof/`,
  `docs/ux/evidence/luc-998-dashboard-public-home-proof/`, and
  `scripts/luc-998-dashboard-public-home-proof.mjs`.

## Commit / Push / Deploy Decision
- Commit status: `not committed in this closure lane`
- Push status: `not needed`
- Deploy impact: `none`
- Reason: the original [LUC-982](/LUC/issues/LUC-982) proof packet is no
  longer one coherent local closure bundle. The current worktree is a newer
  mixed packet, so the truthful closure outcome is to preserve the packet and
  record a no-commit decision instead of creating a misleading isolated commit.

## Result Report
- Task summary: refreshed git evidence for the
  [LUC-982](/LUC/issues/LUC-982) sidecar, confirmed the original proof packet
  is still present locally, and closed the lane with a durable no-commit
  decision because the shared dirty worktree has moved on to a newer combined
  packet.
- Files changed: `.codex/tasks/luc-989-source-control-closure-for-luc-982.md`,
  `.agents/state/active-mission.md`, `.agents/state/current-focus.md`,
  `.agents/state/next-steps.md`, `.agents/state/system-health.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and
  `docs/planning/mvp-next-commits.md`.
- Residual risk: the original proof is preserved, but any future local commit
  should be scoped as a fresh combined source-control closure for the current
  mixed packet rather than another isolated [LUC-982](/LUC/issues/LUC-982)
  sidecar.
- Next owner: board operator / Roost Project Manager sequencing lane for
  either a fresh combined source-control closure issue or explicit
  supersession/cancellation of this isolated sidecar family.
