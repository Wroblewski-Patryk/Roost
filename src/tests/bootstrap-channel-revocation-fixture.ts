import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import type {ChannelTransition} from '../modules/api-keys/bootstrap-channel-persistence-contract';

// A mocked database transcript, not a second store/runtime implementation.
// Epochs explicitly model history INSERT, speculative head INSERT, head UPDATE,
// then nested source changes; audit/history legitimately share their final epoch.
export function channelRevocationEvidence(operation:ChannelTransition,scope:{workspaceId:string;hostId:string;generationId:string;ticketId:string},
 fromFence=100,writerXid='900',decisionCount=0){
 const headFence=fromFence+3,historyFence=headFence+decisionCount+1,through=historyFence+decisionCount;
 const digest=(label:string)=>reviewDigest({mockRow:label}),decisions=Array.from({length:decisionCount},()=>randomUUID());
 const base={operation:structuredClone(operation),...scope,writerXid,currentFence:String(through),verified:true,receipts:[
  {table:'worker_transport_heads',rowId:`${scope.workspaceId}:${scope.hostId}`,fence:String(headFence)},
  {table:'worker_transport_audit',rowId:operation.id,fence:String(historyFence)},
  {table:'worker_transport_history',rowId:operation.id,fence:String(historyFence)}
 ].map(p=>({...p,generationId:scope.generationId,writerXid,digest:digest(p.table),verified:true}))};
 const objects:any[]=[],receipts:any[]=[];
 for(const [table,rowId,fence,action] of [
  ['worker_transport_heads',`${scope.workspaceId}:${scope.hostId}`,headFence,'UPDATE'],
  ['worker_transport_history',`${operation.id}:${scope.hostId}`,historyFence,'INSERT']
 ] as const){
  const source={table,rowId,digest:digest(table),operation:action,authority:null};objects.push(source);
  receipts.push({id:randomUUID(),eventId:randomUUID(),...source,workspaceId:scope.workspaceId,writerXid,fence:String(fence),verified:true});delete receipts.at(-1).authority;
  for(const [index,decisionId] of decisions.entries()){
   const rowId=randomUUID(),epoch=String(fence+index+1),o={table:'decision_authority_events',rowId,digest:digest(rowId),operation:'INSERT',
    authority:{decisionId,sourceTable:table,sourceRow:source.rowId,sourceDigest:source.digest,fence:epoch}};objects.push(o);
   receipts.push({id:randomUUID(),eventId:randomUUID(),table:o.table,rowId,digest:o.digest,operation:o.operation,workspaceId:scope.workspaceId,writerXid,fence:epoch,verified:true});
  }
 }
 return {base,lineage:{decisions,objects,receipts},witness:{writerXid,fromFence:String(fromFence),toFence:String(through)}};
}
