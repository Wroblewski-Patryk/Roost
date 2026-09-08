# Governed task clarification (RF-CTX-015)

Specialists can exchange bounded, typed context inside the task review workbench.
A conversation never edits Task, Ready, assignment, scope, priority, procedure,
risk, mandate, capability or release authority. It cannot invoke an agent or
execute instructions. This is a native conversation ledger, not an external chat
integration or an autonomous routing system.

## Participants and scope

Each immutable conversation binds the workspace, root task, optional related
task, exact sender and recipient principal/role, and a server-resolved context
SHA-256. Principals come from the five current RF-CTX-010 task roles. Human
profiles resolve to a current workspace User; agent roles resolve to their own
credential-bound WorkforceEntity. Aliases cannot create a second principal.
An administrator may audit history but cannot write as a role they do not hold.

Both tasks must have an accepted Ready pin, current role provenance and current
operation admission. A completed execution is not required. A legacy task with
no accepted pin has no eligible conversation participants. The existing task
states `todo`, `in_progress` and `blocked` permit writing. After closure, current
task-role principals can still read history; a closed context cannot accept new
messages or grants.

Linked conversations require an active canonical task-to-task Dependency of type
`depends_on`, `blocks`, `requires` or native `review_correction`, in the same
workspace and application. A textual mention is not a relation or authority.
Current native handoffs concern one task; this feature does not invent a
cross-task handoff relation. Both tasks' context and the dependency revision are
pinned; removing or changing that relation makes the old conversation stale.
Other relation types and cross-application conversations are deliberately denied.

## Durable message contract

`task_clarification_threads` and `task_clarification_entries` are append-only.
An entry has a monotonic conversation version, timestamp, authenticated author,
recipient, context version and request ID. The six message types are:

- `question` and `answer`;
- `evidence_request` and `evidence_response`;
- `constraint_notice` and `status_update`.

Each message has 3–2,000 characters of text, at most eight typed references,
optional expected response (`answer`, `evidence_response`, or `read`, instruction
and optional UTC deadline), and an optional material observation with category
`assumption`, `constraint` or `evidence` and reason. Evidence responses require a
verified reference. Constraint notices require a material observation.

Material observations produce a durable `task_clarification_attention` event and
a visible formal-review notice. They do not modify the task contract. The author
must flag material findings; the system does not claim to infer every material
change from arbitrary prose. The workbench directs the reader to existing task
editing, explicit Submit, decisions or formal handoff. Strict schemas reject
extra authority-changing fields, and deterministic PL/EN command-pattern checks
reject recognizable mutation instructions. Those checks are a bounded lexical
guard, not a general semantic classifier. All prose remains non-executable,
including instructions outside the detector's vocabulary.

A recipient may explicitly acknowledge one exact message version. Replies bind
that exact target and version. Corrections create a new message with `supersedes`
pointing to the same author's prior message; each version has at most one
successor. No edit or delete endpoint exists. A read receipt or response is never
review acceptance, release approval or new authority.

## Grants and transaction fences

`clarification_send` and `clarification_reply` are separate native risk,
procedure-composition and suspension operations. The latter covers reply and
read, but the capability binds the exact action, so a reply grant cannot record
a read receipt. Both tasks must admit the operation. Agent writes additionally
require a current own credential and a single-use grant bound to the exact
sender/recipient task roles and context. Reply/read grants bind the conversation
and target message. Owners/admins issue grants through the existing ledger.
Only clarification grants may omit `execution_id`; all previous operation
constraints remain intact.

The database rechecks role provenance, both task contexts, admission,
suspensions, credential lifecycle and grant receipt at commit. Business entry,
capability use and audit event commit together. Serializable source/task fences,
version checks, unique request IDs and append-only triggers reject races and
orphan receipts. Identical retries return the durable entry only while authority
and context remain valid. A reused request ID with different content conflicts.
Restart does not reconstruct authority from conversation text. Suspension
restoration cannot revive grants issued before that suspension, including a
suspension scoped to the related task.

RF-SEC-004 inspects incoming content and resolved references before writing, and
all history, source and replay projections before returning them. Unsafe content
blocks the operation with safe audit classification. No binary attachments, raw
logs, credentials or model-generated summaries are accepted as typed references.

## Verified execution summary

The summary is a deterministic projection, separately displayed from conversation
claims. Typed references carry source kind, task, exact ID and revision digest.
The server resolves each reference and persists its verified data snapshot:

- latest execution, if completed with a correctly bound typed `resultRevision`,
  attempt, host/checkpoint, commit, branch and clean/dirty working-tree state;
- recorded verification commands and their observations;
- native handoff versions and receipt decisions;
- review decisions and material versions;
- versioned risk-admission evidence and whether its source is still current.

A missing or malformed execution receipt yields no execution summary. The UI
shows a recorded commit, branch, dirty state, changed-path count and test
observations, with source details. It never treats conversational claims such
as “tests passed” as proof. These are authoritative **recorded receipts**, not
independent reruns or repository attestations. Historical evidence explicitly
retains its source and current/stale state; it cannot authorize new work.

## API, bounds and workbench

Routes live under `/v1/agent-runtime/tasks/:id/clarifications`:

- `GET` accepts optional `relatedTaskId`, `threadId`, and numeric `before` cursor;
- `POST` records a new conversation using `clarificationSend`;
- `POST /actions/reply` records `clarificationReply`;
- `POST /actions/read` records `clarificationRead`.

The API returns exact context and optimistic version hashes. Writes return 201,
identical replay 200, invalid schemas 400, principal denial 403, missing scoped
resources 404 and stale/authority/content conflicts 409. Bound agents gain only
these four routes, no task editing, Submit, host or administrative routes.

The PL/EN modal is available inside existing task review alongside formal
handoff. It includes exact role selection, linked-task selection, typed filtering,
expected response, immutable history, read/reply/correction, material notices and
separate execution receipts. Drafts warn on close and preserve retry IDs.

Each task can own at most 100 conversations, each with at most 500 entries.
History returns 50 entries per page; related-task and conversation catalogs are
bounded at 100, and clarification grant choices at 500. Each summary includes
at most 20 handoffs, 20 review decisions and 20 evidence receipts per task, plus
its latest valid execution references. These limits are not an unlimited archive
browser; original sources remain in their existing workbenches.

## Verification and remaining scope

Synthetic API tests cover all six types, immutable correction, material events,
unchanged Task and summary, exact read/reply, command rejection, redaction,
reference/principal/workspace isolation, linked relations and staleness,
pre-execution grants, one-use/concurrent receipts, restart and revocation.
Contract tests, PL/EN desktop/mobile workbench checks and the additive migration
preservation regression accompany them. No test calls a real model or activates
an agent. External delivery, automatic routing, semantic material-change
inference and independent Git/test attestation remain outside this contract.
