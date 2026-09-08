import { z } from "zod";
import { decisionAuthorityDeclaration } from "./decision-authority-contract";

const uuid=z.string().uuid(), text=z.string().trim().min(3).max(2000), hash=z.string().regex(/^[a-f0-9]{64}$/);
export const decisionNodeTypes=["task","application","project","procedure","company_record","resource","decision"] as const;
export const decisionNode=z.object({type:z.enum(decisionNodeTypes),id:uuid}).strict();
export const decisionProposal=z.object({requestId:uuid,expectedVersion:hash,title:text,context:text,decision:text,rationale:text,consequences:text,
  authority:decisionAuthorityDeclaration.optional(),
  scopeReason:text,scope:z.array(decisionNode).min(1).max(8),supersedesId:uuid.nullable(),
  conflicts:z.array(z.object({kind:z.enum(["contradicts","narrows","replaces"]),oldProvision:text,newProvision:text,explanation:text}).strict()).max(12)
}).strict().superRefine((v,c)=>{
  if(Boolean(v.supersedesId)!==Boolean(v.conflicts.length))c.addIssue({code:"custom",message:"A replacement requires exact conflicts"});
  if(new Set(v.scope.map(n=>n.type+":"+n.id)).size!==v.scope.length)c.addIssue({code:"custom",message:"Duplicate scope"});
  if(v.conflicts.some(x=>!v.decision.includes(x.newProvision)))c.addIssue({code:"custom",message:"New provision must be quoted exactly"});
});
export const decisionAction=z.object({requestId:uuid,expectedVersion:hash,action:z.enum(["review_impact","accept"]),previewId:uuid.optional(),grantIds:z.array(z.object({taskId:uuid,grantId:uuid}).strict()).min(1).max(200).optional()}).strict();
export const reopenCondition=z.discriminatedUnion("type",[
  z.object({type:z.literal("resource_available"),referenceId:uuid}).strict(),
  z.object({type:z.literal("configuration_changed"),referenceId:uuid}).strict(),
  z.object({type:z.literal("owner_signal")}).strict(),
  z.object({type:z.literal("deadline"),dueAt:z.string().datetime()}).strict()
]);
export const decisionDeferral=z.object({requestId:uuid,expectedVersion:hash,targetType:z.enum(["decision","interview"]),targetId:uuid,
  reason:z.enum(["budget","infrastructure"]),explanation:text,condition:reopenCondition}).strict();
export const reopeningEvent=z.object({requestId:uuid,expectedVersion:hash,deferralId:uuid,
  type:z.enum(["resource_available","configuration_changed","owner_signal","deadline"]),referenceRevision:hash.optional(),explanation:text}).strict();
