import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {attestationPayload,ownerAuthenticationEvidence} from './decision-attestation-persistence-model';
import {attestationDigest,attestationKeyEvent,projectAttestationKeys} from './decision-attestation-key-model';
import {lifecycleRegistration,advanceTicketLifecycle,lifecycleEvent} from './bootstrap-ticket-lifecycle-contract';
import {channelGrant,validateV2ChannelPlan} from './bootstrap-channel-persistence-contract';
import {ticketContentDigest} from './bootstrap-ticket-v2-digests';
import {persistedBootstrapAttempt,persistedBootstrapHistory} from './worker-bootstrap-persistence-contract';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {attestationScope,readAttestationObjects,one,safeCount,exact,exactTime,denyAttestation as deny,positiveText,sqlHash,
 type AttestationDb as Db,type AttestationScope as Scope,type AttestationObjects} from './decision-attestation-sql';

const id=z.string().uuid(),time=z.string().datetime({offset:true});
const nativeClock=z.object({fence:positiveText,isolation:z.enum(['repeatable read','serializable']),readOnly:z.enum(['on','off']),
 origin:z.literal('origin'),timezone:z.literal('UTC'),at:z.string().datetime({precision:6})}).strict();
export async function attestationDbClock(db:Db){return nativeClock.parse(one(await db.$queryRaw<unknown[]>`
 SELECT revision::text AS fence,current_setting('transaction_isolation') AS isolation,current_setting('transaction_read_only') AS "readOnly",
 current_setting('session_replication_role') AS origin,current_setting('TimeZone') AS timezone,to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at
 FROM ready_source_fence WHERE id=1`));}
// Explicit accepted-revision policy format. No default, config inference or
// legacy upgrade: absent fields remain unavailable. Evidence is the exact
// accepted impact preview, hashed from its stored JSON without Date conversion.
export const acceptedAttestationPolicy=z.object({version:z.literal('owner-decision-attestation-policy-v1'),revision:z.number().int().positive().safe(),
 evidenceDigest:sqlHash,validFrom:time,expiresAt:time}).strict();
const authorityEvent=z.object({id,workspace_id:id,decision_id:id,revision:z.number().int().positive().safe(),
 action:z.enum(['create','source_change','attest','supersede','revoke','expire','reject']),source_table:z.string(),source_row:z.string(),source_digest:sqlHash,
 previous_digest:sqlHash.nullable(),record_digest:sqlHash,fence_revision:z.number().int().positive().safe(),writer_xid:positiveText,at:time,mutation_digest:sqlHash.nullable()}).strict();
const envelope=z.object({id,payload:attestationPayload,signature:z.string().regex(/^[a-f0-9]{128}$/),at:time}).strict();
function rows(objects:AttestationObjects,table:string){return objects.filter(r=>r.table===table).map(r=>r.row);}
function single(objects:AttestationObjects,table:string){return one(rows(objects,table));}
function timestamp(v:unknown){return time.parse(v);}

