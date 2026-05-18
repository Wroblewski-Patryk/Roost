# Foundation P1 Hardening Task Contract

## Header
- ID: FOUNDATION-P1-001
- Title: Foundation P1 hardening wave
- Task Type: fix
- Current Stage: verification
- Status: REVIEW
- Owner: Backend Builder + QA/Test + Security + Ops/Release
- Depends on: `docs/planning/application-foundation-audit-2026-05-18.md`
- Priority: P1
- Module Confidence Rows: `FOUNDATION-HARDENING-001`
- Requirement Rows: `REQ-FOUNDATION-HARDENING-001`
- Operation Mode: BUILDER
- Mission ID: FOUNDATION-P1-HARDENING
- Mission Status: PARTIALLY_VERIFIED

## Goal

Reduce the highest-risk foundation gaps found by the 2026-05-18 application
audit before continuing broad feature growth.

## Scope

- Local API test entrypoint and disposable PostgreSQL runner.
- API error helper and first high-traffic middleware adoption.
- Owner-created API key scope safety.
- Route/capability manifest drift validation.
- Basic API security headers and in-memory abuse throttles.
- Source-of-truth state updates.

## Implementation Plan

1. Add a one-command local API test runner that uses `DATABASE_URL` when set or
   a validation-owned Docker PostgreSQL when available.
2. Add a shared API error helper that preserves the legacy `{ error: "code" }`
   contract while adding structured details for future clients.
3. Require profiles, explicit scopes, or explicit full-access confirmation for
   newly created owner API keys.
4. Add a route/capability manifest checker to `npm run validate`.
5. Add request IDs, security headers, and bounded auth/API rate limits.
6. Update source-of-truth ledgers and validation evidence.

## Acceptance Criteria

- [x] `npm run validate` includes route/capability drift detection.
- [x] `npm run test:api:local` exists and owns disposable validation database
      setup/cleanup when Docker is healthy.
- [x] New unscoped API keys are rejected unless full access is explicitly
      confirmed.
- [x] API auth and central error middleware return the compatible structured
      error envelope.
- [x] Runtime adds request IDs, security headers, and rate limits.
- [ ] Full API integration tests pass through `npm run test:api:local` in a
      healthy local PostgreSQL/Docker environment.

## Validation Evidence

- `node --check scripts/check-route-capabilities.mjs`: passed.
- `node --check scripts/test-api-local.mjs`: passed.
- `node scripts/check-route-capabilities.mjs`: passed with 170 manifest routes
  and 32 route files checked.
- `npm run build:server`: passed.
- `npm run build:web`: passed.
- `npm run validate`: passed.
- `git diff --check`: passed with line-ending warnings only.
- `npm audit --json`: passed with 0 vulnerabilities.
- `npm run test:api:local`: failed cleanly because Docker timed out after the
  runner's 20s availability check; no unbounded hang.
- Full API test execution is not yet proven in this local session because the
  Docker daemon availability probe timed out and no default `DATABASE_URL` is
  configured.

## Security / Privacy Evidence

- New service keys no longer silently default to broad access.
- Existing broad-scope compatibility remains for legacy keys and explicit
  owner-confirmed full-access keys.
- Auth and API denials include stable codes, safe messages, and request IDs.
- Rate limits are intentionally process-local and are a basic abuse guardrail,
  not a distributed production traffic-shaping system.

## Result Report

- Task summary: implemented the first P1 foundation hardening wave from the
  application audit.
- Files changed: package scripts, auth/capability manifests, middleware,
  API-key routes, API tests, validation scripts, and source-of-truth docs.
- What is incomplete: full API integration test execution still needs a
  healthy local PostgreSQL/Docker environment or caller-provided
  `DATABASE_URL`.
- Next steps: run `npm run test:api:local` in a healthy validation environment,
  then continue migrating route-local error responses to the shared helper.
