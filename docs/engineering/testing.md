# Testing Strategy

CompanyCore v1 testing must protect the foundation: workspace ownership, auth,
database migrations, integration sync, and events. Passing a happy-path request
is not enough.

## Required Commands

- Typecheck/build: `npm run build`
- Test command: not configured yet; CCV1-006 must add and document it.
- Docker smoke: `docker compose up -d --build`

Keep this file aligned with `.codex/context/PROJECT_STATE.md`.

## Critical Areas

- owner registration and login
- workspace scoping for all business data
- workspace-scoped service API keys
- integration settings and secret redaction
- ClickUp discovery/sync idempotency
- event emission for state changes
- migrations and production bootstrap
- safe error responses

## Workspace Guardrail Matrix

Every protected workspace-scoped route should include tests for:

- unauthenticated request is denied
- authenticated same-workspace request is allowed
- cross-workspace read is denied
- cross-workspace write is denied
- missing or insufficient service API key scope is denied when scopes exist
- responses do not reveal whether another workspace's record exists
- writes persist the expected `workspace_id`

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
- mapper handles missing optional provider fields
- sync is idempotent by `(workspace_id, source, external_id)`
- sync emits the expected event
- provider secrets are not logged or returned
- one workspace cannot sync or read another workspace's integration settings

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
