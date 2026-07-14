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

## Implementation Plan

- Prove `CcResourceSelector` only through the live consuming routes that render
  it.
- Link the focused browser proof to the exact component/function rows in the
  scanner overrides and test map.
- Refresh architecture-awareness, app-completion, and Project Truth
  sequentially so generated readback consumes the updated graph.

## Acceptance Criteria

- `scripts/luc-1084-cc-resource-selector-proof.mjs` proves selector rendering,
  filtering, and empty states in Operations Tasks and Assets Files/Folders.
- `web/src/components/cc-resource-selector.tsx` and its exact function rows no
  longer appear as the first Dashboard overview `missing_test_link` gap.
- Generated readback advances the first routed gap beyond the
  `cc-resource-selector` family.

## Definition Of Done

- Focused proof passes locally.
- Graph/test-link classification is durable in generated outputs.
- Relevant source-of-truth state files are updated.

## Result Report

- Status: complete
- Proof:
  `node scripts/luc-1084-cc-resource-selector-proof.mjs` PASS and generated
  `docs/ux/evidence/luc-1084-cc-resource-selector-proof/report.json`
  (`generatedAt=2026-07-14T11:11:15.195Z`) plus four route screenshots.
- Linkage:
  `docs/architecture/scanner-overrides.json` now classifies the focused proof
  harness/helper entries as `test` and adds explicit `tests` relations from
  `scripts/luc-1084-cc-resource-selector-proof.mjs` to
  `web/src/components/cc-resource-selector.tsx`,
  `#CcResourceSelector`, `#renderItem`, `#toggleAll`, and `#toggleItem`.
- Verification:
  `npm run build:web` PASS;
  `npm run architecture:refresh` PASS;
  sequential external architecture-awareness refresh PASS
  (`generatedAt=2026-07-14T11:15:11.557Z`, `2991` entities / `7401`
  relations / `16511` files);
  sequential app-completion refresh PASS and dropped `missingTestLink` from
  `1134` to `1118`;
  Project Truth apply PASS (`generatedAt=2026-07-14T11:15:19.491Z`) and moved
  the first routed gap to `web/src/components/cc-route-loading.tsx`;
  `npm run architecture:status` PASS (`GREEN`, `454/765/35`).
- Scope result:
  the original Dashboard overview `cc-resource-selector.tsx`
  `missing_test_link` family is cleared from the routed first-gap position with
  no runtime product-code change.
