import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCoolifyReleaseAdapter, coolifyConfigurationDigest, coolifyHttpsJson, coolifyTransportDiagnostic } from "./lib/agent-host-release-coolify.mjs";

test('transport diagnostics retain only fixed classes and numeric HTTP status',()=>{
  assert.equal(coolifyTransportDiagnostic({message:'release_coolify_response_unproven',httpStatus:422}),'response_unproven_http_422');
  for(const message of ['secret-value','release_coolify_secret-value','release_coolify_response_unproven\ncredential'])
    assert.equal(coolifyTransportDiagnostic({message,httpStatus:422}),'transport_unclassified');
  assert.equal(coolifyTransportDiagnostic({message:'release_coolify_transport_uncertain',httpStatus:'private-value'}),'transport_uncertain');
});

const canonical = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(canonical)
  : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const A = "a".repeat(40), B = "b".repeat(40), TREE = "c".repeat(40), OLD_IMAGE = `sha256:${"d".repeat(64)}`;
const IMAGE = `sha256:${"e".repeat(64)}`, SCHEMA = "f".repeat(64), DATA = "0".repeat(64), BACKUP = "1".repeat(64);
function fixture(options = {}) {
  const config = { imageRepository: "registry.example.test/certification/app",
    configuration: { fqdn: "https://certification.example.test", ports_exposes: "3000", is_auto_deploy_enabled: false,
      health_check_enabled: true, health_check_type: "http", health_check_command: null, custom_labels: "test=true",
      health_check_path: "/health", health_check_return_code: 200 },
    environmentHash: sha([]), storageHash: sha({ persistent: [], files: [] }) };
  const configDigest = coolifyConfigurationDigest(config);
  const service = { name: "web", healthUrl: "https://certification.example.test/health", expectedStatus: 200 };
  const previousObservations = [{ name: "web", commit: A, tree: TREE, configDigest, schemaDigest: SCHEMA, imageDigest: OLD_IMAGE, dataDigest: DATA, healthy: true }];
  // Canonical hashing agrees with the adapter irrespective of source key order.
  const manifest = { deployment: { provider: "coolify", targetId: "owned-certification", controllerUrl: "https://coolify.example.test",
      url: "https://certification.example.test", imageDigest: IMAGE, configDigest, schemaDigest: SCHEMA }, services: [service],
    baseline: { commit: A, imageDigest: OLD_IMAGE, configDigest, schemaDigest: SCHEMA,
      healthDigest: sha(canonical(previousObservations)), dataDigest: DATA },
    backup: { digest: BACKUP, restoreDigest: BACKUP, bytes: 1024, capturedAt: "2026-10-01T09:00:00Z", restoreVerifiedAt: "2026-10-01T09:01:00Z" },
    rollback: { commit: A, imageDigest: OLD_IMAGE, configDigest, schemaDigest: SCHEMA, compatibleSchemaDigests: [SCHEMA] },
    observation: { seconds: 3, intervalSeconds: 1, maxFailures: 0 } };
  const binding = { commit: B, candidateTree: TREE, baseTree: TREE };
  let current = { ...structuredClone(config), targetId: "owned-certification", buildPack: "dockerimage", gitCommit: A,
    imageTag: OLD_IMAGE.replace("sha256:", "sha256-"), unsupportedConfiguration: false }, deployed = A, clock = Date.parse("2026-10-01T10:00:00Z");
  const requests = [], images = [];
  let history = [], healthOverride = {}, runtimeOverride = {}, failMutation = false;
  const configurationInspector = async () => structuredClone(current);
  const imageInspector = async ({ imageRepository, imageDigest }) => {
    images.push({ imageRepository, imageDigest });
    return { available: true, imageDigest, commit: imageDigest === OLD_IMAGE ? A : B, tree: TREE,
      configDigest, schemaDigest: SCHEMA };
  };
  const runtimeInspector = async ({ targetId }) => ({ targetId, commit: deployed, tree: TREE,
    imageDigest: deployed === A ? OLD_IMAGE : IMAGE, configDigest, schemaDigest: SCHEMA, ...runtimeOverride });
  const transport = async request => {
    requests.push({ ...request, token: request.token ? "[credential-present]" : undefined });
    if (request.url === service.healthUrl) {
      assert.equal(request.token, undefined, "Coolify credential must never go to application health endpoint");
      assert.equal(request.expectedStatus, 200);
      if (healthOverride.error) throw Error("private response containing sensitive logs");
      return { status: "ok", commit: deployed, tree: TREE, configDigest, schemaDigest: SCHEMA,
        imageDigest: deployed === A ? OLD_IMAGE : IMAGE, dataDigest: DATA, ...healthOverride };
    }
    assert.equal(new URL(request.url).origin, "https://coolify.example.test");
    assert.equal(request.token, "private-credential");
    if (request.method === "PATCH") {
      const body = request.body;
      assert.equal('build_pack' in body, false, 'installed PATCH API rejects build_pack');
      assert.equal(Object.values(body).some(value => value === null), false, 'unchanged null fields must not be sent');
      current = { ...current, configuration: { ...current.configuration,
        ...Object.fromEntries(Object.entries(body).filter(([key]) => key in current.configuration)),
        ...(body.domains === undefined ? {} : { fqdn: body.domains }) },
        gitCommit: body.git_commit_sha,
        imageRepository: body.docker_registry_image_name, imageTag: body.docker_registry_image_tag };
      if (failMutation) throw Error("ambiguous PATCH after effect; private log must not escape");
      return { uuid: "owned-certification" };
    }
    if (request.method === "POST") {
      if (failMutation) throw Error("ambiguous deployment after effect");
      deployed = current.gitCommit;
      history.push({ deployment_uuid: "cert-deployment", commit: deployed, status: "finished", created_at: new Date(clock).toISOString() });
      return { deployment_uuid: "cert-deployment" };
    }
    if (request.url.includes("/deployments/applications/")) return { count: history.length, deployments: history };
    throw Error("unexpected API call");
  };
  const adapter = createCoolifyReleaseAdapter({ origin: "https://coolify.example.test", targetId: "owned-certification",
    credential: async () => "private-credential", candidateConfig: config, rollbackConfig: config,
    imageInspector, configurationInspector, runtimeInspector, transport, now: () => clock, sleep: async ms => { clock += ms; }, ...options });
  return { adapter, manifest, binding, requests, images, config, configDigest,
    setHealth: value => { healthOverride = value; }, setHistory: value => { history = value; },
    setRuntime: value => { runtimeOverride = value; },
    setFailure: value => { failMutation = value; }, setCurrent: value => { current = { ...current, ...value }; },
    setClock: value => { clock = value; }, clock: () => clock };
}

