#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, realpathSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { fetchGuidedPackages } from './lib/reference-site-guided-source.mjs';
import { parseGuidedFindingOutput } from './lib/reference-site-guided-findings.mjs';
import { canonicalGuidedAttemptDirectory, readGuidedAttempt } from './lib/reference-site-guided-admission.mjs';
import { loadReferenceSiteMcpGuard } from './lib/reference-site-mcp-guard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const bridgePath = fileURLToPath(new URL('./companycore-mcp-server.mjs', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = reason => { throw Object.assign(new Error(`guided_publish_${reason}`), { reason }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const inside = (child, parent) => {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};
const contentKeys = ['title', 'category', 'language', 'observed', 'sourceExcerpt',
  'interpretation', 'uncertainty', 'applicability'];
function durableNew(path, value) {
  const fd = openSync(path, 'wx', 0o600);
  try {
    const bytes = Buffer.from(JSON.stringify(value), 'utf8');
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(fd, bytes, offset, bytes.length - offset);
      if (!written) fail('receipt_write_failed');
      offset += written;
    }
    fsyncSync(fd);
  } finally { closeSync(fd); }
}

class BridgeClient {
  constructor({ baseUrl, apiKey, guardConfigPath }) {
    this.nextId = 0;
    this.pending = new Map();
    this.stdout = '';
    this.stderr = '';
    this.approvalOrigin = null;
    const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'PATH']
      .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
    Object.assign(env, { COMPANYCORE_BASE_URL: baseUrl, COMPANYCORE_API_KEY: apiKey,
      COMPANYCORE_MCP_FINDING_GUARD_CONFIG: guardConfigPath,
      COMPANYCORE_MCP_COMMAND_MODE: 'supervised_operator' });
    this.child = spawn(process.execPath, [bridgePath, '--require-finding-guard'],
      { cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.child.stdout.on('data', bytes => {
      this.stdout += bytes.toString('utf8');
      if (this.stdout.length > 65536) { this.child.kill(); return; }
      let index;
      while ((index = this.stdout.indexOf('\n')) >= 0) {
        const line = this.stdout.slice(0, index); this.stdout = this.stdout.slice(index + 1);
        let message;
        try { message = JSON.parse(line); } catch { this.child.kill(); return; }
        const pending = this.pending.get(message.id);
        if (pending) { this.pending.delete(message.id); pending.resolve(message); }
      }
    });
    this.child.stderr.on('data', bytes => {
      this.stderr += bytes.toString('utf8');
      if (this.stderr.length > 8192) this.stderr = this.stderr.slice(-8192);
      const match = this.stderr.match(/Finding approval page: (http:\/\/127\.0\.0\.1:\d+)\//);
      if (match && !this.approvalOrigin) {
        this.approvalOrigin = match[1];
        process.stdout.write(`Exact Finding review: ${this.approvalOrigin}/\n`);
      }
    });
    this.child.on('exit', () => {
      for (const item of this.pending.values()) item.reject(new Error('guided_publish_bridge_exit'));
      this.pending.clear();
    });
  }
  request(method, params, timeoutMs = 330000) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('guided_publish_bridge_timeout')); }, timeoutMs);
      this.pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); } });
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }
  async close() {
    this.child.stdin.end();
    if (this.child.exitCode !== null) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => { this.child.kill(); resolve(); }, 5000);
      this.child.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}

async function readback({ baseUrl, apiKey, taskId, siteId, findingId, body, actorId }) {
  const url = new URL(`/v1/product-engineering/tasks/${encodeURIComponent(taskId)}/reference-sites/${encodeURIComponent(siteId)}/findings`, baseUrl);
  const response = await fetch(url, { redirect: 'manual', headers: { Accept: 'application/json', 'X-API-Key': apiKey },
    signal: AbortSignal.timeout(15000) });
  if (response.status !== 200 || response.redirected) fail('readback_unavailable');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > 524288) fail('readback_oversize');
  let parsed;
  try { parsed = JSON.parse(text); } catch { fail('readback_invalid'); }
  const item = parsed?.data?.items?.find(value => value.id === findingId);
  if (!item || item.actorId !== actorId || item.verification !== 'unverified'
    || !contentKeys.every(key => item.body?.[key] === body[key])) fail('readback_mismatch');
  return item;
}

