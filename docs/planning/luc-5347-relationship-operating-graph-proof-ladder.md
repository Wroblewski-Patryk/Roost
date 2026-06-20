# Task

## Header
- ID: LUC-5347
- Title: Relationship and Operating Graph local proof ladder
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-5344](/LUC/issues/LUC-5344)
- Priority: P1
- Module Confidence Rows: Relationship and Operating Graph read behavior
- Iteration: 2026-06-21 QA heartbeat
- Operation Mode: TESTER
- Mission ID: LUC-5347-RELATIONSHIP-OPERATING-GRAPH-PROOF
- Mission Status: VERIFIED

## Mission Block
- Mission objective: Convert the [LUC-5344](/LUC/issues/LUC-5344) `implementation_without_tests=1162` confidence signal into one focused local QA proof ladder for Relationship and Operating Graph read behavior.
- Release objective advanced: Roost CompanyCore local confidence for protected read packet semantics and MCP exposure.
- Included slices: `/v1/relationships/context`, `/v1/relationships/graph`, `/v1/operating-graph/areas/:areaKey`, route/capability manifest alignment, MCP manifest exposure, local API assertions, and cleanup checks.
- Explicit exclusions: no protected production smoke, live provider action, deploy, push, restart, production mutation, credential access, secret disclosure, browser proof, schema change, migration authoring, or feature implementation.
- Handoff expectation: QA closes this issue as `done`; create a repair issue only if focused proof finds a concrete defect.

## Context
[LUC-5344](/LUC/issues/LUC-5344) confirmed the Roost architecture and route-capability gates are green while the architecture-awareness scanner still reports `implementation_without_tests=1162`. Prior QA lanes already verified Auth/Workspace/API-key, Department/Workforce, and read-only department intelligence packets. This issue focuses the next named proof ladder on relationship and operating graph read behavior.

## Goal
Prove that Relationship and Operating Graph read routes are protected, workspace-scoped, capability-aligned, exposed through MCP where intended, and covered by local disposable API assertions.

## Scope
- Routes:
  - `GET /v1/relationships/context`
  - `GET /v1/relationships/graph`
  - `GET /v1/operating-graph/areas/:areaKey`
- Code reviewed:
  - `src/app.ts`
  - `src/modules/relationships/relationships.routes.ts`
  - `src/modules/operating-graph/operating-graph.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`

## Implementation Plan
1. Map the three requested routes to app mounts, route modules, capabilities, MCP manifest exposure, and existing test assertions.
2. Run `npm run test:api:local` with a unique disposable local PostgreSQL container and port.
3. Run `npm run check:route-capabilities`.
4. Run `npm run architecture:status`.
5. Verify local cleanup for the validation DB container and headless browser processes.
6. Record evidence and close the issue with no repair lane unless a concrete defect appears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- `src/app.ts` mounts protected routes through `requireApiKey` and `mountProtectedRoutes`, including `/relationships` and `/operating-graph`.
- `src/modules/relationships/relationships.routes.ts` implements `/context` and `/graph` from authenticated `req.auth!.workspaceId`.
- `src/modules/operating-graph/operating-graph.routes.ts` implements `/areas/:areaKey` from authenticated `req.auth!.workspaceId`, resolves canonical department keys, and emits evidence-backed nodes, edges, gaps, and unsupported families.
- `src/auth/capabilities.ts` maps the target routes to `relationships:read` and `operating-graph:read`.
- `src/mcp/manifest.ts` derives MCP tools from the adapter manifest and marks GET routes as read risk with no approval requirement.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-5347](/LUC/issues/LUC-5347).
- Priority rationale: This is the next scoped proof ladder after [LUC-5338](/LUC/issues/LUC-5338) and directly reduces named confidence debt from [LUC-5344](/LUC/issues/LUC-5344).
- Deferred: Intake routing proof remains separate in [LUC-5348](/LUC/issues/LUC-5348).

### 3. Plan Implementation
- No runtime implementation was planned.
- Evidence plan used existing local integration assertions plus route/capability and architecture status gates.

### 4. Execute Implementation
- No feature code, schema, migration authoring, or runtime behavior changed.
- Added this evidence packet and state updates only.

### 5. Verify and Test
- `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5347-postgres COMPANYCORE_TEST_DB_PORT=55547 npm run test:api:local` passed.
  - Server build passed.
  - Web build passed.
  - Prisma applied 31 migrations to disposable local PostgreSQL.
  - Seed passed.
  - Node API test suite passed `7/7`.
  - `CompanyCore v1 protected API flow` passed in `73316.9445ms`.
  - Total duration: `93471.0197ms`.
- `npm run check:route-capabilities` passed with `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`.
- `npm run architecture:status` passed: `GREEN`, graph `454 nodes / 765 relations / 35 chains`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass.
- Cleanup check: no `companycore-luc-5347-postgres` container remained; no `chrome-headless-shell` process was found.

