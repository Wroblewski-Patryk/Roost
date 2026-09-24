import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {attestationDigest as digest,attestationKeyPurpose,projectAttestationKeys} from '../modules/api-keys/decision-attestation-key-model';
import {attestationWriters,attestationSourceVersion,inspectAttestationState,recordAttestationSourceWrite,recordAttestationKeyWrite,
 createAttestationPersistenceModel,AttestationCommitUnknown,type AttestationModelDependencies,type AttestationModelState} from '../modules/api-keys/decision-attestation-persistence-model';
const hash=(s:string)=>s.repeat(64),copy=<T>(x:T):T=>structuredClone(x);
export function attestationPersistenceFixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment',adopt=false,interview=false,noKey=false){
 const f=bootstrapChannelFixture(purpose),b:any={decisionId:f.ticket.decisionId,decisionRevision:1,revisionDigest:hash('1'),acceptanceId:randomUUID(),ownerId:f.ticket.ownerId,
  binding:copy(f.snapshot.binding),purpose,intentDigest:hash('2'),evidenceDigest:hash('3'),ticketId:f.ticket.id,ticketContentDigest:hash('4'),ticketEnvelopeDigest:hash('5'),
  hostGeneration:f.snapshot.hostGeneration,installationGeneration:f.snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:hash('6'),
  channelGrantId:randomUUID(),channelGrantRevision:1,channelGrantDigest:hash('7'),policyRevision:1,validFrom:f.iso(-500),expiresAt:f.iso(60000)};
 let state:AttestationModelState={qualification:'synthetic_attestation_persistence_v1',canonical:{ceremony:b,primaryOwnerId:b.ownerId,ownerMembershipIds:[b.ownerId],
  candidateCount:1,status:'proposed',authorityRevision:0,acceptance:null,auth:null},keys:[],attestations:[],seals:[],journal:[],receipts:[],fence:1,
  guards:attestationWriters.map(writer=>({writer,enabled:true,binding:'exact',definition:'reviewed',configuration:'exact'})),origin:true};
 state=recordAttestationSourceWrite(state,'create',state.canonical,new Date(f.iso(-4000)));
 function material(epoch=1){const publicKey=epoch===1?'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a':'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c';
  return {keyId:randomUUID(),epoch,purpose:attestationKeyPurpose,algorithm:'Ed25519' as const,format:'raw-public-hex' as const,publicKey,
   publicKeyDigest:digest('owner-decision-public-key-v1',{algorithm:'Ed25519',format:'raw-public-hex',publicKey}),
   provenance:{kind:'installation_secret_store' as const,installationId:b.binding.installationId,authorizationDigest:hash('8'),publicMaterialEvidenceDigest:hash('9')},validFrom:f.iso(-5000),expiresAt:f.iso(240000)};
 }
 const first=material();if(!noKey)state=recordAttestationKeyWrite(state,{id:randomUUID(),action:adopt?'adopt':'create',keyId:first.keyId,material:first,overlapStartsAt:null,cutoverAt:null},new Date(f.iso(-3000)));
 const c=copy(state.canonical);c.status='accepted';c.acceptance={id:b.acceptanceId,ownerId:b.ownerId,workspaceId:b.binding.workspaceId,decisionId:b.decisionId,revision:1,
  acceptedAt:f.iso(-2000),authority:'owner_reserved',actorAgentId:null,actorCredentialId:null};
 c.auth={version:'roost-owner-auth-evidence-v1',workspaceId:b.binding.workspaceId,ownerId:b.ownerId,acceptanceId:b.acceptanceId,level:'roost_session',
  authTime:f.iso(-2500),acceptedAt:f.iso(-2000),sessionEvidenceDigest:hash('a'),policyRevision:1};
 state=recordAttestationSourceWrite(state,interview?'interview_acceptance_effect':'accept',c,new Date(f.iso(-2000)));
 let tail=Promise.resolve(),writes=0,exchanges=0,signatures=0,verifications=0;
 let fault:{writer:string;point:'state'|'history'|'audit'|'fence'|'commit_ack'}|null=null;
 const hooks:{beforeWrite?:(n:number)=>void;exchange?:()=>Promise<void>|void;afterDispatch?:()=>void;verify?:()=>void}={};
 type Transaction={mode:'read'|'write';draft:AttestationModelState;saved:boolean};const transactions=new WeakMap<object,Transaction>();
 const deps:AttestationModelDependencies={qualification:'synthetic_attestation_persistence_v1',
  transaction:async(mode,work)=>{let release=()=>{};if(mode==='write'){const prior=tail;tail=new Promise<void>(r=>release=r);await prior;}
   try{if(mode==='write'){writes++;hooks.beforeWrite?.(writes);}const db={} as any,tx:Transaction={mode,draft:copy(state),saved:false};transactions.set(db,tx);
    const result=await work(db);if(tx.saved){state=copy(tx.draft);if(fault?.point==='commit_ack'&&state.journal.at(-1)?.writer===fault.writer){fault=null;throw new AttestationCommitUnknown();}
     if(state.journal.at(-1)?.writer==='dispatch'){release();release=()=>{};hooks.afterDispatch?.();}}return result;
   }finally{release();}},
  bound:async db=>{const tx=transactions.get(db)!;return {mode:tx.mode,isolation:tx.mode==='read'?'repeatable read':'serializable',readOnly:tx.mode==='read',fenceLocked:tx.mode==='write',origin:true};},
  load:async db=>copy(transactions.get(db)!.draft),
  save:async(db,next)=>{const tx=transactions.get(db)!;assert.equal(tx.mode,'write');const writer=next.journal.at(-1)!.writer;
   if(fault?.writer===writer&&fault.point!=='commit_ack'){
    // Explicit partial transaction drafts; the outer rollback discards all of them.
    tx.draft.canonical=copy(next.canonical);tx.draft.attestations=copy(next.attestations);tx.draft.seals=copy(next.seals);
    if(fault.point!=='state')tx.draft.journal=copy(next.journal);if(['audit','fence'].includes(fault.point))tx.draft.receipts=copy(next.receipts);
    if(fault.point==='fence')tx.draft.fence=next.fence;throw Error('synthetic rollback');
   }tx.draft=copy(inspectAttestationState(next,f.now()));tx.saved=true;},
  signer:{qualification:'synthetic_attestation_signer_v1',keyId:first.keyId,sign:async(db,e)=>{
   assert.equal(transactions.get(db)!.mode,'write');assert.ok(Object.isFrozen(e)&&Object.isFrozen(e.payload)&&Object.isFrozen(e.publicKey));signatures++;
   return digest('synthetic-signature-not-cryptography',{payloadDigest:e.payloadDigest,publicKey:e.publicKey.material}).repeat(2);}},
  verifier:{qualification:'synthetic_attestation_verifier_v1',verify:async(db,e)=>{
   assert.ok(transactions.has(db));assert.ok(Object.isFrozen(e));verifications++;hooks.verify?.();
   return e.signature===digest('synthetic-signature-not-cryptography',{payloadDigest:e.payloadDigest,publicKey:e.publicKey.material}).repeat(2);}},
  exchange:async(db,s)=>{assert.equal(transactions.get(db)!.mode,'write');assert.ok(Object.isFrozen(s));exchanges++;await hooks.exchange?.();}
 };
 const model=createAttestationPersistenceModel(deps,f.now),input=()=>({decisionId:b.decisionId,ticketId:b.ticketId});
 const source=(writer:typeof attestationWriters[number],mutate?:(c:AttestationModelState['canonical'])=>void)=>{const c=copy(state.canonical);mutate?.(c);state=recordAttestationSourceWrite(state,writer,c,f.now());};
 const key=(action:string,keyId:string,m:any=null,starts:string|null=null,cutover:string|null=null)=>state=recordAttestationKeyWrite(state,{id:randomUUID(),action,keyId,material:m,overlapStartsAt:starts,cutoverAt:cutover},f.now());
 return {model,deps,hooks,material,first,key,source,b,iso:f.iso,now:f.now,advance:f.advance,input,
  attest:()=>model.attest({...input(),expected:attestationSourceVersion(state)}),state:()=>copy(state),tamper:(fn:(s:any)=>void)=>fn(state),
  fault:(v:typeof fault)=>fault=v,counts:()=>({writes,exchanges,signatures,verifications})};
}
