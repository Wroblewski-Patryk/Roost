# CompanyCore V1 Simple Dashboard Canonical Audit

Date: 2026-05-15
Audited image:
`docs/ux/assets/companycore-v1-simple-dashboard-canonical.png`
Refined target:
`docs/ux/assets/companycore-v1-ceo-dashboard-refined-canonical.png`
Next exploration target:
`docs/ux/assets/companycore-v1-apqc-executive-atlas-canonical.png`
Polished visual target:
`docs/ux/assets/companycore-v1-executive-atlas-awwwards-canonical.png`
Area-first simplification target:
`docs/ux/assets/companycore-v1-area-first-atlas-canonical.png`

## Verdict

The first V1 dashboard concept is a clear improvement over a route-heavy admin
console, but it is not yet strong enough as the primary CEO cockpit.

It is professional and implementable, but still too close to a conventional
SaaS dashboard made of cards, lists, and module links. A CEO should not have to
interpret six widgets and three side lists to understand the company. The
screen should synthesize the operating state into one readable decision model:

```text
company health -> value flow -> blockers -> ownership -> safe AI handoff
```

## What Works

- The sidebar is much simpler and closer to an owner-facing information
  architecture.
- The color system is calm, credible, and feasible with Tailwind + DaisyUI.
- The visual density is lower than the current app and avoids decorative noise.
- The Company Brief gives one dominant action instead of many equal buttons.
- Jarvis/Paperclip readiness appears as a real operational concern, not as
  hidden API plumbing.
- The layout can be implemented with reusable shell, brief, widget, and queue
  components.

## What Still Feels Wrong

| Issue | Why It Matters | Better Direction |
| --- | --- | --- |
| Too many equal boxes | CEO still sees a dashboard inventory rather than a synthesized company state | Replace the widget grid with a value-flow board and compact KPI rail |
| Main content is still module-first | Areas, relationships, tasks, Drive, integrations, agents read like app modules | Show the company as a flow of operating zones with blockers attached |
| Right column repeats list patterns | Decisions, agent handoff, and evidence are useful but visually separate | Merge them into a single executive decision rail with clear owner/AI split |
| Flow diagram is too generic | General -> Areas -> Work -> Evidence -> Agents is nice, but visually light and detached | Make the flow the main dashboard object, with status and blockers on each stage |
| Sidebar still has many rows | It is simpler, but still asks the user to choose between ten places immediately | Make sidebar groups collapsible and keep only 5-6 top visible jobs |
| Status numbers lack narrative | 748 Drive items and 21 MCP tools are data points, not insight | Translate metrics into readiness: trusted context, review debt, safe automation |
| CEO decision model is implicit | The layout does not clearly separate "watch", "decide", "delegate" | Add three executive lanes: Observe, Decide, Delegate |

## Refined Design Thesis

The next V1 concept should feel like an `Executive Operating Board`.

It should not be another grid of cards. It should make the company legible as a
small operating system:

- left: stable navigation and workspace context
- center: value-flow board with company operating zones
- top: CEO headline with health, pressure, and next action
- right: decision rail split into owner decisions and agent handoffs
- bottom: compact evidence and freshness strip

## Refined Information Model

### CEO Questions

1. Is the company operating normally?
2. Where is the main friction right now?
3. Which department or resource owns the friction?
4. What decision do I need to make?
5. What can Jarvis/Paperclip safely do next?
6. What evidence changed recently?

### Screen Zones

| Zone | Role | Content |
| --- | --- | --- |
| Sidebar | Place and scope | Workspace, core modules, pinned departments |
| Executive Header | Situation summary | Health score, review debt, next owner action |
| Operating Flow Board | Company state | Strategy, Work, CRM, Knowledge, Integrations, Agents with blockers |
| Decision Rail | Action | Owner decisions, agent handoff, evidence freshness |
| Bottom Proof Strip | Trust | last sync, latest import, recent audit/event, safe MCP profile |

## Component Changes For Better V1

### Replace

- Replace six equal dashboard widgets with `OperatingFlowBoard`.
- Replace separate `Next decisions`, `Agent handoff`, and `Recent evidence`
  cards with one `ExecutiveDecisionRail`.
