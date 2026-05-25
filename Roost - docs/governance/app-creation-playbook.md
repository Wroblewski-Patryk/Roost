# App Creation Playbook

## Purpose

Use this playbook when an agent is creating a new app, turning a loose product
idea into an implementation plan, or starting a large new product surface. It
connects product intent, architecture, delivery stages, tasks, validation, and
agent state before broad coding begins.

This playbook does not replace `AGENTS.md`, `.agents/core/execution-loop.md`,
or `.codex/templates/task-template.md`. It defines the path from idea to the
first safe implementation slice.

## When To Use

Use this playbook when:

- a project is being initialized from this template
- the user asks to create an app, dashboard, tool, website, game, or product
- a new module or major surface does not yet have clear architecture
- the next task is unclear because product, architecture, and planning docs are
  out of sync
- an agent needs to decide what to build first without inventing architecture

Do not use this playbook to justify expanding scope inside an already approved
task. For active implementation work, stay inside the task contract.

## Required Inputs

Before implementation, collect or infer the smallest safe answers to:

- Product: who is the app for, what job must it do, and what first version
  matters?
- Users and roles: who uses it, who administers it, and who is affected by
  mistakes?
- Core workflows: what are the 1 to 3 flows that define the MVP?
- Data: what entities, state, files, permissions, and external systems exist?
- Runtime: backend, frontend, mobile, jobs, integrations, hosting, and health
  expectations.
- Risk: auth, payments, AI, user data, production, privacy, destructive
  actions, or operational dependencies.
- UX direction: visual tone, primary screens, responsive needs, accessibility,
  and design source.
- Validation: commands and manual checks that can prove the first slice.

If a missing answer materially changes architecture or risk, ask the user. If
it does not, make a conservative assumption and record it in the blueprint.

## Idea To Architecture Flow

1. Copy or adapt `.codex/templates/app-blueprint-template.md` into a working
   blueprint artifact in planning docs or task notes.
2. Fill product truth in:
   - `docs/product/overview.md`
   - `docs/product/product.md`
   - `docs/product/mvp_scope.md`
3. Fill architecture truth in:
   - `docs/architecture/system-architecture.md`
   - `docs/architecture/tech-stack.md`
   - `docs/architecture/architecture-source-of-truth.md`
4. Fill operational truth in:
   - `.codex/context/PROJECT_STATE.md`
   - `docs/engineering/local-development.md`
   - `docs/engineering/testing.md`
   - `docs/operations/*` when deployable
5. Fill UX truth when the app has screens:
   - `docs/ux/visual-direction-brief.md`
   - `docs/ux/design-system-contract.md`
   - `docs/ux/design-memory.md`
6. Convert the first version into an execution queue:
   - `.codex/context/TASK_BOARD.md`
   - `docs/planning/mvp-execution-plan.md`
   - `docs/planning/mvp-next-commits.md`
   - `.agents/state/next-steps.md`

## Architecture Minimum Before Coding

Before code changes start, the agent must know:

- Runtime surfaces: backend, web, mobile, workers, cron, CLI, or static-only.
- Source of truth: where each important state value lives.
- Data model: first entities and ownership rules.
- API or module boundary: how surfaces communicate.
- Auth and permission posture: public, private, role-based, tenant-based, or
  external-provider-owned.
- Error and recovery posture: what fails closed and how users recover.
- Deployment shape: local dev, preview, production target, health signal, and
  rollback or disable path.
- Validation shape: focused tests, build checks, smoke checks, and manual UI
  proof.

If these are unknown, the first task is architecture/planning, not coding.

## Stage Gates

Every app-creation wave should pass these gates in order.

| Stage | Required output |
| --- | --- |
| Intake | Product summary, users, core workflows, constraints, unknowns. |
| Discovery | App blueprint with assumptions, risks, and non-goals. |
| Architecture | Runtime surfaces, data ownership, module/API boundaries, deployment shape. |
| Planning | First vertical slice, task board row, NOW queue entry, validation plan. |
| Implementation | One scoped vertical slice only. |
| Verification | Automated checks, manual proof, UI/responsive proof when relevant. |
| Handoff | State files, planning docs, project state, next step, residual risks. |

Do not skip from intake to broad implementation. A tiny prototype is allowed
only when the task labels it as a prototype and no production behavior depends
on it.

## First Slice Selection

Pick the first slice using this order:

1. App shell and local run path if the project cannot run yet.
2. Data model and source-of-truth foundation if runtime state is central.
3. Auth or permissions foundation if user data, admin actions, or private
   workflows exist.
4. One end-to-end workflow that proves the product's core job.
5. UX polish only after the core flow exists and has states.

The first slice must be small enough to verify in one task and real enough to
avoid mock-only progress.

## Planning Output Contract

After using this playbook, the repository should contain:

- Product docs that explain the app in plain language.
- Architecture docs that constrain implementation.
- Project state with real stack, commands, hosting, and validation.
- One `READY` task in `.codex/context/TASK_BOARD.md`.
- A matching `NOW` entry in `docs/planning/mvp-next-commits.md`.
- `.agents/state/current-focus.md` and `.agents/state/next-steps.md` updated.
- Any unresolved architecture or product questions in
  `docs/planning/open-decisions.md`.

## Anti-Patterns

- Starting by scaffolding many pages before defining the source of truth.
- Building UI screens against fake data without a planned real data path.
- Adding auth, billing, AI, or integrations without risk classification.
- Treating planning docs as permanent architecture truth.
- Creating a broad task like "build the app" instead of one vertical slice.
- Moving to visual polish while loading, empty, error, and success states are
  still undefined.
- Adding deployment files without health, env ownership, and rollback notes.

## Done Criteria

The app-creation setup is done when a fresh agent can answer:

1. What is the app?
2. Who uses it?
3. What is the first real workflow?
4. What architecture constrains it?
5. What exact task is next?
6. What validation proves that task?
7. What can go wrong, and how does the system fail or recover?
