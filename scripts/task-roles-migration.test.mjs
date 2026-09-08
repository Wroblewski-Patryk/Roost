import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("role migrations preserve legacy business data and invalidate old Ready", () => {
  // A fresh disposable database in the local Compose postgres service only.
  const database = `companycore_test_roles_${randomUUID().replaceAll("-", "")}`;
  const docker = args => execFileSync("docker", ["compose", "exec", "-T", "postgres", ...args], { windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = input => execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database], { input, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migrations = readdirSync("prisma/migrations").filter(x => /^\d/.test(x)).sort();
    const source = name => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    sql(migrations.filter(x => x < "20260908040000").map(source).join("\n"));
    sql(`INSERT INTO users (id,email,password_hash,updated_at) VALUES ('00000000-0000-4000-8000-000000000001','migration@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces (id,name,owner_user_id,updated_at) VALUES ('00000000-0000-4000-8000-000000000002','Migration fixture','00000000-0000-4000-8000-000000000001',now());
      -- Seed an old accepted snapshot only in this newly created test database.
      SET session_replication_role = replica;
      INSERT INTO tasks (id,workspace_id,title,description,status,execution_readiness,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Keep this task','Keep this description','in_progress','{"status":"ready","pinId":"legacy-pin","contract":{"legacy":"retained"}}',now());
      SET session_replication_role = origin;`);
    sql(migrations.filter(x => x >= "20260908040000" && x <= "20260908040200_role_source_edits").map(source).join("\n"));
    const result = JSON.parse(sql(`SELECT json_build_object('title',title,'description',description,'status',status,'readiness',execution_readiness,'provenance',execution_role_provenance) FROM tasks WHERE id='00000000-0000-4000-8000-000000000003';`).trim());
    assert.equal(result.title, "Keep this task"); assert.equal(result.description, "Keep this description"); assert.equal(result.status, "in_progress");
    assert.equal(result.readiness.status, "needs_revalidation"); assert.equal(result.readiness.reason, "task_roles_required");
    assert.deepEqual(result.readiness.contract, { legacy: "retained" }); assert.equal(result.provenance, null);
    assert.equal(sql("SELECT count(*) FROM events WHERE payload->>'reason'='task_roles_required';").trim(), "1");
    assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='workspace_memberships'::regclass AND tgname IN ('ready_source_fence','ready_source_changed') AND tgenabled='O';").trim(), "2");
    assert.equal(sql("SELECT count(*) FROM users WHERE email='migration@example.test';").trim(), "1");
  } finally {
    if (!/^companycore_test_roles_[a-f0-9]{32}$/.test(database)) throw new Error("Unsafe fixture database name");
    docker(["dropdb", "-U", "companycore", database]);
  }
});
