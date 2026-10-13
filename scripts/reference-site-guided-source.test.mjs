import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fetchGuidedPackages } from './lib/reference-site-guided-source.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const taskId = '11111111-1111-4111-8111-111111111111';
const siteIds = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const revision = '2026-10-13T10:00:00.000Z';
const apiKey = 'fixture-agent-key-not-real';
function fixture() {
  const responses = siteIds.map((siteId, index) => {
    const sourceUrl = `https://site-${index + 1}.example/`;
    const pkg = { schemaVersion: 'roost-reference-site-package-v1', source: { publishedUrl: sourceUrl },
      observations: [{ id: `pinned-observation-${index + 1}`, category: 'journey', language: 'en',
        text: `Saved observation ${index + 1}`, evidence: [{ kind: 'source' }] }] };
    return { taskId, siteId, status: 'unverified', title: `Site ${index + 1}`, package: pkg,
      source: { url: sourceUrl, recordRevision: revision,
        sourceReviewId: `${index + 4}4444444-4444-4444-8444-444444444444`, contentDigest: sha(pkg) } };
  });
  const pins = { taskId, sites: responses.map(r => ({ siteId: r.siteId,
    observationId: r.package.observations[0].id, siteRevision: revision,
    sourceReviewId: r.source.sourceReviewId, packageDigest: r.source.contentDigest })) };
  return { pins, responses };
}

test('real HTTP adapter reads exactly two task-bound packages and rejects redirects or drift', async () => {
  const { pins, responses } = fixture();
  const paths = [];
  let mode = 'ok';
  const server = createServer((req, res) => {
    paths.push(req.url);
    assert.equal(req.headers['x-api-key'], apiKey);
    if (mode === 'redirect') { res.writeHead(302, { location: 'https://other.example/' }); res.end(); return; }
    const index = siteIds.findIndex(id => req.url?.endsWith(`/${id}/package`));
    const body = structuredClone(responses[index]);
    if (mode === 'drift' && index === 1) body.source.recordRevision = '2026-10-13T11:00:00.000Z';
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: body }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/`;
    const value = await fetchGuidedPackages({ baseUrl, apiKey, pins });
    assert.equal(value.packages.length, 2);
    assert.deepEqual(paths, siteIds.map(id => `/v1/product-engineering/tasks/${taskId}/reference-sites/${id}/package`));
    mode = 'drift';
    await assert.rejects(fetchGuidedPackages({ baseUrl, apiKey, pins }), /source_changed/);
    mode = 'redirect';
    await assert.rejects(fetchGuidedPackages({ baseUrl, apiKey, pins }), /response_invalid/);
  } finally { server.close(); }
});
