# LUC-5972 App-Completion Evidence-Link Curation After LUC-5970

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: current app-completion curation packet separating
  missing documentation links and repeated proof-link rows from fresh runtime
  QA targets after the [LUC-5970](/LUC/issues/LUC-5970) baseline.
- Goal: inspect the current app-completion snapshot, classify the refreshed
  `7` missing doc links, map repeated route proof rows to existing proof
  families, and decide whether any new runtime QA lane is justified.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/graphs/architecture-awareness.json`
  - `docs/planning/luc-5970-known-state-evidence-and-architecture-baseline.md`
  - prior app-completion proof and curation packets referenced below
- Exclusions: product code, schema, migration, scanner implementation, test
  authoring, runtime server, browser, database, Docker, watcher, push, deploy,
  restart, protected smoke, production mutation, provider action, credential
  access, or secret disclosure.

## Source Snapshot

| Signal | Value |
| --- | --- |
| Parent | [LUC-5970](/LUC/issues/LUC-5970) |
| Source file | `docs/status/app-completion-index.json` |
| Generated | `2026-06-28T13:44:52.939Z` |
| Source graph generated | `2026-06-28T13:44:31.688Z` |
| Counts | `1015` items / `7` flows / `976` missing test links / `7` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Top-200 by flow | Account access `88`; Dashboard overview `6`; Exchange connection and configuration `1`; Subscription and entitlement `105` |
| Top-200 by type | `123` document / `3` agent / `3` API endpoint / `49` function / `18` feature / `3` module / `1` migration |
| Top-200 by risk | `196` missing_test_link / `4` implemented_needs_proof |
| Runtime-shaped top-200 rows | `74`: Account access `68`, Dashboard overview `6` |

## Missing Doc-Link Rows

The persisted app-completion artifact stores aggregate flow counts and the first
`200` risk rows. The seven `missing_doc_link` rows are outside that persisted
priority slice, so they were reconstructed read-only from
`docs/graphs/architecture-awareness.json` using the same row family already
identified by prior app-completion curation packets.

| Flow | Entity | Path | Current signal | Decision |
| --- | --- | --- | --- | --- |
| Unclassified user workflow | `app.ts` | `src/app.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for the app composition entry point. No runtime failure selected. |
| Unclassified user workflow | `prisma.ts` | `src/db/prisma.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for database client infrastructure. No schema or migration work selected. |
| Unclassified user workflow | `webhook-signature.ts` | `src/integrations/clickup/webhook-signature.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for ClickUp webhook signature support. No provider mutation selected. |
| User configuration | `integration-settings.service.ts` | `src/integrations/integration-settings.service.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for integration settings. No provider, credential, or protected smoke action selected. |
| Unclassified user workflow | `secrets.ts` | `src/integrations/secrets.ts` | implemented feature with local source evidence, no linked doc, configuration-shaped | Docs/scanner link debt for configuration/secret infrastructure. No credential access selected. |
| Unclassified user workflow | `event.service.ts` | `src/modules/events/event.service.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for event service infrastructure. No product runtime lane selected. |
| Unclassified user workflow | `catalog.ts` | `src/operating-model/catalog.ts` | implemented feature with local source evidence, no linked doc | Docs/scanner link debt for operating-model catalog infrastructure. No runtime QA lane selected. |

## Repeated Proof-Link Rows

| Row | Current app-completion signal | Existing proof mapping | Decision |
| --- | --- | --- | --- |
| `USE /auth` | Account access `api_endpoint`, path `src/app.ts#/auth`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) | Proof-link/scanner debt for this snapshot; do not open duplicate QA without a fresh auth failure. |
| `USE /v1/auth` | Account access `api_endpoint`, path `src/app.ts#/v1/auth`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5661](/LUC/issues/LUC-5661), [LUC-5570](/LUC/issues/LUC-5570) | Proof-link/scanner debt for this snapshot; treat as covered alias proof unless a new regression appears. |
| `USE /dashboard` | Dashboard overview `api_endpoint`, path `src/app.ts#/dashboard`, `hasTest: false`, `hasDoc: false`, risk `missing_test_link` | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) | Proof-link/scanner debt for this snapshot; no fresh dashboard runtime lane selected. |

## Flow Classification

