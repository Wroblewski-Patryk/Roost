# ONTOLOGY-001 Business Ontology Import Foundation

## Header

- ID: ONTOLOGY-001
- Title: Business ontology import foundation for APQC, SIPOC, org-chart, ACL, and SOP sources
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs + Architecture + Backend Builder
- Depends on: DEC-049
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: ONTOLOGY-001
- Requirement Rows: REQ-ONTOLOGY-001
- Quality Scenario Rows: QA-ONTOLOGY-001
- Risk Rows: RISK-ONTOLOGY-001
- Iteration: 2026-05-30
- Operation Mode: ARCHITECT
- Mission ID: ONTOLOGY-001-BUSINESS-ONTOLOGY-IMPORT-FOUNDATION
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches architecture/planning scope.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through active mission requirements.
- [x] Missing or template-like state tables were not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by preventing future ontology/import drift.

## Mission Block

- Mission objective: Turn owner-provided APQC/SIPOC/org-chart/ACL/SOP material into a durable architecture and planning lane without changing runtime behavior.
- Release objective advanced: Future Paperclip and department-system growth can use business ontology sources safely.
- Included slices: architecture direction, decision, requirement, risk, quality scenario, module confidence, delivery map, active queue handoff.
- Explicit exclusions: no schema change, no runtime import, no CSV parser, no permission behavior, no Paperclip execution.
- Checkpoint cadence: one documentation/planning checkpoint.
- Stop conditions: source-of-truth files updated, future implementation candidates clear, validation is limited to docs hygiene.
- Handoff expectation: next agent can implement the source inventory/validator from this contract without rereading chat attachments.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, project memory, active mission | Integration, task closure, source-of-truth updates | Mission packet and final acceptance | Parent validation gate | PLANNED |
| Product/Requirements | Product Docs or coordinator | Owner notes, attachments, architecture docs | Requirement and acceptance language | Import foundation task contract | Source-of-truth review | PLANNED |
| Architecture | Architect or coordinator | `docs/architecture/*` | Business ontology import strategy | Architecture guardrails and mapping model | `git diff --check` | PLANNED |
| Implementation | Future builder lane | future scope | CSV validator/import contract | No runtime implementation in this task | not applicable | DEFERRED |
| QA/Test | QA/Test | requirements/risk/quality state | Validation plan | Future validator proof expectations | docs review | PLANNED |
| Security/Ops/UX | Specialist lanes as needed | security/AI boundary docs | Permission and authority guardrails | ACL-as-planning-only rule | docs review | PLANNED |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*`, planning docs | Durable state updates | Updated source-of-truth files | `git diff --check` | PLANNED |

## Context

The owner provided material describing APQC PCF Excel, APQC SIPOC Excel,
organization-chart CSV, contextual role/ACL mapping, and one-page SOP
templates. These sources are useful for CompanyCore/Roost because the product
is evolving into an organizational operating system for humans and AI agents.

The architecture already says CompanyCore is the system of record, while
Paperclip is an external API/MCP client. Therefore the imported material should
become business ontology context and validation input, not a parallel authority
model.

## Goal

Create a future-safe planning and architecture foundation for importing and
validating business operating knowledge from APQC, SIPOC, org-chart, ACL, and
SOP sources.

## Scope

Allowed files for this checkpoint:

- `docs/architecture/business-ontology-import-strategy.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/companycore-business-module-map.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/quality-attribute-scenarios.md`
- `.agents/state/risk-register.md`
- `.agents/state/delivery-map.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/next-steps.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

No runtime code, database schema, API, MCP, or UI files are in scope.

## Implementation Plan

1. Inspect current architecture and project memory for organizational OS,
   Paperclip, process, workforce, and permission boundaries.
2. Add an architecture document that classifies APQC, SIPOC, org-chart, ACL,
   and SOP inputs and maps them to current CompanyCore concepts.
3. Record an accepted decision, requirement, quality scenario, risk, delivery
   map row, and module confidence row.
4. Add queue entries for future `ONTOLOGY-001`/`ONTOLOGY-004` implementation
   without displacing protected smoke or active release gates.
5. Run docs hygiene validation.

## Autonomous Loop Evidence

### 1. Analyze Current State

- Issues: process taxonomy, responsibilities, PAEI, and ACL are accepted
  target gaps but not yet runtime features.
- Gaps: no import validator, no source inventory, no Paperclip planning packet.
- Inconsistencies: owner-provided Polish material needs English source-of-truth
  translation and encoding cleanup before repository storage.
- Architecture constraints: CompanyCore remains the source of truth; Paperclip
  remains external; permissions are enforced by API/MCP/capability/approval
  gates.

### 1a. Bootstrap Missing Project Knowledge

- Bootstrap needed: no
- Missing or template-like files: none for this scope
- Sources scanned: architecture docs, state docs, task template, attachments
- Rows created or corrected: requirement, risk, quality scenario, delivery map,
  module confidence, decision
- Assumptions recorded: external ontology sources are planning/import inputs,
  not runtime authority
- Blocking unknowns: none for planning; actual APQC/SIPOC source files and
  licensing/version details are needed before real import
- Why it was safe to continue: no runtime behavior or data mutation was made

### 2. Select One Priority Mission Objective

- Selected task: ONTOLOGY-001 planning foundation
- Priority rationale: user explicitly asked whether the material is useful and
  asked to save direction for future dense module growth.
- Why other candidates were deferred: protected production smoke and active
  runtime queues are unaffected; this task is docs/source-of-truth only.

### 3. Plan Implementation

- Files or surfaces to modify: source-of-truth docs and state ledgers only.
- Logic: record import shape, mapping rules, guardrails, and future tasks.
- Edge cases: external CSV must not grant permissions; PAEI must not become
  authorization; APQC hierarchy must not replace department accountability.

