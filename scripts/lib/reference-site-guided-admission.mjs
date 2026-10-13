import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, writeSync } from 'node:fs';
import { userInfo } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';

const sha = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex = /^[a-f0-9]{64}$/;
const fail = reason => { throw Object.assign(new Error(`guided_admission_${reason}`), { reason }); };
const inside = (child, parent) => {
  const value = relative(parent, child);
  return value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value));
};
function privateDirectory(directory, repositoryRoot) {
  if (!isAbsolute(directory) || !isAbsolute(repositoryRoot)) fail('path_invalid');
  const root = realpathSync(repositoryRoot), selected = realpathSync(directory);
  if (inside(selected, root) || !statSync(selected).isDirectory()) fail('directory_invalid');
  return selected;
}
// The production task fence lives in one installation-owned path, independent
// of a per-session guard or output directory. Changing a session config cannot
// replenish a spent model attempt.
export function canonicalGuidedAttemptDirectory() {
  // os.homedir() follows USERPROFILE on Windows. The account database home
  // keeps this fence stable across caller-controlled session environments.
  const home = realpathSync(userInfo().homedir);
  const agentHost = join(home, '.roost', 'agent-host');
  if (realpathSync(agentHost) !== agentHost) fail('agent_host_path_changed');
  const directory = join(agentHost, 'g24c-guided-attempts');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (realpathSync(directory) !== directory) fail('attempt_path_changed');
  return directory;
}
export function guidedAttemptPaths({ directory, repositoryRoot, taskId }) {
  if (!uuid.test(taskId ?? '')) fail('binding_invalid');
  const selected = privateDirectory(directory, repositoryRoot);
  const basename = `g24c-codex-${sha(taskId.toLowerCase())}`;
  return Object.freeze({ path: join(selected, `${basename}.admission.json`),
    outcomePath: join(selected, `${basename}.outcome.json`) });
}
function durableNew(path, record) {
  let fd;
  try { fd = openSync(path, 'wx', 0o600); }
  catch (error) { if (error?.code === 'EEXIST') fail('already_spent'); throw error; }
  try {
    const bytes = Buffer.from(JSON.stringify(record), 'utf8');
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(fd, bytes, offset, bytes.length - offset);
      if (!written) fail('write_failed');
      offset += written;
    }
    fsyncSync(fd);
  } finally { closeSync(fd); }
}

// The fixed task slot survives process failure and a changed source revision.
// A crash after creation is an exhausted attempt, never a reason to retry.
export function reserveGuidedAttempt({ directory, repositoryRoot, taskId, bundleDigest, inputSeal }) {
  if (!uuid.test(taskId ?? '') || !hex.test(bundleDigest ?? '') || !hex.test(inputSeal ?? '')) fail('binding_invalid');
  taskId = taskId.toLowerCase();
  const { path, outcomePath } = guidedAttemptPaths({ directory, repositoryRoot, taskId });
  const admission = Object.freeze({ schemaVersion: 'roost-g24c-guided-admission-v1',
    attemptId: randomUUID(), taskId, bundleDigest, inputSeal,
    backend: 'codex_responses', model: 'gpt-5.6-sol', effort: 'low',
    maxDurationSeconds: 600, maxTurns: 1, tools: [], externalWrites: false,
    reservedAt: new Date().toISOString() });
  durableNew(path, admission);
  return Object.freeze({ path, outcomePath, admission });
}

export function readGuidedAttempt({ directory, repositoryRoot, taskId }) {
  if (!uuid.test(taskId ?? '')) fail('binding_invalid');
  taskId = taskId.toLowerCase();
  const paths = guidedAttemptPaths({ directory, repositoryRoot, taskId });
  let admission, outcome;
  try {
    admission = JSON.parse(readFileSync(paths.path, 'utf8'));
    outcome = JSON.parse(readFileSync(paths.outcomePath, 'utf8'));
  } catch { fail('evidence_unavailable'); }
  if (admission.schemaVersion !== 'roost-g24c-guided-admission-v1' || admission.taskId !== taskId
    || !uuid.test(admission.attemptId ?? '') || !hex.test(admission.bundleDigest ?? '')
    || !hex.test(admission.inputSeal ?? '') || admission.backend !== 'codex_responses'
    || admission.model !== 'gpt-5.6-sol' || admission.effort !== 'low'
    || admission.maxDurationSeconds !== 600 || admission.maxTurns !== 1
    || !Array.isArray(admission.tools) || admission.tools.length !== 0 || admission.externalWrites !== false
    || outcome.schemaVersion !== 'roost-g24c-guided-outcome-v1'
    || outcome.attemptId !== admission.attemptId || outcome.taskId !== taskId
    || outcome.inputSeal !== admission.inputSeal || outcome.status !== 'candidate_result'
    || !hex.test(outcome.outputDigest ?? '') || !hex.test(outcome.processReceiptDigest ?? '')) fail('evidence_invalid');
  return Object.freeze({ admission, outcome });
}

export function recordGuidedOutcome(slot, outcome) {
  if (!slot || !existsSync(slot.path) || !slot.outcomePath || !slot.admission) fail('slot_invalid');
  let disk;
  try { disk = JSON.parse(readFileSync(slot.path, 'utf8')); } catch { fail('slot_unreadable'); }
  if (JSON.stringify(disk) !== JSON.stringify(slot.admission)) fail('slot_changed');
  if (!outcome || !['candidate_result', 'failed'].includes(outcome.status)
    || (outcome.status === 'candidate_result' && !hex.test(outcome.outputDigest ?? ''))
    || (outcome.status === 'failed' && (typeof outcome.reason !== 'string' || !/^[a-z0-9_]{3,80}$/.test(outcome.reason)))) fail('outcome_invalid');
  const body = { schemaVersion: 'roost-g24c-guided-outcome-v1', attemptId: slot.admission.attemptId,
    taskId: slot.admission.taskId, inputSeal: slot.admission.inputSeal,
    status: outcome.status, outputDigest: outcome.outputDigest ?? null,
    processReceiptDigest: outcome.processReceiptDigest ?? null,
    reason: outcome.reason ?? null, recordedAt: new Date().toISOString() };
  if (body.processReceiptDigest !== null && !hex.test(body.processReceiptDigest)) fail('outcome_invalid');
  durableNew(slot.outcomePath, body);
  return Object.freeze(body);
}
