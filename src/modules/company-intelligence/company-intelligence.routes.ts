import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { isCanonicalDepartmentKey } from "../../operating-model/department-registry";
import { contextualEntityIds, organizationalContextsForEntities } from "../organizational-context/organizational-context.service";

export const companyIntelligenceRouter = Router();

async function resolveEntity(workspaceId: string, entityType: string, entityId: string) {
  if (entityType === "goal") return prisma.goal.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "task") return prisma.task.findFirst({ where: { id: entityId, workspaceId }, include: { project: true, goal: true, taskList: true } });
  if (entityType === "task_list") return prisma.taskList.findFirst({ where: { id: entityId, workspaceId }, include: { project: true } });
  if (entityType === "project") return prisma.project.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "procedure") return prisma.procedure.findFirst({ where: { id: entityId, workspaceId }, include: { steps: { orderBy: { stepOrder: "asc" } } } });
  if (entityType === "decision") return prisma.decision.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "resource") return prisma.resource.findFirst({ where: { id: entityId, workspaceId }, include: { relatedProject: true, relatedProcess: true } });
  if (entityType === "risk") return prisma.risk.findFirst({ where: { id: entityId, workspaceId }, include: { controls: true, process: true, pipeline: true } });
  if (entityType === "metric") return prisma.metric.findFirst({ where: { id: entityId, workspaceId }, include: { process: true, pipeline: true } });
  if (entityType === "policy") return prisma.policy.findFirst({ where: { id: entityId, workspaceId }, include: { process: true, procedure: true } });
  if (entityType === "application") return prisma.application.findFirst({ where: { id: entityId, workspaceId }, include: { architecture: true, interfaces: true, repositories: true, technologies: { include: { technologyDefinition: true } } } });
  if (entityType === "feature") return prisma.applicationFeature.findFirst({ where: { id: entityId, application: { workspaceId } }, include: { featureDefinition: true, application: true } });
  if (entityType === "client") return prisma.client.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "file") return prisma.googleDriveFile.findFirst({ where: { id: entityId, workspaceId }, include: { operatingArea: true, operatingFolder: true, operatingTable: true, contentSnapshots: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (entityType === "workforce") return prisma.workforceEntity.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "agent") return prisma.agent.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "role") return prisma.companyRole.findFirst({ where: { id: entityId, workspaceId } });
  if (entityType === "company_record" || entityType === "requirement") return prisma.companyRecord.findFirst({ where: { id: entityId, workspaceId, ...(entityType === "requirement" ? { recordType: "requirement" } : {}) }, include: { parent: true, children: true } });
  return null;
}

