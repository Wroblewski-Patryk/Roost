# LUC-137 Account Access RegisterOwner Proof Link

Date: 2026-07-04
Issue: [LUC-137](/LUC/issues/LUC-137)
Stage: verification

## Task Contract

- Goal: prove the Project Truth Account access `registerOwner`
  `missing_test_link` row for the operating-model registry smoke.
- Task Type: QA verification / app-completion evidence-link curation.
- Current Stage: verification.
- Deliverable For This Stage: source-of-truth proof link, regenerated indexes,
  target row readback, and source-control/deploy disposition.

## Scope

Target row:

- `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner`

Files updated:

- `docs/planning/luc-137-account-access-registerowner-proof-link.md`
- `docs/architecture/scanner-overrides.json`
- generated architecture/app-completion/Project Truth status exports after
  refresh

Out of scope:

- Product code, schema, API behavior, web UI, browser proof, protected
  production smoke, credential value read, push, deploy, restart, provider
  mutation, or production mutation.

## Diagnosis

The `registerOwner` helper is a local smoke helper inside
`scripts/operating-model-registry-lifecycle-smoke.mjs`. It posts to
`/auth/register`, asserts HTTP `201`, and returns the created owner token and
workspace. The same smoke then uses two registered owners to prove protected
operating-model registry behavior and cross-workspace denial.

Fresh Docker-backed proof already exists in
`docs/planning/luc-107-account-access-authheaders-fresh-proof.md`: that run
built the backend container, applied migrations, seeded, and ran
`npm run operating-model:registry-smoke` successfully. The target gap was
therefore an evidence-link/classification gap, not a reproduced runtime defect.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Existing proof packet review | PASS | `docs/planning/luc-107-account-access-authheaders-fresh-proof.md` records Docker-backed `npm run operating-model:registry-smoke` PASS with owner registration, protected registry CRUD, aggregate readback, and cross-workspace denial. |
| Source-of-truth curation | PASS | `docs/architecture/scanner-overrides.json` links this packet and LUC-107 to `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner` and marks the helper verified. |
| Runtime behavior | NOT RERUN | No new runtime defect was reproduced; this lane intentionally avoids duplicating the fresh LUC-107 Docker smoke. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `2026-07-04T20:50:31.159Z`, `2815` entities / `6610` relations / `16447` files, with `34` entity overrides and `33` relation overrides applied. |
| Target architecture readback | PASS | `docs/graphs/architecture-awareness.json` contains `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner` with the LUC-137 description and relations to this proof packet. |
| App-completion refresh | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `2026-07-04T20:50:48.017Z`; missing-test-link count dropped from `1205` to `1204`, risk items from `1236` to `1235`, and the target path is absent from app-completion JSON. |
| Project Truth apply | PASS | `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` generated `2026-07-04T20:50:53.135Z`; public probe `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, and the target path is absent from Project Truth JSON. |
| Project Truth first gap | PASS | First gap moved from `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner` to `src/auth`. |
| Diff whitespace | PASS | `git diff --check` returned line-ending warnings only. |

## Acceptance Criteria

- [x] Link the smallest relevant Account access proof to
  `scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner`.
- [x] Preserve the smoke helper as an indexed function rather than excluding it
  from Project Truth.
- [x] Regenerate app-completion and Project Truth indexes, or record the exact
  tooling blocker.
- [x] Do not create another Account access runtime proof lane unless a fresh
  behavioral failure is reproduced.

## Result Report

Status: `verified`.

The Account access `registerOwner` helper row is now linked to specific proof:
the LUC-107 Docker-backed operating-model registry smoke and this LUC-137
evidence-link packet. Project Truth no longer reports
`scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner` as a gap,
and the generated first gap has moved to the broader `src/auth` module row.

Residual risk: this lane did not rerun runtime behavior because fresh
Docker-backed proof already exists and no new runtime defect was reproduced.
Remaining Account access rows are broader evidence-link debt and should be
handled as separate, explicitly scoped proof-link or classification lanes.

Deployment impact: none. This is local docs/index curation only.
