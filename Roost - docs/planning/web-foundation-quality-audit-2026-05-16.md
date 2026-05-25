# Web Foundation Quality Audit

Date: 2026-05-16
Stage: audit and implementation planning
Scope: active CompanyCore web foundation only

## Executive Summary

The current web foundation is clean enough to use as the base for future
department systems. The active web runtime contains only the intended surfaces:

- public home;
- owner login;
- owner registration;
- `00 General`;
- `04 Operations`;
- `08 Assets`.

Old v0/v1 private workbenches are no longer React app routes. Backend APIs
remain available for future rebuilds.

The foundation is not yet complete as a scalable product shell. Before adding
more departments, the next web implementation should add:

1. an i18n foundation with English as default and Polish ready as a second
   locale;
2. a user-facing error/message mapper so API codes are not shown raw;
3. shared form and validation primitives;
4. shared notice/toast/live-region behavior;
5. a small module split so `main.tsx` does not become a new monolith as new
   departments return.

## Audit Method

Source review:

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `web/src/components/cc-button.tsx`
- `web/src/components/cc-data-table.tsx`
- `web/src/styles.css`
- `src/app.ts`

Rendered proof:

- Playwright fallback was used because the Browser plugin initialization timed
  out.
- Temporary Express host: `http://127.0.0.1:3234`.
- Screenshots and JSON evidence were written under
  `.tmp/web-foundation-audit/` and are not committed.

Validation commands:

- `npm run build:web`
- `npm run build:server`
- rendered route/form/error/mobile proof
- cleanup check for port `3234`
- cleanup check for `chrome-headless-shell`

## Passing Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| Active routes | PASS | `/`, `/auth/login`, `/auth/register`, `/areas?area=00-ogolny&view=overview`, `/areas?area=04-operacje&view=overview`, and `/areas?area=08-zasoby&view=overview` rendered. |
| Post-auth redirect | PASS | Login without pending private route opened `/areas?area=00-ogolny&view=overview`. |
| Old routes removed | PASS | `/settings/api`, `/data`, `/relationships`, `/tasks-adapter`, `/pipeline`, `/react-company-os`, and `/react-agent-tools` did not serve React HTML and did not expose old labels. |
| Native form validation | PASS | Required email, invalid email, and registration password min-length constraints fired. |
| Data states | PASS | `00 General` rendered packet data; `04 Operations` rendered a packet error state; `08 Assets` rendered packet data. |
| Mobile overflow | PASS | Mobile `08 Assets` had no horizontal overflow. |
| Accessibility smoke | PASS with gaps | HTML language is `en`; no unnamed visible buttons/links were detected. |
| Build | PASS | `npm run build:web`; `npm run build:server`. |
| Cleanup | PASS | Port `3234` closed; no validation-owned `chrome-headless-shell` process remained. |

Expected failure-state console noise:

- `401 Unauthorized` from forced invalid login proof;
- `409 Conflict` from forced duplicate registration proof;
- `500 Internal Server Error` from forced Operations packet error proof.

These were expected during negative-state testing. No unrelated console or page
errors were found.

## Findings

### P1: i18n Foundation Is Missing

Status: accepted gap

The active UI text is inline in `main.tsx`, `cc-button.tsx`, and
`cc-data-table.tsx`. The HTML document language is currently English, which is
correct for the default target, but there is no locale registry, translation
dictionary, language selector, persistent locale preference, or translation
API.

Impact:

- Polish cannot be added later without touching many screen components.
- Future department screens will multiply inline strings.
- Native browser validation messages may appear in the browser locale while
  app messages stay English, creating mixed-language UX.

Required implementation:

- Add `web/src/i18n/` with `en` and `pl` dictionaries.
- Add a typed `t(key, params?)` helper or hook.
- Add `LanguageProvider` with default `en`, persisted preference, and
  `<html lang>` synchronization.
- Add a language selector in public and private shells.
- Move active UI strings and shared component messages into dictionaries.

