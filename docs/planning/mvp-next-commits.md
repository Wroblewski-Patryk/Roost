# Next development work

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
[RF-RUNTIME-005B15 — installation provenance](../architecture/hermes-installation-reconciliation-v1.md)
is **VERIFIED_RECONCILABLE through recommendation B**, a controlled clean rebuild.
All original immutable hashes match; one original .pyc changed. The added AWS
packages have coherent RECORDs but two transitive versions are off-lock. Source
shows a reachable startup lazy-install path, which must be disabled through the
official policy gates before another admitted run. Current installation remains
BLOCKED. B15 did not mutate installation/profile/auth/cache/manifest or execute
Hermes/Python/package managers. B13 and B14 spent records remain preserved.
Exactly one proposed next atom: **RF-RUNTIME-005B16 — owner-approved frozen
rebuild, lazy-install denial and split installation attestation**. Explicit owner
approval is required for managed installation and private binding changes before
that work begins. No model/login/new activation follows. ADR-004 v9 and six false
public flags remain unchanged; no cleanup action is pending.

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent direction remains native Hermes behind Windows Worker under
[ADR-004 version 9](../decisions/ADR-004-native-hermes-codex-pilot.md).
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
