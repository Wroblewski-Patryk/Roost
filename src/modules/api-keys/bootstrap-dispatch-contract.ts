import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {bootstrapBinding} from './worker-bootstrap-contract';
import {decisionAuthorityRequest,type DecisionAuthorityRead} from './bootstrap-decision-authority-reader';
import {exact,positiveText,sqlHash} from './decision-attestation-sql';
import {dispatchLineage,type DispatchLineage} from './bootstrap-dispatch-lineage';

const id=z.string().uuid(),count=z.number().int().nonnegative().max(2147483646),time=z.string().datetime({offset:true});
export const dispatchScope=decisionAuthorityRequest.extend({attemptId:id}).strict();
export const dispatchStates=['sealed_ready','claimed_not_sent','send_started','delivery_unknown','delivered',
 'completion_started','completed','reconciliation_required','terminal_failed','cancelled'] as const;
export const dispatchActions=['prepare','claim','resume','start_send','outcome','unknown','start_complete','complete',
 'require_reconciliation','reconcile','recover','cancel'] as const;
export const dispatchAuthority=z.object({attemptId:id,ticketId:id,decisionId:id,ownerId:id,ticketDigest:sqlHash,purpose:z.enum(['first_enrollment','owner_recovery']),
 binding:bootstrapBinding,hostGeneration:id,installationGeneration:id,credentialEpoch:count.positive(),
 version:z.object({authorityRevision:positiveText,fence:positiveText,digest:sqlHash}).strict(),
 projectionDigest:sqlHash,sealDigest:sqlHash,validFrom:time,expiresAt:time}).strict();
export const dispatchCommand=dispatchScope.extend({operationId:id,action:z.enum(dispatchActions),
 expectedRevision:count,expectedDigest:sqlHash.nullable(),ownerId:id.nullable(),ownerEpoch:count,claimGeneration:count,
 leaseMs:z.number().int().min(1).max(30000).nullable(),responseDigest:sqlHash.nullable(),
 completionOperationId:id.nullable(),evidenceDigest:sqlHash.nullable()}).strict();
export const dispatchRecord=z.object({version:z.literal('bootstrap-attempt-dispatch-v1'),attemptId:id,
 operationId:id,action:z.enum(dispatchActions),revision:count.positive(),previousDigest:sqlHash.nullable(),
 authority:dispatchAuthority,lineage:dispatchLineage,state:z.enum(dispatchStates),ownerId:id.nullable(),ownerEpoch:count,claimGeneration:count,
 claimedAt:time.nullable(),leaseExpiresAt:time.nullable(),at:time,responseDigest:sqlHash.nullable(),
 completionOperationId:id.nullable(),evidenceDigest:sqlHash.nullable()}).strict();
export type DispatchCommand=z.infer<typeof dispatchCommand>;
export type DispatchRecord=z.infer<typeof dispatchRecord>;
export type DispatchAuthority=z.infer<typeof dispatchAuthority>;
export const dispatchDigest=(record:DispatchRecord)=>reviewDigest(record);
export function denyDispatch():never{throw Error('bootstrap_dispatch_denied');}

export function authorityForDispatch(proof:DecisionAuthorityRead,scope:z.infer<typeof dispatchScope>):DispatchAuthority{
 const p=proof.attestation.payload,s=proof.seal;
 if(!s||s.attemptId!==scope.attemptId||proof.ticketHead.attemptId!==scope.attemptId||proof.ticketHead.state!=='consumed'||
  p.decisionId!==scope.decisionId||p.ticketId!==scope.ticketId||!exact(p.binding,scope.binding)||p.purpose!==scope.purpose)denyDispatch();
 return freezePublic(dispatchAuthority.parse({attemptId:scope.attemptId,ticketId:p.ticketId,decisionId:p.decisionId,ownerId:p.ownerId,
  ticketDigest:proof.ticketDigest,purpose:p.purpose,binding:p.binding,hostGeneration:p.hostGeneration,installationGeneration:p.installationGeneration,
  credentialEpoch:proof.identity.credentialEpoch,version:proof.version,projectionDigest:proof.projectionDigest,
  sealDigest:reviewDigest(s),validFrom:p.validFrom,expiresAt:p.expiresAt}));
}

