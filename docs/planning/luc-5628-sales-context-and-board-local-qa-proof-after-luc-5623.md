# LUC-5628 Sales Context And Board Local QA Proof After LUC-5623

## Task Type

QA verification / post-baseline app-completion proof closure.

## Current Stage

Verification.

## Deliverable For This Stage

Evidence-backed disposition for the [LUC-5628](/LUC/issues/LUC-5628) child
proof lane created by [LUC-5623](/LUC/issues/LUC-5623).

## Goal

Close the Sales context and board local QA proof requested after
[LUC-5623](/LUC/issues/LUC-5623), covering the selected `Subscription and
entitlement -> Sales context and board local proof` lane.

## Scope

- API prerequisite:
  - `GET /v1/sales/context`
  - Sales auth/capability behavior including `sales:read`
- Browser route:
  - `/areas?area=03-sprzedaz&view=overview`
- Existing proof packet reused for this child lane:
  - `docs/planning/luc-5624-sales-context-and-board-proof.md`
  - `docs/ux/evidence/luc-5624-sales-board-proof/report.json`
  - desktop/tablet/mobile screenshots under
    `docs/ux/evidence/luc-5624-sales-board-proof/`
- Fresh closure checks for [LUC-5628](/LUC/issues/LUC-5628):
  - report assertion validator
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Exclusions

- No product code, schema, migration, route implementation, test authoring,
  provider call, credential access, secret handling, push, deploy, protected
  production smoke, production mutation, or long-running watcher.
- No rerun of the already-passed local database/browser proof unless the
  existing report failed validation. It did not fail validation.

## Implementation Plan

1. Read [LUC-5628](/LUC/issues/LUC-5628) heartbeat context and parent
   [LUC-5623](/LUC/issues/LUC-5623) scope.
2. Confirm the existing Sales proof packet covers the requested API and browser
   surfaces.
3. Validate the generated browser report for required text, screenshots,
   assertions, and console issues.
4. Rerun lightweight route and architecture status gates.
5. Record the child-lane closure packet and update source-of-truth state.
6. Close [LUC-5628](/LUC/issues/LUC-5628) with evidence and deploy impact.

## Acceptance Criteria

- Existing API prerequisite evidence is linked and covers `GET
  /v1/sales/context`.
- Browser proof evidence is linked and covers signed-in
  `/areas?area=03-sprzedaz&view=overview` at desktop, tablet, and mobile.
- Required Sales markers are present in the report:
  - `03 Sales`
  - `Sales Management System`
  - `Current client work`
  - `Follow-up tasks`
  - `Blocked write actions`
  - `quote_final_terms`
- Browser report has `consoleIssues=[]`.
- Lightweight closure gates pass:
  - report assertion validator
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Definition Of Done

- Evidence packet exists and links to exact artifacts.
- Commands and results are recorded.
- Source-of-truth state files are updated.
- Deployment impact and residual risk are explicit.
- Paperclip issue disposition is updated to `done`.

## Result Report

### Reused API And Browser Proof

The full local API/database/browser proof is recorded in
`docs/planning/luc-5624-sales-context-and-board-proof.md`.

Key evidence from that packet:

- API prerequisite:
  `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5624-postgres`
  `COMPANYCORE_TEST_DB_PORT=55524`
  `COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` PASS
  after server/web build, all `31` migrations, seed, and `7/7` Node API
  subtests.
- Browser proof:
  `npm run owner-console:ux-smoke` PASS against
  `http://127.0.0.1:31524` for
  `/areas?area=03-sprzedaz&view=overview`.
- Report:
  `docs/ux/evidence/luc-5624-sales-board-proof/report.json`, generated
  `2026-06-27T19:05:48.598Z`.
- Viewports: desktop `1440x960`, tablet `834x1112`, mobile `390x844`.
- Screenshots: `3`.
- Assertions: `21`.
- Console issues: `0`.
- Cleanup in the proof packet confirmed no validation-owned server/database
  resources, no `chrome-headless-shell`, and no listeners on ports `31524` or
  `55534`.

### Fresh Closure Checks

Report assertion validator: PASS.

Summary:

```json
{
  "generatedAt": "2026-06-27T19:05:48.598Z",
  "baseUrl": "http://127.0.0.1:31524",
  "screenshots": 3,
  "assertions": 21,
  "consoleIssues": 0,
  "misses": []
}
```

Route capability gate:

```powershell
npm run check:route-capabilities
```

Result: PASS, `180` manifest routes and `35` route files checked.

Architecture status gate:

```powershell
npm run architecture:status
```

Result: PASS, `GREEN`, graph `454` nodes / `765` relations / `35` chains,
evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass.

## Final Disposition

Verified done locally. [LUC-5628](/LUC/issues/LUC-5628) is the post-
[LUC-5623](/LUC/issues/LUC-5623) child lane for Sales local QA proof. The
requested API prerequisite and desktop/tablet/mobile browser proof are covered
by the existing local Sales evidence packet, and the fresh closure checks passed.
No product repair issue is warranted.

## Deployment Impact

None. This was local QA evidence and issue disposition only. No code, schema,
push, deploy, restart, protected smoke, production mutation, provider action,
credential access, or secret disclosure occurred.

## Residual Risk

Protected production proof remains a separate approval/credential-gated release
lane. The local proof validates seeded local behavior and current browser
rendering, not production data density.
