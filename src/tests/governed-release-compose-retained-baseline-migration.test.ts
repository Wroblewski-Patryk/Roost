import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {retainedBaselineFixture} from './governed-release-compose-retained-baseline.test';
import {releaseDigest} from '../modules/agent-runtime/governed-release-contract';

const migration='20261006143000_compose_retained_baseline_recovery';
const source=(name:string)=>readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
test('retained-baseline migration is additive and preserves historical data and original guards',()=>{
 const sql=source(migration);
 assert(sql.startsWith('BEGIN;')&&sql.trim().endsWith('COMMIT;'));
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|UPDATE [a-z_]+ SET|INSERT INTO|DROP|TRUNCATE|ALTER TABLE)\b/i);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION (?:agent_credential_guard|governed_release_insert_guard|governed_release_failed_closure_guard)/);
 assert.match(sql,/r->'queue'->>'status' IS DISTINCT FROM 'failed'/);
 assert.match(sql,/governed_release_compose_retained_revalidation_valid/);
 assert.match(sql,/candidate->>'reviewId' IS NOT DISTINCT FROM s->>'reviewId'/);
});

test('real disposable PostgreSQL retains terminal queues, protects closure and qualifies only controller repair',()=>{
 const database='roost_test_retained_'+randomUUID().replaceAll('-','');
 const dockerExec=process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER?['exec','-i',process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER]:['compose','exec','-T','postgres'];
 const user=process.env.ROOST_MIGRATION_TEST_POSTGRES_USER??'companycore';
 const args=[...dockerExec,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d',database];
 const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const sql=(input:string)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
 let created=false;
 try {
  execFileSync('docker',[...dockerExec,'createdb','-U',user,database],{windowsHide:true});created=true;
  sql(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)&&n<migration).sort().map(source).join('\n'));
  const guards=()=>sql("SELECT pg_get_functiondef('agent_credential_guard()'::regprocedure);SELECT pg_get_functiondef('governed_release_failed_closure_guard()'::regprocedure);");
  const before=guards();
  sql('BEGIN;'+source(migration).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')+'ROLLBACK;');
  assert.equal(guards(),before);
  assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname='governed_release_compose_retained_git';"),'0');
  sql(source(migration));assert.equal(guards(),before);
  const f=retainedBaselineFixture(false),r=f.state.release,s=f.s,h='a'.repeat(64);
  const insertRelease=`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)
   VALUES(${q(r.id)},${q(r.workspace_id)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(s.releaseExecutionId)},${q(s.reviewId)},${q(s.releaserAgentId)},${q(s.releaserCredentialId)},1,${q(r.issuer_user_id)},now()+interval '1 hour',${q(s.manifestDigest)},${q(h)},${json(s)},${q(randomUUID())},${q(h)});`;
  // These are synthetic prerequisites in a disposable DB. Closure and adoption
  // qualification below use enabled guards, never the production database.
  sql(`SET session_replication_role=replica;
   INSERT INTO users(id,email,password_hash,updated_at)VALUES(${q(r.issuer_user_id)},'retained@example.test','not-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at)VALUES(${q(r.workspace_id)},'Synthetic retained baseline',${q(r.issuer_user_id)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at)VALUES(${q(randomUUID())},${q(r.workspace_id)},${q(r.issuer_user_id)},'owner',now());
   ${insertRelease}${f.state.journal.map((j:any)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash,created_at)
    VALUES(${q(j.id)},${q(r.id)},${q(r.workspace_id)},${q(s.applicationId)},${j.sequence},${q(j.operation)},${json(j.intent)},${q(randomUUID())},'synthetic',${q(j.createdAt)});
    INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
    VALUES(${q(j.outcome.id)},${q(r.id)},${q(j.id)},${q(r.workspace_id)},${q(j.outcome.status)},${j.outcome.reconciled_status?q(j.outcome.reconciled_status):'NULL'},${j.outcome.observation_only===true},${json(j.outcome.evidence)},${q(randomUUID())},'synthetic');`).join('\n')}
   SET session_replication_role=origin;`);
  const qualify=(e:any)=>sql(`SELECT governed_release_compose_retained_valid(${json(f.snapshot)},${json(e)},${json(f.rollback)});`);
  assert.equal(qualify(f.input.evidence),'t');
  for(const change of [(e:any)=>e.composeRecovery.queue.finishedAt=null,(e:any)=>e.composeRecovery.queue.status='cancelled-by-user',
   (e:any)=>e.composeRecovery.queue.deploymentId='borrowed',(e:any)=>e.composeRecovery.services[0].mountDigest=h,
   (e:any)=>e.composeRecovery.controlPlaneQuiescent=false,(e:any)=>e.absenceVerified=true]){
   const bad=structuredClone(f.input.evidence);change(bad);assert.equal(qualify(bad),'f');
  }
  assert.equal(sql(`SELECT governed_release_failed_baseline_proven(${q(r.id)},${q(f.rollback.id)},${json(f.input.evidence)});`),'t');
  const body={...structuredClone(f.input),releaseId:r.id,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:r.issuer_user_id,
   expectedVersion:sql(`SELECT governed_release_successor_version(${q(r.id)});`),ownerAuthenticatedAt:new Date().toISOString(),
   failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:releaseDigest(f.input.evidence)};
  const revalidate=(b:any)=>sql(`SELECT governed_release_compose_retained_revalidation_valid((SELECT r FROM governed_releases r WHERE id=${q(r.id)}),${json(b)},TRUE);`);
  assert.equal(revalidate(body),'t');
  for(const change of [(b:any)=>b.nativeClosure.writerAbsent=false,(b:any)=>b.absenceRevalidation.queues[0].queue=null,
   (b:any)=>Object.assign(b.absenceRevalidation.baseline,{noCandidateQueue:true,candidateQueueCount:0}),
   (b:any)=>b.absenceRevalidation.baseline.candidateQueueCount=2,
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.inventory=new Date(Date.now()-301000).toISOString()]){
   const bad=structuredClone(body);change(bad);
   bad.absenceRevalidation.nativeClosureDigest=releaseDigest(bad.nativeClosure);
   bad.absenceRevalidation.baseline.revalidationDigest=releaseDigest(Object.fromEntries(Object.entries(bad.absenceRevalidation.baseline).filter(([k])=>k!=='revalidationDigest')));
   bad.absenceRevalidation.revalidationDigest=releaseDigest(Object.fromEntries(Object.entries(bad.absenceRevalidation).filter(([k])=>k!=='revalidationDigest')));
   assert.equal(revalidate(bad),'f');
  }
  const closureId=randomUUID(),revocationId=randomUUID();
  sql(`BEGIN;INSERT INTO governed_release_failed_closures(id,release_id,workspace_id,issuer_user_id,owner_authenticated_at,failed_operation_id,failed_outcome_id,expected_version,consent_digest,closure_digest,revocation_id,snapshot,request_id,request_hash)
   VALUES(${q(closureId)},${q(r.id)},${q(r.workspace_id)},${q(r.issuer_user_id)},${q(body.ownerAuthenticatedAt)},${q(f.rollback.id)},${q(f.rollback.outcome.id)},${q(body.expectedVersion)},${q(body.consentDigest)},${q(releaseDigest(body))},${q(revocationId)},${json(body)},${q(randomUUID())},'synthetic');
   INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)VALUES(${q(revocationId)},${q(r.id)},${q(r.workspace_id)},${q(r.issuer_user_id)},${q('Closed FAILED; owner baseline receipt '+closureId)},${q(randomUUID())},'synthetic');COMMIT;`);
  const shared=require('../../scripts/lib/agent-host-release-contract.cjs'),renderer='0'.repeat(64);
  const adoption={schemaVersion:'roost-compose-retained-baseline-adoption-v1',releaseId:r.id,closureId,closureDigest:releaseDigest(body),
   failedOperationId:f.rollback.id,failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:body.failedEvidenceDigest,targetId:f.target.targetId,
   previousManifestDigest:s.manifestDigest,previousRendererDigest:f.target.baseline.controllerInvariants.rendererDigest,newRendererDigest:renderer,
   previousRollbackConfigurationDigest:f.target.rollbackConfigDigest,retainedServicesDigest:releaseDigest(body.evidence.composeRecovery.services),
   candidateControllerPolicy:{...f.target.configuration.controllerPolicy,rendererDigest:renderer,startCommandDigest:h},
   rollbackControllerPolicy:{...f.target.rollbackConfiguration.controllerPolicy,rendererDigest:renderer,startCommandDigest:h},
   candidateSettingsDigest:h,candidateRuntimePolicyDigest:h,rollbackSettingsDigest:h,rollbackRuntimePolicyDigest:h};
  const manifest=shared.releaseComposeRetainedBaselineAdoptionManifest(s,adoption,new Date().toISOString());assert(manifest);
  const matches=(m:any,a:any)=>sql(`SELECT governed_release_compose_retained_adoption_manifest_matches(${json(s)},${json(m)},${json(a)});`);
  assert.equal(matches(manifest,adoption),'t');
  for(const change of [(m:any)=>m.baseline.dataDigest=h,(m:any)=>m.observation.seconds++,
   (m:any)=>m.deployment.targets[0].configuration.environmentDigest=h]){
   const bad=structuredClone(manifest);change(bad);assert.equal(matches(bad,adoption),'f');
  }
  assert.equal(sql(`SELECT count(*) FROM governed_release_outcomes WHERE release_id=${q(r.id)} AND status='failed';`),'2');
 }finally{if(created)execFileSync('docker',[...dockerExec,'dropdb','-U',user,database],{windowsHide:true});}
});
