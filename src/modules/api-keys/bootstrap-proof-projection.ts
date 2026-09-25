import {z} from 'zod';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';
import {proofEqual,proofHash,denyProof} from './bootstrap-proof-key-contract';
import {validateV3Plan,v3SlotId,type V3Plan} from './bootstrap-proof-issuance-contract';
import {v3WritePhases,type V3Phase} from './bootstrap-proof-issuance';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import type {AttestationDb as Db} from './decision-attestation-sql';

// Logical source roles, NOT a proposed SQL schema. The native port must cover
// complete source sets, including empty sets, and map full native row digests.
export const projectionSources=[
 'workspace','membership','decision','decision_revision','decision_acceptance','owner_auth','identity','host','issuer','attestation_key','anchor',
 'ticket','attempt','credential','handoff','ticket_lifecycle','bootstrap_history','dispatch','completion',
 'proof_key','proof_attachment','proof_link','channel_generation','channel_grant','channel_history','channel_head','channel_audit',
 'bootstrap_head','bootstrap_audit','decision_authority_event','v3_reservation','v3_seal','v3_seal_audit'
] as const;
const id=z.string().uuid(),epoch=z.string().regex(/^[1-9][0-9]{0,19}$/),key=z.string().regex(/^[A-Za-z0-9_:.-]{1,240}$/);
const phase=z.enum(v3WritePhases),source=z.enum(projectionSources),family=z.enum(['lifecycle','attestation','transport','proof','projection']);
export const projectionRow=z.object({source,key,digest:proofHash,bindingDigest:proofHash}).strict();
export type ProjectionRow=z.infer<typeof projectionRow>;
const head=z.object({decisionId:id,revision:epoch,digest:proofHash,fanout:z.boolean()}).strict();
export type ProjectionHead=z.infer<typeof head>;
const frame=z.object({coverage:z.array(source),rows:z.array(projectionRow).max(1024),heads:z.array(head).min(1).max(32),
 factsDigest:proofHash,sourceSetDigest:proofHash,fence:epoch}).strict();
export type ProjectionFrame=z.infer<typeof frame>;
const anchor=z.object({version:z.literal('bootstrap-v3-projection-anchor-v1'),operationId:id,workspaceId:id,writerXid:epoch,planDigest:proofHash,
 before:frame,digest:proofHash}).strict();
export type ProjectionAnchor=z.infer<typeof anchor>;
const authorityChange=z.object({decisionId:id,revision:epoch,previousDigest:proofHash,action:z.literal('source_change'),
 source,sourceKey:key,sourceDigest:proofHash,causeMutationId:id}).strict();
const mutation=z.object({id,slot:key,phase,operationId:id,writerXid:epoch,epoch,parentId:id.nullable(),beforeDigest:proofHash.nullable(),
 after:projectionRow,authorityChange:authorityChange.nullable(),previousDigest:proofHash,digest:proofHash}).strict();
export type ProjectionMutation=z.infer<typeof mutation>;
const event=z.object({id,workspaceId:id,operationId:id,writerXid:epoch,phase,epoch,receiptId:id,subjectId:id,subjectDigest:proofHash,
 family,source,key,parentReceiptId:id.nullable(),launchAuthority:z.literal(false)}).strict();
const receipt=z.object({id,subjectId:id,family,operationId:id,writerXid:epoch,phase,epoch,rowDigest:proofHash,parentReceiptId:id.nullable(),
 nativeReceiptKey:key,nativeReceiptDigest:proofHash,nativeEventDigest:proofHash,event,eventDigest:proofHash,digest:proofHash}).strict();
export type ProjectionReceipt=z.infer<typeof receipt>;
const fenceEvent=z.object({id,operationId:id,writerXid:epoch,phase,revision:epoch,driverId:id,rootId:id,
 nativeReceiptKey:key,nativeReceiptDigest:proofHash,nativeEventDigest:proofHash,
 guard:z.enum(['row_guard','statement_guard','nested_guard']),members:z.array(id),receipts:z.array(id),
 memberCount:z.number().int().nonnegative(),receiptCount:z.number().int().nonnegative(),eventCount:z.number().int().nonnegative(),
 previousDigest:proofHash,digest:proofHash}).strict();
