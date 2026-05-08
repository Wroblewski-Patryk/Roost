# CompanyCore V1 UX/UI Audit

Date: 2026-05-08
Reviewer: Codex
Scope: owner console usability, public/auth entry, dashboard command center,
navigation, module workbenches, integration setup, responsive behavior, state
design, accessibility, and implementation planning.

## Executive Summary

CompanyCore v1 is usable as an owner/operator console, and the current UI has a
clear working foundation: stable app shell, grouped navigation, route-specific
context panels, typed data editors, filters, empty states, and user-language
error mapping. The biggest UX gap is not basic functionality. It is operational
focus: the interface often exposes many equal-weight panels and actions before
it makes the next best action visually unavoidable.

The current experience is strongest for a technical operator who already knows
CompanyCore. It is weaker for an owner returning after a break and asking:

- what matters right now
- what is blocked
- what should I do next
- where did my last action land

The next implementation wave should therefore improve task focus and visual
priority, not add new product scope.

## Evidence Collected

- Production browser check:
  - `https://companycore.luckysparrow.ch/`
  - `https://companycore.luckysparrow.ch/auth/login`
  - `https://companycore.luckysparrow.ch/auth/register`
- Browser evidence:
  - page title `CompanyCore`
  - non-empty DOM on public/auth routes
  - no relevant console warnings or errors on checked routes
  - desktop public entry screenshot captured
  - desktop login screenshot captured
  - mobile login and register screenshots captured at `390x844`
- Local runtime evidence:
  - Docker local runtime started on `http://localhost:3001`
  - `/health` returned `ok`
  - migrations and seed completed
  - seeded owner login API succeeded
  - `/v1/connection` returned:
    - workspace: `LuckySparrow`
    - capabilities: `52`
    - operating areas: `13`
    - operating tables: `14`
    - ClickUp configured: `false`
    - Google Drive configured: `false`
    - tasks: `0`
- Browser limitation:
  - authenticated browser clickthrough could not be completed because Browser
    automation failed when typing into `input[type=email]`; direct
    `javascript:` session injection was blocked by browser security policy.
  - Authenticated private screens were therefore audited through source,
    local API state, existing UX memory, and current implementation contracts.

## Current UX Strengths

### App Shell

- The sidebar groups destinations by job family: Command, Operate,
  Integrations, Workspace.
- The topbar module switcher supports quick route jumping and shares the same
  mental model as the sidebar.
- Private routes are protected and redirect unauthenticated users to sign-in.

### Context Panels

- Most important routes now have context panels that explain local readiness:
  dashboard, data, table workbench, tasks adapter, pipeline, relationships,
  operating areas, integrations, ClickUp, Drive, account, and API.
- This is a strong reusable pattern and should be preserved.

### Workbench Foundation

- Data workbenches separate index, filters, record list, inspector, and typed
  editor surfaces.
- Typed editors exist for Notes, Projects, Clients, Task Lists, and Tasks.
- Empty states are more actionable than generic placeholders.

### Safety And Recovery

- Owner actions avoid exposing raw provider/backend errors in the main UI.
- API/service-key work has copy-once handling and scoped-key messaging.
- Destructive area and key actions require confirmation.

## Main UX Problems

### P0: First Private View Needs Stronger Command Focus

Problem: The dashboard has the right ingredients, but too many areas compete:
operational cockpit, attention list, readiness cards, module launch grid, data
counters, and a large next-action panel. On a real owner return visit, the
interface can feel like a status directory instead of a command surface.

User impact: The owner may understand that many systems exist, but still hesitate
on the next click.

Evidence:
- Dashboard source includes a ranked priority and attention queue, but the later
module launch and next-action areas expose many equal-weight actions.
- Local seed state has no ClickUp, no Drive, no tasks, and 13 areas/14 tables;
  this is exactly the state where the dashboard should strongly push setup and
  explain why.

Recommended fix:
- Make the dashboard first viewport a tighter decision surface:
  - one dominant current-priority action
  - one secondary action
  - compact blockers
  - one short evidence strip
- Move the large module launch grid below the first screen or collapse it into a
  secondary "Explore modules" area.
- Reduce the `Next action` panel from many buttons to a ranked list of 2 to 3
  actions.

