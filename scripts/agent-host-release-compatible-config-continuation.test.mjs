// Counterfactual protocol fixtures only. No private evidence, native or API jobs.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID}from'node:crypto';
import {createRequire}from'node:module';import path from'node:path';import {fileURLToPath}from'node:url';
import shared from './lib/agent-host-release-contract.cjs';
import {createCompatibleConfigurationContinuationContract}from'./lib/agent-host-release-compatible-config-continuation.cjs';
import {compatibleConfigClosureFixture as closureFixture}from'./fixtures/release-compatible-config-closure.mjs';
import {releaseRecoveryCandidate} from './lib/agent-host-release-writer-recovery.mjs';
import {qualifyCompatibleRecoveryBuildSnapshot,qualifyCompatibleRecoveryConfigurationPreimage} from './lib/agent-host-release-compose-worker.mjs';
const d=shared.releaseDigest,clone=structuredClone,H=c=>c.repeat(64),req=createRequire(import.meta.url);
const {require:ts}=req('tsx/cjs/api'),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=ts(path.join(root,'src/modules/agent-runtime/governed-release-contract.ts'),import.meta.url);
const api=createCompatibleConfigurationContinuationContract({...shared,compatibleRecoveryScopeDigest:shared.compatibleRecoveryBaseScopeDigest});
const gitQualifier=(r,o,j)=>server.releaseOutcomeError(r,o,{status:o.outcome.status,...(o.outcome.status==='reconciled'?{
 reconciledStatus:o.outcome.reconciledStatus,observationOnly:o.outcome.observationOnly}:{}),evidence:o.outcome.evidence},j);
function fixture(){const f=closureFixture(),state=f.state,old=f.s,now=f.clock+60000;
 old.requestId=randomUUID();const closureAt=new Date(f.clock+1).toISOString(),revocationId=randomUUID();
 const receipt={...clone(f.body),releaseId:old.releaseId,applicationId:old.applicationId,hostId:old.hostId,
  issuerUserId:state.release.issuerUserId,failedOutcomeId:f.operation.outcome.id,failedEvidenceDigest:d(f.operation.outcome.evidence)};
 const c={id:randomUUID(),releaseId:old.releaseId,failedOperationId:f.operation.id,failedOutcomeId:f.operation.outcome.id,
  expectedVersion:receipt.expectedVersion,closureDigest:d(receipt),consentDigest:receipt.consentDigest,revocationId,snapshot:receipt,createdAt:closureAt};
 state.failedClosures=[c];state.revocations=[{id:revocationId}];state.status='failed';state.expectedVersion=H('b');
 const input=clone(old);delete input.releaseId;
 input.requestId=randomUUID();input.releaserCredentialId=randomUUID();
 input.expiresAt=new Date(now+3600000).toISOString();input.releaseExecutionId=randomUUID();
 input.manifest.backup={...input.manifest.backup,digest:H('c'),restoreDigest:H('c'),capturedAt:new Date(now-1000).toISOString(),restoreVerifiedAt:new Date(now).toISOString()};
 const r=input.compatibleArtifactRecovery,e=r.currentEntry;e.observedAt=new Date(now).toISOString();
 e.projectInventory.observedAt=e.observedAt;e.projectInventory.digest=shared.compatibleRecoveryInventoryDigest(e.projectInventory);
 e.ingressFence.observedAt=e.observedAt;
 const ingress=req('./lib/agent-host-release-compose-ingress-fence.cjs');e.ingressFence.evidenceDigest=ingress.composeIngressFenceDigest(e.ingressFence);
 for(const row of [...e.services,...e.cadences])if(Object.hasOwn(row,'observedAt')){row.observedAt=e.observedAt;row.inventoryDigest=e.projectInventory.digest;}
 e.evidenceDigest=shared.compatibleRecoveryEntryDigest(e);
 r.nativeClosure.observedAt=e.observedAt;r.nativeClosure.releaseId=r.prior.releaseId;r.nativeClosure.operationId=r.prior.failedOperationId;
 r.nativeClosure.agentHostId=input.hostId;r.nativeClosure.evidenceDigest=e.evidenceDigest;r.replacement.compatibilityReceiptDigest=H('e');
 r.scopeAudit={taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('f'),scopeDigest:H('0')};
 input.compatibleConfigurationContinuation={releaseId:old.releaseId,closureId:c.id,closureDigest:c.closureDigest,
  gitOperationIds:Object.fromEntries(state.journal.slice(0,4).map(o=>[o.operation,o.id]))};
 const proofs={qualifyGitOutcome:gitQualifier,qualifyCurrentEntry:()=>null,verifyBackupAndCompatibility:()=>null,
  verifyOriginalSourceAcceptance:()=>null,verifyCurrentScopeAudit:()=>null};
 const reseal=()=>{input.manifestDigest=d(input.manifest);r.scopeAudit.scopeDigest=api.compatibleConfigurationContinuationScopeDigest(input);};reseal();
 return{...f,state,input,proofs,now,c,receipt,reseal};}
