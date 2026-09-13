"use strict";
const { z } = require("zod");

// Worker-owned policy, not command text matching. Neither provider input nor an
// owner decision installs a containment mechanism. There is no host executor here.
const version = "roost-host-lifecycle-v1";
const admissionReason = "host_lifecycle_isolation_unproven";
const forbiddenActions = Object.freeze([
  "docker_desktop_restart", "wsl_global_shutdown", "integrated_distribution_terminate",
  "docker_factory_reset", "docker_prune", "destructive_cleanup", "socket_delete",
  "inaccessible_reparse_point_delete", "undocumented_settings_edit",
  "docker_internal_distribution_access", "runtime_directory_move"
]);
const evidenceSchema = z.object({
  checkedAt: z.string().datetime(),
  engine: z.enum(["available", "unavailable", "unknown"]),
  workloads: z.enum(["continuous", "changed", "unknown"]),
  distribution: z.enum(["running_healthy", "naturally_stopped", "unhealthy", "unknown"]),
  proxy: z.enum(["available", "unavailable", "unknown"]),
  symptom: z.enum(["none", "stuck_socket", "distribution_proxy_exit", "unknown"])
}).strict();

// Bounded diagnostic projection only. No host queries, persisted paths, workload
// identifiers, credentials, commands, loops, filesystem writes or readiness grants.
function projectHealth(value, now = Date.now()) {
  const empty = { checkedAt: null, engine: "unknown", workloads: "unknown",
    distribution: "unknown", proxy: "unknown", symptom: "unknown" };
  let parsed;
  try {
    if (Buffer.byteLength(JSON.stringify(value) ?? "") > 4096) return empty;
    parsed = evidenceSchema.safeParse(value);
  } catch { return empty; }
  if (!parsed.success || !Number.isFinite(now)) return empty;
  const age = now - Date.parse(parsed.data.checkedAt);
  return age >= 0 && age <= 60000 ? parsed.data : empty;
}

function lifecycleState(evidence, now) {
  const health = projectHealth(evidence, now);
  const incident = health.symptom === "stuck_socket" || health.symptom === "distribution_proxy_exit"
    || health.engine === "unavailable" || health.workloads === "changed"
    || health.distribution === "unhealthy" || health.proxy === "unavailable";
  return { version, health, openshell: "unproven", executionSupported: false,
    agentHostControl: "none", automaticRecovery: false, preserveCheckpoints: true,
    reason: incident ? "host_maintenance_required" : admissionReason,
    decision: { kind: "owner_host_maintenance", status: incident ? "required" : "not_requested",
      executionAllowed: false, guidance: incident ? "preserve_evidence_request_owner_maintenance" : "verify_containment_before_execution",
      requiredEvidence: ["engine_availability", "workload_continuity", "distribution_health", "proxy_availability", "checkpoint_reconciliation"] } };
}

function lifecycleError(evidence, now) {
  const state = lifecycleState(evidence, now);
  return Object.assign(new Error(state.reason), { hostLifecycle: true, retryable: false,
    details: state, publicMessage: state.reason });
}

async function requireEngine(run) {
  // One read-only, bounded availability probe. A local_test grant must never
  // start Docker Desktop or invoke a recovery script through its environment.
  let result;
  try { result = await run("docker", ["version", "--format", "{{.Server.Version}}"],
    { capture: true, timeoutMs: 10000, maxOutputBytes: 4096 }); } catch { /* fixed diagnostic below */ }
  if (result?.code === 0 && typeof result.stdout === "string" && result.stdout.length <= 4096
    && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(result.stdout.trim())) return;
  throw lifecycleError({ checkedAt: new Date().toISOString(), engine: "unavailable",
    workloads: "unknown", distribution: "unknown", proxy: "unknown", symptom: "unknown" });
}

module.exports = { version, admissionReason, forbiddenActions, projectHealth,
  lifecycleState, lifecycleError, requireEngine };
