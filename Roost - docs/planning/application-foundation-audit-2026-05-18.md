# Application Foundation Audit

Last updated: 2026-05-18

## Task Contract

### Task Type

Architecture, engineering, security, UX, operations, and maintainability audit.

### Current Stage

Analysis.

### Deliverable For This Stage

Evidence-backed foundation audit for CompanyCore/Roost before broader product
growth.

### Goal

Assess whether the application has a strong enough foundation for continued
development, identify missing engineering and architectural guardrails, and
turn the findings into an ordered improvement backlog.

### Scope

- Backend architecture: `src/app.ts`, `src/modules/**`, `src/auth/**`,
  `src/integrations/**`, `src/mcp/**`.
- Data architecture: `prisma/schema.prisma`, migrations, seed/bootstrap.
- Web architecture: `web/src/**`.
- Testing and validation: `package.json`, `src/tests/api.test.ts`,
  `docs/engineering/testing.md`.
- Security and operations: `docs/security/**`, `docs/operations/**`,
  `Dockerfile`, `docker-compose*.yml`, `.env.example`.
- Source-of-truth state: `.codex/context/**`, `.agents/state/**`.

### Out Of Scope

- Runtime feature implementation.
- Production authenticated smoke with real owner credentials.
- Provider write smoke against real ClickUp or Google Drive credentials.
- Full API integration test execution, because the local Docker daemon timed
  out and `DATABASE_URL` is not configured in the shell.

## Executive Verdict

The application has a credible foundation: strict TypeScript, Prisma
migrations, workspace-scoped data access, capability-gated service keys,
encrypted integration secrets, documented deployment contracts, and a mature
evidence culture. It is already much stronger than a prototype.

It is not yet a low-friction scale foundation. The main risks are not missing
features; they are consistency and operability risks that will slow every new
department module if left alone:

1. Local full-stack validation is not one-command reliable.
2. API errors do not consistently follow the documented envelope.
3. New API keys can still default to broad access when created without scopes
   or a profile.
4. Several backend and frontend files are too large to remain safe ownership
   boundaries.
5. Route/capability/API manifest consistency is manual and can drift.
6. Production deploy is configured, but push-to-running-image proof still needs
   routine smoke evidence.
7. Web UX is improving, but design-system adoption is uneven in large route
   components.

No P0 blocker was found in this audit. The recommended next mission is a P1
foundation hardening wave before adding another broad department system.

## Evidence Collected

| Check | Result | Evidence |
| --- | --- | --- |
| Repository state | clean before audit edits | `git status --short --branch` returned `## main...origin/main`. |
| TypeScript/web validation | pass | `npm run validate` passed, including server typecheck and Vite build. |
| Prisma schema | pass | Dummy-url `npx prisma validate` passed. |
| Dependency vulnerability audit | pass | `npm audit --json` reported `0` vulnerabilities across `208` dependencies. |
| Diff hygiene | pass | `git diff --check` passed. |
| API route surface size | large | Route scan found `209` Express route handlers across `38` route files. |
| Data model size | large but controlled | Prisma schema contains `55` models and `24` migrations. |
| Test architecture | concentrated | `src/tests/api.test.ts` has `8261` lines and only `6` top-level `test(...)` blocks, including one very large integration flow. |
| Local DB test gate | blocked | `docker version` and `docker ps` timed out; `DATABASE_URL` is not set by default. |

## Strengths To Preserve

