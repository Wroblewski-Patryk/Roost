import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { taskInterviewSourceCatalogQuery } from "../modules/agent-runtime/task-interview-source-catalog";

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

test("PostgreSQL: bounded interview catalogue prioritizes own app without foreign/archive leaks and preserves native revisions", () => {
  const database = `companycore_test_interview_${randomUUID().replaceAll("-", "")}`;
  const args = ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database];
  const sql = (input: string) => execFileSync("docker", args, { input, windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
  let created = false;
  execFileSync("docker", ["compose", "exec", "-T", "postgres", "createdb", "-U", "companycore", database], { windowsHide: true }); created = true;
  try {
    sql(readdirSync("prisma/migrations").filter(name => /^\d/.test(name)).sort().map(name => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8")).join("\n"));
    const owner = randomUUID(), workspace = randomUUID(), otherWorkspace = randomUUID(), app = randomUUID(), otherApp = randomUUID();
    const ownIds = [1, 2, 3, 4].map(n => `ffffffff-ffff-4fff-8fff-${String(n).padStart(12, "0")}`);
    const foreignId = "eeeeeeee-eeee-4eee-8eee-000000000001", archivedId = "dddddddd-dddd-4ddd-8ddd-000000000001", otherWorkspaceId = "cccccccc-cccc-4ccc-8ccc-000000000001";
    // Inert source fixture only; production catalogue and revision function run
    // in origin with their real workspace/application/archive predicates.
    sql(`BEGIN; SET LOCAL session_replication_role=replica;
      INSERT INTO users(id,email,password_hash,updated_at) VALUES(${quote(owner)},'catalog-owner@example.test','synthetic-no-login',now());
      INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${quote(workspace)},'Synthetic catalogue',${quote(owner)},now()),(${quote(otherWorkspace)},'Other fixture workspace',${quote(owner)},now());
      INSERT INTO applications(id,workspace_id,name,slug,updated_at) VALUES(${quote(app)},${quote(workspace)},'Own fixture app','own-fixture',now()),(${quote(otherApp)},${quote(workspace)},'Other fixture app','other-fixture',now());
      INSERT INTO company_records(id,workspace_id,record_type,key,title,updated_at)
        SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,${quote(workspace)},'company_context','shared-'||n,'Shared source '||n,now() FROM generate_series(1,110) n;
      ${ownIds.map((id, i) => `INSERT INTO company_records(id,workspace_id,application_id,record_type,key,title,description,acceptance_criteria,metadata,updated_at) VALUES(${quote(id)},${quote(workspace)},${quote(app)},'product_requirement','own-${i}','Own requirement ${i}','Own full context ${i}','["Acceptance criterion"]'::jsonb,'{"fixture":"owned"}'::jsonb,now());`).join("\n")}
      INSERT INTO company_records(id,workspace_id,application_id,record_type,key,title,status,updated_at) VALUES
        (${quote(foreignId)},${quote(workspace)},${quote(otherApp)},'product_requirement','foreign-app','Foreign application','active',now()),
        (${quote(archivedId)},${quote(workspace)},${quote(app)},'product_requirement','archived-own','Archived own','archived',now()),
        (${quote(otherWorkspaceId)},${quote(otherWorkspace)},NULL,'company_context','foreign-workspace','Foreign workspace','active',now());
      COMMIT;`);
    const query = taskInterviewSourceCatalogQuery(workspace, app);
    const catalog = () => sql(`PREPARE catalogue(uuid,uuid,uuid) AS ${query.text}; EXECUTE catalogue(${query.values.map(value => quote(String(value))).join(",")});`).trim().split("\n").map(line => JSON.parse(line));
    const rows = catalog(), visible = rows.slice(0, 100);
    assert.equal(rows.length, 101, "One detection row retains the original truncation budget");
    assert.equal(visible.length, 100);
    assert.deepEqual(visible.slice(0, 4).map(row => row.id), ownIds);
    assert.equal(visible.filter(row => ownIds.includes(row.id)).length, 4);
    assert.ok(rows.every(row => ![foreignId, archivedId, otherWorkspaceId].includes(row.id)));
    for (const id of ownIds) {
      const native = JSON.parse(sql(`SELECT task_interview_record(${quote(id)}::uuid);`).trim());
      assert.deepEqual(visible.find(row => row.id === id), native, "Catalogue returns the full native record and exact revision");
      assert.match(native.revision, /^[a-f0-9]{64}$/);
    }
    const before = visible[0].revision;
    sql(`UPDATE company_records SET description='Changed source evidence',updated_at=now() WHERE id=${quote(ownIds[0])};`);
    const after = catalog()[0];
    assert.notEqual(after.revision, before, "Source edits invalidate the native revision");
    assert.equal(after.revision, JSON.parse(sql(`SELECT task_interview_record(${quote(ownIds[0])}::uuid);`).trim()).revision);
    assert.equal(sql("SHOW session_replication_role;").trim(), "origin");
  } finally {
    if (!/^companycore_test_interview_[a-f0-9]{32}$/.test(database)) throw new Error("Unsafe fixture database cleanup");
    if (created) execFileSync("docker", ["compose", "exec", "-T", "postgres", "dropdb", "-U", "companycore", "--if-exists", database], { windowsHide: true });
  }
});
