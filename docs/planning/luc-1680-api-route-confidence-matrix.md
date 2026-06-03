# LUC-1680 API Route Confidence Matrix

Status: DONE
Task Type: read-only audit / planning
Current Stage: verification
Deliverable For This Stage: API route/capability confidence matrix from the refreshed architecture baseline.
Last updated: 2026-06-03

## Goal

Create a route/capability confidence matrix for the highest-risk Roost API groups from the refreshed architecture baseline, without code changes, deploy work, protected smoke, production mutation, or secret access.

## Scope

- Architecture baseline: `docs/graphs/architecture-awareness.json`, `docs/status/task-synchronization-report.md`.
- Runtime mounting and route sources: `src/app.ts`, `src/modules/**`, `src/auth/**`, `src/mcp/**`.
- Current API proof surface: `src/tests/api.test.ts`.
- Output artifacts: this planning packet plus source-of-truth pointers in project state files.

## Implementation Plan

1. Inspect generated architecture API endpoint entities and task synchronization report.
2. Inventory Express route mounting and module route files.
3. Compare highest-risk route groups against capability manifest, MCP manifest exposure, and `src/tests/api.test.ts` request evidence.
4. Classify each group using the project evidence language.
5. Record smallest next verification or repair lane per gap.

## Acceptance Criteria

- Exact route groups, capabilities, architecture entity IDs where practical, existing proof, gaps, and next proof lanes are recorded.
- The matrix separates local route/test confidence from blocked production/protected-smoke confidence.
- No runtime code, schema, deploy, protected smoke, production mutation, or secret access is performed.
- Source-of-truth state files point to this packet.

## Baseline Signals

| Signal | Evidence | Status |
| --- | --- | --- |
| Generated API endpoint entities | `docs/graphs/architecture-awareness.json` has `57` `api_endpoint` entities. | present in code, behavior unknown |
| Task architecture links | `docs/status/task-synchronization-report.md` reports `Tasks without architecture links: 0`. | verified |
| Task-link gap | `docs/status/task-synchronization-report.md` reports `Implementation entities without task links: 440`; API endpoint examples include `src/app.ts` route mounts and `.tmp/web-qa-*` mock routes. | implemented but not verified |
| Verified-without-proof gap | `docs/status/task-synchronization-report.md` reports `Verified entities without proof evidence: 0`. | verified |
| Mounted route files | Source inventory found `38` `src/modules/**/*.routes.ts` files. | present in code, behavior unknown |
| Capability manifest | `src/auth/capabilities.ts` contains `179` manifest route entries. | present in code, behavior unknown |
| Test surface | `src/tests/api.test.ts` contains the single broad API integration flow and references `189` unique `/auth` or `/v1` request path shapes by static extraction. | implemented but not verified |

## Architecture Endpoint Baseline

The refreshed architecture baseline currently tracks API endpoints mostly as Express mount entities, not every nested handler. Practical entity IDs for the high-risk API groups are:

