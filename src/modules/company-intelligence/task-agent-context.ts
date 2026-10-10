import type { AgentExecution, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { contextualEntityIds, organizationalContextsForEntities } from "../organizational-context/organizational-context.service";
import { prepareExecutionPacket } from "../agent-runtime/execution-packet";
import { taskDecisionAuthorities } from "../decisions/decision-authority";

export async function loadTaskAgentContext(workspaceId: string, taskId: string, execution: AgentExecution | null = null, db: Prisma.TransactionClient = prisma, submission?: import("../agent-runtime/task-role-context").RoleSubmission, authorities?: Awaited<ReturnType<typeof taskDecisionAuthorities>>) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId }, include: { project: true, goal: true, target: true, taskList: true, assignedWorkforceEntity: true, reviewerUser: { select: { id: true } } } });
  if (!task) return null;
  const [contexts, dependencies, policies, procedures] = await Promise.all([
    organizationalContextsForEntities(workspaceId, "task", [task.id], db), db.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "task", fromEntityId: task.id }, { toEntityType: "task", toEntityId: task.id }] } }),
    db.policy.findMany({ where: { workspaceId, status: { not: "archived" } }, take: 50 }), db.procedure.findMany({ where: { workspaceId, status: { not: "archived" } }, include: { steps: { orderBy: { stepOrder: "asc" } } }, take: 50 })
  ]);
  const related = dependencies.map((dependency) => dependency.fromEntityType === "task" && dependency.fromEntityId === task.id
    ? { entityType: dependency.toEntityType, entityId: dependency.toEntityId }
    : { entityType: dependency.fromEntityType, entityId: dependency.fromEntityId });
  const ids = (entityType: string) => related.filter((item) => item.entityType === entityType && item.entityId).map((item) => item.entityId!);
  const taskDepartmentKeys = [contexts.get(task.id)?.ownerDepartment?.key, ...(contexts.get(task.id)?.relatedDepartments ?? []).map((department) => department.key), ...(contexts.get(task.id)?.applicableDepartments ?? []).map((department) => department.key)].filter((key): key is string => Boolean(key));
  const contextualRiskIds = [...new Set((await Promise.all(taskDepartmentKeys.map((key) => contextualEntityIds(workspaceId, "risk", key, true, db)))).flat())];
  const [records, features, resources, decisions, applications, risks, knownIssues] = await Promise.all([
    db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } }),
    db.applicationFeature.findMany({ where: { id: { in: ids("feature") }, application: { workspaceId } }, include: { featureDefinition: true, application: { select: { id: true, name: true } } } }),
    db.resource.findMany({ where: { workspaceId, id: { in: ids("resource") } } }), db.decision.findMany({ where: { workspaceId, id: { in: ids("decision") } } }),
    db.application.findMany({ where: { workspaceId, id: { in: ids("application") } }, include: { architecture: true, interfaces: true, repositories: true, technologies: { include: { technologyDefinition: true } } } }),
    db.risk.findMany({ where: { workspaceId, status: { not: "archived" }, id: { in: [...ids("risk"), ...contextualRiskIds] } }, include: { controls: true } }),
    db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, recordType: { in: ["operational_issue", "technical_incident", "escalation"] }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } })
  ]);
  const governed=await db.taskDecisionEffect.findMany({where:{workspaceId,taskId}});
  const decisionAuthorities = authorities ?? await taskDecisionAuthorities(db, workspaceId, taskId);
  const replaced=new Set(governed.map(r=>r.supersedesId).filter(Boolean));
  const effective=await db.decision.findMany({where:{workspaceId,id:{in:governed.map(r=>r.decisionId).filter(id=>!replaced.has(id))}}});
  decisions.splice(0,decisions.length,...decisions.filter(d=>!replaced.has(d.id)&&!effective.some(n=>n.id===d.id)),...effective);
  // Runtime receipts are outputs of this task, not changes to its input.
  // They remain available through execution and evidence views. Human evidence
  // and evidence attached to required records still participates in Ready.
  const evidence = await db.evidenceRecord.findMany({ where: {
    workspaceId,
    OR: [{ entityType: "task", entityId: task.id }, { entityId: { in: records.map((record) => record.id) } }],
    NOT: { entityType: "task", entityId: task.id, source: { in: ["agent", "system"] }, type: { in: ["manual_verification", "deployment"] } }
  }, orderBy: { observedAt: "desc" } });
  return {
    schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(), task, organizationalContext: contexts.get(task.id),...(decisionAuthorities.length?{decisionAuthorities}:{}),
    ...(execution ? { executionPacket: await prepareExecutionPacket(execution, task, db, submission) } : {}),
    intent: { objective: task.goal, target: task.target, project: task.project, businessContext: records.map((record) => ({ id: record.id, type: record.recordType, purpose: record.businessPurpose, rationale: record.rationale })) },
    requirements: records.filter((record) => record.recordType === "requirement"), relatedRecords: records, features, applications,
    affectedComponents: applications.flatMap((application) => application.architecture), dependencies, resources, procedures, policies, decisions, evidence,
    risks, knownIssues: knownIssues.filter((record) => record.recordType === "operational_issue"), incidents: knownIssues.filter((record) => record.recordType === "technical_incident"),
    permissions: task.assignedWorkforceEntity ? { authorityScope: task.assignedWorkforceEntity.authorityScope, tools: task.assignedWorkforceEntity.toolIndex, runtimeMode: task.assignedWorkforceEntity.runtimeMode } : null,
    verification: { acceptanceCriteria: records.flatMap((record) => Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria : []), requiredEvidence: ["implementation", "test", "runtime_or_human_verification"] },
    constraints: { sourceOfTruth: "roost", requireVerifiedEvidenceForCompletion: true, preserveHumanApprovalRequirements: true, declarationIsNotObservation: true, escalateWhenAuthorityMissing: true },
    escalationRules: { records: knownIssues.filter((record) => record.recordType === "escalation"), policyModesRequiringApproval: policies.filter((policy) => policy.enforcementMode === "require_approval" || policy.enforcementMode === "block") }
  };
}

