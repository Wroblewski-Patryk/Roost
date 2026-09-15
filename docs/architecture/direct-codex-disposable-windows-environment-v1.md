# Disposable Windows qualification environment contract v1

Current route status: **DEFERRED** by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md). Windows Sandbox,
Hyper-V and disposable VM are rejected as pilot/ordinary-task prerequisites due
to disproportionate complexity. The dated contract and negative evidence below
are preserved; their next-task recommendation is not current activation ordering.

RF-CODEX-022, 2026-09-15. Contract version **1**.
Owner decision: **ACCEPTED** in the governing RF-CODEX-022 handoff.
Environment admission: **DISPOSABLE-WINDOWS-ENVIRONMENT-BLOCKED**.

[ADR-003 version 2](../decisions/ADR-003-native-windows-codex-pilot.md) permits
a one-off isolated Windows environment for infrastructure/schema qualification
only. It is not a mandatory machine for every future agent task.
This is a target contract, not an implemented environment or permission to create
one. technology=null; environmentReady=false; environmentCreated=false.

Follow-up: [RF023 read-only preflight](direct-codex-disposable-windows-preflight-v1.md)
completed with DISPOSABLE-WINDOWS-PREFLIGHT-BLOCKED. Local entrypoint/management
availability, finite resource reserves and cleanup proof do not support a
technology selection. This contract and its dated RF022 disposition below are
unchanged; the follow-up report records the current next task.

## DWE-R01 — Scope and unchanged boundaries

The native Windows pilot direction and direct Worker ownership remain intact.
[RF021](direct-codex-native-setup-admission-v1.md) remains BLOCKED for the shared
Desktop sandbox; [RF020](direct-codex-windows-build-binding-v1.md)'s publisher
metadata route stays closed. This decision does not admit the private runner
protocol or change [NSP](direct-codex-native-schema-probe-v1.md) /
[acceptance](direct-codex-native-schema-probe-acceptance-v1.md).

Exact build-bound argv, first-instruction containment, output completeness and
all fifteen NSP gates remain prerequisites. A different environment cannot waive
them. No automatic artifact/platform fallback, replay, retry, model/tool session
or production activation. No repository, runtime/API/DB or provider-registry v5
implementation change belongs to this contract.

## DWE-R02 — Standard boundary comparison, selection deferred

Prefer a standard Microsoft boundary. The following compares **proof obligations**,
not verified present capabilities or cleanup guarantees; RF022 performs no host
or network preflight.

| Candidate | Required availability/resource evidence | Required isolation/cleanup evidence | Current result |
| --- | --- | --- | --- |
| Windows Sandbox | Supported installed host edition/build/features, capacity and coexistence; exact controls for one instance and finite lifecycle. | Prove network/integration denial before guest code, minimal file channels, observable identity of every created backing resource and complete disposal after close/crash. A product's disposable label is insufficient. | UNQUALIFIED; not selected. |
| Disposable VM / Hyper-V | Supported already available hypervisor/management boundary, CPU/RAM/disk reserve and explicit per-instance limits. | Prove ownership and deletion of guest/registration/configuration, all VHD/VHDX and differencing disks, checkpoints, mappings and auxiliary resources; no shared switch/account/service mutation. | UNQUALIFIED; not selected. |
| Other supported Microsoft boundary | Identify official supported interface and an evidence-backed advantage under the same envelope. | Exactly the same no-network, ownership, before/after and cleanup obligations; no custom sandbox or private protocol substitution. | UNQUALIFIED; not selected. |

Technology selection requires both availability and demonstrable cleanup.
Unsupported inspection, invisible shared side effects or mandatory changes to
existing host resources mean BLOCKED. No feature installation, UAC, reboot or
trial environment may be used to discover availability under the next preflight.

## DWE-R03 — Existing host and workload protection

Never adopt, change or remove existing shared sandbox accounts, groups/rights,
firewall/WFP rules, ACLs, services, registry entries, scheduled tasks, Docker/WSL
state or user data. Existing platform dependencies may be referenced read-only,
never reclassified as task-owned or included in rollback deletion.

