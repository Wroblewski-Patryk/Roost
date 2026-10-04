import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import {fixture,hash,image} from './fixtures/release-compose-contract.cjs';

test('permanent Compose seals phase-specific config, immutable rollback and complete native service facts',()=>{
 const f=fixture();assert.equal(contract.manifestSchema.safeParse(f.m).success,true);
 assert.equal(contract.isComposeManifest(f.m),true);assert.equal(contract.isGitSetManifest(f.m),false);
 assert.equal(contract.isReleaseSetManifest(f.m),true);
 for(const phase of [false,true,'baseline'])assert.equal(contract.composeEvidenceError(f.s,f.evidence(phase),phase),null);
 assert.notEqual(f.m.rollback.configDigest,f.m.baseline.configDigest);
 assert.notEqual(f.m.rollback.artifactSetDigest,f.m.baseline.artifactSetDigest);
});
for(const [name,change] of [
 ['single stack image',f=>{f.m.deployment.imageDigest=image('f');}],
 ['archive',f=>{f.m.cleanup.archiveRepository=true;}],
 ['unprotected database',f=>{f.m.cleanup.protectedResourceIds=f.m.cleanup.protectedResourceIds.filter(id=>id!==image('e'));}],
 ['unprotected mount',f=>{f.m.cleanup.protectedResourceIds=f.m.cleanup.protectedResourceIds.filter(id=>id!==hash('4'));}],
 ['protected deletion',f=>{f.m.cleanup.ownedResourceIds=[f.target.targetId];}],
 ['missing rollback image',f=>{f.target.baseline.images.pop();}],
 ['source scope',f=>{f.target.composePath='/other.yml';}],
 ['candidate config',f=>{f.target.configuration.environmentDigest=hash('f');}],
 ['rollback runtime policy',f=>{f.target.rollbackConfiguration.runtimePolicyDigest=hash('f');}],
 ['missing fixed renderer policy',f=>{delete f.target.configuration.controllerPolicy;}],
 ['unsealed renderer',f=>{f.target.rollbackConfiguration.controllerPolicy.rendererDigest=hash('1');}],
 ['different controller settings invariant',f=>{f.target.rollbackConfiguration.controllerPolicy.settingsInvariantDigest=hash('f');}],
 ['wrong controller phase',f=>{f.target.rollbackConfiguration.controllerPolicy.phase='candidate';}],
 ['raw controller command',f=>{f.target.rollbackConfiguration.controllerPolicy.command='some shell';}],
 ['schema',f=>{f.m.deployment.schemaDigest=hash('f');}],
 ['duplicate target',f=>{f.m.deployment.targets.push(structuredClone(f.target));}],
 ['raw secret',f=>{f.target.configuration.environment={PASSWORD:'private'};}]
])test(`Compose manifest refuses ${name}`,()=>{const f=fixture();change(f);assert.equal(contract.manifestSchema.safeParse(f.m).success,false);});
for(const [name,change] of [
 ['single image substitution',e=>{e.imageDigest=image('f');}],
 ['missing service',e=>{e.composeTargets[0].runtime.services.pop();}],
 ['extra service',e=>{e.composeTargets[0].runtime.services.push({...e.composeTargets[0].runtime.services[0],name:'other'});}],
 ['built source',e=>{e.composeTargets[0].runtime.services[0].commit='e'.repeat(40);}],
 ['mount',e=>{e.composeTargets[0].runtime.services[0].mountDigest=hash('f');}],
 ['database image',e=>{e.composeTargets[0].runtime.services[3].imageDigest=image('f');}],
 ['migration exit',e=>{e.composeTargets[0].runtime.services[1].exitCode=1;}],
 ['queue not finished',e=>{e.composeTargets[0].binding.queue.status='in_progress';}],
 ['queue identity',e=>{e.deploymentIds[0].deploymentId='wrong';}],
 ['queue creation',e=>{e.composeTargets[0].binding.queue.createdAt='2026-10-05T12:00:00.000Z';}],
 ['runtime summary',e=>{e.deployedSetDigest=hash('f');}],
 ['tree',e=>{e.deployedTree='e'.repeat(40);}],
 ['schema',e=>{e.schemaDigest=hash('f');}],
 ['data',e=>{e.dataDigest=hash('f');}],
 ['rebound config',e=>{e.composeTargets[0].configuration.environmentDigest=hash('f');}],
 ['duplicate service image',e=>{e.composeTargets[0].binding.images[1]={...e.composeTargets[0].binding.images[0]};}]
])test(`Compose evidence refuses ${name}`,()=>{const f=fixture(),e=f.evidence();change(e);assert.equal(contract.composeEvidenceError(f.s,e),'release_deployment_unproven');});
test('rollback rejects a freshly rebuilt image despite matching source tree and internally consistent attestation',()=>{
 const f=fixture(),e=f.evidence(true),r=e.composeTargets[0];r.runtime.services[0].imageDigest=image('f');r.binding.images[0].imageDigest=image('f');
 assert.equal(contract.composeEvidenceError(f.s,e,true),'release_deployment_unproven');
});

