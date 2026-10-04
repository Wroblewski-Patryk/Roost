// Fixed recovery transport only. This entry point never imports the Worker
// runner, invokes a model, releases a Writer fence or reuses launch authority.
import { createPublicKey, verify } from "node:crypto";
import { readFileSync, lstatSync } from "node:fs";
import { lookup } from "node:dns/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { trustedPilotBytes } from "./lib/agent-host-trusted-pilot.mjs";
import { nativeDigest, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";
import { readDurableNativeReview } from "./lib/agent-host-native-review.mjs";
import { writerStateDirectory } from "./lib/agent-host-writer-lock.mjs";
import { assertDirectWorkspaceChild, validateConfiguredWorkspaceRoot, validateRepositoryMappings } from "./lib/agent-host-workspace-guard.mjs";
import { pinnedIpv4Lookup } from "./lib/agent-host-handoff-client.mjs";

const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const branch = z.string().min(1).max(200).refine(v => !/[\x00-\x20\x7f]/.test(v));
const relativePath = z.string().min(1).max(300).refine(v => !v.startsWith("/") && !v.includes("\\")
  && !v.split("/").some(p => !p || p === "." || p === ".." || p.toLowerCase() === ".git") && !/[\x00-\x1f\x7f:]/.test(v));
export const refusedRecoveryScopeSchema = z.object({ schemaVersion: z.literal("roost-refused-tracked-rollback-v1"),
  operation: z.literal("restore_task_changes"), executionId: id, workspaceId: id, taskId: id,
  applicationId: id, attempt: z.literal(1), reviewDigest: hash, rootIdentity: hash,
  baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), taskBranchDigest: hash, baseBranchDigest: hash,
  originDigest: hash, writeScopeDigest: hash, changedScopeDigest: hash }).strict();
export const refusedRecoveryGrantSchema = z.object({ payload: z.object({
  schemaVersion: z.literal("roost-refused-tracked-recovery-admission-v1"), operation: z.literal("restore_task_changes"),
  requestId: id, installationId: id, firstWriteDecisionId: id, ownerUserId: id, scope: refusedRecoveryScopeSchema,
  issuedAt: z.string().datetime(), expiresAt: z.string().datetime() }).strict(), signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
export const refusedRecoveryRequestSchema = z.object({ schemaVersion: z.literal("roost-refused-tracked-recovery-request-v1"),
  requestId: id, executionId: id, applicationSlug: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/),
  baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), taskBranch: branch,
  writePaths: z.array(relativePath).min(1).max(64).refine(v => new Set(v.map(p => p.toLowerCase())).size === v.length),
  signed: refusedRecoveryGrantSchema.optional() }).strict();
const rollbackResultSchema = z.object({ schemaVersion: z.literal("roost-refused-tracked-rollback-v1"), completed: z.literal(true),
  replay: z.boolean(), executionId: id, reviewDigest: hash, journalDigest: hash, archivedFileCount: z.number().int().nonnegative(),
  restoredFileCount: z.number().int().nonnegative(), baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), cleanBaseBranch: z.literal(true),
  taskBranchRemoved: z.literal(true), writerLeaseRetained: z.literal(true), releaseAllowed: z.literal(false),
  executionAuthorized: z.literal(false), modelsInvoked: z.literal(false), remoteEffects: z.literal(false) }).strict();
const equal = (a, b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const sameReceipt = (a, b) => equal({ ...rollbackResultSchema.parse(a), replay: false }, { ...rollbackResultSchema.parse(b), replay: false });
const fail = code => { throw new Error(`refused_tracked_recovery_${code}`); };

export function validateRefusedRecoveryGrant(signed, { request, installation, scope, now = Date.now() }) {
  try {
    const record = refusedRecoveryGrantSchema.parse(signed), p = record.payload;
    const key = createPublicKey(installation.authorityPublicKey);
    if (key.asymmetricKeyType !== "ed25519" || !verify(null, trustedPilotBytes(p), key, Buffer.from(record.signature, "hex"))
      || p.requestId !== request.requestId || p.installationId !== installation.installationId
      || p.scope.executionId !== request.executionId || p.scope.workspaceId !== installation.workspaceId
      || p.scope.baselineCommit !== request.baselineCommit || !equal(p.scope, scope)) fail("authority_unproven");
    const start = Date.parse(p.issuedAt), end = Date.parse(p.expiresAt);
    if (!Number.isFinite(now) || start > now || end <= now || end <= start || end - start > 300000) fail("authority_expired");
    return p;
  } catch { fail("authority_unproven"); }
}

function outside(root, file) {
  const rel = path.relative(root, path.resolve(file));
  if (!rel || (!path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + path.sep))) fail("private_file_in_checkout");
}
function boundedJson(file, maximum) {
  const identity = physicalIdentity(file, false), before = lstatSync(file, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size < 2n || before.size > BigInt(maximum)) fail("file_invalid");
  const bytes = readFileSync(file), after = lstatSync(file, { bigint: true });
  if (bytes.length !== Number(before.size) || before.ino !== after.ino || before.dev !== after.dev
    || before.size !== after.size || before.mtimeNs !== after.mtimeNs || physicalIdentity(file, false) !== identity) fail("file_changed");
  try { return JSON.parse(bytes.toString("utf8")); } catch { fail("file_invalid"); }
}

