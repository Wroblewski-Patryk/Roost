import test from 'node:test';
import assert from 'node:assert/strict';
import { createReleaseImageCleanup, createFixedDockerImageCleanupTransport, githubImageCleanupJson } from './lib/agent-host-release-image-cleanup.mjs';

const imageDigest = `sha256:${'a'.repeat(64)}`, imageId = `sha256:${'b'.repeat(64)}`;
const repository = 'ghcr.io/example/release-cert';
const createdAt = '2026-10-01T10:00:00Z';
const ownership = () => ({ schemaVersion: 'roost-release-image-ownership-v1', releaseId: 'a315fcb3-4c1b-4b57-9eb8-812fb1885615',
  applicationId: '126c0031-e8eb-44c9-ab04-fd3d11d1bf89', targetId: 'cert_target', repositoryUrl: 'https://github.com/example/release-cert.git',
  registryOwner: 'example', registryOwnerType: 'user', actorLogin: 'example', packageName: 'release-cert', packageId: 123,
  resources: [
    { resourceId: 'image_local', kind: 'docker_image', engine: 'local', imageRepository: repository, imageDigest, imageId,
      createdAt, tags: [`${repository}:candidate`], temporary: true },
    { resourceId: 'image_vps', kind: 'docker_image', engine: 'vps', imageRepository: repository, imageDigest, imageId,
      createdAt, tags: [], temporary: true },
    { resourceId: 'image_registry', kind: 'ghcr_version', imageRepository: repository, imageDigest, versionId: 456,
      publicationDigest: imageDigest,
      createdAt, tags: ['candidate'], temporary: true },
  ] });

function fixture() {
  const ledger = ownership(), calls = [], present = { local: true, vps: true, registry: true };
  const state = { ledger, appAbsent: true, lost: null, denied: false, packageMissing: false,
    dockerExtra: {}, versionExtra: {}, packageExtra: {}, repoExtra: {}, userExtra: {},
    package: { id: 123, name: 'release-cert', package_type: 'container', owner: { login: 'example' }, visibility: 'private',
      repository: { full_name: 'example/release-cert', private: true } } };
  const dockerTransport = async args => {
    calls.push({ ...args });
    if (args.operation === 'remove') {
      if (state.lost === 'docker_before') throw Error('secret raw error');
      present[args.engine] = false;
      if (state.lost === 'docker_after') throw Error('secret raw error');
      return { removed: true };
    }
    return present[args.engine] ? { exists: true, engine: args.engine, daemonId: `daemon_${args.engine}`, imageId, createdAt,
      repoDigests: [`${repository}@${imageDigest}`], tags: args.engine === 'local' ? [`${repository}:candidate`] : [],
      containers: [], ...state.dockerExtra } : { exists: false, engine: args.engine, daemonId: `daemon_${args.engine}` };
  };
  const githubTransport = async args => {
    calls.push({ ...args, token: '[hidden]' });
    if (state.denied) return { status: 403, body: { message: 'secret raw error' } };
    if (args.path === '/user') return { status: 200, body: { login: 'example', ...state.userExtra }, scopes: state.scopes ?? ['read:packages', 'delete:packages'] };
    if (args.path.startsWith('/repos/')) return { status: 200, body: { full_name: 'example/release-cert', private: true, ...state.repoExtra } };
    if (!args.path.includes('/versions/')) return state.packageMissing ? { status: 404, body: null }
      : { status: 200, body: { ...state.package, ...state.packageExtra } };
    if (args.method === 'DELETE') {
      if (state.lost === 'registry_before') throw Error('raw secret');
      present.registry = false;
      if (state.lost === 'registry_after') throw Error('raw secret');
      return { status: 204, body: null };
    }
    return present.registry ? { status: 200, body: { id: 456, name: imageDigest, created_at: createdAt,
      metadata: { package_type: 'container', container: { tags: ['candidate'] } }, ...state.versionExtra } }
      : { status: 404, body: null };
  };
  const adapter = createReleaseImageCleanup({ ownership: ledger, readOwnership: async () => state.ledger,
    applicationAbsent: async () => state.appAbsent, dockerTransport, githubCredential: async () => 'fake-sensitive-token', githubTransport,
    registryProof: async args => ({ provenanceVerified: true, publicationDigest: args.publicationDigest, imageDigest: args.imageDigest,
      imageRepository: args.imageRepository, repositoryUrl: args.repositoryUrl.replace(/\.git$/, ''), memberDigests: [args.imageDigest], ...state.proofExtra }) });
  return { adapter, state, calls, present };
}

