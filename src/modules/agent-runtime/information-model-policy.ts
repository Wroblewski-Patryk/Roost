// G23: a proposal is advice before Ready, never provider admission. The exact
// owner-approved selection remains in the Ready contract and Worker receipt.
import type { AgentHost, Prisma } from "@prisma/client";
import { schedulerResources } from "./execution-scheduler";

export const informationModelPolicyVersion = "roost-model-policy-proposal-v1" as const;

type LocalQualification = {
  evidenceDigest: string;
  modelDigest: string;
  model: "gpt-oss:20b";
  cases: readonly ["plain_status", "unsupported_readiness_claim"];
  independentlyAccepted: true;
  resourceEligible: true;
};

// G23's independent comparison rejected the local candidate on a hard
// criterion. There is no installed accepted qualification for this class.
// A future acceptance needs a separately governed durable binding; arbitrary
// deployment configuration must not assert that evidence exists.
const acceptedLocalQualification: LocalQualification | null = null;

export type InformationModelProposal = {
  schemaVersion: typeof informationModelPolicyVersion;
  backend: "codex_responses" | "ollama_loopback";
  model: "gpt-5.6-sol" | "gpt-oss:20b";
  reasoningEffort: "low";
  modelDigest: string | null;
  reasonCode: "risk_low_required" | "local_qualification_missing" | "local_resources_unavailable" | "local_quality_qualified";
  reason: string;
  localQualification: string | null;
  eligible: boolean;
};

export function informationModelProposal(lowRisk: boolean, qualification: LocalQualification | null = acceptedLocalQualification, localResources = false): InformationModelProposal {
  const qualified = !!qualification && qualification.independentlyAccepted === true
    && qualification.resourceEligible === true && qualification.model === "gpt-oss:20b"
    && qualification.cases[0] === "plain_status" && qualification.cases[1] === "unsupported_readiness_claim"
    && /^[a-f0-9]{64}$/.test(qualification.evidenceDigest)
    && /^sha256:[a-f0-9]{64}$/.test(qualification.modelDigest);
  if (lowRisk && qualified && localResources) return {
    schemaVersion: informationModelPolicyVersion, backend: "ollama_loopback", model: "gpt-oss:20b",
    reasoningEffort: "low", modelDigest: qualification.modelDigest,
    reasonCode: "local_quality_qualified", reason: "The exact local model passed the independently accepted comparison and the host reports sufficient current resources.",
    localQualification: qualification.evidenceDigest, eligible: true
  };
  const reasonCode = !lowRisk ? "risk_low_required" : !qualified ? "local_qualification_missing" : "local_resources_unavailable";
  return { schemaVersion: informationModelPolicyVersion, backend: "codex_responses", model: "gpt-5.6-sol",
    reasoningEffort: "low", modelDigest: null,
    reasonCode, reason: !lowRisk ? "A current Low assessment is required before this information task can be Ready."
      : !qualified ? "The local model has no independently accepted comparison for this task class."
      : "No eligible host reports enough fresh resources for the qualified local model.",
    localQualification: null, eligible: lowRisk };
}

export async function informationModelProposalForTask(db: Prisma.TransactionClient, workspaceId: string, taskId: string) {
  const low = await db.$queryRaw<Array<{ id: string }>>`SELECT a.id FROM task_risk_assessments a
    WHERE a.workspace_id=${workspaceId}::uuid AND a.task_id=${taskId}::uuid
      AND a.id=task_risk_current(${taskId}::uuid) AND a.result->>'level'='low' LIMIT 1`;
  const hosts = await db.agentHost.findMany({ where: { workspaceId, status: "online" },
    select: { status: true, platform: true, capabilities: true, lastSeenAt: true, metadata: true } });
  const available = hosts.some(host => qualifiedLocalHost(host));
  return informationModelProposal(low.length === 1, acceptedLocalQualification, available);
}

export function selectionDiffersFromProposal(selection: any, proposal: InformationModelProposal): boolean {
  const backend = selection?.backend === "ollama_loopback" ? "ollama_loopback" : "codex_responses";
  const selected = selection?.modelSelection ?? selection;
  return backend !== proposal.backend || selected?.model !== proposal.model
    || selected?.reasoningEffort !== proposal.reasoningEffort
    || backend === "ollama_loopback" && proposal.modelDigest !== null && selected?.modelDigest !== proposal.modelDigest;
}

export function qualifiedLocalHost(host: Pick<AgentHost, "status" | "platform" | "capabilities" | "lastSeenAt" | "metadata">, now = new Date()): boolean {
  const provider = (host.metadata as any)?.executionProvider;
  if (host.platform !== "win32" || !Array.isArray(host.capabilities)
    || !host.capabilities.includes("company_information_runtime_v1")
    || provider?.kind !== "hermes_codex" || provider?.admissionProfile !== "managed_hermes_codex_low_v1"
    || provider?.executionSupported !== true || provider?.installation?.status !== "verified"
    || !Array.isArray(provider?.blockers) || provider.blockers.length !== 0) return false;
  const snapshot = schedulerResources(host, now);
  const GiB = 1024 ** 3;
  return snapshot.ok && snapshot.resources.freeMemoryBytes >= 4 * GiB
    && snapshot.resources.freeDiskBytes >= 2 * GiB && snapshot.resources.cpuLogicalCount >= 2;
}
