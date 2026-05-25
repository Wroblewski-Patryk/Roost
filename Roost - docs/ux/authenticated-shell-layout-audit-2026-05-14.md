# Authenticated Shell Layout Audit

Date: 2026-05-14
Reviewer: Codex
Scope: logged-in web app layout after authentication across mobile, tablet,
and desktop, with focus on shared shell, sidebar, top command bar, dashboard,
React workbenches, and canonical reusable elements.

## Executive Summary

The authenticated web app has useful operational surfaces, but the shared
layout is not yet a canonical CompanyCore product frame. The current owner
console teaches two navigation models:

- the vanilla console uses a persistent left sidebar plus top module switcher;
- React routes use a separate horizontal navigation bar without the same
  workspace shell, status strip, or sidebar mental model.

This makes the main sidebar feel odd because it is organized as a generic route
directory rather than as the user's company operating system. It does not yet
carry the accepted Company City model strongly enough: `00 Ogolny`, the 12
departments, command pressure, blocked work, integrations, and AI-ready actions
should all feel like parts of one company map.

The next UX implementation should create a canonical authenticated shell before
polishing individual routes. The shell should make every private surface answer
three questions in the first viewport:

- What matters now?
- What is blocked or needs review?
- Where do I act next?

## Evidence Reviewed

| Evidence | What it showed |
| --- | --- |
| `docs/ux/company-city-dashboard-v3-spec.md` | The approved target is a Company City shell with left navigation, top command bar, city canvas, right command brief, value journey, and status strip. |
| `docs/ux/design-system-contract.md` | The UI must be management-first, reuse shared shell patterns, and preserve the Company City direction on high-level surfaces. |
| `docs/ux/design-memory.md` | Existing approved patterns include semantic sidebar sections, compact mobile topbar, command center pairing, workbench rows, and Company City map direction. |
| `public/index.html`, `public/styles.css`, `public/app.js` | Vanilla private routes use a left sidebar, sticky topbar, route title, module search, account/API shortcuts, and drawer behavior under `860px`. |
| `web/src/react-route-kit.tsx` screenshots | React routes currently use a separate top horizontal nav, not the same authenticated shell. |
| `C:\Users\wrobl\AppData\Local\Temp\companycore-full-audit-20260514-180653` | Production screenshots for dashboard, data/tasks, areas, settings, and React routes at desktop and mobile. |

## Current Layout Inventory

| Surface | Current Pattern | Strength | Gap |
| --- | --- | --- | --- |
| Vanilla desktop shell | Fixed 280px left sidebar + sticky topbar + content shell. | Stable, scannable, active route shown, module search exists. | Sidebar labels are route/job-family based, not Company City based; no status strip; no canonical right command brief; dashboard content is card-heavy instead of map-led. |
| Vanilla mobile shell | Compact topbar with Menu, route identity, Sign out; sidebar becomes drawer. | The first row is much better than the older dense mobile chrome. | Drawer remains a route list; no bottom action/navigation model; current route title and page title duplicate early vertical space. |
| React desktop routes | Header + horizontal route nav + large panels. | Clean workbench surfaces and route-specific React primitives. | Separate IA from vanilla shell; no persistent sidebar; active model differs from dashboard shell; makes future canonicalization harder. |
| React mobile routes | Wrapped horizontal nav above content. | Route remains reachable. | Header/nav consumes a lot of first viewport; content can become narrow word-by-word; no drawer/bottom nav behavior. |
| Dashboard | Operational cockpit and attention queue. | Real data, useful priority and blockers. | Does not implement accepted Company City visual direction; still reads as an admin dashboard. |
| Workbenches | Context panel, stats, filters, lists/details. | Strong operational foundation for dense work. | Needs a shared shell context layer so users know which department, value stage, and command pressure each workbench belongs to. |

## Key UX Findings

### P0: One Product Has Two Shells

Problem: Vanilla routes and React routes have different navigation frames.
The user sees a left sidebar in one part of the app and a horizontal React route
bar in another. This creates a product-level orientation break.

User impact: The owner cannot build one reliable spatial memory for where
Dashboard, Company OS, areas, integrations, tasks, and agent tools live.

Recommendation: Create one `CompanyShell` contract for all private routes:
left navigation or compact rail on desktop/tablet, drawer or bottom navigation
on mobile, top command bar, status strip, and a route-level command brief slot.

### P0: Sidebar Is A Route Directory, Not A Company Operating Model

Problem: The current sidebar groups links as Command, Operate, Integrations,
Workspace. This is better than a flat list, but it does not yet express
CompanyCore's strongest mental model: company city, `00 Ogolny`, departments,
command work, integrations, and agent control.

User impact: Navigation helps the user open pages, but it does less to help
them manage everything the app is about.

Recommendation: Redesign the sidebar as a command-and-company navigation rail:

- Command: `Mapa firmy`, `Brief dowodzenia`, `Kolejka uwagi`.
- Company Areas: `00 Ogolny`, selected 12 departments, with an expandable
  district switcher rather than 13 permanent full labels on every viewport.
