import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { isPrimaryReadOnlyReview } from "./agent-host-code-reviewer-prior-audit.mjs";

const version = "roost-provider-composed-instructions-v1";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const metadata = z.object({ schemaVersion: z.literal(version), originalDigest: hash }).strict();
const pointer = z.object({ sharedInstruction: z.tuple([z.number().int().min(0).max(1), z.number().int().min(0).max(99)]) }).strict();
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const digest = v => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
const fail = () => { throw Object.assign(Error("agent_provider_composed_instructions_invalid"), { retryable: false, contextAdmission: true }); };
export const providerComposedInstructionRule = "composition sharedInstruction[p,s]=procedures.value[p].steps[s].instruction (zero-based); all other fields/digests unchanged.";
const value = input => input.evidence?.composition?.value;
function primary(input) { return input.contract?.nativeBoundary?.profile === "inspect-readonly"
  && isPrimaryReadOnlyReview(input.contract.nativeBoundary.inspectReadOnly); }
function candidate(input, step, text) {
  const c = value(input), refs = input.contract?.procedures?.items, procedures = input.evidence?.procedures?.value;
  if (!primary(input) || !Array.isArray(refs) || refs.length !== 2 || !Array.isArray(procedures) || procedures.length !== 2
    || input.evidence.composition.provenance !== "executionPacket.procedureComposition" || input.evidence.composition.trust !== "untrusted_evidence"
    || input.evidence.procedures.provenance !== "taskContext.procedures.contract_refs" || input.evidence.procedures.trust !== "untrusted_evidence"
    || c?.algorithm !== "roost-procedure-composition-v1" || c.status !== "composed" || !hash.safeParse(c.seal).success
    || !hash.safeParse(c.baseSource).success || !hash.safeParse(c.extensionSource).success || c.steps?.length !== 2
    || !step || !["base", "extension"].includes(step.source) || typeof text !== "string" || !text.length) return;
  const p = step.source === "base" ? 0 : 1, proc = procedures[p], ref = refs[p];
  if (!proc || ref?.id !== proc.id || refs[0].id === refs[1].id || procedures.filter(r => r?.id === proc.id).length !== 1
    || String(proc.version) !== ref.revision || c.versions?.[step.source] !== proc.version
    || step.versionId !== c.refs?.[step.source] || !z.string().uuid().safeParse(step.versionId).success
    || !Array.isArray(proc.steps) || proc.steps.length > 100) return;
  const matches = proc.steps.map((row, index) => ({ row, index })).filter(({ row }) => row?.procedureId === proc.id
    && Number.isSafeInteger(row.stepOrder) && row.stepOrder > 0 && row.instruction === text);
  return matches.length === 1 ? [p, matches[0].index] : undefined;
}
export function projectProviderComposedInstructions(input) {
  const c = value(input);
  if (c?.instructionSharing !== undefined) { assertProviderComposedInstructions(input); return input; }
  if (!primary(input) || !Array.isArray(c?.steps)) return input;
  const indices = c.steps.map(step => candidate(input, step, step.instruction));
  if (indices.some(row => !row)) return input;
  const projected = structuredClone(input), target = value(projected);
  target.steps.forEach((step, n) => { step.instruction = { sharedInstruction: indices[n] }; });
  target.instructionSharing = { schemaVersion: version, originalDigest: digest(c) };
  projected.rules.push(providerComposedInstructionRule);
  if (Object.hasOwn(input, "seal")) { const { seal: _, ...body } = projected; projected.seal = digest(body); }
  if (Buffer.byteLength(JSON.stringify(projected)) >= Buffer.byteLength(JSON.stringify(input))) return input;
  assertProviderComposedInstructions(projected, input); return projected;
}
export function restoreProviderComposedInstructions(input) {
  const c = value(input);
  if (c?.instructionSharing === undefined) {
    if (c?.steps?.some(step => step.instruction && typeof step.instruction === "object" && Object.hasOwn(step.instruction, "sharedInstruction"))) fail();
    return input;
  }
  const meta = metadata.safeParse(c.instructionSharing);
  if (!meta.success || !primary(input) || !Array.isArray(c.steps) || c.steps.length !== 2
    || input.rules?.filter(r => r === providerComposedInstructionRule).length !== 1) fail();
  const restored = structuredClone(input), original = value(restored); delete original.instructionSharing;
  for (let n = 0; n < c.steps.length; n++) {
    const parsed = pointer.safeParse(c.steps[n].instruction); if (!parsed.success) fail();
    const [p, s] = parsed.data.sharedInstruction, text = input.evidence.procedures.value[p]?.steps?.[s]?.instruction;
    const joined = candidate(restored, original.steps[n], text);
    if (!joined || joined[0] !== p || joined[1] !== s) fail(); original.steps[n].instruction = text;
  }
  if (digest(original) !== meta.data.originalDigest) fail();
  restored.rules = restored.rules.filter(r => r !== providerComposedInstructionRule);
  if (Object.hasOwn(input, "seal")) { const { seal: _, ...body } = restored; restored.seal = digest(body); }
  return restored;
}
export function assertProviderComposedInstructions(input, expectedOriginal) {
  const restored = restoreProviderComposedInstructions(input);
  if (expectedOriginal !== undefined && !isDeepStrictEqual(restored, expectedOriginal)) fail();
  return true;
}
