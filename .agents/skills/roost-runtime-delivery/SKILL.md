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
3. Identify the one gate authorized by the current request or by a coordinator
   brief within an explicit continuing owner mandate, the active-gate statement
   in `docs/implementation.md`, and any actual limits. An unnamed request to
   deliver work can select only the earliest unmet gate as
   a **candidate**; it cannot activate a candidate or override `STOP` / `none`.
   After `STOP`, require a fresh owner instruction authorizing the bounded
   outcome and effects before implementation. A status, planning or readiness
   request never starts a gate. Do not invent a time/token/attempt cap for
   reversible implementation coding without new external charges; enforce
   actual limits, `RF-HOST-010` for managed Roost tasks, and approved
   cost/effect limits for paid or irreversible work. Do not derive work from an
   old versioned document.
4. Read the exact clauses for the gate's requirement IDs in
   `docs/product/requirements.md`, including applicable cross-cutting
   authority, security, data and review constraints. Inspect only the
   architecture, operations and engineering sources needed for the gate and
   components actually being changed.

## Deliver

- Keep one root implementation owner through code, integration, verification
  and demonstration.
- Treat the selected gate as the complete authorized outcome. Work
  autonomously inside it. A one-off assignment stops at its boundary. A
  continuing mandate permits the coordinator to select and brief one next
  bounded gate only after the prior gate is verified and the next outcome and
  effects fit that mandate; remaining context, time or usage grants nothing.
- Break work into internal milestones when useful, but do not report those as
  delivered outcomes.
- Resolve reversible technical choices from accepted requirements, current
  architecture, code and test evidence. Route routine execution questions to
  the coordinator; bring the owner only a scope/limit stop or true owner
  dependency listed in `docs/implementation.md` or `AGENTS.md`.
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
   by the task and report the next candidate. Stop under a one-off assignment;
   under an explicit continuing mandate, the coordinator may brief one next
   bounded gate after reconciling its prerequisites, effects and limits.
6. Report the gate state, exact checks and evidence, changed files, remaining
   limitations, budget used (or unavailable) and any owner dependency. Do not
   provide a subjective completion percentage.
