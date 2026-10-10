import { validPacketFixture, sealPacket } from './execution-packet.mjs';
import ready from '../lib/agent-host-ready-context.cjs';

export function companyInformationFixture() {
  const f = validPacketFixture(), c = f.packet.contract;
  c.executionClass = 'roost-company-information-v1';
  c.singleTask.applicationId = null; c.singleTask.component = null; c.singleTask.branch = null;
  c.singleTask.problems[0].componentId = null;
  c.context.product = []; c.context.technical = [];
  c.access = { ...c.access, tools: [], permissions: [], sandbox: 'read-only' };
  c.recovery.rollback = { mode: 'not_applicable', instructions: 'No persistent company or repository effects are permitted' };
  f.packet.identity.applicationId = null; f.packet.scopeAuthorities.component = null;
  f.packet.sources = f.packet.sources.slice(0, 1);
  f.packet.procedureComposition = { algorithm: 'roost-company-information-preparation-v1', preparationOnly: true, modelExecutionQualified: false };
  f.claimed.applicationId = null; f.claimed.application = null; f.claimed.baseBranch = null; f.claimed.status = 'queued'; f.claimed.attempt = 0;
  f.claimed.agentHostId = null; f.claimed.leaseToken = null; f.claimed.leaseExpiresAt = null; f.claimed.startedAt = null;
  f.taskContext.task.projectId = null;
  f.applicationContext = {};
  sealPacket(f.packet);
  const revision = ready.readyContextRevision(f.taskContext, {}, f.claimed);
  const pin = { pinId: '00000000-0000-4000-8000-000000000090', revision, preparationOnly: true, modelExecutionQualified: false };
  f.claimed.metadata = { executionContract: c, readyContextPin: pin };
  f.taskContext.readyAdmission = { status: 'ready', ...pin, validationRevision: revision };
  return f;
}