function recovery(){const f=fixture(),s={...f.s,releaseId:randomUUID()},o={operationId:randomUUID(),since:'2026-10-04T12:02:05.000Z',targetId:f.target.targetId},
 operation={id:o.operationId,operation:'deploy',createdAt:o.since,intent:{parameters:{targetId:f.target.targetId}}};
 return {...f,s,o,operation,e:f.recoveryEvidence(s,o)};}
test('failed queue proof records healthy unchanged historical baseline, never successful candidate deployment',()=>{
 const f=recovery();assert.equal(contract.composeRecoveryEvidenceError(f.s,f.e,f.operation),null);
 assert.equal(contract.composeEvidenceError(f.s,f.e),'release_deployment_unproven');
 assert.equal(contract.composeRecoveryEvidenceError(f.s,f.e,{...f.operation,createdAt:undefined,created_at:new Date(f.o.since)}),null);
});
test('empty queue ID set is accepted only inside truthful typed absence evidence',()=>{
 const f=recovery(),base={requestId:randomUUID(),status:'uncertain',observationOnly:false,evidence:{observedAt:f.o.since,deploymentIds:[]}};
 assert.equal(contract.outcomeSchema.safeParse(base).success,false);
 const absent=f.recoveryEvidence(f.s,f.o,'queue_absent');
 assert.equal(contract.outcomeSchema.safeParse({...base,status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:absent}).success,true);
 assert.deepEqual(absent.deploymentIds,[]);assert.equal(absent.composeRecovery.queue,null);
});
for(const [name,change]of[
 ['operation',f=>{f.e.composeRecovery.operationId=randomUUID();}],['release',f=>{f.e.composeRecovery.releaseId=randomUUID();}],
 ['source',f=>{f.e.composeRecovery.requestedCommit='f'.repeat(40);}],['tree',f=>{f.e.composeRecovery.requestedTree='f'.repeat(40);}],
 ['phase',f=>{f.e.composeRecovery.phase='rollback';}],['queue ID',f=>{f.e.composeRecovery.queue.deploymentId='other';}],
 ['queue target',f=>{f.e.composeRecovery.queue.targetId='other';}],['queue pending',f=>{f.e.composeRecovery.queue.status='queued';}],
 ['queue time',f=>{f.e.composeRecovery.queue.createdAt='2020-01-01T00:00:00.000Z';}],['active control plane',f=>{f.e.composeRecovery.controlPlaneQuiescent=false;}],
 ['configuration',f=>{f.e.composeRecovery.configuration.environmentDigest=hash('f');}],['partial image',f=>{f.e.composeRecovery.services[0].imageDigest=image('f');}],
 ['mount',f=>{f.e.composeRecovery.services[0].mountDigest=hash('f');}],['database container',f=>{f.e.composeRecovery.services[3].containerId=hash('f');}],
 ['missing app',f=>{f.e.composeRecovery.services.shift();}],['missing migration',f=>{f.e.composeRecovery.services.splice(1,1);}],
 ['unhealthy app',f=>{f.e.composeRecovery.services[0].health='unhealthy';}],['schema',f=>{f.e.schemaDigest=hash('f');}],
 ['data',f=>{f.e.dataDigest=hash('f');}],['health',f=>{f.e.healthDigest=hash('f');}],['candidate receipt',f=>{f.e.composeTargets=f.evidence().composeTargets;}],
 ['invented migration verification',f=>{f.e.composeRecovery.migrationSchemaVerified=false;}],
 ['archive marker',f=>{f.e.repositoryArchived=true;}],['Git evidence scope',f=>{f.e.remoteCommit=f.s.commit;}]
])test(`recovery refuses ${name}`,()=>{const f=recovery();change(f);assert.equal(contract.composeRecoveryEvidenceError(f.s,f.e,f.operation),'release_compose_recovery_unproven');});
