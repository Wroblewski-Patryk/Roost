import {
  Prisma,
  WorkforceEntity,
  WorkforceEntityStatus,
  WorkforceEntityType,
  WorkforcePersonalityProfile,
  WorkforceRuntimeMode
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toJsonInput } from "../../integrations/integration-settings.service";
import { agentKeyProfiles } from "../../auth/agent-key-profiles";
import { capabilities } from "../../auth/capabilities";
import { departmentRegistry, resolveDepartmentEntry } from "../../operating-model/department-registry";
import { createEvent } from "../events/event.service";

export const workforceEntityTypes = ["human", "agent"] as const satisfies WorkforceEntityType[];
export const workforceEntityStatuses = ["active", "inactive", "paused", "archived"] as const satisfies WorkforceEntityStatus[];
export const workforceRuntimeModes = ["manual", "semi_autonomous", "autonomous"] as const satisfies WorkforceRuntimeMode[];
export const workforcePersonalityProfiles = ["analytical", "creative", "executive", "supportive", "researcher", "custom"] as const satisfies WorkforcePersonalityProfile[];

export type WorkforceEntityInput = {
  type: WorkforceEntityType;
  status?: WorkforceEntityStatus;
  name: string;
  slug?: string;
  description?: string | null;
  avatar?: string | null;
  department?: string | null;
  role?: string | null;
  managerId?: string | null;
  personalityProfile?: WorkforcePersonalityProfile;
  model?: string | null;
  runtimeMode?: WorkforceRuntimeMode;
  paperclipAgentId?: string | null;
  synchronizationEnabled?: boolean;
  hierarchyLevel?: string | null;
  bigFiveProfile?: unknown;
  skillIndex?: unknown;
  knowledgeIndex?: unknown;
  toolIndex?: unknown;
  authorityScope?: unknown;
  paperclipProfile?: unknown;
};

export type WorkforceEntityUpdate = Partial<Omit<WorkforceEntityInput, "type">> & {
  type?: WorkforceEntityType;
};

type WorkforceEntityCreateOptions = {
  source?: string;
  externalId?: string | null;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "workforce-entity";
}

