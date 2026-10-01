import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import https from 'node:https';
import { z } from 'zod';
import { hasReleaseProcessScope, runReleaseNativeProcess } from './agent-host-release-process.mjs';
import os from 'node:os';

const image = /^sha256:[a-f0-9]{64}$/;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const login = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/;
const packageName = /^[a-z0-9][a-z0-9._/-]{0,200}$/;
const tag = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/;
const fail = (reason, uncertain = false) => { throw Object.assign(Error(`release_image_cleanup_${reason}`), { retryable: false, uncertain }); };
const check = (condition, reason) => { if (!condition) fail(reason); };
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const equalSet = (a, b) => Array.isArray(a) && new Set(a).size === a.length && a.length === b.length && a.every(item => b.includes(item));
const common = { resourceId: z.string().regex(identifier), imageRepository: z.string().min(10).max(260),
  imageDigest: z.string().regex(image), createdAt: z.string().datetime({ precision: null }), temporary: z.literal(true) };
const resourceSchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('docker_image'), engine: z.enum(['local', 'vps']),
    imageId: z.string().regex(image), tags: z.array(z.string().min(1).max(400)).max(1) }).strict(),
  z.object({ ...common, kind: z.literal('ghcr_version'), versionId: z.number().int().positive().safe(),
    tags: z.array(z.string().regex(tag)).max(20) }).strict(),
]);
export const releaseImageOwnershipSchema = z.object({ schemaVersion: z.literal('roost-release-image-ownership-v1'),
  releaseId: z.string().uuid(), applicationId: z.string().uuid(), targetId: z.string().regex(identifier),
  repositoryUrl: z.string().url(), registryOwner: z.string().regex(login), registryOwnerType: z.enum(['user', 'org']),
  actorLogin: z.string().regex(login), packageName: z.string().regex(packageName), packageId: z.number().int().positive().safe(),
  resources: z.array(resourceSchema).min(1).max(16) }).strict();

// Fixed Docker operations only. No shell is used locally. The SSH command is
// formed from static flags and grammar-checked immutable IDs; stderr is hidden.
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const command = (executable, args, timeoutMs = 15000) => new Promise((resolve, reject) => {
  if(hasReleaseProcessScope()){
    runReleaseNativeProcess(executable,{argv:args,cwd:os.tmpdir(),durationMs:timeoutMs,maxBytes:131072})
      .then(bytes=>resolve(bytes.toString('utf8')),reject);return;
  }
  const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '', bytes = 0, stopped = false;
  const timer = setTimeout(() => { stopped = true; child.kill(); }, timeoutMs);
  child.stdout.on('data', part => { bytes += part.length; if (bytes > 1048576) { stopped = true; child.kill(); } else output += part.toString('utf8'); });
  child.once('error', () => { clearTimeout(timer); reject(Error('image_transport_unproven')); });
  child.once('close', code => { clearTimeout(timer); code === 0 && !stopped ? resolve(output) : reject(Error('image_transport_unproven')); });
});
export function createFixedDockerImageCleanupTransport({ sshHost, sudo = true } = {}) {
  check(sshHost === undefined || identifier.test(sshHost), 'ssh_configuration_invalid');
  check(typeof sudo === 'boolean', 'ssh_configuration_invalid');
  const run = (engine, args) => engine === 'local' ? command('docker', args)
    : (check(Boolean(sshHost), 'ssh_configuration_missing'), command('ssh', ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', sshHost,
      `${sudo ? 'sudo -n ' : ''}docker ${args.map(quote).join(' ')}`]));
  return async ({ operation, engine, imageId }) => {
    check(['local', 'vps'].includes(engine) && image.test(imageId), 'docker_scope_invalid');
    check(['inspect', 'remove'].includes(operation), 'docker_operation_invalid');
    if (operation === 'remove') { await run(engine, ['image', 'rm', '--no-prune', '--', imageId]); return { removed: true }; }
    // Successful daemon access and a complete list prove absence; an inspect
    // error alone (permissions, daemon loss, timeout) never proves it.
    const daemonId = (await run(engine, ['info', '--format', '{{.ID}}'])).trim();
    check(daemonId.length > 0, 'docker_daemon_unproven');
    const ids = (await run(engine, ['image', 'ls', '--no-trunc', '--quiet'])).trim().split(/\r?\n/).filter(Boolean);
    check(ids.every(id => image.test(id)), 'docker_image_list_unproven');
    if (!ids.includes(imageId)) return { exists: false, engine, daemonId };
    const format = '{"imageId":{{json .Id}},"createdAt":{{json .Created}},"repoDigests":{{json .RepoDigests}},"tags":{{json .RepoTags}}}';
    let inspected; try { inspected = JSON.parse(await run(engine, ['image', 'inspect', '--format', format, '--', imageId])); }
    catch { fail('docker_inspection_unproven'); }
    // Includes stopped containers and descendants. Conservatively preserve an
    // image whenever Docker reports a container depending on its ancestry.
    const containers = (await run(engine, ['container', 'ls', '--all', '--no-trunc', '--quiet', '--filter', `ancestor=${imageId}`]))
      .trim().split(/\r?\n/).filter(Boolean);
    check(containers.every(id => /^[a-f0-9]{64}$/.test(id)), 'docker_containers_unproven');
    return { ...inspected, tags: inspected.tags ?? [], repoDigests: inspected.repoDigests ?? [], exists: true, engine, daemonId, containers };
  };
}

