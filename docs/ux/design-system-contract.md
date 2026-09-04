# Design System Contract

This document defines how agents should treat the visual layer of the
application.

## Purpose

When a project has an established UI layer, it becomes the source of truth for:

- component styles
- visual tokens
- art direction
- spacing and layout patterns
- interaction states
- motion rules
- responsive behavior by surface

The goal is consistency, not one-off reinvention.

The visual target is not merely "acceptable" UI. The system should help teams
ship interfaces that feel clear, confident, and pleasant to use across mobile,
tablet, and desktop.

## Experience Quality Bar

Every meaningful UI change should preserve or improve:

- clear visual hierarchy
- readable spacing rhythm
- accessible contrast and type sizing
- explicit interaction states
- adaptive behavior across screen sizes
- purposeful motion, not decorative noise
- a recognizable visual point of view instead of generic default styling

## Brand Theme Foundation

Roost is the target brand and visual system for the LuckySparrow operating
center. Roost is the digital nest where humans, AI agents, processes,
knowledge, tasks, pipelines, and company resources coordinate. It is not a
classic ERP and not another task manager; it is the operating center for an
autonomous organization, designed for both the web UI and API/MCP clients.

Roost should communicate control without chaos, modernity without cyberpunk
excess, minimalism, modularity, system intelligence, and the feeling of an
ordered command center. The UI should feel like an operations center,
system-management layer, modern cockpit, and autonomous-company interface.
Avoid gaming chaos, neon cyberpunk, and exaggerated hacker styling.

The canonical target theme is the DaisyUI `roost` theme in
`web/src/styles.css`, backed by Tailwind v4 `@theme` tokens. The legacy
DaisyUI `companycore` theme remains the current compatibility default until a
scoped visual migration verifies existing routes against the Roost dark UI.
Future new or redesigned UI should use Roost tokens first and should not add
page-local color systems.

Roost core palette:

- Primary: `#6366F1` for active elements, CTA, links, focus, and active modules.
- Secondary: `#3B82F6` for information, hover, supporting accents, and charts.
- Accent: `#06B6D4` for AI, MCP, synchronization, animation, and data flow.
- Success: `#10B981` for online, healthy processes, and working pipelines.
- Base surfaces: `base-100 #0D1117`, `base-200 #161B22`,
  `base-300 #21262D`, and neutral `#1F2937`.
- Text: primary `#E5E7EB`, secondary `#9CA3AF`, muted `#6B7280`.
- Brand gradient:
  `linear-gradient(135deg, #6366F1 0%, #3B82F6 50%, #06B6D4 100%)`.

The full public-facing brand source of truth is
`docs/ux/roost-brand-book.md`. Use it for Roost public pages, logo direction,
homepage rhythm, footer attribution, and future brand-sensitive surfaces.

Roost typography:

- Default family: `Inter`.
- Headings: weight `600-700`; use restrained scale inside dashboards and
  tool surfaces.
- Body text: neutral, readable, about `150%` line height.
- UI labels: uppercase only for micro labels, with `0.08em-0.12em` tracking.

Roost surfaces and components:

- Cards: dark glass, light blur, subtle border, `rounded-2xl`, and very soft
  glow only where it clarifies hierarchy.
- Borders: default to `rgba(255,255,255,0.06)` or the tokenized equivalent.
- Shadows: soft and restrained; avoid heavy black shadows.
- Icons: outline-only, thin stroke, minimalist, geometric, and consistent.
  Phosphor remains the approved installed icon family; Lucide/Heroicons-style
  references are direction only unless a future task approves another icon set.
- Motion: calm, system-like fades, glow, subtle movement, smooth transitions,
  and depth motion. Avoid flashy and gaming bounce effects.

The existing CompanyCore foundation is a modern, minimal, outline-first
management console. It should feel precise and premium because information is
easy to scan, controls are predictable, and spacing is calm. Do not add fake
metric counters, decorative badges, or heavy visual effects to make a surface
feel "premium".

The canonical runtime theme is the DaisyUI `companycore` theme in
`web/src/styles.css`, backed by Tailwind v4 `@theme` tokens. New UI should use
DaisyUI component classes plus these CompanyCore tokens before adding page-local
CSS.

Core palette:

- Base surfaces: `base-100` white panels, `base-200` quiet page background,
  `base-300` outline borders.
