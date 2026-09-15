# ADR-003: Native Windows Codex App Server pilot profile

Scope successor: [ADR-004](ADR-004-native-hermes-codex-pilot.md), 2026-09-15.
Native Windows remains selected, now with Hermes/Codex OAuth first. The disposable
qualification route below is deferred and rejected as a pilot prerequisite;
authority, workspace and cleanup requirements remain. Dated acceptance below is
preserved as history, not current provider ordering or environment authority.

Date: 2026-09-13
Status: accepted
Owner: Roost architecture owner
Decision version: 2
Amended: 2026-09-15, RF-CODEX-022 owner-approved qualification boundary
Scope: RF-CODEX-015 platform direction; RF-CODEX-022 one-off qualification only
Source reference: `owner-interview.rf-codex-015.windows-pilot.v1`

## Context

[ADR-001](ADR-001-direct-codex-app-server-pilot.md) accepted the direct
Worker → Codex App Server architecture. The initial qualification candidate
used Windows Worker → WSL2 Linux. [RF-CODEX-014](../architecture/direct-codex-platform-selection-v1.md)
recommended native Windows to remove the cross-OS bridge and separate Linux
artifact acquisition from the pilot path.

The owner explicitly accepted that recommendation in the governing RF-CODEX-015
handoff. This document records the supplied decision; it does not claim that a
production Decision/API record, impact graph or Ready transition was created.

## Decision

The pilot target is **Roost control plane/API → Windows Local Worker → native
Windows x64 Codex App Server**, using a separately qualified exact artifact from
the existing official desktop application package.

WSL2 is a later optional, separately qualified profile. There is **no automatic
Windows↔WSL fallback**, simultaneous second server or independent second writer.
Failure or drift denies/stops the selected attempt and preserves reconciliation.
It does not choose a different platform, artifact, sandbox mode or fresh budget.

This replaces only the WSL-first platform selection in D01/D04 and the platform
scope of ADR-002 I01-C for future pilot evidence work. ADR-001's direct ownership
and optional Hermes/OpenShell boundaries remain accepted. ADR-002 I01-A's sizing
and I01-B's official local-account policy remain unchanged. Every future probe
still needs its exact bounded task; this decision authorizes no probe, model,
setup, installation, account inspection or runtime change.

An inspection candidate may be identified by exact Appx identity/version plus
native file SHA-256 without inventing an internal Codex version. That identifies
observed bytes only. Unknown build/wire mapping, dependency closure and effective
controls continue to deny an admitted CAS invocation.

## RF-CODEX-022 accepted amendment

The governing RF-CODEX-022 handoff conveys the owner's approval of a separate,
one-off Windows environment for infrastructure/schema qualification. It is not
a required machine for every future agent task. The
[environment contract v1](../architecture/direct-codex-disposable-windows-environment-v1.md)
owns the resource manifest, finite lifetime/budgets, before/after snapshots,
cleanup, incident and sanitized-evidence requirements.

Every created resource must be task-owned and inventoried before creation.
Existing shared sandbox accounts, rules, ACLs, services, registry/tasks,
Docker/WSL state and user data must never be adopted, changed or removed.
Success and failure both require exact owned-resource cleanup and baseline
comparison; unconfirmed cleanup is INCIDENT + BLOCKED, never success.
Only bounded sanitized evidence may remain; no guest disks/checkpoints, payload
or package copies, temporary resources, processes or handles may survive.

Prefer a standard Microsoft boundary, but Windows Sandbox versus disposable
VM/Hyper-V remains unselected pending read-only availability, resource-cost and
cleanup evidence. Protect normal laptop work and all privately named workloads.
Require one instance, no network and only exact artifact/minimal scratch/evidence
inputs. Setup and probe remain separate future approvals with no automatic step.
RF022 authorizes documentation only, not feature installation, UAC, host changes,
environment creation, copying or execution. No production decision record is
claimed. NSP's build-bound argv and all other admission requirements remain open.

## Alternatives Considered

| Option | Consequence | Disposition |
| --- | --- | --- |
| WSL2 first | Adds bridge, cross-OS ownership/mount qualification and the separately researched Linux delivery route. | Deferred for a demonstrated Linux requirement; historical RF009–013 evidence retained. |
| Native Windows only permanently | Simplifies the first path but excludes future Linux tooling needs prematurely. | Not selected as a permanent restriction. |
| Native pilot; optional WSL2 later | One current platform, existing checkout/package, retained future choice. Native trust, sandbox, auth and whole-tree stop still need proof. | Accepted, with no automatic fallback. |

## Consequences

The [RF-CODEX-015 preflight](../architecture/direct-codex-native-artifact-preflight-v1.md)
owns artifact findings and the documentary native target profile. Preserve the
old WSL profile/schema as historical, NOT_ADMITTED evidence; do not relabel it.
There is no new executable profile/schema/adapter in this decision.

CAS-R/T01..30 remain mandatory. implementationReady=false,
executionSupported=false, pilotReady=false and liveAdmissionAllowed=false.
Job Object, sandbox/firewall, official account isolation and stop within five
seconds are not established by choosing Windows. The implemented provider
registry v5 remains unchanged; a separately reviewed versioned reconciliation
comes only after qualification. No activation, fallback or replay on rollback.

## Evidence

- Governing RF-CODEX-015 handoff records the explicit owner acceptance above.
- [Platform comparison](../architecture/direct-codex-platform-selection-v1.md).
- [Qualification packet](../architecture/direct-codex-qualification-decisions-v1.md)
  and [CAS contract](../architecture/direct-codex-app-server-contract-v1.md).
- [ADR-002](ADR-002-codex-qualification-owner-decisions.md), retained I01-A/B and
  exact-task prerequisite from I01-C.

## Supersession

This is the narrow platform successor to ADR-002 I01-C and the initial WSL
qualification selection. ADR-001 and ADR-002 remain accepted for their other
provisions; their original text remains dated evidence. This decision's current
platform scope takes precedence. No database decision history was rewritten.
Version 2 adds only the owner-approved one-off qualification environment above;
it does not change normal agent deployment or select an isolation technology.
