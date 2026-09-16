# Architecture Source Of Truth

RF-RUNTIME-005B16 [controlled rebuild and split attestation](hermes-controlled-rebuild-v1.md)
is **DONE**. The unchanged exact source pin now has a verified canonical venv
with 83 original distributions, no optional AWS closure, 23,653 immutable files
and 826 separately verified generated files. Profile v5 and the sealed Worker
environment deny lazy installation. Owner identity/confirmation/expiry, private
data and B13/B14 spent records are preserved. Staging/rollback cleanup and fresh
file-only admission passed. No Hermes/model run or new activation occurred.
ADR-004 execution decision remains v9 and all six public flags remain false.
Earlier next-step/lock/launch statements below are historical.

RF-RUNTIME-005B11 [native tool boundary](hermes-native-tool-boundary-v1.md) is
implemented under ADR-004 v7's explicit same-owner residual-risk acceptance.
Profile v4, typed coding authority, canonical workspace/Writer/application leases,
bounded footprint receipts and owned-only cleanup are qualified synthetically.
Detected violations block review/release; partial observation is not isolation.
Only fresh opaque local proof removes the native-tool blocker. All six flags
remain false and real launch remains denied; B12 is source/synthetic launch
qualification only. Earlier B10 pending-acceptance text below is historical.

RF-RUNTIME-005B10 [native tool qualification](hermes-native-tool-boundary-v1.md)
is source-only complete. Recommended roost-hermes-native-audited-coding-v1 is
**BLOCKED on one owner decision**: acceptance of the disclosed same-owner native
file/shell residual risk. Public write-root checks cover guarded file writes;
reads, shell/helpers, network effects and Windows path races are not contained.
B11 implementation is proposed only after that acceptance. ADR-004 remains v6;
no runtime/private changes, real launch or activation; all six flags stay false.

RF-RUNTIME-005B9 [practical attempt policy](hermes-practical-attempt-budget-v1.md)
is implemented under ADR-004 v6: the owner accepts unavailable physical counters
and hard token/cost enforcement for the supervised pilot. coding-small-v1 uses
24 logical turns, retry setting 2, an original deadline of at most 900 seconds,
Windows Job cleanup and no automatic restart. Receipts keep unknowns null and
exit 0 is only a candidate for independent review. This supersedes B8's required
pre-dispatch budget boundary and proposed source-only B9; its source findings
below remain historical evidence. Real launch and all six flags stay false.

RF-RUNTIME-005B8 [attempt/budget qualification](hermes-attempt-budget-contract-v1.md)
is source-only complete and **BLOCKED** for a coding pilot. One Roost attempt may
contain multiple controlled model/tool exchanges. Public max-turns is not a
physical-call cap; run-budget is advisory and quiet hides internal counters and
partial/exhaustion details. Selected coding-small-v1 requires a Worker pre-dispatch
budget boundary which this CLI does not expose. No runtime/private changes or
activation; all six flags remain false. B9 is proposed qualification only.

RF-RUNTIME-005B6 [public minimal startup contract](hermes-minimal-startup-contract-v1.md)
was NOT_SUPPORTED for strict minimal startup. B7 explicitly accepts local skills
sync/banner prefetch while keeping network updates disabled. Its implemented
Ready/input-bound startup receipt validates exact argv/environment/profile/task
tools and removes only the local startup/config blocker. Real Hermes launch is
still denied; B4 residual risks and all six false runtime gates remain intact.

RF-RUNTIME-005B5 [effective-config qualification](hermes-effective-config-qualification-v1.md)
is BLOCKED: exact-pin official loader observed all explicit overrides in an identical
synthetic profile, but intercepted import/read attempts, startup initialization and
unqualified tool/rotation consumers prevent full qualification. The private negative
receipt cannot discharge the pre-spawn config blocker; all six gates remain false.

