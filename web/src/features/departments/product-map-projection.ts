import { z } from "zod";

export const lifecycleStageKeys = [
  "direction_portfolio_fit",
  "opportunity_problem_validation",
  "business_framing",
  "product_discovery_requirements",
  "ux_accessibility_design",
  "architecture_data_threat_design",
  "delivery_release_planning",
  "implementation",
  "automated_verification",
  "user_flow_qa",
  "independent_review",
  "documentation_operational_readiness",
  "release_decision",
  "source_control_closure",
  "deployment_migration",
  "production_acceptance",
  "operate_support_observe",
  "retrospective_improvement"
] as const;

const stageKeySchema = z.enum(lifecycleStageKeys);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/).nullable();
const issueIdentifierSchema = z.string().regex(/^LUC-[1-9][0-9]*$/);
const evidenceBase = {
  issueIdentifier: issueIdentifierSchema,
  label: z.string().min(1).max(120)
};
const evidenceSchema = z.union([
  z.object({ kind: z.literal("issue"), ...evidenceBase, href: z.string().regex(/^\/LUC\/issues\/LUC-[1-9][0-9]*$/) }).strict(),
  z.object({ kind: z.literal("comment"), ...evidenceBase, commentId: z.string().uuid(), href: z.string().regex(/^\/LUC\/issues\/LUC-[1-9][0-9]*#comment-[0-9a-f-]{36}$/) }).strict(),
  z.object({ kind: z.literal("document"), ...evidenceBase, documentKey: z.string(), href: z.string().regex(/^\/LUC\/issues\/LUC-[1-9][0-9]*#document-[a-z0-9-]+$/) }).strict(),
  z.object({ kind: z.literal("attachment"), ...evidenceBase, objectId: z.string().uuid(), href: z.string().regex(/^\/LUC\/issues\/LUC-[1-9][0-9]*#attachment-[0-9a-f-]{36}$/) }).strict(),
  z.object({ kind: z.literal("work_product"), ...evidenceBase, objectId: z.string().uuid(), href: z.string().regex(/^\/LUC\/issues\/LUC-[1-9][0-9]*#work-product-[0-9a-f-]{36}$/) }).strict()
]);

const rawEvidenceSchema = z.union([
  z.object({ kind: z.literal("issue"), ...evidenceBase }).strict(),
  z.object({ kind: z.literal("comment"), ...evidenceBase, commentId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("document"), ...evidenceBase, documentKey: z.string() }).strict(),
  z.object({ kind: z.literal("attachment"), ...evidenceBase, objectId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("work_product"), ...evidenceBase, objectId: z.string().uuid() }).strict()
]);

const gateSchema = z.object({
  stageKey: stageKeySchema,
  status: z.enum(["verified", "not_applicable", "blocked", "stale", "failed"]),
  summary: z.string().min(1).max(500),
  ownerRole: z.string().min(1).max(120),
  verifiedAt: isoDateTimeSchema.nullable(),
  evidenceRefs: z.array(rawEvidenceSchema).max(10)
}).strict();

const issueCountsSchema = z.object({
  backlog: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative()
}).strict();

const itemSchema = z.object({
  offeringId: z.string().min(1).max(128),
  paperclipProjectName: z.string().min(1).max(120),
  lifecycleStage: z.string().min(1).max(120),
  applicationVersion: z.object({
    namespace: z.literal("application_release"),
    currentVersion: z.string().regex(/^v\d+$/),
    currentStatus: z.enum(["in_progress", "accepted"]),
    nextVersion: z.string().regex(/^v\d+$/).nullable(),
    nextVersionStatus: z.enum(["locked", "unlocked"]).nullable(),
    policySourcePath: z.string().min(1).max(240)
  }).strict().optional().default({
    namespace: "application_release",
    currentVersion: "v0",
    currentStatus: "in_progress",
    nextVersion: null,
    nextVersionStatus: null,
    policySourcePath: "softwarehouse/portfolio/application-version-policy.json"
  }),
  conflictState: z.enum(["none", "project_mapping_conflict", "owner_surface_unavailable"]),
  sourceControl: z.object({
    branch: z.string().min(1).max(120).nullable(),
    sourceSha: shaSchema,
    deployedSha: shaSchema,
    versionAlignment: z.enum(["aligned", "different", "unknown"])
  }).strict(),
  readiness: z.object({
    status: z.enum(["GO", "NO-GO", "UNKNOWN"]),
    evidenceState: z.enum(["complete", "missing", "unknown"]),
    zeroGapButNoGo: z.boolean(),
    totalGaps: z.number().int().nonnegative(),
    nextGate: z.string().min(1).max(500).nullable()
  }).strict(),
  aggregates: z.object({
    issues: z.object({
      total: z.number().int().nonnegative(),
      byStatus: issueCountsSchema
    }).strict()
  }).strict()
}).strict();

const lifecycleSourceSchema = z.object({
  repository: z.literal("Paperclip_Softwarehouse"),
  path: z.literal("docs/softwarehouse/19-autonomous-application-business-lifecycle.md"),
  documentVersion: z.literal("1.0"),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/)
}).strict();

const packetSchema = z.object({
  schemaVersion: z.literal("2.0"),
  observedAt: isoDateTimeSchema,
  sourceState: z.enum(["available", "unavailable", "timed_out"]),
  stale: z.boolean(),
  conflictState: z.enum(["none", "source_unavailable", "project_mapping_conflict", "owner_surface_unavailable"]),
  lifecycleProcedure: z.object({
    procedureId: z.literal("PROC-SH-APPLICATION-LIFECYCLE"),
    procedureVersion: z.literal("1.0"),
    executionAuthority: z.literal("paperclip"),
    observedAt: isoDateTimeSchema,
    verifiedAt: isoDateTimeSchema.nullable(),
    freshness: z.enum(["current", "stale", "unavailable"]),
    gateResults: z.array(gateSchema).length(18),
    evidenceRefs: z.array(rawEvidenceSchema).max(50),
    supersession: z.object({
      status: z.enum(["active", "superseded"]),
      supersedesVersion: z.string().nullable(),
      supersededByVersion: z.string().nullable()
    }).strict(),
    source: lifecycleSourceSchema
  }).strict(),
  items: z.array(itemSchema).max(50)
}).strict();

const procedureSchema = z.object({
  identity: z.object({
    procedureId: z.literal("PROC-SH-APPLICATION-LIFECYCLE"),
    procedureVersion: z.literal("1.0"),
    familyId: z.string().uuid(),
    lifecycleStatus: z.enum(["active", "review", "superseded", "archived"]),
    title: z.literal("Autonomous Application And Business Lifecycle")
  }).strict(),
  definition: z.object({
    accountableOwner: z.object({ roleId: z.string().uuid(), roleName: z.string().min(1) }).strict(),
    participatingRoles: z.array(z.string().min(1)),
    purpose: z.string().min(1),
    scope: z.string().min(1),
    trigger: z.string().min(1),
    entryCriteria: z.array(z.string().min(1)).min(1),
    primaryOutput: z.string().min(1),
    exitCriteria: z.array(z.string().min(1)).min(1),
    stages: z.array(z.object({
      stageKey: stageKeySchema,
      order: z.number().int().min(1).max(18),
      title: z.string().min(1),
      accountableSourceOwner: z.string().min(1),
      requiredOutput: z.string().min(1),
      exitGate: z.string().min(1),
      rollbackInstruction: z.string().nullable()
    }).strict()).length(18)
  }).strict(),
  provenance: z.object({
    definitionAuthority: z.literal("roost"),
    executionAuthority: z.literal("paperclip"),
    roostSource: z.object({
      path: z.literal("docs/governance/autonomous-application-business-lifecycle.md"),
      documentVersion: z.literal("1.0"),
      sourceSha: z.string().regex(/^[a-f0-9]{40}$/)
    }).strict(),
    operatingContractSource: lifecycleSourceSchema,
    observedAt: isoDateTimeSchema.nullable(),
    verifiedAt: isoDateTimeSchema.nullable(),
    freshness: z.enum(["current", "stale", "unavailable"])
  }).strict(),
  gates: z.array(gateSchema).max(18),
  conflicts: z.array(z.object({
    code: z.enum([
      "unsupported_schema",
      "definition_missing",
      "definition_version_mismatch",
      "definition_shape_mismatch",
      "source_unavailable",
      "source_deployed_sha_mismatch",
      "projection_conflict",
      "projection_out_of_order",
      "superseded"
    ]),
    summary: z.string().min(1)
  }).strict()),
  supersession: z.object({
    status: z.enum(["active", "superseded"]),
    supersedesVersion: z.string().nullable(),
    supersededByVersion: z.string().nullable(),
    nextReviewAt: isoDateTimeSchema.nullable()
  }).strict(),
  relations: z.object({
    offerings: z.array(z.object({
      offeringId: z.string(),
      name: z.string(),
      lifecycleStage: z.string(),
      readiness: z.enum(["GO", "NO-GO", "UNKNOWN"])
    }).strict()),
    releases: z.array(z.object({
      offeringId: z.string(),
      sourceSha: shaSchema,
      deployedSha: shaSchema,
      versionAlignment: z.enum(["aligned", "different", "unknown"]),
      readiness: z.enum(["GO", "NO-GO", "UNKNOWN"])
    }).strict()),
    decisions: z.array(z.object({
      id: z.string().uuid(),
      context: z.string(),
      chosenOption: z.string(),
      decidedAt: isoDateTimeSchema,
      reviewAt: isoDateTimeSchema.nullable()
    }).strict()),
    kpis: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
      measurementType: z.string(),
      unit: z.string().nullable(),
      targetValue: z.number().nullable(),
      currentValue: z.number().nullable(),
      status: z.string()
    }).strict()),
    evidence: z.array(evidenceSchema)
  }).strict(),
  audit: z.object({
    correlationId: z.string().uuid(),
    sourceSnapshotId: z.string(),
    packetDigestPrefix: z.string().regex(/^[a-f0-9]{12}$/),
    receivedAt: isoDateTimeSchema
  }).strict().nullable(),
  authority: z.object({
    readOnly: z.literal(true),
    executionSystem: z.literal("paperclip"),
    definitionSystem: z.literal("roost"),
    canMutatePaperclip: z.literal(false),
    canPromoteReadiness: z.literal(false)
  }).strict()
}).strict();

export const productMapReadResponseSchema = z.object({
  data: z.object({
    status: z.enum(["current", "stale", "conflict", "source_only", "unavailable"]),
    packet: packetSchema.nullable(),
    procedure: procedureSchema.nullable(),
    observedAt: isoDateTimeSchema.nullable()
  }).strict()
}).strict().superRefine((response, ctx) => {
  const { status, packet, procedure } = response.data;
  if ((status === "current" || status === "stale" || status === "conflict") && (!packet || !procedure)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "publication_state_requires_packet_and_procedure" });
  }
  if (status === "source_only" && (packet || !procedure)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "source_only_requires_definition_without_packet" });
  }
  if (status !== "unavailable" && procedure?.definition.stages.some((stage, index) => (
    stage.order !== index + 1 || stage.stageKey !== lifecycleStageKeys[index]
  ))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "procedure_stages_out_of_order" });
  }
  if ((status === "current" || status === "stale" || status === "conflict") && procedure?.gates.length !== 18) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "live_publication_requires_all_gates" });
  }
});

