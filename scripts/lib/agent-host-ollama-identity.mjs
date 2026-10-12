import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { localHermesProfilePath } from './agent-host-hermes-local-profile.mjs';
import { physicalIdentity } from './agent-host-native-footprint.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const digest = /^sha256:[a-f0-9]{64}$/;
const model = 'gpt-oss:20b';
const fail = reason => { throw Object.assign(new Error('ollama_identity_denied'), { protocolAdmission: true,
  retryable: false, publicMessage: 'The pinned local Ollama process or model files could not be verified.', details: { reason } }); };

export function ollamaIdentityPath(codexProfilePath) {
  return path.join(path.dirname(localHermesProfilePath(codexProfilePath)), 'runtime-identity.json');
}

function readWindowsObservation(source) {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !path.isAbsolute(systemRoot)) fail('windows_root_invalid');
  const shell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const environment = { SystemRoot: systemRoot, WINDIR: systemRoot,
    PATH: `${path.join(systemRoot, 'System32')};${path.dirname(shell)}`,
    PSModulePath: path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules'),
    TEMP: process.env.TEMP, TMP: process.env.TMP };
  return JSON.parse(execFileSync(shell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(source, 'utf16le').toString('base64')],
    { windowsHide: true, shell: false, timeout: 15000, maxBuffer: 8192, encoding: 'utf8',
      env: environment, stdio: ['ignore', 'pipe', 'pipe'] }));
}

export function observeOllamaListener() {
  if (process.platform !== 'win32') fail('windows_required');
  // Only the exact loopback listener is queried. The private prompt is not sent
  // until this OS observation matches the pinned signed executable.
  const source = `$ErrorActionPreference='Stop'; $links=@(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 11434 -State Listen -ErrorAction Stop); if($links.Count -ne 1){throw 'listener_ambiguous'}; $p=Get-Process -Id $links[0].OwningProcess -ErrorAction Stop; $s=Get-AuthenticodeSignature -LiteralPath $p.Path -ErrorAction Stop; $h=Get-FileHash -LiteralPath $p.Path -Algorithm SHA256 -ErrorAction Stop; @{pid=[int]$p.Id;startedAt=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path;executableDigest=$h.Hash.ToLowerInvariant();signatureStatus=$s.Status.ToString();signerThumbprint=$s.SignerCertificate.Thumbprint.ToLowerInvariant();signerSubject=$s.SignerCertificate.Subject}|ConvertTo-Json -Compress`;
  try {
    const observed = readWindowsObservation(source);
    if (!Number.isSafeInteger(observed.pid) || observed.pid < 1 || !/^\d{16,20}$/.test(observed.startedAt)
      || !hash.test(observed.executableDigest) || !/^[a-f0-9]{40}$/.test(observed.signerThumbprint)
      || observed.signatureStatus !== 'Valid' || !/(^|, )O=Ollama Inc\.(,|$)/.test(observed.signerSubject)) fail('listener_binary_untrusted');
    const expected = path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Ollama', 'ollama.exe');
    if (!path.isAbsolute(expected) || fs.realpathSync.native(observed.executable).toLowerCase() !== fs.realpathSync.native(expected).toLowerCase())
      fail('listener_executable_path_invalid');
    physicalIdentity(observed.executable, false);
    return Object.freeze({ pid: observed.pid, startedAt: observed.startedAt,
      executablePathDigest: sha(fs.realpathSync.native(observed.executable).toLowerCase()),
      executableDigest: observed.executableDigest, signerThumbprint: observed.signerThumbprint });
  } catch (error) { if (error.protocolAdmission) throw error; fail('listener_observation_failed'); }
}

export function assertOllamaSocketOwner(clientPort, initial) {
  if (process.platform !== 'win32' || !Number.isInteger(clientPort) || clientPort < 1 || clientPort > 65535
    || !Number.isSafeInteger(initial?.pid) || !/^\d{16,20}$/.test(initial?.startedAt ?? '')) fail('socket_binding_invalid');
  const source = `$ErrorActionPreference='Stop'; $links=@(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 11434 -RemoteAddress 127.0.0.1 -RemotePort ${clientPort} -State Established -ErrorAction Stop); if($links.Count -ne 1){throw 'socket_ambiguous'}; $p=Get-Process -Id $links[0].OwningProcess -ErrorAction Stop; @{pid=[int]$p.Id;startedAt=$p.StartTime.ToFileTimeUtc().ToString()}|ConvertTo-Json -Compress`;
  try {
    const observed = readWindowsObservation(source);
    if (observed.pid !== initial.pid || observed.startedAt !== initial.startedAt) fail('socket_owner_changed');
    return true;
  } catch (error) { if (error.protocolAdmission) throw error; fail('socket_owner_unavailable'); }
}

