# Design Memory

Purpose: keep a compact memory of approved visual directions, reusable UI
patterns, and verified UX learnings so future tasks can build on them instead
of rediscovering them.

## Update Rules

- Add or update an entry when a visual pattern, layout approach, or interaction
  rule has been approved in implementation or review.
- Prefer updating an existing entry over creating duplicates.
- Keep entries specific enough to reuse in future tasks.
- If a pattern is project-specific, say so explicitly.

## Entry Template

```markdown
### YYYY-MM-DD - Short Title
- Type: visual_direction | reusable_pattern | responsive_rule | ux_learning
- Context:
- Decision:
- Reuse when:
- Avoid when:
- Evidence:

### YYYY-MM-DD - Background Asset Fidelity Rule
- Type: ux_learning
- Context:
- Decision:
- Reuse when:
- Avoid when:
- Evidence:
```

## Entries

### 2026-05-14 - Relationship Confidence Badges
- Type: reusable_pattern
- Context: WEBFOUND-008B upgraded `/relationships` from raw provider/Drive
  lists to a graph-backed review workbench that can be trusted by owners and
  future MCP agents.
- Decision: Relationship rows that may influence owner or agent decisions must
  visibly label whether a link is `Direct`, `Provider hierarchy`,
  `Route inferred`, `Needs review`, or `Unsupported`.
- Reuse when: Rendering relationship graph rows, integration readiness gaps,
  MCP relationship-read previews, operating-area relationship cards, and any UI
  that mixes direct database facts with inferred/provider-derived context.
- Avoid when: The row is a simple local UI action with no relationship
  confidence or AI-facing meaning.
- Evidence: WEBFOUND-008B Playwright proof verified `/relationships` renders
  direct, provider-hierarchy, route-inferred, needs-review, and unsupported
  markers without overflow or console failures.

### 2026-05-14 - Pre-V2 Web And MCP Foundation
- Type: ux_learning
- Context: The user clarified that Company City V3, game-like visuals,
  gamification, and native mobile app work are V2 direction. Before that, the
  application must become a fully working web + backend + MCP foundation.
- Decision: Prioritize workspace selection, operating-area/resource navigation,
  relationship and integration clarity, and MCP workspace-safe usability before
  implementing Company City visuals or gamification.
- Reuse when: Planning near-term owner-console work, sidebar changes,
  workspace management, integration mapping, relationship review, API key/MCP
  usability, and data-completeness work.
- Avoid when: Starting visual/game-like V2 implementation before the foundation
  readiness gate passes.
- Evidence:
  `docs/architecture/web-and-mcp-foundation-before-v2.md` and user feedback on
  2026-05-14.

### 2026-05-14 - Canonical Authenticated Shell
- Type: reusable_pattern
- Context: The user asked for a post-login web layout audit because the main
  sidebar felt odd and should help manage everything the app touches. The audit
  found that vanilla private routes and React routes currently teach two
  different navigation models.
- Decision: Use one private `CompanyShell` contract across the logged-in web
  app: workspace selector, operating-area/resource navigation, workbench links,
  integration/relationship links, AI/MCP links, top command bar, contextual
  command brief, and status strip. Desktop keeps persistent orientation,
  tablet uses a compact rail or split panel, and mobile leads with a compact
  topbar plus command-first content.
- Reuse when: Building or migrating dashboard, Company OS, areas, integrations,
  task/data workbenches, agent tools, and any private route that needs product
  chrome.
- Avoid when: A route is an intentionally transitional proof route; even then,
  document the exception and do not add another permanent navigation model.
- Evidence:
  `docs/ux/authenticated-shell-layout-audit-2026-05-14.md` and APP-AUDIT-001
  screenshot artifacts from
  `C:\Users\wrobl\AppData\Local\Temp\companycore-full-audit-20260514-180653`.

### 2026-05-14 - Company Command Rail Repair
- Type: reusable_pattern
- Context: ACF-UX-003 repaired the shell after user feedback that the sidebar
  and floating header were not useful enough for company management.
- Decision: The current pre-V2 authenticated shell uses a dark company command
  rail with lanes for `Command`, `Company areas`, `Workbenches`,
  `Integrations & agents`, and `Workspace`. The topbar is a compact command
  bar with route context, command search, status on desktop, and a one-row
  mobile/tablet layout. The dashboard page title is suppressed because the
  shell title already provides route context and the company map should start
  the first viewport.
- Reuse when: Refining sidebar IA, migrating React routes into the canonical
  shell, adding status/attention signals, or reviewing whether a new private
  route helps the owner act on company work.
- Avoid when: Adding route-local nav bars, duplicated page titles, broad
  directory menus, or mobile headers that push the first command surface below
  the fold.
- Evidence: ACF-UX-003 `npm test` passed against disposable PostgreSQL on
  `localhost:55467`; Playwright fallback verified desktop `1366x900`,
  tablet `834x1112`, and mobile `390x844` with no horizontal overflow, no
  console issues, mobile drawer open, and mobile topbar height `65px`.

### 2026-05-15 - Route Command Frame
- Type: reusable_pattern
- Context: V2VIS-002 responded to broad user feedback that the app still felt
  weak and not useful enough across views after the first shell repair.
- Decision: Private vanilla routes should expose a compact route command strip
  below the topbar with the route family, what matters now, blocked/review
  signal, and two quick actions. Shared React routes should use a CompanyCore
  command shell with desktop left rail, grouped navigation, workspace status,
  compact route topbar, and mobile shortcut rail instead of a header-only
  horizontal navigation model.
- Reuse when: Adding private routes, migrating React previews, reviewing
  route body polish, or deciding where a route should surface next action and
  blocked-state information.
