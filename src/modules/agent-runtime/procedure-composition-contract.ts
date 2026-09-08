import { z } from "zod";
import { admissionOperations } from "./task-risk-admission-contract";

export const compositionAlgorithm = "roost-procedure-composition-v1";
export const compositionRoles = ["requester", "accountableManager", "executor", "verifier", "releaser"] as const;
const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(3).max(2000);
const key = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const list = z.array(text).max(30);
export const procedureContractSchema = z.object({
  kind: z.enum(["base", "extension"]), taskType: z.enum(["code_change", "maintenance", "migration", "review"]),
  operation: z.enum(admissionOperations), applicationId: id.nullable(), componentId: id.nullable(), baseProcedureId: id.nullable(),
  inputs: list, outputs: list, evidence: list, completion: list,
  roles: z.array(z.enum(compositionRoles)).max(5), tools: z.array(key).max(30),
  steps: z.array(z.object({ key, instruction: text, role: z.enum(compositionRoles), tools: z.array(key).max(30),
    inputs: list, outputs: list, evidence: list, requires: z.array(key).max(50) }).strict()).max(50)
}).strict().superRefine((v, ctx) => {
  const issue = (message:string) => ctx.addIssue({code:"custom",message});
  if(v.kind === "base" && (v.applicationId || v.componentId || v.baseProcedureId || !v.steps.length ||
    [v.inputs,v.outputs,v.evidence,v.completion].some(x=>!x.length) || compositionRoles.some(r=>!v.roles.includes(r)))) issue("base_contract_incomplete");
  if(v.kind === "extension" && (!v.applicationId || !v.componentId || !v.baseProcedureId)) issue("extension_binding_required");
  for(const a of [v.roles,v.tools,...[v.inputs,v.outputs,v.evidence,v.completion]]) if(new Set(a).size !== a.length) issue("duplicate_requirement");
  const seen = new Set<string>();
  for(const step of v.steps) {
    if(seen.has(step.key) || step.requires.includes(step.key) || new Set(step.requires).size!==step.requires.length) issue("step_cycle_or_duplicate");
    if(v.kind === "base" && step.requires.some(k=>!seen.has(k))) issue("dependency_must_precede_step");
    if(!v.roles.includes(step.role) || step.tools.some(t=>!v.tools.includes(t))) issue("step_authority_outside_contract");
    seen.add(step.key);
  }
  if(JSON.stringify(v).length>60000) issue("contract_too_large");
});
const command = {requestId:id,expectedVersion:hash};
export const publishContractSchema = z.object({...command, contract:procedureContractSchema, rationale:text}).strict();
export const withdrawContractSchema = z.object({...command, versionId:id, rationale:text}).strict();
export const compositionSelectionSchema = z.object({...command, operation:z.enum(admissionOperations), baseProcedureId:id.nullable(), extensionProcedureId:id.nullable(), rationale:text}).strict();
export const compositionExceptionSchema = z.object({...command, operation:z.enum(admissionOperations), missing:z.enum(["base","extension"]),
  decision:z.literal("approve_exact_missing_element"), rationale:text}).strict();