export function assertOllamaIdentity(pin, observed, initial = null) {
  if (pin?.schemaVersion !== 'roost-ollama-runtime-identity-v1' || pin.model !== model
    || !hash.test(pin.executablePathDigest ?? '') || !hash.test(pin.executableDigest ?? '')
    || !/^[a-f0-9]{40}$/.test(pin.signerThumbprint ?? '')
    || !Number.isSafeInteger(observed?.pid) || !/^\d{16,20}$/.test(observed?.startedAt ?? '')
    || observed.executablePathDigest !== pin.executablePathDigest
    || observed.executableDigest !== pin.executableDigest
    || observed.signerThumbprint !== pin.signerThumbprint
    || initial && (observed.pid !== initial.pid || observed.startedAt !== initial.startedAt)) fail('listener_identity_changed');
  return true;
}

export function readPinnedOllamaIdentity(codexProfilePath, workingDirectory) {
  const file = ollamaIdentityPath(codexProfilePath);
  if (!path.isAbsolute(file) || !path.isAbsolute(workingDirectory)
    || !path.relative(workingDirectory, file).startsWith('..')) fail('identity_path_invalid');
  try {
    const before = fs.lstatSync(file, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size > 4096n) fail('identity_file_invalid');
    const bytes = fs.readFileSync(file), after = fs.lstatSync(file, { bigint: true });
    if (before.ino !== after.ino || before.mtimeNs !== after.mtimeNs || before.size !== after.size) fail('identity_file_changed');
    physicalIdentity(file, false);
    const pin = JSON.parse(bytes.toString('utf8'));
    if (Object.keys(pin).sort().join(',') !== 'executableDigest,executablePathDigest,model,schemaVersion,signerThumbprint') fail('identity_shape_invalid');
    if (pin.schemaVersion !== 'roost-ollama-runtime-identity-v1' || pin.model !== model
      || !hash.test(pin.executablePathDigest) || !hash.test(pin.executableDigest)
      || !/^[a-f0-9]{40}$/.test(pin.signerThumbprint)) fail('identity_shape_invalid');
    return Object.freeze({ pin: Object.freeze(pin), fileDigest: sha(bytes) });
  } catch (error) { if (error.protocolAdmission) throw error; fail('identity_file_unavailable'); }
}

export async function assertLocalOllamaModelStore(expectedDigest) {
  if (!digest.test(expectedDigest)) fail('model_digest_invalid');
  const root = path.join(process.env.USERPROFILE ?? '', '.ollama', 'models');
  const manifestPath = path.join(root, 'manifests', 'registry.ollama.ai', 'library', 'gpt-oss', '20b');
  try {
    if (!path.isAbsolute(root)) fail('model_store_invalid');
    const manifestStat = fs.lstatSync(manifestPath, { bigint: true });
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.nlink !== 1n || manifestStat.size > 1024n * 1024n) fail('model_manifest_invalid');
    const manifestBytes = fs.readFileSync(manifestPath);
    if (`sha256:${sha(manifestBytes)}` !== expectedDigest) fail('model_manifest_digest_changed');
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const layers = [manifest.config, ...manifest.layers];
    if (!Array.isArray(manifest.layers) || layers.length < 2 || layers.length > 32) fail('model_manifest_shape_invalid');
    for (const item of layers) {
      if (!digest.test(item?.digest) || !Number.isSafeInteger(item?.size) || item.size <= 0) fail('model_blob_shape_invalid');
      const file = path.join(root, 'blobs', item.digest.replace(':', '-'));
      const before = fs.lstatSync(file, { bigint: true });
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size !== BigInt(item.size)) fail('model_blob_invalid');
      const h = createHash('sha256');
      for await (const chunk of fs.createReadStream(file)) h.update(chunk);
      const after = fs.lstatSync(file, { bigint: true });
      if (before.ino !== after.ino || before.mtimeNs !== after.mtimeNs || before.size !== after.size
        || `sha256:${h.digest('hex')}` !== item.digest) fail('model_blob_digest_changed');
    }
    return Object.freeze({ model, digest: expectedDigest, blobCount: layers.length });
  } catch (error) { if (error.protocolAdmission) throw error; fail('model_store_unavailable'); }
}