### P0: Mobile Auth Puts Explanation Before Action

Problem: On mobile, the onboarding context card appears before the sign-in or
registration form. The form is pushed below the first viewport.

User impact: A returning owner who wants to sign in must scroll past marketing
or explanatory copy before reaching the main action.

Evidence:
- Mobile login screenshot at `390x844` shows the context card first, then the
  sign-in form below.
- Mobile register screenshot shows the same pattern, with only the top of the
  create-account form visible.

Recommended fix:
- On mobile auth routes, place the form before the context card.
- Keep context available below as reassurance, not as the primary obstacle.
- Make the primary submit button visible in the first or near-first viewport.

### P1: Public Entry Feels Sparse And Static

Problem: The public entry is clean and readable, but the first viewport has a
large amount of empty space and only static readiness language.

User impact: The product promise is understandable, but the interface does not
yet feel like a live operations bridge.

Evidence:
- Desktop public screenshot shows one large card and a lot of empty lower
  viewport.
- Copy says "Web UI ready" and "No Lists loaded yet" without showing a more
  useful state preview or next-step framing.

Recommended fix:
- Add a compact product-state preview below the hero actions:
  - workspace boundary
  - integrations
  - data workbench
  - agent API
- Keep it app-like, not marketing-heavy.
- Avoid adding a landing page; preserve the route as an entry into the app.

### P1: Dense Workbenches Need Better Scan Hierarchy

Problem: Workbench rows, context panels, stats, filters, inspectors, and cards
share similar border/radius/weight. The system is consistent, but repeated
equal-weight panels can slow scanning.

User impact: Operators may need to read more than necessary to distinguish
overview, filter, item, selected detail, and action zones.

Evidence:
- CSS uses the same surface treatment for many roles: `panel`, context cards,
  summary cards, workbench rows, compact rows, empty states, filters.
- Data and relationship screens have several stacked bordered areas.

Recommended fix:
- Define visual roles:
  - command surface
  - filter surface
  - list row
  - selected detail
  - feedback/result
- Reduce shadows on repeated rows.
- Use stronger selected-row and selected-section states.
- Keep filters quieter than the primary content.

### P1: Feedback Is Good But Too Global For Some Actions

Problem: The global action feedback panel is accessible and useful, but several
form-heavy flows still need local field/action feedback.

User impact: After setup or editor actions, users may need to look away from the
control they just used to understand success or recovery.

Evidence:
- `#resultPanel` is global and placed after all route sections.
- Some local patterns exist, but the main feedback contract still centers on
  `showResult`.

Recommended fix:
- Keep the global panel for cross-route outcomes.
- Add local inline status slots for:
  - auth form errors
  - ClickUp token/workspace/list actions
  - Drive OAuth/folder/import steps
  - typed record editor save/archive actions
  - API key create/copy/rotate/deactivate actions

### P1: Mobile Private Navigation Needs A Full Pass

Problem: The mobile shell has a menu button and off-canvas sidebar, but the
private authenticated flow has not been re-audited end-to-end in this pass due
the Browser input limitation.

User impact: There may be hidden issues in table workbenches, filters, wide
tables, action panels, and inspector layouts on phone/tablet.

Evidence:
- CSS collapses many layouts at `860px` and `460px`.
- Tables rely on horizontal scroll via `.table-wrap`.
- Several route panels have large controls and many actions that become full
  width at small screens.

Recommended fix:
- Run a dedicated authenticated screenshot pass after the Browser input issue is
  bypassed through an approved method or a repo Playwright workflow.
- Check `/dashboard`, `/data`, `/data/tasks`, `/areas`, `/relationships`,
  `/settings/drive`, and `/settings/api` at desktop, tablet, and mobile.

### P2: Visual Direction Is Consistent But Conservative

Problem: The console is intentionally restrained, but it risks feeling generic:
white panels, pale blue surfaces, many pills, and repeated cards.

User impact: The product feels trustworthy but not yet distinctive.

Evidence:
- Dominant palette is light gray/white/blue.
- Most routes reuse similar panel and pill anatomy.

Recommended fix:
- Add restrained product character through:
  - stronger command-center typography
  - clearer status severity treatments
  - compact information density where work is repetitive
  - fewer decorative pills when they repeat known metadata
