import type {Prisma} from '@prisma/client';
import {z} from 'zod';
import {readCanonicalTicketLifecycle} from './bootstrap-ticket-lifecycle-store';
import {inspectCanonicalIssuer} from './bootstrap-issuer-store';
import {inspectCanonicalLifecycle} from './worker-identity-lifecycle-store';
import {validateV2ChannelPlan} from './bootstrap-channel-persistence-contract';
import {lifecycleFlags,lifecycleEqual,lifecycleId,denyLifecycle} from './bootstrap-ticket-lifecycle-contract';
import {ticketContentDigest,ticketEnvelopeDigest,ticketV2Domains} from './bootstrap-ticket-v2-digests';
import {freezePublic} from './worker-transport-snapshot';
type Db=Prisma.TransactionClient;
type Ledger=Awaited<ReturnType<typeof readCanonicalTicketLifecycle>>;
type Issuer=NonNullable<Awaited<ReturnType<typeof inspectCanonicalIssuer>>['facts']>;
export type TicketRevocationVerifier={qualification:'synthetic_canonical_ticket_revocation_verifier_v1';verify:(db:Db,proof:Readonly<{
 domain:typeof ticketV2Domains.content;contentDigest:string;envelopeDigest:string;signed:Ledger['root']['record']['signed'];identity:Ledger['root']['identity'];
 issuer:Issuer;issuerRevision:number;issuerHistoryDigest:string;at:string;
}>)=>Promise<boolean>};
const input=z.object({ticketId:lifecycleId}).strict();
export const invalidTicketRevocation=()=>freezePublic({ok:false as const,available:false as const,state:'invalid_incomplete' as const,
 qualification:'canonical_ticket_revocation_source_only_v1' as const,blockers:['bootstrap_ticket_revocation_unavailable'],...lifecycleFlags});