async function uniqueSlug(workspaceId: string, name: string, requestedSlug?: string, existingId?: string) {
  const base = slugify(requestedSlug || name);
  let slug = base;
  let suffix = 2;

  while (await prisma.workforceEntity.findFirst({
    where: {
      workspaceId,
      slug,
      ...(existingId ? { id: { not: existingId } } : {})
    },
    select: { id: true }
  })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function asSyncLog(value: unknown) {
  return Array.isArray(value) ? value.slice(-19) : [];
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function listMarkdown(value: unknown) {
  const items = asStringList(value);
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- Not configured";
}

function bigFiveMarkdown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "- Not configured";
  const entries = Object.entries(value as Record<string, unknown>).filter(([, score]) => typeof score === "number");
  return entries.length ? entries.map(([trait, score]) => `- ${trait}: ${score}/5`).join("\n") : "- Not configured";
}

type WorkforceMarkdownEntity = {
  name: string;
  description?: string | null;
  department?: string | null;
  role?: string | null;
  personalityProfile: WorkforcePersonalityProfile;
  runtimeMode: WorkforceRuntimeMode;
  model?: string | null;
  paperclipAgentId?: string | null;
  type: WorkforceEntityType;
  hierarchyLevel?: string | null;
  bigFiveProfile?: unknown;
  skillIndex?: unknown;
  knowledgeIndex?: unknown;
  toolIndex?: unknown;
  authorityScope?: unknown;
  paperclipProfile?: unknown;
};

export function generateWorkforceMarkdown(entity: WorkforceMarkdownEntity) {
  const responsibilities = entity.description?.trim() || "Responsibilities are defined by the role, assigned tasks, and CompanyCore governance.";
  const communicationStyle = {
    analytical: "Precise, evidence-led, and careful about uncertainty.",
    creative: "Exploratory, option-rich, and comfortable with divergent ideas.",
    executive: "Concise, priority-driven, and decision-oriented.",
    supportive: "Calm, helpful, and focused on reducing friction for collaborators.",
    researcher: "Curious, source-aware, and explicit about assumptions.",
    custom: "Custom communication style managed by CompanyCore."
  }[entity.personalityProfile];
  const decisionStyle = {
    analytical: "Compare evidence, risks, and tradeoffs before recommending a path.",
    creative: "Generate options first, then converge on the most useful next step.",
    executive: "Prefer clear ownership, priority, and reversible decisions.",
    supportive: "Prefer consensus, clarity, and low-friction collaboration.",
    researcher: "Validate sources and record uncertainty before acting.",
    custom: "Follow the custom decision policy configured in CompanyCore."
  }[entity.personalityProfile];

  return {
    "agent.md": `# ${entity.name}

## Identity
- Type: ${entity.type}
- Role: ${entity.role || "Unassigned"}
- Department: ${entity.department || "06-kadry"}
- Hierarchy level: ${entity.hierarchyLevel || "not configured"}

## Responsibilities
${responsibilities}

## Skills
${listMarkdown(entity.skillIndex)}

## Knowledge Access
${listMarkdown(entity.knowledgeIndex)}

## Tools
${listMarkdown(entity.toolIndex)}

## Authority Scope
${listMarkdown(entity.authorityScope)}

## Runtime
- Runtime mode: ${entity.runtimeMode}
- Model: ${entity.model || "not configured"}
- Paperclip agent ID: ${entity.paperclipAgentId || "not linked"}
`,
    "personality.md": `# ${entity.name} Personality

## Profile
- Personality profile: ${entity.personalityProfile}

## Big Five
${bigFiveMarkdown(entity.bigFiveProfile)}

## Communication Style
${communicationStyle}

## Decision Style
${decisionStyle}
`,
    "environment.md": `# ${entity.name} Environment

## CompanyCore
CompanyCore, now evolving toward Roost, is the organizational source of truth for people, agents, roles, responsibilities, work, knowledge, permissions, and integration state.

## Organization
The entity belongs to ${entity.department || "06 People / Agents"} and operates through CompanyCore records, tasks, resources, events, and governed API/MCP access.

## Operating Map
- 00 General: executive coordination and company-level routing.
- 01 Strategy: direction, decisions, positioning, and operating model.
- 02 Product: product definition, UX, requirements, and delivery framing.
- 03 Revenue: sales, marketing, growth, and market feedback.
- 04 Operations: work execution, routines, workflows, and delivery health.
- 05 Relationships: customers, partners, stakeholders, and account context.
- 06 People / Agents: humans, digital workers, roles, skills, hierarchy, and profiles.
- 07 Finance: cost, revenue, budgets, metrics, and financial controls.
- 08 Assets: files, folders, resources, knowledge, and storage.
- 09 Technology: architecture, code, infrastructure, and technical reliability.
- 10 Legal: privacy, contracts, compliance, and security boundaries.
- 11 Innovation: experiments, portfolio exploration, and new capability discovery.
- 12 Management: executive decisions, ownership, approvals, and company governance.

## Paperclip
Paperclip is the external agent runtime. CompanyCore owns people, agent configuration, hierarchy, skills, knowledge access, tool access, generated markdown, and synchronization packets. Paperclip executes with the latest synchronized context instead of becoming the source of truth.

## Runtime Profile
${entity.paperclipProfile && typeof entity.paperclipProfile === "object" ? JSON.stringify(entity.paperclipProfile, null, 2) : "No Paperclip profile captured yet."}
`
  };
}

function withGeneratedFiles<T extends WorkforceEntity>(entity: T) {
  return {
    ...entity,
    generatedFiles: generateWorkforceMarkdown(entity)
  };
}

function entityReadiness(entity: WorkforceEntity & { _count?: { directReports?: number } }) {
  const items = [
    {
      key: "role",
      label: "Role assigned",
      done: Boolean(entity.role),
      detail: entity.role || "Add the working role."
    },
    {
      key: "responsibilities",
      label: "Responsibilities written",
      done: Boolean(entity.description?.trim()),
      detail: entity.description ? "Description feeds management context." : "Add responsibilities before assigning work."
    },
    {
      key: "department",
      label: "Canonical department",
      done: Boolean(entity.department && resolveDepartmentEntry(entity.department)),
      detail: entity.department && resolveDepartmentEntry(entity.department)
        ? resolveDepartmentEntry(entity.department)!.canonicalKey
        : "Select one of the canonical 00-12 departments."
    },
    {
      key: "active_status",
      label: "Active status",
      done: entity.status === "active",
      detail: entity.status === "active" ? "Available for work." : `Current status: ${entity.status}.`
    },
    {
      key: "authority_boundary",
      label: "Authority boundary",
      done: entity.type === "human" || entity.runtimeMode !== "autonomous",
      detail: entity.type === "human"
        ? "Human authority is governed by workspace role and future RBAC."
        : entity.runtimeMode === "autonomous"
          ? "Autonomous mode needs explicit authority review."
          : "Agent stays inside manual or semi-autonomous supervision."
    },
    {
      key: "runtime_indexes",
      label: "Runtime indexes captured",
      done: entity.type === "human" || (
        asStringList(entity.skillIndex).length > 0
        && asStringList(entity.knowledgeIndex).length > 0
        && asStringList(entity.toolIndex).length > 0
      ),
      detail: entity.type === "human"
        ? "Human records can use manual access notes until RBAC expands."
        : "Agents need skill, knowledge, and tool indexes before reliable runtime sync."
    },
    {
      key: "big_five",
      label: "Big Five profile captured",
      done: Boolean(entity.bigFiveProfile && typeof entity.bigFiveProfile === "object" && Object.keys(entity.bigFiveProfile as Record<string, unknown>).length >= 5),
      detail: "Big Five remains a compact JSON profile until the future personality model expands."
    }
  ];
  const missingFields = items.filter((item) => !item.done).map((item) => item.key);
  const riskLevel = entity.status !== "active" || entity.runtimeMode === "autonomous" ? "medium" : missingFields.length ? "low" : "ready";

  return {
    score: items.filter((item) => item.done).length,
    total: items.length,
    status: missingFields.length ? "needs_attention" : "ready",
    riskLevel,
    missingFields,
    nextAction: missingFields.includes("role")
      ? "Assign a role before routing work."
      : missingFields.includes("responsibilities")
        ? "Write responsibilities so generated context and management decisions are grounded."
        : missingFields.includes("department")
          ? "Choose a canonical department."
          : missingFields.includes("authority_boundary")
            ? "Review autonomous authority before operational use."
            : "Ready for normal management workflows.",
    items
  };
}

function entityAuthority(entity: WorkforceEntity) {
  const recommendedProfiles = entity.type === "agent"
    ? agentKeyProfiles.filter((profile) => (
      profile.recommendedFor.some((target) => {
        const haystack = `${entity.name} ${entity.role ?? ""}`.toLowerCase();
        return haystack.includes(target.replace(/\s+agent$/i, "").toLowerCase())
          || target.toLowerCase().includes("agent");
      })
    )).slice(0, 3)
    : [];
  const profileScopes = Array.from(new Set(recommendedProfiles.flatMap((profile) => profile.scopes))).slice(0, 12);

  return {
    mode: entity.type === "human" ? "human_workspace_authority" : "profile_not_bound",
    riskLevel: entity.runtimeMode === "autonomous" ? "high" : recommendedProfiles.some((profile) => profile.riskLevel === "high") ? "medium" : "low",
    recommendedProfiles: recommendedProfiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      riskLevel: profile.riskLevel,
      description: profile.description,
      scopes: profile.scopes
    })),
    visibleScopeSample: entity.type === "agent" ? profileScopes : ["workspace_owner"],
    supportedCapabilities: capabilities.filter((capability) => (
      capability.startsWith("workforce:")
      || capability.startsWith("operations:")
      || capability.startsWith("tasks:")
      || capability === "events:read"
    )),
    blockedActions: [
      {
        action: "assign_work_without_assignment_model",
        reason: "CompanyCore can infer department responsibility, but direct human/agent task assignment still needs a dedicated responsibility model."
      },
      {
        action: "expand_permissions_from_directory",
        reason: "Capability and API-key changes must remain in dedicated audited access-management flows."
      },
      {
        action: "autonomous_hr_decisions",
        reason: "Hiring, firing, pay, access expansion, and authority changes need future RBAC and owner approval contracts."
      }
    ]
  };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function entityWorkSummary(entity: WorkforceEntity, tasks: Array<{
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: Date | null;
  updatedAt: Date;
  taskList: { id: string; name: string; description: string | null; status: string } | null;
  project: { id: string; name: string; status: string } | null;
}>) {
  const department = entity.department ? resolveDepartmentEntry(entity.department) : null;
  const terms = [
    entity.name,
    entity.slug,
    entity.role,
    entity.department,
    department?.canonicalKey,
    department?.backendAreaKey,
    ...(department?.hintTerms ?? [])
  ].filter((term): term is string => Boolean(term && term.length > 2)).map((term) => term.toLowerCase());

  const matched = tasks.filter((task) => {
    const text = [
      task.title,
      task.description,
      task.taskList?.name,
      task.taskList?.description,
      task.project?.name
    ].map(normalizeText).join(" ");
    return terms.some((term) => text.includes(term));
  }).slice(0, 8);
  const active = matched.filter((task) => !["done", "archived"].includes(task.status));
  const blocked = matched.filter((task) => task.status === "blocked");
  const overdue = matched.filter((task) => task.dueDate && task.dueDate.getTime() < Date.now() && !["done", "archived"].includes(task.status));
  const taskLists = new Map<string, { id: string; name: string; status: string; count: number }>();
  matched.forEach((task) => {
    if (!task.taskList) return;
    const existing = taskLists.get(task.taskList.id);
    taskLists.set(task.taskList.id, {
      id: task.taskList.id,
      name: task.taskList.name,
      status: task.taskList.status,
      count: (existing?.count ?? 0) + 1
    });
  });

  return {
    assignmentModel: "inferred_from_department_role_and_text",
    summary: {
      matched: matched.length,
      active: active.length,
      blocked: blocked.length,
      overdue: overdue.length,
      taskLists: taskLists.size
    },
    evidence: matched.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority ?? "medium",
      dueDate: task.dueDate?.toISOString() ?? null,
      updatedAt: task.updatedAt.toISOString(),
      project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status } : null,
      taskList: task.taskList ? { id: task.taskList.id, name: task.taskList.name, status: task.taskList.status } : null
    })),
    taskLists: Array.from(taskLists.values()),
    gaps: [
      {
        key: "direct_assignment_model",
        label: "Direct assignment is not modeled yet",
        detail: "This tab shows inferred responsibility from department, role, and task text. A future assignment model should replace inference."
      }
    ]
  };
}

