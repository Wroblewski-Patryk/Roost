# LUC-111 Function-Level Classification Overrides For Auth Headers

Date: 2026-07-04
Issue: [LUC-111](/LUC/issues/LUC-111)
Parent: [LUC-110](/LUC/issues/LUC-110)
Stage: verification

## Task Contract

- Goal: make Roost Project Truth tooling consume verified classification
  overrides for the two Account access `authHeaders` helper function rows.
- Task Type: project-truth tooling repair.
- Current Stage: verification.
- Deliverable For This Stage: scanner mechanism, regenerated Roost indexes,
  target row readback, and final disposition.

## Scope

Target rows:

- `scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders`
- `scripts/operating-model-registry-lifecycle-smoke.mjs#authHeaders`

Files changed:

- `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`
- generated Roost architecture/app-completion/Project Truth exports
- source-of-truth state/context ledgers touched by this issue
- this planning packet

Out of scope:

- Roost product code, schema, API behavior, browser UI, another Account access
  runtime proof, protected smoke, credential value read, push, deploy, restart,
  provider mutation, or production mutation.

## Diagnosis

[LUC-110](/LUC/issues/LUC-110) already recorded the correct source-of-truth
classification in `docs/architecture/scanner-overrides.json`, but the scanner
registered only file-level entities in its path lookup. Generated entities such
as `path#function`, `path#endpoint`, and `path#class` were present in the graph
but were not addressable by direct override path lookup.

The first implementation pass registered generated entity paths but
over-constrained override resolution by the requested type. That prevented
existing file-level proof packets from being reclassified from `document` to
`test`. The final fix resolves entity overrides by path without requiring the
pre-override type to match, then applies the requested type/status mutation as
before.

## Implementation

- Registered generated API endpoint, function, and class entity paths in the
  scanner path lookup map.
- Added reusable override path resolution that can locate generated
  `path#symbol` entities.
- Kept file-level entity override behavior intact so existing proof packet
  overrides can still change `document` entities into `test` entities.
- Reused the existing Roost override entries; no global app-completion
  suppression or broad function-row exclusion was added.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Scanner syntax | PASS | `node --check C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs` |
| Architecture-awareness refresh | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `2026-07-04T19:16:54.227Z`, `2813` entities / `6599` relations / `16445` files; `32` entity overrides and `30` relation overrides applied. |
| Target architecture readback | PASS | Both `authHeaders` function entities read `type=function`, `status=verified`; `docs/planning/luc-107-account-access-authheaders-fresh-proof.md` reads `type=test`, `status=verified`. |
| App-completion refresh | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `1243` items / `5` flows / `1205` missing test links / `20` missing doc links / `11` implemented-needs-proof / `0` blocked. |
| Target app-completion readback | PASS | Both target `authHeaders` paths are absent from `priorityReviewItems`; `rg authHeaders docs/status/app-completion-index.* docs/status/project-truth-index.*` returned no matches. |
| Project Truth apply | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` generated `2026-07-04T19:17:17.322Z`; public probe `pass`, `criticalRuntimeFindings=0`, `incompleteEventChains=0`, `operationalGateGaps=0`, `appCompletionGaps=1236`. |
| Project Truth first gap | PASS | First gap moved to `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner`; Project Truth JSON contains no `authHeaders`. |

## Acceptance Criteria

- [x] Add the smallest scanner/app-completion mechanism that lets function-level
  helper rows consume verified classification.
- [x] Preserve LUC-107 proof links and avoid suppressing unrelated function
  rows globally.
- [x] Rerun architecture-awareness, app-completion, and Project Truth for
  Roost.
- [x] Read back that both target `authHeaders` rows are no longer non-ok
  priority items and that Project Truth first gap is no longer either target
  helper.
- [x] Do not create another Account access runtime proof lane.

## Result Report

Status: `verified`.

Function-level override lookup is now supported by the shared Paperclip
architecture-awareness scanner. Roost's existing `authHeaders` overrides are
consumed without a global function exclusion, and the two target helper rows no
longer appear in app-completion or Project Truth priority output. The next
Project Truth app-completion gap is a separate `registerOwner` helper row, not
part of this issue.

Deployment impact: none. This was local tooling and generated evidence only.
