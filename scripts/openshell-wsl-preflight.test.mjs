import test from "node:test";
import assert from "node:assert/strict";
import { classifyWslInventory, decodeWsl, probeOpenShellPrerequisites } from "./openshell-wsl-preflight.mjs";

const header = "  NAME                 STATE           VERSION\r\n";
test("WSL UTF-16 and UTF-8 inventories decode without leaking NUL characters", () => {
  const text = header + "* docker-desktop       Running         2\r\n";
  for (const encoding of ["utf16le", "utf8"]) assert.equal(decodeWsl(Buffer.from("\uFEFF" + text, encoding)), text);
});
test("Docker's managed distro is not a user WSL environment", () => {
  assert.deepEqual(classifyWslInventory(header + "* docker-desktop       Running         2\n  docker-desktop-data  Stopped         2"),
    { internal: 2, userV1: 0, userV2: 0, gate: "blocked", reason: "user_wsl2_distribution_missing" });
});
test("WSL 1 cannot satisfy the WSL 2 gate", () => {
  assert.equal(classifyWslInventory(header + "  Ubuntu               Stopped         1").gate, "blocked");
});
test("a stopped user WSL 2 distro only allows further checks, never GO or execution", () => {
  const result = classifyWslInventory(header + "  Ubuntu               Stopped         2");
  assert.equal(result.gate, "further_checks_required");
  assert.equal(result.reason, "docker_integration_and_sandbox_evidence_required");
  assert.equal(JSON.stringify(result).includes("Ubuntu"), false);
});
test("missing and malformed inventory fail closed", () => {
  for (const text of ["", header, header + "invalid", header + "  Ubuntu  Running  3"]) assert.throws(() => classifyWslInventory(text));
});
test("probe runs only inventory/version commands, never Docker workload operations", () => {
  const calls = [];
  const result = probeOpenShellPrerequisites({ platform: "win32", run(command, args) {
    calls.push([command, args]);
    if (command === "docker.exe") return Buffer.from("Docker version 29.7.2, build a7dcaa6");
    return Buffer.from(args[0] === "--list" ? header + "* docker-desktop       Running         2" : "WSL version: 2.5.9.0", "utf16le");
  } });
  assert.deepEqual(calls, [["wsl.exe", ["--list", "--verbose"]], ["wsl.exe", ["--version"]], ["docker.exe", ["--version"]]]);
  assert.equal(result.gate, "blocked");
  assert.equal(result.dockerDaemonQueried, false);
  assert.equal(result.executionAdmission, false);
});
test("failed commands and unsupported platform expose only fixed blocker codes", () => {
  assert.deepEqual(probeOpenShellPrerequisites({ platform: "linux" }), { gate: "blocked", reason: "windows_route_only" });
  const result = probeOpenShellPrerequisites({ platform: "win32", run() { throw Error("private-path-sentinel"); } });
  assert.deepEqual(result, { gate: "blocked", reason: "prerequisite_probe_failed" });
});
