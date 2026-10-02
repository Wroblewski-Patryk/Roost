import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { z } from "zod";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
import releaseContract from "./agent-host-release-contract.cjs";
import { coolifyConfigurationFields, coolifyUnsupportedFields, coolifyConfigurationDigest, releaseImageLabels } from "./agent-host-release-coolify.mjs";
import { hasReleaseProcessScope, runReleaseNativeProcess, minimalReleaseEnvironment } from './agent-host-release-process.mjs';
import os from 'node:os';

const hex = /^[a-f0-9]{64}$/, commit = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/, registry = /^[a-z0-9][a-z0-9.-]+(?::[0-9]{1,5})?\/[a-z0-9][a-z0-9._/-]{0,250}$/;
const fail = reason => { throw Object.assign(Error(`release_resources_${reason}`), { retryable: false }); };
const check = (condition, reason) => { if (!condition) fail(reason); };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const uuid = z.string().uuid(), digest = z.string().regex(hex), imageDigest = z.string().regex(image);
const ownershipSchema = z.object({ schemaVersion: z.literal("roost-release-resource-ownership-v1"),
  releaseId: uuid, releaseRequestId: uuid, applicationId: uuid, targetId: z.string().regex(identifier),
  coolifyApplicationId: z.string().regex(/^[1-9][0-9]{0,15}$/), imageRepository: z.string().regex(registry),
  imageDigests: z.array(imageDigest).min(1).max(4), manifestDigest: digest,
  canonicalDir: z.string().min(3).max(1000), cloneIdentity: digest, repositoryUrl: z.string().url(),
  cloneMarker: z.object({ filename: z.literal(".git/roost-release-owned.json"), digest }).strict(),
  resources: z.array(z.object({ resourceId: z.string().regex(identifier), kind: z.enum(["container", "network", "volume", "coolify_application", "docker_image", "ghcr_version"]),
    id: z.string().min(1).max(120), createdAt: z.string().datetime(), temporary: z.literal(true),
    engine: z.enum(["local", "vps"]).optional() }).strict().refine(row =>
      row.kind === "docker_image" ? row.engine !== undefined : row.engine === undefined)).max(30),
  capacity: z.object({ minDiskBytes: z.number().int().positive(), minMemoryBytes: z.number().int().positive(),
    maxLoad1: z.number().positive().max(100) }).strict() }).strict();
const inside = (parent, child) => { const relative = path.relative(parent, child); return relative && !relative.startsWith("..") && !path.isAbsolute(relative); };
const quote = text => `'${text.replaceAll("'", "'\\''")}'`; // Only fixed source or grammar-checked IDs reach this helper.

