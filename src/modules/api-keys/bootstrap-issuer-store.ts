import type { Prisma,PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { reviewDigest } from '../agent-runtime/task-review-contract';
import { bootstrapBinding } from './worker-bootstrap-contract';
import { issuerGuards } from './bootstrap-issuer-guards';
import { advanceIssuer,denyIssuer,issuerGaps,issuerIntent,issuerRecord,replayIssuer,selectIssuer,type IssuerHead } from './bootstrap-issuer-contract';
type Db=Prisma.TransactionClient;
const command=z.object({operationId:z.string().uuid(),decisionId:z.string().uuid(),decisionRevision:z.number().int().positive(),intent:issuerIntent}).strict();
const headSchema=z.object({workspaceId:z.string().uuid(),installationId:z.string().uuid(),keyId:z.string(),epoch:z.number().int().positive(),publicKeyDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export class IssuerReconciliationRequired extends Error{readonly code='reconciliation_required';readonly retryable=false;constructor(){super('bootstrap_issuer_reconciliation_required');}}
async function guarded(db:Db){
  const available=await db.$queryRaw<any[]>`SELECT to_regclass('public.bootstrap_issuer_history') IS NOT NULL AND to_regclass('public.bootstrap_issuer_audit') IS NOT NULL AS available`;
  if(available.length!==1||available[0].available!==true)return false;
  const proof=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,
    encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
    (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal AND t.tgconstraint=0
     AND NOT t.tgdeferrable AND NOT t.tginitdeferred AND n.nspname='public' AND pn.nspname='public'
     AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND p.prokind='f'
     AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL
     AND p.provolatile='v' AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
     AND current_setting('session_replication_role')='origin' AND current_setting('transaction_isolation') IN ('repeatable read','serializable')
     AND EXISTS(SELECT 1 FROM ready_source_fence WHERE id=1)) AS enabled
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=ANY(${issuerGuards.map(g=>g.name)}::text[])`;
  return proof.length===issuerGuards.length&&issuerGuards.every(g=>proof.filter(({enabled,...rest})=>enabled===true&&reviewDigest(rest)===reviewDigest(g)).length===1);
}
async function head(db:Db,workspace:string):Promise<IssuerHead|null>{
  const rows=await db.$queryRaw<any[]>`SELECT workspace_id AS "workspaceId",installation_id AS "installationId",key_id AS "keyId",epoch,public_key_digest AS "publicKeyDigest"
    FROM trusted_provider_ticket_keys WHERE workspace_id=${workspace}::uuid LIMIT 2`;
  if(rows.length>1)denyIssuer();return rows.length?headSchema.parse(rows[0]):null;
}
async function history(db:Db,workspace:string){
  const rows=await db.$queryRaw<any[]>`SELECT h.record,a.fence_revision::text AS fence,
    (a.record_digest=h.record_digest AND h.record_digest=encode(sha256(convert_to(h.record::text,'UTF8')),'hex') AND a.fence_revision>0 AND f.revision>=a.fence_revision) AS verified
    FROM bootstrap_issuer_history h LEFT JOIN bootstrap_issuer_audit a ON a.operation_id=h.id JOIN ready_source_fence f ON f.id=1
    WHERE h.workspace_id=${workspace}::uuid ORDER BY h.revision LIMIT 1001`;
  const parsed=z.array(z.object({record:issuerRecord,fence:z.string().regex(/^[1-9][0-9]*$/),verified:z.literal(true)}).strict()).max(1000).parse(rows);
  let previous=0n;for(const r of parsed){if(BigInt(r.fence)<=previous)denyIssuer();previous=BigInt(r.fence);}
  return parsed.map(r=>r.record);
}
export async function inspectCanonicalIssuer(db:Db,binding:unknown,now=new Date(),issuedAt=now.toISOString()){
  try{const b=bootstrapBinding.parse(binding);if(!await guarded(db))denyIssuer();
    const anchor=await head(db,b.workspaceId),state=replayIssuer(await history(db,b.workspaceId));if(!anchor||!state)denyIssuer();
    return {blockers:[] as string[],facts:selectIssuer(state!,anchor!,b,issuedAt,now)};
  }catch{return {blockers:[...issuerGaps] as string[],facts:null};}
}
// Source-only; not composed into routes, signing, issuance or delivery.
export function createPrismaBootstrapIssuerStore(client:Pick<PrismaClient,'$transaction'>,clock=()=>new Date()){
  return {
    inspect:async(binding:unknown,issuedAt?:string)=>{
      try{return await client.$transaction(async db=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;return inspectCanonicalIssuer(db,binding,clock(),issuedAt);},
        {isolationLevel:'RepeatableRead',timeout:10000,maxWait:2000});}catch{return {blockers:[...issuerGaps],facts:null};}
    },
    apply:async(input:unknown)=>{
      let completed=false;
      try{const c=command.parse(input),i=c.intent;
        const record=await client.$transaction(async db=>{
          if(await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`!==1||!await guarded(db))denyIssuer();
          const authorities=await db.$queryRaw<any[]>`SELECT w.owner_user_id AS "ownerId",r.version AS revision,r.body->'workerBootstrapIssuer' AS intent,
            (d.status='accepted' AND decision_state(d.id)='accepted' AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL AND a.actor_credential_id IS NULL
             AND a.authority->>'status'='owner_reserved' AND a.created_at<=CURRENT_TIMESTAMP
             AND NOT r.body ?| ARRAY['authority','workerBootstrap','workerIdentityLifecycle','workerCredential','workerTransport']
             AND (SELECT count(*) FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.role::text='owner')=1
             AND EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w.id AND m.user_id=w.owner_user_id AND m.role::text='owner')
             AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)) AS current
            FROM decisions d JOIN workspaces w ON w.id=d.workspace_id JOIN decision_revisions r ON r.decision_id=d.id AND r.workspace_id=w.id
            JOIN decision_acceptances a ON a.decision_id=d.id AND a.workspace_id=w.id WHERE d.id=${c.decisionId}::uuid AND w.id=${i.binding.workspaceId}::uuid LIMIT 2`;
          if(authorities.length!==1)denyIssuer();
          const a=z.object({ownerId:z.string().uuid(),revision:z.literal(c.decisionRevision),intent:issuerIntent,current:z.literal(true)}).strict().parse(authorities[0]);
          let anchor=await head(db,i.binding.workspaceId),fresh=false;
          if(!anchor&&i.action==='create'){
            const m=i.material!;
            if(await db.$executeRaw`INSERT INTO trusted_provider_ticket_keys(workspace_id,installation_id,key_id,epoch,public_key_digest)
              VALUES(${i.binding.workspaceId}::uuid,${i.binding.installationId}::uuid,${m.keyId},1,${m.publicKeyDigest})`!==1)denyIssuer();
            anchor=await head(db,i.binding.workspaceId);fresh=true;
          }
          if(!anchor)denyIssuer();const records=await history(db,i.binding.workspaceId);
          const next=advanceIssuer(i,records,{...a,decisionId:c.decisionId,decisionRevision:a.revision,fresh,head:anchor!},c.operationId,clock());
          if(await db.$executeRaw`INSERT INTO bootstrap_issuer_history(id,workspace_id,revision,decision_id,record,record_digest,writer_xid)
            VALUES(${next.id}::uuid,${i.binding.workspaceId}::uuid,${next.revision},${c.decisionId}::uuid,${JSON.stringify(next)}::jsonb,${'0'.repeat(64)},'')`!==1)denyIssuer();
          completed=true;return next;
        },{isolationLevel:'Serializable',timeout:10000,maxWait:2000});
        // Confirm the exact immutable operation after COMMIT, without retries.
        await client.$transaction(async db=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;if(!await guarded(db))denyIssuer();
          const records=await history(db,i.binding.workspaceId),state=replayIssuer(records),anchor=await head(db,i.binding.workspaceId),last=state?.generations.at(-1);
          if(!records.some(r=>reviewDigest(r)===reviewDigest(record))||!anchor||!last||anchor.epoch!==state!.highWater||anchor.keyId!==last.material.keyId||anchor.publicKeyDigest!==last.material.publicKeyDigest)denyIssuer();
        },{isolationLevel:'RepeatableRead',timeout:10000,maxWait:2000});
        return record;
      }catch{if(completed)throw new IssuerReconciliationRequired();return denyIssuer();}
    }
  };
}
