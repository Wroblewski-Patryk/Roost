# LUC-6191 App-Completion Proof-Link Curation After LUC-6166

Date: 2026-06-29
Issue: [LUC-6191](/LUC/issues/LUC-6191)
Parent: [LUC-6166](/LUC/issues/LUC-6166)
Owner: QA & Verification Engineer
Task Type: QA verification / evidence curation
Current Stage: verification
Status: VERIFIED_DONE_NO_COMMIT

## Goal

Classify the [LUC-6166](/LUC/issues/LUC-6166) app-completion
missing-test-link queue and select one nonduplicated proof target only if the
current snapshot exposes a concrete route, journey, or reproduced behavior not
already covered by recent proof packets.

## Scope

- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-29T07:09:46.105Z`.
- Snapshot headline: `374` items / `7` flows / `363` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Exposed priority rows: `200` risky rows from `priorityReviewItems`.
- Parent packet:
  `docs/planning/luc-6166-known-state-evidence-and-architecture-baseline.md`.
- Recent proof/curation packets checked for duplication:
  - `docs/planning/luc-5263-integration-settings-api-journey-proof.md`
  - `docs/planning/luc-5570-api-auth-config-route-coverage.md`
  - `docs/planning/luc-6118-account-access-auth-api-proof.md`
  - `docs/planning/luc-6145-next-app-completion-proof-target-after-luc-6143.md`
  - `docs/planning/luc-6154-qa-proof-selection-highest-risk-missing-test-links.md`
  - `docs/planning/luc-6155-auth-config-api-proof-lane.md`
  - `docs/planning/luc-6159-app-completion-missing-test-link-curation-after-luc-6152.md`

## Exclusions

No product code, schema, migration, test authoring, scanner mutation, local
runtime server, browser, Docker container, database, push, deploy, restart,
protected smoke, provider action, credential access, secret disclosure, or
source-control rewrite was performed.

## Implementation Plan

1. Read the [LUC-6166](/LUC/issues/LUC-6166) evidence packet and current
   app-completion snapshot.
2. Group exposed priority rows by risk, status, flow, owner, type, and
   evidence flags.
3. Compare top flows against recent Account access, auth/config, integration
   settings, Strategy/Trading, and prior app-completion curation packets.
4. Record the selected target or no-target rationale with proof paths,
   verification evidence, residual risk, and source-control posture.

## Generated Snapshot Readback

| Signal | Result |
| --- | --- |
| Headline counts | `374` items, `7` flows, `363` missing test links, `0` missing doc links, `0` blocked |
| Exposed priority rows | `200` rows; current generator exports a risky slice rather than every missing-test-link row |
| Priority-row risks | `196` `missing_test_link`, `4` `implemented_needs_proof` |
| Priority-row statuses | `199` `implemented_needs_proof`, `1` `unknown` |
| Priority-row owners | Engineering Delivery Lead `166`, Docs Memory Lead `34` |
| Priority-row types | `59` feature, `51` function, `42` api_endpoint, `34` document, `7` component, `3` agent, `3` module, `1` migration |
| Priority-row evidence | `4` rows have a test signal, `81` rows have a doc signal |

## Flow Curation

| Flow | Current signal | Classification | Decision |
| --- | --- | --- | --- |
| Account access | `94` total, `91` missing-test links, `2` implemented-needs-proof, `1` ok | Top rows remain `/auth`, `/v1/auth`, generated auth/config docs, Google Drive OAuth docs, auth helper rows, and recent proof packets. [LUC-6118](/LUC/issues/LUC-6118), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155) already cover the strongest concrete API/auth/config behavior. | No duplicate Account access proof selected. Treat remaining rows as evidence-link/scanner curation debt unless a fresh auth/runtime failure appears. |
| User configuration | `61` total, `60` missing-test links, `1` implemented-needs-proof | Strongest target-like family remains `USE /integration-settings` and Google Drive OAuth/configuration docs. [LUC-5263](/LUC/issues/LUC-5263), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155) already map or prove this journey. | No new runtime proof selected. Best next work is evidence-link curation that attaches existing proof packets to generated rows. |
| Trading operation | `4` total, `3` missing-test links, `1` implemented-needs-proof | [LUC-6145](/LUC/issues/LUC-6145) reran the Strategy/Trading local API proof for `GET /v1/strategy/context` and passed. | No duplicate Strategy proof target selected. |
| Dashboard overview | `13` missing-test links | Rows remain dashboard route/component linkage debt and current snapshot has `0` browser-review rows. Prior curation already classified dashboard proof as separate only when a browser/UX release gate scopes it. | Not selected. |
| Subscription and entitlement | `4` total, `3` missing-test links, `1` implemented-needs-proof | Remaining rows are explicit subscription/entitlement proof-ladder or curation documents after the broad classifier repair. | Not selected; no billing/subscription runtime repair inferred. |
| Exchange connection and configuration | `2` missing-test links | Remaining rows are generated/API-key middleware and proof-ladder documents, not a fresh exchange runtime failure. | Not selected. |
| Unclassified user workflow | `196` total, `191` missing-test links, `5` implemented-needs-proof | Mostly mounted API route rows, architecture scripts, and broad feature entities. The aggregate label is too broad for a safe QA target without a reproduced failure or owner-selected journey. | Defer; future work should choose one concrete journey, endpoint, or screen. |

## Selected Target

No fresh nonduplicated runtime proof target is selected from the
[LUC-6166](/LUC/issues/LUC-6166) snapshot.

The current strongest candidates duplicate existing proof families:

- Account access and auth/config duplicate [LUC-6118](/LUC/issues/LUC-6118)
  and [LUC-6155](/LUC/issues/LUC-6155).
- Google Drive OAuth and integration settings duplicate [LUC-5263](/LUC/issues/LUC-5263)
  plus the [LUC-6154](/LUC/issues/LUC-6154) mapping.
- Strategy/Trading duplicates [LUC-6145](/LUC/issues/LUC-6145).

The additional one-row delta since the prior [LUC-6159](/LUC/issues/LUC-6159)
curation does not expose a new route, browser journey, blocked record, missing
doc link, route-capability failure, or reproduced product defect. It is best
handled as proof-link/scanner confidence debt, not as duplicate QA execution.

## Recommended Next Owner Path

| Owner | Action | Acceptance Criteria |
| --- | --- | --- |
| Documentation Steward / Architecture curation | Link existing proof packets to generated app-completion rows for Account access, Integration Settings, Strategy, and dashboard duplicate families where relation evidence is specific and reproducible. | Regenerated app-completion artifacts show reduced false missing-test-link noise or a documented no-change rationale; no runtime behavior is marked verified without command/browser/deploy proof. |
| QA/Test | Rerun local proof only when a future snapshot exposes a concrete unproved runtime route, frontend journey, or reproduced failure not already covered by cited packets. | One endpoint/component/journey is named, proof command is run, cleanup is recorded, and duplicate proof is avoided. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| App-completion JSON parse | PASS | `docs/status/app-completion-index.json` parsed; headline counts match [LUC-6166](/LUC/issues/LUC-6166): `374` items / `363` missing test links / `0` missing docs / `0` blocked. |
| Priority-row grouping | PASS | Local readback grouped `200` exposed priority rows by risk, status, owner, type, and evidence flags. |
| Parent packet readback | PASS | `docs/planning/luc-6166-known-state-evidence-and-architecture-baseline.md` records the source snapshot, green architecture status, route capability PASS, and scanner timeout follow-up. |
| Historical duplicate check | PASS | Recent packets cover the strongest concrete candidates: [LUC-5263](/LUC/issues/LUC-5263), [LUC-6118](/LUC/issues/LUC-6118), [LUC-6145](/LUC/issues/LUC-6145), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). |
| Source-control posture | MIXED DIRTY | `git status --short --branch` reports `main...origin/main [ahead 130]` with existing generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/UX evidence artifacts. |

## Acceptance Criteria

- [x] Current app-completion counts and priority-row limitation are recorded.
- [x] Missing-test-link rows are classified by concrete flow and duplicate
      proof risk.
- [x] One candidate target is selected or a no-target rationale is recorded.
- [x] Source paths, proof commands, owners, and residual risks are recorded.
- [x] No protected action, runtime process, or product mutation is performed.

## Result Report

Status: `VERIFIED_DONE_NO_COMMIT`.

No fresh nonduplicated app-completion proof target was selected. The
[LUC-6166](/LUC/issues/LUC-6166) snapshot still shows real aggregate
confidence debt (`363` missing-test-link rows), but the strongest concrete
runtime-shaped candidates duplicate recent local proof or curation packets.

Files changed by this issue: this packet and source-of-truth state notes only.

Commit status: not committed. The Roost workspace is a shared mixed-dirty
worktree and `main` is ahead of `origin/main` by `130`; this curation packet is
not safely isolatable from existing generated/status churn, unrelated
`src/tests/api.test.ts`, and older untracked planning/UX evidence artifacts.

Push status: not needed and not performed.

Deploy impact: none.

Runtime/process impact: no local server, browser, Docker container, database,
watcher, or protected runtime process was started by this issue.

Residual risk: the aggregate missing-test-link count remains a scanner and
evidence-link confidence signal. Future work should link existing proof packets
to generated rows or pick a new concrete unproved route/journey only when a
fresh snapshot exposes one.
