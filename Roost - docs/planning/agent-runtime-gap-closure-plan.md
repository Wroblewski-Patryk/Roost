# Agent Runtime Gap Closure Plan

This plan converts the current post-CRUD gaps into executable tasks. It is
derived from `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`,
`.codex/context/PROJECT_STATE.md`, `docs/operations/post-deploy-smoke.md`, and
`docs/operations/agent-runtime-coverage-ledger.csv`.

## Gap Summary

- Agent CRUD routes are deployed and production-smoked, but service API key
  scopes are not yet enforced per route.
- `/v1/connection` exposes route discovery and capabilities, but agents do not
  yet have schema-level payload metadata or a reusable generated contract.
- The agent playbook exists, but the smoke/training flow is still manual or
  one-off.
- Owner API-key management supports scopes at the API level, but the web
  console does not yet guide scoped agent key creation and rotation.
- Agent event read paths are production-smoked, but positive ack behavior still
  needs a controlled pending-event smoke.
- Google Drive is implemented server-side, and 2026-05-14 production evidence
  verified owner OAuth consent plus selected numbered-root import.
- Deeper web-console editing surfaces remain intentionally deferred until the
  API and security foundation is solid.
- Release automation remains a P2 reliability gap because the latest deployed
  runtime used the approved manual VPS rollover path.
- Paperclip and OpenJarvis upstream source merges remain blocked by external
  GitHub write access.

## Execution Order

1. Enforce service-key scopes before improving agent convenience.
2. Make the agent contract more machine-readable.
3. Add a repeatable agent training/smoke script.
4. Add owner UI for scoped key creation and rotation.
5. Verify positive agent-event ack behavior.
6. Keep Google Drive import/readback smoke in future Drive contract changes.
7. Continue web-console editing slices.
8. Improve deploy automation.
9. Retry blocked upstream source merges when access is available.

## AGRUN-001 Agent Runtime Gap Plan

- Task Type: planning
- Current Stage: done
- Deliverable For This Stage: coverage ledger plus executable queue for agent
  runtime gaps.
- Status: DONE
- Owner: Planner
- Priority: P0
- Coverage Ledger Rows: AGRUN-COV-001 through AGRUN-COV-009
- Iteration: 1
- Operation Mode: BUILDER

### Goal

Turn loose post-CRUD gaps into a prioritized, testable implementation queue.

### Scope

- `docs/operations/agent-runtime-coverage-ledger.csv`
- `docs/planning/agent-runtime-gap-closure-plan.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/PROJECT_STATE.md`

### Implementation Plan

1. Cross-check active queue files, project state, open decisions, and recent
   smoke evidence.
2. Identify gaps that affect agent safety, onboarding, runtime confidence, or
   deployability.
3. Create a coverage ledger and executable task contracts.
4. Activate the first safe tasks in the canonical queue.

### Acceptance Criteria

- Coverage ledger rows exist for all confirmed current gaps.
- The first executable tasks are marked `READY`.
- External blockers remain explicitly `BLOCKED` instead of hidden in backlog.
- Planning files and task board are synchronized.

### Definition of Done

- `git diff --check` passes.
- The plan can be followed one task at a time.
- No runtime behavior changes are introduced by this planning slice.

### Result Report

- Planned in this document.

## AGRUN-002 Service Key Scope Enforcement

- Task Type: security/backend
- Current Stage: done
- Deliverable For This Stage: route-level capability enforcement for service
  API keys.
- Status: DONE
- Owner: Backend Builder
- Priority: P0
- Coverage Ledger Rows: AGRUN-COV-001
- Iteration: 2
- Operation Mode: BUILDER

### Goal

Make `api_keys.scopes` real by denying service-key requests whose scopes do not
cover the target route capability, while preserving owner bearer-token access.

### Scope

- `src/auth/api-key.middleware.ts`
- `src/modules/connection/connection.routes.ts`
- route registration or capability metadata in `src/app.ts`
- `src/modules/api-keys/api-keys.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/operations/agent-companycore-api-playbook.md`
- `docs/operations/agent-runtime-coverage-ledger.csv`

