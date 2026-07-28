# LUC-2145 Product Map Retention and Quarantine Repair

## Goal

Repair the two Product Map projection contract gaps found in LUC-2128 without
activating the publisher or touching protected environments.

## Delivered Behavior

- Projection snapshots, which carry the accepted packet and audit correlation,
  remain eligible for cleanup only after 365 days. Active snapshots are never
  selected for deletion.
- Receipts and admission records remain 30-day operational records; quarantined
  transport records remain 90-day records. All cleanup queries remain bounded
  by the existing batch size.
- The read model exposes `quarantined` for a retained conflicting update and
  `out_of_order` for a retained older update. Both preserve the last accepted
  packet but render as non-promoting warnings. A conflict inside an accepted
  packet remains distinct and renders as an error state.

## Verification

- `node --import tsx --test src/tests/product-map-projection.test.ts` — PASS,
  4 tests.
- `npm run test:web:product-map` — PASS, 3 tests.
- `npm run test:api:local` — PASS after the initial disposable database
  listener closed during setup; the bounded rerun applied all 33 migrations,
  seeded, and passed 8 API tests including Product Map persistence/read/cleanup.
- `npm run build:web` — PASS (via API harness).
- `git diff --check` — PASS.

## Exclusions and Residual Risk

No publisher activation, credential use, push, deploy, production mutation, or
protected smoke was performed. Candidate-specific Security/Ops review,
deployment/restore smoke, and monitoring remain release-parent gates.
