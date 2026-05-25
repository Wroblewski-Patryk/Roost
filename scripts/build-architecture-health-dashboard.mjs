import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function toBoolIcon(value) {
  return value ? "PASS" : "FAIL";
}

function main() {
  const evidenceReport = readJson("docs/status/architecture-evidence-enrichment-report.json");
  const chainCoverageReport = readJson("docs/status/architecture-chain-coverage-report.json");
  const chainIntegrityReport = readJson("docs/status/architecture-chain-integrity-report.json");
  const nodeIntegrityReport = readJson("docs/status/architecture-node-integrity-report.json");
  const relationIntegrityReport = readJson("docs/status/architecture-relation-integrity-report.json");
  const connectivityReport = readJson("docs/status/architecture-connectivity-report.json");
  const deadNodesReport = readJson("docs/status/architecture-dead-nodes-report.json");
  const roadmapReport = readJson("docs/status/architecture-roadmap.json");
  const deltaReport = readJson("docs/status/architecture-delta-report.json");
  const chainWorklistSummary = readJson("docs/status/architecture-chain-hardening-worklist-summary.json");
  const graphJson = readJson("docs/graphs/project-graph.json");

  const graphNodes = Array.isArray(graphJson?.nodes) ? graphJson.nodes.length : 0;
  const graphEdges = Array.isArray(graphJson?.relations)
    ? graphJson.relations.length
    : (Array.isArray(graphJson?.edges) ? graphJson.edges.length : 0);
  const graphChains = Array.isArray(graphJson?.chains) ? graphJson.chains.length : 0;

  const evidenceQueue = Number(evidenceReport?.queueCount ?? 0);
  const chainCoverageMissing = Number(chainCoverageReport?.missingFeatures ?? 0);
  const chainCoverageTotal = Number(chainCoverageReport?.totalRequiredFeatures ?? 0);
  const chainCoverageCovered = Number(chainCoverageReport?.coveredFeatures ?? 0);
  const chainIntegrityIssues = Number(chainIntegrityReport?.issues ?? 0);
  const nodeIntegrityIssues = Number(nodeIntegrityReport?.issues ?? 0);
  const relationIntegrityIssues = Number(relationIntegrityReport?.issues ?? 0);
  const connectivityIssues = Number(connectivityReport?.issues ?? 0);
  const deadNodes = Number(deadNodesReport?.deadCount ?? 0);
  const roadmapStatus = String(roadmapReport?.status ?? "UNKNOWN");
  const chainWorklistTotal = Number(chainWorklistSummary?.total ?? 0);
  const delta = deltaReport?.delta ?? null;

  const allGreen = evidenceQueue === 0
    && chainCoverageMissing === 0
    && chainIntegrityIssues === 0
    && nodeIntegrityIssues === 0
    && relationIntegrityIssues === 0
    && connectivityIssues === 0
    && deadNodes === 0
    && chainWorklistTotal === 0;

  const lines = [
    "# Architecture Health Dashboard",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Gate Status",
    "",
    `- Overall: ${toBoolIcon(allGreen)}`,
    `- Evidence Queue Empty: ${toBoolIcon(evidenceQueue === 0)} (queueCount=${evidenceQueue})`,
    `- Chain Coverage Complete: ${toBoolIcon(chainCoverageMissing === 0)} (${chainCoverageCovered}/${chainCoverageTotal})`,
    `- Chain Integrity: ${toBoolIcon(chainIntegrityIssues === 0)} (issues=${chainIntegrityIssues})`,
    `- Node Integrity: ${toBoolIcon(nodeIntegrityIssues === 0)} (issues=${nodeIntegrityIssues})`,
    `- Relation Integrity: ${toBoolIcon(relationIntegrityIssues === 0)} (issues=${relationIntegrityIssues})`,
    `- Connectivity: ${toBoolIcon(connectivityIssues === 0)} (issues=${connectivityIssues})`,
    `- Dead Nodes: ${toBoolIcon(deadNodes === 0)} (deadCount=${deadNodes})`,
    `- Chain Hardening Worklist Empty: ${toBoolIcon(chainWorklistTotal === 0)} (total=${chainWorklistTotal})`,
    `- Roadmap Status: ${roadmapStatus}`,
    "",
    "## Graph Snapshot",
    "",
    `- Nodes: ${graphNodes}`,
    `- Relations: ${graphEdges}`,
    `- Chains: ${graphChains}`,
    "",
    "## Refresh Delta",
    "",
    `- Nodes delta: ${delta ? Number(delta.nodes ?? 0) : "n/a"}`,
    `- Relations delta: ${delta ? Number(delta.relations ?? 0) : "n/a"}`,
    `- Chains delta: ${delta ? Number(delta.chains ?? 0) : "n/a"}`,
    `- Evidence queue delta: ${delta ? Number(delta.evidenceQueue ?? 0) : "n/a"}`,
    "",
    "## Source Reports",
    "",
    "- `docs/status/architecture-evidence-enrichment-report.json`",
    "- `docs/status/architecture-chain-coverage-report.json`",
    "- `docs/status/architecture-chain-integrity-report.json`",
    "- `docs/status/architecture-node-integrity-report.json`",
    "- `docs/status/architecture-relation-integrity-report.json`",
    "- `docs/status/architecture-connectivity-report.json`",
    "- `docs/status/architecture-dead-nodes-report.json`",
    "- `docs/status/architecture-roadmap.json`",
    "- `docs/status/architecture-delta-report.json`",
    "- `docs/status/architecture-chain-hardening-worklist-summary.json`",
    "- `docs/graphs/project-graph.json`",
    ""
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    allGreen,
    evidenceQueue,
    chainCoverageCovered,
    chainCoverageTotal,
    chainIntegrityIssues,
    nodeIntegrityIssues,
    relationIntegrityIssues,
    connectivityIssues,
    deadNodes,
    roadmapStatus,
    chainWorklistTotal,
    delta: delta
      ? {
          nodes: Number(delta.nodes ?? 0),
          relations: Number(delta.relations ?? 0),
          chains: Number(delta.chains ?? 0),
          evidenceQueue: Number(delta.evidenceQueue ?? 0)
        }
      : null,
    graph: { nodes: graphNodes, relations: graphEdges, chains: graphChains }
  };

  fs.writeFileSync(
    path.join(root, "docs/status/architecture-health-dashboard.md"),
    `${lines.join("\n")}\n`
  );
  fs.writeFileSync(
    path.join(root, "docs/status/architecture-health-dashboard.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  console.log(JSON.stringify(payload, null, 2));
}

main();
