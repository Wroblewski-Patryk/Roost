# ClickUp Owner Console Deployment Plan

## Goal

Ship the v1 owner console as a humane ClickUp setup flow:

1. Owner logs in to CompanyCore.
2. Owner pastes a ClickUp personal token.
3. CompanyCore discovers ClickUp Workspaces available to that token.
4. Owner selects the ClickUp Workspace, Spaces/Folders, and Lists to sync.
5. Owner saves the connection.
6. Owner runs the first sync.
7. Jarvis, Paperclip, Aviary, and future agents read synced data through
   CompanyCore API keys.

## ClickUp API Findings

Official ClickUp documentation confirms the missing selection layer:

- Personal tokens are tied to the ClickUp user account and can access every
  Workspace the user has created or joined, limited by that user's permissions.
- `GET https://api.clickup.com/api/v2/team` returns Workspaces available to the
  authenticated token.
- ClickUp API path params still use `team_id` for Workspace ID.
- `GET /api/v2/team/{team_id}/space` returns Spaces in a Workspace.
- `GET /api/v2/space/{space_id}/folder` returns Folders in a Space.
- `GET /api/v2/folder/{folder_id}/list` returns Lists inside a Folder.
- `GET /api/v2/space/{space_id}/list` returns folderless Lists.
- `GET /api/v2/team/{team_Id}/task` can filter by `list_ids[]`, includes
  pagination from page `0`, and supports `include_closed`, `subtasks`, and
  `include_markdown_description`.
- ClickUp applies rate limits per token. Free Forever, Unlimited, and Business
  plans allow 100 requests per minute per token; Business Plus allows 1,000;
  Enterprise allows 10,000. `HTTP 429` responses include rate-limit headers.
- ClickUp webhooks are tied to the user auth token that created them. Incoming
  webhook events include an `X-Signature` HMAC SHA-256 signature generated from
  the webhook secret returned when the webhook is created.
- `POST /api/v2/team/{team_id}/webhook` creates webhooks for a Workspace and
  can target one hierarchy location such as Space, Folder, List, or task.

Sources:

- `https://help.clickup.com/hc/en-us/articles/6303422883095-Create-your-own-app-with-the-ClickUp-API`
- `https://developer.clickup.com/reference/getauthorizedteams`
- `https://developer.clickup.com/reference/getspaces`
- `https://developer.clickup.com/reference/getfolders`
- `https://developer.clickup.com/reference/getlists`
- `https://developer.clickup.com/reference/getfolderlesslists`
- `https://developer.clickup.com/reference/getfilteredteamtasks`
- `https://developer.clickup.com/docs/rate-limits`
- `https://developer.clickup.com/docs/webhooks`
- `https://developer.clickup.com/docs/webhooksignature`
- `https://developer.clickup.com/reference/createwebhook`

## Coverage Audit Against ClickUp Docs

| Area | Covered | Plan Action |
| --- | --- | --- |
| Personal token ownership | Yes | v1 uses owner-provided personal token stored as workspace integration secret. |
| OAuth Workspace authorization | Deferred | Keep as v2 decision if non-owner/external users need self-service authorization. |
| Workspace selection | Yes | Add discovery from `GET /api/v2/team` before settings save. |
| Space/Folder/List discovery | Yes | Add discovery tree using Space, Folder, folder List, and folderless List endpoints. |
| Task pull sync | Mostly | Keep filtered Workspace task endpoint and add explicit pagination validation. |
| Rate limits | Newly planned | Map `429` to safe `integration_rate_limited` or `integration_unavailable`, surface retry guidance, and avoid unbounded discovery fan-out. |
| Webhooks | Deferred with detail | Do not implement in v1 owner setup; define v1.1/v2 requirements for signed webhook ingestion. |
| Secret handling | Yes | Discovery token is not stored; save route encrypts token; responses never return token. |
| Existing saved token rediscovery | Newly planned | Owner can refresh Workspace/List discovery using the stored encrypted token without re-entering it. |
| Production smoke | Yes | Add guided UI smoke plus Jarvis readback after sync. |

## Required v1 UX

The first production-ready owner console must not require manual ID lookup.

### Login State

- Show owner email/password login.
- Persist bearer token only in `sessionStorage`.
- After login, show workspace name and ClickUp connection status.

### Token Validation State

- Owner pastes ClickUp personal token.
- Owner clicks `Check token`.
- Backend calls ClickUp using the submitted token without storing it yet.
- UI shows available ClickUp Workspaces.
- If the token fails, show a local recovery message and do not save anything.
- If ClickUp returns `429`, show a rate-limit message with retry guidance and
  do not retry in a tight loop.

### Workspace Selection State

- Owner selects one ClickUp Workspace.
- Backend discovers Spaces, Folders, folderless Lists, and folder Lists for the
  selected Workspace.
- UI shows a grouped tree:
  - Workspace
  - Space
  - Folder
  - List checkbox
  - folderless Lists under the Space

