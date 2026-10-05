import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {releaseDigest,releaseFailedClosureError,releaseHasPublishedGitBasis,releasePublishedGitBasis} from '../modules/agent-runtime/governed-release-contract';
import {wire} from '../modules/agent-runtime/task-review-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const reads=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-baseline-revalidation.cjs'));
const compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
const {fixture,hash}=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));
const migration='20261005230000_compose_queue_absence_closure_adoption';
const source=(name:string)=>readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
const ddl=source(migration);

function setup(inherited=true) {
 const f=fixture(),now=Date.now(),releaseId=randomUUID(),s:any={...f.s,manifest:f.m,requestId:randomUUID(),
  taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
  releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),
  materialVersion:hash('8'),releaserRevision:new Date(now-180000).toISOString(),expiresAt:new Date(now+3600000).toISOString(),
  manifestDigest:releaseDigest(f.m)};
 if(inherited) {
  s.baselineRestart={releaseId:randomUUID(),expectedVersion:hash('1'),closureId:randomUUID(),consentDigest:hash('2')};
  s.publishedGitBasis={schemaVersion:'roost-release-published-git-v1',basisKind:'compose_config_absence',
   releaseId:s.baselineRestart.releaseId,expectedVersion:s.baselineRestart.expectedVersion,closureId:s.baselineRestart.closureId,
   closureDigest:hash('3'),composeEvidenceDigest:hash('4'),pushOperationId:randomUUID(),prOperationId:randomUUID(),
   reviewOperationId:randomUUID(),mergeOperationId:randomUUID(),baselineDeploymentIds:[]};
  assert.equal(releaseHasPublishedGitBasis(s),true);
 }
 const r:any={id:releaseId,snapshot:s,manifest_digest:s.manifestDigest,workspace_id:randomUUID(),application_id:s.applicationId,
  task_id:s.taskId,host_id:s.hostId,issuer_user_id:randomUUID(),expires_at:new Date(now+3600000)};
 const journal:any[]=[];
 if(!inherited)for(const [index,operation]of ['push','pr','review','merge'].entries()) {
  const observedAt=new Date(now-150000+index*1000).toISOString();
  journal.push({id:randomUUID(),sequence:index+1,operation,createdAt:observedAt,intent:{},outcome:{id:randomUUID(),status:'succeeded',
   evidence:{observedAt,remoteCommit:s.commit,remoteTree:s.candidateTree,...(operation==='push'?{}:{pullRequestNumber:2,prHeadCommit:s.commit}),
    ...(operation==='review'?{reviewApproved:true}:{}),...(operation==='merge'?{prMerged:true,mergedCommit:s.commit}:{})}}});
 }
 for(const [index,operation]of ['deploy_config','deploy','rollback_config','rollback'].entries()) {
  const rollback=operation.startsWith('rollback'),expected=rollback?f.m.rollback:f.m.deployment;
  const createdAt=new Date(now-120000+index*15000).toISOString(),id=randomUUID();
  const intent={requestId:randomUUID(),operation,manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,
   expectedVersion:hash('9'),observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},
   parameters:{commit:rollback?s.baseCommit:s.commit,artifactSetDigest:expected.artifactSetDigest,configDigest:expected.configDigest,
    schemaDigest:expected.schemaDigest,...(operation.endsWith('_config')?{}:{targetId:f.target.targetId})}};
  let outcome:any;
  if(operation.endsWith('_config'))outcome={id:randomUUID(),status:'succeeded',observation_only:false,evidence:{
   observedAt:new Date(Date.parse(createdAt)+5000).toISOString(),deployedCommit:rollback?s.baseCommit:s.commit,
   artifactSetDigest:expected.artifactSetDigest,configDigest:expected.configDigest,schemaDigest:expected.schemaDigest}};
  else {
   const evidence=f.recoveryEvidence({...s,releaseId},{operationId:id,since:createdAt,rollback},'queue_absent');
   // The historical migrator is absent. No closure read creates a container.
   evidence.composeRecovery.baselineServices=evidence.composeRecovery.baselineServices.filter((row:any)=>row.role!=='migration');
   evidence.composeRecovery.services=evidence.composeRecovery.services.filter((row:any)=>row.role!=='migration');
   const proof=compose.qualifyComposeRetainedBaseline({configuration:f.target.baseline.configuration,images:f.target.baseline.images,
    services:evidence.composeRecovery.services,baselineServices:evidence.composeRecovery.baselineServices});
   evidence.deployedSetDigest=releaseDigest([{targetId:f.target.targetId,runtimeSetDigest:proof.runtimeSetDigest}]);
   evidence.observedAt=new Date(Date.parse(createdAt)+10000).toISOString();
   outcome={id:randomUUID(),status:'reconciled',reconciled_status:'failed',observation_only:true,evidence};
  }
  journal.push({id,sequence:journal.length+1,operation,createdAt,intent,outcome});
 }
 const state:any={release:r,journal,revocations:[],renewals:[],failedClosures:[]};
 state.expectedVersion=releaseDigest(wire({release:r,journal,revocations:[],renewals:[]}));
 const candidate=journal.at(-3),rollback=journal.at(-1),e=structuredClone(rollback.outcome.evidence);
 const input:any={requestId:randomUUID(),expectedVersion:state.expectedVersion,failedOperationId:rollback.id,consentDigest:hash('a'),evidence:e,
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId,operationId:rollback.id,agentHostId:s.hostId,
   evidenceDigest:releaseDigest(e),checkpointDigest:hash('b'),controllerPid:1234,registeredChildCount:10,
   allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:new Date(now-500).toISOString()}};
 const snapshot={...s,releaseId},baseline:any={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',
  ...shared.releaseComposeQueueAbsenceRevalidationBindings(snapshot),receiptDigest:hash('c'),observedAt:new Date(now-1000).toISOString(),
  actualReadTimes:Object.fromEntries(reads.readKeys.map((key:string)=>[key,new Date(now-1000).toISOString()])),
  actualReadDigests:Object.fromEntries(reads.readKeys.map((key:string)=>[key,hash('d')])),
  ...Object.fromEntries(reads.requiredParity.map((key:string)=>[key,true])),...Object.fromEntries(reads.zeroCounts.map((key:string)=>[key,0])),
  activeApplicationReleaseCount:1};
 input.absenceRevalidation={schemaVersion:'roost-compose-queue-absence-closure-revalidation-v1',releaseId,
  candidateOutcomeId:candidate.outcome.id,candidateEvidence:structuredClone(candidate.outcome.evidence),rollbackOutcomeId:rollback.outcome.id,
  rollbackEvidenceDigest:releaseDigest(e),nativeClosureDigest:releaseDigest(input.nativeClosure),configuration:structuredClone(f.target.rollbackConfiguration),
  services:structuredClone(e.composeRecovery.services),queues:[candidate,rollback].map(op=>({operationId:op.id,targetId:f.target.targetId,
   deploymentId:op.outcome.evidence.composeRecovery.deploymentId,queue:null})),baseline};
 const result={...f,s,now,snapshot,state,input,candidate,rollback};seal(result);return result;
}
function seal(f:any) {
 const a=f.input.absenceRevalidation;if(!a)return;
 a.baseline.revalidationDigest=shared.releaseBaselineRevalidationDigest(a.baseline);
 a.nativeClosureDigest=releaseDigest(f.input.nativeClosure??null);
 a.revalidationDigest=shared.releaseComposeQueueAbsenceRevalidationDigest(a);
}

