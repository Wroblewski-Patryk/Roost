import { prisma } from "../../db/prisma";
import { IntegrationError } from "../errors";
import { getGoogleDriveSettingsForWorkspace, toJsonInput, type GoogleDriveIntegrationConfig } from "../integration-settings.service";
import { GoogleDriveClient, type GoogleDriveFileMetadata } from "./google-drive.client";
import { refreshGoogleDriveFileContent, upsertGoogleDriveFileFromMetadata } from "./google-drive.content";
import { getGoogleDriveClientForWorkspace } from "./google-drive.auth";

export type GoogleDriveImportMode = "merge" | "skip_existing" | "replace_selected_folders" | "inspect_only";

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
};

export type GoogleDriveChangesResult = {
  provider: "google_drive";
  processedCount: number;
  refreshedCount: number;
  removedCount: number;
  skippedCount: number;
  nextPageToken?: string;
  newStartPageToken?: string;
};

export async function importGoogleDriveFoldersForWorkspace(input: {
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
      externalId: true
    }
  });
  const existingByExternalId = new Map(existing.map((file) => [file.externalId, file.id]));
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let deletedCount = 0;
  let wouldCreateCount = 0;
  let wouldUpdateCount = 0;
  let contentRefreshedCount = 0;
  let contentSkippedCount = 0;

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

  if (importMode === "replace_selected_folders") {
    const deleted = await prisma.googleDriveFile.deleteMany({
      where: {
        workspaceId: input.workspaceId,
        provider: "google_drive",
        parentExternalId: { in: folderIds }
      }
    });
    deletedCount = deleted.count;
    existingByExternalId.clear();
  }

  for (const file of files) {
    const existingId = existingByExternalId.get(file.id);
    if (importMode === "skip_existing" && existingId) {
      skippedCount += 1;
      continue;
    }

    const upsertedFile = await prisma.googleDriveFile.upsert({
      where: {
        workspaceId_provider_externalId: {
          workspaceId: input.workspaceId,
          provider: "google_drive",
          externalId: file.id
        }
      },
      create: toGoogleDriveFileCreate(input.workspaceId, file, config),
      update: toGoogleDriveFileUpdate(file, config)
    });

    if (existingId) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }

    if (isContentRefreshSupported(file)) {
      await refreshGoogleDriveFileContent({
        workspaceId: input.workspaceId,
        file: upsertedFile,
        client
      });
      contentRefreshedCount += 1;
    } else {
      contentSkippedCount += 1;
    }
  }

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
    contentSkippedCount
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
    for (let page = 0; page < (input.maxPagesPerFolder ?? 10); page += 1) {
      const response = await input.client.listFiles({
        query: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        pageToken
      });

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
    || file.mimeType === "application/vnd.google-apps.spreadsheet";
}

function toGoogleDriveFileUpdate(file: GoogleDriveFileMetadata, config: GoogleDriveIntegrationConfig) {
  const scopeMapping = findScopeMapping(file, config);
  return {
    provider: "google_drive",
    name: file.name,
    mimeType: file.mimeType,
    driveId: file.driveId,
    parentExternalId: file.parents?.[0],
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

export async function reconcileGoogleDriveChangesForWorkspace(input: {
  workspaceId: string;
  pageToken?: string;
  driveId?: string;
}) {
  const settings = await getGoogleDriveSettingsForWorkspace(input.workspaceId);

  if (!settings) {
    throw new IntegrationError(
      "integration_not_configured",
      404,
      "Google Drive is not configured for this workspace."
    );
  }

  const pageToken = input.pageToken ?? settings.config.changesPageToken;
  if (!pageToken) {
    throw new IntegrationError(
      "sync_failed",
      422,
      "Google Drive changes page token is required before reconciliation can run."
    );
  }

  const client = await getGoogleDriveClientForWorkspace(input.workspaceId);
  const response = await client.listChanges({
    pageToken,
    driveId: input.driveId
  });

  let processedCount = 0;
  let refreshedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;

  for (const change of response.changes ?? []) {
    const externalId = change.fileId ?? change.file?.id;
    if (!externalId) {
      skippedCount += 1;
      continue;
    }

    await recordGoogleDriveChangeInbox(input.workspaceId, change);
    processedCount += 1;

    if (change.removed) {
      const removed = await prisma.googleDriveFile.updateMany({
        where: {
          workspaceId: input.workspaceId,
          provider: "google_drive",
          externalId
        },
        data: {
          trashed: true,
          syncStatus: "removed",
          lastSyncedAt: new Date()
        }
      });
      removedCount += removed.count;
      await enqueueGoogleDriveAgentEvent(input.workspaceId, "google_drive_file_removed", {
        externalId
      });
      continue;
    }

    if (!change.file) {
      skippedCount += 1;
      continue;
    }

    const file = await upsertGoogleDriveFileFromMetadata(input.workspaceId, change.file);
    if (!file.isFolder) {
      await refreshGoogleDriveFileContent({
        workspaceId: input.workspaceId,
        file,
        client
      });
      refreshedCount += 1;
    }
    await enqueueGoogleDriveAgentEvent(input.workspaceId, "google_drive_file_changed", {
      fileId: file.id,
      externalId: file.externalId,
      name: file.name,
      mimeType: file.mimeType
    });
  }

  if (response.newStartPageToken) {
    await prisma.integrationSetting.update({
      where: {
        workspaceId_provider: {
          workspaceId: input.workspaceId,
          provider: "google_drive"
        }
      },
      data: {
        config: toJsonInput({
          ...settings.config,
          changesPageToken: response.newStartPageToken
        })
      }
    });
  }

  const result: GoogleDriveChangesResult = {
    provider: "google_drive",
    processedCount,
    refreshedCount,
    removedCount,
    skippedCount,
    nextPageToken: response.nextPageToken,
    newStartPageToken: response.newStartPageToken
  };

  await prisma.event.create({
    data: {
      workspaceId: input.workspaceId,
      type: "google_drive_changes_reconciled",
      source: "google_drive",
      payload: toJsonInput(result)
    }
  });

  return result;
}

async function recordGoogleDriveChangeInbox(workspaceId: string, change: {
  fileId?: string;
  removed?: boolean;
  file?: GoogleDriveFileMetadata;
}) {
  const externalId = change.fileId ?? change.file?.id ?? "unknown";
  const idempotencyKey = [
    "google_drive_change",
    externalId,
    change.removed ? "removed" : "changed",
    change.file?.headRevisionId ?? "no-revision"
  ].join(":");

  await prisma.providerEventInbox.upsert({
    where: {
      workspaceId_provider_idempotencyKey: {
        workspaceId,
        provider: "google_drive",
        idempotencyKey
      }
    },
    create: {
      workspaceId,
      provider: "google_drive",
      externalWebhookId: "drive_changes",
      eventName: change.removed ? "file_removed" : "file_changed",
      idempotencyKey,
      payloadHash: idempotencyKey,
      payload: toJsonInput(change),
      signatureVerified: true,
      processingStatus: "processed",
      processedAt: new Date()
    },
    update: {
      processingStatus: "processed",
      processedAt: new Date()
    }
  });
}

async function enqueueGoogleDriveAgentEvent(workspaceId: string, eventType: string, payload: Record<string, unknown>) {
  await prisma.agentEventOutbox.create({
    data: {
      workspaceId,
      eventType,
      scope: toJsonInput({ provider: "google_drive" }),
      payload: toJsonInput({
        provider: "google_drive",
        ...payload
      })
    }
  });
}
