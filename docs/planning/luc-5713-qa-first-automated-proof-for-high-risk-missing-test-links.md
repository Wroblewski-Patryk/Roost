# LUC-5713 QA First Automated Proof For High-Risk Missing-Test Links

## Header

- ID: [LUC-5713](/LUC/issues/LUC-5713)
- Title: QA select first automated proof for high-risk missing-test links
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Mission ID: LUC-5713-QA-FIRST-AUTOMATED-PROOF
- Mission Status: VERIFIED

## Goal

Select one high-risk, low-blast-radius proof target from Account access or
User configuration, add the smallest useful automated proof, and run the narrow
local validation command.

## Scope

- Chosen entity/user flow: `User configuration`
- Runtime surfaces: `/account/settings`, `/workspace/settings`
- Shared contract: `GET /v1/auth/me` and legacy mount `GET /auth/me`
- Code changed: `src/tests/api.test.ts`

## Selection Rationale

The current app-completion index generated `2026-06-27T23:17:24.780Z` still
reports broad missing-test-link debt. Account access already has recent local
proof through [LUC-5561](/LUC/issues/LUC-5561) and
[LUC-5661](/LUC/issues/LUC-5661). User configuration has an existing settings
proof packet, but the current automated API suite did not have a small named
test proving the exact owner profile fields rendered by `/account/settings`
and `/workspace/settings`.

The selected proof avoids browser/runtime expansion and validates the real
Express, auth-token, workspace-membership, Prisma, migration, and seed path.

## Implementation

Added the `node:test` case:

`account and workspace settings profile contract exposes active owner workspace`

The test registers a disposable owner, calls `GET /v1/auth/me`, and proves the
settings packet exposes `authType`, `userId`, active `workspaceId`, workspace
`name`, membership `role`, and active workspace flag. It also calls
`GET /auth/me` and proves the legacy mount returns the same workspace profile
contract.

## Verification

Command run with disposable PostgreSQL container `companycore-luc-5713-postgres`
on port `55573`:

```powershell
$env:DATABASE_URL="postgresql://companycore:companycore@127.0.0.1:55573/companycore_test?schema=public"
$env:NODE_ENV="test"
npm run build:server
npm run prisma:migrate:deploy
npm run seed
node --test --test-name-pattern "account and workspace settings profile contract" dist/tests/api.test.js
```

Result:

- Docker engine available: `28.3.2`
- `npm run build:server`: PASS
- `npm run prisma:migrate:deploy`: PASS, `31` migrations applied
- `npm run seed`: PASS
- Scoped `node:test`: PASS, `1/1` tests
- `git diff --check -- src/tests/api.test.ts`: PASS with expected Windows
  LF-to-CRLF warning only
- Cleanup: validation container removed; no `chrome-headless-shell` process
  rows found

## Definition Of Done Check

- Code builds without errors: yes
- Real API path used: yes
- No mock-only product behavior added: yes
- Existing systems reused: yes
- Deployment impact: none
- Push/deploy/protected smoke: not run by scope

## Residual Risk

This is an API contract proof for the settings profile packet, not a browser
layout proof. Browser settings proof remains covered by earlier UX evidence and
should only be rerun if settings UI changes or a fresh regression appears.

The aggregate missing-test-link count remains broad app-completion
evidence-link debt; this task moves one concrete User configuration contract
toward tested but does not close scanner curation for every settings-related
document or generated node.

## Result Report

- Task summary: selected User configuration settings profile as the first
  non-duplicative automated proof target and added a named API test.
- Files changed: `src/tests/api.test.ts`; this evidence packet; state ledgers.
- How tested: scoped local API proof with disposable PostgreSQL, server build,
  migrations, seed, and one named Node test.
- What is incomplete: broad app-completion missing-test-link curation remains.
- Next steps: Docs/Scanner can link generated settings rows to this proof;
  QA should wait for a fresh concrete runtime row before adding another proof.
