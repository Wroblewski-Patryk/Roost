import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseConfigurationPreimage } from './lib/agent-host-release-configuration-preimage.mjs';

const hash = value => value.repeat(64), sha = value => value.repeat(40);
function fixture() {
  const schemaDigest = hash('1'), sourcePins = { queueHelper: hash('2'), deploymentJob: hash('3') };
  const snapshot = { observedAt: '2026-10-02T00:00:00.000Z', sourcePins, schemaDigest,
    targets: ['api', 'web'].map(targetId => ({ targetId, dockerfile: `/apps/${targetId}/Dockerfile` })),
    baselineDeployments: ['api', 'web'].map(targetId => ({ targetId, deploymentId: `old-${targetId}` })),
    rows: ['api', 'web'].map((targetId, index) => ({ configuration: { targetId, applicationId: String(index + 1), buildPack: 'dockerfile',
      dockerfile: `/apps/${targetId}/Dockerfile`, configDigest: hash('4'), schemaDigest, gitCommit: sha('5'), autoDeploy: false, topologyDigest: hash('6') },
    runtime: { targetId, commit: sha(index ? '7' : '8'), tree: sha(index ? '9' : 'a'), imageDigest: `sha256:${hash('b')}`,
      configDigest: hash('4'), schemaDigest, healthy: true, deploymentId: `old-${targetId}` } })), diagnostics: { sourceOnly: true }, claim: 'capture' };
  const r = snapshot.rows[1].runtime, manifest = { deployment: { schemaDigest, targets: [{ targetId: 'web', dockerfile: '/apps/web/Dockerfile',
    configDigest: r.configDigest, baseline: { commit: r.commit, tree: r.tree, imageDigest: r.imageDigest, configDigest: r.configDigest } }] } };
  const parameters = { sourcePins, manifest, baselineDeployments: [{ targetId: 'web', deploymentId: 'old-web' }], since: '2026-10-02T01:00:00.000Z' };
  const parse = () => { const bytes = Buffer.from(JSON.stringify(snapshot)); return parseConfigurationPreimage(bytes,
    { ...parameters, sha256: createHash('sha256').update(bytes).digest('hex') }); };
  return { snapshot, parameters, parse };
}
test('byte-exact original capture accepts wider protected baseline and distinct configuration and runtime SHAs', () => {
  const f = fixture(), original = f.parse();
  assert.equal(original.rows.length, 2); assert.notEqual(original.rows[1].configuration.gitCommit, original.rows[1].runtime.commit);
});
test('absence capture refuses incomplete sets, duplicate rows, unproven safety and mismatched authority', () => {
  for (const mode of ['missing', 'duplicate', 'queue', 'auto', 'future', 'sameTime', 'source', 'schema', 'image', 'config', 'runtime', 'extras', 'size', 'hash']) {
    const f = fixture();
    if (mode === 'missing') f.snapshot.rows.pop();
    if (mode === 'duplicate') f.snapshot.rows[1] = structuredClone(f.snapshot.rows[0]);
    if (mode === 'queue') f.snapshot.rows[1].runtime.deploymentId = 'different';
    if (mode === 'auto') f.snapshot.rows[0].configuration.autoDeploy = true;
    if (['future', 'sameTime'].includes(mode)) f.snapshot.observedAt = mode === 'future' ? '2026-10-02T02:00:00.000Z' : f.parameters.since;
    if (mode === 'source') f.parameters.sourcePins = { ...f.parameters.sourcePins, queueHelper: hash('c') };
    if (mode === 'schema') f.snapshot.schemaDigest = hash('c');
    if (mode === 'image') f.snapshot.rows[1].runtime.imageDigest = `sha256:${hash('c')}`;
    if (mode === 'config') f.snapshot.rows[1].configuration.configDigest = hash('c');
    if (mode === 'runtime') f.snapshot.rows[1].runtime.commit = sha('c');
    if (mode === 'extras') f.snapshot.rows[1].configuration.command = 'untrusted';
    if (mode === 'size') f.snapshot.claim = 'x'.repeat(131072);
    if (mode === 'hash') assert.throws(() => parseConfigurationPreimage(Buffer.from(JSON.stringify(f.snapshot)), { ...f.parameters, sha256: hash('c') }), /preimage_unproven/);
    else assert.throws(f.parse, /preimage_unproven/, mode);
  }
});
