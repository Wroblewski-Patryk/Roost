import { createHash,createPublicKey,randomUUID,verify } from "node:crypto";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { productionPeerAddress } from "./worker-transport-contract";
import { transportPublicKeyDigest,type SignedTransport } from "./worker-transport.service";
import { freezePublic } from "./worker-transport-snapshot";
import { bootstrapInput,bootstrapOwnerTicket,bootstrapOwnerDecision,bootstrapPeer,bootstrapCompletion,
  type BootstrapTicket,type BootstrapDecision,type BootstrapBinding,type BootstrapIntent,type BootstrapCredential,type BootstrapPeer,type BootstrapCompletion } from "./worker-bootstrap-contract";

export const bootstrapSignedBytes=(kind:"ticket"|"decision"|"peer"|"completion",value:unknown)=>Buffer.from(`roost-worker-bootstrap-v1:${kind}:${reviewDigest(value)}`);
export const bootstrapProofDigest=(value:Buffer)=>createHash("sha256").update("roost-worker-bootstrap-device-v1:").update(value).digest("hex");
export type BootstrapContext={binding:BootstrapBinding;ownerId:string;ownerActive:boolean;hostActive:boolean;installationActive:boolean;publicKey:string;
  channel:BootstrapIntent["channel"];enrollmentGeneration:number;credentialHighWater:number;credential:BootstrapCredential|null;
  credentialActive:boolean;credentialAcknowledged:boolean;prior:BootstrapIntent["prior"]};
export type BootstrapAttempt={id:string;ticketId:string;ticketDigest:string;decisionId:string;requestId:string;binding:BootstrapBinding;target:BootstrapCredential;
  state:"consumed"|"dispatched"|"acknowledged"|"blocked"|"delivery_unknown";expiresAt:string};
