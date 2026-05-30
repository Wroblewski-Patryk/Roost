# Task

## Header
- ID: LUC-794
- Title: [Roost] [Known State] Evidence collection and architecture baseline
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Priority: P1
- Mission ID: LUC-794-KNOWN-STATE-EVIDENCE
- Mission Status: VERIFIED

## Goal
Collect fresh local evidence for repository known-state and convert the findings into concrete repair lanes without leaving preparation mode.

## Scope
- LuckySparrow shared contracts and `roles/roost-project-manager.md`
- `.agents/state/active-mission.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `package.json` scripts inventory
- Architecture/deploy/test/security canonical docs presence

## Implementation Plan
1. Acknowledge board wake delta and stay in local-evidence-only mode.
2. Re-run minimum architecture baseline proof and source-control continuity checks.
3. Inventory runtime/validation tooling and canonical docs coverage.
4. Publish evidence with explicit statuses and define bounded next repair lanes.
5. Sync canonical mission/state pointers to this issue packet.

## Acceptance Criteria
1. The packet includes fresh command evidence from this heartbeat.
2. Claims are tagged using evidence statuses (`implemented and verified`, `present in code, behavior unknown`, `missing`, `blocked by error`).
3. Next repair lanes are concrete, bounded, and preparation-compatible.
4. No deploy/push/protected-smoke/production mutation is performed.

## Known-State Evidence (2026-05-30)

| Surface | Evidence | Status |
| --- | --- | --- |
| Architecture baseline gate | `npm run architecture:status` -> `GREEN`, `452/761/34`, evidence queue `0`, chain worklist `0`, all gates pass `yes` | implemented and verified |
| Source-control continuity | `git log --oneline -6` -> `0bf9b13`, `256ab4b`, `a0b861d`, `5f42858`, `240a5de`, `d4cdb2d` | implemented and verified |
| Local heartbeat delta | `git status --short` -> four modified canonical state files and two untracked planning packets (`LUC-790`, `LUC-794`) | present in code, behavior unknown |
| Validation command contract | `package.json` scripts include `architecture:*`, `validate`, `test:api`, `mcp:smoke`, `ai-ready:smoke`, `aog:deploy-smoke` | implemented and verified |
| Canonical architecture/ops/engineering/security docs | Presence checks for architecture (`README`, `system-architecture`, `tech-stack`, `architecture-source-of-truth`), operations deploy docs, engineering/testing docs, and security SDL all returned `FOUND` | implemented and verified |
| Protected runtime proof lane (`LUC-261`) | Board gate still requires explicit one-run approval or fresh accepted credential-scope evidence before protected rerun | blocked by error |

## Next Repair Lanes (Preparation-Safe)

1. `Lane A - Protected proof unblock execution packet` (owner: Portfolio/Board or runtime secret owner)
   - Provide explicit one-run approval or fresh accepted credential-scope evidence.
   - Run exactly one same-session:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`
   - Record UTC, preflight status, request ID, and pass/fail result.

2. `Lane B - Canonical state pointer rollover` (owner: coordinator)
   - Move active pointer set from `LUC-790` to `LUC-794` across mission/board/project/next-steps.
   - Keep scope docs/state only; no runtime/deploy mutation.

3. `Lane C - Preparation backlog hygiene` (owner: coordinator)
   - Keep `ARCH-EVID-002` in maintenance mode with minimum heartbeat proof (`npm run architecture:status`).
   - Open specialist issues only after explicit activation or new failing evidence.

## Validation Evidence
- `npm run architecture:status`
- `git status --short`
- `git log --oneline -6`
- `node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2));"`
- Targeted docs presence checks for architecture/operations/engineering/security canonical files

## Result Report
- Outcome: fresh known-state evidence captured and converted into concrete repair lanes for `LUC-794`.
- Deployment/runtime mutation: none.
- Residual risk: protected runtime proof remains externally blocked by board/credential gate.
- Final disposition for this issue scope: `done`.
