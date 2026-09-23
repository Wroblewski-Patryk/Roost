// Real PostgreSQL migration/CAS test, never starts Docker or connects to a VPS.
// Synthetic prehistory bypasses old governance triggers during setup only; this
// suite qualifies ticket persistence, NOT the Ready/decision HTTP happy path.
import test from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const run = promisify(execFile);
test("owner ticket PostgreSQL migration, CAS, rollback, restore denial and rotation", async t => {
  try { execFileSync("docker", ["info", "--format", "{{.ServerVersion}}"], { windowsHide: true, stdio: "pipe", timeout: 10000 }); }
  catch { t.skip("Docker Engine unavailable; no PostgreSQL qualification performed"); return; }
  const database = `companycore_test_owner_ticket_${randomUUID().replaceAll("-", "")}`;
  const prefix = ["compose", "exec", "-T", "postgres"];
  const docker = args => execFileSync("docker", [...prefix, ...args], { windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000 });
  const args = [...prefix, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database];
  const sql = input => execFileSync("docker", args, { input, windowsHide: true, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 60000 });
  docker(["createdb", "-U", "companycore", database]);
  try {
    const migration = "20260923090000_trusted_provider_owner_tickets";
    const all = readdirSync("prisma/migrations").filter(x => /^\d/.test(x)).sort();
    sql(all.filter(x => x < migration).map(x => readFileSync(`prisma/migrations/${x}/migration.sql`, "utf8")).join("\n"));
    const u = randomUUID(), w = randomUUID(), app = randomUUID(), install = randomUUID();
    const fixtures = Array.from({ length: 3 }, () => ({ task: randomUUID(), execution: randomUUID(), decision: randomUUID(), preview: randomUUID(), ticket: randomUUID() }));
    // This private disposable DB has no user/company data. Replica mode is
    // scoped to this setup connection; ticket guards are installed afterward.
    sql(`SET session_replication_role=replica;
      INSERT INTO users(id,email,password_hash,updated_at) VALUES('${u}','ticket-fixture@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES('${w}','Ticket fixture','${u}',now());
      INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES('${randomUUID()}','${w}','${u}','owner',now());
      INSERT INTO applications(id,workspace_id,name,slug,updated_at) VALUES('${app}','${w}','Ticket fixture','ticket-fixture',now());
      ${fixtures.map(f => `
        INSERT INTO tasks(id,workspace_id,title,updated_at) VALUES('${f.task}','${w}','Synthetic ticket task',now());
        INSERT INTO agent_executions(id,workspace_id,task_id,application_id,requested_by_type,status,attempt,updated_at)
          VALUES('${f.execution}','${w}','${f.task}','${app}','user','claimed',1,now());
        INSERT INTO decisions(id,workspace_id,title,status,updated_at) VALUES('${f.decision}','${w}','Synthetic acceptance','accepted',now());
        INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
          VALUES('${f.decision}','${w}',1,'{"scope":[{"type":"task","id":"${f.task}"}]}','${u}','${randomUUID()}','fixture');
        INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
          VALUES('${f.preview}','${f.decision}','${w}',1,'{}','${u}','${randomUUID()}','fixture');
        INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash)
          VALUES('${randomUUID()}','${f.decision}','${w}','${f.preview}','${u}','${randomUUID()}','fixture');`).join("\n")}
      SET session_replication_role=origin;`);
    const snapshot = () => sql("SELECT to_jsonb(u)::text FROM users u; SELECT to_jsonb(w)::text FROM workspaces w; SELECT to_jsonb(t)::text FROM tasks t ORDER BY id; SELECT to_jsonb(e)::text FROM agent_executions e ORDER BY id;");
    const before = snapshot();
    sql(readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    assert.equal(snapshot(), before);
    assert.equal(sql("SELECT count(*) FROM trusted_provider_tickets; SELECT count(*) FROM trusted_provider_ticket_keys;").trim(), "0\n0");
    sql(`INSERT INTO trusted_provider_ticket_keys VALUES('${w}','${install}','test-1',1,repeat('a',64));`);
    for (const [i, f] of fixtures.entries()) sql(`INSERT INTO trusted_provider_tickets
      (id,workspace_id,installation_id,task_id,execution_id,attempt,decision_id,decision_revision,owner_id,key_id,key_epoch,digest,nonce_digest,acceptance_digest,context_digest,claim_digest,challenge,issued_at,not_before,expires_at,state,version)
      VALUES('${f.ticket}','${w}','${install}','${f.task}','${f.execution}',1,'${f.decision}',1,'${u}','test-1',1,
       repeat('${i + 1}',64),repeat('${i + 4}',64),repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),now(),now(),now()+interval '60 seconds','issued',1);`);
    const f = fixtures[0];
    const consume = `BEGIN; UPDATE trusted_provider_tickets SET state='consumed',version=version+1,consume_id=gen_random_uuid(),consumed_at=clock_timestamp()
      WHERE id='${f.ticket}' AND state='issued' AND version=1 RETURNING id; COMMIT;`;
    const results = await Promise.all(Array.from({ length: 8 }, () => run("docker", [...args, "-c", consume], { windowsHide: true, timeout: 30000 })));
    assert.equal(results.filter(r => r.stdout.includes(f.ticket)).length, 1);
    assert.equal(sql(`SELECT count(*) FROM trusted_provider_ticket_journal WHERE ticket_id='${f.ticket}';`).trim(), "2");
    assert.equal(sql(consume).trim(), "");
    assert.throws(() => sql(`UPDATE trusted_provider_tickets SET state='issued',version=1,consume_id=NULL,consumed_at=NULL WHERE id='${f.ticket}';`));
    assert.throws(() => sql(`DELETE FROM trusted_provider_tickets WHERE id='${f.ticket}';`));
    assert.throws(() => sql(`DELETE FROM trusted_provider_ticket_journal WHERE ticket_id='${f.ticket}';`));
    const g = fixtures[1];
    assert.throws(() => sql(`BEGIN; UPDATE trusted_provider_tickets SET state='consumed',version=2,consume_id=gen_random_uuid(),consumed_at=now() WHERE id='${g.ticket}'; SELECT 1/0; COMMIT;`));
    assert.equal(sql(`SELECT state FROM trusted_provider_tickets WHERE id='${g.ticket}'; SELECT count(*) FROM trusted_provider_ticket_journal WHERE ticket_id='${g.ticket}';`).trim(), "issued\n1");
    sql(`UPDATE trusted_provider_ticket_keys SET key_id='test-2',epoch=2,public_key_digest=repeat('e',64) WHERE workspace_id='${w}';`);
    assert.equal(sql("SELECT state,count(*) FROM trusted_provider_tickets GROUP BY state ORDER BY state;").trim(), "consumed|1\nrevoked|2");
    assert.throws(() => sql(`UPDATE trusted_provider_ticket_keys SET key_id='test-1',epoch=1,public_key_digest=repeat('a',64) WHERE workspace_id='${w}';`));
  } finally {
    if (!/^companycore_test_owner_ticket_[a-f0-9]{32}$/.test(database)) throw Error("Unsafe test database");
    docker(["dropdb", "-U", "companycore", database]);
  }
});
