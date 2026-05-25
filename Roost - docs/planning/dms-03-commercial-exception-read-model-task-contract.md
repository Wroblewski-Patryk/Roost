# DMS-03-005 Commercial Exception Read Model Task Contract

## Header

- ID: DMS-03-005
- Title: Discount/commercial exception read model
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs + Backend Builder + Security
- Depends on: DMS-MONEY-001, DMS-07-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: DMS-03-005, CCORE-DM-025
- Requirement Rows: REQ-DMS-03-005
- Quality Scenario Rows: QA-DMS-03-005
- Risk Rows: RISK-DMS-FINANCE-001
- Iteration: DMS commercial exception planning checkpoint
- Operation Mode: ARCHITECT
- Mission ID: DMS-V1-COMMERCIAL-EXCEPTION-PLANNING
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the architecture/planning nature of the task.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in the current mission wave.
- [x] `.agents/core/mission-control.md` was considered through the bounded mission scope.
- [x] Missing or template-like state tables were not encountered.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by defining the safe discount model before runtime writes.

## Mission Block

- Mission objective: Define the read-only commercial exception model for
  discounts, including current-client `100%` discount handling.
- Release objective advanced: Sales/Finance can represent discounts and
  pro-bono work as evidence-backed records before invoice/payment or discount
  writes exist.
- Included slices: read API contract, packet fields, source derivation rules,
  status vocabulary, Paperclip guardrails, current-client packet, future
  implementation handoff.
- Explicit exclusions: no runtime API, no migration, no web panel, no discount
  write, no invoice/payment command.
- Checkpoint cadence: one documentation checkpoint and commit.
- Stop conditions: any need to approve a discount, issue invoice, or mutate
  provider/payment/deal value state.
- Handoff expectation: DMS-03-005A can implement
  `GET /v1/commercial-exceptions` from this spec.

## Context

The owner needs a current client with a final `100%` discount to be represented
inside CompanyCore. Existing CompanyCore has clients, deals, tasks, approvals,
decisions, notes, interactions, risks, intake, and agent events, but no
approved discount write model. This task defines the safe read layer first.

## Goal

Create a planning-stage contract for a read-only commercial exception model
that represents discounts, pro-bono work, and `100%` discounts with source
evidence, owner decision state, blocked actions, and Paperclip-safe context.

## Scope

Allowed files:

