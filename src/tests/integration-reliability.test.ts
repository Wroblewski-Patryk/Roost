import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { decryptSecret, encryptSecret } from "../integrations/secrets";
import { ClickUpClient } from "../integrations/clickup/clickup.client";
import { mapClickUpTaskToCompanyCoreTask } from "../integrations/clickup/clickup.mapper";
import { syncClickUpTasksForWorkspaceWithOptions } from "../integrations/clickup/clickup.sync";
import { archiveCompanyCoreTaskInClickUp, ingestClickUpWebhook, clickUpWebhookEvents, reconcileClickUpWebhooksForWorkspace, processClickUpProviderEvent, retryFailedClickUpProviderEvents, writeBackCompanyCoreTaskToClickUp } from "../integrations/clickup/clickup.webhooks";
import { acknowledgeGovernedClickUpIntent, clickUpStatusControlForTasks, recoverStaleClickUpStatusIntents, requestGovernedClickUpStatus } from "../integrations/clickup/clickup.status-authority";
import { reconcileGoogleDriveChangesForWorkspace } from "../integrations/google-drive/google-drive.sync";
import { withIntegrationLock } from "../integrations/sync-lock";
import { providerRequest } from "../integrations/provider-request";
import { GoogleDriveClient } from "../integrations/google-drive/google-drive.client";
import { googleDriveSecretStatus } from "../integrations/integration-settings.service";
import { readGoogleDriveFileContent, updateGoogleDriveFileMetadata, updateGoogleSheetValues, updateGoogleDoc, updateGoogleDriveTextFileContent } from "../integrations/google-drive/google-drive.content";

const url = new URL(process.env.DATABASE_URL!);
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname.startsWith("/companycore_test"), "Disposable local database required");
const realFetch = globalThis.fetch;
after(async () => { globalThis.fetch = realFetch; await prisma.$disconnect(); });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
async function workspace(provider: "clickup" | "google_drive", config: Record<string, unknown>) {
  const workspace = await prisma.workspace.create({ data: { name: "Integration regression", owner: { create: {
    email: `integration-${randomUUID()}@example.test`, name: "Test", passwordHash: "not-a-login"
  } } } });
  await prisma.integrationSetting.create({ data: { workspaceId: workspace.id, provider, active: true, config: config as any,
    secretCiphertext: encryptSecret(provider === "clickup" ? "synthetic" : JSON.stringify({ accessToken: "synthetic" })) } });
  return workspace.id;
}

test("ClickUp archive, restore and explicit field removal preserve semantics", () => {
  const input = { id: "task", name: "Task", archived: true, status: { status: "to do", type: "open" }, due_date: null, priority: null };
  const archived = mapClickUpTaskToCompanyCoreTask(input, "workspace");
  assert.equal(archived.status, "archived"); assert.equal(archived.dueDate, null); assert.equal(archived.priority, null);
  assert.equal(mapClickUpTaskToCompanyCoreTask({ ...input, archived: false }, "workspace").status, "todo");
});

test("Drive settings expose saved OAuth client presence for reconnect without exposing credentials", () => {
  const status = googleDriveSecretStatus(encryptSecret(JSON.stringify({ clientId: "synthetic-id", clientSecret: "synthetic-secret" })));
  assert.equal(status.hasClientId, true);
  assert.equal(status.hasClientSecret, true);
  assert.equal(JSON.stringify(status).includes("synthetic"), false);
});

test("ClickUp pagination goes beyond ten pages and fails on incomplete capped results", async () => {
  let count = 0;
  globalThis.fetch = async () => json({ tasks: [{ id: String(++count), name: "Task" }], last_page: count === 12 });
  assert.equal((await new ClickUpClient("synthetic").getWorkspaceTasks({ teamId: "t", listIds: ["l"] })).length, 12);
  count = 0;
  await assert.rejects(new ClickUpClient("synthetic").getWorkspaceTasks({ teamId: "t", listIds: ["l"], maxPages: 2 }), /page budget/);
});

test("missing ClickUp tasks are verified individually; archives preserve IDs and inaccessible tasks", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "List", source: "clickup", externalId: "list" } });
  const original = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Before", source: "clickup", externalId: "archived", status: "todo" } });
  const unavailable = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Keep", source: "clickup", externalId: "inaccessible", status: "todo" } });
  const deleted = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Deleted", source: "clickup", externalId: "deleted", status: "archived" } });
  await prisma.providerEventInbox.create({ data: { workspaceId: id, provider: "clickup", externalWebhookId: "synthetic", externalTaskId: "deleted", eventName: "taskDeleted", idempotencyKey: randomUUID(), payloadHash: "synthetic", payload: {}, signatureVerified: true, processingStatus: "processed" } });
  globalThis.fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/team/team/task")) return json({ tasks: [], last_page: true });
    if (path.endsWith("/task/archived")) return json({ id: "archived", name: "Archived", archived: true, status: { type: "open" }, list: { id: "list" } });
    return json({}, 401);
  };
  await syncClickUpTasksForWorkspaceWithOptions(id);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: original.id } })).status, "archived");
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: unavailable.id } })).status, "todo");
  const again = await syncClickUpTasksForWorkspaceWithOptions(id);
  assert.equal(again.updatedCount, 0);
  assert.equal(again.unavailableCount, 1);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: deleted.id } })).status, "archived");
});

