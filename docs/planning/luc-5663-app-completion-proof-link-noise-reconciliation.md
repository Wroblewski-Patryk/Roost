# LUC-5663 App-Completion Proof-Link Noise Reconciliation

## Header

- ID: [LUC-5663](/LUC/issues/LUC-5663)
- Title: [Roost] [Architecture] Reconcile app-completion proof-link noise after [LUC-5662](/LUC/issues/LUC-5662)
- Task Type: architecture curation / proof-link reconciliation
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Parent: [LUC-5662](/LUC/issues/LUC-5662)
- Priority: P1
- Mission ID: LUC-5663-APP-COMPLETION-PROOF-LINK-NOISE-RECONCILIATION
- Mission Status: VERIFIED

## Goal

Reconcile the post-[LUC-5662](/LUC/issues/LUC-5662) app-completion signal so
future QA selection separates concrete route/API/page proof gaps from docs-only
or already-proven evidence packets.

## Scope

- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/task-synchronization-report.md`
- `docs/architecture/scanner-overrides.json`
- Prior evidence packets:
  - `docs/planning/luc-5658-subscription-entitlement-app-completion-inference-curation.md`
  - `docs/planning/luc-5659-next-nonduplicated-missing-test-proof-ladder.md`
  - `docs/planning/luc-5661-v1-auth-alias-parity-api-proof.md`

## Exclusions

No product code, schema, migration, test authoring, runtime server, browser,
database, Docker, push, deploy, restart, protected smoke, production mutation,
provider action, credential access, secret disclosure, or sibling-repository
script mutation was performed.

## Implementation Plan

1. Read the [LUC-5662](/LUC/issues/LUC-5662) issue context and current
   app-completion outputs.
2. Parse the top app-completion priority queue by type, kind, flow, and path.
3. Compare the concrete queue against recent curation/proof packets from
   [LUC-5658](/LUC/issues/LUC-5658),
   [LUC-5659](/LUC/issues/LUC-5659), and
   [LUC-5661](/LUC/issues/LUC-5661).
4. Record the operational rule for QA and Docs Memory so broad missing-test
   pressure does not trigger duplicate proof reruns.
5. Update source-of-truth state with the verified classification and residual
   scanner risk.

## Verification Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Issue context | [LUC-5663](/LUC/issues/LUC-5663) heartbeat context names [LUC-5662](/LUC/issues/LUC-5662) as parent and cites app-completion generated `2026-06-27T20:43:37.445Z` | PASS |
| App-completion counts | `docs/status/app-completion-index.json`: `887` items, `7` flows, `860` missing test links, `0` missing doc links, `0` blocked | PASS |
| Task/proof-link sync | `docs/status/task-synchronization-report.md`: `0` actionable tasks without architecture links, `0` implementation entities without task links, `0` verified entities without proof evidence | PASS |
| Priority queue shape | Node readback of `priorityReviewItems`: `200` rows; `123` documents, `49` functions, `18` features, `3` agents, `3` API endpoints, `3` modules, `1` migration | PASS |
| Docs-only/noise bucket | Top-200 queue contains `126` document/agent rows, including `105` subscription/entitlement documents and `1` subscription/entitlement agent prompt | PASS |
| Concrete runtime bucket | Top-200 queue contains `74` non-document rows: `68` Account access rows and `6` Dashboard overview rows | PASS |
| Route-shaped gaps | Only three top-200 `api_endpoint` rows are route-shaped: `USE /auth`, `USE /v1/auth`, and `USE /dashboard` | PASS |
| Recent concrete proof | [LUC-5661](/LUC/issues/LUC-5661) completed `/v1/auth` alias parity API proof with local route, architecture, and API gates passing | VERIFIED by prior packet |
| Subscription docs-only inference | [LUC-5658](/LUC/issues/LUC-5658) verified the subscription priority subset was `105` documents and `1` agent prompt with `0` concrete route/API/page rows | VERIFIED by prior packet |
| Shared heuristic root cause | Read-only inspection of `build-app-completion-index.mjs` found `plan` included in subscription keyword matching for gates and flow assignment | PASS |

## Reconciliation

The current app-completion `missing_test_link` count is a mixed confidence
signal, not a direct implementation queue.

### Concrete Runtime/API/Page Gaps

These are the records QA or Engineering may treat as proof-selection inputs:

| Flow | Current top-queue signal | Current disposition |
| --- | --- | --- |
| Account access | `USE /auth` and `USE /v1/auth` route mounts plus auth internals | `/v1/auth` alias parity was selected by [LUC-5659](/LUC/issues/LUC-5659) and locally verified by [LUC-5661](/LUC/issues/LUC-5661). Remaining auth internals are evidence-link/test-surface mapping unless a fresh failing journey appears. |
| Dashboard overview | `USE /dashboard`, `dashboard.routes.ts`, `general-dashboard.tsx`, `public-home.tsx`, and dashboard architecture scripts | Candidate for a future focused dashboard evidence-link review only if current dashboard proof packets do not already cover the route. Do not treat architecture dashboard scripts as user-facing dashboard defects. |
| Exchange connection and configuration | One document row in the top queue | Not a concrete runtime row in this queue. Select only if a future refresh surfaces a route/API/provider proof gap or protected credential gate is explicitly authorized. |

### Docs-Only Or Already-Proven Noise

These rows should not trigger duplicate runtime proof by themselves:

| Bucket | Evidence | Handling rule |
| --- | --- | --- |
| Subscription and entitlement planning packets | `105` subscription document rows and `1` agent prompt in the top queue; [LUC-5658](/LUC/issues/LUC-5658) traced this to `plan` matching inside `docs/planning/...` | Treat as scanner/evidence-link classification debt until a concrete route/API/page row appears. |
| Historical proof packets | Recent Auth, Settings, Sales, Finance, Assets, Relationships, and Product/Delivery proof packets are cited by [LUC-5659](/LUC/issues/LUC-5659) as non-selection reasons | Do not rerun broad proof from aggregate missing-test pressure alone. |
| Architecture/generated docs | Generated docs such as `docs/architecture/nodes/generated/*.md` are document evidence rows, not runtime defects | Docs Memory may add evidence links or scanner overrides; QA should not run browser/API proof only because a generated doc row lacks a test link. |

## Decision

For Roost planning, `docs/status/app-completion-index.*` should now be read in
two passes:

1. Concrete proof pass: select route/API/page/browser/provider rows that are
   unverified and not covered by recent packets.
2. Curation pass: classify document, agent, generated architecture, planning,
   and historical proof-packet rows as evidence-link or scanner-classification
   debt unless they point to a currently unverified runtime surface.

This preserves real auth, subscription, configuration, money, and provider
guardrails while preventing noisy docs-only rows from causing duplicate QA
proof reruns.

## Next Owner Path

1. Shared scanner/TSA: update the shared app-completion flow heuristic so
   `plan` matches standalone subscription-plan language, not the
   `docs/planning` path segment. Verify real billing/subscription/checkout
   entities remain subscription-gated.
2. Docs Memory: add evidence links or scanner overrides for generated
   architecture documents that represent already-covered route/API/page proof.
3. QA/Test: choose future proof ladders only from concrete unverified runtime
   rows or fresh regressions.

## Acceptance Criteria

- [x] Concrete route/API/page gaps are listed separately from docs-only
      inference noise.
- [x] The next QA proof lane can avoid rerunning already-proven Auth, Settings,
      Sales, Finance, Assets, Relationships, Product/Delivery, and
      subscription/entitlement proof.
- [x] Current [LUC-5661](/LUC/issues/LUC-5661) `/v1/auth` proof is recognized
      as the selected concrete follow-up from [LUC-5659](/LUC/issues/LUC-5659).
- [x] No protected action, runtime mutation, deploy, push, or credential access
      occurred.

## Result Report

Status: `VERIFIED`.

The proof-link noise after [LUC-5662](/LUC/issues/LUC-5662) is reconciled as a
classification problem. The current top-200 app-completion queue contains
substantial docs-only pressure (`126` document/agent rows) and a smaller
concrete runtime subset (`74` non-document rows). The only small route-shaped
proof gap previously selected from that subset, `/v1/auth` alias parity, is
already locally verified by [LUC-5661](/LUC/issues/LUC-5661).

Commit status: not committed in this heartbeat because the shared workspace has
pre-existing dirty state from sibling evidence packets and [LUC-5661](/LUC/issues/LUC-5661)
source changes.

Push status: not pushed.

Deploy impact: none.

Residual risk: until the shared app-completion scanner tokenizes `plan` or
separates docs-evidence buckets, future refreshes may continue to report broad
`missing_test_link` counts that include planning and generated-document rows.
