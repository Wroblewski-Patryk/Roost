import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsPath = path.join(root, "docs");
const altDocsPath = path.join(root, "Roost - docs");

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureJunctionOnWindows(targetPath) {
  if (process.platform !== "win32") return false;
  try {
    fs.symlinkSync(targetPath, docsPath, "junction");
    return true;
  } catch {
    return false;
  }
}

function ensureSymlinkOnUnix(targetPath) {
  if (process.platform === "win32") return false;
  try {
    fs.symlinkSync(targetPath, docsPath, "dir");
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (isDirectory(docsPath)) {
    console.log("Architecture docs preflight: docs root available.");
    return;
  }

  if (!isDirectory(altDocsPath)) {
    console.error(
      "Architecture docs preflight failed: neither 'docs/' nor 'Roost - docs/' exists."
    );
    process.exit(1);
  }

  if (exists(docsPath)) {
    console.error(
      "Architecture docs preflight failed: 'docs' exists but is not a directory."
    );
    process.exit(1);
  }

  const linked =
    ensureJunctionOnWindows(altDocsPath) || ensureSymlinkOnUnix(altDocsPath);

  if (!linked || !isDirectory(docsPath)) {
    console.error(
      "Architecture docs preflight failed: could not create docs alias to 'Roost - docs'."
    );
    process.exit(1);
  }

  console.log("Architecture docs preflight: created docs alias to 'Roost - docs'.");
}

main();
