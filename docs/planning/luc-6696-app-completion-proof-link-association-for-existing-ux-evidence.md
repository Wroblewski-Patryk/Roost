# LUC-6696 App-Completion Proof-Link Association For Existing UX Evidence

Date: 2026-07-01
Issue: [LUC-6696](/LUC/issues/LUC-6696)
Parent context: [LUC-6156](/LUC/issues/LUC-6156)
Stage: verification

## Task Contract

- Goal: repair app-completion proof-link association for existing Roost UX
  evidence so already-verified browser/API proof packets are machine-linked to
  matching generated rows.
- Task Type: Documentation Steward / architecture evidence hygiene.
- Current Stage: verification.
- Deliverable For This Stage: scoped scanner override update, regenerated
  architecture-awareness and app-completion indexes, and source-control
  closure posture.

## Scope

Changed:

- `docs/architecture/scanner-overrides.json`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-proof-register.csv`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-graph.mmd`
- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`

Inspected existing proof artifacts:

- `docs/planning/luc-5561-auth-account-access-local-smoke-proof.md`
- `docs/ux/evidence/luc-5561-auth-account-access/browser-auth-smoke-report.json`
- `docs/planning/luc-5569-user-settings-proof-ladder.md`
- `docs/ux/evidence/luc-5569-user-settings-proof/report.json`
- `docs/planning/luc-5624-sales-context-and-board-proof.md`
- `docs/ux/evidence/luc-5624-sales-board-proof/report.json`
- `docs/planning/luc-5433-finance-browser-proof-ladder.md`
- `docs/ux/evidence/luc-5433-finance-browser-proof/report.json`

Exclusions:

- No product code, test code, runtime server, browser, Docker, database, push,
  deploy, protected smoke, provider action, credential access, or secret
  disclosure.

## Implementation Plan

1. Confirm the app-completion generator only clears missing-test-link risk from
   linked `test` entities or local test/spec/Playwright text.
2. Add targeted scanner overrides that classify the four existing proof packets
   as verified test evidence.
3. Add explicit `tests` links from those proof packets to matching auth,
   settings, sales, and finance generated entities.
4. Add missing `documents` links for API mount rows where test association
   exposed doc-link gaps.
5. Regenerate architecture-awareness and app-completion indexes.
6. Verify row-level and aggregate count movement.

## Proof-Link Associations Added

| Existing proof packet | Evidence route/API family | Association outcome |
| --- | --- | --- |
| [LUC-5561](/LUC/issues/LUC-5561) auth/account proof | `USE /auth`, `USE /v1/auth`, `/auth/login`, `/auth/register` | Linked as verified test evidence with existing browser report/screenshots. |
| [LUC-5569](/LUC/issues/LUC-5569) settings proof | `/account/settings`, `/workspace/settings` | Linked as verified browser test evidence. |
| [LUC-5624](/LUC/issues/LUC-5624) Sales board proof | `USE /sales`, `GET /v1/sales/context` | Linked as verified browser test evidence. |
| [LUC-5433](/LUC/issues/LUC-5433) Finance board proof | `USE /finance`, `GET /v1/finance/context` | Linked as verified browser test evidence. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-01T21:37:44.793Z`, `2780` entities, `6476` relations, `16345` files; override application `entityOverridesApplied=27`, `relationOverridesApplied=17`. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `374` items / `7` flows / `353` missing test links / `0` missing doc links / `0` blocked / `0` browser-review records. |
| Row readback | PASS | `USE /auth`, `USE /v1/auth`, `/auth/login`, `/auth/register`, `USE /sales`, and `USE /finance` now read back with `hasTest=true` and `hasDoc=true`; `/account/settings`, `/workspace/settings`, `GET /v1/sales/context`, and `GET /v1/finance/context` are no longer in the priority queue. |

## Acceptance Criteria

- [x] Existing UX/browser evidence was associated without rerunning duplicate
  browser proof.
- [x] Generated app-completion missing-test-link count moved downward.
- [x] Missing doc links stayed at `0` after the repair.
- [x] No product/runtime/deploy/protected action was performed.
- [x] Residual risk and source-control posture are recorded.

## Result Report

Status: `VERIFIED_DONE_NO_COMMIT`.

The stale proof-link association for the four existing UX evidence families was
repaired in the Roost architecture-awareness override layer. The current
app-completion index now reports `353` missing test links instead of the prior
`363`, while preserving `0` missing doc links and `0` blocked rows.

Important boundary: this does not claim new runtime behavior. It only teaches
the generated evidence model to consume already-existing proof packets and UX
artifacts. Remaining app-completion rows are still proof-link confidence debt
or implemented-needs-proof rows unless a future snapshot exposes a concrete
route/API/browser failure.

Source-control closure: not committed because the shared Roost worktree is
already heavily mixed dirty and `main` is ahead of `origin/main`; this task's
changes are not safely isolatable for a clean commit without a broader source
batching decision. Push status: not needed. Deploy impact: none.
