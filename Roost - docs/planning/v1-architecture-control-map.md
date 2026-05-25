# V1 Architecture Control Map

Last updated: 2026-05-10

## Purpose

This document is the control map for finishing CompanyCore as a real Company
OS instead of continuing as a sequence of isolated fixes.

It answers:

- what exists now
- where the architecture says the product must go
- what is complete for local V1
- what is blocked by external credentials or repository permissions
- what should be built next
- how future agents should avoid reworking the same small surface repeatedly

The source-of-truth order remains:

1. `docs/architecture/`
2. `.codex/context/PROJECT_STATE.md`
3. `.codex/context/TASK_BOARD.md`
4. `.agents/state/*`
5. `docs/planning/*`
6. `docs/operations/v1-code-surface-index.md`
7. `docs/operations/v1-function-coverage-ledger.csv`
8. `docs/operations/v1-function-coverage-audit.md`
9. `docs/operations/v1-project-control-system.md`

This map does not replace those files. It connects them into one readable
execution view.

## Product Target

CompanyCore is the operational control plane for LuckySparrow. The target is a
policy-driven, auditable Company OS for human operators and AI agents.

The intended system shape is:

```text
Human / Agent / Integration
  -> MCP bridge or HTTP API
  -> CompanyCore capability, policy, approval, event, and audit boundary
  -> PostgreSQL source of truth
  -> provider adapters such as ClickUp and Google Drive
```

Agents should not talk directly to PostgreSQL, provider APIs, or raw secrets.
They should operate through CompanyCore MCP tools or HTTP routes, using scoped
service keys, role-appropriate capabilities, approvals, and auditable
lifecycle commands.

## Current V1 Verdict

Local architecture-derived V1 implementation is substantially complete for the
approved Company OS foundation and agent-access direction.

The current local product includes:

- workspace ownership and auth boundary
- workspace-scoped service API keys
- scoped capabilities and MCP profiles
- MCP manifest and stdio bridge
- Company OS data foundation
- runtime evidence foundation
- governance intelligence foundation
- command-shaped approval lifecycle
- command-shaped stage lifecycle
- automation evaluator that reuses lifecycle commands
- ClickUp adapter, webhook, sync, maintenance, write-back, and comments bridge
- Google Drive persistence, OAuth settings, import/read/create/edit/freshness
  foundation
- provider-neutral operating model registry
- React Company OS cockpit
- React `/areas` as the canonical operating-area workbench
- typed business record editor surfaces for key first-party records
- owner-console smoke harness and repeatable MCP smoke harness

The project should not be treated as "just a task manager". Its implemented
shape already follows:

```text
Process -> Pipeline -> Stage -> Procedure -> Step
PipelineRun -> StageRun -> Approval / AcceptanceCriteria / AuditLog
Event stream observes the workflow
Policy / Risk / Control / Metric / Knowledge / DecisionLog govern it
ToolAdapter / IntegrationCapability / Resource abstract providers
MCP exposes safe agent tools over the HTTP boundary
```

## External Blockers

These are not local implementation blockers. They require credentials,
provider consent, or repository access.

| ID | Area | Status | Why it is external | Resume condition |
| --- | --- | --- | --- | --- |
| AGRUN-007 | Google Drive owner consent and first import | Closed | Production owner OAuth and selected-root import were completed on 2026-05-14. | Keep protected Drive import/readback smoke in release validation when Drive contracts change. |
| AGRUN-010 | Paperclip/OpenJarvis upstream source merge | Blocked | Branch pushes failed with GitHub `403`. | Upstream write access or approved fork/PR route exists. |
| KI-002 | GitHub-to-Coolify auto-deploy proof | Monitoring/P2 | Available tools do not expose webhook administration and local `gh` is unavailable. | A push-to-running-image smoke or approved deploy automation tool exists. |

These must remain visible, but they should not cause local agents to reopen
completed runtime or architecture work.

## Local V1 Completion Boundary

The local V1 boundary is complete when all of the following are true:

- architecture docs describe the current runtime accurately
- task board and planning queue expose only real next actions
- local implementation has no unowned P0/P1 architecture-derived blockers
- external blockers are explicitly separated from local work
- validation commands are known and current
- future agents can continue from repository files without hidden chat memory

As of this audit, the remaining local action is project-control work, not a
missing runtime subsystem:

