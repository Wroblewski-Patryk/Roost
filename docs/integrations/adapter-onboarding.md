# Adapter Onboarding

CompanyCore v1 is ready for service adapters such as Paperclip, Jarvis,
Jarvan, Aviary, n8n, and other AI agents through the HTTP API. Adapters must
use the API only; they must not connect directly to PostgreSQL or provider
tools such as ClickUp.

## Production Base URL

```text
https://api.companycore.luckysparrow.ch
```

v1 routes use `/v1/*` without an `/api` prefix because the API already has a
dedicated domain.

## Required Adapter Environment

```text
COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch
COMPANYCORE_API_KEY=cc_v1_...
```

The API key is workspace-scoped. Store it only in the adapter's secret manager
or deployment environment. Do not commit it, log it, or send it to third-party
tools.

## First Connection Check

Every adapter should start with:

```http
GET /v1/connection
X-API-Key: <workspace-service-key>
```

Expected success shape:

```json
{
  "data": {
    "service": "companycore",
    "apiVersion": "v1",
    "status": "ok",
    "auth": {
      "type": "api_key",
      "workspaceId": "uuid"
    },
    "workspace": {
      "id": "uuid",
      "name": "LuckySparrow"
    },
    "capabilities": ["tasks:read", "tasks:write", "events:read"],
    "adapterManifest": {
      "basePath": "/v1",
      "auth": {
        "serviceHeader": "X-API-Key"
      },
      "routes": {
        "tasks": [
          {
            "method": "POST",
            "path": "/v1/tasks",
            "capability": "tasks:write"
          }
        ],
        "agents": [
          {
            "method": "POST",
            "path": "/v1/agents",
            "capability": "agents:write"
          }
        ],
        "interactions": [
          {
            "method": "POST",
            "path": "/v1/interactions",
            "capability": "interactions:write"
          }
        ],
        "agentLogs": [
          {
            "method": "POST",
            "path": "/v1/agent-logs",
            "capability": "agent-logs:write"
          }
        ]
      },
      "writeRules": [
        "Do not send workspaceId in write payloads."
      ]
    },
    "integrations": {
      "clickup": {
        "configured": false,
        "active": false,
        "config": {}
      }
    }
  }
}
```

The response never includes raw API keys, owner passwords, or integration
tokens.

## Minimal Adapter Flow

1. Call `GET /v1/connection`.
2. Fail closed unless `data.status` is `ok`.
3. Confirm the expected capability is present before using a route.
4. Read `data.adapterManifest.routes` for the canonical v1 paths the adapter
   should call.
5. Write operational data through CompanyCore:
   - `POST /v1/tasks`
   - `POST /v1/notes`
   - `POST /v1/decisions`
   - `POST /v1/interactions`
   - `POST /v1/agents`
   - `POST /v1/agent-logs`
6. Read event history through `GET /v1/events`.

The manifest is intentionally small and safe to log at debug level because it
does not contain raw API keys, owner tokens, or provider secrets.

## Useful Requests

Create a task:

```http
POST /v1/tasks
X-API-Key: <workspace-service-key>
Content-Type: application/json

{
  "title": "Review Paperclip lead capture flow",
  "description": "Created by Paperclip adapter",
  "status": "todo",
  "source": "paperclip"
}
```

Register an adapter/agent identity:

```http
POST /v1/agents
X-API-Key: <workspace-service-key>
Content-Type: application/json

{
  "name": "Jarvis",
  "role": "operations_agent",
  "source": "jarvis"
}
```

Record a CRM interaction:

```http
POST /v1/interactions
X-API-Key: <workspace-service-key>
Content-Type: application/json

{
  "clientId": "uuid",
  "type": "email",
  "summary": "Paperclip captured a reply from the lead",
  "source": "paperclip"
}
```

Create a note:

```http
POST /v1/notes
X-API-Key: <workspace-service-key>
Content-Type: application/json

{
  "content": "Jarvis observed that onboarding should create one adapter key per agent.",
  "source": "jarvis"
}
```

Record an agent log:

```http
POST /v1/agent-logs
X-API-Key: <workspace-service-key>
Content-Type: application/json

{
  "level": "info",
  "message": "Paperclip adapter completed sync",
  "metadata": {
    "adapter": "paperclip",
    "operation": "sync"
  }
}
```

Read recent events:

```http
GET /v1/events
X-API-Key: <workspace-service-key>
```

## Key Creation

Owner-authenticated clients can create adapter keys:

```http
POST /v1/api-keys
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "name": "Paperclip adapter",
  "scopes": ["adapter:paperclip"]
}
```

The raw key is returned once. Store it immediately in the adapter environment.
Subsequent list responses return only metadata and `keyPrefix`.

## Adapter Guardrails

- Use `X-API-Key` for service adapters.
- Use `/v1/connection` as the first boot check.
- Treat `401`, `403`, and `422` as fail-closed startup errors.
- Never include `workspaceId` in write payloads; CompanyCore derives it from
  auth.
- Never call ClickUp directly from Paperclip/Jarvis when CompanyCore can own the
  integration.
- Never store CompanyCore API keys in prompts, notebooks, logs, or public docs.
