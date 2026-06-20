# Task

## Header
- ID: LUC-5348
- Title: Intake routing local proof ladder
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-5344](/LUC/issues/LUC-5344)
- Priority: P1
- Module Confidence Rows: Intake and provider-to-work routing
- Iteration: 2026-06-21 QA heartbeat
- Operation Mode: TESTER
- Mission ID: LUC-5348-INTAKE-ROUTING-LOCAL-PROOF
- Mission Status: VERIFIED

## Mission Block
- Mission objective: Convert the [LUC-5344](/LUC/issues/LUC-5344) `implementation_without_tests=1162` confidence signal into one focused local QA proof ladder for intake and provider-to-work routing behavior.
- Release objective advanced: Roost CompanyCore local confidence for global intake read aggregation, proposal-only route command behavior, route proposal lifecycle evidence, and MCP/capability exposure.
- Included slices: `GET /v1/intake`, `POST /v1/intake/actions/propose-route`, `GET /v1/intake/route-proposals`, route/capability manifest alignment, MCP manifest exposure, local API assertions, and cleanup checks.
- Explicit exclusions: no protected production smoke, live provider action, deploy, push, restart, production mutation, credential access, secret disclosure, browser proof, schema change, migration authoring, feature implementation, or source/provider mutation.
- Handoff expectation: QA closes this issue as `done`; create a repair issue only if focused proof finds a concrete defect.

## Context
[LUC-5344](/LUC/issues/LUC-5344) confirmed the Roost architecture and route-capability gates are green while the architecture-awareness scanner still reports `implementation_without_tests=1162`. Prior QA lanes already verified Auth/Workspace/API-key, Department/Workforce, read-only department intelligence packets, and Relationship/Operating Graph behavior. This issue focuses the final named proof ladder from [LUC-5301](/LUC/issues/LUC-5301) on intake routing.

## Goal
Prove that global intake and provider-to-work routing are protected, workspace-scoped, capability-aligned, proposal-only for route commands, exposed through MCP where intended, and covered by local disposable API assertions.

## Scope
- Routes:
  - `GET /v1/intake`
  - `POST /v1/intake/actions/propose-route`
  - `GET /v1/intake/route-proposals`
- Code reviewed:
  - `src/app.ts`
  - `src/modules/intake/intake.routes.ts`
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
- `src/app.ts` mounts `/intake` and `/v1/intake` inside the protected route group behind `requireApiKey`.
- `src/modules/intake/intake.routes.ts` aggregates workspace-local agent events, provider inbox rows, Drive files, provider mappings, approvals, risks, tasks, and events into a read-only intake queue.
- `POST /actions/propose-route` validates canonical source model, source ID, canonical department key, classification, reason, risk, task-draft choice, and idempotency key, then creates `Decision`, optional `Task`, `AuditLog`, and `Event` evidence without mutating the source/provider state.
- `GET /route-proposals` reads proposal lifecycle evidence and returns a read-only agent packet with blocked actions for provider writes, approval decisions, and commercial/legal actions.
- `src/auth/capabilities.ts` maps the target routes to `intake:read` and `intake:write`.
- `src/auth/agent-key-profiles.ts` exposes `intake:read` on read profiles and `intake:write` only on event-worker/operator profiles.
- `src/mcp/manifest.ts` describes `intake:read` as read-risk and `intake:write` as proposal-only routing evidence with source/provider mutations blocked.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-5348](/LUC/issues/LUC-5348).
- Priority rationale: This is the remaining scoped proof ladder after [LUC-5347](/LUC/issues/LUC-5347) and directly reduces named confidence debt from [LUC-5344](/LUC/issues/LUC-5344).
- Deferred: production/provider/browser proof remains separate and gated.

### 3. Plan Implementation
- No runtime implementation was planned.
- Evidence plan used existing local integration assertions plus route/capability and architecture status gates.

### 4. Execute Implementation
- No feature code, schema, migration authoring, or runtime behavior changed.
- Added this evidence packet and state updates only.

### 5. Verify and Test
- `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5348-postgres COMPANYCORE_TEST_DB_PORT=55548 npm run test:api:local` passed.
  - Server build passed.
  - Web build passed.
  - Prisma applied 31 migrations to disposable local PostgreSQL.
  - Seed passed.
  - Node API test suite passed `7/7`.
  - `CompanyCore v1 protected API flow` passed in `64046.4203ms`.
  - Total duration: `72171.8119ms`.
- `npm run check:route-capabilities` passed with `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`.
- `npm run architecture:status` passed: `GREEN`, graph `454 nodes / 765 relations / 35 chains`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass.
- Cleanup check: no `companycore-luc-5348-postgres` container remained; no `chrome-headless-shell` process was found.

