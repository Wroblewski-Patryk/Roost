# Agent Process Evals

Last updated: 2026-05-20

Use this ledger to improve how Codex agents work together. It evaluates the
process, not only the code.

| ID | Date | Mission/task | Coordinator score | Lane split score | Brief clarity score | Proof score | Memory score | Main failure mode | Improvement for next mission | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AEV-001 | 2026-05-20 | FULL-FUNCTION-ARCH-AUDIT-001 | 4 | 5 | 4 | 5 | 4 | Initial parent validation ran before all lane findings were integrated, so one validation pass had to be repeated after fixes. | For broad audits, run quick safe gates early, but reserve the final full gate until all lane findings have either been fixed or explicitly rejected. | closed |

## Scoring

- `0`: missing or harmful.
- `1`: present but unclear.
- `2`: usable with major gaps.
- `3`: acceptable.
- `4`: strong.
- `5`: excellent and reusable.

## Required Eval Triggers

- broad mission with subagents
- failed or partial validation
- architecture or UX direction choice
- repeated task churn
- user says work is going in circles
- coordinator discovers a missing lane, bad split, or weak proof

## Closure Rule

Close an eval row only after the next mission brief, hierarchy, lane catalog,
task template, test strategy, or project memory has been updated.
