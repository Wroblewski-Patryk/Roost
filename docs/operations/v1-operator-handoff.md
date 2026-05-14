# CompanyCore V1 Operator Handoff

Last updated: 2026-05-14

## Verdict

CompanyCore v1 is deployed, live, smoke tested, and accepted for the approved
runtime scope.

The system is ready for normal owner usage and for Jarvis/Paperclip to consume
CompanyCore as the company operational source of truth.

The local architecture-derived V1 evidence set is complete as of 2026-05-11.
See `docs/operations/v1-achievement-and-blocker-handoff.md` for the concise
achievement boundary and external blocker list.

## Runtime Scope Accepted

- Owner setup and workspace-scoped API.
- Workspace service API keys for agents and adapters.
- ClickUp first-run import with explicit import policy.
- ClickUp signed webhook ingestion.
- ClickUp scheduled non-destructive maintenance.
- CompanyCore to ClickUp task and note write-back.
- ClickUp task comments into CompanyCore notes.
- ClickUp provider-event retry and health visibility.
- ClickUp-shaped operating model registry for workspaces, operating areas,
  folders, tables, provider mappings, custom fields, views, storage locations,
  knowledge roots, and automation definitions.
- Jarvis CompanyCore connector and chat context.
- Paperclip CompanyCore agent-event adapter.
- Clean sync data hygiene: no duplicate ClickUp tasks and no repeated sync
  event noise from unchanged pulls.

## Production Endpoints

- Web console: `https://companycore.luckysparrow.ch/`
- API: `https://api.companycore.luckysparrow.ch/`
- Health: `https://api.companycore.luckysparrow.ch/health`
- V1 health: `https://api.companycore.luckysparrow.ch/v1/health`
- Jarvis: `https://jarvis.luckysparrow.ch/`
- Paperclip: `https://paperclip.luckysparrow.ch/`

## Current Runtime

- CompanyCore public health currently reports backend image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:c5878d95a47f17745f65689c08e9e317a6465777`
- CompanyCore source evidence:
  - Public `/health` reports build commit
    `c5878d95a47f17745f65689c08e9e317a6465777`.
  - Documentation/source-of-truth `main` is at or after the accepted v1 runtime
    scope and includes later v2 web-console polish.
- Container inventory:
  - Running backend:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c5878d9`.
  - Rollback container retained stopped:
    `backend-rnqqkhl3o3dut4qv56mlxly2-025605103087-previous-c5878d9`.
- Database:
  - Production Postgres container remains running and healthy.
  - Production Postgres volume must be preserved on deploy and rollback.

## Latest Smoke Summary

- CompanyCore health returned `200`.
- CompanyCore v1 health returned `200`.
- CompanyCore web root returned `200`.
- CompanyCore API metadata returned `200`.
- Protected CompanyCore `/v1/connection` returned `200`.
- ClickUp maintenance `inspect_only` returned 219 items, 0 created, 0 updated,
  0 deleted, 219 skipped, and 0 failed retries.
- Paperclip health returned `200`.
- Jarvis health returned `200`.
- Jarvis CompanyCore connector returned `connected=true`, `auth_type=bridge`,
  and 259 CompanyCore chunks.
- CompanyCore Paperclip agent-event queue had 0 pending events.
- Agent CRUD production smoke returned 51 capabilities, verified
  `/v1/connection` manifest routes, created/deleted a user-created operating
  area, created/read/updated/archived a note, and confirmed Paperclip
  agent-event reads.
- 2026-05-08 public smoke returned `200` for CompanyCore `/health`,
  `/v1/health`, and the web root; `/health` reported build/image
  `71f3eb3b063ea68226a1736c727c52882b33f27a`.
- 2026-05-14 AGRUN-007 production smoke returned `200` for `/health`,
  `/v1/health`, and `/settings/drive`; protected `google-drive:smoke` passed
  with OAuth active; owner folder discovery returned 172 folders and
  `selectedFolderCount=0`, leaving first import blocked on owner folder-root
  selection.
- 2026-05-08 public `app.js` marker check confirmed typed editor surfaces for
  Notes, Projects, Clients, Task Lists, and Tasks.
- 2026-05-11 public no-secret smoke returned `200` for CompanyCore `/health`,
  CompanyCore `/v1/health`, CompanyCore web root, Paperclip `/api/health`, and
  Jarvis `/health`.

## Data State

- CompanyCore retained 219 ClickUp tasks.
- Duplicate ClickUp task external IDs: 0.
- Smoke/test records were removed from CompanyCore production data.
- Redundant `task_synced_from_clickup` events were pruned, preserving one
  latest sync event per ClickUp task.
- Jarvis CompanyCore index was rebuilt with CompanyCore event indexing disabled
  by default.

## Operator Checks

Run after any deploy, credential rotation, or provider incident:

```bash
curl -fsS https://api.companycore.luckysparrow.ch/health
curl -fsS https://api.companycore.luckysparrow.ch/v1/health
curl -fsS https://companycore.luckysparrow.ch/
curl -fsS https://paperclip.luckysparrow.ch/api/health
curl -fsS https://jarvis.luckysparrow.ch/health
```

Run protected checks with service credentials stored in the target service
environment. Do not print raw API keys in terminals, logs, docs, or chat.

## Rollback

- Current rollback guidance:
  - Preserve the production Postgres volume.
  - Prefer the previous known-good backend image/container recorded in
    `docs/operations/rollback-and-recovery.md` after refreshing VPS inventory.
  - If inventory cannot be refreshed, use public `/health` build metadata,
    Coolify deployment history, and the latest post-deploy smoke evidence to
    identify the previous known-good image before changing traffic.
- Preserve the production Postgres volume.
- Roll back the backend image/container first.
- Restore database backup only for confirmed data corruption.
- After rollback, rerun public health, protected connection, ClickUp
  maintenance, Jarvis connector, and Paperclip health checks.

## Residual Non-Runtime Blockers

- GitHub-to-Coolify auto-deploy:
  - GitHub repository visibility shows admin permission for
    `Wroblewski-Patryk/companycore`.
  - Available GitHub connector tools do not expose repository webhook
    administration.
  - Local `gh` CLI is not installed.
  - Manual rollover remains the approved v1 release path.
- Paperclip upstream source merge:
  - Adapter commit `4cfa476f` is validated.
  - Branch push to `paperclipai/paperclip` failed with GitHub `403`.
  - Managed patch remains in
    `integrations/paperclip/companycore-adapter.patch`.
- OpenJarvis upstream source merge:
  - CompanyCore connector change is validated on a clean current upstream base.
  - Branch push to `open-jarvis/OpenJarvis` failed with GitHub `403`.

## Next Product Decision

The next engineering move is not more v1 runtime hardening. Choose one:

- v2 company operations dashboard scope.
- upstream/fork route for OpenJarvis and Paperclip handoff.
- GitHub/Coolify auto-deploy tooling and credentials.
- next provider or knowledge-root integration.
