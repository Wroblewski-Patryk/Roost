# LUC-5226 Operating Model API Journey Proof

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-20
Owner: QA/Test
Parent: [LUC-5224](/LUC/issues/LUC-5224)

## Goal

Reduce the recurring Roost `implementation_without_tests` confidence debt by
selecting and proving one narrow implemented CompanyCore journey from the fresh
[LUC-5224](/LUC/issues/LUC-5224) generated architecture-health artifacts.

## Selected Slice

Selected journey: Operating Model aggregate and lifecycle API coverage centered
on `GET /v1/operating-model` and the scoped operating-model resource routes.

Architecture entities and paths:

- `FEAT-AUTO-0020` - Operating Model Coverage Expansion.
- `src/modules/operating-model/operating-model.routes.ts`.
- `src/auth/capabilities.ts` (`operating-model:read`,
  `operating-model:write`, `operating-model:mappings:write`).
- `src/tests/api.test.ts` Operating Model assertions.

Reason:

- The fresh parent baseline still reports `implementation_without_tests=1162`
  and `actionable_implementation_without_tests=1153`.
- `docs/status/architecture-risk-hotspots-report.json` ranks
  `FEAT-AUTO-0020` as the next implemented, non-verified hotspot after the
  already-proved Process Core target from [LUC-5220](/LUC/issues/LUC-5220).
- The selected route is locally safe to prove with the existing isolated API
  harness and does not require protected production access.

## Scope

Allowed scope:

- Select and prove one local API journey.
- Use disposable local PostgreSQL through the project-native test harness.
- Run route/capability and architecture status checks.
- Record cleanup evidence.

Explicit exclusions:

- No production smoke, deploy, push, restart, live-account mutation,
  credential access, secret disclosure, schema change, migration authoring,
  browser proof, or runtime feature change.

## Expected Behavior

The Operating Model API journey must:

- return an authenticated workspace-scoped operating model with the canonical
  `workspace -> operating_area -> operating_folder -> operating_table -> record`
  hierarchy;
- restore the 13 system operating areas when the main area is missing;
- protect system areas from deletion;
- allow owner-scoped custom area create/update/delete with reassignment;
- allow owner-scoped folder, knowledge root, storage location, and automation
  definition lifecycle operations;
- deny cross-workspace scoped resource creation/update;
- expose the operating-model route capabilities consistently.

## Verification Evidence

| Check | Result |
| --- | --- |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5226-postgres COMPANYCORE_TEST_DB_PORT=55426 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS. Built server/web, applied `31` migrations to disposable PostgreSQL, seeded data, and ran `node --test dist/tests/api.test.js`: `7/7` subtests passed, including `CompanyCore v1 protected API flow` (`duration_ms=18163.3809`, total `22034.0482ms`). |
| `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| `npm run architecture:status` | PASS: `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup: `docker ps -a --filter "name=^/companycore-luc-5226-postgres$" --format "{{.Names}} {{.Status}}"` | PASS: no validation DB container remained. |
| Cleanup: `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS: no browser validation process was present. |

## Classification

Reality status: verified.

The Operating Model API journey is locally verified for protected
workspace-scoped read behavior, canonical area restoration, guarded system-area
delete behavior, owner-scoped operating resource lifecycle operations,
cross-workspace denial, and route/capability consistency. No defect or repair
child issue is warranted from this proof.

## Integration And Safety Notes

- Existing systems reused: project-native `scripts/test-api-local.mjs`,
  existing API assertions, existing route/capability checker, and existing
  architecture status gate.
- No workaround, temporary bypass, duplicated logic, architecture change, or
  product/runtime change was introduced.
- Deploy impact: none.
- Push status: not needed for this QA-only evidence packet.
- Residual risk: browser proof for any UI consuming Operating Model data and
  protected production proof remain separate future gates.

## Result Report

Task summary: completed the next QA proof rung from the fresh
[LUC-5224](/LUC/issues/LUC-5224) `implementation_without_tests=1162` signal by
proving the Operating Model API journey locally after skipping the already
proved Process Core target.

Files changed:

- `docs/planning/luc-5226-operating-model-api-journey-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`

What is incomplete: no runtime defect remains for this selected journey.
Production/protected target smoke and browser proof are intentionally outside
this issue.
