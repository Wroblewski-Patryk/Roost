import { createHash, timingSafeEqual } from "node:crypto";
import https from "node:https";
import { checkServerIdentity } from "node:tls";

const hash = /^[a-f0-9]{64}$/, commit = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const configFields = ["fqdn", "ports_exposes", "ports_mappings", "custom_network_aliases", "base_directory",
  "publish_directory", "health_check_enabled", "health_check_type", "health_check_command", "health_check_path",
  "health_check_port", "health_check_host", "health_check_method", "health_check_return_code", "health_check_scheme",
  "health_check_response_text", "health_check_interval", "health_check_timeout", "health_check_retries",
  "health_check_start_period", "limits_memory", "limits_memory_swap", "limits_memory_swappiness",
  "limits_memory_reservation", "limits_cpus", "limits_cpuset", "limits_cpu_shares", "custom_labels", "redirect",
  "connect_to_docker_network", "is_force_https_enabled", "is_http_basic_auth_enabled", "is_auto_deploy_enabled",
  "is_container_label_escape_enabled", "is_preserve_repository_enabled"];
const unsupportedFields = ["custom_docker_run_options", "post_deployment_command", "post_deployment_command_container",
  "pre_deployment_command", "pre_deployment_command_container", "custom_nginx_configuration", "start_command"];
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const digest = value => createHash("sha256").update(canonical(value)).digest("hex");
const digestOrder = (a, b) => digest(a) < digest(b) ? -1 : digest(a) > digest(b) ? 1 : 0;
const transportReasons = new Set(['transport_uncertain','response_unproven','response_size_invalid','response_invalid']);
export function coolifyTransportDiagnostic(error) {
  const reason=error?.message?.replace(/^release_coolify_/, '');
  if(!transportReasons.has(reason))return 'transport_unclassified';
  return reason+(Number.isInteger(error.httpStatus)&&error.httpStatus>=100&&error.httpStatus<=599?`_http_${error.httpStatus}`:'');
}
const deny = (reason, uncertain = false) => {
  throw Object.assign(new Error(`release_coolify_${reason}`), { uncertain, retryable: false });
};
const assert = (valid, reason) => { if (!valid) deny(reason); };
const timestamp = value => {
  const result = typeof value === "string" ? Date.parse(value) : NaN;
  assert(Number.isFinite(result), "time_invalid"); return result;
};
function secureUrl(value, originOnly = false) {
  let result; try { result = new URL(value); } catch { deny("url_invalid"); }
  assert(result.protocol === "https:" && !result.username && !result.password && !result.hash
    && (!originOnly || (!result.search && result.pathname === "/")), "url_invalid");
  return result;
}
function imageRepository(value) {
  assert(typeof value === "string" && /^[a-z0-9][a-z0-9.-]+(?::[0-9]{1,5})?\/[a-z0-9][a-z0-9._/-]{0,250}$/.test(value)
    && !value.includes("..") && !value.includes("//"), "image_repository_invalid");
  return value;
}
function normalizedImage(value) {
  // The manifest stores the content digest, never a movable tag.
  return image.test(value) ? value : hash.test(value) ? `sha256:${value}` : deny("image_digest_invalid");
}
function projection(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "config_invalid");
  return Object.fromEntries(configFields.map(field => [field, value[field] ?? value.settings?.[field] ?? null]));
}
function configuration(snapshot) {
  assert(snapshot && typeof snapshot === "object" && hash.test(snapshot.environmentHash)
    && hash.test(snapshot.storageHash) && snapshot.configuration && typeof snapshot.configuration === "object", "config_snapshot_invalid");
  imageRepository(snapshot.imageRepository);
  assert(Object.keys(snapshot.configuration).every(key => configFields.includes(key)), "config_snapshot_invalid");
  assert(snapshot.configuration.is_http_basic_auth_enabled !== true && snapshot.configuration.is_auto_deploy_enabled === false
    && !snapshot.configuration.health_check_command, "config_unsupported");
  for (const item of Object.values(snapshot.configuration)) {
    assert(item === null || ["string", "boolean", "number"].includes(typeof item), "config_snapshot_invalid");
    if (typeof item === "string") assert(item.length <= 4096 && !/\x00/.test(item), "config_snapshot_invalid");
    if (typeof item === "number") assert(Number.isFinite(item), "config_snapshot_invalid");
  }
  return { configuration: projection(snapshot.configuration), environmentHash: snapshot.environmentHash, storageHash: snapshot.storageHash };
}
export function coolifyConfigurationDigest(snapshot) { return digest(configuration(snapshot)); }
export const coolifyHealthDigest = observations => digest(observations);
export function coolifyEnvironmentHash(environments) {
  assert(Array.isArray(environments) && environments.every(item => typeof item.key === "string" && typeof item.value === "string"),
    "environment_state_unproven");
  return digest(environments.map(item => ({ key: item.key, value: item.value,
    is_build_time: item.is_build_time ?? null, is_runtime: item.is_runtime ?? null, is_preview: item.is_preview ?? null,
    is_literal: item.is_literal ?? null, is_multiline: item.is_multiline ?? null, is_shown_once: item.is_shown_once ?? null }))
    .sort(digestOrder));
}
export function coolifyStorageHash(storages) {
  assert(Array.isArray(storages?.persistent_storages) && Array.isArray(storages?.file_storages), "storage_state_unproven");
  assert(storages.file_storages.every(item => typeof item.content === "string"), "storage_content_unproven");
  return digest({ persistent: storages.persistent_storages.map(item => ({ name: item.name ?? null, mount_path: item.mount_path ?? null,
    host_path: item.host_path ?? null, is_readonly: item.is_readonly ?? null, resource_type: item.resource_type ?? null }))
    .sort(digestOrder), files: storages.file_storages.map(item => ({
      fs_path: item.fs_path ?? null, mount_path: item.mount_path ?? null, contentDigest: digest(item.content), is_directory: item.is_directory ?? null,
      is_based_on_git: item.is_based_on_git ?? null, is_readonly: item.is_readonly ?? null }))
    .sort(digestOrder) });
}
export const coolifyConfigurationFields = Object.freeze([...configFields]);
export const coolifyUnsupportedConfigurationFields = Object.freeze([...unsupportedFields]);
export const coolifyUnsupportedFields = coolifyUnsupportedConfigurationFields;
export const releaseImageLabels = Object.freeze({ commit: "org.opencontainers.image.revision", tree: "io.roost.release.tree",
  configDigest: "io.roost.release.config", schemaDigest: "io.roost.release.schema" });

