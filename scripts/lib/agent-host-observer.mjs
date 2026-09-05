import net from "node:net";
import os from "node:os";
import path from "node:path";
import { writeFile, access } from "node:fs/promises";
import { validateRepositoryMappings, approvedWindowsWorkspaceRoot } from "./agent-host-workspace-guard.mjs";

// Fixed machine-wide port: the OS releases it even after a crash. No PID-based
// stale lock deletion and no shared writer lock or execution recovery.
export const observerPort = 43179;
export async function acquireObserverLock(port = observerPort) {
  const server = net.createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once("error", () => reject(new Error("agent_observer_already_running_or_port_unavailable")));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve);
  });
  return () => new Promise((resolve) => server.close(resolve));
}

export async function runObserver({ config, api, stopped = () => false, acquireLock = acquireObserverLock, stateDirectory = path.join(process.env.USERPROFILE || os.homedir(), ".roost", "agent-host"), interval = 5000 }) {
  if (config.executionMode !== "observe") throw new Error("observer_mode_required");
  if (config.workspaceRoot !== approvedWindowsWorkspaceRoot) throw new Error("observer_workspace_invalid");
  const repositories = validateRepositoryMappings(config.repositories);
  const release = await acquireLock();
  let host;
  let stopReason;
  const metadata = { runnerVersion: "roost-agent-host-observer-v1", executionMode: "observe", workspaceRoot: config.workspaceRoot, executionUnavailableReasons: ["observer_mode"], mappingStatus: "declared_only" };
  const registration = { ...config.host, platform: `${process.platform}-${process.arch}`, capabilities: ["heartbeat", "observer"], applicationSlugs: Object.keys(repositories), metadata };
  const stopPath = path.join(stateDirectory, "stop.request");
  const statusPath = path.join(stateDirectory, "status.json");
  const stopRequested = async () => stopped() || await access(stopPath).then(() => true, () => false);
  async function save(status, reason) {
    await writeFile(statusPath, JSON.stringify({ status, reason, pid: process.pid, hostId: host?.id, workspaceId: host?.workspaceId, lastHeartbeatAt: host?.lastSeenAt, ...metadata }), { mode: 0o600 });
  }
  try {
    while (!await stopRequested()) {
      try {
        host = await api(host ? `/v1/agent-runtime/hosts/${host.id}/heartbeat` : "/v1/agent-runtime/hosts/register", { method: "POST", body: JSON.stringify(host ? { metadata, capabilities: registration.capabilities, applicationSlugs: registration.applicationSlugs } : registration) });
        // Runtime information is returned only for the authenticated workspace.
        metadata.executionUnavailableReasons = ["observer_mode", ...(host.runtime?.executionEnabled === false ? ["runtime_disabled"] : [])];
        await save("online");
      } catch (error) {
        // Never persist response bodies, headers, keys, or arbitrary error text.
        await save("offline", [401, 403].includes(error.status) ? "credential_rejected" : "connection_unavailable");
        if ([401, 403, 404, 409, 422].includes(error.status)) { stopReason = [401, 403].includes(error.status) ? "credential_rejected" : "host_registration_rejected"; break; }
        host = null;
      }
      for (let elapsed = 0; elapsed < interval && !await stopRequested(); elapsed += 250) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    try { await save("stopped", stopReason); }
    finally { await release(); }
  }
}
