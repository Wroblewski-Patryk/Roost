# WEB-SHELL-DENSITY-001 Sidebar, Mobile Header, Drawer, And Footer Polish Task Contract

## Header
- ID: WEB-SHELL-DENSITY-001
- Title: Authenticated shell sidebar density, mobile navigation, and footer polish
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: WEB-SHELL-RESP-001, React layout foundation
- Operation Mode: BUILDER
- Mission Status: VERIFIED

## Goal
Improve the authenticated layout sidebar, mobile header/drawer, and footer
without changing navigation content, route contracts, APIs, or information
architecture.

## Scope
- `web/src/layout/shell.tsx`
- Authenticated shell desktop sidebar, mobile header current-context control,
  mobile drawer inherited sidebar rows, workspace selector presentation, and
  layout footer presentation.

## Implementation Plan
1. Inspect existing shell and Roost design-system contracts.
2. Reduce sidebar row height and visual weight while preserving labels,
   subviews, active state, disabled state, and expand/collapse behavior.
3. Replace the mobile horizontal quick strip with a true current-context
   control that opens the full department drawer.
4. Polish the mobile drawer so it presents brand, active area/view, workspace,
   settings, and full department navigation in a single hierarchy.
5. Polish the footer as a quiet layout band using existing Roost/DaisyUI
   tokens.
6. Verify build, route/capability gates, rendered desktop/mobile behavior, and
   diff hygiene.

## Acceptance Criteria
- [x] The sidebar contains the same departments and child views as before.
- [x] The active People/Agents department plus its child views fits more
      comfortably in the desktop rail.
- [x] Mobile no longer shows a partial horizontal quick strip as fake global
      navigation.
- [x] Mobile header shows the current department/view and opens the full
      department drawer.
- [x] The footer is visually integrated with the Roost layout and keeps the
      existing attribution and language selector.
- [x] Desktop and mobile render without page-level horizontal overflow or
      console errors in the checked flow.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference:
  `C:/Users/wrobl/Downloads/screencapture-companycore-luckysparrow-ch-areas-2026-05-19-17_46_25.png`
- Canonical visual target: Roost authenticated shell direction in
  `docs/ux/design-system-contract.md` and `docs/ux/design-memory.md`
- Fidelity target: structurally_faithful
- Existing shared pattern reused: Responsive Department Shell, Roost Brand
  Operating Center
- New shared pattern introduced: no
- Surface strategy checked: desktop, mobile
- Accessibility checks: preserved nav labels, aria-expanded, aria-labels,
  disabled semantics, visible text labels, and keyboard-focusable links/buttons
- State checks: active, inactive, disabled, expanded child views, mobile drawer
  open, mobile drawer closed

## Validation Evidence
- Tests:
  - `npm run build:web` passed.
  - `npm run validate` passed, including route/capability drift check over 171
    manifest routes and 32 route files, server build, and web build.
  - `git diff --check` passed.
- Manual checks:
  - Browser plugin was attempted first, but the in-app Browser evaluation
    surface did not expose `sessionStorage`, which blocked signed-in private
    route setup for this local proof.
  - Playwright fallback opened
    `http://127.0.0.1:3348/areas?area=06-kadry&view=directory` with a local
    Express static shell and mocked auth/workforce packets for visual layout
    proof only.
  - Desktop `1920x1128`: sidebar, active People/Agents row, child views, and
    footer rendered; page-level horizontal overflow was false; console warnings
    and errors were empty.
  - Mobile `390x844`: topbar, quick department strip, shell content, and
    footer route rendered; page-level horizontal overflow was false; console
    warnings and errors were empty.
  - Follow-up mobile `390x844`: horizontal quick strip removed, current
    People/Agents/Directory context control rendered, full drawer opened from
    the context control, drawer showed brand, active area/view, workspace,
    workspace settings, and full department navigation; page-level horizontal
    overflow was false; console warnings and errors were empty.
  - Follow-up desktop `1440x960`: persistent sidebar remained visible, mobile
    context control stayed hidden, footer remained in DOM, and page-level
    horizontal overflow was false.
- Screenshots/logs:
  - `C:/Users/wrobl/AppData/Local/Temp/companycore-shell-proof/shell-desktop.png`
  - `C:/Users/wrobl/AppData/Local/Temp/companycore-shell-proof/shell-mobile.png`
  - `C:/Users/wrobl/AppData/Local/Temp/companycore-mobile-shell-proof/mobile-first-viewport.png`
  - `C:/Users/wrobl/AppData/Local/Temp/companycore-mobile-shell-proof/mobile-drawer-open.png`
  - `C:/Users/wrobl/AppData/Local/Temp/companycore-mobile-shell-proof/desktop-sanity.png`
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable; this change is presentation-only
  in the existing shell.
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: route reload was used during visual proof.
- Regression check performed: build, validate, diff hygiene, rendered shell
  proof.

## Definition Of Done
- [x] Code builds without errors.
- [x] Feature works manually through the rendered shell path.
- [x] No mock, placeholder, fake, or temporary path was added to delivered
      application code.
- [x] No existing route, API, or navigation contract was changed.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Result Report
- Task summary: compacted and visually softened the authenticated sidebar,
  made child navigation denser, replaced the mobile fake quick strip with a
  current-context drawer trigger, improved the drawer hierarchy, and restyled
  the footer as a quiet Roost layout band.
- Files changed: `web/src/layout/shell.tsx`,
  `docs/planning/web-shell-sidebar-footer-polish-task-contract.md`, plus
  state/source-of-truth updates.
- How tested: `npm run build:web`, `npm run validate`, `git diff --check`,
  and desktop/mobile rendered proof.
- What is incomplete: production authenticated smoke remains a future release
  check after deploy.
- Next steps: reuse this density pattern when future departments gain more
  child views.
