# Current implementation

This is the sole active delivery handoff: current facts, authorized outcome
and required end-to-end evidence.

## Delivery objective

Finish the reusable Roost runtime so an accepted task can travel through the
complete path below without manual technical coordination:

```text
Roost task
  -> outbound-connected Windows Local Worker
  -> managed Hermes
  -> explicitly selected provider/model/reasoning effort
  -> bounded work in the canonical application checkout
  -> evidence, review and result returned to Roost
  -> authorized release and production verification when the task requires it
```

The first proof uses the configured pilot application. Successful proof must be
reusable for later applications; installation-specific paths, domains and
credentials remain private configuration rather than repository defaults.

## Execution ownership

One implementation owner completes the authorized gate across components,
integration and native proof. Internal steps/commits are not handoff boundaries.
Continuing later requires new gate authority.

Use `roost-runtime-delivery`, `AGENTS.md` and `npm run codex:check`.
The owner integrates and verifies delegated work; these development controls
alone do not prove a runtime gate.

Ordinary implementation discoveries are resolved autonomously from, in order:

1. current accepted Decisions and `product/requirements.md`;
2. `product/product.md` and its stable product chapters;
3. current architecture and operations contracts relevant to the component;
4. inspected code, migrations, tests and runtime evidence.

A contradiction is recorded and resolved at the highest applicable source. Old
"next atom" statements in versioned technical evidence never define current
work.

## Current verified state

Roost has PostgreSQL/Prisma, Express, a React owner console, workspace API/MCP
boundaries, provider/task/context/review and a Windows Worker with Hermes.

**Gate 1 is met at production/runtime evidence level (2026-09-27).** Deployed
API build `18bd5c64`, execution `9fc132c6-af99-4d98-a2e2-27de7d576879`
and signed native closure prove one supervised agent round trip. Forced
production cancellation/lease-loss, coding/release and Ollama are not covered.

**Gate 2 is met at native coding/review evidence level (2026-09-27).** Execution
`b95cf777-fe24-46a4-a88e-4bd0a9314bef` produced local commit `774e858a`;
independent review `5c27d054-7cc3-45a1-9ef6-d43760316e69` and Decision
`c349899b-72c3-4260-9b77-de733f42866c` accepted its exact material. No
push/deploy or general recovery of arbitrary after-spawn failures is claimed.
Exact identities, checks, limits and historical failure evidence are in the
[traceability matrix](architecture/traceability-matrix.md).
## End-to-end delivery gates

These gates are outcome-sized delivery boundaries, not internal technical
atoms. Complete the currently authorized gate without requesting permission for
ordinary reversible technical work inside it.

## Gate authorization boundary

One user task authorizes one named gate by default. If the task does not name a
gate, use only the earliest unmet gate. The implementation owner may decompose,
delegate, repair and commit within that gate when authorized, but must not begin
the next gate in the same task unless the user explicitly authorized multiple
gates.

After proving the current gate, update this document, run the required checks,
leave recoverable state, report the exact evidence and stop. Remaining account
usage, available context or elapsed time is not authority to continue. The
owner reviews usage and starts or continues work with a new instruction for the
next gate. Push and deployment remain governed by their gate and explicit user
authority.

### Gate 1 — real agent round trip

The Windows Worker claims an accepted low-risk task; attested Hermes executes
with approved model policy and returns signed status/evidence. Cancellation and
lease loss stop safely. Gate 1 included migration, signing, credential handoff
and HTTPS admission, rather than treating those pieces as separate outcomes.

### Gate 2 — governed coding delivery

The agent works in the canonical checkout from pinned task/procedure context,
under one-writer admission, with checkpoints, tests and an exact reviewable
commit. An independent role accepts or returns it with evidence. Supporting
roles, decisions and resource controls are proven within this outcome.

### Gate 3 — governed release

**Met at native/production evidence level (2026-10-02):** Exact Git/PR/merge,
interrupted deployment, controlled failure, healthy rollback and owned cleanup
passed. [Evidence](operations/governed-release.md).

The exact accepted commit follows Git, deployment, observed health and
certification or rollback, with audit, backup/restore and owned cleanup.

### Gate 4 — pilot application proof

**Production verified:** [evidence](operations/application-release.md).
Managed PWA repair `7512bc3` is released with 1238s healthy observation,
unchanged data/protected services and independent postrelease verification.
The failed rollback remains unqualified; exact adopted rollback image and
verified backup/restore are retained. Worker stopped; resources cleaned.
Gate 5 received a separate owner assignment; no later phase is authorized.

