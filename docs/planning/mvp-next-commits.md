# Next development work

RF-RUNTIME-005B28 wdraża zatwierdzony [kontrakt własności przed resume](../architecture/fixture-ownership-before-resume.md): pierwotny trwały zapis, pełne powiązanie
Ready/runtime/rzeczywistego zawieszonego Job i potwierdzenie przed ResumeThread.
Zwykła rekoncyliacja odzyskuje tylko cleanup. Zakres: kod i testy syntetyczne;
bez providera i zmiany sześciu flag. [Tabela gotowości](../architecture/agent-delivery-readiness.md)
wskazuje jeden kolejny dowód: syntetyczne zadanie Roost → Worker → wynik/review.
Diagnoza B27 oraz dalsze propozycje B21–B26 opisują stan historyczny.

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
