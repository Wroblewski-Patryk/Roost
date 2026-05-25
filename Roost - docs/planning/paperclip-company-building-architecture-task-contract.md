# Paperclip Company-Building Architecture Direction

## Header
- ID: PAPERCLIP-ARCH-001
- Title: Paperclip Company-Building Architecture Direction
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs
- Depends on: none
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Paperclip bridge, MCP/API agent access, knowledge sources, task orchestration
- Requirement Rows: Paperclip company-building direction
- Quality Scenario Rows: agent usefulness, least-privilege access, auditability
- Risk Rows: agent authority ambiguity, provider bypass, unplanned autonomous execution
- Iteration: 2026-05-15 Paperclip architecture conversation
- Operation Mode: ARCHITECT
- Mission ID: PAPERCLIP-ARCH-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches architecture-only work.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was not needed for this short architecture slice.
- [x] Missing or template-like state tables were not blocking this architecture update.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified at planning level.
- [x] The task improves future implementation direction without changing runtime behavior.

## Mission Block
- Mission objective: record the minimal Paperclip company-building operating model.
- Release objective advanced: agent/Paperclip readiness and future MCP/API planning.
- Included slices: architecture wording, project memory, decision register, task evidence.
- Explicit exclusions: no schema, API, MCP, UI, provider, or Paperclip source changes.
- Checkpoint cadence: one architecture update and validation pass.
- Stop conditions: runtime implementation request or architecture mismatch.
- Handoff expectation: future agents can start with a business-plan-to-task verification slice.

## Context
The owner wants CompanyCore to remain the operating app while external AI agents,
especially Paperclip, use CompanyCore to review business context, identify
missing work, and create or propose tasks. The existing architecture already
supports API/MCP, knowledge roots, tools, access scopes, approvals, events, and
audit, but the Paperclip-specific company-building loop needed a concise
canonical direction.

## Goal
Record a minimum architecture direction for Paperclip as a supervised external
company-building execution agent over CompanyCore.

## Scope
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/system-architecture.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/decision-register.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

## Implementation Plan
1. Inspect existing architecture, Paperclip, MCP, settings, and project memory docs.
2. Add a minimal Paperclip company-building model without adding new runtime structures.
3. Update durable project memory and decision tracking.
4. Validate documentation diff and formatting.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Paperclip was documented mostly as an event bridge/poller, while the owner's target is broader company-building assistance.
- Gaps: no concise canonical loop for business-plan/context review -> missing task analysis -> scoped task creation/proposal -> feedback.
- Inconsistencies: none blocking; existing docs already support API/MCP, knowledge, tools, access, and audit.
- Architecture constraints: CompanyCore remains source of truth; agents must not access DB or provider tokens directly.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: architecture docs, settings spec, Paperclip runbook, project memory, task board, decision register, Prisma schema excerpts.
- Assumptions recorded: CompanyCore should not embed AI; external agents consume CompanyCore through API/MCP.
- Blocking unknowns: none for architecture direction.
- Why it was safe to continue: user explicitly approved recording the minimal direction and asked for no broad implementation.

### 2. Select One Priority Mission Objective
- Selected task: record the Paperclip company-building architecture direction.
- Priority rationale: future Paperclip/MCP work needs stable direction before implementation.
- Why other candidates were deferred: runtime API/MCP/UI changes require separate verification and task contracts.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs and durable project memory docs only.
- Logic: clarify logical layers and first implementation loop.
- Edge cases: avoid approving broad autonomy, raw provider access, direct DB access, or new duplicate tables.

### 4. Execute Implementation
- Implementation notes: added Intent, Knowledge, Planning and orchestration, Tools, Access and autonomy, and Audit and feedback as logical layers.

### 5. Verify and Test
- Validation performed: `git diff --check`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: only update chat; rejected because architecture decisions must be durable.
- Technical debt introduced: no
- Scalability assessment: the model starts narrow and can grow through scoped slices.
- Refinements made: classified providers by capability instead of placing whole providers in one layer.

### 7. Update Documentation and Knowledge
- Docs updated: architecture, project state, memory index, decision register, task board.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] Architecture names Paperclip as a supervised external company-building execution agent.
- [x] Architecture records the minimum business-plan/context-to-task loop.
- [x] Architecture keeps CompanyCore as the API/MCP policy boundary and forbids direct DB/provider-token access.
- [x] Project memory and decision register point future agents to the new direction.

## Success Signal
- User or operator problem: future agents do not know how Paperclip should use CompanyCore beyond issue polling.
- Expected product or reliability outcome: future Paperclip work starts from knowledge/task verification and scoped API/MCP tools.
- How success will be observed: next implementation slice can derive a narrow business-plan-to-task task from architecture.
- Post-launch learning needed: yes, after real Paperclip task-generation usage.

## Deliverable For This Stage
Planning-stage architecture direction only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- no runtime behavior changes

## Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check`
- Manual checks: reviewed changed architecture wording for scope discipline.
- Screenshots/logs: not applicable
- High-risk checks: confirmed no runtime, secret, provider, DB, or MCP behavior changed.
- Module confidence ledger updated: no, architecture-only direction.
- Requirements matrix updated: no, architecture-only direction.
- Quality scenarios updated: no, architecture-only direction.
- Risk register updated: no, risks recorded in decision register and task contract.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: no, no runtime integration changed.
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Regression check performed: docs diff whitespace validation.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`, `docs/architecture/organizational-architecture-bridge.md`
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no, user explicitly requested the minimal direction.
- Follow-up architecture doc updates: none required before implementation.

## Deployment / Ops Evidence
- Deploy impact: none
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: no
- Rollback note: revert documentation changes if direction is superseded.

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
- [x] Relevant validations were run.
- [x] Docs or context were updated because repository truth changed.

## Result Report
- Task summary: recorded Paperclip's minimum company-building operating model.
- Files changed: architecture docs, project memory, decision register, task board, task contract.
- How tested: `git diff --check`.
- What is incomplete: no runtime Paperclip/MCP/API implementation was attempted.
- Next steps: verify existing knowledge, business-plan, task, ClickUp, MCP, event, approval, and audit surfaces; then define the smallest business-plan-to-task implementation slice.
- Decisions made: Paperclip is an external supervised agent over CompanyCore, not embedded AI or direct provider/DB client.
