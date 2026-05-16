# WEB-QA-001 Implementation Plan

Date: 2026-05-16
Task Type: frontend foundation implementation
Current Stage: planning
Status: READY
Priority: P0

## Goal

Implement the next web-foundation quality slice before adding more department
screens. The slice must make the cleaned active web layer scalable for language
selection, translated copy, safe API errors, shared form validation, and
consistent action feedback.

Default product language remains English. Polish must be possible through the
same translation contract, without page-local copy forks.

## Source Inputs

- `docs/planning/web-foundation-quality-audit-2026-05-16.md`
- `docs/planning/web-foundation-quality-audit-task-contract.md`
- `docs/architecture/web-layer-react-ownership.md`
- `docs/ux/design-system-contract.md`
- `.agents/state/requirements-verification-matrix.md` row `REQ-WEB-QA-001`
- `.agents/state/quality-attribute-scenarios.md` row `QA-WEB-QA-001`
- `.agents/state/risk-register.md` row `RISK-WEB-QA-001`

## Current Implementation Surface

Active web files are intentionally small after cleanup:

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `web/src/components/cc-button.tsx`
- `web/src/components/cc-data-table.tsx`
- `web/src/styles.css`

This plan keeps runtime scope inside the active React web layer. Backend APIs,
database schema, and removed historical web views are out of scope.

## Implementation Slices

### Slice 1: i18n Runtime Foundation

Files to add:

- `web/src/i18n/locales.ts`
- `web/src/i18n/messages.ts`
- `web/src/i18n/i18n.tsx`

Files to update:

- `web/src/main.tsx`
- `web/src/components/cc-button.tsx`
- `web/src/components/cc-data-table.tsx`

Implementation:

1. Define supported locales: `en`, `pl`.
2. Default to `en`.
3. Persist selected locale in `localStorage` as `companycoreLocale`.
4. Sync `document.documentElement.lang` on locale change.
5. Provide a typed `t(key, params?)` function through `LanguageProvider`.
6. Add dictionaries for all active public/auth/shell/department/table/button
   strings currently visible in the active routes.
7. Add a compact `LanguageSelector` in public/auth and private shell surfaces.

Acceptance:

- English is default.
- Polish can be selected.
- Refresh preserves selected language.
- `<html lang>` changes between `en` and `pl`.
- Active route chrome and shared table/button state text come from dictionaries.

### Slice 2: Product-Safe API Error Contract

Files to add:

- `web/src/api/client.ts`
- `web/src/api/errors.ts`

Files to update:

- `web/src/main.tsx`

Implementation:

1. Move the current `api<T>()` helper out of `main.tsx`.
2. Introduce `AppApiError` with:
   - `status`;
   - `code`;
   - `requestId` when present;
   - `rawMessage` for diagnostics only.
3. Preserve existing token clearing for auth-like errors.
4. Map visible error copy through i18n keys.
5. Support known auth and common API codes:
   - `invalid_credentials`;
   - `email_already_registered`;
   - `request_failed`;
   - `forbidden`;
   - `missing_scope`;
   - `network_error`;
   - `server_error`;
   - `unknown_error`.

Acceptance:

- Raw backend codes are not primary visible UI text.
- Invalid login shows a friendly recovery message.
- Duplicate registration shows a friendly recovery message.
- Packet load failures show safe, translated error text.
- Debug detail stays available only as non-primary metadata if needed.

### Slice 3: Shared Notice And Action Feedback

Files to add:

- `web/src/components/cc-notice.tsx`
- optional `web/src/components/cc-live-region.tsx`

Files to update:

- `web/src/main.tsx`
- `web/src/components/cc-data-table.tsx`

Implementation:

1. Add `CcNotice` with DaisyUI-compatible variants:
   - `info`;
   - `success`;
   - `warning`;
   - `error`.
2. Add local `aria-live` support for form/API feedback.
3. Let table error states accept translated `message` and optional retry
   action.
4. Replace page-local alert/error blocks in active views with `CcNotice`.

Acceptance:

- Auth submit errors are announced through local live feedback.
- Packet error states use the shared notice style.
- Retry action can be rendered without custom page-local markup.
- Existing loading/empty/table behavior remains visually stable.