- Avoid when: Building public/auth routes, modal-only flows, or one-off
  experiments that are not part of the authenticated management console.
- Evidence: V2VIS-002 `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test`, and Playwright fallback proof on
  `http://127.0.0.1:3115` passed at desktop `1366x900`, tablet `834x1112`,
  and mobile `390x844` with no overflow, no console issues, no failed
  requests, and zero unnamed visible controls.

### 2026-05-14 - Company City Strategic Map
- Type: visual_direction
- Context: The user approved the generated dashboard direction showing a
  cinematic-realistic company city/campus map with classic architecture,
  visible districts, a `GENERAL` intake core, command brief, and value journey.
- Decision: Use `Company City Map` as the canonical UX/UI direction for the
  logged-in dashboard and future high-level company-map surfaces. The product
  should feel like a light strategy game where the user builds and steers a
  company-city, while remaining a serious human/AI operational system.
- Reuse when: Designing dashboard, operating-area map, department overview,
  integration map, task/decision command views, onboarding into company
  structure, and responsive web/native mobile equivalents.
- Avoid when: Building dense record editors, security-sensitive credential
  forms, or table-first CRUD surfaces where cinematic imagery would obscure
  the primary action; keep those screens calmer but connected to district
  identity and command context.
- Evidence: User selected the generated Company City dashboard direction on
  2026-05-14 and requested the decision be saved as the UX/UI development
  direction, including web desktop/tablet/mobile and native mobile/tablet.

### 2026-05-14 - Light Strategy Gamification
- Type: reusable_pattern
- Context: The Company City direction should be more engaging than a standard
  OS/dashboard while still managing real company data, tasks, integrations,
  automations, and workflows.
- Decision: Use light gamification only when it represents real progress:
  district readiness, value-flow stage progress, verified milestones,
  automation readiness, unassigned GENERAL cleanup, and completed operating
  missions. The game layer must make work clearer, not noisier.
- Reuse when: Showing progress, onboarding users through company setup,
  motivating cleanup/routing/proof tasks, or summarizing improvement across
  departments.
- Avoid when: The metric cannot be traced to real evidence, creates pressure
  without business value, or distracts from decisions, permissions, security,
  money, or customer-impacting work.
- Evidence: User requested a strategic-game feel for creating a company like a
  city and asked to add light gamification to make the application more
  attractive.

### 2026-05-14 - Company City Dashboard V2 Target
- Type: reusable_pattern
- Context: After accepting the Company City direction, the user requested a
  clearer Dashboard V2 target and a table-like inventory of elements to prevent
  future drift between generated images and implementation.
- Decision: Use `docs/ux/company-city-dashboard-v3-spec.md` and
  `docs/ux/assets/company-city-dashboard-v2-target.png` as the current
  dashboard target. Implementation must follow the corrected structure in the
  spec: `GENERAL` as area `00`, exactly 12 numbered operating districts, a
  right `Command Brief`, bottom `Value Journey`, and subtle status strip.
- Reuse when: Building or reviewing the logged-in dashboard, company map,
  area overview, shared shell, command brief, value journey, status strip, or
  responsive dashboard adaptations.
- Avoid when: A later accepted visual target supersedes this one; record the
  replacement in the same spec rather than leaving conflicting chat notes.
- Evidence: UXD-002 Dashboard V2 target capture on 2026-05-14.

### 2026-05-14 - Company City Dashboard V3 Department Model
- Type: visual_direction
- Context: The user provided the canonical department list:
  `00 Ogolny`, `01 Strategia`, `02 Produkt`, `03 Sprzedaz`, `04 Operacje`,
  `05 Relacje`, `06 Kadry`, `07 Finanse`, `08 Zasoby`, `09 Technologia`,
  `10 Prawo`, `11 Innowacje`, `12 Zarzadzanie`.
- Decision: Dashboard V3 supersedes the earlier value-chain department labels.
  The city map must use the user's universal company department model and keep
  sales/delivery/automation concepts as workflows or objects inside those
  departments where appropriate.
- Reuse when: Prompting or implementing the Company City dashboard, area map,
  department markers, navigation, and department drill-downs.
- Avoid when: A future accepted department taxonomy supersedes this model.
- Evidence: Dashboard V3 and `12 Zarzadzanie` department targets captured on
  2026-05-14.

### 2026-05-14 - Zarzadzanie Department Drill-Down
- Type: reusable_pattern
- Context: The user requested a preview of department `12 Zarzadzanie` after
  refining the dashboard to the canonical department model.
- Decision: Department drill-downs should combine a cinematic district context
  panel with real operational workbench sections and a contextual right panel.
  For `12 Zarzadzanie`, the canonical sections are strategic decisions, risks
  and controls, management rhythm, management panel, and a relationship map to
  related departments.
- Reuse when: Designing other department detail views from the Company City map.
- Avoid when: A detail route is a narrow CRUD editor; keep those calmer but
  preserve department identity and command context.
- Evidence:
  `docs/ux/assets/company-city-management-department-v1-target.png`.

### 2026-05-09 - React Canonical Route Switch Gate
- Type: ux_learning
- Context: `/react-tasks`, `/react-integrations`, and `/react-areas` now prove
  the shared React route kit can support dense management surfaces, but the
  vanilla owner console still owns several setup, edit, and mapping actions.
- Decision: Do not switch canonical vanilla routes to React until the target
  React route owns or intentionally routes all critical actions from the
  matching vanilla surface. Read/filter parity is not enough for replacement.
- Reuse when: Deciding whether a React preview route can replace a canonical
  owner-console route.
