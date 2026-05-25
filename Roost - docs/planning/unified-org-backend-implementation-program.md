# Unified Organizational OS Backend Implementation Program

Last updated: 2026-05-16

## Purpose

This program turns
`docs/architecture/unified-organizational-operating-system.md` into an
executable backend-first queue.

The goal is to make CompanyCore work as a structured organizational world
state for humans and AI agents, then expose that same state to:

- web on desktop, tablet, and mobile;
- future native mobile app derived from the web-mobile product behavior;
- MCP/API clients such as Paperclip, Aviary, Jarvis, Codex, and future agents.

This plan does not replace the current active queue. It is queued after the
current V1 department work and should be executed in small, reversible tasks.

## Current Queue Boundary

Do not disturb the current queue:

1. Continue `DMS-NEXT-004` Relationships Management read packet and board.
2. Preserve the active web scope: public home, auth, `00 General`, `04
   Operations`, and `08 Assets`.
3. Keep `00`, `04`, and `08` as the minimum web surfaces that must benefit
   from backend improvements first.
4. Do not rebuild the full frontend to mirror every backend concept.
5. Add frontend changes only when they are required to prove or safely consume
   the new backend contract.

## Target Backend Shape

The backend should expose one organization model:

```text
Workspace
  -> Departments / business functions
  -> Workforce members: humans and agents
  -> Ranks / roles / supervisors / permissions
  -> Tasks / delegations / escalations / approvals
  -> Processes / pipelines / procedures / runs
  -> Resources / knowledge / decisions / metrics / risks
  -> Events / audit / evidence
```

The backend must keep these invariants:

- CompanyCore is not AI.
- Humans and AI agents are organizational members using different clients.
- Web, API, MCP, and future mobile use the same source of truth.
- MCP tools are thin wrappers over CompanyCore API contracts.
- Permissions derive from rank, role, department, project/workflow context,
  capability, risk, and approval policy.
- High-impact writes are command-shaped, audited, event-emitting, and tested.
- Read models come before broad mutable workflows.

## Program Waves

| Wave | Theme | Outcome |
| --- | --- | --- |
| UOS-0 | Audit and contracts | current DB/API/MCP capabilities mapped to target architecture |
| UOS-1 | Workforce foundation | humans and agents visible through one read model |
| UOS-2 | Authority and visibility | rank/role/department context can drive API/MCP/web visibility |
| UOS-3 | Task recursion | assignment, delegation, escalation, blocker, and reporting contracts |
| UOS-4 | World-state read APIs | agents and web can read structured organization state |
| UOS-5 | Command layer | safe task/workforce commands with audit and events |
| UOS-6 | Minimal web adoption | `00`, `04`, and `08` consume only necessary new backend state |
| UOS-7 | Expansion contract | future departments inherit the same backend capabilities as they are added |

## Execution Rules

- Each task below is intentionally narrow enough for one implementation pass.
- Do not combine schema migrations with broad UI rewrites.
- Do not add new AI behavior to the backend.
- Do not expose raw CRUD for hierarchy, permissions, task lifecycle, or agent
  authority.
- Every backend task needs API tests for auth, workspace isolation, scoped-key
  denial, and no unauthorized mutation.
- Every MCP task must prove manifest filtering for at least one read profile
  and one denied profile.
- Every web task must prove desktop and mobile for the touched active route.

## Detailed Task Queue

### UOS-0: Audit And Contract Preparation

#### UOS-000 Program Queue Alignment

Stage: planning.

Goal: publish this backend implementation program and queue it after the
current active work.

Scope:

- `docs/planning/unified-org-backend-implementation-program.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/next-steps.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/PROJECT_STATE.md`

Implementation plan:

1. Document the wave sequence and task contracts.
2. Add queue pointers after the active department/web work.
3. Keep current active tasks in their existing order.

Acceptance criteria:

- Current active queue remains first.
- UOS tasks are discoverable as the next backend architecture program.
- No runtime code changes are made.