test("ClickUp writes archive, unarchive, real List status and cleared fields", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const writes: any[] = [];
  globalThis.fetch = async (input, init) => {
    if (init?.method === "PUT") { writes.push(JSON.parse(String(init.body))); return json({ id: "task", name: "Task" }); }
    if (String(input).endsWith("/list/list")) return json({ id: "list", statuses: [{ status: "Delivered", type: "closed" }] });
    return json({ id: "task", name: "Task", archived: true, list: { id: "list" }, status: { status: "Pending", type: "open" } });
  };
  await writeBackCompanyCoreTaskToClickUp({ workspaceId: id, externalId: "task", changes: { status: "archived" } });
  await writeBackCompanyCoreTaskToClickUp({ workspaceId: id, externalId: "task", changes: { status: "done", dueDate: null, priority: null } });
  assert.deepEqual(writes, [{ archived: true }, { archived: false, status: "Delivered", due_date: null, priority: null }]);
});

test("ClickUp reconciliation repairs unreadable webhook secrets and active endpoint drift", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const registration = await prisma.externalWebhookRegistration.create({ data: {
    workspaceId: id, provider: "clickup", externalId: "webhook", scopeType: "list", scopeExternalId: "list",
    endpointUrl: "https://old.example.test", events: [], status: "active", secretCiphertext: "invalid-old-key"
  } });
  let updated = false;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "PUT") { updated = true; return json({ webhook: { id: "webhook", health: { status: "active" } } }); }
    return json({ webhooks: [{ id: "webhook", endpoint: "https://old.example.test", events: [], secret: "synthetic-provider-secret", health: { status: "active" } }] });
  };
  await reconcileClickUpWebhooksForWorkspace(id, { protocol: "https", get: () => "api.example.test" });
  const repaired = await prisma.externalWebhookRegistration.findUniqueOrThrow({ where: { id: registration.id } });
  assert.equal(updated, true);
  assert.equal(decryptSecret(repaired.secretCiphertext), "synthetic-provider-secret");
  assert.deepEqual(repaired.events, [...clickUpWebhookEvents]);
});

test("Drive consumes all pages, excludes other folders, and replay emits no duplicate agent events", async () => {
  const id = await workspace("google_drive", { selectedFolderIds: ["root"], changesPageToken: "p1" });
  const pages: string[] = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/files/root")) return json({ id: "root", name: "Root", mimeType: "application/vnd.google-apps.folder" });
    if (url.pathname.endsWith("/changes")) {
      const page = url.searchParams.get("pageToken")!; pages.push(page);
      if (page === "p1") return json({ nextPageToken: "p2", changes: [
        { fileId: "inside", time: "1", file: { id: "inside", name: "Inside", mimeType: "image/png", parents: ["root"] } },
        { fileId: "outside", time: "1", file: { id: "outside", name: "Outside", mimeType: "image/png" } }
      ] });
      return json({ newStartPageToken: "p3", changes: [{ fileId: "inside", removed: true, time: "2" }] });
    }
    throw new Error(`Unexpected synthetic request: ${url.pathname}`);
  };
  const result = await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id });
  assert.deepEqual(pages, ["p1", "p2"]); assert.equal(result.newStartPageToken, "p3");
  assert.equal(await prisma.googleDriveFile.count({ where: { workspaceId: id, externalId: "outside" } }), 0);
  const file = await prisma.googleDriveFile.findFirstOrThrow({ where: { workspaceId: id, externalId: "inside" } });
  assert.equal(file.syncStatus, "removed");
  const count = await prisma.agentEventOutbox.count({ where: { workspaceId: id } });
  await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id, pageToken: "p1" });
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id } }), count);
});

test("Drive failed content stays failed and resumes without advancing the cursor", async () => {
  const id = await workspace("google_drive", { changesPageToken: "start" });
  await prisma.googleDriveFile.create({ data: { workspaceId: id, provider: "google_drive", externalId: "doc", name: "Doc", mimeType: "application/vnd.google-apps.document" } });
  let fail = true;
  globalThis.fetch = async input => String(input).includes("/changes?")
    ? json({ newStartPageToken: "end", changes: [{ fileId: "doc", time: "1", file: { id: "doc", name: "Doc", mimeType: "application/vnd.google-apps.document" } }] })
    : fail ? json({}, 403) : json({ revisionId: "r1", body: { content: [] } });
  await assert.rejects(reconcileGoogleDriveChangesForWorkspace({ workspaceId: id }));
  const setting = await prisma.integrationSetting.findFirstOrThrow({ where: { workspaceId: id } });
  assert.equal((setting.config as any).changesPageToken, "start");
  assert.equal((await prisma.providerEventInbox.findFirstOrThrow({ where: { workspaceId: id } })).processingStatus, "failed");
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id } }), 0);
  fail = false;
  await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id });
  assert.equal((await prisma.providerEventInbox.findFirstOrThrow({ where: { workspaceId: id } })).processingStatus, "processed");
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id } }), 1);
});

