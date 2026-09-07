import { resolveDriveScope, driveScopeFields } from "./google-drive.scope";
import { createHash } from "crypto";
import { Prisma, type GoogleDriveFile } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { createEvent } from "../../modules/events/event.service";
import { IntegrationError } from "../errors";
import { getGoogleDriveSettingsForWorkspace, toJsonInput } from "../integration-settings.service";
import { getGoogleDriveClientForWorkspace } from "./google-drive.auth";
import { GoogleDriveClient, type GoogleDriveFileMetadata } from "./google-drive.client";

const googleDocMimeType = "application/vnd.google-apps.document";
const googleSheetMimeType = "application/vnd.google-apps.spreadsheet";
const editableTextMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
  "application/json"
]);

export async function listGoogleDriveFiles(workspaceId: string) {
  return prisma.googleDriveFile.findMany({
    where: { workspaceId, trashed: false, syncStatus: { notIn: ["removed", "out_of_scope", "trashed", "unavailable"] } },
    include: {
      contentSnapshots: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: [
      { isFolder: "desc" },
      { name: "asc" }
    ]
  });
}

export async function readGoogleDriveFileContent(input: {
  workspaceId: string;
  fileId: string;
  range?: string;
}) {
  const file = await getWorkspaceDriveFile(input.workspaceId, input.fileId);
  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  return refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file,
    client,
    range: input.range
  });
}

export async function createGoogleDoc(input: {
  workspaceId: string;
  name: string;
  parentId?: string;
  initialText?: string;
}) {
  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  const metadata = await client.createDriveFile({
    name: input.name,
    mimeType: googleDocMimeType,
    parentId: await resolveWriteParent(input.workspaceId, input.parentId, client)
  });

  if (input.initialText) {
    await client.updateDocument(metadata.id, [{
      insertText: {
        location: { index: 1 },
        text: input.initialText
      }
    }]);
  }

  const latestMetadata = await client.getFile(metadata.id);
  const file = await upsertGoogleDriveFileFromMetadata(input.workspaceId, latestMetadata);
  const snapshot = await refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file,
    client
  });
  await emitFileEvent(input.workspaceId, "google_drive_doc_created", file);
  return { file, snapshot };
}

export async function updateGoogleDoc(input: {
  workspaceId: string;
  fileId: string;
  requests: unknown[];
  writeControl?: Record<string, unknown>;
}) {
  const file = await getWorkspaceDriveFile(input.workspaceId, input.fileId);
  if (file.mimeType !== googleDocMimeType) {
    throw new IntegrationError("sync_failed", 422, "The selected file is not a Google Doc.");
  }

  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  const currentDocument = input.writeControl ? null : await client.getDocument(file.externalId);
  const writeControl = input.writeControl ?? (currentDocument?.revisionId ? { requiredRevisionId: currentDocument.revisionId } : undefined);
  await client.updateDocument(file.externalId, input.requests, writeControl);
  const metadata = await client.getFile(file.externalId);
  const refreshedFile = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
  const snapshot = await refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file: refreshedFile,
    client
  });
  await emitFileEvent(input.workspaceId, "google_drive_doc_updated", refreshedFile);
  return { file: refreshedFile, snapshot };
}

export async function createGoogleSheet(input: {
  workspaceId: string;
  title: string;
  parentId?: string;
  values?: unknown[][];
  range?: string;
}) {
  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  const createdMetadata = await client.createDriveFile({
    name: input.title,
    mimeType: googleSheetMimeType,
    parentId: await resolveWriteParent(input.workspaceId, input.parentId, client)
  });
  const spreadsheetId = createdMetadata.id;
  if (!spreadsheetId) {
    throw new IntegrationError("integration_unavailable", 502, "Google Sheets did not return spreadsheet ID.");
  }

  if (input.values?.length) {
    await client.updateSheetValues(spreadsheetId, input.range ?? "A1", {
      range: input.range ?? "A1",
      majorDimension: "ROWS",
      values: input.values
    });
  }

  const metadata = await client.getFile(spreadsheetId);
  const file = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
  const snapshot = await refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file,
    client
  });
  await emitFileEvent(input.workspaceId, "google_drive_sheet_created", file);
  return { file, snapshot };
}