// The request cannot choose a checkout, authority key, native journal or URL.
// These come exclusively from the operator's existing installation config.
export function refusedRecoveryBinding(config, request, installation, stateDirectory = writerStateDirectory) {
  try {
    const parsed = refusedRecoveryRequestSchema.parse(request);
    if (config.executionMode !== "supervised" || config.sandbox !== "workspace-write") fail("configuration_invalid");
    const origin = new URL(config.baseUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) fail("configuration_invalid");
    const repositories = validateRepositoryMappings(config.repositories), repository = repositories[parsed.applicationSlug];
    if (!repository || !id.safeParse(installation.installationId).success || !id.safeParse(installation.workspaceId).success
      || installation.qualification !== "signed_native_v1" || installation.schemaVersion !== "roost-trusted-provider-pilot-v1") fail("configuration_invalid");
    const repositoryPath = assertDirectWorkspaceChild(path.resolve(validateConfiguredWorkspaceRoot(config.workspaceRoot)),
      path.join(config.workspaceRoot, repository.directory));
    const directory = path.join(stateDirectory, `native-review-${parsed.executionId}`);
    outside(repositoryPath, directory);
    return { request: parsed, options: { directory, repositoryPath, baselineCommit: parsed.baselineCommit,
      taskBranch: parsed.taskBranch, baseBranch: repository.baseBranch, origin: repository.originUrl, writePaths: parsed.writePaths },
      installation, baseUrl: origin.origin };
  } catch { fail("configuration_invalid"); }
}

export async function recoveryStatusExchange({ baseUrl, executionId, requestId, apiKey, receipt }) {
  try {
    if (!/^cc_v1_[A-Za-z0-9_-]{32}$/.test(apiKey ?? "") || !id.safeParse(executionId).success || !id.safeParse(requestId).success) fail("status_unproven");
    const origin = new URL(baseUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) fail("status_unproven");
    const addresses = await lookup(origin.hostname, { all: true, family: 4, verbatim: true });
    if (!addresses.length || addresses.length > 16) fail("status_unproven");
    // Validate every DNS result, then fix this connection to one public address.
    for (const address of addresses) pinnedIpv4Lookup(address.address);
    const payload = JSON.stringify({ requestId, ...(receipt === undefined ? {} : { receipt: rollbackResultSchema.parse(receipt) }) });
    return await new Promise((resolve, reject) => {
      const request = https.request({ protocol: "https:", hostname: origin.hostname, servername: origin.hostname,
        port: origin.port || "443", path: `/v1/agent-runtime/executions/${executionId}/actions/refused-tracked-recovery-${receipt === undefined ? "status" : "result"}`,
        method: "POST", agent: false, lookup: pinnedIpv4Lookup(addresses[0].address), rejectUnauthorized: true,
        minVersion: "TLSv1.2", maxHeaderSize: 8192, headers: { "X-API-Key": apiKey, "Content-Type": "application/json",
          Accept: "application/json", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(payload) } }, response => {
        if (response.statusCode !== 200 || response.headers.location || response.headers["content-encoding"]) {
          response.destroy(); reject(new Error()); return;
        }
        let size = 0; const chunks = [];
        response.on("data", chunk => { size += chunk.length; if (size > 32768) { response.destroy(); reject(new Error()); } else chunks.push(chunk); });
        response.on("end", () => { try { const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!value?.data || typeof value.data !== "object") throw new Error(); resolve(value.data); } catch { reject(new Error()); } });
        response.on("error", () => reject(new Error()));
      });
      const timer = setTimeout(() => { request.destroy(); reject(new Error()); }, 10000);
      request.once("close", () => clearTimeout(timer));
      request.on("error", () => reject(new Error()));
      request.end(payload);
    });
  } catch { fail("status_unproven"); }
}