| Group | Architecture entity examples |
| --- | --- |
| App root and v1 mount | `api_endpoint:get:1998daec82`, `api_endpoint:use-v1:347b48829` |
| Auth and health | `api_endpoint:use-auth:d272d61067`, `api_endpoint:use-v1-auth:02d088cd05`, `api_endpoint:use-health:8aa829ec00`, `api_endpoint:use-v1-health:145d12bca3` |
| MCP and connection | `api_endpoint:use-mcp:3055a10566`, `api_endpoint:use-connection:b52b509477` |
| Company OS | `api_endpoint:use-company-os:fb1b853293` |
| Operations | `api_endpoint:use-operations:f4ce71f687` |
| Assets and Google Drive | `api_endpoint:use-assets:ac41eec16d`, `api_endpoint:use-google-drive:2b5bd7ccd8` |
| Operating graph/model | `api_endpoint:use-operating-graph:90c17b9387`, `api_endpoint:use-operating-model:dcc5e71b5f` |
| Intake/commercial/finance/sales/strategy/relationships | `api_endpoint:use-intake:3c22276373`, `api_endpoint:use-commercial-exceptions:18765c44f9`, `api_endpoint:use-finance:b8821dee32`, `api_endpoint:use-sales:0c7ec2cf8b`, `api_endpoint:use-strategy:0ead398998`, `api_endpoint:use-relationships:acd9b6327c` |
| Workspaces/workforce/departments | `api_endpoint:use-workspaces:8d243549bd`, `api_endpoint:use-workforce:a03aa869cd`, `api_endpoint:use-departments:876f72fd71` |
| Core record CRUD | `api_endpoint:use-projects:2ab7f26357`, `api_endpoint:use-goals:da30547c55`, `api_endpoint:use-targets:7ea27c60ae`, `api_endpoint:use-task-lists:7770c51ee4`, `api_endpoint:use-tasks:de5ac00ee8`, `api_endpoint:use-clients:da4494ab5d`, `api_endpoint:use-deals:2ceaef3b27`, `api_endpoint:use-interactions:eb228af9f5`, `api_endpoint:use-notes:c833b4443f`, `api_endpoint:use-decisions:b29cd45684`, `api_endpoint:use-agents:1c136317c6`, `api_endpoint:use-agent-logs:fe1d6cbaa9`, `api_endpoint:use-agent-events:1b4c65ace9` |
| Integration settings and ClickUp webhook | `api_endpoint:use-integration-settings:7da089bd2f`, `api_endpoint:use-v1-webhooks-clickup:61d965c5ad` |

## Confidence Matrix

