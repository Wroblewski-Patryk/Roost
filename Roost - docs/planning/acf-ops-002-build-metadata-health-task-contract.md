# ACF-OPS-002 Build Metadata Health Restoration

## Header
- ID: ACF-OPS-002
- Title: Build Metadata Health Restoration
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release + Backend Builder
- Depends on: ACF-OPS-001
- Priority: P2
- Coverage Ledger Rows: AGRUN-COV-008 release automation
- Module Confidence Rows: ACF-OPS-002 deploy metadata health
- Requirement Rows: ACF-OPS-002
- Quality Scenario Rows: deployment observability, release traceability
- Risk Rows: stale deployment proof, unknown running image
- Iteration: post-UX100 ops follow-up
- Operation Mode: BUILDER
- Mission ID: ACF-OPS-002
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation task.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed by operating-system startup.
- [x] Missing or template-like state tables were not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: restore comparable public build metadata for health checks
  so a future push-to-running-image proof can verify the running revision.
- Release objective advanced: deployment observability and Coolify evidence.
- Included slices: env fallback, Coolify compose metadata wiring, health tests,
  deployment docs, state docs.
- Explicit exclusions: performing a production deploy, proving auto-deploy,
  changing secrets, or changing runtime topology.
- Checkpoint cadence: implement, validate locally, update docs, commit/push.
- Stop conditions: health metadata would require secret exposure, architecture
  mismatch, or production access.
- Handoff expectation: next agent can deploy and compare public `/health`
  metadata against the pushed commit.

## Context
ACF-OPS-001 proved public uptime but found that both web and API health
reported `build.commit="unknown"` and `build.image="unknown"`, making
auto-deploy impossible to prove from public evidence. Coolify documentation
states that predefined variables such as `SOURCE_COMMIT` can be referenced by
application environment variables, while including `SOURCE_COMMIT` in Docker
Compose builds is disabled by default unless enabled in Advanced settings.

## Goal
Make build metadata restoration explicit and testable without exposing secrets
or relying on chat-only Coolify knowledge.

## Scope
- `src/config/env.ts`
- `docker-compose.coolify.yml`
- `.env.example`
- `src/tests/api.test.ts`
- deployment/operations docs and state files

## Implementation Plan
1. Reuse the existing public health `build` response and env contract.
2. Add safe non-secret fallbacks for Coolify runtime/container variables.
3. Wire Coolify compose build/runtime metadata from `SOURCE_COMMIT` and
   `COOLIFY_CONTAINER_NAME`.
4. Add a regression test proving production health reports Coolify metadata.
5. Update operations docs and state evidence.

## Acceptance Criteria
- [x] Production env can derive `build.commit` from `SOURCE_COMMIT` when
  `COMPANYCORE_BUILD_COMMIT` is not explicitly set.
- [x] Production env can derive `build.image` from a safe Coolify/container
  runtime variable instead of returning `unknown` when available.
- [x] `docker-compose.coolify.yml` passes `SOURCE_COMMIT` into the backend
  build/runtime metadata path.
- [x] Automated tests cover health metadata derivation.
- [x] Deployment docs explain the remaining Coolify setting required for
  source-commit build args.

## Validation Evidence
- Tests: `npm run build`, `git diff --check`, and `npm run test:api` passed.
  `npm run test:api` used portable PostgreSQL on `localhost:55475` and added a
  sixth API test for production health metadata.
- Manual checks: source review of `docker-compose.coolify.yml`, public health
  contract, and Coolify official docs for `SOURCE_COMMIT` behavior.
- Reality status: verified

## Result Report
- Task summary: restored source-level health metadata wiring for production
  deploy proof without changing the public health endpoint shape.
- Files changed: `src/config/env.ts`, `docker-compose.coolify.yml`,
  `.env.example`, `src/tests/api.test.ts`, this task contract, deployment
  contract, and canonical state/queue/evidence files.
- How tested: `npm run build`; `git diff --check`; `npm run test:api` against
  portable PostgreSQL on `localhost:55475`.
- What is incomplete: public push-to-running-image proof still needs the next
  deployed runtime to expose the pushed commit through `/health`.
- Next steps: after the next deploy, compare public `/health` `build.commit`
  with the pushed commit and record the verdict.
