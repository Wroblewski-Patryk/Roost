import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateAgentHostWorkspace } from "./lib/agent-host-workspace-guard.mjs";

const configPath = process.env.ROOST_AGENT_HOST_CONFIG || process.argv[2];
if (!configPath) throw new Error("Pass the Agent Host config path or set ROOST_AGENT_HOST_CONFIG.");
const input = JSON.parse(await readFile(path.resolve(configPath), "utf8"));
const config = await validateAgentHostWorkspace(input);
process.stdout.write(`${JSON.stringify({
  status: "ok",
  workspaceRoot: config.workspaceRoot,
  repositories: Object.entries(config.repositories).map(([slug, repository]) => ({
    slug,
    directory: repository.directory,
    originUrl: repository.originUrl,
    deploymentUrl: repository.deploymentUrl
  }))
}, null, 2)}\n`);
