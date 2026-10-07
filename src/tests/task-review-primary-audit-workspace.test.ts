import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync, lstatSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { taskReviewView } from "../modules/agent-runtime/task-review";

const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
const nativeReview = loadESM(pathToFileURL(path.resolve("scripts/lib/agent-host-code-reviewer-prior-audit.mjs")).href);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const h = (n: number) => String(n).repeat(64), stamp = "2026-01-01T00:00:00.000Z";
const serialized = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function fixture() {
  const roles: any = { schemaVersion: "roost-task-roles-v1" };
  for (const [name, n] of Object.entries({ requester: 10, accountableManager: 11, executor: 6, verifier: 12, releaser: 13 })) roles[name] = { id: id(n), revision: stamp };
  const contract = { taskRoles: roles, assignment: { agentId: id(6), competencies: ["application audit"] },
    access: { sandbox: "read-only", externalWrites: false, tools: ["repository_read"], permissions: ["repository_read"] },
    modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" },
    singleTask: { branch: "codex/task-example", accountableManager: roles.accountableManager },
    context: { company: [], product: [], technical: [] },
    nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" }, readPaths: ["src/example.ts"], readFragments: [] } };
  const audit: any = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: h(1), preTree: h(2), postTree: h(2),
    processState: "unchanged", dockerState: "unchanged", gitState: "unchanged", nativeTools: [],
    processCoverage: "listening_tcp_plus_owned_job_zero_processes", dockerCoverage: "running_container_list" };
  audit.digest = createHash("sha256").update(JSON.stringify(audit)).digest("hex");
  const prior: any = { id: id(1), taskId: id(2), workspaceId: id(3), applicationId: id(4), agentHostId: id(5), status: "completed", attempt: 1, checkpointVersion: 3,
    completedAt: stamp, contextInvalidatedAt: null, errorState: null, leaseToken: null, leaseExpiresAt: null, changedFiles: [],
    finalResponse: "CHANGES_REQUIRED: supplied evidence needs correction; no runtime authority.",
    metadata: { executionContract: contract, resultRevisionReviewVersion: "1",
      readyContextPin: { pinId: id(8), revision: h(3), compositionSeal: h(4), riskAdmissionSeal: h(5), riskAdmissionCommit: "a".repeat(40) },
      resultRevision: { schemaVersion: "roost-result-revision-v1", id: id(9), executionId: id(1), hostId: id(5), attempt: 1, checkpointVersion: 3,
        observedAt: stamp, branch: "codex/task-example", commit: "a".repeat(40), workingTree: "clean" } },
    verification: { readOnlyAudit: audit, managedAdmission: { revision: 3, decisionId: id(14), qualification: "signed_native_v1", evidenceDigest: h(6), jobSourceDigest: h(7) },
      ownedTreeReceipt: { version: "roost-windows-job-v2", attempt: id(1), type: "receipt", job: id(15), assignedBeforeResume: true, killOnClose: true,
        breakaway: false, controllerInJob: true, inheritedJob: true, rootPid: 100, rootCreationTime: "123456789012345678", launcherPid: 101,
        launcherCreationTime: "123456789012345677", resumed: true, rootExit: 0, activeProcesses: 0, jobClosed: true, cleanup: true, cleanupMs: 0,
        stdoutBytes: 100, stderrBytes: 0, terminationReason: "root_exit", resumeReceipt: h(8), executableDigest: h(9), launcherSha256: "b".repeat(64), sourceSha256: h(7) } } };
  const material: any = { executionId: prior.id, taskId: prior.taskId, applicationId: prior.applicationId, attempt: prior.attempt, checkpointVersion: prior.checkpointVersion,
    pin: prior.metadata.readyContextPin, contract, verification: prior.verification, resultRevision: prior.metadata.resultRevision,
    completedAt: prior.completedAt, changedFiles: prior.changedFiles, finalResponse: prior.finalResponse };
  return { prior: serialized(prior), material: serialized(material), materialVersion: "c".repeat(64) };
}

