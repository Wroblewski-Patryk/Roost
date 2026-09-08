import assert from "node:assert/strict";
import test from "node:test";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
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
