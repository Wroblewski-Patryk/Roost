import { z } from "zod";
import { bootstrapBinding,bootstrapCredential,bootstrapOwnerTicket,bootstrapOwnerDecision,bootstrapPeer,bootstrapCompletion } from "./worker-bootstrap-contract";
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),signature=z.string().regex(/^[a-f0-9]{128}$/),positive=z.number().int().positive().safe();
export const signedBootstrapTicket=z.object({payload:bootstrapOwnerTicket,signature}).strict();
export const signedBootstrapDecision=z.object({payload:bootstrapOwnerDecision,signature}).strict();
export const signedBootstrapPeer=z.object({payload:bootstrapPeer,signature}).strict();
export const signedBootstrapCompletion=z.object({payload:bootstrapCompletion,signature}).strict();
export const persistedBootstrapTicket=z.object({signed:signedBootstrapTicket,decision:signedBootstrapDecision}).strict();
export const persistedBootstrapAttempt=z.object({id,ticketId:id,ticketDigest:hash,decisionId:id,requestId:id,binding:bootstrapBinding,target:bootstrapCredential,
  state:z.literal("consumed"),expiresAt:z.string().datetime()}).strict();
export const bootstrapAttemptState=z.enum(["consumed","dispatched","acknowledged","blocked","delivery_unknown"]);
export const persistedBootstrapHistory=z.object({id,attemptId:id,revision:positive,previousDigest:hash.nullable(),previousState:bootstrapAttemptState.nullable(),
  state:bootstrapAttemptState,createdAt:z.string().datetime(),peer:signedBootstrapPeer.nullable(),completion:signedBootstrapCompletion.nullable()}).strict();
export const boundedBootstrapRecord=(value:unknown)=>{if(Buffer.byteLength(JSON.stringify(value),"utf8")>24576)throw Error("bootstrap_record_invalid");return value;};
