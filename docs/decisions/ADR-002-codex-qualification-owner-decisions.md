# ADR-002: Codex qualification owner decisions I01

Date: 2026-09-13
Status: accepted
Owner: Roost architecture owner
Decision version: 1
Scope: RF-HERMES-007; owner decision recording only
Interview packet: **I01 RESOLVED**
Source reference: `owner-interview.rf-hermes-007.i01.v1`

## Context and provenance

The owner resolved I01 after the RF-HERMES-006 qualification decision packet.
The governing RF-HERMES-007 handoff conveys the approved decisions below.
This record preserves their scope and date without private interview content,
personal identifiers, deployment names, machine paths or credential material.
It does not assert that a database Decision was created or an API was changed.

[ADR-001](ADR-001-direct-codex-app-server-pilot.md) remains the architecture
direction. The [qualification packet](../architecture/direct-codex-qualification-decisions-v1.md)
owns technical status; accepted owner policy is not missing technical evidence.

## I01-A — APPROVED: task-specific bounded sizing

Decision reference: `owner-i01-a-v1`.

Every task receives explicit, separately selected time, token and resource
limits. The responsible technical system/agent selects concrete values from
the plan, measurements and host capability within approved contract bounds.
The owner does not manually select parser/buffer technical numbers; technical
qualification must choose and prove them. This reaffirms the earlier interview
policy, not a new requirement for repetitive owner selection of such numbers.

Overall remains 60–3,600 seconds from original startedAt, without automatic
extension or deadline reset. A long operation, including a reported approximately
15-minute redeploy, must fit operation, preparation, verification, normal exit
and safe stop within its task/turn budget. This sizing example grants no release
authority. Divide tasks into smaller units when that improves control and
competence assignment, while retaining explicit scope, independent acceptance
and effect reconciliation; never split retries merely to evade a consumed cap.

Hard time/token/resource limits and accounting remain required. Lack of a
credible hard monetary enforcement mechanism retains monetary admission denial;
usage reports are not hard caps. No amount, currency, pricing model, technical
phase/buffer value or numeric storage/retention/capacity limit is selected here.
Those need a safe technical proposal and measurement. No raw logs; unresolved
work and its only evidence must not be automatically removed.

## I01-B — APPROVED: official local Codex account access

Decision reference: `owner-i01-b-v1`.

The local Worker may use only the official authentication of the Codex account
logged in on the laptop. Roost stores only a connection identifier/reference
and its state, never a token, password or copy of login files. This approves
the identity/source policy, not a specific access mechanism.

A supported, isolated, evidenced official channel is still mandatory. If absent
or unproven, fail closed and do not start an agent. No copying desktop auth,
uncontrolled environment/file fallback, inspection of real secrets in this task,
or assumption that pointing synthetic CODEX_HOME at a user's profile is safe.
The consent neither grants secret inspection nor proves channel isolation.

External integrations separately use the account of the Roost user responsible
for that integration. The local Codex account policy does not transfer ownership
of those integrations or authorize another user's credentials. Existing
credentialChannel and installation-specific references remain unresolved.

## I01-C — APPROVED: a later separately contracted evidence task

Decision reference: `owner-i01-c-v1`.

The owner permits a later separate bounded compatibility/evidence task for one
Windows Worker + WSL2 Codex App Server candidate. Its exact task contract must
precede execution. It must not start a model or an agent performing tasks, or
change applications, production or configuration. It may assess exact version/
integrity, protocol, isolation, process stopping and denial outside allowed
scope, and must finish blocked when any required guarantee cannot be confirmed.

This decision does **not** authorize RF-HERMES-007 to execute any probe, install
anything, run Codex/Worker/Hermes/OpenShell, invoke a real model or its tools,
use a network, access secrets or make external writes. No such action is performed
by recording the decision. Future installations, real-model tests or broader
actions cannot be inferred from this narrow permission.

## Effects, limits and alternatives

| Item | Result | Boundary retained |
| --- | --- | --- |
| I01-A | Sizing-policy question resolved; technical values selected by the responsible technical system/agent. | B03 narrowed to measured/qualified values and missing monetary mechanism; B08 capacity/retention still unproven. No technical null is filled. |
| I01-B | Codex authentication identity/source policy resolved; external integration ownership reaffirmed. | B04 remains until the official isolated channel is demonstrated. Service-account substitution/copied login is not the selected path. |
| I01-C | Later limited evidence work permitted in principle. | Exact contract and prerequisite artifacts still required; B01/B02/B05–B09 are not evidence-complete. No present probe authority. |

Manual owner tuning of parser/buffer values is superseded by I01-A. Waiting for
technical evidence remains valid whenever an enforcing mechanism is unknown.
Uncontrolled token/file/env reuse, automatic budget growth and implicit activation
remain rejected. No accepted choice relaxes CAS-R01..30 or their required proof.

I01 is RESOLVED; D01–D06 remain BLOCKED and D07 stays DECIDED for document/schema
design only. B01–B09 all remain open for the narrowed technical reasons in the
qualification packet. implementationReady=false, executionSupported=false,
pilotReady=false and liveAdmissionAllowed=false. Registry v5 is unchanged.

## Smallest next step

The current profile has no exact Codex version/executable/inventory/wire-schema
pin. The historical CLI observations and Hermes/Python inventory do not supply
one. Therefore a runtime compatibility probe is not yet the smallest safe step.
The qualification packet specifies RF-HERMES-008: an offline, read-only artifact
pin/inventory preflight, with no executable launch, auth access or installation.
This record does not start it or manufacture its missing installation references.

## Supersession

These owner decisions resolve the pending I01 questions and supersede conflicting
RF006 recommendations only within the scope stated above. Dated research evidence,
ADR-001, technical admission gates and the existing recovery contract remain valid.