test('removes exact local and VPS images only, verifies each absence and retains daemon separation', async () => {
  const { adapter, calls, present } = fixture();
  for (const id of ['image_local', 'image_vps']) assert.deepEqual(await adapter.removeResource(id), { absenceVerified: true, resourceIds: [id] });
  const removes = calls.filter(row => row.operation === 'remove');
  assert.deepEqual(removes, [{ operation: 'remove', engine: 'local', imageId }, { operation: 'remove', engine: 'vps', imageId }]);
  assert.equal(present.registry, true);
});
test('deletes only the exact GHCR version, verifies absence, never deletes the package', async () => {
  const { adapter, calls } = fixture();
  await adapter.removeResource('image_registry');
  const mutations = calls.filter(row => row.method === 'DELETE');
  assert.deepEqual(mutations.map(row => row.path), ['/user/packages/container/release-cert/versions/456']);
  assert.equal((await adapter.reconcileResource('image_registry')).status, 'succeeded');
});

test('normalized write scope includes package reads but never supplies deletion authority', async () => {
  const x = fixture(); x.state.scopes = ['repo', 'write:packages', 'delete:packages'];
  await x.adapter.removeResource('image_registry');
  assert.equal(x.calls.filter(row => row.method === 'DELETE').length, 1);
  const denied = fixture(); denied.state.scopes = ['repo', 'write:packages'];
  await assert.rejects(denied.adapter.removeResource('image_registry'), /github_authority_unproven/);
  assert.equal(denied.calls.some(row => row.method === 'DELETE'), false);
});
test('existing absence is proven by reads without issuing any removal', async () => {
  const { adapter, calls, present } = fixture(); present.local = false; present.registry = false;
  await adapter.removeResource('image_local'); await adapter.removeResource('image_registry');
  assert.equal(calls.some(row => row.operation === 'remove' || row.method === 'DELETE'), false);
});
test('an existing app prevents all image effects', async () => {
  const { adapter, state, calls } = fixture(); state.appAbsent = false;
  await assert.rejects(adapter.removeResource('image_local'), /application_present/);
  assert.equal(calls.length, 0);
});
for (const [label, extra] of [
  ['foreign image ID', { imageId: `sha256:${'c'.repeat(64)}` }],
  ['changed creation time', { createdAt: '2026-10-01T10:00:01Z' }],
  ['foreign digest reference', { repoDigests: [`shared.example/base@${imageDigest}`] }],
  ['additional shared reference', { repoDigests: [`${repository}@${imageDigest}`, `ghcr.io/example/shared@${imageDigest}`] }],
  ['additional tag', { tags: [`${repository}:candidate`, `${repository}:shared`] }],
  ['container in use, including stopped containers', { containers: ['f'.repeat(64)] }],
]) test(`preserves Docker image with ${label}`, async () => {
  const { adapter, state, calls } = fixture(); state.dockerExtra = extra;
  await assert.rejects(adapter.removeResource('image_local'), /docker_(identity_changed|image_in_use)/);
  assert.equal(calls.some(row => row.operation === 'remove'), false);
});
for (const [label, extra] of [
  ['version ID', { id: 457 }], ['digest', { name: `sha256:${'c'.repeat(64)}` }],
  ['creation time', { created_at: '2026-10-01T11:00:00Z' }],
  ['tag scope', { metadata: { package_type: 'container', container: { tags: ['candidate', 'shared'] } } }],
]) test(`preserves GHCR version after changed ${label}`, async () => {
  const { adapter, state, calls } = fixture(); state.versionExtra = extra;
  await assert.rejects(adapter.removeResource('image_registry'), /github_version_changed/);
  assert.equal(calls.some(row => row.method === 'DELETE'), false);
});
for (const [label, field, extra] of [
  ['package owner', 'packageExtra', { owner: { login: 'foreign' } }],
  ['public package', 'packageExtra', { visibility: 'public' }],
  ['wrong package name', 'packageExtra', { name: 'shared' }],
  ['foreign linked repository', 'packageExtra', { repository: { full_name: 'example/other', private: true } }],
  ['public repository', 'repoExtra', { private: false }],
  ['wrong actor', 'userExtra', { login: 'other' }],
]) test(`preserves GHCR version after ${label}`, async () => {
  const { adapter, state, calls } = fixture(); state[field] = extra;
  await assert.rejects(adapter.removeResource('image_registry'), /github_(package_changed|repository_changed|authority_unproven)/);
  assert.equal(calls.some(row => row.method === 'DELETE'), false);
});
test('current REST omission of repository requires OCI source proof; conflicting optional projection is still denied', async () => {
  const x = fixture(); delete x.state.package.repository;
  await x.adapter.removeResource('image_registry');
  const denied = fixture(); delete denied.state.package.repository; denied.state.proofExtra = { provenanceVerified: false };
  await assert.rejects(denied.adapter.removeResource('image_registry'), /registry_provenance_unproven/);
  assert.equal(denied.calls.some(row => row.method === 'DELETE'), false);
});
test('changed external ledger or unowned resource is rejected before effects', async () => {
  const { adapter, state, calls } = fixture();
  await assert.rejects(adapter.removeResource('base_image'), /resource_unowned/);
  state.ledger = { ...state.ledger, targetId: 'other' };
  await assert.rejects(adapter.removeResource('image_local'), /ownership_changed/);
  assert.equal(calls.length, 0);
});
for (const [kind, id] of [['docker', 'image_local'], ['registry', 'image_registry']]) {
  test(`${kind} response lost after deletion is reconciled by reads, never a second mutation`, async () => {
    const { adapter, state, calls } = fixture(); state.lost = `${kind}_after`;
    await assert.rejects(adapter.removeResource(id), error => error.uncertain === true && !error.message.includes('secret'));
    assert.equal((await adapter.reconcileResource(id)).status, 'succeeded');
    await adapter.removeResource(id);
    assert.equal(calls.filter(row => row.operation === 'remove' || row.method === 'DELETE').length, 1);
  });
  test(`${kind} response lost before deletion leaves an uncertain hold without retry`, async () => {
    const { adapter, state, calls } = fixture(); state.lost = `${kind}_before`;
    await assert.rejects(adapter.removeResource(id), error => error.uncertain === true);
    assert.equal((await adapter.reconcileResource(id)).status, 'uncertain');
    await assert.rejects(adapter.removeResource(id), /mutation_already_dispatched/);
    assert.equal(calls.filter(row => row.operation === 'remove' || row.method === 'DELETE').length, 1);
  });
}
test('403 and absent package metadata never stand in for version absence', async () => {
  const { adapter, state } = fixture(); state.denied = true;
  await assert.rejects(adapter.reconcileResource('image_registry'), /github_response_unproven/);
  state.denied = false; state.packageMissing = true;
  await assert.rejects(adapter.reconcileResource('image_registry'), /github_package_changed/);
});
test('native helper denies package-wide DELETE before accessing a token or network', async () => {
  assert.throws(() => githubImageCleanupJson({ path: '/user/packages/container/release-cert', method: 'DELETE', token: 'fake' }), /github_delete_scope_invalid/);
  assert.throws(() => githubImageCleanupJson({ path: '/repos/example/release-cert', method: 'DELETE', token: 'fake' }), /github_delete_scope_invalid/);
  assert.throws(() => githubImageCleanupJson({ path: '/user', method: 'GET', token: 'secret\r\nheader' }), /credential_unavailable/);
});
test('fixed Docker transport refuses malformed IDs and arbitrary operations without process launch', async () => {
  const run = createFixedDockerImageCleanupTransport({ sshHost: 'test-vps' });
  await assert.rejects(run({ operation: 'remove', engine: 'vps', imageId: 'base; docker prune' }), /docker_scope_invalid/);
  await assert.rejects(run({ operation: 'prune', engine: 'vps', imageId }), /docker_operation_invalid/);
  assert.throws(() => createFixedDockerImageCleanupTransport({ sshHost: 'host;command' }), /ssh_configuration_invalid/);
});
test('verification accounts for every recorded owned image', async () => {
  const { adapter, present } = fixture();
  await assert.rejects(adapter.verifyCleanup(), /resource_present/);
  present.local = false; present.vps = false; present.registry = false;
  assert.deepEqual(await adapter.verifyCleanup(), { absenceVerified: true, resourceIds: ['image_local', 'image_vps', 'image_registry'] });
});
test('concurrent requests reserve one image mutation before dispatch', async () => {
  const { adapter, state, calls } = fixture(); state.lost = 'registry_before';
  const result = await Promise.allSettled([adapter.removeResource('image_registry'), adapter.removeResource('image_registry')]);
  assert.equal(result.every(item => item.status === 'rejected'), true);
  assert.equal(calls.filter(row => row.method === 'DELETE').length, 1);
});
