# LUC-4936 - Management Departments API Regression Coverage

## Header
- ID: LUC-4936
- Title: Add or prove Management departments API regression coverage
- Task Type: QA regression hardening
- Current Stage: verification
- Status: DONE
- Owner: QA & Verification Engineer
- Priority: high
- Mission ID: LUC-4936-MGMT-DEPARTMENTS-API-REGRESSION
- Mission Status: VERIFIED_DONE

## Goal

Close the follow-up from [LUC-4927](/LUC/issues/LUC-4927) by proving whether
`/v1/departments` already had dedicated API assertions and adding the narrow
coverage if it did not.

## Scope

- `src/tests/api.test.ts`
- `src/modules/departments/departments.routes.ts`
- `src/auth/capabilities.ts`
- `docs/architecture/nodes/api_routes.csv`
- `docs/architecture/nodes/nodes.csv`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Inspect the existing department route and API regression suite.
2. Confirm whether `src/tests/api.test.ts` directly calls
   `GET/POST/PATCH /v1/departments`.
3. Add focused assertions only for the Management department catalog API if
   direct coverage is missing.
4. Run the route/capability drift gate and local API harness.
5. Update source-of-truth evidence and residual risk.

## Acceptance Criteria

- [x] Existing coverage state is known.
- [x] `GET /v1/departments` is covered for default workspace bootstrap,
      Management linked view, and approved view templates.
- [x] `POST /v1/departments` is covered for custom department creation with
      approved linked views.
- [x] `PATCH /v1/departments/:id` is covered for metadata, status, position,
      and linked-view updates.
- [x] Invalid linked views fail closed with `invalid_department_view`.
- [x] Workspace isolation is covered by confirming the second owner workspace
      does not see the custom department from the first workspace.
- [x] Route/capability drift proof passes.
- [x] Local API regression proof passes.

## Definition Of Done

- [x] No production, deploy, push, restart, protected smoke, credential access,
      or secret disclosure is required.
- [x] Local API assertions are committed to the test source in the shared
      workspace.
- [x] Validation evidence is recorded with command names and results.
- [x] Residual risk is explicit.
- [x] Issue can close without creating another backend/test implementation
      issue.

## Result Report

`src/tests/api.test.ts` did not previously contain direct `/v1/departments`
calls. The `CompanyCore v1 protected API flow` now has a focused Management
department catalog block after owner registration. It verifies the default
13-department catalog, the `12-zarzadzanie` Management department linked to
`management.departments`, custom department creation for `13 Marketing Lab`,
metadata/status/position/linked-view update to `13 Growth Lab`, invalid linked
view rejection, and workspace isolation against the second owner workspace.

Validation:

- `npm run check:route-capabilities`: PASS
  (`checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`).
- `npm run test:api:local`: PASS after server/web build, all `31`
  migrations, seed, and `7/7` API subtests.
- `npm run architecture:refresh`: PARTIAL command run; generated graph moved
  to `454` nodes / `765` relations / `35` chains and all gates passed until
  `architecture:gate-doc-baseline`, which reported one baseline mismatch:
  chain coverage expected `34/34` while the narrative baseline still said
  `33/33`.
- `npm run architecture:gate-doc-baseline`: PASS after updating
  `docs/architecture/architecture-evidence-system.md` to the refreshed
  `34/34` chain-coverage baseline.
- Tail gates after the partial refresh: `npm run
  architecture:gate-command-contract` PASS, `npm run
  architecture:gate-report-presence` PASS, `npm run architecture:gate` PASS,
  and `npm run architecture:status` PASS (`GREEN`, graph `454/765/35`,
  evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).
- `git diff --check`: PASS with expected Windows LF-to-CRLF warnings only.

Cleanup:

- `companycore-test-postgres` was removed by the local API harness.
- No `chrome-headless-shell` process was present.
- `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, and
  `NO_TEMPORARY_SOLUTIONS.md` were checked for this QA regression slice.

## Residual Risk

- This is local API regression coverage only. Production proof remains a
  release/credential-gated concern.
- The shared workspace contains adjacent Roost architecture/product-map dirty
  work, including [LUC-4935](/LUC/issues/LUC-4935) generated architecture
  state and unrelated [LUC-4937](/LUC/issues/LUC-4937) product capability map
  files. This QA lane did not create a mixed local commit.
