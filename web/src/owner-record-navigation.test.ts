import assert from "node:assert/strict";
import test from "node:test";
import { innovationRecordPath, recordIdFromQuery, validateDecisionNavigation, validateTaskNavigation, validateTaskPacketNavigation } from "./owner-record-navigation";

const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const canonical = "/areas?area=11-innowacje&view=overview";

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
  assert.equal(innovationRecordPath(`?applicationId=${id}&cockpit=execution`, canonical), canonical);
  assert.equal(innovationRecordPath(`?applicationId=${id}`, canonical), canonical);
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