export interface BootstrapTx{
  ticket(id:string):Promise<{signed:SignedTransport<BootstrapTicket>;revoked:boolean}|null>;
  decision(id:string):Promise<SignedTransport<BootstrapDecision>|null>;
  context(binding:BootstrapBinding):Promise<BootstrapContext|null>;
  attempt(ticketId:string):Promise<BootstrapAttempt|null>;
  // Atomic uniqueness for ticket, decision, enrollment request and host generation;
  // reserve also advances both watermarks. A failed attempt never unburns them.
  reserve(attempt:BootstrapAttempt,ticket:BootstrapTicket):Promise<void>;
  transition(id:string,from:BootstrapAttempt["state"],to:BootstrapAttempt["state"],evidence?:{peer?:SignedTransport<BootstrapPeer>;completion?:SignedTransport<BootstrapCompletion>}):Promise<boolean>;
}
export interface BootstrapStore{qualification:"synthetic_bootstrap_ledger_v1";
  transaction<T>(work:(tx:BootstrapTx)=>Promise<T>):Promise<T>;
  read<T>(work:(tx:BootstrapTx)=>Promise<T>):Promise<T>;
}
export type BootstrapPermit={qualification:"synthetic_bootstrap_enrollment_v1";attempt:BootstrapAttempt;intent:BootstrapIntent};
export type BootstrapExchange={qualification:"synthetic_bootstrap_exchange_v1";
  // Models exactly one bounded bootstrap ceremony, including its separately
  // bound pending-credential delivery/ACK. It is NOT an ordinary poll/ACK client.
  run(input:{permit:BootstrapPermit;deviceProof:Buffer;beforeSend:(peer:SignedTransport<BootstrapPeer>)=>Promise<boolean>}):Promise<{
    completion:SignedTransport<BootstrapCompletion>;ownedWire:Buffer}>
};
const flags={transportQualified:false,implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false,launchAuthority:false} as const;
class BootstrapDenied extends Error{constructor(public code:string){super(code);}}
const deny=(code:string):never=>{throw new BootstrapDenied(code);};
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export function verifyBootstrapSignature(kind:"ticket"|"decision"|"peer"|"completion",value:SignedTransport<unknown>,c:BootstrapContext){
  return /^[a-f0-9]{128}$/.test(value?.signature??"")&&transportPublicKeyDigest(c.publicKey)===c.binding.ticketPublicKeyDigest&&
    verify(null,bootstrapSignedBytes(kind,value.payload),createPublicKey(c.publicKey),Buffer.from(value.signature,"hex"));
}
const signed=verifyBootstrapSignature;
export async function authorizeWorkerBootstrap(tx:BootstrapTx,ticketId:string,phase:"initial"|"reserved"|"complete",clock=()=>new Date()){
    const row=await tx.ticket(ticketId);if(!row||row.revoked)deny("ticket_revoked");
    const ticket=bootstrapOwnerTicket.parse(row!.signed.payload),i=ticket.intent,c=await tx.context(i.binding),now=clock().getTime();
    if(ticket.id!==ticketId||!c||!c.ownerActive||!c.hostActive||!c.installationActive||c.ownerId!==ticket.ownerId||!same(c.binding,i.binding)||!same(c.channel,i.channel)||!signed("ticket",row!.signed,c))deny("binding_changed");
    const issued=Date.parse(ticket.issuedAt),expires=Date.parse(i.expiresAt),ownerAuth=Date.parse(ticket.ownerAuthAt),cert=i.channel.profile.certificate;
    if(issued>now||issued<ownerAuth||now-ownerAuth>300000||expires<=now||expires>issued+120000||expires>Date.parse(i.channel.validUntil)||
      Date.parse(cert.notBefore)>now||Date.parse(cert.notAfter)<expires)deny("expired");
    const d=await tx.decision(ticket.decisionId),parsed=bootstrapOwnerDecision.safeParse(d?.payload);
    if(!parsed.success||!d||!signed("decision",d,c!)||parsed.data.id!==ticket.decisionId||parsed.data.revision!==ticket.decisionRevision||parsed.data.ownerId!==ticket.ownerId||
      parsed.data.state!=="accepted"||parsed.data.intentDigest!==reviewDigest(i)||ticket.decisionIntentDigest!==reviewDigest(i)||
      Date.parse(parsed.data.acceptedAt)>issued||Date.parse(parsed.data.expiresAt)<expires)deny("decision_changed");
    const consumed=phase!=="initial";
    if(c!.enrollmentGeneration!==i.baseline.enrollmentGeneration+(consumed?1:0)||c!.credentialHighWater!==(consumed?i.target.epoch:i.baseline.credentialHighWater))deny("generation_changed");
    if(phase==="complete"){
      if(!same(c!.credential,i.target)||!c!.credentialActive||!c!.credentialAcknowledged)deny("candidate_changed");
    }else if(!same(c!.credential,i.baseline.credential)||c!.credentialActive)deny("normal_admission_required");
    if(i.purpose==="first_enrollment"?c!.prior!==null:!same(c!.prior,i.prior))deny("recovery_denied");
    return {ticket,context:c!,ticketDigest:reviewDigest(row!.signed)};
  }
export function bootstrapPeerMatches(value:SignedTransport<BootstrapPeer>,ticket:BootstrapTicket,c:BootstrapContext,attempt:BootstrapAttempt,clock=()=>new Date()){
    const p=bootstrapPeer.parse(value.payload),now=clock().getTime(),channel=ticket.intent.channel,profile=channel.profile;
    return signed("peer",value,c)&&same(p.binding,ticket.intent.binding)&&p.attemptId===attempt.id&&p.ticketDigest===attempt.ticketDigest&&
      p.origin===profile.origin&&p.serverName===profile.serverName&&p.caDigest===profile.trust.caDigest&&p.pin===profile.certificate.fingerprint&&p.certificateEpoch===channel.certificateEpoch&&
      p.certificateNotBefore===profile.certificate.notBefore&&p.certificateNotAfter===profile.certificate.notAfter&&
      p.addresses.every(productionPeerAddress)&&productionPeerAddress(p.peerAddress)&&p.addresses.includes(p.peerAddress)&&
      Date.parse(p.observedAt)<=now&&now-Date.parse(p.observedAt)<=30000&&Date.parse(p.expiresAt)>now&&Date.parse(p.expiresAt)<=Date.parse(p.observedAt)+30000;
  }
