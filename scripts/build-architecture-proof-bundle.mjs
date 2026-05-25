import fs from "fs";
import path from "path";

const root = process.cwd();
const statusDir = path.join(root, "docs/status");
const mdPath = path.join(statusDir, "architecture-proof-bundle.md");
const jsonPath = path.join(statusDir, "architecture-proof-bundle.json");

function readJson(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return null;
  }
}

function deriveStatus(report) {
  if (!report) return "missing";
  if (typeof report.status === "string") return report.status;
  if (typeof report.result === "string") return report.result;
  if (typeof report.issues === "number") return report.issues === 0 ? "passed" : "failed";
  if (typeof report.issuesCount === "number") return report.issuesCount === 0 ? "passed" : "failed";
  if (typeof report.invalidCount === "number") return report.invalidCount === 0 ? "passed" : "failed";
  if (typeof report.conflicts === "number") return report.conflicts === 0 ? "passed" : "failed";
  if (typeof report.missingFeatures === "number") return report.missingFeatures === 0 ? "passed" : "failed";
  if (typeof report.missingCount === "number" && typeof report.emptyCount === "number") {
    return report.missingCount === 0 && report.emptyCount === 0 ? "passed" : "failed";
  }
  if (typeof report.orphanCount === "number") return report.orphanCount === 0 ? "passed" : "failed";
  if (typeof report.deadCount === "number") return report.deadCount === 0 ? "passed" : "failed";
  return "unknown";
}

const health = readJson("docs/status/architecture-health-dashboard.json");
const evidenceQueue = readJson("docs/status/architecture-evidence-priority-queue.json");
const chainWorklist = readJson("docs/status/architecture-chain-hardening-worklist-summary.json");
const delta = readJson("docs/status/architecture-delta-report.json");

const gateReports = [
  "docs/status/architecture-csv-contract-report.json",
  "docs/status/architecture-node-integrity-report.json",
  "docs/status/architecture-node-catalog-consistency-report.json",
  "docs/status/architecture-chain-coverage-report.json",
  "docs/status/architecture-chain-integrity-report.json",
  "docs/status/architecture-relation-integrity-report.json",
  "docs/status/architecture-connectivity-report.json",
  "docs/status/architecture-node-links-report.json",
  "docs/status/architecture-node-artifacts-report.json",
  "docs/status/architecture-generated-node-frontmatter-report.json",
  "docs/status/architecture-pipeline-nodes-report.json",
  "docs/status/architecture-evidence-cardinality-report.json",
  "docs/status/architecture-graph-artifact-consistency-report.json",
  "docs/status/architecture-delta-zero-report.json",
  "docs/status/architecture-doc-baseline-report.json"
];

const gates = gateReports.map((file) => {
  const report = readJson(file);
  return {
    file,
    status: deriveStatus(report)
  };
});

const allGatesPass = gates.every((g) => g.status === "passed");
const graph = health?.graph ?? { nodes: 0, relations: 0, chains: 0 };
const bundle = {
  generatedAt: new Date().toISOString(),
  graph,
  evidenceQueue: Number(evidenceQueue?.count ?? 0),
  chainWorklist: Number(chainWorklist?.total ?? 0),
  delta: {
    nodes: Number(delta?.nodes ?? 0),
    relations: Number(delta?.relations ?? 0),
    chains: Number(delta?.chains ?? 0)
  },
  allGatesPass,
  gates
};

fs.mkdirSync(statusDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);

const lines = [
  "# Architecture Proof Bundle",
  "",
  `Generated at: ${bundle.generatedAt}`,
  "",
  `- Graph: \`${graph.nodes}\` nodes / \`${graph.relations}\` relations / \`${graph.chains}\` chains`,
  `- Evidence queue: \`${bundle.evidenceQueue}\``,
  `- Chain worklist: \`${bundle.chainWorklist}\``,
  `- Delta: nodes=\`${bundle.delta.nodes}\`, relations=\`${bundle.delta.relations}\`, chains=\`${bundle.delta.chains}\``,
  `- All gates pass: \`${allGatesPass ? "yes" : "no"}\``,
  "",
  "| Gate report | Status |",
  "| --- | --- |",
  ...gates.map((gate) => `| \`${gate.file}\` | ${gate.status} |`)
];
fs.writeFileSync(mdPath, `${lines.join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      generatedAt: bundle.generatedAt,
      graph,
      evidenceQueue: bundle.evidenceQueue,
      chainWorklist: bundle.chainWorklist,
      allGatesPass
    },
    null,
    2
  )
);
