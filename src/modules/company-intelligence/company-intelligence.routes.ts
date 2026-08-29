import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { isCanonicalDepartmentKey } from "../../operating-model/department-registry";
import { contextualEntityIds, organizationalContextsForEntities } from "../organizational-context/organizational-context.service";

export const companyIntelligenceRouter = Router();

companyIntelligenceRouter.get("/search", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const q = typeof req.query.q === "string" ? req.query.q.trim() : ""; if (q.length < 2) return res.json({ data: [] });
  const [goals, tasks, projects, records, applications, clients, procedures, resources, features, workforce, agents, decisions, risks, metrics] = await Promise.all([
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
    prisma.metric.findMany({ where: { workspaceId, name: { contains: q, mode: "insensitive" } }, take: 20 })
  ]);
  const data = [
    ...goals.map((item) => ({ entityType: "goal", id: item.id, title: item.title, subtitle: item.status })), ...tasks.map((item) => ({ entityType: "task", id: item.id, title: item.title, subtitle: item.status })),
    ...projects.map((item) => ({ entityType: "project", id: item.id, title: item.name, subtitle: item.status })), ...records.map((item) => ({ entityType: "company_record", recordType: item.recordType, id: item.id, title: item.title, subtitle: item.status })),
    ...applications.map((item) => ({ entityType: "application", id: item.id, title: item.name, subtitle: item.status })), ...clients.map((item) => ({ entityType: "client", id: item.id, title: item.name, subtitle: item.companyName })),
    ...procedures.map((item) => ({ entityType: "procedure", id: item.id, title: item.name, subtitle: item.status })), ...resources.map((item) => ({ entityType: "resource", id: item.id, title: item.name, subtitle: item.type })),
    ...features.map((item) => ({ entityType: "feature", id: item.id, title: item.featureDefinition.name, subtitle: item.application.name })), ...workforce.map((item) => ({ entityType: "workforce", id: item.id, title: item.name, subtitle: item.role || item.type })),
    ...agents.map((item) => ({ entityType: "agent", id: item.id, title: item.name, subtitle: item.status })), ...decisions.map((item) => ({ entityType: "decision", id: item.id, title: item.title, subtitle: item.status })),
    ...risks.map((item) => ({ entityType: "risk", id: item.id, title: item.name, subtitle: item.status })), ...metrics.map((item) => ({ entityType: "metric", id: item.id, title: item.name, subtitle: item.status }))
  ].slice(0, 100); res.json({ data });
}));

companyIntelligenceRouter.get("/graph", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const [relations, departments, records, goals, projects, applications, tasks, procedures, risks, metrics, resources, policies, clients, workforce] = await Promise.all([
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
    prisma.workforceEntity.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, status: true, type: true } })
  ]);
  const nodes = [...records.map((x) => ({ id: x.id, entityType: "company_record", recordType: x.recordType, label: x.title, state: x.functionalState })), ...goals.map((x) => ({ id: x.id, entityType: "goal", label: x.title, state: x.status })), ...projects.map((x) => ({ id: x.id, entityType: "project", label: x.name, state: x.status })), ...applications.map((x) => ({ id: x.id, entityType: "application", label: x.name, state: x.status })),
    ...tasks.map((x) => ({ id: x.id, entityType: "task", label: x.title, state: x.status })), ...procedures.map((x) => ({ id: x.id, entityType: "procedure", label: x.name, state: x.status })),
    ...risks.map((x) => ({ id: x.id, entityType: "risk", label: x.name, state: x.status })), ...metrics.map((x) => ({ id: x.id, entityType: "metric", label: x.name, state: x.status })),
    ...resources.map((x) => ({ id: x.id, entityType: "resource", label: x.name, state: x.type })), ...policies.map((x) => ({ id: x.id, entityType: "policy", label: x.name, state: x.status })),
    ...clients.map((x) => ({ id: x.id, entityType: "client", label: x.name, state: x.status })), ...workforce.map((x) => ({ id: x.id, entityType: "workforce", label: x.name, state: `${x.type}:${x.status}` }))];
  res.json({ data: { schemaVersion: "company-graph-v1", generatedAt: new Date().toISOString(), nodes, edges: relations.map((x) => ({ id: x.id, type: x.dependencyType, from: { entityType: x.fromEntityType, entityId: x.fromEntityId }, to: { entityType: x.toEntityType, entityId: x.toEntityId }, status: x.status })), organizationalMemberships: departments.map((x) => ({ entityType: x.entityType, entityId: x.entityId, departmentKey: x.department.key, role: x.relationshipRole })) } });
}));

