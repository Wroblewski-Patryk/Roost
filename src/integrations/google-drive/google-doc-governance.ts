import { createHash, randomUUID } from "node:crypto";
import { Prisma, type GoogleDocEditIntent, type GoogleDocMandate, type GoogleDriveFile } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { AuthContext } from "../../auth/api-key.middleware";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { projectTaskSource, taskSourceEligible, taskSourceReviews, taskSourceScope, taskSourceDigest } from "../../modules/agent-runtime/task-source-trust";
import { IntegrationError } from "../errors";
import { getGoogleDriveSettingsForWorkspace } from "../integration-settings.service";
import { getGoogleDriveClientForWorkspace } from "./google-drive.auth";
import { extractGoogleDocText, refreshGoogleDriveFileContent, upsertGoogleDriveFileFromMetadata } from "./google-drive.content";
import { resolveDriveScope } from "./google-drive.scope";
import type { GoogleDriveClient, GoogleDriveFileMetadata } from "./google-drive.client";

const docMime = "application/vnd.google-apps.document";
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const sourceError = () => new IntegrationError("google_doc_source_not_approved", 403, "The current Doc source is not approved for this task.");

type ProviderState = { metadata: GoogleDriveFileMetadata; document: Record<string, unknown>; revisionId: string; client: GoogleDriveClient };

async function requireOwner(auth: AuthContext) {
  if (auth.authType !== "user" || auth.workspaceRole !== "owner" || !auth.userId) throw sourceError();
  const owner = await prisma.workspace.findFirst({ where: { id: auth.workspaceId, ownerUserId: auth.userId }, select: { id: true } });
  if (!owner) throw sourceError();
  return auth.userId;
}

async function requireActor(auth: AuthContext, taskId: string, write: boolean) {
  if (auth.authType === "user") return { actorType: "user" as const, actorId: await requireOwner(auth), credentialId: null };
  if (!auth.agentId || !auth.apiKeyId) throw sourceError();
  const scope = await prisma.$transaction(async tx => {
    const task = await taskSourceScope(tx, auth.workspaceId, taskId, auth.agentId);
    if (!task) return null;
    if (write) return resolveReviewPrincipal(tx, auth.workspaceId, auth);
    const key = await tx.apiKey.findFirst({ where: { id: auth.apiKeyId, workspaceId: auth.workspaceId }, include: { boundAgent: true } });
    if (!key?.active || key.revokedAt || !key.expiresAt || key.expiresAt <= new Date() || key.credentialVersion !== auth.credentialVersion
      || key.boundAgentId !== auth.agentId || key.boundAgent?.status !== "active" || key.boundAgent?.workspaceId !== auth.workspaceId
      || !Array.isArray(key.scopes) || !key.scopes.includes("agent-runtime:read")) return null;
    return { kind: "agent" as const, id: auth.agentId!, credentialId: key.id };
  });
  if (!scope || scope.kind !== "agent") throw sourceError();
  return { actorType: "agent" as const, actorId: scope.id, credentialId: scope.credentialId };
}

