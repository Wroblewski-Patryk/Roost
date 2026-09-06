# Interview foundation requirements — V2

Version: `ROOST-INTERVIEW-FOUNDATION-V2`. Status: frozen accepted baseline.
Source: **Roost - Wywiad**, task `01a06d26-73a0-79e1-a035-6b4e42380274`.
Cutoff: owner's “Tak” at **2026-09-06 03:36:23.550 UTC**, accepting a one-time
check that both Binance and Gate.io keys lack withdrawals **and transfers**.
Later unapproved statements are excluded. The existing managed-portfolio boundary
at `36be71bc` is retained, not inferred from later chat.

This is canonical product/architecture/operations/release requirements truth,
not an execution queue, agent memory or a claim of completed implementation.
The [traceability matrix](../architecture/traceability-matrix.md) separately records
implementation/proof status. Repeated approvals are consolidated into requirements
with explicit acceptance clauses; none of these clauses independently authorizes
execution, external writes or financial tests.

## Provenance and version rules

The thread reader returned empty message items. The explicitly authorized fallback
read the source session read-only, selecting only visible user/assistant messages,
never tool outputs or hidden reasoning. Source references below are zero-based
visible-message indexes in that bounded projection (commentary/heartbeat and
environment-only messages excluded). Messages 0–766 were reviewed. Early repeated
themes use bounded ranges; later corrections cite exact message pairs. No raw
conversation or private data is copied into this repository. English text below
is the canonical translation of accepted Polish intent. Rejected proposals appear
only as `superseded` history, never as authority.

IDs remain stable across future versions. Do not repurpose or renumber an ID.
A changed mandate gets a new version/ID and explicit supersedes/superseded-by
links; Git preserves the old baseline. Evidence status may advance in the matrix
without rewriting the frozen decision. `accepted`, `deferred` and
`superseded` describe decisions, not implementation.
P0/P1/P2 are engineering dependency priorities assigned during this audit,
not owner approval or a runtime incident priority.

## Activation order and constraints

Keep `ROOST_CODEX_EXECUTION_ENABLED=false` and the laptop in observer mode.
Local fault-injection certification precedes write access. Broker-enforced
main protection precedes real push/PR testing. A one-time GitHub/Coolify playground
requires the owner's repository and folder **only when that stage is ready**.
Its cleanup/archive is part of certification. The first real Soar worker is
read-only Application Auditor, followed by independent read-only Audit Verifier.
A concise readiness report and one-time owner approval precede first Soar write.
Later promotion still requires task/risk gates and three successful low-risk
deliveries before medium risk. This batch activates none of these stages.

2FA, staging, paid GitHub, bigger VPS, investment optimization, workspace-language
migration, external notifications, native Roost self-development/Constitution and
retiring both bootstrap automations are deferred and nonblocking. Existing
LuckySparrow workspace must use **English** and **Europe/Zurich**; communication
language and UI language are independent user settings, with PL/EN UI initially.

## Company and bootstrap governance

