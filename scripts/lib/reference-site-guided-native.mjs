import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import providerContract from './agent-host-provider-contract.cjs';
import { inspectHermesProfile, hermesNativeProfileVersion } from './agent-host-hermes-profile.mjs';
import { hermesStartupEnvironment } from './agent-host-hermes-startup.mjs';
import { qualifyHermesReadOnlyTools } from './agent-host-readonly-boundary.mjs';
import { verifyHermesSmokeInstallation, assertHermesSmokeInstallationFresh } from './agent-host-hermes-smoke-installation.mjs';
import { runHermesOwnedProcess } from './agent-host-hermes-quiet.mjs';
import { canonicalGuidedAttemptDirectory, reserveGuidedAttempt, recordGuidedOutcome } from './reference-site-guided-admission.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const fail = reason => { throw Object.assign(new Error(`guided_native_${reason}`), { reason }); };

// This is the separate, preparatory Finding session. It does not claim the
// signed Ready admission of the later supervised company-information Worker.
export async function runGuidedNative({ provider, repositoryRoot, workingDirectory,
  taskId, bundleDigest, input, inputSeal }) {
  if (process.platform !== 'win32') fail('windows_required');
  if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') < 1
    || Buffer.byteLength(input, 'utf8') > 131072 || sha(input) !== inputSeal) fail('input_invalid');
  const pinned = providerContract.registry.providers.find(item => item.kind === 'hermes_codex');
  if (provider?.kind !== 'hermes_codex' || provider.enabled !== true || provider.version !== pinned.version
    || provider.commit !== pinned.commit || provider.officialSource !== pinned.officialSource
    || !isDeepStrictEqual(provider.policy, providerContract.registry.hermesPolicy)
    || provider.profile?.schemaVersion !== hermesNativeProfileVersion || !provider.attestation?.manifestPath
    || basename(provider.executablePath).toLowerCase() !== 'hermes.exe') fail('provider_invalid');
  const root = realpathSync(repositoryRoot), scratch = realpathSync(workingDirectory);
  if (root === scratch || readdirSync(scratch).length || !lstatSync(scratch).isDirectory()) fail('scratch_invalid');
  for (let current = scratch; current !== dirname(current); current = dirname(current)) {
    if (['.git', 'AGENTS.md', '.agents'].some(name => {
      try { lstatSync(join(current, name)); return true; } catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
    })) fail('scratch_overlay');
  }
  const profile = inspectHermesProfile(provider.profile, scratch);
  if (profile.apiMaxRetries !== 0) fail('profile_retry_invalid');
  const environment = hermesStartupEnvironment(provider.profile, process.env, scratch);
  const installation = await verifyHermesSmokeInstallation({ manifestPath: provider.attestation.manifestPath,
    attestationPath: join(dirname(provider.attestation.manifestPath), 'roost-installation-attestation.json') });
  if (installation.manifestDigest !== provider.attestation.sha256) fail('installation_changed');
  assertHermesSmokeInstallationFresh(installation, provider.executablePath);
  const tools = qualifyHermesReadOnlyTools(provider, environment);
  if (tools.nativeTools.length !== 0) fail('tools_invalid');
  const argv = ['chat', '--cli', '--oneshot', '--quiet', '--query-file', '-', '--provider', 'openai-codex',
    '--model', 'gpt-5.6-sol', '--reasoning', 'low', '--toolsets', 'bot_room', '--max-turns', '1', '--run-budget', '595'];
  const slot = reserveGuidedAttempt({ directory: canonicalGuidedAttemptDirectory(), repositoryRoot: root,
    taskId, bundleDigest, inputSeal });
  const began = Date.now(), remainingMs = () => Math.max(0, 595000 - (Date.now() - began));
  const assertAuthority = () => {
    let current;
    try { current = JSON.parse(readFileSync(slot.path, 'utf8')); } catch { fail('admission_missing'); }
    if (!isDeepStrictEqual(current, slot.admission)) fail('admission_changed');
  };
  try {
    const result = await runHermesOwnedProcess({ executable: provider.executablePath, argv, cwd: scratch,
      environment, input, attempt: slot.admission.attemptId, remainingMs, assertAuthority,
      assertLaunchAuthority: () => { assertAuthority(); inspectHermesProfile(provider.profile, scratch);
        assertHermesSmokeInstallationFresh(installation, provider.executablePath); } });
    if (result.exitCode !== 0 || result.ownedTreeReceipt?.terminationReason !== 'root_exit'
      || typeof result.finalResponse !== 'string') fail('process_unconfirmed');
    const outcome = recordGuidedOutcome(slot, { status: 'candidate_result',
      outputDigest: sha(result.finalResponse), processReceiptDigest: sha(JSON.stringify(result.ownedTreeReceipt)) });
    return Object.freeze({ finalResponse: result.finalResponse, admission: slot.admission, outcome,
      toolQualificationDigest: tools.sourceDigest, installationDigest: installation.manifestDigest });
  } catch (error) {
    try { recordGuidedOutcome(slot, { status: 'failed', reason: /^[a-z0-9_]{3,80}$/.test(error?.reason ?? '')
      ? error.reason : 'native_attempt_failed' }); } catch { /* preserve the original failure and spent slot */ }
    throw error;
  }
}
