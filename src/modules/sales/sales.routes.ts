import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";
import { buildCommercialExceptionsContext } from "../commercial-exceptions/commercial-exceptions.routes";

const SALES_DEPARTMENT_KEY = "03-sprzedaz";
const SALES_LIMIT = 12;

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  status: z.enum(["open", "won", "lost", "archived"]).optional(),
  includeArchived: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(200).default(80)
}).strict();

const salesTerms = [
  "sales",
  "sprzedaz",
  "lead",
  "offer",
  "oferta",
  "proposal",
  "follow",
  "follow-up",
  "outreach",
  "discount",
  "pricing",
  "client",
  "klient",
  "deal",
  "crm"
];

type SalesDeal = Prisma.DealGetPayload<{
  include: {
    client: true;
    pipelineStage: true;
    notes: true;
  };
}>;

export const salesRouter = Router();

salesRouter.get("/context", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const workspaceId = req.auth!.workspaceId;
  const department = resolveDepartmentEntry(SALES_DEPARTMENT_KEY);
  const includeArchived = query.includeArchived;
  const activeStatusFilter = includeArchived ? {} : { NOT: { status: "archived" } };

  const commercialExceptionsContext = await buildCommercialExceptionsContext(workspaceId, {
    clientId: query.clientId,
    dealId: query.dealId,
    includeArchived,
    limit: query.limit
  });

  const [
    clients,
    deals,
    pipelineStages,
    interactions,
    tasks,
    notes,
    driveFiles,
    counts
  ] = await Promise.all([
    prisma.client.findMany({
      where: {
        workspaceId,
        ...(query.clientId ? { id: query.clientId } : {}),
        ...activeStatusFilter
      },
      include: {
        deals: {
          orderBy: { updatedAt: "desc" },
          take: 6,
          include: { pipelineStage: true }
        },
        interactions: { orderBy: { occurredAt: "desc" }, take: 5 },
        notes: { orderBy: { updatedAt: "desc" }, take: 5 }
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: query.limit
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.dealId ? { id: query.dealId } : {}),
        ...(query.status ? { status: query.status } : {})
      },
      include: { client: true, pipelineStage: true, notes: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: query.limit
    }),
    prisma.pipelineStage.findMany({
      where: { workspaceId },
      include: { deals: { where: { workspaceId }, take: 8, orderBy: { updatedAt: "desc" } } },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: query.limit
    }),
    prisma.interaction.findMany({
      where: {
        workspaceId,
        ...(query.clientId ? { clientId: query.clientId } : {})
      },
      include: { client: true },
      orderBy: { occurredAt: "desc" },
      take: query.limit
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          ...salesTerms.map((term) => ({ title: { contains: term, mode: "insensitive" as const } })),
          ...salesTerms.map((term) => ({ description: { contains: term, mode: "insensitive" as const } }))
        ]
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: query.limit
    }),
    prisma.note.findMany({
      where: {
        workspaceId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.dealId ? { dealId: query.dealId } : {}),
        OR: salesTerms.map((term) => ({ content: { contains: term, mode: "insensitive" as const } }))
      },
      include: { client: true, deal: { include: { client: true } }, task: true },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    }),
    prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        trashed: false,
        isFolder: false
      },
      include: { operatingArea: true },
      orderBy: [{ modifiedTime: "desc" }, { updatedAt: "desc" }],
      take: Math.max(30, Math.min(query.limit, 100))
    }),
    Promise.all([
      prisma.client.count({ where: { workspaceId, ...(includeArchived ? {} : { NOT: { status: "archived" } }) } }),
      prisma.deal.count({ where: { workspaceId, status: "open" } }),
      prisma.deal.count({ where: { workspaceId, status: "won" } }),
      prisma.interaction.count({ where: { workspaceId } }),
      prisma.task.count({ where: { workspaceId, status: { in: ["todo", "in_progress", "blocked"] } } })
    ])
  ]);

  const salesDriveFiles = driveFiles
    .filter((file) => (
      file.operatingArea?.key === department?.backendAreaKey
      || textMatchesSales(file.name, file.description, file.mimeType)
    ))
    .slice(0, SALES_LIMIT);
  const salesTasks = tasks.filter((task) => textMatchesSales(task.title, task.description)).slice(0, SALES_LIMIT);
  const salesNotes = notes.filter((note) => textMatchesSales(note.content)).slice(0, SALES_LIMIT);
  const currentClientWork = deals
    .filter((deal) => deal.status === "open" || hasCommercialExceptionForDeal(commercialExceptionsContext.exceptions, deal.id))
    .slice(0, SALES_LIMIT)
    .map((deal) => currentClientWorkForDeal(deal, commercialExceptionsContext.exceptions));
  const [clientCount, openDealCount, wonDealCount, interactionCount, openTaskCount] = counts;
  const blockedActions = blockedSalesActions();

  res.json({
    data: {
      workspaceId,
      query,
      department: {
        canonicalKey: department?.canonicalKey ?? SALES_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "sales-crm",
        name: "Sales Management System",
        purpose: "Manage demand, client opportunities, discovery, offers, follow-ups, commercial exceptions, and owner-reviewed sales decisions."
      },
      summary: {
        clients: clientCount,
        activeClients: clients.filter((client) => client.status === "active").length,
        openDeals: openDealCount,
        wonDeals: wonDealCount,
        pipelineStages: pipelineStages.length,
        interactions: interactionCount,
        followUpTasks: salesTasks.length,
        commercialExceptions: commercialExceptionsContext.exceptions.length,
        hundredPercentDiscounts: commercialExceptionsContext.summary.hundredPercentDiscounts,
        currentClientWork: currentClientWork.length,
        sourceConflicts: commercialExceptionsContext.sourceConflicts.length,
        openTasks: openTaskCount,
        salesDriveFiles: salesDriveFiles.length
      },
      clients: clients.slice(0, SALES_LIMIT).map((client) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        status: client.status,
        source: client.source,
        deals: client.deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          value: decimalToNumber(deal.value),
          currency: deal.currency,
          status: deal.status,
          pipelineStageName: deal.pipelineStage?.name ?? null
        })),
        lastInteraction: client.interactions[0] ? {
          id: client.interactions[0].id,
          type: client.interactions[0].type,
          summary: client.interactions[0].summary,
          occurredAt: client.interactions[0].occurredAt.toISOString()
        } : null,
        latestNotes: client.notes.map((note) => ({
          id: note.id,
          content: note.content.slice(0, 180),
          status: note.status,
          updatedAt: note.updatedAt.toISOString()
        }))
      })),
      deals: deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        clientId: deal.clientId,
        clientName: deal.client?.name ?? null,
        pipelineStageId: deal.pipelineStageId,
        pipelineStageName: deal.pipelineStage?.name ?? null,
        value: decimalToNumber(deal.value),
        currency: deal.currency,
        status: deal.status,
        source: deal.source,
        commercialExceptionCount: commercialExceptionsContext.exceptions.filter((item) => item.dealId === deal.id).length,
        notes: deal.notes.map((note) => ({
          id: note.id,
          content: note.content.slice(0, 180),
          status: note.status
        }))
      })),
      pipelineStages: pipelineStages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        position: stage.position,
        status: stage.status,
        dealCount: stage.deals.length,
        deals: stage.deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          value: decimalToNumber(deal.value),
          currency: deal.currency,
          status: deal.status
        }))
      })),
      interactions: interactions.slice(0, SALES_LIMIT).map((interaction) => ({
        id: interaction.id,
        clientId: interaction.clientId,
        clientName: interaction.client?.name ?? null,
        type: interaction.type,
        summary: interaction.summary,
        status: interaction.status,
        occurredAt: interaction.occurredAt.toISOString(),
        source: interaction.source
      })),
      followUpTasks: salesTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() ?? null,
        source: task.source
      })),
      salesNotes: salesNotes.map((note) => ({
        id: note.id,
        content: note.content.slice(0, 220),
        clientId: note.clientId ?? note.deal?.clientId ?? null,
        clientName: note.client?.name ?? note.deal?.client?.name ?? null,
        dealId: note.dealId,
        taskId: note.taskId,
        status: note.status,
        updatedAt: note.updatedAt.toISOString(),
        source: note.source
      })),
      commercialExceptions: commercialExceptionsContext.exceptions,
      currentClientWork,
      salesDriveFiles: salesDriveFiles.map((file) => ({
        id: file.id,
        name: file.name,
        description: file.description,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        operatingAreaKey: file.operatingArea?.key ?? null,
        modifiedTime: file.modifiedTime?.toISOString() ?? null
      })),
      financeHandoff: {
        sourceConflicts: commercialExceptionsContext.sourceConflicts,
        invoiceReadinessBlocked: commercialExceptionsContext.summary.invoiceReadinessBlocked,
        requiredOwnerDecisions: [
          "Select active pricing policy before quoting.",
          "Review commercial exceptions before sending final terms.",
          "Confirm discount reason and approval before invoice readiness."
        ]
      },
      agentPacket: {
        mode: "read_only",
        safeActions: [
          "read_sales_context",
          "inspect_client",
          "inspect_deal",
          "inspect_interaction",
          "propose_follow_up_task",
          "draft_offer_notes_for_owner_review"
        ],
        recommendedNextActions: [
          "Review open deals and commercial exceptions before preparing any offer.",
          "Use interactions and notes to propose owner-reviewed follow-ups.",
          "Send pricing, discount, and invoice questions to Finance before final terms.",
          "Route missing source or current-client work through 00 Main when confidence is low."
        ],
        blockedActions
      },
      blockedActions
    }
  });
}));

