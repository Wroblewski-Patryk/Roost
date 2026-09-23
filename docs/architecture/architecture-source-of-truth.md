# Architecture Source Of Truth

Owner amendment v35: [host/installation lifecycle](worker-identity-lifecycle-v1.md)
is **DONE source-only: 15/15 new results, 114/114 selected source results**.
One canonical lifecycle journal binds existing identities to independent monotonic
epochs and terminal revocation. Legacy requires explicit prospective owner adoption;
no default epoch/backfill. Writer guards and read-only projection are proposed in
an UNAPPLIED additive migration. Four lifecycle gaps clear only for evidenced
records; five other bootstrap gaps remain. Native qualification PARTIAL,
production BLOCKED; all six flags plus transportQualified/launchAuthority false.
One next proposal: separately authorized native lifecycle/guard qualification in
a disposable synthetic database with verified cleanup. No activation.
Earlier qualification and successor proposals below are historical.

Owner amendment v26: [loopback HTTPS handoff adapter](worker-handoff-https-v1.md)
is DONE: 9/9 real HTTPS results and 189/189 selected tests. It checks normal TLS
plus certificate DER SHA-256 pinning, exact origin, staged epoch/cutover, no proxy
or redirects, bounded JSON/timeouts and uncertain delivery without retries.
Production TLS/DNS/provisioning remain BLOCKED; no default composition or flag
changes. No DB/Docker or Worker/provider/model runs. One next atom: source-only
production HTTPS/DNS/certificate admission contract and synthetic denial tests
with exact installation/host/owner and epoch rollback boundaries. Earlier
amendments and successor proposals below are historical.

Owner amendment v25 — native Worker handoff qualification

[Native handoff evidence](worker-credential-lifecycle-v1.md): **DONE**, 9/9
PostgreSQL/HTTP results and 180/180 selected regressions. All 76 migration files
remain unchanged. Real Prisma transactions qualify one-time poll/ACK, exact
owner/device binding, recovery, rollback and secret-free persistence; concurrent
conflicts use proof-checked read-only spent metadata without command retries.
Loopback HTTP uses synthetic HTTPS/certificate evidence, not real TLS. Default
routes remain closed; six flags false. One next atom: loopback HTTPS adapter
qualification with ephemeral test certificates and synthetic credentials, without
production provisioning, secret storage, provider launch or activation. Earlier
amendments and their next-atom proposals below are historical.

Owner amendment v24: [synthetic Worker credential handoff](worker-credential-lifecycle-v1.md)
adds a source-only device authorization flow on the existing ApiKey lifecycle.
The unauthenticated device request stores only hashes and exact installation,
host, HTTPS-origin and certificate evidence; a fresh primary owner approves the
exact accepted decision. One serialized poll can disclose a bounded synthetic
credential once, and only a possession ack activates it. Lost response becomes
terminal `delivery_unknown`; recovery requires a new explicit decision. **7/7
handoff tests PASS.** The additive handoff migration is unexecuted; native
persistence and real TLS remain unqualified, default routes closed, six flags false.
The v23 native result and earlier next-step statements below are historical.

Owner amendment v23: [native Worker credential qualification](worker-credential-lifecycle-v1.md)
is DONE for the bounded database atom: 12/12 PostgreSQL/HTTP results and 173/173
synthetic regressions; cleanup/preservation PASS. The 75-migration chain runs in
one owned disposable database. Native parsing found two CASE comparisons in the
previously unapplied final migration; parentheses repair them after full rollback.
Prior 74 migrations remain unchanged. Owner/decision gates, generation races,
atomic ticket/claim invalidation and rollback are qualified with synthetic keys.
Real provisioning/transport/launch stay blocked; default composition and six flags
remain unchanged. The source-only and next-step statements below are historical.

Owner amendment v22: [owner-controlled Worker credentials](worker-credential-lifecycle-v1.md)
extends existing ApiKey, host and governed decisions with enrollment, rotation and
terminal revocation. Fresh primary-owner authentication and an exact accepted
decision bind each change. Source/synthetic qualification DONE: 173/173 tests
(55 new, 118 regressions). The additive 75th migration is unexecuted; native
persistence is PARTIAL, real provisioning/transport/launch BLOCKED. Default
composition has no generator, hasher or delivery; all six flags remain false.
The v21 database result and earlier next-step proposals below are historical.

