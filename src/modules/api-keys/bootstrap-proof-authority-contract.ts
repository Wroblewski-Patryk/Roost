import {z} from 'zod';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';
import {proofGeneration,proofKeyRef,proofKeyEvent,proofHash,proofTime,proofEqual,proofReference,selectProofKey,replayProofKeys,denyProof} from './bootstrap-proof-key-contract';
import {canonicalCompletionInput,completionBinding} from './bootstrap-canonical-completion-contract';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import type {AttestationDb as Db} from './decision-attestation-sql';
import {freezePublic} from './worker-transport-snapshot';

const id=z.string().uuid(),positive=z.number().int().positive().max(2147483646);
export const proofAuthorityQualification=Object.freeze({version:'bootstrap-proof-authority-v1',authorityModel:'owner_approved_source_only',
 persistenceQualified:false,cryptographyQualified:false,productionVerifierAvailable:false,...lifecycleFlags} as const);
export const proofAuthorityAttachment=z.object({version:z.literal('bootstrap-proof-authority-v1'),
 workspaceId:id,installationId:id,generation:proofGeneration,ownerId:id,decisionId:id,decisionRevision:positive,
 ticketId:id,requestId:id,enrollmentGeneration:positive,purpose:z.enum(['first_enrollment','owner_recovery']),
 worker:proofKeyRef,server:proofKeyRef,
 prior:z.object({worker:proofKeyRef,decisionId:id,ticketId:id,requestId:id,enrollmentGeneration:positive}).strict().nullable()
}).strict().superRefine((v,c)=>{
 if(v.worker.scope.principal!=='local_worker'||v.server.scope.principal!=='roost_server'||
  v.worker.scope.workspaceId!==v.workspaceId||v.server.scope.workspaceId!==v.workspaceId||
  v.worker.scope.principal==='local_worker'&&v.worker.scope.installationId!==v.installationId||
  v.worker.publicKeyDigest===v.server.publicKeyDigest||v.worker.keyId===v.server.keyId||
  v.purpose==='first_enrollment'&&(v.prior!==null||v.enrollmentGeneration!==1)||v.purpose==='owner_recovery'&&v.prior===null)
  c.addIssue({code:'custom',message:'Distinct approved principals and exact ceremony required'});
});
export type ProofAuthorityAttachment=z.infer<typeof proofAuthorityAttachment>;
// Every field is public. These are mocked port contracts, not authenticated DB evidence.
export const proofAuthoritySnapshot=z.object({at:proofTime,fence:positive,sourceDigest:proofHash,
 workspaceId:id,installationId:id,generation:proofGeneration,hostEnabled:z.literal(true),installationEnabled:z.literal(true),
 currentOwnerId:id,enrollmentGeneration:positive,credentialHighWater:z.number().int().nonnegative(),
 workerHistory:z.array(proofKeyEvent).min(1),serverHistory:z.array(proofKeyEvent).min(1),reservedPublicKeyDigests:z.array(proofHash).min(1),
 decision:z.object({id,ownerId:id,revision:positive,state:z.literal('accepted'),superseded:z.literal(false),
  attachmentDigest:proofHash,acceptedAt:proofTime,expiresAt:proofTime}).strict(),
 ticket:z.object({id,decisionId:id,decisionRevision:positive,ownerId:id,requestId:id,attachmentDigest:proofHash,
  envelopeDigest:proofHash,issuedAt:proofTime,sealedAt:proofTime,expiresAt:proofTime,revoked:z.literal(false)}).strict(),
 prior:z.object({worker:proofKeyRef,decisionId:id,ticketId:id,requestId:id,enrollmentGeneration:positive,
  terminal:z.literal(true),credentialRevoked:z.literal(true)}).strict().nullable(),
 writerInventory:z.literal('source_only_all_writers_contract_v1')
}).strict();
export type ProofAuthoritySnapshot=z.infer<typeof proofAuthoritySnapshot>;
export const proofSigningContext=z.object({authorizationDigest:proofHash,ticketId:id,ticketEnvelopeDigest:proofHash,requestId:id,
 attemptId:id,sealDigest:proofHash,dispatchPredecessorDigest:proofHash,installationGeneration:id,hostGeneration:id}).strict();
