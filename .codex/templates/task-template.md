# Task

## Header
- ID: PRJ-XXX
- Title:
- Task Type: fix | feature | refactor | design | research | release
- Current Stage: intake | analysis | planning | implementation | verification | release | post-release
- Status: BACKLOG | READY | IN_PROGRESS | BLOCKED | REVIEW | DONE
- Owner: Planner | Product Docs | Backend Builder | Frontend Builder | QA/Test | Security | DB/Migrations | Ops/Release | Review
- Depends on:
- Priority: P0 | P1 | P2
- Coverage Ledger Rows:
- Module Confidence Rows:
- Requirement Rows:
- Quality Scenario Rows:
- Risk Rows:
- Iteration:
- Operation Mode: BUILDER | ARCHITECT | TESTER
- Mission ID:
- Mission Status: PLANNED | IN_PROGRESS | CHECKPOINTED | VERIFIED | PARTIALLY_VERIFIED | BLOCKED | FAILED | SUPERSEDED

## Process Self-Audit
- [ ] All seven autonomous loop steps are planned.
- [ ] No loop step is being skipped.
- [ ] Exactly one priority task is selected.
- [ ] Operation mode matches the iteration number.
- [ ] The task is aligned with repository source-of-truth documents.
- [ ] `.agents/core/project-memory-index.md` was reviewed.
- [ ] `.agents/core/mission-control.md` was reviewed for long-running work.
- [ ] Affected module confidence rows were identified.
- [ ] Affected requirement, quality scenario, and risk rows were identified or
      marked not applicable.
- [ ] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective:
- Release objective advanced:
- Included slices:
- Explicit exclusions:
- Checkpoint cadence:
- Stop conditions:
- Handoff expectation:

## Context
Where this work sits in the current project flow and architecture.

## Goal
What must be achieved by this task.

## Scope
Exact files, modules, routes, APIs, schemas, docs, or runtime surfaces allowed
for this task.

## Implementation Plan
1. Inspect the existing architecture, code, contracts, and tests before
   changing files.
2. Implement only the minimal vertical slice required by the goal.
3. Validate integration, error handling, restart or reload behavior, and
   regression risk.
4. Update documentation and task evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues:
- Gaps:
- Inconsistencies:
- Architecture constraints:

### 2. Select One Priority Mission Objective
- Selected task:
- Priority rationale:
- Why other candidates were deferred:

### 3. Plan Implementation
- Files or surfaces to modify:
- Logic:
- Edge cases:

### 4. Execute Implementation
- Implementation notes:

### 5. Verify and Test
- Validation performed:
- Result:

### 6. Self-Review
- Simpler option considered:
- Technical debt introduced: yes | no
- Scalability assessment:
- Refinements made:

### 7. Update Documentation and Knowledge
- Docs updated:
- Context updated:
- Learning journal updated: yes | no | not applicable

## Acceptance Criteria
- [ ] Testable condition 1:
- [ ] Testable condition 2:
- [ ] Testable condition 3:

## Success Signal
- User or operator problem:
- Expected product or reliability outcome:
- How success will be observed:
- Post-launch learning needed: yes | no

## Deliverable For This Stage
Describe exactly what should be produced in the current stage only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior
- implement features as a vertical slice across UI, logic, API, DB, validation,
  error handling, and tests when the task affects runtime behavior

## Definition of Done
- [ ] Code builds without errors.
- [ ] Feature works manually through the real UI, API, CLI, or operator path.
- [ ] No mock, placeholder, fake, or temporary data/path remains.
- [ ] Full data flow works across all relevant layers.
- [ ] Backend and UI/client error handling exists where applicable.
- [ ] No existing functionality is broken.
- [ ] Feature works after restart, reload, or navigation refresh where
  applicable.
- [ ] Changes are documented in the relevant source of truth.
- [ ] Behavior is reproducible from the evidence recorded below.
- [ ] Success signal, reliability, security, and rollback evidence are recorded
  when applicable.
- [ ] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [ ] The output matches the declared `Current Stage`.
- [ ] Work from later stages was not mixed in without explicit approval.
- [ ] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new systems without approval
- duplicated logic or parallel implementations of the same contract
- temporary bypasses, hacks, or workaround-only paths
- architecture changes without explicit approval
- implicit stage skipping

## Validation Evidence
- Tests:
- Manual checks:
- Screenshots/logs:
- High-risk checks:
- Coverage ledger updated: yes | no | not applicable
- Coverage rows closed or changed:
- Module confidence ledger updated: yes | no | not applicable
- Module confidence rows closed or changed:
- Requirements matrix updated: yes | no | not applicable
- Requirement rows closed or changed:
- Quality scenarios updated: yes | no | not applicable
- Quality scenario rows closed or changed:
- Risk register updated: yes | no | not applicable
- Risk rows closed or changed:
- Reality status: verified | implemented, not verified | partially verified | blocked | failed

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes | no
- Real API/service path used: yes | no | not applicable
- Endpoint and client contract match: yes | no | not applicable
- DB schema and migrations verified: yes | no | not applicable
- Loading state verified: yes | no | not applicable
- Error state verified: yes | no | not applicable
- Refresh/restart behavior verified: yes | no | not applicable
- Regression check performed:

## Product / Discovery Evidence
- Problem validated: yes | no | not applicable
- User or operator affected:
- Existing workaround or pain:
- Smallest useful slice:
- Success metric or signal:
- Feature flag, staged rollout, or disable path: yes | no | not applicable
- Post-launch feedback or metric check:

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes | no | not applicable
- Feedback item IDs:
- Feedback accepted:
- Feedback needs clarification:
- Feedback conflicts:
- Feedback deferred or rejected:
- Active task changed by feedback: yes | no
- New task created from feedback: yes | no | not applicable
- Design memory updated: yes | no | not applicable
- Learning journal updated: yes | no | not applicable
## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: yes | no | not applicable
- Critical user journey:
- SLI:
- SLO:
- Error budget posture: healthy | burning | exhausted | not applicable
- Health/readiness check:
- Logs, dashboard, or alert route:
- Smoke command or manual smoke:
- Rollback or disable path:

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: yes | no | not applicable
- Memory consistency scenarios:
- Multi-step context scenarios:
- Adversarial or role-break scenarios:
- Prompt injection checks:
- Data leakage and unauthorized access checks:
- Result:

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes | no | not applicable
- Data classification:
- Trust boundaries:
- Permission or ownership checks:
- Abuse cases:
- Secret handling:
- Security tests or scans:
- Fail-closed behavior:
- Residual risk:

## Architecture Evidence (required for architecture-impacting tasks)
- Architecture source reviewed:
- Fits approved architecture: yes | no
- Mismatch discovered: yes | no
- Decision required from user: yes | no
- Approval reference if architecture changed:
- Follow-up architecture doc updates:

## UX/UI Evidence (required for UX tasks)
- Design source type: figma | approved_snapshot
- Design source reference:
- Canonical visual target:
- Fidelity target: pixel_close | structurally_faithful | style_inspired
- Evidence-driven UX review used: yes | no
- Primary user question answered within 3 seconds:
- Next action visibility:
- Blocked-state visibility:
- Stitch used: yes | no
- Stitch artifact reference (if used):
- Experience-quality bar reviewed: yes | no
- Visual-direction brief reviewed: yes | no
- Existing shared pattern reused:
- New shared pattern introduced: yes | no
- Design-memory entry reused:
- Design-memory update required: yes | no
- Pattern-gallery reference:
- Visual gap audit completed: yes | no
- Background or decorative asset strategy:
- Canonical asset extraction required: yes | no
- Screenshot comparison pass completed: yes | no
- Remaining mismatches:
- Anti-patterns checked: yes | no
- Screen-quality checklist reviewed: yes | no
- UI scorecard used: yes | no
- Surface strategy checked: mobile | tablet | desktop
- State checks: loading | empty | error | success
- Feedback locality checked: yes | no
- Raw technical errors hidden from end users: yes | no | not applicable
- Responsive checks: desktop | tablet | mobile
- Input-mode checks: touch | pointer | keyboard
- Accessibility checks:
- Parity evidence:

## Deployment / Ops Evidence (required for runtime or infra tasks)
- Deploy impact: none | low | medium | high
- Env or secret changes:
- Health-check impact:
- Smoke steps updated:
- Rollback note:
- Observability or alerting impact:
- Staged rollout or feature flag:
- `DEPLOYMENT_GATE.md` reviewed: yes | no | not applicable

## Review Checklist (mandatory)
- [ ] Process self-audit completed before implementation.
- [ ] Autonomous loop evidence covers all seven steps.
- [ ] Exactly one priority task was completed in this iteration.
- [ ] Operation mode was selected according to iteration rotation.
- [ ] Current stage is declared and respected.
- [ ] Deliverable for the current stage is complete.
- [ ] Architecture alignment confirmed.
- [ ] Existing systems were reused where applicable.
- [ ] No workaround paths were introduced.
- [ ] No temporary solution was introduced.
- [ ] No logic duplication was introduced.
- [ ] Integration checklist evidence is attached where applicable.
- [ ] AI testing evidence is attached where applicable.
- [ ] Deployment gate evidence is attached where applicable.
- [ ] Definition of Done evidence is attached.
- [ ] Relevant validations were run.
- [ ] Docs or context were updated if repository truth changed.
- [ ] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report
- Task summary:
- Files changed:
- How tested:
- What is incomplete:
- Next steps:
- Decisions made:

## Notes
Risks, assumptions, links.
