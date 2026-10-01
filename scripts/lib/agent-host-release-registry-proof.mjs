import https from 'node:https';
import { createHash, randomUUID } from 'node:crypto';
import { constants, existsSync, lstatSync, realpathSync, openSync, fstatSync, readFileSync, writeFileSync, fsyncSync, closeSync, linkSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const fail = reason => { throw Object.assign(Error(`release_registry_proof_${reason}`), { retryable: false }); };
const check = (condition, reason) => { if (!condition) fail(reason); };
const digestOf = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const media = {
  index: new Set(['application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json']),
  manifest: new Set(['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json']),
  config: new Set(['application/vnd.oci.image.config.v1+json', 'application/vnd.docker.container.image.v1+json']),
};
const accept = [...media.index, ...media.manifest].join(', ');
const cacheVersion = 'roost-release-registry-provenance-v1';
const normalizePath = value => process.platform === 'win32' ? value.toLowerCase() : value;
// Node reports dev=0 for Windows path stats and a volume ID for handle stats.
// File ID and birth time remain comparable across the two native views.
const identity = stat => `${process.platform === 'win32' ? 0 : stat.dev}:${stat.ino}:${stat.birthtimeNs}`;
function privateCache(directory) {
  if (directory === undefined) return null;
  check(typeof directory === 'string' && path.isAbsolute(directory) && path.normalize(directory) === directory, 'cache_path_invalid');
  const inspectDirectory = () => {
    for (let current = directory; ; current = path.dirname(current)) {
      const stat = lstatSync(current, { bigint: true });
      check(stat.isDirectory() && !stat.isSymbolicLink() && normalizePath(realpathSync(current)) === normalizePath(current)
        && !existsSync(path.join(current, '.git')), 'cache_path_invalid');
      if (path.dirname(current) === current) break;
    }
    return identity(lstatSync(directory, { bigint: true }));
  };
  let pinned; try { pinned = inspectDirectory(); } catch { fail('cache_path_invalid'); }
  const stable = () => { try { check(inspectDirectory() === pinned, 'cache_directory_changed'); } catch { fail('cache_directory_changed'); } };
  const filename = bindings => path.join(directory, `publication-${createHash('sha256').update(JSON.stringify(bindings)).digest('hex')}.json`);
  const read = bindings => {
    stable(); const file = filename(bindings);
    if (!existsSync(file)) return null;
    let fd;
    try {
      const before = lstatSync(file, { bigint: true });
      check(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n && before.size > 0n && before.size <= 6291456n, 'cache_file_invalid');
      fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const opened = fstatSync(fd, { bigint: true });
      check(identity(opened) === identity(before) && opened.nlink === 1n && opened.size === before.size, 'cache_file_changed');
      const bytes = readFileSync(fd), after = fstatSync(fd, { bigint: true });
      check(bytes.length === Number(before.size) && identity(lstatSync(file, { bigint: true })) === identity(before)
        && after.size === before.size && after.mtimeNs === before.mtimeNs && after.nlink === 1n, 'cache_file_changed');
      stable();
      return JSON.parse(bytes);
    } catch { fail('cache_file_invalid'); } finally { if (fd !== undefined) closeSync(fd); }
  };
  const write = (bindings, value) => {
    stable(); const final = filename(bindings), temporary = path.join(directory, `.publication-${randomUUID()}.tmp`);
    const bytes = Buffer.from(JSON.stringify(value)); check(bytes.length <= 6291456, 'cache_bound_invalid');
    let fd, temporaryIdentity;
    try {
      fd = openSync(temporary, 'wx', 0o600); temporaryIdentity = identity(fstatSync(fd, { bigint: true }));
      writeFileSync(fd, bytes); fsyncSync(fd); closeSync(fd); fd = undefined; stable();
      // Exclusive atomic publication preserves any existing record. A crash
      // before unlink leaves nlink=2 and is deliberately rejected on restart.
      linkSync(temporary, final);
      check(identity(lstatSync(temporary, { bigint: true })) === temporaryIdentity, 'cache_file_changed');
      unlinkSync(temporary); temporaryIdentity = undefined;
      const result = read(bindings);
      check(JSON.stringify(result) === bytes.toString('utf8'), 'cache_file_changed');
    } catch (error) {
      if (error?.code !== 'EEXIST') fail('cache_write_unproven');
      check(JSON.stringify(read(bindings)) === bytes.toString('utf8'), 'cache_file_changed');
    } finally {
      if (fd !== undefined) closeSync(fd);
      if (temporaryIdentity !== undefined) {
        stable(); check(identity(lstatSync(temporary, { bigint: true })) === temporaryIdentity, 'cache_file_changed'); unlinkSync(temporary);
      }
    }
  };
  return { read, write, stable };
}

// This source-selected transport never follows redirects and never prints their
// query strings, response bodies or credentials. The proof below authorizes the
// one blob redirect explicitly, without forwarding registry authorization.
export function fixedRegistryProofRead({ url, headers, maxBytes }) {
  const target = new URL(url);
  check(target.protocol === 'https:' && ['ghcr.io', 'pkg-containers.githubusercontent.com'].includes(target.hostname)
    && !target.username && !target.password && !target.hash && (!target.port || target.port === '443'), 'https_scope_invalid');
  check(Number.isSafeInteger(maxBytes) && maxBytes > 0 && maxBytes <= 1048576, 'response_bound_invalid');
  if (target.hostname === 'pkg-containers.githubusercontent.com') {
    check(/^\/(?:ghcrblobs[0-9]{2}|ghcr[1-9])\/blobs\/sha256:[a-f0-9]{64}$/.test(target.pathname)
      && Object.keys(headers ?? {}).every(name => name.toLowerCase() !== 'authorization'), 'storage_scope_invalid');
  } else {
    const tokenRoute = target.pathname === '/token' && target.searchParams.size === 2
      && target.searchParams.get('service') === 'ghcr.io'
      && /^repository:[a-z0-9-]+\/[a-z0-9._/-]+:pull$/.test(target.searchParams.get('scope') ?? '');
    const objectRoute = /^\/v2\/[a-z0-9-]+\/[a-z0-9._/-]+\/(?:manifests|blobs)\/sha256:[a-f0-9]{64}$/.test(target.pathname) && !target.search;
    check(tokenRoute || objectRoute, 'registry_route_invalid');
  }
  return new Promise((resolve, reject) => {
    let deadline;
    const stop = () => clearTimeout(deadline);
    const request = https.request(target, { method: 'GET', headers, rejectUnauthorized: true, timeout: 15000 }, response => {
      const chunks = []; let bytes = 0, overflow = false;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) { overflow = true; request.destroy(); } else chunks.push(chunk); });
      response.on('end', () => { stop(); overflow ? reject(Error('registry_response_unproven'))
        : resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }); });
      response.on('error', () => { stop(); reject(Error('registry_response_unproven')); });
    });
    deadline = setTimeout(() => request.destroy(), 15000);
    request.on('timeout', () => request.destroy()); request.on('error', () => { stop(); reject(Error('registry_transport_unproven')); }); request.end();
  });
}