- Replace generic status chips with `ReadinessPills` that explain implication:
  `Context trusted`, `Review debt`, `Safe read tools`, `Approval waiting`.

### Keep

- Keep dark left sidebar, but reduce visible nav emphasis.
- Keep one primary CTA.
- Keep Phosphor icon treatment.
- Keep 8px radius, white surfaces, and restrained blue/green/amber/red.
- Keep Jarvis and Paperclip as visible agent consumers.

### Add

- `OperatingZoneCard`: a horizontal board item, not a generic square card.
- `BlockerPin`: attached to a zone, with source and owner.
- `DecisionItem`: owner action with risk, source, and destination.
- `AgentCapabilityItem`: read-only, supervised, waiting, blocked.
- `EvidenceTicker`: compact bottom strip for recent proof.

## Refined Layout Requirements

- The main center object should take about 55-60% of the viewport and visually
  explain how company work moves.
- No more than one large panel plus one decision rail should be visible as
  primary content.
- Secondary metrics should be in a thin rail, not six large cards.
- Every action group must have exactly one primary action.
- The route should answer `observe -> decide -> delegate` without scrolling on
  desktop.
- Mobile should collapse into:
  1. CEO headline
  2. primary decision
  3. operating zones as vertical list
  4. agent handoff

## Acceptance Criteria For The Refined Image

- Looks like a CEO operating board, not a generic SaaS metric dashboard.
- Fewer visible cards than the first concept.
- Value-flow state is the visual center.
- Owner decisions and AI delegation are explicitly separated.
- Metrics are interpreted as readiness/pressure, not just counts.
- Still feasible with Tailwind + DaisyUI and current backend data.

## Second-Pass Audit After The Refined CEO Board

The refined CEO board is better because it replaces a card grid with one
operating flow. However, it still underuses the strongest product idea in the
architecture: CompanyCore is not only a workflow dashboard. It is a company
management system where APQC process domains, the 12 operating areas, MECE
accountability, governance, knowledge, metrics, and human/AI execution should
meet in one calm model.

The next concept should therefore add more organizational "life" without
adding clutter. The goal is not animation or gamification. The goal is a
spatial hierarchy:

```text
00 General workspace/intake
  -> 12 company areas
  -> APQC/value-flow lenses
  -> MECE ownership and governance
  -> human/AI execution and evidence
```

### What The Refined CEO Board Still Misses

| Gap | Why It Matters | Next Direction |
| --- | --- | --- |
| 12 departments are not visible as a system | The user explicitly wants the 12-area operating model to anchor the app | Show the departments as a calm operating atlas or compass, not a long sidebar list |
| APQC/process-domain thinking is implicit | CompanyCore should teach process-first company management | Add a process lens row or radial layer: Govern, Develop, Deliver, Sell, Support, Learn |
| MECE ownership is not visible | AI action should wait until one accountable owner exists | Show ownership coverage and unresolved ownership debt near affected areas |
| The screen still reads as a workflow board | CEO needs company overview before workflow detail | Make the first visual object an organizational atlas with drill-down states |
| "Life" is limited to icons and lines | The app should feel alive without becoming decorative | Use subtle pulse/status rings, freshness ticks, and flow paths tied to real data |

### Third Concept Brief

The third concept should feel like an `Executive Company Atlas`.

It should keep the simplicity of the CEO board, but shift the central object
from a linear workflow to a calm company map:

- `00 General` as central intake/workspace/orchestration hub.
- 12 operating areas around it as grouped departments.
- APQC/value-flow lens across the top or as a subtle outer ring.
- MECE ownership/readiness visible as small coverage bars or rings.
- AI/human operating lane on the right: owner decisions, Jarvis/Paperclip,
  approval state, and recent proof.
- Progressive disclosure: overview first, one selected area detail second,
  raw tables/tools only after a click.

This version should be a better candidate for the true V1 canonical target if
it remains implementable and avoids visual overload.

## Art Direction Pass For The Polished Canonical Atlas