Owner amendment v21: [native Worker ticket qualification](worker-owner-ticket-channel-v1.md)
exercises the unchanged 74-migration chain, credential/binding guards, one-use
owner/Worker races and read-only status through Prisma/auth/redaction. Qualification
repairs only credential usage writes outside consume rollback and nested control
proof handling, including nonpersistent status rejection. Real provisioning,
transport and launch remain unqualified; all six flags remain false.
Earlier amendment results below describe their historical verification state.

Owner amendment v20: [Worker ticket channel](worker-owner-ticket-channel-v1.md)
adds existing-credential host/installation binding, shared one-use owner/Worker
consume, and strictly read-only nonrenewable status. Source/synthetic DONE:
102 tests pass. New additive migration/native guards are unqualified; no real
credential is provisioned and no transport or launch is admitted. Six flags false.

Owner amendment v19: [native owner-ticket database qualification](server-owner-ticket-v1.md)
passes the 73-migration forward chain and 15 native PostgreSQL/HTTP checks,
including one commit from twenty concurrent consumes and transactional rollback.
The discovered Ready/risk authority-read defect is fixed without weakening source
watches or native guards. Cleanup and environment/data comparison PASS. Production
signer, host evidence, Worker transport and launch stay unqualified; six flags false.
Earlier amendment results below describe their historical verification state.

Owner amendment v18: [owner-ticket services and persistence](server-owner-ticket-v1.md)
are implemented with an injected test signer and no runtime composition.
Status PARTIAL: 50 synthetic service/HTTP/adapter tests and four provider tests pass;
PostgreSQL migration/CAS/native Ready integration are unqualified (Engine absent).
Four existing-runtime routes fail closed by default. No private key generation,
Worker authority or launch receipt; six flags remain false. The additive SQL
retains immutable ticket/attempt/decision tombstones and an atomic journal.

Owner amendment v17: [external Roost owner tickets](server-owner-ticket-v1.md)
replace local writable-key authority as the selected production design.
Private signing capability stays on the existing server, with owner-only decision
issuance and fresh public verification plus atomic one-use consumption.
Source contract/validator DONE; authenticated transport, server transactions and
real integration BLOCKED. The stateless validator returns no launch authority.
Same-user code is not sandboxed. Six flags false; no keys, ACLs or runtime changes.

Owner amendment v16, 2026-09-23:
[backend-aware managed-Hermes admission](managed-hermes-backend-admission-v1.md)
is source/synthetic DONE. Versioned explicit Codex Responses versus local Ollama
selection is bound to the existing signed decision, task/Ready/Writer, scope,
roles, risk, budgets, original fixed Job and review/recovery/release gates.
Refusal spends the attempt; changing backend/model cannot renew it. Positive
tests execute only the closed fixture. Real issuer/launch remain BLOCKED and
six flags false; safe private anchor provisioning is unresolved. No routing,
real profile or model-store change. This supersedes the prior proposed next atom.

Owner amendment v15, 2026-09-23: **Roost -> Windows Local Worker -> managed
Hermes -> selected backend/model** is the sole target task flow. Codex
OAuth/Responses with explicit allowed model >=5.6 and reasoning, and local
Ollama with exact model/digest, are Hermes backends. Direct Codex is disabled
diagnostic/emergency reference only: no pilot authority or silent fallback.
[Static CLI inventory](codex-static-inventory-v1.md) is DONE but is not a
dependency/admission proof for the selected Hermes transport; the original
pin-binding atom is PARTIAL / architecture mismatch. Signed direct pilot
decisions and direct task dispatch now deny. Real execution and all six flags
remain false; v14's accepted account risk and independent gates remain.
This amendment supersedes the provider ordering/next steps below.

