# LUC-6052 App-Completion Proof-Link And Doc-Link Curation After LUC-6036

Date: 2026-06-28

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: app-completion curation packet for the [LUC-6036](/LUC/issues/LUC-6036) follow-up lane.
- Goal: inspect the refreshed app-completion snapshot, classify missing-test-link and missing-doc-link signals, map repeated route/API/doc rows to existing proof packets where applicable, and decide whether a concrete nonduplicated QA/runtime lane remains.
- Scope: `docs/status/app-completion-index.json`, `docs/status/app-completion-index.md`, `docs/graphs/architecture-awareness.json`, `docs/planning/luc-6036-known-state-evidence-and-architecture-baseline.md`, source-control posture, and source-of-truth state.
- Implementation Plan: read Paperclip issue context; parse the app-completion JSON and Markdown; compare the current generated snapshot with the parent packet; verify recurring missing-doc-link source paths in architecture-awareness; classify top flow/type signals; record the curation decision and source-control posture.
- Acceptance Criteria: current counts and flow families are recorded; the `1001` missing-test-link and `7` missing-doc-link signals are classified; repeated `/auth`, `/v1/auth`, and `/dashboard` rows are mapped to existing proof families; no duplicate QA/runtime work is created without a concrete fresh defect.
- Definition of Done: this packet exists, relevant source-of-truth files are updated, verification is recorded, and no protected action or runtime mutation is performed.
- Exclusions: product code, schema, migration, scanner implementation, test authoring, runtime server, browser, database, Docker, watcher, push, deploy, restart, protected smoke, production mutation, provider action, credential access, or secret disclosure.

## Source Snapshot

| Signal | Value |
| --- | --- |
| Parent | [LUC-6036](/LUC/issues/LUC-6036) |
| Parent packet | `docs/planning/luc-6036-known-state-evidence-and-architecture-baseline.md` |
| Source file | `docs/status/app-completion-index.json` |
| Current generated timestamp | `2026-06-28T21:07:14.491Z` |
| Parent packet app-completion timestamp | `2026-06-28T21:04:32.721Z` architecture scan and app-completion count recorded in parent packet |
| Source graph | `docs/graphs/architecture-awareness.json` |
| Current counts | `1041` items / `7` flows / `1001` missing test links / `7` missing doc links / `0` blocked / `0` browser-review records |
| Parent recorded counts | `1039` items / `7` flows / `999` missing test links / `7` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Top-200 by flow | Account access `89`; Dashboard overview `6`; Exchange connection and configuration `1`; Subscription and entitlement `104` |
| Top-200 by type | `123` document / `49` function / `18` feature / `3` API endpoint / `3` agent / `3` module / `1` migration |

The live app-completion files drifted by two generated items after the parent
packet was written. This lane uses the current on-disk snapshot because it is
the inspectable evidence source for [LUC-6052](/LUC/issues/LUC-6052), while
recording the parent count as a harmless scanner-timing delta.

## Flow Classification

| Flow | Current signal | Curation decision | Representative existing proof |
| --- | --- | --- | --- |
| Subscription and entitlement | `692` total; `662` missing-test-link, `26` implemented-needs-proof, `4` ok | Aggregate scanner/evidence-link inference debt. Do not open billing/subscription runtime work from counts alone without a concrete route/API row, reproduced failure, or approved protected proof. | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775), [LUC-5984](/LUC/issues/LUC-5984) |
| Unclassified user workflow | `195` total; `188` missing-test-link, `1` implemented-needs-proof, `6` missing-doc-link | Six missing-doc rows are implementation infrastructure records with source evidence but no linked docs. No broad product QA lane selected. | [LUC-5425](/LUC/issues/LUC-5425) |
| Account access | `90` total; `89` missing-test-link, `1` ok | Proof-link/scanner curation debt. Existing auth/account packets remain the proof family unless a fresh auth regression is reproduced. | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5570](/LUC/issues/LUC-5570), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) |
| User configuration | `54` total; `52` missing-test-link, `1` implemented-needs-proof, `1` missing-doc-link | The missing-doc row is infrastructure documentation/linkage debt for integration settings. No provider, credential, or protected smoke action selected. | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713), [LUC-5984](/LUC/issues/LUC-5984) |
| Dashboard overview | `6` total; `6` missing-test-link | Proof-link/scanner curation debt. Existing dashboard packets cover the selected visible route family. | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) |
| Trading operation | `3` total; `3` missing-test-link | Previously classified proof debt. Reopen only on a fresh concrete route/API/regression. | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5664](/LUC/issues/LUC-5664) |
| Exchange connection and configuration | `1` total; `1` missing-test-link | Evidence-link debt for a generated middleware/configuration row. No live provider mutation or protected smoke selected. | [LUC-5409](/LUC/issues/LUC-5409) |

## Missing Doc-Link Rows

The app-completion artifact stores aggregate flow counts and the first `200`
priority rows. The seven `missing_doc_link` detail rows are outside that
persisted priority slice, so this packet verifies the recurring source paths in
`docs/graphs/architecture-awareness.json` and classifies the same row family
seen in prior curation packets.

