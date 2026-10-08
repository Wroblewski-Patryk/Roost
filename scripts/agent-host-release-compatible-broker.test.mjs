// Controlled transport fixtures only. No API/VPS/model/native/application effects.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';import compose from './lib/agent-host-release-compose-state.cjs';
import ingressFence from './lib/agent-host-release-compose-ingress-fence.cjs';
import {releaseRecoveryCandidate} from './lib/agent-host-release-writer-recovery.mjs';
import inspectionContract from './lib/agent-host-release-inspection-contract.cjs';
import {qualifyCompatibleReleaseSnapshot} from './lib/agent-host-release-broker.mjs';
import backend from '../dist/modules/agent-runtime/governed-release-contract.js';
import {fixture as composeFixture,hash,image} from './fixtures/release-compose-contract.cjs';import {runReleaseStep,nextReleaseOperation} from './lib/agent-host-release-broker.mjs';
const clone=structuredClone,H=x=>x.repeat(64);const fixturePost=true,fixtureOwned=false;
let timeOffset=0;const stamp=t=>new Date(Date.parse(t)+timeOffset).toISOString();
function shiftedComposeFixture(){const f=composeFixture();function shift(v){if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(typeof x==='string'&&/^2026-10-04T/.test(x))v[k]=stamp(x);else if(x&&typeof x==='object')shift(x);}}shift(f.m);return f;}
function partialFixture() {
    const f = shiftedComposeFixture(), t = f.target, m = f.m, s = f.s;
    if(fixturePost)m.postObservation={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:s.commit,candidateTree:s.candidateTree,
     controllerDigest:H('9'),fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-123470,markerDigest:H('7'),summaryDigest:H('8')},
     baselineSequenceDigest:H('6'),budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:H('4'),ingressSettingsDigest:H('5'),observationSeconds:30,
      cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:H('3')},{name:'proactive',behavior:'restore_existing_loop',behaviorDigest:H('4')}]}};
    if(fixtureOwned)m.cleanup.ownedResourceIds=['owned-fixture'];
    const extra = { name: 'proactive', role: 'cadence', source: 'built', expectedState: 'paused', mountDigest: hash('5') };
    for (const cfg of [t.configuration, t.baseline.configuration, t.rollbackConfiguration])
        cfg.services.push(structuredClone(extra));
    t.baseline.images.push({ name: 'proactive', imageDigest: image('4') });
    m.cleanup.protectedResourceIds.push(image('4'), hash('5'));
    t.configDigest = compose.composeConfigurationDigest(t.configuration);
    t.baseline.configDigest = compose.composeConfigurationDigest(t.baseline.configuration);
    t.rollbackConfigDigest = compose.composeConfigurationDigest(t.rollbackConfiguration);
    for (const [key, configDigest] of [['deployment', t.configDigest], ['baseline', t.baseline.configDigest], ['rollback', t.rollbackConfigDigest]])
        m[key].configDigest = shared.releaseDigest([{ targetId: t.targetId, configDigest }]);
    m.deployment.artifactSetDigest = shared.sourceArtifactDigest(m, s);
    m.baseline.artifactSetDigest = shared.sourceArtifactDigest(m, s, 'baseline');
    m.rollback.artifactSetDigest = shared.sourceArtifactDigest(m, s, true);
    const releaseId = randomUUID(), operationId = randomUUID(), createdAt = stamp('2026-10-04T12:03:00.000Z'), deploymentId = 'r' + shared.releaseDigest([releaseId, operationId, t.targetId, 'candidate']).slice(0, 23), before = f.evidence('baseline').composeTargets[0].runtime.services.filter((r) => r.role !== 'migration')
        .map((row) => Object.fromEntries(['name', 'role', 'containerId', 'imageDigest', 'mountDigest', 'state', 'health', 'exitCode', 'createdAt'].map(k => [k, row[k]]))), rows = t.configuration.services.map((d, n) => ({ name: d.name, role: d.role, containerId: hash(['6', '7', '8', '9', 'a'][n]),
        imageDigest: d.source === 'image' ? d.imageDigest : image('f'), mountDigest: d.mountDigest, state: d.role === 'database' ? 'running' : d.role === 'migration' ? 'exited' : 'created',
        health: d.role === 'database' ? 'healthy' : null, exitCode: d.role === 'migration' ? 1 : 0, createdAt: stamp('2026-10-04T12:03:02.000Z'),
        ...(d.source === 'built' ? { commit: s.commit, tree: s.candidateTree, deploymentId } : {}) })), intent = { requestId: randomUUID(), operation: 'deploy', manifestDigest: shared.releaseDigest(m), commit: s.commit, baseCommit: s.baseCommit, expectedVersion: hash('9'),
        observed: { commit: s.commit, baseCommit: s.commit, baseTree: s.candidateTree, manifestDigest: shared.releaseDigest(m) },
        parameters: { targetId: t.targetId, commit: s.commit, artifactSetDigest: m.deployment.artifactSetDigest, configDigest: m.deployment.configDigest, schemaDigest: m.deployment.schemaDigest } }, op = { id: operationId, operation: 'deploy', createdAt, intent }, r = { schemaVersion: 'roost-compose-recovery-observation-v1', kind: 'queue_failed_partial', releaseId, operationId,
        since: createdAt, targetId: t.targetId, phase: 'candidate', requestedCommit: s.commit, requestedTree: s.candidateTree, deploymentId,
        queue: { targetId: t.targetId, deploymentId, commit: s.commit, status: 'failed', createdAt: stamp('2026-10-04T12:03:01.000Z'), finishedAt: stamp('2026-10-04T12:03:05.000Z') },
        controlPlaneQuiescent: true, configuration: structuredClone(t.configuration), baselineCommit: s.baseCommit, baselineTree: s.baseTree, migrationSchemaVerified: true,
        baselineServices: before, services: rows, partial: { schemaVersion: 'roost-compose-failed-partial-runtime-v1',
            images: rows.filter((r) => r.role !== 'database').map(({ name, imageDigest, commit, tree, deploymentId }) => ({ name, imageDigest, commit, tree, deploymentId })),
            candidateConfigDigest: t.configDigest, databaseReadOnly: true, activeOtherSessions: 0, ownedTransactions: 0, projectServiceSetComplete: true,
            protectedRollbackImages: structuredClone(t.baseline.images), presentRollbackImageDigests: [...new Set([...t.baseline.images.map((r) => r.imageDigest), image('e')])].sort(),
            publicHealth: { healthy: false, healthDigest: hash('0') } } }, evidence = { composeRecovery: r, deploymentIds: [{ targetId: t.targetId, deploymentId }], artifactSetDigest: m.deployment.artifactSetDigest,
        configDigest: m.deployment.configDigest, schemaDigest: m.baseline.schemaDigest, dataDigest: m.baseline.dataDigest, healthDigest: hash('0'), healthy: false,
        observedAt: stamp('2026-10-04T12:03:10.000Z'), currentServiceSetDigest: compose.composeRuntimeSetDigest(rows) }, release = { id: releaseId, snapshot: { ...s, manifestDigest: shared.releaseDigest(m) }, manifest_digest: shared.releaseDigest(m) }, snapshot = { ...release.snapshot, releaseId };
    return { ...f, op, release, snapshot, evidence, r };
}
function partialImageAttributionFixture() {
    const f = partialFixture(), p = f.r.partial;
    p.schemaVersion = 'roost-compose-failed-partial-runtime-v2';
    p.sourceAttribution = 'failed_queue_exact_reference_and_runtime_environment';
    p.candidateCodeProvenanceVerified = false;
    p.images = p.images.map((image) => ({ ...image, imageRef: `${f.target.targetId}_${image.name}:${f.s.commit}`,
        createdAt: stamp('2026-10-04T12:03:01.500Z'), buildRevision: 'unknown', revisionLabel: null, treeLabel: null }));
    return f;
}
function partialRollbackAbsenceFixture() {
    const f = partialImageAttributionFixture(), m = f.m, t = f.target;
    const candidateOperation = { id: f.op.id, operation: 'deploy', createdAt: f.op.createdAt, intent: structuredClone(f.op.intent) }, candidateEvidence = structuredClone(f.evidence);
    const configIntent = { ...structuredClone(f.op.intent), requestId: randomUUID(), operation: 'rollback_config', parameters: { commit: m.rollback.commit,
            artifactSetDigest: m.rollback.artifactSetDigest, configDigest: m.rollback.configDigest, schemaDigest: m.rollback.schemaDigest } };
    const configuration = { id: randomUUID(), operation: 'rollback_config', createdAt: stamp('2026-10-04T12:03:20.000Z'), intent: configIntent,
        outcome: { status: 'succeeded', evidence: { deployedCommit: m.rollback.commit, artifactSetDigest: m.rollback.artifactSetDigest,
                configDigest: m.rollback.configDigest, schemaDigest: m.rollback.schemaDigest, observedAt: stamp('2026-10-04T12:03:21.000Z') } } };
    const rollback = { id: randomUUID(), operation: 'rollback', createdAt: stamp('2026-10-04T12:04:00.000Z'), intent: { ...configIntent, requestId: randomUUID(), operation: 'rollback',
            parameters: { ...configIntent.parameters, targetId: t.targetId } }, outcome: { status: 'uncertain', evidence: { observedAt: stamp('2026-10-04T12:04:01.000Z') } } };
    const r = structuredClone(f.r);
    delete r.partial;
    r.kind = 'queue_absent_partial';
    r.phase = 'rollback';
    r.queue = null;
    r.operationId = rollback.id;
    r.since = rollback.createdAt;
    r.requestedCommit = m.rollback.commit;
    r.requestedTree = f.s.baseTree;
    r.configuration = structuredClone(t.rollbackConfiguration);
    r.deploymentId = 'r' + shared.releaseDigest([f.snapshot.releaseId, rollback.id, t.targetId, 'rollback']).slice(0, 23);
    r.partialRollbackAbsence = { schemaVersion: 'roost-compose-partial-rollback-absence-v1', candidateOperation, candidateEvidence,
        candidateEvidenceDigest: shared.releaseDigest(candidateEvidence), images: structuredClone(f.r.partial.images), databaseReadOnly: true,
        activeOtherSessions: 0, ownedTransactions: 0, projectServiceSetComplete: true, protectedRollbackImages: structuredClone(f.r.partial.protectedRollbackImages),
        presentRollbackImageDigests: structuredClone(f.r.partial.presentRollbackImageDigests), publicHealth: { healthy: false, healthDigest: '1'.repeat(64) }, retryOrdinal: 1 };
    const evidence = { composeRecovery: r, deploymentIds: [], configDigest: m.rollback.configDigest, schemaDigest: m.baseline.schemaDigest, dataDigest: m.baseline.dataDigest,
        healthDigest: '1'.repeat(64), healthy: false, observedAt: stamp('2026-10-04T12:04:03.000Z'), currentServiceSetDigest: compose.composeRuntimeSetDigest(r.services), absenceVerified: true };
    const candidate = { ...structuredClone(f.op), outcome: { status: 'reconciled', reconciledStatus: 'failed', observationOnly: true, evidence: candidateEvidence } };
    const journal = [{ id: randomUUID(), operation: 'merge', outcome: { status: 'succeeded' } }, candidate, configuration, rollback];
    return { ...f, r, evidence, rollback, candidate, configuration, journal };
}
function failedRollbackPartialFixture() {
    const f = partialRollbackAbsenceFixture();
    f.rollback.outcome = { id: randomUUID(), status: 'reconciled', reconciledStatus: 'absent', observationOnly: true, evidence: structuredClone(f.evidence) };
    const absenceOperation = { id: f.rollback.id, operation: 'rollback', createdAt: f.rollback.createdAt, intent: structuredClone(f.rollback.intent) }, absenceEvidence = structuredClone(f.evidence);
    const retry = { id: randomUUID(), operation: 'rollback', createdAt: stamp('2026-10-04T12:05:00.000Z'), intent: { ...structuredClone(f.rollback.intent), requestId: randomUUID() },
        outcome: { id: randomUUID(), status: 'uncertain', evidence: { observedAt: stamp('2026-10-04T12:05:01.000Z') } } };
    const r = structuredClone(f.r), p = r.partialRollbackAbsence;
    delete r.partialRollbackAbsence;
    r.kind = 'queue_failed_rollback_partial';
    r.operationId = retry.id;
    r.since = retry.createdAt;
    r.deploymentId = 'r' + shared.releaseDigest([f.snapshot.releaseId, retry.id, f.target.targetId, 'rollback']).slice(0, 23);
    r.queue = { targetId: f.target.targetId, deploymentId: r.deploymentId, commit: f.m.rollback.commit, status: 'failed', createdAt: stamp('2026-10-04T12:05:01.000Z'), finishedAt: stamp('2026-10-04T12:05:02.000Z') };
    r.partialRollbackFailure = { ...p, schemaVersion: 'roost-compose-failed-rollback-partial-v1', absenceOperation, absenceEvidence, absenceEvidenceDigest: shared.releaseDigest(absenceEvidence) };
    const evidence = { ...f.evidence, composeRecovery: r, deploymentIds: [{ targetId: f.target.targetId, deploymentId: r.deploymentId }], observedAt: stamp('2026-10-04T12:05:03.000Z') };
    delete evidence.absenceVerified;
    f.journal.push(retry);
    return { ...f, retry, r, evidence };
}
function persistedFailed(f) { f.retry.outcome = { id: randomUUID(), status: 'reconciled', reconciledStatus: 'failed', observationOnly: true, evidence: structuredClone(f.evidence) }; return f; }
function failedRollbackPartialClosureFixture() {
    const f = persistedFailed(failedRollbackPartialFixture()), currentEvidence = structuredClone(f.evidence);
    f.s.hostId = randomUUID();
    f.snapshot.hostId = f.s.hostId;
    f.release.snapshot.hostId = f.s.hostId;
    currentEvidence.observedAt = stamp('2026-10-04T12:06:00.000Z');
    currentEvidence.healthDigest = '2'.repeat(64);
    currentEvidence.composeRecovery.partialRollbackFailure.publicHealth.healthDigest = currentEvidence.healthDigest;
    const nativeClosure = { schemaVersion: 'roost-release-owner-native-closure-v1', releaseId: f.release.id, operationId: f.retry.id, agentHostId: f.s.hostId,
        evidenceDigest: shared.releaseDigest(currentEvidence), checkpointDigest: '3'.repeat(64), controllerPid: 100, registeredChildCount: 59, allChildrenClosed: true, nativeProcessesAbsent: true, writerAbsent: true, observedAt: stamp('2026-10-04T12:06:01.000Z') };
    const input = { requestId: randomUUID(), expectedVersion: '4'.repeat(64), failedOperationId: f.retry.id, consentDigest: '5'.repeat(64), evidence: structuredClone(f.evidence), nativeClosure,
        absenceRevalidation: { schemaVersion: 'roost-compose-failed-rollback-partial-closure-revalidation-v1', releaseId: f.release.id, failedOutcomeId: f.retry.outcome.id,
            failedEvidenceDigest: shared.releaseDigest(f.evidence), currentEvidence, nativeClosureDigest: shared.releaseDigest(nativeClosure), observedAt: currentEvidence.observedAt } };
    const state = { release: f.release, journal: f.journal, revocations: [], expectedVersion: input.expectedVersion };
    return { ...f, input, state };
}

