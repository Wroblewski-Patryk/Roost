import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import https from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { BlockList, isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const digest = /^[a-f0-9]{64}$/;
const slug = /^[a-z0-9][a-z0-9._-]{0,99}$/;
const paths = Object.freeze({
  request: '/v1/api-keys/worker-credentials/handoff/request',
  poll: '/v1/worker-credential-handoff/poll',
  ack: '/v1/worker-credential-handoff/ack',
  status: '/v1/worker-credential-handoff/status',
});
const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(address, prefix, 'ipv4');

const fail = (code) => { throw new Error(`worker_handoff_${code}`); };
const sha = (value) => createHash('sha256').update(value).digest('hex');
const domainHash = (domain, value) => sha(Buffer.concat([Buffer.from(`roost-worker-handoff-v1:${domain}:`), Buffer.from(value)]));
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const reviewDigest = (value) => sha(JSON.stringify(canonical(value)));
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const equalDigest = (a, b) => digest.test(a || '') && digest.test(b || '')
  && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const peerAddress = (value) => isIP(value) === 4 && !blocked.check(value, 'ipv4');

export function productionOrigin(value) {
  const match = typeof value === 'string' && /^https:\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?):([1-9][0-9]{0,4})$/.exec(value);
  if (!match || Number(match[2]) > 65535 || isIP(match[1]) || !match[1].includes('.')
    || match[1].split('.').some((part) => part.length > 63 || part.startsWith('-') || part.endsWith('-'))
    || /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion)$/.test(match[1])) return false;
  try { const url = new URL(value); return url.hostname === match[1] && `${url.protocol}//${url.hostname}:${Number(match[2])}` === value; }
  catch { return false; }
}

export function validateHandoffBinding(binding, hostConfig) {
  if (!exactKeys(binding, ['schemaVersion', 'origin', 'hostSlug', 'workspaceId', 'installationId', 'hostId', 'hostFingerprint', 'certificateFingerprint'])
    || binding.schemaVersion !== 'roost-worker-handoff-client-v1' || !productionOrigin(binding.origin)
    || !slug.test(binding.hostSlug || '') || ![binding.workspaceId, binding.installationId, binding.hostId].every((id) => uuid.test(id || ''))
    || !digest.test(binding.hostFingerprint || '') || !digest.test(binding.certificateFingerprint || '')) fail('binding_invalid');
  if (!hostConfig || hostConfig.host?.slug !== binding.hostSlug || typeof hostConfig.baseUrl !== 'string') fail('host_config_mismatch');
  let configured;
  try { configured = new URL(hostConfig.baseUrl); } catch { fail('host_config_mismatch'); }
  if (configured.protocol !== 'https:' || configured.username || configured.password || configured.search || configured.hash
    || configured.pathname !== '/' || configured.hostname !== new URL(binding.origin).hostname
    || (configured.port || '443') !== (new URL(binding.origin).port || '443')) fail('host_config_mismatch');
  return Object.freeze({ ...binding });
}

async function loadBoundJson(file, maximumBytes) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 2 || info.size > maximumBytes) fail('binding_file_invalid');
  const raw = await readFile(file, 'utf8');
  if (Buffer.byteLength(raw) > maximumBytes) fail('binding_file_invalid');
  try { return JSON.parse(raw); } catch { fail('binding_file_invalid'); }
}

export async function loadHandoffBinding(bindingPath, hostConfigPath) {
  const [binding, hostConfig] = await Promise.all([loadBoundJson(bindingPath, 4096), loadBoundJson(hostConfigPath, 65536)]);
  return validateHandoffBinding(binding, hostConfig);
}

function validateEnvelope(response) {
  if (!exactKeys(response, ['data']) || !response.data || typeof response.data !== 'object' || Array.isArray(response.data)) fail('response_invalid');
  return response.data;
}

function validateStatus(data, requestId) {
  if (data.requestId !== requestId || !['requested', 'approved', 'awaiting_ack', 'acknowledged', 'delivery_unknown', 'revoked', 'expired', 'locked'].includes(data.state)
    || data.qualification !== 'production_https_v1' || data.transportQualified !== true || data.realProvisioningQualified !== true
    || data.launchAuthority !== false || typeof data.deliverySpent !== 'boolean') fail('response_invalid');
  return data;
}

function validateRequestResponse(data, request, userCode) {
  validateStatus(data, request.requestId);
  if (data.state !== 'requested' || data.deliverySpent || data.userCode !== userCode || !uuid.test(data.requestId)
    || !exactKeys(data.binding, ['requestId', 'requestDigest', 'hostFingerprint', 'origin', 'certificateFingerprint', 'replacesRequestId'])
    || data.binding.requestId !== request.requestId || !digest.test(data.binding.requestDigest || '')
    || data.binding.hostFingerprint !== request.hostFingerprint || data.binding.origin !== request.origin
    || data.binding.certificateFingerprint !== request.certificateFingerprint || data.binding.replacesRequestId !== null
    || !Number.isFinite(Date.parse(data.expiresAt))
    || reviewDigest({ ...request, expiresAt: data.expiresAt }) !== data.binding.requestDigest) fail('response_invalid');
  return data;
}

