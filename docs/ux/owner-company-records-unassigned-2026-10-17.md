# Owner inventory for CompanyRecords without context

## Approved boundary

The owner approved one bounded Outcome 0 delivery on 2026-10-17. The existing
CompanyRecord catalog gains an owner-only **Do uporządkowania / To organize**
view for records with neither a department relation nor a company-wide scope.
The view searches across record types on the server, pages non-archived Current
and archived History separately, shows provenance, source kind, status and record verification, and
opens exact read-only detail plus the existing task-specific source audit.
It does not approve a record, grant agent context, classify a record as
disposable, change company data, or add a main navigation section.

Allowed delivery effects are Roost API/web code, tests, canonical documentation,
one scoped push and at most one standard Coolify deployment after safe preflight.
No production CompanyRecord write, migration, Worker/model call, portfolio
change, VPS image/container/volume removal, purchase or usage reset is included.
G24c/G25 remain stopped.

## Entry evidence and implementation

Production build and remote main were both `1836b518`. Read-only SQL found
5,231 CompanyRecords: 2,403 active and 2,828 archived. Of the active set,
2,400 were `documentation-import`; 2,402 had
`verification_state=not_started`. None of the active records had a
`company_record` department relation or company-wide scope. The existing
department register uses only those relations/scopes and therefore could not
show this active set. The first eight active metadata rows showed several
`architecture_section` imports marked `legacy_assumption`; no record body
was used to infer trust or a deletion decision.

The new `GET /v1/company-records/registry/unassigned` is owner-only and
workspace-bound. It uses literal server search across title, key and
description, deterministic `updated_at, id` order, count/page read in one
repeatable-read transaction, and a maximum of 100 compact metadata rows.
The predicate excludes records with any department relation or a company-wide
scope; History selects archived unassigned records separately. Current retains
blocked as well as active records for owner triage. The response
does not contain record body or source-review receipts. Exact detail uses the
existing workspace-scoped record read. The source audit remains explicitly
task-bound. The ordinary department register and agent/MCP/Worker source
eligibility paths are unchanged.

The existing catalog offers the owner a button into this mode. Its default
page is 25 rows. PL/EN copy explains that catalog presence is not task approval,
while an individual record may separately be approved for one Task. Detail is
read-only and shows the canonical content fields, scope IDs, state,
metadata and timestamps, with an action to open the existing source audit.
Loading, empty, search, history, pagination and retry states are part of the
same owner journey. Mobile cards display both title and key. Changing filters
or opening audit cancels a pending detail read so dialogs cannot stack.

## Verification and release

- Local native PostgreSQL/API test: `ROOST_G9_SOURCE_READ_ONLY=1 npm run
  test:company-information:local` passed 9/9 after all migrations. The added
  case covers mixed record types, department/company exclusion, Current and
  History, literal search, compact projection versus exact detail, paging,
  malformed queries, member/viewer/agent/anonymous refusals and workspace
  isolation. Its disposable database and role were removed, and the local
  PostgreSQL container's prior stopped state was restored.
- `node scripts/company-records-unassigned-ui.test.mjs` passed 4/4 PL/EN
  owner journeys at 390/1280 CSS pixels plus member refusal: entry from the
  catalog, paging, search, error/retry, exact detail, source audit and History.
  The fixture also covers a delayed detail response after switching to audit,
  mobile record identity and translated record type.
  The pre-existing register fixture passed 6/6.
- `npm run validate`, `npm run codex:check` and `git diff --check` passed.
  A direct TypeScript check of the web component found only four existing
  errors in `cc-button.tsx` and `cc-data-table.tsx`; the repository's
  `typecheck` script covers `src/`, while Vite compiled the web bundle.
- Independent Security review found no authorization, workspace or SQL
  injection blocker. Its Current/status wording concern is resolved by the
  explicit non-archived meaning and a blocked-record native assertion.
  Independent UX review identified mobile identity, incomplete detail,
  overlapping dialogs, overbroad approval copy and untranslated type labels;
  each was repaired and rerun in the browser fixture. The existing source
  panel's error detail prop was corrected while wiring its recovery path.
- Read-only release preflight matched remote `main`, the running backend and
  public health at `1836b518`. PostgreSQL was healthy on its retained named
  volume with 160 finished migrations and zero unresolved. Coolify's latest
  deployment `6452` was finished and no build container was running; the
  current and predecessor backend images were retained. The VPS initially had
  10,596,200,448 B available, below the documented 12,884,901,888 B build
  planning allowance. One previously authorized `docker builder prune -f`
  removed 1.978 GB of unused build cache only. Available bytes then measured
  12,606,976,000 B, still 277,925,888 B below the allowance; reclaimable
  build cache was 0 B. PostgreSQL stayed healthy. No image, container, volume
  or business record was removed or changed. No release backup, push,
  deployment or signed-in production read-back was attempted at this stop.

