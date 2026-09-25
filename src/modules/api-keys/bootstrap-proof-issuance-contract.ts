import {z} from 'zod';
import {createHash} from 'node:crypto';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';
import {proofAuthorityAttachment} from './bootstrap-proof-authority-contract';
import {proofKeyEvent,proofHash,proofTime,proofEqual,selectProofKey,replayProofKeys,proofReference,denyProof} from './bootstrap-proof-key-contract';
import {issuerMaterial} from './bootstrap-issuer-contract';
import {lifecycleTicketPayload} from './bootstrap-ticket-lifecycle-contract';
import {bootstrapOwnerDecision} from './worker-bootstrap-contract';
import {bootstrapChannelSnapshot} from './bootstrap-channel-contract';
import {channelSnapshotDigest} from './bootstrap-channel-persistence-contract';
import {freezePublic} from './worker-transport-snapshot';

const id=z.string().uuid(),positive=z.number().int().positive().max(2147483646),fence=z.string().regex(/^[1-9][0-9]*$/),signature=z.string().regex(/^[a-f0-9]{128}$/);
export const v3Domains=Object.freeze({content:'roost-worker-bootstrap-owner-ticket-content-v3',envelope:'roost-worker-bootstrap-owner-ticket-envelope-v3',
 decision:'roost-worker-bootstrap-owner-decision-v3',link:'roost-bootstrap-proof-ticket-link-v3',seal:'roost-bootstrap-binding-attempt-seal-v3',receipt:'roost-bootstrap-proof-issuance-receipt-v3'});
export const v3Intent=lifecycleTicketPayload.shape.intent.omit({schemaVersion:true}).extend({schemaVersion:z.literal('worker-bootstrap-admission-v3'),
 proofAuthority:proofAuthorityAttachment}).strict();
export const v3Command=z.object({version:z.literal('bootstrap-proof-issue-command-v3'),operationId:id,attachmentId:id,
 expected:z.object({attachmentDigest:proofHash,authorityRevision:fence,authorityDigest:proofHash,sourceDigest:proofHash,fence}).strict()}).strict();
export const v3Issuer=z.object({protocol:z.literal('worker-bootstrap-owner-ticket-v3'),workspaceId:id,installationId:id,material:issuerMaterial,epoch:positive,
 revision:positive,historyDigest:proofHash,authorizationDigest:proofHash,validFrom:proofTime,expiresAt:proofTime}).strict();
export const v3Authority=z.object({version:z.literal('bootstrap-proof-issuance-authority-v3'),at:proofTime,fence,writerXid:fence,authorityRevision:fence,authorityDigest:proofHash,sourceDigest:proofHash,
 attachmentId:id,attachmentDigest:proofHash,attachment:proofAuthorityAttachment,workerHistory:z.array(proofKeyEvent).min(1).max(1000),serverHistory:z.array(proofKeyEvent).min(1).max(1000),reservedPublicKeyDigests:z.array(proofHash).min(1),
 owner:z.object({id,decisionId:id,decisionRevision:positive,acceptedAt:proofTime,authenticatedAt:proofTime,expiresAt:proofTime,intentDigest:proofHash}).strict(),
 lifecycle:z.object({installationLifecycleId:id,hostLifecycleId:id,installationGeneration:id,hostGeneration:id,hostId:id,hostEnabled:z.literal(true),installationEnabled:z.literal(true)}).strict(),
 issuer:v3Issuer,intent:v3Intent,channel:z.object({acceptanceId:id,snapshot:bootstrapChannelSnapshot,previousRevision:z.number().int().nonnegative(),previousDigest:proofHash.nullable(),
  previousHighWater:z.number().int().nonnegative(),previousRevoked:z.literal(true),unusedGeneration:z.literal(true),unusedPin:z.literal(true)}).strict(),
 prior:z.object({ticketId:id,decisionId:id,requestId:id,enrollmentGeneration:positive,credentialId:id,credentialEpoch:positive,credentialRevoked:z.literal(true),terminal:z.literal(true),
  predecessor:lifecycleTicketPayload.shape.intent.shape.prior.unwrap()}).strict().nullable()
}).strict();
export type V3Authority=z.infer<typeof v3Authority>;
export type V3Command=z.infer<typeof v3Command>;
export const v3Context=z.object({operationId:id,attachmentId:id,attachmentDigest:proofHash,authorityRevision:fence,authorityDigest:proofHash,sourceDigest:proofHash,sourceFence:fence,
 attemptId:id,linkId:id,channelGrantId:id,channelHistoryId:id,issueEventId:id,consumeEventId:id,attemptHistoryId:id,receiptEventId:id,
 issuer:v3Issuer,lifecycle:v3Authority.shape.lifecycle,channel:v3Authority.shape.channel}).strict();
