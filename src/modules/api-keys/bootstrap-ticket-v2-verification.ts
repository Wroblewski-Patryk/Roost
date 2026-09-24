import type {Prisma} from '@prisma/client';
import type {z} from 'zod';
import {lifecycleRegistration,denyLifecycle} from './bootstrap-ticket-lifecycle-contract';
import {ticketContentDigest,ticketEnvelopeDigest,ticketV2Domains} from './bootstrap-ticket-v2-digests';
import {freezePublic} from './worker-transport-snapshot';
type Registration=z.infer<typeof lifecycleRegistration>;
export type TicketV2SignatureVerifier={qualification:'worker_bootstrap_ticket_verifier_v2';
 verify:(db:Prisma.TransactionClient,request:Readonly<{domain:typeof ticketV2Domains.content;contentDigest:string;envelopeDigest:string;
  signed:Registration['record']['signed'];identity:Registration['identity'];at:string}>)=>Promise<boolean>};
// No cryptographic implementation or fallback. The selected verifier must verify
// Ed25519 over UTF-8 `${domain}:${contentDigest}` with the exact current public
// issuer key selected in this same fenced transaction. This is not decision signing.
export async function verifyTicketV2(db:Prisma.TransactionClient,value:Registration,verifier:TicketV2SignatureVerifier|undefined,now:Date){
 if(verifier?.qualification!=='worker_bootstrap_ticket_verifier_v2'||typeof verifier.verify!=='function')denyLifecycle();
 const c=lifecycleRegistration.parse(value),signed=c.record.signed;
 if(await verifier!.verify(db,freezePublic({domain:ticketV2Domains.content,contentDigest:ticketContentDigest(signed.payload),envelopeDigest:ticketEnvelopeDigest(signed),signed,identity:c.identity,at:now.toISOString()}))!==true)denyLifecycle();
}
