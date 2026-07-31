# Architecture Source Of Truth

This document defines how architecture decisions should be treated in the
repository.

## Purpose

The `docs/architecture/` folder is the canonical record of the application's
architecture knowledge. Its authority depends on project maturity: early
projects use it to grow owner thoughts into assumptions and candidate
architecture, while mature projects use approved entries as implementation
constraints.

It records:

- system boundaries
- ownership of data and state
- module and integration contracts
- deployment shape
- technology choices that are already decided
- architecturally important product decisions that future implementation must
  preserve
- owner notes, questions, and assumptions that still need to be promoted into
  approved architecture before implementation depends on them

Treat approved entries as implementation constraints, not as loose suggestions.
Treat exploratory entries as product and architecture input that must be
clarified, scoped, and verified before coding.

## Default Rule

- Build the application to match the approved architecture.
- Do not silently change architecture during implementation.
- Do not reinterpret unclear architecture in a way that expands scope.
- If implementation exposes a gap or mismatch, stop implementation and escalate
  before changing architectural direction.
- Prefer asking for a decision over shipping an incorrect workaround.

## What Agents May Do Without Re-Approving Architecture

- implement work that fits the documented boundaries
- add clarifying detail that does not change behavior or ownership
- document discovered inconsistencies
- propose follow-up tasks that improve implementation quality inside the
  approved architecture

## What Requires Explicit User Approval First

- changing module boundaries or service responsibilities
- moving source-of-truth ownership for data or state
- replacing an approved integration pattern with another one
- changing deployment topology or runtime shape
- changing a confirmed tech-stack decision that affects architecture
- introducing a new cross-cutting pattern that contradicts existing
  architecture docs

## Mandatory Decision Flow For Mismatches

When implementation does not fit approved architecture:

1. describe the mismatch clearly
2. propose 2 to 3 valid options with tradeoffs
3. wait for explicit user decision

Agents must not self-approve a workaround or architecture rewrite.

If there is a strong argument for a better design, the agent should present the
case in conversation first, including tradeoffs and why the current
architecture may be insufficient. The agent must not self-approve the change.

## Required Architecture Files

At minimum, keep these files aligned:

- `docs/architecture/system-architecture.md`
- `docs/architecture/architecture-evidence-system.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/process-core-workflow-core-architecture.md`
- `docs/architecture/business-ontology-import-strategy.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/company-os-definition-editing-contract.md`
- `docs/architecture/company-os-workflow-definition-command-contract.md`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/architecture/relationship-graph-audit-2026-05-14.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `docs/planning/regression-prevention-plan.md`

Projects may add more architecture docs or ADRs, but these baseline files
should always stay current.

## CompanyCore v1 Approved Direction

The approved v1 direction is:

- API-first product foundation with a minimal owner-only web console for v1
  ClickUp setup
- CompanyCore is the company operating system, not an embedded AI system;
  humans use web UI and AI agents use API/MCP as external clients
- PostgreSQL is the source of truth
- API is the supported access layer for agents, automations, future dashboards,
  and future mobile clients
- owner registration creates a workspace
- business data, service API keys, integration settings, and integration sync
  state are workspace-scoped
- ClickUp is the first native integration adapter
- CompanyCore should evolve toward a ClickUp-shaped operating model:
  `Workspace -> Operating Area -> Operating Folder -> Operating Table ->
  Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`
- first-party business tables should be assigned to an approved operating area;
  `00. Glowny` is the non-removable fallback area for unclassified imports,
  followed by the 12 company departments, while users, memberships, API keys,
  integration settings, provider mappings, and platform metadata remain system
  tables
