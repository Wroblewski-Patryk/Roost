import { readFile } from "node:fs/promises";
import { inspectExecutionProvider } from "./lib/agent-host-execution-provider.mjs";
try {
  const config = JSON.parse(await readFile(process.env.ROOST_AGENT_HOST_CONFIG || process.argv[2], "utf8"));
  const report = await inspectExecutionProvider(config);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.executionSupported) process.exitCode = 2;
} catch {
  process.stderr.write("execution_provider_config_unreadable\n");
  process.exitCode = 1;
}
