import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
const fail = code => { throw new Error(code); };
const normalize = name => name.toLowerCase().replace(/[-_.]+/g, "-");
function csv(text) {
  const rows = []; let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(value); value = ""; }
    else if (c === "\n" && !quoted) { row.push(value.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += c;
  }
  if (quoted) fail("hermes_record_csv_invalid");
  if (row.length || value) { row.push(value); rows.push(row); }
  return rows;
}
export function verifyHermesDistributions(venv, expected) {
  const site = path.join(venv, "Lib", "site-packages"), names = new Map(), owned = new Set(); let records = 0, hashed = 0;
  const wanted = new Map(expected.map(d => [normalize(d.name), d.version]));
  if (wanted.size !== expected.length) fail("hermes_distribution_expected_invalid");
  for (const dir of readdirSync(site).filter(n => n.endsWith(".dist-info"))) {
    const info = path.join(site, dir), metadata = readFileSync(path.join(info, "METADATA"), "utf8");
    const name = normalize(/^Name: (.+)$/m.exec(metadata)?.[1]?.trim() ?? ""), version = /^Version: (.+)$/m.exec(metadata)?.[1]?.trim();
    if (!name || names.has(name) || wanted.get(name) !== version || ["boto3", "botocore", "jmespath", "s3transfer"].includes(name))
      throw Object.assign(new Error("hermes_distribution_closure_changed"), { distribution: /^[a-z0-9-]{1,80}$/.test(name) ? name : "invalid", installedVersion: /^[a-zA-Z0-9.+-]{1,40}$/.test(version ?? "") ? version : "invalid", expectedVersion: wanted.get(name) ?? "absent" });
    names.set(name, version);
    for (const row of csv(readFileSync(path.join(info, "RECORD"), "utf8"))) {
      // Some pinned Windows wheels (including jiter) serialize native separators.
      // Normalize before resolving, then enforce the same physical venv boundary.
      const recordPath = row[0].replaceAll("\\", "/");
      if (row.length !== 3 || path.isAbsolute(recordPath) || recordPath.includes(":")) fail("hermes_record_path_invalid");
      const target = path.resolve(site, recordPath), rel = path.relative(venv, target);
      if (rel.startsWith("..") || path.isAbsolute(rel)) fail("hermes_record_path_invalid");
      for (let current = target; current !== venv; current = path.dirname(current)) if (lstatSync(current).isSymbolicLink()) fail("hermes_record_path_invalid");
      if (realpathSync.native(target).toLowerCase() !== target.toLowerCase() || !lstatSync(target).isFile()) fail("hermes_record_path_invalid");
      const bytes = readFileSync(target); records++; owned.add(rel.replaceAll("\\", "/"));
      if (!row[1] && !row[2] && (target === path.join(info, "RECORD") || target.endsWith(".pyc"))) continue;
      const [algorithm, digest] = row[1].split("=");
      if (algorithm !== "sha256" || !/^\d+$/.test(row[2]) || bytes.length !== Number(row[2])
          || createHash("sha256").update(bytes).digest("base64url") !== digest) fail("hermes_record_integrity_changed");
      hashed++;
    }
  }
  if (names.size !== wanted.size) throw Object.assign(new Error("hermes_distribution_closure_changed"), { missing: [...wanted.keys()].filter(n => !names.has(n)) });
  return { distributions: [...names].sort().map(([name, version]) => ({ name, version })), recordRows: records, hashedRows: hashed, owned };
}
