import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  unlink,
  utimes,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GuardrailError,
  runGuardrail,
  validateEvidenceRoots
} from "./ignored-evidence-retention-guardrail.mjs";

const fixtureParent = path.resolve(
  process.env.ROOST_GUARDRAIL_TEST_TMP || path.dirname(fileURLToPath(import.meta.url))
);

async function makeFixture(prefix = "roost-retention-guardrail-") {
  const repoRoot = await mkdtemp(path.join(fixtureParent, prefix));
  await mkdir(path.join(repoRoot, ".tmp"));
  await mkdir(path.join(repoRoot, "tmp"));
  return repoRoot;
}

async function removeFixture(target, prefix) {
  const resolved = path.resolve(target);
  if (path.dirname(resolved) !== fixtureParent || !path.basename(resolved).startsWith(prefix)) {
    throw new Error(`Refusing unexpected fixture cleanup target: ${resolved}`);
  }
  await rm(resolved, { recursive: true, force: true });
}

async function testDeterministicSignals() {
  const prefix = "roost-retention-guardrail-";
  const repoRoot = await makeFixture(prefix);
  try {
    const bundle = path.join(repoRoot, ".tmp", "bundle-a");
    await mkdir(bundle);
    const evidence = path.join(bundle, "evidence.bin");
    await writeFile(evidence, Buffer.alloc(10));
    await utimes(evidence, new Date("2026-01-01T00:00:00.000Z"), new Date("2026-01-01T00:00:00.000Z"));
    await writeFile(path.join(bundle, ".retention.json"), JSON.stringify({
      owner: "Roost Project Manager",
      issueId: "LUC-2729",
      state: "quarantine",
      expiresAt: "2026-01-05T00:00:00.000Z"
    }));
    await writeFile(path.join(repoRoot, "tmp", "loose.txt"), "abc");

    const options = {
      repoRoot,
      now: "2026-01-10T00:00:00.000Z",
      maxAgeHours: 24,
      maxTotalBytes: 0,
      maxFiles: 0
    };
    const first = await runGuardrail(options);
    const second = await runGuardrail(options);

    assert.deepEqual(second, first);
    assert.equal(first.status, "signal");
    assert.equal(first.totals.fileCount, 2);
    assert.equal(first.totals.totalBytes, 13);
    assert.equal(first.roots[0].bundles[0].oldestAgeHours, 216);
    assert.deepEqual(first.roots[0].bundles[0].metadata, {
      owner: "Roost Project Manager",
      issueId: "LUC-2729",
      state: "quarantine",
      expiresAt: "2026-01-05T00:00:00.000Z"
    });

    const codes = first.roots.flatMap((root) => root.findings.map((finding) => finding.code));
    for (const code of [
      "age_threshold_exceeded",
      "file_count_threshold_exceeded",
      "missing_expiry",
      "missing_issue",
      "missing_owner",
      "missing_retention_state",
      "retention_expired",
      "total_bytes_threshold_exceeded"
    ]) {
      assert.ok(codes.includes(code), `expected finding ${code}`);
    }
  } finally {
    await removeFixture(repoRoot, prefix);
  }
}

async function testAbsentRoot() {
  const prefix = "roost-retention-guardrail-";
  const repoRoot = await makeFixture(prefix);
  try {
    await rm(path.join(repoRoot, "tmp"), { recursive: true });
    const result = await runGuardrail({ repoRoot, now: "2026-01-10T00:00:00.000Z" });
    assert.equal(result.status, "ok");
    assert.equal(result.roots[1].exists, false);
    assert.equal(result.totals.fileCount, 0);
  } finally {
    await removeFixture(repoRoot, prefix);
  }
}

async function testReparseRefusal() {
  const repoPrefix = "roost-retention-guardrail-";
  const externalPrefix = "roost-retention-external-";
  const repoRoot = await makeFixture(repoPrefix);
  const external = await mkdtemp(path.join(fixtureParent, externalPrefix));
  const linkPath = path.join(repoRoot, ".tmp", "redirected");
  let linked = false;
  try {
    await writeFile(path.join(external, "must-not-be-read.txt"), "content");
    try {
      await symlink(external, linkPath, process.platform === "win32" ? "junction" : "dir");
      linked = true;
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error?.code)) return "skipped";
      throw error;
    }

    await assert.rejects(
      () => runGuardrail({ repoRoot, now: "2026-01-10T00:00:00.000Z" }),
      (error) => error instanceof GuardrailError && error.code === "reparse_point_refused"
    );
    return "passed";
  } finally {
    if (linked) await unlink(linkPath);
    await removeFixture(repoRoot, repoPrefix);
    await removeFixture(external, externalPrefix);
  }
}

function testAbsoluteRootValidation() {
  assert.throws(
    () => validateEvidenceRoots("relative-roost"),
    (error) => error instanceof GuardrailError && error.code === "invalid_root"
  );
}

const results = [];
try {
  await testDeterministicSignals();
  results.push({ name: "deterministic metadata and thresholds", status: "passed" });
  await testAbsentRoot();
  results.push({ name: "absent root is not created", status: "passed" });
  results.push({ name: "reparse refusal", status: await testReparseRefusal() });
  testAbsoluteRootValidation();
  results.push({ name: "absolute root validation", status: "passed" });
  console.log(JSON.stringify({ status: "passed", tests: results }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
