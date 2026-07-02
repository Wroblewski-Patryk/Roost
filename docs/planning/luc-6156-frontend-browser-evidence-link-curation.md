# LUC-6156 Frontend Browser Evidence Link Curation

Date: 2026-07-01
Issue: [LUC-6156](/LUC/issues/LUC-6156)
Parent: [LUC-6151](/LUC/issues/LUC-6151)
Stage: verification

## Task Contract

- Goal: reconcile existing Roost frontend/browser evidence with current
  app-completion missing-proof signals before requesting new UI work.
- Task Type: PM evidence curation.
- Current Stage: verification.
- Deliverable For This Stage: route/component evidence map, stale-linkage
  decision, and next owner/action.

## Scope

Inspected evidence and generated state:

- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/ux/evidence/luc-5561-auth-account-access/`
- `docs/ux/evidence/luc-5569-user-settings-proof/`
- `docs/ux/evidence/luc-5624-sales-board-proof/`
- `docs/ux/evidence/luc-5433-finance-browser-proof/`
- `docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`
- `docs/planning/luc-5569-user-settings-proof-ladder.md`
- `docs/planning/luc-5624-sales-context-and-board-proof.md`
- `docs/planning/luc-5433-finance-browser-proof-ladder.md`

Exclusions:

- No product code, test code, generated app-completion rewrite, runtime server,
  browser, Docker, database, push, deploy, protected smoke, credential access,
  or secret disclosure.

## Implementation Plan

1. Read the current issue context and reassignment comment.
2. Inspect current app-completion missing-proof counts and priority rows.
3. Inspect the existing UX/browser evidence reports named by the parent.
4. Map at least one current frontend flow to route/component proof assets.
5. Decide whether the gap is stale evidence linkage, missing browser proof, or
   a real UI defect.
6. Record the decision and create a narrow follow-up if another owner must
   repair generated proof linking.

## Evidence Map

| Flow / route | Frontend surface | Evidence assets | Proof result | Linkage decision |
| --- | --- | --- | --- | --- |
| Account access: `/auth/register`, `/auth/login`, protected route after auth | `web/src/features/auth/auth-pages.tsx`, `web/src/api/auth-token.ts`, `web/src/api/client.ts` | `docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`; `docs/ux/evidence/luc-5561-auth-account-access/browser-auth-smoke-report.json`; screenshots `register-form-filled.png`, `post-register-protected-route.png`, `login-form-filled.png`, `post-login-protected-route.png` | `browser-auth-smoke-report.json` status `passed`; `6` assertions passed for token persistence, `/v1/auth/me`, and protected-route rendering. | Stale proof linkage. The app-completion queue still lists Account access rows as `missing_test_link` even though route-level browser evidence exists. |
| User configuration: `/account/settings`, `/workspace/settings` | `web/src/features/settings/settings-routes.tsx`, `web/src/layout/shell.tsx`, `web/src/app-route-registry.ts`, `web/src/main.tsx` | `docs/planning/luc-5569-user-settings-proof-ladder.md`; `docs/ux/evidence/luc-5569-user-settings-proof/report.json`; six desktop/tablet/mobile screenshots | Report generated `2026-06-27T18:33:31.766Z`; routes rendered signed-in on desktop, tablet, and mobile; required text present; `consoleIssues=[]`. | Stale proof linkage. Existing browser proof should satisfy at least the frontend route evidence slice for User configuration. |
| Sales board: `/areas?area=03-sprzedaz&view=overview` | Selected-area Sales Management board under the departments/areas route surface | `docs/planning/luc-5624-sales-context-and-board-proof.md`; `docs/ux/evidence/luc-5624-sales-board-proof/report.json`; desktop/tablet/mobile screenshots | Report generated `2026-06-27T19:05:48.598Z`; signed-in route rendered; required Sales text and blocked-write-action text present; `consoleIssues=[]`. | Existing proof is valid route/browser evidence. It should not trigger duplicate frontend work. |
| Finance board: `/areas?area=07-finanse&view=overview` | Selected-area Finance and Billing board under the departments/areas route surface | `docs/planning/luc-5433-finance-browser-proof-ladder.md`; `docs/ux/evidence/luc-5433-finance-browser-proof/report.json`; desktop/tablet/mobile screenshots | Report generated `2026-06-21T02:39:37.409Z`; signed-in route rendered; required Finance text present; `consoleIssues=[]`. | Existing proof is valid route/browser evidence. It should not trigger duplicate frontend work. |

## App-Completion Readback

Current `docs/status/app-completion-index.json` was generated
`2026-06-30T19:58:17.204Z` and reports:

- `374` items
- `7` user flows
- `0` browser/screenshot review rows
- `363` missing test links
- `0` missing doc links
- `0` blocked rows

The priority queue already includes proof documents such as
`docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`, but their
linked browser reports and screenshots are not reflected as satisfying evidence
for the related route/component rows.

## Acceptance Criteria

- [x] Existing evidence reports/images were inspected.
- [x] At least one current frontend flow was mapped to route/component evidence.
- [x] The gap was classified as stale linkage, missing proof, or a UI defect.
- [x] No duplicate UI proof or dev server was started without a targeted need.
- [x] Next owner/action is explicit.

## Result Report

Status: `VERIFIED_STALE_LINKAGE`.

The inspected assets show existing frontend/browser proof for Account access,
User configuration, Sales board, and Finance board. No fresh frontend defect was
found in this heartbeat. The current app-completion gap is stale or missing
proof linkage: generated rows still report aggregate `missing_test_link` debt
and `0` browser-review records even where issue packets, JSON browser reports,
and screenshots exist.

Follow-up created: [LUC-6696](/LUC/issues/LUC-6696) for the Documentation
Steward to inspect and repair or explicitly classify the app-completion proof
association path. The follow-up should teach the app-completion/architecture
proof linker to associate planning proof packets and
`docs/ux/evidence/**/report.json` artifacts with matching route/component rows,
or record why the generated indexes cannot consume browser reports yet. Do not
request duplicate frontend/browser proof for these four flows unless a future
snapshot exposes a concrete route failure, stale screenshot, or missing
evidence file.

Source-control closure: this packet is a docs/evidence curation artifact in the
existing shared mixed-dirty Roost worktree. Commit was not created in this
heartbeat because the branch already contains many unrelated ahead/untracked
planning and UX evidence artifacts. Push status: not needed. Deploy impact:
none.
