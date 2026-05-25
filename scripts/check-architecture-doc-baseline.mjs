import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function extractValue(text, label) {
  const prefix = `- ${label}:`;
  const line = text
    .split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith(prefix));
  if (!line) return null;
  const raw = line.slice(line.indexOf(prefix) + prefix.length).trim();
  return raw.replaceAll("`", "").trim();
}

function main() {
  const health = readJson("docs/status/architecture-health-dashboard.json");
  const docPath = "docs/architecture/architecture-evidence-system.md";
  const doc = readText(docPath);

  const expected = {
    graph: `${health.graph.nodes} nodes, ${health.graph.relations} relations, ${health.graph.chains} chains`,
    evidenceQueue: String(health.evidenceQueue),
    chainWorklist: String(health.chainWorklistTotal),
    chainCoverage: `${health.chainCoverageCovered}/${health.chainCoverageTotal} features (100%)`,
    chainIntegrity: String(health.chainIntegrityIssues),
    nodeIntegrity: String(health.nodeIntegrityIssues)
  };

  const actual = {
    graph: extractValue(doc, "graph"),
    evidenceQueue: extractValue(doc, "evidence queue"),
    chainWorklist: extractValue(doc, "chain hardening worklist"),
    chainCoverage: extractValue(doc, "chain coverage gate"),
    chainIntegrity: extractValue(doc, "chain integrity issues"),
    nodeIntegrity: extractValue(doc, "node integrity issues")
  };

  const issues = [];
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      issues.push({
        field: key,
        expected: value,
        actual: actual[key]
      });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    docPath,
    issues: issues.length,
    issueRows: issues
  };

  writeText("docs/status/architecture-doc-baseline-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length > 0) {
    console.error(`Architecture doc baseline gate failed: ${issues.length} mismatch(es).`);
    process.exit(1);
  }

  console.log("Architecture doc baseline gate passed: current baseline matches runtime health dashboard.");
}

main();
