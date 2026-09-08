import { createHash, randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/prisma";
import { replaceOrganizationalContext } from "../organizational-context/organizational-context.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { inspectRuntime, redactionPolicy, redactionState, runtimeSecrets, safeRuntimeId, type RedactionState } from "./runtime-redaction-policy";

const nativePath = (path: string) => path.startsWith("/v1/agent-runtime/") || path.endsWith("/agent-context");
export async function flushRuntimeIncidents(state: RedactionState) {
  const pending = state.notices.splice(0); if (!pending.length) return;
  state.flushing = true;
  try {
    for (const notice of pending) {
      const scope = { ...notice.scope };
      if (!await prisma.workspaceDepartment.findUnique({ where: { workspaceId_key: { workspaceId: scope.workspaceId, key: "09-technologia" } }, select: { id: true } })) await ensureDefaultDepartments(scope.workspaceId);
      if (scope.executionId && !await prisma.agentExecution.findFirst({ where: { id: scope.executionId, workspaceId: scope.workspaceId }, select: { id: true } })) delete scope.executionId;
      if (scope.taskId && !await prisma.task.findFirst({ where: { id: scope.taskId, workspaceId: scope.workspaceId }, select: { id: true } })) delete scope.taskId;
      if (scope.applicationId && !await prisma.application.findFirst({ where: { id: scope.applicationId, workspaceId: scope.workspaceId }, select: { id: true } })) delete scope.applicationId;
      for (const field of ["taskId", "executionId", "applicationId", "recordId", "correlationId"] as const) {
        if (scope[field] && redactionPolicy.sanitize(scope[field], { mode: "required", secrets: state.secrets }).redacted) delete scope[field];
      }
      scope.correlationId ??= randomUUID();
      const findings = [...new Map(notice.findings.map(f => [f.category + f.location, f])).values()].sort((a, b) => (a.category + a.location).localeCompare(b.category + b.location));
      // Hash only classification and technical correlation, never input values.
      const key = "runtime-redaction:" + createHash("sha256").update(JSON.stringify({ ...scope, correlationId: scope.executionId || scope.taskId || scope.recordId ? undefined : scope.correlationId, findings })).digest("hex");
      const record = await prisma.$transaction(async db => {
        await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope.workspaceId + key},0))`;
        const prior = await db.companyRecord.findUnique({ where: { workspaceId_recordType_key: { workspaceId: scope.workspaceId, recordType: "technical_incident", key } } });
        if (prior) return prior;
        const fingerprint = randomUUID(), metadata = { policy: redactionPolicy.POLICY, fingerprint, surface: scope.surface, findings, taskId: scope.taskId ?? null, executionId: scope.executionId ?? null, applicationId: scope.applicationId ?? null, recordId: scope.recordId ?? null, correlationId: scope.correlationId ?? null };
        const created = await db.companyRecord.create({ data: { workspaceId: scope.workspaceId, recordType: "technical_incident", key, source: "runtime_redaction_v1", title: "Agent runtime content removed", description: "Sensitive or unsupported content was withheld. Review the affected operation using safe incident references.", priority: "high", metadata } });
        await replaceOrganizationalContext(db, scope.workspaceId, "company_record", created.id, { ownerDepartmentKey: "09-technologia", scopes: [{ type: "company" }] });
        await db.event.create({ data: { workspaceId: scope.workspaceId, type: "agent_execution_redaction_incident", source: "roost", resourceType: "company_record", resourceId: created.id, payload: { incidentId: created.id, ...metadata } } });
        if (scope.executionId && await db.agentExecution.findFirst({ where: { id: scope.executionId, workspaceId: scope.workspaceId } })) await db.agentExecutionEvent.create({ data: { workspaceId: scope.workspaceId, executionId: scope.executionId, type: "runtime_redaction", level: "warning", message: "Sensitive content removed; see the technical incident.", payload: { incidentId: created.id, ...metadata } } });
        return created;
      });
      if (!state.incidentIds.includes(record.id)) state.incidentIds.push(record.id);
    }
  } finally { state.flushing = false; }
}
function project(body: any, all: boolean, state: RedactionState, allowLease: boolean) {
  if (all) {
    const lease = allowLease ? body?.data?.leaseToken : undefined;
    const source = lease ? { ...body, data: { ...body.data, leaseToken: null } } : body;
    const result = inspectRuntime(source, "read.native");
    const value = result.value;
    if (lease && value?.data) value.data.leaseToken = lease;
    if (result.redacted && value?.data && !Array.isArray(value.data)) value.data.redaction = { policy: redactionPolicy.POLICY, redacted: true };
    return value;
  }
  // Shared task/event/evidence endpoints may project native data outside the
  // runtime router. Only those recognizable native slots are in this boundary.
  let budget = 20000;
  function visit(value: any, depth: number): any {
    if (!value || typeof value !== "object" || value instanceof Date) return value;
    if (--budget < 0 || depth > 32) return { redacted: true, policy: redactionPolicy.POLICY };
    if (Array.isArray(value)) return value.map(v => visit(v, depth + 1));
    if (value.executionId && value.payload || value.checkpointVersion !== undefined && value.taskId || value.metadata?.executionId || /^(?:agent_execution|task_execution|task_review|task_capability)/.test(value.type ?? "")) return inspectRuntime(value, "read.shared_native", "diagnostic", { recordId: safeRuntimeId(value.id), executionId: safeRuntimeId(value.executionId ?? value.metadata?.executionId) }).value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === "executionReadiness" ? inspectRuntime(child, "read.task_readiness").value : visit(child, depth + 1)]));
  }
  return visit(body, 0);
}
export function runtimeRedactionBoundary(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.workspaceId) return next();
  const path = req.path, native = nativePath(path), parts = path.split("/");
  const executionId = safeRuntimeId(parts[parts.indexOf("executions") + 1]);
  const taskId = safeRuntimeId(parts[parts.indexOf("tasks") + 1] ?? req.body?.taskId);
  const state: RedactionState = { scope: { workspaceId: req.auth.workspaceId, taskId: taskId ?? safeRuntimeId(req.body?.taskId), executionId, applicationId: safeRuntimeId(req.body?.applicationId), correlationId: safeRuntimeId(req.body?.requestId) ?? safeRuntimeId(req.requestId) ?? randomUUID(), surface: "native_http" }, secrets: runtimeSecrets([req.get("X-API-Key") ?? "", req.get("Authorization")?.replace(/^Bearer /i, "") ?? "", req.body?.leaseToken ?? ""]), notices: [], incidentIds: [], flushing: false };
  redactionState.run(state, () => {
    const send = res.json.bind(res); let sending = false;
    res.json = ((body: any) => {
      if (sending) return res; sending = true;
      void (async () => {
        const value = project(body, native, state, /\/executions\/(?:claim|[^/]+\/actions\/recover)$/.test(path));
        await flushRuntimeIncidents(state);
        if (native && body?.data !== undefined && value?.data === undefined) { res.status(409); send({ error: "agent_runtime_content_blocked", incidentIds: state.incidentIds }); return; }
        if (state.incidentIds.length && value?.data && !Array.isArray(value.data)) value.data.redaction = { policy: redactionPolicy.POLICY, redacted: true, incidentIds: state.incidentIds };
        send(value);
      })().catch(() => { res.status(503); send({ error: "agent_runtime_redaction_unavailable" }); });
      return res;
    }) as Response["json"];
    void (async () => {
      const hostId = safeRuntimeId(parts[parts.indexOf("hosts") + 1]);
      if (hostId && await prisma.agentHost.findFirst({ where: { id: hostId, workspaceId: state.scope.workspaceId }, select: { id: true } })) state.scope.recordId = hostId;
      if (native && req.get("X-Roost-Redaction-Notice") === "1") state.notices.push({ scope: { ...state.scope, surface: "host.transport" }, findings: [{ category: "host_redaction", location: "$" }] });
      if (native && Number(req.get("Content-Length") ?? 0) > 0 && !req.is("application/json")) {
        state.notices.push({ scope: { ...state.scope, surface: "input.http" }, findings: [{ category: "unsupported_format", location: "$" }] });
        await flushRuntimeIncidents(state);
        res.status(409).json({ error: "agent_runtime_content_blocked" }); return;
      }
      if (native && req.body && Object.keys(req.body).length) {
        // These exact root fields are authenticated control-plane data, not
        // diagnostic content. They never enter prompts/evidence/incidents.
        const { leaseToken, ...content } = req.body;
        const required = !/\/executions\/[^/]+\/(?:events|heartbeat|actions\/(?:complete|fail))$|\/hosts\/(?:register|[^/]+\/heartbeat)$/.test(path);
        const checked = inspectRuntime(content, required ? "input.required" : "input.diagnostic", required ? "required" : "diagnostic");
        await flushRuntimeIncidents(state);
        if (checked.blocked) { res.status(409).json({ error: "agent_runtime_content_blocked" }); return; }
        req.body = { ...checked.value, ...(leaseToken !== undefined ? { leaseToken } : {}) };
      }
      next();
    })().catch(() => { res.status(503).json({ error: "agent_runtime_redaction_unavailable" }); });
  });
}
