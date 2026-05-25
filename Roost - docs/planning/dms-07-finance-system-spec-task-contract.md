# DMS-07-001 Finance System Spec Task Contract

## Header

- ID: DMS-07-001
- Title: Finance system spec
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs + Backend Builder + Security
- Depends on: DMS-MONEY-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: DMS-07-001, CCORE-DM-024
- Requirement Rows: REQ-DMS-07-001
- Quality Scenario Rows: QA-DMS-07-001
- Risk Rows: RISK-DMS-FINANCE-001
- Iteration: DMS finance planning checkpoint
- Operation Mode: ARCHITECT
- Mission ID: DMS-V1-FINANCE-PLANNING
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the architecture/planning nature of the task.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was considered through the bounded mission scope.
- [x] Missing or template-like state tables were not encountered.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by blocking unsafe finance automation before runtime work.

## Mission Block

- Mission objective: Define the first safe Finance system contract for V1
  before backend or web finance implementation.
- Release objective advanced: V1 department systems can proceed toward
  pricing, discounts, current-client work, and invoice-readiness without unsafe
  finance writes.
- Included slices: Finance board spec, backend read-model target, Paperclip
  packet, blocked actions, security guardrails, DMS-07-002 handoff.
- Explicit exclusions: no runtime route, no migration, no invoice/payment
  command, no discount write, no provider integration, no autonomous pricing.
- Checkpoint cadence: one documentation checkpoint and commit.
- Stop conditions: unresolved owner decision that would approve financial
  writes; source mismatch with DMS architecture.
- Handoff expectation: DMS-07-002 can implement a read-only finance context
  from this spec.

## Context

The completed money inventory found multiple pricing sources and conflicts:
`499 CHF/month`, `1500 CHF setup + 150 CHF/month`, pure subscription analysis,
`150 CHF/hour`, COGS assumptions, historical PLN prices, and a required current
client `100%` discount case. Finance is high risk, so V1 needs a read-only
contract before web or backend implementation.

## Goal

Create a detailed Finance Management System spec that defines the management
board, read model, owner decisions, agent packet, and safety boundaries for
DMS-07-002 and later Finance web work.

## Scope

Allowed files:

- `docs/planning/dms-07-finance-system-spec.md`
- `docs/planning/dms-07-finance-system-spec-task-contract.md`
- `.agents/state/*` source-of-truth ledgers
- `.codex/context/*`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/v1-department-systems-global-implementation-plan.md`
- `.agents/core/project-memory-index.md`

No application runtime files are in scope.

## Implementation Plan

1. Inspect DMS finance architecture, pricing inventory, planning queue, and
   current web/backend finance references.
2. Draft a read-only Finance system spec with explicit blocked actions.
3. Define the first backend route contract and response shape for DMS-07-002.
4. Update canonical planning, requirement, risk, quality, delivery, module
   confidence, task board, project state, and memory files.
5. Run diff hygiene and commit/push this planning checkpoint.

## Autonomous Loop Evidence

### 1. Analyze Current State

- Issues: finance source facts conflict and should not be flattened.
- Gaps: no Finance read model, no invoice/payment command contract, no
  discount/commercial exception runtime model yet.
- Inconsistencies: historical PLN prices and Swiss CHF strategy sources must
  not become one active price list.
- Architecture constraints: read models before write models; finance/legal/ads
  writes require explicit contracts.

### 1a. Bootstrap Missing Project Knowledge

- Bootstrap needed: no.
- Missing or template-like files: none encountered.
- Sources scanned: DMS blueprint, money inventory, global plan, task board,
  project memory, current code references.
- Rows created or corrected: REQ-DMS-07-001, QA-DMS-07-001,
  RISK-DMS-FINANCE-001, CCORE-DM-024, DMS-07-001.
- Assumptions recorded: the first implementation should be read-only.
- Blocking unknowns: owner still must choose active pricing policy and current
  client discount reason.
- Why it was safe to continue: planning can preserve those decisions as
  `needs_owner_decision` without approving writes.

### 2. Select One Priority Mission Objective

- Selected task: DMS-07-001 Finance system spec.
- Priority rationale: it is first in `NOW` and blocks safe Sales/Finance
  runtime work.
- Why other candidates were deferred: DMS-03-005 depends on the same money
  context and should use this finance spec vocabulary.

### 3. Plan Implementation

- Files or surfaces to modify: planning docs and state files only.
- Logic: define board zones, read packet shape, allowed actions, blocked
  actions, owner decisions, and DMS-07-002 handoff.
- Edge cases: `100%` discount, conflicting pricing models, inaccessible
  source document, historical PLN pricing, missing owner approval.

### 4. Execute Implementation

- Implementation notes: Added `docs/planning/dms-07-finance-system-spec.md`
  as the canonical Finance planning handoff.

### 5. Verify and Test

- Validation performed: source review and `git diff --check`.
- Result: passed.

### 6. Self-Review

- Simpler option considered: only add a short queue note. Rejected because
  finance needs explicit safety and read-model contracts before runtime work.
- Technical debt introduced: no.
- Scalability assessment: the spec keeps Finance as a projection over shared
  CompanyCore modules rather than a separate mini-app.
- Refinements made: separated allowed read/proposal actions from blocked
  invoice/payment/discount actions.

### 7. Update Documentation and Knowledge

- Docs updated: Finance spec, task board, next commits, global implementation
  plan, project memory, project state, delivery map, requirement matrix,
  quality scenarios, risk register, module confidence.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria

- [x] The Finance spec defines the management board and first safe web shape.
- [x] The backend read-model target is explicit enough for DMS-07-002.
- [x] Pricing conflicts, hourly value, and `100%` discount are represented
  without approving writes.
- [x] Paperclip guardrails are explicit.
- [x] Canonical planning and state files are synchronized.

## Success Signal

- User or operator problem: the owner needs Finance to manage pricing, labor
  value, discounts, invoice readiness, and current-client context without
  unsafe automation.
- Expected product or reliability outcome: DMS-07-002 can implement read-only
  finance context safely.
- How success will be observed: future backend task uses this spec directly
  and no finance write is added without a command contract.
- Post-launch learning needed: yes, after current-client and archived-client
  flows produce evidence.

## Deliverable For This Stage

A planning-stage Finance system spec and synchronized source-of-truth updates.

## Constraints

- use existing systems and approved mechanisms
- do not introduce runtime structures in a planning task
- do not approve invoice/payment/discount writes
- keep Paperclip in proposal mode for finance
- repository artifacts must be written in English

## Definition of Done

- [x] Code builds without errors: not applicable, no runtime changes.
- [x] Feature works manually through the real UI, API, CLI, or operator path:
  not applicable for planning.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers: not applicable until
  DMS-07-002.
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

- new runtime systems
- invoice/payment command implementation
- discount write implementation
- autonomous pricing
- provider payment mutation

## Validation Evidence

- Tests: `git diff --check`.
- Manual checks: source review of DMS blueprint, money inventory, global plan,
  current task board, and finance code references.
- Screenshots/logs: not applicable.
- High-risk checks: finance actions are explicitly blocked.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: DMS-07-001; CCORE-DM-024.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-DMS-07-001.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: QA-DMS-07-001.
- Risk register updated: yes.
- Risk rows closed or changed: RISK-DMS-FINANCE-001.
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: specified for future `GET /v1/finance/context`.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: documentation/source-of-truth diff hygiene.

## Product / Discovery Evidence

- Problem validated: yes.
- User or operator affected: owner/operator and Paperclip-supervised agents.
- Existing workaround or pain: pricing, discounts, and current-client work are
  scattered across Drive/ClickUp/context.
- Smallest useful slice: planning spec before read-only backend implementation.
- Success metric or signal: DMS-07-002 can implement a safe read model.
- Feature flag, staged rollout, or disable path: not applicable.
- Post-launch feedback or metric check: yes.

## User Feedback Evidence

- `docs/governance/user-feedback-loop.md` reviewed: not applicable.
- Feedback item IDs: user feedback from 2026-05-16 captured in DMS-MONEY-001.
- Feedback accepted: `100%` discount must be represented explicitly.
- Feedback needs clarification: active pricing model and discount reason.
- Feedback conflicts: none.
- Feedback deferred or rejected: autonomous finance writes deferred.
- Active task changed by feedback: yes.
- New task created from feedback: DMS-07-002 and DMS-03-005 remain queued.
- Design memory updated: not applicable.
- Learning journal updated: not applicable.

## Reliability / Observability Evidence

- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: future finance read context.
- SLI: read route returns source-backed pricing context without mutation.
- SLO: not applicable until runtime.
- Error budget posture: not applicable.
- Health/readiness check: not applicable.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: not applicable.
- Rollback or disable path: revert planning commit before runtime work starts.

## AI Testing Evidence

- `AI_TESTING_PROTOCOL.md` reviewed: yes.
- Memory consistency scenarios: future Paperclip packet must preserve source
  conflict state.
- Multi-step context scenarios: future agent reads price conflict, proposes
  owner decision task, and does not quote.
- Adversarial or role-break scenarios: future tests must reject autonomous
  invoice/payment/discount requests.
- Prompt injection checks: future finance source ingestion must not treat
  source text as authority.
- Data leakage and unauthorized access checks: future route must be
  workspace-scoped and capability-gated.
- Result: requirements recorded for future runtime work.

## Security / Privacy Evidence

- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: commercial, client, pricing, payment-adjacent.
- Trust boundaries: owner, backend API, Paperclip/MCP, future providers.
- Permission or ownership checks: future `finance:read` route must be
  workspace-scoped.
- Abuse cases: agent chooses price, applies discount, sends invoice, marks
  payment complete.
- Secret handling: no provider payment credentials in read packets.
- Security tests or scans: future DMS-07-002 API tests required.
- Fail-closed behavior: missing/conflicting source facts block readiness.
- Residual risk: active price policy and discount reason still require owner
  decision.

## Architecture Evidence

- Architecture source reviewed:
  `docs/architecture/department-management-systems-v1-blueprint.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: yes, before active pricing policy and discount
  reason are finalized.