RF-HOST-035 owner amendment v14 (2026-09-23):
[trusted provider pilot](trusted-provider-pilot-v1.md) accepts account-level
residual risk for exactly pinned Codex and managed local Hermes; full OS
isolation is not their pilot prerequisite. Signed private acceptance and its
fixture-only admission are implemented; real runtime/model integration remains
PARTIAL. Task/Ready/Writer, Job, budget, recovery and release gates stay required;
all six flags and arbitrary-provider/full-isolation/full-autonomy admission stay
false. This is the current next-step authority over the historical notes below.

RF-RUNTIME-005B30 kwalifikuje osobną klasę `synthetic_fixed`: stały program,
publiczne API/Ready/claim i Worker, pierwotny ownership B28, zawieszony Job,
trwały resume receipt/ack, dokładnie 22 bajty wyniku, niezależne review i cleanup.
[Tabela gotowości](agent-delivery-readiness.md) opisuje dodatni E2E oraz odmowę
bez resume receipt. Dowód dotyczy zamkniętej semantyki tego programu, bez sandboxa.
Hermes, Direct i sześć flag pozostają zablokowane/false. Jedyna następna luka:
RF-HOST-035 — dopuszczenie ochrony host lifecycle dla rzeczywistego providera.
Nie ma zgody na model trial ani automatyczną kontynuację; propozycje poniżej
są historyczne.

RF-RUNTIME-005B26 [adopted recovery](hermes-b26-adopted-recovery-v1.md) defines the separately owner-authorized
one-use cleanup of the exact B25-adopted B21 fixture, then its lease and Writer.
A signed append-only consumption/intent chain, exclusive controller and recovery
barrier fence each identity-checked deletion and deterministic resume. Original
B21/B24/B25 evidence and spent records remain historical truth; successful recovery
is not task acceptance. All six flags stay false, with no provider/API/configuration
authority or production autonomy. The proposed next atom is B27 durable original
fixture-ownership evidence at creation, source/synthetic only. See the contract for
the verified terminal state; earlier successor statements below are historical.


RF-RUNTIME-005B25 [exact legacy fixture adoption](hermes-b25-legacy-adoption-v1.md) implements the owner's
one-shot acceptance of B21's missing historical parent-fixture ownership proof.
It freezes canonical paths, physical objects and all B21/B24/control/runtime
evidence in a separate append-only record; original history is never backfilled.
Adoption expires after 24 hours and grants no cleanup, execution, API or config
authority. Only B26 preparation may qualify, subject to fresh checks and a new
explicit owner decision for that separate recovery atom. All six flags remain
false; production autonomy is not ready. Execution ADR v13 and runtime policies
remain unchanged. Earlier status and successor statements below are historical.


RF-RUNTIME-005B24 [recovery evidence supplement](hermes-b24-recovery-supplement-v1.md) implements versioned
identity bridging and append-only later verification without rewriting the original
B21 REFUSED review or spent authorization. Recovery remains **BLOCKED** on missing
historical parent-fixture ownership; a present marker cannot recreate that proof.
No cleanup, barrier, grant or provider activation is authorized. One proposed owner
decision is an exact-identity recovery/adoption contract addressing that gap.
ADR-004 execution v13, native-risk v7, profile/registry v5, startup v2 and all six
false public flags remain unchanged. Earlier successor statements are historical.


RF-RUNTIME-005B23 [Windows startup environment](windows-startup-environment-v1.md)
derives SystemDrive from the verified local SYSTEMROOT, checks parent agreement, rejects
unresolved configured path tokens and binds the value/physical root into startup receipt
and policy v2. Every pre-spawn proof rechecks live Worker identity; task/API candidates
cannot override it. Profile/registry v5, owner attestation, native-risk v7 and ADR-004
execution authority v13 stay unchanged. B21 evidence, fixture, Writer/lease/spent remain
retained; its eight-entry attribution and recovery blockers are unchanged. No provider,
cleanup, barrier or new grant is authorized. One next proposed atom is B24: a versioned
append-only recovery-evidence contract with synthetic tests, without actual B21 cleanup
or activation. All six public flags remain false. Earlier outcomes and successor
statements below are historical.

