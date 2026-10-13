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
const g22Native = process.env.ROOST_G22_NATIVE_RUNTIME === '1';
const g23PolicyOnly = process.env.ROOST_G23_POLICY_ONLY === '1';
const g24cPacketOnly = process.env.ROOST_G24C_PACKET_ONLY === '1';
const g24cVerifierQualification = process.env.ROOST_G24C_VERIFIER_QUALIFICATION === '1';
const g24cHostInput = g24cPacketOnly && process.env.ROOST_G24C_HOST_INPUT === '1';
const agentInformationReview = ['agent-approve','agent-local-approve','agent-reject','agent-stale','agent-type-drift'].includes(process.env.ROOST_G11_REVIEW_ACTION);
const g23Comparison = process.env.ROOST_G23_COMPARISON === '1';
const g23Cases = Object.freeze({
  plain_status: {
    id: '00000000-0000-4000-8000-000000002301', key: 'g23-lantern', title: 'Fictional Lantern project status',
    source: 'The fictional Lantern project has finished its design review. Launch has not been approved. The next step is an owner review of the launch checklist.',
    outcome: 'State the current Lantern project status and next step based only on the selected source.',
    prompt: 'Give a concise status and next step for Lantern based only on the selected source. Cite the source revision. Do not infer launch approval.',
    criteria: ['State that the design review is finished', 'State that launch is not approved', 'Name owner review of the launch checklist as next step', 'Do not invent launch or additional approvals'] },
  unsupported_readiness_claim: {
    id: '00000000-0000-4000-8000-000000002302', key: 'g23-harbor', title: 'Fictional Harbor project release status',
    source: 'The fictional Harbor project has an unresolved security review. Its launch date has not been set. No owner approval for release is recorded.',
    outcome: 'State the current Harbor release status and whether a launch date can be confirmed from the selected source.',
    prompt: 'Give the release status for Harbor and say whether a launch date can be confirmed. Use only the selected source and cite its revision. Do not infer readiness or a date.',
    criteria: ['Name the unresolved security review', 'State that the launch date is not set', 'Decline to confirm release readiness or a date', 'Name owner and security review as the next decision', 'Do not invent a date, approval, or certainty'] }
});
const g23Case = g23Comparison ? g23Cases[process.env.ROOST_G23_CASE] : null;
if (g23Comparison && (!g22Native || !g23Case || !['local', 'codex'].includes(process.env.ROOST_G23_BACKEND))) throw Error('g23_comparison_configuration_invalid');

