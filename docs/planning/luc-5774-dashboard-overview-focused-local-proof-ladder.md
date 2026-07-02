# LUC-5774 Dashboard Overview Focused Local Proof Ladder

## Task Type

QA verification / app-completion proof ladder.

## Current Stage

Verification.

## Deliverable For This Stage

Focused local evidence for the current `Dashboard overview` app-completion
missing-test rows.

## Goal

Prove or reject the current `Dashboard overview` app-completion missing-test
rows with the smallest safe local verification in the Roost workspace.

## Scope

- Source index at wake scope: `docs/status/app-completion-index.json`
  generated `2026-06-28T02:16:53.040Z` (`932` items / `7` flows / `901`
  missing test links).
- Current readback after a concurrent shared refresh: generated
  `2026-06-28T02:42:41.423Z` (`934` items / `7` flows / `903` missing test
  links). The `Dashboard overview` row count and row IDs remain unchanged.
- Selected flow: `Dashboard overview`.
- Runtime API surface: `GET /v1/dashboard/command`.
- App-completion rows reviewed:
  - `api_endpoint:use-dashboard:a4fbc07380` - `USE /dashboard`,
    `src/app.ts#/dashboard`.
  - `feature:build-architecture-health-dashboard-mjs:f597bc0ac8` -
    `scripts/build-architecture-health-dashboard.mjs`.
  - `feature:check-architecture-health-dashboard-gate-mjs:d6a4964ca2` -
    `scripts/check-architecture-health-dashboard-gate.mjs`.
  - `feature:dashboard-routes-ts:cb24115ec5` -
    `src/modules/dashboard/dashboard.routes.ts`.
  - `feature:general-dashboard-tsx:1e44e7a581` -
    `web/src/features/departments/general-dashboard.tsx`.
  - `feature:public-home-tsx:649fe0a227` -
    `web/src/features/public/public-home.tsx`.
- Existing automated proof surface: dashboard assertions in
  `src/tests/api.test.ts`.
- Out of scope: product code changes, schema changes, migration authoring,
  broad duplicate tests, browser proof, protected production smoke, push,
  deploy, restart, credential access, provider mutation, or secret disclosure.

## Implementation Plan

1. Extract the exact `Dashboard overview` rows from the generated
   app-completion index.
2. Map the current rows to the existing dashboard command API and test
   assertions.
3. Run the project-native disposable local API proof.
4. Run lightweight route/capability and architecture status checks.
5. Confirm validation-owned resources were cleaned up.
6. Record whether a product repair or duplicate test issue is warranted.

## Acceptance Criteria

- The exact dashboard rows under review are identified.
- The local proof exercises the dashboard route/API surface or records why it
  cannot run.
- Validation evidence and cleanup evidence are recorded.
- If no runtime defect is found, the result recommends evidence-link/scanner
  curation instead of broad duplicate tests.

## Verification Evidence

Selected proof command:

```powershell
$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-5774-postgres'
$env:COMPANYCORE_TEST_DB_PORT='55774'
$env:COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP='0'
npm run test:api:local
```

Result: PASS.

Observed coverage:

- `npm run build` completed through `build:server` and `build:web`.
- `prisma migrate deploy` applied all `31` migrations to disposable PostgreSQL
  on `127.0.0.1:55774`.
- `npm run seed` completed.
- Node test runner passed `8/8` subtests.
- `CompanyCore v1 protected API flow` passed and includes dashboard command
  assertions for:
  - MCP tool exposure:
    `companycore_get_dashboard_command` -> `/v1/dashboard/command`,
    capability `dashboard:read`, risk `read`, approval not required.
  - `GET /v1/dashboard/command` status `200`.
  - summary fields for open tasks, approvals, workforce entities, and Drive
    files.
  - `04-operacje` department signal target
    `/areas?area=04-operacje&view=tasks`.
  - read-only blocked action
    `assign_human_or_agent_from_dashboard`.
  - agent packet mode `read_only_command_center`.

Additional checks:

```powershell
npm run check:route-capabilities
```

Result: PASS (`180` manifest routes / `35` route files, `status=ok`).

```powershell
npm run architecture:status
```

Result: PASS (`GREEN`, graph `454` nodes / `765` relations / `35` chains,
evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).

```powershell
git diff --check
```

Result: PASS with LF-to-CRLF warnings only.

Cleanup checks:

- `docker ps -a --filter "name=^/companycore-luc-5774-postgres$"` returned no
  validation-owned container.
- `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned
  no validation-owned browser process.

## Definition Of Done

- Code build: verified by `npm run test:api:local`.
- Real API path: verified by `/v1/dashboard/command` assertions in
  `src/tests/api.test.ts`.
- Migration path: verified by all `31` migrations applying to the disposable
  database.
- Route/capability alignment: verified by `npm run check:route-capabilities`.
- Architecture gate status: verified by `npm run architecture:status`.
- Cleanup: validation database container and headless browser process absent.
- Documentation: this proof packet records the source rows, commands, result,
  and source-control disposition.

## Result Report

`Dashboard overview` is locally verified for the current read-only dashboard
command API, capability/MCP exposure, and regression coverage represented in
`src/tests/api.test.ts`. No product repair or broad duplicate test issue is
warranted from this proof.

The remaining app-completion signal is evidence-link/scanner curation debt:
the generated rows do not attach the existing dashboard API proof to
`USE /dashboard`, `dashboard.routes.ts`, or `general-dashboard.tsx`, and the
architecture-health dashboard scripts are generated/status-tooling rows rather
than user-facing dashboard runtime defects.

Residual risk: this was an API proof ladder, not a desktop/mobile browser
render proof for the dashboard UI and not protected production smoke. Those
remain separate future gates if the release owner selects them.

Source-control status: not committed in this QA heartbeat because the shared
workspace is already `main...origin/main [ahead 128]` with unrelated dirty and
untracked evidence packets outside [LUC-5774](/LUC/issues/LUC-5774). Push
status: not needed. Deploy impact: none.
