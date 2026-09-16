// B22 diagnostic regressions only. No installed provider, real state, grants or
// model execution. Known defects are recorded, not repaired by this test file.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync } from "node:fs";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { hermesStartupEnvironment } from "./lib/agent-host-hermes-startup.mjs";
import { hermesNativeProfileVersion } from "./lib/agent-host-hermes-profile.mjs";
import { nativeDigest, nativeRelative, physicalIdentity, nativeFootprintPolicy,
  createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { qualifyNativeReconciliation } from "./lib/agent-host-native-reconciliation.mjs";

const binding = { schemaVersion: hermesNativeProfileVersion, profilePath: path.resolve("synthetic-profile/config.yaml") };
const repository = path.resolve("synthetic-repository");
const environment = source => hermesStartupEnvironment(binding, Object.defineProperties(
  process.env.SystemRoot ? { SYSTEMROOT: process.env.SystemRoot } : {}, Object.getOwnPropertyDescriptors(source)), repository);
const cache = "%SystemDrive%/ProgramData/Microsoft/Windows/Caches";

test("B22 relative-token reproduction remains; B23 repairs the Worker SystemDrive omission", () => {
  const drive = process.platform === "win32" ? process.env.SystemRoot.slice(0, 2).toUpperCase() : undefined;
  const env = environment({ ...(drive ? { SystemDrive: drive } : {}), TEMP: "D:\\SyntheticTemp" });
  assert.equal(env.TEMP, "D:\\SyntheticTemp");
  assert.equal(env.SYSTEMDRIVE, drive);
  // An unresolved percent token is a relative Windows path; this does not prove
  // which native component expanded it or wrote the real B21 files.
  assert.equal(path.win32.isAbsolute(cache), false);
  assert.equal(path.win32.resolve("D:\\SyntheticRepository", cache),
    "D:\\SyntheticRepository\\%SystemDrive%\\ProgramData\\Microsoft\\Windows\\Caches");
  assert.equal(path.win32.isAbsolute(cache.replace("%SystemDrive%", "D:")), true);
});

test("B22 state routing and feature guards are distinct from OS environment completeness", () => {
  const env = environment({ HOME: "D:\\SyntheticHome", USERPROFILE: "D:\\SyntheticUser",
    APPDATA: "D:\\SyntheticRoaming", LOCALAPPDATA: "D:\\SyntheticLocal", XDG_CACHE_HOME: "D:\\SyntheticCache" });
  assert.equal(env.HERMES_HOME, path.dirname(binding.profilePath));
  assert.equal(env.HERMES_WRITE_SAFE_ROOT, repository);
  assert.equal(env.HERMES_SAFE_MODE, "1");
  assert.equal(env.HERMES_DISABLE_LAZY_INSTALLS, "1");
  assert.equal(env.PYTHONDONTWRITEBYTECODE, "1");
  assert.equal(env.XDG_CACHE_HOME, undefined);
  assert.equal(env.HOME, "D:\\SyntheticHome");
  assert.equal(env.USERPROFILE, "D:\\SyntheticUser");
  assert.equal(env.APPDATA, "D:\\SyntheticRoaming");
  assert.equal(env.LOCALAPPDATA, "D:\\SyntheticLocal");
});

test("B22 environment selector still rejects ambiguous plumbing and excludes secret values", () => {
  assert.throws(() => environment({ HOME: "synthetic", home: "duplicate" }), /environment_invalid/);
  const source = { SYSTEMROOT: process.env.SystemRoot ?? "D:\\Windows" };
  Object.defineProperty(source, "SYNTHETIC_TOKEN", { enumerable: true, get() { throw Error("secret value read"); } });
  assert.equal(environment(source).SYNTHETIC_TOKEN, undefined);
});

function realEnvelopeIdentity() {
  const f = validPacketFixture();
  return prepareProviderInput({ fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext },
    claimed: f.claimed, currentCommit: "a".repeat(40), assertAuthority() {} }).identity;
}
function reviewProjection(identity) {
  // Read the actual production projection so the reproducer follows its order.
  const source = readFileSync(new URL("./lib/agent-host-native-review.mjs", import.meta.url), "utf8");
  const match = source.match(/identity: Object\.fromEntries\((\[[^\]]+\])\.map\(k => \[k, envelope\.identity\[k\]\]\)\)/);
  assert.ok(match, "review projection changed; update the diagnostic");
  return Object.fromEntries(JSON.parse(match[1]).map(k => [k, identity[k]]));
}

