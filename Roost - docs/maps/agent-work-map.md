# Agent Work Map

Last updated: YYYY-MM-DD

## Startup Path

1. `docs/documentation-map.md`
2. `.agents/core/operating-system.md`
3. `.agents/core/project-memory-index.md`
4. `.agents/core/mission-control.md`
5. `.agents/core/quality-gates.md`

## Active Work State

Use these paths as current execution truth:

| Path | Use |
| --- | --- |
| `.agents/state/active-mission.md` | First router for broad continuation. |
| `.agents/state/current-focus.md` | Current release and work focus. |
| `.agents/state/next-steps.md` | Next executable work. |
| `.agents/state/module-confidence-ledger.md` | Module reality map. |
| `.agents/state/requirements-verification-matrix.md` | Requirement-to-proof table. |
| `.agents/state/risk-register.md` | Risk reality map. |
| `.agents/state/system-health.md` | Latest validation and runtime health. |
| `.codex/context/TASK_BOARD.md` | Queue and done records. |
| `.codex/context/PROJECT_STATE.md` | High-level project reality. |
| `.codex/context/LEARNING_JOURNAL.md` | Recurring pitfalls and reusable learning. |

## Decision Routes

| If You Need To | Use This Source First | Do Not Substitute With |
| --- | --- | --- |
| Choose the next executable task | active mission, next steps, task board | old unchecked boxes in historical plans |
| Turn an idea into work | `docs/planning/idea-to-function-chain-playbook.md` | a vague feature note |
| Decide if behavior is allowed | `docs/architecture/` and relevant contracts | a task note alone |
| Find implementation ownership | module docs and graph registry | a filename alone |
| Prove a current claim | latest validation plus `history/evidence/` or `history/releases/` | stale screenshots or chat memory |
| Record completed work | `history/tasks/` | current docs folders |
| Record raw generated output | `history/artifacts/` | current docs folders |

## Before Saying Verified

Use evidence-backed language only:

| Status | Required Evidence |
| --- | --- |
| `verified` | Fresh validation or proof is named and reachable. |
| `partially_verified` | Passing and missing scenarios are listed. |
| `blocked` | Exact blocker and unblock action are listed. |
| `implemented_not_verified` | Code or docs changed but proof is incomplete. |
| `failed` | Fresh validation failed and the failure is recorded. |

For docs-only work, verification usually means link checks, graph/orphan scans,
guardrails, docs parity, and state/task sync. For runtime, auth, money,
deployment, AI, or side-effectful work, use stronger scope-specific gates.

## Closeout Rule

Every substantial task closes by updating:

1. task board or active mission;
2. relevant docs, graph records, pipelines, or ledgers;
3. evidence/history artifact when proof was produced;
4. next tiny task or explicit blocked state.
