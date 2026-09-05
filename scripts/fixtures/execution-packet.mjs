import { createHash } from "node:crypto";

export function sealPacket(packet) {
  const { revision, ...body } = packet;
  packet.revision = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return packet;
}

export function validPacketFixture() {
  const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const revision = "2026-09-05T00:00:00.000Z";
  const workspaceId = uuid(1), taskId = uuid(2), applicationId = uuid(3), agentId = uuid(4), goalId = uuid(5), projectId = uuid(6);
  const claimed = { id: uuid(7), workspaceId, taskId, applicationId, attempt: 1, leaseToken: uuid(8),
    task: { title: "Repair a synthetic fixture" }, application: { id: applicationId, workspaceId, slug: "roost", name: "Roost", repositories: [{ url: "https://github.com/Wroblewski-Patryk/Roost.git", isPrimary: true }] } };
  const sources = ["company", "product", "technical"].map((category, index) => ({ id: uuid(10 + index), workspaceId,
    applicationId: category === "company" ? null : applicationId, recordType: "requirement", title: category,
    description: `Synthetic ${category} context`, businessPurpose: null, desiredState: null, expectedBehavior: null, revision }));
  const contract = {
    version: "1", objective: { outcome: "Repair the synthetic fixture", goalId },
    scope: { allowed: ["Repair the fixture"], forbidden: ["Change sibling repositories"] },
    assignment: { agentId, role: "engineer", competencies: ["javascript"] },
    context: Object.fromEntries(["company", "product", "technical"].map((category, index) => [category, [{ id: sources[index].id, revision }]])),
    procedures: { items: [], noneReason: "No applicable procedure for this fixture" },
    skills: { items: [], noneReason: "No additional skill required" },
    access: { tools: ["repository_read", "repository_write", "local_test"], permissions: ["repository_read", "repository_write", "local_test"], sandbox: "workspace-write", externalWrites: false, restrictions: ["No commits, pushes or deployments"] },
    dependencies: { items: [], noneReason: "No linked dependencies" }, decisions: { items: [], noneReason: "No linked decisions" },
    budgets: { maxAttempts: 1, maxDurationSeconds: 600, maxOutputTokens: 4000 },
    acceptance: { criteria: ["Fixture passes"], tests: ["node --test fixture.test.mjs"], evidence: ["Test result and changed paths"] },
    recovery: { handoff: "Leave changes for owner review", failure: "Report failed checks", escalation: "Ask owner when intent is ambiguous", rollback: { mode: "restore_task_changes", instructions: "Restore only this execution's changes; preserve unrelated work" } }
  };
  const packet = sealPacket({ schemaVersion: "roost-execution-packet-v1", identity: { executionId: claimed.id, workspaceId, taskId, applicationId, agentId }, taskRevision: revision, contract, sources });
  const taskContext = { schemaVersion: "task-agent-execution-context-v1", executionPacket: packet,
    task: { id: taskId, workspaceId, projectId, goalId, goal: { id: goalId, workspaceId }, assignedWorkforceEntityId: agentId, status: "in_progress", updatedAt: revision,
      assignedWorkforceEntity: { id: agentId, workspaceId, type: "agent", status: "active", role: "engineer", skillIndex: ["javascript"], toolIndex: contract.access.tools, authorityScope: contract.access.permissions } },
    procedures: [], dependencies: [], decisions: [] };
  const applicationContext = { schemaVersion: "application-agent-context-v2", application: claimed.application, operatingModel: { projects: [{ projectId }], applicationProcedures: [], capabilityProcedures: [] } };
  return { packet, claimed, taskContext, applicationContext };
}
