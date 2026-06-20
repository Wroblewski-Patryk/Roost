# LUC-5301 API Endpoint Test-Evidence Gap QA Triage

## Header

- ID: LUC-5301
- Title: QA triage actionable API endpoint test-evidence gap from awareness refresh
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Mission ID: LUC-5301-API-ENDPOINT-TEST-EVIDENCE-GAP-QA-TRIAGE
- Mission Status: VERIFIED

## Goal

Classify the `2026-06-20T20:13:23.962Z` architecture-awareness
`implementation_without_tests=1162` / actionable `1153` signal for API
endpoints and produce the next ordered QA proof ladder without broad test
generation or runtime mutation.

## Scope

Read and classify:

- `docs/status/architecture-awareness-report.md`
- `docs/graphs/architecture-health.json`
- `docs/engineering/testing.md`
- `src/app.ts`
- `src/tests/api.test.ts`

Safe local checks only:

- `npm run check:route-capabilities`
- `npm run architecture:status`

Explicit exclusions: no product code, schema, migration authoring, protected
smoke, production mutation, deploy, push, restart, browser proof, credential
access, secret disclosure, or live provider action.

## Current-State Classification

The top actionable API list in `docs/status/architecture-awareness-report.md`
is mostly mount-level scanner inference from `src/app.ts`. The scanner sees
`app.use(...)` entries such as `/assets`, `/auth`, `/company-os`, `/tasks`,
and `/v1` as implemented API endpoint entities, but it does not infer the
granular request assertions already present inside `src/tests/api.test.ts`.

This means the gap is not a mandate to add 43 route tests. It is a QA planning
signal: route groups need named proof packets when they matter to release
confidence, especially where auth, workspace isolation, scoped API keys, MCP
exposure, provider actions, or cross-workspace denial are involved.

### Scanner Inference Noise

| Surface | Classification | Reason |
| --- | --- | --- |
| `GET /` | Scanner inference noise | Public web shell/static route, not the protected API release boundary for this issue. |
| `USE /v1` | Scanner inference noise | Router namespace mount; actual child route behavior must be proved by route group. |
| `USE /health`, `USE /v1/health` | Low-risk runtime probe | Public health is already covered by production/environment validation assertions in `src/tests/api.test.ts`; not a P0/P1 protected API proof-ladder candidate. |
| `USE /auth`, `USE /v1/auth` | Real boundary candidate | Auth is a public-to-owner trust boundary. Existing assertions cover registration/login indirectly, but it deserves named auth/workspace/API-key proof packet status. |
| Other `USE /...` mounts | Mixed | Many have existing integration assertions. Treat as proof-ladder candidates only when they protect auth/workspace/integration/money/AI authority. |

## Existing Evidence From Code Review

- `src/app.ts` mounts public health and auth before `requireApiKey`, then
  applies `apiRateLimiter`, `requireApiKey`, and protected route mounts both
  unprefixed and under `/v1`.
- `src/tests/api.test.ts` contains one broad `CompanyCore v1 protected API
  flow` that already exercises many scanner-listed route groups:
  Departments, Workforce, Intake, Commercial Exceptions, Finance, Sales,
  Operations, Assets, Strategy, Workspaces, Relationships, Operating Graph,
  Company OS, Process Core, Connection/MCP, Tasks, Google Drive, ClickUp, and
  Agent Events.
- Recent proof packets already closed named slices for Dashboard command,
  Operating Model, Company OS, Commercial Exceptions, Integration Settings,
  Agent Events, Google Drive, and Tasks/ClickUp lifecycle.

## Ordered QA Proof Ladder

Use these as the next 3-5 QA-owned proof slices. Each slice should run in a
separate issue or heartbeat and record the exact `npm run test:api:local`
container/port, route-capability gate, architecture status, and cleanup proof.

