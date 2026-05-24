# Active Mission Packet

Last updated: 2026-05-24

## Current Mission

- Mission ID: OPS-REPO-RENAME-001
- Status: VERIFIED
- Selected objective: Align local Git and Coolify application source after the
  GitHub repository rename to `Wroblewski-Patryk/Roost`.
- Why this mission now: The owner reported the repository rename and asked to
  update the local project and likely Coolify.
- Release objective or product milestone advanced: Keeps production source
  configuration pointed at the canonical repository before the next deployment
  proof.
- First/next checkpoint: Use the next normal push to `main` or a deliberate
  manual redeploy as the end-to-end proof that Coolify webhook routing and
  build metadata still resolve after the rename.
- Stop conditions: If Coolify requires repository reauthorization or a
  destructive source recreation, stop for owner approval before changing the
  application.
- Parent validation gate: `git remote -v`, `git ls-remote --heads origin main`,
  Coolify Git Source readback, documentation update, and `git diff --check`.

## Source Rows

- Task board: repository rename checkpoint.
- Planning: `docs/planning/repository-rename-coolify-source-task-contract.md`.
- Delivery map: Coolify production source configuration for application
  `Roost`.
- Requirements: `.agents/state/requirements-verification-matrix.md` active
  verified rows plus any new audit row created by this mission.
- Quality scenarios: release confidence, auth/data ownership, responsive
  active web routes, route/capability drift.
- Risks: `.agents/state/known-issues.md`; deployment automation proof remains
  separate until the next push or deliberate redeploy.
- Module confidence: `.agents/state/module-confidence-ledger.md`.
- System health: `.agents/state/system-health.md`.
- Architecture / UX / security / ops sources:
  `docs/architecture/web-layer-react-ownership.md`,
  `docs/architecture/autonomous-company-operating-system.md`,
  `docs/architecture/unified-organizational-operating-system.md`,
  `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`,
  `NO_TEMPORARY_SOLUTIONS.md`, `DEPLOYMENT_GATE.md`, and
  `docs/operations/coolify-vps-deployment-contract.md`.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, state, docs | Integration, task closure, source-of-truth updates | Mission packet, scoped implementation, final acceptance | Parent validation gate | VERIFIED |
| Operations | Active chat | Coolify deployment contract | Local Git remote and Coolify Git Source | Source alignment | Remote readback and Coolify readback | VERIFIED |
| QA/Test | Active chat | Validation commands | Git remote, branch lookup, diff hygiene | Command proof | `git ls-remote --heads origin main`, `git diff --check` | VERIFIED |
| Documentation/Memory | Active chat | State files and task contract | Mission, task board, project state, operations contract | Durable task contract | Source-of-truth docs updated | VERIFIED |

## Delegation Plan

- Lanes kept local: all lanes. This was a small single-lane operations
  checkpoint with direct local and Coolify readbacks.
- Lanes delegated: none.
- Lanes intentionally omitted and why: production redeploy smoke is omitted
  because the requested rename did not require deploying a new image.
- Known overlap risks: the worktree already contained unrelated edits from
  prior missions, so this mission avoided reverting or normalizing unrelated
  files.
- Forbidden files or surfaces: no unrelated worktree changes may be reverted.

## Acceptance

- [x] Every important responsibility from source docs has an owner or explicit omission.
- [x] No two write lanes own the same file or shared registry.
- [x] Each lane has expected output and validation/proof.
- [x] Parent validation will run after accepted lane integration.
- [x] Missing or unclear ownership will be recorded in `.agents/state/responsibility-learning.md`.
- [x] Process quality will be evaluated in `.agents/state/agent-evals.md` when
      this mission is broad, repeated, partial, or subagent-heavy.

## Checkpoint Log

| Date | Checkpoint | Result | Evidence | Next action |
| --- | --- | --- | --- | --- |
| 2026-05-24 | Repository rename and Coolify source alignment | VERIFIED | `git remote -v`; `git ls-remote --heads origin main`; Coolify `Roost -> Git Source` readback; `git diff --check` | Prove webhook/build metadata on next push or deliberate redeploy |
| 2026-05-24 | Department catalog implemented | VERIFIED | `docs/planning/management-department-catalog-task-contract.md`; `npm run validate`; `npm run test:api:local`; browser rendered proof; `git diff --check` | Add dedicated department API subtest in a later hardening slice |
