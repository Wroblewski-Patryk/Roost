import assert from "node:assert/strict";
import test from "node:test";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { taskRoleIssues } from "./lib/agent-host-task-roles.mjs";
const validate = f => validateExecutionPacket(sealPacket(f.packet), f.claimed, f.taskContext, f.applicationContext);
test("five explicit scoped roles pass without granting release execution", () => validate(validPacketFixture()));
for (const [name, change] of Object.entries({
  missing: f => delete f.packet.contract.taskRoles,
  selfReview: f => { f.packet.contract.taskRoles.verifier = f.packet.contract.taskRoles.executor; f.packet.roleAuthorities.verifier = { ...f.packet.roleAuthorities.executor, authorityScope: ["task_verification"] }; },
  selfRelease: f => { f.packet.contract.taskRoles.releaser = f.packet.contract.taskRoles.executor; f.packet.roleAuthorities.releaser = { ...f.packet.roleAuthorities.executor, authorityScope: ["release_authorization"] }; },
  priorAuthor: f => f.packet.roleAuthorities.provenance.authors.push(f.packet.roleAuthorities.verifier.principal),
  requesterAlias: f => { const a = f.packet.roleAuthorities; a.verifier.type = "human"; a.verifier.principal = { kind: "user", id: a.requester.userId }; a.verifier.membership = a.requester; },
  inactive: f => f.packet.roleAuthorities.verifier.status = "inactive",
  foreign: f => f.packet.roleAuthorities.verifier.workspaceId = f.claimed.id,
  unknownHuman: f => { f.packet.roleAuthorities.verifier.type = "human"; f.packet.roleAuthorities.verifier.principal = null; },
  missingMembership: f => f.packet.roleAuthorities.requester = null,
  viewerRequester: f => f.packet.roleAuthorities.requester.role = "viewer",
  authorRemoved: f => f.packet.roleAuthorities.authorMembership = null,
  stale: f => f.packet.roleAuthorities.verifier.revision = "changed",
  noCompetence: f => f.packet.roleAuthorities.verifier.competencies = [],
  noMandate: f => f.packet.roleAuthorities.releaser.authorityScope = [],
  noRole: f => f.packet.roleAuthorities.verifier.role = null,
  wrongExecutor: f => f.packet.contract.taskRoles.executor.id = f.claimed.id,
  wrongManager: f => f.packet.contract.taskRoles.accountableManager.id = f.claimed.id,
  forgedRequester: f => f.packet.contract.taskRoles.requester.id = f.claimed.id,
  noProvenance: f => f.packet.roleAuthorities.provenance = null
})) test(`role admission rejects ${name}`, () => { const f = validPacketFixture(); change(f); assert.throws(() => validate(f), e => e.message === "execution_packet_invalid" && e.details.issues.some(i => i.field.startsWith("contract.taskRoles"))); });

test("information verifier qualification is task and checklist scoped and does not grant global skill", () => {
  const f = validPacketFixture(), c = f.packet.contract, a = f.packet.roleAuthorities;
  c.executionClass = "roost-company-information-runtime-v1";
  c.procedures.items = [{ id: "00000000-0000-4000-8000-000000000333", revision: "1" }];
  a.verifier.competencies = ["application audit"];
  assert.ok(taskRoleIssues(c, f.packet, f.claimed).some(issue => issue.reason === "competencies_required"));
  a.verifierQualification = { id: "00000000-0000-4000-8000-000000000334", taskId: f.claimed.taskId,
    executorId: c.taskRoles.executor.id, executorRevision: c.taskRoles.executor.revision,
    verifierId: c.taskRoles.verifier.id, verifierRevision: c.taskRoles.verifier.revision,
    competency: "application audit", checklistDecisionId: "00000000-0000-4000-8000-000000000335",
    procedureId: c.procedures.items[0].id, procedureVersion: 1,
    contractSnapshot: structuredClone(c),
    validUntil: new Date(Date.now() + 3600000).toISOString() };
  assert.deepEqual(taskRoleIssues(c, f.packet, f.claimed), []);
  c.procedures.items.push({ id: "00000000-0000-4000-8000-000000000337", revision: "1" });
  assert.ok(taskRoleIssues(c, f.packet, f.claimed).some(issue => issue.reason === "competencies_required"));
  c.procedures.items.pop();
  c.context.company.push({ id: "00000000-0000-4000-8000-000000000338", revision: "1" });
  assert.ok(taskRoleIssues(c, f.packet, f.claimed).some(issue => issue.reason === "competencies_required"));
  c.context.company.pop();
  for (const change of [
    q => { q.taskId = "00000000-0000-4000-8000-000000000336"; },
    q => { q.verifierRevision = "stale"; },
    q => { q.procedureVersion = 2; },
    q => { q.validUntil = new Date(Date.now() - 1000).toISOString(); }
  ]) {
    const old = structuredClone(a.verifierQualification);
    change(a.verifierQualification);
    assert.ok(taskRoleIssues(c, f.packet, f.claimed).some(issue => issue.reason === "competencies_required"));
    a.verifierQualification = old;
  }
  assert.deepEqual(a.verifier.competencies, ["application audit"]);
});
