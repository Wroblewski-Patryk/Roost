import test from 'node:test';
import assert from 'node:assert/strict';
import { retainedImageAnchor, qualifyRetentionImage, qualifyRetentionAnchor } from './lib/agent-host-image-retention.mjs';
const image = 'sha256:' + 'a'.repeat(64);
const policy = { schemaVersion: 'roost-retained-image-policy-v1', installationId: '00000000-0000-4000-8000-000000000001', scopeDigest: 'b'.repeat(64), images: [image] };
const plan = retainedImageAnchor(policy, image);
function anchor() { return { Id: 'c'.repeat(64), Name: '/' + plan.name, Image: image,
  Created: '2026-01-01T00:00:00.000Z', State: { Status: 'created', Running: false, Pid: 0 },
  Config: { Image: image, Entrypoint: ['/bin/true'], Labels: { ...plan.labels }, Volumes: null }, Mounts: [],
  HostConfig: { NetworkMode: 'none', ReadonlyRootfs: true, Memory: 16777216, PidsLimit: 4,
    Privileged: false, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges'], PortBindings: {}, Binds: null } }; }
test('retention is explicit stopped storage, never a process, data mount or deployment proof', () => {
  assert.equal(plan.argv[0], 'create'); assert.ok(!plan.argv.includes('start'));
  assert.equal(plan.runtimeStarted, false); assert.equal(qualifyRetentionAnchor(anchor(), plan).deploymentOrHealthProof, false);
  assert.equal(qualifyRetentionImage({ Id: image, Created: '2026-01-01T00:00:00Z', RepoTags: ['example:version'], Config: {} }, plan).declaredVolumes, 0);
});
for (const [name, mutate] of Object.entries({ wrongImage: x => x.Image = 'sha256:' + 'd'.repeat(64),
  running: x => x.State.Running = true, started: x => x.State.Status = 'exited', pid: x => x.State.Pid = 123,
  managed: x => x.Config.Labels['coolify.managed'] = 'true', owner: x => x.Config.Labels['roost.retention.installation'] = 'another',
  mount: x => x.Mounts = [{}], volume: x => x.Config.Volumes = { '/data': {} },
  network: x => x.HostConfig.NetworkMode = 'host', writable: x => x.HostConfig.ReadonlyRootfs = false,
  unrestricted: x => x.HostConfig.Privileged = true, security: x => x.HostConfig.SecurityOpt = [],
  command: x => x.Config.Entrypoint = ['/bin/sh'], name: x => x.Name = '/other',
  bind: x => x.HostConfig.Binds = ['/data:/data'], port: x => x.HostConfig.PortBindings = { '80/tcp': [] } })) {
  test('retention refuses ' + name, () => { const x = anchor(); mutate(x); assert.throws(() => qualifyRetentionAnchor(x, plan)); });
}
test('no arbitrary image, duplicate scope, injected owner or declared anonymous volume', () => {
  assert.throws(() => retainedImageAnchor(policy, 'sha256:' + 'e'.repeat(64)));
  assert.throws(() => retainedImageAnchor({ ...policy, images: [image, image] }, image));
  assert.throws(() => retainedImageAnchor({ ...policy, installationId: 'owner; command' }, image));
  assert.throws(() => qualifyRetentionImage({ Id: image, Created: '2026-01-01T00:00:00Z', RepoTags: ['example:version'], Config: { Volumes: { '/data': {} } } }, plan));
});
