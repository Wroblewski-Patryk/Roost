# CompanyCore V1 Simple Dashboard Canonical Spec

Date: 2026-05-15
Stage: planning
Task: `V1UX-CANON-001`
Original canonical image target:
`docs/ux/assets/companycore-v1-simple-dashboard-canonical.png`

Refined CEO canonical image target:
`docs/ux/assets/companycore-v1-ceo-dashboard-refined-canonical.png`

APQC executive atlas canonical target:
`docs/ux/assets/companycore-v1-apqc-executive-atlas-canonical.png`

Polished executive atlas canonical target:
`docs/ux/assets/companycore-v1-executive-atlas-awwwards-canonical.png`

Area-first atlas canonical target:
`docs/ux/assets/companycore-v1-area-first-atlas-canonical.png`

Area-first desktop layout target:
`docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`

Area-first mobile layout target:
`docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`

These two images are the current canonical desktop and mobile layout references
for the V1 area-first dashboard.

As of this pass, the desktop and mobile area-first dashboard images are the
strongest canonical V1 implementation references because they solve the main
navigation problem: the user navigates the company, not application modules.

## Intent

This spec defines a simpler V1 owner/client panel for CompanyCore. It is not
the future V2 Company City surface. V1 should be a calm operational dashboard:
clear sidebar, one command brief, linked widgets, and route modules that expose
the current backend without making the owner navigate a wall of buttons.

The user outcome is:

```text
I open CompanyCore and immediately know what matters now, what is blocked,
which company area owns it, and whether Jarvis/Paperclip can safely use the
context.
```

## Inputs Reviewed

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `web/src/main.tsx`
- `web/src/react-route-kit.tsx`
- `docs/architecture/system-architecture.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/web-app-ux100-audit-and-execution-plan-2026-05-15.md`
- `docs/ux/visual-direction-brief.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`

## Current UI Audit

### What Works

- The backend surface is broad enough for a useful owner cockpit:
  workspaces, operating areas, business data, tasks, CRM/pipeline,
  relationships, Drive, ClickUp, Company OS, API keys, and MCP tools.
- The private shell already has grouped navigation, workspace switching,
  route command strip, command search, and responsive mobile quick actions.
- Phosphor icons, Tailwind, and DaisyUI are already accepted project tools.
- Existing route-body work proves that real state can drive command cards and
  attention summaries.

### What Hurts The Product

- Navigation is still too route-shaped. It exposes implementation nouns such
  as data, API, bridge, MCP tools, route exposure, and workbenches before the
  owner understands the operating job.
- Too many buttons compete for attention. Several screens show primary,
  secondary, compact, anchor, setup, review, and route actions in the same
  viewport.
- The sidebar tries to do three jobs at once: workspace control, department
  map, and route directory. It should become a stable operating model, not a
  dense index.
- The dashboard has valuable signals but still feels like assembled panels.
  V1 needs one dominant brief and a small set of linked widgets.
- React and vanilla surfaces are closer than before, but the implementation
  still has shell/layout duplication and route-local versions of repeated
  patterns.
- Advanced agent/API/MCP details are visible too early. V1 should show safety
  readiness first, with deeper tool manifests one click away.

### Design Decision

V1 should become a `Company Control Panel`, not a miniature city and not a raw
admin console. V2 can later turn the same information architecture into the
Company City metaphor.

## V1 Sitemap

### Primary Sidebar

The sidebar should be short, stable, and company-area oriented. The main
navigation is the organization, not the application modules.

