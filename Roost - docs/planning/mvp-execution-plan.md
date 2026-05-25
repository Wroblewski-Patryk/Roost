# MVP Execution Plan

Status: historical v1 foundation plan. The approved v1 runtime scope is
achieved; use `.codex/context/TASK_BOARD.md`,
`.agents/state/next-steps.md`, `docs/planning/mvp-next-commits.md`, and
`docs/NEXT_STEPS.md` for current queue status.

CompanyCore v1 is a backend-only foundation. The implementation target is a
working operational flow:

```text
Owner registration -> workspace -> workspace settings -> ClickUp API
  -> CompanyCore integration adapter -> PostgreSQL -> event
```

Design for scale, implement for v1. During this original plan, the project did
not add a broad GUI, Google Drive sync, Obsidian sync, billing, advanced RBAC,
invitations, a workflow engine, or a full CRM UI. Later accepted work added the
minimal owner console, Google Drive v2 server-side integration, and typed
business editors under separate documented task queues.

## Principles

- Keep PostgreSQL as the source of truth.
- Keep the backend API as the only supported write layer.
- Add a v1 workspace ownership boundary: registration creates an owner user and
  workspace, and every business record/integration setting belongs to a
  workspace.
- Use native backend integration adapters for integrations that should be
  first-class CompanyCore capabilities. ClickUp is the first v1 adapter.
- Keep n8n optional for orchestration only when a workflow is better outside
  the backend.
- Keep tasks small, reversible, and dependency-aware.
- Keep docs, code, deployment notes, and task evidence synchronized.
- Reuse the existing Express, Prisma, Docker, and template governance setup.
- Protect regression-critical invariants before adding broad feature surface:
  workspace scoping, API contracts, migration safety, event emission, secret
  handling, and smoke evidence.

## Phase 1: Foundation

- [x] CCV1-001 Canonical architecture and deployment docs alignment
  - Why now: Code and short-form docs are ahead of canonical
    `docs/architecture/*` and `docs/operations/*` files.
  - Depends on: Existing audit findings.
  - Validation: Docs contain no unresolved template placeholders for active
    architecture/deployment truth.
  - Deployment impact: None.

- [x] CCV1-002 Real planning queue and task contracts
  - Why now: Planning files still contained placeholder task IDs.
  - Depends on: CCV1-001 audit context.
  - Validation: `.codex/context/TASK_BOARD.md`,
    `docs/planning/mvp-next-commits.md`, and task contracts agree.
  - Deployment impact: None.

## Phase 2: Workspace And Auth Architecture

- [x] CCV1-011 Workspace ownership and auth architecture contract
  - Why now: ClickUp settings and future agent access must belong to a
    workspace, not global config. Registration must create the owner workspace
    before native integrations are implemented.
  - Depends on: CCV1-001.
  - Validation: Docs define users, workspaces, ownership, auth boundary,
    workspace scoping rules, and migration impact.
  - Deployment impact: None for planning; high for implementation.

## Phase 3: Database

- [x] CCV1-003 Prisma migration baseline and deployment entrypoint
  - Why now: Runtime currently uses `prisma db push`, which is not the desired
    production migration path.
  - Depends on: CCV1-001.
  - Validation: Migration applies to an empty database, `npm run build` passes,
    and deployment docs describe migration behavior.
  - Deployment impact: Medium. Database startup behavior changes.

- [x] CCV1-016 Migration safety and seed/bootstrap policy
  - Why now: Workspace/auth migration and first-owner bootstrap can create
    long-lived security or data ownership bugs if not standardized early.
  - Depends on: CCV1-011, CCV1-003.
  - Validation: Docs define migration review, local seed, production bootstrap,
    rollback expectations, and how global shortcuts are disabled.
  - Deployment impact: Medium.

## Phase 4: Auth Runtime

- [x] CCV1-012 Registration, login, and workspace bootstrap
  - Why now: Owner user and workspace creation are the root of secure
    CompanyCore usage and must exist before workspace-owned integration
    settings are accepted.
  - Depends on: CCV1-011, CCV1-003.
  - Validation: Registration atomically creates owner user and workspace;
    login returns an authenticated context; protected routes resolve
    `workspaceId`.
  - Deployment impact: Medium. Adds user/session or token secret requirements.

- [x] CCV1-007 API key hardening plan and implementation
  - Why now: Agents and service clients such as Paperclip/Jarvis need secure
    machine access tied to a workspace; current keys are plaintext and global.
  - Depends on: CCV1-011, CCV1-012, CCV1-003.
  - Validation: Missing, invalid, inactive, valid, wrong-workspace, and
    insufficient-scope paths are tested and fail closed.
  - Deployment impact: Medium. Requires key rotation or compatible migration.

- [x] CCV1-018 Owner-managed adapter API keys
  - Why now: Jarvan, Aviary, and similar adapters need workspace service keys
    without GUI work, seed reruns, or direct database access.
  - Depends on: CCV1-007, CCV1-006.
  - Validation: Owner creates a redacted hash-stored key, service key cannot
    mint more keys, and the generated key works with `X-API-Key`.
  - Deployment impact: Medium. Adds a migration that makes legacy plaintext key
    storage nullable for new hash-only keys.

## Phase 5: Workspace-Scoped Settings

