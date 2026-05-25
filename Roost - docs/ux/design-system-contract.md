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

The sidebar should not remain a generic route directory. For V1 it should
express the operating model as a company area list. Workflows, Knowledge,
Agents, and other capabilities should appear inside the selected area, not as
competing global destinations. Badges and readiness signals must come from real
product state. Do not introduce a second route-local shell for React surfaces.

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