| Group | Sidebar Item | Destination | Purpose |
| --- | --- | --- | --- |
| Command | Company Atlas | `/dashboard` | Whole-company overview and priority |
| Areas | 00 Ogolny | `/areas?area=00-ogolny` | Intake, workspace, triage, unassigned ownership |
| Areas | 01 Strategia | `/areas?area=01-strategia` | Goals, governance, strategic workflows |
| Areas | 02 Produkt | `/areas?area=02-produkt` | Product direction, delivery, roadmap |
| Areas | 03 Sprzedaz | `/areas?area=03-sprzedaz` | CRM, deals, sales pipeline |
| Areas | 04 Operacje | `/areas?area=04-operacje` | Operating reliability, admin, delivery support |
| Areas | 05 Relacje | `/areas?area=05-relacje` | Clients, partners, relationship graph |
| Areas | 06 Kadry | `/areas?area=06-kadry` | People, roles, responsibility, PAEI |
| Areas | 07 Finanse | `/areas?area=07-finanse` | Billing, finance, commercial controls |
| Areas | 08 Zasoby | `/areas?area=08-zasoby` | Assets, storage, resources, repositories, files |
| Areas | 09 Technologia | `/areas?area=09-technologia` | Systems, integrations, tooling, API/MCP surface |
| Areas | 10 Prawo | `/areas?area=10-prawo` | Legal, compliance, policies, controls |
| Areas | 11 Innowacje | `/areas?area=11-innowacje` | Experiments, improvements, new capabilities |
| Areas | 12 Zarzadzanie | `/areas?area=12-zarzadzanie` | Management, AI agents, audit, governance rhythm |
| System | Workspace Settings | `/settings/account` | Account, workspace, safety settings |

### Secondary Links

Secondary links should not be permanent sidebar rows. They appear inside the
relevant module header or detail panel:

- ClickUp setup: from `Integrations`
- MCP manifest: from `Agents`
- Company OS cockpit: from `Agents` and `Pipeline`
- API route exposure: inside `Agents`
- Table-specific editors: inside `Data & Records`
- Department-specific Drive/mapping links: inside `Areas`

In the area-first model, these secondary links are even more contextual:

- `Goals`, `Workflows`, `Tasks`, `Knowledge`, `Resources`, `Decisions`, and
  `AI` are tabs inside an area, not global sidebar items.
- Global command search can jump across areas and capabilities.
- The dashboard can still summarize cross-area pressure, but follow-up actions
  should land in an area-scoped view.

## Area-First UX Model

The final V1 should prefer area-first navigation:

```text
Company Atlas
  -> Select area
  -> Choose useful capability
  -> Act, review, or delegate
```

### Area Capability Tabs

Every area detail surface should share the same capability tabs where data is
available:

| Tab | Purpose | Example In `01 Strategy` |
| --- | --- | --- |
| Overview | area health, owner, blockers, active lens | strategy health and ownership |
| Goals | goals, KPIs, targets, success signals | quarterly priorities |
| Workflows | processes, pipelines, procedures, stages | planning and review workflow |
| Tasks | execution pressure and assigned work | open strategy tasks |
| Knowledge | Drive/docs/notes/decisions relevant to area | strategy briefs and decisions |
| Resources | tools, repositories, files, providers | planning docs, dashboards, APIs |
| Decisions | approvals, risks, controls, open decisions | governance review queue |
| AI | agent permissions, safe actions, handoff state | Jarvis can summarize, Paperclip waiting |

### Sidebar Expanded Area Example

The sidebar should allow exactly one expanded area at a time on desktop. This
keeps navigation area-first while showing the useful views available in a
department.

Example expanded row:

```text
LuckySparrow
  Dzialy
    00 Ogolny
    01 Strategia
      Overview
      Goals
      Workflows
      Tasks
      Knowledge
      Resources
      Decisions
      AI
      + Add view
    02 Produkt
    ...
```

Rules:

- Expanded subviews are contextual shortcuts into the selected area only.
- The subview list should use small text and a thin left rail so it does not
  become a second large menu.
- `+ Add view` opens an area-scoped configuration flow for future custom
  views, not a global app-builder.
- Mobile should not show nested sidebar subviews by default; it should use an
  area selector plus horizontal capability tabs.

### Top Header Simplification

The top title/search bar should be quieter than previous concepts.

Desktop header:

- Left: current workspace and view label, for example `LuckySparrow / Company
  Atlas`.