RF-RUNTIME-005C adds [native Windows owned-job v1](windows-owned-process-job-v1.md):
atomic job assignment before resume, KILL_ON_JOB_CLOSE and zero-active-process
accounting, verified with native fixture trees, nested jobs and controller crashes.
Only a fresh in-process native receipt removes the local candidate's stop blocker;
API/config declarations do not. Hermes now targets that backend, Direct is unchanged,
and all six execution/pilot/live flags remain false. Earlier raw-process stop-gap
statements below are historical for this backend. Configuration/auth/tool/turn/
budget/lifecycle gates remain. RF-RUNTIME-005B3
[same-owner profile v1](hermes-same-owner-profile-v1.md) accepts the owner's existing
Codex CLI auth and supersedes the B2 external credential-guard recommendation.
A private secret-free profile and Ready-bound byte admission checks are prepared;
B4 now qualifies auth using the owner's explicit private attestation, bound to
profile/Ready and rechecked for drift/revocation/expiry. Installed CLI help does
not prove secret-free status output, so no status command was run. No stable
account ID is required; silent account switches and unreported session loss remain
residual risks. No credential store was accessed. Separate token storage or
Restricted Token/ACL sandboxing is not required; all six gates remain false.

Current transport amendment (RF-RUNTIME-005A):
[supervised quiet v1](hermes-supervised-quiet-v1.md) retains stable Hermes 0.21.2
and removes waiting for unreleased stream-json from the first pilot prerequisites.
Sealed stdin, bounded untrusted text and dirty-byte review evidence are implemented
synthetically. Native whole-tree stop/configuration remain blocked; all six
execution/pilot/live flags remain false. Earlier stream-only evidence is historical.

[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md), accepted in
RF-RUNTIME-002, sets the current first-agent target: Roost → Windows Local Worker
→ native Hermes Agent → Codex model via Codex OAuth/subscription, one canonical
application folder. Direct CLI is an alternative; Herdr is optional observability.
Roost/Worker retain all authority, workspace, one-writer, cleanup, secrets and
review/release boundaries. [Hermes CLI adapter v1](hermes-cli-launch-v1.md) is
implemented fail-closed; all execution/pilot/live gates remain false.
Windows Sandbox/Hyper-V/disposable VM prerequisites are rejected as disproportionate;
that qualification route is deferred. The ADR-001/003 material below is historical
for provider ordering and qualification, not the current pilot dependency chain.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md), accepted in
RF-CODEX-015, selects native Windows Codex App Server for the pilot. WSL2 is a
later separately qualified profile with no automatic fallback. The
[native preflight](direct-codex-native-artifact-preflight-v1.md) remains BLOCKED;
artifact, protocol and containment qualification do not follow from platform
acceptance. Direct Worker ownership and all false runtime gates remain intact.

ADR-003 version 2, approved in RF-CODEX-022, permits a
[one-off Windows qualification environment](direct-codex-disposable-windows-environment-v1.md).
Technology is unselected; setup/probe remain unauthorized. This is not a VM
requirement for ordinary agent tasks, and never grants changes to shared host state.

The [RF-HERMES-005 adapter specification v1](direct-codex-app-server-contract-v1.md)
defines the ADR-001 target and its closed test/evidence criteria. It is a future
contract with unresolved qualification decisions, not implemented runtime or
permission to replace registry v5.

[ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md), accepted in
RF-HERMES-004, sets the pilot target to Roost control plane/API → Local Worker →
directly Codex App Server. Hermes is optional outside enforcement; OpenShell is
optional isolation. This decision changes the target architecture only: the
implemented provider registry v5 and all disabled admission gates remain intact.

[Governed task clarification](governed-task-clarification.md) provides typed specialist conversation and deterministic receipt summaries without changing task authority.

Native completed-result handoff is governed by [typed work handoff](typed-work-handoff.md):
immutable source versions and exact recipient receipts, with no implied execution
or release authority.

This document defines how architecture decisions should be treated in the
repository.

## Purpose

The `docs/architecture/` folder is the canonical record of the application's
architecture knowledge. Its authority depends on project maturity: early
projects use it to grow owner thoughts into assumptions and candidate
architecture, while mature projects use approved entries as implementation
constraints.

It records:

- system boundaries
- ownership of data and state
- module and integration contracts
- deployment shape
- technology choices that are already decided
- architecturally important product decisions that future implementation must
  preserve
- owner notes, questions, and assumptions that still need to be promoted into
  approved architecture before implementation depends on them

Treat approved entries as implementation constraints, not as loose suggestions.
Treat exploratory entries as product and architecture input that must be
clarified, scoped, and verified before coding.

## Default Rule