/** HTTPS transport deliberately has no redirect, retry, response log or model-facing credential. */
export async function coolifyHttpsJson({ url, method = "GET", body, token, certificateSha256, timeoutMs = 10000, expectedStatus }) {
  const target = secureUrl(url);
  assert(["GET", "POST", "PATCH", "DELETE"].includes(method) && Number.isInteger(timeoutMs) && timeoutMs >= 100 && timeoutMs <= 30000,
    "transport_input_invalid");
  if (token !== undefined) assert(typeof token === "string" && token.length >= 8 && token.length <= 4096
    && !/[\r\n\x00]/.test(token), "credential_invalid");
  if (certificateSha256 !== undefined) assert(hash.test(certificateSha256), "certificate_pin_invalid");
  const payload = body === undefined ? undefined : JSON.stringify(body);
  assert(payload === undefined || Buffer.byteLength(payload) <= 32768, "request_size_invalid");
  return new Promise((resolve, reject) => {
    const error = (reason = "transport_uncertain", httpStatus) => reject(Object.assign(new Error(`release_coolify_${reason}`),
      { uncertain: method !== "GET", retryable: false, ...(Number.isInteger(httpStatus)?{httpStatus}:{}) }));
    const request = https.request(target, { method, agent: false, timeout: timeoutMs, minVersion: "TLSv1.2",
      rejectUnauthorized: true, maxHeaderSize: 8192,
      checkServerIdentity(host, cert) {
        const ordinary = checkServerIdentity(host, cert); if (ordinary) return ordinary;
        if (certificateSha256 && !timingSafeEqual(createHash("sha256").update(cert.raw ?? Buffer.alloc(0)).digest(),
          Buffer.from(certificateSha256, "hex"))) return Error("release_tls_pin_invalid");
        return undefined;
      }, headers: { Accept: "application/json", "Cache-Control": "no-store", "Accept-Encoding": "identity",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) }
    }, response => {
      if (response.headers.location || response.headers["content-encoding"]
        || (expectedStatus !== undefined ? response.statusCode !== expectedStatus : response.statusCode < 200 || response.statusCode > 299)) {
        response.destroy(); error("response_unproven",response.statusCode); return;
      }
      let size = 0; const chunks = [];
      response.on("data", chunk => { size += chunk.length; if (size > 1048576) {
        response.destroy(); error("response_size_invalid");
      } else chunks.push(chunk); });
      response.on("error", () => error());
      response.on("end", () => { try { const bytes=Buffer.concat(chunks);resolve(response.statusCode===204&&bytes.length===0?{accepted:true}:JSON.parse(bytes.toString("utf8"))); }
        catch { error("response_invalid"); } });
    });
    request.on("error", () => error());
    request.on("timeout", () => { request.destroy(); error(); });
    request.end(payload);
  });
}