companyIntelligenceRouter.get("/search", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const q = typeof req.query.q === "string" ? req.query.q.trim() : ""; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null; if (departmentKey && !isCanonicalDepartmentKey(departmentKey)) return res.status(400).json({ error: "invalid_department_key" }); if (q.length < 2) return res.json({ data: [] });
  const [goals, tasks, projects, records, applications, clients, procedures, resources, features, workforce, agents, decisions, risks, metrics, policies, files] = await Promise.all([
    prisma.goal.findMany({ where: { workspaceId, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.task.findMany({ where: { workspaceId, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.project.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.companyRecord.findMany({ where: { workspaceId, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { key: { contains: q, mode: "insensitive" } }] }, take: 30 }),
    prisma.application.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.client.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.procedure.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { purpose: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.resource.findMany({ where: { workspaceId, name: { contains: q, mode: "insensitive" } }, take: 20 }),
    prisma.applicationFeature.findMany({ where: { application: { workspaceId }, featureDefinition: { name: { contains: q, mode: "insensitive" } } }, include: { featureDefinition: true, application: { select: { id: true, name: true } } }, take: 20 }),
    prisma.workforceEntity.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { role: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.agent.findMany({ where: { workspaceId, name: { contains: q, mode: "insensitive" } }, take: 20 }),
    prisma.decision.findMany({ where: { workspaceId, OR: [{ title: { contains: q, mode: "insensitive" } }, { rationale: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.risk.findMany({ where: { workspaceId, name: { contains: q, mode: "insensitive" } }, take: 20 }),
    prisma.metric.findMany({ where: { workspaceId, name: { contains: q, mode: "insensitive" } }, take: 20 }),
    prisma.policy.findMany({ where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 }),
    prisma.googleDriveFile.findMany({ where: { workspaceId, trashed: false, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, take: 20 })
  ]);
  const data = [
    ...goals.map((item) => ({ entityType: "goal", id: item.id, title: item.title, subtitle: item.status })), ...tasks.map((item) => ({ entityType: "task", id: item.id, title: item.title, subtitle: item.status })),
    ...projects.map((item) => ({ entityType: "project", id: item.id, title: item.name, subtitle: item.status })), ...records.map((item) => ({ entityType: "company_record", recordType: item.recordType, id: item.id, title: item.title, subtitle: item.status })),
    ...applications.map((item) => ({ entityType: "application", id: item.id, title: item.name, subtitle: item.status })), ...clients.map((item) => ({ entityType: "client", id: item.id, title: item.name, subtitle: item.companyName })),
    ...procedures.map((item) => ({ entityType: "procedure", id: item.id, title: item.name, subtitle: item.status })), ...resources.map((item) => ({ entityType: "resource", id: item.id, title: item.name, subtitle: item.type })),
    ...features.map((item) => ({ entityType: "feature", id: item.id, title: item.featureDefinition.name, subtitle: item.application.name })), ...workforce.map((item) => ({ entityType: "workforce", id: item.id, title: item.name, subtitle: item.role || item.type })),
    ...agents.map((item) => ({ entityType: "agent", id: item.id, title: item.name, subtitle: item.status })), ...decisions.map((item) => ({ entityType: "decision", id: item.id, title: item.title, subtitle: item.status })),
    ...risks.map((item) => ({ entityType: "risk", id: item.id, title: item.name, subtitle: item.status })), ...metrics.map((item) => ({ entityType: "metric", id: item.id, title: item.name, subtitle: item.status })),
    ...policies.map((item) => ({ entityType: "policy", id: item.id, title: item.name, subtitle: item.enforcementMode })), ...files.map((item) => ({ entityType: "file", id: item.id, title: item.name, subtitle: item.mimeType }))
  ].slice(0, 100);
  if (!departmentKey) return res.json({ data });
  const department = await prisma.workspaceDepartment.findFirst({ where: { workspaceId, key: departmentKey } }); if (!department) return res.json({ data: [] });
  const [memberships, companyScopes] = await Promise.all([
    prisma.organizationalDepartmentRelation.findMany({ where: { workspaceId, departmentId: department.id }, select: { entityType: true, entityId: true } }),
    prisma.organizationalScope.findMany({ where: { workspaceId, scopeType: "company" }, select: { entityType: true, entityId: true } })
  ]);
  const visible = new Set([...memberships, ...companyScopes].map((item) => `${item.entityType}:${item.entityId}`));
  const legacyWorkforce = new Set(workforce.filter((item) => item.department === departmentKey).map((item) => item.id));
  res.json({ data: data.filter((item) => visible.has(`${item.entityType}:${item.id}`) || (item.entityType === "workforce" && legacyWorkforce.has(item.id))) });
}));

companyIntelligenceRouter.get("/graph", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const [relations, departments, records, goals, projects, applications, tasks, procedures, risks, metrics, resources, policies, clients, workforce, files] = await Promise.all([
    prisma.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, fromEntityType: { not: null }, toEntityType: { not: null } } }),
    prisma.organizationalDepartmentRelation.findMany({ where: { workspaceId }, include: { department: true } }),
    prisma.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, recordType: true, title: true, status: true, functionalState: true } }),
    prisma.goal.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true, status: true } }),
    prisma.project.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.application.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.task.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true, status: true } }),
    prisma.procedure.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.risk.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.metric.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.resource.findMany({ where: { workspaceId }, select: { id: true, name: true, type: true } }),
    prisma.policy.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.client.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true } }),
    prisma.workforceEntity.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true, type: true } }),
    prisma.googleDriveFile.findMany({ where: { workspaceId, trashed: false }, select: { id: true, name: true, mimeType: true, isFolder: true } })
  ]);
  const nodes = [...records.map((x) => ({ id: x.id, entityType: "company_record", recordType: x.recordType, label: x.title, state: x.functionalState })), ...goals.map((x) => ({ id: x.id, entityType: "goal", label: x.title, state: x.status })), ...projects.map((x) => ({ id: x.id, entityType: "project", label: x.name, state: x.status })), ...applications.map((x) => ({ id: x.id, entityType: "application", label: x.name, state: x.status })),
    ...tasks.map((x) => ({ id: x.id, entityType: "task", label: x.title, state: x.status })), ...procedures.map((x) => ({ id: x.id, entityType: "procedure", label: x.name, state: x.status })),
    ...risks.map((x) => ({ id: x.id, entityType: "risk", label: x.name, state: x.status })), ...metrics.map((x) => ({ id: x.id, entityType: "metric", label: x.name, state: x.status })),
    ...resources.map((x) => ({ id: x.id, entityType: "resource", label: x.name, state: x.type })), ...policies.map((x) => ({ id: x.id, entityType: "policy", label: x.name, state: x.status })),
    ...clients.map((x) => ({ id: x.id, entityType: "client", label: x.name, state: x.status })), ...workforce.map((x) => ({ id: x.id, entityType: "workforce", label: x.name, state: `${x.type}:${x.status}` })),
    ...files.map((x) => ({ id: x.id, entityType: "file", label: x.name, state: x.isFolder ? "folder" : x.mimeType }))];
  res.json({ data: { schemaVersion: "company-graph-v1", generatedAt: new Date().toISOString(), nodes, edges: relations.map((x) => ({ id: x.id, type: x.dependencyType, from: { entityType: x.fromEntityType, entityId: x.fromEntityId }, to: { entityType: x.toEntityType, entityId: x.toEntityId }, status: x.status })), organizationalMemberships: departments.map((x) => ({ entityType: x.entityType, entityId: x.entityId, departmentKey: x.department.key, role: x.relationshipRole })) } });
}));

