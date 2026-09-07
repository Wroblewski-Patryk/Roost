import { createHash } from "crypto";
import { withIntegrationLock } from "../sync-lock";
import { resolveDriveScope, driveScopeFields } from "./google-drive.scope";
import { prisma } from "../../db/prisma";
import { IntegrationError } from "../errors";
import { getGoogleDriveSettingsForWorkspace, toJsonInput, type GoogleDriveIntegrationConfig } from "../integration-settings.service";
import { GoogleDriveClient, type GoogleDriveFileMetadata } from "./google-drive.client";
import { isGoogleDriveTextFile, refreshGoogleDriveFileContent, upsertGoogleDriveFileFromMetadata } from "./google-drive.content";
import { getGoogleDriveClientForWorkspace } from "./google-drive.auth";

export type GoogleDriveImportMode = "merge" | "skip_existing" | "replace_selected_folders" | "inspect_only";

const DEFAULT_MAX_PAGES_PER_FOLDER = 50;

export type GoogleDriveImportResult = {
  provider: "google_drive";
  importMode: GoogleDriveImportMode;
  folderIds: string[];
  itemCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  deletedCount: number;
  wouldCreateCount: number;
  wouldUpdateCount: number;
  contentRefreshedCount: number;
  contentSkippedCount: number;
  contentFailedCount?: number;
};

export type GoogleDriveChangesResult = {
  provider: "google_drive";
  processedCount: number;
  refreshedCount: number;
  removedCount: number;
  skippedCount: number;
  baselineInitialized?: boolean;
  nextPageToken?: string;
  newStartPageToken?: string;
};

type DriveImportInput = Parameters<typeof importGoogleDriveFolders>[0];
export async function importGoogleDriveFoldersForWorkspace(input: DriveImportInput) {
  return withIntegrationLock(`google_drive:${input.workspaceId}`, () => importGoogleDriveFolders(input));
}