Gate/scope of enforcement: governance.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-gov-001"></a>RF-GOV-001 | 0–259;522–525 | accepted | Owner supplies goals, product intent and material decisions; competent agents handle reversible technical choices autonomously within verified mandates. | — |
| <a id="rf-gov-002"></a>RF-GOV-002 | 0–259;456 | accepted | Every goal, initiative and task has a parent, accountable owner, measurable contribution and evidence; agents cannot change or delete owner direction. | — |
| <a id="rf-gov-003"></a>RF-GOV-003 | 0–259 | accepted | Keep twelve peer departments with 00 General as a shared projection; Management Director/CEO coordinates rather than commanding all directors. | — |
| <a id="rf-gov-004"></a>RF-GOV-004 | 0–259 | accepted | Each worker has one accountable department and one direct supervisor; cross-department relevance does not create another reporting line. | — |
| <a id="rf-gov-005"></a>RF-GOV-005 | 0–259;520 | accepted | Delegate along the shortest valid hierarchy; domain director decides within mandate, Management coordinates conflicts, owner resolves reserved issues. | — |
| <a id="rf-gov-006"></a>RF-GOV-006 | 0–259;284–290 | accepted | Use shared human/agent workforce, persistent identities and fresh bounded execution sessions; preserve actor type and author. | — |
| <a id="rf-gov-007"></a>RF-GOV-007 | 0–259;351–355 | accepted | Maintain a complete role catalog across twelve departments; instantiate active agents only for demonstrated demand. | — |
| <a id="rf-gov-008"></a>RF-GOV-008 | 0–259;354–357 | accepted | HR recruitment requires manager request, role profile, director placement, Security least privilege, competency eval and probation; no self-hiring or self-promotion. | — |
| <a id="rf-gov-009"></a>RF-GOV-009 | 0–259;438–442 | accepted | Evaluate difficulty-adjusted outcomes, quality, regressions, rework, evidence, handoff, time and cost; independently diagnose failures before training, reassignment or deactivation. | — |
| <a id="rf-gov-010"></a>RF-GOV-010 | 356–357;718–720;744 | accepted | Requalify after material role/model/tool/procedure changes; skills transfer across similar apps, while new technology/risk requires additional proof and app-specific access. | supersedes [RF-OLD-009](#rf-old-009) |
| <a id="rf-gov-011"></a>RF-GOV-011 | 0–259;350–351 | accepted | PM owns product result, Technology implementation quality; UI design, visual design, frontend, visual QA and functional testing remain distinct responsibilities when needed. | — |
| <a id="rf-gov-012"></a>RF-GOV-012 | 0–259;288–294 | accepted | Application-specific PMs share cross-portfolio technical specialists; add staff only for competence gaps or sustained overload. | — |
| <a id="rf-gov-013"></a>RF-GOV-013 | 0–259;650–652 | accepted | Dynamic subagents are allowed with visible parent, role, goal, scope, budget, minimal authority, structured return and scheduler-controlled resource/writer limits. | — |
| <a id="rf-gov-014"></a>RF-GOV-014 | 0–259;672 | accepted | Every agent has its own technical identity; never record agent actions as owner actions or infer authority from actor type alone. | — |
| <a id="rf-gov-015"></a>RF-GOV-015 | 0–259;522–525 | accepted | Bootstrap implementation changes only Roost and its host/infrastructure; Soar and other applications are future native-agent targets, never bootstrap edits. | — |
| <a id="rf-gov-016"></a>RF-GOV-016 | 0–259;524–525 | accepted | Only closed versioned batches authorize bootstrap work; freeze a batch until DONE/BLOCKED; ordinary later answers wait, except STOP/SAFETY/material scope correction. | supersedes [RF-OLD-007](#rf-old-007) |
| <a id="rf-gov-017"></a>RF-GOV-017 | 734–736 | accepted | Every accepted requirement has a stable ID, decision/supersession status and evidence links to code, tests, configuration, commit and deployment where verified. | — |
| <a id="rf-gov-018"></a>RF-GOV-018 | 0–259;525 | accepted | Clarifications and BLOCKER reports go to the source interview task; preserve unrelated work and avoid repository task boards or execution memory. | — |
| <a id="rf-gov-019"></a>RF-GOV-019 | source batch;36be71bc | accepted | Managed portfolio is Aviary, Featherly, Nest and Soar; Roost is bootstrap infrastructure, excluded from application imports and agent targets. | — |
| <a id="rf-gov-020"></a>RF-GOV-020 | 0–259;416–418 | accepted | Key decisions, authority changes, releases, rollback and incidents use an append-only audit with corrections as linked new entries and permanent compact retention. | — |

## Context, procedures, tasks and decisions

Gate/scope of enforcement: before execution.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-ctx-001"></a>RF-CTX-001 | 0–259;300–306 | accepted | Roost compiles explicit bounded context; missing required sources block launch rather than inventing task intent. | — |
| <a id="rf-ctx-002"></a>RF-CTX-002 | 0–259;300–302 | accepted | Authority order is latest accepted Decision, approved product/company assumptions, canonical technical docs, observed code/config/tests and production evidence; contradictions do not rewrite intent. | — |
| <a id="rf-ctx-003"></a>RF-CTX-003 | 0–259;336–338;654 | accepted | Separate approved facts, observations, proposals, inferences and unknowns with source, version/date and confidence; incomplete app cards permit analysis only. | — |
| <a id="rf-ctx-004"></a>RF-CTX-004 | 0–259;330–334 | accepted | Application card identifies goal, users, core flows, non-goals, assumptions, owner/PM, canonical repo/path, deploy, commands, integrations, risk, health and rollback. | — |
| <a id="rf-ctx-005"></a>RF-CTX-005 | 0–259;320–324 | accepted | Context layers include company, profile/authority, task, app decisions, procedure/tests, technical fragments and dependencies/handoff; record inclusion reasons and version/hash. | — |
| <a id="rf-ctx-006"></a>RF-CTX-006 | 0–259;304–306 | accepted | Pin packet at Ready; revalidate at launch and resume; material goal/scope/assignment/access/dependency/source changes invalidate readiness and stop active work at a safe checkpoint. | — |
| <a id="rf-ctx-007"></a>RF-CTX-007 | 0–259;318–320 | accepted | Request additional context through an authorized, audited narrow request; material scope expansion requires revalidation. | — |
| <a id="rf-ctx-008"></a>RF-CTX-008 | 260–268;522 | accepted | Draft and Needs-context/Decision become Ready only through Submit-for-execution completeness validation; creation, assignment and free status edits cannot launch work. | — |
| <a id="rf-ctx-009"></a>RF-CTX-009 | 0–259;306–310;548 | accepted | One task has one app/component, outcome, accountable manager, executor and branch with independent acceptance; combine issues only for inseparable shared cause. | — |
| <a id="rf-ctx-010"></a>RF-CTX-010 | 0–259;276–282 | accepted | Task roles identify requester, accountable manager, executor, independent verifier and releaser; author cannot be sole verifier or self-authorize release. | — |
| <a id="rf-ctx-011"></a>RF-CTX-011 | 0–259;326–328 | accepted | Primary task types include audit, diagnosis, design, implementation, QA, review, release, recovery, operation and decision; type controls input, role, tools, result and gates. | — |
| <a id="rf-ctx-012"></a>RF-CTX-012 | 0–259;328–330 | accepted | Compose versioned base procedure, application extension and risk gates; missing procedure or approved exception blocks Ready; active runs keep pinned versions. | — |
| <a id="rf-ctx-013"></a>RF-CTX-013 | 0–259;310–312 | accepted | Formal handoff contains outcome/state, packet, decisions, commit/branch, changed areas, tests/evidence, limits, reproduce/continue/rollback and expected recipient action; recipient accepts or rejects. | — |
| <a id="rf-ctx-014"></a>RF-CTX-014 | 0–259;312–314 | accepted | Reviewer does not repair code; rejects with reproducible evidence; manager returns scoped work to author or creates a dependent specialist task without losing history. | — |
| <a id="rf-ctx-015"></a>RF-CTX-015 | 0–259 | accepted | Specialists may clarify linked work directly but may not reassign authority, scope or priority; retain structured conversation and verified execution summary. | — |
| <a id="rf-ctx-016"></a>RF-CTX-016 | 0–259;502–506 | accepted | Use short thematic interview blocks only for material unknowns; continue independent fact gathering; decisions include context, options, recommendation, consequences, dependencies and deferral. | — |
| <a id="rf-ctx-017"></a>RF-CTX-017 | 508–514;516 | accepted | New conflicting decisions preserve history, explain downstream impact and narrow scope; silence remains pending; budget limitations reopen on real events, not daily reminders. | — |
| <a id="rf-ctx-018"></a>RF-CTX-018 | 0–259;518–520 | accepted | Reserve product direction, money, legal, critical risk and mandate changes for owner; other decisions use shortest hierarchy and explicit delegated mandate. | — |
| <a id="rf-ctx-019"></a>RF-CTX-019 | 0–259;458 | accepted | Out-of-scope discoveries become linked findings instead of silent task growth, except necessary safe completion with explicit revalidation. | — |
| <a id="rf-ctx-020"></a>RF-CTX-020 | 0–259;314–318;441–442 | accepted | Lessons remain candidates until independently diagnosed and approved; promote versioned procedure/context/profile/checklist/test with applicability, source and rollback. | — |
| <a id="rf-ctx-021"></a>RF-CTX-021 | 0–259;334–336;540–546 | accepted | Classify audit findings as defect, unfinished function, stale docs, missing assumption or improvement; deduplicate, independently verify, then PM/triage creates an atomic Ready task or Decision. | — |
| <a id="rf-ctx-022"></a>RF-CTX-022 | 334–336;546 | accepted | Priority order: security/data/incidents/outages, blocked core flows, wrong results/actions, incomplete flows/regressions, stability-blocking debt, approved missing features, cosmetic/unproven optimization. | — |
| <a id="rf-ctx-023"></a>RF-CTX-023 | 550–552 | accepted | Paperclip remnants are untrusted audit input; validate before reuse/merge and clean only in a separate evidenced task. | — |
| <a id="rf-ctx-024"></a>RF-CTX-024 | 656;762 | accepted | Use version-matched official technical sources and dates; verify commercial licensing of dependencies/code/art and escalate unclear licenses to Legal before release. | — |
| <a id="rf-ctx-025"></a>RF-CTX-025 | 728–730 | accepted | Technical disputes go to an independent competent adjudicator using requirements/tests/evidence, then hierarchy; ruling binds the task until new evidence, never vote-shopping. | — |

## Local execution, scheduling and models

Gate/scope of enforcement: before execution.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-host-001"></a>RF-HOST-001 | 0–259 | accepted | VPS owns queue and private database; Windows host initiates outbound HTTPS; offline laptop leaves work queued without agent token consumption. | — |
| <a id="rf-host-002"></a>RF-HOST-002 | 0–259;448;648 | accepted | Only one writer across the laptop, with parallel lightweight readers only after resource checks; release writer on waiting only after safe checkpoint and confirmed stop. | supersedes [RF-OLD-008](#rf-old-008) |
| <a id="rf-host-003"></a>RF-HOST-003 | 0–259;444 | accepted | Reconcile API lease, local processes, branch/files and versioned checkpoints before claiming; resume same work when safe, otherwise preserve evidence and block/replan with reason. | — |
| <a id="rf-host-004"></a>RF-HOST-004 | 0–259;367 | accepted | One direct canonical physical clone per app; verify root, origin and branch provenance; no worktree/copy bypass, reset-hard or destruction of unknown work. | supersedes [RF-OLD-008](#rf-old-008) |
| <a id="rf-host-005"></a>RF-HOST-005 | 0–259;446;616 | accepted | One deterministic task branch per task; checkpoint/WIP remote backup allowed in private GitHub; branch ends merged, formally rejected or recoverable with evidence, never abandoned. | — |
| <a id="rf-host-006"></a>RF-HOST-006 | 0–259 | accepted | Checkpoint before side effects and periodically; lease loss/cancellation stops execution and preserves writer lock when process termination cannot be proven. | — |
| <a id="rf-host-007"></a>RF-HOST-007 | 0–259;486 | accepted | Windows login starts one hidden observer with visible identity, heartbeat and status; observer never claims work or launches Codex. | — |
| <a id="rf-host-008"></a>RF-HOST-008 | 0–259;429–430 | accepted | Host updates only while idle using compatible signed versions and rollback; initial updates remain manual. | — |
| <a id="rf-host-009"></a>RF-HOST-009 | 268–276;450–452 | accepted | Central scheduler admits complete Ready tasks by dependencies, online host, resources and priority; low/normal/high/critical with aging and only confirmed critical incident preemption. | — |
| <a id="rf-host-010"></a>RF-HOST-010 | 0–259;272–276 | accepted | Each task has time/token/cost/attempt limits, checkpoints and early stop; exhaustion needs independent plan review and new budget, never automatic increase. | — |
| <a id="rf-host-011"></a>RF-HOST-011 | 432;640 | accepted | Detect repeated ineffective operations and escalate independently; rate limits/outages checkpoint and respect backoff/Retry-After instead of aggressive retries. | — |
| <a id="rf-host-012"></a>RF-HOST-012 | 434–436 | accepted | Attribute model use and results to task, application, agent and goal; never reduce quality/tests/review just to save cost. | — |
| <a id="rf-host-013"></a>RF-HOST-013 | 642–646 | accepted | No autonomous Windows reboot/shutdown or rebooting updates; shared-service restart only after proving no other workload impact; real overload triggers safe pause. | — |
| <a id="rf-host-014"></a>RF-HOST-014 | 620–624 | accepted | Check backend/UI/schema/host compatibility before writes; Roost updates drain/checkpoint, migrate, check health, update host then resume; failure restores a compatible set with agents paused. | — |
| <a id="rf-host-015"></a>RF-HOST-015 | 0–259;424–428 | accepted | Each future device has separate identity/credential and owner-approved first pairing or re-pairing; one laptop only for now. | — |
| <a id="rf-host-016"></a>RF-HOST-016 | 0–259;298–300;756 | accepted | Every launch requires an explicit approved model at least GPT-5.6 and an explicit supported reasoning effort; pass the exact pair to Codex without inherited defaults or silent downgrade. | — |
| <a id="rf-host-017"></a>RF-HOST-017 | 294–300;756 | accepted | Select model and reasoning independently per task/stage, honor owner overrides and risk/procedure minima; escalate effort/model when needed, wait or use approved equivalent if unavailable. | — |
| <a id="rf-host-018"></a>RF-HOST-018 | 294–300;434 | accepted | Record requested and actually observed model/effort, time, cost and outcomes; never label requested settings as provider-confirmed use. | — |
| <a id="rf-host-019"></a>RF-HOST-019 | 674–676 | accepted | External pages, documents, logs, issues and user data are untrusted evidence; isolate suspicious instructions and report safely without executing them. | — |
| <a id="rf-host-020"></a>RF-HOST-020 | 0–259;406;704 | accepted | Agents read only task-scoped application and approved context, not private laptop data; browser uses isolated controlled sessions through broker. | — |

## Security, credentials, risk and data

Gate/scope of enforcement: before writing or sensitive operations.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-sec-001"></a>RF-SEC-001 | 0–259;328–330 | accepted | Risk is maximum impact across money/data/security/availability/legal/reversibility/users; uncertainty raises risk and cumulative changes cannot evade controls. | — |
| <a id="rf-sec-002"></a>RF-SEC-002 | 0–259;328–330;410 | accepted | Low/medium act within verified procedures; high requires extended independent review and mandate/decision; critical and destructive production migration require fresh owner approval, verified backup and restore plan. | — |
| <a id="rf-sec-003"></a>RF-SEC-003 | 0–259;314–316;422 | accepted | Broker grants least privilege per task/agent/app/operation/time/risk, executes sensitive operations without returning secrets and revokes on completion, interruption or role change. | — |
| <a id="rf-sec-004"></a>RF-SEC-004 | 0–259;408 | accepted | Redact secrets and personal data before logs, attachments, checkpoints and model context persist; discovery creates incident without copying secret value. | — |
| <a id="rf-sec-005"></a>RF-SEC-005 | 400–406 | accepted | Dependencies require rationale, lockfile, security scan and independent review; no arbitrary internet scripts/global installs; task-scoped network egress blocks unjustified data export. | — |
| <a id="rf-sec-006"></a>RF-SEC-006 | 414 | accepted | Production diagnosis uses minimal anonymized samples and metrics; full records only exceptional, time-bounded and audited. | — |
| <a id="rf-sec-007"></a>RF-SEC-007 | 472;678–682 | accepted | Sensitive auth/permissions/secrets/trading/money/data changes require Security review; safeguard changes are high risk and disabling a key gate needs fresh narrow expiring owner exception. | — |
| <a id="rf-sec-008"></a>RF-SEC-008 | 498–500 | accepted | Version environment variable names/purpose/requirements, never secret values; expose availability only; expired credentials block dependent work and give safe renewal instructions. | — |
| <a id="rf-sec-009"></a>RF-SEC-009 | 668 | accepted | Only owner or explicitly authorized admin invites; new members receive minimal role scope, not blanket projects, secrets or decisions. | — |
| <a id="rf-sec-010"></a>RF-SEC-010 | 686 | accepted | Routine health checks are read-only and side-effect free; real orders, messages, record changes or paid operations require an explicitly scoped test. | — |
| <a id="rf-sec-011"></a>RF-SEC-011 | 606 | accepted | Uncertain external outcomes require reconciliation before retry across push, merge, deploy, task creation and configuration. | — |
| <a id="rf-sec-012"></a>RF-SEC-012 | 758–760 | accepted | Serious incident suspends affected risky capability until independent cause/impact/remediation/regression proof; owner manual intervention triggers reread/replan, never automatic undo. | — |

## Resource manifests and backup

Gate/scope of enforcement: before writing or release.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-res-001"></a>RF-RES-001 | 0–259;316–318;490–494 | accepted | Manifest fixes canonical directory/repo, Docker project, containers, ports, networks, volumes, DB and commands; distinguish permanent services from task-owned temporary ones. | — |
| <a id="rf-res-002"></a>RF-RES-002 | 0–259;486–496 | accepted | Start registered services only if absent; stop/clean only execution-owned temporary resources; unknown conflicts trigger diagnosis without kill/alternate port/duplicate environment. | — |
| <a id="rf-res-003"></a>RF-RES-003 | 0–259;496 | accepted | Rebuild disposable dependencies/containers safely; persistent volume changes require risk gates and verified backup; preserve unknown files/data until provenance resolved. | — |
| <a id="rf-res-004"></a>RF-RES-004 | 0–259;412 | accepted | Ordinary code relies on Git and prior image; risky data changes need verified backup before replacement; retain last good copy plus temporary pre-release copy through observation, then rotate by capacity. | — |
| <a id="rf-res-005"></a>RF-RES-005 | 0–259;608–614 | accepted | Before agents, prove encrypted Roost DB backup/restore without disturbing production; sync one latest verified encrypted copy to owner-designated laptop folder; keep restore key separate. | supersedes [RF-OLD-010](#rf-old-010) |
| <a id="rf-res-006"></a>RF-RES-006 | 614 | accepted | Generate one-time owner recovery code stored off laptop/VPS; record only acknowledgement, never code in Roost records or artifacts. | — |
| <a id="rf-res-007"></a>RF-RES-007 | 478;484 | accepted | Default one VPS deployment or heavy production test at a time unless manifest proves capacity; check disk/memory/load/Docker/services and wait with reason if insufficient. | — |
| <a id="rf-res-008"></a>RF-RES-008 | 480–484 | accepted | Coolify owns scheduled cleanup; Roost does not duplicate, diagnose or repair that cleanup job; insufficient resources only delay deployment. | — |

## Review, GitHub and production delivery

Gate/scope of enforcement: before push or release.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-rel-001"></a>RF-REL-001 | 0–259;368–374;618 | accepted | Use private GitHub Free branches and PRs without paid CI dependency; local Agent Host runs required tests; broker enforces review/main protection, hooks alone are insufficient. | — |
| <a id="rf-rel-002"></a>RF-REL-002 | 374 | accepted | Repository visibility is owner-controlled and may never be changed autonomously to obtain free protections. | — |
| <a id="rf-rel-003"></a>RF-REL-003 | 0–259;346–348 | accepted | Reviewer is an independent agent identity in a fresh session, selected by scheduler; inspect criteria/exact diff/commit/evidence and independently reproduce checks, without hidden reasoning. | — |
| <a id="rf-rel-004"></a>RF-REL-004 | 0–259;368–372 | accepted | Temporary release capabilities require independently approved exact commit and passing tests; releaser does not edit code; changed base/commit invalidates review and needs new checks. | — |
| <a id="rf-rel-005"></a>RF-REL-005 | 0–259;376 | accepted | Tracked changes finish only after commit, integration and push; runtime additionally requires expected production commit, health and observation; docs-only changes do not require deploy. | — |
| <a id="rf-rel-006"></a>RF-REL-006 | 378–382 | accepted | Observe production for risk-based window; attribute regression to release before rollback; baseline defects become separate findings; ambiguity freezes further releases and triggers independent diagnosis. | — |
| <a id="rf-rel-007"></a>RF-REL-007 | 0–259;692–696 | accepted | Rollback restores immutable previously verified image, config and compatible schema as one manifest; retain current plus one verified prior artifact through observation/backup checks. | — |
| <a id="rf-rel-008"></a>RF-REL-008 | 0–259 | accepted | Clear safe release failure triggers rollback without routine owner question; never repeat failed deployment blindly; irreversible/data-loss case uses separately approved recovery plan. | — |
| <a id="rf-rel-009"></a>RF-REL-009 | 386 | accepted | VPS monitors continuously while laptop offline and records incidents; initial mode makes no code/deploy/rollback without laptop; app-native safety remains active. | — |
| <a id="rf-rel-010"></a>RF-REL-010 | 388–396 | accepted | Each app needs defined tested safe state and allowed emergency procedures before autonomous production; invalidate safety proof by impact/expiry and retest safely in paper/simulation with resource limits. | — |
| <a id="rf-rel-011"></a>RF-REL-011 | 464;468–472 | accepted | Test plan follows change impact: direct regression/reproduction first then affected contracts; broad tests for shared core/auth/API/schema, equivalent repeatable evidence if automation impractical, no arbitrary coverage quota. | — |
| <a id="rf-rel-012"></a>RF-REL-012 | 462 | accepted | UI work needs application-appropriate before/after visual, responsive, accessibility and functional evidence with independent UI/UX review. | — |
| <a id="rf-rel-013"></a>RF-REL-013 | 464 | accepted | API/backend remain compatible with existing frontend, integrations and stored data; breaking changes require staged migration plan. | — |
| <a id="rf-rel-014"></a>RF-REL-014 | 474–476 | accepted | Production configuration has versioned desired state, reason and proof; diagnose drift before correction, escalate unclear/risky differences instead of overwriting. | — |
| <a id="rf-rel-015"></a>RF-REL-015 | 684;688–690 | accepted | App health contract includes critical flows, jobs, integrations, errors and thresholds; establish deployed commit/services/config/known-problem baseline and block unknown production state. | — |
| <a id="rf-rel-016"></a>RF-REL-016 | 698;702 | accepted | Each app has deployment windows and tolerated interruption; Roost any time after draining/checkpoint, target interruption at most ten minutes and safe rollback. | — |
| <a id="rf-rel-017"></a>RF-REL-017 | 704–708 | accepted | Soar any time only without active live position/trading; expected full six-component deployment within 20 minutes, warning after 20, component diagnosis after 30, never timeout-only rollback; propose threshold changes, never silently extend. | supersedes [RF-OLD-002](#rf-old-002) |
| <a id="rf-rel-018"></a>RF-REL-018 | 558;562 | accepted | Feature flags are required only when concrete risk warrants them, not on every change during the test stage. | supersedes [RF-OLD-005](#rf-old-005) |

## Readiness and staged activation

Gate/scope of enforcement: activation gates.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-act-001"></a>RF-ACT-001 | 522;710 | accepted | Keep execution disabled until applicable readiness gates pass; observer presence, docs, completed bootstrap batch and account keys do not activate agents. | — |
| <a id="rf-act-002"></a>RF-ACT-002 | 526–532 | accepted | Before writing, run local synthetic end-to-end readiness and fault injection covering interruption/restart, lease expiry, reviewer rejection, missing resources, preserving work and preventing duplication. | — |
| <a id="rf-act-003"></a>RF-ACT-003 | 530–536 | accepted | Before push/PR certify broker main protection; then one temporary owner-provided private GitHub repository and canonical folder exercise branch, commit, push, PR, review, merge, Coolify, health and rollback. | supersedes [RF-OLD-004](#rf-old-004) |
| <a id="rf-act-004"></a>RF-ACT-004 | 534–536 | accepted | After temporary certification, remove only owned local clone/containers/Coolify app and archive test repository; recreate only after material host/process changes, never permanent playground. | supersedes [RF-OLD-004](#rf-old-004) |
| <a id="rf-act-005"></a>RF-ACT-005 | 358–361;540 | accepted | First real worker is read-only Soar Application Auditor: verify repo/docs/code/tests/Git/public health and report findings; no edits, Docker, branch, commit or exchange operation. | — |
| <a id="rf-act-006"></a>RF-ACT-006 | 360–363 | accepted | Second worker is independent read-only Audit Verifier with fresh session and structured handoff; sample evidence, validate target and unchanged files/Git/processes/Docker, approve or return gaps. | — |
| <a id="rf-act-007"></a>RF-ACT-007 | 362–365;724 | accepted | First write requires both canaries and one concise readiness report with proofs, exact capabilities, prohibitions, risks and recovery plus owner approval; select small reproducible reversible non-financial Soar bug. | — |
| <a id="rf-act-008"></a>RF-ACT-008 | 712–716 | accepted | Unlock read-only, local write/test, push/PR, merge/deploy then higher risk only after evidence; after one-time write approval ordinary advancement is automatic, sensitive/live exceptions remain. | — |
| <a id="rf-act-009"></a>RF-ACT-009 | 740–742 | accepted | Require three consecutive complete low-risk Soar successes with review, release and observation before medium risk; failure pauses advancement and independent analysis sets additional proof, not blind history reset. | — |
| <a id="rf-act-010"></a>RF-ACT-010 | 744 | accepted | Each additional app gets its own audit, manifest, health contract and safe canary despite portable worker competencies. | supersedes [RF-OLD-009](#rf-old-009) |
| <a id="rf-act-011"></a>RF-ACT-011 | 0–259;734 | accepted | Each implementation run audits current mechanisms then closes exactly one smallest highest-priority ready atomic gap; do not duplicate foundations or start a second gap. | — |

## Soar product and controlled integration tests (future native agents only)

Gate/scope of enforcement: after activation and relevant approval.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-soar-001"></a>RF-SOAR-001 | 0–259 | accepted | Soar is first pilot with canonical Soar clone, Wroblewski-Patryk/Soar repository and soar.luckysparrow.ch deployment; stabilize unfinished core flows before features. | — |
| <a id="rf-soar-002"></a>RF-SOAR-002 | 0–259 | accepted | Backtest, paper and live share strategy decision engine and persisted decisions; modes differ in historical input/order executor, with multiple exchanges, markets and portfolios. | — |
| <a id="rf-soar-003"></a>RF-SOAR-003 | 0–259 | accepted | Separate strategy logic, immutable configuration version and run; edits create a version, rollback selects prior history, existing positions remain owned by opening version until close unless tested migration approved. | — |
| <a id="rf-soar-004"></a>RF-SOAR-004 | 0–259;556–558 | accepted | Deploy must not silently change mode/config or interrupt/duplicate trading; verify live positions/orders/processes, stop new orders and reconcile in-flight work before safe restart. | — |
| <a id="rf-soar-005"></a>RF-SOAR-005 | 562 | accepted | Current test mandate is 10 USDT Binance Futures and 10 USDT Gate.io Futures; minimize losses, protect all spot assets; increased capital or spot scope needs new decision. | — |
| <a id="rf-soar-006"></a>RF-SOAR-006 | 564;766 | accepted | No deposits, withdrawals or wallet transfers by Soar/agents; before first live test confirm once that BOTH exchange API keys lack withdrawal AND transfer rights, automatically if API supports else owner manual check. | — |
| <a id="rf-soar-007"></a>RF-SOAR-007 | 576–578 | accepted | Every real-position live test requires fresh single-use owner consent bound to exchange, strategy, amount, duration, closing procedure and start window; owner confirms laptop available at least one hour; expiry/silence blocks. | supersedes [RF-OLD-001](#rf-old-001) |
| <a id="rf-soar-008"></a>RF-SOAR-008 | 572–574;580–582 | accepted | Test only target Soar functions for open/manage/close/history; at most 60 minutes exposure, prompt closure and risk reduction preferred to price; no temporary watchdog/test-only app feature. | supersedes [RF-OLD-006](#rf-old-006) |
| <a id="rf-soar-009"></a>RF-SOAR-009 | 580–584 | accepted | One position at a time, smallest market-supported size, at most 1 USDT margin, leverage at most 10x and confirmed isolated margin; impossible minima/unknown mode block or require new owner decision. | — |
| <a id="rf-soar-010"></a>RF-SOAR-010 | 580–582 | accepted | Failed close or laptop interruption fails test, blocks further tests and may need owner manual close; never claim a temporary VPS watchdog will rescue it. | supersedes [RF-OLD-006](#rf-old-006) |
| <a id="rf-soar-011"></a>RF-SOAR-011 | 586–590 | accepted | Before test verify no conflicting existing orders/position; after test reconcile exchange and Soar DB, history, fees, result, zero residual orders/position; certify Binance and Gate.io separately and sequentially. | — |
| <a id="rf-soar-012"></a>RF-SOAR-012 | 592–596 | accepted | Same impacted code/config passes automatic tests, backtest and paper before proposing live; paper sample/time and pass conditions set in advance; technical correctness separate from investment performance. | — |
| <a id="rf-soar-013"></a>RF-SOAR-013 | 598–602 | accepted | During repairs adjust strategy only to reproduce/test, not optimize profit; version test config, restore prior active config unless approved target; each run links ID, code, strategy and config to decisions/orders/results. | — |
| <a id="rf-soar-014"></a>RF-SOAR-014 | 604 | accepted | After uncertain order response or reconnect reconcile exchange by order identifier before retry to avoid duplicated positions. | — |
| <a id="rf-soar-015"></a>RF-SOAR-015 | 626–634 | accepted | Use separate application test accounts where feasible; external integrations specifically use owner real connected account in an isolated folder/list/tag or exact allowed operations. | supersedes [RF-OLD-003](#rf-old-003) |
| <a id="rf-soar-016"></a>RF-SOAR-016 | 634;638–640 | accepted | Mark integration artifacts with test ID and delete only artifacts created by that test unless retained by acceptance; respect rate/cost limits, extra charge requires budget decision. | — |
| <a id="rf-soar-017"></a>RF-SOAR-017 | 0–259 | accepted | Test locally/mocked first, then local integration; use resource-bounded VPS gateway only for demonstrated callback/fixed-IP requirement within approved scope. | — |

## User communication, localization, time and attention

Gate/scope of enforcement: before affected user workflows.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-ux-001"></a>RF-UX-001 | 0–259;314–318 | accepted | Central attention shows Decisions, Blockers, Incidents and Results; actionable entries stay until resolved/snoozed, deduplicate event threads and avoid routine heartbeat noise. | — |
| <a id="rf-ux-002"></a>RF-UX-002 | 0–259;316–318;732 | accepted | Default concise outcome and key evidence with expandable execution timeline, roles, model/effort/budget/checkpoints/handoffs/tests/commits/releases/retries/stops; explain actions without hidden reasoning. | — |
| <a id="rf-ux-003"></a>RF-UX-003 | 0–259;316–318 | accepted | Owner can drain queue, checkpoint-stop task, block app or emergency-stop host with scope/reason/audit/resume; uncertain process stop keeps writer fenced. | — |
| <a id="rf-ux-004"></a>RF-UX-004 | 0–259;318–320;418 | accepted | Permanent compact decisions/handoffs/result/commit/deploy evidence; successful raw logs 7 days, failures 30 days or until diagnosis complete; redact before persistence, remove safe local temps after upload, large artifacts source links/hash only. | — |
| <a id="rf-ux-005"></a>RF-UX-005 | 658–660;664 | accepted | Store communication language per user, UI language independently, and canonical knowledge language per workspace; route decision language to responsible recipient and retain original plus canonical translation, confirm ambiguity. | — |
| <a id="rf-ux-006"></a>RF-UX-006 | 662 | accepted | Choose workspace language at creation and keep immutable; existing LuckySparrow workspace is English; language migration deferred. | — |
| <a id="rf-ux-007"></a>RF-UX-007 | 664–666 | accepted | Preserve current UI choice; support PL/EN now and extensible catalog; missing translations fall back to English and create a finding rather than raw key. | — |
| <a id="rf-ux-008"></a>RF-UX-008 | 746–750 | accepted | Store timestamps UTC, display in user timezone, company schedules in workspace timezone; LuckySparrow Europe/Zurich; user browser detection with manual override. | — |
| <a id="rf-ux-009"></a>RF-UX-009 | 752–754 | accepted | Daily schedules preserve workspace wall time across DST without duplicate/missed work; offline missed periods coalesce to one catch-up unless procedure explicitly requires all. | — |

## Explicitly deferred features

Gate/scope of enforcement: nonblocking and disabled.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-def-001"></a>RF-DEF-001 | 670 | deferred | 2FA is future security improvement, not a first-agent activation prerequisite. | — |
| <a id="rf-def-002"></a>RF-DEF-002 | 0–259;512–514 | deferred | Staging, paid GitHub/CI and larger VPS wait for owner/infrastructure change; no periodic purchase reminders. | — |
| <a id="rf-def-003"></a>RF-DEF-003 | 398;598 | deferred | Investment optimization agent and its detailed mandate remain future decisions; current work only stabilizes/tests Soar. | — |
| <a id="rf-def-004"></a>RF-DEF-004 | 662 | deferred | Changing workspace language after creation is deferred. | — |
| <a id="rf-def-005"></a>RF-DEF-005 | 0–259 | deferred | External email/Telegram notifications are deferred; use Roost attention surfaces initially. | — |
| <a id="rf-def-006"></a>RF-DEF-006 | 0–259 | deferred | Native Roost self-development, Constitution work and shutdown of both bootstrap automations remain deferred until separate owner decision. | supersedes [RF-OLD-011](#rf-old-011) |

## Organization and product lifecycle

Gate/scope of enforcement: before related workflows.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-org-001"></a>RF-ORG-001 | 0–259 | accepted | Agent profile includes identity, department, role, manager, competence levels/evidence, allowed/denied task types, maximum authority/tools, procedures, model policy, availability and outcome history. | — |
| <a id="rf-org-002"></a>RF-ORG-002 | 0–259 | accepted | Goal is outcome, hierarchical procedure is how, pipeline is execution and task is atomic work; each procedure has owner, inputs, outputs, roles, exceptions and gates. | — |
| <a id="rf-org-003"></a>RF-ORG-003 | 0–259 | accepted | Applications progress concept/prototype/stabilization/market readiness/product-service/maintenance using evidence and one shared application identity across departments. | — |
| <a id="rf-org-004"></a>RF-ORG-004 | 0–259 | accepted | Postmortem has one accountable owner and independent domain reviewers; author contributes evidence but cannot unilaterally change own instructions or company process. | — |
| <a id="rf-org-005"></a>RF-ORG-005 | 0–259 | accepted | Classify legacy product assumptions before migration; Roost owns approved company/product context, repositories own current technical architecture/tests; retain provenance without mechanical copy. | — |

## Historical superseded policies

Gate/scope of enforcement: not active.

| ID | Source messages | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-old-001"></a>RF-OLD-001 | 566–568 | superseded | Live tests may start without a fresh test-specific owner consent. | replaced by [RF-SOAR-007](#rf-soar-007) |
| <a id="rf-old-002"></a>RF-OLD-002 | 699–700 | superseded | Soar deployment target interruption is at most ten minutes. | replaced by [RF-REL-017](#rf-rel-017) |
| <a id="rf-old-003"></a>RF-OLD-003 | 625–630 | superseded | External integrations should default to separate test accounts/sandbox. | replaced by [RF-SOAR-015](#rf-soar-015) |
| <a id="rf-old-004"></a>RF-OLD-004 | 533–536 | superseded | Keep a permanent Roost certification playground. | replaced by [RF-ACT-003](#rf-act-003); replaced by [RF-ACT-004](#rf-act-004) |
| <a id="rf-old-005"></a>RF-OLD-005 | 559–562 | superseded | Every new or risky feature must ship disabled behind a feature flag. | replaced by [RF-REL-018](#rf-rel-018) |
| <a id="rf-old-006"></a>RF-OLD-006 | 571–581 | superseded | Add temporary Soar/VPS watchdog to close test positions on timeout or laptop loss. | replaced by [RF-SOAR-008](#rf-soar-008); replaced by [RF-SOAR-010](#rf-soar-010) |
| <a id="rf-old-007"></a>RF-OLD-007 | 0–259;524–525 | superseded | Send incremental individual interview answers directly to active implementation. | replaced by [RF-GOV-016](#rf-gov-016) |
| <a id="rf-old-008"></a>RF-OLD-008 | 0–259 | superseded | Use separate execution worktrees/clones and a writer limit per repository. | replaced by [RF-HOST-002](#rf-host-002); replaced by [RF-HOST-004](#rf-host-004) |
| <a id="rf-old-009"></a>RF-OLD-009 | 717–720 | superseded | Repeat full worker competency certification for each new application. | replaced by [RF-GOV-010](#rf-gov-010); replaced by [RF-ACT-010](#rf-act-010) |
| <a id="rf-old-010"></a>RF-OLD-010 | 0–259;608–612 | superseded | Never copy any production database to the laptop under any circumstance. | replaced by [RF-RES-005](#rf-res-005) |
| <a id="rf-old-011"></a>RF-OLD-011 | 0–259;672 | superseded | Finish native Roost self-development and Constitution and retire bootstrap automations before foundations proceed. | replaced by [RF-DEF-006](#rf-def-006) |
