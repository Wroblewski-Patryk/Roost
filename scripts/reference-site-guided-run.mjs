#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, realpathSync, statSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGuidedPackages } from './lib/reference-site-guided-source.mjs';
import { buildGuidedFindingInput, parseGuidedFindingOutput } from './lib/reference-site-guided-findings.mjs';
import { runGuidedNative } from './lib/reference-site-guided-native.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = reason => { throw Object.assign(new Error(`guided_run_${reason}`), { reason }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const inside = (child, parent) => {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};
function durableNew(path, value) {
  const fd = openSync(path, 'wx', 0o600);
  try {
    const bytes = Buffer.from(JSON.stringify(value), 'utf8');
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(fd, bytes, offset, bytes.length - offset);
      if (!written) fail('output_write_failed');
      offset += written;
    }
    fsyncSync(fd);
  } finally { closeSync(fd); }
}

async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== '--config' || !isAbsolute(process.argv[3])) fail('arguments_invalid');
  const configPath = realpathSync(process.argv[3]);
  if (inside(configPath, realpathSync(root))) fail('config_in_repository');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!exact(config, ['schemaVersion', 'baseUrl', 'pins', 'agentHostConfigPath', 'workingDirectory', 'stateDirectory', 'outputPath'])
    || config.schemaVersion !== 'roost-g24c-guided-run-v1' || !Array.isArray(config.pins?.sites)
    || config.pins.sites.length !== 2 || !isAbsolute(config.agentHostConfigPath)
    || !isAbsolute(config.stateDirectory) || !isAbsolute(config.workingDirectory)
    || !isAbsolute(config.outputPath)) fail('configuration_invalid');
  const state = realpathSync(config.stateDirectory), scratch = realpathSync(config.workingDirectory);
  const outputParent = realpathSync(dirname(config.outputPath));
  if (inside(state, realpathSync(root)) || state !== outputParent || !statSync(state).isDirectory()
    || !statSync(scratch).isDirectory() || existsSync(config.outputPath)) fail('private_paths_invalid');
  const apiKey = process.env.COMPANYCORE_API_KEY;
  const agentHost = JSON.parse(readFileSync(config.agentHostConfigPath, 'utf8'));
  const first = await fetchGuidedPackages({ baseUrl: config.baseUrl, apiKey, pins: config.pins });
  const sealed = buildGuidedFindingInput(first);
  const second = await fetchGuidedPackages({ baseUrl: config.baseUrl, apiKey, pins: config.pins });
  if (second.bundleDigest !== first.bundleDigest) fail('source_changed_before_model');
  const native = await runGuidedNative({ provider: agentHost.executionProvider, repositoryRoot: root,
    workingDirectory: scratch, taskId: config.pins.taskId,
    bundleDigest: first.bundleDigest, input: sealed.input, inputSeal: sealed.inputSeal });
  let parsed, parseError = null;
  try { parsed = parseGuidedFindingOutput(native.finalResponse, first); }
  catch (error) { parseError = error?.reason ?? 'output_invalid'; }
  const record = { schemaVersion: 'roost-g24c-guided-private-result-v1',
    taskId: config.pins.taskId, pins: config.pins, admission: native.admission,
    outcome: native.outcome, bundleDigest: first.bundleDigest, inputSeal: sealed.inputSeal,
    outputDigest: hash(native.finalResponse), provider: 'openai-codex', model: 'gpt-5.6-sol', effort: 'low',
    toolQualificationDigest: native.toolQualificationDigest, installationDigest: native.installationDigest,
    rawResponse: native.finalResponse, parseError,
    proposals: parsed?.proposals ?? null };
  durableNew(config.outputPath, record);
  process.stdout.write(JSON.stringify({ status: parseError ? 'model_output_rejected' : 'two_proposals_for_owner_review',
    taskId: config.pins.taskId, inputSeal: sealed.inputSeal, outputDigest: record.outputDigest,
    outputPath: config.outputPath }) + '\n');
  if (parseError) process.exitCode = 2;
}

main().catch(error => {
  process.stderr.write(`G24c guided run stopped: ${/^[a-z0-9_]{3,80}$/.test(error?.reason ?? '') ? error.reason : 'unclassified'}\n`);
  process.exitCode = 1;
});