export async function listWorkforceEntities(workspaceId: string, filters: {
  type?: WorkforceEntityType;
  status?: WorkforceEntityStatus;
  q?: string;
}) {
  const where: Prisma.WorkforceEntityWhereInput = {
    workspaceId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q ? {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { role: { contains: filters.q, mode: "insensitive" } },
        { department: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } }
      ]
    } : {})
  };

  const [entities, counts] = await Promise.all([
    prisma.workforceEntity.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        manager: { select: { id: true, name: true, slug: true } },
        _count: { select: { directReports: true } }
      }
    }),
    Promise.all([
      prisma.workforceEntity.count({ where: { workspaceId } }),
      prisma.workforceEntity.count({ where: { workspaceId, type: "human" } }),
      prisma.workforceEntity.count({ where: { workspaceId, type: "agent" } }),
      prisma.workforceEntity.count({ where: { workspaceId, synchronizationEnabled: true } }),
      prisma.workforceEntity.count({ where: { workspaceId, syncStatus: "queued" } })
    ])
  ]);
  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      taskList: true,
      project: true
    }
  });

  const [total, humans, agents, syncEnabled, syncQueued] = counts;
  return {
    summary: {
      total,
      humans,
      agents,
      syncEnabled,
      syncQueued,
      visible: entities.length
    },
    entities: entities.map((entity) => ({
      ...withGeneratedFiles(entity),
      readiness: entityReadiness(entity),
      authority: entityAuthority(entity),
      work: entityWorkSummary(entity, tasks),
      directReportCount: entity._count.directReports
    })),
    dictionaries: {
      types: workforceEntityTypes,
      statuses: workforceEntityStatuses,
      runtimeModes: workforceRuntimeModes,
      personalityProfiles: workforcePersonalityProfiles,
      departments: departmentRegistry.map((department) => ({
        key: department.canonicalKey,
        backendAreaKey: department.backendAreaKey,
        position: department.position
      }))
    },
    agentPacket: {
      mode: "source_of_truth",
      allowedActions: [
        "read_workforce_entities",
        "edit_workforce_entity",
        "preview_generated_markdown",
        "request_manual_paperclip_sync"
      ],
      blockedActions: [
        {
          action: "paperclip_config_as_source_of_truth",
          reason: "CompanyCore/Roost owns workforce configuration. Paperclip is runtime only."
        },
        {
          action: "autonomous_hr_decisions",
          reason: "Hiring, firing, pay, access expansion, and authority changes need future RBAC and owner approval contracts."
        }
      ]
    }
  };
}

