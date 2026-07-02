# LUC-5658 Subscription Entitlement App-Completion Inference Curation

## Header

- ID: [LUC-5658](/LUC/issues/LUC-5658)
- Title: [Roost] [Docs/Architecture] Curate subscription-entitlement app-completion inference after [LUC-5656](/LUC/issues/LUC-5656)
- Task Type: documentation / architecture curation
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Priority: P1
- Mission ID: LUC-5658-SUBSCRIPTION-ENTITLEMENT-INFERENCE-CURATION
- Mission Status: VERIFIED

## Goal

Classify the current `Subscription and entitlement` app-completion signal after
[LUC-5656](/LUC/issues/LUC-5656), separate docs-only scanner inference from
real missing runtime proof, and leave a safe next-owner path without creating
duplicate QA runtime work.

## Scope

- Current app-completion output:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
- Current architecture scanner override map:
  - `docs/architecture/scanner-overrides.json`
- Shared scanner implementation inspected read-only:
  - `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs`
  - `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`
- Prior evidence packets:
  - `docs/planning/luc-5656-known-state-evidence-and-architecture-baseline.md`
  - `docs/planning/luc-5647-subscription-entitlement-missing-test-proof-ladder.md`
  - `docs/planning/luc-5392-subscription-entitlement-finance-proof-ladder.md`
  - `docs/planning/luc-5433-finance-browser-proof-ladder.md`
  - `docs/planning/luc-5624-sales-context-and-board-proof.md`
  - `docs/planning/luc-5628-sales-context-and-board-local-qa-proof-after-luc-5623.md`

## Exclusions

No product code, schema, migration, test authoring, runtime server, browser,
database, Docker, push, deploy, protected smoke, production mutation, provider
action, credential access, secret disclosure, or sibling-repository script
mutation was performed.

## Implementation Plan

1. Read [LUC-5656](/LUC/issues/LUC-5656), [LUC-5647](/LUC/issues/LUC-5647),
   and current app-completion outputs.
2. Count the current `Subscription and entitlement` priority-review rows by
   type, kind, owner, and concrete runtime shape.
3. Inspect the shared app-completion heuristic and scanner override mechanism.
4. Record a curation decision that protects real subscription, money, auth, and
   configuration gates while preventing duplicate QA reruns from docs-only
   feature-capability rows.
5. Update source-of-truth state with the verified classification and next
   owner path.

## Verification Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Current app-completion snapshot | `docs/status/app-completion-index.json` generated `2026-06-27T20:43:37.445Z` | PASS |
| Flow count | `Subscription and entitlement`: `540` entities, `516` missing test links, `20` implemented-needs-proof, `4` ok | PASS |
| Priority subset shape | Node readback of current JSON found `106` subscription priority rows: `105` documents and `1` agent prompt | PASS |
| Runtime surface count in priority subset | `0` concrete `api_endpoint`, route, or page rows in the current subscription priority subset | PASS |
| Kind classification | `106/106` rows are `feature_or_capability` | PASS |
| Owner classification | `105` rows owned by Docs Memory Lead, `1` by Engineering Delivery Lead | PASS |
| Existing runtime proof | Finance API/browser, Sales context/browser, Assets context/files/preview, and People/Agents directory are already covered by existing proof packets listed above | VERIFIED by prior packets |
| Shared app-completion heuristic | `build-app-completion-index.mjs` maps text containing `subscription`, `billing`, `stripe`, `plan`, or `checkout` to `Subscription and entitlement` and includes entities when `kind`, gates, or `entity.type === "feature"` are present | PASS |
| Root-cause classification | `docs/planning/...` paths contain `plan`, so historical planning/evidence documents are subscription-gated even when they are not runtime subscription surfaces | VERIFIED |
| Scanner override mechanism | `build-architecture-awareness-index.mjs` entity overrides can change file entity type, name, description, status, owner, dependencies, and evidence, but the app-completion flow heuristic still evaluates entity text including path | PASS |

## Decision

The current high `Subscription and entitlement` count is a scanner inference
signal, not a direct runtime repair queue.

The root cause is the shared app-completion keyword heuristic treating the
substring `plan` inside `docs/planning/...` as a subscription/plan signal. That
pulls historical task contracts, evidence packets, and planning documents into
the subscription flow as `feature_or_capability` rows. This is useful as a
coarse confidence warning, but it is not specific enough to justify another
Finance, Sales, Assets, or People/Agents browser/API rerun without a concrete
route, endpoint, screen, or capability row.

Do not suppress real subscription, money, permission, auth, configuration, or
provider guardrails. The safe curation boundary is:

- QA should select a new proof only when app-completion surfaces a concrete
  unverified runtime record such as an API endpoint, route, page, browser
  surface, or capability with no current proof.
- Docs/Architecture should treat docs-only `feature_or_capability` rows under
  `docs/planning/` as evidence-link or scanner-classification debt, not as
  product defects.
- A future shared scanner fix should tokenize keyword matching so `plan` does
  not match the `planning` path segment, or should classify planning/evidence
  packets into a separate docs-evidence bucket before app-completion flow
  assignment.

## Next Owner Path

1. Shared scanner owner / Technical Solution Architect:
   update `build-app-completion-index.mjs` flow detection so `plan` matches
   standalone subscription-plan language, not the `docs/planning` path segment.
   Verify that real billing/subscription/checkout/plan entities remain
   subscription-gated.
2. Docs Memory Lead:
   add evidence links for completed proof packets where concrete runtime rows
   remain unlinked, starting with auth alias/OAuth/dashboard rows already
   mapped by [LUC-5648](/LUC/issues/LUC-5648).
3. QA/Test:
   skip duplicate subscription/entitlement runtime reruns until a future
   refresh exposes a specific unverified runtime surface or fresh regression.

## Acceptance Criteria

- [x] Current `Subscription and entitlement` app-completion signal was
      classified with counts.
- [x] Docs-only feature-capability inference was separated from concrete
      runtime proof gaps.
- [x] Existing Finance, Sales, Assets, and People/Agents proof was preserved as
      valid local evidence.
- [x] No product/runtime mutation or protected action occurred.
- [x] Next owner path names the shared scanner correction without claiming it
      was completed in this Roost docs lane.

## Result Report

Status: `VERIFIED`.

This curation closes [LUC-5658](/LUC/issues/LUC-5658) as a docs/architecture
classification lane. The current subscription-entitlement pressure is mostly
docs-only app-completion inference caused by keyword matching over planning
paths. It should not trigger duplicate runtime QA proof. The remaining concrete
follow-up is a shared scanner heuristic improvement owned by the scanner/TSA
lane, plus evidence-link cleanup for already-proven runtime rows.

Commit status: not committed in this heartbeat because the workspace already
contains pre-existing generated/status and sibling planning/evidence changes
outside this issue boundary.

Push status: not pushed.

Deploy impact: none.

Residual risk: until the shared scanner heuristic is corrected, future
app-completion refreshes may continue to show a large
`Subscription and entitlement` missing-test count. The risk is planning noise,
not a newly observed broken user journey.
