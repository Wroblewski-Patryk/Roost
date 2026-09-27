import { createHash, createPrivateKey, createPublicKey, randomUUID, sign, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuthContext } from '../../auth/api-key.middleware';
import { workerClaimAllowed } from '../../auth/worker-ticket-principal';
import { inspectReady } from './task-execution-readiness';
import { firstWriteApproval, managedRuntimeApproval } from '../decisions/decision-governance-contract';

const load = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
const pilot = load(require('node:url').pathToFileURL(require('node:path').resolve(__dirname, '../../../scripts/lib/agent-host-trusted-pilot.mjs')).href);
const backend = load(require('node:url').pathToFileURL(require('node:path').resolve(__dirname, '../../../scripts/lib/agent-host-managed-backend.mjs')).href);
const digest = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
const sourceSchema = z.object({ selection: z.unknown(), context: z.unknown(), runtime: z.unknown(), installationIdentity: digest,
  profile: z.object({ identity: digest, digest }).strict(), availability: z.object({ backend: z.literal('installed'),
    model: z.literal('selected_unverified'), resources: z.literal('bounded_by_worker') }).strict(),
  ownerAttestation: z.unknown() }).strict();
const firstSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('backend_evidence'),
  leaseToken: id, executionId: id, source: sourceSchema }).strict();
const secondSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('decision'),
  leaseToken: id, executionId: id, provider: z.unknown(), scope: z.unknown(),
  installation: z.object({ id, identity: digest, configurationIdentity: digest }).strict(), evidenceDigest: digest }).strict();
const firstWriteSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('first_write'),
  leaseToken: id, executionId: id }).strict();
export const managedAdmissionInput = z.union([firstSchema, secondSchema, firstWriteSchema]);
const pending = new Map<string, { leaseDigest: string; hostId: string; workspaceId: string; installationId: string; taskId: string;
  applicationId: string; selection: unknown; context: any; runtime: unknown; profile: unknown; installationIdentity: string;
  ownerAttestation: unknown; evidenceFileDigest:string; expiry: number; decisionId: string; decisionRevision: number; decisionAt: string }>();
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
function fail(): never { throw new Error('managed_admission_denied'); }
const hex64 = /^[a-f0-9]{64}$/;
const hex40 = /^[a-f0-9]{40}$/;

