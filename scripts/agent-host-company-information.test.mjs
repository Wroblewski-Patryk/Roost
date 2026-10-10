import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { companyInformationFixture } from './fixtures/company-information.mjs';
import { sealPacket, validPacketFixture } from './fixtures/execution-packet.mjs';
import { validateExecutionPacket, companyInformationContractSchema } from './lib/agent-host-execution-packet.mjs';
import { riskSchemaDescriptor } from './lib/agent-host-risk-readonly-schema.mjs';
import { fetchExecutionContext } from './lib/agent-host-execution-context.mjs';
const validate = f => validateExecutionPacket(f.packet, f.claimed, f.taskContext, f.applicationContext);

test('company preparation accepts a real queued attempt=0 with exact selected sources and no app/repo', async () => {
  const f = companyInformationFixture(); assert.equal(validate(f), f.packet);
  const reads = [];
  const fetched = await fetchExecutionContext(async route => { reads.push(route); return f.taskContext; }, f.claimed);
  assert.deepEqual(fetched.applicationContext, {}); assert.equal(reads.length, 1); assert.match(reads[0], /company-intelligence\/tasks/);
});
for (const operation of ['repository_read', 'repository_write', 'remote_push', 'deployment', 'local_test', 'local_commit']) {
  test(`company preparation denies ${operation}`, () => {
    const f = companyInformationFixture(); f.packet.contract.access.tools = [operation]; f.packet.contract.access.permissions = [operation]; sealPacket(f.packet);
    assert.throws(() => validate(f), /execution_packet_invalid/);
  });
}
for (const [name, mutate] of Object.entries({
  missingSelection: f => f.packet.contract.context.company = [],
  extraSource: f => f.packet.sources.push({ ...f.packet.sources[0], id: f.claimed.id }),
  foreignWorkspace: f => f.packet.sources[0].workspaceId = f.claimed.id,
  applicationSource: f => f.packet.sources[0].applicationId = f.claimed.id,
  staleSource: f => f.packet.sources[0].revision = 'stale',
  wrongActor: f => f.packet.identity.agentId = f.claimed.id,
  claimAttempt: f => f.claimed.status = 'claimed',
  consumedAttempt: f => f.claimed.attempt = 1,
  hostBound: f => f.claimed.agentHostId = f.claimed.id,
  leaseBound: f => f.claimed.leaseToken = f.claimed.id,
  startBound: f => f.claimed.startedAt = new Date().toISOString(),
  modelQualified: f => f.claimed.metadata.readyContextPin.modelExecutionQualified = true,
  missingQualification: f => delete f.claimed.metadata.readyContextPin.modelExecutionQualified,
  unsealedPreparation: f => delete f.claimed.metadata.readyContextPin.preparationOnly,
  gitBranch: f => f.packet.contract.singleTask.branch = 'main',
  nativeTools: f => f.packet.contract.nativeBoundary = { profile: 'coding-local' }
})) test(`company preparation refuses ${name}`, () => {
  const f = companyInformationFixture(); mutate(f); sealPacket(f.packet); assert.throws(() => validate(f), /execution_packet_invalid/);
});
test('legacy app still needs Application, component and repository authority', () => {
  const f = validPacketFixture(); assert.equal(validate(f), f.packet);
  f.packet.contract.singleTask.component = null; f.packet.identity.applicationId = null; sealPacket(f.packet);
  assert.throws(() => validate(f), /execution_packet_invalid/);
});
test('SQL descriptor is identical to the API/Worker contract; migration is additive', async () => {
  const sql = await readFile(new URL('../prisma/migrations/20261010100000_company_information_preparation/migration.sql', import.meta.url), 'utf8');
  const encoded = sql.match(/SELECT '(.+)'::jsonb;/)[1].replaceAll("''", "'");
  assert.deepEqual(JSON.parse(encoded), JSON.parse(JSON.stringify(riskSchemaDescriptor(companyInformationContractSchema))));
  assert.doesNotMatch(sql, /\b(?:DELETE|TRUNCATE|DROP TABLE|DISABLE TRIGGER)\b/i);
  assert.match(sql, /company_information_execution_unqualified/);
});
