import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationReviewCurrent, applicationReleaseCertified, loadApplicationOperation } from '../modules/product-engineering/application-operation.service';
import { releaseDigest, releaseIntentError, releaseOutcomeError, releaseGitSetArtifactDigest, releaseManifestSchema } from '../modules/agent-runtime/governed-release-contract';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const commit = 'a'.repeat(40), tree = 'b'.repeat(40), base = 'c'.repeat(40), baseTree = 'd'.repeat(40), hash = 'e'.repeat(64);
const at = '2026-10-04T00:00:00.000Z';

function reviewedResult() {
  const contract = { assignment: { agentId: id(3) }, singleTask: { branch: `codex/task-${id(2)}` } };
  const pin = { status: 'ready', pinId: id(6), revision: hash, contract };
  const execution: any = { id: id(4), status: 'completed', completedAt: new Date(at), contextInvalidatedAt: null,
    attempt: 1, agentHostId: id(7), checkpointVersion: 2, metadata: { readyContextPin: { pinId: pin.pinId, revision: pin.revision },
      resultRevisionReviewVersion: '1' } };
  const resultRevision = { schemaVersion: 'roost-result-revision-v1', id: id(8), commit, workingTree: 'clean',
    branch: contract.singleTask.branch, executionId: execution.id, attempt: execution.attempt, hostId: execution.agentHostId,
    checkpointVersion: execution.checkpointVersion, observedAt: at };
  const material = { version: hash, body: { contract, pin: structuredClone(execution.metadata.readyContextPin), resultRevision } };
  const review: any = { id: id(5), executionId: execution.id, materialVersion: hash, decision: 'approve', evidence: { reviewedCommit: commit } };
  const task: any = { executionReadiness: structuredClone(pin), assignedWorkforceEntityId: id(3) };
  return { task, execution, review, material };
}
const noReads = { $queryRaw: async () => { throw Error('No revalidation read for the original exact pin'); } } as any;
test('current review uses the exact native completed pin, revision and assigned executor', async () => {
  const f = reviewedResult(); assert.equal(await applicationReviewCurrent(noReads, id(1), f.task, f.execution, f.review, f.material), true);
  for (const mutate of [
    (x: any) => { x.task.executionReadiness.revision = 'f'.repeat(64); },
    (x: any) => { x.task.assignedWorkforceEntityId = id(99); },
    (x: any) => { x.execution.completedAt = null; },
    (x: any) => { x.review.executionId = id(99); },
    (x: any) => { x.review.materialVersion = 'f'.repeat(64); },
    (x: any) => { x.review.evidence.reviewedCommit = base; },
    (x: any) => { x.execution.contextInvalidatedAt = new Date(at); }
  ]) { const altered = structuredClone(f); mutate(altered); assert.equal(await applicationReviewCurrent(noReads, id(1), altered.task, altered.execution, altered.review, altered.material), false); }
});
test('changed Ready requires the runtime effective basis; a rejection disposition never launders an approval', async () => {
  const f = reviewedResult(); f.task.executionReadiness.pinId = id(9); f.task.executionReadiness.revision = 'f'.repeat(64);
  const before = structuredClone(f), reads: string[] = [];
  const db: any = { $queryRaw: async (sql: TemplateStringsArray) => { reads.push(sql.join('?')); return [{ current: false, pin: f.task.executionReadiness }]; } };
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, f.material), false);
  assert.equal(reads.length, 1); assert.match(reads[0], /completed_result_basis_current/); assert.deepEqual(f, before);
  db.$queryRaw = async (sql: TemplateStringsArray) => { reads.push(sql.join('?')); return [{ current: sql.join('?').includes('completed_result_basis_current'), pin: f.task.executionReadiness }]; };
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, f.material), true);
  // A real mapping changes review material and demands its own independent decision.
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, { ...f.material, version: '1'.repeat(64) }), false);
  db.$queryRaw = async (sql: TemplateStringsArray) => [{ current: sql.join('?').includes('rejection_disposition_current'), pin: f.task.executionReadiness }];
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, f.material), false);
  f.review.decision = 'reject';
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, f.material), true);
  f.review.action = { id: id(10) };
  assert.equal(await applicationReviewCurrent(db, id(1), f.task, f.execution, f.review, f.material), false);
});