- Center: one compact command search.
- Right: one quiet status sentence or pill group with at most three signals.
- Primary action appears in the selected-area panel, not always in the global
  header.

Mobile header:

- One row only: menu, `LuckySparrow`, search icon, status dot.
- Area title appears below as part of the content, not crammed into the topbar.

Avoid:

- four or more header pills
- large title plus subtitle plus search plus CTA in one row
- multiple global actions that compete with area actions

The canonical desktop target follows this by using:

```text
LuckySparrow / Company Atlas
Search area, process, resource...
13 areas / 87% ownership / 2 decisions
settings/filter icon
```

The canonical mobile target follows this by using:

```text
menu icon | LuckySparrow + online dot | search icon | guarded status
```

No mobile page should inherit the full desktop header.

### Area-First User Paths

These are the paths the UI must support before deeper custom screens are
designed.

| Path | User Intent | UI Sequence | Backend Sources |
| --- | --- | --- | --- |
| Company pulse | See the whole company state | Atlas -> area status -> right rail priority | `/v1/connection`, relationships, tasks, Drive, MCP manifest |
| Area triage | Understand one department | Sidebar area -> Overview tab -> signals and right rail | operating areas, table records, relationships |
| Strategic planning | Work inside `01 Strategia` | `01 Strategia` -> Goals -> Workflows -> Decisions | goals, targets, Company OS processes/pipelines, decisions |
| Delivery check | See work pressure | area -> Tasks -> task filters/status | tasks, task lists, ClickUp mappings |
| Knowledge review | Validate context for AI | area -> Knowledge -> Drive/resources/provenance | Google Drive files, resources, knowledge items |
| Ownership cleanup | Close MECE gaps | area -> Resources/Decisions -> owner assignment | operating model, resources, company roles, decisions |
| AI handoff | Delegate safely | area -> AI -> safe read/write capabilities -> approval | API keys, MCP manifest, approvals, audit logs |
| Custom area view | Add a useful area-specific view | area -> `+ Add view` -> choose source and layout | future view config, existing tables/routes |

### Component Map For Implementation

| Component | Responsibility |
| --- | --- |
| `CompanyShell` | Desktop/mobile shell, workspace, sidebar/drawer, content slots |
| `AreaSidebar` | 00-12 area list, selected state, one expanded area, status dots |
| `AreaSubnav` | Overview/Goals/Workflows/Tasks/Knowledge/Resources/Decisions/AI |
| `CommandSearch` | Cross-area search and jump; replaces header clutter |
| `CompanyAtlasBoard` | Central 00+12 visual map with selected area and status |
| `AreaOverviewPanel` | Selected area summary, signals, primary action |
| `AreaCapabilityPanel` | Tab content shell for each capability |
| `DecisionRail` | Today/priorities/AI/proof for selected area and global blockers |
| `ProgressivePath` | Overview -> Area -> Capability -> Record -> Evidence -> AI action |

### Area Page Anatomy

- `AreaHeader`: area name, owner/accountability, APQC lens, readiness,
  review debt, AI safety.
- `AreaCapabilityTabs`: same tab set for all areas; disabled/empty states
  explain accepted absence.
- `AreaOperatingStack`: goals -> workflows -> tasks -> evidence -> agent
  action.
- `AreaContextRail`: resources, knowledge, decisions, risks, controls,
  recent proof.
- `AreaAction`: one primary action for the active tab.

### Sidebar Behavior

- Desktop sidebar should show:
  - `Company Atlas`
  - `00 General`
  - 12 areas grouped or scrollable in a compact area list
  - a small bottom `System` link
- It should not show global app modules as permanent nav.
- Area rows can show tiny status dots and one count, but no nested command
  trees.
- On hover/click, area detail can show a popover or open the area view with
  capability tabs.

### Area-First Implementation Notes

- Replace global module navigation with a stable area list in the shared shell.
- The selected area should control the main view and the capability tabs.
- Capability tabs should share one component contract across all areas:
  `Overview`, `Goals`, `Workflows`, `Tasks`, `Knowledge`, `Resources`,
  `Decisions`, `AI`.