The private admission packet must identify every owner-named protected workload,
its resource reserve and non-invasive continuity evidence. Include normal laptop
work and the owner's existing application workload; keep its real name and
deployment/portfolio details out of distributed documents. No stopping, pausing,
moving, reconfiguring or borrowing its resources to make capacity available.
[Host lifecycle safety](../operations/host-lifecycle-safety.md) remains normative.

A boundary whose lifecycle mutates existing shared resources is inadmissible under
this decision. Incidental host-platform effects and retained caches are included
in the proof obligation, not silently exempted as implementation details.

## DWE-R04 — Planned resource manifest and exclusive ownership

Before any creation, seal a private versioned manifest in the existing evidence
location, outside this repository and real account profiles. This is a contract
for future evidence, not a new repository task board or execution coordinator.

Required top-level fields: contract/version, task/attempt/owner/grant references,
original expiry, selected technology/version/interface, artifact and dependency
pins, protected-workload references, before-snapshot digest, finite budget vector,
setup/probe grant references, cleanup owner/deadline and evidence-retention expiry.

Each planned resource entry needs: type, reserved unique ID and private location
reference, absent-before proof, dependencies, maximum count/bytes, creation
operation, returned-identity binding method, task owner, lifetime, exact stop/
delete operation, absence-verification method and cleanup order. Record the
intent before creation and returned identity immediately after it; interrupted
creation with an unknown identity is an incident, not an empty result.
Never use a filename prefix, PID alone or account/rule display name as ownership.

Enumerate every expected instance, disk/differencing disk, VHD/VHDX, checkpoint,
registration, temporary directory, payload/package copy, file-transfer/cache
entry, mapping, process and handle. Account/group/right, rule/filter, ACL,
service/task and registry changes must also have explicit entries or verified
empty lists. Host-shared entries are forbidden; guest-only resources must vanish
with the proved guest disposal. Unexpected resources block further creation.

## DWE-R05 — Finite resources and lifetime

maxInstances=1; maxAttempts=1; maxRetries=0. The single-instance exclusion covers
preparation through verified cleanup. An unresolved earlier attempt prevents a
new instance, even after application restart. No warm pool or retained guest.

The future grant must set positive finite hard limits, supported by the selected
boundary, for total wall time, preparation, setup, idle approval wait, probe,
inspection, stop and cleanup reserve; guest and aggregate host RAM/commit, vCPU/
CPU time/rate, disk allocated and logical bytes, I/O, files/directories, processes,
handles and retained evidence. Include input copies, guest OS/base/differencing
storage, caches, checkpoints and temporary/export files in the same disk budget.
Sparse allocation or host free-space polling alone is not a hard disk cap.

Current infrastructure budget is unqualified: environmentBudget=null;
environmentDeadline=null. Null/unsupported/unmeasured limits deny creation.
The read-only preflight must propose measured finite values and a host free-RAM/
disk/CPU reserve protecting existing workloads; this document invents no VM size.
Guest allocations do not increase NSP's 120-second probe, 256-file output or other
ceilings. Stop must satisfy NSP's five-second process-tree bound; full disposal
has its own finite reserve within the original environment expiry.

No budget refill, indefinite approval wait, auto checkpoint/suspend/resume,
restart recovery or deadline extension. Failure to obtain the separate probe
grant before the reserved teardown time causes cleanup without a probe.

## DWE-R06 — Input, network and output boundary

networkEnabled=false. Deny guest IPv4/IPv6, DNS, loopback-to-host, proxies, inherited
connections and broker/integration routes before any untrusted instruction.
Disable unnecessary clipboard, drive/device, credential and host-control sharing.
No new or modified shared host firewall rule may implement this guarantee.

Input is only the exact accepted local Codex artifact and explicitly sealed
minimal runtime dependencies, not a whole user profile/repository/installation.
The target remains app/resources/codex.exe, 297,858,352 bytes, SHA-256
081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575.
This is the previously observed candidate, not a fresh hash or launch admission.
Resolve source privately; deny identity drift or implicit replacement.

