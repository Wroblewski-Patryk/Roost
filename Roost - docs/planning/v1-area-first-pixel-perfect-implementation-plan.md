# V1 Area-First Pixel-Perfect Implementation Plan

Date: 2026-05-15
Stage: planning

Canonical references:

- Desktop:
  `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
- Mobile:
  `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`
- UX spec:
  `docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md`
- User paths:
  `docs/planning/v1-area-first-dashboard-implementation-paths.md`

## Goal

Implement the V1 area-first dashboard so the real web app matches the
canonical desktop and mobile images as closely as practical while using real
CompanyCore data and reusable layout components.

The implementation must replace route/module-first navigation with:

```text
Company Atlas
  -> LuckySparrow Dzialy
  -> selected area
  -> area capabilities
  -> record/evidence/AI action
```

## Non-Negotiable Product Rules

- Sidebar navigation is company-area first, not app-module first.
- Only one desktop area can be expanded at once.
- Capabilities live inside the selected area:
  `Overview`, `Goals`, `Workflows`, `Tasks`, `Knowledge`, `Resources`,
  `Decisions`, `AI`, `+ Add view`.
- The top header is quiet:
  breadcrumb, one search field, one status cluster, one icon button.
- Mobile does not reuse the desktop shell. It uses a compact topbar,
  horizontal area selector, compact atlas preview, selected-area card, `Today`
  list, and bottom nav.
- The atlas must be real UI: CSS/SVG/components, not a pasted screenshot.

## Area Names

The V1 UI should use these display names:

| Key | Display |
| --- | --- |
| `00-ogolny` | `00 Ogolny` |
| `01-strategia` | `01 Strategia` |
| `02-produkt` | `02 Produkt` |
| `03-sprzedaz` | `03 Sprzedaz` |
| `04-operacje` | `04 Operacje` |
| `05-relacje` | `05 Relacje` |
| `06-kadry` | `06 Kadry` |
| `07-finanse` | `07 Finanse` |
| `08-zasoby` | `08 Zasoby` |
| `09-technologia` | `09 Technologia` |
| `10-prawo` | `10 Prawo` |
| `11-innowacje` | `11 Innowacje` |
| `12-zarzadzanie` | `12 Zarzadzanie` |

Use ASCII in code and docs. UI localization can later render Polish diacritics
if the product language policy allows it.

## Implementation Slices

### Slice 0: Baseline And Guardrails

Purpose: avoid breaking current work while introducing the new shell.

Scope:

- inspect `public/index.html`, `public/app.js`, `public/styles.css`
- inspect `web/src/main.tsx`, `web/src/react-route-kit.tsx`,
  `web/src/styles.css`
- decide whether the first implementation should land in React-only dashboard
  or the existing vanilla shell first

Recommendation:

- Implement the area-first dashboard in the React web layer first if possible,
  then route `/dashboard` to it after visual and journey proof.
- Keep the existing vanilla routes reachable until the new shell has signed-in
  browser proof.

Validation:

- current `npm run check:public-js`
- current `npm run build`
- no unrelated runtime changes

### Slice 1: Design Tokens And Layout Primitives

Create shared visual primitives before building the dashboard body.

Components:

- `CompanyShell`
- `AreaSidebar`
- `MobileAppBar`
- `CommandSearch`
- `StatusCluster`
- `Surface`
- `IconTile`
- `StatusDot`
- `ProgressivePath`

CSS/token work:

- graphite sidebar
- active blue rail/glow
- light app background
- white panels with subtle borders
- 8px radius system
- atlas blueprint grid utility
- mobile-safe spacing and tap targets

Acceptance:

- desktop shell frame matches the canonical image before dashboard internals
- mobile shell frame matches the mobile top/bottom navigation before content

### Slice 2: Area Data Adapter

Create one adapter that transforms backend state into UI area state.

Inputs:

- `/v1/connection`
- operating model areas and tables
- relationships graph when available
- tasks
- Google Drive files
- MCP manifest/API key readiness
- Company OS counts/attention where available

Output shape:

```ts
type AreaDashboardState = {
  key: string;
  label: string;
  status: "ready" | "review" | "blocked" | "empty";
  count?: number;
  capabilities: AreaCapabilityState[];
  signals: AreaSignal[];
  priorities: DecisionRailItem[];
  ai: AreaAiState;
};
```

Rules:

- no fake data
- if a source is unavailable, show a graceful empty/unknown state
- derive display names from canonical area map when current backend names differ
- mark inferred/unsupported relationship data clearly

Acceptance:

- `01 Strategia` renders with Overview, Goals, Workflows, Tasks, Knowledge,
  Resources, Decisions, AI
- unavailable data does not break the UI

### Slice 3: Desktop Area-First Dashboard

Build the desktop view from the canonical image.

Components:

- `AreaSidebar`
  - `Company Atlas`
  - `Dzialy`
  - 00-12 area list
  - expanded `01 Strategia`
  - area subviews
  - `+ Add view`
  - workspace settings
- `DashboardHeader`
  - `LuckySparrow / Company Atlas`
  - compact search
  - `13 areas / 87% ownership / 2 decisions`
  - icon button
- `CompanyAtlasBoard`
  - central `00 Ogolny`
  - orbit nodes 01-12
  - selected `01 Strategia`
  - APQC lens segmented control
  - status legend
- `AreaOverviewPanel`
  - selected area title
  - capability tabs
  - summary
  - area signals
  - AI readiness
  - MECE note
- `DecisionRail`
  - Today priority
  - strategy decision
  - AI handoff
  - proof
- `ProgressivePath`
  - Overview -> Area -> Capability -> Record -> Evidence -> AI action

Acceptance:

- desktop screenshot at `1366x900` visually matches the canonical desktop
  image
- no horizontal overflow
- exactly one expanded area
- no global module rows for Workflows/Knowledge/Agents

### Slice 4: Mobile Area-First Dashboard

Build the mobile layout from the canonical mobile image.

Components:

- `MobileAppBar`
- `MobileCompanySummary`
- `MobileAreaSelector`
- `MobileAtlasPreview`
- `MobileAreaPanel`
- `MobileTodayList`
- `MobileBottomNav`

Acceptance:

- mobile screenshot at `390x844` visually matches the canonical mobile image
- no desktop sidebar appears
- topbar is one row only
- bottom nav has five items:
  `Atlas`, `Area`, `Tasks`, `Knowledge`, `AI`
- area tabs are horizontally scrollable without page overflow

### Slice 5: Capability Tab Shells

Do not fully rebuild every feature route in this pass. Create area-scoped
shells that reuse current backend-backed surfaces where possible.

Initial behavior:

- `Overview`: implemented in full for selected area
- `Goals`: summarize goals/targets where available, empty state otherwise
- `Workflows`: link and summarize Company OS processes/pipelines
- `Tasks`: summarize tasks filtered by area where possible
- `Knowledge`: summarize Drive/files/resources for area
- `Resources`: summarize mapped resources/tables/providers
- `Decisions`: summarize approvals/decisions/risks
- `AI`: summarize MCP/API readiness and agent handoff
- `+ Add view`: planned/configuration shell, no fake persistence unless a
  backend contract exists

Acceptance:

- every tab has loading, empty, error, and ready states
- no placeholder fake records
- links lead to existing detail/workbench routes when full area-native view is
  not yet implemented

### Slice 6: Visual Fidelity Pass

Run a deliberate design matching pass.

Checklist:

- sidebar width, spacing, active state, expanded rail
- header height and density
- atlas panel position and proportions
- orbit node sizes and labels
- selected area panel spacing
- right rail row rhythm
- bottom path spacing
- mobile card order and first viewport
- font size/weight/line-height
- colors and status dots
- icon sizes and alignment

Acceptance:

- write a fidelity ledger with at least 10 comparison points
- no obvious screenshot-review mismatch remains

### Slice 7: Real Journey Proof

Required journeys:

- login/register or injected owner session in test server
- open `/dashboard`
- select `01 Strategia` from sidebar/area selector
- switch capability tab to `Goals`
- switch capability tab to `AI`
- open priority from Today rail/list
- mobile bottom nav tap path
- refresh page and preserve selected area/tab

Validation commands:

- `npm run check:public-js`
- `npm run build`
- `npm run validate`
- `npm run test:api` when PostgreSQL/Docker is available
- Playwright or Browser proof at:
  - desktop `1366x900`
  - tablet `834x1112`
  - mobile `390x844`

Resource hygiene:

- stop any dev server started only for validation
- close browser contexts
- check for leftover validation processes

## Pixel-Perfect Fidelity Ledger Template

Use this table in the implementation task result.

| Point | Canonical Evidence | Render Evidence | Status | Fix |
| --- | --- | --- | --- | --- |
| Sidebar IA | Desktop image shows area-first sidebar | screenshot path | pass/fail | |
| Expanded area | `01 Strategia` expanded with subviews | screenshot path | pass/fail | |
| Header | quiet breadcrumb/search/status | screenshot path | pass/fail | |
| Atlas | central `00 Ogolny`, selected `01 Strategia` | screenshot path | pass/fail | |
| Area tabs | Overview/Goals/.../AI visible | screenshot path | pass/fail | |
| Right rail | Today rows compact | screenshot path | pass/fail | |
| Bottom path | Area active | screenshot path | pass/fail | |
| Mobile topbar | one row only | screenshot path | pass/fail | |
| Mobile selector | horizontal Dzialy chips | screenshot path | pass/fail | |
| Mobile content order | summary -> selector -> atlas -> area -> Today | screenshot path | pass/fail | |

## Risks

| Risk | Mitigation |
| --- | --- |
| Current production shell is vanilla-heavy | Implement behind a React route or feature branch first |
| Backend area names do not match target labels | Use display-name adapter while preserving backend IDs |
| Some capability tabs lack strong data | Use honest empty states and route links, not fake records |
| Pixel polish delays functional proof | Build shell and data adapter first, then fidelity pass |
| Mobile becomes compressed desktop | Implement mobile components separately |

## Handoff

The next implementation task should start with Slice 0 and Slice 1 only. Do
not attempt all capabilities in one commit. The first code milestone should be:

```text
Shared area-first shell + desktop/mobile layout frame + static selected-area
state using real workspace/area data where available.
```

Only after that frame matches the canonical screenshots should the task move
into the atlas internals and area capability tabs.