- Avoid when: A route is explicitly read-only by product design and has no
  owner action parity requirement.
- Evidence: UXA-018 keeps `/tasks-adapter`, `/settings/integrations`, and
  `/areas` canonical because React counterparts lack typed CRUD,
  provider/Drive setup, relationship review, or mapping controls.

### 2026-05-09 - React Integration Map Workbench
- Type: reusable_pattern
- Context: React migration needs a second real workbench that helps owners
  understand provider readiness, API exposure, and company-area coverage before
  any canonical route switch.
- Decision: Use a parallel React route with a readiness notice, provider/data
  cards, metric strip, filters, and a coverage table. Treat `main-general` as
  the only non-company fallback row to exclude from company-area coverage; keep
  the 12 canonical company areas visible even when they are system-owned.
- Reuse when: Migrating integration, relationship, operating-area, or API
  overview screens that need to answer readiness, ownership, and next action.
- Avoid when: A route needs full provider setup/edit behavior in the same
  slice; link back to the canonical setup route until parity is explicit.
- Evidence: UXA-014 adds `/react-integrations` with live `/v1/connection`
  data, provider/data-path cards, search and coverage filters, 12 operating
  area rows, desktop/mobile rendered checks, and preserved
  `/settings/integrations`.

### 2026-05-08 - React Task Workbench Route
- Type: reusable_pattern
- Context: React migration needs to prove a real owner workbench with live
  business records before replacing canonical vanilla routes.
- Decision: Use a parallel React route first. Load the owner session,
  `/v1/connection`, and the target business API directly; pair a command
  header with local notice, metric cards, filters, and the reusable
  `DataTable`. Keep create/edit actions linked to the existing canonical
  editor until route replacement is explicitly approved.
- Reuse when: Migrating another dense workbench from vanilla to React while the
  current vanilla route remains the safest canonical path.
- Avoid when: The route replacement decision has already been made and the
  task is to move the canonical route itself.
- Evidence: UXA-012 adds `/react-tasks` with live `/v1/tasks` data, search,
  status/source/list filters, signed-out/loading/empty/error/success states,
  desktop/mobile rendered checks, and preserved `/tasks-adapter` plus
  `/data/tasks` fallbacks.

### 2026-05-08 - React Table And Local Notice Primitives
- Type: reusable_pattern
- Context: Dense workbench migration needs reusable table and action-feedback
  primitives before whole vanilla routes move into React.
- Decision: Use `LocalNotice` for local info/success/warning/error feedback
  and a generic `DataTable` with column definitions, empty state, and an
  internal `.react-table-shell` scroller for mobile overflow containment.
- Reuse when: Building React workbenches, settings tables, relationship queues,
  provider review surfaces, migration ledgers, and local action feedback.
- Avoid when: A table is merely static documentation or when a route has not
  yet moved into the React migration path.
- Evidence: UXA-011 renders live operating-model preview rows and migration
  readiness rows on `/react-dashboard`, with desktop/mobile rendered checks
  proving no page-level horizontal overflow.

### 2026-05-08 - CompanyCore DaisyUI Theme
- Type: reusable_pattern
- Context: React migration needs a consistent, management-first theme instead
  of ad hoc DaisyUI defaults.
- Decision: Use the `companycore` DaisyUI theme for React surfaces, with white
  and soft-blue operational surfaces, blue primary actions, green success,
  amber review states, 8px radii, low visual noise, and Phosphor icons for
  operational meaning.
- Reuse when: Building or migrating React dashboard, workbench, table,
  notification, provider setup, or app-shell surfaces.
- Avoid when: A task is only maintaining the current vanilla route and does not
  touch the React migration path.
- Evidence: UXA-010 applies `data-theme="companycore"` on `/react-dashboard`
  and verifies live dashboard rendering across desktop/mobile.

### 2026-05-08 - React Dashboard Primitives
- Type: reusable_pattern
- Context: Dashboard migration should not become another monolithic frontend
  file as more workbenches move from vanilla to React.
- Decision: Split React dashboard UI into shell, state panel, command panel,
  metric cards, attention queue, module launcher, and migration table
  primitives. Keep live owner data loading local to the route and show
  signed-out, loading, error, and connected states.
- Reuse when: Migrating the current dashboard or building adjacent React
  management surfaces.
- Avoid when: A dense workbench needs table-first architecture; use the next
  table/notification primitive slice instead.
- Evidence: UXA-010 replaces the proof route with structured primitives and
  live `/v1/connection` data.

### 2026-05-08 - React DaisyUI Migration Foundation
- Type: reusable_pattern
- Context: CompanyCore needs reusable dashboard, notification, table, and
  workbench primitives without rewriting the entire vanilla owner console in
  one risky step.
- Decision: Introduce React + Vite + Tailwind CSS + DaisyUI as a generated
  `web/` -> `public/react/` build path and prove it on a separate
  `/react-dashboard` route before migrating existing routes.
- Reuse when: A route or component family is ready to migrate from vanilla
  markup into reusable React primitives with DaisyUI-backed controls.
- Avoid when: A task only needs a small CSS/markup polish on an existing
  vanilla route and does not justify touching the framework boundary.
- Evidence: UXA-009 added the framework build path, Docker integration, and a
  rendered React route with DaisyUI alert, stats, steps, badges, and table
  primitives.

### 2026-05-08 - Phosphor Operational Iconography
- Type: reusable_pattern
- Context: Dashboard modules, readiness signals, attention rows, and
  operational steps need fast recognition so owners can orient themselves in
  the company map without reading every paragraph first.
