import { z } from "zod";
import { transportProfile,transportObservation } from "./worker-transport-contract";

const id=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),count=z.number().int().nonnegative().safe();
export const bootstrapBinding=z.object({workspaceId:id,installationId:id,installationEpoch:epoch,hostId:id,hostEpoch:epoch,hostFingerprint:digest,
  ticketKeyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),ticketKeyEpoch:epoch,ticketPublicKeyDigest:digest}).strict();
export const bootstrapCredential=z.object({id,version:epoch,epoch,fingerprint:digest}).strict();
export const bootstrapChannel=z.object({revision:epoch,certificateEpoch:epoch,highWaterEpoch:epoch,profile:transportProfile,validUntil:z.string().datetime()}).strict()
  .refine(v=>v.highWaterEpoch>=v.certificateEpoch);
export const bootstrapPrior=z.object({attemptId:id,state:z.enum(["delivery_unknown","blocked","expired","revoked_credential"]),credential:bootstrapCredential.nullable()}).strict();
export const workerBootstrapIntent=z.object({schemaVersion:z.literal("worker-bootstrap-admission-v1"),purpose:z.enum(["first_enrollment","owner_recovery"]),
  binding:bootstrapBinding,requestId:id,deviceProofDigest:digest,channel:bootstrapChannel,
  baseline:z.object({enrollmentGeneration:count,credentialHighWater:count,credential:bootstrapCredential.nullable()}).strict(),
  target:bootstrapCredential,prior:bootstrapPrior.nullable(),expiresAt:z.string().datetime()
}).strict().superRefine((i,c)=>{
  if(i.target.version!==1||i.target.epoch!==i.baseline.credentialHighWater+1||i.target.id===i.baseline.credential?.id||i.target.fingerprint===i.baseline.credential?.fingerprint||
    (i.purpose==="first_enrollment"?(i.prior!==null||i.baseline.credential!==null||i.baseline.enrollmentGeneration!==0||i.baseline.credentialHighWater!==0):
      (!i.prior||i.baseline.enrollmentGeneration<1||JSON.stringify(i.prior.credential)!==JSON.stringify(i.baseline.credential))))c.addIssue({code:"custom",message:"Exact first enrollment or terminal recovery required"});
});
export const bootstrapOwnerTicket=z.object({version:z.literal("worker-bootstrap-owner-ticket-v1"),id,ownerId:id,ownerAuthAt:z.string().datetime(),
  issuedAt:z.string().datetime(),decisionId:id,decisionRevision:epoch,decisionIntentDigest:digest,intent:workerBootstrapIntent}).strict();
export const bootstrapOwnerDecision=z.object({id,revision:epoch,ownerId:id,authority:z.literal("owner_reserved"),state:z.enum(["accepted","revoked"]),
  intentDigest:digest,acceptedAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict();
export const bootstrapPeer=transportObservation.omit({identity:true}).extend({binding:bootstrapBinding,attemptId:id,ticketDigest:digest,certificateEpoch:epoch}).strict();
export const bootstrapCompletion=z.object({version:z.literal("worker-bootstrap-completion-v1"),attemptId:id,ticketDigest:digest,requestId:id,
  state:z.literal("acknowledged"),credential:bootstrapCredential,peer:bootstrapPeer,responseDigest:digest,committedAt:z.string().datetime()}).strict();
export const bootstrapInput=z.object({ticketId:id,deviceProof:z.instanceof(Buffer).refine(b=>b.length>=32&&b.length<=128)}).strict();
export type BootstrapBinding=z.infer<typeof bootstrapBinding>;
export type BootstrapIntent=z.infer<typeof workerBootstrapIntent>;
export type BootstrapTicket=z.infer<typeof bootstrapOwnerTicket>;
export type BootstrapDecision=z.infer<typeof bootstrapOwnerDecision>;
export type BootstrapPeer=z.infer<typeof bootstrapPeer>;
export type BootstrapCompletion=z.infer<typeof bootstrapCompletion>;
export type BootstrapCredential=z.infer<typeof bootstrapCredential>;