### Save State

- Owner selects one or more Lists.
- Owner toggles `Active`.
- Owner clicks `Save connection`.
- Backend encrypts and stores the token as workspace-owned integration
  settings with:
  - `teamId`
  - selected `spaceIds`
  - selected `folderIds`
  - selected `listIds`
  - `syncMode = pull`
  - safe display metadata such as selected names if useful

### Sync State

- Owner clicks `Sync now`.
- Backend runs native ClickUp pull sync.
- UI shows safe counts:
  - items fetched
  - created
  - updated
  - skipped
- UI links the result to latest sync events when available.

### Existing Connection State

- Existing token must never be returned.
- UI shows `secretConfigured = true`.
- Token field placeholder says that leaving it blank keeps the saved token.
- Owner can update selected Lists without re-entering the token.
- Owner can replace the token by entering a new one and saving.
- Owner can click `Refresh ClickUp structure` to rediscover Workspaces, Spaces,
  Folders, and Lists using the stored encrypted token. The token remains
  server-side and is not returned to the browser.

## Backend Implementation Plan

### 1. Extend ClickUp Client

Add provider client methods:

- `getAuthorizedWorkspaces()`
- `getSpaces(teamId)`
- `getFolders(spaceId)`
- `getFolderLists(folderId)`
- `getFolderlessLists(spaceId)`
- keep `getWorkspaceTasks({ teamId, listIds })`

Provider responses must be normalized into safe internal shapes before reaching
routes.

Provider client requirements:

- Accept token in the constructor so it can use either a submitted discovery
  token or the stored workspace token.
- Use ClickUp's `Authorization` header exactly as required by the ClickUp API.
- Map `401`/`403` provider responses to a safe invalid-token or unavailable
  response.
- Map `429` to a safe rate-limit response and preserve retry metadata only in
  safe logs/events.
- Never include raw provider response bodies in client-facing errors.
- Avoid unbounded discovery calls by paging deliberately and limiting fan-out.

### 2. Add Discovery Route

Add owner-protected route:

```http
POST /v1/integration-settings/clickup/discover
```

Payload:

```json
{
  "token": "clickup-personal-token",
  "teamId": "optional-clickup-workspace-id",
  "useStoredToken": false
}
```

Behavior:

- If `teamId` is omitted, return available Workspaces only.
- If `teamId` is provided, return the selected Workspace's Spaces, Folders, and
  Lists.
- If `useStoredToken` is true, load the encrypted workspace ClickUp token and
  use it for rediscovery. This is allowed only after settings already exist.
- If both `token` and `useStoredToken` are provided, the submitted token wins
  for validation/discovery and is still not stored until the save route.
- Do not store the submitted token.
- Do not return raw provider errors.
- Do not log token or raw ClickUp response bodies.
- Return a safe `integration_rate_limited` or `integration_unavailable` error
  if ClickUp rejects discovery.

Safe response shape:

```json
{
  "data": {
    "workspaces": [
      {
        "id": "123",
        "name": "LuckySparrow"
      }
    ],
    "spaces": [
      {
        "id": "456",
        "name": "Operations",
        "lists": [],
        "folders": [
          {
            "id": "789",
            "name": "Company",
            "lists": [
              {
                "id": "101112",
                "name": "Jarvis"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 3. Keep Settings Route As The Save Boundary

Continue using:

```http
PUT /v1/integration-settings/clickup
```

The route remains the only place where ClickUp token material is encrypted and
stored.

### 4. Improve Native Sync Pagination

`GET /api/v2/team/{team_Id}/task` is limited to 100 tasks per page. The native
sync must page from `page=0` until an empty or short page is returned, while
keeping the current idempotent upsert rule:

```text
(workspace_id, source = clickup, external_id)
```

The current code already pages with a `maxPages` guard. CCV1-031 must verify
this behavior against the ClickUp docs, make the guard explicit in docs/tests,
and confirm the sync result reports the full fetched count within the approved
page limit. If production needs more than the configured max page count, create
a follow-up instead of silently truncating.

### 5. Future Continuous Updates

Do not implement continuous updates in this same task. After first production
pull succeeds, choose one follow-up:

- scheduled pull sync in Coolify
- ClickUp webhook receiver with signature validation and workspace mapping
- n8n calling `POST /v1/tasks/sync/clickup/native`

Recommended v1.1 default: scheduled pull sync first, webhook later when event
volume and required freshness justify it.

Webhook follow-up requirements if chosen later:

- Create webhooks with `POST /api/v2/team/{team_id}/webhook`.
- Store webhook IDs and webhook secrets as workspace-owned integration state.
- Verify incoming `X-Signature` HMAC SHA-256 before trusting payloads.
- Use `webhook_id:history_item_id` as the event idempotency key when present.
- Do not rely on ClickUp source IP allowlisting because ClickUp does not expose
  dedicated webhook IPs.
- Treat user-token ownership as operational risk: if the ClickUp user is
  disabled or loses hierarchy access, webhook delivery can stop.

## Frontend Implementation Plan

Update the minimal owner console from manual ID entry to a guided setup:

1. Login panel.
2. ClickUp token panel with `Check token`.
3. Workspace select.
4. Space/folder/list checklist.
5. Save connection.
6. Sync now.
7. Safe status/result area.

Expected states:

- loading token validation
- invalid token
- rate limited by ClickUp
- no Workspaces available
- selected Workspace loading
- no Lists available
- settings saved
- sync success
- sync failed

Responsive expectations:

- desktop: two-column setup with list tree on the right
- tablet: stacked panels
- mobile: single-column controls, larger hit targets, no horizontal overflow

Accessibility expectations:

- labels for all inputs/selects
- field-level error messages
- keyboard-selectable checkbox tree
- visible focus state
- no token rendered back into DOM after save

## Deployment Plan

### Pre-Deploy Checks

- `npm run build`
- `npm test` with disposable PostgreSQL if integration routes/tests change
- local smoke:
  - `GET /`
  - owner login
  - invalid token discovery fails safely
  - valid token discovery returns Workspaces
  - selected Workspace returns Lists
  - save settings redacts token
  - native sync creates/updates tasks

### Production Smoke

1. Deploy to Coolify.
2. Open `https://api.companycore.luckysparrow.ch/`.
3. Log in as owner.
4. Paste ClickUp personal token.
5. Discover and select ClickUp Workspace.
6. Select Lists.
7. Save connection.
8. Run `Sync now`.
9. Verify task count in UI.
10. Verify Jarvis reads synced tasks through CompanyCore after CCV1-028 deploy.

