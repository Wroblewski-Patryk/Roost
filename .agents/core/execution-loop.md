# Execution Loop

Last updated: YYYY-MM-DD

## Purpose

This is the mandatory autonomous iteration loop for agents. It extends
`docs/governance/autonomous-engineering-loop.md` with a concrete analysis
sequence that keeps app creation, implementation, QA, and documentation aligned.

## Loop

Every implementation iteration must move through these stages in order:

1. Analyze architecture.
2. Analyze backend.
3. Analyze API.
4. Analyze frontend.
5. Analyze state management.
6. Analyze UI/UX.
7. Analyze mobile readiness.
8. Detect regressions.
9. Plan fixes.
10. Implement.
11. Test.
12. Validate the system.
13. Update documentation.
14. Save next steps.
15. Continue the iteration cycle.

Small docs-only tasks may record concise `not applicable` evidence for code
surfaces, but they must not skip the loop silently.

## Required Output Per Stage

| Stage | Required output |
| --- | --- |
| Architecture | Reviewed source-of-truth docs and alignment statement. |
| Backend | Affected modules, services, persistence, workers, or `not applicable`. |
| API | Route/client contract impact, auth/validation impact, or `not applicable`. |
| Frontend | Route/component/data-fetching impact, or `not applicable`. |
| State management | Source-of-truth and cache/stale-state risk check. |
| UI/UX | Loading, empty, error, success, hierarchy, a11y, responsiveness check. |
| Mobile readiness | Desktop/tablet/mobile or explicit no-UI rationale. |
| Regression detection | Impact analysis, dependency check, duplication/dead-code check. |
| Plan fixes | One tiny selected task and exact scope. |
| Implement | Scoped edits only. |
| Test | Relevant commands, manual checks, and blocked checks. |
| System validation | Architecture, contracts, quality gates, and docs parity check. |
| Documentation | Updated source-of-truth files. |
| Next steps | `.agents/state/next-steps.md` updated. |
| Continuation | Clear next runnable task for the next agent. |

## Task Contract

Before implementation, create or update a task artifact using
`.codex/templates/task-template.md`. The task must include:

- current delivery stage
- operation mode
- process self-audit
- goal
- scope
- implementation plan
- acceptance criteria
- definition of done
- validation evidence
- result report

## Priority Order

When choosing what to do next, use this order:

1. Stability
2. Architecture alignment
3. No regressions
4. Correct end-to-end flows
5. UX
6. Visual polish
7. New features

## Operation Modes

Use `docs/governance/autonomous-engineering-loop.md` for mode rotation:

- `TESTER` when the iteration number is divisible by 5
- `ARCHITECT` when divisible by 3 and not by 5
- `BUILDER` otherwise

If the iteration number is not known, use the next number from the active task
queue or create the smallest explicit planning task that sets the number.

## Stop Conditions

Stop and ask for a user decision when:

- implementation conflicts with approved architecture
- a proper solution requires a new system not already approved
- the next step would be destructive or irreversible
- required secrets, production access, or external credentials are missing
- a safety-critical flow cannot be validated fail-closed

For ordinary missing implementation details, make a conservative assumption,
document it, and continue.
