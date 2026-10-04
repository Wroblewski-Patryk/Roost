import { z } from "zod";

const uuid = z.string().uuid().transform((value) => value.toLowerCase());
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(2000);

// Readiness requires its own evidence and owner acceptance. A takeover baseline
// records scoped audit results and conveys no execution, write or release grant.
export const applicationBaselineStage = z.enum([
  "problem_definition",
  "accepted_requirements",
  "solution_design",
  "implementation",
  "verification",
  "operation_improvement"
]);

export const applicationBaselineAssumption = z.object({
  recordId: uuid,
  revision: digest,
  decisionStatus: z.enum(["proposed", "accepted", "deferred", "rejected", "superseded"]),
  implementationState: z.enum([
    "not_implemented",
    "implemented_correctly",
    "implemented_incorrectly",
    "unverified"
  ])
}).strict();

const canonicalRepository = z.string().max(500).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.username === "" && url.password === ""
      && !value.includes("?") && !value.includes("#")
      && !/\s/.test(value) && url.pathname !== "/";
  } catch {
    return false;
  }
}, "Repository must be an HTTPS repository URL without credentials, query or fragment");

export const applicationBaseline = z.object({
  schemaVersion: z.literal("roost-application-takeover-v1"),
  applicationId: uuid,
  auditTaskId: uuid,
  canonicalRepository,
  baselineCommit: z.string().regex(/^[a-f0-9]{40}$/),
  auditorExecutionId: uuid,
  verifierExecutionId: uuid,
  auditorEvidenceDigest: digest,
  verifierEvidenceDigest: digest,
  stage: applicationBaselineStage,
  scopeDescription: text,
  intendedUser: text,
  primaryProblem: text,
  coreOutcome: text,
  assumptions: z.array(applicationBaselineAssumption).max(30),
  limitations: z.array(text).max(20),
  productReady: z.literal(false),
  saleReady: z.literal(false)
}).strict().superRefine((value, context) => {
  if (value.auditorExecutionId === value.verifierExecutionId) {
    context.addIssue({ code: "custom", path: ["verifierExecutionId"], message: "Independent auditor and verifier executions are required" });
  }
  const recordIds = new Set<string>();
  value.assumptions.forEach((assumption, index) => {
    if (recordIds.has(assumption.recordId)) {
      context.addIssue({ code: "custom", path: ["assumptions", index, "recordId"], message: "Duplicate assumption record" });
    }
    recordIds.add(assumption.recordId);
  });
});

export type ApplicationBaseline = z.infer<typeof applicationBaseline>;
export type ApplicationBaselineAssumption = z.infer<typeof applicationBaselineAssumption>;
export type ApplicationBaselineStage = z.infer<typeof applicationBaselineStage>;
