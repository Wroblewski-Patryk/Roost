import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {baselineRestartFixture} from "./governed-release-baseline-restart.test";
import {releaseDigest,releaseFailedClosureError,releasePublishedGitBasis} from "../modules/agent-runtime/governed-release-contract";
const migration="20261003213000_governed_release_baseline_restart",source=(n:string)=>readFileSync(`prisma/migrations/${n}/migration.sql`,"utf8");
test("baseline restart is additive and keeps prior source/evidence immutable",()=>{
 const s=source(migration);assert.ok(!/CREATE OR REPLACE|\b(?:UPDATE|DELETE|TRUNCATE|DROP|ALTER TABLE)\b/i.test(s.replace(/BEFORE UPDATE OR DELETE|ON DELETE RESTRICT/g,"")));
 assert.match(s,/governed_release_failed_closures/);assert.match(s,/DEFERRABLE INITIALLY DEFERRED/);assert.match(s,/governed_release_reconciliation_authorization_guard/);
});
test("PostgreSQL: full guard stack qualifies bounded new-key reconciliation, FAILED closure and independent baseline restart",{skip:process.env.ROOST_BASELINE_RESTART_DB!=="1"},()=>{
 const database=`companycore_test_baseline_${randomUUID().replaceAll("-","")}`,q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const args=["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database];
 const sql=(input:string)=>execFileSync("docker",args,{input,encoding:"utf8",windowsHide:true,maxBuffer:32*1024*1024}).trim();
 const f=baselineRestartFixture(),r=f.state.release,s=r.snapshot,user=r.issuer_user_id,workspace=r.workspace_id,execution=randomUUID(),verifier=randomUUID(),coder=randomUUID();
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
  s.expiresAt=new Date(Date.now()-3600000).toISOString();
  const incompleteId=randomUUID();sql(insert(r.id,s)+insert(incompleteId,s));
  const oldGrant=sql(`SELECT to_jsonb(r)::text FROM governed_releases r WHERE id=${q(r.id)};`);
  for(const releaseId of [r.id,incompleteId])for(const j of f.state.journal) {
   const operationId=releaseId===r.id?j.id:randomUUID();sql(`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash)
   VALUES(${q(operationId)},${q(releaseId)},${q(workspace)},${q(s.applicationId)},${j.sequence},${q(j.operation)},${json(j.intent)},${q(randomUUID())},'fixture-operation');
   INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(releaseId)},${q(operationId)},${q(workspace)},${q(j.id===f.failed.id?'uncertain':j.outcome.status)},${j.id===f.failed.id?'NULL':j.outcome.reconciled_status?q(j.outcome.reconciled_status):'NULL'},${j.outcome.observation_only},${json(j.outcome.evidence)},${q(randomUUID())},'fixture-outcome');`);
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

  // Resume the same unresolved native intent through a normal new credential.
  sql(source(migration));
  const newKey=randomUUID();sql(`ALTER TABLE api_keys DISABLE TRIGGER USER;
   UPDATE api_keys SET active=false,revoked_at=now(),credential_version=2 WHERE id=${q(s.releaserCredentialId)};
   INSERT INTO api_keys(id,workspace_id,bound_agent_id,name,key_hash,key_prefix,expires_at,scopes,updated_at)
   VALUES(${q(newKey)},${q(workspace)},${q(s.releaserAgentId)},'New read-only reconciliation key','synthetic-normal-key','fixture_new',now()+interval '1 hour','["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write","agent-runtime:release"]',now());
   ALTER TABLE api_keys ENABLE TRIGGER USER;
   ALTER TABLE governed_releases ENABLE TRIGGER governed_release_insert_guard;
   ALTER TABLE governed_release_operations ENABLE TRIGGER governed_release_operation_guard;
   ALTER TABLE governed_release_outcomes ENABLE TRIGGER governed_release_outcome_guard;
   ALTER TABLE governed_release_renewals ENABLE TRIGGER governed_release_renewal_guard;`);
  const normalize=(row:any,keys:string[])=>{for(const k of keys)row[k]=new Date(row[k]+(/[Zz]|[+-]\\d\\d:\\d\\d$/.test(row[k])?"":"Z")).toISOString();return row;};
  const load=()=>{
   const release=normalize(JSON.parse(sql(`SELECT to_jsonb(r) FROM governed_releases r WHERE id=${q(r.id)};`)),["created_at","expires_at"]);
   const journal=JSON.parse(sql(`SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence) FROM governed_release_operations o WHERE release_id=${q(r.id)};`));
   journal.forEach((j:any)=>normalize(j,["created_at"]));
   const revocations=JSON.parse(sql(`SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY created_at,id),'[]'::jsonb) FROM governed_release_revocations v WHERE release_id=${q(r.id)};`));revocations.forEach((v:any)=>normalize(v,["created_at"]));
   const renewals=JSON.parse(sql(`SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY sequence),'[]'::jsonb) FROM governed_release_renewals v WHERE release_id=${q(r.id)};`));renewals.forEach((v:any)=>normalize(v,["created_at","owner_authenticated_at","previous_expires_at","expires_at"]));
   return {release,journal,revocations,renewals,failedClosures:JSON.parse(sql(`SELECT COALESCE(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM governed_release_failed_closures c WHERE release_id=${q(r.id)};`)),expectedVersion:releaseDigest({release,journal,revocations,renewals})};
  };
  let state=load();assert.equal(sql(`SELECT governed_release_successor_version(${q(r.id)});`),state.expectedVersion);
  const authTime=new Date().toISOString(),authSnapshot={releaseId:r.id,hostId:s.hostId,applicationId:s.applicationId,agentId:s.releaserAgentId,releaseSnapshotDigest:releaseDigest(s),
   journalBasis:state.journal.map((j:any)=>({id:j.id,requestHash:j.request_hash,intentDigest:releaseDigest(j.intent),outcomeDigest:releaseDigest(j.outcome)}))};
  const authorization=(ids:any,key=newKey,version=state.expectedVersion,when=authTime)=>`INSERT INTO governed_release_reconciliation_authorizations(id,release_id,workspace_id,host_id,application_id,agent_id,credential_id,credential_version,issuer_user_id,owner_authenticated_at,expected_version,operation_ids,expires_at,snapshot,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(r.id)},${q(workspace)},${q(s.hostId)},${q(s.applicationId)},${q(s.releaserAgentId)},${q(key)},1,${q(user)},${q(when)},${q(version)},${json(ids)},now()+interval '30 minutes',${json(authSnapshot)},${q(randomUUID())},'fixture-reconciliation');`;
  for(const args of [[[state.journal[0].id]],[[f.failed.id],s.releaserCredentialId],[[f.failed.id],newKey,"0".repeat(64)],[[f.failed.id],newKey,state.expectedVersion,new Date(Date.now()-301000).toISOString()],[[f.failed.id,f.failed.id]]])
   assert.throws(()=>sql(authorization(...args as [any])),/governed_release_reconciliation_invalid/);
  sql(authorization([f.failed.id]));
  assert.throws(()=>sql(`UPDATE governed_release_reconciliation_authorizations SET expires_at=now();`),/governed_release_append_only/);
  // Existing outcome guard permits read-only reconciliation after admission expiry.
  sql(`INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(r.id)},${q(f.failed.id)},${q(workspace)},'reconciled','failed',true,${json(f.failed.outcome.evidence)},${q(randomUUID())},'fixture-resolved');`);
  state=load();f.body.expectedVersion=state.expectedVersion;
  assert.equal(releaseFailedClosureError(state,f.body),null);
  const failedOutcome=state.journal.find((j:any)=>j.id===f.failed.id).outcome;
  const receipt={...f.body,releaseId:r.id,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:user,ownerAuthenticatedAt:authTime,
   failedOutcomeId:failedOutcome.id,failedEvidenceDigest:releaseDigest(failedOutcome.evidence)};
  const closureId=randomUUID(),revocationId=randomUUID();
  const closureInsert=(body:any,when=authTime)=>`INSERT INTO governed_release_failed_closures(id,release_id,workspace_id,issuer_user_id,owner_authenticated_at,failed_operation_id,failed_outcome_id,expected_version,consent_digest,closure_digest,revocation_id,snapshot,request_id,request_hash)
   VALUES(${q(closureId)},${q(r.id)},${q(workspace)},${q(user)},${q(when)},${q(f.failed.id)},${q(failedOutcome.id)},${q(state.expectedVersion)},${q(f.body.consentDigest)},${q(releaseDigest(body))},${q(revocationId)},${json(body)},${q(randomUUID())},'fixture-closure');`;
  for(const mutate of [(e:any)=>e.healthy=false,(e:any)=>e.deployedTargets[0].commit="0".repeat(40),(e:any)=>e.deployedTargets[0].tree="0".repeat(40),
   (e:any)=>e.configDigest="0".repeat(64),(e:any)=>e.schemaDigest="0".repeat(64),(e:any)=>e.dataDigest="0".repeat(64),
   (e:any)=>e.deployedTargets[0].imageDigest=s.manifest.deployment.targets[0].baseline.imageDigest,(e:any)=>e.repositoryArchived=true,
   (e:any)=>{e.deployedTargets[0].deploymentId="foreign";e.deploymentIds[0].deploymentId="foreign";}]) {
   const invalid=structuredClone(receipt);mutate(invalid.evidence);assert.throws(()=>sql(closureInsert(invalid)),/governed_release_failed_closure_invalid/);
  }
  sql(`BEGIN;${closureInsert(receipt)}
   INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)
   VALUES(${q(revocationId)},${q(r.id)},${q(workspace)},${q(user)},${q('Closed FAILED; owner baseline receipt '+closureId)},${q(randomUUID())},'fixture-closure');
   COMMIT;`);
  assert.throws(()=>sql(`DELETE FROM governed_release_failed_closures;`),/governed_release_append_only/);
  state=load();
  // Fresh approval/audit identities: the historical approval and failed grant stay untouched.
  const newReview=f.input.reviewId,newAudit=f.input.releaseExecutionId,newCandidate=randomUUID();
  sql(`ALTER TABLE agent_executions DISABLE TRIGGER USER;
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,requested_by_type,status,summary,completed_at,metadata,verification,updated_at)
   VALUES(${q(newAudit)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},'user','completed','New baseline audit',now(),${json(auditMetadata)},${json(auditVerification)},now());
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,requested_by_type,status,summary,completed_at,metadata,updated_at)
   VALUES(${q(newCandidate)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},'user','completed','Same candidate new verification',now(),${json(codeMetadata)},now());
   ALTER TABLE agent_executions ENABLE TRIGGER USER;`);
  const newMaterial=sql(`SELECT encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') FROM agent_executions e WHERE id=${q(newCandidate)};`);
  sql(`
   ALTER TABLE task_review_decisions DISABLE TRIGGER USER;
   INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_user_id,verifier_id,manager_id,decision,evidence,snapshot)
   VALUES(${q(newReview)},${q(workspace)},${q(s.taskId)},${q(newCandidate)},${q(randomUUID())},'fixture-new-independent-review',${q(newMaterial)},${q(user)},${q(verifier)},${q(s.releaserAgentId)},'approve',${json({reviewedCommit:s.commit})},'{}');
   ALTER TABLE task_review_decisions ENABLE TRIGGER USER;
   INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
   SELECT ${q(randomUUID())},${q(incompleteId)},operation_id,${q(workspace)},'reconciled','failed',true,evidence,${q(randomUUID())},'fixture-sibling-resolution' FROM governed_release_outcomes WHERE release_id=${q(incompleteId)} AND status='uncertain';
   INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(incompleteId)},${q(workspace)},${q(user)},'Retire owned synthetic sibling',${q(randomUUID())},'fixture-sibling');`);
  f.input.baselineRestart={releaseId:r.id,expectedVersion:state.expectedVersion,closureId,consentDigest:f.body.consentDigest};
  f.input.releaserCredentialId=newKey;f.input.materialVersion=newMaterial;f.input.expiresAt=new Date(Date.now()+1800000).toISOString();
  const basis=releasePublishedGitBasis(state,f.input);assert.ok(basis.publishedGitBasis,JSON.stringify(basis));
  const snapshot={...f.input,...basis};
  assert.deepEqual(JSON.parse(sql(`SELECT governed_release_published_git_basis(${q(r.id)},${json(snapshot)});`)),basis.publishedGitBasis);
  assert.deepEqual(JSON.parse(sql(`SELECT governed_release_restart_protected_ids(${json(s.manifest)},${json(f.body.evidence)});`)),f.input.manifest.cleanup.protectedResourceIds);
  const newGrant=(id:string,value:any)=>`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)
   VALUES(${q(id)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(newAudit)},${q(newReview)},${q(s.releaserAgentId)},${q(newKey)},1,${q(user)},now()+interval '30 minutes',${q(f.input.manifestDigest)},${q("9".repeat(64))},${json(value)},${q(randomUUID())},'fixture-new-grant');`;
  for(const mutate of [(v:any)=>v.publishedGitBasis.mergeOperationId=randomUUID(),(v:any)=>v.baselineRestart.consentDigest="0".repeat(64),
   (v:any)=>v.manifest.deployment.targets[0].baseline.imageDigest='sha256:'+"f".repeat(64),(v:any)=>v.baseCommit=v.commit,
   (v:any)=>v.reviewId=s.reviewId,(v:any)=>v.releaseExecutionId=s.releaseExecutionId,
   (v:any)=>v.manifest.cleanup.protectedResourceIds.pop(),(v:any)=>v.manifest.cleanup.protectedResourceIds.shift(),
   (v:any)=>v.manifest.cleanup.protectedResourceIds.reverse(),(v:any)=>v.manifest.cleanup.protectedResourceIds.push('sha256:'+"f".repeat(64)),
   (v:any)=>v.manifest.cleanup.protectedResourceIds.push(v.manifest.cleanup.protectedResourceIds.at(-1)),
   (v:any)=>{const ids=v.manifest.cleanup.protectedResourceIds;[ids[ids.length-1],ids[ids.length-2]]=[ids[ids.length-2],ids[ids.length-1]];},
   (v:any)=>v.manifest.cleanup.ownedResourceIds.push("foreign")]) {
   const bad=structuredClone(snapshot);mutate(bad);
   const rejectedBasis=sql(`SELECT governed_release_published_git_basis(${q(r.id)},${json(bad)}) IS NULL;`);
   // A fabricated basis field is rejected by the INSERT equality check; all
   // manifest/lineage alterations are also independently rejected by derivation.
   if(bad.publishedGitBasis.mergeOperationId===snapshot.publishedGitBasis.mergeOperationId)assert.equal(rejectedBasis,"t");
   assert.throws(()=>sql(newGrant(randomUUID(),bad)),/governed_release_(?:restart|scope)_invalid/);
  }
  const newRelease=randomUUID();sql(newGrant(newRelease,snapshot));
  const intent={commit:s.commit,manifestDigest:f.input.manifestDigest,observed:{baseCommit:s.commit,baseTree:s.candidateTree}};
  const op=(operation:string)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash)
   VALUES(${q(randomUUID())},${q(newRelease)},${q(workspace)},${q(s.applicationId)},1,${q(operation)},${json(intent)},${q(randomUUID())},'fixture-new-operation');`;
  assert.throws(()=>sql(op("push")),/governed_release_restart_invalid/);sql(op("deploy_config"));
  assert.equal(sql(`SELECT count(*) FROM governed_release_operations WHERE release_id=${q(newRelease)} AND operation IN ('push','pr','review','merge');`),"0");
  const disabled=sql("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgenabled <> 'O';");assert.equal(disabled,"");
  assert.equal(sql(`SELECT to_jsonb(r)::text FROM governed_releases r WHERE id=${q(r.id)};`),oldGrant);
 } finally {
  assert.match(database,/^companycore_test_baseline_[a-f0-9]{32}$/);
  execFileSync("docker",["compose","exec","-T","postgres","dropdb","-U","companycore",database],{windowsHide:true});
  assert.equal(execFileSync("docker",["compose","exec","-T","postgres","psql","-X","-qAt","-U","companycore","-d","postgres"],{input:`SELECT datname FROM pg_database WHERE datname=${q(database)};`,encoding:"utf8",windowsHide:true}).trim(),"");
  console.log(JSON.stringify({database,cleanupAbsent:true}));
 }
});
