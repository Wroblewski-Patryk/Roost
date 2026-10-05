import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {configAbsenceFixture} from './governed-release-compose-config-absence.test';
import {releaseDigest, releaseFailedClosureError, releasePublishedGitBasis, releaseHasPublishedGitBasis, releaseIntentError} from '../modules/agent-runtime/governed-release-contract';

function restartedAbsenceFixture() {
 const original=configAbsenceFixture();original.closed();
 const inherited=releasePublishedGitBasis(original.state,original.input).publishedGitBasis;
 const f=configAbsenceFixture();
 Object.assign(f.s,structuredClone(original.input),{publishedGitBasis:structuredClone(inherited)});
 f.state.release.host_id=f.s.hostId;f.body.nativeClosure.agentHostId=f.s.hostId;
 f.closure.closure_digest=releaseDigest(f.closure.snapshot);
 f.operation.sequence=1;f.state.journal=[f.operation];
 Object.assign(f.input,structuredClone(f.s),{requestId:randomUUID(),releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),
  baselineRestart:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion,closureId:f.closure.id,consentDigest:f.closure.consent_digest}});
 delete f.input.publishedGitBasis;
 return {...f,original,inherited};
}

test('one exact no-effect configuration on admitted inherited Git closes truthfully and carries Git IDs to its own closure',()=>{
 const f=restartedAbsenceFixture(),before=structuredClone(f.state.release);
 assert.equal(releaseHasPublishedGitBasis(f.s),true);
 assert.equal(releaseFailedClosureError(f.state,f.body),null);
 f.closed();const result=releasePublishedGitBasis(f.state,f.input);
 assert.equal(result.error,undefined);
 const basis=result.publishedGitBasis;
 for(const key of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'])assert.equal(basis[key],f.inherited[key]);
 assert.equal(basis.releaseId,f.state.release.id);
 assert.equal(basis.closureId,f.closure.id);
 assert.equal(basis.closureDigest,f.closure.closure_digest);
 assert.equal(basis.composeEvidenceDigest,releaseDigest(f.e));
 assert.notEqual(basis.releaseId,f.inherited.releaseId);
 assert.notEqual(basis.closureId,f.inherited.closureId);
 assert.deepEqual(basis.baselineDeploymentIds,[]);
 assert.equal(releaseHasPublishedGitBasis({...f.input,...result}),true);
 assert.deepEqual(f.state.release,before);
});

test('restarted config absence requires the complete matching admitted basis and forbids predecessor/successor combinations',()=>{
 const mutations=[
  (f:any)=>delete f.s.baselineRestart,(f:any)=>delete f.s.publishedGitBasis,
  (f:any)=>f.s.publishedGitBasis.closureId=randomUUID(),
  (f:any)=>f.s.publishedGitBasis.releaseId=randomUUID(),
  (f:any)=>f.s.publishedGitBasis.expectedVersion='0'.repeat(64),
  (f:any)=>f.s.publishedGitBasis.mergeOperationId='not-a-uuid',
  (f:any)=>f.s.publishedGitBasis.basisKind=undefined,
  (f:any)=>f.s.publishedGitBasis.composeEvidenceDigest=undefined,
  (f:any)=>f.s.publishedGitBasis.baselineDeploymentIds=[{targetId:'composeapp',deploymentId:'invented'}],
  (f:any)=>f.s.predecessor={},(f:any)=>f.s.successorBasis={}
 ];
 for(const mutate of mutations){const f=restartedAbsenceFixture();mutate(f);assert.equal(releaseFailedClosureError(f.state,f.body),'release_failed_closure_unproven');}
});

test('one-operation restart rejects missing native closure, mismatched evidence, unresolved effects and any extra journal operation',()=>{
 const mutations=[
  (f:any)=>f.state.journal=[],
  (f:any)=>f.state.journal.push({...f.operation,id:randomUUID(),operation:'deploy'}),
  (f:any)=>f.state.journal.unshift({...f.operation,id:randomUUID(),operation:'push'}),
  (f:any)=>f.operation.outcome.status='uncertain',
  (f:any)=>f.operation.outcome.reconciled_status='succeeded',
  (f:any)=>f.operation.outcome.observation_only=false,
  (f:any)=>delete f.body.nativeClosure,
  (f:any)=>f.body.nativeClosure.writerAbsent=false,
  (f:any)=>f.body.nativeClosure.allChildrenClosed=false,
  (f:any)=>f.body.nativeClosure.operationId=randomUUID(),
  (f:any)=>f.body.nativeClosure.evidenceDigest='0'.repeat(64),
  (f:any)=>f.body.evidence={...f.e,dataDigest:'0'.repeat(64)},
  (f:any)=>f.e.composeConfigAbsence.noCandidateQueue=false,
  (f:any)=>f.e.composeConfigAbsence.configuration.environmentDigest='0'.repeat(64),
  (f:any)=>f.e.composeConfigAbsence.services[0].containerId='0'.repeat(64),
  (f:any)=>f.e.composeConfigAbsence.services[0].health='unhealthy',
  (f:any)=>f.state.revocations=[{id:randomUUID()}],
  (f:any)=>f.body.expectedVersion='0'.repeat(64)
 ];
 for(const mutate of mutations){const f=restartedAbsenceFixture();mutate(f);assert.ok(releaseFailedClosureError(f.state,f.body));}
});

test('new grant after a restarted absence preserves candidate/base/scope and authentic closure identity',()=>{
 const mutations=[
  (f:any)=>f.input.commit='0'.repeat(40),(f:any)=>f.input.candidateTree='0'.repeat(40),
  (f:any)=>f.input.baseCommit='0'.repeat(40),(f:any)=>f.input.baseTree='0'.repeat(40),
  (f:any)=>f.input.manifest.baseline.dataDigest='0'.repeat(64),
  (f:any)=>f.input.manifest.deployment.targets[0].baseline.images[0].imageDigest='sha256:'+'0'.repeat(64),
  (f:any)=>f.input.manifest.cleanup.protectedResourceIds=[],
  (f:any)=>f.input.releaserCredentialId=f.s.releaserCredentialId,
  (f:any)=>f.input.releaseExecutionId=f.s.releaseExecutionId,
  (f:any)=>f.closure.closure_digest='0'.repeat(64),
  (f:any)=>f.closure.snapshot.failedOutcomeId=randomUUID(),
  (f:any)=>f.state.revocations=[]
 ];
 for(const mutate of mutations){const f=restartedAbsenceFixture();f.closed();mutate(f);assert.ok(releasePublishedGitBasis(f.state,f.input).error);}
});

test('successive no-effect restart still prohibits every new Git effect',()=>{
 const f=restartedAbsenceFixture();f.closed();const s={...f.input,...releasePublishedGitBasis(f.state,f.input)};
 const intent:any={commit:s.commit,baseCommit:s.baseCommit,manifestDigest:s.manifestDigest,
  observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},
  parameters:{commit:s.commit,artifactSetDigest:s.manifest.deployment.artifactSetDigest,configDigest:s.manifest.deployment.configDigest,schemaDigest:s.manifest.deployment.schemaDigest}};
 assert.equal(releaseIntentError({snapshot:s,manifest_digest:s.manifestDigest},{...intent,operation:'deploy_config'},[]),null);
 for(const operation of ['push','pr','review','merge'])assert.equal(releaseIntentError({snapshot:s,manifest_digest:s.manifestDigest},{...intent,operation},[]),'release_successor_git_effect_forbidden');
});
