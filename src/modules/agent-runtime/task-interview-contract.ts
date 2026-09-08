import { z } from "zod";
import { decisionAuthorityDeclaration } from "../decisions/decision-authority-contract";
const text=z.string().trim().min(3).max(2000), id=z.string().uuid(), version=z.string().regex(/^[a-f0-9]{64}$/);
export const interviewClasses=["product_direction","money","legal","critical_risk","mandate","task_scope","mandate_change","ordinary_domain"] as const;
export const interviewQuestion=z.object({field:z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),type:z.enum(["fact","choice","decision"]),question:text,requiresHuman:z.literal(true),options:z.array(z.string().trim().min(1).max(2000)).max(6)}).strict().refine(q=>q.type!=="choice"||q.options.length>=2,"A choice needs alternatives");
export const interviewBlock=z.object({topic:text,unknownKey:z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),missing:text,impact:text,material:z.literal(true),decisionClass:z.enum(interviewClasses),principalId:id,
 authority:decisionAuthorityDeclaration.optional(),
 context:text,recommendation:text,consequences:text,scope:text,deferralEffect:text,
 dependencies:z.array(z.object({taskId:id,blockedPart:text}).strict()).min(1).max(8),
 gathering:z.object({status:z.literal("completed"),checkedSources:z.array(z.object({id,revision:version,findings:text}).strict()).min(1).max(8),remainingHumanDecision:text}).strict(),
 questions:z.array(interviewQuestion).min(1).max(3)}).strict().refine(b=>new Set(b.questions.map(q=>q.field)).size===b.questions.length,"Duplicate decision field").refine(b=>new Set(b.questions.map(q=>q.question.toLocaleLowerCase().replace(/\s+/g," "))).size===b.questions.length,"Duplicate question").refine(b=>new Set(b.dependencies.map(d=>d.taskId)).size===b.dependencies.length,"Duplicate dependency");
export const interviewPublish=z.object({requestId:id,expectedVersion:version,block:interviewBlock,supersedesId:id.optional(),revisionReason:text.optional(),grantId:id.optional()}).strict();
export const interviewRespond=z.object({requestId:id,expectedVersion:version,caseId:id,action:z.enum(["answer","defer","accept"]),answers:z.array(z.object({field:z.string(),value:z.string().trim().min(1).max(2000)}).strict()).max(3).optional(),reason:text}).strict().refine(b=>b.action==="answer"?!!b.answers?.length:!b.answers,"Answers required only for answer");