### Rollback

- If the owner console fails but API remains healthy, redeploy previous commit.
- If settings save wrote wrong list config, update settings through the UI or
  `PUT /v1/integration-settings/clickup`.
- Preserve PostgreSQL volume.

## Task Split

Execute these tasks strictly one by one. Do not deploy the owner console before
the backend discovery API is implemented and verified, because the intended v1
flow must not require manual ClickUp ID lookup.

### CCV1-031 ClickUp Discovery Backend

Order: 1.

- Add client methods for Workspaces, Spaces, Folders, Lists.
- Add `POST /v1/integration-settings/clickup/discover`.
- Support both submitted token discovery and stored-token rediscovery.
- Add safe provider error mapping for invalid token, provider unavailable, and
  rate-limited responses.
- Add tests for invalid token safe failure, rate-limit handling, stored-token
  rediscovery, and valid mocked discovery shapes.
- Verify and document task pagination behavior.

### CCV1-032 Guided Owner Console

Order: 2.

- Replace manual `teamId/listIds` entry with discovery-driven selection.
- Keep advanced/manual fields hidden or removed from the primary flow.
- Add loading, empty, error, saved, and synced UI states.
- Run desktop/tablet/mobile checks.

### CCV1-033 Production Deploy And Smoke

Order: 3.

- Deploy backend + owner console.
- Run production owner setup.
- Run native sync.
- Verify Jarvis/Paperclip/Aviary can read CompanyCore data with their service
  API keys after their app-side connectors are active.

### CCV1-034 Continuous ClickUp Update Decision

Order: 4.

- Decide scheduled pull sync vs ClickUp webhook ingestion.
- If scheduler is selected, define interval, max pages, failure events, and
  Coolify execution path.
- If webhook is selected, define endpoint, signature verification, webhook
  state storage, idempotency, retry behavior, and rollback.

## Execution Queue

| Order | Task | Stage | Exit Criteria |
| --- | --- | --- | --- |
| 1 | CCV1-031 ClickUp Discovery Backend | implementation | Backend can validate/discover ClickUp Workspaces and Lists through safe CompanyCore API routes, with tests for invalid token, rate limit, stored-token rediscovery, and pagination. |
| 2 | CCV1-032 Guided Owner Console | implementation | Owner can log in, check token, choose Workspace and Lists, save settings, refresh saved structure, and sync from the UI across desktop/tablet/mobile. |
| 3 | CCV1-033 Production Deploy And Smoke | release | Production owner setup succeeds, ClickUp tasks sync into CompanyCore, and Jarvis/Paperclip/Aviary service API readback is verified. |
| 4 | CCV1-034 Continuous ClickUp Update Decision | planning | A single approved update strategy exists: scheduled pull, signed webhook ingestion, or external orchestration, with rollback and risk notes. |

Recommended execution discipline:

- Complete and verify one task before starting the next.
- Keep each task as a small commit.
- Do not mark CCV1-033 done until production smoke includes real ClickUp data.
- Do not begin CCV1-034 implementation until the first production pull has
  evidence.

## Open Decisions

- Whether v1.1 continuous updates use scheduled pull sync or ClickUp webhooks.
- Whether OAuth should replace personal tokens in v2 if external users beyond
  the owner are added.
