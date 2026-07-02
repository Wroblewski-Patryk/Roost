# LUC-5619 Next App-Completion Missing-Test Proof Lane

## Header

- ID: LUC-5619
- Title: Select next app-completion missing-test proof lane after LUC-5613
- Task Type: QA verification planning
- Current Stage: planning
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Mission ID: LUC-5619-NEXT-MISSING-TEST-PROOF-LANE
- Mission Status: VERIFIED

## Goal

Select the next non-duplicated Roost app-completion missing-test proof lane
after [LUC-5613](/LUC/issues/LUC-5613) refreshed the current evidence baseline
and [LUC-5569](/LUC/issues/LUC-5569) completed the User configuration settings
proof.

## Scope

- Source index: `docs/status/app-completion-index.json`, generated
  `2026-06-27T18:33:36.798Z`.
- Recent QA proof packets and state entries:
  - `docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`
  - `docs/planning/luc-5569-user-settings-proof-ladder.md`
  - `docs/planning/luc-5396-dashboard-overview-proof-ladder.md`
  - `docs/planning/luc-5409-exchange-connection-configuration-proof-ladder.md`
  - `docs/planning/luc-5433-finance-browser-proof-ladder.md`
  - `docs/planning/luc-5392-subscription-entitlement-finance-proof-ladder.md`
  - `docs/planning/luc-5338-read-only-department-intelligence-proof-ladder.md`
- Candidate runtime surfaces for the selected next lane:
  - `GET /v1/sales/context`
  - `/areas?area=03-sprzedaz&view=overview`
  - `src/modules/sales/sales.routes.ts`
  - `web/src/features/departments/sales-route.tsx`
  - `src/tests/api.test.ts`

## Exclusions

- No product code, schema, migration, test authoring, source-control commit,
  push, deploy, protected smoke, production mutation, provider call, credential
  access, secret handling, browser run, database container, local server, or
  watcher action in this selection heartbeat.

## Current App-Completion Snapshot

| Flow | Total | Current risks | Gates |
| --- | ---: | --- | --- |
| Subscription and entitlement | 519 | `500` missing test links; `17` implemented-needs-proof; `2` ok | subscription `519`; configuration `17`; auth `3` |
| Unclassified user workflow | 195 | `194` missing test links; `1` implemented-needs-proof | auth `5`; configuration `9` |
| Account access | 88 | `87` missing test links; `1` ok | auth `88`; configuration `10`; subscription `13` |
| User configuration | 54 | `53` missing test links; `1` implemented-needs-proof | configuration `54` |
| Dashboard overview | 6 | `6` missing test links | none |
| Trading operation | 3 | `3` missing test links | none |
| Exchange connection and configuration | 1 | `1` missing test link | configuration `1` |

## Selection Decision

Selected next lane:

`Subscription and entitlement -> Sales context and board local proof`

The follow-up proof should verify the Sales Management read packet and visible
board as one bounded app-completion confidence slice:

- API prerequisite: rerun the local API harness and confirm existing
  `GET /v1/sales/context` assertions still pass, including auth denial,
  workspace isolation, non-mutating read behavior, MCP manifest exposure,
  `sales:read`, and scoped-key denial.
- Browser proof: run a local signed-in owner-console smoke for
  `/areas?area=03-sprzedaz&view=overview` at desktop, tablet, and mobile.
- Expected user-visible markers: `03 Sales`, `Sales Management System`,
  `Current client work`, `Follow-up tasks`, blocked sales actions, and no raw
  backend error leakage.
- Cleanup: remove validation-owned database/server/browser resources and
  confirm no `chrome-headless-shell` remains.

## Why This Lane

- The current app-completion index still shows the largest remaining debt in
  `Subscription and entitlement` (`519` entities, `500` missing test links).
- Account access is not selected because [LUC-5561](/LUC/issues/LUC-5561) and
  [LUC-5570](/LUC/issues/LUC-5570) already cover recent auth/API-key proof.
- User configuration is not selected because [LUC-5569](/LUC/issues/LUC-5569)
  completed fresh API prerequisite plus desktop/tablet/mobile browser proof.
- Dashboard overview is not selected because [LUC-5396](/LUC/issues/LUC-5396)
  and [LUC-5235](/LUC/issues/LUC-5235) already cover current dashboard command
  API proof.
- Exchange connection is not selected because [LUC-5409](/LUC/issues/LUC-5409)
  already covers the local connection/configuration proof posture.
- Finance and Assets sublanes inside `Subscription and entitlement` are not
  selected first because Finance has [LUC-5392](/LUC/issues/LUC-5392) API proof
  plus [LUC-5433](/LUC/issues/LUC-5433) browser proof, while Assets has recent
  API/browser evidence in [LUC-4821](/LUC/issues/LUC-4821) and
  [LUC-5201](/LUC/issues/LUC-5201).
- Sales has implementation and broad API evidence, but it lacks a current
  post-[LUC-5613](/LUC/issues/LUC-5613) focused app-completion proof packet
  that combines local API prerequisite and current browser evidence for the
  Sales board. That makes it the smallest useful non-duplicated confidence
  improvement.

## Follow-Up Proof Contract

Recommended child issue title:

`[Roost] [QA] Prove Sales context and board app-completion lane`

Created child issue:

[LUC-5624](/LUC/issues/LUC-5624)

Recommended proof command shape:

```powershell
$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-sales-proof-postgres'
$env:COMPANYCORE_TEST_DB_PORT='55519'
$env:COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP='0'
npm run test:api:local
```

Then, if the API prerequisite passes, run a scoped owner-console browser proof
against a short-lived local server and disposable database for:

```text
/areas?area=03-sprzedaz&view=overview
```

Required gates for the follow-up:

- `npm run check:route-capabilities`
- `npm run architecture:status`
- `git diff --check`

## Acceptance Criteria

- [x] Current app-completion counts were read from the latest [LUC-5613](/LUC/issues/LUC-5613) snapshot.
- [x] Recent proof lanes were checked to avoid duplication.
- [x] One next lane was selected with exact API, browser route, files, and proof expectations.
- [x] A follow-up owner/action is named.
- [x] No runtime, protected, production, source-control, or credential action was taken in this selection heartbeat.

## Result Report

[LUC-5619](/LUC/issues/LUC-5619) is complete as a QA selection lane. The next
app-completion missing-test proof should be a focused `Subscription and
entitlement` Sales slice, proving `GET /v1/sales/context` plus
`/areas?area=03-sprzedaz&view=overview` with local API and browser evidence.
No product repair issue is warranted from selection alone. The actual proof
execution is delegated to [LUC-5624](/LUC/issues/LUC-5624).

## Deployment Impact

None. This heartbeat selected and documented the next QA lane only.

## Residual Risk

The selected Sales lane remains `implemented, not freshly verified after
LUC-5613` until the follow-up proof runs. Protected production proof remains a
separate approval/credential-gated release lane.
