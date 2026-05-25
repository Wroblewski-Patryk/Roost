# Production Google Drive Index And Paperclip Access Audit Task Contract

## Task Type

Production data integrity and integration access audit.

## Current Stage

Verification and release.

## Deliverable For This Stage

Verify that the production Google Drive index reflects the selected Drive
folder scope, repair missing operating-area assignments, confirm Paperclip-safe
MCP/Google Drive exposure, and record residual risks without storing secrets.

## Goal

Production CompanyCore must expose the selected Google Drive folder structure
to CompanyCore tables and Paperclip-readable APIs without unassigned files,
failed sync rows, or missing MCP Google Drive tools.

## Scope

- Production API: `https://api.companycore.luckysparrow.ch`
- Production web: `https://companycore.luckysparrow.ch`
- Google Drive index routes:
  - `GET /v1/google-drive/files`
  - `PATCH /v1/google-drive/files/:id/scope`
  - `POST /v1/integration-settings/google_drive/import`
  - `POST /v1/integration-settings/google_drive/changes/reconcile`
- Paperclip/API access routes:
  - `GET /v1/mcp/manifest`
  - `GET /v1/api-keys`
  - `GET /v1/api-keys/profiles`

No raw credentials, bearer tokens, OAuth tokens, API key bodies, or passwords
may be written to repository files.

## Implementation Plan

1. Authenticate as the production owner through the protected API.
2. Read production health and Google Drive index status.
3. Assign any unassigned Drive records to the operating area of their parent
   folder when the parent has a verified operating-area assignment.
4. Run `inspect_only` import against the selected 13 Google Drive root folders.
5. If `inspect_only` reports missing records, run `merge` import and then
   repair any newly unassigned records through the same parent-scope rule.
6. Verify final Google Drive index counts, pending/failed/trashed state, and
   unassigned count.
7. Check MCP manifest exposure and Paperclip service-key scope inventory.
8. Record evidence, residual risks, and follow-up actions in canonical project
   state files.

## Acceptance Criteria

- Production `/health` endpoints return `200`.
- `/v1/google-drive/files` has `unassigned=0`, `pending=0`, `failed=0`, and
  `trashed=0`.
- Google Drive `inspect_only` reports `wouldCreateCount=0` after repair/import.
- MCP manifest exposes Google Drive read/import/reconcile/scope/write tools.
- Active Paperclip bridge keys with Google Drive read/scope/write capability
  are visible in the owner API key inventory.
- Any residual production risk is documented as a known issue or follow-up.

## Definition Of Done

- Production data repair has been applied only through existing protected
  CompanyCore APIs.
- No secrets were written to repository files.
- Canonical state files record the result.
- `git diff --check` passes for documentation changes.
- The documentation update is committed and pushed.

## Result Report

Completed on 2026-05-16.

Production health returned `200` for the API and web health endpoints. Initial
Drive readback showed `750` files, `2` unassigned records, `0` pending,
`0` failed, and `0` trashed. The two unassigned records were assigned to their
parent folder `12. Zarzadzanie` operating area through
`PATCH /v1/google-drive/files/:id/scope`.

An `inspect_only` Drive import over the selected 13 root folders reported
`itemCount=753`, `wouldCreateCount=4`, and `wouldUpdateCount=749`, proving the
production table was missing four Drive records. A `merge` import was started;
the local command timed out while the backend continued work, and a fresh API
readback confirmed the import completed with four new unassigned rows. Those
rows were assigned through parent-scope inheritance:

- `!archived` under `11. Innowacje`
- `Nest` under `11. Innowacje`
- `Diagram bez tytulu` under `Schemas`
- `companycore_organizational_architecture.xlsx` under `08. Zasoby`

Final production readback showed `754` indexed records, `0` unassigned,
`0` pending, `0` failed, and `0` trashed. A second `inspect_only` import
reported `wouldCreateCount=0`, so no selected-scope Drive records remain
missing from the production index. The scan reported `itemCount=753` while the
table holds `754` rows; this is a residual reconciliation observation, not a
missing-record blocker, because the selected Drive scan has no would-create
rows and the table has no unassigned/failed rows.

`POST /v1/integration-settings/google_drive/changes/reconcile` returned
`422 sync_failed`; production import is usable, but the Drive changes polling
path needs a targeted follow-up before it can be treated as fresh-change
automation evidence.

MCP manifest readback exposed 146 tools, including 15 Google Drive tools for
file read/content, import, reconcile, scope updates, Docs/Sheets writes, OAuth,
and settings. The active `Paperclip Tools production bridge` key includes
Google Drive read/write/scope/import/reconcile scopes. Paperclip may still miss
Drive data if its runtime is configured with an older `Paperclip production
adapter` key that has only narrow legacy scopes; raw keys cannot be recovered
from CompanyCore and must be rotated from `/settings/api` if Paperclip does not
already use the newer bridge key.

Follow-up completed on 2026-05-16: production Paperclip does not depend on the
container env fallback for this bridge. Its `company_core_settings` row stores
the CompanyCore base URL plus configured knowledge and tools keys. Runtime proof
from the Paperclip container showed knowledge-key calls to `/v1/connection`,
`/v1/mcp/manifest`, and `/v1/google-drive/files` returned `200`, and tools-key
calls to `/v1/connection` and `/v1/google-drive/files` also returned `200`.
Paperclip has 1282 CompanyCore tool assignments across 36 agents, including 12
distinct Google Drive tools. The remaining follow-up, if the owner sees a named
agent or screen missing files, is agent-level assignment or UI/filter analysis,
not global bridge-key rotation.

Validation:

- Production API/web health checks: pass.
- Production Google Drive index repair: pass.
- Google Drive selected-scope `inspect_only` after repair: pass with
  `wouldCreateCount=0`.
- MCP Google Drive manifest exposure: pass.
- `git diff --check`: passed for documentation changes.
