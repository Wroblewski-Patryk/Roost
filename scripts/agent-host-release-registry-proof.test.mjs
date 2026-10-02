import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync, linkSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createReleaseRegistryProof, fixedRegistryProofRead } from './lib/agent-host-release-registry-proof.mjs';
import { createReleaseImageCleanup } from './lib/agent-host-release-image-cleanup.mjs';

const media = { index: 'application/vnd.oci.image.index.v1+json', manifest: 'application/vnd.oci.image.manifest.v1+json',
  config: 'application/vnd.oci.image.config.v1+json' };
const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
function fixture({ source = 'https://github.com/example/release-cert', emptyAttestation = false, attestationSubject, cacheDirectory } = {}) {
  const objects = new Map(), calls = [], state = {};
  const add = value => { const body = Buffer.from(JSON.stringify(value)), digest = sha(body); objects.set(digest, body); return { digest, size: body.length }; };
  const config = add({ architecture: 'amd64', os: 'linux', config: { Labels: { 'org.opencontainers.image.source': source } } });
  const image = add({ schemaVersion: 2, mediaType: media.manifest, config: { ...config, mediaType: media.config }, layers: [] });
  const attestationConfig = add(emptyAttestation ? {} : { architecture: 'unknown', os: 'unknown' });
  const attestation = add({ schemaVersion: 2, mediaType: media.manifest,
    config: { ...attestationConfig, mediaType: emptyAttestation ? 'application/vnd.oci.empty.v1+json' : media.config },
    layers: [{ mediaType: 'application/vnd.in-toto+json', digest: `sha256:${'e'.repeat(64)}`, size: 42 }] });
  const publication = add({ schemaVersion: 2, mediaType: media.index, manifests: [
    { ...image, mediaType: media.manifest, platform: { architecture: 'amd64', os: 'linux' } },
    { ...attestation, mediaType: media.manifest, platform: { architecture: 'unknown', os: 'unknown' },
      annotations: { 'vnd.docker.reference.type': 'attestation-manifest', 'vnd.docker.reference.digest': attestationSubject ?? image.digest } },
  ] });
  const args = { imageRepository: 'ghcr.io/example/release-cert', publicationDigest: publication.digest,
    imageDigest: image.digest, repositoryUrl: 'https://github.com/example/release-cert.git', token: 'private-token' };
  const transport = async request => {
    calls.push(request);
    if (state.offline) throw Error('private diagnostic');
    const url = new URL(request.url);
    if (url.pathname === '/token') return { status: 200, headers: {}, body: Buffer.from(JSON.stringify({ token: 'pull-only-bearer' })) };
    const digest = url.pathname.split('/').at(-1), body = objects.get(digest);
    if (state.redirect && url.hostname === 'ghcr.io' && url.pathname.includes('/blobs/')) return {
      status: 307, headers: { location: typeof state.redirect === 'string' ? state.redirect
        : `https://pkg-containers.githubusercontent.com/ghcrblobs03/blobs/${digest}?sig=private-query` }, body: Buffer.alloc(0) };
    return { status: body ? 200 : 404, headers: {}, body: state.tamper === digest ? Buffer.from('{}') : body ?? Buffer.alloc(0) };
  };
  return { proof: createReleaseRegistryProof({ transport, cacheDirectory }), args, state, calls, publication, config, image, attestation, transport };
}

const cacheFixture = t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'roost-registry-proof-'));
  t.after(() => rmSync(directory, { recursive: true, force: true })); return directory;
};

