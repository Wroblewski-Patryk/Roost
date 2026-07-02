# LUC-6902 Exchange Connection Configuration Chain Diagnosis

## Goal

Diagnose the project-truth event-chain gap for `Exchange connection and
configuration` and route the smallest owner-scoped next action.

## Scope

- Issue: [LUC-6902](/LUC/issues/LUC-6902)
- Indexed inputs:
  - `docs/status/project-truth-index.json`
  - `docs/status/event-chain-index.json`
  - `docs/status/runtime-error-index.json`
  - `docs/status/operational-readiness-index.json`
- Inspected surfaces:
  - `docs/planning/luc-5409-exchange-connection-configuration-proof-ladder.md`
  - `web/src/features/settings/settings-routes.tsx`
  - `web/src/app-route-registry.ts`
  - `docs/ux/v1-settings-canonical-spec-2026-05-15.md`

## Implementation Plan

1. Read the scoped Paperclip heartbeat context.
2. Read the current project truth and event-chain indexes.
3. Compare the indexed gap with existing API/backend proof.
4. Inspect the visible settings frontend surface.
5. Create the smallest owner-scoped child issue for remaining repair.
6. Update repository state with the diagnosis and final parent disposition.

## Acceptance Criteria

- Root cause is classified with source evidence.
- A next owner issue exists for required implementation or proof.
- Parent issue status matches reality.
- No protected provider, production, credential, deploy, restart, or live
  exchange action occurs.

## Definition Of Done

- Diagnosis packet is recorded in `docs/planning/`.
- Project state, task board, active mission, module confidence, and next steps
  identify the blocker child.
- Paperclip parent is blocked by the child issue.

## Result Report

Status: `done after delegated child completion`.

2026-07-02 closure readback after [LUC-6911](/LUC/issues/LUC-6911):
the delegated frontend and documentation-memory chain is complete for this
issue's event-chain gap. `docs/status/event-chain-index.json` generated
`2026-07-02T14:52:18.743Z` reports `counts.incompleteChains=0` and reports
`Exchange connection and configuration` as `chain_indexed` with
`missingLayers=[]`. The previously missing frontend layer is now represented by
linked settings evidence from [LUC-6905](/LUC/issues/LUC-6905) and the scanner
override/index refresh in [LUC-6911](/LUC/issues/LUC-6911).

Parent disposition: [LUC-6902](/LUC/issues/LUC-6902) no longer has an
event-chain blocker. Remaining Project Truth gaps are public runtime probe
findings owned by Deployment Reliability / Ops, not this Exchange frontend
event-chain issue.

Final validation:

- Readback of `docs/status/event-chain-index.json` completed:
  `incompleteChains=0`.
- Readback of `docs/status/project-truth-index.json` completed: no
  `event_chain_gap` remains; remaining gaps are runtime/operational readiness
  findings.
- `git diff --check` was rerun for this heartbeat and passed with LF-to-CRLF
  warnings only.

Source control: not committed in this TSA heartbeat because the Roost workspace
is shared mixed dirty with many existing generated/status/source changes. Push
and deploy are not needed for this parent closure. No product code, tests,
protected provider action, live exchange/account mutation, credential value
read, secret disclosure, runtime server, browser, Docker, database, push,
deploy, restart, or production mutation occurred.

2026-07-02 blocker recheck: [LUC-6905](/LUC/issues/LUC-6905) is now `done`
and implemented the visible `/workspace/settings` frontend chain with
`npm run build:web` PASS, `npm run build:server` PASS, and desktop/mobile
Playwright fallback proof against backend-shaped responses. The parent cannot
close yet because the current generated event-chain index still reports
`Exchange connection and configuration` as `chain_incomplete` with
`frontend=0` and `missingLayers=["frontend"]`. The remaining blocker is
[LUC-6911](/LUC/issues/LUC-6911), assigned to Documentation Steward ownership,
to refresh/link generated Project Truth and event-chain evidence without
overstating real-backend proof.

Fresh project truth indexes generated `2026-07-02T14:19:08.363Z` show
`totalGaps=3`, `criticalRuntimeFindings=0`, and one incomplete event chain.
The first gap is `Exchange connection and configuration` with summary
`Missing frontend layer(s) in event chain`.

`docs/status/event-chain-index.json` reports the chain as:

| Layer | Count |
| --- | ---: |
| frontend | 0 |
| backend | 2 |
| worker | 9 |
| data | 0 |
| tests | 0 |
| docs | 2 |

Root cause: this is not a runtime error. `docs/status/runtime-error-index.json`
reports `criticalFindings=0` and no findings. It is a frontend chain gap:
existing backend/API proof covers the adapter connection posture, but the
visible React configuration surface does not yet map the connector chain into
the frontend event chain.

Existing proof: [LUC-5409](/LUC/issues/LUC-5409) verified the local adapter
connection/configuration posture through `GET /v1/connection`,
`connection:read`, MCP/adapter manifests, redacted ClickUp/Google Drive
configuration readback, `npm run test:api:local`, `npm run
check:route-capabilities`, and `npm run architecture:status`. It explicitly
left browser proof for visible connection/settings surfaces as residual risk.

Frontend inspection: `web/src/features/settings/settings-routes.tsx` currently
renders account and workspace identity settings. The workspace integrations
section still shows disabled `API keys` and `Integrations` controls with a
`nextSlice` disabled reason instead of a backend-connected connector
configuration surface. `docs/ux/v1-settings-canonical-spec-2026-05-15.md`
already defines the target: settings should expose backend-supported
credentials, active state, provider scope IDs, sync mode, import mode, agent
keys, and MCP basics without sync queues, raw secret values, or provider
dashboards.

Delegated blocker: created [LUC-6905](/LUC/issues/LUC-6905), assigned to
09 CTO, because the paused Frontend Web Engineer cannot be used as the live
implementation owner. The child asks for the smallest frontend slice that
maps visible adapter connection/configuration status into signed-in settings
using existing backend contracts only:

- `GET /v1/connection`
- `GET /v1/integration-settings/clickup`
- `GET /v1/integration-settings/google_drive`

Parent disposition: [LUC-6902](/LUC/issues/LUC-6902) remains blocked by
[LUC-6905](/LUC/issues/LUC-6905). It should not claim readiness until the
frontend layer, proof, docs/index refresh, and source-control disposition are
integrated.

Validation:

- Readback of `docs/status/project-truth-index.json`,
  `docs/status/event-chain-index.json`, `docs/status/runtime-error-index.json`,
  and `docs/status/operational-readiness-index.json` completed.
- Readback of `docs/planning/luc-5409-exchange-connection-configuration-proof-ladder.md`
  completed.
- Readback of `web/src/features/settings/settings-routes.tsx` and
  `web/src/app-route-registry.ts` completed.

Source control: not committed in this TSA heartbeat because the shared Roost
workspace is already mixed dirty and `main` is ahead of `origin/main` by `132`.
Push/deploy impact: none.
