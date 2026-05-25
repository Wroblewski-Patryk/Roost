# V1 Production Canonical Deploy Task Contract

Date: 2026-05-15
Task Type: release / UX verification
Current Stage: release
Deliverable For This Stage: deployed V1 canonical web skeleton with production
health and screenshot proof.

## Goal

Deploy the V1 canonical web skeleton so production serves the public home,
public auth pages, private dashboard shell, and private selected-area route
from the current React layer.

## Scope

- Commit: `ff5e04192db93a53280fab58bcd8f47cba30f554`
- Production web: `https://companycore.luckysparrow.ch/`
- Production API: `https://api.companycore.luckysparrow.ch/`
- Routes:
  - `/`
  - `/auth/login`
  - `/auth/register`
  - `/dashboard`
  - `/areas?area=01-strategia&view=overview`
- Evidence:
  - `docs/ux/evidence/production-v1-ff5e041-2026-05-15/`
  - `docs/operations/post-deploy-smoke.md`

## Implementation Plan

1. Commit and push the V1 canonical web skeleton.
2. Build a source archive for the exact commit.
3. Copy the archive to the VPS.
4. Build a Docker image with explicit build metadata.
5. Start a canary container using the existing production env without printing
   secrets.
6. Start the routed production container after the canary passes health.
7. Stop and retain the previous production container as rollback.
8. Verify public health, web routes, and production screenshots.
9. Update source-of-truth docs with release evidence and residual risks.

## Acceptance Criteria

- Public web and API `/health` report commit
  `ff5e04192db93a53280fab58bcd8f47cba30f554`.
- `/` returns the V1 public home instead of redirecting to login.
- `/auth/login` and `/auth/register` render the V1 public auth layout.
- Signed-out private dashboard and selected-area routes redirect to login.
- Production desktop/mobile screenshots have no horizontal overflow and no
  console errors.
- Previous production container is retained as rollback.

## Definition Of Done

- Deployment is complete and public health reports the expected commit.
- Production screenshot proof is captured.
- Post-deploy smoke and project state are updated.
- Validation limitations are explicitly recorded.

## Result Report

Commit `ff5e04192db93a53280fab58bcd8f47cba30f554` was deployed through the
approved manual VPS rollover path. Production health reports image
`rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`. Public home, login, and
registration render V1 layouts on desktop and mobile with no overflow or
console errors. Signed-out private routes redirect to login. Full
authenticated dashboard and selected-area production parity still needs an
owner-session screenshot pass.