// Pure transition model; the concrete adapter must lock the source fence and
// append atomically, then verify a separate COMMIT readback before granting work.
export function advanceDispatch(previous:DispatchRecord|null,authority:DispatchAuthority,input:unknown,at:string,lineage:DispatchLineage):DispatchRecord{
 const c=dispatchCommand.parse(input),a=dispatchAuthority.parse(authority),p=previous?dispatchRecord.parse(previous):null,n=Date.parse(time.parse(at));
 const l=dispatchLineage.parse(lineage),anchor=l.anchor;
 if(anchor.attemptId!==a.attemptId||anchor.ticketId!==a.ticketId||anchor.decisionId!==a.decisionId||anchor.sealDigest!==a.sealDigest||
  anchor.ticketHead.digest!==a.ticketDigest||anchor.sealReceipt.fence!==a.version.fence||anchor.sealReceipt.authorityRevision!==a.version.authorityRevision||
  anchor.sealReceipt.operationId!==a.attemptId||anchor.sealReceipt.ticketId!==a.ticketId||anchor.sealReceipt.decisionId!==a.decisionId||
  (p?(!exact(anchor,p.lineage.anchor)||!l.previous||l.previous.operationId!==p.operationId||l.previous.recordDigest!==dispatchDigest(p)||
    l.previous.fence!==a.version.fence):l.previous!==null))denyDispatch();
 if(c.attemptId!==a.attemptId||c.ticketId!==a.ticketId||c.decisionId!==a.decisionId||c.purpose!==a.purpose||!exact(c.binding,a.binding)||
  n<Date.parse(a.validFrom)||n>=Date.parse(a.expiresAt)||c.expectedRevision!==(p?.revision??0)||
  c.expectedDigest!==(p?dispatchDigest(p):null)||p&&(!exact(a,p.authority)||n<Date.parse(p.at)))denyDispatch();
 let state:DispatchRecord['state']='sealed_ready',ownerId=p?.ownerId??null,ownerEpoch=p?.ownerEpoch??0,
  claimGeneration=p?.claimGeneration??0,claimedAt=p?.claimedAt??null,leaseExpiresAt=p?.leaseExpiresAt??null,
  responseDigest=p?.responseDigest??null,completionOperationId=p?.completionOperationId??null;
 const claim=c.action==='claim'||c.action==='resume',terminal=['reconcile','recover','cancel','require_reconciliation'].includes(c.action);
 if(!claim&&c.leaseMs!==null||!terminal&&c.evidenceDigest!==null||terminal&&c.evidenceDigest===null)denyDispatch();
 if(!['outcome','complete','start_complete'].includes(c.action)&&c.responseDigest!==null||
  !['complete','start_complete'].includes(c.action)&&c.completionOperationId!==null)denyDispatch();
 if(!p){
  if(c.action!=='prepare'||c.ownerId!==null||c.ownerEpoch!==0||c.claimGeneration!==0)denyDispatch();
 }else{
  if(p.state==='cancelled'||p.state==='completed'||c.action==='prepare'||c.operationId===p.operationId)denyDispatch();
  const sameOwner=c.ownerId===p.ownerId&&c.ownerEpoch===p.ownerEpoch&&c.claimGeneration===p.claimGeneration;
  if(claim){
   if(c.action==='claim'&&p.state!=='sealed_ready'||c.action==='resume'&&(p.state!=='claimed_not_sent'||!p.leaseExpiresAt||n<Date.parse(p.leaseExpiresAt))||
    !c.ownerId||c.ownerEpoch!==p.ownerEpoch+1||c.claimGeneration!==p.claimGeneration+1||!c.leaseMs)denyDispatch();
   ownerId=c.ownerId;ownerEpoch=c.ownerEpoch;claimGeneration=c.claimGeneration;claimedAt=at;
   leaseExpiresAt=new Date(n+c.leaseMs!).toISOString();if(Date.parse(leaseExpiresAt)>=Date.parse(a.expiresAt))denyDispatch();state='claimed_not_sent';
  }else if(terminal){
   // An explicit fresh owner-authority command can close an abandoned operation,
   // including after lease expiry. It can never return to a sendable state.
   if(!sameOwner)denyDispatch();
   if(c.action==='recover'){if(p.state!=='terminal_failed')denyDispatch();state='cancelled';}
   else if(c.action==='reconcile'){
    if(!['delivery_unknown','reconciliation_required','completion_started'].includes(p.state))denyDispatch();state='terminal_failed';
   }else if(c.action==='cancel'){
    if(!['sealed_ready','claimed_not_sent','terminal_failed'].includes(p.state))denyDispatch();state='cancelled';
   }else{if(p.state==='terminal_failed'||p.state==='reconciliation_required')denyDispatch();state='reconciliation_required';}
  }else{
   if(!sameOwner||!p.ownerId||!p.leaseExpiresAt||n>=Date.parse(p.leaseExpiresAt))denyDispatch();
   if(c.action==='start_send'){if(p.state!=='claimed_not_sent')denyDispatch();state='send_started';}
   else if(c.action==='outcome'){if(p.state!=='send_started'||!c.responseDigest)denyDispatch();state='delivered';responseDigest=c.responseDigest;}
   else if(c.action==='unknown'){if(!['send_started','completion_started'].includes(p.state))denyDispatch();state='delivery_unknown';}
   else if(c.action==='start_complete'){
    if(p.state!=='delivered'||c.responseDigest!==p.responseDigest||c.completionOperationId!==c.operationId)denyDispatch();
    state='completion_started';completionOperationId=c.operationId;
   }else if(c.action==='complete'){
    if(p.state!=='completion_started'||c.responseDigest!==p.responseDigest||c.completionOperationId!==p.completionOperationId)denyDispatch();state='completed';
   }else denyDispatch();
  }
 }
 return freezePublic(dispatchRecord.parse({version:'bootstrap-attempt-dispatch-v1',attemptId:c.attemptId,operationId:c.operationId,action:c.action,
  revision:(p?.revision??0)+1,previousDigest:c.expectedDigest,authority:a,lineage:l,state,ownerId,ownerEpoch,claimGeneration,claimedAt,leaseExpiresAt,at,
  responseDigest,completionOperationId,evidenceDigest:c.evidenceDigest}));
}