function adoptionSetup(inherited=true,renewBackup=true) {
 const f=setup(inherited);assert.equal(releaseFailedClosureError(f.state,f.input),null);
 const closureId=randomUUID(),revocationId=randomUUID(),receipt=wire({...structuredClone(f.input),releaseId:f.state.release.id,
  applicationId:f.s.applicationId,hostId:f.s.hostId,issuerUserId:f.state.release.issuer_user_id,
  failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:releaseDigest(f.rollback.outcome.evidence)});
 const closure={id:closureId,consent_digest:f.input.consentDigest,closure_digest:releaseDigest(receipt),revocation_id:revocationId,snapshot:receipt};
 f.state.failedClosures=[closure];f.state.revocations=[{id:revocationId}];
 f.state.expectedVersion=releaseDigest(wire({release:f.state.release,journal:f.state.journal,revocations:f.state.revocations,renewals:[]}));
 const input:any={...structuredClone(f.s),requestId:randomUUID(),releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),
  expiresAt:new Date(f.now+1800000).toISOString(),baselineRestart:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion,
   closureId,consentDigest:closure.consent_digest}};
 delete input.publishedGitBasis;
 const renderer=hash('0'),backup=renewBackup?{digest:hash('e'),restoreDigest:hash('e'),bytes:20,
  capturedAt:new Date(f.now-10000).toISOString(),restoreVerifiedAt:new Date(f.now-5000).toISOString()}:f.m.backup;
 input.manifest=shared.releaseComposeQueueAbsenceAdoptionManifest(f.s,renderer,new Date(f.now).toISOString(),backup);
 assert(input.manifest,'the exact deterministic recipe must satisfy the unmodified manifest refinement');
 input.baselineAdoption={schemaVersion:'roost-compose-queue-absence-baseline-adoption-v1',releaseId:f.state.release.id,closureId,
  closureDigest:closure.closure_digest,failedOperationId:f.rollback.id,failedOutcomeId:f.rollback.outcome.id,
  failedEvidenceDigest:receipt.failedEvidenceDigest,targetId:f.target.targetId,previousManifestDigest:f.s.manifestDigest,
  previousRendererDigest:f.target.baseline.controllerInvariants.rendererDigest,newRendererDigest:renderer,
  previousRollbackConfigurationDigest:f.target.rollbackConfigDigest,retainedServicesDigest:releaseDigest(receipt.evidence.composeRecovery.services)};
 reseal(input,f.now);return{...f,closure,receipt,next:input,renderer};
}
function reseal(input:any,now:number) {
 const m=input.manifest,t=m.deployment.targets[0];
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);
 t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);t.sourceDigest=t.configuration.sourceDigest;
 t.baseline.sourceDigest=t.baseline.configuration.sourceDigest;
 m.deployment.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.configDigest}]);
 m.rollback.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.rollbackConfigDigest}]);
 m.baseline.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.baseline.configDigest}]);
 m.deployment.artifactSetDigest=shared.sourceArtifactDigest(m,input);m.rollback.artifactSetDigest=shared.sourceArtifactDigest(m,input,true);
 m.baseline.artifactSetDigest=shared.sourceArtifactDigest(m,input,'baseline');input.manifestDigest=releaseDigest(m);
 input.baselineRevalidation={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',
  ...shared.releaseBaselineRevalidationBindings(input),receiptDigest:hash('d'),observedAt:new Date(now).toISOString(),
  actualReadTimes:Object.fromEntries(reads.readKeys.map((key:string)=>[key,new Date(now).toISOString()])),
  actualReadDigests:Object.fromEntries(reads.readKeys.map((key:string)=>[key,hash('e')])),
  ...Object.fromEntries(reads.requiredParity.map((key:string)=>[key,true])),...Object.fromEntries(reads.zeroCounts.map((key:string)=>[key,0]))};
 input.baselineRevalidation.revalidationDigest=shared.releaseBaselineRevalidationDigest(input.baselineRevalidation);
}

