# LUC-4937 Roost Product Capability Map

## Header

- ID: LUC-4937
- Title: Replace sample product capability map with Roost capability rows
- Task Type: docs
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Priority: P1
- Mission ID: LUC-4937-ROOST-PRODUCT-CAPABILITY-MAP
- Mission Status: VERIFIED

## Goal

Replace the sample `CAP-000` product capability row with Roost-specific
capability rows that connect product value to existing architecture features,
function chains, code paths, tests, and evidence.

## Scope

- `docs/product/capability-map.md`
- `docs/architecture/capability-to-implementation-map.csv`
- Source-of-truth notes for this issue in `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, and `.agents/state/active-mission.md`

## Implementation Plan

1. Inspect the product map, architecture capability CSV, architecture registry,
   feature nodes, chain registry, and current Roost state files.
2. Replace sample rows with Roost capabilities grounded in existing
   architecture/evidence.
3. Verify that placeholder capability rows were removed and expected Roost
   capability IDs are present.
4. Record closure evidence without touching runtime code or unrelated dirty
   work.

## Autonomous Loop Evidence

### 1. Analyze Current State

- `docs/product/capability-map.md` contained only `CAP-000`.
- `docs/architecture/capability-to-implementation-map.csv` contained the paired
  sample implementation row.
- Architecture feature and chain registries already had verified/tested Roost
  feature IDs and chain IDs suitable for the replacement rows.

### 2. Select One Priority Mission Objective

Selected task: replace the sample product capability map for
[LUC-4937](/LUC/issues/LUC-4937).

### 3. Plan Implementation

Use a small docs-only edit covering the product capability map and its paired
implementation CSV. Keep existing LUC-4936 dirty files untouched.

### 4. Execute Implementation

Added `CAP-001` through `CAP-008` for owner dashboard, department management,
operations work, assets/knowledge, people/agents, area operating graph,
capability-scoped API/MCP access, and architecture evidence.

### 5. Verify and Test

Validation performed:

- `rg -n "CAP-000|Example capability|Replace this row|YYYY-MM-DD" docs/product/capability-map.md docs/architecture/capability-to-implementation-map.csv`
- `rg -n "CAP-00[1-8]" docs/product/capability-map.md docs/architecture/capability-to-implementation-map.csv`
- `git diff --check -- docs/product/capability-map.md docs/architecture/capability-to-implementation-map.csv docs/planning/luc-4937-roost-product-capability-map.md .codex/context/PROJECT_STATE.md .codex/context/TASK_BOARD.md .agents/state/active-mission.md`

Result: passed. Placeholder search returned no matches; capability ID readback
found `CAP-001` through `CAP-008` in both maps; scoped `git diff --check`
passed with LF-to-CRLF warnings only.

### 6. Self-Review

- Architecture alignment: the rows reuse existing feature and chain IDs rather
  than inventing a parallel product taxonomy.
- No runtime code, schema, migrations, production smoke, deploy, push, restart,
  credential access, browser, server, database, Docker, or watcher process was
  used.
- Pre-existing LUC-4936 dirty work was preserved and not reverted.

### 7. Update Documentation and Knowledge

Updated this task packet and the source-of-truth state notes for LUC-4937.

## Acceptance Criteria

- [x] The sample `CAP-000` product capability row is removed.
- [x] Roost-specific capability rows exist in the product map.
- [x] The paired capability-to-implementation CSV no longer contains the sample
      row.
- [x] Verification evidence is recorded.

## Definition of Done

- [x] Relevant docs are updated.
- [x] Placeholder/sample capability rows are gone from the affected files.
- [x] Validation command output is recorded in this packet and the issue
      closure.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked for
      docs-only applicability before Paperclip closure.

## Result Report

- Task summary: replaced the sample product capability map with Roost
  capability rows and synchronized the implementation map.
- Files changed: `docs/product/capability-map.md`,
  `docs/architecture/capability-to-implementation-map.csv`,
  `docs/planning/luc-4937-roost-product-capability-map.md`, plus
  source-of-truth state notes.
- How tested: targeted placeholder search, capability ID readback, and scoped
  diff hygiene.
- What is incomplete: no runtime verification was needed for docs-only scope;
  protected production proof remains governed by existing release/credential
  gates.
- Next steps: future capability additions should update both product and
  implementation maps in the same task.
