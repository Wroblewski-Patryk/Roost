# V1 Production Canonical Parity Audit Task Contract

Date: 2026-05-15
Task Type: UX verification / release readiness
Current Stage: verification
Deliverable For This Stage: production discrepancy audit and source-of-truth
updates for the next release step.

## Goal

Inspect the deployed production web app, compare it against the V1 canonical
web views, record every discrepancy, and identify the smallest safe correction
path before further V1 web work.

## Scope

- Production routes:
  - `https://companycore.luckysparrow.ch/`
  - `https://companycore.luckysparrow.ch/auth/login`
  - `https://companycore.luckysparrow.ch/auth/register`
  - `https://companycore.luckysparrow.ch/dashboard`
  - `https://companycore.luckysparrow.ch/areas?area=01-strategia&view=overview`
- Canonical targets under `docs/ux/assets/`.
- Evidence output under
  `docs/ux/evidence/production-compare-2026-05-15/`.
- Source-of-truth files:
  - `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`
  - `docs/ux/v1-web-view-index-2026-05-15.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/system-health.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/next-steps.md`
  - `.agents/core/project-memory-index.md`
  - `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Query production `/health` and API `/health`.
2. Capture desktop and mobile screenshots for public/auth routes.
3. Capture signed-out private-route behavior for dashboard and selected area.
4. Compare production screenshots and route behavior against canonical assets.
5. Record discrepancy IDs, severity, likely cause, and required fix.
6. Update project state, task board, module confidence, requirements, system
   health, next steps, and UX index.

## Acceptance Criteria

- Production build identity is recorded.
- Public home, login, and registration discrepancies are explicitly listed.
- Private-route authenticated comparison limitation is recorded as a blocked
  evidence gap, not hidden.
- The next executable release task is queued.
- No runtime workaround or fake parity claim is introduced.

## Definition Of Done

- Discrepancy audit exists in `docs/ux/`.
- Production screenshots and route report exist in `docs/ux/evidence/`.
- Canonical queue and state docs point to the deploy/rerun step.
- `git diff --check` passes.

## Result Report

Production public web and API health reported `build.commit="b716f02"`.
The local V1 canonical web implementation is not the deployed production build.
Production `/` redirects to `/auth/login`, while canonical V1 requires a
public home. Production login/register still use the older auth layout.
Signed-out private routes correctly redirect to login. Authenticated dashboard
and selected-area production parity remains blocked until the V1 deploy and an
owner-session screenshot pass.
