import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

type TaskLink = {
  taskId: string;
  title: string;
  status: string;
  basis: "admission" | "composition";
  version: number;
  operation: string | null;
  current: boolean;
  recordedAt: string;
};

type CompositionRow = {
  taskId: string;
  title: string;
  status: string;
  operation: string;
  version: number;
  current: boolean;
  createdAt: Date;
};

type AdmissionRow = {
  taskId: string;
  title: string;
  status: string;
  version: number;
  current: boolean;
  createdAt: Date;
};

const activeTask = (status: string) => status !== "done" && status !== "archived";

/** A read-only owner projection. A relation never implies that a procedure executed successfully. */
export async function procedureProvenanceView(workspaceId: string, procedureId: string) {
  return prisma.$transaction(async (db) => {
    await db.$executeRaw`SET TRANSACTION READ ONLY`;
    const procedure = await db.procedure.findFirst({
      where: { id: procedureId, workspaceId },
      select: { id: true, familyId: true, name: true, purpose: true, scope: true,
        version: true, status: true, createdAt: true, processId: true, ownerRoleId: true }
    });
    if (!procedure) return { error: "procedure_not_found" } as const;

    const [audits, events, process, ownerRole, stages, policies, applications, capabilities, admissions, compositions] = await Promise.all([
      db.auditLog.findMany({ where: { workspaceId, resourceType: "Procedure", resourceId: procedureId },
        select: { id: true, action: true, actorType: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      db.event.findMany({ where: { workspaceId, resourceType: "Procedure", resourceId: procedureId },
        select: { id: true, type: true, source: true, actorType: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      procedure.processId ? db.process.findFirst({ where: { id: procedure.processId, workspaceId }, select: { id: true, name: true, status: true } }) : null,
      procedure.ownerRoleId ? db.companyRole.findFirst({ where: { id: procedure.ownerRoleId, workspaceId }, select: { id: true, name: true } }) : null,
      db.pipelineStage.findMany({ where: { workspaceId, procedureId }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" } }),
      db.policy.findMany({ where: { workspaceId, procedureId }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" } }),
      db.applicationProcedure.findMany({ where: { procedureId, application: { workspaceId } },
        select: { relationType: true, required: true, application: { select: { id: true, name: true, status: true } } },
        orderBy: { applicationId: "asc" } }),
      db.capabilityProcedure.findMany({ where: { procedureId, capabilityDefinition: { workspaceId } },
        select: { relationType: true, required: true, capabilityDefinition: { select: { id: true, name: true, deprecated: true } } },
        orderBy: { capabilityDefinitionId: "asc" } }),
      db.$queryRaw<AdmissionRow[]>`
        SELECT s.task_id AS "taskId",t.title,t.status::text AS status,s.version,
          s.version=(SELECT max(x.version) FROM task_admission_scopes x
            WHERE x.workspace_id=${workspaceId}::uuid AND x.task_id=s.task_id) AS current,
          s.created_at AS "createdAt"
        FROM task_admission_scopes s JOIN tasks t ON t.id=s.task_id AND t.workspace_id=s.workspace_id
        WHERE s.workspace_id=${workspaceId}::uuid AND s.procedure_id=${procedureId}::uuid
        ORDER BY s.task_id,s.version DESC`,
      db.$queryRaw<CompositionRow[]>`
        SELECT s.task_id AS "taskId",t.title,t.status::text AS status,s.operation,s.version,
          (s.version=(SELECT max(x.version) FROM task_composition_selections x
            WHERE x.workspace_id=${workspaceId}::uuid AND x.task_id=s.task_id AND x.operation=s.operation)
            AND s.scope_id=(SELECT x.id FROM task_admission_scopes x
              WHERE x.workspace_id=${workspaceId}::uuid AND x.task_id=s.task_id ORDER BY x.version DESC LIMIT 1)) AS current,
          s.created_at AS "createdAt"
        FROM task_composition_selections s JOIN tasks t ON t.id=s.task_id AND t.workspace_id=s.workspace_id
        WHERE s.workspace_id=${workspaceId}::uuid
          AND (s.base_procedure_id=${procedureId}::uuid OR s.extension_procedure_id=${procedureId}::uuid)
        ORDER BY s.task_id,s.operation,s.version DESC`
    ]);

    const links: TaskLink[] = [
      ...admissions.map((row) => ({ taskId: row.taskId, title: row.title, status: row.status,
        basis: "admission" as const, version: row.version, operation: null,
        current: row.current, recordedAt: row.createdAt.toISOString() })),
      ...compositions.map((row) => ({ taskId: row.taskId, title: row.title, status: row.status,
        basis: "composition" as const, version: row.version, operation: row.operation,
        current: row.current, recordedAt: row.createdAt.toISOString() }))
    ];
    const originAudit = audits.find((row) => row.action === "procedure.create_draft" || row.action === "procedure.propose_revision");
    const originEvent = events.find((row) => row.type === "procedure_draft_created" || row.type === "procedure_revision_proposed");
    const origin = originAudit ? { state: "recorded" as const, recordKind: "audit" as const, action: originAudit.action,
      recordedAt: originAudit.createdAt.toISOString(), actorType: originAudit.actorType }
      : originEvent ? { state: "recorded" as const, recordKind: "event" as const, action: originEvent.type,
        recordedAt: originEvent.createdAt.toISOString(), actorType: originEvent.actorType }
        : { state: "unknown" as const };

    return {
      procedure: { id: procedure.id, familyId: procedure.familyId, name: procedure.name, purpose: procedure.purpose,
        scope: procedure.scope, version: procedure.version, status: procedure.status, createdAt: procedure.createdAt.toISOString() },
      origin,
      lifecycle: audits.map((row) => ({ id: row.id, action: row.action, actorType: row.actorType,
        recordedAt: row.createdAt.toISOString() })),
      configuration: { process, ownerRole, stages, policies, applications: applications.map((row) => ({
        ...row.application, relationType: row.relationType, required: row.required })),
        capabilities: capabilities.map((row) => ({ ...row.capabilityDefinition, relationType: row.relationType,
          required: row.required })) },
      tasks: { current: links.filter((row) => row.current && activeTask(row.status)),
        history: links.filter((row) => !row.current || !activeTask(row.status)) },
      interpretation: "Configuration and task links are recorded relations, not proof of successful execution."
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });
}
