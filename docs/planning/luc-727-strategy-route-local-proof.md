# LUC-727 Strategy Route Local Proof

## Task Contract

- Task Type: QA verification / frontend browser proof
- Current Stage: verification
- Deliverable For This Stage: local browser proof and exact evidence links for
  the Strategy route gap family

## Goal

Add one current local proof slice for the Strategy route family so the
remaining Strategy/Trading app-completion gaps are backed by route-level
browser evidence instead of repeated API-only mapping.

## Scope

- `web/src/features/departments/strategy-route.tsx`
- `web/src/app-route-registry.ts`
- `src/modules/strategy/strategy.routes.ts`
- `scripts/owner-console-ux-smoke.mjs`
- `docs/architecture/scanner-overrides.json`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`

## Exclusions

- No product feature changes unless the proof exposes a real defect.
- No protected smoke, deploy, push, restart, production mutation, live
  provider action, credential disclosure, or secret disclosure.

## Implementation Plan

1. Confirm the current Strategy/Trading gap still maps to the Strategy route
   family rather than a live trading surface.
2. Run the smallest local proof ladder that reaches the frontend route:
   disposable local database, local backend, and authenticated browser proof
   for `/areas?area=01-strategia&view=overview`.
3. Capture exact browser assertions, screenshots, and cleanup evidence.
4. Link the proof packet to the Strategy entities in
   `docs/architecture/scanner-overrides.json`.
5. Update source-of-truth state and close the issue with an evidence-backed
   disposition.

## Acceptance Criteria

- Local proof covers the authenticated Strategy route on at least desktop and
  mobile.
- Evidence records commands, route assertions, artifacts, and cleanup.
- Scanner overrides link the proof to the Strategy route gap family.
- Residual risk is explicit if any Strategy rows remain generated as link debt.

## Definition Of Done

- Strategy route local proof is recorded with inspectable artifacts.
- Relevant source-of-truth files are updated.
- Paperclip issue disposition references the resulting evidence.

## Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Trading-operation gap mapping | `docs/status/app-completion-index.json` still maps the Strategy family to `Trading operation`, including `src/app.ts#/strategy`, `src/modules/strategy/strategy.routes.ts`, and `web/src/features/departments/strategy-route.tsx`. Existing mapping packets: [LUC-5664](/LUC/issues/LUC-5664), [LUC-5417](/LUC/issues/LUC-5417), and [LUC-6145](/LUC/issues/LUC-6145). | PASS |
| Local API readiness rung | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-727-postgres COMPANYCORE_TEST_DB_PORT=55527 COMPANYCORE_TEST_DB_KEEP=1 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS |
| Local server health | Local backend started against `postgresql://companycore:companycore@127.0.0.1:55527/companycore_test?schema=public` on `http://127.0.0.1:31527`; `GET /health` returned `200` with `status=ok`. | PASS |
| Authenticated browser proof | `COMPANYCORE_BASE_URL=http://127.0.0.1:31527`, `COMPANYCORE_OWNER_EMAIL=luc727-owner@example.com`, `COMPANYCORE_OWNER_PASSWORD=luc727-proof-password`, `COMPANYCORE_UX_ROUTES=/areas?area=01-strategia&view=overview`, desktop/mobile viewports, required text assertions, and `npm run owner-console:ux-smoke` | PASS |
| Browser artifacts | `docs/ux/evidence/luc-727-strategy-route-local-proof/report.json`, `desktop-areas-area-01-strategia-view-overview.png`, `mobile-areas-area-01-strategia-view-overview.png` | PASS |
| Cleanup: disposable DB | `docker rm -f companycore-luc-727-postgres` | PASS |
| Cleanup: local server | Route-proof backend listener on `31527` was stopped and follow-up port check returned no listener. | PASS |
| Cleanup: headless browser ownership check | `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned existing PIDs `10708`, `12424`, `32108`, `35396` after the run. Ownership was not attributable to this heartbeat because no pre-run baseline existed, so no shared processes were terminated. | RECORDED |

## Result Report

Status: `verified`.

The local Strategy route proof is complete for the scoped route family. The
browser rung reused the existing owner-console Playwright harness against a
validation-owned local runtime and verified the signed-in desktop and mobile
rendering of `/areas?area=01-strategia&view=overview`. Required route text was
present for `Strategy Management System`, `Metrics`, `Strategic risks`,
`Recent strategic tasks`, and the seeded empty-state `No strategy goals`.
`report.json` recorded `signedIn=true` for both viewports and
`consoleIssues=[]`.

Files changed by this issue:

- `docs/planning/luc-727-strategy-route-local-proof.md`
- `docs/architecture/scanner-overrides.json`
- source-of-truth state/context files updated with the new proof

Commit status: not committed in this heartbeat because the shared workspace is
already mixed-dirty with unrelated active evidence/state packets.

Push status: not pushed.

Deploy impact: none.

Residual risk:

- The app-completion classifier still labels the Strategy family as
  `Trading operation`, so future generated readbacks may continue to use that
  bucket name until scanner/domain curation changes it.
- This proof exercised the Strategy route family and authenticated browser
  rendering. It did not add new private-helper-level direct test links for
  `formatDate`, `asJsonArray`, `taskLooksStrategic`, or `textMatchesStrategy`.

## 2026-07-12 Paperclip Closure Blocker

Repository-side proof and source-of-truth updates are complete, but the local
Paperclip control plane did not accept the final board mutation from this
heartbeat.

Control-plane evidence:

- `POST /api/issues/{issueId}/checkout` at `http://127.0.0.1:3200`: PASS for
  [LUC-727](/LUC/issues/LUC-727); issue remained assigned to `09 FEW`.
- `GET /api/issues/{issueId}` and `GET /api/issues/{issueId}/heartbeat-context`:
  PASS; both read routes returned the current issue state.
- `POST /api/companies/{companyId}/issues/{issueId}/attachments`: PASS for the
  Markdown task packet, `report.json`, and desktop/mobile screenshots after
  explicit content types were supplied for non-image files.
- `POST /api/issues/{issueId}/comments`: FAIL with HTTP `500` and body
  `{\"error\":\"Internal server error\"}`.
- `PATCH /api/issues/{issueId}` with `status=done`: FAIL with HTTP `500` and
  body `{\"error\":\"Internal server error\"}`.

Intended final disposition remains `done` because the proof lane is complete.
Unblock owner: Paperclip local control-plane/runtime owner. Required action:
restore issue comment/status mutation for the local API on `127.0.0.1:3200`,
then set [LUC-727](/LUC/issues/LUC-727) to `done` using the evidence in this
packet and the uploaded attachments.
