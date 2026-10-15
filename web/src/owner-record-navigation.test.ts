import assert from "node:assert/strict";
import test from "node:test";
import { applicationReturnPath, decisionLinksExactApplicationTask, innovationRecordPath, recordIdFromQuery, validateApplicationReturn, validateDecisionNavigation, validateTaskNavigation, validateTaskPacketNavigation, validateGovernedDecisionPacketNavigation } from "./owner-record-navigation";
import { canonicalPostAuthPath } from "./app-route-registry";

const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const canonical = "/areas?area=11-innowacje&view=overview";

test("attention links retain only exact record targets after authentication", () => {
  assert.equal(canonicalPostAuthPath(`/areas?area=04-operacje&view=tasks&taskId=${id}&from=attention`), `/areas?area=04-operacje&view=tasks&taskId=${id}&from=attention`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&decisionId=${id}&from=attention`), `/areas?area=01-strategia&view=decisions&decisionId=${id}&from=attention`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&scope=history&decisionId=${id}`), `/areas?area=01-strategia&view=decisions&scope=history&decisionId=${id}`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&scope=history`), `/areas?area=01-strategia&view=decisions&scope=history`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&scope=history&decisionId=invalid`), `/areas?area=01-strategia&view=decisions&scope=history`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&scope=history&decisionId=${id}&decisionId=${other}`), `/areas?area=01-strategia&view=decisions&scope=history`);
  assert.equal(canonicalPostAuthPath(`/areas?area=09-technologia&view=incidents&recordId=${id}&from=attention`), `/areas?area=09-technologia&view=incidents&recordId=${id}&from=attention`);
  assert.equal(canonicalPostAuthPath(`/areas?area=04-operacje&view=tasks&taskId=${id}&taskId=${other}&from=attention`), "/areas?area=04-operacje&view=tasks");
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&decisionId=invalid&from=attention`), "/areas?area=01-strategia&view=decisions");
});

