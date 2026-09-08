# Security Baseline

[Native task risk assessment](../architecture/native-task-risk.md) binds the prepared scope and joint
impact to Ready, execution admission and task capability grants. Classification
is followed by [level-specific native admission](../architecture/native-risk-admission.md); neither activates execution.

[Native serious-incident suspension](../architecture/native-capability-suspension.md)
adds exact capability containment and independently verified, owner-authorized
restoration. A sanitizer incident alone never suspends a workspace.

Native execution content follows the shared [runtime redaction contract](../architecture/native-runtime-redaction.md)
before persistence, projection and model dispatch. Sensitive required content
blocks; diagnostics may be redacted with a value-free technical incident. Other
Roost flows and historical stored data are not certified by this boundary.

## Always Check

- auth and session boundaries
- secrets and env ownership
- ownership and authorization rules
- rate limiting and abuse controls
- logging without secret leakage

## CompanyCore v1 Auth Baseline

- Owner login uses email/password with hashed password storage.
- Registration creates owner user, workspace, and owner membership in one
  transaction.
- Workspace memberships activate `owner`, `admin`, `member`, and `viewer`.
  Roles are resolved from the database on every protected human request.
- Production onboarding is invitation-only by default. Invitation tokens are
  stored hashed, expire after seven days, and raw values are shown once.
- The primary owner cannot be removed or demoted; ownership transfer is an
  audited atomic operation.
- Service API keys are workspace-scoped credentials for Codex Agent Host, Jarvis, n8n,
  and other agents.
- API key material is hashed for authenticated key-creation paths. Legacy plaintext
  rows are accepted only as a documented transition path when `key_hash` is
  missing.
- Protected routes must resolve `workspaceId` from user auth or service API key.
- Cross-workspace access must fail closed.
- Integration settings and tokens belong to a workspace.
- Integration secrets must be encrypted at rest, must not be logged, and must
  not be returned in API responses.
- Raw provider/backend errors must not be exposed directly to API clients.
- Production runtime must not silently fall back to development auth,
  integration-encryption, or API-key hashing secrets. Missing or placeholder
  production secret values fail startup before the HTTP service is accepted as
  healthy.
- Production CORS is restricted to the approved CompanyCore web/API origins or
  the explicit `COMPANYCORE_ALLOWED_ORIGINS` allowlist.

## API Error Safety

API errors must use the standard error envelope from `docs/API.md`.

- Return stable `error.code` values.
- Keep messages operator-readable but non-secret.
- Do not expose Prisma errors, provider payloads, stack traces, passwords, API
  keys, session tokens, or integration tokens.
- For records outside the active workspace, prefer `not_found` or `forbidden`
  without confirming the record exists.

## Integration Secret Storage

v1 stores provider token material in `integration_settings.secret_ciphertext`.
The backend encrypts token material using AES-256-GCM with key material derived
from `INTEGRATION_SECRET_KEY`. The only supported read path for native adapters
is `src/integrations/integration-settings.service.ts`, which decrypts settings
inside the backend process and never exposes the token through API responses.

## Service API Key Rotation

Service API keys should be rotated by explicitly creating a new workspace key,
updating the agent/client secret, verifying `last_used_at`, and then disabling
the old key. Raw key material must only be shown at creation/bootstrap time and
must not be logged. `key_prefix` can identify keys operationally without
revealing the secret.

API key management endpoints require an owner or administrator human session.
Workspace service API keys must not be allowed to create additional keys. This prevents a leaked adapter
key from minting persistent replacement credentials.

Workforce-bound review credentials use a separate [atomic rotation and permanent
revocation contract](../architecture/agent-credential-principal.md). They cannot
change agent identity in place. Every supported agent command rechecks current
credential and task role authority; an older backend must never receive an active
bound credential during rollback.

## Elevated Risk Areas

- AI-assisted flows
- money-impacting flows
- background jobs with retries
- webhook handlers
- deployment and secret rotation changes

## Required Validation For Risky Changes

- fail-closed behavior
- authorization boundaries
- cross-workspace denied paths
- secret redaction
- retry and idempotency safety
- negative-path verification

## AI Security Rule

AI systems must be tested against prompt injection, data leakage, and unauthorized access before deployment. Use `AI_TESTING_PROTOCOL.md` and assign reproducible red-team work through the Codex Agent Host security lane.

AI, auth-sensitive, money-impacting, and cross-user data flows must fail closed when authorization, ownership, tool access, model memory, or policy validation is ambiguous.

## Task-scoped agent capabilities

Native agent review writes require an explicit human-admin-issued
[RF-SEC-003 grant](../architecture/task-capability-grants.md) bound to the exact
workspace, agent, credential, task, application, operation and time. Current roles
remain mandatory. Grant use, business effects and audit commit atomically;
expiry, revocation and context changes deny further authority. No raw secret is
returned by this boundary. This does not implement a general sensitive-tool or
risk broker and does not activate agents.
