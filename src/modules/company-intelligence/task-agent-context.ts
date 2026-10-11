import type { AgentExecution, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { contextualEntityIds, organizationalContextsForEntities } from "../organizational-context/organizational-context.service";
import { prepareExecutionPacket } from "../agent-runtime/execution-packet";
import { companySourceApprovedContent, companySourceEligible, companySourceReviews } from "../agent-runtime/company-source-trust";
import { taskDecisionAuthorities } from "../decisions/decision-authority";
import { currentCompanyDirection } from "../strategy/company-direction";
import { projectTaskSource, taskSourceCandidate, taskSourceEligible, taskSourceProvenance, taskSourceReviews, type TaskSourceType } from "../agent-runtime/task-source-trust";

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
  const [candidateRecords, features, resources, decisions, applications, risks, candidateIssues] = await Promise.all([
    db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } }),
    db.applicationFeature.findMany({ where: { id: { in: ids("feature") }, application: { workspaceId } }, include: { featureDefinition: true, application: { select: { id: true, name: true } } } }),
    db.resource.findMany({ where: { workspaceId, id: { in: ids("resource") } } }), db.decision.findMany({ where: { workspaceId, id: { in: ids("decision") } } }),
    db.application.findMany({ where: { workspaceId, id: { in: ids("application") } }, include: { architecture: true, interfaces: true, repositories: true, technologies: { include: { technologyDefinition: true } } } }),
    db.risk.findMany({ where: { workspaceId, status: { not: "archived" }, id: { in: [...ids("risk"), ...contextualRiskIds] } }, include: { controls: true } }),
    db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, recordType: { in: ["operational_issue", "technical_incident", "escalation"] }, OR: [{ id: { in: [...ids("company_record"), ...ids("requirement")] } }, ...(task.projectId ? [{ projectId: task.projectId }] : [])] } })
  ]);
  const sourceReviews = execution ? await companySourceReviews(db, workspaceId, taskId) : null;
  const otherReviews = execution ? await taskSourceReviews(db, workspaceId, taskId) : null;
  const applicationIds = new Set(execution?.applicationId ? [execution.applicationId] : []);
  const approved = <T extends { id: string }>(type: TaskSourceType, rows: T[]) => !otherReviews ? rows : rows.filter(row => {
    const source = projectTaskSource(type, row);
    return taskSourceEligible(source, otherReviews.get(`${type}:${row.id}`), workspaceId, taskId, applicationIds, task.projectId);
  });
  const reviewedView = <T extends { id: string }>(type: TaskSourceType, rows: T[]): any[] => !otherReviews ? rows : approved(type, rows).map(row => {
    const source = projectTaskSource(type, row);
    return { ...source.content, provenance: taskSourceProvenance(source, otherReviews.get(`${type}:${row.id}`)!) };
  });
  const records = sourceReviews ? candidateRecords.filter((record) => companySourceEligible(record, sourceReviews.get(record.id), taskId, execution!.applicationId)) : candidateRecords;
  const knownIssues = sourceReviews ? candidateIssues.filter((record) => companySourceEligible(record, sourceReviews.get(record.id), taskId, execution!.applicationId)) : candidateIssues;
  const visibleRecords = execution ? records.map(companySourceApprovedContent) : records;
  const visibleIssues = execution ? knownIssues.map(companySourceApprovedContent) : knownIssues;
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
    OR: [{ entityType: "task", entityId: task.id }, ...(!execution ? [{ entityId: { in: records.map((record) => record.id) } }] : [])],
    NOT: { entityType: "task", entityId: task.id, source: { in: ["agent", "system"] }, type: { in: ["manual_verification", "deployment"] } }
  }, orderBy: { observedAt: "desc" } });
  const visiblePolicies = reviewedView("policy", policies);
  const visibleProcedures = reviewedView("procedure", procedures);
  const visibleDecisions = reviewedView("decision", decisions);
  const visibleEvidence = reviewedView("evidence", evidence);
  const additionalSources = [];
  if (otherReviews) for (const review of otherReviews.values()) {
    if (!["note", "knowledge_item", "drive_snapshot"].includes(review.sourceType)) continue;
    const source = await taskSourceCandidate(db, workspaceId, review.sourceType as TaskSourceType, review.sourceId);
    if (source && taskSourceEligible(source, review, workspaceId, taskId, applicationIds, task.projectId))
      additionalSources.push({ content: source.content, provenance: taskSourceProvenance(source, review) });
  }
  // Task identity and its own instructions are the admitted work order. Linked
  // planning objects can contain separate mutable prose, so only their IDs
  // accompany an execution until they have a source-review contract.
  const executionTask = execution ? { ...task,
    project: task.project ? { id: task.project.id, workspaceId: task.project.workspaceId } : null,
    goal: task.goal ? { id: task.goal.id, workspaceId: task.goal.workspaceId } : null,
    target: task.target ? { id: task.target.id, workspaceId: task.target.workspaceId } : null,
    taskList: task.taskList ? { id: task.taskList.id, workspaceId: task.taskList.workspaceId } : null,
    assignedWorkforceEntity: task.assignedWorkforceEntity ? {
      id: task.assignedWorkforceEntity.id, workspaceId: task.assignedWorkforceEntity.workspaceId,
      type: task.assignedWorkforceEntity.type, status: task.assignedWorkforceEntity.status,
      role: task.assignedWorkforceEntity.role, skillIndex: task.assignedWorkforceEntity.skillIndex,
      toolIndex: task.assignedWorkforceEntity.toolIndex, authorityScope: task.assignedWorkforceEntity.authorityScope,
      runtimeMode: task.assignedWorkforceEntity.runtimeMode
    } : null } : task;
  return {
    schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(), task: executionTask, organizationalContext: execution ? null : contexts.get(task.id),...(decisionAuthorities.length?{decisionAuthorities}:{}),
    companyDirection: await currentCompanyDirection(db, workspaceId),
    ...(execution ? { executionPacket: await prepareExecutionPacket(execution, task, db, submission) } : {}),
    intent: { objective: executionTask.goal, target: executionTask.target, project: executionTask.project, businessContext: visibleRecords.map((record) => ({ id: record.id, type: record.recordType, purpose: record.businessPurpose, ...(!execution && { rationale: "rationale" in record ? record.rationale : null }) })) },
    requirements: visibleRecords.filter((record) => record.recordType === "requirement"), relatedRecords: visibleRecords,
    features: execution ? [] : features, applications: execution ? [] : applications,
    affectedComponents: execution ? [] : applications.flatMap((application) => application.architecture),
    dependencies: execution ? [] : dependencies, resources: execution ? [] : resources,
    procedures: visibleProcedures, policies: visiblePolicies, decisions: visibleDecisions, evidence: visibleEvidence,
    ...(execution ? { additionalSources } : {}),
    risks: execution ? [] : risks, knownIssues: visibleIssues.filter((record) => record.recordType === "operational_issue"), incidents: visibleIssues.filter((record) => record.recordType === "technical_incident"),
    permissions: task.assignedWorkforceEntity ? { authorityScope: task.assignedWorkforceEntity.authorityScope, tools: task.assignedWorkforceEntity.toolIndex, runtimeMode: task.assignedWorkforceEntity.runtimeMode } : null,
    verification: { acceptanceCriteria: execution ? [] : records.flatMap((record) => Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria : []), requiredEvidence: ["implementation", "test", "runtime_or_human_verification"] },
    constraints: { sourceOfTruth: "roost", requireVerifiedEvidenceForCompletion: true, preserveHumanApprovalRequirements: true, declarationIsNotObservation: true, escalateWhenAuthorityMissing: true },
    escalationRules: { records: visibleIssues.filter((record) => record.recordType === "escalation"), policyModesRequiringApproval: visiblePolicies.filter((policy) => policy.enforcementMode === "require_approval" || policy.enforcementMode === "block") }
  };
}

