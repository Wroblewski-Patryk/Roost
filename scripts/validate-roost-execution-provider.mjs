import { readFile } from "node:fs/promises";
import { inspectExecutionProvider } from "./lib/agent-host-execution-provider.mjs";
import { validateAgentHostWorkspace } from "./lib/agent-host-workspace-guard.mjs";
try {
  let config = JSON.parse(await readFile(process.env.ROOST_AGENT_HOST_CONFIG || process.argv[2], "utf8"));
  // Match the managed Worker's canonical repository resolution before profile inspection.
  if (config.executionMode !== "observe" && config.executionProvider?.kind === "hermes_codex"
      && config.executionProvider.enabled === true && config.executionProvider.profile) {
    config = await validateAgentHostWorkspace(config);
  }
  const report = await inspectExecutionProvider(config);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.executionSupported) process.exitCode = 2;
} catch {
  process.stderr.write("execution_provider_config_unreadable\n");
  process.exitCode = 1;
}