test("immutable candidate release and rollback restore exact image/config/schema and preserve data", async () => {
  const x = fixture();
  assert.equal((await x.adapter.inspect(x.manifest, x.binding)).baselineCommit, A);
  const configured = await x.adapter.configureCandidate(x.manifest, x.binding);
  assert.equal(configured.imageDigest, IMAGE);
  assert.equal(x.requests.find(r => r.method === "PATCH").body.docker_registry_image_tag, IMAGE.replace("sha256:", "sha256-"));
  const deployment = await x.adapter.deploy(x.manifest, x.binding);
  const health = await x.adapter.health(x.manifest, x.binding);
  assert.equal(health.deployedCommit, B);
  assert.equal(health.dataDigest, DATA);
  const observed = await x.adapter.observe(x.manifest, x.binding);
  assert.equal(observed.observationSeconds, 3); assert.equal(observed.healthy, true);
  assert.equal((await x.adapter.reconcileDeployment(x.manifest, x.binding,
    { since: "2026-10-01T09:59:59Z", deploymentId: deployment.deploymentId })).state, "finished");
  await x.adapter.configureRollback(x.manifest, x.binding);
  await x.adapter.rollback(x.manifest, x.binding);
  const restored = await x.adapter.health(x.manifest, x.binding, { rollback: true });
  assert.equal(restored.deployedCommit, A); assert.equal(restored.deployedTree, TREE);
  assert.equal(x.requests.filter(r => r.method === "POST").length, 2);
});

test("target/controller/health origin changes and missing release binding fail before credentials or writes", async () => {
  const x = fixture();
  for (const mutate of [m => { m.deployment.targetId = "another-target"; },
    m => { m.deployment.controllerUrl = "https://foreign.example.test"; },
    m => { m.services[0].healthUrl = "https://foreign.example.test/health"; }]) {
    const m = structuredClone(x.manifest); mutate(m);
    await assert.rejects(() => x.adapter.configureCandidate(m, x.binding), /release_coolify_/);
  }
  await assert.rejects(() => x.adapter.configureCandidate(x.manifest), /binding_required/);
  assert.equal(x.requests.length, 0);
});

