import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { decryptSecret, encryptSecret } from "../integrations/secrets";
import { ClickUpClient } from "../integrations/clickup/clickup.client";
import { mapClickUpTaskToCompanyCoreTask } from "../integrations/clickup/clickup.mapper";
import { syncClickUpTasksForWorkspaceWithOptions } from "../integrations/clickup/clickup.sync";
import { clickUpWebhookEvents, reconcileClickUpWebhooksForWorkspace, processClickUpProviderEvent, writeBackCompanyCoreTaskToClickUp } from "../integrations/clickup/clickup.webhooks";
import { reconcileGoogleDriveChangesForWorkspace } from "../integrations/google-drive/google-drive.sync";
import { withIntegrationLock } from "../integrations/sync-lock";
import { providerRequest } from "../integrations/provider-request";
import { GoogleDriveClient } from "../integrations/google-drive/google-drive.client";
import { googleDriveSecretStatus } from "../integrations/integration-settings.service";
import { readGoogleDriveFileContent, updateGoogleDriveFileMetadata } from "../integrations/google-drive/google-drive.content";

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

test("concurrent ClickUp webhook replay commits one event and one agent signal", async () => {
  const id = await workspace("clickup", { teamId: "team", listIds: ["list"] });
  const inbox = await prisma.providerEventInbox.create({ data: { workspaceId: id, provider: "clickup", externalWebhookId: "synthetic",
    eventName: "taskStatusUpdated", idempotencyKey: "one", payloadHash: "one", signatureVerified: true,
    payload: { event: "taskStatusUpdated", task_id: "task", history_items: [{ field: "status", before: "todo", after: "done" }] } } });
  globalThis.fetch = async () => json({ id: "task", name: "Task", status: { status: "complete", type: "closed" }, list: { id: "list" } });
  await Promise.all([processClickUpProviderEvent(inbox.id), processClickUpProviderEvent(inbox.id)]);
  assert.equal(await prisma.event.count({ where: { workspaceId: id, type: "clickup_taskStatusUpdated" } }), 1);
  assert.equal(await prisma.agentEventOutbox.count({ where: { workspaceId: id } }), 1);
  assert.equal((await prisma.task.findFirstOrThrow({ where: { workspaceId: id } })).status, "done");
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
  assert.deepEqual(ranges, ["'First'", "'Second'"]);
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
