# LUC-4847 Relationships Evidence Visibility Repair

## Header
- ID: LUC-4847
- Title: Repair Relationships evidence visibility for proof ladder
- Task Type: implementation
- Current Stage: verification
- Status: DONE
- Owner: CTO / Frontend implementation
- Depends on: [LUC-4844](/LUC/issues/LUC-4844)
- Priority: P1
- Module Confidence Rows: Relationships context/API/web route; DMS-V1-006; local proof-ladder continuity
- Iteration: 2026-06-20 implementation heartbeat
- Operation Mode: BUILDER
- Mission ID: LUC-4847-RELATIONSHIPS-EVIDENCE-VISIBILITY-REPAIR
- Mission Status: VERIFIED_DONE

## Goal

Repair `/areas?area=05-relacje&view=overview` so the Relationships overview
renders the note, Drive file, and graph/provenance evidence that caused the
[LUC-4844](/LUC/issues/LUC-4844) browser proof to fail.

## Scope

Included:
- `web/src/features/departments/relationships-route.tsx`
- Existing `GET /v1/relationships/context` packet fields:
  `notes`, `driveFiles`, `decisions`, `summary`, and `agentPacket`
- Local API/database proof
- Authenticated desktop/mobile browser proof
- Synthetic backend error-state proof
- Cleanup proof

Excluded:
- Backend API contract changes
- Schema or migration changes
- New write actions
- Protected smoke
- Deploy, push, restart, or production mutation
- Production credential or production data access

## Implementation Plan

1. Inspect [LUC-4844](/LUC/issues/LUC-4844) proof evidence and the Relationships
   route.
2. Reuse existing route/card patterns to add visible sections for relationship
   notes, Relationship Drive files, and provenance/graph evidence.
3. Keep the route read-only and preserve existing clients, interactions, tasks,
   and blocked-action evidence.
4. Run the narrow web build, then rerun the local API and desktop/mobile proof
   ladder.
5. Clean up the temporary backend, local validation database, and browser
   processes.

## Acceptance Criteria

- [x] Relationship notes returned by `/v1/relationships/context` are visible.
- [x] Relationship Drive files returned by `/v1/relationships/context` are visible.
- [x] Graph/provenance evidence is visible in the Relationships overview.
- [x] Existing client, stakeholder, interaction, task, and blocked-action
      evidence remains visible.
- [x] Error state avoids raw backend/provider message leakage.
- [x] No backend API, schema, migration, protected smoke, deploy, push,
      restart, production mutation, credential access, secret disclosure, or
      production data access occurs.
- [x] Cleanup removes the temporary backend, test database container, and
      browser process.

## Evidence

Implementation:
- `web/src/features/departments/relationships-route.tsx` now renders:
  relationship notes, Relationship Drive files, and a
  `Graph / provenance` evidence strip using existing packet fields.

Validation:
- `npm run build:web` PASS.
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` PASS after server/web
  build, all `31` migrations, seed, and `7/7` API subtests.
- Temporary backend: `node dist/server.js` on `http://127.0.0.1:3236`.
- Focused Playwright proof PASS on desktop `1366x900` and mobile `390x844`.
- Evidence artifacts:
  `docs/ux/evidence/luc-4847-relationships-evidence-visibility-2026-06-20/`.
- Report:
  `docs/ux/evidence/luc-4847-relationships-evidence-visibility-2026-06-20/relationships-evidence-visibility-report.json`.
- Screenshots:
  `relationships-desktop.png`, `relationships-mobile.png`, and
  `relationships-error-state.png`.

The seeded API/context proof returned:
- `summary.clients=1`
- `summary.stakeholders=1`
- `summary.interactions=1`
- `summary.relationshipNotes=1`
- `summary.relationshipDriveFiles=1`
- `summary.activeDecisions=1`
- `notes.length=1`
- `driveFiles.length=1`
- `decisions.length=1`
- `blockedActions=4`

The browser proof passed these checks on desktop and mobile:
- route loaded
- client visible
- stakeholder signal visible
- recent interaction visible
- relationship task visible
- relationship note visible
- Relationship Drive file visible
- graph/provenance evidence visible
- no raw backend error leakage
- no console issues
- no relevant failed requests after filtering known local font abort noise

Error-state proof:
- Synthetic `/v1/relationships/context` backend failure showed user-safe
  language.
- The raw synthetic `Prisma raw provider stack leak` and
  `internal_server_error` strings were not visible.

Cleanup proof:
- Temporary backend port `3236` had no listener after cleanup.
- `companycore-test-postgres` was removed.
- No `chrome-headless-shell` process remained.

## Result Report

Task summary: implemented and verified the Relationships overview repair for
the [LUC-4844](/LUC/issues/LUC-4844) browser-rung failure. The route now shows
the evidence already returned by `/v1/relationships/context`, without adding
new backend contracts or write actions.

Files changed:
- `web/src/features/departments/relationships-route.tsx`
- `docs/planning/luc-4847-relationships-evidence-visibility-repair.md`
- Source-of-truth state files updated for mission/board/module confidence.
- Evidence artifacts added under
  `docs/ux/evidence/luc-4847-relationships-evidence-visibility-2026-06-20/`.

What is incomplete: protected production proof remains outside this local lane
and still requires the established release/credential approval path.

Residual risk: low for the local route repair. The proof used local fixture data
and filtered known local font request abort noise that does not affect the
Relationships evidence visibility acceptance criteria.
