import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { prepareProviderInput, measureProviderInput, providerInputTransport } from "./lib/agent-host-provider-input.mjs";

// The actual standard multiline apt cleanup form; no installation paths,
// application identity, private source or operator configuration in the test.
const dockerfile = "FROM python:3.11-slim\nWORKDIR /app/backend\n\n"
  + "RUN apt-get update \\\n    && apt-get install -y --no-install-recommends build-essential \\\n    && rm -rf /var/lib/apt/lists/*\n\nCOPY backend /app/backend\n";
const sha = value => createHash("sha256").update(value).digest("hex");
function fixture(content = dockerfile, path = "docker/Dockerfile") {
  const f = validPacketFixture();
  f.packet.contract.nativeBoundary = { profile: "inspect-readonly", readPaths: [path],
    runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" } };
  f.packet.contract.access = { ...f.packet.contract.access, tools: ["repository_read"],
    permissions: ["repository_read"], sandbox: "read-only" };
  f.packet.procedureComposition.fields.tools = ["repository_read"];
  pinReadyFixture(f);
  const evidence = { schemaVersion: "roost-readonly-repository-evidence-v1", head: "a".repeat(40),
    branch: f.packet.contract.singleTask.branch,
    files: [{ path, mimeType: "text/plain", content, sha256: sha(Buffer.from(content, "utf8")) }],
    tree: "d".repeat(64), processDigest: "e".repeat(64), dockerDigest: "f".repeat(64) };
  return { f, evidence: { ...evidence, digest: nativeDigest(evidence) } };
}
const options = ({ f, evidence }) => ({ fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext },
  claimed: f.claimed, currentCommit: "a".repeat(40), assertAuthority() {}, repositoryEvidence: evidence });
function reseal(i) { const { digest: ignored, ...body } = i.evidence; i.evidence.digest = nativeDigest(body); }
function denied(i) { assert.throws(() => measureProviderInput(options(i)), error => error.message === "agent_provider_input_blocked"
  && ["private_path", "schema_invalid"].includes(error.details?.reason)); }

test("selected hash-bound standard Dockerfile apt source is preserved byte-for-byte in measurement and envelope", () => {
  const i = fixture(), before = structuredClone(i.evidence), measurement = measureProviderInput(options(i));
  assert.equal(measurement.measurementOnly, true); assert.equal(measurement.withinLimit, true);
  const envelope = prepareProviderInput(options(i)), projected = envelope.evidence.repositoryInspection.value.files[0];
  assert.equal(projected.content, dockerfile); assert.equal(projected.sha256, sha(Buffer.from(dockerfile)));
  assert.deepEqual(i.evidence, before);
  assert.equal(JSON.parse(providerInputTransport("direct_codex", envelope).input).evidence.repositoryInspection.value.files[0].content, dockerfile);
});
for (const [name, content] of Object.entries({ crlf: dockerfile.replaceAll("\n", "\r\n"), directory: dockerfile.replace("/lists/*", "/lists/"),
  noSlash: dockerfile.replace("/lists/*", "/lists"), oneLine: "FROM python:3.11-slim\nRUN apt-get update && rm -rf /var/lib/apt/lists/*\n" }))
  test(`exact standard apt cleanup ${name} remains source evidence`, () => assert.equal(measureProviderInput(options(fixture(content))).withinLimit, true));
for (const [name, content] of Object.entries({ windows: dockerfile + String.raw`COPY C:\Users\operator\secret /app/`,
  home: dockerfile + "\nCOPY /home/operator/key /app/", root: dockerfile + "\nRUN cat /root/key", srv: dockerfile + "\nCOPY /srv/private /app/",
  etc: dockerfile + "\nRUN cat /etc/private", mixedRun: dockerfile.replace("/lists/*", "/lists/* /root/key"),
  otherVar: dockerfile.replace("/lists/*", "/lists/private"), noApt: "RUN rm -rf /var/lib/apt/lists/*\n",
  copiedPath: dockerfile + "COPY /var/lib/apt/lists/* /app/", commentPath: dockerfile + "# /var/lib/apt/lists/*\n",
  alternateEscape: "# escape=`\n" + dockerfile }))
  test(`Dockerfile exception still refuses ${name}`, () => denied(fixture(content)));
for (const [name, mutate] of Object.entries({ contentHash: i => { i.evidence.files[0].sha256 = "b".repeat(64); reseal(i); },
  nativeDigest: i => { i.evidence.digest = "b".repeat(64); }, head: i => { i.evidence.head = "b".repeat(40); reseal(i); },
  branch: i => { i.evidence.branch = "codex/other"; reseal(i); }, unselected: i => { i.f.packet.contract.nativeBoundary.readPaths = ["README.md"]; pinReadyFixture(i.f); },
  metadataPath: i => { i.evidence.files[0].path = "README.md"; i.f.packet.contract.nativeBoundary.readPaths = ["README.md"]; pinReadyFixture(i.f); reseal(i); },
  pathAlias: i => { i.evidence.files[0].path = "docker/../Dockerfile"; reseal(i); },
  fragment: i => { Object.assign(i.evidence.files[0], { sourceSha256: "b".repeat(64), range: { startLine: 1, endLine: 8 } }); reseal(i); },
  wrongSchema: i => { i.evidence.schemaVersion = "operator-labeled-source"; reseal(i); } }))
  test(`source qualification refuses ${name}`, () => denied((() => { const i = fixture(); mutate(i); return i; })()));
for (const [name, mutate] of Object.entries({ operatorInstruction: i => { i.f.claimed.prompt = dockerfile; pinReadyFixture(i.f); },
  taskScope: i => { i.f.packet.contract.scope.allowed = ["Inspect /var/lib/apt/lists/*"]; pinReadyFixture(i.f); },
  application: i => { i.f.applicationContext.application.description = dockerfile; pinReadyFixture(i.f); },
  configurationMetadata: i => { i.f.packet.sources[0].description = dockerfile; pinReadyFixture(i.f); } }))
  test(`same apt string remains blocked in ${name}`, () => { const i = fixture(); mutate(i); denied(i); });
test("secret redaction and source metadata cannot obtain an apt exception", () => {
  const i = fixture(dockerfile + "\n# synthetic-private-credential\n");
  assert.throws(() => measureProviderInput({ ...options(i), secrets: ["synthetic-private-credential"] }));
  const other = fixture(); other.evidence.files[0].label = "Dockerfile"; reseal(other); denied(other);
});
