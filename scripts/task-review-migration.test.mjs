import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("native review migrations preserve existing task/result data without invented decisions", () => {
  const database = `companycore_test_review_${randomUUID().replaceAll("-", "")}`;
  const docker = args => execFileSync("docker", ["compose", "exec", "-T", "postgres", ...args], { windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = input => execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database], { input, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migrations = readdirSync("prisma/migrations").filter(x => /^\d/.test(x)).sort();
    const source = name => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    sql(migrations.filter(x => x < "20260908050000").map(source).join("\n"));
    sql(`INSERT INTO users (id,email,password_hash,updated_at) VALUES ('00000000-0000-4000-8000-000000000001','migration-review@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces (id,name,owner_user_id,updated_at) VALUES ('00000000-0000-4000-8000-000000000002','Migration fixture','00000000-0000-4000-8000-000000000001',now());
      INSERT INTO applications (id,workspace_id,name,slug,updated_at) VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','Fixture app','fixture-app',now());
      INSERT INTO tasks (id,workspace_id,title,description,status,updated_at) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Keep this task','Keep this description','in_progress',now());
      INSERT INTO agent_executions (id,workspace_id,task_id,application_id,requested_by_type,status,summary,completed_at,updated_at) VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','user','completed','Keep this result',now(),now());`);
    const snapshot = () => sql("SELECT to_jsonb(t)::text FROM tasks t; SELECT to_jsonb(e)::text FROM agent_executions e;").trim();
    const before = snapshot();
    sql(migrations.filter(x => x >= "20260908050000" && x <= "20260908050300_review_material_version").map(source).join("\n"));
    assert.equal(snapshot(), before);
    assert.equal(sql("SELECT count(*) FROM task_review_decisions;").trim(), "0");
    assert.equal(sql("SELECT count(*) FROM task_review_actions;").trim(), "0");
    assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='O' AND tgname IN ('task_review_guard','task_review_result_guard','task_review_ready_guard','task_review_dependency_guard','task_review_version_guard');").trim(), "6");
  } finally {
    if (!/^companycore_test_review_[a-f0-9]{32}$/.test(database)) throw new Error("Unsafe fixture database name");
    docker(["dropdb", "-U", "companycore", database]);
  }
});
