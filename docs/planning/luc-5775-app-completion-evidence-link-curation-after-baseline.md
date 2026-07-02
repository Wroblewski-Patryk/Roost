# LUC-5775 App-Completion Evidence-Link Curation After Baseline

## Task Contract

- Task Type: documentation / evidence curation
- Current Stage: verification
- Deliverable For This Stage: owner-readable classification of the current
  app-completion evidence-link debt after the latest Roost baseline.
- Goal: curate the current app-completion evidence links so Docs, QA, and
  architecture owners can distinguish scanner/evidence-link debt from concrete
  runtime proof candidates before creating more follow-up work.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/planning/luc-5758-known-state-evidence-and-architecture-baseline.md`
  - `docs/planning/luc-5765-source-control-closure-for-luc-5758-evidence-packet.md`
  - recent curation/proof packets for app-completion missing-test rows
- Exclusions: no product code, schema, migration, scanner implementation,
  test authoring, runtime server, browser, database, Docker, push, deploy,
  restart, protected smoke, production mutation, provider action, credential
  access, or secret disclosure.

## Current Source Snapshot

Fresh source file:

- `docs/status/app-completion-index.json`
- `generatedAt`: `2026-06-28T02:42:41.423Z`
- Counts: `934` items, `7` flows, `903` missing test links,
  `0` missing doc links, `0` blocked records, `0` browser-review records.

Flow risk summary:

| Flow | Items | Missing test rows | Implemented-needs-proof rows | Notes |
| --- | ---: | ---: | ---: | --- |
| Subscription and entitlement | 586 | 558 | 24 | Dominant count; still mostly planning/generated evidence-link pressure already classified by prior curation lanes. |
| Unclassified user workflow | 195 | 194 | 1 | Not represented in the current top-200 priority sample. |
| Account access | 89 | 88 | 0 | Concrete top rows are already covered by auth/API/browser proof packets. |
| User configuration | 54 | 53 | 1 | Not represented in the current top-200 priority sample. |
| Dashboard overview | 6 | 6 | 0 | Current route-mount row is already covered by dashboard command/API proof selection. |
| Trading operation | 3 | 3 | 0 | Previously classified as evidence-link/scanner debt unless a fresh runtime row appears. |
| Exchange connection and configuration | 1 | 1 | 0 | One generated architecture document row in the top-200 sample. |

## Priority Queue Classification

The current `priorityReviewItems` array contains `200` rows.

| Bucket | Count | Classification | Owner path |
| --- | ---: | --- | --- |
| `docs/planning/*` documents | 114 | Evidence-link/scanner debt. These rows should not trigger QA reruns by themselves. | Docs Memory / scanner owner |
| Generated architecture docs | 7 | Evidence-link debt; generated node docs may represent already-covered routes or integration contracts. | Docs Memory / Architecture |
| Agent/state docs | 3 | Governance/source-of-truth confidence debt, not a runtime journey. | Docs Memory / Coordinator |
| UX docs | 1 | Evidence-link curation only unless a fresh visual regression appears. | Docs/UX |
| Other document rows | 1 | Evidence-link curation. | Docs Memory |
| Runtime-shaped rows | 74 | Concrete-looking rows, but no fresh non-duplicated proof target remains in this snapshot. | QA/Test only on fresh unverified row or reproduced regression |

Runtime-shaped split:

| Runtime flow | Rows | Current classification |
| --- | ---: | --- |
| Account access | 68 | Covered/evidence-link debt. Prior proof covers registration/login/token/protected-route behavior, `/v1/auth` alias parity, and auth fail-closed paths. |
| Dashboard overview | 6 | Covered/evidence-link debt. Existing dashboard command/API proof and focused selection packets already cover the current route-mount signal. |

Route-mount rows in the top-200 sample:

| Row | Path | Disposition |
| --- | --- | --- |
| `USE /auth` | `src/app.ts#/auth` | Already covered by existing Auth route/API/browser proof; do not rerun from this aggregate signal alone. |
| `USE /v1/auth` | `src/app.ts#/v1/auth` | Already covered by `/v1/auth` alias parity proof. |
| `USE /dashboard` | `src/app.ts#/dashboard` | Already covered by dashboard command/API proof selection. |

## Decision

No new product implementation, backend, frontend, security, ops, protected
runtime, or broad duplicate QA lane is selected from this curation snapshot.

The current app-completion index remains useful as a confidence map, but the
aggregate `903` missing-test count still mixes:

1. documentation and generated evidence-link classification debt;
2. historical proof packets that need better scanner recognition;
3. concrete runtime rows that are already covered by recent proof packets.

Future follow-up should be created only when a later refresh surfaces a
concrete unverified route/API/page/provider row outside the already-classified
auth, dashboard, configuration, subscription, exchange, and trading evidence
families, or when a fresh regression is reproduced.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirmed `934` items, `7` flows, `903` missing test links, `0` missing doc links, `0` blocked records, and `200` priority rows. |
| Priority queue split | PASS | Readback split the top-200 rows into `126` document/state rows and `74` runtime-shaped rows. |
| Route-mount review | PASS | Only `USE /auth`, `USE /v1/auth`, and `USE /dashboard` were route-mount rows in the sample, all already covered by prior proof/curation packets. |
| Product/runtime mutation boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, or production mutation was used. |

## Result Report

Status: verified documentation curation.

Files changed by this lane:

- `docs/planning/luc-5775-app-completion-evidence-link-curation-after-baseline.md`
- source-of-truth state/context entries for this curation result

Commit status: not committed in this heartbeat because the shared Roost
workspace is already mixed-dirty, `main` is ahead of origin, and this lane is
documentation/evidence curation only.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt until
the scanner separates evidence documents and historical proof packets from
runtime proof candidates. That residual risk is classification debt, not a
newly reproduced product defect.
