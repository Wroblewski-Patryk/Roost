import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { bootstrapInstallation } from "../bootstrap/installation";
import { hashPassword, verifyPassword } from "../auth/password";

test("installation bootstrap is minimal, atomic and preserves existing installations", async () => {
  const databaseUrl = process.env.BOOTSTRAP_TEST_DATABASE_URL;
  assert.ok(databaseUrl, "Set BOOTSTRAP_TEST_DATABASE_URL to a disposable local companycore_test_bootstrap database");
  const parsed = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname));
  assert.equal(parsed.pathname, "/companycore_test_bootstrap");
  assert.equal(parsed.searchParams.get("schema") ?? "public", "public");
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
  process.env.COMPANYCORE_SKIP_DOTENV = "1";
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename
  `;
  const quotedTables = tables.map(({ tablename }) => {
    assert.match(tablename, /^[a-z_]+$/);
    return `"${tablename}"`;
  });
  async function clear() {
    const applicationTables = quotedTables.filter((table) => table !== '"ready_source_fence"');
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${applicationTables.join(", ")} CASCADE`);
    // Migration-owned coordination row is required by source-write triggers.
    await db.$executeRaw`INSERT INTO ready_source_fence (id) VALUES (1) ON CONFLICT DO NOTHING`;
  }
  async function snapshot() {
    const digest = createHash("sha256");
    for (const table of quotedTables) {
      const rows = await db.$queryRawUnsafe(`SELECT to_jsonb(t)::text AS row FROM ${table} t ORDER BY to_jsonb(t)::text`);
      digest.update(table + JSON.stringify(rows));
    }
    return digest.digest("hex");
  }
  try {
    await clear();
    assert.deepEqual((await Promise.all([bootstrapInstallation(db), bootstrapInstallation(db)])).sort(), ["created", "skipped"]);
    const owner = await db.user.findFirstOrThrow();
    const workspace = await db.workspace.findFirstOrThrow();
    assert.equal(owner.email, "owner@owner.com");
    assert.ok(await verifyPassword("password", owner.passwordHash));
    assert.equal(workspace.ownerUserId, owner.id);
    assert.equal(await db.workspaceMembership.count({ where: { userId: owner.id, role: "owner" } }), 1);
    assert.equal(await db.workspaceDepartment.count({ where: { position: { gt: 0 } } }), 12);
    assert.equal(await db.workspaceDepartment.count({ where: { key: "00-ogolny" } }), 1);
    const allowed = new Set(['"users"', '"workspaces"', '"workspace_memberships"', '"workspace_departments"', '"ready_source_fence"']);
    for (const table of quotedTables.filter((table) => !allowed.has(table))) {
      const [row] = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*) FROM ${table}`);
      assert.equal(row.count, 0n, `${table} must remain empty after bootstrap`);
    }

    // Exercise the actual login, email change and password change endpoints.
    const { createApp } = await import("../app");
    const { prisma: appDb } = await import("../db/prisma");
    const server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    async function request(route: string, body: object, token?: string, method = "POST") {
      const response = await fetch(baseUrl + route, { method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() as { data: { token: string } } };
    }
    try {
      const login = await request("/auth/login", { email: owner.email, password: "password" });
      assert.equal(login.status, 200);
      const token = login.body.data.token;
      assert.equal((await request("/auth/me", { email: "changed@example.com", currentPassword: "password" }, token, "PATCH")).status, 200);
      assert.equal((await request("/auth/password", { currentPassword: "password", newPassword: "changed-bootstrap-password" }, token)).status, 200);
      assert.equal((await request("/auth/login", { email: "changed@example.com", password: "changed-bootstrap-password" })).status, 200);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await appDb.$disconnect();
    }

    const newOwner = await db.user.create({ data: { email: "new-owner@example.com", passwordHash: await hashPassword("fixture-owner-password") } });
    await db.workspace.update({ where: { id: workspace.id }, data: { name: "Edited company", ownerUserId: newOwner.id } });
    await db.workspaceMembership.updateMany({ where: { userId: owner.id }, data: { role: "admin" } });
    await db.workspaceMembership.create({ data: { userId: newOwner.id, workspaceId: workspace.id, role: "owner" } });
    await db.workspaceDepartment.deleteMany({ where: { workspaceId: workspace.id, key: "03-sprzedaz" } });
    await db.workspaceDepartment.updateMany({ where: { workspaceId: workspace.id, key: "01-strategia" }, data: { name: "Edited strategy", status: "archived" } });
    await db.project.create({ data: { workspaceId: workspace.id, name: "Existing project", status: "archived" } });
    await db.task.create({ data: { workspaceId: workspace.id, title: "Existing task" } });
    await db.apiKey.create({ data: { workspaceId: workspace.id, name: "Revoked fixture key", keyHash: "fixture-key-hash", keyPrefix: "fixture", active: false, scopes: ["workspace.read"] } });
    const before = await snapshot();
    assert.equal(await bootstrapInstallation(db, { SEED_OWNER_EMAIL: "different@example.com", SEED_OWNER_PASSWORD: "different-password", SEED_WORKSPACE_NAME: "Different company" }), "skipped");
    assert.equal(await bootstrapInstallation(db), "skipped");
    assert.equal(await snapshot(), before, "Every existing database row must remain identical after redeploy bootstrap");

    await clear();
    await db.user.create({ data: { email: "orphan@example.com", passwordHash: "fixture" } });
    const userOnly = await snapshot();
    assert.equal(await bootstrapInstallation(db), "skipped");
    assert.equal(await snapshot(), userOnly, "An existing user without a workspace must also block bootstrap");

    await clear();
    await db.$executeRawUnsafe(`CREATE FUNCTION bootstrap_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'bootstrap fixture failure'; END; $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER bootstrap_test_fail BEFORE INSERT ON workspace_departments FOR EACH ROW EXECUTE FUNCTION bootstrap_test_fail()`);
    try {
      await assert.rejects(bootstrapInstallation(db));
      assert.equal(await db.user.count(), 0);
      assert.equal(await db.workspace.count(), 0);
      assert.equal(await db.workspaceMembership.count(), 0);
      assert.equal(await db.workspaceDepartment.count(), 0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER bootstrap_test_fail ON workspace_departments`);
      await db.$executeRawUnsafe(`DROP FUNCTION bootstrap_test_fail()`);
    }
    assert.equal(await bootstrapInstallation(db), "created", "Bootstrap can retry after a rolled-back installation");
  } finally {
    await db.$disconnect();
  }
});
