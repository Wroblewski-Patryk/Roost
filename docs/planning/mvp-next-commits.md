# Next development work

Owner amendment v37: [lifecycle COMMIT acknowledgement](../architecture/worker-identity-lifecycle-v1.md)
now requires one fresh read-only confirmation of the exact immutable record,
matching native audit/digest and committed fence. Prisma 5.22's library engine
returned an error object without `error_code`; its JS classifier accepted it.
A raw-driver/wire probe reproduced this independently of the lifecycle wrapper.
Unconfirmed outcomes return non-retryable `reconciliation_required`; no write
or callback is replayed. **117/117 source results**, build and lint pass.
The formerly red native deferred-COMMIT assertion now passes (2/2 results,
including parent); 79 migrations remain unchanged. Full post-fix native
qualification stays PARTIAL; production BLOCKED, five other gaps unresolved.
All six flags and transportQualified/launchAuthority remain false. The current
run creates no helper files; cleanup/preservation results are recorded in the
linked contract. Earlier retained artifacts are outside this delegated scope.
One next recommendation: separately authorize the full native lifecycle suite
against the repaired adapter. No activation; earlier next steps are historical.

Owner amendment v32: [durable bootstrap ledger](../architecture/worker-bootstrap-ledger-v1.md)
is **DONE source-only: 13/13 adapter results, 86/86 selected source results**.
Five additive tables are proposed in an UNAPPLIED migration; the prior 77 migrations
are unchanged. Transactional mocks qualify one-time generations, canonical recovery,
CAS completion, atomic audit/rollback and read purity. Production authority sources
and native SQL remain PARTIAL; production/execution BLOCKED, all flags false.
Ordinary admission is unchanged. Exactly one recommended next atom: native ledger
qualification in an explicitly authorized isolated disposable database with synthetic
authority sources and cleanup evidence. Earlier successor proposals are historical.

Owner amendment v31: [bootstrap/recovery admission](../architecture/worker-bootstrap-admission-v1.md)
is **DONE as a source-only contract/model: 16/16 results, 73/73 source regressions**.
A separate current-owner ticket admits one first enrollment or terminal recovery;
ordinary poll/ACK/status/rotation retain their existing credential requirements.
Exact bindings, burned generations, replay, expiry/cutover and post-commit unknown
are enforced synthetically. No native persistence, network, provisioning or default
composition; all admission flags false. Durable issuer/delivery integration is
PARTIAL and production BLOCKED. Exactly one proposed next atom: a source-only
bootstrap ledger adapter and additive unapplied schema with mocked transaction
validation. Earlier successor proposals below are historical.

Owner amendment v30: [persisted admission/HTTPS coordinator](../architecture/worker-handoff-coordinator-v1.md)
is **DONE for source-only integration: 11/11 results, 57/57 source regressions**.
Immutable snapshots are the only configuration source; inspection, pre-body peer
recheck and signed operation/response completion reject drift and stale pins.
Concurrent/replayed completion, uncertainty, read-only status and buffer wiping
are qualified with an injected synthetic exchange on the existing HTTPS client.
No persistence/migration change, real network/DB/Docker or activation; flags false.
Real exchange remains PARTIAL and production BLOCKED. Integration exposes an
active-credential prerequisite that blocks first enrollment and rotation recovery.
Exactly one proposed next atom: a source-only bootstrap/recovery admission contract
and synthetic validation resolving that cycle without relaxing owner/host bindings.
Earlier successor proposals below are historical.

Owner amendment v29: [native transport persistence](../architecture/worker-transport-admission-v1.md)
is **DONE: 9/9 PostgreSQL results, 55/55 selected native/source results**.
Real Prisma/Serializable concurrency (20 attempts per create/stage/cutover/revoke/
readmit), FK/unique/CHECK constraints, atomic rollback and SQL read-only inspection
pass. The previously unapplied migration needed a JSON-operator parenthesis fix;
it then applied with the full 77-file chain. Earlier 76 migrations unchanged.
Cleanup PASS: owned database absent, three existing database fingerprints equal,
Roost PostgreSQL exited, backend/Soar unchanged. Production remains BLOCKED and
all flags false. Exactly one proposed next atom: source-only integration of
persisted admission with the HTTPS handoff boundary and synthetic denial tests;
no endpoints, provisioning, default composition or activation. Earlier proposals
below are historical; native evidence does not qualify governance fixture setup
or privileged SQL/whole-database rollback protection.

