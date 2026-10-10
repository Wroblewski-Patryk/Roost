import assert from "node:assert/strict";
import test from "node:test";
import { canPrepareForWorker, catalogFor, companyInformationClass, companyInformationRuntimeClass, contractInput, draftFrom, runtimeInformationInput, selectReferences, validationSections, visibleContextGroups, type ReadyEditor, type ReadyPacket } from "./task-readiness-model";

test("selecting another source preserves old revisions until explicit review", () => {
  const old = [{ id: "a", revision: "old", evidence: "Reviewed evidence" }];
  const catalog = [{ id: "a", revision: "new", label: "Source A" }, { id: "b", revision: "current", label: "Source B" }];
  assert.deepEqual(selectReferences(old, catalog, ["a", "b"]), [...old, { id: "b", revision: "current" }]);
  assert.deepEqual(selectReferences(old, catalog, ["a"], true), [{ id: "a", revision: "new", evidence: "Reviewed evidence" }]);
});
test("diagnostics permit only translated sections, never unknown fields or values", () => {
  assert.deepEqual(validationSections({ issues: [{ field: "contract.context.technical", reason: "SYNTHETIC_SECRET" }, { field: "SYNTHETIC_SECRET", reason: "invalid" }] }), ["technical", "general"]);
});

function editorFixture(): ReadyEditor {
  return {
    submissionVersion: "accepted-revision", taskIdentity: { contractId: "task-contract", branch: "codex/task-synthetic" },
    components: [], managers: [], roleCatalog: [], requester: null, excludedRolePrincipals: [], roleOrigin: { established: false, submissionId: null }, roleCatalogTruncated: false,
    task: { id: "task", title: "Task", status: "todo", project: { id: "project", name: "Project" }, goal: { id: "goal", title: "Goal" } },
    agent: { id: "agent", name: "Agent", role: "analyst", eligible: true, competencies: ["analysis"], tools: ["repository_read"], permissions: ["repository_read"] },
    applications: [{ id: "app", name: "Application" }], applicationId: "app", projects: [], goals: [], agents: [], activeExecution: false, catalogTruncated: false,
    sources: [{ id: "company", revision: "company-r1", label: "Company source", applicationId: null }, { id: "app-source", revision: "app-r1", label: "App source", applicationId: "app" }], procedures: [], dependencies: [], decisions: [], models: [], accepted: null, acceptance: null
  };
}

test("informational contract cannot inherit application, Git or write authority from a previous draft", () => {
  const editor = { ...editorFixture(), executionClass: companyInformationClass, applicationId: null };
  const draft = draftFrom(editor);
  draft.singleTask.component = { id: "old-component", revision: "old" };
  draft.singleTask.problems = [{ statement: "Summarize the current plan", causalLink: "" }];
  draft.values.baseBranch = "main";
  draft.tools = ["repository_read", "repository_write", "push", "deployment"];
  draft.permissions = [...draft.tools];
  draft.rollbackMode = "restore_task_changes";
  draft.refs.company = [{ id: "company", revision: "company-r1" }];
  draft.refs.product = [{ id: "app-source", revision: "app-r1" }];
  draft.refs.technical = [...draft.refs.product];
  const input = contractInput(editor, draft);
  assert.equal(input.applicationId, null);
  assert.equal(input.baseBranch, null);
  assert.equal(input.contract.executionClass, companyInformationClass);
  assert.equal(input.contract.singleTask.applicationId, null);
  assert.equal(input.contract.singleTask.component, null);
  assert.equal(input.contract.singleTask.branch, null);
  assert.equal(input.contract.singleTask.problems[0]?.componentId, null);
  assert.deepEqual(input.contract.context, { company: [{ id: "company", revision: "company-r1" }], product: [], technical: [] });
  assert.deepEqual(input.contract.access, { tools: [], permissions: [], sandbox: "read-only", externalWrites: false, restrictions: [] });
  assert.equal(input.contract.recovery.rollback.mode, "not_applicable");
  assert.equal(input.contract.singleTask.commonCause, null);
});

test("company picker shows explicit company sources and keeps required company context visible", () => {
  const editor = { ...editorFixture(), executionClass: companyInformationClass, applicationId: null };
  assert.deepEqual(catalogFor(editor, "company").map(source => source.id), ["company"]);
  assert.deepEqual(visibleContextGroups(editor), ["company", "procedures", "skills", "dependencies", "decisions"]);
  assert.deepEqual(draftFrom(editor).refs.company, []);
});

test("runtime risk input and Ready submission use the same bounded company contract", () => {
  const preparation = { ...editorFixture(), executionClass: companyInformationClass, applicationId: null };
  const draft = draftFrom(preparation);
  draft.model = "gpt-5.6-sol";
  draft.effort = "low";
  draft.values.maxAttempts = "1";
  draft.values.maxDurationSeconds = "600";
  draft.values.maxOutputTokens = "1200";
  draft.refs.company = [{ id: "company", revision: "company-r1" }];
  const runtime = { ...preparation, executionClass: companyInformationRuntimeClass };
  const submitted = contractInput(runtime, draft);
  assert.deepEqual(submitted, runtimeInformationInput(contractInput(preparation, draft)));
  assert.deepEqual(runtimeInformationInput(submitted), submitted);
  assert.equal(submitted.contract.executionClass, companyInformationRuntimeClass);
  assert.deepEqual(submitted.contract.access.tools, []);
  assert.deepEqual(submitted.contract.access.permissions, []);
  assert.equal(submitted.contract.modelSelection.modelSelection.model, "gpt-5.6-sol");
  assert.equal(submitted.contract.budgets.maxAttempts, 1);
  const reopened = draftFrom({ ...runtime, accepted: { contract: submitted.contract, prompt: submitted.prompt, baseBranch: null, applicationId: null } });
  assert.equal(reopened.model, "gpt-5.6-sol");
  assert.equal(reopened.effort, "low");
});

test("existing application input keeps its discriminator-free shape and application authority", () => {
  const editor = editorFixture(), draft = draftFrom(editor);
  draft.tools = ["repository_read"];
  draft.permissions = ["repository_read"];
  draft.values.baseBranch = "main";
  draft.rollbackMode = "restore_task_changes";
  const input = contractInput(editor, draft);
  assert.equal(Object.hasOwn(input.contract, "executionClass"), false);
  assert.equal(input.applicationId, "app");
  assert.equal(input.baseBranch, "main");
  assert.equal(input.contract.singleTask.branch, "codex/task-synthetic");
  assert.equal(input.contract.access.sandbox, "workspace-write");
  assert.deepEqual(input.contract.access.tools, ["repository_read"]);
  assert.equal(input.contract.recovery.rollback.mode, "restore_task_changes");
  assert.equal(visibleContextGroups(editor).length, 7);
});

test("company preparation has its own explicit admission and never inherits model execution enablement", () => {
  const packet: ReadyPacket = { status: "ready", canSubmit: true, executionEnabled: true, editor: { ...editorFixture(), executionClass: companyInformationClass, applicationId: null } };
  assert.equal(canPrepareForWorker(packet), false);
  assert.equal(canPrepareForWorker({ ...packet, preparationEnabled: false }), false);
  assert.equal(canPrepareForWorker({ ...packet, executionEnabled: false, preparationEnabled: true }), true);
  assert.equal(canPrepareForWorker({ ...packet, editor: editorFixture(), preparationEnabled: false }), true);
});