| API group | Routes / capability surface | Current status | Existing proof | Gaps | Smallest next lane |
| --- | --- | --- | --- | --- | --- |
| Auth, workspace bootstrap, and health | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `/v1/auth/*`, `GET /health`, `GET /v1/health` | verified | `src/tests/api.test.ts` covers registration/login/me and health; `src/app.ts` mounts auth before protected API middleware. | Production protected key smoke remains separate from auth route mechanics. | Keep auth covered by existing API gate; no new lane unless auth behavior changes. |
| API key auth, capability lookup, and MCP manifest | `GET /v1/mcp/manifest`, `GET/POST/PATCH /v1/api-keys`, `capabilityForRequest`, `createMcpManifest` | verified | `src/auth/capabilities.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts` assert manifest exposure for high-risk tools and scoped denial cases. | Architecture baseline tracks mount points, not all `179` manifest route entries. | Route/capability architecture-link cleanup lane: map manifest entries into architecture task links or document why mount-level tracking is intentional. |
| Company OS command routes | `/v1/company-os`, `/:collection`, approvals, pipeline/stage run commands, workflow-definition drafts, archive, rollback draft, automation evaluate | verified | `src/tests/api.test.ts` exercises approvals, stage lifecycle, workflow draft/activation/archive/rollback, automation dry-run/execute, read-only denials, cross-workspace denial, and MCP manifest checks. | High complexity; generic `/:collection` route can shadow specific routes if ordering regresses. | Add a focused route-order regression check for specific Company OS routes before generic collection routes if route-capability script does not already assert ordering. |
| Operations | `GET /v1/operations/context`, `GET/POST/PATCH /v1/operations/work-items`, `PATCH /v1/operations/task-lists/:id` | verified | `src/tests/api.test.ts` covers unauthenticated denial, context packet, work-item create/update, task-list update, relation visibility, foreign workspace denial, and MCP manifest exposure. | Full production route smoke remains gated by protected runtime key. | After runtime key repair, include Operations context/work-items in the same protected deploy smoke packet or a QA child lane. |
| Assets context and folder commands | `GET /v1/assets/context`, `GET /v1/assets/files/:id/preview`, `PATCH /v1/assets/folders/:id` | verified | `src/tests/api.test.ts` covers context, refresh, low-limit regression, folder reassignment, orphan/cycle/root guards, foreign workspace denial, and MCP manifest exposure. | `GET /v1/assets/files/:id/preview` is capability-listed but not clearly visible in the static request extraction from the API test. | Add or confirm explicit preview-route API assertion, especially auth and workspace visibility, before relying on it for production image previews. |
| Google Drive provider routes | files/content/scope/description/text-content, docs create/update, sheets create/update, OAuth/import/change routes through integration settings | implemented but not verified | `src/tests/api.test.ts` covers many local adapter paths and OAuth repair/refresh behavior; production Google Drive smoke previously exists in project history. | Provider behavior depends on external credentials and production-safe smoke. Protected runtime key gate is currently blocked in `LUC-261`; live Drive writes require explicit scope and credential evidence. | Provider-safe verification lane: rerun local API gate plus a non-mutating production Drive read smoke after runtime key repair; keep writes behind explicit Ops/Security approval. |
| Intake and route proposals | `GET /v1/intake`, `GET /v1/intake/route-proposals`, `POST /v1/intake/actions/propose-route` | verified | `src/tests/api.test.ts` covers unauthenticated denial, global intake, filtered readback, proposal creation/idempotency, invalid department, foreign workspace, and MCP manifest exposure. | Architecture task-link gap includes mock-server duplicates for intake routes. | Cleanup architecture-awareness task links for real route vs `.tmp/web-qa-*` mock duplicates. |
| Commercial exceptions, finance, sales, strategy | `GET /v1/commercial-exceptions`, `/finance/context`, `/sales/context`, `/strategy/context` | verified | `src/tests/api.test.ts` covers unauthenticated denial, owner reads, foreign workspace denial, packet content, blocked actions, and MCP manifest exposure. | These are read packets; production smoke remains separate. | Add a read-packet deploy smoke bundle after protected key repair if these packets are release-critical for Roost activation. |
| Relationships | `GET /v1/relationships/context`, `GET /v1/relationships/graph` | verified | `src/tests/api.test.ts` covers graph/context reads, review/action hints, and workspace boundaries. | Broad graph source quality depends on imported/provider data freshness. | Data freshness lane, not API repair: prove relationship graph on current production data after provider key/runtime gate is healthy. |
| Operating graph | `GET /v1/operating-graph/areas/:areaKey` | verified | `src/tests/api.test.ts` covers multiple canonical area keys, invalid area, foreign workspace, graph shape, gaps, and MCP manifest exposure. | Deploy-time AOG smoke is currently blocked by invalid protected API key in `LUC-261`. | Reuse `npm run aog:deploy-smoke` only after valid key-scope evidence and same-session approval. |
| Operating model | `/v1/operating-model`, areas, folders, mappings, storage locations, knowledge roots, automation definitions | verified | `src/tests/api.test.ts` covers area inventory, CRUD-style model routes, external mapping scope, and cross-workspace visibility for representative paths. | Many route entries are broad model CRUD and not all are individually mapped as architecture endpoint entities. | Manifest-to-architecture link audit for operating-model routes; add targeted API assertions only for any untested command route found. |
| Workforce and workspaces | `/v1/workforce`, workforce delete/sync actions, `/v1/workspaces`, workspace select | verified | `src/tests/api.test.ts` covers create/read/delete/sync, owner-backed delete block, workspace switching, selected-workspace connection/inventory, and foreign select denial. | Production behavior depends on current seeded/director data after deploy. | Production read smoke after deploy for People/Agents directory and `/v1/workforce`. |
| Departments | `GET/POST/PATCH /v1/departments` | implemented but not verified | Capability and routes exist; module confidence records local `MGMT-DEPT-001` verification, including `npm run test:api:local`. | The current broad `src/tests/api.test.ts` static extraction did not surface dedicated department endpoint calls in this audit pass. | Add explicit department API assertions or link the existing `MGMT-DEPT-001` proof into the route matrix. |
| Core record CRUD | projects, goals, targets, task-lists, tasks, clients, pipeline-stages, deals, interactions, notes, decisions, agents, agent-logs, agent-events | implemented but not verified | `src/tests/api.test.ts` exercises representative create/read/update/delete or list/get flows for many core records as part of the protected API flow. | Not every CRUD route has a visible route-by-route status row; broad compatibility scopes remain accepted for legacy clients. | Generate a CRUD route/test coverage ledger from manifest entries and mark missing negative auth/workspace assertions before any broad CRUD refactor. |
| Integration settings and ClickUp webhook | ClickUp discovery/webhooks/events/retry/maintenance, Google Drive settings/import/OAuth/reconcile, `POST /v1/webhooks/clickup` | implemented but not verified | `src/tests/api.test.ts` covers webhook signature/register cases and multiple settings routes; production provider behavior has historical evidence. | External-provider operations need live provider credentials and signed webhook/protected smoke; current protected runtime key gate remains blocked. | Provider integration proof lane after key repair: non-mutating settings/events read first, then explicit approved webhook/provider mutation smoke if needed. |
| Public root and React/static compatibility API host behavior | `GET /`, static/react fallback, CORS/security/rate-limit middleware | verified | `src/tests/api.test.ts` covers production CORS and Roost API/web domain defaults; source review confirms API-host root JSON vs web-host React. | This is not an API capability group and should stay separate from protected route confidence. | No backend lane; keep covered by deployment/public smoke. |