export const proofDomains=Object.freeze({peer:'roost-worker-bootstrap-peer-proof-v1',completion:'roost-worker-bootstrap-completion-proof-v1',binding:'roost-bootstrap-completion-binding-attestation-v1'});
export type ProofKind=keyof typeof proofDomains;
export type PublicProofRequest={kind:ProofKind;payload:unknown;context:z.infer<typeof proofSigningContext>;signature:string};

export function proofSigningBytes(kind:ProofKind,payload:unknown,attachment:unknown,context:unknown):Buffer{
 proofBytes({payload,attachment,context});
 if(!Object.hasOwn(proofDomains,kind))denyProof();
 const a=proofAuthorityAttachment.parse(attachment),c=proofSigningContext.parse(context),
  p=kind==='binding'?completionBinding.parse(payload):kind==='peer'?canonicalCompletionInput.shape.peer.shape.payload.parse(payload):canonicalCompletionInput.shape.completion.shape.payload.parse(payload);
 if(c.authorizationDigest!==proofDigest(a)||c.ticketId!==a.ticketId||c.requestId!==a.requestId||
  c.installationGeneration!==a.generation.installationGeneration||c.hostGeneration!==a.generation.hostGeneration)denyProof();
 if('command' in p){
  if(p.command.ticketId!==a.ticketId||p.command.decisionId!==a.decisionId||p.command.purpose!==a.purpose||p.command.attemptId!==c.attemptId||
   p.command.binding.workspaceId!==a.workspaceId||p.command.binding.installationId!==a.installationId||p.command.binding.hostId!==a.generation.hostId||
   p.hostGeneration!==c.hostGeneration||p.installationGeneration!==c.installationGeneration||p.ticketEnvelopeDigest!==c.ticketEnvelopeDigest||
   p.requestId!==c.requestId||p.sealDigest!==c.sealDigest||proofDigest(p.dispatchPredecessor)!==c.dispatchPredecessorDigest)denyProof();
 }else{
  if(p.attemptId!==c.attemptId||p.ticketDigest!==c.ticketEnvelopeDigest)denyProof();
  const binding='binding' in p?p.binding:p.peer.binding;
  if(binding.workspaceId!==a.workspaceId||binding.installationId!==a.installationId||binding.hostId!==a.generation.hostId||'requestId' in p&&p.requestId!==c.requestId)denyProof();
 }
 return proofBytes(['roost-bootstrap-signing-binary-v1',proofDomains[kind],a,c,p]);
}

export function validateProofAuthority(attachment:unknown,input:unknown){
 proofBytes({attachment,input});const a=proofAuthorityAttachment.parse(attachment),s=proofAuthoritySnapshot.parse(input),d=s.decision,t=s.ticket,hash=proofDigest(a);
 if(a.workspaceId!==s.workspaceId||a.installationId!==s.installationId||!proofEqual(a.generation,s.generation)||
  a.ownerId!==s.currentOwnerId||d.ownerId!==a.ownerId||d.id!==a.decisionId||d.revision!==a.decisionRevision||d.attachmentDigest!==hash||
  t.id!==a.ticketId||t.ownerId!==a.ownerId||t.decisionId!==a.decisionId||t.decisionRevision!==a.decisionRevision||t.requestId!==a.requestId||t.attachmentDigest!==hash||
  d.acceptedAt>t.issuedAt||t.issuedAt>t.sealedAt||t.sealedAt>s.at||d.expiresAt<t.expiresAt||s.at>=d.expiresAt||s.at>=t.expiresAt||
  a.enrollmentGeneration!==s.enrollmentGeneration||s.workerHistory.some(r=>r.at>d.acceptedAt)||s.serverHistory.some(r=>r.at>d.acceptedAt)||
  a.purpose==='first_enrollment'&&(s.prior!==null||s.credentialHighWater!==0))denyProof();
 const worker=selectProofKey(s.workerHistory,a.worker,t.issuedAt,s.at,a.generation),server=selectProofKey(s.serverHistory,a.server,t.issuedAt,s.at,null);
 // Cross-purpose reuse includes all known retired/revoked generations, not just heads.
 const ws=replayProofKeys(s.workerHistory),ss=replayProofKeys(s.serverHistory);
 if(ws.generations.some(w=>ss.generations.some(r=>r.material.publicKeyDigest===w.material.publicKeyDigest||r.material.keyId===w.material.keyId))||
  [...ws.generations,...ss.generations].some(g=>s.reservedPublicKeyDigests.includes(g.material.publicKeyDigest)))denyProof();
 if(a.purpose==='owner_recovery'){
  const p=a.prior,q=s.prior;if(!p||!q)denyProof();
  const {terminal,credentialRevoked,...prior}=q;
  const old=ws.generations.find(g=>g.epoch===p.worker.epoch),historical=replayProofKeys(s.workerHistory.slice(0,p.worker.revision));
  if(!proofEqual(proofReference(historical,p.worker.epoch),p.worker))denyProof();
  if(!proofEqual(p,prior)||!proofEqual(p.worker.scope,a.worker.scope)||!old||old.state!=='revoked'||old.material.keyId!==p.worker.keyId||old.material.publicKeyDigest!==p.worker.publicKeyDigest||
   a.worker.epoch<=p.worker.epoch||a.worker.publicKeyDigest===p.worker.publicKeyDigest||a.decisionId===p.decisionId||a.ticketId===p.ticketId||a.requestId===p.requestId||
   a.enrollmentGeneration!==p.enrollmentGeneration+1||s.credentialHighWater<1)denyProof();
 }
 return {attachment:a,snapshot:s,worker,server};
}

