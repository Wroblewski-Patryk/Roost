# Completed Gate 2–5 Execution Briefs

These briefs governed completed delivery gates. They are retained as historical
protocol records, not the current work queue. Current status and the next
authorized gate are in [implementation](../implementation.md); exact evidence is
in the [traceability matrix](../architecture/traceability-matrix.md).

### Execution brief for Gate 2 — accountable coding and review

**Entry:** verified Gate 1 run and compatible runtime/configuration identities.
Primary requirements: RF-CTX-001 through RF-CTX-026, applicable RF-GOV and
RF-ORG rules, RF-HOST-002 through RF-HOST-012, RF-REL-003, RF-REL-011,
RF-ACT-002 and RF-ACT-005 through RF-ACT-008. Security, backup and resource
requirements apply before the operations they protect.

**Build and configure:** task readiness and pinned context, role/hierarchy and
competence routing, procedure assignment, model/effort policy, canonical
checkout and resource manifest, writer admission, checkpoints/resume,
independent review and the owner's attention/decision/result views. Configure
the actual roles and procedures needed for the proof; empty screens or example
records do not satisfy the gate. Agents use the scoped MCP interface over the
same authoritative API as the web console; no direct database bypass.

**Proof:** demonstrate rejection of incomplete/out-of-scope work, one-writer
enforcement, interruption and safe resume, review rejection and corrected
resubmission, then independent acceptance of an exact reviewable commit. The
owner can trace the assignment, responsible roles, tests, decisions and result
in Roost without reconstructing terminal conversations. Read-only pilot audit
and independent verifier precede the one-time first-write approval. Synthetic
qualification may prepare the flow before that approval; it cannot replace the
required native evidence. Application edits are performed by the managed
runtime under its mandate, not directly by the bootstrap implementation agent.

**Exit:** record accepted commit/run/context/configuration identities and
recovery proof; stop before release certification. Any prerequisite safety
control is implemented before use, even if its broader proof belongs to Gate 3.
Gate 2 authorizes neither a pilot push/deploy nor the one-time first-write
activation decision. After review, retain the pilot commit and branch as an
explicit recoverable handoff for later release; never claim the change shipped.
Bootstrap Roost/Worker commits and deployments follow the assignment's separate
authority and do not themselves certify the managed Gate 3 release path.

### Execution brief for Gate 3 — controlled release and recovery

**Entry:** Gate 2 coding/review proof. Primary requirements: RF-REL-001 through
RF-REL-018, RF-RES-001 through RF-RES-008, RF-ACT-003 and RF-ACT-004 and
applicable security/compatibility rules.

**Build and configure:** exact-commit release authority, free-account-compatible
Git protection, Git/deployment mapping, service and health manifests, baseline,
observation thresholds, backup/restore, compatible rollback artifacts and
cleanup ownership. Configure real deployment behavior; a release status field
alone is insufficient.

**Proof:** certify the branch/commit/push/PR/review/merge/deploy/health path in
the owner-provided temporary certification target, plus rejection of an
unreviewed or changed commit and a controlled recovery/rollback scenario.
Reconcile uncertain remote outcomes before retry. Verify deployed identity,
data preservation and cleanup/archive of only certification-owned resources.
Reuse any still-valid proof; request the temporary repository/folder/access
only when needed. Never change repository visibility to obtain free features.

**Exit:** release and recovery are proven with exact identities and observations;
stop before the real application repair pilot.

### Execution brief for Gate 4 — first real application repair

**Entry:** Gates 1–3 evidence and the pilot's required activation approval.
Primary requirements: RF-APP-003 through RF-APP-014, RF-ACT-005 through
RF-ACT-009, RF-CTX-021/RF-CTX-022 and applicable RF-PILOT rules.

**Build and configure:** reuse the pilot's assumptions, readiness records,
application card, roles, procedure and health/release settings. Select a
verified reversible low-risk non-financial defect and repair missing Roost
support. Reuse still-valid Gate 2 coding evidence where it fits the chosen task.

**Proof:** managed agents audit, plan, repair, review, release and verify the
original reproduction; link requirement, task, review, commit, deployment and
result. Direct bootstrap edits to the pilot cannot count as managed delivery.

**Exit:** one real repair proven. This does not mean the entire pilot application
is finished or sale-ready. Medium-risk access still requires the separate
three-success rule; live-position tests retain their explicit consent rules.

### Execution brief for Gate 5 — reusable internal application operation

**Entry:** proven pilot repair. Primary requirements: RF-PROD-011/RF-PROD-012,
RF-APP-001 through RF-APP-014, RF-ACT-010, RF-ORG and applicable RF-OUT,
RF-UX, RF-GOV, context, resource and recovery requirements.

**Build and configure:** shared takeover/delivery procedures and competent roles;
own audited assumptions, manifests, access, portfolio and owner decisions.
Existing apps enter their proven lifecycle stage.

**Proof:** a second app completes bounded managed work using the shared engine
and its own context. Repair generic gaps and preserve pilot regressions. The
owner can trace each stage, nearest outcome, accountable role, blocker/decision
and evidence in the console, including approved continuation and safe waiting.

**Exit:** reconcile source/configuration/runtime evidence in the existing matrix;
retain unmet/deferred requirements. This proves portfolio operation, not all
products or future capabilities. Each further app needs its own audit/onboarding.