- Decision: Use the local Phosphor bold webfont for operational icons. Place
  icons in restrained 8px-radius square containers, keep text as the accessible
  source of truth, and map icons to stable management concepts: structure,
  integrations, relationships, execution, data, files, pipeline, and warnings.
- Reuse when: A dashboard, context panel, module launcher, navigation row,
  status/readiness signal, or action queue benefits from immediate operational
  recognition.
- Avoid when: A row is already visually dense enough that another icon would
  compete with the primary data, or when a branded provider mark is the correct
  source of recognition.
- Evidence: UXA-008 adds local Phosphor assets and applies consistent
  dashboard iconography to readiness evidence, operational steps, attention
  rows, and module-launch destinations.

### 2026-05-08 - Management-First UX Rule
- Type: visual_direction
- Context: CompanyCore is used to manage a company, so the UI must help users
  understand what matters now, what is blocked, and where to act next.
- Decision: Private routes should prefer command surfaces, local feedback,
  structured rows, tables, and clear module destinations over decorative
  dashboard cards or marketing-style composition.
- Reuse when: Designing or polishing dashboard, workbench, settings,
  integration, table, relationship, or provider setup routes.
- Avoid when: Building public marketing pages where a different visual contract
  is explicitly approved.
- Evidence: UXA-008 updates the canonical visual direction and design-system
  contract with CompanyCore management UI principles.

### 2026-05-07 - Table Workbench Empty State
- Type: reusable_pattern
- Context: Route-level table workbenches can be empty because records have not
  been created, imports have not run, filters hide all matches, or the
  inspector has no selected row.
- Decision: Use compact `Workbench state` panels with a short title, recovery
  message, and one local action when useful. Keep actions close to the list or
  inspector state, such as `New draft` or `Clear filters`, instead of routing
  users through a global notification.
- Reuse when: A table, list, inspector, or workbench area is empty but the user
  can either create, clear filters, select, or navigate to the right surface.
- Avoid when: The screen has a real data-loading failure; use the action
  feedback/error pattern and provider-safe recovery copy instead.
- Evidence: V2WEB-049 upgrades `/data-table` record-list and inspector empty
  states with actionable workbench panels.

### 2026-05-07 - Global Action Feedback Panel
- Type: reusable_pattern
- Context: Shared action feedback appears after auth, integration, CRUD, Drive,
  and sync actions, so it needs to be scannable and accessible without
  becoming a blocking modal.
- Decision: Use a compact result panel with `aria-live`, a tone label, and a
  bordered message box. Success uses `Success`; error/recovery states use
  `Needs attention`, while existing sync metrics remain below the message.
- Reuse when: A shared non-modal feedback surface reports the outcome of user
  actions across modules.
- Avoid when: The feedback belongs next to one specific form field or button;
  keep that feedback local to the action instead.
- Evidence: V2WEB-048 upgrades `#resultPanel` with tone-aware success/error
  styling and accessible live feedback.

### 2026-05-08 - Local Action Feedback
- Type: reusable_pattern
- Context: Auth, provider setup, Drive import, typed editor, and API key
  lifecycle actions can leave users uncertain when outcomes appear only in a
  shared panel away from the triggering control.
- Decision: Place immediate pending, success, and error feedback in a local
  `aria-live` `form-note local-status` slot near the action. Keep empty local
  slots hidden, reuse existing success/error tone classes, translate backend
  and provider failures through user-language recovery copy, and keep the
  global result panel for cross-route outcomes or metric payloads.
- Reuse when: A form, setup control, import/sync action, editor, or key
  lifecycle action needs direct acknowledgement at the action site.
- Avoid when: The result is truly route-level, contains multi-metric sync
  evidence, or needs to remain visible after navigation; use the global result
  panel in those cases and optionally mirror a concise local status.
- Evidence: UXA-006 added local live-status slots for login, registration,
  ClickUp setup, and Google Drive setup/import, preserved typed editor and API
  key local feedback, and verified the pattern with Playwright and
  `owner-console:ux-smoke`.

### 2026-05-08 - Compact Private Mobile Topbar
- Type: responsive_rule
- Context: The authenticated mobile shell can push route content too far down
  when Menu, route title, module search, account/API shortcuts, and sign-out
  all appear in the first viewport.
- Decision: On phone-sized private routes, keep the topbar to one compact row:
  drawer Menu, current route identity, and Sign out. Use the existing drawer as
  the route-jump surface, and preserve the richer module search plus quick
  links on desktop/tablet.
- Reuse when: A private mobile route needs to expose the current module and
  account safety without delaying the page's primary content.
- Avoid when: The route has no drawer/navigation fallback or when module search
  is the only path to key destinations.
- Evidence: UXA-007 compressed the mobile private topbar to `70px`, kept drawer
  and sign-out access, preserved desktop module search, and passed targeted
  Playwright plus `owner-console:ux-smoke` validation.

### 2026-05-07 - Public Entry Operational Context
- Type: reusable_pattern
- Context: The public `/` route should set up the product's operational
  promise before sending owners to sign in or create a workspace.
- Decision: Keep the entry compact and app-like. Show core surface pills
  for ClickUp, Drive, agent-safe API, and operating areas, plus a small
  operational console card instead of a bare status chip.
- Reuse when: A public route introduces the private operational console and
  must quickly explain why the owner should continue into auth.
- Avoid when: The user is already authenticated; private routes should show
  live workspace state instead of static public-entry copy.
- Evidence: V2WEB-047 upgrades `/` with operational surface pills and a
  compact public entry card.

### 2026-05-07 - Auth Onboarding Context Panels
- Type: reusable_pattern
- Context: Public owner-auth screens need enough product context to explain
  why the owner is signing in or creating a workspace before they reach the
  private operational console.
