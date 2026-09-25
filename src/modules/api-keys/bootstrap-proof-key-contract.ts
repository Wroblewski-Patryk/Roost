import {z} from 'zod';
import {issuerMaterial} from './bootstrap-issuer-contract';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';

const id=z.string().uuid(),count=z.number().int().nonnegative().max(2147483646),positive=count.refine(n=>n>0);
export const proofTime=z.string().datetime().refine(s=>new Date(s).toISOString()===s);
export const proofHash=z.string().regex(/^[a-f0-9]{64}$/);
export const workerProofScope=z.object({principal:z.literal('local_worker'),purpose:z.literal('worker-bootstrap-proof-v1'),workspaceId:id,installationId:id}).strict();
export const serverBindingScope=z.object({principal:z.literal('roost_server'),purpose:z.literal('bootstrap-completion-binding-attestation-v1'),workspaceId:id}).strict();
export const proofScope=z.union([workerProofScope,serverBindingScope]);
export const proofGeneration=z.object({installationGeneration:id,hostId:id,hostGeneration:id}).strict();
export const proofKeyIntent=z.object({version:z.literal('bootstrap-proof-key-history-v1'),scope:proofScope,
 action:z.enum(['create','adopt','stage','cutover','retire','revoke']),expectedRevision:count,targetEpoch:positive,
 material:issuerMaterial.nullable(),generation:proofGeneration.nullable(),
 provenance:z.object({source:z.enum(['local_worker_os_protected','roost_server_secret_store']),evidenceDigest:proofHash}).strict().nullable(),
 adoptionEvidenceDigest:proofHash.nullable(),activatesAt:proofTime.nullable(),cutoverAt:proofTime.nullable(),expiresAt:proofTime}).strict().superRefine((v,c)=>{
 const add=['create','adopt','stage'].includes(v.action),worker=v.scope.principal==='local_worker';
 if(add!==(v.material!==null)||add!==(v.provenance!==null)||(add&&worker)!==(v.generation!==null)||
  add&&v.provenance?.source!==(worker?'local_worker_os_protected':'roost_server_secret_store')||
  (v.action==='adopt')!==(v.adoptionEvidenceDigest!==null)||(v.action==='stage')!==(v.activatesAt!==null&&v.cutoverAt!==null)||
  v.action!=='stage'&&(v.activatesAt!==null||v.cutoverAt!==null))c.addIssue({code:'custom',message:'Exact public principal lifecycle required'});
});
export const proofKeyEvent=z.object({id,previousDigest:proofHash.nullable(),revision:positive,at:proofTime,intent:proofKeyIntent,
 ownerId:id,decisionId:id,decisionRevision:positive,decisionIntentDigest:proofHash,
 fromFence:count,toFence:positive,auditId:id,receiptDigest:proofHash}).strict();
export type ProofKeyEvent=z.infer<typeof proofKeyEvent>;
export type ProofKeyIntent=z.infer<typeof proofKeyIntent>;
export type ProofKeyGeneration={epoch:number;material:z.infer<typeof issuerMaterial>;generation:z.infer<typeof proofGeneration>|null;
 state:'active'|'staged'|'retired'|'revoked';validFrom:string;validUntil:string|null;cutoverAt:string|null};
export type ProofKeyState={scope:z.infer<typeof proofScope>;revision:number;highWater:number;historyDigest:string;generations:ProofKeyGeneration[]};
export function denyProof():never{throw Error('bootstrap_proof_authority_denied');}
export const proofEqual=(a:unknown,b:unknown)=>proofDigest(a)===proofDigest(b);
export const proofEventReceipt=(r:Omit<ProofKeyEvent,'receiptDigest'>)=>proofDigest({domain:'roost-bootstrap-proof-key-receipt-v1',record:r});

