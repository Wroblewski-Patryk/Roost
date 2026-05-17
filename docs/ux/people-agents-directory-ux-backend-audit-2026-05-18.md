# People/Agents Directory UX And Backend Data Audit

Last updated: 2026-05-18

## Scope

Audited surface:

- `06 People & Agents -> Directory`
- Route: `/areas?area=06-kadry&view=directory`
- Frontend: `web/src/features/departments/people-agents-route.tsx`
- Backend: `src/modules/workforce/workforce.routes.ts`,
  `src/modules/workforce/workforce.service.ts`, `prisma/schema.prisma`

This is a critical UX and backend-data audit. It does not change runtime code.

## Executive Summary

The Directory is now much better than the first hero/counter-heavy version: it
is a real roster/detail workbench with search, type/status filters, scope
segments, sorting, readiness checks, edit/create, archive, generated file
preview, and manual Paperclip sync.

It is still not yet a strong company-management tool. It mostly manages static
workforce records. The next usefulness jump should connect each human/agent to
work, authority, runtime state, external accounts, and operational readiness.
Right now the CEO/admin can ask "who exists?" and "is this profile complete?",
but not yet "what can this person/agent do, what are they responsible for, what
are they assigned to, what is blocked, and what changed recently?"

## Backend Data Currently Available

| Backend surface | Data or action | UI usage today | Audit note |
| --- | --- | --- | --- |
| `GET /v1/workforce` | `summary.total/humans/agents/syncEnabled/syncQueued/visible` | Only local visible count is shown. | Backend summary is intentionally not shown as KPI cards, but selected operational counters such as queued sync or inactive records could drive action filters. |
| `GET /v1/workforce` | `entities[]` with profile fields | Main roster and detail panel. | Good baseline. Missing richer grouping, table density, and relation context. |
| `GET /v1/workforce` | `manager` relation | Detail panel and edit manager select. | The UI shows manager but not direct reports or org-chain context. |
| `GET /v1/workforce` | `generatedFiles` | Files tab. | Useful, but not integrated into readiness or sync impact preview. |
| `GET /v1/workforce` | `syncStatus`, `syncLog` | Sync tab and list metadata. | Good V1, but no outbox delivery state, last synced time, stale reason, or failed recovery path. |
| `GET /v1/workforce` | `dictionaries` | Not used; frontend hardcodes most enum options. | Drift risk. UI should use dictionaries from packet. |
| `GET /v1/workforce` | `agentPacket.allowedActions`, `agentPacket.blockedActions` | Not shown. | Important governance data is invisible to the operator. |
| `POST /v1/workforce` | Create entity | Modal. | Works, but form defaults are agent-heavy and not context-aware. |
| `PATCH /v1/workforce/:id` | Update entity | Modal. | Works, but edits do not preview what generated files or sync status will change. |
| `DELETE /v1/workforce/:id` | Archive entity | Detail action. | Useful. Needs clearer archive policy and recovery visibility. |
| `POST /v1/workforce/:id/actions/sync` | Queue Paperclip sync | Sync tab action. | Useful. Runtime delivery remains outbox-only and not visually explained enough. |
| DB-only fields | `source`, `externalId`, `lastSyncedAt`, direct reports | Not typed in `web/src/types.ts`; not shown. | Data exists or is inferable but not part of the frontend contract. |

## Critical Findings

