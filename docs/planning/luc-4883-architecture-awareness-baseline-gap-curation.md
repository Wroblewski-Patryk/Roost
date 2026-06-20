# LUC-4883 Architecture Awareness Baseline Gap Curation

## Task Contract

- Task Type: architecture analysis
- Current Stage: verification
- Deliverable For This Stage: curated decision on the fresh architecture-awareness baseline gaps from [LUC-4881](/LUC/issues/LUC-4881), with follow-up policy.
- Goal: decide whether the large missing-test signal is a real release evidence gap, scanner inference noise, or a scanner-curation implementation candidate.
- Scope: `docs/graphs/architecture-health.json`, `docs/status/architecture-awareness-report.md`, `docs/status/architecture-dependency-report.md`, `docs/status/architecture-ownership-report.md`, `docs/status/task-synchronization-report.md`, `docs/architecture/scanner-overrides.json`, `src/app.ts`, `src/tests/api.test.ts`, and source-of-truth state updates.
- Exclusions: product feature implementation, runtime code changes, schema or migration authoring, protected smoke, push, deploy, restart, production mutation, credential access, secret disclosure, and long-running local services.

## Evidence Inputs

| Input | Evidence |
| --- | --- |
| [LUC-4881](/LUC/issues/LUC-4881) baseline packet | `docs/planning/luc-4881-known-state-evidence-and-architecture-baseline.md` reports scanner PASS at `2026-06-20T06:07:29.075Z` with `entities=2289`, `relations=4583`, and `files=13603`. |
| Architecture health | `docs/graphs/architecture-health.json` reports `implementation_without_tests=1162`, `actionable_implementation_without_docs=0`, `entities_without_owner=0`, `disconnected_entities=0`, `tasks_without_architecture=0`, `implementation_without_task=0`, and `classified_noise=9`. |
| Awareness report | `docs/status/architecture-awareness-report.md` lists top missing-test links as `src/app.ts` root and `USE /...` mount endpoints, and notes curated graph coverage input covered paths `0` plus scanner override entity/relation entries `0`. |
| Task synchronization | `docs/status/task-synchronization-report.md` reports `0` actionable/raw task-link gaps and `0` verified-without-proof gaps. |
| Ownership | `docs/status/architecture-ownership-report.md` reports no owner-attribution gap; current split is `Docs Memory Lead=952`, `Engineering Delivery Lead=1336`, and `Roost Project Manager=1`. |
| Verification command | `npm run architecture:status` PASS: `GREEN`, graph `452 nodes / 761 relations / 34 chains`, evidence queue `0`, chain worklist `0`, delta `0`, all gates pass. |

## Curated Gap Classification

| Signal | Classification | Rationale | Next action |
| --- | --- | --- | --- |
| Top missing-test entries for `GET /` and `USE /...` in `src/app.ts` | aggregate scanner-inference gap, not direct release blocker | `src/app.ts` is the Express composition root. The existing API test file exercises `/health`, `/v1/health`, auth, API-key protection, protected route behavior, and many nested `/v1/...` module flows, but the scanner does not infer that nested router proof satisfies the mount-level `USE /...` proxy entities. | Do not create broad product test work from the mount list. Use journey proof ladders for real release confidence. |
| Shared component singleton entries | real proof ownership should stay journey-based | A component-level missing-test link is less useful than rendered desktop/mobile route proof using that component in a real owner workflow. Prior proof ladders already validate Operations, Assets, Relationships, and Product/Delivery surfaces through route journeys. | Keep mapping component confidence through route-level proof packets and module confidence rows. |
| Architecture scripts and config singleton entries | expected aggregate noise unless a gate fails | `npm run architecture:status` is green, task sync has no gaps, and generated architecture reports are present. Individual script unit proof is not currently the release bottleneck. | No immediate scanner override. Revisit only after a failing architecture gate or repeated false priority selection. |
| `scanner-overrides.json` has no entity/relation overrides | acceptable for this baseline | Existing exclude prefixes are targeted and sufficient for known generated noise. Adding relation overrides now would be speculative without a scanner contract for mount-to-test proof inheritance. | Defer implementation. If repeated baselines keep selecting `src/app.ts` mounts ahead of real journeys, create one scanner-inference task for route-mount proof relations. |

## Curation Plan

1. Treat `implementation_without_tests=1162` as a backlog confidence indicator, not a single release blocker.
2. Select future QA proof ladders from product journeys and module-confidence risk, then use `npm run check:route-capabilities`, `npm run test:api:local`, and desktop/mobile browser proof to close actual confidence gaps.
3. Do not add broad `scanner-overrides.json` excludes for `src/app.ts`; the mount entries are useful as a warning that proof inference is shallow, even if they are not direct implementation defects.
4. Add scanner relation overrides only if future runs keep producing the same false-positive priority after route-level proof exists and the override can point from specific mount entities to specific proof files or proof-register rows.
5. Keep source-control closure for the generated [LUC-4881](/LUC/issues/LUC-4881) packet in [LUC-4882](/LUC/issues/LUC-4882); this curation lane does not commit or push.

## Acceptance Criteria

- [x] The fresh baseline was reviewed against generated health/status reports.
- [x] Top missing-test signals were classified as real release gaps versus aggregate scanner-inference noise.
- [x] Scanner override/node/proof-register action was decided.
- [x] The result avoids product implementation, protected smoke, push, deploy, restart, production mutation, and secret access.

## Result Report

The curated decision is: no immediate scanner override or product implementation is needed from [LUC-4881](/LUC/issues/LUC-4881). The baseline is green for architecture gates, clean for task/doc/owner linkage, and the high missing-test count is dominated by scanner inference limits around `src/app.ts` route mounts plus aggregate singleton entries. Future release confidence should keep moving through narrow route proof ladders; scanner-inference work should be opened only if repeated baselines continue to mis-prioritize already-proved mount entities over unproved product journeys.

No runtime code, schema, migration, protected smoke, push, deploy, restart, production mutation, credential access, secret disclosure, server, browser, database, Docker container, or watcher process was started.
