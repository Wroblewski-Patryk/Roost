# Route Frame Usability Audit

Date: 2026-05-15
Scope: authenticated web layout across vanilla private routes and React
private routes, with emphasis on whether each route helps the owner manage the
company faster.

## Executive Summary

The app has valuable operational surfaces, but the route frame still creates
too much interpretation work. The owner sees a repaired vanilla command rail on
some routes, a separate React header on others, and several workbenches that
start with local page titles rather than an immediate command answer.

This audit treats the current product as a pre-V2 web/backend/MCP foundation.
Company City V3, game-like visuals, and deeper gamification remain deferred to
V2. The immediate UX priority is a coherent management shell that answers:

- what matters now;
- what is blocked or needs review;
- where the owner or agent should act next.

## Route Inventory Reviewed

| Route family | Routes | Current frame risk |
| --- | --- | --- |
| Command | `/dashboard` | Strongest shell proof, but still too much local dashboard structure after the map. |
| Data | `/data`, `/data/:table` | Useful workbenches, but route purpose and next action are too local. |
| Work | `/tasks-adapter`, `/pipeline`, `/relationships` | Good filters and data, but management priority is not consistently surfaced. |
| Integrations | `/settings`, `/settings/integrations`, `/settings/drive`, `/settings/api` | Critical setup surfaces need clearer safety and next-step framing. |
| Workspace | `/settings/account` | Useful readiness overview, but weak persistent command framing. |
| React | `/areas`, `/react-agent-tools`, `/react-company-os`, `/react-dashboard`, `/react-tasks`, `/react-integrations` | Separate header-only shell still breaks the canonical shell model. |

## 100 Route-Frame Findings And Fix Targets