| ID | Severity | Finding | User impact | Evidence | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| PA-AUD-001 | P1 | The view does not answer "what work is this person/agent responsible for?" | A CEO/admin cannot use this as a management cockpit; they still need Operations/ClickUp/Paperclip context elsewhere. | Workforce entities have role/department/manager, but no assigned tasks, task-list ownership, active work, blocked work, or recent activity is displayed. | Add a backend read packet that joins workforce entities to tasks/work items, task lists, agent logs/events, and provider assignment evidence. Show an "Work & responsibility" tab. |
| PA-AUD-002 | P1 | Authority and permission boundaries are invisible. | Users cannot see whether an agent has read-only, write, destructive, or supervised capability, so runtime risk remains abstract. | `agentPacket.blockedActions` exists but UI does not render it; API-key profiles and MCP manifest capability data are not connected to the selected entity. | Add an "Authority" tab fed by service-key profile summaries, capabilities, allowed tools, blocked actions, and escalation requirements. |
| PA-AUD-003 | P1 | Paperclip sync is queued, but runtime outcome is opaque. | "Manual sync" can succeed while Paperclip remains stale if no worker consumes the outbox. The UI may imply more completion than actually happened. | Backend creates `paperclip_agent_config_sync_requested` outbox event and sets `syncStatus: queued`; no delivery/ack state is shown. | Show outbox ID, target agent, queued time, last synced time, delivery status, failed reason, and recovery action. Add a future Paperclip ack consumer before labeling synced as runtime-current. |
| PA-AUD-004 | P1 | Readiness checks are frontend-local and not source-of-truth. | Different clients or agents could disagree on whether an entity is ready. | `needsAttention()` and `readinessItems()` live only in React. Backend returns summary but no readiness model. | Move readiness derivation into the workforce packet as `readiness`, `missingFields`, `blockedActions`, and `nextAction`. UI should render backend readiness. |
| PA-AUD-005 | P1 | The generated files are previewable but not operationally actionable. | The owner can inspect Markdown, but cannot see what changed, copy/export, compare with runtime, or understand sync impact. | Files tab displays raw markdown only. | Add file metadata, generated-at, changed sections, copy/download, and "will sync these files" preview in the sync tab. |
| PA-AUD-006 | P1 | The Directory has no bulk or queue workflow. | Managing more than a few humans/agents will be slow because every action is one-record-at-a-time. | No selection model beyond selected entity; no multi-select, bulk archive, bulk sync, bulk status update, or saved filter. | Add multi-select only after backend supports safe bulk commands. Start with bulk sync for selected active agents with confirmations and per-agent results. |
| PA-AUD-007 | P2 | Search/filter behavior is client-only while backend supports `q`, `type`, and `status`. | Large workforces will load everything and filter in the browser; server filters are unused. | `useOwnerPacket('/v1/workforce?refresh=...')` always fetches all entities, then React filters locally. | Wire query, type, and status into `/v1/workforce` request parameters; keep local sort/segments until backend supports them. |
| PA-AUD-008 | P2 | Backend dictionaries are not used by the form or filters. | Future enum changes can make UI drift from backend validation. | Frontend hardcodes `active/inactive/paused/archived`, runtime modes, and personality profiles. | Drive select options from `packet.data.dictionaries` and keep a safe fallback. |
| PA-AUD-009 | P2 | Department is free text, not tied to the canonical `00`-`12` department registry. | Records can drift into `06-kadry`, `06 People`, `people`, or typos, weakening filtering and routing. | Form uses `CcTextInput` for department. Backend accepts arbitrary string. | Use canonical department selector from shared area registry; backend should validate or normalize known department keys. |
| PA-AUD-010 | P2 | Manager hierarchy is shallow. | The owner sees a manager name but not direct reports, gaps, or org structure. | Prisma has `directReports`, but list/detail does not include or display direct reports. | Include direct report counts and optional direct report list; add "Org" tab when hierarchy grows. |
| PA-AUD-011 | P2 | Archive action is available but recovery and policy are unclear. | Users may archive a record without understanding whether sync is disabled, tasks remain assigned, or Paperclip remains stale. | Archive calls `DELETE`, which updates status and disables sync. UI confirms only basic archive intent. | Add archive impact preview: sync disabled, runtime not deleted, assignments retained, future restore path. Add restore action if policy allows. |
| PA-AUD-012 | P2 | The UI does not expose source/provenance. | For humans, agents, seeded owner records, Paperclip-linked records, and future provider imports, users cannot tell origin. | DB has `source` and `externalId`; frontend type omits them. | Add source/external ID to detail metadata and use provenance labels only where actionable. |
| PA-AUD-013 | P2 | Form layout is complete but not role/task oriented. | Users fill fields, but the form does not guide them toward a usable operating profile. | Field order is generic; description is the only responsibility input. | Split form into identity, organization, runtime, and generated context sections; add inline "what this changes" hints. |
| PA-AUD-014 | P2 | There is no activity/evidence timeline. | A manager cannot answer "who changed this profile, when was sync requested, and what events happened?" | Backend emits events on create/update/sync; UI does not fetch or display them. | Add recent events/audit evidence to the packet or a detail endpoint and render a small timeline. |
| PA-AUD-015 | P3 | The current visual density is acceptable but still list-card heavy. | With dozens of records, scanning may be slower than a table/list hybrid. | Each record is a large button card. | Add density toggle: compact rows for many records, cards for small roster. |
| PA-AUD-016 | P3 | Frontend type safety is weaker than it looks. | Vite build passes without a dedicated frontend `tsc --noEmit`; type mismatches can slip through. | `package.json` has server `tsc` only; web build is Vite transpilation. | Add `build:web:typecheck` or `typecheck:web` and include it in validate once current React TS config is ready. |