export type MockProofAuthorityPorts={qualification:'source_only_mock_proof_ports_v1';
 read:(db:Db,attachment:Readonly<ProofAuthorityAttachment>)=>Promise<unknown>;
 verify:(db:Db,request:Readonly<{principal:'local_worker'|'roost_server';purpose:string;key:ReturnType<typeof selectProofKey>;bytes:Buffer;signature:string}>)=>Promise<boolean>};
// Explicit same-transaction reader/verifier seam for source tests only. It never
// sends, signs, writes or activates. Native reader/guards/verification are absent.
export async function checkProofBoundary(db:Db,attachment:unknown,request:PublicProofRequest,ports:MockProofAuthorityPorts,phase:'before_send'|'after_send'){
 try{
  if(ports.qualification!=='source_only_mock_proof_ports_v1'||!['before_send','after_send'].includes(phase))denyProof();
  proofBytes({attachment,request});
  const a=freezePublic(proofAuthorityAttachment.parse(attachment)),r=z.object({kind:z.enum(['peer','completion','binding']),payload:z.unknown(),context:proofSigningContext,signature:z.string()}).strict().parse(request);
  if(!/^[a-f0-9]{128}$/.test(r.signature))denyProof();
  const first=validateProofAuthority(a,await ports.read(db,a)),bytes=proofSigningBytes(r.kind,r.payload,a,r.context);
  if(first.snapshot.ticket.envelopeDigest!==r.context.ticketEnvelopeDigest)denyProof();
  const payload=r.payload as Record<string,unknown>,issued=first.snapshot.ticket.issuedAt;
  const signingTimes=r.kind==='peer'?[payload.observedAt]:r.kind==='completion'?[payload.committedAt]:[payload.issuedAt,payload.completedAt];
  for(const rawTime of signingTimes){const time=proofTime.parse(rawTime);if(time<issued||time>first.snapshot.at)denyProof();}
  const binding=r.kind==='binding',scope=binding?a.server.scope:a.worker.scope;
  const verified=await ports.verify(db,Object.freeze({principal:scope.principal,purpose:scope.purpose,key:freezePublic(binding?first.server:first.worker),bytes,signature:r.signature}));
  const after=validateProofAuthority(a,await ports.read(db,a));
  const {at:beforeAt,...before}=first.snapshot,{at:afterAt,...fresh}=after.snapshot;
  if(verified!==true||afterAt<beforeAt||!proofEqual(before,fresh)||!bytes.equals(proofSigningBytes(r.kind,r.payload,a,r.context)))denyProof();
  return {modelAccepted:true as const,status:'source_only_model_pass' as const,retryable:false as const,...lifecycleFlags};
 }catch{return {modelAccepted:false as const,status:phase==='after_send'?'reconciliation_required' as const:'denied' as const,retryable:false as const,...lifecycleFlags};}
}

// External responsibility declarations ONLY. There is no implementation, key
// handle, secret-store access, key generation or signing call in this module.
export interface ExternalWorkerProofSigner {readonly principal:'local_worker';readonly purpose:'worker-bootstrap-proof-v1';signPublicTranscript(bytes:Uint8Array):Promise<string>}
export interface ExternalRoostBindingSigner {readonly principal:'roost_server';readonly purpose:'bootstrap-completion-binding-attestation-v1';signPublicTranscript(bytes:Uint8Array):Promise<string>}