function validateDelivery(data, binding, requestId, requestDigest) {
  validateStatus(data, requestId);
  if (data.state !== 'awaiting_ack' || data.deliverySpent !== true || !exactKeys(data.credential,
    ['id', 'workspaceId', 'installationId', 'hostId', 'version', 'epoch', 'fingerprint', 'active', 'revokedAt', 'expiresAt', 'scopes'])
    || !uuid.test(data.credential.id || '') || data.credential.workspaceId !== binding.workspaceId
    || data.credential.installationId !== binding.installationId || data.credential.hostId !== binding.hostId
    || data.credential.active !== false || data.credential.revokedAt !== null || data.credential.version !== 1
    || !Number.isInteger(data.credential.epoch) || data.credential.epoch < 1
    || !digest.test(data.credential.fingerprint || '') || !digest.test(data.responseDigest || '')
    || !digest.test(data.ackProof || '') || !Number.isFinite(Date.parse(data.ackDeadline))
    || !Number.isFinite(Date.parse(data.credential.expiresAt)) || Date.parse(data.ackDeadline) <= Date.now()
    || typeof data.key !== 'string' || !/^cc_v1_[A-Za-z0-9_-]{32}$/.test(data.key)
    || reviewDigest({ requestId, requestDigest, credential: data.credential, ackDeadline: data.ackDeadline }) !== data.responseDigest) fail('response_invalid');
  return data;
}

export async function productionHandoffExchange(binding, action, body) {
  if (!Object.hasOwn(paths, action)) fail('action_invalid');
  const url = new URL(binding.origin);
  let addresses;
  try { addresses = await dnsLookup(url.hostname, { all: true, family: 4, verbatim: true }); } catch { fail('dns_invalid'); }
  if (!Array.isArray(addresses) || addresses.length < 1 || addresses.length > 16 || addresses.some((item) => !peerAddress(item.address))) fail('dns_invalid');
  const address = addresses[0].address;
  const payload = JSON.stringify(body);
  if (Buffer.byteLength(payload) > 8192) fail('request_invalid');
  return await new Promise((resolve, reject) => {
    let settled = false, sent = false, socketReady = false;
    const finish = (error, data) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(data); };
    const uncertain = () => new Error(sent ? 'worker_handoff_delivery_unknown' : 'worker_handoff_transport_invalid');
    const req = https.request({ protocol: 'https:', hostname: url.hostname, servername: url.hostname,
      port: Number(url.port || '443'), path: paths[action], method: 'POST',
      agent: false, rejectUnauthorized: true, minVersion: 'TLSv1.2', timeout: 10000,
      lookup: (_hostname, options, callback) => callback(null, address, 4),
      checkServerIdentity: (name, certificate) => {
        const ordinary = checkServerIdentity(name, certificate);
        if (ordinary) return ordinary;
        if (!certificate?.raw || !equalDigest(sha(certificate.raw), binding.certificateFingerprint)) return new Error('certificate_pin_invalid');
        return undefined;
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(payload),
        'Cache-Control': 'no-store', 'Accept-Encoding': 'identity', Connection: 'close' }, maxHeaderSize: 4096,
    }, (res) => {
      const length = res.headers['content-length'];
      if (res.statusCode !== 200 || res.headers.location || res.headers['content-encoding'] || !String(res.headers['content-type'] || '').startsWith('application/json')
        || String(res.headers['cache-control'] || '').toLowerCase() !== 'no-store'
        || typeof length !== 'string' || !/^(0|[1-9][0-9]*)$/.test(length) || Number(length) > 8192
        || res.headers['transfer-encoding']) { res.destroy(); finish(new Error('worker_handoff_response_invalid')); return; }
      let size = 0; const chunks = [];
      res.on('data', (chunk) => { size += chunk.length; if (size > 8192) { res.destroy(); finish(new Error('worker_handoff_response_invalid')); } else chunks.push(chunk); });
      res.on('end', () => { if (settled) return; try { finish(null, validateEnvelope(JSON.parse(Buffer.concat(chunks).toString('utf8')))); }
        catch { finish(new Error('worker_handoff_response_invalid')); } });
      res.on('error', () => finish(uncertain()));
    });
    const timer = setTimeout(() => { req.destroy(); finish(uncertain()); }, 10000);
    req.on('socket', (socket) => socket.once('secureConnect', () => {
      if (settled) return;
      if (!socket.authorized || !peerAddress(socket.remoteAddress) || socket.remoteAddress !== address) {
        req.destroy(); finish(new Error('worker_handoff_transport_invalid')); return;
      }
      socketReady = true;
      sent = true;
      req.end(payload);
    }));
    req.on('timeout', () => { req.destroy(); finish(uncertain()); });
    req.on('error', () => finish(uncertain()));
    // The socket cannot send the body until secureConnect passes every check.
    void socketReady;
  });
}

