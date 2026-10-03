import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const name = "20261003161000_revalidated_rejection_disposition";
const source = (n: string) => readFileSync(`prisma/migrations/${n}/migration.sql`, "utf8").replaceAll("\r\n", "\n");
const fullGuard = (s: string) => s.slice(s.indexOf("CREATE OR REPLACE FUNCTION task_review_guard()"), s.lastIndexOf("COMMIT;")).trim();

test("additive guard changes only the mapped rejection's return path", () => {
  const original = fullGuard(source("20261002010000_completed_result_basis"));
  const expected = original.replace("  AND NOT completed_result_basis_current(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;",
    "  AND NOT completed_result_basis_current(e) THEN\n   IF TG_TABLE_NAME<>'task_review_actions' THEN RAISE EXCEPTION 'task_review_stale'; END IF;\n   IF NEW.action<>'return_to_executor' OR NOT completed_result_rejection_disposition_current(e)\n    THEN RAISE EXCEPTION 'task_review_stale'; END IF;\n END IF;");
  assert.notEqual(expected, original);
  assert.equal(fullGuard(source(name)), expected);
  assert.ok(!/\b(?:DROP|TRUNCATE|DELETE|INSERT INTO|UPDATE\s+[a-z_]+\s+SET|ALTER TABLE)\b/i.test(source(name)));
  assert.ok(!source(name).includes("CREATE OR REPLACE FUNCTION completed_result_basis_current"));
  const review = readFileSync("src/modules/agent-runtime/task-review.ts", "utf8");
  assert.match(review, /canReview: current && !decision/);
  assert.match(review, /canManage: manageCurrent && decision\?\.decision === "reject"/);
  assert.match(review, /!s\.current && input\.action !== "return_to_executor"/);
  const capability = readFileSync("src/modules/agent-runtime/task-capability.ts", "utf8");
  assert.match(capability, /!s\.current && operation !== "return_to_executor"/);
  assert.match(capability, /s\.current \? await handoffGrantChoices/);
  assert.ok(readFileSync("src/modules/agent-runtime/governed-release-contract.ts", "utf8").includes("if (!s.current"));
});

