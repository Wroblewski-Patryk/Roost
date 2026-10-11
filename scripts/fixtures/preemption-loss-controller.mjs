import { randomUUID } from "node:crypto";
import path from "node:path";
import { acquireWriterLock } from "../lib/agent-host-writer-lock.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "../lib/agent-host-windows-job.mjs";
import { confirmPreemptionStopped } from "../lib/agent-host-preemption.mjs";

const [root, fixture, baseUrl, id] = process.argv.slice(2);
if (process.platform !== "win32" || !root || !fixture || !baseUrl || !id) throw new Error("fixture_invalid");
const lock = await acquireWriterLock(path.join(root, "state"));
const execution = { id, leaseToken: randomUUID(), workspaceId: randomUUID(), applicationId: randomUUID(),
  taskId: randomUUID(), attempt: 1, checkpointVersion: 1,
  checkpoint: { schemaVersion: "roost-recovery-v1", stage: "running", sessionId: lock.sessionId,
    packetRevision: "a".repeat(64), workspaceDigest: "b".repeat(64), contextRevision: "c".repeat(64) } };
await lock.checkpoint(execution);
const artifact = await buildWindowsJobLauncher(root);
let output = "";
const handle = await startWindowsJob(artifact, { executable: fixture, argv: ["tree"], cwd: root,
  environment: { SystemRoot: process.env.SystemRoot }, input: "", attempt: id, durationMs: 10000,
  onData: (channel, bytes) => { if (channel === "stdout") output += bytes.toString("utf8"); } });
for (let n = 0; n < 100 && (output.match(/PID:/g) || []).length < 3; n += 1)
  await new Promise(resolve => setTimeout(resolve, 20));
if ((output.match(/PID:/g) || []).length < 3) throw new Error("fixture_tree_missing");
handle.stop("lease_lost");
const ownedTreeReceipt = await handle.completion;
const api = async (route, options) => {
  const response = await fetch(baseUrl + route, { method: options.method, body: options.body,
    headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(1000) });
  if (!response.ok) throw Object.assign(new Error("fixture_http_failure"), { status: response.status });
  return (await response.json()).data;
};
try {
  await confirmPreemptionStopped({ execution, writerLock: lock, ownedTreeReceipt, api });
  throw new Error("fixture_ack_unexpected");
} catch (error) {
  if (!(error instanceof TypeError) && error.name !== "TimeoutError") throw error;
  // Deliberately exit with the Writer and sidecar retained, like a restart
  // after a response was lost. The parent test exercises replayOnly recovery.
  process.stdout.write("lost-response-retained\n");
}
