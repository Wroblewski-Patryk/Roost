'use strict';
const { createHash } = require('node:crypto');
const { z } = require('zod');

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const image = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const instant = z.string().datetime({ offset: true });
const canonicalPath = z.string().max(200).regex(/^\/[A-Za-z0-9._/-]+$/)
  .refine(value => !value.slice(1).split('/').some(part => ['', '.', '..'].includes(part)));
const repository = z.string().url().max(2000).refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
});
const branch = z.string().max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/)
  .refine(value => !value.includes('..') && !value.includes('//') && !value.endsWith('/') && !value.endsWith('.lock'));
const fail = reason => { throw Object.assign(Error(`release_compose_state_${reason}`), { retryable: false }); };
const check = (value, reason) => { if (!value) fail(reason); };
const parse = (schema, value, reason) => {
  const result = schema.safeParse(value);
  if (!result.success) fail(reason);
  return result.data;
};
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const ordered = rows => rows.slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// Fixed renderer attestations contain hashes, never owner/model-selected shell.
// The installed reader separately hashes all non-command effective settings.
const composeControllerPolicySchema = z.object({
  schemaVersion: z.literal('roost-compose-controller-policy-v1'),
  phase: z.enum(['baseline', 'candidate', 'rollback']),
  rendererDigest: hash,
  artifactDigest: hash,
  buildCommandDigest: hash,
  startCommandDigest: hash,
  settingsInvariantDigest: hash,
  runtimeInvariantDigest: hash
}).strict();

const composeServiceDeclarationSchema = z.object({
  name: identifier,
  role: z.enum(['app', 'cadence', 'migration', 'database']),
  source: z.enum(['built', 'image']),
  expectedState: z.enum(['running', 'paused', 'completed']),
  mountDigest: hash,
  imageDigest: image.optional()
}).strict().superRefine((row, context) => {
  const invalid = row.role === 'database'
    ? row.source !== 'image' || row.expectedState !== 'running' || row.imageDigest === undefined
    : row.source !== 'built' || row.imageDigest !== undefined
      || row.role === 'migration' && row.expectedState !== 'completed'
      || row.role === 'app' && row.expectedState !== 'running'
      || row.role === 'cadence' && !['running', 'paused'].includes(row.expectedState);
  if (invalid) context.addIssue({ code: 'custom', message: 'service_role_binding_invalid' });
});

/** The fixed reader supplies complete effective hashes, never raw env or secrets. */
const composeConfigurationSchema = z.object({
  targetId: identifier,
  buildPack: z.literal('dockercompose'),
  composePath: canonicalPath,
  repositoryUrl: repository,
  branch,
  gitCommit: sha,
  autoDeploy: z.literal(false),
  sourcePins: z.object({ queueHelper: hash, deploymentJob: hash, controllerRenderer: hash.optional() }).strict(),
  controllerPolicy: composeControllerPolicySchema.optional(),
  sourceDigest: hash,
  composeDigest: hash,
  environmentDigest: hash,
  storageDigest: hash,
  settingsDigest: hash,
  runtimePolicyDigest: hash,
  topology: z.object({ applicationId: identifier, projectId: identifier, environmentId: identifier,
    destinationId: identifier, destinationType: identifier, serverId: identifier }).strict(),
  services: z.array(composeServiceDeclarationSchema).min(3).max(12)
}).strict().superRefine((row, context) => {
  if (row.controllerPolicy && row.sourcePins.controllerRenderer !== row.controllerPolicy.rendererDigest)
    context.addIssue({ code: 'custom', message: 'controller_renderer_unpinned' });
  if (new Set(row.services.map(service => service.name)).size !== row.services.length
    || row.services.filter(service => service.role === 'app').length !== 1
    || row.services.filter(service => service.role === 'database').length !== 1
    || row.services.filter(service => service.role === 'migration').length !== 1)
    context.addIssue({ code: 'custom', message: 'service_set_invalid' });
});

