---
description: Workspace rules for this project
---

# General Workspace Rules

## Stack Snapshot
- Backend:
- Frontend:
- Mobile:
- Database:
- Hosting target:
- Deployment shape:
- Runtime constraints:

## Architecture Rules
- Keep project-specific conventions explicit.
- Document where state lives and why.
- Treat `docs/architecture/` as the approved implementation contract.
- If a better design requires changing architecture, propose it before
  changing code direction or docs.
- Prefer existing patterns over introducing a new style per feature.
- Keep cross-module contracts explicit when shared code or shared schemas exist.
- Do not remove potentially shared code without checking remaining consumers.

## Repository And Docs Rules
- Keep root minimal and intentional.
- Put project documentation under `docs/`.
- Update planning, architecture, or operations docs when behavior or structure changes.
- Treat docs parity as a real done-state requirement when routes, modules, IA,
  or runtime ownership change.
- Use `.agents/workflows/documentation-governance.md` when deciding where new
  truth should live.
- Keep links repository-relative and avoid sibling-repository references.
- Use `.agents/workflows/user-collaboration.md` when user intent, blockers,
  active visual notes, or handoff expectations need to stay explicit.
- Use `.agents/workflows/world-class-delivery.md` for substantial product,
  runtime, release, UX, security, or AI work.
- Use `docs/governance/autonomous-engineering-loop.md` for autonomous
  iteration structure, process self-audit, one-task selection, and
  `BUILDER` / `ARCHITECT` / `TESTER` mode rotation.

## UI/UX Rules
- Define approved component style and motion approach.
- Treat the visual system as a reuse-first contract.
- Reuse an existing shared component or approved variant before creating a new
  visual pattern.
- If a new visual pattern is necessary, make it reusable and document it.
- If design tools are used, record source-of-truth links.
- For UX-heavy work, require states, responsive checks, accessibility checks,
  and parity evidence.
- For broad UX review, use `docs/ux/evidence-driven-ux-review.md` and turn
  screenshot or clickthrough evidence into prioritized implementation slices.
- Every important screen should make the primary user question and next action
  clear within seconds.
- Keep feedback local to the action and avoid showing raw backend or provider
  errors directly to end users.
- When a canonical screenshot or mockup exists, require a visual gap audit,
  asset strategy, and screenshot comparison pass.
- Do not replace decorative image assets with gradient approximations when the
  approved design depends on textured or illustrated backgrounds.
- Figma is the primary implementation source when available.
- Stitch is draft-only unless the repository explicitly approves another rule.

## Deployment Rules
- Treat Coolify on VPS as the default deployment target unless the project
  declares otherwise.
- Keep env ownership, health checks, persistent data, and worker processes
  explicit.
- When runtime behavior changes, review deploy docs, smoke checks, and rollback
  notes in the same task.
- For deployable services or critical journeys, define the relevant SLI/SLO,
  health check, alert route, and rollback or disable path when appropriate.
- Record the real deployment artifacts and paths in
  `.codex/context/PROJECT_STATE.md`.

## Delivery Rules
- Keep changes scoped and reversible.
- Require acceptance evidence before completion.
- Use `.codex/templates/task-template.md` for every task and include Goal,
  Scope, Implementation Plan, Acceptance Criteria, Definition of Done, and
  Result Report.
- Check `DEFINITION_OF_DONE.md` before any task moves to `DONE`.
- Check `INTEGRATION_CHECKLIST.md` before integrated runtime work is accepted.
- Check `NO_TEMPORARY_SOLUTIONS.md` whenever a blocker appears.
- Check `AI_TESTING_PROTOCOL.md` for AI features.
- Check `DEPLOYMENT_GATE.md` before release or deploy handoff.
- Check `docs/security/secure-development-lifecycle.md` for security,
  permissions, secrets, AI, money, integrations, or user-data risk.
- Check `docs/operations/service-reliability-and-observability.md` for
  deployable services, public APIs, workers, scheduled jobs, or critical user
  journeys.
- Implement features as vertical slices across UI, logic, API, DB, validation,
  error handling, and tests.
- Do not mark partial runtime work as done.
- Stop and report when the proper solution is blocked.
- Keep planning docs and task board synchronized.
- For medium or large projects, release readiness, handoffs, incidents, or
  stalled queues, use `docs/governance/function-coverage-ledger-standard.md`
  to map module functions, confidence, evidence gaps, blockers, and the next
  smallest verification or fix task.
- If a function coverage ledger exists, update the smallest truthful row after
  verification, fixes, deferrals, or release-gate reruns.
- Declare the current delivery stage in each task and keep output aligned to
  that stage only.
- Do not skip from analysis or planning straight to implementation unless
  explicitly requested.
- Follow the default loop:
  `analyze -> select one task -> plan -> implement -> verify -> self-review -> sync knowledge -> repeat`.
- Report changed files, validations actually run, remaining risks, and the next
  tiny task after implementation.
- Apply the validation commands from `.codex/context/PROJECT_STATE.md` before
  every commit.
- Use subagents only according to `.agents/workflows/subagent-orchestration.md`.
