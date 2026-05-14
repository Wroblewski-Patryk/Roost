# Application Completion Audit

Date: 2026-05-14
Reviewer: Codex
Mission: APP-AUDIT-001
Stage: analysis -> planning

## Executive Verdict

CompanyCore is live and the current core runtime is not down. Build,
integration tests on a fresh disposable PostgreSQL database, production health,
protected production API reads, and broad signed-in route checks passed.

The app is not yet at a "done product" quality bar. The remaining work is no
longer one backend blocker. It is a bundle of product-quality, UX, security,
maintainability, data-completeness, and operations hardening tasks that should
be executed in a deliberate finish queue.

## Evidence Collected

| Evidence | Result | Notes |
| --- | --- | --- |
| `npm run build` | PASS | TypeScript and Vite build passed. Vite still reports that `/vendor/phosphor/bold/style.css` does not exist at build time and is resolved at runtime. |
| `npm test` with disposable PostgreSQL `companycore-audit-postgres` on port `55450` | PASS | Applied all 23 migrations from an empty database, then ran `dist/tests/**/*.test.js`; 1 suite passed. Container was removed after the run. |
| Production `/health` and `/v1/health` | PASS | Both report runtime commit `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`. |
| Production protected API sample | PASS | Owner login worked; `/v1/connection`, `/v1/mcp/manifest`, `/v1/company-os`, `/v1/google-drive/files`, `/v1/operating-model`, `/v1/tasks`, `/v1/projects`, `/v1/notes`, and `/v1/agent-events` returned `200`; unauthenticated `/v1/tasks` returned `401`. |
| Production signed-in UI route audit | PARTIAL PASS | 12 routes on desktop and mobile had no console warnings/errors and no failed requests. Mobile overflow was detected on `/settings/api` and `/react-company-os`. |
| Browser plugin path | BLOCKED | The in-app browser runtime reported no active Codex browser pane, so Playwright fallback was used. |

Production API sample:

| Endpoint | Result |
| --- | --- |
| `/v1/connection` | 62 capabilities, broad owner scope |
| `/v1/mcp/manifest` | 145 tools |
| `/v1/company-os` | 29 collections |
| `/v1/google-drive/files` | 748 files/items |
| `/v1/operating-model` | 13 areas, 26 external mappings, 0 storage locations, 0 knowledge roots, 0 automation definitions |
| `/v1/tasks` | 235 tasks |
| `/v1/projects` | 0 projects |
| `/v1/notes` | 17 notes |
| `/v1/agent-events` | 0 pending events |

UI evidence artifacts:

- Report JSON: `C:\Users\wrobl\AppData\Local\Temp\companycore-full-audit-20260514-180653\report.json`
- Screenshots: `C:\Users\wrobl\AppData\Local\Temp\companycore-full-audit-20260514-180653`
- Routes checked: `/dashboard`, `/data`, `/data/tasks`, `/tasks-adapter`,
  `/pipeline`, `/relationships`, `/settings/integrations`, `/settings/drive`,
  `/settings/api`, `/areas`, `/react-agent-tools`, `/react-company-os`
- Viewports checked: desktop `1440x960`, mobile `390x844`

## Audit Findings

