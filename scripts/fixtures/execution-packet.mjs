import readyContext from "../lib/agent-host-ready-context.cjs";
import { createHash } from "node:crypto";
import { singleTaskIdentity } from "../lib/agent-host-single-task.mjs";

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
    startedAt: new Date().toISOString(),
    task: { title: "Repair a synthetic fixture" }, application: { id: applicationId, workspaceId, slug: "demoapp", name: "DemoApp", repositories: [{ url: "https://github.com/example-org/DemoApp.git", isPrimary: true }] } };
  const sources = ["company", "product", "technical"].map((category, index) => ({ id: uuid(10 + index), workspaceId,
    applicationId: category === "company" ? null : applicationId, recordType: "requirement", title: category,
    description: `Synthetic ${category} context`, businessPurpose: null, desiredState: null, expectedBehavior: null, revision }));
  const contract = {
    version: "1", objective: { outcome: "Repair the synthetic fixture", goalId },
    singleTask: { schemaVersion: "roost-single-task-v1", ...singleTaskIdentity(taskId), applicationId,
      component: { id: uuid(20), revision }, accountableManager: { id: uuid(21), revision },
      measurement: { metric: "Failing fixture cases", comparison: "eq", target: 0, unit: "cases", method: "Run the fixture acceptance test" },
      problems: [{ statement: "The fixture rejects valid input", componentId: uuid(20), outcome: "Repair the synthetic fixture", causalLink: null }], commonCause: null },
    scope: { allowed: ["Repair the fixture"], forbidden: ["Change sibling repositories"] },
    assignment: { agentId, role: "engineer", competencies: ["javascript"] },
    modelSelection: { model: "gpt-5.6-sol", reasoningEffort: "medium" },
    context: Object.fromEntries(["company", "product", "technical"].map((category, index) => [category, [{ id: sources[index].id, revision }]])),
    procedures: { items: [], noneReason: "No applicable procedure for this fixture" },
    skills: { items: [], noneReason: "No additional skill required" },
    access: { tools: ["repository_read", "repository_write", "local_test"], permissions: ["repository_read", "repository_write", "local_test"], sandbox: "workspace-write", externalWrites: false, restrictions: ["No commits, pushes or deployments"] },
    dependencies: { items: [], noneReason: "No linked dependencies" }, decisions: { items: [], noneReason: "No linked decisions" },
    budgets: { maxAttempts: 1, maxDurationSeconds: 600, maxOutputTokens: 4000 },
    acceptance: { criteria: ["Fixture passes"], tests: ["node --test fixture.test.mjs"], evidence: ["Test result and changed paths"] },
    recovery: { handoff: "Leave changes for owner review", failure: "Report failed checks", escalation: "Ask owner when intent is ambiguous", rollback: { mode: "restore_task_changes", instructions: "Restore only this execution's changes; preserve unrelated work" } }
  };
  const packet = sealPacket({ schemaVersion: "roost-execution-packet-v1", identity: { executionId: claimed.id, workspaceId, taskId, applicationId, agentId }, taskRevision: revision, contract, sources,
    scopeAuthorities: { component: { id: uuid(20), applicationId, status: "active", revision }, manager: { id: uuid(21), workspaceId, status: "active", revision } } });
  const taskContext = { schemaVersion: "task-agent-execution-context-v1", executionPacket: packet,
    task: { id: taskId, workspaceId, projectId, goalId, goal: { id: goalId, workspaceId }, assignedWorkforceEntityId: agentId, status: "in_progress", updatedAt: revision,
      assignedWorkforceEntity: { id: agentId, workspaceId, type: "agent", status: "active", role: "engineer", skillIndex: ["javascript"], toolIndex: contract.access.tools, authorityScope: contract.access.permissions } },
    procedures: [], dependencies: [], decisions: [] };
  const applicationContext = { schemaVersion: "application-agent-context-v2", application: claimed.application, operatingModel: { projects: [{ projectId }], applicationProcedures: [], capabilityProcedures: [] } };
  const fixture = { packet, claimed, taskContext, applicationContext };
  pinReadyFixture(fixture);
  return fixture;
}

export function pinReadyFixture(f) {
  const revision = readyContext.readyContextRevision(f.taskContext, f.applicationContext, f.claimed);
  const pinId = "00000000-0000-4000-8000-000000000090";
  f.claimed.metadata = { ...f.claimed.metadata, readyContextPin: { pinId, revision } };
  f.taskContext.readyAdmission = { status: "ready", pinId, revision, validationRevision: revision };
  return f;
}
