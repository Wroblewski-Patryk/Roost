import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

test("Finding migration preserves existing business data and installs fail-closed ledgers", () => {
  const database = `companycore_test_findings_${randomUUID().replaceAll("-", "")}`;
  const docker = args => execFileSync("docker", ["compose", "exec", "-T", "postgres", ...args], { windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = input => execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database], { input, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio:["pipe","pipe","pipe"] });
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migrations = readdirSync("prisma/migrations").filter(name => /^\d/.test(name)).sort();
    const source = name => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    sql(migrations.filter(name => name < "20260909100000").map(source).join("\n"));
    sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES ('00000000-0000-4000-8000-000000000001','finding-fixture@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES ('00000000-0000-4000-8000-000000000002','Finding fixture','00000000-0000-4000-8000-000000000001',now());
      INSERT INTO tasks(id,workspace_id,title,description,updated_at) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Existing task','Keep original content',now());
      INSERT INTO api_keys(id,workspace_id,name,key_hash,key_prefix,scopes,updated_at) VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','Fixture integration','synthetic-digest','fixture_prefix','["tasks:read"]',now());`);
    const snapshot=()=>sql("SELECT (to_jsonb(u)-'preferred_language')::text FROM users u; SELECT (to_jsonb(w)-'canonical_language')::text FROM workspaces w; SELECT to_jsonb(t)::text FROM tasks t; SELECT to_jsonb(k)::text FROM api_keys k;");
    const before=snapshot();
    try { sql(migrations.filter(name=>name >= "20260909100000").map(source).join("\n")); }
    catch(error) { throw new Error(String(error.stderr ?? error.message)); }
    assert.equal(snapshot(),before);
    assert.equal(sql("SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='task_capability_grants'::regclass AND pg_get_constraintdef(oid) LIKE '%valid_until > valid_from%');").trim(),"t");
    assert.equal(sql("SELECT count(*) FROM finding_versions; SELECT count(*) FROM finding_journal; SELECT count(*) FROM finding_outputs;").trim(),"0\n0\n0");
    assert.equal(sql("SELECT finding_transition('observed','convert_task') IS NULL; SELECT finding_task_current('00000000-0000-4000-8000-000000000003');").trim(),"t\nt");
  } finally {
    if(!/^companycore_test_findings_[a-f0-9]{32}$/.test(database))throw new Error("Unsafe fixture database name");
    docker(["dropdb","-U","companycore",database]);
  }
});
