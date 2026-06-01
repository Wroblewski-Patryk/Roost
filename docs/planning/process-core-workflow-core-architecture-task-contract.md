# Task

## Header
- ID: PROCESS-CORE-001
- Title: Reusable Process Core / Workflow Core Architecture
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Product Docs + Architecture
- Depends on: ORG-MOD-001, ORG-ARCH-002, DMS-BLUEPRINT-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: PROCESS-CORE-001
- Requirement Rows: REQ-PROCESS-CORE-001
- Quality Scenario Rows: QA-PROCESS-CORE-001
- Risk Rows: RISK-PROCESS-CORE-001
- Iteration: 2026-06-01 architecture memory checkpoint
- Operation Mode: ARCHITECT
- Mission ID: PROCESS-CORE-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the architecture-impacting nature of the task.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was considered through AGENTS mission rules.
- [x] Missing or template-like state tables were not found for this doc-only task.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by preserving owner architecture intent for future agents.

## Mission Block
- Mission objective: Convert owner-provided Process Core guidance into durable Roost architecture and execution memory.
- Release objective advanced: Future Process Core runtime work can start from a reusable Company OS contract instead of department-local pipeline screens.
- Included slices: architecture doc, source-of-truth links, requirement/risk/quality/module rows, active queue handoff.
- Explicit exclusions: no Prisma migration, no API route, no MCP tool, no frontend screen, no production deployment.
- Checkpoint cadence: one documentation checkpoint with diff and architecture-status validation.
- Stop conditions: architecture references and state ledgers point to the new Process Core contract.
- Handoff expectation: next builders start with a current-state audit before schema or UI work.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, project memory, owner attachment | Integration, task closure, source-of-truth updates | Mission packet and final acceptance | `git diff --check`, architecture status | VERIFIED |
| Product/Requirements | Coordinator | owner attachment | Process Core requirement and acceptance criteria | REQ row and architecture task contract | source review | VERIFIED |
| Architecture | Coordinator | `system-architecture`, `companycore-business-module-map`, `unified-organizational-operating-system` | `process-core-workflow-core-architecture.md` and links | Architecture contract | source review | VERIFIED |
| Implementation | Future builder | future task contracts | Prisma/API/MCP/UI | No runtime change in this task | not applicable | DEFERRED |
| QA/Test | Coordinator | architecture gates | doc validation only | Diff hygiene and architecture status | command output | VERIFIED |
| Security/Ops/UX | Coordinator | Paperclip and approval guardrails | Risk and quality rows | Guardrails for future implementation | source review | VERIFIED |
| Documentation/Memory | Coordinator | project state, task board, memory indexes | durable source-of-truth sync | updated docs/state rows | source review | VERIFIED |

### Lane Checks
- [x] `.agents/state/active-mission.md` was refreshed for this architecture checkpoint.
- [x] Responsibility lanes were kept local because edits were tightly coupled documentation/state changes.
- [x] Every important responsibility from the owner attachment has an owner or explicit future scope.
- [x] No two write lanes owned the same file or shared registry.
- [x] Each lane has expected output and validation/proof.
- [x] No missing-lane learning was needed.

## Context

The project already has Company OS foundations for processes, pipelines,
stages, procedures, runtime runs, approvals, events, audit logs, resources,
MCP manifests, and workforce records. The owner guidance clarifies the target:
Roost must provide a reusable Process Core that can attach workflows to any
department or business entity, while Paperclip remains a supervised execution
client.

## Goal

Make the Process Core target recoverable from architecture docs and planning
state so future agents build toward one reusable workflow engine for the
company instead of many disconnected pipeline screens.

## Scope

Allowed files:

- `docs/architecture/process-core-workflow-core-architecture.md`
- `docs/architecture/README.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/*` planning and ledger files
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

Explicitly out of scope:

- Prisma schema changes.
- API/MCP route implementation.
- Web sidebar or view implementation.
- Provider or Paperclip runtime mutation.
- Client/product seed data.

## Implementation Plan

