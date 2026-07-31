# Lifecycle Procedure Publication Contract

Last updated: 2026-07-31

Decision source: [LUC-2192](/LUC/issues/LUC-2192)

## Decision

Roost publishes `PROC-SH-APPLICATION-LIFECYCLE` version `1.0` by reusing two
existing foundations:

1. Company OS `Procedure` and `ProcedureStep` records own the workspace-scoped,
   versioned procedure definition.
2. The authenticated Product Map read route composes that definition with a
   strict, read-only Paperclip execution-state projection.

This is option 2 from
`docs/planning/luc-1895-resume-release-and-contract-audit.md`.

The procedure definition is not copied into a generic JSON packet. Product Map
does not become a workflow engine. Paperclip remains authoritative for live
issues, runs, approvals, blockers, budgets, gate results, and completion
evidence. Roost remains authoritative for the owner-facing procedure
definition, its workspace ownership, Company OS decisions and KPIs, and the
assembled read model.

## Rejected Options

### Extend only the Product Map packet

Rejected because it would make a transport snapshot the de facto procedure
definition, duplicate Company OS versioning, and leave no durable
`Procedure`/`ProcedureStep` identity for other Roost consumers.

### Add a dedicated lifecycle-procedure store and route

Rejected because the existing Company OS definition/version commands and
Product Map owner route already provide the required boundaries. A dedicated
table, workflow engine, or parallel authenticated owner surface would duplicate
ownership, versioning, authorization, and recovery behavior.

## Authority And Data-Flow Boundary

```text
Softwarehouse lifecycle operating contract
  -> strict Paperclip execution-state projection v2 (read-only source)
  -> existing Product Map ingress and active/LKG/quarantine store
  -> Roost read assembler
       + workspace Procedure/ProcedureStep v1 definition
       + workspace DecisionLog and Metric relations
       + server-owned audit correlation
  -> GET /v1/product-map/projection
  -> authenticated owner Product Map
```

The integration direction remains Paperclip to Roost only. The response,
receipt, owner browser, and Roost backend cannot acknowledge, mutate, complete,
or otherwise write to Paperclip.

## Company OS Definition Mapping

The v1.0 definition uses existing fields as follows:

| Contract field | Company OS mapping |
| --- | --- |
| Stable procedure ID | `Procedure.name = "PROC-SH-APPLICATION-LIFECYCLE"` |
| Version | `Procedure.version = 1`, published as semantic version `"1.0"` |
| Definition family | `Procedure.familyId`, preserved by workflow-definition activation |
| Lifecycle status | `Procedure.status`; only `active` is publishable as current |
| Accountable owner | `Procedure.ownerRole`; the v1 seed resolves the workspace `Human Owner` role |
| Purpose and scope | `Procedure.purpose` and `Procedure.scope` |
| Primary output | `Procedure.expectedResult` |
| Quality boundary | `Procedure.qualityStandardId` |
| Participating roles | union of `Procedure.ownerRole` and the closed `accountableSourceOwners` arrays in each `ProcedureStep.validationRule` |
| Stages | exactly 18 ordered `ProcedureStep` records |
| Stage output/gate description | closed objects in `ProcedureStep.expectedOutput` and `validationRule` |
| Recovery guidance | `ProcedureStep.rollbackInstruction` |
| Version history and supersession | records with the same `familyId`, ordered by `version` and interpreted with `status` |

`Procedure.version = 1` maps only to semantic procedure version `"1.0"`.
Roost must fail closed instead of inventing a mapping for a future non-zero
minor version. A future `1.x` revision requires an explicit model/contract
decision before publication.

The initial definition is created or reconciled by the existing idempotent
Company OS seed path. Later changes use the existing workflow-definition draft,
impact-preview, approval, activation, archive, and rollback-draft commands.
Runtime reads never create or repair a procedure definition.

## Canonical Stage Set

Every stage key, order, and title is immutable within procedure version `1.0`.
Each `ProcedureStep.stepType` is `manual`; this definition describes the
governed lifecycle but does not authorize Roost automation.

