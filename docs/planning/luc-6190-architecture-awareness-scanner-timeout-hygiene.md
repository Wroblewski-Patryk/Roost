# LUC-6190 Architecture-Awareness Scanner Timeout Hygiene

Date: 2026-06-29
Issue: [LUC-6190](/LUC/issues/LUC-6190)
Parent: [LUC-6166](/LUC/issues/LUC-6166)
Owner: Technical Solution Architect
Task Type: technical-repair / tooling hygiene
Current Stage: verification
Deliverable For This Stage: scanner timeout classification and future command contract

## Goal

Classify the [LUC-6166](/LUC/issues/LUC-6166) architecture-awareness scanner
timeout after fresh artifacts were written, then record the safe command
contract for future Roost known-state lanes.

## Scope

- Scanner implementation:
  `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`
- Roost generated architecture artifacts:
  - `docs/graphs/architecture-awareness.json`
  - `docs/graphs/architecture-awareness.csv`
  - `docs/graphs/architecture-proof-register.csv`
  - `docs/graphs/architecture-graph.md`
  - `docs/graphs/architecture-graph.mmd`
  - `docs/graphs/architecture-health.json`
  - `docs/status/architecture-awareness-report.md`
  - `docs/status/architecture-dependency-report.md`
  - `docs/status/architecture-ownership-report.md`
  - `docs/status/task-synchronization-report.md`
- Dependent app-completion artifacts:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
- Local verification:
  - scanner `--status-only`
  - full scanner rerun with `--max-elapsed-ms`
  - app-completion refresh
  - `npm run architecture:status`
  - `npm run check:route-capabilities`
  - scanner process hygiene check

## Exclusions

- No product code, schema, migration, runtime server, browser, database, Docker,
  push, deploy, restart, protected smoke, provider action, credential access,
  secret disclosure, or production mutation.
- No broad build/test sweep; this lane is bounded to scanner hygiene and local
  readback gates.
- No mutation of the shared Paperclip scanner script because inspection and
  rerun did not reproduce a script defect.

## Implementation Plan

1. Read [LUC-6166](/LUC/issues/LUC-6166) evidence and current scanner code.
2. Confirm whether the scanner already exposes status/readback and time-budget
   controls.
3. Run the smallest readback proof with `--status-only`.
4. Run one full scanner pass with a larger shell timeout and explicit internal
   `--max-elapsed-ms` budget.
5. Refresh app-completion after generated architecture artifacts change.
6. Run narrow local gates and process hygiene checks.
7. Record classification, future command contract, and issue disposition.

## Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Parent timeout readback | PASS | [LUC-6166](/LUC/issues/LUC-6166) recorded fresh artifacts at `2026-06-29T07:07:18.555Z`, command timeout after `124280ms`, and no matching scanner process afterward. |
| Scanner contract inspection | PASS | `build-architecture-awareness-index.mjs` already supports `--status-only`, `--max-elapsed-ms`, progress events, explicit generated-output exclusion, retrying writes on `EBUSY`/`EPERM`/`UNKNOWN`, and `process.exit(0)` after the final stdout completion write. |
| Status-only readback | PASS | `$env:NODE_OPTIONS='--max-old-space-size=4096'; node .../build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --status-only` returned `completed=true`, `missing=[]`, `2691` entities, `6121` relations, and scanner-reported `elapsedMs=51`; outer `Measure-Command` was `961.6611ms`. |
| Full scanner rerun | PASS | `$env:NODE_OPTIONS='--max-old-space-size=4096'; node .../build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --max-elapsed-ms 180000` completed with `2695` entities, `6136` relations, `16260` files, scanner `elapsedMs=26688`, and outer `Measure-Command` `27235.3821ms`. Final progress event was `phase=complete`. |
| App-completion refresh | PASS | `node .../build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` returned `374` items, `7` flows, `363` missing test links, `0` missing doc links, `0` blocked, and `0` browser-review records. |
| Architecture status gate | PASS | `npm run architecture:status` returned `GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass `yes`. |
| Route capability gate | PASS | `npm run check:route-capabilities` returned `180` manifest routes, `35` route files, status `ok`. |
| Process hygiene | PASS | `Get-CimInstance Win32_Process -Filter "name = 'node.exe'"` filtered for `build-architecture-awareness-index`, `build-app-completion-index`, `check-route-capabilities`, and `print-architecture-status` returned no matching remaining process. |

## Classification

| Hypothesis | Classification | Rationale |
| --- | --- | --- |
| Expected duration / file-count growth | Not primary | The current full scan over `16260` files completed in about `27s`; file count growth alone does not explain the prior `124280ms` outer timeout. |
| Post-write cleanup hang | Not reproduced | The scanner emitted `phase=complete`, wrote final completion JSON, and exited with code `0`. No matching process remained. |
| Script defect | Not found in this lane | Existing code has explicit completion, status-only readback, retrying writes, generated-output exclusion, and an internal pre-export time budget. No defect reproduced. |
| Timeout too low / outer-runner ambiguity | Most likely | [LUC-6166](/LUC/issues/LUC-6166) proved artifacts were fresh and no process remained after timeout, which is consistent with a wrapper/heartbeat command timeout or stdout/process collection ambiguity rather than scanner corruption. |
| Artifact corruption risk | Low | Status-only and full rerun both produced parseable/readable artifacts; app-completion and architecture gates passed. |

## Future Command Contract

For future Roost known-state lanes, use the scanner with explicit internal and
outer budgets:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs `
  --project Roost `
  --root C:/Personal/Projekty/Aplikacje/Roost `
  --max-elapsed-ms 180000
```

Runner/shell timeout recommendation: at least `240000ms`. The internal
`--max-elapsed-ms` budget fails before export writes if the scan exceeds the
budget, while the larger outer timeout leaves enough room for stdout capture
and process teardown.

When a future heartbeat only needs to verify existing generated artifacts after
a timeout or suspected wrapper interruption, use:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs `
  --project Roost `
  --root C:/Personal/Projekty/Aplikacje/Roost `
  --status-only
```

Treat `--status-only` with `completed=true`, `missing=[]`, current
`generatedAt`, and expected entity/relation counts as a valid artifact-readback
proof. It is not a replacement for a required fresh scan.

## Result Report

- The timeout from [LUC-6166](/LUC/issues/LUC-6166) is classified as outer
  command timeout/runner ambiguity, not a reproduced scanner hang or script
  defect.
- No scanner code change is recommended from this evidence.
- Future scanner lanes should use `--max-elapsed-ms 180000` and an outer
  command timeout of at least `240000ms`.
- Future timeout triage should first run `--status-only`; if files are present
  and current, record artifact readback before deciding whether a rerun is
  necessary.
- Generated Roost architecture and app-completion artifacts were refreshed
  during this lane.
- Commit not created because the Roost worktree is already mixed dirty and
  ahead of origin; this packet is not safely isolatable from existing
  generated/status/state churn.
- Push status: not needed/held.
- Deploy impact: none.
- Runtime process hygiene: no scanner/app-completion/status Node process
  remained after validation.