export type ProductMapReadResponse = z.infer<typeof productMapReadResponseSchema>;
export type ProductMapReadStatus = ProductMapReadResponse["data"]["status"];
export type ProductMapProjection = NonNullable<ProductMapReadResponse["data"]["packet"]>;
export type ProductMapProjectionItem = ProductMapProjection["items"][number];
export type LifecycleProcedureReadModel = NonNullable<ProductMapReadResponse["data"]["procedure"]>;
export type LifecycleGate = LifecycleProcedureReadModel["gates"][number];

export function parseProductMapReadResponse(value: unknown) {
  return productMapReadResponseSchema.parse(value);
}

export function isNegativeItem(item: ProductMapProjectionItem) {
  return item.readiness.status === "NO-GO" || item.readiness.zeroGapButNoGo || item.conflictState !== "none";
}

export function itemTone(status: ProductMapReadStatus, item: ProductMapProjectionItem) {
  if (status === "conflict" || status === "unavailable" || isNegativeItem(item)) return "badge-error";
  if (status !== "current" || item.readiness.status === "UNKNOWN" || item.readiness.evidenceState !== "complete") return "badge-warning";
  return "badge-success";
}

export function gateTone(status: LifecycleGate["status"]) {
  if (status === "verified") return "badge-success";
  if (status === "not_applicable") return "badge-info";
  if (status === "failed") return "badge-error";
  return "badge-warning";
}

