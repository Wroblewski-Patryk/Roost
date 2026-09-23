import type { Prisma,PrismaClient } from "@prisma/client";
import { z } from "zod";
import { advanceLifecycle,denyLifecycle,lifecycleIntent,lifecycleRecord,projectLifecycle,type LifecycleRecord } from "./worker-identity-lifecycle";
import { bootstrapBinding } from "./worker-bootstrap-contract";
type Db=Prisma.TransactionClient;
const command=z.object({operationId:z.string().uuid(),decisionId:z.string().uuid(),decisionRevision:z.number().int().positive(),intent:lifecycleIntent}).strict();
const rows=z.array(z.object({record:lifecycleRecord,verified:z.literal(true)}).strict()).max(1000);
const authority=z.object({ownerId:z.string().uuid(),decisionId:z.string().uuid(),decisionRevision:z.number().int().positive(),intent:lifecycleIntent,
  current:z.literal(true),anchorFresh:z.boolean(),hostEnabled:z.boolean()}).strict();
async function guarded(db:Db){const proof=await db.$queryRaw<any[]>`SELECT worker_identity_lifecycle_guarded() AS guarded`;return proof.length===1&&proof[0].guarded===true;}
async function history(db:Db,workspace:string,kind:string,subject:string){
  const result=await db.$queryRaw<any[]>`SELECT l.record,(a.record_digest=l.record_digest AND l.record_digest=encode(sha256(convert_to(l.record::text,'UTF8')),'hex')) AS verified
    FROM worker_identity_lifecycle l LEFT JOIN worker_identity_lifecycle_audit a ON a.operation_id=l.id
    WHERE l.workspace_id=${workspace}::uuid AND l.kind=${kind} AND l.subject_id=${subject}::uuid ORDER BY l.epoch LIMIT 1001`;
  return rows.parse(result).map(r=>r.record);
}
export async function inspectCanonicalLifecycle(db:Db,binding:unknown){
  const b=bootstrapBinding.parse(binding),proof=await guarded(db);
  if(!proof)return projectLifecycle(b,[],false);
  const h=await history(db,b.workspaceId,'host',b.hostId),i=await history(db,b.workspaceId,'installation',b.installationId);
  // Contiguous immutable history and its atomic audit are mandatory, not merely a head.
  for(const records of [h,i])for(let n=0;n<records.length;n++){
    const r=records[n];if(r.epoch!==n+1||r.previousId!==(records[n-1]?.id??null))denyLifecycle();
  }
  return projectLifecycle(b,[h.at(-1),i.at(-1)].filter((r):r is LifecycleRecord=>!!r),true);
}

// Source-only factory: no endpoint, routes, issuance or default composition.
export function createPrismaWorkerIdentityLifecycleStore(client:Pick<PrismaClient,'$transaction'>,clock=()=>new Date()){
  async function run<T>(readOnly:boolean,work:(db:Db)=>Promise<T>){
    try{return await client.$transaction(async db=>{
      if(readOnly)await db.$executeRaw`SET TRANSACTION READ ONLY`;
      else if(await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`!==1)denyLifecycle();
      return work(db);
    },{isolationLevel:readOnly?'RepeatableRead':'Serializable',timeout:10000,maxWait:2000});}catch{return denyLifecycle();}
  }
  return {
    inspect:(binding:unknown)=>run(true,db=>inspectCanonicalLifecycle(db,binding)),
    apply:(input:unknown)=>run(false,async db=>{
      const c=command.parse(input),i=c.intent;if(!await guarded(db))denyLifecycle();
      const found=await db.$queryRaw<any[]>`SELECT w.owner_user_id AS "ownerId",d.id AS "decisionId",r.version AS "decisionRevision",r.body->'workerIdentityLifecycle' AS intent,
        (d.status='accepted' AND decision_state(d.id)='accepted' AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL AND a.actor_credential_id IS NULL
        AND a.authority->>'status'='owner_reserved' AND a.created_at<=CURRENT_TIMESTAMP
        AND NOT (r.body ?| ARRAY['authority','workerBootstrap','workerCredential','workerTransport'])
        AND (SELECT count(*) FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.role::text='owner')=1
        AND EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.user_id=w.owner_user_id AND m.role::text='owner')
        AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)) AS current,
        COALESCE((CASE WHEN ${i.kind}='host' THEN h.lifecycle_birth_xid ELSE k.lifecycle_birth_xid END)=pg_current_xact_id()::text,false) AS "anchorFresh",
        (h.id IS NOT NULL AND h.status::text<>'disabled') AS "hostEnabled"
        FROM workspaces w JOIN trusted_provider_ticket_keys k ON k.workspace_id=w.id AND k.installation_id=${i.installationId}::uuid
        JOIN decisions d ON d.workspace_id=w.id AND d.id=${c.decisionId}::uuid
        JOIN decision_revisions r ON r.decision_id=d.id AND r.workspace_id=w.id
        JOIN decision_acceptances a ON a.decision_id=d.id AND a.workspace_id=w.id
        LEFT JOIN agent_hosts h ON h.id=${i.subjectId}::uuid AND h.workspace_id=w.id
        WHERE w.id=${i.workspaceId}::uuid LIMIT 2`;
      if(found.length!==1)denyLifecycle();const a=authority.parse(found[0]);
      if(a.decisionId!==c.decisionId||a.decisionRevision!==c.decisionRevision)denyLifecycle();
      const records=await history(db,i.workspaceId,i.kind,i.subjectId),installation=await history(db,i.workspaceId,'installation',i.installationId);
      const record=advanceLifecycle(i,records,{...a,writerFenced:true,installation:installation.at(-1)??null},c.operationId,clock());
      // Native trigger independently checks the same canonical owner/decision,
      // exact transition, birth/adoption and installation binding, then audits.
      if(await db.$executeRaw`INSERT INTO worker_identity_lifecycle(id,workspace_id,kind,subject_id,epoch,generation,state,previous_id,decision_id,record,record_digest)
        VALUES(${record.id}::uuid,${i.workspaceId}::uuid,${i.kind},${i.subjectId}::uuid,${record.epoch},${i.generation}::uuid,${record.state},${record.previousId}::uuid,${c.decisionId}::uuid,${JSON.stringify(record)}::jsonb,${'0'.repeat(64)})`!==1)denyLifecycle();
      return record;
    })
  };
}