export const v3Ticket=lifecycleTicketPayload.omit({version:true,intent:true,lifecycle:true}).extend({version:z.literal('worker-bootstrap-owner-ticket-v3'),intent:v3Intent,
 context:v3Context,contentDomain:z.literal(v3Domains.content)}).strict();
export const v3Envelope=z.object({version:z.literal('worker-bootstrap-owner-envelope-v3'),domain:z.literal(v3Domains.envelope),
 signed:z.object({payload:v3Ticket,signature}).strict(),decision:z.object({payload:bootstrapOwnerDecision,signature}).strict()}).strict();
export const v3LinkBinding=z.object({version:z.literal('bootstrap-proof-ticket-link-v3'),domain:z.literal(v3Domains.link),operationId:id,attachmentId:id,attachmentDigest:proofHash,
 ticketId:id,ticketContentDigest:proofHash,ticketEnvelopeDigest:proofHash,attemptId:id,context:v3Context}).strict();
export const v3SealPayload=z.object({version:z.literal('bootstrap-proof-attempt-seal-v3'),domain:z.literal(v3Domains.seal),linkBinding:v3LinkBinding,linkBindingDigest:proofHash,
 attachment:proofAuthorityAttachment,sealedAt:proofTime,state:z.literal('sealed')}).strict();
export const v3Seal=z.object({payload:v3SealPayload,signature}).strict();
export const v3Plan=z.object({version:z.literal('bootstrap-proof-issuance-plan-v3'),command:v3Command,authority:v3Authority,envelope:v3Envelope,seal:v3Seal,
 link:v3LinkBinding.extend({sealDigest:proofHash}).strict()}).strict();
export type V3Plan=z.infer<typeof v3Plan>;
export const v3Receipt=z.object({version:z.literal('bootstrap-proof-issuance-receipt-v3'),domain:z.literal(v3Domains.receipt),operationId:id,attachmentId:id,ticketId:id,attemptId:id,planDigest:proofHash,
 envelopeDigest:proofHash,sealDigest:proofHash,sourceDigest:proofHash,authorityRevision:fence,authorityDigest:proofHash,writerXid:fence,fromFence:fence,toFence:fence,rowsDigest:proofHash,eventId:id}).strict();
export type V3Receipt=z.infer<typeof v3Receipt>;

