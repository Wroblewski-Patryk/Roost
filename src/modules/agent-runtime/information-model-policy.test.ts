import test from "node:test";
import assert from "node:assert/strict";
import { informationModelProposal, qualifiedLocalHost, selectionDiffersFromProposal } from "./information-model-policy";

const digest = (letter: string) => letter.repeat(64);
test("G23 requires current Low risk and independently accepted exact local evidence before proposing local", () => {
  const qualified = { evidenceDigest: digest("a"), modelDigest: `sha256:${digest("b")}`, model: "gpt-oss:20b" as const,
    cases: ["plain_status", "unsupported_readiness_claim"] as const, independentlyAccepted: true as const, resourceEligible: true as const };
  assert.deepEqual(informationModelProposal(false, qualified, true), { schemaVersion: "roost-model-policy-proposal-v1",
    backend: "codex_responses", model: "gpt-5.6-sol", reasoningEffort: "low", modelDigest: null,
    reasonCode: "risk_low_required", reason: "A current Low assessment is required before this information task can be Ready.", localQualification: null, eligible: false });
  assert.equal(informationModelProposal(true).reasonCode, "local_qualification_missing");
  assert.equal(informationModelProposal(true, qualified).reasonCode, "local_resources_unavailable");
  assert.deepEqual(informationModelProposal(true, qualified, true), { schemaVersion: "roost-model-policy-proposal-v1",
    backend: "ollama_loopback", model: "gpt-oss:20b", reasoningEffort: "low", modelDigest: qualified.modelDigest,
    reasonCode: "local_quality_qualified", reason: "The exact local model passed the independently accepted comparison and the host reports sufficient current resources.",
    localQualification: qualified.evidenceDigest, eligible: true });
  assert.equal(informationModelProposal(true, { ...qualified, evidenceDigest: "not-evidence" }).backend, "codex_responses");
  assert.equal(informationModelProposal(true, { ...qualified, modelDigest: `sha256:${digest("c")}`, resourceEligible: false } as any).backend, "codex_responses");
});

test("G23 compares the exact backend, model, effort and qualified local digest", () => {
  const proposal = informationModelProposal(true);
  assert.equal(selectionDiffersFromProposal({ model: "gpt-5.6-sol", reasoningEffort: "low" }, proposal), false);
  assert.equal(selectionDiffersFromProposal({ model: "gpt-5.6-terra", reasoningEffort: "low" }, proposal), true);
  assert.equal(selectionDiffersFromProposal({ model: "gpt-5.6-sol", reasoningEffort: "medium" }, proposal), true);
  assert.equal(selectionDiffersFromProposal({ backend: "ollama_loopback", modelSelection: { model: "gpt-oss:20b", reasoningEffort: "low" } }, proposal), true);
});

test("G23 requires a fresh admitted information host with resource reserve", () => {
  const now = new Date();
  const GiB = 1024 ** 3;
  const host = { status: "online", platform: "win32", capabilities: ["company_information_runtime_v1"], lastSeenAt: now,
    metadata: { executionProvider: { kind: "hermes_codex", admissionProfile: "managed_hermes_codex_low_v1",
      executionSupported: true, installation: { status: "verified" }, blockers: [] },
    schedulerResources: { schemaVersion: "roost-host-resources-v1", observedAt: now.toISOString(),
      freeMemoryBytes: 8 * GiB, totalMemoryBytes: 32 * GiB, freeDiskBytes: 8 * GiB,
      totalDiskBytes: 64 * GiB, cpuLogicalCount: 8 } } } as any;
  assert.equal(qualifiedLocalHost(host, now), true);
  assert.equal(qualifiedLocalHost({ ...host, capabilities: [] }, now), false);
  assert.equal(qualifiedLocalHost({ ...host, metadata: { ...host.metadata, executionProvider: { ...host.metadata.executionProvider, blockers: ["unavailable"] } } }, now), false);
  assert.equal(qualifiedLocalHost({ ...host, lastSeenAt: new Date(now.getTime() - 61_000) }, now), false);
  assert.equal(qualifiedLocalHost({ ...host, metadata: { ...host.metadata,
    schedulerResources: { ...host.metadata.schedulerResources, freeMemoryBytes: 3 * GiB } } }, now), false);
});