export async function loadCompanyInformationContext(workspaceId: string, taskId: string, execution: AgentExecution, db: Prisma.TransactionClient, submission?: import("../agent-runtime/task-role-context").RoleSubmission) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId }, include: { goal: true, assignedWorkforceEntity: true } });
  if (!task) return null;
  const contract = (execution?.metadata as any)?.executionContract;
  if (!["roost-company-information-v1", "roost-company-information-runtime-v1"].includes(contract?.executionClass)) throw new Error("company_information_scope_invalid");
  {
    const ids = (field: string) => Array.isArray(contract[field]?.items) ? contract[field].items.slice(0, 30).map((r: any) => r.id).filter((id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) : [];
    const [procedures, dependencies, effects] = await Promise.all([
      db.procedure.findMany({ where: { workspaceId, id: { in: ids("procedures") } }, include: { steps: { orderBy: { stepOrder: "asc" } } } }),
      db.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "task", fromEntityId: task.id }, { toEntityType: "task", toEntityId: task.id }] } }),
      db.taskDecisionEffect.findMany({ where: { workspaceId, taskId } })
    ]);
    const superseded = new Set(effects.map(e => e.supersedesId).filter(Boolean));
    const effective = await db.decision.findMany({ where: { workspaceId, id: { in: effects.map(e => e.decisionId).filter(id => !superseded.has(id)) } } });
    const reviews = await taskSourceReviews(db, workspaceId, taskId);
    const applicationIds = new Set(execution.applicationId ? [execution.applicationId] : []);
    const admitted = <T extends { id: string }>(type: TaskSourceType, rows: T[]) => rows.filter(row => {
      const source = projectTaskSource(type, row);
      return taskSourceEligible(source, reviews.get(`${type}:${row.id}`), workspaceId, taskId, applicationIds, task.projectId);
    });
    return { schemaVersion: "task-agent-execution-context-v1", generatedAt: new Date().toISOString(),
      companyDirection: await currentCompanyDirection(db, workspaceId),
      task: { id: task.id, workspaceId, title: task.title, status: task.status, updatedAt: task.updatedAt,
        goalId: task.goalId, projectId: task.projectId, goal: task.goal ? { id: task.goal.id, workspaceId: task.goal.workspaceId } : null,
        assignedWorkforceEntityId: task.assignedWorkforceEntityId, assignedWorkforceEntity: task.assignedWorkforceEntity ? {
          id: task.assignedWorkforceEntity.id, workspaceId, type: task.assignedWorkforceEntity.type, status: task.assignedWorkforceEntity.status,
          role: task.assignedWorkforceEntity.role, skillIndex: task.assignedWorkforceEntity.skillIndex, toolIndex: [], authorityScope: [] } : null },
      executionPacket: await prepareExecutionPacket(execution!, task, db, submission),
      procedures: admitted("procedure", procedures).map(row => {
        const source = projectTaskSource("procedure", row);
        return { ...source.content, provenance: taskSourceProvenance(source, reviews.get(`procedure:${row.id}`)!) };
      }), dependencies: [], decisions: admitted("decision", effective).map(row => {
        const source = projectTaskSource("decision", row);
        return { ...source.content, provenance: taskSourceProvenance(source, reviews.get(`decision:${row.id}`)!) };
      }) as any[]
    };
  }
}