| Order | Stage key | Title | Accountable source owner |
| --- | --- | --- | --- |
| 1 | `direction_portfolio_fit` | Direction and portfolio fit | Board / 00 AIA / 11 CINO |
| 2 | `opportunity_problem_validation` | Opportunity and problem validation | Product / Innovation |
| 3 | `business_framing` | Business framing | Product / Finance / Legal |
| 4 | `product_discovery_requirements` | Product discovery and requirements | App PM / Product |
| 5 | `ux_accessibility_design` | UX and accessibility design | UX / UI / Product |
| 6 | `architecture_data_threat_design` | Architecture, data, and threat design | CTO / TSA / Security |
| 7 | `delivery_release_planning` | Delivery and release planning | Delivery / Operations / PM |
| 8 | `implementation` | Implementation | Layer specialist |
| 9 | `automated_verification` | Automated verification | Test Automation / specialist |
| 10 | `user_flow_qa` | User-flow QA | QA / Product / UX |
| 11 | `independent_review` | Independent review | Code Review / CTO / Security |
| 12 | `documentation_operational_readiness` | Documentation and operational readiness | Docs / DRE / support owner |
| 13 | `release_decision` | Release decision | PM / QVE / DRE / Security |
| 14 | `source_control_closure` | Source-control closure | Delivery / author |
| 15 | `deployment_migration` | Deployment and migration | DRE / Security |
| 16 | `production_acceptance` | Production acceptance | QVE / DRE / App PM |
| 17 | `operate_support_observe` | Operate, support, and observe | Operations / Product / support owner |
| 18 | `retrospective_improvement` | Retrospective and improvement | COO / accountable stage owner |

The read assembler derives each stage key from the exact version-1 order and
rejects duplicate, missing, reordered, or additional steps. It does not accept
stage keys from ingress.

## Transport Schema Version

The current arbitrary packet contract is a breaking disclosure and integrity
gap. The transport version remains
`product-map-projection-transport/v1`, while the semantic packet schema changes
from `"1.0"` to `"2.0"`.

Procedure version `"1.0"` and Product Map packet schema `"2.0"` are different
version domains and must never be compared as if they were the same value.

Roost does not auto-convert or promote stored v1 packets. A stored v1 snapshot
may remain as retained historical evidence, but the v2 read assembler treats it
as unsupported and cannot present it as current. Rollout must deploy the v2
consumer before enabling a v2 publisher.

## Strict Ingress Schema

The implementation must express these shapes as closed schemas (`.strict()` at
every object boundary). No `z.record(z.unknown())`, passthrough object, raw
metadata bag, prompt, transcript, tool call, issue body, comment body, secret
metadata, user profile, email, credential, or provider payload is accepted.