async function releaseSshTransport({ sshHost, command, stdin = "", timeoutMs = 15000 }) {
  check(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(sshHost), "ssh_alias_invalid");
  if (hasReleaseProcessScope()) return (await runReleaseNativeProcess('ssh', {
    argv: ['-T','-o','BatchMode=yes','-o','ConnectTimeout=10',sshHost,command], cwd: os.tmpdir(),
    input: stdin, durationMs: timeoutMs, maxBytes: 65536
  })).toString('utf8');
  return new Promise((resolve, reject) => {
    const child = spawn("ssh", ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", sshHost, command],
      { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    let bytes = 0, output = "", stopped = false;
    const timer = setTimeout(() => { stopped = true; child.kill(); }, timeoutMs);
    child.stdin.on("error", () => {});
    child.stdout.on("data", chunk => { bytes += chunk.length; if (bytes > 65536) { stopped = true; child.kill(); } else output += chunk.toString("utf8"); });
    child.once("error", () => { clearTimeout(timer); reject(Error("release_resources_transport_unproven")); });
    child.once("close", code => { clearTimeout(timer); code === 0 && !stopped ? resolve(output) : reject(Error("release_resources_transport_unproven")); });
    child.stdin.end(stdin);
  });
}

// Both the program and model relation names are fixed to the inspected Coolify
// source. UUID input travels on stdin. Secret values/file contents are hashed
// on the VPS and never leave this program as JSON values or diagnostics.
const phpBootstrap = `require '/var/www/html/vendor/autoload.php'; $app=require '/var/www/html/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();`;
const phpConfiguration = `${phpBootstrap}
function canonical($v){if(is_object($v)){$v=get_object_vars($v);}if(is_array($v)){if(!array_is_list($v)){ksort($v,SORT_STRING);}foreach($v as $k=>$x){$v[$k]=canonical($x);}}return $v;}
function encoded($v){return json_encode(canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);}
function hashed($v){return hash('sha256',encoded($v));}
function rows($v){usort($v,fn($a,$b)=>strcmp(hashed($a),hashed($b)));return $v;}
function pick($v,$keys){$r=[];foreach($keys as $key){$r[$key]=$v[$key]??null;}return $r;}
$id=trim(stream_get_contents(STDIN));if(!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/D',$id)){throw new RuntimeException('invalid_target');}
$a=App\\Models\\Application::where('uuid',$id)->firstOrFail();$raw=$a->toArray();$settings=$a->settings?->toArray()??[];
$configuration=[];foreach(json_decode('${JSON.stringify(coolifyConfigurationFields)}',true) as $key){$configuration[$key]=$raw[$key]??$settings[$key]??null;}
$unsupported=false;foreach(json_decode('${JSON.stringify(coolifyUnsupportedFields)}',true) as $key){if(isset($raw[$key])&&$raw[$key]!==''){$unsupported=true;}}
$unsupported=$unsupported||($configuration['is_http_basic_auth_enabled']===true)||!empty($configuration['health_check_command'])||($configuration['is_auto_deploy_enabled']!==false);
$env=[];foreach($a->environment_variables->merge($a->environment_variables_preview) as $item){$v=$item->toArray();$v['value']=$item->value;if(!is_string($v['key']??null)||!is_string($v['value'])){throw new RuntimeException('environment_unproven');}$env[]=pick($v,['key','value','is_build_time','is_runtime','is_preview','is_literal','is_multiline','is_shown_once']);}
$persistent=[];foreach($a->persistentStorages as $item){$persistent[]=pick($item->toArray(),['name','mount_path','host_path','is_readonly','resource_type']);}
$files=[];foreach($a->fileStorages as $item){$v=$item->toArray();if(!is_string($item->content)){throw new RuntimeException('storage_content_unproven');}$r=pick($v,['fs_path','mount_path','is_directory','is_based_on_git','is_readonly']);$r['contentDigest']=hashed($item->content);$files[]=$r;}
echo encoded(['targetId'=>$a->uuid,'applicationId'=>(string)$a->id,'buildPack'=>$a->build_pack,'imageRepository'=>$a->docker_registry_image_name,'imageTag'=>$a->docker_registry_image_tag,'gitCommit'=>$a->git_commit_sha,'configuration'=>$configuration,'environmentHash'=>hashed(rows($env)),'storageHash'=>hashed(['persistent'=>rows($persistent),'files'=>rows($files)]),'unsupportedConfiguration'=>$unsupported]);`;
const configCommand = `docker exec -i coolify php -r ${quote(phpConfiguration)}`;
const queueCommand = `docker exec coolify php -r ${quote(`${phpBootstrap} echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()],JSON_THROW_ON_ERROR);`)}`;
const capacityCommand = "set -eu; dockerRoot=$(docker info --format '{{.DockerRootDir}}'); case \"$dockerRoot\" in /*) ;; *) exit 1 ;; esac; disk=$(df -PB1 -- \"$dockerRoot\" | awk 'NR==2{print $4}'); memory=$(awk '/^MemAvailable:/{printf \"%.0f\",$2*1024}' /proc/meminfo); load=$(cut -d ' ' -f1 /proc/loadavg); version=$(docker info --format '{{.ServerVersion}}'); test -n \"$version\"; printf '{\"diskBytes\":%s,\"memoryBytes\":%s,\"load1\":%s,\"dockerAvailable\":true}' \"$disk\" \"$memory\" \"$load\"";
const imageFormat = `{"repoDigests":{{json .RepoDigests}},"imageId":{{json .Id}},${Object.entries(releaseImageLabels).map(([key, label]) => `"${key}":{{json (index .Config.Labels "${label}")}}`).join(",")}}`;
const containerFormat = '{"id":{{json .Id}},"imageId":{{json .Image}},"createdAt":{{json .Created}},"applicationId":{{json (index .Config.Labels "coolify.applicationId")}},"releaseId":{{json (index .Config.Labels "roost.release-id")}},"releaseRequestId":{{json (index .Config.Labels "roost.release-request")}},"deploymentId":{{json (index .Config.Labels "coolify.deploymentId")}},"running":{{json .State.Running}},"health":{{if .State.Health}}{{json .State.Health.Status}}{{else}}null{{end}}}';
const immutableImageSchema = z.object({ repoDigests: z.array(z.string()).min(1).max(30), imageId: imageDigest,
  commit: z.string().regex(commit), tree: z.string().regex(commit), configDigest: digest, schemaDigest: digest }).strict();

