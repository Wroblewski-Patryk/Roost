import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { completedResultBasisEligibility } from "../modules/agent-runtime/completed-result-basis";

const migration = "20261006002000_readonly_completed_result_basis";
const ddl = readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8");
const hash = (c = "a") => c.repeat(64);
function fixture() {
  const id = randomUUID(), taskId = randomUUID(), applicationId = randomUUID(), host = randomUUID(), agent = randomUUID();
  const contract: any = { singleTask: { branch: `codex/task-${taskId}`, applicationId },
    assignment: { agentId: agent }, taskRoles: { executor: { id: agent } },
    nativeBoundary: { profile: "inspect-readonly", inspectReadOnly: { kind: "auditor" }, runtime: { required: false, ports: [] } },
    access: { sandbox: "read-only", tools: ["repository_read"], permissions: ["repository_read"], externalWrites: false },
    modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" } };
  const verification: any = { outcome: "candidate_result", managedAdmission: { qualification: "signed_native_v1", evidenceDigest: hash(), jobSourceDigest: hash() },
    ownedTreeReceipt: { version: "roost-windows-job-v2", sourceSha256: hash(), attempt: id, cleanup: true, jobClosed: true,
      rootExit: 0, activeProcesses: 0, assignedBeforeResume: true, resumed: true, killOnClose: true, breakaway: false },
    readOnlyAudit: { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: hash(), preTree: hash(), postTree: hash(),
      gitState: "unchanged", processState: "unchanged", dockerState: "unchanged", nativeTools: [] } };
  const execution: any = { id, taskId, applicationId, agentHostId: host, attempt: 1, checkpointVersion: 3, status: "completed",
    completedAt: new Date("2026-01-01T12:05:00.000Z"), prompt: "Inspect only supplied fictional source and preserve the verdict", baseBranch: "main",
    summary: "RELEASE READINESS FINDING: CHANGES_REQUIRED", finalResponse: "RELEASE READINESS FINDING: CHANGES_REQUIRED\nRequired future runtime evidence remains absent.",
    changedFiles: [], verification, metadata: { executionContract: contract,
      readyContextPin: { pinId: randomUUID(), revision: hash(), riskAdmissionCommit: "b".repeat(40) }, resultRevisionReviewVersion: "1",
      resultRevision: { schemaVersion: "roost-result-revision-v1", id: randomUUID(), commit: "c".repeat(40), branch: contract.singleTask.branch,
        workingTree: "clean", executionId: id, attempt: 1, hostId: host, checkpointVersion: 3, observedAt: "2026-01-01T12:05:00.000Z" } } };
  const risk = randomUUID(), pin: any = { schemaVersion: "roost-ready-context-v1", status: "ready", pinId: randomUUID(), revision: hash("d"),
    applicationId, validatedAt: "2026-01-01T12:10:00.000Z", contract: structuredClone(contract), prompt: execution.prompt, baseBranch: execution.baseBranch,
    riskAdmissionCommit: execution.metadata.readyContextPin.riskAdmissionCommit, riskAssessmentId: risk, riskAdmissionSeal: hash("e"),
    procedureComposition: { seal: hash("f") }, validation: { validator: "execution-packet-v1", revision: hash("d") } };
  return { execution, pin, risk };
}
const mutations: Record<string, (f: ReturnType<typeof fixture>) => void> = {
  "coding profile": f => f.execution.metadata.executionContract.nativeBoundary.profile = "coding-local",
  "code reviewer role": f => f.execution.metadata.executionContract.nativeBoundary.inspectReadOnly.kind = "code-reviewer",
  "write sandbox": f => f.execution.metadata.executionContract.access.sandbox = "workspace-write",
  "write tool": f => f.execution.metadata.executionContract.access.tools.push("repository_write"),
  "write permission": f => f.execution.metadata.executionContract.access.permissions.push("repository_write"),
  "external writes": f => f.execution.metadata.executionContract.access.externalWrites = true,
  "runtime requested": f => f.execution.metadata.executionContract.nativeBoundary.runtime.required = true,
  "runtime port": f => f.execution.metadata.executionContract.nativeBoundary.runtime.ports.push(3000),
  "different executor": f => f.execution.metadata.executionContract.taskRoles.executor.id = randomUUID(),
  "invalid principal": f => f.execution.metadata.executionContract.assignment.agentId = "not-an-agent",
  "local model": f => f.execution.metadata.executionContract.modelSelection.backend = "local",
  "unsigned": f => f.execution.verification.managedAdmission.qualification = "unsigned",
  "unbound source": f => f.execution.verification.ownedTreeReceipt.sourceSha256 = hash("f"),
  "wrong job version": f => f.execution.verification.ownedTreeReceipt.version = "legacy",
  "wrong attempt": f => f.execution.verification.ownedTreeReceipt.attempt = randomUUID(),
  "open job": f => f.execution.verification.ownedTreeReceipt.jobClosed = false,
  "active child": f => f.execution.verification.ownedTreeReceipt.activeProcesses = 1,
  "failed exit": f => f.execution.verification.ownedTreeReceipt.rootExit = 1,
  "unassigned": f => f.execution.verification.ownedTreeReceipt.assignedBeforeResume = false,
  "not resumed": f => f.execution.verification.ownedTreeReceipt.resumed = false,
  "breakaway": f => f.execution.verification.ownedTreeReceipt.breakaway = true,
  "negative outcome": f => f.execution.verification.outcome = "boundary_violation",
  "changed tree": f => f.execution.verification.readOnlyAudit.postTree = hash("f"),
  "changed process": f => f.execution.verification.readOnlyAudit.processState = "changed",
  "changed Docker": f => f.execution.verification.readOnlyAudit.dockerState = "changed",
  "changed Git": f => f.execution.verification.readOnlyAudit.gitState = "changed",
  "native tool": f => f.execution.verification.readOnlyAudit.nativeTools.push("shell"),
  "malformed digest": f => f.execution.verification.readOnlyAudit.evidenceDigest = "bad",
  "error": f => f.execution.errorState = { code: "failed" },
  "lease": f => f.execution.leaseToken = "fictional-lease",
  "changed file": f => f.execution.changedFiles = ["fictional.txt"],
  "invalidated": f => f.execution.contextInvalidatedAt = new Date(),
  "dirty revision": f => f.execution.metadata.resultRevision.workingTree = "dirty",
  "bad revision UUID": f => f.execution.metadata.resultRevision.id = "bad",
  "wrong checkpoint": f => f.execution.metadata.resultRevision.checkpointVersion = 2,
  "wrong host": f => f.execution.metadata.resultRevision.hostId = randomUUID(),
  "nonfinite date": f => f.execution.metadata.resultRevision.observedAt = "infinity"
};
test("readonly basis eligibility preserves negative semantic/native history without fabricated coding tests or release", () => {
  const f = fixture(), before = structuredClone(f.execution);
  assert.equal(completedResultBasisEligibility(f.execution, f.pin), null);
  assert.equal(f.execution.verification.codingTests, undefined);
  assert.deepEqual(f.execution, before);
  assert.equal(f.execution.summary, "RELEASE READINESS FINDING: CHANGES_REQUIRED");
});
for (const [name, mutate] of Object.entries(mutations)) test(`readonly result refuses ${name}`, () => {
  const f = fixture(); mutate(f); assert.equal(completedResultBasisEligibility(f.execution, f.pin), "completed_result_native_unproven");
});

// Explicit root opt-in only, on the documented already-running test container:
// ROOST_READONLY_RESULT_BASIS_DATABASE_TEST=1
// ROOST_MIGRATION_TEST_POSTGRES_CONTAINER=<existing disposable Postgres container>
// node node_modules/tsx/dist/cli.mjs --test src/tests/completed-readonly-result-basis-database.test.ts
// Only an owned uniquely named database is created/dropped. No Docker startup,
// models, services, production connections or installation identifiers occur.
test("forward PostgreSQL auditor mapping retains coding/context guards and immutable native history", {
  skip: process.env.ROOST_READONLY_RESULT_BASIS_DATABASE_TEST !== "1"
}, () => {
  const container = process.env.ROOST_MIGRATION_TEST_POSTGRES_CONTAINER;
  assert.ok(container, "Use the documented existing disposable PostgreSQL container");
  assert.match(container, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/);
  const user = process.env.ROOST_MIGRATION_TEST_POSTGRES_USER ?? "companycore", database = "roost_test_readonly_basis_" + randomUUID().replaceAll("-", "");
  const docker = ["exec", "-i", container], args = [...docker, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database];
  const q = (v: string) => "'" + v.replaceAll("'", "''") + "'", json = (v: unknown) => q(JSON.stringify(v)) + "::jsonb";
  const sql = (s: string) => execFileSync("docker", args, { input: s, encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 }).trim();
  let created = false;
  try {
    execFileSync("docker", [...docker, "createdb", "-U", user, database], { windowsHide: true, timeout: 30000 }); created = true;
    sql(readdirSync("prisma/migrations").filter(n => /^\d/.test(n) && n < migration).sort().map(n => readFileSync(`prisma/migrations/${n}/migration.sql`, "utf8")).join("\n"));
    const original = sql("SELECT pg_get_functiondef('completed_result_basis_guard()'::regprocedure);"), unchanged = ["task_review_material_original", "completed_result_native_immutable", "completed_result_review_blocks_revalidation", "completed_result_basis_current", "task_review_material"];
    const signatures: Record<string, string> = { task_review_material_original: "agent_executions", completed_result_native_immutable: "", completed_result_review_blocks_revalidation: "agent_executions", completed_result_basis_current: "agent_executions", task_review_material: "agent_executions" };
    const prior = Object.fromEntries(unchanged.map(n => [n, sql(`SELECT pg_get_functiondef('${n}(${signatures[n]})'::regprocedure);`)]));
    sql("BEGIN;" + ddl.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, "") + "ROLLBACK;");
    assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname='completed_result_readonly_native_valid';"), "0");
    assert.equal(sql("SELECT pg_get_functiondef('completed_result_basis_guard()'::regprocedure);"), original);
    sql(ddl);
    for (const n of unchanged) assert.equal(sql(`SELECT pg_get_functiondef('${n}(${signatures[n]})'::regprocedure);`), prior[n]);
    const after = sql("SELECT pg_get_functiondef('completed_result_basis_guard()'::regprocedure);"), marker = " IF e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1'", end = "THEN RAISE EXCEPTION 'completed_result_native_unproven'; END IF;", start = original.indexOf(marker), finish = original.indexOf(end, start) + end.length;
    assert.ok(start >= 0 && finish > start); assert.ok(after.includes(original.slice(start, finish)), "Original complete coding native guard remains verbatim");

    const f = fixture(), e = f.execution, workspace = randomUUID(), owner = randomUUID(), outsider = randomUUID();
    const context = { risk: f.risk, admission: { seal: f.pin.riskAdmissionSeal, expiresAt: new Date(Date.now() + 3600000).toISOString() }, composition: { seal: f.pin.procedureComposition.seal }, finding: true, interview: false, suspension: false };
    // Historical synthetic prerequisites alone bypass old governance triggers.
    // Context functions below are test-only deterministic seams in this owned DB;
    // the new trigger/common checks/native immutability stay enabled for proofs.
    sql(`CREATE TABLE readonly_basis_test_context(value jsonb);INSERT INTO readonly_basis_test_context VALUES(${json(context)});
CREATE OR REPLACE FUNCTION task_admission_view(t uuid,op text) RETURNS jsonb LANGUAGE SQL STABLE AS 'SELECT value->''admission'' FROM readonly_basis_test_context';
CREATE OR REPLACE FUNCTION task_composition(t uuid,op text,use_pin boolean DEFAULT true,include_exceptions boolean DEFAULT true) RETURNS jsonb LANGUAGE SQL STABLE AS 'SELECT value->''composition'' FROM readonly_basis_test_context';
CREATE OR REPLACE FUNCTION task_risk_current(target uuid) RETURNS uuid LANGUAGE SQL STABLE AS 'SELECT (value->>''risk'')::uuid FROM readonly_basis_test_context';
CREATE OR REPLACE FUNCTION finding_task_current(t uuid) RETURNS boolean LANGUAGE SQL STABLE AS 'SELECT (value->>''finding'')::boolean FROM readonly_basis_test_context';
CREATE OR REPLACE FUNCTION task_interview_pending(t uuid) RETURNS boolean LANGUAGE SQL STABLE AS 'SELECT (value->>''interview'')::boolean FROM readonly_basis_test_context';
CREATE OR REPLACE FUNCTION native_capability_blocked(w uuid,t uuid,a uuid,op text,principal uuid,credential uuid,host uuid) RETURNS boolean LANGUAGE SQL STABLE AS 'SELECT (value->>''suspension'')::boolean FROM readonly_basis_test_context';
SET session_replication_role=replica;
INSERT INTO users(id,email,password_hash,updated_at) VALUES(${q(owner)},'readonly-owner@example.test','fictional-no-login',now()),(${q(outsider)},'readonly-guest@example.test','fictional-no-login',now());
INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${q(workspace)},'Fictional readonly result proof',${q(owner)},now());
INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES(${q(randomUUID())},${q(workspace)},${q(owner)},'owner',now());
INSERT INTO tasks(id,workspace_id,title,assigned_workforce_entity_id,execution_readiness,updated_at) VALUES(${q(e.taskId)},${q(workspace)},'Fictional unchanged auditor',${q(e.metadata.executionContract.assignment.agentId)},${json(f.pin)},now());
INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,status,requested_by_type,prompt,base_branch,completed_at,attempt,checkpoint_version,summary,final_response,changed_files,verification,metadata,updated_at)
 VALUES(${q(e.id)},${q(workspace)},${q(e.taskId)},${q(e.applicationId)},${q(e.agentHostId)},'completed','user',${q(e.prompt)},${q(e.baseBranch)},${q(e.completedAt.toISOString())},1,3,${q(e.summary)},${q(e.finalResponse)},'[]',${json(e.verification)},${json(e.metadata)},now());SET session_replication_role=origin;`);
    const insert = (actor = owner, pin = f.pin) => `INSERT INTO completed_result_basis_revalidations(id,workspace_id,task_id,execution_id,actor_user_id,original_pin_id,original_revision,original_material_version,ready_pin_id,ready_revision,ready_pin_digest,ready_pin,commit,request_id,request_hash)
SELECT ${q(randomUUID())},${q(workspace)},${q(e.taskId)},x.id,${q(actor)},${q(e.metadata.readyContextPin.pinId)},${q(e.metadata.readyContextPin.revision)},encode(sha256(convert_to(task_review_material_original(x)::text,'UTF8')),'hex'),${q(pin.pinId)},${q(pin.revision)},encode(sha256(convert_to(${json(pin)}::text,'UTF8')),'hex'),${json(pin)},${q(e.metadata.resultRevision.commit)},${q(randomUUID())},${q(hash())} FROM agent_executions x WHERE x.id=${q(e.id)};`;
    assert.equal(sql(`SELECT completed_result_readonly_native_valid(x) FROM agent_executions x WHERE x.id=${q(e.id)};`), "t");
    const nativeBefore = sql(`SELECT encode(sha256(convert_to(task_review_material_original(x)::text,'UTF8')),'hex') FROM agent_executions x WHERE x.id=${q(e.id)};`);
    assert.throws(() => sql("BEGIN;" + insert(outsider) + "ROLLBACK;"), /completed_result_basis_scope_invalid/);
    for (const [name, mutate] of Object.entries(mutations)) {
      const bad = fixture(); bad.execution = structuredClone(e); bad.pin = structuredClone(f.pin); mutate(bad);
      const x = bad.execution, set = `SET session_replication_role=replica;UPDATE agent_executions SET verification=${json(x.verification)},metadata=${json(x.metadata)},changed_files=${json(x.changedFiles)},error_state=${x.errorState ? json(x.errorState) : "NULL"},lease_token=${x.leaseToken ? q(x.leaseToken) : "NULL"},context_invalidated_at=${x.contextInvalidatedAt ? "now()" : "NULL"} WHERE id=${q(e.id)};SET session_replication_role=origin;`;
      assert.throws(() => sql("BEGIN;" + set + insert() + "ROLLBACK;"), /completed_result_(?:native_unproven|basis_scope_invalid)/, name);
    }
    for (const mutate of [(p: any) => p.prompt += " changed", (p: any) => p.baseBranch = "other", (p: any) => p.applicationId = randomUUID(), (p: any) => p.contract.assignment.agentId = randomUUID(), (p: any) => p.riskAdmissionCommit = "f".repeat(40), (p: any) => p.validatedAt = "2026-01-01T12:00:00Z"]) {
      const pin = structuredClone(f.pin); mutate(pin);
      assert.throws(() => sql(`BEGIN;SET session_replication_role=replica;UPDATE tasks SET execution_readiness=${json(pin)} WHERE id=${q(e.taskId)};SET session_replication_role=origin;` + insert(owner, pin) + "ROLLBACK;"), /completed_result_basis_stale/);
    }
    for (const [key, value] of Object.entries({ interview: true, suspension: true, finding: false, risk: randomUUID(), admission: { seal: hash("b"), expiresAt: new Date(Date.now() - 1000).toISOString() }, composition: { seal: hash("b") } })) {
      assert.throws(() => sql(`BEGIN;UPDATE readonly_basis_test_context SET value=value||${json({ [key]: value })};` + insert() + "ROLLBACK;"), /completed_result_current_context_required/);
    }
    // New latest execution is an authentic scope blocker; historical result is not relabeled.
    assert.throws(() => sql(`BEGIN;SET session_replication_role=replica;INSERT INTO agent_executions(id,workspace_id,task_id,application_id,status,requested_by_type,created_at,updated_at)VALUES(${q(randomUUID())},${q(workspace)},${q(e.taskId)},${q(e.applicationId)},'queued','user',now()+interval '1 minute',now());SET session_replication_role=origin;` + insert() + "ROLLBACK;"), /completed_result_basis_scope_invalid/);
    sql(insert());
    assert.equal(sql(`SELECT completed_result_basis_current(x) FROM agent_executions x WHERE x.id=${q(e.id)};`), "t");
    assert.equal(sql(`SELECT encode(sha256(convert_to(task_review_material_original(x)::text,'UTF8')),'hex') FROM agent_executions x WHERE x.id=${q(e.id)};`), nativeBefore);
    assert.equal(sql(`SELECT summary||'|'||COALESCE(verification->'codingTests'->>'passed','absent') FROM agent_executions WHERE id=${q(e.id)};`), "RELEASE READINESS FINDING: CHANGES_REQUIRED|absent");
    assert.throws(() => sql(`UPDATE completed_result_basis_revalidations SET commit=${q("d".repeat(40))};`), /completed_result_basis_append_only/);
    assert.throws(() => sql("DELETE FROM completed_result_basis_revalidations;"), /completed_result_basis_append_only/);
    assert.throws(() => sql(`UPDATE agent_executions SET summary='READY' WHERE id=${q(e.id)};`), /immutable/);
    for (const decision of ["approve", "reject"]) {
      assert.throws(() => sql(`BEGIN;SET session_replication_role=replica;INSERT INTO task_review_decisions(id,workspace_id,task_id,execution_id,request_id,request_hash,material_version,actor_user_id,verifier_id,manager_id,decision,evidence,snapshot)
SELECT ${q(randomUUID())},${q(workspace)},${q(e.taskId)},x.id,${q(randomUUID())},${q(hash())},encode(sha256(convert_to(task_review_material(x)::text,'UTF8')),'hex'),${q(owner)},${q(randomUUID())},${q(randomUUID())},${q(decision)},'[]',jsonb_build_object('result',task_review_material(x)) FROM agent_executions x WHERE x.id=${q(e.id)};SET session_replication_role=origin;` + insert() + "ROLLBACK;"), /completed_result_basis_scope_invalid/);
    }
  } finally {
    if (created) execFileSync("docker", [...docker, "dropdb", "--if-exists", "-U", user, database], { windowsHide: true, timeout: 30000 });
  }
});
