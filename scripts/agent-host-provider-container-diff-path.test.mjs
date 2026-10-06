import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { measureProviderInput, prepareProviderInput, providerInputTransport } from "./lib/agent-host-provider-input.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const path = "docker/Dockerfile", baseline = "b".repeat(40), candidate = "a".repeat(40);
const source = "FROM python:3.11-slim\nRUN apt-get update \\\n    && apt-get install -y --no-install-recommends build-essential \\\n    && rm -rf /var/lib/apt/lists/*\nCOPY backend /app/backend\n";
const diff = "diff --git a/backend/pyproject.toml b/backend/pyproject.toml\n"
  + "index 1111111..2222222 100644\n--- a/backend/pyproject.toml\n+++ b/backend/pyproject.toml\n@@ -1 +1 @@\n-old\n+new\n"
  + "diff --git a/docker/Dockerfile b/docker/Dockerfile\nindex 3333333..4444444 100644\n"
  + "--- a/docker/Dockerfile\n+++ b/docker/Dockerfile\n@@ -1,5 +1,5 @@\n"
  + source.split("\n").filter(Boolean).map(line => "-" + line + "\n").join("")
  + source.split("\n").filter(Boolean).map(line => "+" + line + "\r\n").join("");
function fixture() {
  const f = validPacketFixture(), ref = { kind: "code-reviewer", verifiedTaskId: "00000000-0000-4000-8000-000000000080",
    verifiedExecutionId: "00000000-0000-4000-8000-000000000081", verifiedEvidenceDigest: "c".repeat(64),
    baselineCommit: baseline, reviewedCommit: candidate };
  f.packet.contract.nativeBoundary = { profile: "inspect-readonly", readPaths: [path],
    runtime: { required: false, ports: [] }, inspectReadOnly: ref };
  f.packet.contract.access = { ...f.packet.contract.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
  f.packet.procedureComposition.fields.tools = ["repository_read"]; pinReadyFixture(f);
  const content = source.replaceAll("\n", "\r\n");
  const body = { schemaVersion: "roost-readonly-repository-evidence-v1", head: candidate, branch: f.packet.contract.singleTask.branch,
    files: [{ path, mimeType: "text/plain", content, sha256: sha(Buffer.from(content)) }],
    tree: "d".repeat(64), processDigest: "e".repeat(64), dockerDigest: "f".repeat(64),
    reviewed: { verifiedTaskId: ref.verifiedTaskId, verifiedExecutionId: ref.verifiedExecutionId, materialVersion: ref.verifiedEvidenceDigest,
      baselineCommit: baseline, reviewedCommit: candidate, changedFiles: ["backend/pyproject.toml", path],
      codingTests: { passed: true }, localCommit: { commit: candidate }, nativeReview: { verdict: "verified_candidate" }, diff, diffDigest: sha(diff) } };
  return { f, evidence: { ...body, digest: nativeDigest(body) } };
}
function options(i) { return { fresh: { taskContext: i.f.taskContext, applicationContext: i.f.applicationContext },
  claimed: i.f.claimed, currentCommit: candidate, assertAuthority() {}, repositoryEvidence: i.evidence }; }
function reseal(i) { const { digest, ...body } = i.evidence; i.evidence.digest = nativeDigest(body); }
function changeDiff(i, value) { i.evidence.reviewed.diff = value; i.evidence.reviewed.diffDigest = sha(value); reseal(i); }
function denied(i) { assert.throws(() => measureProviderInput(options(i)), e => e.message === "agent_provider_input_blocked"
  && ["private_path", "schema_invalid"].includes(e.details?.reason)); }

test("exact declared Dockerfile CRLF diff apt literal preserves every source/diff byte and digest", () => {
  const i = fixture(), before = structuredClone(i.evidence), measurement = measureProviderInput(options(i));
  assert.equal(measurement.withinLimit, true);
  const envelope = prepareProviderInput(options(i)), value = envelope.evidence.repositoryInspection.value;
  assert.equal(value.reviewed.diff, diff); assert.equal(value.reviewed.diffDigest, sha(diff));
  assert.equal(value.files[0].content, before.files[0].content); assert.equal(value.files[0].sha256, before.files[0].sha256);
  assert.equal(value.digest, before.digest); assert.deepEqual(i.evidence, before);
  assert.equal(JSON.parse(providerInputTransport("direct_codex", envelope).input).evidence.repositoryInspection.value.reviewed.diff, diff);
});
for (const [name, mutate] of Object.entries({
  privateAdded: i => changeDiff(i, diff + "+COPY /root/private.key /app/key\n"),
  unrelatedVar: i => changeDiff(i, diff.replaceAll("/var/lib/apt/lists/*", "/var/lib/private/*")),
  alteredCanonical: i => changeDiff(i, diff.replaceAll("/var/lib/apt/lists/*", "/var/lib/apt/lists/private")),
  extraOperand: i => changeDiff(i, diff.replaceAll("/var/lib/apt/lists/*", "/var/lib/apt/lists/* /home/operator/key")),
  otherSection: i => changeDiff(i, diff.replaceAll("a/docker/Dockerfile", "a/README.md").replaceAll("b/docker/Dockerfile", "b/README.md")),
  wrongOldHeader: i => changeDiff(i, diff.replace("--- a/docker/Dockerfile", "--- a/README.md")),
  wrongNewHeader: i => changeDiff(i, diff.replace("+++ b/docker/Dockerfile", "+++ b/README.md")),
  noHunk: i => changeDiff(i, diff.replace("@@ -1,5 +1,5 @@", "not a hunk")),
  undeclared: i => { i.f.packet.contract.nativeBoundary.readPaths = ["README.md"]; pinReadyFixture(i.f); },
  unreportedChange: i => { i.evidence.reviewed.changedFiles = ["backend/pyproject.toml"]; reseal(i); },
  wrongSourceHash: i => { i.evidence.files[0].sha256 = "1".repeat(64); reseal(i); },
  wrongDiffDigest: i => { i.evidence.reviewed.diffDigest = "1".repeat(64); reseal(i); },
  wrongEvidenceDigest: i => { i.evidence.digest = "1".repeat(64); },
  wrongSourceTuple: i => { i.evidence.reviewed.verifiedExecutionId = "00000000-0000-4000-8000-000000000082"; reseal(i); },
  wrongCommit: i => { i.evidence.reviewed.reviewedCommit = baseline; reseal(i); },
  auditor: i => { i.f.packet.contract.nativeBoundary.inspectReadOnly = { kind: "auditor" }; pinReadyFixture(i.f); },
  ownerInstruction: i => { i.f.claimed.prompt = diff; pinReadyFixture(i.f); },
  taskInstruction: i => { i.f.packet.contract.scope.allowed = ["Read /var/lib/apt/lists/*"]; pinReadyFixture(i.f); },
  windows: i => changeDiff(i, diff + String.raw`+COPY C:\Users\operator\key /app/key` + "\n"),
  privateCurrentSource: i => { i.evidence.files[0].content += "COPY /srv/private /app/\n";
    i.evidence.files[0].sha256 = sha(i.evidence.files[0].content); reseal(i); }
})) test(`diff literal qualification refuses ${name}`, () => { const i = fixture(); mutate(i); denied(i); });
