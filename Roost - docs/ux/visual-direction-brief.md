# Visual Direction Brief

Use this file at project start or before major redesign work.

Its purpose is to define a strong visual thesis early so implementation does
not drift into generic default UI.

## How To Use

- Fill this brief before broad frontend expansion.
- Keep it short enough to guide decisions quickly.
- Update it when the product direction changes meaningfully.
- Keep it aligned with `docs/ux/design-system-contract.md` and
  `docs/ux/design-memory.md`.

## Brief Template

```markdown
# Visual Direction Brief

## Product Character
- Brand feeling:
- Trust posture:
- Energy level:
- Keywords:

## Visual Thesis
- One-sentence direction:
- Why this fits the product:

## Typography
- Heading style:
- Body style:
- Density:
- What to avoid:

## Color Strategy
- Primary mood:
- Accent usage:
- Surface strategy:
- Contrast posture:

## Decorative Asset Strategy
- Background style:
- Illustration or motif style:
- Raster assets allowed: yes | no
- SVG assets allowed: yes | no
- Approximation tolerance:

## Shape And Spacing
- Radius language:
- Border vs shadow preference:
- Spacing rhythm:
- Container feel:

## Motion
- Motion character:
- Motion use cases:
- Motion to avoid:

## UX Priorities
- What must feel effortless:
- What should feel premium:
- What should feel fast:

## Surface Notes
- Mobile:
- Tablet:
- Desktop:

## Explicit Avoids
- Avoid 1:
- Avoid 2:
- Avoid 3:
```

## Minimum Quality Bar

- The brief must be specific enough to influence real implementation choices.
- "Modern", "clean", and "nice" are not enough on their own.
- Include at least one explicit statement about mobile, tablet, and desktop.
- Include at least three explicit avoids.
- If the product depends on decorative backgrounds or illustration, include an
  explicit asset strategy.

## CompanyCore Canonical Visual Direction

### 2026-05-17 Roost Brand Direction

Roost is the target product brand for the LuckySparrow operating center. It is
the digital nest for humans, AI agents, processes, knowledge, tasks,
pipelines, and company resources. The visual thesis is a cinematic dark
operations cockpit: quiet, modular, outline-first, system-intelligent, and
practical.

This direction does not approve a broad unverified restyle of every current
screen. It defines the target system for new surfaces and future scoped
migrations. The current compatibility theme may remain in place until a
surface has Roost parity evidence.

#### Product Character

- Brand feeling: controlled, intelligent, modular, futuristic, operational.
- Trust posture: calm command center for humans and AI agents.
- Energy level: focused, composed, alive through subtle system motion.
- Keywords: Roost, digital nest, operating center, autonomous organization,
  human/AI collaboration, MCP/API readiness, ordered command.

#### Visual Thesis

- One-sentence direction: Roost should feel like a cinematic dark operating
  center for an autonomous company, with clear hierarchy, thin outlines,
  modular surfaces, and subtle digital light.
- Why this fits the product: LuckySparrow needs one practical center where
  company knowledge, tasks, resources, processes, and agents can be operated
  without making the UI feel like a generic ERP or noisy task app.

#### Typography

- Heading style: Inter `600-700`, compact, confident, never oversized inside
  operational panels.
- Body style: Inter, neutral, readable, about `150%` line height.
- Density: medium-to-compact on desktop, a little more spacious on touch
  surfaces.
- What to avoid: negative tracking, decorative display fonts, browser-default
  control text, and uppercase beyond micro labels.

#### Color Strategy

- Primary mood: nocturnal operating center with graphite surfaces and digital
  indigo/blue/cyan light.
- Accent usage: indigo for active/CTA/focus, blue for information, cyan for
  AI/MCP/sync/data flow, green for healthy systems.
- Surface strategy: dark base, dark cards, thin borders, restrained glass
  material, and glow only as functional emphasis.
- Contrast posture: text-first and AA-oriented; never rely on color alone for
  status.

#### Decorative Asset Strategy

- Background style: subtle light, depth, dark surfaces, and optional
  operational/cockpit imagery when the route needs a strong brand signal.
- Illustration or motif style: outline geometry, orbit/nest/system
  connections, sparrow/R/orbit/module motifs for logo exploration.
- Raster assets allowed: yes for approved hero, atmosphere, logo exploration,
  and brand imagery.