export function v3SlotId(operationId:string,slot:string){const d=proofDigest(['roost-bootstrap-v3-child-id',id.parse(operationId),slot]);return `${d.slice(0,8)}-${d.slice(8,12)}-4${d.slice(13,16)}-8${d.slice(17,20)}-${d.slice(20,32)}`;}
export const v3Transcript=(domain:string,a:unknown,context:unknown,payload:unknown)=>{
 proofBytes({domain,a,context,payload});
 if(![v3Domains.content,v3Domains.decision,v3Domains.seal].includes(domain as any))denyProof();
 const attachment=proofAuthorityAttachment.parse(a),ctx=v3Context.parse(context),p=domain===v3Domains.content?v3Ticket.parse(payload):
  domain===v3Domains.decision?bootstrapOwnerDecision.parse(payload):v3SealPayload.parse(payload);
 if(ctx.attachmentDigest!==proofDigest(attachment)||ctx.issuer.workspaceId!==attachment.workspaceId||ctx.issuer.installationId!==attachment.installationId||
  !proofEqual(attachment.generation,{installationGeneration:ctx.lifecycle.installationGeneration,hostGeneration:ctx.lifecycle.hostGeneration,hostId:ctx.lifecycle.hostId}))denyProof();
 if('intent' in p){if(!proofEqual(p.context,ctx)||!proofEqual(p.intent.proofAuthority,attachment)||p.id!==attachment.ticketId||p.ownerId!==attachment.ownerId||p.decisionId!==attachment.decisionId||p.decisionRevision!==attachment.decisionRevision)denyProof();}
 else if('linkBinding' in p){if(!proofEqual(p.attachment,attachment)||!proofEqual(p.linkBinding.context,ctx)||p.linkBindingDigest!==proofDigest([v3Domains.link,p.linkBinding])||
  p.linkBinding.operationId!==ctx.operationId||p.linkBinding.attachmentId!==ctx.attachmentId||p.linkBinding.attachmentDigest!==ctx.attachmentDigest||p.linkBinding.ticketId!==attachment.ticketId||p.linkBinding.attemptId!==ctx.attemptId)denyProof();}
 else if(p.id!==attachment.decisionId||p.ownerId!==attachment.ownerId||p.revision!==attachment.decisionRevision||p.state!=='accepted')denyProof();
 return proofBytes(['roost-bootstrap-signing-binary-v1',domain,attachment,ctx,p]);
};
export const v3EnvelopeDigest=(envelope:unknown)=>{proofBytes(envelope);return proofDigest([v3Domains.envelope,v3Envelope.parse(envelope)]);};
export const v3SealDigest=(seal:unknown)=>{proofBytes(seal);return proofDigest([v3Domains.seal,v3Seal.parse(seal)]);};
export const v3AuthorityVersion=(a:V3Authority)=>({attachmentDigest:a.attachmentDigest,authorityRevision:a.authorityRevision,authorityDigest:a.authorityDigest,sourceDigest:a.sourceDigest,fence:a.fence});