RF-RUNTIME-005B22 [preserved-footprint diagnosis](hermes-b22-footprint-diagnosis-v1.md)
is complete with **BLOCKED attribution (8 unknown entries)**. All eight additions are
unchanged: five directories and three cache-shaped binaries under a literal unresolved
SystemDrive path. The Worker drops SystemDrive, but the creating process is unproven.
Independent system Node now passes the unchanged arithmetic test; the exact repair and
baseline are verified. B21 remains acceptance_failed and spent. Ordinary recovery is
blocked by identity serialization order and the original signed REFUSED verification; no
B21 evidence, fixture, lease or Writer was changed. One proposed owner action is B23: a
validated SystemDrive environment correction with synthetic tests, without provider
execution or cleanup. See the diagnosis for the separate recovery evidence requirements.
ADR-004 v13, profile/registry v5, native-risk v7 and all six false public flags remain
unchanged. Earlier outcomes and next-step statements below are historical.

RF-RUNTIME-005B20 [exact legacy B17 recovery](hermes-b20-legacy-recovery-v1.md) is **DONE**
under the explicit ADR-004 v12 owner exception. Exact application lease then
Writer were removed, each absence read back; B13/B14/B17 spent records retain
original bytes and physical identities. The private journal is complete, the
exception spent/disabled and the recovery barrier released. Seven bounded process
checks found no matching live process; missing historical identity proof remains
explicitly unavailable. Strict B19 recovery remains the default. B17 repair/test
acceptance stays BLOCKED. One proposed successor is a separately owner-authorized
B21 single new coding smoke; no activation follows automatically. Profile/registry
v5, native-risk reference v7 and all six false public flags remain unchanged.
Earlier pending-recovery and successor statements below are historical.

RF-RUNTIME-005B19 [root-scoped review and reconciliation v2](hermes-root-scoped-review-reconciliation-v2.md) is implemented and synthetically qualified. Ordinary safe coding paths are
acceptance scope, while protected paths remain blocked. Durable private evidence
precedes verification, terminal receipt, owned cleanup and lease/Writer release.
Future recovery requires a complete identity chain and separate explicit owner
authority. The real B17 legacy dry run refuses seven missing evidence requirements;
its Writer, application lease and all spent records remain unchanged. The sole
next owner action is a decision on a separately scoped legacy-only recovery
exception; no bypass or new run follows. ADR-004 is v11 for this policy amendment,
profile/registry stay v5, native-risk binding stays v7 and all six public flags
remain false. Earlier successor/version statements below are historical.

RF-RUNTIME-005B18 [source/synthetic diagnosis](hermes-b18-footprint-diagnosis-v1.md) is complete,
but real B17 root-cause attribution and lock-recovery proof remain **BLOCKED**.
Minimal repair/test and completed atomic replacement pass the unchanged footprint;
undeclared paths or byte-identical undeclared rewrites can trigger violations.
Loss of diagnostic evidence before fixture deletion is confirmed. The retained
Writer/lease match each other but lack the complete spent/process identity chain.
Both artifacts remain untouched. Only B19 root-scoped protected-path policy,
durable evidence ordering and guarded reconciliation are proposed; deletion needs
separate owner approval plus currently missing proof. ADR-004 stays v10, all six
public flags stay false, and no provider started in B18. Earlier next-atom
statements below are historical.

RF-RUNTIME-005B17 [one-shot coding smoke](hermes-b17-coding-smoke-v1.md) is **BLOCKED** after
one authorized provider start under ADR-004 v10. Root exit 0 was rejected by
native review (unexpected_changed_path); exact repair and independent test PASS
were not established. Genuine Job cleanup and owned fixture removal passed.
Separate post-result full installation readback passed without receipt changes.
Writer and one application lease remain held for reconciliation; all B13/B14/B17
authorizations are spent. All six public flags remain false. Exactly one proposed
successor is B18 source-only footprint diagnosis and reconciliation-plan
qualification, with no runtime/private mutation or new execution. Earlier
B16/no-launch/version-9 and successor statements below are historical.

RF-RUNTIME-005B16 [controlled rebuild and split attestation](hermes-controlled-rebuild-v1.md)
is **DONE**. The unchanged exact source pin now has a verified canonical venv
with 83 original distributions, no optional AWS closure, 23,653 immutable files
and 826 separately verified generated files. Profile v5 and the sealed Worker
environment deny lazy installation. Owner identity/confirmation/expiry, private
data and B13/B14 spent records are preserved. Staging/rollback cleanup and fresh
file-only admission passed. No Hermes/model run or new activation occurred.
ADR-004 execution decision remains v9 and all six public flags remain false.
Earlier next-step/lock/launch statements below are historical.