test("PostgreSQL: exact mapped rejection permits a manager return and refuses tampered identity, context, role and disposition", () => {
  const database = `companycore_test_rejection_${randomUUID().replaceAll("-", "")}`;
  const args = ["compose", "exec", "-T", "postgres", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", database];
  const q = (v: string) => `'${v.replaceAll("'", "''")}'`, json = (v: any) => `${q(JSON.stringify(v))}::jsonb`;
  const sql = (input: string) => execFileSync("docker", args, { input, windowsHide: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 });
  let created = false;
  execFileSync("docker", ["compose", "exec", "-T", "postgres", "createdb", "-U", "companycore", database], { windowsHide: true }); created = true;
  try {
    // Synthetic rows are isolated from the installation. The actual new SQL
    // predicate and unchanged full existing trigger run against these types.
    sql(`CREATE TABLE tasks(id uuid,workspace_id uuid,execution_readiness jsonb,assigned_workforce_entity_id uuid,execution_role_provenance jsonb);
      CREATE TABLE agent_executions(id uuid,workspace_id uuid,task_id uuid,status text,completed_at timestamptz,context_invalidated_at timestamptz,metadata jsonb,created_at timestamptz);
      CREATE TABLE completed_result_basis_revalidations(sequence bigint,id uuid,workspace_id uuid,task_id uuid,execution_id uuid,original_pin_id uuid,original_revision text,original_material_version text,commit text,ready_pin jsonb,ready_pin_digest text,ready_pin_id uuid,ready_revision text);
      CREATE TABLE task_review_decisions(id uuid,workspace_id uuid,task_id uuid,execution_id uuid,decision text,material_version text,snapshot jsonb,evidence jsonb,manager_id uuid,created_at timestamptz);
      CREATE TABLE task_review_actions(id uuid,workspace_id uuid,task_id uuid,review_id uuid,manager_id uuid,action text,correction jsonb,actor_user_id uuid,actor_agent_id uuid,actor_credential_id uuid,actor_credential_prefix text);
      CREATE TABLE workforce_entities(id uuid,workspace_id uuid,status text,role text,type text,source text,external_id text,updated_at timestamptz,authority_scope jsonb,skill_index jsonb);
      CREATE TABLE workspace_memberships(workspace_id uuid,user_id uuid,role text);
      CREATE TABLE api_keys(id uuid,workspace_id uuid,bound_agent_id uuid,active boolean,revoked_at timestamptz,expires_at timestamptz,key_prefix text,scopes jsonb);
      CREATE FUNCTION task_review_material_original(e agent_executions) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT e.metadata->'fixtureOriginal' $$;
      CREATE FUNCTION task_review_material(e agent_executions) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT e.metadata->'fixtureMaterial' $$;
      CREATE FUNCTION completed_result_basis_current(e agent_executions) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;`);
    sql(source(name));
    sql("CREATE TRIGGER guard BEFORE INSERT ON task_review_actions FOR EACH ROW EXECUTE FUNCTION task_review_guard();");
    const workspace = randomUUID(), taskId = randomUUID(), execution = randomUUID(), executor = randomUUID(), manager = randomUUID(), user = randomUUID(), review = randomUUID();
    const oldPin = randomUUID(), newPin = randomUUID(), originalRevision = "a".repeat(64), revision = "b".repeat(64), commit = "c".repeat(40);
    const roleRevision = "2026-10-03T12:00:00.000Z", provenance = { authors: [{ kind: "agent", id: executor }] };
    const contract = { assignment: { agentId: executor, competencies: ["web_test"] }, taskRoles: { accountableManager: { id: manager, revision: roleRevision } } };
    const pin = { status: "ready", pinId: newPin, revision, contract, roleProvenance: provenance };
    const rejectedPin = { ...pin, status: "needs_revalidation", reason: "review_rejected" };
    const original = { executionId: execution, commit, native: "unchanged-fixture" }, material = { ...original, basisRevalidation: { pinId: newPin, revision } };
    const metadata = { readyContextPin: { pinId: oldPin, revision: originalRevision }, resultRevision: { commit }, executionContract: contract, fixtureOriginal: original, fixtureMaterial: material };
    const correction = { scope: ["Replay only the required regression test"], excluded: ["No push or deployment"], outcome: "Provide baseline failure and candidate passing evidence", competencies: ["web_test"] };
    sql(`INSERT INTO tasks VALUES(${q(taskId)},${q(workspace)},${json(rejectedPin)},${q(executor)},${json(provenance)});
      INSERT INTO agent_executions VALUES(${q(execution)},${q(workspace)},${q(taskId)},'completed','2026-10-03 12:01:00+00',NULL,${json(metadata)},'2026-10-03 12:00:00+00');
      INSERT INTO completed_result_basis_revalidations VALUES(1,${q(randomUUID())},${q(workspace)},${q(taskId)},${q(execution)},${q(oldPin)},${q(originalRevision)},encode(sha256(convert_to(${json(original)}::text,'UTF8')),'hex'),${q(commit)},${json(pin)},encode(sha256(convert_to(${json(pin)}::text,'UTF8')),'hex'),${q(newPin)},${q(revision)});
      INSERT INTO task_review_decisions VALUES(${q(review)},${q(workspace)},${q(taskId)},${q(execution)},'reject',encode(sha256(convert_to(${json(material)}::text,'UTF8')),'hex'),${json({ result: material })},${json({ correction })},${q(manager)},'2026-10-03 12:02:00+00');
      INSERT INTO workforce_entities VALUES(${q(manager)},${q(workspace)},'active','manager','human','user',${q(user)},${q(roleRevision)},'["task_accountability"]','["web_test"]');
      INSERT INTO workspace_memberships VALUES(${q(workspace)},${q(user)},'owner');`);
    const current = () => sql(`SELECT completed_result_rejection_disposition_current(e) FROM agent_executions e WHERE id=${q(execution)};`).trim();
    assert.equal(current(), "t");
    assert.equal(sql(`SELECT completed_result_basis_current(e) FROM agent_executions e WHERE id=${q(execution)};`).trim(), "f");
    sql("CREATE TRIGGER decision_guard BEFORE INSERT ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION task_review_guard();");
    assert.throws(() => sql(`INSERT INTO task_review_decisions SELECT ${q(randomUUID())},workspace_id,task_id,execution_id,'approve',material_version,snapshot,evidence,manager_id,'2026-10-03 12:03:00+00' FROM task_review_decisions;`));
    assert.equal(sql("SELECT count(*) FROM task_review_decisions;").trim(), "1");
    sql("DROP TRIGGER decision_guard ON task_review_decisions;");
    const action = (kind = "return_to_executor", actor = user, fix = correction) => `INSERT INTO task_review_actions VALUES(${q(randomUUID())},${q(workspace)},${q(taskId)},${q(review)},${q(manager)},${q(kind)},${json(fix)},${q(actor)},NULL,NULL,NULL);`;
    sql(`BEGIN; ${action()} ROLLBACK;`);
    assert.equal(current(), "t");
    for (const statement of [action("create_specialist_task"), action("return_to_executor", randomUUID()), action("return_to_executor", user, { ...correction, scope: [...correction.scope, "Edit another component"] })]) {
      assert.throws(() => sql(statement));
      assert.equal(sql("SELECT count(*) FROM task_review_actions;").trim(), "0");
    }
    const tamper = [
      "UPDATE tasks SET execution_readiness=jsonb_set(execution_readiness,'{status}','\"ready\"');",
      "UPDATE tasks SET execution_readiness=jsonb_set(execution_readiness,'{reason}','\"context_changed\"');",
      "UPDATE tasks SET execution_readiness=execution_readiness||'{\"changedSources\":[\"source\"]}';",
      `UPDATE tasks SET execution_readiness=jsonb_set(execution_readiness,'{pinId}',to_jsonb(${q(randomUUID())}::text));`,
      "UPDATE tasks SET execution_readiness=jsonb_set(execution_readiness,'{revision}','\"wrong\"');",
      "UPDATE tasks SET execution_readiness=jsonb_set(execution_readiness,'{contract,scope}','[\"more writes\"]');",
      `UPDATE tasks SET assigned_workforce_entity_id=${q(randomUUID())};`,
      "UPDATE tasks SET execution_role_provenance='{\"authors\":[]}';",
      "UPDATE agent_executions SET context_invalidated_at=now();",
      "UPDATE agent_executions SET status='running';",
      "UPDATE agent_executions SET completed_at=NULL;",
      `UPDATE agent_executions SET metadata=jsonb_set(metadata,'{resultRevision,commit}',to_jsonb(${q("d".repeat(40))}::text));`,
      "UPDATE completed_result_basis_revalidations SET ready_pin_digest='wrong';",
      "UPDATE completed_result_basis_revalidations SET original_material_version='wrong';",
      "UPDATE completed_result_basis_revalidations SET ready_revision='wrong';",
      `UPDATE completed_result_basis_revalidations SET original_pin_id=${q(randomUUID())};`,
      "UPDATE task_review_decisions SET decision='approve';",
      "UPDATE task_review_decisions SET material_version='wrong';",
      "UPDATE task_review_decisions SET snapshot='{\"result\":{\"changed\":true}}';",
      `UPDATE task_review_decisions SET execution_id=${q(randomUUID())};`,
      `INSERT INTO agent_executions SELECT ${q(randomUUID())},workspace_id,task_id,status,completed_at,context_invalidated_at,metadata,'2026-10-03 12:03:00+00' FROM agent_executions;`,
      `INSERT INTO task_review_decisions SELECT ${q(randomUUID())},workspace_id,task_id,execution_id,'approve',material_version,snapshot,evidence,manager_id,'2026-10-03 12:03:00+00' FROM task_review_decisions;`
    ];
    for (const mutation of tamper) {
      assert.equal(sql(`BEGIN; ${mutation} SELECT completed_result_rejection_disposition_current(e) FROM agent_executions e WHERE id=${q(execution)}; ROLLBACK;`).trim(), "f", mutation);
      assert.throws(() => sql(`BEGIN; ${mutation} ${action()} ROLLBACK;`), mutation);
      assert.equal(current(), "t");
    }
    // The valid action closes this exception; it does not revive the basis.
    sql(action()); assert.equal(current(), "f");
    assert.equal(sql(`SELECT completed_result_basis_current(e) FROM agent_executions e WHERE id=${q(execution)};`).trim(), "f");
  } finally {
    if (!/^companycore_test_rejection_[a-f0-9]{32}$/.test(database)) throw Error("Unsafe fixture database cleanup");
    if (created) execFileSync("docker", ["compose", "exec", "-T", "postgres", "dropdb", "-U", "companycore", database], { windowsHide: true });
  }
});
