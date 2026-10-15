import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { googleDriveSecretStatus } from "../../integrations/integration-settings.service";

const providers = ["clickup", "google_drive"] as const;
type Provider = typeof providers[number];
const successTypes: Record<Provider, string[]> = {
  clickup: ["sync_succeeded"],
  google_drive: ["google_drive_import_succeeded", "google_drive_changes_reconciled"]
};
const failureTypes: Record<Provider, string[]> = {
  clickup: ["sync_failed"],
  google_drive: ["google_drive_maintenance_failed", "google_drive_content_refresh_failed"]
};
const observationWindowMs = 24 * 60 * 60 * 1000;

export async function readWorkspaceIntegrationStatus(workspaceId: string, observedAt = new Date()) {
  const snapshot = await prisma.$transaction(async tx => {
    const [settings, adapters, ...events] = await Promise.all([
      tx.integrationSetting.findMany({ where: { workspaceId, provider: { in: [...providers] } },
        select: { provider: true, active: true, secretCiphertext: true, updatedAt: true, lastValidatedAt: true } }),
      tx.toolAdapter.findMany({ where: { workspaceId, provider: { in: [...providers] } },
        select: { provider: true, connectionStatus: true, healthStatus: true, lastSyncAt: true,
          updatedAt: true, _count: { select: { capabilities: true } } } }),
      ...providers.flatMap(provider => [
        tx.event.findFirst({ where: { workspaceId, source: provider,
          type: { in: [...successTypes[provider], ...failureTypes[provider]] } },
          select: { type: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
        tx.event.findFirst({ where: { workspaceId, source: provider,
          type: { in: successTypes[provider] } },
          select: { type: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
      ])
    ]);
    return { settings, adapters, events };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { observedAt, providers: providers.map((provider, index) => {
    const setting = snapshot.settings.find(item => item.provider === provider);
    const adapter = snapshot.adapters.find(item => item.provider === provider);
    const latest = snapshot.events[index * 2];
    const lastSuccess = snapshot.events[index * 2 + 1];
    const credentialState = !setting?.secretCiphertext ? "none"
      : provider === "clickup" ? "stored_unverified"
      : googleDriveSecretStatus(setting.secretCiphertext).hasRefreshToken ? "refresh_token_unverified"
      : "incomplete";
    const configurationReason = !setting ? "no_setting" : !setting.secretCiphertext ? "no_credential"
      : credentialState === "incomplete" ? "incomplete_credential"
      : !setting.active ? "inactive" : "stored_active";
    const configurationState = configurationReason === "stored_active" ? "configured"
      : configurationReason === "inactive" ? "disabled" : "not_configured";
    const syncReason = !latest ? "no_observation"
      : failureTypes[provider].includes(latest.type) ? "latest_failed"
      : setting?.updatedAt && latest.createdAt < setting.updatedAt
        ? "latest_success_before_configuration"
      : observedAt.getTime() - latest.createdAt.getTime() > observationWindowMs
        ? "latest_success_stale" : "latest_success_recent";
    const syncState = syncReason === "latest_failed" ? "failed"
      : syncReason === "latest_success_stale" || syncReason === "latest_success_before_configuration" ? "stale"
      : syncReason === "latest_success_recent" ? "recent" : "unknown";
    return {
      provider,
      configuration: { state: configurationState, credentialState, active: Boolean(setting?.active),
        updatedAt: setting?.updatedAt ?? null, lastValidatedAt: setting?.lastValidatedAt ?? null,
        reason: configurationReason },
      synchronization: { state: syncState, latestEventType: latest?.type ?? null,
        latestEventAt: latest?.createdAt ?? null, lastSuccessAt: lastSuccess?.createdAt ?? null,
        reason: syncReason },
      adapter: { present: Boolean(adapter), connectionStatus: adapter?.connectionStatus ?? null,
        healthStatus: adapter?.healthStatus ?? null, lastSyncAt: adapter?.lastSyncAt ?? null,
        updatedAt: adapter?.updatedAt ?? null, capabilitiesCount: adapter?._count.capabilities ?? 0 },
      settingsHref: `/workspace/settings#workspace-integrations-${provider === "clickup" ? "clickup" : "google-drive"}`
    };
  }) };
}