RF-RUNTIME-005B11 [native tool boundary](hermes-native-tool-boundary-v1.md) is
implemented under ADR-004 v7's explicit same-owner residual-risk acceptance.
Profile v4, typed coding authority, canonical workspace/Writer/application leases,
bounded footprint receipts and owned-only cleanup are qualified synthetically.
Detected violations block review/release; partial observation is not isolation.
Only fresh opaque local proof removes the native-tool blocker. All six flags
remain false and real launch remains denied; B12 is source/synthetic launch
qualification only. Earlier B10 pending-acceptance text below is historical.

RF-RUNTIME-005B10 [native tool qualification](hermes-native-tool-boundary-v1.md)
is source-only complete. Recommended roost-hermes-native-audited-coding-v1 is
**BLOCKED on one owner decision**: acceptance of the disclosed same-owner native
file/shell residual risk. Public write-root checks cover guarded file writes;
reads, shell/helpers, network effects and Windows path races are not contained.
B11 implementation is proposed only after that acceptance. ADR-004 remains v6;
no runtime/private changes, real launch or activation; all six flags stay false.

RF-RUNTIME-005B9 [practical attempt policy](hermes-practical-attempt-budget-v1.md)
is implemented under ADR-004 v6: the owner accepts unavailable physical counters
and hard token/cost enforcement for the supervised pilot. coding-small-v1 uses
24 logical turns, retry setting 2, an original deadline of at most 900 seconds,
Windows Job cleanup and no automatic restart. Receipts keep unknowns null and
exit 0 is only a candidate for independent review. This supersedes B8's required
pre-dispatch budget boundary and proposed source-only B9; its source findings
below remain historical evidence. Real launch and all six flags stay false.

RF-RUNTIME-005B8 [attempt/budget qualification](hermes-attempt-budget-contract-v1.md)
is source-only complete and **BLOCKED** for a coding pilot. One Roost attempt may
contain multiple controlled model/tool exchanges. Public max-turns is not a
physical-call cap; run-budget is advisory and quiet hides internal counters and
partial/exhaustion details. Selected coding-small-v1 requires a Worker pre-dispatch
budget boundary which this CLI does not expose. No runtime/private changes or
activation; all six flags remain false. B9 is proposed qualification only.

RF-RUNTIME-005B6 [public minimal startup contract](hermes-minimal-startup-contract-v1.md)
was NOT_SUPPORTED for strict minimal startup. B7 explicitly accepts local skills
sync/banner prefetch while keeping network updates disabled. Its implemented
Ready/input-bound startup receipt validates exact argv/environment/profile/task
tools and removes only the local startup/config blocker. Real Hermes launch is
still denied; B4 residual risks and all six false runtime gates remain intact.

RF-RUNTIME-005B5 [effective-config qualification](hermes-effective-config-qualification-v1.md)
is BLOCKED: exact-pin official loader observed all explicit overrides in an identical
synthetic profile, but intercepted import/read attempts, startup initialization and
unqualified tool/rotation consumers prevent full qualification. The private negative
receipt cannot discharge the pre-spawn config blocker; all six gates remain false.

RF-RUNTIME-005C adds [native Windows owned-job v1](windows-owned-process-job-v1.md):
atomic job assignment before resume, KILL_ON_JOB_CLOSE and zero-active-process
accounting, verified with native fixture trees, nested jobs and controller crashes.
Only a fresh in-process native receipt removes the local candidate's stop blocker;
API/config declarations do not. Hermes now targets that backend, Direct is unchanged,
and all six execution/pilot/live flags remain false. Earlier raw-process stop-gap
statements below are historical for this backend. Configuration/auth/tool/turn/
budget/lifecycle gates remain. RF-RUNTIME-005B3
[same-owner profile v1](hermes-same-owner-profile-v1.md) accepts the owner's existing
Codex CLI auth and supersedes the B2 external credential-guard recommendation.
A private secret-free profile and Ready-bound byte admission checks are prepared;
B4 now qualifies auth using the owner's explicit private attestation, bound to
profile/Ready and rechecked for drift/revocation/expiry. Installed CLI help does
not prove secret-free status output, so no status command was run. No stable
account ID is required; silent account switches and unreported session loss remain
residual risks. No credential store was accessed. Separate token storage or
Restricted Token/ACL sandboxing is not required; all six gates remain false.

