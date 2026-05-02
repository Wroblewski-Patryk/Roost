# Testing Strategy

CompanyCore v1 testing must protect the foundation: workspace ownership, auth,
database migrations, integration sync, and events. Passing a happy-path request
is not enough.

## Required Commands

- Typecheck/build: `npm run build`
- Integration tests: `npm test`
- Docker smoke: `docker compose up -d --build`

Keep this file aligned with `.codex/context/PROJECT_STATE.md`.

`npm test` expects `DATABASE_URL` to point at a disposable PostgreSQL database.
The script builds TypeScript, applies migrations with `prisma migrate deploy`,
and runs Node's built-in test runner against compiled tests.

Example local disposable database:

```powershell
docker run -d --name companycore-test-postgres `
  -e POSTGRES_DB=companycore_test `
  -e POSTGRES_USER=companycore `
  -e POSTGRES_PASSWORD=companycore `
  -p 55432:5432 postgres:16-alpine

$env:DATABASE_URL='postgresql://companycore:companycore@localhost:55432/companycore_test?schema=public'
npm test
```

Migration files must be UTF-8 without BOM. A fresh `prisma migrate deploy`
test is required because TypeScript build does not prove migration SQL can be
applied.

## Critical Areas

- owner registration and login
- workspace scoping for all business data
- workspace-scoped service API keys
- owner-managed adapter API key creation and redaction
- integration settings and secret redaction
- ClickUp discovery/sync idempotency
- event emission for state changes
- migrations and production bootstrap
- safe error responses

## Workspace Guardrail Matrix

Every protected workspace-scoped route should include tests for:

| Case | Expected result |
| --- | --- |
| unauthenticated request | denied with `unauthorized` |
| authenticated owner, same workspace | allowed |
| valid workspace service API key, same workspace | allowed when scope permits |
| inactive service API key | denied with `unauthorized` or `forbidden` |
| missing service API key scope | denied with `forbidden` when scopes exist |
| cross-workspace read by ID | denied with `not_found` or `forbidden` without leaking existence |
| cross-workspace list | returns only active workspace data |
| cross-workspace create with foreign relation ID | denied with `not_found` or `forbidden` |
| cross-workspace update/patch | denied with `not_found` or `forbidden` |
| cross-workspace delete/archive | denied with `not_found` or `forbidden` |
| missing workspace context | denied with `workspace_required` |
| integration secret response | secret value redacted or omitted |
| provider failure | safe integration error without data corruption |
| successful write | persists expected `workspace_id` |

## Route-Type Requirements

List endpoints:

- return only active workspace records
- never include records from another workspace
- preserve response envelope `{ "data": [] }`

Read-by-ID endpoints:

- allow same-workspace reads
- deny cross-workspace reads without confirming the record exists

Create endpoints:

- persist `workspace_id` from auth context, not request body
- reject foreign relation IDs from another workspace
- emit expected event when the state change is meaningful

Update/Patch endpoints:

- allow same-workspace updates
- reject cross-workspace updates
- reject attempts to change `workspace_id`
- emit expected event when the state change is meaningful

Integration settings endpoints:

- allow owner or authorized service access only when explicitly approved
- never return raw secret values
- reject cross-workspace reads/writes
- log settings changes without secret material

Native sync endpoints:

- read provider settings from active workspace
- reject missing settings with `integration_not_configured`
- upsert by `(workspace_id, source, external_id)`
- preserve existing records on provider failure
- emit sync event on success

## API Error Contract Tests

Endpoint tests should assert stable error codes rather than raw messages.

Required minimum codes:

- `validation_error`
- `unauthorized`
- `forbidden`
- `not_found`
- `conflict`
- `workspace_required`
- `integration_not_configured`
- `integration_unavailable`
- `sync_failed`
- `internal_server_error`

Raw backend, Prisma, provider, or validation internals should not be returned
directly to API clients.

Every error-contract test should verify:

- HTTP status code
- `error.code`
- safe `error.message`
- absence of secret values
- absence of raw provider, Prisma, stack trace, or password/API key material

## Integration Tests

Native integration tests should cover:

- provider client success path
- provider unavailable/failure path
- missing workspace settings return `integration_not_configured`
- mapper handles missing optional provider fields
- sync is idempotent by `(workspace_id, source, external_id)`
- sync emits the expected event
- provider secrets are not logged or returned
- one workspace cannot sync or read another workspace's integration settings
- sync result logs/events include safe provider, workspace, counts, and error
  code fields only

Use mocked provider responses for repeatable automated tests, plus manual smoke
against real ClickUp credentials before production verification.

## Migration Tests

Schema-changing tasks should verify:

- migration applies to an empty database
- migration applies to an existing local foundation database
- generated Prisma client builds
- affected runtime paths still work after restart
- rollback or recovery note is recorded

## Manual Verification Standard

Delivery summaries must include:

- exact automated commands run and pass/fail result
- manual API checks run and pass/fail result
- whether denied paths were checked
- whether secrets were redacted
- residual risks

## AI And Integration Validation

AI-facing features require repeatable validation using `AI_TESTING_PROTOCOL.md`.
Required coverage includes memory consistency, multi-step context stability,
adversarial contradiction handling, role break and prompt injection resistance,
memory corruption resistance, edge cases, data leakage, and unauthorized access
attempts.

Runtime features require integration validation using
`INTEGRATION_CHECKLIST.md`. A feature is not complete until real API contracts,
database schema or migrations, validation, error states, restart behavior, and
regression risk are verified.

Completion evidence must satisfy `DEFINITION_OF_DONE.md`.