- Build the application to match the approved architecture.
- Do not silently change architecture during implementation.
- Do not reinterpret unclear architecture in a way that expands scope.
- If implementation exposes a gap or mismatch, stop implementation and escalate
  before changing architectural direction.
- Prefer asking for a decision over shipping an incorrect workaround.

## What Agents May Do Without Re-Approving Architecture

- implement work that fits the documented boundaries
- add clarifying detail that does not change behavior or ownership
- document discovered inconsistencies
- propose follow-up tasks that improve implementation quality inside the
  approved architecture

## What Requires Explicit User Approval First

- changing module boundaries or service responsibilities
- moving source-of-truth ownership for data or state
- replacing an approved integration pattern with another one
- changing deployment topology or runtime shape
- changing a confirmed tech-stack decision that affects architecture
- introducing a new cross-cutting pattern that contradicts existing
  architecture docs

## Mandatory Decision Flow For Mismatches

When implementation does not fit approved architecture:

1. describe the mismatch clearly
2. propose 2 to 3 valid options with tradeoffs
3. wait for explicit user decision

Agents must not self-approve a workaround or architecture rewrite.

If there is a strong argument for a better design, the agent should present the
case in conversation first, including tradeoffs and why the current
architecture may be insufficient. The agent must not self-approve the change.

## Required Architecture Files

At minimum, keep these files aligned:

- `docs/architecture/system-architecture.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/process-core-workflow-core-architecture.md`
- `docs/architecture/business-ontology-import-strategy.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/company-os-definition-editing-contract.md`
- `docs/architecture/company-os-workflow-definition-command-contract.md`
- `docs/architecture/innovation-product-engineering.md`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/architecture/local-codex-agent-runtime.md`
- `docs/architecture/relationship-graph-audit-2026-05-14.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`

Projects may add more architecture docs or ADRs, but these baseline files
should always stay current.

## CompanyCore v1 Approved Direction

The accepted [autonomy activation contract](autonomy-activation-contract.md)
refines the future organizational and release model from the September 2026
owner interview. It explicitly separates that target from the implemented V1
baseline below. Its staged gates do not grant existing workers release authority
or authorize broad rewrites; preserve one canonical clone/runtime per application
and one writing task across the laptop.

The approved v1 direction is:

- API-first product foundation with a role-governed human web console
  ClickUp setup
- CompanyCore is the company operating system, not an embedded AI system;
  humans use web UI and AI agents use API/MCP as external clients
- PostgreSQL is the source of truth
- API is the supported access layer for agents, automations, future dashboards,
  and future mobile clients
- development bootstrap registration may create a workspace; Example Company
  production uses invitation-only membership in one canonical workspace
- business data, service API keys, integration settings, and integration sync
  state are workspace-scoped
- ClickUp is the first native integration adapter
- CompanyCore should evolve toward a ClickUp-shaped operating model:
  `Workspace -> Operating Area -> Operating Folder -> Operating Table ->
  Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`
- first-party business tables should be assigned to an approved operating area;
  `00. Glowny` is the non-removable fallback area for unclassified imports,
  followed by the 12 company departments, while users, memberships, API keys,
  integration settings, provider mappings, and platform metadata remain system
  tables
- shared company tools keep one canonical module and one record identity.
  Department overviews expose scoped previews that deep-link to those modules;
  the originating department travels as a filter and never creates a parallel
  task, file, project, goal, decision, procedure, or workforce store
- provider imports must expose an explicit existing-record policy before
  writing; ClickUp supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`, with deletes limited to
  provider-owned records in the selected scope
- n8n remains optional orchestration, not the required primary ClickUp path
- schema changes should move from `prisma db push` to controlled migrations
- tests and smoke checks must prove workspace scoping and integration sync
  behavior before v1 is considered stable
- full company dashboard and mobile app are v2 scope; mobile should follow the
  web product experience
- before V2 Company City, gamification, or native mobile app work, the product
  must finish the web/backend/MCP foundation described in
  `docs/architecture/web-and-mcp-foundation-before-v2.md`: workspace selection,
  operating-area/resource navigation, relationship/integration clarity, and
  MCP workspace-safe usability
