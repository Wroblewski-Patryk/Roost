# LUC-5691 Current App-Completion Missing-Test Evidence-Link Debt

## Task Contract

- Task Type: documentation/evidence curation.
- Current Stage: verification.
- Deliverable For This Stage: owner-readable classification of current
  app-completion missing-test rows so QA can avoid broad duplicate reruns.
- Goal: turn the current app-completion missing-test queue into concrete
  owner buckets: evidence-link/scanner debt versus real runtime proof
  candidates.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - recent proof packets for Account access and Dashboard overview
  - project state/context updates for this curation result
- Exclusions: no product code, schema, migration, scanner implementation,
  test authoring, runtime server, browser, database, Docker, push, deploy,
  restart, protected smoke, production mutation, provider action, credential
  access, or secret disclosure.

## Current Source Snapshot

Fresh source file:

- `docs/status/app-completion-index.json`
- `generatedAt`: `2026-06-27T22:11:48.179Z`
- Counts: `902` items, `7` flows, `873` missing test links,
  `0` missing doc links, `0` blocked records.

Flow risk summary:

| Flow | Missing test rows | Implemented-needs-proof rows | Notes |
| --- | ---: | ---: | --- |
| Subscription and entitlement | 528 | 22 | Mostly docs/planning inference debt from broad `plan`/subscription heuristics already classified in earlier curation lanes. |
| Unclassified user workflow | 194 | 1 | Not in the current priority top-200 curation sample. |
| Account access | 88 | 0 | Concrete rows are already covered by existing auth/API/browser proof packets. |
| User configuration | 53 | 1 | Not in the current priority top-200 curation sample. |
| Dashboard overview | 6 | 0 | Covered by existing dashboard command API proof and LUC-5669 selection. |
| Trading operation | 3 | 0 | Already classified by LUC-5664 as Strategy scanner/evidence-link debt. |
| Exchange connection and configuration | 1 | 0 | One generated architecture document row in the current top-200 sample. |

## Priority Queue Classification

The current `priorityReviewItems` array contains `200` rows.

| Bucket | Count | Classification | Owner path |
| --- | ---: | --- | --- |
| `docs/planning/*` documents | 114 | Evidence-link/scanner debt. These rows should not trigger QA reruns by themselves. | Docs/Architecture or shared scanner owner should separate planning/evidence documents from runtime proof candidates. |
| Generated architecture docs | 7 | Evidence-link debt. These docs already have doc links but are missing scanner-recognized test links. | Docs/Architecture should map generated nodes to existing proof paths where useful. |
| Agent/state docs | 3 | Evidence-link debt. State/prompt files are not runtime journeys. | Docs Memory owns durable classification only. |
| UX/other docs | 2 | Evidence-link debt. | Docs/UX curation only unless a fresh visual regression appears. |
| Runtime rows | 74 | Concrete rows, but no fresh non-duplicated QA target remains in this snapshot. | QA should use only the already named proof packets unless a later refresh surfaces a new runtime row or regression. |

Runtime split:

| Runtime flow | Rows | Current classification |
| --- | ---: | --- |
| Account access | 68 | Covered/evidence-link debt. LUC-5561 verified browser registration/login/token/protected-route behavior; LUC-5661 verified `/v1/auth` alias API parity; existing API tests cover auth fail-closed paths. |
| Dashboard overview | 6 | Covered/evidence-link debt. LUC-5669 verified the `USE /dashboard` signal is already covered by `/v1/dashboard/command` API proof in `src/tests/api.test.ts`. |

## Concrete Proof Candidates

Selected next proof: none from this snapshot.

Reason:

- `USE /auth` is covered by existing `/auth/register`, `/auth/login`, and
  `/auth/me` API proof plus LUC-5561 browser proof.
- `USE /v1/auth` is verified by LUC-5661.
- `USE /dashboard` is covered by existing `/v1/dashboard/command` API proof
  and LUC-5669 focused QA selection.
- The remaining top-200 rows are scanner/evidence-link curation debt, not
  evidence of broken product behavior.

QA disposition for dependent LUC-5692:

- Proceed only if LUC-5692 needs to record the no-op/duplicate selection.
- Do not run broad duplicate Auth, Dashboard, Settings, Sales, Finance,
  Assets, Relationships, Product/Delivery, Google Drive OAuth, subscription,
  or trading proof from the aggregate `873` missing-test count alone.
- A new QA lane is warranted only after a future app-completion refresh
  exposes a concrete unverified runtime route/API/page row not already covered
  by the cited proof packets, or after a fresh regression is reproduced.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirmed `200` priority rows, and split them into `126` doc/agent rows and `74` runtime rows. |
| Current issue context | PASS | Paperclip heartbeat context read confirmed LUC-5692 is blocked by LUC-5691 and needs this curation result. |
| Product/runtime mutation boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, or production mutation was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5691-current-app-completion-missing-test-evidence-link-debt.md`
- source-of-truth state/context entries for this curation result

Deployment impact: none.

Residual risk: app-completion still reports broad missing-test-link debt, but
this issue found no current non-duplicated QA proof candidate in the top-200
queue. The residual work is scanner/evidence-link hygiene and future focused
proof selection only when a concrete unverified runtime row appears.