### Slice 4: Shared Form Primitives

Files to add:

- `web/src/components/cc-field.tsx`
- `web/src/components/cc-text-input.tsx`
- `web/src/features/auth/auth-validation.ts`

Files to update:

- `web/src/main.tsx`

Implementation:

1. Add `CcField` for label, hint, required marker, error, and described-by IDs.
2. Add `CcTextInput` for consistent DaisyUI input styling.
3. Keep native HTML constraints, but pair them with app-owned validation copy.
4. Add auth validators for:
   - required email;
   - valid email;
   - required password;
   - password minimum length;
   - required workspace name on registration.
5. Set `aria-invalid` and `aria-describedby` on invalid fields.
6. Keep feedback local to the form submit region.

Acceptance:

- Login and registration use shared field primitives.
- Validation copy is translated.
- Invalid fields expose accessible error relationships.
- Submit failures do not show raw API codes.

### Slice 5: Minimal Module Split

Files to add:

- `web/src/layout/shell.tsx`
- `web/src/layout/public-layout.tsx`
- `web/src/features/auth/auth-pages.tsx`
- `web/src/features/departments/core-area-data.ts`
- `web/src/features/departments/core-area-pages.tsx`

Files to update:

- `web/src/main.tsx`

Implementation:

1. Keep `main.tsx` as app boot, provider wrapping, and route selection.
2. Move public/auth layouts into focused modules.
3. Move `00`, `04`, and `08` page rendering into department feature modules.
4. Keep route registry as the route metadata source.
5. Avoid behavior changes beyond using the new shared i18n/form/notice systems.

Acceptance:

- `main.tsx` no longer owns all UI details.
- Active routes remain behaviorally equivalent.
- Future department screens have an obvious module location.

## Execution Order

1. Create i18n provider and dictionaries.
2. Move active strings to translation keys.
3. Extract API client and error mapper.
4. Add shared notice/live feedback.
5. Add form primitives and auth validation.
6. Split layout/auth/department modules.
7. Run build and browser proof.
8. Update source-of-truth docs and ledgers.

## Validation Plan

Required commands:

- `npm run build:web`
- `npm run build:server`
- `git diff --check`

Required rendered proof:

- `/` desktop
- `/auth/login` desktop and mobile
- `/auth/register` desktop and mobile
- login success redirects to `/areas?area=00-ogolny&view=overview`
- `/areas?area=00-ogolny&view=overview`
- `/areas?area=04-operacje&view=overview`
- `/areas?area=08-zasoby&view=overview`
- mobile `08 Assets` has no horizontal overflow

Required interaction proof:

- language selector switches English to Polish;
- refresh preserves language;
- `<html lang>` updates;
- invalid login shows friendly translated message;
- duplicate registration shows friendly translated message;
- required/invalid email/password/workspace field errors are visible and
  connected through `aria-describedby`;
- no visible button or link lacks an accessible name.

Required cleanup:

- temporary dev or proof server stopped;
- validation-owned browser processes closed;
- no `.tmp` evidence committed unless explicitly promoted to `docs/ux/evidence`.

## Out Of Scope

- New department implementation, including `05 Relationships`.
- Backend API changes.
- Database schema changes.
- Restoring removed v0/v1 private web routes.
- Full CSS dead-selector cleanup; that remains `WEB-QA-005` after primitives
  and module split land.
- Friendly web 404 implementation; recommended after i18n exists.

## Rollback / Recovery

This is a frontend-only foundation slice. If validation fails:

1. Keep dictionaries and API error mapper if they compile independently.
2. Revert only the failing module extraction or form adoption portion.
3. Preserve the active route registry and current post-auth route behavior.
4. Do not restore old private web views as a recovery path.

## Main Failure Modes

- Incomplete dictionary coverage creates mixed-language screens.
- API errors get translated in one path but raw codes remain in another.
- Form validation duplicates browser messages and app messages incoherently.
- `main.tsx` extraction changes route behavior.
- Language selector becomes a decorative control without persistent state.

## Stage Exit Criteria

- This plan is saved and linked from the active queue.
- `WEB-QA-001` remains the next implementation task before new department UI.
- No runtime implementation is performed in this planning stage.
