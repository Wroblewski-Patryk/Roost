import { randomUUID } from "node:crypto";
import type { Prisma,PrismaClient } from "@prisma/client";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import type { SignedTransport } from "./worker-transport.service";
import type { BootstrapBinding,BootstrapTicket,BootstrapDecision } from "./worker-bootstrap-contract";
import { authorizeWorkerBootstrap,bootstrapPeerMatches,verifyBootstrapSignature,type BootstrapContext,type BootstrapStore,type BootstrapTx,type BootstrapAttempt } from "./worker-bootstrap.service";
import { persistedBootstrapTicket,persistedBootstrapAttempt,persistedBootstrapHistory,signedBootstrapTicket,signedBootstrapDecision,boundedBootstrapRecord } from "./worker-bootstrap-persistence-contract";

type Db=Prisma.TransactionClient;
type SourceContext=Omit<BootstrapContext,"enrollmentGeneration"|"prior">&{credentialState:"absent"|"pending"|"acknowledged"|"revoked"|"expired"};
// Mandatory authority dependency, evaluated INSIDE the very same transaction.
// No production implementation or default composition is provided in this atom.
export interface BootstrapAuthoritySource{
  qualification:"synthetic_bootstrap_authority_v1"|"canonical_bootstrap_projection_v1";
  // Canonical readers can require a transaction-scoped lifetime established only
  // after this adapter has fenced writes / selected SQL READ ONLY for reads.
  bindTransaction?(db:Db,mode:"read"|"write"):Promise<()=>void>;
  inspect?(db:Db,input:unknown):Promise<unknown>;
  context(db:Db,binding:BootstrapBinding,issuedAt?:string,ticketId?:string):Promise<SourceContext|null>;
  decision(db:Db,id:string):Promise<SignedTransport<BootstrapDecision>|null>;
  ticketRevoked(db:Db,id:string):Promise<boolean>;
}
type Head={workspace_id:string;host_id:string;attempt_id:string;history_id:string;generation:number;credential_epoch:number;revision:number;record_digest:string;state:BootstrapAttempt["state"]};
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
const deny=(code="bootstrap_store_denied"):never=>{throw Error(code);};
const json=(v:unknown)=>JSON.stringify(boundedBootstrapRecord(v));