The configured pilot's low-risk defect passed managed discovery, repair, review,
release and production verification under its application-specific safety rules.

### Gate 5 — reusable company operation

**Met at native/deployed-console evidence level (2026-10-04).** The second
configured application reused shared roles/procedures and its own audited,
owner-accepted baseline and separate first-write consent. Worker/Hermes produced
clean local `3cf9645e` with six native tests; independent `7f78d3c2` accepted the
exact commit in `674c5607`. Fixed recovery preserved earlier refusals/spent
attempts. Authenticated portfolio, evidence, actual Decision history and approved
continuation are verified on Roost `d7a5e0de`. Worker stopped; no application
push/deploy. Whole-product readiness and later capabilities remain unproven.
See [evidence and operating limits](operations/internal-application-operation.md).

This proves reusable internal application development only. Each applicable
requirement retains its own evidence and applicability in the traceability
matrix. Sales, customer service and mobile remain later phases.

### Second-application release gate — ship the accepted bounded repair

**Release incomplete.** Preserve `3cf9645e` and historical rejections.
Application unavailable; writes/cadences held, schema/data parity verified.
Managed `eccd0cfb`/`d73e6234` is signed-closed; earlier C78 proofs remain
historical. Prior clocks, refusals and reviews remain in the matrix.
Roost `590835b8` is deployed; health/version and additive migrations pass.
Revoked empty grants can be replaced; any prior intent still consumes admission.
Roost backup `9642ddc7` passes restore and exact server restart. Static final
verifier `ee0ebab6` has historical Ready `77dad092`; its new scope is registered.
Grant `f3069781` was normally revoked (`1208dca4`), with zero operations.
Backup `60ce77d9` passes restore and read-only recovery; no dump/restore replay.
Build `aa15e52e` passes 25 native Jobs and owned cleanup, producing different
image `36d1746f`. Interrupted compatibility `57e803fb` resumed without build or
chunk replay: 49 Jobs, migration, full parity and owned cleanup pass. Original
29 clocks remain unchanged. Import `e803e592` passes 20 closed native Jobs:
image `36d1746f` and stopped anchor `2710b900` are verified; protected resources
remain unchanged. Signed owner evidence `d1108cf6` is verified in Roost.
Package `bd41ee9c` binds manifest `ddb16c41`/scope `571169cb`.
Host epoch 9 renewal and ordinary role renewals pass. Audit `97e80557`
reports three PASS findings, signed-closed/restored. Full risk `b17dcefe`
binds audit material `f381ac49` and source material `ff36e4f0`.
Source `bf913802` independently approves exact `d73e6234` (`4912e26a`),
signed-closed/restored; actual input is 114279/131072 bytes.
Scope review `9c0dbb1d` approves (`56074819`) with three exact artifact/PASS
rows, signed-closed/restored; actual input is 131027/131072 bytes.
Historical approvals remain in the matrix.
Renewal `651f50be` passes 23 read-only Jobs; staged measurements pass 22 tests.
Owner `1e629f08` admits grant `bdc1387e`; renewal and signed closures pass.
Worker11 merges exact `d73e6234`; configuration is absent/frozen.
Normal FAILED closure `9154a122` preserves all five operations. Fresh read
`7441bb91` passes 27 closed native Jobs. Continuation, deployment and final
acceptance remain pending.
Prior clocks and expired policies remain historical; see the evidence matrix.

Reuse the existing application, repository and Compose installation; create no
additional application or environment. Bind its own services, migrations,
cadences, health/parity, capacity, encrypted backup/verified restore, retained
compatible images and observation policy. Extend shared release capabilities
only where this actual target requires it. Do not copy pilot assumptions.

Before any application push/PR/merge/deploy, present a reviewable exact-commit
package and obtain a separate owner release grant. Include any bounded smoke
writes/model calls, compatible rollback and protected resources. Application
edits are made through Worker/Hermes; root integrates Roost changes. Reconcile
uncertain effects before retry. Prove deployed SHA, truthful empty/populated
activity, data safety and independent postrelease acceptance in Roost. Run
component checks and `codex:check`, record evidence and stop. Soar completion
requires a later assignment; no whole-product or commercial claim is authorized.

## What is not a blocker

