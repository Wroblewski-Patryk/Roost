# LUC-3678 Source-Control Dirty Groups From Control Tick

Status: DONE
Task type: source-control closure
Current stage: release
Last updated: 2026-06-13
Owner: Roost Project Manager
Mission ID: LUC-3678-SOURCE-CONTROL-DIRTY-GROUP-CLOSURE

## Goal

Classify the dirty groups reported by the Paperclip control tick, preserve the
coherent Roost work packet, exclude local execution-worktree metadata, and close
the source-control lane with verification evidence.

## Scope

- Primary workspace inspected: `C:/Personal/Projekty/Aplikacje/Roost`.
- Issue worktree inspected:
  `.paperclip/worktrees/LUC-3678-roost-pm-source-classify-and-close-source-control-dirty-groups-from-control-tick`.
- Included dirty groups:
  - Process Core read-only runtime packet:
    `src/modules/process-core/process-core.routes.ts`, `src/app.ts`,
    `src/auth/capabilities.ts`, `src/auth/agent-key-profiles.ts`,
    `src/mcp/manifest.ts`, `src/tests/api.test.ts`,
    `scripts/check-route-capabilities.mjs`.
  - Architecture scanner hygiene and generated architecture/status refresh:
    `docs/architecture/scanner-overrides.json`, `docs/graphs/*`,
    `docs/status/*`.
  - Roost PM, readiness, key-evidence, QA, docs-memory, and source-control
    planning packets under `docs/planning/luc-*.md`.
  - Source-of-truth state pointers:
    `.agents/state/*`, `.codex/context/PROJECT_STATE.md`,
    `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`.
- Excluded from commit: `.paperclip/worktrees/*` execution workspace metadata.

## Classification

| Group | Paths | Decision | Evidence |
| --- | --- | --- | --- |
| G1 Process Core read-only packet | `src/modules/process-core`, `src/app.ts`, auth/MCP/test/script files | Preserve and commit | Implements `GET /v1/process-core/coverage` as a protected read-only packet with `process-core:read`, MCP/profile visibility, and API assertions. |
| G2 Scanner hygiene and generated reports | `docs/architecture/scanner-overrides.json`, `docs/graphs/*`, `docs/status/*` | Preserve and commit | LUC-3543 evidence records scanner override support and refreshed architecture reports with generated artifact rows excluded. |
| G3 Planning/evidence packets | `docs/planning/luc-2584...luc-3545*.md` plus existing planning updates | Preserve and commit | Packets are issue-scoped evidence for key-bearing MCP proof, readiness reviews, Process Core audit/coverage, QA proof ladder, and dirty-state closures. |
| G4 State/source-of-truth pointers | `.agents/state/*`, `.codex/context/*`, `docs/planning/mvp-next-commits.md` | Preserve and commit | These files synchronize the completed and partially verified lanes into durable project memory. |
| G5 Execution worktree metadata | `.paperclip/worktrees/*` | Exclude | Local Paperclip worktree checkout directories are runtime metadata, not source. |

## Acceptance Criteria

- [x] Dirty groups are classified by ownership and decision.
- [x] Local execution-worktree metadata is excluded from source commit scope.
- [x] Coherent source/docs/state packet is preserved without reverting other
      agents' work.
- [x] Verification boundary is recorded.
- [x] Paperclip issue receives final disposition with files, checks, commit,
      push, deploy impact, residual risk, and next owner.

## Verification

- `git status --short --branch` in the issue worktree:
  `LUC-3678...origin/main` with no dirty files.
- `git status --short --branch` in the primary Roost workspace before closure:
  `main...origin/main [ahead 12]` with Process Core runtime changes,
  docs/state/report changes, planning packets, and `.paperclip/worktrees/*`
  metadata.
- `git diff --stat` showed a coherent packet spanning Process Core, generated
  architecture reports, planning packets, and state pointers.
- `git diff --check` PASS with line-ending normalization warnings only.
- `npm run check:route-capabilities` PASS
  (`checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`).
- `npm run build` PASS.
- Prior packet evidence records `npm run test:api:local` BLOCKED by
  unavailable Docker Desktop Linux engine, not by an observed Process Core code
  failure.

## Definition Of Done

- [x] No revert, reset, broad deletion, push, deploy, restart, protected smoke,
      production mutation, credential access, or secret disclosure occurred.
- [x] Only coherent project source/docs/state files are committed.
- [x] `.paperclip/worktrees/*` remains excluded.
- [x] Remaining validation blocker is named with owner/action.

## Result Report

Decision: preserve and commit the coherent dirty packet. The packet closes
recent Roost PM/source-control continuity, Process Core read-only coverage,
architecture scanner/report hygiene, key-bearing MCP evidence, readiness, and
QA proof-ladder documentation into source control.

Residual risk: `npm run test:api:local` remains blocked until the local
environment owner enables Docker Desktop Linux engine or provides an authorized
disposable `companycore_test` `DATABASE_URL`. This does not block source-control
closure because the blocker is already captured in the Process Core and QA
packets.