### 6. Self-Review
- Simpler option considered: route/capability check only. Rejected because the issue specifically requested intake routing proof, including proposal-only effects and source isolation.
- Technical debt introduced: no.
- Repair issue needed: no concrete defect was found.

### 7. Update Documentation and Knowledge
- Updated planning packet and state/source-of-truth files.
- Learning journal update: not applicable; no recurring new pitfall was confirmed.

## Route And Assertion Map

| Surface | Route/code owner | Capability/MCP exposure | Local assertions |
| --- | --- | --- | --- |
| Global intake read | `src/modules/intake/intake.routes.ts` `/` | `intake:read`; MCP exposes `companycore_get_intake` as read/no approval | `src/tests/api.test.ts:765` through `946` assert unauthenticated denial, mixed source aggregation, department inference, Paperclip filter, foreign workspace non-leakage, source delivery remains pending, and MCP read tool exposure |
| Route proposal command | `src/modules/intake/intake.routes.ts` `/actions/propose-route` | `intake:write`; MCP exposes `companycore_post_intake_actions_propose_route` as write/no approval, described as proposal-only | `src/tests/api.test.ts:960` through `1078` assert proposal creation, `Decision`, optional task draft, audit/event evidence, source/provider mutation flags false, blocked commercial/legal actions, pending source state, and idempotent replay |
| Route proposal readback | `src/modules/intake/intake.routes.ts` `/route-proposals` | `intake:read`; MCP exposes `companycore_get_intake_route_proposals` as read/no approval | `src/tests/api.test.ts:1079` through `1149` assert lifecycle state, summary counts, task/audit/event evidence, read-only agent packet, provider-write block, approval-decision block, and source/provider mutation flags false |
| Workspace and canonical routing denial | `src/modules/intake/intake.routes.ts` source lookup and Zod schemas | Protected route group plus canonical department key validation | `src/tests/api.test.ts:1152` through `1178` assert cross-workspace source proposal returns `404 intake_source_not_found` and non-canonical `07-finance` target is rejected with `400` |

## Acceptance Criteria
- [x] `/v1/intake`, `/v1/intake/actions/propose-route`, and `/v1/intake/route-proposals` are mapped to code owners, capabilities, MCP exposure, and API assertions.
- [x] Protected read behavior is proven locally, including unauthenticated denial for global intake.
- [x] Workspace isolation is proven locally; a foreign workspace source cannot be routed and is returned as not found.
- [x] Proposal routing is proven proposal-only: source mutation, agent event acknowledgement, and provider mutation remain false.
- [x] Idempotent replay and route proposal lifecycle readback are proven locally.
- [x] Canonical department routing validation rejects a non-canonical alias.
- [x] Route/capability manifest alignment passes.
- [x] Architecture status remains green.
- [x] No concrete defect is found; no repair issue is warranted.

## Validation Evidence
- Tests:
  - `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5348-postgres COMPANYCORE_TEST_DB_PORT=55548 npm run test:api:local` -> PASS.
  - `npm run check:route-capabilities` -> PASS.
  - `npm run architecture:status` -> PASS.
- Manual checks:
  - Source review mapped routes, capabilities, MCP tools, app mounts, and assertions.
  - Cleanup check confirmed no validation DB container and no `chrome-headless-shell`.
- Reality status: verified.

## Security / Privacy Evidence
- Data classification: local disposable test data only.
- Trust boundaries: owner token/API key capability model, workspace scoping, canonical route target validation, and MCP route exposure.
- Permission or ownership checks: unauthenticated intake returned `401`; foreign source proposal returned `404 intake_source_not_found`; invalid department key returned `400`.
- Secret handling: no secrets read or printed.
- Fail-closed behavior: invalid source and invalid routing target do not create proposal evidence.
- Residual risk: protected production smoke, browser proof, and live provider proof remain outside this local-only QA scope.

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
- [x] `INTEGRATION_CHECKLIST.md` was checked; applicable API, DB, validation, idempotency, fail-closed, and no-regression items are covered by the local proof.

## Result Report
- Task summary: Intake routing local behavior is verified against protected API assertions, route/capability manifest alignment, MCP exposure, architecture status, and cleanup checks.
- Files changed: this planning packet plus project state/mission confidence notes.
- How tested: local disposable API test, route-capability check, architecture status.
- What is incomplete: production/browser/provider proof remains explicitly out of scope and gated.
- Next steps: source-control closure for documentation/state changes remains a PM/source-control lane if the board requires a local commit bundle; no QA repair issue is warranted.
- Decisions made: no repair issue is warranted from this proof ladder.
