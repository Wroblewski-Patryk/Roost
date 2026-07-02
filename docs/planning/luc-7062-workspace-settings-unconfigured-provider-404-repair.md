# LUC-7062 Workspace Settings Unconfigured Provider 404 Repair

## Task Contract

- Task Type: frontend bug repair
- Current Stage: verification
- Deliverable For This Stage: implemented and locally verified frontend request gating for unconfigured workspace integration providers
- Issue: [LUC-7062](/LUC/issues/LUC-7062)
- Owner Lane: 09 FEW (Frontend Web Engineer)
- Date: 2026-07-02

## Goal

Fix `/workspace/settings` so a fresh workspace with no ClickUp or Google Drive
integration rows does not create browser-visible `404 integration_not_configured`
request errors while still rendering unconfigured provider status.

## Scope

- `web/src/features/settings/settings-routes.tsx`
- Project state and confidence ledgers for this issue packet
- No backend route, schema, provider, credential, deployment, or production
  mutation scope

## Implementation Plan

1. Reuse `/v1/connection` as the safe provider summary source for unconfigured
   state.
2. Only request `/v1/integration-settings/:provider` after `/v1/connection`
   reports that provider has stored configuration or a secret.
3. Preserve the existing configured-provider detail path and UI fallback to the
   connection summary.
4. Verify with a focused web build and a browser request proof for the
   unconfigured provider state.

## Acceptance Criteria

- `/workspace/settings` renders with unconfigured ClickUp and Google Drive
  status when `/v1/connection` reports no provider configuration.
- The unconfigured state makes zero `/v1/integration-settings/clickup` or
  `/v1/integration-settings/google_drive` requests.
- The page has no console errors, page errors, failed requests, or raw provider
  error exposure in the scoped proof.
- `npm run build:web` passes.

## Result Report

- Implemented: `WorkspaceSettingsRoute` now derives provider detail fetch
  enablement from the existing `/v1/connection` integration summary. When a
  provider is unconfigured, the card renders from the connection summary and
  skips the optional detail endpoint that returns `404` by contract.
- Files changed: `web/src/features/settings/settings-routes.tsx`.
- Validation:
  - `npm run build:web` PASS.
  - Playwright static harness PASS at `http://127.0.0.1:3252/workspace/settings`
    with mocked authenticated API responses. API requests were only
    `/v1/departments`, `/v1/auth/me`, and `/v1/connection`; provider detail
    requests were `[]`; `failedRequests=[]`; `consoleIssues=[]`; visible
    workspace settings and unconfigured text were present.
- Cleanup:
  - Temporary static server on port `3252` closed.
  - Validation-owned `chrome-headless-shell` process `37052` from an early
    failed harness attempt was stopped.
  - Follow-up browser process check returned no `chrome-headless-shell` or
    `chromium` processes.
- Source control:
  - Commit not created in this heartbeat because the shared Roost worktree
    already contains unrelated dirty state/status/evidence files from other
    work.
  - Push not needed; deploy impact is local frontend-only until a future
    source-control/release lane batches the change.

## Definition Of Done Review

- Code builds without errors: verified by `npm run build:web`.
- Real UI behavior: verified through the local browser request proof for the
  exact unconfigured provider state.
- No mock-only product behavior: the implementation uses the real existing
  `/v1/connection` contract; mocks were only used in the validation harness.
- Error handling: optional unconfigured provider detail calls are avoided, so
  expected backend `404` responses no longer become browser noise.
- Documentation/state: this packet and project state ledgers updated.

## Residual Risk

- The configured-provider path was preserved but not rerun in this heartbeat;
  [LUC-7047](/LUC/issues/LUC-7047) already recorded configured-state
  desktop/tablet/mobile browser proof before this targeted repair.
