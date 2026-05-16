# CompanyCore Business Module Map Task Contract

## Header
- ID: ORG-MOD-001
- Title: CompanyCore Business Module Map
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Product Docs + Architecture
- Depends on: ORG-ARCH-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: ORG-MOD-001
- Requirement Rows: REQ-ORG-MOD-001
- Quality Scenario Rows: not applicable
- Risk Rows: RISK-ORG-MOD-001
- Iteration: 2026-05-15 architecture clarification
- Operation Mode: ARCHITECT
- Mission ID: ORG-MOD-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches architecture/documentation scope.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work by scope; this was a bounded documentation mission.
- [x] Missing or template-like state tables were not encountered for this scope.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task improves release/product confidence by reducing architecture drift.

## Mission Block
- Mission objective: Record a scalable business module map for CompanyCore as the bridge for operating the company.
- Release objective advanced: Future web, API, MCP, provider, and agent work can derive from one company operating model instead of provider-led drift.
- Included slices: architecture map document, source-of-truth links, planning/state updates.
- Explicit exclusions: runtime code, migrations, new API routes, new UI screens, provider implementation.
- Checkpoint cadence: one bounded documentation checkpoint.
- Stop conditions: architecture mismatch or need to approve new runtime behavior.
- Handoff expectation: future tasks classify work against the module map before implementation.

## Context

The user clarified that CompanyCore should become the bridge for operating the
company, including databases, Drive/Docs/Sheets, ClickUp, CRM, pipelines,
resources, knowledge, and AI agents. Existing architecture already accepted the
organizational operating-system direction, but the product modules were spread
across several documents.

## Goal

Create a canonical module map that makes the direction recoverable for future
agents and usable for UI/API/MCP/provider planning.

## Scope

- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/README.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/delivery-map.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/risk-register.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Inspect existing architecture and project state.
2. Add the module map as an architecture source-of-truth document.
3. Link the document from architecture indexes and state files.
4. Record requirement, decision, risk, confidence, and queue evidence.
5. Validate documentation diff hygiene.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: The operating-system direction existed, but a model-level module map was missing.
- Gaps: Future UI/API/MCP/provider work could drift toward provider-led screens or duplicated department models.
- Inconsistencies: No runtime mismatch found.
- Architecture constraints: Reuse Company OS, operating model, provider adapter, MCP, approval, event, and audit boundaries.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: architecture docs, project memory, delivery map, module confidence ledger, requirement matrix, risk register, task board.
- Assumptions recorded: DEC-020 accepts the module-map direction as architecture planning scope.
- Blocking unknowns: none for documentation.
- Why it was safe to continue: The user explicitly requested documentation alignment and no runtime behavior changed.

### 2. Select One Priority Mission Objective
- Selected task: ORG-MOD-001 CompanyCore Business Module Map.
- Priority rationale: Reduces architecture drift before more settings, Drive, ClickUp, CRM, pipeline, knowledge, resource, or agent work.
- Why other candidates were deferred: AOG verification and settings implementation remain active but separate runtime tasks.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs and state/planning indexes only.
- Logic: Classify modules as native core, provider-backed, future adapter, or derived view.
- Edge cases: Avoid implying approval for new broad schema/UI/MCP implementation.

### 4. Execute Implementation
- Implementation notes: Added the module map and linked it from architecture, memory, delivery, decision, requirement, risk, confidence, project state, task board, and queue files.

### 5. Verify and Test
- Validation performed: `git diff --check`
- Result: passed

### 6. Self-Review
- Simpler option considered: Only append notes to `organizational-architecture-bridge.md`.
- Technical debt introduced: no
- Scalability assessment: The separate map is clearer for future product, route, provider, and agent planning.
- Refinements made: Added explicit provider boundaries and UI/agent capability layers.

### 7. Update Documentation and Knowledge
- Docs updated: architecture, project memory, delivery map, decision register, requirements, risk, module confidence, project state, task board, planning queue.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] The CompanyCore bridge direction is captured as a module-level architecture document.
- [x] Future modules are classified by ownership model: native core, provider-backed, future adapter, or derived view.
- [x] UI, API, MCP, provider, and agent planning files link to the map through source-of-truth indexes.

## Success Signal
- User or operator problem: Future work no longer has to infer the full company structure from scattered notes.
- Expected product or reliability outcome: More coherent screens, provider adapters, and agent tools.
- How success will be observed: Future task intake references the module map before adding new surfaces.
- Post-launch learning needed: no

## Deliverable For This Stage

Verified documentation/source-of-truth update.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within documentation scope

## Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.
- [x] Runtime build/manual UI checks are not applicable because no runtime behavior changed.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check`
- Manual checks: source-of-truth link review
- Screenshots/logs: not applicable
- High-risk checks: confirmed no runtime files were intentionally changed by this task.
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: ORG-MOD-001
- Requirements matrix updated: yes
- Requirement rows closed or changed: REQ-ORG-MOD-001
- Risk register updated: yes
- Risk rows closed or changed: RISK-ORG-MOD-001
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: diff hygiene only; no runtime behavior changed.

## Architecture Evidence
- Architecture source reviewed: `system-architecture.md`, `organizational-architecture-bridge.md`, `architecture-source-of-truth.md`.
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no; user requested this direction and it fits DEC-015/DEC-019.
- Approval reference if architecture changed: user request 2026-05-15 and DEC-020.
- Follow-up architecture doc updates: Future route/view plans should cite the module map.

## Deployment / Ops Evidence
- Deploy impact: none
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: no runtime change
- Rollback note: revert documentation changes if superseded by a later architecture decision.
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: yes

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Docs or context were updated because repository truth changed.

## Result Report
- Task summary: Added a canonical CompanyCore business module map and linked it into architecture/state/planning files.
- Files changed: listed in Scope.
- How tested: `git diff --check`.
- What is incomplete: Runtime module implementation remains future scoped work.
- Next steps: Use this map during future settings, Drive, ClickUp, CRM, pipeline, knowledge, resource, and agent task intake.
- Decisions made: DEC-020 accepted the module-map scaling direction.
