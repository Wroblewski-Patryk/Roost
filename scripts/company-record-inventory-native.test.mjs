import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.match(url.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.NODE_ENV, 'test');
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { prisma } = require('../dist/db/prisma.js');
const { createAuthToken } = require('../dist/auth/token.js');
const { replaceOrganizationalContext } = require('../dist/modules/organizational-context/organizational-context.service.js');

test('G0 owner inventory assessment is exact, append-only and separate from source admission', { timeout: 150000 }, async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, credential, body) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(credential?.startsWith('cc_') ? { 'X-API-Key': credential }
        : credential ? { Authorization: `Bearer ${credential}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const registration = await request('/auth/register', null, { email: 'inventory-owner@example.test',
      password: 'synthetic-test-password-only', name: 'Inventory owner', workspaceName: 'Disposable inventory workspace' });
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    const owner = registration.body.data.token, workspaceId = registration.body.data.workspace.id;
    const member = await prisma.user.create({ data: { email: 'inventory-member@example.test', passwordHash: 'synthetic-not-a-login' } });
    await prisma.workspaceMembership.create({ data: { workspaceId, userId: member.id, role: 'member' } });
    const memberToken = createAuthToken({ workspaceId, userId: member.id });
    const apiKeyResponse = await request('/v1/api-keys', owner, { name: 'Disposable inventory agent key', profileId: 'mcp_codex_worker' });
    assert.equal(apiKeyResponse.status, 201, JSON.stringify(apiKeyResponse.body));
    const agentKey = apiKeyResponse.body.data.key;
    const foreignRegistration = await request('/auth/register', null, { email: 'inventory-foreign@example.test',
      password: 'synthetic-test-password-only', name: 'Foreign owner', workspaceName: 'Foreign workspace' });
    assert.equal(foreignRegistration.status, 201);
    const foreignOwner = foreignRegistration.body.data.token;
    const record = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement',
      key: 'sample-inventory', title: 'Exact sample inventory record', description: 'First canonical body',
      source: 'documentation-import', metadata: { sourceKind: 'legacy_assumption', sourceSystem: 'example-docs',
        sourceRoot: 'example-root', sourceRevision: 'r1', filePath: 'docs/example.md' } } });
    const path = `/v1/company-records/${record.id}/inventory-assessments`;
    const first = await request(path, owner);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.data.record.id, record.id);
    assert.equal(first.body.data.record.description, 'First canonical body');
    assert.equal(first.body.data.sourceReference.sourceKind, 'legacy_assumption');
    assert.equal(first.body.data.state.status, 'unassessed');
    assert.equal(first.body.data.assessable, true);
    assert.equal(first.body.data.history.length, 0);
    assert.equal((await request(path, memberToken)).status, 403);
    assert.equal((await request(path, agentKey)).status, 403);
    assert.equal((await request(path, foreignOwner)).status, 404);
    const catalog = await request('/v1/company-records/registry/unassigned?level=records&scope=current&q=sample-inventory&page=1&pageSize=25', owner);
    assert.equal(catalog.status, 200, JSON.stringify(catalog.body));
    assert.equal(catalog.body.data.items.find(item => item.id === record.id).inventoryAssessment.status, 'unassessed');
    const beforeAudit = await request(`/v1/company-records/${record.id}/source-audit?projection=summary`, owner);
    assert.equal(beforeAudit.status, 200);
    const body = { requestId: randomUUID(), expectedRevision: first.body.data.recordRevision,
      expectedDigest: first.body.data.recordDigest, expectedPreviousAssessmentId: null,
      category: 'test', reason: 'Disposable fixture explicitly identified by owner' };
    assert.equal((await request(path, memberToken, body)).status, 403);
    assert.equal((await request(path, agentKey, body)).status, 403);
    assert.equal((await request(path, foreignOwner, body)).status, 404);
    assert.equal((await request(path, owner, { ...body, requestId: randomUUID(), reason: ' ' })).status, 400);
    assert.equal((await request(path, owner, { ...body, requestId: randomUUID(), category: 'verified' })).status, 400);
    assert.equal((await request(path, owner, { ...body, requestId: randomUUID(), expectedDigest: '0'.repeat(64) })).status, 409);
    const created = await request(path, owner, body);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.category, 'test');
    assert.equal(created.body.data.reason, body.reason);
    assert.equal((await request(path, owner, body)).status, 200, 'exact retry is idempotent');
    assert.equal((await request(path, owner, { ...body, category: 'business' })).status, 409);
    assert.equal((await prisma.companyRecordInventoryAssessment.count({ where: { recordId: record.id } })), 1);
    assert.equal((await prisma.event.count({ where: { workspaceId, resourceId: record.id, type: 'company_record_inventory_assessed' } })), 1);
    const assessed = await request(path, owner);
    assert.equal(assessed.body.data.state.status, 'current');
    assert.equal(assessed.body.data.state.category, 'test');
    assert.equal(assessed.body.data.history[0].id, body.requestId);
    assert.equal((await request(`/v1/company-records/${record.id}/source-audit?projection=summary`, owner)).body.data.eligibility.status,
      beforeAudit.body.data.eligibility.status, 'inventory assessment does not admit task source');
    assert.equal((await prisma.companyRecord.findUnique({ where: { id: record.id } })).description, 'First canonical body');
    const correction = { ...body, requestId: randomUUID(), expectedPreviousAssessmentId: body.requestId,
      category: 'unknown', reason: 'The owner cannot yet determine its intended purpose' };
    const corrected = await request(path, owner, correction);
    assert.equal(corrected.status, 201, JSON.stringify(corrected.body));
    const history = await request(`${path}?limit=1`, owner);
    assert.equal(history.body.data.state.status, 'current');
    assert.equal(history.body.data.state.category, 'unknown', 'explicit unknown is a current assessment');
    assert.deepEqual(history.body.data.history.map(row => row.id), [correction.requestId]);
    assert.ok(history.body.data.nextBeforeOrdinal);
    const older = await request(`${path}?limit=1&beforeOrdinal=${history.body.data.nextBeforeOrdinal}`, owner);
    assert.deepEqual(older.body.data.history.map(row => row.id), [body.requestId]);
    assert.equal((await request(path, owner, { ...body, requestId: randomUUID() })).status, 409, 'old predecessor rejected');
    await prisma.companyRecord.update({ where: { id: record.id }, data: { description: 'New imported canonical body',
      metadata: { sourceKind: 'legacy_assumption', sourceSystem: 'example-docs', sourceRevision: 'r2' } } });
    const stale = await request(path, owner);
    assert.equal(stale.body.data.state.status, 'stale');
    assert.equal(stale.body.data.state.category, null);
    assert.equal(stale.body.data.state.lastCategory, 'unknown');
    assert.equal(stale.body.data.record.description, 'New imported canonical body');
    assert.equal((await request(path, owner, { ...correction, requestId: randomUUID(), expectedPreviousAssessmentId: correction.requestId })).status, 409);
    const reassessment = await request(path, owner, { ...correction, requestId: randomUUID(),
      expectedRevision: stale.body.data.recordRevision, expectedDigest: stale.body.data.recordDigest,
      expectedPreviousAssessmentId: correction.requestId, category: 'business', reason: 'Current body reviewed again' });
    assert.equal(reassessment.status, 201, JSON.stringify(reassessment.body));
    assert.equal((await request(path, owner)).body.data.state.category, 'business');
    const assigned = await prisma.companyRecord.create({ data: { workspaceId, recordType: 'requirement',
      key: 'assigned-record', title: 'Assigned record' } });
    let releaseLock, signalLocked;
    const locked = new Promise(resolve => { signalLocked = resolve; });
    const hold = new Promise(resolve => { releaseLock = resolve; });
    const recordLock = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM company_records WHERE id = ${assigned.id}::uuid FOR UPDATE`;
      signalLocked(); await hold;
    }, { timeout: 10000 });
    await locked;
    let scopeCommitted = false;
    const scopeWrite = prisma.$transaction(tx => replaceOrganizationalContext(tx, workspaceId,
      'company_record', assigned.id, { scopes: [{ type: 'company' }] }))
      .then(() => { scopeCommitted = true; });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(scopeCommitted, false, 'scope write waits for the canonical row lock shared with assessment');
    } finally { releaseLock(); }
    await Promise.all([recordLock, scopeWrite]);
    const assignedPreview = await request(`/v1/company-records/${assigned.id}/inventory-assessments`, owner);
    assert.equal(assignedPreview.status, 200);
    assert.equal(assignedPreview.body.data.assessable, false);
    assert.equal((await request(`/v1/company-records/${assigned.id}/inventory-assessments`, owner, {
      ...body, requestId: randomUUID(), expectedRevision: assignedPreview.body.data.recordRevision,
      expectedDigest: assignedPreview.body.data.recordDigest })).status, 409);
    await assert.rejects(() => prisma.companyRecordInventoryAssessment.update({ where: { id: body.requestId }, data: { reason: 'rewrite' } }));
    await assert.rejects(() => prisma.companyRecordInventoryAssessment.delete({ where: { id: body.requestId } }));
    console.log('G0 exact preview, owner/foreign/member refusals, append-only correction, stale import and no source admission passed');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});
