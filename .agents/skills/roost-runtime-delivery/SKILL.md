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
3. Identify the earliest unmet gate in `docs/implementation.md` that the current
   request advances. Do not derive work from an old versioned document.
4. Inspect only the architecture, operations, security and engineering sources
   needed for that gate and the components actually being changed.

## Deliver

- Keep one root implementation owner through code, integration, verification
  and demonstration.
- Break work into internal milestones when useful, but do not report those as
  delivered outcomes.
- Resolve reversible technical choices from accepted requirements, current
  architecture, code and test evidence. Ask the owner only for a true owner
  dependency listed in `docs/implementation.md`.
- Repair discovered missing adapters, migrations, tests and integration defects
  within the same outcome. Do not replace a real path with a mock or temporary
  bypass.
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
5. Report the gate state, exact checks and evidence, changed files, remaining
   limitations and any true owner dependency. Do not provide a subjective
   completion percentage.
