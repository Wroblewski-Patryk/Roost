# Task

## Header
- ID: ACF-SEC-001
- Title: Production Secret And CORS Hardening
- Task Type: fix
- Current Stage: release
- Status: DONE
- Owner: Security + Backend Builder
- Depends on: APP-AUDIT-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: security/runtime configuration
- Requirement Rows: REQ-APP-AUDIT-003
- Quality Scenario Rows: QA-APP-AUDIT-003
- Risk Rows: RISK-APP-AUDIT-002
- Iteration: ACF-SEC-001
- Operation Mode: BUILDER
- Mission ID: ACF-SEC-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode is selected for the next builder checkpoint after the
  tester audit and UX fix.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were not needed for this task.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by closing production security
  configuration risk.

## Mission Block
- Mission objective: close the audit finding that production can start with
  development secrets and open CORS.
- Release objective advanced: product-quality v1 hardening before broader
  autonomous agent or UI expansion.
- Included slices: environment validation, production CORS restriction,
  deployment env contract update, focused tests.
- Explicit exclusions: log redaction, rate limiting, AI red-team, and broader
  auth authorization review.
- Checkpoint cadence: update this contract after implementation and after test
  evidence.
- Stop conditions: required production behavior conflicts with deployment
  contract or cannot be tested fail-closed.
- Handoff expectation: record exact env/CORS behavior, validation commands, and
  next security/product task.

## Context

APP-AUDIT-001 found two P1 production hardening issues: `src/config/env.ts`
allowed development fallback secrets in production, and `src/app.ts` used
open `cors()` for all origins. The deployment contract already lists the
runtime secrets as required production inputs.

## Goal

Production must fail startup when required security secrets are absent or still
use committed development placeholder values, and browser CORS must be
restricted to approved CompanyCore origins or an explicit operator allowlist.

## Scope

- `src/config/env.ts`
- `src/app.ts`
- `src/middleware/error-handler.ts`
- `src/tests/api.test.ts`
- `.env.example`
- `docker-compose.coolify.yml`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/security/security-baseline.md`
- canonical state files updated at closure

## Implementation Plan
1. Inspect current env loading, Express CORS setup, deployment env docs, and
   existing integration test harness.
2. Add production-only required secret validation and placeholder rejection.
3. Restrict production CORS to `COMPANYCORE_ALLOWED_ORIGINS` or the approved
   CompanyCore web/API domains.
4. Add focused fail-closed tests for missing production secrets and production
   CORS allowed/denied behavior.
5. Update deployment and security source-of-truth files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: production secret fallbacks and open CORS are present.
- Gaps: no focused tests prove production env fail-closed behavior.
- Inconsistencies: Coolify compose did not pass all required secrets.
- Architecture constraints: HTTP API remains the policy boundary; production
  runtime secrets live in deployment env, not source code.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: operating system, project memory index, task board,
  application completion audit, secure development lifecycle, security
  baseline, Coolify deployment contract, env/app/test source.
- Rows created or corrected: pending closure updates.
- Assumptions recorded: non-browser clients without an `Origin` header remain
  allowed because CORS is a browser boundary, not service API authentication.
- Blocking unknowns: none.
- Why it was safe to continue: production domains are already documented in
  the deployment contract.

### 2. Select One Priority Mission Objective
- Selected task: ACF-SEC-001 Production Secret And CORS Hardening.
- Priority rationale: P1 security hardening blocks confident product-quality
  claims and further autonomous write expansion.
- Why other candidates were deferred: documentation/data/UX city work is less
  safety-critical than fail-closed production runtime configuration.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: production requires explicit secret values; production CORS uses a
  comma-separated allowlist with documented default CompanyCore origins.
- Edge cases: missing env, committed dev placeholders, non-browser requests
  with no `Origin`, and unknown browser origins.

### 4. Execute Implementation
- Implementation notes: added production-only required env validation for
  `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `INTEGRATION_SECRET_KEY`, and
  `API_KEY_HASH_SECRET`; rejected committed development placeholder secrets in
  production; replaced open production CORS with an allowlist from
  `COMPANYCORE_ALLOWED_ORIGINS` or documented CompanyCore domain defaults; and
  added a safe `cors_origin_not_allowed` API error.

### 5. Verify and Test
- Validation performed: `npm run build`; `npm test` with `DATABASE_URL` pointed
  at disposable PostgreSQL on `localhost:55452`; local validation resource
  cleanup checks.
- Result: passed. The test suite includes missing-secret rejection,
  development-placeholder rejection, production CORS allow/deny behavior, and
  the existing protected API flow.

### 6. Self-Review
- Simpler option considered: document CORS as intentionally open. Rejected
  because the audit explicitly requires restriction or decision, and the
  production domains are known.
