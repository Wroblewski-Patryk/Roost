---
name: roost-runtime-delivery
description: Advance Roost and its Windows Local Worker through the current end-to-end delivery gates. Use for implementation, integration, verification, release, runtime debugging, or truthful delivery-status work in the Roost repository; do not use for product discovery interviews or unrelated applications.
---

# Roost Runtime Delivery

Own one end-to-end Roost outcome instead of handing off internal technical
atoms. `AGENTS.md` sets repository policy; canonical documents under `docs/`
define intent and current truth.

## Start

1. Read `docs/documentation-contract.json` and its bounded
   `defaultAgentContext`.
2. Run `npm run codex:preflight`.
3. Identify the one gate explicitly authorized by the current request and its
   owner-approved budget. If none is named, use only the earliest unmet gate in
   `docs/implementation.md`; a missing budget never means unlimited execution.
   Do not derive work from an old versioned document or start a later gate.
4. Inspect only the architecture, operations, security and engineering sources
   needed for that gate and the components actually being changed.

## Deliver

- Keep one root implementation owner through code, integration, verification
  and demonstration.
- Treat the selected gate as the complete authorized outcome. Work
  autonomously inside it, but never infer permission for the next gate from
  remaining context, time or account usage.
- Break work into internal milestones when useful, but do not report those as
  delivered outcomes.
- Resolve reversible technical choices from accepted requirements, current
  architecture, code and test evidence. Ask the owner only for a scope/budget
  stop or true owner dependency listed in `docs/implementation.md`.
- Repair defects within the approved surfaces. A newly required provider,
  material architecture change, repeated ineffective attempt or budget limit
  triggers the safe checkpoint and revised-gate rule in `AGENTS.md`; it is not
  permission to grow this gate indefinitely. Do not replace a real path with
  a mock or temporary bypass.
- Update canonical documentation when actual behavior or verified state
  changes. Never create another active plan, task board or status source.

For delegation and integration rules, read
[references/orchestration.md](references/orchestration.md).

For claim levels, evidence and completion reporting, read
[references/truth-and-evidence.md](references/truth-and-evidence.md).

For selecting checks by change type, read
[references/verification.md](references/verification.md).

For realistic forward tests of this workflow, read
[references/behavior-evals.md](references/behavior-evals.md).

## Finish

1. Inspect the complete diff and preserve unrelated work.
2. Run the smallest relevant checks first, repair failures, then run the
   applicable gate-level checks.
3. Run `npm run codex:check` and `git diff --check`.
4. Update `docs/implementation.md` only to the highest claim level actually
   demonstrated.
5. If the authorized gate is proven, leave recoverable clean state as permitted
   by the task, report the next gate and stop without beginning it.
6. Report the gate state, exact checks and evidence, changed files, remaining
   limitations, budget used (or unavailable) and any owner dependency. Do not
   provide a subjective completion percentage.
