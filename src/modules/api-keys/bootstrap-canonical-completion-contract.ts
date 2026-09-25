import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {bootstrapCredential} from './worker-bootstrap-contract';
import {signedBootstrapPeer,signedBootstrapCompletion,persistedBootstrapHistory} from './worker-bootstrap-persistence-contract';
import {dispatchCommand,dispatchRecord} from './bootstrap-dispatch-contract';
import {dispatchReceiptLink} from './bootstrap-dispatch-lineage';
import {lifecycleRegistration,lifecycleEvent} from './bootstrap-ticket-lifecycle-contract';
import {workerCredentialCommand} from './worker-credential-contract';
import {exact,positiveText,sqlHash} from './decision-attestation-sql';
import {productionPeerAddress} from './worker-transport-contract';

const id=z.string().uuid(),time=z.string().datetime(),signature=z.string().regex(/^[a-f0-9]{128}$/);
export const completionDomain='roost-bootstrap-canonical-completion-v1';
// The legacy signatures remain intact. A separate signed binding closes the
// legacy contracts' missing operation/seal/generation/predecessor fields.
export const completionBinding=z.object({version:z.literal(completionDomain),
 command:dispatchCommand,dispatchPredecessor:dispatchReceiptLink,sealDigest:sqlHash,
 ticketEnvelopeDigest:sqlHash,requestId:id,hostGeneration:id,installationGeneration:id,
 credential:bootstrapCredential,handoffId:id,handoffResponseDigest:sqlHash,
 credentialApprovalDigest:sqlHash,peerDigest:sqlHash,completionDigest:sqlHash,
 issuedAt:time,completedAt:time}).strict();
export const canonicalCompletionInput=z.object({binding:z.object({payload:completionBinding,signature}).strict(),
 peer:signedBootstrapPeer,completion:signedBootstrapCompletion}).strict();
export type CanonicalCompletionInput=z.infer<typeof canonicalCompletionInput>;
export const completionBytes=(payload:z.infer<typeof completionBinding>)=>Buffer.from(`${completionDomain}:${reviewDigest(payload)}`);
export const publicCredentialFact=z.object({credential:bootstrapCredential,workspaceId:id,installationId:id,hostId:id,
 active:z.boolean(),revokedAt:time.nullable(),expiresAt:time,scopes:z.tuple([z.literal('agent-runtime:claim')])}).strict();
export const completionContext=z.object({registration:lifecycleRegistration,attempt:persistedBootstrapHistory,
 ticket:lifecycleEvent,dispatch:dispatchRecord,dispatchReceipt:dispatchReceiptLink,credential:publicCredentialFact,
 handoff:z.object({id,workspaceId:id,installationId:id,hostId:id,hostFingerprint:sqlHash,state:z.literal('awaiting_ack'),
  credentialId:id,responseDigest:sqlHash,approval:workerCredentialCommand,ownerId:id,ackDeadline:time,
  origin:z.string(),certificateFingerprint:sqlHash}).strict(),
 sourceDigest:sqlHash,fence:positiveText,writerXid:positiveText,at:time}).strict();
export type CompletionContext=z.infer<typeof completionContext>;
export const completionReceipt=z.object({operationId:id,attemptId:id,ticketId:id,credentialId:id,
 inputDigest:sqlHash,sourceDigest:sqlHash,writerXid:positiveText,fromFence:positiveText,toFence:positiveText,
 dispatchDigest:sqlHash,attemptDigest:sqlHash,ticketDigest:sqlHash,credentialDigest:sqlHash,
 receiptSetDigest:sqlHash,eventId:id,recordDigest:sqlHash}).strict();
