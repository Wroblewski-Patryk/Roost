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

async function main() {
  const apply = process.argv.includes("--apply");
  const localPreview = process.argv.includes("--local-preview");
  const requestedSlug = process.argv.find((argument) => argument.startsWith("--application="))?.split("=")[1];
  const baseUrl = process.env.ROOST_API_URL || "https://roost.luckysparrow.ch";
  const selectedRoots = Object.entries(applicationRoots).filter(([slug]) => !requestedSlug || slug === requestedSlug);
  if (requestedSlug && !selectedRoots.length) throw new Error(`Unsupported application: ${requestedSlug}`);
  if (localPreview) {
    const results = selectedRoots.map(([applicationSlug, root]) => {
      const files = canonicalFiles(assertApprovedRoot(root));
      if (!files.length) throw new Error(`No canonical documentation files found for ${applicationSlug}: ${root}`);
      const records = files.flatMap((file) => recordsForFile(root, file));
      const byType = Object.fromEntries([...new Set(records.map((record) => record.recordType))].sort().map((type) => [type, records.filter((record) => record.recordType === type).length]));
      return { application: applicationSlug, root, revision: revisionFor(root), files: files.length, records: records.length, byType, payloadBytes: Buffer.byteLength(JSON.stringify(records)) };
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
    const records = files.flatMap((file) => recordsForFile(root, file));
    const payload = {
      mode: apply ? "apply" : "preview",
      sourceSystem: "repository-docs-v1",
      sourceRoot: root.replace(/\\/g, "/"),
      sourceRevision: revisionFor(root),
      records
    };
    const response = await api<{ data: Record<string, unknown> }>(baseUrl, token, `/v1/product-engineering/applications/${application.id}/actions/import-documentation-context`, { method: "POST", body: JSON.stringify(payload) });
    results.push({ slug: application.slug, files: files.length, ...response.data });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", baseUrl, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
