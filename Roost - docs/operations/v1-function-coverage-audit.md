# V1 Function Coverage Audit

Last updated: 2026-05-10

## Purpose

This audit explains the function coverage ledger in human-readable form.

Canonical ledger:

- `docs/operations/v1-function-coverage-ledger.csv`

Related orientation docs:

- `docs/planning/v1-architecture-control-map.md`
- `docs/operations/v1-code-surface-index.md`
- `docs/architecture/system-architecture.md`

## Audit Method

The audit used repository source-of-truth files and code inspection:

- architecture: `docs/architecture/system-architecture.md`
- project state: `.codex/context/PROJECT_STATE.md`
- active board: `.codex/context/TASK_BOARD.md`
- known blockers: `.agents/state/known-issues.md`
- active planning queue: `docs/planning/mvp-next-commits.md`
- release docs: `docs/operations/v1-release-readiness.md`,
  `docs/operations/v1-operator-handoff.md`
- schema: `prisma/schema.prisma`
- API routes: `src/app.ts`, `src/modules/*`
- React route kit and workbenches: `web/src/main.tsx`,
  `web/src/react-route-kit.tsx`
- validation scripts: `package.json`, `scripts/*`

The ledger uses the vocabulary from
`docs/governance/function-coverage-ledger-standard.md`.

## High-Level Verdict

Local architecture-derived V1 implementation is complete enough to stop
treating the project as missing a core V1 subsystem.

The next work should be evidence-led and lane-led:

1. keep the function coverage ledger current
2. verify rows with weak target evidence before calling them production-current
3. unblock external blockers when credentials or permissions exist
4. select a deliberate V2 lane instead of patching random surfaces

## Readiness Buckets

### READY

Rows with strong local evidence and either target evidence or no target
environment requirement.

Representative ready areas:

- auth registration and login
- service API key creation and scope enforcement
- MCP manifest and bridge smoke
- connection contract
- operating-area canonical `/areas` React route
- operating-area lifecycle, selected context, and reassignment controls
- ClickUp import, webhook, maintenance, write-back, and Paperclip event flow
- typed business editor core paths
- documentation control map, code-surface index, and ledger itself

### Implemented, Needs Evidence

Rows where implementation exists but current target proof is older, indirect,
or not specific to the newly expanded Company OS surface.

Important examples:

- Company OS Stage 1-3 seeded records in target environment
- Company OS approval lifecycle target command smoke
- stage lifecycle target command smoke
- automation evaluator target smoke after CCOS-020
- Company OS audit/event readback after automation lifecycle execution
- React Company OS cockpit target smoke
- MCP route metadata sample after recent MCP additions
- operating-model folder/storage/knowledge/automation-definition lifecycle
  samples
- vanilla and React workbench route-level UI proof after the recent `/areas`
  canonical switch

These are mostly evidence tasks, not feature tasks. If a proof fails, then a
narrow fix should be created.

### Blocked Externally

Rows where code exists or architecture is ready, but target proof cannot happen
without credentials, provider consent, or repository permissions.

- Google Drive real Docs/Sheets content and write samples
- Google Drive changes reconcile target proof
- GitHub-to-Coolify auto-deploy proof
- upstream Paperclip/OpenJarvis source merge execution

These must remain visible but must not be called local implementation gaps.

### Needs Implementation Review

No release-critical row currently has a clear "no implementation exists" state
for the approved V1 scope.

Future implementation review should come from ledger rows whose evidence task
fails, or from an explicit V2 lane decision.

## Architecture Coverage By Lane

### Workspace, Auth, And API Boundary

Status: implemented and core-ready.

Evidence:

- owner registration/login and workspace bootstrap are implemented
- service keys and scoped capabilities exist
- route capability manifest exists
- `/v1/connection` is the agent discovery contract

Primary remaining improvement:

- add a fresh disposable multi-workspace regression scenario before any
  security-sensitive release.

### MCP And Agent Runtime

Status: implemented for V1 bridge use.

Evidence:

- `/v1/mcp/manifest`
- stdio MCP bridge
- MCP smoke harness
- canonical MCP key profiles
- runtime setup guide

Primary remaining improvement:

- run target MCP smoke whenever a real runtime key/profile is created or
  rotated.

### Company OS

Status: implemented locally for the approved V1 foundation.

Evidence:

- Company OS Stage 1 definitions
- Stage 2 runtime evidence
- Stage 3 governance intelligence
- `/v1/company-os` read API
- approval commands
- stage lifecycle commands
- automation evaluator reusing shared lifecycle command functions
- React Company OS cockpit

Primary remaining improvement:

- target or Docker command smoke that exercises approval, stage lifecycle,
  automation evaluator, event, and audit readback in one trace.

### Operating Model

Status: implemented and now canonical in React for `/areas`.

