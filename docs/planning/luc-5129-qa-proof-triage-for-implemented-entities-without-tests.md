# LUC-5129 QA Proof Triage For Implemented Entities Without Tests

Task Type: QA verification / evidence triage
Current Stage: verification
Deliverable For This Stage: current classification of the
`implementation_without_tests` architecture-health signal, scoped gate proof,
and next-owner recommendation for [LUC-5129](/LUC/issues/LUC-5129).

## Goal

Triage the current implemented-entities-without-tests signal into actionable
QA guidance without creating broad, low-signal test work from an aggregate
scanner count.

## Scope

- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/planning/luc-4957-implementation-without-tests-architecture-health-signal-curation.md`
- `docs/planning/luc-5065-release-critical-journey-proof-ladder.md`
- `docs/planning/luc-5084-authenticated-browser-route-proof.md`
- Project-native gate commands:
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Exclusions

No runtime code, schema, migration, protected smoke, deploy, push, restart,
production mutation, credential access, secret disclosure, server, browser,
database, Docker container, or watcher process was started or changed.

## Implementation Plan

1. Read the current generated architecture health and awareness reports.
2. Compare the current missing-test shape against prior curation and QA proof
   ladder packets.
3. Run the smallest relevant non-protected gates.
4. Classify whether the signal needs implementation, verification follow-up,
   scanner curation, or no new issue.
5. Update project source-of-truth files and Paperclip disposition.

## Evidence Inputs

| Input | Evidence |
| --- | --- |
| Architecture health export | `docs/graphs/architecture-health.json` generated `2026-06-20T14:04:17.597Z`; `entities=2351`; `relations=4828`; `implementation_without_tests=1162`; sample size `200`. |
| Awareness report | `docs/status/architecture-awareness-report.md` reports raw missing-test links `1162`, actionable missing-test links `1153`, docs gaps `0`, task-link gaps `0`, verified-without-proof gaps `0`, owner gaps `0`, and classified inferred-link noise `9`. |
| Task synchronization | `docs/status/task-synchronization-report.md` reports `0` task-link gaps, `0` implementation-without-task gaps, and `0` verified-without-proof gaps. |
| Prior signal curation | [LUC-4957](/LUC/issues/LUC-4957) classified this recurring shape as scanner granularity plus journey-proof backlog, not a direct release-blocking test queue. |
| QA proof ladder | [LUC-5065](/LUC/issues/LUC-5065) selected release-critical local journeys and verified the API/static backbone. |
| Browser proof | [LUC-5084](/LUC/issues/LUC-5084) locally verified the canonical authenticated owner route on desktop and mobile. |

## Current Sample Classification

The `implementation_without_tests.items` sample in the current health export
contains `200` rows.

| Sample Class | Count | Classification | Action |
| --- | ---: | --- | --- |
| API mount/proxy rows in `src/app.ts` | 43 | Scanner granularity signal. These are Express mount points, not direct behavior assertions. | Do not open broad mount-test work. Keep route/module proof selected by journey risk. |
| Shared UI component singleton rows | 7 | Higher-level route proof signal. Shared primitives are best verified through rendered route journeys unless a concrete component regression exists. | Continue one-route browser proof slices when they add release confidence. |
| Feature/script/module rows | 150 | Mixed backlog confidence signal. Architecture scripts are covered by architecture gates; module routes need proof selected by product risk, not raw scanner order. | Open focused API/browser proof only when code inspection or module confidence shows a real unproved journey. |

Path-root distribution in the sample:

| Path Root | Count |
| --- | ---: |
| `src` | 116 |
| `scripts` | 62 |
| `web` | 19 |
| `prisma` | 1 |
| `tailwind.config.mjs` | 1 |
| `vite.config.mjs` | 1 |

## Verification Run

- `npm run check:route-capabilities`: PASS.
  - Result: `checkedManifestRoutes=180`, `checkedRouteFiles=35`,
    `status=ok`.
- `npm run architecture:status`: PASS.
  - Result: `Architecture Status: GREEN`; graph `454` nodes / `765`
    relations / `35` chains; evidence queue `0`; chain worklist `0`;
    delta `0/0/0`; all gates pass `yes`.

No local process cleanup was required because this heartbeat did not start a
server, database, browser, container, or watcher.

## Acceptance Criteria

- [x] Current missing-test counts and sample shape are recorded.
- [x] Existing QA proof context is checked before opening duplicate work.
- [x] Scoped route/static and architecture gates are run.
- [x] The signal is classified into actionable versus non-actionable lanes.
- [x] Residual risk and next owner path are explicit.

## Result Report

Status: `VERIFIED_DONE` for QA proof triage.

The current `implementation_without_tests=1162` signal remains a product
confidence indicator, not a direct release-blocking test queue. The current
sample is still dominated by mount/proxy rows, shared primitives, architecture
scripts, and broad module rows that should be selected through release-risk
proof ladders. The active task/proof synchronization gates report no task-link
or verified-without-proof gaps.

No new child implementation issue is needed from this heartbeat. The next
useful QA work, when a new QA issue is opened, should be one narrow
authenticated browser route proof from the existing ladder, not a broad
missing-test sweep. A scanner-classification improvement may be assigned to
Technical Solution Architect or Engineering Delivery Lead later only if mount
rows keep displacing real journey risks in prioritization.

Residual risk: protected production proof remains release/credential gated and
outside [LUC-5129](/LUC/issues/LUC-5129).
