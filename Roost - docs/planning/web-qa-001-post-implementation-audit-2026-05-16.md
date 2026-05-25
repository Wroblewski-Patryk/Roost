# WEB-QA-001 Post-Implementation Audit - 2026-05-16

## Scope

This audit verified whether the planned web foundation was correctly delivered
before more department management systems are added.

Covered surfaces:

- Public home.
- Owner login and registration.
- `00 General` authenticated dashboard.
- `04 Operations` authenticated packet view.
- `08 Assets` authenticated packet view.
- Old v0/v1 private route cleanup boundaries.
- Shared i18n, API error, form, notice, table, and module primitives.

## Findings

| ID | Severity | Finding | Status | Fix |
| --- | --- | --- | --- | --- |
| WEB-QA-001-A1 | P2 | The implementation plan named a separate locale contract file, but the runtime kept supported locales inside the provider. | Fixed | Added `web/src/i18n/locales.ts` and moved locale constants there. |
| WEB-QA-001-A2 | P2 | Some Polish-mode visible department labels still showed English names, making later translation scale less clean. | Fixed | Added department translation keys and routed the `00 General` department map through `t(...)`. |
| WEB-QA-001-A3 | P1 | API error normalization handled backend string errors, but did not accept nested error-code payloads and mapped backend `internal_server_error` to an unknown message. | Fixed | Added `codeFromBody(...)` normalization for string and nested error codes, with `internal_server_error -> server_error`. |

## Verification

| Perspective | Evidence | Result |
| --- | --- | --- |
| Source and architecture | Plan-to-code review of `web/src/i18n`, `web/src/api`, `web/src/features`, `web/src/layout`, route registry, and old-route references. | Pass |
| Browser smoke | Browser plugin loaded `http://127.0.0.1:3236/` and verified the public home title and accessible language selector. | Pass |
| Functional web journey | Playwright fallback on temporary mocked API server verified language switch and reload persistence, localized auth errors, register validation, signed-out private redirect, post-login `08 Assets`, `04 Operations` friendly server error, localized `00 General` department map, and removed old routes returning `404`. | Pass |
| Responsive UX | Playwright checked desktop `1366x900`, tablet `834x1112`, and mobile `390x844` on `08 Assets` for no horizontal overflow. | Pass |
| Accessibility smoke | Playwright checked zero unnamed visible controls across desktop, tablet, and mobile. | Pass |
| Build gates | `npm run build:web`, `npm run build:server`, and `npm run validate`. | Pass |
| Resource cleanup | Temporary mock server on port `3236` was stopped; Browser audit tab was closed; no validation-owned `chrome-headless-shell` process remained. | Pass |

## Result

`WEB-QA-001` remains verified after the post-implementation audit. The web base
is ready to continue department implementation through the shared Tailwind,
DaisyUI, i18n, API-error, form, notice, and table primitives.

Remaining accepted follow-ups are unchanged:

- `WEB-QA-005`: scoped CSS dead-selector cleanup.
- Friendly app-level web `404`: later UX/routing decision.
- Production smoke after Coolify deploy.
