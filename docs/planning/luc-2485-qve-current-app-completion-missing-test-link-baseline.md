# LUC-2485 Current App-Completion Missing-Test-Link Baseline

- Owner: QA & Verification Engineer
- Task type: QA verification / evidence reconciliation
- Current stage: verification
- Scope: reconcile the generated Roost app-completion status with prior QA packets and route only current, concrete confidence debt.

## Goal

Establish the current missing-test-link baseline for Roost and prevent stale
historical counts from being used as release evidence.

## Verification evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Generator refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` |
| Current generated baseline | PASS | `docs/status/app-completion-index.md` and `.json`, generated `2026-08-03T23:56:38.814Z`; 48 items, 5 flows, 44 missing test links, 0 missing docs, 0 blocked, 0 browser-review rows. |
| Source-control snapshot | PASS | Repository was clean except two pre-existing untracked LUC-2469 artifacts; this packet does not modify them. |

## Reconciliation

The previously repeated `363` missing-test-link figure belongs to historical
June packets. It is superseded by the current generated snapshot and must not
be reported as current truth. The current 44 risks group as follows:

| Flow | Current risk |
| --- | ---: |
| Dashboard overview | 1 |
| Trading operation | 1 |
| Unclassified user workflow | 41 |
| User configuration | 1 |

The priority rows point to `src/app.ts` route entities, with Engineering
Delivery Lead as the generated owner and Test Automation / QA Regression as
the recommended proof lane. No concrete browser-review or blocked-runtime
finding is exposed by this snapshot.

## Routing decision

This is an evidence-baseline reconciliation, not a product repair. The 44
missing links remain real confidence debt, but the aggregate signal alone does
not justify implementing 44 tests or selecting a duplicate runtime target.
Future QA work should select one concrete, non-duplicated route/journey proof
from the current index and attach its command or browser evidence before
claiming verification.

## Residual risk

User-facing completion confidence is partially verified: the graph contains
44 entities without linked test evidence. No behavior is marked verified by
this packet. A follow-up owner must curate a concrete proof target and update
the generated evidence relation; until then, release confidence remains
limited by missing proof links.

## Definition of done

- [x] Current index regenerated from the canonical architecture graph.
- [x] Current counts and flow grouping recorded.
- [x] Historical count explicitly superseded.
- [x] No product code or test behavior changed without a selected target.
- [x] Residual risk and next owner/action recorded.

Learning disposition: one_off. This packet reconciles a stale historical count;
no systemic prevention change was required.