- Decision: Place compact onboarding context panels beside login and
  registration forms on desktop. On stacked tablet/mobile layouts, place the
  auth form before the onboarding context so returning owners reach the action
  first. Use the existing context-panel language, concise operational copy, and
  pill signals for workspace owner, integrations, operating areas, provider
  imports, and agent-safe API access.
- Reuse when: A public or transitional route gates access to a private
  operational surface and should explain what the user unlocks next.
- Avoid when: The route is an in-app settings screen where live workspace
  state should be shown instead of static onboarding context. Also avoid
  putting static explanatory context above login or registration forms on
  phone-sized screens.
- Evidence: V2WEB-046 adds `/auth/login` and `/auth/register` context panels
  while preserving auth behavior. UXA-004 keeps desktop two-column auth and
  reorders mobile auth so login/register forms appear before onboarding
  context.

### 2026-05-07 - ClickUp Adapter Command Panel
- Type: reusable_pattern
- Context: Provider setup screens with token validation, workspace selection,
  scope selection, import policy, and sync actions need a compact command
  summary before the operator works through the form.
- Decision: Place a ClickUp adapter command panel before the setup form. Show
  ClickUp status, token readiness, workspace selection state, selected/saved/
  loaded List counts, ClickUp task count, import mode, and actions to setup,
  task review, and the integration map.
- Reuse when: A provider adapter route has multi-step credential, scope, and
  import controls that need a quick operational read.
- Avoid when: The route is a read-only provider inventory or a generic
  cross-provider overview.
- Evidence: V2WEB-045 adds `/settings` context with ClickUp setup readiness,
  List scope, task count, import mode, and navigation actions.

### 2026-05-07 - Account Workspace Command Profile
- Type: reusable_pattern
- Context: Account/workspace settings screens need to confirm owner session,
  workspace identity, integration readiness, API exposure, service-key state,
  and operating-area coverage before the operator scans account cards.
- Decision: Place a compact workspace command profile before account cards.
  Show owner session state, workspace name, ClickUp state, Drive state, API
  route count, active key count, scoped key count, operating-area count, and
  actions to integration map, agent API settings, and operating areas.
- Reuse when: A settings route represents workspace-level access, ownership,
  readiness, or handoff context across several operational modules.
- Avoid when: The route is a provider-specific setup flow or a single-record
  editor where a narrower context panel is more useful.
- Evidence: V2WEB-044 adds `/settings/account` context with owner/workspace,
  integration, key, API, and operating-area signals.

### 2026-05-07 - Integration Command Map Context Panel
- Type: reusable_pattern
- Context: Integration overview screens need to join provider readiness,
  operating-area ownership, imported files, pipeline records, and agent API
  routes before operators choose a provider-specific setup surface.
- Decision: Place a compact integration command map before provider cards.
  Show readiness, implemented group count, operating-area count, ClickUp task
  count, Drive folder count, pipeline record count, API route count, Drive
  status, and actions to ClickUp setup, Drive setup, and agent API settings.
- Reuse when: A route summarizes multiple integrations or mixed provider/API
  surfaces and the operator needs an operational inventory before drilling in.
- Avoid when: The route owns only one provider setup flow; use the provider
  context-panel pattern instead.
- Evidence: V2WEB-043 adds `/settings/integrations` context with integration
  readiness, provider/data counts, and direct setup/API actions.

### 2026-05-07 - Google Drive Import Context Panel
- Type: reusable_pattern
- Context: OAuth-backed import screens need to summarize credential readiness,
  consent state, selected import scope, imported inventory, and review needs
  before the operator follows detailed setup instructions.
- Decision: Place a compact Drive import context panel before the OAuth setup
  form. Show OAuth client state, consent state, selected folder count,
  discovered folder count, imported item count, folder-review count, and
  actions to setup plus relationship review.
- Reuse when: A provider setup route has a multi-step auth/import flow and the
  operator needs a quick readiness read before acting.
- Avoid when: The provider route has no persisted credential state or no import
  scope selection.
- Evidence: V2WEB-042 adds `/settings/drive` context with OAuth/import state,
  folder inventory, and navigation into setup plus relationship review.

### 2026-05-07 - Operating Area Context Panel
- Type: reusable_pattern
- Context: Operating-model screens need to show the full company map and the
  selected area's local signal before operators inspect nested tables,
  provider mappings, Drive files, and record previews.
- Decision: Place a compact context panel before the operating map. Show area
  count, table count, record count, provider mapping count, Drive item count,
  selected-area signal count, and actions to relationship review plus the
  integration map.
- Reuse when: A route is the ownership map for multiple data sources and one
  selected object controls the workbench below.
- Avoid when: The route already has a single-record detail header that contains
  both global inventory and selected-record remediation actions.
- Evidence: V2WEB-041 adds `/areas` context with operating-model inventory,
  selected-area signal count, and links into relationship review plus the
  integration map.

### 2026-05-07 - Agent API Context Panel
- Type: reusable_pattern
- Context: Security-sensitive integration screens need to show readiness,
  least-privilege state, and route surface before the operator creates or
  hands off credentials.
- Decision: Place a compact API context panel before credential/key management.
  Show active key count, inactive key count, scoped key count, capability
  count, route count, write-route count, and actions to create a key or review
  integration mapping.
- Reuse when: A route manages API keys, service clients, OAuth credentials,
  webhooks, or another auth-sensitive integration handoff.
- Avoid when: The screen only displays static documentation and has no owner
  action or credential lifecycle.
