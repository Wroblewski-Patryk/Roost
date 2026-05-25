# Task

## Header
- ID: CC-08-002
- Title: Assets Context Read API
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CC-08-001, CC-04-002
- Priority: P0
- Coverage Ledger Rows: CompanyCore-08-Assets
- Module Confidence Rows: 08 Assets / Context Read Packet
- Requirement Rows: REQ-CC-08-002
- Quality Scenario Rows: QA-CC-08-001
- Risk Rows: RISK-CC-08-001
- Iteration: 2026-05-16-CC-08-002
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
- Mission objective: expose `08 Assets` as a read-only organizational memory packet over existing Drive, Resource, and knowledge foundations.
- Release objective advanced: complete the first runtime API loop for `00 Main -> 04 Operations -> 08 Assets`.
- Included slices: HTTP endpoint, capability/MCP exposure, profile scopes, API docs, integration assertions, no-mutation proof.
- Explicit exclusions: provider writes, sync-scope expansion, delete/move/share, legal/commercial edits, embedded AI processing, UI consumption.
- Checkpoint cadence: one backend/API slice with full API regression.
- Stop conditions: workspace leak, unsafe provider authority, fake AI readiness, failed migration/test.
- Handoff expectation: next work can implement shared-primitives UI consumption for `00`, `04`, and `08`.

## Context
`CC-08-001` defined Assets as the company memory layer, not a duplicate Drive explorer. Existing foundations already include Google Drive files/folders, content snapshots, Resource records, Knowledge Roots, Knowledge Items, operating-area scope, and MCP/Drive read contracts.

## Goal
Add a protected read-only `GET /v1/assets/context` packet with resource taxonomy, AI-readiness labels, relations, cleanup signals, and blocked provider actions.

