import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.match(url.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.NODE_ENV, 'test');
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { prisma } = require('../dist/db/prisma.js');
const { encryptSecret } = require('../dist/integrations/secrets.js');

test('integration truth is a bounded human workspace read of distinct sources', { timeout: 120000 }, async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const read = async (path, credential, body) => {
    const headers = { 'Content-Type': 'application/json', ...(credential?.startsWith('cc_')
      ? { 'X-API-Key': credential } : credential ? { Authorization: `Bearer ${credential}` } : {}) };
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json() };
  };
  const path = '/v1/connection/integration-status';
  try {
    const ownerResult = await read('/auth/register', null, { email: 'integration-owner@example.test',
      password: 'synthetic-test-password-only', name: 'Integration owner', workspaceName: 'Integration test workspace' });
    assert.equal(ownerResult.status, 201, JSON.stringify(ownerResult.body));
    const owner = ownerResult.body.data.token, workspaceId = ownerResult.body.data.workspace.id;
    const foreignResult = await read('/auth/register', null, { email: 'integration-foreign@example.test',
      password: 'synthetic-test-password-only', name: 'Foreign owner', workspaceName: 'Other test workspace' });
    assert.equal(foreignResult.status, 201);
    const foreign = foreignResult.body.data.token;

    await t.test('empty workspace and human/API-key authority', async () => {
      const empty = await read(path, owner);
      assert.equal(empty.status, 200, JSON.stringify(empty.body));
      assert.deepEqual(empty.body.data.providers.map(item => item.provider), ['clickup', 'google_drive']);
      for (const provider of empty.body.data.providers) {
        assert.equal(provider.configuration.state, 'not_configured');
        assert.equal(provider.configuration.reason, 'no_setting');
        assert.equal(provider.synchronization.state, 'unknown');
        assert.equal(provider.synchronization.reason, 'no_observation');
        assert.equal(provider.adapter.present, false);
      }
      assert.equal((await read(path, null)).status, 401);
      const created = await read('/v1/api-keys', owner, { name: 'Synthetic integration key', profileId: 'mcp_codex_worker' });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal((await read(path, created.body.data.key)).status, 403);
    });

    const now = Date.now();
    await prisma.integrationSetting.createMany({ data: [
      { workspaceId, provider: 'clickup', active: true, secretCiphertext: encryptSecret('fixture-secret-clickup'),
        updatedAt: new Date(now - 2 * 86400000),
        config: { privateMarker: 'fixture-config-must-not-leak' } },
      { workspaceId, provider: 'google_drive', active: true,
        secretCiphertext: encryptSecret(JSON.stringify({ clientId: 'fixture-client', refreshToken: 'fixture-secret-refresh' })),
        config: { privateMarker: 'fixture-config-must-not-leak' }, lastValidatedAt: new Date(now - 35 * 86400000),
        updatedAt: new Date(now - 2 * 86400000) }
    ] });
    await prisma.toolAdapter.createMany({ data: [
      { workspaceId, provider: 'clickup', name: 'ClickUp catalog row', authType: 'api_key',
        connectionStatus: 'configured', healthStatus: 'unknown' },
      { workspaceId, provider: 'google_drive', name: 'Drive catalog row', authType: 'oauth',
        connectionStatus: 'disconnected', healthStatus: 'unknown' }
    ] });
    await prisma.event.createMany({ data: [
      { workspaceId, source: 'clickup', type: 'sync_succeeded', createdAt: new Date(now - 20 * 60_000) },
      { workspaceId, source: 'google_drive', type: 'google_drive_changes_reconciled', createdAt: new Date(now - 25 * 3600_000) }
    ] });

    await t.test('configured providers remain distinct from stale catalog and sync evidence', async () => {
      const result = await read(path, owner);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const [clickup, drive] = result.body.data.providers;
      assert.equal(clickup.configuration.state, 'configured');
      assert.equal(clickup.configuration.credentialState, 'stored_unverified');
      assert.equal(clickup.configuration.lastValidatedAt, null);
      assert.equal(clickup.synchronization.state, 'recent');
      assert.equal(clickup.synchronization.reason, 'latest_success_recent');
      assert.equal(clickup.adapter.connectionStatus, 'configured');
      assert.equal(clickup.adapter.lastSyncAt, null);
      assert.equal(drive.configuration.state, 'configured');
      assert.equal(drive.configuration.credentialState, 'refresh_token_unverified');
      assert.equal(drive.synchronization.state, 'stale');
      assert.equal(drive.synchronization.reason, 'latest_success_stale');
      assert.equal(drive.adapter.connectionStatus, 'disconnected');
      assert.equal(drive.adapter.healthStatus, 'unknown');
      assert.equal(drive.settingsHref, '/workspace/settings#workspace-integrations-google-drive');
      const serialized = JSON.stringify(result.body);
      for (const sensitive of ['fixture-secret', 'fixture-client', 'privateMarker', 'secretCiphertext', '"config":'])
        assert.equal(serialized.includes(sensitive), false, `${sensitive} must not be projected`);
      assert.ok(Date.parse(result.body.data.observedAt) > now - 60_000);
    });

    await t.test('latest failure, disabled setting and missing adapter keep separate reasons', async () => {
      await prisma.event.create({ data: { workspaceId, source: 'google_drive', type: 'google_drive_content_refresh_failed' } });
      await prisma.integrationSetting.update({ where: { workspaceId_provider: { workspaceId, provider: 'clickup' } },
        data: { active: false } });
      await prisma.toolAdapter.delete({ where: { workspaceId_provider: { workspaceId, provider: 'clickup' } } });
      const result = await read(path, owner);
      assert.equal(result.status, 200);
      const [clickup, drive] = result.body.data.providers;
      assert.equal(clickup.configuration.state, 'disabled');
      assert.equal(clickup.configuration.reason, 'inactive');
      assert.equal(clickup.adapter.present, false);
      assert.equal(clickup.synchronization.state, 'stale');
      assert.equal(clickup.synchronization.reason, 'latest_success_before_configuration');
      assert.equal(drive.configuration.state, 'configured');
      assert.equal(drive.synchronization.state, 'failed');
      assert.equal(drive.synchronization.reason, 'latest_failed');
      assert.equal(drive.synchronization.latestEventType, 'google_drive_content_refresh_failed');
      assert.ok(drive.synchronization.lastSuccessAt);
    });

    await t.test('active Drive setting with incomplete credential is not configured', async () => {
      await prisma.integrationSetting.update({ where: { workspaceId_provider: { workspaceId, provider: 'google_drive' } },
        data: { secretCiphertext: encryptSecret(JSON.stringify({ clientId: 'fixture-client' })) } });
      const result = await read(path, owner);
      assert.equal(result.status, 200);
      const drive = result.body.data.providers[1];
      assert.equal(drive.configuration.state, 'not_configured');
      assert.equal(drive.configuration.reason, 'incomplete_credential');
      assert.equal(drive.configuration.credentialState, 'incomplete');
      assert.equal(drive.configuration.active, true);
      assert.equal(drive.synchronization.state, 'failed');
    });

    await t.test('workspace isolation, member read and scoped human denial', async () => {
      const isolated = await read(path, foreign);
      assert.equal(isolated.status, 200);
      assert.ok(isolated.body.data.providers.every(item => item.configuration.state === 'not_configured'));
      await prisma.workspaceMembership.create({ data: { workspaceId, userId: foreignResult.body.data.user.id, role: 'member' } });
      const member = await read('/auth/login', null, { email: 'integration-foreign@example.test',
        password: 'synthetic-test-password-only', workspaceId });
      assert.equal(member.status, 200);
      const memberDrive = (await read(path, member.body.data.token)).body.data.providers[1];
      assert.equal(memberDrive.configuration.state, 'not_configured');
      assert.equal(memberDrive.configuration.reason, 'incomplete_credential');
      const scopedResult = await read('/auth/register', null, { email: 'integration-scoped@example.test',
        password: 'synthetic-test-password-only', name: 'Scoped user', workspaceName: 'Scoped own workspace' });
      assert.equal(scopedResult.status, 201);
      const task = await prisma.task.create({ data: { workspaceId, title: 'Task only' } });
      await prisma.workspaceMembership.create({ data: { workspaceId, userId: scopedResult.body.data.user.id,
        role: 'member', taskScopeId: task.id } });
      const scoped = await read('/auth/login', null, { email: 'integration-scoped@example.test',
        password: 'synthetic-test-password-only', workspaceId });
      assert.equal(scoped.status, 200);
      assert.equal((await read(path, scoped.body.data.token)).status, 403);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});