async function importGoogleDriveFolders(input: {
  workspaceId: string;
  folderIds?: string[];
  importMode?: GoogleDriveImportMode;
  maxPagesPerFolder?: number;
}): Promise<GoogleDriveImportResult> {
  const settings = await getGoogleDriveSettingsForWorkspace(input.workspaceId);

  if (!settings) {
    throw new IntegrationError(
      "integration_not_configured",
      404,
      "Google Drive is not configured for this workspace."
    );
  }

  const config = settings.config ?? {};
  const folderIds = uniqueNonEmpty(input.folderIds ?? config.selectedFolderIds ?? config.rootFolderIds ?? []);
  if (folderIds.length === 0) {
    throw new IntegrationError(
      "sync_failed",
      422,
      "At least one Google Drive folder must be selected before import."
    );
  }

  const importMode = input.importMode ?? config.importMode ?? "merge";
  const client = await getGoogleDriveClientForWorkspace(input.workspaceId);
  const baseline = !config.changesPageToken && importMode !== "inspect_only"
    ? await client.getStartPageToken() : null;
  const files = await fetchSelectedFolderFiles({
    client,
    folderIds,
    maxPagesPerFolder: input.maxPagesPerFolder
  });
  const existing = await prisma.googleDriveFile.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: "google_drive",
      externalId: { in: files.map((file) => file.id) }
    },
    select: {
      id: true,
      externalId: true, modifiedTime: true, headRevisionId: true, scanStatus: true,
      contentSnapshots: { orderBy: { updatedAt: "desc" }, take: 1, select: { metadata: true } }
    }
  });
  const existingByExternalId = new Map(existing.map((file) => [file.externalId, file.id]));
  const existingMetadata = new Map(existing.map(file => [file.externalId, file]));
  const metadataCache = new Map(files.map(file => [file.id, file]));
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let deletedCount = 0;
  let wouldCreateCount = 0;
  let wouldUpdateCount = 0;
  let contentRefreshedCount = 0;
  let contentSkippedCount = 0;
  let contentFailedCount = 0;

  for (const file of files) {
    if (existingByExternalId.has(file.id)) {
      wouldUpdateCount += 1;
    } else {
      wouldCreateCount += 1;
    }
  }

  if (importMode === "inspect_only") {
    skippedCount = files.length;
    await emitGoogleDriveImportEvent(input.workspaceId, {
      provider: "google_drive",
      importMode,
      folderIds,
      itemCount: files.length,
      createdCount,
      updatedCount,
      skippedCount,
      deletedCount,
      wouldCreateCount,
      wouldUpdateCount,
      contentRefreshedCount,
      contentSkippedCount: files.length
    });
    return {
      provider: "google_drive",
      importMode,
      folderIds,
      itemCount: files.length,
      createdCount,
      updatedCount,
      skippedCount,
      deletedCount,
      wouldCreateCount,
      wouldUpdateCount,
      contentRefreshedCount,
      contentSkippedCount: files.length
    };
  }

  for (const file of files) {
    const existingId = existingByExternalId.get(file.id);
    if (importMode === "skip_existing" && existingId) {
      skippedCount += 1;
      continue;
    }

    const scope = await resolveDriveScope(file, { ...config, selectedFolderIds: folderIds }, client, metadataCache);
    const scopeFields = driveScopeFields(scope.mapping);
    const upsertedFile = await prisma.googleDriveFile.upsert({
      where: {
        workspaceId_provider_externalId: {
          workspaceId: input.workspaceId,
          provider: "google_drive",
          externalId: file.id
        }
      },
      create: { ...toGoogleDriveFileCreate(input.workspaceId, file, config), ...scopeFields },
      update: { ...toGoogleDriveFileUpdate(file, config), ...scopeFields }
    });

    if (existingId) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }

    const previous = existingMetadata.get(file.id);
    const snapshotMetadata = previous?.contentSnapshots[0]?.metadata as { snapshotSchemaVersion?: number; partial?: boolean } | undefined;
    const contentChanged = !previous || snapshotMetadata?.snapshotSchemaVersion !== 2 || snapshotMetadata.partial === true || previous.scanStatus !== "completed" || previous.headRevisionId !== (file.headRevisionId ?? null)
      || previous.modifiedTime?.toISOString() !== file.modifiedTime;
    if (!file.trashed && isContentRefreshSupported(file) && contentChanged) {
      try {
        await refreshGoogleDriveFileContent({ workspaceId: input.workspaceId, file: upsertedFile, client });
        contentRefreshedCount += 1;
      } catch (error) {
        contentFailedCount++;
        await prisma.googleDriveFile.update({ where: { id: upsertedFile.id }, data: { scanStatus: "failed" } });
        await prisma.event.create({ data: { workspaceId: input.workspaceId, source: "google_drive", type: "google_drive_content_refresh_failed",
          payload: { externalId: file.id, errorCode: error instanceof IntegrationError ? error.code : "sync_failed" } } });
      }
    } else {
      contentSkippedCount += 1;
    }
  }

  if (importMode !== "skip_existing") {
    const known = await prisma.googleDriveFile.findMany({ where: { workspaceId: input.workspaceId, provider: "google_drive" }, select: { externalId: true, parentExternalId: true } });
    const knownById = new Map(known.map(file => [file.externalId, file]));
    const fetchedIds = new Set(files.map(file => file.id));
    const selected = new Set(folderIds);
    for (const knownFile of known) {
      if (fetchedIds.has(knownFile.externalId)) continue;
      let ancestor: string | null | undefined = knownFile.externalId;
      const ancestors = new Set<string>();
      while (ancestor && !selected.has(ancestor) && !ancestors.has(ancestor)) {
        ancestors.add(ancestor); ancestor = knownById.get(ancestor)?.parentExternalId;
      }
      if (!ancestor || !selected.has(ancestor)) continue;
      try {
        const metadata = await client.getFile(knownFile.externalId);
        const scope = await resolveDriveScope(metadata, { ...config, selectedFolderIds: folderIds }, client, metadataCache);
        await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
        if (metadata.trashed || !scope.included) await markDriveTreeUnavailable(input.workspaceId, metadata.id, metadata.trashed ? "trashed" : "out_of_scope");
      } catch (error) {
        if (!(error instanceof IntegrationError) || error.code !== "not_found") throw error;
        await markDriveTreeUnavailable(input.workspaceId, knownFile.externalId, "unavailable");
      }
    }
  }
  if (baseline) await saveDriveCursor(input.workspaceId, undefined, baseline.startPageToken);

  const result = {
    provider: "google_drive" as const,
    importMode,
    folderIds,
    itemCount: files.length,
    createdCount,
    updatedCount,
    skippedCount,
    deletedCount,
    wouldCreateCount,
    wouldUpdateCount,
    contentRefreshedCount,
    contentSkippedCount, contentFailedCount
  };
  await emitGoogleDriveImportEvent(input.workspaceId, result);
  return result;
}

