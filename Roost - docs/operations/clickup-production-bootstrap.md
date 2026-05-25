# ClickUp Production Bootstrap

Use this operator flow when the owner provides a real ClickUp token and the
production workspace should pull ClickUp tasks into CompanyCore.

## Scope

This is a one-time or manually repeated operator bootstrap. It does not make
ClickUp a global process secret and it does not start a background listener.
The token is submitted through the protected CompanyCore API and is stored as
encrypted workspace-owned integration settings.

## Required Secrets

Set these only for the bootstrap command:

- `COMPANYCORE_BASE_URL`: production API base URL, for example
  `https://api.companycore.luckysparrow.ch`
- `COMPANYCORE_API_KEY`: workspace-scoped CompanyCore service key
- `CLICKUP_API_TOKEN`: ClickUp token from the owner's ClickUp account
- `CLICKUP_TEAM_ID`: ClickUp team/workspace ID to sync from
- `CLICKUP_LIST_IDS`: comma-separated ClickUp list IDs
- `CLICKUP_IMPORT_MODE`: optional import policy; defaults to `merge`

Do not store raw ClickUp tokens in source control, docs, logs, or chat
transcripts. If the values are entered through Coolify, treat them as temporary
operator secrets for the bootstrap run unless a separate scheduled job is
approved.

## Import Mode

Choose the import mode before the first real pull:

- `merge`: default safe mode. Leave native CompanyCore records untouched, update
  existing ClickUp tasks, and add new ClickUp tasks.
- `skip_existing`: leave existing ClickUp tasks untouched and add only new
  ClickUp tasks.
- `replace_selected_lists`: after ClickUp fetch succeeds, delete only existing
  `source = clickup` tasks under the selected Lists and then insert the fetched
  ClickUp tasks fresh. Native/manual CompanyCore tasks are preserved.
- `inspect_only`: call ClickUp and report what would be created or updated
  without writing or deleting task records.

## Command

```bash
npm run clickup:bootstrap
```

The script performs this sequence:

1. Calls `GET /v1/connection` with `X-API-Key`.
2. Saves ClickUp settings through `PUT /v1/integration-settings/clickup`.
3. Triggers `POST /v1/tasks/sync/clickup/native`.
4. Prints only safe sync counts.

The script never prints `COMPANYCORE_API_KEY` or `CLICKUP_API_TOKEN`.

## Expected Result

Successful output confirms the workspace name and prints:

- `itemCount`
- `createdCount`
- `updatedCount`
- `skippedCount`
- `deletedCount`
- `wouldCreateCount`
- `wouldUpdateCount`

After sync, Jarvis can read the imported ClickUp tasks through CompanyCore when
the Jarvis CompanyCore connector performs its own read/sync with its dedicated
CompanyCore service key. `inspect_only` intentionally leaves Jarvis-visible
task data unchanged.

## Current Limitations

CompanyCore v1 currently supports pull-only ClickUp task sync. Setting the
token does not automatically create continuous listening. Continuous updates
need one of these approved follow-up designs:

- a scheduled Coolify/job runner command that repeats the native pull sync
- a ClickUp webhook receiver endpoint with signature validation and
  workspace-scoped event ingestion
- an external orchestrator such as n8n calling the native sync endpoint on a
  schedule

Until one of those is implemented and approved, synchronization happens only
when `npm run clickup:bootstrap` or `POST /v1/tasks/sync/clickup/native` is
called.
