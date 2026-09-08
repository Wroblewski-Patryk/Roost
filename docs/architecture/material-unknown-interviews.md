# Material unknown interviews (RF-CTX-016)

A material unknown is an explicitly declared missing fact or human decision that
changes a named portion of a task. It is not inferred by a model. The native
workflow records the declaration, completed fact gathering and source revisions
before publishing a short thematic block of one to three questions.

## Scope and authority

Each immutable case revision binds a workspace, one task and its uniquely linked
application, stable unknown key, decision class, exact human recipient, checked
company-record references and explicit task dependencies. Related tasks require
an existing active canonical dependency in the same application and workspace.
The declaration states execution impact, blocked work, context, alternatives,
recommendation, consequences, scope and effect of deferral. Checked-source
findings and the remaining human decision are required. This records accountable
research already performed; it does not independently prove that every possible
source was searched or semantically detect repeated questions under different keys.

The supported classes are product direction, money, legal, critical risk, mandate
change and task scope. This slice uses a current workspace owner as the exact
recipient for each class. It does not infer delegation from a free-text job title
or create a company hierarchy or new mandate. Current members may prepare a block.
Credential-bound current task agents additionally need an exact single-use
`interview_prepare` capability with current native risk/procedure admission.
The grant binds the task, application, credential, recipient, decision class and
unknown key. Agent publication can block only that exact task; broader linked
dependencies require explicit human preparation. Existing task roles must already be valid; pre-Ready work without an
accepted role contract remains a human preparation path. No agent answers or
accepts a human decision, even with preparation authority.

## Durable transitions

Publication creates one attention event. Silence leaves the case pending; there
is no timeout decision or recurring notification job. A human response creates
an append-only answer and a **proposed** record in the existing Decision register.
A separate explicit acceptance by the current named owner accepts that proposal.
Generic Decision PATCH/DELETE cannot change these governed records. Deferral
records a reason, removes the immediate dashboard action and keeps dependent
execution blocked. An explicit later answer reopens the decision path.
[Typed budget/infrastructure deferral](decision-supersession-impact.md) additionally
binds a specific resource/configuration change, owner signal or owner-selected
deadline. Verified delivery returns the current defer entry to pending with one
attention item; it never supplies an answer or approval.

Corrections publish another immutable case revision linked to its predecessor.
Only the current owner may revise a case; a revision requires a reason and fresh
source proof. Prior blocks, answers and proposals remain in history. Source
changes require a revised block, not silent replacement of evidence. Resolved cases also invalidate previously issued dependent-operation grants;
resolution never revives them. A stable key
has only one current revision in an application. Request keys bind input and actor;
changed retries and stale versions conflict. A serializable source fence and SQL
history, grant-use and transition guards enforce the same boundaries across
concurrent requests and process restarts.

Pending, proposed and deferred cases deny Submit/Ready and native execution only
for their explicitly listed dependent tasks. Independent fact gathering remains
available. Opening a case fences active dependent executions. Resolution does not
restore an old Ready pin: an interview ledger version is pinned by a fresh Submit.
No business status, assignment, mandate or external system is changed automatically.

## API and console

Under `/v1/agent-runtime/tasks/:id`:

- GET `/interviews`: current context, bounded source catalog, case revisions,
  answers, proposal references, current eligibility and task impact.
- POST `/interviews`: versioned publication or explicit linked correction.
- POST `/interviews/actions/respond`: answer, defer or separately accept.

`GET /v1/decisions/interview-queue` projects the current material-question queue.
The Decisions workbench, task review/Ready access and dashboard attention link to
one compact thematic block at a time. PL/EN forms show evidence, recommendation,
consequences, dependencies, responses and deferral. Text is untrusted context and
is never fetched as instructions or executed. RF-SEC-004 checks native input,
source snapshots, proposals, projections and replay before use.

## Migration and evidence boundary

`20260908150000_material_unknown_interviews` adds immutable case/entry records,
a nullable grant-use link and guarded functions. It preserves existing business
records, secrets, credentials, applied migration history and persistent volumes.
No seeding, reset, automatic agent activation or model calls are introduced.
Take and verify a fresh private backup before release. Retain the additive history
and prefer a forward fix; never down-migrate or reset production to roll back.

Focused API tests are in `src/tests/api.test.ts`; responsive UI checks are in
`scripts/task-interview-ui.test.mjs`. The existing migration preservation fixture
also applies this migration. RF-CTX-016 remains partial at company scope: semantic
unknown detection, model-generated interviews, delegated hierarchy routing,
external notifications and autonomous execution are separate work.
