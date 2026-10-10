import test from "node:test";
import assert from "node:assert/strict";
import { companyInformationClass, submitCompanyPreparation } from "../modules/agent-runtime/company-information-preparation";

test("rejected company submission keeps the accepted contract but removes Ready authority", async () => {
  const previous = { status: "ready", pinId: "prior-pin", contract: { executionClass: companyInformationClass, context: { company: [{ id: "selected-source" }] } },
    prompt: "Summarize the selected record" };
  let stored: any, recorded: any;
  const db = {
    task: { update: async ({ data }: any) => { stored = data.executionReadiness; } },
    event: { create: async ({ data }: any) => { recorded = data; } }
  } as any;
  const task = { id: "00000000-0000-4000-8000-000000000002", executionReadiness: previous };
  const input = { applicationId: "invalid-application", requestId: "00000000-0000-4000-8000-000000000003", contract: { executionClass: companyInformationClass } };
  const result = await submitCompanyPreparation(db, "00000000-0000-4000-8000-000000000001", task, input,
    { requestedByType: "user", requestedById: "00000000-0000-4000-8000-000000000004" }, async value => value);
  assert.equal(result.error, "task_execution_contract_invalid");
  assert.equal(stored.status, "needs_context");
  assert.equal(stored.reason, "submission_incomplete");
  assert.equal(stored.pinId, previous.pinId);
  assert.deepEqual(stored.contract, previous.contract);
  assert.equal(stored.prompt, previous.prompt);
  assert.equal(recorded.type, "task_execution_submission_rejected");
  assert.equal(Object.hasOwn(recorded.payload, "contract"), false);
  assert.equal(Object.hasOwn(result.readiness, "contract"), false);
});
