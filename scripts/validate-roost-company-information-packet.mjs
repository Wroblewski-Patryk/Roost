import { validateExecutionPacket, companyInformationClass } from './lib/agent-host-execution-packet.mjs';
import readyContext from './lib/agent-host-ready-context.cjs';

// Native, repo-free preparation check. Reads one bounded transport envelope
// from stdin. Never reads installation credentials/config or starts tools/models.
let chunks = [], bytes = 0;
for await (const chunk of process.stdin) {
  bytes += chunk.length;
  if (bytes > 131072) { process.stderr.write('company_preparation_input_too_large\n'); process.exit(1); }
  chunks.push(chunk);
}
try {
  const { claimed, taskContext } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (claimed?.status !== 'queued' || taskContext?.executionPacket?.contract?.executionClass !== companyInformationClass) throw new Error();
  validateExecutionPacket(taskContext.executionPacket, claimed, taskContext, {});
  readyContext.assertReadyContext(taskContext, {}, claimed);
  process.stdout.write(JSON.stringify({ schemaVersion: 'roost-company-preparation-validation-v1',
    executionId: claimed.id, workspaceId: claimed.workspaceId, taskId: claimed.taskId,
    packetRevision: taskContext.executionPacket.revision, selectedSourceCount: taskContext.executionPacket.sources.length,
    preparationOnly: true, modelExecutionQualified: false, tools: [], permissions: [] }) + '\n');
} catch {
  process.stderr.write('company_preparation_invalid\n'); process.exitCode = 1;
}
