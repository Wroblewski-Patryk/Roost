import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';import compose from './lib/agent-host-release-compose-state.cjs';
import {fixture as composeFixture,hash,image} from './fixtures/release-compose-contract.cjs';
import {runReleaseStep,nextReleaseOperation} from './lib/agent-host-release-broker.mjs';
const clone=structuredClone,H=x=>x.repeat(64),T='2026-10-04T12:06:07.000Z';
let fixturePost=false,fixtureOwned=false;
// Isolated synthetic fixture, copied from frozen shared contract fixture functions.
// No imported test registration, API, Docker, native process or application effects.
function partialFixture() {
    const f = composeFixture(), t = f.target, m = f.m, s = f.s;
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
    const releaseId = randomUUID(), operationId = randomUUID(), createdAt = '2026-10-04T12:03:00.000Z', deploymentId = 'r' + shared.releaseDigest([releaseId, operationId, t.targetId, 'candidate']).slice(0, 23), before = f.evidence('baseline').composeTargets[0].runtime.services.filter((r) => r.role !== 'migration')
        .map((row) => Object.fromEntries(['name', 'role', 'containerId', 'imageDigest', 'mountDigest', 'state', 'health', 'exitCode', 'createdAt'].map(k => [k, row[k]]))), rows = t.configuration.services.map((d, n) => ({ name: d.name, role: d.role, containerId: hash(['6', '7', '8', '9', 'a'][n]),
        imageDigest: d.source === 'image' ? d.imageDigest : image('f'), mountDigest: d.mountDigest, state: d.role === 'database' ? 'running' : d.role === 'migration' ? 'exited' : 'created',
        health: d.role === 'database' ? 'healthy' : null, exitCode: d.role === 'migration' ? 1 : 0, createdAt: '2026-10-04T12:03:02.000Z',
        ...(d.source === 'built' ? { commit: s.commit, tree: s.candidateTree, deploymentId } : {}) })), intent = { requestId: randomUUID(), operation: 'deploy', manifestDigest: shared.releaseDigest(m), commit: s.commit, baseCommit: s.baseCommit, expectedVersion: hash('9'),
        observed: { commit: s.commit, baseCommit: s.commit, baseTree: s.candidateTree, manifestDigest: shared.releaseDigest(m) },
        parameters: { targetId: t.targetId, commit: s.commit, artifactSetDigest: m.deployment.artifactSetDigest, configDigest: m.deployment.configDigest, schemaDigest: m.deployment.schemaDigest } }, op = { id: operationId, operation: 'deploy', createdAt, intent }, r = { schemaVersion: 'roost-compose-recovery-observation-v1', kind: 'queue_failed_partial', releaseId, operationId,
        since: createdAt, targetId: t.targetId, phase: 'candidate', requestedCommit: s.commit, requestedTree: s.candidateTree, deploymentId,
        queue: { targetId: t.targetId, deploymentId, commit: s.commit, status: 'failed', createdAt: '2026-10-04T12:03:01.000Z', finishedAt: '2026-10-04T12:03:05.000Z' },
        controlPlaneQuiescent: true, configuration: structuredClone(t.configuration), baselineCommit: s.baseCommit, baselineTree: s.baseTree, migrationSchemaVerified: true,
        baselineServices: before, services: rows, partial: { schemaVersion: 'roost-compose-failed-partial-runtime-v1',
            images: rows.filter((r) => r.role !== 'database').map(({ name, imageDigest, commit, tree, deploymentId }) => ({ name, imageDigest, commit, tree, deploymentId })),
            candidateConfigDigest: t.configDigest, databaseReadOnly: true, activeOtherSessions: 0, ownedTransactions: 0, projectServiceSetComplete: true,
            protectedRollbackImages: structuredClone(t.baseline.images), presentRollbackImageDigests: [...new Set([...t.baseline.images.map((r) => r.imageDigest), image('e')])].sort(),
            publicHealth: { healthy: false, healthDigest: hash('0') } } }, evidence = { composeRecovery: r, deploymentIds: [{ targetId: t.targetId, deploymentId }], artifactSetDigest: m.deployment.artifactSetDigest,
        configDigest: m.deployment.configDigest, schemaDigest: m.baseline.schemaDigest, dataDigest: m.baseline.dataDigest, healthDigest: hash('0'), healthy: false,
        observedAt: '2026-10-04T12:03:10.000Z', currentServiceSetDigest: compose.composeRuntimeSetDigest(rows) }, release = { id: releaseId, snapshot: { ...s, manifestDigest: shared.releaseDigest(m) }, manifest_digest: shared.releaseDigest(m) }, snapshot = { ...release.snapshot, releaseId };
    return { ...f, op, release, snapshot, evidence, r };
}
function partialImageAttributionFixture() {
    const f = partialFixture(), p = f.r.partial;
    p.schemaVersion = 'roost-compose-failed-partial-runtime-v2';
    p.sourceAttribution = 'failed_queue_exact_reference_and_runtime_environment';
    p.candidateCodeProvenanceVerified = false;
    p.images = p.images.map((image) => ({ ...image, imageRef: `${f.target.targetId}_${image.name}:${f.s.commit}`,
        createdAt: '2026-10-04T12:03:01.500Z', buildRevision: 'unknown', revisionLabel: null, treeLabel: null }));
    return f;
}
function partialRollbackAbsenceFixture() {
    const f = partialImageAttributionFixture(), m = f.m, t = f.target;
    const candidateOperation = { id: f.op.id, operation: 'deploy', createdAt: f.op.createdAt, intent: structuredClone(f.op.intent) }, candidateEvidence = structuredClone(f.evidence);
    const configIntent = { ...structuredClone(f.op.intent), requestId: randomUUID(), operation: 'rollback_config', parameters: { commit: m.rollback.commit,
            artifactSetDigest: m.rollback.artifactSetDigest, configDigest: m.rollback.configDigest, schemaDigest: m.rollback.schemaDigest } };
    const configuration = { id: randomUUID(), operation: 'rollback_config', createdAt: '2026-10-04T12:03:20.000Z', intent: configIntent,
        outcome: { status: 'succeeded', evidence: { deployedCommit: m.rollback.commit, artifactSetDigest: m.rollback.artifactSetDigest,
                configDigest: m.rollback.configDigest, schemaDigest: m.rollback.schemaDigest, observedAt: '2026-10-04T12:03:21.000Z' } } };
    const rollback = { id: randomUUID(), operation: 'rollback', createdAt: '2026-10-04T12:04:00.000Z', intent: { ...configIntent, requestId: randomUUID(), operation: 'rollback',
            parameters: { ...configIntent.parameters, targetId: t.targetId } }, outcome: { status: 'uncertain', evidence: { observedAt: '2026-10-04T12:04:01.000Z' } } };
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
        healthDigest: '1'.repeat(64), healthy: false, observedAt: '2026-10-04T12:04:03.000Z', currentServiceSetDigest: compose.composeRuntimeSetDigest(r.services), absenceVerified: true };
    const candidate = { ...structuredClone(f.op), outcome: { status: 'reconciled', reconciledStatus: 'failed', observationOnly: true, evidence: candidateEvidence } };
    const journal = [{ id: randomUUID(), operation: 'merge', outcome: { status: 'succeeded' } }, candidate, configuration, rollback];
    return { ...f, r, evidence, rollback, candidate, configuration, journal };
}
function failedRollbackPartialFixture() {
    const f = partialRollbackAbsenceFixture();
    f.rollback.outcome = { id: randomUUID(), status: 'reconciled', reconciledStatus: 'absent', observationOnly: true, evidence: structuredClone(f.evidence) };
    const absenceOperation = { id: f.rollback.id, operation: 'rollback', createdAt: f.rollback.createdAt, intent: structuredClone(f.rollback.intent) }, absenceEvidence = structuredClone(f.evidence);
    const retry = { id: randomUUID(), operation: 'rollback', createdAt: '2026-10-04T12:05:00.000Z', intent: { ...structuredClone(f.rollback.intent), requestId: randomUUID() },
        outcome: { id: randomUUID(), status: 'uncertain', evidence: { observedAt: '2026-10-04T12:05:01.000Z' } } };
    const r = structuredClone(f.r), p = r.partialRollbackAbsence;
    delete r.partialRollbackAbsence;
    r.kind = 'queue_failed_rollback_partial';
    r.operationId = retry.id;
    r.since = retry.createdAt;
    r.deploymentId = 'r' + shared.releaseDigest([f.snapshot.releaseId, retry.id, f.target.targetId, 'rollback']).slice(0, 23);
    r.queue = { targetId: f.target.targetId, deploymentId: r.deploymentId, commit: f.m.rollback.commit, status: 'failed', createdAt: '2026-10-04T12:05:01.000Z', finishedAt: '2026-10-04T12:05:02.000Z' };
    r.partialRollbackFailure = { ...p, schemaVersion: 'roost-compose-failed-rollback-partial-v1', absenceOperation, absenceEvidence, absenceEvidenceDigest: shared.releaseDigest(absenceEvidence) };
    const evidence = { ...f.evidence, composeRecovery: r, deploymentIds: [{ targetId: f.target.targetId, deploymentId: r.deploymentId }], observedAt: '2026-10-04T12:05:03.000Z' };
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
    currentEvidence.observedAt = '2026-10-04T12:06:00.000Z';
    currentEvidence.healthDigest = '2'.repeat(64);
    currentEvidence.composeRecovery.partialRollbackFailure.publicHealth.healthDigest = currentEvidence.healthDigest;
    const nativeClosure = { schemaVersion: 'roost-release-owner-native-closure-v1', releaseId: f.release.id, operationId: f.retry.id, agentHostId: f.s.hostId,
        evidenceDigest: shared.releaseDigest(currentEvidence), checkpointDigest: '3'.repeat(64), controllerPid: 100, registeredChildCount: 59, allChildrenClosed: true, nativeProcessesAbsent: true, writerAbsent: true, observedAt: '2026-10-04T12:06:01.000Z' };
    const input = { requestId: randomUUID(), expectedVersion: '4'.repeat(64), failedOperationId: f.retry.id, consentDigest: '5'.repeat(64), evidence: structuredClone(f.evidence), nativeClosure,
        absenceRevalidation: { schemaVersion: 'roost-compose-failed-rollback-partial-closure-revalidation-v1', releaseId: f.release.id, failedOutcomeId: f.retry.outcome.id,
            failedEvidenceDigest: shared.releaseDigest(f.evidence), currentEvidence, nativeClosureDigest: shared.releaseDigest(nativeClosure), observedAt: currentEvidence.observedAt } };
    const state = { release: f.release, journal: f.journal, revocations: [], expectedVersion: input.expectedVersion };
    return { ...f, input, state };
}
function recoveryOnlyFixture() {
    const f = failedRollbackPartialClosureFixture(), old = f.release.snapshot;
    Object.assign(old, { taskId: randomUUID(), applicationId: randomUUID(), hostId: f.s.hostId, releaseExecutionId: randomUUID(), releaserAgentId: randomUUID(), releaserCredentialId: randomUUID(), reviewId: randomUUID(), materialVersion: H('8'), manifestDigest: shared.releaseDigest(f.m) });
    const owner = randomUUID(), closureId = randomUUID(), revocationId = randomUUID();
    f.release.issuer_user_id = owner;
    const receipt = { ...clone(f.input), releaseId: f.release.id, applicationId: old.applicationId, hostId: old.hostId, issuerUserId: owner,
        failedOutcomeId: f.retry.outcome.id, failedEvidenceDigest: shared.releaseDigest(f.evidence) };
    const closure = { id: closureId, release_id: f.release.id, failed_operation_id: f.retry.id, failed_outcome_id: f.retry.outcome.id, consent_digest: receipt.consentDigest,
        closure_digest: shared.releaseDigest(receipt), revocation_id: revocationId, snapshot: receipt, created_at: new Date('2026-10-04T12:06:02.000Z') };
    const state = { ...f.state, expectedVersion: H('9'), revocations: [{ id: revocationId }], failedClosures: [closure] };
    const m = clone(f.m), target = m.deployment.targets[0], renderer = H('0');
    target.baseline.controllerInvariants.rendererDigest = renderer;
    for (const config of [target.configuration, target.rollbackConfiguration, target.baseline.configuration]) {
        config.sourcePins.controllerRenderer = renderer;
        if (config.controllerPolicy)
            config.controllerPolicy.rendererDigest = renderer;
    }
    for (const config of [target.configuration, target.rollbackConfiguration]) {
        config.controllerPolicy.artifactDigest = H('1');
        config.controllerPolicy.buildCommandDigest = H('2');
        config.controllerPolicy.startCommandDigest = H('3');
        config.settingsDigest = H('4');
        config.runtimePolicyDigest = H('5');
    }
    target.configDigest = compose.composeConfigurationDigest(target.configuration);
    target.rollbackConfigDigest = compose.composeConfigurationDigest(target.rollbackConfiguration);
    target.baseline.configDigest = compose.composeConfigurationDigest(target.baseline.configuration);
    for (const [section, d] of [['deployment', target.configDigest], ['rollback', target.rollbackConfigDigest], ['baseline', target.baseline.configDigest]])
        m[section].configDigest = shared.releaseDigest([{ targetId: target.targetId, configDigest: d }]);
    for (const [section, mode] of [['deployment', false], ['rollback', true], ['baseline', 'baseline']])
        m[section].artifactSetDigest = shared.sourceArtifactDigest(m, old, mode);
    const input = { requestId: randomUUID(), ...Object.fromEntries(['taskId', 'applicationId', 'hostId', 'releaserAgentId', 'reviewId', 'materialVersion', 'commit', 'candidateTree', 'baseCommit', 'baseTree'].map(k => [k, old[k]])),
        releaseExecutionId: randomUUID(), releaserCredentialId: randomUUID(), credentialVersion: 1, releaserRevision: T, expiresAt: '2026-10-04T12:30:00.000Z', manifest: m, manifestDigest: shared.releaseDigest(m) };
    const recoveryOnly = { schemaVersion: 'roost-compose-recovery-only-v1', releaseId: f.release.id, expectedVersion: state.expectedVersion, closureId, closureDigest: closure.closure_digest,
        failedOperationId: f.retry.id, failedOutcomeId: f.retry.outcome.id, failedEvidenceDigest: shared.releaseDigest(f.evidence), previousManifestDigest: old.manifestDigest,
        currentEvidence: clone(receipt.absenceRevalidation.currentEvidence), nativeClosure: clone(receipt.nativeClosure),
        scopeAudit: { taskId: randomUUID(), executionId: input.releaseExecutionId, reviewId: randomUUID(), materialVersion: H('a'), scopeDigest: H('b') } };
    input.recoveryOnly = recoveryOnly;
    recoveryOnly.scopeAudit.scopeDigest = shared.releaseRecoveryOnlyScopeDigest(input);
    const audit = { current: true, roleIssues: [], materialVersion: H('a'), approvalCommit: input.commit,
        execution: { id: input.releaseExecutionId, taskId: recoveryOnly.scopeAudit.taskId, applicationId: input.applicationId, agentHostId: input.hostId, status: 'completed', contextInvalidatedAt: null, completedAt: '2026-10-04T12:06:04.000Z', changedFiles: [],
            verification: { managedAdmission: { qualification: 'signed_native_v1', evidenceDigest: H('1'), jobSourceDigest: H('2') }, ownedTreeReceipt: { cleanup: true, activeProcesses: 0, attempt: input.releaseExecutionId },
                readOnlyAudit: { schemaVersion: 'roost-readonly-audit-v1', verdict: 'verified', evidenceDigest: H('3'), preTree: H('4'), postTree: H('4'), processState: 'unchanged', dockerState: 'unchanged', gitState: 'unchanged', nativeTools: [] } } },
        contract: { assignment: { agentId: input.releaserAgentId }, nativeBoundary: { profile: 'inspect-readonly' }, modelSelection: { schemaVersion: 'roost-managed-hermes-backend-v1', backend: 'codex_responses' } },
        decision: { id: recoveryOnly.scopeAudit.reviewId, decision: 'approve', materialVersion: H('a'), verifierId: randomUUID(), createdAt: '2026-10-04T12:06:05.000Z', evidence: { reviewedCommit: input.commit, evidence: [
                    { kind: 'artifact', verdict: 'pass', reference: 'roost-release-recovery-scope:' + recoveryOnly.scopeAudit.scopeDigest }, { kind: 'test', verdict: 'pass', reference: 'fixed source proof' }
                ] } } };
    const sourceView = { execution: { id: randomUUID() }, contract: { assignment: { agentId: randomUUID() } } };
    const release = { id: randomUUID(), snapshot: input, manifest_digest: input.manifestDigest };
    return { ...f, state, closure, input, m, target, audit, sourceView, release };
}

