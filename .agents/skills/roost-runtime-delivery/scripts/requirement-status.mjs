export const EVIDENCE_STATUSES = [
  "działa",
  "częściowo działa",
  "brak",
  "wymaga konfiguracji",
  "wymaga testu",
  "nieocenione",
  "odroczone",
  "poza zakresem",
];

export const DECISIONS = ["accepted", "deferred", "rejected"];

function expectedAnchor(id) {
  return id?.replace(/^RF-PILOT-/, "RF-DEMOAPP-").toLowerCase();
}

export function parseRequirements(source) {
  return source.split(/\r?\n/).filter((line) => /^\| <a id="rf-/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const match = cells[0]?.match(/^<a id="(rf-[a-z]+-\d{3})"><\/a>(RF-[A-Z]+-\d{3})$/);
    return {
      id: match?.[2],
      anchorMatches: match?.[1] === expectedAnchor(match?.[2]),
      decision: cells[2],
      requirement: cells[3],
      columnCount: cells.length,
    };
  });
}

export function parseTraceability(source) {
  return source.split(/\r?\n/).filter((line) => /^\| \[RF-/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const match = cells[0]?.match(/^\[(RF-[A-Z]+-\d{3})\]\(([^)]+)\)$/);
    return {
      id: match?.[1],
      requirementLink: match?.[2],
      priority: cells[1],
      status: cells[2],
      evidence: cells[3],
      remaining: cells[4],
      columnCount: cells.length,
    };
  });
}

export function assessStatus(requirements, traceability) {
  const errors = [];
  const requirementMap = new Map();
  const traceabilityMap = new Map();
  for (const row of requirements) {
    if (row.columnCount !== 5 || !row.id || !row.anchorMatches || !DECISIONS.includes(row.decision) || !row.requirement) {
      errors.push(`invalid_requirement_row:${row.id ?? "unknown"}`);
    }
    if (requirementMap.has(row.id)) errors.push(`duplicate_requirement_id:${row.id}`);
    requirementMap.set(row.id, row);
  }
  for (const row of traceability) {
    if (row.columnCount !== 5 || !row.id || !row.requirementLink?.endsWith(`#${expectedAnchor(row.id)}`)
      || !/^P[012]$/.test(row.priority) || !EVIDENCE_STATUSES.includes(row.status)
      || !row.evidence || !row.remaining) {
      errors.push(`invalid_traceability_row:${row.id ?? "unknown"}`);
    }
    if (traceabilityMap.has(row.id)) errors.push(`duplicate_traceability_row:${row.id}`);
    traceabilityMap.set(row.id, row);
  }
  if (!requirements.length) errors.push("no_requirements_found");
  for (const id of requirementMap.keys()) if (!traceabilityMap.has(id)) errors.push(`missing_traceability:${id}`);
  for (const id of traceabilityMap.keys()) if (!requirementMap.has(id)) errors.push(`unknown_traceability:${id}`);
  const rows = [...requirementMap.values()].filter((row) => traceabilityMap.has(row.id)).map((row) => ({
    ...row,
    ...traceabilityMap.get(row.id),
    area: row.id.split("-")[1],
  }));
  return { errors, rows };
}
