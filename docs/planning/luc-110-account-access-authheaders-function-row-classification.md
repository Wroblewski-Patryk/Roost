# LUC-110 Account Access Auth Headers Function-Row Classification

Date: 2026-07-04
Issue: [LUC-110](/LUC/issues/LUC-110)
Parent: [LUC-107](/LUC/issues/LUC-107)
Stage: verification

## Task Contract

- Goal: curate the generated Project Truth classification for the two Account
  access `authHeaders` helper function rows after fresh LUC-107 proof.
- Task Type: docs-memory / Project Truth curation.
- Current Stage: verification.
- Deliverable For This Stage: source-of-truth override, regenerated indexes,
  target row readback, and final disposition.

## Scope

Target rows:

- `scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders`
- `scripts/operating-model-registry-lifecycle-smoke.mjs#authHeaders`

Files allowed:

- `docs/architecture/scanner-overrides.json`
- generated architecture/app-completion/Project Truth status exports
- source-of-truth state/context ledgers touched by this issue
- this planning packet

Out of scope:

- Product code, schema, API behavior, browser UI, another Account access
  runtime proof, protected smoke, credential value read, push, deploy, restart,
  provider mutation, or production mutation.

## Diagnosis

LUC-107 proved the helper behavior with Docker-backed runtime smokes. Both
target helpers build bearer Authorization headers from locally registered owner
tokens, and those headers are used by protected Company OS and operating-model
API calls in the same smoke scripts.

The remaining Project Truth gap was not a runtime defect and not missing
evidence. The generated app-completion model turns any non-API entity with
`status=implemented`, `hasTest=true`, and `hasDoc=true` into
`implemented_needs_proof`. The two helper rows therefore needed function-row
classification curation after the proof relation was already present.

## Classification Decision

Selected classification: mark both smoke-local `authHeaders` helper function
entities as `verified` through `docs/architecture/scanner-overrides.json`.

Rejected options:

- Excluding the rows from app-completion would hide a real auth-sensitive smoke
  helper from the architecture graph.
- Creating another runtime proof lane would duplicate LUC-107 and violate the
  parent issue instruction not to create a new Account access proof lane
  without a fresh behavioral failure.
- Changing generator behavior globally would be broader than this issue and
  could suppress legitimate `implemented_needs_proof` rows elsewhere.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| LUC-107 packet review | PASS | `docs/planning/luc-107-account-access-authheaders-fresh-proof.md` records Docker-backed migrate/seed plus both target smokes returning `ok: true`. |
| Source-of-truth curation | PASS | `docs/architecture/scanner-overrides.json` now sets `status=verified` for both target helper paths with links to LUC-107 and this packet. |
| Architecture-awareness refresh | PASS AFTER LUC-111 | Initial LUC-110 refresh exposed a tooling limit because overrides did not reach generated `path#function` entities. After [LUC-111](/LUC/issues/LUC-111), `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-04T19:16:54.227Z`, `2813` entities / `6599` relations / `16445` files, and overrides `32/30`; both target function rows read `status=verified`. |
| App-completion refresh | PASS AFTER LUC-111 | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `1243` items / `5` flows / `1205` missing test links / `20` missing doc links / `11` implemented-needs-proof / `0` blocked. Both target `authHeaders` paths are absent from `priorityReviewItems`. |
| Project Truth apply | PASS AFTER LUC-111 | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS at `2026-07-04T19:17:17.322Z`, public probe `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, no `authHeaders` output, and first gap moved to `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner`. |

## Acceptance Criteria

- [x] Decide whether the smoke helper rows should be verified, excluded, or
  mapped differently.
- [x] Apply the smallest source-of-truth/index change.
- [x] Regenerate app-completion and Project Truth indexes, or record the exact
  generator/tooling blocker.
- [x] Do not create another Account access runtime proof lane unless a fresh
  behavioral failure is reproduced.

## Result Report

Status: `verified after child tooling repair`.

The selected curation is source-of-truth verification for the two helper
function rows. LUC-107 already supplies the runtime proof; LUC-110 only fixes
the generated row classification so Project Truth does not keep routing
duplicate Account access proof work for the same helpers.

The initial implementation blocker was that the Paperclip architecture-awareness
scanner did not apply entity overrides to generated function entities such as
`scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders`. Child
[LUC-111](/LUC/issues/LUC-111) repaired that tooling gap by making generated
`path#symbol` entities addressable by scanner overrides while preserving
file-level proof-packet reclassification.

Final integration readback: architecture-awareness generated
`2026-07-04T19:16:54.227Z` with `2813` entities / `6599` relations /
`16445` files and `32` entity / `30` relation overrides applied. Both target
`authHeaders` function entities now read `status=verified`; both paths are
absent from app-completion priority review and Project Truth output. Project
Truth generated `2026-07-04T19:17:17.322Z`, public probe `pass`, runtime/event
/ops gaps `0`, and first gap moved to
`scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner`.

No additional Account access runtime proof is warranted unless a fresh
behavioral failure is reproduced. The remaining `registerOwner` Project Truth
gap is separate proof-link debt, not part of LUC-110.

Deployment impact: none. This is local docs/index curation only.
