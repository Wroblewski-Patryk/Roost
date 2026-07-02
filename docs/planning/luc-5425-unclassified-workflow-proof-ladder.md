# LUC-5425 Unclassified Workflow Proof Ladder

## Task

- Issue: [LUC-5425](/LUC/issues/LUC-5425)
- Parent: [LUC-5418](/LUC/issues/LUC-5418)
- Task Type: QA verification
- Current Stage: verification
- Status: VERIFIED_DONE
- Owner: QA Verification Engineer
- Date: 2026-06-21

## Goal

Select one focused, non-duplicated QA proof ladder from the
[LUC-5418](/LUC/issues/LUC-5418) app-completion confidence debt, prove the
smallest safe local contract, and decide whether a product repair issue is
warranted.

## Scope

- Selected app-completion bucket: `Unclassified user workflow`
- Current app-completion snapshot:
  `docs/status/app-completion-index.json`, generated
  `2026-06-21T02:17:29.656Z`
- Proof surface:
  - `src/tests/api.test.ts`
  - `scripts/test-api-local.mjs`
  - `src/app.ts`
  - `src/modules/company-os/*`
  - `src/modules/process-core/*`
  - route/capability manifest exposure through `src/mcp/manifest.ts`
- Protected exclusions: no push, deploy, restart, protected smoke, production
  mutation, credential access, secret disclosure, live provider action, or
  long-running local server.

## Selection Rationale

Recent proof ladders already covered Account access, Subscription and
entitlement, Dashboard overview, User configuration, Exchange connection and
configuration, Relationship/Operating Graph, Intake routing, read-only
department intelligence, Department/Workforce authority, Strategy, and other
named operating graph slices.

The current app-completion snapshot reports:

| Flow | Count | Current risks |
| --- | ---: | --- |
| Subscription and entitlement | 500 | `484` missing test links, `14` implemented-needs-proof, `2` blocked |
| Unclassified user workflow | 195 | `194` missing test links, `1` implemented-needs-proof |
| Account access | 86 | `85` missing test links, `1` OK |
| User configuration | 54 | `53` missing test links, `1` implemented-needs-proof |
| Dashboard overview | 6 | `6` missing test links |
| Trading operation | 3 | `3` missing test links |
| Exchange connection and configuration | 1 | `1` missing test link |

The least duplicative remaining target is the broad `Unclassified user
workflow` bucket. Because it is scanner-inferred and not a single user journey,
the proof ladder validates the local API backbone that covers its highest-risk
unclassified runtime areas: company OS, process-core coverage, workflow
definition draft/activation/rollback surfaces, generic resource CRUD, route
capability mapping, auth/workspace isolation, and MCP manifest exposure.

## Existing Proof Mapping

`src/tests/api.test.ts` already exercises the unclassified local API backbone
inside `CompanyCore v1 protected API flow`, including:

- unauthenticated denial for protected reads such as
  `/v1/process-core/coverage`;
- authenticated process-core coverage readback and cross-workspace denial;
- company OS snapshot, pipelines, approvals, knowledge links, pipeline run task
  links, stage lifecycle commands, automation rule evaluation, standards, and
  workflow definition drafts;
- workflow draft preview, activation approval, archive, and rollback draft
  behavior for pipeline, process, and procedure roots;
- MCP manifest exposure for `/v1/company-os`, `/v1/process-core/coverage`, and
  workflow command/read routes;
- scoped-key denial for command surfaces that require broader authority;
- generic project/task/goal/target/client/deal/note/decision/agent CRUD and
  cross-workspace isolation.

## Proof Run

| Check | Result | Evidence |
| --- | --- | --- |
| Local API ladder | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5425-postgres COMPANYCORE_TEST_DB_PORT=55525 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` |
| Build | PASS | `npm run test:api:local` ran `npm run build`, including server TypeScript and Vite web build. |
| Migrations | PASS | All `31` migrations applied to `127.0.0.1:55525/companycore_test`. |
| Seed | PASS | `npm run seed` completed inside the local API ladder. |
| API tests | PASS | Node test reported `7/7` subtests passed, including `CompanyCore v1 protected API flow`. |
| Route-capability manifest | PASS | `npm run check:route-capabilities` checked `180` manifest routes and `35` route files with status `ok`. |
| Architecture status | PASS | `npm run architecture:status` reported `GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Validation cleanup | PASS | No `companycore-luc-5425-postgres` container remained, no port `55525` listener remained, and no `chrome-headless-shell` process remained. |

## Result Report

- Selected flow and why: selected `Unclassified user workflow` because all
  named app-completion flows have recent local proof ladders and this bucket
  contains the remaining non-duplicated implemented-needs-proof signal.
- Product repair warranted: no. The selected local API backbone passed the
  established build, migration, seed, API, route/capability, and architecture
  gates.
- Remaining risk: the unclassified bucket is scanner-inferred and still carries
  broad missing-test-link confidence debt. This proof increases local backbone
  confidence but does not replace future browser proof for specific screens or
  protected production proof after approval/credential gates.
- Files changed by this QA lane: this evidence packet plus source-of-truth
  state/context rows only.
- Commit/push: not committed in this heartbeat because the shared workspace
  already contains active parent and sibling generated/status/planning evidence
  awaiting source-control closure in [LUC-5424](/LUC/issues/LUC-5424). Push not
  needed.
- Deploy impact: none.
