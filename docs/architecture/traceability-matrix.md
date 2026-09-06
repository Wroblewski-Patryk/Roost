# Foundation requirements traceability

Version: ROOST-INTERVIEW-FOUNDATION-V2. Audit baseline: `36be71bcef2dced598f41f6377724741f4eb2107`.
Decision authority and cutoff: [frozen requirements registry](../product/interview-foundation-v2.md).
One row per stable requirement; repeated interview approvals share acceptance clauses.
This matrix is product verification truth, not a task board or execution history.

## Reading the evidence

The required status vocabulary is: **działa** (works within the stated scope),
**częściowo działa** (partial), **brak** (missing), **wymaga konfiguracji**
(needs configuration), **wymaga testu** (needs verification).
Code existence never proves autonomous operation. “Works” on a governance
prohibition means the documented current boundary, not a new automated enforcement
claim. Deferred/superseded rows are excluded from activation blockers and work
selection; “missing” there is intentional, not permission to implement them.

Evidence links identify inspected code/config and available tests. Unless a
specific proof is stated below, tests were **not rerun for that requirement** and
production configuration/behavior are **unverified**. In particular there was
no Soar audit, exchange permission check, live test, agent activation or
readiness certification. Generic record CRUD is only a partial mechanism.

Historical proof: packet gate commit `90adf37e`, pre-spawn recovery
`982d4809`, observer/provisioning `271beb36`, Windows login state fix
`f0c7faae`, portfolio exclusion `36be71bc`.
Earlier observer delivery reported real start/stop/singleton and reconnect
checks, API 15/15 and production health on f0c7faae. This is historical evidence,
**not current V2 production verification**. Real Windows relogin/reboot and
forced-process-crash restart remain unproven. Git history is the commit mapping
for later changes to these same canonical files.

## Atomic P0 selection

V2 local verification (2026-09-06): 132/132 non-observer host checks passed,
including real launcher dispatch to a synthetic Codex child and rejection before
execution subprocesses. Observer checks passed 4/4 after stopping the legitimate
observer that occupied its fixed port; its initial two port-conflict failures
were environmental, not hidden. Observer was then restored in observe mode with
`runtime_disabled`. `npm run validate` passed (278 manifest routes, 44 route files,
TypeScript and build); registry/matrix IDs, supersession anchors and file links
passed for all 162 requirements. Default documentation context is 37,128 bytes.
API/database suites were not rerun: no API, schema or persistence behavior changed.
No provider call, live test, relogin/reboot or full activation dry run was performed.
These are local proofs; exact deployed commit/health must be checked during release.

The bounded ready implementation is **RF-HOST-016**: reject unspecified,
unsupported or below-5.6 model/effort and pass the validated pair explicitly to
Codex. It closes an unconditional launch defect without needing owner input,
schema migration, external test resources or activation. Full model routing
(RF-HOST-017) and provider-observed usage (RF-HOST-018) remain separate.
Higher-impact broker, readonly canary and readiness work still require their
own bounded contracts and proofs; this patch does not claim to close them.
No second gap is authorized in this run.

Next independently ready P0 candidate after this delivery: a hard duration
watchdog within **RF-HOST-010**, reusing lease process-tree stop and writer fencing;
scope it to elapsed-time enforcement, without claiming token/cost metering.
Production activation remains blocked by the other P0 gates. Playground inputs
are not needed for this candidate.

## Matrix