test("changed candidate, config, backup, or schema denies launch", async () => {
  const x = fixture();
  const mutations = [m => { m.deployment.configDigest = "2".repeat(64); },
    m => { m.backup.restoreDigest = "3".repeat(64); },
    m => { m.rollback.compatibleSchemaDigests = []; },
    m => { m.baseline.commit = B; }];
  for (const mutate of mutations) {
    const m = structuredClone(x.manifest); mutate(m);
    await assert.rejects(() => x.adapter.configureCandidate(m, x.binding), /release_coolify_/);
  }
  await assert.rejects(() => x.adapter.configureCandidate(x.manifest, { ...x.binding, commit: A }), /immutable_image_unproven/);
  assert.equal(x.requests.filter(r => r.method === "PATCH" || r.method === "POST").length, 0);
});

test("rollback image unavailable or mutable cannot be admitted", async () => {
  const unavailable = fixture({ imageInspector: async () => ({ available: false }) });
  await assert.rejects(() => unavailable.adapter.configureCandidate(unavailable.manifest, unavailable.binding), /immutable_image_unproven/);
  const missing = fixture({ imageInspector: undefined });
  await assert.rejects(() => missing.adapter.configureCandidate(missing.manifest, missing.binding), /inspector_required/);
  const mutable = fixture(); mutable.manifest.rollback.imageDigest = "latest";
  await assert.rejects(() => mutable.adapter.configureCandidate(mutable.manifest, mutable.binding), /image_digest_invalid/);
});

test("ambiguous configuration journals uncertainty and reconciles read-only without repeated PATCH", async () => {
  const x = fixture(); x.setFailure(true);
  await assert.rejects(() => x.adapter.configureCandidate(x.manifest, x.binding), error => {
    assert.equal(error.uncertain, true); assert.equal(error.retryable, false);
    assert.equal(error.message, "release_coolify_config_mutation_uncertain"); return true;
  });
  assert.equal((await x.adapter.reconcileConfiguration(x.manifest, x.binding)).state, "applied");
  assert.equal(x.requests.filter(r => r.method === "PATCH").length, 1);
});

test("ambiguous deployment invokes POST once; uncertain or duplicate history cannot authorize retry", async () => {
  const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); x.setFailure(true);
  await assert.rejects(() => x.adapter.deploy(x.manifest, x.binding), error => error.uncertain === true && error.retryable === false);
  const since = "2026-10-01T09:59:59Z";
  for (const history of [[], [{ deployment_uuid: "old", commit: B, status: "finished", created_at: "2026-10-01T09:59:00Z" }],
    [{ deployment_uuid: "one", commit: B, status: "finished", created_at: "2026-10-01T10:00:00Z" },
      { deployment_uuid: "two", commit: B, status: "finished", created_at: "2026-10-01T10:00:00Z" }]]) {
    x.setHistory(history);
    assert.equal((await x.adapter.reconcileDeployment(x.manifest, x.binding, { since })).state, "uncertain");
  }
  assert.equal(x.requests.filter(r => r.method === "POST").length, 1);
});

test("configuration intent interrupted before PATCH reconciles only exact unchanged runtime and data",async()=>{
 const x=fixture();
 const result=await x.adapter.reconcileConfiguration(x.manifest,x.binding);
 assert.equal(result.state,'absent');assert.equal(result.evidence.deployedCommit,A);
 assert.equal(result.evidence.imageDigest,OLD_IMAGE);assert.equal(result.evidence.dataDigest,DATA);
 assert.equal(result.evidence.absenceVerified,true);assert.equal(x.requests.filter(r=>r.method==='PATCH').length,0);
 x.setHealth({dataDigest:'9'.repeat(64)});
 await assert.rejects(x.adapter.reconcileConfiguration(x.manifest,x.binding),/release_coolify_/);
 x.setHealth({});x.setRuntime({imageDigest:IMAGE});
 await assert.rejects(x.adapter.reconcileConfiguration(x.manifest,x.binding),/release_coolify_/);
});

test("Coolify HEAD image queue requires independent exact runtime deployment correlation", async () => {
  const x = fixture(); x.setHistory([{ deployment_uuid: "cert-deployment", commit: "HEAD", status: "finished", created_at: "2026-10-01T10:00:00Z", logs: "secret never projected" }]);
  assert.equal((await x.adapter.reconcileDeployment(x.manifest, x.binding, { since: "2026-10-01T09:59:59Z" })).state, "uncertain");
  const proven = fixture({ deploymentInspector: async ({ targetId, deploymentId }) => ({ targetId, deploymentId,
    commit: B, imageDigest: IMAGE, configDigest: x.configDigest, schemaDigest: SCHEMA }) });
  proven.setHistory([{ deployment_uuid: "cert-deployment", commit: "HEAD", status: "finished", created_at: "2026-10-01T10:00:00Z" }]);
  const result = await proven.adapter.reconcileDeployment(proven.manifest, proven.binding, { since: "2026-10-01T09:59:59Z" });
  assert.equal(result.state, "finished"); assert.equal(result.commit, B); assert.ok(!JSON.stringify(result).includes("secret"));
});

