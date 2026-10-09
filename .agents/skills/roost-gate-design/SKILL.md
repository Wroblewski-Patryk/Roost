---
name: roost-gate-design
description: Define one bounded future Roost delivery gate from accepted requirements and verified state when asked to open or refine a phase; do not execute the gate.
---

# Roost gate design

Use this skill to turn a product horizon or a demonstrated gap into one reviewable Roost delivery outcome. It prepares an assignment; it does not authorize implementation, release, or the following gate.

## Grounding

Follow `AGENTS.md`. Read `docs/documentation-contract.json` and its bounded `defaultAgentContext`, then the requirements, open decisions, architecture, operations, and evidence relevant to the proposed outcome. `docs/product/requirements.md` defines accepted behavior; `docs/implementation.md` defines the active gate and verified state. Label unmerged proposals and historical evidence as such.

Roost and its supervised agent runtime are the product being built. A configured application can test a Roost capability, but its own product readiness is a separate claim. Do not copy one application's assumptions into another installation or turn a proof workload into Roost's product goal.

## Shape the gate

1. Establish the highest verified state and the exact gap. Inspect the target's real deployment/runtime topology and existing adapter before sizing the gate. Reuse working mechanisms; separate an accepted requirement from an open business decision, implementation hypothesis, or expired proof.
2. State one observable Roost outcome for an identified human or agent role. Trace it to requirement IDs and the relevant owner decision. List prerequisites and the narrowest end-to-end path that can prove it.
3. Identify the canonical records, authority, API/MCP, console, Worker/Hermes, integrations, configuration, and recovery surfaces the outcome actually touches. Leave unrelated surfaces out.
4. Specify positive and negative observations, real installation or native evidence, independent review, data preservation, and the owner's decision boundary. Source checks alone never satisfy a runtime outcome.
5. Name one implementation owner, non-overlapping optional delegations, permitted effects, owner-approved time/token/cost/attempt limits, and the stop boundary. A missing provider or substantial enabling capability becomes a separate proposed outcome, not an open-ended clause inside a small delivery gate. Distinguish preparation from authorization to execute the gate.

Return a concise gate brief containing the outcome, requirement IDs, entry evidence, owned surfaces, observable acceptance, release or data authority, budget, and exit condition. State which evidence can be reused, which real observed failure is being fixed, and what discovery would force a safe stop and new owner decision. Do not add speculative failure cases. Record unresolved owner choices in the existing `docs/planning/open-decisions.md` and accepted intent in its owning product chapter; do not invent a parallel plan or task board. Edit `docs/implementation.md` only when the assignment authorizes a planning change. For repository edits, run `npm run codex:check` and inspect the scoped diff.
