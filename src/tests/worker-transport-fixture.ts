import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { createWorkerTransportService, transportPublicKeyDigest, transportSignedBytes,
  type SignedTransport, type TransportRecord, type TransportDecision, type TransportContext, type WorkerTransportStore } from "../modules/api-keys/worker-transport.service";
import { type TransportIntent } from "../modules/api-keys/worker-transport-contract";
const clone=<T>(v:T):T=>structuredClone(v), pin=(n:string)=>n.repeat(64);
export function fixture(headSource?:()=>SignedTransport<TransportRecord>|null){
  const keys=generateKeyPairSync("ed25519"),publicKey=keys.publicKey.export({type:"spki",format:"pem"}).toString();
  let now=Date.parse("2026-09-23T12:00:00.000Z"),fault="";
  const iso=(delta=0)=>new Date(now+delta).toISOString();
  const identity={workspaceId:randomUUID(),installationId:randomUUID(),hostId:randomUUID(),hostFingerprint:pin("a"),credentialId:randomUUID(),credentialVersion:1,credentialEpoch:1,
    credentialFingerprint:pin("b"),ticketKeyId:"synthetic-ticket-issuer",ticketKeyEpoch:1,ticketPublicKeyDigest:transportPublicKeyDigest(publicKey)};
  const context:TransportContext={identity,ownerId:randomUUID(),ownerActive:true,hostActive:true,credentialActive:true,publicKey};
  let ledger={history:[] as SignedTransport<TransportRecord>[],audits:[] as unknown[]};
  const decisions=new Map<string,SignedTransport<TransportDecision>>();
  const seal=<T>(kind:"record"|"decision"|"observation",payload:T):SignedTransport<T>=>({payload:clone(payload),signature:sign(null,transportSignedBytes(kind,payload),keys.privateKey).toString("hex")});
  let tail=Promise.resolve();
  const store:WorkerTransportStore={transaction:async work=>{const before=tail;let unlock!:()=>void;tail=new Promise<void>(r=>unlock=r);await before;
    const draft=clone(ledger);
    try{const result=await work({context:async(w,h)=>w===identity.workspaceId&&h===identity.hostId?clone(context):null,
      head:async()=>clone(draft.history.at(-1)??null),decision:async id=>clone(decisions.get(id)??null),
      used:async(request,decision)=>draft.history.some(r=>r.payload.requestId===request||r.payload.decisionId===decision),
      pinUsed:async(_w,_h,value)=>draft.history.some(r=>r.payload.profile.certificate.fingerprint===value||r.payload.staged?.certificate.fingerprint===value),
      append:async record=>{draft.history.push(clone(record));if(fault==="append")throw Error("synthetic rollback");},
      audit:async record=>{draft.audits.push({revision:record.revision,state:record.state,digest:reviewDigest(record)});if(fault==="audit")throw Error("synthetic rollback");}
    });if(fault==="commit")throw Error("synthetic rollback");ledger=draft;return result;}finally{unlock();}
  }};
  const signer={keyId:identity.ticketKeyId,epoch:1,publicKey,sign:async(bytes:Buffer)=>sign(null,bytes,keys.privateKey)};
  const service=createWorkerTransportService(store,signer,()=>new Date(now));
  const auth=()=>({authType:"user" as const,workspaceRole:"owner" as const,workspaceId:identity.workspaceId,userId:context.ownerId,authenticatedAt:Math.floor(now/1000)});
  function intent(action:TransportIntent["action"]="create"):TransportIntent{
    const current=headSource?headSource():ledger.history.at(-1),old=current?.payload;
    const certificate={fingerprint:pin("c"),hostname:"worker.example.com",notBefore:iso(-3600000),notAfter:iso(86400000)};
    const profile={origin:"https://worker.example.com:443",serverName:"worker.example.com",certificate,trust:{mode:"owner_approved_ca_digest" as const,caDigest:pin("d")},
      resolver:{policy:"public_ipv4_only_v1" as const,evidenceType:"issuer_signed_peer_observation_v1" as const},proxy:false as const,redirect:false as const,downgrade:false as const,
      bootstrap:{source:"owner_out_of_band" as const,evidenceDigest:pin("e"),fingerprint:certificate.fingerprint}};
    const i:TransportIntent={schemaVersion:"worker-transport-admission-v1",action,identity:clone(old?.identity??identity),expectedRevision:old?.revision??0,
      expectedDigest:old?reviewDigest(current):null,certificateEpoch:old?.certificateEpoch??1,profile:clone(old?.profile??profile),staged:clone(old?.staged??null),expiresAt:old?.expiresAt??iso(7200000),validUntil:iso(600000)};
    if(action==="stage")i.staged={epoch:i.certificateEpoch+1,certificate:{...i.profile.certificate,fingerprint:pin("f")},
      bootstrap:{source:"owner_out_of_band",evidenceDigest:pin("0"),fingerprint:pin("f")},overlapStartsAt:iso(1000),cutoverAt:iso(10000),expiresAt:iso(60000)};
    if(action==="cutover"&&old?.staged){i.certificateEpoch=old.staged.epoch;i.profile.certificate=clone(old.staged.certificate);i.profile.bootstrap=clone(old.staged.bootstrap);i.staged=null;}
    return i;
  }
  const command=(i=intent())=>{const id=randomUUID();decisions.set(id,seal("decision",{id,revision:1,ownerId:context.ownerId,state:"accepted",intentDigest:reviewDigest(i),acceptedAt:iso(),expiresAt:iso(7200000)}));
    return {requestId:randomUUID(),decisionId:id,decisionRevision:1,explicitAcceptance:true,intent:i};};
  const observation=(r:TransportRecord,patch:any={})=>seal("observation",{identity:r.identity,origin:r.profile.origin,serverName:r.profile.serverName,pin:r.profile.certificate.fingerprint,
    caDigest:r.profile.trust.caDigest,certificateNotBefore:r.profile.certificate.notBefore,certificateNotAfter:r.profile.certificate.notAfter,
    addresses:["8.8.8.8"],peerAddress:"8.8.8.8",observedAt:iso(),expiresAt:iso(30000),resolverPolicy:"public_ipv4_only_v1",source:"issuer_signed_peer_observation_v1",
    chainValid:true,hostnameValid:true,proxy:false,redirect:false,downgrade:false,...patch});
  const create=()=>service.command(auth(),command());
  return {service,store,signer,auth,context,identity,intent,command,decisions,seal,observation,create,iso,advance:(ms:number)=>now+=ms,
    ledger:()=>clone(ledger),fault:(value:string)=>fault=value};
}
