import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {bootstrapChannelSnapshot} from './bootstrap-channel-contract';
import {bootstrapOwnerTicket} from './worker-bootstrap-contract';

const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().max(2147483647),time=z.string().datetime();
export const channelGrantIntent=z.object({schemaVersion:z.literal('worker-bootstrap-channel-v1'),ticketId:id,ticketDigest:hash,
  expectedRevision:z.number().int().nonnegative().max(2147483646),snapshot:bootstrapChannelSnapshot}).strict();
export const channelGrant=z.object({id,intent:channelGrantIntent,ownerId:id,decisionId:id,decisionRevision:epoch,acceptanceId:id,at:time}).strict();
export const channelTransition=z.object({id,grantId:id,revision:epoch,previousId:id.nullable(),action:z.enum(['grant','consume','revoke','unknown','close']),
  state:z.enum(['current','revoked']),at:time}).strict();
export type ChannelGrant=z.infer<typeof channelGrant>;
export type ChannelTransition=z.infer<typeof channelTransition>;
export type ChannelHead={id:string;revision:number;highWater:number;purpose:string|null;state:string;generation:string;pin:string;record:unknown;fence:string};
export const channelEqual=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export const denyChannel=():never=>{throw Error('bootstrap_channel_denied');};
export function channelSnapshotDigest(input:unknown){const {recordDigest,...rest}=bootstrapChannelSnapshot.parse(input);return reviewDigest(rest);}
export function validateChannelGrant(input:unknown,ticketInput:unknown,ticketDigest:string,ownerId:string,head:ChannelHead|null,used:{generations:string[];pins:string[]},now:Date){
  const i=channelGrantIntent.parse(input),s=i.snapshot,t=bootstrapOwnerTicket.parse(ticketInput),c=t.intent.channel,p=c.profile,n=now.getTime();
  if(s.recordDigest!==channelSnapshotDigest(s)||s.revision!==i.expectedRevision+1||i.expectedRevision!==(head?.revision??0)||
    head&&head.state!=='revoked'||s.certificateEpoch!==(head?.highWater??0)+1||s.highWaterEpoch!==s.certificateEpoch||
    used.generations.includes(s.generation)||used.pins.includes(s.leafPin)||t.id!==i.ticketId||ticketDigest!==i.ticketDigest||t.ownerId!==ownerId||
    !channelEqual(t.intent.binding,s.binding)||t.intent.purpose!==s.purpose||Date.parse(t.issuedAt)>n||Date.parse(s.validFrom)>n||
    Date.parse(s.expiresAt)<=n||Date.parse(t.intent.expiresAt)<=n||Date.parse(t.intent.expiresAt)>Date.parse(s.expiresAt)||
    s.cutoverAt&&n>=Date.parse(s.cutoverAt)||Date.parse(s.certificateNotBefore)>n||
    s.purpose==='first_enrollment'&&(t.intent.baseline.credential!==null||t.intent.baseline.credentialHighWater!==0)||
    c.revision!==s.revision||c.certificateEpoch!==s.certificateEpoch||c.highWaterEpoch!==s.highWaterEpoch||
    p.origin!==s.origin||p.serverName!==s.serverName||p.trust.caDigest!==s.caDigest||p.certificate.fingerprint!==s.leafPin||
    p.certificate.notBefore!==s.certificateNotBefore||p.certificate.notAfter!==s.certificateNotAfter||p.bootstrap.evidenceDigest!==s.certificateEvidenceDigest||
    p.resolver.policy!==s.resolverPolicy)denyChannel();
  return i;
}
export function advanceChannel(grantInput:unknown,head:ChannelHead|null,action:ChannelTransition['action'],operationId:string,now:Date){
  const g=channelGrant.parse(grantInput),s=g.intent.snapshot;
  if(action==='grant'){
    if((head?.revision??0)!==g.intent.expectedRevision||head&&head.state!=='revoked')denyChannel();
  }else{
    if(!head||head.purpose!==s.purpose||head.generation!==s.generation||head.state!=='current')denyChannel();
    const old=channelTransition.parse(head!.record);if(old.grantId!==g.id)denyChannel();
    if(action==='consume'&&(old.action!=='grant'||Date.parse(s.validFrom)>now.getTime()||Date.parse(s.expiresAt)<=now.getTime()||s.cutoverAt&&now.getTime()>=Date.parse(s.cutoverAt)))denyChannel();
    if(['unknown','close'].includes(action)&&old.action!=='consume')denyChannel();
    if(action==='revoke'&&!['grant','consume'].includes(old.action))denyChannel();
  }
  return channelTransition.parse({id:operationId,grantId:g.id,revision:(head?.revision??0)+1,previousId:head?.id??null,action,
    state:['grant','consume'].includes(action)?'current':'revoked',at:now.toISOString()});
}
