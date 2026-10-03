import { z } from 'zod';
import { createHash } from 'node:crypto';
import contract from './agent-host-release-contract.cjs';

const hash = z.string().regex(/^[a-f0-9]{64}$/), sha = z.string().regex(/^[a-f0-9]{40}$/);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const dockerfile = z.string().regex(/^\/[A-Za-z0-9._/-]+$/).refine(value => !value.split('/').some(part => ['.', '..'].includes(part)));
const configuration = z.object({ targetId: id, applicationId: z.string().regex(/^[1-9][0-9]{0,15}$/), buildPack: z.literal('dockerfile'),
  dockerfile, configDigest: hash, schemaDigest: hash, gitCommit: sha, autoDeploy: z.literal(false), topologyDigest: hash }).strict();
const runtime = z.object({ targetId: id, commit: sha, tree: sha, imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  configDigest: hash, schemaDigest: hash, healthy: z.literal(true), deploymentId: id }).strict();
const snapshotSchema = z.object({ observedAt: z.string().datetime(), sourcePins: z.object({ queueHelper: hash, deploymentJob: hash }).strict(),
  schemaDigest: hash, baselineDeployments: z.array(z.object({ targetId: id, deploymentId: id }).strict()).min(1).max(6),
  targets: z.array(z.object({ targetId: id, dockerfile }).strict()).min(1).max(6),
  rows: z.array(z.object({ configuration, runtime }).strict()).min(1).max(6), diagnostics: z.unknown().optional(), claim: z.unknown().optional() }).strict();
const fail = () => { throw Object.assign(Error('release_configuration_preimage_unproven'), { retryable: false }); };
const check = value => { if (!value) fail(); };

/** Hash the original capture bytes, never a newly manufactured expected pin. */
export function parseConfigurationPreimage(bytes, { sha256, sourcePins, manifest, baselineDeployments, since }) {
  check(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 131072
    && /^[a-f0-9]{64}$/.test(sha256) && createHash('sha256').update(bytes).digest('hex') === sha256);
  let snapshot; try { snapshot = snapshotSchema.parse(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))); } catch { fail(); }
  check(Number.isFinite(Date.parse(since)) && Date.parse(snapshot.observedAt) < Date.parse(since)
    && snapshot.schemaDigest === manifest.deployment.schemaDigest && contract.releaseDigest(snapshot.sourcePins) === contract.releaseDigest(sourcePins));
  const ids = snapshot.targets.map(row => row.targetId), rowIds = snapshot.rows.map(row => row.configuration.targetId), queueIds = snapshot.baselineDeployments.map(row => row.targetId);
  check(new Set(ids).size === ids.length && new Set(rowIds).size === ids.length && new Set(queueIds).size === ids.length
    && rowIds.length === ids.length && queueIds.length === ids.length && rowIds.every(value => ids.includes(value)) && queueIds.every(value => ids.includes(value)));
  for (const row of snapshot.rows) {
    const c = row.configuration, r = row.runtime, target = snapshot.targets.find(value => value.targetId === c.targetId);
    check(target.dockerfile === c.dockerfile && c.schemaDigest === snapshot.schemaDigest && r.targetId === c.targetId
      && r.configDigest === c.configDigest && r.schemaDigest === snapshot.schemaDigest
      && r.deploymentId === snapshot.baselineDeployments.find(value => value.targetId === c.targetId).deploymentId);
  }
  for (const target of manifest.deployment.targets) {
    const row = snapshot.rows.find(value => value.configuration.targetId === target.targetId), queue = baselineDeployments.find(value => value.targetId === target.targetId);
    check(row && queue && row.configuration.dockerfile === target.dockerfile && row.configuration.configDigest === target.configDigest
      && row.runtime.commit === target.baseline.commit && row.runtime.tree === target.baseline.tree && row.runtime.imageDigest === target.baseline.imageDigest
      && row.runtime.deploymentId === queue.deploymentId);
  }
  return snapshot;
}
