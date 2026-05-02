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
- API key material must be hashed at rest before production use.
- Protected routes must resolve `workspaceId` from user auth or service API key.
- Cross-workspace access must fail closed.
- Integration settings and tokens belong to a workspace.
- Integration secrets must not be logged or returned in API responses.
- Raw provider/backend errors must not be exposed directly to API clients.

## API Error Safety

API errors must use the standard error envelope from `docs/API.md`.

- Return stable `error.code` values.
- Keep messages operator-readable but non-secret.
- Do not expose Prisma errors, provider payloads, stack traces, passwords, API
  keys, session tokens, or integration tokens.
- For records outside the active workspace, prefer `not_found` or `forbidden`
  without confirming the record exists.

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
