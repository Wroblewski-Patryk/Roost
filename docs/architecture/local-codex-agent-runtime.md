# Local Codex Agent Runtime

Owner amendment v73: [public proof authority persistence](bootstrap-proof-persistence-v1.md)
adds four SQL-owned public children and explicit same-Db ports; migration 86 is
UNAPPLIED, migrations 1–85 and Prisma schema unchanged. Catalogs pin 19 functions,
59 triggers and 18 FKs. SERIALIZABLE writes require separate READ ONLY committed
row/Event/receipt readback; uncertainty never retries. New mocked suite 33/33,
selected source 106/106, build/lint/four pins PASS. Ticket-v3/seal links remain
deliberately denied; no private/signing, DB/Docker/network, delivery or activation.
RF-HOST-035 PARTIAL, native/production authority BLOCKED; all eight flags false,
registration UNKNOWN / MONITORED RESIDUAL RISK. Exactly one next recommendation,
not started: native qualification of the final 86-migration chain, including
numeric fence compatibility and intentional v3 denial. Earlier entries are historical.

Owner amendment v54: [native attestation qualification](decision-attestation-prisma-ports-v1.md)
remains **BLOCKED**: final native 14/19 PASS, 5 FAIL (four subtests plus parent),
runner exit 1; cleanup independently PASS. One owned disposable database applied
all 83 unchanged migrations, then was removed. Existing data fingerprints and
container inventory match; Soar unchanged. Native attestation/terminal concurrency
and COMMIT/readback cases passed, but attempt seal failed. Native JSONB grant
hash validation is fixed; lifecycle timestamp correction has source evidence only.
A shared-fence compatibility conflict with the existing lifecycle still requires
repair. Final source tests 194/194, build/lint PASS. No production qualification,
default composition, push/deploy or activation; RF-HOST-035 PARTIAL,
signed_current_decision_unavailable unchanged and all eight flags false.
Exactly one next recommendation, not started: separately authorize the bounded
migration-83/lifecycle fence compatibility repair and a fresh complete native run.
The v53 and earlier recommendations below are historical.

Owner amendment v53: [concrete Prisma attestation ports](decision-attestation-prisma-ports-v1.md)
pass 14/14 focused and 187/187 selected source/mocked tests; build/lint pass.
Implemented on injected transaction clients: canonical rows,
constrained child inserts, atomic existing-attempt lifecycle seal and separate
READ ONLY post-COMMIT exact receipt readback. The synthetic journal oracle is
not substituted for database history. Policy/evidence must be explicit in the
accepted revision; missing/legacy data denies. All 83 migrations and Prisma
schema are unchanged; migration 83 remains UNAPPLIED. No DB/Docker, signing,
endpoint, default composition, delivery or activation. RF-HOST-035 PARTIAL;
signed_current_decision_unavailable and production BLOCKED, all eight flags false.
Exactly one next atom: separately authorized native qualification in an owned
throwaway PostgreSQL database with public synthetic records and signer doubles.
Not started. Earlier next-atom recommendations are historical.

Owner amendment v26: [loopback HTTPS handoff adapter](worker-handoff-https-v1.md)
passes 9/9 real HTTPS results and 189/189 selected tests. Its sole client surface
is request/poll/ACK/status with exact origin, normal TLS and certificate DER pin;
owner approval stays independent. Lost delivery never retries; recovery requires
new enrollment and owner decision. Certificates are ephemeral/in-memory and
cleanup leaves no sockets, servers or key files. Production TLS/DNS/certificate
provisioning, secret storage and execution remain BLOCKED; six flags false.
One next atom: source-only production HTTPS/DNS/certificate admission contract
and synthetic denials, including exact installation/host/owner and epoch rollback.
Earlier amendments and successor proposals below are historical.

Owner amendment v25 — native Worker handoff qualification

[Handoff qualification](worker-credential-lifecycle-v1.md) is **DONE** for the
unchanged 76-migration chain and native Prisma/loopback HTTP boundary: 9/9 results,
180/180 regressions. Twenty polls disclose once; twenty ACKs activate once.
Lost-response recovery and complete rollback retain one current credential.
No Worker/provider/model executes; six flags false and default routes closed.
HTTPS origin/certificate evidence remains synthetic. Exactly one next atom:
loopback HTTPS transport-adapter qualification with ephemeral test certificates
and synthetic credentials; no real provisioning, secret store or activation.
Earlier amendments and their successor proposals below are historical.

Owner amendment v24: [synthetic Worker credential handoff](worker-credential-lifecycle-v1.md)
qualifies a device request, exact owner approval, origin/certificate checks,
one-time poll, possession ack, lost-response terminal state and concurrent
recovery in 7/7 tests. Device requests and user codes have no task/provider
authority; default handoff routes remain unavailable. Raw secrets are transient
only, while pending credentials stay inactive until ack. The new additive
migration, native persistence and real HTTPS/TLS remain unqualified; no Worker,
provider, model or activation. The v23 database result below is historical.

