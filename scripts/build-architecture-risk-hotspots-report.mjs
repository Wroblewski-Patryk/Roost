import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath, fallback) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusPenalty(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "broken") return 100;
  if (normalized === "missing") return 90;
  if (normalized === "blocked") return 80;
  if (normalized === "in_progress") return 35;
  if (normalized === "planned") return 20;
  if (normalized === "deprecated") return 15;
  return 0;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function toCsv(header, rows) {
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(row[key] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const impactIndex = readJson("docs/status/architecture-impact-index.json", { rows: [] });
  const impactDelta = readJson("docs/status/architecture-impact-delta-report.json", { topImpactDelta: [] });
  const evidenceQueue = readJson("docs/status/architecture-evidence-priority-queue.json", { count: 0 });
  const chainWorklist = readJson("docs/status/architecture-chain-hardening-worklist-summary.json", { total: 0 });
  const nodeIntegrity = readJson("docs/status/architecture-node-integrity-report.json", { issues: 0 });
  const relationIntegrity = readJson("docs/status/architecture-relation-integrity-report.json", { issues: 0 });
  const chainIntegrity = readJson("docs/status/architecture-chain-integrity-report.json", { issues: [] });
  const connectivity = readJson("docs/status/architecture-connectivity-report.json", { issues: 0 });

  const deltaMap = new Map();
  for (const row of impactDelta.topImpactDelta ?? []) {
    if (!row?.node_id) continue;
    deltaMap.set(row.node_id, asNumber(row.impact_score_delta));
  }

  const hotspots = [];
  for (const row of impactIndex.rows ?? []) {
    const nodeId = row.node_id;
    if (!nodeId) continue;
    const impactScore = asNumber(row.impact_score);
    const deltaScore = Math.abs(asNumber(deltaMap.get(nodeId)));
    const penalty = statusPenalty(row.status);
    const riskScore = impactScore + (deltaScore * 5) + penalty;
    if (riskScore <= 0) continue;

    const reasons = [];
    if (penalty > 0) reasons.push(`status:${String(row.status || "unknown").toLowerCase()}`);
    if (deltaScore > 0) reasons.push(`impact_delta:${deltaScore}`);
    if (impactScore >= 80) reasons.push("high_transitive_impact");
    if (asNumber(row.transitive_out_count) >= 50) reasons.push("wide_change_surface");

    hotspots.push({
      node_id: nodeId,
      node_name: row.node_name || "",
      type: row.type || "",
      module: row.module || "",
      feature: row.feature || "",
      status: row.status || "",
      risk_score: Math.round(riskScore),
      impact_score: impactScore,
      impact_delta: deltaScore,
      transitive_out_count: asNumber(row.transitive_out_count),
      reasons: reasons.join(";")
    });
  }

  hotspots.sort((a, b) => b.risk_score - a.risk_score);
  const top = hotspots.slice(0, 25);

  const globalRiskSignals = {
    evidenceQueue: asNumber(evidenceQueue.count),
    chainWorklist: asNumber(chainWorklist.total),
    nodeIntegrityIssues: asNumber(nodeIntegrity.issues),
    relationIntegrityIssues: asNumber(relationIntegrity.issues),
    chainIntegrityIssues: Array.isArray(chainIntegrity.issues) ? chainIntegrity.issues.length : asNumber(chainIntegrity.issues),
    connectivityIssues: asNumber(connectivity.issues)
  };

  const report = {
    generatedAt: new Date().toISOString(),
    status: "passed",
    summary: {
      hotspotCount: top.length,
      highestRiskScore: top.length ? top[0].risk_score : 0
    },
    globalRiskSignals,
    topHotspots: top
  };

  fs.writeFileSync(
    path.join(root, "docs/status/architecture-risk-hotspots-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  fs.writeFileSync(
    path.join(root, "docs/status/architecture-risk-hotspots-top.csv"),
    toCsv(
      [
        "node_id",
        "node_name",
        "type",
        "module",
        "feature",
        "status",
        "risk_score",
        "impact_score",
        "impact_delta",
        "transitive_out_count",
        "reasons"
      ],
      top
    )
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        hotspotCount: report.summary.hotspotCount,
        highestRiskScore: report.summary.highestRiskScore
      },
      null,
      2
    )
  );
}

main();