Current owner amendment v28: [Prisma transport persistence](../architecture/worker-transport-admission-v1.md)
is **DONE for source/synthetic qualification: 10/10 adapter results, 46/46 source
regressions**. Immutable generations/history, one workspace/host head, revocation,
high-water and atomic Event/audit are implemented; inspect/complete do not write.
The additive migration is **UNAPPLIED** and the preceding 76 migrations unchanged.
Native persistence remains PARTIAL; production transport/launch BLOCKED. No
DB/Docker, endpoint/provisioning or Worker/provider/model activation in this atom.
All six flags plus `transportQualified` false; default composition absent.
**Exactly one proposed next atom:** separately authorized native PostgreSQL
qualification of the adapter and unchanged migration chain, with a disposable
synthetic database, real concurrency/constraints/rollback and verified cleanup.
Do not treat this proposal as permission to run it. No production endpoint,
provisioning or activation. Stop after the source persistence atom. Earlier
successor proposals below are historical.

Current owner amendment v27: [source transport admission](../architecture/worker-transport-admission-v1.md)
is DONE for 9/9 synthetic results and 36/36 source tests. Exact owner/signed
decision, origin/DNS/pin, epochs/rotation/revoke, anchors and rollback are qualified
in memory only. Persistence PARTIAL; production provisioning and independently
trusted rollback resistance BLOCKED. No network/DB/Docker or activation; flags false.
**Exactly one proposed next atom:** implement a source-only Prisma persistence
adapter and additive unapplied migration for admission history, high-water epochs,
revocation and audit, with synthetic transaction/rollback tests. Do not run a real
database, contact endpoints or provision/activate anything. Stop after that atom;
native database qualification requires a separate later authorization. Older
proposals below are historical.

Current owner amendment v26: [loopback HTTPS adapter](../architecture/worker-handoff-https-v1.md)
is DONE: 9/9 real HTTPS results, 189/189 selected tests, cleanup PASS. Certificates
are ephemeral/in-memory, TLS/pin/origin/proxy/redirect and resource boundaries
qualified; production TLS/DNS/certificate provisioning and secret storage remain
BLOCKED. No DB/Docker, target process or activation; all six flags false.
**Exactly one proposed next atom:** define and synthetically qualify a source-only
production HTTPS/DNS/certificate admission contract with exact installation,
host and owner authority plus certificate epoch rollback denial. No production
endpoint contact, real certificate/credential provisioning, secret store or
Worker/provider/model activation. Stop after that admission atom. Older proposals
below are historical.

Current owner amendment v25: [native handoff qualification](../architecture/worker-credential-lifecycle-v1.md)
is **DONE: 9/9 PostgreSQL/HTTP results, 180/180 selected regressions**. The full
unchanged 76-migration chain, exact owner/device binding, one-time delivery/ACK,
concurrency, recovery, rollback and secret-free persistence are qualified using
synthetic evidence in one disposable database. Real TLS/provisioning/launch remain
BLOCKED; default routes closed and six flags false.
Owned-database cleanup and existing database/Docker preservation: **PASS**.
**Exactly one proposed next atom:** qualify an explicit HTTPS transport adapter
on loopback with ephemeral test certificates and synthetic credentials, including
origin/certificate pinning, redirect and proxy drift. No production provisioning,
secret store, Worker/provider/model launch or activation. Stop after that atom.
Earlier next-atom proposals below are historical.

Current owner amendment v24: [synthetic Worker credential handoff](../architecture/worker-credential-lifecycle-v1.md)
is **DONE for source/synthetic qualification: 7/7 tests**. Device request,
fresh owner approval, exact origin/certificate binding, one-time poll, possession
ack and lost-response recovery are defined on the existing credential lifecycle.
Raw values never persist; default handoff routes have no secure transport or
delivery composition. The additive handoff migration is unexecuted.
**Exactly one proposed next atom:** qualify that migration and native owner-
decision/origin/certificate/poll/ack/recovery/concurrency/rollback boundaries on
one explicitly authorized disposable PostgreSQL database, with synthetic evidence
only. No real TLS, credentials, secret store, Worker/provider launch or activation.
Stop after that database qualification; earlier proposals are historical.

