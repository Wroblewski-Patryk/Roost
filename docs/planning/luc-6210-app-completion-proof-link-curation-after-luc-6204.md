# LUC-6210 App-Completion Proof-Link Curation After LUC-6204

Date: 2026-06-29
Issue: [LUC-6210](/LUC/issues/LUC-6210)
Parent: [LUC-6204](/LUC/issues/LUC-6204)
Owner: Technical Solution Architect
Task Type: technical solution architecture / evidence curation
Current Stage: verification
Status: VERIFIED_DONE_NO_COMMIT

## Goal

Curate the [LUC-6204](/LUC/issues/LUC-6204) app-completion proof-link signal
and decide whether the current snapshot exposes one fresh nonduplicated proof
target or should be closed as duplicate scanner/evidence-link confidence debt.

## Scope

- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-29T08:12:40.536Z`.
- Snapshot headline: `374` items / `7` flows / `363` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Exposed priority rows: `200` risky rows from `priorityReviewItems`.
- Parent packet:
  `docs/planning/luc-6204-known-state-evidence-and-architecture-baseline.md`.
- Duplicate-proof packets checked:
  - `docs/planning/luc-5263-integration-settings-api-journey-proof.md`
  - `docs/planning/luc-5409-exchange-connection-configuration-proof-ladder.md`
  - `docs/planning/luc-5647-subscription-entitlement-missing-test-proof-ladder.md`
  - `docs/planning/luc-6118-account-access-auth-api-proof.md`
  - `docs/planning/luc-6120-app-completion-subscription-classifier-planning-path-fix.md`
  - `docs/planning/luc-6145-next-app-completion-proof-target-after-luc-6143.md`
  - `docs/planning/luc-6154-qa-proof-selection-highest-risk-missing-test-links.md`
  - `docs/planning/luc-6155-auth-config-api-proof-lane.md`
  - `docs/planning/luc-6159-app-completion-missing-test-link-curation-after-luc-6152.md`
  - `docs/planning/luc-6191-app-completion-proof-link-curation-after-luc-6166.md`

## Exclusions

No product code, schema, migration, test authoring, scanner mutation, local
runtime server, browser, Docker container, database, push, deploy, restart,
protected smoke, provider action, credential access, secret disclosure, or
source-control rewrite was performed.

## Implementation Plan

1. Read the [LUC-6210](/LUC/issues/LUC-6210) issue context, parent
   [LUC-6204](/LUC/issues/LUC-6204) packet, and current app-completion
   snapshot.
2. Group exposed priority rows by flow, status, owner, type, route-like shape,
   gate, and evidence flags.
3. Compare top concrete candidates against recent proof packets to avoid
   duplicate QA/runtime work.
4. Record the selected target or no-target rationale, residual risk, and
   source-control disposition.

## Snapshot Readback

| Signal | Result |
| --- | --- |
| Headline counts | `374` items, `7` flows, `363` missing test links, `0` missing doc links, `0` blocked |
| Exposed priority rows | `200` rows; current generator exports a risky slice rather than every missing-test-link row |
| Priority-row statuses | `199` `implemented_needs_proof`, `1` `unknown` |
| Priority-row owners | Engineering Delivery Lead `166`, Docs Memory Lead `34` |
| Priority-row types | `59` feature, `51` function, `42` api_endpoint, `34` document, `7` component, `3` agent, `3` module, `1` migration |
| Route-like priority rows | `44` rows |
| Priority rows with doc signal | `81` rows |
| Priority rows gated by auth | `98` rows |

## Flow Curation

| Flow | Current signal | Classification | Decision |
| --- | --- | --- | --- |
| Account access | `94` total, `91` missing-test links, `2` implemented-needs-proof, `1` ok. Top rows remain `USE /auth`, `USE /v1/auth`, generated auth/config docs, auth helper rows, token/key helpers, and Google Drive OAuth/auth rows. | The strongest behavior is already covered by [LUC-6118](/LUC/issues/LUC-6118), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). | No duplicate Account access proof selected. Treat remaining rows as proof-link/scanner curation debt unless a fresh auth failure appears. |
| User configuration | `61` total, `60` missing-test links, `1` implemented-needs-proof. The rows are not exposed in the current 200-row priority slice, but the parent and prior curations map the concrete family to `USE /integration-settings` and generated integration-settings docs. | The strongest behavior duplicates [LUC-5263](/LUC/issues/LUC-5263), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). | No new runtime proof selected. Best next work is evidence-link curation that attaches existing proof packets to generated rows. |
| Trading operation | `4` total, `3` missing-test links, `1` implemented-needs-proof. Priority rows are `USE /strategy`, `app.ts`, `strategy.routes.ts`, and `strategy-route.tsx`. | [LUC-6145](/LUC/issues/LUC-6145) reran the Strategy/Trading local API proof for `GET /v1/strategy/context` and passed. | No duplicate Strategy proof selected. |
| Dashboard overview | `13` missing-test-link rows: `USE /dashboard`, `dashboard.routes.ts`, shared `cc-*` components, `general-dashboard.tsx`, and `public-home.tsx`. | Current snapshot has `0` browser-review records; dashboard proof is a separate browser/UX release gate only when scoped. | Not selected from this curation lane. |
| Subscription and entitlement | `4` rows, all explicit subscription/entitlement proof-ladder or curation documents. | [LUC-6120](/LUC/issues/LUC-6120) already reduced false positives; [LUC-5647](/LUC/issues/LUC-5647) carries proof-ladder/test signal. | Not selected; no billing/subscription runtime repair inferred. |
| Exchange connection and configuration | `2` rows: `Api Key.Middleware` generated doc and [LUC-5409](/LUC/issues/LUC-5409) proof-ladder document. | No concrete unproved exchange runtime row or provider failure is exposed. | Not selected. |
| Unclassified user workflow | `196` total, `191` missing-test links, `5` implemented-needs-proof. Exposed rows are mostly mounted API routes, architecture scripts, and broad feature entities. | Too broad for a safe proof target without a reproduced failure or owner-selected journey. | Defer; future work should choose one concrete endpoint/screen/journey, not the aggregate label. |

## Selected Target

No fresh nonduplicated runtime proof target is selected from the
[LUC-6204](/LUC/issues/LUC-6204) snapshot.

The current strongest candidates duplicate existing proof families:

- Account access and auth/config duplicate [LUC-6118](/LUC/issues/LUC-6118)
  and [LUC-6155](/LUC/issues/LUC-6155).
- Google Drive OAuth and integration settings duplicate [LUC-5263](/LUC/issues/LUC-5263)
  plus the [LUC-6154](/LUC/issues/LUC-6154) mapping.
- Strategy/Trading duplicates [LUC-6145](/LUC/issues/LUC-6145).
- Subscription and exchange/configuration rows are proof-ladder or generated
  documentation rows, not fresh runtime failures.

The current aggregate `363` missing-test-link count remains a real confidence
signal, but this curation lane should not convert it into duplicate QA or
implementation work without a concrete unproved route, browser journey, or
reproduced failure.

## Recommended Next Owner Path

| Owner | Action | Acceptance Criteria |
| --- | --- | --- |
| Documentation Steward / Architecture curation | Link existing proof packets to generated app-completion rows for Account access, Integration Settings, Strategy, dashboard, subscription, and exchange duplicate families where the relation evidence is specific and reproducible. | Regenerated app-completion artifacts show reduced false missing-test-link noise or a documented no-change rationale; no runtime behavior is marked verified without command, browser, or deploy proof. |
| QA/Test | Rerun local proof only when a future snapshot exposes a concrete unproved runtime route, frontend journey, or reproduced failure not already covered by cited packets. | One endpoint/component/journey is named, proof command is run, cleanup is recorded, and duplicate proof is avoided. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Issue context readback | PASS | Paperclip heartbeat context for [LUC-6210](/LUC/issues/LUC-6210) confirmed scope, parent [LUC-6204](/LUC/issues/LUC-6204), no comments, and shared Roost workspace. |
| Parent packet readback | PASS | `docs/planning/luc-6204-known-state-evidence-and-architecture-baseline.md` records the source baseline and delegates this curation lane. |
| App-completion JSON parse | PASS | `docs/status/app-completion-index.json` parsed; headline counts are `374` items / `363` missing test links / `0` missing docs / `0` blocked. |
| Priority-row grouping | PASS | Local readback grouped `200` exposed rows by flow, status, owner, type, route-like shape, gate, and evidence flags. |
| Historical duplicate check | PASS | Recent packets cover the strongest concrete candidates: [LUC-5263](/LUC/issues/LUC-5263), [LUC-5409](/LUC/issues/LUC-5409), [LUC-5647](/LUC/issues/LUC-5647), [LUC-6118](/LUC/issues/LUC-6118), [LUC-6145](/LUC/issues/LUC-6145), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). |
| Source-control posture | MIXED DIRTY | `git status --short --branch` reports `main...origin/main [ahead 130]` with existing generated/status/state changes, unrelated modified `src/tests/api.test.ts`, and many older untracked planning/UX evidence artifacts. |

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
[LUC-6204](/LUC/issues/LUC-6204) snapshot still shows aggregate confidence
debt (`363` missing-test-link rows), but the strongest concrete
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

Residual risk: aggregate missing-test-link count remains a scanner and
evidence-link confidence signal. Future work should link existing proof packets
to generated rows or pick a new concrete unproved route/journey only when a
fresh snapshot exposes one.
