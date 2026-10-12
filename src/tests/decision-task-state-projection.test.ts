import assert from "node:assert/strict";
import { test } from "node:test";
import { decisionTaskStateProjection } from "../modules/decisions/decision-governance";
import { redactionPolicy } from "../modules/agent-runtime/runtime-redaction-policy";

test("decision detail sends only the task readiness status within the native content boundary", () => {
  let deep: unknown = "historical context";
  for (let i = 0; i < 40; i++) deep = { previous: deep };
  const row = { id: "task-id", title: "Exact review task", executionReadiness: { status: "ready", historicalContext: deep } };
  assert.equal(redactionPolicy.sanitize(row, { mode: "required", secrets: [] }).blocked, true);

  const projected = decisionTaskStateProjection(row);
  assert.deepEqual(projected, { id: row.id, title: row.title, executionReadiness: { status: "ready" } });
  assert.equal(redactionPolicy.sanitize(projected, { mode: "required", secrets: [] }).blocked, false);
  assert.deepEqual(decisionTaskStateProjection({ ...row, executionReadiness: null }), {
    id: row.id, title: row.title, executionReadiness: { status: null }
  });
});