Owner amendment v23: [native credential lifecycle qualification](worker-credential-lifecycle-v1.md)
passes 12/12 PostgreSQL/HTTP results and 173/173 regressions. Bound claim checks
run inside the Ready transaction; real consume/status race credential revocation.
Rotations/revocations invalidate unused tickets and active claim context atomically,
retain original attempt/checkpoint/lease identity and permit no automatic restart.
Failure after actual writes or a rejected native audit restores all prior authority.
The chain of 75 migrations is qualified after repairing syntax in the previously
unapplied last migration; cleanup/preservation PASS. Real credential delivery,
TLS and Worker/provider launch remain blocked; no process or activation, six flags
false. Earlier qualification states and next-step proposals are historical.

Owner amendment v22: [Worker credential lifecycle](worker-credential-lifecycle-v1.md)
adds source-only primary-owner enrollment/rotation/revocation and a synthetic
delivery seam, unavailable in application composition. Bound credentials permit
only claim, ticket consume and ticket status; claim rereads the exact current
generation and host inside the Ready transaction. Rotation/revocation fence old
tickets and active claims while preserving attempt/checkpoint/lease identity for
explicit reconciliation. No automatic restart or launch authority is introduced.
173 synthetic tests pass; the new migration/native invalidation remain unqualified.
Real provisioning/transport/launch stay blocked and all six flags stay false.
The database evidence and proposed next steps below are historical.

Owner amendment v21: [Worker ticket database qualification](worker-owner-ticket-channel-v1.md)
uses real PostgreSQL/Prisma/auth/HTTP redaction with inert claimed executions and
synthetic credentials, signer and physical evidence. Assigned-Worker consumption
shares the owner's one-use transaction; status is observational even on blocked
input. No Worker/provider process, receipt or activation is introduced. Production
composition and credential provisioning remain unavailable; six flags false.
The earlier qualification results below are historical.

Owner amendment v20: [Worker ticket channel](worker-owner-ticket-channel-v1.md)
uses an existing API key only when explicitly bound to installation/host and the
original ticket claim. Worker may consume/read status; owner-only operations
remain separate. Status never signs, renews or launches. 102 synthetic tests pass;
new PostgreSQL persistence/guards and real transport remain unqualified. No Worker
process ran, default composition stays unavailable, six flags false.

Owner amendment v19: [PostgreSQL ticket qualification](server-owner-ticket-v1.md)
passes native owner authentication, decision/Ready integration, concurrent
one-use consume and rollback with a synthetic signer/evidence adapter.
No Worker or provider ran; the execution claim is an inert database fixture.
All four production ticket routes remain uncomposed, recovery remains
nonrenewable and six flags stay false. Cleanup/environment comparison PASS.
Earlier amendment results below are historical.

Owner amendment v18: [owner-ticket implementation](server-owner-ticket-v1.md)
adds owner-only issue/consume/revoke/rotate service handlers and a Serializable
Prisma adapter. The application supplies no signer/evidence composition, so all
four routes remain unavailable. Consume cannot launch work or renew an attempt;
recovery/retry explicitly reject ticket-bound executions. Synthetic tests pass;
real database/native-context qualification remains BLOCKED by absent Docker.
PARTIAL, six flags false; transport and Worker consumption are still future work.

Owner amendment v17:
[server owner-ticket contract](server-owner-ticket-v1.md) selects the existing
Roost API as issuer, leaving Worker only public verification material and short
signed decisions. Local writable keys cannot become production trust roots.
A validator-only source contract is implemented; origin/bootstrap, authenticated
fresh state, server consume CAS and admission wiring remain BLOCKED. No issuer
or provider was activated; all six flags remain false.

Owner amendment v16:
[managed-Hermes backend contract](managed-hermes-backend-admission-v1.md) adds
explicit source/synthetic Codex Responses and loopback Ollama selection to the
existing input/pilot/launch contracts. No new provider, router or launcher.
Auth/model/profile/task drift and unavailability stop the attempt without
fallback; real command projection denies. Fixture validation is DONE; real
issuer BLOCKED, six flags false. CLI inventory is not a dependency. Safe private
anchor provisioning and managed-model evidence still need real qualification.