test('explicit fictional FAILED configuration absence permits same accepted candidate with inherited canonical Git proof',()=>{
 const f=fixture(),before=JSON.stringify({state:f.state,input:f.input});assert.equal(shared.manifestSchema.safeParse(f.input.manifest).success,true);assert.equal(shared.compatibleArtifactRecoverySchema.safeParse(f.input.compatibleArtifactRecovery).success,true);assert.equal(f.input.manifestDigest,d(f.input.manifest));assert.equal(f.input.compatibleArtifactRecovery.scopeAudit.scopeDigest,api.compatibleConfigurationContinuationScopeDigest(f.input));assert.equal(api.compatibleConfigurationContinuationAdmissionError(f.state,f.input,f.now,f.proofs),null);
 const b=api.compatibleConfigurationContinuationBasis(f.state,f.input,f.now,f.proofs);
 assert.equal(b.git.length,4);assert.equal(b.publication.pullRequestNumber,4);assert.equal(b.git[0].outcomeDigest,d(f.state.journal[0].outcome));
 assert.equal(JSON.stringify({state:f.state,input:f.input}),before);assert.equal(f.state.journal.length,5);
});
test('shared aggregate parses continuation once and keeps derived publication out of caller input',()=>{
 const f=fixture();assert.equal(shared.createReleaseSchema.safeParse(f.input).success,true);
 assert.equal(shared.compatibleRecoveryScopeDigest(f.input),api.compatibleConfigurationContinuationScopeDigest(f.input));
 const basis=shared.compatibleConfigurationContinuationBasis(f.state,f.input,f.now,f.proofs);
 assert.equal(shared.compatibleConfigurationContinuationStoredError({...f.input,compatibleContinuationBasis:basis}),null);
 assert.equal(shared.createReleaseSchema.safeParse({...f.input,compatibleContinuationBasis:basis}).success,false);
 assert.equal(shared.nextCompatibleRecoveryOperation({release:{snapshot:{...f.input,compatibleContinuationBasis:basis}},journal:[],status:'active'}),'deploy_config');
});
// A typed stored-proof fixture is component input, never actual signed custody.
function storedFixture(){const f=fixture(),workspaceId=randomUUID(),basis=shared.compatibleConfigurationContinuationBasis(f.state,f.input,f.now,f.proofs);
 const proof={schemaVersion:'roost-compatible-recovery-proof-snapshot-v1',classification:'owner_verified_native_receipt',workspaceId,applicationId:f.input.applicationId,issuerUserId:f.state.release.issuerUserId,
  evidenceId:randomUUID(),nativeAttemptId:randomUUID(),sourceExecutionId:randomUUID(),
  ...Object.fromEntries(['recordDigest','metadataDigest','publicPayloadDigest','privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest','sourceBasisDigest','scopeBasisDigest'].map(k=>[k,H('a')])),
  requestDigest:d(f.input),manifestDigest:f.input.manifestDigest,scopeDigest:f.input.compatibleArtifactRecovery.scopeAudit.scopeDigest,
  buildReceiptDigest:f.input.compatibleArtifactRecovery.replacement.buildReceiptDigest,compatibilityReceiptDigest:f.input.compatibleArtifactRecovery.replacement.compatibilityReceiptDigest,
  nativeAttemptIsAgentExecution:false,serverOperatingSystemAttestation:false,serverPrivateSignatureVerification:false,releaseAuthority:false};
 const snapshot={...f.input,compatibleContinuationBasis:basis,compatibleRecoveryProof:proof,readinessDigest:H('1'),configurationDigest:H('2')};
 const release={id:randomUUID(),workspaceId,applicationId:f.input.applicationId,hostId:f.input.hostId,issuerUserId:f.state.release.issuerUserId,manifestDigest:f.input.manifestDigest,manifest_digest:f.input.manifestDigest,snapshot};
 return{...f,proof,snapshot,release,child:{release,journal:[],status:'active',revocations:[],failedClosures:[],renewals:[],expectedVersion:H('9')}};
}
test('normal writer selection and installed build parser retain qualified derived basis in grant digest only',()=>{
 const f=storedFixture(),candidate=releaseRecoveryCandidate(f.child,{hostId:f.input.hostId,agentId:f.input.releaserAgentId});
 assert.equal(candidate.grantDigest,d({releaseId:f.release.id,snapshot:f.snapshot}));
 assert.deepEqual(qualifyCompatibleRecoveryBuildSnapshot(f.snapshot),f.proof);
 for(const change of [x=>x.compatibleContinuationBasis.commit='f'.repeat(40),x=>delete x.compatibleConfigurationContinuation]){
  const snapshot=clone(f.snapshot);change(snapshot);assert.throws(()=>releaseRecoveryCandidate({...f.child,release:{...f.release,snapshot}},{hostId:f.input.hostId,agentId:f.input.releaserAgentId}));assert.throws(()=>qualifyCompatibleRecoveryBuildSnapshot(snapshot));
 }
});
test('installed configuration preimage accepts only a qualified continuation and empty own publication prefix',()=>{
 const f=storedFixture(),snapshot={...f.snapshot,releaseId:f.release.id},configuration=f.input.compatibleArtifactRecovery.currentEntry.configuration;
 const pending={id:randomUUID(),operation:'deploy_config',intent:{parameters:{commit:f.input.commit,configDigest:f.input.manifest.deployment.configDigest,
  artifactSetDigest:f.input.manifest.deployment.artifactSetDigest,schemaDigest:f.input.manifest.deployment.schemaDigest}}};
 const current={...f.child,journal:[pending]};
 assert.equal(qualifyCompatibleRecoveryConfigurationPreimage({snapshot,current,configuration}),true);
 assert.equal(current.journal.length,1);
 for(const change of [v=>v.snapshot.compatibleContinuationBasis.commit='f'.repeat(40),v=>v.current.journal.unshift(clone(f.state.journal[0])),
  v=>v.current.journal[0].intent.parameters.configDigest=H('0'),v=>v.current.journal[0].outcome={status:'succeeded'},
  v=>delete v.snapshot.compatibleConfigurationContinuation]){
  const v=clone({snapshot,current,configuration});change(v);v.current.release.snapshot=Object.fromEntries(Object.entries(v.snapshot).filter(([k])=>k!=='releaseId'));
  assert.throws(()=>qualifyCompatibleRecoveryConfigurationPreimage(v));
 }
});
test('backend deploy_config accepts qualified inherited publication without adding a merge row',()=>{
 const f=storedFixture(),r=f.input.compatibleArtifactRecovery.replacement,intent={requestId:randomUUID(),operation:'deploy_config',manifestDigest:f.input.manifestDigest,
  commit:f.input.commit,baseCommit:f.input.baseCommit,expectedVersion:H('9'),observed:{commit:f.input.commit,baseCommit:f.input.commit,baseTree:f.input.candidateTree,manifestDigest:f.input.manifestDigest},
  parameters:{commit:f.input.commit,artifactSetDigest:r.artifactSetDigest,configDigest:r.configurationDigest,schemaDigest:r.schemaDigest}};
 assert.equal(server.releaseIntentError(f.release,intent,[]),null);assert.equal(f.child.journal.length,0);
 assert.notEqual(server.releaseIntentError(f.release,{...intent,parameters:{...intent.parameters,configDigest:H('0')}},[]),null);
 const bad={...f.release,snapshot:{...f.snapshot,compatibleContinuationBasis:{...f.snapshot.compatibleContinuationBasis,tree:'f'.repeat(40)}}};
 assert.notEqual(server.releaseIntentError(bad,intent,[]),null);
});
for(const [name,change]of Object.entries({
 active:f=>f.state.status='active',notClosed:f=>f.state.failedClosures=[],foreignClosure:f=>f.input.compatibleConfigurationContinuation.closureId=randomUUID(),
 closureDigest:f=>f.input.compatibleConfigurationContinuation.closureDigest=H('0'),missingRevocation:f=>f.state.revocations=[],
 issuer:f=>{f.receipt.issuerUserId=randomUUID();f.c.snapshot=f.receipt;f.c.closureDigest=d(f.receipt);f.input.compatibleConfigurationContinuation.closureDigest=f.c.closureDigest;},
 wrongApplication:f=>f.input.applicationId=randomUUID(),wrongHost:f=>f.input.hostId=randomUUID(),wrongRepository:f=>f.input.manifest.repository.url='https://example.test/other.git',
 wrongDirectory:f=>f.input.manifest.repository.canonicalDir='C:/fictional/other',wrongBranch:f=>f.input.manifest.repository.candidateBranch='codex/other',
 commit:f=>f.input.commit='f'.repeat(40),tree:f=>f.input.candidateTree='f'.repeat(40),task:f=>f.input.taskId=randomUUID(),
 sourceReview:f=>f.input.reviewId=randomUUID(),material:f=>f.input.materialVersion=H('0'),credentialReuse:f=>f.input.releaserCredentialId=f.s.releaserCredentialId,
 missingCredential:f=>delete f.input.releaserCredentialId,requestReuse:f=>f.input.requestId=f.s.requestId,oldScope:f=>f.input.compatibleArtifactRecovery.scopeAudit=clone(f.s.compatibleArtifactRecovery.scopeAudit),
 foreignGitId:f=>f.input.compatibleConfigurationContinuation.gitOperationIds.push=randomUUID(),uncertainGit:f=>f.state.journal[0].outcome.status='uncertain',
 wrongPR:f=>f.state.journal[2].outcome.evidence.pullRequestNumber=9,reviewRejected:f=>f.state.journal[2].outcome.evidence.reviewApproved=false,
 wrongMergedCommit:f=>f.state.journal[3].outcome.evidence.mergedCommit='f'.repeat(40),gitCommit:f=>f.state.journal[0].outcome.evidence.remoteCommit='f'.repeat(40),
 nonAbsence:f=>f.state.journal[4].outcome.reconciledStatus='failed',extraJournal:f=>f.state.journal.push(clone(f.state.journal[4])),
 originalLineage:f=>f.input.compatibleArtifactRecovery.prior.releaseId=randomUUID(),replacementImage:f=>f.input.compatibleArtifactRecovery.replacement.images[0].imageDigest='sha256:'+H('0'),
 replacementBuild:f=>f.input.compatibleArtifactRecovery.replacement.buildReceiptDigest=H('0'),deployment:f=>f.input.manifest.deployment.url='https://other.example.test',
 changedData:f=>f.input.compatibleArtifactRecovery.currentEntry.dataDigest=H('0'),changedDatabase:f=>f.input.compatibleArtifactRecovery.currentEntry.database.containerId=H('0'),
 foreignFence:f=>f.input.compatibleArtifactRecovery.currentEntry.ingressFence.namespaceDigest=H('0'),healthyFiction:f=>f.input.compatibleArtifactRecovery.currentEntry.publicHealth.healthy=true,
 backupReuse:f=>f.input.manifest.backup=clone(f.s.manifest.backup),backupPredatesClosure:f=>f.input.manifest.backup.capturedAt=new Date(f.clock-1).toISOString(),
 clockFuture:f=>f.input.compatibleArtifactRecovery.currentEntry.observedAt=new Date(f.now+1).toISOString(),clockOld:f=>f.input.compatibleArtifactRecovery.currentEntry.observedAt=new Date(f.now-300001).toISOString(),expiredGrant:f=>f.input.expiresAt=new Date(f.now).toISOString(),
 agentRevision:f=>f.input.releaserRevision=new Date(f.now).toISOString(),
 inventedBasis:f=>f.input.compatibleContinuationBasis={},inventedField:f=>f.input.compatibleConfigurationContinuation.osAttested=true,
 nativeWrongPrior:f=>f.input.compatibleArtifactRecovery.nativeClosure.releaseId=randomUUID()
}))test('continuation refuses '+name,()=>{const f=fixture();change(f);try{f.reseal();}catch{}assert.notEqual(api.compatibleConfigurationContinuationAdmissionError(f.state,f.input,f.now,f.proofs),null);});
for(const key of ['qualifyGitOutcome','qualifyCurrentEntry','verifyBackupAndCompatibility','verifyOriginalSourceAcceptance','verifyCurrentScopeAudit']){
 test('trusted '+key+' validator mandatory',()=>{const f=fixture();delete f.proofs[key];assert.notEqual(api.compatibleConfigurationContinuationAdmissionError(f.state,f.input,f.now,f.proofs),null);});
 test('trusted '+key+' failure preserved',()=>{const f=fixture();f.proofs[key]=()=> 'unproven';assert.notEqual(api.compatibleConfigurationContinuationAdmissionError(f.state,f.input,f.now,f.proofs),null);});
}
function admitted(){const f=fixture(),basis=api.compatibleConfigurationContinuationBasis(f.state,f.input,f.now,f.proofs);
 return {...f,next:{status:'active',release:{snapshot:{...clone(f.input),compatibleContinuationBasis:basis}},journal:[]}};}
