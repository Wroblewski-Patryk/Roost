import assert from "node:assert/strict";
import { generateKeyPairSync,randomUUID,sign,createHash } from "node:crypto";
import { fixture as transportFixture } from "./worker-transport-fixture";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { transportPublicKeyDigest,type SignedTransport } from "../modules/api-keys/worker-transport.service";
import { type BootstrapTicket,type BootstrapDecision,type BootstrapIntent } from "../modules/api-keys/worker-bootstrap-contract";
import { createWorkerBootstrapService,bootstrapSignedBytes,bootstrapProofDigest,type BootstrapStore,type BootstrapTx,type BootstrapContext,
  type BootstrapAttempt,type BootstrapExchange } from "../modules/api-keys/worker-bootstrap.service";
const copy=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64),secret="synthetic-bootstrap-wire-only";
export function bootstrapFixture(){
  const normal=transportFixture(),keys=generateKeyPairSync("ed25519"),publicKey=keys.publicKey.export({type:"spki",format:"pem"}).toString();
  let now=Date.parse(normal.iso()),calls=0,commits=0,reads=0,fault="";
  const iso=(delta=0)=>new Date(now+delta).toISOString(),proof=()=>Buffer.alloc(48,7);
  const binding={workspaceId:randomUUID(),installationId:randomUUID(),installationEpoch:1,hostId:randomUUID(),hostEpoch:1,hostFingerprint:pin("a"),
    ticketKeyId:"synthetic-bootstrap-issuer",ticketKeyEpoch:1,ticketPublicKeyDigest:transportPublicKeyDigest(publicKey)};
  const context:BootstrapContext={binding,ownerId:randomUUID(),ownerActive:true,hostActive:true,installationActive:true,publicKey,
    channel:{revision:1,certificateEpoch:1,highWaterEpoch:1,profile:normal.intent().profile,validUntil:iso(120000)},
    enrollmentGeneration:0,credentialHighWater:0,credential:null,credentialActive:false,credentialAcknowledged:false,prior:null};
  const seal=<T>(kind:"ticket"|"decision"|"peer"|"completion",payload:T):SignedTransport<T>=>({payload:copy(payload),signature:sign(null,bootstrapSignedBytes(kind,payload),keys.privateKey).toString("hex")});
  let ticket:BootstrapTicket,decision:BootstrapDecision;
  const tickets=new Map<string,{signed:SignedTransport<BootstrapTicket>;revoked:boolean}>(),decisions=new Map<string,SignedTransport<BootstrapDecision>>();
  function issue(purpose:BootstrapIntent["purpose"]="first_enrollment"){
    const i:BootstrapIntent={schemaVersion:"worker-bootstrap-admission-v1",purpose,binding:copy(context.binding),requestId:randomUUID(),deviceProofDigest:bootstrapProofDigest(proof()),
      channel:copy(context.channel),baseline:{enrollmentGeneration:context.enrollmentGeneration,credentialHighWater:context.credentialHighWater,credential:copy(context.credential)},
      target:{id:randomUUID(),version:1,epoch:context.credentialHighWater+1,fingerprint:pin(context.credentialHighWater?"f":"b")},prior:copy(context.prior),expiresAt:iso(60000)};
    decision={id:randomUUID(),revision:1,ownerId:context.ownerId,authority:"owner_reserved",state:"accepted",intentDigest:reviewDigest(i),acceptedAt:iso(),expiresAt:iso(60000)};
    ticket={version:"worker-bootstrap-owner-ticket-v1",id:randomUUID(),ownerId:context.ownerId,ownerAuthAt:iso(),issuedAt:iso(),decisionId:decision.id,
      decisionRevision:1,decisionIntentDigest:reviewDigest(i),intent:i};
    resign();return ticket;
  }
  function resign(){decision.intentDigest=reviewDigest(ticket.intent);ticket.decisionIntentDigest=decision.intentDigest;
    tickets.set(ticket.id,{signed:seal("ticket",ticket),revoked:false});decisions.set(decision.id,seal("decision",decision));}
  let ledger:BootstrapAttempt[]=[],tail=Promise.resolve();
  const hooks:{read?:()=>void;before?:()=>void;after?:()=>void;peer?:any;completion?:any;skip?:boolean;duplicate?:boolean;badPeerSignature?:boolean;badCompletionSignature?:boolean;wait?:Promise<void>}={};
  function txFor(rows:BootstrapAttempt[],c:BootstrapContext,writable:boolean):BootstrapTx{return {
    ticket:async id=>copy(tickets.get(id)??null),decision:async id=>copy(decisions.get(id)??null),context:async()=>copy(c),attempt:async id=>copy(rows.find(a=>a.ticketId===id)??null),
    reserve:async(a,t)=>{assert.ok(writable);if(rows.some(x=>x.ticketId===a.ticketId||x.decisionId===a.decisionId||x.requestId===a.requestId)||
      c.enrollmentGeneration!==t.intent.baseline.enrollmentGeneration||c.credentialHighWater!==t.intent.baseline.credentialHighWater)throw Error("synthetic uniqueness");
      rows.push(copy(a));c.enrollmentGeneration++;c.credentialHighWater=t.intent.target.epoch;if(fault==="reserve")throw Error("synthetic rollback");},
    transition:async(id,from,to)=>{assert.ok(writable);const a=rows.find(x=>x.id===id);if(!a||a.state!==from)return false;a.state=to;
      if(fault===to)throw Error("synthetic rollback");return true;}
  };}
  const store:BootstrapStore={qualification:"synthetic_bootstrap_ledger_v1",transaction:async work=>{
    const before=tail;let unlock!:()=>void;tail=new Promise<void>(r=>unlock=r);await before;const rows=copy(ledger),c=copy(context);
    try{const result=await work(txFor(rows,c,true));ledger=rows;Object.assign(context,c);return result;}finally{unlock();}},
    read:async work=>{reads++;hooks.read?.();await tail;return work(txFor(copy(ledger),copy(context),false));}};
  const wires:Buffer[]=[],proofs:Buffer[]=[];
  const exchange:BootstrapExchange={qualification:"synthetic_bootstrap_exchange_v1",run:async input=>{
    calls++;proofs.push(input.deviceProof);assert.ok(Object.isFrozen(input.permit.intent.channel.profile));await hooks.wait;hooks.before?.();
    const i=input.permit.intent,p=i.channel.profile,a=input.permit.attempt;
    const peer=seal("peer",{binding:i.binding,attemptId:a.id,ticketDigest:a.ticketDigest,certificateEpoch:i.channel.certificateEpoch,
      origin:p.origin,serverName:p.serverName,caDigest:p.trust.caDigest,pin:p.certificate.fingerprint,certificateNotBefore:p.certificate.notBefore,certificateNotAfter:p.certificate.notAfter,
      addresses:["8.8.8.8"],peerAddress:"8.8.8.8",observedAt:iso(),expiresAt:iso(30000),resolverPolicy:"public_ipv4_only_v1" as const,
      source:"issuer_signed_peer_observation_v1" as const,chainValid:true as const,hostnameValid:true as const,proxy:false as const,redirect:false as const,downgrade:false as const,...hooks.peer});
    if(hooks.badPeerSignature)peer.signature=pin("0").repeat(2);
    if(!hooks.skip&&!await input.beforeSend(peer))throw Error(secret);
    if(hooks.duplicate)assert.equal(await input.beforeSend(peer),false);
    commits++;context.credential=copy(i.target);context.credentialActive=true;context.credentialAcknowledged=true;
    const ownedWire=Buffer.from(secret);wires.push(ownedWire);
    const completion=seal("completion",{version:"worker-bootstrap-completion-v1" as const,attemptId:a.id,ticketDigest:a.ticketDigest,requestId:a.requestId,
      state:"acknowledged" as const,credential:i.target,peer:peer.payload,responseDigest:createHash("sha256").update(ownedWire).digest("hex"),committedAt:iso(),...hooks.completion});
    if(hooks.badCompletionSignature)completion.signature=pin("0").repeat(2);
    hooks.after?.();return {completion,ownedWire};
  }};
  issue();const service=createWorkerBootstrapService(store,exchange,()=>new Date(now));
  const input=()=>({ticketId:ticket.id,deviceProof:proof()});
  return {context,tickets,decisions,seal,issue,resign,service,store,exchange,input,hooks,wires,proofs,normal,iso,
    ticket:()=>ticket,decision:()=>decision,ledger:()=>copy(ledger),calls:()=>calls,commits:()=>commits,reads:()=>reads,fault:(v:string)=>fault=v,advance:(ms:number)=>now+=ms};
}
