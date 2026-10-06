import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {releaseOutcomeError,releaseIntentError} from '../modules/agent-runtime/governed-release-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs')),
 compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs')),
 {fixture,hash,image}=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));
// Synthetic five-service migration failure, never production/runtime proof.
export function partialFixture(){const f=fixture(),t=f.target,m=f.m,s=f.s;
 const extra={name:'proactive',role:'cadence',source:'built',expectedState:'paused',mountDigest:hash('5')};
 for(const cfg of [t.configuration,t.baseline.configuration,t.rollbackConfiguration])cfg.services.push(structuredClone(extra));
 t.baseline.images.push({name:'proactive',imageDigest:image('4')});m.cleanup.protectedResourceIds.push(image('4'),hash('5'));
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);
 t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);
 for(const [key,configDigest]of [['deployment',t.configDigest],['baseline',t.baseline.configDigest],['rollback',t.rollbackConfigDigest]])
  m[key].configDigest=shared.releaseDigest([{targetId:t.targetId,configDigest}]);
 m.deployment.artifactSetDigest=shared.sourceArtifactDigest(m,s);m.baseline.artifactSetDigest=shared.sourceArtifactDigest(m,s,'baseline');m.rollback.artifactSetDigest=shared.sourceArtifactDigest(m,s,true);
 const releaseId=randomUUID(),operationId=randomUUID(),createdAt='2026-10-04T12:03:00.000Z',
  deploymentId='r'+shared.releaseDigest([releaseId,operationId,t.targetId,'candidate']).slice(0,23),
  before=f.evidence('baseline').composeTargets[0].runtime.services.filter((r:any)=>r.role!=='migration')
   .map((row:any)=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]]))),
  rows=t.configuration.services.map((d:any,n:number)=>({name:d.name,role:d.role,containerId:hash(['6','7','8','9','a'][n]),
   imageDigest:d.source==='image'?d.imageDigest:image('f'),mountDigest:d.mountDigest,state:d.role==='database'?'running':d.role==='migration'?'exited':'created',
   health:d.role==='database'?'healthy':null,exitCode:d.role==='migration'?1:0,createdAt:'2026-10-04T12:03:02.000Z',
   ...(d.source==='built'?{commit:s.commit,tree:s.candidateTree,deploymentId}:{})})),
  intent={requestId:randomUUID(),operation:'deploy',manifestDigest:shared.releaseDigest(m),commit:s.commit,baseCommit:s.baseCommit,expectedVersion:hash('9'),
   observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:shared.releaseDigest(m)},
   parameters:{targetId:t.targetId,commit:s.commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest}},
  op={id:operationId,operation:'deploy',createdAt,intent},r={schemaVersion:'roost-compose-recovery-observation-v1',kind:'queue_failed_partial',releaseId,operationId,
   since:createdAt,targetId:t.targetId,phase:'candidate',requestedCommit:s.commit,requestedTree:s.candidateTree,deploymentId,
   queue:{targetId:t.targetId,deploymentId,commit:s.commit,status:'failed',createdAt:'2026-10-04T12:03:01.000Z',finishedAt:'2026-10-04T12:03:05.000Z'},
   controlPlaneQuiescent:true,configuration:structuredClone(t.configuration),baselineCommit:s.baseCommit,baselineTree:s.baseTree,migrationSchemaVerified:true,
   baselineServices:before,services:rows,partial:{schemaVersion:'roost-compose-failed-partial-runtime-v1',
    images:rows.filter((r:any)=>r.role!=='database').map(({name,imageDigest,commit,tree,deploymentId}:any)=>({name,imageDigest,commit,tree,deploymentId})),
    candidateConfigDigest:t.configDigest,databaseReadOnly:true,activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,
    protectedRollbackImages:structuredClone(t.baseline.images),presentRollbackImageDigests:[...new Set([...t.baseline.images.map((r:any)=>r.imageDigest),image('e')])].sort(),
    publicHealth:{healthy:false,healthDigest:hash('0')}}},
  evidence={composeRecovery:r,deploymentIds:[{targetId:t.targetId,deploymentId}],artifactSetDigest:m.deployment.artifactSetDigest,
   configDigest:m.deployment.configDigest,schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,healthDigest:hash('0'),healthy:false,
   observedAt:'2026-10-04T12:03:10.000Z',currentServiceSetDigest:compose.composeRuntimeSetDigest(rows)},
  release={id:releaseId,snapshot:{...s,manifestDigest:shared.releaseDigest(m)},manifest_digest:shared.releaseDigest(m)},snapshot={...release.snapshot,releaseId};
 return{...f,op,release,snapshot,evidence,r};}