- Primary action: `primary` / `company-blue` for navigation, focus, active
  state, and the highest-confidence action on a surface.
- Secondary structure: `secondary` / `company-muted` for supporting controls
  and lower-emphasis text.
- Accent: `accent` / `company-green` for ready, connected, or completed
  operational states.
- Semantic colors: `info`, `success`, `warning`, and `error` are reserved for
  real state feedback, validation, and risk communication.

Typography:

- Body: `Inter` through the `font-sans` token.
- Headings: `Inter` through the `font-heading` token. Roost supersedes the
  earlier Sora heading experiment for new work.
- Use heading typography for page titles, section titles, and major module
  labels only. Dense panels, cards, tables, and forms should keep type compact
  and readable.

Shape, spacing, and focus:

- Default radius: `radius-company` / DaisyUI `radius-box`, with small variants
  for menu items, tabs, and icon frames.
- Default spacing rhythm: use `spacing-company-page`,
  `spacing-company-section`, `spacing-company-panel`, and
  `spacing-company-rail` before custom gaps.
- Default emphasis is outline plus subtle surface contrast. Use
  `shadow-company-soft` only when elevation clarifies an overlay, modal, or
  selected panel.
- Focus states must use the shared `--cc-focus` ring and remain visible on
  buttons, links, inputs, selects, textareas, and custom focusable controls.

Reusable CSS utilities:

- `cc-panel`: primary reusable outlined panel with subtle shadow.
- `cc-panel-flat`: outlined panel without elevation.
- `cc-surface-subtle`: quiet nested surface for grouped metadata or filters.
- `cc-label`: compact uppercase label text.
- `cc-icon-frame`: standard icon container for module and action icons.

Icon policy: Phosphor Icons remains the primary icon family. Do not add a
second icon set until a concrete missing-icon gap is documented; mixing icon
families should stay exceptional and intentional.

## Reuse-First Rule

- Prefer an existing shared component or approved variant before creating a new
  one.
- Prefer extending an approved shared pattern over adding page-local styling.
- Reuse the best matching button, input, card, modal, table, badge, and form
  patterns that already exist.
- Create a new shared component or variant only when no approved pattern fits
  the need.
- Reuse approved page rhythms, density rules, and navigation patterns before
  inventing new ones.
- Reuse previously approved visual motifs recorded in `docs/ux/design-memory.md`
  when they still fit the product.

## CompanyCore Management UI Principles

CompanyCore is an owner console for understanding and steering a company. The
approved 2026-05-14 long-term visual metaphor is a cinematic-realistic Company
City Map:
the company is a strategic city/value ecosystem, `GENERAL` is the central
intake and orchestration district, and the 12 company departments are connected
operational districts in the value journey. The UI must help the user answer
three questions quickly:

- What matters now?
- What is blocked or needs review?
- Where do I go next to act?

Every dashboard, workbench, settings, and integration surface should make those
answers visible before secondary exploration. Dense management screens should
feel calm and operational, not promotional.

The city metaphor should be used most strongly on the logged-in dashboard,
operating-area overview, and high-level relationship/integration maps. Detail
workbenches may become quieter and more table/list driven, but they should
retain district identity, value-flow context, and command-brief language.

Light gamification is allowed when it reflects real company state: district
readiness, value-flow progress, verified milestones, automation unlocks,
mission completion, and health signals. Do not add fake scores, arbitrary
badges, or decorative rewards that are not backed by real tasks, evidence,
integrations, or operating progress.

Responsive rule: desktop web may show the full city canvas with side command
briefs; tablet should balance map plus selected context; mobile web and native
mobile should compress the city into an overview, district switcher, or
progressive drill-down rather than forcing a tiny unreadable map.

### V1 Area-First Direction

As of 2026-05-15, the accepted V1 dashboard and shell direction is the
area-first Company Atlas. It supersedes module-first navigation for V1 web
implementation while preserving the Company City idea as a later V2 visual
layer.

V1 navigation should express the company first:

```text
LuckySparrow
  Dzialy
    00 Ogolny
    01 Strategia
    02 Produkt
    03 Sprzedaz
    04 Operacje
    05 Relacje
    06 Kadry
    07 Finanse
    08 Zasoby
    09 Technologia
    10 Prawo
    11 Innowacje
    12 Zarzadzanie
```

Capabilities such as goals, workflows, tasks, knowledge, resources, decisions,
and AI should be area-scoped views, not primary global sidebar modules. The
canonical V1 desktop and mobile references are:

- `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
- `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`

The product should guide the user through:

```text
Overview -> Area -> Capability -> Record -> Evidence -> AI action
```

This is the V1 progressive-disclosure model. It keeps the surface calm for a
CEO while still exposing backend capability when the user drills into an area.

### 2026-08-28 Authenticated Console Refinement

The accepted private-web direction is the **Liquid Command Deck**. It refines
the V1 area-first model without changing route, backend, or data ownership:

- authenticated pages use one deep graphite Roost shell with a restrained
  liquid-glass material for persistent chrome, transient overlays, and the
  contextual decision surface;
- data-heavy work surfaces remain calm, dark, and highly legible instead of
  turning every record into a glowing glass card;
- the ambient aurora asset may add depth behind the shell and Company Pulse,
  but it must never reduce text contrast or compete with operational content;
- the sidebar is the single home for workspace switching, account settings,
  workspace settings, and sign-out; these actions must not be duplicated in
  the top command bar;
- workspace menus, mobile navigation, command search, and contextual inspectors
  open as layers over the current workbench. Opening them must never resize,
  shift, or create empty space in the dashboard;
- every workspace switcher exposes an explicit `Workspace` label, workspace
  name, safety state, and clear expanded state;
- transparency is progressive enhancement: reduced-transparency preferences
  and browsers without backdrop filtering receive an opaque, equally legible
  fallback;
- the top command bar contains only current location, command search,
  workspace safety, and language selection;
- authenticated pages use one coherent shell with a narrow company-area
  sidebar and a compact context command bar;
- the sidebar shows the 13 areas as the stable primary structure and exposes
  subviews only for the selected area;
- selected-area navigation shows capabilities owned by that area directly;
  cross-company contextual capabilities stay discoverable behind one labelled
  disclosure with a count, and that disclosure opens automatically when one
  of its views is selected. Command search indexes both groups;
- the department-health strip is an attention aid, not a metric inventory:
  show the score plus non-zero blockers, incidents, decisions, risks, or open
  work, and collapse a healthy state to one calm confirmation instead of a
  grid of zero-value cards;
- every authenticated view exposes a stable, compact page introduction before
  its main work surface: area eyebrow, one page title, one-sentence purpose,
  and an optional primary action. It remains visible during loading, error,
  empty, and ready states; selected lists, folders, and records use lower-level
  headings instead of becoming a second page title;
- empty states for writable records must expose a direct create or management
  action. Shared record editors move focus into the first field, trap focus,
  close on Escape, and restore focus to the invoking control;
- `00 General` is an owner decision surface ordered by attention, next action,
  operating health, routing, guardrails, and agent handoff;
- repeated records use rows, tables, boards, timelines, and split views before
  cards; cards remain reserved for genuinely independent objects;
- badges are reserved for concise operational status or risk and must not be
  used as general metadata decoration;
- the Company Atlas and future Company City remain orientation and exploration
  views, not mandatory chrome around daily workbenches.

The authenticated console should answer within three seconds: where am I,
what matters now, what is blocked, and what can I do next.

## Authenticated Shell Contract

All private web routes should converge on one CompanyCore shell rather than
separate vanilla and React navigation models. Before V2 Company City visuals,
the shell should be a clear area-first operating console: workspace selection,
the 00-12 operating areas, selected-area capability tabs, area-scoped command
pressure, and AI/MCP readiness. The shell must make workspace, selected area,
selected capability, command pressure, and health visible without making every
route build its own product chrome.

Canonical V1 shell zones:

- `AreaSidebar`: `Company Atlas`, `00 Ogolny`, and the 12 LuckySparrow
  departments, with exactly one expanded area on desktop.
- `AreaSubnav`: selected-area views such as Overview, Goals, Workflows, Tasks,
  Knowledge, Resources, Decisions, AI, and `+ Add view`.
- `TopCommandBar`: quiet breadcrumb, one command search, and a compact status
  cluster.
- `CompanyAtlasBoard`: code-native 00+12 area map with status dots, selected
  area, and APQC/process lens.
- `AreaOverviewPanel`: selected-area health, signals, primary action, AI
  readiness, and MECE note.
- `DecisionRail`: Today priorities, owner decisions, agent handoff, and proof.
- `ProgressivePath`: Overview -> Area -> Capability -> Record -> Evidence ->
  AI action.

Responsive behavior:

- Desktop: persistent sidebar, top command bar, optional right command brief,
  and status strip.
- Tablet: compact rail or drawer rail with split map/workbench and contextual
  command panel when space allows.
- Mobile: compact topbar, drawer for full IA, optional bottom shortcuts for
  core destinations, command brief before broad stats, and map as overview or
  district switcher instead of a tiny full canvas.
- The mobile navigation drawer preserves the desktop workspace, area, current
  view, account, and sign-out hierarchy while using touch-sized rows. It opens
  above the workbench without reflow, locks background scrolling, moves focus
  into the drawer, traps keyboard focus, closes on Escape/navigation/backdrop,
  and returns focus to its compact current-context trigger.
- Browser chrome, safe-area gaps, overscroll, and scrollbar tracks must inherit
  the graphite shell color; no light document canvas may appear around private
  routes on mobile.
- Browser-level identity is part of the interface: the React document owns a
  dedicated small-size Roost favicon, Apple touch icon, pinned-tab mask,
  install manifest, graphite browser theme, and public sharing card. Page
  titles and descriptions follow client-side navigation and the selected
  locale; authenticated and authentication routes remain `noindex`.

The sidebar should not remain a generic route directory. For V1 it should
express the operating model as a company area list. Workflows, Knowledge,
Agents, and other capabilities should appear inside the selected area, not as
competing global destinations. Badges and readiness signals must come from real
product state. Do not introduce a second route-local shell for React surfaces.

Authenticated navigation is client-side and shell-persistent. Internal route
changes update browser history and replace only the selected view below the
command bar; they must not recreate the sidebar, command bar, workspace/profile
state, or ambient shell. Back and Forward remain first-class navigation.
External destinations, OAuth handoffs, sign-out, and workspace-token changes
may perform full document navigation because they cross or replace the active
security context. A stale lazy-route asset after a deployment or local rebuild
may trigger one automatic full reload to obtain the current asset manifest. If
that recovery fails, keep the shell and sidebar visible and show a route-level
retry state instead of leaving a blank page.

## Iconography

- Approved icon family: Phosphor Icons, using the local bold webfont in
  `public/vendor/phosphor/bold/`.
- Use icons to clarify operational concepts: company structure, integrations,
  data, relationships, execution, pipeline, files, warnings, and settings.
- Icons should sit in an 8px-radius square container when they label a module,
  readiness signal, attention item, or dashboard step.
- Icons are decorative when adjacent text already names the concept; keep
  visible text as the accessible source of truth.
- Do not mix icon families on the same surface unless an existing branded
  provider mark requires it.
- Avoid icon-only navigation for business-critical actions unless the control
  has an accessible name, tooltip where appropriate, and a well-established
  symbol.

## Component Strategy

- The accepted UXA-009 migration foundation is React + Vite + Tailwind CSS +
  DaisyUI, built from `web/` into generated `public/react/` assets.
- Tailwind CSS and DaisyUI theme tokens are the required styling foundation for
  shared web primitives. Repeated controls must be wrapped in project-specific
  reusable React components before they spread across department views.
- The current production owner console remains vanilla until each route is
  migrated intentionally. Do not rewrite multiple routes in one task unless a
  migration plan explicitly scopes that wave.
- Wrap DaisyUI usage in project-specific React primitives where a pattern will
  repeat: app shell, buttons, alerts/toasts, tables, filters, module links,
  command panels, empty states, and form fields.
- Use inline notices for loading, empty, validation, and recoverable error
  states that need page or form context. Use the shared toast layer for brief
  action confirmation such as a successful save; it must not alter document
  flow, must be dismissible, announce itself to assistive technology, pause
  dismissal while hovered or focused, and respect mobile safe areas.
- Reusable primitives must support variants instead of cloned components. For
  example, one button primitive may support icon-left, icon-right, icon-only,
  loading, disabled, danger, primary, secondary, and ghost variants; one table
  primitive should own pagination, loading, empty, error, density, and mobile
  collapse behavior for every table that adopts it.
- Use DaisyUI component classes for known primitives, then tune with
  CompanyCore tokens instead of creating unrelated page-local class recipes.
- Preserve the existing vanilla patterns until their React replacement has
  parity evidence and route-level smoke coverage.

## Forbidden Behaviors

- creating a custom button style for a single screen when a reusable button
  already exists
- adding component-specific spacing, color, or motion rules that bypass the
  system without approval
- shipping dedicated per-instance visual props that fragment the design system
- silently restyling existing shared components for a local task
- shipping visually flat screens with no deliberate hierarchy, spacing rhythm,
  or state differentiation
- treating desktop as a stretched mobile screen or tablet as an afterthought
- copying fashionable effects that hurt readability, navigation, or perceived
  performance
- approximating canonical decorative imagery with generic gradients or blur
  blobs when real assets are required for fidelity

## When A New Pattern Is Allowed

Create a new shared pattern only when:

- there is no acceptable existing component or variant
- the new pattern solves a repeatable need, not a one-off exception
- it is documented so future work can reuse it
- its responsive and accessibility behavior is documented, not implied

If a project lacks a formal design system file, record the approved shared
patterns in project UX docs before large UI expansion.

## Agent Behavior

- treat the current visual system as a contract
- prefer reuse over invention
- if the visual system is clearly insufficient, propose the improvement in
  conversation before changing the system direction
- when creating a new shared pattern, update the relevant UX or component docs
- when a project has no strong visual direction yet, define one before
  expanding the surface area
- keep navigation, density, and interaction patterns appropriate to the active
  surface size and input mode
- treat canonical screenshots, approved mockups, and approved visual frames as
  implementation specifications when the task requires parity

## Validation Expectations

For UI tasks, record:

- which existing pattern was reused
- whether a new shared pattern was introduced
- which approved visual direction or motif was reused
- responsive checks
- accessibility checks
- state coverage: `loading`, `empty`, `error`, `success`
- surface behavior: `mobile`, `tablet`, `desktop`
- whether the result should be added to `docs/ux/design-memory.md`
- whether decorative and background elements were implemented with the correct
  asset strategy

## Authenticated Liquid Workbench Surfaces

Authenticated department, asset, people, operations, management, and settings
routes reuse the dashboard's Liquid Command Deck direction as one continuous
operating environment. The shell owns the ambient background. Page content must
not repeat that image or cover it with large opaque gray containers.

- Use one dominant translucent work surface with internal dividers or quieter
  nested panels. Do not represent every fact as an independent floating card.
- Use `roost-work-surface`, `roost-work-panel`, and `roost-work-panel-muted` for
  the three shared material levels. Dense data should use the shared table shell.
- Present small collections of KPIs as a continuous summary strip. Large metric
  tiles are reserved for a genuinely primary decision or outcome.
- Do not render object totals or zero-value counters as overview decoration.
  Counts belong beside the workflow they change: active filters, selection,
  scheduling, risk, blockers, or required owner decisions. If the underlying
  collection is empty, show the recovery state without an inert filter bar,
  empty table chrome, or `0 of 0` pagination.
- Reserve green, amber, red, and blue accents for semantic state, selection, or
  a primary action. Neutral labels and metadata use restrained border and text
  contrast.
- Shared tables use a continuous workbench surface: the column header is
  separated by a rule and typography, not a contrasting opaque band. Status
  markers remain compact, outlined, and semantic. Row actions form one quiet
  icon-tool group; warning and destructive color becomes prominent on hover or
  focus instead of rendering persistent solid amber and red buttons in every
  row.
- Table chrome is earned by a real workflow. Selection appears only with a
  bulk action, column visibility appears only when optional columns exist, and
  internal pagination stays hidden until the result set exceeds the active
  page size. Small datasets must not carry inert checkboxes, column menus, or
  `1-3 of 3` navigation.
- Sortable table headers use a three-step cycle: ascending, descending, then
  unsorted in source order. The active state is exposed with `aria-sort`.
- Search, quick filters, field filters, column controls, and reset actions form
  one shared table command row. A search-only table stretches the search field
  to the available width instead of nesting a narrow input inside an otherwise
  empty toolbar card.
- Overview grids collapse to one full-width surface when only one data region
  is present. Never preserve an empty second column merely because the route
  can display two datasets when both exist.
- Demonstration records may explain a backend-connected module before the
  workspace has data only when they are explicitly marked as examples and are
  never mixed with, persisted as, or visually presented as live records.
- Standard department workbenches use `CcPageHeader` for the eyebrow, title,
  operating description, and page-level actions. Specialized briefing and map
  surfaces may keep a bespoke orientation header when that hierarchy performs
  a distinct job.
- Backend identifiers are never the primary user-facing label. Convert
  snake-case, kebab-case, status keys, and command identifiers to concise
  business language while preserving the raw key only where technical context
  explicitly needs it.
- Desktop layouts may expose multiple operational regions. Tablet and mobile
  must restructure them into readable columns or rows without horizontal page
  overflow; tables may switch to the established mobile record treatment.
- Interactive glass controls must retain a visible focus ring, sufficient text
  contrast, reduced-transparency fallback, and reduced-motion behavior.
- A department sidebar exposes that department's own management-system views.
  Shared company tools such as tasks, files, projects, goals, decisions,
  procedures, and the workforce directory are previewed on the department
  overview and link to their canonical module with a `department` context
  filter. Opening the canonical module without that filter shows all records
  authorized by the workspace role. The filter is an operating lens, not a
  department-level authorization boundary.
- Never place shared modules in an expandable `Related company tools` sidebar
  group. Every operating department has one Overview route; its compact
  previews show only records explicitly related to that department and link to
  the canonical source module. The canonical source route opens unfiltered and
  provides a department selector over the same record IDs.
- Department overview previews form one continuous work surface, ordered as
  `Current work -> Direction and delivery -> Capacity and governance`. Tasks,
  procedures, and files receive the highest density; supporting modules remain
  compact and secondary. Every preview preserves its own loading skeleton,
  linked-record count, empty recovery, error recovery, keyboard focus, and
  direct link to the canonical module. Do not render the shared layer as an
  undifferentiated grid of equal cards.
- Technology separates `Overview`, `Integrations`, and `Automations`.
  Integrations compare external adapters, connection/health, capabilities, and
  sync state. Automations compare execution definitions, triggers, enabled/run
  state, and failures. Do not merge these records merely because both can
  participate in technical workflows.
- Workspace agent connections use one continuous settings list for API, MCP,
  Agent Host, and execution-gate state. Copyable technical setup belongs in a
  progressive-disclosure editor; raw keys remain a separate one-time secret
  flow. Agent activity uses a chronological live feed plus execution history,
  not a dashboard of decorative cards.

## Unified Record Editing Contract

Authenticated record editors must feel like one system even when they edit
different business objects. Use the shared record-editor and confirmation
primitives before adding a route-local modal recipe.

- Open create and edit flows as a stable overlay over the current workbench;
  editing must not resize or replace the underlying list.
- Use the same three-part anatomy: context/title header, scrollable field
  sections, and a persistent action footer.
- Record version and similar read-only metadata belong in the header's context
  line beside the eyebrow. The top-right corner is reserved for the close
  control; metadata must not float beside it or resemble an action.
- The footer order is always `Cancel` followed by the primary save action.
  Destructive or lifecycle actions belong in the record detail or a separate
  confirmation dialog, never beside Save as an equal action.
- Use `CcField` for labels, hints, validation, and accessible relationships.
  Group fields by user intent such as Definition, Execution, Access, or
  Delivery rather than mirroring database columns.
- Use the shared `CcSelect` for native single-value choices in record editors.
  A select may share the input surface language, but it must retain an explicit
  trailing chevron, sufficient right padding, and distinct focus, disabled, and
  invalid states so it cannot be mistaken for editable text.
- In multi-column field rows, every field aligns its label and control to the
  top of its grid cell. Hint or error copy belongs below its own control and
  must not vertically center, stretch, or push down the sibling field.
- Fields that reference tools, permissions, departments, roles, or other
  system entities must use catalog-backed selectors. Do not ask users to type
  comma-separated identifiers that can drift from the source-of-truth value.
- Icon fields use the shared visual icon picker backed by the approved local
  icon catalog. Show the rendered symbol and a human label; never require users
  to type or understand implementation tokens such as `ph-map-trifold`.
- Catalog multiselects use the shared anchored popover. Opening options must
  not resize a form section, shift an adjacent column, or be clipped by the
  editor's scroll region. The popover follows its trigger during scrolling,
  fits above or below within the viewport, provides a full-width search field,
  and closes on Escape or an outside click.
- Workspace logos, account avatars, and workforce avatars use the shared
  identity picker. Supported modes are generated initials, a catalog icon, or
  a local PNG/JPEG/WebP upload; editable screens must not expose raw avatar URL
  text fields.
- Workspace identity owns the active accent color. Apply it to navigation,
  focus, and identity details while preserving semantic success, warning, and
  danger colors.
- Ordered definitions such as procedure steps use explicit record rows with
  add, remove, and move controls. A multiline textarea is not an editor for an
  ordered object collection. Reordering must preserve the step's execution
  type, tool relation, validation metadata, rollback instruction, and other
  fields not currently exposed by the compact editor.
- Configuration editors follow the same sectioned record-editor anatomy as
  operational records. Group identity/definition, navigation/presentation, and
  linked capabilities into separate sections instead of distributing inputs
  and textareas across one page-width row.
- Product and application create/edit flows use the same shared record editor
  as procedures, workforce records, and departments. Keep identity, product
  intent, lifecycle, access, and delivery surfaces in explicit sections rather
  than route-local bordered forms.
- Active versioned definitions are never mutated silently. Editing an active
  procedure creates an improvement draft; version is plain metadata and status
  is the only badge.
- Repeated records use the same shared data-table/list treatment as other
  directories. Version numbers, object totals, and categories are not rendered
  as decorative badges or counters.
- Department scope is a filterable operating lens. A shared procedure may be
  visible in every department named by its related process; the interface must
  not imply exclusive ownership by one department when the source record is
  cross-department.
- Archive and delete commands always use the shared confirmation dialog with a
  plain-language consequence and enough record context to prevent mistakes.

## Interactive Graph Contract

Company and application graphs are relationship workbenches, not catalog
visualizations. They use the same `UnifiedGraph3D` renderer and adapt their
domain packets to its shared node and typed-edge contract.

- Position nodes from recorded relationships or hierarchy. Never use backend
  type or array order as the primary layout axis.
- Whole-company graphs support both an `All relationships` overview and a
  focused perspective. The overview packs records into organic department or
  application clusters and keeps every relationship on one navigable 3D
  canvas. Focus mode retains the complete ancestor lineage and offers one,
  two, three, or all descendant levels without a hidden node cap.
- Dense graph clouds use restrained labels and visual de-emphasis instead of
  removing records. Selecting a node highlights its immediate relationships
  and the shortest recorded path back to the workspace root while the
  remaining company topology stays visible as context. Every node on that
  path receives a label that identifies its role in the selection context. A
  sparse selection labels every immediate neighbour; a dense hub keeps every
  neighbour and edge highlighted but reveals neighbour labels on hover instead
  of detaching or stacking them outside the viewport. The root is not implied
  when no recorded path exists.
- Node hover uses a forgiving invisible hit area, follows the individual
  instance under a moving pointer, pauses during camera gestures, and resumes
  against the updated camera position. A transient hover label must not capture
  the pointer away from the node that opened it.
- Node markers are compact, matte, low-poly objects that inherit the Roost
  work-surface palette. Branches keep enough three-dimensional separation for
  the camera to travel between records instead of collapsing into solid balls.
- Dense canvases keep labels screen-sharp and limited to focus, selection, and
  the currently hovered node. Hover and selection disclose type, name, and
  status; labels are anchored fully above their node and must not scale into
  large perspective cards, cover the active record, or obscure other branches.
- Selection smoothly changes the camera orbit and zoom pivot to that node
  without changing semantic node colors or teleporting the viewpoint.
  Clicking the selected node again, clicking the canvas background, or using
  the visible clear-selection action restores the active graph focus as the
  pivot.
- Edges connect node centers in three-dimensional space and use emphasis only
  to communicate blocked, attention, selected, or supporting relationships.
  Topology must never be inferred from color or array order.
- The canvas must have a definite responsive height before WebGL initializes.
  Reset the camera around the active focus after filters, focus, or inspector
  width changes.
- Preserve readable controls and labels while allowing the camera to enter the
  cloud and inspect close relationships. It is preferable to pan through a
  larger graph than to compress nodes into an unnavigable overview.
- Keep orbit, zoom, and reset controls keyboard reachable, visibly focused, and
  styled as part of the Roost work surface. A text/search and inspector path
  must remain available because a WebGL canvas is not itself an accessible
  record directory.
- Initial fit, filter changes, and focus transitions must retain visible node
  content and relationship edges. Empty, loading, and error states remain
  outside the graph viewport and provide a clear recovery action.
- On narrow screens, hide the mini-map before reducing graph controls or node
  labels; the canvas remains pannable and preserves readable zoom.