test('own journal starts deploy_config; inherited publication is separate and never synthetic operations',()=>{const f=admitted();
 assert.equal(api.nextCompatibleConfigurationContinuationOperation(f.next),'deploy_config');
 const p=api.compatibleConfigurationContinuationPublication(f.next.release.snapshot);assert.equal(p.operations.length,4);assert.equal(p.commit,f.input.commit);
 assert.deepEqual(api.compatibleConfigurationContinuationOperations,['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup']);assert.equal(f.next.journal.length,0);
});
test('seven own successful operations complete, uncertain reconciles and absence freezes',()=>{const f=admitted(),s=f.next.release.snapshot;
 for(const operation of api.compatibleConfigurationContinuationOperations){assert.equal(api.nextCompatibleConfigurationContinuationOperation(f.next),operation);
  f.next.journal.push({operation,intent:{operation,commit:s.commit,manifestDigest:s.manifestDigest},outcome:{status:'succeeded'}});}
 assert.equal(api.nextCompatibleConfigurationContinuationOperation(f.next),null);f.next.journal[6].outcome={status:'uncertain'};
 assert.equal(api.nextCompatibleConfigurationContinuationOperation(f.next),'reconcile');f.next.journal[6].outcome={status:'reconciled',reconciledStatus:'absent'};
 assert.equal(api.nextCompatibleConfigurationContinuationOperation(f.next),'frozen');
});
test('changed inherited basis or injected Git rows refuses planning',()=>{const f=admitted();f.next.release.snapshot.compatibleContinuationBasis.git[0].operationId=randomUUID();
 assert.throws(()=>api.nextCompatibleConfigurationContinuationOperation(f.next));const g=admitted();g.next.journal=[clone(g.state.journal[0])];assert.throws(()=>api.nextCompatibleConfigurationContinuationOperation(g.next));});
test('deployment intent observes merged candidate, never inherited prior remote base',()=>{const f=admitted(),s=f.next.release.snapshot,r=s.compatibleArtifactRecovery.replacement;
 const intent={requestId:randomUUID(),operation:'deploy_config',manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,expectedVersion:H('0'),
  observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},parameters:{commit:s.commit,artifactSetDigest:r.artifactSetDigest,configDigest:r.configurationDigest,schemaDigest:r.schemaDigest}};
 assert.equal(api.compatibleConfigurationContinuationIntentError(f.next,intent),null);intent.observed.baseCommit=s.compatibleArtifactRecovery.publication.baseCommit;
 assert.notEqual(api.compatibleConfigurationContinuationIntentError(f.next,intent),null);intent.operation='push';assert.notEqual(api.compatibleConfigurationContinuationIntentError(f.next,intent),null);
});