Any later permitted copy/transfer requires its own grant, manifest entry, hash
verification at both ends, finite lifetime and removal of every staging/cache/
package copy. No copy or download is authorized now. Map no broad host directory.
Use only minimal task-owned scratch and bounded evidence channels; guest writes
must not reach other host locations. No account credentials, auth/config/history,
browser data, real homes or host-control sockets enter the environment.
Outputs are inert data; never execute generated code or fetch schema references.

## DWE-R07 — Before and after snapshots

Before-snapshot means a sealed read-only **metadata inventory**, not a disk/VM
checkpoint or backup of user data. Record time, scope, collection method/version,
per-object stable identities/fingerprints and completeness/unknown markers for
all affected resource classes and protected shared-state assertions.
Do not create a restore point, VHD or checkpoint to obtain this snapshot.

Take the same bounded projection after setup and after final disposal, comparing
the original pre-creation baseline and the planned/actual manifest. Unknown or
unreadable is not absent. Compare owned-resource absence, shared-resource identity/
policy and protected-workload continuity, not just counts, process names or
a reported guest exit. No Docker/WSL wakeup/repair/query is implicit in this scope;
if adequate passive evidence is unavailable, retain BLOCKED.

Normal independent user activity is not task-owned drift to undo. Do not demand
byte-identical global process inventories or restore global state over live work.
Any unexplained relevant difference or inability to separate task effects from
concurrent changes blocks success and triggers incident reconciliation.

## DWE-R08 — Separate stage admission

| Stage | Authority and exit condition |
| --- | --- |
| Read-only preflight | Availability/cost/cleanup observability only. No feature install, UAC, setup, guest creation or Codex invocation. |
| Future environment setup | Separate exact grant after technology, finite budgets, owned manifest, before snapshot and cleanup/recovery methods are independently accepted. Create only the approved environment/resources; no Codex execution. Verify isolation and deltas. |
| Future exact probe | Separate later grant and all NSP evidence. No automatic transition from successful setup, no broader runtime/model/task admission. Waiting for approval consumes the same finite environment lifetime. |
| Disposal | Mandatory on success, failure, cancellation, timeout and interrupted controller/host execution. It cannot wait indefinitely for a later probe grant. |
| Receipt closure | Only after verified owned-resource removal and before/after comparison. An interrupted attempt is reconciled for disposal, never resumed for work automatically. |

An independent reviewer must reject missing proof of network denial, immutable
input/host isolation, hard resource limits, all-owned process stop, shared-state
preservation or recovery after controller death. Acceptance of this architecture
is neither that review nor setup/probe authority.

## DWE-R09 — Cleanup and rollback

The eventual exact grant must include a finite, independently owned cleanup
mechanism and crash/restart reconciliation. Do not add a host service or scheduled
task to implement recovery unless its creation and complete removal fit this
contract and are separately authorized; no such mechanism is selected here.

1. Fence new creation/input/probe and record the first failure. Stop only the owned
   execution unit using stable handles/instance IDs; confirm the complete tree.
2. Inspect output as bounded inert data and produce only the allowed sanitized
   receipt within the remaining deadline. No unbounded diagnostic preservation.
3. Close every owned process/control/evidence handle and transfer channel; detach
   only the exact owned mappings and release all instance/storage attachments.
4. Through the supported interface, remove owned guest/registration and every
   owned disk, VHD/VHDX, checkpoint/snapshot, directory, payload/package copy,
   cache, mapping and any owned account/rule/ACL/service/task/registry object.
   Traverse only sealed task roots; reject changed identities/reparse escapes.
5. Verify absence for each actual and planned resource, allocated-space release,
   no outstanding owned processes/handles, and the final baseline comparison.
   Release the single-instance exclusion only after this evidence is complete.

Rollback means reversing this attempt's owned creations in dependency order.
It never means restoring a full-machine snapshot, blanket firewall/ACL reset,
global process kill, removing unknown objects or deleting shared platform data.
No retry of setup/probe follows cleanup. If stop, ownership or deletion cannot
be proved, cease unsafe deletion, retain only bounded sanitized incident evidence
and the unresolved-resource references, and require scoped human reconciliation.

