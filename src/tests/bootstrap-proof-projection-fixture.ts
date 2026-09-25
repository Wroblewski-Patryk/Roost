import {proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {prepareV3Ticket,prepareV3Seal,validateV3Plan,v3SealDigest,v3Domains,v3AuthorityVersion,v3SlotId,type V3Plan} from '../modules/api-keys/bootstrap-proof-issuance-contract';
import {v3WritePhases,type V3Phase} from '../modules/api-keys/bootstrap-proof-issuance';
import {projectionSources,sortProjectionRows,projectionSetDigest,projectionFactsDigest,captureV3Projection,v3ProjectionRecipe,projectionIds,
 projectionDomains,projectionRecordDigest,projectV3Sources,createV3ProjectionReader,requiredV3ProjectionRows,
 type ProjectionRow,type ProjectionHead,type ProjectionFrame,type ProjectionAnchor,type ProjectionMutation,type ProjectionReceipt,type ProjectionEpoch,type ProjectionEvidence,type ProjectionCommitment,type V3ProjectionPort} from '../modules/api-keys/bootstrap-proof-projection';
import {v3AuthorityFixture,copy,hash} from './bootstrap-proof-issuance-fixture';
import {proofId} from './bootstrap-proof-persistence-fixture';
import type {AttestationDb as Db} from '../modules/api-keys/decision-attestation-sql';

export function projectionFixture(recovery=false,secondaryFanout=true){
 const f=v3AuthorityFixture(recovery),a=f.authority.attachment,s=f.authority,host=`${a.workspaceId}:${a.generation.hostId}`;
 if(recovery){
  s.channel.previousRevision=s.channel.previousHighWater=1;s.channel.previousDigest=hash('c');
  s.channel.snapshot.revision=s.channel.snapshot.certificateEpoch=s.channel.snapshot.highWaterEpoch=2;
  s.intent.channel.revision=s.intent.channel.certificateEpoch=s.intent.channel.highWaterEpoch=2;
  s.channel.snapshot.recordDigest=channelSnapshotDigest(s.channel.snapshot);s.owner.intentDigest=proofDigest(s.intent);
 }
 const heads:ProjectionHead[]=[{decisionId:a.decisionId,revision:s.authorityRevision,digest:s.authorityDigest,fanout:true},
  {decisionId:proofId(),revision:'2',digest:hash('d'),fanout:secondaryFanout}].sort((a,b)=>a.decisionId<b.decisionId?-1:1);
 const rows:ProjectionRow[]=heads.flatMap(h=>[
  {source:'decision' as const,key:h.decisionId,digest:proofDigest(['model-decision',h.decisionId]),bindingDigest:proofDigest({decisionId:h.decisionId,fanout:h.fanout})},
  ...Array.from({length:Number(h.revision)},(_,n)=>({source:'decision_authority_event' as const,key:`${h.decisionId}:${n+1}`,
   digest:n+1===Number(h.revision)?h.digest:proofDigest(['model-prior-authority',h.decisionId,n+1]),bindingDigest:proofDigest({decisionId:h.decisionId,revision:String(n+1)})}))
 ]);
 for(const source of ['attestation_key','credential','handoff','dispatch','completion'] as const){
  const key=proofId();
  const binding={source,key,ownerId:a.ownerId,installationId:a.installationId};rows.push({source,key,digest:proofDigest(['model-native-row',binding]),bindingDigest:proofDigest(binding)});
 }
 // Required logical identities are derived from the already validated public
 // authority. Native port extraction/field mapping remains a future obligation.
 for(const row of requiredV3ProjectionRows({authority:s}))rows.push({...row,digest:proofDigest(['model-native-required',row])});
 if(recovery)for(const source of ['channel_head','bootstrap_head'] as const)rows.push({source,key:host,digest:hash(source==='channel_head'?'c':'e'),bindingDigest:proofDigest({source,prior:a.prior})});
 s.sourceDigest=projectionSetDigest(rows);f.command.expected=v3AuthorityVersion(s);
 const ticket=prepareV3Ticket(f.command,s),envelope={version:'worker-bootstrap-owner-envelope-v3',domain:v3Domains.envelope,
  signed:{payload:ticket.payload,signature:'0'.repeat(128)},decision:{payload:ticket.decision,signature:'1'.repeat(128)}};
 const seal={payload:prepareV3Seal(f.command,s,envelope).payload,signature:'2'.repeat(128)};
 const plan=validateV3Plan({version:'bootstrap-proof-issuance-plan-v3',command:f.command,authority:s,envelope,seal,link:{...seal.payload.linkBinding,sealDigest:v3SealDigest(seal)}});
 const before:ProjectionFrame={coverage:[...projectionSources],rows:sortProjectionRows(rows),heads,factsDigest:projectionFactsDigest(plan),sourceSetDigest:s.sourceDigest,fence:s.fence};
 const baseline=captureV3Projection(plan,before),recipe=v3ProjectionRecipe(plan,heads);
 return {plan,baseline,recipe,evidence:(through:V3Phase='seal',shared=true)=>buildEvidence(plan,baseline,through,shared)};
}

// Public logical trace model only. The opaque native-row digests below stand
// in for full native rows; no PostgreSQL guard/trigger behavior is simulated.
export function buildEvidence(plan:V3Plan,baseline:ProjectionAnchor,through:V3Phase,shared=true):ProjectionEvidence{
 const recipe=v3ProjectionRecipe(plan,baseline.before.heads).filter(w=>v3WritePhases.indexOf(w.phase)<=v3WritePhases.indexOf(through));
 const writes=new Map(recipe.map(w=>[w.slot,w]));
 const rootOf=(slot:string):string=>writes.get(slot)!.parentSlot?rootOf(writes.get(slot)!.parentSlot!):slot;
 const groupSlots=[...new Set(recipe.map(w=>shared?rootOf(w.slot):w.slot))];
 let fence=BigInt(baseline.before.fence),previous=baseline.digest;
 const groups=groupSlots.map(slot=>({slot,statement:String(++fence),row:String(++fence)}));
 const rows=new Map(baseline.before.rows.map(r=>[`${r.source}:${r.key}`,copy(r)])),heads=new Map(baseline.before.heads.map(h=>[h.decisionId,copy(h)]));
 const mutations:ProjectionMutation[]=[];
 for(const spec of recipe){
  const parent=spec.parentSlot?mutations.find(m=>m.slot===spec.parentSlot)!:null;
  let key=spec.key,binding=spec.binding,authorityChange:ProjectionMutation['authorityChange']=null;
  if(spec.authorityFor){const h=heads.get(spec.authorityFor)!;
   authorityChange={decisionId:h.decisionId,revision:String(BigInt(h.revision)+1n),previousDigest:h.digest,action:'source_change',
    source:parent!.after.source,sourceKey:parent!.after.key,sourceDigest:parent!.after.digest,causeMutationId:parent!.id};binding=authorityChange;key=`${h.decisionId}:${authorityChange.revision}`;
  }
  const after={source:spec.source,key,digest:proofDigest(['model-full-native-row',spec.slot,binding,plan.command.operationId]),bindingDigest:proofDigest(binding)};
  const body={id:projectionIds.mutation(plan.command.operationId,spec.slot),slot:spec.slot,phase:spec.phase,operationId:plan.command.operationId,writerXid:plan.authority.writerXid,
   epoch:groups.find(g=>g.slot===(shared?rootOf(spec.slot):spec.slot))!.row,parentId:parent?.id??null,beforeDigest:rows.get(`${spec.source}:${key}`)?.digest??null,
   after,authorityChange,previousDigest:previous};
  const m={...body,digest:proofDigest([projectionDomains.mutation,body])};mutations.push(m);previous=m.digest;rows.set(`${spec.source}:${key}`,after);
  if(authorityChange)heads.set(authorityChange.decisionId,{...heads.get(authorityChange.decisionId)!,revision:authorityChange.revision,digest:after.digest});
 }
 const receipts:ProjectionReceipt[]=recipe.flatMap(spec=>spec.families.map(family=>{
  const m=mutations.find(m=>m.slot===spec.slot)!,parent=spec.parentSlot?writes.get(spec.parentSlot)!:null;
  const parentReceiptId=parent?projectionIds.receipt(plan.command.operationId,parent.slot,parent.families.includes('attestation')?'attestation':parent.families[0]):null;
  const id=projectionIds.receipt(plan.command.operationId,spec.slot,family),event={id:v3SlotId(plan.command.operationId,`projection-event:${spec.slot}:${family}`),
   workspaceId:baseline.workspaceId,operationId:plan.command.operationId,writerXid:baseline.writerXid,phase:spec.phase,epoch:m.epoch,receiptId:id,
   subjectId:m.id,subjectDigest:m.after.digest,family,source:m.after.source,key:m.after.key,parentReceiptId,launchAuthority:false as const};
  const body={id,subjectId:m.id,family,operationId:plan.command.operationId,writerXid:baseline.writerXid,phase:spec.phase,epoch:m.epoch,rowDigest:m.after.digest,
   parentReceiptId,nativeReceiptKey:`${family}:${id}`,nativeReceiptDigest:proofDigest(['model-native-receipt',id,event]),nativeEventDigest:proofDigest(['model-native-event',event]),
   event,eventDigest:proofDigest(event)};return {...body,digest:proofDigest([projectionDomains.receipt,body])};
 })).sort((a,b)=>a.id<b.id?-1:1);
 const epochs:ProjectionEpoch[]=[];previous=baseline.digest;
 for(const g of groups){const driver=mutations.find(m=>m.slot===g.slot)!,root=mutations.find(m=>m.slot===rootOf(g.slot))!;
  for(const [revision,statement] of [[g.statement,true],[g.row,false]] as const){
   const members=statement?[]:mutations.filter(m=>m.epoch===revision).map(m=>m.id),rs=statement?[]:receipts.filter(r=>r.epoch===revision).map(r=>r.id);
   const body={id:v3SlotId(plan.command.operationId,`projection-epoch:${revision}`),operationId:plan.command.operationId,writerXid:baseline.writerXid,phase:driver.phase,
    nativeReceiptKey:`fence:${revision}`,nativeReceiptDigest:proofDigest(['model-native-fence-receipt',revision,driver.id]),nativeEventDigest:proofDigest(['model-native-fence-event',revision,driver.id]),
    revision,driverId:driver.id,rootId:root.id,guard:statement?'statement_guard' as const:driver.parentId?'nested_guard' as const:'row_guard' as const,
    members,receipts:rs,memberCount:members.length,receiptCount:rs.length,eventCount:rs.length,previousDigest:previous};
   const e={...body,digest:proofDigest([projectionDomains.epoch,body])};epochs.push(e);previous=e.digest;
  }
 }
 const after:ProjectionFrame={coverage:[...projectionSources],rows:sortProjectionRows([...rows.values()]),heads:[...heads.values()].sort((a,b)=>a.decisionId<b.decisionId?-1:1),
  factsDigest:baseline.before.factsDigest,sourceSetDigest:projectionSetDigest([...rows.values()]),fence:String(fence)};
 return {version:'bootstrap-v3-projection-evidence-v1',anchorDigest:baseline.digest,through,mutations,receipts,epochs,after};
}

// Resigning removes the easy "bad self-hash" failure, so tamper tests exercise
// causal/semantic/full-set constraints rather than just digest equality.
export function rehashEvidence(e:ProjectionEvidence,baseline:ProjectionAnchor){
 let previous=baseline.digest;
 for(const m of e.mutations){m.previousDigest=previous;m.digest=projectionRecordDigest(projectionDomains.mutation,m);previous=m.digest;}
 for(const r of e.receipts){r.eventDigest=proofDigest(r.event);r.digest=projectionRecordDigest(projectionDomains.receipt,r);}
 previous=baseline.digest;for(const f of e.epochs){f.previousDigest=previous;f.digest=projectionRecordDigest(projectionDomains.epoch,f);previous=f.digest;}
 e.after.sourceSetDigest=projectionSetDigest(e.after.rows);return e;
}
export function commitmentOf(result:ReturnType<typeof projectV3Sources>):ProjectionCommitment{
 const {operationId,writerXid,planDigest,anchorDigest,fromFence,toFence,finalSourceSetDigest,lineageDigest}=result;
 return {version:'bootstrap-v3-projection-commitment-v1',operationId,writerXid,planDigest,anchorDigest,fromFence,toFence,finalSourceSetDigest,lineageDigest};
}

export function projectionTransactionFixture(recovery=false){
 const f=projectionFixture(recovery);let committed:{anchor:ProjectionAnchor;evidence:ProjectionEvidence;commitment:ProjectionCommitment}|null=null;
 let attempted=false,serial=0,tail=Promise.resolve();
 const active=new Map<Db,{anchor:ProjectionAnchor;evidence:ProjectionEvidence}>(),calls:{id:number;mode:string;phase:V3Phase}[]=[];
 const stats={writes:0,reads:0},faults:{value?:string;phase?:(e:ProjectionEvidence)=>void;readback?:(packet:any)=>void}={};
 const ids=new Map<Db,number>();
 const port:V3ProjectionPort={qualification:'source_only_canonical_projection_port_v3',async read(db,operationId,phase){
  const packet=active.get(db)??committed;if(!packet)throw Error('readback absent');if(operationId!==f.plan.command.operationId)throw Error('wrong operation');
  stats.reads++;calls.push({id:ids.get(db)!,mode:active.has(db)?'write':'read',phase});const result={anchor:copy(packet.anchor),evidence:copy(packet.evidence)};
  if(!active.has(db)){if(faults.value==='readback')throw Error('readback unavailable');faults.readback?.(result);}
  return result;
 }};
 const reader=createV3ProjectionReader(port);
 async function reconcile(){const db={} as Db;ids.set(db,++serial);if(!committed)return {ok:false,uncertain:true,retryable:false};
  try{const proof=await reader.verify(db,f.plan,'seal',committed.commitment);return {ok:true,replayed:true,proof,retryable:false};}
  catch{return {ok:false,uncertain:true,retryable:false};}
 }
 async function issue(){
  if(committed)return reconcile();if(attempted)return {ok:false,uncertain:true,retryable:false};
  let release=()=>{};const previous=tail;tail=new Promise<void>(r=>{release=r;});await previous;
  const db={} as Db;ids.set(db,++serial);
  try{
   if(committed)return reconcile();if(attempted)return {ok:false,uncertain:true,retryable:false};attempted=true;
   let final:ReturnType<typeof projectV3Sources>|undefined;
   for(const phase of v3WritePhases){
    const evidence=f.evidence(phase);stats.writes++;faults.phase?.(evidence);active.set(db,{anchor:copy(f.baseline),evidence});
    final=await reader.verify(db,f.plan,phase);if(faults.value===phase)throw Error('phase failure');
   }
   // Precommit and committed readback use exactly the same verifier/commitment.
   const commitment=commitmentOf(final!);await reader.verify(db,f.plan,'seal',commitment);
   if(faults.value==='commit')throw Error('deferred rejection');
   if(faults.value!=='false-commit')committed={...copy(active.get(db)!),commitment};active.delete(db);
   if(faults.value==='lost-ack')throw Error('acknowledgement lost');
   const read=await reconcile();return {...read,replayed:false};
  }catch{return {ok:false,uncertain:true,retryable:false};}
  finally{active.delete(db);release();}
 }
 return {...f,issue,reconcile,reader,port,stats,calls,faults,state:()=>copy(committed)};
}
