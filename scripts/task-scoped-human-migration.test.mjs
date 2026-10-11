import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("G16a migration preserves populated tasks, memberships and invitations", () => {
  const database = `companycore_test_people_${randomUUID().replaceAll("-", "")}`;
  const docker = (args) => execFileSync("docker", ["compose", "exec", "-T", "postgres", ...args], {
    windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"]
  });
  const sql = (input) => execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database], {
    input, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024
  }).trim();
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migrations = readdirSync("prisma/migrations").filter((name) => /^\d/.test(name)).sort();
    const g16a = "20261011210000_g16a_scoped_human_task_access";
    const source = (name) => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    sql(migrations.filter((name) => name < g16a).map(source).join("\n"));
    sql(`INSERT INTO users (id,email,password_hash,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000001','owner@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces (id,name,owner_user_id,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000002','Existing workspace','00000000-0000-4000-8000-000000000001',now());
      INSERT INTO workspace_memberships (id,workspace_id,user_id,role,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','owner',now());
      INSERT INTO tasks (id,workspace_id,title,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','Preserved task',now());
      INSERT INTO workspace_invitations (id,workspace_id,email,role,token_hash,invited_by_user_id,expires_at,updated_at) VALUES
      ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','legacy@example.test','member','synthetic-digest','00000000-0000-4000-8000-000000000001',now()+interval '7 days',now());`);
    const before = sql(`SELECT title FROM tasks WHERE id='00000000-0000-4000-8000-000000000004';
      SELECT role FROM workspace_memberships WHERE id='00000000-0000-4000-8000-000000000003';
      SELECT email,status FROM workspace_invitations WHERE id='00000000-0000-4000-8000-000000000005';`);
    sql(source(g16a));
    const after = sql(`SELECT title FROM tasks WHERE id='00000000-0000-4000-8000-000000000004';
      SELECT role FROM workspace_memberships WHERE id='00000000-0000-4000-8000-000000000003';
      SELECT email,status FROM workspace_invitations WHERE id='00000000-0000-4000-8000-000000000005';`);
    assert.equal(after, before);
    assert.equal(sql("SELECT count(*) FROM workspace_memberships WHERE task_scope_id IS NOT NULL; SELECT count(*) FROM workspace_invitations WHERE task_scope_id IS NOT NULL;"), "0\n0");
    assert.equal(sql("SELECT count(*) FROM pg_constraint WHERE conname IN ('workspace_invitations_task_scope_fkey','workspace_memberships_task_scope_fkey','workspace_invitations_task_scope_role_check','workspace_memberships_task_scope_role_check');"), "4");
    assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('workspace_invitation_scope_immutable','workspace_membership_scope_immutable');"), "2");
  } finally {
    if (!/^companycore_test_people_[a-f0-9]{32}$/.test(database)) throw new Error("Unsafe disposable database name");
    docker(["dropdb", "-U", "companycore", database]);
  }
});