Current transport amendment (RF-RUNTIME-005A):
[supervised quiet v1](hermes-supervised-quiet-v1.md) retains stable Hermes 0.21.2
and removes waiting for unreleased stream-json from the first pilot prerequisites.
Sealed stdin, bounded untrusted text and dirty-byte review evidence are implemented
synthetically. Native whole-tree stop/configuration remain blocked; all six
execution/pilot/live flags remain false. Earlier stream-only evidence is historical.

[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md), accepted in
RF-RUNTIME-002, sets the current first-agent target: Roost → Windows Local Worker
→ native Hermes Agent → Codex model via Codex OAuth/subscription, one canonical
application folder. Direct CLI is an alternative; Herdr is optional observability.
Roost/Worker retain all authority, workspace, one-writer, cleanup, secrets and
review/release boundaries. [Hermes CLI adapter v1](hermes-cli-launch-v1.md) is
implemented fail-closed; all execution/pilot/live gates remain false.
Windows Sandbox/Hyper-V/disposable VM prerequisites are rejected as disproportionate;
that qualification route is deferred. The ADR-001/003 material below is historical
for provider ordering and qualification, not the current pilot dependency chain.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md), accepted in
RF-CODEX-015, selects native Windows Codex App Server for the pilot. WSL2 is a
later separately qualified profile with no automatic fallback. The
[native preflight](direct-codex-native-artifact-preflight-v1.md) remains BLOCKED;
artifact, protocol and containment qualification do not follow from platform
acceptance. Direct Worker ownership and all false runtime gates remain intact.

ADR-003 version 2, approved in RF-CODEX-022, permits a
[one-off Windows qualification environment](direct-codex-disposable-windows-environment-v1.md).
Technology is unselected; setup/probe remain unauthorized. This is not a VM
requirement for ordinary agent tasks, and never grants changes to shared host state.

The [RF-HERMES-005 adapter specification v1](direct-codex-app-server-contract-v1.md)
defines the ADR-001 target and its closed test/evidence criteria. It is a future
contract with unresolved qualification decisions, not implemented runtime or
permission to replace registry v5.

[ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md), accepted in
RF-HERMES-004, sets the pilot target to Roost control plane/API → Local Worker →
directly Codex App Server. Hermes is optional outside enforcement; OpenShell is
optional isolation. This decision changes the target architecture only: the
implemented provider registry v5 and all disabled admission gates remain intact.

[Governed task clarification](governed-task-clarification.md) provides typed specialist conversation and deterministic receipt summaries without changing task authority.

Native completed-result handoff is governed by [typed work handoff](typed-work-handoff.md):
immutable source versions and exact recipient receipts, with no implied execution
or release authority.

This document defines how architecture decisions should be treated in the
repository.

## Purpose

The `docs/architecture/` folder is the canonical record of the application's
architecture knowledge. Its authority depends on project maturity: early
projects use it to grow owner thoughts into assumptions and candidate
architecture, while mature projects use approved entries as implementation
constraints.

It records:

- system boundaries
- ownership of data and state
- module and integration contracts
- deployment shape
- technology choices that are already decided
- architecturally important product decisions that future implementation must
  preserve
- owner notes, questions, and assumptions that still need to be promoted into
  approved architecture before implementation depends on them

Treat approved entries as implementation constraints, not as loose suggestions.
Treat exploratory entries as product and architecture input that must be
clarified, scoped, and verified before coding.

## Default Rule

- Build the application to match the approved architecture.
- Do not silently change architecture during implementation.
- Do not reinterpret unclear architecture in a way that expands scope.
- If implementation exposes a gap or mismatch, stop implementation and escalate
  before changing architectural direction.
