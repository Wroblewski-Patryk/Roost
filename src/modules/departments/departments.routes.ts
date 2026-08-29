import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { normalizeDepartmentKey } from "../../operating-model/department-registry";

type ViewDefinition = {
  id: string;
  label: string;
  href: string | null;
  icon: string;
  sourceDepartmentKey: string;
  enabled: boolean;
};

const DEFAULT_DEPARTMENTS = [
  { key: "00-ogolny", name: "00 General", description: "Company orchestration, routing, and cross-department command.", icon: "ph-map-trifold", position: 0, linkedViews: ["general.overview", "general.company-updates"] },
  { key: "01-strategia", name: "01 Strategy", description: "Strategic goals, decisions, priorities, and roadmap governance.", icon: "ph-target", position: 1, linkedViews: ["strategy.goals", "strategy.initiatives", "strategy.decisions"] },
  { key: "02-produkt", name: "02 Product", description: "Product and service definition, delivery scope, and improvement loops.", icon: "ph-package", position: 2, linkedViews: ["product.overview", "product.requirements", "product.deliverables"] },
  { key: "03-sprzedaz", name: "03 Sales", description: "Lead, offer, deal, and commercial follow-up management.", icon: "ph-handshake", position: 3, linkedViews: ["sales.overview", "sales.offers"] },
  { key: "04-operacje", name: "04 Operations", description: "Procedures, task boards, calendars, routines, and operational controls.", icon: "ph-list-checks", position: 4, linkedViews: ["operations.tasks", "operations.calendar", "operations.procedures", "operations.issues", "operations.events"] },
  { key: "05-relacje", name: "05 Relationships", description: "Clients, partners, support, feedback, and relationship evidence.", icon: "ph-address-book", position: 5, linkedViews: ["relationships.overview", "relationships.feedback"] },
  { key: "06-kadry", name: "06 People / Agents", description: "People, AI agents, roles, responsibilities, and workload context.", icon: "ph-users-three", position: 6, linkedViews: ["people.directory", "people.competencies"] },
  { key: "07-finanse", name: "07 Finance", description: "Revenue, costs, budgets, invoices, and commercial exceptions.", icon: "ph-bank", position: 7, linkedViews: ["finance.overview", "finance.budgets", "finance.invoices"] },
  { key: "08-zasoby", name: "08 Assets", description: "Files, folders, resources, repositories, prompts, and knowledge roots.", icon: "ph-folder-open", position: 8, linkedViews: ["assets.overview", "assets.files", "assets.knowledge"] },
  { key: "09-technologia", name: "09 Technology", description: "Code, infrastructure, deployments, integrations, and technical health.", icon: "ph-cpu", position: 9, linkedViews: ["technology.overview", "technology.goals", "technology.integrations", "technology.automations", "technology.incidents", "technology.environments"] },
  { key: "10-prawo", name: "10 Legal", description: "Contracts, compliance, approvals, and legal risk control.", icon: "ph-scales", position: 10, linkedViews: ["legal.overview", "legal.contracts", "legal.compliance"] },
  { key: "11-innowacje", name: "11 Innovation", description: "Research, experiments, discovery, and improvement portfolio.", icon: "ph-lightbulb", position: 11, linkedViews: ["innovation.overview", "innovation.application-graph", "product.requirements", "innovation.experiments"] },
  { key: "12-zarzadzanie", name: "12 Management", description: "Executive control, department administration, approvals, and portfolio steering.", icon: "ph-chart-line-up", position: 12, linkedViews: ["management.departments", "management.portfolio", "management.escalations", "management.reviews"] }
] as const;

