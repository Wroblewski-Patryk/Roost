import { createHash, createPrivateKey, createPublicKey, randomUUID, sign, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuthContext } from '../../auth/api-key.middleware';
import { workerClaimAllowed } from '../../auth/worker-ticket-principal';
import { inspectReady } from './task-execution-readiness';
import { firstWriteApproval, managedRuntimeApproval } from '../decisions/decision-governance-contract';
import { releaseCandidateNativeError, releaseDigest } from './governed-release-contract';

const load = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
const pilot = load(require('node:url').pathToFileURL(require('node:path').resolve(__dirname, '../../../scripts/lib/agent-host-trusted-pilot.mjs')).href);
const backend = load(require('node:url').pathToFileURL(require('node:path').resolve(__dirname, '../../../scripts/lib/agent-host-managed-backend.mjs')).href);
const digest = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
export const existingCommitVerificationSchema=z.object({releaseId:id,closureId:id,consentDigest:digest,
  previousExecutionId:id,previousCommit:z.string().regex(/^[a-f0-9]{40}$/)}).strict();
const sourceSchema = z.object({ selection: z.unknown(), context: z.unknown(), runtime: z.unknown(), installationIdentity: digest,
  profile: z.object({ identity: digest, digest }).strict(), availability: z.object({ backend: z.literal('installed'),
    model: z.literal('selected_unverified'), resources: z.literal('bounded_by_worker') }).strict(),
  ownerAttestation: z.unknown() }).strict();
const firstSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('backend_evidence'),
  leaseToken: id, executionId: id, source: sourceSchema, existingCommitVerification:existingCommitVerificationSchema.optional() }).strict();
const secondSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('decision'),
  leaseToken: id, executionId: id, provider: z.unknown(), scope: z.unknown(),
  installation: z.object({ id, identity: digest, configurationIdentity: digest }).strict(), evidenceDigest: digest,
  existingCommitVerification:existingCommitVerificationSchema.optional() }).strict();
const firstWriteSchema = z.object({ schemaVersion: z.literal('roost-managed-admission-v1'), phase: z.literal('first_write'),
  leaseToken: id, executionId: id, existingCommitVerification:existingCommitVerificationSchema.optional() }).strict();
export const managedAdmissionInput = z.union([firstSchema, secondSchema, firstWriteSchema]);
const pending = new Map<string, { leaseDigest: string; hostId: string; workspaceId: string; installationId: string; taskId: string;
  applicationId: string; selection: unknown; context: any; runtime: unknown; profile: unknown; installationIdentity: string;
  ownerAttestation: unknown; evidenceFileDigest:string; expiry: number; decisionId: string; decisionRevision: number; decisionAt: string;
  existingVerificationDigest?:string }>();
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
function fail(): never { throw new Error('managed_admission_denied'); }
const hex64 = /^[a-f0-9]{64}$/;
const hex40 = /^[a-f0-9]{40}$/;