- [x] CCV1-013 Workspace-scoped integration settings and secret storage
  - Why now: ClickUp token/list/team configuration must be assigned to a
    workspace and secured before the native adapter can run safely.
  - Depends on: CCV1-011, CCV1-012, CCV1-003.
  - Validation: Workspace owner can configure ClickUp settings; secrets are not
    logged or returned; access from another workspace is rejected.
  - Deployment impact: Medium. Adds secret handling and new env/app secret.

## Phase 6: Core API And Events

- [x] CCV1-014 API contract and error response standard
  - Why now: Paperclip, Jarvis, and future GUI clients need stable contracts and
    safe error codes before routes expand.
  - Depends on: CCV1-001, CCV1-011.
  - Validation: Docs define API contract source, core response shape, and
    standard errors for auth, workspace, validation, and integrations.
  - Deployment impact: Low.

- [x] CCV1-004 Complete required v1 event emission
  - Why now: Required events for `client_created`, `deal_created`, and
    `note_created` are missing.
  - Depends on: Existing event service and current route modules.
  - Validation: Create client, deal, and note paths each persist the matching
    event.
  - Deployment impact: Low.

- [x] CCV1-008 Missing module route decision and minimal route slice
  - Why now: DB models exist for task lists, pipeline stages, interactions,
    decisions, agents, and agent logs, but several modules have README-only
    placeholders.
  - Depends on: API namespace and scope decisions in `open-decisions.md`.
  - Validation: Only approved v1 routes are added, documented, workspace
    scoped, and protected by auth/API key middleware.
  - Deployment impact: Low.

## Phase 7: Native ClickUp Integration

- [x] CCV1-017 Integration adapter contract and observability minimum
  - Why now: ClickUp should become the reusable integration pattern, not a
    one-off. Sync failures must be visible without leaking secrets.
  - Depends on: CCV1-011, CCV1-013, CCV1-014.
  - Validation: Docs define adapter layers, safe provider error mapping,
    structured logs/events, idempotency, and smoke signals.
  - Deployment impact: Low for docs; medium when implemented.

- [x] CCV1-010 Native ClickUp integration contract and first adapter slice
  - Why now: User confirmed ClickUp should be the first native integration so
    Jarvis can inspect, improve, and extend real operational data without
    requiring separate n8n workflows.
  - Depends on: CCV1-001, CCV1-011, CCV1-012, CCV1-013, DEC-005, CCV1-003.
  - Validation: CompanyCore can call the ClickUp API through a dedicated
    workspace-scoped adapter, map external tasks into internal tasks, upsert by
    `(workspace_id, source = clickup, external_id)`, and emit
    `task_synced_from_clickup`.
  - Deployment impact: Medium. Adds outbound API dependency and secrets.

## Phase 8: Docs

- [x] CCV1-005 Deployment domain documentation and smoke checklist
  - Why now: `companycore.luckysparrow.ch` and
    `api.companycore.luckysparrow.ch` are not recorded in docs or state.
  - Depends on: CCV1-001.
  - Validation: Deployment docs, project state, and smoke checklist list public
    URLs and expected checks.
  - Deployment impact: None.

## Phase 9: Tests

- [x] CCV1-015 Workspace guardrail test matrix
  - Why now: Workspace ownership is the highest regression-risk area. Every
    route must prove allowed and denied paths, not just happy paths.
  - Depends on: CCV1-011, CCV1-014.
  - Validation: Testing docs define required cases for unauthenticated,
    same-workspace, cross-workspace, missing-scope, and secret-redaction paths.
  - Deployment impact: None.

- [x] CCV1-006 Endpoint test foundation
  - Why now: Build passes, but route/auth/event behavior is not covered by
    automated tests.
  - Depends on: CCV1-003, CCV1-011, CCV1-012, CCV1-014, CCV1-015.
  - Validation: Test suite covers health, registration/login, workspace
    scoping, API key auth, project/task flows, ClickUp native sync, and event
    creation.
  - Deployment impact: None.

## Phase 10: Deployment Verification

- [x] CCV1-009 Production deployment verification
  - Why now: Project is reported deployed, but repository evidence does not yet
    record production smoke results.
  - Depends on: CCV1-003, CCV1-004, CCV1-005, CCV1-006, CCV1-012, CCV1-013,
    CCV1-010.
  - Validation: Production smoke evidence is recorded in
    `docs/operations/post-deploy-smoke.md`,
    `docs/operations/v1-release-readiness.md`, and
    `docs/operations/v1-operator-handoff.md`.
  - Deployment impact: High. Confirms production readiness.

## Progress Log

- 2026-05-08: Marked this file as a historical v1 foundation plan. Its final
  production verification item is closed by later production smoke and operator
  handoff evidence. Current queue truth lives in `mvp-next-commits.md`,
  `.codex/context/TASK_BOARD.md`, `.agents/state/next-steps.md`, and
  `docs/NEXT_STEPS.md`.

- 2026-05-02: Audited repository state. Backend foundation exists, build
  passes, canonical architecture/operations/planning docs need alignment before
  further implementation.
- 2026-05-02: Replaced placeholder planning with the CCV1 queue, task
  contracts, and open decisions.
- 2026-05-02: Updated integration direction: ClickUp is now planned as the
  first native backend integration adapter; n8n is optional orchestration.
- 2026-05-02: Updated auth direction: v1 should create an owner user and
  workspace on registration, then assign integration settings and service keys
  to that workspace.
- 2026-05-02: Added regression-prevention planning for API contracts, workspace
  guardrail tests, migration/bootstrap safety, and integration observability.
