# Task

## Header
- ID: LUC-1923
- Title: Bind Product Map deployment, rollback, smoke, and monitoring prerequisites
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Ops/Release (09 DRE)
- Depends on: [LUC-1832](/LUC/issues/LUC-1832), [LUC-1920](/LUC/issues/LUC-1920), [LUC-2080](/LUC/issues/LUC-2080)
- Priority: P0
- Coverage Ledger Rows: PMAP-REL-G01 through PMAP-REL-G08
- Module Confidence Rows: Product Map protected release preflight
- Requirement Rows: REQ-LUC-1923-001
- Quality Scenario Rows: QA-LUC-1923-001
- Risk Rows: RISK-LUC-1923-001
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: LUC-1923-PRODUCT-MAP-PREFLIGHT
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches iteration 1.
- [x] The task is aligned with repository architecture and release truth.
- [x] Project memory, mission control, responsibility lanes, deployment gate, and operations contracts were reviewed.
- [x] Affected confidence, requirement, quality, and risk rows were identified.

## Mission Block
- Mission objective: publish one fail-closed entry packet for the future Product Map release.
- Release objective advanced: make production promotion reproducible without granting release authority.
- Included slices: source/target baseline, Paperclip owner binding, candidate and capacity gates, rollback, smoke, monitoring, ownership, and state synchronization.
- Explicit exclusions: code implementation, push, deploy, restart, configuration mutation, protected smoke, secret handling, and production writes.
- Checkpoint cadence: baseline, packet publication, focused verification, source-control closure, Paperclip disposition.
- Stop conditions: any secret exposure, production mutation, target ambiguity, architecture conflict, or unrelated dirty work.
- Handoff expectation: [LUC-1910](/LUC/issues/LUC-1910) receives an inspectable preflight and remains protected until it supplies the exact candidate and independent gates.

## Responsibility Lanes

| Lane | Owner | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- |
| Coordinator / Ops | 09 DRE | Integrated protected-release packet and final issue disposition | repository, Coolify, public-health, docs, and git readback | VERIFIED |
| Product/Implementation | [LUC-1910](/LUC/issues/LUC-1910) owner / EDL | Future exact consumer candidate | independent implementation evidence | DEFERRED TO RELEASE PARENT |
| QA/Security | QVE/TAE and SPA/CLO | Future browser, compatibility, authorization, and minimization proof | evidence tied to candidate SHA | DEFERRED TO RELEASE PARENT |
| Documentation/Memory | 09 DRE in this bounded docs lane | canonical ops packet and state links | focused docs/diff checks | VERIFIED |

Delegation was not used: this heartbeat is one bounded DRE documentation and
read-only evidence lane. The implementation, QA, and security responsibilities
already have separate owners and are prerequisites rather than parallel work in
this workspace.

## Context

The Paperclip projection source is accepted at `1f8950aa`, but strict-3200 live
acceptance is protected. Roost production is still deployed at `070b150f`,
while local `main` is ahead and no exact Product Map consumer candidate has
been approved. This task binds prerequisites without crossing either runtime.

## Goal

Create a reproducible `GO`/`NO-GO` contract that prevents a push, deployment,
restart, or acceptance claim until exact source, target, capacity, config,
migration, rollback, smoke, authorization, and monitoring evidence exists.

## Scope

- `docs/operations/product-map-protected-release-preflight.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/rollback-and-recovery.md`
- `docs/operations/service-reliability-and-observability.md`
- `docs/maps/product-map.md`
- `docs/maps/release-ops-map.md`
- this task packet and the directly affected project-memory/state ledgers

## Implementation Plan

1. Inspect current repository, public runtime, Coolify, Paperclip contract, and operations truth read-only.
2. Publish the smallest canonical Product Map release preflight that references existing runbooks.
3. Bind owner-company fail-closed acceptance and separate local Paperclip restart from Roost production deployment.
4. Synchronize the requirement, quality, risk, confidence, mission, board, and project-memory pointers.
5. Run focused docs/source-control checks, commit the coherent docs packet, upload the primary work product, and close the Paperclip issue with typed evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: future candidate absent; local source ahead of deployed/live origin; Coolify app status is `running:unknown`; public image is `unknown`; capacity and current rollback image are unproven; Paperclip route is not strict-3200 runtime accepted.
- Architecture constraints: Roost is owner-facing aggregation; Paperclip owns execution/evidence; product repos own product/release truth; PostgreSQL persistence must survive deploy/rollback.