export function createWorkerBootstrapService(store?:BootstrapStore,exchange?:BootstrapExchange,clock=()=>new Date()){
  const authorize=(tx:BootstrapTx,ticketId:string,phase:"initial"|"reserved"|"complete")=>authorizeWorkerBootstrap(tx,ticketId,phase,clock);
  const peerMatches=(value:SignedTransport<BootstrapPeer>,ticket:BootstrapTicket,c:BootstrapContext,attempt:BootstrapAttempt)=>bootstrapPeerMatches(value,ticket,c,attempt,clock);
  async function terminal(ticketId:string,state:"blocked"|"delivery_unknown"){
    await store!.transaction(async tx=>{const a=await tx.attempt(ticketId);if(a&&(a.state==="consumed"||a.state==="dispatched"||state==="delivery_unknown"&&a.state==="acknowledged"))
      if(!await tx.transition(a.id,a.state,state))deny("conflict");});
  }
  return Object.freeze({
    async consume(...args:unknown[]){
      let ticketId:string|undefined,claimed=false,exchangeStarted=false,wire:Buffer|undefined;
      let closed=false,timer:ReturnType<typeof setTimeout>|undefined,deadline=Infinity;
      const live=()=>!closed&&Date.now()<deadline;
      try{
        if(store?.qualification!=="synthetic_bootstrap_ledger_v1"||typeof store.transaction!=="function"||typeof store.read!=="function"||
          exchange?.qualification!=="synthetic_bootstrap_exchange_v1"||typeof exchange.run!=="function")deny("unavailable");
        if(args.length!==1)deny("request_invalid");const input=bootstrapInput.parse(args[0]);ticketId=input.ticketId;
        const permit=await store!.transaction(async tx=>{
          if(await tx.attempt(input.ticketId))deny("replay");
          const {ticket,ticketDigest}=await authorize(tx,input.ticketId,"initial");
          if(bootstrapProofDigest(input.deviceProof)!==ticket.intent.deviceProofDigest)deny("device_denied");
          const attempt:BootstrapAttempt={id:randomUUID(),ticketId:ticket.id,ticketDigest,decisionId:ticket.decisionId,requestId:ticket.intent.requestId,
            binding:ticket.intent.binding,target:ticket.intent.target,state:"consumed",expiresAt:ticket.intent.expiresAt};
          if(ticket.id!==input.ticketId)deny("ticket_changed");await tx.reserve(attempt,ticket);
          return freezePublic({qualification:"synthetic_bootstrap_enrollment_v1" as const,attempt,intent:ticket.intent});
        });claimed=true;
        await store!.read(async tx=>{const a=await tx.attempt(ticketId!);const {ticketDigest}=await authorize(tx,ticketId!,"reserved");
          if(!a||a.id!==permit.attempt.id||a.state!=="consumed"||a.ticketDigest!==ticketDigest)deny("replay");});
        let peerSeen=false,invalidPeer=false,approvedPeer:SignedTransport<BootstrapPeer>|undefined;
        exchangeStarted=true;deadline=Date.now()+10000;
        const pending=exchange!.run({permit,deviceProof:input.deviceProof,beforeSend:async peer=>{
          if(peerSeen||!live()){invalidPeer=true;return false;}peerSeen=true;
          try{return await store!.transaction(async tx=>{
            const a=await tx.attempt(ticketId!),{ticket,context,ticketDigest}=await authorize(tx,ticketId!,"reserved");
            if(!a||a.id!==permit.attempt.id||a.state!=="consumed"||ticketDigest!==a.ticketDigest||!peerMatches(peer,ticket,context,a))deny("peer_denied");
            if(!live()||!await tx.transition(a!.id,"consumed","dispatched",{peer}))deny("replay");approvedPeer=structuredClone(peer);return true;
          }).then(approved=>approved&&live()&&Date.parse(permit.intent.expiresAt)>clock().getTime());}catch{invalidPeer=true;return false;}
        }});
        void pending.then(r=>{if(!live()&&Buffer.isBuffer(r?.ownedWire))r.ownedWire.fill(0);},()=>{});
        const response=await Promise.race([pending,new Promise<never>((_,reject)=>{
          timer=setTimeout(()=>{closed=true;reject(new BootstrapDenied("expired"));},10000);
        })]);wire=response.ownedWire;
        if(!live()||invalidPeer||!approvedPeer||!Buffer.isBuffer(wire)||wire.length>8192)deny("completion_denied");
        const completed=await store!.transaction(async tx=>{
          const a=await tx.attempt(ticketId!),{ticket,context,ticketDigest}=await authorize(tx,ticketId!,"complete"),r=bootstrapCompletion.parse(response.completion.payload);
          if(!a||a.state!=="dispatched"||a.id!==permit.attempt.id||ticketDigest!==a.ticketDigest||!signed("completion",response.completion,context)||
            r.attemptId!==a.id||r.ticketDigest!==a.ticketDigest||r.requestId!==a.requestId||!same(r.credential,ticket.intent.target)||!same(r.peer,approvedPeer!.payload)||
            r.responseDigest!==createHash("sha256").update(wire!).digest("hex")||!live()||invalidPeer||
            !peerMatches(approvedPeer!,ticket,context,a)||Date.parse(r.committedAt)>clock().getTime()||Date.parse(r.committedAt)<Date.parse(ticket.issuedAt))deny("completion_denied");
          if(!await tx.transition(a!.id,"dispatched","acknowledged",{completion:response.completion}))deny("replay");
          if(!live()||Date.parse(ticket.intent.expiresAt)<=clock().getTime())deny("expired");return ticket.intent.target;
        });
        if(!live()||Date.parse(permit.intent.expiresAt)<=clock().getTime())deny("expired");
        return {ok:true,state:"acknowledged",credential:completed,normalAdmissionRequired:true,...flags};
      }catch(e){
        if(claimed&&ticketId){try{await terminal(ticketId,exchangeStarted?"delivery_unknown":"blocked");}catch{return {ok:false,error:"reconciliation_required",...flags};}}
        return {ok:false,error:exchangeStarted?"delivery_unknown":e instanceof BootstrapDenied?e.code:"unavailable",...flags};
      }finally{
        closed=true;if(timer)clearTimeout(timer);if(Buffer.isBuffer(wire))wire.fill(0);
        const proof=args[0]&&Object.getOwnPropertyDescriptor(args[0],"deviceProof")?.value;if(Buffer.isBuffer(proof))proof.fill(0);
      }
    },
    async status(input:unknown){
      try{
        if(store?.qualification!=="synthetic_bootstrap_ledger_v1"||typeof store.read!=="function")deny("unavailable");
        const parsed=bootstrapInput.parse(input);
        return await store!.read(async tx=>{
          const a=await tx.attempt(parsed.ticketId),{ticket}=await authorize(tx,parsed.ticketId,a?.state==="acknowledged"?"complete":a?"reserved":"initial");
          if(bootstrapProofDigest(parsed.deviceProof)!==ticket.intent.deviceProofDigest)deny("device_denied");
          return {ok:true,state:a?.state??"unconsumed",expiresAt:ticket.intent.expiresAt,...flags};
        });
      }catch{return {ok:false,error:"status_denied",...flags};}
      finally{const proof=input&&Object.getOwnPropertyDescriptor(input,"deviceProof")?.value;if(Buffer.isBuffer(proof))proof.fill(0);}
    }
  });
}
