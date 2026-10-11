import { createHash } from "node:crypto";
import { lstat, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { isWindowsJobCleanupReceipt } from "./agent-host-windows-job.mjs";
import { protectCurrentUserData, unprotectCurrentUserData } from "./agent-host-terminal-completion.mjs";
import { localCheckpoint, preemptionIntentFilename, reconcilePreemptionWriter,
  writerLockFilename, writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";

const stopReasons = ["lease_lost", "cancel", "root_exit"];
const hex = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const digest = value => createHash("sha256").update(value).digest("hex");
const route = id => `/v1/agent-runtime/executions/${id}/actions/preemption-stopped`;
const fail = () => new Error("agent_preemption_recovery_unproven");

function assertStopReceipt(execution, receipt) {
  if (!isWindowsJobCleanupReceipt(receipt) || receipt.attempt !== execution?.id
      || receipt.jobClosed !== true || receipt.activeProcesses !== 0 || receipt.cleanup !== true
      || !stopReasons.includes(receipt.terminationReason)
      || !Number.isInteger(execution?.checkpointVersion) || execution.checkpointVersion < 1)
    throw new Error("agent_preemption_stop_unproven");
}

function assertAck(ack, expectedVersion, expectedCheckpoint) {
  if (ack?.stopped !== true || ack.checkpointVersion !== expectedVersion + 1
      || ack.checkpoint?.schemaVersion !== "roost-recovery-v1"
      || !isDeepStrictEqual(ack.checkpoint, expectedCheckpoint))
    throw new Error("agent_preemption_ack_invalid");
}

const protectionEntropy = intent => createHash("sha256").update(`roost-preemption-intent-v1:${intent.execution?.id}:${intent.writerLockDigest}`).digest();

async function parseIntent(bytes) {
  let intent, request;
  try {
    intent = JSON.parse(bytes);
    if (typeof intent.protectedRequest !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(intent.protectedRequest)
        || intent.protectedRequest.length > 8192) throw fail();
    const plain = await unprotectCurrentUserData(Buffer.from(intent.protectedRequest, "base64"), protectionEntropy(intent));
    try { request = JSON.parse(plain.toString("utf8")); }
    finally { plain.fill(0); }
  }
  catch { throw fail(); }
  const requestBody = JSON.stringify(request);
  if (requestBody.length > 2048 || Object.hasOwn(intent, "requestBody") || Object.hasOwn(intent.execution ?? {}, "leaseToken")) throw fail();
  if (intent?.schemaVersion !== "roost-preemption-intent-v1" || !/^[a-f0-9-]{36}$/.test(intent.execution?.id ?? "")
      || !hex(intent.writerLockDigest) || !/^\d+:\d+$/.test(intent.writerIdentity ?? "")
      || !hex(intent.requestDigest) || digest(requestBody) !== intent.requestDigest
      || Object.keys(request ?? {}).sort().join() !== "expectedVersion,leaseToken,stop,writerLockDigest"
      || !/^[a-f0-9-]{36}$/.test(request?.leaseToken ?? "")
      || request?.expectedVersion !== intent.execution?.checkpointVersion
      || request?.writerLockDigest !== intent.writerLockDigest
      || request?.stop?.schemaVersion !== "roost-preemption-stop-v1" || request.stop.kind !== "windows_job"
      || Object.keys(request.stop).sort().join() !== "activeProcesses,attempt,cleanup,jobClosed,kind,schemaVersion,terminationReason"
      || request.stop.attempt !== intent.execution.id || request.stop.jobClosed !== true
      || request.stop.activeProcesses !== 0 || request.stop.cleanup !== true
      || !stopReasons.includes(request.stop.terminationReason)
      || intent.nativeReceipt?.attempt !== intent.execution.id || intent.nativeReceipt.jobClosed !== true
      || intent.nativeReceipt.activeProcesses !== 0 || intent.nativeReceipt.cleanup !== true
      || intent.nativeReceipt.terminationReason !== request.stop.terminationReason
      || JSON.stringify(intent.originalCheckpoint) !== JSON.stringify(localCheckpoint(intent.execution))
      || intent.writerRecord?.ownerNonce !== intent.originalCheckpoint?.sessionId)
    throw fail();
  return { intent, request };
}

async function readIntent(directory) {
  const filename = path.join(directory, preemptionIntentFilename);
  const stat = await lstat(filename, { bigint: true }).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!stat) return null;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size < 1n || stat.size > 16384n) throw fail();
  const bytes = await readFile(filename);
  if (bytes.length !== Number(stat.size)) throw fail();
  return { filename, bytes, ...(await parseIntent(bytes)) };
}

