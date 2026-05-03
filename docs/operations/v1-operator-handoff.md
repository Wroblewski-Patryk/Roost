# CompanyCore V1 Operator Handoff

Last updated: 2026-05-03

## Verdict

CompanyCore v1 is deployed, live, smoke tested, and accepted for the approved
runtime scope.

The system is ready for normal owner usage and for Jarvis/Paperclip to consume
CompanyCore as the company operational source of truth.

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

- CompanyCore backend container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026`
- CompanyCore backend image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:9116026`
- CompanyCore source evidence:
  - Runtime image built from v1 runtime commit `9116026`.
  - Documentation/source-of-truth `main` is at or after `3b428b2`.
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

- Current rollback pointer:
  `rnqqkhl3o3dut4qv56mlxly2_backend:ae2c3bf`.
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