// Every DB call stays on this explicit in-memory seam. Exercise the real
// lock/scoped lookup, role/principal/review state and final DTO projection.
function scopedDb(f: ReturnType<typeof fixture>) {
  const e = { ...f.prior, completedAt: new Date(f.prior.completedAt) }, c = f.material.contract, workspaceId = e.workspaceId, calls: string[] = [];
  const task = { id: e.taskId, workspaceId, title: "Fixture audit", updatedAt: new Date(stamp), assignedWorkforceEntityId: c.assignment.agentId,
    executionReadiness: { ...f.material.pin, requestedByType: "user", requestedById: c.taskRoles.requester.id },
    executionRoleProvenance: { schemaVersion: "roost-role-provenance-v1", requesterUserId: c.taskRoles.requester.id, originatingSubmissionId: id(30),
      authors: [{ kind: "user", id: c.taskRoles.requester.id }, { kind: "agent", id: c.assignment.agentId }] } };
  const workers = ["accountableManager", "executor", "verifier", "releaser"].map(name => ({ id: c.taskRoles[name].id, workspaceId, type: "agent", status: "active", source: "roost",
    externalId: null, role: "Fixture specialist", name: "Fixture specialist", skillIndex: c.assignment.competencies,
    authorityScope: ["task_accountability", "task_verification", "release_authorization"], updatedAt: new Date(c.taskRoles[name].revision) }));
  const actor: any = { authType: "api_key", apiKeyId: id(31), agentId: c.taskRoles.verifier.id, credentialVersion: 1, workspaceId };
  const db: any = {
    $executeRaw: async () => 1,
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join("?"); calls.push(sql);
      if (sql.includes("task_review_material(e) AS material")) return [{ material: f.material, version: f.materialVersion }];
      if (sql.includes("native_capability_blocked")) return [{ blocked: false }];
      if (sql.includes("task_capability_status(g)")) return [{ id: id(32), operation: "review_decision", status: "active" }];
      if (sql.includes("FOR UPDATE") || sql.includes("native_capability_suspensions") || sql.includes("task_decision_effects")) return [];
      throw Error("Unexpected test DB query");
    },
    task: { findFirst: async ({ where }: any) => where.id === task.id && where.workspaceId === workspaceId ? task : null },
    agentExecution: { findFirst: async ({ where }: any) => where.workspaceId === workspaceId && where.taskId === e.taskId ? e : null },
    taskReviewDecision: { findFirst: async () => null, findMany: async () => [] },
    workspaceMembership: { findFirst: async ({ where }: any) => where.workspaceId === workspaceId && where.userId === c.taskRoles.requester.id
      ? { id: id(33), workspaceId, userId: where.userId, role: "owner", updatedAt: new Date(c.taskRoles.requester.revision) } : null },
    workforceEntity: { findFirst: async ({ where }: any) => workers.find(w => w.id === where.id && w.workspaceId === where.workspaceId) ?? null, findMany: async () => workers },
    apiKey: { findFirst: async ({ where }: any) => where.id === actor.apiKeyId && where.workspaceId === workspaceId ? { id: actor.apiKeyId, active: true, revokedAt: null,
      expiresAt: new Date(Date.now() + 3600000), credentialVersion: 1, boundAgentId: actor.agentId, scopes: ["agent-runtime:write"], keyPrefix: "fixture",
      boundAgent: workers.find(w => w.id === actor.agentId) } : null }
  };
  return { db, actor, task, calls };
}

function profile(f: ReturnType<typeof fixture>, view: any) {
  const e = f.prior, revision = f.material.resultRevision, repositoryEvidence = { head: revision.commit, branch: revision.branch, tree: e.verification.readOnlyAudit.preTree };
  const inspection = { kind: "code-reviewer", verifiedTaskId: e.taskId, verifiedExecutionId: e.id, verifiedEvidenceDigest: view.materialVersion,
    baselineCommit: revision.commit, reviewedCommit: revision.commit, priorAudit: { executionId: e.id, receiptDigest: e.verification.readOnlyAudit.digest } };
  const claimed = { id: id(40), taskId: id(41), workspaceId: e.workspaceId, applicationId: e.applicationId, agentHostId: e.agentHostId };
  const contract = { access: structuredClone(e.metadata.executionContract.access), assignment: { agentId: e.metadata.executionContract.taskRoles.verifier.id },
    singleTask: { branch: revision.branch }, nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: inspection } };
  return { inspection, repositoryEvidence, claimed, contract };
}

async function matchPrimary(f: ReturnType<typeof fixture>, view: any) {
  const api = await nativeReview, options = profile(f, view), packet = api.verifiedCodeReviewerPriorAudit(serialized(f.prior), options);
  const reviewed = api.qualifyPrimaryReadOnlyReviewMaterial(serialized(view), options.inspection, options.repositoryEvidence);
  return api.primaryReadOnlyReviewMatches(reviewed, packet, { inspection: options.inspection, repositoryEvidence: options.repositoryEvidence,
    identity: options.claimed, reviewerAgentId: options.contract.assignment.agentId });
}

