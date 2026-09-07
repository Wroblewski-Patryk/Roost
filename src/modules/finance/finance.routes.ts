import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { buildCommercialExceptionsContext } from "../commercial-exceptions/commercial-exceptions.routes";

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  market: z.string().min(1).optional(),
  status: z.enum(["candidate", "active", "archived", "needs_owner_decision"]).optional(),
  includeArchived: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(200).default(100)
}).strict();

type FinanceStatus = "candidate" | "active" | "archived" | "needs_owner_decision";

type SourceRef = {
  id: string;
  label: string;
  model: string;
  href?: string;
  confidence: "low" | "medium" | "high";
};

const pricingModels = [
  {
    id: "pricing:src-money-001:start-499-chf",
    name: "Start subscription",
    market: "CH",
    currency: "CHF",
    setupFee: null,
    recurringFee: 499,
    minimumTermMonths: 12,
    hourlyValue: null,
    cogsAssumptions: {
      opexPerMonth: 71,
      grossMarginPerClient: 428
    },
    status: "needs_owner_decision" as FinanceStatus,
    sourceRefs: [{
      id: "SRC-MONEY-001",
      label: "Google Drive Business plan",
      model: "PricingSourceInventory",
      href: "docs/planning/dms-money-pricing-discount-source-inventory.md#reviewed-sources",
      confidence: "high" as const
    }],
    riskFlags: ["conflicts_with_hybrid_model", "owner_decision_required"],
    ownerDecisionNeeded: true
  },
  {
    id: "pricing:src-money-002:hybrid-1500-150-chf",
    name: "Hybrid setup plus subscription",
    market: "CH",
    currency: "CHF",
    setupFee: 1500,
    recurringFee: 150,
    minimumTermMonths: 12,
    hourlyValue: 150,
    cogsAssumptions: {
      buildICogs: 3000,
      maintenanceCogsPerMonth: 50,
      breakEvenMonths: 15
    },
    status: "needs_owner_decision" as FinanceStatus,
    sourceRefs: [{
      id: "SRC-MONEY-002",
      label: "Google Drive Swiss pricing benchmark",
      model: "PricingSourceInventory",
      href: "docs/planning/dms-money-pricing-discount-source-inventory.md#reviewed-sources",
      confidence: "high" as const
    }],
    riskFlags: ["conflicts_with_start_subscription", "owner_decision_required"],
    ownerDecisionNeeded: true
  },
  {
    id: "pricing:src-money-002:pure-subscription-150-chf",
    name: "Pure subscription analysis",
    market: "CH",
    currency: "CHF",
    setupFee: null,
    recurringFee: 150,
    minimumTermMonths: 36,
    hourlyValue: 150,
    cogsAssumptions: {
      maintenanceCogsPerMonth: 50,
      breakEvenMonths: "30-45"
    },
    status: "candidate" as FinanceStatus,
    sourceRefs: [{
      id: "SRC-MONEY-002",
      label: "Google Drive Swiss pricing benchmark",
      model: "PricingSourceInventory",
      href: "docs/planning/dms-money-pricing-discount-source-inventory.md#reviewed-sources",
      confidence: "high" as const
    }],
    riskFlags: ["long_break_even_risk", "analysis_only"],
    ownerDecisionNeeded: true
  },
  {
    id: "pricing:src-money-003:pl-archive-1700-2200",
    name: "Historical PL website project options",
    market: "PL",
    currency: "PLN",
    setupFee: null,
    recurringFee: null,
    minimumTermMonths: null,
    hourlyValue: null,
    cogsAssumptions: {
      optionOneProjectPrice: 2200,
      optionTwoProjectPrice: 1700,
      hostingPerYear: 130,
      domainFirstYear: 10,
      domainRenewalPerYear: 50
    },
    status: "archived" as FinanceStatus,
    sourceRefs: [{
      id: "SRC-MONEY-003",
      label: "Google Drive 2. Zalozenia",
      model: "PricingSourceInventory",
      href: "docs/planning/dms-money-pricing-discount-source-inventory.md#reviewed-sources",
      confidence: "high" as const
    }],
    riskFlags: ["archive_market_only", "not_canonical_ch_pricing"],
    ownerDecisionNeeded: false
  }
];

const hourlyValueAssumptions = [
  {
    id: "hourly:src-money-002:delivery-150-chf",
    roleOrUnit: "Owner/human delivery value candidate",
    valuePerHour: 150,
    costPerHour: null,
    currency: "CHF",
    status: "needs_owner_decision" as FinanceStatus,
    capacityImpact: "Needs People/Agents capacity mapping before autonomous estimates.",
    sourceRefs: [{
      id: "SRC-MONEY-002",
      label: "Google Drive Swiss pricing benchmark",
      model: "PricingSourceInventory",
      href: "docs/planning/dms-money-pricing-discount-source-inventory.md#extracted-pricing-facts",
      confidence: "high" as const
    }],
    riskFlags: ["owner_confirmation_required", "people_agents_capacity_missing"]
  }
];

