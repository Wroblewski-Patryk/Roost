import assert from "node:assert/strict";
import test from "node:test";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { releaseDigest } from "../modules/agent-runtime/governed-release-contract";
const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
test("governed release additive migration preserves data and enforces immutable serialized journal in PostgreSQL",async()=>{
 const database=`companycore_test_release_${randomUUID().replaceAll("-","")}`;
 const args=["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database];
 const sql=(input:string)=>execFileSync("docker",args,{input,windowsHide:true,encoding:"utf8",maxBuffer:16*1024*1024});
 execFileSync("docker",["compose","exec","-T","postgres","createdb","-U","companycore",database],{windowsHide:true});
 try {
  const migration="20261001010000_governed_release";
  const names=readdirSync("prisma/migrations").filter(n=>/^\d/.test(n)&&n<=migration).sort();
  const source=(name:string)=>readFileSync(`prisma/migrations/${name}/migration.sql`,"utf8");
  sql(names.filter(n=>n<migration).map(source).join("\n"));
  const commit="a".repeat(40),base="b".repeat(40),hash="e".repeat(64);
  const contract={assignment:{agentId:id(5)},nativeBoundary:{profile:"inspect-readonly"},taskRoles:{releaser:{id:id(7),revision:"2026-10-01T12:00:00.000Z"}}};
  const codeMetadata={executionContract:{...contract,nativeBoundary:{profile:"coding-local"}},resultRevision:{commit,branch:"codex/task",workingTree:"clean"}};
  const readinessMetadata={executionContract:{...contract,assignment:{agentId:id(7)}},resultRevision:{commit,workingTree:"clean"}};
  sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES (${q(id(1))},'release-fixture@example.test','synthetic-no-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES (${q(id(2))},'Release fixture',${q(id(1))},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES (${q(id(20))},${q(id(2))},${q(id(1))},'owner',now()) ON CONFLICT DO NOTHING;
   INSERT INTO applications(id,workspace_id,name,slug,metadata,updated_at) VALUES (${q(id(3))},${q(id(2))},'Certification fixture','release-fixture','{"releasePurpose":"temporary_certification"}',now());
   INSERT INTO tasks(id,workspace_id,title,status,updated_at) VALUES (${q(id(4))},${q(id(2))},'Preserved candidate','in_progress',now());
   INSERT INTO workforce_entities(id,workspace_id,name,slug,type,role,updated_at) VALUES
    (${q(id(5))},${q(id(2))},'Coder','release-coder','agent','coder',now()),
    (${q(id(6))},${q(id(2))},'Verifier','release-verifier','agent','verifier',now()),
    (${q(id(7))},${q(id(2))},'Releaser','release-releaser','agent','releaser',now());
   INSERT INTO agent_hosts(id,workspace_id,name,slug,platform,updated_at) VALUES (${q(id(8))},${q(id(2))},'Fixture host','release-host','windows',now());
   ALTER TABLE agent_executions DISABLE TRIGGER USER;
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,requested_by_type,status,summary,completed_at,metadata,updated_at) VALUES
    (${q(id(9))},${q(id(2))},${q(id(4))},${q(id(3))},${q(id(8))},'user','completed','Preserved candidate',now(),${json(codeMetadata)},now()),
    (${q(id(10))},${q(id(2))},${q(id(4))},${q(id(3))},${q(id(8))},'user','completed','Preserved readiness',now(),${json(readinessMetadata)},now());
   UPDATE agent_executions SET verification=${json({readOnlyAudit:{verdict:"verified",nativeTools:[],preTree:hash,postTree:hash},managedAdmission:{qualification:"signed_native_v1"},ownedTreeReceipt:{cleanup:true,activeProcesses:0}})} WHERE id=${q(id(10))};
   ALTER TABLE agent_executions ENABLE TRIGGER USER;
   ALTER TABLE task_review_decisions DISABLE TRIGGER USER;
   INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_user_id,verifier_id,manager_id,decision,evidence,snapshot) SELECT
    ${q(id(11))},${q(id(2))},${q(id(4))},${q(id(9))},${q(id(12))},'fixture-review',encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex'),${q(id(1))},${q(id(6))},${q(id(7))},'approve',${json({reviewedCommit:commit})},'{}' FROM agent_executions e WHERE e.id=${q(id(9))};
   ALTER TABLE task_review_decisions ENABLE TRIGGER USER;`);
  const preserved=()=>sql(`SELECT to_jsonb(t)::text FROM tasks t; SELECT to_jsonb(e)::text FROM agent_executions e ORDER BY id; SELECT to_jsonb(d)::text FROM task_review_decisions d; SELECT to_jsonb(a)::text FROM applications a;`);
  const before=preserved();sql(source(migration));assert.equal(preserved(),before);
  assert.equal(sql("SELECT count(*) FROM governed_releases; SELECT count(*) FROM governed_release_operations; SELECT count(*) FROM governed_release_outcomes;").trim(),"0\n0\n0");
  // This new profile is admitted; the preexisting review profile stays valid.
  sql(`INSERT INTO api_keys(id,workspace_id,bound_agent_id,name,key_hash,key_prefix,expires_at,scopes,updated_at) VALUES
   (${q(id(13))},${q(id(2))},${q(id(7))},'Release key','synthetic-release-digest','fixture_release',now()+interval '1 hour','["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write","agent-runtime:release"]',now()),
   (${q(id(14))},${q(id(2))},${q(id(6))},'Review key','synthetic-review-digest','fixture_review',now()+interval '1 hour','["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write"]',now());`);
  const material=sql(`SELECT material_version FROM task_review_decisions WHERE id=${q(id(11))}`).trim();
  const snapshot={commit,baseCommit:base,materialVersion:material};
  const insert=(releaseId:string,snap:any)=>`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash) VALUES (${q(releaseId)},${q(id(2))},${q(id(4))},${q(id(3))},${q(id(8))},${q(id(10))},${q(id(11))},${q(id(7))},${q(id(13))},1,${q(id(1))},now()+interval '30 minutes',${q(hash)},${q(hash)},${json(snap)},${q(randomUUID())},'fixture');`;
  assert.throws(()=>sql(insert(id(15),{...snapshot,commit:base})),/governed_release_scope_invalid/);
  assert.throws(()=>sql(insert(id(15),{...snapshot,materialVersion:hash})),/governed_release_scope_invalid/);
  sql(insert(id(15),snapshot));assert.throws(()=>sql(insert(id(16),snapshot)),/governed_release_application_busy/);
  assert.throws(()=>sql(`UPDATE governed_releases SET expires_at=now()+interval '1 day' WHERE id=${q(id(15))};`),/governed_release_append_only/);
  assert.throws(()=>sql(`DELETE FROM governed_releases WHERE id=${q(id(15))};`),/governed_release_append_only/);
  const op=(n:number)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash) VALUES (${q(id(n))},${q(id(15))},${q(id(2))},${q(id(3))},${n-29},'push',${json({commit,manifestDigest:hash})},${q(randomUUID())},'fixture');`;
  const run=promisify(execFile);
  const racing=await Promise.allSettled([run("docker",[...args,"-c",op(30)],{windowsHide:true}),run("docker",[...args,"-c",op(31)],{windowsHide:true})]);
  assert.equal(racing.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(racing.filter(r=>r.status==="rejected").length,1);
  const operationId=sql("SELECT id FROM governed_release_operations LIMIT 1").trim();
  assert.throws(()=>sql(`DELETE FROM governed_release_operations WHERE id=${q(operationId)}`),/governed_release_append_only/);
  const outcome=(status:string,reconciledStatus:string|null=null)=>`INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash) VALUES (${q(randomUUID())},${q(id(15))},${q(operationId)},${q(id(2))},${q(status)},${reconciledStatus?q(reconciledStatus):"NULL"},${status==="reconciled"},'{}',${q(randomUUID())},'fixture');`;
  sql(outcome("uncertain"));assert.throws(()=>sql(op(32)),/governed_release_operation_unresolved/);
  assert.throws(()=>sql(outcome("succeeded")),/governed_release_outcome_invalid/);
  sql(outcome("reconciled","absent"));sql(op(32));
  assert.throws(()=>sql("UPDATE governed_release_outcomes SET status='succeeded'"),/governed_release_append_only/);
  assert.equal(preserved(),before);
  // A later altered completion cannot obtain authority from the earlier approved status.
  sql(`INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash) VALUES (${q(randomUUID())},${q(id(15))},${q(id(2))},${q(id(1))},'Fixture revoked',${q(randomUUID())},'fixture');
   ALTER TABLE agent_executions DISABLE TRIGGER USER;UPDATE agent_executions SET summary='Changed completion' WHERE id=${q(id(9))};ALTER TABLE agent_executions ENABLE TRIGGER USER;`);
  assert.throws(()=>sql(insert(id(16),snapshot)),/governed_release_scope_invalid/);
  assert.equal(releaseDigest({b:1,a:2}),releaseDigest({a:2,b:1}));
 } finally {
  if(!/^companycore_test_release_[a-f0-9]{32}$/.test(database))throw new Error("Unsafe fixture database cleanup");
  execFileSync("docker",["compose","exec","-T","postgres","dropdb","-U","companycore",database],{windowsHide:true});
 }
});
