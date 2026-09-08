import { z } from "zod";
import { handoffRoles } from "./task-handoff-contract";

export const clarificationOperations = ["clarification_send", "clarification_reply"] as const;
export const clarificationTypes = ["question", "answer", "evidence_request", "evidence_response", "constraint_notice", "status_update"] as const;
const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/), text = z.string().trim().min(3).max(2000);
export const clarificationParticipant = z.object({ taskId:id, role:z.enum(handoffRoles) }).strict();
export const clarificationBinding = z.object({ sender:clarificationParticipant, recipient:clarificationParticipant,
  threadId:id.nullable(), entryId:id.nullable(), action:z.enum(["send","reply","read"]) }).strict();
export const clarificationReference = z.object({kind:z.enum(["execution","result","handoff","review","test","evidence"]),taskId:id,id,revision:hash}).strict();
export const clarificationContent = z.object({
  type:z.enum(clarificationTypes), text,
  references:z.array(clarificationReference).max(8),
  expectedResponse:z.object({kind:z.enum(["answer","evidence_response","read"]),instruction:text,dueAt:z.string().datetime().nullable()}).strict().nullable(),
  material:z.object({category:z.enum(["assumption","constraint","evidence"]),reason:text}).strict().nullable()
}).strict().superRefine((v,ctx)=>{
  if(v.type==="evidence_response"&&!v.references.length)ctx.addIssue({code:"custom",path:["references"],message:"Verified reference required"});
  if(v.type==="constraint_notice"&&!v.material)ctx.addIssue({code:"custom",path:["material"],message:"Formal review signal required"});
});
const base={requestId:id,expectedVersion:hash,contextVersion:hash,grantId:id.optional()};
export const clarificationSend = z.object({...base,sender:clarificationParticipant,recipient:clarificationParticipant,content:clarificationContent}).strict();
export const clarificationReply = z.object({...base,threadId:id,entryId:id,entryVersion:z.number().int().positive(),
  supersedes:id.nullable(),content:clarificationContent}).strict();
export const clarificationRead = z.object({...base,threadId:id,entryId:id,entryVersion:z.number().int().positive()}).strict();

// Deterministic command-pattern rejection supplements the strict data contract.
// Prose never carries executable authority, including phrases outside this detector.
export function clarificationCommandText(value:unknown):boolean {
  const content=value as z.infer<typeof clarificationContent>;
  const input=[content?.text,content?.expectedResponse?.instruction,content?.material?.reason].filter(v=>typeof v==="string").join(" ").normalize("NFKC").replace(/[\u200B-\u200F\uFEFF]/g,"").replace(/\s+/g," ").toLowerCase();
  const verb="(?:set|change|update|assign|reassign|override|grant|revoke|approve|release|deploy|mark|switch|raise|lower|ustaw|zmien|zmień|przypisz|nadaj|cofnij|zatwierdz|zatwierdź|wdroz|wdróż|oznacz|podnieś|obniż)";
  const target="(?:assignment|assignee|scope|priority|status|ready|procedure|risk|mandate|capability|authority|role|release|zakres|priorytet|status|gotowo|procedur|ryzyk|mandat|uprawnie|rolę|role|przypisani|wydani)";
  return new RegExp(`(?:^|[\\s"'])${verb}\\s+[^.!?\\n]{0,90}${target}|${target}\\s*(?:=|:=|->|→|:)|(?:ignore|bypass|override|zignoruj|pomiń|obejdź)[^.!?\\n]{0,60}(?:contract|policy|approval|kontrakt|zgod|zasad)`,"u").test(input);
}
