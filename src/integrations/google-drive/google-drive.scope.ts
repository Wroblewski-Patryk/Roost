import { IntegrationError } from "../errors";
import type { GoogleDriveIntegrationConfig } from "../integration-settings.service";
import type { GoogleDriveClient, GoogleDriveFileMetadata } from "./google-drive.client";

export async function resolveDriveScope(file: GoogleDriveFileMetadata, config: GoogleDriveIntegrationConfig, client: GoogleDriveClient,
  cache = new Map<string, GoogleDriveFileMetadata>()) {
  const roots = new Set(config.selectedFolderIds ?? config.rootFolderIds ?? []);
  let current: GoogleDriveFileMetadata | undefined = file;
  let mapping: NonNullable<GoogleDriveIntegrationConfig["operatingScopeMappings"]>[number] | undefined;
  const seen = new Set<string>();
  for (let depth = 0; current && depth < 100; depth++) {
    if (seen.has(current.id)) throw new IntegrationError("sync_failed", 502, "Drive hierarchy contains a cycle.");
    seen.add(current.id);
    mapping ??= config.operatingScopeMappings?.find(item => item.folderId === current!.id);
    if (roots.has(current.id)) return { included: true, mapping };
    if (current.trashed) return { included: false, mapping: undefined };
    const parent: string | undefined = current.parents?.[0];
    if (!parent) break;
    current = cache.get(parent);
    if (!current) { current = await client.getFile(parent); cache.set(parent, current); }
  }
  return { included: false, mapping: undefined };
}

export function driveScopeFields(mapping?: NonNullable<GoogleDriveIntegrationConfig["operatingScopeMappings"]>[number]) {
  return {
    operatingAreaId: mapping?.operatingAreaId ?? null, operatingFolderId: mapping?.operatingFolderId ?? null,
    operatingTableId: mapping?.operatingTableId ?? null, storageLocationId: mapping?.storageLocationId ?? null,
    knowledgeRootId: mapping?.knowledgeRootId ?? null
  };
}
