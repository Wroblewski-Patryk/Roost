import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { computeRisk, riskDimensions, riskScopeIsReadonly, riskAssessmentSchema, type RiskEntry } from "../modules/agent-runtime/task-risk-contract";

const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
const root = path.resolve(__dirname, "../..");
const migration = readFileSync(path.join(root, "prisma/migrations/20261001120000_risk_cumulative_mutations/migration.sql"), "utf8");
const fragmentsMigration = readFileSync(path.join(root, 'prisma/migrations/20261004001500_readonly_fragments_risk/migration.sql'), 'utf8');
const managedMigration = readFileSync(path.join(root, 'prisma/migrations/20261004004000_readonly_managed_extended_budget/migration.sql'), 'utf8');
const evidence = { id: randomUUID(), revision: "2026-10-01T00:00:00.000Z" };
const entry = (): RiskEntry => ({ taskId: randomUUID(),
  dimensions: Object.fromEntries(riskDimensions.map(d => [d, { level: "low", rationale: "Bounded synthetic impact", evidence: [evidence] }])) as RiskEntry["dimensions"],
  uncertainty: { level: "none", reasons: "Controlled synthetic evidence", evidence: [evidence] }, contradictions: [] });
async function fixture() {
  const { validPacketFixture } = await loadESM(pathToFileURL(path.join(root, "scripts/fixtures/execution-packet.mjs")).href);
  const c = validPacketFixture().packet.contract;
  c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["release.json"],
    runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" } };
  c.access = { tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only", externalWrites: false, restrictions: ["Read bounded repository sources"] };
  return c;
}
const managedSelection = (maxTurns: number, budgetPolicy?: string) => ({
  schemaVersion: "roost-managed-hermes-backend-v1", agent: "managed_hermes", riskClass: "low", fallback: "none",
  backend: "codex_responses", provider: "openai-codex", auth: "same_owner_subscription",
  modelSelection: { model: "gpt-5.6-sol", reasoningEffort: "low" },
  attemptPolicy: { maxTurns, apiMaxRetries: 0, unavailable: "stop_attempt", restart: "never", ...(budgetPolicy === undefined ? {} : { budgetPolicy }) }
});

// Pin the SQL mirror to the current real schema, including strict object keys
// and all known refinements. Unknown validators fail here rather than drift.
test("SQL readonly classifier is pinned to the real strict execution schema", async () => {
  const { readonlyRiskSchema } = await loadESM(pathToFileURL(path.join(root, 'scripts/lib/agent-host-risk-readonly-schema.mjs')).href);
  const expected = readonlyRiskSchema();
  const stored = managedMigration.match(/SELECT \$schema\$(.+)\$schema\$::jsonb/)?.[1];
  assert.ok(stored); assert.deepEqual(JSON.parse(stored), JSON.parse(JSON.stringify(expected)));
});

test("unmirrored managed union/object refinements and transforms fail descriptor generation", async () => {
  const { riskSchemaDescriptor } = await loadESM(pathToFileURL(path.join(root, 'scripts/lib/agent-host-risk-readonly-schema.mjs')).href);
  const { managedBackendSelectionSchema } = await loadESM(pathToFileURL(path.join(root, 'scripts/lib/agent-host-model-policy.mjs')).href);
  const base = managedBackendSelectionSchema.innerType();
  assert.throws(() => riskSchemaDescriptor(base.refine(() => true)), /Unmirrored refinement/);
  assert.throws(() => riskSchemaDescriptor(base.options[0].shape.attemptPolicy.innerType().refine(() => true)), /Unmirrored refinement/);
  assert.throws(() => riskSchemaDescriptor(base.transform((v: unknown) => v)), /refinement/);
});

test("four verified audits plus one change stay low; two and four changes still escalate", async () => {
  const audits = Array.from({ length: 4 }, entry), readonly = new Set(audits.map(e => e.taskId));
  assert.equal(await riskScopeIsReadonly(await fixture()), true);
  for (const [changes, level] of [[1, "low"], [2, "medium"], [4, "high"]] as const) {
    const all = [...audits, ...Array.from({ length: changes }, entry)], result = computeRisk(all, readonly);
    assert.equal(result.level, level); assert.equal(result.mutationCount, changes);
    assert.equal(result.readonlyTaskIds.length, 4); assert.equal(all.length, changes + 4);
  }
  assert.equal(computeRisk([...audits, entry()]).level, "high", "no scope proof means conservative changes");
  audits[0]!.dimensions.security.level = "high";
  assert.equal(computeRisk([...audits, entry()], readonly).level, "high", "audits retain their impact");
  audits[0]!.uncertainty.level = "bounded";
  assert.equal(computeRisk([...audits, entry()], readonly).level, "critical", "audits retain uncertainty");
  audits[0]!.contradictions = ["The supporting audit records disagree"];
  assert.equal(computeRisk([...audits, entry()], readonly).status, "needs_decision");
});

const malformed: Record<string, (c: any) => void> = {
  missingObjective: c => { delete c.objective; },
  declarationOnly: c => { c.readonly = true; },
  writeTool: c => { c.access.tools.push("repository_write"); },
  writePermission: c => { c.access.permissions.push("repository_write"); },
  localCommit: c => { c.access.permissions.push("local_commit"); },
  remotePush: c => { c.access.tools.push("remote_push"); },
  deployment: c => { c.access.tools.push("deployment"); },
  writableSandbox: c => { c.access.sandbox = "workspace-write"; },
  externalWrites: c => { c.access.externalWrites = true; },
  liveRuntime: c => { c.nativeBoundary.runtime.required = true; },
  boundPort: c => { c.nativeBoundary.runtime.ports = [8080]; },
  malformedBudget: c => { c.budgets.maxDurationSeconds = 0; },
  emptyContext: c => { c.context.company = []; },
  unsupportedEffort: c => { c.modelSelection = { model: "gpt-5.6-luna", reasoningEffort: "ultra" }; },
  invalidLocalModel: c => { c.modelSelection = { provider: "hermes_local", model: "gpt-oss:20b", modelFamily: "devstral", modelDigest: `sha256:${"a".repeat(64)}`, reasoningEffort: "low" }; },
  ambiguousProcedure: c => { c.procedures = { items: [], noneReason: null }; },
  unboundedPath: c => { c.nativeBoundary.readPaths = ["../release.json"]; },
  absolutePath: c => { c.nativeBoundary.readPaths = ["/release.json"]; },
  backslashPath: c => { c.nativeBoundary.readPaths = ["src\\release.json"]; },
  secretPath: c => { c.nativeBoundary.readPaths = [".env"]; },
  gitPath: c => { c.nativeBoundary.readPaths = [".git/config"]; },
  reservedPath: c => { c.nativeBoundary.readPaths = ["CON.json"]; }
  ,fragmentTraversal: c => { c.nativeBoundary.readFragments = [{path:'../outside.md',startLine:1,endLine:2}]; }
  ,fragmentOverlap: c => { c.nativeBoundary.readFragments = [{path:'docs/accepted.md',startLine:1,endLine:5},{path:'DOCS/accepted.md',startLine:5,endLine:9}]; }
  ,fragmentTooLong: c => { c.nativeBoundary.readFragments = [{path:'docs/accepted.md',startLine:1,endLine:201}]; }
  ,fragmentWholeConflict: c => { c.nativeBoundary.readFragments = [{path:'RELEASE.json',startLine:1,endLine:2}]; }
  ,emptySelection: c => { c.nativeBoundary.readPaths = []; }
  ,managedMissingExtended: c => { c.modelSelection = managedSelection(25); }
  ,managedSmallAbove24: c => { c.modelSelection = managedSelection(25, 'coding-small-v1'); }
  ,managedExtendedAt24: c => { c.modelSelection = managedSelection(24, 'coding-extended-v1'); }
  ,managedAbove48: c => { c.modelSelection = managedSelection(49, 'coding-extended-v1'); }
  ,managedZeroTurns: c => { c.modelSelection = managedSelection(0); }
  ,managedFractionalTurns: c => { c.modelSelection = managedSelection(25.5, 'coding-extended-v1'); }
  ,managedUnknownBudget: c => { c.modelSelection = managedSelection(30, 'unreviewed-v1'); }
  ,managedNullBudget: c => { c.modelSelection = managedSelection(4); c.modelSelection.attemptPolicy.budgetPolicy = null; }
  ,managedExtraBudgetField: c => { c.modelSelection = managedSelection(30, 'coding-extended-v1'); c.modelSelection.attemptPolicy.extra = true; }
  ,managedRetryOverflow: c => { c.modelSelection = managedSelection(30, 'coding-extended-v1'); c.modelSelection.attemptPolicy.apiMaxRetries = 3; }
  ,managedExtendedMedium: c => { c.modelSelection = managedSelection(30, 'coding-extended-v1'); c.modelSelection.riskClass = 'medium'; }
  ,managedExtendedHigh: c => { c.modelSelection = managedSelection(30, 'coding-extended-v1'); c.modelSelection.riskClass = 'high'; }
  ,managedExtendedCritical: c => { c.modelSelection = managedSelection(30, 'coding-extended-v1'); c.modelSelection.riskClass = 'critical'; }
  ,managedExtendedOllama: c => { c.modelSelection = { schemaVersion: 'roost-managed-hermes-backend-v1', agent: 'managed_hermes', riskClass: 'low', fallback: 'none',
    backend: 'ollama_loopback', provider: 'ollama', endpoint: 'http://127.0.0.1:11434',
    modelSelection: { provider: 'hermes_local', model: 'gpt-oss:20b', modelFamily: 'gpt-oss', modelDigest: `sha256:${'a'.repeat(64)}`, reasoningEffort: 'low' },
    config: { reasoning: 'explicit_model_effort', remote: false }, attemptPolicy: managedSelection(30, 'coding-extended-v1').attemptPolicy }; }
};
async function validVariants() {
  const base = await fixture(), variants: any[] = [base];
  for (const inspectReadOnly of [
    { kind: "verifier", verifiedExecutionId: randomUUID(), verifiedEvidenceDigest: "a".repeat(64) },
    { kind: "code-reviewer", verifiedTaskId: randomUUID(), verifiedExecutionId: randomUUID(), verifiedEvidenceDigest: "a".repeat(64), baselineCommit: "b".repeat(40), reviewedCommit: "c".repeat(40) }
  ]) variants.push({ ...structuredClone(base), nativeBoundary: { ...base.nativeBoundary, inspectReadOnly } });
  const local = { provider: "hermes_local", model: "gpt-oss:20b", modelFamily: "gpt-oss", modelDigest: `sha256:${"a".repeat(64)}`, reasoningEffort: "low" };
  const managed = { schemaVersion: "roost-managed-hermes-backend-v1", agent: "managed_hermes", riskClass: "low", fallback: "none",
    attemptPolicy: { maxTurns: 4, apiMaxRetries: 0, unavailable: "stop_attempt", restart: "never" } };
  for (const modelSelection of [local,
    { ...managed, backend: "codex_responses", provider: "openai-codex", modelSelection: { model: "gpt-5.6-sol", reasoningEffort: "low" }, auth: "same_owner_subscription" },
    { ...managed, backend: "ollama_loopback", provider: "ollama", endpoint: "http://127.0.0.1:11434", modelSelection: local, config: { reasoning: "explicit_model_effort", remote: false } }
  ]) variants.push({ ...structuredClone(base), modelSelection });
  variants.push({ ...structuredClone(base), nativeBoundary: { ...base.nativeBoundary, readPaths: [".env.example", "src/module.ts"] } });
  variants.push({ ...structuredClone(base), nativeBoundary: { ...base.nativeBoundary, readPaths: [], readFragments: [{path:'docs/accepted.md',startLine:1,endLine:200}] } });
  variants.push({ ...structuredClone(base), nativeBoundary: { ...base.nativeBoundary, readFragments: [{path:'docs/accepted.md',startLine:1,endLine:5},{path:'docs/accepted.md',startLine:6,endLine:10}] } });
  for (const variant of variants.slice(0, 3)) for (const [turns, policy] of [
    [1, undefined], [24, undefined], [24, 'coding-small-v1'], [25, 'coding-extended-v1'], [48, 'coding-extended-v1']
  ] as const) variants.push({ ...structuredClone(variant), modelSelection: managedSelection(turns, policy) });
  for (const riskClass of ['low', 'medium', 'high', 'critical']) variants.push({ ...structuredClone(base), modelSelection: { ...managedSelection(24, 'coding-small-v1'), riskClass } });
  return variants;
}
test("valid auditor, verifier and exact-commit reviewer remain readonly across admitted model shapes", async () => {
  for (const c of await validVariants()) assert.equal(await riskScopeIsReadonly(c), true);
});
test("malformed or mutating audit declarations count as changes", async () => {
  for (const [name, mutate] of Object.entries(malformed)) {
    const c = await fixture(); mutate(c);
    assert.equal(await riskScopeIsReadonly(c), false, name);
    const audit = entry(), coder = entry(), classified = new Set<string>();
    if (await riskScopeIsReadonly(c)) classified.add(audit.taskId);
    assert.equal(computeRisk([audit, coder], classified).level, "medium", name);
  }
  const body = { requestId: randomUUID(), expectedVersion: "a".repeat(64), entries: [entry()], jointRationale: "Complete joint assessment" };
  assert.equal(riskAssessmentSchema.safeParse({ ...body, readonlyTaskIds: [body.entries[0]!.taskId] }).success, false);
  assert.equal(riskAssessmentSchema.safeParse({ ...body, entries: [{ ...body.entries[0], readonly: true }] }).success, false);
});

// Opt-in native PostgreSQL proof, restricted to a named local Docker container.
// All SQL runs in a rolled-back transaction using only temporary tables/functions.
test("PostgreSQL derives the same changes and rejects forged low assessment results", { skip: !process.env.ROOST_RISK_SQL_TEST_CONTAINER }, async () => {
  const container = process.env.ROOST_RISK_SQL_TEST_CONTAINER!;
  assert.match(container, /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/);
  const qualify = (s: string) => s.replace(/\btask_risk_(contract_shape|readonly_schema|readonly_contract|history_guard|sources|version|relative_path|readonly_selection)\(/g, "pg_temp.task_risk_$1(");
  const functions = qualify(migration.slice(migration.indexOf("CREATE FUNCTION task_risk_contract_shape"), migration.lastIndexOf("COMMIT;")))
    + qualify(fragmentsMigration.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''))
    + qualify(managedMigration.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
  const json = (v: unknown) => `$json$${JSON.stringify(v)}$json$::jsonb`;
  const c = await fixture(), audits = Array.from({ length: 4 }, entry), changes = Array.from({ length: 4 }, entry);
  let sql = `BEGIN;
CREATE TEMP TABLE ready_source_fence(id int,revision int); INSERT INTO ready_source_fence VALUES(1,0);
CREATE TEMP TABLE tasks(id uuid,workspace_id uuid);
CREATE TEMP TABLE workspace_memberships(workspace_id uuid,user_id uuid,role text);
CREATE TEMP TABLE task_risk_scopes(id uuid,task_id uuid,workspace_id uuid,input jsonb);
CREATE TEMP TABLE company_records(id uuid,workspace_id uuid,status text,application_id uuid,description text,business_purpose text,desired_state text,expected_behavior text,updated_at timestamp);
CREATE TEMP TABLE task_risk_assessments(task_id uuid,workspace_id uuid,actor_user_id uuid,version int,source_version text,sources jsonb,entries jsonb,result jsonb,algorithm text);
CREATE TEMP TABLE risk_test_state(sources jsonb);
CREATE FUNCTION pg_temp.task_risk_sources(uuid) RETURNS jsonb LANGUAGE SQL AS 'SELECT sources FROM risk_test_state';
CREATE FUNCTION pg_temp.task_risk_version(uuid) RETURNS text LANGUAGE SQL AS 'SELECT ''test-version''::text';
${functions}
CREATE TRIGGER task_risk_history_guard BEFORE INSERT ON task_risk_assessments FOR EACH ROW EXECUTE FUNCTION pg_temp.task_risk_history_guard();
DO $proof$ BEGIN IF NOT pg_temp.task_risk_readonly_contract(${json(c)}) THEN RAISE EXCEPTION 'valid readonly rejected'; END IF; END $proof$;
DO $proof$ BEGIN IF pg_temp.task_risk_contract_shape('true'::jsonb,'{"k":"refinement","rule":"unmirrored","inner":{"k":"boolean"}}'::jsonb)
 THEN RAISE EXCEPTION 'unmirrored SQL refinement admitted'; END IF; END $proof$;
`;
  for (const v of await validVariants()) sql += `DO $proof$ BEGIN IF NOT pg_temp.task_risk_readonly_contract(${json(v)}) THEN RAISE EXCEPTION 'valid variant rejected'; END IF; END $proof$;\n`;
  for (const [name, mutate] of Object.entries(malformed)) {
    const bad = structuredClone(c); mutate(bad);
    sql += `DO $proof$ BEGIN IF pg_temp.task_risk_readonly_contract(${json(bad)}) THEN RAISE EXCEPTION 'malformed admitted: ${name}'; END IF; END $proof$;\n`;
  }
  const workspaceId = randomUUID(), actor = randomUUID(), target = changes[0]!.taskId;
  sql += `INSERT INTO tasks VALUES('${target}','${workspaceId}'); INSERT INTO workspace_memberships VALUES('${workspaceId}','${actor}','owner');
INSERT INTO company_records VALUES('${evidence.id}','${workspaceId}','active',NULL,'Synthetic evidence',NULL,NULL,NULL,'${evidence.revision}');\n`;
  let version = 0;
  for (const [count, malformedAudit] of [[1, false], [2, false], [4, false], [1, true]] as const) {
    const entries = [...audits, ...changes.slice(0, count)], sources = entries.map(e => ({ taskId: e.taskId, scopeId: randomUUID(), applicationId: null }));
    sql += "DELETE FROM task_risk_scopes; DELETE FROM risk_test_state;\n";
    for (const s of sources) {
      const contract = audits.some(e => e.taskId === s.taskId) ? structuredClone(c) : {};
      if (malformedAudit && s.taskId === audits[0]!.taskId) malformed.missingObjective!(contract);
      sql += `INSERT INTO task_risk_scopes VALUES('${s.scopeId}','${s.taskId}','${workspaceId}',${json({ contract })});\n`;
    }
    sql += `INSERT INTO risk_test_state VALUES(${json(sources)});\n`;
    const valid = computeRisk(entries, new Set(audits.filter((_, i) => !malformedAudit || i > 0).map(e => e.taskId)));
    assert.equal(valid.level, malformedAudit || count === 2 ? "medium" : count === 4 ? "high" : "low");
    const insert = (result: unknown, v: number) => `INSERT INTO task_risk_assessments VALUES('${target}','${workspaceId}','${actor}',${v},'test-version',${json(sources)},${json(entries)},${json(result)},'roost-native-risk-v2')`;
    for (const forged of [{ ...valid, mutationCount: 0 }, { ...valid, readonlyTaskIds: entries.map(e => e.taskId).sort() }, { ...valid, cumulativeEscalation: 99 },
      ...(count > 1 || malformedAudit ? [{ ...valid, dimensions: Object.fromEntries(riskDimensions.map(d => [d, "low"])), level: "low" }] : [])]) {
      sql += `DO $proof$ BEGIN BEGIN ${insert(forged, version + 1)}; RAISE EXCEPTION 'forged result admitted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'task_risk_result_invalid' THEN RAISE; END IF; END; END $proof$;\n`;
    }
    sql += `${insert(valid, ++version)};\n`;
  }
  sql += "ROLLBACK;\n";
  const run = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "companycore", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"],
    { input: sql, encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
  assert.equal(run.status, 0, run.stderr || run.error?.message);
});