Owner amendment v15, 2026-09-23: managed Hermes is the only task orchestration
layer after Windows Local Worker. Its explicit target backends are Codex
OAuth/Responses (allowlisted model >=5.6 plus reasoning) and local Ollama
(exact model/digest, separate managed profile). Direct CLI is disabled
diagnostic/emergency reference only, without pilot authority or fallback.
[Static CLI inventory and source evidence](codex-static-inventory-v1.md) do not
qualify or gate the selected Hermes transport. Signed direct decisions and
final direct dispatch deny; no routing or real launch was added. Six flags
remain false. This is the current authority over historical ordering below.

RF-HOST-035 owner amendment v14 (2026-09-23):
[trusted provider pilot](trusted-provider-pilot-v1.md) replaces full OS isolation
as a prerequisite for exactly pinned Codex/managed local Hermes with explicit
private acceptance of Windows-account residual risk. Fixture policy admission
is implemented in the existing containment boundary; real providers remain
blocked by missing genuine runtime/model/launch authority and independent gates.
One Writer, Job, Ready, budget, checkpoint, recovery/review and release rules
remain. No provider was started and all six public flags remain false.

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

RF-RUNTIME-005A replaces the first supervised pilot's stream-only candidate with
[quiet v1](hermes-supervised-quiet-v1.md): stable 0.21.2, explicit approved
model/reasoning, one sealed stdin input and no Worker retry/fallback. Quiet output
is untrusted text with no tool/usage telemetry; independent review binds captured
dirty bytes. Native taskkill is not owned-tree proof and always blocks this
collector. No private configuration/model was used; all six runtime flags remain
false. The JSONL adapter history below is superseded only for this supervised scope.

Current direction: [ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md)
accepts Windows Local Worker → native Hermes → Codex OAuth/model as the first
runtime; direct Codex CLI is an alternative, Herdr optional UX. One canonical
folder, Ready, lease, one writer, secret isolation and cleanup/review/release
gates remain. No VM/Windows Sandbox/Hyper-V prerequisite; their route is deferred.
[Launch contract v1](hermes-cli-launch-v1.md) adds shared provider dispatch,
Hermes candidate validation and a synthetic public JSONL decoder. Hermes launch
fails closed before spawn; direct CLI behavior and existing admission guards are
preserved. No private instance, OAuth or pilot was started. Earlier provider
ordering below records superseded decisions; retained runtime controls still apply.

[RF-CODEX-015 / ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md)
records owner acceptance of Windows Worker → native Windows x64 Codex App Server
for the pilot. WSL2 is deferred as a separate profile without automatic fallback.
The [native artifact preflight](direct-codex-native-artifact-preflight-v1.md)
adds offline Windows signature/catalog evidence but leaves launch closure,
build/wire, auth, sandbox and whole-tree stop unqualified. The older WSL profile
below is historical; no runtime/registry change or activation occurred.

RF-CODEX-022 / ADR-003 version 2 accepts a
[one-off isolated Windows environment](direct-codex-disposable-windows-environment-v1.md)
for infrastructure/schema qualification only, not every agent task. All resources
must be owned, bounded and removed with before/after proof; shared host state is
untouchable. Technology, setup and probe admission remain unresolved/disabled.

[RF-HERMES-007 / ADR-002](../decisions/ADR-002-codex-qualification-owner-decisions.md)
resolves I01 owner policy: technical systems choose measured task limits;
Codex access uses only the official local logged-in account through a proven
isolated channel, with reference/state-only storage in Roost. Later bounded
no-model evidence work needs its exact task contract. No probe or execution is
authorized here; all technical blockers and false admission gates remain.

[RF-HERMES-006](direct-codex-qualification-decisions-v1.md) closes only the profile/
receipt document schema (D07); D01–D06 and independent qualification remain blocked.
The historical Windows/WSL2 candidate was described without installation or execution. Long
tasks require explicit finite budgets within the existing range; RF002 timing
limits and external account-usage rules are not production Worker defaults.

[RF-HERMES-005 contract v1](direct-codex-app-server-contract-v1.md) specifies the
future direct App Server adapter with a [closed acceptance matrix](direct-codex-app-server-acceptance-v1.md).
It preserves ephemeral one-turn execution and pre-spawn-only automatic recovery;
it does not implement persistent Codex session resume after laptop shutdown.
Six blocked profile decisions and missing independent proof prevent implementation admission; all production
gates and the implemented supervised CLI baseline below remain unchanged.

[RF-HERMES-004 / ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md)
accepts the pilot target Roost control plane/API → Local Worker → directly Codex
App Server. Hermes is optional outside authority/policy/budget/admission/stop
enforcement; OpenShell is optional isolation. executionSupported=false,
pilotReady=false and liveAdmissionAllowed=false remain unchanged.

[RF-HERMES-003](hermes-clean-transport-api.md) finds no complete clean public
transport API in the pinned Hermes release. Five helper imports are clean; the
connection/session imports still trigger configuration/provider discovery and
denied mkdir. Its recommendation is resolved by ADR-001; the audit remains dated
evidence and does not qualify a production adapter or change admission behavior.

