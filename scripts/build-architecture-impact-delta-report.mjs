import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const currentPath = path.join(root, "docs/status/architecture-impact-index.json");
const snapshotPath = path.join(root, "docs/status/architecture-impact-index-snapshot.json");
const reportPath = path.join(root, "docs/status/architecture-impact-delta-report.json");

function readJson(absolutePath, fallback = null) {
  if (!fs.existsSync(absolutePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return fallback;
  }
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadRowMap(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const map = new Map();
  for (const row of rows) {
    if (!row?.node_id || map.has(row.node_id)) continue;
    map.set(row.node_id, {
      node_id: row.node_id,
      node_name: String(row.node_name ?? ""),
      impact_score: asNumber(row.impact_score),
      direct_out_count: asNumber(row.direct_out_count),
      transitive_out_count: asNumber(row.transitive_out_count),
      direct_in_count: asNumber(row.direct_in_count),
      transitive_in_count: asNumber(row.transitive_in_count)
    });
  }
  return map;
}

function topIds(payload) {
  const top = Array.isArray(payload?.topByImpact) ? payload.topByImpact : [];
  return new Set(top.map((row) => row?.node_id).filter(Boolean));
}

function main() {
  const current = readJson(currentPath);
  if (!current) {
    const failed = {
      generatedAt: new Date().toISOString(),
      status: "failed",
      reason: "missing_or_invalid_current_impact_index"
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(failed, null, 2)}\n`);
    console.error("Architecture impact delta report failed: missing current impact index.");
    process.exit(1);
  }

  const previous = readJson(snapshotPath);
  const currentRows = loadRowMap(current);
  const previousRows = loadRowMap(previous);
  const currentTop = topIds(current);
  const previousTop = topIds(previous);

  const allIds = new Set([...currentRows.keys(), ...previousRows.keys()]);
  const changed = [];
  for (const nodeId of allIds) {
    const now = currentRows.get(nodeId);
    const before = previousRows.get(nodeId);
    const delta = asNumber(now?.impact_score) - asNumber(before?.impact_score);
    if (delta === 0) continue;
    changed.push({
      node_id: nodeId,
      node_name: now?.node_name || before?.node_name || "",
      impact_score_before: asNumber(before?.impact_score),
      impact_score_after: asNumber(now?.impact_score),
      impact_score_delta: delta
    });
  }

  changed.sort((a, b) => Math.abs(b.impact_score_delta) - Math.abs(a.impact_score_delta));
  const topDelta = changed.slice(0, 25);

  const enteredTop = [...currentTop].filter((id) => !previousTop.has(id)).sort();
  const leftTop = [...previousTop].filter((id) => !currentTop.has(id)).sort();

  const report = {
    generatedAt: new Date().toISOString(),
    status: "passed",
    firstRun: !previous,
    summary: {
      changedNodes: changed.length,
      enteredTopCount: enteredTop.length,
      leftTopCount: leftTop.length
    },
    enteredTopNodes: enteredTop,
    leftTopNodes: leftTop,
    topImpactDelta: topDelta
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(current, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        firstRun: report.firstRun,
        changedNodes: report.summary.changedNodes,
        enteredTopCount: report.summary.enteredTopCount,
        leftTopCount: report.summary.leftTopCount
      },
      null,
      2
    )
  );
}

main();
