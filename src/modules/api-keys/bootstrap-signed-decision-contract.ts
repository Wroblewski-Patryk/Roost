import {z} from 'zod';
import type {Prisma} from '@prisma/client';
import {bootstrapBinding} from './worker-bootstrap-contract';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';

export const signedDecisionGap=freezePublic({available:false,qualification:'signed_current_decision_unrepresentable_v1',
 blocker:'signed_current_decision_unavailable',reasons:['decision_signature_not_persisted','decision_signing_key_history_missing',
 'decision_terminal_history_missing','decision_all_writer_audit_missing','decision_signed_binding_not_persisted','decision_verifier_unavailable']} as const);
export const signedDecisionWriters=['create','revise','accept','reject','revoke','supersede','expire','delete','direct_sql_fixture',
 'owner_membership','intent_evidence','ticket','lifecycle','issuer','channel','signing_key','policy'] as const;
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),time=z.string().datetime();
// Proposed immutable child of a canonical revision/acceptance. Not an existing
// persisted format and never inserted into the ticket it hashes (no hash cycle).
export const signedDecisionBinding=z.object({version:z.literal('bootstrap-signed-current-decision-proposal-v1'),
 decisionId:id,decisionRevision:epoch,revisionDigest:hash,acceptanceId:id,ownerId:id,binding:bootstrapBinding,
 purpose:z.enum(['first_enrollment','owner_recovery']),intentDigest:hash,evidenceDigest:hash,
 ticketId:id,ticketContentDigest:hash,ticketEnvelopeDigest:hash,hostGeneration:id,installationGeneration:id,
 issuerRevision:epoch,issuerHistoryDigest:hash,channelGrantId:id,channelGrantRevision:epoch,channelGrantDigest:hash,
 policyRevision:epoch,validFrom:time,expiresAt:time,
 signingKeyId:id,signingKeyRevision:epoch,signingKeyEpoch:epoch,signingPublicKeyDigest:hash,signingKeyHistoryDigest:hash
}).strict().refine(v=>Date.parse(v.validFrom)<Date.parse(v.expiresAt));
const publicKey=z.object({id,workspaceId:id,ownerId:id,revision:epoch,epoch,purpose:z.literal('bootstrap-current-owner-decision-v1'),
 algorithm:z.literal('Ed25519'),publicKeyHex:z.string().regex(/^[a-f0-9]{64}$/),publicKeyDigest:hash,historyDigest:hash,
 validFrom:time,expiresAt:time,state:z.literal('current')}).strict();
