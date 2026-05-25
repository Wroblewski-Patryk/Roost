# Jarvis CompanyCore Update Runbook

This runbook explains how to update the production OpenJarvis application so
Jarvis can use CompanyCore as a Data Source and chat context provider.

## Purpose

Jarvis should be able to answer company-memory questions from CompanyCore,
including Paperclip onboarding records, decisions, tasks, notes, agents, and
events. CompanyCore remains the source of truth. OpenJarvis reads it through
the authenticated CompanyCore HTTP API.

## Source Files

The OpenJarvis runtime change lives in the OpenJarvis repository, not in this
CompanyCore repository:

- `src/openjarvis/connectors/companycore.py`
- `src/openjarvis/server/companycore_context.py`
- `src/openjarvis/connectors/__init__.py`
- `src/openjarvis/server/connectors_router.py`
- `src/openjarvis/server/routes.py`
- `tests/connectors/test_companycore.py`
- `tests/server/test_companycore_context.py`

CompanyCore tracks the deployment state and evidence here:

- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/operations/post-deploy-smoke.md`

## Required Runtime Environment

Production Jarvis must have these environment variables:

- `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch`
- `COMPANYCORE_API_KEY=<Jarvis workspace service API key>`
- `COMPANYCORE_ADAPTER_SOURCE=jarvis`

Optional:

- `COMPANYCORE_SYNC_EVENTS=1` only when Jarvis should index CompanyCore audit
  events as knowledge. Leave it unset for ordinary business context so Jarvis
  indexes projects, task lists, tasks, clients, deals, interactions, notes,
  decisions, and agents without turning repeated sync audit events into
  ordinary answer context.

Do not commit or document raw service API keys. CompanyCore raw keys are
one-time secret material and should only be stored in the target runtime
environment.

## Local Validation

Run the targeted OpenJarvis tests before deploying:

```powershell
cd C:\Personal\Projekty\Aplikacje\OpenJarvis
.\.venv\Scripts\python -m pytest tests\connectors\test_companycore.py tests\server\test_companycore_context.py -q
```

Expected result:

```text
4 passed
```

Also run syntax validation for the touched server files when doing a narrow
hotfix:

```powershell
cd C:\Personal\Projekty\Aplikacje\OpenJarvis
.\.venv\Scripts\python -m py_compile `
  src\openjarvis\connectors\companycore.py `
  src\openjarvis\server\companycore_context.py `
  src\openjarvis\server\routes.py `
  src\openjarvis\server\connectors_router.py
```

## Production Deployment Path

The current production app is a Docker Compose deployment on the VPS.

- SSH host alias: `codex-vps`
- Source checkout: `/home/codex/apps/openjarvis`
- Compose app: `/home/codex/apps/openjarvis-prod`
- Jarvis container: `openjarvis-prod-jarvis-1`
- Public URL: `https://jarvis.luckysparrow.ch`

Deploy from the VPS:

```bash
ssh codex-vps
cd /home/codex/apps/openjarvis-prod
docker compose up -d --build jarvis
```

Check container status and recent logs:

```bash
docker ps --filter name=openjarvis-prod-jarvis-1
docker logs --tail 120 openjarvis-prod-jarvis-1
```

Expected result:

- container is `Up`
- server starts with `Engine: cloud`
- Uvicorn listens on `0.0.0.0:8000`

## Connector Smoke

Login to production Jarvis and keep the cookie in a temporary file:

```powershell
$cookie = Join-Path $env:TEMP "jarvis-cookies-codex.txt"
$body = Join-Path $env:TEMP "jarvis-login.json"
Set-Content -LiteralPath $body `
  -Value '{"username":"jarvis","password":"<runtime password>"}' `
  -Encoding ASCII
curl.exe -sk -c $cookie -H "Content-Type: application/json" `
  --data-binary "@$body" `
  "https://jarvis.luckysparrow.ch/auth/login"
Remove-Item $body -Force
```

Verify the connector:

```powershell
curl.exe -sk -b $cookie "https://jarvis.luckysparrow.ch/v1/connectors/companycore"
```

Expected result:

```json
{
  "connector_id": "companycore",
  "display_name": "CompanyCore",
  "auth_type": "bridge",
  "connected": true
}
```

Trigger a sync:

```powershell
curl.exe -sk -b $cookie -X POST "https://jarvis.luckysparrow.ch/v1/connectors/companycore/sync"
```

Then list connectors and confirm that `companycore` has indexed chunks:

```powershell
curl.exe -sk -b $cookie "https://jarvis.luckysparrow.ch/v1/connectors"
```

Expected result:

- `companycore.connected` is `true`
- `companycore.chunks` is greater than `0`

## Chat Smoke

Ask Jarvis a question that requires CompanyCore records:

```powershell
$body = Join-Path $env:TEMP "jarvis-chat-companycore.json"
@'
{
  "model": "default",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": "Na podstawie CompanyCore powiedz, co wiesz o projekcie Paperclip AI onboarding to CompanyCore. Wymien decyzje, dwa zadania i agenta."
    }
  ]
}
'@ | Set-Content -LiteralPath $body -Encoding UTF8

curl.exe -sk -b $cookie -H "Content-Type: application/json" `
  --data-binary "@$body" `
  "https://jarvis.luckysparrow.ch/v1/chat/completions"

Remove-Item $body -Force
```

The answer should mention:

- project `Paperclip AI onboarding to CompanyCore`
- decision `Use CompanyCore API as the agent source of truth`
- task `Teach Jarvis to summarize CompanyCore records`
- task `Reuse the same CompanyCore adapter path in Paperclip`
- agent `Jarvis production chat adapter`

The CompanyCore context injector filters smoke/test records from ordinary
business prompts unless the user explicitly asks about smoke or tests. If smoke
records dominate this answer again, treat it as a Jarvis answer precision
regression.

Do not mark the task done until this chat smoke passes.

## Common Failure Modes

### Connector is missing

If `/v1/connectors/companycore` returns `404`, the production image does not
include the OpenJarvis connector registration. Verify:

- `src/openjarvis/connectors/companycore.py` exists in the source checkout
- `src/openjarvis/connectors/__init__.py` imports `openjarvis.connectors.companycore`
- the Jarvis image was rebuilt, not only restarted

### Connector is disconnected

If `connected=false`, verify runtime env in the container:

```bash
docker exec openjarvis-prod-jarvis-1 printenv | grep COMPANYCORE
```

The connector must call CompanyCore with `X-API-Key`, not `Authorization:
Bearer`. A `401 invalid_auth_token` usually means the wrong auth header was
used or the service key is invalid for this workspace.

### Sync succeeds but chat does not answer from CompanyCore

Confirm that the chat context injector is deployed:

- `src/openjarvis/server/routes.py` imports
  `maybe_inject_companycore_context`
- the chat route calls `maybe_inject_companycore_context(request_body)` before
  model execution
- the user prompt contains a CompanyCore-related keyword such as
  `CompanyCore`, `Paperclip`, `projekt`, `zadanie`, `decyzja`, or `agent`

## Documentation Updates After Deployment

After a successful update, refresh these files:

- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/operations/post-deploy-smoke.md` when new smoke evidence is material

Record only key prefixes or IDs when needed. Never record raw API keys,
session cookies, database passwords, or login passwords.
