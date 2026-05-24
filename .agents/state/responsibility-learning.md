# Responsibility Learning

Last updated: 2026-05-20

Use this ledger when coordinator/subagent work exposes a missing lane, unclear
owner, bad split, missing evidence, or missing context. Gaps here must change
the next similar mission brief, lane registry, docs, or task plan.

| ID | Date | Mission/task | Gap type | Missing or unclear responsibility | Evidence/source | Next briefing change | Stored follow-up | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RLG-001 | 2026-05-20 | FULL-FUNCTION-ARCH-AUDIT-001 | missing_evidence | The first Playwright static proof used `public/react` as the server root, so `/react/assets/*` returned HTML and the proof failed for harness reasons instead of app behavior. | Local rendered proof attempt during FULL-FUNCTION-ARCH-AUDIT-001. | Browser/static proof briefs must state the static root explicitly: serve `public/` and route unknown paths to `public/react/index.html`. | `.agents/state/system-health.md`; `docs/planning/full-function-architecture-audit-task-contract.md` | closed |

## Gap Types

- `missing_lane`: a needed responsibility was not assigned to any agent.
- `unclear_owner`: multiple lanes assumed someone else owned the work.
- `bad_split`: delegated lanes overlapped or could not be integrated cleanly.
- `missing_evidence`: a lane delivered output without proof needed for acceptance.
- `missing_context`: a lane lacked source-of-truth context needed to act.

## Closure Rule

Close a row only after the next mission brief, task template, lane registry,
source-of-truth doc, or state file has been updated so the same gap is less
likely to repeat.
