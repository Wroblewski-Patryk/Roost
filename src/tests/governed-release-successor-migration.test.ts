import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { successorFixture } from "./governed-release-successor.test";
import { releaseDigest,releaseSuccessorBasis } from "../modules/agent-runtime/governed-release-contract";

const migration="20261003200000_governed_release_successor",source=(name:string)=>readFileSync(`prisma/migrations/${name}/migration.sql`,"utf8");
test("successor migration only adds proof functions and guards without changing prior records or guards",()=>{
 const sql=source(migration);
 assert.ok(sql.trim().startsWith("BEGIN;")&&sql.trim().endsWith("COMMIT;"));
 assert.ok(!/CREATE OR REPLACE|\b(?:UPDATE|DELETE|TRUNCATE|DROP|ALTER TABLE|INSERT INTO)\b/i.test(sql));
 for(const table of ["governed_releases","governed_release_operations"])assert.match(sql,new RegExp(`CREATE TRIGGER governed_release_successor_\\w+_guard BEFORE INSERT ON ${table}`));
 assert.match(sql,/governed_release_successor_version\(target_release\)/);
});

// Explicit opt-in uses the existing local Compose PostgreSQL only. Historical
// synthetic setup bypasses old admission guards; the new successor guards are
// enabled throughout all positive and forged-lineage assertions.
test("PostgreSQL: successor guard preserves history and refuses forged, stale and incomplete lineage",{skip:process.env.ROOST_SUCCESSOR_MIGRATION_DB!=="1"},()=>{
 const database=`companycore_test_successor_${randomUUID().replaceAll("-","")}`,q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const args=["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database];
 const sql=(input:string)=>execFileSync("docker",args,{input,encoding:"utf8",windowsHide:true,maxBuffer:32*1024*1024}).trim();
 const f=successorFixture(true),r=f.state.release,s=r.snapshot,user=r.issuer_user_id,workspace=r.workspace_id,execution=randomUUID(),verifier=randomUUID(),coder=randomUUID();
 const applicationMetadata={preserve:"fixture",releasePurpose:"application_release",localDirectory:s.manifest.repository.canonicalDir,deploymentUrl:s.manifest.deployment.url,
  releaseTargets:s.manifest.deployment.targets.map((t:any)=>({targetId:t.targetId,dockerfile:t.dockerfile})),releasePublicOrigins:s.manifest.deployment.publicOrigins};
 const codeMetadata={resultRevision:{commit:s.commit},executionContract:{assignment:{agentId:coder}}};
 const auditMetadata={resultRevision:{commit:s.commit},executionContract:{assignment:{agentId:s.releaserAgentId},nativeBoundary:{profile:"inspect-readonly"}}};
 const auditVerification={readOnlyAudit:{verdict:"verified",nativeTools:[],preTree:s.candidateTree,postTree:s.candidateTree},
  managedAdmission:{qualification:"signed_native_v1"},ownedTreeReceipt:{cleanup:true,activeProcesses:0}};
 execFileSync("docker",["compose","exec","-T","postgres","createdb","-U","companycore",database],{windowsHide:true});
 try {
  sql(readdirSync("prisma/migrations").filter(n=>/^\d/.test(n)&&n<migration).sort().map(source).join("\n"));
  sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES(${q(user)},'successor-fixture@example.test','synthetic-no-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${q(workspace)},'Successor fixture',${q(user)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES(${q(randomUUID())},${q(workspace)},${q(user)},'owner',now());
   INSERT INTO applications(id,workspace_id,name,slug,metadata,updated_at) VALUES(${q(s.applicationId)},${q(workspace)},'Preserved application','successor-fixture',${json(applicationMetadata)},now());
   INSERT INTO tasks(id,workspace_id,title,status,updated_at) VALUES(${q(s.taskId)},${q(workspace)},'Preserved repair','in_progress',now());
   INSERT INTO workforce_entities(id,workspace_id,name,slug,type,role,updated_at) VALUES
    (${q(coder)},${q(workspace)},'Coder','successor-coder','agent','coder',now()),
    (${q(verifier)},${q(workspace)},'Verifier','successor-verifier','agent','verifier',now()),
    (${q(s.releaserAgentId)},${q(workspace)},'Releaser','successor-releaser','agent','releaser',now());
   INSERT INTO agent_hosts(id,workspace_id,name,slug,platform,updated_at) VALUES(${q(s.hostId)},${q(workspace)},'Fixture host','successor-host','windows',now());
   ALTER TABLE agent_executions DISABLE TRIGGER USER;
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,requested_by_type,status,summary,completed_at,metadata,updated_at) VALUES
    (${q(execution)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},'user','completed','Preserved candidate',now(),${json(codeMetadata)},now()),
    (${q(s.releaseExecutionId)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},'user','completed','Preserved audit',now(),${json(auditMetadata)},now());
   UPDATE agent_executions SET verification=${json(auditVerification)} WHERE id=${q(s.releaseExecutionId)};
   ALTER TABLE agent_executions ENABLE TRIGGER USER;
   ALTER TABLE task_review_decisions DISABLE TRIGGER USER;
   INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_user_id,verifier_id,manager_id,decision,evidence,snapshot) VALUES
    (${q(s.reviewId)},${q(workspace)},${q(s.taskId)},${q(execution)},${q(randomUUID())},'fixture-review',${q(s.materialVersion)},${q(user)},${q(verifier)},${q(s.releaserAgentId)},'approve',${json({reviewedCommit:s.commit})},'{}');
   ALTER TABLE task_review_decisions ENABLE TRIGGER USER;
   ALTER TABLE api_keys DISABLE TRIGGER USER;
   INSERT INTO api_keys(id,workspace_id,bound_agent_id,name,key_hash,key_prefix,expires_at,scopes,updated_at) VALUES
    (${q(s.releaserCredentialId)},${q(workspace)},${q(s.releaserAgentId)},'Fixture key','synthetic-not-a-token','fixture_successor',now()+interval '1 hour','["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write","agent-runtime:release"]',now());
   ALTER TABLE api_keys ENABLE TRIGGER USER;
   ALTER TABLE governed_releases DISABLE TRIGGER governed_release_insert_guard;
   ALTER TABLE governed_release_operations DISABLE TRIGGER governed_release_operation_guard;
   ALTER TABLE governed_release_outcomes DISABLE TRIGGER governed_release_outcome_guard;
   ALTER TABLE governed_release_renewals DISABLE TRIGGER governed_release_renewal_guard;`);
  s.materialVersion=sql(`SELECT encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') FROM agent_executions e WHERE id=${q(execution)};`);f.input.materialVersion=s.materialVersion;
  sql(`ALTER TABLE task_review_decisions DISABLE TRIGGER USER;UPDATE task_review_decisions SET material_version=${q(s.materialVersion)} WHERE id=${q(s.reviewId)};ALTER TABLE task_review_decisions ENABLE TRIGGER USER;`);
  const insert=(id:string,snapshot:any)=>`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)
   VALUES(${q(id)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(s.releaseExecutionId)},${q(s.reviewId)},${q(s.releaserAgentId)},${q(s.releaserCredentialId)},1,${q(user)},${q(s.expiresAt)},${q(s.manifestDigest)},${q("9".repeat(64))},${json(snapshot)},${q(randomUUID())},${q("a".repeat(64))});`;
  const incompleteId=randomUUID();sql(insert(r.id,s)+insert(incompleteId,s));
  for(const releaseId of [r.id,incompleteId])for(const j of f.state.journal.filter((j:any)=>releaseId===r.id||j.operation!=="cleanup")) {
   const operationId=releaseId===r.id?j.id:randomUUID();sql(`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash)
   VALUES(${q(operationId)},${q(releaseId)},${q(workspace)},${q(s.applicationId)},${j.sequence},${q(j.operation)},${json(j.intent)},${q(randomUUID())},'fixture-operation');
   INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(releaseId)},${q(operationId)},${q(workspace)},${q(j.outcome.status)},${j.outcome.reconciled_status?q(j.outcome.reconciled_status):"NULL"},${j.outcome.observation_only},${json(j.outcome.evidence)},${q(randomUUID())},'fixture-outcome');`);
  }
  // The real predecessor has renewal history: qualify the same five-window
  // Date serialization rather than only a never-renewed synthetic grant.
  for(let sequence=1;sequence<=5;sequence++)sql(`INSERT INTO governed_release_renewals(id,release_id,workspace_id,sequence,issuer_user_id,owner_authenticated_at,previous_expires_at,expires_at,expected_version,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(r.id)},${q(workspace)},${sequence},${q(user)},now(),
    ${q(new Date(Date.parse(s.expiresAt)+(sequence-1)*60000).toISOString())},${q(new Date(Date.parse(s.expiresAt)+sequence*60000).toISOString())},${q("a".repeat(64))},${q(randomUUID())},${q("b".repeat(64))});`);
  const preserved=()=>sql(`SELECT to_jsonb(a)::text FROM applications a; SELECT to_jsonb(t)::text FROM tasks t;
   SELECT to_jsonb(r)::text FROM governed_releases r WHERE id=${q(r.id)};
   SELECT to_jsonb(o)::text FROM governed_release_operations o WHERE release_id=${q(r.id)} ORDER BY sequence;
   SELECT to_jsonb(x)::text FROM governed_release_outcomes x WHERE release_id=${q(r.id)} ORDER BY sequence;
   SELECT to_jsonb(v)::text FROM governed_release_renewals v WHERE release_id=${q(r.id)} ORDER BY sequence;`);
  const before=preserved();sql(source(migration));assert.equal(preserved(),before);
  // Match the production load() digest: PostgreSQL JSON outcome timestamps stay
  // as strings, while top-level timestamp columns are serialized as JS Dates.
  const release=JSON.parse(sql(`SELECT to_jsonb(r) FROM governed_releases r WHERE id=${q(r.id)};`));
  const utc=(v:string)=>new Date(v+(/[Zz]|[+-]\d\d:\d\d$/.test(v)?"":"Z")).toISOString();
  release.created_at=utc(release.created_at);release.expires_at=utc(release.expires_at);
  const journal=JSON.parse(sql(`SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence) FROM governed_release_operations o WHERE release_id=${q(r.id)};`));
  for(const j of journal)j.created_at=utc(j.created_at);
  const renewals=JSON.parse(sql(`SELECT jsonb_agg(to_jsonb(v) ORDER BY sequence) FROM governed_release_renewals v WHERE release_id=${q(r.id)};`));
  for(const row of renewals)for(const key of ["created_at","owner_authenticated_at","previous_expires_at","expires_at"])row[key]=utc(row[key]);
  const state={release,journal,revocations:[],renewals,expectedVersion:releaseDigest({release,journal,revocations:[],renewals})};
  assert.equal(sql(`SELECT governed_release_successor_version(${q(r.id)});`),state.expectedVersion);
  f.input.predecessor.expectedVersion=state.expectedVersion;
  const basis=releaseSuccessorBasis(state,f.input);assert.ok(basis.successorBasis,JSON.stringify(basis));
  const snapshot={...f.input,...basis};
  assert.equal(sql(`SELECT governed_release_successor_runtime(${json(s)},${json(f.evidence(true))},TRUE);`),"t");
  const mismatch=f.state.journal.find((j:any)=>j.outcome.reconciled_status==="failed").outcome.evidence;
  assert.equal(sql(`SELECT governed_release_successor_runtime(${json(s)},${json(mismatch)},TRUE,'api',TRUE);`),"t");
  for(const flag of ["repositoryArchived","localAbsent"])assert.equal(sql(`SELECT governed_release_successor_runtime(${json(s)},${json({...mismatch,[flag]:true})},TRUE,'api',TRUE);`),"f",flag);
  const derived=sql(`SELECT governed_release_successor_basis(${q(r.id)},${json(snapshot)});`);
  assert.ok(derived,"SQL must derive the completed predecessor basis");assert.deepEqual(JSON.parse(derived),basis.successorBasis);
  for(const change of [(v:any)=>v.successorBasis.mergeOperationId=randomUUID(),(v:any)=>v.predecessor.expectedVersion="0".repeat(64),
   (v:any)=>v.baseCommit=v.commit,(v:any)=>v.manifest.baseline.dataDigest="0".repeat(64),
   (v:any)=>v.successorBasis.rollbackDeploymentIds[0].deploymentId="foreign",(v:any)=>delete v.successorBasis]) {
   const invalid=structuredClone(snapshot);change(invalid);assert.throws(()=>sql(insert(randomUUID(),invalid)),/governed_release_successor_invalid/);
  }
  const incomplete=structuredClone(snapshot),incompleteVersion=sql(`SELECT governed_release_successor_version(${q(incompleteId)});`);
  incomplete.predecessor={releaseId:incompleteId,expectedVersion:incompleteVersion};incomplete.successorBasis={...incomplete.successorBasis,...incomplete.predecessor};
  assert.equal(sql(`SELECT governed_release_successor_basis(${q(incompleteId)},${json(incomplete)});`),"");
  assert.throws(()=>sql(insert(randomUUID(),incomplete)),/governed_release_successor_invalid/);
  // Retire only the incomplete synthetic sibling to release its application
  // fence, then qualify the positive path with every legacy guard enabled.
  sql(`INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(incompleteId)},${q(workspace)},${q(user)},'Retire incomplete owned fixture',${q(randomUUID())},'fixture-revocation');
   ALTER TABLE governed_releases ENABLE TRIGGER governed_release_insert_guard;
   ALTER TABLE governed_release_operations ENABLE TRIGGER governed_release_operation_guard;
   ALTER TABLE governed_release_outcomes ENABLE TRIGGER governed_release_outcome_guard;
   ALTER TABLE governed_release_renewals ENABLE TRIGGER governed_release_renewal_guard;`);
  const successor=randomUUID();sql(insert(successor,snapshot));assert.equal(preserved(),before);
  const intent:any={commit:s.commit,baseCommit:s.baseCommit,manifestDigest:s.manifestDigest,observed:{baseCommit:s.commit,baseTree:s.candidateTree}};
  const effect=(operation:string,value=intent,releaseId=successor)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(releaseId)},${q(workspace)},${q(s.applicationId)},1,${q(operation)},${json(value)},${q(randomUUID())},'fixture-operation');`;
  assert.throws(()=>sql(effect("push")),/governed_release_successor_invalid/);
  assert.throws(()=>sql(effect("deploy_config",{...intent,observed:{baseCommit:s.baseCommit,baseTree:s.baseTree}})),/governed_release_successor_invalid/);
  assert.throws(()=>sql(effect("observe",intent,r.id)),/governed_release_already_completed/);
  sql(effect("deploy_config"));assert.equal(preserved(),before);
  const enabled=sql("SELECT tgname||':'||tgenabled::text FROM pg_trigger WHERE tgname IN ('governed_release_successor_insert_guard','governed_release_successor_operation_guard','governed_release_insert_guard','governed_release_operation_guard','governed_release_outcome_guard','governed_release_renewal_guard') ORDER BY tgname;");
  assert.equal(enabled,"governed_release_insert_guard:O\ngoverned_release_operation_guard:O\ngoverned_release_outcome_guard:O\ngoverned_release_renewal_guard:O\ngoverned_release_successor_insert_guard:O\ngoverned_release_successor_operation_guard:O");
 } finally {
  assert.match(database,/^companycore_test_successor_[a-f0-9]{32}$/);
  execFileSync("docker",["compose","exec","-T","postgres","dropdb","-U","companycore",database],{windowsHide:true});
  const absent=execFileSync("docker",["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d","postgres"],
   {input:`SELECT datname FROM pg_database WHERE datname=${q(database)};`,encoding:"utf8",windowsHide:true}).trim();
  assert.equal(absent,"");console.log(JSON.stringify({database,cleanupAbsent:true}));
 }
});
