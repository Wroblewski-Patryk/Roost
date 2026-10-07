import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const priorPath = "prisma/migrations/20260907220000_active_context_stop/migration.sql";
const nextPath = "prisma/migrations/20261007144000_invalidated_unclaimed_cancellation/migration.sql";
const source = (file: string) => readFileSync(file, "utf8").replaceAll("\r\n", "\n");
const functionText = (text: string) => {
  const match = text.match(/CREATE(?: OR REPLACE)? FUNCTION preserve_context_stop_fence\(\)[\s\S]*?END \$\$;/);
  assert.ok(match, "context-stop trigger function missing");
  return match[0];
};

test("additive migration keeps the entire existing active context-stop guard unchanged", () => {
  const sql = source(nextPath), next = functionText(sql);
  const withoutException = next.replace(/  -- BEGIN invalidated unclaimed cancellation exception\n[\s\S]*?  -- END invalidated unclaimed cancellation exception\n/, "");
  assert.equal(withoutException, functionText(source(priorPath)).replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION"));
  assert.ok(sql.trim().startsWith("BEGIN;") && sql.trim().endsWith("COMMIT;"));
  assert.ok(!/\b(?:DROP|TRUNCATE|DELETE|INSERT INTO|UPDATE\s+[a-z_]+\s+SET|ALTER TABLE)\b/i.test(sql));
  assert.match(next, /to_jsonb\(NEW\) - ARRAY\['status', 'cancel_requested_at', 'completed_at', 'updated_at'\]/);
});

const container = process.env.ROOST_SQL_TEST_CONTAINER;
test("PostgreSQL: only immutable invalidated unclaimed queues can close without a native stop", { skip: !container, timeout: 30000 }, () => {
  assert.match(container!, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
  const temporary = (text: string) => functionText(text).replace("FUNCTION preserve_context_stop_fence()", "FUNCTION pg_temp.preserve_context_stop_fence()");
  let sql = `BEGIN;
SET LOCAL search_path = pg_temp, pg_catalog;
DO $proof$ BEGIN
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'system database required'; END IF;
END $proof$;
CREATE TEMP TABLE agent_executions (
  id int PRIMARY KEY, status text, attempt int, agent_host_id uuid, started_at timestamp(3),
  lease_token text, lease_expires_at timestamp(3), last_heartbeat_at timestamp(3), codex_thread_id text,
  completed_at timestamp(3), cancel_requested_at timestamp(3), updated_at timestamp(3),
  context_invalidated_at timestamp(3), context_stopped_at timestamp(3), context_invalidation jsonb,
  metadata jsonb, error_state jsonb, checkpoint jsonb, checkpoint_version int, prompt text,
  base_branch text, changed_files jsonb, verification jsonb, usage jsonb, unrelated_future_column text
) ON COMMIT DROP;
${temporary(source(priorPath))}
CREATE TRIGGER preserve_context_stop_fence BEFORE UPDATE ON agent_executions
FOR EACH ROW EXECUTE FUNCTION pg_temp.preserve_context_stop_fence();
INSERT INTO agent_executions VALUES (
  1,'queued',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-01 00:00:01','2026-01-01 00:00:01',
  '2026-01-01 00:00:01',NULL,'{"reason":"context_changed","keep":"original"}',
  '{"readyContextPin":{"pinId":"synthetic"},"keep":"original"}',
  '{"code":"agent_execution_context_invalidated","retryable":false}',
  '{"keep":"original"}',0,'Synthetic unchanged prompt','codex/synthetic','[]','{}','{}','preserved'
);
CREATE TEMP TABLE original_fixture AS SELECT * FROM agent_executions;
DO $proof$ BEGIN
  BEGIN
    UPDATE agent_executions SET status='cancelled',cancel_requested_at='2026-01-01 00:00:02',
      completed_at='2026-01-01 00:00:02',updated_at='2026-01-01 00:00:02' WHERE id=1;
    RAISE EXCEPTION 'historical guard unexpectedly admitted queued cancellation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'agent_execution_context_invalidated' THEN RAISE; END IF;
  END;
END $proof$;
${temporary(source(nextPath))}
DO $proof$ DECLARE before_row jsonb; after_row jsonb; BEGIN
  SELECT to_jsonb(t) INTO before_row FROM agent_executions t WHERE id=1;
  UPDATE agent_executions SET status='cancelled',cancel_requested_at='2026-01-01 00:00:02',
    completed_at='2026-01-01 00:00:02',updated_at='2026-01-01 00:00:02',lease_token=NULL,lease_expires_at=NULL WHERE id=1;
  SELECT to_jsonb(t) INTO after_row FROM agent_executions t WHERE id=1;
  IF after_row->>'status' <> 'cancelled' OR
    (before_row - ARRAY['status','cancel_requested_at','completed_at','updated_at']) IS DISTINCT FROM
    (after_row - ARRAY['status','cancel_requested_at','completed_at','updated_at'])
  THEN RAISE EXCEPTION 'queued cancellation changed preserved observations'; END IF;
END $proof$;
`;
  const cancellationFields = "status='cancelled',cancel_requested_at='2026-01-01 00:00:02',completed_at='2026-01-01 00:00:02',updated_at='2026-01-01 00:00:02'";
  const rejected = (name: string, prepare: string, mutation: string, fields = cancellationFields) => {
    // Preparation touches only this owned temporary fixture; enforcement stays
    // enabled for the cancellation probe and each failed statement rolls back.
    sql += `TRUNCATE agent_executions;
INSERT INTO agent_executions SELECT * FROM original_fixture;
ALTER TABLE agent_executions DISABLE TRIGGER preserve_context_stop_fence;
${prepare}
ALTER TABLE agent_executions ENABLE TRIGGER preserve_context_stop_fence;
DO $proof$ DECLARE before_row jsonb; after_row jsonb; BEGIN
  SELECT to_jsonb(t) INTO before_row FROM agent_executions t WHERE id=1;
  BEGIN
    UPDATE agent_executions SET ${fields} ${mutation} WHERE id=1;
    RAISE EXCEPTION 'invalid cancellation admitted: ${name}';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'agent_execution_context_invalidated' THEN RAISE; END IF;
  END;
  SELECT to_jsonb(t) INTO after_row FROM agent_executions t WHERE id=1;
  IF after_row IS DISTINCT FROM before_row THEN RAISE EXCEPTION 'failed probe leaked changes'; END IF;
END $proof$;
`;
  };
  for (const [name, preparation] of [
    ["claimed", "status='claimed',attempt=1"], ["running", "status='running',attempt=1"],
    ["previous attempt", "attempt=1"], ["assigned host", "agent_host_id='00000000-0000-4000-8000-000000000001'"],
    ["started", "started_at='2026-01-01'"], ["lease", "lease_token='synthetic'"],
    ["lease expiry", "lease_expires_at='2026-01-01'"], ["heartbeat", "last_heartbeat_at='2026-01-01'"],
    ["thread", "codex_thread_id='synthetic'"], ["completed", "completed_at='2026-01-01'"]
  ]) rejected(name, `UPDATE agent_executions SET ${preparation} WHERE id=1;`, "");
  for (const [name, change] of [
    ["metadata", "metadata='{}'"], ["error", "error_state='{}'"], ["checkpoint", "checkpoint='{}'"],
    ["checkpoint version", "checkpoint_version=1"], ["prompt", "prompt='Changed'"], ["branch", "base_branch='changed'"],
    ["host assignment", "agent_host_id='00000000-0000-4000-8000-000000000001'"], ["attempt mutation", "attempt=1"],
    ["context invalidation", "context_invalidated_at=NULL"], ["context signal", "context_invalidation='{}'"],
    ["context signal removal", "context_invalidation=NULL"], ["fake stop", "context_stopped_at='2026-01-01'"],
    ["files", "changed_files='[\"changed\"]'"], ["verification", "verification='{\"fake\":true}'"],
    ["usage", "usage='{\"tokens\":1}'"], ["future column", "unrelated_future_column='changed'"],
    ["new lease", "lease_token='synthetic-new'"], ["new lease expiry", "lease_expires_at='2026-01-01'"]
  ]) rejected(name, "", `,${change}`);
  rejected("missing completed time", "", "", cancellationFields.replace("completed_at='2026-01-01 00:00:02'", "completed_at=NULL"));
  rejected("missing cancel request time", "", "", cancellationFields.replace("cancel_requested_at='2026-01-01 00:00:02'", "cancel_requested_at=NULL"));
  for (const terminal of ["failed", "completed"]) {
    sql += `TRUNCATE agent_executions; INSERT INTO agent_executions SELECT * FROM original_fixture;
DO $proof$ BEGIN
  BEGIN
    UPDATE agent_executions SET status='${terminal}',completed_at='2026-01-01 00:00:02' WHERE id=1;
    RAISE EXCEPTION 'other terminal status admitted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'agent_execution_context_invalidated' THEN RAISE; END IF; END;
END $proof$;
`;
  }
  // Existing active attempt rules still require the old native-stop fence.
  sql += `TRUNCATE agent_executions; INSERT INTO agent_executions SELECT * FROM original_fixture;
ALTER TABLE agent_executions DISABLE TRIGGER preserve_context_stop_fence;
UPDATE agent_executions SET status='running',attempt=1,agent_host_id='00000000-0000-4000-8000-000000000001',
  started_at='2026-01-01',lease_token='synthetic',lease_expires_at='2026-01-01',context_stopped_at='2026-01-01' WHERE id=1;
ALTER TABLE agent_executions ENABLE TRIGGER preserve_context_stop_fence;
UPDATE agent_executions SET status='cancelled',completed_at='2026-01-01 00:00:02',
  cancel_requested_at='2026-01-01 00:00:02',lease_token=NULL,lease_expires_at=NULL WHERE id=1;
DO $proof$ BEGIN
  IF (SELECT status FROM agent_executions WHERE id=1) <> 'cancelled' THEN RAISE EXCEPTION 'acknowledged active cancellation regressed'; END IF;
END $proof$;
SELECT 'invalidated-unclaimed-cancellation:positive-and-32-negatives:passed';
ROLLBACK;
SELECT CASE WHEN to_regclass('pg_temp.agent_executions') IS NULL AND
  to_regprocedure('pg_temp.preserve_context_stop_fence()') IS NULL
  THEN 'rollback:temporary-objects-absent' ELSE 'rollback:FAILED' END;
`;
  const output = execFileSync("docker", ["exec", "-i", container!, "sh", "-c",
    'exec psql -X -qAt -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d postgres'],
    { input: sql, encoding: "utf8", windowsHide: true, timeout: 25000, maxBuffer: 32768 });
  assert.equal(output.trim(), "invalidated-unclaimed-cancellation:positive-and-32-negatives:passed\nrollback:temporary-objects-absent");
});
