import {z} from 'zod';
import {bootstrapBinding,bootstrapOwnerTicket,bootstrapOwnerDecision} from './worker-bootstrap-contract';
import {productionTransportOrigin,productionPeerAddress} from './worker-transport-contract';
import {freezePublic} from './worker-transport-snapshot';
import {reviewDigest} from '../agent-runtime/task-review-contract';

const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),time=z.string().datetime();
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export const bootstrapChannelGap=freezePublic({available:false,qualification:'canonical_channel_unrepresentable_v1',
  blocker:'bootstrap_channel_authority_unavailable',reasons:[
    'bootstrap_channel_purpose_not_representable','bootstrap_channel_resolver_set_not_persisted','bootstrap_channel_all_writers_unfenced'
  ]} as const);
const flags={implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const;

// Proposal only: existing transport records cannot persist this shape. This is
// neither an ordinary AdmissionSnapshot nor a new store/registry/authority API.
export const bootstrapChannelSnapshot=z.object({version:z.literal('bootstrap-channel-snapshot-proposal-v1'),
  purpose:z.enum(['first_enrollment','owner_recovery']),binding:bootstrapBinding,
  hostGeneration:id,installationGeneration:id,generation:id,revision:epoch,recordDigest:hash,state:z.literal('current'),
  issuerRevision:epoch,issuerHistoryDigest:hash,
  origin:productionTransportOrigin,serverName:z.string().min(3).max(253),caDigest:hash,leafPin:hash,certificateEpoch:epoch,highWaterEpoch:epoch,
  certificateNotBefore:time,certificateNotAfter:time,certificateEvidenceDigest:hash,
  resolverPolicy:z.literal('public_ipv4_only_v1'),publicAddresses:z.array(z.string().refine(productionPeerAddress)).min(1).max(16),
  redirect:z.literal(false),proxy:z.literal(false),downgrade:z.literal(false),sessionReuse:z.literal(false),
  validFrom:time,cutoverAt:time.nullable(),expiresAt:time
}).strict().superRefine((s,c)=>{
  if(!productionTransportOrigin.safeParse(s.origin).success)return;
  if(new URL(s.origin).hostname!==s.serverName||s.highWaterEpoch<s.certificateEpoch||
    !same(s.publicAddresses,[...new Set(s.publicAddresses)].sort())||Date.parse(s.validFrom)>=Date.parse(s.expiresAt)||
    Date.parse(s.certificateNotAfter)<Date.parse(s.expiresAt)||s.cutoverAt&&Date.parse(s.cutoverAt)<=Date.parse(s.validFrom))
    c.addIssue({code:'custom',message:'Invalid exact bootstrap channel snapshot'});
});
export type BootstrapChannelSnapshot=z.infer<typeof bootstrapChannelSnapshot>;
export const bootstrapChannelWriters=['transport_generation','transport_history','transport_head','transport_audit',
  'owner_membership','decision_acceptance','bootstrap_ticket','host_lifecycle','installation_lifecycle','issuer_history','certificate_resolver'] as const;
const proposedGrant=z.object({version:z.literal('bootstrap-channel-grant-proposal-v1'),purpose:z.enum(['first_enrollment','owner_recovery']),
  ownerId:id,decisionId:id,decisionRevision:epoch,ticketId:id,ticketDigest:hash,snapshotDigest:hash,expiresAt:time}).strict();
// All proofs here are explicitly synthetic. No boolean/digest supplied by a
// caller can discharge the canonical gap; no current production provider exists.
const modelProof=z.object({qualification:z.literal('synthetic_bootstrap_channel_proof_v1'),snapshot:bootstrapChannelSnapshot,
  grant:proposedGrant,acceptedGrantDigest:hash,ticket:bootstrapOwnerTicket,ticketDigest:hash,decision:bootstrapOwnerDecision,
  owner:z.object({id,solePrimary:z.literal(true),active:z.literal(true)}).strict(),
  lifecycle:z.object({binding:bootstrapBinding,hostGeneration:id,installationGeneration:id,hostActive:z.literal(true),installationActive:z.literal(true)}).strict(),
  issuer:z.object({revision:epoch,historyDigest:hash,binding:bootstrapBinding,current:z.literal(true)}).strict(),
  channelCurrent:z.literal(true),certificateCurrent:z.literal(true),ticketCurrent:z.literal(true),decisionCurrent:z.literal(true),
  credentialState:z.enum(['absent','terminal']),
  fence:z.object({revision:epoch,mode:z.literal('read_only_repeatable_read'),writers:z.array(z.enum(bootstrapChannelWriters)).length(bootstrapChannelWriters.length),proofDigest:hash}).strict()
}).strict();
function deny():never{throw Error('bootstrap_channel_model_denied');}
export function inspectBootstrapChannelModel(input:unknown,now=new Date()){
  const p=modelProof.parse(input),s=p.snapshot,t=p.ticket,i=t.intent,g=p.grant,d=p.decision,n=now.getTime();
  const issued=Date.parse(t.issuedAt),expires=Date.parse(i.expiresAt),ownerAuth=Date.parse(t.ownerAuthAt),profile=i.channel.profile;
  if(!Number.isFinite(n)||!same(p.fence.writers,bootstrapChannelWriters)||!same(p.lifecycle.binding,s.binding)||!same(p.issuer.binding,s.binding)||
    p.lifecycle.hostGeneration!==s.hostGeneration||p.lifecycle.installationGeneration!==s.installationGeneration||p.issuer.revision!==s.issuerRevision||p.issuer.historyDigest!==s.issuerHistoryDigest||
    !same(i.binding,s.binding)||i.purpose!==s.purpose||g.purpose!==s.purpose||p.credentialState!==(s.purpose==='first_enrollment'?'absent':'terminal')||
    g.ownerId!==p.owner.id||t.ownerId!==p.owner.id||d.ownerId!==p.owner.id||g.decisionId!==t.decisionId||g.decisionRevision!==t.decisionRevision||
    d.id!==t.decisionId||d.revision!==t.decisionRevision||d.state!=='accepted'||d.intentDigest!==reviewDigest(i)||t.decisionIntentDigest!==reviewDigest(i)||
    g.ticketId!==t.id||g.ticketDigest!==p.ticketDigest||g.snapshotDigest!==reviewDigest(s)||p.acceptedGrantDigest!==reviewDigest(g)||
    Date.parse(d.acceptedAt)>issued||Date.parse(d.expiresAt)<expires||issued>n||issued<ownerAuth||n-ownerAuth>300000||expires<=n||expires>issued+120000||
    Date.parse(g.expiresAt)<expires||Date.parse(s.expiresAt)<expires||Date.parse(i.channel.validUntil)<expires||
    Date.parse(s.validFrom)>issued||Date.parse(s.certificateNotBefore)>n||s.cutoverAt&&n>=Date.parse(s.cutoverAt)||
    i.channel.revision!==s.revision||i.channel.certificateEpoch!==s.certificateEpoch||i.channel.highWaterEpoch!==s.highWaterEpoch||
    profile.origin!==s.origin||profile.serverName!==s.serverName||profile.trust.caDigest!==s.caDigest||profile.certificate.fingerprint!==s.leafPin||
    profile.certificate.notBefore!==s.certificateNotBefore||profile.certificate.notAfter!==s.certificateNotAfter||profile.bootstrap.evidenceDigest!==s.certificateEvidenceDigest||
    profile.resolver.policy!==s.resolverPolicy)deny();
  return freezePublic({qualification:'source_model_only' as const,snapshot:s,ticketId:t.id,ticketDigest:p.ticketDigest,requestId:i.requestId,
    authorityDigest:reviewDigest({grant:g,ticket:t,decision:d,owner:p.owner,lifecycle:p.lifecycle,issuer:p.issuer,fence:p.fence}),...flags});
}
const peer=z.object({snapshotDigest:hash,ticketDigest:hash,requestId:id,origin:productionTransportOrigin,serverName:z.string(),caDigest:hash,leafPin:hash,
  certificateEpoch:epoch,resolverPolicy:z.literal('public_ipv4_only_v1'),publicAddresses:z.array(z.string()).min(1).max(16),peerAddress:z.string(),
  chainValid:z.literal(true),hostnameValid:z.literal(true),proxy:z.literal(false),redirect:z.literal(false),sessionReuse:z.literal(false),observedAt:time,expiresAt:time}).strict();
type ModelDependencies={qualification:'synthetic_bootstrap_channel_model_v1';inspect:(ticketId:string)=>Promise<unknown>;
  exchange:(snapshot:BootstrapChannelSnapshot,verifyPeer:(proof:unknown)=>Promise<boolean>)=>Promise<unknown>};
const receipt=z.object({snapshotDigest:hash,ticketDigest:hash,requestId:id,peerDigest:hash,responseDigest:hash,outcome:z.literal('response'),commitUncertain:z.literal(false)}).strict();
// A bounded test model only. The existing bootstrap ledger owns durable terminal
// attempts. This local map grants nothing after restart and is never composed.
export function createBootstrapChannelModel(dependencies?:ModelDependencies,clock=()=>new Date()){
  const spent=new Map<string,'blocked'|'possible'|'unknown'|'complete'>();
  return Object.freeze({async run(...args:unknown[]){
    let ticketId:string|undefined,possible=false;
    const failure=(error:string,unknown=false)=>({ok:false as const,qualification:'source_model_only' as const,error,deliveryUnknown:unknown,...flags});
    try{
      if(!dependencies||dependencies.qualification!=='synthetic_bootstrap_channel_model_v1')return failure(bootstrapChannelGap.blocker);
      if(args.length!==1)deny();ticketId=z.object({ticketId:id}).strict().parse(args[0]).ticketId;
      if(spent.has(ticketId)||spent.size>=128)return failure('replay_denied',['unknown','possible'].includes(spent.get(ticketId)??''));spent.set(ticketId,'blocked');
      const inspect=async()=>{const p=inspectBootstrapChannelModel(await dependencies.inspect(ticketId!),clock());if(p.ticketId!==ticketId)deny();return p;};
      const first=await inspect();if(!same(first,await inspect()))deny();
      let peerDigest:string|undefined,seen=false,invalid=false;
      // Once exchange is invoked, an exception/missing peer proof cannot prove
      // that no remote body/commit happened. Never retry an uncertain operation.
      possible=true;spent.set(ticketId,'possible');
      const raw=await dependencies.exchange(first.snapshot,async value=>{
        try{if(seen){invalid=true;return false;}seen=true;
          const v=peer.parse(value),s=first.snapshot,n=clock().getTime();
          if(!same(first,await inspect())||v.snapshotDigest!==reviewDigest(s)||v.ticketDigest!==first.ticketDigest||v.requestId!==first.requestId||
            v.origin!==s.origin||v.serverName!==s.serverName||v.caDigest!==s.caDigest||v.leafPin!==s.leafPin||v.certificateEpoch!==s.certificateEpoch||
            v.resolverPolicy!==s.resolverPolicy||!same(v.publicAddresses,s.publicAddresses)||!s.publicAddresses.includes(v.peerAddress)||
            Date.parse(v.observedAt)>n||n-Date.parse(v.observedAt)>30000||Date.parse(v.expiresAt)<=n||Date.parse(v.expiresAt)>Date.parse(v.observedAt)+30000)deny();
          peerDigest=reviewDigest(v);return true;
        }catch{invalid=true;return false;}
      });
      const r=receipt.parse(raw);
      if(invalid||!peerDigest||r.peerDigest!==peerDigest||r.snapshotDigest!==reviewDigest(first.snapshot)||r.ticketDigest!==first.ticketDigest||r.requestId!==first.requestId||!same(first,await inspect()))deny();
      spent.set(ticketId,'complete');return {ok:true as const,qualification:'source_model_only' as const,...flags};
    }catch{if(ticketId&&possible)spent.set(ticketId,'unknown');return failure(possible?'delivery_unknown':'bootstrap_channel_model_denied',possible);}
  }});
}
