import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

const migration = "20261004003000_application_takeover_baseline";
const source = (name: string) => readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
const q = (value: string) => `'${value.replaceAll("'", "''")}'`;
const json = (value: unknown) => `${q(JSON.stringify(value))}::jsonb`;

test("PostgreSQL: takeover baseline guards preserve existing records and reject nonowner, foreign, stale and corrupt evidence", () => {
  const database = `companycore_test_takeover_${randomUUID().replaceAll("-", "")}`;
  const args = ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database];
  const sql = (input: string) => execFileSync("docker", args, { input, windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
  let created = false;
  execFileSync("docker", ["compose", "exec", "-T", "postgres", "createdb", "-U", "companycore", database], { windowsHide: true }); created = true;
  try {
    sql(readdirSync("prisma/migrations").filter(name => /^\d/.test(name) && name < migration).sort().map(source).join("\n"));
    const owner = randomUUID(), other = randomUUID(), workspace = randomUUID(), app = randomUUID(), foreign = randomUUID(), project = randomUUID();
    const auditorTask = randomUUID(), verifierTask = randomUUID(), auditor = randomUUID(), verifier = randomUUID();
    const auditExecution = randomUUID(), verifyExecution = randomUUID(), host = randomUUID(), record = randomUUID(), foreignRecord = randomUUID(), repo = randomUUID();
    const approvalIds = [randomUUID(), randomUUID()], commit = "a".repeat(40), branch = "main";
    const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    const execution = (verifying: boolean) => {
      const id = verifying ? verifyExecution : auditExecution, task = verifying ? verifierTask : auditorTask;
      const receipt = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: (verifying ? "c" : "b").repeat(64),
        preTree: "d".repeat(64), postTree: "d".repeat(64), processState: "unchanged", dockerState: "unchanged", gitState: "unchanged", nativeTools: [],
        processCoverage: "listening_tcp_plus_owned_job_zero_processes", dockerCoverage: "running_container_list",
        ...(verifying ? { verifiedExecutionId: auditExecution, verifiedEvidenceDigest: "b".repeat(64) } : {}) };
      return { id, task, metadata: { executionContract: { singleTask: { applicationId: app, branch }, assignment: { agentId: verifying ? verifier : auditor },
        nativeBoundary: { profile: "inspect-readonly", inspectReadOnly: { kind: verifying ? "verifier" : "auditor",
          ...(verifying ? { verifiedExecutionId: auditExecution, verifiedEvidenceDigest: "b".repeat(64) } : {}) } },
        access: { sandbox: "read-only", tools: ["repository_read"], permissions: ["repository_read"] },
        modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" } }, resultRevisionReviewVersion: "1",
        resultRevision: { schemaVersion: "roost-result-revision-v1", id: randomUUID(), executionId: id, hostId: host,
          attempt: 1, checkpointVersion: 4, commit, branch, workingTree: "clean", observedAt: "2026-01-01T09:10:00Z" } },
        verification: { readOnlyAudit: { ...receipt, digest: digest(receipt) }, managedAdmission: { qualification: "signed_native_v1",
          decisionId: approvalIds[verifying ? 1 : 0], revision: 1, evidenceDigest: "e".repeat(64), jobSourceDigest: "f".repeat(64) },
          ownedTreeReceipt: { cleanup: true, jobClosed: true, activeProcesses: 0, rootExit: 0, attempt: id } } };
    };
    const audit = execution(false), verify = execution(true);
    // Only inert canonical fixture sources bypass unrelated historical guards.
    // Every baseline predicate and attempted baseline write below runs in origin.
    sql(`BEGIN; SET LOCAL session_replication_role=replica;
      INSERT INTO users(id,email,password_hash,updated_at) VALUES(${q(owner)},'takeover-owner@example.test','synthetic-no-login',now()),(${q(other)},'takeover-other@example.test','synthetic-no-login',now());
      INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${q(workspace)},'Synthetic takeover fixture',${q(owner)},now());
      INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES(${q(randomUUID())},${q(workspace)},${q(owner)},'owner',now()),(${q(randomUUID())},${q(workspace)},${q(other)},'owner',now());
      INSERT INTO applications(id,workspace_id,name,slug,updated_at) VALUES(${q(app)},${q(workspace)},'Synthetic workshop','synthetic-workshop',now()),(${q(foreign)},${q(workspace)},'Foreign fixture','foreign-fixture',now());
      INSERT INTO application_repositories(id,application_id,name,url,is_primary,updated_at) VALUES(${q(repo)},${q(app)},'Canonical fixture','https://github.com/example/workshop.git',true,now());
      INSERT INTO projects(id,workspace_id,name,updated_at) VALUES(${q(project)},${q(workspace)},'Synthetic takeover project',now());
      INSERT INTO application_projects(application_id,project_id) VALUES(${q(app)},${q(project)});
      INSERT INTO workforce_entities(id,workspace_id,type,name,slug,updated_at) VALUES(${q(auditor)},${q(workspace)},'agent','Synthetic auditor','synthetic-auditor',now()),(${q(verifier)},${q(workspace)},'agent','Synthetic verifier','synthetic-verifier',now());
      INSERT INTO tasks(id,workspace_id,project_id,title,assigned_workforce_entity_id,updated_at) VALUES(${q(auditorTask)},${q(workspace)},${q(project)},'Audit native fixture',${q(auditor)},now()),(${q(verifierTask)},${q(workspace)},${q(project)},'Verify native fixture',${q(verifier)},now());
      INSERT INTO agent_hosts(id,workspace_id,name,slug,platform,updated_at) VALUES(${q(host)},${q(workspace)},'Inert fixture host','inert-fixture-host','synthetic',now());
      INSERT INTO company_records(id,workspace_id,application_id,record_type,key,title,updated_at) VALUES(${q(record)},${q(workspace)},${q(app)},'product_requirement','booking-conflict','Booking conflict requirement',now()),(${q(foreignRecord)},${q(workspace)},${q(foreign)},'product_requirement','foreign-requirement','Foreign requirement',now());
      ${approvalIds.map((id, index) => `INSERT INTO decisions(id,workspace_id,title,status,source,updated_at) VALUES(${q(id)},${q(workspace)},'Synthetic prior managed admission','accepted','native_fixture',now());
        INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash,created_at) VALUES(${q(id)},${q(workspace)},1,${json({ managedRuntimeApproval: { applicationId: app, taskId: index ? verifierTask : auditorTask, backend: "codex_responses" } })},${q(owner)},${q(randomUUID())},'synthetic',now()-interval '3 hours');
        INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${q(id)},${q(id)},${q(workspace)},1,'{"taskIds":[]}',${q(owner)},${q(randomUUID())},'synthetic');
        INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,created_at) VALUES(${q(id)},${q(id)},${q(workspace)},${q(id)},${q(owner)},${q(randomUUID())},'synthetic',now()-interval '3 hours');`).join("\n")}
      ${[audit, verify].map((e, index) => `INSERT INTO agent_executions(id,workspace_id,application_id,task_id,agent_host_id,status,requested_by_type,requested_by_id,started_at,completed_at,attempt,checkpoint_version,final_response,metadata,verification,updated_at)
        VALUES(${q(e.id)},${q(workspace)},${q(app)},${q(e.task)},${q(host)},'completed','user',${q(owner)},now()-interval '${index ? "90" : "120"} minutes',now()-interval '${index ? "60" : "90"} minutes',1,4,'Native scoped fixture audit',${json(e.metadata)},${json(e.verification)},now());`).join("\n")}
      COMMIT;`);
    const before = sql(`SELECT to_jsonb(a)::text FROM applications a ORDER BY id; SELECT to_jsonb(e)::text FROM agent_executions e ORDER BY id; SELECT to_jsonb(c)::text FROM company_records c ORDER BY id;`);
    sql(source(migration));
    assert.equal(sql(`SELECT to_jsonb(a)::text FROM applications a ORDER BY id; SELECT to_jsonb(e)::text FROM agent_executions e ORDER BY id; SELECT to_jsonb(c)::text FROM company_records c ORDER BY id;`), before);
    assert.equal(sql("SHOW session_replication_role;").trim(), "origin");
    const baseline: any = { schemaVersion: "roost-application-takeover-v1", applicationId: app, auditTaskId: auditorTask,
      canonicalRepository: "https://github.com/example/workshop.git", baselineCommit: commit, auditorExecutionId: auditExecution,
      verifierExecutionId: verifyExecution, auditorEvidenceDigest: "b".repeat(64), verifierEvidenceDigest: "c".repeat(64), stage: "implementation",
      scopeDescription: "Booking conflict takeover", intendedUser: "Workshop coordinator", primaryProblem: "Bookings can overlap", coreOutcome: "Show conflicting bookings",
      assumptions: [{ recordId: record, revision: sql(`SELECT task_interview_record(${q(record)}::uuid)->>'revision';`).trim(), decisionStatus: "accepted", implementationState: "unverified" }],
      limitations: ["Booking conflicts only"], productReady: false, saleReady: false };
    const valid = (value = baseline) => sql(`SELECT application_takeover_baseline_valid(${q(workspace)}::uuid,${json(value)});`).trim();
    assert.equal(valid(), "t");
    for (const malformed of [null, [], { ...baseline, assumptions: null }, { ...baseline, limitations: [null] },
      { ...baseline, productReady: null }, { ...baseline, coreOutcome: null }, { ...baseline, stage: null }]) assert.equal(valid(malformed), "f");
    for (const patch of [{ productReady: true }, { saleReady: true }, { stage: "product_readiness" }, { canonicalRepository: "https://user:secret@github.com/example/workshop.git" },
      { applicationId: foreign }, { auditorExecutionId: randomUUID() }, { auditTaskId: verifierTask }, { verifierExecutionId: auditExecution },
      { baselineCommit: "0".repeat(40) }, { verifierEvidenceDigest: "0".repeat(64) },
      { assumptions: [{ ...baseline.assumptions[0], recordId: foreignRecord, revision: sql(`SELECT task_interview_record(${q(foreignRecord)}::uuid)->>'revision';`).trim() }] },
      { assumptions: [{ ...baseline.assumptions[0], revision: "0".repeat(64) }] }, { assumptions: [baseline.assumptions[0], baseline.assumptions[0]] },
      { executionAuthority: true }, { coreOutcome: "" }]) assert.equal(valid({ ...baseline, ...patch }), "f", JSON.stringify(patch));
    const body = (value = baseline) => ({ title: "Adopt native baseline", context: "Independent native fixture audits", decision: "Adopt scoped workshop baseline",
      rationale: "Audit and verification agree", consequences: "Only booking-conflict baseline is adopted", scopeReason: "Application-specific takeover",
      scope: [{ type: "application", id: app }, { type: "task", id: auditorTask }], supersedesId: null, conflicts: [], applicationBaseline: value });
    const proposalSql = (b: any, actor = owner, decision = randomUUID()) => `BEGIN;
      INSERT INTO decisions(id,workspace_id,title,context,decision,rationale,consequences,status,source,updated_at) VALUES(${q(decision)},${q(workspace)},${q(b.title)},${q(b.context)},${q(b.decision)},${q(b.rationale)},${q(b.consequences)},'proposed','roost_decision',now());
      INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash) VALUES(${q(decision)},${q(workspace)},1,${json(b)},${q(actor)},${q(randomUUID())},'synthetic'); COMMIT;`;
    const rejected = (input: string, reason: string) => assert.throws(() => sql(input), (error: any) => String(error.stderr).includes(reason));
    rejected(proposalSql(body(), other), "application_baseline_owner_required");
    rejected(proposalSql({ ...body(), authority: { domain: "ordinary_domain" } }), "application_baseline_scope_invalid");
    rejected(proposalSql({ ...body(), firstWriteApproval: {} }), "application_baseline_scope_invalid");
    rejected(proposalSql({ ...body(), scope: null }), "application_baseline_scope_invalid");
    rejected(proposalSql(body(null)), "application_baseline_evidence_invalid");
    rejected(proposalSql({ ...body(), scope: [...body().scope, body().scope[0]] }), "application_baseline_scope_invalid");
    rejected(proposalSql({ ...body(), scope: [...body().scope, { type: "application", id: foreign }] }), "application_baseline_scope_invalid");
    rejected(proposalSql(body({ ...baseline, verifierEvidenceDigest: "0".repeat(64) })), "application_baseline_evidence_invalid");
    const ordinary: any = { ...body() }; delete ordinary.applicationBaseline;
    sql(proposalSql(ordinary));
    const adopted = randomUUID(); sql(proposalSql(body(), owner, adopted));
    const preview = randomUUID();
    sql(`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash,authority)
      VALUES(${q(preview)},${q(adopted)},${q(workspace)},1,decision_impact(${q(workspace)}::uuid,${json(body().scope)}),${q(owner)},${q(randomUUID())},'synthetic',
      ${json({ status: "owner_reserved", reason: "application_takeover_baseline", principal: { kind: "user", id: owner }, path: [], mandate: null })});`);
    const accept = (actor = owner) => `INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority)
      VALUES(${q(randomUUID())},${q(adopted)},${q(workspace)},${q(preview)},${q(actor)},${q(randomUUID())},'synthetic',
      ${json({ status: "owner_reserved", reason: "application_takeover_baseline", principal: { kind: "user", id: actor }, path: [], mandate: null })});`;
    rejected(accept(other), "application_baseline_owner_required");
    // Baseline acceptance retains the existing independent admission gate.
    rejected(accept(), "decision_risk_admission_required");
    sql(`UPDATE application_repositories SET url='https://github.com/example/changed.git' WHERE id=${q(repo)};`);
    assert.equal(valid(), "f"); rejected(accept(), "application_baseline_evidence_invalid");
    sql(`UPDATE application_repositories SET url=${q(baseline.canonicalRepository)} WHERE id=${q(repo)}; UPDATE company_records SET description='Changed canonical requirement',updated_at=now() WHERE id=${q(record)};`);
    assert.equal(valid(), "f"); rejected(accept(), "application_baseline_evidence_invalid");
    assert.equal(sql(`SELECT count(*) FROM decision_acceptances WHERE decision_id=${q(adopted)};`).trim(), "0");
    assert.equal(sql(`SELECT body->'applicationBaseline'->>'stage' FROM decision_revisions WHERE decision_id=${q(adopted)};`).trim(), "implementation");
    assert.equal(sql(`SELECT count(*) FROM application_takeover_baseline_valid(${q(workspace)}::uuid,${json({ ...baseline, assumptions: [] })}) WHERE application_takeover_baseline_valid;`).trim(), "1");
    // Corrupt inert fixture sources only, then exercise the guard in origin.
    sql(`BEGIN; SET LOCAL session_replication_role=replica; UPDATE agent_executions SET verification=jsonb_set(verification,'{readOnlyAudit,postTree}',${json("0".repeat(64))}) WHERE id=${q(auditExecution)}; COMMIT;`);
    assert.equal(valid({ ...baseline, assumptions: [] }), "f");
    rejected(accept(), "application_baseline_evidence_invalid");
    sql(`BEGIN; SET LOCAL session_replication_role=replica; UPDATE agent_executions SET verification=${json({ ...audit.verification, outcome: "process_failed" })} WHERE id=${q(auditExecution)}; COMMIT;`);
    assert.equal(valid({ ...baseline, assumptions: [] }), "f");
    assert.equal(sql("SHOW session_replication_role;").trim(), "origin");
  } finally {
    if (!/^companycore_test_takeover_[a-f0-9]{32}$/.test(database)) throw Error("Unsafe fixture database cleanup");
    if (created) execFileSync("docker", ["compose", "exec", "-T", "postgres", "dropdb", "-U", "companycore", database], { windowsHide: true });
  }
});
