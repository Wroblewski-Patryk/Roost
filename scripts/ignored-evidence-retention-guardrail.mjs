import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST_NAME = ".retention.json";
const MAX_MANIFEST_BYTES = 16 * 1024;
const RETENTION_STATES = new Set(["quarantine", "retain"]);
const DEFAULT_THRESHOLDS = Object.freeze({
  maxAgeHours: 7 * 24,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxFiles: 10_000
});

export class GuardrailError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GuardrailError";
    this.code = code;
  }
}

function portablePath(value) {
  return value.replaceAll("\\", "/");
}

function comparablePath(value) {
  const normalized = path.normalize(path.resolve(value));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function parsePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new GuardrailError("invalid_configuration", `${label} must be a non-negative number.`);
  }
  return parsed;
}

function parseNow(value) {
  const now = value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(now.getTime())) {
    throw new GuardrailError("invalid_configuration", "now must be a valid ISO-8601 timestamp.");
  }
  return now;
}

export function validateEvidenceRoots(repoRoot) {
  if (!path.isAbsolute(repoRoot)) {
    throw new GuardrailError("invalid_root", "Repository root must be absolute.");
  }
  const resolvedRepoRoot = path.resolve(repoRoot);
  const roots = [".tmp", "tmp"].map((name) => path.resolve(resolvedRepoRoot, name));
  for (const root of roots) {
    const relative = path.relative(resolvedRepoRoot, root);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || ![".tmp", "tmp"].includes(relative)) {
      throw new GuardrailError("invalid_root", `Evidence root escaped the repository: ${portablePath(root)}`);
    }
  }
  return roots;
}

async function lstatOrMissing(target) {
  try {
    return await lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new GuardrailError("enumeration_failed", `Could not inspect ${portablePath(target)}: ${error.message}`);
  }
}

async function refuseReparsePoint(target, stats) {
  if (stats.isSymbolicLink()) {
    throw new GuardrailError("reparse_point_refused", `Refusing to traverse reparse point: ${portablePath(target)}`);
  }
  let resolved;
  try {
    resolved = await realpath(target);
  } catch (error) {
    throw new GuardrailError("enumeration_failed", `Could not resolve ${portablePath(target)}: ${error.message}`);
  }
  if (comparablePath(resolved) !== comparablePath(target)) {
    throw new GuardrailError("reparse_point_refused", `Refusing redirected filesystem entry: ${portablePath(target)}`);
  }
}

async function listDirectory(target) {
  try {
    return (await readdir(target, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name, "en"));
  } catch (error) {
    throw new GuardrailError("enumeration_failed", `Could not enumerate ${portablePath(target)}: ${error.message}`);
  }
}

async function readManifest(manifestPath, stats) {
  if (!stats.isFile()) return { error: `${MANIFEST_NAME} must be a regular file.` };
  if (stats.size > MAX_MANIFEST_BYTES) return { error: `${MANIFEST_NAME} exceeds ${MAX_MANIFEST_BYTES} bytes.` };
  try {
    const value = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return { error: `${MANIFEST_NAME} must contain a JSON object.` };
    }
    return { value };
  } catch (error) {
    return { error: `${MANIFEST_NAME} is not valid JSON.` };
  }
}

function emptyTotals() {
  return { fileCount: 0, totalBytes: 0, oldestMtimeMs: null };
}

function addFile(totals, stats) {
  totals.fileCount += 1;
  totals.totalBytes += stats.size;
  totals.oldestMtimeMs = totals.oldestMtimeMs === null ? stats.mtimeMs : Math.min(totals.oldestMtimeMs, stats.mtimeMs);
}

async function inventoryDirectory(directory, totals, options = {}) {
  for (const entry of await listDirectory(directory)) {
    const target = path.join(directory, entry.name);
    const stats = await lstatOrMissing(target);
    if (!stats) throw new GuardrailError("enumeration_failed", `Entry disappeared during inventory: ${portablePath(target)}`);
    await refuseReparsePoint(target, stats);
    if (stats.isDirectory()) {
      await inventoryDirectory(target, totals);
    } else if (stats.isFile()) {
      if (!(options.skipDirectManifest && entry.name === MANIFEST_NAME)) addFile(totals, stats);
    } else {
      throw new GuardrailError("unsupported_entry", `Refusing unsupported filesystem entry: ${portablePath(target)}`);
    }
  }
}

