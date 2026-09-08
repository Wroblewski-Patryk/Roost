# Native serious-incident suspension (RF-SEC-012)

The native runtime uses an append-only suspension and remediation journal linked
to an existing `technical_incident` CompanyRecord. Explicit classification and
the capability deny commit together. Editing, completing or archiving the source
incident never restores authority. Deployment creates no suspension and does not
reclassify historical sanitizer observations. A redaction match is not an automatic
serious-incident classifier.

## Exact scope and authority

Every suspension names one workspace, task, application and operation:
`review_decision`, `return_to_executor`, `create_specialist_task` or
`runtime_execute`. The task must have the application project link in that
workspace. An agent and its exact credential can further restrict review scope;
runtime scope can specify its assigned agent and/or a host. Host credentials are
not treated as workforce identities. Credential-only runtime containment is not
supported by this contract.

The human issuer/detector records a bounded, redacted reason and evidence of the
affected scope. A current owner/admin can suspend a named principal, credential
or host. Omitting all three requires the current owner and an explicit broader
scope justification. This expands only to the single task operation, never a
workspace, application portfolio or operation wildcard. Cross-task containment
requires separate explicit classifications, not inferred bulk action.

The API never accepts body-supplied issuer/decision identities. Membership is
rechecked in the transaction. Agent/integration keys cannot administer this human
remediation workflow. PostgreSQL independently validates scope, actor membership,
versions, proof references and transition conditions.

## Admission and durable fencing

The existing Ready source fence serializes suspension changes with native grant,
review and execution admission. New grants and existing grant uses are denied
in the affected operation/principal scope. Human review commands are also denied
when the explicit whole-task-operation scope applies. Unrelated operations,
principals, credentials, hosts, applications and workspaces retain their gates.

Restoration never revives a grant predating the suspension, reopen, rejection or
manual-intervention boundary. It requires a new grant under the current task,
role, credential and time checks. Historical uses remain readable; exact business
command retries cannot regain authority from a suspended/obsolete grant.

`runtime_execute` fences matching active attempts using the existing
`contextInvalidatedAt` stop/recovery protocol. A host-only suspension leaves
the shared Ready pin available to other hosts. A whole-task or matching assigned
agent suspension invalidates Ready. Never-started affected queued attempts are
cancelled with the durable fence; they are not silently resumed. The old attempt
cannot clear its fence after restoration. A new Submit and execution are explicit
actions. Safe stop/cancel reporting remains available.

The deny is immediate at database admission. Process termination follows the
existing checkpoint/heartbeat/lease stop mechanism, not an instantaneous OS kill.
The host retains its writer ownership for reconciliation and rereads context
before replanning. This does not control external processes bypassing the host.

## Evidence, verification and owner decisions

`NativeCapabilitySuspension` is immutable. `NativeSuspensionJournal` assigns a
monotonic version to each append-only command with its request ID, input hash,
authenticated actor, proof reference and timestamp. The initial scope is version
1. All later commands require the exact current `expectedVersion`.

An evidence version records cause, impact, remediation, regression proof with
observed results, limitations and the declared human repair author. It is complete
only when every bounded field and current workspace author resolve. Evidence and
references are human assertions; Roost neither fetches nor executes the cited
tests and does not claim independent artifact attestation.

A current human member/admin/owner independently verifies that exact version.
The verifier must differ from both its recorder and declared repair author.
Restoration requires this verification, still-current verifier membership and
a fresh explicit owner command binding the current journal and evidence version.
Ownership does not substitute for independent verification. A new evidence
version or reject/reopen/manual-intervention action invalidates prior proof.

Reject keeps or reactivates the deny; reopen requires a new proof cycle. Repeated
identical commands return the durable result/current state without repeating an
effect. Changed input under the same request ID conflicts. Concurrent stale
commands fail closed and can be refreshed; state is not held in process memory.

## Owner manual intervention

The owner records a redacted manual-intervention reason under the relevant
suspension. This records observation of an external human change; it never
executes the external edit. The command reactivates containment, invalidates the
named task's Ready and active work, and requires reread/replan and new proof.
No task description, assignment, repository file or owner change is undone.
Roost cannot observe an unreported out-of-band edit automatically.

## API and console

Routes below `/v1/agent-runtime/capability-suspensions`:

| Route | Contract |
| --- | --- |
| GET `/` | Human read, optional taskId/incidentId, 50 scoped results and truncation flag. |
| GET `/catalog` | Human admin choices; optional exact taskId, up to 200 per catalog. |
| POST `/` | Explicit serious classification and deny; exact scope, requestId, reason, scopeProof, optional owner broaderReason. |
| GET `/:id` | Current state and latest 100 journal entries; safe actor references and current action authority. |
| POST `/:id/actions` | Versioned evidence, verify, restore, reject, reopen or manual_intervention. |

The existing PL/EN incident editor and result-review/task-grant views open this
workflow. Incident rows expose active containment separately from ordinary record
status. Scope, required next action, evidence versions, actors and restoration
history are visible. Forms preserve request IDs on uncertain transport, require
explicit decision confirmation and protect unsaved evidence. Read-only, missing,
loading, failure, stale and truncated states grant no authority.

## Migration, verification and release

`20260908090000_native_capability_suspension` adds empty history tables and forward
admission functions/triggers. It wraps existing grant validation instead of
rewriting applied migrations. It does not update historical incident/business
rows, seed data, rotate credentials or replace volumes. Test fixtures preserve
71 pre-existing sanitizer incidents byte-for-byte across upgrade.

Verification lives in `src/tests/api.test.ts`,
`scripts/capability-suspension-migration.test.mjs` and
`scripts/capability-suspension-ui.test.mjs`; existing host context-stop/recovery
suites prove the reused stop protocol using synthetic processes. No real agent,
provider or model activation is part of testing.

Back up and verify PostgreSQL before deploying. Deploy schema/API/web together;
keep execution disabled and the canonical observer in observe. Prefer a forward
fix. An older backend lacks the remediation UI/API even though additive database
denies remain; never remove those guards/history to make rollback appear healthy.
RF-SEC-012 remains partial outside the native surfaces: no full risk engine,
automatic remediation, provider/Git/OS broker or universal containment exists.