### 6. Self-Review
- Simpler option considered: route/capability check only. Rejected because the issue specifically requested protected read packet semantics and isolation proof.
- Technical debt introduced: no.
- Repair issue needed: no concrete defect was found.

### 7. Update Documentation and Knowledge
- Updated planning packet and state/source-of-truth files.
- Learning journal update: not applicable; no recurring new pitfall was confirmed.

## Route And Assertion Map

| Surface | Route/code owner | Capability/MCP exposure | Local assertions |
| --- | --- | --- | --- |
| Relationship graph | `src/modules/relationships/relationships.routes.ts` `/graph` | `relationships:read`; MCP reader profile exposes `/v1/relationships/graph` | `src/tests/api.test.ts:3353` through `3394` assert direct/provider/route-inferred edges, review items, unsupported families, and confidence summary |
| Relationships context | `src/modules/relationships/relationships.routes.ts` `/context` | `relationships:read`; MCP reader profile exposes `/v1/relationships/context` | `src/tests/api.test.ts:3468` through `3522` assert unauthenticated denial, canonical `05-relacje`/`sales-crm`, read-only agent packet, allowed actions, blocked outreach/commitment action, and scoped relationship records |
| Operating graph area | `src/modules/operating-graph/operating-graph.routes.ts` `/areas/:areaKey` | `operating-graph:read`; MCP manifest exposes `/v1/operating-graph/areas/:areaKey` as read/no approval | `src/tests/api.test.ts:3680` through `3785` assert canonical key resolution, goals/targets/metrics/workflows/tasks/knowledge/sources, evidence-backed edges, gaps/review items, cross-workspace non-leakage, missing area 404, and MCP manifest exposure |
| Reader profile and scoped key exposure | `src/auth/agent-key-profiles.ts`, `src/mcp/manifest.ts` | `mcp_company_os_reader` includes `relationships:read` and `operating-graph:read` | `src/tests/api.test.ts:5870` through `5960` assert profile scopes and MCP tool visibility |

## Acceptance Criteria
- [x] `/v1/relationships/context`, `/v1/relationships/graph`, and `/v1/operating-graph/areas/:areaKey` are mapped to code owners, capabilities, MCP exposure, and API assertions.
- [x] Protected read packet semantics are proven locally, including unauthenticated denial for relationships context and read-only agent packet behavior.
- [x] Workspace isolation is proven locally for operating graph area readback; foreign selected workspace does not see workspace A graph nodes.
- [x] Route/capability manifest alignment passes.
- [x] Architecture status remains green.
- [x] No concrete defect is found; no repair issue is warranted.

## Validation Evidence
- Tests:
  - `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5347-postgres COMPANYCORE_TEST_DB_PORT=55547 npm run test:api:local` -> PASS.
  - `npm run check:route-capabilities` -> PASS.
  - `npm run architecture:status` -> PASS.
- Manual checks:
  - Source review mapped routes, capabilities, MCP tools, app mounts, and assertions.
  - Cleanup check confirmed no validation DB container and no `chrome-headless-shell`.
- Reality status: verified.

## Security / Privacy Evidence
- Data classification: local disposable test data only.
- Trust boundaries: owner token/API key capability model, workspace scoping, and MCP route exposure.
- Permission or ownership checks: unauthenticated relationships context returned `401`; operating graph foreign workspace read did not leak workspace A graph nodes; reader profile stayed read-oriented for the tested routes.
- Secret handling: no secrets read or printed.
- Fail-closed behavior: missing operating graph area returned `404`; unauthorized relationship context returned `401`.
- Residual risk: protected production smoke and browser proof remain outside this local-only QA scope.

## Deployment / Ops Evidence
- Deploy impact: none.
- Env or secret changes: none.
- `DEPLOYMENT_GATE.md` reviewed: yes; no deploy attempted.

## Definition of Done
- [x] Code builds without errors as part of `npm run test:api:local`.
- [x] Feature works through the real local API path.
- [x] No mock, placeholder, fake, or temporary path was introduced.
- [x] Database migrations apply cleanly in disposable validation.
- [x] No existing functionality is broken by the tested API suite.
- [x] Changes are documented in source-of-truth state.
- [x] Behavior is reproducible from the commands above.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Result Report
- Task summary: Relationship and Operating Graph local read behavior is verified against protected API assertions, route/capability manifest alignment, MCP exposure, architecture status, and cleanup checks.
- Files changed: this planning packet plus project state/mission confidence notes.
- How tested: local disposable API test, route-capability check, architecture status.
- What is incomplete: production/browser/provider proof remains explicitly out of scope and gated.
- Next steps: [LUC-5348](/LUC/issues/LUC-5348) owns Intake routing proof; source-control closure for documentation/state changes remains a PM/source-control lane.
- Decisions made: no repair issue is warranted from this proof ladder.
