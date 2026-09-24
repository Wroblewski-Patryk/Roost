import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';

const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),time=z.string().datetime();
export const attestationKeyPurpose='owner-decision-attestation-v1' as const;
export const attestationDigest=(domain:string,value:unknown)=>reviewDigest({domain,value});
export const attestationKeyMaterial=z.object({keyId:id,epoch,purpose:z.literal(attestationKeyPurpose),algorithm:z.literal('Ed25519'),
 format:z.literal('raw-public-hex'),publicKey:z.string().regex(/^[a-f0-9]{64}$/),publicKeyDigest:hash,
 provenance:z.object({kind:z.literal('installation_secret_store'),installationId:id,authorizationDigest:hash,publicMaterialEvidenceDigest:hash}).strict(),
 validFrom:time,expiresAt:time}).strict();
const operation=z.object({action:z.enum(['create','adopt','stage','cutover','retire','revoke']),keyId:id,
 material:attestationKeyMaterial.nullable(),overlapStartsAt:time.nullable(),cutoverAt:time.nullable()}).strict();
export const attestationKeyEvent=operation.extend({id,workspaceId:id,revision:epoch,previousDigest:hash.nullable(),at:time}).strict();
export type AttestationKeyEvent=z.infer<typeof attestationKeyEvent>;
type Material=z.infer<typeof attestationKeyMaterial>;
type Generation={material:Material;revision:number;historyDigest:string;state:'active'|'staged'|'retiring'|'retired'|'revoked'};
const deny=():never=>{throw Error('attestation_key_history_invalid');};
export function projectAttestationKeys(input:unknown,workspaceId:string,installationId:string,now=new Date()){
 const history=z.array(attestationKeyEvent).max(1000).parse(input),keys=new Map<string,Generation>();let highWater=0;
 let current:string|null=null,stage:{keyId:string;oldId:string;starts:number;cutover:number}|null=null,previous:AttestationKeyEvent|undefined;
 for(let i=0;i<history.length;i++){
  const e=history[i],at=Date.parse(e.at);if(e.workspaceId!==workspaceId||e.revision!==i+1||e.previousDigest!==(previous?attestationDigest('owner-decision-key-event-v1',previous):null)||
   at>now.getTime()||previous&&at<Date.parse(previous.at)||history.slice(0,i).some(x=>x.id===e.id))deny();
  const key=keys.get(e.keyId),creating=['create','adopt','stage'].includes(e.action);
  if(creating){const m=e.material;
   if(!m||key||[...keys.values()].some(k=>k.material.publicKeyDigest===m.publicKeyDigest)||m.keyId!==e.keyId||m.epoch!==highWater+1||m.provenance.installationId!==installationId||
    m.publicKeyDigest!==attestationDigest('owner-decision-public-key-v1',{algorithm:m.algorithm,format:m.format,publicKey:m.publicKey})||
    Date.parse(m.validFrom)>at||Date.parse(m.expiresAt)<=at)deny();
   if(e.action==='stage'){
    const start=Date.parse(e.overlapStartsAt??''),cut=Date.parse(e.cutoverAt??'');
    if(!current||stage||keys.get(current)!.state!=='active'||!Number.isFinite(start)||!Number.isFinite(cut)||start<at||cut<=start||cut-start>120000||
     cut>Date.parse(m!.expiresAt)||cut>Date.parse(keys.get(current)!.material.expiresAt))deny();
    stage={keyId:e.keyId,oldId:current!,starts:start,cutover:cut};
   }else if(history.length&&i!==0||current||highWater!==0||e.overlapStartsAt!==null||e.cutoverAt!==null)deny();
   keys.set(e.keyId,{material:m!,revision:e.revision,historyDigest:attestationDigest('owner-decision-key-event-v1',e),state:e.action==='stage'?'staged':'active'});
   highWater=m!.epoch;if(e.action!=='stage')current=e.keyId;
  }else{
   if(!key||e.material!==null||e.overlapStartsAt!==null||e.cutoverAt!==null||key.state==='revoked'||key.state==='retired')deny();
   if(e.action==='cutover'){
    if(!stage||stage.keyId!==e.keyId||key!.state!=='staged'||at<stage.cutover)deny();
    const old=keys.get(stage!.oldId)!;if(old.state==='active')old.state='retiring';key!.state='active';current=e.keyId;stage=null;
   }else if(e.action==='retire'){
    if(key!.state!=='retiring')deny();key!.state='retired';
   }else key!.state='revoked';
  }
  previous=e;
 }
 const n=now.getTime();if(!Number.isFinite(n))deny();
 const usable=[...keys.values()].filter(k=>{
  const m=k.material;if(n<Date.parse(m.validFrom)||n>=Date.parse(m.expiresAt))return false;
  if(stage&&m.keyId===stage.oldId)return k.state==='active'&&n<stage.cutover;
  if(stage&&m.keyId===stage.keyId)return k.state==='staged'&&n>=stage.starts&&n<stage.cutover;
  return k.state==='active'&&m.keyId===current;
 });
 return freezePublic({highWater,keys:[...keys.values()],usable,historyDigest:previous?attestationDigest('owner-decision-key-event-v1',previous):null});
}
// Source-only append proposal. Persistence must add the same-fence audit receipt
// atomically; this function neither installs keys nor accesses the secret store.
export function nextAttestationKeyEvent(history:unknown,scope:{workspaceId:string;installationId:string},input:unknown,at:Date){
 const prior=z.array(attestationKeyEvent).parse(history),command=operation.extend({id}).strict().parse(input),last=prior.at(-1);
 const event=attestationKeyEvent.parse({...command,workspaceId:scope.workspaceId,revision:prior.length+1,
  previousDigest:last?attestationDigest('owner-decision-key-event-v1',last):null,at:at.toISOString()});
 projectAttestationKeys([...prior,event],scope.workspaceId,scope.installationId,at);return freezePublic(event);
}