test("Task history links retain only validated scope and exact record after authentication", () => {
  const canonicalHistory = `/areas?area=04-operacje&view=tasks&department=04-operacje&scope=history`;
  assert.equal(canonicalPostAuthPath(`${canonicalHistory}&historicalTaskId=${id}`), `${canonicalHistory}&historicalTaskId=${id}`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=tasks&department=01-strategia&scope=history&historicalTaskId=${id}`), `/areas?area=01-strategia&view=tasks&department=01-strategia&scope=history&historicalTaskId=${id}`);
  assert.equal(canonicalPostAuthPath(`${canonicalHistory}&historicalTaskId=${id}&historicalTaskId=${other}`), canonicalHistory);
  assert.equal(canonicalPostAuthPath(`${canonicalHistory}&historicalTaskId=../bad`), canonicalHistory);
  assert.equal(canonicalPostAuthPath(`/areas?area=04-operacje&view=tasks&scope=unknown&historicalTaskId=${id}`), "/areas?area=04-operacje&view=tasks");
  assert.equal(canonicalPostAuthPath(`${canonicalHistory}&taskId=${other}&historicalTaskId=${id}`), `${canonicalHistory}&historicalTaskId=${id}`);
});

test("department signal links retain exact records and validated scope after authentication", () => {
  const department = "09-technologia";
  const task = `/areas?area=04-operacje&view=tasks&department=${department}&taskId=${id}`;
  const decision = `/areas?area=01-strategia&view=decisions&department=${department}&decisionId=${id}`;
  const risk = `/areas?area=12-zarzadzanie&view=risks&department=${department}&riskId=${id}`;
  const incident = `/areas?area=09-technologia&view=incidents&department=${department}&recordId=${id}`;
  for (const path of [task, decision, risk, incident]) assert.equal(canonicalPostAuthPath(path), path);
  assert.equal(canonicalPostAuthPath(`/areas?area=12-zarzadzanie&view=risks&department=${department}&riskId=invalid`), `/areas?area=12-zarzadzanie&view=risks&department=${department}`);
  assert.equal(canonicalPostAuthPath(`${risk}&riskId=${other}`), `/areas?area=12-zarzadzanie&view=risks&department=${department}`);
  assert.equal(canonicalPostAuthPath(`${risk}&department=01-strategia`), `/areas?area=12-zarzadzanie&view=risks&riskId=${id}`);
  assert.equal(canonicalPostAuthPath(`${task}&department=../invalid`), `/areas?area=04-operacje&view=tasks&taskId=${id}`);
  assert.equal(canonicalPostAuthPath(`/areas?area=01-strategia&view=decisions&department=../invalid&decisionId=${id}`), `/areas?area=01-strategia&view=decisions&decisionId=${id}`);
});

test("governed Decision navigation checks the exact canonical record before loading its current impact", async () => {
  assert.equal(await validateGovernedDecisionPacketNavigation(id, async () => ({ data: { id, source: "roost_decision" } })), id);
  for (const packet of [{}, { data: { id: other, source: "roost_decision" } }, { data: { id, source: "legacy" } }, { data: { id } }]) {
    await assert.rejects(validateGovernedDecisionPacketNavigation(id, async () => packet), /decision_navigation_unavailable/);
  }
  const denied = new Error("request_403");
  await assert.rejects(validateGovernedDecisionPacketNavigation(id, async () => { throw denied; }), error => error === denied);
  let reads = 0;
  await assert.rejects(validateGovernedDecisionPacketNavigation("invalid", async () => { reads++; return {}; }), /invalid_decision_navigation/);
  assert.equal(reads, 0);
});

test("the canonical task route validates the actual HTTP data envelope", async () => {
  assert.equal(await validateTaskPacketNavigation(id, async () => ({ data: { id } })), id);
  await assert.rejects(validateTaskPacketNavigation(id, async () => ({ data: { id: other } })), /task_navigation_unavailable/);
  await assert.rejects(validateTaskPacketNavigation(id, async () => ({})), /task_navigation_unavailable/);
  const denied = new Error("request_403");
  await assert.rejects(validateTaskPacketNavigation(id, async () => { throw denied; }), error => error === denied);
  let reads = 0;
  await assert.rejects(validateTaskPacketNavigation("invalid", async () => { reads++; return { data: { id } }; }), /invalid_task_navigation/);
  assert.equal(reads, 0);
});

test("application evidence navigation retains only the exact record and supported cockpit", () => {
  assert.equal(innovationRecordPath(`?area=11-innowacje&view=overview&applicationId=${id}&cockpit=evidence&redirect=https://other.example&write=1`, canonical), `${canonical}&applicationId=${id}&cockpit=evidence`);
  assert.equal(innovationRecordPath(`?area=11-innowacje&view=overview&applicationId=${id}&cockpit=overview`, canonical), applicationReturnPath(id));
  assert.equal(innovationRecordPath(`?applicationId=${id}&cockpit=architecture&architecture=history&write=1`, canonical), `${canonical}&applicationId=${id}&cockpit=architecture&architecture=history`);
  assert.equal(innovationRecordPath(`?applicationId=${id}&cockpit=architecture&architecture=history&architecture=history`, canonical), canonical);
  assert.equal(innovationRecordPath(`?applicationId=${id}&cockpit=architecture&architecture=current`, canonical), canonical);
  assert.equal(innovationRecordPath(`?applicationId=${id}&cockpit=execution`, canonical), canonical);
  assert.equal(innovationRecordPath(`?applicationId=${id}`, canonical), canonical);
});

test("application links survive sign-in only with one exact record and return hint", () => {
  const task = `/areas?area=04-operacje&view=tasks&taskId=${id}&fromApplicationId=${other}`;
  const decision = `/areas?area=01-strategia&view=decisions&decisionId=${id}&fromApplicationId=${other}`;
  assert.equal(canonicalPostAuthPath(task), task);
  assert.equal(canonicalPostAuthPath(decision), decision);
  assert.equal(canonicalPostAuthPath(`${task}&fromApplicationId=${id}`), `/areas?area=04-operacje&view=tasks&taskId=${id}`);
  assert.equal(canonicalPostAuthPath(`${decision}&fromApplicationId=../other`), `/areas?area=01-strategia&view=decisions&decisionId=${id}`);
  assert.equal(canonicalPostAuthPath(applicationReturnPath(id)), applicationReturnPath(id));
  assert.equal(canonicalPostAuthPath(`${canonical}&applicationId=${id}&cockpit=evidence`), `${canonical}&applicationId=${id}&cockpit=evidence`);
  assert.equal(canonicalPostAuthPath(`${canonical}&applicationId=${id}&cockpit=architecture&architecture=history`), `${canonical}&applicationId=${id}&cockpit=architecture&architecture=history`);
  assert.equal(canonicalPostAuthPath(`${canonical}&applicationId=${id}&cockpit=write`), canonical);
});

test("return to application requires the same workspace projection to link the exact Task or Decision", async () => {
  const operation = { nearestOutcome: { taskId: id }, decisions: [{ id: other, relatedTask: { id: other } }], stage: { decisionId: null } };
  const read = async () => ({ data: { id: other, operation } });
  assert.equal(await validateApplicationReturn(other, id, "task", read), applicationReturnPath(other));
  assert.equal(await validateApplicationReturn(other, other, "decision", read), applicationReturnPath(other));
  await assert.rejects(validateApplicationReturn(id, id, "task", read), /application_return_unavailable/);
  await assert.rejects(validateApplicationReturn(other, id, "decision", read), /application_return_unavailable/);
  assert.equal(await validateApplicationReturn(other, other, "task", read), applicationReturnPath(other));
  await assert.rejects(validateApplicationReturn("../other", id, "task", read), /invalid_application_return/);
  await assert.rejects(validateApplicationReturn(other, id, "task", async () => { throw Error("request_403"); }), /request_403/);
});
test("accepted baseline Decision and its audit Task return to the same application", async () => {
  const read = async () => ({ data: { id, operation: { stage: { decisionId: other, relatedTask: { id } },
    nearestOutcome: null, decisions: [] } } });
  assert.equal(await validateApplicationReturn(id, other, "decision", read), applicationReturnPath(id));
  assert.equal(await validateApplicationReturn(id, id, "task", read), applicationReturnPath(id));
  await assert.rejects(validateApplicationReturn(id, other, "task", read), /application_return_unavailable/);
  assert.equal(decisionLinksExactApplicationTask({ scope: [{ type: "application", id }], applicationBaseline: { applicationId: id, auditTaskId: other } }, id, other), true);
  assert.equal(decisionLinksExactApplicationTask({ scope: [{ type: "application", id }], applicationBaseline: { applicationId: other, auditTaskId: other } }, id, other), false);
  assert.equal(decisionLinksExactApplicationTask({ scope: [{ type: "application", id }], applicationBaseline: { applicationId: id, auditTaskId: id } }, id, other), false);
  assert.equal(decisionLinksExactApplicationTask({ scope: [{ type: "task", id: other }] }, id, other), true);
  assert.equal(decisionLinksExactApplicationTask({ scope: [{ type: "task", id }] }, id, other), false);
});

test("archived Task history returns only to its exact owning application", async () => {
  const read = async () => ({ data: { id, operation: { nearestOutcome: null, taskHistory: [{ taskId: other }] } } });
  assert.equal(await validateApplicationReturn(id, other, "task", read), applicationReturnPath(id));
  await assert.rejects(validateApplicationReturn(id, id, "task", read), /application_return_unavailable/);
  await assert.rejects(validateApplicationReturn(other, other, "task", read), /application_return_unavailable/);
});

test("ambiguous or malformed record targets cannot be preserved", () => {
  for (const query of [
    `?applicationId=${id}&applicationId=${other}&cockpit=evidence`,
    `?applicationId=${id}&cockpit=evidence&cockpit=evidence`,
    "?applicationId=../../other&cockpit=evidence",
    "?cockpit=evidence"
  ]) assert.equal(innovationRecordPath(query, canonical), canonical);
  assert.equal(recordIdFromQuery(`?decisionId=${id}&decisionId=${other}`, "decisionId"), null);
  assert.equal(recordIdFromQuery("?decisionId=invalid", "decisionId"), null);
  const mixedCase = "A0000000-0000-4000-8000-000000000001";
  assert.equal(recordIdFromQuery(`?decisionId=${mixedCase}`, "decisionId"), mixedCase.toLowerCase());
});

test("Decision entry requires the exact record returned by the workspace-scoped read", async () => {
  const reads: string[] = [];
  assert.equal(await validateDecisionNavigation(id, async requested => { reads.push(requested); return { selected: { decisionId: id } }; }), id);
  assert.deepEqual(reads, [id]);
  await assert.rejects(validateDecisionNavigation(id, async () => ({ selected: { decisionId: other } })), /decision_navigation_unavailable/);
  await assert.rejects(validateDecisionNavigation(id, async () => ({ selected: { id, decisionId: other } })), /decision_navigation_unavailable/);
  await assert.rejects(validateDecisionNavigation(id, async () => ({ selected: null })), /decision_navigation_unavailable/);
});

test("missing, denied and invalid Decision targets never become openable records", async () => {
  for (const status of [403, 404]) {
    const denied = new Error(`request_${status}`);
    await assert.rejects(validateDecisionNavigation(id, async () => { throw denied; }), error => error === denied);
  }
  let reads = 0;
  await assert.rejects(validateDecisionNavigation("invalid", async () => { reads++; return { selected: { decisionId: id } }; }), /invalid_decision_navigation/);
  assert.equal(reads, 0);
});

test("Task entry opens only the exact workspace record and preserves denied state", async () => {
  assert.equal(recordIdFromQuery(`?taskId=${id}`, "taskId"), id);
  assert.equal(recordIdFromQuery(`?taskId=${id}&taskId=${other}`, "taskId"), null);
  assert.equal(await validateTaskNavigation(id, async () => ({ id })), id);
  await assert.rejects(validateTaskNavigation(id, async () => ({ id: other })), /task_navigation_unavailable/);
  await assert.rejects(validateTaskNavigation(id, async () => ({})), /task_navigation_unavailable/);
  for (const status of [403, 404]) {
    const denied = new Error(`request_${status}`);
    await assert.rejects(validateTaskNavigation(id, async () => { throw denied; }), error => error === denied);
  }
  let reads = 0;
  await assert.rejects(validateTaskNavigation("invalid", async () => { reads++; return { id }; }), /invalid_task_navigation/);
  assert.equal(reads, 0);
});
