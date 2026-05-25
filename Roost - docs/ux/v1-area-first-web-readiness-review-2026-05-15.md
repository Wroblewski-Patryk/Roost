# V1 Area-First Web Readiness Review

Date: 2026-05-15
Status: READY FOR FIRST IMPLEMENTATION SLICE

## Reviewed Sources

- `docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md`
- `docs/planning/v1-area-first-dashboard-implementation-paths.md`
- `docs/planning/v1-area-first-pixel-perfect-implementation-plan.md`
- `docs/planning/v1-area-first-pixel-perfect-task-contract.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/screen-quality-checklist.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/organizational-architecture-bridge.md`

## Verdict

The V1 area-first web layer is sufficiently described for a first
implementation slice.

The product model is now clear:

```text
Workspace -> Dzialy -> Area -> Capability -> Record -> Evidence -> AI action
```

The implementation should not start by rebuilding every feature route. It
should start by creating the shared area-first layout frame and proving it on
desktop and mobile. Once that frame is faithful to the canonical screenshots,
additional area capability views can be implemented one by one.

## What Is Complete Enough

| Area | Readiness | Notes |
| --- | --- | --- |
| Product IA | Ready | Sidebar is area-first and capabilities are scoped to selected area. |
| Canonical visuals | Ready | Desktop and mobile canonical screenshots exist. |
| User paths | Ready | CEO open, area triage, goals, workflows, knowledge, AI handoff, custom view path are documented. |
| Component map | Ready | Shell, sidebar, atlas, area panel, rail, progressive path, and mobile components are defined. |
| Validation plan | Ready | Desktop/mobile screenshot sizes, checks, and fidelity ledger exist. |
| Backend boundary | Ready | Plan reuses existing APIs and forbids fake records or schema changes. |
| Mobile stance | Ready | Mobile is its own layout, not desktop squeezed down. |

## Remaining Decisions For Implementation Start

These are implementation decisions, not product blockers.

| Decision | Recommendation | Why |
| --- | --- | --- |
| React-first or vanilla-first | React-first for the new area-first dashboard frame | The React layer already uses Tailwind/DaisyUI and is better suited for component extraction. |
| Production route switch timing | Keep current `/dashboard` until area-first proof passes | Avoid breaking the current owner console while building the new shell. |
| Area display names vs backend names | Use a display adapter | The UI can show target LuckySparrow names while preserving existing backend IDs. |
| `+ Add view` persistence | Shell only in first slice | No backend contract should be invented during layout work. |
| Full capability tab depth | Overview first, honest summary shells for others | Prevents a risky all-at-once rebuild. |

## First Implementation Slice

The first code task should build:

- `CompanyShell`
- `AreaSidebar`
- `MobileAppBar`
- `CommandSearch`
- `StatusCluster`
- `ProgressivePath`
- display-name adapter for 00-12 areas
- selected-area state, defaulting to `01 Strategia`
- desktop/mobile layout frame with real workspace/area data when available

It should not yet build the full atlas internals or deep capability tabs unless
the frame is already matching the canonical screenshots.

## Second Implementation Slice

After the frame is stable:

- `CompanyAtlasBoard`
- orbit nodes
- APQC lens segmented control
- selected-area update behavior
- status legend
- `AreaOverviewPanel`
- `DecisionRail`

## Third Implementation Slice

After atlas and overview proof:

- capability tab shells
- area-scoped summaries for Goals, Workflows, Tasks, Knowledge, Resources,
  Decisions, AI
- route links into existing backend-backed workbenches
- loading/empty/error/success states

## UX Risks To Watch

| Risk | Watch For | Fix |
| --- | --- | --- |
| Header grows again | too many pills, CTAs, labels | keep breadcrumb/search/status/icon only |
| Sidebar becomes module menu again | Workflows/Knowledge/Agents as global rows | keep them inside expanded area and content tabs |
| Atlas becomes decoration | static image or non-clickable diagram | build data-addressable nodes and focus behavior |
| Mobile becomes desktop clone | full sidebar or tiny atlas labels | use mobile-specific selector, mini atlas, bottom nav |
| Empty states feel fake | placeholder-looking tab content | use honest empty states and links to current routes |
| AI feels unsafe | broad actions without approval context | show read-only/supervised/waiting states and audit proof |

## Required Evidence Before Calling First Slice Done

- Desktop screenshot at `1366x900`.
- Mobile screenshot at `390x844`.
- Comparison against:
  - `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`
- `npm run build`.
- `npm run validate` if touched files allow it.
- `npm run test:api` when local PostgreSQL/Docker is available.
- Browser proof:
  - dashboard opens signed-in
  - `01 Strategia` is selected/expanded
  - capability tabs are focusable
  - mobile bottom nav is usable
  - no console errors or failed requests
  - no horizontal overflow
  - no unnamed visible controls

## Documentation Gaps

No blocking UX/UI documentation gap remains for the first implementation
slice.

Non-blocking follow-up docs after implementation:

- Add verified reusable patterns to `docs/ux/design-memory.md`.
- Update `.agents/state/module-confidence-ledger.md` for the implemented shell
  and dashboard route.
- Update `.codex/context/TASK_BOARD.md` with implementation evidence.
- Add a route-level fidelity ledger after screenshots exist.

## Implementation Confidence

Confidence: Medium-high.

Reason:

- The target is well documented and scoped.
- The backend already exposes enough data to render a real first version.
- The largest remaining risk is not product ambiguity. It is implementation
  collision with the existing vanilla/React shell split and current dirty
  UX100-W02 changes.

Mitigation:

- Start React-first or behind an isolated route/frame.
- Do not replace production shell until visual and journey proof pass.
- Keep the first code task focused on shell/frame before deep features.