export type ProjectionEpoch=z.infer<typeof fenceEvent>;
export const projectionEvidence=z.object({version:z.literal('bootstrap-v3-projection-evidence-v1'),anchorDigest:proofHash,through:phase,
 mutations:z.array(mutation).max(512),receipts:z.array(receipt).max(1024),epochs:z.array(fenceEvent).min(1).max(1024),after:frame}).strict();
export type ProjectionEvidence=z.infer<typeof projectionEvidence>;
export const projectionCommitment=z.object({version:z.literal('bootstrap-v3-projection-commitment-v1'),operationId:id,writerXid:epoch,
 planDigest:proofHash,anchorDigest:proofHash,fromFence:epoch,toFence:epoch,finalSourceSetDigest:proofHash,lineageDigest:proofHash}).strict();
export type ProjectionCommitment=z.infer<typeof projectionCommitment>;
const bytesCompare=(a:string,b:string)=>Buffer.compare(Buffer.from(a),Buffer.from(b));
const rowKey=(r:Pick<ProjectionRow,'source'|'key'>)=>`${r.source}:${r.key}`;
export const sortProjectionRows=(rows:ProjectionRow[])=>[...rows].sort((a,b)=>bytesCompare(rowKey(a),rowKey(b)));
export const projectionSetDigest=(rows:ProjectionRow[])=>proofDigest(['roost-bootstrap-v3-full-source-set-v1',sortProjectionRows(rows)]);
export function projectionFactsDigest(p:V3Plan){
 const {at,fence,writerXid,authorityRevision,authorityDigest,sourceDigest,...facts}=p.authority;
 return proofDigest(['roost-bootstrap-v3-protected-authority-v1',facts]);
}
export const projectionRecordDigest=(domain:string,value:Record<string,unknown>)=>{
 const {digest,...body}=value;return proofDigest([domain,body]);
};
export const projectionDomains=Object.freeze({anchor:'roost-bootstrap-v3-anchor-v1',mutation:'roost-bootstrap-v3-mutation-v1',
 receipt:'roost-bootstrap-v3-receipt-v1',epoch:'roost-bootstrap-v3-epoch-v1',lineage:'roost-bootstrap-v3-lineage-v1'});

function plainFields(value:unknown):Record<string,unknown>{
 if(value===null||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)denyProof();
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.length>64||keys.some(k=>typeof k!=='string')||Object.values(fields).some(d=>!('value' in d)||!d.enumerable))denyProof();
 return Object.fromEntries(Object.entries(fields).map(([k,d])=>[k,d.value]));
}
function checkedEvidence(value:unknown){
 const fields=plainFields(value),summary:Record<string,string>={};let bytes=0;
 const hashRecord=(record:unknown)=>{bytes+=proofBytes(record).length;if(bytes>1048576)denyProof();return proofDigest(record);};
 for(const [name,value] of Object.entries(fields)){
  if(['mutations','receipts','epochs'].includes(name)){
   if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)denyProof();
   const descriptors=Object.getOwnPropertyDescriptors(value) as unknown as Record<string,PropertyDescriptor>,keys=Reflect.ownKeys(value),length=descriptors.length.value;
   if(!Number.isSafeInteger(length)||length<0||length>1024||keys.length!==length+1||keys.some(k=>typeof k!=='string')||
    Object.values(descriptors).some(d=>!('value' in d)))denyProof();
   const hashes=[];for(let n=0;n<length;n++){const d=descriptors[String(n)];if(!d?.enumerable)denyProof();hashes.push(hashRecord(d.value));}
   summary[name]=proofDigest(hashes);
  }else summary[name]=hashRecord(value);
 }
 // The ledger is a bounded collection of individually v72-encoded records.
 // Its commitment covers every ordered record hash; no truncation or relaxed
 // per-record encoder limits, even for deeply nested native audit fan-out.
 return {evidence:projectionEvidence.parse(fields),summary};
}

