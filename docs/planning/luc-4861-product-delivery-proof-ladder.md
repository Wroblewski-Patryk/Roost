# LUC-4861 Product & Delivery Proof Ladder

## Header
- ID: LUC-4861
- Title: Product & Delivery proof ladder
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-4857](/LUC/issues/LUC-4857)
- Priority: P1
- Module Confidence Rows: DMS `02 Product And Delivery`, area operating graph
- Iteration: 2026-06-20 executable QA proof ladder
- Operation Mode: TESTER
- Mission ID: LUC-4861-PRODUCT-DELIVERY-PROOF-LADDER
- Mission Status: VERIFIED

## Goal
Execute the next Roost QA proof ladder selected by [LUC-4857](/LUC/issues/LUC-4857): `02 Product & Delivery -> Operating Graph Overview`.

## Scope
- Run the local API proof rung first.
- If green, run authenticated local desktop and mobile browser proof for `/areas?area=02-produkt&view=overview`.
- Verify Product & Delivery identity, operating-graph evidence, sparse-state honesty, safe synthetic backend error language, no relevant failed requests, no normal-route console issues, and no horizontal overflow.
- Capture evidence under `docs/ux/evidence/`.
- Clean up all validation-owned local processes.
- Exclusions: runtime code, schema changes, migration authoring, protected smoke, deploy, push, restart, production mutation, credential access, secret disclosure, or production data access.

## Implementation Plan
1. Confirm issue context and predecessor target packet.
2. Run `npm run test:api:local`.
3. Run `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` for browser setup.
4. Start local backend on port `3237` against disposable `companycore_test`.
5. Register a local-only owner account and verify `GET /v1/operating-graph/areas/02-produkt?limit=80`.
6. Run Playwright Chromium checks at desktop `1366x900` and mobile `390x844`.
7. Capture normal and synthetic-error screenshots plus machine-readable summary.
8. Stop the backend, remove the test database container, and check for headless browser leftovers.

## Acceptance Criteria
- `npm run test:api:local` passes.
- Authenticated local route loads on desktop and mobile.
- The route shows Product & Delivery identity, summary signals, unsupported-family evidence, and graph rows or honest sparse state.
- Synthetic backend failure shows user-safe copy without raw backend/provider details.
- Normal-route browser proof has no console issues, no relevant failed requests, and no horizontal overflow.
- Validation-owned local backend, database container, and browser processes are cleaned up.

## Validation Evidence
- `npm run test:api:local` PASS:
  - server and web build completed
  - all `31` migrations applied
  - seed completed
  - `7/7` API subtests passed
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` PASS for browser setup:
  - server and web build completed
  - all `31` migrations applied
  - seed completed
  - `7/7` API subtests passed
- Local backend:
  - port `3237`
  - validation-owned PID `45404`
  - health check returned `200`
- Browser proof:
  - evidence folder: `docs/ux/evidence/luc-4861-product-delivery-proof-ladder-2026-06-20/`
  - screenshots: `desktop.png`, `mobile.png`, `desktop-synthetic-error.png`, `mobile-synthetic-error.png`
  - summary: `summary.json`
  - API status: `200`
  - API counts: `nodes=2`, `edges=1`, `sources=1`, `gaps=1`, `unsupportedFamilies=1`, `reviewItems=0`
  - desktop and mobile normal route checks passed for route identity, area name, graph intro, summary signals, review queue, unsupported-family evidence, graph table evidence, sparse-state honesty, no raw error leak, no horizontal overflow, no normal-route console issues, and no failed requests.
  - desktop and mobile synthetic-error checks passed for route identity, safe user copy (`Something went wrong. Try again.`), no raw synthetic backend string leak, and no horizontal overflow. Synthetic 500 resource console entries were expected from the intercepted failure and are recorded separately from the normal-route console gate.
- Cleanup:
  - local backend PID `45404` stopped
  - `companycore-test-postgres` removed
  - no `chrome-headless-shell` process rows remained

## Result Report
- Task summary: verified the local `02 Product & Delivery -> Operating Graph Overview` proof ladder selected by [LUC-4857](/LUC/issues/LUC-4857).
- Files changed: this planning packet, evidence artifacts under `docs/ux/evidence/luc-4861-product-delivery-proof-ladder-2026-06-20/`, and source-of-truth state files.
- How tested: `npm run test:api:local`, kept-db rerun, local health check, authenticated Playwright desktop/mobile proof, synthetic-error proof, cleanup checks.
- What is incomplete: protected production proof remains release/credential gated and was not part of this local QA lane.
- Next steps: [LUC-4863](/LUC/issues/LUC-4863) owns source-control closure for this local proof packet and the adjacent shared evidence state; continue the next QA proof target only after source-of-truth state is integrated.
