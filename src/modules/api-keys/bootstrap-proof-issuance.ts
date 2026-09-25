import {z} from 'zod';
import type {AttestationDb as Db} from './decision-attestation-sql';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';
import {proofEqual,denyProof} from './bootstrap-proof-key-contract';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {v3Command,v3Authority,v3Envelope,v3Seal,v3Receipt,v3EnvelopeDigest,v3SealDigest,prepareV3Ticket,prepareV3Seal,validateV3Authority,validateV3Plan,
 type V3Command,type V3Authority,type V3Plan,type V3Receipt} from './bootstrap-proof-issuance-contract';

export const v3WritePhases=['reservation','ticket','channel','attempt','link','seal'] as const;
export type V3Phase=typeof v3WritePhases[number];
const bound=z.object({mode:z.enum(['read','write']),isolation:z.enum(['repeatable read','serializable']),readOnly:z.boolean(),origin:z.literal(true),schemaSafe:z.literal(true),
 fence:z.string().regex(/^[1-9][0-9]*$/),writerXid:z.string().regex(/^[1-9][0-9]*$/),locked:z.boolean()}).strict().superRefine((b,c)=>{
  if(b.isolation!==(b.mode==='write'?'serializable':'repeatable read')||b.readOnly!==(b.mode==='read')||b.locked!==(b.mode==='write'))
   c.addIssue({code:'custom',message:'Exact bound transaction mode and source lock required'});
 });
export type V3AuthorityPort={qualification:'injected_canonical_proof_issuance_authority_v3';read:(db:Db,attachmentId:string,operationId:string|null)=>Promise<unknown>};
// External interfaces accept public deterministic transcripts only. No private
// handle, key, signer implementation, network or OS storage adapter is supplied.
export type V3OwnerTicketIssuer={qualification:'injected_owner_ticket_issuer_v3';
 issue:(db:Db,request:Readonly<ReturnType<typeof prepareV3Ticket>>)=>Promise<unknown>;
 verify:(db:Db,request:Readonly<ReturnType<typeof prepareV3Ticket>>,envelope:unknown)=>Promise<boolean>};
export type V3BindingSealer={qualification:'injected_roost_binding_sealer_v3';
 seal:(db:Db,request:Readonly<ReturnType<typeof prepareV3Seal>>)=>Promise<unknown>;
 verify:(db:Db,request:Readonly<ReturnType<typeof prepareV3Seal>>,seal:unknown)=>Promise<boolean>};
export type V3IssuancePorts={qualification:'source_only_proof_issuance_ports_v3';
 // Trusted injected seam only; no native implementation is supplied. The port
 // must prove exact graph/Event/audit and own-XID/fence receipt lineage. Merely
 // returning these public shapes does not establish persistence authority.
 transaction:<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>)=>Promise<T>;
 bound:(db:Db,lock:boolean)=>Promise<unknown>;guards:(db:Db)=>Promise<void>;
 readOperation:(db:Db,command:V3Command)=>Promise<null|{plan:unknown;receipt:unknown}>;
 appendPhase:(db:Db,phase:V3Phase,plan:Readonly<V3Plan>)=>Promise<void>;
 checkImmediate:(db:Db)=>Promise<void>};
export type V3IssuanceDependencies={ports:V3IssuancePorts;authority:V3AuthorityPort;issuer:V3OwnerTicketIssuer;sealer:V3BindingSealer};
const stable=(s:V3Authority)=>{const {at,fence,writerXid,...rest}=s;return rest;};
const qualification=Object.freeze({qualification:'source_only_proof_issuance_v3' as const,persistenceQualified:false,cryptographyQualified:false,...lifecycleFlags});
const failure=(uncertain=false)=>freezePublic({ok:false as const,error:uncertain?'reconciliation_required':'bootstrap_proof_v3_seal_unavailable',retryable:false as const,
 issuanceRecorded:uncertain?null:false,sendPermit:false,...qualification});

