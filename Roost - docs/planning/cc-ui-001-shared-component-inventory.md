# CC-UI-001 Shared Component Inventory

Last updated: 2026-05-16

## Purpose

CompanyCore management UI must scale across `00 Main`, `04 Operations`,
`08 Assets`, and later departments without page-local clutter. Tailwind and
DaisyUI remain the styling foundation, and reusable CompanyCore primitives must
wrap recurring DaisyUI patterns instead of copying markup per route.

This inventory is a planning checkpoint. It does not change runtime behavior.

## Current Surface

| Surface | Current evidence | Reuse signal | Gap |
| --- | --- | --- | --- |
| Shell | `web/src/react-route-kit.tsx` exports `Shell`; department routes already share it. | Good foundation for desktop responsive navigation and workspace status. | Mobile route navigation and command density still need one canonical management layout contract. |
| Notice/state feedback | `LocalNotice` exists in `web/src/react-route-kit.tsx`; `main.tsx` also has local state panels such as `StatePanel`, `DashboardStatePanel`, `TasksStatePanel`, `CompanyOsStatePanel`, and `AgentToolSurfaceStatePanel`. | DaisyUI alert patterns are already in use. | Loading, empty, error, blocked, and success states should collapse into one shared `CcNotice` or `CcStatePanel` primitive. |
| Tables | `DataTable` exists in `web/src/react-route-kit.tsx`; `main.tsx` has `DataTable`, `TasksTable`, `MigrationTable`, `IntegrationAreaTable`, `AreasTable`, `GenericRecordTable`, and record-specific table shells. | There is a table abstraction, and several routes already define columns. | Need one shared table/list primitive with pagination hooks, mobile density behavior, loading/error/empty states, actions, row metadata, and future sorting/filter slots. |
| Metrics/cards | `MetricCard` exists in `web/src/react-route-kit.tsx`; `main.tsx` has multiple route-local metric, signal, and command card patterns. | The visual language is compatible with DaisyUI card/stat patterns. | Need canonical `CcMetricCard`, `CcSignalCard`, and `CcCommandCard` variants using one radius, tone, icon, and action model. |
| Buttons/actions | DaisyUI `btn` classes are widely used directly. | The theme already controls basic button appearance. | Need a shared `CcButton` wrapper for variants, left/right icon, loading, disabled reason, size, href/button behavior, and consistent labels. |
| Badges/status | Multiple helper functions and local class strings render statuses and priorities. | DaisyUI badge classes and semantic tones are present. | Need a shared `CcBadge`/`CcStatusBadge` mapping for task status, priority, risk, route proposal status, sync status, and approval status. |
| Tabs/segmented navigation | Capability rails, area tabs, and route selectors are implemented locally. | The information architecture is coherent. | Need one responsive segmented control/tabs primitive for department capabilities and table views. |
| Forms | Create client/task forms and settings forms use DaisyUI classes directly. | Basic form fields are consistent enough. | Need shared field, select, textarea, form footer, and inline error primitives before adding more writes. |

## Required Shared Primitives

| ID | Primitive | Contract |
| --- | --- | --- |
| CC-PRIM-BUTTON | `CcButton` | Single action component over DaisyUI `btn`; supports `variant`, `size`, `iconLeft`, `iconRight`, `loading`, `disabledReason`, `href`, `type`, and `aria-label`. |
| CC-PRIM-TABLE | `CcDataTable` | Single table/list component; supports columns, rows, loading, empty, error, pagination metadata, row actions, density, mobile card fallback, and sticky header option. |
| CC-PRIM-NOTICE | `CcStatePanel` | Shared local feedback for loading, empty, error, success, blocked, and signed-out states. |
| CC-PRIM-CARD | `CcCard` and variants | Shared un-nested card primitive for repeated items only: metric, signal, command, record summary. |
| CC-PRIM-BADGE | `CcBadge` | Shared tone/status badge with canonical status maps. |
| CC-PRIM-TABS | `CcTabs` | Shared segmented/tab control for views and capabilities. |
| CC-PRIM-FIELD | `CcField` | Shared label, hint, error, input/select/textarea wrapper using DaisyUI form classes. |
| CC-PRIM-TOOLBAR | `CcToolbar` | Shared responsive command bar for filters, refresh, primary action, and view switch. |

## Adoption Order

1. Create shared component files under `web/src/components/` or the existing
   approved shared frontend location after confirming import boundaries.
2. Move `DataTable`, `MetricCard`, and `LocalNotice` out of route-kit if needed
   or wrap them in new shared primitives while preserving compatibility.
3. Convert `00 Main` intake panel and `04 Operations` board first, because
   they are the active loop and have visible duplication pressure.
4. Convert `08 Assets` on first implementation instead of creating a new local
   table/card/action pattern.
5. Add pagination, mobile table-card behavior, and status maps in the shared
   primitives only.

## Guardrails

- Do not create page-local table/card/button variants for new department work.
- Do not place cards inside cards.
- Use DaisyUI theme tokens and Tailwind utilities; no route-specific color
  systems unless recorded in UX source of truth.
- Mobile, tablet, and desktop are separate density modes. A horizontal table
  scroll is acceptable for dense administrative data, but primary mobile queues
  should have a card/list fallback.
- Loading, empty, error, and success states must appear near the action or view
  they describe.

## Next Implementation Task

`CC-UI-002 Shared action/button primitive` should be the first runtime slice,
followed by `CC-UI-003 Shared data table/list primitive`.
