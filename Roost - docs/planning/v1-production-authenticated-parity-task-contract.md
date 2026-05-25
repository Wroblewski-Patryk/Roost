# V1 Production Authenticated Parity Task Contract

Last updated: 2026-05-15

## Task Type

Frontend UX/UI, production verification, and release hardening.

## Current Stage

Implementation -> verification -> release.

## Deliverable For This Stage

Production owner-session parity evidence for the V1 dashboard and selected
area detail route, plus a narrow fix for any discrepancy that blocks the
selected-area view from reflecting backend operating-area data.

## Goal

Make the authenticated V1 web skeleton usable and evidence-backed on
production: `/dashboard` should render the canonical Company Atlas and
`/areas?area=01-strategia&view=overview` should render the canonical selected
department view using backend operating-model context instead of an empty
unmatched area state.

## Scope

- `web/src/main.tsx`
  - Canonical LuckySparrow area-to-backend matching.
  - Selected-area detail data context.
- `docs/ux/evidence/production-auth-v1-2026-05-15/`
  - Initial authenticated production desktop/mobile screenshots.
- `docs/ux/evidence/production-auth-v1-2026-05-15-rerun/`
  - Timed rerun screenshots that wait for area loading to settle.
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Capture authenticated production screenshots for `/dashboard` and selected
   area routes after owner login.
2. Separate timing/loading artifacts from real route or data mismatches.
3. Fix the selected-area backend matcher so canonical 00-12 company areas can
   resolve to existing backend operating-area keys and table names.
4. Run local build and repository validation gates.
5. Commit and push the narrow production parity fix.
6. Deploy the new commit through the accepted manual VPS rollover path when
   auto-deploy is not sufficient.
7. Rerun authenticated production screenshots and record the final evidence.

## Acceptance Criteria

- `/dashboard` production owner session renders the V1 Company Atlas.
- `/areas?area=01-strategia&view=overview` production owner session renders the
  canonical selected-area view after loading settles.
- `01 Strategia` resolves to the backend `strategy-governance` operating area
  and shows linked tables instead of the empty unmatched-area state.
- Desktop and mobile captures have no horizontal overflow.
- Browser proof records no relevant console errors or failed route requests.
- `npm run validate` passes.
- `git diff --check` passes.

## Definition Of Done

- Code is committed and pushed.
- Production `/health` reports the deployed commit.
- Authenticated production dashboard and selected-area screenshots are saved
  under `docs/ux/evidence/`.
- Source-of-truth task, state, and module-confidence files are updated.
- Any validation limitation is recorded.

## Result Report

Completed on 2026-05-15.

- Commit deployed:
  `1dafe910ff612e027b686f09e2a488600f6e60d4`.
- Runtime image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:1dafe91`.
- Running backend container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-1dafe91`.
- Rollback container retained stopped:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-ff5e041-previous-1dafe91`.
- Validation:
  `npm run validate`, `git diff --check`, VPS Docker image build, canary
  health, final routed container health, public web/API health, and
  authenticated production Playwright proof passed.
- Evidence:
  `docs/ux/evidence/production-auth-v1-1dafe91-2026-05-15/`.
- Result:
  `/dashboard` renders the V1 Company Atlas after owner login.
  `/areas?area=01-strategia&view=overview` and
  `/areas?area=01-strategia&view=ai` render the canonical selected-area view
  with backend context, `8 TABLES`, Drive evidence, and provider mappings
  instead of the empty unmatched-area state.
