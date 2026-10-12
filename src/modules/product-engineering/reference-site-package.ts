import { createHash } from "node:crypto";
import { z } from "zod";

const hex = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().datetime({ offset: true });
const relativeRef = z.string().min(1).max(300).regex(/^[A-Za-z0-9._/-]+$/).refine(value =>
  !value.startsWith("/") && !value.split("/").some(part => part === "" || part === "." || part === ".."));

const evidence = z.object({
  kind: z.enum(["source", "published_screenshot", "supervised_click"]),
  ref: relativeRef,
  sha256: hex,
  observedAt: timestamp,
  providerRef: z.string().regex(/^sediment:\/\/file_[a-z0-9]+$/).optional(),
  // A source inspection cannot be reported as proof of published behavior.
  scope: z.enum(["source_only", "published_render", "supervised_result"]),
  result: z.string().trim().min(3).max(1000).optional()
}).strict().superRefine((value, ctx) => {
  const expected = { source: "source_only", published_screenshot: "published_render",
    supervised_click: "supervised_result" }[value.kind];
  if (value.scope !== expected) ctx.addIssue({ code: "custom", message: "evidence_scope_mismatch" });
  if (value.kind === "supervised_click" && !value.result)
    ctx.addIssue({ code: "custom", message: "click_result_required" });
  if (value.kind !== "supervised_click" && value.result)
    ctx.addIssue({ code: "custom", message: "result_not_allowed" });
  if (value.kind === "published_screenshot" && !value.providerRef)
    ctx.addIssue({ code: "custom", message: "screenshot_provider_ref_required" });
  if (value.kind !== "published_screenshot" && value.providerRef)
    ctx.addIssue({ code: "custom", message: "provider_ref_not_allowed" });
});

const observation = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  category: z.enum(["content", "function", "journey", "failure"]),
  route: z.string().max(300).regex(/^\/(?:[A-Za-z0-9._~%-]+\/?)*$/).refine(value => !value.includes("..")),
  language: z.string().regex(/^[a-z]{2}$/),
  text: z.string().trim().min(3).max(3000),
  evidence: z.array(evidence).min(1).max(8)
}).strict();

export const referenceSitePackage = z.object({
  schemaVersion: z.literal("roost-reference-site-package-v1"),
  source: z.object({
    provider: z.literal("openai_sites"),
    projectId: z.string().regex(/^appgprj_[a-z0-9]+$/),
    versionId: z.string().regex(/^appgprj_[a-z0-9]+~appgver_[a-z0-9]+$/),
    versionNumber: z.number().int().positive(),
    commitSha: z.string().regex(/^[a-f0-9]{40}$/),
    archiveSha256: hex,
    deploymentId: z.string().regex(/^appgdep_[a-z0-9]+$/),
    publishedUrl: z.string().url().refine(value => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
    })
  }).strict(),
  preparedAt: timestamp,
  observations: z.array(observation).min(1).max(200),
  unknowns: z.array(z.string().trim().min(3).max(1000)).max(30)
}).strict().superRefine((value, ctx) => {
  if (!value.source.versionId.startsWith(`${value.source.projectId}~`))
    ctx.addIssue({ code: "custom", message: "version_project_mismatch" });
  const ids = value.observations.map(item => item.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "duplicate_observation_id" });
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 256 * 1024)
    ctx.addIssue({ code: "custom", message: "package_too_large" });
});

export type ReferenceSitePackage = z.infer<typeof referenceSitePackage>;

/** Digest the validated, ordered projection; callers must never trust a supplied digest. */
export function referenceSitePackageDigest(raw: unknown): string {
  const parsed = referenceSitePackage.parse(raw);
  return createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
}