- Workbenches: `Dane`, `Zadania`, `Relacje`, `Procesy`, `Company OS`.
- Integrations & Agents: `Mapa integracji`, `ClickUp`, `Google Drive`,
  `Agent API`, `MCP tools`.
- Workspace: account, settings, health, sign out.

### P0: Dashboard Must Become The Canonical Company Map

Problem: The dashboard still presents panels and stats while the accepted
direction requires a city/map-led command entry.

User impact: The first logged-in screen does not yet teach the product's core
metaphor or make company ownership feel tangible.

Recommendation: Implement the dashboard as the canonical first shell proof:
city canvas in the main area, right command brief, bottom value journey, left
navigation, top command bar, and status strip. Dense workbenches should inherit
the shell but become calmer content surfaces.

### P1: Topbar Search Should Be A Command Launcher

Problem: `Jump to module` is useful but route-oriented. It searches modules,
not company objects, actions, blockers, or command destinations.

User impact: The user can jump routes, but not manage "what needs action now"
from the shell.

Recommendation: Promote it to `Command search` / `Go to...` with grouped
results:

- screens and departments;
- records and provider containers;
- blockers and review queues;
- create actions;
- agent-safe commands that require approval.

### P1: Mobile Needs Action-First Navigation, Not A Shrunk Desktop

Problem: Mobile vanilla shell is compact, but React mobile still shows a large
horizontal nav. Workbenches can push primary content below secondary context.

User impact: Mobile is usable for checking status, but not yet optimized for
quick owner action.

Recommendation: Mobile shell order should be:

1. topbar: Menu, current module/area, primary safety action;
2. command brief: one priority, blockers, one action;
3. compact map/district switcher or selected department card;
4. workbench content;
5. bottom navigation for the 3 to 5 most common destinations when the route is
   part of the canonical app shell.

### P1: Tablet Should Be Its Own Layout

Problem: The current breakpoints mostly collapse desktop into one column.
Tablet needs a deliberate split model.

User impact: Tablet wastes the chance to show a selected district/workbench and
command context together.

Recommendation: Tablet should use a compact rail, selected district/map area,
and a side or stacked command brief. Avoid forcing full desktop labels and avoid
mobile-only single-column when a two-pane workbench would help.

### P1: Status And Health Need A Persistent Shell Home

Problem: Connection status appears in sidebar/dashboard cards, but there is no
canonical status strip matching the V3 spec.

User impact: Health, sync freshness, environment, and agent readiness can feel
scattered.

Recommendation: Add a `StatusStrip` to the authenticated shell. Desktop can
show workspace health, sync state, active integrations, environment, and last
updated. Mobile should show one-line health with expandable details.

## Canonical Authenticated Layout Proposal

### Desktop Web

| Zone | Canonical Behavior |
| --- | --- |
| Left rail | Persistent `CompanySidebar`: brand/workspace, command entry, area switcher, workbenches, integrations/agents, workspace controls. |
| Top command bar | Command search, create/action menu, notifications/attention, account. It should not duplicate every sidebar destination. |
| Main content | Route-owned content. Dashboard uses the Company City canvas. Workbenches use table/list/detail patterns. |
| Right command brief | Optional but preferred on dashboard and high-level routes; shows next action, blockers, decisions, risk, integrations, agent actions. |
| Bottom/status strip | Health, sync, environment, last update, active integrations, agent readiness. |

### Tablet Web

| Zone | Canonical Behavior |
| --- | --- |
| Navigation | Compact rail or drawer rail with icons + active label; full sidebar only when width allows. |
| Content | Two-pane when useful: map/workbench plus selected context. |
| Command brief | Persistent side panel in landscape; stacked after top priority in portrait. |
| Controls | Touch-friendly target sizes, no text-overflow reliance for primary controls. |

### Mobile Web

| Zone | Canonical Behavior |
| --- | --- |
| Topbar | One compact row: Menu, current area/module, sign out/account safety. |
| Navigation | Drawer for full IA; optional bottom nav for `Mapa`, `Brief`, `Dane`, `Zadania`, `Ustawienia` when route family supports it. |
| First content | Priority command brief before broad stats. |
| Map | Thumbnail, carousel, or selected district card; never tiny full-map labels. |
| Workbenches | Stack selected context before long tables; use local filters and contained horizontal scroll only for true data tables. |

## Sidebar Redesign Direction

The sidebar should stop being merely a page list and become the user's operating
orientation system.

| Lane | Role | Example Destinations |
| --- | --- | --- |
| Command | What requires owner attention now. | Mapa firmy, Brief dowodzenia, Kolejka uwagi, Decyzje. |
| Company Areas | Where work belongs. | 00 Ogolny, pinned departments, full area switcher. |
| Workbenches | How the user acts on company objects. | Dane, Zadania, Relacje, Procesy/Pipeline, Company OS. |
| Integrations & Agents | External systems and AI access. | Mapa integracji, ClickUp, Google Drive, Agent API, MCP tools. |
| Workspace | Ownership and environment. | Account, workspace settings, status, sign out. |