- Evidence: V2WEB-040 adds `/settings/api` context with service-key readiness,
  route/capability inventory, and direct actions into key creation plus the
  integration map.

### 2026-05-07 - Relationship Mapping Context Panel
- Type: reusable_pattern
- Context: Mapping review screens need to show whether external structures are
  assigned to operating areas before the operator scans individual rows.
- Decision: Place a compact relationship context panel before the review queue.
  Show mapping health, provider/Drive counts, review-item count, filtered
  visibility, and actions to the area map plus integration map.
- Reuse when: A route reconciles external provider structures, files, folders,
  or imported containers against internal ownership or operating-area context.
- Avoid when: The route is a detail editor for one relationship or when there
  is no remediation path outside the current list.
- Evidence: V2WEB-039 adds `/relationships` context with provider mapping,
  Drive folder, review item, visible relationship counts, and links into area
  and integration maps.

### 2026-05-07 - Workflow Context Panel
- Type: reusable_pattern
- Context: Cross-module workflow screens need to explain reusable process
  infrastructure separately from the business records currently using it.
- Decision: Place a compact workflow context panel before stats and filters.
  Use a workflow status badge, scope/count pills, and actions into the relevant
  Data workbenches so the operator can inspect the underlying tables.
- Reuse when: A route combines a shared workflow model with department-specific
  usage records, such as pipelines, approvals, or delivery stages.
- Avoid when: A screen owns only one business table and does not need a
  cross-department explanation.
- Evidence: V2WEB-038 adds `/pipeline` context that separates reusable stages
  from CRM clients/deals/interactions and links into stage/client Data
  workbenches.

### 2026-05-07 - Adapter Context Panel
- Type: reusable_pattern
- Context: Integration adapter screens need to explain connection state,
  selected provider scope, local/provider record split, and the best next
  action before showing raw tables.
- Decision: Place a compact adapter context panel before secondary stats and
  tables. Use a capability/status badge, source/scope/health pills, and two
  local actions: one for the operational editor, one for provider
  configuration.
- Reuse when: A screen is both an integration health surface and a record
  review surface, such as task, file, calendar, or provider event adapters.
- Avoid when: The route is purely a settings form or a typed business-record
  editor with no provider-scope context.
- Evidence: V2WEB-037 adds `/tasks-adapter` context with ClickUp/local task
  split, selected List count, workload health, sync state, and links to the
  task editor plus ClickUp settings.

### 2026-05-07 - Table Context Panel
- Type: reusable_pattern
- Context: Detail workbenches reached from a module index need to preserve the
  operator's orientation: what table is open, whether it is editable, which API
  methods exist, what sources are loaded, and what the next local action is.
- Decision: Place a compact context panel before the stats strip and record
  workbench. Pair capability badges with API/source/field pills and keep the
  primary table-level action local to the panel.
- Reuse when: A workbench route is one level deeper than an index and combines
  records, filters, inspectors, and optional typed editors.
- Avoid when: The route is a single-purpose form where the page title already
  answers the context and next action.
- Evidence: V2WEB-036 adds `/data/:table` context panels with typed-editor
  `New draft` and read-only `Review API` actions while preserving existing
  table filters and inspectors.

### 2026-05-07 - Workbench Capability Rows
- Type: reusable_pattern
- Context: Database and integration indexes need to answer "can I edit this",
  "what API/source coverage exists", and "what should I open next" before the
  operator drills into a table or provider screen.
- Decision: Extend workbench index rows with a capability badge, compact
  operation tags, and a right-side metrics/source panel. Editable business
  modules get a positive typed-editor badge; unsupported modules stay visibly
  read-only instead of implying unfinished write support.
- Reuse when: A module index mixes editable and inspect-only resources, or when
  agents/operators need route/source confidence before opening details.
- Avoid when: Every row has the same capability state, or when dense
  multi-column comparison is the primary job.
- Evidence: V2WEB-035 `/data` polish adds typed-editor/read-only badges,
  API/write/area tags, and responsive source metrics while preserving the
  existing workbench route behavior.

### 2026-05-07 - Workbench Index Rows
- Type: reusable_pattern
- Context: Data-heavy owner-console pages need clear operational lists for
  modules, API-backed records, provider sources, and future table workbenches.
- Decision: Reuse `workbench-panel`, `workbench-filter-bar`,
  `workbench-index-list`, `workbench-index-row`, `workbench-index-metrics`,
  `workbench-index-meta`, and `workbench-index-action` for dense index screens.
  Keep filter surfaces visually quieter than content, use low-shadow repeated
  rows, and reserve stronger borders or inset markers for selected/detail
  states.
- Reuse when: A page needs searchable/filterable rows that combine a primary
  entity description, operational metrics, source/status metadata, and one
  route action.
- Avoid when: The user is editing one record in detail or comparing tabular
  cells where a real table is more scannable. Avoid giving filters, list rows,
  empty states, and inspectors the same visual weight.
- Evidence: V2WEB-024 `/data` desktop and mobile Playwright smoke passed with
  13 module rows, filter interaction, and no browser console errors. UXA-005
  refined the role treatment across filters, index rows, record lists, record
  inspectors, relationship rows, and compact area rows.

### 2026-05-07 - Agent Key Control Panel
- Type: reusable_pattern
- Context: Auth-sensitive owner-console actions need guided forms, copy-once
  secret handling, local status, and clear inactive states without exposing raw
  provider/backend errors.
- Decision: Use a two-column control panel with a scoped preset form on the
  left, one-time secret output on the right, and a row list below for current
  credentials and lifecycle actions.
- Reuse when: A settings screen creates sensitive credentials, webhooks, OAuth
  client material, or agent runtime tokens.