## DWE-R10 — Success, BLOCKED and incident

| Result | Required condition |
| --- | --- |
| SUCCESS | The authorized stage's substantive checks pass, every task resource is removed, no residual handles/processes remain, final snapshot comparison proves no task change to protected shared resources/workloads, and only permitted sanitized evidence remains. Probe output or exit 0 alone is insufficient. |
| BLOCKED before creation | Missing technology/budget/authority/ownership/cleanup proof, unsupported observation or unavailable capacity. Zero environment creation and zero probe. |
| BLOCKED after clean failure | Work failed but owned resources were demonstrably removed and shared state preserved. Record the failed checks; never label the qualification successful. |
| INCIDENT + BLOCKED | Any residual resource, unconfirmed stop/deletion, unexplained shared-state change, missing before/after evidence, expiry without confirmed disposal or unknown ownership. Never SUCCESS; no blind cleanup or new attempt. |

Residual prohibition includes accounts, rules/filters, ACL changes, VHD/VHDX,
checkpoints/snapshots, temporary directories, mappings, services/tasks, registry
entries, downloaded payloads/package copies, processes and handles, including
resources normally hidden behind the chosen platform's interface.
If a platform cannot expose and prove this cleanup, it is not admissible here.

## DWE-R11 — Evidence retention and existing contracts

The sole persistence exception is small sanitized evidence needed by Roost:
contract/task/grant references, artifact/manifest and before/after digests, bounded
resource counts/fixed reason codes, timestamps, cleanup outcomes, unresolved
opaque references and reviewer reference. Maximum aggregate retained evidence:
65,536 UTF-8 bytes per attempt, including any failure receipt; require an explicit
finite retention expiry and owner before creation. No new evidence service.

Keep private collection buffers minimal and transient; redact before persistence.
No raw logs, usernames/SIDs, machine paths, environment values, user data,
credentials, copied payloads or full generated schema bundles may remain.
Inspect/review any transient schema before final deletion under the finite budget.
Evidence about schema identity does not itself deliver a reusable schema payload.
Delete the temporary baseline/manifest/control files after deriving the sanitized
receipt; incident references must suffice for separately scoped reconciliation.

D01/B01/B02 and NSP01–02/09/16 retain identity/schema obligations.
D03/D04/D06, B04/B05/B07 and NSP03–08/10–15 retain auth/FS/network/host/process
obligations. CAS-R/T02–08,10,13–17,19–29 remain unqualified; no runtime proof follows
from this documentation. If a contract conflict prevents compliant operation,
retain BLOCKED rather than weaken either boundary.

## DWE-R12 — Current disposition and next task

Architecture accepted; technology and resource costs not selected or verified.
setupAuthorized=false; setupStarted=false; actualProbeAuthorized=false;
actualProbeStarted=false; implementationReady=false; executionSupported=false;
pilotReady=false; liveAdmissionAllowed=false.
No environment, snapshot/checkpoint, VM, account, rule, file mapping or host
resource was created by RF022. No host preflight/network request, setup/runtime,
Docker test/query/action, WSL lifecycle, Windows feature/UAC/reboot, installation,
payload copy/download, push or deployment occurred. Only documentation checks ran.

Exactly one recommended next atomic task: **RF-CODEX-023 — read-only preflight of
standard disposable Windows boundary availability and resource cost.** Compare
available Windows Sandbox and disposable VM/Hyper-V support, finite CPU/RAM/disk/
lifetime costs and observable cleanup prerequisites under this contract. Report
unknowns and BLOCKED without installation, UAC, reboot, environment creation,
probe, Codex or Docker/WSL action. RF-CODEX-023 was not started.

RF022 verification: qualification/environment and CAS documentation validators
passed, including links, requirement numbering, false gates, unchanged profile/
schema seals and registry v5. No infrastructure/runtime test was run.