async function fetchSelectedFolderFiles(input: {
  client: GoogleDriveClient;
  folderIds: string[];
  maxPagesPerFolder?: number;
}) {
  const files: GoogleDriveFileMetadata[] = [];
  const seen = new Set<string>();
  const foldersToScan = [...input.folderIds];
  const scannedFolders = new Set<string>();

  for (const folderId of input.folderIds) {
    try {
      const folder = await input.client.getFile(folderId);
      if (folder.id && !seen.has(folder.id)) {
        seen.add(folder.id);
        files.push(folder);
      }
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }
      throw error;
    }
  }

  while (foldersToScan.length > 0) {
    const folderId = foldersToScan.shift()!;
    if (scannedFolders.has(folderId)) {
      continue;
    }
    scannedFolders.add(folderId);

    let pageToken: string | undefined;
    for (let page = 0; page < (input.maxPagesPerFolder ?? DEFAULT_MAX_PAGES_PER_FOLDER); page += 1) {
      const response = await input.client.listFiles({
        query: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        pageToken
      });

      if (response.incompleteSearch) throw new IntegrationError("sync_failed", 502, "Drive search is incomplete; existing records were preserved.");
      for (const file of response.files ?? []) {
        if (!file.id || seen.has(file.id)) {
          continue;
        }
        seen.add(file.id);
        files.push(file);
        if (file.mimeType === "application/vnd.google-apps.folder") {
          foldersToScan.push(file.id);
        }
      }

      if (!response.nextPageToken) {
        break;
      }
      if (page + 1 === (input.maxPagesPerFolder ?? DEFAULT_MAX_PAGES_PER_FOLDER)) {
        throw new IntegrationError("sync_failed", 502, "Drive folder listing exceeded its page budget.");
      }
      pageToken = response.nextPageToken;
    }
  }

  return files;
}

function toGoogleDriveFileCreate(
  workspaceId: string,
  file: GoogleDriveFileMetadata,
  config: GoogleDriveIntegrationConfig
) {
  return {
    ...toGoogleDriveFileUpdate(file, config),
    workspaceId,
    externalId: file.id,
    description: file.description
  };
}

function isContentRefreshSupported(file: GoogleDriveFileMetadata) {
  return file.mimeType === "application/vnd.google-apps.document"
    || file.mimeType === "application/vnd.google-apps.spreadsheet"
    || isGoogleDriveTextFile(file);
}

function toGoogleDriveFileUpdate(file: GoogleDriveFileMetadata, config: GoogleDriveIntegrationConfig) {
  const scopeMapping = findScopeMapping(file, config);
  return {
    provider: "google_drive",
    name: file.name,
    mimeType: file.mimeType,
    driveId: file.driveId,
    parentExternalId: file.parents?.[0] ?? null,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
    trashed: Boolean(file.trashed),
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    size: file.size,
    headRevisionId: file.headRevisionId,
    md5Checksum: file.md5Checksum,
    modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    operatingAreaId: scopeMapping?.operatingAreaId,
    operatingFolderId: scopeMapping?.operatingFolderId,
    operatingTableId: scopeMapping?.operatingTableId,
    storageLocationId: scopeMapping?.storageLocationId,
    knowledgeRootId: scopeMapping?.knowledgeRootId,
    syncStatus: "synced",
    lastSyncedAt: new Date(),
    rawMetadata: toJsonInput(file)
  };
}

