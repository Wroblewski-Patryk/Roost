# Task

## Header
- ID: LUC-1861
- Title: [Roost][Brand] Replace all logo occurrences with the canonical Roost mark
- Task Type: fix
- Current Stage: verification
- Status: REVIEW
- Owner: Frontend Builder
- Depends on: owner-supplied `roost-logo.svg` attachment
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: WEB-SIDEBAR-001
- Requirement Rows: REQ-PUBLIC-HOME-ROOST-001
- Quality Scenario Rows: not applicable
- Risk Rows: RISK-PUBLIC-HOME-ROOST-001
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: LUC-1861-logo-replacement
- Mission Status: VERIFIED

## Goal
Replace frontend placeholder/logo variants with the canonical Roost SVG mark, keep the existing UI structure intact, and leave build plus screenshot evidence.

## Scope
- `web/src/components/roost-logo-mark.tsx`
- `web/src/assets/roost-logo.svg`
- `web/public/roost-logo.svg`
- `web/src/features/public/public-home.tsx`
- `web/src/layout/public-layout.tsx`
- `web/src/layout/shell.tsx`
- `web/src/components/cc-route-loading.tsx`
- `web/index.html`
- `docs/ux/evidence/luc-1861-public-home-desktop.png`
- `docs/ux/evidence/luc-1861-public-home-mobile.png`
- source-of-truth state files updated in this task

## Context
The board attached the canonical `roost-logo.svg` and required a full inventory before implementation, local build/test proof, and desktop/mobile screenshots without push or deploy.

## Inventory
- Public homepage hero used a local `RoostGlyph` placeholder in `web/src/features/public/public-home.tsx`.
- Public header/footer used a separate local `LogoMark` placeholder in `web/src/layout/public-layout.tsx`.
- Authenticated shell desktop/mobile sidebar headers used `R` tile placeholders in `web/src/layout/shell.tsx`.
- Shared route loader used `R` tile placeholders and a `CompanyCore` loading label in `web/src/components/cc-route-loading.tsx`.
- `web/index.html` had no favicon pointing at the canonical Roost mark.
- No existing frontend source file already consumed an owner-supplied Roost SVG asset.

## Implementation Plan
1. Add one shared React component for the canonical Roost mark and store the canonical SVG in source plus Vite public assets.
2. Replace all real web placeholder/logo occurrences with the shared component.
3. Wire the favicon to the same canonical asset.
4. Run build and browser proof, save screenshots, and update project memory/state.

## Execution
- Added shared `RoostLogoMark` component backed by the canonical owner SVG.
- Replaced the public hero glyph, public header/footer marks, authenticated shell desktop/mobile marks, and route-loading placeholders.
- Swapped the route-loading brand label from hardcoded `CompanyCore` to localized app name.
- Added favicon reference in `web/index.html`.

## Verification
- `npm run build:web` PASS
- `npm run build:server` PASS
- Playwright proof on local server `http://127.0.0.1:3102/`
- Desktop `1440x1100`: screenshot saved to `docs/ux/evidence/luc-1861-public-home-desktop.png`, title `Roost | LuckySparrow Operating Center`, `2` rendered `img[alt="Roost logo"]`, no console warnings/errors, no `4xx/5xx` responses.
- Mobile `390x844`: screenshot saved to `docs/ux/evidence/luc-1861-public-home-mobile.png`, title `Roost | LuckySparrow Operating Center`, `2` rendered `img[alt="Roost logo"]`, no console warnings/errors, no `4xx/5xx` responses.

## Acceptance Criteria
- [x] Canonical owner-supplied Roost SVG is the shared mark used by the public web brand surfaces and authenticated shell placeholders.
- [x] Public desktop/mobile proof exists with the new mark rendered and no browser/runtime errors.
- [x] Frontend build completes after the replacement without introducing a parallel logo system.

## Result Report
- Outcome: verified locally, ready for review
- Residual risk: production still needs separate deploy smoke; this task did not push or deploy
- Deployment impact: none in this lane
