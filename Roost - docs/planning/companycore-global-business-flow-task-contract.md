# Task

## Header
- ID: ORG-FLOW-001
- Title: CompanyCore Global Business Flow
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: ORG-ARCH-001, ORG-MOD-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: ORG-FLOW-001
- Requirement Rows: REQ-ORG-FLOW-001
- Quality Scenario Rows: not applicable
- Risk Rows: RISK-ORG-FLOW-001
- Iteration: 2026-05-16 documentation architecture iteration
- Operation Mode: BUILDER
- Mission ID: ORG-FLOW-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository
      sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or
      marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: define one global business value-flow model that connects
  CompanyCore architecture to the complete company journey from market signal
  to delivery, payment, feedback, and improvement.
- Release objective advanced: source-of-truth clarity for future CRM,
  marketing, delivery, finance, feedback, AI, and graph work.
- Included slices: architecture document, architecture index updates, project
  memory/state updates, requirement/risk/module confidence rows, and planning
  evidence.
- Explicit exclusions: no runtime code, schema, API, MCP, automation, billing,
  survey, CRM, or UI implementation.
- Checkpoint cadence: single documentation checkpoint.
- Stop conditions: stop if the model contradicted the approved Company OS,
  business module map, or operating-area architecture.
- Handoff expectation: future implementation work should derive scoped tasks
  from the global flow instead of adding provider-led or isolated module work.

## Context

CompanyCore already has architecture for Company OS, operating areas,
business modules, Paperclip/AI layers, workflows, governance, knowledge,
resources, metrics, and MCP boundaries. The missing source-of-truth layer was
one global company flow that explains how brand, clients, discovery, delivery,
payment, support, feedback, and improvement fit together.

## Goal

Publish a single global business-flow architecture document that can be shown
at an executive level while remaining compatible with CompanyCore's operating
graph, module map, and command/audit boundaries.

## Scope

Allowed files:

- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/README.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/companycore-business-module-map.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/delivery-map.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/risk-register.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/companycore-global-business-flow-task-contract.md`

## Implementation Plan
1. Inspect the existing architecture and state files before changing files.
2. Add a new architecture document with the global pipeline, dependency tree,
   stage contracts, relationships, area mapping, visualization levels, AI
   boundary, metrics, and guardrails.
3. Link the document from architecture indexes and relevant source-of-truth
   state files.
4. Record the decision, requirement, risk, module confidence row, and task
   board evidence.
5. Run documentation hygiene validation.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: CompanyCore had strong module/process architecture but lacked one
  end-to-end business value-flow model for product and service delivery.
- Gaps: no central presentation-friendly pipeline from brand and demand to
  payment, feedback, and operating-system improvement.
- Inconsistencies: none found that block the requested model.
- Architecture constraints: do not create duplicate modules or approve new
  runtime surfaces; reuse Company OS, operating areas, module map, MCP, audit,
  and provider adapter boundaries.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none required for this documentation slice.
- Sources scanned: architecture README, system architecture, organizational
  bridge, business module map, project memory, delivery map, requirements,
  module confidence, decision register, risk register, project state, task
  board, definition of done, and integration checklist.
- Rows created or corrected: ORG-FLOW-001, REQ-ORG-FLOW-001,
  RISK-ORG-FLOW-001, DEC-023, CCORE-DM-011.
- Assumptions recorded: this is architecture planning scope only.
- Blocking unknowns: none.
- Why it was safe to continue: the user asked for a global model and the model
  clarifies existing approved architecture without changing runtime ownership.

### 2. Select One Priority Mission Objective
- Selected task: ORG-FLOW-001 CompanyCore Global Business Flow.
- Priority rationale: this creates the missing central flow for future CRM,
  marketing, delivery, finance, feedback, and AI planning.
- Why other candidates were deferred: runtime graph, billing, CRM, survey, and
  UI work require separate scoped requirements and validation.

### 3. Plan Implementation
- Files or surfaces to modify: architecture and state/planning docs only.
- Logic: model the company as a cyclic value pipeline and graph projection over
  existing CompanyCore modules.
- Edge cases: keep product/service/hybrid delivery on one shared flow; keep AI
  and payment-related work behind future scoped contracts.

### 4. Execute Implementation
- Implementation notes: added a new architecture document with Mermaid and
  text views for executive, department, process, and execution levels.

### 5. Verify and Test
- Validation performed: `git diff --check`.
- Result: PASS.

### 6. Self-Review
- Simpler option considered: only adding a short planning note.
- Technical debt introduced: no
- Scalability assessment: the model scales because it is a graph projection
  over existing modules rather than a parallel subsystem.
- Refinements made: separated executive L0 from execution L3 and added
  explicit guardrails against generic edge tables and raw agent/provider access.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] One global pipeline covers brand, marketing, lead flow, discovery,
      agreement, delivery, QA/acceptance, payment, support, feedback, and
      improvement.
- [x] The model maps back to approved CompanyCore modules, operating areas,
      governance, AI/MCP, metrics, and evidence boundaries.
- [x] Source-of-truth indexes and state files reference the new architecture
      document.

## Success Signal
- User or operator problem: the owner needs one clear model for how the company
  delivers products and services.
- Expected product or reliability outcome: future work can be visualized and
  scoped from a coherent end-to-end flow instead of isolated module ideas.
- How success will be observed: future CRM, delivery, finance, feedback, and
  agent tasks reference the global business flow.
- Post-launch learning needed: yes

## Deliverable For This Stage

Verified documentation/source-of-truth update only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done
- [x] Code builds without errors. Not applicable; no code changed.
- [x] Feature works manually through the real UI, API, CLI, or operator path.
      Not applicable; documentation architecture change.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers. Not applicable.
- [x] Backend and UI/client error handling exists where applicable. Not applicable.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, or navigation refresh where
      applicable. Not applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded
      when applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new systems without approval
- duplicated logic or parallel implementations of the same contract
- temporary bypasses, hacks, or workaround-only paths
- architecture changes without explicit approval
- implicit stage skipping

## Validation Evidence
- Tests: `git diff --check` PASS.
- Manual checks: source review against architecture and module map.
- Screenshots/logs: not applicable.
- High-risk checks: confirmed no runtime code, schema, API, MCP, billing, or
  survey implementation was added.
- Coverage ledger updated: not applicable.
- Coverage rows closed or changed: none.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: ORG-FLOW-001 added as VERIFIED
  documentation scope.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-ORG-FLOW-001 added as verified.
- Quality scenarios updated: not applicable.
- Quality scenario rows closed or changed: none.
- Risk register updated: yes.
- Risk rows closed or changed: RISK-ORG-FLOW-001 added as mitigating.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: `git diff --check`.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner/operator.
- Existing workaround or pain: company flow existed across multiple docs but
  not as one global value pipeline.
- Smallest useful slice: architecture model and source-of-truth links.
- Success metric or signal: future task intake references this model.
- Feature flag, staged rollout, or disable path: not applicable.
- Post-launch feedback or metric check: future planning should validate
  whether the model is understandable in the UI.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable
- Feedback item IDs: ORG-FLOW-001
- Feedback accepted: user requested one global flow/dependency model for
  product and service delivery.
- Feedback needs clarification: none for documentation scope.
- Feedback conflicts: none.
- Feedback deferred or rejected: runtime implementation deferred.
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: future company-flow visualization and planning.
- SLI: not applicable.
- SLO: not applicable.
- Error budget posture: not applicable.
- Health/readiness check: not applicable.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: `git diff --check`.
- Rollback or disable path: revert documentation changes.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- Memory consistency scenarios: not applicable.
- Multi-step context scenarios: not applicable.
- Adversarial or role-break scenarios: not applicable.
- Prompt injection checks: not applicable.
- Data leakage and unauthorized access checks: not applicable.
- Result: no runtime AI behavior changed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: not applicable
- Data classification: public/internal architecture documentation.
- Trust boundaries: AI/API/MCP boundaries explicitly preserved.
- Permission or ownership checks: no runtime changes.
- Abuse cases: agents bypassing API/provider boundaries explicitly prohibited.
- Secret handling: no secrets touched.
- Security tests or scans: not applicable.
- Fail-closed behavior: future risky actions remain behind existing approval
  and audit boundaries.
- Residual risk: future payment/finance/survey implementation needs separate
  security and privacy requirements.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`,
  `docs/architecture/organizational-architecture-bridge.md`,
  `docs/architecture/companycore-business-module-map.md`,
  `docs/architecture/architecture-source-of-truth.md`.
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no
- Approval reference if architecture changed: user request 2026-05-16.
- Follow-up architecture doc updates: future finance/billing and feedback
  implementation contracts when selected.

## UX/UI Evidence
- Design source type: not applicable
- Design source reference: not applicable
- Canonical visual target: future graph visualization may derive from this
  document.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: no
- Primary user question answered within 3 seconds: What is the company's full
  delivery flow?
- Next action visibility: future work candidates included.
- Blocked-state visibility: implementation guardrails and deferred runtime
  scope documented.
- Responsive checks: not applicable.
- Accessibility checks: not applicable.
- Parity evidence: not applicable.

## Deployment / Ops Evidence
- Deploy impact: none
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: no
- Rollback note: documentation-only revert.
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: not applicable

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to iteration rotation.
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
- [x] Docs or context were updated if repository truth changed.
- [x] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report
- Task summary: added the CompanyCore global business-flow architecture model.
- Files changed: listed in Scope.
- How tested: `git diff --check`.
- What is incomplete: no runtime flow read model, UI visualization, payment
  module, CRM opportunity flow, or feedback survey automation was implemented.
- Next steps: derive scoped implementation tasks for global-flow read model,
  executive visualization, finance/billing contracts, feedback survey loop, and
  CRM discovery/offer relations when prioritized.
- Decisions made: the company value flow is a cyclic graph projection over
  existing CompanyCore modules.

## Notes

This task intentionally keeps the flow as architecture source of truth. Future
runtime slices must remain narrow and evidence-backed.