| Flow | Entity | Path | Verified source signal | Decision |
| --- | --- | --- | --- | --- |
| Unclassified user workflow | `app.ts` | `src/app.ts` | architecture-awareness contains implemented app route entries from `src/app.ts` | Docs/scanner link debt for app composition. No runtime failure selected. |
| Unclassified user workflow | `prisma.ts` | `src/db/prisma.ts` | implemented feature row `feature:prisma-ts:dafac5460d` | Docs/scanner link debt for database client infrastructure. No schema/migration work selected. |
| Unclassified user workflow | `webhook-signature.ts` | `src/integrations/clickup/webhook-signature.ts` | implemented feature and function rows for ClickUp webhook signing/verification | Docs/scanner link debt for webhook signature support. No provider mutation selected. |
| User configuration | `integration-settings.service.ts` | `src/integrations/integration-settings.service.ts` | implemented feature and settings accessor function rows | Docs/scanner link debt for configuration service infrastructure. No protected action selected. |
| Unclassified user workflow | `secrets.ts` | `src/integrations/secrets.ts` | implemented feature and secret helper function rows | Docs/scanner link debt for secret infrastructure. No credential access selected. |
| Unclassified user workflow | `event.service.ts` | `src/modules/events/event.service.ts` | implemented event service feature and `createEvent` function row | Docs/scanner link debt for event service infrastructure. No product runtime lane selected. |
| Unclassified user workflow | `catalog.ts` | `src/operating-model/catalog.ts` | implemented catalog feature and operating-model helper function rows | Docs/scanner link debt for operating-model catalog infrastructure. No runtime QA lane selected. |

## Repeated Proof-Link Rows

| Row | Current app-completion signal | Existing proof mapping | Decision |
| --- | --- | --- | --- |
| `USE /auth` | Account access `api_endpoint`, path `src/app.ts#/auth`, risk `missing_test_link` | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) | Proof-link/scanner debt for this snapshot; do not open duplicate QA without a fresh auth failure. |
| `USE /v1/auth` | Account access `api_endpoint`, path `src/app.ts#/v1/auth`, risk `missing_test_link` | [LUC-5661](/LUC/issues/LUC-5661), [LUC-5570](/LUC/issues/LUC-5570) | Proof-link/scanner debt; treat as covered alias proof unless a new regression appears. |
| `USE /dashboard` | Dashboard overview route-shaped row remains in the app-completion family | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) | Proof-link/scanner debt; no fresh dashboard runtime lane selected. |

## QA Runtime Decision

No fresh nonduplicated QA/runtime target is selected from this snapshot.

Reason:

- the current app-completion index has `0` blocked records and `0` browser-review records;
- architecture and route-capability gates were already green in [LUC-6036](/LUC/issues/LUC-6036);
- the top `200` priority rows are the same proof-link families already curated in prior packets;
- the seven missing-doc-link rows are implementation infrastructure link debt, not reproduced user-facing failures;
- the two-item drift from the parent packet changes aggregate counts only and does not introduce a new concrete runtime candidate.

Future QA/runtime work should be opened only when a new snapshot exposes a
concrete unverified user-facing row outside the already-covered Account access,
Dashboard overview, Exchange configuration, Trading, User configuration,
Unclassified workflow, and Subscription inference families, or when a fresh
journey regression is reproduced.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Paperclip issue context | PASS | Heartbeat context confirmed [LUC-6052](/LUC/issues/LUC-6052) is assigned, in progress, and scoped as the app-completion curation sidecar after [LUC-6036](/LUC/issues/LUC-6036); no pending comments. |
| Parent packet readback | PASS | `docs/planning/luc-6036-known-state-evidence-and-architecture-baseline.md` read locally and records the parent `1039` item / `999` missing-test-link app-completion signal. |
| App-completion JSON readback | PASS | Node parse confirmed `2026-06-28T21:07:14.491Z`, `1041` items, `7` flows, `1001` missing test links, `7` missing doc links, `0` blocked, and `0` browser-review records. |
| App-completion Markdown readback | PASS | `docs/status/app-completion-index.md` records the same current counts and priority queue family. |
| Missing-doc source verification | PASS | Node readback of `docs/graphs/architecture-awareness.json` found implemented rows for the recurring seven infrastructure source paths. |
| Source-control check | PASS WITH EXISTING DIRTY STATE | `git status --short --branch` shows `main...origin/main [ahead 129]`, mixed generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/evidence artifacts. HEAD `a939a028`, divergence `0 129`. |
| Definition of Done / integration checklist | PASS FOR DOC-CURATION SCOPE | No integrated runtime feature was changed; documentation/state evidence, reproducibility, residual risk, and protected-action boundary are recorded. |
| Protected-action boundary | PASS | No product code, runtime server, browser, database, Docker, watcher, push, deploy, protected smoke, production mutation, provider action, credential access, or secret disclosure was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-6052-app-completion-proof-doc-link-curation-after-luc-6036.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost
workspace is already mixed-dirty, contains unrelated modified
`src/tests/api.test.ts` and many older untracked planning/evidence artifacts,
and `main` is `129` commits ahead of `origin/main`.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad proof-link/doc-link debt
until scanner/reporting separates covered proof packets, generated architecture
documents, implementation infrastructure rows, and true runtime proof
candidates. That is classification debt, not a newly reproduced product
defect.

Next owner/action: none for [LUC-6052](/LUC/issues/LUC-6052). Future scanner
heuristic/proof-link changes belong to Docs Memory / scanner ownership or TSA;
QA should wait for fresh concrete runtime evidence instead of duplicating the
already-covered proof families.