### 4. Execute Implementation

- Implementation notes: planned in this contract; runtime implementation is
  deferred.

### 5. Verify and Test

- Validation performed: docs/source review and `git diff --check`.
- Result: to be filled on completion.

### 6. Self-Review

- Simpler option considered: append only a note to project state.
- Technical debt introduced: no
- Scalability assessment: a dedicated architecture document scales better than
  scattered notes because future agents need import columns, mapping rules, and
  permission guardrails.
- Refinements made: external ACL is explicitly planning-only; Paperclip must
  consume through CompanyCore API/MCP.

### 7. Update Documentation and Knowledge

- Docs updated: architecture, planning, state ledgers, context files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria

- [x] Business ontology import strategy exists in architecture docs.
- [x] Decision, requirement, risk, quality scenario, delivery map, and module
      confidence rows reference the strategy.
- [x] Future tasks for source inventory and CSV validation are queued without
      moving runtime/protected smoke gates.
- [x] No runtime code, schema, API, MCP, or UI behavior changes are introduced.

## Success Signal

- User or operator problem: future CompanyCore/Paperclip growth needs reliable
  assumptions before many modules and departments appear.
- Expected product or reliability outcome: future agents can classify business
  process, responsibility, SOP, and ACL import work without inventing a
  parallel authority system.
- How success will be observed: future implementation starts from
  `ONTOLOGY-001`/`ONTOLOGY-004` and maps every imported row to department,
  PAEI, owner, status, blocked actions, and source IDs.
- Post-launch learning needed: yes

## Deliverable For This Stage

A planning/architecture packet that records the accepted direction and next
implementation tasks.

## Constraints

- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within planning stage
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done

- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria

- [x] The output matches documentation/planning stage.
- [x] Runtime work was not mixed in.
- [x] Risks and assumptions for later implementation are stated clearly.

## Forbidden

- runtime imports
- schema changes
- CSV-derived permissions
- Paperclip direct provider/database authority
- APQC hierarchy replacing department accountability
- SOPs becoming automation without command, approval, rollback, and evidence

## Validation Evidence

- Tests: `git diff --check` passed on 2026-05-30; `npm run architecture:status` passed with GREEN `452/761/34`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, and all gates pass `yes`.
- Manual checks: source-of-truth review
- Screenshots/logs: not applicable
- High-risk checks: permission/AI boundary documented
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: ONTOLOGY-001
- Requirements matrix updated: yes
- Requirement rows closed or changed: REQ-ONTOLOGY-001
- Quality scenarios updated: yes
- Quality scenario rows closed or changed: QA-ONTOLOGY-001
- Risk register updated: yes
- Risk rows closed or changed: RISK-ONTOLOGY-001
- Reality status: accepted

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes; no runtime integration paths were touched.
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: docs diff hygiene

## Product / Discovery Evidence

- Problem validated: yes
- User or operator affected: owner and future Paperclip/agent operators
- Existing workaround or pain: external business process sources would
  otherwise remain chat-only and unstructured.
- Smallest useful slice: architecture/planning source of truth
- Success metric or signal: future import work cites this contract
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: future import validator results

## AI Testing Evidence

- `AI_TESTING_PROTOCOL.md` reviewed: yes; runtime AI testing is not applicable because no AI behavior changed.
- Memory consistency scenarios: future Paperclip packet must preserve source IDs
- Multi-step context scenarios: future import-to-task loop must preserve owner,
  approval, and blocked action context
- Adversarial or role-break scenarios: future ACL import must not grant
  capability without API/MCP policy
- Prompt injection checks: future SOP/CSV text must be treated as data, not
  instructions
- Data leakage and unauthorized access checks: future read packets must filter
  by workspace/capability
- Result: planning guardrails recorded

## Security / Privacy Evidence

- `docs/security/secure-development-lifecycle.md` reviewed: not applicable for runtime; security/permission guardrails were documented.
- Data classification: business process, org structure, responsibility, ACL,
  SOP knowledge
- Trust boundaries: external file source -> CompanyCore import review -> API/MCP
  read packet or command route
- Permission or ownership checks: future runtime must use existing capability
  and approval gates
- Abuse cases: CSV-derived permission escalation, Paperclip direct authority,
  SOP prompt injection
- Secret handling: not applicable
- Security tests or scans: future validator/API tests
- Fail-closed behavior: future imports must be planning/read-only until
  approved command routes exist
- Residual risk: no validator exists yet

## Architecture Evidence

- Architecture source reviewed: `organizational-architecture-bridge`,
  `unified-organizational-operating-system`, `companycore-business-module-map`,
  `architecture-source-of-truth`
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no for planning; yes before runtime import scope
- Approval reference if architecture changed: DEC-049
- Follow-up architecture doc updates: completed for this planning scope

## Deployment / Ops Evidence

- Deploy impact: none
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: no
- Rollback note: revert docs/state changes if direction is superseded
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: not applicable

## Review Checklist

- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to planning/architecture scope.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated.

## Result Report

- Task summary: Captured APQC/SIPOC/org-chart/ACL/SOP material as a durable CompanyCore business-ontology import direction with Paperclip/API/MCP guardrails.
- Files changed: architecture docs, state ledgers, task board, next steps, MVP queue, and project state.
- How tested: source-of-truth review, `git diff --check`, and `npm run architecture:status`.
- What is incomplete: runtime import, source inventory, and CSV validator are future work.
- Next steps: implement `ONTOLOGY-002` source inventory/import contract and `ONTOLOGY-004` CSV validator.
- Decisions made: DEC-049

## Notes

The attached Polish notes were treated as owner-provided directional material.
Repository artifacts intentionally store the cleaned English interpretation.
