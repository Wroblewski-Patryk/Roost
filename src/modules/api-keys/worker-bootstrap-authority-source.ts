import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { bootstrapBinding,workerBootstrapIntent } from "./worker-bootstrap-contract";
import { transportProfile } from "./worker-transport-contract";
import type { BootstrapAuthoritySource } from "./worker-bootstrap-store";
import { inspectCanonicalLifecycle } from "./worker-identity-lifecycle-store";
import { lifecycleMissing } from "./worker-identity-lifecycle";
import { inspectCanonicalIssuer } from "./bootstrap-issuer-store";
import { issuerGaps } from "./bootstrap-issuer-contract";
import { inspectCanonicalBootstrapChannel } from './bootstrap-channel-store';
import { bootstrapChannelGap } from "./bootstrap-channel-contract";
import {readCanonicalTicketRevocation,invalidTicketRevocation,type TicketRevocationVerifier,type TicketRevocationRead} from './bootstrap-ticket-revocation-reader';
import { bootstrapTicketRevocationGap } from './bootstrap-ticket-revocation-contract';
import {signedDecisionGap} from './bootstrap-signed-decision-contract';

type Db=Prisma.TransactionClient;
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe();
const time=z.union([z.date(),z.string().datetime()]).transform(v=>new Date(v).toISOString());
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export const bootstrapAuthorityGaps=["host_epoch_unavailable","host_revocation_history_unavailable","installation_epoch_unavailable","installation_revocation_unavailable",
  "issuer_public_key_unavailable","bootstrap_channel_authority_unavailable","bootstrap_ticket_revocation_unavailable","signed_current_decision_unavailable","issuer_writer_fence_unproven"] as const;
export class CanonicalBootstrapBlocked extends Error{
  constructor(public readonly blockers:readonly string[]){super("canonical_bootstrap_authority_blocked");}
}
const blocked=(...codes:string[]):never=>{throw new CanonicalBootstrapBlocked(Object.freeze([...new Set(codes)].sort()));};
const request=z.object({binding:bootstrapBinding,decisionId:id,purpose:z.enum(["first_enrollment","owner_recovery","ordinary"]),ticketId:id.optional(),issuedAt:z.string().datetime().optional()}).strict();
const ownerRow=z.object({id,ownerId:id}).strict(),memberRow=z.object({userId:id}).strict();
const hostRow=z.object({id,workspaceId:id,status:z.enum(["online","offline","disabled"])}).strict();
const issuerRow=z.object({workspaceId:id,installationId:id,keyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),epoch,publicKeyDigest:hash}).strict();
const credentialRow=z.object({id,workspaceId:id,hostId:id,installationId:id,version:epoch,epoch,fingerprint:hash.nullable(),active:z.boolean(),revokedAt:time.nullable(),expiresAt:time.nullable(),
  scopeValid:z.boolean(),unbound:z.boolean(),modern:z.boolean(),activeCount:z.number().int().nonnegative(),total:z.number().int().positive()}).strict();
const handoffRow=z.object({id,workspaceId:id,hostId:id,installationId:id,hostFingerprint:hash,credentialId:id.nullable(),state:z.enum(["requested","approved","awaiting_ack","acknowledged","delivery_unknown","revoked","expired","locked"]),acknowledgedAt:time.nullable()}).strict();
const decisionRow=z.object({id,workspaceId:id,revision:epoch,state:z.string(),actorUserId:id.nullable(),actorAgentId:id.nullable(),actorCredentialId:id.nullable(),authority:z.string().nullable(),
  acceptedAt:time,conflicting:z.boolean(),superseded:z.boolean(),intent:workerBootstrapIntent}).strict();
const channelRow=z.object({revision:epoch,recordDigest:hash,certificateEpoch:epoch,highWaterEpoch:epoch,state:z.enum(["current","revoked"]),expiresAt:time,
  installationId:id,hostId:id,hostFingerprint:hash,keyId:z.string(),keyEpoch:epoch,keyDigest:hash,credentialId:id,credentialEpoch:epoch,credentialVersion:epoch,credentialFingerprint:hash,
  profile:transportProfile,cutoverAt:time.nullable()}).strict();