- `docs/planning/dms-03-commercial-exception-read-model-spec.md`
- `docs/planning/dms-03-commercial-exception-read-model-task-contract.md`
- `.agents/state/*` source-of-truth ledgers
- `.codex/context/*`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/v1-department-systems-global-implementation-plan.md`
- `.agents/core/project-memory-index.md`

No runtime files are in scope.

## Implementation Plan

1. Inspect Finance spec, money inventory, and current backend foundations.
2. Define read-only route shape and commercial exception packet.
3. Define current-client `100%` discount requirements and blocked actions.
4. Define future backend and web handoff.
5. Update canonical state and validation evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State

- Issues: no durable commercial exception read model exists yet.
- Gaps: discounts can appear in approvals, notes, tasks, or Paperclip events,
  but no unified packet preserves value, reason, approval, and blockers.
- Inconsistencies: a zero final amount could be mistaken for zero value.
- Architecture constraints: no invoice/payment/discount writes before command
  contracts.

### 1a. Bootstrap Missing Project Knowledge

- Bootstrap needed: no.
- Missing or template-like files: none encountered.
- Sources scanned: DMS money inventory, DMS-07 Finance spec, DMS blueprint,
  Prisma source search for clients, deals, tasks, approvals, decisions, notes,
  interactions, and risks.
- Rows created or corrected: REQ-DMS-03-005, QA-DMS-03-005, DMS-03-005,
  CCORE-DM-025.
- Assumptions recorded: first implementation should derive candidates from
  existing sources and remain read-only.
- Blocking unknowns: real current-client identity, gross value, reason, and
  owner approval are not yet captured.
- Why it was safe to continue: the spec marks missing facts as
  `needs_owner_decision` or `needs_source`.

### 2. Select One Priority Mission Objective

- Selected task: DMS-03-005 Discount/commercial exception read model.
- Priority rationale: it is first in `NOW` after DMS-07-001 and directly
  supports the user-requested `100%` discount case.
- Why other candidates were deferred: DMS-07-002 finance context can reuse
  this exception vocabulary after it exists.

### 3. Plan Implementation

- Files or surfaces to modify: planning docs and state files.
- Logic: define read route, packet fields, derivation rules, status rules,
  guardrails, and implementation handoff.
- Edge cases: missing client, missing value, missing reason, source-only
  proposals, `100%` discount, historical/archive exceptions.

### 4. Execute Implementation

- Implementation notes: Added the commercial exception read model spec and
  task contract.

### 5. Verify and Test

- Validation performed: source review and `git diff --check`.
- Result: passed.

### 6. Self-Review

- Simpler option considered: fold exceptions into the Finance spec only.
  Rejected because Sales, Relationships, Finance, Executive, and Paperclip all
  need a shared exception packet.
- Technical debt introduced: no.
- Scalability assessment: keeps discounts as derived read context before
  deciding whether a persisted model is necessary.
- Refinements made: added explicit `needs_source` and blocked action rules.

### 7. Update Documentation and Knowledge

- Docs updated: commercial exception spec, task board, next commits, global
  plan, project memory, project state, delivery map, requirement matrix,
  quality scenarios, module confidence.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria

- [x] The spec defines `GET /v1/commercial-exceptions` as a protected read-only
  target.
- [x] The `100%` discount packet preserves gross value, discount, final value,
  reason, approval, and learning context.
- [x] Missing details are represented as `needs_source` or
  `needs_owner_decision`.
- [x] Paperclip guardrails and blocked finance actions are explicit.
- [x] Canonical planning and state files are synchronized.

## Success Signal

- User or operator problem: the owner needs free or discounted work to remain
  commercially visible and learnable.
- Expected product or reliability outcome: future backend can represent the
  current-client discount safely before invoice/payment work.
- How success will be observed: DMS-03-005A implements the read route and
  tests `100%` discount shape.
- Post-launch learning needed: yes, after real current-client capture and
  delivery feedback.

## Deliverable For This Stage

A planning-stage commercial exception read model spec and synchronized
source-of-truth updates.

## Constraints

- use existing systems and approved mechanisms
- do not implement runtime behavior in this planning task
- do not approve or apply discounts
- do not create invoice or payment behavior
- keep Paperclip proposal-only
- repository artifacts must be written in English

## Definition of Done

- [x] Code builds without errors: not applicable, no runtime changes.
- [x] Feature works manually through the real UI, API, CLI, or operator path:
  not applicable for planning.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers: specified for future
  DMS-03-005A.
- [x] Backend and UI/client error handling exists where applicable: specified
  for future implementation.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, or navigation refresh where
  applicable: not applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are
  recorded where applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria

- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden

- discount writes
- invoice/payment writes
- autonomous commercial decisions
- fake gross value or client data
- source mutation during read

## Validation Evidence

- Tests: `git diff --check`.
- Manual checks: source review of DMS money inventory, Finance spec, DMS
  blueprint, and Prisma source search.
- Screenshots/logs: not applicable.
- High-risk checks: blocked actions are explicit.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: DMS-03-005, CCORE-DM-025.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-DMS-03-005.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: QA-DMS-03-005.
- Risk register updated: existing RISK-DMS-FINANCE-001 continues to mitigate.
- Risk rows closed or changed: RISK-DMS-FINANCE-001 referenced.
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: specified for future
  `GET /v1/commercial-exceptions`.
- DB schema and migrations verified: current source reviewed; migration not
  approved in this stage.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: documentation/source-of-truth diff hygiene.

## Product / Discovery Evidence

- Problem validated: yes.
- User or operator affected: owner/operator, Sales, Finance, Paperclip.
- Existing workaround or pain: discount context is scattered across Drive,
  ClickUp, chat, tasks, notes, and approvals.
- Smallest useful slice: planning spec before read-only backend implementation.
- Success metric or signal: future route returns correct `100%` packet.
- Feature flag, staged rollout, or disable path: not applicable.
- Post-launch feedback or metric check: yes.

## User Feedback Evidence

- `docs/governance/user-feedback-loop.md` reviewed: not applicable.
- Feedback item IDs: user feedback from 2026-05-16 captured in DMS-MONEY-001.
- Feedback accepted: current-client `100%` discount must exist as real
  commercial context.
- Feedback needs clarification: client identity, gross value, discount reason,
  and owner approval evidence.
- Feedback conflicts: none.
- Feedback deferred or rejected: invoice/payment and discount writes deferred.
- Active task changed by feedback: yes.
- New task created from feedback: DMS-03-006 current-client capture flow.
- Design memory updated: not applicable.
- Learning journal updated: not applicable.

## Reliability / Observability Evidence

- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: future exception read context.
- SLI: read route returns source-backed exception rows without mutation.
- SLO: not applicable until runtime.
- Error budget posture: not applicable.
- Health/readiness check: not applicable.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: not applicable.
- Rollback or disable path: revert planning commit before runtime work starts.

## AI Testing Evidence

- `AI_TESTING_PROTOCOL.md` reviewed: yes.
- Memory consistency scenarios: future Paperclip packet must preserve missing
  facts and owner-decision state.
- Multi-step context scenarios: future agent reads candidate, proposes missing
  data task, and does not apply discount.
- Adversarial or role-break scenarios: future API/MCP tests must block
  autonomous discount, invoice, and payment actions.
- Prompt injection checks: source text cannot approve a commercial exception.
- Data leakage and unauthorized access checks: future route must be
  workspace-scoped and capability-gated.
- Result: requirements recorded for future runtime work.

## Security / Privacy Evidence

- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: commercial, client, finance-adjacent.
- Trust boundaries: owner, backend API, Paperclip/MCP, future finance provider.
- Permission or ownership checks: future read route must be workspace-scoped.
- Abuse cases: agent applies discount, changes deal value, sends invoice, or
  treats prompt text as approval.
- Secret handling: no provider secrets in exception packets.
- Security tests or scans: future API tests required.
- Fail-closed behavior: missing source facts block invoice readiness.
- Residual risk: real current-client details still need owner capture.

## Architecture Evidence

- Architecture source reviewed:
  `docs/architecture/department-management-systems-v1-blueprint.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: yes, before current-client exception is
  approved.
