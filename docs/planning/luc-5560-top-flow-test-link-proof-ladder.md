# LUC-5560 Top Flow Test-Link Proof Ladder

Date: 2026-06-27
Issue: [LUC-5560](/LUC/issues/LUC-5560)
Parent: [LUC-5559](/LUC/issues/LUC-5559)
Stage: verification

## Task Contract

- Goal: turn the app-completion signal `826 missing test links` into a bounded
  QA proof ladder for Roost's highest-risk user flows.
- Task Type: QA verification planning with first local proof.
- Current Stage: verification.
- Deliverable For This Stage: ranked proof ladder with affected paths,
  commands, expected evidence, and the first safe proof result.

## Scope

Sources read:

- `docs/status/app-completion-index.md`
- `docs/status/app-completion-index.json`
- `package.json`
- `scripts/test-api-local.mjs`
- `src/tests/api.test.ts`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`

App-completion snapshot: generated `2026-06-27T14:49:44.922Z`, `845` items,
`7` user flows, `826` missing test links, `0` missing doc links, and `2`
blocked items.

## Ranked Proof Ladder

| Rank | Flow | Current signal | Affected paths/routes | Smallest repeatable proof | Expected evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Account access | `86` entities, `85` missing test links, gates `auth/configuration/subscription`; priority queue starts with `USE /auth` and `USE /v1/auth` | `src/app.ts#/auth`, `src/app.ts#/v1/auth`, `src/modules/auth/auth.routes.ts`, `src/auth/*`, `web/src/features/auth/auth-pages.tsx`, `web/src/api/auth-token.ts`, `web/src/api/client.ts`, `src/tests/api.test.ts` | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5560-postgres COMPANYCORE_TEST_DB_PORT=55560 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | build, migrations, seed, and node API subtests proving registration/login, bearer auth, workspace isolation, auth denial, API-key profiles, and MCP/connection auth posture | Blocked locally by Docker unavailable |
| 2 | User configuration | `54` entities, `53` missing test links, gate `configuration`; overlaps account/workspace settings and integration settings | `src/modules/integration-settings/*`, `src/integrations/integration-settings.service.ts`, `src/integrations/google-drive/google-drive.auth.ts`, `web/src/features/settings/settings-routes.tsx`, `web/src/api/client.ts`, `scripts/owner-console-ux-smoke.mjs` | After Rank 1 API proof is unblocked, run a scoped browser proof for `/account/settings`, `/workspace/settings`, `/settings`, `/settings/drive`, and `/settings/api` with required text assertions | desktop/mobile screenshots, `report.json`, signed-in assertions, no console issues, and no raw provider/validation errors exposed | Not run in this heartbeat |
| 3 | Subscription and entitlement | `500` entities, `484` missing test links, `14` implemented-needs-proof, `2` blocked; large signal is mostly historical planning/docs classified as subscription-gated | Existing Finance proof paths: `src/modules/finance/finance.routes.ts`, `web/src/features/departments/finance-route.tsx`; blocked docs: `docs/planning/cc-08-001-assets-resource-system-spec.md`, `docs/planning/dms-07-finance-system-spec.md` | Do not rerun broad subscription scans first. Use existing [LUC-5433](/LUC/issues/LUC-5433) Finance browser proof as current local evidence, then open only a targeted follow-up when a concrete subscription/entitlement runtime route lacks proof | proof packet or blocker showing exact route/API and whether the gap is runtime, browser, production, or scanner/doc classification | Partially covered by recent proof; blocked docs remain separate |

## First Safe Proof Commands

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run check:route-capabilities` | PASS | `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| `npm run build` | PASS | server TypeScript compile PASS; Vite web build PASS; warning only: `/vendor/phosphor/bold/style.css` unresolved at build time and left for runtime |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5560-postgres COMPANYCORE_TEST_DB_PORT=55560 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | BLOCKED | Docker unavailable: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` No database container was created |

## Acceptance Criteria

- [x] Ranked proof ladder produced for Subscription and entitlement, Account
      access, and User configuration.
- [x] Affected files/routes, commands, and expected evidence recorded.
- [x] First safe local proof command run.
- [x] Blocked/protected actions separated from local verification.

## Result Report

Status: `PARTIALLY_VERIFIED_BLOCKED`.

The route/capability contract and full build are verified locally. The
highest-value behavioral proof for this issue is Account access API authority
via `npm run test:api:local`, but that command is blocked in this heartbeat by
local Docker unavailability before any PostgreSQL test container can start.

No product repair issue is warranted from this heartbeat because no runtime
journey failed. The next owner is QA/Test or Engineering Delivery in an
environment with Docker Desktop or an approved safe local `DATABASE_URL` for
`companycore_test`; rerun the Rank 1 command, then proceed to the scoped User
configuration browser proof only if the API proof passes.

Commit status: not committed in this heartbeat because the shared workspace
already contains unrelated dirty/untracked evidence packets and source-control
closure lanes. Push status: not pushed. Deploy impact: none. Protected
production proof remains approval/credential gated and was not attempted.