function setup(){
 const clock=Date.now();timeOffset=clock-Date.parse('2026-10-04T12:06:02.000Z');const f=failedRollbackPartialClosureFixture(),d=shared.releaseDigest;
 const workspaceId=randomUUID(),issuerUserId=randomUUID(),closureId=randomUUID(),revocationId=randomUUID();
 const old={...f.release.snapshot,taskId:randomUUID(),applicationId:randomUUID(),releaserAgentId:randomUUID(),releaseExecutionId:randomUUID(),manifestDigest:d(f.m)};
 const receipt={...clone(f.input),releaseId:f.release.id,applicationId:old.applicationId,hostId:old.hostId,issuerUserId,failedOutcomeId:f.retry.outcome.id,failedEvidenceDigest:d(f.evidence)};
 const previous={...f.state,release:{...f.release,snapshot:old,workspaceId,issuerUserId},status:'failed',expectedVersion:H('9'),revocations:[{id:revocationId}],
  failedClosures:[{id:closureId,releaseId:f.release.id,failedOperationId:f.retry.id,failedOutcomeId:f.retry.outcome.id,consentDigest:receipt.consentDigest,closureDigest:d(receipt),revocationId,snapshot:receipt,createdAt:new Date(clock-500).toISOString()}]};
 const m=clone(f.m),t=m.deployment.targets[0],commit='7'.repeat(40),tree='8'.repeat(40);m.repository.candidateBranch='codex/compatible-fixture';t.configuration.gitCommit=commit;t.configuration.sourceDigest=H('4');t.sourceDigest=H('4');m.postObservation.candidateCommit=commit;m.postObservation.candidateTree=tree;
 t.configDigest=compose.composeConfigurationDigest(t.configuration);m.deployment.configDigest=d([{targetId:t.targetId,configDigest:t.configDigest}]);
 const at=new Date(clock-100).toISOString(),s={requestId:randomUUID(),taskId:randomUUID(),applicationId:old.applicationId,hostId:old.hostId,releaserAgentId:old.releaserAgentId,
  releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:H('5'),commit,candidateTree:tree,baseCommit:old.baseCommit,baseTree:old.baseTree,
  releaserRevision:at,expiresAt:new Date(clock+60000).toISOString(),manifest:m};
 m.deployment.artifactSetDigest=shared.sourceArtifactDigest(m,s);const images=t.configuration.services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:image('7'),commit,tree}));m.cleanup.protectedResourceIds.push(image('7'));s.manifestDigest=d(m);
 const oldRows=f.evidence.composeRecovery.services,db=clone(oldRows.find(r=>r.role==='database')),inventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:t.targetId,observedAt:at,projectServiceSetComplete:true,physicalServices:[db],digest:H('0')};inventory.digest=shared.compatibleRecoveryInventoryDigest(inventory);
 const entry={schemaVersion:'roost-compose-down-entry-v1',observedAt:at,targetId:t.targetId,configuration:clone(f.evidence.composeRecovery.configuration),projectInventory:inventory,
  services:t.baseline.configuration.services.map(r=>r.role==='database'?{...db,presence:'present',declarationDigest:d(r),inventoryDigest:inventory.digest,observedAt:at}:
   {presence:'absent',name:r.name,role:r.role,source:'built',declarationDigest:d(r),mountDigest:r.mountDigest,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:at}),
  historicalServiceReferences:oldRows.map(r=>({name:r.name,containerId:r.containerId,imageDigest:r.imageDigest,failedEvidenceDigest:d(f.evidence)})),imageAvailability:t.baseline.images.map(r=>({...r,present:false})),
  schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,running:true,healthy:true,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},
  cadences:m.postObservation.runtimeResume.cadences.map(r=>({presence:'absent',name:r.name,behaviorDigest:r.behaviorDigest,held:true,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:at})),
  databaseSettingsDigest:m.postObservation.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:m.postObservation.runtimeResume.ingressSettingsDigest,ingressBlocked:true,activeDeploymentCount:0,publicHealth:{healthy:false,healthDigest:H('0')},evidenceDigest:H('0')};
 entry.ingressFence={schemaVersion:'roost-compose-proxy-network-fence-v1',observedAt:at,targetId:t.targetId,networkId:H('c'),subnet:'10.42.0.0/24',proxyId:H('f'),proxyPid:2345,namespaceDigest:H('8'),databaseContainerId:db.containerId,databaseIpv4:'10.42.0.2',proxyIpv4:'10.42.0.3',port:8000,ruleComment:'roost-release-hold-'+'ab'.repeat(16),ruleDigest:H('9'),originalRulesDigest:H('0'),observedRulesDigest:H('1'),projectNetworkExclusive:true,publishedPortsAbsent:true,rulePresent:true,evidenceDigest:H('0')};entry.ingressFence.evidenceDigest=ingressFence.composeIngressFenceDigest(entry.ingressFence);
 entry.evidenceDigest=shared.compatibleRecoveryEntryDigest(entry);
 s.compatibleArtifactRecovery={schemaVersion:'roost-compose-compatible-artifact-recovery-v1',prior:{releaseId:previous.release.id,expectedVersion:previous.expectedVersion,closureId,closureDigest:d(receipt),failedOperationId:f.retry.id,failedOutcomeId:f.retry.outcome.id,failedEvidenceDigest:d(f.evidence),previousManifestDigest:old.manifestDigest},
  currentEntry:entry,nativeClosure:{...clone(f.input.nativeClosure),evidenceDigest:entry.evidenceDigest,observedAt:at},
  replacement:{commit,tree,artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,images,buildReceiptDigest:H('6'),compatibilityReceiptDigest:H('7'),schemaDigest:m.baseline.schemaDigest,schemaChangeAllowed:false},
  publication:{mode:'new_exact_commit',baseCommit:old.commit,baseTree:old.candidateTree},scopeAudit:{taskId:randomUUID(),executionId:s.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('8'),scopeDigest:H('0')},
  failurePolicy:{mode:'freeze_protected_database',automaticHistoricalRollback:false,dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true}};
 s.compatibleArtifactRecovery.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(s);
 const proof={schemaVersion:'roost-compatible-recovery-proof-snapshot-v1',classification:'owner_verified_native_receipt',workspaceId,applicationId:s.applicationId,issuerUserId,evidenceId:randomUUID(),nativeAttemptId:randomUUID(),sourceExecutionId:randomUUID(),
  ...Object.fromEntries(['recordDigest','metadataDigest','publicPayloadDigest','privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest','sourceBasisDigest','scopeBasisDigest'].map(k=>[k,H('a')])),
  requestDigest:d(s),manifestDigest:s.manifestDigest,scopeDigest:s.compatibleArtifactRecovery.scopeAudit.scopeDigest,buildReceiptDigest:s.compatibleArtifactRecovery.replacement.buildReceiptDigest,compatibilityReceiptDigest:s.compatibleArtifactRecovery.replacement.compatibilityReceiptDigest,
  nativeAttemptIsAgentExecution:false,serverOperatingSystemAttestation:false,serverPrivateSignatureVerification:false,releaseAuthority:false};
 const state={release:{id:randomUUID(),workspaceId,issuerUserId,createdAt:new Date(clock).toISOString(),manifestDigest:s.manifestDigest,snapshot:{...s,compatibleRecoveryProof:proof}},journal:[],status:'active',expectedVersion:H('b')};
 const calls=[];let merged=false,queueId='fixture_queue',fixturePresent=false;
 const freshEntry=()=>{const e=clone(entry),at=new Date(Date.now()-1).toISOString();e.observedAt=at;e.projectInventory.observedAt=at;e.projectInventory.digest=shared.compatibleRecoveryInventoryDigest(e.projectInventory);
  for(const row of [...e.services,...e.cadences]){row.observedAt=at;row.inventoryDigest=e.projectInventory.digest;}e.ingressFence.observedAt=at;e.ingressFence.evidenceDigest=ingressFence.composeIngressFenceDigest(e.ingressFence);e.evidenceDigest=shared.compatibleRecoveryEntryDigest(e);return e;};
 const health=()=>{const e=composeFixture().evidence(false),row=e.composeTargets[0],at=new Date().toISOString();row.configuration=clone(t.configuration);row.binding.commit=commit;row.binding.tree=tree;row.binding.deploymentId=queueId;row.binding.queue={...row.binding.queue,deploymentId:queueId,commit};row.runtime.deploymentId=queueId;
  row.runtime.services=t.configuration.services.map((r,n)=>({...clone(row.runtime.services.find(v=>v.name===r.name)??row.runtime.services.find(v=>v.role==='cadence')),name:r.name,role:r.role,containerId:H(String(n+1)),imageDigest:r.source==='image'?r.imageDigest:image('7'),mountDigest:r.mountDigest,
   ...(r.source==='built'?{commit,tree,deploymentId:queueId}:{})}));row.binding.images=images.map(r=>({...r,deploymentId:queueId}));
  Object.assign(e,{deployedCommit:commit,deployedTree:tree,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,observationSeconds:m.observation.seconds,observedAt:at,deploymentIds:[{targetId:t.targetId,deploymentId:queueId}],deployedSetDigest:d([{targetId:t.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(row.runtime.services)}])});return e;};
 const phase=op=>{const p=m.postObservation,binding={postObservationDigest:d(p),fixtureDigest:d(p.fixture),controllerDigest:p.controllerDigest,targetId:t.targetId,commit,tree};let q;
  if(op==='smoke'){fixturePresent=true;q={...binding,kind:op,backendCommit:commit,frontendCommit:commit,emptyActivityCount:0,populatedActivityCount:1,renderedEventId:p.fixture.eventId,renderedSummaryDigest:p.fixture.summaryDigest,memoryId:p.fixture.memoryId,emptyRenderDigest:H('1'),populatedRenderDigest:H('2'),negativePathStatus:401,schemaDigest:m.baseline.schemaDigest,nonOwnedDataDigest:m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,nativeChildrenClosed:true,providerRequests:0,externalActions:0};}
  else if(op==='fixture_cleanup'){fixturePresent=false;q={...binding,kind:op,schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,activeOtherSessions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true,providerRequests:0,externalActions:0};}
  else{assert.equal(fixturePresent,false);q={...binding,kind:op,backendCommit:commit,frontendCommit:commit,schemaDigest:m.baseline.schemaDigest,healthy:true,fixtureAbsent:true,nativeChildrenClosed:true,databaseSettingsDigest:p.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:p.runtimeResume.ingressSettingsDigest,observationSeconds:p.runtimeResume.observationSeconds,
   services:health().composeTargets[0].runtime.services.map(r=>r.role==='cadence'?{...r,state:'running'}:r),cadences:clone(p.runtimeResume.cadences),cadenceEvidence:p.runtimeResume.cadences.map(r=>({name:r.name,behaviorDigest:r.behaviorDigest,completedTicks:1,executionState:'executed',behaviorVerified:true,summaryDigest:H('3'),observedAt:new Date().toISOString()}))};}
  return{status:'succeeded',evidence:{postObservation:q}};};
 const gitEvidence=()=>({remoteCommit:commit,remoteTree:tree,remoteBase:old.commit,remoteBaseTree:old.candidateTree,prHeadCommit:commit,pullRequestNumber:2,reviewApproved:true,prMerged:true,mergedCommit:commit});
 const config=()=>({deployedCommit:commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest});
 const args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},assertWriter:async()=>calls.push('writer'),inspectCheckout:async(_m,c,b,t)=>{calls.push({kind:'checkout',commit:c,base:b,tree:t});return{commit,tree};},
  github:{inspect:async()=>{calls.push('git_read');return{remoteBase:merged?commit:old.commit,remoteTree:merged?tree:old.candidateTree};},push:async()=>{calls.push('push');return gitEvidence();},createPullRequest:async()=>{calls.push('pr');return gitEvidence();},recordIndependentReview:async()=>{calls.push('review');return gitEvidence();},merge:async()=>{calls.push('merge');merged=true;return gitEvidence();},reconcile:async()=>{calls.push('git_reconcile');return{status:'succeeded',evidence:gitEvidence()};},archive:async()=>assert.fail('archive effect forbidden')},
  coolify:{inspect:async()=>assert.fail('healthy baseline inspect forbidden'),inspectCompatibleRecoveryEntry:async({previousState})=>{assert.equal(previousState,previous);calls.push('down_entry');return{currentEntry:freshEntry(),closureReceipt:clone(receipt)};},configureCandidate:async()=>{calls.push('deploy_config');return config();},configureRollback:async()=>assert.fail('rollback configuration forbidden'),rollback:async()=>assert.fail('historical rollback forbidden'),
   deploy:async()=>{calls.push('deploy');return{state:'finished',deploymentIds:health().deploymentIds};},waitForDeployment:async()=>({state:'finished',deploymentIds:health().deploymentIds}),health:async()=>health(),observe:async(_m,_s,o)=>{assert.equal(o.rollback,false);calls.push('observe');return health();},reconcileDeployment:async()=>{calls.push('deploy_reconcile');return{state:'finished',...health()};},reconcileConfiguration:async()=>{calls.push('config_reconcile');return{state:'applied',...config()};}},
  resources:{inspectCapacity:async()=>calls.push('capacity'),postObservation:async(_m,_s,o)=>{calls.push(o.operation);return phase(o.operation);},reconcilePostObservation:async(_m,_s,o)=>{calls.push('post_reconcile');return phase(o.operation);},verifyRetention:async()=>({applicationActive:true,targetId:t.targetId,protectedResourcesDigest:d(m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:[]}),cleanupLocal:async()=>assert.fail('local cleanup forbidden')},
  api:async(route,{method,body})=>{if(method==='GET'){calls.push('old_get');assert.equal(route,`/v1/agent-runtime/releases/${previous.release.id}`);return previous;}
   calls.push('api_post');if(route.endsWith('/operations')){const row={id:randomUUID(),operation:body.operation,intent:body,createdAt:new Date().toISOString(),outcome:null};state.journal.push(row);return{...state,operation:row,replayed:false};}
   const row=state.journal.find(r=>route.includes(r.id));row.outcome=body;if(row.operation==='cleanup'&&body.status==='succeeded')state.status='completed';return state;}};
 return{f,s,m,t,entry,proof,previous,state,args,calls,health,freshEntry,phase};
}
test('native recovery grant includes the server compatible proof and refuses substituted provenance',()=>{
 const f=setup(),snapshot=f.state.release.snapshot;
 snapshot.readinessDigest=H('c');snapshot.configurationDigest=H('d');
 const client={hostId:snapshot.hostId,agentId:snapshot.releaserAgentId};
 const candidate=releaseRecoveryCandidate(f.state,client);
 assert.equal(candidate.grantDigest,shared.releaseDigest({releaseId:f.state.release.id,snapshot}));
 const changed=clone(f.state);changed.release.snapshot.compatibleRecoveryProof.sourceBasisDigest=H('e');
 assert.notEqual(releaseRecoveryCandidate(changed,client).grantDigest,candidate.grantDigest);
 for(const mutate of [s=>{delete s.compatibleRecoveryProof;},s=>{s.compatibleRecoveryProof.requestDigest=H('0');},
   s=>{s.compatibleRecoveryProof.applicationId=randomUUID();},s=>{s.compatibleRecoveryProof.serverOperatingSystemAttestation=true;}]){
  const invalid=clone(f.state);mutate(invalid.release.snapshot);assert.throws(()=>releaseRecoveryCandidate(invalid,client));
 }
});