// A first coding launch is admitted only after two independent native canaries
// and a separate owner acceptance. These are database facts, never claims in a
// task prompt or a Worker-supplied packet.
export async function firstWriteGate(db: Prisma.TransactionClient, workspaceId: string, installationId: string,
  execution: any, pin: any, ownerUserId: string) {
  if (pin.contract?.nativeBoundary?.profile !== 'coding-local') return null;
  const rows = await db.$queryRaw<Array<{id:string;at:Date;body:any}>>`
    SELECT d.id,a.created_at AS at,r.body FROM decisions d
    JOIN decision_revisions r ON r.decision_id=d.id
    JOIN decision_acceptances a ON a.decision_id=d.id
    WHERE d.workspace_id=${workspaceId}::uuid AND d.status='accepted'
      AND decision_state(d.id)='accepted' AND a.actor_user_id=${ownerUserId}::uuid
      AND a.actor_agent_id IS NULL
      AND r.body->'firstWriteApproval'->>'taskId'=${execution.taskId}
      AND r.body->'firstWriteApproval'->>'applicationId'=${execution.applicationId}
      AND r.body->'firstWriteApproval'->>'installationId'=${installationId}
      AND NOT EXISTS (SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
    LIMIT 2`;
  if (rows.length !== 1) fail();
  const approval = firstWriteApproval.parse(rows[0].body.firstWriteApproval);
  if (approval.branch !== pin.contract.singleTask?.branch
    || !approval.branch.endsWith(execution.taskId)
    || approval.taskId !== execution.taskId || approval.applicationId !== execution.applicationId
    || approval.installationId !== installationId) fail();
  const canaries = await db.agentExecution.findMany({ where: {
    workspaceId, id: { in: [approval.auditorExecutionId, approval.verifierExecutionId] },
    applicationId: execution.applicationId, status: 'completed', contextInvalidatedAt: null
  }, select: { id:true, agentHostId:true, taskId:true, status:true, completedAt:true,
    verification:true, changedFiles:true, metadata:true } });
  if (canaries.length !== 2 || canaries.some((c:any)=>c.agentHostId!==execution.agentHostId
    || !c.completedAt || c.taskId===execution.taskId || !Array.isArray(c.changedFiles) || c.changedFiles.length)) fail();
  const auditor = canaries.find((c:any)=>c.id===approval.auditorExecutionId);
  const verifier = canaries.find((c:any)=>c.id===approval.verifierExecutionId);
  if (!auditor || !verifier || auditor.taskId===verifier.taskId
    || !auditor.completedAt || !verifier.completedAt
    || auditor.completedAt >= verifier.completedAt || verifier.completedAt >= rows[0].at) fail();
  const obj=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
  const auditContract = (c:any)=>obj(c.metadata).executionContract;
  const receipt = (c:any)=>obj(c.verification).readOnlyAudit;
  const clean = (c:any,kind:string,digest:string)=>{
    const r=receipt(c), rev=obj(c.metadata).resultRevision;
    return auditContract(c)?.nativeBoundary?.profile==='inspect-readonly'
      && auditContract(c)?.nativeBoundary?.inspectReadOnly?.kind===kind
      && auditContract(c)?.access?.tools?.length===1
      && auditContract(c)?.access?.tools?.[0]==='repository_read'
      && auditContract(c)?.access?.permissions?.length===1
      && auditContract(c)?.access?.permissions?.[0]==='repository_read'
      && r?.schemaVersion==='roost-readonly-audit-v1' && r.verdict==='verified'
      && r.evidenceDigest===digest && hex64.test(digest)
      && hex64.test(r.preTree??'') && r.preTree===r.postTree
      && r.processState==='unchanged' && r.dockerState==='unchanged'
      && r.gitState==='unchanged' && Array.isArray(r.nativeTools) && r.nativeTools.length===0
      && rev?.workingTree==='clean' && rev.commit===approval.baselineCommit
      && hex40.test(rev.commit??'');
  };
  if (!clean(auditor,'auditor',approval.auditorEvidenceDigest)
    || !clean(verifier,'verifier',approval.verifierEvidenceDigest)
    || auditContract(auditor)?.assignment?.agentId
      ===auditContract(verifier)?.assignment?.agentId
    || receipt(verifier)?.verifiedExecutionId!==auditor.id
    || receipt(verifier)?.verifiedEvidenceDigest!==approval.auditorEvidenceDigest) fail();
  return { decisionId: rows[0].id, baselineCommit: approval.baselineCommit, branch: approval.branch,
    operations: approval.operations };
}

export type ManagedAdmissionSigner = { publicKey: string; sign(bytes: Buffer): Buffer };
export function managedAdmissionSignerFromEnvironment(): ManagedAdmissionSigner | null {
  const encoded = process.env.ROOST_MANAGED_ADMISSION_PRIVATE_KEY_B64;
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  try {
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.toString('base64')!==encoded)return null;
    const privateKey: KeyObject = createPrivateKey({ key: bytes, format: 'der', type: 'pkcs8' });
    if (privateKey.asymmetricKeyType !== 'ed25519') return null;
    const publicKey = createPublicKey(privateKey).export({ format: 'pem', type: 'spki' }).toString();
    return { publicKey, sign: bytes => sign(null, bytes, privateKey) };
  } catch { return null; }
}
async function signed(value: unknown, signer: ManagedAdmissionSigner) {
  const bytes = (await pilot).trustedPilotBytes(value);
  const signature = signer.sign(bytes);
  if (signature.length !== 64 || !require('node:crypto').verify(null, bytes, createPublicKey(signer.publicKey), signature)) fail();
  return { payload: value, signature: signature.toString('hex') };
}