- Prefer asking for a decision over shipping an incorrect workaround.

## What Agents May Do Without Re-Approving Architecture

- implement work that fits the documented boundaries
- add clarifying detail that does not change behavior or ownership
- document discovered inconsistencies
- propose follow-up tasks that improve implementation quality inside the
  approved architecture

## What Requires Explicit User Approval First

- changing module boundaries or service responsibilities
- moving source-of-truth ownership for data or state
- replacing an approved integration pattern with another one
- changing deployment topology or runtime shape
- changing a confirmed tech-stack decision that affects architecture
- introducing a new cross-cutting pattern that contradicts existing
  architecture docs

## Mandatory Decision Flow For Mismatches

When implementation does not fit approved architecture:

1. describe the mismatch clearly
2. propose 2 to 3 valid options with tradeoffs
3. wait for explicit user decision

Agents must not self-approve a workaround or architecture rewrite.

If there is a strong argument for a better design, the agent should present the
case in conversation first, including tradeoffs and why the current
architecture may be insufficient. The agent must not self-approve the change.

## Required Architecture Files

At minimum, keep these files aligned:

- `docs/architecture/system-architecture.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/process-core-workflow-core-architecture.md`
- `docs/architecture/business-ontology-import-strategy.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/company-os-definition-editing-contract.md`
- `docs/architecture/company-os-workflow-definition-command-contract.md`
- `docs/architecture/innovation-product-engineering.md`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/architecture/local-codex-agent-runtime.md`
- `docs/architecture/relationship-graph-audit-2026-05-14.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`

Projects may add more architecture docs or ADRs, but these baseline files
should always stay current.

## CompanyCore v1 Approved Direction

The accepted [autonomy activation contract](autonomy-activation-contract.md)
refines the future organizational and release model from the September 2026
owner interview. It explicitly separates that target from the implemented V1
baseline below. Its staged gates do not grant existing workers release authority
or authorize broad rewrites; preserve one canonical clone/runtime per application
and one writing task across the laptop.

The approved v1 direction is:

- API-first product foundation with a role-governed human web console
  ClickUp setup
- CompanyCore is the company operating system, not an embedded AI system;
  humans use web UI and AI agents use API/MCP as external clients
- PostgreSQL is the source of truth
- API is the supported access layer for agents, automations, future dashboards,
  and future mobile clients
- development bootstrap registration may create a workspace; Example Company
  production uses invitation-only membership in one canonical workspace
- business data, service API keys, integration settings, and integration sync
  state are workspace-scoped
- ClickUp is the first native integration adapter
- CompanyCore should evolve toward a ClickUp-shaped operating model:
  `Workspace -> Operating Area -> Operating Folder -> Operating Table ->
  Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`
- first-party business tables should be assigned to an approved operating area;
  `00. Glowny` is the non-removable fallback area for unclassified imports,
  followed by the 12 company departments, while users, memberships, API keys,
  integration settings, provider mappings, and platform metadata remain system
  tables
- shared company tools keep one canonical module and one record identity.
  Department overviews expose scoped previews that deep-link to those modules;
  the originating department travels as a filter and never creates a parallel
  task, file, project, goal, decision, procedure, or workforce store
- provider imports must expose an explicit existing-record policy before
  writing; ClickUp supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`, with deletes limited to
  provider-owned records in the selected scope
- n8n remains optional orchestration, not the required primary ClickUp path
- schema changes should move from `prisma db push` to controlled migrations
- tests and smoke checks must prove workspace scoping and integration sync
  behavior before v1 is considered stable
- full company dashboard and mobile app are v2 scope; mobile should follow the
  web product experience
- before V2 Company City, gamification, or native mobile app work, the product
  must finish the web/backend/MCP foundation described in
  `docs/architecture/web-and-mcp-foundation-before-v2.md`: workspace selection,
  operating-area/resource navigation, relationship/integration clarity, and
  MCP workspace-safe usability
- CompanyCore's long-term product architecture is an AI-first organizational
  operating system where vertical hierarchy and horizontal processes coexist.
  The accepted direction is recorded in
  `docs/architecture/organizational-architecture-bridge.md` and must guide
  future schema, MCP, web, mobile, Codex, governance, knowledge, KPI, and
  organizational graph work without bypassing scoped task contracts or existing
  Company OS boundaries.