const ticketRow=z.object({id,workspaceId:id,hostId:id,ownerId:id,decisionId:id,requestId:id,bindingDigest:hash,ticketDigest:hash,expiresAt:time,issuedAt:time.optional()}).strict();
const flags={transportQualified:false,implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false,launchAuthority:false} as const;

// Only projections of existing canonical records. No tables, seeds, signer,
// secret material, credentials, independent truth store or production factory.
export function createCanonicalBootstrapAuthoritySource(clock=()=>new Date(),ticketVerifier?:TicketRevocationVerifier){
  const sessions=new WeakMap<object,{mode:"read"|"write";fence:string}>();
  async function fence(db:Db){
    const rows=await db.$queryRaw<any[]>`SELECT revision::text AS revision,current_setting('transaction_isolation') AS isolation,current_setting('transaction_read_only') AS readonly FROM ready_source_fence WHERE id=1`;
    if(rows.length!==1||!/^\d+$/.test(rows[0].revision))blocked("transaction_fence_missing");return rows[0];
  }
  async function bound(db:Db){
    const s=sessions.get(db);if(!s)blocked("transaction_unbound");const f=await fence(db);
    if(f.revision!==s!.fence||f.isolation!==(s!.mode==="read"?"repeatable read":"serializable")||f.readonly!==(s!.mode==="read"?"on":"off"))blocked("transaction_changed");
    return s!;
  }
  async function inspectTicketRevocation(db:Db,input:unknown){
    const s=await bound(db),result=await readCanonicalTicketRevocation(db,input,s.fence,ticketVerifier,clock);await bound(db);return result;
  }
  async function inspect(db:Db,input:unknown){
    const blockers:string[]=[...bootstrapAuthorityGaps];
    let ticketRevocationAuthority:TicketRevocationRead|typeof bootstrapTicketRevocationGap=bootstrapTicketRevocationGap;
    let channelAuthority:{available:boolean;qualification:string;blocker?:string;reasons?:readonly string[];facts?:unknown}=bootstrapChannelGap;
    // Public, bounded diagnostics only; values are populated from parsed SELECTs.
    const facts:{ownerId?:string;hostStatus?:string;issuer?:z.infer<typeof issuerRow>;credential?:{id:string;version:number;epoch:number;fingerprint:string|null;state:string;expiresAt:string|null};
      credentialHighWater?:number;credentialAbsent?:boolean;handoff?:{id:string;state:string;hostFingerprint:string};
      decision?:{id:string;revision:number;ownerId:string;intentDigest:string;expiresAt:string};channel?:{revision:number;certificateEpoch:number;highWaterEpoch:number;recordDigest:string;profileDigest:string;state:string;validUntil:string};
      ticket?:{id:string;digest:string;expiresAt:string;issuedAt?:string};issuerPublic?:NonNullable<Awaited<ReturnType<typeof inspectCanonicalIssuer>>['facts']>;fenceRevision?:string;lifecycle?:NonNullable<Awaited<ReturnType<typeof inspectCanonicalLifecycle>>['facts']>}={};
    try{
      const scoped=await bound(db),q=request.parse(input),b=q.binding;facts.fenceRevision=scoped.fence;
      const lifecycle=await inspectCanonicalLifecycle(db,b);
      for(const code of lifecycleMissing)if(!lifecycle.blockers.includes(code))blockers.splice(blockers.indexOf(code),1);
      blockers.push(...lifecycle.blockers);if(lifecycle.facts)facts.lifecycle=lifecycle.facts;
      const owners=await db.$queryRaw<any[]>`SELECT id,owner_user_id AS "ownerId" FROM workspaces WHERE id=${b.workspaceId}::uuid LIMIT 2`;
      const members=await db.$queryRaw<any[]>`SELECT user_id AS "userId" FROM workspace_memberships WHERE workspace_id=${b.workspaceId}::uuid AND role::text='owner' LIMIT 2`;
      const o=owners.length===1?ownerRow.safeParse(owners[0]):null;
      const m=z.array(memberRow).safeParse(members);
      if(!o?.success)blockers.push("workspace_owner_missing");
      else if(!m.success||members.length!==1||m.data[0].userId!==o.data.ownerId)blockers.push(members.length>1?"owner_ambiguous":"primary_owner_membership_missing");
      else facts.ownerId=o.data.ownerId;
      const hosts=await db.$queryRaw<any[]>`SELECT id,workspace_id AS "workspaceId",status::text AS status FROM agent_hosts WHERE id=${b.hostId}::uuid AND workspace_id=${b.workspaceId}::uuid LIMIT 2`;
      const h=hosts.length===1?hostRow.safeParse(hosts[0]):null;
      if(!h?.success||h.data.id!==b.hostId||h.data.workspaceId!==b.workspaceId)blockers.push("host_missing");
      else{facts.hostStatus=h.data.status;if(h.data.status==="disabled")blockers.push("host_disabled");}
      const keys=await db.$queryRaw<any[]>`SELECT workspace_id AS "workspaceId",installation_id AS "installationId",key_id AS "keyId",epoch,public_key_digest AS "publicKeyDigest" FROM trusted_provider_ticket_keys WHERE workspace_id=${b.workspaceId}::uuid LIMIT 2`;
      const k=keys.length===1?issuerRow.safeParse(keys[0]):null;
      if(!k?.success)blockers.push("issuer_missing_or_ambiguous");
      else{facts.issuer=k.data;if(k.data.workspaceId!==b.workspaceId||k.data.installationId!==b.installationId||k.data.keyId!==b.ticketKeyId||k.data.epoch!==b.ticketKeyEpoch||k.data.publicKeyDigest!==b.ticketPublicKeyDigest)blockers.push("issuer_binding_mismatch");}
      // The verifier hash never leaves SQL. This is the existing canonical
      // workerTicketFingerprint derivation, already used by lifecycle SQL guards.
      const credentials=await db.$queryRaw<any[]>`SELECT id,workspace_id AS "workspaceId",worker_host_id AS "hostId",worker_installation_id AS "installationId",credential_version AS version,worker_binding_epoch AS epoch,
        encode(sha256(convert_to('roost-worker-ticket-v1:'||key_hash,'UTF8')),'hex') AS fingerprint,active,revoked_at AS "revokedAt",expires_at AS "expiresAt",
        (scopes='["agent-runtime:claim"]'::jsonb) AS "scopeValid",(bound_agent_id IS NULL) AS unbound,(key IS NULL AND key_hash IS NOT NULL) AS modern,
        (count(*) FILTER (WHERE active AND revoked_at IS NULL) OVER ())::int AS "activeCount",(count(*) OVER ())::int AS total
        FROM api_keys WHERE workspace_id=${b.workspaceId}::uuid AND worker_host_id=${b.hostId}::uuid ORDER BY worker_binding_epoch DESC NULLS FIRST,id LIMIT 2`;
      const parsedCredentials=z.array(credentialRow).safeParse(credentials);
      let current:z.infer<typeof credentialRow>|undefined;
      if(!parsedCredentials.success)blockers.push("credential_invalid");
      else if(!credentials.length){facts.credentialAbsent=true;facts.credentialHighWater=0;if(q.purpose!=="first_enrollment")blockers.push("credential_required");}
      else{
        current=parsedCredentials.data[0];facts.credentialAbsent=false;facts.credentialHighWater=current.epoch;
        if(current.activeCount>1||parsedCredentials.data[1]?.epoch===current.epoch||current.total<credentials.length)blockers.push("credential_ambiguous");
        if(current.workspaceId!==b.workspaceId||current.hostId!==b.hostId||current.installationId!==b.installationId||!current.scopeValid||!current.unbound||!current.modern||!current.fingerprint)blockers.push("credential_binding_mismatch");
        const state=current.revokedAt?"revoked":!current.expiresAt||Date.parse(current.expiresAt)<=clock().getTime()?"expired":current.active?"active":"pending";
        facts.credential={id:current.id,version:current.version,epoch:current.epoch,fingerprint:current.fingerprint,state,expiresAt:current.expiresAt};
        if(q.purpose==="first_enrollment")blockers.push("credential_history_conflicts_with_first");
        if(q.purpose==="ordinary"&&state!=="active")blockers.push("ordinary_active_credential_required");
        if(q.purpose==="owner_recovery"&&state==="active")blockers.push("recovery_active_credential_denied");
        if(current.activeCount>0&&state!=="active")blockers.push("credential_stale_active_generation");
      }
      const handoffs=await db.$queryRaw<any[]>`SELECT id,workspace_id AS "workspaceId",installation_id AS "installationId",host_id AS "hostId",host_fingerprint AS "hostFingerprint",
        credential_id AS "credentialId",state,acknowledged_at AS "acknowledgedAt" FROM worker_credential_handoffs WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid AND credential_id=${current?.id??null}::uuid LIMIT 2`;
      const hh=handoffs.length===1?handoffRow.safeParse(handoffs[0]):null;
      if(current){
        if(!hh?.success)blockers.push("handoff_missing_or_ambiguous");
        else{facts.handoff={id:hh.data.id,state:hh.data.state,hostFingerprint:hh.data.hostFingerprint};
          if(hh.data.workspaceId!==b.workspaceId||hh.data.hostId!==b.hostId||hh.data.installationId!==b.installationId||hh.data.credentialId!==current.id||hh.data.hostFingerprint!==b.hostFingerprint)blockers.push("handoff_binding_mismatch");
          if(current.active&&(hh.data.state!=="acknowledged"||!hh.data.acknowledgedAt))blockers.push("credential_ack_missing");}
      }else blockers.push("host_fingerprint_anchor_unavailable");
      const decisions=await db.$queryRaw<any[]>`SELECT d.id,d.workspace_id AS "workspaceId",r.version AS revision,decision_state(d.id) AS state,a.actor_user_id AS "actorUserId",a.actor_agent_id AS "actorAgentId",a.actor_credential_id AS "actorCredentialId",
        a.authority->>'status' AS authority,a.created_at AS "acceptedAt",r.body->'workerBootstrap' AS intent,
        (r.body ? 'authority' OR r.body ? 'workerCredential' OR r.body ? 'workerTransport') AS conflicting,
        EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id) AS superseded
        FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id AND r.workspace_id=d.workspace_id JOIN decision_acceptances a ON a.decision_id=d.id AND a.workspace_id=d.workspace_id
        WHERE d.id=${q.decisionId}::uuid AND d.workspace_id=${b.workspaceId}::uuid AND d.status='accepted' LIMIT 2`;
      const d=decisions.length===1?decisionRow.safeParse(decisions[0]):null;
      if(!d?.success)blockers.push("decision_missing_or_invalid");
      else if(d.data.workspaceId!==b.workspaceId||d.data.id!==q.decisionId||d.data.state!=="accepted"||d.data.authority!=="owner_reserved"||d.data.actorUserId!==facts.ownerId||d.data.actorAgentId||d.data.actorCredentialId||d.data.conflicting||d.data.superseded||
        !same(d.data.intent.binding,b)||d.data.intent.purpose!==q.purpose||Date.parse(d.data.acceptedAt)>clock().getTime()||Date.parse(d.data.intent.expiresAt)<=clock().getTime())blockers.push("decision_not_current_owner_authority");
      else facts.decision={id:d.data.id,revision:d.data.revision,ownerId:d.data.actorUserId!,intentDigest:reviewDigest(d.data.intent),expiresAt:d.data.intent.expiresAt};
      const channels=await db.$queryRaw<any[]>`SELECT h.revision,h.record_digest AS "recordDigest",h.certificate_epoch AS "certificateEpoch",h.high_water_epoch AS "highWaterEpoch",h.state,
        r.record->>'expiresAt' AS "expiresAt",r.record->'identity'->>'installationId' AS "installationId",r.record->'identity'->>'hostId' AS "hostId",r.record->'identity'->>'hostFingerprint' AS "hostFingerprint",
        r.record->'identity'->>'ticketKeyId' AS "keyId",(r.record->'identity'->>'ticketKeyEpoch')::int AS "keyEpoch",r.record->'identity'->>'ticketPublicKeyDigest' AS "keyDigest",
        r.record->'identity'->>'credentialId' AS "credentialId",(r.record->'identity'->>'credentialEpoch')::int AS "credentialEpoch",(r.record->'identity'->>'credentialVersion')::int AS "credentialVersion",r.record->'identity'->>'credentialFingerprint' AS "credentialFingerprint",
        r.record->'profile' AS profile,r.record->'staged'->>'cutoverAt' AS "cutoverAt"
        FROM worker_transport_heads h JOIN worker_transport_history r ON r.id=h.history_id WHERE h.workspace_id=${b.workspaceId}::uuid AND h.host_id=${b.hostId}::uuid LIMIT 2`;
      const ch=channels.length===1?channelRow.safeParse(channels[0]):null;
      if(!ch?.success)blockers.push("normal_channel_missing_or_invalid");
      else{
        const c=ch.data,validUntil=c.cutoverAt&&c.cutoverAt<c.expiresAt?c.cutoverAt:c.expiresAt;
        facts.channel={revision:c.revision,certificateEpoch:c.certificateEpoch,highWaterEpoch:c.highWaterEpoch,recordDigest:c.recordDigest,profileDigest:reviewDigest(c.profile),state:c.state,validUntil};
        if(c.state!=="current"||c.highWaterEpoch<c.certificateEpoch||Date.parse(validUntil)<=clock().getTime())blockers.push("normal_channel_revoked_or_expired");
        if(c.installationId!==b.installationId||c.hostId!==b.hostId||c.hostFingerprint!==b.hostFingerprint||c.keyId!==b.ticketKeyId||c.keyEpoch!==b.ticketKeyEpoch||c.keyDigest!==b.ticketPublicKeyDigest||
          !current||c.credentialId!==current.id||c.credentialEpoch!==current.epoch||c.credentialVersion!==current.version||c.credentialFingerprint!==current.fingerprint||
          d?.success&&(!same(c.profile,d.data.intent.channel.profile)||c.certificateEpoch!==d.data.intent.channel.certificateEpoch||c.highWaterEpoch!==d.data.intent.channel.highWaterEpoch||c.revision!==d.data.intent.channel.revision))blockers.push("normal_channel_binding_mismatch");
      }
      if(q.ticketId){const tickets=await db.$queryRaw<any[]>`SELECT id,workspace_id AS "workspaceId",host_id AS "hostId",owner_id AS "ownerId",decision_id AS "decisionId",request_id AS "requestId",binding_digest AS "bindingDigest",ticket_digest AS "ticketDigest",expires_at AS "expiresAt",record->'signed'->'payload'->>'issuedAt' AS "issuedAt" FROM worker_bootstrap_tickets WHERE id=${q.ticketId}::uuid LIMIT 2`;
        const tk=tickets.length===1?ticketRow.safeParse(tickets[0]):null;
        if(!tk?.success)blockers.push("bootstrap_ticket_missing");
        else{facts.ticket={id:tk.data.id,digest:tk.data.ticketDigest,expiresAt:tk.data.expiresAt,issuedAt:tk.data.issuedAt};
          if(tk.data.id!==q.ticketId||tk.data.workspaceId!==b.workspaceId||tk.data.hostId!==b.hostId||tk.data.ownerId!==facts.ownerId||tk.data.decisionId!==q.decisionId||tk.data.bindingDigest!==reviewDigest(b))blockers.push("bootstrap_ticket_binding_mismatch");
          if(Date.parse(tk.data.expiresAt)<=clock().getTime())blockers.push("bootstrap_ticket_expired");}
      }
      const issueTime=q.ticketId?facts.ticket?.issuedAt:q.issuedAt??clock().toISOString();
      if(issueTime){const issuer=await inspectCanonicalIssuer(db,b,clock(),issueTime);
        if(issuer.facts){facts.issuerPublic=issuer.facts;
          for(const gap of issuerGaps)blockers.splice(blockers.indexOf(gap),1);
          // During bounded overlap the canonical head is the reserved high-water,
          // while the audited selected generation may be its predecessor.
          const mismatch=blockers.indexOf('issuer_binding_mismatch');if(mismatch>=0)blockers.splice(mismatch,1);
        }
      }
      if(q.ticketId){const channel=await inspectCanonicalBootstrapChannel(db,q.ticketId,clock());
        if(channel.facts&&same(channel.facts.snapshot.binding,b)&&channel.facts.snapshot.purpose===q.purpose){
          blockers.splice(blockers.indexOf('bootstrap_channel_authority_unavailable'),1);channelAuthority={available:true,qualification:'canonical_bootstrap_channel_v1',facts:channel.facts};
        }
      }
      if(q.ticketId&&ticketVerifier){
        const proof=await inspectTicketRevocation(db,{ticketId:q.ticketId});ticketRevocationAuthority=proof;
        if(proof.ok&&same(proof.identity.binding,b)&&proof.identity.ownerId===facts.ownerId&&proof.identity.decisionId===q.decisionId&&proof.identity.purpose===q.purpose){
          blockers.splice(blockers.indexOf('bootstrap_ticket_revocation_unavailable'),1);
          if(proof.revoked)blockers.push(proof.reconciliationRequired?'bootstrap_ticket_reconciliation_required':`bootstrap_ticket_${proof.state}`);
        }else ticketRevocationAuthority=invalidTicketRevocation();
      }
      await bound(db); // A changed or rebound fence invalidates the entire projection.
    }catch(e){ticketRevocationAuthority=bootstrapTicketRevocationGap;channelAuthority=bootstrapChannelGap;for(const key of Object.keys(facts))delete (facts as Record<string,unknown>)[key];blockers.push(...bootstrapAuthorityGaps,...(e instanceof CanonicalBootstrapBlocked?e.blockers:["canonical_source_invalid"]));}
    return {ok:false as const,qualification:"canonical_projection_only_v1" as const,blockers:[...new Set(blockers)].sort(),channelAuthority,ticketRevocationAuthority,decisionAuthority:signedDecisionGap,facts,...flags};
  }
  const source:BootstrapAuthoritySource={qualification:"canonical_bootstrap_projection_v1",
    async bindTransaction(db,mode){if(sessions.has(db))blocked("transaction_already_bound");const f=await fence(db);
      if(f.isolation!==(mode==="read"?"repeatable read":"serializable")||f.readonly!==(mode==="read"?"on":"off"))blocked("transaction_mode_invalid");
      const session={mode,fence:f.revision};sessions.set(db,session);return ()=>{if(sessions.get(db)===session)sessions.delete(db);};},
    async context(db,binding,issuedAt,ticketId){await bound(db);const lifecycle=await inspectCanonicalLifecycle(db,binding);
      const issuer=issuedAt?await inspectCanonicalIssuer(db,binding,clock(),issuedAt):{blockers:[...issuerGaps]};
      const channel=ticketId?await inspectCanonicalBootstrapChannel(db,ticketId,clock()):null;
      const ticket=ticketId&&ticketVerifier?await inspectTicketRevocation(db,{ticketId}):null;await bound(db);
      return blocked(...bootstrapAuthorityGaps.filter(code=>!lifecycleMissing.some(m=>m===code)&&!issuerGaps.some(m=>m===code)&&!(code==='bootstrap_channel_authority_unavailable'&&channel?.facts&&same(channel.facts.snapshot.binding,binding))&&!(code==='bootstrap_ticket_revocation_unavailable'&&ticket?.ok&&ticket.admissible&&same(ticket.identity.binding,binding)&&ticket.identity.issuedAt===issuedAt)),...lifecycle.blockers,...issuer.blockers);},
    async decision(db,id){await bound(db);if(!z.string().uuid().safeParse(id).success)blocked("decision_missing_or_invalid");return blocked("signed_current_decision_unavailable");},
    async ticketRevoked(db,id){await bound(db);if(!z.string().uuid().safeParse(id).success)blocked("bootstrap_ticket_missing");const proof=await inspectTicketRevocation(db,{ticketId:id});if(!proof.ok)return blocked("bootstrap_ticket_revocation_unavailable");return proof.revoked;}
  };
  return Object.freeze({...source,inspect,inspectTicketRevocation});
}
