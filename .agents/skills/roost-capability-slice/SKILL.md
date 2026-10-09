---
name: roost-capability-slice
description: Implement one authorized Roost company capability across its applicable data, authority, API/MCP, console, and agent surfaces; use for cross-surface product work, not standalone application features.
---

# Roost capability slice

Use this with `roost-runtime-delivery` when the authorized gate changes a company capability rather than one isolated component. The gate in `docs/implementation.md` remains the delivery boundary. This skill helps make the capability usable by people and supervised agents through the same authoritative records.

## Map the change

Read `AGENTS.md`, `docs/documentation-contract.json`, its bounded `defaultAgentContext`, and only the component contracts needed for the capability. Identify the accepted requirement IDs, existing implementation, canonical record identity, stewarding area, accountable actor, related company/application/customer context, and any external provider's field authority. Mark business decisions and unverified behavior separately from implementation gaps.

For each applicable surface, record the contract and its negative boundary before editing:

- Data and configuration: workspace isolation, stable identity, relationships, history, migration and existing-record preservation.
- Authority: actor-neutral role and mandate, visible context, approval, refusal, audit, and safe retry of uncertain effects.
- Human path: navigation, record view, editing and configuration where required, with truthful empty, loading, error, permission and success states.
- Agent path: scoped API/MCP and Worker context, with the same authorization and canonical state as the console; no direct database bypass.
- External effects: declared source of truth, idempotency, reconciliation, observability and recovery where an integration is involved.

Implement the smallest coherent vertical slice that lets the required actor finish the gate's real task. Do not create a parallel record store or hard-code reference-installation details. A configured application may provide the test workload; its own feature completion or readiness is not a substitute for proving the Roost capability.

## Prove the slice

Run focused checks before broad checks. Exercise the authorized positive journey and at least the material refusal, cross-workspace/context, failure and recovery paths for the changed surfaces. Use a real configured flow when the gate requires it, and distinguish local, native, deployed and production evidence. Update the owning product, architecture, operations and traceability documents only where behavior or evidence changed; keep `docs/implementation.md` truthful. Finish with the checks required by `roost-runtime-delivery`, including `npm run codex:check`. Report what a human and an agent can actually do, plus remaining gaps and the gate boundary.
