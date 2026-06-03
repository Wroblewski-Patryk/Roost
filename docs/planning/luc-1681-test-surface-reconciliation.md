# LUC-1681 Test Surface Reconciliation From Known-State Baseline

Status: DONE
Task Type: QA / regression evidence planning
Current Stage: verification
Deliverable For This Stage: normalized test-surface reconciliation and first owner-scoped verification lanes
Last updated: 2026-06-03

## Goal

Reconcile Roost's current test surface against the known-state architecture
baseline without runtime mutation, deploy work, protected smoke, or feature
implementation.

## Scope

Inspected source files:

- `package.json`
- `src/tests/api.test.ts`
- `scripts/test-api-local.mjs`
- `docs/engineering/testing.md`
- `docs/graphs/architecture-health.json`
- `.agents/state/module-confidence-ledger.md`
- `docs/testing/test-map.csv`

## Baseline Signals

| Signal | Evidence | Status |
| --- | --- | --- |
| Architecture health generated | `docs/graphs/architecture-health.json`, generated `2026-06-03T05:36:09.899Z` | present in code, behavior unknown |
| Architecture entity count | `8726` entities, `10149` relations | present in code, behavior unknown |
| API endpoint entities | `57` | present in code, behavior unknown |
| Test entities in architecture graph | `1` | present in code, behavior unknown |
| Implementation without tests signal | `7518` | present in code, behavior unknown |
| Verified without proof signal | `0` | verified by source inspection |
| Test map rows | `8` rows in `docs/testing/test-map.csv` | present in docs, freshness mixed |
| Executable automated test files found | only `src/tests/api.test.ts` under repo test/spec patterns, excluding `dist`, `.tmp`, and `node_modules` | verified by `rg --files` |

## Current Test Surface

| Surface | Entrypoint | Coverage type | Local safety | Reconciliation |
| --- | --- | --- | --- | --- |
| Public JS marker | `npm run check:public-js` | static marker | safe, no mutation | Passed. It only confirms legacy public JS was removed; it is not a real syntax gate beyond the message. |
| Route capability drift | `npm run check:route-capabilities` | static validation | safe, no runtime mutation observed | Passed with `checkedManifestRoutes=179`, `checkedRouteFiles=34`, `status=ok`. Covers route/capability metadata, not behavior. |
| Server and web build | `npm run build` | type/build gate | writes build artifacts | Required by `test:api` and `validate`; not run in this read-only lane. |
| Full architecture refresh | `npm run architecture:refresh` / `npm run validate` | generated architecture gates | writes generated status/graph artifacts | Not run here because this issue asked for read-only reconciliation, not regeneration. Recent project state records green architecture gates. |
| API integration tests | `npm run test:api` | destructive DB integration | safe only against disposable local test PostgreSQL | Not run here. Requires `DATABASE_URL`, build, migrations, and destructive database reset guarded by test DB checks. |
| Local API harness | `npm run test:api:local` | destructive DB integration with harness | starts/removes Docker PostgreSQL when `DATABASE_URL` is unset | Not run here. Safe by design for disposable local DB, but it mutates Docker/local DB resources and is outside this no-runtime-mutation issue. |
| Production/protected smokes | `adapter:smoke`, `mcp:smoke`, `ai-ready:smoke`, `aog:deploy-smoke`, `google-drive:smoke` | protected runtime smoke | requires credentials and explicit target approval | Not run here. These remain separate protected proof lanes. |
| Browser/Playwright proof | prior artifacts in `docs/ux/evidence` and `docs/testing/test-map.csv` | manual/render smoke evidence | depends on local server/browser setup | Existing evidence is useful historical proof, but not a current repeatable automated suite. |

## API Test Reconciliation

`src/tests/api.test.ts` is one large Node built-in test file, not one narrow
unit suite.

Observed by source inspection:

- `7` top-level `test(...)` cases.
- `1536` assertion calls matching `assert.equal`, `assert.ok`, `assert.deepEqual`, or `assert.match`.
- `197` helper `request(...)` calls.
- `96` unique literal request paths found by static scan.
- The first six tests cover production environment/config behavior.
- The seventh test, `CompanyCore v1 protected API flow`, is a broad integration scenario over auth, workspace scoping, service API keys, route envelopes, operating model, dashboard, operations, assets, strategy, finance, sales, relationships, Company OS, MCP manifest/profile access, Google Drive, ClickUp, events, and provider failure/idempotency behaviors.

Normalized status:

| Area | Current automated proof | Status |
| --- | --- | --- |
| Production env fail-closed checks | explicit top-level tests for missing/placeholder secrets and hash fallback | covered |
| Production CORS/default host behavior | explicit top-level tests | covered |
| Health build metadata | explicit top-level test | covered |
| Auth/register/login/session | covered inside broad protected-flow test | covered, but broad |
| Workspace isolation | covered repeatedly inside broad protected-flow test | covered, but broad |
| Service API key scopes and MCP profiles | covered inside broad protected-flow test | covered, but broad |
| Route behavior for many v1 modules | covered inside broad protected-flow test | covered, but broad |
| ClickUp sync/discovery/webhook behavior | mocked provider coverage inside broad protected-flow test | covered, but broad |
| Google Drive OAuth/import/content behavior | mocked provider coverage inside broad protected-flow test | covered, but broad |
| UI routes and component behavior | not automated in `src/tests/api.test.ts`; historical Playwright/browser evidence exists in docs | smoke-only / historical |
| Per-route guardrail matrix from `docs/engineering/testing.md` | not mapped endpoint-by-endpoint | partially covered / unknown |
| AI adversarial protocol | not represented as repeatable automated tests in current test file | untested / unknown |
| Production protected runtime smokes | known separate blocked lane due invalid runtime key evidence in project state | blocked outside this issue |

