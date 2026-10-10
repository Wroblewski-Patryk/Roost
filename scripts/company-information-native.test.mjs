import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID, generateKeyPairSync, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { companyInformationFixture } from './fixtures/company-information.mjs';

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1'); assert.match(url.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.COMPANYCORE_SKIP_DOTENV, '1');
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { prisma } = require('../dist/db/prisma.js');

test('native G6a: HTTP Ready -> real queue -> native Worker validation with SQL authority fences',
  { timeout: process.env.ROOST_G6_NATIVE_RUNTIME === '1' ? 540000 : 150000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, token, body) {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token && typeof token === 'object' ? token : token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  const ref = row => ({ id: row.id, revision: row.updatedAt.toISOString() });
  let token, workspaceId, contract, task, source, execution;
  try {
    await t.test('existing Task needs neither project, Application nor repository; explicit current company source and roles', async () => {
      const owner = await request('/auth/register', null, { email: 'owner@g6a.example.test', password: 'synthetic-test-password-only', name: 'Synthetic owner', workspaceName: 'Synthetic G6a' });
      assert.equal(owner.status, 201); token = owner.body.data.token; workspaceId = owner.body.data.workspace.id;
      const goal = await prisma.goal.create({ data: { workspaceId, title: 'Synthetic company status' } });
      const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Synthetic information agent', slug: 'g6a-agent', type: 'agent', role: 'engineer', skillIndex: ['javascript'], toolIndex: [], authorityScope: [] } });
      const manager = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Synthetic manager', slug: 'g6a-manager', type: 'agent', role: 'manager', authorityScope: ['task_accountability'] } });
      const verifier = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Synthetic verifier', slug: 'g6a-verifier', type: 'agent', role: 'reviewer', skillIndex: ['javascript'], authorityScope: ['task_verification'] } });
      const releaser = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Synthetic release role', slug: 'g6a-release-role', type: 'agent', role: 'release manager', authorityScope: ['release_authorization'] } });
      task = await prisma.task.create({ data: { workspaceId, title: 'Summarize explicitly selected synthetic company status', goalId: goal.id, assignedWorkforceEntityId: agent.id } });
      source = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'g6a-selected', title: 'Selected company status', description: 'Synthetic project is in preparation; next action is owner review.' } });
      await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'g6a-unselected', title: 'Unselected record', description: 'Must not be transported.' } });
      const redacted = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'technical_incident', key: 'g6a-redacted-audit', title: 'Agent runtime content removed', description: 'Synthetic audit tombstone.' } });
      // Model a pre-existing audit tombstone in the disposable database. The
      // normal application writer intentionally refuses to create one directly.
      await prisma.$executeRaw`UPDATE company_records SET source='runtime_redaction_v1' WHERE id=${redacted.id}::uuid`;
      contract = companyInformationFixture().packet.contract;
      contract.objective.goalId = goal.id; contract.assignment.agentId = agent.id;
      contract.singleTask.contractId = `roost-task:${task.id}`; contract.singleTask.accountableManager = ref(manager);
      contract.context.company = [ref(source)];
      const editor = await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&executionClass=roost-company-information-v1`, token);
      assert.equal(editor.status, 200); assert.equal(editor.body.data.editor.applicationId, null); assert.equal(editor.body.data.preparationEnabled, true);
      assert.ok(editor.body.data.editor.sources.some(item => item.id === source.id));
      assert.ok(!editor.body.data.editor.sources.some(item => item.id === redacted.id));
      contract.taskRoles = { schemaVersion: 'roost-task-roles-v1', requester: { id: editor.body.data.editor.requester.id, revision: editor.body.data.editor.requester.revision }, accountableManager: ref(manager), executor: ref(agent), verifier: ref(verifier), releaser: ref(releaser) };
      assert.equal(task.projectId, null); assert.equal(await prisma.application.count({ where: { workspaceId } }), 0);
    });
    const readinessRoute = () => `/v1/agent-runtime/tasks/${task.id}/execution-readiness`;
    const submit = async (value = contract, id = randomUUID()) => {
      const version = await request(`${readinessRoute()}?version=1&executionClass=roost-company-information-v1`, token);
      assert.equal(version.status, 200);
      const input = { requestId: id, expectedVersion: version.body.data.submissionVersion, applicationId: null, executionClass: 'roost-company-information-v1', contract: value };
      return { response: await request(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`, token, input), input };
    };
    await t.test('missing source, repo authority and stale source are refused through actual API', async () => {
      for (const mutate of [c => c.context.company = [], c => c.access.tools = ['repository_read'], c => c.context.company[0].revision = 'stale']) {
        const bad = structuredClone(contract); mutate(bad); const { response } = await submit(bad); assert.equal(response.status, 409);
      }
    });
    await t.test('normal submission persists immutable Ready and replays without new pin', async () => {
      const { response, input } = await submit(); assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.readiness.preparationOnly, true); assert.equal(response.body.data.readiness.modelExecutionQualified, false);
      const replay = await request(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`, token, input);
      assert.equal(replay.status, 200); assert.equal(replay.body.data.readiness.pinId, response.body.data.readiness.pinId);
      const actual = await request(readinessRoute(), token); assert.equal(actual.body.data.status, 'ready');
    });
    await t.test('rejected correction removes Ready but preserves the prior contract for recovery', async () => {
      const before = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      const bad = structuredClone(contract); bad.context.company = [];
      const { response } = await submit(bad); assert.equal(response.status, 409);
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(after.executionReadiness.status, 'needs_context');
      assert.equal(after.executionReadiness.pinId, before.executionReadiness.pinId);
      assert.deepEqual(after.executionReadiness.contract, before.executionReadiness.contract);
      const corrected = await submit(); assert.equal(corrected.response.status, 200, JSON.stringify(corrected.response.body));
    });
    await t.test('actual console request queues attempt zero with null app and no model privilege', async () => {
      const body = { taskId: task.id, executionClass: 'roost-company-information-v1' }; assert.equal('applicationId' in body, false);
      const queued = await request('/v1/agent-runtime/executions', token, body); assert.equal(queued.status, 201, JSON.stringify(queued.body));
      execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: queued.body.data.id } });
      assert.equal(execution.applicationId, null); assert.equal(execution.baseBranch, null); assert.equal(execution.status, 'queued'); assert.equal(execution.attempt, 0); assert.equal(execution.agentHostId, null); assert.equal(execution.leaseToken, null);
      assert.equal(execution.metadata.readyContextPin.modelExecutionQualified, false);
      assert.equal((await request('/v1/agent-runtime/executions', token, body)).status, 409);
    });
    await t.test('unchanged actual queue row and actual HTTP context validate in a separate native Node process', async () => {
      const context = await request(`/v1/company-intelligence/tasks/${task.id}/agent-context?executionId=${execution.id}`, token);
      assert.equal(context.status, 200, JSON.stringify(context.body));
      const taskContext = context.body.data;
      assert.deepEqual(taskContext.executionPacket.sources.map(s => s.id), [source.id]); assert.equal(taskContext.applications, undefined); assert.equal(taskContext.organizationalContext, undefined);
      const native = spawnSync(process.execPath, ['scripts/validate-roost-company-information-packet.mjs'], { input: JSON.stringify({ claimed: execution, taskContext }), encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(native.status, 0, native.stderr); const proof = JSON.parse(native.stdout);
      assert.equal(proof.executionId, execution.id); assert.equal(proof.selectedSourceCount, 1); assert.equal(proof.preparationOnly, true); assert.equal(proof.modelExecutionQualified, false); assert.deepEqual(proof.tools, []);
      process.stdout.write(`G6a native identities ${JSON.stringify({ workspaceId, taskId: task.id, executionId: execution.id, pinId: execution.metadata.readyContextPin.pinId, packetRevision: proof.packetRevision })}\n`);
    });
    await t.test('native SQL refuses runtime transitions, host/lease, attempt and forged model privilege', async () => {
      const host = await prisma.agentHost.create({ data: { workspaceId, name: 'Synthetic unqualified host', slug: 'g6a-native-host', platform: 'windows' } });
      for (const data of [{ status: 'claimed' }, { status: 'running' }, { status: 'completed' }, { attempt: 1 }, { agentHostId: host.id }, { leaseToken: randomUUID() }, { leaseExpiresAt: new Date() }, { startedAt: new Date() }, { metadata: { ...execution.metadata, readyContextPin: { ...execution.metadata.readyContextPin, modelExecutionQualified: true } } }]) {
        await assert.rejects(() => prisma.agentExecution.update({ where: { id: execution.id }, data }));
      }
      await assert.rejects(() => prisma.agentExecution.create({ data: { workspaceId, taskId: task.id, applicationId: null, requestedByType: 'user', metadata: {} } }));
      const actual = await prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } }); assert.equal(actual.status, 'queued'); assert.equal(actual.attempt, 0);
    });
    await t.test('foreign workspace cannot read or queue task', async () => {
      const foreign = await request('/auth/register', null, { email: 'foreign@g6a.example.test', password: 'synthetic-test-password-only', name: 'Synthetic peer', workspaceName: 'Foreign G6a' });
      const peer = foreign.body.data.token;
      assert.equal((await request(readinessRoute(), peer)).status, 404);
      assert.equal((await request(`/v1/company-intelligence/tasks/${task.id}/agent-context?executionId=${execution.id}`, peer)).status, 404);
      assert.notEqual((await request('/v1/agent-runtime/executions', peer, { taskId: task.id, executionClass: 'roost-company-information-v1' })).status, 201);
    });
    await t.test('real source edit invalidates Ready and refuses further admission', async () => {
      await prisma.companyRecord.update({ where: { id: source.id }, data: { description: 'Actual synthetic source revision changed.' } });
      const ready = await request(readinessRoute(), token); assert.equal(ready.status, 200); assert.notEqual(ready.body.data.status, 'ready');
      const current = await prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } }); assert.equal(current.attempt, 0); assert.equal(current.agentHostId, null);
      assert.notEqual((await request('/v1/agent-runtime/executions', token, { taskId: task.id, executionClass: 'roost-company-information-v1' })).status, 201);
    });
    await t.test('owner can cancel invalidated unclaimed preparation without a native stop or fabricated result', async () => {
      const cancelled = await request(`/v1/agent-runtime/executions/${execution.id}/actions/cancel`, token, {});
      assert.equal(cancelled.status, 200); assert.equal(cancelled.body.data.status, 'cancelled');
      const row = await prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } });
      assert.equal(row.attempt, 0); assert.equal(row.agentHostId, null); assert.equal(row.leaseToken, null); assert.equal(row.finalResponse, null);
      assert.equal(await prisma.application.count({ where: { workspaceId } }), 0);
    });
    await t.test('company risk and admission qualify normal Decision and information Ready', async () => {
      const runtimeTask = await prisma.task.create({ data: { workspaceId, title: 'Summarize current evidenced Roost preparation and next action', goalId: contract.objective.goalId, assignedWorkforceEntityId: contract.assignment.agentId } });
      const currentSource = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'g6-real-status', title: 'Current Roost delivery evidence', description: 'G6a has local PostgreSQL/HTTP preparation proof. A company task can be Ready and queued without an Application or Git. Actual model execution and owner result review are still required for full G6. No application work or VPS deployment is authorized.' } });
      const unrelatedSource = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'g6-unselected-status', title: 'Unselected company source', description: 'This source is outside the exact task context.' } });
      const wrongActor = await prisma.user.create({ data: { email: 'member@g6-risk.example.test', passwordHash: 'synthetic-not-a-login' } });
      await prisma.workspaceMembership.create({ data: { workspaceId, userId: wrongActor.id, role: 'member' } });
      const { createAuthToken } = require('../dist/auth/token.js');
      const memberToken = createAuthToken({ workspaceId, userId: wrongActor.id });
      const foreignOwner = await request('/auth/register', null, { email: 'foreign@g6-risk.example.test', password: 'synthetic-test-password-only', name: 'Foreign owner', workspaceName: 'Foreign risk workspace' });
      assert.equal(foreignOwner.status, 201);
      const foreignToken = foreignOwner.body.data.token;
      const c = structuredClone(contract); c.singleTask.contractId = `roost-task:${runtimeTask.id}`; c.context.company = [ref(currentSource)]; c.decisions = { items: [], noneReason: 'No decision yet selected' };
      c.objective.outcome = 'Summarize the verified preparation capability, remaining proof and one safe next action';
      c.singleTask.problems = [{ statement: 'Owner needs a concise sourced status of the current company capability', componentId: null, outcome: c.objective.outcome, causalLink: null }];
      c.acceptance = { criteria: ['Uses only selected current records and distinguishes preparation from execution'], tests: ['Owner checks factual consistency with the selected record'], evidence: ['A sourced summary and one next action'] }; c.budgets.maxDurationSeconds = 300;
      const selection = { schemaVersion: 'roost-managed-hermes-backend-v1', agent: 'managed_hermes', riskClass: 'low', fallback: 'none', attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: 'stop_attempt', restart: 'never' }, backend: 'codex_responses', provider: 'openai-codex', modelSelection: { model: 'gpt-5.6-sol', reasoningEffort: 'low' }, auth: 'same_owner_subscription' };
      const { trustedPilotBytes } = await import('./lib/agent-host-trusted-pilot.mjs');
      const signer = generateKeyPairSync('ed25519'); const installationId = randomUUID();
      await prisma.trustedProviderTicketKey.create({ data: { workspaceId, installationId, keyId: 'ephemeral-native-test', epoch: 1, publicKeyDigest: createHash('sha256').update(signer.publicKey.export({ format: 'der', type: 'spki' })).digest('hex') } });
      const procedure = await prisma.procedure.create({ data: { workspaceId, name: 'Synthetic company information check', purpose: 'Check selected source before one information task', status: 'active', steps: { create: { stepOrder: 1, instruction: 'Compare the selected source with the exact proposed summary' } } } });
      c.procedures = { items: [{ id: procedure.id, revision: String(procedure.version) }], noneReason: null };
      c.executionClass = 'roost-company-information-runtime-v1'; c.modelSelection = selection;
      const root = `/v1/agent-runtime/tasks/${runtimeTask.id}`;
      assert.equal((await request(`${root}/risk`, foreignToken)).status, 404);
      const risk = await request(`${root}/risk`, token); assert.equal(risk.status, 200, JSON.stringify(risk.body));
      const mixedApplication = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        applicationId: randomUUID(), contract: c, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(mixedApplication.status, 409, JSON.stringify(mixedApplication.body));
      const foreignScope = await request(`${root}/risk/scope`, foreignToken, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(foreignScope.status, 404, JSON.stringify(foreignScope.body));
      const memberScope = await request(`${root}/risk/scope`, memberToken, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(memberScope.status, 403, JSON.stringify(memberScope.body));
      const riskScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: 'Use only the selected current source and cite its revision.', baseBranch: null, releaseSet: null });
      assert.equal(riskScope.status, 200, JSON.stringify(riskScope.body));
      assert.equal(riskScope.body.data.members.find(member => member.id === runtimeTask.id).scope.prompt, 'Use only the selected current source and cite its revision.');
      const staleScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(staleScope.status, 409); assert.equal(staleScope.body.error, 'task_risk_stale');
      const riskVersion = (await request(`${root}/risk`, token)).body.data.expectedVersion;
      const evidence = ref(currentSource);
      const dimensions = Object.fromEntries(['money', 'data', 'security', 'availability', 'legal', 'reversibility', 'users'].map(name => [name, { level: 'low', rationale: 'Selected source and no external effect', evidence: [evidence] }]));
      const assessmentBody = { requestId: randomUUID(), expectedVersion: riskVersion,
        entries: [{ taskId: runtimeTask.id, dimensions, uncertainty: { level: 'none', reasons: 'Selected current source is sufficient', evidence: [evidence] }, contradictions: [] }],
        jointRationale: 'One nonmutating information task with selected evidence' };
      const wrongAssessment = await request(`${root}/risk/assessments`, memberToken, assessmentBody);
      assert.equal(wrongAssessment.status, 403, JSON.stringify(wrongAssessment.body));
      const wrongEvidence = structuredClone(assessmentBody);
      for (const dimension of Object.values(wrongEvidence.entries[0].dimensions)) dimension.evidence = [ref(unrelatedSource)];
      wrongEvidence.entries[0].uncertainty.evidence = [ref(unrelatedSource)]; wrongEvidence.requestId = randomUUID();
      const unselected = await request(`${root}/risk/assessments`, token, wrongEvidence);
      assert.equal(unselected.status, 409); assert.equal(unselected.body.error, 'task_risk_evidence_stale');
      const assessed = await request(`${root}/risk/assessments`, token, assessmentBody);
      assert.equal(assessed.status, 200, JSON.stringify(assessed.body));
      assert.equal(assessed.body.data.history[0].result.level, 'low');
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      let candidate;
      try {
        candidate = await request(`${root}/information-approval-candidate`, token);
        assert.equal((await request(`${root}/information-approval-candidate`, memberToken)).status, 403);
      }
      finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      assert.equal(candidate.status, 200, JSON.stringify(candidate.body));
      assert.equal(candidate.body.data.approval.taskId, runtimeTask.id);
      assert.equal(candidate.body.data.previousDecision, null);
      assert.equal(candidate.body.data.approval.installationId, installationId);
      assert.equal(candidate.body.data.approval.selectionDigest, createHash('sha256').update(trustedPilotBytes(selection)).digest('hex'));
      const gov = await request('/v1/decisions/governance', token); assert.equal(gov.status, 200);
      const proposal = await request('/v1/decisions/governance/proposals', token, { requestId: randomUUID(), expectedVersion: gov.body.data.expectedVersion,
        title: 'Bounded company information runtime', context: 'Current selected preparation evidence', decision: 'Run one tool-free informational task', rationale: 'Owner needs the sourced status', consequences: 'One bounded provider attempt; no repository or native tools', scopeReason: 'Only this informational Task', scope: [{ type: 'task', id: runtimeTask.id }], supersedesId: null, conflicts: [],
        managedRuntimeApproval: candidate.body.data.approval });
      assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
      const decisionId = proposal.body.data.record.id;
      let decision = await request(`/v1/decisions/${decisionId}/governance`, token); assert.equal(decision.status, 200);
      let accepted = await request(`/v1/decisions/${decisionId}/governance/actions`, token, { requestId: randomUUID(), expectedVersion: decision.body.data.expectedVersion, action: 'accept', previewId: decision.body.data.previews[0].id });
      assert.equal(accepted.status, 409, JSON.stringify(accepted.body));
      assert.equal(accepted.body.error, 'decision_risk_admission_required');
      assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 0);
      assert.equal(await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM decision_acceptances WHERE decision_id='${decisionId}'`).then(rows => rows[0].n), 0);
      const admissionRoot = `${root}/risk-admission`;
      assert.equal((await request(admissionRoot, foreignToken)).status, 404);
      let admission = await request(admissionRoot, token); assert.equal(admission.status, 200, JSON.stringify(admission.body));
      assert.equal(admission.body.data.scopeKind, 'company_information');
      const mixedAdmission = await request(`${admissionRoot}/scope`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        taskType: 'review', environment: 'development', targetId: currentSource.id, releaseId: currentSource.id, commit: 'a'.repeat(40),
        destructive: false, procedureId: procedure.id, rationale: 'Application fields cannot authorize company information' });
      assert.equal(mixedAdmission.status, 409, JSON.stringify(mixedAdmission.body));
      const scopeBody = { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        scopeKind: 'company_information', taskType: 'information', environment: 'local', targetId: null, releaseId: null, commit: null,
        destructive: false, procedureId: procedure.id, operations: ['decision_supersede', 'runtime_execute'], rationale: 'Exact selected information task' };
      const memberAdmission = await request(`${admissionRoot}/scope`, memberToken, scopeBody);
      assert.equal(memberAdmission.status, 409, JSON.stringify(memberAdmission.body));
      const scoped = await request(`${admissionRoot}/scope`, token, scopeBody);
      assert.equal(scoped.status, 200, JSON.stringify(scoped.body));
      decision = await request(`/v1/decisions/${decisionId}/governance`, token);
      assert.equal(decision.body.data.current, false);
      const reviewedImpact = await request(`/v1/decisions/${decisionId}/governance/actions`, token, { requestId: randomUUID(), expectedVersion: decision.body.data.expectedVersion, action: 'review_impact' });
      assert.equal(reviewedImpact.status, 201, JSON.stringify(reviewedImpact.body));
      admission = await request(admissionRoot, token);
      const wrongOperation = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operation: 'review_decision', gate: 'procedure', verdict: 'passed', evidence, rationale: 'Operation outside company scope',
        validation: 'Current source checked', observedResult: 'No authority for this operation' });
      assert.equal(wrongOperation.status, 409, JSON.stringify(wrongOperation.body));
      const attested = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operation: 'decision_supersede', gate: 'procedure', verdict: 'passed', evidence, rationale: 'Current source checked against exact task',
        validation: 'Compared selected source and proposed task', observedResult: 'Source supports the bounded summary' });
      assert.equal(attested.status, 200, JSON.stringify(attested.body));
      const staleEvidence = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operation: 'decision_supersede', gate: 'procedure', verdict: 'passed', evidence, rationale: 'Old version must fail',
        validation: 'Old version', observedResult: 'No new evidence' });
      assert.equal(staleEvidence.status, 409); assert.equal(staleEvidence.body.error, 'risk_admission_stale');
      assert.ok((await prisma.$queryRawUnsafe(`SELECT task_admission_seal('${runtimeTask.id}'::uuid,'decision_supersede') AS seal`))[0].seal);
      decision = await request(`/v1/decisions/${decisionId}/governance`, token);
      accepted = await request(`/v1/decisions/${decisionId}/governance/actions`, token, { requestId: randomUUID(), expectedVersion: decision.body.data.expectedVersion, action: 'accept', previewId: decision.body.data.previews[0].id });
      assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
      assert.equal(await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM decision_acceptances WHERE decision_id='${decisionId}'`).then(rows => rows[0].n), 1);
      const acceptedDecision = await prisma.decision.findUniqueOrThrow({ where: { id: decisionId } });
      const runtimeContract = structuredClone(c);
      runtimeContract.decisions = { items: [ref(acceptedDecision)], noneReason: null };
      const renewedRisk = await request(`${root}/risk`, token);
      const renewedScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: renewedRisk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: runtimeContract, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(renewedScope.status, 200, JSON.stringify(renewedScope.body));
      const renewedAssessment = await request(`${root}/risk/assessments`, token, { ...assessmentBody, requestId: randomUUID(), expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion });
      assert.equal(renewedAssessment.status, 200, JSON.stringify(renewedAssessment.body));
      admission = await request(admissionRoot, token);
      const runtimeScope = await request(`${admissionRoot}/scope`, token, { ...scopeBody, requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion, operations: ['runtime_execute'] });
      assert.equal(runtimeScope.status, 200, JSON.stringify(runtimeScope.body));
      admission = await request(admissionRoot, token);
      const runtimeEvidence = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operation: 'runtime_execute', gate: 'procedure', verdict: 'passed', evidence, rationale: 'Current source checked for runtime',
        validation: 'Compared selected source with exact runtime task', observedResult: 'Source supports a tool-free summary' });
      assert.equal(runtimeEvidence.status, 200, JSON.stringify(runtimeEvidence.body));
      assert.ok((await prisma.$queryRawUnsafe(`SELECT task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].seal);
      const readyVersion = await request(`${root}/execution-readiness?version=1&executionClass=roost-company-information-runtime-v1`, token);
      const ready = await request(`${root}/actions/submit-for-execution`, token, { requestId: randomUUID(), expectedVersion: readyVersion.body.data.submissionVersion,
        applicationId: null, contract: runtimeContract });
      assert.equal(ready.status, 200, JSON.stringify(ready.body));
      assert.equal(ready.body.data.readiness.modelExecutionQualified, true);
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      try {
        const successor = await request(`${root}/information-approval-candidate`, token);
        assert.equal(successor.status, 200, JSON.stringify(successor.body));
        assert.equal(successor.body.data.previousDecision?.id, decisionId);
        assert.equal(successor.body.data.previousDecision?.decision, 'Run one tool-free informational task');
      } finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      let started;
      try { started = await request(`/v1/agent-runtime/tasks/${runtimeTask.id}/actions/start-information`, token, { requestId: randomUUID() }); }
      finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      assert.equal(started.status, 201, JSON.stringify(started.body));
      const runtimeExecutionId = started.body.data.execution.id;
      const readyRead = await request(`${root}/execution-readiness`, token);
      assert.equal(readyRead.status, 200); assert.equal(readyRead.body.data.status, 'ready');
      const persisted = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
      assert.equal(persisted.applicationId, null); assert.equal(persisted.attempt, 0); assert.equal(persisted.status, 'queued');
      assert.equal(persisted.metadata.readyContextPin.modelExecutionQualified, true);
      const protocol = require('../src/modules/agent-runtime/host-protocol.json');
      const hostSlug = 'synthetic-company-information-host';
      const host = await prisma.agentHost.create({ data: { workspaceId, name: 'Synthetic company information host', slug: hostSlug,
        platform: 'win32', applicationSlugs: [], capabilities: [...protocol.requiredHostCapabilities, 'company_information_runtime_v1'],
        metadata: { runnerVersion: 'roost-codex-agent-host-v1', protocolVersion: protocol.version, executionMode: 'supervised', executionProvider: {
          kind: 'hermes_codex', admissionProfile: 'managed_hermes_codex_low_v1', executionSupported: true, blockers: [],
          installation: { status: 'verified', version: '0.21.2', fingerprint: 'a'.repeat(12), checkedAt: new Date().toISOString(), signature: 'unsigned' }
        } } } });
      const apiKey = await request('/v1/api-keys', token, { name: 'Synthetic company worker', profileId: 'mcp_codex_worker' });
      assert.equal(apiKey.status, 201, JSON.stringify(apiKey.body));
      const workerKey = await prisma.apiKey.findFirstOrThrow({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
      await prisma.apiKey.update({ where: { id: workerKey.id }, data: { workerHostId: host.id, workerInstallationId: installationId,
        workerBindingEpoch: 1, expiresAt: new Date(Date.now() + 3600_000), scopes: ['agent-runtime:claim'] } });
      const worker = { 'X-API-Key': apiKey.body.data.key, 'X-Roost-Host-Protocol': String(protocol.version),
        'X-Roost-Host-Capabilities': [...protocol.requiredHostCapabilities, 'company_information_runtime_v1'].join(',') };
      if (process.env.ROOST_G6_NATIVE_RUNTIME === '1') {
        const fs = await import('node:fs/promises');
        const os = await import('node:os');
        const path = await import('node:path');
        const { spawn } = await import('node:child_process');
        const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'roost-g6-native-'));
        const writerDirectory = path.join(temporary, 'writer');
        const configPath = path.join(temporary, 'agent-host.json');
        const stopPath = path.join(temporary, 'stop.request');
        await fs.mkdir(path.join(writerDirectory, 'trusted-provider-pilot'), { recursive: true });
        await fs.writeFile(path.join(writerDirectory, 'trusted-provider-pilot', 'installation.json'), JSON.stringify({
          schemaVersion: 'roost-trusted-provider-pilot-v1', installationId, workspaceId,
          authorityPublicKey: signer.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
          decisionFile: 'trusted-provider-pilot.json', profileFile: 'trusted-provider-profile.json', qualification: 'signed_native_v1'
        }) + '\n', { mode: 0o600 });
        const installed = JSON.parse(await fs.readFile(process.env.ROOST_G6_NATIVE_HOST_CONFIG, 'utf8'));
        const localConfig = { ...installed, host: { name: 'Disposable G6 native Worker', slug: hostSlug }, baseUrl: base,
          governedRelease: null, executionMode: 'supervised', pollIntervalMs: 2000 };
        await fs.writeFile(configPath, JSON.stringify(localConfig) + '\n', { mode: 0o600 });
        const childEnvironment = { ...process.env, ROOST_BASE_URL: base, ROOST_AGENT_API_KEY: apiKey.body.data.key,
          ROOST_AGENT_HOST_CONFIG: configPath, ROOST_G6_NATIVE_WRITER_DIR: writerDirectory };
        delete childEnvironment.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64;
        process.env.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64 = signer.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
        process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
        process.env.ROOST_CODEX_EXECUTION_ENABLED = 'true';
        let child, exitCode = null, output = '', errorOutput = '', result;
        try {
          child = spawn(process.execPath, ['scripts/run-company-information-native-worker.mjs'], {
            cwd: process.cwd(), env: childEnvironment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
          child.stdout.on('data', chunk => { output = (output + chunk.toString()).slice(-4000); });
          child.stderr.on('data', chunk => { errorOutput = (errorOutput + chunk.toString()).slice(-4000); });
          child.once('exit', code => { exitCode = code; });
          const until = Date.now() + 390_000;
          while (Date.now() < until) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = await request(`${root}/information-result`, token);
            assert.equal(result.status, 200, JSON.stringify(result.body));
            if (['completed', 'failed', 'cancelled'].includes(result.body.data.status) || exitCode !== null) break;
          }
          assert.equal(result?.body?.data?.status, 'completed', JSON.stringify({ exitCode, output, errorOutput, result: result?.body?.data?.reason }));
          assert.equal(result.body.data.canReview, true, JSON.stringify({ exitCode, output, errorOutput, reason: result.body.data.reason }));
          assert.ok(result.body.data.finalResponse?.trim().length >= 10);
          const reviewed = await request(`${root}/actions/review-information`, token, { requestId: randomUUID(),
            executionId: runtimeExecutionId, materialVersion: result.body.data.materialVersion, decision: 'accept',
            summary: 'Accepted the sourced company information result after owner review' });
          assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
          assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, 'done');
          const completed = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
          assert.equal(completed.applicationId, null); assert.equal(completed.status, 'completed');
          assert.equal(completed.attempt, 1); assert.equal(completed.verification?.informationRuntime?.ownedJob, true);
          process.stdout.write(`G6 native Worker/Hermes ${JSON.stringify({ taskId: runtimeTask.id, executionId: runtimeExecutionId,
            acceptanceCommitted: true, ownerReview: 'accept', status: completed.status, ownedJob: true })}\n`);
        } finally {
          await fs.writeFile(stopPath, 'stop');
          if (child && exitCode === null) {
            const until = Date.now() + 60_000;
            while (exitCode === null && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 500));
          }
          delete process.env.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64;
          delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED;
          delete process.env.ROOST_CODEX_EXECUTION_ENABLED;
          if (exitCode === 0 && path.dirname(temporary) === os.tmpdir() && !await fs.stat(path.join(writerDirectory, 'agent-host-writer.lock')).then(() => true, () => false))
            await fs.rm(temporary, { recursive: true, force: false });
          else process.stderr.write(`G6 native Worker diagnostic: ${JSON.stringify({ exitCode, output, errorOutput, privateStateRetained: true })}\n`);
        }
        return;
      }
      process.env.ROOST_CODEX_EXECUTION_ENABLED = 'true';
      let claimed;
      try { claimed = await request('/v1/agent-runtime/executions/claim', worker, { hostSlug }); }
      finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
      assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
      assert.equal(claimed.body.data.id, runtimeExecutionId); assert.equal(claimed.body.data.agentHostId, host.id);
      const claimedRow = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
      assert.equal(claimedRow.status, 'claimed'); assert.equal(claimedRow.attempt, 1); assert.equal(claimedRow.finalResponse, null);
      const heartbeat = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/heartbeat`, worker, { leaseToken: claimed.body.data.leaseToken });
      assert.equal(heartbeat.status, 200, JSON.stringify(heartbeat.body));
      const workerContext = await request(`/v1/company-intelligence/tasks/${runtimeTask.id}/agent-context?executionId=${runtimeExecutionId}`,
        { ...worker, 'X-Roost-Host-Capabilities': protocol.requiredHostCapabilities.join(',') });
      assert.equal(workerContext.status, 200, JSON.stringify(workerContext.body));
      const { validateExecutionPacket } = await import('./lib/agent-host-execution-packet.mjs');
      validateExecutionPacket(workerContext.body.data.executionPacket, claimed.body.data, workerContext.body.data, {});
      const { fetchExecutionContext } = await import('./lib/agent-host-execution-context.mjs');
      const { readHostResponse } = await import('./lib/agent-host-redaction.mjs');
      const nativeApi = async (route, options = {}) => {
        const response = await fetch(base + route, { ...options, signal: options.signal ?? AbortSignal.timeout(10_000),
          headers: { 'X-API-Key': apiKey.body.data.key, 'Content-Type': 'application/json',
            'X-Roost-Host-Protocol': String(protocol.version), 'X-Roost-Host-Capabilities': protocol.requiredHostCapabilities.join(','),
            ...(options.headers ?? {}) } });
        const body = await readHostResponse(response);
        if (!response.ok) throw Object.assign(new Error(`roost_http_${response.status}`), { status: response.status, details: { reason: body.error } });
        return body.data;
      };
      const fetched = await fetchExecutionContext(nativeApi, claimed.body.data, { signal: new AbortController().signal,
        secrets: [apiKey.body.data.key] });
      assert.equal(fetched.taskContext.executionPacket.identity.executionId, runtimeExecutionId);
      process.env.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64 = signer.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      process.env.ROOST_CODEX_EXECUTION_ENABLED = 'true';
      let signedAdmission;
      try {
        const admitted = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/actions/managed-admission`, worker, {
          schemaVersion: 'roost-managed-admission-v1', phase: 'information', executionId: runtimeExecutionId,
          leaseToken: claimed.body.data.leaseToken, observation: { profileDigest: 'a'.repeat(64), runtimeDigest: 'b'.repeat(64) }
        });
        assert.equal(admitted.status, 200, JSON.stringify(admitted.body)); signedAdmission = admitted.body.data;
      } finally {
        delete process.env.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64;
        delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED;
        delete process.env.ROOST_CODEX_EXECUTION_ENABLED;
      }
      const { verifyInformationAdmission } = await import('./lib/agent-host-company-information-runtime.mjs');
      const leaseDigest = createHash('sha256').update(trustedPilotBytes({ executionId: runtimeExecutionId,
        hostId: host.id, token: claimed.body.data.leaseToken })).digest('hex');
      verifyInformationAdmission(signedAdmission, signer.publicKey.export({ format: 'pem', type: 'spki' }).toString(), { leaseDigest });
      await prisma.companyRecord.update({ where: { id: currentSource.id }, data: { description: 'Synthetic source changed after claim.' } });
      assert.equal((await prisma.$queryRawUnsafe(`SELECT task_risk_current('${runtimeTask.id}'::uuid) AS risk, task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].risk, null);
      assert.equal((await prisma.$queryRawUnsafe(`SELECT task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].seal, null);
      const invalidated = await request(`${root}/execution-readiness`, token);
      assert.notEqual(invalidated.body.data.status, 'ready');
      process.stdout.write(`G6 native risk/admission ${JSON.stringify({ taskId: runtimeTask.id, decisionId, executionId: runtimeExecutionId, hostId: host.id, acceptanceCommitted: true, ready: true, claimed: true, providerInvoked: false })}\n`);
    });
  } finally { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