// A first coding launch is admitted only after two independent native canaries
// and a separate owner acceptance. These are database facts, never claims in a
// task prompt or a Worker-supplied packet.
export async function firstWriteGate(db: Prisma.TransactionClient, workspaceId: string, installationId: string,
  execution: any, pin: any, ownerUserId: string, requestedVerification?:unknown) {
  if (pin.contract?.nativeBoundary?.profile !== 'coding-local') {
    if(requestedVerification!==undefined||pin.contract?.nativeBoundary?.existingCommitVerification!==undefined)fail();
    return null;
  }
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
  const currentCommit = pin.riskAdmissionCommit;
  if (!hex40.test(currentCommit ?? '')) fail();
  const contractPointer=pin.contract.nativeBoundary.existingCommitVerification;
  if(contractPointer!==undefined||requestedVerification!==undefined){
    const parsed=existingCommitVerificationSchema.safeParse(contractPointer),requested=existingCommitVerificationSchema.safeParse(requestedVerification);
    if(!parsed.success||!requested.success||releaseDigest(parsed.data)!==releaseDigest(requested.data)
      ||currentCommit===approval.baselineCommit||parsed.data.previousCommit!==currentCommit
      ||parsed.data.previousExecutionId===execution.id||!id.safeParse(execution.id).success)fail();
    const pointer=parsed.data;
    // The closure and its atomic revocation are immutable owner authority for
    // observing this exact accepted candidate again, never for new code or Git.
    const closures=await db.$queryRaw<any[]>`
      SELECT r.id,r.workspace_id,r.task_id,r.application_id,r.host_id,r.issuer_user_id,
        r.snapshot AS release_snapshot,c.id AS closure_id,c.consent_digest,c.closure_digest,
        c.snapshot AS closure_snapshot,v.reason AS revocation_reason,
        governed_release_failed_baseline_proven(r.id,c.failed_operation_id,c.snapshot->'evidence') AS proven
      FROM governed_releases r JOIN governed_release_failed_closures c ON c.release_id=r.id
      JOIN governed_release_revocations v ON v.id=c.revocation_id AND v.release_id=r.id AND v.workspace_id=r.workspace_id
      WHERE r.id=${pointer.releaseId}::uuid AND c.id=${pointer.closureId}::uuid AND r.workspace_id=${workspaceId}::uuid`;
    if(closures.length!==1)fail();
    const closed=closures[0],source=closed.release_snapshot,receipt=closed.closure_snapshot;
    if(closed.proven!==true||closed.issuer_user_id!==ownerUserId||closed.workspace_id!==workspaceId
      ||closed.task_id!==execution.taskId||closed.application_id!==execution.applicationId||closed.host_id!==execution.agentHostId
      ||closed.closure_id!==pointer.closureId||closed.consent_digest!==pointer.consentDigest
      ||closed.closure_digest!==releaseDigest(receipt)||closed.revocation_reason!==`Closed FAILED; owner baseline receipt ${pointer.closureId}`
      ||receipt.releaseId!==pointer.releaseId||receipt.issuerUserId!==ownerUserId||receipt.consentDigest!==pointer.consentDigest
      ||source.taskId!==execution.taskId||source.applicationId!==execution.applicationId||source.hostId!==execution.agentHostId
      ||source.commit!==currentCommit||!hex40.test(source.candidateTree??''))fail();
    const accepted=await db.taskReviewDecision.findFirst({where:{id:source.reviewId,workspaceId,taskId:execution.taskId},include:{execution:true}});
    const previous=accepted?.execution,revision=obj(previous?.metadata).resultRevision,localCommit=obj(previous?.verification).localCommit;
    if(accepted?.decision!=='approve'||accepted.materialVersion!==source.materialVersion||obj(accepted.evidence).reviewedCommit!==currentCommit
      ||!previous||previous.id!==pointer.previousExecutionId||previous.status!=='completed'||!previous.completedAt
      ||previous.contextInvalidatedAt||previous.taskId!==execution.taskId||previous.applicationId!==execution.applicationId
      ||previous.agentHostId!==execution.agentHostId||releaseCandidateNativeError(previous,obj(previous.metadata).executionContract)
      ||revision.commit!==currentCommit||revision.branch!==approval.branch||revision.workingTree!=='clean'
      ||localCommit.commit!==currentCommit||localCommit.tree!==source.candidateTree||localCommit.branch!==approval.branch
      ||localCommit.decisionId!==rows[0].id||localCommit.taskId!==execution.taskId||localCommit.executionId!==previous.id
      ||localCommit.baselineCommit!==source.baseCommit||!hex40.test(source.baseCommit??''))fail();
    return {decisionId:rows[0].id,baselineCommit:currentCommit,branch:approval.branch,operations:{localCommit:false},
      operation:'verify_existing_local_commit',existingCommitVerification:{...pointer,closureDigest:closed.closure_digest}};
  }
  let continuation: { reviewId: string; previousExecutionId: string; previousCommit: string } | undefined;
  if (currentCommit !== approval.baselineCommit) {
    // A later write uses the owner's original one-time approval only after a
    // separate reviewer rejected the exact preceding commit and the manager
    // returned bounded correction work to this executor. The risk admission
    // must pin that same clean commit before a new Worker launch.
    const latest = await db.taskReviewDecision.findFirst({ where: { workspaceId, taskId: execution.taskId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { action: true, execution: true } });
    const prior = latest?.execution, revision = obj(prior?.metadata).resultRevision,
      localCommit = obj(prior?.verification).localCommit;
    if (latest?.decision !== 'reject' || latest.action?.action !== 'return_to_executor'
      || latest.action?.childTaskId || !prior || prior.status !== 'completed'
      || prior.contextInvalidatedAt || prior.agentHostId !== execution.agentHostId
      || prior.taskId !== execution.taskId || prior.applicationId !== execution.applicationId
      || revision.commit !== currentCommit || revision.branch !== approval.branch
      || revision.workingTree !== 'clean' || localCommit.commit !== currentCommit
      || localCommit.branch !== approval.branch || localCommit.decisionId !== rows[0].id
      || localCommit.taskId !== execution.taskId || localCommit.executionId !== prior.id
      || !hex40.test(localCommit.baselineCommit ?? '')) fail();
    continuation = { reviewId: latest.id, previousExecutionId: prior.id, previousCommit: currentCommit };
  }
  return { decisionId: rows[0].id, baselineCommit: currentCommit, branch: approval.branch,
    operations: approval.operations, ...(continuation ? { continuation } : {}) };
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
      execution, pin, workspace.ownerUserId,input.existingCommitVerification);
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
      expiry: expiresAt.getTime(), decisionId: decision.id, decisionRevision: decision.version, decisionAt: decision.at.toISOString(),
      ...(state.firstWrite?.existingCommitVerification?{existingVerificationDigest:releaseDigest(state.firstWrite)}:{}) });
    return { schemaVersion: 'roost-managed-admission-v1', phase: input.phase, signed:signedEvidence };
  }
  const prior = pending.get(executionId);
  pending.delete(executionId);
  if (!prior) fail();
  if (prior.expiry <= now.getTime() || prior.leaseDigest !== sha(input.leaseToken)
    || prior.hostId !== identity.hostId || prior.workspaceId !== identity.workspaceId || prior.installationId !== identity.installationId
    || prior.decisionId !== decision.id || prior.decisionRevision !== decision.version
    || prior.existingVerificationDigest!==(state.firstWrite?.existingCommitVerification?releaseDigest(state.firstWrite):undefined)) fail();
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