test("integration serialization continues after failure", async () => {
  const order: number[] = [];
  const first = withIntegrationLock("test", async () => { order.push(1); throw new Error("test failure"); });
  const second = withIntegrationLock("test", async () => { order.push(2); });
  await Promise.allSettled([first, second]); assert.deepEqual(order, [1, 2]);
});

test("Drive trash events remain restorable instead of being classified outside the folder scope", async () => {
  const id = await workspace("google_drive", { selectedFolderIds: ["root"], changesPageToken: "before" });
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "file", name: "File", mimeType: "image/png", parentExternalId: "root" } });
  let trashed = true;
  globalThis.fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/changes")) return json({ newStartPageToken: trashed ? "trashed" : "restored", changes: [{ fileId: "file", time: trashed ? "1" : "2", file: { id: "file", name: "File", mimeType: "image/png", parents: ["root"], trashed } }] });
    return json({ id: "root", name: "Root", mimeType: "application/vnd.google-apps.folder" });
  };
  await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id });
  const deleted = await prisma.googleDriveFile.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(deleted.trashed, true); assert.equal(deleted.syncStatus, "trashed");
  trashed = false;
  await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id });
  const restored = await prisma.googleDriveFile.findUniqueOrThrow({ where: { id: file.id } });
  assert.equal(restored.trashed, false); assert.equal(restored.syncStatus, "synced");
});

test("ClickUp acknowledges a durable webhook while maintenance holds the workspace lock", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const webhookId = `blocked-${randomUUID()}`;
  await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: webhookId, scopeType: "list", scopeExternalId: "list", endpointUrl: "https://example.test", events: [], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  let release!: () => void;
  const blocked = withIntegrationLock(`clickup:${id}`, () => new Promise<void>(resolve => { release = resolve; }));
  const rawBody = Buffer.from(JSON.stringify({ webhook_id: webhookId, event: "taskDeleted", task_id: "missing" }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inboxId: string | undefined;
  try {
    const result = await Promise.race([ingestClickUpWebhook({ rawBody, signature: createHmac("sha256", "synthetic").update(rawBody).digest("hex") }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("webhook acknowledgement waited for maintenance")), 1000); })]);
    inboxId = result.inboxId;
    assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus, "pending");
  } finally { clearTimeout(timer); release(); await blocked; }
  if (inboxId) {
    await processClickUpProviderEvent(inboxId);
    assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus, "processed");
  }
});

test("concurrent ClickUp webhook replay commits one event and one agent signal", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: "synthetic", scopeType: "list", scopeExternalId: "list", endpointUrl: "https://example.test", events: [], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  const inbox = await prisma.providerEventInbox.create({ data: { workspaceId: id, provider: "clickup", externalWebhookId: "synthetic",
    webhookRegistrationId: registration.id,
    eventName: "taskStatusUpdated", idempotencyKey: "one", payloadHash: "one", signatureVerified: true,
    payload: { event: "taskStatusUpdated", task_id: "task", history_items: [{ field: "status", before: "todo", after: "done" }] } } });
  globalThis.fetch = async () => json({ id: "task", name: "Task", status: { status: "complete", type: "closed" }, list: { id: "list" } });
  await Promise.all([processClickUpProviderEvent(inbox.id), processClickUpProviderEvent(inbox.id)]);
  assert.equal(await prisma.event.count({ where: { workspaceId: id, type: "clickup_taskStatusUpdated" } }), 1);
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id } }), 1);
  assert.equal((await prisma.task.findFirstOrThrow({ where: { workspaceId: id } })).status, "done");
});

