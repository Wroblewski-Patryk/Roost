# LUC-4844 Relationships Context Proof Ladder

## Header
- ID: LUC-4844
- Title: Run Relationships context proof ladder
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-4842](/LUC/issues/LUC-4842)
- Priority: P1
- Module Confidence Rows: Relationships context/API/web route; DMS-V1-006; local proof-ladder continuity
- Iteration: 2026-06-20 QA execution heartbeat
- Operation Mode: TESTER
- Mission ID: LUC-4844-RELATIONSHIPS-CONTEXT-PROOF-LADDER
- Mission Status: VERIFIED_DONE

## Goal

Run the local proof ladder selected by [LUC-4842](/LUC/issues/LUC-4842) for
`05 Relationships -> Context/Overview`.

## Scope

Included:
- `GET /v1/relationships/context`
- `relationships:read`
- `src/modules/relationships/relationships.routes.ts`
- `/areas?area=05-relacje&view=overview`
- `web/src/features/departments/relationships-route.tsx`
- Local API regression proof
- Authenticated local desktop/mobile browser proof
- Error-state and cleanup proof

Excluded:
- Runtime code changes
- Schema or migration changes
- Protected smoke
- Deploy, push, restart, or production mutation
- Production credential or production data access

## Implementation Plan

1. Run `npm run test:api:local`.
2. If green, rerun with `COMPANYCORE_TEST_DB_KEEP=1` to keep a disposable local
   database for browser proof.
3. Start a local backend on port `3236` against the disposable test database.
4. Register a disposable local owner, seed Relationships fixture data in the
   local test database, and prove the real route at desktop `1366x900` and
   mobile `390x844`.
5. Verify user-facing error language by intercepting
   `/v1/relationships/context` with a synthetic backend failure.
6. Stop the local backend, remove the disposable database container, and close
   Playwright.

## Acceptance Criteria

- [x] Local API/database rung passes or records an exact failing command.
- [x] Browser proof runs only after API success.
- [x] Browser proof shows client, stakeholder, interaction, note, Drive, and
      graph/provenance evidence visibility.
- [x] Error state avoids raw backend/provider message leakage.
- [x] Cleanup removes the backend, test database container, and browser process.
- [x] Issue can be marked done without a repair follow-up.

## Evidence

API rung:
- `npm run test:api:local` passed after server/web build, all `31`
  migrations, seed, and `7/7` API subtests.
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` passed again with the
  same build, migration, seed, and `7/7` API result, leaving the disposable
  `companycore_test` database for browser proof setup.

Browser rung:
- Local backend: `node dist/server.js` on `http://127.0.0.1:3236`.
- Playwright Chromium proof required a one-time local browser runtime install:
  `npx playwright install chromium`.
- Evidence artifacts:
  `docs/ux/evidence/luc-4844-relationships-proof-ladder-2026-06-20/`.
- Report:
  `docs/ux/evidence/luc-4844-relationships-proof-ladder-2026-06-20/relationships-proof-report.json`.
- Screenshots:
  `relationships-desktop.png`, `relationships-mobile.png`, and
  `relationships-error-state.png`.

The seeded API/context proof returned:
- `department.canonicalKey=05-relacje`
- `department.backendAreaKey=sales-crm`
- `summary.clients=1`
- `summary.stakeholders=1`
- `summary.interactions=1`
- `summary.relationshipNotes=1`
- `summary.relationshipDriveFiles=1`
- `notes.length=1`
- `driveFiles.length=1`
- `blockedActions=4`

The browser route passed these visible checks:
- Relationships route loaded on desktop and mobile.
- Client row visible.
- Stakeholder signal visible through the client table.
- Recent interaction visible.
- Relationship task visible.
- Blocked write actions visible.
- Synthetic backend error state showed user-safe language and did not expose
  the raw synthetic `Prisma raw provider stack leak` or
  `internal_server_error` strings.

The browser route failed these required checks:
- Relationship note content was present in `/v1/relationships/context` but not
  rendered in the route.
- Relationship Drive file evidence was present in `/v1/relationships/context`
  but not rendered in the route.
- No graph/provenance evidence was visible in the route.

Post-repair rerun:
- [LUC-4847](/LUC/issues/LUC-4847) repaired
  `web/src/features/departments/relationships-route.tsx` so the existing
  `/v1/relationships/context` packet renders relationship notes, Relationship
  Drive files, and `Graph / provenance` evidence.
- `npm run test:api:local` passed after server/web build, all `31`
  migrations, seed, and `7/7` API subtests.
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` passed again with the
  same API result for browser setup.
- Authenticated Playwright Chromium rerun on local backend port `3236` passed
  desktop `1366x900` and mobile `390x844`.
- Rerun evidence artifacts:
  `docs/ux/evidence/luc-4844-relationships-proof-ladder-rerun-2026-06-20/`.
- Rerun report:
  `docs/ux/evidence/luc-4844-relationships-proof-ladder-rerun-2026-06-20/relationships-proof-report.json`
  with `passed=true`.
- Rerun screenshots:
  `relationships-desktop.png`, `relationships-mobile.png`, and
  `relationships-error-state.png`.

The post-repair browser route passed these required checks on desktop and
mobile:
- Relationships route loaded.
- Client row visible.
- Stakeholder signal visible.
- Recent interaction visible.
- Relationship task visible.
- Relationship note visible.
- Relationship Drive file visible.
- Graph/provenance evidence visible.
- Synthetic backend error state showed user-safe language and did not expose
  the raw synthetic `Prisma raw provider stack leak` or
  `internal_server_error` strings.
- No console issues.
- No relevant failed requests.
- No horizontal document/body overflow.

Additional observations:
- The report also flags font requests for Phosphor/Inter as failed request
  noise and narrow overflow samples from `sr-only` or truncated elements. These
  were not treated as the primary blocker because the main proof failure is the
  missing required Relationships evidence visibility.

Cleanup proof:
- Local backend port `3236` no longer has a listening process.
- `companycore-test-postgres` was removed.
- No `chrome-headless-shell` process remained.
- Existing unrelated `soar-postgres-1` and `soar-redis-1` containers were left
  running.

## Result Report

Task summary: the Relationships context proof ladder is verified after the
[LUC-4847](/LUC/issues/LUC-4847) frontend repair. The API rung and
authenticated desktop/mobile browser rung are green.

Repair issue: [LUC-4847](/LUC/issues/LUC-4847) completed the implementation
repair for note, Drive, and graph/provenance evidence visibility.

Files changed: this planning packet plus source-of-truth state updates and
browser evidence artifacts in this QA lane. Runtime source code changes belong
to [LUC-4847](/LUC/issues/LUC-4847).

How tested:
- `npm run test:api:local` PASS.
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` PASS.
- Post-repair authenticated desktop/mobile Playwright rerun PASS with evidence
  in
  `docs/ux/evidence/luc-4844-relationships-proof-ladder-rerun-2026-06-20/relationships-proof-report.json`.

What is incomplete: no local QA blocker remains for this proof ladder.

Residual risk: protected production proof remains outside this local QA lane
and still requires the established release/credential approval path.
