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
    areaKey: "tasks-workflow",
    tableName: "pipeline_stages",
    apiSlug: "pipeline-stages",
    name: "Pipeline stages",
    description: "Reusable workflow stages used by company pipelines and CRM"
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
  },
  {
    areaKey: "strategy-governance",
    tableName: "processes",
    apiSlug: "processes",
    name: "Processes",
    description: "Durable company processes mapped to departments, owners, policies, and metrics"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "pipelines",
    apiSlug: "pipelines",
    name: "Pipelines",
    description: "Reusable cross-department workflow definitions from input to outcome"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "pipeline_runs",
    apiSlug: "pipeline-runs",
    name: "Pipeline runs",
    description: "Concrete pipeline executions with status, current stage, payloads, links, and correlation"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "stage_runs",
    apiSlug: "stage-runs",
    name: "Stage runs",
    description: "Concrete execution records for individual pipeline stages"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "checklist_templates",
    apiSlug: "checklist-templates",
    name: "Checklist templates",
    description: "Reusable completion checklists for tasks, stages, procedures, and runs"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "checklist_items",
    apiSlug: "checklist-items",
    name: "Checklist items",
    description: "Ordered checklist template items with required/optional flags"
  },
  {
    areaKey: "tasks-workflow",
    tableName: "acceptance_criteria",
    apiSlug: "acceptance-criteria",
    name: "Acceptance criteria",
    description: "Target-specific acceptance criteria and validation status for human or agent verification"
  },
  {
    areaKey: "strategy-governance",
    tableName: "policies",
    apiSlug: "policies",
    name: "Policies",
    description: "Policy-driven agent and process rules with severity, enforcement mode, and escalation"
  },
  {
    areaKey: "strategy-governance",
    tableName: "metrics",
    apiSlug: "metrics",
    name: "Metrics",
    description: "Company, process, pipeline, and agent KPIs with targets and calculation metadata"
  },
  {
    areaKey: "strategy-governance",
    tableName: "risks",
    apiSlug: "risks",
    name: "Risks",
    description: "Process, pipeline, integration, and automation risks"
  },
  {
    areaKey: "strategy-governance",
    tableName: "controls",
    apiSlug: "controls",
    name: "Controls",
    description: "Controls that reduce risks through approvals, tests, snapshots, limits, and rollback plans"
  },
  {
    areaKey: "operations-administration",
    tableName: "procedures",
    apiSlug: "procedures",
    name: "Procedures",
    description: "Standard operating procedures that define how stages and actions are executed"
  },
  {
    areaKey: "operations-administration",
    tableName: "procedure_steps",
    apiSlug: "procedure-steps",
    name: "Procedure steps",
    description: "Ordered manual, automated, agent, review, and integration-call instructions"
  },
  {
    areaKey: "operations-administration",
    tableName: "approvals",
    apiSlug: "approvals",
    name: "Approvals",
    description: "Human or role-based approval requests for risky agent and automation actions"
  },
  {
    areaKey: "operations-administration",
    tableName: "dependencies",
    apiSlug: "dependencies",
    name: "Dependencies",
    description: "Dependencies between resources, tasks, documents, integrations, agents, approvals, and runtime entities"
  },
  {
    areaKey: "operations-administration",
    tableName: "business_functions",
    apiSlug: "business-functions",
    name: "Business functions",
    description: "LuckySparrow department and business-function map with accountable roles"
  },
  {
    areaKey: "people-roles",
    tableName: "company_roles",
    apiSlug: "company-roles",
    name: "Company roles",
    description: "Human, agent, and system roles with responsibilities, permissions, tools, and escalation"
  },
  {
    areaKey: "people-roles",
    tableName: "workforce_entities",
    apiSlug: "workforce",
    name: "Workforce entities",
    description: "Unified human and AI-agent roster used as the Roost source of truth for supervised runtime context"
  },
  {
    areaKey: "sales-crm",
    tableName: "stakeholders",
    apiSlug: "stakeholders",
    name: "Stakeholders",
    description: "Client, vendor, partner, internal, and other stakeholders linked to work and clients"
  },
  {
    areaKey: "assets-storage",
    tableName: "resources",
    apiSlug: "resources",
    name: "Resources",
    description: "Provider-neutral resources such as tasks, files, repos, documents, prompts, and API endpoints"
  },
  {
    areaKey: "assets-storage",
    tableName: "artifacts",
    apiSlug: "artifacts",
    name: "Artifacts",
    description: "Work outputs such as documents, reports, branches, pull requests, pages, prompts, contracts, and invoices"
  },
  {
    areaKey: "automations-integrations",
    tableName: "tool_adapters",
    apiSlug: "tool-adapters",
    name: "Tool adapters",
    description: "Workspace-scoped adapter definitions for ClickUp, Drive, GitHub, Coolify, n8n, and future tools"
  },
  {
    areaKey: "automations-integrations",
    tableName: "integration_capabilities",
    apiSlug: "integration-capabilities",
    name: "Integration capabilities",
    description: "Provider-neutral adapter capabilities with permissions, schemas, risk, approval, and audit flags"
  },
  {
    areaKey: "automations-integrations",
    tableName: "automation_rules",
    apiSlug: "automation-rules",
    name: "Automation rules",
    description: "Condition/action automation rules that launch or escalate Company OS workflows"
  },
  {
    areaKey: "automations-integrations",
    tableName: "triggers",
    apiSlug: "triggers",
    name: "Triggers",
    description: "Manual, schedule, webhook, provider-event, agent-decision, and system-event workflow triggers"
  },
  {
    areaKey: "ai-agents-observability",
    tableName: "audit_logs",
    apiSlug: "audit-logs",
    name: "Audit logs",
    description: "Append-style evidence of actor, tool, resource, input, output, approval, errors, and correlation"
  },
  {
    areaKey: "knowledge-decisions",
    tableName: "knowledge_items",
    apiSlug: "knowledge-items",
    name: "Knowledge items",
    description: "Company knowledge linked to processes, procedures, pipelines, projects, clients, agents, and documents"
  },
  {
    areaKey: "knowledge-decisions",
    tableName: "decision_logs",
    apiSlug: "decision-logs",
    name: "Decision logs",
    description: "Structured decision records with options, chosen option, reason, consequences, and review date"
  },
  {
    areaKey: "knowledge-decisions",
    tableName: "standards",
    apiSlug: "standards",
    name: "Standards",
    description: "Quality standards for code, UX, documentation, security, tasks, Drive structure, and agent prompts"
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
  if (/(ai|agent|jarvis|codex|log|event|observability)/.test(text)) {
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
        position: area.position,
        isSystem: true
      },
      create: {
        workspaceId,
        key: area.key,
        name: area.name,
        position: area.position,
        isSystem: true
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
