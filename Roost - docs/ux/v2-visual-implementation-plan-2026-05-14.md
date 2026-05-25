# V2 Visual Implementation Plan

Date: 2026-05-14
Status: canonical plan approved for future implementation slices

## Purpose

This plan turns the verified pre-V2 foundation into an implementation target
for the next visual generation of CompanyCore. It does not implement Company
City yet. It defines what must be built, in what order, and how each slice must
be proven before deeper V2 work starts.

## Product Frame

V2 should make CompanyCore feel like a company operating command map:

```text
Workspace -> areas -> resources -> relationships -> blockers -> safe AI action
```

The visual metaphor is Company City, but the functional promise is operational
clarity. Every V2 surface must help the owner answer:

- What matters now?
- What is blocked or needs review?
- Where do I act next?
- Which AI/MCP access is safe for this workspace?

## Non-Goals

- Do not build the native mobile app in this lane.
- Do not add fake demo data to make the map look full.
- Do not add custom editable relationship edges before a concrete workflow
  proves the need.
- Do not add gamification points, badges, levels, or rewards before the
  underlying evidence signals are real.
- Do not replace dense workbenches with decorative map views.

## Canonical Layout

### Desktop

| Zone | Role | Required Behavior |
| --- | --- | --- |
| Left company rail | Persistent orientation | Workspace selector, active area, command/map entry, workbenches, integrations, agents, workspace controls. |
| Top command bar | Fast intent capture | Command search, create/action menu, attention indicator, account/safety actions. |
| Main map/workbench | Route-owned content | Dashboard uses Company City canvas; workbenches use dense table/list/detail patterns. |
| Right command brief | Owner decision panel | Priority action, blockers, relationship review, integration readiness, agent readiness. |
| Status strip | Confidence layer | Health, sync, environment, active integrations, MCP readiness, last updated. |

Desktop first viewport must show the active workspace, at least one current
priority, and the next action without scrolling.

### Tablet

| Zone | Role | Required Behavior |
| --- | --- | --- |
| Compact rail | Orientation | Icon plus active label; full labels only when width allows. |
| Main content | Split context | Map/workbench plus selected district or command brief in landscape; stacked in portrait. |
| Action brief | Touch-friendly decisions | One priority, blockers, and local action buttons near the top. |

Tablet is not a scaled desktop. It must keep the map and action context visible
without forcing all sidebar labels into the viewport.

### Mobile Web

| Zone | Role | Required Behavior |
| --- | --- | --- |
| Topbar | Immediate context | Menu, active workspace or module, one safety/account action. |
| Command brief | First decision | One priority, blockers, and one primary action before broad stats. |
| Area card/map preview | Orientation | Selected district card, carousel, or simplified map preview; never tiny full-map labels. |
| Workbench stack | Action surface | Filters and selected context first; long tables only when contained and intentional. |
| Drawer/bottom nav | Navigation | Full IA in drawer; optional bottom nav for Map, Brief, Data, Tasks, Settings. |

Mobile must be useful for status checks and urgent owner actions even before
the future native mobile app exists.

## Company City Dashboard

The dashboard becomes the first canonical proof of V2.

Required first-viewport composition:

| Element | Purpose | Data Source |
| --- | --- | --- |
| City canvas | Spatial map of operating areas and readiness | operating areas, area inventory, relationship graph, integration readiness |
| Command brief | Current owner decision | tasks, approvals, stage runs, relationship review, integration health |
| Value journey | Work movement and operating pressure | pipelines, tasks, Company OS runs, approvals |
| Agent readiness | Safe AI handoff state | MCP manifest, API key profiles, scoped key count, bridge guard metadata |
| Status strip | Confidence and freshness | health, sync status, environment, last update |

The city canvas should show real states only:

- ready;
- attention;
- blocked;
- syncing;
- needs review;
- unsupported;
- empty accepted.

No district should appear healthy because of decorative color alone. Every
readiness state must have a source and hover/detail explanation.

## Component Contract