## UX Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| First-viewport usefulness | 7/10 | Filters, roster, readiness, and actions are visible. Missing work/authority context. |
| Backend-connected action quality | 6/10 | Create/edit/archive/sync are real. No bulk workflow, no runtime delivery proof, no assignment actions. |
| Data relevance for CEO/admin decisions | 5/10 | Good identity/config data. Weak on work ownership, authority, blockers, and recent changes. |
| Paperclip operational clarity | 5/10 | Source-of-truth boundary is present. Queue versus delivered runtime is not clear enough. |
| Scalability to larger workforce | 5/10 | Client filters and card list are fine for small teams, weak for dozens/hundreds. |
| Mobile usefulness | 7/10 | The workbench remains usable on mobile. Detail-heavy management will need compact tabs and sticky action patterns later. |
| Governance visibility | 4/10 | Backend agent packet exists, but the UI does not show capability/blocked-action governance. |

## Backend Gaps Blocking A Stronger Tool

These are not defects in V1 scope; they are the next backend slices needed for
the view to become genuinely managerial.

| Gap | Needed backend shape | Why it matters |
| --- | --- | --- |
| Workforce context packet | `GET /v1/workforce/context` or expanded `/v1/workforce` with readiness, work, authority, and evidence | Moves readiness and next action from frontend guesswork to source-of-truth. |
| Work assignments | Entity -> tasks/work items/task lists/project ownership | Lets managers see responsibility and workload. |
| Authority context | Entity -> capabilities, service keys, MCP tools, approval/supervision requirements | Makes AI and human authority inspectable before assigning work. |
| Runtime delivery state | Outbox event -> Paperclip ack/failure/last delivered config hash | Prevents "queued" from being confused with "runtime updated". |
| Org hierarchy read model | Direct reports, manager chain, department membership | Turns manager_id into usable structure. |
| Activity timeline | Events/audit logs scoped to workforce entity | Shows evidence and history for management decisions. |
| Canonical departments | Shared department registry validation in create/update | Prevents taxonomy drift. |

## Recommended Implementation Slices

### PA-UX-001 Backend Readiness And Authority Packet

Goal: return source-backed `readiness`, `nextAction`, `blockedActions`,
`allowedActions`, and `riskLevel` for every workforce entity.

Acceptance:

- UI no longer computes readiness locally.
- Detail panel shows backend next action and governance warnings.
- API tests cover humans, linked agents, unlinked agents, paused/archived
  records, and scoped-key access.

### PA-UX-002 Work And Responsibility Tab

Goal: show active assigned work, task-list ownership, department work scope, and
blocked work for the selected person/agent.

Acceptance:

- Detail tab answers: "what is this entity responsible for now?"
- Uses existing Operations task/work-item packets where possible.
- No new write action until assignment command contract exists.

### PA-UX-003 Paperclip Delivery Evidence

Goal: distinguish generated, queued, delivered, failed, and stale runtime
states.

Acceptance:

- Sync tab shows outbox ID, target agent, queued time, last delivered time, and
  failure reason when present.
- Paperclip ack remains a separate integration task if runtime callback does
  not exist yet.

### PA-UX-004 Canonical Form And Filters

Goal: reduce data drift and make entity creation guided.

Acceptance:

- Select options come from backend dictionaries.
- Department uses canonical area registry.
- Form is split into identity, organization, runtime, and generated context.
- Archive impact preview is explicit.

### PA-UX-005 Dense Roster Mode

Goal: support larger teams without losing scan speed.

Acceptance:

- Compact table/list mode exists.
- Current card/detail mode remains available.
- Search/filter state is reflected in backend query params for large datasets.

## Immediate Priority

Do not add more badges or counters. The next useful work is
`PA-UX-001 Backend Readiness And Authority Packet`, followed by
`PA-UX-002 Work And Responsibility Tab`.

Those two slices would move the Directory from "profile manager" to "company
workforce management tool."
