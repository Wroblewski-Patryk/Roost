import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import https from 'node:https';
import { z } from 'zod';
import { hasReleaseProcessScope, runReleaseNativeProcess } from './agent-host-release-process.mjs';
import os from 'node:os';
import { createReleaseRegistryProof } from './agent-host-release-registry-proof.mjs';

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
    publicationDigest: z.string().regex(image),
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

const packageRemovalCapabilities = new WeakMap();
export function githubImageCleanupJson({ path, method, token, packageRemovalCapability }) {
  const catalog=/^\/(?:user|orgs\/[a-zA-Z0-9-]+)\/packages(?:\?package_type=container&per_page=100&page=[1-9][0-9]?|\/container\/[^/?]+\/versions\?per_page=100&page=1)$/.test(path);
  check(['GET', 'DELETE'].includes(method) && (catalog || /^\/(user(?:\/packages\/container\/[^?]+)?|orgs\/[^?]+|repos\/[^?]+)$/.test(path)), 'github_path_invalid');
  if(method==='DELETE'&&!/^\/(?:user|orgs\/[a-zA-Z0-9-]+)\/packages\/container\/[^/?]+\/versions\/[1-9][0-9]*$/.test(path)){
    check(packageRemovalCapabilities.get(packageRemovalCapability)===path,'github_delete_scope_invalid');
    packageRemovalCapabilities.delete(packageRemovalCapability);
  }
  check(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'credential_unavailable');
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.github.com', path, method, timeout: 15000, rejectUnauthorized: true,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'roost-release-image-cleanup', 'X-GitHub-Api-Version': '2022-11-28' } }, res => {
      let output = '', bytes = 0;
      res.on('data', part => { bytes += part.length; if (bytes > 262144) req.destroy(); else output += part.toString('utf8'); });
      res.on('end', () => {
        if (![200, 204, 404].includes(res.statusCode)) { reject(Object.assign(Error('github_response_unproven'), { httpStatus: res.statusCode })); return; }
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
// process restart. Proven unchanged presence resolves the prior deletion as
// absent; another effect still requires a new durable broker capability.
export function createReleaseImageCleanup({ ownership, readOwnership, applicationAbsent, dockerTransport,
  githubCredential, githubTransport = githubImageCleanupJson, registryProof = createReleaseRegistryProof(), allowTemporaryPackageRemoval=false }) {
  check(typeof allowTemporaryPackageRemoval==='boolean','package_removal_configuration_invalid');
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
    if (row.kind === 'docker_image') check(row.tags.every(ref => ref === `${repository}@${row.imageDigest}`
      || (ref.startsWith(`${repository}:`) && tag.test(ref.slice(repository.length + 1)))), 'docker_tag_unowned');
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
  const api = async (path, method = 'GET', packageRemovalCapability) => {
    check(typeof githubCredential === 'function', 'github_credential_missing');
    let result; try { result = await githubTransport({ path, method, token: await githubCredential(), ...(packageRemovalCapability?{packageRemovalCapability}:{}) }); }
    catch(error) { throw Object.assign(Error('release_image_cleanup_github_transport_unproven'), { retryable:false,
      uncertain:method==='DELETE', transportDiagnostic:Number.isInteger(error?.httpStatus)&&error.httpStatus>=100&&error.httpStatus<=599
        ?`response_unproven_http_${error.httpStatus}`:'transport_uncertain' }); }
    check(result && [200, 204, 404].includes(result.status), 'github_response_unproven'); await stable(); return result;
  };
  const base = owned.registryOwnerType === 'user' ? '/user' : `/orgs/${encodeURIComponent(owned.registryOwner)}`;
  const packagePath = `${base}/packages/container/${encodeURIComponent(owned.packageName)}`;
  const proveSource=async (row,cacheOnly=false)=>{
    check(typeof registryProof==='function','registry_proof_missing');let proof;
    try{proof=await registryProof({imageRepository:row.imageRepository,publicationDigest:row.publicationDigest,imageDigest:row.imageDigest,repositoryUrl:owned.repositoryUrl,token:await githubCredential(),cacheOnly});}
    catch{fail('registry_provenance_unproven');}
    check(proof?.provenanceVerified===true&&proof.publicationDigest===row.publicationDigest&&proof.imageDigest===row.imageDigest
      &&proof.imageRepository===row.imageRepository&&proof.repositoryUrl===`https://github.com/${fullName}`&&proof.memberDigests?.includes(row.imageDigest),'registry_provenance_unproven');
    await stable();
  };
  const proveOwnedPackageSources=async()=>{for(const row of owned.resources.filter(r=>r.kind==='ghcr_version'))await proveSource(row,true);};
  const provePackageAbsent=async()=>{
    check(owned.registryOwnerType==='user','github_package_owner_unproven');
    // A 404 alone can hide inaccessible packages. A complete authenticated
    // owner catalog plus immutable former source proofs must also establish absence.
    for(let page=1;page<=10;page++){
      const response=await api(`${base}/packages?package_type=container&per_page=100&page=${page}`);
      check(response.status===200&&Array.isArray(response.body)&&response.body.length<=100,'github_catalog_unproven');
      check(response.body.every(p=>Number.isSafeInteger(p?.id)&&typeof p.name==='string'&&p.package_type==='container'),'github_catalog_unproven');
      check(!response.body.some(p=>p.id===owned.packageId||p.name===owned.packageName),'github_package_changed');
      if(response.body.length<100){await proveOwnedPackageSources();return;}
    }
    fail('github_catalog_truncated');
  };
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
    if(pkg.status===404){await provePackageAbsent();return null;}
    check(pkg.status === 200 && pkg.body?.id === owned.packageId && pkg.body?.package_type === 'container'
      && pkg.body?.owner?.login?.toLowerCase() === owned.registryOwner.toLowerCase() && pkg.body?.visibility === 'private'
      && pkg.body?.name === owned.packageName, 'github_package_changed');
    // GitHub's current container-package REST projection omits repository.
    // A supplied projection must agree; absence is replaced by immutable OCI
    // source provenance below, never by a fabricated REST association.
    if (pkg.body.repository !== undefined && pkg.body.repository !== null) {
      check(pkg.body.repository.full_name?.toLowerCase() === fullName.toLowerCase()
        && pkg.body.repository.private === true, 'github_package_changed');
    }
    return pkg.body;
  };
  const inspectVersion = async row => {
    const pkg=await registryAccess(); const response = await api(`${packagePath}/versions/${row.versionId}`);
    if (response.status === 404) return false;
    check(pkg!==null,'github_package_changed');
    const version = response.body;
    check(response.status === 200 && version?.id === row.versionId && version?.name === row.imageDigest
      && version?.created_at === row.createdAt && version?.metadata?.package_type === 'container'
      && equalSet(version.metadata?.container?.tags, row.tags), 'github_version_changed');
    // The source-selected proof factory may preserve raw immutable OCI bytes
    // in its private durable cache. Every use hashes and validates the complete
    // graph again; no JSON receipt boolean grants cleanup authority.
    await proveSource(row);
    await stable(); return true;
  };
  const removeRegistry=async row=>{
    const pkg=await registryAccess();check(pkg!==null,'github_package_changed');
    let capability;
    if(pkg.version_count===1){
      check(allowTemporaryPackageRemoval,'github_package_removal_not_authorized');
      check(owned.registryOwnerType==='user','github_package_owner_unproven');
      const versions=await api(`${packagePath}/versions?per_page=100&page=1`);
      check(versions.status===200&&Array.isArray(versions.body)&&versions.body.length===1,'github_final_version_unproven');
      const v=versions.body[0];
      check(v.id===row.versionId&&v.name===row.imageDigest&&v.created_at===row.createdAt&&v.metadata?.package_type==='container'
        &&equalSet(v.metadata?.container?.tags,row.tags),'github_final_version_unproven');
      await proveOwnedPackageSources();await beforeEffect();
      const fresh=await registryAccess(),finalVersions=await api(`${packagePath}/versions?per_page=100&page=1`);
      check(fresh?.version_count===1&&finalVersions.status===200&&Array.isArray(finalVersions.body)&&finalVersions.body.length===1
        &&hash(finalVersions.body[0])===hash(v),'github_final_version_changed');
      // The owner authorized cleanup of this entire temporary package. Only
      // the sole exact remaining owned version can mint this non-serializable,
      // single-use transport capability; no model or generic caller can do so.
      capability={};packageRemovalCapabilities.set(capability,packagePath);
    }
    const result=await api(capability?packagePath:`${packagePath}/versions/${row.versionId}`,'DELETE',capability);
    if(result.status!==204)fail('github_delete_unproven',true);
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
      else await removeRegistry(row);
      try { if (await inspect(row)) fail('removal_pending', true); }
      catch (error) { fail('removal_unproven', true); }
      return evidence(id);
    },
    async reconcileResource(id) {
      const row = await rowFor(id); await beforeEffect();
      return await inspect(row) ? { status: 'absent', evidence: { absenceVerified: true, resourcePresent: true, resourceIds: [id] } }
        : { status: 'succeeded', evidence: evidence(id) };
    },
    async verifyCleanup() {
      for (const row of owned.resources) { const result = await this.reconcileResource(row.resourceId); check(result.status === 'succeeded', 'resource_present'); }
      return { absenceVerified: true, resourceIds: owned.resources.map(row => row.resourceId) };
    },
  };
}