| Area | Finding | Evidence |
| --- | --- | --- |
| Architecture direction | CompanyCore is clearly defined as the company operating system, while agents are external API/MCP clients. | `docs/architecture/architecture-source-of-truth.md`, `docs/architecture/autonomous-company-operating-system.md`, `docs/architecture/unified-organizational-operating-system.md`. |
| Workspace isolation | Protected routes generally derive `workspaceId` from auth context instead of payloads. | `src/auth/api-key.middleware.ts`, repeated `where: { workspaceId: req.auth!.workspaceId }` patterns in route modules. |
| Permission model | API service clients are capability-gated through a shared manifest. | `src/auth/capabilities.ts`, `src/mcp/manifest.ts`. |
| Secret handling | Production required secrets fail closed, integration secrets are encrypted with AES-256-GCM, and API key hashing exists. | `src/config/env.ts`, `src/integrations/secrets.ts`, `src/auth/api-key.ts`. |
| Deployment discipline | Coolify/VPS deployment, rollback, health, and smoke expectations are documented. | `docs/operations/coolify-vps-deployment-contract.md`, `docs/operations/post-deploy-smoke.md`, `docs/operations/rollback-and-recovery.md`. |
| Web foundation | Active React web has shared API error mapping, i18n, shared fields/notices/buttons/tables, and responsive shell direction. | `web/src/api/**`, `web/src/i18n/**`, `web/src/components/**`, `web/src/layout/shell.tsx`. |
| Product governance | Task contracts, module confidence, system health, known issues, and risk registers exist and are actively used. | `.codex/context/TASK_BOARD.md`, `.agents/state/module-confidence-ledger.md`, `.agents/state/system-health.md`, `.agents/state/known-issues.md`. |

## Critical Findings

### P1-001 Local Full API Validation Is Not Reliable Enough

`npm run test:api` requires a PostgreSQL `DATABASE_URL`, but the default local
shell does not set it and Docker daemon calls timed out during this audit.
That means many recent slices are build-verified but not always integration
test-verified.

Evidence:

- `package.json` defines `test:api` as build + migrate deploy + compiled API
  tests.
- `.env.example` has a default `DATABASE_URL`, but it is not loaded into the
  current shell automatically.
- `docker version` and `docker ps` timed out.
- Known issue `KI-011` already records this class of blocker.

Impact:

- Backend changes can be merged with only build and mocked/rendered proof.
- Migration and workspace-isolation regressions may be caught late.

Recommended fix:

- Add a repeatable `npm run test:api:local` or `npm run test:api:docker` that
  starts or verifies a disposable PostgreSQL, sets `DATABASE_URL`, runs
  migrations/tests, and tears down safely.
- Keep the existing `npm run test:api` for CI/production-like environments.

### P1-002 API Error Contract Is Documented Better Than It Is Implemented

The testing docs require stable error codes and mention an `error.code`
contract, but current backend routes commonly return `{ error: "code" }`.
The frontend normalizes this, but the API itself is inconsistent with the
stronger contract.

Evidence:

- `docs/engineering/testing.md` says API errors should assert `error.code` and
  safe `error.message`.
- `src/middleware/error-handler.ts` returns string error values for validation,
  CORS, and internal errors.
- A source scan found `208` `json({ error: ... })` call sites in modules and
  middleware.
- `web/src/api/client.ts` has compatibility normalization for both string and
  object errors, which is useful but also confirms contract drift.

Impact:

- Agents, web, future mobile, and integrations must keep compatibility logic.
- Error UX and API documentation can drift route by route.

Recommended fix:

- Introduce one shared `ApiError`/`sendError` helper with `{ error: { code,
  message }, requestId? }`.
- Migrate routes incrementally while preserving frontend compatibility.
- Add regression assertions for both safe message and no secret leakage.

### P1-003 New API Keys Can Accidentally Become Broad Access Keys

The capability model intentionally treats empty scopes and legacy adapter
scopes as broad compatibility. However, the owner API-key creation route also
defaults new keys to `[]` when no scopes or profile are provided.

Evidence:

- `src/auth/capabilities.ts` treats empty scopes as broad in `scopesAreBroad`.
- `src/modules/api-keys/api-keys.routes.ts` sets
  `const scopes = input.scopes ?? profile?.scopes ?? []`.
- The security baseline says workspace service API keys should be scoped and
  owner-managed.

Impact:

- An owner-created key with omitted profile/scopes becomes full-access by
  default.
- This is risky for AI/MCP agents, provider bridges, and future external tools.

