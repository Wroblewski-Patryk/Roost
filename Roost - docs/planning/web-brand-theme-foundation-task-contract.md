# WEB-THEME-001 Brand Theme Foundation Task Contract

Task Type: UX/UI foundation  
Current Stage: verification  
Deliverable For This Stage: reusable CompanyCore web brand tokens, typography,
and source-of-truth documentation.

## Goal

Define the visible CompanyCore web brand foundation in the active
Tailwind/DaisyUI layer so current and future department screens can reuse the
same colors, typography, spacing, radius, focus, and outline-first component
feel.

## Scope

- `web/index.html`
- `web/src/styles.css`
- `docs/ux/design-system-contract.md`
- `docs/ux/design-memory.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/module-confidence-ledger.md`
- `.codex/context/TASK_BOARD.md`

Out of scope:

- New route behavior.
- New backend tables, APIs, migrations, or MCP tools.
- Adding a second icon family before a concrete missing-icon gap exists.
- Rebuilding individual department screens beyond global theme inheritance.

## Implementation Plan

1. Audit the existing web theme, font loading, DaisyUI setup, and global CSS
   primitives.
2. Add brand typography and tokenized palette, radius, spacing, shadow, focus,
   and reusable utility classes to the global Tailwind/DaisyUI theme.
3. Keep Phosphor Icons as the primary icon system and document when a second
   icon family would be acceptable.
4. Update UX source-of-truth docs and project state ledgers.
5. Run the frontend build and diff hygiene checks.

## Acceptance Criteria

- The `companycore` DaisyUI theme contains a clear base/action/accent/semantic
  palette.
- Tailwind theme tokens expose reusable fonts, colors, radius, spacing, and
  shadow values.
- Global DaisyUI button, form, badge, menu, tab, card, focus, and panel
  behavior inherits the CompanyCore visual direction.
- Body and heading fonts are defined and loaded with safe fallbacks.
- UX docs record the approved theme direction and icon-family policy.
- Validation proves the web build still succeeds.

## Definition of Done

- Code and docs are updated in the scoped files only.
- `npm run build:web` passes.
- `git diff --check` passes.
- Source-of-truth docs/state files mention the new brand theme foundation.
- No browser, dev-server, or validation process is left running.

## Result Report

Completed on 2026-05-17.

Implemented:

- Added Inter body typography and Sora heading typography to the web entry.
- Expanded the DaisyUI `companycore` theme and Tailwind `@theme` tokens for
  base surfaces, primary/accent/semantic colors, radius, spacing, shadows, and
  focus.
- Tuned global DaisyUI primitives for buttons, forms, badges, menu items, tabs,
  cards, and visible focus.
- Added reusable `cc-panel`, `cc-panel-flat`, `cc-surface-subtle`, `cc-label`,
  and `cc-icon-frame` utilities for future department screens.
- Documented the brand theme and icon policy in UX source-of-truth files.

Validation:

- `npm run build:web` passed.
- `git diff --check` passed with line-ending warnings only.
- Playwright Vite render proof passed on the public home/auth screen with
  Inter body font, Sora heading font, `9px` button radius, no horizontal
  overflow, and no console/page errors.
- Evidence screenshot:
  `docs/ux/evidence/web-theme-001-public-home-desktop.png`.

Residual risk:

- Vite reports that `/vendor/phosphor/bold/style.css` is not available at Vite
  build time because the stylesheet is served from root `public/vendor` by the
  backend runtime. The file exists at `public/vendor/phosphor/bold/style.css`;
  no runtime icon-system change was made in this task.
