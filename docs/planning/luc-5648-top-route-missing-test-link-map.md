# LUC-5648 Top Route Missing-Test Link Map

## Header
- ID: LUC-5648
- Title: [Roost] [Architecture] Map top route missing-test links after LUC-5646
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Priority: P1
- Mission ID: LUC-5648-TOP-ROUTE-MISSING-TEST-LINK-MAP
- Mission Status: VERIFIED

## Goal
Map the current top route-shaped missing-test-link records after
[LUC-5646](/LUC/issues/LUC-5646), distinguish missing evidence links from
real proof gaps, and hand off the smallest follow-up owner actions without
changing runtime code.

## Scope
- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-27T20:14:16.507Z`.
- Current evidence packet:
  `docs/planning/luc-5646-known-state-evidence-and-architecture-baseline.md`.
- Route and tests inspected:
  - `src/app.ts`
  - `src/modules/auth/auth.routes.ts`
  - `src/modules/dashboard/dashboard.routes.ts`
  - `src/tests/api.test.ts`

## Exclusions
- No product code, schema, migration, test authoring, browser run, database
  container, local server, source-control commit, push, deploy, protected
  smoke, credential access, provider action, or production mutation.

## Current App-Completion Snapshot
| Metric | Value |
| --- | ---: |
| Generated | `2026-06-27T20:14:16.507Z` |
| Items | `883` |
| User flows | `7` |
| Missing test links | `858` |
| Missing doc links | `0` |
| Blocked records | `0` |
| Priority review items inspected | `200` |
| Route-like top missing-test records | `9` |

The current top-200 priority queue is dominated by capability and generated
document linkage records. Nine top records are route-shaped when generated
API/page records are included: two Express auth mount records, two Google
Drive OAuth API records, two auth page records, one auth route-module record,
one dashboard mount record, and one dashboard route-module record.

## Route Missing-Test Link Map
| Rank | Flow | App-completion record | Path | Current evidence seen | Classification | Owner action |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Account access | `USE /auth` | `src/app.ts#/auth` | `src/app.ts` mounts `authRouter` at `/auth`; `src/tests/api.test.ts` exercises `/auth/register` through owner registration. Recent packets [LUC-5561](/LUC/issues/LUC-5561) and [LUC-5570](/LUC/issues/LUC-5570) already cover auth/account and API auth/config posture. | Evidence-link gap plus possible alias parity gap. | Engineering Delivery Lead maps existing auth tests to this route record or adds a narrow mount-level assertion for `/auth/register`, `/auth/login`, and `/auth/me` behavior. |
| 2 | Account access | `USE /v1/auth` | `src/app.ts#/v1/auth` | `src/app.ts` mounts the same `authRouter` at `/v1/auth`; top evidence does not show an explicit `/v1/auth/*` alias assertion. | Small real proof gap if no alias test exists. | Engineering Delivery Lead adds or maps a focused alias-parity test for `/v1/auth/register` or `/v1/auth/login`, including validation/auth error behavior. |
| 3 | Account access | `POST /v1/integration-settings/google_drive/oauth/authorize-url` | `docs/architecture/nodes/generated/API-AUTO-0144.md` | `src/tests/api.test.ts` exercises `/v1/integration-settings/google_drive/oauth/authorize-url`, including user-token success, service-token denial, and reconnect behavior around lines `7787`, `7804`, and `7825`. | Evidence-link gap. | Docs Memory Lead or Engineering Delivery Lead links the generated API node to the existing integration-settings API proof. No new test is warranted from this record alone. |
| 4 | Account access | `POST /v1/integration-settings/google_drive/oauth/exchange` | `docs/architecture/nodes/generated/API-AUTO-0145.md` | `src/tests/api.test.ts` exercises `/v1/integration-settings/google_drive/oauth/exchange` around line `7851` and verifies refreshed OAuth persistence. | Evidence-link gap. | Docs Memory Lead or Engineering Delivery Lead links the generated API node to the existing Google Drive OAuth exchange proof. |
| 5 | Account access | `/auth/login` | `docs/architecture/nodes/generated/PAGE-AUTO-0003.md` | `web/src/main.tsx` routes `/auth/login`; `web/src/features/auth/auth-pages.tsx` posts to `/v1/auth/login`; [LUC-5561](/LUC/issues/LUC-5561) records local browser login proof and `/v1/auth/me` verification. | Evidence-link gap. | Docs Memory Lead maps the generated page node to [LUC-5561](/LUC/issues/LUC-5561), `docs/ux/v1-web-view-index-2026-05-15.md`, and auth page implementation evidence. |
| 6 | Account access | `/auth/register` | `docs/architecture/nodes/generated/PAGE-AUTO-0004.md` | `web/src/main.tsx` routes `/auth/register`; `web/src/features/auth/auth-pages.tsx` posts to `/v1/auth/register`; [LUC-5561](/LUC/issues/LUC-5561) records local browser registration proof and post-registration authenticated route proof. | Evidence-link gap. | Docs Memory Lead maps the generated page node to [LUC-5561](/LUC/issues/LUC-5561), `docs/ux/v1-web-view-index-2026-05-15.md`, and auth page implementation evidence. |
| 7 | Account access | `auth.routes.ts` | `src/modules/auth/auth.routes.ts` | Route module contains `POST /register`, `POST /login`, and `GET /me`; existing API harness uses `registerOwner()` via `/auth/register`, has login coverage around line `5801`, and production-env auth secret tests exist. | Evidence-link gap with partial alias parity risk. | Engineering Delivery Lead maps existing registration/login/token tests and adds only the smallest missing `/v1/auth/*` alias check if not already covered. |
| 8 | Dashboard overview | `USE /dashboard` | `src/app.ts#/dashboard` | `src/app.ts` mounts `dashboardRouter` under protected routes and `/v1`; `src/tests/api.test.ts` currently verifies `/v1/dashboard/command`, MCP manifest exposure, and command payload shape. | Evidence-link gap for versioned route, possible unversioned mount gap. | Engineering Delivery Lead maps the `/v1/dashboard/command` test to this route record or adds one protected `/dashboard/command` mount assertion if unversioned API compatibility is intentional. |
| 9 | Dashboard overview | `dashboard.routes.ts` | `src/modules/dashboard/dashboard.routes.ts` | Existing API harness validates `companycore_get_dashboard_command`, `/v1/dashboard/command`, summary fields, department signals, priority items, next actions, blocked actions, and `read_only_command_center` mode. | Mostly evidence-link gap. | QA/Test or Engineering Delivery Lead links the existing dashboard command proof packets ([LUC-5396](/LUC/issues/LUC-5396), [LUC-5235](/LUC/issues/LUC-5235), and current `src/tests/api.test.ts`) before requesting broader dashboard proof. |