test("governed ClickUp status request is an append-only comment until signed event and readback", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const owner = await prisma.workspace.findUniqueOrThrow({ where: { id }, select: { ownerUserId: true } });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  await prisma.taskList.create({ data: { workspaceId: id, name: "Other", source: "clickup", externalId: "other" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Owned by provider", source: "clickup", externalId: "task-governed", status: "todo", ownerUserId: owner.ownerUserId } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`, scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  let remoteStatus = "to do";
  let comments: Array<{ id: string; comment: Array<{ text: string }> }> = [];
  const methods: string[] = [];
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? "GET"; methods.push(`${method} ${path}`);
    if (path.endsWith("/task/task-governed") && method === "GET") return json({ id: "task-governed", name: "Owned by provider", list: { id: "selected" }, status: { status: remoteStatus, type: remoteStatus === "done" ? "closed" : "open" } });
    if (path.endsWith("/task/task-governed/comment") && method === "POST") {
      const body = JSON.parse(String(init?.body)); comments = [{ id: "comment-one", comment: [{ text: body.comment_text }] }]; return json({ id: "comment-one" });
    }
    if (path.endsWith("/task/task-governed/comment") && method === "GET") return json({ comments });
    throw new Error(`Unexpected provider call ${method} ${path}`);
  };
  const intent = await requestGovernedClickUpStatus({ task, requestedStatus: "done", requesterUserId: owner.ownerUserId });
  assert.equal(intent.state, "awaiting_provider");
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  assert.equal(methods.filter(method => method.startsWith("POST ")).length, 1);
  assert.equal(methods.some(method => method.startsWith("PUT ")), false);
  await assert.rejects(requestGovernedClickUpStatus({ task, requestedStatus: "blocked", requesterUserId: owner.ownerUserId }), /already open/);

  const invalidBody = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event: "taskStatusUpdated", task_id: task.externalId, history_items: [{ id: "history-one", field: "status", before: "to do", after: "done", user: { id: 77 } }] }));
  await assert.rejects(ingestClickUpWebhook({ rawBody: invalidBody, signature: "bad" }), /signature/);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  remoteStatus = "done";
  const accepted = await ingestClickUpWebhook({ rawBody: invalidBody, signature: createHmac("sha256", "synthetic").update(invalidBody).digest("hex") });
  await processClickUpProviderEvent(accepted.inboxId);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "done");
  assert.equal((await prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } })).state, "confirmed");
  const providerState = await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } });
  assert.equal(providerState.actorProviderUserId, "77"); assert.equal(providerState.actorVerification, "unverified");
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).ownerUserId, owner.ownerUserId);
  assert.equal((await ingestClickUpWebhook({ rawBody: invalidBody, signature: createHmac("sha256", "synthetic").update(invalidBody).digest("hex") })).status, "duplicate");
  assert.equal(await prisma.event.count({ where: { workspaceId: id, type: "clickup_status_reconciled" } }), 1);
});

test("governed ClickUp ambiguous comment and out-of-scope event stay visible without retry or overwrite", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const owner = await prisma.workspace.findUniqueOrThrow({ where: { id }, select: { ownerUserId: true } });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Task", source: "clickup", externalId: "task-ambiguous", status: "todo" } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`, scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  let posts = 0;
  let listId = "selected";
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/task/task-ambiguous") && !init?.method) return json({ id: "task-ambiguous", name: "Task", list: { id: listId }, status: { status: "to do", type: "open" } });
    if (path.endsWith("/task/task-ambiguous/comment") && init?.method === "POST") { posts += 1; throw new Error("connection lost after provider may have posted"); }
    throw new Error(`Unexpected provider call ${path}`);
  };
  const intent = await requestGovernedClickUpStatus({ task, requestedStatus: "done", requesterUserId: owner.ownerUserId });
  assert.equal(intent.state, "uncertain"); assert.equal(posts, 1);
  await assert.rejects(writeBackCompanyCoreTaskToClickUp({ workspaceId: id, externalId: task.externalId!, changes: { status: "done" } }), /Direct ClickUp status and task moves/);
  const body = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event: "taskStatusUpdated", task_id: task.externalId, history_items: [{ id: "outside", field: "status", after: "done" }] }));
  listId = "other";
  const accepted = await ingestClickUpWebhook({ rawBody: body, signature: createHmac("sha256", "synthetic").update(body).digest("hex") });
  await processClickUpProviderEvent(accepted.inboxId);
  assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: accepted.inboxId } })).processingStatus, "rejected");
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  assert.equal(posts, 1);
  assert.equal((await acknowledgeGovernedClickUpIntent({ workspaceId: id, taskId: task.id, intentId: intent.id })).state, "closed");
});