export type CompletionReceipt=z.infer<typeof completionReceipt>;
export function denyCompletion():never{throw Error('bootstrap_canonical_completion_denied');}
export function validateCompletion(input:CanonicalCompletionInput,context:CompletionContext){
 const v=canonicalCompletionInput.parse(input),s=completionContext.parse(context),b=v.binding.payload,c=b.command,
  i=s.registration.identity,t=s.registration.record.signed.payload,p=v.peer.payload,a=s.dispatch,h=s.handoff,k=s.credential,
  r=v.completion.payload,n=Date.parse(s.at),profile=t.intent.channel.profile,baseline=t.intent.baseline.credential,approval=h.approval.intent;
 if(c.action!=='complete'||c.operationId===a.operationId||c.leaseMs!==null||c.evidenceDigest!==null||c.responseDigest!==r.responseDigest||
  c.attemptId!==s.attempt.attemptId||c.ticketId!==i.ticketId||c.decisionId!==i.decisionId||c.purpose!==i.purpose||!exact(c.binding,i.binding)||
  a.state!=='completion_started'||s.attempt.state!=='consumed'||s.ticket.state!=='consumed'||s.ticket.revoked||s.ticket.expired||s.ticket.reconciled||
  c.expectedRevision!==a.revision||c.expectedDigest!==reviewDigest(a)||!exact(b.dispatchPredecessor,s.dispatchReceipt)||
  c.ownerId!==a.ownerId||c.ownerEpoch!==a.ownerEpoch||c.claimGeneration!==a.claimGeneration||c.completionOperationId!==a.completionOperationId||
  a.responseDigest!==r.responseDigest||!a.leaseExpiresAt||n>=Date.parse(a.leaseExpiresAt)||s.fence!==a.authority.version.fence||
  b.sealDigest!==a.authority.sealDigest||b.ticketEnvelopeDigest!==i.ticketDigest||b.requestId!==t.intent.requestId||
  b.hostGeneration!==i.hostGeneration||b.installationGeneration!==i.installationGeneration||!exact(b.credential,t.intent.target)||
  !exact(k.credential,b.credential)||k.workspaceId!==i.binding.workspaceId||k.installationId!==i.binding.installationId||k.hostId!==i.binding.hostId||
  k.active||k.revokedAt!==null||n>=Date.parse(k.expiresAt)||b.handoffId!==h.id||h.credentialId!==k.credential.id||
  h.workspaceId!==k.workspaceId||h.installationId!==k.installationId||h.hostId!==k.hostId||h.hostFingerprint!==i.binding.hostFingerprint||
  h.ownerId!==i.ownerId||h.responseDigest!==b.handoffResponseDigest||b.credentialApprovalDigest!==reviewDigest(h.approval)||
  !h.approval.intent.handoff||h.approval.intent.handoff.requestId!==h.id||h.approval.intent.action==='revoke'||
  h.approval.intent.workspaceId!==k.workspaceId||h.approval.intent.installationId!==k.installationId||h.approval.intent.hostId!==k.hostId||
  h.approval.intent.expectedEpoch+1!==k.credential.epoch||h.approval.intent.expiresAt!==k.expiresAt||
  approval.expectedCredentialId!==(baseline?.id??null)||approval.expectedFingerprint!==(baseline?.fingerprint??null)||
  (baseline?approval.expectedVersion+(approval.action==='rotate'?1:0)!==baseline.version:approval.action!=='enroll'||approval.expectedVersion!==0)||
  n>=Date.parse(h.ackDeadline)||n>=Date.parse(h.approval.intent.validUntil)||
  b.peerDigest!==reviewDigest(v.peer)||b.completionDigest!==reviewDigest(v.completion)||
  p.attemptId!==c.attemptId||p.ticketDigest!==i.ticketDigest||!exact(p.binding,i.binding)||
  p.origin!==profile.origin||p.origin!==h.origin||p.serverName!==profile.serverName||p.caDigest!==profile.trust.caDigest||
  p.pin!==profile.certificate.fingerprint||p.pin!==h.certificateFingerprint||p.certificateEpoch!==t.intent.channel.certificateEpoch||
  p.certificateNotBefore!==profile.certificate.notBefore||p.certificateNotAfter!==profile.certificate.notAfter||
  !p.addresses.every(productionPeerAddress)||!productionPeerAddress(p.peerAddress)||!p.addresses.includes(p.peerAddress)||
  Date.parse(p.observedAt)>n||n-Date.parse(p.observedAt)>30000||Date.parse(p.expiresAt)<=n||Date.parse(p.expiresAt)>Date.parse(p.observedAt)+30000||
  n<Date.parse(p.certificateNotBefore)||n>=Date.parse(p.certificateNotAfter)||n>=Date.parse(t.intent.channel.validUntil)||
  r.attemptId!==c.attemptId||r.ticketDigest!==i.ticketDigest||r.requestId!==b.requestId||!exact(r.credential,k.credential)||!exact(r.peer,p)||
  b.completedAt!==r.committedAt||Date.parse(b.issuedAt)<Date.parse(a.at)||Date.parse(b.issuedAt)>Date.parse(b.completedAt)||
  Date.parse(b.completedAt)>n||Date.parse(p.observedAt)>Date.parse(b.completedAt)||n<Date.parse(i.notBefore)||n>=Date.parse(i.expiresAt))denyCompletion();
 return {input:v,context:s};
}
