import fs from 'node:fs';
import path from 'node:path';
import { localHermesProfilePath, renderLocalHermesProfile, inspectLocalHermesProfile } from './lib/agent-host-hermes-local-profile.mjs';
import { ollamaIdentityPath, observeOllamaListener, assertOllamaIdentity,
  readPinnedOllamaIdentity, assertLocalOllamaModelStore } from './lib/agent-host-ollama-identity.mjs';

const configPath = process.argv[2];
const modelDigest = process.argv[3];
if (!configPath || !path.isAbsolute(configPath) || !/^sha256:[a-f0-9]{64}$/.test(modelDigest ?? ''))
  throw Error('absolute_agent_host_config_and_model_digest_required');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const profilePath = config?.executionProvider?.profile?.profilePath;
const target = localHermesProfilePath(profilePath), parent = path.dirname(path.dirname(target));
if (fs.realpathSync.native(parent).toLowerCase() !== parent.toLowerCase()
  || fs.lstatSync(parent).isSymbolicLink()) throw Error('local_profile_parent_invalid');
const directory = path.dirname(target);
if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
if (fs.lstatSync(directory).isSymbolicLink() || fs.realpathSync.native(directory).toLowerCase() !== directory.toLowerCase())
  throw Error('local_profile_directory_invalid');
if (!fs.existsSync(target)) fs.writeFileSync(target, renderLocalHermesProfile(), { flag: 'wx', mode: 0o600 });
const checked = inspectLocalHermesProfile(profilePath, process.cwd());
await assertLocalOllamaModelStore(modelDigest);
const observed = observeOllamaListener();
const identityFile = ollamaIdentityPath(profilePath);
if (!fs.existsSync(identityFile)) {
  const record = { schemaVersion: 'roost-ollama-runtime-identity-v1', model: 'gpt-oss:20b',
    executablePathDigest: observed.executablePathDigest, executableDigest: observed.executableDigest,
    signerThumbprint: observed.signerThumbprint };
  fs.writeFileSync(identityFile, JSON.stringify(record) + '\n', { flag: 'wx', mode: 0o600 });
}
const pinned = readPinnedOllamaIdentity(profilePath, process.cwd());
assertOllamaIdentity(pinned.pin, observed);
process.stdout.write(JSON.stringify({ schemaVersion: checked.schemaVersion, configDigest: checked.configDigest,
  identityDigest: pinned.fileDigest, modelDigest }) + '\n');