### P1: API Errors Are Shown As Raw Codes

Status: verified defect

Negative auth proof showed:

- `invalid_credentials`
- `email_already_registered`

directly in the UI.

Impact:

- The owner sees backend/internal error codes instead of recovery guidance.
- Polish translation would be impossible without a central error mapper.
- Future backend errors could leak provider or validation implementation
  details.

Required implementation:

- Add `web/src/errors.ts` or `web/src/i18n/errors.ts`.
- Map known API codes to user-facing messages and recovery guidance.
- Default unknown errors to a safe generic message.
- Keep raw codes available only for debugging metadata, not visible primary
  copy.

### P1: Form Validation Is Native-Only

Status: partial

The current auth forms use HTML validation (`required`, `type=email`,
`minLength`). This is a useful baseline and passed proof, but there is no
shared form-field component, field-level error model, `aria-invalid`,
`aria-describedby`, localized validation copy, or submit-level recovery copy.

Impact:

- Future department forms will likely diverge.
- Validation text will be inconsistent across browsers and languages.
- Error focus management is missing.

Required implementation:

- Add `CcField`, `CcTextInput`, and `CcFormError` primitives.
- Support field `error`, `hint`, `required`, `aria-invalid`, and stable
  described-by IDs.
- Add simple client validators for auth first.
- Keep native constraints, but pair them with app-owned messages.

### P1: Notification And Feedback System Is Too Thin

Status: accepted gap

Current feedback appears as local alerts or table states. There is no shared
notice/toast/live-region system for:

- success;
- warning;
- local action errors;
- save progress;
- retry guidance;
- global auth/session expiration.

Impact:

- Future write actions will invent their own feedback patterns.
- Screen readers may not announce errors or state changes consistently.
- Success and failure behavior will be hard to translate.

Required implementation:

- Add `CcNotice` and optional `CcToastRegion`.
- Add an `aria-live` region for form and mutation feedback.
- Make `CcDataTable` error state accept an optional retry action.
- Keep feedback local to the action whenever possible.

### P1: API Client Needs Product-Safe Error Semantics

Status: accepted gap

`api<T>()` is intentionally small, but it currently:

- always sends `Content-Type: application/json`;
- assumes JSON or empty object;
- throws raw message strings;
- clears token for auth-like errors;
- does not distinguish network offline, forbidden, missing scope, timeout,
  validation, or server error.

Impact:

- UI cannot show precise recovery actions.
- Translation and logging will be harder later.
- Future departments may reimplement request handling.

Required implementation:

- Add a typed web API client with `AppApiError`.
- Preserve `code`, `status`, and `requestId` when present.
- Add central user-message mapping through i18n.
- Keep auth expiration handling centralized.

### P2: `main.tsx` Should Be Split Before More Departments

Status: accepted maintainability gap

The current `main.tsx` is small enough after cleanup, but it already contains:

- shell;
- public layout;
- auth;
- active department views;
- data loaders;
- API client;
- routing.

Impact:

- Adding departments will turn it into a new monolith.
- i18n and validation work will be harder if introduced after more screens.

Required implementation:

- Move shell components to `web/src/layout/`.
- Move auth to `web/src/features/auth/`.
- Move `00`, `04`, and `08` to `web/src/features/departments/`.
- Move API client to `web/src/api/`.
- Keep `main.tsx` as route composition only.

### P2: CSS Contains Historical Selectors

Status: accepted cleanup opportunity

The active bundle is clean, but `web/src/styles.css` still contains old class
families such as `public-shell`, `public-nav`, `public-home`, and other
historical styling patterns from pre-cleanup screens.

Impact:

- Dead CSS increases noise and bundle size.
- Future contributors may reuse old classes instead of shared Tailwind/DaisyUI
  primitives.

Required implementation:

- Audit active class usage after i18n/form primitives land.
- Remove unused historical CSS selectors in one focused cleanup.
- Keep only theme, global overflow guards, table guards, and active component
  support.

