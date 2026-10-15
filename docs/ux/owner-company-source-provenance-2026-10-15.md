# CompanyRecord source provenance, 2026-10-15

This bounded Outcome 0 slice gives the workspace owner a read-only, task-bound view of a CompanyRecord's source, current revision, review, validity and history. It does not create or approve a source, change any business record, or make an unselected record globally eligible. It does not complete RF-CTX-027 or RF-UX-012 across all source families and owner journeys.

## Contract

- The existing owner-only `GET /v1/company-records/:id/source-audit` keeps its full audit response. `projection=summary` returns a compact current-record projection and paginated history metadata without historical bodies. The selected `taskId` is resolved inside the caller's workspace. A foreign or absent task is not disclosed.
- The eligibility decision uses `companySourceEligibility`, the reason-bearing form of the same predicate used by task-bound agent reads. The latest review for the selected task is fetched independently of the visible review-history page. Application-linked records additionally require the task's project/application link; archived tasks are denied. With no task, the status is `task_required`.
- Owner-only `GET /v1/company-records/:id/source-audit/task-options` supplies at most 30 compact task choices, including archived tasks, with a title or exact-ID search and an indication when more choices exist. It does not load task bodies or an unbounded task register.
- The panel is reachable from the CompanyRecord workbench and an exact record deep link. It shows provenance/import fields, revision, verification state, latest task review and its rationale, validity, paginated review decisions and body-free history. Missing review is described as missing proof, not a judgment that the imported record is useless.

## Local verification

`npm run validate` passed lint/route-capability checks, typecheck and both builds. The focused G9a disposable PostgreSQL native suite passed 7/7 after all migrations were applied to its isolated database; it verified an eligible current review, task-required and denied states, foreign workspace/task refusal, bounded task choices, application scope, agent/general-key refusal, compact history projection and preserved full audit response. The disposable database and role were removed by the test harness.

The owner workbench and panel passed 20 headless Chromium cases in PL/EN at 390 and 1280 CSS pixels, including eligible, missing-proof, withdrawn, archived-task, keyboard, pagination, delayed-page/task-switch, non-owner, auth-retry and read-only-request checks. An independent UX reviewer reran the browser script and visually inspected the 390-pixel Polish panel; no remaining concrete local defect was found. An independent Security reviewer found no concrete owner-boundary, workspace-scope or summary-body bypass in the diff. Both reviews are source/local evidence, not a signed-in production acceptance. `npm run codex:check` passed all three infrastructure checks, and requirement coverage remains 236/236.

## Release and limits

No schema migration is introduced. Read-only VPS preflight found about 15 GB free, a healthy retained PostgreSQL volume and the running `4297fb15` backend image available as the code rollback artifact. The older documented backup and isolated restore were not refreshed in this slice; no production schema or business-data change was planned.

## Deployed read-back

Scoped commit `c7f375dd8b948597552ba669af4215055a01c7ff` fast-forwarded remote `main` from `4297fb15`. Exactly one Coolify webhook deployment, `6436`, finished at 2026-10-15 17:32:29 UTC. Public API and web `/health` returned `ok` and the exact commit; the web root and login route returned 200. Anonymous calls to both new audit routes returned 401. The replacement backend ran the exact image, PostgreSQL restarted healthy on the retained named volume, and all 158 migrations remained finished with none unresolved. Pre/post business-record and review counts were unchanged. The previous image remains available for a code rollback. The VPS had about 12.7 GB free after release.

A read-only probe inside the deployed backend applied the shared eligibility function to existing production CompanyRecord reviews and tasks. It returned positive eligibility for the sampled current task pairs without emitting identifiers or source bodies. This establishes a real-data runtime read; it is not an authenticated HTTP or signed-in UI observation. The temporary in-app browser showed only the public landing page and login link, with no owner session. No production source review, business-data write, archive, deletion, model call or Worker action occurred in this smoke.

This bounded panel slice is delivered, while a signed-in production owner walkthrough remains unobserved. The wider source families, application/agent journeys, RF-CTX-027 and RF-UX-012 remain open. This post-release evidence correction is retained in a local documentation commit to avoid a second webhook deployment.
