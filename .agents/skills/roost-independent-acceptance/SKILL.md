---
name: roost-independent-acceptance
description: Independently verify a delivered Roost capability or gate against its accepted outcome and real human/agent evidence; use for review, not implementation or self-approval.
---

# Independent Roost acceptance

Use this when a separately accountable reviewer is asked to accept a Roost capability or delivery gate. Follow `AGENTS.md` and the evidence rules in `roost-runtime-delivery`; the review does not extend the implementer's mandate or authorize the next gate.

## Establish the claim

Read `docs/documentation-contract.json`, its bounded `defaultAgentContext`, the exact gate in `docs/implementation.md`, and its relevant requirement IDs. Obtain the claimed commit, installed identity, configuration, review and test evidence. Check whether the claimed result is source-only, native, deployed or observed in the real installation. Treat prior approvals as historical when their commit, scope, risk or expiry basis changed.

## Verify independently

Reconstruct the shortest complete path from a person's request or an agent task through Roost's authority, canonical records, API/MCP or console, supervised execution where applicable, and visible result. Sample the original evidence, repeat decisive read-only observations, and run only authorized bounded writes or model calls. Check the changed capability's material refusal cases: wrong role, workspace or application context, stale/unverified source, uncertain external effect, and data or recovery risk. Include UX, accessibility and configuration evidence when they are part of this gate; use `roost-interface-design` when available for detailed visual review.

An application used as a workload proves only the specified Roost behavior. Do not infer the application's product readiness or Roost's overall completion from one example. Do not edit the implementer's source, grant a release, weaken criteria, or silently convert an unverified claim into a pass.

Use the exact verdict vocabulary of the active review contract; do not invent a protocol status. In the plain-language report, state accepted, changes required, or blocked with exact evidence, failed observable, affected requirement, severity, and the smallest reproducible correction or genuine owner dependency. Reserve blocked for an actual external or owner dependency; missing proof or repairable failures require changes. Identify every required observation that was not run. For a completed gate, verify the required checks and durable evidence record before reporting acceptance; otherwise keep the gate open.
