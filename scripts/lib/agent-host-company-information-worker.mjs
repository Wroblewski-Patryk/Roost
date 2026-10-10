import { mkdtemp, rmdir, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { nativeArtifactSnapshot } from './agent-host-native-review.mjs';
import { writerRecoveryEvidence, assertWriterLock } from './agent-host-writer-lock.mjs';
import { createExecutionLease } from './agent-host-execution-lease.mjs';
import { createExecutionDuration } from './agent-host-execution-duration.mjs';
import { fetchExecutionContext } from './agent-host-execution-context.mjs';
import { runCompanyInformationRuntime } from './agent-host-company-information-runtime.mjs';
import { isWindowsJobCleanupReceipt } from './agent-host-windows-job.mjs';

const id = z.string().uuid();
const anchorSchema = z.object({ schemaVersion: z.literal('roost-trusted-provider-pilot-v1'), installationId: id, workspaceId: id,
  authorityPublicKey: z.string().min(32).max(2048), decisionFile: z.literal('trusted-provider-pilot.json'), profileFile: z.literal('trusted-provider-profile.json'), qualification: z.literal('signed_native_v1') }).strict();

// The operator-installed public anchor is outside every checkout. A task,
// response or model cannot choose a trust key or its private configuration.
export function informationInstallationAnchor(writerLock, claimed) {
  const directory = assertWriterLock(writerLock).directory;
  const snapshot = nativeArtifactSnapshot(path.join(directory, 'trusted-provider-pilot', 'installation.json'));
  const anchor = anchorSchema.parse(snapshot.record);
  if (anchor.workspaceId !== claimed.workspaceId) throw Error('information_installation_workspace_mismatch');
  return { ...anchor, digest: snapshot.sha256 };
}

export async function executeInformationTask({ claimed, api, writerLock, provider, secrets = [], shutdownRequested = () => false }) {
  const abort = new AbortController();
  const contract = claimed.metadata?.executionContract;
  const duration = createExecutionDuration({ startedAt: claimed.startedAt, maxDurationSeconds: contract.budgets.maxDurationSeconds, onExpired: () => abort.abort() });
  let context, directory, owned, running;
  const lease = createExecutionLease({ renew: () => api(`/v1/agent-runtime/executions/${claimed.id}/heartbeat`, { method: 'POST', body: JSON.stringify({ leaseToken: claimed.leaseToken }) }), onLost: () => abort.abort() });
  const assertAuthority = () => { assertWriterLock(writerLock); duration.assertWithinBudget(); lease.assertValid(); if (shutdownRequested()) throw Error('information_controller_shutdown'); };
  try {
    await duration.wait(lease.refreshConfirmed());
    const anchor = informationInstallationAnchor(writerLock, claimed);
    context = await duration.wait(fetchExecutionContext(api, claimed, { signal: abort.signal, secrets }));
    directory = await mkdtemp(path.join(os.tmpdir(), 'roost-information-'));
    const inputContext = { ...claimed, installationId: anchor.installationId };
    const prepared = { schemaVersion: 'roost-information-worker-checkpoint-v1', executionId: claimed.id, taskId: claimed.taskId,
      readyRevision: claimed.metadata.readyContextPin.revision, packetRevision: context.taskContext.executionPacket.revision,
      stage: 'prepared', modelStarted: false, automaticRestart: false };
    const journal = path.join(writerRecoveryEvidence(writerLock).directory, `information-${claimed.id}.json`);
    await writeFile(journal, JSON.stringify(prepared) + '\n', { flag: 'wx', mode: 0o600 });
    await api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: 'POST', body: JSON.stringify({ leaseToken: claimed.leaseToken, type: 'information_prepared', message: 'Current selected company context prepared; one attempt, no native tools.', payload: prepared }) });
    running = runCompanyInformationRuntime({ claimed: inputContext, taskContext: context.taskContext, provider,
      authorityPublicKey: anchor.authorityPublicKey, workingDirectory: directory, signal: abort.signal, assertAuthority,
      remainingMs: () => duration.remainingMs, secrets,
      requestAdmission: async observation => {
        assertAuthority();
        const fresh = await fetchExecutionContext(api, claimed, { signal: abort.signal, secrets });
        if (fresh.taskContext.executionPacket.revision !== context.taskContext.executionPacket.revision) throw Error('information_context_changed');
        return api(`/v1/agent-runtime/executions/${claimed.id}/actions/managed-admission`, { method: 'POST', body: JSON.stringify({ schemaVersion: 'roost-managed-admission-v1', phase: 'information', executionId: claimed.id, leaseToken: claimed.leaseToken, observation }) });
      } });
    void running.catch(() => {});
    const result = await duration.wait(running);
    owned = result.ownedTreeReceipt;
    assertAuthority();
    const verification = { informationRuntime: result.verification, ownedTreeReceipt: owned, reviewRequired: true,
      outputTokenEnforcement: 'unavailable', costEnforcement: 'unavailable' };
    await writeFile(journal, JSON.stringify({ ...prepared, stage: 'native_closed', modelStarted: true, verification,
      resultDigest: createHash('sha256').update(result.finalResponse).digest('hex') }) + '\n', { mode: 0o600 });
    await api(`/v1/agent-runtime/executions/${claimed.id}/actions/complete`, { method: 'POST', body: JSON.stringify({ leaseToken: claimed.leaseToken,
      summary: 'Informational result from the selected company records; owner review required.', finalResponse: result.finalResponse, changedFiles: [], verification,
      usage: { inputTokens: null, outputTokens: null, cost: null, physicalModelCalls: null } }) });
    return { verification };
  } catch (error) {
    abort.abort(); owned ??= error.details?.ownedTreeReceipt;
    if (running) {
      await running.then(result => { owned ??= result.ownedTreeReceipt; }, stopped => { owned ??= stopped.details?.ownedTreeReceipt; });
      if (!isWindowsJobCleanupReceipt(owned)) error.leaseLost = true;
    }
    // A late/uncertain completion is never replayed or converted into success.
    // Preserve the real native closure locally; the existing lease/recovery
    // mechanism remains responsible when reporting itself is unavailable.
    const code = error.durationLimit ? 'agent_execution_duration_exceeded' : error.leaseLost ? 'information_lease_lost'
      : error.details?.reason ?? 'information_attempt_stopped';
    await api(`/v1/agent-runtime/executions/${claimed.id}/actions/fail`, { method: 'POST', body: JSON.stringify({ leaseToken: claimed.leaseToken,
      code, message: 'Information attempt stopped. No automatic retry; owner diagnosis, changed plan and new budget are required.', retryable: false,
      details: { nativeCleanupProven: isWindowsJobCleanupReceipt(owned), ...(owned ? { ownedTreeReceipt: owned } : {}) } }) }).catch(() => {});
    throw error;
  } finally {
    abort.abort(); lease.stop(); duration.stop();
    if (directory && (await readdir(directory)).length === 0) await rmdir(directory);
  }
}
