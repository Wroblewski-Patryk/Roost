import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

// The API grants 90 seconds. Reserve time for stopping the Windows process tree.
const maximumLeaseMs = 90_000;
const stopMarginMs = 5_000;

export function createExecutionLease({ renew, onLost, now = () => performance.now(), wallNow = Date.now,
  setTimer = setTimeout, clearTimer = clearTimeout, heartbeatMs = 20_000 }) {
  let deadline = 0;
  let expiryTimer;
  let renewalTimer;
  let pending;
  let failure;
  let disposed = false;

  function lose(code) {
    if (failure || disposed) return;
    failure = Object.assign(new Error(code), { leaseLost: true });
    clearTimer(expiryTimer);
    clearTimer(renewalTimer);
    onLost(failure);
  }

  function assertValid() {
    if (!failure && (!deadline || now() >= deadline)) lose("agent_execution_lease_expired");
    if (failure) throw failure;
    if (disposed) throw new Error("agent_execution_lease_disposed");
  }

  function reject(error) {
    if (error.body?.error === "agent_execution_cancel_requested") lose("agent_execution_cancel_requested");
    else if (error.status >= 400 && error.status < 500 && error.status !== 429) lose("agent_execution_lease_rejected");
  }

  async function renewOnce() {
    if (failure || disposed) return;
    const started = now();
    try {
      const result = await renew();
      if (failure || disposed) return;
      // Even if a delayed timer has not run yet, a late response cannot revive authority.
      if (deadline && now() >= deadline) return lose("agent_execution_lease_expired");
      if (result?.cancelRequested) return lose("agent_execution_cancel_requested");
      const remaining = Math.min(Date.parse(result?.leaseExpiresAt) - wallNow(), maximumLeaseMs - (now() - started)) - stopMarginMs;
      if (!Number.isFinite(remaining) || remaining <= 0) return lose("agent_execution_lease_invalid");
      deadline = now() + remaining;
      clearTimer(expiryTimer);
      expiryTimer = setTimer(() => lose("agent_execution_lease_expired"), remaining);
    } catch (error) {
      if (failure || disposed) return;
      reject(error);
      if (failure) return;
      // Transient outages never extend the last confirmed lease; initial failure forbids spawn.
      if (!deadline || now() >= deadline) lose("agent_execution_lease_expired");
    } finally {
      if (!failure && !disposed) {
        clearTimer(renewalTimer);
        renewalTimer = setTimer(() => { void refresh(); }, heartbeatMs);
      }
    }
  }

  function refresh() {
    if (!pending) pending = renewOnce().finally(() => { pending = null; });
    return pending;
  }

  return {
    refresh,
    reject,
    assertValid,
    get failure() { return failure; },
    stop() { disposed = true; clearTimer(expiryTimer); clearTimer(renewalTimer); }
  };
}

export async function terminateWindowsProcessTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform !== "win32") throw new Error("agent_host_platform_not_approved");
  await new Promise((resolve, reject) => {
    const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      shell: false, windowsHide: true, stdio: "ignore"
    });
    const timeout = setTimeout(() => { killer.kill(); reject(new Error("agent_process_tree_stop_timeout")); }, 4_000);
    killer.once("error", (error) => { clearTimeout(timeout); reject(error); });
    killer.once("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error("agent_process_tree_stop_failed"));
    });
  });
}
