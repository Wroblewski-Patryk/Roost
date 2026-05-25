# V1OPS Production Operations Context Smoke Task Contract

## Header

- ID: V1OPS-005
- Title: V1OPS Production Operations Context Smoke
- Task Type: release
- Current Stage: post-release
- Status: DONE
- Owner: Ops/Release + QA/Test
- Depends on: V1OPS-004
- Priority: P1
- Coverage Ledger Rows: CCORE-DM-001A, CCORE-DM-001C
- Module Confidence Rows: V1OPS-005
- Requirement Rows: REQ-V1OPS-005
- Quality Scenario Rows: QA-V1OPS-005
- Risk Rows: RISK-V1OPS-002, RISK-V1OPS-004
- Iteration: 2026-05-16
- Operation Mode: TESTER
- Mission ID: V1OPS-005
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps were represented.
- [x] Exactly one priority release task was selected.
- [x] Operation mode is TESTER because this is production smoke for a pushed
      V1OPS backend route.
- [x] Deployment contract and post-deploy smoke docs were reviewed.
- [x] PostgreSQL volume preservation and rollback container retention were
      verified.
- [x] Source-of-truth files were updated after production proof.

## Mission Block

- Mission objective: deploy and verify the V1OPS-004 operations context route
  in production.
- Included slices: manual VPS rollover, public health checks, protected
  operations context smoke, cleanup, source-of-truth updates.
- Explicit exclusions: no database migration beyond existing startup deploy
  migrations, no data mutation smoke, no frontend redesign.
- Stop conditions: canary health failure, final health mismatch, protected
  route failure, or Postgres container disruption.

## Goal

Production must run commit `9ff18820cb00bb2164904b947c2ef2a48e5d3b14` and
protected `GET /v1/operations/context` must return the read-only
`04-operacje` packet.

## Scope

- Production VPS Docker backend
- `docs/operations/post-deploy-smoke.md`
- `docs/planning/v1ops-production-operations-context-smoke-task-contract.md`
- relevant source-of-truth state files

## Implementation Plan

1. Check public health before deploy.
2. Build a production image from the pushed commit archive on the VPS.
3. Run a canary container on the existing production network with inherited
   runtime env and new build metadata.
4. Stop and retain the previous backend as rollback, then run the new backend.
5. Verify public health and protected operations context.
6. Remove temporary local and VPS rollout artifacts.
7. Update source-of-truth docs and queues.

## Acceptance Criteria

- [x] Public API and web health report commit
      `9ff18820cb00bb2164904b947c2ef2a48e5d3b14`.
- [x] Production Postgres container remains running.
- [x] Previous backend container is retained stopped as rollback.
- [x] Protected `GET /v1/operations/context` returns
      `department.canonicalKey=04-operacje`,
      `backendAreaKey=operations-administration`, and `agentPacket.mode=read_only`.
- [x] Temporary rollout artifacts are removed locally and from `/tmp` on the
      VPS.

## Definition of Done

- [x] Release checks completed.
- [x] Smoke evidence recorded.
- [x] Rollback target recorded.
- [x] No secrets are written to repository docs.
- [x] Source-of-truth files updated.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` expectations
      checked.

## Validation Evidence

- Local/source:
  - V1OPS-004 `npm run build:server` passed.
  - V1OPS-004 `npm run test:api` passed on `127.0.0.1:55495`.
  - `git diff --check` passed before V1OPS-004 commit.
- Deployment:
  - Production was previously on commit
    `5f1fc71e44d09cb1780d29b2579c85023205efb9`.
  - Manual VPS rollover built image
    `rnqqkhl3o3dut4qv56mlxly2_backend:9ff18820cb00bb2164904b947c2ef2a48e5d3b14`.
  - Canary local `/health` returned the expected commit.
  - Final backend local `/health` returned the expected commit.
- Public smoke:
  - `https://api.companycore.luckysparrow.ch/health` returned `status=ok` and
    the expected commit.
  - `https://companycore.luckysparrow.ch/health` returned `status=ok` and the
    expected commit.
- Protected smoke:
  - Owner login succeeded without recording token material.
  - `GET /v1/operations/context` returned:
    - `department.canonicalKey=04-operacje`
    - `department.backendAreaKey=operations-administration`
    - `summary.procedures=7`
    - `agentPacket.mode=read_only`
    - `blockedActions=4`
- Cleanup:
  - Temporary local archive and rollout script were removed.
  - Temporary VPS archive and rollout script were removed.
  - Final backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882`.
  - Rollback backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71-previous-9ff1882`.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: production public health and protected
  `/v1/operations/context`.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: startup migrations completed during
  canary/final boot; no new migration was introduced.
- Error state verified: V1OPS-004 API regression covers auth and scoped-key
  denial.
- Regression check performed: production health plus protected route smoke.

## Result Report

- Task summary: deployed V1OPS-004 to production and verified the protected
  operations context read packet.
- Files changed: source-of-truth docs only after deployment.
- How tested: public health, protected owner-auth route smoke, remote
  container/readiness checks.
- What is incomplete: no defect found; future operations writes still require
  their own command contracts.
- Next steps: continue outside the V1OPS group with the next department system
  slice, likely `01 Strategy` read packet or a guarded `04 Operations` command
  contract.
