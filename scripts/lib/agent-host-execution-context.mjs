import { createHash } from "node:crypto";
import { validateExecutionPacket } from "./agent-host-execution-packet.mjs";
import readyContext from "./agent-host-ready-context.cjs";

// Object member order is transport detail. Array order remains meaningful;
// an order-only change may conservatively require replanning.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export function executionContextRevision(taskContext, applicationContext) {
  // Only the two response-generation timestamps are volatile. Do not ignore
  // nested timestamps, versions, permissions, evidence or source content.
  const { generatedAt: _taskTime, ...task } = taskContext;
  const { generatedAt: _applicationTime, ...application } = applicationContext;
  return createHash("sha256").update(JSON.stringify(canonical({ task, application }))).digest("hex");
}

export function contextAdmissionError(reason, details = {}) {
  return Object.assign(new Error(`agent_execution_context_${reason}`), {
    contextAdmission: true, retryable: false,
    publicMessage: reason === "unavailable"
      ? "Authoritative context could not be refreshed. No model was started; reconcile this execution before preparing another attempt."
      : "Authoritative context changed or failed validation before model start. No model was started; review the current records and prepare a new execution contract.",
    details: { schemaVersion: "roost-context-admission-v1", ...details }
  });
}

export async function fetchExecutionContext(api, claimed) {
  try {
    const fresh = { cache: "no-store", headers: { "Cache-Control": "no-cache" } };
    const taskContext = await api(`/v1/company-intelligence/tasks/${claimed.taskId}/agent-context?executionId=${encodeURIComponent(claimed.id)}`, fresh);
    const query = readyContext.readyContextQuery(taskContext?.task ?? taskContext, claimed.prompt);
    const applicationContext = await api(`/v1/product-engineering/applications/${claimed.applicationId}/agent-context?profile=execution`,
      { ...fresh, headers: { ...fresh.headers, "X-Roost-Agent-Context-Query": query } });
    return { taskContext, applicationContext };
  } catch (error) {
    if (error.readyAdmission) throw error;
    // Never echo arbitrary transport errors or response bodies.
    const safe = contextAdmissionError("unavailable");
    if ([401, 403].includes(error.status)) safe.status = error.status;
    throw safe;
  }
}

export function assertFreshExecutionContext(preparedRevision, fresh, claimed) {
  let revision;
  try {
    validateExecutionPacket(fresh.taskContext?.executionPacket, claimed, fresh.taskContext, fresh.applicationContext);
    revision = executionContextRevision(fresh.taskContext, fresh.applicationContext);
  } catch (error) {
    throw contextAdmissionError("invalid", { preparedRevision,
      ...(error.message === "execution_packet_invalid" ? { packetIssues: error.details.issues } : {}) });
  }
  if (revision !== preparedRevision) throw contextAdmissionError("changed", { preparedRevision, observedRevision: revision });
  return fresh;
}
