import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { runClickUpMaintenanceForWorkspace } from "./clickup.webhooks";

let schedulerStarted = false;
let sweepRunning = false;

export async function runClickUpMaintenanceSweep() {
  if (sweepRunning) {
    return { skipped: true, reason: "already_running" };
  }

  sweepRunning = true;
  try {
    const settings = await prisma.integrationSetting.findMany({
      where: {
        provider: "clickup",
        active: true,
        secretCiphertext: { not: null }
      },
      select: { workspaceId: true }
    });

    const results = [];
    for (const setting of settings) {
      try {
        const result = await runClickUpMaintenanceForWorkspace({
          workspaceId: setting.workspaceId,
          importMode: "merge"
        });
        results.push({
          workspaceId: setting.workspaceId,
          status: "ok",
          syncItemCount: result.sync.itemCount,
          failedAfter: result.inboxHealth.failedAfter
        });
      } catch (error) {
        results.push({
          workspaceId: setting.workspaceId,
          status: "failed",
          error: error instanceof Error ? error.message : "unknown"
        });
      }
    }

    return {
      skipped: false,
      workspaceCount: settings.length,
      results
    };
  } finally {
    sweepRunning = false;
  }
}

export function startClickUpMaintenanceScheduler() {
  if (schedulerStarted) {
    return;
  }

  const intervalMinutes = env.clickUpMaintenanceIntervalMinutes;
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    console.log("clickup maintenance scheduler disabled");
    return;
  }

  if (!env.publicApiBaseUrl) {
    console.warn("clickup maintenance scheduler disabled: COMPANYCORE_PUBLIC_API_BASE_URL is required");
    return;
  }

  schedulerStarted = true;
  const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
  console.log(`clickup maintenance scheduler enabled every ${Math.round(intervalMs / 60000)} minutes`);

  const run = async () => {
    try {
      const result = await runClickUpMaintenanceSweep();
      console.log("clickup maintenance sweep completed", JSON.stringify(result));
    } catch (error) {
      console.error("clickup maintenance sweep failed", error);
    }
  };

  setTimeout(run, 60 * 1000).unref();
  setInterval(run, intervalMs).unref();
}