export function createBootstrapProofV3Issuance(deps?:V3IssuanceDependencies){
 const seen=new WeakSet<object>(),attempted=new Set<string>();
 function required(){if(deps?.ports?.qualification!=='source_only_proof_issuance_ports_v3'||deps.authority?.qualification!=='injected_canonical_proof_issuance_authority_v3'||
  deps.issuer?.qualification!=='injected_owner_ticket_issuer_v3'||deps.sealer?.qualification!=='injected_roost_binding_sealer_v3')denyProof();
  for(const [owner,names] of [[deps!.ports,['transaction','bound','guards','readOperation','appendPhase','checkImmediate']],[deps!.authority,['read']],[deps!.issuer,['issue','verify']],[deps!.sealer,['seal','verify']]] as const)
   for(const name of names)if(typeof (owner as any)[name]!=='function')denyProof();}
 async function transaction<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>){required();let entered=false,observed:T|undefined;
  const result=await deps!.ports.transaction(mode,async db=>{if(entered||seen.has(db))denyProof();entered=true;seen.add(db);await deps!.ports.guards(db);
   const b=bound.parse(await deps!.ports.bound(db,mode==='write'));
   if(b.mode!==mode||b.isolation!==(mode==='write'?'serializable':'repeatable read')||b.readOnly!==(mode==='read')||b.locked!==(mode==='write'))denyProof();
   observed=await work(db);return observed;});if(!entered||observed===undefined||result!==observed)denyProof();return result;
 }
 async function read(db:Db,c:V3Command){const raw=await deps!.ports.readOperation(db,c);if(raw===null)return null;
  proofBytes(raw);const r=z.object({plan:z.unknown(),receipt:z.unknown()}).strict().parse(raw);
  const p=validateV3Plan(r.plan),receipt=v3Receipt.parse(r.receipt),ctx=p.envelope.signed.payload.context;
  if(!proofEqual(p.command,c)||receipt.operationId!==c.operationId||receipt.attachmentId!==c.attachmentId||receipt.ticketId!==p.authority.attachment.ticketId||receipt.attemptId!==ctx.attemptId||
   receipt.planDigest!==proofDigest(p)||receipt.envelopeDigest!==v3EnvelopeDigest(p.envelope)||receipt.sealDigest!==v3SealDigest(p.seal)||
   receipt.sourceDigest!==p.authority.sourceDigest||receipt.authorityRevision!==p.authority.authorityRevision||receipt.authorityDigest!==p.authority.authorityDigest||
   receipt.writerXid!==p.authority.writerXid||receipt.fromFence!==p.authority.fence||BigInt(receipt.toFence)<=BigInt(receipt.fromFence)||receipt.eventId!==ctx.receiptEventId)denyProof();
  return freezePublic({plan:p,receipt});
 }
 async function authority(db:Db,c:V3Command,operationId:string|null){const value=v3Authority.parse(await deps!.authority.read(db,c.attachmentId,operationId));
  return validateV3Authority({...c,expected:{...c.expected,fence:value.fence}},value).authority;}
 async function unchanged(db:Db,c:V3Command,before:V3Authority,written:boolean){
  const current=await authority(db,c,written?c.operationId:null),b=bound.parse(await deps!.ports.bound(db,false));
  if(!proofEqual(stable(before),stable(current))||current.at<before.at||current.writerXid!==before.writerXid||b.writerXid!==before.writerXid||
   b.mode!=='write'||b.readOnly||b.isolation!=='serializable'||!b.locked||
   current.fence!==b.fence||!written&&current.fence!==before.fence)denyProof();return current;
 }
 const success=(receipt:V3Receipt,idempotent:boolean)=>freezePublic({ok:true as const,idempotent,issuanceRecorded:true,receipt,sendPermit:false,
  blockers:['bootstrap_proof_v3_persistence_unavailable','bootstrap_proof_v3_native_qualification_missing','bootstrap_proof_signature_verifier_unavailable'],...qualification});
 return Object.freeze({qualification:'source_only_proof_issuance_v3' as const,
  async inspect(input:unknown){try{required();proofBytes(input);const c=v3Command.parse(input),r=await transaction('read',db=>read(db,c));
   return r?success(r.receipt,true):freezePublic({ok:true as const,issuanceRecorded:false,receipt:null,sendPermit:false,...qualification});
  }catch{return failure();}},
  async beforeSend(input:unknown){try{required();proofBytes(input);const c=v3Command.parse(input),r=await transaction('read',async db=>{
    const op=await read(db,c);if(!op)denyProof();const current=await authority(db,c,c.operationId),b=bound.parse(await deps!.ports.bound(db,false));
    if(b.mode!=='read'||current.writerXid!==b.writerXid||current.fence!==b.fence||!proofEqual(stable(current),stable(op!.plan.authority))||current.fence!==op!.receipt.toFence)denyProof();return op;
   });return freezePublic({...success(r!.receipt,true),authorityCurrent:true,sendPermit:false});
  }catch{return failure();}},
  async issue(input:unknown){let possibleCommit=false,replayed=false;
   try{required();proofBytes(input);const c=freezePublic(v3Command.parse(input)),existing=await transaction('read',db=>read(db,c));if(existing)return success(existing.receipt,true);
    // Process-local retry suppression only, never durable authority. A new
    // process must reconcile an uncertain command instead of resubmitting it.
    if(attempted.has(c.operationId))return failure(true);if(attempted.size>=128)denyProof();
    const prepared=await transaction('write',async db=>{
     const replay=await read(db,c);if(replay){possibleCommit=true;replayed=true;return replay;}
     if(attempted.has(c.operationId))denyProof();
     const s=validateV3Authority(c,await deps!.authority.read(db,c.attachmentId,null)).authority,b=bound.parse(await deps!.ports.bound(db,false));
     if(s.fence!==b.fence||s.writerXid!==b.writerXid)denyProof();
     const request=prepareV3Ticket(c,s),e=v3Envelope.parse(await deps!.issuer.issue(db,request));
     const issuerAccepted=await deps!.issuer.verify(db,request,freezePublic(e));await unchanged(db,c,s,false);if(issuerAccepted!==true)denyProof();
     const sealRequest=prepareV3Seal(c,s,e),seal=v3Seal.parse(await deps!.sealer.seal(db,sealRequest));
     const sealerAccepted=await deps!.sealer.verify(db,sealRequest,freezePublic(seal));await unchanged(db,c,s,false);if(sealerAccepted!==true)denyProof();
     const plan=validateV3Plan({version:'bootstrap-proof-issuance-plan-v3',command:c,authority:s,envelope:e,seal,link:{...sealRequest.payload.linkBinding,sealDigest:v3SealDigest(seal)}});
     possibleCommit=true;attempted.add(c.operationId);
     for(const phase of v3WritePhases){await deps!.ports.appendPhase(db,phase,plan);await unchanged(db,c,s,true);}
     await deps!.ports.checkImmediate(db);const written=await read(db,c);if(!written||!proofEqual(written.plan,plan))denyProof();await unchanged(db,c,s,true);return written;
    });
    const committed=await transaction('read',db=>read(db,c));if(!committed||!proofEqual(committed,prepared))denyProof();return success(committed.receipt,replayed);
   }catch{return failure(possibleCommit);}
  }
 });
}
