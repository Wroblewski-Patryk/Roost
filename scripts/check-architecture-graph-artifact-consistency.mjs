import fs from "fs";
import path from "path";

const root = process.cwd();
const graphJsonPath = path.join(root, "docs/graphs/project-graph.json");
const healthJsonPath = path.join(root, "docs/status/architecture-health-dashboard.json");
const generatedDir = path.join(root, "docs/architecture/nodes/generated");
const reportPath = path.join(root, "docs/status/architecture-graph-artifact-consistency-report.json");

function fail(reason, details = []) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason,
    details
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(reason);
  for (const item of details) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

if (!fs.existsSync(graphJsonPath)) fail("Missing docs/graphs/project-graph.json");
if (!fs.existsSync(healthJsonPath)) fail("Missing docs/status/architecture-health-dashboard.json");
if (!fs.existsSync(generatedDir)) fail("Missing docs/architecture/nodes/generated directory");

const graph = JSON.parse(fs.readFileSync(graphJsonPath, "utf8"));
const health = JSON.parse(fs.readFileSync(healthJsonPath, "utf8"));

const graphNodeCount = Array.isArray(graph.nodes) ? graph.nodes.length : -1;
const graphRelationCount = Array.isArray(graph.relations) ? graph.relations.length : -1;
const graphChainCount = Array.isArray(graph.chains) ? graph.chains.length : -1;

const healthNodes = Number(health.graph?.nodes ?? -1);
const healthRelations = Number(health.graph?.relations ?? -1);
const healthChains = Number(health.graph?.chains ?? -1);

const generatedNodeCards = fs.readdirSync(generatedDir).filter((name) => name.endsWith(".md")).length;

const issues = [];
if (graphNodeCount !== healthNodes) {
  issues.push(`Node mismatch: graph.json=${graphNodeCount}, health=${healthNodes}`);
}
if (graphRelationCount !== healthRelations) {
  issues.push(`Relation mismatch: graph.json=${graphRelationCount}, health=${healthRelations}`);
}
if (graphChainCount !== healthChains) {
  issues.push(`Chain mismatch: graph.json=${graphChainCount}, health=${healthChains}`);
}
if (generatedNodeCards !== graphNodeCount) {
  issues.push(`Generated node-card mismatch: cards=${generatedNodeCards}, graph.json nodes=${graphNodeCount}`);
}

if (issues.length) {
  fail("Architecture graph artifact consistency gate failed.", issues);
}

const report = {
  checkedAt: new Date().toISOString(),
  status: "passed",
  graph: {
    nodes: graphNodeCount,
    relations: graphRelationCount,
    chains: graphChainCount
  },
  health: {
    nodes: healthNodes,
    relations: healthRelations,
    chains: healthChains
  },
  generatedNodeCards
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Architecture graph artifact consistency gate passed: ${graphNodeCount} nodes, ${graphRelationCount} relations, ${graphChainCount} chains.`
);