test("changed source pins between config and deployment deny POST", async () => {
  const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding);
  x.setCurrent({ imageTag: "latest" });
  await assert.rejects(() => x.adapter.deploy(x.manifest, x.binding), /deployment_config_changed/);
  assert.equal(x.requests.filter(r => r.method === "POST").length, 0);
});

test("baseline data/version/config/schema and actual image errors block readiness and observation", async () => {
  for (const override of [{ dataDigest: "9".repeat(64) }, { commit: B }, { configDigest: "9".repeat(64) },
    { schemaDigest: "9".repeat(64) }, { imageDigest: IMAGE }]) {
    const x = fixture(); x.setHealth(override);
    await assert.rejects(() => x.adapter.inspect(x.manifest, x.binding), /health_identity_changed/);
    assert.equal(x.requests.filter(r => r.method === "PATCH").length, 0);
  }
  const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
  x.manifest.observation.maxFailures = 3; x.setHealth({ dataDigest: "9".repeat(64) });
  await assert.rejects(() => x.adapter.observe(x.manifest, x.binding), /health_identity_changed/);
});

test("observation requires elapsed interval and final healthy sample; transport secrets never escape", async () => {
  const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
  x.setHealth({ error: true });
  await assert.rejects(() => x.adapter.observe(x.manifest, x.binding), /observation_unproven/);
  const y = fixture(); y.manifest.observation.seconds = 0;
  await assert.rejects(() => y.adapter.observe(y.manifest, y.binding), /observation_policy_invalid/);
  assert.ok(!JSON.stringify(x.requests).includes("private-credential"));
});

test("transport rejects insecure URL and credential injection before network use", async () => {
  await assert.rejects(() => coolifyHttpsJson({ url: "http://localhost/health" }), /url_invalid/);
  await assert.rejects(() => coolifyHttpsJson({ url: "https://user:pass@example.test/health" }), /url_invalid/);
  await assert.rejects(() => coolifyHttpsJson({ url: "https://example.test/health", token: "token\r\nInjected: true" }), /credential_invalid/);
  await assert.rejects(() => coolifyHttpsJson({ url: "https://example.test/health", certificateSha256: "bad-pin" }), /certificate_pin_invalid/);
});

test("native API schema hides application id and separates persistent/file storage; snapshots remain digests", async () => {
  const x = fixture();
  const requests = [];
  const configuration = { ...x.config.configuration, uuid: "owned-certification", build_pack: "dockerimage",
    docker_registry_image_name: x.config.imageRepository, docker_registry_image_tag: OLD_IMAGE.replace("sha256:", "sha256-"), git_commit_sha: A };
  const native = fixture({ configurationInspector: undefined, transport: async request => {
    requests.push(request.url);
    if (request.url.endsWith("/envs")) return [];
    if (request.url.endsWith("/storages")) return { persistent_storages: [], file_storages: [] };
    if (request.url.endsWith("/applications/owned-certification")) return configuration;
    if (request.url.endsWith("/health")) return { status: "ok", commit: A, tree: TREE, configDigest: x.configDigest,
      schemaDigest: SCHEMA, imageDigest: OLD_IMAGE, dataDigest: DATA };
    throw Error("unexpected route");
  } });
  const inspected = await native.adapter.inspect(native.manifest, native.binding);
  assert.equal(inspected.configDigest, x.configDigest);
  assert.ok(!JSON.stringify(inspected).includes("registry.example"));
  assert.ok(requests.some(url => url.endsWith("/storages")));
});

test("rollback must prove the prior tree in both immutable image and live health", async () => {
  const x = fixture(); const changed = { ...x.binding, baseTree: "9".repeat(40) };
  await assert.rejects(x.adapter.configureRollback(x.manifest, changed), /immutable_image_unproven/);
  x.setHealth({ tree: "9".repeat(40) });
  await assert.rejects(x.adapter.health(x.manifest, x.binding, { rollback: true }), /health_identity_changed/);
  assert.equal(x.requests.filter(r => r.method !== "GET").length, 0);
});

test("missing sensitive configuration values or auto-deploy proof blocks native API readiness", async () => {
  for (const bad of ["hidden-environment", "auto-deploy-unknown"]) {
    const x = fixture();
    const native = fixture({ configurationInspector: undefined, transport: async request => {
      if (request.url.endsWith("/envs")) return [{ key: "RELEASE_CONTEXT", is_runtime: true }];
      if (request.url.endsWith("/storages")) return { persistent_storages: [], file_storages: [] };
      if (request.url.endsWith("/applications/owned-certification")) return { ...x.config.configuration,
        is_auto_deploy_enabled: bad === "auto-deploy-unknown" ? undefined : false, uuid: "owned-certification" };
      throw Error("health should never be requested");
    } });
    await assert.rejects(() => native.adapter.inspect(native.manifest, native.binding), /config_(?:state_unproven|unsupported)/);
  }
});

