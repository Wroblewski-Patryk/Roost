# LUC-5659 Next Non-Duplicated Missing-Test Proof Ladder

## Header

- ID: [LUC-5659](/LUC/issues/LUC-5659)
- Title: [Roost] [QA] Select next non-duplicated app-completion missing-test proof ladder after [LUC-5656](/LUC/issues/LUC-5656)
- Task Type: QA verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Mission ID: LUC-5659-NEXT-NONDUPLICATED-MISSING-TEST-PROOF-LADDER
- Mission Status: VERIFIED_DONE

## Goal

Select the next useful app-completion missing-test proof ladder after
[LUC-5656](/LUC/issues/LUC-5656) without duplicating recent broad proof for
Auth/account access, User settings, Sales, Finance, Assets, Relationships, or
Product/Delivery surfaces.

## Scope

- Baseline packet:
  `docs/planning/luc-5656-known-state-evidence-and-architecture-baseline.md`
- Current app-completion snapshot:
  `docs/status/app-completion-index.md` and
  `docs/status/app-completion-index.json`
- Prior route map:
  `docs/planning/luc-5648-top-route-missing-test-link-map.md`
- Recent QA proof packets:
  - `docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`
  - `docs/planning/luc-5569-user-settings-proof-ladder.md`
  - `docs/planning/luc-5624-sales-context-and-board-proof.md`
  - `docs/planning/luc-5628-sales-context-and-board-local-qa-proof-after-luc-5623.md`
  - `docs/planning/luc-5647-subscription-entitlement-missing-test-proof-ladder.md`
- Code/evidence inspected:
  - `src/app.ts`
  - `src/tests/api.test.ts`
  - `web/src/features/auth/auth-pages.tsx`
  - `web/src/layout/shell.tsx`
  - `web/src/features/settings/settings-routes.tsx`

## Exclusions

No product code, schema, migration, test authoring, browser/server/database
startup, push, deploy, restart, protected smoke, production mutation, provider
action, credential access, or secret disclosure was performed.

## Selection Criteria

1. Prefer concrete route/API/browser surfaces over broad feature-capability or
   docs-only scanner records.
2. Exclude recently verified broad runtime lanes unless a fresh regression or
   exact missing assertion appears.
3. Prefer the smallest proof that reduces real ambiguity in the current
   app-completion queue.
4. Avoid rerunning local browser/API journeys that already have fresh proof
   packets.

## Current Evidence Readback

| Check | Evidence | Result |
| --- | --- | --- |
| [LUC-5656](/LUC/issues/LUC-5656) baseline | Architecture refresh PASS at `2026-06-27T21:04:14.754Z`; app-completion partial with `887` items / `7` flows / `860` missing test links / `0` blocked | PASS |
| Local app-completion file | `docs/status/app-completion-index.md` generated `2026-06-27T20:43:37.445Z`; `887` items / `7` flows / `860` missing test links / `0` blocked | PASS |
| Top route map | [LUC-5648](/LUC/issues/LUC-5648) identified `/v1/auth` alias parity as the only likely small real proof gap among top route-shaped records | PASS |
| Existing auth proof | [LUC-5561](/LUC/issues/LUC-5561) verifies registration/login browser flow and authenticated `/v1/auth/me` readback | VERIFIED |
| Existing auth/config API coverage | [LUC-5570](/LUC/issues/LUC-5570) added auth/config assertions but did not record `/v1/auth/register` or `/v1/auth/login` alias execution | PARTIAL |
| Code inspection | `src/app.ts` mounts `authRouter` at both `/auth` and `/v1/auth`; `src/tests/api.test.ts` only shows `/auth/register`, `/auth/login`, and `/auth/me`; web uses `/v1/auth/login`, `/v1/auth/register`, and `/v1/auth/me` | PASS |
| Duplicate check | Broad Auth/account access, User settings, Sales, Finance, Assets, Relationships, and Product/Delivery proof ladders already have recent evidence | PASS |

## Decision

Selected next proof ladder:

`Account access -> /v1/auth alias parity API proof`

The follow-up should add or map the smallest API assertion that proves the
versioned auth alias behaves like the already verified unversioned auth mount.
Recommended assertion scope:

- `POST /v1/auth/register` succeeds with the same owner/workspace bootstrap
  shape as `/auth/register`.
- `POST /v1/auth/login` succeeds for the registered owner and returns a bearer
  token.
- Optional, if the harness already has a token: `GET /v1/auth/me` returns the
  authenticated user/workspace context.
- Include one fail-closed check if cheap, such as invalid credentials or
  invalid bearer token, without expanding into a broad auth security rerun.

## Non-Selections

| Candidate | Decision | Reason |
| --- | --- | --- |
| Broad Account access browser proof | Do not rerun | [LUC-5561](/LUC/issues/LUC-5561) already verified browser registration, login, token persistence, protected route access, and `/v1/auth/me`. |
| Subscription and entitlement | Do not select | [LUC-5647](/LUC/issues/LUC-5647) found the visible debt is currently docs/scanner inference; concrete Finance, Sales, Assets, and People/Agents slices already have proof. |
| Google Drive OAuth authorize/exchange | Do not select as QA runtime proof | [LUC-5648](/LUC/issues/LUC-5648) found existing `src/tests/api.test.ts` coverage; this is evidence-link work unless a fresh regression appears. |
| Dashboard overview | Defer | Existing dashboard command tests and proof packets exist; route-map recommendation is evidence linking before fresh proof. |
| User configuration | Do not rerun | [LUC-5569](/LUC/issues/LUC-5569) already verified current settings routes at API/browser level. |

## Acceptance Criteria

- [x] [LUC-5656](/LUC/issues/LUC-5656) known-state output was used as the
      selection baseline.
- [x] Current app-completion top records were inspected.
- [x] Recent proof packets were checked to avoid duplicate broad proof.
- [x] A concrete next proof ladder was selected.
- [x] No runtime, protected, production, source-control, or credential action
      was taken.

## Result Report

Status: `VERIFIED_DONE`.

The next non-duplicated proof ladder after [LUC-5656](/LUC/issues/LUC-5656) is
a narrow Engineering Delivery / QA-test follow-up for `/v1/auth` alias parity.
This is smaller than a broad auth rerun and directly addresses the only
route-shaped top app-completion item where current code inspection did not find
an explicit API assertion.

Delegated follow-up: [LUC-5661](/LUC/issues/LUC-5661) was created for the Test
Automation Engineer to add or map the `/v1/auth` alias-parity API proof.

Files changed by this issue: this QA selection packet and source-of-truth state
notes only.

Commit status: not committed in this heartbeat because the workspace contains
pre-existing modified generated architecture files and many untracked sibling
planning/evidence packets owned by separate closure lanes.

Push status: not pushed.

Deploy impact: none.

Residual risk: the local app-completion singleton in the workspace still shows
the `2026-06-27T20:43:37.445Z` snapshot while [LUC-5656](/LUC/issues/LUC-5656)
records a fresher architecture baseline at `2026-06-27T21:04:14.754Z`. The
selected proof remains valid because both the current singleton and [LUC-5656](/LUC/issues/LUC-5656)
identify the same high-level missing-test pressure and [LUC-5648](/LUC/issues/LUC-5648)
already isolated `/v1/auth` alias parity as the smallest concrete route gap.
