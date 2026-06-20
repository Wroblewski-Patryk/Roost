# LUC-5247 Architecture Scanner Budget And Refresh Policy Repair

## Task Contract

- ID: LUC-5247
- Title: Architecture scanner budget and refresh policy repair
- Task Type: architecture tooling policy repair
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Priority: P1
- Operation Mode: ARCHITECT
- Mission ID: LUC-5247-ARCHITECTURE-SCANNER-BUDGET-REFRESH-POLICY
- Mission Status: VERIFIED

## Goal

Repair the known-state architecture-awareness refresh policy after
[LUC-5238](/LUC/issues/LUC-5238) proved that the old `90000ms` bounded full
refresh budget can expire during `scan_files` before export writes.

## Scope

- `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`
- Roost generated scanner exports under `docs/graphs/` and `docs/status/`
- Roost architecture/source-of-truth notes that describe scanner refresh use

## Exclusions

- No product runtime code.
- No schema, migration, deploy, push, restart, protected smoke, production
  mutation, credential access, secret handling, browser, database, Docker,
  server, or watcher process.
- No changed-file scan mode in this repair. A partial changed-file graph would
  be a different scanner design because current exports are full-snapshot
  awareness artifacts.

## Decision

Use the existing scanner safety behavior, but update Roost known-state refresh
policy to a two-tier command contract:

1. Always run `--status-only` first. It is the heartbeat preflight and must not
   walk the repository or write exports.
2. Run full refresh only when needed with `--max-elapsed-ms 180000
   --progress-every 5000` for the current Roost workspace size.
3. If the bounded full refresh still exits with
   `ARCHITECTURE_AWARENESS_TIME_BUDGET_EXCEEDED`, treat existing exports as
   stale-but-preserved, record the failed phase and counts, and open a focused
   scanner optimization lane instead of letting a heartbeat time out.

Rationale: [LUC-5238](/LUC/issues/LUC-5238) failed at `90000ms` during
`scan_files` after `13539/13712` files. A larger bounded refresh completed
with the same safety property: it still fails before writes if the budget is
exceeded, but gives the current workspace enough room to finish.

## Verification Evidence

| Check | Result |
| --- | --- |
| `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --status-only` | PASS in `21ms`; generated exports present; `2383` entities / `4948` relations; missing exports `0` |
| `npm run architecture:status` before full refresh | PASS; `GREEN`; graph `454/765/35`; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass |
| `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --max-elapsed-ms 180000 --progress-every 5000` | PASS in `158683ms`; generated `2026-06-20T18:21:32.416Z`; `2386` entities / `4962` relations / `13716` files |
| Final `--status-only` readback | PASS in `25ms`; generated timestamp `2026-06-20T18:21:32.416Z`; `2386` entities / `4962` relations; missing exports `0` |
| Final `npm run architecture:status` | PASS; `GREEN`; graph `454/765/35`; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass |

Refresh progress proof:

- `walk_complete`: `2434ms`, `13716` files.
- `scan_files`: `5000` files at `31147ms`, `10000` files at `73122ms`,
  `13716` files at `152762ms`.
- `collect_tasks_complete`: `153515ms`, `4` task files.
- `export_start`: `157298ms`, `2386` entities / `4962` relations.
- `complete`: `158683ms`.

## Result Report

The issue is verified by policy decision plus command proof. The previous
`90000ms` refresh budget is too tight for current Roost known-state heartbeats.
The repaired policy is `status-only` preflight plus a `180000ms` bounded full
refresh when fresh exports are required.

Changed files in Roost:

- `docs/planning/luc-5247-architecture-scanner-budget-refresh-policy-repair.md`
- `docs/architecture/architecture-evidence-system.md`
- generated scanner exports under `docs/graphs/` and `docs/status/`
- state/queue files updated with the LUC-5247 disposition

Residual risk:

- The scanner remains a full-snapshot scanner. If Roost grows enough that
  `180000ms` becomes insufficient, the next repair should be scanner
  optimization or cache design, not a silent unbounded heartbeat command.

Next action:

- Source-control closure should classify and preserve the generated/status and
  policy packet alongside adjacent LUC-5238/LUC-5243 evidence. No product
  repair or protected runtime action is required from LUC-5247.
