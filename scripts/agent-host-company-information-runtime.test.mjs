import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { companyInformationFixture } from './fixtures/company-information.mjs';
import { sealPacket } from './fixtures/execution-packet.mjs';
import ready from './lib/agent-host-ready-context.cjs';
import { trustedPilotBytes } from './lib/agent-host-trusted-pilot.mjs';
import { buildCompanyInformationInput, informationAdmissionSchema, verifyInformationAdmission, assertInformationInstallationContinuity,
  verifyInformationPostAdmissionInstallation, consumeInformationQualification,
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
function checklistFixture() {
  const f = fixture(), procedureId = randomUUID(), decisionId = randomUUID(), findingId = randomUUID();
  const source = f.packet.sources[0];
  source.recordType = 'reference_site';
  source.description = null;
  source.businessPurpose = null;
  source.desiredState = null;
  source.expectedBehavior = null;
  const siteId = source.id, taskId = f.claimed.taskId;
  f.packet.contract.procedures = { items: [{ id: procedureId, revision: '1' }], noneReason: null };
  f.packet.referenceSiteChecklist = { schemaVersion: 'roost-reference-site-execution-context-v1',
    workspaceId: f.claimed.workspaceId, taskId, agentId: f.packet.identity.agentId,
    procedure: { id: procedureId, familyId: randomUUID(), version: 1, decisionId }, items: [{
      id: randomUUID(), order: 1, itemId: 'primary-action',
      instruction: 'Check the primary action.', applicability: 'Public entry page.',
      acceptanceCriterion: 'The action opens its intended view.', expectedInput: 'Saved site version.',
      expectedOutput: 'Sourced observation.', rollback: 'Restore the prior action.',
      source: { taskId, siteId, findingId, findingVersionId: randomUUID(), findingDigest: 'a'.repeat(64),
        reviewId: randomUUID(), sourceReviewId: source.provenance.reviewId, packageDigest: 'b'.repeat(64),
        metadataDigest: 'c'.repeat(64), recordRevision: source.revision, observationId: 'primary-action',
        providerVersion: 'v1', versionId: 'appgprj_fixture~appgver_v1', publishedUrl: 'https://example.org/' },
      finding: { observed: 'The action opened its intended view.', interpretation: 'The action is clear.',
        uncertainty: 'Other devices were not observed.', applicability: 'Public entry page.' },
      observation: { id: 'primary-action', category: 'journey', route: '/', language: 'en',
        text: 'The primary action opens the intended view.', evidence: [{ kind: 'supervised_click',
          ref: 'evidence/click.json', sha256: 'd'.repeat(64), observedAt: new Date().toISOString(),
          scope: 'supervised_result', result: 'The intended view opened.' }] }
    }] };
  seal(f); return f;
}
const keys = generateKeyPairSync('ed25519');

test('fresh post-admission installation must match the inventory already bound into the runtime observation', () => {
  const prior = { manifestDigest: 'a'.repeat(64), executableDigest: 'b'.repeat(64), inventoryFiles: 24969 };
  const refreshed = { ...prior };
  assert.equal(assertInformationInstallationContinuity(prior, refreshed), refreshed);
  assert.throws(() => assertInformationInstallationContinuity(prior, { ...prior, manifestDigest: 'c'.repeat(64) }),
    error => error.protocolAdmission === true && error.details?.reason === 'installation_digest_changed');
  assert.throws(() => assertInformationInstallationContinuity(prior, { ...prior, executableDigest: 'c'.repeat(64) }),
    error => error.protocolAdmission === true && error.details?.reason === 'installation_digest_changed');
  assert.throws(() => assertInformationInstallationContinuity(prior, { ...prior, inventoryFiles: 24968 }),
    error => error.protocolAdmission === true && error.details?.reason === 'installation_digest_changed');
});

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
test('delayed signed admission reattests the bound installation after the reply, before native launch', async () => {
  const f = signedFixture(), priorInstallation = { manifestDigest: 'a'.repeat(64), executableDigest: 'b'.repeat(64), inventoryFiles: 24969 };
  const calls = [], paths = { manifestPath: 'fixture-manifest', attestationPath: 'fixture-attestation' };
  const priorAttestedAt = f.now - 75000;
  assert.equal(f.now - priorAttestedAt > 60000, true, 'original receipt would already be expired');
  let clock = f.now + 55000;
  const refreshed = await verifyInformationPostAdmissionInstallation({ signed: f.signed,
    authorityPublicKey: publicKey, expected: f.expected, priorInstallation, installationPaths: paths,
    now: () => clock, verifyInstallation: async value => {
      calls.push(value); clock += 3000; return { ...priorInstallation, attestedAt: clock };
    } });
  assert.deepEqual(calls, [paths]);
  assert.deepEqual(refreshed, { ...priorInstallation, attestedAt: clock });
  assert.equal(clock < Date.parse(f.payload.expiresAt), true);
});
test('expired admission refuses before or during post-admission reattestation', async () => {
  const f = signedFixture(), priorInstallation = { manifestDigest: 'a'.repeat(64), executableDigest: 'b'.repeat(64), inventoryFiles: 24969 };
  let clock = f.now + 58000, calls = 0;
  const options = { signed: f.signed, authorityPublicKey: publicKey, expected: f.expected,
    priorInstallation, installationPaths: {}, now: () => clock,
    verifyInstallation: async () => { calls++; clock += 2000; return { ...priorInstallation }; } };
  await assert.rejects(verifyInformationPostAdmissionInstallation(options),
    error => error.protocolAdmission === true && error.details?.reason === 'signed_expired_or_future');
  assert.equal(calls, 1);
  await assert.rejects(verifyInformationPostAdmissionInstallation(options),
    error => error.protocolAdmission === true && error.details?.reason === 'signed_expired_or_future');
  assert.equal(calls, 1);
});
test('informational stdin contains exactly selected company records and no lease or native observations', () => {
  const f = fixture(), value = buildCompanyInformationInput(f), body = JSON.parse(value.input);
  assert.equal(body.executionClass, 'roost-company-information-runtime-v1');
  assert.equal(value.selectedSourceCount, 1); assert.deepEqual(body.sources, f.packet.sources);
  assert.equal(body.identity.applicationId, null); assert.deepEqual(body.contract.access.tools, []);
  assert.deepEqual(body.contract.access.permissions, []);
  assert.equal(value.input.includes(f.claimed.leaseToken), false);
  assert.equal(Object.hasOwn(body, 'applicationContext'), false);
  assert.equal(Object.hasOwn(body, 'nativeObservation'), false);
  assert.ok(body.rules.some(rule => /Never claim.*token or cost budget/.test(rule)));
});
test('task-bound checklist enters sealed no-tool input with exact version and saved evidence', () => {
  const f = checklistFixture(), first = buildCompanyInformationInput(f), replay = buildCompanyInformationInput(f);
  const body = JSON.parse(first.input);
  assert.deepEqual(body.referenceSiteChecklist, f.packet.referenceSiteChecklist);
  assert.equal(body.referenceSiteChecklist.items[0].observation.evidence[0].scope, 'supervised_result');
  assert.deepEqual(body.contract.access.tools, []);
  assert.deepEqual(body.contract.access.permissions, []);
  assert.equal(first.inputSeal, replay.inputSeal);
  assert.equal(first.readyRevision, replay.readyRevision);
  f.packet.referenceSiteChecklist.items[0].instruction = 'Changed after Ready.';
  assert.throws(() => buildCompanyInformationInput(f));
});
test('package-only site requires its accepted checklist at native admission', () => {
  const f = checklistFixture();
  assert.equal(JSON.parse(buildCompanyInformationInput(f).input).sources[0].description, null);
  delete f.packet.referenceSiteChecklist;
  seal(f);
  assert.throws(() => buildCompanyInformationInput(f), /company_information_runtime_blocked/);
});
for (const [name, mutate] of [
  ['foreign checklist task', f => { f.packet.referenceSiteChecklist.taskId = randomUUID(); }],
  ['foreign checklist agent', f => { f.packet.referenceSiteChecklist.agentId = randomUUID(); }],
  ['foreign finding task', f => { f.packet.referenceSiteChecklist.items[0].source.taskId = randomUUID(); }],
  ['unselected checklist version', f => { f.packet.contract.procedures.items[0].revision = '2'; }],
  ['changed source review', f => { f.packet.referenceSiteChecklist.items[0].source.sourceReviewId = randomUUID(); }],
  ['unselected source record', f => { f.packet.referenceSiteChecklist.items[0].source.siteId = randomUUID(); }],
  ['source evidence disguised as supervised result', f => { f.packet.referenceSiteChecklist.items[0].observation.evidence[0].kind = 'source'; }],
  ['extra checklist item', f => { f.packet.referenceSiteChecklist.items.push({ ...f.packet.referenceSiteChecklist.items[0], id: randomUUID(), order: 2, itemId: 'second-action' }); }]
]) test(name + ' denied before model admission', () => {
  const f = checklistFixture(); mutate(f); seal(f);
  assert.throws(() => buildCompanyInformationInput(f), /(company_information_runtime_blocked|execution_packet_invalid)/);
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
  ['missing source content denied', f => { const s = f.packet.sources[0]; s.description = ''; s.businessPurpose = ''; s.desiredState = ''; s.expectedBehavior = ''; }],
  ['missing source review denied', f => { delete f.packet.sources[0].provenance; }],
  ['expired source review denied', f => { f.packet.sources[0].provenance.validUntil = new Date(Date.now() - 1000).toISOString(); }],
  ['wrong source environment denied', f => { f.packet.sources[0].provenance.environment = process.env.NODE_ENV === 'test' ? 'production' : 'isolated_test'; }]
]) test(name, () => {
  const f = fixture(); mutate(f); seal(f);
  assert.throws(() => buildCompanyInformationInput(f), /(company_information_runtime_blocked|execution_packet_invalid)/);
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
