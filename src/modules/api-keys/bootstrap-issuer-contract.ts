import { createHash,createPublicKey } from 'node:crypto';
import { z } from 'zod';
import { reviewDigest } from '../agent-runtime/task-review-contract';

const id=z.string().uuid(),epoch=z.number().int().positive().max(2147483647),time=z.string().datetime(),digest=z.string().regex(/^[a-f0-9]{64}$/);
export const issuerGaps=['issuer_public_key_unavailable','issuer_writer_fence_unproven'] as const;
export class IssuerBlocked extends Error{constructor(){super('bootstrap_issuer_blocked');}}
export const denyIssuer=():never=>{throw new IssuerBlocked();};
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export const issuerMaterial=z.object({keyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),algorithm:z.literal('Ed25519'),format:z.literal('spki-der-base64'),
  spki:z.string().length(60),publicKeyDigest:digest}).strict().superRefine((v,c)=>{
  try{const bytes=Buffer.from(v.spki,'base64');
    if(bytes.length!==44||bytes.subarray(0,12).toString('hex')!=='302a300506032b6570032100'||bytes.toString('base64')!==v.spki)throw Error();
    const key=createPublicKey({key:bytes,format:'der',type:'spki'});
    if(key.asymmetricKeyType!=='ed25519'||!key.export({format:'der',type:'spki'}).equals(bytes)||createHash('sha256').update(bytes).digest('hex')!==v.publicKeyDigest)throw Error();
  }catch{c.addIssue({code:'custom',message:'Canonical public Ed25519 SPKI required'});}
});
// The canonical workspace is the issuer; installation identity is its existing
// trusted_provider_ticket_keys anchor. No second issuer or key registry.
export const issuerBinding=z.object({workspaceId:id,issuerId:id,installationId:id,purpose:z.literal('worker-bootstrap-owner-ticket-v1')}).strict()
  .refine(v=>v.issuerId===v.workspaceId);
export const issuerIntent=z.object({schemaVersion:z.literal('bootstrap-issuer-v1'),binding:issuerBinding,
  action:z.enum(['create','adopt','stage','cutover','revoke','retire']),expectedRevision:z.number().int().nonnegative().max(2147483646),targetEpoch:epoch,
  material:issuerMaterial.nullable(),activatesAt:time.nullable(),cutoverAt:time.nullable(),adoptionEvidenceDigest:digest.nullable(),expiresAt:time}).strict()
  .superRefine((v,c)=>{if(['create','adopt','stage'].includes(v.action)!==(v.material!==null)||
    (v.action==='stage')!==(v.activatesAt!==null&&v.cutoverAt!==null)||v.action!=='stage'&&(v.activatesAt!==null||v.cutoverAt!==null)||
    (v.action==='adopt')!==(v.adoptionEvidenceDigest!==null))c.addIssue({code:'custom',message:'Exact lifecycle command required'});});
export const issuerRecord=z.object({id,revision:epoch,previousId:id.nullable(),decisionId:id,decisionRevision:epoch,ownerId:id,at:time,intent:issuerIntent}).strict();
export type IssuerIntent=z.infer<typeof issuerIntent>;
export type IssuerRecord=z.infer<typeof issuerRecord>;
export type IssuerHead={workspaceId:string;installationId:string;keyId:string;epoch:number;publicKeyDigest:string};
export type IssuerGeneration={epoch:number;material:z.infer<typeof issuerMaterial>;state:'active'|'staged'|'retired'|'revoked';validFrom:string;validUntil:string|null;cutoverAt:string|null};
export type IssuerState={binding:z.infer<typeof issuerBinding>;revision:number;lastId:string;highWater:number;generations:IssuerGeneration[]};

