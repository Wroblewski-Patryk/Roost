import {z} from 'zod';
import {bootstrapOwnerTicket,bootstrapBinding,bootstrapChannel,bootstrapCredential,bootstrapOwnerDecision} from './worker-bootstrap-contract';
import {revocationIdentity} from './bootstrap-ticket-revocation-contract';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';

export const lifecycleId=z.string().uuid(),lifecycleHash=z.string().regex(/^[a-f0-9]{64}$/);
const integer=z.number().int().min(1).max(2147483647),count=integer.or(z.literal(0)),time=z.string().datetime();
export const lifecycleActions=['issue','reserve','consume','revoke','expire','dispatch','complete','reconcile','unknown'] as const;
export const lifecycleStates=['issued','reserved','consumed','dispatched','completed','revoked','expired','delivery_unknown'] as const;
export const lifecycleFlags=Object.freeze({implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,
 pilotExecutionAuthorized:false,pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const);
export const lifecycleEqual=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export const denyLifecycle=():never=>{throw Error('bootstrap_ticket_lifecycle_denied');};
// The digest is outside the signed payload to avoid a circular signature/digest.
// No v1 payload is upgraded and no signer is provided by this persistence proposal.
export const lifecycleIdentity=revocationIdentity;
const signedMetadata=revocationIdentity.innerType().omit({ticketDigest:true}).strict();
const intent=z.object({schemaVersion:z.literal('worker-bootstrap-admission-v2'),purpose:z.enum(['first_enrollment','owner_recovery']),
 binding:bootstrapBinding,requestId:lifecycleId,deviceProofDigest:lifecycleHash,channel:bootstrapChannel,
 baseline:z.object({enrollmentGeneration:count,credentialHighWater:count,credential:bootstrapCredential.nullable()}).strict(),target:bootstrapCredential,
 prior:signedMetadata.shape.predecessor,expiresAt:time}).strict();
const payload=bootstrapOwnerTicket.omit({version:true,intent:true}).extend({version:z.literal('worker-bootstrap-owner-ticket-v2'),intent,lifecycle:signedMetadata}).strict();
const signature=z.string().regex(/^[a-f0-9]{128}$/);
export const lifecycleRegistration=z.object({operationId:lifecycleId,identity:lifecycleIdentity,
 record:z.object({signed:z.object({payload,signature}).strict(),decision:z.object({payload:bootstrapOwnerDecision,signature}).strict()}).strict()}).strict().superRefine((v,c)=>{
 const i=v.identity,p=v.record.signed.payload,d=v.record.decision.payload,{ticketDigest,...metadata}=i;
 if(!lifecycleEqual(p.lifecycle,metadata)||ticketDigest!==reviewDigest(v.record.signed)||p.id!==i.ticketId||p.ownerId!==i.ownerId||p.decisionId!==i.decisionId||p.decisionRevision!==i.decisionRevision||
 p.issuedAt!==i.issuedAt||p.intent.expiresAt!==i.expiresAt||p.intent.purpose!==i.purpose||!lifecycleEqual(p.intent.binding,i.binding)||!lifecycleEqual(p.intent.prior,i.predecessor)||
 p.intent.baseline.enrollmentGeneration!==i.generation-1||p.intent.baseline.credentialHighWater!==i.credentialEpoch-1||p.intent.target.epoch!==i.credentialEpoch||p.intent.target.version!==1||
 p.decisionIntentDigest!==reviewDigest(p.intent)||d.id!==i.decisionId||d.ownerId!==i.ownerId||d.revision!==i.decisionRevision||d.state!=='accepted'||d.intentDigest!==p.decisionIntentDigest||
 Date.parse(d.acceptedAt)>Date.parse(i.issuedAt)||Date.parse(d.expiresAt)<Date.parse(i.expiresAt)||Date.parse(p.ownerAuthAt)>Date.parse(i.issuedAt))
 c.addIssue({code:'custom',message:'Exact v2 signed public metadata required'});
});
export const lifecycleEvent=z.object({id:lifecycleId,ticketId:lifecycleId,revision:integer,previousDigest:lifecycleHash.nullable(),
 action:z.enum(lifecycleActions),state:z.enum(lifecycleStates),attemptId:lifecycleId.nullable(),historyId:lifecycleId.nullable(),
 revoked:z.boolean(),expired:z.boolean(),reconciled:z.boolean(),at:time}).strict();
export type TicketLifecycleEvent=z.infer<typeof lifecycleEvent>;
export function advanceTicketLifecycle(identity:unknown,previous:TicketLifecycleEvent|null,previousDigest:string|null,
 command:{id:string;action:TicketLifecycleEvent['action'];attemptId:string|null;historyId:string|null},now=new Date()){
 const i=lifecycleIdentity.parse(identity),p=previous,n=now.getTime(),a=command.action;
 if(!Number.isFinite(n)||p&&(p.ticketId!==i.ticketId||Date.parse(p.at)>n)||(!p)!==(previousDigest===null))denyLifecycle();
 let state:TicketLifecycleEvent['state']='issued',revoked=p?.revoked??false,expired=p?.expired??false,reconciled=p?.reconciled??false;
 if(!p){if(a!=='issue'||n<Date.parse(i.issuedAt)||n>=Date.parse(i.expiresAt)||command.attemptId||command.historyId)denyLifecycle();}
 else{
  if(a==='issue'||p.reconciled||p.state==='revoked'||p.state==='expired')denyLifecycle();
  if(['reserve','consume','dispatch','complete'].includes(a)&&(revoked||expired||n<Date.parse(i.notBefore)||n>=Date.parse(i.expiresAt)))denyLifecycle();
  if(a==='reserve'){if(p.state!=='issued')denyLifecycle();state='reserved';}
  if(a==='consume'){if(p.state!=='reserved')denyLifecycle();state='consumed';}
  if(a==='dispatch'){if(p.state!=='consumed')denyLifecycle();state='dispatched';}
  if(a==='complete'){if(p.state!=='dispatched')denyLifecycle();state='completed';}
  if(a==='revoke'||a==='expire'){
   if(a==='revoke'){if(revoked)denyLifecycle();revoked=true;}
   else{if(expired||n<Date.parse(i.expiresAt))denyLifecycle();expired=true;}
   state=['dispatched','completed','delivery_unknown'].includes(p.state)?'delivery_unknown':a==='revoke'?'revoked':'expired';
  }
  if(a==='unknown'){if(!['dispatched','completed'].includes(p.state))denyLifecycle();state='delivery_unknown';}
  if(a==='reconcile'){if(p.state!=='delivery_unknown')denyLifecycle();state='delivery_unknown';reconciled=true;}
 }
 if(['consumed','dispatched','completed'].includes(state)&&(!command.attemptId||!command.historyId)||
  p?.attemptId&&p.attemptId!==command.attemptId||a!=='consume'&&(command.attemptId??null)!==(p?.attemptId??null)||
  !command.attemptId&&command.historyId)denyLifecycle();
 return freezePublic(lifecycleEvent.parse({...command,ticketId:i.ticketId,revision:(p?.revision??0)+1,previousDigest,state,revoked,expired,reconciled,at:now.toISOString()}));
}