export function createReleaseResourceGateway({ sshHost, workspaceRoot, ownershipFile, transport = releaseSshTransport }) {
  check(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(sshHost) && typeof transport === "function", "configuration_invalid");
  check(path.isAbsolute(workspaceRoot) && path.normalize(workspaceRoot) === workspaceRoot
    && path.isAbsolute(ownershipFile) && path.normalize(ownershipFile) === ownershipFile, "path_invalid");
  const workspaceIdentity = physicalIdentity(workspaceRoot), fileIdentity = physicalIdentity(ownershipFile, false);
  const originalBytes = readFileSync(ownershipFile); check(originalBytes.length <= 32768, "ownership_invalid");
  const originalDigest = sha(originalBytes);
  let ownership; try { ownership = ownershipSchema.parse(JSON.parse(originalBytes)); } catch { fail("ownership_invalid"); }
  check(path.isAbsolute(ownership.canonicalDir) && path.normalize(ownership.canonicalDir) === ownership.canonicalDir
    && inside(workspaceRoot, ownership.canonicalDir) && !inside(ownership.canonicalDir, ownershipFile), "path_invalid");
  check(new Set(ownership.resources.map(row => row.resourceId)).size === ownership.resources.length
    && new Set(ownership.resources.map(row => `${row.kind}:${row.engine ?? ""}:${row.id}`)).size === ownership.resources.length, "ownership_invalid");
  const stable = () => {
    check(physicalIdentity(workspaceRoot) === workspaceIdentity && physicalIdentity(ownershipFile, false) === fileIdentity
      && sha(readFileSync(ownershipFile)) === originalDigest, "ownership_changed");
    return ownership;
  };
  const run = async (operation, command, stdin = "") => {
    stable(); let output; try { output = await transport({ operation, sshHost, command, stdin, timeoutMs: 15000 }); } catch { fail("transport_unproven"); }
    check(typeof output === "string" && Buffer.byteLength(output) <= 65536, "response_unproven");
    stable(); return output;
  };
  const json = async (...args) => { try { return JSON.parse(await run(...args)); } catch { fail("response_unproven"); } };
  const bind = (manifest, binding) => {
    stable(); let parsed; try { parsed = releaseContract.manifestSchema.parse(manifest); } catch { fail("manifest_invalid"); }
    check(binding?.releaseId === ownership.releaseId && binding.requestId === ownership.releaseRequestId
      && binding.applicationId === ownership.applicationId && binding.manifestDigest === ownership.manifestDigest
      && releaseContract.releaseDigest(parsed) === ownership.manifestDigest && parsed.repository.canonicalDir === ownership.canonicalDir
      && parsed.repository.url === ownership.repositoryUrl && parsed.deployment.targetId === ownership.targetId
      && parsed.cleanup.ownedResourceIds.length === ownership.resources.length
      && parsed.cleanup.ownedResourceIds.every(id => ownership.resources.some(row => row.resourceId === id)), "binding_changed");
    check(commit.test(binding.commit) && commit.test(binding.candidateTree), "binding_changed"); return parsed;
  };
  const imageInspector = async ({ imageRepository, imageDigest: wanted }) => {
    stable(); check(imageRepository === ownership.imageRepository && registry.test(imageRepository)
      && !imageRepository.includes("..") && !imageRepository.includes("//") && ownership.imageDigests.includes(wanted), "image_scope_changed");
    let inspected; try { inspected = immutableImageSchema.parse(await json("image", `docker image inspect --format ${quote(imageFormat)} -- ${quote(`${imageRepository}@${wanted}`)}`)); }
    catch { fail("image_unproven"); }
    check(inspected.repoDigests.includes(`${imageRepository}@${wanted}`), "image_digest_changed");
    return { available: true, imageDigest: wanted, imageId: inspected.imageId, commit: inspected.commit, tree: inspected.tree,
      configDigest: inspected.configDigest, schemaDigest: inspected.schemaDigest };
  };
  const configurationInspector = async ({ targetId }) => {
    check(targetId === stable().targetId, "target_changed");
    const inspected = await json("configuration", configCommand, targetId);
    check(inspected?.targetId === targetId && inspected.applicationId === ownership.coolifyApplicationId
      && inspected.buildPack === "dockerimage" && inspected.imageRepository === ownership.imageRepository
      && inspected.unsupportedConfiguration === false, "configuration_unproven");
    const projected = Object.fromEntries(["targetId", "applicationId", "buildPack", "imageRepository", "imageTag", "gitCommit", "configuration", "environmentHash", "storageHash", "unsupportedConfiguration"].map(key => [key, inspected[key]]));
    coolifyConfigurationDigest(projected); return projected;
  };
  const deploymentInspector = async ({ targetId, deploymentId, createdAt, imageRepository, imageDigest: wanted }) => {
    check(targetId === stable().targetId && identifier.test(deploymentId) && Number.isFinite(Date.parse(createdAt)), "deployment_scope_changed");
    const proof = await imageInspector({ imageRepository, imageDigest: wanted });
    const ids = (await run("application_containers", `docker container ls -a --no-trunc --filter ${quote(`label=coolify.applicationId=${ownership.coolifyApplicationId}`)} --format '{{.ID}}'`)).trim().split(/\r?\n/).filter(Boolean);
    check(ids.length === 1 && hex.test(ids[0]), "application_container_conflict");
    const state = await json("deployed_container", `docker container inspect --format ${quote(containerFormat)} -- ${quote(ids[0])}`);
    check(state.id === ids[0] && state.applicationId === ownership.coolifyApplicationId && state.imageId === proof.imageId
      && state.running === true && (!state.health || state.health === "healthy") && Date.parse(state.createdAt) >= Date.parse(createdAt)
      && Date.parse(state.createdAt) <= Date.now() && (state.deploymentId === deploymentId
        || !state.deploymentId && state.releaseRequestId === ownership.releaseRequestId), "deployment_unproven");
    return { targetId, deploymentId, commit: proof.commit, imageDigest: wanted, configDigest: proof.configDigest, schemaDigest: proof.schemaDigest };
  };
  const runtimeInspector = async ({ targetId, imageRepository, imageDigest: wanted }) => {
    check(targetId === stable().targetId, "target_changed");
    const proof = await imageInspector({ imageRepository, imageDigest: wanted });
    const ids = (await run("application_containers", `docker container ls -a --no-trunc --filter ${quote(`label=coolify.applicationId=${ownership.coolifyApplicationId}`)} --format '{{.ID}}'`)).trim().split(/\r?\n/).filter(Boolean);
    check(ids.length === 1 && hex.test(ids[0]), "application_container_conflict");
    const state = await json("deployed_container", `docker container inspect --format ${quote(containerFormat)} -- ${quote(ids[0])}`);
    check(state.id === ids[0] && state.applicationId === ownership.coolifyApplicationId && state.imageId === proof.imageId
      && state.running === true && state.releaseRequestId === ownership.releaseRequestId, "runtime_unproven");
    const configuration = await configurationInspector({ targetId });
    check(coolifyConfigurationDigest(configuration) === proof.configDigest, "runtime_configuration_changed");
    return { targetId, imageDigest: wanted, commit: proof.commit, tree: proof.tree, configDigest: proof.configDigest, schemaDigest: proof.schemaDigest };
  };
  const inspectCapacity = async manifest => {
    check(manifest?.deployment?.targetId === stable().targetId && releaseContract.releaseDigest(manifest) === ownership.manifestDigest, "target_changed");
    const host = await json("capacity", capacityCommand), queue = await json("deployment_queue", queueCommand);
    check(host.dockerAvailable === true && Number.isSafeInteger(host.diskBytes) && Number.isSafeInteger(host.memoryBytes)
      && Number.isFinite(host.load1) && host.diskBytes >= ownership.capacity.minDiskBytes
      && host.memoryBytes >= ownership.capacity.minMemoryBytes && host.load1 <= ownership.capacity.maxLoad1
      && queue.activeDeployments === 0, "capacity_unavailable");
    return { available: true, diskBytes: host.diskBytes, memoryBytes: host.memoryBytes, load1: host.load1, activeDeployments: 0 };
  };
  const ownedResource = (manifest, binding, id) => { bind(manifest, binding); const row = ownership.resources.find(item => item.resourceId === id);
    check(row, "resource_unregistered");
    check(row.kind !== "coolify_application" || row.id === ownership.targetId, "resource_identity_invalid");
    return Object.freeze({ resourceId: row.resourceId, kind: row.kind, id: row.id, createdAt: row.createdAt,
      ...(row.engine ? { engine: row.engine } : {}) }); };
  const resource = (manifest, binding, id) => { const registered = ownedResource(manifest, binding, id);
    check(registered.kind !== "coolify_application", "coolify_cleanup_gateway_required");
    const row = ownership.resources.find(item => item.resourceId === id);
    check(row.kind === "volume" ? /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(row.id) : hex.test(row.id), "resource_identity_invalid"); return row; };
  const inspectResource = async row => {
    const filter = row.kind === "volume" ? `name=^${row.id}$` : `id=${row.id}`;
    const names = (await run("resource_presence", `docker ${row.kind} ls ${row.kind === "container" ? "-a --no-trunc " : row.kind === "network" ? "--no-trunc " : ""}--filter ${quote(filter)} --format '{{.${row.kind === "volume" ? "Name" : "ID"}}}'`)).trim().split(/\r?\n/).filter(Boolean);
    if (!names.length) return null;
    check(names.length === 1 && names[0] === row.id, "resource_conflict");
    const format = row.kind === "container" ? containerFormat : `{"id":{{json .${row.kind === "volume" ? "Name" : "Id"}}},"createdAt":{{json .${row.kind === "volume" ? "CreatedAt" : "Created"}}},"applicationId":{{json (index .Labels "coolify.applicationId")}},"releaseId":{{json (index .Labels "roost.release-id")}},"attachments":${row.kind === "network" ? "{{len .Containers}}" : "0"}}`;
    const state = await json("resource_inspect", `docker ${row.kind} inspect --format ${quote(format)} -- ${quote(row.id)}`);
    check(state.id === row.id && state.applicationId === ownership.coolifyApplicationId && state.releaseId === ownership.releaseId
      && Date.parse(state.createdAt) === Date.parse(row.createdAt)
      && (row.kind === "container" ? state.running === false : state.attachments === 0), "resource_ownership_unproven");
    if (row.kind === "volume") check(!(await run("volume_users", `docker container ls -a --no-trunc --filter ${quote(`volume=${row.id}`)} --format '{{.ID}}'`)).trim(), "resource_in_use");
    return state;
  };
  const removeResource = async (manifest, binding, id) => {
    const row = resource(manifest, binding, id), present = await inspectResource(row);
    if (present) { await run("remove_resource", `docker ${row.kind} rm -- ${quote(row.id)}`); check(await inspectResource(row) === null, "resource_removal_uncertain"); }
    return { absenceVerified: true, resourceIds: [id] };
  };
  const reconcileResource = async (manifest, binding, id) => {
    const absent = await inspectResource(resource(manifest, binding, id)) === null;
    return { status: absent ? "succeeded" : "absent", evidence: { absenceVerified: true, resourcePresent: !absent, resourceIds: [id] } };
  };
  const inspectClone = async (manifest, binding) => {
    bind(manifest, binding); const root = ownership.canonicalDir;
    check(existsSync(root) && physicalIdentity(root) === ownership.cloneIdentity, "clone_identity_changed");
    const markerPath = path.join(root, ownership.cloneMarker.filename); physicalIdentity(markerPath, false);
    const bytes = readFileSync(markerPath); check(sha(bytes) === ownership.cloneMarker.digest && bytes.length <= 4096, "clone_provenance_unproven");
    let marker; try { marker = JSON.parse(bytes); } catch { fail("clone_provenance_unproven"); }
    check(marker.schemaVersion === "roost-release-clone-ownership-v1" && marker.releaseId === ownership.releaseId
      && marker.releaseRequestId === ownership.releaseRequestId && marker.applicationId === ownership.applicationId
      && marker.targetId === ownership.targetId && marker.repositoryUrl === ownership.repositoryUrl && marker.canonicalDir === root, "clone_provenance_unproven");
    const git = async args => { try {
      const argv = ["-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args];
      if(hasReleaseProcessScope())return (await runReleaseNativeProcess('git',{argv,cwd:root,durationMs:10000,maxBytes:131072,
        environment:{...minimalReleaseEnvironment(),GIT_OPTIONAL_LOCKS:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':os.devNull}})).toString('utf8').trim();
      return execFileSync("git", argv,
      { cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 1048576, encoding: "utf8",
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
          GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" }, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { fail("clone_git_unproven"); } };
    check(path.normalize(await git(["rev-parse", "--absolute-git-dir"])) === path.join(root, ".git")
      && await git(["config", "--get", "remote.origin.url"]) === ownership.repositoryUrl
      && await git(["rev-parse", "HEAD"]) === binding.commit && await git(["rev-parse", "HEAD^{tree}"]) === binding.candidateTree, "clone_git_changed");
    const changes = await git(["status", "--porcelain=v1", "--untracked-files=all", "--ignored=matching"]);
    check(changes === "", "clone_not_clean");
    let entries = 0;
    const walk = current => { for (const name of readdirSync(current)) { const file = path.join(current, name), stat = lstatSync(file);
      check(++entries <= 20000 && !stat.isSymbolicLink() && (stat.isDirectory() || stat.isFile() && stat.nlink === 1), "clone_foreign_entry");
      if (stat.isDirectory()) walk(file); } };
    walk(root); stable(); check(physicalIdentity(root) === ownership.cloneIdentity, "clone_identity_changed"); return root;
  };
  const cleanupLocal = async (manifest, binding) => { const root = await inspectClone(manifest, binding);
    // The external ownership ledger survives deletion; absence is read back after
    // an uncertain response. A partial/changed tree never qualifies for blind retry.
    rmSync(root, { recursive: true, force: false }); check(!existsSync(root), "clone_removal_uncertain"); return { localAbsent: true }; };
  const reconcileLocal = async (manifest, binding) => { bind(manifest, binding); if (!existsSync(ownership.canonicalDir)) return { status: "succeeded", evidence: { localAbsent: true } };
    await inspectClone(manifest, binding); return { status: "absent", evidence: { absenceVerified: true, localAbsent: false } }; };
  const verifyCleanup = async (manifest, binding) => { bind(manifest, binding); check(!existsSync(ownership.canonicalDir), "clone_present");
    for (const row of ownership.resources) { check(row.kind !== "coolify_application", "coolify_cleanup_gateway_required");
      check(await inspectResource(resource(manifest, binding, row.resourceId)) === null, "resource_present"); }
    return { localAbsent: true, absenceVerified: true, resourceIds: ownership.resources.map(row => row.resourceId) }; };
  return Object.freeze({ imageInspector, configurationInspector, deploymentInspector, runtimeInspector, inspectCapacity,
    ownedResource, assertClone: inspectClone, removeResource, reconcileResource, cleanupLocal, reconcileLocal, verifyCleanup });
}
