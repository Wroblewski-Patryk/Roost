# LUC-5202 Architecture-Awareness Heartbeat Safety

## Task Contract

- Task Type: architecture tooling repair.
- Current Stage: verification.
- Deliverable For This Stage: heartbeat-safe architecture-awareness exporter
  behavior, fresh Roost generated graph evidence, and PM usage recommendation.
- Goal: make the Roost architecture-awareness refresh safe after the
  [LUC-5197](/LUC/issues/LUC-5197) timeout without changing product/runtime
  behavior.
- Scope:
  - `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`
  - Roost generated awareness/status outputs under `docs/graphs/` and
    `docs/status/`
  - Roost state/context notes for [LUC-5202](/LUC/issues/LUC-5202)
- Exclusions: no product runtime behavior, schema, migration, protected target,
  deploy, push, restart, production data, credential, or secret action.
- Implementation Plan:
  1. Reproduce or re-run the Roost architecture-awareness exporter with timing.
  2. Add a fast status-only path for heartbeat preflight.
  3. Add an optional elapsed-time budget that aborts before export writes.
  4. Verify syntax, status-only mode, forced budget failure, budgeted full
     refresh, and project-native architecture status.
- Acceptance Criteria:
  - Existing generated awareness files can be inspected without a repo walk.
  - A budgeted scan exits before generated-file writes when the time budget is
    exceeded.
  - A normal budgeted refresh completes inside a heartbeat-safe budget on the
    current Roost workspace.
  - Generated graph/status files are fresh or staleness is explicitly recorded.
- Definition of Done:
  - Commands, duration, output changes, and residual risks are recorded.
  - Recommended PM heartbeat command is documented.
  - Source-control state is classified.

## Result Report

The [LUC-5197](/LUC/issues/LUC-5197) timeout was not reproducible in this
heartbeat. The original full exporter command completed successfully in about
`30.00s` before the tooling change and refreshed generated files.

Implemented central exporter behavior:

- Added `--status-only` mode. It reads the existing generated awareness and
  health files, reports freshness, counts, signal counts, and missing required
  exports, and performs no repository walk or writes.
- Added `--max-elapsed-ms <milliseconds>`. When set, the exporter checks the
  budget during walk, scan, task collection, graph build, and immediately before
  export. If the budget is exceeded it throws
  `ARCHITECTURE_AWARENESS_TIME_BUDGET_EXCEEDED` before export writes start.
- Left default full-refresh behavior unchanged when no new option is supplied.

## Verification Evidence

| Check | Result |
| --- | --- |
| `node --check C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs` | PASS |
| `node .../build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --status-only` | PASS; completed in `0.37s`, status body elapsed `36ms`, no missing exports, `2368` entities / `4893` relations |
| `node .../build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --max-elapsed-ms 1 --progress-every 5000` | Expected FAIL with `ARCHITECTURE_AWARENESS_TIME_BUDGET_EXCEEDED`; `docs/graphs/architecture-awareness.json` timestamp stayed unchanged |
| `node .../build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --max-elapsed-ms 90000 --progress-every 5000` | PASS; completed in `47.19s`, exporter elapsed `46954ms`, wrote all generated exports |
| `npm run architecture:status` | PASS; `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |

Fresh generated awareness snapshot:

- `docs/graphs/architecture-awareness.json`: generated
  `2026-06-20T16:38:49.366Z`, `2368` entities, `4893` relations.
- `docs/graphs/architecture-health.json`: generated
  `2026-06-20T16:38:49.366Z`, `2368` entities, `4893` relations.
- Health signals remain stable: `implementation_without_tests=1162`,
  actionable `1153`, task gaps `0`, implementation-without-task gaps `0`,
  verified-without-proof gaps `0`, owner gaps `0`, disconnected entities `0`.

## Output Path Results

The verification refresh wrote the generated Roost architecture-awareness
exports and the final status-only readback confirmed they are fresh:

- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-health.json`
- `docs/graphs/architecture-proof-register.csv`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`

Final `git diff --name-status -- docs/graphs docs/status` reported no current
diff for those generated outputs.

The central Paperclip exporter script was modified in the Softwarehouse
workspace. That repository already had unrelated dirty files:
`scripts/lib/softwarehouse-learning-loop.mjs` and
`scripts/softwarehouse-learning-loop.test.mjs`; those were not touched for this
issue.

The Roost workspace also had pre-existing unrelated dirty work from
[LUC-5184](/LUC/issues/LUC-5184), including `src/tests/api.test.ts` and the
LUC-5184 state/planning packet. Those files were not reverted.

## PM Heartbeat Recommendation

Use this two-step pattern for future Roost PM known-state heartbeats:

1. Fast preflight, always safe:
   `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --status-only`
2. Full refresh only when needed, with budget:
   `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --max-elapsed-ms 90000 --progress-every 5000`

If the second command exits with
`ARCHITECTURE_AWARENESS_TIME_BUDGET_EXCEEDED`, treat the old generated graph as
stale, record the phase from the error details, and open a focused tooling
repair lane rather than letting the heartbeat die after a long timeout.

## Source-Control Closure

- Commit: not created in this heartbeat.
- Reason: Roost and Paperclip workspaces already had unrelated dirty files from
  other active lanes. This issue leaves scoped source-control evidence and does
  not stage or revert unrelated work.
- Push status: not needed.
- Deploy impact: none.
- Protected action impact: none.