function setup({post=false,owned=false}={}){
 fixturePost=post;fixtureOwned=owned;let f;try{f=recoveryOnlyFixture();}finally{fixturePost=false;fixtureOwned=false;}
 const s=f.input,m=f.m,calls=[];
 s.expiresAt=new Date(Date.now()+60000).toISOString();

 s.manifestDigest=shared.releaseDigest(m);s.recoveryOnly.scopeAudit.scopeDigest=shared.releaseRecoveryOnlyScopeDigest(s);
 const camel=x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));
 const previous={...f.state,release:{...f.state.release},status:'failed',failedClosures:[camel(f.closure)]};
 const state={release:{id:f.release.id,snapshot:s,manifestDigest:s.manifestDigest},journal:[],status:'active',expectedVersion:H('9')};
 const cfg=()=>({deployedCommit:m.rollback.commit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest});
 const evidence=()=>{
  const e=composeFixture().evidence(true),row=e.composeTargets[0],at=new Date().toISOString();
  row.configuration=clone(f.target.rollbackConfiguration);
  const extra=f.target.rollbackConfiguration.services.find(d=>d.name==='proactive'),service={name:extra.name,role:extra.role,containerId:H('5'),imageDigest:image('4'),mountDigest:extra.mountDigest,
   state:'paused',health:null,exitCode:0,createdAt:row.runtime.services[0].createdAt,commit:s.baseCommit,tree:s.baseTree,deploymentId:row.runtime.deploymentId};
  row.runtime.services.push(service);row.binding.images.push(Object.fromEntries(['name','imageDigest','commit','tree','deploymentId'].map(k=>[k,service[k]])));
  e.artifactSetDigest=m.rollback.artifactSetDigest;e.configDigest=m.rollback.configDigest;e.observationSeconds=m.observation.seconds;e.observedAt=at;
  e.deployedSetDigest=shared.releaseDigest([{targetId:f.target.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(row.runtime.services)}]);return e;
 };
 const freshEntry=()=>{const e=clone(s.recoveryOnly.currentEvidence);e.observedAt=new Date().toISOString();return e;};
 const phase=()=>{
  const p=m.postObservation,prior=state.journal.find(j=>j.operation==='observe').outcome.evidence,at=new Date().toISOString();
  return {status:'succeeded',evidence:{postObservation:{postObservationDigest:shared.releaseDigest(p),fixtureDigest:shared.releaseDigest(p.fixture),controllerDigest:p.controllerDigest,
   targetId:f.target.targetId,commit:s.baseCommit,tree:s.baseTree,kind:'runtime_resume',backendCommit:s.baseCommit,frontendCommit:s.baseCommit,schemaDigest:m.baseline.schemaDigest,healthy:true,fixtureAbsent:true,nativeChildrenClosed:true,
   databaseSettingsDigest:p.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:p.runtimeResume.ingressSettingsDigest,observationSeconds:p.runtimeResume.observationSeconds,
   services:prior.composeTargets[0].runtime.services.map(r=>r.role==='cadence'?{...r,state:'running'}:r),cadences:clone(p.runtimeResume.cadences),
   cadenceEvidence:p.runtimeResume.cadences.map(c=>({name:c.name,behaviorDigest:c.behaviorDigest,completedTicks:1,executionState:'executed',behaviorVerified:true,summaryDigest:H('6'),observedAt:at}))}}};
 };
 const args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},assertWriter:async()=>calls.push('writer'),
  inspectCheckout:async()=>{calls.push('checkout');return{commit:s.commit,tree:s.candidateTree};},
  github:{inspect:async()=>{calls.push('git_read');return{remoteBase:s.commit,remoteTree:s.candidateTree};},
   push:async()=>assert.fail('Git effect'),createPullRequest:async()=>assert.fail('Git effect'),merge:async()=>assert.fail('Git effect'),archive:async()=>assert.fail('archive')},
  coolify:{inspect:async()=>assert.fail('healthy baseline inspection'),inspectRecoveryEntry:async({previousState})=>{assert.equal(previousState,previous);calls.push('failed_entry_read');return{currentEvidence:freshEntry(),closureReceipt:clone(previous.failedClosures[0].snapshot)};},
   configureCandidate:async()=>assert.fail('candidate configuration'),deploy:async()=>assert.fail('candidate deploy'),
   configureRollback:async()=>{calls.push('rollback_config');return cfg();},rollback:async()=>{calls.push('rollback');return{state:'finished',deploymentIds:evidence().deploymentIds};},
   waitForDeployment:async()=>({state:'finished',deploymentIds:evidence().deploymentIds}),health:async()=>evidence(),observe:async(_m,_s,o)=>{assert.equal(o.rollback,true);calls.push('observe_rollback');return evidence();},
   reconcileConfiguration:async()=>{calls.push('reconcile_configuration');return{state:'applied',...cfg()};}},
  resources:{inspectCapacity:async()=>calls.push('capacity'),postObservation:async(_m,_s,o)=>{assert.equal(o.operation,'runtime_resume');calls.push('runtime_resume');return phase();},
   verifyRetention:async()=>({applicationActive:true,targetId:f.target.targetId,protectedResourcesDigest:shared.releaseDigest(m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:m.cleanup.ownedResourceIds}),
   ownedResource:async(_m,_s,id)=>({resourceId:id,id:'owned-container',kind:'container',temporary:true}),removeResource:async(_m,_s,id)=>{calls.push('cleanup_resource');return{resourceIds:[id],absenceVerified:true};}},
  api:async(route,{method,body})=>{
   if(method==='GET'){calls.push('old_state_get');assert.equal(route,`/v1/agent-runtime/releases/${s.recoveryOnly.releaseId}`);return previous;}
   calls.push('api_post');
   if(route.endsWith('/operations')){const operation={id:randomUUID(),operation:body.operation,intent:body,createdAt:new Date().toISOString(),outcome:null};state.journal.push(operation);return{...state,operation,replayed:false};}
   const row=state.journal.find(j=>route.includes(j.id));row.outcome=body;if(row.operation==='cleanup'&&body.status==='succeeded')state.status='completed';return state;
  }};
 return{...f,s,m,state,previous,args,calls,evidence,freshEntry};
}
test('recovery-only uses dedicated failed-entry reader then exact rollback/config/observe and retained cleanup',async()=>{
 const f=setup();assert(shared.createReleaseSchema.safeParse(f.s).success);assert.equal(nextReleaseOperation(f.state),'rollback_config');
 for(let i=0;i<4;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.map(j=>j.operation),['rollback_config','rollback','observe','cleanup']);
 assert.equal(f.state.journal[2].intent.parameters.mode,'rollback');assert.equal(nextReleaseOperation(f.state),null);
 assert.equal(f.calls.filter(v=>v==='failed_entry_read').length,1);assert(f.calls.indexOf('failed_entry_read')<f.calls.indexOf('api_post'));
 assert.equal(f.m.baseline.observedAt,f.previous.release.snapshot.manifest.baseline.observedAt);assert.equal(f.s.recoveryOnly.currentEvidence.healthy,false);
});
test('rollback observation retains mandatory cadence resume and scoped temporary cleanup',async()=>{
 const f=setup({post:true,owned:true});for(let i=0;i<6;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.map(j=>j.operation),['rollback_config','rollback','observe','runtime_resume','cleanup_resource','cleanup']);
 assert.equal(nextReleaseOperation(f.state),null);assert.equal(f.calls.filter(v=>v==='runtime_resume').length,1);
 assert.equal(f.calls.filter(v=>v==='cleanup_resource').length,1);assert(!f.state.journal.some(j=>j.operation==='smoke'||j.operation==='fixture_cleanup'));
});
test('uncertain recovery configuration reconciles only its existing operation, then resumes rollback',async()=>{
 const f=setup();f.args.coolify.configureRollback=async()=>{f.calls.push('rollback_config');throw Error('lost secret-bearing reply');};
 const result=await runReleaseStep(f.args);assert(result.reconciliationRequired);assert.equal(nextReleaseOperation(f.state),'reconcile');
 await runReleaseStep(f.args);assert.equal(f.calls.filter(v=>v==='rollback_config').length,1);assert.equal(f.state.journal.length,1);
 assert.equal(f.calls.filter(v=>v==='reconcile_configuration').length,1);assert.equal(nextReleaseOperation(f.state),'rollback');
});
test('reconciliation-only never creates first recovery intent',async()=>{const f=setup();await runReleaseStep({...f.args,reconciliationOnly:true});assert.equal(f.calls.length,0);});
for(const op of ['push','pr','review','merge','deploy_config','deploy','smoke','archive_repository','cleanup_local'])test('recovery journal refuses forward operation '+op,async()=>{
 const f=setup();f.state.journal=[{operation:op,intent:{parameters:{}},outcome:{status:'uncertain'}}];await assert.rejects(runReleaseStep(f.args),/release_recovery_only_forward_forbidden/);assert.equal(f.calls.length,0);
});
for(const op of ['rollback','observe','runtime_resume','cleanup_resource','cleanup'])test('recovery refuses skipped first stage '+op,()=>{
 const f=setup();f.state.journal=[{operation:op,intent:{parameters:op==='observe'?{mode:'rollback'}:{}},outcome:{status:'succeeded'}}];
 assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_sequence_invalid/);
});
test('candidate observation is refused even in unresolved journal',()=>{const f=setup();f.state.journal=[{operation:'observe',intent:{parameters:{mode:'candidate'}},outcome:null}];assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_forward_forbidden/);});
test('failed or absent recovery config stops diagnosis instead of replaying it',async()=>{for(const status of ['failed','absent']){const f=setup();await runReleaseStep(f.args);f.state.journal[0].outcome.status=status;assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_diagnosis_required/);assert.equal(f.calls.filter(v=>v==='rollback_config').length,1);}});
test('second rollback or configuration is refused even after a successful first operation',async()=>{for(const operation of ['rollback_config','rollback']){const f=setup();await runReleaseStep(f.args);if(operation==='rollback')await runReleaseStep(f.args);f.state.journal.push(clone(f.state.journal.find(j=>j.operation===operation)));assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_retry_exhausted/);}});
const entryMutations={wrongOldId:f=>f.previous.release.id=randomUUID(),wrongVersion:f=>f.previous.expectedVersion=H('f'),missingClosure:f=>f.previous.failedClosures=[],wrongClosure:f=>f.previous.failedClosures[0].closureDigest=H('f'),notRevoked:f=>f.previous.revocations=[],wrongFailedOutcome:f=>f.previous.journal.at(-1).outcome.id=randomUUID(),wrongOldSource:f=>f.previous.release.snapshot.commit='f'.repeat(40),notFailed:f=>f.previous.status='active'};
for(const [name,change]of Object.entries(entryMutations))test('failed-entry read refuses '+name,async()=>{const f=setup();change(f);await assert.rejects(runReleaseStep(f.args),/release_recovery_only_entry_unproven/);assert(!f.calls.includes('api_post'));});
const freshMutations={stale:e=>e.observedAt=new Date(Date.now()-300001).toISOString(),future:e=>e.observedAt=new Date(Date.now()+61000).toISOString(),data:e=>e.dataDigest=H('f'),container:e=>e.composeRecovery.services[0].containerId=H('f'),image:e=>e.composeRecovery.partialRollbackFailure.images[0].imageDigest=image('0'),healthy:e=>e.healthy=true};
for(const [name,change]of Object.entries(freshMutations))test('fresh failed-entry evidence refuses '+name,async()=>{const f=setup();f.args.coolify.inspectRecoveryEntry=async()=>{const e=f.freshEntry();change(e);return{currentEvidence:e,closureReceipt:clone(f.previous.failedClosures[0].snapshot)};};await assert.rejects(runReleaseStep(f.args),/release_recovery_only_entry_unproven/);assert(!f.calls.includes('api_post'));});
test('missing dedicated reader cannot fall back to healthy baseline inspection',async()=>{const f=setup();delete f.args.coolify.inspectRecoveryEntry;await assert.rejects(runReleaseStep(f.args),/release_recovery_only_entry_gateway_required/);assert(!f.calls.includes('api_post'));});
test('remote current source drift refuses recovery before any intent',async()=>{const f=setup();f.args.github.inspect=async()=>({remoteBase:f.s.baseCommit,remoteTree:f.s.baseTree});await assert.rejects(runReleaseStep(f.args),/release_base_changed/);assert(!f.calls.includes('api_post'));});
test('recovery mode rejects inherited publication keys rather than selecting normal planner',()=>{const f=setup();f.s.publishedGitBasis={};assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_scope_invalid/);});
test('unchanged ordinary Compose begins at Git push',()=>{const f=composeFixture(),state={release:{id:randomUUID(),snapshot:f.s},journal:[],status:'active'};assert.equal(nextReleaseOperation(state),'push');});
test('persisted recovery configuration proof must identify the exact repaired rollback tuple',async()=>{const f=setup();await runReleaseStep(f.args);f.state.journal[0].outcome.evidence.configDigest=H('f');assert.throws(()=>nextReleaseOperation(f.state),/release_compose_configuration_identity_invalid/);});
for(const [name,change]of Object.entries({unhealthy:e=>e.healthy=false,image:e=>e.composeTargets[0].runtime.services[0].imageDigest=image('0'),config:e=>e.composeTargets[0].configuration.settingsDigest=H('f'),data:e=>e.dataDigest=H('f'),queue:e=>e.composeTargets[0].binding.queue.status='failed'}))test('persisted rollback proof refuses '+name,async()=>{const f=setup();await runReleaseStep(f.args);await runReleaseStep(f.args);change(f.state.journal[1].outcome.evidence);assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_runtime_unproven/);});
for(const [name,change]of Object.entries({short:e=>e.observationSeconds=0,wrongqueue:e=>e.deploymentIds[0].deploymentId='other'}))test('persisted observation refuses '+name,async()=>{const f=setup();for(let i=0;i<3;i++)await runReleaseStep(f.args);change(f.state.journal[2].outcome.evidence);assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_only_(runtime|observation)_unproven/);});