- The dashboard can still show the central atlas, but selecting an area should
  update:
  - selected orbit node
  - area header
  - capability tabs
  - area signals
  - right rail priorities
  - bottom progressive path
- Cross-cutting pages such as global settings and API safety can exist, but
  they should be reached from workspace/system controls or area-context links,
  not from a large primary sidebar module list.

### Desktop And Mobile Canonical Differences

| Concern | Desktop | Mobile |
| --- | --- | --- |
| Navigation | Persistent area sidebar with one expanded area | Topbar + horizontal area selector + bottom quick nav |
| Area subviews | Nested under expanded sidebar area and repeated as tabs in content | Horizontal capability tabs in selected area card |
| Atlas | Large radial map plus selected-area panel | Compact mini-map preview focused on selected area |
| Header | Breadcrumb, search, quiet status cluster | One compact app bar, no big search input |
| Right rail | Persistent `Today` rail | `Today` list below selected area content |
| Progressive path | Full bottom strip | Short breadcrumb text and bottom nav |
| Primary action | Area panel action | Area card action or Today row |

## Refined CEO Direction

After auditing the first generated concept, the approved direction should move
away from a six-card module dashboard toward an `Executive Operating Board`.

The refined V1 target is:

```text
Observe company state -> Decide owner actions -> Delegate safe AI work
```

The refined canonical image should be treated as the stronger implementation
reference because it reduces card sprawl and makes the central company flow
the main visual object.

### Refined Screen Model

- `ExecutiveHeader`: CEO title, global search, interpreted readiness pills,
  one primary priority action.
- `OperatingFlowBoard`: the central company map for V1, showing General
  Intake, Company Areas, Work Delivery, CRM Pipeline, Knowledge, and Agents.
- `BlockerPins`: attached to flow stages, not isolated in separate cards.
- `ExecutiveDecisionRail`: one right rail with owner decisions, AI handoff,
  and recent proof.
- `EvidenceFreshnessStrip`: a thin bottom proof strip, not a large grid.

## APQC Executive Atlas Direction

The strongest V1 direction should combine the refined CEO board with the
accepted organizational architecture bridge:

```text
vertical accountability + horizontal value flow + 12 areas + AI-safe execution
```

This direction is not a decorative city map. It is a calm management atlas that
lets the owner start from the whole company and progressively drill into one
area, process, resource, or AI handoff.

This APQC executive atlas was the structural turning point for the V1
direction. Earlier generated images remain useful as stepping stones, but the
implementation should use the current desktop/mobile area-first dashboard
references as the main visual source.

The polished executive atlas is the art-direction pass over this structure. It
should preserve the same information model while adding enough premium product
character to make CompanyCore feel like an exceptional management surface, not
a default dashboard.

The polished executive atlas remains a useful visual-polish reference, but it
is not the primary implementation target.

The area-first desktop/mobile references supersede it for implementation:
keep the polished visual quality where useful, but build the area-first
sidebar, selected-area tabs, simplified header, and mobile-specific layout.

### Central Model

- `00 General`: central intake, ambiguity, workspace, unassigned resources,
  triage, and orchestration.
- `01-12 Operating Areas`: the first stable management map.
- `APQC / Process Lens`: a compact lens that groups work into enterprise
  process families instead of raw app modules.
- `MECE Ownership`: every high-impact resource/process/tool should resolve to
  one accountable owner before AI write actions.
- `Human + AI Execution`: owner decisions, approvals, Jarvis/Paperclip
  handoffs, and MCP-safe actions.

### Screen Behavior

- Overview first: whole-company health, pressure, and accountability.
- Focus second: selected area with resources, workflows, blockers, and
  evidence.
- Detail third: route-specific tables, tools, editors, and command panels.

### Preferred First Viewport

- Sidebar: short command rail with `Atlas`, `Areas`, `Workflows`, `Knowledge`,
  `Agents`, and `Settings`.
