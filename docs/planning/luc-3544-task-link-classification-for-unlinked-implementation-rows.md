# LUC-3544 Task-Link Classification For Unlinked Implementation Rows

Status: DONE
Task type: documentation evidence and task-link classification
Current stage: verification
Last updated: 2026-06-11
Owner: Documentation Steward
Parent: [LUC-3533](/LUC/issues/LUC-3533)

## Goal

Classify the remaining unlinked implementation rows from the LUC-3533 known
state after [LUC-3543](/LUC/issues/LUC-3543) removed generated artifact noise,
without changing runtime code, scanner code, schemas, deployment state, secrets,
or production services.

## Scope

- Source report: `docs/status/task-synchronization-report.md`
- Complete source data: `docs/graphs/architecture-health.json`
- Prior lane packet:
  `docs/planning/luc-3533-known-state-repair-lanes.md`
- Scanner hygiene packet:
  `docs/planning/luc-3543-scanner-artifact-hygiene-known-state-reports.md`
- QA sibling packet:
  `docs/planning/luc-3545-first-proof-ladder-from-implementation-without-tests.md`

## Evidence Reviewed

| Evidence | Result |
| --- | --- |
| `docs/status/task-synchronization-report.md` | Reports `tasks without architecture links=0`, `implementation entities without task links=173`, and `verified entities without proof evidence=0`; markdown renders the first `80` implementation rows only because the report generator slices display items with `.slice(0, 80)`. |
| `docs/graphs/architecture-health.json` | Complete `signals.implementation_without_task.items` list contains all `173` rows. |
| `docs/planning/luc-3533-known-state-repair-lanes.md` | Defines this lane as task-link classification after generated artifacts and QA proof ladder were split to child lanes. |
| `docs/planning/luc-3543-scanner-artifact-hygiene-known-state-reports.md` | Confirms generated `.tmp/web-qa-*` and `public/react/assets` rows were removed; remaining rows are real source/script candidates. |
| `rg` over `docs/planning`, `.codex/context`, `.agents/state`, `docs/architecture`, and `docs/operations` | Found existing historical/task evidence for many buckets, especially Process Core, route capability checks, shared components, ClickUp/Google Drive integration, and web surface work. |

## Classification Summary

The remaining `173` rows are classified as real implementation or registry
surface candidates, not disposable generated artifacts.

| Bucket | Count | Classification | Evidence-backed next action |
| --- | ---: | --- | --- |
| B1 app route mounts | 43 | `present in code, behavior unknown` at mount-row granularity. These are Express app-level mount points in `src/app.ts`, not standalone feature work. | Architecture/Docs should either add a scanner relation rule that maps mount rows to the mounted module/task evidence, or backfill a small route-mount task group. Do not create 43 separate implementation tasks. |
| B2 shared web components | 4 | `implemented but task-link incomplete`; historical UI task contracts mention these paths. | Backfill architecture/task links to shared component contracts such as operations shared selector/form work, web foundation audits, and web QA contracts. |
| B3 scripts and architecture/ops checks | 17 | `implemented but task-link incomplete`; most are architecture, smoke, or proof scripts. | Backfill to architecture evidence-system, smoke, deploy-gate, or proof-bundle tasks. Protected smoke scripts remain gated for execution. |
| B4 seed/bootstrap | 1 | `implemented but task-link incomplete`; `prisma/seed.ts` is bootstrap/runtime setup support. | Link to backend foundation or seed/bootstrap policy task, not a new feature task. |
| B5 backend platform/auth/runtime | 16 | `implemented but task-link incomplete`; shared API platform/auth/runtime files have many historical task references. | Backfill to API/auth/security/runtime task groups and preserve separate Process Core ownership for current dirty changes. |
| B6 backend integrations | 16 | `implemented but task-link incomplete`; ClickUp and Google Drive integration files have historical V1/V2 evidence. | Backfill integration task links by provider group; no new implementation issue unless proof finds a current defect. |
| B7 backend module route/service files | 41 | `implemented but task-link incomplete`; these are real module route/service files. | Backfill module route files to their module-level task families. Process Core row should remain linked to [LUC-2713](/LUC/issues/LUC-2713) and QA proof [LUC-3545](/LUC/issues/LUC-3545). |
| B8 operating model catalog helpers | 3 | `implemented but task-link incomplete`; operating model helpers underpin ClickUp-shaped operating model work. | Backfill to operating model registry and ClickUp structure tasks. |
| B9 web API client/types | 5 | `implemented but task-link incomplete`; shared frontend API client/type surface. | Backfill to web console foundation/API-client task group. |
| B10 web route/layout/i18n/hooks | 25 | `implemented but task-link incomplete`; React route, layout, i18n, and data hook rows. | Backfill to web route consolidation, department-route, web shell, and i18n task families. |
| B11 build configuration | 2 | `implemented but task-link incomplete`; Vite/Tailwind config rows. | Backfill to web build/foundation tasks, not runtime feature work. |

## Detailed Bucket Contents

