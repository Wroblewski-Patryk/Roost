# Disposable Windows availability and resource preflight v1

RF-CODEX-023, 2026-09-15. Read-only qualification result:
**DISPOSABLE-WINDOWS-PREFLIGHT-BLOCKED**.

The [DWE-v1 contract](direct-codex-disposable-windows-environment-v1.md) and
[ADR-003 version 2](../decisions/ADR-003-native-windows-codex-pilot.md) remain
unchanged. The preflight is complete; environment qualification is not.
technology=null; environmentBudget=null; environmentDeadline=null.
No variant has sufficient availability, enforcement and cleanup evidence for
selection. No alternative host or boundary is implicitly authorized.

## Observations and collection limits

Collected at **2026-09-15T16:32:46Z**, with the feature checks immediately following.
Values are a volatile point-in-time projection, not a reservation or a capacity
guarantee. Rounded binary GiB values below contain no host identifiers.

| Observation | Value | Evidence and limitation |
| --- | --- | --- |
| Installed OS | Windows 11 Home, version 10.0.26200, build 26200, 64-bit | Selected Win32_OperatingSystem properties; no support entitlement inferred. |
| Installed / OS-visible RAM | 31.69 / 31.69 GiB | Win32_ComputerSystem and Win32_OperatingSystem. |
| Free physical RAM | 9.61 GiB | A single snapshot; workload peaks and commit headroom unmeasured. |
| CPU | 10 cores / 16 logical processors | Aggregate Win32_Processor and Win32_ComputerSystem properties; no utilization or schedulable reserve measurement. |
| Hypervisor present | true | Does not identify its owner, prove Hyper-V management availability or authorize querying existing guests. |
| Firmware virtualization / SLAT / VM monitor flags | Each reported false by Win32_Processor | Recorded without interpreting them as definitive hardware incapability or disabled firmware; no firmware change proposed. |
| System volume capacity / free | 450.86 / 29.11 GiB | Selected Win32_LogicalDisk properties; no other disks or storage locations surveyed. |
| Standard Windows Sandbox executable | Absent at the system entrypoint checked | Test-Path leaf check only; no launch, recursive search or package scan. |
| Hyper-V PowerShell module | 0 discoverable modules | Get-Module -ListAvailable -Name Hyper-V; no import or management call. |

Seven exact Win32_OptionalFeature name filters returned **NO_ROW**, without a
query error: Containers-DisposableClientVM, Microsoft-Hyper-V,
Microsoft-Hyper-V-All, Microsoft-Hyper-V-Tools-All,
Microsoft-Hyper-V-Management-PowerShell, Microsoft-Hyper-V-Hypervisor and
Microsoft-Hyper-V-Services. No InstallState value was returned. NO_ROW is not
equivalent to a reported Disabled state or proof of every platform capability's
absence. No broader feature scan or servicing command followed.

CIM calls used OperationTimeoutSec=10 and explicit property projections; this
provider timeout is not an environment lifecycle guarantee. Only these host
metadata queries, the executable presence check and module discovery ran.
No process/application inventory, raw host logs, account/profile files, package
contents, service inventory, Docker or WSL queries were collected. No network
request or external product documentation retrieval occurred in RF023. Official
edition support and exact supported control semantics remain UNKNOWN here.

## Candidate matrix

AVAILABLE means positively observed in the stated narrow scope; UNAVAILABLE
means that exact checked entrypoint is absent; UNKNOWN means insufficient
evidence. BLOCKED is the DWE admission decision, not proof of product incapability.

| Candidate | Local availability | DWE controls and cleanup | Admission |
| --- | --- | --- | --- |
| Windows Sandbox | Standard executable UNAVAILABLE; feature-query result NO_ROW; complete installed/support status UNKNOWN. | CPU/RAM/disk/I/O/process/handle caps, network/integration denial and identification/removal of hidden backing resources UNKNOWN. | BLOCKED; not selected. |
| Disposable Hyper-V VM | Hypervisor flag AVAILABLE; PowerShell management module UNAVAILABLE in discovery; named feature state and an already usable supported management boundary UNKNOWN. | Owned registration/storage/checkpoint lifecycle, hard aggregate limits, minimal channels and crash cleanup UNKNOWN. No existing VM, switch or disk was queried. | BLOCKED; not selected. |
| Other officially supported Microsoft boundary | No concrete already available candidate identified; UNKNOWN. | Same DWE obligations; no evidence-backed advantage or supported interface established. | BLOCKED; not selected. |

