import { createHash, createPublicKey, verify } from "node:crypto";
import type { AuthContext } from "../../auth/api-key.middleware";
import type { OwnerTicketSigner } from "../agent-runtime/owner-ticket";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { freshWorkerOwner } from "./worker-credential.service";
import { admissionSnapshot, handoffOperation, handoffPeerObservation, snapshotFromRecord } from "./worker-transport-snapshot";
import { workerTransportCommand, transportAnchor, transportObservation, productionPeerAddress,
  type TransportCommand, type TransportIdentity, type TransportIntent } from "./worker-transport-contract";

export type TransportRecord={version:"worker-transport-record-v1";identity:TransportIdentity;revision:number;certificateEpoch:number;highWaterEpoch:number;
  profile:TransportIntent["profile"];staged:TransportIntent["staged"];state:"current"|"revoked";ownerId:string;
  decisionId:string;decisionRevision:number;decisionIntentDigest:string;approvedAt:string;expiresAt:string;requestId:string};
export type TransportDecision={id:string;revision:number;ownerId:string;state:"accepted"|"revoked";intentDigest:string;acceptedAt:string;expiresAt:string};
export type SignedTransport<T>={payload:T;signature:string};
export type TransportContext={identity:TransportIdentity;ownerId:string;ownerActive:boolean;hostActive:boolean;credentialActive:boolean;publicKey:string};
export interface WorkerTransportTx {
  context(workspaceId:string,hostId:string):Promise<TransportContext|null>;
  head(workspaceId:string,hostId:string):Promise<SignedTransport<TransportRecord>|null>;
  decision(id:string):Promise<SignedTransport<TransportDecision>|null>;
  used(requestId:string,decisionId:string):Promise<boolean>;
  pinUsed(workspaceId:string,hostId:string,pin:string):Promise<boolean>;
  append(record:SignedTransport<TransportRecord>):Promise<void>;
  audit(record:TransportRecord):Promise<void>;
}
export interface WorkerTransportStore {
  transaction<T>(work:(tx:WorkerTransportTx)=>Promise<T>):Promise<T>;
  read?<T>(work:(tx:WorkerTransportTx)=>Promise<T>):Promise<T>;
}
export function transportPublicKeyDigest(pem:string){
  const key=createPublicKey(pem);if(key.asymmetricKeyType!=="ed25519")throw new Error("transport_issuer_key_invalid");
  return createHash("sha256").update(key.export({type:"spki",format:"der"})).digest("hex");
}
export const transportSignedBytes=(kind:"record"|"decision"|"observation",value:unknown)=>Buffer.from(`roost-worker-transport-v1:${kind}:${reviewDigest(value)}`);
const flags=Object.freeze({transportQualified:false,implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false});
export class TransportDenied extends Error {constructor(public code:string){super(code);}}
const deny=(code:string):never=>{throw new TransportDenied(code);};
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
function signed(kind:"record"|"decision"|"observation",value:SignedTransport<any>,context:TransportContext){
  return /^[a-f0-9]{128}$/.test(value?.signature??"")&&transportPublicKeyDigest(context.publicKey)===context.identity.ticketPublicKeyDigest&&
    verify(null,transportSignedBytes(kind,value.payload),createPublicKey(context.publicKey),Buffer.from(value.signature,"hex"));
}
function validCertificate(c:TransportIntent["profile"]["certificate"],now:number,until:number){
  return Date.parse(c.notBefore)<=now&&Date.parse(c.notAfter)>now&&Date.parse(c.notAfter)>=until;
}
function validStage(i:TransportIntent,now:number){
  const s=i.staged;if(!s)return false;
  const start=Date.parse(s.overlapStartsAt),cut=Date.parse(s.cutoverAt),end=Date.parse(s.expiresAt);
  return s.epoch===i.certificateEpoch+1&&s.certificate.fingerprint!==i.profile.certificate.fingerprint&&s.certificate.hostname===i.profile.serverName&&
    s.bootstrap.fingerprint===s.certificate.fingerprint&&start>=now&&cut>start&&cut-start<=3600000&&end>cut&&end-cut<=3600000&&end<=Date.parse(i.expiresAt)&&
    validCertificate(s.certificate,now,end);
}
export function createWorkerTransportService(store?:WorkerTransportStore,signer?:OwnerTicketSigner,clock=()=>new Date()){
  async function context(tx:WorkerTransportTx,identity:TransportIdentity,revoking=false){
    const c=await tx.context(identity.workspaceId,identity.hostId);
    if(!c||!c.ownerActive||!revoking&&(!c.hostActive||!c.credentialActive||!same(c.identity,identity)))deny("identity_changed");return c!;
  }
  async function currentDecision(tx:WorkerTransportTx,id:string,revision:number,ownerId:string,c:TransportContext,now:number){
    const d=await tx.decision(id);
    if(!d||!signed("decision",d,c)||d.payload.id!==id||d.payload.revision!==revision||d.payload.ownerId!==ownerId||ownerId!==c.ownerId||
      d.payload.state!=="accepted"||!Number.isFinite(Date.parse(d.payload.acceptedAt))||!Number.isFinite(Date.parse(d.payload.expiresAt))||Date.parse(d.payload.acceptedAt)>now||Date.parse(d.payload.expiresAt)<=now)deny("decision_changed");return d!.payload;
  }
  async function guarded(work:()=>Promise<any>){try{return await work();}catch(e){return {ok:false,error:e instanceof TransportDenied?e.code:"unavailable",...flags};}}
  return {
    command(auth:AuthContext|undefined,body:unknown){return guarded(async()=>{
      const now=clock().getTime();if(!auth||!freshWorkerOwner(auth,new Date(now)))deny("forbidden");if(!store||!signer)deny("unavailable");
      const input=workerTransportCommand.parse(body),i=input.intent;
      if(auth!.workspaceId!==i.identity.workspaceId)deny("forbidden");
      return store!.transaction(async tx=>{
        const c=await context(tx,i.identity,i.action==="revoke");if(auth!.userId!==c.ownerId)deny("forbidden");
        if(signer!.keyId!==c.identity.ticketKeyId||signer!.epoch!==c.identity.ticketKeyEpoch||transportPublicKeyDigest(signer!.publicKey)!==c.identity.ticketPublicKeyDigest)deny("issuer_changed");
        const decision=await currentDecision(tx,input.decisionId,input.decisionRevision,c.ownerId,c,now);
        if(decision.intentDigest!==reviewDigest(i)||Date.parse(i.validUntil)<=now)deny("decision_changed");
        if(await tx.used(input.requestId,input.decisionId))deny("replay");
        const old=await tx.head(i.identity.workspaceId,i.identity.hostId);
        // Re-admission after revoke can change credential/key bindings only by a
        // new exact owner decision and a higher persistent certificate watermark.
        if(i.expectedRevision!==(old?.payload.revision??0)||i.expectedDigest!==(old?reviewDigest(old):null))deny("revision_changed");
        if(old&&i.action!=="create"&&(!same(old.payload.identity,i.identity)||i.action!=="revoke"&&!signed("record",old,c)))deny("identity_changed");
        const until=Date.parse(i.expiresAt);
        if(i.action!=="revoke"&&(!(until>now&&until<=now+86400000)||!validCertificate(i.profile.certificate,now,until)))deny("certificate_invalid");
        let high=old?.payload.highWaterEpoch??0;
        if(i.action==="create"){
          if(old&&old.payload.state!=="revoked"||i.certificateEpoch!==high+1||i.staged||await tx.pinUsed(i.identity.workspaceId,i.identity.hostId,i.profile.certificate.fingerprint))deny("epoch_invalid");
          high=i.certificateEpoch;
        }else{
          if(!old||old.payload.state!=="current")deny("state_changed");const previous=old!.payload;
          if(i.action==="stage"){
            if(previous.staged||i.certificateEpoch!==previous.certificateEpoch||!same(i.profile,previous.profile)||i.expiresAt!==previous.expiresAt||
              !validStage(i,now)||await tx.pinUsed(i.identity.workspaceId,i.identity.hostId,i.staged!.certificate.fingerprint))deny("stage_invalid");
            high=i.staged!.epoch;
          }else if(i.action==="cutover"){
            const s=previous.staged;
            if(!s||now<Date.parse(s.cutoverAt)||now>=Date.parse(s.expiresAt)||i.certificateEpoch!==s.epoch||i.staged||i.expiresAt!==previous.expiresAt||
              !same(i.profile,{...previous.profile,certificate:s.certificate,bootstrap:s.bootstrap}))deny("cutover_invalid");
          }else if(i.certificateEpoch!==previous.certificateEpoch||!same(i.profile,previous.profile)||!same(i.staged,previous.staged)||i.expiresAt!==previous.expiresAt)deny("revoke_invalid");
        }
        const record:TransportRecord={version:"worker-transport-record-v1",identity:i.identity,revision:(old?.payload.revision??0)+1,certificateEpoch:i.certificateEpoch,highWaterEpoch:high,
          profile:i.profile,staged:i.staged,state:i.action==="revoke"?"revoked":"current",ownerId:c.ownerId,decisionId:input.decisionId,decisionRevision:input.decisionRevision,decisionIntentDigest:reviewDigest(i),
          approvedAt:new Date(now).toISOString(),expiresAt:i.expiresAt,requestId:input.requestId};
        const signature=await signer!.sign(transportSignedBytes("record",record)),result={payload:record,signature:signature.toString("hex")};
        if(!signed("record",result,c))deny("signature_invalid");await tx.append(result);await tx.audit(record);
        return {ok:true,record:result,anchor:{identity:i.identity,revision:record.revision,recordDigest:reviewDigest(result),certificateEpoch:record.certificateEpoch,highWaterEpoch:high},...flags};
      });
    });},
    inspect(record:SignedTransport<TransportRecord>,anchorInput:unknown,evidence?:SignedTransport<unknown>){return guarded(async()=>{
      if(!store)deny("unavailable");const now=clock().getTime(),anchor=transportAnchor.parse(anchorInput),observation=evidence?transportObservation.parse(evidence.payload):null;
      return (store!.read ?? store!.transaction)(async tx=>{
        const c=await context(tx,anchor.identity),head=await tx.head(c.identity.workspaceId,c.identity.hostId);
        if(!head||!same(head,record)||!signed("record",record,c)||anchor.recordDigest!==reviewDigest(head)||anchor.revision!==head.payload.revision||
          anchor.certificateEpoch!==head.payload.certificateEpoch||anchor.highWaterEpoch!==head.payload.highWaterEpoch||!same(head.payload.identity,anchor.identity))deny("anchor_changed");
        const r=head!.payload;if(r.state!=="current"||Date.parse(r.expiresAt)<=now||Date.parse(r.approvedAt)>now)deny("admission_expired_or_revoked");
        if((await currentDecision(tx,r.decisionId,r.decisionRevision,r.ownerId,c,now)).intentDigest!==r.decisionIntentDigest)deny("decision_changed");
        const snapshot=snapshotFromRecord(r,reviewDigest(head),now);
        if(!observation)return {ok:true,admission:"synthetic_only",snapshot,receipt:{identity:r.identity,revision:r.revision,recordDigest:reviewDigest(head)},...flags};
        if(!signed("observation",evidence!,c)||!same(observation.identity,r.identity)||observation.origin!==r.profile.origin||observation.serverName!==r.profile.serverName||observation.caDigest!==r.profile.trust.caDigest||
          Date.parse(observation.observedAt)>now||now-Date.parse(observation.observedAt)>30000||Date.parse(observation.expiresAt)<=now||Date.parse(observation.expiresAt)>Date.parse(observation.observedAt)+30000)deny("observation_invalid");
        if(!observation.addresses.every(productionPeerAddress)||!productionPeerAddress(observation.peerAddress)||!observation.addresses.includes(observation.peerAddress))deny("dns_denied");
        const s=r.staged;
        if(s&&now>=Date.parse(s.expiresAt))deny("stage_expired");
        const next=s&&now>=Date.parse(s.overlapStartsAt)&&observation.pin===s.certificate.fingerprint;
        const cert=next?s!.certificate:r.profile.certificate;
        if(s&&now>=Date.parse(s.cutoverAt)&&!next||observation.pin!==cert.fingerprint||!validCertificate(cert,now,now+1)||
          observation.certificateNotBefore!==cert.notBefore||observation.certificateNotAfter!==cert.notAfter)deny("pin_invalid");
        return {ok:true,admission:"synthetic_only",snapshot,receipt:{identity:r.identity,revision:r.revision,recordDigest:reviewDigest(head)},...flags};
      });
    });},
    completeVerified(snapshotInput:unknown,operationInput:unknown,evidence:SignedTransport<unknown>,phase:"before_send"|"complete"){return guarded(async()=>{
      if(!store)deny("unavailable");
      const snapshot=admissionSnapshot.parse(snapshotInput),operation=handoffOperation.parse(operationInput),observation=handoffPeerObservation.parse(evidence.payload);
      if(operation.snapshotDigest!==reviewDigest(snapshot)||!same(observation.operation,operation)||observation.phase!==phase||observation.commitUncertain)deny("observation_invalid");
      return (store!.read??store!.transaction)(async tx=>{
        const c=await context(tx,snapshot.identity),head=await tx.head(snapshot.identity.workspaceId,snapshot.identity.hostId),now=clock().getTime();
        if(!head||!signed("record",head,c)||head.payload.revision!==snapshot.revision||reviewDigest(head)!==snapshot.recordDigest||!same(head.payload.identity,snapshot.identity))deny("anchor_changed");
        const current=snapshotFromRecord(head!.payload,reviewDigest(head),now);
        const {allowedCertificates:originalPins,...originalFields}=snapshot,{allowedCertificates:currentPins,...currentFields}=current;
        if(!same(originalFields,currentFields)||(await currentDecision(tx,current.decisionId,current.decisionRevision,c.ownerId,c,now)).intentDigest!==current.decisionIntentDigest)deny("decision_changed");
        if(!signed("observation",evidence,c)||!same(observation.identity,current.identity)||observation.origin!==current.origin||observation.serverName!==current.serverName||observation.caDigest!==current.caDigest||
          observation.resolverPolicy!==current.resolverPolicy||Date.parse(observation.observedAt)>now||now-Date.parse(observation.observedAt)>30000||Date.parse(observation.expiresAt)<=now||
          Date.parse(observation.expiresAt)>Date.parse(observation.observedAt)+30000||!observation.addresses.every(productionPeerAddress)||!productionPeerAddress(observation.peerAddress)||!observation.addresses.includes(observation.peerAddress))deny("observation_invalid");
        const matches=(p:typeof originalPins[number])=>p.epoch===observation.certificateEpoch&&p.certificate.fingerprint===observation.pin&&p.certificate.notBefore===observation.certificateNotBefore&&p.certificate.notAfter===observation.certificateNotAfter&&validCertificate(p.certificate,now,now+1);
        if(!originalPins.some(matches)||!currentPins.some(matches))deny("pin_invalid");
        return {ok:true,outcome:"synthetic_terminal",phase,...flags};
      });
    });},
    complete(receipt:{identity:TransportIdentity;revision:number;recordDigest:string}){return guarded(async()=>{
      if(!store)deny("unavailable");return (store!.read ?? store!.transaction)(async tx=>{
        const c=await context(tx,receipt.identity),head=await tx.head(c.identity.workspaceId,c.identity.hostId),now=clock().getTime();
        if(!head||!signed("record",head,c)||head.payload.state!=="current"||head.payload.revision!==receipt.revision||reviewDigest(head)!==receipt.recordDigest||Date.parse(head.payload.expiresAt)<=now)
          return {ok:false,error:"delivery_unknown",...flags};
        if((await currentDecision(tx,head.payload.decisionId,head.payload.decisionRevision,head.payload.ownerId,c,now)).intentDigest!==head.payload.decisionIntentDigest)deny("decision_changed");
        return {ok:true,outcome:"synthetic_terminal",...flags};
      });
    });}
  };
}