export function projectionTone(status: ProductMapReadStatus, packet: ProductMapProjection | null) {
  if (status === "current" && packet?.sourceState === "available" && !packet.stale && packet.conflictState === "none") return "success" as const;
  if (status === "stale" || status === "source_only") return "warning" as const;
  return "error" as const;
}

export function projectionMessage(status: ProductMapReadStatus, packet: ProductMapProjection | null) {
  if (status === "source_only") return {
    title: "Lifecycle procedure published without live execution evidence",
    detail: "The Roost procedure definition is available, but no supported live execution evidence from Paperclip has been accepted. Readiness is not promoted."
  };
  if (status === "unavailable") return {
    title: "Lifecycle publication unavailable",
    detail: "The definition or last known good execution projection is not safe to present as current. Retry after the source or definition is repaired."
  };
  if (status === "conflict") return {
    title: "Lifecycle publication conflict",
    detail: "Roost is preserving the stricter verdict and the last known good evidence. Resolve the listed conflict before relying on readiness."
  };
  if (status === "stale" || packet?.stale) return {
    title: "Showing last known good lifecycle evidence",
    detail: "The procedure remains visible, but its execution evidence is stale and cannot promote readiness."
  };
  if (!packet || packet.sourceState !== "available" || packet.conflictState !== "none") return {
    title: "Lifecycle publication could not be verified",
    detail: "The response is internally inconsistent and has been treated as unavailable."
  };
  return {
    title: "Current lifecycle procedure",
    detail: "Roost publishes the definition read-only. Paperclip remains authoritative for execution, approvals, budgets, blockers, and evidence."
  };
}