- CompanyCore's long-term product architecture is an AI-first organizational
  operating system where vertical hierarchy and horizontal processes coexist.
  The accepted direction is recorded in
  `docs/architecture/organizational-architecture-bridge.md` and must guide
  future schema, MCP, web, mobile, Codex, governance, knowledge, KPI, and
  organizational graph work without bypassing scoped task contracts or existing
  Company OS boundaries.
- CompanyCore's unified organizational operating-system direction is recorded
  in `docs/architecture/unified-organizational-operating-system.md`. Humans
  and AI agents are both organizational workforce members in the target model:
  they can receive work, report progress, belong to departments, exist in a
  hierarchy, hold role/rank-derived permissions, use procedures, access
  resources, escalate issues, and communicate organizationally. This extends
  the current `users`, `agents`, `company_roles`, `business_functions`,
  `tasks`, workflow, approval, event, audit, API, and MCP foundations without
  authorizing a broad schema rewrite.
- CompanyCore should scale through model-level business modules recorded in
  `docs/architecture/companycore-business-module-map.md`. Future views and
  agent tools should derive from those modules and classify work as native
  core, provider-backed, future adapter, or derived view before adding schema,
  API, UI, or MCP surfaces.
- CompanyCore/Roost Process Core is recorded in
  `docs/architecture/process-core-workflow-core-architecture.md`. Pipelines,
  stages, transitions, workflow items, procedures, checklists, evidence logs,
  approval policies, blueprints, linked assets, and agent runtime contexts
  are shared system capabilities, not department-local screens. Future agents
  must preserve the boundary that Roost is the source of truth and local Codex
  Agent Hosts are supervised execution clients using the workspace-scoped API.
- Roost's approved Codex execution topology is recorded in
  `docs/architecture/local-codex-agent-runtime.md`. Production Roost and its
  private PostgreSQL database run on the VPS. Local Roost development uses a
  separate local PostgreSQL database. A Windows Agent Host makes outbound HTTPS
  calls to claim production work, runs Codex against explicitly mapped local
  repositories, and reports events/results to Roost. Codex and local backends
  never connect directly to production PostgreSQL; databases are not synced.
- Business ontology imports are governed by
  `docs/architecture/business-ontology-import-strategy.md`. APQC PCF,
  SIPOC, organization-chart CSV, role/ACL mapping, and one-page SOP templates
  are accepted as future input sources for process classification,
  responsibility ownership, workforce hierarchy, agent planning context, and
  validation. They must map into existing CompanyCore processes, roles,
  workforce, capabilities, approvals, knowledge, and audit foundations before
  new tables or autonomous authority are added.
- CompanyCore's global business flow is recorded in
  `docs/architecture/companycore-global-business-flow.md`. Future CRM,
  marketing, product/service delivery, finance, support, feedback, and
  improvement work should derive from the 13-stage value pipeline before
  adding runtime surfaces.
- Roost's application definition, Product Engineering, productization,
  capability, evidence, readiness, and agent-context domain is recorded in
  `docs/architecture/innovation-product-engineering.md`. `Application` is the
  shared product identity across Innovation and Products & Services; projects,
  tasks, processes, and procedures remain shared execution mechanisms.
- CompanyCore V1 department views should become department management systems
  as recorded in
  `docs/architecture/department-management-systems-architecture.md`. Each of
  the 13 areas is a scalable management system over shared tables, pipelines,
  tasks, knowledge, resources, metrics, decisions, governance, and AI/MCP
  tools, not a separate database or provider-led app.
- The V1 implementation blueprint for the 12 operating department systems and
  `00 Main` orchestration is recorded in
  `docs/architecture/department-management-systems-v1-blueprint.md`. Future
  department web/backend work should use that document to define each
  department's purpose, subsystems, shared backend reuse, backend gaps, agent
  packet, safe actions, and recommended implementation order before coding.

## Implementation Contract

Native owner-reserved and ordinary delegated Decisions use the existing Decision,
workforce and department relations under the
[RF-CTX-018 contract](delegated-decision-authority.md). There is no parallel company
hierarchy, semantic classifier or authority inferred from job-title prose.

Before architecture-impacting work is marked complete, confirm:

- the task still fits the approved architecture
- any deviation was explicitly approved
- the architecture docs and implementation remain synchronized
- no workaround path was introduced to bypass architecture constraints
- existing mechanisms were reused before proposing new structures
