import { prisma } from "../../db/prisma";
import { IntegrationError } from "../errors";
import { importGoogleDriveFoldersForWorkspace, reconcileGoogleDriveChangesForWorkspace } from "./google-drive.sync";
import type { GoogleDriveIntegrationConfig } from "../integration-settings.service";

let running = false;
let started = false;
export async function runGoogleDriveMaintenanceSweep() {
  if (running) return;
  running = true;
  try {
    const settings = await prisma.integrationSetting.findMany({ where: { provider: "google_drive", active: true, secretCiphertext: { not: null } }, select: { workspaceId: true, config: true } });
    for (const setting of settings) {
      try {
        const config = setting.config as GoogleDriveIntegrationConfig;
        // The scoped inventory also repairs pre-cursor gaps and folder subtree moves.
        if ((config.selectedFolderIds ?? config.rootFolderIds)?.length) {
          await importGoogleDriveFoldersForWorkspace({ workspaceId: setting.workspaceId, importMode: "merge" });
        }
        await reconcileGoogleDriveChangesForWorkspace({ workspaceId: setting.workspaceId });
        for (const driveId of config.sharedDriveIds ?? []) {
          await reconcileGoogleDriveChangesForWorkspace({ workspaceId: setting.workspaceId, driveId });
        }
      } catch (error) {
        await prisma.event.create({ data: { workspaceId: setting.workspaceId, source: "google_drive", type: "google_drive_maintenance_failed",
          payload: { errorCode: error instanceof IntegrationError ? error.code : "sync_failed" } } });
      }
    }
  } finally { running = false; }
}

export function startGoogleDriveMaintenanceScheduler() {
  if (started) return;
  const minutes = Number(process.env.GOOGLE_DRIVE_MAINTENANCE_INTERVAL_MINUTES ?? 15);
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  started = true;
  const run = () => runGoogleDriveMaintenanceSweep().catch(() => console.error("google_drive_maintenance_failed"));
  setTimeout(run, 60_000).unref();
  setInterval(run, Math.max(5, minutes) * 60_000).unref();
}
