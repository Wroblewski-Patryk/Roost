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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
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
  return { header, records };
}

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const record of records) {
    lines.push(header.map((name) => csvEscape(record[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinUnique(values) {
  return [...new Set(values.filter(Boolean))].join(";");
}

function nextChainId(records) {
  const nums = records
    .map((r) => String(r.id || ""))
    .filter((id) => id.startsWith("CHAIN-AUTO-"))
    .map((id) => Number(id.replace("CHAIN-AUTO-", "")))
    .filter((n) => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `CHAIN-AUTO-${String(n).padStart(4, "0")}`;
}

function featureSlug(value) {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function main() {
  const features = loadCsv("docs/architecture/nodes/features.csv").records;
  const apiRoutes = loadCsv("docs/architecture/nodes/api_routes.csv").records;
  const pages = loadCsv("docs/architecture/nodes/pages.csv").records;
  const tests = loadCsv("docs/architecture/nodes/tests.csv").records;
  const docsRows = loadCsv("docs/architecture/nodes/docs.csv").records;
  const chainsCsv = loadCsv("docs/architecture/chains/chains.csv");

  const existingFeatureChains = new Set(chainsCsv.records.map((r) => r.feature_id));
  const existingIds = new Set(chainsCsv.records.map((r) => r.id));

  let added = 0;
  const created = [];
  for (const feature of features) {
    if (!feature.id || existingFeatureChains.has(feature.id)) continue;

    const featureApis = apiRoutes.filter((api) => api.parent_id === feature.id);
    if (!featureApis.length) continue;

    const featurePages = pages.filter((page) => page.parent_id === feature.id);
    const featureTests = tests.filter((test) => test.parent_id === feature.id || String(test.feature) === String(feature.feature));
    const featureDocs = docsRows.filter((doc) => doc.parent_id === feature.id);
    const featureTestIds = splitIds(feature.tests_related);
    const featureDocIds = splitIds(feature.docs_related);

    const entry = featurePages[0]?.id || featureApis[0]?.id;
    const exit = featureTests[0]?.id || featureApis[featureApis.length - 1]?.id;
    const dbIds = [...new Set(featureApis.flatMap((api) => splitIds(api.database_related)))];

    const sequence = [
      ...(entry ? [entry] : []),
      ...featureApis.map((api) => api.id),
      ...dbIds,
      ...(exit ? [exit] : [])
    ];

    let id = nextChainId(chainsCsv.records);
    while (existingIds.has(id)) {
      id = nextChainId([...chainsCsv.records, { id }]);
    }

    const chain = {
      id,
      name: `${feature.name || feature.feature || feature.id} auto chain`,
      feature_id: feature.id,
      status: "implemented",
      entry_node_id: entry || "",
      exit_node_id: exit || "",
      node_sequence: sequence.join(">"),
      missing_nodes: "deep_link_enrichment_required",
      tests: joinUnique([...featureTests.map((t) => t.id), ...featureTestIds]),
      docs: joinUnique([...featureDocs.map((d) => d.id), ...featureDocIds]),
      risk_level: feature.risk_level || "medium",
      last_verified_at: "",
      verification_status: "partial",
      notes: "Auto-generated chain scaffold from feature/API/page/test/doc links.",
      tags: `#chain #auto #${featureSlug(feature.feature || feature.id)}`
    };

    chainsCsv.records.push(chain);
    existingFeatureChains.add(feature.id);
    existingIds.add(id);
    created.push(id);
    added += 1;
  }

  writeText("docs/architecture/chains/chains.csv", toCsv(chainsCsv.header, chainsCsv.records));
  const report = {
    synchronizedAt: new Date().toISOString(),
    added,
    created
  };
  writeText("docs/status/architecture-chain-sync-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