### P2: Unknown Web Paths Need A Product Decision

Status: accepted decision gap

Old private web paths no longer serve React HTML. On the Express host they
fall through protected backend middleware and return API-style unauthorized
responses.

Impact:

- This is technically clean, but a browser user opening an old link may see
  JSON instead of a friendly web 404/redirect.

Options:

1. Keep current behavior because those routes are no longer product web routes.
2. Add a dedicated web 404 route only for non-API host unknown paths.
3. Redirect unknown non-API paths to `/` or `00 General` depending on session.

Recommended later choice:

- Option 2: add a small, translated web 404 after i18n exists.

## Recommended Implementation Plan

### WEB-QA-001: i18n And Message Foundation

Goal:
Create the scalable language foundation before adding more departments.

Scope:

- `web/src/i18n/*`
- `web/src/main.tsx`
- `web/src/components/*`
- `public/react/index.html` if needed for language metadata

Acceptance criteria:

- Default language is English.
- Polish dictionary exists and can be selected.
- Language preference persists.
- `<html lang>` updates to `en` or `pl`.
- All active route labels, headings, buttons, auth labels, table states, and
  error messages use translation keys.

### WEB-QA-002: Shared Error And Notification System

Goal:
Stop showing raw backend codes and create a reusable feedback layer.

Scope:

- `web/src/api/client.ts`
- `web/src/errors.ts`
- `web/src/components/cc-notice.tsx`
- `web/src/components/cc-toast-region.tsx` if global toast is selected
- auth forms and packet views

Acceptance criteria:

- `invalid_credentials` displays a friendly message.
- `email_already_registered` displays a friendly message.
- unknown API errors display safe recovery copy.
- auth/session errors redirect or ask for sign-in without leaking raw details.
- feedback is announced through `aria-live`.

### WEB-QA-003: Shared Form Primitives And Auth Validation

Goal:
Make forms reusable before department write commands appear.

Scope:

- `web/src/components/cc-field.tsx`
- `web/src/features/auth/*`

Acceptance criteria:

- Auth fields use shared components.
- Required, email, password-length, and workspace-name validation show
  localized field-level messages.
- Invalid fields set `aria-invalid` and `aria-describedby`.
- Submit errors focus or announce the local error region.

### WEB-QA-004: Web Module Split

Goal:
Prevent the cleaned foundation from becoming a new monolith.

Scope:

- `web/src/layout/*`
- `web/src/features/auth/*`
- `web/src/features/departments/*`
- `web/src/api/*`
- `web/src/main.tsx`

Acceptance criteria:

- `main.tsx` owns app boot and route selection only.
- Public shell/private shell are reusable.
- `00`, `04`, and `08` remain behaviorally identical after split.
- Build and rendered route proof pass.

### WEB-QA-005: CSS Dead Selector Cleanup

Goal:
Remove historical styling leftovers after primitives are in place.

Scope:

- `web/src/styles.css`

Acceptance criteria:

- No unused public/v0 class families remain.
- Theme tokens, overflow guards, table guards, and active reusable styles stay.
- Desktop/mobile rendered proof passes.

## Recommended Order

1. `WEB-QA-001` i18n and message foundation.
2. `WEB-QA-002` shared errors and notifications.
3. `WEB-QA-003` form primitives and auth validation.
4. `WEB-QA-004` module split.
5. `WEB-QA-005` CSS cleanup.

This order keeps the product stable while preparing the app for future
departments. Adding new departments before these slices would work, but it
would increase duplication and make Polish translation harder.

## Current Go / No-Go

Go for production testing of the current base:

- active web routes are clean;
- v0 web routes are removed from React hosting;
- builds pass;
- auth native validation works;
- packet loading/error/empty states exist;
- mobile overflow proof passed.

No-go for adding more departments before the next quality slice:

- no i18n layer;
- raw API errors visible;
- forms are not shared or localized;
- notification semantics are not centralized.