test('additive migration preserves histories, applied guards and old paths without data mutations',()=>{
 assert(ddl.startsWith('BEGIN;')&&ddl.trim().endsWith('COMMIT;'));
 assert.doesNotMatch(ddl,/\b(?:DELETE FROM|UPDATE [a-z_]+ SET|INSERT INTO|DROP|TRUNCATE|ALTER TABLE|DISABLE TRIGGER|session_replication_role)\b/i);
 for(const name of ['governed_release_failed_baseline_pre_queue_absence_v1','governed_release_compose_absence_revalidation_pre_queue_v1','governed_release_published_git_pre_queue_absence_v1'])assert(ddl.includes(name));
 assert.doesNotMatch(ddl,/CREATE (?:OR REPLACE )?FUNCTION (?:agent_credential_guard|governed_release_insert_guard|governed_release_operation_guard|governed_release_failed_closure_guard)\(/);
});
test('SQL admits only the exact two absent queues and two proven configuration mutations',()=>{
 assert.doesNotMatch(ddl,/IS\s+(?:NOT\s+)?DISTINCT\s+FROM\s+CASE\b/i);
 assert.equal((ddl.match(/IS DISTINCT FROM \(CASE\b/g)??[]).length,6);
 for(const token of ["'deploy_config,deploy,rollback_config,rollback'","'push,pr,review,merge'","'queue_absent'","r->'queue' IS DISTINCT FROM 'null'::jsonb",
  "x->>'status' IS DISTINCT FROM 'succeeded'","x->>'reconciled_status' IS DISTINCT FROM 'failed'","r->'configuration' IS DISTINCT FROM config",
  'jsonb_array_length(ops) IS DISTINCT FROM 4','jsonb_array_length(ops) IS DISTINCT FROM 8','cardinality(visited)>=16'])assert(ddl.includes(token),token);
 assert(ddl.includes('governed_release_compose_config_absence_valid(s,projected_e'));
 assert(ddl.includes("'requestedCommit',s->'commit','requestedTree',s->'candidateTree'"));
});
test('SQL binds every fresh component read and full owner-native metadata without pretending to verify a private HMAC',()=>{
 for(const key of [...reads.readKeys,...reads.requiredParity,...reads.zeroCounts])assert(ddl.includes(`'${key}'`),key);
 for(const token of ['nativeClosureDigest','rollbackEvidenceDigest','candidateOutcomeId','rollbackOutcomeId',
  'governed_release_compose_owner_native_closure','active IS DISTINCT FROM ARRAY[r.id]',"interval '5 minutes'",
  "jsonb_typeof(n->'controllerPid') IS DISTINCT FROM 'number'","jsonb_typeof(n->'registeredChildCount') IS DISTINCT FROM 'number'",
  "a->'configuration' IS DISTINCT FROM t->'rollbackConfiguration'"])assert(ddl.includes(token),token);
 // Existing helper supplies checkpoint/evidence hashes, native flags, IDs and
 // positive counts. Its private HMAC key is deliberately absent from PostgreSQL.
 const native=source('20261005003000_compose_config_absence_closure');
 for(const key of ['checkpointDigest','allChildrenClosed','nativeProcessesAbsent','writerAbsent','evidenceDigest'])assert(native.includes(key));
 assert.doesNotMatch(ddl,/hmac\s*\(/i);
});
test('SQL reconstructs adoption bytes and all derived digests rather than excluding drift fields',()=>{
 for(const token of ["expected IS NOT DISTINCT FROM candidate","'{controllerPolicy,rendererDigest}'","'{controllerPolicy,phase}'",
  "'{deployment,artifactSetDigest}'","'{baseline,artifactSetDigest}'","'{rollback,artifactSetDigest}'",
  "'baselineAdoptionDigest'","'compose_queue_absence'",'governed_release_compose_restart_manifest_matches(previous,jsonb_set(previous'])assert(ddl.includes(token),token);
 const reconstruction=ddl.slice(ddl.indexOf('CREATE FUNCTION governed_release_compose_queue_adoption_manifest_matches'),ddl.indexOf('ALTER FUNCTION governed_release_published_git_basis'));
 assert.doesNotMatch(reconstruction,/'environmentDigest'\s*[,)]|'topology'\s*[,)]|'protectedResourceIds'\s*[,)]/);
 assert(source('20261003213000_governed_release_baseline_restart').includes("NEW.operation IN ('push','pr','review','merge')"));
});