export function githubImageCleanupJson({ path, method, token }) {
  check(['GET', 'DELETE'].includes(method) && /^\/(user(?:\/packages\/container\/[^?]+)?|orgs\/[^?]+|repos\/[^?]+)$/.test(path), 'github_path_invalid');
  check(method !== 'DELETE' || /^\/(?:user|orgs\/[a-zA-Z0-9-]+)\/packages\/container\/[^/?]+\/versions\/[1-9][0-9]*$/.test(path), 'github_delete_scope_invalid');
  check(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'credential_unavailable');
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.github.com', path, method, timeout: 15000, rejectUnauthorized: true,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'roost-release-image-cleanup', 'X-GitHub-Api-Version': '2022-11-28' } }, res => {
      let output = '', bytes = 0;
      res.on('data', part => { bytes += part.length; if (bytes > 262144) req.destroy(); else output += part.toString('utf8'); });
      res.on('end', () => {
        if (![200, 204, 404].includes(res.statusCode)) { reject(Error('github_response_unproven')); return; }
        try { resolve({ status: res.statusCode, body: output ? JSON.parse(output) : null,
          scopes: String(res.headers['x-oauth-scopes'] ?? '').split(',').map(value => value.trim()).filter(Boolean) }); }
        catch { reject(Error('github_response_unproven')); }
      });
      res.on('error', () => reject(Error('github_response_unproven')));
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => reject(Error('github_transport_unproven'))); req.end();
  });
}

