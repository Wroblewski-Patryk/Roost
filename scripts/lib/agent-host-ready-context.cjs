const { createHash } = require("node:crypto");

// Ready bookkeeping and transport timestamps are not task intent. The host's
// todo -> in_progress claim transition is also bookkeeping; blocked/done are not.
function normalize(value, taskId) {
  if (Array.isArray(value)) {
    const items = value.map(item => normalize(item, taskId));
    return items.every(item => item && typeof item === "object" && typeof item.id === "string")
      ? items.sort((a, b) => a.id.localeCompare(b.id) || JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
  }
  if (value && typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    return Object.fromEntries(Object.keys(value).sort().filter(key => key !== "executionReadiness" && !(value.id === taskId && key === "updatedAt"))
      .map(key => [key, value.id === taskId && key === "status" && ["todo", "in_progress"].includes(value[key]) ? "todo" : normalize(value[key], taskId)]));
  }
  return value;
}

function readyContextQuery(task, prompt) {
  return JSON.stringify({ task: normalize(task, task.id), ownerInstruction: prompt ?? null }).slice(0, 4000);
}

function readyContextRevision(taskContext, applicationContext, input = {}) {
  const { generatedAt: _taskTime, executionPacket, readyAdmission: _admission, ...task } = taskContext;
  const { generatedAt: _appTime, ...application } = applicationContext;
  const body = normalize({ schemaVersion: "roost-ready-context-v1", task, application,
    contract: executionPacket.contract, sources: executionPacket.sources, scopeAuthorities: executionPacket.scopeAuthorities,
    prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null }, taskContext.task.id);
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function readyAdmissionError() {
  return Object.assign(new Error("agent_ready_context_revalidation_required"), { readyAdmission: true, retryable: false,
    publicMessage: "Ready context is missing or changed. No model was started; submit the current contract for validation again.",
    details: { schemaVersion: "roost-ready-context-v1", reason: "ready_pin_missing_or_changed" } });
}

function assertReadyContext(taskContext, applicationContext, execution) {
  const admission = taskContext?.readyAdmission, pin = execution?.metadata?.readyContextPin;
  const revision = readyContextRevision(taskContext, applicationContext, execution);
  if (admission?.status !== "ready" || !pin?.pinId || admission.pinId !== pin.pinId || admission.revision !== pin.revision || admission.validationRevision !== pin.revision || revision !== pin.revision) {
    throw readyAdmissionError();
  }
}

module.exports = { readyContextRevision, readyContextQuery, assertReadyContext, readyAdmissionError };