test("governed ClickUp detects a task moved after comment POST without repeating the POST", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const owner = await prisma.workspace.findUniqueOrThrow({ where: { id }, select: { ownerUserId: true } });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Move race", source: "clickup", externalId: "move-race", status: "todo" } });
  await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`,
    scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents],
    status: "active", secretCiphertext: encryptSecret("synthetic") } });
  let posts = 0;
  let moved = false;
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/task/move-race") && !init?.method) return json({ id: "move-race", name: "Move race",
      list: { id: moved ? "other" : "selected" }, status: { status: "to do", type: "open" } });
    if (path.endsWith("/task/move-race/comment") && init?.method === "POST") { posts++; moved = true; return json({ id: "comment-race" }); }
    if (path.endsWith("/task/move-race/comment") && !init?.method) return json({ comments: [{ id: "comment-race",
      comment: [{ text: "[Roost status request" }] }] });
    throw new Error(`Unexpected provider call ${path}`);
  };
  const result = await requestGovernedClickUpStatus({ task, requestedStatus: "done", requesterUserId: owner.ownerUserId });
  assert.equal(result.state, "conflict");
  assert.equal(result.errorCode, "provider_task_left_selected_list");
  assert.equal(posts, 1);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerErrorCode, "provider_task_left_selected_list");
});

test("governed ClickUp disables direct status, archive and moves across every List", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const other = await prisma.taskList.create({ data: { workspaceId: id, name: "Other", source: "clickup", externalId: "other" } });
  const selected = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: other.id, title: "Outside", source: "clickup", externalId: "outside", status: "todo" } });
  let providerCalls = 0;
  globalThis.fetch = async () => { providerCalls++; throw new Error("Provider should not be called"); };
  await assert.rejects(writeBackCompanyCoreTaskToClickUp({ workspaceId: id, externalId: task.externalId!, changes: { status: "done" } }), /Direct ClickUp status and task moves/);
  await assert.rejects(writeBackCompanyCoreTaskToClickUp({ workspaceId: id, externalId: task.externalId!, changes: { taskListId: selected.id } }), /Direct ClickUp status and task moves/);
  await assert.rejects(archiveCompanyCoreTaskInClickUp({ workspaceId: id, externalId: task.externalId! }), /Direct ClickUp archive/);
  assert.equal(providerCalls, 0);
  const controls = await clickUpStatusControlForTasks(id, [task]);
  assert.equal((controls.get(task.id) as { governedList: boolean; directActionsDisabled: boolean }).governedList, false);
  assert.equal((controls.get(task.id) as { directActionsDisabled: boolean }).directActionsDisabled, true);
});

test("older signed status event cannot attribute a newer ClickUp readback", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Rapid changes", source: "clickup", externalId: "rapid", status: "todo" } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`,
    scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents],
    status: "active", secretCiphertext: encryptSecret("synthetic") } });
  globalThis.fetch = async () => json({ id: "rapid", name: "Rapid changes", list: { id: "selected" }, status: { status: "done", type: "closed" } });
  const submit = async (event: string, historyId: string, after: string, actorId: number, nonStatusFirst = false) => {
    const statusItem = { id: historyId, field: "status", after, user: { id: actorId } };
    const body = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event, task_id: task.externalId,
      history_items: nonStatusFirst ? [{ id: `other-${historyId}`, field: "name", after: "Rapid changes" }, statusItem] : [statusItem] }));
    return ingestClickUpWebhook({ rawBody: body, signature: createHmac("sha256", "synthetic").update(body).digest("hex") });
  };
  const older = await submit("taskUpdated", "first", "in progress", 41, true);
  await processClickUpProviderEvent(older.inboxId);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  const divergent = await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } });
  assert.equal(divergent.providerErrorCode, "signed_event_readback_diverged");
  assert.equal(divergent.actorProviderUserId, null);
  const paired = await submit("taskStatusUpdated", "first", "in progress", 41);
  assert.equal(paired.status, "accepted");
  await processClickUpProviderEvent(paired.inboxId);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  const newer = await submit("taskStatusUpdated", "second", "done", 42);
  await processClickUpProviderEvent(newer.inboxId);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "done");
  const reconciled = await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } });
  assert.equal(reconciled.actorProviderUserId, "42");
  assert.equal(reconciled.signedInboxId, newer.inboxId);
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id, eventType: "task_status_updated_from_clickup" } }), 3);
  assert.equal(await prisma.event.count({ where: { workspaceId: id, type: "clickup_taskUpdated" } }), 1);
  assert.equal(await prisma.event.count({ where: { workspaceId: id, type: "clickup_taskStatusUpdated" } }), 2);
});

test("selected ClickUp deletion quarantines even when local List has not caught up", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const other = await prisma.taskList.create({ data: { workspaceId: id, name: "Other", source: "clickup", externalId: "other" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: other.id, title: "Moved", source: "clickup", externalId: "deleted-race", status: "todo" } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`,
    scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents],
    status: "active", secretCiphertext: encryptSecret("synthetic") } });
  const body = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event: "taskDeleted", task_id: task.externalId }));
  const accepted = await ingestClickUpWebhook({ rawBody: body, signature: createHmac("sha256", "synthetic").update(body).digest("hex") });
  await processClickUpProviderEvent(accepted.inboxId);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerErrorCode, "provider_delete_readback_unavailable");
});

test("ClickUp import quarantines move out until signed move and readback", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const selected = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const other = await prisma.taskList.create({ data: { workspaceId: id, name: "Other", source: "clickup", externalId: "other" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: selected.id, title: "Moved", source: "clickup", externalId: "moved-out", status: "todo" } });
  const intent = await prisma.clickUpStatusIntent.create({ data: { workspaceId: id, taskId: task.id, externalTaskId: task.externalId!,
    externalListId: "selected", baseStatus: "todo", requestedStatus: "done", state: "awaiting_provider" } });
  const remote = { id: "moved-out", name: "Moved", list: { id: "other" }, status: { status: "done", type: "closed" } };
  globalThis.fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/team/team/task")) return json({ tasks: [remote], last_page: true });
    if (path.endsWith("/task/moved-out")) return json(remote);
    throw new Error(`Unexpected provider read ${path}`);
  };
  await syncClickUpTasksForWorkspaceWithOptions(id);
  const preserved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(preserved.status, "todo"); assert.equal(preserved.taskListId, selected.id);
  assert.equal((await prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } })).state, "conflict");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerErrorCode, "provider_task_left_selected_list");
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`,
    scopeType: "list", scopeExternalId: "other", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents],
    status: "active", secretCiphertext: encryptSecret("synthetic") } });
  const body = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event: "taskMoved", task_id: task.externalId,
    history_items: [{ id: "move-out", field: "list", before: { id: "selected" }, after: { id: "other" } }] }));
  const accepted = await ingestClickUpWebhook({ rawBody: body, signature: createHmac("sha256", "synthetic").update(body).digest("hex") });
  await processClickUpProviderEvent(accepted.inboxId);
  const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(after.status, "todo"); assert.equal(after.taskListId, other.id);
  await syncClickUpTasksForWorkspaceWithOptions(id);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "done");
  const controls = await clickUpStatusControlForTasks(id, [after]);
  assert.equal((controls.get(task.id) as { providerErrorCode: string | null }).providerErrorCode, null);
});