- SVG assets allowed: yes for icons, marks, routes, connections, and UI
  overlays.
- Approximation tolerance: low for logo and core brand surfaces; avoid generic
  gradients as a substitute for intended imagery.

#### Shape And Spacing

- Radius language: `rounded-2xl` for Roost cards unless a dense tool surface
  needs smaller corners; keep controls predictable.
- Border vs shadow preference: thin border first, soft shadow/glow second.
- Spacing rhythm: modular, clean, scannable, with enough depth to separate
  command, data, and action zones.
- Container feel: modular cards and panels, not nested card stacks.

#### Motion

- Motion character: smooth, quiet, system-like.
- Motion use cases: fade, focus glow, sync/data-flow cues, selected-module
  transitions, and depth motion.
- Motion to avoid: flashy effects, gaming bounce, and decorative loops.

#### UX Priorities

- What must feel effortless: seeing what matters now, what is blocked, and
  what the next action is.
- What should feel premium: command surfaces, agent/MCP readiness, resource
  systems, and cross-department operating views.
- What should feel fast: navigation, filtering, command feedback, and local
  state changes.

#### Surface Notes

- Mobile: prioritize command summary, next action, and compact module
  switching before dense maps or large panels.
- Tablet: support split operational views when readable; otherwise stack
  command before exploration.
- Desktop: use full cockpit density with persistent orientation, modular
  panels, and clear command hierarchy.

#### Explicit Avoids

- Avoid neon cyberpunk, gaming chaos, and hacker cliches.
- Avoid strong gradient backgrounds everywhere.
- Avoid thick borders, heavy black shadows, and noisy color palettes.
- Avoid unnecessary labels, fake metrics, or decorative status chips.
- Avoid switching icon families without a documented missing-icon gap.

### 2026-05-14 Direction Update

The approved direction is a cinematic-realistic `Company City Map`: CompanyCore
should feel like a strategic game for building a company as a living value
ecosystem, while staying a serious operational product for human and AI work.
The dashboard after login should show the company as a beautiful city/campus
map where `GENERAL` is the central intake and orchestration district, and the
12 company departments are visible as connected districts in a universal value
journey.

This direction supersedes purely flat cockpit or engineering-OS visuals. It
does not remove the management-first rule; the cinematic city exists to make
company structure, responsibility, flow, blockers, integrations, and next
actions easier to understand.

### Product Character

- Brand feeling: cinematic, strategic, precise, trustworthy, operational.
- Trust posture: owner-grade company infrastructure; decisions should feel
  reversible, traceable, and safe.
- Energy level: focused and quietly confident, with light strategy-game
  delight and low decorative noise.
- Keywords: company city, value journey, strategic map, command brief,
  operating clarity, accountable action, human/AI collaboration.

### Visual Thesis

- One-sentence direction: CompanyCore should feel like a premium strategy game
  where the user builds and steers a company-city that produces value through
  connected operational districts.
- Why this fits the product: the user is managing a real company system, so the
  interface must make structure, flows, ownership, integrations, blockers, and
  next action visible without reducing the product to tables and admin panels.

### Canonical Dashboard Metaphor

- First surface after login: `Company City Map`.
- Current target spec: `docs/ux/company-city-dashboard-v3-spec.md`.
- Current target asset: `docs/ux/assets/company-city-dashboard-v3-target.png`.
- Current department-detail target:
  `docs/ux/assets/company-city-management-department-v1-target.png`.
- Central district: `GENERAL`, the zero-area intake and orchestration hub where
  unassigned work, imports, support items, ideas, and ambiguous ownership land
  before deliberate routing.
- Company districts: 12 operational areas arranged around `GENERAL`, connected
  by roads, bridges, data rails, and value-flow paths.
- Right-side role: `Command Brief` with decisions, tasks, unassigned GENERAL
  items, active integrations, and AI-ready automations.
- Bottom role: `The Value Journey`, a compact route from discovery to growth
  that explains how the company creates and compounds value.
- Drill-down model: selecting a district opens its workbench, relationships,
  integrations, tasks, automations, evidence, and data, preserving the city
  metaphor without hiding real CRUD surfaces.

### Typography

- Heading style: compact, high-confidence labels with enough weight to anchor
  panels but not oversized hero typography inside tools.
- Body style: readable operational copy with short recovery guidance and
  explicit destination names.