test('hashes immutable index, image manifest, attestation and every config; exact source proves child membership', async () => {
  const x = fixture(); const proof = await x.proof(x.args);
  assert.equal(proof.provenanceVerified, true);
  assert.deepEqual(proof.memberDigests, [x.publication.digest, x.image.digest, x.attestation.digest].sort());
  assert.equal(proof.repositoryUrl, 'https://github.com/example/release-cert');
  assert.equal(x.calls.length, 6);
  assert.equal(x.calls.every(row => row.maxBytes <= 1048576), true);
  assert.equal(x.calls[0].url, 'https://ghcr.io/token?service=ghcr.io&scope=repository%3Aexample%2Frelease-cert%3Apull');
});
test('the publication root and attestation version are members of the proven index', async () => {
  const x = fixture({ emptyAttestation: true });
  assert.equal((await x.proof({ ...x.args, imageDigest: x.publication.digest })).provenanceVerified, true);
  assert.equal((await x.proof({ ...x.args, imageDigest: x.attestation.digest })).provenanceVerified, true);
});
test('single immutable image manifest also proves its actual source config', async () => {
  const x = fixture(); const result = await x.proof({ ...x.args, publicationDigest: x.image.digest });
  assert.deepEqual(result.memberDigests, [x.image.digest]);
});
test('wrong repository source is denied even when all supplied digests hash correctly', async () => {
  const x = fixture({ source: 'https://github.com/example/shared' });
  await assert.rejects(x.proof(x.args), /source_unproven/);
});
test('foreign child and wrong publication digest do not prove ownership', async () => {
  const x = fixture();
  await assert.rejects(x.proof({ ...x.args, imageDigest: `sha256:${'f'.repeat(64)}` }), /membership_unproven/);
  await assert.rejects(x.proof({ ...x.args, publicationDigest: `sha256:${'f'.repeat(64)}` }), /digest_unproven/);
});
test('orphan attestation is denied despite correct manifest hashes', async () => {
  const x = fixture({ attestationSubject: `sha256:${'d'.repeat(64)}` });
  await assert.rejects(x.proof(x.args), /membership_unproven/);
});
for (const part of ['publication', 'config']) test(`tampered ${part} bytes cannot substitute immutable content`, async () => {
  const x = fixture(); x.state.tamper = x[part].digest;
  await assert.rejects(x.proof(x.args), /digest_unproven/);
});
test('signed blob redirect uses exact fixed host and digest path with no authorization forwarding', async () => {
  const x = fixture(); x.state.redirect = true;
  await x.proof(x.args);
  const storage = x.calls.filter(row => new URL(row.url).hostname === 'pkg-containers.githubusercontent.com');
  assert.equal(storage.length, 2);
  for (const request of storage) {
    assert.equal(request.headers.Authorization, undefined);
    assert.equal(JSON.stringify(request.headers).includes('private-token'), false);
    assert.equal(JSON.stringify(request.headers).includes('pull-only-bearer'), false);
  }
});
for (const url of [
  'http://pkg-containers.githubusercontent.com/ghcr1/blobs/sha256:' + 'a'.repeat(64),
  'https://evil.example/ghcr1/blobs/sha256:' + 'a'.repeat(64),
  'https://pkg-containers.githubusercontent.com/arbitrary/sha256:' + 'a'.repeat(64),
  'https://pkg-containers.githubusercontent.com/ghcr1/blobs/sha256:' + 'a'.repeat(64),
]) test('rejects redirect outside exact TLS storage path and digest without forwarding token', async () => {
  const x = fixture(); x.state.redirect = url;
  await assert.rejects(x.proof(x.args), /redirect_invalid/);
  assert.equal(x.calls.some(row => new URL(row.url).hostname !== 'ghcr.io'), false);
});
test('invalid scope and credential fail before a network request', async () => {
  const x = fixture();
  await assert.rejects(x.proof({ ...x.args, imageRepository: 'registry.example/example/release-cert' }), /repository_scope_invalid/);
  await assert.rejects(x.proof({ ...x.args, token: 'token\r\nleak' }), /credential_unavailable/);
  assert.equal(x.calls.length, 0);
});
test('native HTTPS transport rejects arbitrary host and unbounded responses before requesting', () => {
  assert.throws(() => fixedRegistryProofRead({ url: 'https://evil.example/v2/', headers: {}, maxBytes: 1024 }), /https_scope_invalid/);
  assert.throws(() => fixedRegistryProofRead({ url: 'https://ghcr.io/v2/', headers: {}, maxBytes: 1048577 }), /response_bound_invalid/);
});