export function requiredV3ProjectionRows(p:Pick<V3Plan,'authority'>){
 const s=p.authority,a=s.attachment,b=s.intent.binding;
 const required:Omit<ProjectionRow,'digest'>[]=[];
 const add=(source:ProjectionRow['source'],key:string,binding:unknown)=>required.push({source,key,bindingDigest:proofDigest(binding)});
 add('workspace',a.workspaceId,{workspaceId:a.workspaceId,ownerId:a.ownerId});
 add('membership',`${a.workspaceId}:${a.ownerId}`,{workspaceId:a.workspaceId,ownerId:a.ownerId,role:'owner'});
 add('decision_revision',`${a.decisionId}:${a.decisionRevision}`,{decisionId:a.decisionId,revision:a.decisionRevision,intentDigest:s.owner.intentDigest,attachmentDigest:s.attachmentDigest});
 add('decision_acceptance',a.decisionId,s.owner);
 add('owner_auth',`${a.decisionId}:${s.owner.authenticatedAt}`,{decisionId:a.decisionId,ownerId:a.ownerId,authenticatedAt:s.owner.authenticatedAt});
 add('identity',s.lifecycle.installationLifecycleId,{subjectId:a.installationId,generation:a.generation.installationGeneration,enabled:true});
 add('identity',s.lifecycle.hostLifecycleId,{subjectId:a.generation.hostId,generation:a.generation.hostGeneration,enabled:true});
 add('host',b.hostId,{hostId:b.hostId,epoch:b.hostEpoch,fingerprint:b.hostFingerprint,enabled:true});
 add('anchor',a.installationId,{workspaceId:a.workspaceId,installationId:a.installationId,epoch:b.installationEpoch,keyId:b.ticketKeyId,keyEpoch:b.ticketKeyEpoch,publicKeyDigest:b.ticketPublicKeyDigest});
 add('issuer',`${a.installationId}:${s.issuer.revision}`,s.issuer);
 add('proof_attachment',s.attachmentId,a);
 for(const record of [...s.workerHistory,...s.serverHistory])add('proof_key',`${record.intent.scope.principal}:${record.revision}`,record);
 return required;
}

function checkedFrame(input:unknown){
 proofBytes(input);const f=frame.parse(input);
 if(!proofEqual(f.coverage,projectionSources)||!proofEqual(f.rows,sortProjectionRows(f.rows))||new Set(f.rows.map(rowKey)).size!==f.rows.length||
  new Set(f.heads.map(h=>h.decisionId)).size!==f.heads.length||!proofEqual(f.heads,[...f.heads].sort((a,b)=>bytesCompare(a.decisionId,b.decisionId)))||
  f.sourceSetDigest!==projectionSetDigest(f.rows))denyProof();
 for(const r of f.rows.filter(r=>r.source==='decision')){
  const h=f.heads.find(h=>h.decisionId===r.key);
  if(r.bindingDigest!==proofDigest({decisionId:r.key,fanout:h?.fanout??false}))denyProof();
 }
 for(const h of f.heads){
  const history=f.rows.filter(r=>r.source==='decision_authority_event'&&r.key.startsWith(`${h.decisionId}:`));
  if(!f.rows.some(r=>r.source==='decision'&&r.key===h.decisionId)||BigInt(history.length)!==BigInt(h.revision)||
   Array.from({length:history.length},(_,i)=>`${h.decisionId}:${i+1}`).some(k=>!history.some(r=>r.key===k))||
   !history.some(r=>r.key===`${h.decisionId}:${h.revision}`&&r.digest===h.digest))denyProof();
 }
 if(f.rows.some(r=>r.source==='decision_authority_event'&&!f.heads.some(h=>r.key.startsWith(`${h.decisionId}:`))))denyProof();
 return f;
}
export function captureV3Projection(plan:unknown,input:unknown):Readonly<ProjectionAnchor>{
 const p=validateV3Plan(plan),before=checkedFrame(input),a=p.authority,h=before.heads.find(h=>h.decisionId===a.attachment.decisionId);
 if(before.fence!==a.fence||before.sourceSetDigest!==a.sourceDigest||before.factsDigest!==projectionFactsDigest(p)||
  h?.revision!==a.authorityRevision||h.digest!==a.authorityDigest||!h.fanout)denyProof();
 for(const required of requiredV3ProjectionRows(p))if(!before.rows.some(r=>r.source===required.source&&r.key===required.key&&r.bindingDigest===required.bindingDigest))denyProof();
 const body={version:'bootstrap-v3-projection-anchor-v1' as const,operationId:p.command.operationId,workspaceId:a.attachment.workspaceId,
  writerXid:a.writerXid,planDigest:proofDigest(p),before};
 return freezePublic({...body,digest:proofDigest([projectionDomains.anchor,body])});
}

