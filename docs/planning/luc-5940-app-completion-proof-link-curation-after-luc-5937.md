# LUC-5940 App-Completion Proof-Link Curation After LUC-5937

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: current app-completion curation packet separating
  already-covered proof-link debt from fresh QA/runtime proof targets after the
  [LUC-5937](/LUC/issues/LUC-5937) baseline.
- Goal: inspect the current app-completion missing-test-link snapshot and
  decide whether repeated `/auth`, `/v1/auth`, and `/dashboard` rows require
  new runtime proof or proof-link/scanner curation.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/planning/luc-5937-known-state-evidence-and-architecture-baseline.md`
  - prior proof and curation packets referenced below
- Exclusions: product code, schema, migration, scanner implementation, test
  authoring, runtime server, browser, database, Docker, watcher, push, deploy,
  restart, protected smoke, production mutation, provider action, credential
  access, or secret disclosure.

## Source Snapshot

| Signal | Value |
| --- | --- |
| Parent | [LUC-5937](/LUC/issues/LUC-5937) |
| Source file | `docs/status/app-completion-index.json` |
| Generated | `2026-06-28T12:02:46.825Z` |
| Counts | `998` items / `7` flows / `966` missing test links / `0` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Top-200 by flow | Account access `88`; Dashboard overview `6`; Exchange connection and configuration `1`; Subscription and entitlement `105` |
| Top-200 by type | `123` document / `3` agent / `3` API endpoint / `49` function / `18` feature / `3` module / `1` migration |
| Top-200 by kind | `3` api_endpoint / `197` feature_or_capability |
| Top-200 by risk | `196` missing_test_link / `4` implemented_needs_proof |
| Top-200 evidence flags | `128` rows have doc evidence; `4` rows have test evidence |
| Runtime-shaped top-200 rows | `74`: Account access `68`, Dashboard overview `6` |

## Flow Classification

| Flow | Current signal | Curation decision | Representative existing proof |
| --- | --- | --- | --- |
| Account access | `89` total, `88` missing-test rows; `68` runtime-shaped top-priority rows | Select for proof-link/scanner curation, not duplicate QA. The concrete route rows remain `/auth` and `/v1/auth`, already covered by auth/account proof packets unless a fresh auth regression is reproduced. | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) |
| Dashboard overview | `6` missing-test rows; all `6` are runtime-shaped and top-priority | Select for proof-link/scanner curation, not duplicate QA. The visible route-mount row is already covered by dashboard proof-selection packets. | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) |
| Exchange connection and configuration | `1` generated middleware/configuration document row | Evidence-link debt. No live provider mutation, protected smoke, or configuration change is selected. | [LUC-5409](/LUC/issues/LUC-5409) |
| Subscription and entitlement | `650` total, `621` missing-test rows, `25` implemented-needs-proof rows, `4` ok; `105` top-priority rows | Scanner/evidence-link inference debt. Do not turn aggregate subscription counts into broad billing/runtime work without a concrete route/API row, fresh failure, or approved protected proof. | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775) |
| Trading operation | `3` missing-test rows outside the current top runtime sample | Previously classified; reopen only on a fresh concrete route/API/regression. | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5664](/LUC/issues/LUC-5664) |
| Unclassified user workflow | `195` total, `194` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Existing API backbone proof covers the prior selected nonduplicated slice. Current aggregate remains lower-priority evidence-link debt. | [LUC-5425](/LUC/issues/LUC-5425) |
| User configuration | `54` total, `53` missing-test rows, `1` implemented-needs-proof row; outside the current top sample | Already has settings/API/browser proof packets; no duplicate proof lane from this snapshot. | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713) |

## Repeated Route Rows

| Row | Current app-completion signal | Existing proof mapping | Decision |
| --- | --- | --- | --- |
| `USE /auth` | Account access `api_endpoint`, path `src/app.ts#/auth`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) | Proof-link/scanner debt for this snapshot; do not open duplicate QA without a fresh auth failure. |
| `USE /v1/auth` | Account access `api_endpoint`, path `src/app.ts#/v1/auth`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5661](/LUC/issues/LUC-5661), [LUC-5570](/LUC/issues/LUC-5570) | Proof-link/scanner debt for this snapshot; treat as covered alias proof unless a new regression appears. |
| `USE /dashboard` | Dashboard overview `api_endpoint`, path `src/app.ts#/dashboard`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) | Proof-link/scanner debt for this snapshot; no fresh dashboard runtime lane selected. |

## Rows That Still Need QA

No fresh nonduplicated QA target is selected from this snapshot.

Reason: the top queue contains no concrete runtime candidate outside the
already-classified Account access and Dashboard overview proof families. The
remaining top-priority rows are Exchange configuration and
Subscription/entitlement inference or generated-document rows; they should not
be converted into runtime work without a concrete route/API row, fresh failure,
or protected proof authorization.

## Scanner Recommendation

Keep app-completion as a confidence map, but refine future reporting so covered
proof-link debt is separated from true runtime proof gaps:

1. Attach or infer existing proof packets for known auth/account route aliases.
2. Attach or infer existing dashboard proof packets for `/dashboard`.
3. Keep generated architecture documents and planning documents out of the
   runtime QA queue unless they point to an unverified route/API/function.
4. Keep subscription/configuration/auth gates visible, but classify aggregate
   inference rows before opening product or protected-runtime work.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Scoped wake context | PASS | Paperclip wake payload scoped this heartbeat to [LUC-5940](/LUC/issues/LUC-5940), no pending comments, checkout already claimed by the harness, and no thread refetch required. |
| Parent packet readback | PASS | `docs/planning/luc-5937-known-state-evidence-and-architecture-baseline.md` records the app-completion refresh at `2026-06-28T12:02:46.825Z` with `998` items / `7` flows / `966` missing test links. |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirming counts, `200` priority rows, top flow/type/kind/risk split, `74` runtime-shaped rows, and the three repeated route rows. |
| Route mapping | PASS | `/auth`, `/v1/auth`, and `/dashboard` rows map to existing auth/account and dashboard proof packets; no fresh failure was reproduced or reported in the current snapshot. |
| Protected-action boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, production mutation, or secret disclosure was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5940-app-completion-proof-link-curation-after-luc-5937.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost
workspace is already mixed-dirty, contains unrelated modified
`src/tests/api.test.ts` and many older untracked planning/evidence artifacts,
and `main` is `129` commits ahead of `origin/main`.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt until
the scanner/reporting layer separates historical proof packets, generated
architecture documents, covered route rows, and true runtime proof candidates.
That residual is classification debt, not a newly reproduced product defect.
