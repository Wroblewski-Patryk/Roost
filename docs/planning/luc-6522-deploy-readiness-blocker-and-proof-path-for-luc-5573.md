# LUC-6522 Deploy Readiness Blocker And Proof Path For LUC-5573

Task Type: release/deploy gate evidence
Current Stage: verification
Deliverable For This Stage: blocker and proof-path record for
[LUC-5573](/LUC/issues/LUC-5573)

## Goal

Record the deploy/readiness proof path and protected-action blocker for
[LUC-5573](/LUC/issues/LUC-5573) without running any push, deploy, restart,
production mutation, protected smoke, live-account mutation, secret handling,
or irreversible action.

## Scope

- Parent issue: [LUC-5573](/LUC/issues/LUC-5573)
- Repair issue: [LUC-6522](/LUC/issues/LUC-6522)
- Repo path: `C:\Personal\Projekty\Aplikacje\Roost`
- Branch/source posture: local `main`, `origin/main...HEAD = 0 131`
- Source ref inspected: `e6c973017c18259411f7116f1fb923471035a9d8`
- Deploy contract: `docs/operations/coolify-vps-deployment-contract.md`
- Gate contract: `DEPLOYMENT_GATE.md`
- Smoke script path: `scripts/aog-deploy-smoke.mjs`

## Implementation Plan

1. Read the scoped wake payload and compact Paperclip heartbeat context.
2. Inspect local readiness contracts and scripts without reading secret values.
3. Run safe local evidence checks only.
4. Record the exact protected proof blocker and proof path on the parent issue.
5. Close [LUC-6522](/LUC/issues/LUC-6522) with source-control and deploy impact
   evidence.

## Acceptance Criteria

- Current Roost local readiness proof path is recorded with source/ref and safe
  command evidence.
- Protected target proof blocker is named without exposing secrets.
- Rollback/readiness evidence required before confidence-debt closure is named.
- No protected action or production mutation is performed.

## Evidence

- `git rev-parse HEAD`: `e6c973017c18259411f7116f1fb923471035a9d8`
- `git rev-list --left-right --count origin/main...HEAD`: `0 131`
- `npm run architecture:status`: PASS, `GREEN`, graph `454` nodes /
  `765` relations / `35` chains, evidence queue `0`, chain worklist `0`,
  delta `0/0/0`, all gates pass `yes`.
- `npm run check:route-capabilities`: PASS, `180` manifest routes /
  `35` route files, status `ok`.
- Package script readback:
  - `architecture:status`: present
  - `aog:deploy-smoke`: present, `node scripts/aog-deploy-smoke.mjs`
  - `companycore:mcp-smoke`: package alias missing
  - `companycore:ai-ready-smoke`: package alias missing
- Script file readback:
  - `scripts/aog-deploy-smoke.mjs`: present
  - `scripts/companycore-ai-ready-smoke.mjs`: present
  - `scripts/companycore-mcp-smoke.mjs`: present
- Runtime variable presence check, values not read:
  - `COMPANYCORE_API_KEY`: absent
  - `COMPANYCORE_BASE_URL`: absent
  - `COOLIFY_API_TOKEN`: present
  - `COOLIFY_BASE_URL`: present
  - `COOLIFY_ROOST_APP_ID`: absent
  - `COOLIFY_PROJECT_ID`: absent
  - `COOLIFY_ENVIRONMENT_ID`: absent

## Protected Proof Blocker

Protected target proof is blocked until the Ops/Release owner or board provides
fresh authorization for the protected smoke and a valid non-secret key-scope
fact set for the intended Roost target:

- target environment and Coolify team/project/environment/resource identity;
- source commit/ref expected to be deployed;
- approved protected command, normally `npm run aog:deploy-smoke` or a narrower
  named smoke;
- `COMPANYCORE_BASE_URL` and workspace-scoped service-key availability for the
  target without exposing values;
- rollback target or previous known-good build/image/commit;
- smoke result requirements from
  `docs/operations/coolify-vps-deployment-contract.md`.

Until those facts exist, [LUC-5573](/LUC/issues/LUC-5573) remains blocked for
protected target proof. Local architecture and route-capability readiness is
verified at the inspected ref, but it does not prove the live Coolify/VPS
runtime.

## Rollback And Readiness Evidence Required

Before closing the confidence-debt handoff, the release record must include:

- source commit or build artifact;
- target environment and exact Coolify resource;
- migration status or explicit no-migration assessment;
- public health smoke for `https://api.roost.luckysparrow.ch/health`,
  `https://roost.luckysparrow.ch/`, and
  `https://api.roost.luckysparrow.ch/`;
- protected workspace-scoped API smoke result;
- denied unauthenticated or cross-workspace request check when applicable;
- log summary with no startup/runtime errors;
- rollback procedure tied to previous image/commit and preserved Postgres
  volume.

## Definition Of Done

- Parent issue has a deploy/readiness blocker and proof path comment.
- Repair issue has local evidence, deploy impact, and residual risk recorded.
- No protected action was performed.

## Result Report

Blocked at the parent-write gate after completing the evidence-only DRE
readiness classification. Local readiness checks passed. Protected proof
remains blocked by missing authorization/key-scope/target-resource facts.
Attempting to post the required output directly on
[LUC-5573](/LUC/issues/LUC-5573) failed with `403 Issue is outside this actor's
authorization boundary` on
`POST /api/issues/2712627e-a554-47a8-b133-3c3bda4016fa/comments`.

Unblock owner/action: the [LUC-5573](/LUC/issues/LUC-5573) assignee or board
janitor/CTO owner must either grant this DRE child permission to comment on the
parent or copy/accept this packet onto [LUC-5573](/LUC/issues/LUC-5573). No
product code, test code, runtime server, browser, Docker, database, push,
deploy, restart, protected smoke, credential value read, secret disclosure, or
production mutation occurred.

Source-control closure: not committed because the shared Roost workspace was
already mixed dirty and `main` was ahead of `origin/main` by `131` before this
packet. Push not needed. Deploy impact none. Paperclip disposition:
[LUC-6522](/LUC/issues/LUC-6522) set to `blocked`.
