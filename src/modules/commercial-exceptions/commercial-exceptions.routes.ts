import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
  exceptionType: z.string().min(1).optional(),
  includeArchived: z.coerce.boolean().default(false),
  risk: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
}).strict();

export type CommercialExceptionQuery = Partial<z.input<typeof querySchema>>;

type RiskLevel = "low" | "medium" | "high" | "critical";
type ExceptionStatus = "proposed" | "needs_owner_decision" | "approved" | "rejected" | "needs_source" | "archived";
type SourceFamily = "approval" | "decision" | "deal" | "task" | "note" | "interaction" | "agent_event" | "risk";

type SourceRef = {
  label: string;
  model: string;
  id: string;
  href?: string;
};

type CommercialException = {
  id: string;
  sourceFamily: SourceFamily;
  sourceId: string;
  exceptionType: string;
  status: ExceptionStatus;
  clientId: string | null;
  clientName: string | null;
  dealId: string | null;
  taskIds: string[];
  grossValue: number | null;
  discountPercent: number | null;
  discountValue: number | null;
  finalValue: number | null;
  currency: string | null;
  reason: string | null;
  reasonCategory: string;
  approvalId: string | null;
  approvalStatus: string | null;
  risk: RiskLevel;
  riskFlags: string[];
  invoiceReadiness: "blocked" | "pending_review" | "ready_for_draft_review" | "not_applicable";
  learningLoop: string | null;
  sourceRefs: SourceRef[];
  allowedActions: string[];
  blockedActions: Array<{ action: string; reason: string }>;
  createdAt: string;
  updatedAt: string;
};

const commercialTerms = [
  "discount",
  "discounted",
  "invoice.discount",
  "commercial exception",
  "commercial_exception",
  "pro bono",
  "pro-bono",
  "probono",
  "goodwill",
  "portfolio",
  "recovery",
  "trial",
  "strategic",
  "gratis",
  "free",
  "100%"
];

export const commercialExceptionsRouter = Router();

