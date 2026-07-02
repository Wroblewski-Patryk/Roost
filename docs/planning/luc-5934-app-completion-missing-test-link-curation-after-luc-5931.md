# LUC-5934 App-Completion Missing-Test-Link Curation After LUC-5931

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: current app-completion curation packet selecting the smallest nonduplicated proof-link repair lane after the [LUC-5931](/LUC/issues/LUC-5931) baseline.
- Goal: inspect app-completion missing-test-link debt and decide whether it exposes a concrete new QA/runtime proof target or a documentation/scanner linking repair.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/planning/luc-5931-known-state-evidence-and-architecture-baseline.md`
  - prior proof and curation packets referenced below
- Exclusions: product code, schema, migration, scanner implementation, test authoring, runtime server, browser, database, Docker, push, deploy, restart, protected smoke, production mutation, provider action, credential access, or secret disclosure.

## Source Snapshot

| Signal | Value |
| --- | --- |
| Parent | [LUC-5931](/LUC/issues/LUC-5931) |
| Source file | `docs/status/app-completion-index.json` |
| Generated | `2026-06-28T11:44:09.779Z` |
| Counts | `994` items / `7` flows / `963` missing test links / `0` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Top-200 by flow | Account access `88`; Dashboard overview `6`; Exchange connection and configuration `1`; Subscription and entitlement `105` |
| Top-200 by type | `123` document / `3` agent / `3` API endpoint / `49` function / `18` feature / `3` module / `1` migration |
| Top-200 by kind | `3` api_endpoint / `197` feature_or_capability |
| Top-200 by risk | `196` missing_test_link / `4` implemented_needs_proof |
| Runtime-shaped top-200 rows | `74`: Account access `68`, Dashboard overview `6` |
| Docs/agent/planning top-200 rows | `126` |

## Flow Classification

| Flow | Current signal | Curation decision | Representative existing proof |
| --- | --- | --- | --- |
| Account access | `89` total, `88` missing-test rows; `68` runtime-shaped top-priority rows | Select for documentation/proof-link repair, not new QA. The route and auth utility rows are concrete-looking, but they duplicate existing auth/account proof packets unless a fresh auth regression is reproduced. | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) |
| Dashboard overview | `6` missing-test rows; all `6` are runtime-shaped and top-priority | Select for documentation/proof-link repair, not new QA. The route-mount signal is already covered by dashboard proof-selection packets. | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) |
| Exchange connection and configuration | `1` generated middleware/configuration document row | Evidence-link debt. No live provider mutation or protected smoke is selected. | [LUC-5409](/LUC/issues/LUC-5409) |
| Subscription and entitlement | `646` total, `618` missing-test rows, `24` implemented-needs-proof rows, `4` ok; `105` top-priority rows | Scanner/evidence-link inference debt. Do not turn aggregate subscription counts into broad runtime or billing work by count alone. | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775) |
| Trading operation | `3` missing-test rows outside the current top runtime sample | Previously classified; reopen only on a fresh concrete route/API/regression. | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5664](/LUC/issues/LUC-5664) |
| Unclassified user workflow | `195` total, `194` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Existing API backbone proof covers the prior selected nonduplicated slice. Current aggregate remains lower-priority evidence-link debt. | [LUC-5425](/LUC/issues/LUC-5425) |
| User configuration | `54` total, `53` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Already has settings/API/browser proof packets; no duplicate proof lane from this snapshot. | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713) |

## Selected Smallest Repair Lane

Selected lane: documentation/scanner proof-link curation for the top runtime-shaped route families, starting with Account access and Dashboard overview rows.

Reason: these are the highest-priority concrete rows, but the exact route-shaped candidates already map to prior proof packets. The current app-completion JSON still records `hasTest: false` and `hasDoc: false` for the route rows, so the smallest useful action is linking/classification cleanup rather than another runtime proof issue.

| Row | Current app-completion signal | Existing proof mapping | Next owner/action |
| --- | --- | --- | --- |
| `USE /auth` | Account access `api_endpoint`, missing test link, path `src/app.ts#/auth` | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) | Docs/Scanner links existing proof or classifies as covered route proof debt. |
| `USE /v1/auth` | Account access `api_endpoint`, missing test link, path `src/app.ts#/v1/auth` | [LUC-5661](/LUC/issues/LUC-5661), [LUC-5570](/LUC/issues/LUC-5570) | Docs/Scanner links existing proof or classifies as covered alias proof debt. |
| `USE /dashboard` | Dashboard overview `api_endpoint`, missing test link, path `src/app.ts#/dashboard` | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) | Docs/Scanner links existing proof or classifies as covered dashboard route proof debt. |

## Rows That Still Need QA

No fresh nonduplicated QA target is selected from this snapshot.

Reason: the top queue contains no concrete runtime candidate outside the already-classified Account access and Dashboard overview proof families. The remaining top-priority rows are Exchange configuration and Subscription inference/documentation rows; those should not become runtime work without a concrete route/API row, fresh failure, or protected proof authorization.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Issue context readback | PASS | Paperclip heartbeat context for [LUC-5934](/LUC/issues/LUC-5934) confirmed parent [LUC-5931](/LUC/issues/LUC-5931), required output, constraints, and no pending comments. |
| App-completion Markdown readback | PASS | `docs/status/app-completion-index.md` confirmed generation `2026-06-28T11:44:09.779Z`, `994` items, `7` flows, `963` missing test links, `0` missing doc links, `0` blocked, and the priority queue route rows. |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirmed counts and top-200 splits by flow, type, kind, risk, runtime-shaped rows, route rows, and implemented-needs-proof rows. |
| Route mapping | PASS | `/auth`, `/v1/auth`, and `/dashboard` rows map to existing auth/account and dashboard proof packets; no fresh failure was reproduced or reported in this snapshot. |
| Protected-action boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, or production mutation was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5934-app-completion-missing-test-link-curation-after-luc-5931.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost workspace is already mixed-dirty, contains unrelated dirty `src/tests/api.test.ts` and many untracked planning/evidence artifacts, and `main` is `129` commits ahead of `origin/main`.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt until the scanner/reporting layer separates historical proof packets, generated architecture documents, covered route rows, and true runtime proof candidates. That residual is classification debt, not a newly reproduced product defect.