The observed OS edition is not used to assert a current Microsoft support matrix
without source evidence. Neither missing entrypoints nor the hypervisor flag
justify installation, feature enablement, an unofficial workaround or a trial
guest. Windows Sandbox cannot be preferred merely because it is called disposable;
Hyper-V cannot be preferred merely because a hypervisor is present.

## Finite budget assessment

maxInstances=1; maxAttempts=1; maxRetries=0 remain contractual ceilings, not
implemented enforcement. The following missing quantities prevent a defensible
finite environment budget. No guest sizing is invented from free host capacity.

| Budget dimension | Available basis | Qualified limit / reserve |
| --- | --- | --- |
| RAM and aggregate host commit | 9.61 GiB free physical RAM at one instant | UNKNOWN: base guest, setup/probe, host overhead, peak workload and cleanup reserve not measured. |
| vCPU, CPU rate and cumulative time | 10 cores / 16 logical processors | UNKNOWN: utilization, protected workload reserve and enforcement interface not established. |
| Logical and allocated disk bytes | 29.11 GiB free on the system volume | UNKNOWN: base image, input/staging/cache/differencing/checkpoint costs and hard aggregate cap absent. No space reserved. |
| I/O, files/directories, processes and handles | No boundary or workload measurement | UNKNOWN: limits must cover guest and host-side overhead, not just a child Job or output directory. |
| Setup, approval wait, probe, inspection, stop, disposal and total lifetime | NSP's existing probe ceiling is 120 seconds; process-tree stop bound is 5 seconds | UNKNOWN for the environment: no setup/disposal timing, independent cleanup mechanism or finite teardown reserve. NSP bounds do not time a whole guest lifecycle. |
| Evidence retention | DWE allows at most 65,536 UTF-8 bytes aggregate per attempt | Contractual ceiling only; future owner and finite retention expiry UNKNOWN. This report retains only the sanitized preflight projection. |

The free-RAM and free-disk observations cannot be offered as guest allocations.
There is no measured normal-workload reserve, including the owner's privately
identified protected workload. Its continuity was not queried and is UNKNOWN;
no claim of an unchanged workload is derived from the absence of intentional
mutations. A fresh authorized snapshot would be needed before any later grant.

## Cleanup observability and effect scope

No environment/resource was created, so there is no guest disposal receipt or
cleanup test. The queries above are not a DWE-R07 before-snapshot: they lack
stable per-resource identities, ownership bindings and complete affected-class
coverage. No after-snapshot comparison or shared-state no-op proof is claimed.

For either candidate the missing proof includes: supported instance identity;
all host-side configuration, base/differencing disk, VHD/VHDX, checkpoint, cache,
mapping, transfer and temporary-file effects; process/handle ownership; and
whether accounts, rules/filters, ACLs, services, tasks or registry objects are
affected. There is no sealed manifest, exact safe deletion method, absence
verification or recovery owner surviving controller death. No existing shared
resource may be adopted as task-owned or deleted to resolve these unknowns.

Network, clipboard/drive/device/credential/broker integration denial before code,
minimal sealed inputs, scratch/evidence channels and closure of every channel are
unverified. networkEnabled=false is the required policy, not an observed guest
configuration. No platform exception to strict cleanup has been accepted. An
unknown or residual effect in a later attempt still means INCIDENT + BLOCKED.

## Disposition and one next task

environmentReady=false; environmentCreated=false; setupAuthorized=false;
setupStarted=false; actualProbeAuthorized=false; actualProbeStarted=false;
implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false. All fifteen NSP gates remain closed; profile/schema
seals and provider registry v5 are unchanged. RF020's publisher metadata route
stays closed and no private runner interface is admitted.

No feature enable/install, UAC, reboot, VM/Sandbox/checkpoint/VHDX creation,
account/ACL/firewall/service/task/registry mutation, payload download/copy,
Codex/setup/runner/generator invocation, Docker/WSL query or action, runtime/API/DB
test, push or deployment occurred. Repository documentation and its static
validator are the only changed implementation artifacts.

Exactly one recommended next atomic task: **RF-CODEX-024 — owner selection of an
already provisioned Windows qualification host and bounded read-only evidence
scope.** Request a private host reference with an already available supported
Microsoft boundary and authority to inspect its availability, hard-limit controls
and cleanup observability under unchanged DWE-v1. If no such host is available,
retain BLOCKED; this recommendation grants no acquisition, installation or host
change. Selecting a host does not select a technology or authorize a guest.
RF-CODEX-024 was not started.

Verification passed: qualification and CAS documentation validators plus
git diff --check. No system fixture or infrastructure/runtime test is required
for these documentation changes; none was run.
