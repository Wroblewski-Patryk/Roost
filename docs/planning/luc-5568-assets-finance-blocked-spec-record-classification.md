# LUC-5568 Assets/Finance Blocked Spec Record Classification

Date: 2026-06-27
Issue: [LUC-5568](/LUC/issues/LUC-5568)
Stage: verification

## Task Contract

- Goal: classify the app-completion blocked spec records from the Assets and
  Finance planning docs and decide whether they represent active product
  blockers, stale planning-status debt, or specialist follow-up work.
- Task Type: architecture/planning classification
- Current Stage: verification
- Deliverable For This Stage: evidence-backed classification packet and
  source-of-truth updates.
- Operation Mode: BUILDER
- Lane model: single-lane; no subagent delegation used because the work is a
  tightly scoped architecture/planning evidence classification.

## Scope

Included:

- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/planning/cc-08-001-assets-resource-system-spec.md`
- `docs/planning/cc-08-001-assets-resource-system-spec-task-contract.md`
- `docs/planning/cc-08-002-assets-context-read-api-task-contract.md`
- `docs/planning/luc-4821-assets-files-folders-proof-ladder.md`
- `docs/planning/luc-5201-assets-preview-api-journey-proof.md`
- `docs/planning/dms-07-finance-system-spec.md`
- `docs/planning/dms-07-finance-system-spec-task-contract.md`
- `docs/planning/dms-07-finance-context-read-api-task-contract.md`
- `docs/planning/dms-07-finance-web-board-task-contract.md`
- `docs/planning/luc-5184-finance-api-journey-proof.md`
- `docs/planning/luc-5392-subscription-entitlement-finance-proof-ladder.md`
- `docs/planning/luc-5433-finance-browser-proof-ladder.md`

Excluded:

- Product code, schema, migration, test authoring, generated scanner changes,
  protected smoke, production mutation, credential access, push, deploy,
  source-control commit, local server, browser, Docker, or long-running
  process.

## App-Completion Blocked Records

Current snapshot:

- `docs/status/app-completion-index.json` generated
  `2026-06-27T14:49:44.922Z`
- Counts: `845` items, `7` flows, `826` missing test links, `0` missing doc
  links, `2` blocked items.

| Record | Scanner path | Flow | Scanner status | Classification |
| --- | --- | --- | --- | --- |
| `document:cc-08-001-assets-resource-system-spec:9be168cc00` | `docs/planning/cc-08-001-assets-resource-system-spec.md` | `Subscription and entitlement` | `blocked` | Stale planning-blocker label; runtime Assets context, files/folders UI, and preview API proof are already verified locally. |
| `document:dms-07-001-finance-system-spec:2c4dc94c71` | `docs/planning/dms-07-finance-system-spec.md` | `Subscription and entitlement` | `blocked` | Stale planning-blocker label; Finance read API, read-only web board, API proof, subscription/entitlement QA proof, and browser proof are already verified locally. |

## Classification Evidence

### Assets

| Evidence | Status | Notes |
| --- | --- | --- |
| `CC-08-001 Assets Resource System Spec` | verified planning spec | Defines resource taxonomy, AI-readiness labels, read packet, and blocked provider actions. The task contract is `DONE` with `git diff --check` evidence. |
| `CC-08-002 Assets Context Read API` | implemented and verified | `GET /v1/assets/context` exists under `assets:read`, with MCP read-risk exposure, workspace isolation, no-mutation proof, and blocked actions. Evidence: `npm run build:server` and `npm run test:api` passed against disposable PostgreSQL. |
| [LUC-4821](/LUC/issues/LUC-4821) Assets files/folders proof ladder | verified | Local API and authenticated desktop/mobile UI proof passed for `/areas?area=08-zasoby&view=files`; error recovery and cleanup verified. |
| [LUC-5201](/LUC/issues/LUC-5201) Assets preview API proof | verified | `GET /v1/assets/files/:id/preview` is covered for unauthenticated denial, unsupported media, foreign workspace isolation, image response headers, exact bytes, route/capability drift, architecture continuity, and cleanup. |

Assets decision: the blocked scanner record is not an active product blocker
and does not warrant a repair child issue. It is a stale planning/spec status
classification in the app-completion projection. Remaining Assets risk is
release-level protected production/real Drive proof, not an app-completion
spec-blocker repair.

### Finance

| Evidence | Status | Notes |
| --- | --- | --- |
| `DMS-07-001 Finance System Spec` | verified planning spec | Defines read-before-write Finance posture, owner decisions, blocked quote/discount/invoice/payment actions, and `GET /v1/finance/context` handoff. |
| `DMS-07-002 Finance Context Read API` | implemented and verified | `GET /v1/finance/context` exists under `finance:read`; coverage includes auth denial, scoped-key denial, pricing conflicts, `150 CHF/hour`, `100%` commercial exception inclusion, invoice blockers, no mutation, blocked actions, and MCP visibility. |
| `DMS-07-003 Read-Only Finance Web Board` | verified | `/areas?area=07-finanse&view=overview` renders the read-only Finance board with pricing, commercial exceptions, invoice blockers, source conflicts, and blocked finance actions; desktop/mobile Playwright proof passed. |
| [LUC-5184](/LUC/issues/LUC-5184) Finance API journey proof | verified | Focused local proof for `GET /v1/finance/context` passed with route/capability and architecture checks. |
| [LUC-5392](/LUC/issues/LUC-5392) Subscription/Entitlement Finance proof | verified | Current subscription/entitlement posture is locally verified for read-only Finance/Billing, commercial exception guardrails, blocked money actions, workspace isolation, MCP/capability exposure, and scoped-key denial. |
| [LUC-5433](/LUC/issues/LUC-5433) Finance browser proof | verified | Desktop/tablet/mobile local browser proof passed for `/areas?area=07-finanse&view=overview`; required Finance text present and `consoleIssues=[]`. |

Finance decision: the blocked scanner record is not an active product blocker
and does not warrant a repair child issue. It is a stale planning/spec status
classification in the app-completion projection. Remaining Finance risk is
intentionally deferred command/security design for money-impacting writes plus
protected production proof, not a repair against DMS-07-001.

## Result Report

Status: `VERIFIED_DONE`.

The two blocked app-completion records are classified as stale planning/spec
blocker labels. Both have downstream implementation and verification evidence:
Assets has verified read API, files/folders UI, and preview API proof; Finance
has verified read API, read-only web board, subscription/entitlement API proof,
and focused browser proof.

No implementation, schema, migration, generated scanner, child repair issue,
push, deploy, protected smoke, runtime server, browser, Docker, provider, or
credential action is warranted by this classification.

Recommended next owner/action: future app-completion scanner or documentation
curation work can update the projection so `CC-08-001` and `DMS-07-001` are
treated as completed planning specs with verified downstream runtime evidence
instead of active blocked records. This is source-of-truth hygiene, not product
repair.

Residual risk: broad `missing_test_link` debt remains in the current snapshot,
and protected production proof remains approval/credential gated. Those risks
are tracked by existing QA/source-control/release lanes and are not blockers
for closing this classification issue.
