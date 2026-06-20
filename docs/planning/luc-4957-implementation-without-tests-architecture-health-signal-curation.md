# LUC-4957 Implementation-Without-Tests Architecture Health Signal Curation

Task Type: architecture health signal curation
Current Stage: verification
Deliverable For This Stage: curation packet for the recurring `implementation_without_tests` signal from [LUC-4952](/LUC/issues/LUC-4952)

## Goal

Turn the recurring `implementation_without_tests=1162` architecture-health signal
into actionable engineering guidance instead of treating the aggregate count as
a direct product-work queue.

## Scope

- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/graphs/architecture-proof-register.csv`
- `docs/planning/luc-4952-known-state-evidence-and-architecture-baseline.md`
- `docs/planning/luc-4883-architecture-awareness-baseline-gap-curation.md`
- Repository source/test sampling by path only; no runtime code edits.

## Exclusions

No runtime code, schema, migration, protected smoke, deploy, push, restart,
production mutation, credentials, secrets, local server, browser, database,
Docker container, or watcher process was started or changed.

## Evidence Inputs

| Input | Evidence |
| --- | --- |
| Health export | `docs/graphs/architecture-health.json` generated `2026-06-20T08:13:36.644Z`; `entities=2313`; `relations=4677`; `implementation_without_tests=1162`. |
| Awareness report | `docs/status/architecture-awareness-report.md` reports raw missing-test links `1162`, actionable missing-test links `1153`, classified inferred-link noise `9`, and top actionable entries dominated by `GET /` and `USE /...` mounts in `src/app.ts`. |
| Task synchronization | `docs/status/task-synchronization-report.md` reports `0` actionable/raw task-link gaps, `0` implementation-without-task gaps, and `0` verified entities without proof evidence. |
| Prior TSA curation | `docs/planning/luc-4883-architecture-awareness-baseline-gap-curation.md` already classified the same recurring baseline shape as scanner-inference debt rather than an immediate release blocker. |
| Current proof context | Recent proof ladders and API regressions recorded in `.codex/context/TASK_BOARD.md` cover Technology/AI, Legal, Innovation, Management Departments, Sales, Operations, Assets, and route-capability/API gates. |

## Counts And Samples

The health export exposes a 200-item sample for the `implementation_without_tests`
signal. The sampled distribution is:

| Sample Class | Count In Sample | Examples | Classification |
| --- | ---: | --- | --- |
| API mount/proxy entities | 43 | `GET /`, `USE /agent-events`, `USE /assets`, `USE /departments`, `USE /operating-graph`, `USE /v1` in `src/app.ts` | Scanner granularity noise unless a mounted router lacks direct API or journey proof. |
| Shared UI component singleton entities | 7 | `cc-button.tsx`, `cc-data-table.tsx`, `cc-field.tsx`, `cc-notice.tsx`, `cc-resource-selector.tsx`, `cc-route-loading.tsx`, `cc-text-input.tsx` | Better verified by rendered route journeys than isolated component unit rows. |
| Feature/script singleton entities | 150 | architecture maintenance scripts, smoke scripts, `src/auth/*`, `src/modules/*/*.routes.ts`, integration services, `prisma/seed.ts` | Mixed: architecture scripts are covered by `architecture:status`/`validate`; module routes should be selected by product-risk proof ladders, not by the raw aggregate order. |
| Classified non-actionable noise already recognized by scanner | 9 | config-only files and test fixture helpers | Already classified; no action required. |

Path distribution in the 200-item sample:

| Path Root | Count |
| --- | ---: |
| `src` | 116 |
| `scripts` | 62 |
| `web` | 19 |
| `prisma` | 1 |
| `tailwind.config.mjs` | 1 |
| `vite.config.mjs` | 1 |

## Classification Rationale

| Finding | Classification | Rationale | Action |
| --- | --- | --- | --- |
| Top missing-test rows are `src/app.ts` `USE /...` mounts | Scanner granularity noise | The mount rows are composition/proxy entities. Existing API tests and proof ladders exercise nested `/v1/...` routes, MCP manifests, route-capability drift, auth, and journey behavior, but the scanner does not infer that coverage back to each mount row. | Do not create broad mount-test work. Only open a targeted API regression when a mounted module has no direct route/assertion evidence. |
| Shared UI primitives appear as untested components | Higher-level proof gap only when no route uses the primitive | Components are meaningful through route behavior, responsive states, and accessibility in rendered workflows. Recent route proofs already validate shared table/button/notice/field behavior indirectly in real screens. | Keep component confidence tied to route proof packets and module-confidence rows. Add component unit tests only after a concrete regression or reuse risk appears. |
| Architecture and smoke scripts appear as feature rows | Mostly gate-owned maintenance proof | Architecture scripts are already exercised through `npm run architecture:status`, `architecture:refresh`, `validate`, and generated report gates. Smoke scripts are validated when their protected/local proof lane runs. | No broad script-test wave. Add a script regression only when a gate fails or a smoke command is actively being changed. |
| API route modules appear in the sample despite API tests | Real proof backlog should be selected by journey risk | `src/tests/api.test.ts` contains broad protected API coverage and recent dedicated assertions for departments, sales, finance, operations, assets, intake, commercial exceptions, workforce, and MCP exposure. The aggregate signal still cannot rank which module lacks enough proof for the next release objective. | Select future QA work from module confidence and proof-ladder sequence, not from the raw sample order. |

## Recommendation

No immediate product implementation, API regression wave, or broad scanner
override is justified from [LUC-4957](/LUC/issues/LUC-4957).

The next smallest follow-up shape is a documentation/state note: record that
`implementation_without_tests=1162` is an aggregate confidence indicator and
that future work should continue through product-journey proof ladders. Open a
scanner-classification task only if the same mount/proxy entities keep
displacing unproved product journeys in future prioritization.

If that scanner-classification task is opened later, it should be one-owner and
bounded:

| Candidate Follow-Up | Owner | Scope | Evidence Required |
| --- | --- | --- | --- |
| Scanner mount/proof inference classification | Technical Solution Architect or Engineering Delivery Lead | Teach the architecture health layer to classify `src/app.ts` `USE /...` mount rows as aggregate proxy entities when nested route/API proof exists, without hiding true unproved module routes. | Before/after health report showing mount rows moved out of actionable priority while task/doc/owner/proof gaps remain `0`; `npm run architecture:status` PASS; no broad excludes that mask real route gaps. |

Until then, QA should keep selecting proof ladders from module confidence and
release risk. Good next proof shapes remain narrow route/API journeys such as a
department operating-graph proof, a protected deploy-smoke rerun when the
credential gate is explicitly unblocked, or a focused regression for a route
module that code inspection proves lacks direct API assertions.

## Acceptance Criteria

- [x] Counts and sampled item classes are recorded.
- [x] Scanner granularity noise is separated from real API/UI proof gaps.
- [x] Follow-up shape is one-owner and scope-bounded if future scanner work is needed.
- [x] No runtime code, schema, migration, protected smoke, deploy, push, restart, production state, credentials, or secrets were touched.

## Result Report

[LUC-4957](/LUC/issues/LUC-4957) is complete for TSA curation. The recurring
`implementation_without_tests=1162` signal should remain a backlog confidence
indicator, not a direct release-blocking queue. The current sample is dominated
by mount/proxy rows, shared primitives, architecture scripts, and already
journey-proven module surfaces. No child implementation or QA issue is needed
from this heartbeat.
