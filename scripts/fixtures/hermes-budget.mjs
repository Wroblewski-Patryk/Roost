import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { renderHermesBudgetProfile, hermesBudgetProfileBinding } from "../lib/agent-host-hermes-profile.mjs";
import { createOwnerAttestation } from "../lib/agent-host-hermes-owner-auth.mjs";
import { hermesStartupEnvironment } from "../lib/agent-host-hermes-startup.mjs";
import { prepareProviderInput, assertProviderStartup } from "../lib/agent-host-provider-input.mjs";
import { validPacketFixture, pinReadyFixture } from "./execution-packet.mjs";
import contract from "../lib/agent-host-provider-contract.cjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
export function budgetFixture(t, packetChange = () => {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-hermes-budget-test-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("roost-hermes-budget-test-"));
    rmSync(root, { recursive: true, force: true });
  });
  const home = path.join(root, "profile"), repositoryPath = path.join(root, "app"), install = path.join(root, "runtime");
  for (const dir of [home, repositoryPath, path.join(install, "venv", "Scripts")]) mkdirSync(dir, { recursive: true });
  const profile = hermesBudgetProfileBinding(path.join(home, "config.yaml"));
  writeFileSync(profile.profilePath, renderHermesBudgetProfile());
  const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
  writeFileSync(path.join(home, "owner-attestation.json"), owner.bytes);
  const provider = { kind: "hermes_codex", enabled: true, version: pin.version, commit: pin.commit, officialSource: pin.officialSource,
    executablePath: path.join(install, "venv", "Scripts", "hermes.exe"), profile, policy: structuredClone(contract.registry.hermesPolicy) };
  const f = validPacketFixture(); packetChange(f); pinReadyFixture(f);
  const startupEnvironment = hermesStartupEnvironment(profile, { SYSTEMROOT: process.env.SystemRoot ?? "C:\\Windows", PATH: "C:\\Windows\\System32" });
  const consumption = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() {}, provider, repositoryPath, startupEnvironment };
  const envelope = prepareProviderInput(consumption);
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const options = { provider, envelope, repositoryPath, startupEnvironment, sandbox: "workspace-write", platform: "win32" };
  const checked = assertProviderStartup(options);
  return { root, home, install, provider, f, envelope, consumption, options, checked };
}
