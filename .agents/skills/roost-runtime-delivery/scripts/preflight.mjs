import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function findRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, "AGENTS.md")) && existsSync(path.join(current, "docs", "documentation-contract.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("roost_repository_root_not_found");
    current = parent;
  }
}

const root = findRoot(process.cwd());
const errors = [];
const warnings = [];
const contractPath = path.join(root, "docs", "documentation-contract.json");
let contract;

try {
  contract = JSON.parse(readFileSync(contractPath, "utf8"));
} catch (error) {
  errors.push(`documentation_contract_invalid:${error.message}`);
}

let defaultContextBytes = 0;
if (contract) {
  if (!Array.isArray(contract.defaultAgentContext) || contract.defaultAgentContext.length === 0) {
    errors.push("default_agent_context_missing");
  } else {
    for (const relative of contract.defaultAgentContext) {
      const absolute = path.join(root, relative);
      if (!existsSync(absolute)) errors.push(`default_context_file_missing:${relative}`);
      else defaultContextBytes += statSync(absolute).size;
    }
  }
  const maxContext = contract.budgets?.maxDefaultContextBytes;
  if (Number.isFinite(maxContext) && defaultContextBytes > maxContext) errors.push(`default_context_budget_exceeded:${defaultContextBytes}:${maxContext}`);
}

const implementationPath = path.join(root, "docs", "implementation.md");
if (!existsSync(implementationPath)) {
  errors.push("implementation_handoff_missing");
} else {
  const implementation = readFileSync(implementationPath, "utf8");
  const requiredSections = [
    "## Delivery objective",
    "## Execution ownership",
    "## Current verified state",
    "## End-to-end delivery gates",
    "## True owner dependencies",
    "## Completion evidence",
  ];
  for (const section of requiredSections) if (!implementation.includes(section)) errors.push(`implementation_section_missing:${section.slice(3)}`);
  const gates = [...implementation.matchAll(/^### Gate ([1-5])\b/gm)].map((match) => Number(match[1]));
  if (JSON.stringify(gates) !== JSON.stringify([1, 2, 3, 4, 5])) errors.push(`implementation_gate_sequence_invalid:${gates.join(",")}`);
  const maxPlanning = contract?.budgets?.maxActivePlanningFileBytes;
  const bytes = statSync(implementationPath).size;
  if (Number.isFinite(maxPlanning) && bytes > maxPlanning) errors.push(`implementation_budget_exceeded:${bytes}:${maxPlanning}`);
}

const packagePath = path.join(root, "package.json");
if (!existsSync(packagePath)) {
  errors.push("package_json_missing");
} else {
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  for (const script of ["lint", "typecheck", "build", "validate", "test:api:local", "agent:codex-host", "agent:provider:check", "codex:requirements", "test:codex-infrastructure", "codex:check"]) {
    if (typeof packageJson.scripts?.[script] !== "string") errors.push(`package_script_missing:${script}`);
  }
}

let git = null;
try {
  const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  git = { branch, head, changedEntries: status.length };
  if (status.length) warnings.push(`worktree_has_changes:${status.length}`);
} catch (error) {
  errors.push(`git_inspection_failed:${error.message}`);
}

const report = {
  schema: "roost-codex-preflight-v1",
  ok: errors.length === 0,
  root,
  defaultContextBytes,
  git,
  warnings,
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
