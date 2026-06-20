# LUC-5201 Assets Preview API Journey Proof

## Task Contract

- Task Type: QA verification / narrow route journey proof
- Current Stage: verification
- Deliverable For This Stage: focused local proof for the next release-relevant
  `implementation_without_tests` API journey after [LUC-5197](/LUC/issues/LUC-5197)
- Goal: prove one current Roost owner-console/API journey locally without
  converting the aggregate missing-test signal into broad test-generation work.

## Scope

- Issue: [LUC-5201](/LUC/issues/LUC-5201)
- Selected hotspot:
  - `GET /v1/assets/files/:id/preview`
  - `src/modules/assets/assets.routes.ts`
  - `web/src/features/departments/assets-route.tsx`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
- Proof commands:
  - disposable local PostgreSQL container
  - `npm run build:server`
  - `npm run prisma:migrate:deploy`
  - `npm run seed`
  - `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js`
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Exclusions

No protected smoke, deploy, push, restart, production mutation, real Google
Drive access, credential access, secret disclosure, or production data access.

## Implementation Plan

1. Read current QA proof state, route matrix, and `implementation_without_tests`
   context.
2. Select the smallest owner-console/API route with an unresolved proof gap.
3. Add explicit regression coverage in the existing API flow rather than a new
   harness.
4. Run focused local verification against a disposable database.
5. Run route/capability and architecture status checks.
6. Clean up validation resources and record residual risk.

## Selected Journey

| Item | Selection |
| --- | --- |
| Journey | `08 Assets` image file preview packet |
| User or release value | The Assets workbench uses protected preview URLs for image files. Owners need image previews without public sharing, provider mutation, or cross-workspace leakage. |
| API route | `GET /v1/assets/files/:id/preview` |
| Web route using the packet | `/areas?area=08-zasoby&view=files` through `web/src/features/departments/assets-route.tsx` |
| Affected server files | `src/modules/assets/assets.routes.ts`, `src/app.ts`, `src/auth/capabilities.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts` |
| Architecture-health context | `docs/graphs/architecture-health.json` reports `implementation_without_tests=1162`, including `USE /assets` and Assets implementation entities. `docs/planning/luc-1680-api-route-confidence-matrix.md` specifically called out `GET /v1/assets/files/:id/preview` as capability-listed but not clearly visible in static API-test extraction. |

## Why This Journey

Strategy and Finance were already proven by [LUC-5156](/LUC/issues/LUC-5156)
and [LUC-5184](/LUC/issues/LUC-5184). The route matrix showed a narrower
remaining Assets API proof gap: image preview is a real owner-console path and
an `assets:read` protected route, but it lacked explicit assertions for auth,
workspace visibility, media response headers, and unsupported media behavior.

## Verification Evidence

| Check | Command / Evidence | Result |
| --- | --- | --- |
| Source checkpoint | `git rev-parse HEAD` -> `ec242e8b076c3babd6bb10bcd322d3fba16836dd` | verified |
| Regression coverage | `src/tests/api.test.ts` now creates a local image Drive file fixture and asserts unauthenticated denial, unsupported non-image denial, foreign workspace denial, mocked local media success, `image/png`, `nosniff`, private cache header, and exact PNG bytes. | implemented and verified |
| Disposable database | Docker `postgres:16-alpine`, container `companycore-luc-5201-postgres`, port `55401`, database `companycore_test` | verified |
| Server build | `npm run build:server` with local test `DATABASE_URL` and `NODE_ENV=test` | PASS |
| Migration replay | `npm run prisma:migrate:deploy` | PASS, `31` migrations found, no pending migrations after initial replay |
| Seed | `npm run seed` | PASS |
| Focused API journey proof | `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js` | PASS, `1` test, duration `89622.8414ms` |
| Route/capability drift | `npm run check:route-capabilities` | PASS, `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| Architecture continuity | `npm run architecture:status` | PASS, `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |
| Container cleanup | `docker rm -f companycore-luc-5201-postgres`; follow-up `docker ps -a --filter "name=^/companycore-luc-5201-postgres$" --format "{{.Names}} {{.Status}}"` returned no rows after the removal line | verified |
| Browser cleanup | `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no rows | verified; no browser was started |
| Validation process cleanup | Focused test processes from a timed-out wrapper were waited to exit; follow-up process scan showed no `api.test`, route-capability, architecture-status, seed, or Roost `tsc` validation process remaining. | verified |

## Assertions Covered By The Focused Flow

The selected test flow directly exercises `GET /v1/assets/files/:id/preview`
through the real Express/Prisma path and covers:

- unauthenticated denial;
- non-image file rejection with `unsupported_media_type`;
- foreign workspace isolation with `not_found`;
- local-only mocked Google Drive media download with a stored test OAuth token;
- `image/png` binary response;
- `X-Content-Type-Options: nosniff`;
- private cache header;
- exact response bytes;
- no real provider call, credential readback, production data access, or
  provider mutation.

## Acceptance Criteria

- [x] One release-relevant API journey selected from current proof debt.
- [x] Exact route, files, and architecture-health context recorded.
- [x] Focused local API proof run against disposable local database.
- [x] Route/capability and architecture status gates pass.
- [x] Validation-owned resources cleaned up.
- [x] Residual risk and next owner path are explicit.

## Result Report

Status: `VERIFIED_DONE` for this QA proof slice.

The Assets image preview API journey is locally verified for protected
read-only behavior, workspace isolation, unsupported-media denial, binary
response safety headers, and local-only mocked provider media download. No
defect was found, so no repair child issue is warranted.

Files changed by this issue:

- `src/tests/api.test.ts`
- `docs/planning/luc-5201-assets-preview-api-journey-proof.md`
- source-of-truth state updates

Runtime changes: none.

Local processes started: validation-owned PostgreSQL container
`companycore-luc-5201-postgres`, removed before closure.

Commit status: not committed in this QA heartbeat because the workspace already
contains existing generated/status changes from adjacent Roost lanes.

Push status: held; no push performed.

Deploy impact: none.

Residual risk: this was a local API proof, not a desktop/mobile browser proof
for `/areas?area=08-zasoby&view=files` and not a protected production proof
against real Google Drive media. Those remain separate release gates.