test("signed move into selected ClickUp List does not borrow a later status", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected", "other"], governedStatusListId: "selected" });
  const other = await prisma.taskList.create({ data: { workspaceId: id, name: "Other", source: "clickup", externalId: "other" } });
  const selected = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: other.id, title: "Entering", source: "clickup", externalId: "entering", status: "todo" } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`,
    scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents],
    status: "active", secretCiphertext: encryptSecret("synthetic") } });
  globalThis.fetch = async () => json({ id: "entering", name: "Entering", list: { id: "selected" }, status: { status: "done", type: "closed" } });
  const submit = async (event: string, history: unknown[]) => {
    const body = Buffer.from(JSON.stringify({ webhook_id: registration.externalId, event, task_id: task.externalId, history_items: history }));
    const accepted = await ingestClickUpWebhook({ rawBody: body, signature: createHmac("sha256", "synthetic").update(body).digest("hex") });
    await processClickUpProviderEvent(accepted.inboxId);
  };
  await submit("taskMoved", [{ id: "move-in", field: "list", after: { id: "selected" } }]);
  const moved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(moved.taskListId, selected.id); assert.equal(moved.status, "todo");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerErrorCode, "provider_status_awaiting_signed_event");
  await submit("taskStatusUpdated", [{ id: "later-status", field: "status", after: "done", user: { id: 33 } }]);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "done");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerErrorCode, null);
});

test("governed ClickUp provider version mismatch records conflict without comment or status overwrite", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const owner = await prisma.workspace.findUniqueOrThrow({ where: { id }, select: { ownerUserId: true } });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Task", source: "clickup", externalId: "task-mismatch", status: "todo" } });
  await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`, scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  const methods: string[] = [];
  globalThis.fetch = async (input, init) => { methods.push(init?.method ?? "GET"); return json({ id: "task-mismatch", name: "Task", list: { id: "selected" }, status: { status: "in progress", type: "custom" } }); };
  await assert.rejects(requestGovernedClickUpStatus({ task, requestedStatus: "done", requesterUserId: owner.ownerUserId }), /differs from Roost/);
  assert.equal(methods.includes("POST"), false);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  assert.equal((await prisma.clickUpStatusIntent.findFirstOrThrow({ where: { taskId: task.id } })).state, "conflict");
  assert.equal((await prisma.clickUpStatusState.findUniqueOrThrow({ where: { taskId: task.id } })).providerStatus, "in_progress");
});

test("signed ClickUp provider outage retains inbox, then maintenance applies provider readback", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Task", source: "clickup", externalId: "task-outage", status: "todo" } });
  const registration = await prisma.externalWebhookRegistration.create({ data: { workspaceId: id, provider: "clickup", externalId: `wh-${randomUUID()}`, scopeType: "list", scopeExternalId: "selected", endpointUrl: "https://example.test", events: [...clickUpWebhookEvents], status: "active", secretCiphertext: encryptSecret("synthetic") } });
  const inbox = await prisma.providerEventInbox.create({ data: { workspaceId: id, provider: "clickup", webhookRegistrationId: registration.id, externalWebhookId: registration.externalId,
    eventName: "taskStatusUpdated", externalTaskId: task.externalId, idempotencyKey: randomUUID(), payloadHash: "synthetic", signatureVerified: true,
    payload: { webhook_id: registration.externalId, event: "taskStatusUpdated", task_id: task.externalId, history_items: [{ id: "outage-change", field: "status", after: "done" }] } } });
  globalThis.fetch = async () => json({}, 503);
  await assert.rejects(processClickUpProviderEvent(inbox.id));
  assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inbox.id } })).processingStatus, "failed");
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
  globalThis.fetch = async () => json({ id: "task-outage", name: "Task", list: { id: "selected" }, status: { status: "done", type: "closed" } });
  const retried = await retryFailedClickUpProviderEvents({ workspaceId: id, eventIds: [inbox.id] });
  assert.equal(retried.processedCount, 1);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "done");
});

test("stale ClickUp posting intent is recovered by readback without a second comment POST", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const tasks = await Promise.all(["found", "unknown"].map(externalId => prisma.task.create({ data: {
    workspaceId: id, taskListId: list.id, title: externalId, source: "clickup", externalId, status: "todo" } })));
  const old = new Date(Date.now() - 10 * 60_000);
  const intents = await Promise.all(tasks.map(task => prisma.clickUpStatusIntent.create({ data: { workspaceId: id, taskId: task.id,
    externalTaskId: task.externalId!, externalListId: "selected", baseStatus: "todo", requestedStatus: "done", state: "posting", createdAt: old } })));
  const methods: string[] = [];
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname; methods.push(init?.method ?? "GET");
    return json({ comments: path.includes("/task/found/") ? [{ id: "comment-found", comment: [{ text: `[Roost status request ${intents[0].id}]` }] }] : [] });
  };
  const recovery = await recoverStaleClickUpStatusIntents(id);
  assert.deepEqual(recovery, { inspected: 2, recovered: 1, uncertain: 1 });
  assert.equal((await prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intents[0].id } })).state, "awaiting_provider");
  assert.equal((await prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intents[1].id } })).state, "uncertain");
  assert.equal(methods.every(method => method === "GET"), true);
});