## Highest-Risk Findings

| Finding | Status | Why it matters | Next owner / action |
| --- | --- | --- | --- |
| Runtime protected smoke is blocked by invalid API key evidence in the parent takeover lane. | blocked | Local route confidence does not prove deployed protected API/MCP behavior. | Runtime secret owner / board: repair key scope and authorize one same-session `npm run aog:deploy-smoke` rerun under `LUC-261`. |
| Generated architecture endpoint entities are mount-level and include `.tmp/web-qa-*` mock routes. | implemented but not verified | The architecture graph can overstate endpoint confidence or task-link gaps unless real route handlers and mock routes are separated. | Docs/Architecture lane: classify real API route mounts vs validation mock-server endpoints and either link task IDs or exclude validation mocks from task-link pressure. |
| Capability manifest is more granular than architecture API endpoint entities. | present in code, behavior unknown | `179` manifest entries enforce auth at runtime, but the refreshed architecture baseline tracks only `57` endpoint entities. | Backend/API + Docs/Memory lane: create a manifest-to-architecture route ledger for high-risk commands, not necessarily every CRUD read. |
| Provider routes have local coverage but live behavior is credential-dependent. | implemented but not verified | Google Drive, ClickUp, and protected MCP/API smokes can pass locally while production credentials fail. | Ops/Security + Backend lane after key repair: non-mutating provider read smoke, then approved write smoke only if needed. |

## Result Report

- Created the API confidence matrix from source inspection and generated architecture/status artifacts.
- No code, schema, deploy, protected smoke, production mutation, local server, database, browser, or secret access was used.
- Verification performed by static/source inspection and lightweight extraction:
  - `docs/graphs/architecture-awareness.json` API entity count: `57`.
  - `docs/status/task-synchronization-report.md`: task links `0` missing, implementation-without-task-links `440`, verified-without-proof `0`.
  - Source route inventory: `38` `src/modules/**/*.routes.ts` files.
  - Capability manifest extraction: `179` route entries.
  - Test request extraction from `src/tests/api.test.ts`: `189` unique `/auth` or `/v1` request path shapes.

## Definition Of Done

- Matrix exists in `docs/planning/luc-1680-api-route-confidence-matrix.md`.
- State pointers updated so future agents can find it.
- Remaining gaps are classified as follow-up verification/linkage work, not hidden implementation.
- Issue can be closed as read-only audit/planning complete.
