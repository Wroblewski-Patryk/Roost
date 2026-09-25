import type {Prisma,PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {bootstrapOwnerTicket} from './worker-bootstrap-contract';
import {lifecycleRegistration} from './bootstrap-ticket-lifecycle-contract';
import {persistedSignedTransport} from './worker-transport-persistence-contract';
import {inspectCanonicalLifecycle} from './worker-identity-lifecycle-store';
import {inspectCanonicalIssuer} from './bootstrap-issuer-store';
import {readChannelRevocation,channelRevokeWitness,type ChannelRevokeWitness} from './bootstrap-channel-revocation-readback';
import {channelGuards,channelShapeHash} from './bootstrap-channel-guards';
import {recognizeV3Backend,v3Pinned} from './bootstrap-v3-catalog';
import {channelGrant,channelGrantIntent,channelTransition,channelEqual,channelSnapshotDigest,validateChannelGrant,validateV2ChannelPlan,advanceChannel,denyChannel,type ChannelGrant,type ChannelHead,type ChannelTransition} from './bootstrap-channel-persistence-contract';
type Db=Prisma.TransactionClient;
const id=z.string().uuid(),epoch=z.number().int().positive(),command=z.object({ticketId:id,decisionId:id,decisionRevision:epoch,operationId:id}).strict();
const transitionCommand=z.object({ticketId:id,operationId:id,expectedRevision:epoch,action:z.enum(['consume','revoke','unknown','close'])}).strict();
export class ChannelReconciliationRequired extends Error{readonly code='reconciliation_required';readonly deliveryUnknown=true;readonly retryable=false;constructor(){super('bootstrap_channel_reconciliation_required');}}
async function guarded(db:Db){
  const available=await db.$queryRaw<any[]>`SELECT to_regclass('public.worker_transport_bootstrap_grants') IS NOT NULL AND to_regclass('public.worker_transport_write_audit') IS NOT NULL AS channel_available`;
  if(available.length!==1||available[0].channel_available!==true)return false;
  const rows=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,
    encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,t.tgdeferrable AS deferred,
    (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal
     AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable AND n.nspname='public' AND pn.nspname='public'
     AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND p.prokind='f'
     AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL
     AND p.provolatile='v' AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
     AND current_setting('session_replication_role')='origin' AND current_setting('transaction_isolation') IN ('repeatable read','serializable')
     AND EXISTS(SELECT 1 FROM ready_source_fence WHERE id=1)) AS enabled
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=ANY(${channelGuards.map(g=>g.name)}::text[])`;
  const shape=await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
    (n.nspname='public' AND p.pronargs=1 AND p.proargtypes='3802'::oidvector AND p.prorettype='boolean'::regtype AND p.prokind='f'
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.provolatile='i' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u') AS enabled
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='transport_bootstrap_shape'`;
  const v3=await recognizeV3Backend(db,rows);
  return shape.length===1&&shape[0].enabled===true&&shape[0].hash===channelShapeHash&&rows.length===channelGuards.length&&channelGuards.every(g=>rows.filter(({enabled,...r})=>enabled===true&&channelEqual(v3Pinned(g,v3),r)).length===1);
}
async function fence(db:Db,write=false){
  const rows=write?await db.$queryRaw<any[]>`SELECT revision::text AS channel_fence FROM ready_source_fence WHERE id=1 FOR UPDATE`:
    await db.$queryRaw<any[]>`SELECT revision::text AS channel_fence FROM ready_source_fence WHERE id=1`;
  if(rows.length!==1||!/^\d+$/.test(rows[0].channel_fence))denyChannel();return rows[0].channel_fence as string;
}
async function ticket(db:Db,ticketId:string){
  const rows=await db.$queryRaw<any[]>`SELECT record->'signed'->'payload' AS channel_ticket,ticket_digest AS digest,record AS channel_record,to_jsonb(t)->'lifecycle_identity' AS channel_identity,
    (record->'signed'->'payload'->>'id'=id::text AND record->'signed'->'payload'->'intent'->'binding'->>'workspaceId'=workspace_id::text
     AND record->'signed'->'payload'->'intent'->'binding'->>'hostId'=host_id::text) AS verified FROM worker_bootstrap_tickets t WHERE id=${ticketId}::uuid`;
  if(rows.length!==1||rows[0].verified!==true||!/^[a-f0-9]{64}$/.test(rows[0].digest))denyChannel();
  if(rows[0].channel_ticket?.version==='worker-bootstrap-owner-ticket-v2'){
    const r=lifecycleRegistration.parse({operationId:ticketId,identity:rows[0].channel_identity,record:rows[0].channel_record});
    if(r.identity.ticketDigest!==rows[0].digest||!channelEqual(r.record.signed.payload,rows[0].channel_ticket))denyChannel();
    return {ticket:r.record.signed.payload,digest:rows[0].digest as string};
  }
  return {ticket:bootstrapOwnerTicket.parse(rows[0].channel_ticket),digest:rows[0].digest as string};
}
async function head(db:Db,workspaceId:string,hostId:string):Promise<ChannelHead|null>{
  const rows=await db.$queryRaw<any[]>`SELECT h.history_id AS id,h.revision,h.high_water_epoch AS "highWater",h.purpose,h.state,r.generation_id AS generation,r.current_pin AS pin,r.record,r.signature,
    w.fence_revision::text AS fence,(r.record_digest=h.record_digest AND a.record_digest=r.record_digest AND w.row_digest=encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex')
      AND (h.purpose IS NULL OR r.record_digest=encode(sha256(convert_to(r.record::text,'UTF8')),'hex'))) AS verified
    FROM worker_transport_heads h JOIN worker_transport_history r ON r.id=h.history_id LEFT JOIN worker_transport_audit a ON a.history_id=r.id
    LEFT JOIN worker_transport_write_audit w ON w.table_name='worker_transport_history' AND w.row_id=r.id::text AND w.writer_xid=r.writer_xid
    WHERE h.workspace_id=${workspaceId}::uuid AND h.host_id=${hostId}::uuid`;
  if(rows.length>1)denyChannel();if(!rows.length)return null;
  const h=z.object({id,revision:epoch,highWater:epoch,purpose:z.enum(['first_enrollment','owner_recovery']).nullable(),state:z.enum(['current','revoked']),
    generation:id,pin:z.string().regex(/^[a-f0-9]{64}$/),record:z.unknown(),fence:z.string().regex(/^\d+$/),verified:z.literal(true)}).passthrough().parse(rows[0]);
  if(h.purpose===null){
    // A legacy row lacking the new native audit is unavailable. A verified
    // ordinary row supplies only a spent high-water mark, never bootstrap authority.
    const r=persistedSignedTransport.parse({payload:h.record,signature:h.signature}).payload;
    if(r.identity.workspaceId!==workspaceId||r.identity.hostId!==hostId||r.revision!==h.revision||r.highWaterEpoch!==h.highWater||r.state!==h.state||r.profile.certificate.fingerprint!==h.pin)denyChannel();
  }else{const r=channelTransition.parse(h.record);if(r.id!==h.id||r.revision!==h.revision||r.state!==h.state)denyChannel();}
  return h as ChannelHead;
}
async function owner(db:Db,decisionId:string,workspaceId:string){
  const rows=await db.$queryRaw<any[]>`SELECT w.owner_user_id AS "ownerId",r.version AS revision,a.id AS "acceptanceId",r.body->'workerBootstrapChannel' AS intent,
   (d.status='accepted' AND decision_state(d.id)='accepted' AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL AND a.actor_credential_id IS NULL
    AND a.authority->>'status'='owner_reserved' AND a.created_at<=CURRENT_TIMESTAMP
    AND NOT r.body ?| ARRAY['authority','workerTransport','workerBootstrap','workerBootstrapIssuer','workerIdentityLifecycle','workerCredential']
    AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
    AND (SELECT count(*) FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.role::text='owner')=1
    AND EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.user_id=w.owner_user_id AND m.role::text='owner')) AS current
   FROM decisions d JOIN workspaces w ON w.id=d.workspace_id JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances a ON a.decision_id=d.id
   WHERE d.id=${decisionId}::uuid AND w.id=${workspaceId}::uuid LIMIT 2`;
  if(rows.length!==1)denyChannel();return z.object({ownerId:id,revision:epoch,acceptanceId:id,intent:channelGrantIntent,current:z.literal(true)}).strict().parse(rows[0]);
}
async function live(db:Db,g:ChannelGrant,now:Date){
  const s=g.intent.snapshot,b=s.binding,a=await owner(db,g.decisionId,b.workspaceId),t=await ticket(db,g.intent.ticketId);
  if(t.ticket.version==='worker-bootstrap-owner-ticket-v2')validateV2ChannelPlan(t.ticket,s,now);
  if(a.ownerId!==g.ownerId||a.revision!==g.decisionRevision||a.acceptanceId!==g.acceptanceId||!channelEqual(a.intent,g.intent)||t.digest!==g.intent.ticketDigest||t.ticket.ownerId!==g.ownerId||
    !channelEqual(t.ticket.intent.binding,b)||t.ticket.intent.purpose!==s.purpose||Date.parse(t.ticket.intent.expiresAt)<=now.getTime()||
    s.recordDigest!==channelSnapshotDigest(s)||Date.parse(s.validFrom)>now.getTime()||Date.parse(s.expiresAt)<=now.getTime()||s.cutoverAt&&now.getTime()>=Date.parse(s.cutoverAt))denyChannel();
  const l=await inspectCanonicalLifecycle(db,b),issuer=await inspectCanonicalIssuer(db,b,now,t.ticket.issuedAt);
  if(l.blockers.length||!l.facts||l.facts.hostGeneration!==s.hostGeneration||l.facts.installationGeneration!==s.installationGeneration||issuer.blockers.length||!issuer.facts)denyChannel();
  const ih=await db.$queryRaw<any[]>`SELECT revision,record_digest AS digest FROM bootstrap_issuer_history WHERE workspace_id=${b.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`;
  if(ih.length!==1||ih[0].revision!==s.issuerRevision||ih[0].digest!==s.issuerHistoryDigest)denyChannel();
  const credentials=await db.$queryRaw<any[]>`SELECT count(*)::int AS total,count(*) FILTER(WHERE active AND revoked_at IS NULL)::int AS active
    FROM api_keys WHERE workspace_id=${b.workspaceId}::uuid AND worker_host_id=${b.hostId}::uuid`;
  if(credentials.length!==1||credentials[0].active!==0||s.purpose==='first_enrollment'&&credentials[0].total!==0)denyChannel();
}
async function grantRow(db:Db,ticketId:string){
  const rows=await db.$queryRaw<any[]>`SELECT g.record AS channel_grant,(g.record_digest=encode(sha256(convert_to(g.record::text,'UTF8')),'hex')
    AND w.row_digest=encode(sha256(convert_to(to_jsonb(g)::text,'UTF8')),'hex') AND gen.credential_id IS NULL AND gen.purpose=g.purpose
    AND gen.identity=jsonb_build_object('binding',g.record->'intent'->'snapshot'->'binding','hostGeneration',g.record->'intent'->'snapshot'->'hostGeneration','installationGeneration',g.record->'intent'->'snapshot'->'installationGeneration')) AS verified
    FROM worker_transport_bootstrap_grants g JOIN worker_transport_generations gen ON gen.id=g.generation_id
    JOIN worker_transport_write_audit w ON w.table_name='worker_transport_bootstrap_grants' AND w.row_id=g.id::text
    WHERE g.ticket_id=${ticketId}::uuid LIMIT 2`;
  if(rows.length!==1||rows[0].verified!==true)denyChannel();return channelGrant.parse(rows[0].channel_grant);
}
async function boundV2(db:Db,ticketId:string){
 const proof=await db.$queryRaw<any[]>`SELECT (bootstrap_lifecycle_channel_bound(t.lifecycle_identity)
  AND bootstrap_lifecycle_current(t.lifecycle_identity) AND a.fence_revision=f.revision) AS v2_channel_bound
  FROM worker_bootstrap_tickets t JOIN LATERAL(SELECT * FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id ORDER BY revision DESC LIMIT 1) e ON true
  JOIN worker_bootstrap_write_receipts a ON a.table_name='worker_bootstrap_lifecycle_events' AND a.row_id=e.id::text AND a.writer_xid=e.writer_xid
  JOIN ready_source_fence f ON f.id=1 WHERE t.id=${ticketId}::uuid`;
 return proof.length===1&&proof[0].v2_channel_bound===true;
}
export type BootstrapV2ChannelBinding={qualification:'unapplied_ticket_channel_binding_v2';
 bind:(db:Db,registration:z.infer<typeof lifecycleRegistration>,now:Date)=>Promise<void>;
 inspect:(db:Db,registration:z.infer<typeof lifecycleRegistration>,now:Date)=>Promise<boolean>};
// Reuses the exact channel writer below; no client/transaction/default binder.
// This is an explicitly selected dependency of v2 ticket ingestion only.
export function createBootstrapV2ChannelBinding():BootstrapV2ChannelBinding{
 return Object.freeze({qualification:'unapplied_ticket_channel_binding_v2' as const,
  async bind(db:Db,value:z.infer<typeof lifecycleRegistration>,now:Date){
   const c=lifecycleRegistration.parse(value);await fence(db,true);if(!await guarded(db))denyChannel();
   const fresh=await db.$queryRaw<any[]>`SELECT EXISTS(SELECT 1 FROM worker_bootstrap_tickets t
    JOIN worker_bootstrap_write_receipts r ON r.ticket_id=t.id AND r.table_name='worker_bootstrap_tickets' AND r.row_id=t.id::text
    WHERE t.id=${c.identity.ticketId}::uuid AND r.writer_xid=pg_current_xact_id()::text
     AND r.row_digest=encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')
     AND current_setting('transaction_isolation')='serializable' AND current_setting('transaction_read_only')='off'
     AND NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id)) AS v2_issue_pending`;
   if(fresh.length!==1||fresh[0].v2_issue_pending!==true)denyChannel();
   const persisted=await ticket(db,c.identity.ticketId);
   if(!channelEqual(persisted.ticket,c.record.signed.payload)||persisted.digest!==c.identity.ticketDigest)denyChannel();
   const decisions=await db.$queryRaw<any[]>`SELECT d.id,r.version AS revision FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
    JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.workspace_id=${c.identity.binding.workspaceId}::uuid
     AND r.body->'workerBootstrapChannel'->>'ticketId'=${c.identity.ticketId} AND d.status='accepted' LIMIT 2`;
   if(decisions.length!==1)denyChannel();const d=z.object({id,revision:epoch}).strict().parse(decisions[0]);
   await grantInTransaction(db,{ticketId:c.identity.ticketId,decisionId:d.id,decisionRevision:d.revision,operationId:c.operationId},()=>now,true);
  },
  async inspect(db:Db,c:z.infer<typeof lifecycleRegistration>,now:Date){
   const result=await inspectCanonicalBootstrapChannel(db,c.identity.ticketId,now);
   return !!result.facts&&result.facts.ticketDigest===c.identity.ticketDigest;
  }
 });
}
export async function inspectCanonicalBootstrapChannel(db:Db,ticketId:string,now=new Date()){
  try{if(!id.safeParse(ticketId).success||!await guarded(db))denyChannel();const before=await fence(db),g=await grantRow(db,ticketId),b=g.intent.snapshot.binding,h=await head(db,b.workspaceId,b.hostId);
    if(!h||h.purpose!==g.intent.snapshot.purpose||h.generation!==g.intent.snapshot.generation)denyChannel();
    const t=await ticket(db,ticketId);
    if(t.ticket.version==='worker-bootstrap-owner-ticket-v2'){if(!await boundV2(db,ticketId))denyChannel();}
    else if(h!.fence!==before)denyChannel();
    const r=channelTransition.parse(h!.record);if(r.grantId!==g.id||r.action!=='grant'||r.state!=='current')denyChannel();await live(db,g,now);
    if(await fence(db)!==before)denyChannel();return {blockers:[] as string[],facts:{snapshot:g.intent.snapshot,grantId:g.id,ticketId,ticketDigest:g.intent.ticketDigest,revision:h!.revision}};
  }catch{return {blockers:['bootstrap_channel_authority_unavailable'],facts:null};}
}
async function append(db:Db,g:ChannelGrant,h:ChannelHead|null,r:ChannelTransition){
  const s=g.intent.snapshot;
  await db.$executeRaw`WITH v AS (SELECT ${JSON.stringify(r)}::jsonb AS r,${JSON.stringify(g)}::jsonb AS g)
   INSERT INTO worker_transport_history(id,workspace_id,host_id,generation_id,revision,record_digest,previous_revision,previous_digest,previous_high_water,previous_state,previous_generation_id,
    certificate_epoch,high_water_epoch,state,request_id,decision_id,decision_revision,decision_intent_digest,owner_id,current_pin,staged_pin,record,signature,purpose)
   SELECT (r->>'id')::uuid,${s.binding.workspaceId}::uuid,${s.binding.hostId}::uuid,${s.generation}::uuid,(r->>'revision')::int,${'0'.repeat(64)},
    ${h?.revision??null},${h?(await db.$queryRaw<any[]>`SELECT record_digest AS digest FROM worker_transport_history WHERE id=${h.id}::uuid`)[0]?.digest:null},${h?.highWater??null},${h?.state??null},${h?.generation??null}::uuid,
    ${s.certificateEpoch},${s.highWaterEpoch},r->>'state',(r->>'id')::uuid,${r.action==='grant'?g.decisionId:null}::uuid,${g.decisionRevision},${reviewDigest(g.intent)},${g.ownerId}::uuid,${s.leafPin},NULL,r,NULL,${s.purpose} FROM v`;
}
async function grantInTransaction(db:Db,input:unknown,clock:()=>Date,v2=false){
  const c=command.parse(input),t=await ticket(db,c.ticketId),b=t.ticket.intent.binding,a=await owner(db,c.decisionId,b.workspaceId);
  if((t.ticket.version==='worker-bootstrap-owner-ticket-v2')!==v2)denyChannel();
  if(a.revision!==c.decisionRevision||a.intent.ticketId!==c.ticketId)denyChannel();const h=await head(db,b.workspaceId,b.hostId);
  const used=await db.$queryRaw<any[]>`SELECT generation_id AS generation,current_pin AS pin,staged_pin AS staged FROM worker_transport_history WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid ORDER BY revision LIMIT 1001`;
  if(used.length>1000)denyChannel();const i=validateChannelGrant(a.intent,t.ticket,t.digest,a.ownerId,h,{generations:used.map(r=>r.generation),pins:used.flatMap(r=>[r.pin,r.staged].filter(Boolean))},clock());
  const g=channelGrant.parse({id:c.operationId,intent:i,ownerId:a.ownerId,decisionId:c.decisionId,decisionRevision:c.decisionRevision,acceptanceId:a.acceptanceId,at:clock().toISOString()});await live(db,g,clock());
  const s=i.snapshot,identity={binding:s.binding,hostGeneration:s.hostGeneration,installationGeneration:s.installationGeneration};
  await db.$executeRaw`INSERT INTO worker_transport_generations(id,workspace_id,host_id,installation_id,credential_id,identity,identity_digest,purpose)
   VALUES(${s.generation}::uuid,${b.workspaceId}::uuid,${b.hostId}::uuid,${b.installationId}::uuid,NULL,${JSON.stringify(identity)}::jsonb,${reviewDigest(identity)},${s.purpose})`;
  await db.$executeRaw`INSERT INTO worker_transport_bootstrap_grants(id,generation_id,purpose,ticket_id,decision_id,acceptance_id,record,record_digest)
   VALUES(${g.id}::uuid,${s.generation}::uuid,${s.purpose},${c.ticketId}::uuid,${c.decisionId}::uuid,${g.acceptanceId}::uuid,${JSON.stringify(g)}::jsonb,${'0'.repeat(64)})`;
  const r=advanceChannel(g,h,'grant',c.operationId,clock());await append(db,g,h,r);return r;
}
// Explicit factory only. No signer, exchange, credential issuance or routes.
export function createPrismaBootstrapChannelStore(client:Pick<PrismaClient,'$transaction'>,clock=()=>new Date()){
  async function write(work:(db:Db)=>Promise<ChannelTransition>){let completed=false,writeEntered=false;let observed:ChannelTransition|undefined,witness:ChannelRevokeWitness|undefined;
    try{const r=await client.$transaction(async db=>{if(writeEntered)denyChannel();writeEntered=true;const fromFence=await fence(db,true);if(!await guarded(db))denyChannel();
      const r=await work(db);completed=true;observed=r;
      if(r.action==='revoke'){
        const rows=await db.$queryRaw<any[]>`SELECT pg_current_xact_id()::text AS "writerXid",revision::text AS "toFence" FROM ready_source_fence WHERE id=1 /* channel_revoke_witness */`;
        if(rows.length!==1)denyChannel();witness=channelRevokeWitness.parse({...rows[0],fromFence});
      }return r;},{isolationLevel:'Serializable',timeout:10000,maxWait:2000});
      if(!observed||!channelEqual(r,observed))denyChannel();
      let entered=false,confirmed=false;
      await client.$transaction(async db=>{if(entered)denyChannel();entered=true;await db.$executeRaw`SET TRANSACTION READ ONLY`;if(!await guarded(db))denyChannel();
        if(r.action==='revoke'){if(!witness)denyChannel();await readChannelRevocation(db,r,witness);confirmed=true;return;}
        const proof=await db.$queryRaw<any[]>`SELECT (h.record=${JSON.stringify(r)}::jsonb AND a.record_digest=h.record_digest AND h.record_digest=encode(sha256(convert_to(h.record::text,'UTF8')),'hex')
         AND w.row_digest=encode(sha256(convert_to(to_jsonb(h)::text,'UTF8')),'hex') AND w.fence_revision=f.revision) AS channel_confirmed
         FROM worker_transport_history h JOIN worker_transport_audit a ON a.history_id=h.id JOIN worker_transport_heads head ON head.history_id=h.id
         JOIN worker_transport_write_audit w ON w.table_name='worker_transport_history' AND w.row_id=h.id::text AND w.writer_xid=h.writer_xid JOIN ready_source_fence f ON f.id=1 WHERE h.id=${r.id}::uuid`;
        if(proof.length!==1||proof[0].channel_confirmed!==true)denyChannel();confirmed=true;
      },{isolationLevel:'RepeatableRead',timeout:10000,maxWait:2000});if(!confirmed)denyChannel();return r;
    }catch{if(completed)throw new ChannelReconciliationRequired();return denyChannel();}
  }
  return Object.freeze({
    // Explicit reconciliation is SELECT-only and requires the entire exact
    // operation record. It never retries transition(), refreshes a witness or repairs.
    reconcileRevocation:async(input:unknown)=>{
      try{const r=channelTransition.parse(input);if(r.action!=='revoke'||r.state!=='revoked')denyChannel();
        let entered=false,observed:ChannelTransition|undefined;
        const result=await client.$transaction(async db=>{if(entered)denyChannel();entered=true;await db.$executeRaw`SET TRANSACTION READ ONLY`;
          if(!await guarded(db))denyChannel();observed=(await readChannelRevocation(db,r)).record;return observed;
        },{isolationLevel:'RepeatableRead',timeout:10000,maxWait:2000});
        if(!observed||!channelEqual(result,observed))denyChannel();return observed!;
      }catch{throw new ChannelReconciliationRequired();}
    },
    inspect:(ticketId:string)=>client.$transaction(async db=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;return inspectCanonicalBootstrapChannel(db,ticketId,clock());},{isolationLevel:'RepeatableRead',timeout:10000,maxWait:2000}),
    grant:(input:unknown)=>write(db=>grantInTransaction(db,input,clock)),
    transition:(input:unknown)=>write(async db=>{const c=transitionCommand.parse(input),g=await grantRow(db,c.ticketId),b=g.intent.snapshot.binding,h=await head(db,b.workspaceId,b.hostId);
      if(!h||h.revision!==c.expectedRevision)denyChannel();let action:ChannelTransition['action']=c.action;
      if(['consume','close'].includes(action)){try{if(h!.fence!==await fence(db))denyChannel();await live(db,g,clock());}catch{if(action==='close')action='unknown';else denyChannel();}}
      const r=advanceChannel(g,h,action,c.operationId,clock());await append(db,g,h,r);return r;
    })
  });
}