test("provider readback without signed status event exposes mismatch while preserving canonical status", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["selected"], governedStatusListId: "selected" });
  const list = await prisma.taskList.create({ data: { workspaceId: id, name: "Selected", source: "clickup", externalId: "selected" } });
  const task = await prisma.task.create({ data: { workspaceId: id, taskListId: list.id, title: "Task", source: "clickup", externalId: "missing-event", status: "todo" } });
  globalThis.fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/team/team/task")) return json({ tasks: [{ id: "missing-event", name: "Task", list: { id: "selected" }, status: { status: "done", type: "closed" } }], last_page: true });
    throw new Error(`Unexpected provider read ${path}`);
  };
  await syncClickUpTasksForWorkspaceWithOptions(id);
  const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  assert.equal(after.status, "todo");
  const controls = await clickUpStatusControlForTasks(id, [after]);
  assert.deepEqual((controls.get(task.id) as { providerStatus: string; providerMismatch: boolean; signedInboxId: string | null }).providerStatus, "done");
  assert.equal((controls.get(task.id) as { providerMismatch: boolean }).providerMismatch, true);
  assert.equal((controls.get(task.id) as { signedInboxId: string | null }).signedInboxId, null);
});

test("ambiguous provider writes are not retried", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("connection lost after sending request"); };
  await assert.rejects(providerRequest("https://example.test", { method: "POST", body: "synthetic" }));
  assert.equal(calls, 1);
});

test("Drive refreshes a rejected access token once", async () => {
  const tokens: string[] = [];
  globalThis.fetch = async (_input, init) => {
    const token = new Headers(init?.headers).get("Authorization")!; tokens.push(token);
    return token === "Bearer expired" ? json({}, 401) : json({ id: "file", name: "File", mimeType: "text/plain" });
  };
  const client = new GoogleDriveClient("expired", async () => "fresh");
  assert.equal((await client.getFile("file")).id, "file");
  assert.deepEqual(tokens, ["Bearer expired", "Bearer fresh"]);
});

test("Drive user and shared-drive cursors are independent", async () => {
  const id = await workspace("google_drive", { changesPageToken: "user-start", changesPageTokens: { shared: "shared-start" } });
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("driveId"), "shared");
    assert.equal(url.searchParams.get("pageToken"), "shared-start");
    return json({ changes: [], newStartPageToken: "shared-end" });
  };
  await reconcileGoogleDriveChangesForWorkspace({ workspaceId: id, driveId: "shared" });
  const config = (await prisma.integrationSetting.findFirstOrThrow({ where: { workspaceId: id } })).config as any;
  assert.equal(config.changesPageToken, "user-start"); assert.equal(config.changesPageTokens.shared, "shared-end");
});

test("Sheets default snapshot reads every worksheet and marks explicit ranges partial", async () => {
  const id = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "sheet", name: "Sheet", mimeType: "application/vnd.google-apps.spreadsheet" } });
  const ranges: string[] = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/spreadsheets/sheet")) return json({ sheets: [{ properties: { title: "First" } }, { properties: { title: "Second" } }] });
    ranges.push(decodeURIComponent(url.pathname.split("/values/")[1]));
    return json({ values: [["Entire worksheet data"]] });
  };
  const snapshot = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  assert.deepEqual(ranges, ["'First'", "'First'", "'Second'", "'Second'"]);
  assert.equal((snapshot.metadata as any).partial, false);
  const partial = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id, range: "A1:B2" });
  assert.equal((partial.metadata as any).partial, true);
});

test("Drive metadata write denies a foreign workspace before contacting the provider", async () => {
  const first = await workspace("google_drive", {});
  const second = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: first, externalId: "private", name: "Private", mimeType: "image/png" } });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({}); };
  await assert.rejects(updateGoogleDriveFileMetadata({ workspaceId: second, fileId: file.id, trashed: true }));
  assert.equal(calls, 0);
});

test("Sheets range writes preserve a complete snapshot of every worksheet", async () => {
  const id = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "sheet", name: "Sheet", mimeType: "application/vnd.google-apps.spreadsheet" } });
  let writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "PUT") { writes++; return json({ updatedCells: 1 }); }
    if (url.pathname.endsWith("/files/sheet")) return json({ id: "sheet", name: "Sheet", mimeType: "application/vnd.google-apps.spreadsheet" });
    if (url.pathname.endsWith("/spreadsheets/sheet")) return json({ sheets: [{ properties: { title: "First" } }, { properties: { title: "Second" } }] });
    return json({ values: [[decodeURIComponent(url.pathname.split("/values/")[1])]] });
  };
  const before = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  const result = await updateGoogleSheetValues({ workspaceId: id, fileId: file.id, range: "Second!A1", values: [["Changed"]], expectedRevision: before.sourceRevisionId });
  assert.equal(writes, 1);
  assert.ok(result.snapshot.extractedText?.includes("First"));
  assert.ok(result.snapshot.extractedText?.includes("Second"));
  assert.equal((result.snapshot.metadata as any).partial, false);
});


