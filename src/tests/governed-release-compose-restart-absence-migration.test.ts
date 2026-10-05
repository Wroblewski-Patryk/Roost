import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {configAbsenceFixture} from './governed-release-compose-config-absence.test';
import {releaseDigest} from '../modules/agent-runtime/governed-release-contract';

const migration='20261005030000_compose_restart_absence_closure';
const source=(n:string)=>readFileSync(`prisma/migrations/${n}/migration.sql`,'utf8');
const hash='a'.repeat(64);
test('Compose restart absence recovery is forward-only and retains immutable histories and key guards',()=>{
 const s=source(migration);
 assert.ok(s.startsWith('BEGIN;')&&s.trim().endsWith('COMMIT;'));
 assert.doesNotMatch(s,/\b(?:DELETE FROM|UPDATE [a-z_]+ SET|INSERT INTO|DROP|TRUNCATE|ALTER TABLE)\b/i);
 assert.match(s,/governed_release_compose_config_absence_initial_v1/);
 assert.doesNotMatch(s,/agent_credential_guard|credential_version\s*:=/);
});

test('real disposable PostgreSQL authenticates recursive Git, single config absence and fresh full closure revalidation',()=>{
 const database='roost_test_restart_absence_'+randomUUID().replaceAll('-','');
 const dockerExec=process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER?['exec','-i',process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER]:['compose','exec','-T','postgres'];
 const postgresUser=process.env.ROOST_MIGRATION_TEST_POSTGRES_USER??'companycore';
 const args=[...dockerExec,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',postgresUser,'-d',database];
 const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const sql=(input:string)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
 let created=false;
 try {
  execFileSync('docker',[...dockerExec,'createdb','-U',postgresUser,database],{windowsHide:true});created=true;
  sql(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)&&n<migration).sort().map(source).join('\n'));
  const credentialGuard=sql("SELECT pg_get_functiondef('agent_credential_guard()'::regprocedure);");
  const original=sql("SELECT prosrc FROM pg_proc WHERE proname='governed_release_compose_config_absence_git';");
  const counts=sql('SELECT count(*) FROM governed_releases;SELECT count(*) FROM api_keys;SELECT count(*) FROM governed_release_operations;');
  sql('BEGIN;'+source(migration).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')+'ROLLBACK;');
  assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname='governed_release_compose_absence_lineage';"),'0');
  assert.equal(sql("SELECT prosrc FROM pg_proc WHERE proname='governed_release_compose_config_absence_git';"),original);
  sql(source(migration));
  assert.equal(sql('SELECT count(*) FROM governed_releases;SELECT count(*) FROM api_keys;SELECT count(*) FROM governed_release_operations;'),counts);
  assert.equal(sql("SELECT prosrc FROM pg_proc WHERE proname='governed_release_compose_config_absence_initial_v1';"),original);
  assert.equal(sql("SELECT pg_get_functiondef('agent_credential_guard()'::regprocedure);"),credentialGuard);

  const f=configAbsenceFixture(),workspace=randomUUID(),user=randomUUID(),first=f.state.release.id;
  const initial=structuredClone(f.s),since=new Date(Date.now()-60000).toISOString();
  f.e.composeConfigAbsence.since=since;f.e.observedAt=new Date(Date.now()-1000).toISOString();
  f.operation.createdAt=since;
  const insertRelease=(id:string,s:any)=>`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash) VALUES(${q(id)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(s.releaseExecutionId)},${q(s.reviewId)},${q(s.releaserAgentId)},${q(s.releaserCredentialId)},1,${q(user)},now()+interval '1 hour',${q(s.manifestDigest)},${q(hash)},${json(s)},${q(randomUUID())},${q(hash)});`;
  const insertOperation=(releaseId:string,s:any,j:any)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash,created_at)VALUES(${q(j.id)},${q(releaseId)},${q(workspace)},${q(s.applicationId)},${j.sequence},${q(j.operation)},${json(j.intent)},${q(randomUUID())},'synthetic-operation',${q(j.createdAt??since)});
   INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)VALUES(${q(j.outcome.id)},${q(releaseId)},${q(j.id)},${q(workspace)},${q(j.outcome.status)},${j.outcome.reconciled_status?q(j.outcome.reconciled_status):'NULL'},${j.outcome.observation_only===true},${json(j.outcome.evidence)},${q(randomUUID())},'synthetic-outcome');`;
  // Only synthetic historical prerequisites are seeded with guards bypassed.
  // Every failed closure and lineage qualification below uses enabled guards.
  sql(`SET session_replication_role=replica;
   INSERT INTO users(id,email,password_hash,updated_at)VALUES(${q(user)},'restart-absence@example.test','synthetic-not-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at)VALUES(${q(workspace)},'Synthetic restart absence',${q(user)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at)VALUES(${q(randomUUID())},${q(workspace)},${q(user)},'owner',now());
   ${insertRelease(first,initial)}${f.state.journal.map((j:any)=>insertOperation(first,initial,j)).join('\n')}
   SET session_replication_role=origin;`);
  const baselineProven=(id:string,op:any,e:any)=>sql(`SELECT governed_release_failed_baseline_proven(${q(id)},${q(op.id)},${json(e)});`);
  assert.equal(baselineProven(first,f.operation,f.e),'t');
  const receipt=(id:string,s:any,op:any,e:any)=>{
   const authenticatedAt=new Date().toISOString();
   return {...f.body,requestId:randomUUID(),expectedVersion:sql(`SELECT governed_release_successor_version(${q(id)});`),failedOperationId:op.id,evidence:e,
    nativeClosure:{...f.body.nativeClosure,releaseId:id,operationId:op.id,agentHostId:s.hostId,evidenceDigest:releaseDigest(e),observedAt:authenticatedAt},
    releaseId:id,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:user,ownerAuthenticatedAt:authenticatedAt,
    failedOutcomeId:op.outcome.id,failedEvidenceDigest:releaseDigest(e)};
  };
  const close=(id:string,body:any,closureId:string,revocationId:string)=>`INSERT INTO governed_release_failed_closures(id,release_id,workspace_id,issuer_user_id,owner_authenticated_at,failed_operation_id,failed_outcome_id,expected_version,consent_digest,closure_digest,revocation_id,snapshot,request_id,request_hash)VALUES(${q(closureId)},${q(id)},${q(workspace)},${q(user)},${q(body.ownerAuthenticatedAt)},${q(body.failedOperationId)},${q(body.failedOutcomeId)},${q(body.expectedVersion)},${q(body.consentDigest)},${q(releaseDigest(body))},${q(revocationId)},${json(body)},${q(randomUUID())},'synthetic-closure');`;
  const revoke=(id:string,closureId:string,revocationId:string)=>`INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)VALUES(${q(revocationId)},${q(id)},${q(workspace)},${q(user)},${q('Closed FAILED; owner baseline receipt '+closureId)},${q(randomUUID())},'synthetic-revocation');`;
  const c1=randomUUID(),v1=randomUUID(),body1=receipt(first,initial,f.operation,f.e);
  sql('BEGIN;'+close(first,body1,c1,v1)+revoke(first,c1,v1)+'COMMIT;');
  const child=structuredClone(initial);
  Object.assign(child,{releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),baselineRestart:{releaseId:first,expectedVersion:sql(`SELECT governed_release_successor_version(${q(first)});`),closureId:c1,consentDigest:body1.consentDigest}});
  child.publishedGitBasis=JSON.parse(sql(`SELECT governed_release_published_git_basis(${q(first)},${json(child)})::text;`));
  for(const [i,key]of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'].entries())assert.equal(child.publishedGitBasis[key],f.state.journal[i].id);
  const second=randomUUID(),op=structuredClone(f.operation),e=structuredClone(f.e);
  op.id=randomUUID();op.sequence=1;op.outcome.id=randomUUID();
  op.createdAt=new Date(Date.now()-600000).toISOString();
  e.composeConfigAbsence.releaseId=second;e.composeConfigAbsence.operationId=op.id;e.composeConfigAbsence.since=op.createdAt;
  e.observedAt=new Date(Date.now()-480000).toISOString();op.outcome.evidence=e;
  sql(`SET session_replication_role=replica;${insertRelease(second,child)}${insertOperation(second,child,op)}SET session_replication_role=origin;`);
  const immutable=sql(`SELECT snapshot::text FROM governed_releases WHERE id=${q(first)};SELECT to_jsonb(o)::text FROM governed_release_operations o WHERE release_id=${q(first)} ORDER BY sequence;SELECT to_jsonb(x)::text FROM governed_release_outcomes x WHERE release_id=${q(first)} ORDER BY operation_id;`);
  assert.equal(baselineProven(second,op,e),'t');
  const changeChild=(s:any,after:string)=>`BEGIN;SET session_replication_role=replica;UPDATE governed_releases SET snapshot=${json(s)} WHERE id=${q(second)};SET session_replication_role=origin;${after}ROLLBACK;`;
  for(const mutate of [(s:any)=>s.publishedGitBasis.pushOperationId=randomUUID(),(s:any)=>s.publishedGitBasis.mergeOperationId=randomUUID(),(s:any)=>s.publishedGitBasis.closureDigest='0'.repeat(64),(s:any)=>s.baselineRestart.releaseId=second,(s:any)=>s.commit='0'.repeat(40),(s:any)=>s.candidateTree='0'.repeat(40),(s:any)=>s.baseCommit='0'.repeat(40)]){
   const bad=structuredClone(child);mutate(bad);
   assert.equal(sql(changeChild(bad,`SELECT governed_release_failed_baseline_proven(${q(second)},${q(op.id)},${json(e)});`)),'f');
  }
  const extra={...structuredClone(op),id:randomUUID(),sequence:2,operation:'push',outcome:{...op.outcome,id:randomUUID()}};
  assert.equal(sql(`BEGIN;SET session_replication_role=replica;${insertOperation(second,child,extra)}SET session_replication_role=origin;SELECT governed_release_failed_baseline_proven(${q(second)},${q(op.id)},${json(e)});ROLLBACK;`),'f');

  const body=receipt(second,child,op,e),c2=randomUUID(),v2=randomUUID();
  assert.throws(()=>sql('BEGIN;'+close(second,body,c2,v2)+'ROLLBACK;'),/governed_release_failed_closure_invalid/);
  const m=child.manifest,t=m.deployment.targets[0],now=new Date(Date.now()-1000).toISOString();
  const keys=['legacy','health','inventory','fingerprint','capacity','maintenance','queue','protectedImages','backup'];
  const parity=['configurationParity','serviceIdentityParity','schemaDataSequenceCatalogParity','protectedImagesPresent','fixtureAbsent','noUnownedChanges','controlPlaneQuiescent','noCandidateQueue','normalCatalogComplete','priorReleaseClosed','databaseReadOnly','cadencesHeld','ingressOpen','workerStopped','writerLockAbsent','capacityQualified','backupPhysicalCopyVerified'];
  const zeros=['candidateQueueCount','activeQueueCount','activeOtherSessions','ownedTransactions','apiWrites','modelCalls','businessWrites','providerCalls'];
  const stableBaseline={...m.baseline};delete stableBaseline.observedAt;
  const proof:any={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',observedAt:now,applicationId:child.applicationId,hostId:child.hostId,targetId:t.targetId,
   commit:child.commit,candidateTree:child.candidateTree,baseCommit:child.baseCommit,baseTree:child.baseTree,manifestDigest:releaseDigest(m),baselineDigest:releaseDigest(stableBaseline),
   targetBaselineDigest:releaseDigest(t.baseline),protectedResourcesDigest:releaseDigest(m.cleanup.protectedResourceIds),rollbackDigest:releaseDigest(m.rollback),backupDigest:releaseDigest(m.backup),baselineRestartDigest:releaseDigest(child.baselineRestart),
   baseline:stableBaseline,receiptDigest:hash,actualReadTimes:Object.fromEntries(keys.map(k=>[k,now])),actualReadDigests:Object.fromEntries(keys.map(k=>[k,hash])),activeApplicationReleaseCount:1,
   ...Object.fromEntries(parity.map(k=>[k,true])),...Object.fromEntries(zeros.map(k=>[k,0]))};
  const seal=(v:any)=>{delete v.revalidationDigest;v.revalidationDigest=releaseDigest(v);return v;};
  body.absenceRevalidation={releaseId:second,evidenceDigest:releaseDigest(e),baseline:seal(proof)};
  const revalidation=(b:any)=>sql(`SELECT governed_release_compose_absence_revalidation_valid(r,${json(b)}) FROM governed_releases r WHERE id=${q(second)};`);
  assert.equal(revalidation(body),'t');
  sql('BEGIN;'+close(second,body,c2,v2)+'ROLLBACK;');
  for(const mutate of [
   (b:any)=>b.absenceRevalidation.releaseId=first,
   (b:any)=>b.absenceRevalidation.evidenceDigest='0'.repeat(64),
   (b:any)=>b.absenceRevalidation.baseline.activeApplicationReleaseCount=0,
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.queue=new Date(Date.now()-301000).toISOString(),
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.queue=new Date(Date.now()+60000).toISOString(),
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.queue=new Date(Date.parse(b.nativeClosure.observedAt)+1000).toISOString(),
   (b:any)=>delete b.absenceRevalidation.baseline.actualReadDigests.health,
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.unknown=now,
   (b:any)=>b.absenceRevalidation.baseline.schemaDataSequenceCatalogParity=false,
   (b:any)=>b.absenceRevalidation.baseline.activeOtherSessions=1,
   (b:any)=>b.absenceRevalidation.baseline.rollbackDigest='0'.repeat(64),
   (b:any)=>b.absenceRevalidation.baseline.baseline.dataDigest='0'.repeat(64),
   (b:any)=>b.nativeClosure.observedAt=new Date(Date.parse(now)-1000).toISOString()
  ]) {
   const bad=structuredClone(body);mutate(bad);seal(bad.absenceRevalidation.baseline);
   assert.equal(revalidation(bad),'f');
   assert.throws(()=>sql('BEGIN;'+close(second,bad,c2,v2)+'ROLLBACK;'),/governed_release_(?:failed_closure_invalid|compose_native_closure_unproven)/);
  }
  const invalid=structuredClone(body);invalid.absenceRevalidation.baseline.revalidationDigest='0'.repeat(64);
  assert.equal(revalidation(invalid),'f');
  assert.throws(()=>sql('BEGIN;'+close(second,invalid,c2,v2)+'ROLLBACK;'),/governed_release_failed_closure_invalid/);
  const third=randomUUID();
  assert.throws(()=>sql(`BEGIN;SET session_replication_role=replica;${insertRelease(third,{...child,releaseExecutionId:randomUUID()})}SET session_replication_role=origin;${close(second,body,c2,v2)}ROLLBACK;`),/governed_release_failed_closure_invalid/);
  // Even fresh original evidence cannot carry an invalid optional revalidation.
  const fresh=structuredClone(e);fresh.observedAt=new Date(Date.now()-1000).toISOString();
  const freshBody=structuredClone(body);freshBody.evidence=fresh;freshBody.failedEvidenceDigest=releaseDigest(fresh);freshBody.nativeClosure.evidenceDigest=releaseDigest(fresh);
  freshBody.ownerAuthenticatedAt=new Date().toISOString();freshBody.nativeClosure.observedAt=freshBody.ownerAuthenticatedAt;
  freshBody.absenceRevalidation.evidenceDigest=releaseDigest(fresh);freshBody.absenceRevalidation.baseline.controlPlaneQuiescent=false;seal(freshBody.absenceRevalidation.baseline);
  sql(`SET session_replication_role=replica;UPDATE governed_release_outcomes SET evidence=${json(fresh)} WHERE id=${q(op.outcome.id)};SET session_replication_role=origin;`);
  freshBody.expectedVersion=sql(`SELECT governed_release_successor_version(${q(second)});`);
  assert.throws(()=>sql('BEGIN;'+close(second,freshBody,c2,v2)+'ROLLBACK;'),/governed_release_failed_closure_invalid/);
  const freshValid=structuredClone(freshBody);freshValid.absenceRevalidation.baseline.controlPlaneQuiescent=true;seal(freshValid.absenceRevalidation.baseline);
  sql('BEGIN;'+close(second,freshValid,c2,v2)+'ROLLBACK;');
  sql(`SET session_replication_role=replica;UPDATE governed_release_outcomes SET evidence=${json(e)} WHERE id=${q(op.outcome.id)};SET session_replication_role=origin;`);

  sql('BEGIN;'+close(second,body,c2,v2)+revoke(second,c2,v2)+'COMMIT;');
  const next=structuredClone(child);delete next.publishedGitBasis;
  Object.assign(next,{releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),baselineRestart:{releaseId:second,expectedVersion:sql(`SELECT governed_release_successor_version(${q(second)});`),closureId:c2,consentDigest:body.consentDigest}});
  const basis=JSON.parse(sql(`SELECT governed_release_published_git_basis(${q(second)},${json(next)})::text;`));
  for(const key of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'])assert.equal(basis[key],child.publishedGitBasis[key]);
  assert.equal(basis.releaseId,second);assert.equal(basis.closureId,c2);assert.equal(basis.composeEvidenceDigest,releaseDigest(e));
  assert.equal(sql(`SELECT snapshot->'evidence'->>'observedAt' FROM governed_release_failed_closures WHERE id=${q(c2)};`),e.observedAt);
  assert.equal(sql(`SELECT snapshot->'manifest'->'baseline'->>'observedAt' FROM governed_releases WHERE id=${q(second)};`),child.manifest.baseline.observedAt);
  assert.equal(sql(`SELECT snapshot::text FROM governed_releases WHERE id=${q(first)};SELECT to_jsonb(o)::text FROM governed_release_operations o WHERE release_id=${q(first)} ORDER BY sequence;SELECT to_jsonb(x)::text FROM governed_release_outcomes x WHERE release_id=${q(first)} ORDER BY operation_id;`),immutable);
 } finally {
  if(created)execFileSync('docker',[...dockerExec,'dropdb','--force','-U',postgresUser,database],{windowsHide:true});
 }
});