test("scoped locked task workspace survives normal serialized DTO and binds primary auditor evidence", async () => {
  const f = fixture(), s = scopedDb(f), view: any = serialized(await taskReviewView(s.db, f.prior.workspaceId, f.prior.taskId, s.actor));
  assert.deepEqual(view.task, { id: f.prior.taskId, title: s.task.title, workspaceId: f.prior.workspaceId });
  assert.equal(view.canReview, true); assert.equal(view.reason, null); assert.equal(await matchPrimary(f, view), true);
  assert.deepEqual(view.executionChronology, { schemaVersion: "roost-task-review-execution-chronology-v1", executionId: f.prior.id,
    materialVersion: f.materialVersion, completedAt: f.prior.completedAt });
  assert.ok(s.calls.some(sql => sql.includes("task_review_material(e)")));
});

test("missing/wrong workspace cannot match immutable prior audit; legacy task id/title consumers still work", async () => {
  const f = fixture(), s = scopedDb(f), view: any = serialized(await taskReviewView(s.db, f.prior.workspaceId, f.prior.taskId, s.actor));
  const legacy = (({ id: taskId, title }: any) => ({ id: taskId, title }))(view.task);
  assert.deepEqual(legacy, { id: f.prior.taskId, title: s.task.title });
  const absent = structuredClone(view); delete absent.task.workspaceId;
  await assert.rejects(matchPrimary(f, absent), /code_reviewer_prior_audit_invalid/);
  const wrong = structuredClone(view); wrong.task.workspaceId = id(99);
  assert.equal(await matchPrimary(f, wrong), false);
});

test("same task ID in another workspace and missing task are not found before any result projection", async () => {
  const f = fixture(), s = scopedDb(f);
  assert.deepEqual(await taskReviewView(s.db, id(99), f.prior.taskId, { ...s.actor, workspaceId: id(99) }), { error: "task_not_found" });
  assert.deepEqual(await taskReviewView(s.db, f.prior.workspaceId, id(98), s.actor), { error: "task_not_found" });
  assert.equal(s.calls.some(sql => sql.includes("task_review_material(e)")), false);
});

test("typed database UTC chronology witness resolves naive SQL material without changing raw result or material CAS", async () => {
  const f = fixture(); f.material.completedAt = f.prior.completedAt.slice(0, -1);
  const raw = JSON.stringify(f.material), s = scopedDb(f), view: any = serialized(await taskReviewView(s.db, f.prior.workspaceId, f.prior.taskId, s.actor));
  assert.equal(JSON.stringify(view.result), raw); assert.equal(view.materialVersion, f.materialVersion);
  assert.equal(view.executionChronology.completedAt, f.prior.completedAt);
  assert.equal(await matchPrimary(f, view), true);
});

function pinnedFixture(file: string, expected: string) {
  assert.match(expected, /^[a-f0-9]{64}$/);
  const before = lstatSync(file); assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= 1048576);
  const bytes = readFileSync(file), after = lstatSync(file);
  assert.equal(sha256(bytes), expected); assert.equal(after.ino, before.ino); assert.equal(after.mtimeMs, before.mtimeMs); assert.equal(bytes.length, before.size);
  return JSON.parse(bytes.toString("utf8"));
}
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const storedViewFile = process.env.ROOST_PRIMARY_AUDIT_STORED_VIEW, storedExecutionFile = process.env.ROOST_PRIMARY_AUDIT_STORED_EXECUTION;
test("selected actual stored serialized auditor receipt and review DTO bind primary native material offline", {
  skip: !storedViewFile || !storedExecutionFile ? "Select external immutable normal fixtures; no private data is stored in source" : false
}, async () => {
  const captured = pinnedFixture(storedViewFile!, process.env.ROOST_PRIMARY_AUDIT_STORED_VIEW_SHA256 ?? ""),
    terminal = pinnedFixture(storedExecutionFile!, process.env.ROOST_PRIMARY_AUDIT_STORED_EXECUTION_SHA256 ?? ""), prior = terminal.execution;
  assert.equal(captured.record.result.executionId, prior.id); assert.deepEqual(captured.record.result.verification, prior.verification);
  assert.deepEqual(captured.record.result.contract, prior.metadata.executionContract);
  const f = { prior, material: captured.record.result, materialVersion: captured.record.materialVersion }, s = scopedDb(f),
    view: any = serialized(await taskReviewView(s.db, prior.workspaceId, prior.taskId, s.actor));
  assert.equal(view.task.workspaceId, prior.workspaceId); assert.equal(view.canReview, true); assert.equal(await matchPrimary(f, view), true);
});
