# Current Focus

Last updated: 2026-05-24

## Active Focus

Current execution focus is ARCH-EVID-002 continuation as a release-quality
maintenance gate for the CSV-first architecture nervous system. The runtime is
currently green and deterministic (`443` nodes / `755` relations / `34`
chains, evidence queue `0`, chain worklist `0`, chain coverage `33/33`,
delta `0/0/0`, report-presence `31` artifacts). The coordinator lane is
actively maintaining source-of-truth parity across mission/state/board files
while keeping `npm run architecture:refresh` and `npm run validate` as hard
acceptance gates.

In parallel, the next feature-delivery candidate remains
`DMS-NEXT-004` (Relationships Management read packet and board), but it should
only be activated when architecture maintenance stays green and no new queue
gaps appear in generated status artifacts.
Backend context-packet foundation for `DMS-NEXT-004` is now complete:
`GET /v1/relationships/context` is implemented and verified; remaining scope
was the department board surface over this read packet, now implemented and
verified at `/areas?area=05-relacje&view=overview`.

Current DMS focus: the first `00 Main` intake API/web panel, proposal-only
route command, shared department shell, department subsystem registry, Finance
system spec, commercial exception runtime API, Finance context runtime API,
DMS-00-007 Paperclip background output review proof, DMS-SHELL-003 department
data backbone, DMS-07-003 read-only Finance web board, DMS-04-001 Operations
real-data proof, V1DATA-001 Data Evidence Browser, V1REL-001 Area
Relationship Provenance Review, V1KNOW-001 Selected Area Knowledge Depth, and
V1AREATASKS-001 Selected Area Tasks Depth are verified locally. The next active
slice is `/react-company-os` area-aware foundation polish so Company OS
evidence can be understood from department context without adding new command
authority.

WEBFOUND-002/003/004, WEBFOUND-005, WEBFOUND-007, WEBFOUND-008A, WEBFOUND-008B, WEBFOUND-009, WEBFOUND-010, WEBFOUND-011, WEBFOUND-012, WEBFOUND-013, WEBFOUND-014, ACF-MAINT-001, V2VIS-001, and ACF-PROD-001 are now complete. The
pre-V2 foundation has token-scoped multi-workspace owner switching, a workspace
selector, area-resource sidebar inventory, responsive drawer proof,
keyboard/focus-hardened sidebar behavior, a durable relationship graph audit,
a read-only relationship graph API, graph-backed relationship workbench UI,
an integration readiness dashboard for providers, graph evidence, and MCP,
API key workspace/risk/MCP tool preview before key creation,
canonical shell access to the agent tool surface without a separate React nav
taxonomy,
repeatable AI-ready smoke coverage for scoped MCP keys, manifest visibility,
relationship graph reads, and default guarded-command blocking,
and a V2 readiness gate that approves visual planning while keeping direct V2
implementation gated,
plus a canonical V2 visual implementation plan for shell, Company City,
command brief, status strip, route migration, responsive behavior, and proof,
and the first maintainability split that extracted the relationship workbench
from the monolithic vanilla app,
plus the first dashboard Company map frame that turns workspace, area,
relationship, integration, task, and MCP signals into one responsive command
surface,
and an explicit product decision not to seed fake projects, storage locations,
knowledge roots, or automation definitions before V2. Company City, game-like
visuals, gamification, and native mobile remain V2 scope after the
web/backend/MCP foundation gate.