export type ProjectionWrite={slot:string;phase:V3Phase;source:ProjectionRow['source'];key:string;binding:unknown;parentSlot:string|null;
 families:z.infer<typeof family>[];update:boolean;authorityFor:string|null};
// Exact logical write recipe. Automatic decision fan-out includes EVERY decision
// in the captured authority-head inventory, not just the ticket's decision.
export function v3ProjectionRecipe(plan:V3Plan,heads:ProjectionHead[]):ProjectionWrite[]{
 const p=validateV3Plan(plan),c=p.envelope.signed.payload.context,a=p.authority.attachment,host=`${a.workspaceId}:${a.generation.hostId}`,writes:ProjectionWrite[]=[];
 const add=(phase:V3Phase,slot:string,source:ProjectionRow['source'],key:string,binding:unknown,families:ProjectionWrite['families'],parentSlot:string|null=null,fanout=false,update=false)=>{
  writes.push({phase,slot,source,key,binding,families,parentSlot,update,authorityFor:null});
  if(fanout)for(const h of heads.filter(h=>h.fanout))writes.push({phase,slot:`${slot}:authority:${h.decisionId}`,source:'decision_authority_event',key:'derived',binding:null,
   families:['attestation'],parentSlot:slot,update:false,authorityFor:h.decisionId});
 };
 add('reservation','reservation','v3_reservation',p.command.operationId,{attachmentId:p.command.attachmentId,attachmentDigest:p.command.expected.attachmentDigest,planDigest:proofDigest(p)},['projection']);
 add('ticket','ticket','ticket',a.ticketId,p.envelope,['lifecycle','attestation'],null,true);
 add('ticket','ticket-audit','bootstrap_audit',`${a.ticketId}:issue`,{ticketId:a.ticketId,envelopeDigest:p.link.ticketEnvelopeDigest},['lifecycle','attestation'],'ticket');
 add('ticket','ticket-issue','ticket_lifecycle',c.issueEventId,{ticketId:a.ticketId,action:'issue',state:'issued'},['lifecycle','attestation'],'ticket');
 add('channel','channel-generation','channel_generation',c.channel.snapshot.generation,c.channel.snapshot,['transport','attestation'],null,true);
 add('channel','channel-grant','channel_grant',c.channelGrantId,{ticketId:a.ticketId,ticketDigest:p.link.ticketEnvelopeDigest,channel:c.channel},['transport','attestation'],null,true);
 add('channel','channel-history','channel_history',c.channelHistoryId,{grantId:c.channelGrantId,snapshot:c.channel.snapshot},['transport','attestation'],null,true);
 add('channel','channel-head','channel_head',host,{historyId:c.channelHistoryId,snapshot:c.channel.snapshot},['transport','attestation'],'channel-history',true,true);
 add('channel','channel-audit','channel_audit',c.channelHistoryId,{historyId:c.channelHistoryId,grantId:c.channelGrantId},['transport'],'channel-history');
 add('attempt','attempt','attempt',c.attemptId,{ticketId:a.ticketId,ticketDigest:p.link.ticketEnvelopeDigest,requestId:a.requestId,binding:p.authority.intent.binding,target:p.authority.intent.target},['lifecycle','attestation']);
 add('attempt','attempt-history','bootstrap_history',c.attemptHistoryId,{attemptId:c.attemptId,state:'consumed'},['lifecycle','attestation'],'attempt');
 add('attempt','attempt-head','bootstrap_head',host,{attemptId:c.attemptId,historyId:c.attemptHistoryId},['lifecycle','attestation'],'attempt-history',false,true);
 add('attempt','attempt-audit','bootstrap_audit',`${c.attemptHistoryId}:consume`,{attemptId:c.attemptId,historyId:c.attemptHistoryId},['lifecycle','attestation'],'attempt-history');
 add('attempt','ticket-consume','ticket_lifecycle',c.consumeEventId,{ticketId:a.ticketId,attemptId:c.attemptId,historyId:c.attemptHistoryId,action:'consume',state:'consumed'},['lifecycle','attestation'],'attempt');
 add('link','proof-link','proof_link',c.linkId,p.link,['proof']);
 add('seal','attempt-seal','v3_seal',c.attemptId,p.seal,['projection']);
 add('seal','seal-audit','v3_seal_audit',c.receiptEventId,{operationId:p.command.operationId,planDigest:proofDigest(p),sealDigest:p.link.sealDigest},['projection'],'attempt-seal');
 return freezePublic(writes);
}

