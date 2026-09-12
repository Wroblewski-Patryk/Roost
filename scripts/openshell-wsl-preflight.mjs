import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function decodeWsl(bytes) {
  return bytes.toString(bytes.includes(0) ? "utf16le" : "utf8").replace(/^\uFEFF/, "");
}

export function classifyWslInventory(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw Error("wsl_inventory_unavailable");
  const counts = { internal: 0, userV1: 0, userV2: 0 };
  for (const line of lines.slice(1)) {
    const row = line.trim().replace(/^\*\s*/, "").match(/^(.+?)\s{2,}.+?\s{2,}([12])$/);
    if (!row) throw Error("wsl_inventory_unrecognized");
    if (["docker-desktop", "docker-desktop-data"].includes(row[1].toLowerCase())) counts.internal++;
    else counts[row[2] === "2" ? "userV2" : "userV1"]++;
  }
  return { ...counts, gate: counts.userV2 ? "further_checks_required" : "blocked",
    reason: counts.userV2 ? "docker_integration_and_sandbox_evidence_required" : "user_wsl2_distribution_missing" };
}

const env = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  ["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "TEMP", "TMP"].includes(key.toUpperCase())));
const readOnly = (command, args) => execFileSync(command, args, {
  encoding: "buffer", shell: false, windowsHide: true, timeout: 10000, maxBuffer: 16384,
  env: env(), stdio: ["ignore", "pipe", "pipe"]
});

export function probeOpenShellPrerequisites({ run = readOnly, platform = process.platform } = {}) {
  if (platform !== "win32") return { gate: "blocked", reason: "windows_route_only" };
  try {
    const inventory = classifyWslInventory(decodeWsl(run("wsl.exe", ["--list", "--verbose"])));
    const version = decodeWsl(run("wsl.exe", ["--version"])).split(/\r?\n/)[0].match(/\d+\.\d+\.\d+(?:\.\d+)?/)?.[0] ?? null;
    const docker = run("docker.exe", ["--version"]).toString("utf8").match(/^Docker version ([\d.]+), build ([a-f0-9]+)/);
    if (!version || !docker) throw Error("client_version_unrecognized");
    return { schemaVersion: 1, ...inventory, wslVersion: version, dockerClientVersion: docker[1],
      dockerClientBuild: docker[2], dockerDaemonQueried: false, distributionEntered: false,
      sandboxStarted: false, executionAdmission: false };
  } catch { return { gate: "blocked", reason: "prerequisite_probe_failed" }; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = probeOpenShellPrerequisites();
  console.log(JSON.stringify(result, null, 2));
  // Zero never means GO: it means a user distro exists and more checks are needed.
  process.exitCode = result.gate === "blocked" ? 2 : 0;
}
