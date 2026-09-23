import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { OwnerTicketSigner } from "../agent-runtime/owner-ticket";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { workerTicketFingerprint } from "../../auth/worker-ticket-principal";
import { transportIdentity, workerTransportIntent, type TransportIntent } from "./worker-transport-contract";
import { persistedSignedTransport } from "./worker-transport-persistence-contract";
import { TransportDenied, transportPublicKeyDigest, transportSignedBytes,
  type TransportContext, type TransportDecision, type WorkerTransportStore, type WorkerTransportTx } from "./worker-transport.service";

const deny=(code="unavailable"):never=>{throw new TransportDenied(code);};
const equal=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
type Head=Prisma.WorkerTransportHeadGetPayload<{include:{history:{include:{generation:true}}}}>;

// Explicit injection only. No default application composition, clients, keys,
// networking, credential delivery or process activation are constructed here.
export function createPrismaWorkerTransportStore(client:PrismaClient,signer:OwnerTicketSigner,clock=()=>new Date()):WorkerTransportStore {
  async function run<T>(readOnly:boolean,work:(tx:WorkerTransportTx)=>Promise<T>):Promise<T>{
    try {
      return await client.$transaction(async db=>{
        // Same fence as canonical ownership/decision/credential writers. A read
        // never touches it. Serialization failures do not retry the callback.
        if(!readOnly){const fenced=await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;if(fenced!==1)deny();}
        const tx=transaction(db,signer,clock,readOnly);
        const result=await work(tx.api);
        tx.finish();
        return result;
      },{isolationLevel:readOnly?"RepeatableRead":"Serializable",timeout:20000,maxWait:5000});
    }catch(e){
      if(e instanceof TransportDenied)throw e;
      if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==="P2034"||e.code==="P2002"||e.code==="P2010"&&["40001","40P01"].includes(String(e.meta?.code))))deny("revision_changed");
      return deny();
    }
  }
  return {transaction:work=>run(false,work),read:work=>run(true,work)};
}