test("B22 real sealed identity and review projection have equal values but different spent digests", () => {
  const identity = realEnvelopeIdentity(), projected = reviewProjection(identity);
  assert.deepEqual(identity, projected);
  assert.notEqual(nativeDigest(identity), nativeDigest(projected));
  const canonical = Object.fromEntries(Object.keys(projected).sort().map(k => [k, projected[k]]));
  assert.equal(nativeDigest(identity), nativeDigest(canonical));
  assert.notEqual(nativeDigest(identity), nativeDigest({ ...canonical, attempt: 2 }));
});

function syntheticReview(t, { originalSerialization = true, badSignature = false } = {}) {
  const attempt = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt);
  const root = inspectNativeOwnedTemp(proof, attempt).root;
  t.after(() => { cleanupNativeOwnedTemp(proof, attempt); assert.equal(existsSync(root), false); });
  const directory = path.join(root, "review"); mkdirSync(directory);
  const key = randomBytes(32); writeFileSync(path.join(directory, "integrity.key"), key);
  const identity = realEnvelopeIdentity(), projected = reviewProjection(identity), h = "a".repeat(64);
  const job = { attempt: identity.executionId, job: randomUUID(), cleanup: true, activeProcesses: 0,
    jobClosed: true, assignedBeforeResume: true, resumed: true, killOnClose: true, breakaway: false,
    executableDigest: h, launcherSha256: h, sourceSha256: h };
  const payload = { version: "roost-native-review-v2", policy: nativeFootprintPolicy, stage: "final",
    integrityKeyIdentity: physicalIdentity(path.join(directory, "integrity.key"), false),
    binding: { identity: projected, rootIdentity: h, ready: h, preFootprintDigest: h,
      spent: { record: { state: "dispatch_reserved", attemptDigest: nativeDigest(originalSerialization ? identity : projected) } },
      writer: { name: "agent-host-writer.lock", record: { ownerNonce: "synthetic", ownerPid: 1,
        ownerProcess: { pid: 1, executableDigest: h, executablePathDigest: h } } },
      lease: { name: "application-" + nativeDigest(identity.applicationId) + ".lease", record: {
        attempt: identity.executionId, application: nativeDigest(identity.applicationId), writer: "synthetic" } } },
    postFootprintDigest: h, job, public: { jobDigest: nativeDigest(job), verdict: "acceptance_failed", violations: [] },
    verification: { status: "REFUSED", reason: "smoke_unexpected_diff" }, installation: { status: "PASS" } };
  // Deliberately incomplete synthetic evidence. It can only exercise refusal
  // before process observation/artifact access, never create an eligible grant.
  const signature = badSignature ? "0".repeat(64) : createHmac("sha256", key).update(JSON.stringify(payload) + "\n").digest("hex");
  writeFileSync(path.join(directory, "review.json"), JSON.stringify({ payload, signature }) + "\n");
  return directory;
}

for (const [label, options, reason] of [
  ["original serialization bridged by B24 still leaves refused verification", {}, "native_recovery_review_not_eligible"],
  ["matching serialization still leaves refused verification", { originalSerialization: false }, "native_recovery_review_not_eligible"],
  ["tampered signature", { badSignature: true }, "native_review_integrity_unproven"]
]) test("B22 recovery refuses " + label + " without changing evidence", t => {
  const directory = syntheticReview(t, options), file = path.join(directory, "review.json"), before = readFileSync(file);
  assert.deepEqual(qualifyNativeReconciliation(directory).missingEvidence, [reason]);
  assert.ok(readFileSync(file).equals(before));
  assert.equal(existsSync(path.join(path.dirname(directory), "agent-host-recovery.lock")), false);
});

test("B22 cache-shaped names and binary headers do not prove attribution or acceptance", () => {
  const names = ["cversions.2.db", "{6AF0698E-D558-4F6E-9B3C-3716689AF493}.2.ver0x0000000000000001.db",
    "{DDF571F2-BE98-426D-8288-1A9A39C3FDA2}.2.ver0x0000000000000001.db"];
  const prefixes = ["0200000060000000a0000000030000000", "100000000e93f5684b36dd010e93f5684b", "130000000e93f5684b36dd010e93f5684b"];
  for (const [i, name] of names.entries()) {
    assert.equal(nativeRelative(cache + "/" + name), cache + "/" + name);
    assert.notEqual(Buffer.from(prefixes[i], "hex").toString("ascii"), "SQLite format 3\0");
    assert.notEqual(cache + "/" + name, "add.cjs");
  }
});
