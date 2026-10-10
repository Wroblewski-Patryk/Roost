import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.match(url.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.NODE_ENV, 'test');
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { prisma } = require('../dist/db/prisma.js');

test('G9a native HTTP and global MCP enforce task-bound CompanyRecord reads', { timeout: 120000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, credential, body) => {
    const headers = { 'Content-Type': 'application/json', ...(credential?.startsWith('cc_') ? { 'X-API-Key': credential } : credential ? { Authorization: `Bearer ${credential}` } : {}) };
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json() };
  };
  const approve = (record, taskId, token, action = 'approve') => request(`/v1/company-records/${record.id}/context-reviews`, token, {
    requestId: randomUUID(), taskId, expectedRevision: record.updatedAt.toISOString(), action,
    classification: 'fact', provenance: 'Native fixture owner review', environment: 'isolated_test',
    verificationMethod: 'Fixture inspection', verificationRef: 'g9a-disposable-database',
    inclusionReason: 'Explicitly selected for this one task', validUntil: new Date(Date.now() + 86400000).toISOString()
  });
  const mcpSmoke = async (key, taskId) => {
    const child = spawn(process.execPath, ['scripts/companycore-mcp-smoke.mjs'], {
      env: { ...process.env, COMPANYCORE_BASE_URL: base, COMPANYCORE_API_KEY: key,
        COMPANYCORE_MCP_SMOKE_TOOL: 'companycore_get_agent_runtime_tasks_by_id_company_sources',
        COMPANYCORE_MCP_SMOKE_ARGUMENTS: JSON.stringify({ id: taskId }), COMPANYCORE_MCP_SMOKE_EXPECT_STATUS: '200' },
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '', error = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { error += chunk; });
    const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
    assert.equal(code, 0, error);
    return JSON.parse(output);
  };

  try {
    const registered = await request('/auth/register', null, { email: 'owner@g9a.example.test', password: 'synthetic-test-password-only', name: 'Synthetic owner', workspaceName: 'Synthetic G9a' });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const owner = registered.body.data.token, workspaceId = registered.body.data.workspace.id;
    const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Source reader', slug: 'g9a-source-reader', type: 'agent', role: 'reader', authorityScope: [] } });
    const otherAgent = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Other reader', slug: 'g9a-other-reader', type: 'agent', role: 'reader', authorityScope: [] } });
    const task = await prisma.task.create({ data: { workspaceId, title: 'Read reviewed sources', assignedWorkforceEntityId: agent.id } });
    const otherTask = await prisma.task.create({ data: { workspaceId, title: 'Other agent task', assignedWorkforceEntityId: otherAgent.id } });
    const approved = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'approved', title: 'Approved source', description: 'Current approved facts', currentState: 'Not reviewed field', rationale: 'Private draft rationale', metadata: { sourceKind: 'owner_note', sourceId: 'approved-source' } } });
    const stale = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'stale', title: 'Stale source', description: 'Old version' } });
    const withdrawn = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'withdrawn', title: 'Withdrawn source' } });
    const unreviewed = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'unreviewed', title: 'Unreviewed source' } });
    const foreign = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'foreign', title: 'Foreign task source' } });
    const synthetic = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'synthetic', title: 'Synthetic source', source: 'synthetic_fixture' } });
    const nestedMetadata = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'nested-metadata', title: 'Nested metadata source', metadata: { sourceKind: { kind: 'synthetic_fixture', body: 'Unapproved body' } } } });
    await prisma.dependency.create({ data: { workspaceId, dependencyType: 'requires', fromEntityType: 'task', fromEntityId: task.id, toEntityType: 'company_record', toEntityId: approved.id } });
    await prisma.evidenceRecord.create({ data: { workspaceId, entityType: 'company_record', entityId: approved.id, type: 'documentation', reference: 'Unreviewed linked evidence body' } });
    for (const source of [approved, stale, withdrawn]) assert.equal((await approve(source, task.id, owner)).status, 201);
    assert.equal((await approve(foreign, otherTask.id, owner)).status, 201);
    assert.equal((await approve(synthetic, task.id, owner)).status, 400);
    assert.equal((await approve(nestedMetadata, task.id, owner)).status, 400);
    assert.equal((await approve(withdrawn, task.id, owner, 'withdraw')).status, 201);
    await prisma.companyRecord.update({ where: { id: stale.id }, data: { description: 'Changed after review' } });

    const credential = await request('/v1/api-keys/agent-credentials', owner, {
      requestId: randomUUID(), agentId: agent.id, name: 'G9a bound reader', expiresAt: new Date(Date.now() + 86400000).toISOString()
    });
    assert.equal(credential.status, 201, JSON.stringify(credential.body));
    const agentKey = credential.body.data.key;
    const general = await request('/v1/api-keys', owner, { name: 'G9a general MCP', profileId: 'mcp_codex_worker' });
    assert.equal(general.status, 201, JSON.stringify(general.body));
    const generalKey = general.body.data.key;

    await t.test('approved projection, direct ID and task/record negatives', async () => {
      const list = await request(`/v1/agent-runtime/tasks/${task.id}/company-sources`, agentKey);
      assert.equal(list.status, 200, JSON.stringify(list.body));
      assert.deepEqual(list.body.data.sources.map(item => item.content.id), [approved.id]);
      const source = list.body.data.sources[0];
      assert.equal(source.content.description, 'Current approved facts');
      assert.equal(source.provenance.reviewId.length, 36);
      assert.equal('currentState' in source.content, false);
      assert.equal('rationale' in source.content, false);
      assert.equal('metadata' in source.content, false);
      assert.equal('priority' in source.content, false);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/company-sources/${approved.id}`, agentKey)).status, 200);
      for (const record of [stale, withdrawn, unreviewed, foreign, synthetic, nestedMetadata])
        assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/company-sources/${record.id}`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${otherTask.id}/company-sources`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/company-sources`, generalKey)).status, 403);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/company-sources`, owner)).status, 403);
      const search = await request(`/v1/agent-runtime/tasks/${task.id}/company-sources?q=Unreviewed`, agentKey);
      assert.equal(search.status, 200);
      assert.deepEqual(search.body.data.sources, []);
    });

    await t.test('Worker task context uses the approved projection and omits record evidence', async () => {
      const { loadTaskAgentContext } = require('../dist/modules/company-intelligence/task-agent-context.js');
      const context = await loadTaskAgentContext(workspaceId, task.id, {
        id: randomUUID(), workspaceId, taskId: task.id, applicationId: null,
        metadata: { executionContract: { context: { company: [{ id: approved.id }] } } }
      });
      assert.deepEqual(context.relatedRecords.map(record => record.id), [approved.id]);
      assert.equal('rationale' in context.relatedRecords[0], false);
      assert.equal('currentState' in context.relatedRecords[0], false);
      assert.equal('rationale' in context.intent.businessContext[0], false);
      assert.deepEqual(context.verification.acceptanceCriteria, []);
      assert.deepEqual(context.evidence, []);
    });

    await t.test('old CompanyRecord-bearing API paths refuse general and bound agent keys, owner view remains', async () => {
      const paths = [
        '/v1/company-records', '/company-records', '/v1/Company-Records', `/v1/company-records/${approved.id}`, '/v1/company-intelligence/search?q=Approved',
        '/v1/company-intelligence/graph', `/v1/company-intelligence/entities/company_record/${approved.id}`,
        `/v1/company-intelligence/tasks/${task.id}/agent-context`, '/v1/entity-relations',
        `/v1/agent-runtime/tasks/${task.id}/interviews`, `/v1/agent-runtime/tasks/${task.id}/execution-readiness`,
        '/v1/agent-runtime/executions', '/v1/decisions/governance', `/v1/decisions/${approved.id}/governance`, '/v1/events', '/v1/dashboard/attention', '/v1/dashboard/command'
      ];
      for (const path of paths) {
        assert.equal((await request(path, generalKey)).status, 403, path);
        assert.equal((await request(path, agentKey)).status, 403, path);
      }
      const ownerRead = await request(`/v1/company-records/${approved.id}`, owner);
      assert.equal(ownerRead.status, 200);
      assert.equal(ownerRead.body.data.currentState, 'Not reviewed field');
      const tasks = await request(`/v1/tasks/${task.id}`, agentKey);
      assert.equal(tasks.status, 200);
      assert.deepEqual(Object.keys(tasks.body.data.executionReadiness), ['status']);
    });

    await t.test('real global MCP tool reads only the approved task projection', async () => {
      const smoke = await mcpSmoke(agentKey, task.id);
      assert.equal(smoke.callStatus, 200);
      assert.equal(smoke.calledTool, 'companycore_get_agent_runtime_tasks_by_id_company_sources');
    });

    await t.test('application-linked source is reviewed for its exact task, and owner audit retains decision history', async () => {
      const project = await prisma.project.create({ data: { workspaceId, name: 'Synthetic application project' } });
      const application = await prisma.application.create({ data: { workspaceId, name: 'Synthetic application', slug: 'synthetic-app' } });
      await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
      const appTask = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: 'Read app source', assignedWorkforceEntityId: agent.id } });
      const appSource = await prisma.companyRecord.create({ data: { workspaceId, applicationId: application.id, recordType: 'architecture_document', key: 'app-source', title: 'Approved app source', metadata: { sourceKind: 'owner_note', filePath: 'synthetic.md' } } });
      await prisma.companyRecord.create({ data: { workspaceId, applicationId: application.id, recordType: 'architecture_document', key: 'app-unreviewed', title: 'Unreviewed app source' } });
      assert.equal((await approve(appSource, task.id, owner)).status, 400);
      assert.equal((await approve(appSource, appTask.id, owner)).status, 201);
      const appRead = await request(`/v1/agent-runtime/tasks/${appTask.id}/company-sources/${appSource.id}`, agentKey);
      assert.equal(appRead.status, 200, JSON.stringify(appRead.body));
      assert.equal(appRead.body.data.content.applicationId, application.id);
      for (const path of [
        `/v1/projects/${project.id}/workspace`, `/v1/product-engineering/applications/${application.id}/graph`,
        `/v1/product-engineering/applications/${application.id}/agent-context`,
        `/v1/product-engineering/applications/${application.id}/findings/catalog`,
        `/v1/organizational-context/company_record/${appSource.id}`
      ]) assert.equal((await request(path, generalKey)).status, 403, path);
      assert.equal((await request(`/v1/projects/${project.id}/workspace`, owner)).status, 200);
      const { loadApplicationAgentContext } = require('../dist/modules/product-engineering/application-agent-context.js');
      const appContext = await loadApplicationAgentContext(workspaceId, application.id, true, '', prisma, undefined, appTask.id);
      assert.deepEqual(appContext.companyRecords.map(record => record.id), [appSource.id]);
      assert.equal('key' in appContext.companyRecords[0], false);
      assert.equal('metadata' in appContext.companyRecords[0], false);
      assert.deepEqual(appContext.documentationIndex.map(record => record.id), [appSource.id]);
      const audit = await request(`/v1/company-records/${withdrawn.id}/source-audit`, owner);
      assert.equal(audit.status, 200);
      assert.equal(audit.body.data.currentRecord.id, withdrawn.id);
      assert.deepEqual(audit.body.data.reviews.map(row => row.action), ['withdraw', 'approve']);
      assert.equal(audit.body.data.priorBodiesAvailable, false);
      const firstPage = await request(`/v1/company-records/${withdrawn.id}/source-audit?limit=1`, owner);
      assert.deepEqual(firstPage.body.data.reviews.map(row => row.action), ['withdraw']);
      assert.equal(firstPage.body.data.reviewHistoryTruncated, true);
      const secondPage = await request(`/v1/company-records/${withdrawn.id}/source-audit?limit=1&beforeOrdinal=${firstPage.body.data.nextBeforeOrdinal}`, owner);
      assert.deepEqual(secondPage.body.data.reviews.map(row => row.action), ['approve']);
      assert.equal(secondPage.body.data.nextBeforeOrdinal, null);
      assert.equal((await request(`/v1/company-records/${withdrawn.id}/source-audit`, generalKey)).status, 403);
    });
    process.stdout.write('G9a native source read: task-bound HTTP and global MCP positive/negative assertions passed\n');
  } finally {
    await prisma.$disconnect();
    await new Promise(resolve => server.close(resolve));
  }
});