- Header: `Executive Company Atlas`, global search, four readiness pills, and
  one primary action.
- Center: `Company operating map` with `00 General` in the middle and the 12
  operating areas around it.
- Lens bar: `All company`, `Govern`, `Build`, `Sell`, `Deliver`, `Support`,
  `Learn`, `Automate`.
- Selected detail: `00 General needs ownership routing`, with unmapped folders,
  resources needing owner, and agent actions waiting.
- Right rail: `Decide, delegate, prove`, grouped into the three operating
  questions.
- Bottom path: `Overview -> Area -> Process -> Resource -> Evidence -> Agent
  action`.

### Polished Visual Treatment

- Add subtle luminous status trails between `00 General`, operating areas,
  evidence, and agents. These trails represent real data freshness and
  dependencies, not decoration.
- Use layered atlas surfaces: a quiet base map, one selected-area panel, and a
  right decision rail.
- Add tiny live-state details: fresh sync dots, ownership pulse, review
  markers, and audit freshness. Keep them low-noise.
- Use more confident typography: large but compact title, clear labels,
  generous line height, and no tiny unreadable metadata.
- Keep implementation realistic:
  - CSS radial rings and lines
  - inline SVG connectors
  - Phosphor icon containers
  - Tailwind/DaisyUI cards, tabs, badges, progress bars
  - optional CSS transitions only after static fidelity is correct

### Polished Implementation Notes

- The luminous atlas center should be implemented as CSS/SVG layers, not as a
  static background image.
- The orbit connectors should remain data-addressable so hover/focus can later
  reveal relationships, ownership, or process context.
- The warm selected-area panel should be a real component bound to the selected
  focus area.
- The right rail sources row should be driven by integration/tool readiness,
  not decorative provider logos.
- The bottom path is the canonical progressive disclosure model for V1:
  `Overview -> Area -> Process -> Resource -> Evidence -> Agent action`.

### APQC-Inspired Lenses For V1 UI

Use APQC-inspired user-facing language without forcing a perfect taxonomy in
the first UI slice:

| Lens | Maps To Existing Areas |
| --- | --- |
| Govern | Strategy and governance, Finance, People, Controls |
| Build | Projects, delivery, assets, operations |
| Sell | Sales, CRM, marketing, growth |
| Deliver | Tasks, workflows, pipeline execution |
| Support | Admin, integrations, storage, reliability |
| Learn | Knowledge, decisions, metrics, audit |
| Automate | Automations, AI agents, MCP tools |

These lenses should be visual filters, not new database tables in the V1 UI.

## Dashboard V1 Layout

### Desktop First Viewport

Use a three-zone operational layout. The refined CEO concept should be favored
over the original card-grid concept.

1. `CompanyShell`
   - left sidebar, 264px
   - workspace switcher at top
   - only the primary sidebar items above
   - compact department switcher with `00 General` plus pinned/high-risk
     departments, not the full detailed area tree

2. `DashboardMain`
   - top command bar with search, workspace health, and one primary command
   - dominant `Company Brief` or `Operating Flow` panel:
     - current priority
     - blocked/review count
     - recommended owner action
     - suggested agent action if safe
   - operating flow board:
     - General Intake
     - Company Areas
     - Work Delivery
     - CRM Pipeline
     - Knowledge
     - Agents
   - blocker pins should sit directly on the affected flow stage.
   - supporting metrics should be small readiness indicators, not large cards.

3. `RightBrief`
   - owner decisions
   - Jarvis/Paperclip handoff
   - active blockers
   - recent proof

### Tablet

- Sidebar collapses to a narrow rail with drawer.
- Main keeps the `Company Brief` first.
- Right brief moves under the top brief as a two-column row.
- Widget grid becomes two columns.

### Mobile

- Topbar: workspace, search icon/button, menu.
- First viewport:
  - `Company Brief`
  - one primary action
  - three compact state chips
