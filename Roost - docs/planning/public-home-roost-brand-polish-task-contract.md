# PUBLIC-HOME-ROOST-001 Public Home Roost Brand Polish Task Contract

Task Type: design  
Current Stage: verification  
Deliverable For This Stage: polished public homepage, footer/navigation
cleanup, and durable Roost brand book.

## Goal

Improve the public Roost homepage so the first visit communicates a premium
operational center instead of a long department-card list, while preserving the
existing auth entry points and Roost theme direction.

## Scope

- `web/src/features/public/public-home.tsx`
- `web/src/layout/public-layout.tsx`
- `web/src/i18n/messages.ts`
- `docs/ux/roost-brand-book.md`
- `docs/ux/design-system-contract.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`

Out of scope:

- final logo SVG replacement
- backend/API/schema changes
- authenticated department view changes
- production provider or database changes

## Implementation Plan

1. Inspect the existing public layout, home route, i18n messages, Roost tokens,
   and UX source-of-truth docs.
2. Replace the department-card hero with a focused command-center hero and
   topology preview that uses existing Roost theme tokens.
3. Remove the separate `Home` nav button because the logo links to `/`.
4. Move the language selector to the public footer and add the LuckySparrow
   attribution with a theme-colored heart symbol.
5. Record the supplied Roost brand system as a reusable brand book.
6. Validate the web build and rendered desktop/mobile public route.

## Acceptance Criteria

- Public nav no longer contains a separate `Home` button.
- Public logo/wordmark remains linked to `/`.
- Language selector appears in the public footer.
- Footer attribution reads as `Made with [theme-colored symbol] by
  luckysparrow.ch`.
- Hero no longer renders the long department-card list.
- Hero uses a refined Roost command-center/topology treatment.
- Brand book records the supplied written direction plus reference-image
  details.
- `npm run build:web` passes.
- Rendered desktop and mobile public homepage proof has no console errors or
  horizontal overflow.

## Definition of Done

- Code builds without errors.
- Public homepage works after reload on `/`.
- No mock service or backend placeholder is introduced.
- UX source-of-truth documentation is updated.
- `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked before
  completion.
- Validation evidence is recorded in this task or state files.

## Result Report

Completed on 2026-05-24.

Implemented:

- Replaced the public-home department-card hero with a Roost command-center
  hero and responsive topology preview.
- Removed the separate `Home` navigation button; the Roost wordmark remains
  linked to `/`.
- Moved the language selector from the header to the footer.
- Added the footer attribution: `Made with` plus a theme-colored heart symbol
  and `luckysparrow.ch`.
- Added `docs/ux/roost-brand-book.md` with the supplied brand system and
  reference-image facts.
- Follow-up visual parity pass after owner feedback: replaced the remaining
  light public frame with a dark Roost cockpit header/footer, centered concept
  nav, large `ROOST` wordmark hero, orbit topology, right status rail, and
  three-module feature strip matching the approved generated concept more
  closely.

Validation:

- `npm run build:web` passed.
- `npm run build:server` passed.
- `npm run validate` passed, including architecture evidence and route
  capability gates.
- `git diff --check` passed with line-ending warnings only.
- Playwright fallback on the real Express route `http://127.0.0.1:3240/`
  verified desktop `1440x1000` and mobile `390x844`: no console warnings,
  no page errors, no horizontal overflow, no `Home` nav item, no language
  selector in the header, language selector present in the footer, and zero
  old department-list cards in the hero.
- Production deployment smoke passed after pushing commit
  `0bf78784a0806873ce5531223185769b40b1b433`: public API health reported that
  commit, `https://roost.luckysparrow.ch/` returned `200`, and Playwright
  production proof found the new hero, no `Home` nav item, footer language
  selector, zero old department-list cards, no console warnings/errors, and no
  horizontal overflow.
- Evidence screenshots:
  `docs/ux/evidence/public-home-roost-desktop.png` and
  `docs/ux/evidence/public-home-roost-mobile.png`.
- Follow-up local proof on `http://127.0.0.1:3241/` after the concept-match
  pass verified desktop `1440x1100` and mobile `390x900`: no console errors,
  no horizontal overflow, no separate `Home` nav item, language selector in the
  footer, `luckysparrow.ch` footer link present, and the orbit node set includes
  people, agents, processes, assets, tasks, and knowledge.
- Follow-up production smoke passed after pushing commit
  `af049dac14956dd0849b48d2ee5af951af2407a1`: public API health reported the
  deployed commit, `https://roost.luckysparrow.ch/` rendered the concept-match
  homepage, and Playwright production proof found no separate `Home` nav item,
  footer language selector present, `luckysparrow.ch` footer link present, no
  old department-list cards, no failed requests, no console errors, and no
  horizontal overflow on desktop or mobile.

Residual risk:

- The final logo SVG is still pending from the owner, so the public UI uses a
  restrained placeholder mark aligned to the Roost direction.
- No production smoke gap remains for the public homepage; deeper authenticated
  journeys are outside this public-home task.
