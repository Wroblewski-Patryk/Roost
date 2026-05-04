import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export const operatingAreas = [
  { key: "main-general", name: "00. Główny", position: 0 },
  { key: "strategy-governance", name: "Strategy and governance", position: 1 },
  { key: "projects-delivery", name: "Projects and delivery", position: 2 },
  { key: "tasks-workflow", name: "Tasks and workflow", position: 3 },
  { key: "sales-crm", name: "Sales and CRM", position: 4 },
  { key: "marketing-growth", name: "Marketing and growth", position: 5 },
  { key: "finance-billing", name: "Finance and billing", position: 6 },
  { key: "people-roles", name: "People and roles", position: 7 },
  { key: "operations-administration", name: "Operations and administration", position: 8 },
  { key: "knowledge-decisions", name: "Knowledge and decisions", position: 9 },
  { key: "assets-storage", name: "Assets and storage", position: 10 },
  { key: "automations-integrations", name: "Automations and integrations", position: 11 },
  { key: "ai-agents-observability", name: "AI agents and observability", position: 12 }
] as const;

export const operatingTables = [
  {
    areaKey: "projects-delivery",
    tableName: "projects",
    apiSlug: "projects",
    name: "Projects",
    description: "Company projects and delivery containers"
  },
  {
    areaKey: "strategy-governance",
    tableName: "goals",
    apiSlug: "goals",
    name: "Goals",
    description: "Strategic outcomes linked to projects"
  },
  {
    areaKey: "strategy-governance",
    tableName: "targets",
    apiSlug: "targets",
    name: "Targets",
    description: "Measurable targets linked to goals"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "task_lists",
    apiSlug: "task-lists",
    name: "Task lists",
    description: "Task grouping layer equivalent to ClickUp Lists"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "tasks",
    apiSlug: "tasks",
    name: "Tasks",
    description: "Operational tasks imported from ClickUp or created natively"
  },
  {
    areaKey: "sales-crm",
    tableName: "clients",
    apiSlug: "clients",
    name: "Clients",
    description: "CRM contacts and companies"
  },
  {
    areaKey: "sales-crm",
    tableName: "pipeline_stages",
    apiSlug: "pipeline-stages",
    name: "Pipeline stages",
    description: "Sales pipeline configuration"
  },
  {
    areaKey: "sales-crm",
    tableName: "deals",
    apiSlug: "deals",
    name: "Deals",
    description: "Sales opportunities"
  },
  {
    areaKey: "sales-crm",
    tableName: "interactions",
    apiSlug: "interactions",
    name: "Interactions",
    description: "CRM timeline interactions"
  },
  {
    areaKey: "knowledge-decisions",
    tableName: "notes",
    apiSlug: "notes",
    name: "Notes",
    description: "Durable operational notes"
  },
  {
    areaKey: "knowledge-decisions",
    tableName: "decisions",
    apiSlug: "decisions",
    name: "Decisions",
    description: "Recorded decisions and rationale"
  },
  {
    areaKey: "ai-agents-observability",
    tableName: "agents",
    apiSlug: "agents",
    name: "Agents",
    description: "AI agent identities"
  },
  {
    areaKey: "ai-agents-observability",
    tableName: "agent_logs",
    apiSlug: "agent-logs",
    name: "Agent logs",
    description: "AI agent operational logs"
  },
  {
    areaKey: "ai-agents-observability",
    tableName: "events",
    apiSlug: "events",
    name: "Events",
    description: "System events and sync signals"
  }
] as const;

export function classifyOperatingAreaKey(...names: Array<string | null | undefined>) {
  const text = names.filter(Boolean).join(" ").toLowerCase();

  if (/(goal|target|okr|strategy|govern|decision)/.test(text)) {
    return "strategy-governance";
  }
  if (/(project|delivery|release|milestone)/.test(text)) {
    return "projects-delivery";
  }
  if (/(task|todo|workflow|sprint|backlog|list|kanban)/.test(text)) {
    return "tasks-workflow";
  }
  if (/(client|customer|crm|sales|deal|lead|pipeline)/.test(text)) {
    return "sales-crm";
  }
  if (/(marketing|growth|campaign|content|seo)/.test(text)) {
    return "marketing-growth";
  }
  if (/(finance|billing|invoice|expense|payment)/.test(text)) {
    return "finance-billing";
  }
  if (/(people|hr|role|team|hiring)/.test(text)) {
    return "people-roles";
  }
  if (/(note|knowledge|docs|obsidian|wiki)/.test(text)) {
    return "knowledge-decisions";
  }
  if (/(asset|storage|drive|file|media)/.test(text)) {
    return "assets-storage";
  }
  if (/(automation|integration|webhook|sync)/.test(text)) {
    return "automations-integrations";
  }
  if (/(ai|agent|jarvis|paperclip|log|event|observability)/.test(text)) {
    return "ai-agents-observability";
  }
  if (/(operation|operations|administration|admin|office|backoffice)/.test(text)) {
    return "operations-administration";
  }

  return "main-general";
}

export async function ensureOperatingModelForWorkspace(
  prisma: PrismaExecutor,
  workspaceId: string
) {
  const areaByKey = new Map<string, { id: string }>();

  for (const area of operatingAreas) {
    const record = await prisma.operatingArea.upsert({
      where: {
        workspaceId_key: {
          workspaceId,
          key: area.key
        }
      },
      update: {
        name: area.name,
        position: area.position
      },
      create: {
        workspaceId,
        key: area.key,
        name: area.name,
        position: area.position
      },
      select: { id: true }
    });
    areaByKey.set(area.key, record);
  }

  for (const table of operatingTables) {
    const area = areaByKey.get(table.areaKey);
    if (!area) {
      throw new Error(`Missing operating area ${table.areaKey}`);
    }

    await prisma.operatingTable.upsert({
      where: {
        workspaceId_apiSlug: {
          workspaceId,
          apiSlug: table.apiSlug
        }
      },
      update: {
        areaId: area.id,
        tableName: table.tableName,
        name: table.name,
        description: table.description,
        source: "companycore"
      },
      create: {
        workspaceId,
        areaId: area.id,
        tableName: table.tableName,
        apiSlug: table.apiSlug,
        name: table.name,
        description: table.description,
        source: "companycore"
      }
    });
  }
}