function manifestFindings(bundleName, manifestResult, now) {
  const findings = [];
  const manifest = manifestResult?.value ?? null;
  const add = (code, detail) => findings.push({ bundle: bundleName, code, detail });

  if (manifestResult?.error) add("invalid_manifest", manifestResult.error);
  if (!manifest || typeof manifest.owner !== "string" || !manifest.owner.trim()) {
    add("missing_owner", "Name an accountable owner in .retention.json.");
  }
  if (!manifest || typeof manifest.issueId !== "string" || !/^[A-Z][A-Z0-9]+-\d+$/.test(manifest.issueId)) {
    add("missing_issue", "Add a valid issueId such as LUC-2729 to .retention.json.");
  }
  if (!manifest || !RETENTION_STATES.has(manifest.state)) {
    add("missing_retention_state", "Set state to quarantine or retain in .retention.json.");
  }

  const expiresAt = manifest?.expiresAt;
  const expiresMs = typeof expiresAt === "string" ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresMs)) {
    add("missing_expiry", "Add a valid ISO-8601 expiresAt value to .retention.json.");
  } else if (expiresMs <= now.getTime()) {
    add("retention_expired", `Retention expired at ${new Date(expiresMs).toISOString()}.`);
  }

  return {
    findings,
    metadata: manifest
      ? {
          owner: typeof manifest.owner === "string" && manifest.owner.trim() ? manifest.owner.trim() : null,
          issueId: typeof manifest.issueId === "string" ? manifest.issueId : null,
          state: RETENTION_STATES.has(manifest.state) ? manifest.state : null,
          expiresAt: Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null
        }
      : { owner: null, issueId: null, state: null, expiresAt: null }
  };
}

async function inventoryBundle(root, entry, now, maxAgeHours) {
  const target = path.join(root, entry.name);
  const stats = await lstatOrMissing(target);
  if (!stats) throw new GuardrailError("enumeration_failed", `Entry disappeared during inventory: ${portablePath(target)}`);
  await refuseReparsePoint(target, stats);

  const totals = emptyTotals();
  let manifestResult = null;
  if (stats.isDirectory()) {
    const manifestPath = path.join(target, MANIFEST_NAME);
    const manifestStats = await lstatOrMissing(manifestPath);
    if (manifestStats) {
      await refuseReparsePoint(manifestPath, manifestStats);
      manifestResult = await readManifest(manifestPath, manifestStats);
    }
    await inventoryDirectory(target, totals, { skipDirectManifest: true });
  } else if (stats.isFile()) {
    addFile(totals, stats);
  } else {
    throw new GuardrailError("unsupported_entry", `Refusing unsupported filesystem entry: ${portablePath(target)}`);
  }

  const oldestAgeHours = totals.oldestMtimeMs === null ? 0 : Math.max(0, (now.getTime() - totals.oldestMtimeMs) / 3_600_000);
  const metadataResult = manifestFindings(entry.name, manifestResult, now);
  const findings = [...metadataResult.findings];
  if (oldestAgeHours > maxAgeHours) {
    findings.push({
      bundle: entry.name,
      code: "age_threshold_exceeded",
      detail: `Oldest evidence is ${oldestAgeHours.toFixed(2)} hours old; limit is ${maxAgeHours}.`
    });
  }

  return {
    name: entry.name,
    kind: stats.isDirectory() ? "directory" : "file",
    fileCount: totals.fileCount,
    totalBytes: totals.totalBytes,
    oldestAgeHours: Number(oldestAgeHours.toFixed(2)),
    metadata: metadataResult.metadata,
    findings
  };
}