// Replay uses the same strict transitions, including lease and owner high water.
export function inspectDispatchHistory(input:unknown):DispatchRecord[]{
 const rows=z.array(dispatchRecord).max(1000).parse(input),ids=new Set<string>();let p:DispatchRecord|null=null;
 for(const r of rows){
  if(ids.has(r.operationId))denyDispatch();ids.add(r.operationId);
  const claim=r.action==='claim'||r.action==='resume';
  const c={...r.authority, binding:r.authority.binding};
  const next=advanceDispatch(p,r.authority,{decisionId:c.decisionId,ticketId:c.ticketId,attemptId:r.attemptId,binding:c.binding,
   purpose:c.purpose,operationId:r.operationId,action:r.action,expectedRevision:r.revision-1,expectedDigest:r.previousDigest,
   ownerId:r.ownerId,ownerEpoch:r.ownerEpoch,claimGeneration:r.claimGeneration,
   leaseMs:claim?Date.parse(r.leaseExpiresAt!)-Date.parse(r.at):null,
   responseDigest:['outcome','start_complete','complete'].includes(r.action)?r.responseDigest:null,
   completionOperationId:['start_complete','complete'].includes(r.action)?r.completionOperationId:null,evidenceDigest:r.evidenceDigest},r.at,r.lineage);
  if(!exact(next,r))denyDispatch();p=r;
 }
 return freezePublic(rows);
}