| ID | Surface | Finding | Fix target |
| --- | --- | --- | --- |
| UX-001 | All private routes | The route frame does not always answer "what matters now" before local content. | Add route command strip. |
| UX-002 | All private routes | The route frame does not always answer "what is blocked or needs review". | Add blocked/review signal. |
| UX-003 | All private routes | The route frame does not always answer "where do I act next". | Add primary next action. |
| UX-004 | All private routes | Page titles duplicate shell route context on some screens. | Prefer shell/strip context over repeated local chrome. |
| UX-005 | All private routes | Topbar actions are generic rather than route-aware. | Add route-aware quick actions near the command strip. |
| UX-006 | All private routes | The owner cannot always tell whether a screen is data, work, integration, agent, or workspace scope. | Add route family labels. |
| UX-007 | All private routes | Route-local panels compete with shell hierarchy. | Use one consistent pre-content command layer. |
| UX-008 | All private routes | Mobile first viewport can start with broad summaries instead of a single priority. | Put concise route command before dense content. |
| UX-009 | All private routes | Tablet has no deliberate command/context layer. | Keep strip compact and scannable on tablet. |
| UX-010 | All private routes | Route refresh and SPA navigation can expose different frame models. | Converge vanilla and React shell behavior. |
| UX-011 | Vanilla shell | Sidebar is improved, but content routes still need a matching shell-level brief. | Add route command strip. |
| UX-012 | Vanilla shell | Command search finds destinations but does not explain route mission. | Pair with route mission copy. |
| UX-013 | Vanilla shell | Health status exists, but readiness implications are scattered. | Include route health/review cue. |
| UX-014 | Vanilla shell | Workspace context is visible, but route work context is not always visible. | Add family and route context. |
| UX-015 | Vanilla shell | Long route labels can dominate topbar on narrow desktop. | Move explanatory copy into strip and keep topbar compact. |
| UX-016 | Vanilla shell | Some routes have useful actions hidden in panels lower on the page. | Promote two quick actions. |
| UX-017 | Vanilla shell | Some route actions are named by implementation surface instead of business task. | Use management language in strip. |
| UX-018 | Vanilla shell | Critical setup routes need clearer warning/recovery framing. | Route-specific blocked text. |
| UX-019 | Vanilla shell | Non-dashboard screens feel less connected to company operating areas. | Use consistent area/workbench vocabulary. |
| UX-020 | Vanilla shell | The current shell lacks a reusable place for future command brief data. | Establish strip as shared primitive. |
| UX-021 | React shell | React private routes still use a separate header-only navigation model. | Add React company command frame. |
| UX-022 | React shell | React routes do not show a left command/workbench/integration/workspace orientation on desktop. | Add desktop rail. |
| UX-023 | React shell | React routes rely on horizontal wrapping nav. | Replace with rail + compact topbar. |
| UX-024 | React shell | React route status is too small and detached from route work. | Add status cards in the shell. |
| UX-025 | React shell | React shell lacks route family grouping. | Group links by command, workbenches, agents, workspace. |
| UX-026 | React shell | React shell does not show workspace/area counts with enough weight. | Add workspace health strip. |
| UX-027 | React shell | React route active state is weak. | Use active link styling based on path. |
| UX-028 | React shell | React mobile header can become a row of wrapped buttons. | Use compact command topbar and horizontal shortcut rail. |
| UX-029 | React shell | React tablet is treated like scaled desktop/header. | Use responsive grid shell. |
| UX-030 | React shell | React app label reads as "React ..." on user-facing surfaces. | Use product labels, not implementation labels. |
| UX-031 | `/dashboard` | Map proof exists, but later dashboard modules still read as a directory. | Keep map first and use strip for next action. |
| UX-032 | `/dashboard` | Operational cockpit and command brief can compete. | Route strip can clarify current route mission. |
| UX-033 | `/dashboard` | Module directory can pull attention from the primary company map. | Keep directory secondary. |
| UX-034 | `/dashboard` | Data counters may appear as generic stats. | Tie counters to management next actions. |
| UX-035 | `/dashboard` | Mobile dashboard needs a stronger first route cue. | Compact command strip. |
| UX-036 | `/data` | Data index can feel like a database catalog rather than a management tool. | Frame it as company data health. |
| UX-037 | `/data` | API coverage is useful but secondary. | Pair with "review records and ownership" action. |
| UX-038 | `/data` | Module groups need a visible reason to act. | Add blocked signal about unsupported/unowned data. |
| UX-039 | `/data` | Empty states need next actions. | Route strip action to API/workbench. |
| UX-040 | `/data` | Mobile data route needs orientation before filters. | Add command strip before module list. |
| UX-041 | `/data/:table` | Table workbench purpose changes by slug but shell title remains generic. | Route metadata should recognize data subroutes. |
| UX-042 | `/data/:table` | Record inspector is useful, but first action is not explicit. | Add "select or create/review records" command. |
| UX-043 | `/data/:table` | API route safety is not visible until deeper panels. | Quick link to API routes. |
| UX-044 | `/data/:table` | Users may not know whether writes are available. | Add route blocked/review cue. |
| UX-045 | `/data/:table` | Mobile inspector can be below long record list. | Keep route command concise. |
| UX-046 | `/tasks-adapter` | The route name mentions adapters, not owner outcomes. | Frame as delivery execution. |
| UX-047 | `/tasks-adapter` | Refresh and ClickUp settings are local actions only. | Promote in route quick actions. |
| UX-048 | `/tasks-adapter` | Status/source filters do not explain delivery risk. | Add blocked/review cue. |
| UX-049 | `/tasks-adapter` | Empty tasks could be interpreted as success or misconfiguration. | Route strip points to ClickUp setup. |
| UX-050 | `/tasks-adapter` | Mobile task review needs the current priority before tables. | Add route command strip. |
| UX-051 | `/pipeline` | Pipeline/CRM semantics are complex. | Frame as cross-department flow. |
| UX-052 | `/pipeline` | CRM and shared pipelines can blur. | Add route mission text. |
| UX-053 | `/pipeline` | Stage/deal/interactions need "what to inspect next". | Add quick action to data/pipeline records. |
| UX-054 | `/pipeline` | Empty pipeline needs recovery path. | Link to data workbench. |
| UX-055 | `/pipeline` | Mobile filters need route mission first. | Add compact strip. |
| UX-056 | `/relationships` | Relationship confidence is strong, but route frame should explain AI safety. | Add "before agents rely on context" text. |
| UX-057 | `/relationships` | Needs-review items should be visible at shell level. | Add blocked/review cue. |
| UX-058 | `/relationships` | Correct mapping action should be prominent. | Quick link to areas. |
| UX-059 | `/relationships` | Unsupported relationship families can feel like broken features. | Explain as review/scope boundary. |
| UX-060 | `/relationships` | Mobile relationship review should not start as a dense graph list. | Add route command first. |
| UX-061 | `/settings/integrations` | Integration readiness dashboard is important but can read as a status page. | Frame as integration health command. |
| UX-062 | `/settings/integrations` | Relationships and integrations are separate but connected. | Quick action to relationship review. |
| UX-063 | `/settings/integrations` | MCP readiness should be visible from the route frame. | Add agent action. |
| UX-064 | `/settings/integrations` | Provider gaps need next actions. | Add route blocked cue. |
| UX-065 | `/settings/integrations` | Mobile should surface one integration next step. | Add route command strip. |
| UX-066 | `/settings` | ClickUp setup route is high-risk but starts as a form/workflow. | Add safe setup framing. |
| UX-067 | `/settings` | Token/list/sync steps need clearer sequence. | Add next-action copy. |
| UX-068 | `/settings` | Errors from provider setup need owner-language recovery. | Keep route-level recovery context. |
| UX-069 | `/settings` | ClickUp route should link back to tasks and integrations. | Quick actions. |
| UX-070 | `/settings` | Mobile setup should show current step before fields. | Add route command strip. |
| UX-071 | `/settings/drive` | Drive setup has many actions and can feel overwhelming. | Add route mission and next action. |
| UX-072 | `/settings/drive` | OAuth/import/reconcile actions need clearer state framing. | Add route blocked/review cue. |
| UX-073 | `/settings/drive` | Imported files are resources, not just files. | Use area/resource language. |
| UX-074 | `/settings/drive` | Drive route should link to area mapping and relationships. | Quick actions. |
| UX-075 | `/settings/drive` | Mobile Drive setup needs priority before long forms/tables. | Add command strip. |
| UX-076 | `/settings/api` | Agent key route is powerful and needs persistent safety framing. | Route command strip emphasizes scoped access. |
| UX-077 | `/settings/api` | MCP tool exposure can be hidden below controls. | Surface MCP preview action. |
| UX-078 | `/settings/api` | Missing scope warnings need route-level context. | Add blocked/review cue. |
| UX-079 | `/settings/api` | "API routes" language can be too technical for the owner. | Use "agent access" language. |
| UX-080 | `/settings/api` | Mobile safety route needs concise framing before forms. | Add command strip. |
| UX-081 | `/settings/account` | Account readiness should feel like workspace control, not profile details. | Route mission copy. |
| UX-082 | `/settings/account` | Readiness links need a stronger next action. | Quick actions to integrations/API. |
| UX-083 | `/settings/account` | Owner/workspace distinction should be immediate. | Route strip family label. |
| UX-084 | `/settings/account` | Mobile account route should show readiness first. | Add command strip. |
| UX-085 | `/areas` | Direct refresh uses React while in-app vanilla navigation can still use vanilla `/areas`. | Route convergence must be tracked. |
| UX-086 | `/areas` | Area management is central but React shell lacks company rail. | Add React rail. |
| UX-087 | `/areas` | Area counts are useful but not framed as command evidence. | Add React shell status. |
| UX-088 | `/areas` | Mapping controls need shell-level relationship to integrations. | React rail links. |
| UX-089 | `/areas` | Mobile area workbench should not inherit horizontal React nav. | Responsive React shell. |
| UX-090 | `/react-agent-tools` | Agent tools are AI-critical but React shell is not safety-forward enough. | Add agent/safety status. |
| UX-091 | `/react-agent-tools` | Tool family grouping needs persistent route orientation. | React rail. |
| UX-092 | `/react-agent-tools` | User should know this is the same surface as scoped API access. | Link API access and MCP tools. |
| UX-093 | `/react-agent-tools` | Mobile MCP browsing needs no wrapped header buttons. | Responsive React shell. |
| UX-094 | `/react-company-os` | Company OS is powerful and dense; header-only shell weakens orientation. | React rail plus status. |
| UX-095 | `/react-company-os` | Approval/stage/automation panels need persistent safety context. | Add command shell status. |
| UX-096 | `/react-company-os` | Workflow recovery controls need route frame clarity. | Add route grouping and quick links. |
| UX-097 | `/react-company-os` | Mobile Company OS can feel like a long wall of panels. | Remove wrapped header nav. |
| UX-098 | `/react-dashboard` | React dashboard preview should not introduce a third route language. | Reuse React shell labels. |
| UX-099 | `/react-tasks` | React tasks preview should not say "React tasks" to users. | Product-label shell. |
| UX-100 | `/react-integrations` | React integrations preview should align with integration health language. | Product-label shell. |

## Repair Strategy

This task implements fixes for the repeatable shell-level findings rather than
rewriting every route body. The fixes directly cover UX-001 through UX-030 and
create a reusable command frame for route-specific improvements UX-031 through
UX-100.

| Repair | Findings covered | Implementation surface |
| --- | --- | --- |
| Vanilla route command strip | UX-001 through UX-020, UX-031 through UX-084 | `public/index.html`, `public/app.js`, `public/styles.css` |
| React command shell with rail/status | UX-021 through UX-030, UX-085 through UX-100 | `web/src/react-route-kit.tsx` |
| Responsive proof across route families | all | Playwright desktop/tablet/mobile route smoke |

## Acceptance Criteria

- The route command layer is visible after sign-in on vanilla private routes.
- The React shell no longer presents as a separate header-only product model.
- Desktop, tablet, and mobile layouts do not overflow horizontally.
- The next implementation slice can focus on route body quality rather than
  re-solving shell orientation.