- provider imports must expose an explicit existing-record policy before
  writing; ClickUp supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`, with deletes limited to
  provider-owned records in the selected scope
- n8n remains optional orchestration, not the required primary ClickUp path
- schema changes should move from `prisma db push` to controlled migrations
- tests and smoke checks must prove workspace scoping and integration sync
  behavior before v1 is considered stable
- full company dashboard and mobile app are v2 scope; mobile should follow the
  web product experience
- before V2 Company City, gamification, or native mobile app work, the product
  must finish the web/backend/MCP foundation described in
  `docs/architecture/web-and-mcp-foundation-before-v2.md`: workspace selection,
  operating-area/resource navigation, relationship/integration clarity, and
  MCP workspace-safe usability
- CompanyCore's long-term product architecture is an AI-first organizational
  operating system where vertical hierarchy and horizontal processes coexist.
  The accepted direction is recorded in
  `docs/architecture/organizational-architecture-bridge.md` and must guide
  future schema, MCP, web, mobile, Paperclip, governance, knowledge, KPI, and
  organizational graph work without bypassing scoped task contracts or existing
  Company OS boundaries.
- CompanyCore's unified organizational operating-system direction is recorded
  in `docs/architecture/unified-organizational-operating-system.md`. Humans
  and AI agents are both organizational workforce members in the target model:
  they can receive work, report progress, belong to departments, exist in a
  hierarchy, hold role/rank-derived permissions, use procedures, access
  resources, escalate issues, and communicate organizationally. This extends
  the current `users`, `agents`, `company_roles`, `business_functions`,
  `tasks`, workflow, approval, event, audit, API, and MCP foundations without
  authorizing a broad schema rewrite.
- CompanyCore should scale through model-level business modules recorded in
  `docs/architecture/companycore-business-module-map.md`. Future views and
  agent tools should derive from those modules and classify work as native
  core, provider-backed, future adapter, or derived view before adding schema,
  API, UI, or MCP surfaces.
- CompanyCore/Roost Process Core is recorded in
  `docs/architecture/process-core-workflow-core-architecture.md`. Pipelines,
  stages, transitions, workflow items, procedures, checklists, evidence logs,
  approval policies, blueprints, linked assets, and Paperclip sync contexts
  are shared system capabilities, not department-local screens. Future agents
  must preserve the boundary that Roost is the source of truth and Paperclip is
  an external supervised execution layer using API/MCP.
- Business ontology imports are governed by
  `docs/architecture/business-ontology-import-strategy.md`. APQC PCF,
  SIPOC, organization-chart CSV, role/ACL mapping, and one-page SOP templates
  are accepted as future input sources for process classification,
  responsibility ownership, workforce hierarchy, agent planning context, and
  validation. They must map into existing CompanyCore processes, roles,
  workforce, capabilities, approvals, knowledge, and audit foundations before
  new tables or autonomous authority are added.
- CompanyCore's global business flow is recorded in
  `docs/architecture/companycore-global-business-flow.md`. Future CRM,
  marketing, product/service delivery, finance, support, feedback, and
  improvement work should derive from the 13-stage value pipeline before
  adding runtime surfaces.
- CompanyCore V1 department views should become department management systems
  as recorded in
  `docs/architecture/department-management-systems-architecture.md`. Each of
  the 13 areas is a scalable management system over shared tables, pipelines,
  tasks, knowledge, resources, metrics, decisions, governance, and AI/MCP
  tools, not a separate database or provider-led app.
- The V1 implementation blueprint for the 12 operating department systems and
  `00 Main` orchestration is recorded in
  `docs/architecture/department-management-systems-v1-blueprint.md`. Future
  department web/backend work should use that document to define each
  department's purpose, subsystems, shared backend reuse, backend gaps, agent
  packet, safe actions, and recommended implementation order before coding.
- CompanyCore now has an Obsidian-first architecture evidence system recorded
  in `docs/architecture/architecture-evidence-system.md`. CSV registries under
  `docs/architecture/nodes/`, `docs/architecture/relations/`,
  `docs/architecture/chains/`, `docs/testing/test-map.csv`, and
  `docs/status/evidence-status.csv` are the source of truth for mapped
  features, routes, components, data models, tests, docs, agents, prompts,
  workflows, events, dependencies, and proof. Future meaningful feature work
  must update those records and run `npm run architecture:graph` before it can
  be treated as officially mapped.

## Lifecycle Procedure Publication

Decision source: [LUC-2192](/LUC/issues/LUC-2192).

`PROC-SH-APPLICATION-LIFECYCLE` version `1.0` reuses the workspace-scoped
Company OS `Procedure`/`ProcedureStep` and workflow-definition versioning
foundation. The authenticated Product Map read route composes that durable
definition with a strict read-only Paperclip execution-state projection.
Paperclip remains authoritative for live execution and evidence; Roost does not
gain a second workflow engine or any Paperclip write authority.

The exact model mapping, 18-stage set, packet schema `2.0`, owner read model,
allowlisted evidence references, fail-closed states, authorization rules,
no-migration decision, rollout, and recovery contract are canonical in
`docs/architecture/lifecycle-procedure-publication-contract.md`.

An arbitrary packet, stored v1 packet promotion, direct Paperclip database
read, reverse tunnel, provider write, read-time definition bootstrap, or
dedicated lifecycle store/route is prohibited.

## Product Map Projection Transport

Decision source: [LUC-2092](/LUC/issues/LUC-2092), the binding
[Projection Transport Boundary](/LUC/issues/LUC-1910#document-transport-boundary),
and the accepted Paperclip projection contract from
[LUC-1832](/LUC/issues/LUC-1832) at commit
`1f8950aa818c2762a1694cae42bf35f9ab7984ca`.

### Selected V1 transport

V1 uses a **one-way outbound server-side publisher**. A supervised publisher on
the canonical local Softwarehouse host reads only the accepted Paperclip route
over loopback:

`GET /api/companies/{companyId}/softwarehouse/portfolio-projection/v1`

It validates the v1 schema, wraps the unchanged packet in a bounded transport
envelope, and sends it over HTTPS to a dedicated Roost backend ingestion route.
Roost authenticates and validates the request, stores the last accepted packet
as a workspace-scoped read projection, and serves it to the authenticated
Product Map through a separate read route. The browser never contacts
Paperclip, localhost, or the ingestion route.

```text
local Paperclip projection route (source authority)
  -> loopback-only projection publisher
  -> outbound HTTPS
  -> Roost projection ingress (write-only capability)
  -> workspace-scoped active/LKG/quarantine store
  -> Roost Product Map read adapter
  -> authenticated owner browser
