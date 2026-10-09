---
name: roost-model-qualification
description: Qualify a model/backend for an authorized managed Hermes task class using comparable quality, resource and recovery evidence; use only for model admission or routing work.
---

# Roost model qualification

Use this only when an owner-authorized Roost gate evaluates managed model execution or task-model policy. It does not admit a model or start local execution by itself. Follow `AGENTS.md`, `roost-runtime-delivery`, the applicable `RF-HOST` requirements and the current Hermes/backend admission contract.

## Design the comparison

Select a real bounded Roost task class, its accepted outcome and risk, a representative case set with material failure cases, and the exact approved backend/model/effort combinations. Record host resources, privacy boundary, context and tool permissions, budget, review criteria and stop conditions before launch. Use the same task and acceptance criteria for each candidate; keep application-specific assumptions scoped to that application.

## Run and judge

For a managed proof, use the normal Roost -> Worker -> Hermes path. Read back the backend and model actually used; refuse an absent, changed or resource-ineligible local model without silent remote fallback. Preserve the same task authority, sealed context, one-writer rule, checkpoints, independent review and release controls regardless of provider. A manual model smoke or isolated prompt answer is supporting evidence only.

Compare independently accepted outcomes, failures and rework, elapsed time, resource use and observed total cost. Mark unexposed token or provider usage as unknown. Do not claim savings from model price alone. Assess interruption, recovery, context limits, tool behavior and escalation when the model cannot safely finish.

Return a task-class policy recommendation: supported model choices, required minima, refusal or escalation conditions, measured trade-offs, evidence identities and remaining unknowns. Change routing or agent authority only if the currently authorized gate includes that outcome and its acceptance proof; otherwise report the next gate without starting it.
