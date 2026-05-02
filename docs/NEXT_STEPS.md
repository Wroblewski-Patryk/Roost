# Next Steps

## 1. Current Baseline

- CompanyCore v1 backend foundation exists.
- Stack: Node.js, Express, TypeScript, Prisma, PostgreSQL, Docker Compose.
- `GET /health` is public.
- Business endpoints are protected by `X-API-Key`.
- Current minimal API includes projects, goals, targets, tasks, clients, deals,
  notes, events, and ClickUp task sync.
- v1 must add owner registration/login and automatic workspace creation before
  integration settings are treated as production-ready.
- Integration settings such as ClickUp credentials must belong to a workspace,
  not to global process state.
- ClickUp is now planned as the first native CompanyCore integration adapter.
- n8n is optional orchestration, not the primary required ClickUp path.
- The intended v1 flow is:

```text
Owner registration -> workspace -> workspace settings -> ClickUp API
  -> CompanyCore adapter -> PostgreSQL -> event
```

## 2. Verified During Audit

- `npm run build` passes.
- Prisma schema includes the expected v1 tables:
  `projects`, `goals`, `targets`, `task_lists`, `tasks`, `clients`, `deals`,
  `pipeline_stages`, `interactions`, `notes`, `decisions`, `agents`,
  `agent_logs`, `events`, and `api_keys`.
- Docker and Coolify compose files exist.
- The repository was initialized from the project template and still contains
  template-governance files.

## 3. Main Gaps

- Canonical `docs/architecture/*` and `docs/operations/*` files still contain
  active template placeholders.
- Deployment domains are not yet recorded in docs/config:
  `companycore.luckysparrow.ch` and `api.companycore.luckysparrow.ch`.
- Production startup currently relies on `prisma db push`.
- Workspace/auth schema and ownership rules still need to be designed.
- Owner registration/login and workspace bootstrap are not implemented yet.
- Workspace-scoped integration settings and secret storage are not implemented
  yet.
- Native ClickUp integration contract and secrets still need to be designed
  before implementation.
- Required v1 events are missing for `client_created`, `deal_created`, and
  `note_created`.
- API keys are stored as plaintext.
- Endpoint tests are not configured.
- Several DB-backed modules do not yet have API routes.
- API namespace strategy is undecided.

## 4. Active Queue

Use `docs/planning/mvp-next-commits.md` as the short queue and
`docs/planning/companycore-v1-task-contracts.md` as the detailed task contract
source.

### NOW

- CCV1-001 Canonical architecture and deployment docs alignment
- CCV1-011 Workspace ownership and auth architecture contract

### NEXT

- CCV1-012 Registration, login, and workspace bootstrap
- CCV1-013 Workspace-scoped integration settings and secret storage
- CCV1-003 Prisma migration baseline and deployment entrypoint
- CCV1-010 Native ClickUp integration contract and first adapter slice
- CCV1-004 Complete required v1 event emission
- CCV1-005 Deployment domain documentation and smoke checklist

## 5. Implementation Order

1. Align canonical architecture and operations docs.
2. Define workspace ownership and auth architecture.
3. Resolve production migration policy and replace `db push`.
4. Implement owner registration/login and workspace bootstrap.
5. Implement workspace-scoped integration settings and secret storage.
6. Define and implement the native ClickUp adapter slice.
7. Add missing required event emissions.
8. Record deployment domains and smoke checklist.
9. Add endpoint tests for health, registration/login, workspace scoping,
   service API key auth, core CRUD, native ClickUp sync, and
   events.
10. Decide and implement API key hardening.
11. Decide missing module route scope and add only the approved minimal routes.
12. Verify production deployment and record smoke evidence.

## 6. Do Not Do Yet

- Do not add a GUI.
- Do not add Google Drive sync.
- Do not add Obsidian sync.
- Do not add billing.
- Do not add advanced RBAC.
- Do not add invitations or a full organization admin system.
- Do not add a workflow engine.
- Do not build a full CRM UI.
- Do not add broad abstractions before at least two real modules need them.

## 7. Handoff

The next agent should take exactly one task from `NOW`, preferably CCV1-001 if
canonical docs still contain template placeholders. Keep the task stage explicit,
update the task contract result report, run relevant validation, and synchronize
`.codex/context/TASK_BOARD.md`, `.codex/context/PROJECT_STATE.md`, and planning
docs before closing the task.