export function createReleaseRegistryProof({ transport = fixedRegistryProofRead, cacheDirectory } = {}) {
  check(typeof transport === 'function', 'transport_missing');
  const cache = privateCache(cacheDirectory);
  return async ({ imageRepository, publicationDigest, imageDigest, repositoryUrl, token }) => {
    check(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'credential_unavailable');
    check(/^ghcr\.io\/[a-z0-9][a-z0-9-]{0,38}\/[a-z0-9][a-z0-9._/-]{0,200}$/.test(imageRepository)
      && !imageRepository.includes('..') && !imageRepository.includes('//'), 'repository_scope_invalid');
    check(digestPattern.test(publicationDigest) && digestPattern.test(imageDigest), 'digest_invalid');
    const source = new URL(repositoryUrl);
    check(source.origin === 'https://github.com' && /^\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/.test(source.pathname)
      && !source.username && !source.password && !source.search && !source.hash, 'source_invalid');
    const canonicalSource = source.origin + source.pathname.replace(/\.git$/, '').replace(/\/$/, '');
    const name = imageRepository.slice('ghcr.io/'.length);
    check(source.pathname.split('/')[1].toLowerCase() === name.split('/')[0], 'source_owner_invalid');
    const bindings = { imageRepository, publicationDigest, repositoryUrl: canonicalSource };
    const cached = cache?.read(bindings), objects = new Map(), usedObjects = new Set();
    if (cached) {
      check(Object.keys(cached).sort().join(',') === 'imageRepository,objects,publicationDigest,repositoryUrl,schemaVersion'
        && cached.schemaVersion === cacheVersion && cached.imageRepository === imageRepository
        && cached.publicationDigest === publicationDigest && cached.repositoryUrl === canonicalSource
        && Array.isArray(cached.objects) && cached.objects.length > 0 && cached.objects.length <= 32, 'cache_record_invalid');
      let total = 0;
      for (const row of cached.objects) {
        check(row && Object.keys(row).sort().join(',') === 'bodyBase64,digest,kind' && ['manifests', 'blobs'].includes(row.kind)
          && digestPattern.test(row.digest) && typeof row.bodyBase64 === 'string' && row.bodyBase64.length <= 1398104, 'cache_record_invalid');
        const bytes = Buffer.from(row.bodyBase64, 'base64'), key = `${row.kind}:${row.digest}`; total += bytes.length;
        check(bytes.toString('base64') === row.bodyBase64 && bytes.length > 0 && bytes.length <= 1048576 && total <= 4194304
          && digestOf(bytes) === row.digest && !objects.has(key), 'cache_digest_unproven'); objects.set(key, bytes);
      }
    }
    const read = async (url, headers, maxBytes = 1048576) => {
      let result; try { result = await transport({ url, headers, maxBytes }); } catch { fail('transport_unproven'); }
      check(result && Number.isInteger(result.status) && Buffer.isBuffer(result.body) && result.body.length <= maxBytes, 'response_unproven');
      return result;
    };
    let headers;
    if (!cached) {
    const auth = await read(`https://ghcr.io/token?service=ghcr.io&scope=${encodeURIComponent(`repository:${name}:pull`)}`,
      { Authorization: `Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`, 'User-Agent': 'roost-release-registry-proof' }, 65536);
    check(auth.status === 200, 'token_unproven');
    let bearer; try { bearer = JSON.parse(auth.body).token; } catch { fail('token_unproven'); }
    check(typeof bearer === 'string' && bearer.length > 0 && bearer.length <= 32768 && !/[\r\n]/.test(bearer), 'token_unproven');
    headers = { Authorization: `Bearer ${bearer}`, Accept: accept, 'User-Agent': 'roost-release-registry-proof' };
    }
    const object = async (kind, digest, expectedSize) => {
      check(digestPattern.test(digest), 'descriptor_invalid');
      const key = `${kind}:${digest}`;
      let response = cached ? { status: 200, body: objects.get(key) } : await read(`https://ghcr.io/v2/${name}/${kind}/${digest}`, headers);
      if (kind === 'blobs' && [302, 307].includes(response.status)) {
        let redirected; try { redirected = new URL(response.headers?.location); } catch { fail('redirect_invalid'); }
        // GHCR's signed storage path has this exact suffix and repository blob
        // identity. Query credentials are accepted only on this fixed TLS host.
        check(redirected.protocol === 'https:' && redirected.hostname === 'pkg-containers.githubusercontent.com'
          && !redirected.username && !redirected.password && !redirected.hash && (!redirected.port || redirected.port === '443')
          && /^\/(?:ghcrblobs[0-9]{2}|ghcr[1-9])\/blobs\/sha256:[a-f0-9]{64}$/.test(redirected.pathname)
          && redirected.pathname.endsWith(`/${digest}`), 'redirect_invalid');
        response = await read(redirected.href, { 'User-Agent': 'roost-release-registry-proof' });
      }
      check(response.status === 200 && Buffer.isBuffer(response.body) && digestOf(response.body) === digest
        && (expectedSize === undefined || response.body.length === expectedSize), 'digest_unproven');
      usedObjects.add(key); objects.set(key, response.body);
      check(objects.size <= 32 && [...objects.values()].reduce((sum, bytes) => sum + bytes.length, 0) <= 4194304, 'cache_bound_invalid');
      let json; try { json = JSON.parse(response.body); } catch { fail('json_unproven'); }
      return json;
    };
    const members = new Set(), imageManifests = new Set(), attestations = [];
    const walk = async (digest, expectedSize, descriptor, depth = 0) => {
      check(depth <= 3 && members.size < 16 && !members.has(digest), 'publication_graph_invalid'); members.add(digest);
      const manifest = await object('manifests', digest, expectedSize);
      check(manifest?.schemaVersion === 2 && (!descriptor || descriptor.mediaType === manifest.mediaType), 'manifest_invalid');
      if (media.index.has(manifest.mediaType)) {
        check(Array.isArray(manifest.manifests) && manifest.manifests.length > 0 && manifest.manifests.length <= 8, 'index_invalid');
        for (const child of manifest.manifests) {
          check(child && digestPattern.test(child.digest) && Number.isSafeInteger(child.size) && child.size > 0 && child.size <= 1048576
            && (media.index.has(child.mediaType) || media.manifest.has(child.mediaType)), 'descriptor_invalid');
          await walk(child.digest, child.size, child, depth + 1);
        }
        return;
      }
      const attestation = descriptor?.annotations?.['vnd.docker.reference.type'] === 'attestation-manifest';
      const emptyAttestationConfig = attestation && manifest.config?.mediaType === 'application/vnd.oci.empty.v1+json';
      check(media.manifest.has(manifest.mediaType) && (media.config.has(manifest.config?.mediaType) || emptyAttestationConfig)
        && digestPattern.test(manifest.config?.digest) && Number.isSafeInteger(manifest.config?.size)
        && manifest.config.size > 0 && manifest.config.size <= 1048576 && Array.isArray(manifest.layers), 'manifest_invalid');
      const config = await object('blobs', manifest.config.digest, manifest.config.size);
      if (attestation) {
        check(digestPattern.test(descriptor.annotations['vnd.docker.reference.digest'])
          && (emptyAttestationConfig ? Object.keys(config).length === 0 : config.architecture === 'unknown' && config.os === 'unknown')
          && descriptor.platform?.architecture === 'unknown' && descriptor.platform?.os === 'unknown' && manifest.layers.length > 0
          && manifest.layers.every(row => row.mediaType === 'application/vnd.in-toto+json' && digestPattern.test(row.digest)), 'attestation_invalid');
        attestations.push(descriptor.annotations['vnd.docker.reference.digest']);
      } else {
        check(config.config?.Labels?.['org.opencontainers.image.source'] === canonicalSource, 'source_unproven');
        imageManifests.add(digest);
      }
    };
    await walk(publicationDigest);
    check(members.has(imageDigest) && imageManifests.size > 0 && attestations.every(digest => imageManifests.has(digest)), 'membership_unproven');
    check(!cached || usedObjects.size === objects.size, 'cache_unused_objects');
    if (cache && !cached) cache.write(bindings, { schemaVersion: cacheVersion, ...bindings,
      objects: [...objects].map(([key, bytes]) => ({ kind: key.slice(0, key.indexOf(':')), digest: key.slice(key.indexOf(':') + 1), bodyBase64: bytes.toString('base64') })) });
    cache?.stable();
    return { publicationDigest, imageDigest, imageRepository, repositoryUrl: canonicalSource, memberDigests: [...members].sort(), provenanceVerified: true };
  };
}