### Implementation Plan

1. Inspect current auth middleware, route mounting order, and adapter manifest
   capability names.
2. Add a single shared capability map that route enforcement and
   `/v1/connection` can reuse.
3. Treat empty API-key scopes as current broad compatibility only if explicitly
   documented, or migrate/mark existing production keys as broad before
   enforcing narrow scopes.
4. Enforce required capability for service-key requests and return `403
   forbidden` on mismatch.
5. Add tests for allowed scoped key, denied scoped key, broad legacy key, and
   owner bearer-token behavior.
6. Update docs and run local validation.

### Acceptance Criteria

- A service key with only `notes:read` can read notes but cannot write notes.
- A service key missing `agent-events:ack` cannot ack agent events.
- Owner bearer-token requests are not blocked by service-key scopes.
- `/v1/connection` reports capabilities that match the authenticated key.
- Existing production agent keys keep working through an explicit broad-scope
  compatibility decision or migration.

### Definition of Done

- `npm run build`, `npm test`, and `git diff --check` pass.
- Protected production smoke verifies at least one denied scoped-key request
  and one allowed scoped-key request.
- Security docs and the agent playbook are updated.

### Result Report

- Implemented local route-capability enforcement for service keys.
- Existing empty and legacy `adapter:*` scopes remain broad compatibility for
  deployed Jarvis/Paperclip keys.
- Local tests cover a scoped notes-read key that can read notes but cannot
  write notes or ack agent events, while owner bearer-token writes remain
  unaffected.
- Production release evidence passed on 2026-05-06. A temporary scoped service
  key with `connection:read` and `notes:read` could read notes, while
  `POST /v1/notes` returned `403`.

## AGRUN-003 Machine-Readable Agent Contract

- Task Type: backend/docs
- Current Stage: done
- Deliverable For This Stage: agent-readable route contract that includes
  capabilities, payload expectations, and safe error metadata.
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Coverage Ledger Rows: AGRUN-COV-002
- Iteration: 3
- Operation Mode: ARCHITECT

### Goal

Let agents learn the CompanyCore API from the app itself without guessing
payloads from prose docs.

### Scope

- `src/modules/connection/connection.routes.ts`
- optional shared route contract module under `src/`
- `docs/API.md`
- `docs/operations/agent-companycore-api-playbook.md`
- `src/tests/api.test.ts`

### Implementation Plan

1. Reuse existing adapter manifest routes and capability names.
2. Add compact schema metadata for common request bodies and route parameters,
   either in `/v1/connection` or a dedicated manifest route.
3. Include stable safe error codes per route group.
4. Test that key business routes and provider lifecycle routes expose contract
   metadata.
5. Update docs so agents treat the manifest as the first source of truth.

### Acceptance Criteria

- The manifest tells an agent how to construct create/update payloads for core
  records.
- The contract includes expected auth, capability, and common error behavior.
- Tests fail if critical CRUD routes disappear from the contract.

### Definition of Done

- `npm run build`, `npm test`, and `git diff --check` pass.
- Production smoke verifies the manifest metadata is present.

### Result Report

- `/v1/connection` now includes `schemaVersion`, schema hints for agent, note,
  decision, agent-log, and agent-event ack payloads, plus safe error metadata.
- Local tests assert manifest schema/error metadata.
- Production release evidence passed on 2026-05-06. Jarvis and Paperclip
  `/v1/connection` responses exposed manifest `schemaVersion = 2026-05-06` and
  note schema metadata.

## AGRUN-004 Reusable Agent Training Smoke

- Task Type: backend/ops
- Current Stage: done
- Deliverable For This Stage: reusable local and production-safe smoke script
  for teaching agents read/write behavior.
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Coverage Ledger Rows: AGRUN-COV-003
- Iteration: 4
- Operation Mode: BUILDER

### Goal

