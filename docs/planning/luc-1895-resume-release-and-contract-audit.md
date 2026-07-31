# LUC-1895 Resume Release And Contract Audit

Last updated: 2026-07-31

## Decision

`NO-GO`. The authenticated Product Map implementation is real and locally
verified, but it does not yet publish
`PROC-SH-APPLICATION-LIFECYCLE` version `1.0`. Production promotion is also
blocked by unresolved protected release gates.

## Evidence Matrix

| ID | Requirement | Evidence | Status | Next action |
| --- | --- | --- | --- | --- |
| L1895-A01 | Authenticated owner surface exists | Private Product Map route and workspace-scoped `GET /v1/product-map/projection` | verified for Product Map | Reuse only after the procedure mapping is selected |
| L1895-A02 | Stable procedure ID/version is returned | Exact procedure ID occurs only in docs/task/state; Product Map API/UI/types/tests have no procedure identity | failed | Architecture selects the existing-system mapping, then implementation adds typed proof |
| L1895-A03 | Source, freshness, conflict, evidence, gate, supersession, links | Product Map carries partial offering/release readiness facts, but lacks procedure owner, verified time, decisions/KPIs/evidence links, audit readback, and supersession | failed | Complete the typed procedure read model |
| L1895-A04 | Unauthorized/cross-workspace denial | Private route, authenticated API mount, dedicated capabilities, and API tests | locally verified | Repeat against the exact procedure contract and production candidate |
| L1895-A05 | No secret/private data | Ingress authenticates and binds workspace, but accepts arbitrary object fields through `z.record(z.unknown())` | failed | Replace with a strict allowlisted schema and negative disclosure tests |
| L1895-A06 | Fail-closed owner states | Current/stale/empty/unavailable plus quarantine retention exist; backend emits `conflict` while the frontend union has no `conflict` member | partially verified | Align the response/UI state contract and test every state |
| L1895-A07 | Responsive owner proof | No durable desktop/tablet/mobile evidence for this candidate | blocked | Capture authenticated proof after the contract repair |
| L1895-A08 | Deployment and monitoring | Public runtime is healthy at old commit; image is unknown; protected release chain is blocked | blocked | Complete the governed [LUC-1910](/LUC/issues/LUC-1910) gate |

## Candidate And Release Facts

- Candidate: `e6fa42a871af92f9206972e0202e6297cd9a4337`.
- Branch: clean local `main`, `98` commits ahead of `origin/main`.
- Batch: `448` files, `134940` insertions, `50692` deletions.
- Public runtime: web `200`, API `200`, health `status=ok`.
- Deployed source: `070b150f5477d701d462485aad8b91450d0c3d71`.
- Deployed image: `unknown`.
- Migration delta:
  `20260728110000_product_map_projection` and
  `20260728120000_product_map_ingress_controls`.
- Migration shape: additive tables, indexes, foreign keys, and a nullable
  unique workspace company binding; production backup/restore and capacity
  evidence are not current.
- Rollback: the deployed commit is a source reference only until the running
  image/container is identified and proven relaunchable.

## Architecture Options Requiring Selection

1. Extend the exact Product Map packet with a typed procedure projection and
   keep the browser on the existing read route.
2. Map the canonical record through the existing Company OS
   `Procedure`/`ProcedureStep` plus versioned workflow-definition foundation,
   then project it read-only into Product Map.
3. Add a dedicated authenticated lifecycle procedure read model backed by the
   existing Company OS foundation, with Product Map linking to it.

All options must keep Paperclip execution state external and read-only. A new
workflow engine, arbitrary JSON packet, or direct Paperclip database read is
not acceptable.

## Blocker Graph

The parent issue must not close or deploy as lifecycle-procedure proof until:

1. the architecture/implementation child selects and delivers the exact
   procedure contract; and
2. [LUC-1910](/LUC/issues/LUC-1910) completes its existing protected chain,
   including the Sentinel credential incident, managed QA candidate,
   authenticated owner QA, rollback, deployment, and monitoring.

No credentials were used and no push, deploy, restart, database write,
protected browser action, or production mutation occurred in this audit.
