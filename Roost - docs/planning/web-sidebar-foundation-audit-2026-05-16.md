# Web Sidebar Foundation Audit - 2026-05-16

## Goal

Create the durable web navigation foundation for future department management
systems without reintroducing old v0 workbench clutter.

## Implemented Shape

- Sidebar starts with the CompanyCore logo and product name.
- Sidebar includes a company/workspace selector surface. It currently exposes
  the signed-in owner workspace placeholder until workspace switching is wired
  to a backend read contract.
- Sidebar lists all `00`-`12` departments as the company operating model.
- Departments without an implemented management system are disabled and not
  rendered as links.
- Implemented departments route to their module dashboard/main view when the
  department row is clicked.
- Implemented departments with multiple planned views expose a separate arrow
  button for expanding the view list.
- Only `00 General`, `04 Operations`, and `08 Assets` are expandable now.
- Planned subviews are visible as disabled items so future work can attach real
  routes without inventing a second navigation model.
- The mobile header keeps a compact active-module shortcut list only.

## Department View Direction

| Department | Current Web State | Sidebar Behavior | Future View Examples |
| --- | --- | --- | --- |
| `00 General` | Implemented | Row opens dashboard; arrow expands views. | Company dashboard, routing proposals, department map. |
| `04 Operations` | Implemented | Row opens dashboard; arrow expands views. | Operations dashboard, tasks, pipelines, workload. |
| `08 Assets` | Implemented | Row opens dashboard; arrow expands views. | Assets dashboard, files and folders, knowledge base, knowledge graph. |
| `05 Relationships` | Planned | Disabled. | Clients, subcontractor companies, partners, relation graph, review queue. |
| Other departments | Planned | Disabled. | Department-specific dashboards and views from their future management-system contracts. |

## Verification

| Check | Evidence | Result |
| --- | --- | --- |
| Build | `npm run build:web` | Pass |
| Browser plugin | Attempted in-app Browser smoke; no active Browser pane was available, so Playwright fallback was used. | Fallback used |
| Desktop render | Playwright on `http://127.0.0.1:3237/areas?area=00-ogolny&view=overview` verified logo, workspace selector, all 13 departments, 3 expand buttons, disabled `05 Relationships`, Operations subview expansion, and click-through to `04 Operations`. | Pass |
| Responsive | Playwright checked desktop `1366x900` and mobile `390x844` for no horizontal overflow. | Pass |
| Cleanup | Temporary server on port `3237` was stopped and no validation-owned `chrome-headless-shell` process remained. | Pass |

## Result

The web sidebar is now ready as the base navigation pattern for future
department management systems. Future department implementations should add
their dashboard and module views through `core-area-data.ts`, the route
registry, shared Tailwind/DaisyUI components, and a scoped task contract.
