import type { CapabilityApplicability, CapabilityState, EvidenceVerificationStatus } from "@prisma/client";

export type ReadinessCapabilityInput = {
  id: string;
  applicability: CapabilityApplicability;
  observedState: CapabilityState;
  dimensionKey: string;
  dimensionName: string;
  dimensionWeight: number;
  dimensions: Array<{
    applicability: CapabilityApplicability;
    observedState: CapabilityState;
  }>;
  evidence: Array<{ verificationStatus: EvidenceVerificationStatus }>;
  blockedBy: Array<{ id: string; observedState: CapabilityState; required: boolean }>;
};

const stateScore: Record<CapabilityState, number> = {
  unknown: 0,
  not_started: 0,
  missing: 0,
  partial: 0.5,
  complete: 0.9,
  verified: 1
};

const applicabilityWeight: Record<CapabilityApplicability, number> = {
  required: 1,
  recommended: 0.6,
  optional: 0.25,
  not_applicable: 0
};

function weightedAverage(rows: Array<{ value: number; weight: number }>) {
  const applicable = rows.filter((row) => row.weight > 0);
  const denominator = applicable.reduce((sum, row) => sum + row.weight, 0);
  if (!denominator) return 1;
  return applicable.reduce((sum, row) => sum + row.value * row.weight, 0) / denominator;
}

function percent(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

export function calculateApplicationReadiness(capabilities: ReadinessCapabilityInput[]) {
  const applicable = capabilities.filter((capability) => capability.applicability !== "not_applicable");
  const groups = new Map<string, ReadinessCapabilityInput[]>();

  for (const capability of applicable) {
    const group = groups.get(capability.dimensionKey) ?? [];
    group.push(capability);
    groups.set(capability.dimensionKey, group);
  }

  const dimensions = Array.from(groups.entries()).map(([key, rows]) => {
    const capabilityScore = weightedAverage(rows.map((row) => ({
      value: stateScore[row.observedState],
      weight: applicabilityWeight[row.applicability]
    })));
    const dimensionRows = rows.flatMap((row) => row.dimensions.map((dimension) => ({
      value: stateScore[dimension.observedState],
      weight: applicabilityWeight[dimension.applicability]
    })));
    const dimensionScore = dimensionRows.length ? weightedAverage(dimensionRows) : capabilityScore;
    const evidenceScore = weightedAverage(rows.map((row) => ({
      value: row.evidence.some((item) => item.verificationStatus === "verified") ? 1 : 0,
      weight: applicabilityWeight[row.applicability]
    })));
    const score = capabilityScore * 0.6 + dimensionScore * 0.25 + evidenceScore * 0.15;

    return {
      key,
      name: rows[0]?.dimensionName ?? key,
      weight: rows[0]?.dimensionWeight ?? 100,
      score: percent(score),
      components: {
        capabilityState: percent(capabilityScore),
        definitionOfDoneDimensions: percent(dimensionScore),
        verifiedEvidenceCoverage: percent(evidenceScore)
      },
      applicableCapabilities: rows.length,
      requiredCapabilities: rows.filter((row) => row.applicability === "required").length,
      completeRequiredCapabilities: rows.filter((row) => (
        row.applicability === "required"
        && (row.observedState === "complete" || row.observedState === "verified")
      )).length
    };
  }).sort((left, right) => left.key.localeCompare(right.key));

  const overall = weightedAverage(dimensions.map((dimension) => ({
    value: dimension.score / 100,
    weight: dimension.weight
  })));

  const blockers = applicable.flatMap((capability) => capability.blockedBy
    .filter((dependency) => dependency.required && !["complete", "verified"].includes(dependency.observedState))
    .map((dependency) => ({
      capabilityId: capability.id,
      blockedByCapabilityId: dependency.id,
      reason: "required_dependency_incomplete" as const
    })));

  return {
    algorithm: {
      version: "product-readiness-v1",
      formula: "60% observed capability state + 25% definition-of-done dimensions + 15% verified evidence coverage",
      applicabilityWeights: applicabilityWeight,
      stateScores: stateScore,
      notApplicableExcluded: true
    },
    overall: percent(overall),
    dimensions,
    blockers
  };
}