| ID | Severity | Audit | Finding | Evidence | Recommended finish task |
| --- | --- | --- | --- | --- | --- |
| ACF-001 | P1 | UX/mobile | Mobile horizontal overflow exists on `/settings/api`. | Playwright reported `horizontalOverflow=true`; screenshot `mobile-settings-api.png` shows the API base URL breaking the viewport. | Fix long-token wrapping and responsive constraints in the API settings surface. |
| ACF-002 | P1 | UX/mobile | Mobile horizontal overflow exists on `/react-company-os`. | Playwright reported `horizontalOverflow=true`; screenshot `mobile-react-company-os.png` shows a dense cockpit first viewport. | Fix React cockpit mobile layout, tables/forms, and long command controls. |
| ACF-003 | P1 | Accessibility/UX | Vanilla owner shell keeps a very large interactive DOM on every route. | Desktop/mobile vanilla routes reported about 298 buttons, 222 links, 193 inputs, and 9-10 focusable controls without accessible names. | Audit hidden panels and focus management; ensure inactive route controls are not keyboard-reachable and add missing labels. |
| ACF-004 | P1 | Product/UX | The canonical dashboard does not yet implement the approved Company City visual direction. | Dashboard screenshot is a dense operational card layout; approved direction lives in `docs/ux/company-city-dashboard-v3-spec.md` and asset references. | Build the Company City dashboard as a real owner entry surface or formally supersede the design decision. |
| ACF-005 | P1 | Security/config | Production code can fall back to development auth, integration, and API-key hash secrets if env is missing. | `src/config/env.ts` provides dev fallback secrets regardless of production for `AUTH_TOKEN_SECRET`, `INTEGRATION_SECRET_KEY`, and `API_KEY_HASH_SECRET`. | Add production env validation that fails startup when required secrets are absent. |
| ACF-006 | P1 | Security/API | CORS is currently open for all origins. | `src/app.ts` uses `app.use(cors())` globally. | Restrict production CORS to approved web/API origins or document the intentional machine-client contract. |
| ACF-007 | P1 | Maintainability | Runtime and UI logic is concentrated in very large files. | `web/src/main.tsx` 5987 lines, `public/app.js` 5824 lines, `src/tests/api.test.ts` 5306 lines, `company-os.routes.ts` 2328 lines. | Split by route surface, command service, test suite, and reusable UI sections while preserving contracts. |
| ACF-008 | P1 | Source-of-truth | Coverage ledgers are stale after the real Google Drive import. | `docs/operations/agent-runtime-coverage-ledger.csv` still marks Drive import as needing target sample, while production evidence says 748 imported items and scoped roots. | Refresh active coverage ledgers so future agents do not reopen completed Drive import blockers. |
| ACF-009 | P1 | Product/data | Operating-model storage locations, knowledge roots, and automation definitions are implemented but empty in production. | `/v1/operating-model` returned 0 storage locations, 0 knowledge roots, 0 automation definitions. | Decide seed/import policy for real company storage and knowledge roots, then add owner UI guidance or import. |
| ACF-010 | P1 | Product/data | Production has 0 project records despite many tasks and notes. | `/v1/projects` returned count 0, `/v1/tasks` returned 235. | Audit whether projects are intentionally unused or whether ClickUp/Drive tasks need project/workstream mapping. |
| ACF-011 | P2 | Operations | Auto-deploy remains unverified; manual VPS rollover is still the approved path. | `known-issues.md` KI-002 and deploy docs retain manual rollover. | Keep manual path accepted or complete a push-to-running-image proof. |
| ACF-012 | P2 | Observability | Error logging may print full server/provider errors to container logs. | `src/middleware/error-handler.ts` calls `console.error(error)`. | Redact known secret-bearing fields and provider payloads before logging. |
| ACF-013 | P2 | Integration UX | Large Drive imports can exceed a single-request operator flow. | AGRUN-007 noted client timeout while the backend continued and finished import. | Add async job/progress UX if repeated Drive imports or refreshes become operator-visible. |
| ACF-014 | P2 | Testing | There is no lint script and only one very large node test suite. | `package.json` has `build`, `test`, and `validate`, but no lint; `src/tests/api.test.ts` is 5306 lines. | Add lint/static gates and split tests by domain before the next broad runtime expansion. |

## Audit Bundle Summary

### Product Completion Audit

The live product can serve as a technical owner console and agent source of
truth, but it still lacks the final owner-grade operating experience. The
dashboard should become the strategic command entrypoint promised by the
Company City UX direction. Real production data also shows incomplete operating
model adoption: tasks, Drive, and notes are populated, but projects, storage
locations, knowledge roots, and automation definitions are empty.

### Architecture Audit

The architecture direction is coherent: HTTP API remains the policy boundary,
Company OS writes are command-shaped, MCP is a wrapper over HTTP, and Google
Drive/ClickUp map into the operating model. The main architecture risk is
maintainability drift from large route/UI files and stale coverage ledgers.

### Backend/API Audit

Core protected routes respond and the integration suite passes from an empty
database. API capability and MCP manifest surfaces are alive. Security hardening
should come before broad new features: fail production startup on missing
secrets, restrict/document CORS, and redact logs.

### Data Audit

Prisma has 60 models and 23 migrations. The schema is broad enough for v1/v2,
but production use is uneven. The strongest data evidence is Drive scoping
and task import. The weakest production completeness signals are empty projects
and empty operating-model storage/knowledge/automation registries.

### Frontend/UX Audit

No route-level console or request failure was found in the signed-in production
audit. The user experience still has concrete issues: mobile overflow, dense
first viewport, no visual asset usage on key surfaces, and too much hidden or
inactive interactive DOM in the vanilla shell.

### Security/AI Audit

MCP risky-command guards are strong and tested. The next security work should
focus on platform hardening rather than agent policy design: environment
secret validation, CORS, log redaction, and an AI red-team pass before any
unsupervised write mode is enabled.

### Ops/Release Audit

Manual deployment is proven and current production is healthy. Auto-deploy is
still a known P2 gap. Rollback pointers are current after the hotfix deploy.

