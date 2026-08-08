# Product Map

Last updated: 2026-08-08

## Purpose

Use this map for product intent, scope, user value, roadmap boundaries, and
idea intake.

## Sources

| Need | Start With |
| --- | --- |
| Product overview | `docs/product/overview.md` |
| Product rules and value | `docs/product/product.md` |
| Current MVP scope | `docs/product/mvp_scope.md` |
| New idea intake | `docs/planning/idea-to-function-chain-playbook.md` |
| Open product decisions | `docs/planning/open-decisions.md` |
| Next execution queue | `docs/planning/mvp-next-commits.md` |

## Rule

Ideas become executable work only after they are connected to:

- user value or operator value;
- affected modules and layers;
- an end-to-end function chain;
- current implementation/proof status;
- next smallest verification or implementation task.

## Protected Product Map projection read

`GET /v1/product-map/projection` returns a read-only `data.freshness` object
alongside the projection. It contains only owner-facing timing metadata:

- `checkedAt`: the instant this read evaluated freshness;
- `observedAt`: the source snapshot observation time, or `null` when no usable
  snapshot exists;
- `ageMs` and `lagMs`: the non-negative elapsed time from `observedAt` to
  `checkedAt` (both names are provided for clarity to consumers);
- `ttlMs`: the 15-minute current-data threshold;
- `lastKnownGoodWindowMs`: the 24-hour maximum window for serving the last
  known good snapshot;
- `status`: `current`, `stale`, or `unavailable`.

The metadata does not expose database, audit, or provider internals. Existing
`status`, `packet`, `procedure`, and error responses remain compatible.

An ingress packet older than the active snapshot is rejected and retained in
quarantine for audit. Because it never becomes active state, that expected
out-of-order replay does not change a healthy last-known-good projection to
`conflict`. A same-snapshot/different-digest quarantine remains a real
`projection_conflict` and continues to fail the protected read closed.

Source/deployed SHA mismatch is offering-scoped. The affected item remains
`NO-GO` with `versionAlignment=different`, but it does not change unrelated,
aligned offerings or the shared lifecycle projection to `conflict`.
