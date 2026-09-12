import path from "node:path";
import { lstat, realpath } from "node:fs/promises";
import contract from "./agent-host-provider-contract.cjs";

export const { registry, providerAdmissionReason } = contract;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export async function inspectExecutionProvider(config, { platform = process.platform } = {}) {
  const input = config.executionProvider;
  if (contract.providerKind(input) !== "hermes_codex") return contract.projectProvider(input);
  const entry = registry.providers.find(provider => provider.kind === "hermes_codex"), blockers = [];
  if (input.enabled !== true) blockers.push("hermes_disabled");
  if (input.officialSource !== entry.officialSource) blockers.push("hermes_identity_invalid");
  if (input.version !== entry.version || input.commit !== entry.commit) blockers.push("hermes_pin_invalid");
  if (platform !== "win32") blockers.push("hermes_windows_required");
  const executable = input.executablePath;
  // Explicit drive-absolute executable only; never resolve PATH, shell commands, UNC or relative paths.
  const validPath = typeof executable === "string" && /^[a-z]:\\/i.test(executable)
    && path.win32.normalize(executable) === executable && /\.exe$/i.test(executable)
    && !/[\x00-\x1f<>"|?*]/.test(executable) && !executable.slice(2).includes(":");
  if (!validPath) blockers.push("hermes_executable_invalid");
  else if (platform === "win32") {
    try {
      const stat = await lstat(executable);
      if (!stat.isFile() || stat.isSymbolicLink() || (await realpath(executable)).toLowerCase() !== executable.toLowerCase()) blockers.push("hermes_executable_invalid");
    } catch { blockers.push("hermes_executable_missing"); }
  }
  const policy = input.policy ?? {}, expected = registry.hermesPolicy;
  const mcpKeys = ["mcpServer", "minimumTools", "supportsParallelToolCalls", "prompts", "resources", "sampling"];
  if (mcpKeys.some(key => !same(policy[key], expected[key])) || Object.keys(policy).some(key => !(key in expected))) blockers.push("hermes_mcp_policy_invalid");
  if (Object.keys(expected).filter(key => !mcpKeys.includes(key)).some(key => policy[key] !== expected[key])
    || Object.keys(input).some(key => !["kind", "enabled", "officialSource", "version", "commit", "executablePath", "policy"].includes(key))) blockers.push("hermes_authority_policy_invalid");
  // Configuration assertions are not runtime evidence. v1 contains no Hermes launcher or compatibility override.
  return contract.projectProvider({ kind: "hermes_codex", blockers });
}
