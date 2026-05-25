# Task

## Header
- ID: CC-00-002
- Title: Route Proposal Lifecycle Readback API
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CC-00-001
- Priority: P0
- Coverage Ledger Rows: CompanyCore-00-Main, Intake Route Proposal Lifecycle
- Module Confidence Rows: 00 Main / Global Intake, MCP Manifest
- Requirement Rows: REQ-CC-00-002
- Quality Scenario Rows: QA-CC-AI-INTEROP-001, QA-CC-AUDIT-001
- Risk Rows: R-CC-AI-AUTHORITY, R-CC-INTAKE-READBACK
- Iteration: 2026-05-16-CC-00-002
- Operation Mode: BUILDER
- Mission ID: COMPANYCORE-OS-00-04-08-M1
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: turn 00 Main intake route proposals into a read-only lifecycle surface that humans and AI clients can inspect without mutating providers or approving work.
- Release objective advanced: CompanyCore remains the operating system while AI remains an API/MCP client.
- Included slices: capability manifest route, HTTP readback endpoint, audit/event/task evidence join, MCP manifest exposure, API documentation, integration tests.
- Explicit exclusions: provider writes, approval decisions, UI route, pricing/legal/commercial execution.
- Checkpoint cadence: one backend/API slice with validation before moving to 04 Operations.
- Stop conditions: missing workspace scoping, provider mutation, failed migration/test, or architecture mismatch.
- Handoff expectation: next work can build 00 Main UI readback or continue to 04 Operations task model.

## Context
The approved CompanyCore direction defines 00 Main as the general company operating surface and global intake router. `POST /v1/intake/actions/propose-route` already creates proposal-only evidence. The missing slice was a read-only API that lets operators and external AI clients inspect proposal lifecycle state, related task drafts, audit logs, events, and blocked actions.

## Goal
Expose route proposal lifecycle readback through workspace-scoped HTTP API and MCP manifest without changing provider state or turning CompanyCore into an AI agent.