test("credential-provider failure is sanitized before any transport invocation", async () => {
  const x = fixture({ credential: async () => { throw Error("private token details"); } });
  await assert.rejects(() => x.adapter.configureCandidate(x.manifest, x.binding), error => {
    assert.equal(error.message, "release_coolify_credential_unavailable"); return true;
  });
  assert.equal(x.requests.filter(r => r.method === "POST").length, 0);
});

test("controlled unhealthy sample retains exact release identity for attributed safe rollback", async () => {
  const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
  x.setHealth({ status: "unhealthy" });
  const health = await x.adapter.health(x.manifest, x.binding);
  assert.equal(health.healthy, false); assert.equal(health.deployedCommit, B);
  assert.equal(health.deployedTree, TREE); assert.equal(health.dataDigest, DATA); assert.equal(health.imageDigest, IMAGE);
  const failure = await x.adapter.observe(x.manifest, x.binding);
  assert.equal(failure.healthy, false); assert.equal(failure.observationSeconds, 0); assert.equal(failure.deployedCommit, B);
  await x.adapter.configureRollback(x.manifest, x.binding); await x.adapter.rollback(x.manifest, x.binding);
  x.setHealth({ status: "ok" });
  const recovered = await x.adapter.observe(x.manifest, x.binding, { rollback: true });
  assert.equal(recovered.healthy, true); assert.equal(recovered.deployedCommit, A); assert.equal(recovered.imageDigest, OLD_IMAGE);
});

test("missing health connection and unknown status never become an attributed unhealthy result", async () => {
  for (const override of [{ error: true }, { status: "unknown" }, { status: "unhealthy", commit: A }]) {
    const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
    x.setHealth(override);
    await assert.rejects(() => x.adapter.observe(x.manifest, x.binding), /(?:observation_unproven|health_identity_changed)/);
  }
});

test("application need not embed its own digest; immutable image evidence comes from independent running-container proof", async () => {
  const x = fixture(); x.setHealth({ imageDigest: undefined });
  await x.adapter.inspect(x.manifest, x.binding);
  await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
  const actual = await x.adapter.health(x.manifest, x.binding);
  assert.equal(actual.imageDigest, IMAGE); assert.equal(actual.deployedCommit, B);
  assert.equal(actual.healthy, true);
});

test("missing runtime inspector refuses every mutation before transport use", async () => {
  const x = fixture({ runtimeInspector: undefined });
  for (const operation of ["configureCandidate", "deploy", "configureRollback", "rollback"]) {
    await assert.rejects(() => x.adapter[operation](x.manifest, x.binding), /runtime_inspector_required/);
  }
  assert.equal(x.requests.length, 0);
});

test("tampered or foreign live image proof cannot be laundered by a healthy endpoint", async () => {
  for (const override of [{ imageDigest: OLD_IMAGE }, { targetId: "foreign-application" }, { commit: A },
    { tree: "4".repeat(40) }, { configDigest: "4".repeat(64) }, { schemaDigest: "4".repeat(64) }]) {
    const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
    x.setRuntime(override);
    await assert.rejects(() => x.adapter.health(x.manifest, x.binding), /runtime_image_unproven/);
    x.manifest.observation.maxFailures = 3;
    await assert.rejects(() => x.adapter.observe(x.manifest, x.binding), /runtime_image_unproven/);
  }
});

test("missing actual container image and changed live configuration are unknown, never an attributed failure", async () => {
  const missing = fixture({ runtimeInspector: async () => undefined });
  await assert.rejects(() => missing.adapter.inspect(missing.manifest, missing.binding), /runtime_image_unproven/);
  assert.equal(missing.requests.filter(r => r.method === "PATCH").length, 0);
  for (const update of [{ imageTag: "latest" }, { gitCommit: A }, { buildPack: "nixpacks" },
    { imageRepository: "registry.example.test/foreign/app" }]) {
    const x = fixture(); await x.adapter.configureCandidate(x.manifest, x.binding); await x.adapter.deploy(x.manifest, x.binding);
    x.setCurrent(update);
    await assert.rejects(() => x.adapter.health(x.manifest, x.binding), /(?:runtime_config_changed|config_state_unproven)/);
  }
});
