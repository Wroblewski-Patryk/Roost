import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { verifyGuidedPackages, buildGuidedFindingInput, parseGuidedFindingOutput } from './lib/reference-site-guided-findings.mjs';
import { canonicalGuidedAttemptDirectory, reserveGuidedAttempt, recordGuidedOutcome } from './lib/reference-site-guided-admission.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const publisher = fileURLToPath(new URL('./reference-site-guided-publish.mjs', import.meta.url));
const taskId = randomUUID();
const agentId = '66666666-6666-4666-8666-666666666666';
const siteIds = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const reviewIds = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'];
const revision = '2026-10-13T10:00:00.000Z';
const key = 'fixture-agent-key-not-real';
const sha = value => createHash('sha256').update(value).digest('hex');
const siteRoute = '/v1/product-engineering/tasks/:taskId/reference-sites/:siteId';
const packageRoute = `${siteRoute}/package`, findingRoute = `${siteRoute}/findings`;
const contentKeys = ['title', 'category', 'language', 'observed', 'sourceExcerpt', 'interpretation', 'uncertainty', 'applicability'];
const bodyKeys = ['requestId', 'packageDigest', 'observationId', 'siteRevision', 'sourceReviewId', ...contentKeys];
const baseProperties = { taskId: { type: 'string' }, siteId: { type: 'string' } };
const tools = [
  { name: 'get_fixture_package', method: 'GET', path: packageRoute, riskLevel: 'read', requiresApproval: false,
    inputSchema: { type: 'object', additionalProperties: false,
      properties: { ...baseProperties, query: { type: 'object' } }, required: ['taskId', 'siteId'] } },
  { name: 'post_fixture_finding', method: 'POST', path: findingRoute, riskLevel: 'write', requiresApproval: false,
    inputSchema: { type: 'object', additionalProperties: false,
      properties: { ...baseProperties, body: { type: 'object', additionalProperties: false,
        properties: Object.fromEntries(bodyKeys.map(name => [name, { type: 'string' }])), required: bodyKeys } },
      required: ['taskId', 'siteId', 'body'] } }
].map(tool => ({ ...tool, title: tool.name, description: 'Fictional fixture', capability: 'agent-runtime:write' }));

function siteFixture() {
  const responses = siteIds.map((siteId, index) => {
    const url = `https://fixture-${index + 1}.example/`;
    const pkg = { schemaVersion: 'roost-reference-site-package-v1', source: { publishedUrl: url },
      observations: [{ id: `pinned-observation-${index + 1}`, category: 'journey', language: 'en',
        text: `Saved fixture observation ${index + 1}.`, evidence: [{ kind: 'source' }] }] };
    return { taskId, siteId, title: `Fixture ${index + 1}`, status: 'unverified', package: pkg,
      source: { url, recordRevision: revision, sourceReviewId: reviewIds[index], contentDigest: sha(JSON.stringify(pkg)) } };
  });
  const pins = { taskId, sites: responses.map(r => ({ siteId: r.siteId,
    observationId: r.package.observations[0].id, siteRevision: revision,
    sourceReviewId: r.source.sourceReviewId, packageDigest: r.source.contentDigest })) };
  return { pins, responses };
}

async function answerApproval(origin) {
  let page;
  for (let attempt = 0; attempt < 100; attempt++) {
    page = await (await fetch(`${origin}/`)).text();
    if (page.includes('name="nonce"')) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.match(page, /name="nonce"/);
  const nonce = page.match(/name="nonce" value="([a-f0-9]+)"/)[1];
  const csrf = page.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  const digest = page.match(/SHA-256: <code>([a-f0-9]{64})<\/code>/)[1];
  const response = await fetch(`${origin}/decision`, { method: 'POST', headers: {
    Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ nonce, csrf, decision: 'approve', confirmation: digest.slice(-8) }) });
  assert.equal(response.status, 200);
}

