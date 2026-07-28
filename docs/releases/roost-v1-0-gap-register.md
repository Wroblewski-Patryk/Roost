# Roost v1.0 Gap Register

Last updated: 2026-07-28
Related contract: `docs/releases/roost-v1-0-sale-readiness-contract.md`

This register is intentionally small. Roost's generated app-completion and
Project Truth indexes are zero-gap as of 2026-07-28, so only evidence-backed release or
commercialization follow-ups belong here.

| ID | Domain | Status | Blocking scope | Evidence | Next owner / action |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Hosted read-only canary | closed | The scoped read-only canary is proven. This does not authorize writes, broader provider permissions, or hosted Paperclip execution authority. | [LUC-1799](/LUC/issues/LUC-1799) is `done` with hosted health, owner login, bearer-token `/v1/connection`, bearer-token `/v1/mcp/manifest`, scoped `X-API-Key` handshake, and unauthenticated `401` controls; no write traffic was used. [LUC-2024](/LUC/issues/LUC-2024) reconciled this row against live Paperclip state. | Reopen only if a fresh hosted read-only regression appears. |
| SR-002 | Release automation | accepted_deferral | Does not block guided v1.0 sale; blocks any claim that push-to-running-image auto-deploy is already a proven standard path. | `docs/operations/agent-runtime-coverage-ledger.csv` row `AGRUN-COV-008` keeps manual rollover approved and auto-deploy unverified. | Keep manual rollout as the approved path until an Ops lane records push-to-running-image proof. |
| SR-003 | Upstream agent-source merge | blocked_external_non_blocking | Does not block Roost runtime sale-readiness; blocks claims that all external agent repos already carry the validated connector changes. | `docs/operations/agent-runtime-coverage-ledger.csv` row `AGRUN-COV-009` remains `BLOCKED` on missing GitHub write access. | Retry through the owning external repo path only after access exists; do not treat as a Roost runtime blocker. |

## Closed by LUC-1788

- Missing versioned v1.0 sale-readiness contract: closed by
  `docs/releases/roost-v1-0-sale-readiness-contract.md`
- Missing canonical gap register for sale-readiness follow-ups: closed by this
  file
- Template-only release/product baseline for this topic: closed by the updated
  product and release source-of-truth files linked below

## Closed after LUC-1788

- Hosted read-only canary: closed by [LUC-1799](/LUC/issues/LUC-1799) and
  reconciled into the release source of truth by
  [LUC-2024](/LUC/issues/LUC-2024).

## Discovery Links

- `docs/product/overview.md`
- `docs/product/product.md`
- `docs/product/mvp_scope.md`
- `docs/releases/release-train.md`