- CompanyCore's unified organizational operating-system direction is recorded
  in `docs/architecture/unified-organizational-operating-system.md`. Humans
  and AI agents are both organizational workforce members in the target model:
  they can receive work, report progress, belong to departments, exist in a
  hierarchy, hold role/rank-derived permissions, use procedures, access
  resources, escalate issues, and communicate organizationally. This extends
  the current `users`, `agents`, `company_roles`, `business_functions`,
  `tasks`, workflow, approval, event, audit, API, and MCP foundations without
  authorizing a broad schema rewrite.
- CompanyCore should scale through model-level business modules recorded in
  `docs/architecture/companycore-business-module-map.md`. Future views and
  agent tools should derive from those modules and classify work as native
  core, provider-backed, future adapter, or derived view before adding schema,
  API, UI, or MCP surfaces.
- CompanyCore/Roost Process Core is recorded in
  `docs/architecture/process-core-workflow-core-architecture.md`. Pipelines,
  stages, transitions, workflow items, procedures, checklists, evidence logs,
  approval policies, blueprints, linked assets, and agent runtime contexts
  are shared system capabilities, not department-local screens. Future agents
  must preserve the boundary that Roost is the source of truth and local Codex
  Agent Hosts are supervised execution clients using the workspace-scoped API.
- Roost's approved Codex execution topology is recorded in
  `docs/architecture/local-codex-agent-runtime.md`. Production Roost and its
  private PostgreSQL database run on the VPS. Local Roost development uses a
  separate local PostgreSQL database. A Windows Agent Host makes outbound HTTPS
  calls to claim production work, runs Codex against explicitly mapped local
  repositories, and reports events/results to Roost. Codex and local backends
  never connect directly to production PostgreSQL; databases are not synced.
- Business ontology imports are governed by
  `docs/architecture/business-ontology-import-strategy.md`. APQC PCF,
  SIPOC, organization-chart CSV, role/ACL mapping, and one-page SOP templates
  are accepted as future input sources for process classification,
  responsibility ownership, workforce hierarchy, agent planning context, and
  validation. They must map into existing CompanyCore processes, roles,
  workforce, capabilities, approvals, knowledge, and audit foundations before
  new tables or autonomous authority are added.
- CompanyCore's global business flow is recorded in
  `docs/architecture/companycore-global-business-flow.md`. Future CRM,
  marketing, product/service delivery, finance, support, feedback, and
  improvement work should derive from the 13-stage value pipeline before
  adding runtime surfaces.
- Roost's application definition, Product Engineering, productization,
  capability, evidence, readiness, and agent-context domain is recorded in
  `docs/architecture/innovation-product-engineering.md`. `Application` is the
  shared product identity across Innovation and Products & Services; projects,
  tasks, processes, and procedures remain shared execution mechanisms.
- CompanyCore V1 department views should become department management systems
  as recorded in
  `docs/architecture/department-management-systems-architecture.md`. Each of
  the 13 areas is a scalable management system over shared tables, pipelines,
  tasks, knowledge, resources, metrics, decisions, governance, and AI/MCP
  tools, not a separate database or provider-led app.
- The V1 implementation blueprint for the 12 operating department systems and
  `00 Main` orchestration is recorded in
  `docs/architecture/department-management-systems-v1-blueprint.md`. Future
  department web/backend work should use that document to define each
  department's purpose, subsystems, shared backend reuse, backend gaps, agent
  packet, safe actions, and recommended implementation order before coding.

## Implementation Contract

Native owner-reserved and ordinary delegated Decisions use the existing Decision,
workforce and department relations under the
[RF-CTX-018 contract](delegated-decision-authority.md). There is no parallel company
hierarchy, semantic classifier or authority inferred from job-title prose.

Before architecture-impacting work is marked complete, confirm:

- the task still fits the approved architecture
- any deviation was explicitly approved
- the architecture docs and implementation remain synchronized
- no workaround path was introduced to bypass architecture constraints
- existing mechanisms were reused before proposing new structures
