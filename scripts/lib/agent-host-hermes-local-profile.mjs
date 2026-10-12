import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { renderHermesNativeProfile } from './agent-host-hermes-profile.mjs';
import { physicalIdentity } from './agent-host-native-footprint.mjs';

export const localHermesProfileVersion = 'roost-hermes-ollama-profile-v1';
export const localObserverBaseUrl = 'http://127.0.0.1:11435/v1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const profile = JSON.parse(renderHermesNativeProfile({ apiMaxRetries: 0, maxTurns: 24 }));
profile.model = { default: '', provider: 'ollama', base_url: localObserverBaseUrl, api_mode: 'chat_completions' };
const bytes = JSON.stringify(profile, null, 2) + '\n';
export const localHermesProfileDigest = hash(bytes);
export const renderLocalHermesProfile = () => bytes;

function fail(reason) {
  throw Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
    outcome: 'policy_blocked', publicMessage: 'The exact local Hermes profile is unavailable or changed.', details: { reason } });
}

export function localHermesProfilePath(codexProfilePath) {
  if (typeof codexProfilePath !== 'string' || path.basename(codexProfilePath) !== 'config.yaml'
    || !path.isAbsolute(codexProfilePath)) fail('local_profile_parent_invalid');
  return path.join(path.dirname(path.dirname(codexProfilePath)), 'ollama-loopback', 'config.yaml');
}

export function inspectLocalHermesProfile(codexProfilePath, workingDirectory) {
  const file = localHermesProfilePath(codexProfilePath), directory = path.dirname(file);
  if (!workingDirectory || !path.isAbsolute(workingDirectory)
    || !path.relative(workingDirectory, file).startsWith('..')) fail('local_profile_workspace_invalid');
  let fd;
  try {
    physicalIdentity(directory);
    for (let current = file; current !== path.dirname(current); current = path.dirname(current)) {
      if (fs.lstatSync(current).isSymbolicLink()) fail('local_profile_link_invalid');
    }
    const before = fs.lstatSync(file, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(Buffer.byteLength(bytes))) fail('local_profile_bytes_invalid');
    fd = fs.openSync(file, 'r');
    const opened = fs.fstatSync(fd, { bigint: true });
    if (opened.ino !== before.ino || opened.size !== before.size) fail('local_profile_changed');
    const actual = fs.readFileSync(fd), after = fs.lstatSync(file, { bigint: true });
    if (after.ino !== opened.ino || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs
      || !actual.equals(Buffer.from(bytes))) fail('local_profile_changed');
    return Object.freeze({ schemaVersion: localHermesProfileVersion, profilePath: file,
      configDigest: localHermesProfileDigest, identity: physicalIdentity(file, false) });
  } catch (error) {
    if (error.protocolAdmission) throw error;
    fail('local_profile_unreadable');
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}