companyIntelligenceRouter.get("/entities/:entityType/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const requestedType = String(req.params.entityType); const entityType = requestedType === "requirement" ? "company_record" : requestedType;
  const record = await resolveEntity(workspaceId, requestedType, String(req.params.id)); if (!record) return res.status(404).json({ error: "entity_not_found" });
  const [contexts, relations, evidence] = await Promise.all([
    organizationalContextsForEntities(workspaceId, entityType, [record.id]),
    prisma.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: { in: [entityType, requestedType] }, fromEntityId: record.id }, { toEntityType: { in: [entityType, requestedType] }, toEntityId: record.id }] }, orderBy: { updatedAt: "desc" } }),
    prisma.evidenceRecord.findMany({ where: { workspaceId, entityType: { in: [entityType, requestedType] }, entityId: record.id }, orderBy: { observedAt: "desc" } })
  ]);
  const relatedRefs = relations.map((relation) => relation.fromEntityId === record.id && [entityType, requestedType].includes(relation.fromEntityType || "")
    ? { entityType: relation.toEntityType!, entityId: relation.toEntityId! }
    : { entityType: relation.fromEntityType!, entityId: relation.fromEntityId! });
  const related = (await Promise.all(relatedRefs.slice(0, 80).map(async (reference) => ({ ...reference, record: await resolveEntity(workspaceId, reference.entityType, reference.entityId) })))).filter((item) => item.record);
  res.json({ data: { entityType: requestedType, record, organizationalContext: contexts.get(record.id), relations, related, evidence } });
}));