| Flow | Current signal | Curation decision | Representative existing proof |
| --- | --- | --- | --- |
| Account access | `89` total, `88` missing-test rows; repeated route rows remain `/auth` and `/v1/auth` | Select for proof-link/scanner curation only. Existing auth/account packets remain the proof family unless a fresh auth regression is reproduced. | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) |
| Dashboard overview | `6` missing-test rows; repeated route row remains `/dashboard` | Select for proof-link/scanner curation only. Existing dashboard packets cover the selected visible route family. | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) |
| User configuration | `54` total, `52` missing-test rows, `1` implemented-needs-proof row, `1` missing-doc-link row | Missing doc link is infrastructure documentation/linkage debt for `integration-settings.service.ts`. No provider or protected-runtime action selected. | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713) |
| Unclassified user workflow | `195` total, `188` missing-test rows, `1` implemented-needs-proof row, `6` missing-doc-link rows | Six missing doc links are implementation infrastructure rows with source evidence but no linked docs. Do not convert to broad product QA unless a concrete behavior failure appears. | [LUC-5425](/LUC/issues/LUC-5425) |
| Exchange connection and configuration | `1` generated middleware/configuration document row | Evidence-link debt. No live provider mutation, protected smoke, or configuration change selected. | [LUC-5409](/LUC/issues/LUC-5409) |
| Subscription and entitlement | `667` total, `638` missing-test rows, `25` implemented-needs-proof rows, `4` ok | Scanner/evidence-link inference debt. Do not turn aggregate subscription counts into broad billing/runtime work without a concrete route/API row, fresh failure, or approved protected proof. | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775) |
| Trading operation | `3` missing-test rows outside the top runtime sample | Previously classified; reopen only on a fresh concrete route/API/regression. | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5664](/LUC/issues/LUC-5664) |

## Rows That Still Need QA

No fresh nonduplicated QA target is selected from this snapshot.

Reason: the top queue contains no concrete runtime candidate outside the
already-classified Account access and Dashboard overview proof families. The
`7` missing-doc-link rows are implementation/infrastructure records with
missing documentation links, not newly reproduced runtime defects.

## Scanner Recommendation

Keep app-completion as a confidence map, but refine future reporting so row
detail remains inspectable and covered proof-link debt is separated from true
runtime proof gaps:

1. Persist a full machine-readable row list, or at least risk-specific slices,
   for `missing_doc_link` and `implemented_needs_proof` records.
2. Attach or infer existing proof packets for known auth/account route aliases.
3. Attach or infer existing dashboard proof packets for `/dashboard`.
4. Distinguish implementation infrastructure rows with source/test evidence but
   no doc links from user-facing runtime QA candidates.
5. Keep subscription/configuration/auth gates visible, but classify aggregate
   inference rows before opening product or protected-runtime work.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Scoped wake context | PASS | Paperclip wake payload scoped this heartbeat to [LUC-5972](/LUC/issues/LUC-5972), no pending comments, checkout already claimed by the harness, and no thread refetch required. |
| Parent packet readback | PASS | `docs/planning/luc-5970-known-state-evidence-and-architecture-baseline.md` exists locally and records the same `1015` item app-completion snapshot generated `2026-06-28T13:44:52.939Z`. |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirming counts, `200` priority rows, top flow/type/risk split, and the three repeated route rows. |
| Missing-doc-link reconstruction | PASS | Read-only reconstruction from `docs/graphs/architecture-awareness.json` identified the seven missing-doc-link source rows named above. |
| Route mapping | PASS | `/auth`, `/v1/auth`, and `/dashboard` rows map to existing auth/account and dashboard proof packets; no fresh failure was reproduced or reported in the current snapshot. |
| Source-control check | PASS WITH WARNINGS | `git status --short --branch` confirmed `main...origin/main [ahead 129]` with mixed dirty state and unrelated `src/tests/api.test.ts`. |
| Protected-action boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, production mutation, or secret disclosure was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5972-app-completion-evidence-link-curation-after-luc-5970.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost
workspace is already mixed-dirty, contains unrelated modified
`src/tests/api.test.ts` and many older untracked planning/evidence artifacts,
and `main` is `129` commits ahead of `origin/main`.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt and
some doc-link debt until the scanner/reporting layer separates historical proof
packets, generated architecture documents, covered route rows, infrastructure
rows with source/test evidence but missing docs, and true runtime proof
candidates. That residual is classification debt, not a newly reproduced
product defect.
