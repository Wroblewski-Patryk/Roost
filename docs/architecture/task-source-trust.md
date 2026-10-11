# Task source trust for agent reads

G8's `company_source_reviews` remain the approval record for CompanyRecord.
G9 adds `task_source_reviews` for the currently implemented Procedure, Policy,
Decision, EvidenceRecord, Note, KnowledgeItem, application evidence,
architecture component, interface, capability and Google Drive content snapshot
families. Neither ordinary source status nor an API-key capability is approval.

An authenticated workspace owner reviews one source for one Task, exact current
revision and content digest through `POST /v1/agent-runtime/source-reviews`.
The append-only receipt records action, provenance, classification, environment,
verification method/reference, inclusion reason, reviewer and validity window.
Latest withdrawal, expiry, changed body/revision, archived or out-of-scope source,
or a source classified as synthetic, bootstrap, certification or unverified makes
that source unavailable to an ordinary agent. Review creation does not alter the
underlying source. No migration approves historical records.

A bound agent credential can read only sources currently eligible for its
authenticated task assignment through
`GET /v1/agent-runtime/tasks/:id/sources` and its exact-source variant. The
server checks workspace, task, assignment, applicable application/project,
review, digest and validity; a caller-provided Task ID is not authority. The
global MCP bridge advertises and invokes the same task-bound reads. Both
transports return the approved field projection and review provenance, rather
than entire mutable database rows. CompanyRecord uses its existing task-bound
read contract. The Worker execution context filters these sources by the same
reviews. Its final provider input admits only the source fields defined by the
existing execution contract; additional Note, KnowledgeItem and Drive sources
remain available through task-bound reads and do not silently become new
provider-input fields. The Worker rechecks packet-source provenance and expiry
at admission.

Unbound workspace API keys lack an authenticated Task and therefore cannot use
general source, search or source-derived commands, including mutation commands
that previously echoed source bodies in their responses. Their remaining
connection and MCP-manifest reads are explicitly allowlisted. Bound agent keys
retain the server-checked task review, handoff, clarification and release
commands needed for their assigned workflow. This does not grant general
source-write authority to agents. Human owner routes and operations retain
their existing access and response shapes.

Two established delegated workflows use narrower action grants. A Finding
verifier or triager can read only the current finding version covered by an
active, exact task/version/credential grant. Its referenced CompanyRecords,
application evidence and procedures must separately pass the task-source
reviews; Finding references to run or audit records have no G9 source admission
and remain unavailable to agents. Task, project and application references must
match the grant's exact Task and its project/application. The agent receives a current-finding view,
without historical versions, occurrence bodies, merge candidates or catalogs.
Only non-passive grant-backed Finding actions are admitted; agent creation,
revision, occurrence and passive deduplication routes remain closed. A pending
Decision proposal is admitted to a delegated agent only after the owner issues
current `decision_supersede` grants for **every** impacted task, tied to its
immutable proposal and exact current preview. The agent sees the proposal's
specified decision fields and action inputs, not the workspace governance
catalog, impact details or history. Acceptance still requires the full grant
set and the existing authority and admission checks. These grants admit a
specific action candidate; they do not make pending Decisions generally
available as task sources or in Worker packets.

The owner-only `GET /v1/agent-runtime/source-audit/:type/:sourceId` returns a
surviving current source, paginated review receipts and prospective source-body
history. Database triggers record prior and new bodies for covered mutable
families from the G9 migration onward; a Drive refresh that changes only scan
telemetry does not create a new body-history version or invalidate Ready.
Previously overwritten bodies cannot be reconstructed. Ready watches invalidate
on material edits and review changes for these families, including Note,
KnowledgeItem and Drive source content. Historical and uncertain material is
available only through the explicit owner audit path, with provenance/status.

The delivery evidence and deployed commit for this contract are recorded in
`docs/implementation.md`. Native tests use a disposable PostgreSQL database and
synthetic records; they do not imply that a production source was adopted.
