import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const snapshotPath = path.join(root, "docs/status/architecture-runtime-snapshot.json");
const deltaPath = path.join(root, "docs/status/architecture-delta-report.json");

function readJson(relativePath, fallback) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return fallback;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function main() {
  const graph = readJson("docs/graphs/project-graph.json", {});
  const evidenceQueue = readJson("docs/status/architecture-evidence-priority-queue.json", { count: 0 });
  const chainWorklist = readJson("docs/status/architecture-chain-hardening-worklist-summary.json", { total: 0 });
  const chainCoverage = readJson("docs/status/architecture-chain-coverage-report.json", {});
  const chainIntegrity = readJson("docs/status/architecture-chain-integrity-report.json", { issues: [] });
  const nodeIntegrity = readJson("docs/status/architecture-node-integrity-report.json", { issues: [] });
  const connectivity = readJson("docs/status/architecture-connectivity-report.json", { issues: 0 });
  const deadNodes = readJson("docs/status/architecture-dead-nodes-report.json", { deadCount: 0 });
  const roadmap = readJson("docs/status/architecture-roadmap.json", { status: "UNKNOWN" });

  const current = {
    generatedAt: new Date().toISOString(),
    graph: {
      nodes: Number(graph.nodeCount || 0),
      relations: Number(graph.relationCount || 0),
      chains: Number(graph.chainCount || 0)
    },
    evidenceQueue: Number(evidenceQueue.count || 0),
    chainWorklist: Number(chainWorklist.total || 0),
    chainCoveragePercent: Number(chainCoverage.coveragePercent || 0),
    chainIntegrityIssues: Array.isArray(chainIntegrity.issues) ? chainIntegrity.issues.length : 0,
    nodeIntegrityIssues: Array.isArray(nodeIntegrity.issues) ? nodeIntegrity.issues.length : 0,
    connectivityIssues: Number(connectivity.issues || 0),
    deadNodes: Number(deadNodes.deadCount || 0),
    roadmapStatus: String(roadmap.status || "UNKNOWN")
  };

  const previous = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")) : null;

  const delta = previous
    ? {
        nodes: current.graph.nodes - previous.graph.nodes,
        relations: current.graph.relations - previous.graph.relations,
        chains: current.graph.chains - previous.graph.chains,
        evidenceQueue: current.evidenceQueue - previous.evidenceQueue,
        chainWorklist: current.chainWorklist - previous.chainWorklist,
        chainCoveragePercent: current.chainCoveragePercent - previous.chainCoveragePercent,
        chainIntegrityIssues: current.chainIntegrityIssues - previous.chainIntegrityIssues,
        nodeIntegrityIssues: current.nodeIntegrityIssues - previous.nodeIntegrityIssues,
        connectivityIssues: current.connectivityIssues - previous.connectivityIssues,
        deadNodes: current.deadNodes - previous.deadNodes
      }
    : null;

  const report = {
    generatedAt: current.generatedAt,
    previous,
    current,
    delta
  };

  fs.writeFileSync(deltaPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(current, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        generatedAt: current.generatedAt,
        firstRun: !previous,
        nodes: current.graph.nodes,
        relations: current.graph.relations,
        chains: current.graph.chains
      },
      null,
      2
    )
  );
}

main();