```ts
type IsoDateTime = string;
type GitSha = string | null; // null or exactly 40 lowercase hex characters
type StableId = string; // 1..128 chars: A-Z, a-z, 0-9, ".", "_", ":", "-"

type PaperclipEvidenceRef =
  | {
      kind: "issue";
      issueIdentifier: string; // /^LUC-[1-9][0-9]*$/
      label: string;
    }
  | {
      kind: "comment";
      issueIdentifier: string;
      commentId: string; // UUID
      label: string;
    }
  | {
      kind: "document";
      issueIdentifier: string;
      documentKey: string; // /^[a-z0-9][a-z0-9-]{0,63}$/
      label: string;
    }
  | {
      kind: "attachment" | "work_product";
      issueIdentifier: string;
      objectId: string; // UUID
      label: string;
    };

type LifecycleGateResultV1 = {
  stageKey:
    | "direction_portfolio_fit"
    | "opportunity_problem_validation"
    | "business_framing"
    | "product_discovery_requirements"
    | "ux_accessibility_design"
    | "architecture_data_threat_design"
    | "delivery_release_planning"
    | "implementation"
    | "automated_verification"
    | "user_flow_qa"
    | "independent_review"
    | "documentation_operational_readiness"
    | "release_decision"
    | "source_control_closure"
    | "deployment_migration"
    | "production_acceptance"
    | "operate_support_observe"
    | "retrospective_improvement";
  status: "verified" | "not_applicable" | "blocked" | "stale" | "failed";
  summary: string;
  ownerRole: string;
  verifiedAt: IsoDateTime | null;
  evidenceRefs: PaperclipEvidenceRef[];
};

type LifecycleProcedureExecutionProjectionV1 = {
  procedureId: "PROC-SH-APPLICATION-LIFECYCLE";
  procedureVersion: "1.0";
  executionAuthority: "paperclip";
  observedAt: IsoDateTime;
  verifiedAt: IsoDateTime | null;
  freshness: "current" | "stale" | "unavailable";
  gateResults: LifecycleGateResultV1[]; // exactly 18, unique and complete
  evidenceRefs: PaperclipEvidenceRef[];
  supersession: {
    status: "active" | "superseded";
    supersedesVersion: string | null;
    supersededByVersion: string | null;
  };
  source: {
    repository: "Paperclip_Softwarehouse";
    path: "docs/softwarehouse/19-autonomous-application-business-lifecycle.md";
    documentVersion: "1.0";
    commitSha: string; // exactly 40 lowercase hex characters
  };
};

type IssueStatusCountsV2 = {
  backlog: number;
  todo: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  done: number;
  cancelled: number;
};

type ProductMapOfferingV2 = {
  offeringId: StableId;
  paperclipProjectName: string;
  lifecycleStage: string;
  conflictState:
    | "none"
    | "project_mapping_conflict"
    | "owner_surface_unavailable";
  sourceControl: {
    branch: string | null;
    sourceSha: GitSha;
    deployedSha: GitSha;
    versionAlignment: "aligned" | "different" | "unknown";
  };
  readiness: {
    status: "GO" | "NO-GO" | "UNKNOWN";
    evidenceState: "complete" | "missing" | "unknown";
    zeroGapButNoGo: boolean;
    totalGaps: number;
    nextGate: string | null;
  };
  aggregates: {
    issues: {
      total: number;
      byStatus: IssueStatusCountsV2;
    };
  };
};

type ProductMapProjectionPacketV2 = {
  schemaVersion: "2.0";
  observedAt: IsoDateTime;
  sourceState: "available" | "unavailable" | "timed_out";
  stale: boolean;
  conflictState:
    | "none"
    | "source_unavailable"
    | "project_mapping_conflict"
    | "owner_surface_unavailable";
  lifecycleProcedure: LifecycleProcedureExecutionProjectionV1;
  items: ProductMapOfferingV2[];
};
```

Validation invariants:

- `packet.observedAt`, `packet.lifecycleProcedure.observedAt`, and envelope
  `observedAt` are equal.
- `schemaVersion` is exactly `"2.0"` in the envelope and packet.
- `gateResults` contains every canonical stage exactly once and in canonical
  order.
- `not_applicable` requires a non-empty justification in `summary`.
- `verified` requires `verifiedAt` and at least one evidence ref.
- `GO` is invalid when any applicable gate is not `verified` or justified
  `not_applicable`, the packet is stale, or any conflict/supersession exists.
- `stale = true` whenever freshness is not `current`.
- ingress evidence refs contain identifiers only. Roost derives company-
  prefixed relative UI links; ingress cannot supply an arbitrary URL.
- every issue identifier must use the current company prefix, `LUC`.
- Git SHAs are full lowercase 40-character hashes or `null`; short SHAs are
  presentation-only and never accepted at ingress.

Bounds:

| Field | Limit |
| --- | --- |
| Raw envelope | existing `256 KiB` maximum |
| Product Map items | 50 |
| Gate results | exactly 18 |
| Evidence refs per gate | 10 |
| Procedure-level evidence refs | 50 |
| Total evidence refs | 150 |
| Labels, role names, branch names, project names | 1..120 UTF-8 characters |
| Gate summaries and next-gate text | 1..500 UTF-8 characters |
| Stable IDs | 1..128 allowlisted characters |

Unknown keys, duplicate logical IDs, invalid counts, unsafe identifiers,
oversized arrays/strings, mismatched timestamps, incomplete gates, and private
payload families are rejected before persistence with the existing generic
ingress denial. They never create a receipt, snapshot, audit event, or active
pointer change.

## Owner Read Model

`GET /v1/product-map/projection` remains the only owner Product Map API. It
returns the existing offering projection plus one composed procedure read model:

```ts
type LifecyclePublicationState =
  | "current"
  | "stale"
  | "conflict"
  | "source_only"
  | "unavailable";

type LifecycleProcedureReadModelV1 = {
  identity: {
    procedureId: "PROC-SH-APPLICATION-LIFECYCLE";
    procedureVersion: "1.0";
    familyId: string; // workspace-local UUID
    lifecycleStatus: "active" | "review" | "superseded" | "archived";
    title: "Autonomous Application And Business Lifecycle";
  };
  definition: {
    accountableOwner: { roleId: string; roleName: string };
    participatingRoles: string[];
    purpose: string;
    scope: string;
    trigger: string;
    entryCriteria: string[];
    primaryOutput: string;
    exitCriteria: string[];
    stages: Array<{
      stageKey: LifecycleGateResultV1["stageKey"];
      order: number;
      title: string;
      accountableSourceOwner: string;
      requiredOutput: string;
      exitGate: string;
      rollbackInstruction: string | null;
    }>;
  };
  provenance: {
    definitionAuthority: "roost";
    executionAuthority: "paperclip";
    roostSource: {
      path: "docs/governance/autonomous-application-business-lifecycle.md";
      documentVersion: "1.0";
      sourceSha: string;
    };
    operatingContractSource:
      LifecycleProcedureExecutionProjectionV1["source"];
    observedAt: IsoDateTime | null;
    verifiedAt: IsoDateTime | null;
    freshness: "current" | "stale" | "unavailable";
  };
  gates: LifecycleGateResultV1[];
  conflicts: Array<{
    code:
      | "unsupported_schema"
      | "definition_missing"
      | "definition_version_mismatch"
      | "definition_shape_mismatch"
      | "source_unavailable"
      | "source_deployed_sha_mismatch"
      | "projection_conflict"
      | "projection_out_of_order"
      | "superseded";
    summary: string;
  }>;
  supersession: {
    status: "active" | "superseded";
    supersedesVersion: string | null;
    supersededByVersion: string | null;
    nextReviewAt: IsoDateTime | null;
  };
  relations: {
    offerings: Array<{
      offeringId: StableId;
      name: string;
      lifecycleStage: string;
      readiness: "GO" | "NO-GO" | "UNKNOWN";
    }>;
    releases: Array<{
      offeringId: StableId;
      sourceSha: GitSha;
      deployedSha: GitSha;
      versionAlignment: "aligned" | "different" | "unknown";
      readiness: "GO" | "NO-GO" | "UNKNOWN";
    }>;
    decisions: Array<{
      id: string;
      context: string;
      chosenOption: string;
      decidedAt: IsoDateTime;
      reviewAt: IsoDateTime | null;
    }>;
    kpis: Array<{
      id: string;
      name: string;
      category: string;
      measurementType: string;
      unit: string | null;
      targetValue: number | null;
      currentValue: number | null;
      status: string;
    }>;
    evidence: Array<
      PaperclipEvidenceRef & { href: string }
    >;
  };
  audit: {
    correlationId: string; // Roost server-owned UUID/request correlation
    sourceSnapshotId: string;
    packetDigestPrefix: string; // first 12 lowercase hex characters
    receivedAt: IsoDateTime;
  } | null;
  authority: {
    readOnly: true;
    executionSystem: "paperclip";
    definitionSystem: "roost";
    canMutatePaperclip: false;
    canPromoteReadiness: false;
  };
};

type ProductMapPublicationReadResponseV2 = {
  data: {
    status: LifecyclePublicationState;
    packet: ProductMapProjectionPacketV2 | null;
    procedure: LifecycleProcedureReadModelV1 | null;
    observedAt: IsoDateTime | null;
  };
};
```

Relation mapping is fixed:

- offerings and releases derive only from validated `packet.items`;
- decisions derive only from workspace `DecisionLog` rows linked to the
  procedure's `processId`;
- KPIs derive only from workspace `Metric` rows linked to the same `processId`;
- Paperclip evidence derives only from validated structured evidence refs;
- `href` is generated server-side as a company-prefixed relative `LUC` path;
- audit correlation derives only from the stored Roost snapshot and request
  context, never from an ingress-provided audit field.

No relation query may omit `workspaceId`.

## Backend And Frontend Fail-Closed States

The server and web client use the same public state vocabulary:

