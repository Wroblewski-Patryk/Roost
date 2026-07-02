# LUC-6221 App-Completion Proof Target Selection After LUC-6219

Date: 2026-06-29
Issue: [LUC-6221](/LUC/issues/LUC-6221)
Parent: [LUC-6219](/LUC/issues/LUC-6219)
Owner: Test Automation Engineer
Task Type: QA verification / proof target selection
Current Stage: verification
Status: VERIFIED_DONE_NO_COMMIT

## Goal

Turn the fresh [LUC-6219](/LUC/issues/LUC-6219) Roost app-completion
evidence signal into the smallest nonduplicated local proof lane, or record
why no fresh nonduplicated target exists.

## Scope

- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-29T08:35:36.162Z`.
- Snapshot headline: `374` items / `7` flows / `363` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Priority slice: `200` exposed `priorityReviewItems`.
- Duplicate-proof families named by current project state: auth/config,
  Google Drive OAuth/configuration, Strategy/Trading, subscription, and
  exchange/configuration proof-ladder generated-doc signals.

## Exclusions

No product code, schema, migration, test authoring, scanner mutation, local
runtime server, browser, Docker container, database, push, deploy, restart,
protected smoke, provider action, credential access, secret disclosure, or
source-control rewrite was performed.

## Implementation Plan

1. Read the [LUC-6221](/LUC/issues/LUC-6221) issue context and current
   app-completion snapshot.
2. Group exposed priority rows by flow, owner, type, gate, route-like shape,
   and evidence flags.
3. Compare the strongest concrete candidates against recent proof packets to
   avoid duplicate QA/runtime work.
4. Record the selected target or no-target rationale, affected paths, smallest
   future proof command, residual risk, and source-control disposition.

## Snapshot Readback

| Signal | Result |
| --- | --- |
| Generated at | `2026-06-29T08:35:36.162Z` |
| Headline counts | `374` items, `7` flows, `363` missing test links, `0` missing doc links, `0` blocked, `0` browser-review records |
| Exposed priority rows | `200` rows; current generator exports a risky slice rather than every missing-test-link row |
| Top exposed groups | Account access auth functions `42`, unclassified API endpoints `38`, unclassified feature/script rows `36`, Account access auth documents `16`, Account access auth features `13` |
| Route/API-like rows reviewed | `/auth`, `/v1/auth`, Google Drive OAuth authorize/exchange docs, auth pages, auth helpers, dashboard route, strategy route, and broad mounted API routes |

## Flow Curation

| Flow | Current signal | Classification | Decision |
| --- | --- | --- | --- |
| Account access | `94` total, `91` missing-test links, `2` implemented-needs-proof, `1` ok. Top rows remain `USE /auth`, `USE /v1/auth`, generated auth/config docs, auth pages, auth helper rows, token/key helpers, and Google Drive OAuth/auth rows. | The strongest behavior is already covered or mapped by [LUC-6118](/LUC/issues/LUC-6118), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). | No duplicate Account access proof selected. Remaining rows are proof-link/scanner curation debt unless a fresh auth failure appears. |
| User configuration | `61` total, `60` missing-test links, `1` implemented-needs-proof. The concrete family remains integration settings and Google Drive OAuth/configuration. | The strongest behavior duplicates [LUC-5263](/LUC/issues/LUC-5263), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). | No new runtime proof selected. Best next work is evidence-link curation that attaches existing proof packets to generated rows. |
| Trading operation | `4` total, `3` missing-test links, `1` implemented-needs-proof. Priority rows are `USE /strategy`, `app.ts`, `strategy.routes.ts`, and `strategy-route.tsx`. | [LUC-6145](/LUC/issues/LUC-6145) already reran the current-snapshot Strategy API proof for `GET /v1/strategy/context` and passed. | No duplicate Strategy proof selected. |
| Dashboard overview | `13` missing-test-link rows: `USE /dashboard`, `dashboard.routes.ts`, shared `cc-*` components, `general-dashboard.tsx`, and `public-home.tsx`. | Current snapshot has `0` browser-review records; dashboard proof is a separate browser/UX gate only when scoped as a fresh route proof. | Not selected from this TAE lane. |
| Subscription and entitlement | `4` rows, all subscription/entitlement proof-ladder or curation document signals. | [LUC-6120](/LUC/issues/LUC-6120) reduced false positives and [LUC-5647](/LUC/issues/LUC-5647) carries the proof-ladder signal. | Not selected; no billing/subscription runtime repair inferred. |
| Exchange connection and configuration | `2` rows: generated API-key middleware doc and [LUC-5409](/LUC/issues/LUC-5409) proof-ladder document. | No concrete unproved exchange runtime row or provider failure is exposed. | Not selected. |
| Unclassified user workflow | `196` total, `191` missing-test links, `5` implemented-needs-proof. Exposed rows are mostly mounted API routes, architecture scripts, and broad feature entities. | Too broad for a safe proof target without a reproduced failure or owner-selected journey. | Defer; future proof work should choose one concrete endpoint/screen/journey, not the aggregate label. |

## Selected Target

No fresh nonduplicated runtime proof target is selected from the
[LUC-6219](/LUC/issues/LUC-6219) snapshot.

The aggregate `363` missing-test-link count remains a real confidence signal,
but the strongest target-shaped rows duplicate existing proof families:

- Account access and auth/config duplicate [LUC-6118](/LUC/issues/LUC-6118)
  and [LUC-6155](/LUC/issues/LUC-6155).
- Google Drive OAuth and integration settings duplicate [LUC-5263](/LUC/issues/LUC-5263)
  plus the [LUC-6154](/LUC/issues/LUC-6154) mapping.
- Strategy/Trading duplicates [LUC-6145](/LUC/issues/LUC-6145).
- Subscription and exchange/configuration rows are proof-ladder or generated
  documentation signals, not fresh runtime failures.

## Smallest Future Verification

If a future snapshot exposes a fresh concrete route, screen, or reproduced
failure, run the smallest owner-scoped local proof for that one target. The
current best generic command template is:

```powershell
npm run test:api:local
```

For a Strategy-like already-built route proof, prefer a focused local API proof
against the compiled test suite and disposable database, as in
[LUC-6145](/LUC/issues/LUC-6145). For auth/config route families, reuse the
proven [LUC-6155](/LUC/issues/LUC-6155) local API harness rather than creating
a parallel proof path.

## Recommended Next Owner Path

| Owner | Action | Acceptance Criteria |
| --- | --- | --- |
| Documentation Steward / Architecture curation | Link existing proof packets to generated app-completion rows for Account access, Integration Settings, Strategy, dashboard, subscription, and exchange duplicate families where relation evidence is specific and reproducible. | Regenerated app-completion artifacts show reduced false missing-test-link noise or a documented no-change rationale; no runtime behavior is marked verified without command, browser, or deploy proof. |
| QA/Test | Reopen local proof only when a future snapshot exposes a concrete unproved runtime route, frontend journey, or reproduced failure not already covered by cited packets. | One endpoint/component/journey is named, proof command is run, cleanup is recorded, and duplicate proof is avoided. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Issue context readback | PASS | Paperclip heartbeat context for [LUC-6221](/LUC/issues/LUC-6221) confirmed scope, parent [LUC-6219](/LUC/issues/LUC-6219), no comments, and shared Roost workspace. |
| App-completion JSON parse | PASS | `docs/status/app-completion-index.json` parsed; headline counts are `374` items / `363` missing test links / `0` missing docs / `0` blocked / `0` browser-review records. |
| Priority-row grouping | PASS | Local readback grouped `200` exposed rows by flow, owner, type, route-like shape, gate, and evidence flags. |
| Historical duplicate check | PASS | Recent packets cover the strongest concrete candidates: [LUC-5263](/LUC/issues/LUC-5263), [LUC-5409](/LUC/issues/LUC-5409), [LUC-5647](/LUC/issues/LUC-5647), [LUC-6118](/LUC/issues/LUC-6118), [LUC-6120](/LUC/issues/LUC-6120), [LUC-6145](/LUC/issues/LUC-6145), [LUC-6154](/LUC/issues/LUC-6154), and [LUC-6155](/LUC/issues/LUC-6155). |
| Source-control posture | MIXED DIRTY | `git status --short --branch` reports `main...origin/main [ahead 131]` with unrelated modified `src/tests/api.test.ts` and many older untracked planning/UX/operations evidence artifacts. |

## Acceptance Criteria

- [x] Current app-completion counts and priority-row limitation are recorded.
- [x] Missing-test-link rows are classified by concrete flow and duplicate
      proof risk.
- [x] One candidate target is selected or a no-target rationale is recorded.
- [x] Affected paths, proof commands, owners, and residual risks are recorded.
- [x] No protected action, runtime process, or product mutation is performed.

## Definition Of Done

- The proof-target decision is recorded in this packet and project state files.
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
[LUC-6219](/LUC/issues/LUC-6219) snapshot still shows aggregate confidence debt
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