export async function runRefusedTrackedRecovery({ mode, binding, apiKey, inspect, rollback,
  exchange = recoveryStatusExchange, now = () => Date.now(), onCheckpoint = () => {}, readReview = readDurableNativeReview }) {
  if (!["inspect", "restore"].includes(mode)) fail("mode_invalid");
  const request = refusedRecoveryRequestSchema.parse(binding.request);
  const scope = refusedRecoveryScopeSchema.parse(await inspect(binding.options));
  if (scope.executionId !== request.executionId || scope.workspaceId !== binding.installation.workspaceId
    || scope.baselineCommit !== request.baselineCommit || request.taskBranch !== `codex/task-${scope.taskId}`) fail("scope_mismatch");
  if (mode === "inspect") {
    // The closed native chain was validated by inspect above. Reread its exact
    // immutable signed review to expose names of actual changes, never source
    // bytes or the broader permission list as if every allowed path changed.
    const review = await readReview(binding.options.directory), changes = review?.payload?.privateChanges;
    if (review?.digest !== scope.reviewDigest || !Array.isArray(changes) || !changes.length || changes.length > 64
      || nativeDigest(changes) !== scope.changedScopeDigest) fail("scope_changed");
    const paths = z.array(relativePath).min(1).max(64).parse(changes.map(change => change.path));
    if (new Set(paths.map(p => p.toLowerCase())).size !== paths.length
      || paths.some(p => !request.writePaths.some(allowed => p === allowed || p.startsWith(allowed + "/")))) fail("scope_changed");
    return { schemaVersion: "roost-refused-tracked-recovery-inspection-v1", requestId: request.requestId,
      installationId: binding.installation.installationId, scope, paths, writePaths: request.writePaths };
  }
  validateRefusedRecoveryGrant(request.signed, { request, installation: binding.installation, scope, now: now() });
  let recordedReceipt;
  const validateStatus = (status, observedScope) => {
    if (!status || status.active !== true || !["active,signed", "active,receipt,signed"].includes(Object.keys(status).sort().join(","))
      || !equal(status.signed, request.signed)) fail("status_unproven");
    validateRefusedRecoveryGrant(status.signed, { request, installation: binding.installation, scope: observedScope, now: now() });
    if (status.receipt !== undefined) recordedReceipt = rollbackResultSchema.parse(status.receipt);
  };
  const assertOwnerAuthority = async observedScope => {
    if (!equal(observedScope, scope)) fail("scope_changed");
    const signed = request.signed;
    const payload = validateRefusedRecoveryGrant(signed, { request, installation: binding.installation, scope: observedScope, now: now() });
    const status = await exchange({ baseUrl: binding.baseUrl, executionId: request.executionId, requestId: request.requestId, apiKey });
    validateStatus(status, observedScope);
    return payload;
  };
  await assertOwnerAuthority(scope);
  const result = rollbackResultSchema.parse(await rollback({ ...binding.options, assertOwnerAuthority, onCheckpoint }));
  if (result.executionId !== request.executionId || result.reviewDigest !== scope.reviewDigest
    || result.baselineCommit !== request.baselineCommit) fail("completion_unproven");
  // A completed disposition is never undone or repeated because publication
  // failed. After an uncertain POST, read its actual server state once. This
  // command issues neither another source operation nor a blind POST retry.
  if (recordedReceipt !== undefined) {
    if (!sameReceipt(recordedReceipt, result)) fail("result_conflict");
  } else {
    try {
      const published = await exchange({ baseUrl: binding.baseUrl, executionId: request.executionId,
        requestId: request.requestId, apiKey, receipt: result });
      if (!published || published.recorded !== true || typeof published.replay !== "boolean"
        || Object.keys(published).sort().join(",") !== "receipt,recorded,replay" || !sameReceipt(published.receipt, result)) fail("result_unconfirmed");
    } catch {
      const status = await exchange({ baseUrl: binding.baseUrl, executionId: request.executionId, requestId: request.requestId, apiKey });
      validateStatus(status, scope);
      if (recordedReceipt === undefined || !sameReceipt(recordedReceipt, result)) fail("result_unconfirmed");
    }
  }
  // The caller never emits raw recovery journals, paths, or exception details.
  return { schemaVersion: "roost-refused-tracked-recovery-result-v1", requestId: request.requestId,
    installationId: binding.installation.installationId, executionId: request.executionId, scope,
    receipt: result, recorded: true, nativeReconciliationRequired: true };
}

export async function main(environment = process.env, argv = process.argv.slice(2)) {
  if (process.platform !== "win32" || argv.length !== 1 || !["inspect", "restore"].includes(argv[0])) fail("entrypoint_invalid");
  const configPath = environment.ROOST_AGENT_HOST_CONFIG, requestPath = environment.ROOST_REFUSED_TRACKED_RECOVERY_REQUEST;
  if (!configPath || !requestPath || !path.isAbsolute(configPath) || !path.isAbsolute(requestPath)) fail("binding_missing");
  const config = boundedJson(configPath, 65536), request = boundedJson(requestPath, 32768);
  const installation = boundedJson(path.join(writerStateDirectory, "trusted-provider-pilot", "installation.json"), 65536);
  const binding = refusedRecoveryBinding(config, request, installation);
  outside(binding.options.repositoryPath, configPath); outside(binding.options.repositoryPath, requestPath);
  const recovery = await import("./lib/agent-host-refused-tracked-rollback.mjs");
  const result = await runRefusedTrackedRecovery({ mode: argv[0], binding, apiKey: environment.ROOST_AGENT_API_KEY,
    inspect: recovery.inspectRefusedTrackedRollbackScope, rollback: recovery.rollbackRefusedTrackedCandidate });
  process.stdout.write(JSON.stringify(result) + "\n");
  if (argv[0] === "restore" && result.receipt?.completed !== true) fail("completion_unproven");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write((/^refused_tracked_recovery_[a-z_]+$/.test(error?.message ?? "")
    ? error.message : "refused_tracked_recovery_blocked") + "\n"); process.exitCode = 1; });
}