Give any new agent a repeatable, secret-safe way to prove it can read and write
CompanyCore memory through the deployed API.

### Scope

- `scripts/*`
- `package.json`
- `docs/operations/agent-companycore-api-playbook.md`
- `docs/operations/post-deploy-smoke.md`
- `src/tests/api.test.ts` if reusable helpers are needed

### Implementation Plan

1. Convert the manual playbook smoke into a Node script.
2. Require `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.
3. Verify `/v1/connection`, create an agent or reuse an existing named agent,
   create/read/update/archive a note, write an agent log, and optionally write a
   decision.
4. Redact keys and fail closed on missing capability or unexpected status.
5. Add package script and docs.

### Acceptance Criteria

- Missing env exits non-zero without printing secrets.
- The script succeeds against a disposable local workspace.
- The script succeeds against production using an approved service key.
- Created cleanup records are archived or clearly marked as smoke records.

### Definition of Done

- `npm run build`, `npm test`, script local smoke, and `git diff --check` pass.
- Production smoke result is recorded without raw keys.

### Result Report

- Added `scripts/agent-training-smoke.mjs` and `npm run agent:training-smoke`.
- The script verifies capabilities, schema metadata, agent creation, note
  create/read/update/archive, and agent-log write behavior without printing raw
  keys.
- Production release evidence passed on 2026-05-06. Jarvis and Paperclip
  production keys both passed `npm run agent:training-smoke`.

## AGRUN-005 Scoped Agent Key Owner UI

- Task Type: security/frontend
- Current Stage: done
- Deliverable For This Stage: owner-console flow for creating, rotating, and
  deactivating scoped agent keys.
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Coverage Ledger Rows: AGRUN-COV-004
- Iteration: 5
- Operation Mode: TESTER

### Goal

Make safe agent credential management usable without manual API calls.

### Scope

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/modules/api-keys/api-keys.routes.ts` if response shape needs a small
  compatible addition
- `docs/API.md`
- `docs/operations/agent-companycore-api-playbook.md`

### Implementation Plan

1. Inspect the existing `/settings/api` surface and API key routes.
2. Add scoped presets for common agents, such as read-only, memory writer,
   event consumer, and operator.
3. Show raw keys only once after creation.
4. Add deactivate/rename/scope-edit states with confirmation where needed.
5. Browser-test desktop and mobile flows.

### Acceptance Criteria

- Owner can create a named scoped key for an agent.
- Owner can deactivate a key and see inactive state.
- UI never displays old raw key material.
- Scope presets map to capabilities enforced by AGRUN-002.
- Loading, empty, error, and success states are local to the API-key action.

### Definition of Done

- `node --check public/app.js`, `npm run build`, `npm test`, browser smoke,
  and `git diff --check` pass.

### Result Report

- Added a guided Agent service keys panel to `/settings/api`.
- Added scoped presets for read-only agents, memory writers, event consumers,
  and operators.
- The UI creates owner-only scoped keys through `POST /v1/api-keys`, shows raw
  key material only in the one-time creation panel, lists existing keys without
  raw key material, deactivates keys through `PATCH /v1/api-keys/:id`, and
  rotates by creating a replacement with the same scopes before deactivating
  the previous key.
- Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55457`,
  and authenticated local Playwright desktop/mobile browser smoke.

## AGRUN-006 Agent Event Ack Positive Smoke

- Task Type: backend/verification
- Current Stage: done
- Deliverable For This Stage: tested positive ack path for agent event
  consumers.
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Coverage Ledger Rows: AGRUN-COV-005
- Iteration: 6
- Operation Mode: ARCHITECT

### Goal

Prove that agents can safely consume and acknowledge real pending work, not
only read an empty event queue.

### Scope

- `src/modules/agent-events/*`
- event/outbox creation helpers
- `src/tests/api.test.ts`
- `scripts/*` if smoke helper support is useful
- `docs/operations/post-deploy-smoke.md`

### Implementation Plan

1. Inspect the current agent event routes and outbox schema.
2. Add a test that creates a controlled target event, reads it with a service
   key, acknowledges it, and verifies it no longer appears as pending.
3. Add a production-safe smoke path that creates or reuses a controlled event
   without touching provider inbox rows directly.
4. Record evidence.

### Acceptance Criteria

- A pending event for `paperclip` or `jarvis` is visible to the target agent.
- `POST /v1/agent-events/:id/ack` marks it processed for the workspace.
- Re-ack is idempotent or returns a documented safe response.
- Cross-workspace ack is denied.

### Definition of Done

- `npm run build`, `npm test`, production protected ack smoke, and
  `git diff --check` pass.

### Result Report

- Local tests now create controlled agent outbox events, read them through
  `/v1/agent-events`, acknowledge one through
  `POST /v1/agent-events/:id/ack`, and verify it becomes `delivered`.
- Production positive ack smoke passed on 2026-05-06. A controlled
  Paperclip-targeted event was read through `GET /v1/agent-events`, acknowledged
  through `POST /v1/agent-events/:id/ack`, and no longer appeared as pending.

## AGRUN-007 Google Drive Owner Consent And First Import

- Task Type: release/verification
- Current Stage: done
- Deliverable For This Stage: target-environment proof for real Google Drive
  OAuth consent and selected-folder import.
- Status: DONE
- Owner: Ops/Release
- Priority: P1
- Coverage Ledger Rows: AGRUN-COV-006
- Iteration: 7
- Operation Mode: BUILDER

### Goal

Complete the first real Google Drive connection and prove agents can read
imported Drive metadata/content through CompanyCore.

### Scope

- Production owner console at `/settings/drive`
- `docs/operations/google-drive-owner-setup.md`
- `docs/operations/post-deploy-smoke.md`
- existing Google Drive API routes only

### Implementation Plan

1. Approved Google OAuth credentials and owner consent were provided.
2. Drive was connected through the owner console.
3. The numbered department root folders `00`-`12` were selected, imported, and
   mapped to operating areas.
4. `/v1/google-drive/files` and descendant scope readback were verified through
   protected production access.
5. Residual risks were moved to future freshness/content-quality work.

### Acceptance Criteria

- Owner consent completes without token leakage.
- Selected folder import stores Drive metadata without duplicates.
- Agent service key can read imported metadata through CompanyCore.
- No raw Google token is returned to browser, agent, docs, logs, or terminal
  output.

### Definition of Done

- Production smoke evidence is recorded.
- Any test folder/content used for smoke is documented or cleaned up.

### Result Report

- 2026-05-14 production evidence closed AGRUN-007. Production ran commit
  `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth was active; protected
  Google Drive smoke passed; owner folder discovery returned 172 folders; 13
  numbered roots (`00`-`12`) were selected/imported/mapped; readback returned
  748 Drive items, 171 folders, `unassignedCount=0`, and descendant scope
  `mismatches=[]`.

- Blocked until real Google OAuth/owner action is available.

## AGRUN-008 Route-Level Business Editing Surfaces

- Task Type: frontend/backend
- Current Stage: done
- Deliverable For This Stage: evidence reconciliation for completed typed
  route-level editor slices.
- Status: DONE
- Owner: Frontend Builder
- Priority: P2
- Coverage Ledger Rows: AGRUN-COV-007
- Iteration: 8
- Operation Mode: BUILDER

### Goal

Let human operators use the same safe CRUD APIs that agents use, one route
surface at a time.

### Scope

- One selected owner-console route per implementation task
- Existing business CRUD APIs
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- focused tests and docs

### Implementation Plan

1. Select one route-level surface, starting with the highest operator value.
2. Add create/edit/archive controls backed by existing APIs.
3. Include local loading, empty, error, and success states.
4. Browser-test desktop, tablet, and mobile.
5. Repeat as separate tiny tasks.

### Acceptance Criteria

- No placeholder or non-functional controls ship.
- UI uses existing API routes and safe error messages.
- Records remain workspace-scoped and refresh after navigation reload.

### Definition of Done

- `node --check public/app.js`, `npm run build`, `npm test`, browser smoke,
  and `git diff --check` pass for each slice.

### Result Report

- Completed on 2026-05-08 as an evidence-reconciliation slice.
- Existing V2WEB slices already implemented typed create/edit/archive
  workbenches for `/data/notes`, `/data/projects`, `/data/clients`,
  `/data/task-lists`, and `/data/tasks`.
- Local source contains the typed editor functions:
  `renderNoteEditor`, `renderProjectEditor`, `renderClientEditor`,
  `renderTaskListEditor`, and `renderTaskEditor`.
- Production `https://companycore.luckysparrow.ch/app.js` contains those same
  editor markers plus `taskEditorDueDate`.
- No additional placeholder edit surface was added.

## AGRUN-009 Deploy Automation Reliability

- Task Type: ops/release
- Current Stage: done
- Deliverable For This Stage: verified deployment-path verdict and operations
  evidence reconciliation.
- Status: DONE
- Owner: Ops/Release
- Priority: P2
- Coverage Ledger Rows: AGRUN-COV-008
- Iteration: 9
- Operation Mode: ARCHITECT

### Goal

Reduce release drift by making the deploy path either reliably automatic from
`main` or explicitly one-command and documented.

### Scope

- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/rollback-and-recovery.md`
- VPS/Coolify deployment observation only

### Implementation Plan

1. Observe whether a harmless pushed commit triggers the expected Coolify
   deploy.
2. If auto deploy is unavailable, document the approved one-command manual
   rollover path using the current proven pattern.
3. Verify build metadata and rollback pointer after the chosen path.

### Acceptance Criteria

- Operators know exactly how the next production deploy happens.
- Health reports the expected build commit after deploy.
- Rollback container/image pointer is current.

### Definition of Done

- Public health smoke and docs update pass.
- No secret material is stored in docs or scripts.

### Result Report

- Completed on 2026-05-08 as an evidence-reconciliation slice.
- Public health, v1 health, and web root returned `200`.
- `/health` reported build commit
  `71f3eb3b063ea68226a1736c727c52882b33f27a`.
- The planning-only `63348d6` auto-deploy success note is not treated as
  superseding operations truth because no matching post-deploy smoke entry was
  found.
- Manual VPS backend rollover remains the approved release path until a future
  push-to-running-image smoke proves reliable auto-deploy.
- Residual risk: VPS container inventory could not be refreshed from this
  local session because the available SSH key/password path was rejected.

## AGRUN-010 Upstream Agent Source Merge Execution

- Task Type: release
- Current Stage: planning
- Deliverable For This Stage: upstream PRs or managed handoff branches for
  Paperclip and OpenJarvis connector changes.
- Status: BLOCKED
- Owner: Ops/Release
- Priority: P2
- Coverage Ledger Rows: AGRUN-COV-009
- Iteration: 10
- Operation Mode: TESTER

### Goal

Close the source/runtime drift between production agent behavior and upstream
Paperclip/OpenJarvis repositories.

### Scope

- External Paperclip repository
- External OpenJarvis repository
- `docs/operations/v1-source-handoff-package.md`
- `docs/operations/paperclip-companycore-adapter-runbook.md`
- `docs/operations/jarvis-companycore-update-runbook.md`

### Implementation Plan

1. Wait for write access or an approved fork/PR route.
2. Push or open PRs for the already validated CompanyCore connector changes.
3. Rerun targeted upstream tests.
4. Update CompanyCore handoff docs with PR URLs and status.

### Acceptance Criteria

- Paperclip source handoff has an upstream PR/branch or an explicit managed
  patch owner.
- OpenJarvis source handoff has an upstream PR/branch or an explicit managed
  patch owner.
- Targeted tests are re-run after replaying the changes.

### Definition of Done

- Source links and validation evidence are recorded.
- Any remaining permission blocker is explicit.

### Result Report

- Blocked by external GitHub write access.
