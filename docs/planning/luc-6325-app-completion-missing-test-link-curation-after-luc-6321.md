# LUC-6325 App-Completion Missing-Test-Link Curation After LUC-6321

Date: 2026-06-30
Issue: [LUC-6325](/LUC/issues/LUC-6325)
Parent: [LUC-6321](/LUC/issues/LUC-6321)
Owner: QA & Verification Engineer
Task Type: QA verification / evidence curation
Current Stage: verification
Status: VERIFIED_DONE_NO_COMMIT

## Goal

Classify the [LUC-6321](/LUC/issues/LUC-6321) app-completion
missing-test-link signal and select one nonduplicated proof target only if the
current snapshot exposes a concrete route, journey, or reproduced behavior not
already covered by recent proof packets.

## Scope

- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-30T00:04:34.059Z`.
- Snapshot headline: `374` items / `7` flows / `363` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Exposed priority rows: `200` risky rows from `priorityReviewItems`.
- Parent packet:
  `docs/planning/luc-6321-known-state-evidence-and-architecture-baseline.md`.
- Recent proof/curation packets checked for duplication:
  - `docs/planning/luc-5263-integration-settings-api-journey-proof.md`
  - `docs/planning/luc-5409-exchange-connection-configuration-proof-ladder.md`
  - `docs/planning/luc-5647-subscription-entitlement-missing-test-proof-ladder.md`
  - `docs/planning/luc-6118-account-access-auth-api-proof.md`
  - `docs/planning/luc-6120-app-completion-subscription-classifier-planning-path-fix.md`
  - `docs/planning/luc-6145-next-app-completion-proof-target-after-luc-6143.md`
  - `docs/planning/luc-6154-qa-proof-selection-highest-risk-missing-test-links.md`
  - `docs/planning/luc-6155-auth-config-api-proof-lane.md`
  - `docs/planning/luc-6191-app-completion-proof-link-curation-after-luc-6166.md`
  - `docs/planning/luc-6210-app-completion-proof-link-curation-after-luc-6204.md`
  - `docs/planning/luc-6221-app-completion-proof-target-selection-after-luc-6219.md`
  - `docs/planning/luc-6295-app-completion-proof-link-curation-after-luc-6292.md`
  - `docs/planning/luc-6319-app-completion-missing-test-link-curation-after-luc-6317.md`

## Exclusions

No product code, schema, migration, test authoring, scanner mutation, local
runtime server, browser, Docker container, database, push, deploy, restart,
protected smoke, provider action, credential access, secret disclosure, or
source-control rewrite was performed.

## Implementation Plan

1. Read the [LUC-6321](/LUC/issues/LUC-6321) evidence packet and current
   app-completion snapshot.
2. Group exposed priority rows by flow, risk, status, owner, type, kind, and
   evidence flags.
3. Compare top target-shaped rows against recent Account access, auth/config,
   Integration Settings, Strategy/Trading, subscription, exchange, dashboard,
   and prior curation packets.
4. Record the selected target or no-target rationale with proof paths,
   verification evidence, residual risk, and source-control posture.

## Snapshot Readback

| Signal | Result |
| --- | --- |
| Generated at | `2026-06-30T00:04:34.059Z` |
| Headline counts | `374` items, `7` flows, `363` missing test links, `0` missing doc links, `0` blocked, `0` browser-review records |
| Exposed priority rows | `200` rows; current generator exports a risky slice rather than every missing-test-link row |
| Priority-row risks | `196` `missing_test_link`, `4` `implemented_needs_proof` |
| Priority-row statuses | `199` `implemented_needs_proof`, `1` `unknown` |
| Priority-row owners | Engineering Delivery Lead `166`, Docs Memory Lead `34` |
| Priority-row types | `42` `api_endpoint`, `59` feature, `51` function, `34` document, `7` component, `3` agent, `3` module, `1` migration |
| Priority-row kinds | `42` `api_endpoint`, `158` `feature_or_capability` |
| Priority-row evidence flags | `4` rows report `evidence.hasTest`, `81` rows report `evidence.hasDoc`, `0` rows need browser proof or screenshot review |

The four priority rows with a test signal are still classified as
`implemented_needs_proof`: `src/integrations/integration-settings.service.ts`,
`src/integrations/secrets.ts`,
`docs/planning/luc-5647-subscription-entitlement-missing-test-proof-ladder.md`,
and `src/app.ts`. They do not expose a new failed behavior; they reinforce
that the current debt is relation/evidence-link curation.

## Flow Curation

| Flow | Current signal | Classification | Decision |
| --- | --- | --- | --- |
| Account access | `94` total in the snapshot and `93` exposed priority rows. Top rows remain `USE /auth`, `USE /v1/auth`, generated auth/config docs, auth pages, auth helper rows, token/key helpers, and Google Drive OAuth/auth rows. | The strongest concrete behavior is already covered or mapped by [LUC-6118](/LUC/issues/LUC-6118), [LUC-6154](/LUC/issues/LUC-6154), [LUC-6155](/LUC/issues/LUC-6155), [LUC-6295](/LUC/issues/LUC-6295), and [LUC-6319](/LUC/issues/LUC-6319). | No duplicate Account access proof selected. Remaining rows are proof-link/scanner curation debt unless a fresh auth failure appears. |
| User configuration | `61` total in the snapshot; the concrete family remains Integration Settings and Google Drive OAuth/configuration. | The strongest behavior duplicates [LUC-5263](/LUC/issues/LUC-5263), [LUC-6154](/LUC/issues/LUC-6154), [LUC-6155](/LUC/issues/LUC-6155), [LUC-6295](/LUC/issues/LUC-6295), and [LUC-6319](/LUC/issues/LUC-6319). | No new runtime proof selected. Best next work is evidence-link curation that attaches existing proof packets to generated rows. |
| Trading operation | `4` total and `4` exposed priority rows. Priority rows remain Strategy route/API/component signals plus `src/app.ts`. | [LUC-6145](/LUC/issues/LUC-6145) reran the Strategy/Trading local API proof for `GET /v1/strategy/context` and passed; [LUC-6295](/LUC/issues/LUC-6295) and [LUC-6319](/LUC/issues/LUC-6319) reclassified the same family. | No duplicate Strategy proof selected. |
| Dashboard overview | `13` total and `13` exposed priority rows. | Current snapshot has `0` browser-review records; dashboard proof is a separate browser/UX release gate only when scoped as a fresh route proof. | Not selected from this QA curation lane. |
| Subscription and entitlement | `4` total and `4` exposed priority rows. | [LUC-6120](/LUC/issues/LUC-6120) reduced false positives and [LUC-5647](/LUC/issues/LUC-5647) carries the proof-ladder signal. The current snapshot exposes no new billing/subscription failure. | Not selected; no subscription runtime repair inferred. |
| Exchange connection and configuration | `2` total and `2` exposed priority rows. | Remaining rows map to API-key/generated proof-ladder documentation, including [LUC-5409](/LUC/issues/LUC-5409), not a fresh exchange provider failure. | Not selected. |
| Unclassified user workflow | `196` total and `84` exposed priority rows. Exposed rows are mostly mounted API routes, architecture scripts, and broad feature entities. | Too broad for a safe proof target without a reproduced failure or owner-selected journey. | Defer; future work should choose one concrete endpoint/screen/journey, not the aggregate label. |

## Selected Target

No fresh nonduplicated runtime proof target is selected from the
[LUC-6321](/LUC/issues/LUC-6321) snapshot.

The aggregate `363` missing-test-link count remains real confidence debt, but
the strongest target-shaped rows duplicate existing proof families:

- Account access and auth/config duplicate [LUC-6118](/LUC/issues/LUC-6118)
  and [LUC-6155](/LUC/issues/LUC-6155).
- Google Drive OAuth and Integration Settings duplicate [LUC-5263](/LUC/issues/LUC-5263)
  plus the [LUC-6154](/LUC/issues/LUC-6154) mapping.
- Strategy/Trading duplicates [LUC-6145](/LUC/issues/LUC-6145).
- Subscription and exchange/configuration rows are proof-ladder or generated
  documentation signals, not fresh runtime failures.
- Dashboard rows remain browser/UX proof candidates only when a route-proof
  issue explicitly scopes browser evidence.

## Recommended Next Owner Path

| Owner | Action | Acceptance Criteria |
| --- | --- | --- |
| Documentation Steward / Architecture curation | Link existing proof packets to generated app-completion rows for Account access, Integration Settings, Strategy, dashboard, subscription, and exchange duplicate families where relation evidence is specific and reproducible. | Regenerated app-completion artifacts show reduced false missing-test-link noise or a documented no-change rationale; no runtime behavior is marked verified without command, browser, or deploy proof. |
| QA/Test | Rerun local proof only when a future snapshot exposes a concrete unproved runtime route, frontend journey, or reproduced failure not already covered by cited packets. | One endpoint/component/journey is named, proof command is run, cleanup is recorded, and duplicate proof is avoided. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Parent packet readback | PASS | `docs/planning/luc-6321-known-state-evidence-and-architecture-baseline.md` records the source baseline, green architecture status, route capability PASS, and this curation lane. |
| App-completion Markdown readback | PASS | `docs/status/app-completion-index.md` records generation `2026-06-30T00:04:34.059Z`, `374` items, `7` flows, `363` missing test links, `0` missing docs, `0` blocked, and `0` browser-review records. |
| App-completion JSON parse | PASS | `docs/status/app-completion-index.json` parsed with Node; priority grouping produced `200` rows, `196` `missing_test_link`, `4` `implemented_needs_proof`, owners `166` Engineering Delivery Lead / `34` Docs Memory Lead, and `0` browser/screenshot review rows. |
| Historical duplicate check | PASS | Recent packets cover the strongest concrete candidates: [LUC-5263](/LUC/issues/LUC-5263), [LUC-5409](/LUC/issues/LUC-5409), [LUC-5647](/LUC/issues/LUC-5647), [LUC-6118](/LUC/issues/LUC-6118), [LUC-6120](/LUC/issues/LUC-6120), [LUC-6145](/LUC/issues/LUC-6145), [LUC-6154](/LUC/issues/LUC-6154), [LUC-6155](/LUC/issues/LUC-6155), [LUC-6191](/LUC/issues/LUC-6191), [LUC-6210](/LUC/issues/LUC-6210), [LUC-6221](/LUC/issues/LUC-6221), [LUC-6295](/LUC/issues/LUC-6295), and [LUC-6319](/LUC/issues/LUC-6319). |
| Source-control posture | MIXED DIRTY | `git status --short --branch` reports `main...origin/main [ahead 131]` with existing generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/UX/operations evidence artifacts. HEAD is `e6c973017c18259411f7116f1fb923471035a9d8`; divergence is `0 131`. |

## Acceptance Criteria

- [x] Current app-completion counts and priority-row limitation are recorded.
- [x] Missing-test-link rows are classified by concrete flow and duplicate
      proof risk.
- [x] One candidate target is selected or a no-target rationale is recorded.
- [x] Source paths, proof commands, owners, and residual risks are recorded.
- [x] No protected action, runtime process, or product mutation is performed.

## Definition Of Done

- The curation decision is recorded in this packet and project state files.
- The issue has one clear disposition: selected proof target, delegated next
  owner, blocked reason, or no-target duplicate-debt closure.
- Source-control status, push status, deploy impact, runtime/process impact,
  and residual risk are explicit.
- No duplicate product repair, QA proof, protected runtime smoke, push, deploy,
  credential access, or production mutation is started from aggregate
  app-completion counts alone.

## Result Report

Status: `VERIFIED_DONE_NO_COMMIT`.

No fresh nonduplicated app-completion proof target was selected. The
[LUC-6321](/LUC/issues/LUC-6321) snapshot still shows aggregate confidence debt
(`363` missing-test-link rows), but the strongest concrete runtime-shaped
candidates duplicate recent local proof or curation packets.

Files changed by this issue: this evidence packet and source-of-truth state
notes only.

Commit status: not committed. The Roost workspace is a shared mixed-dirty
worktree and `main` is ahead of `origin/main` by `131`; this curation packet is
not safely isolatable from existing generated/status churn, unrelated
`src/tests/api.test.ts`, and older untracked planning/UX/operations evidence
artifacts.

Push status: not needed and not performed.

Deploy impact: none.

Runtime/process impact: no local server, browser, Docker container, database,
watcher, or protected runtime process was started by this issue.

Residual risk: aggregate missing-test-link count remains a scanner and
evidence-link confidence signal. Future work should link existing proof packets
to generated rows or pick a new concrete unproved route/journey only when a
fresh snapshot exposes one.