| Requirement | Priority | Status | Inspected evidence | Remaining boundary / proof |
| --- | --- | --- | --- | --- |
| [RF-GOV-001](../product/interview-foundation-v2.md#rf-gov-001) | P0 | częściowo działa | [GOV](#e-gov) | No complete delegated-mandate enforcement. |
| [RF-GOV-002](../product/interview-foundation-v2.md#rf-gov-002) | P1 | częściowo działa | [GOAL](#e-goal) | CRUD exists; orphan, duplicate and owner-intent guards incomplete. |
| [RF-GOV-003](../product/interview-foundation-v2.md#rf-gov-003) | P1 | częściowo działa | [ORG](#e-org) | Registry exists; peer authority and manager configuration need verification. |
| [RF-GOV-004](../product/interview-foundation-v2.md#rf-gov-004) | P0 | częściowo działa | [ORG](#e-org) | Current multi-department workforce needs accountable-department semantics. |
| [RF-GOV-005](../product/interview-foundation-v2.md#rf-gov-005) | P1 | częściowo działa | [ORG](#e-org) | Organizational relations exist without enforced routing. |
| [RF-GOV-006](../product/interview-foundation-v2.md#rf-gov-006) | P1 | częściowo działa | [ORG](#e-org) | Workforce and ephemeral sessions exist; lifecycle orchestration incomplete. |
| [RF-GOV-007](../product/interview-foundation-v2.md#rf-gov-007) | P1 | częściowo działa | [ORG](#e-org) | Role records exist; catalog coverage and activation process unverified. |
| [RF-GOV-008](../product/interview-foundation-v2.md#rf-gov-008) | P1 | częściowo działa | [ORG](#e-org) | Missing enforced HR qualification flow. |
| [RF-GOV-009](../product/interview-foundation-v2.md#rf-gov-009) | P1 | brak | [ORG](#e-org) | No verified evaluation or remediation engine. |
| [RF-GOV-010](../product/interview-foundation-v2.md#rf-gov-010) | P1 | brak | [ORG](#e-org) | No competency certification lifecycle. |
| [RF-GOV-011](../product/interview-foundation-v2.md#rf-gov-011) | P1 | częściowo działa | [ORG](#e-org) | Role data does not enforce separation. |
| [RF-GOV-012](../product/interview-foundation-v2.md#rf-gov-012) | P1 | częściowo działa | [ORG](#e-org) | Profile configuration and allocation unverified. |
| [RF-GOV-013](../product/interview-foundation-v2.md#rf-gov-013) | P1 | brak | [SCHED](#e-sched) | No governed subagent scheduler. |
| [RF-GOV-014](../product/interview-foundation-v2.md#rf-gov-014) | P0 | częściowo działa | [AUTH](#e-auth) | Scoped keys exist; per-agent runtime binding incomplete. |
| [RF-GOV-015](../product/interview-foundation-v2.md#rf-gov-015) | P0 | działa | [GOV](#e-gov) | Boundary is governing policy; no Soar change authorized. |
| [RF-GOV-016](../product/interview-foundation-v2.md#rf-gov-016) | P0 | działa | [GOV](#e-gov) | Closed-batch contract governs this delivery. |
| [RF-GOV-017](../product/interview-foundation-v2.md#rf-gov-017) | P0 | działa | [DOC](#e-doc) | 162 stable requirements, decision status and supersession links; all 162 mapped to inspected evidence and limitations in this V2 registry. |
| [RF-GOV-018](../product/interview-foundation-v2.md#rf-gov-018) | P0 | działa | [GOV](#e-gov) | Governance boundary, not a new runtime feature. |
| [RF-GOV-019](../product/interview-foundation-v2.md#rf-gov-019) | P0 | działa | [PORT](#e-port) | Current code/config boundary from 36be71bc retained. |
| [RF-GOV-020](../product/interview-foundation-v2.md#rf-gov-020) | P0 | częściowo działa | [AUDIT](#e-audit) | Events exist; generic records/evidence remain mutable. |
| [RF-CTX-001](../product/interview-foundation-v2.md#rf-ctx-001) | P0 | częściowo działa | [PACKET](#e-packet) | Structural packet works; semantic completeness and full compiler remain partial. |
| [RF-CTX-002](../product/interview-foundation-v2.md#rf-ctx-002) | P0 | częściowo działa | [CTX](#e-ctx) | Source precedence documented, not enforced throughout compilation. |
| [RF-CTX-003](../product/interview-foundation-v2.md#rf-ctx-003) | P0 | częściowo działa | [CTX](#e-ctx) | Record/evidence models exist; epistemic labeling not uniformly enforced. |
| [RF-CTX-004](../product/interview-foundation-v2.md#rf-ctx-004) | P0 | częściowo działa | [PACKET](#e-packet) | Application context exists; validated full manifest absent. |
| [RF-CTX-005](../product/interview-foundation-v2.md#rf-ctx-005) | P0 | częściowo działa | [PACKET](#e-packet) | Packet references versions; complete layered selection/reason trace missing. |
| [RF-CTX-006](../product/interview-foundation-v2.md#rf-ctx-006) | P0 | częściowo działa | [PACKET](#e-packet) | Host validates one fetched snapshot twice; no authoritative mid-run source refresh. |
| [RF-CTX-007](../product/interview-foundation-v2.md#rf-ctx-007) | P1 | brak | [CTX](#e-ctx) | No runtime context expansion protocol. |
| [RF-CTX-008](../product/interview-foundation-v2.md#rf-ctx-008) | P0 | częściowo działa | [TASK](#e-task) | Task todo and execution queued exist; validated Ready state absent. |
| [RF-CTX-009](../product/interview-foundation-v2.md#rf-ctx-009) | P0 | częściowo działa | [TASK](#e-task) | Task fields exist; atomicity enforcement absent. |
| [RF-CTX-010](../product/interview-foundation-v2.md#rf-ctx-010) | P0 | częściowo działa | [TASK](#e-task) | Assignment exists; role separation gates absent. |
| [RF-CTX-011](../product/interview-foundation-v2.md#rf-ctx-011) | P1 | częściowo działa | [PROC](#e-proc) | Registry primitives exist; task-type execution contract incomplete. |
| [RF-CTX-012](../product/interview-foundation-v2.md#rf-ctx-012) | P0 | częściowo działa | [PROC](#e-proc) | Procedure refs validated; composition and exception authority absent. |
| [RF-CTX-013](../product/interview-foundation-v2.md#rf-ctx-013) | P0 | częściowo działa | [PACKET](#e-packet) | Text recovery fields exist; typed recipient acceptance absent. |
| [RF-CTX-014](../product/interview-foundation-v2.md#rf-ctx-014) | P0 | brak | [REVIEW](#e-review) | No native review return workflow. |
| [RF-CTX-015](../product/interview-foundation-v2.md#rf-ctx-015) | P1 | częściowo działa | [TASK](#e-task) | Notes and task links exist; typed governed communication incomplete. |
| [RF-CTX-016](../product/interview-foundation-v2.md#rf-ctx-016) | P1 | częściowo działa | [DEC](#e-dec) | Structured Decision CRUD exists; adaptive interview orchestration absent. |
| [RF-CTX-017](../product/interview-foundation-v2.md#rf-ctx-017) | P0 | częściowo działa | [DEC](#e-dec) | Supersession fields exist; impact/revalidation/event-based reopening absent. |
| [RF-CTX-018](../product/interview-foundation-v2.md#rf-ctx-018) | P0 | częściowo działa | [DEC](#e-dec) | Authorization roles exist; semantic mandate enforcement absent. |
| [RF-CTX-019](../product/interview-foundation-v2.md#rf-ctx-019) | P1 | częściowo działa | [TASK](#e-task) | Records/relations exist; execution enforcement incomplete. |
| [RF-CTX-020](../product/interview-foundation-v2.md#rf-ctx-020) | P1 | częściowo działa | [LEARN](#e-learn) | Knowledge/standard records exist; promotion/eval loop absent. |
| [RF-CTX-021](../product/interview-foundation-v2.md#rf-ctx-021) | P0 | częściowo działa | [FIND](#e-find) | Capability observations exist; governed triage-to-task pipeline incomplete. |
| [RF-CTX-022](../product/interview-foundation-v2.md#rf-ctx-022) | P1 | brak | [FIND](#e-find) | No complete prioritization rule engine. |
| [RF-CTX-023](../product/interview-foundation-v2.md#rf-ctx-023) | P1 | brak | [FIND](#e-find) | Soar audit not executed. |
| [RF-CTX-024](../product/interview-foundation-v2.md#rf-ctx-024) | P1 | brak | [CTX](#e-ctx) | No automated provenance/license release gate. |
| [RF-CTX-025](../product/interview-foundation-v2.md#rf-ctx-025) | P1 | brak | [REVIEW](#e-review) | No dispute protocol. |
| [RF-HOST-001](../product/interview-foundation-v2.md#rf-host-001) | P0 | częściowo działa | [HOST](#e-host) | Queue/observer implemented; full scheduler pending. |
| [RF-HOST-002](../product/interview-foundation-v2.md#rf-host-002) | P0 | częściowo działa | [LOCK](#e-lock) | Global writer lock works; waiting/read resource admission absent. |
| [RF-HOST-003](../product/interview-foundation-v2.md#rf-host-003) | P0 | częściowo działa | [RECOVERY](#e-recovery) | Pre-spawn recovery implemented; after-spawn recovery deliberately blocked. |
| [RF-HOST-004](../product/interview-foundation-v2.md#rf-host-004) | P0 | częściowo działa | [WORKSPACE](#e-workspace) | Path/origin guard exists; full clean-main and unknown-change admission absent. |
| [RF-HOST-005](../product/interview-foundation-v2.md#rf-host-005) | P1 | częściowo działa | [WORKSPACE](#e-workspace) | No governed branch lifecycle or WIP broker. |
| [RF-HOST-006](../product/interview-foundation-v2.md#rf-host-006) | P0 | częściowo działa | [LEASE](#e-lease) | Lease/process-tree and durable spawn barriers exist; all operation checkpoints incomplete. |
| [RF-HOST-007](../product/interview-foundation-v2.md#rf-host-007) | P0 | częściowo działa | [OBSERVER](#e-observer) | Observer implemented; real relogin/reboot and forced-crash restart unproven. |
| [RF-HOST-008](../product/interview-foundation-v2.md#rf-host-008) | P1 | brak | [HOST](#e-host) | No signed update protocol. |
| [RF-HOST-009](../product/interview-foundation-v2.md#rf-host-009) | P0 | częściowo działa | [SCHED](#e-sched) | Existing claim is FIFO, not readiness/priority scheduler. |
| [RF-HOST-010](../product/interview-foundation-v2.md#rf-host-010) | P0 | częściowo działa | [BUDGET](#e-budget) | Attempts validated; duration/token hard stop and cost meters missing. |
| [RF-HOST-011](../product/interview-foundation-v2.md#rf-host-011) | P1 | częściowo działa | [BUDGET](#e-budget) | Observer/integration retries exist; general execution loop breaker absent. |
| [RF-HOST-012](../product/interview-foundation-v2.md#rf-host-012) | P1 | częściowo działa | [BUDGET](#e-budget) | Usage stored per execution; attribution and quality-constrained optimization absent. |
| [RF-HOST-013](../product/interview-foundation-v2.md#rf-host-013) | P0 | brak | [RESOURCE](#e-resource) | No resource-aware host/service-operation broker. |
| [RF-HOST-014](../product/interview-foundation-v2.md#rf-host-014) | P0 | brak | [HOST](#e-host) | No coordinated version compatibility/drain gate. |
| [RF-HOST-015](../product/interview-foundation-v2.md#rf-host-015) | P1 | częściowo działa | [AUTH](#e-auth) | Host identity and scoped provisioning exist; interactive pairing absent. |
| [RF-HOST-016](../product/interview-foundation-v2.md#rf-host-016) | P0 | działa | [MODEL](#e-model) | Explicit allowlist/pair validation and exact argv verified by synthetic host tests; no provider call/activation. Full routing/observed usage remain RF-HOST-017/018. |
| [RF-HOST-017](../product/interview-foundation-v2.md#rf-host-017) | P1 | brak | [MODEL](#e-model) | No stage router, minima, availability or override UI. |
| [RF-HOST-018](../product/interview-foundation-v2.md#rf-host-018) | P1 | częściowo działa | [MODEL](#e-model) | No model/effort execution evidence. |
| [RF-HOST-019](../product/interview-foundation-v2.md#rf-host-019) | P0 | częściowo działa | [PACKET](#e-packet) | Prompt marks context untrusted; no comprehensive quarantine/reporting. |
| [RF-HOST-020](../product/interview-foundation-v2.md#rf-host-020) | P0 | częściowo działa | [WORKSPACE](#e-workspace) | Workspace-write sandbox is not read isolation; browser/session broker absent. |
| [RF-SEC-001](../product/interview-foundation-v2.md#rf-sec-001) | P0 | częściowo działa | [RISK](#e-risk) | Risk records exist; computed classification absent. |
| [RF-SEC-002](../product/interview-foundation-v2.md#rf-sec-002) | P0 | brak | [RISK](#e-risk) | No complete risk admission gate. |
| [RF-SEC-003](../product/interview-foundation-v2.md#rf-sec-003) | P0 | częściowo działa | [BROKER](#e-broker) | Static scoped API keys and secret storage exist; task capability broker absent. |
| [RF-SEC-004](../product/interview-foundation-v2.md#rf-sec-004) | P0 | częściowo działa | [BROKER](#e-broker) | Partial credential exclusions; arbitrary execution events/results remain unredacted. |
| [RF-SEC-005](../product/interview-foundation-v2.md#rf-sec-005) | P0 | brak | [BROKER](#e-broker) | No tool/network/install broker. |
| [RF-SEC-006](../product/interview-foundation-v2.md#rf-sec-006) | P0 | częściowo działa | [BROKER](#e-broker) | Workspace scoping exists, not field-level diagnostic access. |
| [RF-SEC-007](../product/interview-foundation-v2.md#rf-sec-007) | P0 | brak | [REVIEW](#e-review) | No mandatory security-review or emergency-exception lifecycle. |
| [RF-SEC-008](../product/interview-foundation-v2.md#rf-sec-008) | P0 | częściowo działa | [BROKER](#e-broker) | Environment schema and encrypted integration settings exist; dependency gating incomplete. |
| [RF-SEC-009](../product/interview-foundation-v2.md#rf-sec-009) | P1 | częściowo działa | [AUTH](#e-auth) | Membership/invitation role checks exist; finer project/decision mandates incomplete. |
| [RF-SEC-010](../product/interview-foundation-v2.md#rf-sec-010) | P0 | brak | [HEALTH](#e-health) | No generic application-health contract runner. |
| [RF-SEC-011](../product/interview-foundation-v2.md#rf-sec-011) | P0 | częściowo działa | [IDEMP](#e-idemp) | Some provider inbox/execution CAS dedup exists; universal operation receipts absent. |
| [RF-SEC-012](../product/interview-foundation-v2.md#rf-sec-012) | P0 | brak | [INCIDENT](#e-incident) | Incident records exist; capability suspension/reconciliation absent. |
| [RF-RES-001](../product/interview-foundation-v2.md#rf-res-001) | P0 | częściowo działa | [RESOURCE](#e-resource) | Host repo allowlist exists; full runtime resource manifest absent. |
| [RF-RES-002](../product/interview-foundation-v2.md#rf-res-002) | P0 | brak | [RESOURCE](#e-resource) | No ownership-aware service lifecycle. |
| [RF-RES-003](../product/interview-foundation-v2.md#rf-res-003) | P0 | brak | [BACKUP](#e-backup) | No governed volume-operation gate. |
| [RF-RES-004](../product/interview-foundation-v2.md#rf-res-004) | P0 | częściowo działa | [BACKUP](#e-backup) | Operational instructions exist; automated verification/rotation unproven. |
| [RF-RES-005](../product/interview-foundation-v2.md#rf-res-005) | P0 | brak | [BACKUP](#e-backup) | No verified encrypted sync/restore implementation; later Roost-only exception to earlier no-DB-download rule. |
| [RF-RES-006](../product/interview-foundation-v2.md#rf-res-006) | P1 | brak | [BACKUP](#e-backup) | No recovery-code setup flow. |
| [RF-RES-007](../product/interview-foundation-v2.md#rf-res-007) | P0 | brak | [RESOURCE](#e-resource) | No shared release resource admission. |
| [RF-RES-008](../product/interview-foundation-v2.md#rf-res-008) | P1 | działa | [GOV](#e-gov) | Boundary retained; no new cleanup mechanism. |
| [RF-REL-001](../product/interview-foundation-v2.md#rf-rel-001) | P0 | brak | [RELEASE](#e-release) | No native Git/PR/merge broker. |
| [RF-REL-002](../product/interview-foundation-v2.md#rf-rel-002) | P0 | działa | [GOV](#e-gov) | Governing prohibition retained. |
| [RF-REL-003](../product/interview-foundation-v2.md#rf-rel-003) | P0 | brak | [REVIEW](#e-review) | No independent review orchestrator. |
| [RF-REL-004](../product/interview-foundation-v2.md#rf-rel-004) | P0 | brak | [RELEASE](#e-release) | No exact-commit release authorization. |
| [RF-REL-005](../product/interview-foundation-v2.md#rf-rel-005) | P0 | częściowo działa | [RELEASE](#e-release) | Bootstrap workflow exists; native completion gate absent. |
| [RF-REL-006](../product/interview-foundation-v2.md#rf-rel-006) | P0 | brak | [HEALTH](#e-health) | No automated baseline-aware observation gate. |
| [RF-REL-007](../product/interview-foundation-v2.md#rf-rel-007) | P0 | brak | [RELEASE](#e-release) | Current health exposes commit; image identity/rollback manifest not proven. |
| [RF-REL-008](../product/interview-foundation-v2.md#rf-rel-008) | P0 | brak | [RELEASE](#e-release) | Manual operations docs exist; automatic rollback absent. |
| [RF-REL-009](../product/interview-foundation-v2.md#rf-rel-009) | P1 | brak | [HEALTH](#e-health) | No continuous multi-app monitoring worker. |
| [RF-REL-010](../product/interview-foundation-v2.md#rf-rel-010) | P0 | brak | [HEALTH](#e-health) | No verified per-app safety certification. |
| [RF-REL-011](../product/interview-foundation-v2.md#rf-rel-011) | P0 | częściowo działa | [TEST](#e-test) | Repository tests exist; risk-based native test gate absent. |
| [RF-REL-012](../product/interview-foundation-v2.md#rf-rel-012) | P1 | brak | [TEST](#e-test) | Bootstrap skill workflow exists; native enforcement absent. |
| [RF-REL-013](../product/interview-foundation-v2.md#rf-rel-013) | P0 | częściowo działa | [TEST](#e-test) | API tests exist; compatibility release gate incomplete. |
| [RF-REL-014](../product/interview-foundation-v2.md#rf-rel-014) | P0 | brak | [RELEASE](#e-release) | No desired-state reconciliation service. |
| [RF-REL-015](../product/interview-foundation-v2.md#rf-rel-015) | P0 | częściowo działa | [HEALTH](#e-health) | Roost public health/build exists; complete app contracts absent. |
| [RF-REL-016](../product/interview-foundation-v2.md#rf-rel-016) | P1 | brak | [RELEASE](#e-release) | No scheduler-enforced windows or drain. |
| [RF-REL-017](../product/interview-foundation-v2.md#rf-rel-017) | P1 | brak | [RELEASE](#e-release) | Future Soar release configuration, not implemented here. |
| [RF-REL-018](../product/interview-foundation-v2.md#rf-rel-018) | P1 | działa | [GOV](#e-gov) | Risk-based target policy retained. |
| [RF-ACT-001](../product/interview-foundation-v2.md#rf-act-001) | P0 | częściowo działa | [HOST](#e-host) | Default execution flag works; formal staged readiness state absent. |
| [RF-ACT-002](../product/interview-foundation-v2.md#rf-act-002) | P0 | częściowo działa | [DRY](#e-dry) | Lease/recovery fixture tests exist; complete dry-run certification absent. |
| [RF-ACT-003](../product/interview-foundation-v2.md#rf-act-003) | P0 | brak | [RELEASE](#e-release) | Needs broker and passed local dry run; ask owner for repo/folder only at that stage. |
| [RF-ACT-004](../product/interview-foundation-v2.md#rf-act-004) | P1 | brak | [RESOURCE](#e-resource) | Not yet reached; no resources created. |
| [RF-ACT-005](../product/interview-foundation-v2.md#rf-act-005) | P0 | brak | [AUDITOR](#e-auditor) | Current supervised host only has workspace-write; read-only canary absent. |
| [RF-ACT-006](../product/interview-foundation-v2.md#rf-act-006) | P0 | brak | [AUDITOR](#e-auditor) | No two-stage canary orchestration. |
| [RF-ACT-007](../product/interview-foundation-v2.md#rf-act-007) | P0 | brak | [ACT](#e-act) | No readiness report or activation authorization state machine. |
| [RF-ACT-008](../product/interview-foundation-v2.md#rf-act-008) | P1 | brak | [ACT](#e-act) | No capability progression lifecycle. |
| [RF-ACT-009](../product/interview-foundation-v2.md#rf-act-009) | P1 | brak | [ACT](#e-act) | No probation counters/certification. |
| [RF-ACT-010](../product/interview-foundation-v2.md#rf-act-010) | P1 | brak | [ACT](#e-act) | No app-onboarding readiness procedure. |
| [RF-ACT-011](../product/interview-foundation-v2.md#rf-act-011) | P0 | działa | [GOV](#e-gov) | This batch is registry plus one runtime gap; future runs require scoped readiness selection. |
| [RF-SOAR-001](../product/interview-foundation-v2.md#rf-soar-001) | P1 | wymaga konfiguracji | [SOAR](#e-soar) | Mapping declared; full product card and production baseline need audit. |
| [RF-SOAR-002](../product/interview-foundation-v2.md#rf-soar-002) | P1 | brak | [SOAR](#e-soar) | No Soar code audit in this batch. |
| [RF-SOAR-003](../product/interview-foundation-v2.md#rf-soar-003) | P1 | brak | [SOAR](#e-soar) | Future Soar acceptance; not verified. |
| [RF-SOAR-004](../product/interview-foundation-v2.md#rf-soar-004) | P0 | brak | [SOAR](#e-soar) | Future application-safe-deploy gate; no Soar modification. |
| [RF-SOAR-005](../product/interview-foundation-v2.md#rf-soar-005) | P0 | wymaga konfiguracji | [SOAR](#e-soar) | Owner mandate recorded; never treat balance as enforcement. |
| [RF-SOAR-006](../product/interview-foundation-v2.md#rf-soar-006) | P0 | wymaga konfiguracji | [SOAR](#e-soar) | Required confirmation not obtained from exchanges; no live permission granted here. |
| [RF-SOAR-007](../product/interview-foundation-v2.md#rf-soar-007) | P0 | brak | [SOAR](#e-soar) | Supersedes unrestricted live-test approval; no consent issued in this batch. |
| [RF-SOAR-008](../product/interview-foundation-v2.md#rf-soar-008) | P0 | wymaga konfiguracji | [SOAR](#e-soar) | No guarantee of autonomous closure claimed; native strategy/risk configuration must be verified. |
| [RF-SOAR-009](../product/interview-foundation-v2.md#rf-soar-009) | P0 | wymaga konfiguracji | [SOAR](#e-soar) | Limits are mandates, not verified exchange settings. |
| [RF-SOAR-010](../product/interview-foundation-v2.md#rf-soar-010) | P0 | brak | [SOAR](#e-soar) | Target test failure procedure absent. |
| [RF-SOAR-011](../product/interview-foundation-v2.md#rf-soar-011) | P0 | brak | [SOAR](#e-soar) | No live or production trading test run. |
| [RF-SOAR-012](../product/interview-foundation-v2.md#rf-soar-012) | P0 | brak | [SOAR](#e-soar) | Certification evidence not established. |
| [RF-SOAR-013](../product/interview-foundation-v2.md#rf-soar-013) | P1 | brak | [SOAR](#e-soar) | Future Soar controlled test lifecycle. |
| [RF-SOAR-014](../product/interview-foundation-v2.md#rf-soar-014) | P0 | brak | [SOAR](#e-soar) | Future Soar idempotency proof required. |
| [RF-SOAR-015](../product/interview-foundation-v2.md#rf-soar-015) | P1 | częściowo działa | [INTEGRATION](#e-integration) | Connectors exist; test-scope admission incomplete. |
| [RF-SOAR-016](../product/interview-foundation-v2.md#rf-soar-016) | P0 | częściowo działa | [INTEGRATION](#e-integration) | Provider operations exist; generic test ownership/cost guard absent. |
| [RF-SOAR-017](../product/interview-foundation-v2.md#rf-soar-017) | P1 | brak | [INTEGRATION](#e-integration) | No generic integration test ladder controller. |
| [RF-UX-001](../product/interview-foundation-v2.md#rf-ux-001) | P1 | częściowo działa | [ATTENTION](#e-attention) | Dashboards/events exist; unified attention lifecycle incomplete. |
| [RF-UX-002](../product/interview-foundation-v2.md#rf-ux-002) | P1 | częściowo działa | [ATTENTION](#e-attention) | Execution timeline exists; complete explainable evidence view partial. |
| [RF-UX-003](../product/interview-foundation-v2.md#rf-ux-003) | P0 | częściowo działa | [HOST](#e-host) | Cancel and observer stop exist; full owner controls absent. |
| [RF-UX-004](../product/interview-foundation-v2.md#rf-ux-004) | P1 | częściowo działa | [AUDIT](#e-audit) | Ignored evidence guard exists; runtime log retention not implemented. |
| [RF-UX-005](../product/interview-foundation-v2.md#rf-ux-005) | P1 | brak | [LANG](#e-lang) | UI localStorage locale only; account communication/workspace settings missing. |
| [RF-UX-006](../product/interview-foundation-v2.md#rf-ux-006) | P0 | brak | [LANG](#e-lang) | Workspace schema lacks language. |
| [RF-UX-007](../product/interview-foundation-v2.md#rf-ux-007) | P1 | częściowo działa | [LANG](#e-lang) | PL/EN and fallback exist; missing-key finding and account persistence incomplete. |
| [RF-UX-008](../product/interview-foundation-v2.md#rf-ux-008) | P1 | brak | [TIME](#e-time) | DateTime storage exists; user/workspace timezone settings absent. |
| [RF-UX-009](../product/interview-foundation-v2.md#rf-ux-009) | P1 | brak | [TIME](#e-time) | No native timezone-aware recurring task scheduler. |
| [RF-DEF-001](../product/interview-foundation-v2.md#rf-def-001) | P2 | brak | [AUTH](#e-auth) | Deferred; do not add an activation gate. |
| [RF-DEF-002](../product/interview-foundation-v2.md#rf-def-002) | P2 | brak | [RELEASE](#e-release) | Deferred; current constraints remain valid. |
| [RF-DEF-003](../product/interview-foundation-v2.md#rf-def-003) | P2 | brak | [SOAR](#e-soar) | Deferred; no optimization worker activated. |
| [RF-DEF-004](../product/interview-foundation-v2.md#rf-def-004) | P2 | brak | [LANG](#e-lang) | Deferred; creation choice remains immutable. |
| [RF-DEF-005](../product/interview-foundation-v2.md#rf-def-005) | P2 | brak | [ATTENTION](#e-attention) | Deferred; no external notification channel activation. |
| [RF-DEF-006](../product/interview-foundation-v2.md#rf-def-006) | P2 | brak | [GOV](#e-gov) | Deferred; neither automation is retired by this batch. |
| [RF-ORG-001](../product/interview-foundation-v2.md#rf-org-001) | P1 | częściowo działa | [ORG](#e-org) | Workforce profile JSON and indexes exist; competency levels and policy enforcement incomplete. |
| [RF-ORG-002](../product/interview-foundation-v2.md#rf-org-002) | P1 | częściowo działa | [PROC](#e-proc) | Canonical models exist; complete execution semantics partial. |
| [RF-ORG-003](../product/interview-foundation-v2.md#rf-org-003) | P1 | częściowo działa | [PORT](#e-port) | Product-engineering readiness exists; lifecycle gates need configuration/proof. |
| [RF-ORG-004](../product/interview-foundation-v2.md#rf-org-004) | P1 | częściowo działa | [LEARN](#e-learn) | Generic knowledge/procedure records do not enforce promotion. |
| [RF-ORG-005](../product/interview-foundation-v2.md#rf-org-005) | P1 | częściowo działa | [CTX](#e-ctx) | Documentation imports exist; approval/provenance reconciliation incomplete. |
| [RF-OLD-001](../product/interview-foundation-v2.md#rf-old-001) | P2 | brak | [SOAR](#e-soar) | Superseded by RF-SOAR-007 at messages 576–578. |
| [RF-OLD-002](../product/interview-foundation-v2.md#rf-old-002) | P2 | brak | [RELEASE](#e-release) | Superseded by RF-REL-017 at messages 704–706. |
| [RF-OLD-003](../product/interview-foundation-v2.md#rf-old-003) | P2 | brak | [INTEGRATION](#e-integration) | Superseded by RF-SOAR-015 at messages 630–634; application test accounts remain distinct. |
| [RF-OLD-004](../product/interview-foundation-v2.md#rf-old-004) | P2 | brak | [RESOURCE](#e-resource) | Rejected/superseded by RF-ACT-003 and RF-ACT-004. |
| [RF-OLD-005](../product/interview-foundation-v2.md#rf-old-005) | P2 | brak | [GOV](#e-gov) | Superseded by RF-REL-018; flags only where actual risk requires. |
| [RF-OLD-006](../product/interview-foundation-v2.md#rf-old-006) | P2 | brak | [SOAR](#e-soar) | Superseded by RF-SOAR-008 and RF-SOAR-010; test target functions only. |
| [RF-OLD-007](../product/interview-foundation-v2.md#rf-old-007) | P2 | brak | [GOV](#e-gov) | Superseded by RF-GOV-016 closed versioned batches. |
| [RF-OLD-008](../product/interview-foundation-v2.md#rf-old-008) | P2 | brak | [WORKSPACE](#e-workspace) | Superseded by RF-HOST-002 and RF-HOST-004: one laptop writer, one canonical clone per app. |
| [RF-OLD-009](../product/interview-foundation-v2.md#rf-old-009) | P2 | brak | [ORG](#e-org) | Superseded by RF-GOV-010 and RF-ACT-010: portable competence, separate app readiness. |
| [RF-OLD-010](../product/interview-foundation-v2.md#rf-old-010) | P2 | brak | [BACKUP](#e-backup) | Narrowed by RF-RES-005 to owner-approved encrypted verified Roost backup only; other production data remain excluded. |
| [RF-OLD-011](../product/interview-foundation-v2.md#rf-old-011) | P2 | brak | [GOV](#e-gov) | Superseded/deferred by RF-DEF-006 and RF-GOV-015. |

## Evidence index

Each entry links existing canonical files; a test link is not a passing result.

<a id="e-gov"></a>
**GOV** — Existing accepted target; policy does not grant runtime capability.

[docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-doc"></a>
**DOC** — Baseline was TRACE-000 placeholder; V2 registry/matrix closes documentation traceability only.

[docs/architecture/traceability-matrix.md](../../docs/architecture/traceability-matrix.md).

<a id="e-org"></a>
**ORG** — Workforce assignment/profile CRUD, role relations; not qualification or hierarchy workflow.

[src/modules/workforce/workforce.service.ts](../../src/modules/workforce/workforce.service.ts), [src/modules/workforce/workforce.routes.ts](../../src/modules/workforce/workforce.routes.ts), [src/operating-model/department-registry.ts](../../src/operating-model/department-registry.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-goal"></a>
**GOAL** — Workspace-scoped goal records; no complete goal decomposition guard.

[src/modules/goals/goals.routes.ts](../../src/modules/goals/goals.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-port"></a>
**PORT** — Application/readiness/context surfaces; Roost excluded by commit 36be71bc.

[src/modules/product-engineering/product-engineering.routes.ts](../../src/modules/product-engineering/product-engineering.routes.ts), [scripts/lib/agent-host-workspace-guard.mjs](../../scripts/lib/agent-host-workspace-guard.mjs), [config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [prisma/seed.ts](../../prisma/seed.ts).

<a id="e-audit"></a>
**AUDIT** — Events and agent logs; evidence CRUD permits mutation/deletion, so immutable complete ledger is unproven.

[src/modules/events/events.routes.ts](../../src/modules/events/events.routes.ts), [src/modules/agent-logs/agent-logs.routes.ts](../../src/modules/agent-logs/agent-logs.routes.ts), [src/modules/evidence/evidence.routes.ts](../../src/modules/evidence/evidence.routes.ts), [scripts/ignored-evidence-retention-guardrail.mjs](../../scripts/ignored-evidence-retention-guardrail.mjs).

<a id="e-packet"></a>
**PACKET** — Structural/referential snapshot gate; pre-spawn check uses fetched snapshot, not a fresh source query.

[scripts/lib/agent-host-execution-packet.mjs](../../scripts/lib/agent-host-execution-packet.mjs), [src/modules/agent-runtime/execution-packet.ts](../../src/modules/agent-runtime/execution-packet.ts), [scripts/agent-host-execution-packet.test.mjs](../../scripts/agent-host-execution-packet.test.mjs), [docs/architecture/execution-packet-contract.md](../../docs/architecture/execution-packet-contract.md).

<a id="e-ctx"></a>
**CTX** — Context projections and company records; full policy compiler is not established.

[src/modules/company-intelligence/company-intelligence.routes.ts](../../src/modules/company-intelligence/company-intelligence.routes.ts), [src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts), [scripts/import-application-documentation-context.ts](../../scripts/import-application-documentation-context.ts).

<a id="e-task"></a>
**TASK** — Task CRUD and assignments; no validated Ready command/state.

[src/modules/tasks/tasks.routes.ts](../../src/modules/tasks/tasks.routes.ts), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-proc"></a>
**PROC** — Versioned procedure and process data, not complete task execution governance.

[src/modules/process-core/process-core.routes.ts](../../src/modules/process-core/process-core.routes.ts), [src/modules/company-os/lifecycle-procedure-definition.ts](../../src/modules/company-os/lifecycle-procedure-definition.ts), [src/modules/company-os/company-os.routes.ts](../../src/modules/company-os/company-os.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-dec"></a>
**DEC** — Structured decisions with supersession; no complete authority/impact propagation.

[src/modules/decisions/decisions.routes.ts](../../src/modules/decisions/decisions.routes.ts), [web/src/features/departments/decisions-workbench.tsx](../../web/src/features/departments/decisions-workbench.tsx), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-learn"></a>
**LEARN** — Knowledge/standards records are storage primitives, not an independently evaluated learning cycle.

[src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-find"></a>
**FIND** — Readiness/observations and evidence primitives; not governed independent triage.

[src/modules/product-engineering/readiness.ts](../../src/modules/product-engineering/readiness.ts), [src/modules/evidence/evidence.routes.ts](../../src/modules/evidence/evidence.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-host"></a>
**HOST** — Existing supervised host, disabled by default; no activation stage state machine.

[scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [src/config/env.ts](../../src/config/env.ts), [docs/architecture/local-codex-agent-runtime.md](../../docs/architecture/local-codex-agent-runtime.md).

<a id="e-lock"></a>
**LOCK** — Exclusive machine writer and durable ownership checks; pending broader scheduler/resource gates.

[scripts/lib/agent-host-writer-lock.mjs](../../scripts/lib/agent-host-writer-lock.mjs), [scripts/agent-host-writer-lock.test.mjs](../../scripts/agent-host-writer-lock.test.mjs), [docs/architecture/agent-host-recovery.md](../../docs/architecture/agent-host-recovery.md).

<a id="e-recovery"></a>
**RECOVERY** — Fail-closed same-attempt recovery only before spawn; 982d4809.

[scripts/lib/agent-host-recovery.mjs](../../scripts/lib/agent-host-recovery.mjs), [src/modules/agent-runtime/execution-recovery.ts](../../src/modules/agent-runtime/execution-recovery.ts), [scripts/agent-host-recovery.test.mjs](../../scripts/agent-host-recovery.test.mjs).

<a id="e-workspace"></a>
**WORKSPACE** — Physical root/canonical origin checks; not a complete read/branch/provenance security boundary.

[scripts/lib/agent-host-workspace-guard.mjs](../../scripts/lib/agent-host-workspace-guard.mjs), [scripts/agent-host-workspace-guard.test.mjs](../../scripts/agent-host-workspace-guard.test.mjs), [config/roost-agent-host.example.json](../../config/roost-agent-host.example.json).

<a id="e-lease"></a>
**LEASE** — Lease renewal, cancellation and process tree stop.

[scripts/lib/agent-host-execution-lease.mjs](../../scripts/lib/agent-host-execution-lease.mjs), [scripts/agent-host-execution-lease.test.mjs](../../scripts/agent-host-execution-lease.test.mjs), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-observer"></a>
**OBSERVER** — Observer mode isolates registration/heartbeat from claim/spawn; 271beb36 and f0c7faae.

[scripts/lib/agent-host-observer.mjs](../../scripts/lib/agent-host-observer.mjs), [scripts/roost-agent-host-windows.ps1](../../scripts/roost-agent-host-windows.ps1), [scripts/agent-host-observer.test.mjs](../../scripts/agent-host-observer.test.mjs), [docs/operations/local-codex-agent-host.md](../../docs/operations/local-codex-agent-host.md).

<a id="e-sched"></a>
**SCHED** — Claim currently orders queued executions by createdAt; no priority aging or resource scheduler.

[src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-budget"></a>
**BUDGET** — Usage reporting and declared packet limits; no complete hard budget enforcement.

[scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [scripts/lib/agent-host-execution-packet.mjs](../../scripts/lib/agent-host-execution-packet.mjs).

<a id="e-model"></a>
**MODEL** — RF-HOST-016 now admits explicit supported model/effort, dispatches exact CLI arguments and records requested pair. Current synthetic verification passed.

[scripts/lib/agent-host-model-policy.mjs](../../scripts/lib/agent-host-model-policy.mjs), [scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [scripts/agent-host-model-policy.test.mjs](../../scripts/agent-host-model-policy.test.mjs), [scripts/agent-host-execution-packet.test.mjs](../../scripts/agent-host-execution-packet.test.mjs), [docs/architecture/execution-packet-contract.md](../../docs/architecture/execution-packet-contract.md).

<a id="e-auth"></a>
**AUTH** — Capability profiles, scoped keys and human workspace roles; not full per-task mandates.

[src/auth/agent-key-profiles.ts](../../src/auth/agent-key-profiles.ts), [src/modules/api-keys/api-key.service.ts](../../src/modules/api-keys/api-key.service.ts), [src/modules/workspaces/workspace-access.routes.ts](../../src/modules/workspaces/workspace-access.routes.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts).

<a id="e-broker"></a>
**BROKER** — Encrypted integration secrets and scoped credential service; no general task capability broker.

[src/integrations/secrets.ts](../../src/integrations/secrets.ts), [src/auth/capabilities.ts](../../src/auth/capabilities.ts), [src/operations/provision-agent-host-key.ts](../../src/operations/provision-agent-host-key.ts), [scripts/roost-agent-host-windows.ps1](../../scripts/roost-agent-host-windows.ps1).

<a id="e-risk"></a>
**RISK** — Risk/Control/Policy data exist without automatic maximum-impact classifier.

[src/modules/company-objects/company-objects.routes.ts](../../src/modules/company-objects/company-objects.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-review"></a>
**REVIEW** — Approval/review storage exists; no independent agent routing or exact-commit authorization.

[src/modules/company-os/company-os.routes.ts](../../src/modules/company-os/company-os.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma).

<a id="e-resource"></a>
**RESOURCE** — Repository mapping only; full Docker/service/resource lifecycle still a target.

[config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [docker-compose.yml](../../docker-compose.yml), [docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-backup"></a>
**BACKUP** — Operational guidance only; no certified encrypted backup/sync/restore result claimed.

[docs/operations/rollback-and-recovery.md](../../docs/operations/rollback-and-recovery.md).

<a id="e-release"></a>
**RELEASE** — Bootstrap Coolify contract and manual delivery; native broker/release automation absent.

[docs/operations/coolify-vps-deployment-contract.md](../../docs/operations/coolify-vps-deployment-contract.md), [docs/operations/rollback-and-recovery.md](../../docs/operations/rollback-and-recovery.md), [Dockerfile](../../Dockerfile), [docker-compose.coolify.yml](../../docker-compose.coolify.yml).

<a id="e-health"></a>
**HEALTH** — Roost health/readiness build metadata exists; not full multi-app functional health.

[src/server.ts](../../src/server.ts), [src/tests/api.test.ts](../../src/tests/api.test.ts), [docs/operations/post-deploy-smoke.md](../../docs/operations/post-deploy-smoke.md).

<a id="e-test"></a>
**TEST** — Existing API and host tests; their presence does not prove all future procedures.

[src/tests/api.test.ts](../../src/tests/api.test.ts), [docs/engineering/testing.md](../../docs/engineering/testing.md), [scripts/test-api-local.mjs](../../scripts/test-api-local.mjs).

<a id="e-idemp"></a>
**IDEMP** — Lease/CAS fencing and provider event inbox primitives, not general external-operation receipts.

[src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [src/integrations/clickup/clickup.sync.ts](../../src/integrations/clickup/clickup.sync.ts).

<a id="e-incident"></a>
**INCIDENT** — Incident records only; no automated containment/recertification workflow.

[src/modules/company-records/company-records.routes.ts](../../src/modules/company-records/company-records.routes.ts).

<a id="e-dry"></a>
**DRY** — Synthetic recovery/lease/writer checks exist; not full readiness fault campaign.

[scripts/agent-host-recovery.test.mjs](../../scripts/agent-host-recovery.test.mjs), [scripts/agent-host-execution-lease.test.mjs](../../scripts/agent-host-execution-lease.test.mjs), [scripts/agent-host-writer-lock.test.mjs](../../scripts/agent-host-writer-lock.test.mjs).

<a id="e-auditor"></a>
**AUDITOR** — Existing outcome prompt assumes implementation and sandbox is workspace-write; no read-only canary.

[scripts/roost-codex-agent-host.mjs](../../scripts/roost-codex-agent-host.mjs), [scripts/lib/agent-host-execution-packet.mjs](../../scripts/lib/agent-host-execution-packet.mjs).

<a id="e-act"></a>
**ACT** — Target only; no runtime activation ladder implementation.

[docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md), [src/modules/agent-runtime/agent-runtime.routes.ts](../../src/modules/agent-runtime/agent-runtime.routes.ts).

<a id="e-soar"></a>
**SOAR** — Declared Soar identity only; no Soar runtime correctness, exchange permissions or live-test proof asserted.

[config/roost-agent-host.example.json](../../config/roost-agent-host.example.json), [docs/architecture/autonomy-activation-contract.md](../../docs/architecture/autonomy-activation-contract.md).

<a id="e-integration"></a>
**INTEGRATION** — Real connected-provider operations exist; no universal isolated test ownership contract.

[src/modules/google-drive/google-drive.routes.ts](../../src/modules/google-drive/google-drive.routes.ts), [src/integrations/clickup/clickup.client.ts](../../src/integrations/clickup/clickup.client.ts), [src/modules/integration-settings/integration-settings.routes.ts](../../src/modules/integration-settings/integration-settings.routes.ts).

<a id="e-attention"></a>
**ATTENTION** — Host status and execution evidence surfaces, not full four-category attention center.

[web/src/features/settings/agent-connections-section.tsx](../../web/src/features/settings/agent-connections-section.tsx), [src/modules/dashboard/dashboard.routes.ts](../../src/modules/dashboard/dashboard.routes.ts), [src/modules/agent-events/agent-events.routes.ts](../../src/modules/agent-events/agent-events.routes.ts).

<a id="e-lang"></a>
**LANG** — PL/EN localStorage UI selection and English fallback; ultimate fallback still exposes key.

[web/src/i18n/i18n.tsx](../../web/src/i18n/i18n.tsx), [src/modules/workspaces/workspaces.routes.ts](../../src/modules/workspaces/workspaces.routes.ts), [prisma/schema.prisma](../../prisma/schema.prisma), [web/src/i18n/locales.ts](../../web/src/i18n/locales.ts).

<a id="e-time"></a>
**TIME** — DateTime columns only; no user/workspace timezone or DST task scheduler.

[prisma/schema.prisma](../../prisma/schema.prisma), [src/modules/workspaces/workspaces.routes.ts](../../src/modules/workspaces/workspaces.routes.ts).