test('guided publisher uses the real guarded STDIO bridge once per Site and reads back both Findings', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'roost-guided-publish-'));
  const state = join(directory, 'state');
  await mkdir(state);
  const { pins, responses } = siteFixture();
  const current = verifyGuidedPackages(pins, responses), sealed = buildGuidedFindingInput(current);
  const rawResponse = JSON.stringify({ schemaVersion: 'roost-reference-site-guided-output-v1',
    findings: siteIds.map((siteId, index) => ({ siteId, observationId: pins.sites[index].observationId,
      title: `Fixture finding ${index + 1}`, interpretation: 'A provisional source-only lesson.',
      applicability: 'Independent reviewer must assess this lesson.' })) });
  const proposals = parseGuidedFindingOutput(rawResponse, current).proposals;
  // A unique fixture task uses the actual account-owned fence. USERPROFILE is
  // intentionally unable to redirect it. Remove only the two files we create.
  const attemptDirectory = canonicalGuidedAttemptDirectory();
  const slot = reserveGuidedAttempt({ directory: attemptDirectory, repositoryRoot: root, taskId,
    bundleDigest: current.bundleDigest, inputSeal: sealed.inputSeal });
  const outcome = recordGuidedOutcome(slot, { status: 'candidate_result', outputDigest: sha(rawResponse),
    processReceiptDigest: 'a'.repeat(64) });
  const resultPath = join(state, 'guided-result.json');
  await writeFile(resultPath, JSON.stringify({ schemaVersion: 'roost-g24c-guided-private-result-v1', taskId,
    pins, admission: slot.admission, outcome,
    bundleDigest: current.bundleDigest, inputSeal: sealed.inputSeal,
    outputDigest: sha(rawResponse), rawResponse, parseError: null, proposals }));
  const guardConfigPath = join(state, 'guard.json');
  await writeFile(guardConfigPath, JSON.stringify({ schemaVersion: 'roost-reference-site-mcp-guard-v1', taskId,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), stateDirectory: state, sites: pins.sites }));
  const writes = [], found = new Map();
  const server = createServer(async (request, response) => {
    assert.equal(request.headers['x-api-key'], key);
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/v1/mcp/manifest') { response.end(JSON.stringify({ data: { tools } })); return; }
    const index = siteIds.findIndex(id => request.url?.includes(`/${id}/`));
    if (index < 0) { response.writeHead(404); response.end('{}'); return; }
    if (request.method === 'GET' && request.url.endsWith('/package')) {
      response.end(JSON.stringify({ data: responses[index] })); return;
    }
    if (request.method === 'POST') {
      let raw = ''; for await (const bytes of request) raw += bytes;
      const body = JSON.parse(raw); writes.push({ index, body });
      const findingId = `${index + 7}7777777-7777-4777-8777-777777777777`;
      found.set(index, { id: findingId, body, actorId: agentId, verification: 'unverified',
        findingDigest: sha(raw), review: null });
      response.writeHead(201); response.end(JSON.stringify({ data: { record: { id: findingId }, replayed: false } }));
      return;
    }
    if (request.method === 'GET' && request.url.endsWith('/findings')) {
      response.end(JSON.stringify({ data: { items: found.has(index) ? [found.get(index)] : [] } })); return;
    }
    response.writeHead(404); response.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const configPath = join(state, 'publish.json');
  await writeFile(configPath, JSON.stringify({ schemaVersion: 'roost-g24c-guided-publish-v1',
    baseUrl: `http://127.0.0.1:${server.address().port}/`, resultPath, guardConfigPath, stateDirectory: state, agentId }));
  t.after(async () => { await new Promise(resolve => server.close(resolve));
    await unlink(slot.outcomePath); await unlink(slot.path);
    await rm(directory, { recursive: true, force: true }); });

  async function run(index) {
    const child = spawn(process.execPath, [publisher, '--config', configPath, '--site', String(index)],
      { cwd: root, env: { ...process.env, USERPROFILE: join(directory, 'unused-home'), COMPANYCORE_API_KEY: key },
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '', origin = null;
    child.stdout.on('data', bytes => { stdout += bytes.toString('utf8');
      origin ??= stdout.match(/Exact Finding review: (http:\/\/127\.0\.0\.1:\d+)\//)?.[1]; });
    child.stderr.on('data', bytes => { stderr += bytes.toString('utf8'); });
    for (let n = 0; n < 150 && !origin && child.exitCode === null; n++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(origin, stderr || stdout);
    for (let n = 0; n < 100 && !stdout.includes('Awaiting separate exact owner decision'); n++)
      await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(writes.length, index - 1, 'POST must wait for exact owner approval');
    await answerApproval(origin);
    const exit = await new Promise(resolve => child.once('exit', resolve));
    assert.equal(exit, 0, stderr || stdout);
    assert.match(stdout, /finding_confirmed_unverified/);
  }
  await run(1);
  await run(2);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(item => item.index), [0, 1]);
  assert.deepEqual(Object.keys(writes[0].body).sort(), bodyKeys.slice().sort());
  assert.equal(writes[0].body.observed, responses[0].package.observations[0].text);
  assert.equal(writes[1].body.observed, responses[1].package.observations[0].text);
  assert.ok(JSON.parse(await readFile(join(state, `g24c-${taskId}-site-1.confirmed.json`), 'utf8')).findingId);
  assert.ok(JSON.parse(await readFile(join(state, `g24c-${taskId}-site-2.confirmed.json`), 'utf8')).findingId);
});

test('a self-consistent result file without the durable native attempt cannot publish', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roost-guided-no-admission-'));
  try {
    const state = join(directory, 'state');
    await mkdir(state);
    const resultPath = join(state, 'result.json'), guardConfigPath = join(state, 'guard.json');
    await writeFile(resultPath, JSON.stringify({ taskId, schemaVersion: 'roost-g24c-guided-private-result-v1' }));
    await writeFile(guardConfigPath, '{}');
    const configPath = join(state, 'publish.json');
    await writeFile(configPath, JSON.stringify({ schemaVersion: 'roost-g24c-guided-publish-v1',
      baseUrl: 'http://127.0.0.1:1/', resultPath, guardConfigPath, stateDirectory: state, agentId }));
    const child = spawn(process.execPath, [publisher, '--config', configPath, '--site', '1'],
      { cwd: root, env: { ...process.env, USERPROFILE: join(directory, 'unused-home'), COMPANYCORE_API_KEY: key },
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const exit = await new Promise(resolve => child.once('exit', resolve));
    assert.equal(exit, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