const AVAILABLE_VIEWS: ViewDefinition[] = [
  { id: "general.overview", label: "Company dashboard", href: "/areas?area=00-ogolny&view=overview", icon: "ph-gauge", sourceDepartmentKey: "00-ogolny", enabled: true },
  { id: "general.company-updates", label: "Company updates", href: "/areas?area=00-ogolny&view=company-updates", icon: "ph-broadcast", sourceDepartmentKey: "00-ogolny", enabled: true },
  { id: "strategy.goals", label: "All company goals", href: "/areas?area=01-strategia&view=goals", icon: "ph-target", sourceDepartmentKey: "01-strategia", enabled: true },
  { id: "strategy.initiatives", label: "Strategic initiatives", href: "/areas?area=01-strategia&view=initiatives", icon: "ph-flag", sourceDepartmentKey: "01-strategia", enabled: true },
  { id: "strategy.decisions", label: "Decision register", href: "/areas?area=01-strategia&view=decisions", icon: "ph-signpost", sourceDepartmentKey: "01-strategia", enabled: true },
  { id: "product.overview", label: "Products and services", href: "/areas?area=02-produkt&view=overview", icon: "ph-package", sourceDepartmentKey: "02-produkt", enabled: true },
  { id: "product.requirements", label: "Requirements", href: "/areas?area=02-produkt&view=requirements", icon: "ph-list-magnifying-glass", sourceDepartmentKey: "02-produkt", enabled: true },
  { id: "product.deliverables", label: "Deliverables", href: "/areas?area=02-produkt&view=deliverables", icon: "ph-package", sourceDepartmentKey: "02-produkt", enabled: true },
  { id: "sales.overview", label: "Sales overview", href: "/areas?area=03-sprzedaz&view=overview", icon: "ph-gauge", sourceDepartmentKey: "03-sprzedaz", enabled: true },
  { id: "sales.offers", label: "Commercial offers", href: "/areas?area=03-sprzedaz&view=offers", icon: "ph-file-text", sourceDepartmentKey: "03-sprzedaz", enabled: true },
  { id: "operations.tasks", label: "Operations tasks", href: "/areas?area=04-operacje&view=tasks", icon: "ph-list-checks", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "operations.calendar", label: "Operations calendar", href: "/areas?area=04-operacje&view=calendar", icon: "ph-calendar-blank", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "operations.procedures", label: "Operations procedures", href: "/areas?area=04-operacje&view=procedures", icon: "ph-list-numbers", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "operations.issues", label: "Operational issues", href: "/areas?area=04-operacje&view=issues", icon: "ph-warning-circle", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "operations.events", label: "Operational events", href: "/areas?area=04-operacje&view=events", icon: "ph-calendar-dots", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "relationships.overview", label: "Relationships overview", href: "/areas?area=05-relacje&view=overview", icon: "ph-address-book", sourceDepartmentKey: "05-relacje", enabled: true },
  { id: "relationships.feedback", label: "Feedback", href: "/areas?area=05-relacje&view=feedback", icon: "ph-chat-centered-text", sourceDepartmentKey: "05-relacje", enabled: true },
  { id: "people.directory", label: "People and agents directory", href: "/areas?area=06-kadry&view=directory", icon: "ph-users-three", sourceDepartmentKey: "06-kadry", enabled: true },
  { id: "people.competencies", label: "Competencies", href: "/areas?area=06-kadry&view=competencies", icon: "ph-brain", sourceDepartmentKey: "06-kadry", enabled: true },
  { id: "finance.overview", label: "Finance overview", href: "/areas?area=07-finanse&view=overview", icon: "ph-bank", sourceDepartmentKey: "07-finanse", enabled: true },
  { id: "finance.budgets", label: "Budgets", href: "/areas?area=07-finanse&view=budgets", icon: "ph-chart-pie-slice", sourceDepartmentKey: "07-finanse", enabled: true },
  { id: "finance.invoices", label: "Invoices", href: "/areas?area=07-finanse&view=invoices", icon: "ph-receipt", sourceDepartmentKey: "07-finanse", enabled: true },
  { id: "assets.overview", label: "Assets overview", href: "/areas?area=08-zasoby&view=overview", icon: "ph-gauge", sourceDepartmentKey: "08-zasoby", enabled: true },
  { id: "assets.files", label: "Assets files and folders", href: "/areas?area=08-zasoby&view=files", icon: "ph-folders", sourceDepartmentKey: "08-zasoby", enabled: true },
  { id: "assets.knowledge", label: "Knowledge records", href: "/areas?area=08-zasoby&view=knowledge", icon: "ph-book-open-text", sourceDepartmentKey: "08-zasoby", enabled: true },
  { id: "technology.overview", label: "Technology overview", href: "/areas?area=09-technologia&view=overview", icon: "ph-gauge", sourceDepartmentKey: "09-technologia", enabled: true },
  { id: "technology.goals", label: "Technology goals", href: "/areas?area=09-technologia&view=goals", icon: "ph-target", sourceDepartmentKey: "01-strategia", enabled: true },
  { id: "technology.integrations", label: "Integrations", href: "/areas?area=09-technologia&view=integrations", icon: "ph-plugs-connected", sourceDepartmentKey: "09-technologia", enabled: true },
  { id: "technology.automations", label: "Automations", href: "/areas?area=09-technologia&view=automations", icon: "ph-lightning", sourceDepartmentKey: "09-technologia", enabled: true },
  { id: "technology.incidents", label: "Technical incidents", href: "/areas?area=09-technologia&view=incidents", icon: "ph-siren", sourceDepartmentKey: "09-technologia", enabled: true },
  { id: "technology.environments", label: "Environments", href: "/areas?area=09-technologia&view=environments", icon: "ph-cloud", sourceDepartmentKey: "09-technologia", enabled: true },
  { id: "legal.overview", label: "Legal overview", href: "/areas?area=10-prawo&view=overview", icon: "ph-scales", sourceDepartmentKey: "10-prawo", enabled: true },
  { id: "legal.contracts", label: "Contracts", href: "/areas?area=10-prawo&view=contracts", icon: "ph-file-lock", sourceDepartmentKey: "10-prawo", enabled: true },
  { id: "legal.compliance", label: "Compliance", href: "/areas?area=10-prawo&view=compliance", icon: "ph-shield-check", sourceDepartmentKey: "10-prawo", enabled: true },
  { id: "innovation.overview", label: "Product engineering", href: "/areas?area=11-innowacje&view=overview", icon: "ph-lightbulb", sourceDepartmentKey: "11-innowacje", enabled: true },
  { id: "innovation.application-graph", label: "Application Graph", href: "/areas?area=11-innowacje&view=application-graph", icon: "ph-graph", sourceDepartmentKey: "11-innowacje", enabled: true },
  { id: "innovation.experiments", label: "Experiments", href: "/areas?area=11-innowacje&view=experiments", icon: "ph-flask", sourceDepartmentKey: "11-innowacje", enabled: true },
  { id: "management.departments", label: "Department management", href: "/areas?area=12-zarzadzanie&view=departments", icon: "ph-buildings", sourceDepartmentKey: "12-zarzadzanie", enabled: true },
  { id: "management.portfolio", label: "Portfolio steering", href: "/areas?area=12-zarzadzanie&view=portfolio", icon: "ph-briefcase", sourceDepartmentKey: "12-zarzadzanie", enabled: true },
  { id: "management.escalations", label: "Escalations and blockers", href: "/areas?area=12-zarzadzanie&view=escalations", icon: "ph-warning-octagon", sourceDepartmentKey: "12-zarzadzanie", enabled: true },
  { id: "management.reviews", label: "Management reviews", href: "/areas?area=12-zarzadzanie&view=reviews", icon: "ph-clipboard-text", sourceDepartmentKey: "12-zarzadzanie", enabled: true }
];

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().min(1).max(80).optional(),
  linkedViews: z.array(z.string().trim().min(1)).default([])
}).strict();