- Widgets become a prioritized list, not a dense card grid.
- Sidebar becomes drawer; bottom quick actions can show:
  Dashboard, Areas, Tasks, Drive, Agents.

## Canonical Dashboard Widgets And Flow Stages

Widgets remain useful on secondary dashboard sections and route modules, but
the first viewport should use the `OperatingFlowBoard` as the main object.

| Flow Stage / Widget | Source Data | Shows | Primary Link |
| --- | --- | --- | --- |
| General Intake | `/v1/connection`, Drive, mappings | unassigned context and intake debt | `/areas?area=main-general` |
| Company Areas | `/v1/connection` operating model | area readiness, empty/review areas, ownership debt | `/areas` |
| Relationships | `/v1/relationships/graph` | direct/inferred/needs-review links | `/relationships` |
| Work Delivery | `/v1/tasks` | open, blocked, overdue, source freshness | `/data/tasks` |
| CRM Pipeline | `/v1/company-os` and pipeline records | active stage runs, blocked runs, approvals | `/pipeline` or `/react-company-os` |
| Knowledge | `/v1/google-drive/files` | imported folders/files, unassigned count, freshness | `/settings/drive` |
| Integrations | `/v1/connection`, integration settings | ClickUp, Drive, graph, MCP readiness | `/settings/integrations` |
| Agents | `/v1/mcp/manifest`, `/v1/api-keys` | safe tools, supervised tools, broad keys, Jarvis/Paperclip handoff | `/settings/api` |
| Data Quality | operating tables and table snapshots | populated/empty tables, records needing context | `/data` |

## Component Boundaries

Implementation should extract shared layout before route polish.

### Layout Components

- `CompanyAppShell`
  - owns desktop/sidebar/tablet/mobile shell behavior.
  - renders `CompanySidebar`, `TopCommandBar`, route body, and optional
    `RightBrief`.

- `CompanySidebar`
  - owns workspace selector, primary IA, active state, and compact department
    switcher.
  - should not render route-specific action buttons.

- `TopCommandBar`
  - owns command search, workspace health, user/account action, and one route
    primary command slot.

- `CommandBrief`
  - reusable summary panel for dashboard and route modules.
  - props: priority, reason, blockers, primaryAction, secondaryAction,
    agentSuggestion, evidence.

- `RightBrief`
  - contextual queue for decisions, blockers, recent evidence, and agent-safe
    handoffs.

- `MobileQuickNav`
  - five item max, stable destinations, no route-specific sprawl.

### Data Components

- `DashboardWidget`
  - one metric cluster, one status, one link.
  - variants: ready, review, blocked, muted.

- `OperatingFlowBoard`
  - central V1 dashboard component.
  - renders flow stages, dependency lines, readiness bars, and blocker pins.
  - should consume summarized state from existing connection, relationship,
    task, Drive, Company OS, and MCP data.

- `CompanyAtlasBoard`
  - likely final V1 dashboard candidate if the APQC atlas concept is accepted.
  - renders `00 General` plus the 12 operating areas as a calm map/compass.
  - supports selected area focus without leaving the dashboard.
  - shows APQC/process lens, MECE ownership coverage, blocker count, and AI
    handoff readiness from existing data.

- `AreaOrbitNode`
  - compact area item with readiness, blocker, ownership, and freshness state.
  - variants: healthy, review, blocked, empty accepted.

- `ProcessLensBar`
  - APQC-inspired filter row for Govern, Build, Sell, Deliver, Support,
    Learn, Automate.
  - must be a filter/context lens, not a new route directory.

- `BlockerPin`
  - small callout attached to a flow stage.
  - props: title, source, severity, destination.

- `ExecutiveDecisionRail`
  - replaces multiple separate right-column cards.
  - sections: owner decisions, AI handoff, recent proof.

- `LinkedModuleRow`
  - used in sidebar department detail, right brief, and mobile widget list.

- `StatusChip`
  - source-backed state only: ready, review, blocked, offline.

- `EvidenceLine`
  - small timestamp/source/proof line used for trust, not decoration.