/**
 * The broker journals before calling each mutation. The injected imageInspector is a
 * trusted read-only OCI/container inspection gateway; it must verify actual digest
 * and immutable labels. Missing inspection or configuration proof blocks mutation.
 * This installed Coolify version queues HEAD for /start and ignores git_commit_sha
 * via explicit job commit, so this adapter uses immutable dockerimage sources only.
 */
export function createCoolifyReleaseAdapter({ origin, credential, targetId, candidateConfig, rollbackConfig,
  imageInspector, configurationInspector, deploymentInspector, runtimeInspector, certificateSha256, healthCertificateSha256, transport = coolifyHttpsJson,
  now = () => Date.now(), sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), timeoutMs = 10000 }) {
  const apiOrigin = secureUrl(origin, true).origin;
  assert(identifier.test(targetId) && typeof credential === "function" && typeof transport === "function", "adapter_invalid");
  const candidate = structuredClone(candidateConfig), previous = structuredClone(rollbackConfig);
  const candidateDigest = coolifyConfigurationDigest(candidate), previousDigest = coolifyConfigurationDigest(previous);
  const bind = (manifest, binding) => {
    assert(binding && commit.test(binding.commit) && commit.test(binding.candidateTree) && commit.test(binding.baseTree), "release_binding_required");
    return { ...manifest, commit: binding.commit, tree: binding.candidateTree, baseTree: binding.baseTree };
  };
  const checkedManifest = manifest => {
    assert(typeof runtimeInspector === "function", "runtime_inspector_required");
    assert(manifest?.deployment?.provider === "coolify" && manifest.deployment.targetId === targetId
      && secureUrl(manifest.deployment.controllerUrl, true).origin === apiOrigin, "target_changed");
    assert(commit.test(manifest.commit) && hash.test(manifest.deployment.schemaDigest)
      && manifest.deployment.configDigest === candidateDigest && manifest.rollback?.configDigest === previousDigest,
    "manifest_binding_invalid");
    assert(commit.test(manifest.rollback.commit) && hash.test(manifest.rollback.schemaDigest)
      && Array.isArray(manifest.rollback.compatibleSchemaDigests)
      && manifest.rollback.compatibleSchemaDigests.includes(manifest.deployment.schemaDigest)
      && manifest.rollback.compatibleSchemaDigests.includes(manifest.rollback.schemaDigest), "rollback_schema_incompatible");
    normalizedImage(manifest.rollback.imageDigest);
    assert(manifest.backup && hash.test(manifest.backup.digest) && manifest.backup.restoreDigest === manifest.backup.digest
      && hash.test(manifest.baseline?.dataDigest)
      && Number.isSafeInteger(manifest.backup.bytes) && manifest.backup.bytes > 0
      && timestamp(manifest.backup.restoreVerifiedAt) >= timestamp(manifest.backup.capturedAt), "restore_unproven");
    assert(Array.isArray(manifest.services) && manifest.services.length > 0 && manifest.services.length <= 16, "services_invalid");
    for (const service of manifest.services) {
      assert(typeof service.name === "string" && service.name.length > 0 && service.name.length <= 120
        && Number.isInteger(service.expectedStatus) && service.expectedStatus >= 200 && service.expectedStatus <= 299, "services_invalid");
      secureUrl(service.healthUrl);
      assert(secureUrl(service.healthUrl).origin === secureUrl(manifest.deployment.url).origin, "health_origin_changed");
    }
    return manifest;
  };
  const api = async (route, method = "GET", body) => {
    let token; try { token = await credential(); } catch { deny("credential_unavailable"); }
    try { return await transport({ url: `${apiOrigin}/api/v1${route}`, method, body, token, certificateSha256, timeoutMs }); }
    catch(error) { throw Object.assign(Error(`release_coolify_${method === "GET" ? "read_unproven" : "mutation_uncertain"}`),
      {uncertain:method!=="GET",retryable:false,transportDiagnostic:coolifyTransportDiagnostic(error)}); }
  };
  const liveConfiguration = async () => {
    if (configurationInspector) {
      let inspected; try { inspected = await configurationInspector({ targetId }); } catch { deny("config_state_unproven"); }
      assert(inspected?.targetId === targetId && inspected.buildPack === "dockerimage"
        && inspected.unsupportedConfiguration === false, "config_state_unproven");
      const configDigest = coolifyConfigurationDigest(inspected);
      return { configDigest, configuration: projection(inspected.configuration), buildPack: inspected.buildPack, imageRepository: inspected.imageRepository,
        imageTag: inspected.imageTag, gitCommit: inspected.gitCommit };
    }
    const app = await api(`/applications/${targetId}`);
    assert(app?.uuid === targetId, "target_changed");
    assert(unsupportedFields.every(field => app[field] === undefined || app[field] === null || app[field] === "")
      && app.is_http_basic_auth_enabled !== true && !app.health_check_command
      && (app.is_auto_deploy_enabled ?? app.settings?.is_auto_deploy_enabled) === false
      && Object.hasOwn(app, "custom_labels"), "config_unsupported");
    // Hash secret-bearing API responses in memory. No values, UUIDs or logs leave this closure.
    const environments = await api(`/applications/${targetId}/envs`);
    const storages = await api(`/applications/${targetId}/storages`);
    assert(Array.isArray(environments) && environments.every(item => typeof item.key === "string" && typeof item.value === "string")
      && Array.isArray(storages?.persistent_storages) && Array.isArray(storages?.file_storages), "config_state_unproven");
    const snapshot = { imageRepository: candidate.imageRepository, configuration: projection(app),
      environmentHash: coolifyEnvironmentHash(environments), storageHash: coolifyStorageHash(storages) };
    return { configDigest: coolifyConfigurationDigest(snapshot), configuration: snapshot.configuration,
      buildPack: app.build_pack, imageRepository: app.docker_registry_image_name,
      imageTag: app.docker_registry_image_tag, gitCommit: app.git_commit_sha };
  };
  const imageProof = async (manifest, rollback = false) => {
    assert(typeof imageInspector === "function", "immutable_image_inspector_required");
    const expected = rollback ? manifest.rollback : { commit: manifest.commit, imageDigest: manifest.deployment.imageDigest,
      configDigest: manifest.deployment.configDigest, schemaDigest: manifest.deployment.schemaDigest, tree: manifest.tree };
    const source = rollback ? previous : candidate;
    const expectedDigest = normalizedImage(expected.imageDigest);
    let proof; try { proof = await imageInspector({ imageRepository: source.imageRepository, imageDigest: expectedDigest }); }
    catch { deny("immutable_image_unavailable"); }
    assert(proof?.available === true && proof.imageDigest === expectedDigest && proof.commit === expected.commit
      && proof.configDigest === expected.configDigest && proof.schemaDigest === expected.schemaDigest
      && proof.tree === (rollback ? manifest.baseTree : manifest.tree), "immutable_image_unproven");
    return { imageDigest: expectedDigest, commit: expected.commit, configDigest: expected.configDigest, schemaDigest: expected.schemaDigest };
  };
  const inspect = async manifest => {
    checkedManifest(manifest);
    const live = await liveConfiguration();
    assert(live.configDigest === manifest.baseline?.configDigest && live.configDigest === previousDigest
      && manifest.baseline.commit === manifest.rollback.commit
      && normalizedImage(manifest.baseline.imageDigest) === normalizedImage(manifest.rollback.imageDigest)
      && manifest.baseline.schemaDigest === manifest.rollback.schemaDigest, "baseline_changed");
    await imageProof(manifest, true);
    const baselineHealth = await health(manifest, { rollback: true });
    assert(baselineHealth.healthy && baselineHealth.healthDigest === manifest.baseline.healthDigest, "baseline_health_changed");
    return { targetId, configDigest: live.configDigest, baselineCommit: manifest.baseline.commit,
      rollbackImageDigest: normalizedImage(manifest.rollback.imageDigest) };
  };
  const configure = async (manifest, rollback) => {
    checkedManifest(manifest);
    if (!rollback) await inspect(manifest);
    await imageProof(manifest, true);
    const source = rollback ? previous : candidate;
    const proof = await imageProof(manifest, rollback);
    const live = await liveConfiguration();
    assert([candidateDigest, previousDigest].includes(live.configDigest), "config_changed");
    assert(candidate.environmentHash === previous.environmentHash && candidate.storageHash === previous.storageHash,
      "data_config_change_unsupported");
    // The installed update API cannot change build_pack and rejects nulls in
    // several optional fields. Keep unchanged nulls out of the mutation; a
    // requested clear is unsupported until its native semantics are proven.
    const changes = Object.fromEntries(Object.entries(source.configuration)
      .filter(([key, value]) => value !== (live.configuration[key] ?? null)));
    assert(Object.values(changes).every(value => value !== null), "config_clear_unsupported");
    const { fqdn, ...settings } = changes;
    try {
      await api(`/applications/${targetId}`, "PATCH", { ...settings, ...(fqdn === undefined ? {} : { domains: fqdn }),
        git_commit_sha: proof.commit,
        docker_registry_image_name: source.imageRepository, docker_registry_image_tag: proof.imageDigest.replace("sha256:", "sha256-") });
      const actual = await liveConfiguration();
      assert(actual.configDigest === proof.configDigest && actual.buildPack === "dockerimage"
        && actual.imageRepository === source.imageRepository && actual.imageTag === proof.imageDigest.replace("sha256:", "sha256-")
        && actual.gitCommit === proof.commit, "config_mutation_unproven");
    } catch (error) {
      if (error.message === "release_coolify_credential_unavailable") throw error;
      throw Object.assign(Error('release_coolify_config_mutation_uncertain'),{uncertain:true,retryable:false,
        transportDiagnostic:error.transportDiagnostic??'configuration_readback_unproven'});
    }
    return { targetId, ...proof };
  };
  const start = async (manifest, rollback) => {
    checkedManifest(manifest);
    const proof = await imageProof(manifest, rollback), live = await liveConfiguration();
    const source = rollback ? previous : candidate;
    assert(live.configDigest === proof.configDigest && live.buildPack === "dockerimage"
      && live.imageRepository === source.imageRepository && live.imageTag === proof.imageDigest.replace("sha256:", "sha256-")
      && live.gitCommit === proof.commit, "deployment_config_changed");
    const result = await api(`/applications/${targetId}/start`, "POST", { force: false, instant_deploy: false });
    if (!identifier.test(result?.deployment_uuid)) deny("deployment_response_uncertain", true);
    return { targetId, deploymentId: result.deployment_uuid, commit: proof.commit, imageDigest: proof.imageDigest };
  };
  const reconcileDeployment = async (manifest, { since, deploymentId, rollback = false }) => {
    checkedManifest(manifest);
    if (deploymentId !== undefined) assert(identifier.test(deploymentId), "deployment_id_invalid");
    const sinceMs = timestamp(since);
    assert(sinceMs <= now() && now() - sinceMs <= 86400000, "deployment_window_invalid");
    await liveConfiguration();
    const response = await api(`/deployments/applications/${targetId}?skip=0&take=50`);
    assert(Array.isArray(response?.deployments) && Number.isSafeInteger(response.count), "deployment_read_unproven");
    const expectedCommit = rollback ? manifest.rollback.commit : manifest.commit;
    const windowRows = response.deployments.filter(row => timestamp(row.created_at) >= sinceMs && timestamp(row.created_at) <= now());
    const rows = windowRows.filter(row => deploymentId ? row.deployment_uuid === deploymentId : true);
    if (windowRows.length === 1 && rows.length === 1 && ["queued", "in_progress"].includes(rows[0].status)
      && ["HEAD", expectedCommit].includes(rows[0].commit) && identifier.test(rows[0].deployment_uuid)) {
      // Pending is not a version proof. Wait using GET only; never reissue start.
      return { targetId, state: "pending", deploymentId: rows[0].deployment_uuid };
    }
    // /start queues HEAD for immutable images. HEAD is insufficient attribution after an uncertain outcome.
    let exact = rows.filter(row => row.commit === expectedCommit);
    // On this version dockerimage queues remain HEAD. A trusted container/OCI read
    // can bind its Coolify deployment label to the exact immutable runtime image.
    if (windowRows.length === 1 && rows.length === 1 && rows[0].commit === "HEAD" && deploymentInspector) {
      const row = rows[0], expected = rollback ? manifest.rollback : manifest.deployment;
      assert(identifier.test(row.deployment_uuid), "deployment_read_unproven");
      const source = rollback ? previous : candidate;
      let runtime; try { runtime = await deploymentInspector({ targetId, deploymentId: row.deployment_uuid,
        createdAt: row.created_at, imageRepository: source.imageRepository, imageDigest: normalizedImage(expected.imageDigest) }); }
      catch { runtime = undefined; }
      if (runtime?.targetId === targetId && runtime.deploymentId === row.deployment_uuid && runtime.commit === expectedCommit
        && runtime.imageDigest === normalizedImage(expected.imageDigest) && runtime.configDigest === expected.configDigest
        && runtime.schemaDigest === expected.schemaDigest) exact = [{ ...row, commit: expectedCommit }];
    }
    if (windowRows.length !== 1 || rows.length !== 1 || exact.length !== 1)
      return { targetId, state: "uncertain", reason: "exact_deployment_correlation_missing" };
    const row = exact[0];
    assert(identifier.test(row.deployment_uuid) && ["queued", "in_progress", "finished", "failed", "cancelled-by-user"].includes(row.status),
      "deployment_read_unproven");
    return { targetId, deploymentId: row.deployment_uuid, commit: row.commit, status: row.status,
      createdAt: row.created_at, state: row.status === "finished" ? "finished" : row.status === "failed" ? "failed" : "pending" };
  };
  const waitForDeployment = async (manifest, options) => {
    const deadline = now() + 60000;
    do {
      if (options.stopped?.()) deny("deployment_wait_stopped");
      const result = await reconcileDeployment(manifest, options);
      if (result.state !== "pending") return result;
      if (now() >= deadline) deny("deployment_wait_incomplete");
      await sleep(Math.min(1000, deadline - now()));
    } while (true);
  };
  const reconcileConfiguration = async (manifest, { rollback = false } = {}) => {
    checkedManifest(manifest);
    const live = await liveConfiguration(), expected = rollback ? manifest.rollback : {
      commit: manifest.commit, imageDigest: manifest.deployment.imageDigest, configDigest: candidateDigest };
    const source = rollback ? previous : candidate;
    const applied = live.configDigest === expected.configDigest && live.buildPack === "dockerimage"
      && live.gitCommit === expected.commit && live.imageRepository === source.imageRepository
      && live.imageTag === normalizedImage(expected.imageDigest).replace("sha256:", "sha256-");
    if(applied)return {targetId,state:"applied",configDigest:live.configDigest};
    const opposite=rollback?{...manifest.deployment,commit:manifest.commit}:manifest.rollback;
    const priorSource=rollback?candidate:previous;
    if(live.configDigest===opposite.configDigest&&live.buildPack==="dockerimage"&&live.gitCommit===opposite.commit
      &&live.imageRepository===priorSource.imageRepository&&live.imageTag===normalizedImage(opposite.imageDigest).replace("sha256:","sha256-")){
      const evidence=await health(manifest,{rollback:!rollback});
      return {targetId,state:"absent",evidence:{...evidence,absenceVerified:true}};
    }
    return { targetId, state: "uncertain", configDigest: live.configDigest };
  };
  const health = async (manifest, { rollback = false } = {}) => {
    checkedManifest(manifest);
    const expected = rollback ? manifest.rollback : { commit: manifest.commit, configDigest: candidateDigest,
      schemaDigest: manifest.deployment.schemaDigest, imageDigest: manifest.deployment.imageDigest };
    const expectedTree = rollback ? manifest.baseTree : manifest.tree, expectedImage = normalizedImage(expected.imageDigest);
    const source = rollback ? previous : candidate;
    const live = await liveConfiguration();
    assert(live.configDigest === expected.configDigest && live.buildPack === "dockerimage"
      && live.gitCommit === expected.commit && live.imageRepository === source.imageRepository
      && live.imageTag === expectedImage.replace("sha256:", "sha256-"), "runtime_config_changed");
    // The endpoint cannot embed the digest of its own image: changing that value
    // changes the image hash. The fixed gateway proves the actual single app
    // container's image ID against an immutable OCI digest independently.
    let runtime; try { runtime = await runtimeInspector({ targetId, imageRepository: source.imageRepository, imageDigest: expectedImage }); }
    catch { deny("runtime_image_unproven"); }
    assert(runtime?.targetId === targetId && runtime.imageDigest === expectedImage && runtime.commit === expected.commit
      && runtime.tree === expectedTree && runtime.configDigest === expected.configDigest
      && runtime.schemaDigest === expected.schemaDigest, "runtime_image_unproven");
    const observations = [];
    for (const service of manifest.services) {
      let data; try { data = await transport({ url: secureUrl(service.healthUrl).href, method: "GET", timeoutMs,
        certificateSha256: healthCertificateSha256, expectedStatus: service.expectedStatus }); } catch { deny("health_unproven"); }
      assert(["ok", "failed", "unhealthy"].includes(data?.status) && data.commit === expected.commit && data.configDigest === expected.configDigest
        && data.schemaDigest === expected.schemaDigest && (data.imageDigest === undefined || data.imageDigest === runtime.imageDigest)
        && data.dataDigest === manifest.baseline.dataDigest && data.tree === expectedTree, "health_identity_changed");
      observations.push({ name: service.name, commit: data.commit, tree: data.tree, configDigest: data.configDigest,
        schemaDigest: data.schemaDigest, imageDigest: runtime.imageDigest, dataDigest: data.dataDigest, healthy: data.status === "ok" });
    }
    return { deployedCommit: expected.commit, deployedTree: rollback ? manifest.baseTree : manifest.tree,
      imageDigest: runtime.imageDigest, configDigest: expected.configDigest, schemaDigest: expected.schemaDigest,
      dataDigest: manifest.baseline.dataDigest, healthy: observations.every(item => item.healthy),
      healthDigest: digest(observations), observedAt: new Date(now()).toISOString() };
  };
  const observe = async (manifest, options = {}) => {
    checkedManifest(manifest);
    const policy = manifest.observation;
    assert(policy && Number.isSafeInteger(policy.seconds) && policy.seconds >= 1 && policy.seconds <= 3600
      && Number.isSafeInteger(policy.intervalSeconds) && policy.intervalSeconds >= 1 && policy.intervalSeconds <= 300
      && policy.intervalSeconds <= policy.seconds
      && Number.isSafeInteger(policy.maxFailures) && policy.maxFailures >= 0 && policy.maxFailures <= 10, "observation_policy_invalid");
    const startedAt = now(), end = startedAt + policy.seconds * 1000;
    let failures = 0, samples = 0, final;
    do {
      final = undefined;
      try { final = await health(manifest, options); if (!final.healthy) failures += 1; } catch (error) {
        if (["release_coolify_health_identity_changed", "release_coolify_runtime_config_changed",
          "release_coolify_runtime_image_unproven"].includes(error.message)) throw error;
        failures += 1;
      }
      samples += 1;
      if (failures > policy.maxFailures) {
        if (final && !final.healthy) return { ...final, observationSeconds: Math.floor((now() - startedAt) / 1000) };
        deny("observation_unproven");
      }
      if (now() >= end) break;
      await sleep(Math.min(policy.intervalSeconds * 1000, end - now()));
    } while (samples <= 3601);
    assert(now() >= end && final, "observation_incomplete");
    return { ...final, observationSeconds: Math.floor((now() - startedAt) / 1000) };
  };
  return Object.freeze({ inspect: async (manifest, binding) => inspect(bind(manifest, binding)),
    configureCandidate: async (manifest, binding) => configure(bind(manifest, binding), false),
    configureRollback: async (manifest, binding) => configure(bind(manifest, binding), true),
    deploy: async (manifest, binding) => start(bind(manifest, binding), false),
    rollback: async (manifest, binding) => start(bind(manifest, binding), true),
    reconcileConfiguration: async (manifest, binding, options) => reconcileConfiguration(bind(manifest, binding), options),
    reconcileDeployment: async (manifest, binding, options) => reconcileDeployment(bind(manifest, binding), options),
    waitForDeployment: async (manifest, binding, options) => waitForDeployment(bind(manifest, binding), options),
    health: async (manifest, binding, options) => health(bind(manifest, binding), options),
    observe: async (manifest, binding, options) => observe(bind(manifest, binding), options) });
}