function transaction(db:Prisma.TransactionClient,signer:OwnerTicketSigner,clock:()=>Date,readOnly:boolean){
  let scope:TransportContext|null=null,head:Head|null=null,headLoaded=false;
  let decision:{id:string;revision:number;intent:TransportIntent}|null=null;
  let pending:{historyId:string;recordDigest:string;payload:unknown}|null=null,audited=false;
  const scoped=(w:string,h:string)=>{if(!scope||scope.identity.workspaceId!==w||scope.identity.hostId!==h)deny("identity_changed");};
  const write=()=>{if(readOnly)deny("read_only");};
  const api:WorkerTransportTx={
    async context(workspaceId,hostId){
      if(scope)deny("identity_changed");
      const workspace=await db.workspace.findUnique({where:{id:workspaceId},select:{ownerUserId:true}});
      const host=await db.agentHost.findFirst({where:{id:hostId,workspaceId},select:{status:true}});
      const key=await db.trustedProviderTicketKey.findUnique({where:{workspaceId}});
      const credential=await db.apiKey.findFirst({where:{workspaceId,workerHostId:hostId,workerBindingEpoch:{not:null}},orderBy:{workerBindingEpoch:"desc"},
        select:{id:true,keyHash:true,credentialVersion:true,workerBindingEpoch:true,workerInstallationId:true,active:true,revokedAt:true,expiresAt:true,scopes:true,boundAgentId:true}});
      if(!workspace||!host||!key||!credential?.keyHash||!credential.workerInstallationId||!credential.workerBindingEpoch)return null;
      const handoff=await db.transportHandoffSource.findUnique({where:{credentialId:credential.id},
        select:{workspaceId:true,hostId:true,installationId:true,hostFingerprint:true,state:true,acknowledgedAt:true}});
      if(!handoff||handoff.workspaceId!==workspaceId||handoff.hostId!==hostId||handoff.installationId!==credential.workerInstallationId||
        key.installationId!==credential.workerInstallationId||key.keyId!==signer.keyId||key.epoch!==signer.epoch||key.publicKeyDigest!==transportPublicKeyDigest(signer.publicKey))return null;
      const member=await db.workspaceMembership.findUnique({where:{workspaceId_userId:{workspaceId,userId:workspace.ownerUserId}},select:{role:true}});
      scope={identity:transportIdentity.parse({workspaceId,hostId,installationId:key.installationId,hostFingerprint:handoff.hostFingerprint,
        credentialId:credential.id,credentialVersion:credential.credentialVersion,credentialEpoch:credential.workerBindingEpoch,
        credentialFingerprint:workerTicketFingerprint(credential.keyHash),ticketKeyId:key.keyId,ticketKeyEpoch:key.epoch,ticketPublicKeyDigest:key.publicKeyDigest}),
        ownerId:workspace.ownerUserId,ownerActive:member?.role==="owner",hostActive:host.status!=="disabled",
        credentialActive:credential.active&&!credential.revokedAt&&!credential.boundAgentId&&!!credential.expiresAt&&credential.expiresAt>clock()&&
          equal(credential.scopes,["agent-runtime:claim"])&&handoff.state==="acknowledged"&&!!handoff.acknowledgedAt,
        publicKey:signer.publicKey};
      return scope;
    },
    async head(workspaceId,hostId){
      scoped(workspaceId,hostId);
      head=await db.workerTransportHead.findUnique({where:{workspaceId_hostId:{workspaceId,hostId}},include:{history:{include:{generation:true}}}});
      headLoaded=true;if(!head)return null;
      const h=head.history,g=h.generation,signed=persistedSignedTransport.parse({payload:h.record,signature:h.signature}),r=signed.payload;
      if(reviewDigest(signed)!==h.recordDigest||h.recordDigest!==head.recordDigest||r.revision!==head.revision||r.revision!==h.revision||
        r.certificateEpoch!==head.certificateEpoch||r.certificateEpoch!==h.certificateEpoch||r.highWaterEpoch!==head.highWaterEpoch||r.highWaterEpoch!==h.highWaterEpoch||
        r.state!==head.state||r.state!==h.state||r.decisionId!==h.decisionId||r.decisionRevision!==h.decisionRevision||r.decisionIntentDigest!==h.decisionIntentDigest||
        r.ownerId!==h.ownerId||r.requestId!==h.requestId||r.profile.certificate.fingerprint!==h.currentPin||(r.staged?.certificate.fingerprint??null)!==h.stagedPin||
        r.identity.workspaceId!==workspaceId||r.identity.hostId!==hostId||!equal(r.identity,g.identity)||reviewDigest(g.identity)!==g.identityDigest||
        g.workspaceId!==workspaceId||g.hostId!==hostId||g.installationId!==r.identity.installationId||g.credentialId!==r.identity.credentialId)deny("anchor_changed");
      return signed;
    },
    async decision(id){
      if(!scope)deny("identity_changed");
      const workspaceId=scope!.identity.workspaceId;
      const d=await db.decision.findFirst({where:{id,workspaceId,status:"accepted"},select:{id:true}});
      const r=await db.transportDecisionRevisionSource.findUnique({where:{decisionId:id}});
      const a=await db.transportDecisionAcceptanceSource.findUnique({where:{decisionId:id}});
      // Accepted supersession is terminal, independent of current status text.
      const superseded=await db.decision.findFirst({where:{workspaceId,supersedesId:id,status:"accepted"},select:{id:true}});
      const body=r?.body as Record<string,unknown>|undefined,authority=a?.authority as Record<string,unknown>|undefined;
      const parsed=workerTransportIntent.safeParse(body?.workerTransport);
      if(!d||!r||!a||superseded||r.workspaceId!==workspaceId||a.workspaceId!==workspaceId||a.actorUserId!==scope!.ownerId||a.actorAgentId||a.actorCredentialId||
        authority?.status!=="owner_reserved"||body?.authority||body?.workerCredential||!parsed.success||parsed.data.identity.workspaceId!==workspaceId||parsed.data.identity.hostId!==scope!.identity.hostId)return null;
      decision={id,revision:r.version,intent:parsed.data};
      const payload:TransportDecision={id,revision:r.version,ownerId:a.actorUserId!,state:"accepted",intentDigest:reviewDigest(parsed.data),
        acceptedAt:a.createdAt.toISOString(),expiresAt:parsed.data.action==="revoke"?parsed.data.validUntil:parsed.data.expiresAt};
      return {payload,signature:(await signer.sign(transportSignedBytes("decision",payload))).toString("hex")};
    },
    async used(requestId,decisionId){return !!await db.workerTransportHistory.findFirst({where:{OR:[{requestId},{decisionId}]},select:{id:true}});},
    async pinUsed(workspaceId,hostId,pin){scoped(workspaceId,hostId);return !!await db.workerTransportHistory.findFirst({where:{workspaceId,hostId,OR:[{currentPin:pin},{stagedPin:pin}]},select:{id:true}});},
    async append(input){
      write();if(pending||!headLoaded||!scope||!decision)deny();
      const signed=persistedSignedTransport.parse(input),r=signed.payload,i=decision!.intent,old=head?.history;
      scoped(r.identity.workspaceId,r.identity.hostId);
      if(r.decisionId!==decision!.id||r.decisionRevision!==decision!.revision||r.decisionIntentDigest!==reviewDigest(i)||r.ownerId!==scope!.ownerId||
        !equal(r.identity,i.identity)||!equal(r.profile,i.profile)||!equal(r.staged,i.staged)||r.expiresAt!==i.expiresAt||r.certificateEpoch!==i.certificateEpoch||
        r.revision!==(head?.revision??0)+1||i.expectedRevision!==(head?.revision??0)||i.expectedDigest!==(head?.recordDigest??null)||
        r.state!==(i.action==="revoke"?"revoked":"current"))deny("revision_changed");
      const creating=i.action==="create";
      if(creating?(!!old&&old.state!=="revoked"||r.certificateEpoch!==(old?.highWaterEpoch??0)+1||r.highWaterEpoch!==r.certificateEpoch):
        (!old||old.state!=="current"||!equal(old.generation.identity,r.identity)||r.highWaterEpoch<old.highWaterEpoch||r.highWaterEpoch>old.highWaterEpoch+1||r.certificateEpoch<old.certificateEpoch))deny("epoch_invalid");
      const generationId=creating?randomUUID():old!.generationId,historyId=randomUUID(),recordDigest=reviewDigest(signed);
      if(creating)await db.workerTransportGeneration.create({data:{id:generationId,workspaceId:r.identity.workspaceId,hostId:r.identity.hostId,
        installationId:r.identity.installationId,credentialId:r.identity.credentialId,identity:r.identity,identityDigest:reviewDigest(r.identity)}});
      await db.workerTransportHistory.create({data:{id:historyId,workspaceId:r.identity.workspaceId,hostId:r.identity.hostId,generationId,revision:r.revision,recordDigest,
        previousRevision:old?.revision??null,previousDigest:old?.recordDigest??null,previousHighWater:old?.highWaterEpoch??null,previousState:old?.state??null,previousGenerationId:old?.generationId??null,
        certificateEpoch:r.certificateEpoch,highWaterEpoch:r.highWaterEpoch,state:r.state,requestId:r.requestId,decisionId:r.decisionId,decisionRevision:r.decisionRevision,
        decisionIntentDigest:r.decisionIntentDigest,ownerId:r.ownerId,currentPin:r.profile.certificate.fingerprint,stagedPin:r.staged?.certificate.fingerprint??null,
        record:r,signature:signed.signature}});
      const data={workspaceId:r.identity.workspaceId,hostId:r.identity.hostId,historyId,revision:r.revision,recordDigest,certificateEpoch:r.certificateEpoch,highWaterEpoch:r.highWaterEpoch,state:r.state};
      if(head){const result=await db.workerTransportHead.updateMany({where:{workspaceId:data.workspaceId,hostId:data.hostId,revision:head.revision,recordDigest:head.recordDigest},data});if(result.count!==1)deny("revision_changed");}
      else await db.workerTransportHead.create({data});
      pending={historyId,recordDigest,payload:r};
    },
    async audit(record){
      write();if(!pending||audited||!equal(record,pending.payload))deny();
      const event=await db.event.create({data:{workspaceId:record.identity.workspaceId,type:"worker.transport_admission",source:"roost_api",actorType:"user",actorId:record.ownerId,
        resourceType:"worker_transport",resourceId:pending!.historyId,payload:{revision:record.revision,state:record.state,recordDigest:pending!.recordDigest,decisionId:record.decisionId,launchAuthority:false}},select:{id:true}});
      await db.workerTransportAudit.create({data:{historyId:pending!.historyId,eventId:event.id,recordDigest:pending!.recordDigest}});audited=true;
    }
  };
  return {api,finish(){if(pending&&!audited)deny();}};
}
