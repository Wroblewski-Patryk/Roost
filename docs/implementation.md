# Current implementation

Current delivery status and evidence.

**Active gate:** G24c.

**G24c:** Governed Sites inputs and Ready are live. One Worker attempt failed without result; Writer remains fenced. Server is at `3f971d55`; the running Windows Host has not loaded its diagnostic patch. No native/model proof. [Evidence](architecture/reference-site-method-proof-g24c.md#g24c-site-evidence-and-role-repair). Gate open.

**G24b:** [release proof](architecture/reference-site-checklist-g24b.md#g24b-release-and-limits).

**G24a release:** [proof](architecture/reference-site-study-g24a.md).

**G22 release:** Native run/review and deployed read-only checks passed. [Evidence](architecture/local-model-g22.md).

**G21 bounded delivery (2026-10-12):** Deployed `c16efcf6`; native Worker, PL/EN browser and Security/UX checks passed. The owner path showed a blocker and unverified product/sale readiness. [Proof and limits](architecture/application-control-g21.md#verification-and-release).

**G20 accepted outcome:** One owner-adopted, versioned Goal states a measurable result, metric, numeric target, evidence source and accountable person. Impact preview and a separate owner confirmation precede adoption. A verified evidence record supports each accepted measurement; unknown or stale evidence cannot silently become progress. The owner can inspect linked tasks and attributable execution/review economics while provider tokens, cost and human effort remain unknown where not observed. The assigned agent can read only the current accepted mandate for its task and propose a measurement, never accept its own progress or change the target. The owner has not supplied a real numeric target or baseline, so isolated fictional fixtures are the positive test; production must not create a fictitious goal.

**G20 bounded delivery (2026-10-12):** Native Goal adoption, task-bound agent proposal, measurement review, economics projection, PL/EN UI, backup, API/MCP, `validate`, `codex:check` and Security reviews passed. [Proof and limits](architecture/goal-mandates-g20.md#verification-and-release). An encrypted current backup passed isolated restore parity. Commit `56fd45ff` deployed with the additive migration and healthy API. Signed-in owner goals route showed its truthful empty state; unauthenticated mandate GET returned 401. No production numeric mandate or measurement was created. Real owner adoption and measured progress remain unproved pending a separately approved exact Goal.

G19 reached its bounded native and deployed read-only evidence on 2026-10-12. [Scope, proof and limits](architecture/company-direction-g19.md). The owner separately adopted a real private direction in the production UI after G19; a signed-in read-back showed the new version as accepted. That owner action is not G20 numeric-goal authority.

**G17 release:** Implementation commit `cbc20bf5` was deployed in Coolify run 6382. Native/API/UI/Security checks and read-only production smoke passed within the bounded gate. No production business-data write or paid model call was made. See [exact evidence and limits](architecture/procedure-improvement-g17.md#g17-verification-and-release).

G15 reached its bounded native and deployed read-only evidence on 2026-10-11. [Historical scope, proof and limits](architecture/g15-implementation-history.md). Its actual child Hermes execution remains unobserved.

G13 reached its bounded native and deployed owner-console evidence on 2026-10-11. After independent G13 acceptance, the coordinating Asystent commissioned exactly G14 on 2026-10-11. G15 was later commissioned separately on 2026-10-11 as described above.

**G14 commissioned outcome and effects:** Admit complete Ready work by actual task dependencies, an online capable host, observed resources and low/normal/high/critical priority with aging. Preserve one laptop Writer and versioned checkpoint facts through interruption and safe continuation. Only a confirmed critical incident may displace work. Scope is Roost/Worker code, an additive migration if required, disposable-database and native Worker checks, Security review, canonical documentation, scoped commit/push and ordinary deployment after release preflight; production smoke is read-only. No synthetic production company record, paid model proof call, portfolio change, VPS cleanup, purchase, usage reset or G15 work. No fixed hour ceiling; the owner retains the 70% weekly-usage stop after bonus tokens are exhausted.

**G14 architecture extension approved (2026-10-11):** The owner approved a bounded exact-task critical-incident confirmation, atomic preemption request, native stop and checkpoint acknowledgement before Writer release, and later continuation through the existing G12 changed-plan approval and fresh Ready. The approval does not authorize replay of effects, a paid model proof call or a production company-data write. A failed or uncertain native stop keeps the Writer and the old attempt's evidence; incident priority alone never cancels work.

**G14 starting inventory and estimate (2026-10-11; baseline before implementation):** `/executions/claim` currently takes the oldest attempt-zero queued execution and returns an error for that candidate rather than scheduling another eligible task. It checks the host's advertised application/class, current Ready and continuation, and absence of another nonterminal execution assigned to that host. Generic Task/Dependency rows exist, but the claim path does not test a prerequisite task's completion, priority or aging. Task priority is a free-form nullable string. Host register/heartbeat has a 60-second freshness projection and provider metadata but no measured CPU/memory/disk capacity declaration or admission thresholds. The Worker already holds a shared Windows Writer lock before claim and preserves versioned server/local checkpoints; automatic recovery is limited to proven pre-spawn states. A post-spawn effect remains fenced for reconciliation. The expected change surface is one scheduler admission/service and its route, host resource observation and protocol, an atomic database slot constraint or equivalent transaction fence, focused API/Worker tests, and the relevant architecture/operations handoff; roughly 12–20 engineering hours for queue ordering, dependencies, capacity and writer safety if the current protocol can be extended compatibly. Confirmed-incident preemption is a separate material architecture issue: the current generic `technical_incident` record has no confirmation authority, and the existing cancellation is terminal rather than a safe scheduler pause/resume. A versioned incident confirmation and exact stop/ack/continuation protocol would add a further estimated 10–16 hours plus independent Security proof. The owner approved that bounded extension above. This paragraph records the pre-implementation baseline and estimate; current implementation and proof are recorded in the G14 evidence below.

**G14 local verification (2026-10-11; before release):** The scheduler now scans matching queued attempt-zero work, orders valid task priorities with daily aging, checks task prerequisites and a fresh host resource observation, rechecks Ready/continuation inside a serializable claim transaction, and enforces one active execution per host with a partial unique index. A fresh owner command pins the displayed incident revision, exact incumbent/incoming execution, checkpoint version and reason. The bound Worker stops its Windows Job and confirms a versioned checkpoint before releasing its Writer; its restart intent protects the lease token with CurrentUser DPAPI and permits only an exact read of a server stop already committed. Later continuation remains under G12 changed-plan approval, new budget and fresh Ready. Both additive migrations applied to a disposable PostgreSQL database. The focused HTTP journey passed 1/1 with a real Windows Job tree, Worker-to-API-to-database stop ACK, context-invalidation race, denied generic terminal paths, exact/mismatched replay, local Writer checkpoint and subsequent critical claim. Native Worker G14 tests passed 4/4, scheduler tests 2/2, owner UI journeys in PL/EN at 390/1440 CSS pixels passed, adjacent lease/terminal/Writer checks passed 92/92, and company-information checks passed 112/112. Independent Security review found no remaining concrete blocker after the DPAPI and incident-revision fixes. `npm run validate`, `npm run codex:check` and `git diff --check` passed. A broad API run was stopped after two passing unrelated cases because its long-running fixtures did not add proof for this bounded gate; no full-suite pass is claimed. The disposable database and test roles were removed. Production preflight, commit/push, deployment and read-only smoke are still required.

**G14 release preflight (2026-10-11):** Local commit `2c6de1fe4b6ff6fca26a107d63d465fcfac0e5ca` passed scoped staging and was clean before push. Before release, remote `main`, public `/health` and the running backend all reported `21c95262bc5c93f64d416eb72719f832d3a6f2ae`; PostgreSQL was healthy on the retained named volume, the previous backend image remained available, the latest production migration `20261011150000_company_task_proposals` was finished without rollback, and a read-only query found zero active host assignments and no duplicate active host rows. VPS had only 4.5 GB free, so the owner separately approved one `docker builder prune -f` limited to unused build cache. Docker reported 7.946 GB reclaimed, 0 B reclaimable build cache afterwards, and 12 GB free; images, containers, volumes and Roost data were not pruned. The existing encrypted backup verified by isolated restore on 2026-10-10 remains the last documented recovery copy; no fresh backup of intervening production changes is claimed. The normal fast-forward push to `main` succeeded.

**G14 deployed read-back and boundary (2026-10-11):** Public `/health` and `/v1/health` returned `ok` with exact implementation commit `2c6de1fe4b6ff6fca26a107d63d465fcfac0e5ca`; the web root returned 200. The replacement backend was running and PostgreSQL healthy on the same named persistent volume. Production migrations `20261011170000_critical_preemption_scheduler` and `20261011173000_critical_preemption_context_stop` were finished without rollback; the preemption table had zero rows, the one-active-host index existed, and a read-only query found zero active host rows and zero duplicates. Unauthenticated preemption-candidate access returned 401. The signed-in owner console opened its Codex execution history, which showed no in-progress execution on the page; it could not expose a live preemption control for read-only smoke. The previous backend image remained available and the VPS had 9.6 GB free after rollout. No production incident, task, preemption, Worker attempt or paid model request was created for proof. The native disposable-database journey proves the positive stop/checkpoint/next-claim path; a real production preemption remains unobserved. G14 meets its authorized native and deployed read-only boundary. Stop before G15.

**G13 authorized scope:** G13 Agent proposal. The owner delegated a gate-by-gate cycle on 2026-10-11: an independently checked completed gate permits the coordinating Asystent to commission exactly one next bounded gate. G12 was independently checked before this G13 commission. Deliver a task-bound agent proposal of one sourced, deduplicated company task; an owner can inspect and reject it or accept an edited Draft/Needs-context Task with one accountable owner. A proposal or ordinary task status cannot start the Worker; Submit-for-execution and Ready remain separate. Use the agent's own credential, an exact owner-issued proposal mandate and a current task-approved company source. Scope is the necessary additive data model, API/MCP authority, owner console, native disposable-database proof, Security review, canonical documentation, scoped commit/push and ordinary deployment after recovery preflight. Perform only read-only production smoke; do not create a synthetic company task or call a paid model solely for proof. No G14, portfolio application changes, VPS cleanup, purchases or usage resets. No fixed hour ceiling; after bonus usage, stop new work at the owner's 70% weekly threshold. Stop for an unplanned general authority architecture, material scope change, unavailable service or repeated ineffective attempts.

**G13 local verification (2026-10-11; before release):** The additive proposal ledger, exact owner-issued mandate, bound-agent API/MCP submission, reviewed company-source fence, deduplication, occurrence history and owner decision path are implemented. Acceptance creates one owner-accountable unassigned `todo` Task with Draft readiness; it does not create an execution or Ready packet. An isolated PostgreSQL database applied all 136 migrations and passed the focused HTTP G13 journey 1/1, including exact-action owner proof, bound-key refusals, stale review, duplicate submissions, late occurrence version conflict, revocation, reject and accepted Draft with zero Worker executions. The disposable database and role were removed after the test. Proposal contract/principal tests passed 8/8, owner proposal browser checks 16/16 in PL/EN at 390/1440 CSS pixels, and mandate browser checks 4/4. `npm run validate`, `npm run codex:check` and `git diff --check` passed. The first proposal-browser attempt timed out while the web build ran concurrently; the isolated rerun passed. Independent Security review found no remaining concrete bypass in the inspected final diff. A full API suite and a production proposal/mandate have not run. The local proof does not show a paid model or a real production agent submission. Release preflight and deployed read-back remain required before G13 can be marked met.

**G13 release preflight (2026-10-11):** Remote `main`, the running backend and public health all reported the same G12 commit `bbd3fcf5d931c732be3b84eb686f8d4205ece12d`. PostgreSQL was healthy on the retained named volume; the previous backend images remained available. The VPS had 7.4 GB free and 5.5 GiB available memory before release, with no Roost build container running. The existing encrypted Roost backup verified by isolated restore on 2026-10-10 remained present outside Git: its local SHA-256 and byte count matched the retained verification receipt, which recorded completed restore and removal of the isolated restore database; the recovery key and owner acknowledgement files were present. This verifies the retained recovery evidence, not a new backup of subsequent production changes. No VPS cache or image cleanup was performed.

**G13 deployed read-back and boundary (2026-10-11):** The scoped source commit `db6d80111168df4793fab42e1c0c0d77db9df3b5` was fast-forward pushed to `main` and served after a transient 503 during Coolify container replacement. Both public `/health` and `/v1/health` returned `ok` with that exact build; the web root and API root returned 200. Production PostgreSQL recorded migration `20261011150000_company_task_proposals` finished without rollback, with zero proposal and mandate rows. The replacement PostgreSQL container was healthy on the same named persistent volume, the previous backend image remained available, and the VPS had 5.8 GB free. Unauthenticated proposal listing returned 401. In the signed-in owner console, 00 General showed the proposal-review and mandate sections with truthful empty states. This proves deployment and owner read-back of the empty path; no production agent proposal, owner mandate/decision, new Task, Worker execution or paid model request was created for the smoke. G13 meets its authorized native positive/negative and deployed read-only boundary. The first genuine production proposal and owner decision remain unobserved. Stop before G14.

G12 Progress and budget is delivered at native, database and production owner-read evidence.

**G12 audit checkpoint (2026-10-11; before implementation):** The application `/executions/:id/actions/retry` route copied the previous Ready metadata into a new `AgentExecution`, whose `attempt` started at zero; ordinary `/executions` creation also ignored earlier spent application attempts. Thus the per-execution Hermes limit did not bound attempts for a task. Company-information runtime already rejected reuse of its owner Decision, and the fixed-effect fixture was one-shot. The Worker had an original-start duration timer, lease fencing and a durable pre-spawn checkpoint. Direct Codex refused launch without a proven output-token cap; managed Hermes recorded provider token/cost/physical-call counts as unknown. `npm run test:agent-host-duration` (17), `test:agent-host-output-budget` (33) and `test:agent-host-company-information` (112) passed at this audit. These tests did not prove semantic no-progress inside a live Hermes attempt. The admitted quiet Hermes transport does not expose turns, actions, provider 429/Retry-After or semantic progress. Heartbeat and process output silence cannot be used as evidence of task stagnation; lease-level 429 is a transient transport condition. An independent changed-plan continuation could not be represented by the completed-result-only review flow for a failed attempt. No G12 code or production effect existed at this checkpoint.

**G12 observability decision approved by the owner (2026-10-11):** Use task-attempt and independent-review boundaries as the observable progress unit. A terminal attempt with no accepted result, or a rejected result with no accepted task progress, stops that task; no generic retry or fresh execution on the same Ready pin. A new attempt follows a separately reviewed changed plan and fresh Ready budget, with both the previous stop and new authority linked durably and shown in the owner console. Provider-internal operations and 429 remain explicitly unknown. Proving no-progress *during* a silent Hermes run would require a new structured provider observation contract and separate architecture approval; a quiet timer is insufficient. The implementation contract is [Task execution continuation v1](architecture/task-execution-continuation-v1.md).

**G12 local verification (2026-10-11):** Application creation and company-information Start now bind a new owner continuation event to the exact previous spent attempt, changed plan, fresh Ready and bounded budget; claim, heartbeat and managed admission recheck it. Generic Retry is closed. The owner console shows the terminal checkpoint, reason and measured-or-unknown usage and reads the current approval back before enabling Start. A native Windows quiet Hermes-process fixture exited with no answer and proved a single failed attempt, Job cleanup and unknown provider counters; the existing native duration/output-budget checks passed 17/17 and 33/33. A focused disposable PostgreSQL API test passed 1/1 for application continuation, including wrong principal, task, Ready, material, replay and post-queue staleness refusals. The disposable company-information HTTP/Worker-claim flow passed 13/13 in G12 mode: failed prior attempt, renewed Decision/risk/admission/Ready, owner event and exactly one new queued execution with a 360-second budget, without a provider request. The database and role were removed after the test. Owner-console checks passed 80 browser cases plus 7 model checks and 5 company-result checks. Independent Security rereview found no remaining concrete bypass in the inspected diff. `npm run validate`, `npm run codex:check` and `git diff --check` passed. A broad API run was stopped after 43 top-level tests (127 counted, 118 pass, 5 fail including failed parent/subtest counts, 4 skip): one Windows synthetic fixture cleanup failure, one older clarification Ready context/procedure error before the G12 guard, and one G12 test expectation corrected after manager return; the broad run was not repeated or claimed passing. No production G12 behavior or new paid model attempt is claimed at this checkpoint.

**G12 production read-back repair (2026-10-11):** The first deployed G12 build `b4b7833d` returned healthy API/web build identity and the updated owner-console wording, and the scheduled Windows Worker reconnected. The owner execution-history table failed to load. A read-only production database query found that the previous `GET /executions` loaded 200 full rows, 1266 events and about 14 MB into one response; the native runtime-redaction boundary correctly blocked it at its 512 KiB limit. Four company-information rows also had no application, which the table had not handled. The repair makes the history endpoint return 50 lightweight rows per page, loads a bounded detail on demand with the 20 most recent events and their total count, handles the nullable application, and labels page-local counts accurately. The exact 50-row projection from production data was about 29 KiB and passed the same redaction policy without findings. Focused disposable PostgreSQL continuation/API test 1/1, owner UI checks 80/80 plus model 7/7, context-stop UI 18/18 and redaction UI 8/8, `npm run typecheck` and `npm run codex:check` passed across the repair stages. Repaired build `21cc5f5b` passed public health read-back and the authenticated owner console loaded the first and second 50-row history pages, a completed company-information result with its six timeline events, and an older failed attempt with its stop reason and measured-or-unknown usage. No production task was created and no model was called for this read-back.

Update the active-gate line at completion or when the owner authorizes a bounded gate; a proposed
candidate is not active work.

### G11 task-authority inspection and smallest repair (2026-10-11)

The existing company-information route already validates Submit/Ready against a single task, current source/role packet, risk evidence and owner-approved runtime Decision; it rechecks Ready and the bound Worker identity before signed no-tool model admission. The bounded result currently goes through a separate owner-only `information_review` execution event. That action ignores the declared independent verifier and manager, does not recheck current Ready/source/role/Decision state, and does not use the guarded append-only TaskReviewDecision/TaskReviewAction ledger. The generic review ledger enforces those roles and freshness for application work, but assumes an application and a reviewed Git commit, neither of which exists for this information task. Ordinary Task status remains distinct from accepted result authority.

Repair only this task class: retain G6's queue and native execution path; bind a truthful information-result witness and current task authority to independent verifier review, then require the accountable manager for a scoped return. Reuse guarded review history where possible and project the result in the existing owner view without treating an ordinary status edit as acceptance. Extend operation-specific review admission only if the company task cannot use the existing policy; any migration must be additive and preserve historical data. The first positive path may use a human verifier/manager distinct from the agent executor; agent reviewer grants, generic provider integration, arbitrary task types and full RF-CTX-008–018 coverage are not implied. Test a disposable native task from Ready to review/return and refusal of stale context, role, Decision, wrong identity, replay and status bypass. The previous G6 real Worker/Hermes result is historical runtime evidence, not proof of the new review path; do not start a paid attempt just to manufacture proof. After tests and Security review, check exact deployed build, health and production read-only state; do not create synthetic production records.

**G11 local verification (2026-10-11):** the owner-only legacy review write is closed for new results. A completed company-information execution with a checked Worker receipt and unchanged Ready/Decision/source/role pin now enters the append-only TaskReviewDecision ledger for its assigned human verifier; an independent human manager can record a separate scoped return. Application Git review remains separate. The new migration adds operation-specific company review/return admission and database guards without rewriting business rows. A disposable native HTTP/Worker-claim/Ready test applied all migrations and passed 13/13 in each of six modes: approve, reject then manager return, ordinary-status staleness, selected-source staleness, contradictory Worker receipt refusal, and local-task approval status. The unchanged G6 mode also passed 13/13 after the route repair. These checks cover wrong role, broad Worker key, stale version, wrong seal, replay, member create/cancel, same-Decision retry and contradictory completion. The completion receipt in G11 modes is synthetic after a real claim/admission; no provider/model request ran. The previous G6 production Worker/Hermes result is historical and already has a legacy review, so it cannot prove a fresh G11 review. Independent Security review identified receipt, projection and local-status gaps; additional route review found generic execution-create/retry API ambiguity already backed by existing G6 SQL guards, plus member cancellation without owner authority. API checks now reject those requests explicitly and return a scoped conflict for contradictory completion; the Security rereview found no remaining blocker in the inspected scope. `npm run validate`, `npm run codex:check` and `git diff --check` passed after the repair. Read-only release preflight found 20 GB free, PostgreSQL healthy on the retained named volume, and public health/remote main both at `00cc1d7a4b0bc54291e03d277c6582a3d5fbf05f`. The last documented encrypted backup/isolated restore remains 2026-10-10; no newer backup or production G11 behavior is claimed.

**G11 first release read-back (2026-10-11):** `d00876da26b473b2b3ad36dd9f06aba52d3d781f` was fast-forward pushed and served by the production health endpoint. Public web and health returned 200, an unauthenticated task-review read returned 401, and PostgreSQL reported `20261011130000_company_information_task_review` finished without rollback. Both new review-operation triggers were enabled and the replacement healthy PostgreSQL container retained the same named persistent volume. In the signed-in owner console, the historical company-information task still displayed its Worker result, source revision, declared limits and earlier owner review. That legacy result was already accepted before G11 and cannot be used to assert a fresh independent review. The console also exposed an obsolete new-review button for this already reviewed result; the scoped follow-up hides that button while retaining review access for an unreviewed result or rejected result awaiting manager action. The native G11 path was proved in the disposable database, not by creating a synthetic production record or making another provider call. The Worker receipt remains checked reported evidence, not an independent operating-system attestation. A full API-suite pass and fresh production G11 positive review are not claimed.

**G11 final production read-back and boundary (2026-10-11):** Coolify webhook deployment `6367` finished for `b24d5595473b080ffc473b4c645fa0b3dfa2a132`; public web returned 200 and `/v1/health` reported `ok` with that exact build. The replacement PostgreSQL container was healthy on the retained named volume. In the signed-in owner console, the historical task showed its full Worker result, cited company-record title and revision, declared limits, and earlier owner review. The obsolete new-review actions were absent from both task editor and result panel. G11 reached its owner-authorized boundary with native positive and negative task-review proof and this production read-back. This was a read-only historical-view smoke, not a fresh production G11 decision or a new paid Worker/Hermes run. The previous G6 owner review remains historical and the checked Worker receipt is not an independent operating-system attestation. No production business record changed during this smoke. The final release commit was pushed to `main`; the task worktree was clean. G12 had not yet been authorized at this boundary.

### G10 bounded execution brief

- **Outcome:** an ordinary signed-in owner continues normal work for the existing session lifetime. A stale five-minute fresh-owner check prompts password confirmation for the exact prepared sensitive action, preserves its body and request ID, and resumes it once without weakening its separate authority/expiry rules. A logged-out or password-revoked session is refused by the server. API keys and Worker identities cannot obtain a human session or satisfy reauthentication.
- **Boundary:** inspect actual login, token storage, owner operations and console before editing. Preserve current 12-hour lifetime and `sessionStorage`; `OPEN-AUTH-001` still reserves any longer trusted-browser policy for a new owner choice. Stop for a new provider, material architecture beyond this approved auth/revocation contract, unsupported destructive migration or unapproved production data action.
- **Proof:** native human login, stale-but-valid normal read, exact-action reauthentication, one-use and wrong-body/route/actor refusals, replay/idempotency, logout/password revocation, agent/API-key negatives and preserved owner form; independent Security review, relevant builds/tests and `npm run codex:check`. Release only after disk/recovery preflight; read back exact deployed build, migration, health and protected behavior. Stop before G11.

**G10 isolated checkpoint (2026-10-11):** server code preserves the 12-hour signed-token behavior and `sessionStorage`, adds a session ID carried across workspace changes, per-session logout revocation, password-change version revocation and a 90-second one-use proof for the exact prepared POST body. The owner console confirms the password in the agent-credential editor while retaining its original form and request ID. A disposable PostgreSQL database applied all 134 migrations and passed the focused human-session, legacy-token, agent-key negative and Chromium form tests 4/4, including the existing Worker fresh-owner route; a separate disposable upgrade retained a synthetic existing user and passed the new additive migration. Worker lifecycle/ticket tests passed 106/106. Independent Security review identified and then verified the fix for logout after workspace token rotation; no further authority bypass was found in the inspected diff. `npm run validate` and `npm run codex:check` passed. A single full API-suite pass is not claimed. Production still serves G9 commit `07da99fa2d4a88472ad086fd8b0a7d4e22ea7ab6`, with no G10 migration or behavior deployed. Read-only VPS preflight found 3.1 GB free (96% used) and 7.439 GB reclaimable build cache; no VPS build, cleanup or production data write has run. Release is held pending a safe disk action.

**G10 release preflight update (2026-10-11):** after the owner authorized a one-time build-cache cleanup, a new read-only VPS check found 25 GB free (66% used), 0 B build cache, and no active build container or process. The backend and PostgreSQL containers were up, PostgreSQL healthy, and its named persistent volume remained mounted. The current G9 image and the previous G9 image were retained. No cache cleanup was run because there was no cache to remove. Public `/health` and remote `main` still reported `07da99fa2d4a88472ad086fd8b0a7d4e22ea7ab6`. The last documented encrypted Roost backup passed isolated restore on 2026-10-10; no newer backup has been claimed. Proceed with the approved standard release only while the disk and recovery preflight stay valid.

**G10 deployed read-back (2026-10-11):** commit `631d196876c66a3dcc7ac445c4afd09cfd168b46` was fast-forward pushed to `main` and deployed by Coolify. During container rotation the public health briefly returned `no available server`; it recovered with status `ok` and the exact commit. The web root and `/v1/health` returned 200, and an API CORS preflight returned 204 with the configured web origin. Production PostgreSQL reported migration `20261011030000_owner_session_and_action_proof` finished without rollback, `users.auth_version` and both new tables present, and zero revocation/proof rows before owner smoke. The replacement PostgreSQL container was healthy with the same named persistent volume; the G9 backend image remained available for rollback. VPS free space after rollout was 22 GB. Unauthenticated `/v1/auth/me`, `/v1/auth/reauth`, and `/v1/auth/logout` returned 401; a command with an owner-proof header but no bearer returned 403. After a fresh sign-in the owner console loaded the existing workspace and owner role. Once the five-minute fresh-owner window elapsed, a deliberately invalid credential name triggered the exact-action password prompt while preserving the selected agent and draft. The owner entered the password in the browser; the database recorded one issued and consumed proof. The intentionally invalid final payload was rejected, with agent credential operations still 55 and bound agent keys still 45. Closing the draft made no credential change. Browser sign-out returned to the public page and recorded one server-side session revocation. The smoke did not replay the old bearer after logout; that refusal passed in the disposable native test. No production credential or company record was created or changed by this smoke. A single full API-suite pass remains unclaimed. The last documented encrypted backup/isolated restore was on 2026-10-10; no new backup was taken for this release. Stop before G11.

### G9 bounded execution brief

- **Outcome:** close the bypass from the G8 trusted packet to ordinary API/MCP reads. Search, direct record lookup and other agent-accessible projections of the same company source obey one task-bound eligibility decision. Unbound or missing task authority refuses rather than borrowing a workspace-wide key. Authorized audit keeps historical material with its provenance, state, version and access basis; ordinary owner views remain usable.
- **Entry and scope:** inventory actual CompanyRecord-bearing HTTP routes, MCP manifest/bridge, API-key identities and task binding before changing code. RF-CTX-027, RF-GOV-020 and RF-SEC-007 govern the result. Reuse the G8 source-review receipts and canonical records where sound. Do not infer broad task authority from an API-key capability or a caller-supplied task ID. A newly required task-read grant system or broad cross-domain response-policy architecture is a material scope stop requiring a smaller revised proposal.
- **Allowed effects:** scoped Roost API, MCP, authorization, projection, tests and canonical docs; additive lossless migration only if necessary after review; scoped commit/push and standard Coolify deployment after release preflight. No existing production company-record mutation, test-only production record, paid Hermes/model proof, portfolio application work, VPS cleanup, purchase or reset. Use available bonus tokens; after exhaustion, stop new work at the owner's 70% weekly threshold. The current expanded G9 attempt is limited to 10 hours.
- **Proof and stop:** disposable native HTTP with the agent's credential and the actual global MCP tool, approved positive source plus stale/test/withdrawn/foreign/task/ID/audit negatives, authorized audit history, and unaffected owner view; independent Security review of changed auth/data, relevant checks, `npm run codex:check`, exact deployed commit and read-back. Keep native, deployed and production evidence separate. Stop before G10.

**G9 architecture scope checkpoint (2026-10-11):** read-only route and credential inventory, with an independent read-only review, found that the global MCP bridge forwards one workspace API key without authenticated task identity. The bound-agent credential cannot currently call the CompanyRecord/MCP read routes, and the existing `TaskCapabilityGrant` requires an application and rejects company-information execution. Caller-supplied `taskId` is insufficient authority. Ordinary agent-accessible routes expose CompanyRecord bodies or titles through record list/ID, entity/search, project workspace, task/application contexts, application graph, company graph and findings catalog. G8's digest covers only packet-relevant fields, whereas several routes return additional mutable fields. Review receipts retain a digest and revision but not prior body; CompanyRecord updates overwrite the body and audit events list changed field names only. Therefore full G9 needs a new task-bound read authority and a consistent source projection/policy across multiple domains; past overwritten bodies cannot be reconstructed. No G9 code, migration, production data or deployment changed at this checkpoint. Proposed smaller first outcome, subject to owner approval: task-bound CompanyRecord read authority and digest-bound projection across every CompanyRecord-bearing API/MCP path, with unbound agent reads refusing and owner views preserved. Explicit authorized audit would expose surviving records plus review history with provenance/status and clearly identify unavailable prior bodies. Other source families and prospective append-only body history require separately scoped work; this proposal does not claim full RF-CTX-027 or G9 completion.

**G9a authorization and isolated proof (2026-10-11):** the owner approved that smaller first outcome, additive migration if needed, scoped commit/push and standard deployment after tests, without paid model use or production CompanyRecord mutation. The implementation adds a bound-agent HTTP/MCP list, search and direct-ID read whose server-side Task assignment, latest review, exact digest/revision, validity, scope and provenance all agree. Broad CompanyRecord-bearing API paths refuse ordinary API keys, including source-bearing governance, event and dashboard views; the two Worker execution-context transports retain their active-execution identity check. Task and application execution contexts project reviewed CompanyRecords to digest-bound fields and omit unreviewed record-linked EvidenceRecord content. Human owner views remain intact. The owner audit exposes the surviving current record and paginated review decisions, and explicitly reports that overwritten historical bodies are unavailable. A disposable PostgreSQL database with all migrations passed the native HTTP plus actual global MCP tool test 6/6, including approved, stale, withdrawn, synthetic, malformed metadata, wrong-task, Worker projection, unbound-key, owner-view and paginated-audit cases. The existing G8 native Ready/queue/Worker-input regression passed 13/13. Both disposable database/role cleanups completed and the local container returned to its prior stopped state. An independent Security review found no remaining direct CompanyRecord bypass in the inspected diff after fixes; it noted that task-review result text can quote source content, which is a separately governed result-read surface. This is isolated proof; deployed read-back and production positive source adoption are not yet claimed. No migration was needed.

**G9a deployed read-back and boundary (2026-10-11):** `823ed3dfe6b49bb516c395c103b2a6d24729c280` was fast-forward pushed to `main`; the standard Coolify rollout replaced Roost's backend and PostgreSQL containers. Both public `/health` and `/v1/health` returned `ok` with that exact commit; the replacement PostgreSQL container was healthy. A transient public “no available server” response occurred during replacement and cleared. Unauthenticated requests to the new CompanyRecord task-source route and the old record/event routes returned 401. The VPS had 11 GB free after rollout. No production CompanyRecord, review, Task, key or model attempt was deliberately created or changed for G9a. The positive scoped-agent HTTP/MCP and owner-audit paths were proven in the disposable native database, not exercised against production credentials. This meets the smaller G9a delivery scope; it does not complete all of RF-CTX-027 or authorize G9b. Stop at this boundary.

**G9 continuation architecture stop (2026-10-11, local only):** the authorized broader G9 implementation draft has task-scoped owner reviews for additional company/application/task source families, digest-bound HTTP/MCP reads, bounded Worker projections and prospective database body history. Disposable PostgreSQL migration and native HTTP/MCP cases passed 13/13; the existing Ready → queue → native Worker-input regression passed 13/13; `npm run codex:check`, typecheck, route-capability check and server build passed before this checkpoint. These are isolated checks, not full G9 acceptance. Independent Security review found a material cross-domain response-policy gap: ordinary API keys with existing write scopes can read unapproved source bodies through no-op or narrow PATCH, DELETE and source-derived POST responses even when GET is denied. Concrete examples include CompanyRecord, Note, Decision, Evidence, Procedure, Application, Task and Drive routes; the MCP manifest advertises many of those commands. Denying every such command would remove established write capability. Closing the gap requires a bounded task-authority and response-projection design for non-GET commands, followed by native negative proof. The proposed smaller continuation is read-only task-scoped source access plus owner audit; it would explicitly leave non-GET source-bearing responses unresolved and must not claim complete RF-CTX-027. Identical Drive rescan history is compact in the native test; Ready invalidation for newly admitted Note, Knowledge and Drive sources still needs native proof before release. No G9 continuation commit, push, deployment, production source write or model call has occurred. Hold deployment and full-G9 completion claim pending owner approval of a revised bounded outcome and limits.

**G9 non-GET authorization (2026-10-11):** the owner approved the above material extension for one attempt up to 10 hours, including native tests and independent Security review, with commit/push/standard deployment only after all gates pass. The implementation direction is fail-closed for unbound workspace keys: ordinary read-like and source-bearing commands have no authenticated task and cannot be advertised as MCP tools or invoked over HTTP. Bound agent credentials retain only server-checked task/release commands; owner operations remain available. Source reads use the task-scoped review contract. This permission decision does not assert a general agent source-write capability; such a grant would require its own explicit task and source authority rather than treating a workspace write scope as sufficient.

The G9 source and authority contract is [Task source trust for agent reads](architecture/task-source-trust.md). Delivery evidence and release status remain in this handoff.

**G9 expanded-attempt checkpoint (2026-10-11, local only):** the disposable PostgreSQL HTTP/global-MCP source suites pass 14/14; G8 Ready/queue/native Worker-input regression passes 13/13; packet/provider-input Worker checks pass 81/81; `npm run validate` and `npm run codex:check` pass. Independent Security review of the revised source, auth, Ready, migration and Worker boundary found no remaining P0/P1 in its focused re-review. A broader API run reached 32 top-level tests before its 600-second cap and failed five: the finding-verification fixture now needs current source reviews; agent finding commands are denied by the new generic-key boundary despite existing exact finding grants; the legacy synthetic Worker fixture and one role-claim test use an unbound `mcp_codex_worker` key rather than the current bound Worker ticket; a governed-release-renewal trigger inventory expects a separate older trigger set. This is diagnostic, not a passing full suite. The agent finding/decision-governance routes need an explicit task/source-bound response design if those established agent workflows are to remain available. Simply reopening them would expose unreviewed source-derived material. No G9 continuation commit, push, deployment, production source write, or model call occurred. Hold release and completion claim until the capability boundary is resolved and material tests pass.

**G9 expanded-attempt repair evidence (2026-10-11, local only):** the owner accepted preserving two established agent workflows within the same attempt: exact-grant Finding verification/triage and delegated Decision governance. Bound-agent detail and command responses now disclose only action-relevant fields after exact task, agent, credential, current-version and independently reviewed source checks; unbound keys, missing or consumed grants, foreign task sources, withdrawn evidence and null principals refuse. Owner views remain complete. Finding run/audit evidence remains closed to bound agents because those source families do not yet have G9 review receipts. The five prior broad-suite failures were repaired in their focused native cases: Finding and Decision authority 2/2, fixed synthetic Worker API 3/3, governed release renewal 1/1, and role claims 15/15 in the corresponding filtered run. The full broader API suite has not passed as a single run. The native G9 HTTP/global-MCP source suite passed 14/14 before the final agent guards; Ready/queue/native Worker-input passed 13/13; focused Worker packet tests passed 76/76; `npm run validate` and `npm run codex:check` passed. An independent Security re-review of the final changed agent boundary found no remaining P0/P1 in its inspected scope. These are local/native results; no continuation commit, push, production deployment or source write has occurred at this checkpoint. Release still requires final checks and exact deployed read-back.

**G9 deployed read-back and boundary (2026-10-11):** scoped commit `9f1ec0273b7e3ab25e272f029a2bd4925a92971b` was fast-forward pushed to `main`; Coolify webhook deployment `f12rqwafqb4n2zhrmm9rhvvg` finished at 00:23:18 UTC. Public `/health` returned `ok` with that exact commit; `/v1/health` and the web root returned HTTP 200. Unauthenticated task-source and legacy Note reads returned 401. Production PostgreSQL reported migration `20261011010000_task_source_scope_and_history` finished with no rollback, all 16 prospective source-body history triggers present, and zero task-source reviews or body-history rows. The replacement PostgreSQL container was healthy and retained the named persistent volume. The previous `2e2c8e37` image remained available for application rollback; 5.4 GB of VPS disk remained after rollout. The last documented encrypted Roost backup had passed isolated restore on 2026-10-10; no new backup or restore was performed for this release. Final local validation, native source/MCP 14/14, Ready/queue/Worker-input 13/13, packet checks 76/76 and focused Finding/Decision plus regression cases passed. The earlier full broad API attempt timed out with five failures; their focused cases passed after repair, but a single all-API green run is not claimed. No production CompanyRecord or task-source review was deliberately changed, no model turn ran, and no positive production scoped-agent source read was attempted without an approved production source. This meets the bounded G9 API/MCP, prospective history and response-boundary outcome at native/deployed proof level. It does not reconstruct previously overwritten bodies or prove first real-source adoption. Stop before G10.

### G8 bounded execution brief

- **Outcome:** the existing Roost/Worker/Hermes information-task path selects only required company/task sources whose provenance, environment, verification, scope, validity and version can be checked. Each included source records its inclusion reason. Synthetic, bootstrap, certification, superseded, unverified and out-of-scope sources are absent by default; missing required sources stop Ready/launch without invented intent. Historical records remain unchanged and auditable through existing authorized history views.
- **Entry and scope:** inspect the current execution packet, company-information context, Ready source catalog, contract schemas, CompanyRecord/Evidence/Decision metadata and final Worker input before changes. Govern RF-CTX-001/003/005 and only the default-packet portion of RF-CTX-027, with applicable Ready, authority, security and audit constraints. Ordinary agent API/MCP search and audit search mode belong to G9; do not claim all of RF-CTX-027.
- **Allowed effects:** scoped Roost and Worker code, lossless additive migration only if necessary after SQL review, component/native/negative tests, canonical docs, scoped commits, push and standard Coolify deployment after preflight. Preserve production company records; do not create durable production records or invoke a paid model solely for proof. No new provider, portfolio application work, VPS cleanup, token purchase or reset. Observe actual usage; after bonus tokens are exhausted stop new work at 70% weekly use.
- **Proof and stop:** positive and negative end-to-end evidence must inspect the final sealed Worker input, not only a query or mock. Separate isolated/native and production claims; obtain independent packet-scope review. Run relevant checks and `npm run codex:check`, inspect exact HEAD/diff and report limitations. Stop for an unplanned substantial architecture, irreversible real-data change, or repeated ineffective attempt with cause and smaller revised proposal. Complete G8 and stop before G9.

**G8 isolated proof and release preflight (2026-10-11):** a fresh disposable PostgreSQL database applied all migrations and the native HTTP owner/Ready/queue/Worker-input scenario passed 13/13. It excluded unreviewed and withdrawn sources, invalidated Ready after source edit or review withdrawal, and compared the exact final input bytes received by a harmless native stdin process with the signed managed-admission input seal. The process substituted for Hermes; no model was called. Focused Worker runtime checks passed 24/24, the broader company-information Worker suite 110/110, the trust unit check 1/1, `npm run validate` and `npm run codex:check` passed. An independent packet review identified legacy Ready, provenance, idempotency, and history-read issues; the reviewed scope was corrected in code and tests. This proves the isolated packet path, not production source adoption or a provider turn. The additive migration inserts no company review and rewrites no existing task or event. One pre-existing production company-information Ready pin was observed read-only; its next inspection/claim must reject it without an eligible review. The disposable database and role were removed and the local PostgreSQL container returned to its prior stopped state.

**G8 deployed read-back and boundary (2026-10-11):** commit `f5f7a358e8d5aa84071b1367a4ba9e2922f41372` reached `main`; Coolify queue `lhuxrrb9x664bsgithb5ygkg` finished. A transient public 502 during container replacement cleared after startup. Both public health routes returned `ok` with that exact commit. PostgreSQL recorded migration `20261010220000_trusted_company_sources` finished and all four intended review/Ready triggers installed. Production had zero source-review rows and retained the one previous company-information Ready pin; no company record, Task or review was deliberately changed during G8 release. Unauthenticated GET to the review route returned 401. The selected historical production record had status `active`, verification state `pending`, and source `roost_gate5_takeover`; neither those mutable fields nor the earlier account activity were treated as an owner attestation. No production positive packet, Hermes turn or new owner decision was claimed. The remaining real-source adoption needs a specific owner review and belongs to a separately authorized production action. The user separately authorized one VPS builder-cache prune after a disk-full 503; it reclaimed 3.718 GB, and 15 GB remained after deployment. Coolify cleanup was configured daily at 01:00 and recent executions showed success, so a missed hourly cleanup is not established. Stop before G9.

### G7 bounded execution brief

- **Owner outcome:** from central attention, open the exact Task, current Worker result and applicable Decision, then finish the owner result review in the existing console. Keep provider Task status, Worker execution status and owner review status distinct. Show truthful loading, empty, error, active and accepted/returned states in Polish and English at narrow, tablet and desktop widths.
- **Entry and inventory:** reuse G6 production/native proof and inventory all currently implemented owner routes, contextual views and configuration surfaces before editing. The inventory records later UX repair candidates without expanding G7. Accepted clauses: RF-UX-001/002/007/010 and RF-REL-012.
- **Allowed effects:** scoped dashboard/attention read model, direct record navigation, task/Decision/result presentation and copy, shared styles and their checks; canonical docs, commit, push and the existing Coolify deployment after compatibility, resource and recovery preflight. No company-data mutation, new agent task or model invocation is needed for G7 proof. No second task system, general redesign, public page, Worker change or G8 work.
- **Proof:** before/after owner-console visuals and functional, keyboard/focus and error-recovery checks in PL/EN at 390, 834 and 1440 pixels; exact positive and denied/stale navigation; local component/API checks; independent UI/UX review; `npm run codex:check`. On 2026-10-10 the owner accepted an isolated Roost database/API/browser test of the complete owner result-review journey plus production read-only inspection of existing views and exact links as the G7 substitute for a currently unavailable unreviewed production result. Read back the deployed candidate when release is safe. The first subsequent genuine unreviewed production result remains a later control, not a completed G7 observation. Keep isolated, deployed and production claims separate.
- **Boundaries:** one implementation owner, one current gate. The owner authorized the existing commit/push/Coolify path and no paid model or reset credits. Time and cost are observed rather than hard capped; stop new work after bonus credits at 70% weekly usage. Stop at a safe checkpoint for an unplanned provider, material architecture change, repeated ineffective attempt, unavailable access or an irreversible real-data action. Report exact evidence and stop before G8.

**G7 release evidence and remaining proof (2026-10-10):** the first G7 code commit `250f6174` reached `main`; Coolify webhook deployment `jm259ytqg94txdvvt4q2ub63` finished and showed it Running. Both public `/health` endpoints returned `ok` with exact build `250f6174a438450f48204f375fa19b10bcf7a782`. In the authenticated owner console, the central attention list opened one exact pending Decision. Its first context read showed `task_ready_context_conflict`; Refresh loaded its recorded impact, with acceptance disabled. The separately known Task opened its existing accepted information result after a retry during the rollout; a later direct entry loaded without that error. The Task stayed `todo`, the Worker result showed accepted, and a non-existent Task ID produced the workspace-scoped unavailable state. English and Polish desktop views were read back. Local/native tests cover the current unreviewed-result branch and 390/834/1440 px states. Production had no current unreviewed information result on the first attention page, so the new central-attention-to-result review path and a new production accept/return were not exercised; no company-data write or model call was authorized for G7 proof. Keep that distinction when assessing the gate; do not advance to G8 on source, test or partial deployed evidence alone.

**G7 local review and accessibility proof (2026-10-10):** a fresh disposable PostgreSQL database with every migration, the actual HTTP API and built React console exercised central attention -> exact information Task -> owner review. The completed execution was a clearly synthetic native-shaped fixture solely for review testing; it was not produced by a Worker or model. A stale material version returned 409 without a review event; the owner console then recorded Polish `accept` and English `return` on separate tasks, and API/database read-back found one review event and the expected `done`/`todo` statuses. The fixture database and role were removed and the PostgreSQL container returned to its prior stopped state. Component browser checks passed 83 PL/EN cases at 390/720/834/1440 CSS pixels. The 720 x 450 CSS-pixel case checks horizontal and vertical space equivalent to a 1440 x 900 viewport at 200% page zoom; the exact-record link remained reachable by keyboard within the short viewport. Actual browser page zoom was unavailable in the test browser and remains unverified. Comparable isolated screenshots at 390/834/1440 show the current exact-record action and contained inspector against the previous commit. A focused computed-style contrast check of the two repaired attention labels passed at least 10.21:1 across Roost and the synthetic alternate theme in normal, hover, selected and focused states; production ambient-image pixels were not measured. An independent read-only UX review found no blocking defect in the candidate; the two labels retain an approximately 9-10 CSS-pixel font size, so their mobile reading comfort is not proved by the contrast check. `npm run validate` and `npm run codex:check` passed. Read-only release preflight initially found 2.7 GB free and 97% used on the VPS, so the push was paused. A separately owner-authorized removal of 17 exact unused Roost images recovered 9.82 GB before release without removing the three protected images, containers or volumes.

**G7 deployed read-back and boundary (2026-10-10):** candidate `ca7736ec` was pushed to `main`; Coolify deployment `6353` finished, and both public `/health` endpoints returned `ok` with the exact candidate commit. PostgreSQL was healthy, the deployment queue had no competing active item, and 14.51 GB remained free after deployment. In the authenticated owner console, production attention opened the same exact Decision through a keyboard-reachable link in PL/EN at 390, 834 and 1440 CSS pixels. The initial `task_ready_context_conflict` recovered through Refresh and showed the Decision with acceptance disabled by its current conditions. A direct exact Task link showed its separate accepted information result and unchanged `todo` task state after the available retry, also in PL/EN at those widths. The two repaired attention labels computed to `rgb(184, 201, 220)` in production at all three widths; the local 10.21:1 contrast result does not measure production ambient-image pixels. The owner-accepted isolated full accept/return proof and this deployed read-only proof meet the bounded G7 outcome. No new production accept/return, Worker/model attempt or company-data write occurred. The first subsequent genuine unreviewed production result remains a later control, and actual 200% browser zoom remains unverified. Stop at G7; a later gate needs separate authorization.

**Separate Company Graph finding (2026-10-10):** production Company Graph failed twice with a client `TypeError` reading `entityId` from an undefined edge endpoint. The graph route and company-intelligence API did not change between the previous deployed `5cd07969` and G7 `ca7736ec`, so this failure is outside the G7 diff; its pre-deployment production state was not observed. It did not affect the checked attention, Decision or Task/result paths or either health endpoint. Diagnose the graph packet/edge handling in a later bounded UX repair; do not expand G7 or claim the graph smoke check passed.

**Company Graph repair brief:** identify the malformed native packet or production mismatch and fix its actual source; validate graph edges before client rendering so a bad packet reports an explicit data error rather than silently omitting relationships. Prove the current graph's filter, focus, selection, inspector and canonical link in the production owner console, plus PL/EN error and empty states at narrow/tablet/desktop widths. Include a native-shape regression, independent UI/UX assessment, material component checks and `npm run codex:check`. Scoped code/docs commits, push and existing Coolify deployment are authorized after release preflight; no company-data mutation, Worker/model task, G8 work, further VPS cleanup or new provider. A diagnostic deployment may expose only non-sensitive wire-shape metadata; a working production graph is required for completion.

**G7a diagnosis and local repair evidence (2026-10-10):** deployed diagnostics at `f26ce829` and `21d595ae` replaced the Graph crash with a bounded packet error and showed schema v2 with node/edge arrays but `organizationalMemberships` changed from the native array to an object. The cause is the shared agent-runtime response traversal's 20,000-object budget: on a large typed Graph projection it substitutes redaction sentinels for later edges and memberships, removing required edge endpoints. The native graph route emits complete typed edges and an array. The repair excludes only GET `/v1/company-intelligence/graph` (and its legacy alias) from that shared-content traversal; runtime-native and other shared response safeguards remain in place. A 6,000-node native HTTP regression reproduced endpoint loss before the change and passed after it. The client now rejects malformed packet, summary, edge metadata and references with non-sensitive shape diagnostics; the UI reports unavailable data with retry. Local PL/EN browser cases at 390/834/1440 CSS pixels cover valid selection, focus, link, search-empty, invalid packet and API error (18 cases). Independent read-only UX review identified the summary/edge validation gap, which was repaired; it could not inspect the authenticated production screen. `npm run validate`, `npm run codex:check`, graph/native and runtime-redaction tests passed. Deployed interaction, build and health evidence is recorded below.

**G7a deployed read-back and boundary (2026-10-10):** final repair `8b5d3cfeabe8fbb2ce0423661cce046368c2da1c` reached `main`; both `/health` and `/v1/health` returned `ok` with that exact build. The authenticated production owner graph loaded 7,353 nodes and 15,135 relations at 96% contextualization with no captured console errors. The Task layer reduced the visible set to 167 nodes/13 relations; selecting an existing task opened its inspector, exploring it focused the map on four nodes/three relations, and “Open full context” navigated to that exact task's canonical record. An unmatched search showed the intended empty message in PL and EN while retaining the company anchor. In both languages at 390/834/1440 CSS pixels the graph remained visible with no page-level horizontal overflow. Local synthetic tests, not production network failure, prove the PL/EN API-error and invalid-packet states at those widths. The browser viewport and original task URL were restored. This meets the bounded G7a production Graph repair; no company-data write, model/Worker attempt or G8 work occurred. During this gate an unrelated Docker builder cache prune happened after stale task context was picked up, despite the repair brief excluding further VPS cleanup. The implementer reported that it removed 7.716 GB of build cache without removing images, containers or volumes; this does not establish whether Coolify's scheduled cleanup failed. Stop at G7a until the owner authorizes another gate.

## Delivery objective

Make Roost usable as the owner's company workspace with an optional local agent.
An accepted company task must travel through the path below without manual
technical coordination:

```text
Owner-created Roost task and current, scoped company context
  -> outbound-connected Windows Local Worker
  -> managed Hermes
  -> explicitly selected provider/model/reasoning effort
  -> bounded work within the task's actual authority
  -> result and status visible to the owner in Roost
  -> owner decision or review appropriate to that task
```

Local repository work is one task type. Git push, application deployment,
production observation and application backup apply only when a separately
authorized task has those effects. A local read-only company task needs none of
them. Preserve the separately accepted recoverability requirement for Roost's
own business database before allowing agent writes to those records; reuse
existing proof rather than repeating it for every task. Codex develops Roost
and its Worker; the connected agent works from authorized Roost tasks and
context, never on Roost's source. Configured applications may later exercise
the mechanism, but their readiness does not define Roost's product completion.
Installation paths, domains and credentials stay private.

## Execution ownership

One implementation owner completes the authorized gate across components,
integration and native proof. Internal steps/commits are not handoff boundaries.
Continuing later requires new gate authority.

Use `roost-runtime-delivery`, `AGENTS.md` and `npm run codex:check`.
The owner integrates and verifies delegated work; these development controls
alone do not prove a runtime gate.

Ordinary implementation discoveries are resolved autonomously from, in order:

1. current accepted Decisions and `product/requirements.md`;
2. `product/product.md` and its stable product chapters;
3. current architecture and operations contracts relevant to the component;
4. inspected code, migrations, tests and runtime evidence.

A contradiction is recorded and resolved at the highest applicable source. Old
"next atom" statements in versioned technical evidence never define current
work.

## Current verified state

Existing foundations: PostgreSQL/Prisma, Express, React owner console, workspace
API/MCP boundaries, provider/task/context/review, Windows Worker and Hermes.

**Gate 1 met (2026-09-27):** production Roost → Worker → Hermes → selected
Codex Responses → Roost completed one signed low-risk task. Provider usage and
forced production cancellation remain unproved. Exact build, execution and
credential evidence is in the [matrix](architecture/traceability-matrix.md).

**Gate 2 met (2026-09-27):** native one-writer coding, checkpoint/resume and
independent rejection/acceptance produced local `774e858a`, without push or
deploy. General scheduling, arbitrary filesystem effects and all recovery
cases remain unproved; see the [matrix](architecture/traceability-matrix.md).

## End-to-end delivery gates

These gates are outcome-sized delivery boundaries, not internal technical
atoms. Complete the currently authorized gate without requesting permission for
ordinary reversible technical work inside it.

## Gate authorization boundary

An explicit owner task to deliver work may authorize one named gate, or the
earliest unmet gate if unnamed, only after its outcome, effects and budget are
bounded. A proposed gate, a status/planning/readiness request, or an earlier
task does not override the current owner STOP or activate work. The owner may
decompose and repair inside an authorized gate, but must not start the next
gate without a new user instruction. At completion update this handoff, run
checks, leave recoverable state, report evidence and stop. Remaining account
usage is not continuation authority. Push/deploy need the gate's explicit
authority.

### Gate 1 — real agent round trip

An accepted low-risk Roost task is claimed by the intended Windows Worker.
Managed Hermes starts with an explicit approved backend, model and reasoning
effort. The execution reports heartbeats, terminal result, usage when available
and bounded evidence back to Roost. Cancellation and lease loss stop safely.

Internal migrations, signing, credentials and HTTPS wiring were dependencies,
not separate delivery results.

### Gate 2 — governed coding delivery

The agent receives the pinned task/application/procedure context, works only in
the configured canonical checkout, respects the one-writer and one-instance
rules, checkpoints progress, resumes safely after interruption, runs the
required tests and produces a reviewable commit. An independent competent role
accepts or returns the work with reproducible evidence.

Role, Decision and resource controls applied to this bounded pilot; broad
workforce scheduling and learning remain later outcomes.

### Gate 3 — governed release

**Met at native/production evidence level (2026-10-02):** Exact Git/PR/merge,
interrupted deployment, controlled failure, healthy rollback and owned cleanup
passed. [Evidence](operations/governed-release.md).

An accepted exact commit follows Git, deployment, baseline health, observation
and certification or rollback. Audit, secrets, backup/restore, compatibility
and owned cleanup are required; no extra clones or services.

### Gate 4 — pilot application proof

**Production verified:** managed repair `7512bc3`, 1238s healthy observation,
unchanged protected services and independent postrelease verification. Failed
rollback remains unqualified. See [evidence](operations/application-release.md).

One real low-risk defect in the configured pilot application is discovered,
planned, implemented, independently tested, committed, released and verified in
production through Gates 1–3. Application-specific safety rules and any owner
consent explicitly required by `product/requirements.md` remain binding.

### Gate 5 — reusable company operation

**Met at native/deployed-console evidence level (2026-10-04):** a second
configured application reused roles/procedures and an independently accepted
local `3cf9645e`; Roost showed portfolio and Decision evidence. No application
push/deploy or whole-product readiness was proved. See [evidence and limits](operations/internal-application-operation.md).
This proved reuse of internal application operation, not the later company,
commercial or mobile capabilities. Requirement completion still needs the
runtime evidence in the traceability matrix.

### Second-application release — paused by owner

**This release remains paused after the owner STOP on 2026-10-10.** Gate 5 local `3cf9645e` and accepted
candidate `d73e6234` remain, but release `bdc1387e` failed at deployment
configuration. No deployment, observation or postrelease acceptance was proved.
Worker and locks were stopped. Exact identities and limits remain in the
[matrix](architecture/traceability-matrix.md) and [Compose record](operations/governed-compose-release.md).
Resumption needs a new owner-approved brief based on the actual stopped state,
installed adapter, permitted effects, reused proof, rollback and bounded budget.
This paused release grants no push, deployment or continuation authority.

### Gate 6 — owner-to-local-agent task loop

**Met at bounded production/native evidence level (2026-10-10).**
At the initial diagnostic snapshot, the installed Hermes 0.21.2 profile
qualified as `managed_hermes_codex_low_v1` after normal workspace validation;
no model request had been made. The ordinary Ready route, execution packet,
database and Worker required an Application, architecture component and Git
checkout then. G6a below added a separately qualified preparation class; it
did not admit model execution. No trial task, grant, migration, application
operation, push or deployment had run at that snapshot. The smaller G6a brief
was subsequently approved; the Aviary STOP remains.

#### Gate 6a — company information preparation

**Authorized outcome:** an existing company Task without Application,
architecture component or Git can pass preparation/Ready and enter the existing
Worker queue with explicit selected Roost company records, workspace and actor
identity. Integrate data, API, existing console and Worker packet validation.
Do not rebuild task management or ClickUp synchronization.

The company class grants no repository read/write, push, deployment or native
tools. G6a qualifies preparation only: queue rows cannot be claimed, run or
completed, and no model/result/review round trip is claimed. Application Ready
and execution guards retain their existing requirements. Real Worker/Hermes
execution and owner result review remain a separately authorized remainder of
G6. No application work, production writes or Roost push/deployment is authorized.

The G6a preparation authorization and its limits were historical; the current
full Gate 6 authorization below governs the remaining work. Bonus credits are
allowed; no reset credits may be consumed. After bonus exhaustion, stop at 70%
weekly usage.

**Verified G6a result:** the existing Task, Ready submission, owner console and
execution queue support `roost-company-information-v1` without Application,
component, project or Git. A fresh disposable PostgreSQL database applied the
full migration chain; actual HTTP Ready/queue/source invalidation and a separate
native Worker-validation process passed 10/10. The unchanged queued row has
attempt 0, no host/lease and `modelExecutionQualified: false`. SQL refuses runtime
transitions, host/lease/start/attempt changes and forged qualification. An owner
can cancel stale preparation without a native process or result. Selected records
are exact/current/workspace-bound; unselected company content is not transported.

Checks: 109 packet/context/component tests, six console-model tests, 77 browser
scenarios using synthetic API fixtures, `npm run validate`, `npm run codex:check`
and `git diff --check` pass. Native API/SQL tests use real services and no provider
mock; browser fixtures remain a separate UI claim. The disposable database/role
are absent and the existing PostgreSQL container returned to its prior stopped
state. Two initial defects (migration newline anchor and SQL variable ambiguity)
and a browser focus-test race were diagnosed and corrected; failed logs remain.
G6a is preserved in local commit `466abe69`; its migration is not installed in production.
No model, installed Worker daemon, Hermes turn, production write, push or deployment
ran. This completes only G6a local preparation, not G6 or the paused Aviary release.
See [exact evidence](architecture/traceability-matrix.md#e-company-information-preparation).

#### Historical Gate 6 remainder and resolved admission stop

The earlier bounded continuation after G6a permitted local implementation only.
Its stop and evidence below explain the risk/admission dependency that was later
resolved. The owner's subsequent full Gate 6 authorization permits scoped commit,
push, Coolify redeploy and production verification. No application workload, new
task/ClickUp system, model routing or G7 is included.

**Stopped at a material data/admission dependency:** the normal owner Decision
proposal for a repo-free information task succeeds, but normal acceptance returns
`decision_risk_admission_required`. Native read-back proves no acceptance and no
runtime execution were created. Existing TaskRiskScope requires Application and
active architecture component; TaskAdmissionScope requires Git commit and an
application-owned target/release/procedure. Independent diagnosis confirms that
configuration cannot supply a valid application-free scope. Do not fabricate an
Application or weaken the Decision guard. A separately approved typed company
risk/admission variant and its native positive/refusal tests are required before
continuing this remainder. The original 80-minute ceiling does not expand itself.

Safe preparation exists in source: separate information-runtime contract,
exact signed-owner admission candidate, zero-tool Hermes/Windows Job integration,
API result/review and existing-console controls. Runtime is disabled by default
(`ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED` unset); a boolean cannot substitute
for missing risk qualification or native launch proof. Supporting checks pass:
130 packet/context/runtime tests, eight UI-model tests, PL/EN browser fixtures,
validate and codex:check. Fresh PostgreSQL/HTTP verifies all migrations and the
actual owner-acceptance refusal, while preserving G6a. Owned database/role are
removed and prior container state restored. No model/Hermes process, completed
information result, genuine owner acceptance/return of such result, production
write, push or deployment is proved. Full G6 remains unmet.

**2026-10-10 bounded risk/admission continuation:** a typed
`company_information` risk and admission scope is implemented with a forward
additive migration. A disposable PostgreSQL database and actual HTTP routes
prove the low-risk owner assessment, selected current evidence, procedure gate,
current `decision_supersede` seal, normal Decision acceptance, renewed exact
runtime assessment/admission, company Ready submission, runtime queue and HTTP
claim. The claimed row has no Application, branch, Git revision or model result;
the synthetic host has no provider turn. Foreign workspace, non-owner actor,
wrong operation, stale version and source, unselected evidence, and application
shape on the company task are refused. The application SQL branches retain
their guards. This closed the risk/admission dependency locally; the subsequent
installed Worker proof is recorded below. See
[native evidence](architecture/traceability-matrix.md#e-company-information-risk-admission).

**2026-10-10 installed Worker/Hermes proof:** a fresh disposable PostgreSQL
database applied every migration. The normal low-risk company Decision, owner
acceptance, renewed risk/admission, Ready and queue led to an actual installed
Windows Worker and Hermes 0.21.2 model turn through signed managed admission
and Windows Job. The model result reached the Roost HTTP result route, the owner
API accepted its material version, and the task became `done` with one completed
execution and a closed owned job. The native suite passed 11/11; its disposable
database and role were removed and the prior PostgreSQL container state restored.
The Worker/server signed-lease digest mismatch and a reset of a pooled HTTP
connection before a fresh context GET were repaired and covered by tests. This
is local installed-provider evidence with synthetic company records and an
owner API action, not a production owner-console observation. See
[native evidence](architecture/traceability-matrix.md#e-company-information-runtime).

**Production preparation:** encrypted Roost backup
`af1e1e41-9146-4b67-861a-ec6bb6c35eab` was restored in isolation and
verified on 2026-10-10; its private latest copy and recovery key remain outside
Git. A second disposable local restore of that current archive applied all three
company-information migrations; Task, execution, risk and admission row counts
were unchanged. Its test database was removed and local PostgreSQL returned to
its previous stopped state. `npm run validate`, `npm run codex:check`, focused
Worker tests and Compose syntax pass. Coolify's Roost resource tracks `main`.

**Production observation and stop (2026-10-10):** the Gate 6 runtime commits
through `0d6ed15b` were pushed to `main` and Coolify deployed them. In the
authenticated owner console, one existing company record and the active task
procedure were selected for a tool-free informational task. The owner accepted
an exact one-attempt runtime Decision, and the renewed joint risk assessment
computed Low. The task execution admission was current. The first Ready
submission used the preparation contract; a corrected console mapping was
deployed in `0d6ed15b`. The second Ready submission used the runtime contract.
Production read-back confirmed its contract matched the risk scope and that
both the risk and runtime admission seal were current. The owner console then
queued one application-free execution, and the company-only supervised Windows
Worker claimed it.

The Worker prepared the selected context and received a signed one-use managed
admission. Hermes exited 1 after its native launch. The execution became
`failed`, attempt 1/1, with no information result and no owner accept/return
decision. Its Windows Job receipt proves closure with zero active descendants.
Private Hermes diagnostics report OAuth HTTP 401 and mark the pooled token
`dead` with reason `token_revoked`; they do not establish whether the provider
spent any output tokens or cost. The owner console displays the
failed state. No application operation or external write was requested.

The Worker retained its Writer lock after a second failure-report call could
not confirm the already persisted terminal failure. A subsequent read-only
Hermes help command generated Python cache files that invalidate its exact
installation inventory; an automatic policy review rejected removal of those
files. At that stop, no lock or installation files were manually cleared. The
task's attempt budget is spent; a changed plan, new task budget and owner
authority are required for a further model attempt.

**2026-10-10 recovery checkpoint:** the owner completed a fresh Hermes OAuth
device login. The pool now contains the prior dead credential and one new
credential with access and refresh tokens; no provider request has qualified
the new credential yet. Under a separate one-time maintenance approval, the
exact terminal production row and absent owner process qualified reclamation
of the retained Writer. All 94 unexpected CPython caches matched their pinned
sources under the isolated Python 3.13.1 compiler. The existing generated-file
maintenance procedure recorded them in the private receipt without removing
cache files, and a full installation check passed. A local controller then
mistakenly expected a `status` field absent from the valid check receipt and
retained its own new empty Writer lock. Its exact digest, absent process and
absent checkpoint were verified before clearing that maintenance-owned lock.
Both Writer/recovery locks are now absent; the production execution remains
terminal `failed` at attempt 1/1. This was no model call or Roost data write.

**2026-10-10 owner-approved final attempt and review:** the owner approved one
additional attempt for the same task and selected record after the failed
execution and separately authorized Worker maintenance. A successor runtime
Decision `38d37cf4-c4c3-49f8-8831-33cfdca74cfc` bound the same installed
backend and one tool-free `gpt-5.6-sol` low attempt. The joint risk assessment
`2c625f19-3453-4793-ae93-6a2ced662d26` computed Low, runtime admission was
current, and Ready pin `e29e834d-5853-44fa-98de-019edae83683` was accepted.
The owner console queued exactly one new execution,
`7f3712f0-45b5-43fb-9435-5e29f4c92435`. The company-only supervised Windows
Worker claimed it and reported `information_prepared`, `information_admitted`
and `completed` in attempt 1/1. The result cited the selected current record
and gave a separate owner suggestion. The owner explicitly accepted that result
in the console; the persisted review explanation notes that the model's phrase
“within the 1,200-token budget” is not a measured or provider-enforced cap.
After refresh the task appeared in **Done** with the accepted review. The
Worker stopped cleanly. Provider token/cost usage remains unknown; no second
retry, tool, application action or external write was observed.

The production continuation used operator API calls to renew the typed
Decision, risk scope, admission and Ready after the first failure. That
operator assistance is not proof that the owner can recover this path solely
through the console. The source now prepares a typed successor Decision for a
spent attempt, keeps the previous contract after rejected Ready, includes the
parent task in a truncated replacement selector and instructs the Worker not
to claim a token/cost measurement. Native PostgreSQL/HTTP regression exposed
one further console dependency: the Decision candidate had required Ready even
though the accepted Decision and admission must precede qualified Ready. The
candidate now reads the current owner-scoped Low risk assessment and refuses
without it; actual execution still requires the accepted Decision, admission
and qualified Ready. The disposable PostgreSQL suite passed 12/12 after this
repair, removed its database and role, and restored the local PostgreSQL
container to its prior stopped state. Focused browser checks also pass. These
repairs were released in `3b2ac2bd` and `d42d65b5`. Coolify deployment
`lztawlkjo3d5a89zxyj2n912` succeeded on 2026-10-10 at 15:27:08 UTC;
both public health endpoints reported exact build `d42d65b5`. An authenticated
owner API read after deployment returned execution
`7f3712f0-45b5-43fb-9435-5e29f4c92435` as `completed` with one selected
source and persisted review `accept`. The global Task API and owner board
instead reported `todo`, updated at 15:10:51 UTC, after the review event at
14:57:50 UTC. This imported task has `source=clickup` and an external ID.
The exact later writer is not yet established; an unchanged **Save and prepare
execution** action had performed a Task PATCH and ClickUp writeback. Commit
`77428063` removes that unnecessary write for an unchanged task, with a
79-scenario browser suite, `npm run validate` and `npm run codex:check` passing.
Coolify deployment `e9hku82vg2sy2c8agjwrx8fz` succeeded at 15:36:20 UTC;
both public health endpoints reported exact build `77428063`. In the refreshed
owner console, **Save and prepare execution** opened the existing result:
execution complete, one selected source, review `accept` and explicit caveat
that 1,200 output tokens are only intent. The Task `updatedAt` remained
15:10:51.191 UTC after this navigation, so no Task write occurred. The board
still says `todo`; its later writer and correct source-status behavior require
separate reconciliation. No model budget remains.

**Provider-owned status repair, local verification:** RF-INT-002/003/005 and
the current ClickUp adapter make the imported Task's status provider-owned.
The information result review event remains Roost-owned. For ClickUp-backed
information tasks, the claim and owner review no longer change `Task.status`;
the Operations board and task preview project the latest Worker result/review
beside the source status. The disposable PostgreSQL/HTTP suite passed 12/12:
a tool-free synthetic terminal failure left the ClickUp task `todo`, while the
ordinary owner candidate read identified the previous one-attempt Decision
for a successor proposal. No model ran. Browser fixtures passed 80 task
readiness cases and 20 information-authorization checks, including the failed
result → successor proposal entry in PL/EN without a write. The database
refused a fabricated completed native result, so these checks are not proof
of another completed model turn. Production badge/read-back and the full
console-only successor sequence remain open.

**Deployment and production read-back (2026-10-10):** repair commit `4b4e5040`
was pushed to `main`. During rollout, the Coolify deployment page briefly
returned HTTP 500 with Redis `MISCONF` (failed RDB persistence); the underlying
cause was not established. The page recovered and webhook deployment
`b5at3aaywxy0z2ugmt3he3zw` succeeded at 15:59:44 UTC. Both public `/health`
endpoints reported exact build `4b4e5040`. Authenticated owner API read-back
for the selected task returned source `clickup`, task status `todo`, execution
`completed`, review `accept`. In the refreshed owner Operations board, the
task remained in TO DO with **Worker result: accepted**; its preview showed
**ClickUp task status: todo** and **Agent work review: Worker result: accepted**.
No task mutation or model attempt was made during this read-back.

**Local owner-console recovery proof (2026-10-10):** one integrated scenario
used a fresh disposable PostgreSQL database with every migration, the actual
HTTP API and the built React console in a browser, without fixture or mock API.
It recorded a synthetic terminal failure before any provider request on a
ClickUp-owned task. Only console clicks then changed the plan from 300 seconds
and 4,000 output-token intent to 360 seconds and 1,200 output-token intent,
accepted successor Decision `3312ba0e-e008-4135-9bbc-7c87c9463c78`,
renewed Low joint risk and task-execution admission, and submitted Ready. The
console displayed **Ready · accepted**. Authoritative read-back found exactly
one execution, the original failed execution
`d1f11381-fad4-417a-8bb9-f32860418797`, no final response, task status
`todo`, unchanged ClickUp external identity, and current risk/admission seals.
The test launched no Worker/model process, and this disposable workspace had
no ClickUp integration. The browser stopped before **Run information task**.
The suite passed 12/12 and removed its database and role; the pre-existing PostgreSQL
container returned to its prior stopped state. A minimal console repair
exposes successor authorization before renewed Ready and preserves draft edits
when returning from authorization. This is local integrated recovery proof,
not a second production model attempt or production console-only recovery.
See [exact evidence](architecture/traceability-matrix.md#e-company-information-console-recovery).

**Production release and read-back (2026-10-10):** commit `96513da8` was pushed
to `main`. The earlier documentation-only webhook deployment
`l9vlbm3nw57yw34wxqvcijg8` had stopped making progress during build and was
cancelled after Coolify recovered. The manual deployment
`u735yd4umy77aq58hgc613as` imported exact `96513da8`, succeeded at
16:27:17 UTC, and Coolify showed that commit as Running. Both public
`/health` endpoints returned `ok` and exact build
`96513da80d5c330e8f7577e725b21a1ae468305a`. In the refreshed
authenticated owner console the selected task remained in TO DO with **Worker
result: accepted**. Its preview separately showed **ClickUp task status:
todo** and **Agent work review: Worker result: accepted**. These checks were
read-only; no model execution, task mutation or ClickUp writeback was
requested. This confirms the new build and existing accepted result view in
production, not a production rerun of the spent-attempt recovery sequence.

**Production Roost-native information Task (2026-10-10):** the owner approved
one bounded production Hermes/Codex attempt for Task
`61a0c500-a691-4817-8631-ac9e88ba1088` and explicitly consented to the
initial High assessment. The selected current record was “Shared governed
application delivery”, revision `2026-10-04T00:25:08.165Z`. The first immutable
assessment remains High: Data and Security were Medium, five dimensions Low,
uncertainty Bounded, and the native matrix raised the overall risk to High.
The Low-only runtime Decision candidate refused that assessment. A new
seven-dimension assessment was entered only after inspecting the exact short
governance record and its one-record, no-tool, no-write task boundary. It
recorded explicit Low rationale for the non-public provider transfer, Windows
account authority without OS isolation, and unmeasured token/cost exposure;
uncertainty was None. The prior High entry was preserved in history. No global
risk policy changed. This is a task-specific assessment, not a general claim
that Windows/Hermes execution is isolated or provider spend is bounded.

The owner console accepted runtime Decision
`9895b1df-161a-403e-95c3-4d8410651a0f`, refreshed the native procedure
verification and risk admission after its source changes, and accepted Ready
revision `c9b559aea2fd9e02e1e69467ad80a7392ae78c14f8e292f2c1bdae468a8f192a`.
The contract declared one attempt, 600 seconds and 1,200 output tokens as
intent, with no provider-enforced token or cost ceiling. The **Run information
task** command was used once. The scheduled Windows Worker initially exited
before claim because its private installation enabled the dedicated governed
release mode; that mode checked a release queue, received
`release_api_rejected`, and never claims model tasks. The separate release
identity visible in the console was expired, but the generic rejection did
not establish its exact cause. With no live Worker or Writer, a
byte-for-byte backup of the private configuration was made, then the existing
company-information-only supervised mode was used for this task. This changed
no release journal or application data. After completion, the Worker was
stopped, the shared Writer was absent, and the original private configuration
was restored with the exact pre-change SHA-256. The separate release credential
remains expired; no release operation was attempted. This restoration also
restored the release-only behavior: `governedRelease` makes the Worker check
release recovery/queue before the Writer lock and intentionally skip all model
claims. The one installed Windows login task was then stopped. A read-only
recovery GET with the bound Worker credential and current protocol headers
returned no pending model executions, but it does not inspect the separate
release queue. A later owner-authenticated, read-only host-filtered release
summary returned 13 non-truncated records: ten failed with recorded closure,
two completed and one revoked. Across their journals there were zero
unresolved, uncertain or unknown outcomes. A separate owner read returned zero
queued model executions. At that snapshot the scheduled task was stopped, no
Roost Worker process was running, and both local and shared Writer locks were
absent. In that mode, a next information Task would stay queued and could not
finish solely through the owner console.

Production execution `e61eb1d9-a193-47d1-a23c-ada92e46051d` completed
attempt 1/1. The owner console showed **Worker result: review needed** and a
result version beginning `505f03d444cae43f`. The result cited the selected
title and revision, summarized six recorded governance commitments, separated
its proposed next owner action from record facts, and marked unsupported
application-specific conclusions. The runtime receipt reports no native tools
or external writes and a closed Windows Job with zero active processes.
Provider cost, token use and physical model-call count remain unobserved in
the receipt; the 1,200-token intent is not a verified limit. After the owner's
explicit instruction in the conversation, Codex used the authenticated owner
console to accept this exact result. Fresh board read-back showed **Worker
result: accepted** while the Task status remained `todo`. The bound Worker
credential was separate from the owner browser session; the selected record's
authorship was not established by this test. The saved review explanation
included an unnecessary assertion about the owner's earlier personal role in
the record. Roost's information-review event is append-only and exposes no
edit command; this sentence does not determine record provenance. The prior
accepted production Task and failed predecessor remain separate evidence, and
the disposable PostgreSQL recovery scenario does not prove a production rerun
after a spent attempt. The production result is a valid single-task proof, not
proof of a repeatable owner-to-agent loop. The host-filtered owner summary
established no active or unresolved release record. The previous release-only
private configuration was copied byte-for-byte and hash-checked before the
current installation was switched to the existing `companyInformationOnly`
mode; the governed-release journal and expired credential were preserved. The
login-scheduled Worker started with no queued execution. Its production host
record reported `online`, compatible protocol, supervised Hermes 0.21.2
admission, no unavailable reasons, empty application slugs and the company
information capability. Two successive heartbeats advanced while owner reads
showed zero queued, claimed and running executions; no model call, new Task,
release operation or application mutation was made by this transition. The
shared Writer was acquired by the supervised Worker. The private release-only
backup can restore the prior installation mode when a separately authorized
release resumes. The accepted production information result, owner review,
visible one-attempt failure stop, integrated console recovery and current
admitted supervised installation meet the bounded G6 outcome below. A real
subsequent Ready claim after this permanent mode switch and a full production
console-only recovery after a spent attempt remain unproved limitations. They
are not extra attempts required by this gate. G6 is met; G7 is not authorized
by it.

**Roost outcome:** the owner creates one low-risk informational company task in
the console, assigns the configured local agent and sees its result and status
back in Roost without using a terminal, database or another conversation. The
agent receives a small, owner-selected set of current Roost records through
the existing task packet and Worker/Hermes path. The owner can accept or return the
result. A repeated ineffective attempt or approved time/attempt limit stops the
task with a visible reason and recoverable state; continuation needs a changed
plan and fresh budget. This advances RF-PROD-011, RF-CTX-001 and RF-HOST-010/011
without claiming full company readiness or completing general API/MCP context
classification under RF-CTX-027.

**Scope:** inspect the existing console task flow, selected-record packet,
Worker/Hermes result path and budget handling first. Reuse working pieces and
change only the missing owner-facing or agent-facing link. Prove one real
low-risk company task, such as a sourced status and proposed next action for an
existing project, and its owner-visible outcome using current Roost records.
Use the already qualified Codex Responses path for this proof; local-model
admission and routing remain G22–G23 outcomes.
Reuse unaffected Gate 1–5 evidence and run focused checks plus
`npm run codex:check`. No application repository change, push, deployment,
application backup or product-readiness review belongs to this gate. Preserve
the existing Roost database protection; do not repeat full backup/restore
certification unless its underlying recovery contract changes.

**Progress control:** one implementation owner completes Gate 6 without an
arbitrary wall-clock or gate-level attempt ceiling. The company task retains its
explicit RF-HOST-010 duration and attempt budget; token/dollar enforcement is
unavailable unless a provider-enforced meter is demonstrated. Repeated ineffective
actions require diagnosis and a changed approach under RF-HOST-011. An unplanned
provider, material architecture change, unavailable service without a safe
alternative or irreversible real-data action outside the approved scope requires
a recoverable checkpoint and owner decision. Do not start the next gate.

## What is not a blocker

Ordinary defects inside the approved surfaces are implementation work. An
unplanned provider, material architecture change, repeated ineffective attempt
or exhausted budget requires a safe checkpoint and a smaller revised gate for
owner approval. Preserve the actual failure; do not add hypothetical cases or
repeat unaffected certification.

## True owner dependencies

Pause for owner input when a scope/budget stop above occurs, or when progress
requires one of these:

1. a login, 2FA response or secret unavailable to the runtime;
2. an unapproved irreversible operation against real data or an external
   account;
3. a genuine contradiction in accepted business/product intent that changes
   the requested outcome rather than its implementation;
4. an unavailable external service for which no safe technical alternative
   exists.

Before pausing, complete all independent preparation, retain recoverable state
and ask one concrete question describing the exact blocked action and effect.

## Completion evidence

For every gate, record the exact task/run identities, relevant commits,
configuration versions, model/backend request and observation, checks, review,
deployment identity, health comparison, cleanup and residual limitations.
Source-only and mocked tests are supporting evidence; they never substitute for
the native or production proof required by the gate.

Update this document in place as gates advance. Do not create a new versioned
plan or a new "next atom" document. Git history is the implementation history.

## Planning and execution handoff

The planning conversation prepares gates and reviews evidence. Each execution
conversation implements one authorized gate. Owner-requested planning of later
gates does not authorize their execution or expand an active assignment.

Keep product decisions in the existing product chapters and requirement IDs,
delivery scope and acceptance here, evidence in the traceability matrix and
technical records, and unresolved business choices in `planning/open-decisions.md`.
Conversation history is supporting context, never the required handoff source.

Batch new requirements for the next handoff; interrupt active work only for
STOP, safety or material scope correction. Preserve verified-state sections.
Before assigning a gate, reconcile its prerequisites against the previous
result and current repository. Inspect the real target topology, installed
adapter and observed failure before estimating work. Planning alone never
advances runtime status.

### Assignment contents

Prepare one outcome-sized assignment from the selected gate below. It contains:

- the gate, expected user-visible result, prerequisite evidence and relevant
  requirement IDs;
- the inspected existing implementation to reuse, missing behavior to build,
  installation configuration to apply and the proof needed for each;
- the scoped API/MCP, web and Worker surfaces, allowed local/VPS operations,
  credential availability, resource constraints and required owner approvals;
- observable success and failure cases, evidence locations and completion
  checks;
- one implementation owner, permitted bounded delegation, commit/push/deploy
  authority, an owner-approved time/attempt ceiling and token/cost ceiling where
  enforceable, plus a mandatory stop after the gate. If token/cost enforcement
  is unavailable, say so and use a shorter time/attempt checkpoint; never call
  an estimate a hard cap;
- a stop rule for an unplanned provider, material architecture change, repeated
  ineffective operation or exhausted budget. Preserve a checkpoint and require
  independent diagnosis, a materially changed plan and fresh owner authority
  before another attempt. Reuse unaffected proof; do not expand the gate to
  hypothetical failure cases.

Inspect code/configuration for the selected gate. Reuse adequate existing
dependencies; justify additions by missing behavior and maintenance/resource cost.

Completed Gate 2–5 execution briefs are retained as
[historical protocol records](operations/completed-gate-briefs.md); their older
entry/exit language does not authorize a new gate.

## Proposed sequence to complete Roost

Only the owner-to-local-agent loop above has an execution brief. G7 onward are
ordered **candidate gates**, not authorization or estimates. Codex implements
Roost and its Worker; the connected agent executes company tasks through Roost,
never Roost source development. Application repair/readiness is a separate
agent workload, not a Codex Roost gate. The paused second-application release
stays paused until the owner separately disposes of it.
The entry column, not every earlier row, defines prerequisites: application
control may advance after G11/G17, without waiting for sales or company
composition. Local-model qualification may run during application work; neither
requires that application to be finished first.

Before each gate, inspect the actual path and matrix evidence; brief one user
outcome, proof to reuse, affected surfaces/effects, native positive/negative
checks, owner decision, time/attempt/token/cost limits (unenforced = unknown)
and stop. One materially changed retry, then diagnose and replan; new providers
or larger scope need new approval. Run focused checks and final
`npm run codex:check`; reuse unaffected proof. Include relevant UI, config,
permissions and agent access. Push, deploy, backup and external writes only
when the gate actually has those effects.

| Candidate | One Roost outcome and minimum observable proof | Entry and governing requirements |
| --- | --- | --- |
| G7 Attention UX | Owner completes task/result/Decision journey in the console with truthful states, PL/EN, narrow and responsive views; inventory routes first. | G6; RF-UX-001/002/007/010, RF-REL-012 |
| G8 Trusted packet | One Worker task sees only current, approved, scoped records; old/test records stay auditable but absent by default. | G6; RF-CTX-001/003/005/027 |
| G9 Context API/MCP | The same exclusion holds for ordinary agent search; authorized audit returns history with provenance. | G8; RF-CTX-027, RF-GOV-020, RF-SEC-007 |
| G10 Owner/agent identity | Ordinary owner session lasts for real work; sensitive action reauth preserves context; agent cannot use owner identity. | G6; RF-SEC-003/009/013, OPEN-AUTH-001 |
| G11 Task authority | One task passes Ready validation, scoped mandate, accountable role, Decision/review and auditable return without bypass. | G8–G10; RF-CTX-008–018, RF-GOV-001/014 |
| G12 Progress and budget | Across admitted task types, real no-progress/limit stops are visible; renewed attempt needs changed plan and fresh budget. | G11; RF-HOST-010–012, RF-CTX-006/019 |
| G13 Agent proposal | Agent proposes a sourced, deduplicated company task; owner reviews; no execution before Ready. | G11; RF-PROD-013, RF-CTX-021/022 |
| G14 Scheduling | Ready tasks respect dependency, priority, host capacity and one writer; stop/resume preserves work. | G12–G13; RF-HOST-002/003/009, RF-GOV-013 |
| G15 Delegated work | One bounded specialist handoff returns evidence to its accountable parent without expanding authority or budget. | G14; RF-GOV-010/013, RF-CTX-013–015 |
| G16a People | Owner invites one person with scoped access; a human and a distinct agent can work on the same company task. | G11; RF-PROD-005/010, RF-SEC-009 |
| G16b Composition | Owner configures one department/capability; an approved migration preserves records and consistent views. | G16a; RF-PROD-002–009, RF-ORG-001–005, OPEN-ORG-001 |
| G17 Procedures | Owner versions one human/agent procedure; an active task uses its pinned version and returns a reviewed improvement proposal. | G11; RF-CTX-012/020/026 |
| G18a ClickUp | One governed task sync reconciles provider, Roost record and actor without duplicate authority. | G11; RF-INT-001–005, RF-PROD-003 |
| G18b Drive | One governed file/Doc/Sheet journey preserves provider authority, Roost context and provenance. | G18a; RF-INT-001–005, RF-PROD-003 |
| G19 Company direction | Owner adopts/revises private purpose; one aligned and one conflicting task/decision show evidence or exception. | G11; RF-OUT-003/008 |
| G20 Goals and economics | Owner sees attributable goals, progress, task effort/cost and unknown usage, with source drill-down; agents act within mandate. | G19; RF-OUT-001–007, RF-HOST-012/018, OPEN-STRATEGY-001 |
| G21 Application control | Owner sees one configured application's own baseline, blockers, roles and agent task in Roost; no cross-app assumptions or Codex repair. | G11/G17; RF-APP-001/003/009/013/014, RF-ACT-010; reuse Gate 4/5 proof |
| G22 Local model | One managed Hermes task runs on an explicitly admitted local model (initial candidate: gpt-oss); missing model/resources refuse safely, with no silent fallback. | G12; RF-HOST-016–018/022 |
| G23 Model policy | Qualified local model is the default proposal for suitable task classes; unsuitable tasks propose Codex before Ready. Owner can override within policy; comparable accepted outcomes prove or reject savings. | G22; RF-HOST-012/017/022, OPEN-MODEL-001 |
| G24a Site study | Authorized versioned sites yield sourced findings, unknowns and applicability. | G17; RF-CTX-028 |
| G24b Website checklist | Independent review promotes findings into one versioned checklist with acceptance and rollback. | G24a; RF-CTX-028 |
| G24c Method proof | One supervised task uses the approved checklist and returns verifiable evidence. | G24b; RF-CTX-028 |
| G25 Public entry | Roost's pre-login page serves an approved audience with truthful claims and verified navigation/accessibility. | G24c; RF-UX-011, OPEN-UX-001 |
| G26 Product customers | One offering and canonical customer relationship have correct product/app authority and owner view. | G21; RF-BIZ-001–003/009, RF-APP-015 |
| G27 Payment test | One sandbox purchase reconciles payment, app access response, invoice, accounting and Roost exceptions. | G26; RF-BIZ-004–007, OPEN-FIN-001 |
| G28 Live sale | Separately authorized live transaction reconciles the same chain; owner sees revenue and failed-sync attention. | G27; RF-BIZ-005/006/008, RF-SEC-002 |
| G29 Support | One incident and one customer case route to accountable agents with severity, evidence and owner escalation. | G28; RF-SUP-001–004, OPEN-SVC-003 for public commitments |
| G30 Prospecting | Agent proposes a sourced qualified lead consistent with company direction; owner can reject weak evidence without contact. | G19/G26; RF-SVC-001–003, OPEN-STRATEGY-001 |
| G31 Offer/interview | Agent conducts an authorized needs interview and prepares scoped offer; pricing and legal terms need owner-approved authority. | G30; RF-SVC-004–009, OPEN-SVC-001, OPEN-SVC-002 |
| G32a Service start | Accepted scope, paid milestone and isolated access are visible before delivery starts. | G31; RF-SVC-010–012, OPEN-SVC-004 |
| G32b Service acceptance | One delivered milestone has evidence, client acceptance and settlement state in Roost. | G32a; RF-SVC-010–012 |
| G33 Continuing value | Renewal/maintenance work, support and closure show value, ownership and access removal over time. | G32b; RF-SVC-007–012, RF-SUP-001–004 |
| G34a Environment inventory | Agent reports host/VPS state and ranked maintenance findings without changing either host. | G14; RF-HOST-021, RF-RES-001–008 |
| G34b Supervised update | One exact update proves compatible drain, health and recovery; wider mandate needs separate decision. | G34a; RF-HOST-021, OPEN-HOST-001 |
| G35 Data lifecycle | Owner-approved export/retention/removal works across declared sources and preserves recovery/audit rules. | G28/G32; RF-INT-006, OPEN-DATA-001; deferred until activated |
| G36 Mobile | Defined native app uses the same Roost API/authority for one selected workflow and passes device UX/security checks. | Reliable web journeys; RF-SCOPE-001; deferred until activated |

At each milestone (G12, G21, G29, G33 and G36), independently review complete
owner/agent journeys and regress the console. G7 inventories **every** current
view; any view without a later functional gate gets its own bounded UX repair
before G21, and new views receive the same review when built. Reconcile every
applicable accepted requirement against the traceability matrix.
Security, resource, release and activation rules (RF-SEC/RES/REL/ACT) apply
only to each gate's actual effects. Deferred or rejected RF-SCOPE/DEF items
are not silently activated. Application readiness clauses in RF-APP and
RF-PILOT belong to authorized agent company work, not Codex Roost delivery.
Roost completion needs independent proof of the integrated company journeys
and evidence or an explicit later decision for every applicable requirement;
an unmapped or unverified requirement stays open. Report gate evidence and
remaining gaps, never a percentage of the evolving vision.
