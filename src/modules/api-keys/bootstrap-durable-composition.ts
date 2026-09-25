import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {dispatchScope,dispatchDigest,type DispatchCommand,type DispatchRecord} from './bootstrap-dispatch-contract';
import {isDurableDispatchAdapter,type DurableDispatchAdapter} from './bootstrap-dispatch-prisma';

const input=dispatchScope.extend({ownerId:z.string().uuid(),ownerEpoch:z.number().int().positive(),
 claimGeneration:z.number().int().positive(),expectedRevision:z.number().int().positive(),expectedDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export type DurableCompositionDependencies={qualification:'synthetic_durable_composition_v1';dispatch:DurableDispatchAdapter;
 exchange:(claim:Readonly<DispatchRecord>)=>Promise<unknown>;
 complete:(reply:unknown,claim:Readonly<DispatchRecord>)=>Promise<void>};

// Deliberately no default transport or client. The caller explicitly prepares /
// claims (or resumes a proven pre-send claim) before invoking this test-only seam.
// There is no Set/latch: all exclusion is the attempt child's committed CAS.
export function createDurableAttestedBootstrapComposition(deps?:DurableCompositionDependencies){
 const valid=()=>deps?.qualification==='synthetic_durable_composition_v1'&&isDurableDispatchAdapter(deps.dispatch)&&
  typeof deps.exchange==='function'&&typeof deps.complete==='function';
 return Object.freeze({
  async inspect(value:unknown){
   if(!valid())return {ok:false as const,error:'denied',...lifecycleFlags};return deps!.dispatch.inspect(value);
  },
  async runClaimed(value:unknown){let started=false,last:DispatchRecord|undefined;
   try{
    if(!valid())throw Error('unavailable');const c=input.parse(value);
    const {ownerId,ownerEpoch,claimGeneration,expectedRevision,expectedDigest,...scope}=c;
    async function command(action:DispatchCommand['action'],extras:Partial<DispatchCommand>={}){
     const result=await deps!.dispatch.execute({...scope,operationId:randomUUID(),action,ownerId,ownerEpoch,claimGeneration,
      expectedRevision:last?.revision??expectedRevision,expectedDigest:last?dispatchDigest(last):expectedDigest,
      leaseMs:null,responseDigest:null,completionOperationId:null,evidenceDigest:null,...extras});
     if(!result.ok)throw Error(result.error);last=result.entry.record;return result;
    }
    const send=await command('start_send');if(!send.sendAuthorized||send.idempotent)throw Error('no_send_permit');started=true;
    const reply=await deps!.exchange(send.entry.record),responseDigest=reviewDigest(reply);
    await command('outcome',{responseDigest});const completionOperationId=randomUUID();
    const completing=await command('start_complete',{operationId:completionOperationId,completionOperationId,responseDigest});
    if(!completing.completionAuthorized||completing.idempotent)throw Error('no_completion_permit');
    await deps!.complete(reply,completing.entry.record);
    const completed=await command('complete',{completionOperationId,responseDigest});
    return freezePublic({ok:true as const,state:'completed' as const,entry:completed.entry,
     canonicalCompletionRecorded:false as const,credentialActivated:false as const,
     completionBlocker:'signed_bootstrap_completion_required' as const,...lifecycleFlags});
   }catch{
    // No automatic resend, completion retry, or compensating write after an
    // uncertain COMMIT. Inspection exposes the durable start marker; an explicit
    // fresh-authority reconciliation command must record its disposition.
    return {ok:false as const,error:'reconciliation_required',reconciliationRequired:true,possibleDelivery:started,
     retryable:false as const,...lifecycleFlags};
   }
  }
 });
}