companyIntelligenceRouter.get("/health", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  if (departmentKey && !isCanonicalDepartmentKey(departmentKey)) return res.status(400).json({ error: "invalid_department_key" });
  const [recordIds, taskIds, riskIds, goalIds] = departmentKey ? await Promise.all([contextualEntityIds(workspaceId, "company_record", departmentKey), contextualEntityIds(workspaceId, "task", departmentKey), contextualEntityIds(workspaceId, "risk", departmentKey), contextualEntityIds(workspaceId, "goal", departmentKey)]) : [null, null, null, null];
  const scopedEntityIds = departmentKey ? [...(recordIds ?? []), ...(taskIds ?? []), ...(riskIds ?? []), ...(goalIds ?? [])] : null;
  const [records, overdueTasks, blockedTasks, staleEvidence, risks, goals] = await Promise.all([
    prisma.companyRecord.groupBy({ by: ["functionalState"], where: { workspaceId, status: { not: "archived" }, ...(recordIds ? { id: { in: recordIds } } : {}) }, _count: true }),
    prisma.task.count({ where: { workspaceId, ...(taskIds ? { id: { in: taskIds } } : {}), dueDate: { lt: new Date() }, status: { notIn: ["done", "archived"] } } }), prisma.task.count({ where: { workspaceId, ...(taskIds ? { id: { in: taskIds } } : {}), status: "blocked" } }),
    prisma.evidenceRecord.count({ where: { workspaceId, ...(scopedEntityIds ? { entityId: { in: scopedEntityIds } } : {}), verificationStatus: { in: ["stale", "rejected"] } } }), prisma.risk.count({ where: { workspaceId, ...(riskIds ? { id: { in: riskIds } } : {}), status: { not: "archived" } } }),
    prisma.goal.count({ where: { workspaceId, ...(goalIds ? { id: { in: goalIds } } : {}), status: { notIn: ["completed", "archived"] } } })
  ]); const stateCounts = Object.fromEntries(records.map((x) => [x.functionalState, x._count]));
  const issueLoad = overdueTasks + blockedTasks + staleEvidence + (stateCounts.broken ?? 0) + (stateCounts.missing ?? 0); const score = Math.max(0, Math.round(100 - Math.min(100, issueLoad * 4)));
  res.json({ data: { scope: departmentKey ? { type: "department", departmentKey } : { type: "company" }, score, status: score >= 80 ? "healthy" : score >= 55 ? "attention" : "critical", signals: { overdueTasks, blockedTasks, staleOrRejectedEvidence: staleEvidence, activeRisks: risks, activeGoals: goals, functionalStates: stateCounts } } });
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
  const [records, features, resources, decisions, applications] = await Promise.all([
    prisma.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } }),
    prisma.applicationFeature.findMany({ where: { id: { in: ids("feature") }, application: { workspaceId } }, include: { featureDefinition: true, application: { select: { id: true, name: true } } } }),
    prisma.resource.findMany({ where: { workspaceId, id: { in: ids("resource") } } }), prisma.decision.findMany({ where: { workspaceId, id: { in: ids("decision") } } }),
    prisma.application.findMany({ where: { workspaceId, id: { in: ids("application") } }, include: { architecture: true, interfaces: true, repositories: true, technologies: { include: { technologyDefinition: true } } } })
  ]);
  const evidence = await prisma.evidenceRecord.findMany({ where: { workspaceId, OR: [{ entityType: "task", entityId: task.id }, { entityId: { in: records.map((record) => record.id) } }] }, orderBy: { observedAt: "desc" } });
  res.json({ data: {
    schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(), task, organizationalContext: contexts.get(task.id),
    intent: { objective: task.goal, target: task.target, project: task.project, businessContext: records.map((record) => ({ id: record.id, type: record.recordType, purpose: record.businessPurpose, rationale: record.rationale })) },
    requirements: records.filter((record) => record.recordType === "requirement"), relatedRecords: records, features, applications,
    affectedComponents: applications.flatMap((application) => application.architecture), dependencies, resources, procedures, policies, decisions, evidence,
    permissions: task.assignedWorkforceEntity ? { authorityScope: task.assignedWorkforceEntity.authorityScope, tools: task.assignedWorkforceEntity.toolIndex, runtimeMode: task.assignedWorkforceEntity.runtimeMode } : null,
    verification: { acceptanceCriteria: records.flatMap((record) => Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria : []), requiredEvidence: ["implementation", "test", "runtime_or_human_verification"] },
    constraints: { sourceOfTruth: "roost", requireVerifiedEvidenceForCompletion: true, preserveHumanApprovalRequirements: true, declarationIsNotObservation: true, escalateWhenAuthorityMissing: true }
  } });
}));