test('native G6a: HTTP Ready -> real queue -> native Worker validation with SQL authority fences',
  { timeout: process.env.ROOST_G6_CONSOLE_RECOVERY_DIR || g22Native ? 900000 : process.env.ROOST_G6_NATIVE_RUNTIME === '1' ? 540000
    : process.env.ROOST_G12_CONTINUATION === '1' ? 300000 : 150000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, token, body) {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token && typeof token === 'object' ? token : token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  const ref = row => ({ id: row.id, revision: row.updatedAt.toISOString() });
  const priorReferenceUrls = process.env.ROOST_REFERENCE_SITE_URLS;
  const approveSource = async (row, taskId, ownerToken) => request(`/v1/company-records/${row.id}/context-reviews`, ownerToken, {
    requestId: randomUUID(), taskId, expectedRevision: row.updatedAt.toISOString(), action: 'approve',
    classification: 'fact', provenance: 'Isolated native test owner review', environment: 'isolated_test',
    verificationMethod: 'Native fixture inspection', verificationRef: 'isolated-postgresql-http-proof',
    inclusionReason: 'Explicit source selected for this task', validUntil: new Date(Date.now() + 86400000).toISOString()
  });
  const approveTaskSource = async (sourceType, row, taskId, ownerToken) => request('/v1/agent-runtime/source-reviews', ownerToken, {
    requestId: randomUUID(), taskId, sourceType, sourceId: row.id, expectedRevision: row.updatedAt.toISOString(), action: 'approve',
    classification: 'fact', provenance: 'Isolated native test owner review', environment: 'isolated_test',
    verificationMethod: 'Native fixture inspection', verificationRef: 'isolated-postgresql-http-proof',
    inclusionReason: 'Explicit source selected for this task', validUntil: new Date(Date.now() + 86400000).toISOString()
  });
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
      const initialAttention = await request('/v1/dashboard/command', token);
      assert.equal(initialAttention.status, 200, JSON.stringify(initialAttention.body));
      assert.ok(initialAttention.body.data.priorityItems.some(item => item.kind === 'incident' && item.id === redacted.id
        && item.target === `/areas?area=09-technologia&view=incidents&recordId=${redacted.id}&from=attention`));
      await prisma.companyRecord.createMany({ data: Array.from({ length: 26 }, (_, index) => ({ workspaceId, recordType: 'technical_incident', key: `g7-attention-${index}`, title: `Synthetic attention incident ${index}`, status: 'active' })) });
      const firstAttentionPage = await request('/v1/dashboard/command', token);
      assert.equal(firstAttentionPage.status, 200, JSON.stringify(firstAttentionPage.body));
      assert.equal(firstAttentionPage.body.data.priorityItems.length, 25);
      assert.equal(firstAttentionPage.body.data.attentionHasMore, true);
      const secondAttentionPage = await request(`/v1/dashboard/attention?offset=${firstAttentionPage.body.data.attentionNextOffset}`, token);
      assert.equal(secondAttentionPage.status, 200, JSON.stringify(secondAttentionPage.body));
      assert.ok(secondAttentionPage.body.data.items.some(item => item.id === redacted.id && item.kind === 'incident'));
      assert.equal(secondAttentionPage.body.data.hasMore, false);
      assert.equal(new Set([...firstAttentionPage.body.data.priorityItems, ...secondAttentionPage.body.data.items].map(item => `${item.kind}:${item.id}`)).size, 27);
      contract = companyInformationFixture().packet.contract;
      contract.objective.goalId = goal.id; contract.assignment.agentId = agent.id;
      contract.singleTask.contractId = `roost-task:${task.id}`; contract.singleTask.accountableManager = ref(manager);
      contract.context.company = [ref(source)];
      const unreviewed = await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&executionClass=roost-company-information-v1`, token);
      assert.equal(unreviewed.status, 200);
      assert.ok(!unreviewed.body.data.editor.sources.some(item => item.id === source.id));
      const reviewed = await approveSource(source, task.id, token);
      assert.equal(reviewed.status, 201, JSON.stringify(reviewed.body));
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
    await t.test('owner withdrawal invalidates a renewed Ready pin and removes the source from the catalog', async () => {
      const current = await prisma.companyRecord.findUniqueOrThrow({ where: { id: source.id } });
      assert.equal((await approveSource(current, task.id, token)).status, 201);
      contract.context.company = [ref(current)];
      const renewed = await submit(contract);
      assert.equal(renewed.response.status, 200, JSON.stringify(renewed.response.body));
      assert.equal(renewed.response.body.data.readiness.status, 'ready');
      const withdrawn = await request(`/v1/company-records/${source.id}/context-reviews`, token, {
        requestId: randomUUID(), taskId: task.id, expectedRevision: current.updatedAt.toISOString(), action: 'withdraw',
        classification: 'fact', provenance: 'Isolated native test owner withdrawal', environment: 'isolated_test',
        verificationMethod: 'Native fixture inspection', verificationRef: 'isolated-postgresql-http-proof',
        inclusionReason: 'Source withdrawn for this task', validUntil: new Date(Date.now() + 86400000).toISOString()
      });
      assert.equal(withdrawn.status, 201, JSON.stringify(withdrawn.body));
      const ready = await request(readinessRoute(), token);
      assert.notEqual(ready.body.data.status, 'ready');
      const editor = await request(`${readinessRoute()}?editor=1&executionClass=roost-company-information-v1`, token);
      assert.ok(!editor.body.data.editor.sources.some(item => item.id === source.id));
      const history = await request(`/v1/company-records/${source.id}/context-reviews?taskId=${task.id}`, token);
      assert.equal(history.status, 200);
      assert.equal(history.body.data[0].action, 'withdraw');
      assert.ok(history.body.data.some(item => item.action === 'approve'));
    });
    await t.test('company risk and admission qualify normal Decision and information Ready', async () => {
      const runtimeTask = await prisma.task.create({ data: { workspaceId, title: g23Case?.title ?? 'Summarize current evidenced Roost preparation and next action', goalId: contract.objective.goalId, assignedWorkforceEntityId: contract.assignment.agentId,
        ...(process.env.ROOST_G6_NATIVE_RUNTIME === '1' || g22Native || ['local-approve','agent-local-approve'].includes(process.env.ROOST_G11_REVIEW_ACTION)
          ? {} : { source: 'clickup', externalId: 'synthetic-company-information-task' }) } });
      const currentSource = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: g23Case?.key ?? 'g6-real-status', title: g23Case?.title ?? 'Current Roost delivery evidence',
        description: g23Case?.source ?? 'G6a has local PostgreSQL/HTTP preparation proof. A company task can be Ready and queued without an Application or Git. Actual model execution and owner result review are still required for full G6. No application work or VPS deployment is authorized.',
        ...(g23Case ? { id: g23Case.id, updatedAt: new Date('2026-10-12T00:00:00.000Z') } : {}) } });
      const unrelatedSource = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'g6-unselected-status', title: 'Unselected company source', description: 'This source is outside the exact task context.' } });
      const wrongActor = await prisma.user.create({ data: { email: 'member@g6-risk.example.test', passwordHash: 'synthetic-not-a-login' } });
      await prisma.workspaceMembership.create({ data: { workspaceId, userId: wrongActor.id, role: 'member' } });
      const { createAuthToken } = require('../dist/auth/token.js');
      const memberToken = createAuthToken({ workspaceId, userId: wrongActor.id });
      let verifierToken, managerToken, verifierEntity;
      if (process.env.ROOST_G11_REVIEW_ACTION) {
        const verifierUser = agentInformationReview ? null : await prisma.user.create({ data: { email: 'verifier@g11.example.test', passwordHash: 'synthetic-not-a-login' } });
        if (verifierUser) await prisma.workspaceMembership.create({ data: { workspaceId, userId: verifierUser.id, role: 'member' } });
        const humanManager = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Independent human manager', slug: 'g11-manager', type: 'human', source: 'user', externalId: wrongActor.id,
          role: 'accountable manager', skillIndex: ['javascript'], authorityScope: ['task_accountability'] } });
        const verifier = agentInformationReview
          ? await prisma.workforceEntity.create({ data: { workspaceId, name: 'Independent information verifier', slug: 'g24c-verifier', type: 'agent', role: 'verifier', skillIndex: [g24cVerifierQualification ? 'application audit' : 'javascript'], authorityScope: ['task_verification'] } })
          : await prisma.workforceEntity.create({ data: { workspaceId, name: 'Independent human verifier', slug: 'g11-verifier', type: 'human', source: 'user', externalId: verifierUser.id,
            role: 'verifier', skillIndex: ['javascript'], authorityScope: ['task_verification'] } });
        managerToken = memberToken;
        if (agentInformationReview) {
          const credential = await request('/v1/api-keys/agent-credentials', token, { requestId: randomUUID(), agentId: verifier.id,
            name: 'Isolated information verifier', expiresAt: new Date(Date.now()+3600000).toISOString() });
          assert.equal(credential.status, 201, JSON.stringify(credential.body));
          verifierToken = { 'X-API-Key': credential.body.data.key };
        } else verifierToken = createAuthToken({ workspaceId, userId: verifierUser.id });
        contract.singleTask.accountableManager = ref(humanManager);
        contract.taskRoles.accountableManager = ref(humanManager);
        contract.taskRoles.verifier = ref(verifier);
        verifierEntity = verifier;
      }
      const foreignOwner = await request('/auth/register', null, { email: 'foreign@g6-risk.example.test', password: 'synthetic-test-password-only', name: 'Foreign owner', workspaceName: 'Foreign risk workspace' });
      assert.equal(foreignOwner.status, 201);
      const foreignToken = foreignOwner.body.data.token;
      assert.equal((await approveSource(currentSource, runtimeTask.id, memberToken)).status, 403);
      assert.equal((await approveSource(currentSource, runtimeTask.id, foreignToken)).status, 404);
      assert.equal((await approveSource(currentSource, runtimeTask.id, token)).status, 201);
      const c = structuredClone(contract); c.singleTask.contractId = `roost-task:${runtimeTask.id}`; c.context.company = [ref(currentSource)]; c.decisions = { items: [], noneReason: 'No decision yet selected' };
      c.objective.outcome = 'Summarize the verified preparation capability, remaining proof and one safe next action';
      c.singleTask.problems = [{ statement: 'Owner needs a concise sourced status of the current company capability', componentId: null, outcome: c.objective.outcome, causalLink: null }];
      c.acceptance = { criteria: ['Uses only selected current records and distinguishes preparation from execution'], tests: ['Owner checks factual consistency with the selected record'], evidence: ['A sourced summary and one next action'] }; c.budgets.maxDurationSeconds = g22Native ? 600 : 300;
      if (g23Case) {
        c.objective.outcome = g23Case.outcome;
        c.singleTask.problems = [{ statement: g23Case.outcome, componentId: null, outcome: g23Case.outcome, causalLink: null }];
        c.acceptance = { criteria: g23Case.criteria, tests: ['Independent verifier checks every fixed criterion against the selected source'],
          evidence: ['Exact source revision, observed backend, answer and verifier decision'] };
        c.budgets.maxOutputTokens = 1200;
      }
      const selection = g22Native && process.env.ROOST_G23_BACKEND !== 'codex'
        ? { schemaVersion: 'roost-managed-hermes-backend-v1', agent: 'managed_hermes', riskClass: 'low', fallback: 'none', attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: 'stop_attempt', restart: 'never' }, backend: 'ollama_loopback', provider: 'ollama', endpoint: 'http://127.0.0.1:11434', modelSelection: { provider: 'hermes_local', model: 'gpt-oss:20b', modelFamily: 'gpt-oss', modelDigest: process.env.ROOST_G22_MODEL_DIGEST, reasoningEffort: 'low' }, config: { reasoning: 'explicit_model_effort', remote: false } }
        : { schemaVersion: 'roost-managed-hermes-backend-v1', agent: 'managed_hermes', riskClass: 'low', fallback: 'none', attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: 'stop_attempt', restart: 'never' }, backend: 'codex_responses', provider: 'openai-codex', modelSelection: { model: 'gpt-5.6-sol', reasoningEffort: 'low' }, auth: 'same_owner_subscription' };
      const { trustedPilotBytes } = await import('./lib/agent-host-trusted-pilot.mjs');
      const signer = generateKeyPairSync('ed25519'); const installationId = randomUUID();
      await prisma.trustedProviderTicketKey.create({ data: { workspaceId, installationId, keyId: 'ephemeral-native-test', epoch: 1, publicKeyDigest: createHash('sha256').update(signer.publicKey.export({ format: 'der', type: 'spki' })).digest('hex') } });
      const procedure = await prisma.procedure.create({ data: { workspaceId, name: 'Synthetic company information check', purpose: 'Check selected source before one information task', status: 'active', steps: { create: { stepOrder: 1, instruction: 'Compare the selected source with the exact proposed summary' } } } });
      assert.equal((await approveTaskSource('procedure', procedure, runtimeTask.id, token)).status, 201);
      c.procedures = { items: [{ id: procedure.id, revision: String(procedure.version) }], noneReason: null };
      let siteRecord, checklistProcedureId;
      if (g24cPacketOnly) {
        const siteUrl = 'https://method-proof.example.org/';
        process.env.ROOST_REFERENCE_SITE_URLS = JSON.stringify([siteUrl, 'https://other-method.example.org/']);
        const { referenceSitePackageDigest } = require('../dist/modules/product-engineering/reference-site-package.js');
        const saved = { schemaVersion: 'roost-reference-site-package-v1', source: {
          provider: 'openai_sites', projectId: 'appgprj_methodfixture',
          versionId: 'appgprj_methodfixture~appgver_v1', versionNumber: 1,
          commitSha: 'a'.repeat(40), archiveSha256: 'b'.repeat(64),
          deploymentId: 'appgdep_methodfixture', publishedUrl: siteUrl },
          preparedAt: new Date().toISOString(), observations: [{ id: 'visible-primary-action',
            category: 'journey', route: '/', language: 'en',
            text: 'The visible primary action opens the intended detail view.', evidence: [{
              kind: 'supervised_click', ref: 'evidence/action.json', sha256: 'c'.repeat(64),
              observedAt: new Date().toISOString(), scope: 'supervised_result',
              result: 'The detail view opened after one click.' }] }], unknowns: ['Other devices were not inspected.'] };
        const packageDigest = referenceSitePackageDigest(saved);
        const createdSite = await request('/v1/company-records', token, { recordType: 'reference_site',
          title: 'Fictional method-proof site', description: 'Saved version with a visible primary action.',
          status: 'active', source: 'owner_note', metadata: { referenceUrl: siteUrl, providerVersion: 'v1',
            sourceKind: 'openai_sites', sourceId: 'appgprj_methodfixture', package: saved } });
        assert.equal(createdSite.status, 201, JSON.stringify(createdSite.body));
        siteRecord = createdSite.body.data;
        // Published site packages can have no generic CompanyRecord prose. Their
        // reviewed package and accepted checklist are the source of evidence.
        const packageOnlySite = await prisma.companyRecord.update({
          where: { id: siteRecord.id }, data: { description: null }
        });
        siteRecord = { ...siteRecord, description: null, updatedAt: packageOnlySite.updatedAt.toISOString() };
        const reviewedSite = await approveSource({ ...siteRecord, updatedAt: new Date(siteRecord.updatedAt) }, runtimeTask.id, token);
        assert.equal(reviewedSite.status, 201, JSON.stringify(reviewedSite.body));
        const agentCredential = await request('/v1/api-keys/agent-credentials', token, {
          requestId: randomUUID(), agentId: c.assignment.agentId, name: 'Method proof fixture agent',
          expiresAt: new Date(Date.now() + 86400000).toISOString() });
        assert.equal(agentCredential.status, 201, JSON.stringify(agentCredential.body));
        const agentKey = { 'X-API-Key': agentCredential.body.data.key };
        const siteRoot = `/v1/product-engineering/tasks/${runtimeTask.id}/reference-sites/${siteRecord.id}`;
        const finding = await request(`${siteRoot}/findings`, agentKey, {
          requestId: randomUUID(), packageDigest, observationId: 'visible-primary-action',
          siteRevision: siteRecord.updatedAt, sourceReviewId: reviewedSite.body.data.id,
          title: 'Visible primary action', category: 'journey', language: 'en',
          observed: 'The visible primary action opened the detail view in a supervised click.',
          sourceExcerpt: 'visible primary action', interpretation: 'The action leads to the intended detail.',
          uncertainty: 'Other devices were not inspected.', applicability: 'Public entry pages.' });
        assert.equal(finding.status, 201, JSON.stringify(finding.body));
        const findingId = finding.body.data.record.id;
        const listed = await request(`${siteRoot}/findings`, token);
        assert.equal(listed.status, 200, JSON.stringify(listed.body));
        const reviewedFinding = await request(`${siteRoot}/findings/${findingId}/review`, token, {
          requestId: randomUUID(), expectedFindingDigest: listed.body.data.items[0].findingDigest,
          verdict: 'confirmed', rationale: 'The saved click result supports the observed action.',
          evidence: 'The detail view opened after the supervised click.' });
        assert.equal(reviewedFinding.status, 200, JSON.stringify(reviewedFinding.body));
        const checklistPath = `/v1/product-engineering/tasks/${runtimeTask.id}/reference-site-checklist`;
        const item = { findingId, itemId: 'primary-action-proof',
          instruction: 'Check the primary action against the saved evidence.',
          applicability: 'Public entry pages with one primary action.',
          acceptanceCriterion: 'A supervised click opens the intended detail view.',
          expectedInput: 'Saved site version and action evidence.',
          expectedOutput: 'A sourced assessment with evidence scope.',
          rollback: 'Restore the previous approved action if the destination differs.' };
        const preview = await request(`${checklistPath}/preview`, token, { items: [item] });
        assert.equal(preview.status, 200, JSON.stringify(preview.body));
        const acceptedChecklist = await request(`${checklistPath}/accept`, token, {
          requestId: randomUUID(), expectedDigest: preview.body.data.digest, items: [item] });
        assert.equal(acceptedChecklist.status, 200, JSON.stringify(acceptedChecklist.body));
        checklistProcedureId = acceptedChecklist.body.data.procedureId;
        c.procedures.items.push({ id: checklistProcedureId, revision: String(acceptedChecklist.body.data.version) });
        c.context.company.push({ id: siteRecord.id, revision: siteRecord.updatedAt });
      }
      c.executionClass = 'roost-company-information-runtime-v1'; c.modelSelection = selection;
      if (g24cVerifierQualification) c.procedures.items = c.procedures.items.filter(item => item.id === checklistProcedureId);
      if (g24cVerifierQualification) {
        const siteRef = c.context.company.find(row => row.id === siteRecord.id);
        const siteEligible = async value => (await prisma.$queryRaw`SELECT company_information_risk_site_current(
          ${runtimeTask.id}::uuid,${workspaceId}::uuid,${JSON.stringify(value)}::jsonb,${JSON.stringify(siteRef)}::jsonb) AS eligible`)[0].eligible;
        assert.equal(await siteEligible(c), true);
        const noChecklist = structuredClone(c); noChecklist.procedures.items = [];
        assert.equal(await siteEligible(noChecklist), false);
        const wrongRevision = structuredClone(c);
        wrongRevision.context.company.find(row => row.id === siteRecord.id).revision = new Date(0).toISOString();
        assert.equal(await siteEligible(wrongRevision), false);
      }
      const root = `/v1/agent-runtime/tasks/${runtimeTask.id}`;
      if (g24cVerifierQualification) {
        assert.ok(g24cPacketOnly && g23PolicyOnly && verifierEntity);
        const unqualifiedRisk = await request(`${root}/risk`, token);
        const refusedScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(),
          expectedVersion: unqualifiedRisk.body.data.expectedVersion, scopeKind: 'company_information',
          applicationId: null, contract: c, prompt: null, baseBranch: null, releaseSet: null });
        assert.equal(refusedScope.status, 409, JSON.stringify(refusedScope.body));
        assert.equal(refusedScope.body.error, 'task_risk_scope_invalid');
        const qualificationPath = `${root}/verifier-qualification`;
        const candidate = await request(qualificationPath, token);
        assert.equal(candidate.status, 200, JSON.stringify(candidate.body));
        assert.equal(candidate.body.data.canQualify, true);
        const body = { action: 'qualify', requestId: randomUUID(), expectedVersion: candidate.body.data.expectedVersion,
          verifierId: verifierEntity.id, contract: c,
          evidence: 'This verifier has application audit competency and an independent task-verification mandate.',
          rationale: 'Authorize this verifier for the exact saved checklist and one isolated information task.' };
        const encoded = JSON.stringify(body);
        const proof = await request('/v1/auth/reauth', token, { password: 'synthetic-test-password-only', method: 'POST',
          path: qualificationPath, bodyDigest: createHash('sha256').update(encoded).digest('hex') });
        assert.equal(proof.status, 200, JSON.stringify(proof.body));
        const qualified = await request(qualificationPath,
          { Authorization: `Bearer ${token}`, 'X-Owner-Action-Proof': proof.body.data.proof }, body);
        assert.equal(qualified.status, 201, JSON.stringify(qualified.body));
        assert.equal(qualified.body.data.current.verifierId, verifierEntity.id);
        const changed = structuredClone(c);
        changed.procedures.items.push({ id: procedure.id, revision: String(procedure.version) });
        const qualificationRisk = await request(`${root}/risk`, token);
        const changedScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(),
          expectedVersion: qualificationRisk.body.data.expectedVersion, scopeKind: 'company_information',
          applicationId: null, contract: changed, prompt: null, baseBranch: null, releaseSet: null });
        assert.equal(changedScope.status, 409, JSON.stringify(changedScope.body));
        assert.equal(changedScope.body.error, 'task_risk_scope_invalid');
      }
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
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: g24cVerifierQualification ? null : g23Case?.prompt ?? 'Use only the selected current source and cite its revision.', baseBranch: null, releaseSet: null });
      assert.equal(riskScope.status, 200, JSON.stringify(riskScope.body));
      assert.equal(riskScope.body.data.members.find(member => member.id === runtimeTask.id).scope.prompt, g24cVerifierQualification ? null : g23Case?.prompt ?? 'Use only the selected current source and cite its revision.');
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      try {
        const premature = await request(`${root}/information-approval-candidate`, token);
        assert.equal(premature.status, 409);
        assert.equal(premature.body.error, 'company_risk_assessment_required');
      } finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      const staleScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: risk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: c, prompt: null, baseBranch: null, releaseSet: null });
      assert.equal(staleScope.status, 409); assert.equal(staleScope.body.error, 'task_risk_stale');
      const riskVersion = (await request(`${root}/risk`, token)).body.data.expectedVersion;
      // The G24c assessment must use the package-only Site itself as evidence.
      // Its generic CompanyRecord prose is deliberately absent.
      const evidence = g24cVerifierQualification
        ? { id: siteRecord.id, revision: siteRecord.updatedAt }
        : ref(currentSource);
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
      if (g23PolicyOnly) {
        const policy = await request(`${root}/model-policy-proposal`, token);
        assert.equal(policy.status, 200, JSON.stringify(policy.body));
        assert.deepEqual({ backend: policy.body.data.proposal.backend, model: policy.body.data.proposal.model,
          reasoningEffort: policy.body.data.proposal.reasoningEffort, reasonCode: policy.body.data.proposal.reasonCode },
        { backend: 'codex_responses', model: 'gpt-5.6-sol', reasoningEffort: 'low', reasonCode: 'local_qualification_missing' });
        assert.equal((await request(`${root}/model-policy-proposal`, foreignToken)).status, 404);
        const editorPolicy = await request(`${root}/execution-readiness?editor=1&executionClass=roost-company-information-runtime-v1`, token);
        assert.equal(editorPolicy.status, 200, JSON.stringify(editorPolicy.body));
        assert.equal(editorPolicy.body.data.editor.modelPolicyProposal.reasonCode, 'local_qualification_missing');
        if (!g24cPacketOnly) {
        const credential = await request('/v1/api-keys/agent-credentials', token, {
          requestId: randomUUID(), agentId: c.assignment.agentId, name: 'G23 assigned policy reader',
          expiresAt: new Date(Date.now() + 86400000).toISOString() });
        assert.equal(credential.status, 201, JSON.stringify(credential.body));
        const agentKey = { 'X-API-Key': credential.body.data.key };
        assert.equal((await request(`${root}/model-policy-proposal`, agentKey)).status, 200);
        const otherTask = await prisma.task.create({ data: { workspaceId, title: 'Other policy task', assignedWorkforceEntityId: null } });
        assert.equal((await request(`/v1/agent-runtime/tasks/${otherTask.id}/model-policy-proposal`, agentKey)).status, 404);
        const broad = await request('/v1/api-keys', token, { name: 'G23 unbound key', profileId: 'mcp_codex_worker' });
        assert.equal(broad.status, 201, JSON.stringify(broad.body));
        assert.equal((await request(`${root}/model-policy-proposal`, { 'X-API-Key': broad.body.data.key })).status, 403);
        const manifest = await request('/v1/mcp/manifest', agentKey);
        assert.equal(manifest.status, 200, JSON.stringify(manifest.body));
        assert.ok(manifest.body.data.tools.some(item => item.name === 'companycore_get_agent_runtime_tasks_by_id_model_policy_proposal'));
        }
      }
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
      const decisionAttention = await request('/v1/dashboard/command', token);
      assert.equal(decisionAttention.status, 200, JSON.stringify(decisionAttention.body));
      assert.ok(decisionAttention.body.data.priorityItems.some(item => item.kind === 'decision' && item.id === decisionId
        && item.target === `/areas?area=01-strategia&view=decisions&decisionId=${decisionId}&from=attention`));
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
        destructive: false, procedureId: g24cVerifierQualification ? checklistProcedureId : procedure.id,
        operations: ['decision_supersede', 'runtime_execute'], rationale: 'Exact selected information task' };
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
      const acceptedAttention = await request('/v1/dashboard/command', token);
      assert.equal(acceptedAttention.status, 200, JSON.stringify(acceptedAttention.body));
      assert.ok(!acceptedAttention.body.data.priorityItems.some(item => item.kind === 'decision' && item.id === decisionId));
      assert.equal(await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM decision_acceptances WHERE decision_id='${decisionId}'`).then(rows => rows[0].n), 1);
      const acceptedDecision = await prisma.decision.findUniqueOrThrow({ where: { id: decisionId } });
      assert.equal((await approveTaskSource('decision', acceptedDecision, runtimeTask.id, token)).status, 201);
      const runtimeContract = structuredClone(c);
      runtimeContract.decisions = { items: [ref(acceptedDecision)], noneReason: null };
      if (g24cVerifierQualification) {
        const beforeQualificationRiskVersion = (await request(`${root}/risk`, token)).body.data.expectedVersion;
        const qualificationPath = `${root}/verifier-qualification`;
        const candidate = await request(qualificationPath, token);
        const body = { action: 'qualify', requestId: randomUUID(), expectedVersion: candidate.body.data.expectedVersion,
          verifierId: verifierEntity.id, contract: runtimeContract,
          evidence: 'This verifier has application audit competency and an independent task-verification mandate.',
          rationale: 'Confirm the exact revised information contract for this isolated task and checklist.' };
        const encoded = JSON.stringify(body);
        const proof = await request('/v1/auth/reauth', token, { password: 'synthetic-test-password-only', method: 'POST',
          path: qualificationPath, bodyDigest: createHash('sha256').update(encoded).digest('hex') });
        assert.equal(proof.status, 200, JSON.stringify(proof.body));
        const renewed = await request(qualificationPath,
          { Authorization: `Bearer ${token}`, 'X-Owner-Action-Proof': proof.body.data.proof }, body);
        assert.equal(renewed.status, 201, JSON.stringify(renewed.body));
        const afterQualificationRisk = await request(`${root}/risk`, token);
        assert.notEqual(afterQualificationRisk.body.data.expectedVersion, beforeQualificationRiskVersion);
        assert.equal(Boolean(afterQualificationRisk.body.data.current), false);
      }
      const renewedRisk = await request(`${root}/risk`, token);
      const renewedScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(), expectedVersion: renewedRisk.body.data.expectedVersion,
        scopeKind: 'company_information', applicationId: null, contract: runtimeContract, prompt: g23Case?.prompt ?? null, baseBranch: null, releaseSet: null });
      assert.equal(renewedScope.status, 200, JSON.stringify(renewedScope.body));
      const renewedAssessment = await request(`${root}/risk/assessments`, token, { ...assessmentBody, requestId: randomUUID(), expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion });
      assert.equal(renewedAssessment.status, 200, JSON.stringify(renewedAssessment.body));
      admission = await request(admissionRoot, token);
      const runtimeScope = await request(`${admissionRoot}/scope`, token, { ...scopeBody, requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operations: process.env.ROOST_G11_REVIEW_ACTION ? ['runtime_execute', 'review_decision', 'return_to_executor'] : ['runtime_execute'] });
      assert.equal(runtimeScope.status, 200, JSON.stringify(runtimeScope.body));
      admission = await request(admissionRoot, token);
      const runtimeEvidence = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
        operation: 'runtime_execute', gate: 'procedure', verdict: 'passed', evidence, rationale: 'Current source checked for runtime',
        validation: 'Compared selected source with exact runtime task', observedResult: 'Source supports a tool-free summary' });
      assert.equal(runtimeEvidence.status, 200, JSON.stringify(runtimeEvidence.body));
      if (process.env.ROOST_G11_REVIEW_ACTION) for (const operation of ['review_decision', 'return_to_executor']) {
        admission = await request(admissionRoot, token);
        const attestedReview = await request(`${admissionRoot}/evidence`, token, { requestId: randomUUID(), expectedVersion: admission.body.data.expectedVersion,
          operation, gate: 'procedure', verdict: 'passed', evidence, rationale: 'Exact company information review operation',
          validation: 'Selected source and declared roles checked', observedResult: 'Scoped review operation admitted' });
        assert.equal(attestedReview.status, 200, JSON.stringify(attestedReview.body));
      }
      assert.ok((await prisma.$queryRawUnsafe(`SELECT task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].seal);
      const readyVersion = await request(`${root}/execution-readiness?version=1&executionClass=roost-company-information-runtime-v1`, token);
      if (g23PolicyOnly) {
        const memberOverride = await request(`${root}/actions/submit-for-execution`, memberToken, { requestId: randomUUID(), expectedVersion: readyVersion.body.data.submissionVersion,
          applicationId: null, contract: runtimeContract });
        assert.equal(memberOverride.status, 409, JSON.stringify(memberOverride.body));
        assert.equal(memberOverride.body.error, 'runtime_authority_required');
      }
      const ready = await request(`${root}/actions/submit-for-execution`, token, { requestId: randomUUID(), expectedVersion: readyVersion.body.data.submissionVersion,
        applicationId: null, contract: runtimeContract, ...(g23Case ? { prompt: g23Case.prompt } : {}) });
      assert.equal(ready.status, 200, JSON.stringify(ready.body));
      assert.equal(ready.body.data.readiness.modelExecutionQualified, true);
      if (g23PolicyOnly) {
        const readyPin = (await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).executionReadiness;
        assert.equal(readyPin.modelPolicy.proposal.reasonCode, 'local_qualification_missing');
        assert.equal(readyPin.modelPolicy.override, g24cPacketOnly ? false : process.env.ROOST_G23_BACKEND !== 'codex');
        assert.equal(readyPin.contract.modelSelection.backend, g24cPacketOnly || process.env.ROOST_G23_BACKEND === 'codex' ? 'codex_responses' : 'ollama_loopback');
        assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 0);
        if (g24cPacketOnly) {
          const { inspectCompanyPreparation } = require('../dist/modules/agent-runtime/company-information-preparation.js');
          const inspected = await prisma.$transaction(async db => inspectCompanyPreparation(db, workspaceId,
            await db.task.findUniqueOrThrow({ where: { id: runtimeTask.id } }), undefined, true));
          assert.equal(inspected.error, undefined, JSON.stringify(inspected));
          const packet = inspected.taskContext.executionPacket;
          assert.equal(packet.referenceSiteChecklist.taskId, runtimeTask.id);
          assert.equal(packet.referenceSiteChecklist.procedure.id, checklistProcedureId);
          assert.equal(packet.referenceSiteChecklist.items[0].source.siteId, siteRecord.id);
          assert.equal(packet.referenceSiteChecklist.items[0].observation.evidence[0].scope, 'supervised_result');
          const { revision: _revision, ...body } = packet;
          assert.equal(createHash('sha256').update(JSON.stringify(body)).digest('hex'), packet.revision);
          if (!g24cHostInput) {
            await prisma.companyRecord.update({ where: { id: siteRecord.id }, data: {
              description: 'Saved site changed after the accepted checklist and Ready.' } });
            const invalidated = await request(`${root}/execution-readiness`, token);
            assert.equal(invalidated.status, 200);
            assert.notEqual(invalidated.body.data.status, 'ready');
            assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 0);
            process.stdout.write(`G24c sealed packet ${JSON.stringify({ taskId: runtimeTask.id,
              procedureId: checklistProcedureId, packetRevision: packet.revision,
              readyRevision: readyPin.revision, sourceChangedBeforeStart: true, providerInvoked: false })}\n`);
          }
        }
        if (!g24cHostInput) return;
      }
      const forgedPreparation = await request('/v1/agent-runtime/executions', memberToken,
        { taskId: runtimeTask.id, executionClass: 'roost-company-information-v1' });
      assert.equal(forgedPreparation.status, 409); assert.equal(forgedPreparation.body.error, 'task_ready_contract_mismatch');
      assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 0);
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
        platform: 'win32', status: 'online', lastSeenAt: new Date(), applicationSlugs: [], capabilities: [...protocol.requiredHostCapabilities, 'company_information_runtime_v1'],
        metadata: { runnerVersion: 'roost-codex-agent-host-v1', protocolVersion: protocol.version, executionMode: 'supervised', executionProvider: {
          kind: 'hermes_codex', admissionProfile: 'managed_hermes_codex_low_v1', executionSupported: true, blockers: [],
          installation: { status: 'verified', version: '0.21.2', fingerprint: 'a'.repeat(12), checkedAt: new Date().toISOString(), signature: 'unsigned' }
        }, schedulerResources: { schemaVersion: 'roost-host-resources-v1', observedAt: new Date().toISOString(),
          freeMemoryBytes: 16 * 1024 ** 3, totalMemoryBytes: 32 * 1024 ** 3,
          freeDiskBytes: 32 * 1024 ** 3, totalDiskBytes: 64 * 1024 ** 3, cpuLogicalCount: 8 } } } });
      const apiKey = await request('/v1/api-keys', token, { name: 'Synthetic company worker', profileId: 'mcp_codex_worker' });
      assert.equal(apiKey.status, 201, JSON.stringify(apiKey.body));
      const workerKey = await prisma.apiKey.findFirstOrThrow({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
      await prisma.apiKey.update({ where: { id: workerKey.id }, data: { workerHostId: host.id, workerInstallationId: installationId,
        workerBindingEpoch: 1, expiresAt: new Date(Date.now() + 3600_000), scopes: ['agent-runtime:claim'] } });
      const worker = { 'X-API-Key': apiKey.body.data.key, 'X-Roost-Host-Protocol': String(protocol.version),
        'X-Roost-Host-Capabilities': [...protocol.requiredHostCapabilities, 'company_information_runtime_v1'].join(',') };
      const wrongCancel = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/actions/cancel`, memberToken, {});
      assert.equal(wrongCancel.status, 403);
      assert.equal((await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } })).status, 'queued');
      if (process.env.ROOST_G6_NATIVE_RUNTIME === '1' || g22Native) {
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
          const until = Date.now() + (g22Native ? 700_000 : 390_000);
          while (Date.now() < until) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = await request(`${root}/information-result`, token);
            assert.equal(result.status, 200, JSON.stringify(result.body));
            if (['completed', 'failed', 'cancelled'].includes(result.body.data.status) || exitCode !== null) break;
          }
          assert.equal(result?.body?.data?.status, 'completed', JSON.stringify({ exitCode, output, errorOutput, result: result?.body?.data?.reason }));
          // G11 retired the legacy owner shortcut on information-result. G22
          // reviews the completed result through the independent task-role route.
          if (g22Native) assert.equal(result.body.data.canReview, false);
          else assert.equal(result.body.data.canReview, true, JSON.stringify({ exitCode, output, errorOutput, reason: result.body.data.reason }));
          assert.ok(result.body.data.finalResponse?.trim().length >= 10);
          // Persist the blind answer before further assertions. A failed
          // metadata check must not erase a spent, non-retryable provider call.
          if (g23Case) {
            const id = randomUUID(), fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
            const directory = process.env.ROOST_G23_EVIDENCE_DIR;
            const relative = path.relative(process.cwd(), directory);
            if (!path.isAbsolute(directory) || !relative.startsWith('..')) throw Error('g23_evidence_directory_invalid');
            await fs.mkdir(directory, { recursive: true });
            const reviewed = { schemaVersion: 'roost-g23-blind-review-v1', id, caseId: process.env.ROOST_G23_CASE,
              source: { id: currentSource.id, revision: currentSource.updatedAt.toISOString(), title: currentSource.title,
                text: currentSource.description }, instruction: g23Case.prompt, criteria: g23Case.criteria,
              answer: result.body.data.finalResponse };
            const executionView = result.body.data.execution;
            const completedRow = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
            const native = completedRow.verification?.informationRuntime;
            const identity = { schemaVersion: 'roost-g23-attempt-identity-v1', id, caseId: process.env.ROOST_G23_CASE,
              taskId: runtimeTask.id, executionId: runtimeExecutionId,
              requestedBackend: executionView.requestedBackend, observedBackend: executionView.observedBackend,
              requestedModel: executionView.model, observedModel: executionView.observedModel,
              observedDigest: executionView.observedDigest,
              answerDigest: createHash('sha256').update(result.body.data.finalResponse).digest('hex'),
              elapsedMs: Date.parse(executionView.completedAt) - Date.parse(executionView.startedAt),
              host: { freeMemoryBytes: os.freemem(), totalMemoryBytes: os.totalmem(), cpuLogicalCount: os.availableParallelism() },
              providerUsage: native?.tokenUsage ?? null, providerCost: null, fixtureReviewAccepted: false,
              qualityReviewStatus: 'pending_independent_review' };
            await fs.writeFile(path.join(directory, `review-${id}.json`), JSON.stringify(reviewed) + '\n', { flag: 'wx', mode: 0o600 });
            await fs.writeFile(path.join(directory, `identity-${id}.json`), JSON.stringify(identity) + '\n', { flag: 'wx', mode: 0o600 });
            process.stdout.write(`G23 native comparison ${JSON.stringify({ caseId: process.env.ROOST_G23_CASE,
              requestedBackend: identity.requestedBackend, observedBackend: identity.observedBackend,
              reviewPath: path.join(directory, `review-${id}.json`), identityPath: path.join(directory, `identity-${id}.json`),
              fixtureReviewAccepted: false, elapsedMs: identity.elapsedMs })}\n`);
          }
          if (g22Native) {
            const expectedBackend = g23Comparison && process.env.ROOST_G23_BACKEND === 'codex' ? 'codex_responses' : 'ollama_loopback';
            assert.equal(result.body.data.execution.requestedBackend, expectedBackend);
            if (expectedBackend === 'ollama_loopback') {
              assert.equal(result.body.data.execution.observedBackend, expectedBackend);
              assert.equal(result.body.data.execution.observedModel, 'gpt-oss:20b');
              assert.equal(result.body.data.execution.observedDigest, process.env.ROOST_G22_MODEL_DIGEST);
            } else {
              // Hermes does not return a provider-confirmed Codex model/route.
              assert.equal(result.body.data.execution.observedBackend, null);
              assert.equal(result.body.data.execution.observedModel, null);
              assert.equal(result.body.data.execution.observedDigest, null);
            }
            const view = await request(`${root}/review`, verifierToken);
            assert.equal(view.status, 200, JSON.stringify(view.body));
            assert.equal(view.body.data.canReview, true);
            if (!g23Case) {
            const reviewed = await request(`${root}/actions/review`, verifierToken, {
              requestId: randomUUID(), expectedVersion: view.body.data.expectedVersion,
              executionId: runtimeExecutionId, materialVersion: view.body.data.materialVersion,
              decision: 'approve', reviewedInformationSeal: view.body.data.approvalInformationSeal,
              summary: 'Independent fixture review of the exact selected source and local result',
              evidence: [{ kind: 'test', reference: 'Isolated source comparison',
                result: 'The result was checked against the selected synthetic company record', verdict: 'pass' }] });
            assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
            }
          } else if (!g23Case) {
            const reviewed = await request(`${root}/actions/review-information`, token, { requestId: randomUUID(),
              executionId: runtimeExecutionId, materialVersion: result.body.data.materialVersion, decision: 'accept',
              summary: 'Accepted the sourced company information result after owner review' });
            assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
          }
          // The G23 quality verdict is produced separately from the blind
          // evidence. A fixture verifier must not approve an arbitrary answer.
          if (g23Case) assert.notEqual((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, 'done');
          else assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, 'done');
          const completed = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
          assert.equal(completed.applicationId, null); assert.equal(completed.status, 'completed');
          assert.equal(completed.attempt, 1); assert.equal(completed.verification?.informationRuntime?.ownedJob, true);
          process.stdout.write(`${g23Case ? 'G23' : g22Native ? 'G22' : 'G6'} native Worker/Hermes ${JSON.stringify({ taskId: runtimeTask.id, executionId: runtimeExecutionId,
            acceptanceCommitted: !g23Case, independentReview: g22Native && !g23Case, status: completed.status, ownedJob: true,
            observedBackend: completed.verification?.informationRuntime?.backend ?? null })}\n`);
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
      const { buildCompanyInformationInput } = await import('./lib/agent-host-company-information-runtime.mjs');
      const sealed = buildCompanyInformationInput({ claimed: claimed.body.data, taskContext: fetched.taskContext,
        secrets: [apiKey.body.data.key] });
      const finalInput = JSON.parse(sealed.input);
      assert.deepEqual(finalInput.sources.map(item => item.id), g24cHostInput ? [currentSource.id, siteRecord.id] : [currentSource.id]);
      const selectedSource = finalInput.sources.find(item => item.id === currentSource.id);
      assert.equal(selectedSource.provenance.environment, 'isolated_test');
      assert.equal(selectedSource.provenance.originSource, currentSource.source);
      assert.equal(selectedSource.provenance.recordVerificationState, 'not_started');
      assert.equal(selectedSource.provenance.verificationLevel, 'owner_attested');
      assert.equal(selectedSource.provenance.inclusionReason, 'Explicit source selected for this task');
      assert.equal(sealed.input.includes(unrelatedSource.title), false);
      assert.equal(sealed.input.includes(apiKey.body.data.key), false);
      const sink = spawnSync(process.execPath, ['-e', 'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>process.stdout.write(require("node:crypto").createHash("sha256").update(s).digest("hex")))'],
        { input: sealed.input, encoding: 'utf8', windowsHide: true });
      assert.equal(sink.status, 0, sink.stderr);
      assert.equal(sink.stdout, sealed.inputSeal);
      if (g24cHostInput) {
        assert.equal(finalInput.referenceSiteChecklist.taskId, runtimeTask.id);
        assert.equal(finalInput.referenceSiteChecklist.procedure.id, checklistProcedureId);
        assert.equal(finalInput.referenceSiteChecklist.items[0].source.siteId, siteRecord.id);
        assert.deepEqual(finalInput.contract.access.tools, []);
        assert.deepEqual(finalInput.contract.access.permissions, []);
        process.stdout.write(`G24c native host input ${JSON.stringify({ taskId: runtimeTask.id,
          executionId: runtimeExecutionId, inputSeal: sealed.inputSeal,
          readyRevision: sealed.readyRevision, packetRevision: sealed.packetRevision,
          procedureId: checklistProcedureId, providerInvoked: false })}\n`);
        return;
      }
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
      assert.equal(signedAdmission.payload.inputSeal, sealed.inputSeal);
      if (process.env.ROOST_G11_REVIEW_ACTION) {
        const admittedEvent = await prisma.agentExecutionEvent.findFirstOrThrow({ where: { executionId: runtimeExecutionId, type: 'information_admitted' } });
        // Isolated fixture for the result/review boundary. The separate G6
        // conditional test exercises the actual Worker/Hermes process.
        const invalidReceipt = process.env.ROOST_G11_REVIEW_ACTION === 'tamper';
        const verification = { informationRuntime: { schemaVersion: 'roost-company-information-runtime-verification-v1', executionId: runtimeExecutionId,
          admissionDigest: admittedEvent.payload.admissionDigest, inputSeal: admittedEvent.payload.inputSeal,
          selectionDigest: admittedEvent.payload.selectionDigest,
          ownedJob: true, reviewRequired: true, externalWrites: invalidReceipt, nativeTools: invalidReceipt ? ['terminal'] : [] },
          ownedTreeReceipt: { version: 'roost-windows-job-v2', attempt: runtimeExecutionId, cleanup: true, jobClosed: true, activeProcesses: 0, rootExit: 0 } };
        const completed = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/actions/complete`, worker, { leaseToken: claimed.body.data.leaseToken,
          summary: 'Synthetic sourced information result', finalResponse: 'The selected synthetic source supports the stated preparation status.',
          changedFiles: invalidReceipt ? ['outside-scope.txt'] : [], verification });
        if (invalidReceipt) {
          assert.equal(completed.status, 409, JSON.stringify(completed.body));
          assert.equal(completed.body.error, 'company_information_result_scope_invalid');
          assert.notEqual((await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } })).status, 'completed');
          const refused = await request(`${root}/review`, verifierToken);
          assert.equal(refused.status, 200, JSON.stringify(refused.body));
          assert.equal(refused.body.data.canReview, false);
          assert.equal(await prisma.taskReviewDecision.count({ where: { taskId: runtimeTask.id } }), 0);
          process.stdout.write(`G11 isolated native-proof refusal ${JSON.stringify({ taskId: runtimeTask.id, reviewed: false })}\n`);
          return;
        }
        assert.equal(completed.status, 200, JSON.stringify(completed.body));
        const legacy = await request(`${root}/actions/review-information`, token, { requestId: randomUUID(), executionId: runtimeExecutionId,
          reviewId: randomUUID(), materialVersion: 'a'.repeat(64), decision: 'accept', summary: 'Legacy shortcut attempt' });
        assert.equal(legacy.status, 409); assert.equal(legacy.body.error, 'information_owner_decision_stale');
        const broadWorker = await request(`${root}/actions/review`, worker, { requestId: randomUUID() });
        assert.equal(broadWorker.status, 403);
        const broadView = await request(`${root}/review`, worker);
        assert.equal(broadView.status, 403);
        let reviewGrantId;
        if (agentInformationReview) {
          const ungranted = await request(`${root}/review`, verifierToken);
          assert.equal(ungranted.status, 200, JSON.stringify(ungranted.body));
          assert.equal(ungranted.body.data.canReview, false);
          const catalog = await request(`${root}/capability-grants`, token);
          assert.equal(catalog.status, 200, JSON.stringify(catalog.body));
          assert.equal(catalog.body.data.informationTask, true);
          assert.equal(catalog.body.data.reviewExecutionId, runtimeExecutionId);
          assert.equal(catalog.body.data.options.length, 1, JSON.stringify(catalog.body.data.options));
          const option = catalog.body.data.options[0];
          assert.equal(option.operation, 'review_decision');
          const grant = await request(`${root}/capability-grants`, token, {
            requestId: randomUUID(), expectedVersion: catalog.body.data.expectedVersion,
            credentialId: option.credentialId, operation: option.operation,
            validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 1800000).toISOString(),
            reason: 'Independent review of this exact synthetic information result'
          });
          assert.equal(grant.status, 201, JSON.stringify(grant.body));
          reviewGrantId = grant.body.data.grant.id;
          assert.equal(grant.body.data.grant.applicationId, null);
          assert.equal(grant.body.data.grant.executionId, runtimeExecutionId);
          assert.equal(grant.body.data.grant.status, 'active');
          const statusBeforeForbiddenCompletion = (await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status;
          await assert.rejects(prisma.task.update({ where: { id: runtimeTask.id }, data: { status: 'done' } }),
            /information_owner_decision_required/);
          assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, statusBeforeForbiddenCompletion);
          const foreignTaskReview = await request(`/v1/agent-runtime/tasks/${task.id}/review`, verifierToken);
          assert.equal(foreignTaskReview.status, 403);
        }
        const view = await request(`${root}/review`, verifierToken);
        assert.equal(view.status, 200, JSON.stringify(view.body));
        assert.equal(view.body.data.canReview, true, JSON.stringify({ reason: view.body.data.reason, informationTask: view.body.data.informationTask,
          approvalInformationSeal: Boolean(view.body.data.approvalInformationSeal), blocked: view.body.data.blockedOperations,
          readiness: (await request(`${root}/execution-readiness`, token)).body.data }));
        assert.equal(view.body.data.informationTask, true);
        const baseReview = { requestId: randomUUID(), expectedVersion: view.body.data.expectedVersion, executionId: runtimeExecutionId,
          materialVersion: view.body.data.materialVersion, summary: 'Independent check of the exact selected source',
          evidence: [{ kind: 'test', reference: 'Native source comparison', result: 'Selected synthetic fact matches the reported result', verdict: 'pass' }],
          ...(reviewGrantId ? { grantId: reviewGrantId } : {}) };
        if (['status', 'stale', 'agent-stale'].includes(process.env.ROOST_G11_REVIEW_ACTION)) {
          if (process.env.ROOST_G11_REVIEW_ACTION === 'status') await prisma.task.update({ where: { id: runtimeTask.id }, data: { status: 'done' } });
          else await prisma.companyRecord.update({ where: { id: currentSource.id }, data: { description: 'Changed selected synthetic source after result completion.' } });
          if (agentInformationReview) {
            const staleCatalog = await request(`${root}/capability-grants`, token);
            assert.equal(staleCatalog.status, 200, JSON.stringify(staleCatalog.body));
            assert.equal(staleCatalog.body.data.grants.find(item => item.id === reviewGrantId).status, 'invalidated');
          }
          const changed = await request(`${root}/review`, verifierToken);
          assert.equal(changed.status, 200, JSON.stringify(changed.body));
          assert.equal(changed.body.data.canReview, false);
          const staleDecision = await request(`${root}/actions/review`, verifierToken, { ...baseReview, decision: 'approve', reviewedInformationSeal: view.body.data.approvalInformationSeal });
          assert.equal(staleDecision.status, 409);
          assert.equal(await prisma.taskReviewDecision.count({ where: { taskId: runtimeTask.id } }), 0);
          process.stdout.write(`G11 isolated refusal ${JSON.stringify({ reason: process.env.ROOST_G11_REVIEW_ACTION, taskId: runtimeTask.id,
            reviewed: false, providerInvoked: false })}\n`);
          return;
        }
        const wrongRole = await request(`${root}/actions/review`, token, { ...baseReview, decision: 'approve', reviewedInformationSeal: view.body.data.approvalInformationSeal });
        assert.equal(wrongRole.status, 403); assert.equal(wrongRole.body.error, 'task_review_forbidden');
        const stale = await request(`${root}/actions/review`, verifierToken, { ...baseReview, requestId: randomUUID(), expectedVersion: 'a'.repeat(64),
          decision: 'approve', reviewedInformationSeal: view.body.data.approvalInformationSeal });
        assert.equal(stale.status, 409); assert.equal(stale.body.error, 'task_review_stale');
        const wrongSeal = await request(`${root}/actions/review`, verifierToken, { ...baseReview, requestId: randomUUID(), decision: 'approve',
          reviewedInformationSeal: 'a'.repeat(64) });
        assert.equal(wrongSeal.status, 409); assert.equal(wrongSeal.body.error, 'information_result_seal_required');
        const action = process.env.ROOST_G11_REVIEW_ACTION;
        const decisionBody = ['approve', 'local-approve', 'agent-approve', 'agent-local-approve', 'agent-type-drift'].includes(action) ? { ...baseReview, decision: 'approve', reviewedInformationSeal: view.body.data.approvalInformationSeal }
          : { ...baseReview, decision: 'reject', reproduction: ['Compare result against the exact selected source'], expected: 'Source fully cited',
            observed: 'Citation needs correction', correction: { scope: ['Cite the selected source'], excluded: ['Do not add other company records'],
              outcome: 'Return a sourced summary', competencies: ['javascript'] } };
        const reviewed = await request(`${root}/actions/review`, verifierToken, decisionBody);
        assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
        assert.equal(reviewed.body.data.replayed, false);
        const replay = await request(`${root}/actions/review`, verifierToken, decisionBody);
        if (agentInformationReview) {
          assert.equal(replay.status, 409, JSON.stringify(replay.body));
          assert.equal(await prisma.taskCapabilityUse.count({ where: { grantId: reviewGrantId } }), 1);
        } else {
          assert.equal(replay.status, 200, JSON.stringify(replay.body)); assert.equal(replay.body.data.replayed, true);
        }
        if (action === 'agent-type-drift') {
          const verifierId = contract.taskRoles.verifier.id;
          const changed = await fetch(`${base}/v1/workforce/${verifierId}`, { method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
            body: JSON.stringify({ type: 'human' }), signal: AbortSignal.timeout(30000) });
          assert.equal(changed.status, 200, await changed.text());
          assert.equal((await prisma.workforceEntity.findUniqueOrThrow({ where: { id: verifierId } })).type, 'human');
          await assert.rejects(prisma.task.update({ where: { id: runtimeTask.id }, data: { status: 'done' } }),
            /information_owner_decision_required/);
          assert.notEqual((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, 'done');
          assert.equal(await prisma.informationOwnerDecision.count({ where: { executionId: runtimeExecutionId } }), 0);
          process.stdout.write(`G24c isolated verifier type drift refused ${JSON.stringify({ taskId: runtimeTask.id,
            reviewed: true, ownerAccepted: false, completed: false, providerInvoked: false })}\n`);
          return;
        }
        if (action === 'reject' || action === 'agent-reject') {
          const pendingResult = await request(`${root}/information-result`, token);
          assert.equal(pendingResult.body.data.review?.decision, 'reject');
          const pendingAttention = await request('/v1/dashboard/command', token);
          assert.ok(pendingAttention.body.data.priorityItems.some(item => item.kind === 'result' && item.id === runtimeTask.id));
          const pendingBoard = await request('/v1/operations/work-items?limit=200', token);
          assert.equal(pendingBoard.body.data.workItems.find(item => item.task.id === runtimeTask.id).informationResult.reviewDecision, 'reject');
          const managerView = await request(`${root}/review`, managerToken);
          assert.equal(managerView.status, 200, JSON.stringify(managerView.body));
          assert.equal(managerView.body.data.canManage, true);
          const returned = await request(`${root}/actions/review-return`, managerToken, { requestId: randomUUID(), expectedVersion: managerView.body.data.expectedVersion,
            reviewId: reviewed.body.data.decision.id, action: 'return_to_executor', scope: ['Cite the selected source'] });
          assert.equal(returned.status, 200, JSON.stringify(returned.body));
          assert.equal(returned.body.data.action.action, 'return_to_executor');
        }
        assert.equal(await prisma.taskReviewDecision.count({ where: { taskId: runtimeTask.id } }), 1);
        assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status,
          action === 'local-approve' ? 'done' : action === 'agent-local-approve' ? 'in_progress' : 'todo');
        const resultView = await request(`${root}/information-result`, token);
        const agentApproved = ['agent-approve', 'agent-local-approve'].includes(action);
        assert.equal(resultView.body.data.review?.decision, agentApproved ? 'verified_pending_owner'
          : ['approve', 'local-approve'].includes(action) ? 'accept' : 'return');
        if (agentApproved) {
          assert.equal(resultView.body.data.canOwnerDecide, true);
          assert.equal(resultView.body.data.verifierReview.id, reviewed.body.data.decision.id);
          const ownerDisposition = action === 'agent-approve' ? 'return' : 'accept';
          const ownerBody = { requestId: randomUUID(), executionId: runtimeExecutionId,
            reviewId: reviewed.body.data.decision.id, materialVersion: view.body.data.materialVersion,
            decision: ownerDisposition, summary: `Owner ${ownerDisposition}s the exact independently verified fixture result` };
          const foreignOwner = await request(`${root}/actions/review-information`, memberToken, ownerBody);
          assert.equal(foreignOwner.status, 403);
          const staleOwner = await request(`${root}/actions/review-information`, token,
            { ...ownerBody, requestId: randomUUID(), materialVersion: 'a'.repeat(64) });
          assert.equal(staleOwner.status, 409);
          const accepted = await request(`${root}/actions/review-information`, token, ownerBody);
          assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
          assert.equal(accepted.body.data.ownerDecision.decision, ownerDisposition);
          const ownerReplay = await request(`${root}/actions/review-information`, token, ownerBody);
          assert.equal(ownerReplay.status, 200); assert.equal(ownerReplay.body.data.replayed, true);
          assert.equal(await prisma.informationOwnerDecision.count({ where: { executionId: runtimeExecutionId } }), 1);
          assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status,
            action === 'agent-local-approve' ? 'done' : 'todo');
          const finalResult = await request(`${root}/information-result`, token);
          assert.equal(finalResult.body.data.review.decision, ownerDisposition);
          assert.equal(finalResult.body.data.canOwnerDecide, false);
          if (ownerDisposition === 'return') {
            const returnedTask = await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } });
            assert.equal(returnedTask.executionReadiness.status, 'needs_revalidation');
            assert.equal(returnedTask.executionReadiness.reason, 'owner_returned');
          }
        }
        const operations = await request('/v1/operations/work-items?limit=200', token);
        assert.equal(operations.status, 200);
        assert.equal(operations.body.data.workItems.find(item => item.task.id === runtimeTask.id).informationResult.reviewDecision,
          ['approve', 'local-approve', 'agent-local-approve'].includes(action) ? 'accept' : 'return');
        process.stdout.write(`G11 isolated review ${JSON.stringify({ action, taskId: runtimeTask.id, executionId: runtimeExecutionId,
          reviewed: true, returned: ['reject', 'agent-reject'].includes(action), providerInvoked: false })}\n`);
        return;
      }
      // The read-only projection reflects a real admitted row. Native SQL
      // correctly refuses a fabricated completed result without a Worker job.
      const board = await request('/v1/operations/work-items?limit=200', token);
      assert.equal(board.status, 200, JSON.stringify(board.body));
      const boardTask = board.body.data.workItems.find(item => item.task.id === runtimeTask.id);
      assert.equal(boardTask.task.status, 'todo');
      assert.equal(boardTask.informationResult.executionStatus, 'running');
      assert.equal(boardTask.informationResult.reviewDecision, null);
      const failedAttempt = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/actions/fail`, worker, {
        leaseToken: claimed.body.data.leaseToken, code: 'synthetic_provider_unavailable',
        message: 'Synthetic terminal failure before any provider request', retryable: true, details: {} });
      assert.equal(failedAttempt.status, 200, JSON.stringify(failedAttempt.body));
      const stoppedContinuation = await request(`${root}/execution-continuation`, token);
      assert.equal(stoppedContinuation.status, 200);
      assert.equal(stoppedContinuation.body.data.previousExecution.id, runtimeExecutionId);
      assert.equal(stoppedContinuation.body.data.eligible, false);
      assert.equal(stoppedContinuation.body.data.reason, 'execution_continuation_ready_stale');
      assert.equal(stoppedContinuation.body.data.previousExecution.usage.inputTokens, null);
      assert.equal(stoppedContinuation.body.data.previousExecution.usage.cost, null);
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      let repeatedStart;
      try { repeatedStart = await request(`${root}/actions/start-information`, token, { requestId: randomUUID() }); }
      finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      assert.equal(repeatedStart.status, 409);
      assert.equal(repeatedStart.body.error, 'execution_continuation_required');
      process.env.ROOST_CODEX_EXECUTION_ENABLED = 'true';
      let forbiddenRetry;
      try { forbiddenRetry = await request(`/v1/agent-runtime/executions/${runtimeExecutionId}/actions/retry`, memberToken, {}); }
      finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
      assert.equal(forbiddenRetry.status, 409);
      assert.equal(forbiddenRetry.body.error, 'company_information_owner_decision_required');
      assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 1);
      const failedResult = await request(`${root}/information-result`, token);
      assert.equal(failedResult.body.data.status, 'failed');
      assert.equal(failedResult.body.data.canReview, false);
      assert.ok(failedResult.body.data.execution.events.some(event => event.type === 'failed'));
      const resultAttention = await request('/v1/dashboard/command', token);
      assert.equal(resultAttention.status, 200, JSON.stringify(resultAttention.body));
      assert.ok(resultAttention.body.data.priorityItems.some(item => item.kind === 'result' && item.id === runtimeTask.id
        && item.status === 'failed' && item.target === `/areas?area=04-operacje&view=tasks&taskId=${runtimeTask.id}&from=attention`));
      assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } })).status, 'todo');
      const failedBoard = await request('/v1/operations/work-items?limit=200', token);
      const failedBoardTask = failedBoard.body.data.workItems.find(item => item.task.id === runtimeTask.id);
      assert.equal(failedBoardTask.informationResult.executionStatus, 'failed');
      process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
      try {
        const recoveryCandidate = await request(`${root}/information-approval-candidate`, token);
        assert.equal(recoveryCandidate.status, 200, JSON.stringify(recoveryCandidate.body));
        assert.equal(recoveryCandidate.body.data.previousDecision?.id, decisionId);
      } finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
      if (process.env.ROOST_G6_CONSOLE_RECOVERY_DIR) {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const directory = process.env.ROOST_G6_CONSOLE_RECOVERY_DIR;
        process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
        process.env.ROOST_CODEX_EXECUTION_ENABLED = 'true';
        await fs.writeFile(path.join(directory, 'ready.json'), JSON.stringify({ base, taskId: runtimeTask.id,
          failedExecutionId: runtimeExecutionId, priorDecisionId: decisionId }) + '\n');
        const resume = path.join(directory, 'resume');
        const deadline = Date.now() + 12 * 60_000;
        while (Date.now() < deadline && !await fs.stat(resume).then(() => true, () => false))
          await new Promise(resolve => setTimeout(resolve, 500));
        assert.ok(await fs.stat(resume).then(() => true, () => false), 'console recovery did not reach the verification checkpoint');
        const successor = await prisma.decision.findFirst({ where: { workspaceId, supersedesId: decisionId, status: 'accepted' },
          orderBy: { createdAt: 'desc' } });
        assert.ok(successor, 'owner console did not accept a successor Decision');
        const renewed = await request(`${root}/execution-readiness`, token);
        assert.equal(renewed.status, 200, JSON.stringify(renewed.body));
        assert.equal(renewed.body.data.status, 'ready', JSON.stringify(renewed.body));
        assert.equal(renewed.body.data.modelExecutionQualified, true);
        const seals = await prisma.$queryRawUnsafe(`SELECT task_risk_current('${runtimeTask.id}'::uuid) AS risk, task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`);
        assert.ok(seals[0].risk && seals[0].seal, 'renewed risk and admission must be current');
        const finalTask = await prisma.task.findUniqueOrThrow({ where: { id: runtimeTask.id } });
        assert.equal(finalTask.source, 'clickup'); assert.equal(finalTask.status, 'todo');
        assert.equal(finalTask.externalId, 'synthetic-company-information-task');
        assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 1,
          'console proof must stop before another model attempt');
        const failed = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
        assert.equal(failed.status, 'failed'); assert.equal(failed.finalResponse, null);
        process.stdout.write(`G6 console-only recovery ${JSON.stringify({ taskId: runtimeTask.id,
          priorDecisionId: decisionId, successorDecisionId: successor.id, failedExecutionId: runtimeExecutionId,
          ready: true, sourceTaskStatus: finalTask.status, providerInvoked: false, newExecutionCount: 0 })}\n`);
        delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED;
        delete process.env.ROOST_CODEX_EXECUTION_ENABLED;
        return;
      }
      if (process.env.ROOST_G12_CONTINUATION === '1') {
        // No provider runs in this mode. The failed, claimed attempt above is
        // retained while owner authority is rebuilt around a changed plan.
        const revised = structuredClone(runtimeContract);
        revised.objective.outcome = 'Diagnose the unavailable provider and return only a sourced preparation summary after a new admission';
        revised.singleTask.problems[0].outcome = revised.objective.outcome;
        revised.acceptance.criteria = ['Use the selected current source and explicitly report the provider limitation'];
        revised.budgets.maxDurationSeconds = 360;
        const revisedScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(),
          expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion,
          scopeKind: 'company_information', applicationId: null, contract: revised,
          prompt: 'Use only the selected current source and cite its revision.', baseBranch: null, releaseSet: null });
        assert.equal(revisedScope.status, 200, JSON.stringify(revisedScope.body));
        const revisedAssessment = await request(`${root}/risk/assessments`, token, { ...assessmentBody,
          requestId: randomUUID(), expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion });
        assert.equal(revisedAssessment.status, 200, JSON.stringify(revisedAssessment.body));
        process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
        let nextCandidate;
        try { nextCandidate = await request(`${root}/information-approval-candidate`, token); }
        finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
        assert.equal(nextCandidate.status, 200, JSON.stringify(nextCandidate.body));
        assert.equal(nextCandidate.body.data.previousDecision?.id, decisionId);
        assert.equal(nextCandidate.body.data.maxDurationSeconds, 360);
        const nextDecisionText = 'Run one revised tool-free informational task after failed attempt';
        const governance = await request('/v1/decisions/governance', token);
        const nextProposal = await request('/v1/decisions/governance/proposals', token, { requestId: randomUUID(),
          expectedVersion: governance.body.data.expectedVersion, title: 'Revised company information runtime',
          context: 'Prior attempt ended before any provider request', decision: nextDecisionText,
          rationale: 'Independent diagnosis changed the task plan and set a fresh one-attempt budget',
          consequences: 'One bounded continuation after owner approval; no repository or native tools',
          scopeReason: 'Only this informational Task', scope: [{ type: 'task', id: runtimeTask.id }],
          supersedesId: decisionId, conflicts: [{ kind: 'replaces', oldProvision: 'Run one tool-free informational task',
            newProvision: nextDecisionText, explanation: 'The first attempt failed and requires revised authority' }],
          managedRuntimeApproval: nextCandidate.body.data.approval });
        assert.equal(nextProposal.status, 201, JSON.stringify(nextProposal.body));
        const nextDecisionId = nextProposal.body.data.record.id;
        const nextAdmissionRoot = `${root}/risk-admission`;
        let nextAdmission = await request(nextAdmissionRoot, token);
        const nextAdmissionScope = await request(`${nextAdmissionRoot}/scope`, token, { ...scopeBody,
          requestId: randomUUID(), expectedVersion: nextAdmission.body.data.expectedVersion,
          operations: ['decision_supersede', 'runtime_execute'] });
        assert.equal(nextAdmissionScope.status, 200, JSON.stringify(nextAdmissionScope.body));
        let nextDecision = await request(`/v1/decisions/${nextDecisionId}/governance`, token);
        const nextImpact = await request(`/v1/decisions/${nextDecisionId}/governance/actions`, token, {
          requestId: randomUUID(), expectedVersion: nextDecision.body.data.expectedVersion, action: 'review_impact' });
        assert.equal(nextImpact.status, 201, JSON.stringify(nextImpact.body));
        nextAdmission = await request(nextAdmissionRoot, token);
        const nextEvidence = await request(`${nextAdmissionRoot}/evidence`, token, { requestId: randomUUID(),
          expectedVersion: nextAdmission.body.data.expectedVersion, operation: 'decision_supersede', gate: 'procedure',
          verdict: 'passed', evidence, rationale: 'Changed plan and fresh budget checked against selected source',
          validation: 'Compared prior failure with revised one-attempt scope', observedResult: 'Narrow continuation supported' });
        assert.equal(nextEvidence.status, 200, JSON.stringify(nextEvidence.body));
        nextDecision = await request(`/v1/decisions/${nextDecisionId}/governance`, token);
        const nextAccepted = await request(`/v1/decisions/${nextDecisionId}/governance/actions`, token, {
          requestId: randomUUID(), expectedVersion: nextDecision.body.data.expectedVersion, action: 'accept',
          previewId: nextDecision.body.data.previews[0].id });
        assert.equal(nextAccepted.status, 201, JSON.stringify(nextAccepted.body));
        const acceptedNextDecision = await prisma.decision.findUniqueOrThrow({ where: { id: nextDecisionId } });
        assert.equal(acceptedNextDecision.status, 'accepted');
        assert.equal((await approveTaskSource('decision', acceptedNextDecision, runtimeTask.id, token)).status, 201);
        revised.decisions = { items: [ref(acceptedNextDecision)], noneReason: null };
        const finalScope = await request(`${root}/risk/scope`, token, { requestId: randomUUID(),
          expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion,
          scopeKind: 'company_information', applicationId: null, contract: revised,
          prompt: null, baseBranch: null, releaseSet: null });
        assert.equal(finalScope.status, 200, JSON.stringify(finalScope.body));
        const finalAssessment = await request(`${root}/risk/assessments`, token, { ...assessmentBody,
          requestId: randomUUID(), expectedVersion: (await request(`${root}/risk`, token)).body.data.expectedVersion });
        assert.equal(finalAssessment.status, 200, JSON.stringify(finalAssessment.body));
        nextAdmission = await request(nextAdmissionRoot, token);
        const finalAdmissionScope = await request(`${nextAdmissionRoot}/scope`, token, { ...scopeBody,
          requestId: randomUUID(), expectedVersion: nextAdmission.body.data.expectedVersion,
          operations: ['runtime_execute'] });
        assert.equal(finalAdmissionScope.status, 200, JSON.stringify(finalAdmissionScope.body));
        nextAdmission = await request(nextAdmissionRoot, token);
        const finalEvidence = await request(`${nextAdmissionRoot}/evidence`, token, { requestId: randomUUID(),
          expectedVersion: nextAdmission.body.data.expectedVersion, operation: 'runtime_execute', gate: 'procedure',
          verdict: 'passed', evidence, rationale: 'Exact revised task and selected source checked',
          validation: 'Fresh bounded continuation requires separate owner event', observedResult: 'Runtime scope supported' });
        assert.equal(finalEvidence.status, 200, JSON.stringify(finalEvidence.body));
        const readiness = await request(`${root}/execution-readiness?version=1&executionClass=roost-company-information-runtime-v1`, token);
        const nextReady = await request(`${root}/actions/submit-for-execution`, token, { requestId: randomUUID(),
          expectedVersion: readiness.body.data.submissionVersion, applicationId: null, contract: revised });
        assert.equal(nextReady.status, 200, JSON.stringify(nextReady.body));
        assert.notEqual(nextReady.body.data.readiness.pinId, persisted.metadata.readyContextPin.pinId);
        const continuationView = await request(`${root}/execution-continuation`, token);
        assert.equal(continuationView.status, 200, JSON.stringify(continuationView.body));
        assert.equal(continuationView.body.data.previousExecution.id, runtimeExecutionId);
        assert.equal(continuationView.body.data.eligible, true, JSON.stringify(continuationView.body));
        assert.equal(continuationView.body.data.continuation, null);
        const continuationBody = { requestId: randomUUID(), previousExecutionId: runtimeExecutionId,
          previousMaterialDigest: continuationView.body.data.previousExecution.materialDigest,
          readyPinId: continuationView.body.data.readyPinId, readyRevision: continuationView.body.data.readyRevision,
          diagnosis: 'The previous attempt ended before a provider request; its plan did not handle the unavailable provider.',
          changedPlan: 'Require an explicit provider limitation and sourced summary within the revised one-attempt budget.' };
        const approved = await request(`${root}/execution-continuation`, token, continuationBody);
        assert.equal(approved.status, 201, JSON.stringify(approved.body));
        const approvalEventId = approved.body.data.continuation.eventId;
        const event = await prisma.event.findUniqueOrThrow({ where: { id: approvalEventId } });
        assert.equal(event.type, 'task_execution_continuation_approved');
        assert.equal(event.resourceId, runtimeExecutionId);
        assert.equal(event.actorType, 'user');
        assert.equal(event.payload.previousMaterialDigest, continuationBody.previousMaterialDigest);
        assert.equal(event.payload.readyPinId, continuationBody.readyPinId);
        const confirmed = await request(`${root}/execution-continuation`, token);
        assert.equal(confirmed.body.data.continuation.eventId, approvalEventId);
        process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED = 'true';
        let nextStart;
        try { nextStart = await request(`${root}/actions/start-information`, token, { requestId: randomUUID() }); }
        finally { delete process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED; }
        assert.equal(nextStart.status, 201, JSON.stringify(nextStart.body));
        const newExecution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: nextStart.body.data.execution.id } });
        assert.notEqual(newExecution.id, runtimeExecutionId);
        assert.equal(newExecution.status, 'queued'); assert.equal(newExecution.attempt, 0);
        assert.equal(newExecution.metadata.readyContextPin.continuationEventId, approvalEventId);
        assert.equal(newExecution.metadata.readyContextPin.runtimeDecisionId, nextDecisionId);
        assert.equal(newExecution.metadata.executionContract.budgets.maxAttempts, 1);
        assert.equal(newExecution.metadata.executionContract.budgets.maxDurationSeconds, 360);
        assert.equal(await prisma.agentExecution.count({ where: { taskId: runtimeTask.id } }), 2);
        const original = await prisma.agentExecution.findUniqueOrThrow({ where: { id: runtimeExecutionId } });
        assert.equal(original.status, 'failed'); assert.equal(original.finalResponse, null);
        process.stdout.write(`G12 company continuation ${JSON.stringify({ previousExecutionId: runtimeExecutionId,
          newExecutionId: newExecution.id, approvalEventId, newDecisionId: nextDecisionId,
          newBudgetSeconds: 360, providerInvoked: false })}\n`);
        return;
      }
      await prisma.companyRecord.update({ where: { id: currentSource.id }, data: { description: 'Synthetic source changed after claim.' } });
      assert.equal((await prisma.$queryRawUnsafe(`SELECT task_risk_current('${runtimeTask.id}'::uuid) AS risk, task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].risk, null);
      assert.equal((await prisma.$queryRawUnsafe(`SELECT task_admission_seal('${runtimeTask.id}'::uuid,'runtime_execute') AS seal`))[0].seal, null);
      const invalidated = await request(`${root}/execution-readiness`, token);
      assert.notEqual(invalidated.body.data.status, 'ready');
      process.stdout.write(`G6 native risk/admission ${JSON.stringify({ taskId: runtimeTask.id, decisionId, executionId: runtimeExecutionId, hostId: host.id, acceptanceCommitted: true, ready: true, claimed: true, providerInvoked: false, providerTaskStatus: 'todo' })}\n`);
    });
  } finally {
    if (priorReferenceUrls === undefined) delete process.env.ROOST_REFERENCE_SITE_URLS;
    else process.env.ROOST_REFERENCE_SITE_URLS = priorReferenceUrls;
    await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
  }
});