function expectedId(op:string,kind:string,slot:string){return v3SlotId(op,`projection:${kind}:${slot}`);}
export const projectionIds=Object.freeze({mutation:(op:string,slot:string)=>expectedId(op,'mutation',slot),
 receipt:(op:string,slot:string,f:string)=>expectedId(op,'receipt',`${slot}:${f}`)});

export function projectV3Sources(plan:unknown,baseline:unknown,evidence:unknown,through:V3Phase){
 const p=validateV3Plan(plan);proofBytes(baseline);const checked=checkedEvidence(evidence);
 const b=anchor.parse(baseline),e=checked.evidence,canonical=captureV3Projection(p,b.before);
 if(!proofEqual(b,canonical)||e.anchorDigest!==b.digest||e.through!==through)denyProof();
 phase.parse(through);const limit=v3WritePhases.indexOf(through),recipe=v3ProjectionRecipe(p,b.before.heads).filter(w=>v3WritePhases.indexOf(w.phase)<=limit);
 if(e.mutations.length!==recipe.length)denyProof();
 const rows=new Map(b.before.rows.map(r=>[rowKey(r),r])),heads=new Map(b.before.heads.map(h=>[h.decisionId,{...h}]));
 const mutations=new Map<string,ProjectionMutation>(),specs=new Map<string,ProjectionWrite>();let previous=b.digest,lastWriteEpoch=BigInt(b.before.fence);
 for(let n=0;n<recipe.length;n++){
  const spec=recipe[n],m=e.mutations[n],parent=spec.parentSlot?mutations.get(projectionIds.mutation(b.operationId,spec.parentSlot)):null;
  let afterKey=spec.key,binding=spec.binding;
  if(spec.authorityFor){
   const h=heads.get(spec.authorityFor);if(!h||!parent)denyProof();
   binding={decisionId:h.decisionId,revision:String(BigInt(h.revision)+1n),previousDigest:h.digest,action:'source_change',
    source:parent.after.source,sourceKey:parent.after.key,sourceDigest:parent.after.digest,causeMutationId:parent.id};
   afterKey=`${h.decisionId}:${(binding as any).revision}`;
   if(!proofEqual(m.authorityChange,binding))denyProof();
   heads.set(h.decisionId,{...h,revision:(binding as any).revision,digest:m.after.digest});
  }else if(m.authorityChange!==null)denyProof();
  const old=rows.get(`${spec.source}:${afterKey}`);
  if(m.id!==projectionIds.mutation(b.operationId,spec.slot)||m.slot!==spec.slot||m.phase!==spec.phase||m.operationId!==b.operationId||m.writerXid!==b.writerXid||
   m.parentId!==(parent?.id??null)||m.previousDigest!==previous||m.digest!==projectionRecordDigest(projectionDomains.mutation,m)||
   m.after.source!==spec.source||m.after.key!==afterKey||m.after.bindingDigest!==proofDigest(binding)||m.beforeDigest!==(old?.digest??null)||
   !spec.update&&old||old?.digest===m.after.digest||mutations.has(m.id)||BigInt(m.epoch)<lastWriteEpoch||BigInt(m.epoch)<=BigInt(b.before.fence))denyProof();
  mutations.set(m.id,m);specs.set(m.id,spec);rows.set(rowKey(m.after),m.after);previous=m.digest;lastWriteEpoch=BigInt(m.epoch);
 }
 const receipts=new Map<string,ProjectionReceipt>(),eventIds=new Set<string>(),nativeReceiptKeys=new Set<string>();
 if(e.receipts.length!==recipe.reduce((n,w)=>n+w.families.length,0)||!proofEqual(e.receipts,[...e.receipts].sort((a,b)=>bytesCompare(a.id,b.id))))denyProof();
 for(const r of e.receipts){
  const m=mutations.get(r.subjectId),spec=specs.get(r.subjectId);if(!m||!spec||!spec.families.includes(r.family))denyProof();
  const parentSpec=spec.parentSlot?recipe.find(w=>w.slot===spec.parentSlot):null;
  const parentReceipt=parentSpec?projectionIds.receipt(b.operationId,parentSpec.slot,parentSpec.families.includes('attestation')?'attestation':parentSpec.families[0]):null;
  if(r.id!==projectionIds.receipt(b.operationId,spec.slot,r.family)||receipts.has(r.id)||eventIds.has(r.event.id)||nativeReceiptKeys.has(r.nativeReceiptKey)||r.parentReceiptId!==parentReceipt||
   r.operationId!==b.operationId||r.writerXid!==b.writerXid||r.phase!==m.phase||BigInt(r.epoch)<BigInt(m.epoch)||r.rowDigest!==m.after.digest||
   r.digest!==projectionRecordDigest(projectionDomains.receipt,r)||r.eventDigest!==proofDigest(r.event)||
   !proofEqual(r.event,{id:r.event.id,workspaceId:b.workspaceId,operationId:b.operationId,writerXid:b.writerXid,phase:r.phase,epoch:r.epoch,
    receiptId:r.id,subjectId:m.id,subjectDigest:m.after.digest,family:r.family,source:m.after.source,key:m.after.key,parentReceiptId:parentReceipt,launchAuthority:false}))denyProof();
  receipts.set(r.id,r);eventIds.add(r.event.id);nativeReceiptKeys.add(r.nativeReceiptKey);
 }
 for(const r of receipts.values())if(r.parentReceiptId&&!receipts.has(r.parentReceiptId))denyProof();
 let lastFence=BigInt(b.before.fence),lastEpochDigest=b.digest,lastPhase=-1;
 const usedMutations=new Set<string>(),usedReceipts=new Set<string>(),epochIds=new Set<string>(),causes=new Set<string>();
 const rootOf=(m:ProjectionMutation):string=>m.parentId?rootOf(mutations.get(m.parentId)!):m.id;
 for(const f of e.epochs){
  const driver=mutations.get(f.driverId),root=mutations.get(f.rootId),cause=`${f.driverId}:${f.guard}`,pn=v3WritePhases.indexOf(f.phase);
  if(!driver||!root||rootOf(driver)!==root.id||driver.phase!==f.phase||root.phase!==f.phase||f.operationId!==b.operationId||f.writerXid!==b.writerXid||
   BigInt(f.revision)!==lastFence+1n||f.previousDigest!==lastEpochDigest||f.digest!==projectionRecordDigest(projectionDomains.epoch,f)||
   pn<lastPhase||pn>limit||epochIds.has(f.id)||eventIds.has(f.id)||nativeReceiptKeys.has(f.nativeReceiptKey)||causes.has(cause)||f.memberCount!==f.members.length||f.receiptCount!==f.receipts.length||f.eventCount!==f.receipts.length||
   new Set(f.members).size!==f.members.length||new Set(f.receipts).size!==f.receipts.length||
   f.guard==='statement_guard'&&(f.members.length!==0||f.receipts.length!==0)||f.guard!=='statement_guard'&&f.members.length===0||
   f.guard==='nested_guard'&&!driver.parentId||
   !proofEqual(f.members,e.mutations.filter(m=>m.epoch===f.revision).map(m=>m.id))||!proofEqual(f.receipts,e.receipts.filter(r=>r.epoch===f.revision).map(r=>r.id)))denyProof();
  for(const mid of f.members){const m=mutations.get(mid);if(!m||usedMutations.has(mid)||m.epoch!==f.revision||m.phase!==f.phase||rootOf(m)!==root.id)denyProof();usedMutations.add(mid);}
  for(const rid of f.receipts){const r=receipts.get(rid);if(!r||usedReceipts.has(rid)||r.epoch!==f.revision||r.phase!==f.phase||rootOf(mutations.get(r.subjectId)!)!==root.id)denyProof();usedReceipts.add(rid);}
  // Empty statement fences must causally precede their driver's row; all other
  // epochs account for that driver, rather than borrowing an unrelated root.
  if(f.guard==='statement_guard'?BigInt(f.revision)>=BigInt(driver.epoch):!f.members.includes(driver.id))denyProof();
  epochIds.add(f.id);nativeReceiptKeys.add(f.nativeReceiptKey);causes.add(cause);lastFence++;lastEpochDigest=f.digest;lastPhase=pn;
 }
 if(usedMutations.size!==mutations.size||usedReceipts.size!==receipts.size)denyProof();
 const after=checkedFrame(e.after),expectedRows=sortProjectionRows([...rows.values()]),expectedHeads=[...heads.values()].sort((a,b)=>bytesCompare(a.decisionId,b.decisionId));
 if(after.fence!==String(lastFence)||after.factsDigest!==b.before.factsDigest||!proofEqual(after.rows,expectedRows)||!proofEqual(after.heads,expectedHeads))denyProof();
 const lineageDigest=proofDigest([projectionDomains.lineage,b.digest,through,checked.summary]);
 return freezePublic({qualification:'source_only_v3_projection_v1' as const,operationId:b.operationId,writerXid:b.writerXid,planDigest:b.planDigest,
  anchorDigest:b.digest,fromFence:b.before.fence,toFence:after.fence,finalSourceSetDigest:after.sourceSetDigest,lineageDigest,
  projectedSourceSetDigest:b.before.sourceSetDigest,projectedAuthorityRevision:p.authority.authorityRevision,projectedAuthorityDigest:p.authority.authorityDigest,
  blockers:['bootstrap_proof_v3_native_projection_unavailable','bootstrap_proof_v3_persistence_unavailable','bootstrap_proof_signature_verifier_unavailable'],
  persistenceQualified:false,cryptographyQualified:false,sendPermit:false,...lifecycleFlags});
}

