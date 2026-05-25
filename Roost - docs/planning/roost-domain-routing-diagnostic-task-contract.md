# Roost Domain Routing Diagnostic Task Contract

Last updated: 2026-05-24

## Task Type

fix / release

## Current Stage

verification

## Deliverable For This Stage

Diagnose why `https://roost.luckysparrow.ch` does not load, implement the
repository-side domain contract correction, and identify the required Coolify
operator action.

## Goal

Make the renamed Roost production domains coherent across DNS, Coolify routing,
backend host handling, CORS, and deployment documentation.

## Scope

- Production domain probes:
  - `https://roost.luckysparrow.ch/`
  - `https://api.roost.luckysparrow.ch/health`
  - CORS preflight from Roost web to Roost API
- Runtime domain handling:
  - `src/config/env.ts`
  - `src/app.ts`
  - `docker-compose.coolify.yml`
  - `.env.example`
- Regression coverage:
  - `src/tests/api.test.ts`
- Operations documentation:
  - `docs/operations/coolify-vps-deployment-contract.md`

## Implementation Plan

1. Probe DNS and public HTTP/TLS responses for both Roost domains.
2. Inspect existing backend and compose domain assumptions.
3. Fix runtime defaults for Roost CORS and API-host recognition.
4. Add regression coverage for Roost default CORS and API metadata routing.
5. Update operations documentation and report the remaining Coolify routing
   action.

## Acceptance Criteria

- DNS for both Roost subdomains resolves to the production VPS.
- API health on `api.roost.luckysparrow.ch` is verified.
- The cause of `roost.luckysparrow.ch` failure is identified with public HTTP
  evidence.
- Roost production CORS defaults are implemented and covered by tests.
- `api.roost.luckysparrow.ch` is recognized as an API metadata host.
- Remaining operator action is explicit and does not rely on a workaround.

## Definition Of Done

- Runtime domain handling code builds.
- Regression test coverage exists for Roost CORS/API host behavior.
- Operations docs reflect the active Roost domain contract.
- The Coolify-side web routing gap is reported as the remaining deployment
  action.
- `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, and
  `NO_TEMPORARY_SOLUTIONS.md` were checked.

## Result Report

- DNS resolves both `roost.luckysparrow.ch` and `api.roost.luckysparrow.ch` to
  `141.227.149.67`.
- `https://api.roost.luckysparrow.ch/health` returns `200` with build commit
  `3e9319292f8f33c4a1c4892477b9363a501253a2`.
- `https://roost.luckysparrow.ch/` returns `503 Service Unavailable` with body
  `no available server`, and strict TLS validation currently fails locally with
  an untrusted-root chain. This points to Coolify/Traefik domain routing and
  certificate provisioning for the web host, not an application crash.
- `Origin: https://roost.luckysparrow.ch` to
  `https://api.roost.luckysparrow.ch` currently returns `403` in production,
  proving the deployed image still has old CORS/domain assumptions.
- Repository-side Roost defaults were added for CORS, API host recognition,
  compose public API URL, and operations documentation.
- Validation passed: `npm run validate`, `git diff --check` with line-ending
  warnings only, and a production-mode built-app smoke proving Roost CORS
  preflight returns `204` plus `api.roost.luckysparrow.ch` root returns API
  metadata pointing at the Roost web/API URLs.
- Full `npm run test:api:local` did not run because Docker was unavailable in
  this session (`docker timed out after 20000ms`).
- Remaining action: in Coolify, attach `roost.luckysparrow.ch` to the same
  backend service/port `3000`, ensure HTTPS certificate issuance succeeds, and
  redeploy the current commit so the Roost CORS/API-host defaults are active.
- Follow-up checkpoint: Coolify was updated under team `LuckySparrow`, project
  `LuckySparrow`, production app `Roost`. The backend domain field had a stray
  space before `https://roost.luckysparrow.ch`, which caused Coolify to expose
  a malformed `:// https://roost.luckysparrow.ch` link and Traefik returned
  `503 no available server`. The domain list was normalized to four comma-only
  domains, `COMPANYCORE_ALLOWED_ORIGINS` and
  `COMPANYCORE_PUBLIC_API_BASE_URL` were updated for Roost, and two controlled
  Roost redeploys completed. Final public smoke passed:
  `https://roost.luckysparrow.ch/` returned `200`,
  `https://api.roost.luckysparrow.ch/health` returned `200`, and the Roost web
  origin CORS preflight to the Roost API returned `204` with
  `Access-Control-Allow-Origin: https://roost.luckysparrow.ch`.