| Server state | Required data | UI behavior |
| --- | --- | --- |
| `current` | valid active v1.0 definition and current supported v2 packet with no conflict | show procedure and relations; readiness still follows gate values |
| `stale` | valid definition and supported LKG packet inside 24 hours | show visible last-known-good warning; never promote readiness |
| `conflict` | valid definition, retained LKG packet, and a projection/definition/SHA/supersession conflict | show conflict summary and stricter verdict |
| `source_only` | valid definition but no accepted supported execution packet yet | show the procedure as repository/Company OS truth and state that live execution evidence is absent |
| `unavailable` | definition missing/invalid, unsupported active packet, or LKG expired | show recovery copy and no current readiness claim |

Client-only `loading` and `error` states wrap this server union. A network or
schema error must not reuse a previously rendered `current` state. The public
API no longer emits `quarantined` or `out_of_order`; those remain internal
ingress reasons and appear as typed `conflicts` under public state `conflict`.
This removes the current backend/frontend `conflict` vocabulary drift.

The procedure object may be present in `stale`, `conflict`, `source_only`, or
`unavailable` only when the local definition itself is valid. `packet` is null
for `source_only` and for unsupported/expired `unavailable` states.

## Authorization, Isolation, And Disclosure

- The owner route stays under existing authenticated API middleware.
- Workspace identity comes only from `req.auth.workspaceId`.
- The route has no workspace selector in path, query, or body.
- Service-key reads require exact `product-map:projection:read`; broad scopes
  remain invalid for the publisher and cannot infer another workspace.
- Procedure, process, step, decision, metric, snapshot, and audit queries all
  bind the authenticated workspace.
- Unauthorized requests fail before any definition/projection query.
- A foreign owner can read only their own workspace and receives no target
  procedure, source, audit, evidence, existence, or count fact.
- Error and denial bodies are generic. Logs contain safe codes, IDs already
  classified for owner display, count summaries, and digest prefixes only.
- The response excludes comments, issue bodies, run payloads, prompts,
  transcripts, user profiles, emails, credentials, provider payloads, raw
  metadata, full packet digests, and ingress receipt internals.

## Audit And Verification Contract

Implementation proof must cover:

1. exact v1.0 Procedure/18-step seed and idempotent reseed;
2. workflow-definition family/version and supersession readback;
3. strict v2 packet acceptance and every unknown/private field rejection;
4. v1 packet rejection without active-pointer promotion;
5. authorized owner and exact-capability reads;
6. unauthenticated and cross-workspace non-disclosure;
7. all server states plus client loading/error rendering;
8. source/deployed SHA mismatch and stricter-verdict preservation;
9. server-derived Paperclip links and audit correlation;
10. decision/KPI/process relation isolation;
11. desktop, tablet, mobile, keyboard, and accessibility owner proof;
12. no Paperclip write, callback, acknowledgement, or direct database access.

## Migration, Rollout, And Recovery Decision

No Prisma schema migration is required. The selected path reuses:

- `Procedure`, `ProcedureStep`, `Process`, `DecisionLog`, and `Metric`;
- workflow-definition family/version commands;
- Product Map snapshot/LKG/quarantine persistence;
- existing workspace auth and exact Product Map capabilities.

Implementation does require:

- an idempotent seed/backfill for the version-1 procedure and 18 steps;
- a breaking packet-protocol change from schema `"1.0"` to `"2.0"`;
- strict validation of stored packets on read, not only at new ingress;
- a coordinated producer/consumer release under
  [LUC-1910](/LUC/issues/LUC-1910).

There is no legacy packet data migration. Retained v1 packets remain historical
and cannot become current. Rollout order is consumer first, then v2 publisher.
If publisher activation fails, Roost stays visibly `source_only` or
`unavailable`. Recovery disables the publisher, revokes only its dedicated key
when necessary, restores the prior Roost candidate if required, and preserves
projection history. It never opens a reverse tunnel, reads Paperclip's database,
or writes back to Paperclip.

## Implementation Ownership

- [LUC-2193](/LUC/issues/LUC-2193) owns the Roost seed, strict schemas,
  read assembler, UI, and focused local/API/browser proof.
- [LUC-1910](/LUC/issues/LUC-1910) owns the exact producer/consumer candidate,
  protected Security/Ops/QA gates, push/deploy, rollback, production smoke, and
  monitoring.
- Any required Paperclip producer change must remain in a separately assigned
  Paperclip workspace issue; a Roost implementation run must not edit the
  Softwarehouse repository.
