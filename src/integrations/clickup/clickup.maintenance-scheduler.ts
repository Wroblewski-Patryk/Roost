import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { runClickUpMaintenanceForWorkspace } from "./clickup.webhooks";
import { cleanupExpiredProjectionRecords } from "../../modules/product-map/product-map-projection.service";

let schedulerStarted = false;
let sweepRunning = false;
let lastProjectionCleanupAt = 0;
const projectionCleanupIntervalMs = 24 * 60 * 60 * 1000;

export async function runProductMapProjectionCleanupIfDue(now = Date.now()) {
  if (now - lastProjectionCleanupAt < projectionCleanupIntervalMs) return { skipped: true as const };
  try {
    const result = await cleanupExpiredProjectionRecords(new Date(now));
    lastProjectionCleanupAt = now;
    console.log("product map projection cleanup completed", JSON.stringify(result));
    return { skipped: false as const, ...result };
  } catch (error) {
    // The canonical supervisor captures stderr as the cleanup-failure signal.
    console.error("product_map_projection_cleanup_failed", error);
    throw error;
  }
}

export async function runClickUpMaintenanceSweep(options: { clickUpEnabled?: boolean } = {}) {
  if (sweepRunning) {
    return { skipped: true, reason: "already_running" };
  }

  sweepRunning = true;
  try {
    const projectionCleanup = await runProductMapProjectionCleanupIfDue();
    if (options.clickUpEnabled === false) {
      return { skipped: false, workspaceCount: 0, results: [], projectionCleanup };
    }
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
      results,
      projectionCleanup
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

  schedulerStarted = true;
  const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
  const clickUpEnabled = Boolean(env.publicApiBaseUrl);
  console.log(`projection maintenance scheduler enabled every ${Math.round(intervalMs / 60000)} minutes`);
  if (!clickUpEnabled) console.warn("clickup maintenance scheduler disabled: COMPANYCORE_PUBLIC_API_BASE_URL is required");

  const run = async () => {
    try {
      const result = await runClickUpMaintenanceSweep({ clickUpEnabled });
      console.log("clickup maintenance sweep completed", JSON.stringify(result));
    } catch (error) {
      console.error("clickup maintenance sweep failed", error);
    }
  };

  setTimeout(run, 60 * 1000).unref();
  setInterval(run, intervalMs).unref();
}
