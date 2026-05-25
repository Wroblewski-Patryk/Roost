# Web And MCP Foundation Before V2

Last updated: 2026-05-14

## Purpose

This document defines the product and architecture target before CompanyCore
moves into V2 Company City, strategic-game UI, gamification, or mobile app
work. The near-term goal is not the cinematic dashboard. The near-term goal is
a complete, reliable, intuitive web + backend + MCP foundation that can later
support the V2 experience without rework.

## Scope Boundary

In scope before V2:

- backend/API correctness and workspace safety;
- owner web console usability;
- workspace switching for owners with multiple companies;
- operating-area navigation and resource inventory;
- integration relationship review and mapped resource clarity;
- MCP/tool visibility and service-key readiness for AI agents;
- production data-completeness decisions for projects, storage locations,
  knowledge roots, and automation definitions;
- validation, smoke, and accessibility proof for the owner web surface.

Out of scope before V2:

- native mobile application;
- Company City map implementation;
- strategy-game visual dashboard;
- gamification mechanics beyond real status/readiness signals;
- advanced organization administration, billing, invitations, or non-owner
  roles unless explicitly selected later.

V2 direction remains accepted as a product north star, but V1.5 foundation work
must optimize for real utility, clarity, and agent-safe operation first.

## Current Reality

The data model is already workspace-scoped:

- `users`
- `workspaces`
- `workspace_memberships`
- workspace-owned business, operating-model, integration, and Company OS
  tables
- workspace-scoped service API keys for MCP/agents

However, the active human UX is still effectively single-workspace:

- registration creates one workspace and owner membership;
- login selects the first membership and signs a token containing that
  `workspaceId`;
- `/auth/me` returns only the active auth context;
- `/v1/connection` returns only the active workspace;
- the web sidebar displays the current workspace name but does not let the
  owner switch or create another company workspace;
- MCP/API keys are scoped to the workspace embedded in the active context.

This is a good backend foundation, but the web and API need an explicit
multi-workspace selection contract before the UI presents workspace switching.

## Product Principle

The owner should experience CompanyCore as:

```text
Choose company workspace -> understand its operating areas -> inspect resources
and integrations -> fix relationships/blockers -> expose safe tools to AI
```

Every private web route should help one of these jobs:

1. choose the company context;
2. understand what belongs where;
3. see what is synced and whether it is correctly mapped;
4. act on records, relationships, and integration setup;
5. prepare safe AI/MCP access.

## Workspace Switching Contract

### Required Behavior

Workspace switching must be explicit and fail closed:

- owner login should expose available memberships or a follow-up endpoint must
  list them;
- the active `workspaceId` must remain in the signed auth token;
- switching workspace should mint a new auth token for the selected workspace;
- every protected route must continue deriving workspace from auth, never from
  arbitrary client payloads;
- service API keys remain tied to exactly one workspace;
- the owner UI must clearly show which workspace is active before actions,
  imports, API key creation, or MCP handoff.

### Recommended Endpoints

| Endpoint | Purpose | Notes |
| --- | --- | --- |
| `GET /v1/workspaces` | List workspaces visible to the signed-in owner. | User-auth only; do not expose through service API keys by default. |
| `POST /v1/workspaces` | Create a new company workspace for the current owner. | Creates owner membership and seeds operating model. |
| `POST /v1/workspaces/:id/actions/select` | Mint an auth token scoped to a visible workspace. | Returns safe user + workspace envelope; preserves fail-closed membership check. |
| `GET /auth/me` | Include active workspace and available workspace summary. | Keep safe, no secrets. |

The current token model can stay. Do not move workspace selection into mutable
client state or query parameters.

## Sidebar And Navigation Architecture

The sidebar should become a company operating navigator, not a generic route
list. For the foundation phase, it should prioritize clarity over cinematic
visuals.

Canonical sidebar order:

1. Workspace selector
   - active company name
   - switch workspace
   - create workspace
   - connection/health signal
2. Operating areas
   - `00. Glowny` always visible because it is the intake/fallback area
   - remaining areas grouped or searchable
   - each area expandable to show resource families and counts
3. Work modules
   - Dashboard / command overview
   - Data
   - Tasks
   - Relationships
   - Pipeline / processes
   - Company OS
4. Integrations and synced relationships
   - Integration map
   - ClickUp
   - Google Drive
   - Relationship review queues
5. AI and MCP
   - Agent tools
   - API keys
   - MCP manifest/readiness
6. Workspace settings
   - account
   - service status
   - sign out

### Area Expansion Model

Each operating area should expose resource families, not every record:

| Resource Family | Examples |
| --- | --- |
| Tables | CompanyCore tables assigned to the area. |
| Folders | Operating folders and provider containers. |
| Synced resources | ClickUp Lists, Drive folders/files, provider mappings. |
| Knowledge | knowledge roots, notes, decisions, Drive docs. |
| Automations | automation definitions, rules, agent events. |
| Work | tasks, pipeline runs, stage runs, approvals. |

Counts and badges must come from real state. Empty families may be hidden or
shown as zero only when that helps setup.