Evidence:

- operating areas/folders/tables
- provider mappings
- storage locations
- knowledge roots
- automation definitions
- canonical `/areas` React workbench
- user-created area lifecycle
- provider/Drive scope assignment and reassignment
- selected-area record previews through existing typed table APIs

Primary remaining improvement:

- lifecycle samples for folders, storage locations, knowledge roots, and
  automation definitions.

### ClickUp

Status: implemented and production-proven for V1.

Evidence:

- first import
- webhook registration
- signed webhook ingestion
- provider inbox retry
- maintenance scheduler
- task write-back
- comment bridge
- production readiness docs

Primary remaining improvement:

- only rerun provider-specific write-back or comment smoke when ClickUp config,
  token, mapping, or write behavior changes.

### Google Drive

Status: implemented foundation with production owner consent and first import
verified for the numbered company department roots.

Evidence:

- OAuth settings routes
- folder discovery and import code
- file metadata and content snapshots
- Docs/Sheets create/edit code
- changes reconcile code
- owner setup documentation
- AGRUN-007 production proof: OAuth active, owner discovery returned 172
  folders, 13 numbered roots (`00`-`12`) were selected/imported/mapped,
  `/v1/google-drive/files` returned 748 imported items and 171 folders, and
  descendant scope verification reported `unassignedCount=0` and
  `mismatches=[]`

Remaining target-safe proof:

- sample Docs/Sheets content body readback for content quality
- sample Docs/Sheets create/edit only with approved non-sensitive test files
- sample Drive changes reconciliation when freshness becomes active scope

Primary next action:

- do not reopen first import; plan only the target-safe content/write/freshness
  samples when those become active product scope.

### Owner UI

Status: hybrid but controlled.

Current ownership:

- React canonical: `/areas`
- React parallel routes: `/react-company-os`, `/react-dashboard`,
  `/react-tasks`, `/react-integrations`
- vanilla retained: dashboard, data, relationships, tasks adapter, pipeline,
  settings, auth

Primary remaining improvement:

- decide future canonical switches per route through parity audits, not by
  migrating everything at once.

### Operations

Status: manual V1 operations are proven; auto-deploy remains P2.

Evidence:

- Docker Compose deployment shape
- health endpoints
- operator handoff
- rollback docs
- post-deploy smoke docs

Primary remaining improvement:

- refresh VPS inventory and auto-deploy proof when approved shell/tooling is
  available.

## Derived Next Tasks

The ledger produces this execution order:

1. `V1CTRL-002 Canonical Queue Cleanup`
   - Reduce active planning noise.
   - Keep completed historical items in archives or clearly historical
     sections.
   - Keep external blockers separate.

2. `V1EVID-001 Company OS Lifecycle Trace Smoke`
   - Exercise approval request/decision, start/validate/complete stage,
     automation evaluator, event readback, and audit readback in one local
     Docker trace.
   - Close ledger rows `APPROVAL-001`, `APPROVAL-002`, `STAGE-001..004`,
     `AUTO-001`, `AUTO-002`, `EVENT-001`, and `AUDIT-001`.

3. `V1EVID-002 Operating Model Registry Lifecycle Smoke`
   - Verify folders, storage locations, knowledge roots, and automation
     definitions lifecycle routes.
   - Close ledger rows `OM-003..006`.

4. `V1EVID-003 React Company OS Target Smoke`
   - Verify `/react-company-os` cockpit, collections, detail, agent context,
     approval actions, stage actions, and automation evaluator UI in one
     signed-in smoke.

5. `V2PLAN-001 V2 Lane Selection`
   - Choose the next product lane: agent-first Company OS, operational
     cockpit, provider expansion, or data quality.

External tasks stay blocked:

- `AGRUN-010 Upstream Agent Source Merge Execution`
- `KI-002 GitHub-to-Coolify Auto-Deploy Proof`

Completed target proof:

- `AGRUN-007 Google Drive Owner Consent And First Import`

## Release Gate Interpretation

For local V1 architecture completion:

- no local `P0` implementation row is currently classified as missing
  implementation
- several `P0/P1` rows need fresher evidence before a new production release
  should claim current proof
- Google Drive target import is complete for the numbered department roots and
  should not be counted as a local implementation miss or reopened blocker
- upstream Paperclip/OpenJarvis merge and auto-deploy are operational/external
  blockers, not CompanyCore local runtime blockers

## Maintenance Rules

Update the ledger when:

- a route is added or removed
- a route becomes canonical React or moves back to vanilla
- a provider capability changes
- a lifecycle command is added
- target smoke evidence is refreshed
- an external blocker is unblocked or explicitly deferred
- a V2 lane is selected

Do not mark a row `PASS` because adjacent behavior worked. Mark it `PASS` only
when the row's concrete scenario has current credible evidence.
