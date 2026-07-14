import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve(process.cwd(), "scripts/check-architecture-health-dashboard-gate.mjs");

type GateReport = {
  generatedAt: string;
  status: "passed" | "failed";
  reason?: string;
  allGreen?: boolean;
  expectedAllGreen?: boolean;
  evidenceQueue?: number;
  chainWorklist?: number;
  chainCoverage?: string;
  roadmapStatus?: string;
};

type ScriptResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  report: GateReport;
};

function writeJson(root: string, relativePath: string, payload: unknown) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(root: string, relativePath: string, contents: string) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents);
}

async function runGateFixture(
  options: {
    dashboardPayload?: unknown;
    dashboardText?: string;
  } = {}
): Promise<ScriptResult> {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "architecture-health-dashboard-gate-"));

  if (options.dashboardText !== undefined) {
    writeText(fixtureRoot, "docs/status/architecture-health-dashboard.json", options.dashboardText);
  } else if (options.dashboardPayload !== undefined) {
    writeJson(fixtureRoot, "docs/status/architecture-health-dashboard.json", options.dashboardPayload);
  }

  const child = spawn(process.execPath, [scriptPath], {
    cwd: fixtureRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  const reportPath = path.join(fixtureRoot, "docs", "status", "architecture-health-dashboard-gate-report.json");
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as GateReport;

  rmSync(fixtureRoot, { recursive: true, force: true });

  return { exitCode, stdout, stderr, report };
}

test("check-architecture-health-dashboard-gate passes for a coherent green dashboard payload", async () => {
  const result = await runGateFixture({
    dashboardPayload: {
      generatedAt: "2026-07-14T07:08:41.300Z",
      allGreen: true,
      evidenceQueue: 0,
      chainCoverageCovered: 7,
      chainCoverageTotal: 7,
      chainIntegrityIssues: 0,
      nodeIntegrityIssues: 0,
      relationIntegrityIssues: 0,
      connectivityIssues: 0,
      deadNodes: 0,
      roadmapStatus: "GREEN",
      chainWorklistTotal: 0
    }
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.stderr, "");
  assert.equal(result.report.status, "passed");
  assert.equal(result.report.allGreen, true);
  assert.equal(result.report.expectedAllGreen, true);
  assert.equal(result.report.chainCoverage, "7/7");
  assert.match(result.stdout, /Architecture health dashboard gate passed: allGreen=true\./);
});

test("check-architecture-health-dashboard-gate fails closed when dashboard JSON is malformed", async () => {
  const result = await runGateFixture({
    dashboardText: "{ invalid json\n"
  });

  assert.equal(result.exitCode, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.stdout, "");
  assert.equal(result.report.status, "failed");
  assert.equal(result.report.reason, "missing_or_invalid_dashboard_json");
  assert.match(result.stderr, /Architecture health dashboard gate failed: missing_or_invalid_dashboard_json/);
});

test("check-architecture-health-dashboard-gate fails when allGreen does not match the invariant", async () => {
  const result = await runGateFixture({
    dashboardPayload: {
      generatedAt: "2026-07-14T07:08:41.300Z",
      allGreen: true,
      evidenceQueue: 2,
      chainCoverageCovered: 6,
      chainCoverageTotal: 7,
      chainIntegrityIssues: 1,
      nodeIntegrityIssues: 0,
      relationIntegrityIssues: 0,
      connectivityIssues: 0,
      deadNodes: 0,
      roadmapStatus: "YELLOW",
      chainWorklistTotal: 3
    }
  });

  assert.equal(result.exitCode, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.stdout, "");
  assert.equal(result.report.status, "failed");
  assert.equal(result.report.reason, "all_green_invariant_mismatch");
  assert.equal(result.report.allGreen, true);
  assert.equal(result.report.expectedAllGreen, false);
  assert.match(result.stderr, /Architecture health dashboard gate failed: all_green_invariant_mismatch/);
});
