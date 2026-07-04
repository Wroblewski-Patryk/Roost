# LUC-107 Account Access Auth Headers Fresh Proof

Date: 2026-07-04
Issue: [LUC-107](/LUC/issues/LUC-107)
Stage: verification

## Task Contract

- Goal: prove the Project Truth Account access `authHeaders`
  `implemented_needs_proof` rows with fresh local runtime evidence.
- Task Type: QA verification / app-completion evidence.
- Current Stage: verification.
- Deliverable For This Stage: Docker-backed smoke proof, index readback, and
  source-control/deploy disposition.

## Scope

Indexed gap:

- `scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders`
- `scripts/operating-model-registry-lifecycle-smoke.mjs#authHeaders`

Files updated:

- `docs/planning/luc-107-account-access-authheaders-fresh-proof.md`
- `docs/architecture/scanner-overrides.json`
- generated architecture and Project Truth status exports after refresh
- project state/task/module-confidence ledgers

Out of scope:

- Product code, schema, API contract, web UI, browser proof, protected
  production smoke, credential value read, push, deploy, restart, provider
  mutation, or production mutation.

## Diagnosis

The `authHeaders` rows are helper functions inside two already scoped smoke
scripts. They build bearer Authorization headers from locally registered owner
tokens, and the smokes immediately use those headers for protected Company OS
and operating-model API calls.

The LUC-85 evidence-link repair proved the rows had test and document links.
LUC-94 then repaired the seed idempotency blocker that had prevented a fresh
Docker-backed rerun. LUC-107 reran the affected smokes against a disposable
Docker PostgreSQL database to close the remaining runtime-proof question.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Pre-run resource check | PASS | `docker ps`, `docker volume ls`, and `docker network ls` with `roost|companycore` filters returned no matching validation resources. |
| Docker availability | PASS | `docker info --format '{{.ServerVersion}}'` returned `28.3.2`. |
| First Docker attempt | ENV INJECTION FAILURE | `docker compose build backend` PASS, migrations and seed PASS, then `npm run company-os:trace-smoke` failed before target behavior with `Missing required production environment variable: AUTH_TOKEN_SECRET` because the proof-only env vars were not passed into the runtime container. |
| First cleanup | PASS | `docker compose down -v` removed `roost-postgres-1`, `roost_default`, and `roost_companycore_postgres`. |
| Fresh Docker proof | PASS | `docker compose run --rm -T -e AUTH_TOKEN_SECRET=... -e INTEGRATION_SECRET_KEY=... -e API_KEY_HASH_SECRET=... backend sh -lc "npm run prisma:migrate:deploy && npm run seed && npm run company-os:trace-smoke && npm run operating-model:registry-smoke"` applied `31` migrations, seeded, and both smokes returned `ok: true`. The values were disposable local proof values only and are intentionally redacted here. |
| Company OS smoke readback | PASS | `company-os:trace-smoke` returned trace `v1evid-1783191924411`, `eventTypesVerified=["approval_requested","approval_approved","stage_started","stage_validated","stage_completed","v1_lifecycle_followup_needed"]`, `eventCount=9`, and `auditLogCount=7`. |
| Operating-model smoke readback | PASS | `operating-model:registry-smoke` returned trace `v1evid-om-1783191927569` and verified `folder:create/read/update/delete`, `storage-location:create/read/update/delete`, `knowledge-root:create/read/update/delete`, `automation-definition:create/read/update/delete`, `aggregate-readback`, and `cross-workspace-deny`. |
| Final cleanup | PASS | `docker compose down -v` removed validation-owned resources. Follow-up filtered checks should remain empty before closure. |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2812` entities / `6589` relations / `16444` files; `30` entity overrides and `30` relation overrides applied. |
| App-completion refresh | PASS WITH MODEL DEBT | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `1243` items / `5` flows / `1205` missing test links / `20` missing doc links / `13` implemented-needs-proof / `0` blocked. |
| Project Truth apply | PASS WITH MODEL DEBT | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-04T19:06:57.019Z`, public probe `pass`, `criticalRuntimeFindings=0`, `incompleteEventChains=0`, and `operationalGateGaps=0`. |
| Target row readback | PARTIAL INDEX CLASSIFICATION | Both target rows report `hasTest=true` and `hasDoc=true`; both still report `risk=implemented_needs_proof`, and Project Truth still selects `scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders` as first gap. |
| Architecture status | PASS | `npm run architecture:status` returned `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, all gates pass. |
| Diff whitespace | PASS | `git diff --check` returned LF-to-CRLF warnings only. |

## Acceptance Criteria

- [x] The two target `authHeaders` helper rows have fresh runtime proof.
- [x] The proof exercises bearer-token Authorization headers after local owner
  registration.
- [x] The Project Truth / app-completion indexes are refreshed or have a
  recorded model limitation.
- [x] No protected production smoke, secret disclosure, push, deploy, or
  runtime mutation occurred.

## Result Report

Status: `VERIFIED`.

Fresh Docker-backed local proof confirms the Account access `authHeaders`
helpers are implemented and exercised by protected API smokes. Both target
scripts registered local owners, built bearer headers from returned tokens, and
successfully used those headers through protected lifecycle and registry API
flows.

Residual generated-index note: Project Truth still labels the helper function
rows as `implemented_needs_proof` and still selects one `authHeaders` row as
the first gap, even after the fresh LUC-107 proof relation is applied and row
readback shows `hasTest=true` and `hasDoc=true`. The product behavior is
verified; the remaining row is evidence-model/classification debt, not a
runtime Account access defect. The next owner should decide whether
function-level smoke helpers can be marked verified, excluded from
app-completion, or mapped to the parent smoke proof differently.

Follow-up: [LUC-110](/LUC/issues/LUC-110) is assigned to Roost PM for the
remaining Project Truth function-row classification debt.

Deployment impact: none. This was local Docker QA only.