## Command Prerequisites And Safety

| Command | Should be used for | Prerequisites | Safe locally? | Notes |
| --- | --- | --- | --- | --- |
| `npm run check:public-js` | quick static marker | installed dependencies | yes | Passed in this heartbeat. |
| `npm run check:route-capabilities` | route/capability drift gate | installed dependencies | yes | Passed in this heartbeat. |
| `npm run build` | TypeScript/Vite build confidence | installed dependencies; may write `dist`/web build artifacts | yes, but writes artifacts | Use before source-control closure for code changes. |
| `npm run test:api` | disposable DB integration suite | built code, `DATABASE_URL` pointing at local test DB named `companycore_test` or explicit destructive override | conditionally safe | Destructive reset is guarded by `assertSafeTestDatabase()`. |
| `npm run test:api:local` | preferred local API test entrypoint | Docker available, or explicit safe `DATABASE_URL` | conditionally safe | Starts `companycore-test-postgres` on port `55432` when `DATABASE_URL` is unset and removes it unless `COMPANYCORE_TEST_DB_KEEP=1`. |
| `npm run validate` | broad repo gate | build + generated architecture gates + route gate | safe, but writes generated architecture/status artifacts | Use after implementation or architecture changes, not for this read-only reconciliation. |
| `npm run aog:deploy-smoke` | target runtime AOG/MCP proof | `COMPANYCORE_BASE_URL`, valid `COMPANYCORE_API_KEY`, explicit approval for protected target | protected | Keep `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=true` disabled unless approved. |

## First Verification Lanes

| Lane | Owner | Purpose | Scope | Proof |
| --- | --- | --- | --- | --- |
| QA-API-001 | QA Regression Lead + Backend Builder | Split or index the broad API test into domain-level proof sections without changing behavior. | `src/tests/api.test.ts`, docs test map only. | Static inventory of test sections and preserved `npm run test:api:local` behavior. |
| QA-ROUTE-001 | QA Regression Lead | Map the `docs/engineering/testing.md` workspace guardrail matrix to the 57 API endpoint entities. | Architecture graph, route modules, existing test assertions. | CSV/table showing covered, partially covered, missing, and blocked guardrails per route family. |
| QA-UI-001 | QA Regression Lead + Frontend Builder | Convert the most important historical Playwright/browser proofs into repeatable smoke commands. | Existing `docs/ux/evidence`, `owner-console:ux-smoke`, route registry. | Command list with desktop/mobile route set, account class, and artifact path contract. |
| QA-INTEGRATION-001 | QA Regression Lead + Security/Ops for protected target rules | Separate local mocked integration tests from production/protected provider smokes. | ClickUp, Google Drive, MCP, AOG smoke scripts. | Matrix of local-mock proof, credential class, mutation risk, redaction rule, and approval gate. |
| QA-AI-001 | QA Regression Lead + AI Red Team/Security | Add an AI protocol coverage map before any AI behavior is marked verified. | `AI_TESTING_PROTOCOL.md`, MCP/AI-ready smoke, agent-facing routes. | AI adversarial scenario table with current status and first repeatable fail-closed checks. |

## Result Report

- Reconciled the known-state mismatch: Roost has one architecture test entity
  and one executable API test file, but that file contains broad integration
  coverage with many assertions and request paths.
- Confirmed the current repeatable automated proof is concentrated in API and
  static route/capability checks. UI evidence exists mostly as historical
  Playwright/browser artifacts, not as a normalized current smoke suite.
- Confirmed `test:api:local` is the correct local integration entrypoint, but
  it owns a disposable database/container lifecycle and was not executed in
  this read-only, no-runtime-mutation issue.
- No product code, deploy path, protected smoke, runtime process, browser
  session, Docker container, or database was started or mutated in this lane.

## Verification Evidence

Commands run in this heartbeat:

```powershell
npm run check:public-js
# PASS: legacy public JS removed; React/Vite build is the web syntax gate

npm run check:route-capabilities
# PASS: checkedManifestRoutes=179, checkedRouteFiles=34, status=ok

rg --files -g "*test*" -g "*spec*" -g "*.test.ts" -g "*.spec.ts" -g "*.test.tsx" -g "*.spec.tsx" -g "!node_modules" -g "!dist" -g "!.tmp"
# PASS: only executable source test file found: src/tests/api.test.ts

rg -n "^test\(" src/tests/api.test.ts
# PASS: 7 top-level Node test cases found
```

Not run:

- `npm run test:api:local`: blocked by issue scope, not by tooling. It can
  create/remove a Docker PostgreSQL test container and destructively reset a
  local test database.
- Protected production/runtime smokes: outside this issue and require valid
  credentials plus explicit target approval.
