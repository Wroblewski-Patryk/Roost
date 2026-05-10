# Quality Gates

Last updated: YYYY-MM-DD

## Purpose

Quality gates define the minimum validation needed before a task can be called
done. Use the relevant gates for the touched scope; broaden validation as risk
increases.

## Baseline Gates

Record the real project commands in `.codex/context/PROJECT_STATE.md`. Common
examples include:

```powershell
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Required Gate Categories

Every change must consider:

- lint
- build
- typecheck
- automated tests
- UI validation when UI changed
- architecture validation
- regression validation
- local resource cleanup after browser-driven validation

## Scope-Based Minimums

| Scope | Minimum validation |
| --- | --- |
| Docs-only agent workflow | Link/path review plus any repo guardrail command. |
| Architecture docs | Source-of-truth consistency review. |
| API code | API focused tests, API typecheck, relevant DB/migration checks. |
| Web code | Focused web tests, web typecheck, web lint, route/i18n audit when copy/routes changed. |
| Shared runtime helpers | Focused tests for all consuming routes plus typecheck. |
| UI behavior | Focused tests, rendered smoke, responsive and accessibility evidence. |
| AI, auth, payments, permissions, data | Focused tests, fail-closed checks, security review, typecheck, build. |
| Release/deploy | Deploy smoke, readiness/health checks, rollback notes, operations evidence. |

## Pass/Fail Rules

- A required gate failure blocks `DONE`.
- If a gate cannot run, document why, classify the residual risk, and choose
  the next best evidence.
- Do not create a commit when required quality gates fail unless the user
  explicitly approves a temporary exception.
- For docs-only changes, do not run expensive runtime packs unless the docs
  changed runtime requirements or validation contracts.

## UI Validation Gate

For UI changes, verify:

- loading state
- empty state
- error state
- success state
- disabled/blocked state when an action exists
- desktop, tablet, and mobile layout
- keyboard and screen-reader affordances
- no visible framework overlays, console errors, page errors, or 5xx responses
- no incoherent overlap, overflow, or developer-looking diagnostic clutter

## Architecture Validation Gate

For every meaningful change:

1. Name the architecture or module source reviewed.
2. Confirm the implementation fits it.
3. Record any mismatch.
4. If a mismatch exists, stop for a decision before changing behavior.

## Regression Validation Gate

Before closure:

- run or document the anti-regression checklist
- check touched shared helpers for all consumers
- check test coverage for the changed contract
- update `.agents/state/regression-log.md` for unresolved or newly fixed
  regressions