Rules:

- Keep active route and active company area visible at the same time.
- Use Phosphor icons in 8px-radius square containers for top-level lanes.
- Use badges only for real counts: blocked, review, unassigned, syncing,
  disconnected, approval required.
- Avoid permanently listing all 13 areas if that makes the rail harder to scan;
  use pinned/active areas plus a district switcher.
- Do not duplicate topbar command search as a second full navigation tree.

## Shared Component Contract

| Component | Required Role | Minimum States |
| --- | --- | --- |
| `CompanyShell` | Owns private chrome for all authenticated routes. | signed out, loading, ready, error/degraded. |
| `CompanySidebar` | Persistent orientation and navigation. | expanded, collapsed, drawer, active, badge, disabled/unavailable. |
| `TopCommandBar` | Search, command launch, create, notifications, account. | idle, search focused, result selected, notification unread, account open. |
| `CommandBriefPanel` | Explains what matters, blockers, and next actions. | empty, loading, healthy, needs review, blocked, error. |
| `CompanyAreaSwitcher` | Selects `00 Ogolny` and 12 departments. | selected, pinned, review, blocked, search/filter. |
| `StatusStrip` | Quiet operational health and freshness. | healthy, syncing, degraded, stale, disconnected. |
| `MobileShellNav` | Mobile drawer/bottom shortcuts. | closed, open, active, focus trapped, dismissed. |

## Implementation Slices

| Order | Slice | Goal | Verification |
| --- | --- | --- | --- |
| 1 | Shell architecture decision | Decide whether canonical shell lands first in React, vanilla, or a wrapper bridging both. | Architecture note and no duplicate shell decision left implicit. |
| 2 | Sidebar IA redesign | Replace route-directory grouping with command/company/workbench/integration/workspace model while preserving route contracts. | Desktop/tablet/mobile screenshots; active route and active area visible. |
| 3 | Dashboard Company City proof | Build `/dashboard` as the canonical Company City entrypoint. | Screenshot comparison against `docs/ux/company-city-dashboard-v3-spec.md`. |
| 4 | React route shell convergence | Bring `/react-company-os`, `/react-agent-tools`, `/react-areas`, and future React routes into the same shell model. | No separate horizontal product nav on React routes; browser route smoke passes. |
| 5 | Mobile/tablet shell QA | Validate drawer, bottom shortcuts, overflow, focus trap, and command brief order. | Playwright screenshots and focus/overflow checks at mobile/tablet/desktop. |
| 6 | Pattern documentation | Update design memory and component docs after implementation proof. | Docs name the reusable shell components and responsive rules. |

## Acceptance Criteria For The Next Implementation

- All private routes share one authenticated shell model or explicitly document
  why a route is transitional.
- Desktop shows persistent orientation: workspace, active route, active company
  area or workbench family, command search, and health.
- Tablet has an intentional compact-rail or split-panel layout.
- Mobile shows primary command content before broad directories or large stats.
- Dashboard implements the Company City V3 structure or an explicit
  user-approved supersession decision is recorded.
- Sidebar/navigation labels support company management, not only page opening.
- No new one-off route-local navigation system is introduced.
- Browser proof captures desktop, tablet, and mobile with no horizontal
  overflow, no console errors, and no inaccessible hidden navigation controls.

## Open Questions Before Coding

| ID | Question | Recommendation |
| --- | --- | --- |
| UX-SHELL-Q1 | Should the canonical shell be implemented directly in React first? | Yes. React already owns the migration path and reusable primitives; vanilla should either be wrapped or migrated route by route. |
| UX-SHELL-Q2 | Should all 13 departments be always visible in the sidebar? | No. Show `00 Ogolny`, active/pinned departments, and a district switcher. Full map belongs to dashboard/area views. |
| UX-SHELL-Q3 | Should mobile use bottom navigation? | Use it only for the core app destinations after the drawer remains available. Avoid adding bottom nav to dense one-off setup forms unless it improves return navigation. |
| UX-SHELL-Q4 | Should the sidebar be dark graphite per V3 target? | Yes for the Company City shell proof, provided contrast and workbench readability remain strong. Dense editors can keep quieter light content surfaces inside the shell. |

## 2026-05-14 Direction Correction

The user clarified that Company City V3, strategy-game visuals, gamification,
and native mobile app work belong to V2. The immediate product objective is a
complete web + backend + MCP foundation that is intuitive for the owner and
safe/useful for AI agents.

Updated recommendation:

- Do not implement the Company City dashboard now.
- Keep the Company City/gameification direction as future V2 source of truth.
- Implement the pre-V2 operating shell first: workspace selector, operating
  areas, expandable resource families, relationship/integration visibility,
  and MCP readiness.
- Use `docs/architecture/web-and-mcp-foundation-before-v2.md` and
  `docs/planning/web-and-mcp-foundation-task-plan.md` as the immediate target.
