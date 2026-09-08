import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { bootstrapInstallation } from "../bootstrap/installation";
import { hashPassword } from "../auth/password";

test("the public migration distribution preserves an already-installed database", async () => {
  const url = process.env.PRIVACY_TEST_DATABASE_URL;
  const legacySchema = process.env.PRIVACY_TEST_LEGACY_SCHEMA;
  assert.ok(url && legacySchema, "Provide a disposable PRIVACY_TEST_DATABASE_URL and the archived PRIVACY_TEST_LEGACY_SCHEMA");
  const parsed = new URL(url);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname));
  assert.equal(parsed.pathname, "/companycore_test_privacy_upgrade");
  assert.equal(parsed.searchParams.get("schema") ?? "public", "public");
  const db = new PrismaClient({ datasources: { db: { url } } });
  function migrate(schema: string) {
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", schema], {
      env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test", COMPANYCORE_SKIP_DOTENV: "1" },
      encoding: "utf8", windowsHide: true
    });
    assert.equal(result.status, 0, "Migration deploy must succeed without resetting the database");
  }
  try {
    const [empty] = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM pg_tables WHERE schemaname = 'public'`;
    assert.equal(empty.count, 0n, "Use a newly created disposable test database");
    migrate(legacySchema);
    const owner = await db.user.create({ data: { email: "existing-owner@example.com", name: "Existing owner", passwordHash: await hashPassword("existing-unique-password") } });
    const workspace = await db.workspace.create({ data: { name: "Existing company", ownerUserId: owner.id, memberships: { create: { userId: owner.id, role: "owner" } } } });
    const application = await db.application.create({ data: { workspaceId: workspace.id, name: "Existing private application", slug: "existing-application", frontendUrl: "https://existing.example.com", metadata: { deploymentProvider: "coolify", privateConfiguration: "preserve" } } });
    await db.applicationRepository.create({ data: { applicationId: application.id, name: "Existing repository", url: "https://github.com/example/existing.git", isPrimary: true } });
    const project = await db.project.create({ data: { workspaceId: workspace.id, name: "Existing project", status: "archived" } });
    await db.task.create({ data: { workspaceId: workspace.id, projectId: project.id, title: "Existing task" } });
    await db.apiKey.create({ data: { workspaceId: workspace.id, name: "Existing revoked key", keyHash: "fixture-existing-hash", active: false, scopes: ["workspace.read"] } });
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    async function snapshot() {
      const digest = createHash("sha256");
      for (const { tablename } of tables) {
        assert.match(tablename, /^[a-z_]+$/);
        const rows = await db.$queryRawUnsafe(`SELECT to_jsonb(t)::text AS row FROM "${tablename}" t ORDER BY to_jsonb(t)::text`);
        digest.update(tablename + JSON.stringify(rows));
      }
      return digest.digest("hex");
    }
    const migrationName = "20260830120000_codex_agent_runtime";
    const oldSql = fs.readFileSync(path.join(path.dirname(legacySchema), "migrations", migrationName, "migration.sql"));
    const newSql = fs.readFileSync(path.join("prisma", "migrations", migrationName, "migration.sql"));
    assert.notEqual(createHash("sha256").update(oldSql).digest("hex"), createHash("sha256").update(newSql).digest("hex"));
    const before = await snapshot();
    migrate("prisma/schema.prisma");
    assert.equal(await bootstrapInstallation(db), "skipped");
    assert.equal(await snapshot(), before, "Every database row, including original migration checksums, must remain unchanged");
  } finally {
    await db.$disconnect();
  }
});
