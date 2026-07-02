# LUC-5669 Focused QA Selection For Route Proof Signals

## Task Contract

Task Type: verification

Current Stage: verification

Deliverable For This Stage: focused QA selection for the remaining concrete
route-shaped proof signals from [LUC-5666](/LUC/issues/LUC-5666), with local
proof only where needed.

Goal: decide whether `USE /auth`, `USE /v1/auth`, and `USE /dashboard` still
require new QA proof, or whether they are covered/evidence-link debt.

Scope:

- Read `docs/planning/luc-5666-known-state-evidence-and-architecture-baseline.md`.
- Inspect the concrete top-200 route-shaped rows: `USE /auth`,
  `USE /v1/auth`, and `USE /dashboard`.
- Treat `/v1/auth` as already verified by [LUC-5661](/LUC/issues/LUC-5661)
  unless fresh regression evidence appears.
- Decide whether `USE /dashboard` is evidence-link debt or needs the smallest
  local proof.
- Do not run protected production smoke, deploy, restart, mutate production,
  access secrets, or broaden into duplicate flow reruns.

Implementation Plan:

1. Read the [LUC-5666](/LUC/issues/LUC-5666) baseline and current
   app-completion route-shaped rows.
2. Inspect `src/app.ts`, `src/modules/auth/auth.routes.ts`,
   `src/modules/dashboard/dashboard.routes.ts`, and `src/tests/api.test.ts`.
3. Run the smallest local route/API validation needed to classify
   `USE /dashboard`.
4. Record the selection and update durable state.

Acceptance Criteria:

- The packet names the next proof, or closes the route signal as already
  covered/evidence-link debt.
- Any proof run is local and minimal.
- Broad Auth/account, Settings, Sales, Finance, Assets, Relationships,
  Product/Delivery, Google Drive OAuth, and subscription reruns are avoided
  unless concrete fresh regression evidence appears.

Definition Of Done:

- Route selection is recorded with source files and command evidence.
- State/context files reflect the current QA confidence classification.
- Paperclip issue has a final disposition.
- No protected action occurred.

## Findings

The [LUC-5666](/LUC/issues/LUC-5666) baseline narrowed the concrete top-200
route-shaped app-completion rows to:

| Signal | Current classification | Evidence |
| --- | --- | --- |
| `USE /auth` | covered / evidence-link debt | `src/app.ts` mounts `authRouter` at `/auth`; existing API tests cover `/auth/register`, `/auth/login`, and `/auth/me`; [LUC-5661](/LUC/issues/LUC-5661) also replayed the auth suite while adding alias parity. |
| `USE /v1/auth` | verified | [LUC-5661](/LUC/issues/LUC-5661) added and passed API proof for `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/me`, wrong-password denial, and invalid bearer denial. |
| `USE /dashboard` | covered / evidence-link debt | `src/app.ts` mounts `dashboardRouter` at `/dashboard` and `/v1/dashboard`; `src/tests/api.test.ts` already proves `GET /v1/dashboard/command` with dashboard summary, department signal, next action, blocked assignment action, and read-only agent packet assertions. |

No fresh regression evidence was found. `USE /dashboard` does not need a new
repair lane from this issue; it needs evidence-link/scanner curation so the
app-completion row can connect to the existing `GET /v1/dashboard/command`
proof.

## Evidence Collected

Code inspection:

- `src/app.ts` mounts protected routes on both unversioned and `/v1` surfaces.
  `dashboardRouter` is mounted at `/dashboard` and therefore also
  `/v1/dashboard`.
- `src/modules/dashboard/dashboard.routes.ts` implements `GET /command` as a
  read-only command-center packet with summary counts, department signals,
  priority items, next actions, blocked actions, and an `agentPacket.mode` of
  `read_only_command_center`.
- `src/tests/api.test.ts` asserts MCP manifest exposure for
  `companycore_get_dashboard_command` at `/v1/dashboard/command` with
  `dashboard:read`, `riskLevel=read`, and `requiresApproval=false`.
- `src/tests/api.test.ts` calls `/v1/dashboard/command` and asserts open
  tasks, pending approvals, workforce entities, Drive files, Operations
  department signal target, priority array, `review_approvals` next action,
  `assign_human_or_agent_from_dashboard` blocked action, and
  `agentPacket.mode === read_only_command_center`.

Local validation:

- `npm run check:route-capabilities`: PASS. Checked `180` manifest routes and
  `35` route files; status `ok`.
- `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5669-postgres
  COMPANYCORE_TEST_DB_PORT=55569
  COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local`: PASS.
  Build passed, `31` migrations applied, seed passed, and Node API tests
  passed `7/7`.

Cleanup evidence:

- `docker ps -a --filter "name=^/companycore-luc-5669-postgres$"` returned no
  container.
- `Get-NetTCPConnection -LocalPort 55569` returned no listener.
- `Get-Process chrome-headless-shell` returned no process.

## Selection

Selected next proof: none.

Reason: the remaining concrete route-shaped signals are either already verified
or covered by existing local API proof. `USE /dashboard` is evidence-link debt,
not a new product/runtime gap.

Next owner/action: Docs/Architecture or scanner curation should map
`USE /dashboard` to the existing `/v1/dashboard/command` API proof and the
dashboard command architecture nodes. QA should not run broad duplicate Auth,
Dashboard, Settings, Sales, Finance, Assets, Relationships, Product/Delivery,
Google Drive OAuth, or subscription proof unless a future refresh surfaces a
concrete unverified runtime row or fresh regression.

## Result Report

Status: verified and closed as QA selection.

Files changed: this packet plus source-of-truth state/context updates.

Validation: route-capability PASS; local API harness PASS with dashboard proof
included.

Deployment impact: none.

Residual risk: app-completion still reports broad missing-test-link debt, but
this issue found no remaining concrete route-shaped runtime gap. The remaining
work is evidence-link/scanner curation, not QA repair.