async function main() {
  if (process.argv.length !== 6 || process.argv[2] !== '--config' || process.argv[4] !== '--site'
    || !isAbsolute(process.argv[3]) || !['1', '2'].includes(process.argv[5])) fail('arguments_invalid');
  const index = Number(process.argv[5]) - 1;
  const configPath = realpathSync(process.argv[3]);
  if (inside(configPath, realpathSync(root))) fail('config_in_repository');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!exact(config, ['schemaVersion', 'baseUrl', 'resultPath', 'guardConfigPath', 'stateDirectory', 'agentId'])
    || config.schemaVersion !== 'roost-g24c-guided-publish-v1'
    || !isAbsolute(config.resultPath) || !isAbsolute(config.guardConfigPath)
    || !/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(config.agentId ?? '')) fail('configuration_invalid');
  const state = realpathSync(config.stateDirectory);
  if (inside(state, realpathSync(root)) || realpathSync(dirname(config.resultPath)) !== state
    || realpathSync(dirname(config.guardConfigPath)) !== state) fail('private_paths_invalid');
  const stored = JSON.parse(readFileSync(config.resultPath, 'utf8'));
  const guardConfig = JSON.parse(readFileSync(config.guardConfigPath, 'utf8'));
  const physical = readGuidedAttempt({ directory: canonicalGuidedAttemptDirectory(),
    repositoryRoot: root, taskId: stored.taskId });
  if (!loadReferenceSiteMcpGuard(config.guardConfigPath, root)
    || stored.schemaVersion !== 'roost-g24c-guided-private-result-v1'
    || stored.taskId !== guardConfig.taskId || !isDeepStrictEqual(stored.pins.sites, guardConfig.sites)
    || !isDeepStrictEqual(stored.admission, physical.admission)
    || !isDeepStrictEqual(stored.outcome, physical.outcome)
    || stored.bundleDigest !== physical.admission.bundleDigest
    || stored.parseError !== null || stored.outcome?.status !== 'candidate_result'
    || stored.admission?.inputSeal !== stored.inputSeal || stored.outcome?.inputSeal !== stored.inputSeal
    || stored.outcome?.outputDigest !== stored.outputDigest || sha(stored.rawResponse) !== stored.outputDigest)
    fail('result_binding_invalid');
  const submittedPath = join(state, `g24c-${stored.taskId}-site-${index + 1}.submitted.json`);
  const confirmedPath = join(state, `g24c-${stored.taskId}-site-${index + 1}.confirmed.json`);
  if (existsSync(submittedPath) || existsSync(confirmedPath)) fail('site_already_submitted');
  if (index === 1 && !existsSync(join(state, `g24c-${stored.taskId}-site-1.confirmed.json`))) fail('first_site_unconfirmed');
  const apiKey = process.env.COMPANYCORE_API_KEY;
  const current = await fetchGuidedPackages({ baseUrl: config.baseUrl, apiKey, pins: stored.pins });
  if (current.bundleDigest !== stored.bundleDigest) fail('source_changed');
  const parsed = parseGuidedFindingOutput(stored.rawResponse, current);
  if (!isDeepStrictEqual(parsed.proposals, stored.proposals)) fail('proposal_changed');
  const proposal = parsed.proposals[index], body = Object.fromEntries(contentKeys.map(key => [key, proposal.body[key]]));
  const bridge = new BridgeClient({ baseUrl: config.baseUrl, apiKey, guardConfigPath: config.guardConfigPath });
  try {
    const list = await bridge.request('tools/list', {}, 30000);
    const names = list?.result?.tools?.map(tool => tool.name);
    if (!isDeepStrictEqual(names, [1, 2].map(n => `companycore_guarded_reference_site_${n}_get_package`)
      .concat([1, 2].map(n => `companycore_guarded_reference_site_${n}_post_finding`)))) fail('bridge_catalog_changed');
    process.stdout.write(`Awaiting separate exact owner decision for Site ${index + 1}.\n`);
    const answer = await bridge.request('tools/call', { name: `companycore_guarded_reference_site_${index + 1}_post_finding`,
      arguments: { body } });
    const data = answer?.result?.structuredContent;
    if (answer?.error || answer?.result?.isError || !data?.ok || data.status !== 201
      || !data.body?.data?.record?.id || data.body.data.replayed !== false) fail('post_not_confirmed');
    const findingId = data.body.data.record.id;
    durableNew(submittedPath, { schemaVersion: 'roost-g24c-guided-submission-v1', taskId: stored.taskId,
      siteId: proposal.siteId, findingId, agentId: config.agentId, inputSeal: stored.inputSeal,
      outputDigest: stored.outputDigest, contentDigest: sha(JSON.stringify(body)), submittedAt: new Date().toISOString() });
    const found = await readback({ baseUrl: config.baseUrl, apiKey, taskId: stored.taskId,
      siteId: proposal.siteId, findingId, body, actorId: config.agentId });
    durableNew(confirmedPath, { schemaVersion: 'roost-g24c-guided-confirmation-v1', taskId: stored.taskId,
      siteId: proposal.siteId, findingId, findingDigest: found.findingDigest,
      outputDigest: stored.outputDigest, confirmedAt: new Date().toISOString() });
    process.stdout.write(JSON.stringify({ status: 'finding_confirmed_unverified', site: index + 1,
      findingId, findingDigest: found.findingDigest }) + '\n');
  } finally { await bridge.close(); }
}

main().catch(error => {
  process.stderr.write(`G24c Finding publication stopped: ${/^[a-z0-9_]{3,80}$/.test(error?.reason ?? '') ? error.reason : 'unclassified'}\n`);
  process.exitCode = 1;
});