## Scope
- `src/auth/capabilities.ts`
- `src/modules/intake/intake.routes.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- Canonical planning and state files updated in the same mission checkpoint.

## Implementation Plan
1. Inspect the intake router, capability manifest, MCP manifest, existing tests, and API docs.
2. Add a workspace-scoped `GET /v1/intake/route-proposals` endpoint that reads existing decisions, tasks, audit logs, and events.
3. Expose the route through the existing `intake:read` capability and MCP manifest generation.
4. Extend integration tests to prove read-only lifecycle evidence after proposal creation and idempotent replay.
5. Update source-of-truth documentation and queue state.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: proposal creation existed, but operators and AI clients lacked a durable readback endpoint.
- Gaps: no lifecycle summary, no explicit evidence packet, no MCP read tool for proposals.
- Inconsistencies: route proposal action returned evidence once, but follow-up inspection required implementation knowledge.
- Architecture constraints: CompanyCore may expose read/write API operations, but must not execute autonomous AI logic internally.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: architecture docs, intake router, capability manifest, MCP manifest, API tests, API docs.
- Rows created or corrected: state rows updated after implementation.
- Assumptions recorded: proposal lifecycle state can be inferred from existing decision status plus task/audit/event evidence.
- Blocking unknowns: none.
- Why it was safe to continue: existing data model already records all required evidence.

### 2. Select One Priority Mission Objective
- Selected task: CC-00-002.
- Priority rationale: 00 Main readback is needed before richer general dashboard and agent-safe workflows.
- Why other candidates were deferred: 04 Operations and 08 Assets depend on stable shared API/UI patterns and can follow this endpoint.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: filter workspace decisions from `companycore_intake`, join related task drafts by external ID, join audit logs/events by decision ID, return read-only summary and agent packet.
- Edge cases: missing task, missing audit/event evidence, filters by status/source model/department/risk, bounded limit.

### 4. Execute Implementation
- Implementation notes: reused existing workspace auth, Prisma models, event/audit records, and adapter manifest. No new subsystem or provider path was introduced.

### 5. Verify and Test
- Validation performed: `npm run build:server`; `npm run test:api` with disposable PostgreSQL on `127.0.0.1:55498`.
- Result: passed. API test applied all 23 migrations and passed 6/6 Node tests, including the route proposal lifecycle readback assertions.

### 6. Self-Review
- Simpler option considered: return decisions only. Rejected because it would not answer lifecycle confidence, task draft, audit, and event evidence needs.
- Technical debt introduced: no.
- Scalability assessment: v1 readback uses bounded query limits and existing indexes/relations; future pagination can be added without changing response intent.
- Refinements made: shared blocked-action packet and MCP description update.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, this task contract, planning/state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `GET /v1/intake/route-proposals` is exposed under `intake:read`.
- [x] Response includes proposal, lifecycle, evidence, effects, blocked actions, summary, and read-only agent packet.
- [x] Endpoint does not acknowledge agent events, mutate providers, approve proposals, invoice, discount, delete, or execute commercial/legal actions.
- [x] MCP manifest includes a read-risk tool for `/v1/intake/route-proposals`.
- [x] Integration tests prove the endpoint after route proposal creation and idempotent replay.

## Success Signal
- User or operator problem: route proposals can be inspected later without relying on a one-time action response.
- Expected product or reliability outcome: humans and AI clients share the same read-only lifecycle evidence.
- How success will be observed: API/MCP clients can fetch proposal evidence and blocked actions with `intake:read`.
- Post-launch learning needed: yes, after the 00 Main UI consumes this endpoint.

## Deliverable For This Stage
Verified API readback endpoint and durable documentation/state evidence.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real API test path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across route proposal decision, task draft, audit log, event, and MCP manifest.
- [x] Backend error handling uses existing validation/auth wrappers.
- [x] No existing functionality is broken.
- [x] Feature works after fresh migration and test process start.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run build:server` passed; `npm run test:api` passed on disposable PostgreSQL `127.0.0.1:55498`.
- Manual checks: validation-owned PostgreSQL was stopped and port `55498` was closed after tests.
- Screenshots/logs: test output recorded in local run; no UI screenshot required for backend API slice.
- High-risk checks: route is read-only, capability-scoped, workspace-scoped, and MCP risk is `read`.
- Coverage ledger updated: yes.
- Coverage rows closed or changed: CompanyCore-00-Main route proposal readback moved to verified.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: 00 Main / Global Intake.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-CC-00-002.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: AI interoperability and audit evidence scenarios.
- Risk register updated: yes.
- Risk rows closed or changed: AI authority/readback risk reduced.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes, all 23 migrations applied to fresh PostgreSQL.
- Loading state verified: not applicable.
- Error state verified: validation schema and existing auth wrappers covered by API suite.
- Refresh/restart behavior verified: yes, test process built and started against fresh migrated database.
- Regression check performed: protected API flow passed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace-scoped operational metadata, task draft evidence, audit/event metadata.
- Trust boundaries: API key/session auth to CompanyCore HTTP API; MCP clients do not read DB directly.
- Permission or ownership checks: existing `requireAuth` and workspace-scoped Prisma filters.
- Abuse cases: provider mutation and approval/commercial/legal actions remain blocked in response and are not implemented by this route.
- Secret handling: route does not expose provider secrets, API keys, password hashes, or raw stack traces.
- Security tests or scans: API suite workspace/auth regression path.
- Fail-closed behavior: endpoint requires auth and valid capability through manifest/API key policy.
- Residual risk: future UI must preserve the same blocked-action language and avoid implying approvals happened.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`, `docs/architecture/autonomous-company-operating-system.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no.
- Approval reference if architecture changed: not applicable.
- Follow-up architecture doc updates: no architecture change; API docs/state updated.

## Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not required for this route-only slice.
- Rollback note: remove route registration, endpoint handler, docs, and test assertions if rollback is needed.
- Observability or alerting impact: route reads existing audit/event records; no new alerting.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: yes.

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
- [x] AI testing evidence is not applicable because CompanyCore is not executing AI internally.
- [x] Deployment gate evidence is attached.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.
- [x] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report
- Task summary: added verified read-only route proposal lifecycle readback API and MCP manifest exposure.
- Files changed: `src/auth/capabilities.ts`, `src/modules/intake/intake.routes.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts`, `docs/API.md`, source-of-truth state files.
- How tested: `npm run build:server`; `npm run test:api` on disposable PostgreSQL.
- What is incomplete: 00 Main UI consumption remains a follow-up.
- Next steps: continue to CC-04-002 Operations task model implementation slice.
- Decisions made: route proposals are read back through `intake:read`; all provider/approval/commercial/legal writes remain blocked.

## Notes
- Validation used a disposable local PostgreSQL data directory under `.tmp/cc-00-002-pg-data` and stopped the validation-owned process afterward.