// SELECT-only projection of the existing ledger. The authority source supplies
// its bound transaction and original fence; this helper never opens a transaction.
export async function readCanonicalTicketRevocation(db:Db,value:unknown,expectedFence:string,verifier:TicketRevocationVerifier|undefined,clock:()=>Date){
 try{
  if(verifier?.qualification!=='synthetic_canonical_ticket_revocation_verifier_v1'||typeof verifier.verify!=='function')denyLifecycle();
  const q=input.parse(value),p=await readCanonicalTicketLifecycle(db,q.ticketId,clock()),i=p.root.identity;
  if(p.fence!==expectedFence)denyLifecycle();
  const issuer=await inspectCanonicalIssuer(db,i.binding,clock(),i.issuedAt),lifecycle=await inspectCanonicalLifecycle(db,i.binding);
  if(!issuer.facts||issuer.blockers.length||!lifecycle.facts||lifecycle.blockers.length||
   lifecycle.facts.hostGeneration!==i.hostGeneration||lifecycle.facts.installationGeneration!==i.installationGeneration||
   issuer.facts.epoch!==i.binding.ticketKeyEpoch||issuer.facts.highWater!==i.binding.ticketKeyEpoch||
   issuer.facts.material.keyId!==i.binding.ticketKeyId||issuer.facts.material.publicKeyDigest!==i.binding.ticketPublicKeyDigest)denyLifecycle();
  const anchor=await db.$queryRaw<any[]>`SELECT (bootstrap_lifecycle_anchors_current(${JSON.stringify(i)}::jsonb)
   AND EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m ON m.workspace_id=w.id AND m.user_id=w.owner_user_id
    WHERE w.id=${i.binding.workspaceId}::uuid AND w.owner_user_id=${i.ownerId}::uuid AND m.role::text='owner'
     AND (SELECT count(*) FROM workspace_memberships x WHERE x.workspace_id=w.id AND x.role::text='owner')=1)) AS revocation_anchors`;
  if(anchor.length!==1||anchor[0].revocation_anchors!==true)denyLifecycle();
  const ih=await db.$queryRaw<any[]>`SELECT revision,record_digest AS digest FROM bootstrap_issuer_history WHERE workspace_id=${i.binding.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`;
  if(ih.length!==1||ih[0].revision!==i.issuerRevision||ih[0].digest!==i.issuerHistoryDigest)denyLifecycle();
  // Terminal predecessors remain inspectable without requiring an old channel
  // to be current. Their original atomic binding and immutable receipt are required.
  const channel=await db.$queryRaw<any[]>`SELECT g.record->'intent'->'snapshot' AS snapshot,
   bootstrap_lifecycle_channel_bound(t.lifecycle_identity) AS bound
   FROM worker_bootstrap_tickets t JOIN worker_transport_bootstrap_grants g ON g.ticket_id=t.id WHERE t.id=${q.ticketId}::uuid LIMIT 2`;
  if(channel.length!==1||channel[0].bound!==true)denyLifecycle();
  validateV2ChannelPlan(p.root.record.signed.payload,channel[0].snapshot,new Date(i.notBefore));
  const signed=p.root.record.signed,contentDigest=ticketContentDigest(signed.payload),envelopeDigest=ticketEnvelopeDigest(signed);
  if(envelopeDigest!==i.ticketDigest||await verifier!.verify(db,freezePublic({domain:ticketV2Domains.content,contentDigest,envelopeDigest,signed,identity:i,
   issuer:issuer.facts!,issuerRevision:ih[0].revision,issuerHistoryDigest:ih[0].digest,at:clock().toISOString()}))!==true)denyLifecycle();
  const fence=await db.$queryRaw<any[]>`SELECT revision::text AS ticket_fence FROM ready_source_fence WHERE id=1`;
  if(fence.length!==1||fence[0].ticket_fence!==expectedFence)denyLifecycle();
  const now=clock().getTime(),h=p.head;
  const state=h.state==='delivery_unknown'?'terminal_unknown':h.revoked?'terminal_revoked':h.expired||now>=Date.parse(i.expiresAt)?'expired':
   h.state==='completed'?'completed':['consumed','dispatched'].includes(h.state)?'consumed':'valid_not_revoked';
  const terminal=['terminal_unknown','terminal_revoked','expired'].includes(state);
  if(!terminal&&(!p.authorityCurrent||now<Date.parse(i.notBefore)))denyLifecycle();
  return freezePublic({ok:true as const,available:true as const,qualification:'canonical_ticket_revocation_source_only_v1' as const,state,
   revoked:terminal||state==='completed',admissible:!terminal&&state!=='completed',reconciliationRequired:state==='terminal_unknown',retryable:false as const,
   identity:i,contentDigest,envelopeDigest,revision:h.revision,digest:p.digest,fence:p.fence,head:h,
   generationHighWater:p.generationHighWater,credentialHighWater:p.credentialHighWater,...lifecycleFlags});
 }catch{return invalidTicketRevocation();}
}
export type TicketRevocationRead=Awaited<ReturnType<typeof readCanonicalTicketRevocation>>;
// Synthetic boundary driver only. Each read callback must acquire a fresh bound
// READ ONLY transaction through the authority source. No exchange default exists.
export function createTicketRevocationReadProtocol(deps?:{qualification:'synthetic_ticket_revocation_reader_protocol_v1';
 read:(value:unknown)=>Promise<TicketRevocationRead>;exchange:()=>Promise<unknown>;complete:(reply:unknown)=>Promise<void>}){
 async function pair(ticketId:string){const a=await deps!.read({ticketId}),b=await deps!.read({ticketId});
  if(!a.ok||!b.ok||!a.admissible||!b.admissible||a.state!=='consumed'||b.state!=='consumed'||!lifecycleEqual(a,b))denyLifecycle();return b;
 }
 return Object.freeze({async run(value:unknown){let possibleCommit=false;try{
  if(deps?.qualification!=='synthetic_ticket_revocation_reader_protocol_v1')denyLifecycle();const q=input.parse(value),sending=await pair(q.ticketId);
  possibleCommit=true;const reply=await deps!.exchange(),completion=await pair(q.ticketId);
  if(!lifecycleEqual(sending,completion))denyLifecycle();await deps!.complete(reply);
  return {ok:true as const,qualification:'synthetic_only',...lifecycleFlags};
 }catch{return {ok:false as const,error:possibleCommit?'delivery_unknown':'denied',reconciliationRequired:possibleCommit,retryable:false,...lifecycleFlags};}}});
}
