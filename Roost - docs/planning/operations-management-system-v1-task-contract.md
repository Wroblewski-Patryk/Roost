# Task

## Header
- ID: DMS-OPS-001
- Title: 04 Operations Management System V1 Read Model
- Task Type: feature
- Current Stage: verification
- Status: VERIFIED_REAL_DATA
- Owner: Frontend Builder + Product Docs
- Depends on: DMS-ARCH-001
- Priority: P1
- Module Confidence Rows: DMS-OPS-001
- Requirement Rows: REQ-DMS-OPS-001
- Risk Rows: RISK-DMS-OPS-001
- Operation Mode: BUILDER
- Mission ID: DMS-OPS-001

## Process Self-Audit
- [x] Analyze current state: review DMS architecture, selected-area route, and operating-model catalog.
- [x] Select one priority task: implement `04-operacje` as the first concrete department management system.
- [x] Plan implementation: read-only V1 slice over existing area detail route and existing backend contracts.
- [x] Execute implementation: update docs and web UI only inside scoped files.
- [x] Verify and test: run diff hygiene and build/type gates after implementation.
- [x] Self-review: check architecture alignment, no duplicate backend model, no fake write action.
- [x] Update documentation and knowledge: refresh state ledgers after verification.

## Mission Block
- Mission objective: make `/areas?area=04-operacje&view=overview` feel like an Operations Management System for planning, routines, controls, dependencies, approvals, and AI handoff.
- Included scope:
  - correct DMS documentation so `04` maps to Operacje in the current Company Atlas model;
  - add an operations-specific read-only management board in the selected-area React route;
  - keep the shared React table-record loader aligned with Company OS read capabilities;
  - reuse existing tables and routes such as `procedures`, `procedure-steps`, `approvals`, `dependencies`, and `business-functions`;
  - update source-of-truth state files.
- Explicit exclusions:
  - no backend schema changes;
  - no provider-direct workflows;
  - no fake persisted custom views;
  - no autonomous write actions for approvals, procedures, or dependencies.
- Validation gates:
  - `git diff --check`;
  - `npm run build`.
- Stop conditions:
  - selected-area route cannot distinguish `04-operacje`;
  - existing backend contracts do not expose enough read context;
  - build fails on unrelated dirty work that cannot be safely separated.

## Goal
Implement the first concrete department management system for `04 Operacje`,
focused on owner control over planning, recurring operations, procedure
readiness, approvals, dependencies, and evidence.

## Scope
Allowed files:

- `web/src/main.tsx`
- `web/src/react-route-kit.tsx`
- `web/src/styles.css`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/ux/v1-department-management-systems-view-map.md`
- `docs/ux/v1-department-system-prompt-pack.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Correct the DMS source documents to match the existing Company Atlas numbering where `04` is `Operacje`.
2. Add operations-specific derived read model helpers and a management board component.
3. Render the board only for `04-operacje` inside the selected-area detail route.
4. Style the board with the existing route visual language.
5. Update state ledgers and planning files.
6. Run validation gates and record evidence.

## Acceptance Criteria
- `/areas?area=04-operacje&view=overview` includes a dedicated Operations Management System board.
- The board shows planning/routine/control concepts using existing CompanyCore data only.
- The board links to existing deeper workbenches rather than inventing new backend behavior.
- Documentation uses `04 Operacje` consistently for the current Company Atlas.
- No runtime write action is introduced without an existing contract.

## Definition Of Done
- Architecture and UX docs are updated.
- UI implementation is complete and builds.
- State files record requirement, risk, module confidence, and queue changes.
- Validation evidence is captured in this task contract.

## Result Report
- Status: VERIFIED
- Files changed:
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `web/src/styles.css`
  - `docs/architecture/department-management-systems-architecture.md`
  - `docs/ux/v1-department-management-systems-view-map.md`
  - `docs/ux/v1-department-system-prompt-pack.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/core/project-memory-index.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/system-health.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/decision-register.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/risk-register.md`
  - `.agents/state/module-confidence-ledger.md`
  - `docs/planning/mvp-next-commits.md`
- Validation:
  - `npm run build` passed for the original UI implementation.
  - `npm run build:web` passed after the real-data proof fix.
  - `git diff --check` passed.
  - Playwright authenticated mocked-owner proof for
    `http://127.0.0.1:3102/areas?area=04-operacje&view=overview` verified:
    `04 Operations Management System`, `Planning, routines, controls,
    dependencies`, `Planning authority`, `Routine library`, `Controls and
    approvals`, and `Paperclip packet`.
  - Desktop and mobile proof found no horizontal overflow.
  - Screenshots:
    `docs/ux/evidence/dms-ops-management-system-desktop.png` and
    `docs/ux/evidence/dms-ops-management-system-mobile.png`.
  - Database-backed proof on `http://127.0.0.1:3214/areas?area=04-operacje&view=overview`
    registered a fresh owner, seeded real Company OS records for a business
    function, procedure, procedure step, approval, and dependency, and verified
    the Operations board on desktop and mobile. The proof caught and fixed a
    shared table-record loader gap: Company OS collections are readable through
    `company-os:read`, not individual `${apiSlug}:read` capabilities.
  - Real-data screenshots:
    `docs/ux/evidence/dms-ops-real-data-desktop.png` and
    `docs/ux/evidence/dms-ops-real-data-mobile.png`.
  - Temporary local server was stopped and port `3102` was no longer
    listening.
  - Headless browser processes from the validation run were cleaned up.
  - The real-data validation backend on port `3214` and portable PostgreSQL on
    port `55482` were stopped after the proof.
- Residual risk: production smoke remains required after deploy. The panel is
  still intentionally read-only; operations writes require explicit Company OS
  command contracts and approval gates.