function seal(f:any){f.evidence.currentServiceSetDigest=compose.composeRuntimeSetDigest(f.r.services);}
test('explicit failed partial candidate records unhealthy recreated runtime and preserves rollback data/image scope',()=>{
 const f=partialFixture();assert(shared.manifestSchema.safeParse(f.m).success);assert(shared.composeRecoverySchema.safeParse(f.r).success);
 assert(shared.outcomeSchema.safeParse({requestId:randomUUID(),status:'failed',observationOnly:false,evidence:f.evidence}).success);
 assert.equal(shared.composeRecoveryEvidenceError(f.snapshot,f.evidence,f.op),null);
 assert.equal(releaseOutcomeError(f.release,f.op,{status:'failed',evidence:f.evidence}),null);
 assert.equal(releaseOutcomeError(f.release,f.op,{status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:f.evidence}),null);
 assert.equal(f.evidence.healthy,false);assert.equal((f.evidence as any).deployedCommit,undefined);assert.equal((f.evidence as any).deployedSetDigest,undefined);
 const db=f.r.services.find((r:any)=>r.role==='database'),old=f.r.baselineServices.find((r:any)=>r.role==='database');
 assert.notEqual(db.containerId,old.containerId);assert.equal(db.imageDigest,old.imageDigest);assert.equal(db.mountDigest,old.mountDigest);
});
const mutations:Record<string,(f:any)=>void>={
 data:f=>f.evidence.dataDigest=hash('1'),schema:f=>f.evidence.schemaDigest=hash('1'),publicHealthy:f=>f.evidence.healthy=true,
 healthBorrowed:f=>{f.evidence.healthDigest=f.m.baseline.healthDigest;f.r.partial.publicHealth.healthDigest=f.evidence.healthDigest;},
 healthProjection:f=>f.r.partial.publicHealth.healthDigest=hash('1'),DBWritable:f=>f.r.partial.databaseReadOnly=false,
 foreignSessions:f=>f.r.partial.activeOtherSessions=1,openTransaction:f=>f.r.partial.ownedTransactions=1,unknownProject:f=>f.r.partial.projectServiceSetComplete=false,
 databaseImage:f=>f.r.services.find((r:any)=>r.role==='database').imageDigest=image('1'),databaseMount:f=>f.r.services.find((r:any)=>r.role==='database').mountDigest=hash('1'),
 databaseUnhealthy:f=>f.r.services.find((r:any)=>r.role==='database').health='starting',databaseStopped:f=>f.r.services.find((r:any)=>r.role==='database').state='exited',
 oldDBIdentity:f=>f.r.services.find((r:any)=>r.role==='database').containerId=f.r.baselineServices.find((r:any)=>r.role==='database').containerId,
 appRunning:f=>f.r.services.find((r:any)=>r.role==='app').state='running',cadenceRunning:f=>f.r.services.find((r:any)=>r.role==='cadence').state='running',
 migrationSuccess:f=>f.r.services.find((r:any)=>r.role==='migration').exitCode=0,migrationRunning:f=>f.r.services.find((r:any)=>r.role==='migration').state='running',
 unknownContainer:f=>f.r.services[0].name='foreign',duplicateContainer:f=>f.r.services[1].containerId=f.r.services[0].containerId,
 extraContainer:f=>f.r.services.push({...f.r.services[0],name:'other',containerId:hash('b')}),missingContainer:f=>f.r.services.pop(),
 builtSource:f=>f.r.services[0].commit='f'.repeat(40),builtTree:f=>f.r.partial.images[0].tree='f'.repeat(40),builtImage:f=>f.r.partial.images[0].imageDigest=image('e'),
 imageFromOtherQueue:f=>f.r.partial.images[0].deploymentId='otherqueue',imageName:f=>f.r.partial.images[0].name='foreign',
 rollbackImageMissing:f=>f.r.partial.presentRollbackImageDigests.pop(),rollbackImageExtra:f=>f.r.partial.presentRollbackImageDigests.push(image('0')),
 rollbackImageSubstituted:f=>f.r.partial.protectedRollbackImages[0].imageDigest=image('0'),rollbackDigestDuplicate:f=>f.r.partial.presentRollbackImageDigests[1]=f.r.partial.presentRollbackImageDigests[0],
 queueFinished:f=>f.r.queue.status='finished',queueCancelled:f=>f.r.queue.status='cancelled-by-user',queueUnfinished:f=>f.r.queue.finishedAt=null,
 queueCommit:f=>f.r.queue.commit='HEAD',queueOther:f=>f.r.queue.deploymentId='otherqueue',queueBeforeIntent:f=>f.r.queue.createdAt='2026-10-04T12:02:00.000Z',
 containerBeforeQueue:f=>f.r.services[0].createdAt='2026-10-04T12:03:00.000Z',containerAfterQueue:f=>f.r.services[0].createdAt='2026-10-04T12:03:11.000Z',
 wrongOperation:f=>f.r.operationId=randomUUID(),wrongIntent:f=>f.op.intent.parameters.artifactSetDigest=hash('0'),wrongIntentSource:f=>f.op.intent.observed.baseTree='f'.repeat(40),
 wrongConfig:f=>f.r.configuration.settingsDigest=hash('0'),rollbackPhase:f=>f.r.phase='rollback',rollbackOperation:f=>f.op.operation='rollback',
 fakeAbsence:f=>f.evidence.absenceVerified=true,fakeHealthyBaseline:f=>f.evidence.deployedCommit=f.s.baseCommit,fakeCandidateVersion:f=>f.evidence.deployedCommit=f.s.commit,
 fakeInstalledSet:f=>f.evidence.deployedSetDigest=f.evidence.currentServiceSetDigest,
};
for(const [name,change]of Object.entries(mutations))test('partial refusal '+name,()=>{const f=partialFixture();change(f);
 try{seal(f);}catch{}assert.notEqual(shared.composeRecoveryEvidenceError(f.snapshot,f.evidence,f.op),null);
 assert.notEqual(releaseOutcomeError(f.release,f.op,{status:'failed',evidence:f.evidence}),null);});