- Approval reference if architecture changed: not applicable.
- Follow-up architecture doc updates: not needed.

## UX/UI Evidence

- Design source type: not applicable.
- Design source reference: shared department shell and DMS blueprint.
- Canonical visual target: none.
- Fidelity target: structurally_faithful.
- Evidence-driven UX review used: no.
- Primary user question answered within 3 seconds: specified for future Sales
  and Finance panels.
- Next action visibility: specified.
- Blocked-state visibility: specified.
- Existing shared pattern reused: DepartmentManagementShell.
- New shared pattern introduced: no.
- Surface strategy checked: mobile, tablet, desktop.
- State checks: loading, empty, blocked, needs decision, approved.
- Responsive checks: specified for future web task.
- Accessibility checks: specified for future web task.
- Parity evidence: not applicable.

## Deployment / Ops Evidence

- Deploy impact: none.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not applicable.
- Rollback note: revert planning commit.
- Observability or alerting impact: none.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Review Checklist

- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to task nature.
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
- [x] Docs or context were updated because repository truth changed.
- [x] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report

- Task summary: Added the commercial exception read model spec for discounts,
  pro-bono work, and `100%` discount handling.
- Files changed: planning docs and state/source-of-truth files.
- How tested: source review and `git diff --check`.
- What is incomplete: runtime `GET /v1/commercial-exceptions`, Sales/Finance
  web consumption, current-client capture flow, and invoice/payment command
  contracts remain future tasks.
- Next steps: implement DMS-03-005A backend read API or DMS-07-002 Finance
  context.
- Decisions made: commercial exceptions remain read-only/proposal-only until
  explicit write contracts exist.

## Notes

The current client still needs real identity, work description, gross value,
reason category, and owner approval before invoice-readiness can move out of
blocked state.
