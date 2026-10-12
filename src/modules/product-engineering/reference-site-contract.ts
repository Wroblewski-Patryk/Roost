import { z } from "zod";
import { referenceSitePackage, referenceSitePackageDigest } from "./reference-site-package";

const id = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const field = z.string().trim().min(3).max(2000);
const referenceUrl = z.string().url().max(1000).refine(value => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash; }
  catch { return false; }
});
export const referenceSiteMetadata = z.object({
  referenceUrl,
  providerVersion: z.string().trim().min(1).max(160),
  sourceKind: z.literal("openai_sites"),
  sourceId: z.string().trim().min(1).max(200),
  package: referenceSitePackage
}).strict().superRefine((value, ctx) => {
  if (value.sourceId !== value.package.source.projectId ||
      value.providerVersion !== `v${value.package.source.versionNumber}`)
    ctx.addIssue({ code: "custom", message: "reference_site_package_identity_mismatch" });
});

export function referenceSiteMetadataDigest(raw: unknown): string | null {
  const metadata = referenceSiteMetadata.safeParse(raw);
  return metadata.success ? referenceSitePackageDigest(metadata.data.package) : null;
}

export const referenceSiteFindingInput = z.object({
  requestId: id, packageDigest: digest, observationId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  siteRevision: z.string().datetime(), sourceReviewId: id,
  title: field.max(240), category: z.enum(["content", "function", "journey", "failure"]),
  language: z.enum(["pl", "en"]), observed: field, sourceExcerpt: z.string().trim().min(3).max(400),
  interpretation: field, uncertainty: field, applicability: field
}).strict();

export type ReferenceSiteFindingInput = z.infer<typeof referenceSiteFindingInput>;
export function configuredReferenceSiteUrl(candidate: string): boolean {
  try {
    const configured = JSON.parse(process.env.ROOST_REFERENCE_SITE_URLS ?? "[]");
    return Array.isArray(configured) && configured.length === 2 &&
      configured.every(value => typeof value === "string" && referenceUrl.safeParse(value).success) &&
      new Set(configured).size === 2 && configured.includes(candidate);
  } catch { return false; }
}
