import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type ImportRecord = {
  sourceId: string;
  parentSourceId?: string;
  recordType: "architecture_document" | "application_goal" | "architecture_principle" | "architecture_requirement" | "architecture_decision" | "architecture_layer" | "architecture_component" | "architecture_section";
  title: string;
  description?: string;
  filePath: string;
  headingPath: string[];
};
type CsvRow = Record<string, string>;
type ArchitectureImport = {
  sourceId: string;
  parentSourceId?: string;
  type: "frontend" | "backend" | "database" | "orm" | "cache" | "queue" | "realtime" | "authentication" | "storage" | "deployment" | "hosting" | "ci_cd" | "external_service" | "other";
  name: string;
  description?: string;
  atomType: string;
  layer: string;
  module?: string;
  feature?: string;
  completionPercent: number;
  verificationStatus?: string;
  riskLevel?: string;
  filePath?: string;
  relations: Array<{ targetSourceId: string; type: string; status?: string; description?: string }>;
};

const applicationRoots: Record<string, string> = {
  aviary: "C:/Personal/Projekty/Aplikacje/Aviary",
  featherly: "C:/Personal/Projekty/Aplikacje/Featherly",
  nest: "C:/Personal/Projekty/Aplikacje/Nest",
  roost: "C:/Personal/Projekty/Aplikacje/Roost",
  soar: "C:/Personal/Projekty/Aplikacje/Soar"
};
const approvedApplicationsRoot = path.resolve("C:/Personal/Projekty/Aplikacje");

