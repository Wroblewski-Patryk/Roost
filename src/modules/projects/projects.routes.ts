import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({ ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]), applicableDepartmentKeys: z.array(z.string()).default([]), scopes: z.array(z.object({ type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional() })).default([]) }).strict();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  organizationalContext: organizationalContextSchema.optional()
});

const updateProjectSchema = createProjectSchema.partial().omit({
  externalId: true,
  source: true
});

export const projectsRouter = Router();
async function serializeProjects(workspaceId: string, rows: Array<Record<string, any>>) { const contexts = await organizationalContextsForEntities(workspaceId, "project", rows.map((row) => row.id)); return rows.map((row) => ({ ...row, organizationalContext: contexts.get(row.id) })); }

projectsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null; const ids = departmentKey ? await contextualEntityIds(workspaceId, "project", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const projects = await prisma.project.findMany({
    where: { workspaceId, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: await serializeProjects(workspaceId, projects) });
}));

projectsRouter.get("/:id", asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!project) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.get("/:id/workspace", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const projectId = String(req.params.id);
  const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return res.status(404).json({ error: "not_found" });
  const [contexts, relations, goals, taskLists, tasks, applicationLinks, directRecords, decisions, directResources, events] = await Promise.all([
    organizationalContextsForEntities(workspaceId, "project", [project.id]),
    prisma.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "project", fromEntityId: project.id }, { toEntityType: "project", toEntityId: project.id }] }, orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { workspaceId, projectId: project.id, status: { not: "archived" } }, orderBy: { updatedAt: "desc" } }),
    prisma.taskList.findMany({ where: { workspaceId, projectId: project.id, status: { not: "archived" } }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ where: { workspaceId, projectId: project.id, status: { not: "archived" } }, include: { taskList: { select: { id: true, name: true } }, goal: { select: { id: true, title: true } }, assignedWorkforceEntity: { select: { id: true, name: true, type: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.applicationProject.findMany({ where: { projectId: project.id, application: { workspaceId } }, include: { application: { include: {
      architecture: true,
      repositories: true,
      interfaces: true,
      technologies: { include: { technologyDefinition: true } },
      capabilities: { include: { capabilityDefinition: { include: { domain: true } }, dependenciesFrom: true } },
      features: { include: { featureDefinition: true } },
      evidence: true,
      procedures: { include: { procedure: { include: { steps: { orderBy: { stepOrder: "asc" } } } } } }
    } } }, orderBy: { createdAt: "desc" } }),
    prisma.companyRecord.findMany({ where: { workspaceId, projectId: project.id, status: { not: "archived" } }, include: { parent: { select: { id: true, title: true, recordType: true } }, children: { select: { id: true, title: true, recordType: true, status: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.decision.findMany({ where: { workspaceId, projectId: project.id, status: { not: "archived" } }, orderBy: { updatedAt: "desc" } }),
    prisma.resource.findMany({ where: { workspaceId, relatedProjectId: project.id }, orderBy: { updatedAt: "desc" } }),
    prisma.event.findMany({ where: { workspaceId, projectId: project.id }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  const applications = applicationLinks.map((link) => link.application);
  const applicationIds = applications.map((application) => application.id);
  const relatedRefs = relations.map((relation) => relation.fromEntityType === "project" && relation.fromEntityId === project.id ? { entityType: relation.toEntityType, entityId: relation.toEntityId } : { entityType: relation.fromEntityType, entityId: relation.fromEntityId });
  const ids = (entityType: string) => relatedRefs.filter((item) => item.entityType === entityType && item.entityId).map((item) => item.entityId!);
  const [relatedRecords, applicationRecords, relatedDecisions, relatedResources, relatedProcedures, risks, metrics, evidence] = await Promise.all([
    prisma.companyRecord.findMany({ where: { workspaceId, id: { in: [...ids("company_record"), ...ids("requirement")] }, status: { not: "archived" } } }),
    prisma.companyRecord.findMany({ where: { workspaceId, applicationId: { in: applicationIds }, status: { not: "archived" } }, include: { parent: { select: { id: true, title: true, recordType: true } }, children: { select: { id: true, title: true, recordType: true, status: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.decision.findMany({ where: { workspaceId, id: { in: ids("decision") }, status: { not: "archived" } } }),
    prisma.resource.findMany({ where: { workspaceId, id: { in: ids("resource") } } }),
    prisma.procedure.findMany({ where: { workspaceId, id: { in: ids("procedure") }, status: { not: "archived" } }, include: { steps: { orderBy: { stepOrder: "asc" } } } }),
    prisma.risk.findMany({ where: { workspaceId, id: { in: ids("risk") }, status: { not: "archived" } }, include: { controls: true } }),
    prisma.metric.findMany({ where: { workspaceId, id: { in: ids("metric") }, status: { not: "archived" } } }),
    prisma.evidenceRecord.findMany({ where: { workspaceId, OR: [{ entityType: "project", entityId: project.id }, { entityId: { in: [...goals.map((item) => item.id), ...tasks.map((item) => item.id), ...directRecords.map((item) => item.id), ...decisions.map((item) => item.id)] } }] }, orderBy: { observedAt: "desc" } })
  ]);
  const records = [...directRecords, ...applicationRecords, ...relatedRecords].filter((record, index, rows) => rows.findIndex((item) => item.id === record.id) === index);
  const allDecisions = [...decisions, ...relatedDecisions.filter((record) => !decisions.some((item) => item.id === record.id))];
  const resources = [...directResources, ...relatedResources.filter((record) => !directResources.some((item) => item.id === record.id))];
  const procedures = [...applications.flatMap((application) => application.procedures.map((link) => link.procedure)), ...relatedProcedures].filter((procedure, index, rows) => rows.findIndex((item) => item.id === procedure.id) === index);
  const applicationEvidence = applications.flatMap((application) => application.evidence);
  const allEvidence = [...evidence, ...applicationEvidence].filter((item, index, rows) => rows.findIndex((record) => record.id === item.id) === index);
  const capabilities = applications.flatMap((application) => application.capabilities.map((capability) => ({ ...capability, name: capability.capabilityDefinition.name, description: capability.capabilityDefinition.description, domain: capability.capabilityDefinition.domain })));
  const features = applications.flatMap((application) => application.features.map((feature) => ({ ...feature, name: feature.featureDefinition.name, description: feature.featureDefinition.description })));
  const architecture = applications.flatMap((application) => application.architecture);
  const repositories = applications.flatMap((application) => application.repositories);
  const interfaces = applications.flatMap((application) => application.interfaces);
  const technologies = applications.flatMap((application) => application.technologies.map((technology) => ({ ...technology, name: technology.technologyDefinition.name, category: technology.technologyDefinition.category })));
  const applicationDependencies = applications.flatMap((application) => application.capabilities.flatMap((capability) => capability.dependenciesFrom.map((dependency) => ({ ...dependency, dependencyType: "depends_on", fromEntityType: "application_capability", fromEntityId: dependency.fromCapabilityId, toEntityType: "application_capability", toEntityId: dependency.toCapabilityId }))));
  const openTasks = tasks.filter((task) => !["done", "archived"].includes(task.status)); const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const requirements = records.filter((record) => record.recordType === "requirement"); const verifiedEvidence = allEvidence.filter((item) => item.verificationStatus === "verified");
  res.json({ data: {
    schemaVersion: "project-workspace-v1", project, organizationalContext: contexts.get(project.id),
    health: { status: blockedTasks.length ? "attention" : "healthy", openTasks: openTasks.length, blockedTasks: blockedTasks.length, requirements: requirements.length, verifiedRequirements: requirements.filter((item) => item.verificationState === "passed").length, evidence: allEvidence.length, verifiedEvidence: verifiedEvidence.length },
    intent: { goals }, delivery: { taskLists, tasks }, applications,
    product: { capabilities, features, architecture, repositories, interfaces, technologies, dependencies: applicationDependencies },
    records, requirements, deliverables: records.filter((record) => record.recordType === "deliverable"), issues: records.filter((record) => record.recordType === "operational_issue"), incidents: records.filter((record) => record.recordType === "technical_incident"),
    procedures, decisions: allDecisions, resources, risks, metrics, relations: [...relations, ...applicationDependencies], evidence: allEvidence, activity: events
  } });
}));

projectsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createProjectSchema.parse(req.body);
  const { organizationalContext, ...projectInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  await ensureDefaultDepartments(req.auth!.workspaceId);
  const project = await prisma.$transaction(async (transaction) => {
    const created = await transaction.project.create({ data: { ...projectInput, workspaceId: req.auth!.workspaceId } });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "project", created.id, organizationalContext);
    return created;
  });
  await createEvent({
    type: "project_created",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id, name: project.name }
  });
  res.status(201).json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateProjectSchema.parse(req.body);
  const { organizationalContext, ...projectInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  const existing = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const project = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.project.update({ where: { id: existing.id }, data: projectInput });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "project", existing.id, organizationalContext);
    return updated;
  });

  await createEvent({
    type: "project_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id, changed: Object.keys(input) }
  });

  res.json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: { status: "archived" }
  });

  await createEvent({
    type: "project_archived",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id }
  });

  res.json({ data: project });
}));
