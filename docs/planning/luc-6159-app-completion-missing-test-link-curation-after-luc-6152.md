# LUC-6159 App-Completion Missing-Test-Link Curation After LUC-6152

## Header

- ID: [LUC-6159](/LUC/issues/LUC-6159)
- Parent: [LUC-6152](/LUC/issues/LUC-6152)
- Task Type: technical solution architecture / evidence curation
- Current Stage: verification
- Status: VERIFIED_DONE_NO_COMMIT
- Owner: Technical Solution Architect
- Date: 2026-06-29

## Goal

Inspect the [LUC-6152](/LUC/issues/LUC-6152) app-completion missing-test-link
queue and decide whether it exposes a fresh non-duplicated proof target or
should be treated as scanner/evidence-link debt.

## Scope

- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-29T01:46:49.162Z`.
- Snapshot headline: `373` items / `7` flows / `362` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Priority rows exposed by the generated JSON: `200` risky rows from
  `priorityReviewItems`.
- Full-item reconstruction source: `docs/graphs/architecture-awareness.json`
  using the current `build-app-completion-index.mjs` classifier logic.
- Historical proof packets inspected:
  - `docs/planning/luc-5263-integration-settings-api-journey-proof.md`
  - `docs/planning/luc-5570-api-auth-config-route-coverage.md`
  - `docs/planning/luc-6060-app-completion-evidence-link-curation-after-luc-6054.md`
  - `docs/planning/luc-6118-account-access-auth-api-proof.md`
  - `docs/planning/luc-6120-app-completion-subscription-classifier-planning-path-fix.md`
  - `docs/planning/luc-6145-next-app-completion-proof-target-after-luc-6143.md`

## Exclusions

No product code, schema, migration, test authoring, scanner mutation, runtime
server, browser, Docker container, push, deploy, restart, protected smoke,
provider action, credential access, secret disclosure, or source-control rewrite
was performed.

## Implementation Plan

1. Read the [LUC-6152](/LUC/issues/LUC-6152) packet and current
   app-completion snapshot.
2. Group exposed priority rows by flow, owner, type, status, evidence, and
   risk.
3. Read the generator source to confirm whether the JSON is a full row export
   or a priority slice.
4. Reconstruct hidden aggregate rows read-only from the architecture graph where
   needed.
5. Compare candidate flows against recent proof packets to avoid duplicate QA
   work.
6. Record the selected target or no-target rationale, owner path, verification,
   and source-control disposition.

## Generated Snapshot Readback

| Signal | Result |
| --- | --- |
| Headline counts | `373` items, `7` flows, `362` missing test links, `0` missing doc links, `0` blocked |
| Exposed priority rows | `200` rows; generator uses `.filter(item.risk !== "ok").slice(0, 200)` |
| Priority-row risks | `196` `missing_test_link`, `4` `implemented_needs_proof` |
| Priority-row statuses | `199` `implemented_needs_proof`, `1` `unknown` |
| Priority-row owners | Engineering Delivery Lead `167`, Docs Memory Lead `33` |
| Priority-row types | `60` feature, `51` function, `42` api_endpoint, `33` document, `7` component, `3` agent, `3` module, `1` migration |
| Priority-row evidence | `4` rows have a test signal, `81` rows have a doc signal |

## Flow Curation

| Flow | Current signal | Classification | Decision |
| --- | --- | --- | --- |
| Account access | `93` total, `90` missing-test links, `2` implemented-needs-proof | Existing local auth/API proof family covers the concrete route behavior, including [LUC-6118](/LUC/issues/LUC-6118). Remaining rows include route mounts, auth helpers, generated docs, and planning packets with no direct test relation. | No new QA target selected. Treat as evidence-link/scanner curation debt unless a fresh auth runtime failure appears. |
| Trading operation | `4` total, `3` missing-test links, `1` implemented-needs-proof | [LUC-6145](/LUC/issues/LUC-6145) reran the Strategy/Trading local API proof for `GET /v1/strategy/context` and confirmed it still passes. | No duplicate Strategy proof target selected. |
| User configuration | `61` total, `60` missing-test links, `1` implemented-needs-proof | The aggregate rows are hidden behind the 200-row priority slice. Read-only reconstruction shows the top concrete row is `USE /integration-settings` plus generated integration-settings route docs. [LUC-5263](/LUC/issues/LUC-5263) already verified this journey locally with `npm run test:api:local`; [LUC-5570](/LUC/issues/LUC-5570) also added auth/config assertions but left behavioral execution partially blocked by Docker at that time. | No new runtime proof selected from this heartbeat. Best next owner is Documentation/Architecture curation to link existing integration-settings proof to generated rows, or QA only if a new failing config behavior is reproduced. |
| Dashboard overview | `13` missing-test links | Rows include `USE /dashboard`, `dashboard.routes.ts`, shared `cc-*` components, and dashboard/public-home web files. Existing dashboard proof packets are already referenced by prior curation lanes; current snapshot has `0` browser-review rows. | Not selected; duplicate unless a future browser/UX release gate scopes dashboard clickthrough proof. |
| Subscription and entitlement | `4` total, `3` missing-test links, `1` implemented-needs-proof | [LUC-6120](/LUC/issues/LUC-6120) fixed the broad subscription classifier false-positive and reduced this flow to explicit subscription language. Remaining rows are proof-ladder/curation documents, not a fresh runtime endpoint. | Not selected; no billing/subscription runtime repair inferred. |
| Exchange connection and configuration | `2` missing-test links | Rows are `Api Key.Middleware` generated doc and [LUC-5409](/LUC/issues/LUC-5409) proof-ladder document. | Not selected; no concrete unproved exchange runtime row exposed. |
| Unclassified user workflow | `196` total, `191` missing-test links, `5` implemented-needs-proof | Mostly mounted API route rows, scripts, and broad feature entities. This is too broad for a safe proof target without a reproduced failure or owner-selected journey. | Defer; future work should pick one concrete user journey, not the aggregate flow label. |

## Selected Target

No fresh non-duplicated runtime proof target is selected from the current
snapshot.

The best current target-like candidate is `User configuration` /
`USE /integration-settings`, but it duplicates the verified
[LUC-5263](/LUC/issues/LUC-5263) Integration Settings API journey proof. The
right next action is not another local API rerun; it is an evidence-link or
scanner curation lane that attaches existing proof packets to generated
app-completion rows without changing runtime confidence labels beyond available
evidence.

## Recommended Next Owner Path

| Owner | Action | Acceptance Criteria |
| --- | --- | --- |
| Documentation Steward / Architecture curation | Link existing proof packets to generated app-completion rows for `Account access`, `Integration Settings`, `Strategy`, and dashboard duplicate families where the proof relation is specific and reproducible. | Regenerated app-completion artifacts show reduced false missing-test-link noise or a documented no-change rationale; no runtime behavior is marked verified without command/browser/deploy proof. |
| QA/Test | Only rerun local proof when a future snapshot exposes a concrete unproved runtime route, frontend journey, or reproduced failure not already covered by the cited packets. | One endpoint/component/journey is named, proof command is run, cleanup is recorded, and duplicate proof is avoided. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| App-completion JSON parse | PASS | `docs/status/app-completion-index.json` parsed; headline counts match [LUC-6152](/LUC/issues/LUC-6152). |
| Priority-row grouping | PASS | Local readback grouped `200` exposed priority rows by risk, status, flow, owner, type, kind, and evidence flags. |
| Generator contract readback | PASS | `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs` confirms `priorityReviewItems` is a `200`-row risky slice, not a full export. |
| Hidden row reconstruction | PASS | Read-only reconstruction from `docs/graphs/architecture-awareness.json` confirmed `User configuration` rows start with `USE /integration-settings` and integration-settings route/document entities. |
| Historical duplicate check | PASS | [LUC-5263](/LUC/issues/LUC-5263), [LUC-6118](/LUC/issues/LUC-6118), [LUC-6145](/LUC/issues/LUC-6145), and related curation packets cover the strongest concrete candidates. |
| Source-control posture | MIXED DIRTY | `git status --short --branch` reports `main...origin/main [ahead 130]` with existing mixed generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/UX evidence artifacts. |

## Acceptance Criteria

- [x] Current app-completion counts and priority-row limitation are recorded.
- [x] Missing-test-link rows are classified by concrete flow and duplicate
      proof risk.
- [x] One candidate target is selected or a no-target rationale is recorded.
- [x] Source paths, proof commands, owners, and residual risks are recorded.
- [x] No protected action or product runtime mutation is performed.

## Result Report

Status: `VERIFIED_DONE_NO_COMMIT`.

No fresh non-duplicated app-completion proof target was selected. The strongest
runtime-shaped current candidate, `User configuration` /
`USE /integration-settings`, duplicates [LUC-5263](/LUC/issues/LUC-5263),
which already ran `npm run test:api:local` successfully across the integration
settings journey. Current `Account access` and `Trading operation` candidates
also duplicate recent [LUC-6118](/LUC/issues/LUC-6118) and
[LUC-6145](/LUC/issues/LUC-6145) proof.

Files changed by this issue: this packet and source-of-truth state notes only.

Commit status: not committed. The Roost workspace is a shared mixed-dirty
worktree and `main` is ahead of `origin/main` by `130`; this curation packet is
not safely isolatable from existing generated/status churn and unrelated
`src/tests/api.test.ts`.

Push status: not needed and not performed.

Deploy impact: none.

Runtime/process impact: no local server, browser, Docker container, watcher, or
protected runtime process was started by this issue.

Residual risk: the aggregate `362` missing-test-link count remains real as a
scanner/evidence-link confidence signal, but it should not be converted into
duplicate QA or implementation work without a concrete unproved route, journey,
or reproduced failure.