function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

export async function runHandoff(binding, { exchange = productionHandoffExchange, storeCredential, report = () => {}, pause = wait } = {}) {
  if (typeof storeCredential !== 'function') fail('store_unavailable');
  const requestId = randomUUID();
  const deviceSecret = randomBytes(48), challenge = randomBytes(48);
  const userCode = domainHash('code', requestId).slice(0, 8).toUpperCase();
  const common = { requestId, workspaceId: binding.workspaceId, installationId: binding.installationId,
    hostId: binding.hostId, hostFingerprint: binding.hostFingerprint };
  const request = { ...common, deviceSecretHash: domainHash('device', deviceSecret), challengeHash: domainHash('challenge', challenge),
    origin: binding.origin, certificateFingerprint: binding.certificateFingerprint, replacesRequestId: null };
  const proof = { ...common, deviceSecret: deviceSecret.toString('base64url'), challenge: challenge.toString('base64url') };
  let stored = false;
  try {
    const created = validateRequestResponse(await exchange(binding, 'request', request), request, userCode);
    report({ state: 'requested', requestId, userCode, expiresAt: created.expiresAt });
    const deadline = Math.min(Date.parse(created.expiresAt), Date.now() + 120000);
    for (let pollCount = 0; pollCount < 30 && Date.now() + 4000 < deadline; pollCount++) {
      await pause(4000);
      const data = validateStatus(await exchange(binding, 'poll', proof), requestId);
      if (data.state === 'requested' || data.state === 'approved') continue;
      if (data.state !== 'awaiting_ack') fail(data.state);
      const delivery = validateDelivery(data, binding, requestId, created.binding.requestDigest);
      // The credential is returned once. A failed store leaves it inactive; never poll again.
      await storeCredential(delivery.key);
      stored = true;
      const ack = { ...proof, credentialId: delivery.credential.id, credentialFingerprint: delivery.credential.fingerprint,
        responseDigest: delivery.responseDigest, ackProof: delivery.ackProof };
      const acknowledged = validateStatus(await exchange(binding, 'ack', ack), requestId);
      if (acknowledged.state !== 'acknowledged' || acknowledged.deliverySpent !== true) fail('ack_invalid');
      report({ state: 'acknowledged', requestId, credentialId: delivery.credential.id, credentialFingerprint: delivery.credential.fingerprint });
      return { state: 'acknowledged', requestId, credentialId: delivery.credential.id };
    }
    fail('expired');
  } catch (error) {
    if (stored) fail('delivery_unknown');
    throw error;
  } finally { deviceSecret.fill(0); challenge.fill(0); }
}

export async function storeCredentialWithWindowsManager(key, scriptPath) {
  if (process.platform !== 'win32' || typeof key !== 'string' || !/^cc_v1_[A-Za-z0-9_-]{32}$/.test(key)) fail('store_unavailable');
  const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await new Promise((resolve, reject) => {
    const child = spawn(shell, ['-NoProfile', '-NonInteractive', '-File', scriptPath, '-Action', 'StoreHandoffCredential'],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: {
        SystemRoot: process.env.SystemRoot, USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP, TMP: process.env.TMP, PATH: process.env.PATH, ComSpec: process.env.ComSpec,
      } });
    let output = '', errorSize = 0;
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); if (output.length > 128) child.kill(); });
    child.stderr.on('data', (chunk) => { errorSize += chunk.length; if (errorSize > 128) child.kill(); });
    child.on('error', () => { clearTimeout(timer); reject(new Error('worker_handoff_store_failed')); });
    child.on('close', (code) => { clearTimeout(timer); code === 0 && output.trim() === 'credential_stored'
      ? resolve() : reject(new Error('worker_handoff_store_failed')); });
    child.stdin.end(key);
  });
}

async function main() {
  const bindingPath = process.env.ROOST_AGENT_HANDOFF_CONFIG;
  const hostConfigPath = process.env.ROOST_AGENT_HOST_CONFIG;
  const scriptPath = process.env.ROOST_AGENT_HOST_WINDOWS_SCRIPT;
  if (!bindingPath || !hostConfigPath || !scriptPath) fail('binding_missing');
  const binding = await loadHandoffBinding(bindingPath, hostConfigPath);
  await runHandoff(binding, {
    storeCredential: (key) => storeCredentialWithWindowsManager(key, scriptPath),
    report: (status) => {
      if (status.state === 'requested') process.stdout.write(`Request ${status.requestId}; code ${status.userCode}; expires ${status.expiresAt}\n`);
      else process.stdout.write(`Credential ${status.credentialId} stored and acknowledged.\n`);
    },
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(`${/^worker_handoff_[a-z_]+$/.test(error?.message) ? error.message : 'worker_handoff_failed'}\n`); process.exitCode = 1; });
}