export function createPrismaWorkerBootstrapStore(client:Pick<PrismaClient,"$transaction">,source:BootstrapAuthoritySource,clock=()=>new Date()):BootstrapStore&{
  register(ticket:SignedTransport<BootstrapTicket>):Promise<{ticketId:string;ticketDigest:string}>;
  inspectAuthority(input:unknown):Promise<unknown>;
}{
  async function run<T>(readOnly:boolean,work:(tx:BootstrapTx,register:(ticket:SignedTransport<BootstrapTicket>)=>Promise<{ticketId:string;ticketDigest:string}>,db:Db)=>Promise<T>){
    if(!client?.$transaction||!["synthetic_bootstrap_authority_v1","canonical_bootstrap_projection_v1"].includes(source?.qualification)||
      typeof source.context!=="function"||typeof source.decision!=="function"||typeof source.ticketRevoked!=="function")deny("unavailable");
    try{return await client.$transaction(async db=>{
      if(readOnly)await db.$executeRaw`SET TRANSACTION READ ONLY`;
      else if(await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`!==1)deny();
      const release=await source.bindTransaction?.(db,readOnly?"read":"write");
      try{const {api,register}=transaction(db,source,clock,readOnly);return await work(api,register,db);}finally{release?.();}
    },{isolationLevel:readOnly?"RepeatableRead":"Serializable",timeout:10000,maxWait:2000});
    }catch{return deny();} // No retry, raw SQL error or payload escapes this boundary.
  }
  return {qualification:"synthetic_bootstrap_ledger_v1",transaction:work=>run(false,work),read:work=>run(true,work),register:ticket=>run(false,(_tx,register)=>register(ticket)),
    inspectAuthority:input=>run(true,(_tx,_register,db)=>{if(!source.inspect)return deny("unavailable");return source.inspect(db,input);})};
}

function transaction(db:Db,source:BootstrapAuthoritySource,clock:()=>Date,readOnly:boolean){
  let selected:SignedTransport<BootstrapTicket>|undefined,ephemeral:SignedTransport<BootstrapTicket>|undefined;
  const write=()=>{if(readOnly)deny("read_only");};
  async function ticketRow(id:string){
    const rows=await db.$queryRaw<any[]>`SELECT * FROM worker_bootstrap_tickets WHERE id=${id}::uuid`;
    if(!rows[0])return null;const row=rows[0],r=persistedBootstrapTicket.parse(row.record),t=r.signed.payload,i=t.intent;
    if(row.id!==t.id||row.ticket_digest!==reviewDigest(r.signed)||row.record_digest!==reviewDigest(r)||row.workspace_id!==i.binding.workspaceId||row.host_id!==i.binding.hostId||
      row.owner_id!==t.ownerId||row.decision_id!==t.decisionId||row.request_id!==i.requestId||row.generation!==i.baseline.enrollmentGeneration+1||row.credential_epoch!==i.target.epoch||
      row.target_id!==i.target.id||row.binding_digest!==reviewDigest(i.binding)||row.predecessor_id!==(i.prior?.attemptId??null)||
      r.decision.payload.id!==t.decisionId||r.decision.payload.revision!==t.decisionRevision||r.decision.payload.ownerId!==t.ownerId||
      r.decision.payload.state!=="accepted"||r.decision.payload.intentDigest!==t.decisionIntentDigest)deny();
    return r;
  }
  async function attemptRow(id:string){
    const rows=await db.$queryRaw<any[]>`SELECT * FROM worker_bootstrap_attempts WHERE id=${id}::uuid`;
    if(!rows[0])return null;const r=rows[0],a=persistedBootstrapAttempt.parse(r.record);
    if(r.id!==a.id||r.ticket_id!==a.ticketId||r.record_digest!==reviewDigest(a)||r.workspace_id!==a.binding.workspaceId||r.host_id!==a.binding.hostId||r.credential_epoch!==a.target.epoch)deny();
    const t=await ticketRow(a.ticketId);if(!t||a.ticketDigest!==reviewDigest(t.signed)||!same(a.binding,t.signed.payload.intent.binding)||!same(a.target,t.signed.payload.intent.target)||
      a.decisionId!==t.signed.payload.decisionId||a.requestId!==t.signed.payload.intent.requestId||a.expiresAt!==t.signed.payload.intent.expiresAt||
      r.generation!==t.signed.payload.intent.baseline.enrollmentGeneration+1||r.predecessor_id!==(t.signed.payload.intent.prior?.attemptId??null))deny();
    return {row:r,attempt:a,ticket:t!.signed.payload};
  }
  async function history(attemptId:string){
    const rows=await db.$queryRaw<any[]>`SELECT * FROM worker_bootstrap_history WHERE attempt_id=${attemptId}::uuid ORDER BY revision DESC LIMIT 1`;
    if(!rows[0])return null;const row=rows[0],r=persistedBootstrapHistory.parse(row.record);
    if(r.attemptId!==attemptId||r.id!==row.id||r.revision!==row.revision||r.state!==row.state||reviewDigest(r)!==row.record_digest)deny();return r;
  }
  async function head(b:BootstrapBinding){
    const rows=await db.$queryRaw<Head[]>`SELECT * FROM worker_bootstrap_heads WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid`;
    if(!rows[0]){
      const dangling=await db.$queryRaw<any[]>`SELECT id FROM worker_bootstrap_attempts WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid LIMIT 1`;
      if(dangling.length)deny();return null;
    }
    const h=rows[0],a=await attemptRow(h.attempt_id),r=await history(h.attempt_id);
    if(!a||!r||a.row.workspace_id!==b.workspaceId||a.row.host_id!==b.hostId||a.row.generation!==h.generation||a.row.credential_epoch!==h.credential_epoch||
      r.id!==h.history_id||r.revision!==h.revision||r.state!==h.state||reviewDigest(r)!==h.record_digest)deny();return {head:h,attempt:a!,history:r!};
  }
  async function audit(ticket:BootstrapTicket,historyId:string|null,digest:string,state:string){
    const event=await db.event.create({data:{workspaceId:ticket.intent.binding.workspaceId,type:"worker.bootstrap_admission",source:"roost_api",actorType:"user",actorId:ticket.ownerId,
      resourceType:"worker_bootstrap",resourceId:historyId??ticket.id,payload:{ticketId:ticket.id,recordDigest:digest,state,launchAuthority:false}},select:{id:true}});
    await db.$executeRaw`INSERT INTO worker_bootstrap_audit(id,ticket_id,history_id,event_id,record_digest) VALUES(${randomUUID()}::uuid,${ticket.id}::uuid,${historyId}::uuid,${event.id}::uuid,${digest})`;
  }
  async function append(a:BootstrapAttempt,ticket:BootstrapTicket,old:Awaited<ReturnType<typeof head>>,previous:Awaited<ReturnType<typeof history>>,state:BootstrapAttempt["state"],evidence?:Parameters<BootstrapTx["transition"]>[3]){
    const r=persistedBootstrapHistory.parse({id:randomUUID(),attemptId:a.id,revision:(previous?.revision??0)+1,previousDigest:previous?reviewDigest(previous):null,previousState:previous?.state??null,
      state,createdAt:clock().toISOString(),peer:evidence?.peer??previous?.peer??null,completion:evidence?.completion??previous?.completion??null});
    const digest=reviewDigest(r),b=a.binding,generation=ticket.intent.baseline.enrollmentGeneration+1;
    await db.$executeRaw`INSERT INTO worker_bootstrap_history(id,attempt_id,revision,state,record,record_digest,previous_revision,previous_digest,previous_state)
      VALUES(${r.id}::uuid,${a.id}::uuid,${r.revision},${r.state},${json(r)}::jsonb,${digest},${previous?.revision??null},${r.previousDigest},${r.previousState})`;
    if(old){const n=await db.$executeRaw`UPDATE worker_bootstrap_heads SET attempt_id=${a.id}::uuid,history_id=${r.id}::uuid,generation=${generation},credential_epoch=${a.target.epoch},revision=${r.revision},record_digest=${digest},state=${state}
      WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid AND history_id=${old.head.history_id}::uuid AND record_digest=${old.head.record_digest}`;if(n!==1)deny();}
    else await db.$executeRaw`INSERT INTO worker_bootstrap_heads(workspace_id,host_id,attempt_id,history_id,generation,credential_epoch,revision,record_digest,state)
      VALUES(${b.workspaceId}::uuid,${b.hostId}::uuid,${a.id}::uuid,${r.id}::uuid,${generation},${a.target.epoch},${r.revision},${digest},${state})`;
    await audit(ticket,r.id,digest,state);
    if((state==="dispatched"||state==="acknowledged")&&Date.parse(ticket.intent.expiresAt)<=clock().getTime())deny();
  }
  const api:BootstrapTx={
    async ticket(id){const r=ephemeral?.payload.id===id?{signed:ephemeral}:await ticketRow(id);if(!r)return null;
      if(selected&&selected.payload.id!==id)deny();selected=r.signed;return {signed:r.signed,revoked:await source.ticketRevoked(db,id)};},
    async decision(id){const value=await source.decision(db,id);return value?signedBootstrapDecision.parse(value):null;},
    async context(binding){
      if(!selected||!same(selected.payload.intent.binding,binding))deny();
      const current=await source.context(db,binding,selected!.payload.issuedAt,selected!.payload.id);if(!current)return null;
      const h=await head(binding),i=selected!.payload.intent;
      if(!Number.isSafeInteger(current.credentialHighWater)||current.credentialHighWater<0||
        (current.credential===null)!==(current.credentialState==="absent")||current.credentialActive!==(current.credentialState==="acknowledged")||
        (current.credential&&current.credential.epoch>current.credentialHighWater))deny();
      let prior:BootstrapContext["prior"]=null;
      if(h){
        const old=h.attempt.ticket.intent,oldBinding=old.binding,b=current.binding;
        if(b.installationEpoch<oldBinding.installationEpoch||b.hostEpoch<oldBinding.hostEpoch||b.ticketKeyEpoch<oldBinding.ticketKeyEpoch||
          b.installationEpoch===oldBinding.installationEpoch&&b.installationId!==oldBinding.installationId||
          b.hostEpoch===oldBinding.hostEpoch&&b.hostFingerprint!==oldBinding.hostFingerprint||
          b.ticketKeyEpoch===oldBinding.ticketKeyEpoch&&(b.ticketKeyId!==oldBinding.ticketKeyId||b.ticketPublicKeyDigest!==oldBinding.ticketPublicKeyDigest)||
          current.channel.revision<old.channel.revision||current.channel.certificateEpoch<old.channel.certificateEpoch||current.channel.highWaterEpoch<old.channel.highWaterEpoch||
          current.channel.certificateEpoch===old.channel.certificateEpoch&&current.channel.profile.certificate.fingerprint!==old.channel.profile.certificate.fingerprint)deny();
        if(h.attempt.attempt.ticketId===selected!.payload.id)prior=old.prior;
        else{
          const state=h.history.state==="blocked"||h.history.state==="delivery_unknown"?h.history.state:
            h.history.state==="acknowledged"&&current.credentialState==="revoked"?"revoked_credential":
            h.history.state==="acknowledged"&&current.credentialState==="expired"?"expired":null;
          if(!state||!same(current.credential,h.attempt.attempt.target)&&!same(current.credential,old.baseline.credential))deny();
          prior={attemptId:h.attempt.attempt.id,state:state!,credential:current.credential};
        }
      }else if(current.credentialHighWater!==0||current.credential||i.purpose!=="first_enrollment")deny();
      return {...current,enrollmentGeneration:h?.head.generation??0,credentialHighWater:Math.max(current.credentialHighWater,h?.head.credential_epoch??0),prior};
    },
    async attempt(ticketId){const rows=await db.$queryRaw<any[]>`SELECT id FROM worker_bootstrap_attempts WHERE ticket_id=${ticketId}::uuid`;
      if(!rows[0])return null;const a=await attemptRow(rows[0].id),r=await history(rows[0].id);if(!a||!r)deny();return {...a!.attempt,state:r!.state};},
    async reserve(input,ticket){
      write();const a=persistedBootstrapAttempt.parse(input),auth=await authorizeWorkerBootstrap(api,ticket.id,"initial",clock),i=auth.ticket.intent;
      if(!same(ticket,auth.ticket)||a.ticketId!==ticket.id||a.ticketDigest!==auth.ticketDigest||a.decisionId!==ticket.decisionId||a.requestId!==i.requestId||!same(a.binding,i.binding)||!same(a.target,i.target)||a.expiresAt!==i.expiresAt)deny();
      const old=await head(i.binding);if((old?.head.generation??0)!==i.baseline.enrollmentGeneration||(old?.head.credential_epoch??0)!==i.baseline.credentialHighWater||
        (old?.head.attempt_id??null)!==(i.prior?.attemptId??null))deny();
      await db.$executeRaw`INSERT INTO worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation,credential_epoch,predecessor_id,record,record_digest)
        VALUES(${a.id}::uuid,${a.ticketId}::uuid,${a.binding.workspaceId}::uuid,${a.binding.hostId}::uuid,${i.baseline.enrollmentGeneration+1},${a.target.epoch},${i.prior?.attemptId??null}::uuid,${json(a)}::jsonb,${reviewDigest(a)})`;
      await append(a,ticket,old,null,"consumed");
    },
    async transition(id,from,to,evidence){
      write();const loaded=await attemptRow(id);if(!loaded)return false;
      const a=loaded.attempt,h=await head(a.binding);if(!h||h.head.attempt_id!==id||h.history.state!==from)return false;
      const allowed=from==="consumed"?["dispatched","blocked","delivery_unknown"]:from==="dispatched"?["acknowledged","delivery_unknown"]:from==="acknowledged"?["delivery_unknown"]:[];
      if(!allowed.includes(to))deny();
      if(to==="dispatched"||to==="acknowledged"){
        const auth=await authorizeWorkerBootstrap(api,a.ticketId,to==="dispatched"?"reserved":"complete",clock);
        if(auth.ticketDigest!==a.ticketDigest)deny();
        if(to==="dispatched"){
          if(!evidence?.peer||evidence.completion||!bootstrapPeerMatches(evidence.peer,auth.ticket,auth.context,a,clock))deny();
        }else{
          const r=evidence?.completion;if(!r||evidence?.peer||!verifyBootstrapSignature("completion",r,auth.context)||!h.history.peer||
            !bootstrapPeerMatches(h.history.peer,auth.ticket,auth.context,a,clock)||!same(r.payload.peer,h.history.peer.payload)||r.payload.attemptId!==a.id||
            r.payload.ticketDigest!==a.ticketDigest||r.payload.requestId!==a.requestId||!same(r.payload.credential,a.target)||
            Date.parse(r.payload.committedAt)>clock().getTime()||Date.parse(r.payload.committedAt)<Date.parse(auth.ticket.issuedAt))deny();
        }
      }else if(evidence)deny(); // Terminal uncertainty may be recorded after authority revocation.
      await append(a,loaded.ticket,h,h.history,to,evidence);return true;
    }
  };
  async function register(input:SignedTransport<BootstrapTicket>){
    write();ephemeral=signedBootstrapTicket.parse(input);const t=ephemeral.payload;
    const auth=await authorizeWorkerBootstrap(api,t.id,"initial",clock),decision=await api.decision(t.decisionId);
    if(!decision||!verifyBootstrapSignature("decision",decision,auth.context))deny();
    const record=persistedBootstrapTicket.parse({signed:ephemeral,decision}),i=t.intent,digest=reviewDigest(record),ticketDigest=reviewDigest(ephemeral);
    await db.$executeRaw`INSERT INTO worker_bootstrap_tickets(id,workspace_id,host_id,owner_id,decision_id,request_id,generation,credential_epoch,target_id,predecessor_id,binding_digest,ticket_digest,record,record_digest,expires_at)
      VALUES(${t.id}::uuid,${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${t.ownerId}::uuid,${t.decisionId}::uuid,${i.requestId}::uuid,${i.baseline.enrollmentGeneration+1},${i.target.epoch},${i.target.id}::uuid,${i.prior?.attemptId??null}::uuid,${reviewDigest(i.binding)},${ticketDigest},${json(record)}::jsonb,${digest},${new Date(i.expiresAt)})`;
    await audit(t,null,digest,"registered");ephemeral=undefined;return {ticketId:t.id,ticketDigest};
  }
  return {api,register};
}