export async function getWorkforceEntity(workspaceId: string, id: string) {
  const entity = await prisma.workforceEntity.findFirst({
    where: { id, workspaceId },
    include: { manager: { select: { id: true, name: true, slug: true } } }
  });
  return entity ? withGeneratedFiles(entity) : null;
}

export async function createWorkforceEntity(workspaceId: string, input: WorkforceEntityInput, options: WorkforceEntityCreateOptions = {}) {
  const slug = await uniqueSlug(workspaceId, input.name, input.slug);
  const generatedFiles = generateWorkforceMarkdown({
    name: input.name,
    description: input.description ?? null,
    department: input.department ?? "06-kadry",
    role: input.role ?? null,
    personalityProfile: input.personalityProfile ?? "supportive",
    runtimeMode: input.runtimeMode ?? "manual",
    model: input.model ?? null,
    paperclipAgentId: input.paperclipAgentId ?? null,
    type: input.type,
    hierarchyLevel: input.hierarchyLevel ?? null,
    bigFiveProfile: input.bigFiveProfile ?? {},
    skillIndex: input.skillIndex ?? [],
    knowledgeIndex: input.knowledgeIndex ?? [],
    toolIndex: input.toolIndex ?? [],
    authorityScope: input.authorityScope ?? [],
    paperclipProfile: input.paperclipProfile ?? {}
  });

  const entity = await prisma.workforceEntity.create({
    data: {
      workspaceId,
      type: input.type,
      status: input.status,
      name: input.name,
      slug,
      description: input.description,
      avatar: input.avatar,
      department: input.department ?? "06-kadry",
      role: input.role,
      managerId: input.managerId,
      personalityProfile: input.personalityProfile,
      model: input.model,
      runtimeMode: input.runtimeMode,
      paperclipAgentId: input.paperclipAgentId,
      synchronizationEnabled: input.synchronizationEnabled,
      hierarchyLevel: input.hierarchyLevel,
      bigFiveProfile: toJsonInput(input.bigFiveProfile ?? {}),
      skillIndex: toJsonInput(input.skillIndex ?? []),
      knowledgeIndex: toJsonInput(input.knowledgeIndex ?? []),
      toolIndex: toJsonInput(input.toolIndex ?? []),
      authorityScope: toJsonInput(input.authorityScope ?? []),
      paperclipProfile: toJsonInput(input.paperclipProfile ?? {}),
      generatedFiles: toJsonInput(generatedFiles),
      source: options.source ?? "companycore",
      externalId: options.externalId ?? null
    }
  });

  await createEvent({
    type: "workforce_entity_created",
    workspaceId,
    source: "companycore",
    payload: { workforceEntityId: entity.id, type: entity.type, name: entity.name }
  });

  return withGeneratedFiles(entity);
}

