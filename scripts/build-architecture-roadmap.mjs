import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath, fallback) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function top(items, limit = 10) {
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

function fmtDate() {
  return new Date().toISOString();
}

function build() {
  const health = readJson("docs/status/architecture-health-dashboard.json", null);
  const evidenceQueue = readJson("docs/status/architecture-evidence-priority-queue.json", { count: 0, items: [] });
  const chainWorklist = readJson("docs/status/architecture-chain-hardening-worklist-summary.json", { total: 0 });
  const chainCoverage = readJson("docs/status/architecture-chain-coverage-report.json", {});
  const chainIntegrity = readJson("docs/status/architecture-chain-integrity-report.json", { issues: [] });
  const nodeIntegrity = readJson("docs/status/architecture-node-integrity-report.json", { issues: [] });
  const connectivity = readJson("docs/status/architecture-connectivity-report.json", { issues: 0, issueRows: [] });
  const impact = readJson("docs/status/architecture-impact-index.json", { topByImpact: [] });
  const deadNodes = readJson("docs/status/architecture-dead-nodes-report.json", { deadCount: 0, deadRows: [] });

  const coveragePercent =
    Number.isFinite(Number(chainCoverage.coveragePercent)) ? Number(chainCoverage.coveragePercent) : null;

  const risks = [];
  if ((evidenceQueue.count || 0) > 0) risks.push(`Evidence queue has ${evidenceQueue.count} actionable items.`);
  if ((chainWorklist.total || 0) > 0) risks.push(`Chain hardening has ${chainWorklist.total} pending rows.`);
  if ((chainIntegrity.issues || []).length > 0) risks.push(`Chain integrity has ${(chainIntegrity.issues || []).length} issues.`);
  if ((nodeIntegrity.issues || []).length > 0) risks.push(`Node integrity has ${(nodeIntegrity.issues || []).length} issues.`);
  if ((connectivity.issues || 0) > 0) risks.push(`Connectivity has ${connectivity.issues} orphan actionable nodes.`);
  if ((deadNodes.deadCount || 0) > 0) risks.push(`Dead-node detection found ${deadNodes.deadCount} disconnected actionable nodes.`);
  if (coveragePercent !== null && coveragePercent < 100) risks.push(`Chain coverage is ${coveragePercent}% (<100%).`);

  const status = risks.length ? "ATTENTION_REQUIRED" : "GREEN";

  const nextActions = [];
  if ((evidenceQueue.count || 0) > 0) {
    for (const item of top(evidenceQueue.items, 5)) {
      nextActions.push(`- [ ] EVIDENCE: ${item.node_id} (${item.node_type}) -> missing: ${item.missing || "n/a"}`);
    }
  }
  if ((chainWorklist.total || 0) > 0) {
    nextActions.push(`- [ ] CHAIN: resolve ${chainWorklist.total} pending hardening rows.`);
  }
  if ((deadNodes.deadCount || 0) > 0) {
    for (const item of top(deadNodes.deadRows, 5)) {
      nextActions.push(`- [ ] DEAD-NODE: connect ${item.node_id} (${item.type}) to graph/chain relations.`);
    }
  }
  if (!nextActions.length) {
    nextActions.push("- [ ] No blocking architecture actions. Keep maintenance mode and monitor regressions on each refresh.");
  }

  const topImpact = top(impact.topByImpact, 10)
    .map(
      (row, idx) =>
        `${idx + 1}. ${row.node_id} (${row.node_name || "n/a"}) - score ${row.impact_score}, direct_out ${row.direct_out_count}, transitive_out ${row.transitive_out_count}`
    )
    .join("\n");

  const markdown = `# Architecture Roadmap\n\n` +
    `Generated at: ${fmtDate()}\n\n` +
    `## Program Status\n\n` +
    `- Status: **${status}**\n` +
    `- Evidence queue: **${evidenceQueue.count || 0}**\n` +
    `- Chain hardening queue: **${chainWorklist.total || 0}**\n` +
    `- Chain integrity issues: **${(chainIntegrity.issues || []).length}**\n` +
    `- Node integrity issues: **${(nodeIntegrity.issues || []).length}**\n` +
    `- Connectivity issues: **${connectivity.issues || 0}**\n` +
    `- Dead nodes: **${deadNodes.deadCount || 0}**\n` +
    `- Chain coverage: **${coveragePercent === null ? "n/a" : `${coveragePercent}%`}**\n\n` +
    `## Active Risks\n\n` +
    `${risks.length ? risks.map((risk) => `- ${risk}`).join("\n") : "- No active risks detected by the architecture runtime gates."}\n\n` +
    `## Next Actions\n\n` +
    `${nextActions.join("\n")}\n\n` +
    `## Highest Impact Nodes\n\n` +
    `${topImpact || "No impact rows available."}\n`;

  const json = {
    generatedAt: fmtDate(),
    status,
    previousHealthStatus: health?.allGreen === true ? "GREEN" : (health ? "ATTENTION_REQUIRED" : "UNKNOWN"),
    metrics: {
      evidenceQueue: evidenceQueue.count || 0,
      chainWorklist: chainWorklist.total || 0,
      chainIntegrityIssues: (chainIntegrity.issues || []).length,
      nodeIntegrityIssues: (nodeIntegrity.issues || []).length,
      connectivityIssues: connectivity.issues || 0,
      deadNodes: deadNodes.deadCount || 0,
      chainCoveragePercent: coveragePercent
    },
    risks,
    nextActions,
    topImpact: top(impact.topByImpact, 20)
  };

  writeText("docs/status/architecture-roadmap.md", markdown);
  writeText("docs/status/architecture-roadmap.json", `${JSON.stringify(json, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        generatedAt: json.generatedAt,
        status: json.status,
        evidenceQueue: json.metrics.evidenceQueue,
        chainWorklist: json.metrics.chainWorklist
      },
      null,
      2
    )
  );
}

build();