test("Docs read all tabs and reject a stale revision before writing", async () => {
  const id = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "doc", name: "Doc", mimeType: "application/vnd.google-apps.document" } });
  let revision = "one"; let writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "POST") { writes++; assert.equal(JSON.parse(String(init.body)).writeControl.requiredRevisionId, "two"); return json({}); }
    if (url.pathname.endsWith("/files/doc")) return json({ id: "doc", name: "Doc", mimeType: file.mimeType });
    assert.equal(url.searchParams.get("includeTabsContent"), "true");
    return json({ revisionId: revision, tabs: [{ documentTab: { body: { content: [{ textRun: { content: "First tab" } }] } }, childTabs: [{ documentTab: { body: { content: [{ textRun: { content: "Nested tab" } }] } } }] }] });
  };
  const before = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  assert.ok(before.extractedText?.includes("Nested tab"));
  revision = "two";
  await assert.rejects(updateGoogleDoc({ workspaceId: id, fileId: file.id, requests: [], expectedRevision: before.sourceRevisionId }), (e: any) => e.code === "source_changed");
  await assert.rejects(updateGoogleDoc({ workspaceId: id, fileId: file.id, requests: [] }), (e: any) => e.code === "revision_required");
  assert.equal(writes, 0);
  await updateGoogleDoc({ workspaceId: id, fileId: file.id, requests: [{ insertText: { text: "new" } }], expectedRevision: "two" });
  assert.equal(writes, 1);
});

test("Sheets preserve formulas separately and detect formula-only concurrent changes", async () => {
  const id = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "formulas", name: "Formula sheet", mimeType: "application/vnd.google-apps.spreadsheet" } });
  let formula = "=1+1"; let writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "PUT") { writes++; assert.equal(url.searchParams.get("valueInputOption"), "RAW"); return json({}); }
    if (url.pathname.endsWith("/files/formulas")) return json({ id: "formulas", name: "Formula sheet", mimeType: file.mimeType });
    if (url.pathname.endsWith("/spreadsheets/formulas")) return json({ sheets: [{ properties: { title: "Budget", sheetId: 0 } }] });
    return json({ values: [[url.searchParams.get("valueRenderOption") === "FORMULA" ? formula : "2"]] });
  };
  const before = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  assert.equal((before.structuredPreview as any).ranges[0].formulas.values[0][0], "=1+1");
  formula = "=2*1";
  await assert.rejects(updateGoogleSheetValues({ workspaceId: id, fileId: file.id, range: "Budget!B1", values: [["value"]], expectedRevision: before.sourceRevisionId }), (e: any) => e.code === "source_changed");
  assert.equal(writes, 0);
  const partial = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id, range: "'Budget'" });
  await assert.rejects(updateGoogleSheetValues({ workspaceId: id, fileId: file.id, range: "Budget!B1", values: [["partial"]], expectedRevision: partial.sourceRevisionId }), (e: any) => e.code === "source_changed");
  const current = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  await updateGoogleSheetValues({ workspaceId: id, fileId: file.id, range: "Budget!B1", values: [["=literal"]], expectedRevision: current.sourceRevisionId });
  assert.equal(writes, 1);
});

test("Drive text edits require the full read revision and preserve long original content", async () => {
  const id = await workspace("google_drive", {});
  const file = await prisma.googleDriveFile.create({ data: { workspaceId: id, externalId: "text", name: "Notes.md", mimeType: "text/markdown" } });
  let content = "long original\n".repeat(2000); let writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "PATCH") { writes++; content = String(init.body); return json({ id: "text" }); }
    if (url.searchParams.get("alt") === "media") return new Response(content);
    return json({ id: "text", name: "Notes.md", mimeType: "text/markdown" });
  };
  const before = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  assert.equal(before.extractedText, content);
  await assert.rejects(updateGoogleDriveTextFileContent({ workspaceId: id, fileId: file.id, content: "preview" }), (e: any) => e.code === "revision_required");
  content += "external edit";
  await assert.rejects(updateGoogleDriveTextFileContent({ workspaceId: id, fileId: file.id, content: "stale", expectedRevision: before.sourceRevisionId }), (e: any) => e.code === "source_changed");
  assert.equal(writes, 0);
  const current = await readGoogleDriveFileContent({ workspaceId: id, fileId: file.id });
  const updated = await updateGoogleDriveTextFileContent({ workspaceId: id, fileId: file.id, content: current.extractedText! + "\nnew", expectedRevision: current.sourceRevisionId });
  assert.ok(updated.snapshot.extractedText?.endsWith("external edit\nnew"));
  assert.equal(writes, 1);
});
