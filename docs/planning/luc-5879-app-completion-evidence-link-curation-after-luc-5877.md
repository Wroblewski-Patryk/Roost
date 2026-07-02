# LUC-5879 App-Completion Evidence-Link Curation After LUC-5877

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: current app-completion curation packet separating
  true proof gaps from evidence-link/scanner noise after the
  [LUC-5877](/LUC/issues/LUC-5877) baseline.
- Goal: reconcile app-completion missing-test rows that likely point at
  existing proof packets rather than fresh runtime defects.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/planning/luc-5877-known-state-evidence-and-architecture-baseline.md`
  - `docs/planning/luc-5874-next-nonduplicated-app-completion-proof-target.md`
  - recent proof and curation packets referenced below
- Exclusions: product code, schema, migration, scanner implementation, test
  authoring, runtime server, browser, database, Docker, push, deploy, restart,
  protected smoke, production mutation, provider action, credential access, or
  secret disclosure.

## Source Snapshot

| Signal | Value |
| --- | --- |
| Parent | [LUC-5877](/LUC/issues/LUC-5877) |
| Source file | `docs/status/app-completion-index.json` |
| Generated | `2026-06-28T08:12:44.510Z` |
| Counts | `970` items / `7` flows / `939` missing test links / `0` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Top-200 by flow | Account access `88`; Dashboard overview `6`; Exchange connection and configuration `1`; Subscription and entitlement `105` |
| Top-200 by type | `123` document / `3` agent / `3` API endpoint / `49` function / `18` feature / `3` module / `1` migration |
| Top-200 evidence flags | `128` rows have doc evidence; `4` rows have test evidence |

## Flow Classification

| Flow | Current signal | Curation decision | Representative existing proof |
| --- | --- | --- | --- |
| Account access | `89` total, `88` missing-test rows; `88` top-priority rows | Mixed: route/auth rows are concrete-looking, but already covered by prior auth/account packets. Treat current aggregate as evidence-link debt unless a fresh auth regression is reproduced. | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) |
| Dashboard overview | `6` missing-test rows; all appear in the top queue | Covered/evidence-link debt. The current route-mount signal is already handled by dashboard selection/proof packets. | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) |
| Exchange connection and configuration | `1` generated-document/configuration row | Evidence-link debt; no live provider mutation is selected. | [LUC-5409](/LUC/issues/LUC-5409) |
| Subscription and entitlement | `622` total, `594` missing-test rows, `24` implemented-needs-proof rows; `105` top-priority rows | Scanner/evidence-link inference debt unless a future refresh exposes a concrete billing/subscription runtime surface. Do not turn aggregate subscription counts into broad product work. | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775) |
| Trading operation | `3` missing-test rows outside the current top runtime sample | Previously classified; reopen only on a fresh concrete route/API/regression. | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5664](/LUC/issues/LUC-5664) |
| Unclassified user workflow | `195` total, `194` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Existing API backbone proof covers the prior selected non-duplicated slice. Current aggregate remains lower-priority evidence-link debt. | [LUC-5425](/LUC/issues/LUC-5425) |
| User configuration | `54` total, `53` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Already has settings/API/browser proof packets; no duplicate proof lane from this snapshot. | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713) |

## Priority Queue Buckets

| Bucket | Count | Classification | Owner path |
| --- | ---: | --- | --- |
| Planning/generated/document rows | `123` document rows plus `3` agent/state rows | Evidence-link/scanner debt. These rows should not trigger runtime QA by themselves. | Docs Memory / scanner owner |
| Concrete-looking auth rows | `55` route-like Account access rows in the top sample | Already-covered proof family. Reopen only on a fresh auth/account regression or an unverified row outside prior coverage. | QA/Test only on fresh evidence |
| Concrete-looking dashboard rows | `6` route-like Dashboard overview rows | Already-covered proof family. | QA/Test only on fresh evidence |
| Exchange configuration row | `1` generated/configuration row | Existing proof packet; no provider mutation. | Docs/Scanner |
| Subscription top-priority rows | `105` rows | Evidence-link inference debt, not product proof work by count alone. | Docs/Scanner and TSA if scanner heuristics are changed |

## Rows That Still Need QA

No fresh non-duplicated QA target is selected from this snapshot.

Reason: the top queue contains no concrete runtime candidate outside the
already-classified Account access, Dashboard overview, Exchange configuration,
and Subscription inference families. Creating another auth, dashboard,
settings, or subscription proof issue from the aggregate missing-test count
would duplicate existing evidence rather than reduce a newly observed risk.

## Scanner Recommendation

Keep the current app-completion index as a confidence map, but refine future
scanner/report curation so these categories are visibly separate:

1. Historical proof packets and planning documents that already contain
   verification evidence.
2. Generated architecture node documents that describe existing routes/pages.
3. Runtime entities that truly lack a test, browser, or smoke proof.
4. Aggregate subscription/configuration/auth gates inferred from words in docs,
   which need careful bucketing before becoming product work.

Do not weaken real auth, subscription, configuration, provider, money, or
permission gates. The fix should improve row classification and linking, not
hide concrete runtime proof gaps.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Issue context readback | PASS | Paperclip heartbeat context for [LUC-5879](/LUC/issues/LUC-5879) confirmed the parent, scope, expected proof, and no protected actions. |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirming `970` items, `7` flows, `939` missing test links, `0` missing doc links, `0` blocked records, `0` browser-review records, and `200` priority rows. |
| Priority split | PASS | Top-200 split: Account access `88`, Dashboard `6`, Exchange `1`, Subscription `105`; type split: `123` document, `3` agent, `3` API endpoint, `49` function, `18` feature, `3` module, `1` migration. |
| Duplicate-proof review | PASS | Existing proof/curation packets cover the visible auth/account, dashboard, configuration, trading, unclassified, user-configuration, and subscription inference families. |
| Protected-action boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, or production mutation was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5879-app-completion-evidence-link-curation-after-luc-5877.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost
workspace is already mixed-dirty, contains unrelated dirty `src/tests/api.test.ts`
and many untracked planning/evidence artifacts, and `main` is `129` commits
ahead of `origin/main`.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt until
the scanner/reporting layer separates evidence documents and historical proof
packets from runtime proof candidates. That residual risk is classification
debt, not a newly reproduced product defect.
