# LUC-5338 Read-Only Department Intelligence Proof Ladder

## Task Contract

- Task Type: QA proof / regression evidence
- Current Stage: verification
- Deliverable For This Stage: local QA proof packet for protected read-only department intelligence packets.
- Goal: prove the next named local API confidence slice after Auth/Workspace/API-key and Department/Workforce: read-only department intelligence packets.
- Scope:
  - `src/modules/strategy/strategy.routes.ts`
  - `src/modules/sales/sales.routes.ts`
  - `src/modules/operations/operations.routes.ts`
  - `src/modules/finance/finance.routes.ts`
  - `src/modules/assets/assets.routes.ts`
  - `src/modules/relationships/relationships.routes.ts`
  - `src/modules/operating-graph/operating-graph.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
  - `docs/planning/luc-5336-known-state-evidence-and-architecture-baseline.md`
- Exclusions: no feature code, schema, migration authoring, push, deploy, restart, protected smoke, production mutation, live provider credentials, secret disclosure, browser proof, live account mutation, or watcher.
- Implementation Plan:
  1. Map the selected read-packet routes to capability names and existing API assertions.
  2. Run `npm run test:api:local` with a unique disposable database.
  3. Run `npm run check:route-capabilities`.
  4. Run `npm run architecture:status`.
  5. Check validation cleanup and record pass/fail, residual risk, and repair decision.
- Acceptance Criteria:
  - Exact protected read packet routes and capabilities under test are mapped.
  - Local API proof passes or failures are recorded with command output.
  - Route-capability and architecture gates pass or failures are recorded.
  - Cleanup evidence is recorded.
  - A clear repair/no-repair decision is recorded.
- Definition of Done:
  - QA proof packet is durable in repo planning state.
  - Project state, task board, module confidence, system health, and next steps reflect the proof result.
  - Paperclip issue is updated with final disposition.

## Route And Capability Map

| Packet | Protected route | Capability | Source route | Existing proof focus |
| --- | --- | --- | --- | --- |
| Strategy | `GET /v1/strategy/context` | `strategy:read` | `src/modules/strategy/strategy.routes.ts` | unauthenticated denial, workspace-scoped packet, `agentPacket.mode=read_only`, blocked strategy actions, foreign workspace isolation, MCP manifest exposure, scoped-key denial |
| Sales | `GET /v1/sales/context` | `sales:read` | `src/modules/sales/sales.routes.ts` | unauthenticated denial, client/deal filtered read packet, commercial exception handoff, blocked outreach/terms actions, foreign workspace isolation, MCP manifest exposure, scoped-key denial |
| Operations read packet | `GET /v1/operations/context` | `operations:read` | `src/modules/operations/operations.routes.ts` | unauthenticated denial, read-only operating rhythm packet, blocked procedure-change actions, foreign workspace isolation, MCP manifest exposure, scoped-key denial |
| Operations work items read packet | `GET /v1/operations/work-items` | `operations:read` | `src/modules/operations/operations.routes.ts` | work-item packet readback, assignment options, explicit write command inventory, required `operations:write` capabilities |
| Finance | `GET /v1/finance/context` | `finance:read` | `src/modules/finance/finance.routes.ts` | unauthenticated denial, pricing/invoice/commercial context, `agentPacket.mode=read_only`, blocked finance actions, foreign workspace isolation, MCP manifest exposure, scoped-key denial |
| Assets | `GET /v1/assets/context` | `assets:read` | `src/modules/assets/assets.routes.ts` | unauthenticated denial, scoped asset/resource packet, refresh path, limit behavior, `agentPacket.mode=read_only`, blocked provider-file actions, foreign workspace isolation, MCP manifest exposure |
| Asset preview | `GET /v1/assets/files/:id/preview` | `assets:read` | `src/modules/assets/assets.routes.ts` | read-only file preview surface covered by route-capability mapping |
| Relationships context | `GET /v1/relationships/context` | `relationships:read` | `src/modules/relationships/relationships.routes.ts` | unauthenticated denial, relationship packet, `agentPacket.mode=read_only`, blocked outreach/commitment actions |
| Relationships graph | `GET /v1/relationships/graph` | `relationships:read` | `src/modules/relationships/relationships.routes.ts` | relationship graph read packet and MCP manifest exposure |
| Area operating graph | `GET /v1/operating-graph/areas/:areaKey` | `operating-graph:read` | `src/modules/operating-graph/operating-graph.routes.ts` | strategy/sales/finance area graph readback, missing area `404`, foreign workspace behavior, MCP manifest exposure |

## Verification Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Local API proof | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5338-postgres COMPANYCORE_TEST_DB_PORT=55538 npm run test:api:local` completed server/web build, applied all `31` migrations, seeded, and passed `7/7` API subtests. `CompanyCore v1 protected API flow` duration `11538.5699ms`; total `14273.6392ms`. |
| Route capability gate | PASS | `npm run check:route-capabilities` returned `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| Architecture status gate | PASS | `npm run architecture:status` returned `GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup | PASS | `docker ps -a --filter "name=companycore-luc-5338-postgres"` returned no container; `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no process. |

## Result Report

- Classification: verified for local API behavior.
- Affected architecture/user-flow surface: protected department read-packet API confidence ladder selected from [LUC-5336](/LUC/issues/LUC-5336), covering Strategy, Sales, Operations, Finance, Assets, Relationships, and Operating Graph packet routes.
- Files changed: this QA packet plus project state/queue/ledger updates only.
- Runtime/product code changed: none.
- Repair issue warranted: no. The focused proof found no defect and route/capability exposure remains consistent.
- Deployment impact: none. No push, deploy, restart, protected smoke, production mutation, live provider credential use, or secret access occurred.
- Residual risk: browser rendering and protected production/provider proof remain separate approval/credential-gated or future UI lanes; this issue proves local API contracts and capability exposure only.