function releaseLedger(finish = true) {
  const old = { commit: base, imageDigest: `sha256:${'1'.repeat(64)}`, configDigest: hash, schemaDigest: hash };
  const manifest = { schemaVersion: 'roost-release-manifest-v1',
    repository: { url: 'https://github.com/example/fixture', defaultBranch: 'main', canonicalDir: 'C:\\Certification\\fixture', candidateBranch: 'codex/release' },
    deployment: { provider: 'coolify', targetId: 'fixture-target', controllerUrl: 'https://controller.example.test', url: 'https://fixture.example.test',
      imageDigest: `sha256:${'2'.repeat(64)}`, configDigest: hash, schemaDigest: hash },
    services: [{ name: 'api', healthUrl: 'https://fixture.example.test/health', expectedStatus: 200 }],
    baseline: { ...old, healthDigest: hash, dataDigest: hash, observedAt: at }, observation: { seconds: 30, intervalSeconds: 5, maxFailures: 0 },
    backup: { digest: hash, bytes: 1, capturedAt: at, restoreVerifiedAt: at, restoreDigest: hash }, rollback: { ...old, compatibleSchemaDigests: [hash] },
    cleanup: { repositoryUrl: 'https://github.com/example/fixture', canonicalDir: 'C:\\Certification\\fixture', coolifyTargetId: 'fixture-target', ownedResourceIds: ['fixture-target'], archiveRepository: true } };
  const release = { snapshot: { commit, candidateTree: tree, baseCommit: base, baseTree, manifest }, manifest_digest: releaseDigest(manifest) };
  const journal: any[] = [];
  const remote = { observedAt: at, remoteCommit: commit, remoteTree: tree };
  const artifact = { commit, imageDigest: manifest.deployment.imageDigest, configDigest: hash, schemaDigest: hash };
  const deployed = { observedAt: at, deploymentId: 'fixture-deployment', deployedCommit: commit, deployedTree: tree,
    imageDigest: artifact.imageDigest, configDigest: hash, schemaDigest: hash, healthy: true, healthDigest: hash, dataDigest: hash };
  const add = (operation: string, parameters: any, evidence: any, status = 'succeeded') => {
    const merged = journal.some(j => j.operation === 'merge');
    const intent = { requestId: id(20 + journal.length), operation, manifestDigest: release.manifest_digest, commit, baseCommit: base,
      expectedVersion: hash, observed: { commit, baseCommit: merged ? commit : base, baseTree: merged ? tree : baseTree, manifestDigest: release.manifest_digest }, parameters };
    const outcome = { status, request_id: id(40 + journal.length), observation_only: true, evidence, created_at: at };
    assert.equal(releaseIntentError(release, intent, journal), null);
    assert.equal(releaseOutcomeError(release, { operation, intent }, { status: outcome.status, observationOnly: true, evidence }, journal), null);
    journal.push({ id: id(60 + journal.length), sequence: journal.length + 1, operation, intent, outcome });
  };
  add('push', { branch: 'codex/release' }, remote);
  add('pr', {}, { ...remote, pullRequestNumber: 1, prHeadCommit: commit });
  add('review', { pullRequestNumber: 1 }, { ...remote, pullRequestNumber: 1, prHeadCommit: commit, reviewApproved: true });
  add('merge', { pullRequestNumber: 1 }, { ...remote, pullRequestNumber: 1, prHeadCommit: commit, prMerged: true, mergedCommit: commit });
  add('deploy_config', artifact, { observedAt: at, deployedCommit: commit, imageDigest: artifact.imageDigest, configDigest: hash, schemaDigest: hash });
  add('deploy', artifact, deployed);
  add('observe', { mode: 'candidate' }, { ...deployed, observationSeconds: 30 });
  if (!finish) return { release, journal, add, deployed };
  add('cleanup_resource', { resourceId: 'fixture-target' }, { observedAt: at, absenceVerified: true, resourceIds: ['fixture-target'] });
  add('archive_repository', {}, { observedAt: at, repositoryArchived: true });
  add('cleanup_local', {}, { observedAt: at, localAbsent: true });
  add('cleanup', { resourceIds: ['fixture-target'] }, { observedAt: at, repositoryArchived: true, localAbsent: true, absenceVerified: true, resourceIds: ['fixture-target'] });
  return { release, journal, add, deployed };
}
test('only the complete typed candidate release journal certifies; actual successful reconciliation is supported', () => {
  const { release, journal } = releaseLedger();
  assert.equal(applicationReleaseCertified(release, journal, false, false), true);
  const reconciled = structuredClone(journal); reconciled[6].outcome.status = 'reconciled'; reconciled[6].outcome.reconciled_status = 'succeeded';
  assert.equal(applicationReleaseCertified(release, reconciled, false, false), true);
  assert.equal(applicationReleaseCertified(release, journal, true, false), false);
  assert.equal(applicationReleaseCertified(release, journal, false, true), false);
});
test('rollback after earlier candidate observation, uncertain or malformed identity never certifies', () => {
  const { release, journal } = releaseLedger();
  for (const change of [
    (j: any[]) => { j.splice(7, 0, { operation: 'rollback_config', outcome: { status: 'succeeded' } }); },
    (j: any[]) => { j[5].outcome.status = 'uncertain'; },
    (j: any[]) => { j[6].outcome = null; },
    (j: any[]) => { j[6].outcome.evidence.configDigest = 'f'.repeat(64); },
    (j: any[]) => { j[6].outcome.evidence.observationSeconds = 29; },
    (j: any[]) => { j[6].outcome.evidence.deployedCommit = base; },
    (j: any[]) => { j[6].outcome.evidence.verdict = 'certified'; },
    (j: any[]) => { j[3].outcome.evidence.mergedCommit = base; },
    (j: any[]) => { j.splice(0, 1); },
    (j: any[]) => { j.reverse(); },
    (j: any[]) => { j[10].outcome.evidence.absenceVerified = false; }
  ]) { const modified = structuredClone(journal); change(modified); assert.equal(applicationReleaseCertified(release, modified, false, false), false); }
  assert.equal(applicationReleaseCertified(release, journal.slice(0, -1), false, false), false);
  assert.equal(applicationReleaseCertified(release, Array.from({ length: 201 }, () => journal[0]), false, false), false);
});
test('a fully native-valid later failure, recovered rollback and cleanup preserve failure of candidate release', () => {
  const { release, journal, add, deployed } = releaseLedger(false), m = release.snapshot.manifest;
  add('observe', { mode: 'candidate' }, { ...deployed, healthy: false, observationSeconds: 30 }, 'failed');
  const artifact = { commit: base, imageDigest: m.rollback.imageDigest, configDigest: hash, schemaDigest: hash };
  const recovered = { ...deployed, deployedCommit: base, deployedTree: baseTree, imageDigest: m.rollback.imageDigest };
  add('rollback_config', artifact, { observedAt: at, deployedCommit: base, imageDigest: artifact.imageDigest, configDigest: hash, schemaDigest: hash });
  add('rollback', artifact, recovered);
  add('observe', { mode: 'rollback' }, { ...recovered, observationSeconds: 30 });
  add('cleanup_resource', { resourceId: 'fixture-target' }, { observedAt: at, absenceVerified: true, resourceIds: ['fixture-target'] });
  add('archive_repository', {}, { observedAt: at, repositoryArchived: true });
  add('cleanup_local', {}, { observedAt: at, localAbsent: true });
  add('cleanup', { resourceIds: ['fixture-target'] }, { observedAt: at, repositoryArchived: true, localAbsent: true, absenceVerified: true, resourceIds: ['fixture-target'] });
  assert.equal(applicationReleaseCertified(release, journal, false, false), false);
});
test('actual retained Git-set release proves every deployed target, queues, observation and retention', () => {
  const { release, journal, add } = releaseLedger(false), m: any = release.snapshot.manifest;
  const targets = ['fixture-target', 'web'].map(targetId => ({ targetId, name: targetId, dockerfile: `/apps/${targetId}/Dockerfile`,
    configDigest: hash, baseline: { commit: base, tree: baseTree, imageDigest: `sha256:${'1'.repeat(64)}`, configDigest: hash } }));
  const aggregate = releaseDigest(targets.map(t => ({ targetId: t.targetId, configDigest: t.configDigest })));
  m.schemaVersion = 'roost-release-manifest-v2'; m.purpose = 'application_release';
  delete m.deployment.imageDigest; delete m.baseline.imageDigest; delete m.rollback.imageDigest;
  Object.assign(m.deployment, { provider: 'coolify_git_set', publicOrigins: ['https://fixture.example.test'], targets, configDigest: aggregate });
  m.baseline.configDigest = m.rollback.configDigest = aggregate;
  m.deployment.artifactSetDigest = releaseGitSetArtifactDigest(m, release.snapshot);
  m.baseline.artifactSetDigest = m.rollback.artifactSetDigest = releaseGitSetArtifactDigest(m, release.snapshot, true);
  Object.assign(m.cleanup, { archiveRepository: false, ownedResourceIds: [], protectedResourceIds: targets.map(t => t.targetId) });
  release.manifest_digest = releaseDigest(m); assert.equal(releaseManifestSchema.safeParse(m).success, true);
  journal.splice(4); for (const op of journal) { op.intent.manifestDigest = release.manifest_digest; op.intent.observed.manifestDigest = release.manifest_digest; }
  const artifact = { commit, artifactSetDigest: m.deployment.artifactSetDigest, configDigest: aggregate, schemaDigest: hash };
  add('deploy_config', artifact, { observedAt: at, deployedCommit: commit, artifactSetDigest: artifact.artifactSetDigest,
    configDigest: aggregate, schemaDigest: hash });
  const evidence = (targetId?: string) => {
    const rows = targets.filter(t => !targetId || t.targetId === targetId).map(t => ({ targetId: t.targetId, commit, tree,
      imageDigest: `sha256:${'9'.repeat(64)}`, configDigest: hash, schemaDigest: hash, healthy: true, deploymentId: `deployment-${t.targetId}` }));
    return { observedAt: at, deployedCommit: commit, deployedTree: tree, artifactSetDigest: m.deployment.artifactSetDigest,
      deployedTargets: rows, deploymentIds: rows.map(r => ({ targetId: r.targetId, deploymentId: r.deploymentId })),
      deployedSetDigest: releaseDigest(rows.map(({ healthy, deploymentId, ...row }) => row)), configDigest: aggregate, schemaDigest: hash,
      healthDigest: hash, dataDigest: hash, healthy: true, observationSeconds: 30 };
  };
  for (const target of targets) add('deploy', { ...artifact, targetId: target.targetId }, evidence(target.targetId));
  add('observe', { mode: 'candidate' }, evidence());
  add('cleanup', { resourceIds: [] }, { observedAt: at, retentionVerified: true, repositoryArchived: false, localAbsent: false,
    repositoryUrl: m.repository.url, canonicalDir: m.repository.canonicalDir, targetId: m.deployment.targetId, applicationActive: true,
    localCommit: commit, localTree: tree, remoteCommit: commit, remoteTree: tree, protectedResourcesDigest: releaseDigest(m.cleanup.protectedResourceIds),
    absenceVerified: true, resourceIds: [] });
  assert.equal(applicationReleaseCertified(release, journal, false, false), true);
  for (const mutate of [
    (j: any[]) => { j[7].outcome.evidence.deploymentIds.pop(); },
    (j: any[]) => { j[7].outcome.evidence.deployedTargets[1].imageDigest = `sha256:${'1'.repeat(64)}`; },
    (j: any[]) => { j[8].outcome.evidence.retentionVerified = false; }
  ]) { const changed = structuredClone(journal); mutate(changed); assert.equal(applicationReleaseCertified(release, changed, false, false), false); }
});