1. Inspect existing architecture and memory files.
2. Add a dedicated Process Core architecture document.
3. Link it from source-of-truth and module maps.
4. Add decision, requirement, quality, risk, module-confidence, and queue rows.
5. Validate documentation hygiene and architecture status.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Process Core target existed partially in current workflow docs, but the owner-provided reusable entity model and Paperclip sync context were not consolidated in one architecture contract.
- Gaps: No single source linked pipelines, procedures, checklists, evidence, approvals, blueprints, linked assets, and Paperclip sync context across all entity types.
- Inconsistencies: Future agents could overfit pipelines to Sales or Operations views.
- Architecture constraints: Roost is source of truth; Paperclip is external API/MCP client; writes are command-shaped and audited.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Missing or template-like files: none for this task.
- Sources scanned: AGENTS, architecture docs, project memory, task board, module confidence, requirement/risk/quality registers, owner attachment.
- Rows created or corrected: PROCESS-CORE-001 architecture memory and planning rows.
- Assumptions recorded: safe assumption that this task is documentation/source-of-truth integration, not runtime implementation.
- Blocking unknowns: none for architecture capture.
- Why it was safe to continue: user explicitly asked to install these ideas into architecture as an agent target.

### 2. Select One Priority Mission Objective
- Selected task: PROCESS-CORE-001.
- Priority rationale: Architecture source of truth must be updated before runtime agents implement Process Core.
- Why other candidates were deferred: Runtime schema/UI/API work requires an audit and scoped implementation contracts first.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs, planning docs, ledgers/state.
- Logic: connect owner guidance to existing Company OS foundations and mark future runtime work as deferred.
- Edge cases: avoid treating named clients as subscription products; avoid creating a parallel workflow subsystem.

### 4. Execute Implementation
- Implementation notes: new architecture doc added and linked from source-of-truth files; state and planning rows updated.

### 5. Verify and Test
- Validation performed: `git diff --check`; `npm run architecture:status`.
- Result: pass.

### 6. Self-Review
- Simpler option considered: add a short note to `system-architecture.md` only.
- Technical debt introduced: no runtime debt.
- Scalability assessment: separate architecture doc is clearer because the owner guidance defines many reusable contracts and flows.
- Refinements made: preserved existing Company OS foundations and framed missing models as target gaps.

### 7. Update Documentation and Knowledge
- Docs updated: architecture, planning, project/state ledgers.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Process Core direction is captured in `docs/architecture/`.
- [x] Existing architecture docs link to the Process Core contract.
- [x] Paperclip remains external execution layer in the architecture wording.
- [x] Client, service project, product, and subscription product distinctions are explicit.
- [x] Future runtime work is queued as audit-first, not schema-first.

## Success Signal
- User or operator problem: future agents need a coherent target for combining Roost and Paperclip into an autonomous company operating system.
- Expected product or reliability outcome: new workflow/pipeline work derives from one reusable Process Core.
- How success will be observed: future task contracts cite `process-core-workflow-core-architecture.md` and avoid department-local duplicate workflow systems.
- Post-launch learning needed: yes, after the first runtime Process Core slice is implemented.

## Deliverable For This Stage

Source-of-truth architecture and planning handoff only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce runtime structures without implementation approval
- do not implement workarounds
- do not duplicate logic
- stay within documentation/planning stage
- no placeholder runtime data

## Definition of Done
- [x] Code builds without errors: not applicable, no runtime code changed.
- [x] Feature works manually through real UI/API/CLI/operator path: not applicable, architecture-only.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers: deferred to runtime tasks.
- [x] Backend and UI/client error handling exists where applicable: not applicable.
- [x] No existing functionality is broken by documentation changes.
- [x] Feature works after restart, reload, or navigation refresh where applicable: not applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded where applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new runtime systems without approval
- duplicated workflow implementations
- temporary bypasses
- schema changes without scoped audit
- implicit stage skipping

## Validation Evidence
- Tests: `git diff --check`; `npm run architecture:status`.
- Manual checks: source-of-truth link review.
- Screenshots/logs: not applicable.
- High-risk checks: Paperclip/Roost authority boundary preserved in architecture.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes, PROCESS-CORE-001.
- Requirements matrix updated: yes, REQ-PROCESS-CORE-001.
- Quality scenarios updated: yes, QA-PROCESS-CORE-001.
- Risk register updated: yes, RISK-PROCESS-CORE-001.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes, no runtime integration change.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: documentation diff hygiene and architecture status.

