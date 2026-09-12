export type ExecutionProviderKind = "direct_codex" | "hermes_codex";
export type ProviderReport = {
  contractVersion: number; kind: ExecutionProviderKind | "unknown"; pinnedVersion: string | null;
  installedVersion: string | null;
  brokerContractVerified: boolean;
  installation: { status: "verified" | "unverified"; version: string | null; fingerprint: string | null; checkedAt: string | null; signature: "unsigned" | null };
  compatibility: "reference" | "unproven"; executionSupported: boolean; blockers: string[];
};
const contract = require("../../../scripts/lib/agent-host-provider-contract.cjs") as {
  projectProvider: (value: unknown) => ProviderReport;
  providerAdmissionReason: (value: unknown) => string | null;
  sanitizeProviderMetadata: (value: unknown) => Record<string, unknown>;
};
export const { projectProvider, providerAdmissionReason, sanitizeProviderMetadata } = contract;
export { default as executionProviderRegistry } from "./execution-providers.json";