export async function managedAdmission(client: PrismaClient, auth: AuthContext, executionId: string, raw: unknown,
  signer: ManagedAdmissionSigner, now = new Date()) {
  const input = managedAdmissionInput.parse(raw);
  const identity = auth.workerTicketIdentity;
  if (input.executionId !== executionId || auth.authType !== 'api_key' || !identity || !auth.apiKeyId) fail();
  const state = await client.$transaction(async db => {
    const execution = await db.agentExecution.findFirst({ where: { id: executionId, workspaceId: identity.workspaceId,
      agentHostId: identity.hostId, leaseToken: input.leaseToken, status: { in: ['claimed', 'running'] },
      leaseExpiresAt: { gt: now }, cancelRequestedAt: null, contextInvalidatedAt: null } });
    if (!execution) fail();
    if (execution.attempt !== 1 || !await workerClaimAllowed(db, auth, identity.hostId, now)) fail();
    const key = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId: identity.workspaceId } });
    const publicDigest = createHash('sha256').update(createPublicKey(signer.publicKey).export({ format: 'der', type: 'spki' })).digest('hex');
    if (!key || key.installationId !== identity.installationId || key.publicKeyDigest !== publicDigest) fail();
    const ready = await inspectReady(db, identity.workspaceId, execution.taskId, execution, true);
    if (ready.error || !ready.pin) fail();
    const pin = ready.pin as any, selection = pin.contract?.modelSelection;
    if (selection?.schemaVersion !== 'roost-managed-hermes-backend-v1' || selection.backend !== 'codex_responses'
      || selection.riskClass !== 'low' || selection.fallback !== 'none' || pin.requestedByType !== 'user') fail();
    const workspace = await db.workspace.findUnique({ where: { id: identity.workspaceId }, select: { ownerUserId: true } });
    if (!workspace) fail();
    if (pin.requestedById !== workspace.ownerUserId || !await db.workspaceMembership.findFirst({ where: {
      workspaceId: identity.workspaceId, userId: workspace.ownerUserId, role: 'owner' } })) fail();
    const selectionDigest = sha((await pilot).trustedPilotBytes(selection));
    const decisions = await db.$queryRaw<Array<{id:string;version:number;at:Date;body:any}>>`
      SELECT d.id,r.version,a.created_at AS at,r.body FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
      JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.workspace_id=${identity.workspaceId}::uuid
      AND d.status='accepted' AND decision_state(d.id)='accepted' AND a.actor_user_id=${workspace.ownerUserId}::uuid
      AND a.actor_agent_id IS NULL AND r.body->'scope' @> ${JSON.stringify([{type:'task',id:execution.taskId}])}::jsonb
      AND r.body->'managedRuntimeApproval'->>'taskId'=${execution.taskId}
      AND r.body->'managedRuntimeApproval'->>'applicationId'=${execution.applicationId}
      AND r.body->'managedRuntimeApproval'->>'installationId'=${identity.installationId}
      AND r.body->'managedRuntimeApproval'->>'selectionDigest'=${selectionDigest}
      AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
      ORDER BY a.created_at DESC LIMIT 2`;
    if (decisions.length !== 1) fail();
    const approval=managedRuntimeApproval.parse(decisions[0].body?.managedRuntimeApproval);
    if (approval.backend!==selection.backend||approval.riskClass!==selection.riskClass
      ||approval.selectionDigest!==selectionDigest) fail();
    const firstWrite = await firstWriteGate(db, identity.workspaceId, identity.installationId,
      execution, pin, workspace.ownerUserId);
    return { execution, selection, decision: decisions[0], pin, firstWrite };
  }, { isolationLevel: 'RepeatableRead', maxWait: 3000, timeout: 15000 });
  const { execution, selection, decision } = state;
  const expiresAt = new Date(Math.min(now.getTime() + 60000, execution.leaseExpiresAt!.getTime()));
  if (expiresAt.getTime() <= now.getTime() + 1000) fail();
  const b = await backend, p = await pilot;
  if (input.phase === 'first_write') {
    if (!state.firstWrite) fail();
    const payload = { schemaVersion: 'roost-first-write-admission-v1', executionId,
      workspaceId: identity.workspaceId, taskId: execution.taskId, applicationId: execution.applicationId,
      installationId: identity.installationId, issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(),
      ...state.firstWrite };
    return { schemaVersion: 'roost-managed-admission-v1', phase: input.phase,
      signed: await signed(payload, signer) };
  }
  if (input.phase === 'backend_evidence') {
    const source = input.source;
    if (!p.trustedPilotBytes(source.selection).equals(p.trustedPilotBytes(selection))) fail();
    for(const [key,value] of pending)if(value.expiry<=now.getTime())pending.delete(key);
    if(pending.has(executionId)||pending.size>=32)fail();
    const payload = b.nativeEvidenceSchema.parse({ signatureDomain: 'roost-managed-backend-evidence-v1', schemaVersion: 'roost-managed-hermes-backend-v1',
      id: randomUUID(), state: 'accepted', issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), purpose: 'managed-agent',
      qualification: 'signed_native_v1', ...source });
    const signedEvidence=await signed(payload,signer);
    const evidenceFileDigest=sha(JSON.stringify(signedEvidence,null,2)+'\n');
    const leaseDigest = sha(input.leaseToken);
    pending.set(executionId, { leaseDigest, hostId: identity.hostId, workspaceId: identity.workspaceId,
      installationId: identity.installationId, taskId: execution.taskId, applicationId: execution.applicationId,
      selection, context: payload.context, runtime: payload.runtime, profile: payload.profile,
      installationIdentity: payload.installationIdentity, ownerAttestation: payload.ownerAttestation,evidenceFileDigest,
      expiry: expiresAt.getTime(), decisionId: decision.id, decisionRevision: decision.version, decisionAt: decision.at.toISOString() });
    return { schemaVersion: 'roost-managed-admission-v1', phase: input.phase, signed:signedEvidence };
  }
  const prior = pending.get(executionId);
  pending.delete(executionId);
  if (!prior) fail();
  if (prior.expiry <= now.getTime() || prior.leaseDigest !== sha(input.leaseToken)
    || prior.hostId !== identity.hostId || prior.workspaceId !== identity.workspaceId || prior.installationId !== identity.installationId
    || prior.decisionId !== decision.id || prior.decisionRevision !== decision.version) fail();
  const provider = p.trustedPilotDecisionSchema.shape.provider.parse(input.provider), scope = p.trustedPilotDecisionSchema.shape.scope.parse(input.scope);
  if (provider.kind !== 'hermes_codex' || !provider.managedBackend || provider.managedBackend.realIssuerQualified !== true
    || provider.managedBackend.privateAnchorQualified !== true || provider.managedBackend.evidence.digest !== input.evidenceDigest
    || input.evidenceDigest!==prior.evidenceFileDigest
    || provider.runtimeDigest !== (prior.runtime as any).runtimeDigest
    || !p.trustedPilotBytes(provider.profile).equals(p.trustedPilotBytes(prior.profile))
    || !p.trustedPilotBytes(provider.modelSelection).equals(p.trustedPilotBytes(selection))
    || !p.trustedPilotBytes(provider.managedBackend.context).equals(p.trustedPilotBytes(prior.context))
    || !p.trustedPilotBytes(provider.managedBackend.runtime).equals(p.trustedPilotBytes(prior.runtime))
    || provider.managedBackend.auth?.attestationDigest !== (prior.ownerAttestation as any)?.digest) fail();
  if (scope.workspaceId !== prior.workspaceId || scope.applicationId !== prior.applicationId || scope.taskId !== prior.taskId
    || scope.executionId !== executionId || scope.inputSeal !== prior.context.inputSeal || scope.writerDigest !== prior.context.writerDigest
    || input.installation.id !== prior.installationId || input.installation.identity !== prior.installationIdentity) fail();
  const payload = p.trustedPilotDecisionSchema.parse({ schemaVersion: p.trustedPilotVersion, decisionId: decision.id,
    revision: decision.version, state: 'accepted', decidedAt: now.toISOString(), expiresAt: expiresAt.toISOString(),
    installationId: prior.installationId, configurationIdentity: input.installation.configurationIdentity,
    installationIdentity: prior.installationIdentity, provider, scope, mode: 'trusted_provider_pilot', systemIsolation: false,
    arbitraryProviderAdmission: false, fullAutonomy: false, residualRiskAccepted: true,
    acknowledgement: p.trustedPilotAcknowledgement, qualification: 'signed_native_v1' });
  return { schemaVersion: 'roost-managed-admission-v1', phase: input.phase,
    ...(state.firstWrite ? { firstWrite: state.firstWrite } : {}), signed: await signed(payload, signer) };
}