export function validateV3Authority(command:unknown,value:unknown){
 proofBytes({command,value});const c=v3Command.parse(command),s=v3Authority.parse(value),a=s.attachment,i=s.intent,b=i.binding,ch=s.channel.snapshot,o=s.owner,l=s.lifecycle,k=s.issuer;
 for(const t of [i.expiresAt,i.channel.validUntil,i.channel.profile.certificate.notBefore,i.channel.profile.certificate.notAfter,
  ch.validFrom,ch.expiresAt,ch.certificateNotBefore,ch.certificateNotAfter,...ch.cutoverAt?[ch.cutoverAt]:[]])proofTime.parse(t);
 if(c.attachmentId!==s.attachmentId||s.attachmentDigest!==proofDigest(a)||!proofEqual(c.expected,v3AuthorityVersion(s))||!proofEqual(a,i.proofAuthority)||
  a.ownerId!==o.id||a.decisionId!==o.decisionId||a.decisionRevision!==o.decisionRevision||o.intentDigest!==proofDigest(i)||
  o.authenticatedAt>o.acceptedAt||o.acceptedAt>s.at||s.at>=o.expiresAt||o.expiresAt<i.expiresAt||s.at>=i.expiresAt||
  Date.parse(i.expiresAt)-Date.parse(s.at)>120000||Date.parse(o.authenticatedAt)<Date.parse(s.at)-300000||
  a.workspaceId!==b.workspaceId||a.installationId!==b.installationId||a.generation.hostId!==b.hostId||a.requestId!==i.requestId||a.purpose!==i.purpose||
  a.enrollmentGeneration!==i.baseline.enrollmentGeneration+1||i.target.epoch!==i.baseline.credentialHighWater+1||i.target.version!==1||i.target.id===i.baseline.credential?.id||i.target.fingerprint===i.baseline.credential?.fingerprint||
  !proofEqual(a.generation,{installationGeneration:l.installationGeneration,hostGeneration:l.hostGeneration,hostId:l.hostId})||
  k.workspaceId!==a.workspaceId||k.installationId!==a.installationId||k.material.keyId!==b.ticketKeyId||k.material.publicKeyDigest!==b.ticketPublicKeyDigest||k.epoch!==b.ticketKeyEpoch||s.at<k.validFrom||i.expiresAt>k.expiresAt||
  k.validFrom>=k.expiresAt||!s.reservedPublicKeyDigests.includes(k.material.publicKeyDigest)||new Set(s.reservedPublicKeyDigests).size!==s.reservedPublicKeyDigests.length||
  s.workerHistory.some(r=>r.at>o.acceptedAt)||s.serverHistory.some(r=>r.at>o.acceptedAt))denyProof();
 selectProofKey(s.workerHistory,a.worker,s.at,s.at,a.generation);selectProofKey(s.serverHistory,a.server,s.at,s.at,null);
 const w=replayProofKeys(s.workerHistory),server=replayProofKeys(s.serverHistory);
 if(w.generations.some(g=>server.generations.some(r=>g.material.keyId===r.material.keyId||g.material.publicKeyDigest===r.material.publicKeyDigest))||
  [...w.generations,...server.generations].some(g=>g.material.keyId===k.material.keyId||s.reservedPublicKeyDigests.includes(g.material.publicKeyDigest)))denyProof();
 if((s.channel.previousRevision===0)!==(s.channel.previousDigest===null)||(s.channel.previousRevision===0)!==(s.channel.previousHighWater===0)||
  ch.recordDigest!==channelSnapshotDigest(ch)||!proofEqual(ch.binding,b)||ch.purpose!==i.purpose||ch.installationGeneration!==l.installationGeneration||ch.hostGeneration!==l.hostGeneration||
  ch.issuerRevision!==k.revision||ch.issuerHistoryDigest!==k.historyDigest||ch.revision!==s.channel.previousRevision+1||ch.certificateEpoch!==s.channel.previousHighWater+1||ch.highWaterEpoch!==ch.certificateEpoch||
  i.channel.revision!==ch.revision||i.channel.certificateEpoch!==ch.certificateEpoch||i.channel.highWaterEpoch!==ch.highWaterEpoch||i.channel.validUntil!==ch.expiresAt||
  i.channel.profile.origin!==ch.origin||i.channel.profile.serverName!==ch.serverName||i.channel.profile.trust.caDigest!==ch.caDigest||
  i.channel.profile.certificate.fingerprint!==ch.leafPin||i.channel.profile.certificate.notBefore!==ch.certificateNotBefore||i.channel.profile.certificate.notAfter!==ch.certificateNotAfter||
  i.channel.profile.bootstrap.evidenceDigest!==ch.certificateEvidenceDigest||i.channel.profile.resolver.policy!==ch.resolverPolicy||
  ch.validFrom>s.at||ch.certificateNotBefore>s.at||ch.certificateNotAfter<i.expiresAt||ch.expiresAt<i.expiresAt||ch.cutoverAt&&s.at>=ch.cutoverAt)denyProof();
 if(a.purpose==='first_enrollment'){if(a.prior||s.prior||i.prior||i.baseline.credential||i.baseline.credentialHighWater!==0||a.enrollmentGeneration!==1)denyProof();}
 else{const p=a.prior,q=s.prior;if(!p||!q||!i.prior||!i.baseline.credential)denyProof();
  const old=w.generations.find(g=>g.epoch===p.worker.epoch),historical=replayProofKeys(s.workerHistory.slice(0,p.worker.revision));
  if(!proofEqual(proofReference(historical,p.worker.epoch),p.worker)||!proofEqual(p.worker.scope,a.worker.scope)||old?.state!=='revoked'||a.worker.epoch<=p.worker.epoch||
   p.ticketId!==q.ticketId||p.decisionId!==q.decisionId||p.requestId!==q.requestId||p.enrollmentGeneration!==q.enrollmentGeneration||
   !proofEqual(i.prior,q.predecessor)||p.ticketId!==i.prior.ticketId||i.prior.workspaceId!==a.workspaceId||i.prior.hostId!==b.hostId||
   i.prior.generation!==p.enrollmentGeneration||i.prior.credentialEpoch!==q.credentialEpoch||q.credentialEpoch!==i.baseline.credentialHighWater||
   q.credentialId!==i.baseline.credential.id||q.credentialEpoch!==i.baseline.credential.epoch||
   a.enrollmentGeneration!==p.enrollmentGeneration+1||a.ticketId===p.ticketId||a.decisionId===p.decisionId||a.requestId===p.requestId)denyProof();
 }return {command:freezePublic(c),authority:freezePublic(s)};
}
export function prepareV3Ticket(command:unknown,value:unknown){const {command:c,authority:s}=validateV3Authority(command,value),a=s.attachment;
 const context=v3Context.parse({operationId:c.operationId,attachmentId:s.attachmentId,attachmentDigest:s.attachmentDigest,authorityRevision:s.authorityRevision,authorityDigest:s.authorityDigest,sourceDigest:s.sourceDigest,sourceFence:s.fence,
  ...Object.fromEntries(['attemptId','linkId','channelGrantId','channelHistoryId','issueEventId','consumeEventId','attemptHistoryId','receiptEventId'].map(slot=>[slot,v3SlotId(c.operationId,slot)])),issuer:s.issuer,lifecycle:s.lifecycle,channel:s.channel});
 const payload=v3Ticket.parse({version:'worker-bootstrap-owner-ticket-v3',id:a.ticketId,ownerId:a.ownerId,ownerAuthAt:s.owner.authenticatedAt,issuedAt:s.at,decisionId:a.decisionId,decisionRevision:a.decisionRevision,
  decisionIntentDigest:s.owner.intentDigest,intent:s.intent,context,contentDomain:v3Domains.content});
 const decision=bootstrapOwnerDecision.parse({id:a.decisionId,revision:a.decisionRevision,ownerId:a.ownerId,authority:'owner_reserved',state:'accepted',intentDigest:s.owner.intentDigest,acceptedAt:s.owner.acceptedAt,expiresAt:s.owner.expiresAt});
 return freezePublic({payload,decision,contentBytes:v3Transcript(v3Domains.content,a,context,payload).toString('hex'),decisionBytes:v3Transcript(v3Domains.decision,a,context,decision).toString('hex')});
}
export function prepareV3Seal(command:unknown,value:unknown,envelope:unknown){const {command:c,authority:s}=validateV3Authority(command,value),prepared=prepareV3Ticket(c,s),e=v3Envelope.parse(envelope);
 if(!proofEqual(e.signed.payload,prepared.payload)||!proofEqual(e.decision.payload,prepared.decision))denyProof();
 const linkBinding=v3LinkBinding.parse({version:'bootstrap-proof-ticket-link-v3',domain:v3Domains.link,operationId:c.operationId,attachmentId:s.attachmentId,attachmentDigest:s.attachmentDigest,
  ticketId:s.attachment.ticketId,ticketContentDigest:createHash('sha256').update(v3Transcript(v3Domains.content,s.attachment,e.signed.payload.context,e.signed.payload)).digest('hex'),
  ticketEnvelopeDigest:v3EnvelopeDigest(e),attemptId:e.signed.payload.context.attemptId,context:e.signed.payload.context});
 const payload=v3SealPayload.parse({version:'bootstrap-proof-attempt-seal-v3',domain:v3Domains.seal,linkBinding,linkBindingDigest:proofDigest([v3Domains.link,linkBinding]),attachment:s.attachment,sealedAt:s.at,state:'sealed'});
 return freezePublic({payload,bytes:v3Transcript(v3Domains.seal,s.attachment,e.signed.payload.context,payload).toString('hex')});
}
export function validateV3Plan(input:unknown){proofBytes(input);const p=v3Plan.parse(input),expected=prepareV3Seal(p.command,p.authority,p.envelope);
 if(!proofEqual(p.seal.payload,expected.payload)||!proofEqual(p.link,{...expected.payload.linkBinding,sealDigest:v3SealDigest(p.seal)}))denyProof();return freezePublic(p);
}
