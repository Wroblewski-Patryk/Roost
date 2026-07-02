# LUC-5427 ClickUp Provider And Task Sync Proof Ladder

Date: 2026-06-21
Issue: [LUC-5427](/LUC/issues/LUC-5427)
Parent: [LUC-5420](/LUC/issues/LUC-5420)
Role: Test Automation Engineer
Task Type: QA verification
Current Stage: verification
Status: VERIFIED_DONE
Owner: QA/Test
Priority: P1
Operation Mode: TESTER
Mission ID: LUC-5427-CLICKUP-PROVIDER-TASK-SYNC-PROOF

## Goal

Select one focused QA proof ladder from the [LUC-5420](/LUC/issues/LUC-5420)
app-completion confidence debt, avoid duplicating recent proof lanes, and
decide whether a product repair issue is warranted.

## Scope

- Source packet:
  `docs/planning/luc-5420-known-state-evidence-and-architecture-baseline.md`
- Current app-completion index:
  `docs/status/app-completion-index.json`
- Selected flow: `Unclassified user workflow`
- Selected sub-slice: ClickUp provider event, webhook, maintenance, native task
  sync, outbound task/custom-field/archive behavior, notes/comments, and event
  evidence.
- Mapped surfaces:
  - `src/integrations/clickup/clickup.client.ts`
  - `src/integrations/clickup/clickup.mapper.ts`
  - `src/integrations/clickup/clickup.sync.ts`
  - `src/integrations/clickup/clickup.webhooks.ts`
  - `src/integrations/clickup/webhook-signature.ts`
  - `src/modules/integration-settings/integration-settings.routes.ts`
  - `src/modules/tasks/tasks.routes.ts`
  - `src/modules/notes/notes.routes.ts`
  - `src/modules/intake/intake.routes.ts`
  - `src/tests/api.test.ts`
- Exclusions: no product code, schema, migration authoring, browser proof,
  protected smoke, deploy, push, restart, production mutation, credential
  access, secret disclosure, live provider action, or long-running server.

## Selection Rationale

Recent same-wave proof ladders already covered Account access,
Subscription/Entitlement, Dashboard overview, User configuration, Exchange
connection/configuration, Strategy/Trading, and the broad
`Unclassified user workflow` API-backbone lane in
[LUC-5425](/LUC/issues/LUC-5425). This proof therefore stays inside the same
remaining unclassified confidence debt but narrows to the ClickUp provider
event and task-sync sub-slice, which is a distinct integration behavior path.

The current app-completion snapshot generated `2026-06-21T02:17:29.656Z`
reports `845` items, `7` flows, `826` missing test links, `0` browser-review
needs, `0` missing doc links, and `2` blocked items.

## Proof Run

| Check | Result | Evidence |
| --- | --- | --- |
| Local API ladder | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5427-postgres COMPANYCORE_TEST_DB_PORT=55527 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` |
| Build | PASS | The local ladder ran server TypeScript build and Vite web build. |
| Migrations | PASS | All `31` migrations applied to disposable PostgreSQL on `127.0.0.1:55527/companycore_test`. |
| Seed | PASS | `npm run seed` completed inside the local ladder. |
| API tests | PASS | Node test reported `7/7` subtests passed, including `CompanyCore v1 protected API flow`. |
| Route-capability manifest | PASS | `npm run check:route-capabilities` checked `180` manifest routes and `35` route files with status `ok`. |
| Architecture status | PASS | `npm run architecture:status` reported `GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup | PASS | No `companycore-luc-5427-postgres` container remained, no port `55527` listener remained, and no `chrome-headless-shell` process was present. |

## Behavior Covered

The selected proof covers:

- ClickUp webhook signature denial and valid processing;
- failed provider event listing and retry;
- webhook reconcile, list, and delete behavior;
- ClickUp discovery failure modes;
- maintenance run behavior with webhook reconciliation, retry status, sync
  summary, and inbox health;
- native sync modes: `merge`, `skip_existing`, `inspect_only`, and
  `replace_selected_lists`;
- workspace isolation for imported provider tasks and events;
- outbound ClickUp-backed task creation, custom-field update, and archive;
- ClickUp note/comment bridging and event evidence.

## Acceptance Criteria

- [x] One non-duplicated app-completion proof sub-slice is selected.
- [x] Relevant implementation and test surfaces are mapped.
- [x] The proof runs locally without live provider credentials.
- [x] Route/capability and architecture gates pass.
- [x] Validation resources are cleaned up.
- [x] A repair issue is created only if proof finds a real defect.

## Definition Of Done

- [x] `DEFINITION_OF_DONE.md` reviewed.
- [x] Existing test harness proves the selected behavior locally.
- [x] No product code, schema, or migration behavior changed.
- [x] No temporary bypass, mock-only runtime path, or placeholder behavior was
  added.
- [x] Evidence is recorded in this packet and synchronized to source-of-truth
  state files.

## Result Report

The selected ClickUp/provider event and task-sync sub-slice is verified
locally. No product repair issue is warranted from this proof.

Residual risk: owner-facing browser proof for ClickUp/settings/task workbench
surfaces and protected production provider smoke remain separate future gates.
Deploy impact is none. Commit/push is not needed for runtime behavior; this
heartbeat only adds docs/state evidence into an already shared dirty workspace
awaiting source-control closure.