Recommended fix:

- Keep legacy broad handling only for existing compatibility rows.
- Require `profileId` or explicit non-empty `scopes` for newly created keys,
  unless the request includes an explicit owner-only `full_access_confirmed`
  field.
- Add API tests for new-key default denial.

### P1-004 Route And Capability Manifest Consistency Is Manual

The route surface is large and capability mapping is hand-maintained. This is
good enough for v1, but it will become fragile as more department systems are
added.

Evidence:

- Express route scan found `209` handlers.
- Capability routes are listed manually in `src/auth/capabilities.ts`.
- The same app mounts protected routes both unprefixed and under `/v1` in
  `src/app.ts`.

Impact:

- A new route can be added without manifest exposure or the wrong capability.
- Specific route ordering can matter, especially around generic routes.

Recommended fix:

- Add a route-manifest test that compares registered Express route paths to
  capability manifest entries for protected routes.
- Prefer explicit `requireCapability("x:y")` middleware on route groups as the
  long-term pattern.
- Keep compatibility unprefixed routes documented, but make `/v1` canonical in
  docs and client code.

### P1-005 Maintainability Hotspots Are Already Above Safe Ownership Size

Several files combine schemas, mapping, command logic, read models, and route
handlers. This slows review and increases regression risk.

Evidence:

| File | Lines |
| --- | ---: |
| `src/tests/api.test.ts` | 8261 |
| `src/modules/company-os/company-os.routes.ts` | 2328 |
| `src/modules/company-os/workflow-definition-drafts.routes.ts` | 1987 |
| `web/src/features/departments/operations-route.tsx` | 1235 |
| `web/src/features/departments/assets-route.tsx` | 1074 |
| `src/modules/intake/intake.routes.ts` | 1000 |
| `src/modules/operating-graph/operating-graph.routes.ts` | 982 |
| `src/modules/operations/operations.routes.ts` | 903 |
| `src/modules/assets/assets.routes.ts` | 800 |

Impact:

- Future changes become harder to isolate and test.
- Subagent/parallel work is harder because ownership boundaries overlap.

Recommended fix:

- Split by stable seams: schemas, DTO mappers, read services, command services,
  route wiring, and focused tests.
- Start with `src/tests/api.test.ts`, then `company-os` routes, then the three
  active web route files.

### P1-006 Public Auth Surface Needs A Clear Production Registration Policy

The registration route is public and creates an owner workspace. This may be
correct for self-serve, but current product language says internal operational
infrastructure.

Evidence:

- `src/modules/auth/auth.routes.ts` exposes `POST /register`.
- `docs/operations/coolify-vps-deployment-contract.md` says public registration
  may be temporary and should be protected/disabled if deployment policy
  requires it.

Impact:

- Production can accumulate unexpected workspaces if registration remains open.
- Future billing/multi-tenant policy becomes harder if ownership is ambiguous.

Recommended fix:

- Decide explicitly: invite/self-serve registration or owner-only bootstrap.
- If internal-only, gate registration by env flag or invite token and add a
  production smoke/assertion for the chosen policy.

### P1-007 Missing Application-Level Rate Limiting And Security Headers

There is provider rate-limit handling, but no app-level login/API rate limiter
or standard security header middleware.

Evidence:

- Source search found provider-specific rate-limit handling but no
  `express-rate-limit`, `helmet`, `csrf`, or equivalent app middleware.
- `src/app.ts` configures CORS and JSON body size, but no request-rate or
  security-header layer.

Impact:

- Login, registration, API key, and provider command endpoints are more
  exposed to brute-force or noisy automation.

Recommended fix:

- Add conservative rate limits for auth, API-key creation, webhook retry,
  provider command routes, and broad protected API requests.
- Add security headers through `helmet` or an explicit equivalent policy.

### P2-001 Prisma Schema Is Mature But Needs Domain Ownership Notes

The schema has 55 models and strong migration history. The risk is not schema
absence; it is knowing which model owns which product behavior.