Definition of Done:

- Planning docs and queues agree.
- `git diff --check` passes.

#### UOS-BE-001 Current Backend Capability Audit

Stage: analysis.

Goal: map current schema, route modules, capability scopes, MCP manifest
entries, agent key profiles, and department packets to the unified
organizational OS target.

Scope:

- `prisma/schema.prisma`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/modules/**`
- existing docs under `docs/architecture/`
- output file: `docs/planning/uos-backend-current-capability-audit.md`

Implementation plan:

1. Inventory current tables that already support workforce, tasks, workflow,
   approvals, events, audit, resources, knowledge, and MCP.
2. Identify which target concepts are already supported, partially supported,
   missing, or blocked.
3. Mark whether each gap needs read model, schema, command route, MCP
   exposure, web adoption, or future mobile consideration.
4. Recommend the smallest no-migration read packet that can prove value first.

Acceptance criteria:

- Audit includes table/API/MCP mapping for users, agents, roles, tasks,
  business functions, operating areas, workflows, approvals, events, audit,
  resources, and knowledge.
- Audit identifies no duplicate table creation before reuse analysis.
- Audit names the first safe backend implementation task.

Definition of Done:

- Source review complete.
- `git diff --check` passes.

#### UOS-BE-002 Organizational Contract Types

Stage: planning.

Goal: define backend DTO and domain language for organizational actors,
workforce members, ranks, roles, departments, authority context, workload
state, and blocked actions before implementation.

Scope:

- new planning/spec doc:
  `docs/planning/uos-organizational-contract-types.md`
- future TypeScript target files to be named, but not implemented yet

Implementation plan:

1. Define canonical terms:
   `actor`, `workforceMember`, `humanProfile`, `agentProfile`, `rank`,
   `role`, `department`, `supervisor`, `authorityContext`, `visibilityScope`,
   `workloadState`, `blockedAction`.
2. Define external DTO shapes for read APIs and MCP resources.
3. Define internal actor reference shape for user/agent/system/integration.
4. Define response-envelope and error-code expectations.
5. Define migration-safe naming rules.

Acceptance criteria:

- DTOs are stable enough for backend, web, and MCP planning.
- Terms do not conflict with current Prisma table names.
- Future mobile can consume the same DTOs without desktop-only assumptions.

Definition of Done:

- Spec is linked from this program.
- `git diff --check` passes.

### UOS-1: Unified Workforce Read Foundation

#### UOS-BE-010 Workforce Read Packet Without Migration

Stage: implementation.

Goal: expose the first read-only workforce packet by composing existing
`users`, `agents`, `company_roles`, service-key profiles, capabilities,
business functions, operating areas, events, and agent logs.

Scope:

- backend route: `GET /v1/workforce/context`
- capability: `workforce:read`
- MCP exposure: read-only tool/resource through the existing manifest
- tests in `src/tests/api.test.ts` or a split test file if test splitting is
  already available
- docs: `docs/API.md`

Implementation plan:

1. Add `workforce:read` capability and profile exposure for read-oriented MCP
   keys where appropriate.
2. Implement route under a new or existing workforce/organization module.
3. Return:
   - humans from current users/memberships;
   - agents from current agents;
   - roles from company roles;
   - service-key profile summaries without secrets;
   - department/business-function hints;
   - explicit missing fields such as rank, supervisor, workload, and profile
     depth.
4. Include `agentPacket` with `mode=read_only`, allowed reads, and blocked
   actions.
5. Test owner auth, service key auth, scoped denial, workspace isolation,
   MCP manifest exposure, and no mutation.

Acceptance criteria:

- Route returns a normalized `members[]` array with `memberType` values
  `human` and `agent`.
- No secret, password hash, raw API key, or provider token appears.
- Missing target fields are explicit `gaps[]`, not fake values.
- MCP manifest exposes the route only to keys with `workforce:read`.

Definition of Done:

- `npm run build:server` passes.
- Relevant API tests pass.
- `git diff --check` passes.

#### UOS-BE-011 People/Agents Authority Packet For `06`

Stage: implementation.

Goal: make `06 People/Agents And Roles` backend-ready as a read-only authority
packet over the workforce context.

Scope:

- backend route: `GET /v1/people-agents/context`
- capability: `people-agents:read`
- MCP exposure as read-only
- docs: `docs/API.md`
- no web route required yet

Implementation plan:

1. Compose workforce context with company roles, agent profiles, API key
   profile summaries, role permissions, allowed tools, and escalation targets.
2. Return roster, authority boundaries, capacity/workload gaps, permission
   risks, Paperclip/agent reconciliation gaps, and blocked actions.
3. Keep writes blocked: no hiring, agent creation, key minting, permission
   edits, or roster import.
4. Test auth, workspace isolation, scoped denial, no mutation, MCP exposure.

Acceptance criteria:

- Packet answers: who/which agent exists, what role they have, what they may
  do, what is missing, and where authority is unclear.
- Packet is useful to web and MCP without needing frontend changes.
- Writes are absent and blocked actions are explicit.

Definition of Done:

- `npm run build:server` and relevant API tests pass.
- `git diff --check` passes.

#### UOS-BE-012 Workforce Schema Decision

Stage: planning.

Goal: decide whether the first persistent workforce migration should add a
shared workforce member layer now or defer it after read-packet proof.

Scope:

- decision register update
- planning doc:
  `docs/planning/uos-workforce-schema-decision.md`
- no migration in this task

Implementation plan:

1. Review UOS-BE-010 and UOS-BE-011 evidence.
2. Compare three options:
   - continue read-model-only;
   - add `workforce_members`, `human_profiles`, `agent_profiles`;
   - add only rank/supervisor fields to existing records.
3. Select the smallest option that supports assignment, visibility, and MCP
   needs.
4. Record rollback and migration safety expectations.

Acceptance criteria:

- Decision names exact tables/fields if migration is approved.
- Decision explains why existing `users`/`agents` are insufficient or enough.
- No schema is changed in this task.

Definition of Done:

- Decision register updated.
- Task board next task updated.
- `git diff --check` passes.

### UOS-2: Workforce Schema And Backfill

#### UOS-BE-020 Workforce Member Migration

Stage: implementation.

Goal: add the minimum shared workforce member schema selected by
UOS-BE-012.

Preferred target if approved:

- `workforce_members`
- `human_profiles`
- `agent_profiles`
- `organization_ranks`
- optional `workforce_department_memberships`

Scope:

- `prisma/schema.prisma`
- new Prisma migration
- seed/backfill logic if needed
- API tests for migration-backed reads

Implementation plan:

1. Add enums and tables exactly as approved by UOS-BE-012.
2. Keep `users` and `agents` as profile/source records, not deleted tables.
3. Backfill current owner users and existing agents into workforce members.
4. Seed default ranks: `owner`, `director`, `manager`, `leader`, `worker`.
5. Link default owner member to owner rank.
6. Make migration reversible through normal Prisma migration rollback policy
   documentation, not manual SQL hacks.
7. Update UOS-BE-010 and UOS-BE-011 routes to prefer workforce members while
   preserving fallback behavior if data is incomplete.

Acceptance criteria:

- Existing users and agents remain readable.
- Workforce packet returns backfilled members.
- Cross-workspace reads fail closed.
- No provider tokens or secrets are exposed.

Definition of Done:

- `npm run build:server` passes.
- `npm run test:api` or targeted API tests pass against migrated PostgreSQL.
- `git diff --check` passes.

#### UOS-BE-021 Rank And Supervisor Read Model

Stage: implementation.

Goal: expose rank and supervisor relationships in workforce and People/Agents
packets without adding write commands yet.

Scope:

- `GET /v1/workforce/context`
- `GET /v1/people-agents/context`
- API docs and tests

Implementation plan:

1. Include rank, supervisor, direct reports, and hierarchy path fields.
2. Return hierarchy gaps for members without rank/supervisor.
3. Add summary counts by rank and department.
4. Add blocked actions for rank edit, supervisor change, permission change,
   and agent creation.
5. Test workspace isolation and scoped visibility.

Acceptance criteria:

- Owner can see the hierarchy shape.
- Agents can see only exposed read packet data through allowed scope.
- Missing hierarchy data is visible and not invented.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

### UOS-3: Authority And Visibility Engine

#### UOS-BE-030 Authority Context Resolver

Stage: implementation.

Goal: create a backend service that derives an actor's authority context from
workspace, auth method, workforce member, rank, role, department, scopes,
capabilities, and service-key profile.

Scope:

- new internal service, for example `src/organization/authority-context.ts`
- auth middleware integration only where safe
- tests for pure resolver behavior

Implementation plan:

1. Define inputs for owner bearer auth, service API key, agent profile, and
   system actor.
2. Resolve actor type, member ID, rank, role, department, scopes,
   capabilities, and supervision mode.
3. Return allowed high-level visibility bands:
   `self`, `team`, `department`, `cross_department`, `organization`.
4. Return denied/unknown reason codes for incomplete authority data.
5. Keep existing capability enforcement unchanged until follow-up tasks adopt
   the resolver.

Acceptance criteria:

- Resolver is tested without changing existing route behavior.
- Resolver can represent owner, human member, agent member, system actor, and
  integration actor.
- Unknown workforce metadata fails conservative, not broad.

Definition of Done:

- `npm run build:server` passes.
- Targeted tests pass.
- `git diff --check` passes.

#### UOS-BE-031 Visibility Policy Contract

Stage: planning.

Goal: specify how authority context should filter API responses, MCP tools,
resources, department packets, and future web navigation.

Scope:

- planning doc:
  `docs/planning/uos-visibility-policy-contract.md`
- no runtime code

Implementation plan:

1. Define visibility levels for worker, leader, manager, director, owner.
2. Define API response filtering rules for tasks, workforce, resources,
   knowledge, and department packets.
3. Define MCP manifest filtering rules.
4. Define frontend rendering expectations for current routes: `00`, `04`,
   `08`, auth, home.
5. Define fail-closed behavior for unknown rank/role/department.

Acceptance criteria:

- Contract states what each rank sees by default.
- Contract states what remains capability-gated regardless of rank.
- Contract does not require full frontend rebuild.

Definition of Done:

- Contract doc created.
- Decision or requirement rows updated if needed.
- `git diff --check` passes.

#### UOS-BE-032 MCP Manifest Authority Filtering

Stage: implementation.

Goal: make MCP manifest generation ready for workforce authority context,
while preserving existing capability behavior.

Scope:

- `src/mcp/manifest.ts`
- `src/auth/capabilities.ts`
- authority context service from UOS-BE-030
- API tests

Implementation plan:

1. Keep capability filtering as the hard boundary.
2. Add optional authority-context metadata to manifest output:
   actor type, visibility band, supervision mode, blocked reasons.
3. Ensure read-only profiles do not gain write tools.
4. Add tests for owner, read-only MCP key, operator key, and insufficient
   scope.

Acceptance criteria:

- Existing MCP tests still pass.
- Manifest remains backwards-compatible for existing tools.
- New metadata helps agents understand what they cannot do.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

### UOS-4: Recursive Task And Escalation Model

#### UOS-BE-040 Task Recursion Schema Decision

Stage: planning.

Goal: decide the minimum schema for assignment, delegation, escalation,
blocked reports, information requests, returns, review, approval, and audit
history.

Scope:

- planning doc:
  `docs/planning/uos-task-recursion-schema-decision.md`
- decision register update

Implementation plan:

1. Review current `tasks`, `events`, `audit_logs`, `approvals`,
   `dependencies`, `notes`, `pipeline_runs`, `stage_runs`, and Operations
   packets.
2. Compare schema options:
   - event/audit-only with enriched read models;
   - `task_assignments` plus `task_activity`;
   - full `task_delegations`, `task_escalations`, `task_information_requests`
     tables.
3. Select the smallest schema that supports current web and MCP needs.
4. Define status-transition contract separate from raw `Task.status`.

Acceptance criteria:

- Decision covers parent/child tasks, delegation chain, escalation chain,
  blocker reporting, needs-information, returned context, review, approval,
  completion, and rejection.
- Decision does not approve broad raw task CRUD.

Definition of Done:

- Decision recorded.
- Next implementation task is explicit.
- `git diff --check` passes.

#### UOS-BE-041 Task Assignment And Activity Migration

Stage: implementation.

Goal: add the minimum task recursion schema selected by UOS-BE-040.

Likely target tables:

- `task_assignments`
- `task_activity`
- optional `task_context_links`

Scope:

- Prisma schema and migration
- backfill from existing tasks where possible
- API tests

Implementation plan:

1. Add assignment records that support human and agent workforce members.
2. Add activity records for assignment, progress report, blocker report,
   escalation, information request, returned context, review, approval,
   completion, and rejection.
3. Preserve existing `Task.status` for compatibility.
4. Add indexes by workspace, task, assignee, actor, activity kind, status.
5. Backfill current tasks as unassigned or owner-assigned according to
   available evidence.

Acceptance criteria:

- Existing task routes still work.
- New tables support human and agent assignees.
- Backfilled state is honest when ownership is unknown.

Definition of Done:

- Server build and migration-backed tests pass.
- `git diff --check` passes.

#### UOS-BE-042 Task Work Item Read Packet V2

Stage: implementation.

Goal: update Operations work item read packets to include assignment,
delegation, escalation, blocker, information request, review, and approval
evidence.

Scope:

- `GET /v1/operations/work-items`
- `GET /v1/operations/context`
- API docs and tests
- MCP manifest remains read-only

Implementation plan:

1. Join task assignment/activity records.
2. Add fields for current assignee, delegation chain, blocker state,
   escalated-to, waiting-on, returned context, review state, approval state.
3. Include human/agent labels from workforce members.
4. Include missing evidence/gaps.
5. Keep writes blocked.

Acceptance criteria:

- `04 Operations` can understand task recursion without new UI commands.
- Agents can read what is assigned, blocked, escalated, or waiting.
- No new writes are introduced.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

### UOS-5: Organizational World-State APIs

#### UOS-BE-050 Organization World-State Read API

Stage: implementation.

Goal: expose a single read-only organization state packet for web, MCP, and
future mobile clients.

Scope:

- backend route: `GET /v1/organization/world-state`
- capability: `organization:read`
- MCP exposure
- docs and tests

Implementation plan:

1. Return workspace identity and current actor authority context.
2. Return departments/business functions with current readiness.
3. Return workforce summary and hierarchy summary.
4. Return tasks summary by assigned/escalated/blocked/review state.
5. Return resources/knowledge summary by area and trust/readiness.
6. Return metrics/risks/approvals summary where already available.
7. Include links to detail packets, not full deep payloads.
8. Include blocked actions.

Acceptance criteria:

- Packet is small enough for dashboard/mobile first load.
- Packet lets agents discover where to read next.
- Cross-workspace and scoped-key behavior is tested.

Definition of Done:

- Server build and API tests pass.
- MCP manifest includes read-only tool for authorized profiles.
- `git diff --check` passes.

#### UOS-BE-051 Department Packet Extension Contract

Stage: planning.

Goal: define how every department packet should include workforce, authority,
tasks, resources, knowledge, MCP, and blocked-action data as departments are
added.

Scope:

- planning doc:
  `docs/planning/uos-department-packet-extension-contract.md`
- no runtime code

Implementation plan:

1. Define common packet sections:
   `department`, `actorContext`, `workforce`, `work`, `resources`,
   `knowledge`, `permissions`, `agentPacket`, `blockedActions`, `gaps`.
2. Define how current `00`, `04`, `08` packets should adopt the common
   sections.
3. Define requirements for future `05`, `02`, `09`, `10`, etc.
4. Define mobile response-size and summary/deep-link rules.

Acceptance criteria:

- Future departments know exactly which backend sections to include.
- Current web routes can adopt sections incrementally.
- MCP consumers receive consistent shape.

Definition of Done:

- Contract doc created and linked in queue.
- `git diff --check` passes.

#### UOS-BE-052 Extend `00`, `04`, `08` Packets With Actor Context

Stage: implementation.

Goal: add current actor authority context and blocked-action explanations to
the active department packets.

Scope:

- `GET /v1/intake`
- `GET /v1/intake/route-proposals`
- `GET /v1/operations/context`
- `GET /v1/operations/work-items`
- `GET /v1/assets/context`
- tests and docs

Implementation plan:

1. Reuse authority context from UOS-BE-030.
2. Add `actorContext` and standardized `blockedActions`.
3. Keep existing response fields backwards-compatible.
4. Add tests for owner and read-only agent profiles.

Acceptance criteria:

- Existing frontend does not break.
- Agents can see why an action is blocked.
- Current web can display actor/authority summaries later.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

### UOS-6: Safe Command Layer

#### UOS-BE-060 Task Assignment Command

Stage: implementation.

Goal: add a command-shaped route to assign or reassign a task to a human or
agent workforce member.

Scope:

- route: `POST /v1/tasks/:id/actions/assign`
- capability: `tasks:assign`
- audit/event evidence
- MCP exposure only if approved by policy
- tests and docs

Implementation plan:

1. Validate workspace, task, actor, assignee, rank/role/department authority.
2. Write assignment/activity record.
3. Update compatible task fields only if existing behavior requires it.
4. Emit event and audit log with correlation ID.
5. Return updated task assignment packet.
6. Fail closed for missing assignee, cross-workspace member, insufficient
   authority, archived task, or invalid status.

Acceptance criteria:

- Owner can assign a task.
- Read-only MCP key cannot assign.
- Agent/operator key can only assign if capability and policy allow it.
- Audit/event evidence exists.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

#### UOS-BE-061 Task Blocker Report Command

Stage: implementation.

Goal: let humans and agents report a blocker upward without mutating unrelated
task state.

Scope:

- route: `POST /v1/tasks/:id/actions/report-blocker`
- capability: `tasks:blocker:report`
- event/audit/task activity
- tests and docs

Implementation plan:

1. Validate actor can see or is assigned to task.
2. Record blocker activity with reason, requested help, severity, and optional
   resource/context links.
3. Derive escalation target from supervisor, role, or department authority
   when available.
4. Emit event and audit.
5. Keep provider write-back out of scope.

Acceptance criteria:

- Blocker appears in Operations work item read packet.
- Supervisor/escalation target is explicit or marked missing.
- Unauthorized actors fail closed.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

#### UOS-BE-062 Task Information Request And Return Commands

Stage: implementation.

Goal: support the recursive loop where a superior requests more information
and context returns downward to unblock work.

Scope:

- `POST /v1/tasks/:id/actions/request-information`
- `POST /v1/tasks/:id/actions/return-information`
- capabilities:
  `tasks:information:request`, `tasks:information:return`
- event/audit/task activity

Implementation plan:

1. Validate authority for requester and responder.
2. Record request with question, target member/role, due date, and context
   links.
3. Record return with answer, evidence links, and next-action hint.
4. Update read packet waiting/returned state.
5. Emit events and audit logs.

Acceptance criteria:

- Operations read packet shows waiting response and returned context.
- MCP can perform the command only with correct capability.
- Missing target member fails with a stable error.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

#### UOS-BE-063 Task Escalation Command

Stage: implementation.

Goal: escalate a task or blocker upward through hierarchy with audit evidence.

Scope:

- `POST /v1/tasks/:id/actions/escalate`
- capability: `tasks:escalate`
- event/audit/task activity

Implementation plan:

1. Validate actor authority.
2. Resolve escalation target from supervisor, role escalation target, or
   department manager.
3. Record escalation activity and target.
4. Add conflict behavior if task is already escalated.
5. Emit event/audit.

Acceptance criteria:

- Escalation chain is visible in read packets.
- Unknown target is explicit and does not fake hierarchy.
- Repeated escalation is idempotent or returns conflict.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

#### UOS-BE-064 Task Review And Approval Commands

Stage: implementation.

Goal: support review, approve, reject, and return-for-rework task decisions
without raw status patching.

Scope:

- `POST /v1/tasks/:id/actions/request-review`
- `POST /v1/tasks/:id/actions/decide-review`
- capabilities: `tasks:review:request`, `tasks:review:decide`
- link to existing `approvals` where risk requires approval

Implementation plan:

1. Validate assignment and reviewer/approver authority.
2. Create review activity and optional approval request.
3. Decide exactly once with approve, reject, or return.
4. Emit events and audit logs.
5. Update task status only through valid transitions.

Acceptance criteria:

- Review state is visible in Operations packet.
- Approval-required tasks connect to existing approvals.
- Rejections and returns preserve reason and evidence.

Definition of Done:

- Server build and API tests pass.
- `git diff --check` passes.

### UOS-7: Minimal Web Adoption For Active Surfaces

#### UOS-WEB-070 Actor Context Display For Active Routes

Stage: implementation.

Goal: show a compact actor/authority summary in the active selected-area
routes only when backend actor context exists.

Scope:

- active React web only: home/auth unchanged unless necessary
- selected-area `00`, `04`, `08`
- no reintroduction of old private workbenches

Implementation plan:

1. Read `actorContext` from existing active packets.
2. Show role/rank/scope summary in the department command brief or agent
   packet area.
3. Show blocked actions using shared notice/feedback primitives.
4. Preserve desktop/tablet/mobile layout.

Acceptance criteria:

- `00`, `04`, `08` still render.
- Mobile does not overflow.
- Missing actor context degrades gracefully.

Definition of Done:

- `npm run build:web` passes.
- Desktop and mobile proof for one route that has actor context.
- `git diff --check` passes.

#### UOS-WEB-071 Operations Recursive Task State Display

Stage: implementation.

Goal: display assignment, blocker, escalation, waiting response, returned
context, and review state in `04 Operations` once UOS-BE-042 exists.

Scope:

- `/areas?area=04-operacje&view=overview`
- reuse shared components
- no task command buttons unless backend command is implemented and approved

Implementation plan:

1. Extend Operations board row/card data mapping.
2. Add compact labels for assigned member, blocked state, escalated target,
   waiting on, returned context, and review.
3. Keep write buttons hidden or disabled with reason until command routes are
   available.
4. Prove desktop and mobile.

Acceptance criteria:

- Owner can understand recursive task state.
- Agent-blocked actions are visible.
- No fake assignment or escalation data appears.

Definition of Done:

- Web build and rendered proof pass.
- `git diff --check` passes.

#### UOS-WEB-072 `00 Main` World-State Intake Summary

Stage: implementation.

Goal: let `00 Main` show organizational world-state summary without becoming
a full admin console.

Scope:

- `/areas?area=00-ogolny&view=overview`
- consume `GET /v1/organization/world-state`
- no full frontend rebuild

Implementation plan:

1. Add a small world-state summary panel:
   workforce, blocked tasks, escalations, resource/knowledge readiness,
   department gaps.
2. Link to existing active areas or future planned areas only when routes
   exist.
3. Keep mobile summary compact.

Acceptance criteria:

- `00 Main` answers what matters across organization now.
- It does not expose raw tables or old workbenches.
- Mobile remains usable.

Definition of Done:

- Web build and desktop/mobile proof pass.
- `git diff --check` passes.

#### UOS-WEB-073 `08 Assets` Context Access Display

Stage: implementation.

Goal: show resource/knowledge context access and blocked provider actions in
`08 Assets` based on authority context.

Scope:

- `/areas?area=08-zasoby&view=overview`
- existing Assets packet plus actor context

Implementation plan:

1. Add labels for context readiness, accessible resource categories, and
   restricted/blocked provider actions.
2. Keep Drive/provider writes absent unless command contracts exist.
3. Prove mobile layout.

Acceptance criteria:

- Humans and agents can understand what knowledge/resources are safe to use.
- Blocked actions are visible and local to the Assets board.

Definition of Done:

- Web build and desktop/mobile proof pass.
- `git diff --check` passes.

### UOS-8: MCP And Agent Knowledge Consumption

#### UOS-MCP-080 Organization World-State MCP Resource

Stage: implementation.

Goal: expose organization world state to MCP clients through the same API
contract as web/mobile.

Scope:

- MCP manifest for `GET /v1/organization/world-state`
- optional MCP bridge script updates if needed
- tests/smoke

Implementation plan:

1. Add tool/resource metadata with read risk.
2. Include input schema for optional department, depth, and freshness filters
   if supported by API.
3. Prove read-only profile access and write-profile compatibility.
4. Prove insufficient scope denial.

Acceptance criteria:

- Paperclip-style agents can discover world-state context.
- They cannot use the tool without proper read capability.

Definition of Done:

- API/MCP tests pass.
- `git diff --check` passes.

#### UOS-MCP-081 Workforce MCP Resource

Stage: implementation.

Goal: expose workforce context to agents without exposing secrets or private
human data.

Scope:

- MCP manifest for workforce context
- redaction rules
- tests

Implementation plan:

1. Add MCP metadata for workforce read packet.
2. Redact email/contact fields unless explicitly allowed.
3. Include roles/ranks/supervisor/availability only as allowed by scope.
4. Prove owner and read-agent behavior.

Acceptance criteria:

- Agents can understand who owns work and where to escalate.
- Private account and secret data remain hidden.

Definition of Done:

- Tests pass.
- `git diff --check` passes.

#### UOS-MCP-082 Task Command MCP Safety Review

Stage: verification.

Goal: verify that task assignment, blocker, information, escalation, and
review commands are exposed to MCP only when capabilities and supervision
rules allow them.

Scope:

- MCP manifest
- API key profiles
- bridge smoke tests
- no new runtime behavior unless gaps are found

Implementation plan:

1. Compare every new task command capability with MCP profiles.
2. Verify read-only agent denial.
3. Verify supervised operator profile behavior.
4. Verify requires-approval metadata where relevant.
5. Record any fix as a separate implementation task.

Acceptance criteria:

- No task command is accidentally visible to read-only profiles.
- Supervised commands carry approval/supervision metadata.
- Fail-closed behavior is tested.

Definition of Done:

- Smoke/test evidence recorded.
- `git diff --check` passes.

## Future Department Expansion Contract

When a new department is added after `00`, `04`, and `08`, the backend should
update the shared system, not duplicate it:

1. Add or extend the department-specific read packet.
2. Include common packet sections from UOS-BE-051.
3. Add workforce/authority context only from shared services.
4. Add tasks only through shared task assignment/activity/read models.
5. Add resources/knowledge only through shared resource and knowledge
   contracts.
6. Add MCP exposure through the same capability manifest.
7. Add web UI only for the department's own board and only as much as needed
   to consume the packet.

## Recommended First Execution After Current Queue

After current DMS/web work is complete, start here:

1. `UOS-BE-001 Current Backend Capability Audit`
2. `UOS-BE-002 Organizational Contract Types`
3. `UOS-BE-010 Workforce Read Packet Without Migration`
4. `UOS-BE-011 People/Agents Authority Packet For 06`
5. `UOS-BE-012 Workforce Schema Decision`

This gives the team evidence before schema work and keeps the architecture
honest.