### 2. Select One Priority Mission Objective
- Selected task: bind all protected release prerequisites for the Product Map.
- Priority rationale: this is the final blocker on the critical release parent.

### 3. Plan Implementation
- Files or surfaces: canonical operations packet plus direct map/state pointers.
- Edge cases: stale SHA, unknown image, insufficient capacity, migration risk, cross-company leakage, malformed owner binding, crash loop, unavailable rollback.

### 4. Execute Implementation
- Implementation notes: documentation and read-only evidence only; no runtime mutation.

### 5. Verify and Test
- Validation performed: `git diff --check`; `npm run architecture:status`;
  repository-path/link existence check; requirement/quality/risk table schema
  check; focused added-line redaction scan; owner remote/live-ref readback;
  public web/API/health probes; redacted Coolify application/project/environment
  and server readback.
- Result: pass. Architecture remains `GREEN` at `455/769/35`, evidence queue
  `0`, chain worklist `0`, delta `0/0/0`; public routes returned `200`; the
  deployed commit and exact Coolify target were resolved without mutation.

### 6. Self-Review
- Simpler option considered: a transient issue comment was rejected because the gate must remain canonical and reproducible in the product repository.
- Technical debt introduced: no.
- Scalability assessment: one release-specific packet reuses existing deploy, smoke, rollback, and reliability contracts.

### 7. Update Documentation and Knowledge
- Docs updated: canonical preflight, deploy/rollback/reliability contracts,
  maps, project memory, task/mission/board, and requirement/quality/risk/confidence
  state.
- Learning journal updated: not applicable unless verification reveals a recurring failure.

## Acceptance Criteria
- [x] Exact Roost source, remote, branch, deployed SHA, Coolify target, and time boundary are recorded without implying authorization.
- [x] Paperclip owner-binding acceptance covers owner success and every required fail-closed negative case.
- [x] Candidate, capacity, migration, rollback, smoke, monitoring, stop-condition, and owner gates are testable.
- [x] Existing operations contracts are reused and linked.
- [x] Focused validation passed; the local commit SHA is recorded in the issue closeout.

## Success Signal
- User or operator problem: release owners otherwise have fragmented and stale promotion prerequisites.
- Expected reliability outcome: future release stops before mutation when source, target, rollback, authorization, or monitoring evidence is missing.
- How success will be observed: [LUC-1910](/LUC/issues/LUC-1910) can execute one packet and produce an unambiguous final decision.
- Post-launch learning needed: yes, after the first governed deployment/acceptance uses this packet.

## Deliverable For This Stage

An inspectable protected-release preflight, not a deployed Product Map.

## Definition of Done
- [x] Canonical packet and direct map/state pointers are updated.
- [x] No production or protected runtime mutation occurred.
- [x] No secret value appears in repository or issue evidence.
- [x] Focused documentation and source-control checks pass.
- [x] `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, `NO_TEMPORARY_SOLUTIONS.md`, and `DEPLOYMENT_GATE.md` were reviewed.

## Result Report
- Task summary: published and verified the fail-closed Product Map protected release preflight.
- Files changed: 20 scoped operations, map, task, project-memory, and state files.
- How tested: focused diff/architecture/link/table/redaction checks plus read-only git remote, public runtime, and Coolify target proof.
- What is incomplete: actual candidate selection, protected Paperclip restart, Roost deploy, smoke, and monitoring remain correctly gated to the future release execution.
- Next steps: release parent supplies the exact candidate and all independent gates, then DRE executes this preflight.
- Decisions made: current `unknown` image, unmeasured capacity, missing rollback-image readback, or unaccepted owner binding force `NO-GO`.
