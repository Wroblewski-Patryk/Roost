# Task

## Header
- ID: ACF-OPS-001
- Title: Auto-Deploy Proof Or Manual Path Acceptance Refresh
- Task Type: release
- Current Stage: post-release
- Status: DONE
- Owner: Ops/Release
- Depends on: ACF-QA-001
- Priority: P2
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `ops/deploy-path`
- Requirement Rows: `ACF-011`
- Quality Scenario Rows: `QAS-DEPLOYMENT`, `QAS-OBSERVABILITY`
- Risk Rows: `KI-002`
- Iteration: 23
- Operation Mode: BUILDER
- Mission ID: ACF-OPS-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed earlier in this active mission wave.
- [x] `.agents/core/mission-control.md` was reviewed earlier in this active mission wave.
- [x] Missing or template-like state tables were not needed for this operations evidence slice.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: decide whether the latest push can be proven as automatically deployed or whether manual VPS/Coolify rollover remains accepted.
- Release objective advanced: prevent future agents from claiming auto-deploy reliability without evidence.
- Included slices: public health checks, deployment contract update, post-deploy smoke evidence, known issue update.
- Explicit exclusions: logging into Coolify, triggering a production redeploy, changing runtime env vars, changing application code.
- Checkpoint cadence: verify public health, compare metadata to latest commit, document verdict.
- Stop conditions: production health down, conflicting deploy evidence, or need for privileged Coolify action.
- Handoff expectation: future deploy work starts from a clear accepted manual path and known metadata gap.

## Context

The application has a working manual VPS/Coolify rollout path, but GitHub-to-Coolify auto-deploy has not been proven with durable evidence. After pushing the current queue commits, public health was checked to see whether the running app exposes the latest commit.

## Goal

Refresh the deploy-path evidence and record the honest verdict: auto-deploy remains unverified because public health does not expose comparable commit/image metadata, while manual VPS/Coolify rollover remains the accepted path.

## Scope

- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `.agents/state/known-issues.md`
- source-of-truth queue and ledger docs

## Implementation Plan
1. Read current pushed commit.
2. Check public web and API health.
3. Compare public build metadata to the pushed commit.
4. Update operations docs and known issue status.
5. Update queue/source-of-truth docs.
6. Run `git diff --check` and commit.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: public health returns `200` but build metadata is `unknown`.
- Gaps: no current push-to-running-image proof exists for commit `ece93b1`.
- Inconsistencies: auto-deploy cannot be called reliable while metadata is absent.
- Architecture constraints: no production mutation in this evidence-only slice.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: deployment contract, post-deploy smoke, known issues, latest local git commit.
- Rows created or corrected: operations docs and known issue updated.
- Assumptions recorded: public health metadata is the current accepted public proof surface.
- Blocking unknowns: Coolify internals were not inspected in this slice.
- Why it was safe to continue: the task only records evidence and accepts the manual path; it does not alter production.

### 2. Select One Priority Mission Objective
- Selected task: ACF-OPS-001.
- Priority rationale: it was the active `NOW` item after ACF-QA-001.
- Why other candidates were deferred: AGRUN-010 remains blocked by upstream write access.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: if public health does not report the latest commit or an equivalent image marker, auto-deploy remains unverified.
- Edge cases: healthy service with unknown build metadata must be treated as uptime evidence only, not deployment evidence.

### 4. Execute Implementation
- Implementation notes: public web/API health checks returned `200`; both reported `commit: unknown` and `image: unknown`.

### 5. Verify and Test
- Validation performed: `git rev-parse --short HEAD`; public web/API health checks; `git diff --check`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: leave KI-002 in monitoring state.
- Technical debt introduced: no
- Scalability assessment: restoring build metadata later will make auto-deploy proof straightforward.
- Refinements made: known issue status changed to accepted rather than closed, because auto-deploy is still not proven.

### 7. Update Documentation and Knowledge
- Docs updated: deployment contract, post-deploy smoke, known issues, task contract, task board, next steps, planning queue, system health, module confidence ledger.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Public web health is checked.
- [x] Public API health is checked.
- [x] Latest local commit is recorded.
- [x] Auto-deploy verdict is evidence-backed.
- [x] Manual path acceptance is recorded in operations docs and known issues.

## Success Signal
- User or operator problem: deploy path claims are no longer ambiguous.
- Expected product or reliability outcome: future agents know manual VPS/Coolify rollover is the accepted path until commit/image metadata or equivalent Coolify evidence proves auto-deploy.
- How success will be observed: operations docs and known issue state agree.
- Post-launch learning needed: yes, restore or expose build metadata in a future deployability slice.

## Deliverable For This Stage

An evidence-backed deployment-path verdict with source-of-truth docs updated.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not mutate production in an evidence-only task

## Definition of Done
- [x] Public health checks were run.
- [x] No production mutation was performed.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal and residual risk are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check`.
- Manual checks:
  - `git rev-parse --short HEAD` returned `ece93b1`.
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with `build.commit="unknown"` and `build.image="unknown"`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with `build.commit="unknown"` and `build.image="unknown"`.
- Screenshots/logs: command output in Codex tool transcript.
- High-risk checks: no production mutation; no credentials used; no deploy triggered.
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: `ACF-OPS-001`
- Requirements matrix updated: not applicable
- Quality scenarios updated: not applicable
- Risk register updated: not applicable; known issue updated instead.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: not applicable
- Real API/service path used: yes
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: public health checks.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: operator deploying CompanyCore to VPS/Coolify.
- Existing workaround or pain: manual rollover is proven, but auto-deploy claims lacked current proof.
- Smallest useful slice: record public health and metadata verdict.
- Success metric or signal: docs agree that auto-deploy is unverified and manual rollover is accepted.
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: restore build metadata or capture Coolify deployment evidence in a future task.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: direct user feedback in this thread to continue planned work until complete.
- Feedback accepted: continue queue after ACF-QA-001.
- Feedback needs clarification: none.
- Feedback conflicts: none.
- Feedback deferred or rejected: no Coolify mutation was performed in this evidence-only slice.
- Active task changed by feedback: yes
- New task created from feedback: no
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: yes
- Critical user journey: operator determines whether a push reached production automatically.
- SLI: public health availability plus build metadata comparability.
- SLO: health available; build metadata comparable before claiming auto-deploy success.
- Error budget posture: healthy for uptime, incomplete for deploy evidence.
- Health/readiness check: public web/API `/health`.
- Logs, dashboard, or alert route: public health JSON.
- Smoke command or manual smoke: public health checks.
- Rollback or disable path: continue using documented manual VPS/Coolify rollover and rollback images.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- AI feature changed: no
- Multi-step AI scenario: not applicable
- Prompt injection/data leakage checks: not applicable

