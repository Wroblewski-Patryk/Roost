import { z } from "zod";
import { execFile } from "node:child_process";

const text = z.string().trim().min(1).max(2000), id = z.string().uuid();
const ref = z.object({ id, revision: text }).strict();
export const singleTaskIdentity = taskId => ({ contractId: `roost-task:${taskId}`, branch: `codex/task-${taskId}` });
export function branchAdmissionError() {
  return Object.assign(new Error("agent_task_branch_mismatch"), { contextAdmission: true, retryable: false,
    publicMessage: "The checkout is not on the accepted task branch. Reconcile the checkout and explicitly prepare the required branch before another attempt." });
}
export const readCurrentTaskBranch = directory => new Promise((resolve, reject) => {
  execFile("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], { cwd: directory, windowsHide: true, timeout: 5000, maxBuffer: 4096 },
    (error, output) => error ? reject(branchAdmissionError()) : resolve(output.trim()));
});
export function assertTaskBranch(actual, expected) { if (actual !== expected) throw branchAdmissionError(); }
export const readCurrentTaskCommit = directory => new Promise((resolve,reject) => {
  execFile("git",["rev-parse","HEAD"],{cwd:directory,windowsHide:true,timeout:5000,maxBuffer:4096},
    (error,output)=>error?reject(branchAdmissionError()):resolve(output.trim()));
});
export const readCommittedTaskPaths = (directory, base, head) => {
  if (!/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(head)) return Promise.reject(branchAdmissionError());
  if (base === head) return Promise.resolve([]);
  return new Promise((resolve,reject)=>execFile("git",["diff","--name-only","-z",base,head,"--"],{cwd:directory,windowsHide:true,timeout:5000,maxBuffer:262144},
    (error,output)=>error?reject(branchAdmissionError()):resolve(output.split("\0").filter(Boolean))));
};
export const singleTaskSchema = z.object({
  schemaVersion: z.literal("roost-single-task-v1"), contractId: text, applicationId: id,
  component: ref, accountableManager: ref, branch: text,
  measurement: z.object({ metric: text, comparison: z.enum(["eq", "lte", "gte"]), target: z.number().finite(), unit: text, method: text }).strict(),
  problems: z.array(z.object({ statement: text, componentId: id, outcome: text, causalLink: text.nullable() }).strict()).min(1).max(3),
  commonCause: z.object({ mechanism: text, inseparability: text, evidence: ref }).strict().nullable()
}).strict();

// Deterministic ambiguity signals, not a general natural-language truth oracle.
// Structured cardinality and shared references remain the authoritative checks.
export function compoundIntent(value) {
  return typeof value !== "string" || value.length > 400 || /[\r\n;]|(?:^|\s)(?:[-*•]|\d+[.)])\s/u.test(value) ||
    /\b(?:unrelated|independent|separate)\s+(?:issues|problems|outcomes|features)\b|\bniezależn\w*\s+(?:problem\w*|wynik\w*|funkcj\w*)/iu.test(value) ||
    /\b(?:and|plus|also|oraz|i|dodatkowo)\s+(?:fix|repair|add|build|implement|improve|remove|update|napraw\w*|dodaj\w*|zbuduj\w*|wdroż\w*|popraw\w*|usuń\w*|zaktualizuj\w*)\b/iu.test(value);
}

export function singleTaskIssues(contract, packet, claimed) {
  const s = contract.singleTask, issues = [], add = (field, reason) => issues.push({ field: `contract.singleTask.${field}`, reason });
  const identity = singleTaskIdentity(claimed.taskId);
  if (s.contractId !== identity.contractId) add("contractId", "mismatch");
  if (s.branch !== identity.branch) add("branch", "mismatch");
  if (s.applicationId !== claimed.applicationId) add("applicationId", "mismatch");
  const { component, manager } = packet.scopeAuthorities;
  if (!component || component.id !== s.component.id || component.applicationId !== claimed.applicationId || component.status !== "active") add("component", "unavailable");
  else if (component.revision !== s.component.revision) add("component", "stale");
  if (!manager || manager.id !== s.accountableManager.id || manager.workspaceId !== claimed.workspaceId || manager.status !== "active") add("accountableManager", "unavailable");
  else if (manager.revision !== s.accountableManager.revision) add("accountableManager", "stale");
  if (compoundIntent(contract.objective.outcome) || s.problems.some(p => compoundIntent(p.statement))) add("problems", "split_required");
  if (s.problems.some(p => p.outcome !== contract.objective.outcome || p.componentId !== s.component.id)) add("problems", "split_required");
  if (new Set(s.problems.map(p => p.statement.trim().toLowerCase())).size !== s.problems.length) add("problems", "duplicate");
  if (s.problems.length === 1) {
    if (s.commonCause !== null || s.problems[0].causalLink !== null) add("commonCause", "not_applicable");
  } else {
    if (!s.commonCause || s.problems.some(p => !p.causalLink || p.causalLink.length < 20)) add("commonCause", "shared_cause_required");
    if (s.commonCause) {
      if (s.commonCause.mechanism.length < 20 || s.commonCause.inseparability.length < 20 || compoundIntent(s.commonCause.mechanism)) add("commonCause", "split_required");
      if (!contract.context.technical.some(ref => ref.id === s.commonCause.evidence.id && ref.revision === s.commonCause.evidence.revision)) add("commonCause.evidence", "unavailable");
    }
  }
  return issues;
}
