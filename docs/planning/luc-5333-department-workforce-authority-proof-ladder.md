# LUC-5333 Department And Workforce Authority Proof Ladder

## Header
- ID: LUC-5333
- Title: Department and workforce authority proof ladder after LUC-5331
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-5331](/LUC/issues/LUC-5331), [LUC-5315](/LUC/issues/LUC-5315)
- Priority: P1
- Module Confidence Rows: DMS-06-WORKFORCE-001, DMS-SHELL-003, V1OPS-003
- Operation Mode: TESTER
- Mission ID: LUC-5333-DEPARTMENT-WORKFORCE-AUTHORITY-PROOF
- Mission Status: VERIFIED

## Context
[LUC-5331](/LUC/issues/LUC-5331) classified the architecture-awareness
`implementation_without_tests=1162` signal as scanner-level confidence debt and
selected a focused Department/Workforce QA proof ladder after the already
verified Auth/Workspace/API-key proof in [LUC-5315](/LUC/issues/LUC-5315).

The referenced historical packet
`docs/planning/luc-5301-api-endpoint-test-evidence-gap-triage.md` was not
present in this workspace during this heartbeat. The same LUC-5301 summary was
available in `.agents/state/module-confidence-ledger.md`,
`.agents/state/system-health.md`, `.agents/state/next-steps.md`, and
`docs/planning/mvp-next-commits.md`, so it was treated as available state
evidence rather than a functional blocker.

## Goal
Verify the local Department/Workforce authority and read-packet slice without
feature code, schema changes, protected runtime actions, or live credentials.

## Scope
- Inspect department and workforce route, service, capability, mount, and test
  surfaces:
  - `src/modules/departments/departments.routes.ts`
  - `src/modules/workforce/workforce.routes.ts`
  - `src/modules/workforce/workforce.service.ts`
  - `src/auth/capabilities.ts`
  - `src/app.ts`
  - `src/tests/api.test.ts`
- Run `npm run test:api:local` with a unique disposable PostgreSQL
  container/port.
- Run `npm run check:route-capabilities`.
- Run `npm run architecture:status`.
- Verify validation cleanup.

## Explicit Exclusions
- No feature implementation.
- No schema or migration authoring.
- No protected smoke, deploy, push, restart, production mutation, live
  credential/provider access, or secret disclosure.
- No browser proof, runtime server, watcher, or long-running process.

## Selected Journey And Architecture Mapping
- Department catalog authority:
  - API: `GET /v1/departments`, `POST /v1/departments`,
    `PATCH /v1/departments/:id`
  - Capability contract: `departments:read`, `departments:write`
  - Data model: `workspace_departments`
  - Verified behavior: default `00`-`12` departments, management department
    linked view, custom department create/update, invalid linked-view denial,
    and cross-workspace department isolation.
- Workforce authority:
  - API: `GET /v1/workforce`, `GET /v1/workforce/:id`,
    `POST /v1/workforce`, `PATCH /v1/workforce/:id`,
    `DELETE /v1/workforce/:id`,
    `POST /v1/workforce/:id/actions/delete`,
    `POST /v1/workforce/:id/actions/sync`
  - Capability contract: `workforce:read`, `workforce:write`
  - Data model: `workforce_entities`
  - Verified behavior: owner-backed human presence, agent creation with
    generated files, skill and Big Five normalization, Paperclip sync queueing,
    user-backed workforce hard-delete denial, agent hard delete, deleted read
    returning `404`, and cross-workspace workforce isolation.
- Related read packets:
  - `GET /v1/dashboard/command` includes workforce counts and blocks direct
    dashboard assignment without an assignment model.
  - `GET /v1/operations/work-items` exposes assignment options and requires
    `operations:write` for owner/reviewer/workforce assignment commands.

## Proof
- Command:
  `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5333-postgres COMPANYCORE_TEST_DB_PORT=55533 npm run test:api:local`
- Result: PASS.
- Evidence:
  - server build PASS
  - web build PASS
  - Prisma migrate deploy PASS with all `31` migrations applied to disposable
    PostgreSQL `companycore_test` at `127.0.0.1:55533`
  - seed PASS
  - Node API tests PASS: `7/7`
  - `CompanyCore v1 protected API flow` PASS in `93192.6202ms`
  - full test duration `99170.5941ms`

## Drift Checks
- `npm run check:route-capabilities`: PASS
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- `npm run architecture:status`: PASS
  - `Architecture Status: GREEN`
  - graph `454` nodes / `765` relations / `35` chains
  - evidence queue `0`
  - chain worklist `0`
  - delta nodes `0`, relations `0`, chains `0`
  - all gates pass `yes`

## Cleanup Evidence
- `docker ps -a --filter name=^/companycore-luc-5333-postgres$ --format "{{.Names}} {{.Status}}"`: no output.
- `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue`: no output.
- No browser proof, dev server, watcher, deploy, protected smoke, credential
  access, secret disclosure, or live provider action was started.

## Acceptance Criteria
- [x] Local API proof passes against a disposable test database.
- [x] Proof covers department catalog isolation, workforce authority behavior,
  user-backed deletion denial, generated workforce material, sync queueing,
  route/capability exposure, and workspace isolation where covered by existing
  assertions.
- [x] Route/capability and architecture status checks pass.
- [x] No validation-owned database container or headless browser process
  remains.
- [x] No repair issue is warranted unless proof finds a concrete defect.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.
- No mock-only path, placeholder, temporary bypass, production mutation, or
  protected action was introduced.

## Result Report
- Task summary: verified the Department/Workforce authority and read-packet
  slice through existing local API regression coverage and green drift checks.
- Files changed: this evidence packet and adjacent project state notes.
- How tested: `npm run test:api:local`, `npm run check:route-capabilities`,
  `npm run architecture:status`, and cleanup checks.
- What is incomplete: protected production proof, live provider behavior, and
  browser parity remain separate approval/credential-gated or future UI proof
  lanes.
- Repair decision: no repair child issue is warranted because no defect was
  found.
- Next proof candidate: read-only department intelligence packets,
  Relationship/Operating Graph, or Intake routing, selected only through a new
  scoped QA issue.
