# LUC-85 Account Access Auth Headers Proof Link

Date: 2026-07-04
Issue: [LUC-85](/LUC/issues/LUC-85)
Stage: verification

## Task Contract

- Goal: prove or link the Project Truth app-completion gap for Account access
  `authHeaders` helper rows.
- Task Type: QA verification / evidence-link repair.
- Current Stage: verification.
- Deliverable For This Stage: current root-cause diagnosis, scanner proof-link
  update, regenerated Project Truth readback, and source-control disposition.

## Scope

Indexed gap:

- `scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders`
- `scripts/operating-model-registry-lifecycle-smoke.mjs#authHeaders`

Files updated:

- `docs/planning/luc-85-account-access-authheaders-proof-link.md`
- `docs/architecture/scanner-overrides.json`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product code, test code, runtime server, browser, Docker, database,
  protected smoke, credential access, push, deploy, restart, provider action,
  or production mutation.

## Diagnosis

The missing-test-link is an evidence-index linkage gap, not a reproduced
Account access runtime defect. Both `authHeaders` rows are helper functions in
already-verified local smoke scripts. The helper creates the bearer
Authorization header used by the smokes after owner registration/login:

- V1EVID-001 ran
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  npm run seed && npm run company-os:trace-smoke"` and passed.
- V1EVID-002 ran
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  npm run seed && npm run operating-model:registry-smoke"` and passed.
- `.agents/state/system-health.md` records both smoke commands as `PASS`.
- `.agents/state/requirements-verification-matrix.md` records the Company OS
  lifecycle and operating-model registry smoke requirements as `verified`.

## Implementation Plan

1. Add this LUC-85 evidence packet as a verified test entity through scanner
   overrides.
2. Add explicit `tests` relations from this packet to both `authHeaders`
   helper entities.
3. Add explicit `documents` relations from both helper entities to the V1EVID
   source packet that records the smoke execution.
4. Regenerate architecture-awareness, app-completion, and project-truth
   indexes.
5. Read back that the specific `authHeaders` rows no longer appear in
   `docs/status/project-truth-index.json` as missing-test-link gaps.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2810` entities / `6577` relations / `16442` files; overrides applied: `29` entity, `28` relation. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `1243` items / `5` flows / `1205` missing test links / `20` missing doc links / `13` implemented-needs-proof / `0` blocked. |
| Project Truth apply | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-04T17:35:41.452Z`, public probe `pass`, `criticalRuntimeFindings=0`, `incompleteEventChains=0`, `operationalGateGaps=0`. |
| Target row readback | PASS | Both `authHeaders` priority rows now report `evidence.hasTest=true` and `evidence.hasDoc=true`; remaining risk is `implemented_needs_proof`, not `missing_test_link`. |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, all gates pass. |
| Fresh Docker proof attempt | BLOCKED BY SEED ERROR | `docker info --format '{{.ServerVersion}}'` returned `28.3.2`; `docker compose up -d --build backend` built the validation stack and `npm run prisma:migrate:deploy` applied `31` migrations, but `npm run seed` failed before either target smoke could run with Prisma `P2002` on `AutomationRule(workspace_id,name)` in `prisma/seed.ts:916` during `ensureCompanyOsFoundation`. |
| Runtime cleanup | PASS | `docker compose down -v` removed the validation-owned `roost-backend-1`, `roost-postgres-1`, `roost_default`, and `roost_companycore_postgres` resources; follow-up `docker ps` and `docker volume ls` checks found no matching `roost` / `companycore` validation resources. |
| Diff whitespace | PASS | `git diff --check` returned only LF-to-CRLF warnings for changed generated/status files. |

## Acceptance Criteria

- [x] The two `authHeaders` helper rows have a current verified test link.
- [x] The app-completion / Project Truth indexes are refreshed.
- [x] No duplicate browser proof or protected runtime proof is requested.
- [x] Remaining app-completion debt is explicitly classified as separate from
  this issue.

## Result Report

Status: `VERIFIED_DONE`.

The Account access `authHeaders` missing-test-link gap was handled as an
evidence-link repair. Existing V1EVID smoke proof already verifies the
bearer-token header path in local Docker-backed API smokes. This packet links
that proof to both helper rows and links the helper rows to the V1EVID source
document. Current row readback confirms both rows now have `hasTest=true` and
`hasDoc=true`.

Residual risk: Project Truth still lists the same rows as
`implemented_needs_proof` because generated function entities default to
`implemented` and the current scanner's entity override mechanism only applies
to file entities, not `file#function` entities. That is no longer a
missing-test-link defect. A fresh Docker-backed rerun was attempted after the
index repair, but it stopped at seed setup with Prisma `P2002` on
`AutomationRule(workspace_id,name)` before the target smokes could execute; that
is a seed idempotency/runtime-proof blocker if fresh smoke reruns are required,
not evidence that the `authHeaders` test link is still missing. A future Docs
Memory / Project Manager evidence-model lane can decide whether smoke helper
functions should be excluded from app-completion or whether function-level
status overrides should be supported. Follow-up [LUC-94](/LUC/issues/LUC-94)
is assigned to Data Persistence Engineer to repair the seed idempotency failure
before requiring fresh Docker smoke proof.
