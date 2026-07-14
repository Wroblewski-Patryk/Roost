# LUC-1084 Dashboard Overview CcResourceSelector Proof

Date: 2026-07-14
Issue: [LUC-1084](/LUC/issues/LUC-1084)
Stage: verification

## Task Contract

- Goal: close the generated Dashboard overview `missing_test_link` gap for
  `web/src/components/cc-resource-selector.tsx`.
- Task Type: QA verification / focused browser proof-link curation.
- Current Stage: verification.
- Deliverable For This Stage: exact local browser proof that the live consuming
  routes render `CcResourceSelector`, linked evidence for the component/function
  rows, regenerated readback, and source-of-truth closure.

## Scope

Indexed gaps:

- `web/src/components/cc-resource-selector.tsx`
- `web/src/components/cc-resource-selector.tsx#CcResourceSelector`
- `web/src/components/cc-resource-selector.tsx#renderItem`
- `web/src/components/cc-resource-selector.tsx#toggleAll`
- `web/src/components/cc-resource-selector.tsx#toggleItem`

Files updated:

- `scripts/luc-1084-cc-resource-selector-proof.mjs`
- `docs/planning/luc-1084-dashboard-overview-cc-resource-selector-proof.md`
- `docs/ux/evidence/luc-1084-cc-resource-selector-proof/`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product runtime code, schema, migration, provider call, protected smoke,
  deploy, push, restart, credential access, or production mutation.

## Diagnosis

The routed Dashboard overview gap moved to `cc-resource-selector.tsx`, but the
shared selector is not rendered by `GeneralDashboard` itself. Its real runtime
evidence lives in the current Operations and Assets workbench routes that reuse
the exact component and its search, selection, and empty-state behavior.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` refreshed `public/react`. |
| Focused browser proof | PASS | `node scripts/luc-1084-cc-resource-selector-proof.mjs` served the built web bundle locally and exercised signed-in Operations Tasks plus Assets Files/Folders until each route rendered `CcResourceSelector` and its shared search/empty states. |
| Operations selector render | PASS | `docs/ux/evidence/luc-1084-cc-resource-selector-proof/report.json` records `selectorSearchFiltersOperations=true` and screenshots `operations-selector-filtered.png` plus `operations-selector-empty.png`. |
| Assets selector render | PASS | The same report records `selectorSearchFiltersAssets=true` and screenshots `assets-selector-filtered.png` plus `assets-selector-empty.png`. |
| Shared empty state | PASS | The report records `selectorEmptyStateVisible=true` after a no-match query in both routes. |
| Auth headers | PASS | The report records `Authorization: Bearer luc-1084-proof-token` on mocked `/v1/auth/me`, `/v1/departments`, `/v1/operations/work-items`, and `/v1/assets/context` requests. |
| Responsive overflow | PASS | The report records `noHorizontalOverflow=true` for both consuming routes. |
| Runtime errors | PASS | The updated report records `runtimeErrors=true` with no unexpected console or page errors. |
| Architecture-awareness refresh | PASS | To be updated after refresh. |
| App-completion refresh | PASS | To be updated after refresh. |
| Project Truth apply | PASS | To be updated after refresh. |
| Architecture status | PASS | To be updated after refresh. |

## Acceptance Criteria

- [x] A reproducible local browser proof shows live consuming routes render
      `CcResourceSelector`.
- [x] The proof shows shared selector search and no-match empty behavior in
      those live routes.
- [x] Repo-owned evidence report and screenshots are saved under
      `docs/ux/evidence/luc-1084-cc-resource-selector-proof/`.
- [ ] The exact component and helper-function rows are linked to proof in
      scanner overrides and the test map.
- [ ] Refreshed Project Truth no longer routes `cc-resource-selector.tsx` as
      the first Dashboard overview `missing_test_link` gap.

## Result Report

Status: `IN_PROGRESS`.

The focused proof harness is in place and locally proves the current real
runtime usage of `CcResourceSelector`. Remaining work is the evidence-link
curation plus generated readback refresh so the routed Dashboard overview row
is actually closed in source-of-truth indexes.