## Architecture Fit
- The route map matches the approved Express app structure in `src/app.ts`:
  public auth routes mount before `requireApiKey`; protected routes mount both
  unversioned and under `/v1`.
- No architecture mismatch was found.
- No route, API contract, data model, or deployment behavior changed.

## Follow-Up Recommendation
Do not create another broad proof ladder from these five records alone.
Recommended order:

1. Engineering Delivery Lead: close the actual `/v1/auth` alias parity gap if
   no existing test covers it.
2. Engineering Delivery Lead: map existing auth registration/token evidence to
   `/auth` and `auth.routes.ts` route records.
3. Docs Memory Lead or Engineering Delivery Lead: map generated Google Drive
   OAuth API nodes and auth page nodes to existing test/proof packets.
4. Engineering Delivery Lead or QA/Test: map the existing dashboard command
   API test and earlier dashboard proof packets to `/dashboard` and
   `dashboard.routes.ts`.
5. QA/Test: only run a fresh dashboard or auth browser/API proof if evidence
   mapping finds a real regression or missing behavior, not merely because the
   app-completion scanner still reports broad capability-level missing links.

## Acceptance Criteria
- [x] Latest [LUC-5646](/LUC/issues/LUC-5646) app-completion snapshot was used.
- [x] Top route-shaped missing-test-link records were extracted from the
      priority queue.
- [x] Existing route and test evidence was inspected before recommending work.
- [x] Each top route record has a classification and named owner action.
- [x] No runtime, protected, production, source-control, or credential action
      was taken.

## Validation Evidence
- Parsed `docs/status/app-completion-index.json`: PASS; `883` items,
  `858` missing test links, `0` blocked records, `200` priority items.
- Route-like extraction from `priorityReviewItems`: PASS; `9` route-shaped
  top records found.
- Code inspection:
  - `src/app.ts` confirms `/auth`, `/v1/auth`, `/dashboard`, and `/v1`
    protected mount structure.
  - `src/modules/auth/auth.routes.ts` confirms register/login/me routes.
  - `src/modules/dashboard/dashboard.routes.ts` confirms dashboard command
    route behavior.
  - `src/tests/api.test.ts` confirms existing `/auth/register`,
    `/auth/login`, Google Drive OAuth, and `/v1/dashboard/command`
    assertions.

## Result Report
[LUC-5648](/LUC/issues/LUC-5648) is complete as an architecture mapping lane.
The current top route missing-test-link set is narrow and mostly evidence-link
debt. The only likely new test need is `/v1/auth` alias parity if no existing
assertion covers it. Google Drive OAuth, auth pages, and dashboard command
already have meaningful proof that should be linked before new proof work is
requested. No product repair issue is warranted from this mapping alone.

## Deployment Impact
None.

## Residual Risk
The app-completion scanner still reports broad missing-test-link debt
(`858` records) outside the five top route-shaped records mapped here. That
remaining debt should continue through focused QA proof ladders and evidence
linking, not broad unscoped route work.
