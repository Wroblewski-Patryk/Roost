# LUC-6472 Implementation-Without-Tests Signal Classification After LUC-6460

## Header
- ID: LUC-6472
- Parent evidence issue: [LUC-6460](/LUC/issues/LUC-6460)
- Task Type: QA / test automation evidence classification
- Current Stage: verification
- Deliverable For This Stage: classification packet and next proof-lane recommendation
- Status: DONE
- Owner: 09 TAE (Test Automation Engineer)
- Priority: P2
- Iteration: 2026-07-01 heartbeat
- Process class: regression evidence loop / delivery gap loop

## Goal
Classify the broad architecture-health `implementation_without_tests` signal
after [LUC-6460](/LUC/issues/LUC-6460) into proof-first buckets without opening
broad feature work or broad test churn from an aggregate scanner count.

## Scope
- `docs/planning/luc-6460-known-state-evidence-and-architecture-baseline.md`
- `docs/graphs/architecture-health.json`
- `docs/graphs/architecture-awareness.json`
- `docs/status/architecture-awareness-report.md`
- Project-native local gates:
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Exclusions
No feature code, test authoring, schema change, migration, runtime server,
browser, database, Docker container, protected smoke, production/VPS mutation,
provider mutation, credential access, secret access, push, deploy, or restart
was performed.

## Implementation Plan
1. Read the [LUC-6472](/LUC/issues/LUC-6472) heartbeat context and parent
   [LUC-6460](/LUC/issues/LUC-6460) packet.
2. Parse `docs/graphs/architecture-health.json` for raw/actionable
   implementation-without-tests signals.
3. Parse `docs/graphs/architecture-awareness.json` to derive actionable rows
   by entity type, owner, path area, and likely verification layer.
4. Separate scanner noise from product/API/UI proof gaps.
5. Run the smallest relevant local gates.
6. Record the next owner/proof recommendation and source-control closure.

## Evidence Readback

