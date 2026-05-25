# CompanyCore 00-04-08 Operating Loop Plan

Last updated: 2026-05-16

## Purpose

This plan activates the owner-approved near-term direction:

```text
00 Main -> 04 Operations -> 08 Assets
```

The goal is to create the smallest strong company operating loop before the
remaining departments are deepened:

1. `00 Main` receives, reviews, classifies, and routes company inputs.
2. `04 Operations` turns routed work into controlled tasks, procedures,
   approvals, dependencies, and evidence.
3. `08 Assets` makes files, documents, prompts, resources, repositories, and
   knowledge safe and usable by humans and AI agents.

This plan implements
`docs/architecture/autonomous-company-operating-system.md` and extends the
department management systems program.

## Product Rules

- CompanyCore is the company operating system.
- AI agents are API/MCP clients, not embedded backend intelligence.
- Humans use the responsive web UI.
- All three systems must reuse the shared selected-area shell and shared
  Tailwind/DaisyUI component primitives.
- No department-local duplicate tables, fake data, raw provider screens, or
  broad high-risk writes.
- Every write beyond existing safe commands needs a separate command contract,
  API tests, audit/event behavior, and browser proof.

## Shared Web Component Work

Before adding more department-specific UI depth, the web layer needs a shared
component foundation that prevents view clutter and one-off styling.

| ID | Task | Stage | Output | Validation |
| --- | --- | --- | --- | --- |
| CC-UI-001 | Shared component inventory | planning | Map current repeated buttons, tables, cards, command panels, tabs, empty states, badges, and action feedback in `web/src/`. | source review |
| CC-UI-002 | Shared button primitive | implementation | One DaisyUI/Tailwind-backed button component with variants for icon-left, icon-right, icon-only, loading, disabled, danger, primary, secondary, ghost. | web build + representative route proof |
| CC-UI-003 | Shared table/list primitive | implementation | One table/list primitive with loading, empty, error, density, pagination-ready API, mobile collapse, row action slots. | web build + desktop/mobile proof |
| CC-UI-004 | 00/04/08 read-packet UI adoption | verified | Consume the verified `00 Main`, `04 Operations`, and `08 Assets` read packets in selected-area boards using shared `CcDataTable` and `CcButton` paths. | `npm run build:web` + desktop/mobile rendered proof |
| CC-AUDIT-001 | 00/04/08 architecture and UX audit | verified | Confirm delivered 00/04/08 architecture/UX scope and make `00 Ogolny` the post-login dashboard while keeping `/dashboard` as a compatibility alias. | web/server build + auth/alias/00/04/08 rendered proof |
| CC-UI-005 | Shared department command primitives | future | Extract command brief, metric strip, evidence rail, agent packet, blocked-action, and improvement queue components only after one more department proves the reusable shape. | web build + selected-area proof |

These tasks must not restyle the whole app at once. They should migrate the
next active surface first, then become available to later department work.

## 00 Main Execution Plan

Current verified state:

- `GET /v1/intake` exists.
- `POST /v1/intake/actions/propose-route` exists as proposal-only command.
- `/areas?area=00-ogolny&view=overview` renders the global intake panel.
- Successful owner auth and `/dashboard` now open
  `/areas?area=00-ogolny&view=overview`, so `00 Ogolny` is the main company
  dashboard after login.

Target:

- `00 Main` becomes the company orchestration room: global intake, owner
  inbox, Paperclip/agent output review, unassigned resources, risks,
  cross-department blockers, and route proposal review.

| ID | Task | Stage | Output | Validation |
| --- | --- | --- | --- | --- |
| CC-00-001 | Route proposal lifecycle readback | planning | Define how existing `Decision`, `Task`, `AuditLog`, and `Event` evidence should show proposal status/outcome without adding schema too early. | source review + decision record |
| CC-00-002 | Route proposal lifecycle readback API | backend | Read-only proposal lifecycle evidence from current `Decision`, optional `Task`, `AuditLog`, and `Event` records. | API tests |
| CC-00-003 | 00 Main review queue states and board polish | partially covered by CC-UI-004 | Owner-visible route proposal lifecycle table is now present; deeper duplicate/conflict states remain future. | desktop/tablet/mobile proof |
| CC-00-004 | Paperclip output review proof refresh | QA/AI | Prove Paperclip-like output enters intake, gets proposed/routed, and does not mutate source status. | repeatable API/UI smoke |
| CC-00-005 | Cross-department blocker read model | planning/backend | Plan and then implement a read-only aggregate for blockers across departments only if existing sources can prove it. | API tests |

Blocked until explicit contracts:

- automatic source acknowledgment;
- provider retry;
- approval decisions;
- legal, finance, ad, delete, or provider-write actions.

## 04 Operations Execution Plan

Current verified state:

- `GET /v1/operations/context` exists and is production-smoked.
- `/areas?area=04-operacje&view=overview` has a verified Operations board.
- `/operations` exists as a broader owner supervision cockpit.

Target:

- `04 Operations` becomes the work execution and control system for tasks,
  procedures, pipelines, routines, dependencies, approvals, quality controls,
  and operational evidence.

| ID | Task | Stage | Output | Validation |
| --- | --- | --- | --- | --- |
| CC-04-001 | Operations task model gap audit | analysis | Compare current `Task` schema/API/UI to the target task fields: duration, owners, agents, reviewer, risk, value, relations, logs, checklists, dependencies. | source review |
| CC-04-002 | Operations task read model v1 | backend | Protected read-only Operations work item packet over current tasks, projects, task lists, pipelines/stages/procedures, events, notes, dependencies, logs, Drive/resource evidence, and blocked actions. | API tests |
| CC-04-003 | Operations work item UI adoption | verified | Operations work item packet is now rendered in the selected-area Operations board through shared primitives. | `npm run build:web` + rendered proof |
| CC-04-004 | Operations procedure proposal command contract | planning | Define the first safe operation write: proposal-only procedure/routine/task improvement evidence, with no direct procedure activation. | `git diff --check` |
| CC-04-005 | Operations workload and calendar read plan | planning | Decide whether calendar/timeline/workload can be derived from current tasks/procedures or needs schema. | source review |
| CC-04-006 | Operations execution proof | QA | Prove `00 Main` routed proposal can become Operations review work or task evidence through approved commands. | API/UI smoke |

Blocked until explicit contracts:

- direct approval decision from Operations board;
- raw procedure activation;
- provider execution;
- destructive workflow changes;
- hidden AI execution without evidence.

## 08 Assets Execution Plan

Current verified state:

- Production Google Drive index is verified for selected `00`-`12` roots.
- Selected-area knowledge and `/data` evidence browser expose parts of the
  asset picture.
- Dedicated `08 Assets` context packet and board are missing.

Target:

- `08 Assets` becomes the company source and resource management system for
  files, folders, resources, prompts, architecture docs, repositories, API
  references, deployment docs, knowledge notes, contracts, and brand assets.

| ID | Task | Stage | Output | Validation |
| --- | --- | --- | --- | --- |
| CC-08-001 | Assets/resource system spec | planning | Define the `08 Assets` board, mobile queue, source types, AI-readiness labels, blocked actions, and agent packet. | source review |
| CC-08-002 | Assets context read API | backend | Protected read-only `GET /v1/assets/context` over Drive files, snapshots, resources, storage locations, knowledge roots, operating tables, and freshness. | API tests |
| CC-08-003 | Assets management board | verified | `/areas?area=08-zasoby&view=overview` now renders the Assets resource packet, readiness, folder roots, knowledge roots, cleanup, and blocked actions through shared primitives. | `npm run build:web` + desktop/mobile rendered proof |
| CC-08-004 | Resource freshness/readiness aggregate | backend | Read-only freshness/trust summary per department and source type. | API tests |
| CC-08-005 | Asset command contract | planning | Decide the first safe asset write, such as propose resource classification or create document draft, without broad Drive writes. | security/design review |

Blocked until explicit contracts:

- Drive deletion;
- broad Drive writes;
- source trust promotion;
- private-data exposure;
- repository mutation;
- autonomous document publication.

## Recommended NOW Queue

Completed first checkpoint:

1. `CC-UI-001` shared component inventory.
2. `CC-00-001` route proposal lifecycle readback plan.
3. `CC-04-001` Operations task model gap audit.
4. `CC-08-001` Assets/resource system spec.

Completed runtime checkpoint:

1. `CC-UI-002` shared action/button primitive.
2. `CC-UI-003` shared data table/list primitive.
3. `CC-00-002` route proposal lifecycle readback API.
4. `CC-04-002` Operations task read model v1.
5. `CC-08-002` Assets context read API.
6. `CC-UI-004` selected-area UI adoption for the verified `00`, `04`, and
   `08` read packets.

Recommended current runtime queue after this checkpoint:

1. `DMS-NEXT-004` Relationships Management read packet and board.
2. Production smoke after the next deploy if release confidence is selected
   before more department expansion.
3. Future `CC-00-004`, `CC-04-004`, or `CC-08-004` only when the next
   command/read-model contract is explicit.

Implementation should use the smallest runtime change that improves the
`00 -> 04 -> 08` loop without adding unsafe authority.

- `CC-UI-002` added `CcButton` in `web/src/components/cc-button.tsx` and
  adopted it in shared notice/state panel actions.
- `CC-UI-003` added `CcDataTable` in `web/src/components/cc-data-table.tsx`
  and preserved the existing `DataTable` export as a compatibility wrapper.

## Acceptance Criteria

- The architecture direction is recoverable from source-of-truth docs.
- The active queue prioritizes `00 Main`, `04 Operations`, and then `08 Assets`.
- Future UI work has a shared component path before more view depth is added.
- Existing verified `03 Sales`, `01 Strategy`, `07 Finance`, and other
  department work remains valid but is no longer the immediate default
  selection while this owner-approved operating loop is active.
- AI remains an external API/MCP client throughout the plan.