function textMatchesSales(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return salesTerms.some((term) => text.includes(term));
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value.toString());
}

function hasCommercialExceptionForDeal(
  exceptions: Array<{ dealId: string | null }>,
  dealId: string
) {
  return exceptions.some((exception) => exception.dealId === dealId);
}

function currentClientWorkForDeal(
  deal: SalesDeal,
  exceptions: Array<{
    dealId: string | null;
    discountPercent: number | null;
    status: string;
    invoiceReadiness: string;
    riskFlags: string[];
  }>
) {
  const dealExceptions = exceptions.filter((exception) => exception.dealId === deal.id);
  const hundredPercentDiscount = dealExceptions.some((exception) => exception.discountPercent === 100);
  return {
    id: `current-client-work:${deal.id}`,
    clientId: deal.clientId,
    clientName: deal.client?.name ?? null,
    dealId: deal.id,
    title: deal.title,
    status: deal.status,
    value: decimalToNumber(deal.value),
    currency: deal.currency,
    pipelineStageName: deal.pipelineStage?.name ?? null,
    commercialExceptionCount: dealExceptions.length,
    hundredPercentDiscount,
    invoiceReadiness: dealExceptions[0]?.invoiceReadiness ?? "blocked",
    riskFlags: [
      ...dealExceptions.flatMap((exception) => exception.riskFlags),
      ...(!deal.clientId ? ["missing_client"] : []),
      ...(!deal.value ? ["missing_deal_value"] : []),
      ...(hundredPercentDiscount ? ["hundred_percent_discount_requires_owner_review"] : []),
      "finance_handoff_required_before_final_terms"
    ],
    blockedActions: blockedSalesActions()
  };
}

function blockedSalesActions() {
  return [
    {
      action: "quote_final_terms",
      reason: "Final terms require owner approval, Finance context, and Legal/Standards review."
    },
    {
      action: "apply_discount",
      reason: "Discount application requires a Finance approval-aware command contract."
    },
    {
      action: "send_invoice",
      reason: "Invoices belong to the future Finance provider command contract."
    },
    {
      action: "send_outreach",
      reason: "Autonomous outreach or email sending needs a separate consent and messaging command contract."
    },
    {
      action: "launch_paid_ads",
      reason: "Paid ads and campaign spend require a future Marketing/Promotion integration contract."
    }
  ];
}
