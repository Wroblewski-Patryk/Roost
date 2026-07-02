# LUC-6060 App-Completion Evidence-Link Curation After LUC-6054

## Header

- ID: [LUC-6060](/LUC/issues/LUC-6060)
- Parent: [LUC-6054](/LUC/issues/LUC-6054)
- Task Type: documentation / evidence curation
- Current Stage: verification
- Status: VERIFIED_DONE
- Owner: Documentation Steward
- Date: 2026-06-28

## Task Contract

- Goal: reduce app-completion evidence ambiguity after [LUC-6054](/LUC/issues/LUC-6054) without inventing feature work or overstating runtime verification.
- Scope: `docs/status/app-completion-index.md`, `docs/status/app-completion-index.json`, `docs/graphs/architecture-proof-register.csv`, `docs/status/architecture-awareness-report.md`, `docs/architecture/scanner-overrides.json`, generated graph/status artifacts, and local source-control posture.
- Implementation Plan: read Paperclip issue context; inspect the refreshed app-completion and architecture reports; identify the exact missing-doc-link rows; add only specific existing documentation evidence to scanner overrides; regenerate architecture and app-completion artifacts; sample high-risk missing-test rows and classify unresolved proof-link debt; record verification and source-control disposition.
- Acceptance Criteria: missing-doc-link rows are curated or explicitly left unresolved; highest-risk missing-test rows are sampled; code behavior is not marked verified without command/browser/deploy proof; source-control posture is recorded.
- Definition of Done: the curation packet exists, source-of-truth evidence links are updated where real and specific, generated evidence is refreshed, verification is recorded, and no protected action or product runtime mutation is performed.
- Exclusions: product code, schema, migrations, test authoring, browser proof, runtime server, database, Docker, push, deploy, restart, protected smoke, provider action, credential access, or secret disclosure.

## Source Snapshot

| Signal | Before curation | After curation |
| --- | ---: | ---: |
| App-completion generated timestamp | `2026-06-28T21:16:10.617Z` | `2026-06-28T21:21:51.889Z` |
| Items | `1045` | `1048` |
| User flows | `7` | `7` |
| Missing test links | `1005` | `1007` |
| Missing doc links | `7` | `0` |
| Blocked records | `0` | `0` |
| Browser-review records | `0` | `0` |
| Architecture scan | `2657` entities / `5988` relations / `16226` files | `2664` entities / `6016` relations / `16233` files |
| Override entries | `16` entity / `3` relation | `23` entity / `3` relation |

The item and missing-test count increased because this lane added one local
planning packet plus regenerated graph evidence. The material curation result
is that the seven app-completion `missing_doc_link` rows moved to `0` through
specific source-of-truth evidence links.

## Curated Missing-Doc Rows

| Entity | Path | Evidence added | Result |
| --- | --- | --- | --- |
| `app.ts` | `src/app.ts` | `docs/architecture/system-architecture.md`; `docs/planning/luc-1680-api-route-confidence-matrix.md` | Curated. App-composition docs are linked; route behavior remains owned by mounted route tests. |
| `prisma.ts` | `src/db/prisma.ts` | `docs/DATABASE.md`; `docs/engineering/testing.md`; `docs/planning/luc-3544-task-link-classification-for-unlinked-implementation-rows.md` | Curated. Data client infrastructure has docs evidence; no schema/runtime claim changed. |
| `webhook-signature.ts` | `src/integrations/clickup/webhook-signature.ts` | `docs/architecture/nodes/generated/INT-AUTO-0006.md`; `docs/planning/luc-5427-clickup-provider-task-sync-proof-ladder.md` | Curated. ClickUp webhook signature evidence is specific; no provider mutation performed. |
| `integration-settings.service.ts` | `src/integrations/integration-settings.service.ts` | `docs/architecture/nodes/generated/SVC-AUTO-0001.md`; `docs/architecture/nodes/generated/INT-AUTO-0012.md`; `docs/planning/luc-5984-auth-subscription-configuration-authority-risk-review.md` | Curated. Configuration service docs evidence is specific; no credential or protected proof performed. |
| `secrets.ts` | `src/integrations/secrets.ts` | `docs/architecture/nodes/generated/INT-AUTO-0013.md`; `docs/security/security-baseline.md`; `docs/planning/luc-5984-auth-subscription-configuration-authority-risk-review.md` | Curated. Secret-handling docs evidence is specific; no secret access performed. |
| `event.service.ts` | `src/modules/events/event.service.ts` | `docs/architecture/nodes/generated/SVC-AUTO-0002.md`; `docs/planning/v1-architecture-control-map.md` | Curated. Event infrastructure docs evidence is specific; consuming command proof remains separate. |
| `catalog.ts` | `src/operating-model/catalog.ts` | `docs/architecture/companycore-business-module-map.md`; `docs/planning/company-os-stage1-task-contracts.md`; `docs/planning/v1-architecture-control-map.md` | Curated. Operating-model catalog docs evidence is specific; no runtime QA lane selected. |

