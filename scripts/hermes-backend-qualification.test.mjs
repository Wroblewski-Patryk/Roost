import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compareSnapshots, diagnosticEnvironment, fingerprint, publicIdentities,
  sanitizeIdentity, sharingCriteria, sharingDecision } from "./lib/hermes-backend-qualification.mjs";

const fixture = () => ({ schemaVersion: "roost-hermes-backend-identity-v1", result: "measured",
  mechanism: "isolated_no_site_source_import", pythonVersion: "3.13.1", interpreter: "venv/Scripts/python.exe",
  moduleOrigin: "hermes_cli/__init__.py", moduleVersion: "0.21.2", metadataVersion: "0.21.2",
  distributions: [{ path: "venv/Lib/site-packages/hermes_agent-0.21.2.dist-info", version: "0.21.2" }],
  entrypoint: "hermes_cli.main:main", mainImported: false, siteHooksExecuted: false, protocolQualified: false });

test("identity result cannot smuggle paths, extra data or runtime/protocol claims", () => {
  assert.equal(sanitizeIdentity(JSON.stringify(fixture())).result, "measured");
  for (const edit of [r => r.raw = "private", r => r.moduleOrigin = "C:/Private/source/__init__.py",
    r => r.protocolQualified = true, r => r.mainImported = true, r => r.moduleVersion = "0.21.3",
    r => r.distributions[0].path = "../../auth.json", r => r.entrypoint = "unknown:run"]) {
    const r = fixture(); edit(r); assert.throws(() => sanitizeIdentity(JSON.stringify(r)), /^Error: identity_result_invalid$/);
  }
  assert.throws(() => sanitizeIdentity(" ".repeat(8193)), /identity_result_invalid/);
});
test("environment drops credentials, PATH, PYTHONPATH and profile selectors", () => {
  const env = diagnosticEnvironment("synthetic-home", { SystemRoot: "C:/Windows", PATH: "untrusted", PYTHONPATH: "untrusted", API_KEY: "secret", HERMES_HOME: "managed", HERMES_PROFILE: "pilot" });
  for (const key of ["PATH", "PYTHONPATH", "API_KEY", "HERMES_PROFILE"]) assert.equal(env[key], undefined);
  assert.equal(env.HERMES_HOME, "synthetic-home"); assert.equal(env.HERMES_DISABLE_LAZY_INSTALLS, "1");
});
test("one missing criterion always selects separate runtimes; no result authorizes launch", () => {
  const all = Object.fromEntries(sharingCriteria.map(k => [k, true]));
  for (const key of sharingCriteria) {
    assert.equal(sharingDecision({ ...all, [key]: false }).runtimeDecision, "separate_existing_runtimes");
    assert.equal(sharingDecision({ ...all, [key]: "true" }).runtimeDecision, "separate_existing_runtimes");
  }
  assert.equal(sharingDecision(all).launchAuthorized, false);
});
test("snapshot comparison distinguishes missing, changes, and physical replacement", async () => {
  const parent = await fs.realpath(os.tmpdir()), dir = await fs.mkdtemp(path.join(parent, "roost-identity-test-"));
  try {
    const file = path.join(dir, "synthetic.txt"); await fs.writeFile(file, "before");
    const before = { view: "managed", name: "synthetic.txt", ...await fingerprint(file) };
    assert.equal(compareSnapshots([before], [before])[0].state, "SAME");
    assert.equal(compareSnapshots([before], [{ ...before, fileId: "replacement" }])[0].state, "CHANGED");
    await fs.writeFile(file, "after");
    assert.equal(compareSnapshots([before], [{ ...before, ...await fingerprint(file) }])[0].state, "CHANGED");
    const missing = { view: "desktop", name: "missing", ...await fingerprint(path.join(dir, "missing")) };
    assert.equal(compareSnapshots([missing], [missing])[0].state, "MISSING_BEFORE");
    assert.equal(compareSnapshots([before], [])[0].state, "MISSING_AFTER");
    assert.equal(compareSnapshots([], [before])[0].state, "CHANGED");
    assert.equal(JSON.stringify(publicIdentities([before])).includes(dir), false);
  } finally {
    assert.equal(path.dirname(dir), parent); assert.equal(await fs.realpath(dir), dir);
    await fs.rm(dir, { recursive: true });
  }
});
test("Python audit contract denies synthetic side effects without importing installed Hermes", () => {
  execFileSync("python", ["-I", "-S", "-B", fileURLToPath(new URL("./test_hermes_backend_identity_probe.py", import.meta.url))],
    { timeout: 10000, windowsHide: true, stdio: "pipe" });
});