CompanyCore v1 runtime is accepted and live for the approved owner, ClickUp,
Jarvis, Paperclip, workspace API, and agent CRUD scope. The current focus has
expanded to the Company OS data foundation requested on 2026-05-09 while
preserving the owner-console UX/UI polish queue after the 2026-05-08 audit in
`docs/ux/companycore-v1-ux-ui-audit.md`. The active UXA-002 through UXA-031
polish, framework-foundation, React route-kit migration, V1 architecture
completion audit, function coverage ledger, and canonical queue cleanup wave
is complete; V1EVID-001 and V1EVID-002 are verified. V2PLAN-001 selected
Agent-First Company OS as the next V2 lane. V2AGENT-001 audited the MCP/HTTP
command surface, V2AGENT-002 corrected the read-only Company OS reader
profile, V2AGENT-003 designed fail-closed handling for risky MCP tools, and
V2AGENT-004 implemented the default bridge guard. V2AGENT-005 added the
supervised-operator MCP smoke harness. No active local V1 evidence tasks
remain. V1CLOSE-001 published
`docs/operations/v1-achievement-and-blocker-handoff.md` so the V1 achievement
boundary and external blockers are visible from repository state. AGRUN-007 is
verified in production as of 2026-05-14: Google Drive OAuth is active,
protected smoke passes, owner folder discovery returns 172 folders, and the
numbered department roots `00`-`12` are imported and scoped with descendant
verification. V2AGENT-006
added an agent command queue to the Company OS cockpit from existing context
data; V2AGENT-006R verified the rendered queue with a temporary mock `/v1`
server and system Chrome dump-DOM proof. V2WEB-ARCH-001 then recorded
`docs/planning/human-agent-web-architecture-map.md`, recognizing that the UI is
not yet a complete human-grade mirror of the agent/MCP architecture and
selecting V2WEB-AGENT-001 Agent Tool Surface Workbench as the next web slice.
V2WEB-AGENT-001 is now implemented and verified: `/react-agent-tools` exposes
the MCP tool manifest to the owner by route family, capability, risk level,
and approval requirement. The next human-agent web slice is a Company OS
correlation timeline. V2WEB-AGENT-002 is now implemented and verified:
`/react-company-os` shows a correlation timeline that turns recent event and
audit records with a shared `correlationId` into one ordered evidence chain.
V2WEB-AGENT-003 is now implemented and verified: `/react-company-os` shows an
operating graph detail panel that connects selected operating-area tables,
provider paths, Company OS resources, policies, risks, automation rules, recent
runs, and correlation evidence from existing read contracts. The next slice is
Workflow-Grade Command Panels. V2WEB-AGENT-004 is now implemented and
verified: approval, stage lifecycle, and automation command panels show
readiness, expected result, recovery guidance, and automation proposal/effect
evidence while preserving existing command routes. V2WEB-AGENT-005 is now
implemented and verified: Company OS definition editing classes and safety
contracts are documented in architecture source of truth. V2WEB-AGENT-006 is
now implemented and verified: `standards` has audited
`company-os:definition:write` create, update, and archive routes plus MCP
manifest exposure. V2WEB-AGENT-007 and V2WEB-AGENT-007R are now implemented
and verified: `/react-company-os` includes a narrow Standards Definition
Editor Web Surface and a clean Playwright Chromium proof confirms render plus
create interaction. V2WEB-AGENT-008 is now complete: workflow definition
editing has a command/version/impact-preview architecture contract.
V2WEB-AGENT-009 is now implemented and verified: workflow definition drafts
can be created, updated, idempotently replayed, and impact-previewed with
audit/event evidence and capability/MCP gating. V2WEB-AGENT-010 is now
implemented and verified: procedure drafts can activate into a new approved
active version with rollback candidate evidence. V2WEB-AGENT-011 is now
implemented and verified: process and pipeline roots use
`workspaceId + name + version` uniqueness and can activate into new approved
versions with audit/event evidence. V2WEB-AGENT-012 is now implemented and
verified: `/react-company-os` exposes a guarded workflow draft command surface
for process, pipeline, and procedure roots with create, preview, approval, and
activation gating. V2WEB-AGENT-013 is now complete: workflow draft
history/readback was selected before archive/rollback so interrupted workflow
edits can be resumed after reload or agent handoff. V2WEB-AGENT-014 is now
implemented and verified: authorized owners can list/read draft workflow
definition records, the cockpit shows only open drafts for the selected root
type, and resume restores the selected draft into the command panel while
read-only sessions fail closed. V2WEB-AGENT-015 is now complete: archive and
rollback recovery commands are approved as phased command routes, with
inactive historical-version archive first and rollback implemented later as
rollback-draft creation through existing preview and activation. V2WEB-AGENT-016
is now implemented and verified: inactive historical workflow root versions
can be archived through an audited command route, while active versions and
roots with active runtime dependencies fail closed. V2WEB-AGENT-017 is now
implemented and verified: rollback creates a normal draft from a historical
source version, records rollback source metadata, generates impact preview,
and leaves activation as a separate command. V2WEB-AGENT-018 is now complete:
workflow recovery controls should live in a dedicated panel separate from
normal draft creation. V2WEB-AGENT-019 is now implemented and verified:
`/react-company-os` exposes Recovery controls for inactive historical versions,
with archive and rollback-draft actions that preserve backend gates and load
rollback drafts into the existing preview/activation flow. V2WEB-AGENT-020
and V2WEB-AGENT-021 are now implemented and verified: workflow roots have
explicit `family_id` lineage, activation copies lineage into new active
versions, and rollback-draft creation resolves the current active target by
family so renamed historical versions can recover safely. The next slice is
V2WEB-AGENT-022 Company OS Collection Fetch Alignment for the pre-existing
generic `/v1/{collection}` 404s seen in the recovery render proof.
V2WEB-AGENT-022 is now implemented and verified: shared table-record path
resolution routes Company OS collection slugs through
`/v1/company-os/:collection`, and the mock render proof for
`/react-company-os` reported no generic Company OS requests, no 404s, and no
console errors. The next slice is V2WEB-AGENT-023 Workflow Recovery End-To-End
Activation Proof.
V2WEB-AGENT-023 is now implemented and verified: the workflow recovery panel
keeps local draft state through rollback draft creation, impact preview,
approval request, inline audited approval decision, and activation. The next
slice is V2WEB-AGENT-024 Workflow Recovery Real Backend Proof if local
Docker/database access is available.
V2WEB-AGENT-024 is now implemented and verified: the same workflow recovery
journey passed against a disposable Docker Compose backend on
`http://127.0.0.1:3104`, and the stack plus volume were removed after proof.
No local Company OS workflow recovery task remains ready.