// SELECT-only, transaction-client-only projection. Unlike the v51 oracle this
// retains native rows/receipts; it never fabricates synthetic journal entries.
export async function projectDecisionAttestation(db:Db,input:Scope){
 const q=attestationScope.parse(input);await requireDecisionAttestationGuards(db);const clock=await attestationDbClock(db);
 const objects=await readAttestationObjects(db,q),d=single(objects,'decisions'),r=single(objects,'decision_revisions'),a=single(objects,'decision_acceptances');
 const w=single(objects,'workspaces'),members=rows(objects,'workspace_memberships'),t=single(objects,'worker_bootstrap_tickets');
 if(d.authority_revision!==1||d.source!=='roost_decision'||d.status!=='accepted'||d.id!==q.decisionId||d.workspace_id!==w.id||r.decision_id!==d.id||r.workspace_id!==w.id||
  a.decision_id!==d.id||a.workspace_id!==w.id||a.actor_user_id!==w.owner_user_id||a.actor_agent_id!==null||a.actor_credential_id!==null||
  (a.authority as any)?.status!=='owner_reserved'||members.length!==1||members[0].user_id!==w.owner_user_id||t.id!==q.ticketId||t.decision_id!==d.id||t.workspace_id!==w.id)deny();
 const body=z.object({workerBootstrap:z.unknown(),ownerDecisionAttestation:acceptedAttestationPolicy}).passthrough().parse(r.body);
 const policy=body.ownerDecisionAttestation,preview=one(rows(objects,'decision_impact_previews').filter(p=>p.id===a.preview_id));
 if(preview.decision_id!==d.id||preview.workspace_id!==w.id||policy.evidenceDigest!==reviewDigest(preview.impact)||
  ['authority','workerCredential','workerTransport'].some(k=>k in body))deny();
 const registration=lifecycleRegistration.parse({operationId:q.ticketId,identity:t.lifecycle_identity,record:t.record}),i=registration.identity;
 if(i.decisionId!==d.id||i.ownerId!==w.owner_user_id||i.decisionRevision!==r.version||!exact(body.workerBootstrap,registration.record.signed.payload.intent)||
  !exact((body as any).workerBootstrapLifecycle,registration.record.signed.payload.lifecycle)||t.ticket_digest!==i.ticketDigest||
  exactTime(a.created_at)!==exactTime(registration.record.decision.payload.acceptedAt)||Date.parse(policy.validFrom)<Date.parse(timestamp(a.created_at))||
  Date.parse(policy.validFrom)<Date.parse(i.notBefore)||Date.parse(policy.expiresAt)>Date.parse(i.expiresAt)||Date.parse(policy.validFrom)>=Date.parse(policy.expiresAt))deny();
 const g=single(objects,'worker_transport_bootstrap_grants'),grant=channelGrant.parse(g.record);
 if(grant.id!==g.id||grant.intent.ticketId!==q.ticketId||grant.intent.ticketDigest!==i.ticketDigest||g.record_digest!==reviewDigest(grant))deny();
 validateV2ChannelPlan(registration.record.signed.payload,grant.intent.snapshot,new Date(i.notBefore));
 const history=rows(objects,'decision_authority_events').map(v=>authorityEvent.parse(v)).sort((a,b)=>a.revision-b.revision);
 let previous:typeof history[number]|undefined;
 for(const e of history){const {record_digest,...value}=e;
  if(e.decision_id!==d.id||e.workspace_id!==w.id||e.revision!==(previous?.revision??0)+1||e.previous_digest!==(previous?.record_digest??null)||
   e.record_digest!==attestationDigest('owner-decision-authority-event-v1',value)||e.fence_revision>safeCount(clock.fence)||
   previous&&e.fence_revision<=previous.fence_revision||Date.parse(e.at)>Date.parse(clock.at)||previous&&Date.parse(e.at)<Date.parse(previous.at))deny();
  previous=e;
 }
 if(!previous||history[0].action!=='create'||history.slice(1).some(e=>e.action==='create'))deny();
 const keyRows=rows(objects,'decision_attestation_key_history').sort((a,b)=>Number(a.revision)-Number(b.revision));
 const keys=keyRows.map(k=>{const e=attestationKeyEvent.parse(k.record);
  if(k.id!==e.id||k.workspace_id!==w.id||k.installation_id!==i.binding.installationId||k.key_id!==e.keyId||k.revision!==e.revision||k.action!==e.action||
   k.record_digest!==attestationDigest('owner-decision-key-event-v1',e))deny();return e;});
 const keyProjection=projectAttestationKeys(keys,i.binding.workspaceId,i.binding.installationId,new Date(clock.at));
 const authRows=rows(objects,'decision_owner_auth_evidence');if(authRows.length>1)deny();
 const authRow=authRows[0],auth=authRow?ownerAuthenticationEvidence.parse(authRow.record):null;
 if(authRow&&auth&&(authRow.decision_id!==d.id||authRow.acceptance_id!==a.id||authRow.workspace_id!==w.id||auth.acceptanceId!==a.id||
  auth.ownerId!==w.owner_user_id||auth.workspaceId!==w.id||exactTime(auth.acceptedAt)!==exactTime(a.created_at)||auth.policyRevision!==policy.revision||
  Date.parse(auth.authTime)>Date.parse(auth.acceptedAt)||authRow.record_digest!==attestationDigest('owner-decision-auth-evidence-v1',auth)))deny();
 const ceremony=attestationPayload.omit({version:true,authorityRevision:true,ownerAuthEvidenceDigest:true,ownerAuthLevel:true,signingKeyId:true,
  signingKeyRevision:true,signingKeyEpoch:true,signingPublicKeyDigest:true,signingKeyHistoryDigest:true}).parse({
  decisionId:d.id,decisionRevision:r.version,revisionDigest:reviewDigest(r.body),acceptanceId:a.id,ownerId:w.owner_user_id,binding:i.binding,purpose:i.purpose,
  intentDigest:reviewDigest(registration.record.signed.payload.intent),evidenceDigest:policy.evidenceDigest,ticketId:q.ticketId,
  ticketContentDigest:ticketContentDigest(registration.record.signed.payload),ticketEnvelopeDigest:i.ticketDigest,hostGeneration:i.hostGeneration,
  installationGeneration:i.installationGeneration,issuerRevision:i.issuerRevision,issuerHistoryDigest:i.issuerHistoryDigest,
  channelGrantId:grant.id,channelGrantRevision:grant.intent.snapshot.revision,channelGrantDigest:reviewDigest(grant),policyRevision:policy.revision,
  validFrom:policy.validFrom,expiresAt:policy.expiresAt});
 const attestations=rows(objects,'decision_attestations').map(row=>{
  const record=envelope.parse(row.record),p=record.payload,key=keyRows.find(k=>k.id===row.key_event_id);
  if(record.id!==row.id||row.decision_id!==d.id||row.workspace_id!==w.id||row.acceptance_id!==a.id||row.auth_evidence_id!==authRow?.id||
   row.authority_revision!==p.authorityRevision||row.record_digest!==attestationDigest('owner-decision-attestation-envelope-v1',record)||
   !key||key.record_digest!==p.signingKeyHistoryDigest||key.key_id!==p.signingKeyId||key.epoch!==p.signingKeyEpoch||key.revision!==p.signingKeyRevision||
   !history.some(e=>e.action==='attest'&&e.revision===p.authorityRevision&&e.source_row===row.id)||Date.parse(record.at)>Date.parse(clock.at))deny();
  return {row,record};});
 if(new Set(attestations.map(a=>a.record.payload.acceptanceId)).size!==attestations.length)deny();
 const ticketHistory=rows(objects,'worker_bootstrap_lifecycle_events').sort((a,b)=>Number(a.revision)-Number(b.revision));
 let ticketHead:z.infer<typeof lifecycleEvent>|null=null,ticketDigest:string|null=null;
 for(const row of ticketHistory){const h=lifecycleEvent.parse(row.record);
  if(row.id!==h.id||row.ticket_id!==q.ticketId||row.record_digest!==reviewDigest(h)||row.revision!==h.revision||
   !exact(h,{...advanceTicketLifecycle(i,ticketHead,ticketDigest,{id:h.id,action:h.action,attemptId:h.attemptId,historyId:h.historyId},new Date(h.at)),at:h.at}))deny();
  ticketHead=h;ticketDigest=reviewDigest(h);
 }
 if(!ticketHead)deny();
 const attempts=rows(objects,'worker_bootstrap_attempts');if(attempts.length>1||attempts.length!==(ticketHead!.attemptId?1:0))deny();
 for(const attempt of attempts){const seal=attempt.attestation_seal as any,att=attestations.find(a=>a.row.id===attempt.attestation_id);
  if(!att||attempt.id!==ticketHead!.attemptId||!seal||seal.attemptId!==attempt.id||seal.ticketId!==q.ticketId||seal.attestationId!==att.row.id||
   seal.attestationDigest!==att.row.record_digest||seal.authorityRevision!==att.record.payload.authorityRevision||!exact(seal.bindings,att.record.payload)||
   seal.state!=='started'||!sqlHash.safeParse(seal.sourceDigest).success||!positiveText.safeParse(seal.sourceFence).success||
   BigInt(seal.sourceFence)>BigInt(clock.fence)||!time.safeParse(attempt.attestation_committed_at).success)deny();
  const record=persistedBootstrapAttempt.parse(attempt.record),hrows=rows(objects,'worker_bootstrap_history').filter(h=>h.attempt_id===attempt.id).sort((a,b)=>Number(a.revision)-Number(b.revision));
  if(record.id!==attempt.id||record.ticketId!==q.ticketId||record.ticketDigest!==i.ticketDigest||!exact(record.binding,i.binding)||!exact(record.target,registration.record.signed.payload.intent.target)||
   attempt.record_digest!==reviewDigest(record)||attempt.generation!==i.generation||attempt.credential_epoch!==i.credentialEpoch||!hrows.length)deny();
  let prev:z.infer<typeof persistedBootstrapHistory>|undefined;
  for(const row of hrows){const h=persistedBootstrapHistory.parse(row.record);
   if(h.id!==row.id||h.attemptId!==attempt.id||h.revision!==(prev?.revision??0)+1||h.previousDigest!==(prev?reviewDigest(prev):null)||
    h.previousState!==(prev?.state??null)||h.state!==row.state||row.record_digest!==reviewDigest(h)||
    !rows(objects,'worker_bootstrap_audit').some(a=>a.history_id===h.id&&a.ticket_id===q.ticketId&&a.record_digest===row.record_digest))deny();prev=h;}
  const head=single(objects,'worker_bootstrap_heads');if(head.attempt_id!==attempt.id||head.history_id!==prev!.id||head.record_digest!==reviewDigest(prev)||head.state!==prev!.state||
   ticketHead!.historyId!==prev!.id||ticketHead!.state!==(prev!.state==='acknowledged'?'completed':prev!.state))deny();
 }
 if(i.predecessor){const predecessor=one(await db.$queryRaw<any[]>`SELECT t.ticket_digest AS digest,e.record_digest AS history,e.attempt_id AS attempt,
 e.record->>'state' AS state,t.generation,t.credential_epoch AS credential FROM worker_bootstrap_tickets t JOIN LATERAL (
 SELECT * FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id ORDER BY revision DESC LIMIT 1) e ON true
 WHERE t.id=${i.predecessor.ticketId}::uuid AND t.workspace_id=${i.binding.workspaceId}::uuid AND t.host_id=${i.binding.hostId}::uuid`);
  if(!exact(predecessor,{digest:i.predecessor.ticketDigest,history:i.predecessor.historyDigest,attempt:i.predecessor.attemptId,state:i.predecessor.state,
   generation:i.predecessor.generation,credential:i.predecessor.credentialEpoch}))deny();}
 const live=one(await db.$queryRaw<any[]>`SELECT decision_attestation_revision(${q.decisionId}::uuid)::text AS revision,
 decision_attestation_owner(${q.decisionId}::uuid,${a.id}::uuid) AS owner,
 bootstrap_lifecycle_current(${JSON.stringify(i)}::jsonb) AS current,
 NOT EXISTS(SELECT 1 FROM decision_authority_events e WHERE e.decision_id=${q.decisionId}::uuid AND NOT EXISTS(
 SELECT 1 FROM decision_attestation_write_receipts r WHERE r.table_name=e.source_table AND r.row_id=e.source_row AND r.row_digest=e.source_digest)) AS history,
 (clock_timestamp()>=${policy.validFrom}::timestamptz AND clock_timestamp()<${policy.expiresAt}::timestamptz) AS "policyCurrent",
 ARRAY(SELECT k.id::text FROM decision_attestation_key_history k WHERE k.workspace_id=${i.binding.workspaceId}::uuid
 AND k.installation_id=${i.binding.installationId}::uuid AND decision_attestation_key_current(k.id)) AS "currentKeys",
 (SELECT max(generation)=(${i.generation})::int AND max(credential_epoch)=(${i.credentialEpoch})::int FROM worker_bootstrap_tickets
 WHERE workspace_id=${i.binding.workspaceId}::uuid AND host_id=${i.binding.hostId}::uuid) AS generation`);
 const terminal=history.find(e=>['supersede','revoke','expire','reject'].includes(e.action));
 if(live.revision!==String(previous!.revision)||live.history!==true||!terminal&&live.owner!==true||live.generation!==true)deny();
 if((await attestationDbClock(db)).fence!==clock.fence)deny();
 const currentKeys=z.array(id).max(1000).parse(live.currentKeys);
 const eligibleKeys={...keyProjection,usable:keyProjection.usable.filter(k=>keys.some(e=>e.keyId===k.material.keyId&&e.material&&currentKeys.includes(e.id)))};
 const usable=!terminal&&live.current===true&&live.policyCurrent===true&&['issued','reserved','consumed'].includes(ticketHead!.state)&&
  !ticketHead!.revoked&&!ticketHead!.expired&&!ticketHead!.reconciled&&Date.parse(clock.at)>=Date.parse(policy.validFrom)&&Date.parse(clock.at)<Date.parse(policy.expiresAt);
 const version={authorityRevision:String(previous!.revision),fence:clock.fence,digest:reviewDigest({domain:'owner-decision-native-projection-v1',
  rows:objects.map(({table,rowId,digest,receiptId,eventId,fence})=>({table,rowId,digest,receiptId,eventId,fence}))})};
 return freezePublic({scope:q,clock,version,objects,ceremony,policy,registration,history,keys,keyProjection:eligibleKeys,auth,authId:authRow?.id as string|undefined,
  attestations,attempts,ticketHead:ticketHead!,ticketDigest:ticketDigest!,usable,terminal:terminal?.action??null});
}
export type NativeAttestationProjection=Awaited<ReturnType<typeof projectDecisionAttestation>>;
