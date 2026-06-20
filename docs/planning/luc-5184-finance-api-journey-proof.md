# LUC-5184 Finance API Journey Proof

## Task Contract

- Task Type: QA verification / narrow route journey proof
- Current Stage: verification
- Deliverable For This Stage: focused local proof for the next release-relevant
  `implementation_without_tests` hotspot
- Goal: prove one current Roost route/API journey locally without converting
  the aggregate missing-test signal into broad test-generation work.

## Scope

- Issue: [LUC-5184](/LUC/issues/LUC-5184)
- Selected hotspot:
  - `GET /v1/finance/context`
  - `src/modules/finance/finance.routes.ts`
  - `web/src/features/departments/finance-route.tsx`
  - `docs/graphs/architecture-health.json` entries for `USE /finance`,
    `finance.routes.ts`, and `finance-route.tsx`
- Proof commands:
  - disposable local PostgreSQL container
  - `npm run build:server`
  - `npm run prisma:migrate:deploy`
  - `npm run seed`
  - `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js`
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Exclusions

No product/runtime code changes, schema or migration authoring, browser proof,
protected smoke, deploy, push, restart, production mutation, credential access,
secret disclosure, or production data access.

## Implementation Plan

1. Read current QA triage, proof ladder, and existing module confidence.
2. Select the next unclosed hotspot from module risk rather than raw scanner
   order.
3. Run the smallest safe local API proof for the selected journey.
4. Run route/capability and architecture status checks.
5. Clean up validation-owned local resources.
6. Record evidence and residual risk in source-of-truth files.

## Selected Journey

| Item | Selection |
| --- | --- |
| Journey | `07 Finance` read-only pricing, valuation, invoice-readiness, and owner-decision packet |
| User or release value | Finance is money-impacting. The owner and agents must see pricing candidates, commercial exceptions, invoice blockers, and blocked finance actions without accidentally quoting, discounting, invoicing, or writing payment state. |
| API route | `GET /v1/finance/context` |
| Web route using the packet | `/areas?area=07-finanse&view=overview` through `web/src/features/departments/finance-route.tsx` |
| Affected server files | `src/modules/finance/finance.routes.ts`, `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`, `src/app.ts`, `src/auth/capabilities.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts` |
| Architecture-health context | `docs/graphs/architecture-health.json` reports `implementation_without_tests=1162`, including `USE /finance`, `finance.routes.ts`, and `finance-route.tsx`. Prior curation classifies this as journey-proof debt, not a broad missing-test task. |

## Why This Journey

Recent local QA ladders already covered Operations, Assets, Product/Delivery,
Technology, Legal, Innovation, Management readback, and Strategy API proof.
Sales is already locally verified in the module confidence ledger. Finance is
the next useful read-only hotspot because it is money-impacting and its context
packet must fail closed around pricing policy, discounts, invoice sending, and
payment status writes.

## Verification Evidence

| Check | Command / Evidence | Result |
| --- | --- | --- |
| Source checkpoint | `git rev-parse HEAD` -> `6fd442616e597fec0891c0ae8e586a5c2a7a588f` | verified |
| Disposable database | Docker `postgres:16-alpine`, container `companycore-luc-5184-postgres`, port `55484`, database `companycore_test` | verified |
| Server build | `npm run build:server` with `DATABASE_URL=postgresql://companycore:companycore@127.0.0.1:55484/companycore_test?schema=public` and `NODE_ENV=test` | PASS |
| Migration replay | `npm run prisma:migrate:deploy` | PASS, `31` migrations applied |
| Seed | `npm run seed` | PASS |
| Focused API journey proof | `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js` | PASS, `1` test, duration `13721.1093ms` |
| Route/capability drift | `npm run check:route-capabilities` | PASS, `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| Architecture continuity | `npm run architecture:status` | PASS, `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |
| Container cleanup | `docker rm -f companycore-luc-5184-postgres`; follow-up `docker ps -a --filter "name=^/companycore-luc-5184-postgres$" --format "{{.Names}}"` returned no rows after the removal line | verified |
| Browser cleanup | `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no rows | verified; no browser was started |

## Assertions Covered By The Focused Flow

The selected test flow directly exercises `GET /v1/finance/context` through
the real Express/Prisma path and covers:

- unauthenticated denial;
- authenticated owner success;
- CH market pricing candidates;
- owner-decision-required pricing model state;
- hourly value assumption risk flags;
- commercial exception inclusion from the same workspace;
- invoice-readiness blocker state;
- pricing policy conflict detection;
- read-only agent packet mode;
- blocked finance actions including `set_active_price_policy`;
- no mutation during readback by comparing counts before and after;
- foreign workspace isolation;
- MCP manifest exposure for `companycore_get_finance_context` with
  `finance:read`, `riskLevel=read`, and `requiresApproval=false`.

## Acceptance Criteria

- [x] One release-relevant hotspot selected from current proof debt.
- [x] Exact route, files, and architecture-health context recorded.
- [x] Focused local API proof run against disposable local database.
- [x] Route/capability and architecture status gates pass.
- [x] Validation-owned resources cleaned up.
- [x] Residual risk and next owner path are explicit.

## Result Report

Status: `VERIFIED_DONE` for this QA proof slice.

The Finance context API journey is locally verified for read-only behavior,
workspace isolation, no-write readback, blocked money-impacting actions, and
MCP read exposure. No defect was found, so no repair child issue is warranted.
The aggregate `implementation_without_tests=1162` signal remains a
journey-proof selection signal, not a broad missing-test implementation task.

Files changed by this issue: this planning/evidence packet and source-of-truth
state updates only.

Runtime changes: none.

Local processes started: validation-owned PostgreSQL container
`companycore-luc-5184-postgres`, removed before closure.

Commit status: not committed in this QA heartbeat because the workspace already
contains existing generated/status changes from adjacent Roost lanes.

Push status: held; no push performed.

Deploy impact: none.

Residual risk: this was an API proof, not a desktop/mobile browser proof for
`/areas?area=07-finanse&view=overview`; protected production proof remains
under the existing approval/credential gate.
