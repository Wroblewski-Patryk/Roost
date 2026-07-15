# LUC-1270 Completion Evidence

- Scope: close the exact `src/app.ts#/goals` `missing_doc_link` row without
  changing runtime behavior.
- Documentation evidence:
  - `docs/API.md` now documents the protected `/v1/goals` and compatibility
    `/goals` route family including workspace-scoped newest-first reads,
    related `process` hydration, workspace-visible `projectId` and
    `processId` validation, archive-on-delete semantics, and emitted goal
    lifecycle events.
  - `docs/architecture/relations/documentation-links.csv` now links the exact
    `src/app.ts#/goals` mount to `docs/API.md`.
- Generated evidence:
  - Refreshed architecture-awareness materializes the exact documentation
    relation for `src/app.ts#/goals` at `2026-07-15T18:37:30.289Z` with
    `3063` entities, `7933` relations, and `16523` files.
  - Refreshed app-completion generated `2026-07-15T18:37:30.470Z`, keeps
    `missingDocLink=1`, and no longer reports
    `api_endpoint:use-goals:da30547c55` as `missing_doc_link`.
  - Refreshed Project Truth generated `2026-07-15T18:38:08.524Z` with public
    probes `pass` and advances the first routed gap to
    `src/app.ts#/health` `missing_test_link`.
- Residual risk: no remaining Documentation Steward action is needed for
  `src/app.ts#/goals` unless a future generated regression removes the linked
  API contract evidence. The remaining docs-owned gap is
  `src/app.ts#/connection`.
