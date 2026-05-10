# Agent Operating System

Last updated: YYYY-MM-DD

## Purpose

This file defines the durable operating system for AI agents working in this
project. It does not replace `AGENTS.md`, `.codex/context/*`, or architecture
docs. It gives every future "continue", "rob dalej", "kontynuuj", or "next"
run a stable startup path, decision model, reporting model, and state update
model.

## Startup Protocol

For non-trivial work, read this order:

1. `AGENTS.md`
2. `.agents/core/operating-system.md`
3. `.agents/core/execution-loop.md`
4. `.agents/core/anti-regression.md`
5. `.agents/core/quality-gates.md`
6. `.agents/state/current-focus.md`
7. `.agents/state/known-issues.md`
8. `.agents/state/regression-log.md`
9. `.agents/state/system-health.md`
10. `.agents/state/next-steps.md`
11. `.codex/context/PROJECT_STATE.md`
12. `.codex/context/TASK_BOARD.md`
13. `.codex/context/LEARNING_JOURNAL.md`
14. `docs/planning/mvp-next-commits.md`
15. `docs/planning/mvp-execution-plan.md`
16. `docs/planning/open-decisions.md`

If these sources drift, canonical priority is:

1. `docs/architecture/`
2. product, security, and safety contracts
3. `.codex/context/*`
4. `.agents/state/*`
5. planning files
6. historical reports and archived notes

## Operating Principles

- Work in small, reversible, evidence-backed iterations.
- Choose exactly one priority task per autonomous iteration.
- Prefer stability, architecture alignment, no regressions, correct flows, UX,
  aesthetics, and only then new features.
- Reuse approved systems before creating or changing patterns.
- Treat architecture mismatches as decision points, not implementation puzzles.
- Never introduce temporary bypasses, fake data, mock-only product behavior, or
  hidden fallback paths.
- For auth-sensitive, AI, secrets, payments, permissions, integrations,
  production, or user-data surfaces, default to fail-closed behavior and
  stronger validation.
- Clean up local validation resources before ending a task. Browser-driven
  checks must close Playwright/browser MCP pages, contexts, browsers, and local
  preview servers. Do not leave validation-owned `chrome-headless-shell`,
  `chromium`, Playwright, dev-server, Docker, or database processes running
  unless the user explicitly asked to keep them alive.
- Keep repository artifacts in English and user-facing conversation in the
  user's language.

## Continuation Semantics

When the user sends a short execution nudge, the agent must:

1. Refresh the state files in `.agents/state/`.
2. Cross-check `.codex/context/TASK_BOARD.md` and
   `docs/planning/mvp-next-commits.md`.
3. Pick the first executable `READY` or `IN_PROGRESS` task in the active queue.
4. If no active task exists, derive the smallest safe task from
   `.agents/state/next-steps.md`, `docs/planning/mvp-execution-plan.md`, or
   `docs/planning/open-decisions.md`.
5. Write or update one task contract from `.codex/templates/task-template.md`.
6. Execute one iteration through `.agents/core/execution-loop.md`.
7. Update `.agents/state/*`, `.codex/context/*`, and relevant docs before
   reporting completion.

Do not rely on hidden chat memory to continue work. Future agents must be able
to recover from repository files alone.

## Project Analysis Model

Every autonomous iteration should classify the project through these lenses:

- architecture: source-of-truth alignment, ownership, data flow, safety
- backend: modules, services, persistence, workers, invariants
- API: routes, contracts, auth, validation, client compatibility
- frontend: route ownership, data fetching, state, i18n, rendering
- state management: source of truth, cache semantics, stale-state risks
- UI/UX: hierarchy, spacing, loading, empty, error, success, accessibility
- mobile readiness: responsive layout, touch, overflow, keyboard path
- regressions: behavioral drift, test gaps, duplication, dead code, type safety
- operations: health, readiness, smoke, rollback, observability
- documentation: architecture memory, module docs, planning, evidence

## Reporting Model

Every completion report must include:

- selected task and operation mode
- files changed
- validation actually run
- validation not run and why
- deployment impact
- residual risk
- next tiny task

For review work, findings must lead the response. For implementation work, the
summary can be short, but evidence must be present in the task artifact or
state files.

## State Update Model

After each iteration, update these files when applicable:

- `.agents/state/current-focus.md`: what the system is currently optimizing
- `.agents/state/known-issues.md`: unresolved problems and risk classification
- `.agents/state/regression-log.md`: regressions found, fixed, or monitored
- `.agents/state/system-health.md`: latest validation and runtime health signal
- `.agents/state/next-steps.md`: next executable tiny tasks in priority order
- `.codex/context/TASK_BOARD.md`: canonical queue state
- `.codex/context/PROJECT_STATE.md`: durable project progress
- `.codex/context/LEARNING_JOURNAL.md`: recurring verified pitfalls
- relevant `docs/*`: architecture, contracts, flows, modules, testing, UX,
  operations, governance, or planning truth that changed

## App Build Continuity

- Use `docs/governance/app-creation-playbook.md` for new apps and major product surfaces.
- Treat accepted user feedback as durable repo memory through `docs/governance/user-feedback-loop.md`.
- Use `.codex/templates/handoff-packet-template.md` for substantial or multi-session handoffs.
