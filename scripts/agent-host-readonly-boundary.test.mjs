import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { collectReadOnlyRepositoryEvidence, qualifyHermesReadOnlyTools } from "./lib/agent-host-readonly-boundary.mjs";
import { prepareProviderInput, abandonProviderNativeBoundary } from "./lib/agent-host-provider-input.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
const blocked = reason => error => {
  assert.equal(error.message, "readonly_boundary_unproven");
  assert.equal(error.protocolAdmission, true);
  assert.deepEqual(error.details, { reason });
  assert.equal(JSON.stringify(error.details).includes("SYNTHETIC_PRIVATE"), false);
  return true;
};

async function fixture(t, scenario = "current") {
  const x = await nativeFixture(t, { prepare: false });
  for (const relative of ["toolsets.py", "model_tools.py", "cli.py", "agent/agent_init.py", "agent/coding_context.py", "hermes_cli/oneshot.py"]) {
    const file = path.join(x.install, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "# closed fixture source\n");
  }
  let tcpCalls = 0, dockerCalls = 0;
  const original = childProcess.execFileSync;
  const timeout = () => Object.assign(Error("SYNTHETIC_PRIVATE output and path"), { code: "ETIMEDOUT" });
  childProcess.execFileSync = (command, args, options) => {
    if (command === "powershell" && args?.at(-1)?.startsWith("Get-NetTCPConnection -State Listen")) {
      tcpCalls += 1;
      if (scenario === "tcp_timeout") throw timeout();
      return scenario === "process_changed" && tcpCalls > 1 ? "changed_fixture_listener\n" : "fixture_listener\n";
    }
    if (command === "docker" && args?.[0] === "ps") {
      dockerCalls += 1;
      if (scenario === "docker_timeout") throw timeout();
      return scenario === "docker_changed" && dockerCalls > 1 ? "changed_fixture_container\n" : "";
    }
    if (options?.cwd === x.install && command === "git") {
      if (args.includes("rev-parse")) {
        if (scenario === "source_pin_timeout") throw timeout();
        return scenario === "source_commit_changed" ? "b".repeat(40) : x.provider.commit;
      }
      if (scenario === "source_changed") throw Object.assign(Error("SYNTHETIC_PRIVATE git output"), { status: 1 });
      return "";
    }
    if (command === path.join(x.install, "venv", "Scripts", "python.exe")) {
      if (scenario === "qualification_timeout") throw timeout();
      if (scenario === "qualification_unavailable") throw Error("SYNTHETIC_PRIVATE Python output");
      if (scenario === "seal_repository_changed") fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "BASE\n");
      return scenario === "qualification_output" ? "SYNTHETIC_PRIVATE unexpected output" : "[[], []]\n";
    }
    const output = original(command, args, options);
    if (scenario === "repository_changed" && options?.cwd === x.repositoryPath && args?.includes("ls-files"))
      fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "BASE\n");
    return output;
  };
  syncBuiltinESMExports();
  return { ...x, collect: () => collectReadOnlyRepositoryEvidence({ repositoryPath: x.repositoryPath,
    expected: x.options.nativeBoundaryOptions.expected, paths: ["editable.txt"] }),
    restore() { childProcess.execFileSync = original; syncBuiltinESMExports(); } };
}

test("read-only collection returns bounded evidence from an unchanged physical repository", windows, async t => {
  const x = await fixture(t);
  try { const evidence = x.collect(); assert.equal(evidence.head, x.options.currentCommit); assert.equal(evidence.files[0].content, "base\n"); }
  finally { x.restore(); }
});

for (const [scenario, reason] of Object.entries({ tcp_timeout: "tcp_observation_timeout", docker_timeout: "docker_observation_timeout",
  process_changed: "process_changed", docker_changed: "docker_changed", repository_changed: "repository_changed" })) {
  test(`collection preserves ${reason} instead of replacing it with unproven`, windows, async t => {
    const x = await fixture(t, scenario);
    try { assert.throws(x.collect, blocked(reason)); }
    finally { x.restore(); }
  });
}

for (const [scenario, reason] of Object.entries({ source_pin_timeout: "tool_source_pin_timeout", source_commit_changed: "tool_source_commit_changed",
  source_changed: "tool_source_changed", qualification_timeout: "tool_qualification_timeout",
  qualification_unavailable: "tool_qualification_unavailable", qualification_output: "tool_qualification_output_invalid" })) {
  test(`tool qualification reports ${reason} without raw command output`, windows, async t => {
    const x = await fixture(t, scenario);
    try { assert.throws(() => qualifyHermesReadOnlyTools(x.provider, x.options.startupEnvironment), blocked(reason)); }
    finally { x.restore(); }
  });
}

for (const [scenario, reason] of Object.entries({ qualification_timeout: "tool_qualification_timeout", seal_repository_changed: "repository_changed" })) {
  test(`opaque read-only sealing preserves nested ${reason}`, windows, async t => {
    const x = await fixture(t, scenario), c = x.f.packet.contract;
    c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["editable.txt"], runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" } };
    c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
    x.f.packet.procedureComposition.fields.tools = ["repository_read"];
    pinReadyFixture(x.f);
    x.f.taskContext.readyAdmission.riskAdmission.commit = x.options.currentCommit;
    x.f.claimed.metadata.readyContextPin.riskAdmissionCommit = x.options.currentCommit;
    let envelope;
    try {
      const evidence = x.collect();
      assert.throws(() => { envelope = prepareProviderInput({ ...x.options, repositoryEvidence: evidence }); }, blocked(reason));
    } finally {
      if (envelope) abandonProviderNativeBoundary(envelope);
      x.restore();
    }
  });
}