| Order | Proof slice | Route/module scope | Denied path | Allowed path | Command | Pass/fail criterion |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Auth, workspace, API-key authority boundary | `src/modules/auth/auth.routes.ts`, `src/modules/workspaces/workspaces.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/modules/connection/connection.routes.ts`; `/auth`, `/v1/auth`, `/v1/workspaces`, `/v1/api-keys`, `/v1/connection` | Missing API key for protected routes returns `unauthorized`; scoped service key cannot create API keys; cross-workspace select/read is denied or non-leaking | Owner registration/login works; owner can list/create/select own workspace; owner-created profile/scoped keys expose only expected capabilities and manifest tools | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-auth-workspace-postgres COMPANYCORE_TEST_DB_PORT=55501 npm run test:api:local`; then `npm run check:route-capabilities`; `npm run architecture:status` | API flow passes with auth/workspace/API-key assertions intact; route-capability status `ok`; architecture status GREEN; no validation DB/browser process left |
| 2 | Department catalog and workforce authority | `src/modules/departments/departments.routes.ts`, `src/modules/workforce/workforce.routes.ts`; `/v1/departments`, `/v1/workforce` | Unauthenticated access denied; invalid linked view rejected; workspace B cannot see workspace A custom department/workforce; user-backed workforce delete denied | Owner sees 13 default departments, creates/updates a custom department, creates/syncs/deletes agent-backed workforce, and reads expected summary | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-dept-workforce-postgres COMPANYCORE_TEST_DB_PORT=55502 npm run test:api:local`; then route-capability and architecture status gates | Local API proof demonstrates catalog/workforce workspace isolation and human/agent authority guardrails; no repair issue unless a concrete assertion fails |
| 3 | Read-only department intelligence packets | `src/modules/finance/finance.routes.ts`, `src/modules/sales/sales.routes.ts`, `src/modules/operations/operations.routes.ts`, `src/modules/strategy/strategy.routes.ts`; `/v1/finance/context`, `/v1/sales/context`, `/v1/operations/context`, `/v1/strategy/context` | Unauthenticated requests denied; scoped key lacking each read capability denied; foreign workspace returns no leaked source rows | Owner receives read-only packet with summary, source evidence, blocked actions, and MCP manifest exposure for each capability | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-read-packets-postgres COMPANYCORE_TEST_DB_PORT=55503 npm run test:api:local`; then route-capability and architecture status gates | Packets remain non-mutating, workspace-scoped, and capability-filtered; counts before/after stay stable for read-only routes |
| 4 | Relationship and operating graph isolation | `src/modules/relationships/relationships.routes.ts`, `src/modules/operating-graph/operating-graph.routes.ts`; `/v1/relationships/context`, `/v1/relationships/graph`, `/v1/operating-graph/areas/:areaKey` | Unauthenticated requests denied; invalid area returns stable error; foreign workspace graph cannot leak nodes/edges | Owner reads relationship context/graph and area graph for canonical areas; MCP manifest exposes read tools only with matching capability | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-graph-postgres COMPANYCORE_TEST_DB_PORT=55504 npm run test:api:local`; then route-capability and architecture status gates | Relationship/graph route behavior is workspace-scoped, canonical-area aware, and manifest-aligned |
| 5 | Intake and provider-to-work routing | `src/modules/intake/intake.routes.ts`, integration-derived provider evidence consumed by intake; `/v1/intake`, `/v1/intake/actions/propose-route`, `/v1/intake/route-proposals` | Unauthenticated request denied; foreign source proposal denied; invalid target department rejected | Owner reads intake from agent/provider/Drive sources, proposes route idempotently, reads proposal, and observes source systems unchanged | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-intake-postgres COMPANYCORE_TEST_DB_PORT=55505 npm run test:api:local`; then route-capability and architecture status gates | Proposal-only routing remains auditable, idempotent, workspace-scoped, and non-mutating to source systems |

## Verification Run In This Heartbeat

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run check:route-capabilities` | PASS | `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| `npm run architecture:status` | PASS | GREEN; graph `454` nodes / `765` relations / `35` chains; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass |
| Source review | PASS | `docs/status/architecture-awareness-report.md`, `docs/graphs/architecture-health.json`, `docs/engineering/testing.md`, `src/app.ts`, `src/tests/api.test.ts` |

No full `npm run test:api:local` was run in this heartbeat because the issue
acceptance is QA triage and proof-ladder ordering, not execution of the first
proof slice. The route/capability and architecture gates were sufficient safe
local checks for this classification. The listed slices should each run the
API local harness when selected as a proof issue.

## Acceptance Criteria

- [x] Scanner inference noise versus real release-confidence gaps is
      classified.
- [x] Next 3-5 proof slices are named with route/module, denied/allowed path,
      command, and pass/fail criterion.
- [x] Safe local checks were run with exact command evidence.
- [x] No protected smoke, production mutation, deploy, push, restart,
      credential access, or secret exposure occurred.
- [x] No concrete defect was found, so no repair child issue is warranted from
      this triage lane.

## Result Report

Task summary: LUC-5301 is complete as a QA triage and proof-ladder artifact.
The actionable API endpoint missing-test signal is route-mount scanner
confidence debt, not broad release-blocking test absence. The next useful QA
work is a sequence of named proof packets beginning with auth/workspace/API-key
authority, then department/workforce, department intelligence read packets,
relationship/operating graph isolation, and intake routing.

Files changed: this planning artifact plus project state/context updates.

How tested: `npm run check:route-capabilities` and
`npm run architecture:status` passed.

What is incomplete: the future proof slices themselves were not executed in
this triage lane.

Next step: create or select a scoped QA proof issue for slice 1,
Auth/Workspace/API-key authority boundary, and run the local API proof harness
there.