- Technical debt introduced: no expected debt.
- Scalability assessment: allowlist keeps future domains configurable without
  code changes.
- Refinements made: changed the initial missing-secret path so production does
  not instantiate a development fallback before reporting the missing env var.

### 7. Update Documentation and Knowledge
- Docs updated: `.env.example`, `docker-compose.coolify.yml`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `docs/security/security-baseline.md`, and application-completion audit
  closure notes.
- Context updated: task board, project state, next steps, delivery map, known
  issues, module confidence, requirements, quality scenarios, and risk register.
- Learning journal updated: not applicable unless validation discovers a
  recurring pitfall.

## Acceptance Criteria
- [x] Production env import/startup fails when `AUTH_TOKEN_SECRET`,
  `INTEGRATION_SECRET_KEY`, or `API_KEY_HASH_SECRET` is missing.
- [x] Production env rejects committed development placeholder secret values.
- [x] Production CORS allows approved CompanyCore origins and denies unknown
  browser origins.
- [x] Non-production local development remains usable without new mandatory
  operator env.
- [x] Deployment docs and Coolify compose list the required production env
  inputs.

## Success Signal
- User or operator problem: production no longer silently starts with unsafe
  development secret material or broad browser CORS.
- Expected product or reliability outcome: safer production default before
  agent-facing expansion.
- How success will be observed: focused tests and build/integration test
  evidence pass.
- Post-launch learning needed: no

## Deliverable For This Stage

Code, tests, and docs for the production secret/CORS hardening slice, plus
validation evidence.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API/operator path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Backend error handling exists where applicable.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Security and rollback evidence are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run build` passed; `npm test` passed against disposable
  PostgreSQL on `localhost:55452`.
- Manual checks: validation-owned Docker container was removed; no
  `chrome-headless-shell` processes were left.
- Screenshots/logs: not applicable
- High-risk checks: production env child-process import tests and production
  CORS behavior test.
- Module confidence ledger updated: yes
- Requirements matrix updated: yes
- Quality scenarios updated: yes
- Risk register updated: yes
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: yes, unknown production browser origin returns
  `403 {"error":"cors_origin_not_allowed"}`.
- Refresh/restart behavior verified: yes, production env validation is checked
  during child-process module import before server startup.
- Regression check performed: full existing protected API flow test passed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: production runtime secrets and browser/API transport
  boundary.
- Trust boundaries: deployment env, HTTP API, browser CORS boundary, service
  API authentication.
- Permission or ownership checks: unchanged.
- Abuse cases: missing production secrets, committed placeholder secret values,
  untrusted browser origin calling API.
- Secret handling: production must provide explicit secret values; no new
  secrets are committed.
- Security tests or scans: focused integration tests for missing secret,
  placeholder secret, and CORS allow/deny behavior.
- Fail-closed behavior: missing/unsafe production env throws before server
  startup; unknown browser origins receive a safe `cors_origin_not_allowed`
  denial.
- Residual risk: log redaction remains ACF-012, outside this task.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`,
  `docs/security/secure-development-lifecycle.md`,
  `docs/operations/coolify-vps-deployment-contract.md`.
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no
- Follow-up architecture doc updates: deployment and security docs updated.

## Deployment / Ops Evidence
- Deploy impact: medium
- Env or secret changes: production now requires explicit
  `AUTH_TOKEN_SECRET`, `API_KEY_HASH_SECRET`, and `INTEGRATION_SECRET_KEY`;
  `COMPANYCORE_ALLOWED_ORIGINS` is configurable.
- Health-check impact: unsafe production env fails before healthy startup.
- Smoke steps updated: deployment env contract updated; post-deploy smoke
  remains unchanged because health should fail when required env is absent.
- Rollback note: set required env values or redeploy the previous commit if
  production env has not yet been populated.
- Observability or alerting impact: startup failure is visible in backend logs.
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: yes

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to iteration rotation.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.

## Result Report
- Task summary: closed production secret fallback and open production CORS
  audit findings.
- Files changed: `src/config/env.ts`, `src/app.ts`,
  `src/middleware/error-handler.ts`, `src/tests/api.test.ts`, `.env.example`,
  `docker-compose.coolify.yml`, security/deployment docs, and canonical state
  files.
- How tested: `npm run build`; `npm test` against disposable PostgreSQL on
  `localhost:55452`; cleanup checks.
- What is incomplete: log redaction remains ACF-012/P2; production deploy is
  pending operator env availability and normal release workflow.
- Next steps: ACF-DOC-001 Coverage Ledger Reconciliation.
- Decisions made: production CORS defaults to the documented CompanyCore web
  and API domains, with `COMPANYCORE_ALLOWED_ORIGINS` as the explicit operator
  override.
