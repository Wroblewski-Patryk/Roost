# Task

## Header
- ID: MCP-ARCH-001
- Title: MCP Tool Discovery And Refresh Contract
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: none
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: MCP Manifest
- Requirement Rows: not applicable
- Quality Scenario Rows: MCP tool refresh reliability
- Risk Rows: stale MCP tool catalog
- Iteration: 2026-05-16 documentation iteration
- Operation Mode: BUILDER
- Mission ID: MCP-DISCOVERY-REFRESH-2026-05-16
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches this narrow documentation iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was not required for a short bounded documentation task.
- [x] Missing or template-like state tables were not bootstrapped because this task did not change runtime state.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task improves release confidence by clarifying MCP stale-tool behavior.

## Mission Block
- Mission objective: Clarify CompanyCore's MCP tool discovery and refresh assumptions so future agent runtimes know when new tools become visible.
- Release objective advanced: MCP operator setup and future tool additions have an explicit restart/reconnect contract.
- Included slices: architecture contract, bridge operations note, verification.
- Explicit exclusions: runtime code changes, new MCP notification implementation, new API routes.
- Checkpoint cadence: single-documentation checkpoint.
- Stop conditions: architecture mismatch requiring a new runtime behavior decision.
- Handoff expectation: future MCP runtime work can choose between the current restart/reconnect model and a deliberate `listChanged` implementation.

## Context

CompanyCore already treats MCP as a thin bridge over the HTTP API and exposes a
route-derived `/v1/mcp/manifest`. The missing architectural detail was how an
agent host learns about changed tool functions after a route or manifest
change.

## Goal

Document correct MCP discovery, caching, refresh, and versioning assumptions
for CompanyCore without changing runtime behavior.

## Scope

- `docs/architecture/mcp-tool-discovery-and-refresh-contract.md`
- `docs/operations/companycore-mcp-bridge.md`
- `docs/planning/mcp-tool-discovery-refresh-task-contract.md`

## Implementation Plan
1. Inspect current architecture, API, operation docs, and bridge code.
2. Verify MCP protocol expectations from official MCP documentation.
3. Add a CompanyCore architecture contract for discovery and refresh behavior.
4. Add an operations note to the bridge setup document.
5. Verify docs and commit only the scoped documentation changes.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: MCP docs did not explicitly state whether new tools appear in an active agent session.
- Gaps: Current bridge has `listChanged: false` and cached manifest behavior, but operators needed a clear restart/reconnect rule.
- Inconsistencies: No runtime inconsistency found; documentation needed to match code.
- Architecture constraints: MCP must remain a thin bridge over HTTP API with workspace, capability, approval, event, and audit boundaries.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none for this documentation slice
- Sources scanned: `docs/API.md`, `docs/architecture/system-architecture.md`, `docs/operations/companycore-mcp-bridge.md`, `docs/operations/mcp-agent-runtime-setup.md`, `src/mcp/manifest.ts`, `scripts/companycore-mcp-server.mjs`, official MCP tools and schema docs
- Rows created or corrected: none
- Assumptions recorded: Current CompanyCore bridge intentionally requires restart/reconnect after tool catalog changes.
- Blocking unknowns: none
- Why it was safe to continue: The task clarifies current behavior without changing architecture ownership or runtime code.

### 2. Select One Priority Mission Objective
- Selected task: MCP-ARCH-001
- Priority rationale: Stale MCP tool catalogs affect agent reliability and operator expectations.
- Why other candidates were deferred: Runtime `listChanged` support is a separate implementation task.

### 3. Plan Implementation
- Files or surfaces to modify: architecture contract and MCP bridge operation docs.
- Logic: Document current restart/reconnect behavior and future dynamic refresh option.
- Edge cases: Missing tool due to scopes, cached bridge manifest, cached agent host registry, breaking schema changes.

### 4. Execute Implementation
- Implementation notes: Added a dedicated architecture contract and linked it from bridge operations.

### 5. Verify and Test
- Validation performed: Documentation inspection and `git diff --check`.
- Result: Documentation is consistent with current bridge code and MCP protocol references.

### 6. Self-Review
- Simpler option considered: Add a short note only to operations docs.
- Technical debt introduced: no
- Scalability assessment: A dedicated contract is easier to reuse for future dynamic refresh implementation.
- Refinements made: Separated current behavior from future `notifications/tools/list_changed` support.

### 7. Update Documentation and Knowledge
- Docs updated: architecture and operations MCP docs.
- Context updated: task contract records evidence.
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] Current bridge cache and `listChanged: false` behavior is documented.
- [x] Operators know to restart/reconnect bridge and agent host after tool catalog changes.
- [x] Future dynamic refresh path using `notifications/tools/list_changed` is documented as an explicit implementation option.

## Success Signal
- User or operator problem: Agent operators do not know whether newly added MCP functions are visible immediately.
- Expected product or reliability outcome: MCP tool additions have predictable rollout and troubleshooting behavior.
- How success will be observed: Future MCP tool changes cite this contract and run refresh/smoke checks.
- Post-launch learning needed: no

## Deliverable For This Stage

Verified documentation and a scoped commit.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors: not applicable, docs-only.
- [x] Feature works manually through the real UI, API, CLI, or operator path: not applicable, docs-only.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers: documented for MCP discovery flow.
- [x] Backend and UI/client error handling exists where applicable: documented missing-tool recovery.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, or navigation refresh where applicable: restart/reconnect rule documented.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded when applicable.
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
- Tests: `git diff --check`
- Manual checks: inspected current bridge `initialize`, cached manifest, `tools/list`, and manifest generation code.
- Screenshots/logs: not applicable
- High-risk checks: verified this is documentation-only and does not expose new tools or capabilities.
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: none
- Module confidence ledger updated: not applicable
- Module confidence rows closed or changed: none
- Requirements matrix updated: not applicable
- Requirement rows closed or changed: none
- Quality scenarios updated: not applicable
- Quality scenario rows closed or changed: none
- Risk register updated: not applicable
- Risk rows closed or changed: none
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: documented from current bridge code
- Regression check performed: docs-only diff check

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: agent runtime operator and future MCP tool builder
- Existing workaround or pain: unclear whether active sessions see newly added tools
- Smallest useful slice: document current restart/reconnect model and future dynamic refresh path
- Success metric or signal: future MCP tool rollout includes bridge restart/reconnect or deliberate `listChanged` support
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: no

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable
- Feedback item IDs: direct user request on 2026-05-16
- Feedback accepted: clarify MCP architecture assumptions and commit the docs
- Feedback needs clarification: none
- Feedback conflicts: none
- Feedback deferred or rejected: runtime implementation deferred because the user asked for architecture documentation
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: agent runtime discovers expected MCP tools
- SLI: expected scoped tools visible after bridge restart/reconnect
- SLO: not defined for docs-only task
- Error budget posture: not applicable
- Health/readiness check: `npm run mcp:smoke` documented as the smoke path
- Logs, dashboard, or alert route: not applicable
- Smoke command or manual smoke: documented, not run because no runtime changed
- Rollback or disable path: revert docs commit

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