- Density: medium-to-compact on desktop, slightly more spacious on touch
  surfaces.
- What to avoid: browser-default control text, oversized dashboard headings,
  long explanatory paragraphs in dense work areas, and negative letter spacing.

### Color Strategy

- Primary mood: cinematic dusk/dawn city atmosphere with dark graphite UI
  chrome, realistic warm lights, steel surfaces, and high readability.
- Accent usage: use warm light for active districts and value flow, green for
  healthy/ready states, amber for review, red only for blocked or unsafe
  states, and restrained blue/teal for navigational focus.
- Surface strategy: city canvas, command brief, filters, workbenches, local
  feedback, and secondary exploration must have visibly different roles.
- Contrast posture: text-first and AA-oriented; never rely on color alone for
  status.

### Decorative Asset Strategy

- Background style: intentional cinematic city/campus map assets for the
  primary dashboard and map-led surfaces; quieter operational surfaces for
  drill-down workbenches.
- Illustration or motif style: realistic architecture, districts, paths,
  lights, water/landscape depth, and subtle map labels; icons clarify controls
  and statuses but should not replace the city metaphor.
- Raster assets allowed: yes for approved company-city backgrounds, district
  atmosphere, and canonical map scenes.
- SVG assets allowed: yes for overlays, labels, flow paths, map markers,
  controls, and product-specific marks.
- Approximation tolerance: low for the dashboard city-map composition; do not
  replace it with generic gradients, bento cards, or flat graphs.

### Shape And Spacing

- Radius language: 8px or less for panels, rows, buttons, icon containers, and
  map labels unless an existing approved pattern says otherwise.
- Border vs shadow preference: borders first, restrained shadows only for
  selected/detail emphasis or elevated overlays.
- Spacing rhythm: clear gutters, compact row gaps, and enough air around the
  primary command area.
- Container feel: avoid nested cards; use panels for primary sections, rows for
  repeated items, and tables for comparable operational data.

### Motion

- Motion character: calm, cinematic, and functional.
- Motion use cases: opening navigation, focusing selected districts, tracing
  value-flow paths, showing pending/success/error feedback, switching map zoom
  levels, and preserving perceived continuity.
- Motion to avoid: decorative loops, distracting hover effects, and movement
  that shifts dense layouts.

### Light Gamification

- Allowed: district readiness levels, value-flow progress, journey milestones,
  health signals, unlockable capabilities, completed-mission evidence, and
  small rewards for routing, cleaning, proving, or improving company systems.
- Required: every game-like element must map to real company state, evidence,
  tasks, integrations, automations, or verified progress.
- Avoid: fake scores, arbitrary badges, manipulative streaks, noisy animations,
  or cosmetics that compete with operational decisions.

### UX Priorities

- What must feel effortless: finding the next action, seeing blockers,
  understanding the company operating area, and moving from summary to the
  exact workbench.
- What should feel premium: the Company City dashboard, command brief,
  district drill-downs, relationship review, data tables, and integration setup
  feedback.
- What should feel fast: route changes, filters, table scanning, and local
  action feedback.

### Surface Notes

- Mobile web: show a simplified city map or district carousel first only when
  it answers the next action quickly; otherwise lead with command brief and a
  compact map entry. Keep navigation in the drawer and preserve sign-out.
- Tablet web: use the city map plus a contextual command panel when both remain
  scannable; otherwise stack command brief before district exploration.
- Desktop web: use the full cinematic city canvas, persistent navigation, right
  command brief, and bottom value journey without forcing scrolling to
  understand the state.
- Native mobile app: treat the city map as an overview and orientation layer,
  then use focused drill-down screens, bottom navigation, touch-first district
  switching, and local command actions.
- Native tablet app: support a richer split layout with map, command brief, and
  selected district workbench where space allows.

### Explicit Avoids

- Avoid marketing landing-page composition inside private operational routes.
- Avoid generic icon decoration that does not improve orientation.
- Avoid equal-weight cards where command, filter, table/list, selected detail,
  and feedback roles need different visual priority.
- Avoid raw provider/backend errors in the UI; show recovery copy near the
  action that failed.
- Avoid introducing Tailwind/DaisyUI classes without an approved frontend
  architecture migration.
- Avoid replacing the approved Company City direction with a flat graph,
  generic admin dashboard, or abstract OS shell.
- Avoid gamification that is disconnected from real company progress.