function findScopeMapping(file: GoogleDriveFileMetadata, config: GoogleDriveIntegrationConfig) {
  const parentId = file.parents?.[0];
  if (!parentId) {
    return null;
  }
  return config.operatingScopeMappings?.find((mapping) => mapping.folderId === parentId) ?? null;
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function emitGoogleDriveImportEvent(workspaceId: string, result: GoogleDriveImportResult) {
  await prisma.event.create({
    data: {
      workspaceId,
      type: "google_drive_import_succeeded",
      source: "google_drive",
      payload: toJsonInput(result)
    }
  });
}

type DriveChangesInput = { workspaceId: string; pageToken?: string; driveId?: string };

export async function reconcileGoogleDriveChangesForWorkspace(input: DriveChangesInput) {
  return withIntegrationLock(`google_drive:${input.workspaceId}`, () => reconcileDriveChanges(input));
}

async function saveDriveCursor(workspaceId: string, driveId: string | undefined, token: string) {
  // Read inside the transaction: do not overwrite a concurrently edited folder configuration.
  await prisma.$transaction(async tx => {
    const setting = await tx.integrationSetting.findUniqueOrThrow({ where: { workspaceId_provider: { workspaceId, provider: "google_drive" } } });
    const config = setting.config as GoogleDriveIntegrationConfig;
    await tx.integrationSetting.update({ where: { id: setting.id }, data: { config: toJsonInput({ ...config,
      ...(driveId ? { changesPageTokens: { ...config.changesPageTokens, [driveId]: token } } : { changesPageToken: token })
    }) } });
  });
}

async function reconcileDriveChanges(input: DriveChangesInput): Promise<GoogleDriveChangesResult> {
  const settings = await getGoogleDriveSettingsForWorkspace(input.workspaceId);
  if (!settings) throw new IntegrationError("integration_not_configured", 404, "Google Drive is not configured.");
  const client = await getGoogleDriveClientForWorkspace(input.workspaceId);
  const storedToken = input.driveId ? settings.config.changesPageTokens?.[input.driveId] : settings.config.changesPageToken;
  const checkpointEnabled = !input.pageToken || input.pageToken === storedToken;
  let pageToken = input.pageToken ?? storedToken;
  if (!pageToken) {
    const baseline = await client.getStartPageToken(input.driveId);
    const roots = settings.config.selectedFolderIds ?? settings.config.rootFolderIds ?? [];
    if (roots.length) await importGoogleDriveFolders({ workspaceId: input.workspaceId, importMode: "merge" });
    await saveDriveCursor(input.workspaceId, input.driveId, baseline.startPageToken);
    return { provider: "google_drive", processedCount: 0, refreshedCount: 0, removedCount: 0, skippedCount: 0,
      baselineInitialized: true, newStartPageToken: baseline.startPageToken };
  }
  const result: GoogleDriveChangesResult = { provider: "google_drive", processedCount: 0, refreshedCount: 0, removedCount: 0, skippedCount: 0 };
  const cache = new Map<string, GoogleDriveFileMetadata>();
  for (let page = 0; page < 1000; page++) {
    const response = await client.listChanges({ pageToken, driveId: input.driveId });
    for (const change of response.changes ?? []) {
      const externalId = change.fileId ?? change.file?.id;
      if (!externalId) { result.skippedCount++; continue; }
      const key = createHash("sha256").update(JSON.stringify([input.driveId ?? "user", pageToken, change])).digest("hex");
      const inbox = await prisma.providerEventInbox.upsert({
        where: { workspaceId_provider_idempotencyKey: { workspaceId: input.workspaceId, provider: "google_drive", idempotencyKey: key } },
        create: { workspaceId: input.workspaceId, provider: "google_drive", externalWebhookId: "drive_changes",
          eventName: change.removed ? "file_removed" : "file_changed", idempotencyKey: key, payloadHash: key,
          payload: toJsonInput({ externalId, removed: Boolean(change.removed), time: change.time }), signatureVerified: true }, update: {}
      });
      if (inbox.processingStatus === "processed") { result.skippedCount++; continue; }
      try {
        const existing = await prisma.googleDriveFile.findUnique({ where: { workspaceId_provider_externalId: {
          workspaceId: input.workspaceId, provider: "google_drive", externalId
        } } });
        let eventType: string | null = null;
        if (change.removed) {
          if (existing) {
            await markDriveTreeUnavailable(input.workspaceId, externalId, "removed");
            result.removedCount++; eventType = "google_drive_file_removed";
          }
        } else {
          const metadata = change.file ?? await client.getFile(externalId);
          // No configured roots: only reconcile already tracked records, never import the whole account.
          const hasRoots = Boolean((settings.config.selectedFolderIds ?? settings.config.rootFolderIds)?.length);
          const scope = hasRoots ? await resolveDriveScope(metadata, settings.config, client, cache) : { included: false, mapping: undefined };
          if ((!scope.included && hasRoots) || (!hasRoots && !existing)) {
            if (existing) { await markDriveTreeUnavailable(input.workspaceId, externalId, "out_of_scope"); eventType = "google_drive_file_removed"; }
            result.skippedCount++;
          } else {
            const file = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
            if (hasRoots) await prisma.googleDriveFile.update({ where: { id: file.id }, data: driveScopeFields(scope.mapping) });
            if (metadata.trashed) {
              await markDriveTreeUnavailable(input.workspaceId, externalId, "trashed");
              result.removedCount++; eventType = "google_drive_file_removed";
            } else {
              if (!file.isFolder && isContentRefreshSupported(metadata)) {
                await refreshGoogleDriveFileContent({ workspaceId: input.workspaceId, file, client }); result.refreshedCount++;
              }
              eventType = "google_drive_file_changed";
            }
          }
        }
        // Completion and the agent signal commit together. Failed content extraction remains retryable.
        await prisma.$transaction(async tx => {
          if (eventType) await tx.agentEventOutbox.create({ data: { workspaceId: input.workspaceId, eventType,
            scope: toJsonInput({ provider: "google_drive" }), payload: toJsonInput({ provider: "google_drive", externalId, inboxId: inbox.id }) } });
          await tx.providerEventInbox.update({ where: { id: inbox.id }, data: { processingStatus: "processed", processedAt: new Date(), lastErrorCode: null } });
        });
        result.processedCount++;
      } catch (error) {
        await prisma.providerEventInbox.update({ where: { id: inbox.id }, data: { processingStatus: "failed", retryCount: { increment: 1 },
          lastErrorCode: error instanceof IntegrationError ? error.code : "sync_failed" } });
        throw error;
      }
    }
    const next = response.nextPageToken ?? response.newStartPageToken;
    if (!next) throw new IntegrationError("sync_failed", 502, "Drive changes response is missing its continuation cursor.");
    if (checkpointEnabled) await saveDriveCursor(input.workspaceId, input.driveId, next);
    if (!response.nextPageToken) {
      result.newStartPageToken = next;
      await prisma.event.create({ data: { workspaceId: input.workspaceId, type: "google_drive_changes_reconciled", source: "google_drive", payload: toJsonInput(result) } });
      return result;
    }
    if (next === pageToken) throw new IntegrationError("sync_failed", 502, "Drive repeated a changes cursor.");
    pageToken = next;
  }
  throw new IntegrationError("sync_failed", 502, "Drive changes page budget reached; saved cursor can be resumed.");
}

export async function markDriveTreeUnavailable(workspaceId: string, externalId: string, syncStatus: string) {
  let ids = [externalId];
  const seen = new Set<string>();
  while (ids.length) {
    const fresh = ids.filter(id => !seen.has(id));
    if (!fresh.length) break;
    fresh.forEach(id => seen.add(id));
    const children = await prisma.googleDriveFile.findMany({ where: { workspaceId, parentExternalId: { in: fresh } }, select: { externalId: true } });
    await prisma.googleDriveFile.updateMany({ where: { workspaceId, externalId: { in: fresh } },
      data: { syncStatus, ...(["trashed", "removed"].includes(syncStatus) ? { trashed: true } : {}), lastSyncedAt: new Date() } });
    ids = children.map(file => file.externalId);
  }
}
