import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === "\"") quoted = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function loadCsv(relativePath) {
  const rows = parseCsv(readText(relativePath));
  const header = rows[0];
  const records = rows.slice(1).map((values) => {
    const out = {};
    header.forEach((name, idx) => {
      out[name] = values[idx] ?? "";
    });
    return out;
  });
  return records;
}

function main() {
  const features = loadCsv("docs/architecture/nodes/features.csv");
  const apiRoutes = loadCsv("docs/architecture/nodes/api_routes.csv");
  const chains = loadCsv("docs/architecture/chains/chains.csv");

  const chainByFeature = new Map(chains.map((c) => [c.feature_id, c]));
  const requiredFeatures = features.filter((feature) => (
    apiRoutes.some((api) => api.parent_id === feature.id)
  ));

  const covered = [];
  const missing = [];
  for (const feature of requiredFeatures) {
    const chain = chainByFeature.get(feature.id);
    if (!chain) {
      missing.push({
        feature_id: feature.id,
        feature_name: feature.name,
        module: feature.module,
        reason: "Feature has API routes but no chain."
      });
      continue;
    }
    covered.push({
      feature_id: feature.id,
      feature_name: feature.name,
      module: feature.module,
      chain_id: chain.id,
      chain_status: chain.verification_status || chain.status || ""
    });
  }

  const total = requiredFeatures.length;
  const coveredCount = covered.length;
  const coveragePercent = total ? Math.round((coveredCount / total) * 10000) / 100 : 100;

  const report = {
    checkedAt: new Date().toISOString(),
    totalRequiredFeatures: total,
    coveredFeatures: coveredCount,
    missingFeatures: missing.length,
    coveragePercent,
    covered,
    missing
  };

  writeText("docs/status/architecture-chain-coverage-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (missing.length > 0) {
    console.error(`Architecture chain coverage gate failed: ${missing.length} feature(s) with API routes have no chain.`);
    process.exit(1);
  }

  console.log(`Architecture chain coverage gate passed: ${coveredCount}/${total} features covered (${coveragePercent}%).`);
}

main();