test('counterfactual completed journal binds distinct outcome request IDs by operation identity',async()=>{
 const f=setup();for(let n=0;n<11;n++)await runReleaseStep(f.args);
 const base=Date.now()-2000;f.state.release.createdAt=new Date(base-1000).toISOString();
 for(const [n,row]of f.state.journal.entries()){
  row.releaseId=f.state.release.id;row.outcome.operationId=row.id;
  row.createdAt=new Date(base).toISOString();
  assert.notEqual(row.outcome.requestId,row.intent.requestId);
 }
 f.state.release.snapshot.readinessDigest=H('c');f.state.release.snapshot.configurationDigest=H('d');
 f.state.release.applicationId=f.s.applicationId;f.state.release.hostId=f.s.hostId;
 const pin={schemaVersion:'roost-governed-release-inspection-v1',commit:f.s.commit,tree:f.s.candidateTree,
  manifestDigest:f.s.manifestDigest,scopeDigest:f.s.compatibleArtifactRecovery.scopeAudit.scopeDigest,imageDigest:image('7'),minimumObservationSeconds:1,minimumRestoredActivitySeconds:1};
 const args={inspection:pin,applicationId:f.s.applicationId,hostId:f.s.hostId,agentId:randomUUID(),
  validateOutcome:(release,row,outcome,prior)=>{const reason=backend.releaseOutcomeError(release,row,outcome,prior);assert.equal(reason,null,row.operation+': '+reason);return reason;},qualifyStoredSnapshot:qualifyCompatibleReleaseSnapshot};
 assert.equal(inspectionContract.assertCompletedReleaseInspection(f.state,args).phaseCount,11);
 const wrong=clone(f.state);wrong.journal[0].outcome.operationId=randomUUID();
 assert.throws(()=>inspectionContract.assertCompletedReleaseInspection(wrong,args),/phase_unproven/);
});