| Component | Responsibility | States |
| --- | --- | --- |
| `CompanyShell` | Shared authenticated chrome across private routes. | loading, ready, degraded, signed out, error |
| `CompanyRail` | Workspace, area, workbench, integration, and agent navigation. | expanded, compact, drawer, active, disabled, badge |
| `CommandBar` | Search, create, attention, and account controls. | idle, searching, no results, error |
| `CommandBrief` | Priority action and blockers. | empty, ready, blocked, success, error |
| `StatusStrip` | Health, sync, integration, MCP, and freshness confidence. | ready, attention, degraded, offline |
| `CityCanvas` | Area map and readiness visualization. | loading, empty, ready, needs review, blocked |
| `AreaReadinessCard` | District-level evidence summary. | ready, attention, blocked, unsupported, empty accepted |
| `AgentReadinessPanel` | MCP key/tool/readiness context. | no keys, ready, high risk, missing scope, guarded |

Shared patterns should reuse the existing readiness-card and scoped-key-preview
logic instead of inventing separate state rules.

## State Model

| State | UX Requirement |
| --- | --- |
| Loading | Show calm skeletons or section-local loading; keep workspace context visible when already known. |
| Empty | Explain what is empty and whether that is accepted, deferred, or actionable. |
| Error | Use user-language recovery copy; do not expose raw provider/backend errors. |
| Success | Keep feedback local to the action and update the related readiness signal. |
| Blocked | Explain blocker, owner action, and whether AI may proceed. |
| Needs review | Show source, confidence, and the safest next review action. |

## Visual Asset Strategy

WEBFOUND-014 does not require final assets, but implementation should not rely
on generic gradients or decorative placeholders.

Future implementation should use one of:

- code-native map primitives for districts, connectors, and status overlays;
- generated bitmap concept art as a reference or background only when it
  clarifies the actual company map;
- real provider/app icons where integrations are represented;
- no decorative imagery inside dense workbenches.

If a generated bitmap concept is used, it must become a visual reference for
layout and mood, not the only source of product truth.

## Route Migration Order

| Order | Slice | Goal | Proof |
| --- | --- | --- | --- |
| 1 | Shared shell contract | Define and implement `CompanyShell`, rail, command bar, brief slot, and status strip around one route. | Desktop/tablet/mobile screenshots, keyboard focus, no overflow. |
| 2 | Dashboard Company City proof | Replace dashboard first viewport with city canvas plus command brief using real readiness signals. | Real signed-in smoke, screenshots, no fake data, no raw errors. |
| 3 | Settings integration/API alignment | Bring integration readiness, API key preview, and agent tools into the shell model. | Existing WEBFOUND-009/010/011 journeys still pass. |
| 4 | Relationship workbench alignment | Preserve graph confidence while adding shell context and selected area links. | Relationship graph markers, filters, and assignment actions still pass. |
| 5 | Company OS cockpit alignment | Keep command panels dense while adding shell command brief and status context. | Existing Company OS command/recovery proofs remain green. |
| 6 | Gamification primitives | Add only evidence-backed progress/readiness signals. | No vanity points; every signal maps to real status/evidence. |

## Implementation Guardrails

- Start with one shell/dashboard slice, not every route at once.
- Keep route-level workbenches operational and dense.
- Preserve MCP and security language from WEBFOUND-010 through WEBFOUND-012.
- Treat visual parity screenshots as proof artifacts, not optional decoration.
- Run browser checks for desktop, tablet, and mobile after each visual slice.
- Record approved reusable patterns in `docs/ux/design-memory.md`.

## Validation Plan

Every implementation slice from this plan must include:

- `npm run build`;
- relevant backend/API tests when data contracts change;
- signed-in browser smoke from the real entry route;
- desktop, tablet, and mobile screenshots;
- no horizontal overflow;
- no relevant console errors or failed requests;
- keyboard/focus check for new controls;
- source-of-truth updates before DONE.

## First Implementation Candidate

The first code slice after this plan should be:

```text
V2VIS-001 Shared CompanyShell And Dashboard Frame
```

Scope should be limited to the authenticated shell and dashboard first
viewport. It should not implement all workbench migrations or gamification in
the same task.