1. keep this control map current
2. convert future work into capability-led slices instead of broad "continue"
   loops
3. maintain a small canonical `NOW/NEXT` queue

## Implemented Capability Map

| Capability lane | Current state | Evidence files |
| --- | --- | --- |
| Workspace/auth boundary | Implemented: owner registration/login, workspace bootstrap, bearer auth, service API keys. | `src/auth/`, `src/modules/auth/`, `src/modules/api-keys/`, `src/tests/api.test.ts` |
| Capability enforcement | Implemented: route capabilities, scoped key profiles, MCP-specific profiles. | `src/auth/capabilities.ts`, `src/auth/agent-key-profiles.ts`, `docs/operations/mcp-agent-runtime-setup.md` |
| MCP agent access | Implemented: manifest, stdio bridge, smoke harness, runtime setup docs. | `src/mcp/`, `src/modules/mcp/`, `scripts/companycore-mcp-server.mjs`, `scripts/companycore-mcp-smoke.mjs` |
| Company OS definitions | Implemented: roles, processes, pipelines, stages, procedures, resources, adapters, capabilities, standards. | `prisma/schema.prisma`, `prisma/seed.ts`, `docs/architecture/system-architecture.md` |
| Runtime evidence | Implemented: pipeline runs, stage runs, approvals, checklists, criteria, audit logs, events. | `prisma/schema.prisma`, `src/modules/company-os/` |
| Governance intelligence | Implemented: policies, metrics, risks, controls, knowledge, decision logs, automation rules, triggers, artifacts, dependencies, functions, stakeholders. | `prisma/schema.prisma`, `src/modules/company-os/` |
| Approval lifecycle | Implemented through command routes with event/audit evidence. | `src/modules/company-os/company-os.routes.ts`, `src/modules/events/event.service.ts` |
| Stage lifecycle | Implemented and extracted into shared command functions. | `src/modules/company-os/company-os.routes.ts` |
| Automation evaluator | Implemented for event-based rule evaluation, proposal evidence, approval requests, emitted events, and lifecycle proposals. | `src/modules/company-os/company-os.routes.ts`, `docs/architecture/system-architecture.md` |
| ClickUp adapter | Implemented native adapter, webhooks, inbox retry, maintenance, write-back, comments bridge. | `src/integrations/clickup/`, `src/modules/clickup-*`, `docs/operations/v1-release-readiness.md` |
| Google Drive adapter foundation | Implemented and proven with production owner consent/import for the numbered department roots. | `src/modules/google-drive/`, `src/integrations/google-drive/`, `docs/operations/google-drive-owner-setup.md`, `docs/operations/agent-runtime-coverage-ledger.csv` |
| Operating model registry | Implemented with areas, folders, tables, resources, mappings, storage, knowledge roots, automations. | `prisma/schema.prisma`, `src/modules/operating-model/`, `src/operating-model/catalog.ts` |
| Owner UI | Implemented hybrid owner console plus React routes; `/areas` is now React canonical. | `public/`, `web/src/main.tsx`, `web/src/react-route-kit.tsx`, `src/app.ts` |
| Business record editing | Implemented for notes, projects, clients, task lists, and tasks; generic read surfaces exist. | `public/app.js`, `src/modules/*`, `docs/planning/mvp-next-commits.md` |
| Deployment operations | Implemented manual deploy/rollback/smoke docs; auto-deploy proof remains P2. | `docs/operations/` |

## Main Drift Risks

These are the patterns that can cause future agents to circle:

1. Treating old historical checklist items as active work.
2. Reopening completed V1 runtime scope because a newer idea exists.
3. Mixing external blockers with local implementation gaps.
4. Adding backend routes when existing route composition is sufficient.
5. Building UI polish before checking whether the capability is already
   present through API/MCP.
6. Treating MCP as a separate source of truth instead of a bridge over the HTTP
   API.
7. Editing architecture docs as a substitute for implementation evidence.

Future work must first classify itself into one of these buckets:

- local V1 blocker
- external blocker
- V1 control/documentation
- V2 product expansion
- blocked upstream handoff
- release automation

If the work is not a local V1 blocker, it must not be described as blocking
V1.

## V1 Success Definition

The phrase "V1 architecture is done" is valid only with this scope:

