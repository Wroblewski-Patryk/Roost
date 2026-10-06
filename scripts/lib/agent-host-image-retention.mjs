import { createHash } from 'node:crypto';
import { z } from 'zod';

const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const imageRetentionPolicySchema = z.object({
  schemaVersion: z.literal('roost-retained-image-policy-v1'),
  installationId: z.string().uuid(),
  scopeDigest: z.string().regex(/^[a-f0-9]{64}$/),
  images: z.array(digest).min(1).max(16)
}).strict().refine(p => new Set(p.images).size === p.images.length);
const fail = () => { throw new Error('retained_image_unproven'); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A stopped, non-Coolify container anchors an immutable image. Installed
// Coolify cleanup prunes only managed stopped containers and never forces
// application image removal. This is storage retention, not an app runtime,
// an archive, a healthy baseline or permission to deploy the image.
export function retainedImageAnchor(policy, image) {
  const p = imageRetentionPolicySchema.parse(policy);
  if (!p.images.includes(image)) fail();
  const owner = createHash('sha256').update(p.installationId).digest('hex').slice(0, 12);
  const name = `roost-retain-${owner}-${image.slice(7, 31)}`;
  const labels = { 'roost.retention.version': '1', 'roost.retention.installation': p.installationId,
    'roost.retention.image': image, 'coolify.managed': 'false' };
  return { name, image, labels, argv: ['create', '--name', name, '--network', 'none',
    '--read-only', '--memory', '16777216', '--pids-limit', '4', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--entrypoint', '/bin/true',
    ...Object.entries(labels).flatMap(([k, v]) => ['--label', `${k}=${v}`]), image],
    runtimeStarted: false, applicationEnvironment: false, sourceWrites: false };
}

export function qualifyRetentionImage(observed, plan) {
  if (observed?.Id !== plan.image || !Array.isArray(observed.RepoTags)
    || !observed.RepoTags.length || observed.RepoTags.length > 32
    || !Number.isFinite(Date.parse(observed.Created))
    || Object.keys(observed.Config?.Volumes ?? {}).length) fail();
  return { image: observed.Id, createdAt: observed.Created, tags: [...observed.RepoTags].sort(),
    declaredVolumes: 0, deploymentOrHealthProof: false };
}

export function qualifyRetentionAnchor(observed, plan) {
  const h = observed?.HostConfig, c = observed?.Config;
  if (!/^[a-f0-9]{64}$/.test(observed?.Id ?? '') || observed.Name !== '/' + plan.name
    || observed.Image !== plan.image || observed.State?.Status !== 'created'
    || observed.State.Running !== false || observed.State.Pid !== 0
    || !same(c?.Entrypoint, ['/bin/true']) || c.Image !== plan.image
    || !same(c.Labels?.['roost.retention.version'], '1')
    || Object.entries(plan.labels).some(([k, v]) => c.Labels?.[k] !== v)
    || c.Labels?.['coolify.managed'] !== 'false'
    || !same(observed.Mounts, []) || Object.keys(c.Volumes ?? {}).length
    || h?.NetworkMode !== 'none' || h.ReadonlyRootfs !== true || h.Memory !== 16777216
    || h.PidsLimit !== 4 || h.Privileged !== false || !same(h.CapDrop, ['ALL'])
    || !Array.isArray(h.SecurityOpt) || !h.SecurityOpt.includes('no-new-privileges')
    || Object.keys(h.PortBindings ?? {}).length || (h.Binds ?? []).length
    || !Number.isFinite(Date.parse(observed.Created))) fail();
  return { containerId: observed.Id, name: plan.name, image: plan.image,
    createdAt: observed.Created, stopped: true, mounts: 0, network: 'none',
    coolifyManaged: false, runtimeStarted: false, deploymentOrHealthProof: false };
}

// Retiring anchors requires a separate caller-owned proven retirement policy.
// This module never prunes, starts a process or removes any image/container.
