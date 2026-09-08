import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("task grant migration preserves credentials, existing review and business data", () => {
  const database = `companycore_test_grants_${randomUUID().replaceAll("-", "")}`;
  const docker = args => execFileSync("docker", ["compose", "exec", "-T", "postgres", ...args], { windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = input => execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database], { input, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migrations = readdirSync("prisma/migrations").filter(x => /^\d/.test(x)).sort();
    const source = name => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    sql(migrations.filter(x => x < "20260908070000").map(source).join("\n"));
    sql(`INSERT INTO users (id,email,password_hash,updated_at) VALUES ('00000000-0000-4000-8000-000000000001','migration-review@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces (id,name,owner_user_id,updated_at) VALUES ('00000000-0000-4000-8000-000000000002','Migration fixture','00000000-0000-4000-8000-000000000001',now());
      INSERT INTO applications (id,workspace_id,name,slug,updated_at) VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','Fixture app','fixture-app',now());
      INSERT INTO tasks (id,workspace_id,title,description,status,updated_at) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Keep this task','Keep this description','in_progress',now());
      INSERT INTO agent_executions (id,workspace_id,task_id,application_id,requested_by_type,status,summary,completed_at,updated_at) VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','user','completed','Keep this result',now(),now());`);

    sql(`INSERT INTO api_keys(id,workspace_id,name,key_hash,key_prefix,scopes,updated_at) VALUES ('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000002','Existing integration','synthetic-noncredential-digest','fixture_prefix','["tasks:read"]',now());
      ALTER TABLE task_review_decisions DISABLE TRIGGER USER;
      INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_user_id,verifier_id,manager_id,decision,evidence,snapshot) VALUES
      ('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000008','fixture-request','fixture-material','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000010','approve','{"summary":"Existing human evidence"}','{"fixture":"Existing history"}');
      ALTER TABLE task_review_decisions ENABLE TRIGGER USER;`);
    sql(`INSERT INTO workforce_entities(id,workspace_id,name,slug,type,role,updated_at) VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','Existing agent','existing-agent','agent','reviewer',now());
      INSERT INTO api_keys(id,workspace_id,bound_agent_id,name,key_hash,key_prefix,expires_at,scopes,updated_at) VALUES ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000011','Existing bound key','synthetic-bound-digest','fixture_bound',now()+interval '1 day','["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write"]',now());
      INSERT INTO agent_executions(id,workspace_id,task_id,application_id,requested_by_type,status,summary,completed_at,updated_at) VALUES ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','user','completed','Existing agent material',now(),now());
      ALTER TABLE task_review_decisions DISABLE TRIGGER USER;
      INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_agent_id,actor_credential_id,actor_credential_prefix,verifier_id,manager_id,decision,evidence,snapshot) VALUES
      ('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000015','existing-agent-request','existing-agent-material','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','fixture_bound','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010','approve','{"summary":"Existing agent evidence"}','{"fixture":"Existing agent history"}');
      ALTER TABLE task_review_decisions ENABLE TRIGGER USER;`);
    const snapshot = () => sql("SELECT to_jsonb(t)::text FROM tasks t; SELECT to_jsonb(e)::text FROM agent_executions e; SELECT to_jsonb(k)::text FROM api_keys k; SELECT (to_jsonb(d)-'capability_grant_id')::text FROM task_review_decisions d;").trim();
    const before = snapshot();
    sql(migrations.filter(x => x >= "20260908070000").map(source).join("\n"));
    assert.equal(snapshot(), before);
    assert.equal(sql("SELECT count(*) FROM api_keys WHERE bound_agent_id IS NOT NULL;").trim(), "1");
    assert.equal(sql("SELECT count(*) FROM task_capability_grants; SELECT count(*) FROM task_capability_uses; SELECT count(*) FROM task_capability_revocations;").trim(), "0\n0\n0");
    assert.equal(sql("SELECT actor_user_id FROM task_review_decisions WHERE actor_user_id IS NOT NULL;").trim(), "00000000-0000-4000-8000-000000000001");
    assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='O' AND tgname IN ('agent_credential_guard','agent_identity_credentials_guard','agent_credential_operation_guard');").trim(), "3");
  } finally {
    if (!/^companycore_test_grants_[a-f0-9]{32}$/.test(database)) throw new Error("Unsafe fixture database name");
    docker(["dropdb", "-U", "companycore", database]);
  }
});
