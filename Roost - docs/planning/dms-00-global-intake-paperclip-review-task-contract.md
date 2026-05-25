# Task

## Header
- ID: DMS-00-001
- Title: Global Intake And Paperclip Output Review Contract
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs + Backend Builder + Frontend Builder
- Depends on: DMS-V1-000
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: DMS-00-001
- Requirement Rows: REQ-DMS-00-001
- Quality Scenario Rows: not applicable
- Risk Rows: not applicable
- Iteration: 2026-05-16-DMS-00-001
- Operation Mode: ARCHITECT
- Mission ID: DMS-00-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches planning/design scope.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through startup context.
- [x] Missing or template-like state tables were not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by defining the first `00 Main`
      runtime contract before code.

## Mission Block
- Mission objective: define the global intake and Paperclip output review
  contract for `00 Main`.
- Release objective advanced: V1 can make background agent output visible and
  owner-reviewable before automation expands.
- Included slices: source families, statuses, row shape, backend surface, MCP,
  web panels, routing heuristics, first implementation slice.
- Explicit exclusions: runtime route implementation, migrations, UI code,
  Paperclip source changes, write commands.
- Checkpoint cadence: one planning checkpoint.
- Stop conditions: implementation without source audit or owner review.
- Handoff expectation: next task is DMS-00-002 source audit.

## Context

The global V1 DMS plan selected `DMS-00-001` as the first active task. Existing
CompanyCore foundations include `AgentEventOutbox`, `/v1/agent-events`, events,
provider inbox, tasks, Drive files, provider mappings, relationship review,
Company OS approvals/risks, and MCP profiles.

## Goal

Define the contract for `00 Main` as a read-first global intake and Paperclip
output review surface.

## Scope

Allowed files:

- `docs/planning/dms-00-global-intake-paperclip-review-contract.md`
- `docs/planning/dms-00-global-intake-paperclip-review-task-contract.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/next-steps.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/delivery-map.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/core/project-memory-index.md`
- `.codex/context/PROJECT_STATE.md`

Runtime code is out of scope.

## Implementation Plan

1. Inspect existing agent event, provider inbox, event, MCP, and Paperclip docs.
2. Define source families, review statuses, row shapes, backend/MCP surface,
   web panels, routing heuristics, and future write guardrails.
3. Update active queues and state docs.
4. Validate documentation hygiene.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `00 Main` had product intent but no concrete intake/read model.
- Gaps: no row shape, statuses, API/MCP design, or web panel contract.
- Inconsistencies: none blocking.
- Architecture constraints: read model first; no unsafe Paperclip writes.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: agent-events route, Prisma schema, MCP profiles, agent
  playbook, DMS blueprint, global plan.
- Rows created or corrected: REQ-DMS-00-001 and DMS-00-001 state rows.
- Assumptions recorded: first runtime slice can derive intake rows from
  existing tables without migration.
- Blocking unknowns: exact source mapping requires DMS-00-002 audit.
- Why it was safe to continue: planning/design only.

### 2. Select One Priority Mission Objective
- Selected task: DMS-00-001.
- Priority rationale: global intake is the first missing minimum operating loop
  surface.
- Why other candidates were deferred: pricing inventory and shell extraction
  remain next after this contract.

### 3. Plan Implementation
- Files or surfaces to modify: planning/state docs.
- Logic: documentation contract.
- Edge cases: Paperclip reads must not hide or acknowledge owner-review items.

### 4. Execute Implementation
- Implementation notes: added the DMS-00 contract with read model shape, MCP
  surface, web panels, routing heuristics, and future command guardrails.

### 5. Verify and Test
- Validation performed: `git diff --check`.
- Result: passed with line-ending warnings only.

### 6. Self-Review
- Simpler option considered: implement a quick `/v1/intake` route immediately.
- Technical debt introduced: no.
- Scalability assessment: contract allows derived read model now and durable
  intake table later only if needed.
- Refinements made: separated read aggregate from future write commands.

### 7. Update Documentation and Knowledge
- Docs updated: planning and state docs.
- Context updated: task board, next steps, requirements, delivery map, module
  confidence, project memory, project state.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Source families are defined.
- [x] Review status, priority, risk, and agent authority vocabularies are
      defined.
- [x] Intake row and summary shapes are defined.
- [x] Proposed backend and MCP surfaces are defined.
- [x] `00 Main` web panel requirements are defined.
- [x] First follow-up implementation/audit task is named.

## Success Signal
- User or operator problem: Paperclip output and unclassified work will have a
  visible owner-controlled review path.
- Expected product or reliability outcome: background agent work cannot become
  invisible or unsafe.
- How success will be observed: DMS-00-002 can implement a source audit without
  guessing product behavior.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Planning contract only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce runtime structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within planning stage

## Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.
- [ ] Code builds without errors. Not applicable to docs-only planning.
- [ ] Feature works manually through the real UI, API, CLI, or operator path.
      Not applicable to docs-only planning.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check` passed with line-ending warnings only.
- Manual checks: source contract review
- Reality status: verified

## Result Report
- Task summary: published the global intake and Paperclip output review
  contract.
- Files changed: planning/state docs.
- How tested: `git diff --check`.
- What is incomplete: DMS-00-002 source audit and runtime implementation.
- Next steps: audit current sources for intake candidates.
- Decisions made: read aggregate first; write commands later.
