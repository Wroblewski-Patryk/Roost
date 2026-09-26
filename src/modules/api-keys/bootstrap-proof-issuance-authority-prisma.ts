import {z} from 'zod';
import {proofDigest} from './bootstrap-proof-encoding';
import {denyProof,proofEqual} from './bootstrap-proof-key-contract';
import {proofAuthorityAttachment} from './bootstrap-proof-authority-contract';
import {v3Authority,v3Intent,v3Issuer,type V3Authority} from './bootstrap-proof-issuance-contract';
import {bootstrapChannelSnapshot} from './bootstrap-channel-contract';
import {issuerMaterial} from './bootstrap-issuer-contract';
import {readCanonicalProofAuthority} from './bootstrap-proof-persistence';
import {requireV3BackendCatalog} from './bootstrap-v3-catalog';
import {projectionSetDigest,projectionRow} from './bootstrap-proof-projection';
import {one,type AttestationDb as Db} from './decision-attestation-sql';
import {freezePublic} from './worker-transport-snapshot';
import type {V3AuthorityPort} from './bootstrap-proof-issuance';

const id=z.string().uuid();
const iso=(value:string)=>new Date(value).toISOString();
function required<T>(rows:T[]):T {return one(rows);}

// The caller supplies the existing Prisma transaction. No default client,
// credential, private key, signer, network operation or source repair exists here.
export function createPrismaV3AuthorityPort():V3AuthorityPort {
 return Object.freeze({qualification:'injected_canonical_proof_issuance_authority_v3' as const,
  async read(db:Db,attachmentId:string,operationId:string|null):Promise<V3Authority>{
   id.parse(attachmentId);if(operationId!==null)id.parse(operationId);
   await requireV3BackendCatalog(db);
   const [clock]=await db.$queryRaw<Array<{fence:string;xid:string;at:string;mode:string}>>`
    SELECT bootstrap_v3_mode(current_setting('transaction_read_only')='off')::text AS fence,
      pg_current_xact_id()::text AS xid,
      to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at,
      current_setting('transaction_read_only') AS mode`;
   if(!clock)denyProof();
   if(operationId!==null){
    const operation=required(await db.$queryRaw<Array<{attachment_id:string;writer_xid:string;plan:unknown;phase:string|null}>>`
     SELECT o.attachment_id,o.writer_xid,o.plan,
      (SELECT phase FROM bootstrap_v3_phases WHERE operation_id=o.id ORDER BY ordinal DESC LIMIT 1) AS phase
     FROM bootstrap_v3_operations o WHERE o.id=${operationId}::uuid`);
    if(operation.attachment_id!==attachmentId||!operation.phase||clock.mode==='off'&&operation.writer_xid!==clock.xid)denyProof();
    const packet=required(await db.$queryRaw<Array<{value:any}>>`SELECT bootstrap_v3_read(${operationId}::uuid,${operation.phase}) AS value`).value;
    if(!packet||!proofEqual(packet.plan,operation.plan)||packet.plan?.command?.attachmentId!==attachmentId)denyProof();
    const original=v3Authority.parse(packet.plan.authority);
    return freezePublic(v3Authority.parse({...original,at:clock.at,fence:clock.fence,writerXid:clock.xid}));
   }

   const attachmentRow=required(await db.$queryRaw<Array<{record:unknown;record_digest:string;workspace_id:string;decision_id:string;decision_revision:number;
    installation_id:string;host_id:string;installation_lifecycle_id:string;host_lifecycle_id:string}>>`
    SELECT record,record_digest,workspace_id,decision_id,decision_revision,installation_id,host_id,
      installation_lifecycle_id,host_lifecycle_id FROM bootstrap_proof_attachments WHERE id=${attachmentId}::uuid`);
   const attachment=proofAuthorityAttachment.parse(attachmentRow.record);
   if(attachment.workspaceId!==attachmentRow.workspace_id||attachment.decisionId!==attachmentRow.decision_id||
    attachment.decisionRevision!==attachmentRow.decision_revision||attachment.installationId!==attachmentRow.installation_id||
    attachment.generation.hostId!==attachmentRow.host_id||attachmentRow.record_digest!==proofDigest(attachment))denyProof();
   const proof=await readCanonicalProofAuthority(db,attachment);
   if(!proofEqual(proof.attachment,attachment))denyProof();

   const decision=required(await db.$queryRaw<Array<{body:any;acceptance_id:string;accepted_at:string;auth_time:string;
    authority_revision:string;authority_digest:string}>>`
    SELECT r.body,a.id AS acceptance_id,
      to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS accepted_at,
      e.record->>'authTime' AS auth_time,h.revision::text AS authority_revision,
      bootstrap_v3_native_digest(to_jsonb(h)) AS authority_digest
    FROM decision_revisions r JOIN decision_acceptances a ON a.decision_id=r.decision_id
    JOIN decision_owner_auth_evidence e ON e.decision_id=r.decision_id AND e.acceptance_id=a.id
    JOIN decision_authority_events h ON h.decision_id=r.decision_id
    WHERE r.decision_id=${attachment.decisionId}::uuid AND r.workspace_id=${attachment.workspaceId}::uuid
      AND r.version=${attachment.decisionRevision}
      AND NOT EXISTS(SELECT 1 FROM decision_authority_events n WHERE n.decision_id=h.decision_id AND n.revision>h.revision)
    LIMIT 2`);
   const intent=v3Intent.parse(decision.body?.workerBootstrapAdmissionV3);
   if(!proofEqual(intent.proofAuthority,attachment))denyProof();
   const channelIntent=decision.body?.workerBootstrapChannel;
   const snapshot=bootstrapChannelSnapshot.parse(channelIntent?.snapshot);
   const [accepted]=await db.$queryRaw<Array<{admission_owner:string|null;channel_owner:string|null;attested:boolean}>>`
    SELECT bootstrap_proof_owner(${attachment.workspaceId}::uuid,${attachment.decisionId}::uuid,
       ${attachment.decisionRevision},'workerBootstrapAdmissionV3',${JSON.stringify(intent)}::jsonb) AS admission_owner,
      bootstrap_proof_owner(${attachment.workspaceId}::uuid,${attachment.decisionId}::uuid,
       ${attachment.decisionRevision},'workerBootstrapChannel',${JSON.stringify(channelIntent)}::jsonb) AS channel_owner,
      decision_attestation_owner(${attachment.decisionId}::uuid,${decision.acceptance_id}::uuid) AS attested`;
   if(!accepted||accepted.admission_owner!==attachment.ownerId||accepted.channel_owner!==attachment.ownerId||accepted.attested!==true)denyProof();
   // The proposed generation, pin and DNS set need an accepted persisted source.
   // A transport profile alone does not contain those fields.
   const owner={id:attachment.ownerId,decisionId:attachment.decisionId,decisionRevision:attachment.decisionRevision,
    acceptedAt:decision.accepted_at,authenticatedAt:decision.auth_time,expiresAt:intent.expiresAt,intentDigest:proofDigest(intent)};
   const lifecycles=required(await db.$queryRaw<Array<{installation:any;host:any;valid:boolean}>>`
    SELECT to_jsonb(i) AS installation,to_jsonb(h) AS host,
      bootstrap_proof_lifecycle(${attachment.workspaceId}::uuid,${attachment.installationId}::uuid,
       ${attachment.generation.hostId}::uuid,${attachment.generation.installationGeneration}::uuid,
       ${attachment.generation.hostGeneration}::uuid,i.id,h.id) AS valid
    FROM worker_identity_lifecycle i JOIN worker_identity_lifecycle h ON h.id=${attachmentRow.host_lifecycle_id}::uuid
    WHERE i.id=${attachmentRow.installation_lifecycle_id}::uuid`);
   if(lifecycles.valid!==true)denyProof();
   const lifecycle={installationLifecycleId:lifecycles.installation.id,hostLifecycleId:lifecycles.host.id,
    installationGeneration:lifecycles.installation.generation,hostGeneration:lifecycles.host.generation,
    hostId:lifecycles.host.subject_id,hostEnabled:true as const,installationEnabled:true as const};

   const anchor=required(await db.$queryRaw<Array<{key_id:string;epoch:number;public_key_digest:string}>>`
    SELECT key_id,epoch,public_key_digest FROM trusted_provider_ticket_keys
    WHERE workspace_id=${attachment.workspaceId}::uuid AND installation_id=${attachment.installationId}::uuid`);
   if(intent.binding.ticketKeyId!==anchor.key_id||intent.binding.ticketKeyEpoch!==anchor.epoch||
    intent.binding.ticketPublicKeyDigest!==anchor.public_key_digest)denyProof();
   const issuerRows=await db.$queryRaw<Array<{revision:number;record_digest:string;record:any}>>`
    SELECT revision,record_digest,record FROM bootstrap_issuer_history WHERE workspace_id=${attachment.workspaceId}::uuid
    ORDER BY revision DESC LIMIT 1001`;
   if(!issuerRows.length||issuerRows.length>1000)denyProof();
   const issuerKey=issuerRows.find(x=>String(x.record?.intent?.targetEpoch)===String(anchor.epoch)&&
    ['create','adopt','stage'].includes(x.record?.intent?.action));
   if(!issuerKey)denyProof();
   const material=issuerMaterial.parse(issuerKey.record.intent.material);
   const validFrom=iso(new Date(Math.max(Date.parse(decision.accepted_at),
    Date.parse(issuerKey.record.intent.action==='stage'?issuerKey.record.intent.activatesAt:issuerKey.record.at))).toISOString());
   const issuer=v3Issuer.parse({protocol:'worker-bootstrap-owner-ticket-v3',workspaceId:attachment.workspaceId,
    installationId:attachment.installationId,material,epoch:anchor.epoch,revision:issuerRows[0].revision,
    historyDigest:issuerRows[0].record_digest,
    authorizationDigest:proofDigest({domain:'roost-bootstrap-v3-issuer-authorization-v1',issuerRecordDigest:issuerKey.record_digest,
     decisionId:attachment.decisionId,acceptanceId:decision.acceptance_id,intentDigest:proofDigest(intent)}),validFrom,expiresAt:intent.expiresAt});

   const reserved=required(await db.$queryRaw<Array<{digests:string[]}>>`
    SELECT coalesce(jsonb_agg(digest ORDER BY digest COLLATE "C"),'[]'::jsonb) AS digests FROM (
      SELECT public_key_digest AS digest FROM trusted_provider_ticket_keys WHERE workspace_id=${attachment.workspaceId}::uuid
      UNION SELECT record->'intent'->'material'->>'publicKeyDigest' FROM bootstrap_issuer_history
        WHERE workspace_id=${attachment.workspaceId}::uuid AND record->'intent'->'material'<>'null'::jsonb
      UNION SELECT encode(sha256(decode('302a300506032b6570032100'||(record->'material'->>'publicKey'),'hex')),'hex')
        FROM decision_attestation_key_history WHERE workspace_id=${attachment.workspaceId}::uuid AND record->'material'<>'null'::jsonb
    ) x WHERE digest IS NOT NULL`);
   const head=await db.$queryRaw<Array<{revision:number;record_digest:string;high_water_epoch:number;state:string}>>`
    SELECT revision,record_digest,high_water_epoch,state FROM worker_transport_heads
    WHERE workspace_id=${attachment.workspaceId}::uuid AND host_id=${attachment.generation.hostId}::uuid LIMIT 2`;
   if(head.length>1||head[0]&&head[0].state!=='revoked')denyProof();
   const used=required(await db.$queryRaw<Array<{generations:number;pins:number;old_tickets:number;credentials:number}>>`
    SELECT (SELECT count(*)::int FROM worker_transport_history WHERE workspace_id=${attachment.workspaceId}::uuid
      AND host_id=${attachment.generation.hostId}::uuid AND generation_id=${snapshot.generation}::uuid) AS generations,
      (SELECT count(*)::int FROM worker_transport_history WHERE workspace_id=${attachment.workspaceId}::uuid
      AND host_id=${attachment.generation.hostId}::uuid AND (current_pin=${snapshot.leafPin} OR staged_pin=${snapshot.leafPin})) AS pins,
      (SELECT count(*)::int FROM worker_bootstrap_tickets WHERE workspace_id=${attachment.workspaceId}::uuid
       AND host_id=${attachment.generation.hostId}::uuid) AS old_tickets,
      (SELECT count(*)::int FROM api_keys WHERE workspace_id=${attachment.workspaceId}::uuid
       AND worker_host_id=${attachment.generation.hostId}::uuid) AS credentials`);
   // Recovery needs the exact terminal ticket, key and predecessor. Until that
   // read is implemented, denying it is safer than a projected predecessor.
   if(attachment.purpose!=='first_enrollment'||used.old_tickets!==0||used.credentials!==0||used.generations!==0||used.pins!==0)denyProof();
   const channel={acceptanceId:decision.acceptance_id,snapshot,previousRevision:head[0]?.revision??0,
    previousDigest:head[0]?.record_digest??null,previousHighWater:head[0]?.high_water_epoch??0,
    previousRevoked:true as const,unusedGeneration:true as const,unusedPin:true as const};
   const raw={version:'bootstrap-proof-issuance-authority-v3' as const,at:clock.at,fence:clock.fence,writerXid:clock.xid,
    authorityRevision:decision.authority_revision,authorityDigest:decision.authority_digest,
    attachmentId,attachmentDigest:attachmentRow.record_digest,attachment,
    workerHistory:proof.worker,serverHistory:proof.server,reservedPublicKeyDigests:reserved.digests,
    owner,lifecycle,issuer,intent,channel,prior:null};
   const frame=required(await db.$queryRaw<Array<{value:any}>>`
    SELECT bootstrap_v3_inventory(jsonb_build_object('authority',${JSON.stringify(raw)}::jsonb)) AS value`).value;
   if(frame.fence!==clock.fence||!Array.isArray(frame.rows)||projectionSetDigest(z.array(projectionRow).parse(frame.rows))!==frame.sourceSetDigest)denyProof();
   const ownHead=frame.heads?.find((h:any)=>h.decisionId===attachment.decisionId);
   if(!ownHead||ownHead.revision!==decision.authority_revision||ownHead.digest!==decision.authority_digest||!ownHead.fanout)denyProof();
   return freezePublic(v3Authority.parse({...raw,sourceDigest:frame.sourceSetDigest}));
  }
 });
}
