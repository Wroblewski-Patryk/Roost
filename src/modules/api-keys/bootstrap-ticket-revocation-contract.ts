import {z} from 'zod';
import {bootstrapBinding} from './worker-bootstrap-contract';
import {freezePublic} from './worker-transport-snapshot';
import {reviewDigest} from '../agent-runtime/task-review-contract';

export const bootstrapTicketRevocationGap=freezePublic({available:false,qualification:'canonical_ticket_revocation_unrepresentable_v1',
 blocker:'bootstrap_ticket_revocation_unavailable',reasons:['bootstrap_ticket_not_before_not_persisted','bootstrap_ticket_terminal_revocation_history_missing',
 'bootstrap_ticket_issue_high_water_not_reserved','bootstrap_ticket_all_writers_unfenced','bootstrap_ticket_preconsume_recovery_unrepresentable']} as const);
export const revocationWriters=['issue_register','reserve_consume','dispatch_send','revoke','expire','complete','reconcile','delete',
 'direct_sql_fixture','owner_decision','host_install_lifecycle','issuer','channel','credential'] as const;
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),count=z.number().int().nonnegative().safe(),time=z.string().datetime();
// Proposal only: immutable metadata linked to the existing ticket, never a new
// registry. Existing signed v1 payloads cannot be reinterpreted as this shape.
export const revocationIdentity=z.object({version:z.literal('bootstrap-ticket-revocation-proposal-v1'),ticketId:id,ticketDigest:hash,ownerId:id,
 decisionId:id,decisionRevision:epoch,purpose:z.enum(['first_enrollment','owner_recovery']),binding:bootstrapBinding,
 generation:epoch,credentialEpoch:epoch,issuedAt:time,notBefore:time,expiresAt:time,hostGeneration:id,installationGeneration:id,
 issuerRevision:epoch,issuerHistoryDigest:hash,channelGeneration:id,channelRevision:epoch,channelDigest:hash,
 predecessor:z.object({ticketId:id,ticketDigest:hash,attemptId:id.nullable(),generation:epoch,credentialEpoch:epoch,historyDigest:hash,
 state:z.enum(['revoked','expired','delivery_unknown']),workspaceId:id,hostId:id}).strict().nullable()
}).strict().superRefine((i,c)=>{const p=i.predecessor;
 if(Date.parse(i.issuedAt)>Date.parse(i.notBefore)||Date.parse(i.notBefore)>=Date.parse(i.expiresAt)||Date.parse(i.expiresAt)>Date.parse(i.issuedAt)+120000||
  (i.purpose==='first_enrollment'?(p!==null||i.generation!==1||i.credentialEpoch!==1):(!p||p.workspaceId!==i.binding.workspaceId||p.hostId!==i.binding.hostId||p.ticketId===i.ticketId||p.ticketDigest===i.ticketDigest||i.generation!==p.generation+1||i.credentialEpoch!==p.credentialEpoch+1)))
  c.addIssue({code:'custom',message:'Explicit validity and exact terminal predecessor required'});
});
const action=z.enum(['issue','consume','send','complete','revoke','expire','reconcile']);
const state=z.enum(['issued','consumed','dispatched','completed','revoked','expired','delivery_unknown']);
const event=z.object({id,identityDigest:hash,revision:epoch,previousDigest:hash.nullable(),action,state,revoked:z.boolean(),expired:z.boolean(),reconciled:z.boolean(),at:time}).strict();
export type RevocationIdentity=z.infer<typeof revocationIdentity>;
export type RevocationEvent=z.infer<typeof event>;
type Action=z.infer<typeof action>;
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b),deny=():never=>{throw Error('ticket_revocation_model_denied');};
export function nextRevocationEvent(input:unknown,historyInput:unknown,operation:unknown,now=new Date()){
 const i=revocationIdentity.parse(input),history=z.array(event).max(1000).parse(historyInput),c=z.object({id,action,expectedRevision:count}).strict().parse(operation),old=history.at(-1),n=now.getTime();
 if(!Number.isFinite(n)||history.length!==c.expectedRevision||history.some(e=>e.id===c.id)||old&&(old.identityDigest!==reviewDigest(i)||Date.parse(old.at)>n))deny();
 let next:RevocationEvent['state']='issued',revoked=old?.revoked??false,expired=old?.expired??false,reconciled=old?.reconciled??false;
 if(!old){if(c.action!=='issue'||n<Date.parse(i.issuedAt)||n>=Date.parse(i.expiresAt))deny();}
 else{
  if(c.action==='issue'||old.state==='revoked'||old.state==='expired'||old.reconciled)deny();
  if(['consume','send','complete'].includes(c.action)&&(revoked||expired||n<Date.parse(i.notBefore)||n>=Date.parse(i.expiresAt)))deny();
  if(c.action==='consume'){if(old.state!=='issued')deny();next='consumed';}
  if(c.action==='send'){if(old.state!=='consumed')deny();next='dispatched';}
  if(c.action==='complete'){if(old.state!=='dispatched')deny();next='completed';}
  if(c.action==='revoke'){if(revoked)deny();revoked=true;next=['dispatched','completed','delivery_unknown'].includes(old.state)?'delivery_unknown':'revoked';}
  if(c.action==='expire'){if(expired||n<Date.parse(i.expiresAt))deny();expired=true;next=['dispatched','completed','delivery_unknown'].includes(old.state)?'delivery_unknown':'expired';}
  if(c.action==='reconcile'){if(old.state!=='delivery_unknown')deny();reconciled=true;next='delivery_unknown';} // Never reopens or declares credential rollback.
 }
 return freezePublic(event.parse({id:c.id,identityDigest:reviewDigest(i),revision:history.length+1,previousDigest:old?reviewDigest(old):null,action:c.action,state:next,revoked,expired,reconciled,at:now.toISOString()}));
}
const proof=z.object({qualification:z.literal('synthetic_ticket_revocation_proof_v1'),identity:revocationIdentity,history:z.array(event).min(1).max(1000),
 audit:z.array(z.object({eventId:id,eventDigest:hash,fence:epoch}).strict()).min(1).max(1000),generationHighWater:epoch,credentialHighWater:epoch,
 fence:epoch,mode:z.literal('read_only_repeatable_read'),origin:z.literal(true),
 guards:z.array(z.object({writer:z.enum(revocationWriters),enabled:z.literal(true),binding:z.literal('exact'),definition:z.literal('reviewed'),configuration:z.literal('exact')}).strict()).length(revocationWriters.length),
 current:z.object({identityDigest:hash,owner:z.literal(true),lifecycle:z.literal(true),issuer:z.literal(true),channel:z.literal(true),predecessorDigest:hash.nullable()}).strict()
}).strict();
export function inspectTicketRevocationModel(input:unknown,now=new Date()){
 const p=proof.parse(input),i=p.identity,n=now.getTime();if(!Number.isFinite(n)||!same(p.guards.map(g=>g.writer),revocationWriters)||p.current.identityDigest!==reviewDigest(i)||
  p.current.predecessorDigest!==(i.predecessor?.historyDigest??null)||p.generationHighWater!==i.generation||p.credentialHighWater!==i.credentialEpoch||p.history.length!==p.audit.length)deny();
 const seen=new Set<string>();let lastFence=0;
 for(let k=0;k<p.history.length;k++){const e=p.history[k],a=p.audit[k];if(seen.has(e.id)||a.eventId!==e.id||a.eventDigest!==reviewDigest(e)||a.fence<=lastFence||e.revision!==k+1||Date.parse(e.at)>n||
   !same(e,nextRevocationEvent(i,p.history.slice(0,k),{id:e.id,action:e.action,expectedRevision:k},new Date(e.at))))deny();seen.add(e.id);lastFence=a.fence;}
 if(lastFence!==p.fence)deny();const head=p.history.at(-1)!;
 return freezePublic({qualification:'source_model_only' as const,identity:i,head,fence:p.fence,digest:reviewDigest(p),
  usable:!head.revoked&&!head.expired&&!head.reconciled&&n>=Date.parse(i.notBefore)&&n<Date.parse(i.expiresAt)&&['issued','consumed','dispatched'].includes(head.state)});
}
const flags={implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const;
export class RevocationModelUnknown extends Error{readonly retryable=false;constructor(){super('reconciliation_required');}}
type Dependencies={qualification:'synthetic_ticket_revocation_model_v1';read:(ticketId:string)=>Promise<unknown>;
 mutate:(ticketId:string,action:'consume'|'send'|'complete',expectedDigest:string)=>Promise<void>;exchange:()=>Promise<void>};
// An injected source-only protocol model. No default store, issue/revoke API,
// signer, sockets, credential delivery, generation allocator or retained state.
export function createTicketRevocationModel(deps?:Dependencies,clock=()=>new Date()){
 const input=z.object({ticketId:id}).strict();
 async function pair(ticketId:string,expected:'issued'|'consumed'|'dispatched'|'completed'){
  const a=inspectTicketRevocationModel(await deps!.read(ticketId),clock()),b=inspectTicketRevocationModel(await deps!.read(ticketId),clock());
  const valid=(p:typeof a)=>expected==='completed'?!p.head.revoked&&!p.head.expired&&!p.head.reconciled&&clock().getTime()>=Date.parse(p.identity.notBefore)&&clock().getTime()<Date.parse(p.identity.expiresAt):p.usable;
  if(a.identity.ticketId!==ticketId||!valid(a)||!valid(b)||a.head.state!==expected||b.head.state!==expected||!same(a,b))deny();return b;
 }
 return Object.freeze({
  async status(value:unknown){try{if(deps?.qualification!=='synthetic_ticket_revocation_model_v1')deny();const c=input.parse(value),p=inspectTicketRevocationModel(await deps!.read(c.ticketId),clock());if(p.identity.ticketId!==c.ticketId)deny();return {ok:true,qualification:'source_model_only',state:p.head.state,usable:p.usable,...flags};}catch{return {ok:false,error:'unavailable',...flags};}},
  async run(value:unknown){let possibleCommit=false;
   try{if(deps?.qualification!=='synthetic_ticket_revocation_model_v1')deny();const c=input.parse(value),a=await pair(c.ticketId,'issued');await deps!.mutate(c.ticketId,'consume',a.digest);
    const b=await pair(c.ticketId,'consumed');await deps!.mutate(c.ticketId,'send',b.digest);possibleCommit=true;
    await pair(c.ticketId,'dispatched');await deps!.exchange();const d=await pair(c.ticketId,'dispatched');await deps!.mutate(c.ticketId,'complete',d.digest);await pair(c.ticketId,'completed');
    return {ok:true,qualification:'source_model_only',state:'completed',...flags};
   }catch(e){return {ok:false,error:e instanceof RevocationModelUnknown?'reconciliation_required':possibleCommit?'delivery_unknown':'denied',retryable:false,...flags};}
  }
 });
}