Missing components, failed checks, migrations, architecture corrections and
larger coordinated changes are implementation work. Resolve reversible choices,
repair, verify and continue within the authorized gate.

## True owner dependencies

Pause for owner input only when progress requires one of these:

1. a login, 2FA response or secret unavailable to the runtime;
2. an unapproved irreversible operation against real data or an external
   account;
3. a genuine contradiction in accepted business/product intent that changes
   the requested outcome rather than its implementation;
4. an unavailable external service for which no safe technical alternative
   exists.

Before pausing, complete all independent preparation, retain recoverable state
and ask one concrete question describing the exact blocked action and effect.

## Completion evidence

For every gate, record the exact task/run identities, relevant commits,
configuration versions, model/backend request and observation, checks, review,
deployment identity, health comparison, cleanup and residual limitations.
Source-only and mocked tests are supporting evidence; they never substitute for
the native or production proof required by the gate.

Update this document in place as gates advance. Do not create a new versioned
plan or a new "next atom" document. Git history is the implementation history.

## Planning and execution handoff

The planning conversation prepares gates and reviews evidence. Each execution
conversation implements one authorized gate. Owner-requested planning of later
gates does not authorize their execution or expand an active assignment.

Keep product decisions in the existing product chapters and requirement IDs,
delivery scope and acceptance here, evidence in the traceability matrix and
technical records, and unresolved business choices in `planning/open-decisions.md`.
Conversation history is supporting context, never the required handoff source.

Batch new requirements for the next handoff; interrupt active work only for
STOP, safety or material scope correction. Preserve verified-state sections.
Before assigning a gate, reconcile its prerequisites against the previous
result and current repository. Planning alone never advances runtime status.

### Assignment contents

Prepare one outcome-sized assignment from the selected gate below. It contains:

- the gate, expected user-visible result, prerequisite evidence and relevant
  requirement IDs;
- the inspected existing implementation to reuse, missing behavior to build,
  installation configuration to apply and the proof needed for each;
- the scoped API/MCP, web and Worker surfaces, allowed local/VPS operations,
  credential availability, resource constraints and required owner approvals;
- observable success and failure cases, evidence locations and completion
  checks;
- one implementation owner, permitted bounded delegation, commit/push/deploy
  authority, current resource/usage budget and a mandatory stop after the gate.

Inspect code/configuration for the selected gate. Reuse adequate existing
dependencies; justify additions by missing behavior and maintenance/resource cost.

Past gate briefs are in Git history; evidence remains above and in the matrix.

## Later product phases

These are planning horizons, not additional authorized execution gates. Prepare
concrete gates here when the preceding outcome is proven and the phase's
business choices are available. Do not silently add them to Gate 5.

| Horizon | Result and entry condition | Existing requirements / decisions |
| --- | --- | --- |
| Application completion | After this release, take the selected app from audited baseline to product readiness; repeat with app-specific proof. | RF-APP-001–014; private app baseline |
| Context and owner access | Before customer work, filter default Worker/API/MCP context without losing audit history; diagnose repeat login versus fresh owner approval. | RF-CTX-027, RF-SEC-013, RF-GOV-014 |
| Owner-console usability | Inventory routes/configuration, repair whole journeys in gates and repeat console regression as features grow. | RF-UX-010, RF-REL-012 |
| Website method and public entry | Verify site findings, approve a checklist, prove supervised use, then redesign the public page for its approved audience and truthful claims. | RF-CTX-028, RF-UX-011; OPEN-UX-001 |
| Environment stewardship | Before scaling, prove read-only inventory and one supervised host/VPS update; later mandates need separate proof. | RF-HOST-021, RF-RES-001–008, RF-SEC-007 |
| Product sales | Prove offer, payments/access, invoices/accounting, support and controlled launch for a ready product. | RF-APP-015, RF-BIZ, RF-SUP; OPEN-FIN-001 |
| Customer-service capability | After sale readiness, configure website/service scoping, delivery, access, acceptance and settlement. | RF-SVC, RF-SCOPE-004/006; OPEN-SVC-001–004 |
| Customer acquisition | After proving delivery capacity and commercial rules, operate prospect qualification, offers and paid delivery. | RF-SVC, RF-SUP, RF-BIZ |
| Mobile application | After reliable web operation, use the same backend and authority; define platform and initial workflows before execution. | RF-SCOPE-001 |

New company needs extend the owning product chapter with status and dependencies.
Report progress against the authorized gate, not a percentage of the evolving
company vision.