async function persistIntent(execution, writerLock, receipt, requestBody) {
  const evidence = writerRecoveryEvidence(writerLock);
  const writerBytes = await readFile(path.join(evidence.directory, writerLockFilename));
  if (digest(writerBytes) !== evidence.digest) throw fail();
  let writer; try { writer = JSON.parse(writerBytes); } catch { throw fail(); }
  const originalCheckpoint = localCheckpoint(execution);
  if (JSON.stringify(writer.checkpoint) !== JSON.stringify(originalCheckpoint)
      || writer.ownerNonce !== evidence.record.ownerNonce) throw fail();
  const persistedExecution = { id: execution.id,
    workspaceId: execution.workspaceId, applicationId: execution.applicationId, taskId: execution.taskId,
    attempt: execution.attempt, checkpointVersion: execution.checkpointVersion, checkpoint: execution.checkpoint };
  const intent = { schemaVersion: "roost-preemption-intent-v1", execution: persistedExecution,
    writerIdentity: evidence.identity, writerLockDigest: evidence.digest, writerRecord: evidence.record,
    originalCheckpoint, nativeReceipt: receipt, requestDigest: digest(requestBody) };
  const plain = Buffer.from(requestBody, "utf8");
  try { intent.protectedRequest = (await protectCurrentUserData(plain, protectionEntropy(intent))).toString("base64"); }
  finally { plain.fill(0); }
  const bytes = Buffer.from(JSON.stringify(intent) + "\n");
  if (bytes.length > 16384) throw fail();
  const filename = path.join(evidence.directory, preemptionIntentFilename);
  const handle = await open(filename, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
  if (!(await readFile(filename)).equals(bytes)) throw fail();
  return intent;
}

const transient = error => error?.status === 408 || error?.status === 429 || error?.status >= 500
  || error instanceof TypeError || ["AbortError", "TimeoutError"].includes(error?.name);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function confirmPreemptionStopped({ execution, writerLock, ownedTreeReceipt, api }) {
  assertStopReceipt(execution, ownedTreeReceipt);
  const evidence = writerRecoveryEvidence(writerLock);
  const request = { leaseToken: execution.leaseToken, expectedVersion: execution.checkpointVersion,
    writerLockDigest: evidence.digest,
    stop: { schemaVersion: "roost-preemption-stop-v1", kind: "windows_job", attempt: execution.id,
      jobClosed: true, activeProcesses: 0, cleanup: true, terminationReason: ownedTreeReceipt.terminationReason } };
  const requestBody = JSON.stringify(request);
  await persistIntent(execution, writerLock, ownedTreeReceipt, requestBody);
  let ack;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assertStopReceipt(execution, ownedTreeReceipt);
    try {
      ack = await api(route(execution.id), { method: "POST", body: requestBody });
      break;
    } catch (error) {
      if (!transient(error) || attempt === 2) throw error;
      await delay(200 * (attempt + 1));
    }
  }
  assertAck(ack, request.expectedVersion, execution.checkpoint);
  await writerLock.checkpoint({ ...execution, checkpoint: ack.checkpoint, checkpointVersion: ack.checkpointVersion });
  return ack;
}

// On restart the WeakMap native proof is gone. replayOnly cannot create a
// server stop; it can only read back the exact ACK already committed earlier.
export async function recoverPreemptionStopped(directory, api) {
  const saved = await readIntent(directory);
  if (!saved) return false;
  const { intent, request, bytes } = saved;
  const ack = await api(route(intent.execution.id), { method: "POST",
    body: JSON.stringify({ ...request, replayOnly: true }) });
  assertAck(ack, request.expectedVersion, intent.execution.checkpoint);
  await reconcilePreemptionWriter(directory, bytes, intent, ack);
  return true;
}

export async function retireConfirmedPreemptionIntent(directory) {
  const saved = await readIntent(directory);
  if (!saved) throw fail();
  const lock = await lstat(path.join(directory, writerLockFilename), { bigint: true }).catch(error => {
    if (error.code === "ENOENT") return null; throw error;
  });
  if (lock && `${lock.dev}:${lock.ino}` === saved.intent.writerIdentity) throw fail();
  if (!(await readFile(saved.filename)).equals(saved.bytes)) throw fail();
  await unlink(saved.filename);
}