## Current System Objective

Optimize for source-of-truth clarity, no regression, correct owner workflows,
and application completion. The WEBFOUND queue and first maintainability split
are complete. The immediate objective is ACF-MAINT-002 Additional Hotspot
Modularization unless the user reprioritizes the next dashboard/shell
convergence audit, because the first V2VIS dashboard frame is verified and the
remaining large-file hotspots still slow safe delivery.

## Current Delivery Stage

Post-verification / V2 lane entry. V1 operator handoff remains documented in
`docs/operations/v1-operator-handoff.md`; release readiness is documented in
`docs/operations/v1-release-readiness.md`. Runtime work is not being reopened.
The UX audit implementation lane `UXA-002..UXA-031` is complete.
UXA-002 closed the private-route screenshot evidence gap with a local
Playwright harness, and UXA-003 tightened the dashboard command surface.
UXA-004 reordered mobile auth so login/register forms appear before static
onboarding context.
UXA-005 clarified visual roles across filters, lists, selected details, and
compact dense rows.
UXA-006 added local action feedback placement for auth, ClickUp, and Google
Drive setup/import while preserving typed editor and API key local feedback.
UXA-007 compressed the authenticated mobile topbar so private route content
starts earlier while drawer navigation and sign-out remain available.
UXA-008 added local Phosphor dashboard iconography and canonical
management-first UX rules.
UXA-009 added the React + Vite + Tailwind + DaisyUI foundation and a
framework-backed `/react-dashboard` route.
UXA-010 added the `companycore` DaisyUI theme, live `/v1/connection` loading,
and reusable React dashboard primitives on `/react-dashboard`.
UXA-011 added reusable React/DaisyUI table and local-notification primitives,
live operating-model preview rows, and a repeatable React build cleanup step.
UXA-012 added `/react-tasks` as the first real React workbench route with live
`/v1/tasks` data, task metrics, filters, local states, and reusable table
rendering while preserving vanilla task routes.
UXA-013 decided to keep `/react-tasks` as a parallel route until one more React
workbench proves migration parity.
UXA-014 added `/react-integrations` as a parallel React integration map with
provider/data-path cards, readiness guidance, filters, and a 12-area coverage
table while preserving `/settings/integrations`.
UXA-015 decided not to switch canonical routes yet because vanilla routes still
own broader setup/editor affordances. UXA-016 added
`web/src/react-route-kit.tsx` so shared React route state, API loaders, shell,
notices, metrics, and table primitives are available before the next workbench
migration. UXA-017 added `/react-areas` as the third parallel React workbench,
using `/v1/connection` for live operating-area coverage, filters, metrics,
coverage cards, signed-out/signed-in states, and desktop/mobile-safe table
rendering. UXA-018 decided not to switch canonical vanilla routes yet because
the React previews have strong read/filter parity but not full owner action,
setup, edit, and mapping parity. The next React slice should improve
`/react-areas` mapping parity without replacing `/areas`. UXA-019 added
provider scope, Drive folder scope, and ClickUp execution-scope signal cards
to `/react-areas`, with links back to the current canonical owner action
surfaces.
UXA-020 decided that `/react-areas` does not need a new backend read API yet:
existing `/v1/operating-model/external-mappings` and `/v1/google-drive/files`
routes are the correct source of truth. The next slice should compose those
existing contracts in React route-kit state and enrich `/react-areas` with real
relationship data.
UXA-021 added that route-kit composition: `/react-areas` now loads external
provider mappings and Google Drive files from existing endpoints, shows real
provider/Drive ownership counts, and exposes provider plus Drive review queues.
UXA-022 decided not to switch canonical `/areas` to `/react-areas` yet because
React has read/review parity but not direct provider and Drive scope assignment
controls. The next small step is UXA-023, adding those controls to React using
the existing PATCH endpoints.
UXA-023 added those React assignment controls: `/react-areas` provider and
Drive review queues now expose operating-area selectors that call the existing
scope PATCH endpoints, show local feedback, and refresh the React workbench.
UXA-024 decided not to switch canonical `/areas` yet because React still lacks
user-created area lifecycle controls, selected-area record previews, and
reassignment controls for already assigned provider/Drive items. The next small
step is UXA-025, adding area lifecycle controls to React using existing
operating-model endpoints.
UXA-025 added those lifecycle controls: `/react-areas` can create user-created
operating areas and delete them with safe reassignment through the existing
operating-model endpoints, while system areas remain protected. The next small
step is UXA-026, deciding the selected-area context parity slice for record
previews and reassignment of already assigned provider/Drive items.
UXA-026 selected the existing typed table endpoints `/v1/{apiSlug}` as the
record preview source contract for React selected-area context. No new backend
route is needed for the next slice. The next small step is UXA-027, loading
those table records in the React route kit and rendering selected-area context
in `/react-areas`.
UXA-027 added the selected-area context panel and capability-filtered table
record snapshot loading in the React route kit. `/react-areas` now shows table
counts, record previews, assigned Drive items, and assigned provider mappings
for the selected area without backend/schema changes. The next small step is
UXA-028, adding reassignment controls for already assigned provider/Drive items
inside that selected context.
UXA-028 added those reassignment controls inside selected context and verified
provider plus Drive scope changes through API readback. The next small step is
UXA-029, deciding whether `/react-areas` can now safely replace canonical
`/areas`.
UXA-029 approved the canonical route switch. React areas now covers the
required operator workflow, so the next small step is UXA-030: serve the React
workbench at `/areas` while preserving `/react-areas` as an alias and keeping
vanilla code available for rollback.
UXA-030 switched canonical `/areas` to the React areas workbench, kept
`/react-areas` as an alias, and preserved the vanilla code for rollback. The
next small step is UXA-031, a V1 architecture completion audit before claiming
all architecture-derived local V1 steps are complete.
UXA-031 published `docs/planning/v1-architecture-control-map.md`, separating
completed local V1 architecture work from external blockers and V2 expansion
lanes. V1CTRL-001 then added
`docs/operations/v1-code-surface-index.md`,
`docs/operations/v1-function-coverage-ledger.csv`, and
`docs/operations/v1-function-coverage-audit.md` so future work can be selected
from a module-by-module confidence index. V1CTRL-002 then split
`docs/planning/mvp-next-commits.md` into a small active queue and historical
archives, and added `docs/operations/v1-project-control-system.md` as the
daily state-reading protocol. V1EVID-001 then added and ran the local Docker
Company OS lifecycle trace smoke, proving approval request/decision, stage
start/validate/complete, automation dry-run/execute, event readback, and audit
readback in trace `v1evid-1778458446081`. V1EVID-002 then added and ran the
local Docker operating-model registry smoke, proving folder, storage location,
knowledge root, and automation definition create/read/update/delete, aggregate
readback, deleted-resource `404` readback, and cross-workspace deny checks in
trace `v1evid-om-1778459014284`. No active local V1 evidence tasks remain.
V2PLAN-001 selected Agent-First Company OS as the next deliberate product lane
because the strongest verified base is the existing MCP bridge plus audited
Company OS approval, stage, automation, event, and audit commands. The next
small step is V2AGENT-001, auditing existing HTTP lifecycle commands, MCP
manifest coverage, capabilities, event/audit evidence, and documentation
before adding any V2 runtime behavior. V2AGENT-002 then removed approval write
scopes from `mcp_company_os_reader` and verified profile-created reader keys
cannot see or call approval write tools. V2AGENT-003 then defined
approval-aware handling for MCP tools marked `requiresApproval`: safe reads
continue, risky tools fail closed by default, and supervised mode must be
explicit. V2AGENT-004 implemented that bridge guard and verified safe read plus
blocked risky-tool behavior. V2AGENT-005 then verified the supervised operator
path: the same risky MCP stage-completion tool remains blocked by default, and
only reaches HTTP validation when
`COMPANYCORE_MCP_COMMAND_MODE=supervised_operator` is explicit.
CCOS-001 added the Stage 1 Company OS data foundation for processes,
pipelines, enriched stages, procedures, procedure steps, roles, resources,
tool adapters, integration capabilities, standards, and LuckySparrow seed
pipelines. CCOS-002 added runtime evidence for pipeline runs, stage runs,
approvals, checklists, acceptance criteria, audit logs, and correlated events.
CCOS-003 added governance intelligence for policy, metric/KPI, risk, control,
knowledge, decision-log, automation-rule, trigger, artifact, dependency,
department, and stakeholder foundations. UXA-016 extracted shared React route
helpers before the next workbench migration.
CCOS-003 then added that governance intelligence foundation. CCOS-004 added a
workspace-scoped read-only Company OS API at `/v1/company-os`, including the
`company-os:read` capability, cockpit snapshot, and allowlisted collection
reads for Stage 1-3 records. The next Company OS slice is CCOS-005 dashboard
surface work on top of that API. CCOS-005 added `/react-company-os` as the
first cockpit surface for definition, runtime, governance, attention, adapter
health, and recent evidence signals from `/v1/company-os`. CCOS-006 added
read-only collection previews for pipelines, approvals, audit logs, risks,
and tool adapters inside that cockpit. CCOS-007 added selected-record detail
inspection backed by `/v1/company-os/:collection/:id` while keeping lifecycle
write actions closed. CCOS-008 added a read-only MCP-oriented agent operating
packet that summarizes tasks, pipelines, procedures, tool adapters, policies,
acceptance criteria, and approval pressure from existing API routes. CCOS-009
documented the first command-shaped approval lifecycle routes and fail-closed
rules before backend implementation. CCOS-010 implemented those approval
request and decision backend commands with capability gates, event emission,
audit logs, and integration coverage. CCOS-011 added owner-facing approval
request and decision controls in the Company OS cockpit using those command
routes. CCOS-012 documented the next command-shaped stage lifecycle actions:
start, block, validate, and complete with approval and acceptance criteria
gates. CCOS-013 implemented those stage lifecycle backend commands with
capability gates, MCP manifest exposure, event/audit evidence, active-stage
conflict checks, approval gates, acceptance-criteria validation, and
integration coverage. CCOS-014 added owner-facing start, block, validate, and
complete controls to the Company OS cockpit using those audited command
routes, shared React route-kit clients, local action feedback, and context
refresh. CCOS-015 documented the automation execution contract: normalized
events trigger active rules, rules produce action proposals, and execution
must use approval requests or existing lifecycle commands with idempotency,
MCP capability, event, and audit boundaries. CCOS-016 implemented the first
audited automation evaluator route with `dry_run` and `execute`, MCP manifest
exposure, idempotency evidence, `request_approval` and `emit_event` execution,
and fail-closed evidence for lifecycle proposals until shared helper reuse is
available. CCOS-017 added owner-facing evaluator controls to the Company OS
cockpit, using recent cockpit events, automation rules, dry-run/execute mode,
idempotency input, local feedback, and result metrics over the audited backend
route. CCOS-018 documented the shared lifecycle command service direction so
automation can later execute start/block/validate/complete proposals by
reusing the same transition checks, approval gates, events, and audit logs as
the HTTP routes. CCOS-019 extracted that route logic into shared internal
command functions while preserving the HTTP route behavior and leaving
automation lifecycle proposals fail-closed for the next backend slice.
CCOS-020 then enabled automation lifecycle proposals to execute through those
shared command functions, with automation-level proposal evidence, command
audit references for successes, and `automation_rule_failed` evidence for
stable lifecycle command rejections.
MCP-001 added `/v1/mcp/manifest` and a connection-level `mcpManifest`, so MCP
bridge servers can expose CompanyCore API routes as capability-scoped tools
without bypassing workspace auth, policies, approvals, events, or audit logs.
MCP-002 added the first local stdio MCP bridge server via `npm run mcp:server`.
The bridge reads `/v1/mcp/manifest`, exposes `tools/list`, and executes
`tools/call` through the CompanyCore HTTP API with a workspace-scoped service
key. MCP-003 added canonical backend MCP key profiles and `profileId` service
key creation. MCP-004 connected the owner-console API key preset UI to those
backend profiles, leaving static presets as fallback-only data and using
`profileId` creation when the selected canonical scopes are unchanged.
MCP-005 added `npm run mcp:smoke` and integration coverage that runs the stdio
bridge with a real profile-created MCP key. MCP-006 added concrete runtime
setup snippets for Paperclip, Codex, and future MCP-compatible agents in
`docs/operations/mcp-agent-runtime-setup.md`.

## Current Priority Order

1. Stability
2. Architecture alignment
3. No regressions
4. Correct flows
5. UX quality
6. Visual polish
7. New features

## Active Constraints

- Do not touch unrelated in-progress code changes.
- Keep source-of-truth docs in English.
- Reuse existing `.codex/context`, planning, governance, and architecture
  systems.
- Google Drive owner consent/import is complete for the numbered department
  roots as of 2026-05-14; keep future Drive work focused on freshness,
  content-quality, and operating-model surfacing evidence.
- Do not mark upstream Paperclip/OpenJarvis merge execution complete until
  write access or an approved fork/PR route exists.
- Treat GitHub-to-Coolify auto-deploy as a P2 release-automation evidence item,
  not as a v1 runtime blocker.