export async function loadCompanyInformationContext(workspaceId: string, taskId: string, execution: AgentExecution, db: Prisma.TransactionClient, submission?: import("../agent-runtime/task-role-context").RoleSubmission) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId }, include: { goal: true, assignedWorkforceEntity: true } });
  if (!task) return null;
  const contract = (execution?.metadata as any)?.executionContract;
  if (contract?.executionClass !== "roost-company-information-v1") throw new Error("company_information_scope_invalid");
  {
    const ids = (field: string) => Array.isArray(contract[field]?.items) ? contract[field].items.slice(0, 30).map((r: any) => r.id).filter((id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) : [];
    const [procedures, dependencies, decisions, effects] = await Promise.all([
      db.procedure.findMany({ where: { workspaceId, id: { in: ids("procedures") } } }),
      db.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "task", fromEntityId: task.id }, { toEntityType: "task", toEntityId: task.id }] } }),
      db.decision.findMany({ where: { workspaceId, id: { in: ids("decisions") } } }),
      db.taskDecisionEffect.findMany({ where: { workspaceId, taskId } })
    ]);
    const superseded = new Set(effects.map(e => e.supersedesId).filter(Boolean));
    const effective = await db.decision.findMany({ where: { workspaceId, id: { in: effects.map(e => e.decisionId).filter(id => !superseded.has(id)) } } });
    return { schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(),
      task: { id: task.id, workspaceId, title: task.title, status: task.status, updatedAt: task.updatedAt,
        goalId: task.goalId, projectId: task.projectId, goal: task.goal ? { id: task.goal.id, workspaceId: task.goal.workspaceId } : null,
        assignedWorkforceEntityId: task.assignedWorkforceEntityId, assignedWorkforceEntity: task.assignedWorkforceEntity ? {
          id: task.assignedWorkforceEntity.id, workspaceId, type: task.assignedWorkforceEntity.type, status: task.assignedWorkforceEntity.status,
          role: task.assignedWorkforceEntity.role, skillIndex: task.assignedWorkforceEntity.skillIndex, toolIndex: [], authorityScope: [] } : null },
      executionPacket: await prepareExecutionPacket(execution!, task, db, submission),
      procedures, dependencies, decisions: [...decisions.filter(d => !superseded.has(d.id) && !effective.some(e => e.id === d.id)), ...effective]
    };
  }
}