// Explicit opt-in only. The default source run has no Docker/database effects.
// Root owns the actual release's BEGIN/ROLLBACK acceptance canary separately.
test('disposable PostgreSQL validates closure/adoption, rejects resealed drift and preserves unrelated guards',
 {skip:process.env.ROOST_QUEUE_ABSENCE_DATABASE_TEST!=='1'},()=>{
 const database='roost_test_queue_absence_'+randomUUID().replaceAll('-','');
 const dockerExec=process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER?['exec','-i',process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER]:['compose','exec','-T','postgres'];
 const user=process.env.ROOST_MIGRATION_TEST_POSTGRES_USER??'companycore';
 const args=[...dockerExec,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d',database];
 const q=(value:string)=>`'${value.replaceAll("'","''")}'`,json=(value:any)=>`${q(JSON.stringify(value))}::jsonb`;
 const sql=(input:string)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,timeout:30000}).trim();
 let created=false;
 try {
  execFileSync('docker',[...dockerExec,'createdb','-U',user,database],{windowsHide:true,timeout:30000});created=true;
  sql(readdirSync('prisma/migrations').filter(name=>/^\d/.test(name)&&name<migration).sort().map(source).join('\n'));
  const guards=['agent_credential_guard','governed_release_insert_guard','governed_release_operation_guard','governed_release_failed_closure_guard'];
  const definitions=guards.map(name=>sql(`SELECT pg_get_functiondef('${name}()'::regprocedure);`));
  sql('BEGIN;'+ddl.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')+'ROLLBACK;');
  assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname='governed_release_compose_queue_absence_valid';"),'0');
  sql(ddl);
  for(const[index,name]of guards.entries())assert.equal(sql(`SELECT pg_get_functiondef('${name}()'::regprocedure);`),definitions[index]);
  const f=adoptionSetup(false),r=f.state.release,s=f.s,workspace=r.workspace_id,owner=r.issuer_user_id;
  // Seed only synthetic historical prerequisites in this new disposable DB.
  // Every closure, revocation, revalidation and lineage assertion enables guards.
  sql(`SET session_replication_role=replica;
   INSERT INTO users(id,email,password_hash,updated_at)VALUES(${q(owner)},'queue-absence@example.test','synthetic-not-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at)VALUES(${q(workspace)},'Synthetic queue closure',${q(owner)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at)VALUES(${q(randomUUID())},${q(workspace)},${q(owner)},'owner',now());
   INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)
    VALUES(${q(r.id)},${q(workspace)},${q(s.taskId)},${q(s.applicationId)},${q(s.hostId)},${q(s.releaseExecutionId)},${q(s.reviewId)},${q(s.releaserAgentId)},${q(s.releaserCredentialId)},1,${q(owner)},now()+interval '1 hour',${q(s.manifestDigest)},${q(hash('a'))},${json(s)},${q(randomUUID())},'synthetic-release');
   ${f.state.journal.map((op:any)=>`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash,created_at)
    VALUES(${q(op.id)},${q(r.id)},${q(workspace)},${q(s.applicationId)},${op.sequence},${q(op.operation)},${json(op.intent)},${q(randomUUID())},'synthetic-operation',${q(op.createdAt)});
    INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
     VALUES(${q(op.outcome.id)},${q(r.id)},${q(op.id)},${q(workspace)},${q(op.outcome.status)},${op.outcome.reconciled_status?q(op.outcome.reconciled_status):'NULL'},${op.outcome.observation_only===true},${json(op.outcome.evidence)},${q(randomUUID())},'synthetic-outcome');`).join('\n')}
   SET session_replication_role=origin;`);
  for(const op of [f.candidate,f.rollback])assert.equal(sql(`SELECT governed_release_compose_queue_absence_valid(${json(f.snapshot)},${json(op.outcome.evidence)},${json(op)});`),'t');
  assert.equal(sql(`SELECT governed_release_failed_baseline_proven(${q(r.id)},${q(f.rollback.id)},${json(f.input.evidence)});`),'t');
  const body:any={...structuredClone(f.input),releaseId:r.id,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:owner,
   ownerAuthenticatedAt:new Date().toISOString(),failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:releaseDigest(f.input.evidence),
   expectedVersion:sql(`SELECT governed_release_successor_version(${q(r.id)});`)};
  const check=(b:any)=>sql(`SELECT governed_release_compose_queue_revalidation_valid(r,${json(b)},TRUE) FROM governed_releases r WHERE id=${q(r.id)};`);
  assert.equal(check(body),'t');
  const close=(b:any)=>`INSERT INTO governed_release_failed_closures(id,release_id,workspace_id,issuer_user_id,owner_authenticated_at,failed_operation_id,failed_outcome_id,expected_version,consent_digest,closure_digest,revocation_id,snapshot,request_id,request_hash)
   VALUES(${q(f.closure.id)},${q(r.id)},${q(workspace)},${q(owner)},${q(b.ownerAuthenticatedAt)},${q(f.rollback.id)},${q(f.rollback.outcome.id)},${q(b.expectedVersion)},${q(b.consentDigest)},${q(releaseDigest(b))},${q(f.closure.revocation_id)},${json(b)},${q(randomUUID())},'synthetic-close');`;
  const revoke=`INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash)VALUES(${q(f.closure.revocation_id)},${q(r.id)},${q(workspace)},${q(owner)},${q('Closed FAILED; owner baseline receipt '+f.closure.id)},${q(randomUUID())},'synthetic-revocation');`;
  const mutations=[(b:any)=>b.nativeClosure.writerAbsent=false,(b:any)=>b.nativeClosure.checkpointDigest='bad',
   (b:any)=>b.absenceRevalidation.queues[0].deploymentId='foreign',
   (b:any)=>b.absenceRevalidation.configuration=structuredClone(f.target.baseline.configuration),
   (b:any)=>b.absenceRevalidation.services[0].containerId=hash('a'),
   (b:any)=>b.absenceRevalidation.baseline.actualReadTimes.health=new Date(Date.now()-301000).toISOString(),
   (b:any)=>delete b.absenceRevalidation.baseline.actualReadDigests.queue,
   (b:any)=>b.absenceRevalidation.baseline.databaseReadOnly=false];
  for(const mutate of mutations) {
   const bad=structuredClone(body);mutate(bad);seal({input:bad});assert.equal(check(bad),'f');
   assert.throws(()=>sql('BEGIN;'+close(bad)+'ROLLBACK;'),/governed_release_(?:compose_queue_closure_unproven|failed_closure_invalid)/);
  }
  sql('BEGIN;'+close(body)+revoke+'SET CONSTRAINTS ALL IMMEDIATE;COMMIT;');
  const candidate=structuredClone(f.next);candidate.baselineRestart.expectedVersion=sql(`SELECT governed_release_successor_version(${q(r.id)});`);
  candidate.baselineAdoption.closureDigest=releaseDigest(body);reseal(candidate,Date.now());
  assert.equal(sql(`SELECT governed_release_compose_queue_adoption_manifest_matches(${json(s)},${json(candidate.manifest)},${json(candidate.baselineAdoption)});`),'t');
  const basis=JSON.parse(sql(`SELECT governed_release_published_git_basis(${q(r.id)},${json(candidate)})::text;`));
  assert.equal(basis.basisKind,'compose_queue_absence');assert.deepEqual(basis.baselineDeploymentIds,[]);
  for(const[index,key]of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'].entries())assert.equal(basis[key],f.state.journal[index].id);
  const before=sql(`SELECT snapshot::text FROM governed_releases WHERE id=${q(r.id)};SELECT snapshot::text FROM governed_release_failed_closures WHERE release_id=${q(r.id)};`);
  for(const mutate of [(c:any)=>c.manifest.deployment.targets[0].configuration.environmentDigest=hash('a'),
   (c:any)=>c.manifest.deployment.targets[0].rollbackConfiguration.controllerPolicy.startCommandDigest=hash('0'),
   (c:any)=>c.baselineAdoption.previousRollbackConfigurationDigest=hash('a'),(c:any)=>c.releaserCredentialId=s.releaserCredentialId]) {
   const bad=structuredClone(candidate);mutate(bad);reseal(bad,Date.now());
   assert.equal(sql(`SELECT governed_release_published_git_basis(${q(r.id)},${json(bad)}) IS NULL;`),'t');
  }
  assert.equal(sql(`SELECT snapshot::text FROM governed_releases WHERE id=${q(r.id)};SELECT snapshot::text FROM governed_release_failed_closures WHERE release_id=${q(r.id)};`),before);
 }finally{if(created)execFileSync('docker',[...dockerExec,'dropdb','--force','-U',user,database],{windowsHide:true,timeout:30000});}
});
