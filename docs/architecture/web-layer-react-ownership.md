# Web Layer React Ownership

Last updated: 2026-08-14

## Decision

CompanyCore web UI is React-owned. The backend may still serve static files,
health endpoints, and JSON APIs, but user-facing web routes must render through
the Vite React bundle in `public/react/index.html`.

As of 2026-05-16, `/` is the canonical public home route and
`/areas?area=00-ogolny&view=overview` is the canonical authenticated
post-login landing route. `/dashboard` and `/react-dashboard` remain temporary
compatibility aliases that redirect to the `00 Ogolny` selected-area
dashboard.

WEB-CORE-001 narrowed the active web product in May 2026 and removed the legacy
console. Subsequent accepted department work expanded the React route registry:
the active web product now includes public home, login, registration, `00
General`, the owner-facing product map, department views `01`-`12`, account
settings, and workspace settings. Historical v0/v1 workbenches such as data,
pipeline, Company OS cockpit, MCP catalog, and provider-specific setup consoles
are not active web screens unless rebuilt through the React route registry.
Their backend APIs remain in place for scoped department or settings rebuilds.

React route metadata now lives in `web/src/app-route-registry.ts`. That file is
the source of truth for the current active route set, compatibility aliases,
shell navigation entries, route titles, and safe post-auth redirect
normalization. Future web views must extend the registry and the view index
only after a scoped department-system task accepts them.

The legacy vanilla owner console files under `public/` are removed from the
active runtime path:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/relationship-workbench.js`
- `public/google-drive-workbench.js`

## Route Ownership

The Express web host serves the React bundle for:

- `/`
- `/auth/login`
- `/auth/register`
- `/dashboard`
- `/areas`
- `/operations`
- `/people-agents`
- `/workforce`
- `/account/settings`
- `/workspace/settings`
- `/react-dashboard`

Active private route behavior:

- `/areas?area=00-ogolny&view=overview`: canonical `00 General` dashboard.
- `/areas?area=00-ogolny&view=product-map`: owner-facing product map.
- `/areas?area=<department>&view=<view>`: canonical surface for department
  workbenches `01`-`12`; accepted keys and default views live in
  `web/src/app-route-registry.ts`.
- `/dashboard`, `/react-dashboard`, and bare `/areas`: compatibility entries
  that normalize to the `00 General` dashboard.
- `/operations`: compatibility entry that normalizes to `04 Operations`.
- `/people-agents` and `/workforce`: compatibility entries that normalize to
  `06 People / Agents`.
- `/account/settings` and `/workspace/settings`: lightweight authenticated
  settings surfaces for account/workspace context.

Old private web paths are no longer served as React app routes. If a future
screen needs one of those addresses, it must be reintroduced through a scoped
task contract and route-registry update.

API hosts still use the existing JSON API behavior. Protected backend contracts
remain under `/v1/*` and root protected compatibility routes.

## Implementation Rules

- New web UI must be implemented in `web/src/` using React, Tailwind, DaisyUI,
  and existing shared CompanyCore primitives.
- Do not reintroduce page-local vanilla JavaScript for product routes.
- Shared data fetching, auth redirect behavior, and route primitives should
  live in React helpers or route-kit modules, not global browser scripts.
- Add new authenticated views through `web/src/app-route-registry.ts` first,
  then bind the route component in `web/src/main.tsx`. Do this only from an
  accepted department-system task contract.
- Shared shell navigation must be derived from the route registry so desktop
  and mobile route chrome stay consistent.
- React views must consume existing backend endpoints. UI may simplify a
  workflow during migration, but it must not fake backend state.
- Deep workflows that were previously only vanilla must be rebuilt as React
  slices against the existing backend contracts.

## Current React Coverage

The current active React coverage is:

- public home, owner login, and owner registration;
- `00 General` post-login dashboard and owner-facing product map;
- department workbenches for `01 Strategy` through `12 Management`;
- account settings and workspace settings.

No old private vanilla workbench remains in the active `web/src` bundle.

These views consume existing backend contracts where applicable. The removed
web views are not deleted from backend architecture; they are simply not active
as user-facing screens until rebuilt as department-specific management systems.

## Area Detail Routing

The active area-first surface uses `/areas?area=:areaKey&view=:viewKey` for
the approved management systems. These department keys are active in web:

- `00-ogolny`
- `01-strategia`
- `02-produkt`
- `03-sprzedaz`
- `04-operacje`
- `05-relacje`
- `06-kadry`
- `07-finanse`
- `08-zasoby`
- `09-technologia`
- `10-prawo`
- `11-innowacje`
- `12-zarzadzanie`

## Known Follow-Up

Deeper settings, generic data editing, pipeline, Company OS cockpit, MCP
catalog, and provider-specific connector workbenches remain future rebuild
candidates where their capabilities are not already represented by a current
department view. Reintroduce them only through a department-specific management
system or explicit admin/settings task contract.