// Pure replay validates structure and lineage, NOT database or owner authenticity.
export function replayProofKeys(inputs:unknown[]):ProofKeyState{
 if(!inputs.length||inputs.length>1000)denyProof();proofBytes(inputs);
 let state:ProofKeyState|undefined,lastAt='',lastFence=0;const ids=new Set<string>(),decisions=new Set<string>(),audits=new Set<string>();
 for(const raw of inputs){
  const r=proofKeyEvent.parse(raw),i=r.intent,{receiptDigest,...body}=r;
  if(ids.has(r.id)||decisions.has(r.decisionId)||audits.has(r.auditId)||r.at<lastAt||r.fromFence<lastFence||r.toFence!==r.fromFence+1||
   receiptDigest!==proofEventReceipt(body)||r.decisionIntentDigest!==proofDigest(i)||i.expiresAt<=r.at||
   i.expectedRevision!==(state?.revision??0)||r.revision!==i.expectedRevision+1||r.previousDigest!==(state?.historyDigest??null)||state&&!proofEqual(i.scope,state.scope))denyProof();
  ids.add(r.id);decisions.add(r.decisionId);audits.add(r.auditId);lastAt=r.at;lastFence=r.toFence;
  if(!state){
   if(!['create','adopt'].includes(i.action)||i.action==='create'&&i.targetEpoch!==1)denyProof();
   state={scope:i.scope,revision:0,highWater:i.targetEpoch,historyDigest:'',generations:[{epoch:i.targetEpoch,material:i.material!,generation:i.generation,state:'active',validFrom:r.at,validUntil:null,cutoverAt:null}]};
  }else if(i.action==='stage'){
   if(i.targetEpoch!==state.highWater+1||state.generations.some(g=>g.state==='staged'||g.material.keyId===i.material!.keyId||g.material.publicKeyDigest===i.material!.publicKeyDigest)||
    i.activatesAt!<r.at||i.cutoverAt!<=i.activatesAt!||Date.parse(i.cutoverAt!)-Date.parse(i.activatesAt!)>300000)denyProof();
   for(const g of state.generations)if(g.state==='active')g.validUntil=g.validUntil&&g.validUntil<i.cutoverAt!?g.validUntil:i.cutoverAt;
   state.generations.push({epoch:i.targetEpoch,material:i.material!,generation:i.generation,state:'staged',validFrom:i.activatesAt!,validUntil:null,cutoverAt:i.cutoverAt});state.highWater=i.targetEpoch;
  }else{
   const g=state.generations.find(g=>g.epoch===i.targetEpoch);if(!g)denyProof();
   if(i.action==='cutover'){
    if(g.state!=='staged'||r.at<g.cutoverAt!)denyProof();for(const p of state.generations)if(p.state==='active')p.state='retired';g.state='active';
   }else if(i.action==='revoke'){if(g.state==='revoked')denyProof();g.state='revoked';}
   else if(i.action==='retire'){if(!['active','staged'].includes(g.state)||!(g.validUntil??g.cutoverAt)||r.at<(g.validUntil??g.cutoverAt)!)denyProof();g.state='retired';}
   else denyProof();
  }
  state.revision=r.revision;state.historyDigest=proofDigest(r);
 }
 return state!;
}
export const proofKeyRef=z.object({scope:proofScope,keyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),algorithm:z.literal('Ed25519'),format:z.literal('spki-der-base64'),
 publicKeyDigest:proofHash,epoch:positive,highWater:positive,revision:positive,historyDigest:proofHash}).strict();
export type ProofKeyRef=z.infer<typeof proofKeyRef>;
export function proofReference(state:ProofKeyState,epoch:number):ProofKeyRef{
 const g=state.generations.find(g=>g.epoch===epoch);if(!g)denyProof();
 return proofKeyRef.parse({scope:state.scope,keyId:g.material.keyId,algorithm:g.material.algorithm,format:g.material.format,publicKeyDigest:g.material.publicKeyDigest,
  epoch,highWater:state.highWater,revision:state.revision,historyDigest:state.historyDigest});
}
export function selectProofKey(events:unknown[],reference:unknown,issuedAt:string,now:string,generation:unknown|null){
 const state=replayProofKeys(events),ref=proofKeyRef.parse(reference),issued=proofTime.parse(issuedAt),at=proofTime.parse(now);
 if(!proofEqual(proofReference(state,ref.epoch),ref)||issued>at||proofKeyEvent.parse(events.at(-1)).at>at)denyProof();
 const g=state.generations.find(g=>g.epoch===ref.epoch)!;
 if(!['active','staged'].includes(g.state)||issued<g.validFrom||at<g.validFrom||g.validUntil&&at>=g.validUntil||g.state==='staged'&&at>=g.cutoverAt!||!proofEqual(g.generation,generation))denyProof();
 return structuredClone(g.material);
}