function assertApprovedRoot(root: string) {
  const resolved = path.resolve(root);
  if (resolved !== approvedApplicationsRoot && !resolved.startsWith(`${approvedApplicationsRoot}${path.sep}`)) throw new Error(`Application root is outside the approved workspace: ${resolved}`);
  return resolved;
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

function parseCsv(source: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  if (value.length || row.length) { row.push(value); rows.push(row); }
  const [headers, ...data] = rows;
  return headers ? data.map((cells) => Object.fromEntries(headers.map((header, index) => [header.trim(), (cells[index] ?? "").trim()]))) : [];
}

function splitIds(value?: string) {
  return (value || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

function componentType(row: CsvRow): ArchitectureImport["type"] {
  const type = row.type.toLowerCase();
  const layer = row.layer.toLowerCase();
  if (type.includes("database") || type === "model" || layer === "data") return "database";
  if (type.includes("auth")) return "authentication";
  if (type.includes("queue")) return "queue";
  if (type.includes("cache")) return "cache";
  if (type.includes("storage")) return "storage";
  if (type.includes("realtime") || type.includes("websocket")) return "realtime";
  if (layer === "frontend" || ["page", "component", "ui_element"].includes(type)) return "frontend";
  if (layer === "backend" || ["api_route", "service", "worker"].includes(type)) return "backend";
  if (layer === "ci") return "ci_cd";
  if (["deployment", "operations"].includes(layer)) return "deployment";
  if (type.includes("external")) return "external_service";
  return "other";
}

function registryFor(applicationSlug: string, root: string): { sourceSystem: string; architecture: ArchitectureImport[] } | null {
  const nodesPath = path.join(root, "docs", "architecture", "registry", "nodes.csv");
  if (!fs.existsSync(nodesPath)) return null;
  const relationCandidates = applicationSlug === "soar"
    ? [path.join(root, "docs", "architecture", "relations", "dependencies.csv")]
    : [path.join(root, "docs", "architecture", "registry", "relations.csv"), path.join(root, "docs", "architecture", "registry", "dependencies.csv")];
  const nodeRows = parseCsv(fs.readFileSync(nodesPath, "utf8")).filter((row) => row.id && row.name && !(applicationSlug === "soar" && row.type === "feature"));
  const nodeIds = new Set(nodeRows.map((row) => row.id));
  const relationsBySource = new Map<string, ArchitectureImport["relations"]>();
  for (const relationPath of relationCandidates.filter((candidate) => fs.existsSync(candidate))) {
    for (const relation of parseCsv(fs.readFileSync(relationPath, "utf8"))) {
      if (!nodeIds.has(relation.source_id) || !nodeIds.has(relation.target_id)) continue;
      const rows = relationsBySource.get(relation.source_id) ?? [];
      if (!rows.some((row) => row.targetSourceId === relation.target_id && row.type === (relation.relation_type || "relates_to"))) {
        rows.push({ targetSourceId: relation.target_id, type: relation.relation_type || "relates_to", status: relation.status || undefined, description: relation.description || undefined });
      }
      relationsBySource.set(relation.source_id, rows);
    }
  }
  for (const row of nodeRows) {
    const relations = relationsBySource.get(row.id) ?? [];
    for (const targetSourceId of splitIds(row.depends_on)) {
      if (nodeIds.has(targetSourceId) && !relations.some((relation) => relation.targetSourceId === targetSourceId && relation.type === "depends_on")) relations.push({ targetSourceId, type: "depends_on", status: row.verification_status || row.status || undefined, description: "Dependency declared by the architecture registry node." });
    }
    relationsBySource.set(row.id, relations);
  }
  const architecture = nodeRows.map<ArchitectureImport>((row) => ({
    sourceId: row.id,
    parentSourceId: nodeIds.has(row.parent_id) ? row.parent_id : undefined,
    type: componentType(row),
    name: row.name,
    description: row.description || undefined,
    atomType: row.type || "component",
    layer: row.layer || "other",
    module: row.module || undefined,
    feature: row.feature || undefined,
    completionPercent: Math.max(0, Math.min(100, Number(row.completion_percent) || 0)),
    verificationStatus: row.verification_status || row.status || undefined,
    riskLevel: row.risk_level || undefined,
    filePath: row.file_path || undefined,
    relations: relationsBySource.get(row.id) ?? []
  }));
  return { sourceSystem: `${applicationSlug}-architecture-registry`, architecture };
}

function canonicalFiles(root: string) {
  const files = new Set<string>();
  for (const relative of ["docs/README.md", "docs/product/product.md"]) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) files.add(candidate);
  }
  const architectureRoot = path.join(root, "docs", "architecture");
  if (fs.existsSync(architectureRoot)) {
    for (const entry of fs.readdirSync(architectureRoot, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.add(path.join(architectureRoot, entry.name));
    }
  }
  return [...files].sort();
}

function classify(relativePath: string, heading: string): ImportRecord["recordType"] {
  const value = heading.toLowerCase();
  if (/\b(goal|goals|primary outcome|vision|mission|product intent|system definition)\b/.test(value)) return "application_goal";
  if (/\b(principle|principles|invariant|invariants|guardrail|guardrails|non-negotiable|rules)\b/.test(value)) return "architecture_principle";
  if (/\b(requirement|requirements|constraint|constraints|must)\b/.test(value)) return "architecture_requirement";
  if (/\b(decision|decisions|boundary|boundaries|ownership|source of truth)\b/.test(value)) return "architecture_decision";
  if (/\b(layer|layers|topology|runtime shape|system architecture)\b/.test(value)) return "architecture_layer";
  if (/\b(component|components|module|modules|service|services)\b/.test(value)) return "architecture_component";
  return "architecture_section";
}

function compactMarkdown(value: string) {
  return value
    .replace(/^```[\s\S]*?^```/gm, "[Code example retained in source document]")
    .replace(/^\s*<!--.*?-->\s*$/gm, "")
    .trim()
    .slice(0, 10000);
}

function recordsForFile(root: string, filePath: string): ImportRecord[] {
  const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    return match ? [{ level: match[1].length, title: match[2].replace(/\s+#+$/, "").trim(), line: index }] : [];
  });
  const documentTitle = headings[0]?.title || path.basename(filePath, ".md");
  const documentSourceId = `file:${relativePath}`;
  const documentBodyStart = headings[0] ? headings[0].line + 1 : 0;
  const documentBodyEnd = headings[1]?.line ?? lines.length;
  const documentBody = compactMarkdown(lines.slice(documentBodyStart, documentBodyEnd).join("\n"));
  const result: ImportRecord[] = [{
    sourceId: documentSourceId,
    recordType: "architecture_document",
    title: documentTitle,
    description: documentBody || `Canonical repository documentation: ${relativePath}`,
    filePath: relativePath,
    headingPath: [documentTitle]
  }];
  const stack: Array<{ level: number; sourceId: string; title: string }> = [];
  const occurrences = new Map<string, number>();
  headings.forEach((heading, index) => {
    if (index === 0 && heading.line === headings[0]?.line) return;
    while (stack.length && stack[stack.length - 1]!.level >= heading.level) stack.pop();
    const base = `${documentSourceId}#${slug(heading.title)}`;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    const sourceId = occurrence === 1 ? base : `${base}-${occurrence}`;
    const nextLine = headings[index + 1]?.line ?? lines.length;
    const description = compactMarkdown(lines.slice(heading.line + 1, nextLine).join("\n"));
    result.push({
      sourceId,
      parentSourceId: stack[stack.length - 1]?.sourceId ?? documentSourceId,
      recordType: classify(relativePath, heading.title),
      title: heading.title.slice(0, 240),
      description: description || undefined,
      filePath: relativePath,
      headingPath: [documentTitle, ...stack.map((item) => item.title), heading.title].slice(-12)
    });
    stack.push({ level: heading.level, sourceId, title: heading.title });
  });
  return result;
}

function revisionFor(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

async function api<T>(baseUrl: string, token: string, pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${pathname}: ${JSON.stringify(body)}`);
  return body as T;
}

function batches<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function aggregateImportResults(results: Array<Record<string, unknown>>) {
  const numeric = (key: string) => results.reduce((sum, result) => sum + (typeof result[key] === "number" ? result[key] as number : 0), 0);
  return {
    mode: results[0]?.mode,
    sourceSystem: results[0]?.sourceSystem,
    sourceRoot: results[0]?.sourceRoot,
    batches: results.length,
    recordCount: numeric("recordCount"),
    architectureCount: numeric("architectureCount"),
    createCount: numeric("createCount"),
    updateCount: numeric("updateCount"),
    deleteCount: numeric("deleteCount")
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const localPreview = process.argv.includes("--local-preview");
  const documentsOnly = process.argv.includes("--documents-only");
  const architectureOnly = process.argv.includes("--architecture-only");
  if (documentsOnly && architectureOnly) throw new Error("Choose either --documents-only or --architecture-only.");
  const requestedSlug = process.argv.find((argument) => argument.startsWith("--application="))?.split("=")[1];
  const baseUrl = process.env.ROOST_API_URL || "https://roost.luckysparrow.ch";
  const selectedRoots = Object.entries(applicationRoots).filter(([slug]) => !requestedSlug || slug === requestedSlug);
  if (requestedSlug && !selectedRoots.length) throw new Error(`Unsupported application: ${requestedSlug}`);
  if (localPreview) {
    const results = selectedRoots.map(([applicationSlug, root]) => {
      const files = canonicalFiles(assertApprovedRoot(root));
      if (!files.length) throw new Error(`No canonical documentation files found for ${applicationSlug}: ${root}`);
      const records = architectureOnly ? [] : files.flatMap((file) => recordsForFile(root, file));
      const registry = documentsOnly ? null : registryFor(applicationSlug, root);
      const byType = Object.fromEntries([...new Set(records.map((record) => record.recordType))].sort().map((type) => [type, records.filter((record) => record.recordType === type).length]));
      return { application: applicationSlug, root, revision: revisionFor(root), files: files.length, records: records.length, byType, architectureAtoms: registry?.architecture.length ?? 0, architectureRelations: registry?.architecture.reduce((sum, component) => sum + component.relations.length, 0) ?? 0, payloadBytes: Buffer.byteLength(JSON.stringify({ records, architecture: registry?.architecture ?? [] })) };
    });
    console.log(JSON.stringify({ mode: "local-preview", results }, null, 2));
    return;
  }
  const token = process.env.ROOST_API_TOKEN;
  if (!token) throw new Error("ROOST_API_TOKEN is required. Use a workspace-scoped API token; the token is never written to disk.");
  const applicationResponse = await api<{ data: Array<{ id: string; slug: string; name: string; metadata?: unknown }> }>(baseUrl, token, "/v1/product-engineering/applications");
  const applications = applicationResponse.data
    .filter((application) => applicationRoots[application.slug] && (!requestedSlug || application.slug === requestedSlug))
    .map((application) => {
      const metadata = application.metadata && typeof application.metadata === "object" && !Array.isArray(application.metadata) ? application.metadata as Record<string, unknown> : {};
      const configuredRoot = typeof metadata.localWorkspaceRoot === "string" && typeof metadata.localDirectory === "string"
        ? path.resolve(metadata.localWorkspaceRoot, metadata.localDirectory)
        : applicationRoots[application.slug]!;
      return { ...application, root: assertApprovedRoot(configuredRoot) };
    });
  if (requestedSlug && !applications.length) throw new Error(`Registered application not found or unsupported: ${requestedSlug}`);

  const results = [];
  for (const application of applications) {
    const root = application.root;
    const files = canonicalFiles(root);
    if (!files.length) throw new Error(`No canonical documentation files found for ${application.slug}: ${root}`);
    const records = architectureOnly ? [] : files.flatMap((file) => recordsForFile(root, file));
    const documentationPayload = {
      mode: apply ? "apply" : "preview",
      sourceSystem: "repository-docs-v1",
      sourceRoot: root.replace(/\\/g, "/"),
      sourceRevision: revisionFor(root),
      records
    };
    const documentationResponses: Array<Record<string, unknown>> = [];
    if (!architectureOnly) {
      const documentationBatches = apply ? batches(records, 150) : [records];
      for (const recordBatch of documentationBatches) {
        const response = await api<{ data: Record<string, unknown> }>(baseUrl, token, `/v1/product-engineering/applications/${application.id}/actions/import-documentation-context`, { method: "POST", body: JSON.stringify({ ...documentationPayload, records: recordBatch }) });
        documentationResponses.push(response.data);
      }
    }
    const registry = documentsOnly ? null : registryFor(application.slug, root);
    const registryResponse = registry?.architecture.length ? await api<{ data: Record<string, unknown> }>(baseUrl, token, `/v1/product-engineering/applications/${application.id}/actions/import-documentation-context`, {
      method: "POST",
      body: JSON.stringify({ mode: apply ? "apply" : "preview", sourceSystem: registry.sourceSystem, sourceRoot: root.replace(/\\/g, "/"), sourceRevision: revisionFor(root), architecture: registry.architecture })
    }) : null;
    results.push({ slug: application.slug, files: files.length, documentation: documentationResponses.length ? aggregateImportResults(documentationResponses) : null, architecture: registryResponse?.data ?? null });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", baseUrl, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