export async function buildCommercialExceptionsContext(workspaceId: string, queryInput: CommercialExceptionQuery = {}) {
  const query = querySchema.parse(queryInput);
  const perSourceLimit = Math.max(20, Math.min(query.limit, 75));

  const [
    approvals,
    decisions,
    deals,
    tasks,
    notes,
    interactions,
    risks,
    agentEvents
  ] = await Promise.all([
    prisma.approval.findMany({
      where: {
        workspaceId,
        OR: commercialTerms.map((term) => ({ requestedForAction: { contains: term, mode: "insensitive" as const } }))
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.decision.findMany({
      where: {
        workspaceId,
        OR: [
          ...commercialTerms.map((term) => ({ title: { contains: term, mode: "insensitive" as const } })),
          ...commercialTerms.map((term) => ({ rationale: { contains: term, mode: "insensitive" as const } })),
          ...commercialTerms.map((term) => ({ outcome: { contains: term, mode: "insensitive" as const } }))
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        OR: [
          ...commercialTerms.map((term) => ({ title: { contains: term, mode: "insensitive" as const } })),
          { notes: { some: { OR: commercialTerms.map((term) => ({ content: { contains: term, mode: "insensitive" as const } })) } } }
        ]
      },
      include: { client: true, notes: true },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        status: { not: "archived" },
        OR: [
          ...commercialTerms.map((term) => ({ title: { contains: term, mode: "insensitive" as const } })),
          ...commercialTerms.map((term) => ({ description: { contains: term, mode: "insensitive" as const } }))
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.note.findMany({
      where: {
        workspaceId,
        OR: commercialTerms.map((term) => ({ content: { contains: term, mode: "insensitive" as const } }))
      },
      include: {
        client: true,
        deal: { include: { client: true } },
        task: true
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.interaction.findMany({
      where: {
        workspaceId,
        OR: [
          ...commercialTerms.map((term) => ({ type: { contains: term, mode: "insensitive" as const } })),
          ...commercialTerms.map((term) => ({ summary: { contains: term, mode: "insensitive" as const } }))
        ]
      },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.risk.findMany({
      where: {
        workspaceId,
        OR: [
          ...commercialTerms.map((term) => ({ name: { contains: term, mode: "insensitive" as const } })),
          ...commercialTerms.map((term) => ({ description: { contains: term, mode: "insensitive" as const } })),
          { category: { contains: "finance", mode: "insensitive" as const } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.agentEventOutbox.findMany({
      where: {
        workspaceId,
        OR: [
          ...commercialTerms.map((term) => ({ eventType: { contains: term, mode: "insensitive" as const } })),
          { payload: { path: ["requestedAction"], string_contains: "discount" } },
          { payload: { path: ["note"], string_contains: "discount" } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    })
  ]);

  const dealById = new Map(deals.map((deal) => [deal.id, deal]));

  const exceptions = [
    ...approvals.map((approval) => {
      const linkedDealId = resourceIdIf(approval.resourceType, approval.resourceId, "deal");
      const linkedDeal = linkedDealId ? dealById.get(linkedDealId) : null;
      return commercialException({
        sourceFamily: "approval",
        sourceId: approval.id,
        sourceText: `${approval.requestedForAction} ${approval.decisionReason ?? ""}`,
        title: approval.requestedForAction,
        status: statusFromApproval(approval.status),
        approvalId: approval.id,
        approvalStatus: approval.status,
        risk: approval.riskLevel,
        clientId: linkedDeal?.clientId ?? resourceIdIf(approval.resourceType, approval.resourceId, "client"),
        clientName: linkedDeal?.client?.name ?? null,
        dealId: linkedDealId,
        grossValue: decimalToNumber(linkedDeal?.value),
        currency: linkedDeal?.currency ?? null,
        reason: approval.decisionReason,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        sourceRefs: [{ label: "Approval", model: "Approval", id: approval.id, href: `/v1/company-os/approvals/${approval.id}` }]
      });
    }),
    ...decisions.map((decision) => commercialException({
      sourceFamily: "decision",
      sourceId: decision.id,
      sourceText: `${decision.title} ${decision.rationale ?? ""} ${decision.outcome ?? ""}`,
      title: decision.title,
      status: decision.status === "rejected" ? "rejected" : "needs_owner_decision",
      reason: decision.rationale ?? decision.outcome,
      risk: "medium",
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt,
      sourceRefs: [{ label: "Decision", model: "Decision", id: decision.id, href: `/v1/decisions/${decision.id}` }]
    })),
    ...deals.map((deal) => commercialException({
      sourceFamily: "deal",
      sourceId: deal.id,
      sourceText: `${deal.title} ${deal.notes.map((note) => note.content).join(" ")}`,
      title: deal.title,
      status: "needs_owner_decision",
      clientId: deal.clientId,
      clientName: deal.client?.name ?? null,
      dealId: deal.id,
      grossValue: decimalToNumber(deal.value),
      currency: deal.currency,
      reason: deal.notes.find((note) => hasCommercialTerm(note.content))?.content ?? null,
      risk: "medium",
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      sourceRefs: [{ label: "Deal", model: "Deal", id: deal.id, href: `/v1/deals/${deal.id}` }]
    })),
    ...tasks.map((task) => commercialException({
      sourceFamily: "task",
      sourceId: task.id,
      sourceText: `${task.title} ${task.description ?? ""}`,
      title: task.title,
      status: "needs_source",
      taskIds: [task.id],
      reason: task.description,
      risk: inferRisk(`${task.title} ${task.description ?? ""}`),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      sourceRefs: [{ label: "Task", model: "Task", id: task.id, href: `/v1/tasks/${task.id}` }]
    })),
    ...notes.map((note) => commercialException({
      sourceFamily: "note",
      sourceId: note.id,
      sourceText: note.content,
      title: note.content.slice(0, 80),
      status: "needs_owner_decision",
      clientId: note.clientId ?? note.deal?.clientId ?? null,
      clientName: note.client?.name ?? note.deal?.client?.name ?? null,
      dealId: note.dealId,
      taskIds: note.taskId ? [note.taskId] : [],
      grossValue: decimalToNumber(note.deal?.value),
      currency: note.deal?.currency ?? null,
      reason: note.content,
      risk: "medium",
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      sourceRefs: [{ label: "Note", model: "Note", id: note.id, href: `/v1/notes/${note.id}` }]
    })),
    ...interactions.map((interaction) => commercialException({
      sourceFamily: "interaction",
      sourceId: interaction.id,
      sourceText: `${interaction.type} ${interaction.summary ?? ""}`,
      title: interaction.type,
      status: "needs_owner_decision",
      clientId: interaction.clientId,
      clientName: interaction.client?.name ?? null,
      reason: interaction.summary,
      risk: "medium",
      createdAt: interaction.createdAt,
      updatedAt: interaction.updatedAt,
      sourceRefs: [{ label: "Interaction", model: "Interaction", id: interaction.id, href: `/v1/interactions/${interaction.id}` }]
    })),
    ...risks.map((risk) => commercialException({
      sourceFamily: "risk",
      sourceId: risk.id,
      sourceText: `${risk.name} ${risk.description ?? ""} ${risk.category ?? ""}`,
      title: risk.name,
      status: "needs_owner_decision",
      reason: risk.description,
      risk: risk.riskLevel,
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
      sourceRefs: [{ label: "Risk", model: "Risk", id: risk.id, href: `/v1/company-os/risks/${risk.id}` }]
    })),
    ...agentEvents.map((event) => commercialException({
      sourceFamily: "agent_event",
      sourceId: event.id,
      sourceText: `${event.eventType} ${JSON.stringify(event.payload)}`,
      title: event.eventType,
      status: "proposed",
      reason: stringifySummary(event.payload),
      risk: inferRisk(`${event.eventType} ${JSON.stringify(event.payload)}`),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      sourceRefs: [{ label: "Agent event", model: "AgentEventOutbox", id: event.id, href: `/v1/agent-events?targetAgent=${event.targetAgent ?? ""}` }]
    }))
  ]
    .filter((exception) => query.includeArchived || exception.status !== "archived")
    .filter((exception) => !query.clientId || exception.clientId === query.clientId)
    .filter((exception) => !query.dealId || exception.dealId === query.dealId)
    .filter((exception) => !query.status || exception.status === query.status)
    .filter((exception) => !query.exceptionType || exception.exceptionType === query.exceptionType)
    .filter((exception) => !query.risk || exception.risk === query.risk)
    .sort(compareExceptions)
    .slice(0, query.limit);

  return {
    workspaceId,
    query,
    summary: summarize(exceptions),
    exceptions,
    sourceConflicts: sourceConflicts(exceptions),
    agentPacket: {
      mode: "read_only",
      safeActions: ["review_exception", "propose_missing_source_task", "route_to_sales_or_finance_review"],
      blockedActions: blockedActions()
    },
    blockedActions: blockedActions()
  };
}

commercialExceptionsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const data = await buildCommercialExceptionsContext(workspaceId, req.query);
  res.json({ data });
}));

function commercialException(input: {
  sourceFamily: SourceFamily;
  sourceId: string;
  sourceText: string;
  title: string;
  status: ExceptionStatus;
  clientId?: string | null;
  clientName?: string | null;
  dealId?: string | null;
  taskIds?: string[];
  grossValue?: number | null;
  currency?: string | null;
  reason?: string | null;
  approvalId?: string | null;
  approvalStatus?: string | null;
  risk: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
  sourceRefs: SourceRef[];
}): CommercialException {
  const discountPercent = inferDiscountPercent(input.sourceText);
  const grossValue = input.grossValue ?? null;
  const discountValue = grossValue != null && discountPercent != null
    ? roundMoney(grossValue * (discountPercent / 100))
    : null;
  const finalValue = grossValue != null && discountValue != null
    ? roundMoney(grossValue - discountValue)
    : null;
  const exceptionType = inferExceptionType(input.sourceText);
  const reasonCategory = inferReasonCategory(input.sourceText);
  const riskFlags = riskFlagsFor({
    clientId: input.clientId ?? null,
    grossValue,
    reason: input.reason ?? null,
    approvalId: input.approvalId ?? null,
    discountPercent,
    risk: input.risk
  });
  const status = normalizeStatus(input.status, riskFlags);

  return {
    id: `${input.sourceFamily}:${input.sourceId}`,
    sourceFamily: input.sourceFamily,
    sourceId: input.sourceId,
    exceptionType,
    status,
    clientId: input.clientId ?? null,
    clientName: input.clientName ?? null,
    dealId: input.dealId ?? null,
    taskIds: input.taskIds ?? [],
    grossValue,
    discountPercent,
    discountValue,
    finalValue,
    currency: input.currency ?? null,
    reason: input.reason ?? null,
    reasonCategory,
    approvalId: input.approvalId ?? null,
    approvalStatus: input.approvalStatus ?? null,
    risk: riskFromFlags(input.risk, riskFlags),
    riskFlags,
    invoiceReadiness: invoiceReadiness(status, riskFlags),
    learningLoop: "Create post-delivery feedback or retro task before using this exception as pricing evidence.",
    sourceRefs: input.sourceRefs,
    allowedActions: ["review_exception", "create_follow_up_task", "request_owner_review"],
    blockedActions: blockedActions(),
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString()
  };
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value.toString());
}

function hasCommercialTerm(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();
  return commercialTerms.some((term) => text.includes(term));
}

function inferDiscountPercent(value: string) {
  const text = value.toLowerCase();
  if (text.includes("100%") || text.includes("100 percent") || text.includes("100 procent")) {
    return 100;
  }
  const percent = text.match(/(\d{1,3})\s*%/);
  if (!percent) {
    return text.includes("free") || text.includes("gratis") || text.includes("pro bono") ? 100 : null;
  }
  return Math.min(100, Number(percent[1]));
}

function inferExceptionType(value: string) {
  const text = value.toLowerCase();
  if (text.includes("pro bono") || text.includes("pro-bono") || text.includes("gratis") || text.includes("free")) return "pro_bono";
  if (text.includes("goodwill")) return "goodwill";
  if (text.includes("portfolio")) return "portfolio";
  if (text.includes("recovery")) return "recovery";
  if (text.includes("trial")) return "trial";
  if (text.includes("strategic")) return "strategic";
  if (text.includes("discount") || text.includes("100%")) return "discount";
  return "unknown";
}

function inferReasonCategory(value: string) {
  const text = value.toLowerCase();
  for (const category of ["portfolio", "goodwill", "recovery", "trial", "strategic", "relationship"]) {
    if (text.includes(category)) {
      return category;
    }
  }
  return "unknown";
}

function statusFromApproval(status: string): ExceptionStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "needs_owner_decision";
}

function resourceIdIf(resourceType: string, resourceId: string | null, expected: string) {
  return resourceId && resourceType.toLowerCase().includes(expected) ? resourceId : null;
}

function riskFlagsFor(input: {
  clientId: string | null;
  grossValue: number | null;
  reason: string | null;
  approvalId: string | null;
  discountPercent: number | null;
  risk: RiskLevel;
}) {
  const flags = [];
  if (!input.clientId) flags.push("missing_client");
  if (input.grossValue == null) flags.push("missing_gross_value");
  if (!input.reason?.trim()) flags.push("missing_reason");
  if (!input.approvalId) flags.push("missing_owner_approval");
  if (input.discountPercent === 100) flags.push("hundred_percent_discount");
  if (input.discountPercent == null) flags.push("missing_discount_percent");
  if (input.risk === "high" || input.risk === "critical") flags.push("high_risk_source");
  flags.push("invoice_clarity_required");
  return flags;
}

function normalizeStatus(status: ExceptionStatus, flags: string[]): ExceptionStatus {
  if (status === "approved" || status === "rejected" || status === "archived") {
    return status;
  }
  if (flags.includes("missing_client") || flags.includes("missing_gross_value") || flags.includes("missing_reason")) {
    return "needs_source";
  }
  if (flags.includes("missing_owner_approval")) {
    return "needs_owner_decision";
  }
  return status;
}

function riskFromFlags(baseRisk: RiskLevel, flags: string[]): RiskLevel {
  if (flags.includes("hundred_percent_discount") || flags.includes("missing_owner_approval")) {
    return baseRisk === "critical" ? "critical" : "high";
  }
  return baseRisk;
}

function invoiceReadiness(status: ExceptionStatus, flags: string[]): CommercialException["invoiceReadiness"] {
  if (status === "approved" && !flags.includes("missing_gross_value") && !flags.includes("missing_client")) {
    return "ready_for_draft_review";
  }
  if (flags.includes("missing_gross_value") || flags.includes("missing_client") || flags.includes("missing_owner_approval")) {
    return "blocked";
  }
  return "pending_review";
}

function inferRisk(value: string): RiskLevel {
  const text = value.toLowerCase();
  if (["payment", "invoice", "legal", "critical"].some((term) => text.includes(term))) return "critical";
  if (["100%", "discount", "approval", "risk"].some((term) => text.includes(term))) return "high";
  return "medium";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function stringifySummary(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function blockedActions() {
  return [
    {
      action: "apply_discount",
      reason: "Commercial exceptions are read-only until an approval-aware discount command exists."
    },
    {
      action: "send_invoice",
      reason: "Invoice sending requires a separate finance, legal, provider, and owner-confirmation command contract."
    },
    {
      action: "mark_payment_status",
      reason: "Payment status writes are outside the commercial exception read model."
    },
    {
      action: "quote_final_terms",
      reason: "Final commercial terms require owner approval and active pricing policy."
    }
  ];
}

function compareExceptions(left: CommercialException, right: CommercialException) {
  return riskRank(left.risk) - riskRank(right.risk)
    || statusRank(left.status) - statusRank(right.status)
    || right.updatedAt.localeCompare(left.updatedAt);
}

function riskRank(risk: RiskLevel) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[risk];
}

function statusRank(status: ExceptionStatus) {
  return {
    needs_owner_decision: 0,
    needs_source: 1,
    proposed: 2,
    approved: 3,
    rejected: 4,
    archived: 5
  }[status];
}

function summarize(exceptions: CommercialException[]) {
  return {
    total: exceptions.length,
    needsOwnerDecision: exceptions.filter((item) => item.status === "needs_owner_decision").length,
    approved: exceptions.filter((item) => item.status === "approved").length,
    missingClient: exceptions.filter((item) => item.riskFlags.includes("missing_client")).length,
    missingReason: exceptions.filter((item) => item.riskFlags.includes("missing_reason")).length,
    missingGrossValue: exceptions.filter((item) => item.riskFlags.includes("missing_gross_value")).length,
    invoiceReadinessBlocked: exceptions.filter((item) => item.invoiceReadiness === "blocked").length,
    hundredPercentDiscounts: exceptions.filter((item) => item.discountPercent === 100).length
  };
}

function sourceConflicts(exceptions: CommercialException[]) {
  const missingSourceCount = exceptions.filter((item) => item.status === "needs_source").length;
  const missingApprovalCount = exceptions.filter((item) => item.riskFlags.includes("missing_owner_approval")).length;
  return [
    missingSourceCount ? {
      type: "missing_source",
      count: missingSourceCount,
      message: "Some commercial exceptions are missing client, value, reason, or source evidence."
    } : null,
    missingApprovalCount ? {
      type: "missing_owner_approval",
      count: missingApprovalCount,
      message: "Some commercial exceptions require owner approval before invoice readiness."
    } : null
  ].filter(Boolean);
}