companyIntelligenceRouter.get("/health", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  if (departmentKey && !isCanonicalDepartmentKey(departmentKey)) return res.status(400).json({ error: "invalid_department_key" });
  const [recordIds, taskIds, riskIds, goalIds, projectIds, procedureIds, workforceIds, resourceIds, decisionIds, metricIds] = departmentKey ? await Promise.all([
    contextualEntityIds(workspaceId, "company_record", departmentKey), contextualEntityIds(workspaceId, "task", departmentKey), contextualEntityIds(workspaceId, "risk", departmentKey), contextualEntityIds(workspaceId, "goal", departmentKey), contextualEntityIds(workspaceId, "project", departmentKey), contextualEntityIds(workspaceId, "procedure", departmentKey), contextualEntityIds(workspaceId, "workforce", departmentKey), contextualEntityIds(workspaceId, "resource", departmentKey), contextualEntityIds(workspaceId, "decision", departmentKey), contextualEntityIds(workspaceId, "metric", departmentKey)
  ]) : [null, null, null, null, null, null, null, null, null, null];
  const scopedEntityIds = departmentKey ? [...(recordIds ?? []), ...(taskIds ?? []), ...(riskIds ?? []), ...(goalIds ?? []), ...(projectIds ?? []), ...(procedureIds ?? []), ...(resourceIds ?? []), ...(decisionIds ?? []), ...(metricIds ?? [])] : null;
  const [records, overdueTasks, blockedTasks, openTasks, staleEvidence, risks, goals, projects, procedures, people, resources, incidents, decisions, metrics] = await Promise.all([
    prisma.companyRecord.groupBy({ by: ["functionalState"], where: { workspaceId, status: { not: "archived" }, ...(recordIds ? { id: { in: recordIds } } : {}) }, _count: true }),
    prisma.task.count({ where: { workspaceId, ...(taskIds ? { id: { in: taskIds } } : {}), dueDate: { lt: new Date() }, status: { notIn: ["done", "archived"] } } }), prisma.task.count({ where: { workspaceId, ...(taskIds ? { id: { in: taskIds } } : {}), status: "blocked" } }),
    prisma.task.count({ where: { workspaceId, ...(taskIds ? { id: { in: taskIds } } : {}), status: { notIn: ["done", "archived"] } } }),
    prisma.evidenceRecord.count({ where: { workspaceId, ...(scopedEntityIds ? { entityId: { in: scopedEntityIds } } : {}), verificationStatus: { in: ["stale", "rejected"] } } }), prisma.risk.count({ where: { workspaceId, ...(riskIds ? { id: { in: riskIds } } : {}), status: { not: "archived" } } }),
    prisma.goal.count({ where: { workspaceId, ...(goalIds ? { id: { in: goalIds } } : {}), status: { notIn: ["completed", "archived"] } } }),
    prisma.project.count({ where: { workspaceId, ...(projectIds ? { id: { in: projectIds } } : {}), status: { not: "archived" } } }),
    prisma.procedure.count({ where: { workspaceId, ...(procedureIds ? { id: { in: procedureIds } } : {}), status: { not: "archived" } } }),
    prisma.workforceEntity.count({ where: { workspaceId, ...(workforceIds ? { OR: [{ id: { in: workforceIds } }, ...(departmentKey ? [{ department: departmentKey }] : [])] } : {}), status: { not: "archived" } } }),
    prisma.resource.count({ where: { workspaceId, ...(resourceIds ? { id: { in: resourceIds } } : {}) } }),
    prisma.companyRecord.count({ where: { workspaceId, ...(recordIds ? { id: { in: recordIds } } : {}), recordType: { in: ["technical_incident", "operational_issue"] }, status: { not: "archived" } } }),
    prisma.decision.count({ where: { workspaceId, ...(decisionIds ? { id: { in: decisionIds } } : {}), status: { in: ["draft", "proposed", "review_required", "pending"] } } }),
    prisma.metric.count({ where: { workspaceId, ...(metricIds ? { id: { in: metricIds } } : {}), status: { not: "archived" } } })
  ]); const stateCounts = Object.fromEntries(records.map((x) => [x.functionalState, x._count]));
  const issueLoad = overdueTasks + blockedTasks + staleEvidence + (stateCounts.broken ?? 0) + (stateCounts.missing ?? 0); const score = Math.max(0, Math.round(100 - Math.min(100, issueLoad * 4)));
  res.json({ data: { scope: departmentKey ? { type: "department", departmentKey } : { type: "company" }, score, status: score >= 80 ? "healthy" : score >= 55 ? "attention" : "critical", signals: { activeProjects: projects, openTasks, overdueTasks, blockedTasks, applicableProcedures: procedures, assignedPeopleAndAgents: people, resources, incidentsAndIssues: incidents, decisionsRequiringReview: decisions, activeRisks: risks, activeGoals: goals, trackedMetrics: metrics, staleOrRejectedEvidence: staleEvidence, functionalStates: stateCounts } } });
}));