- Do not add decorative gradients, orb backgrounds, or marketing visuals.

## UI Scorecard

Scores are from `1` to `5`.

| Category | Score | Notes |
| --- | ---: | --- |
| Clarity | 3.5 | Routes are understandable, but the strongest next action is not always dominant. |
| Hierarchy | 3.0 | Too many panels share equal visual weight. |
| Usefulness | 4.0 | The console exposes real operational surfaces and typed editors. |
| Visual Direction | 3.2 | Consistent and restrained, but generic and panel-heavy. |
| Delight | 2.8 | Useful, but not yet notably pleasant or memorable. |
| Responsive Quality | 3.0 | Mobile auth is usable but action order is wrong; private mobile needs full pass. |
| State Design | 3.7 | Empty/error/success states exist, but local feedback needs expansion. |
| Accessibility | 3.6 | Semantic labels and focus styles exist; keyboard/private flow needs audit. |
| Performance Feel | 4.0 | Static console feels lightweight; no console errors in checked public/auth routes. |

Average: `3.42`. The UI is functional and close to acceptable, but should not be
called polished until the P0/P1 UX slices are implemented and screenshot-tested.

## Implementation Plan

### Slice 1: Authenticated UX Evidence Harness

Goal: unblock real private-route screenshot QA.

Scope:
- add or document an approved local authenticated browser smoke path
- capture dashboard/private routes without production writes
- verify desktop, tablet, and mobile

Acceptance:
- authenticated screenshots exist for the priority private routes
- console errors are recorded
- interaction proof covers navigation, module switcher, one filter, one editor,
  and one setup form disabled/error state

### Slice 2: Dashboard First-Viewport Command Polish

Goal: make `/dashboard` answer the 3-second questions decisively.

Scope:
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- planning/state docs

Acceptance:
- first viewport shows one dominant next action
- blocker count and reason are visible without scrolling
- module grid is secondary, not competing with the command center
- desktop/mobile screenshots show no overlap or horizontal overflow

### Slice 3: Mobile Auth Action-First Layout

Goal: make returning owners sign in quickly on mobile.

Scope:
- `public/index.html`
- `public/styles.css`
- optional copy refinements in auth context panels

Acceptance:
- mobile login shows form before context
- mobile register shows the account creation fields before context
- desktop two-column auth layout is preserved
- form focus/required/error behavior remains intact

### Slice 4: Workbench Visual Role Cleanup

Goal: reduce equal-weight panel fatigue across dense routes.

Scope:
- shared CSS role classes for command, filter, list, selected detail, feedback
- `/data`, `/data/:table`, `/relationships`, `/areas`, `/settings/api`

Acceptance:
- filters are visually quieter than lists/details
- selected rows/details are stronger
- repeated rows use less shadow and clearer hover/focus
- no new one-off page-local component family is introduced

### Slice 5: Local Feedback Placement

Goal: keep action outcomes close to where users acted.

Scope:
- local status slots for auth, provider setup, Drive import, typed editors, and
  API key lifecycle
- preserve global result panel for cross-route outcomes

Acceptance:
- errors and success states are visible near the triggering control
- global panel no longer carries every local form outcome
- technical/provider errors remain translated through `friendlyError`

## Recommended Queue

1. `UXA-002 Authenticated Private Route UX Evidence Harness`
2. `UXA-003 Dashboard First-Viewport Command Polish`
3. `UXA-004 Mobile Auth Action-First Layout`
4. `UXA-005 Workbench Visual Role Cleanup`
5. `UXA-006 Local Action Feedback Placement`

## Constraints

- Do not add new product scope.
- Do not create a new design system from scratch.
- Reuse existing context panels, workbench rows, empty states, and command
  layout patterns.
- Keep docs in English.
- Do not create production test accounts for UX evidence unless explicitly
  approved.
- Do not bypass Browser security policy; use an approved local smoke or
  Playwright path for authenticated screenshots.

## Open Risks

- Authenticated private screenshots are still needed before detailed visual
  implementation on private routes.
- Real production owner state may differ from local seed state.
- Google Drive first import remains externally blocked, so Drive success states
  cannot yet be validated with real provider content.