test('raw immutable graph is atomically persisted without authentication metadata and reverified offline after restart', async t => {
  const cacheDirectory = cacheFixture(t), x = fixture({ cacheDirectory });
  await x.proof(x.args);
  const files = readdirSync(cacheDirectory); assert.equal(files.length, 1); assert.match(files[0], /^publication-[a-f0-9]{64}\.json$/);
  const raw = readFileSync(path.join(cacheDirectory, files[0]), 'utf8');
  for (const sensitive of ['private-token', 'pull-only-bearer', 'Authorization', 'private-query', 'headers']) assert.equal(raw.includes(sensitive), false);
  const persisted = JSON.parse(raw); assert.equal(persisted.objects.length, 5);
  x.state.offline = true; x.calls.length = 0;
  const restarted = createReleaseRegistryProof({ cacheDirectory, transport: x.transport });
  assert.equal((await restarted(x.args)).provenanceVerified, true);
  assert.equal((await restarted({ ...x.args, imageDigest: x.attestation.digest })).provenanceVerified, true);
  assert.equal(x.calls.length, 0);
});
test('cache-only authority rejects a missing archive before network reads or cache writes',async t=>{
 const cacheDirectory=cacheFixture(t),x=fixture({cacheDirectory});
 await assert.rejects(x.proof({...x.args,cacheOnly:true}),/cache_required/);
 assert.equal(x.calls.length,0);assert.deepEqual(readdirSync(cacheDirectory),[]);
 await x.proof(x.args);x.calls.length=0;x.state.offline=true;
 assert.equal((await x.proof({...x.args,cacheOnly:true})).provenanceVerified,true);assert.equal(x.calls.length,0);
});
test('changed persisted bytes or bindings are rejected, never replaced by a network fallback', async t => {
  const cacheDirectory = cacheFixture(t), x = fixture({ cacheDirectory }); await x.proof(x.args);
  const filename = path.join(cacheDirectory, readdirSync(cacheDirectory)[0]), original = readFileSync(filename, 'utf8');
  const poisoned = JSON.parse(original); poisoned.objects[0].bodyBase64 = Buffer.from('{}').toString('base64'); writeFileSync(filename, JSON.stringify(poisoned));
  x.calls.length = 0;
  await assert.rejects(createReleaseRegistryProof({ cacheDirectory, transport: x.transport })(x.args), /cache_digest_unproven/);
  assert.equal(x.calls.length, 0);
  await assert.rejects(createReleaseRegistryProof({cacheDirectory,transport:x.transport})({...x.args,cacheOnly:true}),/cache_digest_unproven/);
  const wrong = JSON.parse(original); wrong.repositoryUrl = 'https://github.com/example/shared'; writeFileSync(filename, JSON.stringify(wrong));
  await assert.rejects(createReleaseRegistryProof({ cacheDirectory, transport: x.transport })(x.args), /cache_record_invalid/);
  assert.equal(x.calls.length, 0);
});
test('a standalone receipt boolean cannot substitute raw graph bytes', async t => {
  const cacheDirectory = cacheFixture(t), x = fixture({ cacheDirectory }); await x.proof(x.args);
  writeFileSync(path.join(cacheDirectory, readdirSync(cacheDirectory)[0]), JSON.stringify({ provenanceVerified: true, publicationDigest: x.publication.digest }));
  await assert.rejects(createReleaseRegistryProof({ cacheDirectory, transport: x.transport })(x.args), /cache_record_invalid/);
});
test('private cache rejects repository paths and hardlinked files', async t => {
  const directory = cacheFixture(t), checkout = path.join(directory, 'checkout'); mkdirSync(checkout); mkdirSync(path.join(checkout, '.git'));
  assert.throws(() => createReleaseRegistryProof({ cacheDirectory: checkout }), /cache_path_invalid/);
  assert.throws(() => createReleaseRegistryProof({ cacheDirectory: '../relative' }), /cache_path_invalid/);
  const x = fixture({ cacheDirectory: directory }); await x.proof(x.args);
  const filename = path.join(directory, readdirSync(directory).find(name => name.endsWith('.json')));
  linkSync(filename, path.join(directory, 'foreign-alias'));
  await assert.rejects(createReleaseRegistryProof({ cacheDirectory: directory, transport: x.transport })(x.args), /cache_file_invalid/);
});
test('replaced private cache directory identity is rejected before accessing the network', async t => {
  const parent = cacheFixture(t), directory = path.join(parent, 'cache'); mkdirSync(directory);
  const x = fixture({ cacheDirectory: directory }); renameSync(directory, path.join(parent, 'saved')); mkdirSync(directory);
  await assert.rejects(x.proof(x.args), /cache_directory_changed/); assert.equal(x.calls.length, 0);
});
test('cleanup restart after uncertain child deletion reconciles by REST reads and proves surviving index from persisted graph', async t => {
  const cacheDirectory = cacheFixture(t), x = fixture({ cacheDirectory }), present = new Set([1, 2]), deletes = [];
  const createdAt = '2026-10-01T10:00:00Z';
  const ownership = { schemaVersion: 'roost-release-image-ownership-v1', releaseId: 'a315fcb3-4c1b-4b57-9eb8-812fb1885615',
    applicationId: '126c0031-e8eb-44c9-ab04-fd3d11d1bf89', targetId: 'cert_target', repositoryUrl: x.args.repositoryUrl,
    registryOwner: 'example', registryOwnerType: 'user', actorLogin: 'example', packageName: 'release-cert', packageId: 123,
    resources: [x.image.digest, x.publication.digest].map((imageDigest, index) => ({ kind: 'ghcr_version', resourceId: `version_${index + 1}`,
      imageRepository: x.args.imageRepository, imageDigest, publicationDigest: x.publication.digest, versionId: index + 1,
      createdAt, tags: [], temporary: true })) };
  const githubTransport = async ({ path: route, method }) => {
    if (route === '/user') return { status: 200, body: { login: 'example' }, scopes: ['write:packages', 'delete:packages'] };
    if (route.startsWith('/repos/')) return { status: 200, body: { full_name: 'example/release-cert', private: true } };
    if (!route.includes('/versions/')) return { status: 200, body: { id: 123, name: 'release-cert', package_type: 'container', owner: { login: 'example' }, visibility: 'private' } };
    const id = Number(route.split('/').at(-1));
    if (method === 'DELETE') { deletes.push(id); present.delete(id); x.state.offline = true; if (id === 1) throw Error('lost response'); return { status: 204, body: null }; }
    return present.has(id) ? { status: 200, body: { id, name: ownership.resources[id - 1].imageDigest, created_at: createdAt,
      metadata: { package_type: 'container', container: { tags: [] } } } } : { status: 404, body: null };
  };
  const adapter = () => createReleaseImageCleanup({ ownership, readOwnership: async () => ownership, applicationAbsent: async () => true,
    githubCredential: async () => 'private-token', githubTransport, registryProof: createReleaseRegistryProof({ cacheDirectory, transport: x.transport }) });
  await assert.rejects(adapter().removeResource('version_1'), error => error.uncertain === true);
  const restarted = adapter(); assert.equal((await restarted.reconcileResource('version_1')).status, 'succeeded');
  assert.deepEqual(await restarted.removeResource('version_2'), { absenceVerified: true, resourceIds: ['version_2'] });
  assert.deepEqual(deletes, [1, 2]); assert.equal((await restarted.verifyCleanup()).absenceVerified, true);
});
