import { createHash } from "node:crypto";
import { z } from "zod";

const id = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(3).max(2000);

export const referenceSiteChecklistScope = "roost-reference-site-checklist-v1";
export const referenceSiteChecklistItemVersion = "roost-reference-site-checklist-item-v1";

export function isReferenceSiteChecklist(scope: unknown, steps: ReadonlyArray<{ validationRule?: unknown }> | null | undefined) {
  return scope === referenceSiteChecklistScope || Boolean(steps?.some(step =>
    step.validationRule !== null && typeof step.validationRule === "object" &&
    !Array.isArray(step.validationRule) &&
    (step.validationRule as Record<string, unknown>).schemaVersion === referenceSiteChecklistItemVersion));
}

export const referenceSiteFindingReviewSchema = z.object({
  requestId: id,
  expectedFindingDigest: digest,
  verdict: z.enum(["confirmed", "rejected", "inconclusive"]),
  rationale: text,
  evidence: text
}).strict();

export const referenceSiteChecklistItemInput = z.object({
  findingId: id,
  itemId: z.string().regex(/^[a-z][a-z0-9-]{2,79}$/),
  instruction: text,
  applicability: text,
  acceptanceCriterion: text,
  expectedInput: text,
  expectedOutput: text,
  rollback: text
}).strict();

const itemList = z.object({
  items: z.array(referenceSiteChecklistItemInput).min(1).max(2)
}).strict();

function uniqueItems(value: z.infer<typeof itemList>, ctx: z.RefinementCtx) {
  if (new Set(value.items.map(item => item.itemId)).size !== value.items.length ||
      new Set(value.items.map(item => item.findingId)).size !== value.items.length)
    ctx.addIssue({ code: "custom", message: "checklist_duplicate_item_or_finding" });
}

export const referenceSiteChecklistPreviewSchema = itemList.superRefine(uniqueItems);

export const referenceSiteChecklistAcceptSchema = itemList.extend({
  requestId: id,
  expectedDigest: digest
}).strict().superRefine(uniqueItems);

export function referenceSiteChecklistDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
