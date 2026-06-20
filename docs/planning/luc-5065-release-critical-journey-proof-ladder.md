# LUC-5065 Release-Critical Journey Proof Ladder

## Task Contract

- Task Type: QA verification / release-critical proof ladder
- Current Stage: verification
- Deliverable For This Stage: selected local journey ladder, current safe proof results, residual risks, and follow-up owner decisions for [LUC-5065](/LUC/issues/LUC-5065).

## Goal

Convert the green [LUC-5060](/LUC/issues/LUC-5060) architecture baseline into
the first local release-critical journey proof ladder without creating broad
repo-wide missing-test work from the raw `implementation_without_tests=1162`
signal.

## Scope

- Included:
  - Read [LUC-5060](/LUC/issues/LUC-5060) known-state evidence.
  - Select 3 to 5 release-critical local journeys from architecture/product
    docs, proof-register signals, and current module confidence.
  - Name affected routes, APIs, files, architecture entities, proof commands,
    and next proof requirements.
  - Run safe local verification only.
  - Record residual risk and follow-up decisions.
- Excluded:
  - Runtime product code changes, schema or migration authoring, feature
    implementation, deploy, push, protected smoke, production mutation,
    restart, credential access, secret disclosure, browser proof unless a
    local harness is explicitly started and cleaned in this same task, and
    broad test-generation work.

## Implementation Plan

1. Read the issue context, [LUC-5060](/LUC/issues/LUC-5060), project state,
   task board, module confidence, system health, and next-step sources.
2. Select the smallest release-critical journeys whose local proof increases
   confidence beyond the architecture green state.
3. Run current safe gates that cover the selected ladder backbone.
4. Classify verified, partially verified, blocked, and next proof states.
5. Update source-of-truth files and Paperclip disposition.

## Acceptance Criteria

- [x] 3 to 5 release-critical local journeys selected.
- [x] Each selected journey names affected files, routes, APIs/entities, and
      exact local proof command or manual proof needed.
- [x] Safe local verification is run, or blocker facts are recorded.
- [x] Results, residual risks, and follow-up ownership are explicit.
- [x] No broad QA/test issue is created from `implementation_without_tests=1162`.

## Selected Proof Ladder