Current owner amendment v23: [native Worker credential lifecycle](../architecture/worker-credential-lifecycle-v1.md)
is **DONE for this database atom: 12/12 PostgreSQL/HTTP results, 173/173 regressions,
cleanup and preservation PASS**. The 75-migration chain qualifies owner-decision/auth,
generation races, ticket/claim invalidation and full post-write rollback. Two CASE
comparisons in the previously unapplied last migration were fixed after native
parsing failed and rolled back; earlier 74 migrations are unchanged. Production
provisioning/delivery/TLS/launch remain BLOCKED; no activation, six flags false.
**Exactly one proposed next atom:** specify and synthetically qualify secure
one-time Worker credential handoff bound to an accepted primary-owner decision,
exact HTTPS origin, installation and registered host, including lost-delivery
recovery and replay denial. Keep default composition unavailable. No real keys,
secret store, TLS deployment, Worker/provider launch or activation.
Stop after that delivery contract qualification; older next-step proposals are historical.

Current owner amendment v22: [Worker credential lifecycle](../architecture/worker-credential-lifecycle-v1.md)
is **DONE for source/synthetic qualification: 173/173 tests (55 new + 118
regressions)**. Existing ApiKey/host/governed-decision components now define
fresh primary-owner enrollment, rotation and terminal revoke, exact bindings,
atomic model invalidation/rollback, and one-time synthetic disclosure. Native
persistence is PARTIAL; the additive 75th migration is unexecuted. Real
provisioning/transport/launch remain BLOCKED, default dependencies absent, six flags false.
**Exactly one proposed next atom:** qualify that forward migration and native
owner-decision/auth/credential lifecycle, ticket/claim invalidation, concurrency
and rollback on an explicitly authorized owned disposable PostgreSQL database.
Use only synthetic keys/evidence with complete preservation and cleanup audits.
No real provisioning, secure delivery/TLS claim, Worker/provider launch or activation.
Stop after that database qualification; all earlier next-step proposals below are historical.

Current owner amendment v21: [native Worker ticket qualification](../architecture/worker-owner-ticket-channel-v1.md)
is **DONE: 24/24 integration results, 110/110 regressions and verified cleanup/
preservation PASS**. Qualification
covers PostgreSQL binding guards, owner/Worker races, rollback and read-only
status through the existing authentication/redaction boundary. No activation.
**Exactly one proposed next atom:** specify and synthetically qualify the
owner-controlled provisioning, rotation and revocation contract for an existing
Worker credential bound to installation/host. No real credential issuance,
secret storage, TLS qualification, provider launch, deployment or activation.
Stop after that contract; all earlier proposed next atoms below are historical.

Current owner amendment v20: [Worker consume/status](../architecture/worker-owner-ticket-channel-v1.md)
source/synthetic DONE (102 tests), native persistence PARTIAL; no activation.
**Exactly one proposed next atom:** qualify the additive binding migration,
native credential/host guards, owner/Worker and revocation races, and read-only
status on an explicitly authorized owned disposable PostgreSQL database. Use
synthetic keys/evidence only, fix findings and verify cleanup/preservation.
No real provisioning, transport qualification, provider launch or deployment.
Stop after that atom; earlier proposals below are historical.

Current owner amendment v19: [PostgreSQL qualification](../architecture/server-owner-ticket-v1.md)
is DONE for this bounded atom: 73 migrations, 15/15 integration results and
54/54 regressions pass; cleanup and existing-data/container comparison pass.
Only the Ready/risk decision
authority integration defect found by native qualification is changed.
**Exactly one proposed next atom:** specify and synthetically qualify the
authenticated Worker consume/status contract, binding credential, assigned
host/claim and original consume ID. Preserve owner-only issue and fail-closed
nonrenewable authority. No real keys, transport qualification, provider launch
or activation. Stop after that atom; older proposals below are historical.

Current owner amendment v18: [owner-only tickets](../architecture/server-owner-ticket-v1.md)
are PARTIAL: service, HTTP, Prisma transaction and additive migration implemented;
50 synthetic tests plus four provider regressions pass. Database test skipped:
Docker Engine unavailable. The default API composition remains unavailable.
**Exactly one proposed next atom:** qualify forward migration, real concurrent
consume/rollback and native owner/decision/Ready integration on an available
local disposable PostgreSQL database with the test signer; correct only findings.
No provisioning, real keys, HTTPS qualification, provider launch or activation.
Stop after this atom; all earlier next-step proposals below are historical.

