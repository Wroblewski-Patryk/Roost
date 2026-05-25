# Security Baseline

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
- Workspace memberships exist for future growth, but v1 only activates the
  `owner` role.
- Service API keys are workspace-scoped credentials for Paperclip, Jarvis, n8n,
  and other agents.
- API key material is hashed for new seed/bootstrap paths. Legacy plaintext
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

Service API keys should be rotated by creating or seeding a new workspace key,
updating the agent/client secret, verifying `last_used_at`, and then disabling
the old key. Raw key material must only be shown at creation/bootstrap time and
must not be logged. `key_prefix` can identify keys operationally without
revealing the secret.

Owner API key management endpoints are owner-only. Workspace service API keys
must not be allowed to create additional keys. This prevents a leaked adapter
key from minting persistent replacement credentials.

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

AI systems must be tested against prompt injection, data leakage, and unauthorized access before deployment. Use `AI_TESTING_PROTOCOL.md` and `.codex/agents/ai-red-team-agent.md` for reproducible red-team scenarios.

AI, auth-sensitive, money-impacting, and cross-user data flows must fail closed when authorization, ownership, tool access, model memory, or policy validation is ambiguous.