async function docSource(db: Prisma.TransactionClient | typeof prisma, workspaceId: string, snapshotId: string, fileId: string,
  allowHistorical = false) {
  const snapshot = await db.googleDriveContentSnapshot.findFirst({ where: { id: snapshotId, workspaceId, googleDriveFileId: fileId,
    contentKind: "google_doc", scanStatus: "completed" }, include: { googleDriveFile: true } });
  if (!snapshot || snapshot.googleDriveFile.trashed || snapshot.googleDriveFile.mimeType !== docMime
    || ["removed", "out_of_scope", "unavailable"].includes(snapshot.googleDriveFile.syncStatus)) return null;
  const latest = await db.googleDriveContentSnapshot.findFirst({ where: { workspaceId, googleDriveFileId: fileId }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  return allowHistorical || latest?.id === snapshot.id ? { snapshot, source: projectTaskSource("drive_snapshot", snapshot) } : null;
}

async function approvedSource(mandate: GoogleDocMandate, allowHistorical = false) {
  const scope = await taskSourceScope(prisma, mandate.workspaceId, mandate.taskId);
  const reviews = await taskSourceReviews(prisma, mandate.workspaceId, mandate.taskId);
  const review = reviews.get(`drive_snapshot:${mandate.sourceSnapshotId}`);
  const candidate = await docSource(prisma, mandate.workspaceId, mandate.sourceSnapshotId, mandate.fileId, allowHistorical);
  const source = candidate?.source;
  if (!scope || !source || !review || review.id !== mandate.sourceReviewId
    || !taskSourceEligible(source, review, mandate.workspaceId, mandate.taskId, scope.applicationIds, scope.task.projectId)) return null;
  return { review, source };
}

async function providerState(mandate: Pick<GoogleDocMandate, "workspaceId" | "selectedFolderId">, file: GoogleDriveFile): Promise<ProviderState> {
  const settings = await getGoogleDriveSettingsForWorkspace(mandate.workspaceId);
  const selected = settings?.config.selectedFolderIds ?? settings?.config.rootFolderIds ?? [];
  if (!settings || !selected.includes(mandate.selectedFolderId)) throw new IntegrationError("google_doc_scope_changed", 409, "The selected Drive folder is no longer configured.");
  const client = await getGoogleDriveClientForWorkspace(mandate.workspaceId);
  const metadata = await client.getFile(file.externalId);
  const scope = await resolveDriveScope(metadata, { ...settings.config, selectedFolderIds: [mandate.selectedFolderId] }, client);
  if (metadata.id !== file.externalId || metadata.trashed || metadata.mimeType !== docMime || !scope.included)
    throw new IntegrationError("google_doc_scope_changed", 409, "The Google Doc left its selected folder or is unavailable.");
  const document = await client.getDocument(file.externalId);
  const metadataAfter = await client.getFile(file.externalId);
  const scopeAfter = await resolveDriveScope(metadataAfter, { ...settings.config, selectedFolderIds: [mandate.selectedFolderId] }, client);
  if (metadataAfter.id !== file.externalId || metadataAfter.trashed || metadataAfter.mimeType !== docMime || !scopeAfter.included)
    throw new IntegrationError("google_doc_scope_changed", 409, "The Google Doc left its selected folder during the read.");
  if (metadata.version && metadataAfter.version && metadata.version !== metadataAfter.version)
    throw new IntegrationError("source_changed", 409, "The Google Doc changed during the read.");
  const revisionId = document.revisionId;
  if (typeof revisionId !== "string" || !revisionId) throw new IntegrationError("revision_required", 428, "Google did not provide an editable document revision.");
  return { metadata: metadataAfter, document, revisionId, client };
}

async function mandateFor(auth: AuthContext, taskId: string, fileId: string, write: boolean) {
  const actor = await requireActor(auth, taskId, write);
  const mandate = await prisma.googleDocMandate.findFirst({ where: { workspaceId: auth.workspaceId, taskId, fileId }, include: { file: true, intent: true } });
  if (!mandate) throw new IntegrationError("google_doc_mandate_required", 404, "No owner mandate binds this task and Doc.");
  if (actor.actorType === "agent" && (actor.actorId !== mandate.agentId || actor.credentialId !== mandate.credentialId)) throw sourceError();
  return { mandate, actor };
}

async function mandateCurrent(mandate: GoogleDocMandate) {
  if (mandate.revokedAt || mandate.validUntil <= new Date()) return false;
  const [currentMandate, task, key] = await Promise.all([
    prisma.googleDocMandate.findFirst({ where: { id: mandate.id, workspaceId: mandate.workspaceId, revokedAt: null,
      validUntil: { gt: new Date() }, agentId: mandate.agentId, credentialId: mandate.credentialId,
      credentialVersion: mandate.credentialVersion }, select: { id: true } }),
    prisma.task.findFirst({ where: { id: mandate.taskId, workspaceId: mandate.workspaceId, status: { in: ["todo", "in_progress"] }, assignedWorkforceEntityId: mandate.agentId }, select: { id: true } }),
    prisma.apiKey.findFirst({ where: { id: mandate.credentialId, workspaceId: mandate.workspaceId, boundAgentId: mandate.agentId,
      active: true, revokedAt: null, credentialVersion: mandate.credentialVersion, expiresAt: { gt: new Date() },
      boundAgent: { workspaceId: mandate.workspaceId, type: "agent", status: "active" } } })
  ]);
  return Boolean(currentMandate && task && key && Array.isArray(key.scopes) && key.scopes.includes("agent-runtime:write") && key.scopes.includes("agent-runtime:read"));
}

export async function governedGoogleDocCandidate(auth: AuthContext, taskId: string, fileId: string) {
  await requireOwner(auth);
  const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: auth.workspaceId, status: { in: ["todo", "in_progress"] } },
    select: { id: true, title: true, assignedWorkforceEntityId: true } });
  const file = await prisma.googleDriveFile.findFirst({ where: { id: fileId, workspaceId: auth.workspaceId, mimeType: docMime, trashed: false },
    select: { id: true, name: true, externalId: true } });
  if (!task || !file) throw new IntegrationError("not_found", 404, "Task or Google Doc was not found.");
  const keys = task.assignedWorkforceEntityId ? await prisma.apiKey.findMany({ where: { workspaceId: auth.workspaceId,
    boundAgentId: task.assignedWorkforceEntityId, active: true, revokedAt: null, expiresAt: { gt: new Date() },
    boundAgent: { workspaceId: auth.workspaceId, type: "agent", status: "active" } },
    select: { id: true, keyPrefix: true, expiresAt: true, scopes: true }, orderBy: { createdAt: "desc" } }) : [];
  const snapshot = await prisma.googleDriveContentSnapshot.findFirst({ where: { workspaceId: auth.workspaceId, googleDriveFileId: fileId,
    contentKind: "google_doc", scanStatus: "completed" }, orderBy: { updatedAt: "desc" },
    select: { id: true, sourceRevisionId: true, createdAt: true } });
  return { task, file, credentials: keys.filter(key => Array.isArray(key.scopes)
    && key.scopes.includes("agent-runtime:read") && key.scopes.includes("agent-runtime:write"))
    .map(({ scopes: _scopes, ...key }) => key), snapshot };
}