Current owner amendment v17:
[server-issued owner ticket contract](../architecture/server-owner-ticket-v1.md)
is source/validator DONE; production integration remains BLOCKED. Existing Roost
API is the chosen issuer; no private key belongs on Worker. Six flags false.
**Exactly one proposed next atom:** implement owner-only issuance and atomic
one-use consumption within existing API/auth/decision/task components, with an
injected synthetic signer, transaction/revocation tests and reviewed persistence
contract. No real secret provisioning, deployment, Worker/provider activation.
The 39 retained roots are out of scope and untouched. Stop after this contract;
previous next-step proposals below are historical.

Current owner amendment v16, 2026-09-23:
[managed-Hermes backend admission contract](../architecture/managed-hermes-backend-admission-v1.md)
is source/synthetic DONE for explicit Codex Responses and local Ollama.
Real issuer/launch remain BLOCKED; six flags false. No routing or provider run.
Prior test-state cleanup is BLOCKED on missing original parent ownership.
**Exactly one proposed next atom:** source-only qualification of secure private
trust-anchor provisioning/verification within the existing Worker state model,
including inherited Users write, operator/runtime trust and fail-closed tests.
Do not create keys, change ACLs, install software or launch a provider.
Stop after this contract; all earlier proposed next steps below are historical.

Current owner amendment v15, 2026-09-23:
[Hermes-only flow and static Codex inventory](../architecture/codex-static-inventory-v1.md).
Static inventory is DONE; the original direct-pin pilot binding is
PARTIAL / architecture mismatch. Codex OAuth/Responses and local Ollama are
explicit backends behind managed Hermes, not competing Roost agent paths.
Direct Codex has no pilot authority, and no pin is attached to Hermes launch.
**Exactly one proposed next atom:** qualify the source-only backend-aware
managed-Hermes admission contract, mapping model/profile/authority/budget/Job
requirements and denials for both backends. Do not implement routing, provision
keys/profiles or launch a provider. Secure anchor provisioning remains a blocker.
All six flags remain false. Stop after this slice; previous next steps below
are historical, including the now-superseded direct pin/Job proposal.

RF-HOST-035 trusted pilot, 2026-09-23: **PARTIAL for real execution**.
The [accepted owner contract](../architecture/trusted-provider-pilot-v1.md)
removes full OS isolation as a prerequisite for exactly pinned trusted Codex and
managed local Hermes. Private signed acceptance, drift/revocation checks and
both fixture-only positive paths are implemented at the existing containment
boundary. Real Codex pin/Job integration and managed Hermes model admission are
not complete; independent budget/recovery/release gates and six false flags remain.
**Exactly one next atom:** bind one genuine Codex runtime pin to this decision
and existing Windows Job v2 with synthetic launch/denial checks. No provider run,
new supervisor, automatic fallback or relaxation of budget/authority gates.
Stop after the current slice. The prior LPAC/broker proposal below is superseded.