test('partial classification cannot be accepted as success or no-effect absence',()=>{
 const f=partialFixture();for(const input of [{status:'succeeded'},{status:'reconciled',reconciledStatus:'succeeded',observationOnly:true},
  {status:'reconciled',reconciledStatus:'absent',observationOnly:true}])assert.notEqual(releaseOutcomeError(f.release,f.op,{...input,evidence:f.evidence}),null);
});
test('partial failure requires planned rollback and rejects another candidate/Git/smoke intent',()=>{
 const f=partialFixture(),failure={...f.op,outcome:{status:'failed',evidence:f.evidence}},journal=[{id:randomUUID(),operation:'merge',outcome:{status:'succeeded'}},failure];
 for(const operation of ['push','pr','review','merge','deploy_config','deploy','smoke']){
  const intent={...f.op.intent,requestId:randomUUID(),operation};assert.equal(releaseIntentError(f.release,intent,journal),'release_compose_partial_failure_requires_rollback');}
 const rollback={...f.op.intent,requestId:randomUUID(),operation:'rollback_config',parameters:{commit:f.m.rollback.commit,
  artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest}};
 assert.equal(releaseIntentError(f.release,rollback,journal),null);
 assert.equal(releaseIntentError(f.release,{...f.op.intent,operation:'observe',parameters:{mode:'candidate'}},journal),'release_compose_partial_failure_requires_rollback');
});
test('historical queue_failed and queue_absent validators remain valid; newpartial payload is forbidden there',()=>{
 const f=fixture(),s={...f.s,releaseId:randomUUID()},op={id:randomUUID(),operation:'deploy',createdAt:'2026-10-04T12:03:00.000Z',intent:{parameters:{targetId:f.target.targetId}}};
 for(const kind of ['queue_failed','queue_absent']){const e=f.recoveryEvidence(s,{operationId:op.id,since:op.createdAt},kind);
  assert.equal(shared.composeRecoveryEvidenceError(s,e,op),null);e.composeRecovery.partial=partialFixture().r.partial;
  assert.notEqual(shared.composeRecoveryEvidenceError(s,e,op),null);}
});