## Product / Discovery Evidence
- Problem validated: yes.
- User or operator affected: owner and future agents.
- Existing workaround or pain: future work could split pipelines by department or let Paperclip operate without a Roost-owned process context.
- Smallest useful slice: architecture capture plus queue handoff.
- Success metric or signal: future Process Core tasks cite the contract.
- Feature flag, staged rollout, or disable path: not applicable.
- Post-launch feedback or metric check: first runtime Process Core slice should update this contract with evidence.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable.
- Feedback item IDs: owner attachment 2026-06-01.
- Feedback accepted: yes.
- Feedback needs clarification: no for architecture capture.
- Feedback conflicts: none.
- Feedback deferred or rejected: runtime implementation deferred.
- Active task changed by feedback: yes.
- New task created from feedback: yes.
- Design memory updated: not applicable.
- Learning journal updated: not applicable.

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: future Paperclip-supervised workflow execution.
- SLI: future tasks should define Process Core command success and evidence completeness.
- SLO: not applicable in architecture stage.
- Error budget posture: not applicable.
- Health/readiness check: `npm run architecture:status`.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: not applicable.
- Rollback or disable path: revert documentation changes if the architecture decision is superseded.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: yes, no AI runtime behavior changed.
- Memory consistency scenarios: future Paperclip context packets must preserve entity identity, allowed actions, blocked actions, approvals, and evidence.
- Multi-step context scenarios: future idea-to-product and client-to-service flows must be tested.
- Adversarial or role-break scenarios: future agents must not bypass approval policies or treat clients as products.
- Prompt injection checks: future Paperclip context ingestion must reject untrusted source instructions as authority.
- Data leakage and unauthorized access checks: future API/MCP packets must respect workspace, department, role, entity, and agent permissions.
- Result: architecture guardrails accepted; runtime tests deferred.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes at architecture level.
- Data classification: business operating data, client data, workforce/agent data, files/repositories, evidence, approvals.
- Trust boundaries: Roost API/MCP boundary, Paperclip external execution layer, provider adapters, PostgreSQL source of truth.
- Permission or ownership checks: required in future implementation.
- Abuse cases: agent sends client output, changes pricing, deploys production, or accesses unrelated department data without approval.
- Secret handling: no secret changes.
- Security tests or scans: not applicable.
- Fail-closed behavior: future Paperclip and workflow commands must fail closed on missing permission, invalid transition, missing evidence, or missing approval.
- Residual risk: architecture is accepted but runtime coverage is not yet implemented.

## Architecture Evidence
- Architecture source reviewed: system architecture, unified organizational OS, business module map, owner attachment.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no, user explicitly requested this direction.
- Approval reference if architecture changed: owner request 2026-06-01.
- Follow-up architecture doc updates: keep Process Core doc current after first runtime audit.

## UX/UI Evidence
- Design source type: not applicable.
- Existing shared pattern reused: future views must reuse selected-area shell, `CcDataTable`, and shared department workbench patterns.
- New shared pattern introduced: no runtime pattern.
- Surface strategy checked: desktop, tablet, mobile deferred to runtime tasks.
- State checks: loading, empty, error, success, blocked deferred to runtime tasks.

## Deployment / Ops Evidence
- Deploy impact: none.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not applicable.
- Rollback note: documentation-only rollback.
- Observability or alerting impact: none.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: yes, no deploy action.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to architecture impact.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] AI testing evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs and context were updated.
- [x] Learning journal was not needed.
- [x] Required responsibility lanes were integrated.
- [x] Parent validation ran after lane integration.

## Result Report
- Task summary: Captured the owner-provided Process Core / Workflow Core target as source-of-truth architecture for Roost and future Paperclip-supervised execution.
- Files changed: architecture docs, planning contract, project state and agent ledgers.
- How tested: source review, `git diff --check`, `npm run architecture:status`.
- What is incomplete: no runtime schema/API/MCP/UI implementation yet.
- Next steps: run `PROCESS-CORE-002` current Company OS workflow gap audit, then plan the smallest read-only packet before migrations.
- Decisions made: Process Core is a reusable system capability; Paperclip is external execution; clients/service projects/products/subscription products are distinct.

## Notes

This task intentionally turns user guidance into architecture memory. Runtime
implementation must come later through separate backend, frontend, security,
AI, and QA lanes.
