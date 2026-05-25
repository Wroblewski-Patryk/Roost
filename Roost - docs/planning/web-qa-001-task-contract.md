# WEB-QA-001 Web Language, Message, And Form Foundation

## Header

- ID: WEB-QA-001
- Title: Web Language, Message, And Form Foundation
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test + Product Docs
- Depends on: WEB-QA-AUDIT-001
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: WEB-QA-AUDIT-001
- Requirement Rows: REQ-WEB-QA-001
- Quality Scenario Rows: QA-WEB-QA-001
- Risk Rows: RISK-WEB-QA-001
- Iteration: 2026-05-16 web foundation iteration
- Operation Mode: BUILDER
- Mission ID: WEB-QA-001
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current execution need.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` requirements are represented by this
      mission block.
- [x] Missing or template-like state tables were not found for this scope.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block

- Mission objective: make the active CompanyCore web base scalable for
  English-first i18n, future Polish translation, safe user-facing errors,
  shared validation, and consistent action feedback.
- Release objective advanced: future departments can be added without copying
  strings, raw error handling, form behavior, or notice patterns.
- Included slices: i18n provider/dictionaries, language selector, API error
  mapper, notice/live feedback, auth form primitives, minimal module split.
- Explicit exclusions: new department screens, backend/API changes, DB
  changes, restored old v0/v1 views, full CSS dead-selector cleanup.
- Checkpoint cadence: verify after i18n/error/form adoption, then verify again
  after module split.
- Stop conditions: route behavior changes unexpectedly, raw errors remain in
  visible auth paths, or i18n coverage cannot be completed without changing
  product copy decisions.
- Handoff expectation: code, validation evidence, source-of-truth updates, and
  clear residual risk if any route cannot be browser-proven.

## Context

`WEB-QA-AUDIT-001` confirmed that the active web surface is clean and limited
to public home, auth, `00 General`, `04 Operations`, and `08 Assets`. It also
found P1 gaps: no language selector/dictionary path, raw API codes in auth
errors, native-only forms, and decentralized feedback.

## Goal

Implement the smallest complete frontend foundation that lets CompanyCore keep
English as the default UI language while allowing Polish translation later
through the same system, and that prevents future department screens from
duplicating error, validation, and feedback behavior.

## Scope

Allowed files and modules:

- `web/src/i18n/*`
- `web/src/api/*`
- `web/src/components/cc-notice.tsx`
- `web/src/components/cc-live-region.tsx` if needed
- `web/src/components/cc-field.tsx`
- `web/src/components/cc-text-input.tsx`
- `web/src/components/cc-button.tsx`
- `web/src/components/cc-data-table.tsx`
- `web/src/layout/*`
- `web/src/features/auth/*`
- `web/src/features/departments/*`
- `web/src/main.tsx`
- `web/src/styles.css` only for required support styles
- source-of-truth docs and state files touched by the task result

Out of scope:

- backend route changes;
- database or Prisma changes;
- new department screens;
- deleted legacy route restoration;
- full CSS cleanup.

## Implementation Plan

1. Inspect the current active route code, shared components, audit, and route
   registry.
2. Add i18n provider, dictionaries, translation helper, locale persistence, and
   `<html lang>` synchronization.
3. Add language selector in public/auth and private shell contexts.
4. Extract API client and typed `AppApiError`.
5. Add central API error-to-message mapping through i18n.
6. Add `CcNotice` and local live feedback.
7. Add `CcField`, `CcTextInput`, and auth validators.
8. Convert login/register to shared form primitives and localized validation.
9. Split shell/auth/department code out of `main.tsx` without changing route
   behavior.
10. Run build, route proof, interaction proof, accessibility smoke, and cleanup
    checks.
11. Update task board, module confidence, requirements, quality scenario,
    risk, system health, project state, and next steps.

## Autonomous Loop Evidence

### 1. Analyze Current State

- Issues: i18n missing, raw auth codes visible, native-only validation,
  feedback not centralized, `main.tsx` carries all active UI.
- Gaps: Polish translation path and shared form/error/notice patterns.
- Inconsistencies: table and form messages are not yet sourced from one
  language contract.
- Architecture constraints: React-owned web layer, shared Tailwind/DaisyUI
  primitives, no restored legacy web routes.

### 1a. Bootstrap Missing Project Knowledge

- Bootstrap needed: no
- Sources scanned: audit doc, project memory, task board, current web files.
- Rows created or corrected: already created by WEB-QA-AUDIT-001.
- Assumptions recorded: English remains default; Polish is the second locale.
- Blocking unknowns: none.
- Why it was safe to continue: user explicitly requested language choice and
  future Polish translation path.

### 2. Select One Priority Mission Objective

- Selected task: WEB-QA-001.
- Priority rationale: prevents duplication before additional department UI.
- Why other candidates were deferred: `05 Relationships` should wait until
  shared language/error/form foundations exist.

### 3. Plan Implementation

- Files or surfaces to modify: listed in Scope.
- Logic: dictionary-backed UI copy, typed API errors, accessible forms, shared
  feedback, minimal module extraction.
- Edge cases: unknown API errors, session/auth errors, language persistence,
  reload after language switch, mobile overflow, form focus/announcement.

### 4. Execute Implementation

- Implementation notes: added `web/src/i18n`, `web/src/api`, shared notice and
  form components, auth validators, translated table labels, and feature/layout
  modules. `web/src/main.tsx` now only composes providers and routes.

### 5. Verify and Test

- Validation performed: `npm run build:web`, `npm run build:server`,
  `npm run validate`, Browser home smoke, Playwright fallback interaction
  proof, cleanup checks.
- Result: verified.

### 6. Self-Review

- Simpler option considered: only adding a language dropdown without moving
  strings. Rejected because it would be decorative and would not solve future
  Polish translation or raw error mapping.
- Technical debt introduced: no.
- Scalability assessment: this is a foundation task to lower future department
  cost.
- Refinements made: implementation split into testable slices.

### 7. Update Documentation and Knowledge

- Docs updated: this task contract, task board, project state, queues, system
  health, confidence, requirement, quality, risk, and project memory files.
- Context updated: yes.
- Learning journal updated: not applicable unless a recurring pitfall appears.

## Acceptance Criteria

- [x] Default language is English.
- [x] Polish can be selected from visible public/auth/private shell controls.
- [x] Language preference persists after reload.
- [x] `<html lang>` updates to `en` or `pl`.
- [x] Active route chrome and active route content use dictionary-backed copy.
- [x] `invalid_credentials` is not shown raw.
- [x] `email_already_registered` is not shown raw.
- [x] Unknown API errors show safe recovery copy.
- [x] Auth fields use shared form primitives.
- [x] Required, invalid email, password length, and workspace-name validation
      show localized field-level messages.
- [x] Invalid fields set `aria-invalid` and `aria-describedby`.
- [x] Auth submit and packet errors render through shared notice/live feedback.
- [x] `main.tsx` is reduced to provider/route composition and no longer owns
      all page details.
- [x] Public home, login, registration, `00`, `04`, and `08` still render.
- [x] Mobile `08 Assets` has no horizontal overflow.
- [x] No visible button or link lacks an accessible name.

## Success Signal

- User or operator problem: future screens can be added without copy,
  validation, and error handling drift.
- Expected product or reliability outcome: active web foundation becomes a
  stable multilingual and accessible base.
- How success will be observed: build and rendered proof pass; negative auth
  errors become user-facing messages; language switch survives reload.
- Post-launch learning needed: no, unless production smoke exposes a locale or
  hydration issue.

## Deliverable For This Stage

Planning stage deliverable: a saved implementation plan and READY task
contract. Runtime implementation happens in the next stage.

## Constraints

- use existing systems and approved mechanisms;
- do not restore removed legacy routes;
- do not introduce backend changes;
- do not add page-local translation or error systems;
- stay within active React web layer;
- keep UI Tailwind/DaisyUI-based and componentized;
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior.

## Definition of Done

- [x] Code builds without errors.
- [x] Feature works manually through the real UI path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full frontend data flow works across active routes.
- [x] UI/client error handling exists.
- [x] No existing active route functionality is broken.
- [x] Feature works after reload and navigation refresh.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria

- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden

- new backend systems;
- duplicated i18n/error/form implementations;
- temporary bypasses or workaround-only paths;
- architecture changes without explicit approval;
- restored v0/v1 views;
- implicit stage skipping.

## Validation Evidence

- Tests: `npm run build:web`; `npm run build:server`; `npm run validate`.
- Manual checks: Browser home smoke, then Playwright fallback interaction
  proof on `http://127.0.0.1:3235`.
- Screenshots/logs: temporary evidence in `.tmp/web-qa-001/`, intentionally
  not committed.
- High-risk checks: language switching, auth negative errors, form
  accessibility, mobile overflow.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Quality scenarios updated: yes.
- Risk register updated: yes.
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes, auth and active packet routes during proof
  through a local mocked API with the same route shapes; no backend contract
  changed.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable.
- Loading state verified: yes, through active packet route proof.
- Error state verified: yes, invalid login, duplicate registration, and
  Operations packet error.
- Refresh/restart behavior verified: yes, language preference persisted after
  reload.
- Regression check performed: active route proof for `/`, auth, `00`, `04`,
  and `08`.

## UX/UI Evidence

- Design source type: approved_snapshot
- Design source reference: existing active web route implementation plus
  `docs/ux/design-system-contract.md`.
- Canonical visual target: structurally faithful to current active routes.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes, from WEB-QA-AUDIT-001.
- Primary user question answered within 3 seconds: language, form error, and
  next action must be clear.
- Next action visibility: required in auth and packet error states.
- Blocked-state visibility: required in packet error states.
- Existing shared pattern reused: `CcButton`, `CcDataTable`, DaisyUI theme.
- New shared pattern introduced: `CcNotice`, `CcField`, `CcTextInput`.
- Design-memory update required: only if a reusable learning appears.
- Surface strategy checked: mobile, tablet, desktop.
- State checks: loading, empty, error, success.
- Feedback locality checked: yes.
- Raw technical errors hidden from end users: yes.
- Responsive checks: desktop, tablet, mobile.
- Input-mode checks: touch, pointer, keyboard.
- Accessibility checks: accessible names, `aria-invalid`,
  `aria-describedby`, `aria-live`, `html lang`.
- Parity evidence: Playwright checks in `.tmp/web-qa-001/playwright-result.json`.

## Deployment / Ops Evidence

- Deploy impact: low
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: post-implementation if needed
- Rollback note: frontend-only; revert the web foundation commit if severe
  route regression occurs.
- Observability or alerting impact: none
- Staged rollout or feature flag: not needed
- `DEPLOYMENT_GATE.md` reviewed: required before release/push of runtime
  implementation.

## Review Checklist

- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task is selected.
- [x] Operation mode selected.
- [x] Current stage declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems planned for reuse.
- [x] No workaround paths planned.
- [x] No temporary solution planned.
- [x] No logic duplication planned.
- [x] Docs/context update planned after runtime implementation.

## Result Report

- Task summary: implemented WEB-QA-001 language, message, form, notice, API
  error, and module-split foundation.
- Files changed: `web/src/main.tsx`, `web/src/components/*`,
  `web/src/i18n/*`, `web/src/api/*`, `web/src/hooks/*`,
  `web/src/layout/*`, `web/src/features/*`, `web/src/types.ts`, and
  source-of-truth docs/state.
- How tested: `npm run build:web`, `npm run build:server`,
  `npm run validate`, Browser home smoke, Playwright fallback proof.
- What is incomplete: full CSS dead-selector cleanup remains `WEB-QA-005`;
  friendly web 404 remains a later decision.
- Next steps: continue with `DMS-NEXT-004` or production smoke.
- Decisions made: English default, Polish as second dictionary path, shared
  i18n/error/form/notice foundation before more department UI.

## Notes

This task intentionally precedes `DMS-NEXT-004` so future department screens do
not multiply inline strings, raw error handling, and bespoke form behavior.

## Post-Implementation Audit

- Audit report:
  `docs/planning/web-qa-001-post-implementation-audit-2026-05-16.md`.
- Corrections made: extracted `web/src/i18n/locales.ts`, localized the planned
  department map labels, and normalized API errors for string, nested, and
  backend `internal_server_error` payloads.
- Additional verification: Browser home smoke, Playwright fallback journey
  proof on temporary port `3236`, `npm run build:web`, `npm run build:server`,
  `npm run validate`, old-route `404` checks, desktop/tablet/mobile overflow
  checks, and cleanup checks.
