import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {createPrismaTicketLifecycleStore,TicketLifecycleUnknown} from './bootstrap-ticket-lifecycle-store';
import {lifecycleFlags,lifecycleEqual,lifecycleId,denyLifecycle} from './bootstrap-ticket-lifecycle-contract';
// Explicit synthetic protocol driver. No default exchange or runtime composition.
type Store=ReturnType<typeof createPrismaTicketLifecycleStore>;
type Projection=Extract<Awaited<ReturnType<Store['inspect']>>,{ok:true}>;
export function createTicketLifecycleProtocol(deps?:{qualification:'synthetic_ticket_lifecycle_protocol_v1';store:Store;
 peer:(p:Projection)=>Promise<unknown>;exchange:(p:Projection)=>Promise<unknown>}){
 const input=z.object({ticketId:lifecycleId}).strict();
 async function pair(ticketId:string,state:string,completed=false){
  const a=await deps!.store.inspect({ticketId}),b=await deps!.store.inspect({ticketId});
  if(!a.ok||!b.ok||!lifecycleEqual(a,b)||a.head.state!==state||!a.authorityCurrent||(!completed&&!a.usable)||a.head.revoked||a.head.expired||a.head.reconciled)denyLifecycle();return b as Projection;
 }
 async function mutate(p:Projection,action:'reserve'|'consume'|'dispatch'|'complete',evidence?:unknown){
  return deps!.store.transition({ticketId:p.identity.ticketId,operationId:randomUUID(),expectedRevision:p.head.revision,expectedFence:p.fence,action,...(evidence?{evidence}:{})});
 }
 return Object.freeze({async run(value:unknown){let possibleDelivery=false;
  try{if(deps?.qualification!=='synthetic_ticket_lifecycle_protocol_v1')denyLifecycle();const c=input.parse(value);
   await mutate(await pair(c.ticketId,'issued'),'reserve');await mutate(await pair(c.ticketId,'reserved'),'consume');
   const p=await pair(c.ticketId,'consumed'),peer=await deps!.peer(p);await mutate(p,'dispatch',{peer});possibleDelivery=true;
   const sending=await pair(c.ticketId,'dispatched'),completion=await deps!.exchange(sending);
   await mutate(await pair(c.ticketId,'dispatched'),'complete',{completion});await pair(c.ticketId,'completed',true);
   return {ok:true,qualification:'synthetic_only',...lifecycleFlags};
  }catch(e){return {ok:false,error:e instanceof TicketLifecycleUnknown?'reconciliation_required':possibleDelivery?'delivery_unknown':'denied',retryable:false,...lifecycleFlags};}
 }});
}