function readyProjectionDb(managerPresent: boolean, count = 1) {
  const manager = { id: id(3), role: 'accountable_manager', name: 'Ready accountable manager' };
  const calls: any[] = [], taskReads: any[] = [];
  const tasks = Array.from({ length: count }, (_, n) => ({ id: id(100 + n), title: 'Approved bounded audit', status: 'todo',
    assignedWorkforceEntityId: id(4), assignedWorkforceEntity: { id: id(4), role: 'executor', name: 'Executor' },
    executionReadiness: { status: 'ready', contract: { taskRoles: { accountableManager: { id: manager.id, revision: at } } } }, agentExecutions: [] }));
  const forbidden = () => { throw Error('Projection must only read'); };
  const db: any = { taskRiskScope: { findMany: async () => tasks.map(t => ({ taskId: t.id })) },
    task: { findMany: async (input: any) => { taskReads.push(input); return tasks; }, update: forbidden },
    workspace: { findUnique: async () => ({ ownerUserId: id(2) }) }, workforceEntity: { findMany: async (input: any) => { calls.push(input); return managerPresent ? [manager] : []; } },
    $queryRaw: async (sql: TemplateStringsArray) => { const text = sql.join('?'); assert.ok(text.includes('d.workspace_id=') || text.includes('r.workspace_id=')); return []; }, $executeRaw: forbidden };
  return { db, manager, calls, taskReads };
}
test('Ready accountable manager is shown before the first native execution and managers are read once as a batch', async () => {
  const { db, manager, calls, taskReads } = readyProjectionDb(true, 3);
  const value = await loadApplicationOperation(db, id(1), id(9));
  assert.equal(value.accountable?.id, manager.id); assert.equal(value.accountable?.label, manager.name);
  assert.equal(value.gateState, 'unmet'); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].where, { id: { in: [manager.id] }, workspaceId: id(1) });
  assert.deepEqual(taskReads[0].include.agentExecutions.include.reviewDecisions.include, { action: true });
});
test('missing declared manager remains unknown rather than relabelling the executor accountable', async () => {
  const { db } = readyProjectionDb(false);
  assert.equal((await loadApplicationOperation(db, id(1), id(9))).accountable, null);
});