export async function createGovernedGoogleDocMandate(auth: AuthContext, input: { taskId: string; fileId: string; sourceSnapshotId: string;
  credentialId: string; requestId: string; expectedRevision: string; classification: "fact" | "observation" | "proposal" | "inference"; validUntil: string }) {
  const ownerUserId = await requireOwner(auth);
  const age = Math.floor(Date.now() / 1000) - (auth.authenticatedAt ?? 0);
  if (age < 0 || age > 90) throw sourceError();
  const requestHash = hash({ ...input, workspaceId: auth.workspaceId });
  const prior = await prisma.googleDocMandate.findUnique({ where: { requestId: input.requestId } });
  if (prior) {
    if (prior.workspaceId === auth.workspaceId && prior.requestHash === requestHash) return prior;
    throw new IntegrationError("google_doc_mandate_conflict", 409, "The request ID already belongs to another mandate.");
  }
  const validUntil = new Date(input.validUntil);
  if (!Number.isFinite(validUntil.getTime()) || validUntil <= new Date() || validUntil.getTime() > Date.now() + 30 * 86400000)
    throw new IntegrationError("google_doc_mandate_conflict", 400, "Choose an expiry within 30 days.");
  const file = await prisma.googleDriveFile.findFirst({ where: { id: input.fileId, workspaceId: auth.workspaceId, provider: "google_drive", mimeType: docMime, trashed: false,
    syncStatus: { notIn: ["removed", "out_of_scope", "unavailable"] } } });
  const task = await prisma.task.findFirst({ where: { id: input.taskId, workspaceId: auth.workspaceId, status: { in: ["todo", "in_progress"] }, assignedWorkforceEntityId: { not: null } },
    select: { id: true, assignedWorkforceEntityId: true } });
  const candidate = file && await docSource(prisma, auth.workspaceId, input.sourceSnapshotId, file.id);
  const key = task?.assignedWorkforceEntityId && await prisma.apiKey.findFirst({ where: { id: input.credentialId, workspaceId: auth.workspaceId,
    boundAgentId: task.assignedWorkforceEntityId, active: true, revokedAt: null, expiresAt: { gt: validUntil },
    boundAgent: { workspaceId: auth.workspaceId, type: "agent", status: "active" } } });
  if (!file || !task?.assignedWorkforceEntityId || !candidate || !key || !Array.isArray(key.scopes)
    || !key.scopes.includes("agent-runtime:write") || !key.scopes.includes("agent-runtime:read")
    || candidate.snapshot.sourceRevisionId !== input.expectedRevision) throw sourceError();
  const settings = await getGoogleDriveSettingsForWorkspace(auth.workspaceId);
  const selected = settings?.config.selectedFolderIds ?? settings?.config.rootFolderIds ?? [];
  if (!settings || !selected.length) throw new IntegrationError("google_doc_scope_changed", 409, "No selected Drive folder is configured.");
  const client = await getGoogleDriveClientForWorkspace(auth.workspaceId);
  const metadata = await client.getFile(file.externalId);
  let selectedFolderId: string | null = null;
  for (const root of selected) if ((await resolveDriveScope(metadata, { ...settings.config, selectedFolderIds: [root] }, client)).included) { selectedFolderId = root; break; }
  if (!selectedFolderId || metadata.trashed || metadata.mimeType !== docMime) throw new IntegrationError("google_doc_scope_changed", 409, "The Google Doc is outside the configured folder.");
  const document = await client.getDocument(file.externalId);
  if (document.revisionId !== input.expectedRevision) throw new IntegrationError("source_changed", 409, "The Google Doc changed since the inspected snapshot.");
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id=${input.taskId}::uuid AND workspace_id=${auth.workspaceId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM api_keys WHERE id=${key.id}::uuid AND workspace_id=${auth.workspaceId}::uuid FOR UPDATE`;
      const currentKey = await tx.apiKey.findFirst({ where: { id: key.id, workspaceId: auth.workspaceId, boundAgentId: task.assignedWorkforceEntityId!,
        active: true, revokedAt: null, credentialVersion: key.credentialVersion, expiresAt: { gt: validUntil } } });
      const currentTask = await taskSourceScope(tx, auth.workspaceId, input.taskId, task.assignedWorkforceEntityId!);
      const activeTask = await tx.task.findFirst({ where: { id: input.taskId, workspaceId: auth.workspaceId,
        assignedWorkforceEntityId: task.assignedWorkforceEntityId!, status: { in: ["todo", "in_progress"] } }, select: { id: true } });
      const currentSource = await docSource(tx, auth.workspaceId, input.sourceSnapshotId, file.id);
      if (!currentKey || !currentTask || !activeTask || !currentSource) throw sourceError();
      const now = new Date(), reviewId = randomUUID();
      const base = { id: reviewId, workspaceId: auth.workspaceId, taskId: input.taskId, sourceType: "drive_snapshot", sourceId: input.sourceSnapshotId,
        sourceRevision: currentSource.source.revision, contentDigest: taskSourceDigest(currentSource.source), requestHash, action: "approve",
        classification: input.classification, provenance: "Workspace owner attested to the Google Drive source",
        environment: process.env.NODE_ENV === "test" ? "isolated_test" : "production",
        verificationMethod: "Owner attested to the selected revision in the fresh mandate command",
        verificationRef: `google_doc:${file.externalId}@${input.expectedRevision}`,
        inclusionReason: "One governed Doc edit for this task", validFrom: now, validUntil, actorUserId: ownerUserId };
      if (!taskSourceEligible(currentSource.source, { ...base, createdAt: now, ordinal: 0 } as any,
        auth.workspaceId, input.taskId, currentTask.applicationIds, currentTask.task.projectId)) throw sourceError();
      await tx.taskSourceReview.create({ data: base });
      const mandate = await tx.googleDocMandate.create({ data: { workspaceId: auth.workspaceId, taskId: input.taskId, fileId: file.id,
        sourceReviewId: reviewId, sourceSnapshotId: input.sourceSnapshotId, selectedFolderId, agentId: task.assignedWorkforceEntityId!,
        credentialId: key.id, credentialVersion: key.credentialVersion, validUntil, ownerUserId,
        requestId: input.requestId, requestHash } });
      await tx.event.create({ data: { workspaceId: auth.workspaceId, taskId: input.taskId, source: "roost", type: "google_doc_mandate_created",
        actorType: "user", actorId: ownerUserId, payload: { mandateId: mandate.id, fileId: file.id, sourceReviewId: reviewId,
          agentId: mandate.agentId, credentialId: mandate.credentialId, validUntil: validUntil.toISOString(), selectedFolderId } } });
      return mandate;
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    throw new IntegrationError("google_doc_mandate_conflict", 409, "This task or Doc already has a mandate.");
  }
}

function firstTabText(document: Record<string, unknown>) {
  const tabs = document.tabs as Array<Record<string, unknown>> | undefined;
  return extractGoogleDocText(tabs?.[0] ?? document);
}

function firstTabId(document: Record<string, unknown>) {
  const tabs = document.tabs as Array<{ tabProperties?: { tabId?: unknown } }> | undefined;
  const value = tabs?.[0]?.tabProperties?.tabId;
  return typeof value === "string" && value ? value : undefined;
}

export async function readGovernedGoogleDoc(auth: AuthContext, taskId: string, fileId: string) {
  const { mandate, actor } = await mandateFor(auth, taskId, fileId, false);
  const approval = await approvedSource(mandate);
  const resultApproval = mandate.intent?.state === "applied" ? await approvedSource(mandate, true) : null;
  const authority = await mandateCurrent(mandate);
  if (actor.actorType === "agent" && !authority) throw sourceError();
  let intent = mandate.intent ? await prisma.googleDocEditIntent.findUnique({ where: { id: mandate.intent.id } }) : null;
  const approvedRevision = await prisma.googleDriveContentSnapshot.findUnique({ where: { id: mandate.sourceSnapshotId }, select: { sourceRevisionId: true, extractedText: true } });
  let state: ProviderState;
  try { state = await providerState(mandate, mandate.file); }
  catch (error) {
    if (error instanceof IntegrationError && error.code === "google_doc_scope_changed" && intent)
      await prisma.googleDocEditIntent.updateMany({ where: { id: intent.id, state: { in: ["applied", "uncertain"] } },
        data: { state: "conflict", errorCode: "google_doc_scope_changed" } });
    if (intent) intent = await prisma.googleDocEditIntent.findUnique({ where: { id: intent.id } });
    if (actor.actorType === "agent" && !approval && !resultApproval) throw sourceError();
    return { mandate: { id: mandate.id, taskId, fileId, selectedFolderId: mandate.selectedFolderId, sourceReviewId: mandate.sourceReviewId,
        sourceSnapshotId: mandate.sourceSnapshotId }, status: error instanceof IntegrationError && error.code === "google_doc_scope_changed" ? "conflict" : "provider_unavailable",
      file: { id: fileId, externalId: mandate.file.externalId, name: mandate.file.name }, provider: null, content: null,
      previousApprovedContent: actor.actorType === "user" ? approvedRevision?.extractedText ?? null : undefined,
      intent: intent ? publicIntent(intent) : null };
  }
  const current = state.revisionId === approvedRevision?.sourceRevisionId;
  const appliedResult = Boolean(resultApproval) && intent?.state === "applied" && intent.providerRevisionId === state.revisionId
    && (actor.actorType === "user" || intent.actorType === "agent" && intent.actorId === actor.actorId && intent.credentialId === actor.credentialId);
  if (actor.actorType === "agent" && (!approval || !current) && !appliedResult) throw sourceError();
  const postingUnknown = intent?.state === "posting" && intent.createdAt.getTime() < Date.now() - 90_000;
  const status = !authority ? "mandate_stale" : (!approval || !current) && !appliedResult ? "source_changed"
    : postingUnknown ? "uncertain_in_flight" : intent?.state ?? "ready";
  return { mandate: { id: mandate.id, taskId, fileId, selectedFolderId: mandate.selectedFolderId, sourceReviewId: mandate.sourceReviewId,
      sourceSnapshotId: mandate.sourceSnapshotId }, status, file: { id: fileId, externalId: mandate.file.externalId, name: state.metadata.name },
    provider: { revisionId: state.revisionId, version: state.metadata.version ?? null, actorVerification: "unverified" },
    content: extractGoogleDocText(state.document), previousApprovedContent: actor.actorType === "user" && !current ? approvedRevision?.extractedText ?? null : undefined,
    intent: intent ? publicIntent(intent) : null };
}

function publicIntent(intent: GoogleDocEditIntent) {
  return { id: intent.id, state: intent.state, errorCode: intent.errorCode, baseRevisionId: intent.baseRevisionId,
    providerRevisionId: intent.providerRevisionId, providerVersion: intent.providerVersion, actorType: intent.actorType,
    actorId: intent.actorId, actorVerification: intent.actorType === "user" ? "roost_authenticated" : "roost_credential_bound",
    createdAt: intent.createdAt, updatedAt: intent.updatedAt,
    possibleLateWrite: intent.state === "posting" && intent.createdAt.getTime() < Date.now() - 90_000 };
}

async function setIntent(id: string, data: Prisma.GoogleDocEditIntentUpdateManyMutationInput) {
  await prisma.googleDocEditIntent.updateMany({ where: { id, state: "posting" }, data });
  return prisma.googleDocEditIntent.findUniqueOrThrow({ where: { id } });
}

export async function appendGovernedGoogleDoc(auth: AuthContext, input: { taskId: string; fileId: string; requestId: string; expectedRevision: string; text: string }) {
  const { mandate, actor } = await mandateFor(auth, input.taskId, input.fileId, true);
  const requestHash = hash({ ...input, workspaceId: auth.workspaceId });
  const existing = await prisma.googleDocEditIntent.findUnique({ where: { mandateId: mandate.id } });
  if (existing) {
    if (existing.requestId === input.requestId && existing.requestHash === requestHash) {
      if (actor.actorType === "agent" && (!await mandateCurrent(mandate)
        || !await approvedSource(mandate) && !(existing.state === "applied" && await approvedSource(mandate, true)))) throw sourceError();
      return publicIntent(existing);
    }
    throw new IntegrationError("google_doc_edit_already_used", 409, "This mandate already has its one edit intent.");
  }
  if (!await mandateCurrent(mandate) || !await approvedSource(mandate)) throw sourceError();
  const source = await prisma.googleDriveContentSnapshot.findUniqueOrThrow({ where: { id: mandate.sourceSnapshotId } });
  const before = await providerState(mandate, mandate.file);
  if (before.revisionId !== input.expectedRevision || before.revisionId !== source.sourceRevisionId)
    throw new IntegrationError("source_changed", 409, "The Google Doc changed since approval or read.");
  let intent: GoogleDocEditIntent;
  try {
    intent = await prisma.$transaction(async tx => {
      if (actor.actorType === "agent" && !await resolveReviewPrincipal(tx, auth.workspaceId, auth)) throw sourceError();
      const currentMandate = await tx.googleDocMandate.findFirst({ where: { id: mandate.id, workspaceId: auth.workspaceId, revokedAt: null, validUntil: { gt: new Date() } } });
      const currentScope = await taskSourceScope(tx, auth.workspaceId, input.taskId, mandate.agentId);
      const activeTask = await tx.task.findFirst({ where: { id: input.taskId, workspaceId: auth.workspaceId,
        assignedWorkforceEntityId: mandate.agentId, status: { in: ["todo", "in_progress"] } }, select: { id: true } });
      const currentKey = await tx.apiKey.findFirst({ where: { id: mandate.credentialId, workspaceId: auth.workspaceId, boundAgentId: mandate.agentId,
        active: true, revokedAt: null, credentialVersion: mandate.credentialVersion, expiresAt: { gt: new Date() } } });
      const currentReviews = await taskSourceReviews(tx, auth.workspaceId, input.taskId);
      const current = currentReviews.get(`drive_snapshot:${mandate.sourceSnapshotId}`);
      const candidate = await docSource(tx, auth.workspaceId, mandate.sourceSnapshotId, input.fileId);
      if (!currentMandate || !currentScope || !activeTask || !currentKey || !Array.isArray(currentKey.scopes)
        || !currentKey.scopes.includes("agent-runtime:write") || !candidate || !current
        || current.id !== mandate.sourceReviewId
        || !taskSourceEligible(candidate.source, current, auth.workspaceId, input.taskId,
          currentScope.applicationIds, currentScope.task.projectId)) throw sourceError();
      const created = await tx.googleDocEditIntent.create({ data: { mandateId: mandate.id, workspaceId: auth.workspaceId,
        taskId: input.taskId, fileId: input.fileId, requestId: input.requestId, requestHash,
        actorType: actor.actorType, actorId: actor.actorId, credentialId: actor.credentialId,
        baseRevisionId: input.expectedRevision, appendTextHash: hash(input.text), state: "posting" } });
      await tx.event.create({ data: { workspaceId: auth.workspaceId, taskId: input.taskId, source: "roost", type: "google_doc_edit_intent_created",
        actorType: actor.actorType, actorId: actor.actorId, payload: { intentId: created.id, mandateId: mandate.id, fileId: input.fileId, baseRevisionId: input.expectedRevision } } });
      return created;
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    throw new IntegrationError("google_doc_edit_already_used", 409, "This mandate already has its one edit intent.");
  }
  let responseRevision: string | null = null;
  try {
    if (!await mandateCurrent(mandate) || !await approvedSource(mandate)) {
      intent = await setIntent(intent.id, { state: "conflict", errorCode: "mandate_or_source_changed_before_write" });
      return publicIntent(intent);
    }
    const check = await providerState(mandate, mandate.file);
    if (check.revisionId !== input.expectedRevision) {
      intent = await setIntent(intent.id, { state: "conflict", errorCode: "source_changed_before_write" });
      return publicIntent(intent);
    }
    const tabId = firstTabId(check.document);
    const response = await check.client.updateDocument(mandate.file.externalId,
      [{ insertText: { endOfSegmentLocation: tabId ? { tabId } : {}, text: input.text } }],
      { requiredRevisionId: input.expectedRevision });
    const control = response.writeControl as { requiredRevisionId?: unknown } | undefined;
    responseRevision = typeof control?.requiredRevisionId === "string" ? control.requiredRevisionId : null;
  } catch (error) {
    intent = await setIntent(intent.id, { state: error instanceof IntegrationError && ["source_changed", "google_doc_scope_changed"].includes(error.code) ? "conflict" : "uncertain",
      errorCode: error instanceof IntegrationError ? error.code : "provider_write_uncertain" });
    return publicIntent(intent);
  }
  try {
    const after = await providerState(mandate, mandate.file);
    const content = firstTabText(after.document);
    const confirmed = Boolean(responseRevision && after.revisionId === responseRevision && content.includes(input.text));
    if (confirmed) {
      const updatedFile = await upsertGoogleDriveFileFromMetadata(auth.workspaceId, after.metadata);
      await refreshGoogleDriveFileContent({ workspaceId: auth.workspaceId, file: updatedFile, client: after.client });
    }
    const authorityAfter = await mandateCurrent(mandate) && Boolean(await approvedSource(mandate, true));
    intent = await setIntent(intent.id, { state: confirmed && authorityAfter ? "applied" : "conflict",
      errorCode: !authorityAfter ? "mandate_or_source_changed_during_write" : confirmed ? null : "provider_readback_diverged",
      providerRevisionId: responseRevision, providerVersion: after.metadata.version ?? null, readbackTextHash: hash(content) });
  } catch (error) {
    intent = await setIntent(intent.id, { state: error instanceof IntegrationError && error.code === "google_doc_scope_changed" ? "conflict" : "uncertain",
      errorCode: error instanceof IntegrationError ? error.code : "provider_readback_unavailable",
      providerRevisionId: responseRevision });
  }
  return publicIntent(intent);
}

export async function closeGovernedGoogleDocIntent(auth: AuthContext, taskId: string, fileId: string, intentId: string) {
  const ownerUserId = await requireOwner(auth);
  const { mandate } = await mandateFor(auth, taskId, fileId, false);
  return prisma.$transaction(async tx => {
    const changed = await tx.googleDocEditIntent.updateMany({ where: { id: intentId, mandateId: mandate.id, workspaceId: auth.workspaceId, state: { in: ["conflict", "uncertain"] } }, data: { state: "closed" } });
    if (!changed.count) throw new IntegrationError("google_doc_intent_not_resolvable", 409, "Only a conflict or uncertain intent can be closed.");
    const intent = await tx.googleDocEditIntent.findUniqueOrThrow({ where: { id: intentId } });
    await tx.event.create({ data: { workspaceId: auth.workspaceId, taskId, source: "roost", type: "google_doc_edit_intent_closed",
      actorType: "user", actorId: ownerUserId, payload: { intentId, mandateId: mandate.id } } });
    return publicIntent(intent);
  });
}