async function inventoryRoot(root, repoRoot, now, thresholds) {
  const relativeRoot = portablePath(path.relative(repoRoot, root));
  const stats = await lstatOrMissing(root);
  if (!stats) {
    return {
      root: portablePath(root), relativeRoot, exists: false,
      fileCount: 0, totalBytes: 0, oldestAgeHours: 0,
      bundles: [], findings: []
    };
  }
  await refuseReparsePoint(root, stats);
  if (!stats.isDirectory()) {
    throw new GuardrailError("invalid_root", `Evidence root is not a directory: ${portablePath(root)}`);
  }

  const bundles = [];
  for (const entry of await listDirectory(root)) {
    bundles.push(await inventoryBundle(root, entry, now, thresholds.maxAgeHours));
  }
  const fileCount = bundles.reduce((sum, bundle) => sum + bundle.fileCount, 0);
  const totalBytes = bundles.reduce((sum, bundle) => sum + bundle.totalBytes, 0);
  const oldestAgeHours = bundles.reduce((oldest, bundle) => Math.max(oldest, bundle.oldestAgeHours), 0);
  const findings = bundles.flatMap((bundle) => bundle.findings);
  if (fileCount > thresholds.maxFiles) {
    findings.push({
      bundle: null,
      code: "file_count_threshold_exceeded",
      detail: `${fileCount} evidence files exceed the root limit of ${thresholds.maxFiles}.`
    });
  }
  if (totalBytes > thresholds.maxTotalBytes) {
    findings.push({
      bundle: null,
      code: "total_bytes_threshold_exceeded",
      detail: `${totalBytes} evidence bytes exceed the root limit of ${thresholds.maxTotalBytes}.`
    });
  }

  return {
    root: portablePath(root), relativeRoot, exists: true,
    fileCount, totalBytes, oldestAgeHours, bundles, findings
  };
}

export async function runGuardrail({
  repoRoot,
  now: nowValue,
  maxAgeHours = DEFAULT_THRESHOLDS.maxAgeHours,
  maxTotalBytes = DEFAULT_THRESHOLDS.maxTotalBytes,
  maxFiles = DEFAULT_THRESHOLDS.maxFiles
}) {
  const now = parseNow(nowValue);
  const thresholds = {
    maxAgeHours: parsePositiveNumber(maxAgeHours, "maxAgeHours"),
    maxTotalBytes: parsePositiveNumber(maxTotalBytes, "maxTotalBytes"),
    maxFiles: parsePositiveNumber(maxFiles, "maxFiles")
  };
  const resolvedRepoRoot = path.resolve(repoRoot);
  const roots = [];
  for (const root of validateEvidenceRoots(repoRoot)) {
    roots.push(await inventoryRoot(root, resolvedRepoRoot, now, thresholds));
  }
  const findingCount = roots.reduce((sum, root) => sum + root.findings.length, 0);
  const status = findingCount === 0 ? "ok" : "signal";

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    repositoryRoot: portablePath(resolvedRepoRoot),
    status,
    thresholds,
    totals: {
      rootsPresent: roots.filter((root) => root.exists).length,
      fileCount: roots.reduce((sum, root) => sum + root.fileCount, 0),
      totalBytes: roots.reduce((sum, root) => sum + root.totalBytes, 0),
      findingCount
    },
    nextOwner: status === "ok" ? null : "Owner named by each manifest, otherwise the Roost operator",
    nextAction: status === "ok"
      ? null
      : "Review signalled bundles, create or update accountable retention metadata, and obtain governed cleanup confirmation before any deletion or move.",
    roots
  };
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (!["--now", "--max-age-hours", "--max-total-bytes", "--max-files"].includes(argument) || value === undefined) {
      throw new GuardrailError("invalid_configuration", `Unknown or incomplete argument: ${argument}`);
    }
    index += 1;
    if (argument === "--now") options.now = value;
    if (argument === "--max-age-hours") options.maxAgeHours = value;
    if (argument === "--max-total-bytes") options.maxTotalBytes = value;
    if (argument === "--max-files") options.maxFiles = value;
  }
  return options;
}

async function main() {
  const scriptPath = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const result = await runGuardrail({ repoRoot, ...parseArguments(process.argv.slice(2)) });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "ok" ? 0 : 2;
  } catch (error) {
    const guardedError = error instanceof GuardrailError
      ? error
      : new GuardrailError("unexpected_failure", error instanceof Error ? error.message : String(error));
    console.error(JSON.stringify({
      schemaVersion: 1,
      status: "error",
      error: { code: guardedError.code, message: guardedError.message },
      nextOwner: "Roost operator",
      nextAction: "Resolve the inventory or reparse-point error before relying on retention status; do not clean evidence while the guardrail is incomplete."
    }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
