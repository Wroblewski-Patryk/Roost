import {reviewDigest} from '../agent-runtime/task-review-contract';
import {bootstrapChannelSnapshot} from './bootstrap-channel-contract';

// Directed dependencies: snapshot -> ticket content -> signed envelope -> grant.
// The snapshot contains neither ticketDigest nor a grant/history/receipt digest.
export const ticketV2Domains=Object.freeze({channel:'worker-bootstrap-channel-plan-v2',content:'worker-bootstrap-ticket-content-v2',envelope:'worker-bootstrap-ticket-envelope-v2'} as const);
export const ticketChannelPlanDigest=(snapshot:unknown)=>reviewDigest({domain:ticketV2Domains.channel,snapshot:bootstrapChannelSnapshot.parse(snapshot)});
export const ticketContentDigest=(payload:unknown)=>reviewDigest({domain:ticketV2Domains.content,payload});
export const ticketEnvelopeDigest=(signed:unknown)=>reviewDigest({domain:ticketV2Domains.envelope,signed});
