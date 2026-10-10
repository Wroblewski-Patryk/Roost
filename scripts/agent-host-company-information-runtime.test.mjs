import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { companyInformationFixture } from './fixtures/company-information.mjs';
import { sealPacket } from './fixtures/execution-packet.mjs';
import ready from './lib/agent-host-ready-context.cjs';
import { trustedPilotBytes } from './lib/agent-host-trusted-pilot.mjs';
import { buildCompanyInformationInput, informationAdmissionSchema, verifyInformationAdmission, consumeInformationQualification,
  assertInformationQualification, authorizeInformationResume, completeInformationQualification } from './lib/agent-host-company-information-runtime.mjs';

function fixture() {
  const f = companyInformationFixture(), c = f.packet.contract;
  c.executionClass = 'roost-company-information-runtime-v1';
  c.modelSelection = { schemaVersion: 'roost-managed-hermes-backend-v1', agent: 'managed_hermes', riskClass: 'low', fallback: 'none',
    backend: 'codex_responses', provider: 'openai-codex', auth: 'same_owner_subscription', modelSelection: { model: 'gpt-5.6-sol', reasoningEffort: 'low' },
    attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: 'stop_attempt', restart: 'never' } };
  c.budgets.maxAttempts = 1;
  f.claimed.status = 'claimed'; f.claimed.attempt = 1;
  f.claimed.agentHostId = randomUUID();
  f.claimed.startedAt = new Date().toISOString();
  f.claimed.leaseExpiresAt = new Date(Date.now() + 60000).toISOString();
  f.claimed.leaseToken = 'private-lease-cannot-reach-model';
  f.packet.procedureComposition = { algorithm: 'roost-company-information-runtime-v1', preparationOnly: false, modelExecutionQualified: true };
  seal(f); return f;
}
function seal(f) {
  sealPacket(f.packet);
  const revision = ready.readyContextRevision(f.taskContext, {}, f.claimed);
  const pin = { pinId: '00000000-0000-4000-8000-000000000090', revision, preparationOnly: false, modelExecutionQualified: true };
  f.claimed.metadata = { executionContract: f.packet.contract, readyContextPin: pin };
  f.taskContext.readyAdmission = { status: 'ready', ...pin, validationRevision: revision };
}
const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
function signedFixture() {
  const now = Date.now(), payload = { schemaVersion: 'roost-company-information-admission-v1', domain: 'roost-company-information-admission-v1',
    executionId: randomUUID(), taskId: randomUUID(), workspaceId: randomUUID(), installationId: randomUUID(), hostId: randomUUID(), applicationId: null, attempt: 1,
    ...Object.fromEntries(['readyRevision', 'packetRevision', 'inputSeal', 'selectionDigest', 'profileDigest', 'runtimeDigest', 'leaseDigest'].map((s, i) => [s, String(i).repeat(64)])),
    issuedAt: new Date(now - 1).toISOString(), expiresAt: new Date(now + 59000).toISOString(), deadline: new Date(now + 120000).toISOString(),
    decisionId: randomUUID(), decisionVersion: 1, tools: [], externalWrites: false };
  const expected = structuredClone(payload); delete expected.issuedAt; delete expected.expiresAt; delete expected.decisionId; delete expected.decisionVersion;
  return { payload, expected, signed: { payload, signature: sign(null, trustedPilotBytes(payload), keys.privateKey).toString('hex') }, now };
}
test('informational stdin contains exactly selected company records and no lease or native observations', () => {
  const f = fixture(), value = buildCompanyInformationInput(f), body = JSON.parse(value.input);
  assert.equal(body.executionClass, 'roost-company-information-runtime-v1');
  assert.equal(value.selectedSourceCount, 1); assert.deepEqual(body.sources, f.packet.sources);
  assert.equal(body.identity.applicationId, null); assert.deepEqual(body.contract.access.tools, []);
  assert.deepEqual(body.contract.access.permissions, []);
  assert.equal(value.input.includes(f.claimed.leaseToken), false);
  assert.equal(Object.hasOwn(body, 'applicationContext'), false);
  assert.equal(Object.hasOwn(body, 'nativeObservation'), false);
});
for (const [name, mutate] of [
  ['preparation cannot borrow runtime authority', f => { f.packet.contract.executionClass = 'roost-company-information-v1'; }],
  ['repository_read denied', f => { f.packet.contract.access.tools = ['repository_read']; }],
  ['repository_write denied', f => { f.packet.contract.access.permissions = ['repository_write']; }],
  ['native boundary denied', f => { f.packet.contract.nativeBoundary = { profile: 'inspect-readonly' }; }],
  ['application denied', f => { f.claimed.applicationId = randomUUID(); }],
  ['branch denied', f => { f.claimed.baseBranch = 'main'; }],
  ['second attempt denied', f => { f.claimed.attempt = 2; }],
  ['transport retries denied', f => { f.packet.contract.modelSelection.attemptPolicy.apiMaxRetries = 1; }],
  ['multiple turns denied', f => { f.packet.contract.modelSelection.attemptPolicy.maxTurns = 2; }],
  ['high risk denied', f => { f.packet.contract.modelSelection.riskClass = 'high'; }],
  ['unselected extra record denied', f => { f.packet.sources.push({ ...f.packet.sources[0], id: randomUUID() }); }],
  ['stale source denied', f => { f.packet.sources[0].revision = 'stale'; }],
  ['foreign source denied', f => { f.packet.sources[0].workspaceId = randomUUID(); }],
  ['missing source content denied', f => { const s = f.packet.sources[0]; s.description = ''; s.businessPurpose = ''; s.desiredState = ''; s.expectedBehavior = ''; }]
]) test(name, () => {
  const f = fixture(); mutate(f); seal(f);
  assert.throws(() => buildCompanyInformationInput(f), /company_information_runtime_blocked/);
});
test('Ready mismatch and changed packet block before admission', () => {
  const f = fixture(); f.claimed.metadata.readyContextPin.modelExecutionQualified = false;
  assert.throws(() => buildCompanyInformationInput(f));
  const g = fixture(); g.packet.sources[0].description += ' changed';
  assert.throws(() => buildCompanyInformationInput(g));
});
test('valid strict domain-separated Ed25519 signed admission binds every expected field', () => {
  const f = signedFixture(); assert.deepEqual(verifyInformationAdmission(f.signed, publicKey, f.expected, f.now), f.payload);
});
test('every join change invalidates signed admission', () => {
  const f = signedFixture();
  for (const key of ['executionId', 'taskId', 'workspaceId', 'installationId', 'hostId']) {
    assert.throws(() => verifyInformationAdmission(f.signed, publicKey, { ...f.expected, [key]: randomUUID() }, f.now));
  }
  for (const key of ['readyRevision', 'packetRevision', 'inputSeal', 'selectionDigest', 'profileDigest', 'runtimeDigest', 'leaseDigest']) {
    assert.throws(() => verifyInformationAdmission(f.signed, publicKey, { ...f.expected, [key]: 'f'.repeat(64) }, f.now));
  }
});
test('forged signature, different key, future issuance, expiry and wider grant rejected', () => {
  const f = signedFixture(); assert.throws(() => verifyInformationAdmission({ ...f.signed, signature: 'f'.repeat(128) }, publicKey, f.expected));
  const wrong = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
  assert.throws(() => verifyInformationAdmission(f.signed, wrong, f.expected));
  assert.throws(() => verifyInformationAdmission(f.signed, publicKey, f.expected, Date.parse(f.payload.issuedAt) - 1));
  assert.throws(() => verifyInformationAdmission(f.signed, publicKey, f.expected, Date.parse(f.payload.expiresAt)));
  assert.equal(informationAdmissionSchema.safeParse({ ...f.payload, tools: ['repository_read'] }).success, false);
  assert.equal(informationAdmissionSchema.safeParse({ ...f.payload, expiresAt: new Date(Date.parse(f.payload.issuedAt) + 60001).toISOString() }).success, false);
  assert.equal(informationAdmissionSchema.safeParse({ ...f.payload, applicationId: randomUUID() }).success, false);
  assert.equal(informationAdmissionSchema.safeParse({ ...f.payload, unexpected: true }).success, false);
});
test('serialized/caller fabricated qualifications and job receipts never become launch authority', () => {
  const fake = Object.freeze({});
  assert.throws(() => consumeInformationQualification(fake, {}));
  assert.throws(() => assertInformationQualification(fake));
  assert.throws(() => authorizeInformationResume(fake, {}, {}));
  assert.throws(() => completeInformationQualification(fake, { resumed: true, cleanup: true, activeProcesses: 0 }));
});
test('launcher is source-bound to zero tools, quiet owned job, one turn, unchanged installation verification', () => {
  const source = readFileSync(new URL('./lib/agent-host-company-information-runtime.mjs', import.meta.url), 'utf8');
  assert.match(source, /qualifyHermesReadOnlyTools\(provider, environment\)/);
  assert.match(source, /verifyHermesSmokeInstallation/);
  assert.match(source, /'--toolsets', 'bot_room', '--max-turns', '1'/);
  assert.match(source, /informationToolReceipt: receipt/);
  assert.match(source, /physicalModelCalls: null, tokenUsage: null, cost: null/);
  assert.doesNotMatch(source, /nativeToolReceipt:/);
});
