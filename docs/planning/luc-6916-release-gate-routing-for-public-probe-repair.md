# Task

## Header
- ID: LUC-6916
- Title: Deploy LUC-6913 public probe repair and verify Project Truth
- Task Type: release-gate-routing
- Current Stage: release
- Status: DONE
- Owner: CTO
- Parent: LUC-6913
- Child Blocker: LUC-6918
- Priority: P1
- Module Confidence Rows: Roost public runtime readiness probe
- Iteration: 2026-07-02
- Operation Mode: BUILDER
- Mission ID: LUC-6916
- Mission Status: RELEASE_GATE_CLOSED_AFTER_CHILD_DEPLOY

## Goal
Move the committed LUC-6913 public readiness/build-info repair toward
production verification without bypassing Roost release safety.

## Scope
- Application repo: `C:/Personal/Projekty/Aplikacje/Roost`
- Source commit: `6913628cf180a359bb0a3774d71c2b7855bfe0e5`
- Release target docs:
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `docs/operations/post-deploy-smoke.md`
  - `docs/operations/rollback-and-recovery.md`
- Public no-secret probes:
  - `https://api.roost.luckysparrow.ch/health`
  - `https://api.roost.luckysparrow.ch/v1/health`
  - `https://api.roost.luckysparrow.ch/ready`
  - `https://api.roost.luckysparrow.ch/v1/ready`
  - `https://roost.luckysparrow.ch/api/build-info`
  - `https://roost.luckysparrow.ch/`

## Implementation Plan
1. Confirm the LUC-6913 repair commit exists and identify current source-control
   posture.
2. Rerun the smallest local proof for the backend route repair.
3. Rerun public no-secret probes and Project Truth apply.
4. Decide whether the CTO lane can safely push/deploy or must route the release
   mutation to an Ops/DRE owner.
5. Create a first-class child blocker for the deploy/redeploy and smoke path.
6. Update state and close LUC-6916 with a durable disposition.

## Acceptance Criteria
- [x] Repair commit is identified: `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- [x] Local backend build still passes.
- [x] Public probes are refreshed without credentials.
- [x] Project Truth apply is refreshed with Roost public URLs.
- [x] Push/deploy decision respects dirty-worktree and production mutation
      policy.
- [x] Actual production mutation is routed to an accountable Ops/DRE child.
- [x] Production public probe passes after LUC-6918 deploys or records a
      deploy blocker.

## Validation Evidence
- Source-control readback:
  - `git log --oneline -8` shows `6913628c fix: expose Roost public readiness probes`.
  - `git show --stat HEAD` shows the repair changed `src/app.ts`,
    `src/health/health.routes.ts`, and `src/tests/api.test.ts`.
  - `git status --short --branch` shows `main...origin/main [ahead 133]` with
    broad unrelated dirty docs/state/frontend/test changes.
- Local verification:
  - `npm run build:server` PASS.
  - `npm run architecture:status` PASS: GREEN, `454` nodes / `765` relations /
    `35` chains, evidence queue `0`, chain worklist `0`, all gates pass.
  - `git diff --check` PASS with line-ending warnings only.
- Public no-secret probe:
  - `https://api.roost.luckysparrow.ch/health` -> `200`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
  - `https://api.roost.luckysparrow.ch/v1/health` -> `200`, same build.
  - `https://api.roost.luckysparrow.ch/ready` -> `401 missing_api_key`,
    request id `affc2db6-dad7-4524-8b4c-e80717ce8ee2`.
  - `https://api.roost.luckysparrow.ch/v1/ready` -> `401 missing_api_key`,
    request id `26df5739-f83b-4ed2-89f0-e155828277d1`.
  - `https://roost.luckysparrow.ch/api/build-info` -> `401 missing_api_key`,
    request id `d6c6cafa-6b23-43a0-a5e1-8a408c1a0221`.
  - `https://roost.luckysparrow.ch/` -> `200`.
- Project Truth apply:
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - Generated `2026-07-02T15:06:07.674Z`.
  - `projectTruth.status=gaps_require_routing`, `criticalRuntimeFindings=1`,
    `operationalGateGaps=2`, `public_runtime_probe=failed`.
  - Public probe failures remain `web_build_info` `401` and `api_ready` `401`.

## Result Report
- Integration update: child [LUC-6918](/LUC/issues/LUC-6918) deployed commit
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5` to the Roost Coolify production
  app `rnqqkhl3o3dut4qv56mlxly2`, and this CTO gate rechecked the parent
  acceptance criteria after child completion.
- Parent-level production proof, `2026-07-02T15:17Z`:
  - `https://api.roost.luckysparrow.ch/health` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/v1/health` -> `200`, same commit.
  - `https://api.roost.luckysparrow.ch/ready` -> `200`, same commit.
  - `https://api.roost.luckysparrow.ch/v1/ready` -> `200`, same commit.
  - `https://roost.luckysparrow.ch/api/build-info` -> `200`, same commit.
  - `https://roost.luckysparrow.ch/` -> `200`.
  - `https://api.roost.luckysparrow.ch/v1/connection` -> `401
    missing_api_key` without credentials, confirming the protected API remains
    fail-closed.
- Project Truth apply:
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - Generated `2026-07-02T15:17:41.570Z`.
  - `publicProbe.status=pass`, `criticalRuntimeFindings=0`,
    `operationalGateGaps=0`, and `totalGaps=0`.
- Parent validation: `npm run architecture:status` PASS (`GREEN`, `454`
  nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist
  `0`, all gates pass).
- Source-control readback: local `HEAD` and `origin/main` both point to
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`; the shared worktree remains
  mixed dirty from unrelated docs/status/frontend state, so no new commit was
  created by this CTO integration heartbeat.
- Final disposition: [LUC-6916](/LUC/issues/LUC-6916) can close as `done`.
  No remaining blocker or child follow-up remains for the public probe repair
  release gate.

## Original Routing Report
- CTO decision: do not push or mutate production from this lane. The current
  worktree is still dirty with unrelated docs/state/frontend/test changes, and
  Roost release policy requires named target resource, rollback, and smoke
  facts before a push/redeploy mutation.
- Routed child: created [LUC-6918](/LUC/issues/LUC-6918), assigned to
  Deployment & Reliability Engineer, to perform the clean release/deploy path
  for commit `6913628c` or record a precise deploy blocker.
- Deploy impact: production-impacting backend route repair pending; no schema
  migration.
- Protected actions: none. No credential value read, secret disclosure,
  protected smoke, provider mutation, push, deploy, restart, browser, Docker,
  database, or production mutation occurred.
- Source-control disposition: no new commit was created by LUC-6916. Generated
  Project Truth/status files were refreshed as verification evidence inside the
  already mixed-dirty shared workspace.
- Final disposition: [LUC-6916](/LUC/issues/LUC-6916) is blocked by
  [LUC-6918](/LUC/issues/LUC-6918).