Recommended fix:

- Add a lightweight module-to-model ownership index under `docs/modules/`.
- Mark each model as native core, provider-backed, runtime evidence, derived
  read model, or future/partial.

### P2-002 Active Web Uses Shared Components, But Large Screens Still Carry
Page-Local UI Logic

`CcButton`, `CcDataTable`, `CcField`, `CcNotice`, and `CcResourceSelector`
exist, but active workbenches still contain a lot of page-local filtering,
state derivation, layout, and row/card rendering.

Recommended fix:

- Extract shared `WorkbenchLayout`, `FilterBar`, `DetailPanelShell`,
  `ResponsiveRoster`, and `CommandModal` only where repeated across Operations,
  Assets, and People/Agents.
- Keep the extracted components tool-first and backend-connected, following
  `docs/ux/web-view-creation-rules.md`.

### P2-003 Observability Is Mostly Event-Based, Not Operations-Based

The app has events and audit-style records, but production operations would
benefit from request IDs, structured logs, latency, error counters, and a
documented alert path.

Recommended fix:

- Add request ID middleware and include it in logs and API errors.
- Add lightweight `/health` readiness detail for DB/migration status.
- Define SLI/SLO rows for auth, API, Drive import, ClickUp writeback, and core
  workbench read packets.

## Recommended Foundation Hardening Wave

### Wave 1: Confidence Gates

1. Add reliable local API test database runner.
2. Split `src/tests/api.test.ts` into focused suites while preserving one
   full protected flow.
3. Add route-manifest/capability drift test.

### Wave 2: Security And Contracts

1. Standardize API error envelope.
2. Make new API keys scoped by default.
3. Add auth/API rate limiting and security headers.
4. Decide production registration policy.

### Wave 3: Maintainability

1. Split Company OS route modules into services and route wiring.
2. Split Operations, Assets, and People/Agents web route components by shared
   workbench primitives.
3. Add module-to-model ownership docs.

### Wave 4: Production Confidence

1. Run push-to-running-image smoke after each deploy.
2. Make public `/health` commit comparison part of release checklist.
3. Add production-safe smoke for current active routes:
   `/areas?area=00-ogolny&view=overview`,
   `/areas?area=04-operacje&view=tasks`,
   `/areas?area=04-operacje&view=calendar`,
   `/areas?area=06-kadry&view=directory`,
   `/areas?area=08-zasoby&view=files`.

## Suggested Next Task Contracts

| ID | Priority | Task | Acceptance |
| --- | --- | --- | --- |
| FOUNDATION-001 | P1 | Reliable local API test database runner | One command starts/uses disposable Postgres, sets `DATABASE_URL`, runs migrations, runs `npm run test:api`, and cleans validation-owned resources. |
| FOUNDATION-002 | P1 | API error envelope standardization | Shared error helper adopted by auth, API keys, workforce, operations, assets; frontend compatibility preserved; tests assert safe `error.code` and message. |
| FOUNDATION-003 | P1 | Scoped-by-default API key creation | New key creation rejects omitted scopes/profile unless explicit full-access confirmation is provided; tests prove no accidental broad key. |
| FOUNDATION-004 | P1 | Route/capability manifest drift test | Protected routes without capability mapping fail tests unless explicitly documented as owner-only or compatibility-only. |
| FOUNDATION-005 | P1 | Auth/API abuse controls | Rate limiting and security headers added with tests for auth routes and provider command routes. |
| FOUNDATION-006 | P2 | Company OS route/service split | Extract schemas, read services, command services, and route handlers from the largest Company OS files without behavior change. |
| FOUNDATION-007 | P2 | Active workbench component split | Extract repeated workbench primitives from Operations, Assets, and People/Agents without changing functionality. |

## Bottom Line

Build on this foundation, but harden it before adding many more departments.
The most valuable next investment is not another large feature. It is making
the system easier to prove, safer by default, and smaller to change.