A fresh read-only check still found remote `main`, backend and public health at
`1836b518`, Coolify `6452` finished and no build container. Root free space
immediately before the separately authorized second standard cache prune was
12,606,283,776 B. `docker builder du` marked 6.053 GB as reclaimable but all
of it was **shared**, with 0 B private. The one further
`docker builder prune -f` reported **0 B** removed. A subsequent physical
`df -B1 /` measured 12,606,218,240 B, a 65,536 B decrease and
278,683,648 B below the planning allowance. The same backend/PostgreSQL
containers remained running, PostgreSQL healthy. No further cache prune is
authorized or useful for this release. Push, deployment and backup remain
unattempted.

The owner subsequently authorized removal of **only** old backend image
`13f17f26` with ID
`sha256:a4fecb73a011ed5564e2b6e67ce32012330c582a7c5415f047d645c83dd2eec2`.
The immediate read-only preflight matched that exact tag/ID, zero container
references, no build container, finished Coolify queue, healthy retained
PostgreSQL, and unchanged running `1836b518` plus predecessor `322c74f6`
images. One `docker image rm` without force untagged and deleted only the
approved image. Physical free space rose from 12,605,853,696 B to
13,171,994,624 B, a measured gain of 566,140,928 B. The resulting free
space exceeded the planning allowance. Both retained Roost containers and
the rollback image remained.

A fresh encrypted PostgreSQL backup `b5a1c0da-9daa-4052-83eb-0cc20a2d037d`
captured 301,769,938 archive bytes at 2026-10-16 22:29:38 UTC. Isolated
restore matched the source and was verified at 22:35:31 UTC. A separate
`verifyPrerequisites` read-back authenticated the latest encrypted copy;
the temporary restore database and backup lock were absent. Receipt and key
remain private outside Git. After backup, root free space was 13,081,182,208 B,
still above the allowance; the original backend and PostgreSQL were healthy,
with 160 finished migrations and zero unresolved. Scoped push, one standard
deployment and signed-in read-only production smoke were pending at this
checkpoint and are recorded below.

This slice addresses owner discovery of unassigned records. It does not
classify 2,400 imports, make them globally approved, prove a live agent packet
for one of them, or complete all RF-UX-010/012 and RF-CTX-027 clauses.

## Production read-back (2026-10-17)

One fast-forward push moved remote `main` to
`72d7041839fe5f302424424337022d93ae05ed91`. The single standard Coolify
deployment `6453` finished at 2026-10-16 22:39 UTC. Public `/health` and
`/v1/health` returned `ok` and that exact build commit; the running backend
image had the same tag. PostgreSQL was healthy on its retained
`rnqqkhl3o3dut4qv56mlxly2_companycore-postgres` volume. Read-only SQL found
160 finished migrations, none unfinished or rolled back, and unchanged
CompanyRecord totals of 2,403 non-archived and 2,828 archived. Anonymous GET
of the new registry returned 401. The current and two prior backend images
remained available; no second deployment ran. Sampled free space during build
bottomed at 10,501,529,600 B, above the retained 6 GiB floor; the later
read-back measured 10,555,842,560 B. The pre-release encrypted backup and
isolated restore are recorded above; no post-release backup is claimed.

The signed-in owner entered from the 08 Zasoby knowledge register. The new PL
Current view showed 1–25 of 2,403 across 97 pages, and Next showed 26–50 of
2,403 on page 2. Literal search by `portfolio-sites-v116` returned the exact
record on one page. Its detail opened as read-only, with a separate source
audit. The audit required a selected Task and stated that catalog presence
grants no global eligibility; no approval action was taken. PL History showed
1–25 of 37 on page 1 of 2 with archived status. Switching to EN showed the
translated To organize, Current/History, source warning and 37 archived
results. The original Polish Task tab was restored afterwards. No production
CompanyRecord or Task was written.

One copy defect remains in the deployed view: its introductory sentence says
"Current records" / "Bieżące rekordy" even with History selected. The History
control and each archived row show the correct state. This does not change
records or eligibility, but the wording should be corrected in a separately
authorized release. This bounded owner discovery slice is deployed and
observed; broader provenance classification and cleanup remain open.
