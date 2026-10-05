import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {configAbsenceFixture} from './governed-release-compose-config-absence.test';
import {releaseDigest} from '../modules/agent-runtime/governed-release-contract';

const migration='20261005033000_compose_restart_backup_refresh';
const source=(n:string)=>readFileSync(`prisma/migrations/${n}/migration.sql`,'utf8');
const hash='a'.repeat(64);

test('backup-only Compose restart migration preserves rows and unrelated admission guards',()=>{
 const s=source(migration);
 assert.ok(s.startsWith('BEGIN;')&&s.trim().endsWith('COMMIT;'));
 assert.doesNotMatch(s,/\b(?:DELETE FROM|UPDATE [a-z_]+ SET|INSERT INTO|DROP|TRUNCATE|ALTER TABLE)\b/i);
 assert.doesNotMatch(s,/CREATE OR REPLACE FUNCTION (?:agent_credential_guard|governed_release_insert_guard|governed_release_failed_closure_guard)\(/);
});

test('real disposable PostgreSQL permits fresh restored backup through authentic inherited Git and rejects other scope changes',()=>{
 const database='roost_test_backup_restart_'+randomUUID().replaceAll('-','');
 const dockerExec=process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER?['exec','-i',process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER]:['compose','exec','-T','postgres'];
 const postgresUser=process.env.ROOST_MIGRATION_TEST_POSTGRES_USER??'companycore';
 const args=[...dockerExec,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',postgresUser,'-d',database];
 const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const sql=(input:string)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
 let created=false;
 try {
  execFileSync('docker',[...dockerExec,'createdb','-U',postgresUser,database],{windowsHide:true});created=true;
  sql(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)&&n<migration).sort().map(source).join('\n'));
  const functionDefinition=(n:string)=>sql(`SELECT pg_get_functiondef('${n}()'::regprocedure);`);
  const guards=Object.fromEntries(['agent_credential_guard','governed_release_insert_guard','governed_release_failed_closure_guard'].map(n=>[n,functionDefinition(n)]));
  const priorPublished=sql("SELECT prosrc FROM pg_proc WHERE proname='governed_release_published_git_basis';");
  const rows=()=>sql('SELECT count(*) FROM governed_releases;SELECT count(*) FROM api_keys;SELECT count(*) FROM governed_release_operations;');
  const beforeCounts=rows();
  sql('BEGIN;'+source(migration).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')+'ROLLBACK;');
  assert.equal(sql("SELECT prosrc FROM pg_proc WHERE proname='governed_release_published_git_basis';"),priorPublished);
  assert.equal(rows(),beforeCounts);
  sql(source(migration));
  assert.equal(rows(),beforeCounts);
  for(const[n,s]of Object.entries(guards))assert.equal(functionDefinition(n),s);

  const f=configAbsenceFixture(),workspace=randomUUID(),user=randomUUID(),first=f.state.release.id;
  const initial=structuredClone(f.s),since=new Date(Date.now()-60000).toISOString();
  f.e.composeConfigAbsence.since=since;f.e.observedAt=new Date(Date.now()-1000).toISOString();f.operation.createdAt=since;
  const insertRelease=(id:string,s:any)=>`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)VALUES(${q(id)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(s.releaseExecutionId)},${q(s.reviewId)},${q(s.releaserAgentId)},${q(s.releaserCredentialId)},1,${q(user)},now()+interval '1 hour',${q(s.manifestDigest)},${q(hash)},${json(s)},${q(randomUUID())},${q(hash)});`;
  const insertOperation=(id:string,s:any,j:any)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash,created_at)VALUES(${q(j.id)},${q(id)},${q(workspace)},${q(s.applicationId)},${j.sequence},${q(j.operation)},${json(j.intent)},${q(randomUUID())},'synthetic-operation',${q(j.createdAt??since)});INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)VALUES(${q(j.outcome.id)},${q(id)},${q(j.id)},${q(workspace)},${q(j.outcome.status)},${j.outcome.reconciled_status?q(j.outcome.reconciled_status):'NULL'},${j.outcome.observation_only===true},${json(j.outcome.evidence)},${q(randomUUID())},'synthetic-outcome');`;
  // Bypass guards solely to seed synthetic prerequisites in this disposable DB.
  // Actual closure/revocation and subsequent basis checks use enabled guards.
  sql(`SET session_replication_role=replica;INSERT INTO users(id,email,password_hash,updated_at)VALUES(${q(user)},'backup-restart@example.test','not-a-real-login',now());INSERT INTO workspaces(id,name,owner_user_id,updated_at)VALUES(${q(workspace)},'Synthetic backup restart',${q(user)},now());INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at)VALUES(${q(randomUUID())},${q(workspace)},${q(user)},'owner',now());${insertRelease(first,initial)}${f.state.journal.map((j:any)=>insertOperation(first,initial,j)).join('\n')}SET session_replication_role=origin;`);
  const receipt=(id:string,s:any,op:any,e:any)=>{const authenticatedAt=new Date().toISOString();return{...f.body,requestId:randomUUID(),expectedVersion:sql(`SELECT governed_release_successor_version(${q(id)});`),failedOperationId:op.id,evidence:e,nativeClosure:{...f.body.nativeClosure,releaseId:id,operationId:op.id,agentHostId:s.hostId,evidenceDigest:releaseDigest(e),observedAt:authenticatedAt},releaseId:id,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:user,ownerAuthenticatedAt:authenticatedAt,failedOutcomeId:op.outcome.id,failedEvidenceDigest:releaseDigest(e)};};
  const close=(id:string,b:any,c:string,v:string)=>`INSERT INTO governed_release_failed_closures(id,release_id,workspace_id,issuer_user_id,owner_authenticated_at,failed_operation_id,failed_outcome_id,expected_version,consent_digest,closure_digest,revocation_id,snapshot,request_id,request_hash)VALUES(${q(c)},${q(id)},${q(workspace)},${q(user)},${q(b.ownerAuthenticatedAt)},${q(b.failedOperationId)},${q(b.failedOutcomeId)},${q(b.expectedVersion)},${q(b.consentDigest)},${q(releaseDigest(b))},${q(v)},${json(b)},${q(randomUUID())},'synthetic-closure');INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)VALUES(${q(v)},${q(id)},${q(workspace)},${q(user)},${q('Closed FAILED; owner baseline receipt '+c)},${q(randomUUID())},'synthetic-revocation');`;
  const c1=randomUUID(),v1=randomUUID(),body1=receipt(first,initial,f.operation,f.e);
  sql('BEGIN;'+close(first,body1,c1,v1)+'COMMIT;');
  const history=()=>sql(`SELECT snapshot::text FROM governed_releases ORDER BY id;SELECT to_jsonb(o)::text FROM governed_release_operations o ORDER BY id;SELECT to_jsonb(x)::text FROM governed_release_outcomes x ORDER BY id;SELECT to_jsonb(c)::text FROM governed_release_failed_closures c ORDER BY id;SELECT to_jsonb(v)::text FROM governed_release_revocations v ORDER BY id;`);
  const originalHistory=history();
  const next=(s:any,id:string,c:string,consent:string)=>({...structuredClone(s),releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),baselineRestart:{releaseId:id,expectedVersion:sql(`SELECT governed_release_successor_version(${q(id)});`),closureId:c,consentDigest:consent}});
  const refreshed=(s:any,digest:string,offset:number)=>{const t=structuredClone(s);delete t.publishedGitBasis;const at=Date.now();t.manifest.backup={digest,restoreDigest:digest,bytes:64,capturedAt:new Date(at-5000+offset).toISOString(),restoreVerifiedAt:new Date(at-4000+offset).toISOString()};t.manifest.baseline.observedAt=new Date(at-1000).toISOString();t.manifestDigest=releaseDigest(t.manifest);return t;};
  const published=(id:string,s:any)=>sql(`SELECT governed_release_published_git_basis(${q(id)},${json(s)})::text;`);
  const plain=next(initial,first,c1,body1.consentDigest);
  assert.ok(published(first,plain)); // Historical unchanged backup stays supported.
  const child=refreshed(plain,'e'.repeat(64),0);
  child.publishedGitBasis=JSON.parse(published(first,child));
  for(const[i,k]of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'].entries())assert.equal(child.publishedGitBasis[k],f.state.journal[i].id);
  assert.equal(child.publishedGitBasis.releaseId,first);assert.equal(child.publishedGitBasis.closureId,c1);
  const mutations:Array<[string,(s:any)=>void]>=[
   ['config',(s:any)=>s.manifest.deployment.targets[0].configuration.environmentDigest='0'.repeat(64)],
   ['image',(s:any)=>s.manifest.deployment.targets[0].baseline.images[0].imageDigest='sha256:'+'0'.repeat(64)],
   ['schema',(s:any)=>s.manifest.baseline.schemaDigest='0'.repeat(64)],
   ['data',(s:any)=>s.manifest.baseline.dataDigest='0'.repeat(64)],
   ['health',(s:any)=>s.manifest.baseline.healthDigest='0'.repeat(64)],
   ['observation',(s:any)=>s.manifest.observation.seconds++],
   ['controller policy',(s:any)=>s.manifest.deployment.targets[0].configuration.controllerPolicy.artifactDigest='0'.repeat(64)],
   ['protected images',(s:any)=>s.manifest.cleanup.protectedResourceIds=[]],
   ['candidate commit',(s:any)=>s.commit='0'.repeat(40)],
   ['candidate tree',(s:any)=>s.candidateTree='0'.repeat(40)],
   ['base commit',(s:any)=>s.baseCommit='0'.repeat(40)],
   ['clock-only relabel',(s:any)=>s.manifest.backup.digest=s.manifest.backup.restoreDigest=initial.manifest.backup.digest],
   ['mismatched restore',(s:any)=>s.manifest.backup.restoreDigest='1'.repeat(64)],
   ['null digest and restore',(s:any)=>s.manifest.backup.digest=s.manifest.backup.restoreDigest=null],
   ['null captured clock',(s:any)=>s.manifest.backup.capturedAt=null],
   ['null restore clock',(s:any)=>s.manifest.backup.restoreVerifiedAt=null],
   ['empty archive',(s:any)=>s.manifest.backup.bytes=0],
   ['negative archive',(s:any)=>s.manifest.backup.bytes=-1],
   ['fractional archive',(s:any)=>s.manifest.backup.bytes=1.5],
   ['string archive',(s:any)=>s.manifest.backup.bytes='64'],
   ['old captured clock',(s:any)=>s.manifest.backup.capturedAt=initial.manifest.backup.capturedAt],
   ['equal old restore clock',(s:any)=>s.manifest.backup.capturedAt=initial.manifest.backup.restoreVerifiedAt],
   ['restore before capture',(s:any)=>s.manifest.backup.restoreVerifiedAt=new Date(Date.parse(s.manifest.backup.capturedAt)-1).toISOString()],
   ['bad date',(s:any)=>s.manifest.backup.capturedAt='not-a-date'],
   ['extra backup authority',(s:any)=>s.manifest.backup.restored=true],
   ['missing backup restore',(s:any)=>delete s.manifest.backup.restoreVerifiedAt],
   ['reuse runtime',(s:any)=>s.releaseExecutionId=initial.releaseExecutionId],
   ['reuse credential',(s:any)=>s.releaserCredentialId=initial.releaserCredentialId]
  ];
  for(const[label,mutate]of mutations){const bad=structuredClone(child);delete bad.publishedGitBasis;mutate(bad);bad.manifestDigest=releaseDigest(bad.manifest);assert.equal(published(first,bad),'',label);}
  assert.equal(history(),originalHistory);

  // Admit a synthetic successor with the authentic rebuilt basis; its sole
  // config operation is reconciled ABSENT and closes through normal triggers.
  const second=randomUUID(),op=structuredClone(f.operation),e=structuredClone(f.e);op.id=randomUUID();op.sequence=1;op.outcome.id=randomUUID();op.createdAt=new Date(Date.now()-10000).toISOString();e.composeConfigAbsence.releaseId=second;e.composeConfigAbsence.operationId=op.id;e.composeConfigAbsence.since=op.createdAt;e.observedAt=new Date(Date.now()-1000).toISOString();op.outcome.evidence=e;
  sql(`SET session_replication_role=replica;${insertRelease(second,child)}${insertOperation(second,child,op)}SET session_replication_role=origin;`);
  assert.equal(sql(`SELECT governed_release_failed_baseline_proven(${q(second)},${q(op.id)},${json(e)});`),'t');
  const c2=randomUUID(),v2=randomUUID(),body2=receipt(second,child,op,e);
  sql('BEGIN;'+close(second,body2,c2,v2)+'COMMIT;');
  const afterClosure=history(),successor=refreshed(next(child,second,c2,body2.consentDigest),'9'.repeat(64),2000);
  const inherited=JSON.parse(published(second,successor));
  for(const key of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'])assert.equal(inherited[key],child.publishedGitBasis[key]);
  assert.equal(inherited.releaseId,second);assert.equal(inherited.closureId,c2);assert.equal(inherited.composeEvidenceDigest,releaseDigest(e));
  const badHistory=structuredClone(child);badHistory.publishedGitBasis.mergeOperationId=randomUUID();
  assert.equal(sql(`BEGIN;SET session_replication_role=replica;UPDATE governed_releases SET snapshot=${json(badHistory)} WHERE id=${q(second)};SET session_replication_role=origin;SELECT governed_release_published_git_basis(${q(second)},${json(successor)})::text;ROLLBACK;`),'');
  const reused=structuredClone(successor);reused.manifest.backup.digest=reused.manifest.backup.restoreDigest=child.manifest.backup.digest;reused.manifestDigest=releaseDigest(reused.manifest);assert.equal(published(second,reused),'');
  const staleScope=structuredClone(successor);staleScope.manifest.baseline.dataDigest='0'.repeat(64);staleScope.manifestDigest=releaseDigest(staleScope.manifest);assert.equal(published(second,staleScope),'');
  assert.equal(history(),afterClosure);
  assert.equal(sql(`SELECT snapshot->'evidence'->>'observedAt' FROM governed_release_failed_closures WHERE id=${q(c2)};`),e.observedAt);
  assert.equal(sql(`SELECT snapshot->'manifest'->'backup'->>'restoreVerifiedAt' FROM governed_releases WHERE id=${q(first)};`),initial.manifest.backup.restoreVerifiedAt);
  for(const[n,s]of Object.entries(guards))assert.equal(functionDefinition(n),s);
 }finally{if(created)execFileSync('docker',[...dockerExec,'dropdb','--force','-U',postgresUser,database],{windowsHide:true});}
});