const composeRuntimeServiceSchema = z.object({
  name: identifier,
  role: z.enum(['app', 'cadence', 'migration', 'database']),
  containerId: hash,
  imageDigest: image,
  mountDigest: hash,
  state: z.enum(['running', 'paused', 'exited', 'created']),
  health: z.enum(['healthy', 'starting', 'unhealthy']).nullable(),
  exitCode: z.number().int().min(0).max(255),
  createdAt: instant,
  commit: sha.optional(),
  tree: sha.optional(),
  deploymentId: identifier.optional()
}).strict();

const composeRuntimeSchema = z.object({ targetId: identifier, deploymentId: identifier,
  services: z.array(composeRuntimeServiceSchema).min(3).max(12) }).strict();

/** Images are trusted build attestations from the fixed transport, not packet input. */
const composeRuntimeBindingSchema = z.object({
  commit: sha,
  tree: sha,
  deploymentId: identifier,
  queue: z.object({ targetId: identifier, deploymentId: identifier, commit: sha, status: z.literal('finished'),
    createdAt: instant, finishedAt: instant }).strict(),
  images: z.array(z.object({ name: identifier, imageDigest: image, commit: sha, tree: sha,
    deploymentId: identifier }).strict()).min(2).max(11)
}).strict();

function configurationIdentity(snapshot) {
  const { gitCommit: _pin, ...stable } = parse(composeConfigurationSchema, snapshot, 'configuration_invalid');
  return { ...stable, services: ordered(stable.services) };
}

/** Pin changes are separately authorized; all effective configuration stays sealed. */
function composeConfigurationDigest(snapshot) {
  return digest(configurationIdentity(snapshot));
}

function runtimeIdentity(service) {
  return { name: service.name, role: service.role, imageDigest: service.imageDigest, mountDigest: service.mountDigest,
    ...(service.commit === undefined ? {} : { commit: service.commit }),
    ...(service.tree === undefined ? {} : { tree: service.tree }) };
}

/** Independent of timestamps, mutable tags, health samples and container IDs. */
function composeRuntimeSetDigest(services) {
  const rows = parse(z.array(composeRuntimeServiceSchema).min(3).max(12), services, 'runtime_invalid');
  check(new Set(rows.map(row => row.name)).size === rows.length, 'service_set_changed');
  return digest(ordered(rows).map(runtimeIdentity));
}

/**
 * Pure qualification only. The installed transport must independently establish
 * complete config hashes, image/source provenance, mount identity and queue facts.
 * Caller-created build-info or a mutable image tag is never that attestation.
 */
