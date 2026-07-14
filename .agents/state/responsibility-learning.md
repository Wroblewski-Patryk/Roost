# Responsibility Learning

Last updated: 2026-05-20

Use this ledger when coordinator/subagent work exposes a missing lane, unclear
owner, bad split, missing evidence, or missing context. Gaps here must change
the next similar mission brief, lane registry, docs, or task plan.

| ID | Date | Mission/task | Gap type | Missing or unclear responsibility | Evidence/source | Next briefing change | Stored follow-up | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RLG-004 | 2026-07-14 | LUC-1101 issue disposition | missing_lane | The GitHub issue connector did not map to the `LUC-1101` tracker record, so the live issue-state mutation could not be completed from this workspace. | `mcp__codex_apps__github._update_issue` returned GitHub 404 for `Wroblewski-Patryk/Roost#1101`. | Future closeouts must confirm the reachable Paperclip/LUC control-plane mutation path or explicitly declare the tracker record out of scope before the heartbeat starts. | `.codex/tasks/luc-1101-unclassified-root-get-proof-link.md`; `.agents/state/system-health.md` | closed |
| RLG-002 | 2026-07-14 | LUC-1028 heartbeat closeout | missing_lane | The available GitHub issue connector did not map to the `LUC-*` tracker record, so both issue-comment and issue-state mutations returned 404 instead of finalizing the board item. | `mcp__codex_apps__github._add_comment_to_issue` and `mcp__codex_apps__github._update_issue` returned GitHub 404 for `Wroblewski-Patryk/Roost#1028`. | Future closeouts need the actual Paperclip/LUC control-plane mutation path named up front, or the brief must say the issue record is outside this connector's scope. | `.agents/state/system-health.md`; closeout notes for this heartbeat | closed |
| RLG-003 | 2026-07-14 | LUC-1070 issue disposition | missing_lane | The session could complete the repository proof but could not locate a reachable control-plane record for the requested issue, so the final board status remained inaccessible. | GitHub issue fetch for `Wroblewski-Patryk/Roost#1070` returned `404 Not Found`; ClickUp searches for `LUC-1070`, `architecture-health-dashboard-gate`, and `check-architecture-health-dashboard-gate.mjs` returned zero results. | Future blocker handling needs the board target or tracker owner confirmed before the heartbeat starts, so a terminal disposition can be written without guessing the connector. | `.agents/state/active-mission.md`; `.agents/state/current-focus.md`; `.agents/state/next-steps.md` | closed |
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