test('compatible broker follows only its full governed sequence after genuine-shaped canonical down entry',async()=>{
 const f=setup();assert(shared.createReleaseSchema.safeParse(f.s).success);assert.equal(shared.composeFailedRollbackPartialJournalError({...f.previous.release.snapshot,releaseId:f.previous.release.id},f.previous.journal.at(-1),f.previous.journal.at(-1).outcome.evidence,f.previous.journal),null);
 assert.equal(nextReleaseOperation(f.state),'push');for(let i=0;i<11;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.map(r=>r.operation),shared.compatibleRecoveryOperations);assert.equal(nextReleaseOperation(f.state),null);
 assert(f.calls.indexOf('down_entry')<f.calls.indexOf('git_read'));assert(f.calls.indexOf('down_entry')<f.calls.indexOf('push'));
 assert.equal(f.calls.filter(c=>c==='down_entry').length,4);assert.equal(f.calls.filter(c=>c==='deploy').length,1);
 assert(f.calls.filter(c=>c.kind==='checkout').every(c=>c.base===f.s.compatibleArtifactRecovery.publication.baseCommit));assert.equal(f.m.baseline.observedAt,f.previous.release.snapshot.manifest.baseline.observedAt);
});
test('lost push reply is read-only reconciled under same intent without another publication',async()=>{const f=setup();f.args.github.push=async()=>{f.calls.push('push');throw Error('private transport reply');};const first=await runReleaseStep(f.args);assert(first.reconciliationRequired);assert.equal(nextReleaseOperation(f.state),'reconcile');await runReleaseStep(f.args);assert.equal(f.state.journal.length,1);assert.equal(f.calls.filter(c=>c==='push').length,1);assert.equal(f.calls.filter(c=>c==='git_reconcile').length,1);assert.equal(nextReleaseOperation(f.state),'pr');});
test('lost deploy reply reconciles only the same current queue and never triggers historical rollback',async()=>{const f=setup();for(let i=0;i<5;i++)await runReleaseStep(f.args);f.args.coolify.deploy=async()=>{f.calls.push('deploy');throw Error('lost');};await runReleaseStep(f.args);await runReleaseStep(f.args);assert.equal(f.calls.filter(c=>c==='deploy').length,1);assert.equal(f.calls.filter(c=>c==='deploy_reconcile').length,1);assert.equal(nextReleaseOperation(f.state),'observe');});
test('attributed unhealthy candidate freezes the grant with honest reinspection requirement and no rollback',async()=>{const f=setup();for(let i=0;i<5;i++)await runReleaseStep(f.args);f.args.coolify.health=async()=>{const e=f.health();e.healthy=false;e.composeTargets[0].runtime.services.find(r=>r.role==='app').health='unhealthy';return e;};await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'failed');assert.equal(nextReleaseOperation(f.state),'frozen');const count=f.calls.length,r=await runReleaseStep(f.args);assert(r.compatibleRecoveryFrozen);assert(r.nextOperationBlocked);assert.equal(r.nativeHoldReinspected,false);assert(r.failureDisposition.dbPreservationMustBeReinspected);assert.equal(r.failureDisposition.configurationRollbackAllowed,false);assert.equal(f.calls.length,count);});
test('uncertain push absent readback freezes rather than retrying branch or starting candidate',async()=>{const f=setup();f.args.github.push=async()=>{f.calls.push('push');throw Error('lost');};await runReleaseStep(f.args);f.args.github.reconcile=async()=>({status:'absent',evidence:{absenceVerified:true,remoteCommit:f.s.compatibleArtifactRecovery.publication.baseCommit,remoteTree:f.s.compatibleArtifactRecovery.publication.baseTree}});await runReleaseStep(f.args);assert.equal(nextReleaseOperation(f.state),'frozen');await runReleaseStep(f.args);assert.equal(f.calls.filter(c=>c==='push').length,1);assert(!f.calls.includes('deploy'));});
test('different immutable image at same new commit cannot inherit compatibility acceptance',async()=>{const f=setup();for(let i=0;i<5;i++)await runReleaseStep(f.args);f.args.coolify.health=async()=>{const e=f.health();e.composeTargets[0].runtime.services[0].imageDigest=image('8');e.composeTargets[0].binding.images.find(r=>r.name===e.composeTargets[0].runtime.services[0].name).imageDigest=image('8');e.deployedSetDigest=shared.releaseDigest([{targetId:f.t.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(e.composeTargets[0].runtime.services)}]);return e;};const r=await runReleaseStep(f.args);assert(r.reconciliationRequired);assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');assert(!f.state.journal.some(r=>r.operation==='rollback'));});
test('reconciliation-only cannot create the first compatible intent or effect',async()=>{const f=setup();const r=await runReleaseStep({...f.args,reconciliationOnly:true});assert(r.reconciliationOnlyComplete);assert.equal(f.calls.length,0);});
for(const op of ['rollback','rollback_config','cleanup_resource','archive_repository','cleanup_local'])test('compatible journal refuses forbidden operation '+op,async()=>{const f=setup();f.state.journal=[{operation:op,intent:{operation:op,parameters:{}},outcome:null}];await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery/);assert.equal(f.calls.length,0);});
const badProof={missing:f=>delete f.state.release.snapshot.compatibleRecoveryProof,unknown:f=>f.proof.untrusted=true,claimOS:f=>f.proof.serverOperatingSystemAttestation=true,claimSignature:f=>f.proof.serverPrivateSignatureVerification=true,request:f=>f.proof.requestDigest=H('0'),manifest:f=>f.proof.manifestDigest=H('0'),scope:f=>f.proof.scopeDigest=H('0'),imagesBuild:f=>f.proof.buildReceiptDigest=H('0'),compatibility:f=>f.proof.compatibilityReceiptDigest=H('0'),workspace:f=>f.proof.workspaceId=randomUUID(),issuer:f=>f.proof.issuerUserId=randomUUID()};
for(const[name,change]of Object.entries(badProof))test('server-derived proof refuses '+name,async()=>{const f=setup();change(f);await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery/);assert.equal(f.calls.length,0);});
const badPrior={version:f=>f.previous.expectedVersion=H('0'),notFailed:f=>f.previous.status='active',missingClosure:f=>f.previous.failedClosures=[],revocation:f=>f.previous.revocations=[],wrongClosure:f=>f.previous.failedClosures[0].closureDigest=H('0'),canonicalJournal:f=>f.previous.journal.splice(f.previous.journal.findIndex(r=>r.operation==='deploy'),1),failedEvidence:f=>f.previous.journal.at(-1).outcome.evidence.healthy=true};
for(const[name,change]of Object.entries(badPrior))test('canonical FAILED source refuses '+name,async()=>{const f=setup();change(f);await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery_entry_unproven/);assert(!f.calls.includes('git_read'));assert(!f.calls.includes('api_post'));});
const badEntry={stale:e=>{e.observedAt=new Date(Date.now()-300001).toISOString();e.projectInventory.observedAt=e.observedAt;},future:e=>e.observedAt=new Date(Date.now()+10000).toISOString(),image:e=>e.database.imageDigest=image('0'),mount:e=>e.database.mountDigest=H('0'),container:e=>e.database.containerId=H('0'),data:e=>e.dataDigest=H('0'),sequence:e=>e.sequenceDigest=H('0'),missing:e=>e.services.pop(),inventory:e=>e.projectInventory.digest=H('0'),unowned:e=>e.projectInventory.physicalServices.push(clone(e.projectInventory.physicalServices[0])),unheld:e=>e.cadences[0].held=false,ingress:e=>e.ingressBlocked=false};
for(const[name,change]of Object.entries(badEntry))test('fresh down transport refuses '+name,async()=>{const f=setup();f.args.coolify.inspectCompatibleRecoveryEntry=async()=>{const currentEntry=f.freshEntry();change(currentEntry);currentEntry.evidenceDigest=shared.compatibleRecoveryEntryDigest(currentEntry);return{currentEntry,closureReceipt:clone(f.previous.failedClosures[0].snapshot)};};await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery_entry_unproven/);assert(!f.calls.includes('git_read'));assert(!f.calls.includes('api_post'));});
for(const [name,change]of Object.entries({stale:p=>p.observedAt=new Date(Date.now()-300001).toISOString(),namespace:p=>p.namespaceDigest=H('0'),foreignNetwork:p=>p.networkId=H('0'),rule:p=>p.ruleDigest=H('0'),unownedRules:p=>p.originalRulesDigest=H('2'),proxyRestart:p=>p.proxyPid+=1,outsideSubnet:p=>p.proxyIpv4='10.99.0.2',missing:p=>p.rulePresent=false}))test('fresh physical ingress transport refuses '+name,async()=>{const f=setup();f.args.coolify.inspectCompatibleRecoveryEntry=async()=>{const currentEntry=f.freshEntry();change(currentEntry.ingressFence);currentEntry.ingressFence.evidenceDigest=ingressFence.composeIngressFenceDigest(currentEntry.ingressFence);currentEntry.evidenceDigest=shared.compatibleRecoveryEntryDigest(currentEntry);return{currentEntry,closureReceipt:clone(f.previous.failedClosures[0].snapshot)};};await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery_entry_unproven/);assert(!f.calls.includes('git_read'));assert(!f.calls.includes('api_post'));});
test('missing dedicated down reader does not fall back to ordinary healthy baseline',async()=>{const f=setup();delete f.args.coolify.inspectCompatibleRecoveryEntry;await assert.rejects(runReleaseStep(f.args),/release_compatible_recovery_entry_gateway_required/);assert(!f.calls.includes('api_post'));});
test('publication drift rejects new Git capability while historical runtime commit stays unchanged',async()=>{const f=setup();f.args.github.inspect=async()=>({remoteBase:f.s.baseCommit,remoteTree:f.s.baseTree});await assert.rejects(runReleaseStep(f.args),/release_base_changed/);assert(!f.calls.includes('api_post'));});
test('candidate observation shorter than manifest cannot authorize smoke/resume',async()=>{const f=setup();for(let i=0;i<6;i++)await runReleaseStep(f.args);f.args.coolify.observe=async()=>{const e=f.health();e.observationSeconds=0;return e;};const r=await runReleaseStep(f.args);assert(r.reconciliationRequired);assert.equal(nextReleaseOperation(f.state),'reconcile');assert(!f.calls.includes('smoke'));});
test('failed smoke freezes without fixture reset, runtime resume or historical rollback dispatch',async()=>{const f=setup();for(let i=0;i<7;i++)await runReleaseStep(f.args);f.args.resources.postObservation=async()=>({status:'failed',evidence:{postObservation:{postObservationDigest:shared.releaseDigest(f.m.postObservation),fixtureDigest:shared.releaseDigest(f.m.postObservation.fixture),controllerDigest:f.m.postObservation.controllerDigest,targetId:f.t.targetId,commit:f.s.commit,tree:f.s.candidateTree,kind:'failure',phase:'smoke',failureCode:'populated_render_failed',ownedEffects:'present',nativeChildrenClosed:true}}});await runReleaseStep(f.args);assert.equal(nextReleaseOperation(f.state),'frozen');assert.equal(f.state.journal.at(-1).outcome.status,'failed');assert(!f.calls.includes('fixture_cleanup'));assert(!f.calls.includes('runtime_resume'));});