## Recommended Finish Queue

| Order | Task ID | Priority | Task | Why now | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | ACF-UX-001 | P1 | Fix mobile overflow and accessibility/focus defects on `/settings/api` and `/react-company-os`. | Fresh audit found concrete UI defects in live production. | Playwright desktop/mobile route audit with no overflow, no failed requests, no console issues, and reduced unnamed focusables. |
| 2 | ACF-SEC-001 | P1 | Add production env validation for required secrets and decide/restrict CORS. | Security hardening should precede more autonomous/agent write expansion. | Unit/integration tests for production missing-secret failure and CORS behavior; build passes. |
| 3 | ACF-DOC-001 | P1 | Reconcile stale coverage ledgers and active queues after Drive import and completion audit. | Current ledgers can cause agents to reopen completed Drive blockers or miss real finish tasks. | `rg` proves no active Drive blocked rows remain; task board, next steps, risk, requirements, and delivery map agree. |
| 4 | ACF-PROD-001 | P1 | Decide and implement operating-model data completion: projects, storage locations, knowledge roots, automation definitions. | Production has rich tasks/Drive but empty higher-level operating containers. | Owner-visible data map shows intended containers or a documented accepted deferral. |
| 5 | ACF-UX-002 | P1 | Build or formally supersede the Company City dashboard direction. | The approved UX vision is not reflected in the canonical dashboard. | Browser screenshot parity against `docs/ux/company-city-dashboard-v3-spec.md` or a recorded decision superseding it. |
| 6 | ACF-MAINT-001 | P1 | Split the largest UI/API/test files into domain modules without behavior changes. | The current file sizes slow safe completion and increase regression risk. | Build/test unchanged; route-level UI smoke unchanged. |
| 7 | ACF-OPS-001 | P2 | Complete push-to-running-image auto-deploy proof or keep manual rollover as accepted. | Release process is workable but high-touch. | Commit SHA from push appears in production health without manual rollover, or docs explicitly retain manual path. |
| 8 | ACF-QA-001 | P2 | Add lint/static checks and split integration tests by domain. | The current single test file is effective but brittle for future iteration. | New validation commands pass locally and are recorded in project state. |

## Stop Conditions For Future Work

- Do not add new broad feature surfaces before ACF-UX-001 and ACF-SEC-001 are
  handled or explicitly deferred.
- Do not claim product-grade UI completion until the Company City direction is
  implemented or superseded.
- Do not claim Drive import is blocked in active ledgers; current production
  evidence shows it is complete for the selected department roots.
- Do not enable unsupervised agent write modes without a fresh AI/security
  red-team pass.

## Closure Updates

- 2026-05-14: ACF-UX-001 closed ACF-001 through ACF-003 for the target routes.
  `/settings/api` and `/react-company-os` were checked at desktop `1440x960`
  and mobile `390x844` with `horizontalOverflow=false`,
  `unnamedFocusableCount=0`, no console warnings/errors, and no relevant failed
  requests. Evidence is recorded in `docs/planning/acf-ux-001-task-contract.md`.
- 2026-05-14: ACF-SEC-001 closed ACF-005 and ACF-006. Production env loading
  now fails closed when required secrets are missing or still use committed
  development placeholder values, and production CORS is restricted to
  `COMPANYCORE_ALLOWED_ORIGINS` or the documented CompanyCore web/API domains.
  `npm test` passed against disposable PostgreSQL on `localhost:55452`,
  including missing-secret, placeholder-secret, CORS allow/deny, and existing
  protected API flow coverage. Evidence is recorded in
  `docs/planning/acf-sec-001-task-contract.md`.
- 2026-05-14: ACF-DOC-001 closed ACF-008 for stale first-import blocker
  wording. Active source-of-truth docs now treat Google Drive OAuth and
  numbered-root first import as verified by AGRUN-007, while preserving future
  Drive content body readback, Docs/Sheets write, and changes reconcile samples
  as target-safe proof tasks. Evidence is recorded in
  `docs/planning/acf-doc-001-task-contract.md`.
- 2026-05-15: ACF-MAINT-002 continued ACF-007 by extracting the Google Drive
  context command renderer into `public/google-drive-workbench.js`. `node
  --check public/app.js`, `node --check public/google-drive-workbench.js`,
  `npm run build`, `git diff --check`, and `npm test` passed against
  disposable PostgreSQL on `localhost:55472`; Playwright verified
  `/settings/drive` at desktop and mobile with the module loaded, four command
  cards, no overflow, no console issues, and no failed requests. Evidence is
  recorded in
  `docs/planning/acf-maint-002-google-drive-workbench-extraction-task-contract.md`.