The APQC atlas is the strongest structural concept so far. Its weakness is
that it still feels slightly clinical. The next pass should add art direction
without sacrificing implementation clarity.

### Keep From The APQC Atlas

- `00 General` as the center of gravity.
- 12 operating areas around the center.
- APQC-inspired lens bar.
- MECE ownership principle in the selected-area detail.
- Right rail organized as `Decide`, `Delegate`, `Prove`.
- Bottom progressive path from overview to agent action.

### Improve

| Target | Improvement |
| --- | --- |
| Visual life | Add subtle data-light trails, soft depth, and status pulses tied to real states |
| Premium feel | Use better spacing, stronger typography rhythm, and refined surface layering |
| CEO clarity | Make the central atlas read first, then selected area, then right rail |
| Warmth | Add slight blue/teal/green luminous accents and restrained amber review markers |
| Memorability | Make the atlas feel like a proprietary product object, not a generic diagram |
| Implementability | Keep everything possible with CSS, SVG lines, Phosphor icons, and regular components |

### Hard Limits

- Do not turn the UI into a fantasy/city illustration.
- Do not add decorative blobs or abstract gradients that do not represent data.
- Do not add fake badges, points, trophies, or vanity gamification.
- Do not obscure text with atmosphere.
- Do not create visual elements that require complex custom WebGL for V1.

## Third-Pass Audit: Area-First Simplification

The polished executive atlas has the right premium feeling, but it still keeps
too many global app commands in the sidebar. This preserves a module-oriented
mental model:

```text
Atlas / Areas / Workflows / Knowledge / Agents / Settings
```

The user's preferred product direction is stronger:

```text
Company areas are the navigation.
Tools are capabilities inside the selected area.
```

That means `01 Strategy` should own its own goals, pipelines, tasks,
knowledge, resources, decisions, metrics, risks, controls, and agent handoffs.
The sidebar should not ask whether the user wants "Knowledge" or "Workflows"
in the abstract. It should ask which part of the company the user wants to
understand or operate.

### New Navigation Thesis

The primary IA should be:

```text
Workspace
  -> 00 General
  -> 01 Strategy
  -> 02 Projects
  -> ...
  -> 12 AI Agents
```

Then, inside the selected area:

```text
Overview | Goals | Workflows | Tasks | Knowledge | Resources | Decisions | AI
```

This is a better CEO model because it supports progressive disclosure:

1. choose the company area
2. see what matters in that area
3. drill into the useful capability
4. act or delegate safely

### What To Remove From The Sidebar

- Remove global `Areas`, `Workflows`, `Knowledge`, and `Agents` as equal
  primary rows.
- Keep only:
  - `Company Atlas`
  - `00 General`
  - the 12 operating areas
  - compact system/settings at the bottom
- Use search and command palette for cross-company jumps, not permanent
  sidebar clutter.

### What To Add To The Selected Area View

- `AreaCapabilityTabs`: Overview, Goals, Workflows, Tasks, Knowledge,
  Resources, Decisions, AI.
- `AreaHealthHeader`: selected area readiness, owner, review debt, AI-safe
  capability.
- `AreaOperatingStack`: goals -> workflows -> tasks -> evidence -> agent
  handoff for the selected area.
- `AreaContextPanel`: resources, knowledge, decisions, risks, and controls
  relevant to that area.

### Why This Is Better

| Previous Model | Area-First Model |
| --- | --- |
| User navigates app modules | User navigates the company |
| Knowledge is global | Knowledge belongs to areas and processes |
| Workflows are global | Workflows are owned by areas/processes |
| Agents are a separate place | Agents act in context of an area and permission scope |
| Sidebar grows as features grow | Sidebar stays stable because capabilities live inside areas |

### Acceptance Criteria For The Area-First Concept

- Sidebar is mostly the 00-12 area system.
- Commands are contextual inside the selected area, not global rows.
- The screen still shows the whole company atlas for orientation.
- Selected `01 Strategy` or `00 General` has clear tabs/capabilities.
- It is obvious how to move from area overview to goals, workflows, tasks,
  knowledge, resources, decisions, and AI handoff.