const action=z.enum(['create','accept','sign','revise','reject','revoke','supersede','expire','delete']);
const event=z.object({id,revision:epoch,action,at:time,revisionDigest:hash,signedPayloadDigest:hash.nullable(),previousDigest:hash.nullable()}).strict();
const proof=z.object({qualification:z.literal('synthetic_signed_decision_proof_v1'),payload:signedDecisionBinding,
 signature:z.string().regex(/^[a-f0-9]{128}$/),key:publicKey,
 current:z.object({binding:signedDecisionBinding,candidateCount:z.literal(1),primaryOwnerId:id,ownerMembershipIds:z.array(id).length(1),
  state:z.literal('accepted'),successorCount:z.literal(0),acceptance:z.object({id,decisionId:id,workspaceId:id,actorUserId:id,
   actorAgentId:z.null(),actorCredentialId:z.null(),authority:z.literal('owner_reserved'),acceptedAt:time}).strict()}).strict(),
 history:z.array(event).min(3).max(1000),audit:z.array(z.object({eventId:id,eventDigest:hash,fence:epoch}).strict()).min(3).max(1000),
 historyHeadDigest:hash,fence:epoch,mode:z.literal('read_only_repeatable_read'),origin:z.literal(true),
 guards:z.array(z.object({writer:z.enum(signedDecisionWriters),enabled:z.literal(true),binding:z.literal('exact'),
  definition:z.literal('reviewed'),configuration:z.literal('exact')}).strict()).length(signedDecisionWriters.length)
}).strict();
export type SignedDecisionBinding=z.infer<typeof signedDecisionBinding>;
type Db=Prisma.TransactionClient;
type Proof=z.infer<typeof proof>;
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
function deny(reason:string):never{throw new Error(reason);}
const flags={implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,
 pilotExecutionAuthorized:false,pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const;
export const signedDecisionPayloadDigest=(payload:SignedDecisionBinding)=>reviewDigest({domain:'bootstrap-current-owner-decision-v1',payload});
export const signedDecisionPublicKeyDigest=(publicKeyHex:string)=>reviewDigest({domain:'bootstrap-current-owner-decision-key-v1',algorithm:'Ed25519',publicKeyHex});

// Explicit verifier receives the SAME read transaction and public, parsed,
// frozen material. A synthetic true result is not cryptographic qualification.
export type SignedDecisionVerifier={qualification:'synthetic_signed_decision_verifier_v1';verify:(db:Db,evidence:Readonly<{
 payload:SignedDecisionBinding;payloadDigest:string;signature:string;key:Proof['key'];fence:number
}>)=>Promise<boolean>};
export function inspectSignedDecisionModel(input:unknown,now=new Date()){
 const p=proof.parse(input),b=p.payload,k=p.key,c=p.current,a=c.acceptance,n=now.getTime();
 if(!Number.isFinite(n)||!same(b,c.binding)||c.primaryOwnerId!==b.ownerId||c.ownerMembershipIds[0]!==b.ownerId||
  a.id!==b.acceptanceId||a.decisionId!==b.decisionId||a.workspaceId!==b.binding.workspaceId||a.actorUserId!==b.ownerId||
  Date.parse(a.acceptedAt)>Date.parse(b.validFrom)||n<Date.parse(b.validFrom)||n>=Date.parse(b.expiresAt))deny('decision_not_current_owner_authority');
 if(k.id!==b.signingKeyId||k.workspaceId!==b.binding.workspaceId||k.ownerId!==b.ownerId||k.revision!==b.signingKeyRevision||
  k.epoch!==b.signingKeyEpoch||k.publicKeyDigest!==b.signingPublicKeyDigest||k.historyDigest!==b.signingKeyHistoryDigest||
  k.publicKeyDigest!==signedDecisionPublicKeyDigest(k.publicKeyHex)||Date.parse(k.validFrom)>Date.parse(b.validFrom)||
  Date.parse(k.expiresAt)<Date.parse(b.expiresAt)||n>=Date.parse(k.expiresAt))deny('decision_signing_key_not_current');
 if(!same(p.guards.map(g=>g.writer),signedDecisionWriters)||p.history.length!==p.audit.length)deny('decision_all_writer_audit_missing');
 let previous:Proof['history'][number]|undefined,lastFence=0;const ids=new Set<string>();
 for(let i=0;i<p.history.length;i++){
  const e=p.history[i],r=p.audit[i],expected=['create','accept','sign'][i];
  if(e.action!==expected||e.revision!==i+1||e.revisionDigest!==b.revisionDigest||e.signedPayloadDigest!==(e.action==='sign'?signedDecisionPayloadDigest(b):null)||
   e.previousDigest!==(previous?reviewDigest(previous):null)||ids.has(e.id)||Date.parse(e.at)>n||
   previous&&Date.parse(previous.at)>Date.parse(e.at)||r.eventId!==e.id||r.eventDigest!==reviewDigest(e)||r.fence<=lastFence||
   e.action==='accept'&&e.at!==a.acceptedAt||e.action==='sign'&&Date.parse(e.at)>Date.parse(b.validFrom))deny('decision_history_invalid_or_terminal');
  ids.add(e.id);lastFence=r.fence;previous=e;
 }
 if(lastFence>p.fence||p.historyHeadDigest!==reviewDigest(previous))deny('decision_history_or_fence_missing');
 return freezePublic(p);
}
const request=z.object({decisionId:id,ticketId:id}).strict();
const transaction=z.object({fence:epoch,isolation:z.literal('repeatable read'),readOnly:z.literal(true),origin:z.literal(true)}).strict();
type Dependencies={qualification:'synthetic_signed_decision_model_v1';
 withRead:<T>(work:(db:Db)=>Promise<T>)=>Promise<T>;transaction:(db:Db)=>Promise<unknown>;
 read:(db:Db,query:z.infer<typeof request>)=>Promise<unknown>;verifier?:SignedDecisionVerifier;
 exchange:(expected:Readonly<{decisionId:string;ticketId:string;digest:string;fence:number}>)=>Promise<void>};
// Only a denial/protocol model. Each projection uses a fresh read-only snapshot;
// future writers must compare the exact fence atomically at dispatch/commit.
// Paired SELECTs alone cannot prevent a concurrent change after the last read.
export function createSignedDecisionModel(deps?:Dependencies,clock=()=>new Date()){
 async function read(q:z.infer<typeof request>){
  if(deps?.qualification!=='synthetic_signed_decision_model_v1'||deps.verifier?.qualification!=='synthetic_signed_decision_verifier_v1')deny('decision_verifier_unavailable');
  return deps.withRead(async db=>{
   const before=transaction.parse(await deps.transaction(db)),p=inspectSignedDecisionModel(await deps.read(db,q),clock());
   if(p.payload.decisionId!==q.decisionId||p.payload.ticketId!==q.ticketId||p.fence!==before.fence)deny('decision_binding_or_fence_changed');
   if(await deps.verifier!.verify(db,freezePublic({payload:p.payload,payloadDigest:signedDecisionPayloadDigest(p.payload),signature:p.signature,key:p.key,fence:p.fence}))!==true)deny('decision_signature_invalid');
   if(!same(before,transaction.parse(await deps.transaction(db))))deny('decision_transaction_changed');
   // Verification may cross expiry even if the transaction itself stays stable.
   inspectSignedDecisionModel(p,clock());
   return {db,projection:freezePublic({decisionId:q.decisionId,ticketId:q.ticketId,digest:reviewDigest(p),fence:p.fence,revision:p.payload.decisionRevision})};
  });
 }
 async function pair(q:z.infer<typeof request>){const a=await read(q),b=await read(q);
  if(a.db===b.db||!same(a.projection,b.projection))deny('decision_fresh_projection_changed');return b.projection;
 }
 return Object.freeze({
  async status(value:unknown){try{const p=await pair(request.parse(value));return {ok:true,qualification:'source_model_only',projection:p,...flags};}
   catch{return {ok:false,blocker:signedDecisionGap.blocker,...flags};}},
  async run(value:unknown){let possibleCommit=false;
   try{const q=request.parse(value),p=await pair(q);possibleCommit=true;await deps!.exchange(p);
    if(!same(p,await pair(q)))deny('decision_changed_after_send');
    return {ok:true,qualification:'source_model_only',retryable:false,...flags};
   }catch{return {ok:false,error:possibleCommit?'delivery_unknown':'denied',reconciliationRequired:possibleCommit,retryable:false,...flags};}
  }
 });
}