export async function updateGoogleSheetValues(input: {
  workspaceId: string;
  fileId: string;
  range: string;
  values: unknown[][];
}) {
  const file = await getWorkspaceDriveFile(input.workspaceId, input.fileId);
  if (file.mimeType !== googleSheetMimeType) {
    throw new IntegrationError("sync_failed", 422, "The selected file is not a Google Sheet.");
  }

  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  await client.updateSheetValues(file.externalId, input.range, {
    range: input.range,
    majorDimension: "ROWS",
    values: input.values
  });
  const metadata = await client.getFile(file.externalId);
  const refreshedFile = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
  const snapshot = await refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file: refreshedFile,
    client
  });
  await emitFileEvent(input.workspaceId, "google_drive_sheet_updated", refreshedFile);
  return { file: refreshedFile, snapshot };
}

export async function updateGoogleDriveTextFileContent(input: {
  workspaceId: string;
  fileId: string;
  content: string;
}) {
  const file = await getWorkspaceDriveFile(input.workspaceId, input.fileId);
  if (!isGoogleDriveTextFile(file)) {
    throw new IntegrationError("unsupported_file_type", 422, "Only Drive text, Markdown, CSV, and JSON files can be edited as file media.");
  }

  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  await client.updateFileMedia(file.externalId, input.content, normalizedTextMimeType(file));
  const metadata = await client.getFile(file.externalId);
  const refreshedFile = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
  const snapshot = await refreshGoogleDriveFileContent({
    workspaceId: input.workspaceId,
    file: refreshedFile,
    client
  });
  await emitFileEvent(input.workspaceId, "google_drive_text_file_updated", refreshedFile, {
    contentKind: snapshot.contentKind
  });
  return { file: refreshedFile, snapshot };
}

async function getWorkspaceGoogleDriveClient(workspaceId: string) {
  return getGoogleDriveClientForWorkspace(workspaceId);
}

async function getWorkspaceDriveFile(workspaceId: string, id: string) {
  const file = await prisma.googleDriveFile.findFirst({
    where: {
      id,
      workspaceId, syncStatus: { notIn: ["removed", "out_of_scope", "unavailable"] }
    }
  });

  if (!file) {
    throw new IntegrationError("not_found", 404, "Google Drive file was not found.");
  }

  return file;
}

export async function refreshGoogleDriveFileContent(input: {
  workspaceId: string;
  file: GoogleDriveFile;
  client: GoogleDriveClient;
  range?: string;
}) {
  const extracted = await extractSnapshot(input);
  const snapshotInput = { ...extracted, metadata: toJsonInput({ ...(extracted.metadata as Record<string, unknown>), snapshotSchemaVersion: 2 }) };
  const snapshot = await prisma.googleDriveContentSnapshot.upsert({
    where: {
      googleDriveFileId_sourceRevisionId: {
        googleDriveFileId: input.file.id,
        sourceRevisionId: snapshotInput.sourceRevisionId
      }
    },
    create: {
      workspaceId: input.workspaceId,
      googleDriveFileId: input.file.id,
      ...snapshotInput
    },
    update: snapshotInput
  });

  await prisma.googleDriveFile.update({
    where: { id: input.file.id },
    data: {
      scanStatus: snapshot.scanStatus,
      lastScannedAt: new Date()
    }
  });

  await emitFileEvent(input.workspaceId, "google_drive_file_content_refreshed", input.file, {
    snapshotId: snapshot.id,
    contentKind: snapshot.contentKind,
    sourceRevisionId: snapshot.sourceRevisionId
  });

  return snapshot;
}