Implementation detail: these links were added to
`docs/architecture/scanner-overrides.json` so the generated architecture proof
register and app-completion index can reproduce the curation result.

## Highest-Risk Missing-Test Sample

| Sample row | Current classification | Decision |
| --- | --- | --- |
| `planner` / `.agents/prompts/planner.md` | Subscription and entitlement, `missing_test_link` | Left unresolved. Agent documentation is not a runtime subscription proof target. Do not mark verified without a dedicated governance/test proof. |
| `Decision Register` / `.agents/state/decision-register.md` | Account access, `missing_test_link` | Left unresolved. State docs are inferred into Account access by keyword; no behavior claim added. |
| `Risk Register` / `.agents/state/risk-register.md` | Account access, `missing_test_link` | Left unresolved. State docs are inferred into Account access by keyword; no behavior claim added. |
| `USE /auth` / `src/app.ts#/auth` | Account access, `missing_test_link` | Left unresolved at app-completion link level. Existing proof family remains [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), and [LUC-5661](/LUC/issues/LUC-5661). |
| `USE /dashboard` / `src/app.ts#/dashboard` | Dashboard overview, `missing_test_link` | Left unresolved at app-completion link level. Existing proof family remains [LUC-5669](/LUC/issues/LUC-5669) and [LUC-5774](/LUC/issues/LUC-5774). |
| `GET /v1/finance/context` proof family | Subscription and entitlement runtime proof | Covered by [LUC-6059](/LUC/issues/LUC-6059), which reran the scoped `CompanyCore v1 protected API flow` test successfully against local PostgreSQL. |

No new QA/runtime child issue was created from this curation pass. The remaining
`1006` missing-test-link count is broad proof-link inference debt until the
scanner can distinguish route mounts, state documents, planning documents, and
true unproved runtime surfaces. [LUC-6059](/LUC/issues/LUC-6059) already selected
and verified the concrete high-risk runtime proof target available after
[LUC-6054](/LUC/issues/LUC-6054).

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Paperclip context | PASS | Heartbeat context confirmed [LUC-6060](/LUC/issues/LUC-6060) is assigned, in progress, has parent [LUC-6054](/LUC/issues/LUC-6054), and has no pending comments. |
| Missing-doc identification | PASS | Local app-completion reproduction found the seven exact `missing_doc_link` rows before override curation. |
| Scanner override update | PASS | Added seven narrow `entityOverrides` in `docs/architecture/scanner-overrides.json`; no status was promoted to `verified`. |
| Architecture regeneration | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` -> `2664` entities / `6016` relations / `16233` files; `23` entity overrides applied. |
| App-completion regeneration | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` -> `1048` items / `7` flows / `1007` missing test links / `0` missing doc links / `0` blocked. |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Diff hygiene | PASS WITH EXISTING WARNINGS | `git diff --check` exited `0`; output contained existing LF-to-CRLF warnings only. |
| Source-control readback | PASS WITH MIXED DIRTY STATE | `git status --short --branch` -> `main...origin/main [ahead 129]`, existing mixed generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/UX evidence artifacts. HEAD `a939a028`; divergence `0 129`. |

## Result Report

Status: `VERIFIED_DONE`.

Files changed by this lane:

- `docs/architecture/scanner-overrides.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-graph.mmd`
- `docs/graphs/architecture-health.json`
- `docs/graphs/architecture-proof-register.csv`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/planning/luc-6060-app-completion-evidence-link-curation-after-luc-6054.md`
- source-of-truth context/board entries for this result

Commit status: not committed. The shared Roost worktree is already mixed-dirty,
contains unrelated modified `src/tests/api.test.ts` plus many older untracked
planning/UX evidence artifacts, and `main` is `129` commits ahead of
`origin/main`.

Push status: not needed.

Deploy impact: none.

Protected-action boundary: no runtime server, browser, database, Docker,
watcher, production smoke, deploy, push, provider action, credential access, or
secret disclosure was performed.

Residual risk: remaining app-completion `1007` `missing_test_link` rows are not all
runtime defects. They remain evidence-link/scanner classification debt until a
future lane links existing proof more precisely or identifies a concrete
unverified behavior. Do not open duplicate QA work from the aggregate count
alone.

Next owner/action: none for [LUC-6060](/LUC/issues/LUC-6060). Broader
source-control batching remains a Delivery/Repository ownership decision for
the already mixed shared worktree, not a blocker for this curation result.