| Rung | Journey | Why release-critical | Affected surface | Current proof | Status | Next proof / owner |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Owner workspace, auth, and session boundary | All owner-visible Roost work depends on local owner registration/login, workspace scoping, and safe production env behavior. | Routes `/auth/register`, `/auth/login`; files `src/modules/auth/auth.routes.ts`, `src/auth/token.ts`, `src/auth/password.ts`, `web/src/features/auth/auth-pages.tsx`; tests in `src/tests/api.test.ts`; architecture entities `PAGE-AUTO-0003`, `PAGE-AUTO-0004`, `TEST-API-LOCAL`. | `npm run test:api:local` PASS on 2026-06-20. It built server/web, applied all `31` migrations, seeded, and passed `7/7` API subtests, including production env fail-closed checks and the protected API flow owner setup. | partially verified | QA should run authenticated browser route proof only when a browser/UI ladder is the active slice. Production auth proof remains release/credential gated. |
| 2 | API key, capability, and MCP read boundary | External agents and MCP clients must see only scoped tools and fail closed on missing write authority. | Files `src/auth/api-key.ts`, `src/auth/api-key.middleware.ts`, `src/auth/capabilities.ts`, `src/auth/agent-key-profiles.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/modules/mcp/mcp.routes.ts`, `scripts/companycore-ai-ready-smoke.mjs`; route `/v1/mcp/manifest`; architecture entity `TEST-ROUTE-CAPABILITY`. | `npm run check:route-capabilities` PASS (`checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`). `npm run test:api:local` PASS and current API suite includes profile-created key and MCP manifest scope assertions. | verified for local API/static scope | Full AI/MCP runtime proof is `npm run ai-ready:smoke` or `npm run aog:deploy-smoke` against an approved local/target runtime. Production run is blocked until approved target facts and key are injected. |
| 3 | Owner console shell, dashboard, and department catalog readiness | The owner must be able to enter Roost, see the company dashboard, and navigate department systems from the same catalog. | Routes `/dashboard`, `/areas?area=00-ogolny&view=overview`, `/areas?area=12-zarzadzanie&view=departments`; APIs `GET /v1/dashboard/command`, `GET/POST/PATCH /v1/departments`; files `web/src/layout/shell.tsx`, `web/src/features/departments/general-dashboard.tsx`, `web/src/features/departments/management-route.tsx`, `src/modules/dashboard/dashboard.routes.ts`, `src/modules/departments/departments.routes.ts`; entities `CHAIN-DASHBOARD-COMMAND`, `CHAIN-MGMT-DEPT-CATALOG`. | `npm run test:api:local` PASS; [LUC-4936](/LUC/issues/LUC-4936) already added direct `/v1/departments` API regression coverage. `npm run check:route-capabilities` PASS confirms protected route/capability drift is clean. | partially verified | Next full proof is authenticated Playwright desktop/mobile shell + Management catalog clickthrough. No repair issue is needed unless that browser rung fails. |
| 4 | Operating graph and department operating rooms | The V1 department systems depend on AOG packets and canonical area aliases, and these are the current local substitutes for protected production smoke. | Route family `/areas?area=:areaKey&view=overview`; API `GET /v1/operating-graph/areas/:areaKey`; files `src/modules/operating-graph/operating-graph.routes.ts`, `web/src/features/departments/technology-route.tsx`, `web/src/features/departments/legal-route.tsx`, `web/src/features/departments/innovation-route.tsx`; entities `API-OPERATING-GRAPH`, `TEST-API-LOCAL`, recent proof packets [LUC-4880](/LUC/issues/LUC-4880), [LUC-4906](/LUC/issues/LUC-4906), [LUC-4920](/LUC/issues/LUC-4920). | `npm run test:api:local` PASS includes operating graph API assertions for strategy, sales, finance, foreign workspace isolation, missing area behavior, and MCP manifest exposure. Prior local browser ladders verified Technology, Legal, and Innovation operating graph routes. | verified for API/current selected route precedents | Continue department-by-department browser proof only when selecting the next route ladder. Protected deployed AOG proof remains [LUC-5050](/LUC/issues/LUC-5050)-style credential/approval gated. |
| 5 | Assets/workforce/operations release-critical read packets | Assets, People/Agents, and Operations are the core owner workflows behind Roost thin readiness and must stay workspace-scoped with honest packets. | APIs `GET /v1/assets/context`, `GET /v1/workforce`, `GET/POST /v1/operations/work-items`; files `src/modules/assets/assets.routes.ts`, `src/modules/workforce/workforce.routes.ts`, `src/modules/operations/operations.routes.ts`, `web/src/features/departments/assets-route.tsx`, `web/src/features/departments/people-agents-route.tsx`, `web/src/features/departments/operations-route.tsx`; entities `CHAIN-ASSETS-CONTEXT`, `CHAIN-PEOPLE-AGENTS-DIRECTORY`, `CHAIN-OPERATIONS-WORK-ITEM`. | `npm run test:api:local` PASS includes Assets auth/limit/workspace behavior, Workforce create/sync/delete/workspace behavior, and Operations work-item packet/write-readback behavior. | partially verified | Next full proof is browser desktop/mobile for the selected highest-risk surface: recommended first pick is `08 Assets -> Files and folders` only if local Drive fixture state is available; otherwise `04 Operations -> Tasks` because it can be fully local. |

## Verification Run

- `npm run check:route-capabilities`: PASS.
  - Result: `checkedManifestRoutes=180`, `checkedRouteFiles=35`,
    `status=ok`.
- `npm run test:api:local`: PASS.
  - Result: server/web build passed, Vite production bundle built, all `31`
    migrations applied to local validation PostgreSQL, seed completed, and
    `7/7` API subtests passed.
  - Subtests included production environment fail-closed checks, production
    health metadata, CORS, Roost domain defaults, and the `CompanyCore v1
    protected API flow`.
- Cleanup checks:
  - `docker ps -a --filter "name=companycore-test-postgres"` returned no
    container rows.
  - `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned
    no process rows.
- Source control readback:
  - `git status --short --branch -uall` showed
    `main...origin/main [ahead 59]` with no uncommitted rows before this
    documentation update.

## Result Report

Status: `VERIFIED_DONE` for QA ladder classification and first local proof
backbone.

What is verified:

- Route/capability drift is currently green.
- Local API, migration, seed, auth/session, workspace isolation, service-key
  capability, MCP manifest, Management departments, workforce, operations,
  assets, dashboard, and operating graph assertions are green through the
  project-native API harness.
- The selected ladder avoids broad work from `implementation_without_tests=1162`;
  future work should create one route/journey proof at a time only when it
  adds real release confidence or reproduces a defect.

What remains:

- Browser proof is not rerun in this heartbeat because the issue asked for the
  first ladder and safe local verification, and the API/static gates already
  proved the ladder backbone. The next QA issue should pick exactly one route
  surface for authenticated desktop/mobile proof.
- Protected production proof remains blocked outside this issue by approved
  runtime target facts and credential injection.

No implementation, schema, migration authoring, push, deploy, restart,
protected smoke, production mutation, credential access, secret disclosure, or
production data access occurred.
