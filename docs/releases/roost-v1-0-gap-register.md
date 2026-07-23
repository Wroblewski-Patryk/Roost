# Roost v1.0 Gap Register

Last updated: 2026-07-23
Related contract: `docs/releases/roost-v1-0-sale-readiness-contract.md`

This register is intentionally small. Roost's generated app-completion index is
already zero-gap as of 2026-07-21, so only evidence-backed release or
commercialization follow-ups belong here.

| ID | Domain | Status | Blocking scope | Evidence | Next owner / action |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Hosted read-only canary | open | Blocks any claim that local Paperclip to hosted Roost read-only canary has already been proven. Does not block the guided local/manual v1.0 sale boundary. | `LUC-1788` issue description explicitly keeps the later local-Paperclip-to-hosted-Roost canary read-only and separately gated. Current canonical ops evidence in `docs/operations/post-deploy-smoke.md` proves manual rollout and protected smoke, not this canary. | [LUC-1799](/LUC/issues/LUC-1799) owns the Ops/QA follow-up to execute and document the read-only canary against hosted Roost with scoped key, health checks, MCP/API handshake, and cleanup evidence. |
| SR-002 | Release automation | accepted_deferral | Does not block guided v1.0 sale; blocks any claim that push-to-running-image auto-deploy is already a proven standard path. | `docs/operations/agent-runtime-coverage-ledger.csv` row `AGRUN-COV-008` keeps manual rollover approved and auto-deploy unverified. | Keep manual rollout as the approved path until an Ops lane records push-to-running-image proof. |
| SR-003 | Upstream agent-source merge | blocked_external_non_blocking | Does not block Roost runtime sale-readiness; blocks claims that all external agent repos already carry the validated connector changes. | `docs/operations/agent-runtime-coverage-ledger.csv` row `AGRUN-COV-009` remains `BLOCKED` on missing GitHub write access. | Retry through the owning external repo path only after access exists; do not treat as a Roost runtime blocker. |

## Closed by LUC-1788

- Missing versioned v1.0 sale-readiness contract: closed by
  `docs/releases/roost-v1-0-sale-readiness-contract.md`
- Missing canonical gap register for sale-readiness follow-ups: closed by this
  file
- Template-only release/product baseline for this topic: closed by the updated
  product and release source-of-truth files linked below

## Discovery Links

- `docs/product/overview.md`
- `docs/product/product.md`
- `docs/product/mvp_scope.md`
- `docs/releases/release-train.md`
