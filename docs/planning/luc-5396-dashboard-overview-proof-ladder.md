# LUC-5396 Dashboard Overview Proof Ladder

## Task Type

QA verification / app-completion proof ladder.

## Current Stage

Verification.

## Deliverable For This Stage

Evidence-backed proof for one focused flow selected from the refreshed
app-completion confidence debt in [LUC-5394](/LUC/issues/LUC-5394).

## Goal

Select one current app-completion flow, map it to runtime surfaces and existing
tests, run the smallest safe local proof, and decide whether a repair issue is
warranted.

## Scope

- Source index: `docs/status/app-completion-index.md` generated
  `2026-06-21T01:03:22.386Z`.
- Selected flow: `Dashboard overview`.
- Runtime API surface: `GET /v1/dashboard/command`.
- Backend files:
  - `src/modules/dashboard/dashboard.routes.ts`
  - `src/app.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
- Web/client surfaces:
  - `web/src/features/departments/general-dashboard.tsx`
  - `web/src/features/public/public-home.tsx`
  - `web/src/app-route-registry.ts`
- Existing test surface: `src/tests/api.test.ts`.
- Out of scope: product code changes, schema changes, migration authoring,
  browser proof, protected production smoke, push, deploy, restart, credential
  access, live provider mutation, and secret disclosure.

## Selection Reason

`Account access` is still first in the generated priority queue, but it already
has a fresh local browser proof from [LUC-5380](/LUC/issues/LUC-5380).
`Subscription and entitlement` also has a fresh local API proof from
[LUC-5392](/LUC/issues/LUC-5392). `Dashboard overview` is a smaller remaining
flow with six `missing_test_link` items and no generated browser-review flag,
so the best next QA confidence gain is to prove the read-only command-center
API and route/capability exposure instead of repeating a recently verified
ladder.

## Implementation Plan

1. Inspect the current app-completion index and select a non-repeated flow.
2. Map the selected flow to API, MCP/capability, web, and test surfaces.
3. Run the smallest safe local proof against a disposable database.
4. Run route/capability and architecture status checks.
5. Check validation-owned resource cleanup.
6. Record whether a repair issue is warranted.

## Acceptance Criteria

- The selected flow and selection reason are recorded.
- Runtime surfaces, docs, and existing tests are mapped.
- The local proof command and result are recorded.
- Cleanup status is recorded for any validation-owned database or browser
  process.
- A repair issue is created only if proof finds a real defect.

## Verification Evidence

Selected proof command:

```powershell
$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-5396-postgres'
$env:COMPANYCORE_TEST_DB_PORT='55596'
$env:COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP='0'
npm run test:api:local
```

Result: PASS.

Observed coverage:

- `npm run build` completed through `build:server` and `build:web`.
- `prisma migrate deploy` applied all `31` migrations to disposable PostgreSQL
  on `127.0.0.1:55596`.
- `npm run seed` completed.
- Node test runner passed `7/7` subtests.
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

- `docker ps -a --filter "name=companycore-luc-5396-postgres"` returned no
  validation-owned container.
- `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned
  no process.

## Definition Of Done

- Code build: verified by `npm run test:api:local`.
- Real API path: verified by `/v1/dashboard/command` assertions in
  `src/tests/api.test.ts`.
- Migration path: verified by all `31` migrations applying to the disposable
  database.
- Route/capability alignment: verified by `npm run check:route-capabilities`.
- Architecture gate status: verified by `npm run architecture:status`.
- Cleanup: validation database container and headless browser process absent.
- Documentation: this proof packet plus state/context updates.

## Result Report

`Dashboard overview` is locally verified for the current read-only dashboard
command API, capability/MCP exposure, and regression coverage represented in
`src/tests/api.test.ts`. No product repair issue is warranted from this proof.

Residual risk: this was an API proof ladder, not a desktop/mobile browser
render proof for the dashboard UI and not protected production smoke. Those
remain separate future gates if the release owner selects them.

Source-control status: not committed in this QA heartbeat because the shared
workspace already carries the [LUC-5394](/LUC/issues/LUC-5394)
generated/status evidence packet and source-control closure is separately
tracked by [LUC-5395](/LUC/issues/LUC-5395). Push status: not needed. Deploy
impact: none.
