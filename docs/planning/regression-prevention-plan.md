# Regression Prevention Plan

CompanyCore v1 is allowed to stay small, but it must not become fragile. The
main regression risk is not one broken endpoint; it is adding a feature that
silently bypasses workspace ownership, auth, events, migrations, or integration
contracts.

## Fundamental Invariants

These invariants should be treated as product architecture rules:

- Every business record belongs to a workspace.
- Every protected request resolves an authenticated context and `workspaceId`.
- Cross-workspace reads and writes fail closed.
- External integration records use `(workspace_id, source, external_id)` for
  idempotency.
- Integration secrets are workspace-owned and never returned or logged.
- Every meaningful state change emits an event.
- Database schema changes use migrations, not ad hoc `db push`.
- API responses use stable, documented error codes.
- Tests must include both allowed and denied paths.
- Deployment smoke must exercise the real production path, not only `/health`.

## Missing Fundamentals To Add Before v1 Is Called Stable

### 1. API Contract

Add a stable API contract source, preferably OpenAPI or an equivalent
repository-local contract document generated or maintained from routes.

Minimum coverage:

- auth endpoints
- workspace context behavior
- service API key behavior
- core CRUD endpoints
- integration settings endpoints
- ClickUp discovery/sync endpoints
- error response shape

### 2. Workspace Guardrail Tests

Every new business route should be tested for:

- unauthenticated request denied
- valid same-workspace request allowed
- cross-workspace request denied
- response does not leak another workspace's data
- writes persist `workspace_id`

### 3. Migration Safety

Every schema-changing task should include:

- migration generated and reviewed
- migration applies to empty database
- migration applies to existing foundation database
- rollback or recovery note
- data ownership impact reviewed

### 4. Integration Adapter Contract

Every integration adapter should use the same shape:

- provider client
- provider mapper
- sync service
- workspace settings reader
- event emission
- safe error mapping
- tests for provider failure and idempotent sync

### 5. Observability Minimum

Before production verification, add:

- structured request logs or equivalent runtime logs
- sync start/success/failure events or logs
- auth failure logging without secrets
- provider failure logging without tokens or raw sensitive payloads
- smoke checklist for owner auth, workspace scoping, ClickUp sync, and event
  readback

### 6. Seed And Bootstrap Safety

The v1 bootstrap path should not leave a permanent global admin shortcut.

Required clarity:

- how first owner is created
- how local development is seeded
- how production first-owner bootstrap is disabled or protected after use
- how service API keys are created and rotated

### 7. Error Contract

Define stable error responses before agents depend on the API:

- `validation_error`
- `unauthorized`
- `forbidden`
- `not_found`
- `workspace_required`
- `integration_not_configured`
- `integration_unavailable`
- `sync_failed`

Provider/raw backend errors should not be returned directly to clients.

## Required v1 Regression Task Order

1. CCV1-014 API contract and error response standard.
2. CCV1-015 Workspace guardrail test matrix.
3. CCV1-016 Migration safety and seed/bootstrap policy.
4. CCV1-017 Integration adapter contract and observability minimum.
5. CCV1-006 Endpoint test foundation, expanded to include the guardrails above.

## Done-State Rule

A v1 runtime task is not done unless it answers:

- Which workspace owns the data?
- Which auth path allowed the request?
- Which denied path was tested?
- Which event or log proves the change happened?
- Which migration or schema check protects persistence?
- Which smoke step would catch a regression after deploy?
