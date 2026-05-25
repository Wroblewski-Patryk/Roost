import fs from "fs";
import path from "path";

const root = process.cwd();
const generatedDir = path.join(root, "docs/architecture/nodes/generated");
const reportPath = path.join(root, "docs/status/architecture-generated-node-frontmatter-report.json");

function slug(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const values = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || !line.includes(":")) continue;
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^"(.*)"$/, "$1");
    values[key] = value;
  }
  return values;
}

if (!fs.existsSync(generatedDir)) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason: "Missing docs/architecture/nodes/generated directory."
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const requiredKeys = ["id", "name", "type", "status", "verification_status"];
const files = fs.readdirSync(generatedDir).filter((name) => name.endsWith(".md"));
const issues = [];

for (const fileName of files) {
  const abs = path.join(generatedDir, fileName);
  const source = fs.readFileSync(abs, "utf8");
  const frontmatter = parseFrontmatter(source);
  if (!frontmatter) {
    issues.push({
      file: `docs/architecture/nodes/generated/${fileName}`,
      issue: "missing_frontmatter"
    });
    continue;
  }

  for (const key of requiredKeys) {
    if (!frontmatter[key]) {
      issues.push({
        file: `docs/architecture/nodes/generated/${fileName}`,
        issue: "missing_frontmatter_key",
        detail: key
      });
    }
  }

  const frontId = frontmatter.id || "";
  if (frontId) {
    const expected = `${slug(frontId)}.md`;
    if (expected !== fileName) {
      issues.push({
        file: `docs/architecture/nodes/generated/${fileName}`,
        issue: "filename_id_mismatch",
        detail: `expected ${expected} from id ${frontId}`
      });
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  status: issues.length ? "failed" : "passed",
  checkedFiles: files.length,
  issuesCount: issues.length,
  issues
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (issues.length) {
  console.error(`Architecture generated node frontmatter gate failed: ${issues.length} issue(s).`);
  for (const issue of issues.slice(0, 50)) {
    const detail = issue.detail ? ` (${issue.detail})` : "";
    console.error(`- ${issue.file}: ${issue.issue}${detail}`);
  }
  if (issues.length > 50) {
    console.error(`... and ${issues.length - 50} more`);
  }
  process.exit(1);
}

console.log(`Architecture generated node frontmatter gate passed: ${files.length} files checked.`);