companyIntelligenceRouter.get("/tasks/:id/agent-context", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const task = await prisma.task.findFirst({ where: { id: String(req.params.id), workspaceId }, include: { project: true, goal: true, target: true, taskList: true, assignedWorkforceEntity: true, reviewerUser: { select: { id: true, name: true } } } });
  if (!task) return res.status(404).json({ error: "task_not_found" }); const [contexts, dependencies, policies, procedures] = await Promise.all([
    organizationalContextsForEntities(workspaceId, "task", [task.id]), prisma.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "task", fromEntityId: task.id }, { toEntityType: "task", toEntityId: task.id }] } }),
    prisma.policy.findMany({ where: { workspaceId, status: { not: "archived" } }, take: 50 }), prisma.procedure.findMany({ where: { workspaceId, status: { not: "archived" } }, include: { steps: { orderBy: { stepOrder: "asc" } } }, take: 50 })
  ]);
  const related = dependencies.map((dependency) => dependency.fromEntityType === "task" && dependency.fromEntityId === task.id
    ? { entityType: dependency.toEntityType, entityId: dependency.toEntityId }
    : { entityType: dependency.fromEntityType, entityId: dependency.fromEntityId });
  const ids = (entityType: string) => related.filter((item) => item.entityType === entityType && item.entityId).map((item) => item.entityId!);
  const taskDepartmentKeys = [contexts.get(task.id)?.ownerDepartment?.key, ...(contexts.get(task.id)?.relatedDepartments ?? []).map((department) => department.key), ...(contexts.get(task.id)?.applicableDepartments ?? []).map((department) => department.key)].filter((key): key is string => Boolean(key));
  const contextualRiskIds = [...new Set((await Promise.all(taskDepartmentKeys.map((key) => contextualEntityIds(workspaceId, "risk", key)))).flat())];
  const [records, features, resources, decisions, applications, risks, knownIssues] = await Promise.all([
    prisma.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } }),
    prisma.applicationFeature.findMany({ where: { id: { in: ids("feature") }, application: { workspaceId } }, include: { featureDefinition: true, application: { select: { id: true, name: true } } } }),
    prisma.resource.findMany({ where: { workspaceId, id: { in: ids("resource") } } }), prisma.decision.findMany({ where: { workspaceId, id: { in: ids("decision") } } }),
    prisma.application.findMany({ where: { workspaceId, id: { in: ids("application") } }, include: { architecture: true, interfaces: true, repositories: true, technologies: { include: { technologyDefinition: true } } } }),
    prisma.risk.findMany({ where: { workspaceId, status: { not: "archived" }, id: { in: [...ids("risk"), ...contextualRiskIds] } }, include: { controls: true } }),
    prisma.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, recordType: { in: ["operational_issue", "technical_incident", "escalation"] }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } })
  ]);
  const evidence = await prisma.evidenceRecord.findMany({ where: { workspaceId, OR: [{ entityType: "task", entityId: task.id }, { entityId: { in: records.map((record) => record.id) } }] }, orderBy: { observedAt: "desc" } });
  res.json({ data: {
    schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(), task, organizationalContext: contexts.get(task.id),
    intent: { objective: task.goal, target: task.target, project: task.project, businessContext: records.map((record) => ({ id: record.id, type: record.recordType, purpose: record.businessPurpose, rationale: record.rationale })) },
    requirements: records.filter((record) => record.recordType === "requirement"), relatedRecords: records, features, applications,
    affectedComponents: applications.flatMap((application) => application.architecture), dependencies, resources, procedures, policies, decisions, evidence,
    risks, knownIssues: knownIssues.filter((record) => record.recordType === "operational_issue"), incidents: knownIssues.filter((record) => record.recordType === "technical_incident"),
    permissions: task.assignedWorkforceEntity ? { authorityScope: task.assignedWorkforceEntity.authorityScope, tools: task.assignedWorkforceEntity.toolIndex, runtimeMode: task.assignedWorkforceEntity.runtimeMode } : null,
    verification: { acceptanceCriteria: records.flatMap((record) => Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria : []), requiredEvidence: ["implementation", "test", "runtime_or_human_verification"] },
    constraints: { sourceOfTruth: "roost", requireVerifiedEvidenceForCompletion: true, preserveHumanApprovalRequirements: true, declarationIsNotObservation: true, escalateWhenAuthorityMissing: true },
    escalationRules: { records: knownIssues.filter((record) => record.recordType === "escalation"), policyModesRequiringApproval: policies.filter((policy) => policy.enforcementMode === "require_approval" || policy.enforcementMode === "block") }
  } });
}));
