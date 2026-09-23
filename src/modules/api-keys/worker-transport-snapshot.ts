import { z } from "zod";
import { transportIdentity,transportCertificate,transportObservation,productionTransportOrigin } from "./worker-transport-contract";
import { handoffHttpsPaths } from "./worker-handoff-contract";
import type { TransportRecord } from "./worker-transport.service";

const digest=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive(),id=z.string().uuid();
export const admissionSnapshot=z.object({qualification:z.literal("persisted_transport_inspection_v1"),identity:transportIdentity,
  revision:epoch,recordDigest:digest,state:z.literal("current"),certificateEpoch:epoch,highWaterEpoch:epoch,
  origin:productionTransportOrigin,serverName:z.string().max(253),caDigest:digest,
  resolverPolicy:z.literal("public_ipv4_only_v1"),proxy:z.literal(false),redirect:z.literal(false),downgrade:z.literal(false),sessionReuse:z.literal(false),
  decisionId:id,decisionRevision:epoch,decisionIntentDigest:digest,expiresAt:z.string().datetime(),
  allowedCertificates:z.array(z.object({epoch,certificate:transportCertificate,evidenceDigest:digest}).strict()).min(1).max(2)
}).strict();
export type AdmissionSnapshot=z.infer<typeof admissionSnapshot>;
export const handoffOperation=z.object({operationId:id,requestId:id,action:z.enum(["request","poll","ack","status"]),method:z.literal("POST"),
  path:z.enum([handoffHttpsPaths.request,handoffHttpsPaths.poll,handoffHttpsPaths.ack,handoffHttpsPaths.status]),snapshotDigest:digest}).strict()
  .refine(v=>v.path===handoffHttpsPaths[v.action]);
export type HandoffOperation=z.infer<typeof handoffOperation>;
export const handoffPeerObservation=transportObservation.extend({operation:handoffOperation,phase:z.enum(["before_send","complete"]),
  certificateEpoch:epoch,outcome:z.enum(["before_send","response","uncertain"]),responseDigest:digest.nullable(),commitUncertain:z.boolean()}).strict()
  .refine(v=>v.phase==="before_send"?v.outcome==="before_send"&&v.responseDigest===null&&!v.commitUncertain:
    v.outcome!=="before_send"&&(v.outcome==="uncertain"?v.commitUncertain:v.responseDigest!==null));
export type HandoffPeerObservation=z.infer<typeof handoffPeerObservation>;
export function freezePublic<T>(value:T):T{
  if(value&&typeof value==="object"){for(const child of Object.values(value))freezePublic(child);Object.freeze(value);}return value;
}
// Same rotation policy as inspect: time boundaries can change allowed pins
// without changing a head revision, so completion MUST derive this again.
export function snapshotFromRecord(r:TransportRecord,recordDigest:string,now:number):AdmissionSnapshot{
  const s=r.staged;if(r.state!=="current"||Date.parse(r.expiresAt)<=now||Date.parse(r.approvedAt)>now||s&&Date.parse(s.expiresAt)<=now)throw Error("admission_inactive");
  const allowed=[];
  if(!s||now<Date.parse(s.cutoverAt))allowed.push({epoch:r.certificateEpoch,certificate:r.profile.certificate,evidenceDigest:r.profile.bootstrap.evidenceDigest});
  if(s&&now>=Date.parse(s.overlapStartsAt))allowed.push({epoch:s.epoch,certificate:s.certificate,evidenceDigest:s.bootstrap.evidenceDigest});
  const p=r.profile;
  return freezePublic(admissionSnapshot.parse({qualification:"persisted_transport_inspection_v1",identity:r.identity,revision:r.revision,recordDigest,state:r.state,
    certificateEpoch:r.certificateEpoch,highWaterEpoch:r.highWaterEpoch,origin:p.origin,serverName:p.serverName,caDigest:p.trust.caDigest,resolverPolicy:p.resolver.policy,
    proxy:false,redirect:false,downgrade:false,sessionReuse:false,decisionId:r.decisionId,decisionRevision:r.decisionRevision,decisionIntentDigest:r.decisionIntentDigest,
    expiresAt:r.expiresAt,allowedCertificates:allowed}));
}
