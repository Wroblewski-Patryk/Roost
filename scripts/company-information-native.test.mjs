import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { companyInformationFixture } from './fixtures/company-information.mjs';

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1'); assert.match(url.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.COMPANYCORE_SKIP_DOTENV, '1');
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { prisma } = require('../dist/db/prisma.js');

test('native G6a: HTTP Ready -> real queue -> native Worker validation with SQL authority fences', { timeout: 150000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, token, body) {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
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
      contract = companyInformationFixture().packet.contract;
      contract.objective.goalId = goal.id; contract.assignment.agentId = agent.id;
      contract.singleTask.contractId = `roost-task:${task.id}`; contract.singleTask.accountableManager = ref(manager);
      contract.context.company = [ref(source)];
      const editor = await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&executionClass=roost-company-information-v1`, token);
      assert.equal(editor.status, 200); assert.equal(editor.body.data.editor.applicationId, null); assert.equal(editor.body.data.preparationEnabled, true);
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
  } finally { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
