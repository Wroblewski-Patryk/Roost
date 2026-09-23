import { z } from "zod";
import { transportIdentity, transportProfile, transportStage } from "./worker-transport-contract";

const id=z.string().uuid(), digest=z.string().regex(/^[a-f0-9]{64}$/), epoch=z.number().int().positive().max(2147483647);
// The only JSON admitted to persistence. Unknown keys are rejected recursively;
// certificate/key material and raw signed decisions/tickets have no storage slot.
export const persistedTransportRecord=z.object({
  version:z.literal("worker-transport-record-v1"),identity:transportIdentity,
  revision:epoch,certificateEpoch:epoch,highWaterEpoch:epoch,
  profile:transportProfile,staged:transportStage.nullable(),state:z.enum(["current","revoked"]),
  ownerId:id,decisionId:id,decisionRevision:epoch,decisionIntentDigest:digest,
  approvedAt:z.string().datetime(),expiresAt:z.string().datetime(),requestId:id
}).strict().superRefine((r,c)=>{
  if(r.highWaterEpoch<r.certificateEpoch||r.staged&&(r.staged.epoch!==r.certificateEpoch+1||r.highWaterEpoch!==r.staged.epoch))
    c.addIssue({code:"custom",message:"Invalid persisted epoch"});
});
export const persistedSignedTransport=z.object({payload:persistedTransportRecord,signature:z.string().regex(/^[a-f0-9]{128}$/)}).strict();