// The root broker durably reserves one cleanup intent before removeResource.
// After an uncertain outcome it must invoke reconcileResource, including after
// process restart. This adapter never turns observed presence into retry consent.
export function createReleaseImageCleanup({ ownership, readOwnership, applicationAbsent, dockerTransport,
  githubCredential, githubTransport = githubImageCleanupJson }) {
  let owned; try { owned = releaseImageOwnershipSchema.parse(ownership); } catch { fail('ownership_invalid'); }
  const pinned = hash(owned), spent = new Set();
  check(typeof readOwnership === 'function' && typeof applicationAbsent === 'function', 'ownership_gateway_missing');
  const repoUrl = new URL(owned.repositoryUrl);
  const match = /^\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/.exec(repoUrl.pathname);
  check(repoUrl.origin === 'https://github.com' && !repoUrl.search && !repoUrl.hash && !repoUrl.username && !repoUrl.password
    && match && match[1].toLowerCase() === owned.registryOwner.toLowerCase() && !owned.packageName.includes('..') && !owned.packageName.includes('//'), 'repository_scope_invalid');
  const fullName = `${match[1]}/${match[2]}`;
  const repository = `ghcr.io/${owned.registryOwner.toLowerCase()}/${owned.packageName}`;
  check(new Set(owned.resources.map(row => row.resourceId)).size === owned.resources.length
    && new Set(owned.resources.map(row => row.kind === 'docker_image' ? `${row.engine}:${row.imageId}` : `version:${row.versionId}`)).size === owned.resources.length,
  'duplicate_resource');
  for (const row of owned.resources) {
    check(row.imageRepository === repository, 'image_repository_changed');
    if (row.kind === 'docker_image') check(row.tags.every(ref => ref.startsWith(`${repository}:`) && tag.test(ref.slice(repository.length + 1))), 'docker_tag_unowned');
  }
  const stable = async () => {
    let current; try { current = releaseImageOwnershipSchema.parse(await readOwnership()); } catch { fail('ownership_changed'); }
    check(hash(current) === pinned, 'ownership_changed');
  };
  const rowFor = async id => { await stable(); const row = owned.resources.find(item => item.resourceId === id); check(row, 'resource_unowned'); return row; };
  const beforeEffect = async () => { await stable(); check(await applicationAbsent({ targetId: owned.targetId, applicationId: owned.applicationId }) === true, 'application_present'); await stable(); };
  const docker = async (row, operation) => {
    check(typeof dockerTransport === 'function', 'docker_gateway_missing');
    let result; try { result = await dockerTransport({ operation, engine: row.engine, imageId: row.imageId }); }
    catch { fail('docker_transport_unproven', operation === 'remove'); }
    await stable(); return result;
  };
  const inspectDocker = async row => {
    const result = await docker(row, 'inspect');
    check(result && result.engine === row.engine && typeof result.daemonId === 'string' && result.daemonId.length > 0 && typeof result.exists === 'boolean', 'docker_inspection_unproven');
    if (!result.exists) return false;
    check(result.imageId === row.imageId && result.createdAt === row.createdAt
      && equalSet(result.repoDigests, [`${row.imageRepository}@${row.imageDigest}`]) && equalSet(result.tags, row.tags), 'docker_identity_changed');
    check(Array.isArray(result.containers) && result.containers.every(id => /^[a-f0-9]{64}$/.test(id)), 'docker_containers_unproven');
    check(result.containers.length === 0, 'docker_image_in_use'); return true;
  };
  const api = async (path, method = 'GET') => {
    check(typeof githubCredential === 'function', 'github_credential_missing');
    let result; try { result = await githubTransport({ path, method, token: await githubCredential() }); }
    catch { fail('github_transport_unproven', method === 'DELETE'); }
    check(result && [200, 204, 404].includes(result.status), 'github_response_unproven'); await stable(); return result;
  };
  const base = owned.registryOwnerType === 'user' ? '/user' : `/orgs/${encodeURIComponent(owned.registryOwner)}`;
  const packagePath = `${base}/packages/container/${encodeURIComponent(owned.packageName)}`;
  const registryAccess = async () => {
    const actor = await api('/user');
    check(actor.status === 200 && actor.body?.login?.toLowerCase() === owned.actorLogin.toLowerCase()
      // GitHub normalizes scopes: write:packages subsumes read:packages.
      && (actor.scopes?.includes('read:packages') || actor.scopes?.includes('write:packages'))
      && actor.scopes?.includes('delete:packages'), 'github_authority_unproven');
    if (owned.registryOwnerType === 'user') check(owned.actorLogin.toLowerCase() === owned.registryOwner.toLowerCase(), 'github_owner_changed');
    const repo = await api(`/repos/${fullName}`);
    check(repo.status === 200 && repo.body?.full_name?.toLowerCase() === fullName.toLowerCase() && repo.body?.private === true, 'github_repository_changed');
    const pkg = await api(packagePath);
    check(pkg.status === 200 && pkg.body?.id === owned.packageId && pkg.body?.package_type === 'container'
      && pkg.body?.owner?.login?.toLowerCase() === owned.registryOwner.toLowerCase() && pkg.body?.visibility === 'private'
      && pkg.body?.repository?.full_name?.toLowerCase() === fullName.toLowerCase() && pkg.body?.repository?.private === true, 'github_package_changed');
  };
  const inspectVersion = async row => {
    await registryAccess(); const response = await api(`${packagePath}/versions/${row.versionId}`);
    if (response.status === 404) return false;
    const version = response.body;
    check(response.status === 200 && version?.id === row.versionId && version?.name === row.imageDigest
      && version?.created_at === row.createdAt && version?.metadata?.package_type === 'container'
      && equalSet(version.metadata?.container?.tags, row.tags), 'github_version_changed'); return true;
  };
  const inspect = row => row.kind === 'docker_image' ? inspectDocker(row) : inspectVersion(row);
  const evidence = id => ({ absenceVerified: true, resourceIds: [id] });
  return {
    async removeResource(id) {
      const row = await rowFor(id); await beforeEffect();
      if (!await inspect(row)) return evidence(id);
      await beforeEffect();
      // This check and reservation have no await between them, so concurrent
      // callers in this process cannot both dispatch the same removal.
      check(!spent.has(id), 'mutation_already_dispatched'); spent.add(id);
      if (row.kind === 'docker_image') await docker(row, 'remove');
      else { const result = await api(`${packagePath}/versions/${row.versionId}`, 'DELETE'); if (result.status !== 204) fail('github_delete_unproven', true); }
      try { if (await inspect(row)) fail('removal_pending', true); }
      catch (error) { fail('removal_unproven', true); }
      return evidence(id);
    },
    async reconcileResource(id) {
      const row = await rowFor(id); await beforeEffect();
      return await inspect(row) ? { status: 'uncertain', evidence: { presenceObserved: true, resourceIds: [id] } }
        : { status: 'succeeded', evidence: evidence(id) };
    },
    async verifyCleanup() {
      for (const row of owned.resources) { const result = await this.reconcileResource(row.resourceId); check(result.status === 'succeeded', 'resource_present'); }
      return { absenceVerified: true, resourceIds: owned.resources.map(row => row.resourceId) };
    },
  };
}