- `ModuleHeader`
  - route title, what matters now, one primary action, local search/filter slot.

## Tailwind + DaisyUI Style Direction

### Theme

Keep the existing `companycore` DaisyUI theme but tune the application around
calm professional management, not decorative map-first V2 visuals.

Suggested tokens:

| Token | Value | Use |
| --- | --- | --- |
| `base-100` | `#ffffff` | main content surfaces |
| `base-200` | `#f5f7fb` | app background |
| `base-300` | `#d9e2ee` | dividers and quiet borders |
| `neutral` | `#071225` | sidebar and high-trust text |
| `primary` | `#245fd1` | primary actions and active navigation |
| `accent` | `#16845b` | healthy/ready |
| `warning` | `#b87700` | review/action needed |
| `error` | `#c2413d` | blocked/unsafe |
| radius | `8px` | cards, buttons, inputs, icon containers |

### Typography

- Font: Inter or current system fallback.
- H1 in app: 28-32px desktop, 24-28px tablet, 22-24px mobile.
- Panel headings: 16-20px, bold but compact.
- Labels: 11-12px uppercase only for tiny utility metadata.
- Body: 14-15px, no long paragraphs inside dense panels.
- Buttons: 13-14px, medium/bold, no wrapped command labels where avoidable.

### Visual Rules

- Use fewer cards, with stronger roles:
  - command brief = largest surface
  - widget = compact linked panel
  - right brief = list/queue
  - tables = quiet data surfaces
- No nested cards.
- One primary action per visible region.
- Icon containers: 36-40px square, 8px radius, Phosphor bold.
- Shadows only for the main command brief and overlays; repeated widgets use
  border and background contrast.
- Keep background white/blue-gray, not beige, not dark-blue-dominated, and not
  purple-gradient.

## Pixel-Perfect Implementation Plan

1. Approval gate:
   - user approves the canonical image and this spec
   - record any changed labels or layout decisions before code

2. Component extraction:
   - create shared shell/layout primitives first
   - point dashboard route at the shared shell
   - avoid route-local sidebar/topbar markup

3. Dashboard slice:
   - implement desktop dashboard from the canonical image
   - compare screenshot to image at 1366x900
   - fix spacing, hierarchy, color, icon, and copy drift before mobile

4. Responsive slice:
   - tablet 834x1112
   - mobile 390x844
   - verify no horizontal overflow and first viewport has brief + primary action

5. Route migration:
   - Areas
   - Relationships
   - Tasks
   - Drive
   - Integrations
   - Agents/API/MCP
   - Data
   - Pipeline/Company OS

6. Validation:
   - `npm run check:public-js`
   - `npm run validate`
   - `npm run test:api` when PostgreSQL/Docker is available
   - signed-in browser proof for dashboard, areas, tasks, drive, agents
   - concept-to-screenshot fidelity ledger with at least five comparison
     points

## Implementation Risks

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Sidebar simplification hides power features | Existing advanced routes are useful for agents and operators | Move advanced routes into module headers and detail panels, not permanent nav |
| Component extraction collides with dirty W02 changes | Worktree already has in-progress shell changes | Wait for W02 verification or branch carefully before runtime edits |
| Dashboard becomes static mockup | User needs real backend-backed state | Every widget must map to current API/connection data |
| V1 conflicts with V2 city direction | Existing docs approve Company City later | Treat V1 as operational foundation and V2 as future visual layer |
| Agent safety gets buried | Jarvis/Paperclip need safe access visibility | Keep `Agents` widget and right brief showing safe/supervised readiness |

## Acceptance For Future Code Task

- Sidebar has no more than 10 primary destinations.
- Dashboard first viewport has one dominant command brief.
- Every dashboard widget links to a real route and maps to a real backend
  capability.
- Every visible button has a clear job; no action clusters with more than one
  primary button.
- Shell components are shared rather than copied across route bodies.
- Desktop/tablet/mobile screenshots are compared to the canonical image and
  recorded in the task result report.