const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().min(1).max(80).optional(),
  position: z.coerce.number().int().min(0).max(999).optional(),
  status: z.enum(["active", "archived"]).optional(),
  linkedViews: z.array(z.string().trim().min(1)).optional()
}).strict();

export const departmentsRouter = Router();

function linkedViews(value: unknown) {
  const allowed = new Set(AVAILABLE_VIEWS.map((view) => view.id));
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && allowed.has(item)) : [];
}

function viewSummaries(viewIds: string[]) {
  const byId = new Map(AVAILABLE_VIEWS.map((view) => [view.id, view]));
  return viewIds.map((id) => byId.get(id)).filter((view): view is ViewDefinition => Boolean(view));
}

function serializeDepartment(department: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  position: number;
  isSystem: boolean;
  status: string;
  linkedViews: unknown;
  updatedAt: Date;
}) {
  const viewIds = linkedViews(department.linkedViews);
  const views = viewSummaries(viewIds);
  return {
    id: department.id,
    key: department.key,
    name: department.name,
    description: department.description,
    icon: department.icon,
    position: department.position,
    isSystem: department.isSystem,
    status: department.status,
    linkedViews: viewIds,
    views,
    href: views.find((view) => view.enabled && view.href)?.href ?? null,
    updatedAt: department.updatedAt.toISOString()
  };
}

