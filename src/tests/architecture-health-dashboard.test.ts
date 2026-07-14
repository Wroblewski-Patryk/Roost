import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve(process.cwd(), "scripts/build-architecture-health-dashboard.mjs");

type DashboardPayload = {
  generatedAt: string;
  allGreen: boolean;
  evidenceQueue: number;
  chainCoverageCovered: number;
  chainCoverageTotal: number;
  chainIntegrityIssues: number;
  nodeIntegrityIssues: number;
  relationIntegrityIssues: number;
  connectivityIssues: number;
  deadNodes: number;
  roadmapStatus: string;
  chainWorklistTotal: number;
  delta: {
    nodes: number;
    relations: number;
    chains: number;
    evidenceQueue: number;
  } | null;
  graph: {
    nodes: number;
    relations: number;
    chains: number;
  };
};

type ScriptResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  json: DashboardPayload;
  markdown: string;
};

function writeJson(root: string, relativePath: string, payload: unknown) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function runDashboardFixture(
  files: Array<{ path: string; payload: unknown }>
): Promise<ScriptResult> {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "architecture-health-dashboard-"));

  for (const file of files) {
    writeJson(fixtureRoot, file.path, file.payload);
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

  const jsonPath = path.join(fixtureRoot, "docs", "status", "architecture-health-dashboard.json");
  const markdownPath = path.join(fixtureRoot, "docs", "status", "architecture-health-dashboard.md");
  const json = JSON.parse(readFileSync(jsonPath, "utf8")) as DashboardPayload;
  const markdown = readFileSync(markdownPath, "utf8");

  rmSync(fixtureRoot, { recursive: true, force: true });

  return { exitCode, stdout, stderr, json, markdown };
}

test("build-architecture-health-dashboard reports a green dashboard from coherent source reports", async () => {
  const result = await runDashboardFixture([
    {
      path: "docs/status/architecture-evidence-enrichment-report.json",
      payload: { queueCount: 0 }
    },
    {
      path: "docs/status/architecture-chain-coverage-report.json",
      payload: { missingFeatures: 0, totalRequiredFeatures: 7, coveredFeatures: 7 }
    },
    {
      path: "docs/status/architecture-chain-integrity-report.json",
      payload: { issues: 0 }
    },
    {
      path: "docs/status/architecture-node-integrity-report.json",
      payload: { issues: 0 }
    },
    {
      path: "docs/status/architecture-relation-integrity-report.json",
      payload: { issues: 0 }
    },
    {
      path: "docs/status/architecture-connectivity-report.json",
      payload: { issues: 0 }
    },
    {
      path: "docs/status/architecture-dead-nodes-report.json",
      payload: { deadCount: 0 }
    },
    {
      path: "docs/status/architecture-roadmap.json",
      payload: { status: "GREEN" }
    },
    {
      path: "docs/status/architecture-delta-report.json",
      payload: { delta: { nodes: 3, relations: 4, chains: 1, evidenceQueue: -2 } }
    },
    {
      path: "docs/status/architecture-chain-hardening-worklist-summary.json",
      payload: { total: 0 }
    },
    {
      path: "docs/graphs/project-graph.json",
      payload: {
        nodes: [{ id: "n1" }, { id: "n2" }],
        relations: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
        chains: [{ id: "c1" }]
      }
    }
  ]);

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.stderr, "");
  assert.equal(result.json.allGreen, true);
  assert.equal(result.json.evidenceQueue, 0);
  assert.equal(result.json.chainCoverageCovered, 7);
  assert.equal(result.json.chainCoverageTotal, 7);
  assert.equal(result.json.roadmapStatus, "GREEN");
  assert.deepEqual(result.json.delta, { nodes: 3, relations: 4, chains: 1, evidenceQueue: -2 });
  assert.deepEqual(result.json.graph, { nodes: 2, relations: 3, chains: 1 });
  assert.match(result.stdout, /"allGreen": true/);
  assert.match(result.markdown, /- Overall: PASS/);
  assert.match(result.markdown, /- Chain Coverage Complete: PASS \(7\/7\)/);
  assert.match(result.markdown, /- Nodes delta: 3/);
  assert.match(result.markdown, /- Evidence queue delta: -2/);
});

test("build-architecture-health-dashboard fails closed in output when reports contain issues and missing sources", async () => {
  const result = await runDashboardFixture([
    {
      path: "docs/status/architecture-evidence-enrichment-report.json",
      payload: { queueCount: 5 }
    },
    {
      path: "docs/status/architecture-chain-coverage-report.json",
      payload: { missingFeatures: 2, totalRequiredFeatures: 7, coveredFeatures: 5 }
    },
    {
      path: "docs/status/architecture-chain-integrity-report.json",
      payload: { issues: 3 }
    },
    {
      path: "docs/status/architecture-node-integrity-report.json",
      payload: { issues: 1 }
    },
    {
      path: "docs/status/architecture-relation-integrity-report.json",
      payload: { issues: 4 }
    },
    {
      path: "docs/status/architecture-connectivity-report.json",
      payload: { issues: 2 }
    },
    {
      path: "docs/status/architecture-dead-nodes-report.json",
      payload: { deadCount: 6 }
    },
    {
      path: "docs/status/architecture-chain-hardening-worklist-summary.json",
      payload: { total: 9 }
    },
    {
      path: "docs/graphs/project-graph.json",
      payload: {
        nodes: [{ id: "n1" }],
        edges: [{ id: "r1" }, { id: "r2" }],
        chains: []
      }
    }
  ]);

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.stderr, "");
  assert.equal(result.json.allGreen, false);
  assert.equal(result.json.roadmapStatus, "UNKNOWN");
  assert.equal(result.json.delta, null);
  assert.deepEqual(result.json.graph, { nodes: 1, relations: 2, chains: 0 });
  assert.match(result.stdout, /"allGreen": false/);
  assert.match(result.markdown, /- Overall: FAIL/);
  assert.match(result.markdown, /- Evidence Queue Empty: FAIL \(queueCount=5\)/);
  assert.match(result.markdown, /- Chain Hardening Worklist Empty: FAIL \(total=9\)/);
  assert.match(result.markdown, /- Roadmap Status: UNKNOWN/);
  assert.match(result.markdown, /- Nodes delta: n\/a/);
  assert.match(result.markdown, /- `docs\/status\/architecture-roadmap\.json`/);
});