```

This is an integration projection, not a transfer of authority. Paperclip
remains authoritative for issues, runs, approvals, blockers, budgets, and
completion evidence. Roost remains the owner-facing company and product
surface. The cached packet must never be used to execute Paperclip actions or
to infer authority that the packet does not carry.

### Producer, consumer, and direction

- Source producer: the accepted Paperclip v1 portfolio projection builder and
  company-scoped GET route.
- Transport producer: one supervised local publisher running on the canonical
  host. It is not a browser process, a second Paperclip instance, or a public
  tunnel.
- Transport consumer: one dedicated Roost API ingestion route under the
  existing production HTTPS API domain.
- UI consumer: the authenticated Roost Product Map at
  `/areas?area=00-ogolny&view=product-map`, through a separate Roost read API.
- Direction: local Paperclip -> local publisher -> hosted Roost only. Roost
  does not call, acknowledge into, or mutate Paperclip. The HTTP response is a
  bounded receipt for this delivery only.

### Operational boundary and ownership contract

The publisher is owned by the existing canonical Paperclip local-service
supervisor (`server/src/services/local-service-supervisor.ts`) on the
Softwarehouse host. It is a supervised child service of that runtime,
not a second Paperclip/Roost instance, listener, fallback-port process, or
unmanaged watcher. The implementation must register one named service,
`roost-product-map-publisher`, with the publisher package and exact source
commit recorded in the release packet. Its working directory is the checked-in
publisher package directory in the canonical Softwarehouse workspace; its
runtime identity is the least-privilege local service identity already used by
the canonical supervisor. The supervisor owns start, restart, stop, exit-code,
and bounded stdout/stderr collection; it must not inherit an interactive user
session.

The registered service invokes one supervisor-owned scheduled tick every five
minutes. A per-service
single-run lock is acquired before the Paperclip read; a tick that finds the
lock held is recorded as `coalesced` and exits without queueing or parallel
delivery. Each run uses the existing contract of a three-second connect timeout,
ten-second total timeout, and at most three attempts (initial, +1 second, +2
seconds). Restart is limited to supervisor health recovery and uses bounded
backoff; it never creates a second process or changes a port. Health is the
supervisor-reported process state plus the last successful receipt age and
consecutive failure count. Logs go to the supervisor's bounded, rotated log
sink and contain only the safe signals listed below. Upgrade replaces the
versioned package atomically, records the old package as the rollback target,
and requires a clean stop/start readback. Graceful stop cancels before a new
HTTP attempt, waits for the bounded request timeout, releases the lock, and
returns a non-success result if cancellation is incomplete. DRE owns acceptance
of this boundary; TSA owns the contract.

No implementation may introduce a new local service manager, scheduled-task
family, port, reverse tunnel, or fallback runtime. The exact supervisor service
identifier and package commit are populated only when the implementation lane
exists and are then immutable release-provenance fields.

### Network, bindings, and key lifecycle contract

The only outbound destination is the approved Roost HTTPS origin at port 443
and the exact versioned ingest path. The URL is constructed from a names-only
binding and must contain no userinfo, query, or fragment. The client disables
redirects and ambient proxy inheritance, validates the certificate and
hostname, and rejects loopback, private, link-local, multicast, and reserved
DNS answers on every connection. The loopback Paperclip source client remains a
separate pinned client on strict port 3200; credentials are never forwarded
between the two clients.

The named bindings are `PRODUCT_MAP_PAPERCLIP_SOURCE_URL`,
`PRODUCT_MAP_PAPERCLIP_READ_KEY`, `PRODUCT_MAP_ROOST_INGEST_URL`,
`PRODUCT_MAP_ROOST_INGEST_KEY`, and (only if Security later requires it)
`PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY`. Paperclip owns the source URL and
route-scoped read key in its approved secret store; Roost owns the ingest URL
and hashed ingest-key record in its server secret/config store; Security owns
the decision and storage policy for a separate signing key. Values never enter
source, arguments, logs, artifacts, or issue evidence.

Bootstrap order is: create the workspace-bound hashed Roost key, configure the
names-only binding, prove one authorized delivery, then enable the publisher.
Rotation permits exactly two keys only during the bounded rotation window,
proves one successful delivery with the new key, and revokes the old key before
closing the window. Compromise handling disables the publisher first and
revokes only the affected key; history and the active pointer remain intact.
TLS plus one dedicated high-entropy hashed bearer is sufficient for V1 only
after this contract and all preceding security controls pass. A separate
raw-body signature is mandatory if TLS terminates outside trusted Roost,
pinning fails, a broad credential is reused, or authenticity must survive an
untrusted proxy. The bearer is never reused as a signing key. Security owns
the final decision; DRE verifies network reachability and allowlist ownership.

### Projection-state lifecycle and recovery contract

Roost stores projection state in durable workspace-partitioned tables through a
versioned migration: one active pointer, immutable accepted/LKG snapshots,
immutable quarantine/conflict records, and idempotency receipts keyed by
`(workspaceId, companyId, schemaVersion, sourceSnapshotId, packetDigest)`.
Every row carries source `observedAt`, receipt time, transport/schema versions,
and a redacted audit correlation. `packetDigest` is SHA-256 over canonical
semantic packet bytes only; it excludes the delivery-envelope fields
`observedAt`, `publishedAt`, and `idempotencyKey`. A later valid observation of
the same semantic `sourceSnapshotId` is a re-observation, even when it has a
fresh `observedAt` or `publishedAt`; an exact retry is idempotent. A conflict
exists only when a different digest has the same `(companyId, schemaVersion,
sourceSnapshotId, observedAt)`. Older observations are rejected.
`observedAt` and `publishedAt` more than 120 seconds in the future are rejected;
`publishedAt` must remain inside the ten-minute replay window. Equal timestamps
are ordered by accepted receipt sequence, never by wall-clock reversal.

Accepted snapshots and receipts are retained for 30 days; quarantine and
conflict records for 90 days; audit metadata for one year; the active/LKG
pointer is retained while its snapshot exists. Cleanup runs daily under the
existing application scheduler, in bounded batches, and emits a cleanup-failed
metric/alert without deleting audit records. Backup includes the projection
tables and migration version; restore replays the active pointer only after
integrity and workspace-boundary checks. Rollback never deletes history or
moves the active pointer backward. Reappearance of a superseded snapshot is
quarantined as `projection_rollback` and can be reset only by an explicit,
audited operator action. Lower schema versions are rejected after a higher
version is accepted unless an approved migration/reset explicitly authorizes
them. DB Engineering owns the migration and restore proof; DRE verifies
cleanup and recovery signals.

### Multi-artifact release provenance packet

Each candidate has one immutable provenance packet containing: the accepted
Paperclip source commit and route/schema contract; the exact publisher package
commit, package digest, supervisor service definition, and rollback package;
the exact Roost candidate SHA and migration list; transport/schema versions;
the names-only binding inventory; and the previous known-good Roost
commit/image plus rollback procedure. The packet records owner, target branch,
candidate range, and acceptance evidence without credential values.

No gate may infer publisher provenance from a clean Roost SHA. G01/G06/G08
must read back the same packet identifier and all artifact digests. A mismatch
between source, publisher, Roost candidate, schema/transport version, or
rollback artifact is an immediate `NO-GO` and stops promotion.

### Trust and authorization boundaries

- The Paperclip leg stays on loopback and must use an owner-company-bound,
  route-specific read credential. A board/session credential or a credential
  with general Paperclip mutation authority is not acceptable.
- The Roost leg uses the existing workspace-scoped hashed service-key
  mechanism with a new exact capability, `product-map:projection:ingest`.
  Empty, wildcard, `companycore:*`, and legacy broad compatibility scopes are
  forbidden for this publisher.
- The ingestion route is server-to-server only, is excluded from browser CORS,
  and rejects owner bearer sessions and keys without the exact ingest
  capability.
- The owner-facing read route uses a separate
  `product-map:projection:read` capability or owner-session permission and can
  never expose the ingest key or receipt metadata needed only by operators.
- The Roost ingress route is `POST /v1/product-map/projection/ingest`; the
  separate owner/read route is `GET /v1/product-map/projection`. Both set
  `Cache-Control: private, no-store` and vary on authentication. The ingress
  is mounted before ordinary JSON parsing and browser CORS handling, while the
  read route stays within the existing protected API router.
- A Roost workspace must carry a server-owned Paperclip company binding before
  it can accept an ingress envelope. The authenticated service key resolves
  the workspace; the server compares its binding with the envelope company ID
  and fails closed when it is missing or mismatched. The client cannot select
  a workspace or bind a company.
- Both company ID and Roost workspace ID are derived from authenticated server
  context. Client-supplied scope cannot select or override another company or
  workspace.
- Credentials live only in the approved secret stores and runtime bindings.
  They must not appear in source, frontend bundles, logs, issues, artifacts,
  screenshots, or command arguments.

If Paperclip cannot issue the required route-specific, owner-company-bound
read credential, implementation is blocked for a security decision. It must
not reuse an agent run token, board session, or broad control-plane key as a
shortcut. The named Paperclip projection route must reject board, session,
agent/run, and broad-control-plane credentials before it invokes a projection
source loader or resolves any projection data.

### Packet and envelope contract

The transport carries exactly one accepted v1 projection packet. It cannot
add raw prompts, transcripts, tool calls, secret metadata, arbitrary issue or
run records, or other Paperclip domain fields.

The envelope contains only:

- `transportVersion = "product-map-projection-transport/v1"`, which is the
  delivery-protocol version and is not the projection schema version;
- `schemaVersion = "1.0"`, which must exactly equal `packet.schemaVersion`.
  The legacy envelope literal `"product-map/v1"` is rejected;
- `companyId` and the server-resolved target workspace identity;
- `sourceSnapshotId` and projection `observedAt`;
- `publishedAt` generated by the publisher;
- `packetDigest` as SHA-256 over canonical semantic `packet` bytes, excluding
  envelope delivery metadata such as `observedAt`, `publishedAt`, and
  `idempotencyKey`;
- `idempotencyKey` derived from
  `companyId + schemaVersion + sourceSnapshotId + packetDigest`;
- the validated `packet`.

Limits and timing:

- maximum request body: `256 KiB`; larger packets are rejected before
  transmission and recorded as a safe local failure without truncation;
- connect timeout: `3 seconds`; total request timeout: `10 seconds`;
- at most three delivery attempts for the same idempotency key: the initial
  attempt, then retries after `1 second` and `2 seconds`; retries never create
  a new snapshot identity;
- scheduled publication target: every `5 minutes`; overlapping ticks coalesce
  into one run and V1 adds no event-triggered delivery path;
- transport replay window: `10 minutes` from `publishedAt`;
- freshness TTL: `15 minutes` from the packet's source `observedAt`, never from
  Roost receipt time;
- last-known-good display window: up to `24 hours`, always visibly marked
  `stale`; after that the Product Map is `unavailable`, not silently live.

HTTPS authenticates and protects the request in transit. Roost recomputes the
digest before acceptance and records it with the source snapshot. Security
review decides whether the service-key boundary plus TLS is sufficient or a
separate raw-body signature is required; implementation must not invent or
reuse a signing secret before that review.

### Ingress admission controls

Before authentication, deserialization, schema validation, or projection-state
access, the dedicated ingestion route must reject every request with a
`Content-Encoding` value and must cap the raw received body at `256 KiB`.
Oversized data is rejected without buffering, decompression, or JSON parsing.
After the exact ingest capability resolves its workspace, admission permits only
one in-flight ingest per workspace; a concurrent request is denied immediately
and is never queued. The route rate-limits by `(ingest key, workspace)` to six
requests per minute with a burst of three.

All failed ingress admission, authentication, authorization, validation,
rate-limit, and concurrency responses use one generic denial body that exposes
no tenant, workspace, projection, receipt, or policy facts. Every ingress and
read response sets `Cache-Control: private, no-store` and `Vary: Authorization`;
the route is explicitly bypassed by shared caches and CDNs. These controls are
implementation prerequisites, not optional hardening.

### Acceptance, idempotency, replay, and conflict handling

- The first valid packet for
  `(companyId, schemaVersion, sourceSnapshotId, packetDigest)` is accepted.
- An exact retry returns the same safe receipt and performs no additional
  write, event, or pointer change.
- A request outside the replay window, with an unknown schema, invalid digest,
  wrong company/workspace, missing exact capability, or oversized body is
  rejected before projection state changes.
- A different digest is a conflict only for the same
  `(companyId, schemaVersion, sourceSnapshotId, observedAt)`. A later valid
  observation of the same semantic snapshot identity is a re-observation, not
  a conflict. A conflicting packet is quarantined, the previous active packet
  remains the last-known-good view, and the UI shows conflict/stale state. No
  newest-wins rule is allowed.
- A packet whose own `stale`, `conflict`, `superseded`, missing-evidence, SHA
  mismatch, or `NO-GO` fields are stricter than current Roost presentation
  preserves the stricter state. Transport success never promotes readiness.
- An older observed snapshot is rejected as `projection_out_of_order`; only
  safe audit metadata is retained, and the active pointer never moves
  backward.

The safe receipt contains only acceptance status, `sourceSnapshotId`,
`packetDigest`, and `receivedAt`. It exposes no Roost company data and causes
no callback or write to Paperclip. Because the design still introduces a Roost
ingress/write and receipt, implementation requires the independent Security
and Ops authorizations linked from [LUC-2092](/LUC/issues/LUC-2092).

Focused regression assertions for the implementation and independent review:

| Case | Required result |
| --- | --- |
| Same semantic snapshot with a fresh `observedAt` and/or `publishedAt` | accepted as a re-observation; it must not create a conflict solely from freshness metadata |
| Same `(companyId, schemaVersion, sourceSnapshotId, observedAt)` with a different semantic-packet digest | quarantined as a conflict; active/LKG pointer is unchanged |
| Exact envelope retry | same safe receipt with no additional write, event, or pointer change |
| Any `Content-Encoding`, raw body over `256 KiB`, concurrent workspace ingest, or key/workspace rate breach | generic denial before parsing or projection access; no queue, tenant, or projection fact is disclosed |
| Board/session/agent/run/broad Paperclip credential on the named source route | generic denial before a source loader runs |

### Failure, audit, monitoring, and recovery

Publisher failures do not alter Paperclip or the current Roost active packet.
Roost continues to serve the last accepted packet only within the stated LKG
window and labels it from source `observedAt`. The UI distinguishes loading,
empty, unavailable, stale, conflict, quarantined, and current states.

Safe audit signals are:

- publisher attempt/success/failure counts;
- safe error code, latency, packet byte size, schema version, source snapshot
  ID, digest prefix, and retry count;
- Roost accepted/duplicate/rejected/quarantined/conflict counts;
- active packet age from source `observedAt`;
- last successful receipt time and consecutive failure count.

Logs and events must not include request bodies, raw keys, auth headers, full
digests when a short correlation prefix is sufficient, or private packet
content. Monitoring alerts on repeated delivery failure, packet age beyond
TTL, conflict/quarantine, authorization denial spikes, or an unsupported
schema. DRE owns the runtime alert and escalation path; Security owns auth and
disclosure incidents.

The rollback/no-change path is to disable the publisher, revoke only the
dedicated ingest key, and leave the current versioned Product Map in its
explicit static or stale/LKG state. Rollback must not delete projection
history, change Paperclip, open a reverse tunnel, or relabel a deploy-time
snapshot as live. A repaired publisher must submit a newly observed valid
snapshot and pass the same idempotent acceptance path before current status is
restored.

### Rejected options

1. **Generated deploy-time snapshot.** This has the smallest network surface,
   but couples freshness to a Roost build/deploy, cannot satisfy the live
   projection journey, and is easy to misrepresent as current. It remains
   acceptable only as an explicitly labeled static artifact under a separate
   release decision; it is not the V1 live transport.
2. **Hosted Roost pull through a reverse tunnel or public allowlisted
   Paperclip endpoint.** This would make a local-only control-plane surface
   reachable from production, add tunnel availability and credential scope,
   and increase the disclosure blast radius. It is rejected for V1.
3. **Shared database, direct PostgreSQL access, browser fetch, or generic file
   share.** These bypass the supported API boundary, leak authority or
   credentials, or remove provenance and fail-closed semantics. They are
   prohibited, not fallback options.

### Downstream implementation and independent review

Implementation is a separate vertical slice owned through the Technology
delivery route. It must add the two narrow Roost capabilities/routes, durable
active/LKG/quarantine storage, the supervised local publisher, focused schema
and denial tests, and Product Map state handling. It must not expand into a
generic event bus, a second integration framework, or Paperclip write-back.

Security review must answer:

1. Can Paperclip issue a route-specific owner-company read credential, and is
   the Roost exact-capability service key sufficiently least privilege?
2. Are TLS, digest verification, the ten-minute replay window, and the
   idempotency/conflict rules sufficient, or is a separate body signature
   required?
3. Do schema whitelisting, the 256 KiB limit, denial ordering, CORS exclusion,
   and log redaction prevent control-plane and cross-workspace disclosure?
4. Are key bootstrap, rotation, revocation, and incident boundaries explicit
   without exposing values?

Ops review must answer:

1. Which existing supervised local runtime should own the publisher without
   creating a second Paperclip/Roost instance or unmanaged watcher?
2. Are the 5-minute schedule, 3/10-second timeouts, bounded retry, 15-minute
   TTL, and 24-hour LKG window operable and observable?
3. Can deployment, key rotation, publisher disablement, and rollback preserve
   the current Product Map and PostgreSQL safely?
4. Which health, age, failure, quarantine, conflict, and alert evidence is
   required before [LUC-1910](/LUC/issues/LUC-1910) may leave `NO-GO`?

## Implementation Contract

Before architecture-impacting work is marked complete, confirm:

- the task still fits the approved architecture
- any deviation was explicitly approved
- the architecture docs and implementation remain synchronized
- no workaround path was introduced to bypass architecture constraints
- existing mechanisms were reused before proposing new structures
