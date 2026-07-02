# LUC-6154 QA Proof Selection For Highest-Risk Missing Test Links

Date: 2026-06-29
Issue: [LUC-6154](/LUC/issues/LUC-6154)
Parent: [LUC-6151](/LUC/issues/LUC-6151)
Task Type: QA verification
Current Stage: verification
Status: VERIFIED_DONE_NO_COMMIT

## Task Contract

- Goal: select the smallest high-risk QA proof target from the refreshed
  Roost app-completion missing-test-link snapshot after
  [LUC-6151](/LUC/issues/LUC-6151), without converting aggregate scanner debt
  into broad implementation work.
- Scope: `docs/status/app-completion-index.json`,
  `docs/status/app-completion-index.md`, `src/tests/api.test.ts`,
  `src/modules/integration-settings/integration-settings.routes.ts`,
  `src/integrations/google-drive/google-drive.auth.ts`, and related prior
  proof packets.
- Implementation Plan: read the current app-completion snapshot, classify the
  highest-risk Account access / User configuration / Dashboard overview rows,
  exclude already-proven duplicate auth and Strategy targets, map one concrete
  route family to existing local proof, and record whether a new child repair
  is warranted.
- Acceptance Criteria: selected flow, routes/files, command or proof source,
  result, residual risk, and next owner are recorded; no protected smoke,
  provider mutation, production account mutation, deploy, restart, push, or
  secret disclosure occurs.
- Definition of Done: proof selection is durable, source-of-truth state is
  updated, and the issue has a clear disposition.

## Snapshot

Current source: `docs/status/app-completion-index.json`, generated
`2026-06-29T01:46:49.162Z`.

| Metric | Value |
| --- | --- |
| Items | `373` |
| User flows | `7` |
| Missing test links | `362` |
| Missing doc links | `0` |
| Blocked records | `0` |
| Browser/screenshot review records | `0` |

## Selected Proof Target

Selected flow: `Account access` with `User configuration` overlap.

Selected route family:

- `POST /v1/integration-settings/google_drive/oauth/authorize-url`
- `POST /v1/integration-settings/google_drive/oauth/exchange`
- adjacent Google Drive integration settings read/write, folder discovery,
  import, changes reconciliation, and OAuth refresh behavior

Selected files:

- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/integrations/google-drive/google-drive.auth.ts`
- `src/integrations/integration-settings.service.ts`
- `src/tests/api.test.ts`
- generated architecture nodes:
  `docs/architecture/nodes/generated/API-AUTO-0144.md` and
  `docs/architecture/nodes/generated/API-AUTO-0145.md`

## Candidate Classification

| Flow | Current signal | QA decision |
| --- | --- | --- |
| Account access | `90` missing test links and `2` implemented-needs-proof rows | Select Google Drive OAuth/configuration because it combines auth and configuration gates and is more concrete than generic auth helper rows. |
| User configuration | `60` missing test links and `1` implemented-needs-proof row | Covered by the same integration-settings proof family; no separate broad configuration lane. |
| Dashboard overview | `13` missing test links | Not selected because current records are lower-risk route/linkage debt and prior dashboard proof packets exist. |

## Evidence Mapping

The existing named API test `CompanyCore v1 protected API flow` in
`src/tests/api.test.ts` already covers the selected route family. This
heartbeat did not rerun the full test because [LUC-6118](/LUC/issues/LUC-6118)
and [LUC-6145](/LUC/issues/LUC-6145) already executed the same named flow
against disposable PostgreSQL earlier on 2026-06-29, and this issue is a proof
selection/classification task rather than a new product change.

Current source readback found the following coverage inside the named flow:

| Area | Existing assertion evidence |
| --- | --- |
| Google Drive settings redaction | `PUT /integration-settings/google_drive` stores workspace OAuth material and the API response exposes status booleans rather than raw OAuth fields. |
| OAuth authorize URL | `POST /v1/integration-settings/google_drive/oauth/authorize-url` returns a Google authorization URL with expected client id, offline access, granted scopes, Drive scopes, and redirect state. |
| Service-key denial | A service API key cannot create a Google Drive OAuth authorization URL; expected status is `403`. |
| OAuth repair path | Invalid stored Google Drive OAuth ciphertext can be repaired through owner authorize-url and mocked token exchange. |
| OAuth exchange | `POST /v1/integration-settings/google_drive/oauth/exchange` persists mocked Google OAuth tokens and marks `oauthTokenConfigured=true`. |
| Folder discovery/import | Owner-authenticated folder discovery excludes non-folder Drive files; inspect-only import reports would-create counts without writing. |
| Changes reconcile | Google Drive changes reconciliation processes mocked changed/removed files and advances the start page token. |
| Token refresh | Expired OAuth settings trigger a mocked refresh during import and persist the refreshed access token. |

## Verification Performed In This Heartbeat

| Check | Result | Evidence |
| --- | --- | --- |
| Paperclip issue context | PASS | Heartbeat context confirmed [LUC-6154](/LUC/issues/LUC-6154) expects one narrow Account access / User configuration / Dashboard overview target after [LUC-6151](/LUC/issues/LUC-6151). |
| App-completion readback | PASS | `docs/status/app-completion-index.json` reports `373` items / `362` missing test links / `0` missing doc links / `0` blocked, generated `2026-06-29T01:46:49.162Z`. |
| Route-like queue extraction | PASS | Local Node readback found route-like missing-test rows by flow: Account access `61`, Dashboard overview `3`, Trading operation `3`, Unclassified user workflow `38`. |
| Source proof mapping | PASS | `Select-String` readback in `src/tests/api.test.ts` confirmed assertions for Google Drive OAuth authorize URL, service-key denial, OAuth exchange, import, changes reconcile, and token refresh. |
| Route implementation readback | PASS | `src/modules/integration-settings/integration-settings.routes.ts` enforces owner-only OAuth authorize/exchange routes and delegates to Google Drive auth helpers. |

## Result Report

Status: `VERIFIED_DONE_NO_COMMIT`.

The selected highest-risk current missing-test-link target is the Google Drive
OAuth/configuration route family inside the `Account access` and
`User configuration` gates. It is already covered by the existing named
`CompanyCore v1 protected API flow`, which was locally proven earlier on
2026-06-29 by [LUC-6118](/LUC/issues/LUC-6118) and [LUC-6145](/LUC/issues/LUC-6145)
against disposable PostgreSQL. No new backend/frontend/security/Ops repair
child is warranted from [LUC-6154](/LUC/issues/LUC-6154).

Residual risk: aggregate app-completion missing-test-link debt remains scanner
or proof-link confidence debt. Production OAuth/provider smoke, live Google
account mutation, and protected credential proof remain separate Ops/Security
release gates and were intentionally not run here.

Files changed by this issue: this evidence packet and source-of-truth state
updates only.

Source-control status: not committed. The Roost workspace is a shared
mixed-dirty worktree and already contains unrelated changes and a branch ahead
of origin. This heartbeat did not stage, revert, commit, push, deploy, restart,
or mutate provider state.
