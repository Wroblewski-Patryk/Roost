# LUC-5668 App-Completion Evidence-Link Classification Debt

## Header

- ID: [LUC-5668](/LUC/issues/LUC-5668)
- Title: [Roost] [LUC-5666] Curate app-completion evidence-link classification debt
- Task Type: documentation / architecture curation
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Parent: [LUC-5666](/LUC/issues/LUC-5666)
- Priority: P1
- Mission ID: LUC-5668-APP-COMPLETION-EVIDENCE-LINK-CLASSIFICATION-DEBT
- Mission Status: VERIFIED

## Goal

Classify the current app-completion evidence-link debt after
[LUC-5666](/LUC/issues/LUC-5666) so documentation, architecture, scanner, and
QA owners can distinguish evidence-link/classification work from real runtime
proof gaps.

## Scope

- Current app-completion outputs:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
- Recent evidence and curation packets:
  - `docs/planning/luc-5666-known-state-evidence-and-architecture-baseline.md`
  - `docs/planning/luc-5663-app-completion-proof-link-noise-reconciliation.md`
  - `docs/planning/luc-5661-v1-auth-alias-parity-api-proof.md`
  - `docs/planning/luc-5658-subscription-entitlement-app-completion-inference-curation.md`
  - `docs/planning/luc-5659-next-nonduplicated-missing-test-proof-ladder.md`

## Exclusions

No product code, schema, migration, scanner implementation, test authoring,
runtime server, browser, database, Docker, push, deploy, restart, protected
smoke, production mutation, provider action, credential access, or secret
disclosure was performed.

## Implementation Plan

1. Read the [LUC-5666](/LUC/issues/LUC-5666) baseline and current
   app-completion output.
2. Parse the current priority queue by type, flow, path bucket, and runtime
   shape.
3. Reconcile the queue with recent proof packets so already-proven routes do
   not become duplicate QA work.
4. Record a classification rule and next owner path.
5. Update source-of-truth state and leave the Paperclip issue with a final
   disposition.

## Verification Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Current app-completion snapshot | `docs/status/app-completion-index.json` generated `2026-06-27T21:34:57.134Z` | PASS |
| Aggregate counts | `895` items, `7` flows, `867` missing test links, `0` missing doc links, `0` blocked records | PASS |
| Flow shape | `Subscription and entitlement` has `547` entities; `Unclassified user workflow` `195`; `Account access` `89`; `User configuration` `54`; `Dashboard overview` `6`; `Trading operation` `3`; `Exchange connection and configuration` `1` | PASS |
| Priority queue size | Current `priorityReviewItems` contains `200` rows | PASS |
| Priority queue type split | `123` documents, `3` agents, `49` functions, `18` features, `3` API endpoints, `3` modules, `1` migration | PASS |
| Evidence-link bucket | `126` priority rows are document/agent rows; `114` are `docs/planning/*`, `7` are generated architecture node docs, `1` is UX doc/evidence, `1` is another document, and `3` are agent/state files | PASS |
| Concrete proof-selection bucket | `74` priority rows are non-document rows: `68` Account access and `6` Dashboard overview | PASS |
| Route-shaped concrete records | `USE /auth`, `USE /v1/auth`, and `USE /dashboard` are the only top-queue API endpoint mount rows | PASS |
| Recent proof reconciliation | [LUC-5661](/LUC/issues/LUC-5661) already verified `/v1/auth` alias parity locally; [LUC-5658](/LUC/issues/LUC-5658) already classified subscription pressure as docs-only `plan` inference | VERIFIED by prior packets |

## Classification

The refreshed app-completion output is useful as a confidence map, but the
top-queue signal is not a one-to-one implementation backlog.

| Bucket | Count | Classification | Owner path |
| --- | ---: | --- | --- |
| Planning and historical proof documents | 114 | Evidence-link/classification debt. These rows usually need proof linkage, scanner bucketing, or curation, not runtime proof. | Docs Memory / Scanner owner |
| Generated architecture node documents | 7 | Evidence-link debt. Generated docs may represent routes or pages already covered elsewhere. | Docs Memory / Architecture |
| Agent/state and other document rows | 5 | Governance/source-of-truth confidence debt unless tied to a concrete broken journey. | Docs Memory / Coordinator |
| Account access concrete rows | 68 | Concrete proof-selection candidates, but broad rerun is not warranted because recent Auth/account proof exists and `/v1/auth` parity is verified. | QA/Test only on fresh unverified route or regression |
| Dashboard overview concrete rows | 6 | Smallest remaining concrete route-shaped review candidate after auth alias parity. | QA/Test via [LUC-5669](/LUC/issues/LUC-5669) |

## Decision

For future Roost app-completion work, classify `missing_test_link` rows before
creating QA or Engineering work:

1. `document`, `agent`, generated architecture docs, planning packets, and
   historical proof packets are evidence-link or scanner-classification debt
   unless they point to a concrete unverified runtime surface.
2. `api_endpoint`, route mount, page, browser surface, provider integration,
   module, function, feature, or migration rows can be proof-selection
   candidates only after recent evidence packets are checked for coverage.
3. Aggregate missing-test counts should not trigger broad Auth, Settings,
   Sales, Finance, Assets, Relationships, Product/Delivery, Google Drive
   OAuth, subscription, or dashboard reruns without a concrete current row or
   fresh regression.

This keeps real auth, subscription, configuration, money, provider, and
permission gates protected while preventing generated documentation and
planning evidence from becoming duplicate product work.

## Next Owner Path

1. Docs Memory / Scanner owner:
   add or preserve a separate evidence-doc bucket for planning packets,
   generated node docs, and historical proof packets so these rows do not read
   like missing runtime tests.
2. Technical Solution Architect:
   update shared scanner/app-completion heuristics when ready, especially the
   subscription `plan` token behavior already described by
   [LUC-5658](/LUC/issues/LUC-5658), without weakening real
   billing/subscription/checkout detection.
3. QA/Test:
   use [LUC-5669](/LUC/issues/LUC-5669) to inspect the remaining concrete
   `USE /dashboard` signal and decide whether existing dashboard evidence is
   enough or a narrow local proof is needed.

## Acceptance Criteria

- [x] Current app-completion priority rows are classified by evidence-link
      versus concrete runtime-proof bucket.
- [x] Already-proven `/v1/auth` alias parity is excluded from duplicate QA
      selection.
- [x] Subscription/entitlement planning-document pressure is preserved as
      scanner/docs curation debt, not product runtime debt.
- [x] Next owners are named without mutating product code or protected runtime
      surfaces.

## Result Report

Status: `VERIFIED`.

The current app-completion evidence-link debt is curated. The top-200 priority
queue is mostly documentation/scanner classification work (`126` document or
agent rows) plus a smaller concrete proof-selection subset (`74` non-document
rows). The already-selected `/v1/auth` route proof is complete through
[LUC-5661](/LUC/issues/LUC-5661). The smallest remaining concrete review target
is the dashboard route signal, owned by QA/Test in
[LUC-5669](/LUC/issues/LUC-5669).

Commit status: not committed in this heartbeat because the shared workspace
contains pre-existing generated/status/state changes and many sibling
untracked evidence packets outside this issue boundary.

Push status: not pushed.

Deploy impact: none.

Residual risk: until the shared scanner/app-completion classifier separates
evidence documents from runtime proof rows, aggregate `missing_test_link`
counts will continue to mix real proof gaps with documentation classification
debt.