| Check | Result | Evidence |
| --- | --- | --- |
| Paperclip heartbeat context | PASS | API readback shows [LUC-6472](/LUC/issues/LUC-6472) `in_progress`, parent [LUC-6460](/LUC/issues/LUC-6460) `done`, no blockers, no comments, and shared Roost workspace. |
| Parent packet readback | PASS | `docs/planning/luc-6460-known-state-evidence-and-architecture-baseline.md` records architecture-awareness PASS, `npm run architecture:status` PASS, route-capability PASS, app-completion PASS, and this follow-up as the broad test-debt classification lane. |
| Architecture health parse | PASS | `docs/graphs/architecture-health.json` generated `2026-06-30T19:49:33.889Z`; raw `implementation_without_tests=1166`; actionable `implementation_without_tests=1157`; classified inferred-link noise `9`; verified-without-proof rows `0`. |
| Awareness graph parse | PASS | `docs/graphs/architecture-awareness.json` parsed with `2768` entities and `6417` relations. Derived actionable rows match `1157` when excluding tested entities and classified noise. |
| Route capability gate | PASS | `npm run check:route-capabilities` returned `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| Architecture status gate | PASS | `npm run architecture:status` returned GREEN, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |

## Signal Classification

Raw signal: `1166` implemented entities without inferred tests.
Actionable signal after scanner noise: `1157`.

| Bucket | Count | Classification | Likely verification layer |
| --- | ---: | --- | --- |
| Function entities | 939 | Broad implementation confidence debt. Select by product journey or defect evidence, not by raw count. | Backend unit/integration proof, script smoke, or browser/API journey depending on path. |
| Feature entities | 168 | Mixed product, tooling, and config confidence debt. | Journey proof for product paths; architecture/script gates for tooling; scanner curation for config-only rows. |
| API endpoint entities | 43 | Express mount/API surface signal. Mount rows are not themselves a complete behavior target. | API integration proof through named route/journey. |
| Component entities | 7 | Shared UI primitive confidence signal. | Browser/UI route proof unless a component-level regression is reproduced. |

## Area Classification

The actionable rows group by path area as follows:

| Area | Count | Decision |
| --- | ---: | --- |
| Architecture/ops/tooling scripts | 396 | Covered best by architecture/script smoke gates. Do not turn into broad product QA work. |
| Web UI component/route surface | 261 | Candidate for browser proof only when tied to a specific route/journey or visual regression. |
| Backend domain module | 137 | Candidate for focused API proof by business workflow. |
| Integrations/configuration | 105 | Candidate only with local-safe configuration proof; protected provider actions remain gated. |
| Company OS / operating model | 72 | Already has recent focused proof families; select new work only for a fresh unproved endpoint or defect. |
| API mount surface | 49 | Scanner granularity around `src/app.ts`; prove mounted behavior through routes, not generic mount tests. |
| Account access / auth / config | 48 | High-risk family, but already repeatedly covered by recent auth/config proof and curation packets. |
| Backend service/API support | 29 | Select by affected user journey or failing proof. |
| Relationships / operating graph | 19 | Existing proof family; no fresh defect found in this heartbeat. |
| Database seed/migration support | 11 | Use DB seed/migration smoke only when data setup changes. |
| Work management | 10 | Select by route/API journey if release-critical. |
| Dashboard | 7 | Browser proof candidate only with a fresh dashboard gap. |
| Finance | 7 | Existing local API proof family; no fresh defect found. |
| Strategy/trading | 4 | Existing local strategy proof family; no fresh defect found. |
| Config-only noise | 2 | Scanner curation/noise, not product QA work. |

Classified inferred-link noise remains `9`: `2` config-only files and `7`
test fixture/helper functions.

## Decision
The [LUC-6460](/LUC/issues/LUC-6460) `implementation_without_tests=1166`
signal is a stable confidence-debt and scanner-granularity signal, not a
single implementation defect and not a reason to open broad test generation.

No fresh nonduplicated test-authoring lane is selected from this heartbeat
because:
- architecture ownership, docs, task linkage, implementation-task linkage,
  disconnected-entity, and verified-without-proof signals are clean;
- route capability and architecture status gates pass;
- the highest-risk families overlap prior auth/config, Company OS,
  relationships, finance, strategy/trading, dashboard, and app-completion
  curation work;
- no concrete broken route, browser journey, protected-proof authorization, or
  reproduced runtime failure appeared in the issue context or local readback.

The smallest repeatable future QA lane is: select one named route/API/browser
journey from a future fresh failure, release-critical gap, or app-completion
row that is not already covered by existing proof families; run the local
project-native proof; open repair only after a reproducible failure.

## Acceptance Criteria
- [x] Raw `1166` signal parsed.
- [x] Actionable `1157` signal parsed and derived from graph rows.
- [x] Signals grouped by type, owner, area/flow family, and likely
  verification layer.
- [x] Noise and low-value scanner rows separated.
- [x] Smallest repeatable proof-lane recommendation recorded.
- [x] Protected actions avoided.
- [x] Project-native local gates run.

## Source-Control Closure
- Repo path: `C:\Personal\Projekty\Aplikacje\Roost`.
- Files changed by this heartbeat: this packet plus source-of-truth state
  pointers.
- Pre-existing dirty worktree: shared mixed dirty with generated/status/state
  files, many untracked `docs/planning/luc-*` packets, UX evidence folders,
  one operations note, and unrelated modified `src/tests/api.test.ts`.
- Commit: not created because this is a shared mixed-dirty, ahead worktree and
  the issue only requires local classification evidence.
- Push: not needed and not performed.
- Deploy impact: none.
- Runtime/process impact: none; no local runtime process, browser, Docker
  container, watcher, or database was started.

## Result Report
[LUC-6472](/LUC/issues/LUC-6472) is complete. The post-[LUC-6460](/LUC/issues/LUC-6460)
implementation-without-tests signal is classified as proof-ladder confidence
debt and scanner granularity, with `1157` actionable rows after `9` noise rows.
No broad test-generation or product repair lane is justified from this signal
alone. Future QA work should be selected only from a fresh concrete unproved
journey, route, browser gap, protected-proof authorization, or reproduced
failure.
