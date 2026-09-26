import { createHmac, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AuthContext } from '../../auth/api-key.middleware';
import { env } from '../../config/env';
import { reviewDigest } from '../agent-runtime/task-review-contract';
import { v3Intent } from './bootstrap-proof-issuance-contract';
import { bootstrapChannelSnapshot } from './bootstrap-channel-contract';

const id=z.string().uuid();
export const v3OwnerAuthCommand=z.object({decisionId:id,requestId:id}).strict();
function deny():never{throw Error('bootstrap_v3_owner_auth_denied');}

// Owner session evidence is committed before the first V3 ticket exists. The
// native auth-row guard and automatic Event/authority receipts remain the writer.
export async function recordV3OwnerAuth(client:PrismaClient,auth:AuthContext,input:unknown){
 const command=v3OwnerAuthCommand.parse(input),now=new Date();
 if(auth.authType!=='user'||auth.workspaceRole!=='owner'||!auth.userId||!auth.authenticatedAt||
   now.getTime()-auth.authenticatedAt*1000>300000||auth.authenticatedAt*1000>now.getTime())deny();
 const authenticatedAt=auth.authenticatedAt;
 const result=await client.$transaction(async db=>{
  await db.$executeRaw`SET LOCAL search_path = pg_catalog, public`;
  await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
  const workspace=await db.workspace.findUnique({where:{id:auth.workspaceId},select:{ownerUserId:true}});
  if(!workspace||workspace.ownerUserId!==auth.userId||!await db.workspaceMembership.findFirst({where:{workspaceId:auth.workspaceId,userId:auth.userId,role:'owner'}}))deny();
  const rows=await db.$queryRaw<Array<{acceptance_id:string;accepted_at:Date;body:any;version:number}>>`
   SELECT a.id AS acceptance_id,a.created_at AS accepted_at,r.body,r.version
   FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
   JOIN decision_acceptances a ON a.decision_id=d.id
   WHERE d.id=${command.decisionId}::uuid AND d.workspace_id=${auth.workspaceId}::uuid AND d.status='accepted'
   AND decision_state(d.id)='accepted' AND a.actor_user_id=${auth.userId}::uuid AND a.actor_agent_id IS NULL
   AND a.actor_credential_id IS NULL AND a.authority->>'status'='owner_reserved'
   AND NOT EXISTS(SELECT 1 FROM decisions successor JOIN decision_acceptances accepted ON accepted.decision_id=successor.id WHERE successor.supersedes_id=d.id)`;
  if(rows.length!==1)deny();const row=rows[0];
  v3Intent.parse(row.body?.workerBootstrapAdmissionV3);
  bootstrapChannelSnapshot.parse(row.body?.workerBootstrapChannel?.snapshot);
  if((await db.$queryRaw<Array<{n:number}>>`SELECT count(*)::int AS n FROM decision_owner_auth_evidence WHERE decision_id=${command.decisionId}::uuid`)[0].n!==0)deny();
  const authTime=new Date(authenticatedAt*1000).toISOString(),acceptedAt=row.accepted_at.toISOString();
  if(Date.parse(authTime)>Date.parse(acceptedAt)||now.getTime()-Date.parse(authTime)>300000)deny();
  const record={version:'roost-owner-auth-evidence-v1',workspaceId:auth.workspaceId,ownerId:auth.userId,acceptanceId:row.acceptance_id,
   level:'roost_session',authTime,acceptedAt,
   sessionEvidenceDigest:createHmac('sha256',env.authTokenSecret).update(JSON.stringify({domain:'roost-v3-owner-session-boundary-v1',
    workspaceId:auth.workspaceId,ownerId:auth.userId,authTime,decisionId:command.decisionId,
    acceptanceId:row.acceptance_id,requestId:command.requestId})).digest('hex'),policyRevision:1};
  const mutationDigest=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
  const operationId=randomUUID();
  await db.$executeRaw`INSERT INTO decision_owner_auth_evidence(id,decision_id,acceptance_id,workspace_id,record,record_digest,writer_xid,mutation_digest)
   VALUES(${operationId}::uuid,${command.decisionId}::uuid,${row.acceptance_id}::uuid,${auth.workspaceId}::uuid,
    ${JSON.stringify(record)}::jsonb,'','',${mutationDigest})`;
  const committed=(await db.$queryRaw<Array<{record_digest:string;writer_xid:string}>>`SELECT record_digest,writer_xid FROM decision_owner_auth_evidence WHERE id=${operationId}::uuid`)[0];
  if(!committed||!id.safeParse(operationId).success||!committed.record_digest||!committed.writer_xid)deny();
  return {operationId,decisionId:command.decisionId,acceptanceId:row.acceptance_id,recordDigest:committed.record_digest,writerXid:committed.writer_xid};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:3000,timeout:20000});
 const readback=await client.$transaction(async db=>{
  await db.$executeRaw`SET TRANSACTION READ ONLY`;await db.$executeRaw`SET LOCAL search_path = pg_catalog, public`;
  return db.$queryRaw<Array<{record_digest:string;writer_xid:string;receipts:number;events:number}>>`
   SELECT x.record_digest,x.writer_xid,
    (SELECT count(*)::int FROM decision_attestation_write_receipts r WHERE r.table_name='decision_owner_auth_evidence' AND r.row_id=x.id::text) AS receipts,
    (SELECT count(*)::int FROM decision_authority_events e WHERE e.decision_id=x.decision_id AND e.action='source_change' AND e.source_table='decision_owner_auth_evidence' AND e.source_row=x.id::text) AS events
   FROM decision_owner_auth_evidence x WHERE x.id=${result.operationId}::uuid`;
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:3000,timeout:10000});
 if(readback.length!==1||readback[0].record_digest!==result.recordDigest||readback[0].writer_xid!==result.writerXid||
  readback[0].receipts!==1||readback[0].events!==1)deny();
 return {operationId:result.operationId,decisionId:result.decisionId,recordDigest:result.recordDigest};
}
