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
  { key: "00-ogolny", name: "00 General", description: "Company orchestration, routing, and cross-department command.", icon: "ph-map-trifold", position: 0, linkedViews: ["general.overview"] },
  { key: "01-strategia", name: "01 Strategy", description: "Strategic goals, decisions, priorities, and roadmap governance.", icon: "ph-target", position: 1, linkedViews: [] },
  { key: "02-produkt", name: "02 Product", description: "Product and service definition, delivery scope, and improvement loops.", icon: "ph-package", position: 2, linkedViews: [] },
  { key: "03-sprzedaz", name: "03 Sales", description: "Lead, offer, deal, and commercial follow-up management.", icon: "ph-handshake", position: 3, linkedViews: [] },
  { key: "04-operacje", name: "04 Operations", description: "Procedures, task boards, calendars, routines, and operational controls.", icon: "ph-list-checks", position: 4, linkedViews: ["operations.tasks", "operations.calendar"] },
  { key: "05-relacje", name: "05 Relationships", description: "Clients, partners, support, feedback, and relationship evidence.", icon: "ph-address-book", position: 5, linkedViews: [] },
  { key: "06-kadry", name: "06 People / Agents", description: "People, AI agents, roles, responsibilities, and workload context.", icon: "ph-users-three", position: 6, linkedViews: ["people.directory"] },
  { key: "07-finanse", name: "07 Finance", description: "Revenue, costs, budgets, invoices, and commercial exceptions.", icon: "ph-bank", position: 7, linkedViews: [] },
  { key: "08-zasoby", name: "08 Assets", description: "Files, folders, resources, repositories, prompts, and knowledge roots.", icon: "ph-folder-open", position: 8, linkedViews: ["assets.overview", "assets.files"] },
  { key: "09-technologia", name: "09 Technology", description: "Code, infrastructure, deployments, integrations, and technical health.", icon: "ph-cpu", position: 9, linkedViews: [] },
  { key: "10-prawo", name: "10 Legal", description: "Contracts, compliance, approvals, and legal risk control.", icon: "ph-scales", position: 10, linkedViews: [] },
  { key: "11-innowacje", name: "11 Innovation", description: "Research, experiments, discovery, and improvement portfolio.", icon: "ph-lightbulb", position: 11, linkedViews: [] },
  { key: "12-zarzadzanie", name: "12 Management", description: "Executive control, department administration, approvals, and portfolio steering.", icon: "ph-chart-line-up", position: 12, linkedViews: ["management.departments", "management.approvals", "management.portfolio", "management.kpis", "management.escalations", "management.reviews"] }
] as const;

const AVAILABLE_VIEWS: ViewDefinition[] = [
  { id: "general.overview", label: "Company dashboard", href: "/areas?area=00-ogolny&view=overview", icon: "ph-gauge", sourceDepartmentKey: "00-ogolny", enabled: true },
  { id: "operations.tasks", label: "Operations tasks", href: "/areas?area=04-operacje&view=tasks", icon: "ph-list-checks", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "operations.calendar", label: "Operations calendar", href: "/areas?area=04-operacje&view=calendar", icon: "ph-calendar-blank", sourceDepartmentKey: "04-operacje", enabled: true },
  { id: "people.directory", label: "People and agents directory", href: "/areas?area=06-kadry&view=directory", icon: "ph-users-three", sourceDepartmentKey: "06-kadry", enabled: true },
  { id: "assets.overview", label: "Assets overview", href: "/areas?area=08-zasoby&view=overview", icon: "ph-gauge", sourceDepartmentKey: "08-zasoby", enabled: true },
  { id: "assets.files", label: "Assets files and folders", href: "/areas?area=08-zasoby&view=files", icon: "ph-folders", sourceDepartmentKey: "08-zasoby", enabled: true },
  { id: "management.departments", label: "Department management", href: "/areas?area=12-zarzadzanie&view=departments", icon: "ph-buildings", sourceDepartmentKey: "12-zarzadzanie", enabled: true },
  { id: "management.approvals", label: "Approvals and decisions", href: null, icon: "ph-seal-check", sourceDepartmentKey: "12-zarzadzanie", enabled: false },
  { id: "management.portfolio", label: "Portfolio steering", href: null, icon: "ph-briefcase", sourceDepartmentKey: "12-zarzadzanie", enabled: false },
  { id: "management.kpis", label: "KPI and health review", href: null, icon: "ph-chart-line-up", sourceDepartmentKey: "12-zarzadzanie", enabled: false },
  { id: "management.escalations", label: "Escalations and blockers", href: null, icon: "ph-warning-octagon", sourceDepartmentKey: "12-zarzadzanie", enabled: false },
  { id: "management.reviews", label: "Management reviews", href: null, icon: "ph-clipboard-text", sourceDepartmentKey: "12-zarzadzanie", enabled: false }
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

async function ensureDefaultDepartments(workspaceId: string) {
  await Promise.all(DEFAULT_DEPARTMENTS.map((department) => prisma.workspaceDepartment.upsert({
    where: { workspaceId_key: { workspaceId, key: department.key } },
    update: department.key === "12-zarzadzanie" ? {
      linkedViews: [...department.linkedViews]
    } : {},
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
  })));
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
  const departments = await prisma.workspaceDepartment.findMany({
    where: { workspaceId },
    orderBy: [{ position: "asc" }, { name: "asc" }]
  });

  res.json({
    data: {
      departments: departments.map(serializeDepartment),
      availableViews: AVAILABLE_VIEWS
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
