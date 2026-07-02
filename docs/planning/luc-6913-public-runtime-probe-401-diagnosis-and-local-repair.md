# Task

## Header
- ID: LUC-6913
- Title: Diagnose public runtime probe 401 readiness/build-info failures
- Task Type: deployment-reliability
- Current Stage: release
- Status: DONE
- Owner: Deployment Reliability Engineer
- Depends on: LUC-6912
- Priority: P1
- Module Confidence Rows: Roost public runtime readiness probe
- Iteration: 2026-07-02
- Operation Mode: BUILDER
- Mission ID: LUC-6913
- Mission Status: VERIFIED_IN_PRODUCTION

## Goal
Classify and repair the Project Truth public runtime probe failures where
`/api/build-info` and `/ready` returned `401 missing_api_key` on the public
Roost runtime.

## Scope
- `src/health/health.routes.ts`
- `src/app.ts`
- `src/tests/api.test.ts`
- Public read-only probe evidence for:
  - `https://roost.luckysparrow.ch`
  - `https://roost.luckysparrow.ch/api/build-info`
  - `https://roost.luckysparrow.ch/health`
  - `https://api.roost.luckysparrow.ch/health`
  - `https://api.roost.luckysparrow.ch/v1/health`
  - `https://api.roost.luckysparrow.ch/ready`

## Implementation Plan
1. Reproduce the public probe result without credentials or protected smoke.
2. Inspect the local route/auth order to classify whether the probes are
   missing, incorrectly protected, or production-proxy-only failures.
3. Implement the smallest app-level public aliases using existing safe build
   metadata.
4. Add focused regression coverage for the public aliases.
5. Run local build and route probes.
6. Record the remaining source-control and deployment gate before production
   verification.

## Acceptance Criteria
- [x] Root cause is classified with public probe and route-order evidence.
- [x] `/ready`, `/v1/ready`, and `/api/build-info` are public before
      `requireApiKey`.
- [x] Public aliases reuse the existing safe `/health` metadata shape and do
      not expose credentials.
- [x] Local production-mode proof returns `200` for the new aliases and keeps
      protected API routes fail-closed without an API key.
- [x] Source-control repair commit exists: `6913628cf180a359bb0a3774d71c2b7855bfe0e5`
      from [LUC-6914](/LUC/issues/LUC-6914).
- [x] Production Project Truth public probe passes after release gate approval
      and deployment.

## Root Cause
The Project Truth probe contract expected two public runtime endpoints:
`https://roost.luckysparrow.ch/api/build-info` and
`https://api.roost.luckysparrow.ch/ready`. The application only mounted
`/health` and `/v1/health` as public health routes. Because `/api/build-info`
and `/ready` had no public route, they fell through to `requireApiKey` and
returned `401 missing_api_key`.

This is an app route-contract gap, not a bad service key or provider credential
problem.

## Validation Evidence
- Public no-secret probe before repair:
  - `https://roost.luckysparrow.ch` returned `200`.
  - `https://roost.luckysparrow.ch/api/build-info` returned `401
    missing_api_key`, request id `28b52b41-3fc2-4ef0-af8e-bb97973c09a3`.
  - `https://roost.luckysparrow.ch/health` returned `200` with build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
  - `https://api.roost.luckysparrow.ch/health` returned `200` with the same
    build commit.
  - `https://api.roost.luckysparrow.ch/v1/health` returned `200`.
  - `https://api.roost.luckysparrow.ch/ready` returned `401 missing_api_key`,
    request id `634b986c-d961-443c-88b2-f18f008da965`.
- Code inspection:
  - `src/app.ts` mounted `/health` and `/v1/health` before `requireApiKey`.
  - No `/ready`, `/v1/ready`, or `/api/build-info` route existed before this
    change.
- Local verification:
  - `npm run build:server` PASS.
  - Local production-mode built-app probe PASS:
    - `/health` -> `200`
    - `/v1/health` -> `200`
    - `/ready` -> `200`
    - `/v1/ready` -> `200`
    - `/api/build-info` -> `200`
    - `/v1/connection` without API key -> `401 missing_api_key`
  - `git diff --check -- src/health/health.routes.ts src/app.ts src/tests/api.test.ts`
    PASS with line-ending warnings only.

## Result Report
- Task summary: implemented public readiness/build-info aliases locally by
  reusing the existing health metadata helper and mounting the aliases before
  protected API middleware.
- Files changed by this lane:
  - `src/health/health.routes.ts`
  - `src/app.ts`
  - `src/tests/api.test.ts` probe assertions
