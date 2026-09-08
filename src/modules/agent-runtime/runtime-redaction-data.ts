import { Prisma, type PrismaClient } from "@prisma/client";
import { inspectRuntime, redactionState, safeRuntimeId } from "./runtime-redaction-policy";

const fields: Record<string, string[]> = {
  AgentExecution: ["prompt", "baseBranch", "metadata", "checkpoint", "summary", "finalResponse", "verification", "usage", "changedFiles", "errorState", "contextInvalidation", "codexThreadId"],
  AgentExecutionEvent: ["type", "message", "payload"],
  AgentHost: ["name", "slug", "platform", "metadata"],
  TaskReviewDecision: ["evidence", "snapshot"], TaskReviewAction: ["correction", "snapshot"],
  TaskCapabilityGrant: ["reason", "snapshot"], TaskCapabilityRevocation: ["reason"],
  NativeCapabilitySuspension: ["reason", "scopeProof", "broaderReason"], NativeSuspensionJournal: ["payload"],
  TaskRiskScope:["input"], TaskRiskAssessment:["sources","entries","result","jointRationale"],
};
export function installRuntimeRedaction(client: PrismaClient) {
  client.$use(async (params, next) => {
    if (!redactionState.getStore()?.flushing && /^(?:create|createMany|update|updateMany|upsert)$/.test(params.action)) {
      if (params.model === "CompanyRecord") {
        const data = params.args?.data ?? params.args?.create;
        if (data?.source === "runtime_redaction_v1" && params.action.startsWith("create")) throw new Error("agent_runtime_content_blocked");
        if (params.args?.where?.id) {
          const prior = await client.companyRecord.findUnique({ where: { id: params.args.where.id }, select: { source: true, metadata: true, title: true, description: true, key: true, recordType: true } });
          if (prior?.source === "runtime_redaction_v1" && Object.keys(data ?? {}).some(key => !["status", "priority", "updatedAt"].includes(key) && JSON.stringify(data[key]) !== JSON.stringify((prior as any)[key]))) throw new Error("agent_runtime_content_blocked");
        }
      }
      const nativeEvidence = params.model === "EvidenceRecord" && !params.action.startsWith("create") && await client.evidenceRecord.count({ where: { ...params.args?.where, source: "agent" } }) > 0;
      const nativeEvent = params.model === "Event" && !params.action.startsWith("create") && await client.event.count({ where: { ...params.args?.where, OR: ["agent_execution", "task_execution", "task_review", "task_capability"].map(prefix => ({ type: { startsWith: prefix } })) } }) > 0;
      for (const data of [params.args?.data, params.args?.create, params.args?.update].flat().filter(Boolean)) {
        if (params.model === "CompanyRecord") {
          if (data.source === "runtime_redaction_v1") throw new Error("agent_runtime_content_blocked");
          if (params.action === "updateMany" && Object.keys(data).some(key => !["status", "priority", "updatedAt"].includes(key)) && await client.companyRecord.count({ where: { ...params.args?.where, source: "runtime_redaction_v1" } }) > 0) throw new Error("agent_runtime_content_blocked");
        }
        // Prisma middleware does not run for nested relation writers. Native
        // producers use the explicit guarded delegates; disallow this bypass.
        for (const relation of ["riskScopes","riskAssessments","nativeSuspensions", "suspensionJournal", ...(params.model === "NativeCapabilitySuspension" ? ["journal"] : []), ...(params.model === "NativeSuspensionJournal" ? ["references","evidence"] : []), "agentExecutions", "agentExecutionEvents", "evidenceRecords", "agentLogs", "capabilityGrants", "reviewDecisions", ...(params.model === "AgentHost" ? ["executions"] : []), ...(params.model === "AgentExecution" ? ["events"] : [])]) {
          if (data[relation] && Object.keys(data[relation]).some(key => /^(create|createMany|update|updateMany|upsert|connectOrCreate)$/.test(key))) throw new Error("agent_runtime_content_blocked");
        }
        let names = fields[params.model ?? ""] ?? [];
        if (params.model === "Task") names = ["executionReadiness"];
        if (params.model === "Event" && (nativeEvent || /^(?:agent_execution|task_execution|task_review|task_capability)/.test(data.type ?? ""))) names = ["payload"];
        if (params.model === "EvidenceRecord" && (nativeEvidence || data.source === "agent" || data.metadata?.executionId)) names = ["reference", "url", "description", "metadata"];
        if (params.model === "AgentLog" && data.metadata?.executionId) names = ["message", "metadata"];
        const scope = { ...(safeRuntimeId(data.workspaceId) ? { workspaceId: data.workspaceId } : {}), ...(safeRuntimeId(data.taskId) ? { taskId: data.taskId } : {}), ...(safeRuntimeId(data.executionId) ? { executionId: data.executionId } : {}), ...(safeRuntimeId(data.id) ? { recordId: data.id } : {}) };
        for (const name of names) {
          const value = data[name];
          if (value === undefined || value === null || value === Prisma.DbNull || value === Prisma.JsonNull) continue;
          const result = inspectRuntime(value, `write.${params.model}.${name}`, "diagnostic", scope);
          // HTTP diagnostics are redacted and audited before entering a writer.
          // Unexpected content from a legacy record or internal producer aborts
          // this transaction; the boundary emits a value-free incident afterward.
          if (result.findings.length || result.blocked) throw new Error("agent_runtime_content_blocked");
        }
      }
    }
    return next(params);
  });
}