export async function updateWorkforceEntity(workspaceId: string, id: string, input: WorkforceEntityUpdate) {
  const existing = await prisma.workforceEntity.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;

  if (input.managerId) {
    const manager = await prisma.workforceEntity.findFirst({
      where: { id: input.managerId, workspaceId },
      select: { id: true }
    });
    if (!manager || manager.id === existing.id) {
      throw Object.assign(new Error("invalid_manager"), { status: 422 });
    }
  }

  const next = {
    ...existing,
    ...input,
    name: input.name ?? existing.name,
    description: input.description === undefined ? existing.description : input.description,
    department: input.department === undefined ? existing.department : input.department,
    role: input.role === undefined ? existing.role : input.role,
    personalityProfile: input.personalityProfile ?? existing.personalityProfile,
    runtimeMode: input.runtimeMode ?? existing.runtimeMode,
    model: input.model === undefined ? existing.model : input.model,
    paperclipAgentId: input.paperclipAgentId === undefined ? existing.paperclipAgentId : input.paperclipAgentId,
    type: input.type ?? existing.type,
    hierarchyLevel: input.hierarchyLevel === undefined ? existing.hierarchyLevel : input.hierarchyLevel,
    bigFiveProfile: input.bigFiveProfile === undefined ? existing.bigFiveProfile : input.bigFiveProfile,
    skillIndex: input.skillIndex === undefined ? existing.skillIndex : input.skillIndex,
    knowledgeIndex: input.knowledgeIndex === undefined ? existing.knowledgeIndex : input.knowledgeIndex,
    toolIndex: input.toolIndex === undefined ? existing.toolIndex : input.toolIndex,
    authorityScope: input.authorityScope === undefined ? existing.authorityScope : input.authorityScope,
    paperclipProfile: input.paperclipProfile === undefined ? existing.paperclipProfile : input.paperclipProfile
  };
  const generatedFiles = generateWorkforceMarkdown(next);

  const entity = await prisma.workforceEntity.update({
    where: { id: existing.id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
      ...(input.personalityProfile !== undefined ? { personalityProfile: input.personalityProfile } : {}),
      ...(input.model !== undefined ? { model: input.model } : {}),
      ...(input.runtimeMode !== undefined ? { runtimeMode: input.runtimeMode } : {}),
      ...(input.paperclipAgentId !== undefined ? { paperclipAgentId: input.paperclipAgentId } : {}),
      ...(input.synchronizationEnabled !== undefined ? { synchronizationEnabled: input.synchronizationEnabled } : {}),
      ...(input.hierarchyLevel !== undefined ? { hierarchyLevel: input.hierarchyLevel } : {}),
      ...(input.bigFiveProfile !== undefined ? { bigFiveProfile: toJsonInput(input.bigFiveProfile) } : {}),
      ...(input.skillIndex !== undefined ? { skillIndex: toJsonInput(input.skillIndex) } : {}),
      ...(input.knowledgeIndex !== undefined ? { knowledgeIndex: toJsonInput(input.knowledgeIndex) } : {}),
      ...(input.toolIndex !== undefined ? { toolIndex: toJsonInput(input.toolIndex) } : {}),
      ...(input.authorityScope !== undefined ? { authorityScope: toJsonInput(input.authorityScope) } : {}),
      ...(input.paperclipProfile !== undefined ? { paperclipProfile: toJsonInput(input.paperclipProfile) } : {}),
      ...(input.name || input.slug ? { slug: await uniqueSlug(workspaceId, input.name ?? existing.name, input.slug ?? existing.slug, existing.id) } : {}),
      generatedFiles: toJsonInput(generatedFiles),
      syncStatus: existing.syncStatus === "synced" ? "stale" : existing.syncStatus
    }
  });

  await createEvent({
    type: "workforce_entity_updated",
    workspaceId,
    source: "companycore",
    payload: { workforceEntityId: entity.id, changed: Object.keys(input) }
  });

  return withGeneratedFiles(entity);
}