| Bucket | Representative rows |
| --- | --- |
| B1 | `GET /`; `USE /agent-events`; `USE /agent-logs`; `USE /agents`; `USE /api-keys`; `USE /assets`; `USE /auth`; `USE /clients`; `USE /commercial-exceptions`; `USE /company-os`; `USE /connection`; `USE /dashboard`; `USE /deals`; `USE /decisions`; `USE /departments`; `USE /events`; `USE /finance`; `USE /goals`; `USE /google-drive`; `USE /health`; `USE /intake`; `USE /integration-settings`; `USE /interactions`; `USE /mcp`; `USE /notes`; `USE /operating-graph`; `USE /operating-model`; `USE /operations`; `USE /pipeline-stages`; `USE /process-core`; `USE /projects`; `USE /relationships`; `USE /sales`; `USE /strategy`; `USE /targets`; `USE /task-lists`; `USE /tasks`; `USE /v1`; `USE /v1/auth`; `USE /v1/health`; `USE /v1/webhooks/clickup`; `USE /workforce`; `USE /workspaces`. |
| B2 | `cc-field.tsx`; `cc-notice.tsx`; `cc-resource-selector.tsx`; `cc-text-input.tsx`. |
| B3 | `adapter-smoke.mjs`; `aog-deploy-smoke.mjs`; `backfill-architecture-nodes.mjs`; `build-architecture-chain-hardening-worklist.mjs`; `build-architecture-proof-bundle.mjs`; `build-architecture-registry-catalog.mjs`; `check-architecture-command-contract.mjs`; `check-architecture-evidence-cardinality.mjs`; `check-architecture-graph-artifact-consistency.mjs`; `check-architecture-pipeline-nodes.mjs`; `check-architecture-proof-bundle-gate.mjs`; `check-route-capabilities.mjs`; `clickup-production-bootstrap.mjs`; `google-drive-production-smoke.mjs`; `print-architecture-status.mjs`; `sync-architecture-chains.mjs`; `sync-architecture-doc-baseline.mjs`. |
| B4 | `prisma/seed.ts`. |
| B5 | `src/app.ts`; `src/server.ts`; `src/auth/agent-key-profiles.ts`; `src/auth/api-key.middleware.ts`; `src/auth/api-key.ts`; `src/auth/capabilities.ts`; `src/auth/password.ts`; `src/auth/token.ts`; `src/config/env.ts`; `src/db/prisma.ts`; `src/health/health.routes.ts`; `src/mcp/manifest.ts`; `src/middleware/api-error.ts`; `src/middleware/async-handler.ts`; `src/middleware/error-handler.ts`; `src/middleware/security.ts`. |
| B6 | `src/integrations/clickup/*`; `src/integrations/google-drive/*`; `src/integrations/errors.ts`; `src/integrations/integration-settings.service.ts`; `src/integrations/secrets.ts`; model rows `ClickUpClient`, `GoogleDriveClient`, and `IntegrationError`. |
| B7 | Route/service rows under `src/modules/*`, including agents, API keys, assets, auth, clients, commercial exceptions, Company OS, workflow definition drafts, connection, dashboard, deals, decisions, departments, events, finance, goals, Google Drive, intake, integration settings, interactions, MCP, notes, operating graph, operating model, operations, pipeline stages, Process Core, projects, relationships, sales, strategy, targets, task lists, tasks, ClickUp webhooks, workforce, and workspaces. |
| B8 | `src/operating-model/catalog.ts`; `src/operating-model/clickup-structure.ts`; `src/operating-model/department-registry.ts`. |
| B9 | `web/src/api/auth-token.ts`; `web/src/api/client.ts`; `web/src/api/errors.ts`; `web/src/api/client.ts#AppApiError`; `web/src/types.ts`. |
| B10 | React auth, department, settings, public, owner-packet hook, i18n, language selector, messages, and shell rows under `web/src/features`, `web/src/hooks`, `web/src/i18n`, and `web/src/layout`. |
| B11 | `tailwind.config.mjs`; `vite.config.mjs`. |

## Decisions

- No rows are classified as generated artifact leftovers after
  [LUC-3543](/LUC/issues/LUC-3543). The generated-artifact issue is closed.
- No row is classified as obsolete solely from this documentation pass. Any
  obsolete/deprecated decision needs architecture or code-owner review.
- The route-mount rows should not be converted into individual feature tasks.
  They are scanner granularity debt and should be mapped to module-level route
  evidence or handled by scanner relation logic.
- The remaining debt is task-link/documentation hygiene, not evidence of a
  failing runtime behavior by itself.

## Recommended Follow-Up

| Priority | Owner | Action |
| --- | --- | --- |
| 1 | Documentation Steward / Architecture Docs | Backfill architecture task-link relations by bucket, starting with B1 route mounts and B7 module route/service files. |
| 2 | Core Backend Engineer | If desired, improve scanner/report output so `task-synchronization-report.md` either renders all rows or links to the complete JSON list; current markdown is capped at `80` rows. |
| 3 | QA & Verification | Continue using [LUC-3545](/LUC/issues/LUC-3545) for the first proof ladder instead of expanding this task-link classification lane into testing work. |
| 4 | Roost Project Manager / SCM sidecar | Keep source-control closure separate under the existing source-control closure lane because the worktree remains mixed. |

## Non-Actions

- No runtime code, schema, migration, scanner code, generated graph code,
  protected smoke, deploy, push, restart, production mutation, server/browser
  process, database process, or secret access occurred.
- No local validation process was started.
- Full `npm run validate` was not run because this documentation lane used
  generated report inspection and source search as the smallest sufficient
  verification.

## Result Report

[LUC-3544](/LUC/issues/LUC-3544) is complete for the classification scope. The
remaining `173` implementation-without-task-link rows are bucketed into
owner-ready documentation/backfill groups, with no residual generated-artifact
rows found and no evidence that the list should be treated as a runtime defect
queue.