[RF-HERMES-002](../operations/hermes-linux-synthetic-transport.md) verifies a pinned
private Linux installation and an independent bounded Worker transport. Hermes
integration remains blocked by public-session import side effects; no session
turn, model or production runner was enabled. Synthetic process-group proof is
not filesystem/network isolation, real App Server compatibility or pilot admission.

[RF-HERMES-001](hermes-codex-isolation-assessment.md) distinguishes the Hermes
model provider from its optional Codex App Server runtime. Native Codex command
sandboxing is a candidate boundary; OpenShell is not an established prerequisite.
This static assessment leaves provider, output and host-lifecycle admission closed.

[Adopt-before-build and implemented provider contract v5](adopt-before-build.md)
still describe the existing CLI reference and blocked Hermes diagnostics. The
new direct App Server adapter is not implemented, and the RF-HERMES-002 wrapper
is not approved for production. Hermes compatibility is no longer a pilot
prerequisite under ADR-001; all existing task admission denials remain active.
Neither host metadata nor the execution environment flag grants pilot admission.

An [offline examination of the pinned Hermes transport](../operations/hermes-windows-attestation.md#offline-transport-examination-adapter-blocked)
reproduced missing byte and process-tree fences with a fake App Server. It does
not deliver a production adapter or alter this host's spawn/recovery path.

[Material unknown interviews](material-unknown-interviews.md) bind short question blocks to exact human decisions, immutable proposals and dependency-specific Ready fences. Resolution requires fresh Submit and never revives old dependent-operation grants.

[Governed task clarification](governed-task-clarification.md) provides typed specialist conversation and deterministic receipt summaries without changing task authority.

[Typed work handoff](typed-work-handoff.md) records exact recipient acceptance
of a pinned completed result without authorizing review, release or execution.

[Versioned procedure composition](versioned-procedure-composition.md) binds the base,
application extension and risk requirements to the same Ready/execution seal.

[Native task risk assessment](native-task-risk.md) binds the prepared scope and joint
impact to Ready, execution admission and task capability grants. Classification
is followed by [level-specific native admission](native-risk-admission.md); neither activates execution.

[Native serious-incident suspension](native-capability-suspension.md) fences exact
capabilities and reuses the context-stop/recovery boundary. Owner intervention
requires reread/replan and never undoes external changes.

## Current Supervised Runtime

[RF-HOST-035 host lifecycle safety](../operations/host-lifecycle-safety.md)
adds an independent Worker/API denial before recovery, lock, claim and spawn:
current providers lack a complete admitted launch chain. The
[trusted pilot amendment](trusted-provider-pilot-v1.md) accepts OS residual risk
for two exact trusted classes but does not qualify their missing runtime/model
and launch evidence. Health and maintenance decisions cannot override admission. Non-retryable maintenance
failures retain checkpoints and the writer lock; there is no automatic repair.


The [native content redaction gate](native-runtime-redaction.md) applies before
model dispatch, diagnostics and checkpoint persistence in the API and host.
`native_runtime_redaction_v1` is required for supervised admission. Sensitive
required content blocks; incidents contain no detected values.

Supervised Codex execution is currently blocked by the
[hard output-token admission gate](execution-packet-contract.md#hard-output-token-admission-rf-host-010):
the installed CLI has no proven execution-wide output cap. Even a valid accepted
budget cannot authorize spawn. This is independent of the production disabled flag.

The Windows login host also supports `executionMode: "observe"`. This mode
branches before recovery, writer locking and repository validation into a
separate registration/heartbeat loop. It cannot claim/recover executions or
spawn Codex, even when the API execution flag is enabled. Its application
mapping is advertised as **declared only**, not verified runnable readiness.
It advertises observer/heartbeat capabilities, host version and mode; the API
returns workspace-scoped runtime readiness in register/heartbeat responses.
Both host listings and readiness project an expired heartbeat as offline after
60 seconds. See the [Windows observer runbook](../operations/local-codex-agent-host.md#observer-login-autostart).

Native review commands support [per-agent credential bindings](agent-credential-principal.md)
and require [exact task capability grants](task-capability-grants.md) for agent writes.
Grants authorize only the three native review/manager operations and never activate execution.
These keys do not authorize the host protocol or activate executions. The host
credential below retains its separate integration role.

The canonical login launcher uses a dedicated `mcp_codex_worker` credential in
Windows Credential Manager for the current user. Key creation and activation/
revocation commit a secret-free event atomically with the key mutation. Raw key
material is returned only at creation and never included in audit events.

Task Scheduler enters through a locally compiled Windows GUI executable, which
creates PowerShell with `CreateNoWindow=true`/`UseShellExecute=false`; PowerShell
starts Node the same way. This prevents console creation before script-level
window settings take effect. The GUI launcher waits and forwards the child's
exit code to preserve automatic restart. The same interactive identity, limited
privileges, launcher mutex, singleton port and Credential Manager path remain
in effect. Installation updates one canonical task/binary and restores a running
observer after an action/binary change; unchanged reinstall does not restart it.

This document describes the implemented supervised baseline. The accepted
[autonomy activation contract](autonomy-activation-contract.md) defines the
future model and evidence gates. Its autonomous release target does not change
this host's current authority or turn an execution report into task delivery.

Roost uses a split runtime:

```text
Owner browser
    |
    v
Roost web/API on VPS ---> private PostgreSQL on VPS
    ^
    | HTTPS + workspace-scoped API key (outbound from laptop)
    |
Local Codex Agent Host on Windows ---> local application repositories

Local Roost development ---> local Roost API ---> local PostgreSQL
```

The operator selects an absolute Windows application workspace in the private
Agent Host configuration, for example `C:\Workspaces`. Drive roots and relative
paths are rejected; the repository does not prescribe a machine-specific path.

Every runnable repository must be a direct physical child of the configured root.
The Agent Host rejects paths outside that root, nested paths, `..` traversal,
symlinks/junctions, a mismatched Git toplevel, and a mismatched `origin` URL.
Future applications may be added only by creating their repository directly
under this root and explicitly adding their slug, directory, canonical origin,
and deployment URL to the local allowlist.

The allowlist rejects duplicate directories (case-insensitively on the Windows
host) and duplicate normalized origins. Before using a claimed application's
directory, the host requires its ID to match the execution's application ID and
its primary repository to match the local origin. A single repository needs no
primary flag; multiple repositories require exactly one primary. Missing or
ambiguous identity fails before reading execution context or starting Codex.
Roost is excluded from the managed portfolio and cannot be an Agent Host execution target. The host rejects its slug, directory and canonical origin.

The production database is private to the VPS deployment. Neither Codex nor a
local development server connects directly to it. Local development uses a
separate local PostgreSQL database. Production work is exchanged through the
workspace-scoped Roost HTTP API.

This topology keeps code execution where the repositories and Codex login
already exist, while the owner-visible task queue, execution history, and
evidence remain available in Roost on the VPS.

Workspace administrators configure this boundary from `Workspace settings ->
Agent connections`. The panel mirrors the public API base URL, local STDIO MCP
bridge configuration, separate key profiles, approved Windows workspace root,
Agent Host heartbeat, and foundation/execution mode. It never returns an
existing raw key. The `06 People / Agents -> Agent activity` workbench combines
Codex execution events with provider-neutral agent logs and refreshes while
visible.

## Ownership

- Roost owns task intent, application/repository metadata, authorization,
  execution leases, events, cancellation state, results, and evidence.
- PostgreSQL owns durable Roost state in each environment. Development and
  production databases are independent; schema moves through migrations, not
  database synchronization.
- The local Agent Host owns only temporary polling/process state and the mapping
  from an application slug to a local repository path.
- Codex owns the interactive coding session. The configured `workspace-write`
  mode targets command writes to the selected repository; extra/temporary roots,
  outside reads, provider state and external tools need independent qualification.
  This is not proof that the whole process accesses only that repository.
- Git remains the source of truth for source-code transfer. The Agent Host does
  not commit, push, deploy, or publish.

## Execution Flow

1. The owner creates a normal Roost task linked through its project to exactly
   one application.
2. A human owner/admin/member opens **Prepare execution** in the task workbench
   (or **Save and prepare execution** in Operations), reviews the contract and
   invokes **Submit for execution / Przekaż do wykonania**. This is the only
   versioned, idempotent Ready command, shared with the runtime API. Draft and
   Needs context/decision are durable nonexecuting states. Creation, assignment,
   ordinary edits, old API writes and imports cannot bypass it. Viewers and API
   keys cannot accept the contract.
   Successful validation pins [Ready context](execution-packet-contract.md#accepted-context-at-ready-rf-ctx-006)
   on the existing task. The owner can then queue an execution from the task
   workbench or API. Missing/changed Ready blocks queue and claim. Accepted source
   writes now invalidate Ready in the same database transaction via persisted
   source watches and the shared source/admission fence. The owner can inspect
   changed sources; a reverted edit still requires explicit acceptance again.
3. A Windows Agent Host registers for visibility, confirms protocol admission,
   then inspects pending executions and local ownership through
   [safe recovery](agent-host-recovery.md). Registration grants no writer slot.
4. The host atomically claims one compatible queued execution with a short
   renewable lease.
5. The host fetches current task/application context with the execution-bound
   [versioned packet](execution-packet-contract.md), confirms its lease and
   validates completeness and consistency before execution-specific processes.
   It pins both resolved contexts in the existing checkpoint, checks the local
   repository and seals the bounded `roost-provider-input-v1` envelope. Both
   adapters receive the same canonical input, with provenance, exact model/effort
   and no mandatory startup tools. The existing Direct launcher consumes this
   envelope once; Hermes launch remains blocked. Worker rechecks path/origin,
   branch/commit, then fetches and validates both contexts again immediately before
   `codex exec --json --sandbox workspace-write -`. Changed context prevents
   spawn and requires reconciliation/replanning; recovery compares the same pin.
   A final lease refresh observes the active stop fence; synchronous Ready/risk,
   lease/duration/output/protocol checks guard envelope consumption and spawn.
   Changed or substituted input cannot silently refresh the active session.
   Missing contracts fail with
   owner-visible field diagnostics; they do not start Codex.
6. Heartbeats renew the lease. Structured Codex progress becomes execution
   events visible in Roost. An owner cancellation stops the local process.
   Accepted-source invalidation also durably fences active attempts. The host
   observes it at checkpoints, runner boundaries or heartbeat, stops the process
   tree once and retains ownership for owner reconciliation. Late progress or
   completion cannot renew authority; see the
   [active stop contract](execution-packet-contract.md#active-work-after-accepted-context-changes-rf-ctx-006).
7. The host reports the final response, changed paths, verification commands,
   usage, or a structured failure. Roost stores completion evidence linked to
   the task. The task remains open for [native result review and manager correction
   return](task-review-workflow.md). A review decision binds a reported material
   version and never grants delivery or release authority.

## Security Boundaries

- Only outbound HTTPS from the laptop to the public Roost API is required. No
  inbound port, VPN, shared filesystem, or database tunnel is required.
- The Agent Host uses the `mcp_codex_worker` key profile. It can claim and report
  execution work and read the bounded task/application context; it cannot
  create keys, administer integrations, commit code, or deploy.
- The Roost API key stays in the host process environment. It is removed from
  the child Codex environment and must never be placed in a repository, prompt,
  task description, config JSON, output, or log.
- Repository paths are selected only from the local, secret-free mapping. A
  remote task cannot provide an arbitrary filesystem path.
- The mapping stores a direct-child directory name rather than an arbitrary
  path. It is validated at host startup and again before every execution.
- Non-interactive Codex runs use `--ephemeral` so automated session rollout
  files are not persisted outside the approved project workspace.
- The local configuration must select `workspace-write` (also the default).
  Startup and pre-execution validation reject other sandbox values; free-form
  task, plan or role claims cannot override this configured execution boundary.
- Workspaces scope hosts, queues, leases, events, and results. Lease tokens
  prevent another host from updating a claimed execution.
- Production PostgreSQL is never exposed publicly and is never used by a local
  Roost backend.

## Failure And Recovery

### Transport retry versus execution retry (RF-HOST-010/011)

The built-in `openai` provider may perform its bounded internal HTTP/SSE retries.
Worker does not override the reserved `model_providers.openai` configuration.
Those transport operations remain inside the same CLI process, logical turn,
Roost execution/attempt and immutable `roost-provider-input-v1` envelope. They
do not consume another envelope or reset its revisions, deadline, lease or budget.
All transport waiting counts against the original duration; only the existing
Roost heartbeat can confirm still-current lease/context authority, never a
provider response or reconnection message.

One invocation supplies stdin once. A terminal `turn.failed`, nonzero exit,
second logical turn/completion, or missing final turn/result fails the attempt
as non-retryable and stops this host execution path after process-tree cleanup.
Worker neither restarts CLI, selects another provider nor increases the budget.
A nonterminal CLI diagnostic is not a new turn and grants no authority. Explicit
future work remains governed by the existing queue and independent budget review.

The current exec JSONL stream does not expose an authoritative transport retry
counter. Completion/failure accounting therefore reports `transportRetryCount:
null`, never inferred zero. Final reported usage belongs to this one attempt;
`usageAccounting: reported_final_only` does not establish the cost of partial or
undelivered responses (`partialUsageAccounting: unknown`). No exporter, OTel or
external telemetry is enabled. RF-HOST-010 hard output/cost enforcement and the
general RF-HOST-011 loop breaker remain open. A narrowly approved synthetic live
proof cannot relax production's output-budget admission.

This clarifies transport ownership and tightens local Worker terminal-result
validation. It does not change API/DB commands, packet/registry contract v4,
host protocol v1 or `worker_provider_input_v1`; the existing metadata/details
maps carry optional accounting. No new retry engine or shared admission version
is needed. Regression evidence: `test:agent-transport`, existing duration, lease,
recovery and process-context suites.

The [recovery contract](agent-host-recovery.md) supports the same execution/attempt
only from matching durable `claimed`/`prepared` checkpoints with valid authority.
Later stages, expired leases and ambiguous state stop with owner-visible
diagnostics. The host acquires the machine-wide writer slot after protocol admission and before claims, and processes
executions sequentially. An expired API lease does not prove that the old process
stopped. The host
renews before launch, uses bounded API requests, and stops the Windows child
process tree on cancellation, rejected authority or expiry of its last confirmed
lease (with a five-second stop margin). A late response cannot revive authority.
The host stops polling after lease loss and never reports that execution as a
success. Its writer lock remains after lease loss or unconfirmed tree termination;
manual reconciliation is required before restart. These controls cannot guarantee
termination during an OS freeze or coordinate tools bypassing the host entrypoint.
Do not activate autonomous writing based on lease expiry alone.

The [packet duration limit](execution-packet-contract.md#hard-duration-limit)
independently stops work five seconds before `maxDurationSeconds` elapses from
the original server `startedAt`. Healthy heartbeats and pre-spawn recovery do
not reset it. Expired or invalid duration context prevents launch/completion,
stops new claims, reports a non-retryable failure when possible and retains the
writer lock for reconciliation. Output-token admission now fails closed until an
enforcing runner is proven. Cost enforcement and independent approval of a
replacement budget remain separate gates. Observe mode does not run this timer.

The supported Windows host uses exclusive creation of
`C:\ProgramData\Roost\agent-host-writer.lock`, independent of application slug,
workspace or host key. It is secret-free process/recovery state outside application
repositories. A second compatible host may register a heartbeat but fails before claiming work. Normal
shutdown releases only the lock owned by that process. A crash, empty/corrupted
lock or uncertain execution does not trigger automatic stale-lock removal: old
Codex descendants may still be running. Recovery can reclaim only a matched
pre-spawn checkpoint from a confirmed dead owner under the exclusive recovery
gate; neither PID nor age alone is sufficient. The state directory must be a physical
directory writable only by the trusted host operator; permission failures stop
startup. The CLI configuration cannot choose another lock location.

- Expired `claimed` or `running` leases retain their execution and host identity;
  they require reconciliation and are never automatically put back in the queue.
- Failed and cancelled executions are immutable history. Retry creates a new
  execution linked to the same task and application.
- A disabled host cannot register heartbeats or claim work.
- The owner can cancel queued work immediately. Active cancellation is observed
  on the next heartbeat and acknowledged by the host.

## Host/API Protocol Admission (RF-HOST-014)

The single wire declaration is
[`host-protocol.json`](../../src/modules/agent-runtime/host-protocol.json), shared
by API and host. `runnerVersion` remains a diagnostic build label, not admission.
Existing `metadata.protocolVersion` advertises numeric version `1`,
`metadata.executionMode` explicitly declares `supervised` or `observe`, and
existing `capabilities` advertises implemented controls. Protocol metadata uses
the existing host table without a separate version registry.

Both capability lists include `worker_provider_input_v1`, `ready_context_pin_v1`,
`output_budget_fail_closed_v1`, `active_context_stop_v1`, `single_task_scope_v1`
`task_role_separation_v1`, `native_runtime_redaction_v1`,
`native_risk_admission_v1`, `procedure_composition_v1` and
`typed_result_revision_v1` while protocol version
stays `1`. A host without
these controls cannot claim from the new API; a new host cannot run against an
API missing any capability. The separate Ready and active-stop contracts add
their task/execution fields, migrations and scoped endpoints, documented above.

Register/heartbeat, host listings and readiness expose `runtime.protocol` (or
root `protocol` for readiness): `version`, `apiCapabilities` and
`requiredHostCapabilities`. Per-host `runtime.compatibility` contains
`compatible`, a fixed `reason` and `missingCapabilities`. Missing, malformed,
older or newer versions are rejected without downgrade. Extra API capabilities
are tolerated, but every baseline capability must exist; an unknown required
host capability blocks the host.

The host checks the API declaration and positive acknowledgement before recovery
inspection, writer acquisition, each claim, recovery lease rotation, context
preparation and final pre-spawn context reads. Final synchronous protocol,
lease and duration assertions precede spawn. Disabled or unknown runtime state
also blocks work. A blocked process continues registration/heartbeat without
writer acquisition, recovery or claim. Blocking after a claim reports failure
when authorized, retains ownership and enters heartbeat-only reconciliation
until operator restart; restoring compatibility cannot replay that execution.

Independently, API recovery inspection, recovery lease rotation and claim check
stored host mode/version/capabilities plus the current request headers
`X-Roost-Host-Protocol` and comma-separated `X-Roost-Host-Capabilities`.
Legacy requests cannot borrow a newer process's stored declaration for the same
host slug. Rejection returns 409 `agent_host_protocol_blocked` with fixed
reasons, without changing attempts, checkpoints or leases. Unknown host returns
404. Lease/terminal reporting remains available for safe stop.
`executionEnabled=true` never bypasses admission.

Observer advertises only observer/heartbeat capabilities and never enters
supervised code. Missing/mismatched API protocol is recorded while online.
Online means recent heartbeat, not runnable readiness. Settings -> Agent
connections shows admission separately from heartbeat and runtime mode.
Server-derived reasons and allowlisted host-reported API/reconciliation reasons
are secret-free; client diagnostics cannot grant authority.

This is a declared compatibility contract, not binary attestation or an
authorization replacement. It does not lock deployments between the final
response and spawn, invalidate running work, coordinate backend/UI/schema
releases, drain/migrate/rollback, or update binaries. RF-HOST-014 remains partial.
Production stays disabled/observe.

## Activation Gate

Production deploys in `foundation_only` mode by default. Unless
`ROOST_CODEX_EXECUTION_ENABLED=true` is explicitly configured, Roost rejects
new execution requests and the Agent Host claim endpoint returns no work. The
database may contain applications, delivery projects, repositories, paused
trigger definitions, and historical executions while execution remains off.

Existing installations may retain the former seed's `task_ready_for_codex`
trigger and automation rule. Minimal installation bootstrap neither creates nor
resets these definitions. They document the future event boundary and may only
emit a `codex_execution_candidate` proposal; they do not create tasks or agent
executions. Activation requires a reviewed automation command contract, local
allowlist validation, a scoped worker key, a running Windows host, and one
explicitly approved non-critical trial.
- Production deployment and local host rollout are separate. Deploy the
  migration/API/web first, then start the laptop host with its production key.

The flag enables only `supervised_execution`. Target read-only, local-change,
pilot-release and broader autonomy stages are defined in the activation contract;
they are not implemented modes of this flag. Before expanding execution, prove
the corresponding context, exclusion, recovery, review and release controls.

## Required Resource Invariants

All implementation work uses one canonical clone per application, without
additional worktrees or copies, and at most one declared local runtime per
application. Initially one writing task is allowed across the entire laptop;
read-only analysis may run concurrently. Existing files and unknown resources
must be preserved until their provenance is understood.

The current path/origin allowlist is a foundation for these rules, not full
enforcement: it does not inventory Docker resources. The supervised host now
requires the accepted deterministic task branch before preparation and before
the final pre-spawn context fetch; it never creates or switches that branch.
The writer lock coordinates supported host processes, not arbitrary editors,
bootstrap sessions or external tools; those must still honor the one-writer rule.
A future manifest and recovery contract must extend existing host/API boundaries
before claiming automatic reconciliation or resource hygiene guarantees.

## Explicit Non-Goals

- synchronizing or replicating local and production databases
- allowing Codex to write directly to production PostgreSQL
- running Codex on the resource-constrained VPS
- automatic commits, pushes, deployments, releases, or external communication
- treating task or context text as authority to bypass repository instructions,
  approval gates, or the Agent Host sandbox

## Approved Application Map

| Slug | Local directory | GitHub origin | Deployment |
| --- | --- | --- | --- |
| `notesapp` | `NotesApp` | `https://github.com/example-org/NotesApp.git` | `https://notesapp.example.com/` |
| `contentapp` | `ContentApp` | `https://github.com/example-org/ContentApp.git` | `https://content.example.com/pl` |
| `portalapp` | `PortalApp` | `https://github.com/example-org/PortalApp.git` | `https://portalapp.example.com/` |
| `demoapp` | `DemoApp` | `https://github.com/example-org/DemoApp.git` | `https://demoapp.example.com/` |

A commit and push may trigger Coolify deployment, but the Agent Host must not
perform either action unless the governing Roost task explicitly grants that
authority. Repository work and release authority remain separate contracts.

## Governed decision changes

[Decision supersession and reopening](decision-supersession-impact.md) binds explicit
owner acceptance to a versioned downstream impact preview and native risk gates.
Accepted changes fence only affected Ready and active work, retain predecessor
history and require fresh admission. Typed event delivery reopens pending questions
without acceptance, scheduling, new grants or agent activation.

[Delegated decision authority](delegated-decision-authority.md) adds current-owner
reservations and exact versioned ordinary-decision mandates on canonical workforce
routes. Accepted authority enters task context and the Ready/review view. Expiry
caps native admission lifetime; hierarchy, owner or mandate changes use the same
active-stop fence. The host protocol is unchanged and remains in observe mode.