- Avoid when: The action is a simple non-secret toggle or a read-only status
  summary.
- Evidence: AGRUN-005 `/settings/api` browser smoke created a scoped key,
  displayed the raw key once, deactivated the key, and passed desktop/mobile
  visual checks without console errors.

### 2026-05-07 - Split Record Workbench
- Type: reusable_pattern
- Context: Operators need to inspect records from many CompanyCore tables
  before typed create/edit forms exist for every module.
- Decision: Use a split layout with a searchable record list on the left and a
  selected-record inspector on the right. Show concise record title/meta,
  readable field rows, and a collapsible raw JSON block for verification.
- Reuse when: A database, provider, or integration module needs fast read-only
  triage before a payload-specific editor is implemented.
- Avoid when: The task requires multi-row comparison, bulk actions, or typed
  editing controls; use a table or typed form pattern instead.
- Evidence: V2WEB-025 `/data/notes` browser smoke created a note through the
  API, filtered the table, and inspected the record on desktop/mobile.

### 2026-05-07 - Typed Record Editor Panel
- Type: reusable_pattern
- Context: Data module workbenches need editing only when the payload and
  lifecycle semantics are known for that specific route.
- Decision: Add a `record-editor` panel inside the selected-record inspector
  for typed modules. Keep create/save/archive actions local to the panel,
  validate required fields before calling the API, refresh the table after each
  mutation, and keep unrelated tables read-only until their typed editor is
  implemented.
- Reuse when: A CompanyCore business route has existing create/update/archive
  APIs and a small payload that can be represented honestly in the UI.
- Avoid when: The route has provider-side side effects, unresolved relationship
  mapping, bulk editing, or ambiguous archive/delete semantics.
- Evidence: V2WEB-026 `/data/notes` local Playwright smoke created, updated,
  archived, and reloaded real Notes API records on desktop and mobile without
  console errors. V2WEB-027 reused the same pattern for `/data/projects` with
  typed name/status/description controls and responsive `record-editor-grid`
  validation. V2WEB-028 reused it for `/data/clients` with a CRM-specific grid
  and full-width email field so longer contact values remain readable.
  V2WEB-029 reused it for `/data/task-lists` with typed project linkage and
  draft preservation so background workspace refreshes do not wipe in-progress
  create input. V2WEB-030 reused it for `/data/tasks` with denser task fields
  while keeping provider-specific ClickUp custom-field and sync actions out of
  the local business-record editor.

### 2026-05-07 - Provider Folder Picker
- Type: reusable_pattern
- Context: Provider import setup should not force operators to paste opaque
  external IDs when the provider can list selectable containers after consent.
- Decision: Use a setup guide for provider-specific auth prerequisites, keep
  manual IDs as an advanced fallback, and make the normal import path a
  checkbox list with selected-count feedback plus an explicit save-selection
  action before import.
- Reuse when: A provider integration imports folders, lists, projects, or other
  external containers and the owner can discover them safely through an OAuth
  or API token.
- Avoid when: The provider cannot list containers with the granted scopes, or
  selection has destructive side effects before a separate confirmation/import
  action.
- Evidence: V2GD-012 added Google Drive folder discovery and selection in
  `/settings/drive`, passed authenticated desktop/mobile Playwright smoke, and
  retained manual folder IDs as a fallback for restricted Google accounts.

### 2026-05-07 - Shared Capability Labels
- Type: domain_language_pattern
- Context: Some modules are shared infrastructure that can be used by several
  departments, even when the first visible records come from one department.
- Decision: Label shared capabilities by their reusable operating purpose first
  and describe department-specific records as current usage or consumers. Do
  not group shared workflow primitives under CRM just because CRM deals use
  them.
- Reuse when: A page combines shared configuration with records from a current
  department, such as pipelines used by CRM now and other departments later.
- Avoid when: A module is truly owned by one department and should be optimized
  for that team's language.
- Evidence: V2WEB-031 moved pipeline copy and navigation grouping from
  CRM-owned language to shared workflow language while keeping CRM usage
  records visible.

### 2026-05-07 - Command Center Pairing
- Type: reusable_pattern
- Context: Operational dashboards need to answer priority, blockers, and next
  action before the operator scrolls.
- Decision: Pair the current-priority cockpit with the attention queue in one
  responsive command layout. Put readiness evidence inside the cockpit as a
  compact strip, cap visible attention items to the highest-priority few, and
  move module directories below the first decision surface.
- Reuse when: A dashboard is the owner's starting point and has both ranked
  action items and readiness/status lanes.
- Avoid when: The screen is a single-purpose editor, table workbench, or setup
  flow where a split command center would distract from the main form. Also
  avoid placing secondary header shortcuts above the dominant primary action on
  mobile.
- Evidence: V2WEB-032 moved dashboard attention items beside the operational
  cockpit on desktop, stacked them cleanly on mobile, and preserved existing
  dynamic state wiring. UXA-003 refined the pattern by moving health evidence
  into the cockpit, limiting attention rows to three, reducing the lower
  next-action panel to three links, and validating dashboard screenshots at
  desktop, tablet, and mobile.

### 2026-05-07 - Semantic Sidebar Sections
- Type: reusable_pattern
- Context: The owner console has enough modules that a flat sidebar becomes
  slower to scan than the underlying operating model.
- Decision: Group shell navigation by job family, not implementation order:
  command, operate, integrations, and workspace. Keep route URLs and active
  state contracts stable while improving labels and visual grouping.
- Reuse when: A navigation rail mixes daily work surfaces, provider setup,
  system settings, and account controls.