async function extractSnapshot(input: {
  file: GoogleDriveFile;
  client: GoogleDriveClient;
  range?: string;
}) {
  if (input.file.mimeType === googleDocMimeType) {
    const document = await input.client.getDocument(input.file.externalId);
    const text = extractGoogleDocText(document);
    return {
      sourceRevisionId: String(document.revisionId ?? createHash("sha256").update(JSON.stringify(document)).digest("hex")),
      contentKind: "google_doc",
      extractedText: text,
      structuredPreview: document as Prisma.InputJsonValue,
      summary: summarizeText(input.file.name, text),
      scanStatus: "completed",
      errorCode: null,
      metadata: toJsonInput({ documentId: input.file.externalId })
    };
  }

  if (input.file.mimeType === googleSheetMimeType) {
    const ranges = input.range ? [input.range] : await spreadsheetRanges(input.client, input.file.externalId);
    const blocks = [];
    for (const range of ranges) blocks.push({ range, values: await input.client.getSheetValues(input.file.externalId, range) });
    const text = blocks.map(block => `${block.range}\n${extractSheetText(block.values)}`).join("\n\n");
    return {
      sourceRevisionId: createHash("sha256").update(JSON.stringify(blocks)).digest("hex"),
      contentKind: "google_sheet", extractedText: text, structuredPreview: toJsonInput({ ranges: blocks }),
      summary: summarizeText(input.file.name, text), scanStatus: "completed", errorCode: null,
      metadata: toJsonInput({ spreadsheetId: input.file.externalId, ranges, partial: Boolean(input.range) })
    };
  }

  if (isGoogleDriveTextFile(input.file)) {
    const text = await input.client.downloadFileText(input.file.externalId);
    const contentKind = contentKindForTextFile(input.file);
    return {
      sourceRevisionId: input.file.headRevisionId ?? `text:${input.file.externalId}`,
      contentKind,
      extractedText: text,
      structuredPreview: structuredPreviewForTextFile(contentKind, text) as Prisma.InputJsonValue,
      summary: summarizeText(input.file.name, text),
      scanStatus: "completed",
      errorCode: null,
      metadata: toJsonInput({ fileId: input.file.externalId, mimeType: input.file.mimeType })
    };
  }

  return {
    sourceRevisionId: input.file.headRevisionId ?? `metadata:${input.file.externalId}`,
    contentKind: "binary_metadata_only",
    extractedText: null,
    structuredPreview: Prisma.JsonNull,
    summary: `${input.file.name} (${input.file.mimeType})`,
    scanStatus: "skipped",
    errorCode: null,
    metadata: toJsonInput({ mimeType: input.file.mimeType })
  };
}

export function isGoogleDriveTextFile(file: Pick<GoogleDriveFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  return editableTextMimeTypes.has(file.mimeType)
    || name.endsWith(".md")
    || name.endsWith(".markdown")
    || name.endsWith(".csv")
    || name.endsWith(".json")
    || name.endsWith(".txt");
}

function normalizedTextMimeType(file: Pick<GoogleDriveFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  if (file.mimeType && editableTextMimeTypes.has(file.mimeType)) {
    return file.mimeType;
  }
  if (name.endsWith(".csv")) return "text/csv";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  return "text/plain";
}

function contentKindForTextFile(file: Pick<GoogleDriveFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  if (file.mimeType.includes("csv") || name.endsWith(".csv")) return "csv";
  if (file.mimeType.includes("json") || name.endsWith(".json")) return "json";
  if (file.mimeType.includes("markdown") || name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  return "plain_text";
}

function structuredPreviewForTextFile(contentKind: string, text: string) {
  if (contentKind === "json") {
    try {
      return JSON.parse(text) as Prisma.InputJsonValue;
    } catch {
      return { parseError: "invalid_json" };
    }
  }

  if (contentKind === "csv") {
    return {
      rows: text
        .split(/\r?\n/)
        .slice(0, 100)
        .map((row) => row.split(",").map((cell) => cell.trim()))
    };
  }

  return Prisma.JsonNull;
}

export async function upsertGoogleDriveFileFromMetadata(workspaceId: string, file: GoogleDriveFileMetadata) {
  return prisma.googleDriveFile.upsert({
    where: {
      workspaceId_provider_externalId: {
        workspaceId,
        provider: "google_drive",
        externalId: file.id
      }
    },
    create: toGoogleDriveFileCreate(workspaceId, file),
    update: toGoogleDriveFileUpdate(file)
  });
}

function toGoogleDriveFileCreate(workspaceId: string, file: GoogleDriveFileMetadata) {
  return {
    ...toGoogleDriveFileUpdate(file),
    workspaceId,
    externalId: file.id,
    description: file.description
  };
}

function toGoogleDriveFileUpdate(file: GoogleDriveFileMetadata) {
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
    syncStatus: "synced",
    lastSyncedAt: new Date(),
    rawMetadata: toJsonInput(file)
  };
}

