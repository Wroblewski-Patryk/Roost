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

test('G9 task source authority, prospective history and ordinary MCP boundary', { timeout: 120000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, credential, body) => {
    const headers = { 'Content-Type': 'application/json', ...(credential?.startsWith('cc_')
      ? { 'X-API-Key': credential } : credential ? { Authorization: `Bearer ${credential}` } : {}) };
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json() };
  };
  const command = async (method, path, credential, body = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(credential?.startsWith('cc_')
      ? { 'X-API-Key': credential } : credential ? { Authorization: `Bearer ${credential}` } : {}) };
    const response = await fetch(base + path, { method, headers, ...(method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json() };
  };
  const mcpSmoke = async (key, taskId) => {
    const child = spawn(process.execPath, ['scripts/companycore-mcp-smoke.mjs'], {
      env: { ...process.env, COMPANYCORE_BASE_URL: base, COMPANYCORE_API_KEY: key,
        COMPANYCORE_MCP_SMOKE_TOOL: 'companycore_get_agent_runtime_tasks_by_id_sources',
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
    const registered = await request('/auth/register', null, { email: 'owner@g9.test', password: 'synthetic-test-password-only',
      name: 'Synthetic owner', workspaceName: 'Synthetic G9' });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const owner = registered.body.data.token, workspaceId = registered.body.data.workspace.id;
    const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Source reader', slug: 'g9-reader',
      type: 'agent', role: 'reader', authorityScope: [] } });
    const other = await prisma.workforceEntity.create({ data: { workspaceId, name: 'Other agent', slug: 'g9-other',
      type: 'agent', role: 'reader', authorityScope: [] } });
    const task = await prisma.task.create({ data: { workspaceId, title: 'Read approved sources', assignedWorkforceEntityId: agent.id } });
    const otherTask = await prisma.task.create({ data: { workspaceId, title: 'Foreign task secret', assignedWorkforceEntityId: other.id } });
    const procedure = await prisma.procedure.create({ data: { workspaceId, name: 'Approved procedure', purpose: 'Accepted purpose',
      status: 'active', steps: { create: [{ stepOrder: 1, instruction: 'Approved instruction' }] } }, include: { steps: true } });
    const unreviewedProcedure = await prisma.procedure.create({ data: { workspaceId, name: 'Unreviewed procedure',
      purpose: 'Unreviewed instruction', status: 'active' } });
    const evidence = await prisma.evidenceRecord.create({ data: { workspaceId, entityType: 'task', entityId: task.id,
      type: 'documentation', reference: 'Verified task evidence', verificationStatus: 'verified' } });
    const unverified = await prisma.evidenceRecord.create({ data: { workspaceId, entityType: 'task', entityId: task.id,
      type: 'documentation', reference: 'Unverified task evidence' } });
    const note = await prisma.note.create({ data: { workspaceId, taskId: task.id, content: 'Approved note body' } });
    const foreignNote = await prisma.note.create({ data: { workspaceId, taskId: otherTask.id, content: 'Foreign note body' } });
    const policy = await prisma.policy.create({ data: { workspaceId, name: 'Approved policy', appliesTo: 'task', ruleType: 'guidance' } });
    const review = (sourceType, row, action = 'approve', taskId = task.id) => request('/v1/agent-runtime/source-reviews', owner, {
      requestId: randomUUID(), taskId, sourceType, sourceId: row.id, expectedRevision: row.updatedAt.toISOString(),
      action, classification: 'fact', provenance: 'Native owner inspection', environment: 'isolated_test',
      verificationMethod: 'Native fixture inspection', verificationRef: 'g9-disposable-database',
      inclusionReason: 'Explicitly selected for one task', validUntil: new Date(Date.now() + 86400000).toISOString()
    });
    for (const [type, row] of [['procedure', procedure], ['evidence', evidence], ['note', note], ['policy', policy]])
      assert.equal((await review(type, row)).status, 201, type);
    assert.equal((await review('evidence', unverified)).status, 400);
    assert.equal((await review('note', foreignNote)).status, 400);
    const credential = await request('/v1/api-keys/agent-credentials', owner, { requestId: randomUUID(), agentId: agent.id,
      name: 'G9 bound reader', expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(credential.status, 201, JSON.stringify(credential.body));
    const agentKey = credential.body.data.key;
    const general = await request('/v1/api-keys', owner, { name: 'G9 unbound MCP', profileId: 'mcp_codex_worker' });
    assert.equal(general.status, 201, JSON.stringify(general.body));
    const generalKey = general.body.data.key;

    await t.test('bound list, direct ID, foreign task, unverified and unbound negatives', async () => {
      const list = await request(`/v1/agent-runtime/tasks/${task.id}/sources`, agentKey);
      assert.equal(list.status, 200, JSON.stringify(list.body));
      assert.deepEqual(new Set(list.body.data.sources.map(row => row.content.sourceType)),
        new Set(['procedure', 'evidence', 'note', 'policy']));
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources/procedure/${procedure.id}`, agentKey)).status, 200);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources/procedure/${unreviewedProcedure.id}`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources/evidence/${unverified.id}`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${otherTask.id}/sources`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources`, generalKey)).status, 403);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources`, owner)).status, 403);
      assert.deepEqual((await request('/v1/tasks', agentKey)).body.data.map(row => row.id), [task.id]);
      assert.equal((await request(`/v1/tasks/${otherTask.id}`, agentKey)).status, 404);
      assert.equal((await request(`/v1/agent-runtime/tasks/${otherTask.id}/review`, agentKey)).status, 403);
      const search = await request(`/v1/agent-runtime/tasks/${task.id}/sources?q=Unreviewed`, agentKey);
      assert.deepEqual(search.body.data.sources, []);
    });

    await t.test('ordinary legacy HTTP/MCP source routes are refused and absent from tool catalog', async () => {
      for (const path of ['/v1/company-os/procedures', '/v1/process-core/procedures', '/v1/evidence', '/v1/notes',
        '/v1/decisions', '/v1/google-drive/files', '/v1/assets/context', '/v1/strategy/context',
        '/v1/product-engineering/applications', '/v1/company-intelligence/search?q=Approved']) {
        assert.equal((await request(path, generalKey)).status, 403, path);
        assert.equal((await request(path, agentKey)).status, 403, path);
      }
      const generalManifest = await request('/v1/mcp/manifest', generalKey);
      const boundManifest = await request('/v1/mcp/manifest', agentKey);
      assert.equal(generalManifest.status, 200);
      assert.equal(boundManifest.status, 200);
      const names = manifest => manifest.body.data.tools.map(tool => tool.name);
      assert.equal(names(generalManifest).some(name => name.includes('get_company_os')), false);
      assert.equal(names(generalManifest).some(name => name.includes('_sources')), false);
      assert.equal(names(boundManifest).includes('companycore_get_agent_runtime_tasks_by_id_sources'), true);
      assert.equal(names(boundManifest).some(name => name.includes('get_company_os')), false);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/interviews`, agentKey)).status, 403);
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/interviews`, agentKey, {})).status, 403);
      assert.equal(boundManifest.body.data.tools.some(tool => tool.path.includes('/interviews')), false);
      assert.equal((await mcpSmoke(agentKey, task.id)).callStatus, 200);
      assert.equal((await request('/v1/process-core/procedures', owner)).status, 200);
      const connection = await request('/v1/connection', generalKey);
      assert.equal(connection.status, 200);
      assert.equal(connection.body.data.operatingModel, undefined);
      assert.equal(connection.body.data.adapterManifest, undefined);
      const preview = `/v1/company-os/workflow-definitions/drafts/${randomUUID()}/actions/preview-impact`;
      assert.equal((await request(preview, generalKey, {})).status, 403);
      assert.equal(generalManifest.body.data.tools.some(tool => tool.path.includes('preview-impact')), false);
      assert.equal(generalManifest.body.data.tools.every(tool => tool.method === 'GET'), true);
      assert.equal(boundManifest.body.data.tools.every(tool => tool.method === 'GET' || tool.path.includes('/agent-runtime/tasks/') || tool.path.includes('/agent-runtime/releases/')
        || /^\/v1\/product-engineering\/findings\/:id\/actions$/.test(tool.path)
        || /^\/v1\/decisions\/:id\/governance\/actions$/.test(tool.path)), true);
      assert.equal(boundManifest.body.data.tools.some(tool => tool.path.includes('/findings/catalog') || tool.path === '/v1/decisions/governance'), false);
    });

    await t.test('source-bearing commands cannot turn an unbound key into a read principal', async () => {
      const secretRecord = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement',
        key: 'unreviewed-command', title: 'UNREVIEWED_COMMAND_MARKER', description: 'Private unreviewed source' } });
      const secretNote = await prisma.note.create({ data: { workspaceId, content: 'UNREVIEWED_NOTE_COMMAND_MARKER' } });
      const secretFile = await prisma.googleDriveFile.create({ data: { workspaceId, externalId: 'g9-command-file',
        name: 'Unreviewed command file', mimeType: 'text/plain', headRevisionId: 'r1' } });
      await prisma.googleDriveContentSnapshot.create({ data: { workspaceId, googleDriveFileId: secretFile.id,
        sourceRevisionId: 'r1', contentKind: 'text', extractedText: 'UNREVIEWED_DRIVE_COMMAND_MARKER' } });
      for (const key of [generalKey, agentKey]) {
        for (const [method, path, body] of [
          ['PATCH', `/v1/company-records/${secretRecord.id}`, {}],
          ['DELETE', `/v1/company-records/${secretRecord.id}`, undefined],
          ['PATCH', `/v1/notes/${secretNote.id}`, {}],
          ['PATCH', `/v1/google-drive/files/${secretFile.id}/description`, { description: null }],
          ['POST', '/v1/intake/actions/propose-route', { sourceModel: 'company_record', sourceId: secretRecord.id }]
        ]) assert.equal((await command(method, path, key, body)).status, 403, `${method} ${path}`);
      }
      const ownerUpdate = await command('PATCH', `/v1/company-records/${secretRecord.id}`, owner, {});
      assert.equal(ownerUpdate.status, 200, JSON.stringify(ownerUpdate.body));
      assert.equal(ownerUpdate.body.data.title, 'UNREVIEWED_COMMAND_MARKER');
      assert.equal((await prisma.companyRecord.findUnique({ where: { id: secretRecord.id } })).status, 'active');
      assert.equal(await prisma.note.count({ where: { id: secretNote.id } }), 1);
      assert.equal(await prisma.googleDriveContentSnapshot.count({ where: { googleDriveFileId: secretFile.id } }), 1);
    });

    await t.test('Worker projection follows the same review and mutation revokes stale content', async () => {
      const { loadTaskAgentContext } = require('../dist/modules/company-intelligence/task-agent-context.js');
      const envelope = { id: randomUUID(), workspaceId, taskId: task.id, applicationId: null,
        metadata: { executionContract: { context: {} } } };
      const before = await loadTaskAgentContext(workspaceId, task.id, envelope);
      assert.deepEqual(before.procedures.map(row => row.id), [procedure.id]);
      assert.deepEqual(before.evidence.map(row => row.id), [evidence.id]);
      assert.deepEqual(before.policies.map(row => row.id), [policy.id]);
      assert.equal(before.resources.length, 0);
      await prisma.note.update({ where: { id: note.id }, data: { content: 'Changed after review' } });
      assert.equal((await request(`/v1/agent-runtime/tasks/${task.id}/sources/note/${note.id}`, agentKey)).status, 404);
      const audit = await request(`/v1/agent-runtime/source-audit/note/${note.id}`, owner);
      assert.equal(audit.status, 200, JSON.stringify(audit.body));
      assert.equal(audit.body.data.current.content, 'Changed after review');
      assert.equal(audit.body.data.history.some(row => row.operation === 'before_update' && row.body.content === 'Approved note body'), true);
      assert.equal(audit.body.data.reviews.length, 1);
      assert.equal((await request(`/v1/agent-runtime/source-audit/note/${note.id}`, agentKey)).status, 403);
      assert.equal((await request(`/v1/agent-runtime/source-audit/note/${note.id}`, generalKey)).status, 403);
      assert.equal((await review('procedure', procedure, 'withdraw')).status, 201);
      const after = await loadTaskAgentContext(workspaceId, task.id, envelope);
      assert.deepEqual(after.procedures, []);
      assert.deepEqual(after.evidence.map(row => row.id), [evidence.id]);
    });

    await t.test('task and application execution omit unreviewed linked prose and stale capability relations', async () => {
      const project = await prisma.project.create({ data: { workspaceId, name: 'Selected project', description: 'HIDDEN_PROJECT_BODY' } });
      const sibling = await prisma.project.create({ data: { workspaceId, name: 'HIDDEN_SIBLING_PROJECT', description: 'HIDDEN_SIBLING_BODY' } });
      const goal = await prisma.goal.create({ data: { workspaceId, projectId: project.id, title: 'Selected goal', description: 'HIDDEN_GOAL_BODY' } });
      const target = await prisma.target.create({ data: { workspaceId, goalId: goal.id, title: 'Selected target', metric: 'HIDDEN_TARGET_METRIC' } });
      const list = await prisma.taskList.create({ data: { workspaceId, projectId: project.id, name: 'Selected list', description: 'HIDDEN_LIST_BODY' } });
      const scopedTask = await prisma.task.create({ data: { workspaceId, projectId: project.id, goalId: goal.id,
        targetId: target.id, taskListId: list.id, title: 'Selected work order', assignedWorkforceEntityId: agent.id } });
      const app = await prisma.application.create({ data: { workspaceId, name: 'Selected application', slug: 'selected-application' } });
      await prisma.applicationProject.createMany({ data: [{ applicationId: app.id, projectId: project.id },
        { applicationId: app.id, projectId: sibling.id }] });
      const domain = await prisma.capabilityDomain.create({ data: { workspaceId, key: 'selected-domain', name: 'Selected domain', description: 'HIDDEN_DOMAIN_BODY' } });
      const definition = await prisma.capabilityDefinition.create({ data: { workspaceId, domainId: domain.id,
        key: 'selected-capability', name: 'Selected capability' } });
      const hiddenDefinition = await prisma.capabilityDefinition.create({ data: { workspaceId, domainId: domain.id,
        key: 'hidden-capability', name: 'HIDDEN_DEPENDENCY_NAME' } });
      const capability = await prisma.applicationCapability.create({ data: { applicationId: app.id,
        capabilityDefinitionId: definition.id, lifecycleStatus: 'approved', applicability: 'required' } });
      const hiddenCapability = await prisma.applicationCapability.create({ data: { applicationId: app.id,
        capabilityDefinitionId: hiddenDefinition.id, lifecycleStatus: 'approved', applicability: 'required' } });
      await prisma.applicationCapabilityDependency.create({ data: { fromCapabilityId: capability.id,
        toCapabilityId: hiddenCapability.id, required: true, notes: 'HIDDEN_DEPENDENCY_NOTES' } });
      assert.equal((await review('application_capability', capability, 'approve', scopedTask.id)).status, 201);
      const { loadTaskAgentContext } = require('../dist/modules/company-intelligence/task-agent-context.js');
      const { loadApplicationAgentContext } = require('../dist/modules/product-engineering/application-agent-context.js');
      const envelope = { id: randomUUID(), workspaceId, taskId: scopedTask.id, applicationId: app.id,
        metadata: { executionContract: { context: {} } } };
      const taskContext = await loadTaskAgentContext(workspaceId, scopedTask.id, envelope);
      const applicationContext = await loadApplicationAgentContext(workspaceId, app.id, true, '', prisma, undefined, scopedTask.id);
      const taskRead = await request(`/v1/tasks/${scopedTask.id}`, agentKey);
      const taskListRead = await request('/v1/tasks', agentKey);
      assert.equal(taskRead.status, 200);
      assert.equal(taskListRead.status, 200);
      assert.equal(taskRead.body.data.organizationalContext, undefined);
      assert.equal(taskRead.body.data.project.name, undefined);
      assert.equal(taskRead.body.data.goal.title, undefined);
      assert.equal(taskRead.body.data.target.title, undefined);
      assert.equal(taskRead.body.data.taskList.name, undefined);
      assert.equal(taskListRead.body.data.find(row => row.id === scopedTask.id).project.name, undefined);
      const wire = JSON.stringify({ taskContext, applicationContext });
      for (const marker of ['HIDDEN_PROJECT_BODY', 'HIDDEN_GOAL_BODY', 'HIDDEN_TARGET_METRIC', 'HIDDEN_LIST_BODY',
        'HIDDEN_SIBLING_PROJECT', 'HIDDEN_SIBLING_BODY', 'HIDDEN_DOMAIN_BODY', 'HIDDEN_DEPENDENCY_NAME', 'HIDDEN_DEPENDENCY_NOTES'])
        assert.equal(wire.includes(marker), false, marker);
      assert.deepEqual(applicationContext.targetCapabilities.map(row => row.id), [capability.id]);
      assert.deepEqual(applicationContext.dependencies, []);
      assert.deepEqual(applicationContext.gaps, []);
      assert.equal(applicationContext.readiness, null);
      await prisma.capabilityDefinition.update({ where: { id: definition.id }, data: { key: 'changed-after-review' } });
      const stale = await loadApplicationAgentContext(workspaceId, app.id, true, '', prisma, undefined, scopedTask.id);
      assert.deepEqual(stale.targetCapabilities, []);
      assert.equal((await request(`/v1/agent-runtime/tasks/${scopedTask.id}/sources/application_capability/${capability.id}`, agentKey)).status, 404);
    });

    await t.test('owner audit retains revised steps and deleted records; history is immutable', async () => {
      await prisma.procedureStep.update({ where: { id: procedure.steps[0].id }, data: { instruction: 'Revised instruction' } });
      const audit = await request(`/v1/agent-runtime/source-audit/procedure/${procedure.id}`, owner);
      assert.equal(audit.status, 200, JSON.stringify(audit.body));
      assert.equal(audit.body.data.relatedHistory.some(row => row.operation === 'before_update' && row.body.instruction === 'Approved instruction'), true);
      await prisma.procedure.delete({ where: { id: procedure.id } });
      const deletedAudit = await request(`/v1/agent-runtime/source-audit/procedure/${procedure.id}`, owner);
      assert.equal(deletedAudit.status, 200);
      assert.equal(deletedAudit.body.data.current, null);
      assert.equal(deletedAudit.body.data.relatedHistory.every(row => row.workspaceId === workspaceId), true);
      const record = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement', key: 'delete-test',
        title: 'Prospective deleted body', description: 'Prospective deleted body' } });
      await prisma.companyRecord.delete({ where: { id: record.id } });
      const companyAudit = await request(`/v1/company-records/${record.id}/source-audit`, owner);
      assert.equal(companyAudit.status, 200, JSON.stringify(companyAudit.body));
      assert.equal(companyAudit.body.data.currentRecord, null);
      assert.equal(companyAudit.body.data.history.some(row => row.operation === 'delete' && row.body.title === 'Prospective deleted body'), true);
      await assert.rejects(() => prisma.sourceBodyHistory.update({ where: { ordinal: BigInt(companyAudit.body.data.history[0].ordinal) },
        data: { operation: 'insert' } }));
      const second = await request('/auth/register', null, { email: 'owner-b@g9.test', password: 'synthetic-test-password-only',
        name: 'Synthetic owner B', workspaceName: 'Synthetic G9 B' });
      assert.equal(second.status, 201);
      const ownerB = second.body.data.token, workspaceB = second.body.data.workspace.id;
      const transferred = await prisma.note.create({ data: { workspaceId, content: 'TENANT_A_PRIVATE_HISTORY' } });
      await prisma.note.update({ where: { id: transferred.id }, data: { workspaceId: workspaceB, content: 'Tenant B current body' } });
      const auditB = await request(`/v1/agent-runtime/source-audit/note/${transferred.id}`, ownerB);
      assert.equal(auditB.status, 200);
      assert.equal(JSON.stringify(auditB.body).includes('TENANT_A_PRIVATE_HISTORY'), false);
      const auditA = await request(`/v1/agent-runtime/source-audit/note/${transferred.id}`, owner);
      assert.equal(auditA.status, 200);
      assert.equal(auditA.body.data.history.some(row => row.body.content === 'TENANT_A_PRIVATE_HISTORY'), true);
    });

    await t.test('identical Drive rescan keeps the source digest and compact history', async () => {
      const file = await prisma.googleDriveFile.create({ data: { workspaceId, externalId: 'g9-file',
        name: 'Approved file', mimeType: 'text/plain', headRevisionId: 'revision-one' } });
      const snapshot = await prisma.googleDriveContentSnapshot.create({ data: { workspaceId,
        googleDriveFileId: file.id, sourceRevisionId: 'revision-one', contentKind: 'text',
        extractedText: 'Approved file body', metadata: { readAt: '2026-01-01T00:00:00.000Z' } } });
      const { taskSourceCandidate, taskSourceDigest } = require('../dist/modules/agent-runtime/task-source-trust.js');
      const before = await taskSourceCandidate(prisma, workspaceId, 'drive_snapshot', snapshot.id);
      await prisma.googleDriveContentSnapshot.update({ where: { id: snapshot.id },
        data: { metadata: { readAt: '2026-01-02T00:00:00.000Z' } } });
      await prisma.googleDriveFile.update({ where: { id: file.id }, data: { lastScannedAt: new Date() } });
      const after = await taskSourceCandidate(prisma, workspaceId, 'drive_snapshot', snapshot.id);
      assert.equal(taskSourceDigest(after), taskSourceDigest(before));
      assert.equal(after.revision.toISOString(), before.revision.toISOString());
      assert.equal(await prisma.sourceBodyHistory.count({ where: { sourceTable: 'google_drive_content_snapshots', sourceId: snapshot.id } }), 1);
      assert.equal(await prisma.sourceBodyHistory.count({ where: { sourceTable: 'google_drive_files', sourceId: file.id } }), 1);
      await prisma.googleDriveFile.update({ where: { id: file.id }, data: { name: 'New file name' } });
      const changed = await taskSourceCandidate(prisma, workspaceId, 'drive_snapshot', snapshot.id);
      assert.notEqual(taskSourceDigest(changed), taskSourceDigest(before));
      const audit = await request(`/v1/agent-runtime/source-audit/drive_snapshot/${snapshot.id}`, owner);
      assert.equal(audit.status, 200);
      assert.equal(audit.body.data.relatedHistory.some(row => row.operation === 'before_update' && row.body.name === 'Approved file'), true);
    });

  } finally {
    await prisma.$disconnect();
    await new Promise(resolve => server.close(resolve));
  }
});