export async function ensureDefaultDepartments(workspaceId: string) {
  await Promise.all(DEFAULT_DEPARTMENTS.map(async (department) => {
    const existing = await prisma.workspaceDepartment.findUnique({
      where: { workspaceId_key: { workspaceId, key: department.key } }
    });
    const mergedViews = [...new Set([
      ...linkedViews(existing?.linkedViews),
      ...department.linkedViews
    ])];
    await prisma.workspaceDepartment.upsert({
      where: { workspaceId_key: { workspaceId, key: department.key } },
      update: { linkedViews: mergedViews },
      create: {
        workspaceId,
        key: department.key,
        name: department.name,
        description: department.description,
        icon: department.icon,
        position: department.position,
        isSystem: true,
        linkedViews: [...department.linkedViews]
      }
    });
  }));
  const departments = await prisma.workspaceDepartment.findMany({ where: { workspaceId } });
  const byKey = new Map(departments.map((department) => [department.key, department]));
  await Promise.all(AVAILABLE_VIEWS.map(async (view, displayOrder) => {
    const canonicalDepartment = byKey.get(view.sourceDepartmentKey);
    if (!canonicalDepartment) return;
    const routeView = view.href ? new URL(view.href, "https://roost.local").searchParams.get("view") || "overview" : "overview";
    const definition = await prisma.departmentViewDefinition.upsert({
      where: { workspaceId_key: { workspaceId, key: view.id } },
      update: { label: view.label, icon: view.icon, canonicalDepartmentId: canonicalDepartment.id, routeView, displayOrder, enabled: view.enabled },
      create: { workspaceId, key: view.id, label: view.label, icon: view.icon, canonicalDepartmentId: canonicalDepartment.id, routeView, defaultScope: {}, permissions: ["workspace.read", "workspace.write"], displayOrder, enabled: view.enabled }
    });
    const globallyContextualViews = new Set(["strategy.goals", "operations.tasks", "operations.procedures", "assets.files"]);
    const availableDepartmentKeys = globallyContextualViews.has(view.id)
      ? DEFAULT_DEPARTMENTS.map((department) => department.key)
      : DEFAULT_DEPARTMENTS.filter((department) => department.linkedViews.includes(view.id as never)).map((department) => department.key);
    await Promise.all(availableDepartmentKeys.map(async (departmentKey, availabilityOrder) => {
      const department = byKey.get(departmentKey);
      if (!department) return;
      await prisma.departmentViewAvailability.upsert({
        where: { viewId_departmentId: { viewId: definition.id, departmentId: department.id } },
        update: { displayOrder: availabilityOrder, enabled: view.enabled, isCore: departmentKey === view.sourceDepartmentKey },
        create: { workspaceId, viewId: definition.id, departmentId: department.id, displayOrder: availabilityOrder, enabled: view.enabled, isCore: departmentKey === view.sourceDepartmentKey }
      });
    }));
  }));
}

async function uniqueDepartmentKey(workspaceId: string, name: string) {
  const base = normalizeDepartmentKey(name) || "department";
  for (let index = 0; index < 100; index += 1) {
    const key = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await prisma.workspaceDepartment.findUnique({ where: { workspaceId_key: { workspaceId, key } } });
    if (!existing) {
      return key;
    }
  }
  return `${base}-${Date.now()}`;
}

function validLinkedViewsOrError(values: string[]) {
  const allowed = new Set(AVAILABLE_VIEWS.map((view) => view.id));
  return values.every((value) => allowed.has(value));
}

departmentsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  await ensureDefaultDepartments(workspaceId);
  const [departments, viewDefinitions] = await Promise.all([
    prisma.workspaceDepartment.findMany({ where: { workspaceId }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
    prisma.departmentViewDefinition.findMany({ where: { workspaceId, enabled: true }, include: { canonicalDepartment: { select: { key: true } }, availability: { where: { enabled: true }, include: { department: { select: { key: true } } }, orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } })
  ]);

  res.json({
    data: {
      departments: departments.map(serializeDepartment),
      availableViews: viewDefinitions.map((view) => ({
        id: view.key, label: view.label, icon: view.icon, sourceDepartmentKey: view.canonicalDepartment.key, routeView: view.routeView,
        defaultScope: view.defaultScope, permissions: view.permissions, enabled: view.enabled, availableInDepartments: view.availability.map((item) => item.department.key),
        href: AVAILABLE_VIEWS.find((candidate) => candidate.id === view.key)?.href ?? null
      }))
    }
  });
}));

departmentsRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const input = createDepartmentSchema.parse(req.body);
  if (!validLinkedViewsOrError(input.linkedViews)) {
    return sendApiError(res, 400, "invalid_department_view");
  }

  await ensureDefaultDepartments(workspaceId);
  const maxPosition = await prisma.workspaceDepartment.aggregate({
    where: { workspaceId },
    _max: { position: true }
  });
  const department = await prisma.workspaceDepartment.create({
    data: {
      workspaceId,
      key: await uniqueDepartmentKey(workspaceId, input.name),
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? "ph-buildings",
      position: (maxPosition._max.position ?? 0) + 1,
      linkedViews: input.linkedViews
    }
  });

  res.status(201).json({ data: serializeDepartment(department) });
}));

departmentsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const input = updateDepartmentSchema.parse(req.body);
  if (input.linkedViews && !validLinkedViewsOrError(input.linkedViews)) {
    return sendApiError(res, 400, "invalid_department_view");
  }

  const current = await prisma.workspaceDepartment.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!current) {
    return sendApiError(res, 404, "department_not_found");
  }

  const department = await prisma.workspaceDepartment.update({
    where: { id: current.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.linkedViews !== undefined ? { linkedViews: input.linkedViews } : {})
    }
  });

  res.json({ data: serializeDepartment(department) });
}));