## Scope
- `src/modules/assets/assets.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- Canonical planning and state files updated in the same checkpoint.

## Implementation Plan
1. Inspect current Drive/resource/knowledge models and Assets spec.
2. Add `assets:read` and mount a read-only Assets router.
3. Build the context packet over Drive files, snapshots, Resource records, Knowledge Roots, and Knowledge Items.
4. Add integration tests for readiness labels, relations, workspace isolation, no mutation, MCP exposure, and blocked actions.
5. Update docs and state ledgers.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Assets had Drive and Resource foundations but no single agent/human context packet.
- Gaps: no unified resource taxonomy, readiness labels, cleanup summary, or blocked provider action packet.
- Inconsistencies: Drive readiness could be mistaken for embedded AI if labels were not explicit.
- Architecture constraints: CompanyCore is the system; AI-readiness means external API/MCP compatibility only.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `cc-08-001` spec, Prisma schema, Drive/operating-model routes, capabilities, MCP manifest, API tests.
- Rows created or corrected: state rows updated after implementation.
- Assumptions recorded: readiness can be derived from metadata, content snapshot, summary, relation, access, and scope evidence.
- Blocking unknowns: none.
- Why it was safe to continue: existing models already contain enough data for a read-only v1 packet.

### 2. Select One Priority Mission Objective
- Selected task: CC-08-002.
- Priority rationale: Assets is the third leg of the owner-approved `00 -> 04 -> 08` loop.
- Why other candidates were deferred: UI consumption should follow after the API packet is verified.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: map Drive files and Resource records into one resource packet, derive readiness labels, include Knowledge Roots/Items, summarize cleanup and AI-readiness, expose blocked provider actions.
- Edge cases: unassigned files, missing descriptions, missing snapshots, restricted resources, workspace isolation, no mutation.

### 4. Execute Implementation
- Implementation notes: reused Drive/Resource/Knowledge tables, operating-area scope, existing auth/capability/MCP manifest generation, and current API test suite.

### 5. Verify and Test
- Validation performed: `npm run build:server`; `npm run test:api` with disposable PostgreSQL on `127.0.0.1:55500`.
- Result: passed. Validation-owned PostgreSQL was stopped and port `55500` closed.

### 6. Self-Review
- Simpler option considered: expose raw Drive files only. Rejected because Assets must include Resource and knowledge context plus AI-readiness and blocked actions.
- Technical debt introduced: no.
- Scalability assessment: v1 uses bounded query limits and can later add pagination/detail routes without changing the packet contract.
- Refinements made: explicit `assets:read` capability and profile scopes keep Assets separate from Drive write authority.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, this task contract, planning/state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `GET /v1/assets/context` is exposed under `assets:read`.
- [x] Response includes Drive files/folders, content snapshots, Resource records, Knowledge Roots, Knowledge Items, taxonomy, readiness labels, relations, summary, and read-only agent packet.
- [x] AI readiness is represented as external-client compatibility only.
- [x] Endpoint blocks delete/move/share, sync expansion, legal/commercial edits, restricted context use, and provider writes.
- [x] API tests prove workspace isolation, no mutation, MCP read-risk exposure, and profile availability.

## Success Signal
- User or operator problem: company knowledge/resources can be inspected as one memory layer without using raw Drive screens.
- Expected product or reliability outcome: future `08 Assets` UI and AI/MCP clients have one safe read packet.
- How success will be observed: API/MCP clients can fetch Assets context through `assets:read`.
- Post-launch learning needed: yes, after UI consumption and real owner cleanup workflows.

## Deliverable For This Stage
Verified read-only Assets context API and durable source-of-truth evidence.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API test path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across Drive files, snapshots, resources, knowledge roots/items, capability profiles, and MCP manifest.
- [x] Backend error handling exists through existing validation/auth wrappers.
- [x] No existing functionality is broken.
- [x] Feature works after fresh migration and test process start.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run build:server`; `npm run test:api` on disposable PostgreSQL `127.0.0.1:55500`.
- Manual checks: validation-owned PostgreSQL was stopped and port `55500` was closed after tests.
- High-risk checks: route is read-only, capability-scoped, workspace-scoped, and MCP risk is `read`.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Quality scenarios updated: yes.
- Risk register updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes.
- Loading state verified: not applicable.
- Error state verified: validation schema and existing auth wrappers covered by API suite.
- Refresh/restart behavior verified: yes.
- Regression check performed: protected API flow passed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace-scoped resource metadata, Drive metadata, content snapshot summaries, knowledge records.
- Trust boundaries: API/MCP clients call CompanyCore HTTP routes; no direct DB/provider access.
- Permission or ownership checks: existing auth plus workspace-scoped filters.
- Abuse cases: delete/move/share, sync expansion, legal/commercial edits, restricted context use, and provider writes remain blocked.
- Secret handling: route does not expose provider secrets, API keys, password hashes, or raw stack traces.
- Fail-closed behavior: endpoint requires auth and `assets:read` for service clients.
- Residual risk: UI must preserve readiness and blocked-action language.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/autonomous-company-operating-system.md`, `docs/planning/cc-08-001-assets-resource-system-spec.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no.
- Follow-up architecture doc updates: no architecture change; API/state updated.

## Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not required for route-only local slice.
- Rollback note: remove router mount, route, capability, profile scopes, docs, and test assertions if rollback is needed.
- Observability or alerting impact: none.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Current stage is declared and respected.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.

## Result Report
- Task summary: added verified read-only Assets context packet API.
- Files changed: `src/modules/assets/assets.routes.ts`, `src/app.ts`, `src/auth/capabilities.ts`, `src/auth/agent-key-profiles.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts`, `docs/API.md`, source-of-truth state files.
- How tested: `npm run build:server`; `npm run test:api` on disposable PostgreSQL.
- What is incomplete: UI consumption remains a future task.
- Next steps: implement UI adoption for `00`, `04`, and `08` using shared primitives.
- Decisions made: Assets context is separate `assets:read`; AI readiness is metadata for external clients, not embedded AI.