export type V3ProjectionPort={qualification:'source_only_canonical_projection_port_v3';
 // Must return the COMPLETE interval across ALL operations/XIDs and all source
 // rows/receipts/Events; filtering to this operation before validation is unsafe.
 read:(db:Db,operationId:string,through:V3Phase)=>Promise<unknown>};
// Read-only verifier: no repair, rebase, mutation, retry or default port.
export function createV3ProjectionReader(port?:V3ProjectionPort){
 const verified=new WeakMap<Db,{operationId:string;anchorDigest:string;phase:V3Phase;evidence:ProjectionEvidence}>(),failed=new WeakSet<Db>();
 return Object.freeze({async verify(db:Db,plan:unknown,through:V3Phase,committed?:unknown){
  try{
  if(failed.has(db))denyProof();
  if(port?.qualification!=='source_only_canonical_projection_port_v3'||typeof port.read!=='function')denyProof();
  const p=validateV3Plan(plan),raw=await port.read(db,p.command.operationId,phase.parse(through));
  const envelope=z.object({anchor:z.unknown(),evidence:z.unknown()}).strict().parse(plainFields(raw)),result=projectV3Sources(p,envelope.anchor,envelope.evidence,through);
  const packet={anchor:anchor.parse(envelope.anchor),evidence:projectionEvidence.parse(envelope.evidence)};
  const prior=verified.get(db),index=v3WritePhases.indexOf(through);
  if(prior){
   const oldIndex=v3WritePhases.indexOf(prior.phase),e=packet.evidence;
   if(prior.operationId!==p.command.operationId||prior.anchorDigest!==packet.anchor.digest||index<oldIndex||index>oldIndex+1||
    !proofEqual(e.mutations.filter(m=>v3WritePhases.indexOf(m.phase)<=oldIndex),prior.evidence.mutations)||
    !proofEqual(e.receipts.filter(r=>v3WritePhases.indexOf(r.phase)<=oldIndex),prior.evidence.receipts)||
    !proofEqual(e.epochs.filter(f=>v3WritePhases.indexOf(f.phase)<=oldIndex),prior.evidence.epochs))denyProof();
  }else if(committed===undefined&&through!=='reservation')denyProof();
  if(committed!==undefined){proofBytes(committed);const c=projectionCommitment.parse(committed);
   if(through!=='seal'||!proofEqual(c,{version:'bootstrap-v3-projection-commitment-v1',operationId:result.operationId,writerXid:result.writerXid,
    planDigest:result.planDigest,anchorDigest:result.anchorDigest,fromFence:result.fromFence,toFence:result.toFence,finalSourceSetDigest:result.finalSourceSetDigest,lineageDigest:result.lineageDigest}))denyProof();
  }
  verified.set(db,{operationId:p.command.operationId,anchorDigest:packet.anchor.digest,phase:through,evidence:freezePublic(packet.evidence)});return result;
  }catch(error){failed.add(db);throw error;}
 }});
}
