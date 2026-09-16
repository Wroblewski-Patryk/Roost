import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validPacketFixture, pinReadyFixture } from "./execution-packet.mjs";
import { hermesNativeProfileBinding, renderHermesNativeProfile } from "../lib/agent-host-hermes-profile.mjs";
import { createOwnerAttestation } from "../lib/agent-host-hermes-owner-auth.mjs";
import { hermesStartupEnvironment } from "../lib/agent-host-hermes-startup.mjs";
import { acquireWriterLock } from "../lib/agent-host-writer-lock.mjs";
import { prepareProviderInput, assertProviderStartup, assertProviderNativeBoundary, abandonProviderNativeBoundary } from "../lib/agent-host-provider-input.mjs";
import contract from "../lib/agent-host-provider-contract.cjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
export async function nativeFixture(t, { edit = () => {}, dirty = false, runtime = false, observer = () => [], prepare = true, executablePath } = {}) {
  const root = mkdtempSync(path.join(realpathSync(os.tmpdir()), "roost-native-boundary-test-"));
  let writerLock, envelope;
  t.after(async () => {
    try { if (envelope) abandonProviderNativeBoundary(envelope); } catch { /* owned fixture reconciliation */ }
    if (writerLock) await writerLock.release();
    assert.equal(path.dirname(path.resolve(root)), realpathSync(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("roost-native-boundary-test-"));
    rmSync(root, { recursive: true, force: true });
  });
  const home = path.join(root, "profile"), apps = path.join(root, "apps"), repositoryPath = path.join(apps, "app");
  const install = path.join(root, "runtime"), state = path.join(root, "state");
  for (const dir of [home, repositoryPath, path.join(install, "venv", "Scripts")]) mkdirSync(dir, { recursive: true });
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=", ...args], { cwd: repositoryPath, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
  const f = validPacketFixture();
  git("init"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid");
  git("config", "core.autocrlf", "false");
  writeFileSync(path.join(repositoryPath, "editable.txt"), "base\n"); writeFileSync(path.join(repositoryPath, "unrelated.txt"), "original\n");
  git("add", "editable.txt", "unrelated.txt"); git("commit", "-m", "fixture");
  git("branch", "-m", f.packet.contract.singleTask.branch);
  git("remote", "add", "origin", f.claimed.application.repositories[0].url);
  const head = git("rev-parse", "HEAD");
  if (dirty) writeFileSync(path.join(repositoryPath, "unrelated.txt"), "pre-existing dirty\n");
  f.packet.contract.nativeBoundary = { profile: "coding-local", writePaths: ["editable.txt", "output"], runtime: { required: runtime, ports: runtime ? [43127] : [] } };
  edit(f); pinReadyFixture(f);
  f.taskContext.readyAdmission.riskAdmission.commit = head;
  f.claimed.metadata.readyContextPin.riskAdmissionCommit = head;
  const profile = hermesNativeProfileBinding(path.join(home, "config.yaml")); writeFileSync(profile.profilePath, renderHermesNativeProfile());
  const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
  writeFileSync(path.join(home, "owner-attestation.json"), owner.bytes);
  const provider = { kind: "hermes_codex", enabled: true, version: pin.version, commit: pin.commit, officialSource: pin.officialSource,
    executablePath: executablePath ?? path.join(install, "venv", "Scripts", "hermes.exe"), profile, policy: structuredClone(contract.registry.hermesPolicy) };
  writerLock = await acquireWriterLock(state);
  const environment = hermesStartupEnvironment(profile, { SYSTEMROOT: process.env.SystemRoot ?? "C:\\Windows" }, repositoryPath);
  const options = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: head, assertAuthority() {}, provider, repositoryPath, startupEnvironment: environment,
    nativeBoundaryOptions: { writerLock, applicationObserver: observer, expected: { head, branch: f.packet.contract.singleTask.branch, origin: f.claimed.application.repositories[0].url } } };
  if (prepare) envelope = prepareProviderInput(options);
  const projection = envelope && { provider, envelope, repositoryPath, startupEnvironment: environment, sandbox: "workspace-write", platform: "win32" };
  return { root, home, apps, repositoryPath, install, state, git, f, provider, writerLock, options, envelope, projection,
    checked: envelope && assertProviderStartup(projection), receipt: envelope && assertProviderNativeBoundary(envelope) };
}