function transition(old:IssuerState|null,r:IssuerRecord):IssuerState{
  const i=r.intent,at=Date.parse(r.at),next:IssuerState=old?structuredClone(old):{binding:i.binding,revision:0,lastId:r.id,highWater:0,generations:[]};
  if(i.expectedRevision!==(old?.revision??0)||r.revision!==i.expectedRevision+1||r.previousId!==(old?.lastId??null)||Date.parse(i.expiresAt)<=at||
    old&&!same(i.binding,old.binding))denyIssuer();
  if(!old){
    if(!['create','adopt'].includes(i.action)||i.action==='create'&&i.targetEpoch!==1)denyIssuer();
    next.generations.push({epoch:i.targetEpoch,material:i.material!,state:'active',validFrom:r.at,validUntil:null,cutoverAt:null});next.highWater=i.targetEpoch;
  }else if(i.action==='stage'){
    if(i.targetEpoch!==old.highWater+1||next.generations.some(g=>g.state==='staged'||g.material.keyId===i.material!.keyId||g.material.publicKeyDigest===i.material!.publicKeyDigest)||
      Date.parse(i.activatesAt!)<at||Date.parse(i.cutoverAt!)<=Date.parse(i.activatesAt!)||Date.parse(i.cutoverAt!)-Date.parse(i.activatesAt!)>300000)denyIssuer();
    for(const g of next.generations)if(g.state==='active')g.validUntil=g.validUntil&&g.validUntil<i.cutoverAt!?g.validUntil:i.cutoverAt;
    next.generations.push({epoch:i.targetEpoch,material:i.material!,state:'staged',validFrom:i.activatesAt!,validUntil:null,cutoverAt:i.cutoverAt});next.highWater=i.targetEpoch;
  }else{
    const g=next.generations.find(g=>g.epoch===i.targetEpoch);if(!g)denyIssuer();
    if(i.action==='cutover'){
      if(g!.state!=='staged'||at<Date.parse(g!.cutoverAt!))denyIssuer();
      for(const prior of next.generations)if(prior.state==='active')prior.state='retired';g!.state='active';
    }else if(i.action==='revoke'){
      if(g!.state==='revoked')denyIssuer();g!.state='revoked';
    }else if(i.action==='retire'){
      if(!['active','staged'].includes(g!.state)||!(g!.validUntil??g!.cutoverAt)||at<Date.parse((g!.validUntil??g!.cutoverAt)!))denyIssuer();g!.state='retired';
    }else denyIssuer();
  }
  next.revision=r.revision;next.lastId=r.id;return next;
}
export function replayIssuer(records:unknown[]):IssuerState|null{
  if(records.length>1000)denyIssuer();let state:IssuerState|null=null,lastAt=0;const ids=new Set<string>(),decisions=new Set<string>();
  for(const input of records){const r=issuerRecord.parse(input);if(ids.has(r.id)||decisions.has(r.decisionId)||Date.parse(r.at)<lastAt)denyIssuer();
    ids.add(r.id);decisions.add(r.decisionId);lastAt=Date.parse(r.at);state=transition(state,r);}
  return state;
}
export function advanceIssuer(input:unknown,records:unknown[],authority:{ownerId:string;decisionId:string;decisionRevision:number;intent:unknown;current:boolean;fresh:boolean;head:IssuerHead},operationId:string,now:Date){
  const i=issuerIntent.parse(input),a=authority,state=replayIssuer(records),head=a.head;
  if(!a.current||!same(i,a.intent)||i.binding.workspaceId!==head.workspaceId||i.binding.installationId!==head.installationId||
    i.action==='create'&&!a.fresh||!state&&(i.targetEpoch!==head.epoch||i.material?.keyId!==head.keyId||i.material?.publicKeyDigest!==head.publicKeyDigest))denyIssuer();
  if(state){const latest=state.generations.at(-1)!;if(head.epoch!==state.highWater||head.keyId!==latest.material.keyId||head.publicKeyDigest!==latest.material.publicKeyDigest)denyIssuer();}
  const record=issuerRecord.parse({id:operationId,revision:i.expectedRevision+1,previousId:state?.lastId??null,decisionId:a.decisionId,decisionRevision:a.decisionRevision,ownerId:a.ownerId,at:now.toISOString(),intent:i});
  replayIssuer([...records,record]);return record;
}
export function selectIssuer(state:IssuerState,head:IssuerHead,binding:{workspaceId:string;installationId:string;ticketKeyId:string;ticketKeyEpoch:number;ticketPublicKeyDigest:string},issuedAt:string,ceremonyAt:Date){
  const issued=Date.parse(time.parse(issuedAt)),now=ceremonyAt.getTime(),latest=state.generations.at(-1)!;
  if(!Number.isFinite(now)||issued>now||binding.workspaceId!==state.binding.workspaceId||binding.installationId!==state.binding.installationId||head.workspaceId!==state.binding.workspaceId||head.installationId!==state.binding.installationId||
    head.epoch!==state.highWater||head.keyId!==latest.material.keyId||head.publicKeyDigest!==latest.material.publicKeyDigest)denyIssuer();
  const g=state.generations.find(g=>g.epoch===binding.ticketKeyEpoch&&g.material.keyId===binding.ticketKeyId&&g.material.publicKeyDigest===binding.ticketPublicKeyDigest);
  if(!g||!['active','staged'].includes(g.state)||issued<Date.parse(g.validFrom)||now<Date.parse(g.validFrom)||
    g.validUntil&&now>=Date.parse(g.validUntil)||g.state==='staged'&&now>=Date.parse(g.cutoverAt!))denyIssuer();
  return {binding:state.binding,epoch:g!.epoch,state:g!.state,material:g!.material,highWater:state.highWater,issuedAt,ceremonyAt:ceremonyAt.toISOString()};
}