- Approval reference if architecture changed: not applicable.
- Follow-up architecture doc updates: not needed; planning spec extends active
  plan.

## UX/UI Evidence

- Design source type: not applicable.
- Design source reference: shared department shell and DMS blueprint.
- Canonical visual target: none.
- Fidelity target: structurally_faithful.
- Evidence-driven UX review used: no.
- Primary user question answered within 3 seconds: specified for future
  Finance board.
- Next action visibility: specified.
- Blocked-state visibility: specified.
- Existing shared pattern reused: DepartmentManagementShell.
- New shared pattern introduced: no.
- Surface strategy checked: mobile, tablet, desktop.
- State checks: loading, empty, conflict, blocked, ready for review, verified
  source.
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

- Task summary: Added the DMS-07 Finance system spec and safety handoff for
  read-only pricing, hourly-value, commercial exception, invoice-readiness,
  and Paperclip packet work.
- Files changed: planning docs and state/source-of-truth files.
- How tested: source review and `git diff --check`.
- What is incomplete: runtime `GET /v1/finance/context`, Finance web board,
  discount read model, current-client capture, and invoice/payment command
  contract remain future tasks.
- Next steps: DMS-03-005 discount/commercial exception read model or DMS-07-002
  price-list/hourly-value read model.
- Decisions made: Finance V1 remains read-only/proposal-only until explicit
  command contracts exist.

## Notes

Owner decisions remain required for the active pricing policy, `150 CHF/hour`
role meaning, current-client discount reason, and future invoice/payment
provider.