function extractGoogleDocText(document: Record<string, unknown>) {
  const parts: string[] = [];
  collectText(document, parts);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function collectText(value: unknown, parts: string[]) {
  if (!value || typeof value !== "object") {
    return;
  }

  if ("textRun" in value) {
    const content = (value as { textRun?: { content?: unknown } }).textRun?.content;
    if (typeof content === "string") {
      parts.push(content);
    }
  }

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) {
      for (const child of item) {
        collectText(child, parts);
      }
    } else if (item && typeof item === "object") {
      collectText(item, parts);
    }
  }
}

function extractSheetText(values: Record<string, unknown>) {
  const rows = Array.isArray(values.values) ? values.values : [];
  return rows
    .map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")).join(" | ") : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function summarizeText(name: string, text: string | null) {
  if (!text) {
    return `${name}: no extractable text.`;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  return `${name}: ${compact.slice(0, 500)}`;
}

async function emitFileEvent(workspaceId: string, type: string, file: GoogleDriveFile, extra: Record<string, unknown> = {}) {
  await createEvent({
    workspaceId,
    type,
    source: "google_drive",
    payload: toJsonInput({
      provider: "google_drive",
      fileId: file.id,
      externalId: file.externalId,
      name: file.name,
      mimeType: file.mimeType,
      ...extra
    })
  });
}

async function spreadsheetRanges(client: GoogleDriveClient, id: string): Promise<string[]> {
  const sheet = await client.getSpreadsheet(id);
  const tabs = sheet.sheets as Array<{ properties?: { title?: string } }> | undefined;
  if (!tabs?.length) throw new IntegrationError("sync_failed", 502, "Google Sheets did not return its worksheets.");
  return tabs.map(tab => "'" + String(tab.properties?.title ?? "").replace(/'/g, "''") + "'");
}

export async function updateGoogleDriveFileMetadata(input: { workspaceId: string; fileId: string; name?: string; parentId?: string; trashed?: boolean }) {
  const file = await getWorkspaceDriveFile(input.workspaceId, input.fileId);
  const client = await getWorkspaceGoogleDriveClient(input.workspaceId);
  const settings = await getGoogleDriveSettingsForWorkspace(input.workspaceId);
  if (!settings) throw new IntegrationError("integration_not_configured", 422, "Google Drive is not configured.");
  if (input.parentId) {
    const parent = await client.getFile(input.parentId);
    const scope = await resolveDriveScope(parent, settings.config, client);
    if (parent.mimeType !== "application/vnd.google-apps.folder" || !scope.included || parent.trashed) {
      throw new IntegrationError("sync_failed", 422, "The destination must be an active folder inside the configured Drive scope.");
    }
  }
  const current = await client.getFile(file.externalId);
  await client.updateFileMetadata(file.externalId, input, current.parents);
  const metadata = await client.getFile(file.externalId);
  const updated = await upsertGoogleDriveFileFromMetadata(input.workspaceId, metadata);
  const scope = await resolveDriveScope(metadata, settings.config, client);
  await prisma.googleDriveFile.update({ where: { id: updated.id }, data: driveScopeFields(scope.mapping) });
  await emitFileEvent(input.workspaceId, "google_drive_metadata_updated", updated);
  return updated;
}

async function resolveWriteParent(workspaceId: string, requested: string | undefined, client: GoogleDriveClient) {
  const settings = await getGoogleDriveSettingsForWorkspace(workspaceId);
  if (!settings) throw new IntegrationError("integration_not_configured", 422, "Google Drive is not configured.");
  const roots = settings.config.selectedFolderIds ?? settings.config.rootFolderIds ?? [];
  const parentId = requested ?? roots[0];
  if (parentId && roots.length) {
    const folder = await client.getFile(parentId);
    if (folder.trashed || folder.mimeType !== "application/vnd.google-apps.folder" || !(await resolveDriveScope(folder, settings.config, client)).included) {
      throw new IntegrationError("sync_failed", 422, "Choose a writable folder inside the configured Google Drive scope.");
    }
  }
  return parentId;
}