```text
All local architecture-derived V1 implementation slices are complete for the
approved Company OS, ClickUp, MCP, agent-access, operating-model, and owner UI
scope. Remaining items are external blockers or post-V1/V2 expansion choices.
```

It is not valid to claim:

- every future provider adapter is complete
- all Google Drive production owner import evidence exists
- upstream Paperclip/OpenJarvis repositories have accepted changes
- GitHub-to-Coolify auto-deploy is proven
- the whole future Company OS product vision is finished

## Target State After V1

After local V1 completion, the product should move into V2 through deliberate
lanes, not random fixes.

### Lane A: Agent-First Company OS

Goal: make agents productive through MCP while CompanyCore enforces policy,
approvals, events, and audit.

Next candidate work:

- expose more command-shaped MCP tools only when the HTTP lifecycle route
  already exists
- add agent role dashboards and action queues
- add approval-needed and blocked-work queues per agent role
- add policy checks before more external write actions

### Lane B: Operational Cockpit

Goal: give the human owner one live cockpit for the autonomous company.

Next candidate work:

- canonicalize more React routes after parity checks
- add cross-surface dashboard links from Company OS to areas, approvals,
  tasks, Drive, and integrations
- show end-to-end pipeline health and automation evidence
- add runbook-style operator actions for blocked automations

### Lane C: Provider Adapter Expansion

Goal: add providers through `ToolAdapter` and `IntegrationCapability`, not
one-off integrations.

Next candidate work:

- complete real Google Drive consent/import when credentials exist
- add Gmail/Calendar/GitHub/Coolify/n8n only through adapter capability
  records and audited actions
- keep provider APIs behind CompanyCore routes and lifecycle commands

### Lane D: Data Quality And Coverage

Goal: know exactly which tables, routes, and UI surfaces are complete,
verified, partial, or external.

Completed control artifacts:

- `docs/operations/v1-code-surface-index.md`
- `docs/operations/v1-function-coverage-ledger.csv`
- `docs/operations/v1-function-coverage-audit.md`
- `docs/operations/v1-project-control-system.md`

Next candidate work:

- keep active queues derived from the ledger
- close evidence gaps before opening new feature lanes
- treat blocked external rows as release risks, not local implementation gaps

## Execution Rules From This Point

1. Always start from the active queue:
   `.codex/context/TASK_BOARD.md` and `docs/planning/mvp-next-commits.md`.
2. If the next task is broad, split it into a decision task and one vertical
   implementation slice.
3. Do not add a new API when an existing API plus route-kit composition solves
   the need.
4. Do not call something a V1 blocker unless it is local, architecture-derived,
   and unimplemented.
5. Do not mark external provider work complete without target-environment
   evidence.
6. Do not change source-of-truth ownership: PostgreSQL remains source of truth,
   HTTP API remains the policy boundary, MCP remains a bridge.
7. Every meaningful change updates at least one source-of-truth state file.

## Recommended Next Queue

### NOW

1. `V1CTRL-002 Canonical Queue Cleanup`
   - Reduce `docs/planning/mvp-next-commits.md` to a current active queue plus
     historical archive pointers.
   - Keep blocked external items visible but separate.

### NEXT

1. `V1EVID-001 Company OS Lifecycle Trace Smoke`
   - Exercise approval request/decision, stage start/validate/complete,
     automation evaluator, event readback, and audit readback in one local
     Docker trace.
   - Close the highest-risk evidence gaps in the function coverage ledger.

2. `V1EVID-002 Operating Model Registry Lifecycle Smoke`
   - Verify folder, storage location, knowledge root, and automation
     definition lifecycle APIs.

3. `V2PLAN-001 V2 Product Lane Selection`
   - Choose the next product lane: agent-first Company OS, operational
     cockpit, provider expansion, or data quality.

### BLOCKED

1. `AGRUN-007 Google Drive Owner Consent And First Import`
2. `AGRUN-010 Upstream Agent Source Merge Execution`
3. `KI-002 GitHub-to-Coolify Auto-Deploy Proof`

## Handoff For Future Agents

When resuming this project:

1. Read this file after `PROJECT_STATE.md` and `TASK_BOARD.md`.
2. Do not scan historical done lists as if they were active work.
3. Pick the first `READY` task from the active board.
4. If no task is ready, derive work from the recommended next queue above.
5. Keep the claim of V1 completion scoped to local architecture-derived work,
   with external blockers explicitly separated.
