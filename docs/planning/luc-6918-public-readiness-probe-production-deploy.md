# LUC-6918 Public Readiness Probe Production Deploy

## Goal

Deploy Roost repair commit `6913628cf180a359bb0a3774d71c2b7855bfe0e5`
and verify the public Project Truth runtime probes.

## Scope

- Application repo: `C:/Personal/Projekty/Aplikacje/Roost`
- Source commit: `6913628cf180a359bb0a3774d71c2b7855bfe0e5`
- Remote/branch: `origin main`
- Coolify target: `LuckySparrow` project, production environment,
  application `Roost`, application UUID `rnqqkhl3o3dut4qv56mlxly2`
- Public endpoints: web root, web `/api/build-info`, API `/health`,
  API `/ready`, API `/v1/ready`
- Protected negative check: API `/v1/connection` without API key

## Implementation Plan

1. Confirm source SHA, dirty worktree posture, remote branch state, and
   deployment target facts.
2. Use a clean detached release worktree for the push because the shared
   primary workspace is mixed dirty.
3. Push `6913628cf180a359bb0a3774d71c2b7855bfe0e5` to `origin/main`.
4. Watch public health/readiness until Coolify auto-redeploy is visible.
5. Run Project Truth apply with the Roost public URLs.
6. Record release evidence and issue disposition.

## Acceptance Criteria

- Production health reports deployed commit
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- Public no-secret probes return `200` for `/ready`, `/v1/ready`, and
  `/api/build-info`.
- `/v1/connection` remains fail-closed without an API key.
- Project Truth apply reports no public runtime probe failure.

## Definition Of Done

- Source SHA and rollback SHA are recorded.
- Push/deploy path is recorded.
- Public smoke and Project Truth evidence are recorded.
- Residual risk and cleanup are recorded.

## Result Report

- Release path: created a clean detached worktree at
  `../Roost-release-luc-6918` from
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5` because the primary shared
  workspace was mixed dirty.
- Push: `git push origin HEAD:main` moved `origin/main` from
  `5c6fff326d47b442763c0d78b52bf9306ce3bd9a` to
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- Deploy evidence: public probes initially still served old build
  `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, then briefly returned
  `503 no available server`, then recovered at commit
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- Public smoke after recovery:
  - `https://api.roost.luckysparrow.ch/health` returned `200` at commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/ready` returned `200` at commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/v1/ready` returned `200` at commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://roost.luckysparrow.ch/api/build-info` returned `200` at commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://roost.luckysparrow.ch/` returned `200`.
  - `https://api.roost.luckysparrow.ch/v1/connection` returned `401
    missing_api_key` without an API key.
- Project Truth: public-url apply generated `2026-07-02T15:12:14.899Z`;
  `publicProbe.status=pass`, `criticalRuntimeFindings=0`,
  `operationalGateGaps=0`, and `totalGaps=0`.
- Rollback target: previous production/remote source
  `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
- Cleanup: temporary release worktree was removed after verification.
- Limits: no protected smoke, credential value read, secret disclosure,
  database mutation, browser session, Docker container, or manual Coolify
  restart was used.
