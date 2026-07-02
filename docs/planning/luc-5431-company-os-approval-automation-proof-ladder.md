# LUC-5431 Company OS Approval And Automation Proof Ladder

Date: 2026-06-21
Issue: [LUC-5431](/LUC/issues/LUC-5431)
Parent: [LUC-5421](/LUC/issues/LUC-5421)
Role: QA and Verification Engineer
Task Type: QA verification
Current Stage: verification
Status: VERIFIED_DONE
Owner: QA/Test
Priority: P1
Operation Mode: TESTER
Mission ID: LUC-5431-COMPANY-OS-APPROVAL-AUTOMATION-PROOF

## Goal

Select one focused QA proof ladder from the [LUC-5421](/LUC/issues/LUC-5421)
app-completion confidence debt, avoid duplicating recent proof lanes, and
decide whether a product repair issue is warranted.

## Scope

- Source packet:
  `docs/planning/luc-5421-known-state-evidence-and-architecture-baseline.md`
- Current app-completion index:
  `docs/status/app-completion-index.json`
- Selected flow: `Unclassified user workflow`
- Selected sub-slice: Company OS approval lifecycle, stage lifecycle,
  pipeline-run evidence links, knowledge links, event/audit readback, and
  automation-rule dry-run/execute/idempotency behavior.
- Mapped surfaces:
  - `src/app.ts#/company-os`
  - `src/modules/company-os/company-os.routes.ts`
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/modules/events/events.routes.ts`
  - `src/modules/events/event.service.ts`
  - `src/modules/process-core/process-core.routes.ts`
  - `src/tests/api.test.ts`
  - `docs/architecture/nodes/generated/FEAT-AUTO-0006.md`
  - `docs/architecture/nodes/generated/API-AUTO-0119.md`
  - `docs/architecture/nodes/generated/API-AUTO-0120.md`
  - `docs/architecture/nodes/generated/API-AUTO-0121.md`
  - `docs/architecture/nodes/generated/API-AUTO-0122.md`
  - `docs/architecture/nodes/generated/API-AUTO-0123.md`
  - `docs/architecture/nodes/generated/API-AUTO-0124.md`
  - `docs/architecture/nodes/generated/API-AUTO-0125.md`
  - `docs/architecture/nodes/generated/API-AUTO-0168.md`
  - `docs/architecture/nodes/generated/API-AUTO-0169.md`
- Exclusions: no product code, schema, migration authoring, browser proof,
  protected smoke, deploy, push, restart, production mutation, credential
  access, secret disclosure, live provider action, or long-running server.

## Selection Rationale

Recent same-wave proof ladders already covered Account access,
Subscription/Entitlement, Dashboard overview, User configuration, Exchange
connection/configuration, Strategy/Trading, Relationship/Operating Graph,
Intake routing, department read-context lanes, the broad
`Unclassified user workflow` API-backbone lane in
[LUC-5425](/LUC/issues/LUC-5425), and the ClickUp/provider task-sync lane in
[LUC-5427](/LUC/issues/LUC-5427). This proof stays inside the remaining
unclassified confidence debt but narrows to the local Company OS governance
command path.

The selected sub-slice is not a live provider action. It verifies local
approval, stage, event, audit, knowledge-link, and automation behavior that
supports agent-operable governance and fail-closed lifecycle control.

The current app-completion snapshot generated `2026-06-21T02:17:29.656Z`
reports `845` items, `7` flows, `826` missing test links, `0`
browser-review needs, `0` missing doc links, and `2` blocked items.

## Proof Run

| Check | Result | Evidence |
| --- | --- | --- |
| Local API ladder | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5431-postgres COMPANYCORE_TEST_DB_PORT=55531 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` |
| Build | PASS | The local ladder ran server TypeScript build and Vite web build. |
| Migrations | PASS | All `31` migrations applied to disposable PostgreSQL on `127.0.0.1:55531/companycore_test`. |
| Seed | PASS | `npm run seed` completed inside the local ladder. |
| API tests | PASS | Node test reported `7/7` subtests passed, including `CompanyCore v1 protected API flow` with duration `40797.0565ms`. |
| Route-capability manifest | PASS | `npm run check:route-capabilities` checked `180` manifest routes and `35` route files with status `ok`. |
| Architecture status | PASS | `npm run architecture:status` reported `GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup | PASS | No `companycore-luc-5431-postgres` container remained, no port `55531` listener remained, and no `chrome-headless-shell` process was present. |

## Behavior Covered

The selected proof covers:

- Company OS snapshot readback for definitions, runtime, governance,
  attention, recent audit logs, recent events, and exposed collections;
- approval request and decision lifecycle with audit and event evidence;
- duplicate approval decision denial and cross-workspace decision denial;
- pipeline-run task evidence link creation with audit/event readback and
  cross-workspace denial;
- knowledge-link creation with audit/event readback and cross-workspace denial;
- stage start, block, validate, and complete commands with approval and audit
  evidence;
- automation-rule dry-run proposals, execute behavior, emitted events,
  requested approvals, audit log evidence, and idempotent repeated execution;
- process-core read-only coverage readback and workspace isolation for the
  same governance/evidence data shape.

Primary assertion locations in `src/tests/api.test.ts`: Company OS snapshot
starts at line `4238`; approval request/decision starts at line `4383`;
pipeline-run task link starts at line `4492`; knowledge link starts at line
`4539`; stage lifecycle starts at line `4582`; automation evaluation starts at
line `4807`; process-core coverage starts at line `4297`.

## Acceptance Criteria

- [x] One non-duplicated app-completion proof sub-slice is selected.
- [x] Relevant implementation, route, architecture, and test surfaces are
  mapped.
- [x] The proof runs locally without live provider credentials.
- [x] Route/capability and architecture gates pass.
- [x] Validation resources are cleaned up.
- [x] A repair issue is created only if proof finds a real defect.

## Definition Of Done

- [x] `DEFINITION_OF_DONE.md` reviewed.
- [x] `INTEGRATION_CHECKLIST.md` reviewed for applicable integrated runtime
  checks.
- [x] `NO_TEMPORARY_SOLUTIONS.md` reviewed.
- [x] Existing test harness proves the selected behavior locally.
- [x] No product code, schema, or migration behavior changed.
- [x] No temporary bypass, mock-only runtime path, or placeholder behavior was
  added.
- [x] Evidence is recorded in this packet and synchronized to source-of-truth
  state files.

## Result Report

The selected Company OS approval lifecycle and automation sub-slice is verified
locally. No product repair issue is warranted from this proof.

Residual risk: browser proof for any future owner-facing Company OS workbench
surface and protected production proof remain separate future gates. Deploy
impact is none. Commit/push is not needed for runtime behavior; this heartbeat
only adds docs/state evidence into an already shared dirty workspace awaiting
source-control closure.
