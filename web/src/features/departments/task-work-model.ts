export type ScopedReview = {
  task: { id: string; title: string };
  canReview: boolean;
  reason?: string | null;
  expectedVersion: string;
  materialVersion: string | null;
  informationTask: boolean;
  approvalCommit?: string | null;
  approvalInformationSeal?: string | null;
  decision?: null | { id: string; decision: "approve" | "reject"; evidence?: { summary?: string }; createdAt?: string };
  result: null | {
    executionId: string;
    summary?: string;
    finalResponse?: string;
    attempt?: number;
    completedAt?: string;
    verification?: unknown;
    resultRevision?: { commit?: string; branch?: string };
  };
};

export type ScopedReviewDraft = {
  decision: "approve" | "reject";
  summary: string;
  reference: string;
  testResult: string;
  reproduction: string;
  expected: string;
  observed: string;
  scope: string;
  excluded: string;
  outcome: string;
  competencies: string;
};

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

export function scopedReviewCommand(review: ScopedReview, draft: ScopedReviewDraft, requestId: string) {
  if (!review.canReview || !review.result || !review.materialVersion || !review.expectedVersion) throw new Error("review_unavailable");
  const base = {
    requestId,
    expectedVersion: review.expectedVersion,
    executionId: review.result.executionId,
    materialVersion: review.materialVersion,
    decision: draft.decision,
    summary: draft.summary.trim(),
    evidence: [{ kind: "test", reference: draft.reference.trim(), result: draft.testResult.trim(), ...(draft.decision === "approve" ? { verdict: "pass" } : {}) }]
  };
  if (draft.decision === "approve") {
    const seal = review.informationTask ? review.approvalInformationSeal : review.approvalCommit;
    if (!seal) throw new Error("approval_proof_missing");
    return { ...base, ...(review.informationTask ? { reviewedInformationSeal: seal } : { reviewedCommit: seal }) };
  }
  return { ...base, reproduction: lines(draft.reproduction), expected: draft.expected.trim(), observed: draft.observed.trim(),
    correction: { scope: lines(draft.scope), excluded: lines(draft.excluded), outcome: draft.outcome.trim(), competencies: lines(draft.competencies) } };
}
