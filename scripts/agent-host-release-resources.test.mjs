import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createReleaseResourceGateway } from "./lib/agent-host-release-resources.mjs";
import { physicalIdentity } from "./lib/agent-host-native-footprint.mjs";
import { coolifyConfigurationFields, coolifyConfigurationDigest, coolifyEnvironmentHash, coolifyStorageHash } from "./lib/agent-host-release-coolify.mjs";
import releaseContract from "./lib/agent-host-release-contract.cjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const IMAGE = `sha256:${"a".repeat(64)}`, IMAGE_ID = `sha256:${"b".repeat(64)}`, OLD_IMAGE = `sha256:${"c".repeat(64)}`;
const RESOURCE = "d".repeat(64), CONTAINER = "e".repeat(64), SCHEMA = "f".repeat(64), DATA = "0".repeat(64);
const DATE = "2026-10-01T10:00:00.000Z";
const windows = { skip: process.platform !== "win32", timeout: 30000 };
function fixture(t, options = {}) {
  const temp = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(temp, "roost-release-resources-"));
  const workspaceRoot = path.join(root, "workspace"), privateRoot = path.join(root, "private"), clone = path.join(workspaceRoot, "certification");
  fs.mkdirSync(workspaceRoot); fs.mkdirSync(privateRoot); fs.mkdirSync(clone);
  t.after(() => { const resolved = fs.realpathSync.native(root), relative = path.relative(temp, resolved);
    assert.equal(resolved, root); assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    assert.ok(path.basename(resolved).startsWith("roost-release-resources-")); fs.rmSync(resolved, { recursive: true, force: false }); });
  const git = args => execFileSync("git", args, { cwd: clone, shell: false, windowsHide: true, timeout: 10000, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  git(["init", "--initial-branch=codex/certification"]); fs.writeFileSync(path.join(clone, "README.md"), "Synthetic certification test\n");
  git(["add", "README.md"]); git(["-c", "user.name=Synthetic Test", "-c", "user.email=fixture@example.test", "commit", "-m", "Synthetic fixture"]);
  const commit = git(["rev-parse", "HEAD"]), tree = git(["rev-parse", "HEAD^{tree}"]);
  const repositoryUrl = "https://github.com/example-org/certification.git"; git(["remote", "add", "origin", repositoryUrl]);
  const releaseId = randomUUID(), releaseRequestId = randomUUID(), applicationId = randomUUID(), targetId = "certification-owned";
  const configuration = Object.fromEntries(coolifyConfigurationFields.map(key => [key, null]));
  Object.assign(configuration, { is_auto_deploy_enabled: false, fqdn: "https://certification.example.test", custom_labels: `roost.release-request=${releaseRequestId}` });
  const snapshot = { targetId, applicationId: "123", buildPack: "dockerimage", imageRepository: "registry.example.test/certification/app",
    imageTag: IMAGE.replace("sha256:", "sha256-"), gitCommit: commit, configuration,
    environmentHash: coolifyEnvironmentHash([]), storageHash: coolifyStorageHash({ persistent_storages: [], file_storages: [] }), unsupportedConfiguration: false };
  const configDigest = coolifyConfigurationDigest(snapshot);
  const artifact = { commit, imageDigest: OLD_IMAGE, configDigest, schemaDigest: SCHEMA };
  const manifest = { schemaVersion: "roost-release-manifest-v1", repository: { url: repositoryUrl, defaultBranch: "main",
      canonicalDir: clone, candidateBranch: "codex/certification" },
    deployment: { provider: "coolify", targetId, controllerUrl: "https://coolify.example.test", url: "https://certification.example.test",
      imageDigest: IMAGE, configDigest, schemaDigest: SCHEMA },
    services: [{ name: "web", healthUrl: "https://certification.example.test/health", expectedStatus: 200 }],
    baseline: { ...artifact, healthDigest: "1".repeat(64), dataDigest: DATA, observedAt: DATE },
    observation: { seconds: 2, intervalSeconds: 1, maxFailures: 0 },
    backup: { digest: "2".repeat(64), restoreDigest: "2".repeat(64), bytes: 1024, capturedAt: DATE, restoreVerifiedAt: DATE },
    rollback: { ...artifact, compatibleSchemaDigests: [SCHEMA] },
    cleanup: { repositoryUrl, canonicalDir: clone, coolifyTargetId: targetId, ownedResourceIds: ["owned-network"], archiveRepository: true } };
  const marker = { schemaVersion: "roost-release-clone-ownership-v1", releaseId, releaseRequestId, applicationId, targetId, repositoryUrl, canonicalDir: clone };
  const markerBytes = Buffer.from(JSON.stringify(marker) + "\n"); fs.writeFileSync(path.join(clone, ".git", "roost-release-owned.json"), markerBytes);
  const ledger = { schemaVersion: "roost-release-resource-ownership-v1", releaseId, releaseRequestId, applicationId, targetId,
    coolifyApplicationId: "123", imageRepository: snapshot.imageRepository, imageDigests: [IMAGE, OLD_IMAGE],
    manifestDigest: releaseContract.releaseDigest(manifest), canonicalDir: clone, cloneIdentity: physicalIdentity(clone), repositoryUrl,
    cloneMarker: { filename: ".git/roost-release-owned.json", digest: hash(markerBytes) },
    resources: [{ resourceId: "owned-network", kind: "network", id: RESOURCE, createdAt: DATE, temporary: true }],
    capacity: { minDiskBytes: 1000, minMemoryBytes: 1000, maxLoad1: 2 } };
  const ownershipFile = path.join(privateRoot, "ownership.json"); fs.writeFileSync(ownershipFile, JSON.stringify(ledger));
  const binding = { releaseId, requestId: releaseRequestId, applicationId, manifestDigest: ledger.manifestDigest, commit, candidateTree: tree };
  const requests = [];
  let present = true;
  const state = { image: { repoDigests: [`${ledger.imageRepository}@${IMAGE}`], imageId: IMAGE_ID, commit, tree, configDigest, schemaDigest: SCHEMA },
    configuration: snapshot, containers: [CONTAINER], deployed: { id: CONTAINER, imageId: IMAGE_ID, createdAt: "2026-10-01T10:00:01.000Z",
      applicationId: "123", running: true, health: "healthy", deploymentId: null, releaseRequestId },
    resource: { id: RESOURCE, createdAt: DATE, applicationId: "123", releaseId, attachments: 0 },
    capacity: { diskBytes: 2000, memoryBytes: 2000, load1: 0.5, dockerAvailable: true }, queue: { activeDeployments: 0 } };
  const transport = async request => {
    requests.push(request);
    if (options.transport) return options.transport(request, state);
    switch (request.operation) {
      case "image": return JSON.stringify(state.image);
      case "configuration": return JSON.stringify(state.configuration);
      case "application_containers": return state.containers.join("\n");
      case "deployed_container": return JSON.stringify(state.deployed);
      case "capacity": return JSON.stringify(state.capacity);
      case "deployment_queue": return JSON.stringify(state.queue);
      case "resource_presence": return present ? RESOURCE : "";
      case "resource_inspect": return JSON.stringify(state.resource);
      case "remove_resource": present = false; return RESOURCE;
      default: throw Error("unexpected_gateway_operation");
    }
  };
  const config = { sshHost: "certification-vps", workspaceRoot, ownershipFile, transport };
  return { root, clone, ledger, state, config, binding, manifest, ownershipFile, requests, gateway: createReleaseResourceGateway(config), setPresent: value => { present = value; } };
}

test("read-only gateway proves exact OCI image/config/container without secret values or packet commands", windows, async t => {
  const x = fixture(t), request = { imageRepository: x.ledger.imageRepository, imageDigest: IMAGE };
  assert.equal((await x.gateway.imageInspector(request)).commit, x.binding.commit);
  x.state.configuration.rawEnvironment = "synthetic-private-value";
  const config = await x.gateway.configurationInspector({ targetId: x.ledger.targetId });
  assert.equal(config.environmentHash, coolifyEnvironmentHash([])); assert.equal(config.rawEnvironment, undefined);
  assert.equal((await x.gateway.deploymentInspector({ targetId: x.ledger.targetId, deploymentId: "owned-deployment", createdAt: DATE, ...request })).imageDigest, IMAGE);
  assert.equal((await x.gateway.runtimeInspector({ targetId: x.ledger.targetId, ...request })).tree, x.binding.candidateTree);
  assert.ok(x.requests.every(row => row.sshHost === "certification-vps" && !row.command.includes("synthetic-private-value")));
  assert.equal(x.requests.find(row => row.operation === "configuration").stdin, x.ledger.targetId);
  assert.ok(x.requests.find(row => row.operation === "configuration").command.includes("hashed(rows($env))"));
  assert.ok(x.requests.every(row => !/docker (?:run|pull|build)|rm -rf|git push/.test(row.command)));
});
test("live runtime digest proof rejects a replaced container and configuration", windows, async t => {
  const x=fixture(t),request={targetId:x.ledger.targetId,imageRepository:x.ledger.imageRepository,imageDigest:IMAGE};
  x.state.deployed.imageId=OLD_IMAGE;await assert.rejects(x.gateway.runtimeInspector(request),/runtime_unproven/);
  x.state.deployed.imageId=IMAGE_ID;x.state.configuration.configuration.ports_exposes="9000";
  await assert.rejects(x.gateway.runtimeInspector(request),/runtime_configuration_changed/);
});
for (const fault of ["digest", "image_label", "duplicates", "request_label", "creation", "application"]) test(`runtime inspector denies ${fault} conflict`, windows, async t => {
  const x = fixture(t);
  if (fault === "digest") x.state.image.repoDigests = [`${x.ledger.imageRepository}@${OLD_IMAGE}`];
  if (fault === "image_label") x.state.image.commit = "unverified";
  if (fault === "duplicates") x.state.containers.push("3".repeat(64));
  if (fault === "request_label") x.state.deployed.releaseRequestId = randomUUID();
  if (fault === "creation") x.state.deployed.createdAt = "2026-09-30T10:00:00.000Z";
  if (fault === "application") x.state.deployed.applicationId = "999";
  await assert.rejects(x.gateway.deploymentInspector({ targetId: x.ledger.targetId, deploymentId: "owned-deployment", createdAt: DATE,
    imageRepository: x.ledger.imageRepository, imageDigest: IMAGE }), /^Error: release_resources_/);
});
test("unknown target/image/SSH alias deny before transport; errors never expose private diagnostics", windows, async t => {
  const x = fixture(t);
  await assert.rejects(x.gateway.imageInspector({ imageRepository: "registry.example.test/unknown/app", imageDigest: IMAGE }), /image_scope_changed/);
  await assert.rejects(x.gateway.configurationInspector({ targetId: "other-target" }), /target_changed/);
  assert.equal(x.requests.length, 0);
  assert.throws(() => createReleaseResourceGateway({ ...x.config, sshHost: "-oProxyCommand=anything" }), /configuration_invalid/);
  const y = fixture(t, { transport: async () => { throw Error("synthetic-secret-credential"); } });
  await assert.rejects(y.gateway.imageInspector({ imageRepository: y.ledger.imageRepository, imageDigest: IMAGE }), error => !error.message.includes("secret"));
});
test("capacity checks actual available disk/memory/load and forbids overlapping queued deployments", windows, async t => {
  const x = fixture(t); assert.equal((await x.gateway.inspectCapacity(x.manifest)).available, true);
  x.state.queue.activeDeployments = 1; await assert.rejects(x.gateway.inspectCapacity(x.manifest), /capacity_unavailable/);
  x.state.queue.activeDeployments = 0; x.state.capacity.memoryBytes = 1;
  await assert.rejects(x.gateway.inspectCapacity(x.manifest), /capacity_unavailable/);
});
test("registered stopped resource is removed once and uncertain result reconciles through read-only absence", windows, async t => {
  const x = fixture(t);
  assert.deepEqual(x.gateway.ownedResource(x.manifest, x.binding, "owned-network"), { resourceId: "owned-network", kind: "network", id: RESOURCE, createdAt: DATE });
  assert.deepEqual(await x.gateway.removeResource(x.manifest, x.binding, "owned-network"), { absenceVerified: true, resourceIds: ["owned-network"] });
  const mutations = x.requests.filter(row => row.operation === "remove_resource"); assert.equal(mutations.length, 1);
  assert.ok(mutations[0].command.endsWith(`'${RESOURCE}'`)); assert.ok(!mutations[0].command.includes("--force"));
  assert.equal((await x.gateway.reconcileResource(x.manifest, x.binding, "owned-network")).status, "succeeded");
  await x.gateway.removeResource(x.manifest, x.binding, "owned-network");
  assert.equal(x.requests.filter(row => row.operation === "remove_resource").length, 1);
});

test("registered image projection preserves identity and creation time required by the release Worker", windows, t => {
  const x = fixture(t), row = { resourceId: "owned-image", kind: "docker_image", id: IMAGE_ID, createdAt: DATE, temporary: true };
  x.ledger.resources = [row]; x.manifest.cleanup.ownedResourceIds = [row.resourceId];
  x.ledger.manifestDigest = releaseContract.releaseDigest(x.manifest); x.binding.manifestDigest = x.ledger.manifestDigest;
  fs.writeFileSync(x.ownershipFile, JSON.stringify(x.ledger));
  const gateway = createReleaseResourceGateway(x.config), registered = gateway.ownedResource(x.manifest, x.binding, row.resourceId);
  assert.deepEqual(registered, { resourceId: row.resourceId, kind: row.kind, id: row.id, createdAt: row.createdAt });
  assert.equal(Object.isFrozen(registered), true); assert.equal(registered.temporary, undefined);
  assert.throws(() => gateway.ownedResource(x.manifest, { ...x.binding, releaseId: randomUUID() }, row.resourceId));
  assert.equal(x.requests.length, 0);
});
test("resource ownership/registration conflict preserves resource and does not issue removal", windows, async t => {
  const x = fixture(t); x.state.resource.releaseId = randomUUID();
  await assert.rejects(x.gateway.removeResource(x.manifest, x.binding, "owned-network"), /resource_ownership_unproven/);
  await assert.rejects(x.gateway.removeResource(x.manifest, x.binding, "unknown-resource"), /resource_unregistered/);
  assert.equal(x.requests.some(row => row.operation === "remove_resource"), false);
});
test("local cleanup validates native Git/marker/provenance and verifies absence without another deletion", windows, async t => {
  const x = fixture(t); x.setPresent(false);
  assert.equal(await x.gateway.assertClone(x.manifest, x.binding), x.clone);
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: x.clone, encoding: "utf8", windowsHide: true }).trim(), "");
  assert.deepEqual(await x.gateway.cleanupLocal(x.manifest, x.binding), { localAbsent: true });
  assert.equal(fs.existsSync(x.clone), false);
  assert.deepEqual(await x.gateway.reconcileLocal(x.manifest, x.binding), { status: "succeeded", evidence: { localAbsent: true } });
  assert.deepEqual(await x.gateway.verifyCleanup(x.manifest, x.binding), { localAbsent: true, absenceVerified: true, resourceIds: ["owned-network"] });
});
for (const fault of ["dirty", "unknown", "marker", "binding", "outside", "ledger"]) test(`local cleanup rejects ${fault} and preserves directory`, windows, async t => {
  const x = fixture(t);
  if (fault === "dirty") fs.writeFileSync(path.join(x.clone, "README.md"), "Unreviewed change\n");
  if (fault === "unknown") fs.writeFileSync(path.join(x.clone, "unrecognized.txt"), "Unknown data\n");
  if (fault === "marker") fs.writeFileSync(path.join(x.clone, ".git", "roost-release-owned.json"), "{}\n");
  if (fault === "binding") x.binding.releaseId = randomUUID();
  if (fault === "ledger") fs.writeFileSync(x.ownershipFile, "{}\n");
  if (fault === "outside") {
    const ledger = { ...x.ledger, canonicalDir: path.join(x.root, "outside") };
    fs.writeFileSync(x.ownershipFile, JSON.stringify(ledger));
    assert.throws(() => createReleaseResourceGateway(x.config), /path_invalid/);
  } else await assert.rejects(x.gateway.cleanupLocal(x.manifest, x.binding), /^Error: (?:release_resources_|native_)/);
  assert.equal(fs.existsSync(x.clone), true);
});
