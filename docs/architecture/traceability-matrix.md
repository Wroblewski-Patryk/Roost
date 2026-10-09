# Foundation requirements traceability

Current delivery work starts at [Matrix](#matrix). The amendment stream before
it is historical evidence and should be skipped unless a specific requirement
or implementation claim needs provenance; it is never the work queue.

Gate 2 native evidence (2026-09-27): the gate is **met** for the configured
pilot coding and independent review flow. The
native read-only auditor execution `b00d5c8b-8e5f-4d32-aeb9-2240ea67322f`
and independent verifier execution `bbb0e0e1-16d0-48f5-b58c-67a0dcad7f0f`
both completed under separate roles and signed managed admission on the same
clean pilot baseline `cf90418cc694dc0cb773a44c001c569407d05f9f`.
Both report `changedFiles: []`, verified Git, process and Docker state, native
Windows Job exit 0 with no active processes, and matching evidence digest
`8e686212c618e75d9792acf58dea289b2762bda3b1fb8cf6a34fd2f40b346434`.
The verifier links the auditor execution and digest. Both context invalidation
fields are null. Earlier failed audits remain historical and are not counted.

Incomplete and out-of-scope coding submissions returned 409 with
`task_execution_contract_invalid`. Coding task
`0566f074-1d15-4a05-98a9-3ed4f60a15a4` has a dedicated component,
assigned coder, published procedures, canonical pilot checkout and accepted
managed runtime Decision `ee47832d-b2c4-4f6f-8fed-04224bc71829`. The
separate first-write Decision `fc201896-b48a-4875-838a-c32608a76181` was
accepted before the first application edit. Native Worker evidence covers
writer exclusion, interruption at a checkpoint and safe same-attempt resume.
The managed coding executions produced local commits
`cdc1865bd76ab7ad0ceaf2b6bd83d45bb5305780`,
`6e25aa1478a9befe03114a12400085f5e61d0f4b` and
`a5eb15fe21e25e8647fbef1700c2ccbd1a77575c`. Independent reviewer
decisions rejected each exact candidate. Decision
`37945081-1536-46fc-a54a-c6eb8a6d641f` identified the absent nested-alias
regression despite a passing old test receipt. Accountable manager action
`6c4a809f-e4cf-4393-8e0b-610a40125153` returned a test-only correction.
Managed coding execution `b95cf777-fe24-46a4-a88e-4bd0a9314bef` then
created local commit `774e858ae48d1f05d2b56982a7113da983f62af8`
against baseline `a5eb15fe21e25e8647fbef1700c2ccbd1a77575c`. Its signed
local-commit receipt binds first-write Decision
`fc201896-b48a-4875-838a-c32608a76181`, candidate test digest
`5938582e5acbb3b2e1f200f3fc9a86bf12e4f7f287cc0fdf1df7390773254bab`,
and native `verified_candidate` receipt: installation and verification PASS,
no violations, Job exit 0 and zero active processes. Windows focused test:
8 pass, 0 fail, 1 POSIX fixture skipped. A separate offline Linux read-only
run on the same commit: 8 pass, 0 fail, 1 Windows fixture skipped, including
the actual nested relative-link case; output SHA-256
`0acdf4df73402dafa0292a61813c0a55fc6772fba665216b0687397fcffdda8c`
and Roost evidence `7e076475-e667-473e-bed3-f424913280bc`.

Independent read-only reviewer execution
`5c27d054-7cc3-45a1-9ef6-d43760316e69` used Ready pin
`d3aaeedc-71f4-4281-b5e6-99468d33f73e`, a fresh scoped review grant,
and managed Hermes `codex_responses` / `gpt-5.6-sol` / medium reasoning.
Its native audit reported unchanged Git, process and Docker state, Job exit 0
and zero active processes. Roost read back Decision
`c349899b-72c3-4260-9b77-de733f42866c` with `approve`, exact commit
`774e858ae48d1f05d2b56982a7113da983f62af8`, coding material digest
`cb9381a5ad6ba1dc28416b96cfe45861edc8c5e55be0495bbf22de3a72eb3569`
and evidence citing both platform tests. This is native Gate 2 acceptance,
not release certification. The pilot branch remains clean and local with no
push or deployment. Roost build `7ee3e19cdb0dc4d9cfd26085ff85dde6a23d4523`
was deployed and read back on health and build-info endpoints before final
review; the subsequent evidence and test update does not change API behavior.

An earlier failed native coding attempt required signed terminal, lease and
spent-admission reconciliation before further execution. The exact recovery
was archived outside Git. General after-spawn automatic recovery and arbitrary
external filesystem effects remain outside this proof; Hermes usage/cost
telemetry is unavailable. Gate 2 completion does not advance Gate 3.
After final acceptance, `npm run test:agent-host-gate2` passed 7/7,
`npm run test:agent-host-recovery` passed 20/20, the managed-admission and
review-migration tests passed 2/2, and the PL/EN review UI test passed 76
checks after its synthetic fixture was updated to include the exact commit
required for approval. `npm run validate` and `npm run codex:check` passed;
the latter covered all 225 accepted requirement IDs.

Owner amendment v76: [v3 source projection](bootstrap-proof-projection-v3.md)
defines exact own-XID/receipt lineage, complete source sets, explicit shared/nested
epoch cardinality and immutable phase prefixes. Source-only; native projection,
persistence and production authority remain BLOCKED. No migration 87 or changes
to guards/migrations 1–86. RF-HOST-035 PARTIAL; all eight flags false, registration
UNKNOWN / MONITORED RESIDUAL RISK. Exactly one next atom, not started: additive
migration 87 and pin-checked guard/native-port upgrades. Native qualification
comes later. Earlier entries are historical.

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

RF-HOST-035 owner amendment v32: [durable bootstrap ledger](worker-bootstrap-ledger-v1.md)
is **DONE source-only: 13/13 adapter results, 86/86 selected source results**.
Five additive tables are proposed in an UNAPPLIED migration; the prior 77 migrations
are unchanged. Transactional mocks qualify one-time generations, canonical recovery,
CAS completion, atomic audit/rollback and read purity. Production authority sources
and native SQL remain PARTIAL; production/execution BLOCKED, all flags false.
Ordinary admission is unchanged. Exactly one recommended next atom: native ledger
qualification in an explicitly authorized isolated disposable database with synthetic
authority sources and cleanup evidence. Earlier successor proposals are historical.

RF-HOST-035 owner amendment v31: [bootstrap/recovery admission](worker-bootstrap-admission-v1.md)
is **DONE as a source-only contract/model: 16/16 results, 73/73 source regressions**.
A separate current-owner ticket admits one first enrollment or terminal recovery;
ordinary poll/ACK/status/rotation retain their existing credential requirements.
Exact bindings, burned generations, replay, expiry/cutover and post-commit unknown
are enforced synthetically. No native persistence, network, provisioning or default
composition; all admission flags false. Durable issuer/delivery integration is
PARTIAL and production BLOCKED. Exactly one proposed next atom: a source-only
bootstrap ledger adapter and additive unapplied schema with mocked transaction
validation. Earlier successor proposals below are historical.

RF-HOST-035 owner amendment v30: [persisted admission/HTTPS coordinator](worker-handoff-coordinator-v1.md)
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

RF-HOST-035 owner amendment v29: [native transport persistence](worker-transport-admission-v1.md)
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

RF-HOST-035 owner amendment v28: [transport admission persistence](worker-transport-admission-v1.md)
is DONE for the source Prisma adapter and synthetic transactions: **10/10 results,
46/46 selected source regressions**. Four additive tables preserve identity
generations, one workspace/host head, monotonic history and atomic Event/audit.
Serializable writes use the existing fence and exact revision/digest; read snapshots
perform no writes. Migration **UNAPPLIED**; native persistence qualification PARTIAL,
production TLS/DNS/provisioning and execution BLOCKED. Default composition absent,
all six flags plus `transportQualified` false. Exactly one proposed next atom:
separately authorized native PostgreSQL qualification in a disposable synthetic
database. Earlier successor proposals below are historical.

RF-HOST-035 owner amendment v27: [transport admission contract](worker-transport-admission-v1.md)
is DONE for source/synthetic qualification: 9/9 results, 36/36 source tests.
Owner/decision/signature, exact identity/DNS/pin, epoch/replay/rotation/revoke,
anchor and rollback checks pass in memory. Persistence PARTIAL (no adapter or
migration); production and same-account rollback protection BLOCKED, six flags
false. One next atom: source-only Prisma adapter, additive unapplied migration
and synthetic transaction tests. Earlier successor proposals are historical.

RF-HOST-035 owner amendment v26: [loopback HTTPS adapter](worker-handoff-https-v1.md)
is DONE: 9/9 HTTPS results, 189/189 selected tests. Normal TLS plus exact certificate
pin, bounded staged rotation, origin/proxy/redirect/timeout/JSON denials,
one-time concurrent delivery/ACK and loss recovery are qualified. Cleanup PASS.
Production TLS/DNS/certificate provisioning and execution remain BLOCKED; six
flags false. One next atom: source-only production HTTPS/DNS/certificate admission
contract with synthetic denial tests for exact installation/host/owner and epoch
rollback. Earlier amendments and successor proposals are historical.

RF-HOST-035 owner amendment v25: [native handoff](worker-credential-lifecycle-v1.md)
is **DONE: 9/9 PostgreSQL/HTTP results, 180/180 selected regressions**. The unchanged
76-migration chain qualifies one-time delivery/ACK, owner/device/decision gates,
transport-evidence denials, concurrent recovery/rotation, rollback and redaction.
Real TLS/provisioning/launch remain BLOCKED; default routes closed, six flags false.
Exactly one next atom: loopback HTTPS adapter qualification with ephemeral test
certificates and synthetic credentials, without production provisioning, secret
store or activation. Earlier amendments and successor proposals are historical.

RF-HOST-035 owner amendment v24: [synthetic Worker handoff](worker-credential-lifecycle-v1.md)
is **DONE for source/synthetic qualification: 7/7 tests**. The device request
has no credential authority; fresh primary-owner approval binds exact decision,
installation, host, HTTPS origin and certificate. One concurrent poll discloses
one bounded synthetic value, ack alone activates the pending generation, and lost
delivery is terminal with explicit recovery. Raw secrets are absent from state,
audit and status. The additive handoff migration is unexecuted; native persistence,
real TLS and launch remain BLOCKED. Exactly one next atom: qualify that migration
and native poll/ack/recovery/concurrency/rollback on one authorized disposable
PostgreSQL database using synthetic evidence only. Earlier states are historical.

RF-HOST-035 owner amendment v23: [native Worker credential lifecycle](worker-credential-lifecycle-v1.md)
is **DONE for bounded PostgreSQL/HTTP qualification: 12/12 results, 173/173
regressions, cleanup/preservation PASS**. Real owner/decision/auth gates, 20-way
enrollment/rotation/rotate-revoke races, concurrent old-key use, native audit denial,
atomic ticket/claim invalidation and post-write rollback are exercised. All 75
migrations apply after repairing two CASE comparisons in the previously unapplied
last migration; prior 74 unchanged. Real provisioning/delivery/TLS/launch remain
BLOCKED, default dependencies absent, six flags false. Exactly one next atom:
source/synthetic secure one-time credential handoff bound to accepted primary-owner
decision, HTTPS origin, installation and host, including lost-delivery/replay
handling; no real keys, secret store, TLS deployment or launch. Earlier states below
are historical.

RF-HOST-035 owner amendment v22: [Worker credential lifecycle](worker-credential-lifecycle-v1.md)
is **DONE for source/synthetic qualification: 173/173 tests (55 new + 118
regressions)**. Fresh primary owner plus exact accepted decision controls existing
ApiKey enrollment, rotation and terminal revocation. Tests cover exact bindings,
20-way generation races, atomic model rollback/invalidation, one-time synthetic
delivery and bounded secret-free projections. Native persistence is PARTIAL:
the additive 75th migration is unexecuted. Real provisioning/transport/launch
remain BLOCKED, dependencies absent in default composition, all six flags false.
Exactly one next atom: qualify the migration and native owner-decision/auth,
ticket/claim invalidation, concurrency and rollback on an explicitly authorized
owned disposable PostgreSQL database with synthetic evidence and preservation/
cleanup audits, without provisioning or launch. Earlier results/proposals are historical.

RF-HOST-035 owner amendment v21: [native Worker ticket qualification](worker-owner-ticket-channel-v1.md)
is **DONE for this atom: 24/24 integration results, 110/110 regressions and
cleanup/preservation PASS**. Qualification
covers the 74-migration chain, credential/host/claim guards, owner/Worker races,
real rollback and observational status through HTTP redaction. Two boundary
findings are repaired: out-of-transaction credential usage and nested lease proof
classification; status rejection creates no incident writes. Production
provisioning/transport/launch stay unqualified; six flags false. Next single atom:
source/synthetic owner-controlled credential provisioning/rotation/revocation
contract, without issuing real credentials or launching a provider.
Earlier amendment qualification statements below are historical.

RF-HOST-035 owner amendment v20: [Worker consume/status](worker-owner-ticket-channel-v1.md)
source/synthetic DONE (102 tests), native persistence PARTIAL. Immutable existing
credential/host/installation/claim binding, owner-only issue/revoke/rotate and
read-only nonrenewable status; one synthetic owner/Worker consume commit out of 20.
New migration unexecuted; v19 native evidence is historical. Provisioning,
transport and launch unqualified, six flags false. Next: native binding migration,
guard/race/read-only-status qualification on an explicitly authorized disposable DB.

RF-HOST-035 owner amendment v19: [native database qualification](server-owner-ticket-v1.md)
is DONE for the bounded atom: 15/15 integration results, 54/54 regressions,
one commit from twenty concurrent consumes, rollback and cleanup/preservation PASS.
The 73-migration forward chain and
real Prisma/HTTP owner-decision-Ready path run in one owned disposable database.
The qualification fixes the decision-authority read rejected by the Ready/risk
source watcher without allowing generic raw queries or weakening native guards.
Signer/physical evidence remain synthetic; Worker, transport and launch remain
unqualified; six flags false. Next atom: authenticated Worker consume/status
contract and synthetic credential/host/claim binding, without provisioning or launch.

RF-HOST-035 owner amendment v18: [server owner-ticket implementation](server-owner-ticket-v1.md)
is PARTIAL. DONE: source service/HTTP boundary, Prisma adapter, additive metadata
ledger/journal migration and 50 synthetic tests (one of 20 consumes commits).
BLOCKED: PostgreSQL migration/CAS and native owner/decision/Ready integration;
Engine unavailable, DB test skipped. Four provider regressions pass. Missing
signer/host evidence fails closed; consume is not a launch receipt. Six flags
false, no real secret/provider/transport activation. Next atom is database and
native-context qualification on an available disposable local test database.

RF-HOST-035 owner amendment v17:
[server owner-ticket v1](server-owner-ticket-v1.md) selects the existing Roost
installation as issuer. Source validators bind the exact existing acceptance,
claim, key epoch, short lifetime and challenged one-use acknowledgement.
Wrong/local/self-issued keys, offline/stale/replayed/revoked/rotated authority
and attempt drift deny. Validator output cannot replace a containment receipt.
Contract DONE; real issuance/transport/CAS/integration BLOCKED, six flags false.
No private key or system provisioning; 39 retained roots untouched.
Next proposed atom: owner-only API issuance and atomic consume with test signer.

RF-HOST-035 owner amendment v16:
[managed backend admission v1](managed-hermes-backend-admission-v1.md) is
**source/synthetic DONE; real issuer BLOCKED**. Both explicit Hermes backends
bind task/model/auth or separate managed-model evidence through the existing
signed pilot and fixed Job chain. Drift, manual/direct/App Server, fallback,
unavailability and replay deny before target effect. Failed admission spends
the attempt. Six flags remain false, and inherited Users write/private anchor
provisioning remains unresolved. Cleanup of 39 prior test-state parents is
BLOCKED by missing original parent ownership. Exactly one next proposed atom:
source-only secure private-anchor provisioning and verification contract.

RF-HOST-035 owner amendment v15, 2026-09-23:
[Codex static inventory](codex-static-inventory-v1.md) **DONE**, original
pin-to-pilot binding **PARTIAL / architecture mismatch**, real launch **BLOCKED**.
Managed Hermes is the sole agent layer; explicit Codex Responses and local
Ollama are target backends. Static CLI evidence is inactive and not attached
to Hermes admission. Tests cover signed direct-policy refusal, final direct
dispatch denial and inventory drift without provider execution. Existing
Job/Ready/Writer/budget/review/recovery gates and all six false flags remain.
Safe private anchor provisioning remains unqualified. Exactly one proposed
next atom: source-only backend-aware managed-Hermes admission contract.
This supersedes the provider ordering and next-atom statements below.

RF-HOST-035 [trusted provider pilot v1](trusted-provider-pilot-v1.md), 2026-09-23:
**real pilot PARTIAL; signed decision and fixture policy qualification DONE**.
Owner amendment v14 accepts Windows-account residual risk for exactly pinned
Codex and managed local Hermes, superseding full OS isolation as their pilot
prerequisite. Private signed decision/physical anchor and runtime/profile/model/
task scope are rechecked in the existing one-attempt containment registry;
revocation/drift and copied JSON deny. Both positive paths execute only the fixed
fixture with existing Job/review/cleanup. No real runtime/model admission issuer
or public activation was added; all six flags remain false. Next atom: one genuine
Codex pin bound to this decision and existing Job v2, synthetic checks and all
independent gates retained. LPAC/broker proposals below are historical.

RF-HOST-035 [LPAC read-only qualification](../operations/host-lifecycle-safety.md#lpac-read-only-qualification)
(2026-09-23): **candidate BLOCKED; overall PARTIAL**. Eight required dimensions
are mapped to Microsoft primary sources and bounded local OS/API/DACL/firewall
observations. LPAC alone does not establish an exact resource boundary,
credential-free provider authentication or endpoint-specific network policy.
One checkout is conceptually compatible, with explicit runtime/scratch exceptions;
no host changes or provider trials were made. Existing opaque pre-spawn binding
remains DONE and fixture-only; no real-provider issuer exists. Terminal evidence,
B28 recovery and all six false flags remain unchanged. Superseded next proposal:
source-only feasibility of a credential-free, raw-network-disabled LPAC tool
executor with the existing Worker mediating narrowly authorized inference/network
operations. This is an architecture proposal to evaluate, not an adopted adapter.

[Desktop/profile/Ollama inventory](hermes-desktop-ollama-profile-contract.md)
(2026-09-22) adopts **separate existing runtimes**, rejecting shared-runtime admission.
The repo-owned bounded probe failed closed; 45 comparable file samples were unchanged
and 8 were missing before execution. Windows view overlap, manual launch and protocol
remain unqualified. No manual profile, provider admission or RF-HOST-035 closure.
Point-2 preflight is **BLOCKED before private creation**: four candidate mutable
files resolve to managed files and updater/bootstrap/fallback confinement is
unqualified. No manual profile, launcher or point-3 work was created/started.
Point 2A is **DONE after removing live filesystem observers and one fresh attempt**.
All four official stages passed native exit/cleanup and filesystem postconditions.
Private Hermes 0.21.3 / Python 3.11.16 passed the bounded `--version` smoke, exact
commit/tree check, full containment/non-overlap audit and RECORD verification
(105 packages, 7,521 entries). Protected managed/profile trees and selected machine
state were unchanged. The installation receipt remains; prior failure diagnostics
and temporary logs/cache/tools were removed. The runtime prerequisite for separate
point 2B is ready; no profile/launcher/Desktop launch was performed. This postflight
audit is not an OS write sandbox. Managed admission remains unchanged; earlier
refusals remain historical evidence in the linked contract.

Point 2B is **DONE**: a separate owned `hermes-manual` home, Desktop-state directory,
versioned private receipt and pinned manual-CLI launcher exist. Configuration has
zero toolsets/fallbacks, disables external-login adoption and targets only local
Ollama `gpt-oss:20b`. Model state is **pending / not admitted**; launch refuses
before endpoint queries or execution until a separate point-3 admission. Offline
parser/default-merge validation, `--version` and launcher `--check` passed. The
accepted runtime and protected managed/profile fingerprints are unchanged. Point
3 prerequisites are ready; no model download, interactive launch or Roost activation.

The subsequent point-3 attempt is **BLOCKED**. Disk/store preflight passed, but
one real pull was stopped by native `output_limit` (exit 130) from unfiltered CLI
terminal repaint output. Owned pull/server cleanup passed; partial data remain
in the same store without an installed manifest or admission. No retry, launcher
model check or inference smoke followed. Manual runtime and managed/profile
fingerprints remain unchanged; 2B stays pending. A bounded progress worker now
passes synthetic native-Job verification, not a second real download.

The subsequently authorized single resume **completed the download**, verifying
the sole local `gpt-oss:20b` manifest/digest and 13,793,441,244 bytes, with 11.48 GiB
free afterwards. A smoke-only private admission and offline launcher check passed.
Point 3 remains **BLOCKED**: the owned Ollama server ended during the one manual
smoke attempt, without a verified response/backend. Its exact termination reason
was not retained; no causal claim is made. The installed model is preserved and
the attempt is consumed. No retry, interactive admission, Roost provider activation
or readiness-flag change is implied. The linked contract records cleanup/readback.

The separately authorized [load-only diagnosis](hermes-desktop-ollama-profile-contract.md#post-smoke-load-only-diagnosis)
is **INCONCLUSIVE for the historical cause**. One model load passed in 20.127 s
with no generated output; the server remained healthy until explicit shutdown.
Available RAM fell to 447 MiB and commit reached 98.25%, without proof of prior
OOM. Bounded server capture and descendant telemetry passed three synthetic
tests; the real load was not repeated. Native cleanup passed, model/profile/
runtime/state remained unchanged, and no Hermes smoke or Roost admission occurred.
Point 3 stays blocked pending a separately authorized smoke with resource margins.

The separately authorized [final manual smoke](hermes-desktop-ollama-profile-contract.md#final-manual-smoke-and-exact-model-admission)
completed **manual point 3 DONE** on 2026-09-23. One guarded local Hermes request
returned the expected short acknowledgement in 36.469 s, with context 2048,
reasoning low, 25 output tokens and no tools/remote fallback. Resource thresholds
passed immediately before inference. Exact model digest admission is limited to
the private `manual-ready` profile; both native Jobs exited 0 with cleanup and no
remaining processes. Full protected/runtime/model fingerprints and launcher
check passed. The historical cause remains inconclusive. No managed Roost
admission, six-flag change, Electron Desktop or automatic continuation follows.

[Desktop hookup audit](hermes-desktop-ollama-profile-contract.md#desktop-hookup-audit)
(2026-09-23): **DESKTOP BLOCKED**. Exact installed 0.17.6 artifacts support home
and Electron user-data overrides, but backend/interpreter fallback, bootstrap
and updater paths do not establish strict external-runtime isolation. No GUI
launcher or private mutation was made; the qualified CLI stays `manual-ready`.
Next requirement: an upstream-supported strict external-backend mode with
fail-closed identity and no install/repair/update/fallback, preserving the
manual no-tool policy. No UI, model, Ollama or provider was started.

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

RF-RUNTIME-005A [supervised quiet v1](hermes-supervised-quiet-v1.md) supersedes
waiting for stable stream-json for the first supervised pilot. Existing 0.21.2
public argv is accepted; sealed input, bounded UTF-8 stdout/stderr, one Worker
attempt and exact Git-visible dirty-byte review evidence have synthetic tests.
Native owned-tree stop, sealed effective config, auth, internal turns, tool
isolation and hard cost/token limits remain blocked. No readiness flag is raised.
B1/B2 retain historical profile-only isolation findings; that requirement is
superseded by the B3 owner decision. B5 is now blocked as described above. The sole next recommendation is B6
source-only minimal startup/tool/rotation contract selection, not started. No model
execution is admitted.
The RF003/RF004 incompatibility and next-task statements below are dated history.

RF-RUNTIME-004 [replacement-pin proposal v1](hermes-replacement-pin-proposal-v1.md)
rejects newest stable 0.21.3 / 345cd2b: the chat parser is identical to 0.21.2 and
lacks launch v1 JSONL output. Static review also finds quiet background follow-up
turns, auth/MCP deltas and installer unlocked-resolution fallback. Candidate
metadata is non-active; active pin/admission unchanged, no install or invocation.
RF005 stable upstream protocol gap is next; all execution/pilot/live gates false.

RF-RUNTIME-003 [Windows installation preflight](hermes-windows-installation-preflight-v1.md)
confirms the exact Hermes pin lacks launch v1's --format flag. Existing private
installation retained; no install/config/runtime action followed. Public admission
now reports hermes_cli_pin_incompatible despite asserted readiness. All gates
remain false; RF-RUNTIME-004 exact compatible official pin is the current next task.

RF-RUNTIME-002: [ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md) accepts
Roost → Windows Local Worker → native Hermes → Codex OAuth/model, with direct CLI
alternative and optional Herdr UX. Disposable VM/Windows Sandbox/Hyper-V is
rejected as a prerequisite and deferred as a qualification route. Retained
RF-HOST-010/RF-SEC-007/RF-ACT-002 controls are not waived. The
[Hermes CLI launch adapter v1](hermes-cli-launch-v1.md) separates provider dispatch,
validates a blocked public one-shot/JSONL candidate and rejects unqualified launch
before spawn; its synthetic parser proves bounded protocol handling only. No
installed-pin, native containment, private auth, hard budget or process cleanup
capability is promoted. Direct CLI argv/input and existing guards are preserved.
All execution/pilot/live gates remain false. RF-RUNTIME-003 exact private Windows
Hermes installation/configuration admission packet is the sole next task, not
started. Earlier recommendations below are historical and superseded in ordering.

RF-RUNTIME-001: [first-agent runtime decision packet v1](first-agent-runtime-decision-v1.md)
proposes an owner-approved supervised CLI milestone, with Roost as operational
truth and Local Worker as sole managed canonical-clone executor. Native Codex CLI
is the recommended first provider; Hermes MCP and Herdr terminal/status UX are
complementary optional roles. ADR-001/003 still target App Server; registry and
API readiness still name Hermes. Provider denial and hard output-token rejection
are independent deliberate guards, not flags to remove. The packet maps these
and environment/process/dirty-result gaps to an exact conditional sequence.
RF-HOST-010, RF-SEC-007 and RF-ACT-002 retain budget, exception-review and synthetic
readiness obligations; no autonomy or release criterion is weakened. RF023 blocks
only its disposable qualification route. Current upstream primary sources were
opened on 2026-09-15; no runtime compatibility is inferred. RF-RUNTIME-002 owner
decision is the sole next task in this correction, not started. All execution,
pilot and live gates remain false; accepted ADRs and executable registry unchanged.
The RF-CODEX entries below retain their dated route-specific next steps.

RF-CODEX-023: [disposable Windows read-only preflight](direct-codex-disposable-windows-preflight-v1.md)
returns DISPOSABLE-WINDOWS-PREFLIGHT-BLOCKED. Windows 11 Home build 26200 reports
9.61 GiB free RAM and 29.11 GiB free system-volume space at the observation time;
standard Sandbox entrypoint and discoverable Hyper-V module are absent, seven
exact feature queries return no rows. Hypervisor presence is not usable-boundary
proof. DWE-R02/R05/R07/R09 availability, budgets, baseline and cleanup remain
unqualified; technology/budget/deadline are null. No NSP/CAS gate, profile/schema
seal or registry v5 changed. No environment or Docker/WSL action occurred.
RF024 owner selection of an already provisioned qualification host and bounded
read-only evidence scope is the sole next task, not started. RF022 below is dated
contract history, not the current preflight status.

RF-CODEX-022: owner-approved ADR-003 version 2 and
[disposable Windows environment contract v1](direct-codex-disposable-windows-environment-v1.md)
permit one-off infrastructure/schema qualification, not a VM per agent task.
Technology remains unselected; every created resource must be planned, owned,
bounded and removed after success/failure with before/after metadata proof.
Existing shared accounts/rules/ACLs/services/registry/tasks/Docker/WSL/user data
remain untouchable. Any residual or unconfirmed cleanup is INCIDENT + BLOCKED;
only small sanitized evidence may remain. All admission/activation gates and
registry v5 are unchanged. RF023 read-only availability/resource-cost preflight
is the sole next task, not started. No host or environment action in RF022.

RF-CODEX-021: [native setup/outer-isolation admission](direct-codex-native-setup-admission-v1.md)
returns NATIVE-SCHEMA-SETUP-ADMISSION-BLOCKED. Private IPC v6 and restricted-token
child creation are source evidence, not a supported installed-helper contract.
Setup has unbounded waits/shared mutations; runner has pre-child side effects and
normal descendant preservation. Both vendor accounts and 16 selected rule summaries
match prior observations, not effective containment or an approved no-op delta.
Closed source ledger: 8 requests / 185,705 body bytes, all 200, no retries/redirects.
All gates/NSP/profile/schema/registry v5 remain unchanged. Next RF-CODEX-022: owner
architecture decision for a disposable Windows boundary and versioned schema-probe
contract; not started. No further general metadata research or live setup grant.

RF-CODEX-020: [Windows PE/source/schema binding](direct-codex-windows-build-binding-v1.md)
returns OFFICIAL-WINDOWS-PE-SCHEMA-BINDING-BLOCKED. The pinned release's native
Windows EXE has a different digest/size from the installed Appx child. Tag/workflow
and small package metadata do not bind that child to the source schema inventory;
an exact-digest attestation query returned 404. Final metadata round closed:
8 requests / 409,408 body bytes, seven 200s, one 404, zero retries/redirects.
Publisher-metadata route closed for this Appx; all gates/profile/schema/registry v5
unchanged. Next: RF-CODEX-021 minimal setup/outer-isolation admission for one bounded
exact-local-PE schema probe, not another metadata round. Not started.

RF-CODEX-019: [precomputed App Server schema qualification](direct-codex-precomputed-schema-v1.md)
returns PRECOMPUTED-APP-SERVER-SCHEMA-BLOCKED. Closed source inventory: 305 JSON
files / 3,492,670 declared bytes, with Git blob IDs only. Exact native PE/source
binding and raw-file SHA-256 remain unqualified. Full delivery exceeds NSP's
256-file limit; no limit changed. Closed/halted capture: 7 requests / 257,953
body bytes, including an unparsed 163,840-byte incomplete release response;
zero retries/redirects. No schema payload, generator, setup or Docker action.
All admission gates/profile/schema/registry v5 remain unchanged.
Next: RF-CODEX-020 bounded official native release metadata qualification;
not started. Earlier next-task entries below are historical handoffs.

RF-CODEX-018: [official native outer-launch qualification](direct-codex-native-outer-launch-v1.md)
returns OFFICIAL-NATIVE-SANDBOX-OUTER-LAUNCH-BLOCKED. The inspected CLI sandbox
implementation loads config before requesting a Windows child, can bootstrap
auth/cloud config, and supplies timeout_ms=None. Precomputed JSON export has a
small data-writing implementation; complete CLI dispatch and installed build
binding remain unproven. Static PE debug/string observations do not attest a
source version. Closed capture: 8 requests / 185,643 body bytes, one oversized
declaration rejected with zero body bytes, one 404, zero retries/redirects.
No setup, Codex or Docker action; all gates/profile/schema/registry v5 unchanged.
Next: RF-CODEX-019 read-only official precomputed JSON bundle/build qualification;
not started.

RF-CODEX-017: [Windows standard isolation qualification](direct-codex-windows-standard-isolation-v1.md)
returns WINDOWS-STANDARD-ISOLATION-BLOCKED. Official elevated command sandboxing
is the sole preferred dependency; a supported outer launch of the schema generator
before initialization remains unproven. Existing vendor principals and selected
firewall rules were observed, not modified or accepted as effective containment.
Closed official-source ledger: 8 requests, 166,058 body bytes, six 200s, one 404,
one unfollowed 301, zero retries. Exact shared-state mutation/rollback and effective
access remain gaps. No setup, Codex, network fixture or Docker operation occurred;
all gates/profile/schema/registry v5 remain unchanged. Next: RF-CODEX-018 read-only
official outer-launch interface qualification; not started.

RF-CODEX-016: [native schema-probe contract](direct-codex-native-schema-probe-v1.md)
and [acceptance matrix](direct-codex-native-schema-probe-acceptance-v1.md) retain
NATIVE-SCHEMA-PROBE-CONTRACT-BLOCKED. Seven own system fixture families passed,
including 62 gate denials and one Job parent/descendant stop measured at 2 ms.
These do not qualify filesystem/network isolation, exact raw-byte accounting,
full resource enforcement, package closure or a build-matched generator argv.
No Codex/model/network probe or host setup occurred; all activation gates and
registry v5 remain unchanged. Docker reads were unavailable, so current workload
continuity is unknown. Next: RF-CODEX-017 bounded read-only qualification of a
standard Windows filesystem/network isolation mechanism; not started.

RF-CODEX-015: accepted [ADR-003 native platform decision](../decisions/ADR-003-native-windows-codex-pilot.md)
selects Windows for the pilot, WSL2 deferred without automatic fallback.
[Exact native preflight](direct-codex-native-artifact-preflight-v1.md) remains
NATIVE-WINDOWS-ARTIFACT-PREFLIGHT-BLOCKED. Offline Windows verification accepted
the PE and five signed-catalog member bindings; full package binding, launch
closure/principal/race protection and build/wire mapping remain unproven.
RF009–013 remain deferred Linux evidence, not npm/Sigstore prerequisites for
Windows. All gates and registry v5 remain unchanged. Next: RF-CODEX-016 bounded
native no-model schema-probe contract/prerequisites; not started.

RF-CODEX-014: [platform comparison and decision candidate](direct-codex-platform-selection-v1.md)
returns NATIVE-WINDOWS-CODEX-PREFERRED: native Windows for pilot qualification,
WSL2 deferred without automatic fallback. Fresh Appx/PE/ACL/signing metadata and
official platform documentation support the simpler launch path, not runtime
qualification. Exact Codex version, accepted trust, schema, auth, containment and
budget proofs remain blocked; all gates, registry v5 and the WSL profile stay
unchanged. It supersedes RF013's Sigstore/Node follow-up. One next task is
RF-CODEX-015 native static preflight after platform acceptance; not started.

RF-HERMES-013: [standard provenance policy](direct-codex-standard-provenance-policy-v1.md)
and a fresh separate review retain STANDARD-PROVENANCE-POLICY-BLOCKED. Native npm,
pacote and Sigstore APIs were compared; sigstore@5.0.0 is the sole recommended
candidate, with proposed maintained verify/TUF dependencies and exact observed
source/SRI pins. Closed authenticated tool/runtime/root pins and standard
failure/network/time/input support remain unqualified. Capture closed at
12 requests/116,644 body bytes, one404, no redirects/retries/transport/limit errors.
No verifier/custom crypto was executed or extended. The streaming cap and A/B
proposal are non-operative; profile/gates and CDL clauses stay unchanged.
Exactly one next step is RF014 bounded standard toolchain/configuration
qualification under separate authority; not started here.

RF-HERMES-012: [independent provenance review](direct-codex-provenance-review-v1.md)
returns DETACHED-PROVENANCE-BLOCKED. A separate read-only agent independently
reproduced signature and Merkle mathematics; trusted roots, chain/SCT, authenticated
checkpoint/time/shard semantics and complete acquisition authority remain missing.
Fresh capture: 8 requests, 23,241 body bytes, zero redirects/retries/transport or
limit failures; one trust-target 404. Exact tarball HEAD read zero body bytes and
supplied no size. A package/native phase split is non-operative; CDL-R03/T03 and
coupled requirements, profile 3/75 values/53 nulls and every gate stay unchanged.
Exactly one follow-up is RF013 bounded independent trust/transparency policy
work, not started here. No acquisition, installation or execution occurred.

RF-HERMES-011: [official source research](direct-codex-official-source-research-v1.md)
is complete with [durable request accounting](codex-source-metadata-ledger-v1.json):
11 requests, 190,283 body bytes, one redirect, two HTTP 404s, zero retries or
transport/limit failures. Candidate @openai/codex@0.154.0-linux-x64 has published
provenance claims consistent with its package digest and release commit; signatures
remain unverified, and native member identity/size and compressed size are missing.
OFFICIAL-CODEX-SOURCE-BLOCKED is retained. PINNED_GENERATOR_CANDIDATE is documented,
not exact-build proof. Profile revision 3, all 75 values/53 nulls and gates remain
unchanged. The single next task is RF012 independent provenance/manifest security
review before acquisition; it was not started here.

RF-HERMES-010: the initial source research stopped after metadata/accounting
capture failed. Its lost counts remain unknown, not evidence of absent publisher
support. The separately authorized RF011 follow-up above completes the research
without recovering or reusing the failed attempt's budget.

RF-HERMES-009: [delivery contract v1](direct-codex-artifact-delivery-v1.md) and
[acceptance matrix](direct-codex-artifact-delivery-acceptance-v1.md) specify
16 CDL requirement/test pairs, mapped to D01/B01/B02 and CAS-R/T. Exact official
provenance, protected private placement, closed inventory, replacement protection,
bounded acquisition/retention and separate publisher-bundle or pinned-generator
schema routes are required. Source selection remains unresolved; B01/B02 and
all other blockers/gates remain unchanged. Profile revision 3 is unchanged.
Its RF010 official source/provenance research follow-up is recorded above.

RF-HERMES-008: [exact-artifact preflight](direct-codex-artifact-preflight-v1.md)
returns EXACT-CODEX-ARTIFACT-PREFLIGHT-BLOCKED. One Desktop-bundled ELF x86_64
candidate is readable from WSL but has no execute access. Package metadata and
blockmap matches are local observations, not exact Codex-version provenance;
inventory closure and version-bound wire artifacts remain missing. Profile
revision 3 adds E10 sources only, preserving 75 values, 53 technical nulls,
D01–D06 BLOCKED, D07 document-design DECIDED, nine blockers and all false gates.
Only static file/metadata reads occurred; no Codex execution or private receipt
was written. Its RF-HERMES-009 delivery-contract follow-up is recorded above.

RF-HERMES-007: [ADR-002 owner decisions](../decisions/ADR-002-codex-qualification-owner-decisions.md)
records owner-i01-a-v1, owner-i01-b-v1 and owner-i01-c-v1 on 2026-09-13;
I01 is RESOLVED. Profile revision 2 adds decision provenance only, preserving
all setting values/technical nulls, D01–D06 BLOCKED, D07 document-design DECIDED
and every false readiness gate. B03 is narrowed to responsible technical sizing
and qualification; B04/B08/B09 retain channel/retention/evidence gaps after policy
approval. All nine blockers remain open. Its RF-HERMES-008 follow-up is recorded
above; no compatibility probe runs.

RF-HERMES-006: [qualification decisions v1](direct-codex-qualification-decisions-v1.md)
records D01–D06 BLOCKED, D07 DECIDED for document/schema design, nine explicit
blockers and seven decision-to-CAS mappings. One normalized profile classifies
75 settings and seven research observations; all four gates remain false.
Existing ranges allow properly budgeted long tasks without adopting RF002 caps.
The responsible-user credential rule and separate external 80% dispatch rule
grant no Worker access/budget. Its original consolidated packet I01 is now
resolved by RF-HERMES-007 above; technical blockers are preserved.

RF-HERMES-005: [direct App Server contract v1](direct-codex-app-server-contract-v1.md)
defines CAS-R01..CAS-R30, mapped one-to-one to positive/negative families
CAS-T01..CAS-T30 in the [acceptance matrix](direct-codex-app-server-acceptance-v1.md).
Source facts are separated from required behavior and unproven pin mappings.
Existing budget/model/recovery rules are retained; RF002 limits remain research
only. RF-HERMES-006 records the current decision statuses; implementationReady=false, and all execution,
pilot and live-admission gates remain false. No runtime or v5 registry change.
Its RF-HERMES-006 follow-up is recorded above without implementation or activation.

RF-HERMES-004: [accepted ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md)
records Roost control plane/API → Local Worker → directly Codex App Server as
the pilot target, with Hermes optional outside enforcement and OpenShell optional
for isolation. A/B/C dispositions, component ownership and measurable Hermes
readmission criteria are explicit. This docs-only decision preserves registry v5,
executionSupported=false, pilotReady=false and liveAdmissionAllowed=false.
Its RF-HERMES-005 specification follow-up is recorded above, without implementation.
RF-HERMES-001..003 evidence and
all existing activation gates remain valid; no production adapter is approved.

RF-HERMES-003: [clean public transport API assessment](hermes-clean-transport-api.md)
audits exact pinned exports, import graph, CLI alternatives and ten Worker fields.
Fifteen controlled final probes distinguish five clean helpers, six dirty
client/session probes and four successful denial controls. Six portable tests
cover guard/privacy behavior. Verdict HERMES-CLEAN-TRANSPORT-API-BLOCKED; direct
bounded execution without mandatory Hermes was recommended and subsequently
accepted as the architectural target by ADR-001. This does not change existing
admission or authority, or qualify a production implementation.

RF-HERMES-002: [private Linux installation and synthetic transport](../operations/hermes-linux-synthetic-transport.md)
verifies pinned Hermes 0.21.2 and passes 29 independent Worker boundary cases.
The public Hermes session import triggers configuration/plugin discovery and two
denied filesystem mutation attempts before fake-server launch. Verdict is
HERMES-TRANSPORT-SYNTHETIC-BLOCKED; no Hermes turn, model or admission is proven.
The reusable byte/time/process-group boundary remains an unwired candidate.

RF-HERMES-001: [Hermes/Codex isolation assessment](hermes-codex-isolation-assessment.md)
pins official NousResearch stable identity, both Codex modes, primary OpenAI
documentation and 14 requirement rows. Reconstructed Git objects/trees and 29
selected blobs are bound by a deterministic offline validator. No lineage to the
alternative Hermes repository is established. OpenShell is optional/evaluated;
workspace-write coding remains a candidate with concrete adapter blockers and
no installation, model, runtime, pilot or release admission.

RF-HOST-047: [publication outcome](../operations/openshell-upstream-issue-publication.md)
records exact-text owner approval, fresh unchanged guidance/release checks and
bounded duplicate searches. One create attempt returned HTTP 403; successful
external writes are zero and read-only reconciliation found no matching issue.
No public URL or readback hash exists. The one-attempt boundary is consumed;
historical packets and runtime admission remain unchanged.

RF-HOST-046: [prepublication approval](../operations/openshell-prepublication-approval.md)
checks 76 fresh public responses, 16 source/guidance files and 24 issue/PR/discussion
queries with 49 individually classified candidates. No full-profile duplicate or
newer stable was found within the recorded inspection. Exact text hashes, current
template fields, expiry and all-false external authority are validated offline.
Owner selection A authorizes inspection only; final publication decision is pending.

RF-HOST-045: [owner decision packet](../operations/openshell-upstream-owner-decision.md)
binds exact issue/appendix/owner texts, three options with one recommendation,
all 16 requirements and 35 negative cases in seven groups, retained upstream
governance and historical RF043/RF044 identities. Offline integrity validation
grants no external action or execution. Owner decision remains pending.

RF-HOST-044: [dated official release inspection](../operations/openshell-official-release-inspection.md)
finds NO-NEWER-STABLE-RELEASE at 2026-09-13T02:07:56Z. All 16 requirements and
35 negative cases retain explicit nonqualifying dispositions; an offline validator
binds official release/tag/object evidence, source anchors and expiry. Existing
runtime pins and disabled admission remain unchanged.

RF-HOST-043: [nonwriting stdio upstream proposal](../operations/openshell-nonwriting-stdio-proposal.md)
binds 16 requirements, 35 denial cases, a provider-neutral receipt schema and
37 source blobs to a local acceptance contract. Specification validation is
READY; upstream implementation, runtime containment and live admission remain
unproven and disabled.

RF-HOST-042: [Docker v3 delivery analysis](../operations/openshell-docker-v3-delivery.md)
separates container rootfs, workspace and Landlock guarantees. Thirty source blobs,
a fail-closed validator and synthetic drift tests bind the BLOCKED conclusion;
RF037's retained selected findings cannot certify fixture path membership.

RF-HOST-041: [stdio-only v3](../operations/openshell-stdio-policy-v3.md) removes
unused network/scratch grants, excludes GPU enrichment and pins official/source
receipts. Conditional static READY, default v3 linter and rejection tests do not
establish runtime compatibility, confinement or execution admission.

RF-HOST-040: [official policy validation](../operations/openshell-official-policy-validation.md)
adds an unchanged-upstream Rust adapter, lockfile, byte-pinned runner and tests.
Two offline parser runs pass; supervisor baseline enrichment violates v2's
filesystem contract, so the aggregate verdict remains BLOCKED without activation.

RF-HOST-039: [reproducible fixture](../operations/openshell-reproducible-fixture.md),
source/build recipe, v2 byte validator and synthetic tests materialize one
private static ELF from two identical builds. Exact identities fail closed;
no fixture/runtime execution or activation is established.

RF-HOST-038: [minimal policy](../operations/openshell-minimal-policy.md) and its
separate immutable identity reject scope expansion through an offline linter
and synthetic tests. Static template READY is distinct from materialization,
official runtime validation and execution admission; all activation stays off.

RF-HOST-037: [static base audit](../operations/openshell-static-base-audit.md)
binds the final path inventory to the local pinned manifest/config/layer hashes.
Synthetic parser tests cover whiteouts, opaque paths, links and limits. Bundled
agents/system tools and permissive policy are documented; execution remains off.

RF-HOST-036: [pinned OpenShell artifacts](../operations/openshell-installation-preflight.md#rf-host-036-installed-artifacts-and-proof-limits)
are installed and hash/digest/platform verified under separate owner authority.
Only the CLI version was invoked; no image contents, gateway or agent ran.
Existing-workload continuity passed; execution admission remains disabled.

RF-HOST-035: [host lifecycle safety](../operations/host-lifecycle-safety.md)
advances provider contract to v5. API/Worker deny both uncontained providers,
retain checkpoints on host-maintenance failures and grant no host-control tools.
Two natural-use cycles passed after owner recovery; healthy Running is allowed.
The separate pinned-install prerequisite verdict does not activate execution.


Version: ROOST-REQUIREMENTS. Audit baseline: `36be71bcef2dced598f41f6377724741f4eb2107`.
Decision authority: [current accepted requirements](../product/requirements.md).
One row per stable requirement; repeated interview approvals share acceptance clauses.
This matrix is product verification truth, not a task board or execution history.

## Reading the evidence

The required status vocabulary is: **działa** (works within the stated scope),
**częściowo działa** (partial), **brak** (missing), **wymaga konfiguracji**
(needs configuration), **wymaga testu** (needs verification).
Code existence never proves autonomous operation. “Works” on a governance
prohibition means the documented current boundary, not a new automated enforcement
claim. Deferred/superseded rows are excluded from activation blockers and work
selection; “missing” there is intentional, not permission to implement them.

Evidence links identify inspected code/config and available tests. Unless a
specific proof is stated below, tests were **not rerun for that requirement** and
production configuration/behavior are **unverified**. In particular there was
no DemoApp audit, exchange permission check, live test, agent activation or
readiness certification. Generic record CRUD is only a partial mechanism.

Historical proof: packet gate commit `90adf37e`, pre-spawn recovery
`982d4809`, observer/provisioning `271beb36`, Windows login state fix
`f0c7faae`, portfolio exclusion `36be71bc`.
Earlier observer delivery reported real start/stop/singleton and reconnect
checks, API 15/15 and production health on f0c7faae. This is historical evidence,
**not current V2 production verification**. Real Windows relogin/reboot and
forced-process-crash restart remain unproven. Git history is the commit mapping
for later changes to these same canonical files.

## Atomic P0 selection

The retained baseline includes versioned Submit, single-task scope, pinned Ready
context, explicit roles, source invalidation and active context stopping.
The current bounded P0 slice is **RF-SEC-012: native serious-incident suspension**.

The [suspension contract](native-capability-suspension.md) adds exact task,
application, operation and principal/credential/host containment, with durable
deny at native grant/review/runtime admission. Independent versioned remediation
proof and a current owner decision are required for restoration. Old grants and
stopped attempts cannot regain authority. Owner intervention requires reread and
replan, without automatic undo.

Verification: `src/tests/api.test.ts`,
`scripts/capability-suspension-migration.test.mjs` (preserves 71 synthetic
historical sanitizer incidents), `scripts/capability-suspension-ui.test.mjs`
(PL/EN, phone/tablet/desktop), and existing context-stop/recovery host suites.
These synthetic checks do not activate agents or scan production history.
The retained [redaction policy](native-runtime-redaction.md) and
[exact task grants](task-capability-grants.md) remain required. RF-SEC-012 is
partial in the full company: external broker containment, automatic risk
classification and remediation are outside this scope. Production execution
stays disabled and the canonical host stays observe.

### <a id="e-app-operation"></a>E-APP-OP — reusable application operation

Gate 5 is met at native/deployed-console evidence level on 2026-10-04, within
the bounded second-application outcome. The chronological evidence below retains
earlier failed attempts and incomplete milestones. Source and test evidence adds strict
canonical read fragments, additive native risk classification, primary-owner
takeover baseline guards and evidence-derived portfolio/record navigation.
Root checks: 37/37 focused API/model/UI tests; 29/29 Worker fragment/prior-audit
tests; 6/6 tests including real disposable PostgreSQL baseline/risk guards,
zero skips; `npm run validate` and `npm run codex:check` PASS. A bounded
managed auditor `bc979125-4c58-47a9-b9ba-8e7cd480d57d` and independent verifier
`efdbb7a8-e3eb-48a1-b5bb-9ba2188c380c` completed with signed unchanged native
Git/process/container receipts and closed Windows Jobs. Actual model inputs
were 121,283 and 126,373 bytes within the 131,072-byte cap. The primary owner
accepted bounded baseline `9321633f-fafa-4fb3-9265-cb418c20a062`; it conveys no
first-write or release authority. Roost `2678d3d7` exact build/health passed.
Separate first-write consent `33ba7f20` is accepted. Coder `b359092f` exhausted
eight tool turns without edits or tests; fixed verification refused the missing
test. Genuine signed terminal review and closed Job plus exact current unchanged
footprint qualified native recovery: only lease/Writer fences were released,
with the failed review and consumed attempt retained. Root verified 29 native
Windows recovery tests; independent compatibility checks pass 71/71, zero skips.
New initial-branch reuse requires current first-write admission and a
lease-bound predecessor POST; arbitrary execution GET remains forbidden.
Root checks pass 31 native continuation tests and 128 refusal/auth tests,
including JSONB receipt ordering, foreign scope and expired/revoked credentials.
At that recovery milestone, coding/review and native console proof were outstanding.
Roost `d0397e7e` exact deployment/build/health is proven. Separately admitted
coder `b7aa2342-bd65-499e-b0c2-aa7c4aa99706` exhausted 24 actual API turns;
native verification refused four scoped tracked edits with no test or commit.
Its original closed Job, refused review and Writer/lease are retained.
The new recovery-only owner admission/status/result and Worker integration
pass 160 focused refusal/auth tests.
Fixed tracked recovery passes 24 native tests, including six interruption
points without replay, plus 31 unchanged-refusal regressions. Root independently
verified the native restore/reconciliation fixture and actual four-file read-only
inspection through the official Windows entrypoint. Recovery transport passes
36 tests; safe console projection passes 31 tests. The explicit bounded
48-turn tier passes 51 budget/tier tests. No fixture grants application recovery,
candidate acceptance or a new dispatch.
CRLF restoration and the scoped closed-Job PID identity correction pass
7 focused native cases independently, with 3 root native cases also passing,
zero skips. These cover exact authorized anchors, refresh interruption,
same/older identity denial, positively newer identities and retained legacy
PID-reuse denial. `codex:check` and scoped syntax/diff checks pass.
Actual official recovery request `7bbbc723-c9d2-43fb-a004-7374195e6e41`
archived/restored all four refused files in four closed Windows Jobs, exit 0,
and returned clean baseline `0e54945a`/main with the empty task branch removed.
Roost recorded journal digest `005f3a9e74a7b4df7570f5b62b442f5a13fcf67bd4674c3c9f683d181507f5ee`.
Normal native reconciliation and signed-pair retirement preserve the failed
review/spent bytes and release only owned fences. No model or remote effect.
Roost `02db23e3` exact deployment/health and Worker `83b5f112` source/native proof
are distinct. Separately admitted 48-turn coder
`2680be9f-513d-4ee2-a5dc-7f69a9af059a` completed with a closed Windows Job,
`verified_candidate`, passing six actual formatter/React/TypeScript tests and
clean local commit `3cf9645e1823b892bdaa1dc6d24840f350ffe8ef` on its owned branch.
Root app diagnostics and external build pass; unchanged node-config typing and
full backend/browser operation remain unverified. Worker `cde34ea7` binds a
complete lossless CRLF diff certificate; 63 root codec/reviewer tests and five
focused native collector/Job cases pass. Concise rules `e9f1ca2e` pass 96
provider/reviewer tests. Oversized reviewer `04112b58` was cancelled before claim;
reviewer `ab75f1c9` failed before model/signing on duplicate runtime Decisions.
Normal supersession `43ba8ba3` retired only the older duplicate; fresh Ready
`a5d90c1a` and grant `6faf9a8c` queued reviewer `7f78d3c2`, with complete input
130,841/131,072 bytes and two-turn read-only selection. It completed at
04:46:43 UTC with exact independent approval `674c5607-60c9-48b6-a81c-cfae4d5604fa`
for `3cf9645e` / material `c19c08a4`, unchanged native state and a closed zero-exit
Job with zero remaining processes. Root read-back confirms approval and clean
candidate, normal stopped Worker and released writer. At 04:47 UTC owner console
proof was pending; no app push/deploy. Signed-pair retirement
retains its native review/spent bytes and leaves candidate/branch unchanged.
Portfolio projects the accepted target instead of its completed native review
helper only after exact persisted/current material, actors, native audit and Job
bindings. Owner waiting and new missing context still block; baseline limitations
remain historical. Twenty-four focused projection/receipt/UI tests and full
`npm run validate` pass; authenticated browser proof was pending at that milestone.
An exact current acceptance after a timestamped group-risk invalidation resolves
only the result projection; later/unknown invalidation and actual owner waiting
still block. Fresh execution/release authority is never inferred.
Roost `4ed3289056d3db0cc57c374fe0270a5d4368dc9d`, deployment
`gi3tc1464riyefqgnpv5a54r`, finished at 05:02:56 UTC; health and build-info
return 200 with that exact commit. Production portfolio selects the accepted
bounded coding outcome, accountable manager and exact independent-review link;
whole-product/sale readiness remains unverified. At 05:02 UTC Gate 5 still
required authenticated owner-console and actual Decision queue/history proof.
Fixed coding/test suites pass 20 tests with three explicit fixture/privilege
skips. An independent root native run of the sealed React 18.3.1/ReactDOM
18.3.1/TypeScript 5.9.3 toolkit passes both actual empty/populated component
assertions in a closed Windows Job; this synthetic proof changes no application
source and does not certify browser layout. Shared roles and the existing base
procedure are reused with application-specific context/extension. See
[controls and claim boundary](../operations/internal-application-operation.md).

Final authenticated native browser proof observes all four configured portfolio
records: the pilot has its bounded release proof plus actual pending historical
Decisions; two unaudited apps remain unmet; the second app shows implementation,
owner-adopted baseline, nearest accepted repair, accountable manager, no reported
blockers/Decisions and links to the actual audit and exact `3cf9645e` independent
review. No declared score overrides these states. The Task Review modal shows
the six passed sealed native tests, clean candidate, exact current independent
acceptance and separate ungranted release authority. The evidence cockpit loads
without error; its empty Findings list, unset canonical language and explicit
catalogue truncation are retained rather than fabricated or silently omitted.

The real owner queue history is complete: baseline `9321633f` proposed
01:40:11 UTC and accepted 01:50:38; first-write `ae84a00e` proposed 01:56:39
and accepted 01:58:19; exact eight-path supersession `33ba7f20` proposed
02:03:43 and accepted 02:05:08. Private checkpoint records the actual safe
`baseline_accepted_first_write_pending` phase. Managed coding followed these
separate decisions; no new artificial pending Decision was created for proof.
The browser register and direct baseline/first-write modals expose the actual
authority, impact, limits, supersession and explicit-acceptance timestamps.

Concurrent native console GETs initially returned explicit aborted
`task_ready_context_conflict` responses. Scoped read retries, short backoff,
deferred register/interview queues and actual HTTP-envelope identity checks
repair the generic path without changing source fences or replaying commands.
Final direct Decision and Task-readiness navigation succeed on first load
without manual Refresh/Retry. Direct Task entry defers the board until close;
client/server `no-store` prevents stale readiness responses. Concurrent native
editor/impact/catalogue reads pass while preserving `risk_context_changed`.
36 focused read-contention/navigation/operation-service/PL-EN projection tests
pass with zero skips; `npm run validate`, `npm run codex:check` and scoped diff
checks pass. Roost `d7a5e0dec1c81648f054e2976ddf61cc7290fe7e`, deployment
`zz06emosz1v0nbxkwvvsd70t`, finished/observed 12:24:25 UTC with exact 200 health
and build-info. Before deployment, encrypted backup `29ec8ed6` and isolated
restore/schema/data parity passed; the owned restore database is absent.
Only Roost was pushed/deployed. The clean second-app candidate/branch and
earlier pilot handoff are retained; Worker is stopped and Writer is released.
Unchanged node-configuration typing, whole backend/browser/mobile operation,
product/sale readiness and unavailable physical provider cost/usage remain
explicit limitations. No later phase was started.

Second-application bounded release preparation continues separately from Gate 5.
Exact `c82e68b3` has seven passing tests, a separate closed native build and
independent acceptance `25632c42`; the preceding candidate was rejected for its
missing regression log. Roost `58244abe` and its additive post-observation CHECK
migration are deployed. Fresh backup `727c73a3` and isolated migration adoption
`88b04363` verify full schema/data/sequence parity and absence of the owned restore
database. Normal API credential/reference configuration, baseline pinning and
native ingress/DB/cadence maintenance are verified. Real-runtime discoveries
produced Worker paused-state, PostgreSQL address/admin and namespace-ingress
fixes. Bounded fence renewal proved public denial/opening and unchanged data,
schema and sequences. A fresh eight-file package leaves the original eight intact.
Native audits `323aca74` and `0907f482` closed unchanged with signed receipts;
both retain `CHANGES_REQUIRED` for owner authority and unexecuted release proof.
The latter confirms accepted source/test/build basis; no final readiness or
post-release acceptance is claimed. Full Worker proof remains pending. No second-application
release grant, push/deploy, synthetic fixture write or runtime-resume claim.
See [current operations evidence](../operations/governed-compose-release.md).
Native configuration hashes now agree after excluding lazy ORM relations from
persisted settings; environment/storage seals remain. PHP regression checks and
541 Compose component checks pass. The exact package is sealed; release proof is pending.

## Matrix

| Requirement | Priority | Status | Inspected evidence | Remaining boundary / proof |
| --- | --- | --- | --- | --- |
| [RF-PROD-001](../product/requirements.md#rf-prod-001) | P1 | nieocenione | [DOC](#e-doc) | Reusable self-hosting and private-configuration behavior require an implementation audit. |
| [RF-PROD-002](../product/requirements.md#rf-prod-002) | P2 | nieocenione | [ORG](#e-org) | Configurable composition is accepted intent; the migration design remains deferred under OPEN-ORG-001. |
| [RF-PROD-003](../product/requirements.md#rf-prod-003) | P1 | nieocenione | [DOC](#e-doc) | Canonical shared records, stewardship and contextual projections require an implementation audit. |
| [RF-PROD-004](../product/requirements.md#rf-prod-004) | P2 | nieocenione | [ORG](#e-org) | Editable onboarding templates are not part of the current runtime delivery gate. |
| [RF-PROD-005](../product/requirements.md#rf-prod-005) | P1 | nieocenione | [AUTH](#e-auth) | Existing roles are evidence only; multi-human onboarding is not a current gate. |
| [RF-PROD-006](../product/requirements.md#rf-prod-006) | P1 | nieocenione | [AUTH](#e-auth) | Role-scoped projections and correctable inferred context require an implementation audit. |
| [RF-PROD-007](../product/requirements.md#rf-prod-007) | P1 | nieocenione | [ORG](#e-org) | Department stewardship over shared capabilities and records is not yet reconciled. |
| [RF-PROD-008](../product/requirements.md#rf-prod-008) | P2 | nieocenione | [ORG](#e-org) | Safe post-launch composition changes await the configurable-composition phase. |
| [RF-PROD-009](../product/requirements.md#rf-prod-009) | P2 | nieocenione | [DOC](#e-doc) | This packaging boundary is accepted policy; no separate-module implementation is required now. |
| [RF-PROD-010](../product/requirements.md#rf-prod-010) | P0 | nieocenione | [GOV](#e-gov) | Actor-neutral authority and lowest-authorized escalation need end-to-end runtime proof. |
| [RF-PROD-011](../product/requirements.md#rf-prod-011) | P0 | częściowo działa | [RELEASE](#e-release), [APP-OP](#e-app-operation) | Governed pilot delivery and second-app audit/coding/exact acceptance are proven. This internal bounded delivery system does not establish completion of either whole application or arbitrary further onboarding. |
| [RF-PROD-012](../product/requirements.md#rf-prod-012) | P0 | częściowo działa | [APP-OP](#e-app-operation), [RELEASE](#e-release) | Fixed Worker scripts collected/tested/restored; separate authorized agents audited/coded/reviewed; owner baseline and first-write decisions remain reserved. General company operations remain partial. |
| [RF-PROD-013](../product/requirements.md#rf-prod-013) | P0 | częściowo działa | [GOV](#e-gov), [APP-OP](#e-app-operation) | Second-app pinned requester, accountable manager, executor and independent verifier remain distinct; portfolio names the manager. General case/process accountability transfers remain unverified. |
| [RF-OUT-001](../product/requirements.md#rf-out-001) | P0 | częściowo działa | [ATTENTION](#e-attention), [APP-OP](#e-app-operation) | Actual portfolio exposes outcome, manager, blockers/Decisions and canonical evidence; owner pending-to-consent-to-native-continuation history is verified. The complete company attention lifecycle remains unverified. |
| [RF-OUT-002](../product/requirements.md#rf-out-002) | P1 | nieocenione | [ATTENTION](#e-attention) | Actionable attention, rationale and authorized reprioritization require an implementation audit. |
| [RF-OUT-003](../product/requirements.md#rf-out-003) | P1 | częściowo działa | [DEC](#e-dec), [APP-OP](#e-app-operation) | Actual owner baseline/first-write modals show computed downstream impact, separate acceptance and original/superseding history. Semantic company-wide impact remains outside this proof. |
| [RF-OUT-004](../product/requirements.md#rf-out-004) | P2 | nieocenione | [DOC](#e-doc) | Baselines and numeric targets intentionally remain unmeasured until operation begins. |
| [RF-OUT-005](../product/requirements.md#rf-out-005) | P0 | działa | [DOC](#e-doc) | Current handoff and AGENTS instructions require gate evidence and reject atom/percentage completion claims. |
| [RF-OUT-006](../product/requirements.md#rf-out-006) | P1 | nieocenione | [GOAL](#e-goal) | Goal/risk/dependency-based priority and mandate-aware escalation require implementation proof. |
| [RF-OUT-007](../product/requirements.md#rf-out-007) | P1 | nieocenione | [GOAL](#e-goal) | Measurable goals, evidence sources and forecast/deadline separation require an audit. |
| [RF-APP-001](../product/requirements.md#rf-app-001) | P0 | częściowo działa | [PORT](#e-port), [APP-OP](#e-app-operation) | Two existing applications have governed bounded outcomes; no whole-application completion or sale readiness is claimed. |
| [RF-APP-002](../product/requirements.md#rf-app-002) | P2 | nieocenione | [PORT](#e-port) | Full commercialization lifecycle is accepted later-phase intent, not a current delivery gate. |
| [RF-APP-003](../product/requirements.md#rf-app-003) | P0 | częściowo działa | [FIND](#e-find), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Pilot and second-app independent audits, owner-adopted bounded baselines and governed repairs passed; full product takeover remains unverified. |
| [RF-APP-004](../product/requirements.md#rf-app-004) | P1 | nieocenione | [HEALTH](#e-health) | Product-ready and sale-ready controls require application-specific evidence. |
| [RF-APP-005](../product/requirements.md#rf-app-005) | P1 | częściowo działa | [PORT](#e-port), [APP-OP](#e-app-operation) | Second-app baseline pins intended operator, actual defect and measured truthful-activity outcome. Broader primary market user and whole-product core-path criteria remain unspecified/unverified. |
| [RF-APP-006](../product/requirements.md#rf-app-006) | P1 | nieocenione | [HEALTH](#e-health) | Critical-blocker classification needs application-specific health and risk evidence. |
| [RF-APP-007](../product/requirements.md#rf-app-007) | P1 | nieocenione | [DEC](#e-dec) | Limitation acceptance requires a real readiness decision and attached evidence. |
| [RF-APP-008](../product/requirements.md#rf-app-008) | P1 | nieocenione | [REVIEW](#e-review) | Owner readiness acceptance has not been exercised for a configured application. |
| [RF-APP-009](../product/requirements.md#rf-app-009) | P0 | częściowo działa | [DOC](#e-doc), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Existing pilot and second-app repositories, histories, own assumptions and pinned context were reused. Other portfolio applications still require their own audit and safe onboarding. |
| [RF-APP-010](../product/requirements.md#rf-app-010) | P0 | częściowo działa | [PORT](#e-port), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Pilot adoption/repair and second-app native audits, owner baseline/first-write, coding/exact independent acceptance and authenticated console passed. New empty-app creation and broader product takeover remain unproven. |
| [RF-APP-011](../product/requirements.md#rf-app-011) | P0 | częściowo działa | [CTX](#e-ctx), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Two bounded audits compare pinned requirements, source and Git/native observations with classified assumptions and independent evidence. Full financial/product audit and second-app deployed parity remain unverified. |
| [RF-APP-012](../product/requirements.md#rf-app-012) | P0 | częściowo działa | [DOC](#e-doc), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Shared base/roles with own application context/extension ran in pilot delivery and second-app audits/coding/exact independent acceptance. Full application operation remains unproven. |
| [RF-APP-013](../product/requirements.md#rf-app-013) | P1 | częściowo działa | [PORT](#e-port), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Two bounded repairs have evidence-backed acceptance; pilot release also has production proof. Historical failures and recovered refusals remain distinct from success. General lifecycle readiness is unverified. |
| [RF-APP-014](../product/requirements.md#rf-app-014) | P1 | działa | [ATTENTION](#e-attention), [RELEASE](#e-release), [APP-OP](#e-app-operation) | Authenticated four-app portfolio shows proven stages, nearest outcomes, managers, actual blockers/Decisions and canonical evidence. All five gate states and PL/EN safe unknowns have focused tests; actual owner waiting/approved continuation and exact evidence links passed. This proves the scoped portfolio projection, not complete application readiness. |
| [RF-APP-015](../product/requirements.md#rf-app-015) | P2 | nieocenione | [HEALTH](#e-health) | Controlled commercial launch is a later gate after application completion. |
| [RF-BIZ-001](../product/requirements.md#rf-biz-001) | P2 | nieocenione | [DOC](#e-doc) | Application/Roost authority boundaries are later sale-readiness work. |
| [RF-BIZ-002](../product/requirements.md#rf-biz-002) | P2 | nieocenione | [DOC](#e-doc) | Canonical customer identity is later business-operation scope. |
| [RF-BIZ-003](../product/requirements.md#rf-biz-003) | P2 | nieocenione | [DOC](#e-doc) | Subscription lifecycle behavior awaits a selected offering and provider path. |
| [RF-BIZ-004](../product/requirements.md#rf-biz-004) | P2 | nieocenione | [IDEMP](#e-idemp) | Financial automation is later scope and awaits provider-specific implementation. |
| [RF-BIZ-005](../product/requirements.md#rf-biz-005) | P2 | nieocenione | [ATTENTION](#e-attention) | Financial synchronization and failure attention await provider selection. |
| [RF-BIZ-006](../product/requirements.md#rf-biz-006) | P2 | nieocenione | [TEST](#e-test) | Sandbox-to-live commercial proof is later scope. |
| [RF-BIZ-007](../product/requirements.md#rf-biz-007) | P2 | nieocenione | [GOV](#e-gov) | Reserved financial approvals remain policy until providers are selected. |
| [RF-BIZ-008](../product/requirements.md#rf-biz-008) | P2 | nieocenione | [DOC](#e-doc) | Revenue view is later business-operation scope. |
| [RF-BIZ-009](../product/requirements.md#rf-biz-009) | P2 | nieocenione | [INTEGRATION](#e-integration) | Field authority and provider provenance need provider-specific audits. |
| [RF-SUP-001](../product/requirements.md#rf-sup-001) | P2 | nieocenione | [INCIDENT](#e-incident) | Customer-application incident intake is later support scope. |
| [RF-SUP-002](../product/requirements.md#rf-sup-002) | P2 | nieocenione | [ATTENTION](#e-attention) | Canonical customer support cases are later support scope. |
| [RF-SUP-003](../product/requirements.md#rf-sup-003) | P2 | nieocenione | [FIND](#e-find) | Customer-input classification is later support scope. |
| [RF-SUP-004](../product/requirements.md#rf-sup-004) | P2 | nieocenione | [ATTENTION](#e-attention) | Public support channel commitments remain deferred. |
| [RF-SVC-001](../product/requirements.md#rf-svc-001) | P2 | nieocenione | [DOC](#e-doc) | Offering thresholds and prices remain deferred under OPEN-SVC-001. |
| [RF-SVC-002](../product/requirements.md#rf-svc-002) | P2 | nieocenione | [DOC](#e-doc) | Exact deposits and milestone amounts remain deferred under OPEN-SVC-001. |
| [RF-SVC-003](../product/requirements.md#rf-svc-003) | P2 | nieocenione | [DEC](#e-dec) | Paid scope-change operation is later service-delivery scope. |
| [RF-SVC-004](../product/requirements.md#rf-svc-004) | P2 | nieocenione | [AUTH](#e-auth) | Customer-side authority is later service-delivery scope. |
| [RF-SVC-005](../product/requirements.md#rf-svc-005) | P2 | nieocenione | [REVIEW](#e-review) | Customer milestone acceptance is later service-delivery scope. |
| [RF-SVC-006](../product/requirements.md#rf-svc-006) | P2 | nieocenione | [FIND](#e-find) | Defect-versus-scope-change classification is later service scope. |
| [RF-SVC-007](../product/requirements.md#rf-svc-007) | P2 | nieocenione | [DOC](#e-doc) | Exact review and deemed-acceptance terms remain deferred under OPEN-SVC-002. |
| [RF-SVC-008](../product/requirements.md#rf-svc-008) | P2 | nieocenione | [DOC](#e-doc) | Warranty implementation and legal wording are later scope. |
| [RF-SVC-009](../product/requirements.md#rf-svc-009) | P2 | nieocenione | [AUDIT](#e-audit) | Handover, rights and asset separation are later service scope. |
| [RF-SVC-010](../product/requirements.md#rf-svc-010) | P2 | nieocenione | [DEC](#e-dec) | Refusal/exit handling is accepted policy awaiting service operation. |
| [RF-SVC-011](../product/requirements.md#rf-svc-011) | P2 | nieocenione | [AUTH](#e-auth) | Customer-system identity and least-scope access are later service scope. |
| [RF-SVC-012](../product/requirements.md#rf-svc-012) | P2 | nieocenione | [AUDIT](#e-audit) | Project-close access revocation and retention await the service phase. |
| [RF-SVC-013](../product/requirements.md#rf-svc-013) | P2 | odroczone | [DOC](#e-doc) | Dedicated customer staging/anonymization waits for the service phase and resources. |
| [RF-INT-001](../product/requirements.md#rf-int-001) | P1 | nieocenione | [INTEGRATION](#e-integration) | Provider-only work and exact synchronized authority need integration-specific proof. |
| [RF-INT-002](../product/requirements.md#rf-int-002) | P1 | nieocenione | [INTEGRATION](#e-integration) | Native-completeness and adapter-necessity rules need capability-by-capability audit. |
| [RF-INT-003](../product/requirements.md#rf-int-003) | P1 | nieocenione | [INTEGRATION](#e-integration) | Field authority, provenance and unverified identity behavior need end-to-end proof. |
| [RF-INT-004](../product/requirements.md#rf-int-004) | P1 | nieocenione | [BROKER](#e-broker) | Classification, least scope and offboarding require provider-specific proof. |
| [RF-INT-005](../product/requirements.md#rf-int-005) | P1 | nieocenione | [INTEGRATION](#e-integration) | Conflict handling, stale state and bounded catch-up require integration proof. |
| [RF-INT-006](../product/requirements.md#rf-int-006) | P2 | odroczone | [DOC](#e-doc) | Export, archive/delete and disconnect lifecycle details remain deferred under OPEN-DATA-001. |
| [RF-SCOPE-001](../product/requirements.md#rf-scope-001) | P2 | odroczone | [DOC](#e-doc) | Native mobile is explicitly outside the current MVP. |
| [RF-SCOPE-002](../product/requirements.md#rf-scope-002) | P2 | poza zakresem | [DOC](#e-doc) | Company City and gamification are rejected roadmap directions. |
| [RF-SCOPE-003](../product/requirements.md#rf-scope-003) | P2 | odroczone | [DOC](#e-doc) | Native billing, marketplace, multi-tenant SaaS and full CRM are outside the current phase. |
| [RF-SCOPE-004](../product/requirements.md#rf-scope-004) | P2 | odroczone | [DOC](#e-doc) | Prospect and service-sales implementation follows proven application completion. |
| [RF-SCOPE-005](../product/requirements.md#rf-scope-005) | P2 | odroczone | [AUTH](#e-auth) | Invitation delivery, multi-human onboarding and external notifications are not current gates. |
| [RF-SCOPE-006](../product/requirements.md#rf-scope-006) | P2 | odroczone | [DOC](#e-doc) | Customer-project staging/anonymization is deferred and does not alter the owner-controlled runtime. |
| [RF-GOV-001](../product/requirements.md#rf-gov-001) | P0 | częściowo działa | [GOV](#e-gov) | No complete delegated-mandate enforcement. |
| [RF-GOV-002](../product/requirements.md#rf-gov-002) | P1 | częściowo działa | [GOAL](#e-goal) | CRUD exists; orphan, duplicate and owner-intent guards incomplete. |
| [RF-GOV-003](../product/requirements.md#rf-gov-003) | P1 | częściowo działa | [ORG](#e-org) | Registry exists; peer authority and manager configuration need verification. |
| [RF-GOV-004](../product/requirements.md#rf-gov-004) | P0 | częściowo działa | [ORG](#e-org) | Current multi-department workforce needs accountable-department semantics. |
| [RF-GOV-005](../product/requirements.md#rf-gov-005) | P1 | częściowo działa | [ORG](#e-org) | Organizational relations exist without enforced routing. |
| [RF-GOV-006](../product/requirements.md#rf-gov-006) | P1 | częściowo działa | [ORG](#e-org) | Workforce and ephemeral sessions exist; lifecycle orchestration incomplete. |
| [RF-GOV-007](../product/requirements.md#rf-gov-007) | P1 | częściowo działa | [ORG](#e-org) | Role records exist; catalog coverage and activation process unverified. |
| [RF-GOV-008](../product/requirements.md#rf-gov-008) | P1 | częściowo działa | [ORG](#e-org) | Missing enforced HR qualification flow. |
| [RF-GOV-009](../product/requirements.md#rf-gov-009) | P1 | brak | [ORG](#e-org) | No verified evaluation or remediation engine. |
| [RF-GOV-010](../product/requirements.md#rf-gov-010) | P1 | brak | [ORG](#e-org) | No competency certification lifecycle. |
| [RF-GOV-011](../product/requirements.md#rf-gov-011) | P1 | częściowo działa | [ORG](#e-org) | Role data does not enforce separation. |
| [RF-GOV-012](../product/requirements.md#rf-gov-012) | P1 | częściowo działa | [ORG](#e-org) | Profile configuration and allocation unverified. |
| [RF-GOV-013](../product/requirements.md#rf-gov-013) | P1 | brak | [SCHED](#e-sched) | No governed subagent scheduler. |
| [RF-GOV-014](../product/requirements.md#rf-gov-014) | P0 | częściowo działa | [AUTH](#e-auth) | Immutable workforce-bound keys and current DB principal checks govern native review/manager commands, with expiry, atomic rotation, revocation and agent/credential audit. Other legacy command classes remain outside this slice; native review writes also require RF-SEC-003 task grants. |
| [RF-GOV-015](../product/requirements.md#rf-gov-015) | P0 | działa | [GOV](#e-gov) | Boundary is governing policy; no DemoApp change authorized. |
| [RF-GOV-016](../product/requirements.md#rf-gov-016) | P0 | działa | [GOV](#e-gov) | Current documentation requires one implementation owner to carry the end-to-end outcome; internal substeps are not STOP boundaries. Runtime completion remains governed by the other rows. |
| [RF-GOV-017](../product/requirements.md#rf-gov-017) | P0 | działa | [DOC](#e-doc) | 225 current accepted/deferred/rejected requirements have stable IDs and map to inspected evidence and limitations. Git retains superseded wording outside the active registry. |
| [RF-GOV-018](../product/requirements.md#rf-gov-018) | P0 | działa | [GOV](#e-gov) | Current documentation defines the four true owner dependencies and keeps ordinary technical resolution with the implementation owner. |
| [RF-GOV-019](../product/requirements.md#rf-gov-019) | P0 | działa | [PORT](#e-port) | Current code/config boundary from 36be71bc retained. |
| [RF-GOV-020](../product/requirements.md#rf-gov-020) | P0 | częściowo działa | [AUDIT](#e-audit) | Events exist; generic records/evidence remain mutable. |
| [RF-CTX-001](../product/requirements.md#rf-ctx-001) | P0 | częściowo działa | [PACKET](#e-packet) | Structural packet works; semantic completeness and full compiler remain partial. |
| [RF-CTX-002](../product/requirements.md#rf-ctx-002) | P0 | częściowo działa | [CTX](#e-ctx) | Source precedence documented, not enforced throughout compilation. |
| [RF-CTX-003](../product/requirements.md#rf-ctx-003) | P0 | częściowo działa | [CTX](#e-ctx) | Record/evidence models exist; epistemic labeling not uniformly enforced. |
| [RF-CTX-004](../product/requirements.md#rf-ctx-004) | P0 | częściowo działa | [PACKET](#e-packet) | Application context exists; validated full manifest absent. |
| [RF-CTX-005](../product/requirements.md#rf-ctx-005) | P0 | częściowo działa | [PACKET](#e-packet) | Packet references versions; complete layered selection/reason trace missing. |
| [RF-CTX-006](../product/requirements.md#rf-ctx-006) | P0 | częściowo działa | [PACKET](#e-packet), Gate 2 native evidence above | Ready invalidation and active-attempt fencing stop work at observed checkpoint/event/heartbeat boundaries; late authority and restart are rejected. Gate 2 ran a real managed provider after pinned Ready and a safe same-attempt resume at a pre-spawn checkpoint. Arbitrary internal runner operations/OS freezes and atomic database-to-spawn remain outside the guarantee. |
| [RF-CTX-007](../product/requirements.md#rf-ctx-007) | P1 | brak | [CTX](#e-ctx) | No runtime context expansion protocol. |
| [RF-CTX-008](../product/requirements.md#rf-ctx-008) | P0 | działa | [SUBMIT](#e-submit) | Within the supervised runtime, only the explicit versioned/idempotent Submit command grants Ready after validation. Draft/Needs context/Needs decision are durable; create/assign/edit/import and alternate database writes cannot admit work. Automatic interviews and semantic completeness belong to separate requirements. |
| [RF-CTX-009](../product/requirements.md#rf-ctx-009) | P0 | częściowo działa | [TASK](#e-task), [single-task contract](execution-packet-contract.md#single-task-scope-rf-ctx-009), `scripts/agent-host-single-task.test.mjs`, `src/tests/api.test.ts`, `scripts/task-readiness-ui.test.mjs` | Submit requires one resolved app/component, manager, executor, measured result and deterministic branch; bounded shared-cause exception is visible/auditable. API/DB/host gates, legacy invalidation and source revision checks prevent ordinary bypass. Structural and PL/EN ambiguity checks do not prove arbitrary prose semantics; independent acceptance/role separation remains RF-CTX-010. |
| [RF-CTX-010](../product/requirements.md#rf-ctx-010) | P0 | częściowo działa | [role contract](execution-packet-contract.md#explicit-task-roles-rf-ctx-010), `scripts/lib/agent-host-task-roles.mjs`, `src/modules/agent-runtime/task-role-context.ts`, `src/tests/api.test.ts`, `scripts/agent-host-task-roles.test.mjs`, `scripts/task-roles-migration.test.mjs`, `scripts/task-readiness-ui.test.mjs`, Gate 2 native evidence above | Submit resolves five current roles, immutable human origin and accepted author history; API/DB/host reject self-review/self-release and stale authority. Gate 2 bound separate coder, manager and credential-bound reviewer, including return and exact-commit acceptance. Membership/profile edits invalidate Ready. Broad qualification certification and release execution remain outside this proof. |
| [RF-CTX-011](../product/requirements.md#rf-ctx-011) | P1 | częściowo działa | [PROC](#e-proc) | Registry primitives exist; task-type execution contract incomplete. |
| [RF-CTX-012](../product/requirements.md#rf-ctx-012) | P0 | częściowo działa | [versioned composition](versioned-procedure-composition.md), `procedure-composition.ts`, API/DB and host/UI tests | Native immutable base/extension contracts, deterministic composition, exact expiring independent-owner exceptions and Ready/packet/host pins work. Automatic procedure execution and company-wide workflow coverage remain outside this boundary. |
| [RF-CTX-013](../product/requirements.md#rf-ctx-013) | P0 | częściowo działa | [typed handoff](typed-work-handoff.md), `task-handoff.ts`, contract/API/DB/UI tests | Native immutable execution/material handoff, exact role/principal receipt, typed rejection and superseding versions work under current risk, redaction and task-scoped agent grants. Source references are validated; independent Git/test attestation, receiver invocation and external conversation coverage remain separate. |
| [RF-CTX-014](../product/requirements.md#rf-ctx-014) | P0 | częściowo działa | [native review contract](task-review-workflow.md), `src/modules/agent-runtime/task-review.ts`, `src/tests/api.test.ts`, `scripts/task-review-ui.test.mjs`, `scripts/task-review-migration.test.mjs`, Gate 2 native evidence above | Current human or credential-bound agent verifier records versioned approve/reject; manager returns scoped work or creates one dependent specialist draft. Gate 2 exercised managed independent reviewer invocation, repeated rejection, manager correction and approval bound to the Worker local commit and material digest. Broader artifact/Git attestation and release authorization remain separate. |
| [RF-CTX-015](../product/requirements.md#rf-ctx-015) | P1 | częściowo działa | [governed clarification](governed-task-clarification.md), `src/modules/agent-runtime/task-clarification.ts`, `src/tests/api.test.ts`, `scripts/task-clarification-ui.test.mjs` | Native append-only typed conversations bind current task-role principals and canonical same-application task relations; exact grants, read/reply receipts, superseding corrections, material notices and deterministic execution receipts are implemented. External delivery, automatic routing, semantic material inference and independent artifact attestation remain outside this contract. |
| [RF-CTX-016](../product/requirements.md#rf-ctx-016) | P1 | częściowo działa | [DEC](#e-dec) | Native versioned material-question cases, scoped owner answer → Decision proposal → separate acceptance and dependency Ready fences; see [contract](material-unknown-interviews.md). Full hierarchy and semantic/model orchestration remain outside this slice. |
| [RF-CTX-017](../product/requirements.md#rf-ctx-017) | P0 | częściowo działa | [DEC](#e-dec) | Native immutable supersession, exact declared conflicts, directional impact previews, separately gated owner acceptance, scoped Ready/active-work invalidation and typed event-based reopening are implemented; see [contract](decision-supersession-impact.md). Semantic company-wide discovery, hierarchy authority and automatic external event delivery remain outside this slice. |
| [RF-CTX-018](../product/requirements.md#rf-ctx-018) | P0 | częściowo działa | [DEC](#e-dec) | Native typed owner reservations, versioned exact mandates, shortest workforce routes, expiry/revocation fences and Decision/interview/Ready/review integration: [contract](delegated-decision-authority.md). Semantic inference and company-wide delegation remain outside this bounded implementation. |
| [RF-CTX-019](../product/requirements.md#rf-ctx-019) | P1 | częściowo działa | [TASK](#e-task) | Records/relations exist; execution enforcement incomplete. |
| [RF-CTX-020](../product/requirements.md#rf-ctx-020) | P1 | częściowo działa | [LEARN](#e-learn) | Knowledge/standard records exist; promotion/eval loop absent. |
| [RF-CTX-021](../product/requirements.md#rf-ctx-021) | P0 | działa | [FIND](#e-find) | Versioned Finding verification, independent adjudication and idempotent native-task triage implemented; no autonomy activation. |
| [RF-CTX-022](../product/requirements.md#rf-ctx-022) | P1 | brak | [FIND](#e-find) | No complete prioritization rule engine. |
| [RF-CTX-023](../product/requirements.md#rf-ctx-023) | P1 | brak | [FIND](#e-find) | DemoApp audit not executed. |
| [RF-CTX-024](../product/requirements.md#rf-ctx-024) | P1 | brak | [CTX](#e-ctx) | No automated provenance/license release gate. |
| [RF-CTX-025](../product/requirements.md#rf-ctx-025) | P1 | brak | [REVIEW](#e-review) | No dispute protocol. |
| [RF-CTX-026](../product/requirements.md#rf-ctx-026) | P1 | nieocenione | [PROC](#e-proc) | Executor-class declarations, bounded retry/fallback and promotion to deterministic automation require procedure-runtime proof. |
| [RF-HOST-001](../product/requirements.md#rf-host-001) | P0 | częściowo działa | [HOST](#e-host) | Queue/observer implemented; full scheduler pending. |
| [RF-HOST-002](../product/requirements.md#rf-host-002) | P0 | częściowo działa | [LOCK](#e-lock), Gate 2 native evidence above | Global writer lock rejected a second writing executor while the first held the pilot slot. General waiting/read resource admission remains partial. |
| [RF-HOST-003](../product/requirements.md#rf-host-003) | P0 | częściowo działa | [RECOVERY](#e-recovery), [APP-OP](#e-app-operation), Gate 2 native evidence above | Same-attempt pre-spawn resume passed. Exact signed refused-candidate recovery and actual four-file tracked restore completed through closed Jobs before fresh admission; spent attempts and historical refusals were retained. Automatic recovery for arbitrary failures remains unproven. |
| [RF-HOST-004](../product/requirements.md#rf-host-004) | P0 | częściowo działa | [WORKSPACE](#e-workspace) | Path/origin guard exists; full clean-main and unknown-change admission absent. |
| [RF-HOST-005](../product/requirements.md#rf-host-005) | P1 | częściowo działa | [WORKSPACE](#e-workspace) | No governed branch lifecycle or WIP broker. |
| [RF-HOST-006](../product/requirements.md#rf-host-006) | P0 | częściowo działa | [LEASE](#e-lease) | Lease/process-tree and durable spawn barriers exist; all operation checkpoints incomplete. |
| [RF-HOST-007](../product/requirements.md#rf-host-007) | P0 | częściowo działa | [OBSERVER](#e-observer) | Console-free GUI launcher and synthetic action-start retry verified; real relogin/reboot and forced-crash restart unproven. |
| [RF-HOST-008](../product/requirements.md#rf-host-008) | P1 | brak | [HOST](#e-host) | No signed update protocol. |
| [RF-HOST-009](../product/requirements.md#rf-host-009) | P0 | częściowo działa | [SCHED](#e-sched) | Existing claim is FIFO, not readiness/priority scheduler. |
| [RF-HOST-010](../product/requirements.md#rf-host-010) | P0 | częściowo działa | [BUDGET](#e-budget) | Attempts/duration validated and contained; output tokens fail closed before Codex spawn because an execution-wide enforcing interface is unproven. Synthetic exhaustion/recovery fencing tested. Usable provider hard cap, cost enforcement and independent new-budget approval remain missing. |
| [RF-HOST-011](../product/requirements.md#rf-host-011) | P1 | częściowo działa | [BUDGET](#e-budget) | Bounded provider transport retry is distinguished from task retry. One CLI/turn retains input/attempt/deadline; terminal or incomplete output is non-retryable. Retry counts and partial usage remain unknown when unexposed. General execution loop breaker absent. |
| [RF-HOST-012](../product/requirements.md#rf-host-012) | P1 | częściowo działa | [BUDGET](#e-budget) | Usage stored per execution; attribution and quality-constrained optimization absent. |
| [RF-HOST-013](../product/requirements.md#rf-host-013) | P0 | brak | [RESOURCE](#e-resource) | No resource-aware host/service-operation broker. |
| [RF-HOST-014](../product/requirements.md#rf-host-014) | P0 | częściowo działa | [PROTOCOL](#e-protocol) | Host/API admission before recovery/claim/spawn implemented; coordinated backend/UI/schema drain/update/rollback remains missing. |
| [RF-HOST-015](../product/requirements.md#rf-host-015) | P1 | częściowo działa | [AUTH](#e-auth) | Host identity and scoped provisioning exist; interactive pairing absent. |
| [RF-HOST-016](../product/requirements.md#rf-host-016) | P0 | działa | [MODEL](#e-model) | Explicit allowlist/pair validation and exact argv verified by synthetic host tests; no provider call/activation. Full routing/observed usage remain RF-HOST-017/018. |
| [RF-HOST-017](../product/requirements.md#rf-host-017) | P1 | brak | [MODEL](#e-model) | No stage router, minima, availability or override UI. |
| [RF-HOST-018](../product/requirements.md#rf-host-018) | P1 | częściowo działa | [MODEL](#e-model), [APP-OP](#e-app-operation) | Actual second-app coding used explicit medium effort and independent read-only review used low effort with pinned provider/model profiles, input caps, turns and no restart/retry. Physical provider calls, token counts and cost were not exposed; broad quality/optimization evidence is absent. |
| [RF-HOST-019](../product/requirements.md#rf-host-019) | P0 | częściowo działa | [PACKET](#e-packet) | Prompt marks context untrusted; no comprehensive quarantine/reporting. |
| [RF-HOST-020](../product/requirements.md#rf-host-020) | P0 | częściowo działa | [WORKSPACE](#e-workspace) | Workspace-write sandbox is not read isolation; browser/session broker absent. |
| [RF-SEC-001](../product/requirements.md#rf-sec-001) | P0 | częściowo działa | [RISK](#e-risk) | [Bounded native assessment](native-task-risk.md) computes seven-dimension maximum, uncertainty and cumulative canonical task groups; binds Ready/execution/grants. Company-wide automated risk discovery remains absent. |
| [RF-SEC-002](../product/requirements.md#rf-sec-002) | P0 | częściowo działa | [native risk admission](native-risk-admission.md), `task-risk-admission.ts`, `src/tests/api.test.ts`, `scripts/task-risk-admission-ui.test.mjs` | Native level-specific procedure/review/mandate/backup/restore/owner gates bind exact operation and current evidence; API/DB/host fences and PL/EN UI are implemented. External fact attestation, release brokerage and company-wide coverage remain absent. |
| [RF-SEC-003](../product/requirements.md#rf-sec-003) | P0 | częściowo działa | [BROKER](#e-broker) | Durable exact task/agent/credential/application/operation/time grants govern the three native review commands, with human issue/revoke, atomic use receipts and context invalidation. General sensitive-tool/secrets brokering, risk and automatic issuance remain absent. |
| [RF-SEC-004](../product/requirements.md#rf-sec-004) | P0 | częściowo działa | [REDACTION](#e-redaction) | Shared native runtime policy gates required model/checkpoint input and sanitizes diagnostics/projections with safe deduplicated incidents. Whole-Roost DLP, arbitrary encodings/files and historical cleanup remain outside this slice. |
| [RF-SEC-005](../product/requirements.md#rf-sec-005) | P0 | częściowo działa | [Worker read-only MCP broker](worker-readonly-mcp-broker.md), `scripts/agent-host-mcp-broker.test.mjs` | Synthetic proof for exact pinned reads, attempt capability, limits and stop; no general tool/network/install broker, native Hermes containment or live/model proof. Observer and Hermes execution remain disabled for this path. |
| [RF-SEC-006](../product/requirements.md#rf-sec-006) | P0 | częściowo działa | [BROKER](#e-broker) | Workspace scoping exists, not field-level diagnostic access. |
| [RF-SEC-007](../product/requirements.md#rf-sec-007) | P0 | brak | [REVIEW](#e-review) | No mandatory security-review or emergency-exception lifecycle. |
| [RF-SEC-008](../product/requirements.md#rf-sec-008) | P0 | częściowo działa | [BROKER](#e-broker) | Environment schema and encrypted integration settings exist; dependency gating incomplete. |
| [RF-SEC-009](../product/requirements.md#rf-sec-009) | P1 | częściowo działa | [AUTH](#e-auth) | Membership/invitation role checks exist; finer project/decision mandates incomplete. |
| [RF-SEC-010](../product/requirements.md#rf-sec-010) | P0 | brak | [HEALTH](#e-health) | No generic application-health contract runner. |
| [RF-SEC-011](../product/requirements.md#rf-sec-011) | P0 | częściowo działa | [IDEMP](#e-idemp) | Some provider inbox/execution CAS dedup exists; universal operation receipts absent. |
| [RF-SEC-012](../product/requirements.md#rf-sec-012) | P0 | częściowo działa | [INCIDENT](#e-incident) | Exact native capability suspension, independent versioned remediation verification, explicit owner restore and manual-intervention reread/replan are enforced. General risk classification and external broker containment remain absent. |
| [RF-RES-001](../product/requirements.md#rf-res-001) | P0 | częściowo działa | [RELEASE](#e-release) | Private ownership manifest binds exact clone, application, image digests and sixteen resources; real Gate 3 registration and absence proof pass. Broader portfolio inventory remains outside this proof. |
| [RF-RES-002](../product/requirements.md#rf-res-002) | P0 | częściowo działa | [RELEASE](#e-release) | Real broker cleanup removed sixteen owned test resources and the exact canonical clone, archived the private repository and retained evidence; shared resources were preserved. |
| [RF-RES-003](../product/requirements.md#rf-res-003) | P0 | częściowo działa | [BACKUP](#e-backup), [RELEASE](#e-release) | Shared volumes/network deletion and global Docker cleanup are disabled; unknown resources are preserved. Certification target has no business data or persistent storage. |
| [RF-RES-004](../product/requirements.md#rf-res-004) | P0 | częściowo działa | [BACKUP](#e-backup), [RELEASE](#e-release) | Verified backup promotion, production encrypted backup/restore and real compatible immutable rollback with 64-second healthy observation pass. The temporary target has no database or business data. |
| [RF-RES-005](../product/requirements.md#rf-res-005) | P0 | częściowo działa | [BACKUP](#e-backup), [RELEASE](#e-release) | Real local and production PostgreSQL dump/restore, schema/data/sequence parity, encrypted read-back, owner acknowledgment and owned restore database cleanup pass. Gate 3 additionally proves exact image/config/schema rollback with unchanged synthetic data; no production database rollback is claimed. |
| [RF-RES-006](../product/requirements.md#rf-res-006) | P1 | częściowo działa | [BACKUP](#e-backup) | Interactive owner setup generates a code once and stores only a salted hash/acknowledgement. Actual owner/off-device acknowledgment passes; recovery code stays outside Roost records. |
| [RF-RES-007](../product/requirements.md#rf-res-007) | P0 | częściowo działa | [RELEASE](#e-release) | Broker checked disk/memory/load/Docker and overlapping Coolify deployments on the real target before effects. General shared scheduling remains unproven. |
| [RF-RES-008](../product/requirements.md#rf-res-008) | P1 | działa | [GOV](#e-gov) | Boundary retained; no new cleanup mechanism. |
| [RF-REL-001](../product/requirements.md#rf-rel-001) | P0 | częściowo działa | [RELEASE](#e-release) | Native private GitHub Free branch/commit/push/PR/independent Roost review/exact merge and deployment/recovery pass without visibility changes. Broker protection does not restrict administrator actions outside the managed path. |
| [RF-REL-002](../product/requirements.md#rf-rel-002) | P0 | działa | [GOV](#e-gov) | Governing prohibition retained. |
| [RF-REL-003](../product/requirements.md#rf-rel-003) | P0 | częściowo działa | [REVIEW](#e-review), [RELEASE](#e-release) | Gate 2 independently rejected three commits and accepted corrected local pilot `774e858ae48d1f05d2b56982a7113da983f62af8`. Gate 3 independently accepted exact test candidate `de6ebe7a4267078196534a36f73ff9bccb09d3ae` and used that acceptance through release/recovery. General qualification lifecycle remains outside this proof. |
| [RF-REL-004](../product/requirements.md#rf-rel-004) | P0 | częściowo działa | [RELEASE](#e-release) | Owner grant `21585a17-79ca-4623-aa63-4018f1d03965` binds exact native candidate, independent review and separate release audit; changed commit refused with 409 and absence read-back. Normal same-grant renewal and real publication/recovery pass. Second-app closure `14348e4c` retains FAILED and original absence clock. Roost `d4014466` and backup-refresh migration are deployed. Native audit `26eafebe` retains CHANGES_REQUIRED; code approval `aaa9c480` and owner grant `e7320bdf` bind exact c82/742. Normal closure `4d79f05f` records FAILED with 88 signed closed children and original evidence time `18:43:15.666Z`; fresh nine-read parity and normal credential rotation pass. Current audit `73c725f3` retains CHANGES_REQUIRED; review `56ee77da` accepts c82. Grant `f579ca87` reconciles sole configuration ABSENT at `19:52:21.685Z`; no deployment. Actual schema receipt `2d63cf62` proves rollback rehearsal, two command columns widened to text and complete parity of ten controller application records. Pre-intent capacity guard has component evidence. Closure `4b0a9d74` records FAILED with original 154/latest 88 signed closed children and preserved absence clock; normal V6 rotation passes. Audit `5f056660` has signed unchanged-state native closure and literal fifteen-finding CHANGES_REQUIRED. Prior `56ee77da` is stale under the current risk basis. Append-only basis `2e4b213f` and independent signed execution `59f78101` produce normal current approval `b8f69273` for c82/material `826c9c02`. Grant `6b4471c5` reconciles configuration ABSENT at `20:52:01.679Z`, with original 156/latest 88 signed closed children and no deployment. Native rolled-back CAS `bb121957` confirms complete ten-record parity. Locked model requery preserves persisted strings and count projections; bounded gateway diagnosis and 67 focused tests pass. Normal FAILED closure `4d4d7db5` and V7 credential rotation/storage pass. The application release remains pending. |
| [RF-REL-005](../product/requirements.md#rf-rel-005) | P0 | częściowo działa | [RELEASE](#e-release) | Real governed Git/deployment/health flow reached completed certification after controlled rollback and cleanup. This certifies the temporary target, not pilot release. |
| [RF-REL-006](../product/requirements.md#rf-rel-006) | P0 | częściowo działa | [RELEASE](#e-release) | Real candidate health transition and 64-second healthy rollback observation verify exact live image/config/schema/tree/data and elapsed window. Broader continuous monitoring remains separate. |
| [RF-REL-007](../product/requirements.md#rf-rel-007) | P0 | częściowo działa | [RELEASE](#e-release) | Actual container/OCI inspection proved candidate and compatible prior image/config/schema; real rollback and observation passed. Artifact absence during pause was repaired by pulling the same immutable identity. |
| [RF-REL-008](../product/requirements.md#rf-rel-008) | P0 | częściowo działa | [RELEASE](#e-release) | Broker detected controlled candidate failure, deployed exact compatible baseline and proved health plus full observation; data digest remained unchanged. Real business-data rollback is outside this no-database target. |
| [RF-REL-009](../product/requirements.md#rf-rel-009) | P1 | brak | [HEALTH](#e-health) | No continuous multi-app monitoring worker. |
| [RF-REL-010](../product/requirements.md#rf-rel-010) | P0 | częściowo działa | [RELEASE](#e-release) | Verified safety certificate exists for the temporary minimal target, including controlled failure, recovery and owned cleanup. Other applications remain uncertified. |
| [RF-REL-011](../product/requirements.md#rf-rel-011) | P0 | częściowo działa | [TEST](#e-test), [RELEASE](#e-release), Gate 2 native evidence above | Worker enforced candidate tests before local commit and independent review. Gate 3 required native read-only baseline/verifier/release audit and actual deployment/recovery checks. General risk-based test selection remains unproven. |
| [RF-REL-012](../product/requirements.md#rf-rel-012) | P1 | brak | [TEST](#e-test) | Bootstrap skill workflow exists; native enforcement absent. |
| [RF-REL-013](../product/requirements.md#rf-rel-013) | P0 | częściowo działa | [TEST](#e-test), [RELEASE](#e-release) | Additive migration and real PostgreSQL/HTTP checks pass; exact image/config/schema compatibility and unchanged synthetic data passed real rollback. General schema-changing application release remains unproven. |
| [RF-REL-014](../product/requirements.md#rf-rel-014) | P0 | częściowo działa | [RELEASE](#e-release) | Actual uncertain merge and interrupted deployment reconciled through normal restarted Windows Worker, sealed HMAC, exact grant/journal and closed native children; neither effect repeated. Real controlled recovery and final absence certification pass. Other ambiguous failure classes remain fail-closed. |
| [RF-REL-015](../product/requirements.md#rf-rel-015) | P0 | częściowo działa | [HEALTH](#e-health) | Roost public health/build exists; complete app contracts absent. |
| [RF-REL-016](../product/requirements.md#rf-rel-016) | P1 | brak | [RELEASE](#e-release) | No scheduler-enforced windows or drain. |
| [RF-REL-017](../product/requirements.md#rf-rel-017) | P1 | brak | [RELEASE](#e-release) | Future DemoApp release configuration, not implemented here. |
| [RF-REL-018](../product/requirements.md#rf-rel-018) | P1 | działa | [GOV](#e-gov) | Risk-based target policy retained. |
| [RF-ACT-001](../product/requirements.md#rf-act-001) | P0 | częściowo działa | [HOST](#e-host) | Default execution flag works; formal staged readiness state absent. |
| [RF-ACT-002](../product/requirements.md#rf-act-002) | P0 | częściowo działa | [DRY](#e-dry) | Lease/recovery fixture tests exist; complete dry-run certification absent. |
| [RF-ACT-003](../product/requirements.md#rf-act-003) | P0 | częściowo działa | [RELEASE](#e-release) | Owner-authorized single temporary target completed actual managed Git/release/failure/rollback/cleanup certification; verified certificate is retained in Roost. Pilot certification remains separate. |
| [RF-ACT-004](../product/requirements.md#rf-act-004) | P1 | częściowo działa | [RELEASE](#e-release) | Actual sixteen-resource absence, exact clean clone removal and private repository archival passed; five test tasks, three roles and application archived with historical evidence retained. |
| [RF-ACT-005](../product/requirements.md#rf-act-005) | P0 | częściowo działa | [AUDITOR](#e-auditor), Gate 2 native evidence above | Managed read-only pilot auditor and exact-commit reviewer completed with unchanged Git/process/Docker audits. General continuous canary activation remains unproven. |
| [RF-ACT-006](../product/requirements.md#rf-act-006) | P0 | częściowo działa | [AUDITOR](#e-auditor), Gate 2 native evidence above | Separate read-only auditor and verifier completed against one clean baseline with matching evidence digest before the first write. General scheduled canary orchestration remains unproven. |
| [RF-ACT-007](../product/requirements.md#rf-act-007) | P0 | częściowo działa | [ACT](#e-act), [RELEASE](#e-release) | Gate 3 read-only canaries, separate first-write consent and native release/recovery passed. Gate 4 adds scoped read-only audits, separate first-write/release consent, exact acceptance and independent production verification. The full activation ladder and medium-risk progression rule remain unproven. |
| [RF-ACT-008](../product/requirements.md#rf-act-008) | P1 | brak | [ACT](#e-act) | No capability progression lifecycle. |
| [RF-ACT-009](../product/requirements.md#rf-act-009) | P1 | brak | [ACT](#e-act) | No probation counters/certification. |
| [RF-ACT-010](../product/requirements.md#rf-act-010) | P1 | częściowo działa | [ACT](#e-act), [APP-OP](#e-app-operation) | Own context, independent audits, bounded manifest, separate owner baseline/first-write, native coding/exact review and owner-console continuation ran using shared roles/procedures in two apps. Whole second-app health, release and arbitrary further onboarding are unverified. |
| [RF-ACT-011](../product/requirements.md#rf-act-011) | P0 | częściowo działa | [GOV](#e-gov) | `AGENTS.md`, `docs/implementation.md` and the repository delivery skill enforce one accountable authorized gate with bounded delegation and a mandatory stop before the next gate. Native Roost/Worker enforcement and gate proof remain unverified. |
| [RF-PILOT-001](../product/requirements.md#rf-demoapp-001) | P1 | częściowo działa | [PILOT](#e-demoapp), [RELEASE](#e-release) | Pilot mapping, scoped application context and six-service production baseline were audited; full product readiness is not proven. |
| [RF-PILOT-002](../product/requirements.md#rf-demoapp-002) | P1 | nieocenione | [PILOT](#e-demoapp) | Gate 4 PWA repair does not prove shared BACKTEST/PAPER/LIVE strategy decisions or multi-exchange/market/portfolio behavior. |
| [RF-PILOT-003](../product/requirements.md#rf-demoapp-003) | P1 | nieocenione | [PILOT](#e-demoapp) | Gate 4 PWA repair does not prove immutable strategy/configuration/run versions or ownership of positions across rollback/migration. |
| [RF-PILOT-004](../product/requirements.md#rf-demoapp-004) | P0 | częściowo działa | [PILOT](#e-demoapp), [RELEASE](#e-release) | Managed frontend release, backup/restore readiness, data preservation and 1238-second healthy observation passed with trading paused; this does not certify financial/LIVE deployment. |
| [RF-PILOT-005](../product/requirements.md#rf-demoapp-005) | P0 | wymaga konfiguracji | [PILOT](#e-demoapp) | Owner mandate recorded; never treat balance as enforcement. |
| [RF-PILOT-006](../product/requirements.md#rf-demoapp-006) | P0 | wymaga konfiguracji | [PILOT](#e-demoapp) | Required confirmation not obtained from exchanges; no live permission granted here. |
| [RF-PILOT-007](../product/requirements.md#rf-demoapp-007) | P0 | brak | [PILOT](#e-demoapp) | Supersedes unrestricted live-test approval; no consent issued in this batch. |
| [RF-PILOT-008](../product/requirements.md#rf-demoapp-008) | P0 | wymaga konfiguracji | [PILOT](#e-demoapp) | No guarantee of autonomous closure claimed; native strategy/risk configuration must be verified. |
| [RF-PILOT-009](../product/requirements.md#rf-demoapp-009) | P0 | wymaga konfiguracji | [PILOT](#e-demoapp) | Limits are mandates, not verified exchange settings. |
| [RF-PILOT-010](../product/requirements.md#rf-demoapp-010) | P0 | brak | [PILOT](#e-demoapp) | Target test failure procedure absent. |
| [RF-PILOT-011](../product/requirements.md#rf-demoapp-011) | P0 | brak | [PILOT](#e-demoapp) | No live or production trading test run. |
| [RF-PILOT-012](../product/requirements.md#rf-demoapp-012) | P0 | brak | [PILOT](#e-demoapp) | Certification evidence not established. |
| [RF-PILOT-013](../product/requirements.md#rf-demoapp-013) | P1 | brak | [PILOT](#e-demoapp) | Future DemoApp controlled test lifecycle. |
| [RF-PILOT-014](../product/requirements.md#rf-demoapp-014) | P0 | brak | [PILOT](#e-demoapp) | Future DemoApp idempotency proof required. |
| [RF-PILOT-015](../product/requirements.md#rf-demoapp-015) | P1 | częściowo działa | [INTEGRATION](#e-integration) | Connectors exist; test-scope admission incomplete. |
| [RF-PILOT-016](../product/requirements.md#rf-demoapp-016) | P0 | częściowo działa | [INTEGRATION](#e-integration) | Provider operations exist; generic test ownership/cost guard absent. |
| [RF-PILOT-017](../product/requirements.md#rf-demoapp-017) | P1 | brak | [INTEGRATION](#e-integration) | No generic integration test ladder controller. |
| [RF-UX-001](../product/requirements.md#rf-ux-001) | P1 | częściowo działa | [ATTENTION](#e-attention), [APP-OP](#e-app-operation) | Actual portfolio, canonical pending Decision queue and accepted continuation history are verified; a unified company-wide attention lifecycle remains incomplete. |
| [RF-UX-002](../product/requirements.md#rf-ux-002) | P1 | częściowo działa | [ATTENTION](#e-attention), [APP-OP](#e-app-operation) | Actual native Task Review, exact commit/tests/reviewer and owner Decision impact/history are visible. Complete evidence interpretation across every company capability remains partial. |
| [RF-UX-003](../product/requirements.md#rf-ux-003) | P0 | częściowo działa | [HOST](#e-host) | Cancel and observer stop exist; full owner controls absent. |
| [RF-UX-004](../product/requirements.md#rf-ux-004) | P1 | częściowo działa | [AUDIT](#e-audit) | Ignored evidence guard exists; runtime log retention not implemented. |
| [RF-UX-005](../product/requirements.md#rf-ux-005) | P1 | częściowo działa | [LANG](#e-lang), [APP-OP](#e-app-operation) | PL/EN UI persists preferredLanguage through auth/me; canonicalLanguage exists for Findings. Independent communication language, recipient routing and canonical translations remain unverified. |
| [RF-UX-006](../product/requirements.md#rf-ux-006) | P0 | częściowo działa | [LANG](#e-lang), [APP-OP](#e-app-operation) | Canonical-language field and guarded Finding creation exist. Actual owner console refuses new Findings while language is unset. Creation-time choice/immutability is not implemented: creation omits the field and admin PATCH permits changes. No language was inferred or changed in Gate 5. |
| [RF-UX-007](../product/requirements.md#rf-ux-007) | P1 | częściowo działa | [LANG](#e-lang) | PL/EN and fallback exist; missing-key finding and account persistence incomplete. |
| [RF-UX-008](../product/requirements.md#rf-ux-008) | P1 | częściowo działa | [TIME](#e-time), [APP-OP](#e-app-operation) | UTC API timestamps and browser-local Intl display show the actual Decision lineage. User manual timezone override and workspace scheduling timezone remain absent. |
| [RF-UX-009](../product/requirements.md#rf-ux-009) | P1 | brak | [TIME](#e-time) | No native timezone-aware recurring task scheduler. |
| [RF-DEF-001](../product/requirements.md#rf-def-001) | P2 | brak | [AUTH](#e-auth) | Deferred; do not add an activation gate. |
| [RF-DEF-002](../product/requirements.md#rf-def-002) | P2 | brak | [RELEASE](#e-release) | Deferred; current constraints remain valid. |
| [RF-DEF-003](../product/requirements.md#rf-def-003) | P2 | brak | [PILOT](#e-demoapp) | Deferred; no optimization worker activated. |
| [RF-DEF-004](../product/requirements.md#rf-def-004) | P2 | brak | [LANG](#e-lang) | Deferred; creation choice remains immutable. |
| [RF-DEF-005](../product/requirements.md#rf-def-005) | P2 | brak | [ATTENTION](#e-attention) | Deferred; no external notification channel activation. |
| [RF-DEF-006](../product/requirements.md#rf-def-006) | P2 | brak | [GOV](#e-gov) | Deferred; neither automation is retired by this batch. |
| [RF-ORG-001](../product/requirements.md#rf-org-001) | P1 | częściowo działa | [ORG](#e-org), [APP-OP](#e-app-operation) | Configured competent requester/manager/executor/verifier/releaser roles are reused in two application flows; full workforce/competence policy remains partial. |
| [RF-ORG-002](../product/requirements.md#rf-org-002) | P1 | częściowo działa | [PROC](#e-proc), [APP-OP](#e-app-operation) | Pinned goals, procedures and atomic bounded tasks ran natively; complete company execution semantics remain partial. |
| [RF-ORG-003](../product/requirements.md#rf-org-003) | P1 | częściowo działa | [PORT](#e-port), [APP-OP](#e-app-operation) | Two existing apps entered own accepted baselines and reused delivery controls. New-product/full commercialization lifecycle remains unproven. |
| [RF-ORG-004](../product/requirements.md#rf-org-004) | P1 | częściowo działa | [LEARN](#e-learn) | Generic knowledge/procedure records do not enforce promotion. |
| [RF-ORG-005](../product/requirements.md#rf-org-005) | P1 | częściowo działa | [CTX](#e-ctx) | Documentation imports exist; approval/provenance reconciliation incomplete. |

## Evidence index

Each entry links existing canonical files; a test link is not a passing result.

<a id="e-gov"></a>
**GOV** — Existing accepted target; policy does not grant runtime capability.

[docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-doc"></a>
**DOC** — The current requirements registry and matrix close documentation traceability only.

[docs/architecture/traceability-matrix.md](../../docs/architecture/traceability-matrix.md).

<a id="e-org"></a>
**ORG** — Workforce assignment/profile CRUD, role relations; not qualification or hierarchy workflow.

[src/modules/workforce/workforce.service.ts](../../src/modules/workforce/workforce.service.ts), [src/modules/workforce/workforce.routes.ts](../../src/modules/workforce/workforce.routes.ts), [src/operating-model/department-registry.ts](../../src/operating-model/department-registry.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-goal"></a>
**GOAL** — Workspace-scoped goal records; no complete goal decomposition guard.

[src/modules/goals/goals.routes.ts](../../src/modules/goals/goals.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-port"></a>
**PORT** — Application/readiness/context surfaces; Roost excluded by commit 36be71bc.

[src/modules/product-engineering/product-engineering.routes.ts](../../src/modules/product-engineering/product-engineering.routes.ts), [scripts/lib/agent-host-workspace-guard.mjs](../../scripts/lib/agent-host-workspace-guard.mjs), [config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [prisma/seed.ts](../../prisma/seed.ts).

<a id="e-audit"></a>
**AUDIT** — Events and agent logs; evidence CRUD permits mutation/deletion, so immutable complete ledger is unproven.

[src/modules/events/events.routes.ts](../../src/modules/events/events.routes.ts), [src/modules/agent-logs/agent-logs.routes.ts](../../src/modules/agent-logs/agent-logs.routes.ts), [src/modules/evidence/evidence.routes.ts](../../src/modules/evidence/evidence.routes.ts), [scripts/ignored-evidence-retention-guardrail.mjs](../../scripts/ignored-evidence-retention-guardrail.mjs).

<a id="e-packet"></a>
**PACKET** — Shared structural/referential validator, accepted Ready pin and preparation pin with fresh authoritative comparison before spawn, transactional active-attempt invalidation and host-observed process-tree stopping.

[scripts/lib/agent-host-execution-packet.mjs](../../scripts/lib/agent-host-execution-packet.mjs), [src/modules/agent-runtime/execution-packet.ts](../../src/modules/agent-runtime/execution-packet.ts), [scripts/agent-host-execution-packet.test.mjs](../../scripts/agent-host-execution-packet.test.mjs), [docs/architecture/execution-packet-contract.md](../../docs/architecture/execution-packet-contract.md).

[Ready API service](../../src/modules/agent-runtime/task-execution-readiness.ts),
[source watch compiler](../../src/modules/agent-runtime/ready-source-watch.ts),
[source invalidation migration](../../prisma/migrations/20260907213000_ready_source_invalidation/migration.sql),
[shared Ready fingerprint](../../scripts/lib/agent-host-ready-context.cjs),
[Ready tests](../../scripts/agent-host-ready-context.test.mjs),
[active stop migration](../../prisma/migrations/20260907220000_active_context_stop/migration.sql),
[active stop API guard](../../src/modules/agent-runtime/execution-context-stop.ts),
[active stop unit tests](../../scripts/agent-host-context-stop.test.mjs),
[active stop fake-runner tests](../../scripts/agent-host-active-context-process.test.mjs),
[active stop owner UI tests](../../scripts/agent-context-stop-ui.test.mjs),
[context admission helper](../../scripts/lib/agent-host-execution-context.mjs),
[context unit tests](../../scripts/agent-host-execution-context.test.mjs),
[Windows context process tests](../../scripts/agent-host-context-process.test.mjs),
[checkpoint API](../../src/modules/agent-runtime/agent-runtime.routes.ts),
[local API tests](../../src/tests/api.test.ts).

<a id="e-ctx"></a>
**CTX** — Context projections and company records; full policy compiler is not established.

[src/modules/company-intelligence/company-intelligence.routes.ts](../../src/modules/company-intelligence/company-intelligence.routes.ts), [src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts), [scripts/import-application-documentation-context.ts](../../scripts/import-application-documentation-context.ts).

<a id="e-submit"></a>
**SUBMIT** — One human-authorized, versioned Submit command and immutable receipts;
Draft/Needs context/Needs decision remain nonexecuting. No automatic queue/claim.

[command and version service](../../src/modules/agent-runtime/task-execution-readiness.ts),
[database admission guard](../../prisma/migrations/20260907230000_submit_only_ready/migration.sql),
[API contract](execution-packet-contract.md#submit-is-the-only-ready-transition-rf-ctx-008),
[PostgreSQL/API tests](../../src/tests/api.test.ts),
[owner form](../../web/src/features/departments/task-readiness.tsx),
[browser fixtures](../../scripts/task-readiness-ui.test.mjs).

<a id="e-task"></a>
**TASK** — Task CRUD, assignments and a human role-gated PL/EN contract editor using the explicit validated Ready command/state; ordinary edits cannot author readiness.

[src/modules/tasks/tasks.routes.ts](../../src/modules/tasks/tasks.routes.ts), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

[shared Ready editor](../../web/src/features/departments/task-readiness.tsx),
[contract form mapping](../../web/src/features/departments/task-readiness-model.ts),
[browser interaction/visual fixtures](../../scripts/task-readiness-ui.test.mjs),
[revision and diagnostic tests](../../web/src/features/departments/task-readiness-model.test.ts).

<a id="e-proc"></a>
**PROC** — Versioned procedure and process data, not complete task execution governance.

[src/modules/process-core/process-core.routes.ts](../../src/modules/process-core/process-core.routes.ts), [src/modules/company-os/lifecycle-procedure-definition.ts](../../src/modules/company-os/lifecycle-procedure-definition.ts), [src/modules/company-os/company-os.routes.ts](../../src/modules/company-os/company-os.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-dec"></a>
**DEC** — Structured decisions with supersession; no complete authority/impact propagation.

Complete five-task procedure admission and normal owner acceptance were proved
in production in 23647 ms on build `fac409e5`; all five native evidence records
passed. [Receipt and scoped transaction tuning](../operations/governed-release.md)
also record refusal/rollback and replay checks. This configuration acceptance
grants no execution or release authority; the separate certified grant is in
[RELEASE](#e-release).

[src/modules/decisions/decisions.routes.ts](../../src/modules/decisions/decisions.routes.ts), [web/src/features/departments/decisions-workbench.tsx](../../web/src/features/departments/decisions-workbench.tsx), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-learn"></a>
**LEARN** — Knowledge/standards records are storage primitives, not an independently evaluated learning cycle.

[src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-find"></a>
**FIND** — Governed Findings shipped at `db0227e667bebe2adc429b2619f63af2f2a30377`: versioned evidence, independent verification/adjudication, idempotent native-task triage and event-bound reopening. RF-CTX-022 prioritization and RF-CTX-023 application audit remain separate missing requirements.

[Contract](governed-findings.md), [service](../../src/modules/product-engineering/finding-service.ts), [API acceptance](../../src/tests/finding-api.ts), [UI](../../web/src/features/departments/finding-workbench.tsx), [migration](../../prisma/migrations/20260909100000_governed_findings/migration.sql). Human/agent acceptance and migration/UI checks cover this delivered scope.

[src/modules/product-engineering/readiness.ts](../../src/modules/product-engineering/readiness.ts), [src/modules/evidence/evidence.routes.ts](../../src/modules/evidence/evidence.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-host"></a>
**HOST** — Existing supervised host, disabled by default; no activation stage state machine.

[scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [src/config/env.ts](../../src/config/env.ts), [docs/architecture/local-codex-agent-runtime.md](../../docs/architecture/local-codex-agent-runtime.md).

<a id="e-protocol"></a>
**PROTOCOL** — Shared version/capability declaration, dual admission and visible blocking without offline host status; no full update orchestration.

[wire declaration](../../src/modules/agent-runtime/host-protocol.json), [API admission](../../src/modules/agent-runtime/host-protocol.ts), [host admission](../../scripts/lib/agent-host-protocol.mjs), [process tests](../../scripts/agent-host-protocol.test.mjs), [API tests](../../src/tests/api.test.ts), [protocol contract](local-codex-agent-runtime.md#hostapi-protocol-admission-rf-host-014).

<a id="e-lock"></a>
**LOCK** — Exclusive machine writer and durable ownership checks; pending broader scheduler/resource gates.

[scripts/lib/agent-host-writer-lock.mjs](../../scripts/lib/agent-host-writer-lock.mjs), [scripts/agent-host-writer-lock.test.mjs](../../scripts/agent-host-writer-lock.test.mjs), [docs/architecture/agent-host-recovery.md](../../docs/architecture/agent-host-recovery.md).

<a id="e-recovery"></a>
**RECOVERY** — Fail-closed same-attempt recovery only before spawn; 982d4809.

[scripts/lib/agent-host-recovery.mjs](../../scripts/lib/agent-host-recovery.mjs), [src/modules/agent-runtime/execution-recovery.ts](../../src/modules/agent-runtime/execution-recovery.ts), [scripts/agent-host-recovery.test.mjs](../../scripts/agent-host-recovery.test.mjs).

<a id="e-workspace"></a>
**WORKSPACE** — Physical root/canonical origin checks; not a complete read/branch/provenance security boundary.

[scripts/lib/agent-host-workspace-guard.mjs](../../scripts/lib/agent-host-workspace-guard.mjs), [scripts/agent-host-workspace-guard.test.mjs](../../scripts/agent-host-workspace-guard.test.mjs), [config/roost-agent-host.example.json](../../config/roost-agent-host.example.json).

<a id="e-lease"></a>
**LEASE** — Lease renewal, cancellation and process tree stop.

[scripts/lib/agent-host-execution-lease.mjs](../../scripts/lib/agent-host-execution-lease.mjs), [scripts/agent-host-execution-lease.test.mjs](../../scripts/agent-host-execution-lease.test.mjs), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-observer"></a>
**OBSERVER** — Observer mode isolates registration/heartbeat from claim/spawn; 271beb36 and f0c7faae.

[scripts/lib/agent-host-observer.mjs](../../scripts/lib/agent-host-observer.mjs), [scripts/roost-agent-host-windows.ps1](../../scripts/roost-agent-host-windows.ps1), [scripts/agent-host-observer.test.mjs](../../scripts/agent-host-observer.test.mjs), [docs/operations/local-codex-agent-host.md](../../docs/operations/local-codex-agent-host.md).

Local console-flash correction (2026-09-06): the task enters through a Windows
GUI executable and creates PowerShell without a console. Eight native launcher
checks passed, including GUI PE subsystem, `GetConsoleWindow()==0`, source
upgrade/no-op rebuild, failed-build preservation, exit-code propagation and
Task Scheduler retry after an action-start failure; observer regression 4/4.
The installed task's repeated Install/Start preserved one PID and one listener;
Stop/Start returned the same host online in observe/runtime_disabled. A synthetic
nonzero child exit did not itself cause Scheduler restart; this is explicitly
outside the claimed proof. No real logout/reboot or forced observer crash was
performed, and no VPS release is required for this local launcher change.
[GUI source](../../scripts/roost-agent-host-launcher.cs),
[build helper](../../scripts/lib/agent-host-windows-launcher.ps1),
[Windows launcher tests](../../scripts/agent-host-windows-launcher.test.ps1).

<a id="e-sched"></a>
**SCHED** — Claim currently orders queued executions by createdAt; no priority aging or resource scheduler.

[src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-budget"></a>
**BUDGET** — Validated attempts, hard duration stop and fail-closed output-token admission; usable provider output cap, cost enforcement and independent replacement-budget approval are incomplete.

[duration contract](execution-packet-contract.md#hard-duration-limit), [host](../../scripts/roost-codex-agent-host.mjs), [packet gate](../../scripts/lib/agent-host-execution-packet.mjs), [duration timer](../../scripts/lib/agent-host-execution-duration.mjs), [timer tests](../../scripts/agent-host-execution-duration.test.mjs), [Windows process tests](../../scripts/agent-host-duration-process.test.mjs), [recovery tests](../../scripts/agent-host-recovery.test.mjs).

[output guarantee](execution-packet-contract.md#hard-output-token-admission-rf-host-010),
[output guard](../../scripts/lib/agent-host-output-budget.mjs),
[output unit tests](../../scripts/agent-host-output-budget.test.mjs),
[synthetic process tests](../../scripts/agent-host-output-budget-process.test.mjs),
[API immutability/retry tests](../../src/tests/api.test.ts).

<a id="e-model"></a>
**MODEL** — RF-HOST-016 now admits explicit supported model/effort, dispatches exact CLI arguments and records requested pair. Current synthetic verification passed.

Worker bootstrap input now seals the existing packet/compiler projections before
provider start, with exact scope, provenance, immutable context hash and no model
bootstrap tool obligation. `scripts/lib/agent-host-provider-input.mjs`,
`scripts/agent-host-provider-input.test.mjs` and the existing context-process
suite prove synthetic adapter equality and fail-closed spawn admission. Registry
v4 and `worker_provider_input_v1` exclude older hosts. Broker/attestation tests
remain separate. One isolated Direct bootstrap-response turn passed on
2026-09-12 with synthetic facts, zero tools and stable input seal. General live
transport/tool reliability, Hermes compatibility, RF-HOST-010/020 and Stage 2
remain unproved; observer/disabled execution and pilot readiness are unchanged.

`scripts/hermes-transport-boundary.test.mjs` additionally exercises the attested
official Hermes client against a real, offline fake App Server. It verifies
one sealed-input dispatch, then reproduces capture above 32 KiB and a descendant
surviving client close. This is negative containment evidence, not delivery of
the production Hermes adapter or completion of RF-HOST-010/020/stop-recovery;
see [the bounded examination](../operations/hermes-windows-attestation.md#offline-transport-examination-adapter-blocked).

[RF-HOST-030: OpenShell feasibility](../operations/openshell-wsl-feasibility.md)
was BLOCKED at the user-WSL-2 prerequisite. [RF-HOST-031/032](../operations/agent-wsl-environment.md)
installed a dedicated non-root-default Ubuntu distribution and verified native
Docker client/server access plus existing-workload continuity. Final scoped-stop
verification passed; setup is READY-FOR-OPENSHELL-PREFLIGHT.
The later [RF-HOST-033 installation preflight](../operations/openshell-installation-preflight.md)
is BLOCKED by a missing native Docker socket after cold start; immutable artifact
identification does not admit installation or resolve containment/resource gates.
[RF-HOST-034](../operations/agent-wsl-environment.md#rf-host-034-durability-diagnosis)
also remains BLOCKED: the one authorized Desktop restart failed, so daemon
recovery, workload continuity and both durability cycles could not pass.
Filesystem isolation is UNPROVEN. No sandbox/containment claim or new
activation authority follows from its read-only preflight. This is separate
feasibility evidence, not completion of RF-HOST-010/020 or the frozen baseline.

[scripts/lib/agent-host-model-policy.mjs](../../scripts/lib/agent-host-model-policy.mjs), [scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [scripts/agent-host-model-policy.test.mjs](../../scripts/agent-host-model-policy.test.mjs), [scripts/agent-host-execution-packet.test.mjs](../../scripts/agent-host-execution-packet.test.mjs), [docs/architecture/execution-packet-contract.md](../../docs/architecture/execution-packet-contract.md).

<a id="e-auth"></a>
**AUTH** — Capability profiles, scoped integration keys, human workspace roles and [credential-bound agent principals](agent-credential-principal.md) for native review; not a universal task capability broker.

[src/auth/agent-key-profiles.ts](../../src/auth/agent-key-profiles.ts), [src/modules/api-keys/api-key.service.ts](../../src/modules/api-keys/api-key.service.ts), [src/modules/workspaces/workspace-access.routes.ts](../../src/modules/workspaces/workspace-access.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-broker"></a>
**BROKER** — Encrypted integration secrets, scoped credentials and [native task capability grants](task-capability-grants.md); no general tool/secrets/risk broker.

[src/integrations/secrets.ts](../../src/integrations/secrets.ts), [src/auth/capabilities.ts](../../src/auth/capabilities.ts), [src/operations/provision-agent-host-key.ts](../../src/operations/provision-agent-host-key.ts), [scripts/roost-agent-host-windows.ps1](../../scripts/roost-agent-host-windows.ps1).

<a id="e-risk"></a>
**RISK** — [Bounded native task assessment](native-task-risk.md) computes the
maximum of seven impact dimensions, escalates uncertainty and canonical related
changes, and binds immutable assessment versions to Ready/execution/grants.
`task-risk-contract.ts`, `task-risk.ts` and the forward native-task-risk migration
own this boundary; API/DB, classifier and PL/EN browser tests cover it. Broader
company risk discovery remains absent. [RF-SEC-002 native admission](native-risk-admission.md)
adds exact-operation evidence, independence, expiry and SQL/API/host gates; it does
not execute verification, backup, restore or releases.

[src/modules/company-objects/company-objects.routes.ts](../../src/modules/company-objects/company-objects.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-review"></a>
**REVIEW** — Native human or credential-bound agent review and manager correction return are governed by [RF-CTX-014](task-review-workflow.md). Gate 2 proved managed independent exact-commit coding review; exact-commit release authorization remains absent.

[src/modules/company-os/company-os.routes.ts](../../src/modules/company-os/company-os.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-resource"></a>
**RESOURCE** — Repository mapping only; full Docker/service/resource lifecycle still a target.

[config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [docker-compose.yml](../../docker-compose.yml), [docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-backup"></a>
**BACKUP** — Native local PostgreSQL dump/restore, schema/data parity, encrypted
read-back and owned test-database cleanup pass. Owner prerequisites and production
Roost backup/restore and the full encrypted pilot backup are verified.
The shared bounded fingerprint fix passes local native parity/termination tests.
The pilot VPS recovered on 2026-10-03 with a new PostgreSQL start and no active
fingerprint query, reconciling the interrupted read. Public health/readiness
pass and bots remain paused. Native streaming fingerprint and backup/Worker
checks pass (26 passed, one opt-in skip); sort/temp resources and process cleanup
are bounded. Full pilot backup proof now passes; the provider storage
cause is unverified and no hard PostgreSQL RSS ceiling is claimed.
A production owned restore matched full data/sequences and, after guarded
public-owner-class normalization, the exact historical schema. The source was
unchanged. Native tests qualify both owner classes and connected-client refusal;
explicit exact-owned cleanup removed the interrupted attempt and lock without
promotion. A subsequent monitored normal gateway backup
`811332d3-67ab-4e9c-afae-c12bc374fa84` completed at 2026-10-03 13:47:38 UTC:
212,322,910 archive bytes, encrypted latest read-back, source before/after and
isolated restore schema/full-data/sequence parity, restore/lock absence and zero
owned sessions. Both persistent channels closed normally; minimum monitored
memory/disk were 4,938/12,844 MiB. Earlier uncertain attempts were reconciled
without promotion. This qualifies backup, not pilot release. The baseline execution
service/image was removed by a global host pruning timer. Logs also prove that
timer removed a newly created Roost backend; it is disabled with configuration
preserved. Roost's normal controller recovery and exact health/build pass, but
pilot baseline recovery subsequently passed through normal pinned queue
`r0ea03ba3b84040e68fce52a`: exact unchanged source, retained image, running
state, zero restarts/OOM, six runtime/configuration rows and health/readiness.
Post-startup full data/sequence/schema parity with the certified backup passed
at 14:14:05 UTC. Current Ready and append-only result-basis revalidation
`06bd2036-cae5-4680-9e16-b4a6149c1343` passed after including every effective
accepted task decision; the rejected prior request was reconciled. Historical
independent acceptance passed in execution
`4d7e218a-c632-410c-8a18-3edf11fb4a9d`, decision
`0a0751be-8633-430a-b350-e3b8b796957a`, with unchanged native state and owned
cleanup. Latest reviewer `5d505c06-8f0d-48c9-88ae-2ecd80b517c3` rejected
missing native RED evidence. Manager return
`f94a6688-ead6-4815-975d-6fd48e24e135` and new managed execution
`2948f84d-fa86-4d14-8c73-621bc41ba6fb` now prove native RED/GREEN (one failed
assertion, one passing test), retaining the exact commit without source/history
changes. Signed admission, unchanged footprint, closed Job and absent writer
lock passed. Fresh reviewer `0d66d98b-3f24-4ff9-a991-6ac9b1461ec9`
approved through decision `655a3ade-567d-496e-821b-9a5fa2367d21` on the
current mapped basis. Release audit `def562bd-bb5f-44e7-abdb-822b02edefa4`
completed with unchanged native state and closed Job; it reported conditional
frontend suitability. Its missing-candidate-acceptance statement was reconciled
against the authoritative current approval. One-web release preparation passed
without granting authority or executing external effects. Exact owner release
consent was subsequently recorded. Six authorized auto-deploy controls are off
with unchanged configuration apart from that field and unchanged runtime images.
Exact grant `7f28822a-c4bd-444d-877f-f351038bf6cf` is active. Public retained
repository support preserves private certification refusal; zero-effect preflight
recovery qualified its signed Writer. Actual release/production proof is pending.
Installed HTTPS ingress passed a certificate-pinned validation refusal. Internal
atomic evidence construction after a single normal fence has 17 source tests;
external stale CAS remains denied. Production refusal was traced to five stale
risks in the complete six-task impact, distinct from CAS denial. Same-group
reassessment used unchanged individually read policy revisions; native evidence
and seals passed in a fully rolled-back transaction. A subsequent real pinned
HTTPS handoff verifies protected storage, device ACK, active epoch 3 and revoked
epoch 2. No pilot release is claimed.

Standalone provider inspection now resolves the same verified canonical workspace
as normal Worker startup. The actual Windows check admits the managed profile
without blockers; 28 provider tests pass. This corrects an inventory false denial,
not a new model execution or pilot release proof.

[Governed release evidence](../operations/governed-release.md),
[backup gateway](../../scripts/lib/agent-host-release-backup.mjs),
[native backup tests](../../scripts/agent-host-release-backup.test.mjs),
[docs/operations/rollback-and-recovery.md](../../docs/operations/rollback-and-recovery.md).

<a id="e-release"></a>
The second application's Compose release remains pending. Its separate strict
provider, installed controller/queue/health contracts and actual PostgreSQL 15
encrypted backup with isolated verified restore are recorded in
[governed Compose release](../operations/governed-compose-release.md).
This prerequisite evidence does not establish a deployed application or rollback.
Historical exact c82 review `60699758` / decision `82672c5e` approved material b5de
after native audit `8469a7d0` of replacement manifest 06bf. Both signed Jobs
closed unchanged at exit zero. The audit retains all sixteen negative findings;
qualified monitoring configuration does not prove future event delivery.
At that checkpoint the exact owner package and separate grant were prerequisites;
deployment, observation, fixture cleanup and independent final acceptance are
still unproven. Historical 3e and original review records are preserved.
Independent review rejected the initial build fix for missing regression evidence.
Managed log-only `c82e68b3` now has its own seven-test and canonical native build
receipts and independent native acceptance (`41e75879`, decision `25632c42`).
Governed deployment and postrelease proof remain pending; the activity fixture,
cleanup and resume contracts are source integration, not production evidence.

Current native audit `d1004c62` retains twelve literal CHANGES_REQUIRED findings.
Fresh Windows build `3e8510be` passes the canonical build and seven tests with
source/dependency parity, restored outputs and both Jobs closed. Independent
execution `62ee94ce` accepts exact c82/material eed23 in normal approval
`17f8c1db`; signed closure and official Worker stop pass. Private qualification
checks pass 137 tests, including forged-proof and native-path refusals. The
normal owner grant `63750d89` binds unchanged 742 and the fresh nine-read
baseline, using the preserved same-gate mandate. It is read back and bound to
the official Worker under root-supervised 30-second journal reads. Later normal
reconciliation proves both deployment queues absent and prior services healthy;
signed native closure covers four operations and 52 closed children. Both
successful configuration mutations and original evidence clocks are retained.
Read-only VPS rehearsal `242d0888` proves the bounded migrator-validation repair;
202 focused Worker checks pass. Closure/adoption and prior regressions pass 96
tests; typecheck passes. Exact closure uses the actual rollback configuration,
fresh nine reads and newer native closure. Explicit renderer adoption derives
configuration/artifact digests while retaining physical state and published Git.
Roost backup `f478b19d` passes encrypted-copy and isolated-restore verification.
The production two-queue FAILED closure and updated
renderer/manifest remain pending. Deployment,
20-minute observation, fixture cleanup, cadence recovery and independent
postruntime acceptance remain unproven; no whole-product readiness is claimed.
See [current release evidence](../operations/application-release.md).

**RELEASE** — Gate 3 is certified on the sole temporary target (2026-10-02).
Gate 4 exact candidate `7512bc395d65df0fca7cf701047033031f63eb7e` was deployed;
observation failed at 1055 seconds on one API health probe with unchanged data,
healthy frontend and ready API. Rollback queue finished on the baseline commit
with a different rebuilt image; exact baseline image is absent from Docker and
containerd. Normal read-only reconciliation recorded exact-image failure; Worker
stopped and released its Writer. Recovery
is unqualified; this attempt does not certify Gate 4. Probe cause is unproven.
The owner-adopted new baseline has an authenticated encrypted exact OCI image
backup and verified local restore; 41 sealed health samples cover 1200 seconds.
Recovery support is deployed on `a0ec89e4`. New exact-commit verification source
`6213ed52` passed 9 native existing-commit, 6 signed-pointer, 30 native-boundary/replay
and 8 backend admission checks, plus validate and codex:check. Immutable FAILED
closure `90e65069-4a8e-465b-ae37-8e6692e68fa0` and native same-commit verification
`d670f051-3c9a-42f6-8438-25c7ccde124d` are proven. Independent new review
`a4aa7a19-7e2b-4231-9025-8a6d4b9c5c03` remains historical after audit-context
updates. Current decision `01d5559f-5b83-4de5-8efd-5908733dcef8` approved
the exact candidate after managed audit `e62dcbd8-2094-422a-9d9a-2cb48e556220`;
normal API reads confirmed acceptance and Ready before grant admission. Scoped
owner-authorized obsolete-resource cleanup recovered build
capacity; current full data parity and six retained runtimes passed. Managed
release proof now includes the full observation. New grant
`da2536bd-eb56-45c0-87a6-06967a53e676` and once-dispatched queue
`r39bd5854d21bc53ac279b63` are proven; normal reconciliation confirms exact
candidate/image `a2c974de` and unchanged schema/data. Interrupted observation
was uncertain and was reconciled after a new full 1238-second healthy window.
Retention cleanup succeeded and the grant is completed; normal stop and signed
terminal checkpoint/child-absence checks pass. Fresh postrelease auditor
`717a9845-3e47-46e0-83c9-e72bd007f10e` has verified unchanged native state;
its blocked semantic response is preserved, with evidence gaps supplied to
distinct verifier `5ad30a92-d457-4456-957f-4e480e81ed27`. That verifier returned
`verified` and its paired native receipt confirms the exact prior audit,
unchanged state, closed Job and zero active children. Normal Worker stopped;
Writer absent. Gate 4 is proven for this bounded PWA repair.
Worker `98d96126` qualifies an exited signed owner despite actual
Windows PID reuse, with current native creation identity and unchanged
grant/journal checks. Seven recovery checks passed; unrelated process retained.
The owner accepted the current healthy rebuilt image as a new baseline, with
data and paused trading preserved. Final independent postrelease verification passed;
provider backup
mounting is no longer a dependency of this new path.
Managed existing-commit continuation `2948f84d-fa86-4d14-8c73-621bc41ba6fb`
proves native RED on the parent and GREEN on the unchanged candidate, paired
unchanged state and a closed Windows Job. Historical initial reviewer execution
`0d66d98b-3f24-4ff9-a991-6ac9b1461ec9` approved the exact candidate as
`655a3ade-567d-496e-821b-9a5fa2367d21`; release audit
`def562bd-bb5f-44e7-abdb-822b02edefa4` assessed the full bounded context.
Separate first-write consent and owner release authority were recorded.
Grant `7f28822a-c4bd-444d-877f-f351038bf6cf` binds that review, material and
single frontend scope. Normal Worker push, PR 1, review and exact merge pass.
An uncertain merge was read back without repeating the mutation. Original
uncertain configuration was proven absent against immutable protected preimage;
the next configuration succeeded. Deployment `ra59fe70c4ae9d08d7cf9627` was
dispatched once and finished; after its short queue wait expired, normal Worker
reclaimed the signed closed checkpoint and reconciled the exact healthy runtime.
No direct bootstrap pilot edit or manual pilot deployment counts as proof.

Root production HTTP/PNG readback shows the original `/logo.png` screenshot
declaration changed from 512x512 to the actual 1000x1000. This observation is
distinct from managed coding/review and is supplied with provenance to the final
verifier. Full encrypted backup/isolated restore
`811332d3-67ab-4e9c-afae-c12bc374fa84` and unchanged schema/data pass.
Trading and external sync remain paused, historical PAPER data retained and
Gate 2 local branch preserved. The other five services and rollback images are
protected. See [current application evidence](../operations/application-release.md)
for exact image, digests, current state and retained historical failed attempts.
This is one PWA repair plus audited existing frontend catch-up; it does not
certify all product flows or LIVE trading. Historical older approvals and
model-reported RED assertions are not the current native proof.
Normal Windows Worker/Hermes coding produced exact candidate
`de6ebe7a4267078196534a36f73ff9bccb09d3ae`; independent review
`154d5cc2-904b-4413-9947-4820ee413648` and a separate native release audit
preceded owner grant `21585a17-79ca-4623-aa63-4018f1d03965`. Changed-commit
admission returned 409 with absence read-back. Private GitHub Free branch/push/
PR 1/review/exact merge passed. An uncertain merge reconciled without repetition.
Candidate deployment `wx4xo4bq7he5a8i48xhmpbq0` was queued once, interrupted
by normal stop and reconciled as failed after restart. A sealed HMAC checkpoint
qualified the exact grant/journal and sixteen closed native children (twelve in
authenticated history). Actual health samples proved healthy-to-failed transition
on the exact candidate; the broker checked the payload despite HTTP 200.
Rollback `dzy2y8t689far4zowki7hte4` restored the exact compatible baseline
image/config/schema and passed a 64-second healthy observation with unchanged
synthetic data. This no-database target does not prove real business-data rollback.
Separately, actual encrypted production backup/isolated restore proved schema,
row/sequence parity and owned restore database cleanup.

Final read-only certificate at 11:24:05 UTC proved sixteen owned resources absent,
the exact private repository archived and canonical clone removed. Journal status
is `completed`, with 34 resolved operations including historical failed/absent
attempts. Roost ApplicationEvidence `e3bac90e-be97-4592-82e0-783180267af5`
is verified; payload digest
`a27e5b585f4879dd5624ca1e68faef7da6948dd60088605d694cca92d3e212a2`
binds native, review, interruption, backup, health, rollback and cleanup proofs.
Five test tasks, three roles and the application were archived with evidence
retained. Owned runtime configuration and dedicated agent keys were cleaned up;
shared configuration, credentials, services and the local Gate 2 pilot remain.
Native Windows Git/Job/crash/reclaim, focused provenance/cleanup checks, additive
PostgreSQL migration and real HTTP checks supplement this actual certification.

Before coding, native baseline auditor `28c85e4a-01de-40d0-a5ed-86bebdb09eac`
and independent verifier `dcdef197-189c-48a0-ad22-14861f5e6d0d` completed
on an unchanged baseline, with verified read-only receipts and closed Windows
Jobs. Earlier expired/uncertain audit attempts were reconciled without accepting
their results. The certified release also exercised the Gate 2 ownership recovery
repair. This does not certify every hypothetical crash or all portfolio release
requirements. At that certification boundary the pilot was neither pushed nor
deployed; current Gate 4 evidence is recorded above.

[Operations and evidence checkpoint](../operations/governed-release.md),
[server authority](../../src/modules/agent-runtime/governed-release.ts),
[Worker broker](../../scripts/lib/agent-host-release-broker.mjs),
[Coolify adapter](../../scripts/lib/agent-host-release-coolify.mjs),
[GitHub adapter](../../scripts/lib/agent-host-release-github.mjs),
[resource gateway](../../scripts/lib/agent-host-release-resources.mjs).

<a id="e-health"></a>
**HEALTH** — Roost health/readiness build metadata exists; not full multi-app functional health.

[src/server.ts](../../src/server.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts), [docs/operations/post-deploy-smoke.md](../../docs/operations/post-deploy-smoke.md).

<a id="e-test"></a>
**TEST** — Existing API and host tests; their presence does not prove all future procedures.

[src/tests/api.test.ts](../../src/tests/api.test.ts), [docs/engineering/testing.md](../../docs/engineering/testing.md), [scripts/test-api-local.mjs](../../scripts/test-api-local.mjs).

<a id="e-idemp"></a>
**IDEMP** — Lease/CAS fencing and provider event inbox primitives, not general external-operation receipts.

[src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [src/integrations/clickup/clickup.sync.ts](../../src/integrations/clickup/clickup.sync.ts).

<a id="e-redaction"></a>
**REDACTION** — One bounded API/host policy, fail-closed required input, sanitized
native diagnostics and on-demand legacy projections; value-free incidents.

[Contract](native-runtime-redaction.md), [canonical policy](../../scripts/lib/agent-runtime-redaction.cjs),
[API boundary](../../src/modules/agent-runtime/runtime-redaction-http.ts),
[write boundary](../../src/modules/agent-runtime/runtime-redaction-data.ts),
[host boundary](../../scripts/lib/agent-host-redaction.mjs),
[tests](../../scripts/agent-runtime-redaction.test.mjs), [API/DB tests](../../src/tests/api.test.ts),
[UI checks](../../scripts/agent-runtime-redaction-ui.test.mjs),
[migration checks](../../scripts/agent-runtime-redaction-migration.test.mjs).

<a id="e-incident"></a>
**INCIDENT** — [Native capability suspension](native-capability-suspension.md), `src/modules/agent-runtime/capability-suspension.ts`, the forward `20260908090000_native_capability_suspension` migration, API/DB tests and PL/EN suspension UI. Safe redaction incidents remain separate; no automatic bulk reclassification or general external containment.

[src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts).

<a id="e-dry"></a>
**DRY** — Synthetic recovery/lease/writer checks exist; not full readiness fault campaign.

[scripts/agent-host-recovery.test.mjs](../../scripts/agent-host-recovery.test.mjs), [scripts/agent-host-execution-lease.test.mjs](../../scripts/agent-host-execution-lease.test.mjs), [scripts/agent-host-writer-lock.test.mjs](../../scripts/agent-host-writer-lock.test.mjs).

<a id="e-auditor"></a>
**AUDITOR** — Gate 2 has native read-only auditor/verifier proof. Gate 3's
baseline auditor completed with unchanged Git, listening TCP and running
container observations, no native tools and a closed owned Windows Job.
Its independent verifier completed on the same exact baseline and prior audit
digest, with unchanged observations and a closed owned Windows Job. Continuous
canary activation remains unproven.

[scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [scripts/lib/agent-host-execution-packet.mjs](../../scripts/lib/agent-host-execution-packet.mjs).

<a id="e-act"></a>
**ACT** — Normal execution admission binds actual auditor/verifier receipts and
an exact one-time first-write Decision. Gate 3 has both native baseline proofs
and separate owner consent/normal exact first-write acceptance. The first managed
candidate and governed release/recovery passed on the temporary target. This does
not certify the entire activation ladder.

[docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-demoapp"></a>
**PILOT** — Declared DemoApp identity only; no DemoApp runtime correctness, exchange permissions or live-test proof asserted.

[config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-integration"></a>
**INTEGRATION** — Real connected-provider operations exist; no universal isolated test ownership contract.

[src/modules/google-drive/google-drive.routes.ts](../../src/modules/google-drive/google-drive.routes.ts), [src/integrations/clickup/clickup.client.ts](../../src/integrations/clickup/clickup.client.ts), [src/modules/integration-settings/integration-settings.routes.ts](../../src/modules/integration-settings/integration-settings.routes.ts).

<a id="e-attention"></a>
**ATTENTION** — Host status and execution evidence surfaces, not full four-category attention center.

[web/src/features/settings/agent-connections-section.tsx](../../web/src/features/settings/agent-connections-section.tsx), [src/modules/dashboard/dashboard.routes.ts](../../src/modules/dashboard/dashboard.routes.ts), [src/modules/agent-events/agent-events.routes.ts](../../src/modules/agent-events/agent-events.routes.ts).

<a id="e-lang"></a>
**LANG** — PL/EN localStorage/auth preferredLanguage UI selection and English
fallback; ultimate fallback still exposes key. Workspace canonicalLanguage is
available to Findings but creation-time immutable choice and separate
communication/translation routing are incomplete.

[web/src/i18n/i18n.tsx](../../web/src/i18n/i18n.tsx), [src/modules/workspaces/workspaces.routes.ts](../../src/modules/workspaces/workspaces.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [web/src/i18n/locales.ts](../../web/src/i18n/locales.ts).

<a id="e-time"></a>
**TIME** — UTC DateTime storage and browser-local Intl display; no persistent
manual user/workspace timezone or DST task scheduler.

[prisma/schema.prisma](../../prisma/schema.prisma), [src/modules/workspaces/workspaces.routes.ts](../../src/modules/workspaces/workspaces.routes.ts), [web/src/i18n/date-format.ts](../../web/src/i18n/date-format.ts).

Compose SQL scope parity: additive migration
`20261004223000_release_compose_scope_parity` and
`application-release-compose-scope-migration.test.ts` reproduce historical
Compose/relative-directory refusal, preserve all other scope predicates, compare
35 SQL/server directory cases, exercise 20 changed scope denials and preserve
records plus four release guards. Installed rollback probe for manifest06bf
verifies exact admission, five refusals and restoration of validator
`508e57ae3c63491ffa321ab46a3c5565f900756f22e026477cfc9aa1d1cd7a26`.
Owner consent remains historical and no grant/application deployment is proven.

Production commit `865825fd` and deployment `kmyn20lzp0tmrt53epe4g9e1`
confirm health/version and the applied migration; installed SQL scope admission
is true. Fresh manifest0857 preserves its eight sealed artifacts. Normal risk
refresh invalidated b5de; append-only mapping `4c0aff60` binds bbb8, accepted
independently by signed native review `2f9b16e5` / decision `e209eefa`.
The review input measured 130281/131072 bytes; Job closed at exit zero with
unchanged source and no active children. Snapshot826/606 remains historical.
Readiness audit `79c10809` measures 130592/131072 bytes and completes at exit zero
with signed admission, unchanged source/Git/process/Docker state and no model
native tools. It retains sixteen literal `CHANGES_REQUIRED` findings. Its
frozen b5de package snapshot remains historical; the append-only current-basis
reference separately qualifies review `2f9b16e5`, decision `e209eefa`, material
bbb8. No application push/deploy or release grant is established by these reads.

Normal owner preparation qualifies manifest0857 against current code acceptance,
eight physical seals, native baseline/health, unchanged data/sequences, capacity,
backup and credential metadata. Installed SQL admits this actual manifest.
Current V9 monitoring proof binds the full sealed policy and deployed source;
future events and external alerts remain unproven. A normal execution view includes
mutable host relations: preserve its historical full hash and independently match
the original immutable native terminal/selector; do not rewrite the reference.
Owner/monitor/Worker checks pass 81 cases; the terminal-bound qualifier passes
38 cases. Owner consent for exact manifest0857 now creates verified grant
`a14dba8b`. Its first official Worker stops before any Git/deployment intent:
the local guard incorrectly requires a direct parent for the accepted repair
series. Five native children are closed and the signed Writer is retained.
The repaired local/remote guard verifies exact head/tree/base ancestry, limits
the range to 100 commits and preserves non-force Git updates. Root verification:
37 GitHub/materialization/broker checks and the actual Windows multi-commit
checkout Job pass; all seven children close. Application release proof pending.

Actual same-grant Worker publishes PR 2 and reconciles its uncertain merge;
remote main, PR head and merge commit all equal `c82e68b3`. Configuration intent
`92892242-1a4e-4fe9-907a-686265805937` remains uncertain. The controller closes
at exit zero with 88 registered children closed; its signed Writer is retained.
Read-only HTTPS confirms unchanged legacy source/custom commands. Native reads
confirm the exact staged artifact and installed source pins; the actual Laravel
validator rejects only the two generated command fields. The read-only fixed
CAS qualification passes for candidate and rollback. No candidate queue or
deployment has been started. Source recovery and native proof remain pending;
these reads do not establish configuration absence in the Roost journal.

Later official reconciliation observes configuration absent at
`2026-10-05T00:02:49.601Z`; the signed controller closes 88 children and exits
zero. Its closed HMAC checkpoint is archived before normal Writer release.
Normal owner closure `2eb9cdfd-5e13-40db-b594-4fe44f01285a` marks release
`a14dba8b` FAILED and records revocation `589dcee6`; no candidate deployment
occurred. Normal credential rotation is stored/read back through Windows
Credential Manager; the prior credential is revoked. No secret is retained in
repository evidence.

Roost `c185743df827c3f9c9137fdaf6a4456c7a8e109b`, deployment
`kcefoojxmg4hm1jmhvuossyw`, passes exact HTTPS health/version. Additive migrations
`20261005003000_compose_config_absence_closure` and
`20261005010000_compose_config_absence_current_review` are applied; exact Git
blob checksums match the installed ledger. Restart can retain the same current
exact code review/material after this no-effect closure. A new native manifest
audit and separate exact owner grant remain required. Rotation is verified;
fresh baseline `2026-10-05T00:16:39.335Z` and package `30a3665f` retain four
protected images and all schema/data/sequence facts, with eight physical
installed read-backs. The new audit risk scope invalidates group Ready and
current code approval. Preserve the historical review; freeze audit admission
before native execution, then renew coder Ready/result basis and obtain a new
independent code review before preparing exact owner release authority.
Source checks cover stale/rejected/changed acceptance denial; this does not prove
a new application release. The applied earlier migration remains unchanged.

### New exact manifest audit and independent current code acceptance

Native audit `07a0bb46-b138-4646-b1dc-a58d5cf7b6b1` completed its first
attempt at `2026-10-05T00:57:27.042Z` for manifest
`30a3665f52def7eafcf5b78ff5c04c0c03a197933e807833da199e70ebb2bb74`.
Signed native admission, closed Job/exit 0/zero active processes and unchanged
Git/repository/process/Docker footprints are verified. Its `CHANGES_REQUIRED`
finding remains evidence of pending release requirements.

Append-only coder revalidation `aa508e81-0dd9-41a5-b623-2815a3b9a9c9`
creates current material
`84e56c664e8c53249b62f2910734263cebfa544926234944f193b2120a89bb0d`
for unchanged `c82e68b30f937e00438d6b64a3c39e010364e24d`.
Independent native execution `0ad18541-c50d-4292-baf9-bc0b4c9219b9`
completed at `2026-10-05T01:05:22.298Z`; decision
`8e1d7f02-284a-4a54-8966-b612d28b6a11` approves this exact commit/material.
Signed Job closure/exit 0/zero active processes and unchanged native footprints
are verified. Both official controllers stopped with exit 0. Original approvals,
rejections, frozen admission and eight installed artifacts remain preserved.
Actual inputs are 130313/130282 bytes against the unchanged 131072-byte limit;
Hermes usage is unavailable. Current normal review and new manifest readiness
are qualified, but a separate owner grant and all production proof remain
pending. No new application deployment or gate completion is claimed.

### Expired preparation refreshed without transferred authority

The 30a preparation expired without owner consent or a grant. Actual baseline
`2026-10-05T10:25:28.713Z` and installed manifest
`e82fe60c7a3b4c7e364dd910060ebe76aae39e97da3d676a4d12e450a942347f`
retain the exact candidate, backup/restore, four images and configuration/schema/
data/sequence parity. Read-only inspection after the maintenance effect window
expired verifies held writes/cadences without extending that authority. Eight
physical files have exact read-backs. Normal ordinary agent credential rotations
and Windows Credential Manager read-backs are verified; secrets are not stored
in repository evidence. The new native audit, current independent code review,
separate exact owner grant and production proof remain pending. Historical
reviews and audit findings remain dated evidence, not current release authority.

### Backup renewal after closed Compose configuration absence

Native review `3686c46c` / decision `443d72ed` accepts unchanged `c82e68b3`
on material `d21b44dc…565fd1`, with closed signed Job and controller. Audit
`699f795f` retains `CHANGES_REQUIRED`. Actual encrypted backup/isolated restore
`52c6187d` verified at `2026-10-05T17:35:14.698Z` preserves schema/data and the
prior copy; the owned restore database is absent. Package `742c2d4d` changes
only backup and retains eight exact installed files. Shared/server predicates
and forward migration `20261005033000_compose_restart_backup_refresh` reject
runtime/data/rollback/observation changes and clock-only archive reuse. Native
new-manifest audit, current approval, exact owner grant and deployment remain
pending; the existing 24-hour backup prerequisite is unchanged.

Roost `ac4203a8` deployed through auto queue `fu0dbjl0ci7wgmw75x5xdpoi` with
exact public version/health readback. Actual closure request `b02da409` left
zero closures; read-only PostgreSQL checks expose missing two-queue SQL guard
support despite 96 passing source/API checks. Forward migration, actual FAILED
closure, replacement package/audit/grant and application runtime are pending.
Roost backup/restore `c3f26c34` verified at `2026-10-05T22:53:48.554Z` protects
that migration; no application deployment or completed-gate claim is made.
#### Two-queue SQL proof, 2026-10-05

RF-REL-004 and recovery/Git inheritance retain exact authority and immutable
history through additive migration
`20261005230000_compose_queue_absence_closure_adoption`. Actual release
`63750d89` passed eight probes in receipt `1f8734aa` with a rolled-back DDL
transaction and exact function/history readback parity. Disposable PostgreSQL
closure/adoption and negative insert checks passed (five tests); 59 focused
shared/backend checks and typecheck passed. This is database guard proof,
not a persisted FAILED closure, deployment or gate completion. Native/new
manifest audit and actual Aviary release proof remain required.
Roost `241c1264` deployment is verified by finished queue
`ukrtf327hyqx5hhxpltf6bmu` and exact health/build-info at 23:13:20.610 UTC;
database readback verifies committed migration checksum, four functions, two
guards and unchanged four-operation/zero-closure history before normal closure.
Normal FAILED closure `4a98987c` is persisted; V8/V3 credentials are verified.
Eight-file manifest `b374cfe3` and readonly native audit `ba9a2999` are recorded.
All 17 CHANGES_REQUIRED findings remain literal. Current independent approval,
owner release authority and actual runtime acceptance remain pending.

Unchanged readonly audit-basis support adds guarded migration
`20261006002000_readonly_completed_result_basis` and matching API eligibility.
Actual API receipt `aaa0b17f` records the shared-risk Ready invalidation and old
coding-only refusal. Root checks passed: 57 focused/rejection tests, 39 checks
with real disposable PostgreSQL forward migration and history preservation,
and `npm run validate`. Original audit/native/CHANGES_REQUIRED evidence remains
immutable; a new mapping grants no release authority. Roost `3403347e` is
deployed and normal audit mapping `d7758c8c` is persisted. Review `228eaf9c`
was refused at measurement (136612 > 131072 bytes), before model launch;
the original refusal remains retained. Independent approval and Aviary
production proof remain pending.

Provider input now deduplicates only identical capability domain and readiness
dimension records through complete local tables, exact canonical restoration
and strict relation indexes. The original context still controls redaction,
Ready and freshness; the 131072-byte cap and all permissions remain unchanged.
Root's 80 component/integration checks, `npm run validate` and `codex:check`
pass. Roost `3274aef5` and sole queue `e9gvqvplxp8eigmhn0v95axi` are confirmed.
Same-queue measurement passed at 130426 bytes. Actual reviewer `228eaf9c`
failed strict JSON validation: two correction arrays were returned as strings.
Its raw rejection has no accepted decision. Controller 124956 closed with
exit 0; normal terminal reconciliation and shared writer reclamation passed
at 00:27:11.377 UTC with unchanged source. Explicit JSON type/bound instructions
pass 128 relevant checks. A new actual review and release proof remain pending.

Roost `e7b8d052` deployed through sole queue `o11d3hmtbp40trqo7j1u3zuw`;
health/version confirmed at 00:30:57.068 UTC. The raw rejected review also
reported missing independently supplied audit evidence. Optional code-reviewer
prior-audit pins, leased API retrieval, original signed native/closed-job checks,
complete findings and sealed provider transport address that gap. Root's 162
relevant checks and corrected 74 packet checks pass without skips; validation
passes. These are supporting source checks, not a new accepted model verdict.

Roost `171a76f3` deployed through sole queue `zhes1pyhu5s7ndfsju21k83o`;
health/version confirmed at 00:45:57.460 UTC. Migration
`20261006010000_code_reviewer_prior_audit_risk` checksum and schema mirror
match the deployed source. Actual input measurement: 130296/131072 bytes.
Review `ab692270` stopped before model launch at backend-evidence persistence:
old signed admission files from failed `228eaf9c` remained active. Normal
reconciliation and shared writer/application reclamation completed at
00:54:42.763 UTC. The expired authenticated prior pair was archived with exact
byte preservation. Worker failure cleanup now requires the same execution's
signed pair and an observed closed native Job; it retains the original failure
and ownership fences. All 50 managed/prior-audit checks, including actual Windows Jobs, pass.
A new actual accepted review and application release remain pending.

| Current second-application evidence | Observation | Limit |
| --- | --- | --- |
| Review `4793c21f`, decision `f3df40a7` | Actual signed native completion at 01:03:22.463 UTC on 6 October; unchanged workspace; original audit provenance artifact PASS; code REJECT for log chronology. | No code acceptance or release authority. |
| Official controller `124596` | Normal close at 01:06:09.475 UTC; owned native Job closed with zero active processes. | No app deployment. |
| Manager correction preparation | Existing extension version 2, current nine-member risk and normal return procedure admitted; rotation/correction checks 7/7 and 3/3 pass. | Manager credential expired; fresh owner authentication needed. No manager return or app edit yet. |

Subsequent normal rotation/readback and manager return `99bb9555` completed.
Its former review basis is historical rejected lineage, not current acceptance.
The compound-intent heuristic's “and build receipts” false positive is repaired
with 97 packet/single-task checks, including separate build-target rejection.
Actual Ready `ce767548` and correction `645f792b` completed on 6 October,
09:47:41 UTC: log-only successor `c64378df`/tree `968ff13c`, seven tests pass,
native Job closed/zero active processes and twelve protected sources unchanged.
Test/local-commit receipts `ccf6cddf`/`4f4bcbfe` are current successor evidence;
`c82` receipts are historical. Official Worker stopped/controller exit zero.
Roost `f817253b` deployment health/version passed at 09:41:27 UTC. Distinct
successor canonical build, independent review and release remain pending;
earlier chronology and authentication observations remain dated.

| Successor build `6c602f42` | Actual exact-`c64378df` canonical build and seven-test rerun completed at 10:01:33.755 UTC on 6 October; two closed Jobs, exact frontend build revision, unchanged sources/dependencies/tooling, original outputs restored. Signed evidence `e04c6ba0`, canonical handoff `13596acd`. | No deployment/runtime or full-product claim. |
| Successor review preparation | Current coder `645f792b`, original material `39d86760`, twelve unchanged source seals and full latest log; 34 factory, 53 build-boundary and two material-drift checks pass. Expired reviewer credential rotation prepared. | Fresh owner authentication required; review not yet launched or accepted. |

Successor code review on 6 October: execution `234dfc97` → decision `4dc1812a`
APPROVE for `c64378df`/tree `968ff13c`, original material `39d86760`. Read-only
receipt `a133fa3d`, signed native admission `5850fcb0`, exact archived pair
verified, owned processes absent and controller closed. Full provider input
117841/131072 bytes. Prior rejection4793 stays historical; new application
package/audit/Git/deployment/observation are not yet proven.

| Successor retained baseline `c91c8af5` | Nine actual bounded reads completed 6 October 10:25:43.241 UTC, receipt `3ca9eefd` / source `df7b4431`; full retained parity, holds, capacity, protected images, original verified backup and absent candidate queue. Collector 72/72 checks. | Read-only; no backup clock renewal, historical closure promotion or release authority. |
| Successor exact package `8ec8b319` | Manifest `4b9db111`, package `a379d906`, selector `6143d6c3`; eight exclusive new file writes with qualified physical readback. Factory 22/22 checks and independent thin-installer source review. Existing package bytes preserved. | Pure-factory summaries describe pure preparation; actual root installation created one directory, eight artifacts and three intent/receipt files. New audit, grant, Git and runtime proof pending. |
| Successor audit admission refusal `0fe8c893` | Failed before model/native launch at 10:38:23 UTC, inherited risk pin `c82` against actual `c643`; empty verification/usage. Official Stop and normal terminal-before-spawn core recovery closed the stale writer without manual deletion. | Failed attempt retained; no application effect or signed native audit. |
| Successor audit retry `31a929c9` | Cycle `042c1db4`, same manifest `4b9db111`; normal exact-`c643` admission/Ready accepted and actual input 118989/131072 bytes. Adapter 107/107, post-audit preparation factory 37/37 checks pass. | Queued; native audit, provenance review, grant, Git and runtime proof pending. |
| Successor native audit `31a929c9` | Completed 6 October 10:53:47.935 UTC, receipt `07f53107` / signed native digest `5709747d`; core archived signatures and actual process absence verified, capture `71ca5b64`. Sources/tree and Git/process/Docker unchanged; no tools/writes. Literal negative-format regression and existing formats: 16/16. | CHANGES_REQUIRED and eighteen findings preserved; code-basis/provenance review, separate Git base, exact grant and production proof pending. |
| Separate publication/runtime basis | Optional exact `gitPublicationBase` in ordinary Compose grants; broker, Git adapter and server validate publication commit/tree while preserving runtime/rollback. Component checks 113/113, typecheck, server/web build, validate and codex contract checks pass; independent source review found no blocker. Actual scope readback preserved the accepted review operation and its archived intent; normal basis mapping `a03758fe` is recorded. | Source/component proof; new independent review, Roost deployment, application Git and production release remain pending. |
| Current post-audit review `b2ff5d55` | Actual signed read-only execution completed 6 October 11:24:06.292 UTC; normal APPROVE `ab074cb6`, material `caaa3182`, exact `c64378df`, separate original audit artifact PASS with CHANGES_REQUIRED preserved. Native digest `0ba5c487`, core spent signatures/process absence verified, official Stop; input 128882/131072. Literal and cycle checks 129/129. Roost `425dff66` deployment finished, exact health/build-info 200. | Code/source-provenance acceptance; audit basis, fresh release grant, Git and installed-runtime proof pending. |
| Ordinary supplemental baseline proof | Single permanent Compose release supports fresh nine-read parity without fabricated restart or changed historical manifest clocks; all identity/digest/parity/count checks and independent time/backup/credential limits remain. 126 Node plus 42 existing baseline/absence/adoption/closure checks pass. Roost `a6654113` deployed through queue `rt4byzaslvfawxuxcbstq60n`; exact health/build-info 200 at 11:34:23.632 UTC on 6 October. | Deployed mechanism; actual ordinary grant `ed01d66e` admitted 13:15:53.206 UTC on 6 October. Application release acceptance remains pending. |
| Original audit basis refresh | Same-intent Ready `341101da`, append-only mapping `0c942064`; normal current readback at 11:39:03.218 UTC on 6 October, material `9cecd33a` → `ad07a469`. Original native audit `31a929c9`, manifest and eighteen negative findings unchanged; no model rerun. Private recovery adapter 73/73 offline checks. | Basis freshness only; no deployment acceptance or promotion of CHANGES_REQUIRED. Unknown intents stay retained, never blindly repeated. |
| Ordinary current release and Git reconciliation | Grant `ed01d66e`, candidate `c64378df`, manifest `4b9db111`; actual push/PR3/review succeeded. Merge `e29f9d65` became uncertain, then exact GitHub SHA/tree/merged-PR readback and signed native Writer reclaim allowed observation-only reconciliation to succeeded. Both configurations succeeded; candidate `r0e25a42b35dbf63acefe4c0` and rollback `rbc8516e34a360ae1a48ab86` failed before build on 6 October at 13:34:55 and 13:41:34 UTC. Original healthy services/data/schema and paused cadences remain. | Real Git and configuration proof; neither queue absence nor successful rollback. FAILED closure, repaired-controller grant, deployment/1200-second observation, fixture cleanup/parity, 300-second cadence observation and independent postrelease acceptance pending. |
| Retained-baseline controller repair | Installed shell validation/injectors accept four new commands; installed helper CLI accepts matching image, rejects changed/missing image, and all transient containers are absent (13:54:47 UTC). New read-only Worker inspection has signed seven-child closure and no Writer/recovery locks. 181 controller/Worker/transport, 98 existing release/absence, ten retained-baseline SQL/contract and six private assembly checks pass; validate/codex:check pass. Actual eight-operation SQL rehearsal rolled back. Roost `1cfe5a0b` deployment `o5e52yrw37u4j9pyq4iopaf9` finished, exact health/build-info 200 at 14:05:17.988; migration checksum/functions/trigger read back 14:05:53.265. Fresh nine reads preserve one real candidate queue and both terminal failures; FAILED preparation `71757dee` qualified at 14:06:24.043. | Deployed recovery mechanism and native compatibility proof; normal FAILED closure `00b660cc` persisted. Host epoch six and ordinary releaser generation ten verified through normal rotations. No new release authority or installed candidate claim; new exact controller review/grant and full runtime acceptance remain required. |
| Retained controller successor package | Postclosure actual nine reads `a5701619` at 14:14:24.470 UTC retain both failed queues, with zero new-attempt candidate/active queues and no open application release. Installed digest-only preview binds old physical settings and four corrected commands. Eight private files were installed and read back, with actual seven-child native closure before/after; manifest `9e7e3e70`, package SHA `accf5986d00f37427debdf29354c1a0d4e76dbedce2ca7dc95c0ced19c590e28`. 56 offline package tests pass. | Prepared and physically qualified; no API writes, model calls or deployment from assembly. New native audit, independent exact review, grant and full release proof remain pending. |
| Retained manifest native audit | Actual `34b301fe` completed 6 October 14:25:44.319 UTC, manifest `9e7e3e70`, signed readonly/native closure and official exit zero; archived signatures and actual OS absence verified in capture `5e31ace4`. Nineteen literal CHANGES_REQUIRED findings remain. Strict negative-header/frozen-prompt guards pass 17/28 cases; current material `a3bbd77f` stays separate from the original prompt snapshot. New independent reviewer `91093e89` completed at 14:41:34.354 UTC, measured 129777/131072; current APPROVE `19ab2868`, separate audit artifact PASS and signed/official closure. | Real native audit and exact code/provenance acceptance; negative readiness findings remain. New grant and full deployed release proof remain pending. |
| Failed candidate partial rollout | Normal grant `f88a00cd`, manifest `9e7e3e70`; config succeeded, deterministic candidate queue `r2af379492107262c35b0524` failed at 15:14:33 UTC after recreating five containers. Migration exited one because SQLAlchemy asyncio could not import greenlet before connecting to the database. App is unavailable. Real read-only fingerprint at 15:29:02.466 UTC preserves baseline schema/data hashes; protected DB image remains unchanged. Official Worker closed; signed seven-child reconciliation checkpoint is retained. | Actual failed deployment, not a healthy candidate or retained-container proof. Governed partial-rollout recovery is being repaired; no Git or queue replay and no manual application deployment. Gate incomplete. |
| Materialized Compose recovery configuration | Exact candidate template qualification preserves live values and restores only verified generated container metadata. Actual fixed-reader configuration proof `a5b1c7f9` at 15:55:55.956 UTC reproduces sealed digest `f04c3bde` with zero differences. Actual installed PHP proof `73e45bcb` at 15:56:18.967 UTC rejects thirteen RAM-only mutations; no API/data writes. 138 projection/reader/CAS/gateway and 205 Worker/partial/broker tests pass; codex:check passes, independent source review passes. | Source and actual configuration evidence; recovery deployment and governed application rollback remain pending. No healthy candidate or completed gate claim. |
| Unknown revision failed-image recovery | Roost `019a1457` deployed by existing main autoqueue `vjkl3loeuha6arssxlqe5283`; exact health/build-info 200 at 16:05:43.848 UTC. Actual failed-image receipt `cf361e71` retains four `unknown` build revisions and null labels. Fixed-reader v2 qualification `507d7056` binds five actual services with false code provenance. 215 Worker/broker/diagnostic and 97 v1/v2 contract checks pass; real PostgreSQL rehearsal `4eac15b7` qualifies two valid profiles and rejects 21 mutations, restores the original function and leaves no DDL/data effects. | Typed failed-only recovery source and native read/SQL proof; v2 deployment, original failure reconciliation and planned rollback remain pending. Healthy candidate validation unchanged; gate incomplete. |
| Python dependency regression runner | Strict external standalone runtime, tracked Python/configuration and authorized test pins, fixed isolated probe/test jobs and meaningful unittest counts. Eight new offline cases pass; combined existing families have 21 passes and two legacy skips. Actual SDK receipt `f1530dac` seals 408 files/31129163 bytes with real dependency imports. Synthetic native receipt `46e271d2` records four closed Windows Jobs: RED one assertion failure among two tests, GREEN two passes, unchanged full runtime. Independent source review found no blocker. | Component source/native proof only. No managed application edit, Linux image proof or application acceptance. Separate Python regression replay and governed application repair remain pending. |
| Python baseline replay | 26 focused passes, one legacy skip. Actual synthetic receipt `12a6834e` on 6 October 16:30 UTC records real baseline TOML-read/assertion RED and unchanged candidate GREEN 2/2, four closed Jobs and removed projection. Receipt `c280f5fa` at 16:32:48 UTC rejects a fabricated marker/exit without unittest, retaining source and runtime pins. | Component proof only; managed Aviary repair and Linux image/migration remain pending. |
| Partial candidate recovery readback | Roost `5d164ae3`, queue `l12klv6aoly8ysogpdoaatws`, exact health/version and additive migration checksum passed at 16:18 UTC. Failed-only v2 reconciliation persisted at 16:21:22; `663e2086` retains false code provenance and data/schema parity. Rollback configuration `f3360dee` succeeded at 16:23:43. Queue absence and unchanged failed candidate were read back; PHP/native phase and queue admission checks passed without dispatch. | Rollback `08d579fc` remains uncertain; no healthy runtime, successful rollback or completed gate. A bounded partial-runtime absence repair is required before any retry. |

| Partial rollback queue absence | 28 broker cases pass, including one fresh rollback followed by observation and owned-resource cleanup; second retry, changed lineage and protected deletion refuse. Actual installed readonly profile `e942712f` at 16:40:55 UTC binds all five unchanged failed services, protected images and data/schema parity. Actual PostgreSQL pure 24-case rehearsal `d5cfa13b` and authoritative journal/outcome-trigger rehearsal `88fcc473` pass and roll back DDL/outcomes without sequence changes. | Source/native observation evidence only; recovery deployment and official Worker reconciliation/retry pending. No healthy baseline or completed rollback claim. |

| Partial absence Date representation | Roost `0968f1ae` migration checksum `83caba96` and all functions/triggers read back in `d62f9c60`. Actual Prisma readonly proof `0a564780` on four real Date rows reproduces the old refusal and passes corrected ISO comparison without writes; 143 shared/server cases pass. Roost `a81a065c`, deployment `u6crevq6iff5h66ent97pzm8`: exact health/build-info 200 at 17:07:43 UTC. Worker persisted `08d579fc` as reconciled ABSENT at 17:10:55; normal retry intent `ecdb68bc` follows. | Exact absent queue is not healthy recovery. Retry, full observation and application release proof pending; gate incomplete. |
| Sole failed rollback retry | Queue `r405c575876e1dc9c5a52dfc` failed before runtime start on missing `.env`; original candidate services/images and data remain. Actual readonly profile `42eedc55` at 17:28:54 UTC qualifies immutable candidate/absence/failed retry lineage. 200 shared/server/adapter/broker cases and 187 existing component cases pass; typecheck passes. Real PostgreSQL nineteen-case rehearsal `b3185f4c` and authoritative outcome-trigger rehearsal `d6415ae5` pass, with DDL/outcomes rolled back and sequence unchanged. Actual helper Compose 2.38.2 proof `04988f22` accepts graph-only pre-runtime validation and rejects invalid graphs and missing runtime env; renderer fixes now pass 14 root tests including actual PHP. Roost `2d1e687a` deployed via `q107kjgrohkhuq0vggxsshhv`, exact health/version and additive migration checksum read back. Worker persisted FAILED at 17:37:37 UTC. Fresh readonly profile `48c9dd58` retains 59 reads; official readonly run closed seven signed children, HMAC and OS absence verified. Normal FAILED closure `6a5bc353` read back at 17:46:40 UTC. | Failed attempt durably closed; app remains unavailable. Recovery-only grant, actual rollback and application release proof pending. No second old-grant retry or healthy recovery claim. |

| Separate recovery-only authority | Root 249 shared/server/rotated-read cases and 61 broker cases pass; typecheck and server build pass. Actual PostgreSQL manifest/scope digest rehearsal `4963d181` passes thirteen checks and rolls back DDL without release/outcome changes. Normal FAILED closure `6a5bc353` precedes the new actual audit task `b18fcf61`; ordinary release/reviewer rotations are verified with masked storage. Retained baseline app/migration image probe `57a6de37` executes the real SQLAlchemy async bridge; its isolated networkless container is removed. | Supporting source/SQL/image evidence only. New scope audit, full actual admission guards, governed rollback and complete application release remain pending. No unhealthy baseline adoption or old-grant effect replay. |

| Recovery-only prerequisites on 6 October | Roost `d794af51` auto-deployed through `j12o0qlfsevr66aqdmvei6jv`; health/build return that exact SHA. Additive migration `20261006203000_compose_recovery_only` checksum `054afe22…11af41`, functions and both guards read back. Root 386 Worker and 25 broker cases pass. Actual backup `a100f9ef` captured at 18:18:15 UTC and restored in isolation at 18:18:23 UTC; schema/data/sequences and protected images agree, owned restore database is absent. New eight-file package `2545fb2d`, manifest `bb79504d`, scope `077331c8`, passes physical readback; original eight artifacts and baseline clocks remain unchanged. Coolify preview re-queries the scoped model to retain query-derived counts; actual guarded hash-only comparison passes. | Configuration/package/backup prerequisites verified. No new effect grant, rollback, healthy application, or completed release claim. |
| Manual cleanup and image retention | Operator confirmed cleanup 395 at 18:38:55–18:40:15 UTC: three retained rollback images and four stopped services absent; protected database remains. Daily 01:00 UTC cleanup exists, volume deletion disabled. Four surviving candidate images have stopped, mountless, networkless, non-managed anchors; native proof `a33cd6fb` refuses exact image removal and verifies managed-container exclusion. Normal evidence `7461882a` readback matches. Retention count restored to two without other configuration drift. Sealed Worker opt-in binds manifest/baseline images, durable create/readback and attributed candidate images; 502 component cases pass, including 31 new retention cases. | Native bounded protection, source/test lifecycle integration. No new live lifecycle proof or automatic retirement. Candidate build-to-inspection cleanup race remains; missing original artifacts block image-only recovery. App down, no healthy replacement baseline or gate completion. Forced pruning is not covered. |
| Primary readonly audit review | Strict existing-contract primary branch binds the same full original audit packet, immutable original Ready and closed native receipts, with explicit empty diff and no synthetic coding receipts. Root 166 material tests and 24 actual owned Windows readonly fixtures pass. | Source/native fixture proof; normal live independent review remains required. New greenlet tasks are preparation only, not first-write authority or completed repair. |
| Async dependency source audit | Actual auditor `5a7a6474` completed 6 October 20:24:33 UTC through the official Worker/Hermes. Full context measured 126327/131072 after lossless relation sharing; original oversized refusal retained. Signed artifact archive, three process absences, released lease and unchanged repository were verified by separate closure reconciliation. Literal verdict is CHANGES_REQUIRED. Verifier `5dd327dc` completed at 20:54:12 UTC and independently confirmed the source-consistent CHANGES_REQUIRED disposition. Official Worker exit 0, signed pair archive, process absence and unchanged source were verified. The 135782-byte refusal is preserved; `80218a8c` restores the complete instruction from shared literal audit evidence, and actual input measures 131057/131072. JSONB fragment fix `b4c6f7c1` and 114 provider cases pass; codex:check passes. | Two real independent closed read-only executions; no coding or release acceptance is inferred. Four-file application repair, replacement Linux build and governed recovery remain pending. No application write, new release grant or healthy application claim. |
| Compatible recovery ingress and SQL rehearsal | Commits `11a03bf7` and `55082c75`: source-pinned proxy guard and activity restoration; 26 guard, 51 Python and 78 JS counterfactual checks pass. Root rolled-back PostgreSQL receipt `99ad3227` passes 14 cases including raw stored review basis hash parity. No retained DDL or release writes. `codex:check` passes. | Source/component and bounded real SQL evidence. Full positive provenance, installed migration, actual VPS guard, new Linux image/restore and application recovery remain unverified; gate incomplete. |
| Async dependency managed repair and negative SQL | Coder `eccd0cfb-94f6-4608-ab26-6105724878a8` completed 6 October 21:45:35 UTC through Worker/Hermes, producing local `d73e62346758288d400ea075a6dde4777962c871`, tree `02405ad94708d5cfa31f903f80cf1d81ddabd267`. Four scoped paths only; twelve UI sources and migration unchanged, log append-only. Fixed isolated Python 3.11.9 test receipt passes 3/3; original model log honestly retains its package-less system-Python failures. Official Stop/exit 0, signed archive verification, three OS absences, released lease and configuration restoration verified. PostgreSQL receipt `8519d589` passes 66 negative content probes in ROLLBACK with zero retained function/trigger changes. Root 347 integration JS, 153 TS, 23 migration checks, server build, Prisma validation and codex:check pass. | Local managed candidate and supporting SQL proof. Replay attempt `0fcb49a1` produced no success receipt; failure, absence and clean source reconciled before another attempt. New exact independent review, actual Linux image/restore, installed migration, governed release and application recovery remain pending. No healthy application or completed gate claim. |

| Separate canonical Python replay | Root native attempt `38d87e6a` completed 6 October 22:09:23 UTC, receipt `73fbec21…ebbab5f`: baseline TOML projection RED (2 PASS, one named declaration assertion), unchanged candidate GREEN 3/3, actual closed Windows Jobs, source unchanged and owned temporary subset removed. Normal owner evidence `189884bf` was created, verified and read back without retrying creation. Earlier failed attempts and actual absence reconciliations remain preserved. Fresh Roost backup `be0e5e04` restored with identical schema/data; the exact original backend was restarted healthy. Full `npm run validate` passes. | Real replay and owner provenance; no server OS attestation claim. Exact independent review, Linux build/restore and governed application recovery remain pending. |
| Installed compatible recovery guards | Roost `23d12063`, existing main automatic queue `tih9y2y1a002in28cfiuwws1`, finished with exact health/build-info 200 at 22:20 UTC. Read-only migration receipt `2ba8e52d` matches Git SQL checksum `16a12b89`, 21 functions and four enabled triggers. Root 293 fixed reader/broker/Worker checks and `codex:check` pass; unknown outcomes never authorize another effect or relabel observation time. | Installed source/schema and component evidence. Actual compatible grant, replacement image, governed recovery and full observation remain pending; application still down and gate incomplete. |
| Independent dependency review and held ingress | Normal review `ba3f0616-dbf1-4c14-9581-aba855d4c7ff`, actual reviewer execution `c8dc2d59-6fb0-41b1-a499-780f6d5f1fbb`, approves exact `d73e6234` / tree `02405ad9` with replay `73fbec21`. Completed 6 October 23:02 UTC; official Stop/exit zero, signed pair, OS absence, released lease and configuration restore verified. Guard operation `4916b226` applied once and read back present at 22:55 UTC. Root 174 focused Node checks, six Python candidate-ingress checks and `codex:check` pass. | Real independent source acceptance and native held-network proof. Protected-entry collection refused an administrative collation warning and records the diagnostic honestly. No Linux image/restore, image import, compatible grant or healthy deployment is inferred; gate remains incomplete. |
| Fingerprint process notification repair | Actual protected read `a50c19b4` retained refusal for 5805 stderr bytes despite exit zero. A fixed owned diagnostic identified one Bash completion notice and no PostgreSQL error. Monitor notifications are disabled only after both process groups are assigned. Root real local PostgreSQL fixture passes both tests, including historical parity, snapshot/multiplicity/sequence counterexamples, forced failure, six timeout cases, actual group absence, no new zombies/directories/sessions and unchanged postmaster. Actual VPS fixed diagnostic returns two hashes, zero stderr and closed native Job. | Native bounded fingerprint verification, no database metadata refresh or baseline change. Complete protected-entry and application recovery proofs remain required. |
| Exact Linux dependency build and isolated restore | Root native operation `5ba5793a-30ff-4af0-9e91-937dbe912828` completed 7 October 00:37:20 UTC: original receipt `c1f64d5b`, 59 ordered closed Windows Jobs, exact managed `d73e6234` / tree `02405ad9`, immutable image `4457d2e6`, three dependency tests, successful migration import and isolated encrypted-backup restore. Full schema, data and raw sequence parity pass. Owned containers, network, builder, volume and build context are absent; no provider/model call or production write. Fresh nine-job recovery `7119478c` reinspected that same local image and resource absence without rebuilding or restoring. | Real local Linux build/restore and cleanup, separate from managed source acceptance. Original receipt clocks remain unchanged. No release grant, deployment or healthy application claim. |
| Interrupted image provisioning and native guard diagnosis | Provisioning `e45e10dd` actually transferred the image; the original refusal incorrectly compared Docker Size telemetry despite matching image ID, full Config and thirteen ordered RootFS layers. A later readonly reconciliation stopped before its first Docker read resumed because its stopped-Worker predicate included its own assigned launcher. Original intent, failure and closed negative native terminal `0df4e0ae` remain preserved. Fresh five-job read `7798c891` finds local image present and remote image/anchor absent. Actual readonly probe `99576e22` passes with only the exact assigned launcher allowed by PID, creation time and executable digest; all other matching processes remain disallowed. | Diagnosed source defect and real native positive probe; successor provisioning is still pending. Absence does not identify the deleting cleanup operation. Existing pinned cleanup preserves correctly labelled retention anchors; this failed import had none. Application remains unavailable; gate incomplete. |
| Successor freshness refusal before transfer | Actual attempt `3385ef16` ended 7 October 01:38:29 UTC with `successor_absence_expired_no_transfer`: the second full protected-entry read outlasted the sixty-second image-absence observation. Four import-stage readonly Jobs and two full protected-entry reads closed successfully; no relay, anchor intent, import receipt or custody was created. Fresh five-job read `ed573c60` confirms remote image/anchor absent and retained local image present. Closure `f88116eb` physically binds the failed intent, actual source graph, two entries and 49 successful Job sources; the two embedded proxy receipts are separately reinspected by process birth identity. Protected fingerprints remain equal. | Real safe pre-effect refusal and closure, not a failed native Job or deployment. Root tool exit 1 is operational provenance, not server OS attestation. Corrected observation ordering and full signed-history consumption are still being integrated. Gate incomplete; application unavailable. |
| Reconciled retained image import | Successor `6b36d3bc` completed 7 October 02:23:26 UTC, receipt `7096f948`, reconciliation `774820a7`. Actual binary stream transferred 221819904 bytes; remote inspection matched image `4457d2e6`, exact managed `d73e6234`, full Config digest and thirteen ordered RootFS layers. Stopped mountless, network-none anchor `13bcd93d` is not Coolify-managed. Schema, data, raw sequence and held configuration remain equal. Private custody `c9ed2f41` binds 59 original Linux Jobs, nine import Jobs and 117 historical Jobs, including the earlier refusal and separate negative native closure. All recorded original instances were reinspected; no source clocks were renewed. Fixed observation ordering returned inventories aged 19926 and 19291 milliseconds, preserving sixty-second inventory and thirty-second fence limits. Root offline checks pass 31 provisioning, 53 issuer/wrapper and 30 consumer cases. | Actual image import, retention and private integrity proof; not server OS attestation, a release grant, application start or health. Original Linux build/restore receipt `c1f64d5b` remains unchanged. Application unavailable; compatible package, governed release and postrelease acceptance remain required. |
| Digest reference classification | Actual private installation `d2b8a82e` refused before its package/directory/selector writes because the common redaction policy classified eight digest references as untyped attachments. Refusal `b6dc64be` preserves the selected input and generated readonly projections. Exact three-field references now receive metadata classification while every value retains recursive secret/PII scanning. The reproduction fails before the fix and passes afterward; 16 redaction/host/UI/migration tests and full `npm run validate` pass. | Source/component evidence only. Content, extra hidden fields, getters, malformed references and encoded secrets remain blocked. No image import or application effect was repeated; a fresh private installation and governed release remain required. |
| Installed compatible package and normal owner provenance | Actual private installation `7510f117` completed with exact readback of eight files and two auxiliaries: installed record `1ac4138b`, selector `b04768c2`, manifest `242c2d4a`, scope `7877072a`. Normal application evidence `f138aeb0-d8be-4397-bdcd-9fd33b973ece` was created, owner-verified and read back; receipt `0e739253` binds the original public build/compatibility clocks and signed envelope `f3704b18`. Canonical membership GET uses the existing workspace access route; the prior invalid route produced no envelope or company write. Roost `92f9dccf` deployed through its existing automatic queue `hldy4m7gxrzstwut0y5o5iie`; health/build-info confirm the exact commit. | Native private installation, normal human evidence provenance and deployed Roost repair. No new server OS/signature attestation, release authority, application deployment or health claim. Independent compatible scope audit, current acceptance, exact grant and full application verification remain required; gate incomplete. |

| Bounded scope context and decision procedure repair | Required context guard refused historical application expansion before outputs. Bounded projection retains full selected evidence and all relation metadata, with complete task/evidence digest inventories and separate full task context; root 78 private checks pass. Normal task creation `d3ab2373` was reconciled after the response guard refused owner email; no second creation. Actual base decision publication returned SQL 409. Additive migration `20261007025000_decision_procedure_composition` changes five operation lists only; root PostgreSQL RED/GREEN rehearsal `97e6e0d2` rolls back with unchanged functions, history, source fence and events. Quiescent encrypted Roost backup `0c919646` restored in isolation with exact schema/data and healthy original backend. | Source and actual rolled-back SQL proof; no installed migration, new runtime approval or application release claim. Scope audit and release remain pending. |

| Installed decision composition and exact rejected-request recovery | Roost `b2add995800aa5a42168a9337fdd83bd2b65162b` deployed through existing automatic queue `qzjdyc2rs6y1js1jyve7esri`; exact health/build-info 200 at 03:02 UTC. Actual read verifies migration checksum `19f01da5`, five function bodies and retained decision-epoch wrapper. Authoritative request/body counts are zero before recovery; catalogue version is unchanged. Explicit recovery `9d95ec41` dispatches the original request once and reads publication `348962fa`; all prior versions, original intent and 409 remain. Ordinary installer then confirms all six publications without repeating creation or accepted publications. Root 3 PostgreSQL migration tests, 77 recovery checks, validate and codex:check pass. | Installed Roost/schema and actual normal publication recovery; no application release authority or deployment. Fresh held-state collection, managed scope audit and independent acceptance remain pending. |

| Ordered protected scope observation | Actual operation `dab1c563` qualified the same installed scope `7877072a` at 03:14:43 UTC on 7 October. Reader `4349a504` closed twenty read-only Jobs and one proxy read; schema/data/raw sequences, database fence, held services/cadences, image availability and source CAS agree. Reader8 moves second-round image/health before final fingerprints, preserving sixty-/thirty-second limits. Original `142c80a1` refusal and twenty closed `affd7c48` Jobs remain; root 75 observation and 15 native-wrapper tests pass. Normal scope and assignment for `d3ab2373` are prepared. First-page risk truncation safely refuses assessment; admission rejection is reconciled with request/scope counts zero and no current risk (`e06724b8`). | Actual protected read and prerequisite configuration, not a managed scope verdict, release grant, deployment or application health. Cursor-complete risk, managed scope execution, independent acceptance and release remain required. |

| Cursor-complete compatible-scope risk and procedure configuration | Root verified risk-history wrapper2 with 56 offline checks. Actual `73b30b12` followed both histories to terminal cursors and wrote assessment `b355a1ef`, preserving all fourteen entries. SQL predicate read `f8d742cc` proved missing application/procedure association and zero admission request/scope rows; ordinary application API linked both new active procedures (`38e4d4a9`, `38a9ce05`) with unchanged application revision. Configuration invalidated the risk basis, retained in refusal `291be926`; reassessment `af76aad0` was current at that read. Aggregate local-response storage then reached the redaction node limit; root reconciled exact request `07f721bd`, hash, actor, entries and rationale against one SQL row and normal GET (`d425631b`), without POST replay. Original intents, responses and refusal remain. | Actual risk/configuration and recognized uncertain outcome, not managed execution, independent scope acceptance, release authority or deployment. Lossless response archival and current admission remain required. |

| Lossless local normal-response archival | V1 retained full snapshot and five sidecars but refused opened-file identity before replacement (`e3d66dfe`, unchanged journal, root receipt `66ddc654`). Windows path device is zero while fd device is nonzero; exact BigInt inode, link count, size and nanosecond birth/mtime/ctime agree. V2 keeps path digest/CAS and checks those exact fields; root 27/27 checks include actual owned Windows-file replacement/readback/cleanup, with no skips. Actual archive `b2b92e7c` reduced the journal from 691290 to 148941 bytes while retaining all five complete responses, original bytes, requests and clocks; snapshot SHA `21430732…160b3`. Normal admission then succeeded. | Local recoverability and actual admission prerequisite only. No native scope execution, owner runtime acceptance, new release grant or application deployment yet. |

| Compatible audit runtime prerequisite | Normal scope `3485172f`, three actual procedure selections, complete-group risk `23f458c1`, runtime proposal `e90355bd` and current impact preview `4bec8612` exist. Impact contains only audit task `d3ab2373`. Both complete-response archival and later cumulative cycles pass. Procedure evidence stopped before POST because the private helper incorrectly expected `ready` instead of canonical `composed`; actual compositions have exact refs/sources, seals, no missing/conflicting fields, and only repository-read tools. | Configuration and pending runtime decision only. Actual composed-procedure evidence, fresh owner runtime acceptance, managed audit, independent scope acceptance and release remain required. |

| Current compatible audit procedure admission | Root 32/32 checks cover canonical composed status, full current publications and actual normal application-projection integration; original wrong-status and double-projection refusals remain, before POST. Actual ordinary evidence operations `8f024c0c`, `b88d30ae` and `494bbf73` each dispatched once and qualified their current present gate. Normal runtime barrier confirms pending decision `e90355bd`, preview `4bec8612`, and all required gates admitted for audit task `d3ab2373`. Read-only preparations qualify both expired credential slots against the closed prior release and current catalog. | Ready for fresh privileged owner authentication to rotate credentials and accept the existing runtime decision. No owner acceptance, Worker/model execution, new application release grant or deployment has occurred. Release remains incomplete. |

| Compatible scope context and stable runtime owner authority | Ordinary rotations verify reviewer `142753d2` and executor `502aea90` in masked Credential Manager; acceptance `3d62a5f7` for runtime decision `e90355bd` is read back. Fresh protected observation `f9adf12e` preserves held services/data/images. Ready `f7879212` persisted only a context rejection: missing required verification procedure `5f24ccf8`; SQL/current readiness reconcile it with no pin or active execution (`e8ae4a6e`). Required-context union adds its active eligible revision 1, preserving selected procedures, model/tools/prompt/scope/old clocks, with coherent prepared/context references and two native-frozen source references (`82df35a0`, 15 root tests). Generic preview currentness became false solely from new risk/scope IDs; accepted body, acceptance and authority are unchanged. Actual task authority is current (`4b603643`). Native wrapper3 follows the canonical managed issuer and checks exact owner/body/acceptance plus current task authority, with all other lifecycle gates unchanged; root 19 tests pass. Declined impact refresh is authoritatively absent (`a5b1f363`), never replayed. | Actual configuration/owner acceptance/context repair. Current Ready, managed scope execution, independent scope review, new application grant/Git/deployment/observation remain unproved. Release incomplete. |

| Compatible scope real audit and safe closure | Ready `38c4a4cf` queued only `fa80ff64`; actual measured input 125720/131072 bytes, official Windows Worker/Hermes run completed attempt 1 with unchanged repository and closed native job. Verdict: scope and restore CHANGES_REQUIRED, build PASS; plain-text response fails the strict JSON contract. Original protected observation and backup clocks remain. Controller exit 0; native closure preserves exact terminal and signed archived pair, semanticQualified false, original bindings restored. A private trailing-separator correction passes 24 root tests including actual Windows identity refusal/acceptance. | Real read-only execution and safe closure only. Independent rejection/correction, complete evidence context, scope acceptance, new grant, candidate Git/deployment and observation remain required. No semantic promotion or release. |

| Local Docker guard startup race | Actual stale empty socket directory isolation dispatched one hidden Desktop start. Initial probe was unproven; later actual daemon health and exact preserved directory digests reconciled that existing start, without another launch or data reset. Guard startup now accepts only actual health within the unchanged 60-second bound and retains uncertain intent on timeout; 27 tests include transient unproven probes, deadline exhaustion and real PowerShell behavior. | Verified bounded local recovery and regression fix. Windows socket faults may recur; no guarantee of permanent prevention, daemon reset or volume cleanup. |

| Primary auditor review integration repair | Real key-615 view of audit `fa80ff64` has material `445198b7`. Reviewer queue `eb961f4a` was cancelled unclaimed at attempt 0 (`00cf2f79`) after measurement refused its missing canonical `priorAudit`. The scoped DTO adds the locked workspace and an execution/material-bound UTC witness; SQL material and original receipts remain unchanged. Root 21 TypeScript and 12 Worker tests pass. Fresh Roost backup `c347e9a6` verifies encrypted capture/isolated restore. Roost `9bc96e57` deployed in queue `hnxrgikp94m46s0l0bnnwf5d`; exact build-info and health return 200. Actual key-615 DTO receipt `d6d56575` qualifies the primary packet and preserves the original result bytes/material. Successor reviewer `3c59af26` ran through Windows Worker/Hermes, measured 127480/131072 bytes, completed attempt 1, and signed-closed/restored. It recorded independent REJECT `5e71218b` against the exact original audit/material. | Real deployed integration and independent rejection. Scope/restore remain CHANGES_REQUIRED; no application release or product-readiness claim. |
| Actual manager return and bounded audit format correction | Manager action `fb37641b` was recorded using agent `1256b7da`, its credential `cb53dbee` and normal capability `65e8d4b4`. Append-only procedure versions preserve all original operations. Its exact correction requires JSON scope/build/restore entries with original fail/pass/fail findings and clocks. Root 41 tests reject changed findings, authority, identity, material, model budget and scope. New normal namespace `924d0456` preserves the rejected result and accepted runtime decision `e90355bd`; complete paginated risk proof `559b082d` retains all members. Admission scope `1a19df2e` was read back after local response-size refusal, without repeating its POST. Full normal responses are retained separately. Current immutable runtime composition is `composed`; passed procedure evidence and Ready `9606a7eb` are real. Native namespace `3b112bc2` queued execution `8feabd41` at attempt 0. Ordinary host renewal inspection `2fd6f49e` passes. | Correction queued, model not launched. Fresh owner authentication is required for the prepared HTTPS/WCM host renewal before running it. Actual format-only model output and independent acceptance are still required; improved scope evaluation remains separate work within this release gate. No Git publication/deployment of `d73e6234` or completion claim. |
| Host renewal and invalidated unclaimed queue cancellation | Actual ordinary HTTPS/WCM renewal `4aecae70` acknowledged host credential `768ee531`, epoch 7, valid until 2026-10-08T14:32:08.464Z, through owner decision `f4daf84c`. The decision invalidated Ready `9606a7eb` and queued `8feabd41` before claim: attempt 0, no host/start/lease. Cancellation returned HTTP 500; actual readback retains the queued row, so no cancellation effect or model launch is claimed. The historical context-stop trigger required a native stop even for an unclaimed queue. New additive migration admits only the immutable invalidated queued/attempt-0/null-host/start/heartbeat/thread/lease case; whole-row comparison excludes only status, cancel-request/completion/update timestamps. The original active-attempt guard is unchanged. Root actual PostgreSQL tests pass both positive paths and 32 negative probes; temporary objects are absent after rollback. Fresh Roost encrypted backup `a9d867ab` verifies isolated restore and exact `9bc96e57` backend health. | Source/real PostgreSQL/backup proof. Production migration deployment and actual API cancellation remain required, then a fresh unchanged format-only Ready/queue and independent review. No application release or gate completion. |
| Production cancellation recovery and actual corrected audit JSON | Roost `973b8c96` deployed through main auto-deployment `wvp4mzgqlpxif0foswfh0p9j`; health/build-info return 200 with the exact SHA. Readback `63bea789` verifies the applied migration checksum and exact PostgreSQL function body. After preserving the failed/no-effect cancellation receipt, normal API cancellation `cc331b93` closes `8feabd41` at attempt 0. New normal namespace `e41e6df2` retains the same prompt/scope plus the actual host-rotation decision; full risk proof `2df1f55d`, current composed procedure evidence and Ready `c869302f` are real. Windows Worker/Hermes execution `7ba67ceb` completes attempt 1 at 2026-10-07T14:59:56.797Z, measured 122680/131072 bytes. Native namespace `597e8310` signed-closes and restores original bindings. Root checks actual JSON against original fa80 sections: exactly fail/pass/fail, only permitted newline representation differs. | Real production repair and actual format correction. Original substantive gaps remain; independent format acceptance and separate improved scope evaluation are still required. No application Git/deployment or gate completion. |
| Reviewer input refusal and current role credential renewal | Reviewer namespace `9bf703a5` has actual Ready/grant/queue, but complete provider input rejects two private local reference paths in its prompt before measurement/native/model launch. Normal cancellation `5c9c33e8` closes `a9adc4b8` at attempt 0. Tested source projection retains full private strong references and exposes only pathless identities to the model; the public privacy guard remains active. Ordinary role rotations verify reviewer credential `7884fc43` and executor credential `e903f271` with unchanged scopes/roles/WCM targets, valid until 2026-10-07T21:28:21.219Z and 21:28:23.312Z. Root 33 renewal tests pass; no release authority is granted by renewal. | Safe pre-model refusal, cancellation and actual credential renewal. New reviewer preparation/Ready/grant/queue, full input measurement and actual independent decision remain required. |
| Independent format-only acceptance | Successor `1830296d` measured 132380/131072 bytes and refused before native/model launch; execution `462b46bd` was cancelled unclaimed. Namespace `a1770fca` retains all private source seals while its model packet uses pathless identities and a compact nonduplicated source digest. Its real independent Windows Worker/Hermes execution `142d9a88` completed attempt 1 at 2026-10-07T15:54:24.826Z and recorded APPROVE `cd64d3d9` for corrected audit `7ba67ceb`, material `ab6c3735`, exact `d73e6234`/tree `02405ad9`. Actual signed native closure, controller exit 0 and binding restoration passed. | Mechanical JSON correction accepted only. Original scope/restore failures remain; no compatible-plan acceptance, release authority, application publication or deployment. |
| Separate improved compatible-scope preparation | New task `647d1f35` and namespace `bdbdde95` bind the actual accepted format proof, unchanged 315-source snapshot and supplied B29 evidence/document `25aa3fea`. Existing immutable procedure publications are reused through qualified adoption `78ce3fb6`; no new procedure/version or old task runtime approval is substituted. Complete 15-member risk assessment `5976ff3a`, current admission and three applicable procedure gates were recorded. Its own exact readonly runtime proposal `b227b118` has an actual impact preview and qualified owner barrier; root improved preparation/adoption/reviewer source tests pass 14/12/10 cases. | Prepared separate audit, not an executed or accepted audit. Fresh owner authentication and normal runtime acceptance, current Ready, actual Worker/Hermes result and independent assessment remain required. No application effects or gate completion. |
| Actual compatible audit, independent receipt and identity ambiguity | Owner runtime `b227b118` was accepted normally; the actual complete effective decision union was bound. The private contract serializer and single-problem wording were corrected before execution, preserving original refusals and clocks. Risk scope response was recognized by exact API readback after local journal-size refusal, without another POST; six complete historical responses were archived with byte/source references. Full 15-member risk, exact existing admission and current procedure gates passed. Actual audit `f01e0ae6` completed at 2026-10-07T16:49:36.996Z, measured 126807/131072 bytes, signed-closed/restored: scope FAIL, build/restore PASS. Independent `3019afb8` measured 129261/131072 bytes, completed at 17:07:44.025Z and recorded APPROVE `f2421567` for that exact report/material `4899f4c7`; it signed-closed/restored. | Report accepted, scope still FAIL and release blocked. Auditor equated the native footprint SHA256 with Git's tree OID. Original findings and approval remain unchanged; no candidate publication/deployment or gate completion. |
| Explicit repository identity domains | Additive Windows model DTO exposes the original native snapshot SHA256 separately from an actual paired bounded Git tree read. The raw native receipt/digest and security guards remain unchanged; a serialized old receipt cannot gain an unobserved Git OID. Root integrated source checks pass 90/90 across provider, readonly, prior-audit and six new identity-domain cases, including actual owned Git and existing Windows Job coverage. | Source/component proof of clearer context only. A fresh measured native audit and independent scope decision remain required; no new PASS, server attestation or release authority is manufactured. |
| Measured-input renewal and explicit rolled-back context reads | New same-task namespace `936da740` preserves the accepted runtime and negative report history, with empty operation state and no inherited Ready/queue/grant. Queue `901d29f3` remained unclaimed after its five-minute measurement window expired. Recovery `c694dfde`, then `1bf9232f`, verifies attempt 0, no controller/lease and exact before/after private configuration hashes, restores original bindings and adopts that same real queue into a new namespace without another POST. The root native adapter orders Ready/context reads to avoid its own competing fence writes. The active context GET source now uses the existing three-read explicit-abort wrapper; 7/7 retry tests, full validate and codex:check pass. | Actual prelaunch recovery and source fix. API deployment remains pending. The new actual audit completed with three PASS findings, but cross-episode receipt qualification and independent acceptance remain pending; no release or gate completion. |
| Closed scope audit and bounded release catalogue | Actual audit `901d29f3` completed with three PASS findings. Native namespace `b23e9a46` signed-closed and restored original bindings; receipt `64a998b8` qualifies stable tracked source separately from ambient cross-episode footprints. Independent review is pending. The prior backup's original restore clock expired; its proof remains historical. Fresh backup preparation stopped before capture when the full release catalogue returned content-blocked. An explicit summary projection retains actual statuses and outcome counts, rejects truncated catalogues, and preserves read authority; root focused checks pass 28 cases. | Real audit/closure plus source catalogue fix only. New verified backup, new exact scope, independent acceptance, release credential/grant, application publication/deployment and observation remain required. |
| Deployed state summary and fresh-backup transport refusal | Roost `d85826f9` deployed as `wbva39qo4z05727nt3m9lo33`; exact health/build-info return 200. Normal summary `a3bb4ac5` proves eight closed failures and no active executions or unknown outcomes. Local Docker recovery `69cc7bac` preserves both quarantined socket parents; image read `95b741d1` verifies unchanged local/remote image and anchor through three closed Jobs. Backup preparation `0e14374b` passes held-state and actual capacity checks. Execution stops after the successful public-owner-class read; normal gateway inspection has no unresolved attempt. Source reproduction proves the fingerprint argument exceeds the unchanged 8192-character native limit. | Actual infrastructure reconciliation and transport refusal. No completed fresh backup, new release or gate completion. A changed transport must keep binary dump/restore data out of normal Job stdout/input and preserve complete native descendant closure. |
| Fresh actual backup and recovered final qualification | Cold gated Node preflight `71b69546` passed without invoking the gateway. One inherited Windows Job performed the public encrypted backup/isolated restore; dump and restore bytes stayed in child RAM. Backup `cd5691cb` verified at 2026-10-07T21:22:13.745Z, archive `632735c4` / 595619 B, encrypted `11daa978` / 596197 B; schema `5082e5e1` and data `1ca5b07c` remain equal. Gateway inspection proves no unresolved restore. Original final metadata refused inventory age 67.844 s; original clocks and uncertainty remain. Read-only recovery `2c2f705e` produced receipt `bdbdb64e` without another backup/restore. Root separately applies the original strict after-entry validator at finalization: entry age 6.696 s, inventory age 28.838 s, raw production sequences unchanged. Ordinary reviewer and executor rotations verify `6e68415d` and `151f2acf` through catalog/WCM/HTTPS, preserving five and six scopes respectively. | Actual backup/restore, preserved data, native closure and strict final-time qualification. New manifest/scope, independent acceptance, grant, application publication/deployment and observation remain required; the release gate is incomplete. |
| Renewed package and corrected scope audit | Actual package `f768c42b` binds manifest `63ff46ef`, scope `ef755731` and fresh backup `71b69546`; signed public proof and owner evidence `c85edf7f` are read back. Audit `4b6f8027` reported UNKNOWN/PASS/UNKNOWN because its acceptance list retained old references; original result remains, genuine signed closure `9aff7f32` and binding restoration passed. Corrected audit `09907b49` completed at 2026-10-07T23:48:32.294Z with three PASS findings for scope `ef755731`, build `45a6f01c` and restore `53c307c8`; signed native closure `42db2db4` and original bindings are verified. Source review `ae847caa` recorded APPROVE `fb96dcef` for then-current material `284093b3`. Separate scope reviewer task `e0b048fe` is configured with all sixteen risk rows, exact admission and current procedures; runtime decision `a93fb4aa` has a complete qualified impact barrier. | Native audit evidence and normal prerequisite configuration; independent current source/scope acceptance and release remain required. Activity policy expired; original Linux proof cutoff is 2026-10-08T00:29:28.368Z, with no clock restamping. No `d73e6234` push/deployment or gate completion. |
| Current source acceptance after separate reviewer admission | Actual source review `03190381-c047-4639-9f69-244ea2f88e8f` completed its first attempt at 2026-10-08T00:19:53.279Z, using `gpt-5.6-sol` medium and measured 114277/131072 bytes. Decision `8eb61096-050f-4437-b7aa-4ab6c2ca2d7e` approves exact `d73e6234`/tree `02405ad9`, current material `2df5b302`; acceptance receipt `3ae2aa58` preserves the independent native replay. Normal stop, official controller exit 0, signed archive verification, OS process absence and original profile restoration pass. Root tests pass 23 fresh-backup Linux successor cases and four clock-mapping cases. New build input `b99f2a19` is prepared from that actual accepted source and existing verified backup; no new build is claimed. | Current managed code review only. Dedicated scope runtime `a93fb4aa` still needs fresh owner authentication, followed by actual independent scope acceptance; proof renewal, final grant, Git/deployment, observation and postrelease acceptance remain required. No later gate or application source changes by root. |
| Actual fresh Linux build and clock-blocked pre-import | Operation `b99f2a19` completed 59 genuine Windows Jobs; raw proof `0d24ae5f` binds exact `d73e6234`/tree `02405ad9` and local image `c78ed34b`. Three dependency tests, async bridge, migration import, isolated restore, schema/data/raw-sequence parity and named context/builder/network/container cleanup pass; zero production writes or provider calls. Combined `f45f8a53` exited 1 before an import intent. Its twenty readonly entry Jobs closed successfully; separate actual diagnostic `98d8bdf3` reports `proxy_fence_native_observation_stale`. Bounded time read measured VPS 1185 ms ahead of local completion (585 ms round trip); VPS NTP synchronized, Windows Local CMOS Clock unsynchronized. Windows resync was denied with `0x80070005`. | Real local build/restore/cleanup only. No image import, new public custody/signature, application publication/deployment or gate completion. Privileged owner clock synchronization and fresh Roost authentication are required; TTLs and original receipt clocks remain unchanged. Existing image/anchor protection is retained and actual remote state must be read before a separately qualified import successor. |
| Pre-dispatch actual remote reconciliation | Readback `db8f6835` completed three genuine readonly Windows Jobs; receipt `d8bcb9ef` verifies the new candidate tag is absent and original image `4457d2e6` plus stopped, mountless/network-none anchor `13bcd93d` match their protected content. No import intent is fabricated and no application, configuration or data operation occurs. Root eight scoped refusal/source tests pass. | Actual remote observation only; no import completion, restored live build capability or retry authority. Owner clock synchronization and new normally qualified import remain required. |
| Prepared actual completed-build recovery | Root sixteen source/refusal tests pass for a successor that verifies the unchanged `0d24ae5f`/59-job archive, current exact source and nine new readonly native observations before returning a new read qualification. A separate immutable import selection is prepared; no native requalification or import has run. Eight pre-dispatch tests and the actual three-job reconciliation remain separate. | Source-only recovery preparation, with original build clocks and failed `f45f8a53` retained. Owner clock repair is required before real proxy admission; no serialized build capability is revived and no second build, restore or deployment is authorized by this preparation. |
| Clock-service repair and real proxy qualification | Owner helper first recorded `0x80070426`: the Windows time service was stopped, so resync never ran. The repaired helper starts W32Time, sets automatic startup, preserves the configured NTP provider and records per-attempt status. Actual elevated operation `0b30b939` completed 8 October 10:18:28 UTC with exit 0 on its first attempt; service readback is Running/Automatic, Leap Indicator 0 and a real successful sync. The unchanged native proxy reader then qualified the existing rule at 10:19:36 UTC. | Actual local service repair and native readonly proxy proof, without TTL changes, receipt restamping or application effects. Owner API still returns 401; normal owner login is required before further task/configuration/release admission. Gate incomplete; original build/image and prepared recovery remain retained. |
| Normal runtime acceptance and renewed role credentials after clock repair | Exact dedicated scope-review runtime `a93fb4aa` was accepted through the ordinary owner API; readback `e7e675ca` confirms accepted state. Ordinary rotations replace expired reviewer `6e68415d` with `3424c7b5` and executor `151f2acf` with `c162350e`, each version 1 and expiring 8 October about 16:23 UTC. Full catalog, protected Credential Manager storage and HTTPS principal readback pass; reviewer retains five task scopes, executor retains six existing scopes including release. No secret is persisted in execution records. Current-read requalification/import successor `46a2f36c` was started with unchanged original build clocks. | Actual normal authority and credential maintenance. New import, signed custody, current compatible package/scope acceptance, application Git/deployment and production observation remain required. No gate completion or inherited review/grant promotion. |
| Cross-daemon image-content reconciliation | Actual successor `46a2f36c` transferred the image and closed ten Jobs, then refused content identity because it included store size. Direct diagnosis found identical image `c78ed34b`, full Config digest `5ab4bad6`, RootFS digest `3ae045d0` and ordered layers, but local size 221921501 B versus remote 892317917 B. Root 23 comparison tests preserve content/platform/label/env/volume checks while separating capacity measurements. First readonly successor rejected its unsupported evidence filename; original four closed Jobs remain unqualified. New writer keeps the existing strict native namespace/parser; root twelve parser cases pass. Actual readonly `cc7c52d6` completes four genuine Jobs and qualifies image content plus protected `4457`/`13bc` and their original tag. | Transfer is recognized, required retention anchor is not qualified. Original `46` remains uncertain; no load/tag/build/restore is repeated and no old live capability is restored. Separately reviewed anchor-only continuation and new native custody/signature/package/scope/release proof remain required. |
| Actual bounded anchor recovery without replay | Attempt `32ac2682` refused before an anchor intent: its complete immediate entry aged 71500 ms beyond the unchanged 60000 ms limit while five serial readonly checks ran. Current readback `5147e11c` verified the image and missing anchor. Source v3 combines all five values into one fixed 4652-byte readonly Job; root and independent reviewer pass 50 cases, retaining 300/60-second checks at actual resume. Actual `fd9cefd7` completed at 8 October 11:45:17 UTC, receipt `b20a19b5`: qualification age 172773 ms and entry age 19159 ms. Five genuine closed Jobs create and qualify only stopped, mountless/network-none anchor `f2b29030`; all three held entry/native groups, database/schema/data/raw sequences, old `4457`/`13bc` and tags agree. | Actual partial import recovery and retained candidate artifact. Original `46` remains uncertain history; no stream/tag/build/restore is repeated, no application is started and no deployment/health/release authority is claimed. New actual controller tuple, signed public custody, compatible scope/reviews and full governed release remain required. |
| Actual signed candidate custody and normal evidence publication | Readonly controller capture `dfe74fe6` recomputes candidate configuration `e28bf848` and artifact set `b562d522`, preserving original clocks. V4 source review and 138 tests cover complete historical/current capture CAS. Actual native custody `67479e4a` and owner envelope `dabb7337` authenticate the exact new image and all original/partial recovery receipts without reviving old capabilities. Normal evidence `17f72f79` is verified by the primary owner; independent API readback matches metadata `a73c35db`. Published projection `42c6aacb` retains distinct owner/custody digests. Procedure evidence was refreshed; ordinary HTTPS/Credential Manager rotation acknowledges claim-only host epoch 8, valid until 9 October 12:34 UTC. | Actual native and normal owner evidence only. Application remains unavailable with writes/cadences held. New compatible package, current scope/source reviews, exact grant, managed Git/deployment, observation and postrelease acceptance remain pending. Original uncertain import and all failure history remain unchanged; no later gate begins. |
| Readonly freshness refusal and late-measurement successor | Actual capture `59c73f7f` exited 1 before its application intent: all twenty Jobs in `130c73de` closed with exit 0, but the second controller inspection delayed final database samples by over 72 seconds. Its final runtime and data clocks cannot jointly satisfy the unchanged 60-second limits. Diagnostic SSH commands returned successfully in about 11–15 seconds; no key configuration changed. Reader9 source `85702f9c` preserves those twenty reads and adds an exact compiled runtime replay plus a strictly framed database triple. Root passes 25 focused cases and independent source review finds no blocker. Constructor `77fa5804` passes five owner-publication cases, uses the existing strong-reference metadata codec and preflights eight files plus two auxiliary files before writing. Scope consumer V2 passes twenty cases. | Original failure and clocks remain recorded. New reader/constructor integration is source verified only; actual capture, local installation, current model audits, exact grant and full release remain pending. No application Git, configuration, data or deployment effects were performed by the refused capture. |
| Actual C78 capture and private installation | Reader9 preserves the earlier refusal and twenty Jobs, adds two real late observations and keeps 60/60/30-second limits. Actual construction `85195c60` installed at 2026-10-08T14:10:57.829Z; exact eight-file/two-auxiliary readback is `93f0771c5fcf90843a932ffaf1d9ff84a1e1ff442a58d86fb198192f63e22c3d`, manifest `e068b6c5`, effect scope `b448191c`, candidate image `c78ed34b`. Constructor guards actual published owner evidence and fresh unchanged controller tuple; Buffers stay in memory while the existing typed codec stores strong readback references. Activity policy retains expiry 2026-10-08T16:10:55.447Z. | Real readonly capture/private byte installation; no application Git publication, configuration change, deployment, healthy runtime or release grant. Original backup/build clocks and histories remain; current source/scope authority must be requalified before effects. |
| Current C78 scope audit and refused first review | Normal audit `7a8ea0ea-132f-418c-bb4f-d9696a360984` in native namespace `9f029913` completed at 2026-10-08T14:26:30.961Z with three PASS findings: scope `b448191c`, build `de3949b2`, restore `51bc5995`. Signed closure `f34aa842` verifies pair/process absence/lease release; original bindings restored at 14:28:13.568Z (`61566f2e`). Dedicated review `530972ca` then failed before model launch with `readonly_boundary_unproven/process_changed`; original `902b9c74`, normal reconciliation `200f4a75`, Writer/application reclamation `6409ea67` and restored configuration `55a154c3` remain. | Audit findings concern prospective pre-release eligibility only. Failed review supplies no model decision or signed review closure; original failure is not rewritten. No source edit, app write, Git/deployment or grant from these runs. |
| Independent C78 scope acceptance; code basis still pending | Separate task `e0b048fe`, execution `a6782e51-310c-4568-8ff8-887d705ea3ef` in run `e3e6bd5a` completed at 2026-10-08T15:15:07.581Z and recorded APPROVE `b8765247-47fe-4466-b007-39a09c2e2528` for audit `7a8ea0ea`/material `f339d9ca`. Acceptance SHA `b4c362427739b095260e7b0abc93a4010d08237a2a9a4ddc1a1b44baf513c870`, signed closed pair `0f6764c5` and restored bindings are read back. Later shared-risk revision `8341dfbc` leaves scope review reason `approved` but `basisCurrent=false`; this approval remains historical. Original source `eccd0cfb` now has material `92363e72` through normal append-only revalidation `dab307b1`. Source review `ec290b55-ba92-41c0-8b07-ad65d8c2f491` in `a68f5cb8` measured 114279/131072 bytes, then failed at 2026-10-08T15:45:48.683Z before model with `code_reviewer_unproven/api_transport_unproven`. Normal stop, readonly terminal reconciliation, Writer reclamation `e3e670f2` and owned configuration restore `198710b6` pass; no signed pair or model decision exists. A subsequent isolated reviewer-API GET passed in 3.254 seconds, but the original transport cause is unknown. New review remains pending. | Actual independent planning-scope acceptance at its 15:15 recorded basis; now stale for release after shared-risk change. Fresh scope basis/review and source acceptance remain required; no approval is promoted into release, image/migration health or gate completion. Application remains down with writes/cadences held; exact grant, Git/publication/deployment, full observation/cleanup and independent postrelease acceptance remain required. |
| Current source acceptance and normal credential renewal | New namespace `4d427c93` preserves the exact registered review contract/prompt and current risk `8341dfbc`; it does not replay failed `ec290b55` or create another risk scope. Execution `052c79ab-f0d9-4c50-990c-5c67ffd60c1a` completed at 2026-10-08T16:02:54.128Z, first attempt, input 114279/131072 bytes. Independent APPROVE `0bd92c96-cee9-4d2f-92e3-8b44af2acb5b` accepts `d73e6234`/tree `02405ad9`/current material `92363e72`; acceptance SHA `dcf27c8aca60e07498cad0cdda69b4b3d2a3ae870daf88377fe6c8349f8e47f1`, signed closure `e251676f`, official exit 0 and restoration `ae367f8c` pass. Fresh owner authentication allowed ordinary reviewer generation `1d9e4a07` and executor generation `9bef44cd`, expiry 8 October 22:05/22:06 UTC, unchanged scopes and verified credential-store/API readback; journals `b876cc63`/`70466042` contain no secrets. Existing audit procedure/Ready was refreshed and basis `67c0ed01` maps `7a8ea0ea` to current `e9e186cf`; source approval remains current. | Actual code acceptance and ordinary renewal only. Audit scope still requires its new independent review. Activity renewal `98ef85a8` completed a genuine 22-Job scope observation `e3e3105a` but failed before its additional request or policy write; cause is not established from its generic diagnostic. Original policy/clocks and failure history remain. No new release grant, application Git publication/deployment, healthy runtime or completed gate. |
| Current scope acceptance and operational-window refusal | Independent execution `4f38bcb4-af68-4705-ab06-a79e87bc2fe2` completed at 2026-10-08T16:47:03.121Z, first attempt, input 128943/131072 bytes. APPROVE `4bda22de-e2c8-492c-a50c-653caed5440a` accepts audit `7a8ea0ea` on current basis `e9e186cf`; acceptance SHA `6261f6df7ec8601fce4dfb46fed8df41afae6a1f34f40b9935a2217d7f896cd4`, signed closure `0e40ffe7`, official exit 0 and restoration `1a773dee` pass. Source `92363e72` remains accepted. Renewal `a0d1f414` identifies required-redaction refusal before the additional query; fixed SQL preserves the synthetic namespace through `IN (concat(...))`, without plaintext address, encoding or a guard exception. New `e6d72c37` completes 22 scope Jobs and the additional readonly namespace Job: zero fixture users/sessions/memories, exit 0, cleanup/job closed/zero active processes, actual seed readback without secret persistence. Final 30-second proxy freshness then refuses at 16:53:19 UTC (`4194682d`); no new policy is written. | Actual independent scope acceptance; operational renewal remains unqualified. Do not reuse serialized live capabilities or refresh historical clocks. Source ordering must be repaired and proven before exact grant, managed Git/deployment, full observation, cleanup/data parity and independent postrelease acceptance. Application remains unavailable; no later gate begins. |
| Current evidence-format correction and pre-grant refusal | Renewal `49488dcd` qualifies the unchanged activity namespace until 2026-10-08T19:16:02.597Z; bundle SHA `a4f8c8a`, actual capture `97c5107c`. Atomic preparation `ed607903` obtained real fresh owner authentication but refused before grant intent/POST because its private Ready predicate compared original coding admission c643 with result d73. Source-tested assembly v8 preserves that original basis; DTO v2 preserves actual completedAt. Full historical predicate replay then identifies the genuine scope review `4bda22de` build entry as kind test where artifact is required; that receipt is not rewritten. Corrected prompt changes only its evidence instruction. Normal complete 16-member risk `56880aad` binds it; actual append-only revalidation maps source to `a021bd29` and scope to `1f045a90`. New source review `cce14a2f` is queued with 114279/131072-byte measured input. | Preparation, honest refusal and current basis only. Prior approvals remain historical after risk change; new independent source and corrected scope results are required. No new grant, d73 Git publication, application deployment or health proof; gate incomplete. |
| Current source acceptance after evidence-format risk refresh | Execution `cce14a2f-3afe-46da-874b-3d1bb95ca3da` completed its first attempt at 2026-10-08T18:31:59.905Z. Independent APPROVE `b4844ca8-3759-44da-953b-3414b378dd79` accepts unchanged d73/tree024/current material `a021bd29`; acceptance SHA `08c21dafe397143a74ea34e925ec1859535707305ccaf1a5785974ce2f9dc930`. Official controller exit 0, signed closure `ec5824ff14a627abd59ebfded8a361834d67d1bf73568e6576ee8c443fe0ae21`, OS process absence and owned binding restoration `7ebd105f260cc5ccee926d42e1cd0f9ea2a47b37a8c854ac12e7d49d7052b65a` pass. | Actual current code review only. Corrected independent scope review is being admitted normally; no image health, application publication/deployment, release grant or gate completion is inferred. |
| Corrected scope acceptance and final-verifier dependency | Execution `e266ac67-b2f4-4438-8d99-292d53b53182` completed first attempt at 2026-10-08T18:39:42.336Z, input 129823/131072 bytes. APPROVE `5c886653-3402-4e72-a293-e67a45be9e40` accepts `1f045a90` with three canonical artifact PASS refs and a separate real test PASS. Acceptance SHA `e6caa53786cab99f0f8ffa714d858fe38e355c9855dc0499c547e45d5ea39444`, official exit 0, signed closed pair, OS process absence and restoration pass. A serializable-context read conflict before launch was read back as unclaimed/attempt0/no launch intent; only read qualification was repeated. Actual final-task readback proves its registered verifier still addresses historical build execution `41a15e29`, not completed release. | Current source/scope acceptance only. Register a static final scope and support a Worker-verified release evidence channel before the final shared-risk revalidation and grant, avoiding postrelease scope churn. Original construction sources are preserved while channel implementation is isolated. No d73 publication/deployment or gate completion. |
| Final release-inspection channel and compatible recovery binding | Static readonly declaration binds exact commit/tree/manifest/scope/image and observation minima; future metadata contains only release and custody UUID selectors. Live lease/host/workspace/claim authority gates the evidence endpoint, with a second cancellation/credential check. Worker independently validates stored compatible proof, all eleven canonical outcomes, complete fixture/data/raw-sequence parity, restored cadence settings, immutable custody refs, closed Writer HMAC and current OS absence including the official controller, and Root monitoring with maximum 30-second gaps. Only a private live handle can enter sealed provider input; serialized JSON cannot restore it. Recovery now retains qualified compatible server provenance in the grant digest. Source audit findings were fixed: distinct outcome request IDs bind by release/operation IDs, whole run/archive refs and actual controller absence, exact 30-second supervision. | Source/component checks and native recovery only: validate passes; 58 provider/channel/contract tests, 64 channel/compatible-broker tests, three access tests and all seven Windows recovery cases pass. Native launcher LF bytes retain source SHA `921e0e32`; Git conversion is pinned. These test sets overlap and are not a delivery count. No deployed channel, new final scope/runtime, grant, d73 publication/deployment, observation or final runtime acceptance is yet claimed. Original construction checkout remains preserved. |

| Current static final scope and fresh independent acceptances | Roost a22ce518, deployment dcux7g1atvfnh6kdk4dub5nb: exact build/health200; additive migration tested in isolated PostgreSQL, six parity cases pass. Final ee0ebab6 static readonly contract/Ready77dad092 reuses runtime51f283eb with fresh eligibility checked. Risk5f9a59e9 and append-only source/scope revalidations bind d03922b3/ee54a2bd. Independent ef9d21b6 APPROVE63977ac1 (acceptance8f989c39) and875907a6 APPROVE44a1d5e8 (4cdec2d3) closed/restored, signed/process absence verified. | Actual source/scope review and deployed Roost mechanisms; final postrelease runtime has not run. No application release proof. |
| Actual activity deadline and bounded owner collection | Native284dd3a0 failed policy_stage before policy/bundle writes (d49e6018): proposed two-hour policy exceeded backup71 deadline. New21b09d91 native capture fd4c7b10, bundle7a9b0186, policy968d5074 preserve effects, original eight bytes and real backup expiry2026-10-08T21:21:39.418Z. New local Owner14 bounds grant to that deadline; local minimum35 minutes retains full1200+300 seconds and600-second operational margin; canonical maximum/hour and all credential/freshness guards remain. Atomicfc61181d collection is pending. | Original refused receipts preserved; no manufactured clock, grant, publication, deployment or completion. |

| Exact unused grant and honest revocation | Atomicfc61181d gathered current actual native scope and real fresh owner authentication; grantf3069781 receiptb6fa09cd binds d73/024/e068/b448, expiry21:21:39.418Z. Worker8613a925 and4e13c891 refused before configuration metadata/swap or launch: repository directory is relative and must resolve against configured workspaceRoot. New Root7 preserves exact canonical path; three actual-source offline path acceptance/refusals pass. Normal owner revoke1208dca4, receipta2f31fb9, read back REVOKED with zero journal operations; configuration unchanged. | No application effects/Git/deployment. Both refused histories preserved. New backup and real C78 compatibility/manifest qualification remain required; no observation shortened and gate incomplete. |

| Revoked unstarted admission and actual Roost deployment | Commitc0b043f8 permits replacement only when a compatible recovery grant is revoked and has zero operations; every intent still consumes the prior closure. Existing current basis/owner/approval/credential guards and application transaction lock remain. Additive migration replaces only its insert guard, preserves all rows/history. Independent source review found no blocker; actual isolated PostgreSQL trigger cases pass2/2, related readiness/recovery/freshness258/258, validate and codex:check pass. Roost backupac0d501f restored in isolation; original server restarted healthy. Normal mainpush triggered single queueechglb7m6qpd2prlruumlh0d: finished, health/build-info200 exactc0b. Readback48ffd6cf confirms migration applied and preserved basis/any-intent guard. | Actual deployed Roost mechanism; no new application release or final acceptance. The narrow SQL fixture stubs the unchanged full basis validator and is not whole production release proof. |
| Fresh backup and recovered metadata | Gateway `6e60bb2c` completed backup `60ce77d9`, captured 2026-10-08T20:58:15.943Z; isolated restore passed at 20:58:50.349Z and its database was removed. Original final metadata refused inventory ages 69,928/70,353 ms. Read-only recovery `30f6d6cb` produced receipt `514b54ae` and qualification `ff8c079f`, preserving capture clocks, cipher and uncertain history. | Actual backup, restore and metadata recovery. No repeated dump/restore or fabricated freshness. |
| C78 compatibility, signed evidence and new private package | Native `7dc715c3` completed 49 Jobs: bridge/dependency tests, new-backup restore, C78 migration, schema/data/raw-sequence parity and resource cleanup. Original build `b99f2a19` and its clock remain unchanged. Separate eight-read witness `5dba011f` qualified HMAC signing; signed result `b15564bc` and normal owner publication `ce7d4451` are verified. Actual preview `d00fb8ac` preserves its collection clock. Package `e277a44b` passed readback after separate fresh witness `65c14232`; package compiler refusal tests pass 64/64. | Actual native and owner-verified evidence, locally installed package. Historical remote scope is explicitly not current admission; grant/effects still require fresh reinspection. New scope audit/review, application Git/deployment and final acceptance remain pending. |
| Current native reviews and changed-image build | Audit `3e3d094b` completed with three PASS artifacts, 128156-byte input and signed closure `0d51b24d`; configuration restored. Review queue `b268b3d0` was cancelled at attempt 0 after actual 132804 > 131072 bytes, without model launch. Lossless replacement measured 130484 bytes; native review `73c351ba` approved (`62df927c`), signed closure and restore passed. Source review `1fafca80` measured 114279 bytes and approved exact `d73e6234`/tree `02405ad9` at material `48293393` (`ad1fd20c`); signature, process absence and restore passed. Actual build `aa15e52e` completed 25 Job/CORE pairs, 2026-10-09T00:19:13.415Z, proof `a05ed651`; image `36d1746f` has the same configuration and different RootFS. Builder, containers, networks, volumes, source context and archive were removed; its exact temporary tag remains pending retention/cleanup. | Actual native build and independent reviews; C78 compatibility cannot certify the changed image. Original clocks remain immutable. New-image compatibility, retention, publication, scope review and actual governed release remain pending. No application Git/deployment or gate completion. |
| Changed-image compatibility and interrupted-probe recovery | Probe `57e803fb` stopped after 29 canonical Jobs and six archive chunks on readonly API `ECONNRESET`; no restore had started. Recovery preflight refused a historical backup-only helper before effects. New exact-backup adapter and continuation pass 99/99 component cases. Keeper `4f8086d7` performed nine genuine build reinspection Jobs, separately verified the original owned database/network and appended only chunk seven. Completed proof `0623b5dd` at 2026-10-09T01:19:52.189Z contains 49 Job/CORE pairs, successful restore/migration, identical schema/data/raw-sequence fingerprints and owned resource cleanup. Original 29 clocks and failed intents remain preserved; no build or restore replay, old capability revival or unrelated cleanup. | Actual native changed-image compatibility and recovery. New same-process probe capability is retained for explicit signing; retention, signed owner publication, scope acceptance and full governed application release remain required. No application Git/deployment or gate completion. |
| Actual proxy restart and guarded fence replacement | Preview `9d264c16` refused before PHP/configuration effects: the same proxy restarted at 2026-10-09T00:46:39.614Z, losing its namespace rule and changing its project address. Guarded prepare `3c6c5d04` refused changed addresses with zero effects. New fixed-target helper passes 26 cases; actual operation `8e7d417b` prepared, inserted one scoped rule and read it back present, closed native Job `3306efdc`. Database/network/proxy identities, project exclusivity and absent published ports pass. Fresh-scope component passes 24 cases; actual readonly `f8f46b76` at 01:35:05.857Z preserves all non-ingress invariants and derives scope `b0151754`, observation `dc594bc6`. Old policies, receipts and scope `7877072a` remain historical. | Actual native safety repair and full readonly requalification, not application release. No rule replay, database/configuration write or inherited scope acceptance. Preview/compiler/constructor successors, signed publication, new independent acceptance and governed release remain required. |