function qualifyComposeRuntime({ expected, configuration, runtime, binding }) {
  const declared = parse(z.object({ configuration: composeConfigurationSchema, configDigest: hash }).strict(),
    expected, 'expected_invalid');
  const current = parse(composeConfigurationSchema, configuration, 'configuration_invalid');
  const live = parse(composeRuntimeSchema, runtime, 'runtime_invalid');
  const source = parse(composeRuntimeBindingSchema, binding, 'binding_invalid');
  const configDigest = composeConfigurationDigest(declared.configuration);
  check(declared.configDigest === configDigest && composeConfigurationDigest(current) === configDigest,
    'configuration_changed');
  const queue = source.queue;
  check(current.gitCommit === source.commit && live.targetId === current.targetId && queue.targetId === current.targetId
    && live.deploymentId === source.deploymentId && queue.deploymentId === source.deploymentId
    && queue.commit === source.commit && Date.parse(queue.createdAt) <= Date.parse(queue.finishedAt), 'source_pin_changed');
  const declarations = current.services;
  const built = declarations.filter(service => service.source === 'built');
  check(live.services.length === declarations.length
    && new Set(live.services.map(row => row.name)).size === declarations.length
    && new Set(live.services.map(row => row.containerId)).size === declarations.length
    && declarations.every(row => live.services.some(service => service.name === row.name))
    && source.images.length === built.length && new Set(source.images.map(row => row.name)).size === built.length
    && built.every(row => source.images.some(image => image.name === row.name)), 'service_set_changed');
  for (const declaration of declarations) {
    const service = live.services.find(row => row.name === declaration.name);
    check(service.role === declaration.role && service.mountDigest === declaration.mountDigest, 'service_binding_changed');
    if (declaration.source === 'built') {
      const attested = source.images.find(row => row.name === declaration.name);
      check(attested.commit === source.commit && attested.tree === source.tree && attested.deploymentId === source.deploymentId
        && service.imageDigest === attested.imageDigest && service.commit === source.commit && service.tree === source.tree
        && service.deploymentId === source.deploymentId && Date.parse(service.createdAt) >= Date.parse(queue.createdAt)
        && Date.parse(service.createdAt) <= Date.parse(queue.finishedAt), 'service_source_changed');
    } else {
      check(service.imageDigest === declaration.imageDigest && service.commit === undefined && service.tree === undefined
        && service.deploymentId === undefined, 'database_identity_changed');
    }
    if (declaration.role === 'migration') {
      check(service.state === 'exited' && service.exitCode === 0 && service.health === null, 'migration_failed');
    } else if (declaration.role === 'cadence') {
      const valid = declaration.expectedState === 'running'
        ? service.state === 'running' && service.exitCode === 0 && [null, 'healthy'].includes(service.health)
        : service.exitCode === 0 && (service.state === 'paused' && [null, 'healthy'].includes(service.health)
          || ['exited', 'created'].includes(service.state) && service.health === null);
      check(valid, 'cadence_state_changed');
    } else {
      check(service.state === 'running' && service.exitCode === 0 && service.health === 'healthy', 'service_health_unproven');
    }
  }
  return Object.freeze({ targetId: current.targetId, buildPack: current.buildPack, composePath: current.composePath,
    commit: source.commit, tree: source.tree, deploymentId: source.deploymentId, configDigest,
    sourceDigest: current.sourceDigest, composeDigest: current.composeDigest,
    runtimeSetDigest: composeRuntimeSetDigest(live.services), healthy: true, services: ordered(live.services) });
}

// Recovery observations are not deployment receipts: they may precede this
// installation's first retained queue and its historical migration container.
function qualifyComposeRetainedBaseline({ configuration, images, services, baselineServices }) {
  const config = parse(composeConfigurationSchema, configuration, 'configuration_invalid');
  const rows = parse(z.array(composeRuntimeServiceSchema).min(2).max(12), services, 'runtime_invalid');
  const prior = parse(z.array(composeRuntimeServiceSchema).min(2).max(12), baselineServices, 'baseline_invalid');
  check(rows.length === prior.length && new Set(rows.map(r => r.name)).size === rows.length
    && new Set(rows.map(r => r.containerId)).size === rows.length, 'service_set_changed');
  check(config.services.every(d => d.role === 'migration' || rows.some(r => r.name === d.name)), 'service_set_changed');
  for (const row of rows) {
    const declared = config.services.find(d => d.name === row.name), before = prior.find(r => r.name === row.name);
    check(declared && before && row.role === declared.role && row.mountDigest === declared.mountDigest
      && row.imageDigest === (declared.source === 'image' ? declared.imageDigest : images.find(i => i.name === row.name)?.imageDigest)
      && ['containerId', 'imageDigest', 'mountDigest', 'createdAt', 'role'].every(k => row[k] === before[k]), 'retained_identity_changed');
    check(row.exitCode === 0 && (row.role === 'migration' ? row.state === 'exited' && row.health === null
      : row.role === 'cadence' ? ['paused', 'created', 'exited'].includes(row.state) && row.health === null
        : row.state === 'running' && row.health === 'healthy'), 'retained_health_unproven');
  }
  return Object.freeze({ services: ordered(rows), runtimeSetDigest: digest(ordered(rows).map(runtimeIdentity)) });
}

module.exports = { composeControllerPolicySchema, composeServiceDeclarationSchema, composeConfigurationSchema, composeRuntimeServiceSchema, composeRuntimeSchema, composeRuntimeBindingSchema, composeConfigurationDigest, composeRuntimeSetDigest, qualifyComposeRuntime, qualifyComposeRetainedBaseline };