## Relationship And Integration Model

The web foundation must make relationships between synced elements visible.

Important relationship types:

- provider container -> operating area;
- provider container -> operating folder/table;
- Drive folder/file -> operating area/folder/table;
- task/list -> project/client/process/pipeline where implemented;
- API/MCP tool -> capability/scope/workspace;
- Company OS resource -> process/pipeline/policy/risk/control;
- event/audit -> resource/action/correlation.

The existing `external_container_mappings`, `external_field_mappings`,
`google_drive_files`, `resources`, `tool_adapters`, and
`integration_capabilities` are the correct foundation. The UI should not invent
a parallel relationship store until a concrete missing relation is proven.

WEBFOUND-007 refined this into the current relationship graph audit:
`docs/architecture/relationship-graph-audit-2026-05-14.md`. Future
relationship APIs and UI must label relationships as direct,
provider-derived, route-inferred, needs-review, or unsupported before exposing
them as operator or MCP-facing context.

## MCP And AI Usability Contract

AI through MCP should be understandable from the web console:

- owner can see which workspace an API key belongs to;
- owner can see the MCP tools/capabilities exposed to that key;
- risky tools show approval/supervision requirements;
- relationship and operating-area mappings are visible before an agent acts;
- MCP does not bypass HTTP workspace, capability, approval, event, or audit
  boundaries.

The owner web console should be the human-readable mirror of the MCP contract,
not a separate control plane.

## Foundation UX Target

Before V2 visuals, the web app should feel:

- operational, not decorative;
- calm but not generic;
- action-first on mobile;
- dense but scan-friendly on desktop;
- clear about active workspace and active area;
- explicit about integration state and relationship gaps;
- safe enough that AI agents can be handed scoped MCP keys with confidence.

The first screen after login may remain an operational dashboard until the
Company City V2 implementation begins. It must still answer:

- current workspace;
- what needs attention;
- what is unmapped or unsynced;
- which setup/data/MCP action is next.

## Implementation Roadmap

### Phase 1: Data And Workspace Foundation

| ID | Task | Output |
| --- | --- | --- |
| WEBFOUND-001 | Operating Model Data Completion Decision | Decide seed/import/deferral for projects, storage locations, knowledge roots, and automation definitions. |
| WEBFOUND-002 | Workspace Switch API Contract | Add workspace list/create/select endpoints and update `/auth/me` safely. |
| WEBFOUND-003 | Workspace Selector UI | Add active workspace selector to the owner shell with create/switch states. |

### Phase 2: Operating Navigation

| ID | Task | Output |
| --- | --- | --- |
| WEBFOUND-004 | Area Resource Inventory API | Return per-area counts for tables, folders, mappings, Drive files, storage, knowledge, automations, tasks, and approvals. |
| WEBFOUND-005 | Sidebar Area Tree | Replace route-directory sidebar with workspace selector plus expandable operating areas and resource families. |
| WEBFOUND-006 | Mobile/Tablet Navigation Proof | Validate drawer, area tree, active route, and command-first order across breakpoints. |

### Phase 3: Relationships And Integrations

| ID | Task | Output |
| --- | --- | --- |
| WEBFOUND-007 | Relationship Graph Audit | Document which synced relationships exist, which are missing, and which should be derived versus stored. |
| WEBFOUND-008 | Relationship Workbench Upgrade | Make relationship review queues explain provider/Drive/entity links and next fixes clearly. |
| WEBFOUND-009 | Integration Readiness Dashboard | Show ClickUp, Drive, provider mappings, stale sync, and failed inbox state in one owner-readable panel. |

### Phase 4: MCP/AI Readiness

| ID | Task | Output |
| --- | --- | --- |
| WEBFOUND-010 | MCP Key Workspace Clarity | Ensure API key screens show workspace, scopes, risk, and MCP profile meaning before key creation. |
| WEBFOUND-011 | Agent Tool Surface In Canonical Shell | Bring agent tools and Company OS cockpit into the same web shell/navigation model. |
| WEBFOUND-012 | AI-Ready Smoke Pack | Run MCP manifest, scoped key, relationship-read, and command-guard smoke from the active workspace. |

### Phase 5: V2 Readiness Gate

| ID | Task | Output |
| --- | --- | --- |
| WEBFOUND-013 | V2 UX Readiness Review | Confirm web/backend/MCP foundation is complete enough to start Company City/gameification design implementation. |
| WEBFOUND-014 | V2 Visual Implementation Plan | Re-open Company City V2 and gamification as visual/product work only after the foundation gate passes. |

## Acceptance Gate Before V2

V2 visual work should not start until:

- owner can select or create a workspace safely;
- web routes clearly show active workspace;
- operating areas and resource families are understandable from navigation;
- relationship review queues expose real sync/mapping gaps;
- integration setup/readiness is owner-readable;
- MCP key creation and tool visibility are understandable per workspace;
- mobile web, tablet web, and desktop web pass route smoke for the foundation;
- backend tests and API/MCP smokes pass for workspace scoping and command
  guards.
