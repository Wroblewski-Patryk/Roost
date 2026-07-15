# LUC-1234 Completion Evidence

- Scope: close the exact `src/app.ts#/decisions` `missing_doc_link` row
  without changing runtime behavior.
- Documentation evidence:
  - `docs/API.md` now documents the protected `/v1/decisions` and
    compatibility `/decisions` route family including workspace scoping,
    project visibility checks, archive-on-delete behavior, and emitted
    lifecycle events.
  - `docs/architecture/relations/documentation-links.csv` now links the exact
    `src/app.ts#/decisions` mount to `docs/API.md`.
- Generated evidence:
  - Refreshed architecture-awareness materializes the exact documentation
    relation for `src/app.ts#/decisions`.
  - Refreshed app-completion no longer reports
    `api_endpoint:use-decisions:b29cd45684` as `missing_doc_link`.
  - Refreshed Project Truth advances the first routed gap to
    `src/app.ts#/departments` `missing_test_link`.
- Residual risk: no remaining Documentation Steward action is needed for
  `src/app.ts#/decisions` unless a future generated regression removes the
  linked API contract evidence.