export const financeRouter = Router();

financeRouter.get("/context", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const workspaceId = req.auth!.workspaceId;
  const commercialExceptionsContext = await buildCommercialExceptionsContext(workspaceId, {
    clientId: query.clientId,
    dealId: query.dealId,
    includeArchived: query.includeArchived,
    limit: query.limit
  });

  const [deals, tasks, risks, notes] = await Promise.all([
    prisma.deal.findMany({
      where: {
        workspaceId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.dealId ? { id: query.dealId } : {})
      },
      include: { client: true, notes: true },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        status: { not: "archived" },
        OR: [
          { title: { contains: "invoice", mode: "insensitive" } },
          { title: { contains: "payment", mode: "insensitive" } },
          { title: { contains: "price", mode: "insensitive" } },
          { title: { contains: "pricing", mode: "insensitive" } },
          { title: { contains: "estimate", mode: "insensitive" } },
          { description: { contains: "invoice", mode: "insensitive" } },
          { description: { contains: "payment", mode: "insensitive" } },
          { description: { contains: "price", mode: "insensitive" } },
          { description: { contains: "pricing", mode: "insensitive" } },
          { description: { contains: "estimate", mode: "insensitive" } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    }),
    prisma.risk.findMany({
      where: {
        workspaceId,
        OR: [
          { category: { contains: "finance", mode: "insensitive" } },
          { category: { contains: "billing", mode: "insensitive" } },
          { name: { contains: "invoice", mode: "insensitive" } },
          { name: { contains: "payment", mode: "insensitive" } },
          { name: { contains: "pricing", mode: "insensitive" } },
          { description: { contains: "invoice", mode: "insensitive" } },
          { description: { contains: "payment", mode: "insensitive" } },
          { description: { contains: "pricing", mode: "insensitive" } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    }),
    prisma.note.findMany({
      where: {
        workspaceId,
        OR: [
          { content: { contains: "invoice", mode: "insensitive" } },
          { content: { contains: "payment", mode: "insensitive" } },
          { content: { contains: "pricing", mode: "insensitive" } },
          { content: { contains: "estimate", mode: "insensitive" } }
        ]
      },
      include: {
        client: true,
        deal: { include: { client: true } },
        task: true
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    })
  ]);

  const filteredPricingModels = pricingModels
    .filter((model) => query.includeArchived || model.status !== "archived")
    .filter((model) => !query.market || model.market.toLowerCase() === query.market!.toLowerCase())
    .filter((model) => !query.status || model.status === query.status);
  const filteredHourlyValueAssumptions = hourlyValueAssumptions
    .filter((item) => !query.status || item.status === query.status);
  const workValuations = deals.map((deal) => workValuationForDeal(deal));
  const invoiceReadiness = [
    ...workValuations.map((valuation) => invoiceReadinessForValuation(valuation)),
    ...commercialExceptionsContext.exceptions.map((exception) => invoiceReadinessForException(exception))
  ];
  const paymentContext = [
    ...tasks.map((task) => ({
      id: `payment-task:${task.id}`,
      sourceModel: "Task",
      sourceId: task.id,
      title: task.title,
      status: "source_only",
      dueDate: task.dueDate?.toISOString() ?? null,
      blockedActions: blockedFinanceActions()
    })),
    ...notes.map((note) => ({
      id: `payment-note:${note.id}`,
      sourceModel: "Note",
      sourceId: note.id,
      title: note.content.slice(0, 100),
      status: "source_only",
      clientId: note.clientId ?? note.deal?.clientId ?? null,
      dealId: note.dealId,
      blockedActions: blockedFinanceActions()
    }))
  ];
  const sourceConflicts = sourceConflictsFor(filteredPricingModels, commercialExceptionsContext);

  res.json({
    data: {
      workspaceId,
      query,
      summary: {
        candidatePricingModels: filteredPricingModels.filter((item) => item.status === "candidate").length,
        activePricingModels: filteredPricingModels.filter((item) => item.status === "active").length,
        needsOwnerDecision: [
          ...filteredPricingModels,
          ...filteredHourlyValueAssumptions,
          ...commercialExceptionsContext.exceptions
        ].filter((item) => item.status === "needs_owner_decision").length,
        openCommercialExceptions: commercialExceptionsContext.exceptions.filter((item) => (
          item.status === "needs_owner_decision" || item.status === "needs_source" || item.status === "proposed"
        )).length,
        invoiceReadinessBlocked: invoiceReadiness.filter((item) => item.readinessStatus === "blocked").length,
        highRiskItems: [
          ...commercialExceptionsContext.exceptions.filter((item) => item.risk === "high" || item.risk === "critical"),
          ...risks.filter((risk) => risk.riskLevel === "high" || risk.riskLevel === "critical")
        ].length
      },
      pricingModels: filteredPricingModels,
      hourlyValueAssumptions: filteredHourlyValueAssumptions,
      workValuations,
      commercialExceptions: commercialExceptionsContext.exceptions,
      invoiceReadiness,
      paymentContext,
      risks: risks.map((risk) => ({
        id: risk.id,
        name: risk.name,
        category: risk.category,
        riskLevel: risk.riskLevel,
        status: risk.status,
        sourceRef: { model: "Risk", id: risk.id, label: "Finance risk" }
      })),
      sourceConflicts,
      agentPacket: {
        mode: "read_only",
        safeActions: ["review_pricing_context", "propose_missing_source_task", "route_finance_owner_decision"],
        requiredOwnerDecisions: [
          "Select active pricing policy before quoting.",
          "Confirm hourly value assumptions before autonomous estimates.",
          "Approve commercial exceptions before invoice readiness."
        ],
        blockedActions: blockedFinanceActions()
      },
      blockedActions: blockedFinanceActions()
    }
  });
}));

function workValuationForDeal(deal: Prisma.DealGetPayload<{ include: { client: true; notes: true } }>) {
  const grossValue = decimalToNumber(deal.value);
  return {
    id: `work-valuation:deal:${deal.id}`,
    clientId: deal.clientId,
    clientName: deal.client?.name ?? null,
    dealId: deal.id,
    taskIds: [] as string[],
    acceptedEvidenceRefs: [] as SourceRef[],
    pricingModelId: null,
    estimatedHours: null,
    grossValue,
    discountValue: null,
    finalValue: grossValue,
    currency: deal.currency,
    readinessStatus: grossValue == null ? "needs_price_policy" : "needs_acceptance",
    sourceRefs: [{ id: deal.id, label: "Deal", model: "Deal", href: `/v1/deals/${deal.id}`, confidence: "high" as const }],
    riskFlags: [
      ...(!deal.clientId ? ["missing_client"] : []),
      ...(grossValue == null ? ["missing_gross_value"] : []),
      "acceptance_evidence_required",
      "owner_invoice_review_required"
    ]
  };
}

function invoiceReadinessForValuation(valuation: ReturnType<typeof workValuationForDeal>) {
  const missingEvidence = [
    ...(!valuation.clientId ? ["client"] : []),
    ...(!valuation.grossValue ? ["gross_value"] : []),
    "accepted_delivery_evidence",
    "active_price_policy",
    "invoice_provider_contract"
  ];
  return {
    id: `invoice-readiness:${valuation.id}`,
    clientId: valuation.clientId,
    dealId: valuation.dealId,
    workValuationId: valuation.id,
    readinessStatus: missingEvidence.length ? "blocked" : "ready_for_draft_review",
    missingEvidence,
    blockedActions: blockedFinanceActions()
  };
}

function invoiceReadinessForException(exception: { id: string; clientId: string | null; dealId: string | null; invoiceReadiness: string; riskFlags: string[] }) {
  return {
    id: `invoice-readiness:${exception.id}`,
    clientId: exception.clientId,
    dealId: exception.dealId,
    workValuationId: null,
    readinessStatus: exception.invoiceReadiness === "ready_for_draft_review" ? "ready_for_draft_review" : "blocked",
    missingEvidence: [
      ...exception.riskFlags,
      "invoice_provider_contract"
    ],
    blockedActions: blockedFinanceActions()
  };
}

function sourceConflictsFor(models: typeof pricingModels, commercialExceptionsContext: Awaited<ReturnType<typeof buildCommercialExceptionsContext>>) {
  const conflicts = [];
  const chModelsNeedingDecision = models.filter((model) => model.market === "CH" && model.ownerDecisionNeeded);
  if (chModelsNeedingDecision.length > 1) {
    conflicts.push({
      type: "pricing_policy_conflict",
      status: "needs_owner_decision",
      sourceIds: chModelsNeedingDecision.flatMap((model) => model.sourceRefs.map((source) => source.id)),
      message: "Multiple CH pricing policies are candidates. Owner must select active policy before quoting."
    });
  }
  conflicts.push(...commercialExceptionsContext.sourceConflicts);
  return conflicts;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value.toString());
}

function blockedFinanceActions() {
  return [
    {
      action: "set_active_price_policy",
      reason: "Active pricing policy requires an owner decision command contract."
    },
    {
      action: "quote_final_terms",
      reason: "Final commercial terms require owner approval and legal/standards review."
    },
    {
      action: "apply_discount",
      reason: "Discount application requires a dedicated approval-aware command contract."
    },
    {
      action: "send_invoice",
      reason: "Invoice sending requires a future finance provider command contract."
    },
    {
      action: "mark_payment_status",
      reason: "Payment status writes are outside the read-only finance context."
    }
  ];
}