- Avoid when: A flow has fewer than five destinations or a wizard needs a
  strict linear stepper instead of persistent navigation.
- Evidence: V2WEB-033 grouped the CompanyCore sidebar while preserving every
  existing `href`, `data-link`, and `data-nav` route contract.

### 2026-05-07 - Shared Navigation Lanes
- Type: reusable_pattern
- Context: Persistent sidebar navigation and command-bar search should teach
  the same mental model instead of presenting two different taxonomies.
- Decision: Use the same job-family lanes in sidebar links and module switcher
  results. Mark the active destination in both surfaces so the operator always
  knows where they are before jumping elsewhere.
- Reuse when: A command bar, global search, or module switcher points at the
  same destinations as the app shell.
- Avoid when: Search results are heterogeneous objects rather than navigation
  destinations; those should group by object type or relevance instead.
- Evidence: V2WEB-034 aligned module switcher groups with the V2WEB-033
  sidebar lanes and added active-result styling without changing route paths.

### 2026-05-14 - Integration Readiness Cards
- Type: reusable_pattern
- Context: Provider setup, relationship evidence, and MCP access are too risky
  to leave as separate configuration pages when agents may consume the same
  workspace context.
- Decision: Use compact readiness cards with `ready`, `attention`, and
  `blocked` states. Each card must be derived from real workspace/API state,
  include the next action, and sit above deeper provider workbenches.
- Reuse when: A setup or settings screen must explain whether a provider,
  graph, sync process, or agent access surface is safe to use.
- Avoid when: The status cannot be backed by real state or evidence; in that
  case show an honest empty/loading/error state instead of a green readiness
  claim.
- Evidence: WEBFOUND-009 added readiness cards to `/settings/integrations` for
  ClickUp, Google Drive, relationship graph, and MCP agents, then verified the
  screen at desktop, tablet, and mobile with no overflow, console issues, or
  failed requests.

### 2026-05-14 - Scoped Key Impact Preview
- Type: reusable_pattern
- Context: Service API keys and MCP profiles are security-sensitive because the
  user may copy a key into another app or agent immediately after creation.
- Decision: Before key creation, show the active workspace, selected profile
  risk, scope count, MCP tool count, write/destructive exposure, supervised
  tools, relationship graph availability, missing MCP base scopes, and tool
  families. The preview must update when the preset or scope list changes and
  must never expose a raw key before creation.
- Reuse when: A user is about to create, rotate, or hand off credentials,
  webhooks, tokens, API keys, or agent profiles.
- Avoid when: The data cannot be derived from the same source of truth that the
  backend uses for authorization or manifest generation.
- Evidence: WEBFOUND-010 added the key impact preview to `/settings/api` and
  verified preset/scope update behavior across desktop, tablet, and mobile
  with no overflow, console issues, or failed requests.

### 2026-05-14 - V2 Visual Readiness Gate
- Type: delivery_gate_pattern
- Context: Company City and gamification are attractive V2 directions, but
  they can become decorative if they start before workspace, relationship,
  integration, MCP, and agent-readiness foundations are proven.
- Decision: Treat V2 visuals as a gated planning step. Open visual planning
  only after foundation evidence exists, and separate "GO for planning" from
  "GO for implementation".
- Reuse when: A major visual metaphor, game-like shell, or new dashboard
  paradigm depends on operational data, permissions, integrations, or AI
  safety foundations.
- Avoid when: The change is a small route polish task that does not alter
  product IA or user decision flow.
- Evidence: WEBFOUND-013 reviewed WEBFOUND-002 through WEBFOUND-012 and
  approved WEBFOUND-014 planning while keeping direct Company City/gamification
  implementation gated on a canonical shell/map/brief/status plan.

### 2026-05-14 - Company Map Command Shell
- Type: canonical_layout_pattern
- Context: CompanyCore V2 needs a memorable Company City direction without
  weakening the operational workflows that owners and AI agents depend on.
- Decision: Use a shared authenticated shell with a company rail, command bar,
  route content, command brief, and status strip. Dashboard may become a city
  canvas, while dense workbenches remain quiet, scannable, and action-first.
- Reuse when: Building V2 dashboard, shell, relationship, integration, MCP, or
  Company OS surfaces that need active workspace, active area, blockers,
  readiness, and next action visible together.
- Avoid when: Building a narrow form/editor where the shell already provides
  enough orientation and adding a map would slow the task.
- Evidence: WEBFOUND-014 added
  `docs/ux/v2-visual-implementation-plan-2026-05-14.md` with desktop,
  tablet, mobile zones, state model, migration order, and proof gates.

### 2026-05-14 - Dashboard Company Map Frame
- Type: implemented_layout_pattern
- Context: The first post-login screen must answer what exists in the
  workspace, what is blocked, what agents can see, and what the next owner
  action is without waiting for V2 Company City visuals or gamification.
- Decision: Place a Company map frame above the operational cockpit. The frame
  combines a status strip, area readiness grid, and command brief, all derived
  from real workspace, operating-area, relationship, integration, task, and
  MCP state. Area cards may deep-link with query parameters, so shared
  `data-link` navigation must preserve `url.search`.
- Reuse when: A route needs an executive map/brief before deeper tables or
  workbenches, especially dashboard, integration, relationship, or future
  workspace overview surfaces.
- Avoid when: A route is already a focused editor or dense workbench and the
  extra map would hide the primary form/table task.
- Evidence: V2VIS-001 verified `/dashboard` on desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844` with 13 area cards, 4 status pills, no
  overflow, no clipped cards, no console issues, no failed requests, map click
  to `/areas?area=main-general`, and `/relationships` regression proof.