export async function archiveWorkforceEntity(workspaceId: string, id: string) {
  return updateWorkforceEntity(workspaceId, id, { status: "archived", synchronizationEnabled: false });
}

export async function deleteWorkforceEntity(workspaceId: string, id: string) {
  const existing = await prisma.workforceEntity.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      type: true,
      name: true,
      slug: true,
      source: true,
      directReports: { select: { id: true }, take: 1 }
    }
  });
  if (!existing) return null;
  if (existing.source === "user") {
    throw Object.assign(new Error("cannot_delete_user_backed_workforce_entity"), { status: 409 });
  }
  if (existing.directReports.length > 0) {
    throw Object.assign(new Error("cannot_delete_entity_with_direct_reports"), { status: 409 });
  }

  await prisma.workforceEntity.delete({ where: { id: existing.id } });

  await createEvent({
    type: "workforce_entity_deleted",
    workspaceId,
    source: "companycore",
    payload: {
      workforceEntityId: existing.id,
      type: existing.type,
      name: existing.name,
      slug: existing.slug
    }
  });

  return {
    id: existing.id,
    deleted: true
  };
}

export async function syncWorkforceEntity(workspaceId: string, id: string, requestedByUserId?: string) {
  const existing = await prisma.workforceEntity.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;
  if (existing.type !== "agent" || !existing.synchronizationEnabled) {
    throw Object.assign(new Error("sync_not_enabled"), { status: 409 });
  }

  const generatedFiles = generateWorkforceMarkdown(existing);
  const logEntry = {
    at: new Date().toISOString(),
    status: "queued",
    actor: requestedByUserId ? "user" : "api_key",
    message: "Paperclip runtime synchronization requested from CompanyCore."
  };

  const outbox = await prisma.agentEventOutbox.create({
    data: {
      workspaceId,
      eventType: "paperclip_agent_config_sync_requested",
      targetAgent: existing.paperclipAgentId || existing.slug,
      scope: {
        workforceEntityId: existing.id,
        department: existing.department,
        sourceOfTruth: "companycore"
      },
      payload: {
        workforceEntity: {
          id: existing.id,
          type: existing.type,
          status: existing.status,
          name: existing.name,
          slug: existing.slug,
          department: existing.department,
          role: existing.role,
          runtimeMode: existing.runtimeMode,
          model: existing.model,
          paperclipAgentId: existing.paperclipAgentId,
          hierarchyLevel: existing.hierarchyLevel,
          bigFiveProfile: existing.bigFiveProfile,
          skillIndex: existing.skillIndex,
          knowledgeIndex: existing.knowledgeIndex,
          toolIndex: existing.toolIndex,
          authorityScope: existing.authorityScope,
          paperclipProfile: existing.paperclipProfile
        },
        generatedFiles
      }
    }
  });

  const entity = await prisma.workforceEntity.update({
    where: { id: existing.id },
    data: {
      generatedFiles: toJsonInput(generatedFiles),
      syncStatus: "queued",
      syncLog: toJsonInput([...asSyncLog(existing.syncLog), { ...logEntry, outboxId: outbox.id }])
    }
  });

  await createEvent({
    type: "workforce_entity_sync_requested",
    workspaceId,
    source: "companycore",
    payload: {
      workforceEntityId: entity.id,
      outboxId: outbox.id,
      targetAgent: outbox.targetAgent
    }
  });

  return {
    entity: withGeneratedFiles(entity),
    outboxId: outbox.id
  };
}