- Pre-existing dirty file note: `src/tests/api.test.ts` was already modified
  before this heartbeat; unrelated settings-profile test changes in that file
  were not authored by this lane and were not reverted.
- What remains: production still runs the previous code until release gate
  approval/routing and deploy occur. The public Project Truth probe remains
  failing in production.
- Deploy impact: release-impacting backend route repair, no database migration.
- Required release path:
  1. [LUC-6916](/LUC/issues/LUC-6916) approves or routes the production
     release mutation for commit `6913628cf180a359bb0a3774d71c2b7855bfe0e5`
     with target branch/remote, Coolify resource identity, rollback target,
     and smoke requirements.
  2. DRE/Ops performs the approved deploy path only after the release gate is
     satisfied.
  3. After deploy, run the public no-secret probes and Project Truth apply
     with `ROOST_PUBLIC_URL` and `ROOST_API_PUBLIC_URL`.
- Protected actions: none. No credential value read, secret disclosure,
  protected smoke, provider mutation, push, deploy, restart, browser, Docker,
  database, or production mutation occurred.
- Source-control disposition: [LUC-6914](/LUC/issues/LUC-6914) committed the
  route repair as `6913628cf180a359bb0a3774d71c2b7855bfe0e5` (short
  `6913628c`). Current local branch still has broader unrelated dirty state
  and is ahead of `origin/main`; no push was performed in this heartbeat.

## 2026-07-02 Parent Closure Verification

- Wake reason: blockers resolved. [LUC-6916](/LUC/issues/LUC-6916) and
  [LUC-6918](/LUC/issues/LUC-6918) are complete, so the parent release gate is
  no longer blocked.
- Source and deploy state: local `HEAD` and `origin/main` both point to
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- Direct public no-secret probe after deployment:
  - `https://api.roost.luckysparrow.ch/health` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/v1/health` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/ready` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://api.roost.luckysparrow.ch/v1/ready` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://roost.luckysparrow.ch/api/build-info` -> `200`, build commit
    `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
  - `https://roost.luckysparrow.ch/` -> `200`.
  - `https://api.roost.luckysparrow.ch/v1/connection` remains fail-closed at
    `401 missing_api_key` without credentials, request id
    `064b6137-5359-4e79-9850-d8c4abfb6226`.
- Project Truth apply with public URLs generated
  `2026-07-02T15:23:33.218Z`; `publicProbe.status=pass`,
  `criticalRuntimeFindings=0`, `operationalGateGaps=0`, `totalGaps=0`, and
  `firstGap=null`.
- Final classification: the original failure was an application public route
  contract gap. It is now repaired in source, deployed to production, and
  verified by direct no-secret probes plus Project Truth.
- Protected actions: none in this closure heartbeat. No protected smoke,
  credential value read, secret disclosure, manual Coolify restart, browser,
  Docker, database, or additional production mutation occurred.

## 2026-07-02 Child-Completion Verification

- Wake reason: child issue completed. [LUC-6914](/LUC/issues/LUC-6914) closed
  the source-control path with commit
  `6913628cf180a359bb0a3774d71c2b7855bfe0e5`.
- Direct public no-secret probe after the child completed:
  - `https://roost.luckysparrow.ch/` -> `200`.
  - `https://api.roost.luckysparrow.ch/health` -> `200`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
  - `https://api.roost.luckysparrow.ch/v1/health` -> `200`, same build
    commit.
  - `https://api.roost.luckysparrow.ch/ready` -> `401 missing_api_key`,
    request id `f7ffb1b5-a30b-497c-ae8a-51f5a061866c`.
  - `https://api.roost.luckysparrow.ch/v1/ready` -> `401 missing_api_key`,
    request id `51090bf8-f29e-4715-b640-5819229410bb`.
  - `https://roost.luckysparrow.ch/api/build-info` ->
    `401 missing_api_key`, request id
    `2a562cab-0387-4119-aca5-781229f75014`.
  - `https://api.roost.luckysparrow.ch/v1/connection` remains
    `401 missing_api_key` without an API key, as expected.
- Project Truth apply with public URLs generated
  `2026-07-02T15:02:50.246Z`; public probe status remains `failed` with
  `criticalRuntimeFindings=1`, `operationalGateGaps=2`, and first gap owner
  `Deployment Reliability Engineer + Ops Release Lead`.
- Classification: the application repair exists locally and in source control,
  but production still serves old build `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
  The remaining blocker is release mutation approval/routing and production
  deploy verification, not additional route implementation.
- Follow-up created: [LUC-6916](/LUC/issues/LUC-6916) asks the CTO to approve
  or route the production release mutation for commit `6913628c` with exact
  target resource, rollback, and smoke requirements.