RF-HOST-035: **PARTIAL; LPAC candidate BLOCKED**, 2026-09-23. The
[read-only qualification](../operations/host-lifecycle-safety.md#lpac-read-only-qualification)
evaluates eight dimensions using local OS/API/DACL/firewall evidence and Microsoft
primary sources. Standalone LPAC does not establish exact resource scope,
credential-free authentication or endpoint-specific networking for the current
provider. It could use one checkout, but requires explicit runtime/scratch
exceptions and a qualified resource policy. No host settings or private profiles
changed; no provider ran. The prior containment binding is DONE, fixture-only;
no real-provider issuer exists and six flags remain false.
**Superseded proposal:** source-only feasibility of a credential-free,
raw-network-disabled LPAC tool executor with the existing trusted Worker mediating
narrowly authorized inference/network operations. Assess current provider protocol
compatibility and one-checkout resource exceptions; do not implement a broker,
adapter or host changes. Stop after this qualification; no model, Soar task,
production connection, push or deployment.

Manual Hermes owner tooling: **points 2A/2B/3 DONE**, 2026-09-23. The separately
authorized [final manual smoke](../architecture/hermes-desktop-ollama-profile-contract.md#final-manual-smoke-and-exact-model-admission)
made one local inference with the existing `gpt-oss:20b`; no download/load-only
repeat. Preflight exceeded 12 GiB available RAM, 18 GiB commit headroom and
6 GiB disk (15.143 / 36.216 / 11.097 GiB observed). The expected short answer
arrived in 36.469 s; context 2048, reasoning low, 25 output tokens, no tools or
remote fallback. Both owned Jobs exited 0 and cleanup left zero processes.
The exact digest is now admitted only to the private `manual-ready` profile;
the state/launcher binding and final offline check passed. Model, runtime and
protected roots were unchanged. Historical failure cause remains INCONCLUSIVE.
This qualified the manual CLI only; the subsequent GUI hookup audit is below.
No automated retry, Roost connection, Electron Desktop or agent activation.
The server was restored to its initially stopped state. Managed Roost provider
admission and all six false readiness flags remain unchanged.

The separately authorized [Desktop hookup audit](../architecture/hermes-desktop-ollama-profile-contract.md#desktop-hookup-audit)
is complete: **DESKTOP BLOCKED**, 2026-09-23. Installed 0.17.6 can select separate
home/Electron state, but no strict exact-backend mode was established that
disables fallback, bootstrap, repair and updates. No GUI launcher or private
state change was created. **Stop this manual atom.** The minimum next input is
an upstream-supported strict external-backend contract preserving the manual
no-tool/no-remote policy; then re-audit before creating a GUI launcher. The
existing CLI remains `manual-ready`. This does not authorize upgrades, patches,
a fork, UI/model launch or continuation of the separate RF-HOST-035 atom.

RF-RUNTIME-005B30 kwalifikuje osobną klasę `synthetic_fixed`: stały program,
publiczne API/Ready/claim i Worker, pierwotny ownership B28, zawieszony Job,
trwały resume receipt/ack, dokładnie 22 bajty wyniku, niezależne review i cleanup.
[Tabela gotowości](../architecture/agent-delivery-readiness.md) opisuje dodatni E2E oraz odmowę
bez resume receipt. Dowód dotyczy zamkniętej semantyki tego programu, bez sandboxa.
Hermes, Direct i sześć flag pozostają zablokowane/false. Jedyna następna luka:
RF-HOST-035 — dopuszczenie ochrony host lifecycle dla rzeczywistego providera.
Nie ma zgody na model trial ani automatyczną kontynuację; propozycje poniżej
są historyczne.

RF-RUNTIME-005B26 [adopted recovery](../architecture/hermes-b26-adopted-recovery-v1.md) defines the separately owner-authorized
one-use cleanup of the exact B25-adopted B21 fixture, then its lease and Writer.
A signed append-only consumption/intent chain, exclusive controller and recovery
barrier fence each identity-checked deletion and deterministic resume. Original
B21/B24/B25 evidence and spent records remain historical truth; successful recovery
is not task acceptance. All six flags stay false, with no provider/API/configuration
authority or production autonomy. The proposed next atom is B27 durable original
fixture-ownership evidence at creation, source/synthetic only. See the contract for
the verified terminal state; earlier successor statements below are historical.


RF-RUNTIME-005B25 [exact legacy fixture adoption](../architecture/hermes-b25-legacy-adoption-v1.md) implements the owner's
one-shot acceptance of B21's missing historical parent-fixture ownership proof.
It freezes canonical paths, physical objects and all B21/B24/control/runtime
evidence in a separate append-only record; original history is never backfilled.
Adoption expires after 24 hours and grants no cleanup, execution, API or config
authority. Only B26 preparation may qualify, subject to fresh checks and a new
explicit owner decision for that separate recovery atom. All six flags remain
false; production autonomy is not ready. Execution ADR v13 and runtime policies
remain unchanged. Earlier status and successor statements below are historical.


RF-RUNTIME-005B24 [recovery evidence supplement](../architecture/hermes-b24-recovery-supplement-v1.md) implements versioned
identity bridging and append-only later verification without rewriting the original
B21 REFUSED review or spent authorization. Recovery remains **BLOCKED** on missing
historical parent-fixture ownership; a present marker cannot recreate that proof.
No cleanup, barrier, grant or provider activation is authorized. One proposed owner
decision is an exact-identity recovery/adoption contract addressing that gap.
ADR-004 execution v13, native-risk v7, profile/registry v5, startup v2 and all six
false public flags remain unchanged. Earlier successor statements are historical.


RF-RUNTIME-005B23 [Windows startup
environment](../architecture/windows-startup-environment-v1.md) derives SystemDrive from
the verified local SYSTEMROOT, checks parent agreement, rejects unresolved configured
path tokens and binds the value/physical root into startup receipt and policy v2. Every
pre-spawn proof rechecks live Worker identity; task/API candidates cannot override it.
Profile/registry v5, owner attestation, native-risk v7 and ADR-004 execution authority
v13 stay unchanged. B21 evidence, fixture, Writer/lease/spent remain retained; its
eight-entry attribution and recovery blockers are unchanged. No provider, cleanup,
barrier or new grant is authorized. One next proposed atom is B24: a versioned
append-only recovery-evidence contract with synthetic tests, without actual B21 cleanup
or activation. All six public flags remain false. Earlier outcomes and successor
statements below are historical.

RF-RUNTIME-005B22 [preserved-footprint
diagnosis](../architecture/hermes-b22-footprint-diagnosis-v1.md) is complete with
**BLOCKED attribution (8 unknown entries)**. All eight additions are unchanged: five
directories and three cache-shaped binaries under a literal unresolved SystemDrive path.
The Worker drops SystemDrive, but the creating process is unproven. Independent system
Node now passes the unchanged arithmetic test; the exact repair and baseline are
verified. B21 remains acceptance_failed and spent. Ordinary recovery is blocked by
identity serialization order and the original signed REFUSED verification; no B21
evidence, fixture, lease or Writer was changed. One proposed owner action is B23: a
validated SystemDrive environment correction with synthetic tests, without provider
execution or cleanup. See the diagnosis for the separate recovery evidence requirements.
ADR-004 v13, profile/registry v5, native-risk v7 and all six false public flags remain
unchanged. Earlier outcomes and next-step statements below are historical.

RF-RUNTIME-005B20 [exact legacy B17 recovery](../architecture/hermes-b20-legacy-recovery-v1.md) is **DONE**
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

RF-RUNTIME-005B19 [root-scoped review and reconciliation v2](../architecture/hermes-root-scoped-review-reconciliation-v2.md) is implemented and synthetically qualified. Ordinary safe coding paths are
acceptance scope, while protected paths remain blocked. Durable private evidence
precedes verification, terminal receipt, owned cleanup and lease/Writer release.
Future recovery requires a complete identity chain and separate explicit owner
authority. The real B17 legacy dry run refuses seven missing evidence requirements;
its Writer, application lease and all spent records remain unchanged. The sole
next owner action is a decision on a separately scoped legacy-only recovery
exception; no bypass or new run follows. ADR-004 is v11 for this policy amendment,
profile/registry stay v5, native-risk binding stays v7 and all six public flags
remain false. Earlier successor/version statements below are historical.

RF-RUNTIME-005B18 [source/synthetic diagnosis](../architecture/hermes-b18-footprint-diagnosis-v1.md) is complete,
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

RF-RUNTIME-005B17 [one-shot coding smoke](../architecture/hermes-b17-coding-smoke-v1.md) is **BLOCKED** after
one authorized provider start under ADR-004 v10. Root exit 0 was rejected by
native review (unexpected_changed_path); exact repair and independent test PASS
were not established. Genuine Job cleanup and owned fixture removal passed.
Separate post-result full installation readback passed without receipt changes.
Writer and one application lease remain held for reconciliation; all B13/B14/B17
authorizations are spent. All six public flags remain false. Exactly one proposed
successor is B18 source-only footprint diagnosis and reconciliation-plan
qualification, with no runtime/private mutation or new execution. Earlier
B16/no-launch/version-9 and successor statements below are historical.

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B4 same-owner qualification](../architecture/hermes-same-owner-profile-v1.md)
is complete using explicit private owner attestation. A stable account ID is not
required. Installed CLI help does not establish secret-free status output; no
status command was run and availability is not claimed. Attestation is checked
at sealing/pre-spawn, expires within 90 days, and requires explicit renewal on
expiry/revocation or reported account/session/config changes. Silent account
switches and unreported session loss remain residual risks.
[RF-RUNTIME-005B5 effective-config qualification](../architecture/hermes-effective-config-qualification-v1.md)
is BLOCKED: exact-pin loader data is partial, with intercepted read/import attempts
and unqualified startup/tool/rotation consumers. Its private negative receipt grants
no Ready/admission authority. [RF-RUNTIME-005B6 source analysis](../architecture/hermes-minimal-startup-contract-v1.md)
recorded NOT_SUPPORTED for strict minimal startup. B7 resolves that requirement
through explicit owner acceptance of local skills sync/banner prefetch, with
network updates off. Exact Worker startup policy and Ready/input-bound receipt are
implemented and synthetically tested; only the local config blocker is removed
with fresh proof. Real Hermes launch remains denied.
[RF-RUNTIME-005B8 attempt/budget qualification](../architecture/hermes-attempt-budget-contract-v1.md)
remains historical evidence of missing physical dispatch/token boundaries.
RF-RUNTIME-005B9 owner amendment supersedes those pilot requirements with the
[implemented practical attempt policy](../architecture/hermes-practical-attempt-budget-v1.md):
24 logical turns; retry setting 2; original deadline at most 900 seconds;
native cleanup; no resume or whole-task restart; unavailable accounting null;
exit 0 only candidate_result for independent review. Private v3 profile is read
back with owner identity/confirmation/expiry preserved. This is synthetic/native
fixture qualification, not real Hermes execution. All six flags remain false.
[RF-RUNTIME-005B11 native audited coding](../architecture/hermes-native-tool-boundary-v1.md)
is implemented under ADR-004 v7. Owner acceptance resolves B10's one pending
risk decision; authority, v4 startup, leases, manifests and owned cleanup have
synthetic qualification. Native tool isolation remains technically incomplete;
violations block review/release and unobserved/transient effects remain accepted
risk. Only fresh opaque proof removes the local native-tool blocker. All six
flags remain false. [RF-RUNTIME-005B12 local launch admission](../architecture/hermes-local-launch-admission-v1.md)
is source/synthetic qualified with a single opaque, expiring, one-use proof set.
Local policyQualified can be true while activationAuthorized=false and
spawnStarted=false. B11 cleanup is closed by verified owner removal.
RF-RUNTIME-005B16 [controlled rebuild and split attestation](../architecture/hermes-controlled-rebuild-v1.md)
is **DONE**. The unchanged exact source pin now has a verified canonical venv
with 83 original distributions, no optional AWS closure, 23,653 immutable files
and 826 separately verified generated files. Profile v5 and the sealed Worker
environment deny lazy installation. Owner identity/confirmation/expiry, private
data and B13/B14 spent records are preserved. Staging/rollback cleanup and fresh
file-only admission passed. No Hermes/model run or new activation occurred.
ADR-004 execution decision remains v9 and all six public flags remain false.
Earlier next-step/lock/launch statements below are historical.

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent direction remains native Hermes behind Windows Worker under
[ADR-004 version 10](../decisions/ADR-004-native-hermes-codex-pilot.md).
[RF-RUNTIME-005A quiet v1](../architecture/hermes-supervised-quiet-v1.md) retains
stable 0.21.2 and removes stream-json waiting from the supervised pilot scope.
RF-RUNTIME-005B3 prepares a private profile and synthetic admission binding under
the accepted same-owner auth policy. B4 qualifies private owner attestation, with
unobserved CLI status and residual account-switch risk; no model run, upgrade or
automatic pilot authority follows.
Native whole-tree recovery now has fixture evidence; remaining
configuration/auth/tool/turn/budget blockers still require proof. All six runtime
flags remain false. Direct CLI is an alternative, Herdr optional, VM/Sandbox is
not a prerequisite. Future local Ollama stays planned/disabled until confirmed
disk expansion and separate qualification; routing never hides a fallback.

Other product work remains available independently of that runtime decision:

1. Run the application locally and verify the owner flows against a disposable
   development database.
2. Review each `00`-`12` department workbench with real workspace data and
   record product gaps as normal issues outside the repository.
3. Finish the first owner-authorized Google Drive import.
4. Refresh production deployment identity only after an approved release.
5. Add focused regression tests alongside every changed runtime contract.

## Definition of ready

A change is ready to commit when typecheck, structural lint and build pass,
relevant tests pass, documentation matches behavior, and no generated cache or
sensitive local artifact is staged.
