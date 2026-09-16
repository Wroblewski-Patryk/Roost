import { createHash } from "node:crypto";
import { z } from "zod";
import { durationStopMarginMs } from "./agent-host-execution-duration.mjs";
import { isWindowsJobReceipt } from "./agent-host-windows-job.mjs";
import { isHermesStartupReceipt, hermesStartupProcessMatches } from "./agent-host-hermes-startup.mjs";

export const hermesBudgetPolicy = "coding-small-v1";
export const hermesBudgetBlocker = "hermes_attempt_budget_policy_unproven";
const seals = new WeakMap(), receipts = new WeakMap();
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const fail = reason => { throw Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Hermes attempt budget policy blocked this attempt.", details: { reason } }); };

// This is an explicit owner waiver of hard token/cost accounting, not a meter.
// Direct Codex keeps its separate fail-closed output-budget contract.
export function createHermesOutputIntent({ maxOutputTokens }) {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) fail("hermes_output_intent_invalid");
  return Object.freeze({ assertWithinBudget() {}, failure: undefined, observed: null });
}

export function sealHermesBudget({ envelope, claimed, inputBytes, cleanupMarginMs = durationStopMarginMs }) {
  const seconds = envelope.contract.budgets.maxDurationSeconds, started = Date.parse(claimed.startedAt), at = Date.now();
  if (claimed.id !== envelope.identity.executionId || claimed.taskId !== envelope.identity.taskId
      || claimed.attempt !== 1 || envelope.identity.attempt !== 1 || envelope.contract.budgets.maxAttempts !== 1
      || claimed.codexThreadId || (claimed.checkpoint && claimed.checkpoint.stage !== "claimed")
      || !Number.isInteger(seconds) || seconds < 60 || seconds > 900
      || !Number.isFinite(started) || started > at || cleanupMarginMs !== durationStopMarginMs || cleanupMarginMs < 5000
      || !Number.isInteger(inputBytes) || inputBytes < 1 || inputBytes > 131072
      || envelope.contract.modelSelection.reasoningEffort === "ultra") fail("hermes_attempt_budget_invalid");
  const deadline = started + seconds * 1000, stopAt = deadline - cleanupMarginMs;
  const runBudgetSeconds = Math.floor((stopAt - at) / 1000);
  if (runBudgetSeconds < 1) fail("hermes_attempt_budget_expired");
  const seal = Object.freeze({});
  seals.set(seal, { envelope, startedAt: claimed.startedAt, deadline, stopAt, at, monotonic: performance.now(), used: false,
    runBudgetSeconds, inputBytes });
  return seal;
}
export function assertHermesBudget(seal, envelope, claimed) {
  const proof = seals.get(seal);
  if (!proof || proof.envelope !== envelope || (claimed && (claimed.startedAt !== proof.startedAt
      || claimed.id !== envelope.identity.executionId || claimed.taskId !== envelope.identity.taskId
      || claimed.attempt !== 1 || claimed.codexThreadId))) fail("hermes_attempt_budget_changed");
  const elapsed = proof.elapsed = Math.max(proof.elapsed ?? 0, Date.now() - proof.at, performance.now() - proof.monotonic);
  const remainingMs = proof.stopAt - proof.at - elapsed;
  if (remainingMs < 1) fail("hermes_attempt_budget_expired");
  return { runBudgetSeconds: proof.runBudgetSeconds, remainingMs, acceptedDeadline: new Date(proof.deadline).toISOString(),
    cleanupMarginMs: durationStopMarginMs, inputBytes: proof.inputBytes };
}
export function hermesBudgetArgs(seal, envelope) {
  return ["--max-turns", "24", "--run-budget", String(assertHermesBudget(seal, envelope).runBudgetSeconds)];
}
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const hermesBudgetReceiptSchema = z.object({
  schemaVersion: z.literal("roost-hermes-attempt-budget-v1"), policy: z.literal(hermesBudgetPolicy),
  attemptId: z.string().uuid(), taskId: z.string().uuid(), attempt: z.literal(1),
  readyRevision: digest, inputSeal: digest, startupReceiptDigest: digest, configDigest: digest,
  maxTurns: z.literal(24), apiMaxRetries: z.literal(2), maxAttempts: z.literal(1), wholeTaskRetries: z.literal(0),
  acceptedDeadline: z.string().datetime(), cleanupMarginMs: z.literal(5000),
  runBudgetSeconds: z.number().int().min(1).max(895), runBudgetEnforcement: z.literal("advisory_worker_deadline_authoritative"),
  inputBytes: z.number().int().min(1).max(131072), inputByteCap: z.literal(131072), inputByteCapScope: z.literal("initial_sealed_input_only"),
  maxOutputTokensIntent: z.number().int().positive(), outputTokenEnforcement: z.literal("unavailable"), costEnforcement: z.literal("unavailable"),
  model: z.string(), reasoning: z.string(), toolsets: z.array(z.enum(["file", "terminal"])).min(1).max(2),
  physicalModelCalls: z.null(), toolCalls: z.null(), transportRetries: z.null(), inputTokens: z.null(), outputTokens: z.null(), totalTokens: z.null(), cost: z.null(),
  resume: z.literal(false), checkpoints: z.literal(false), worktree: z.literal(false), automaticRestart: z.literal(false),
  reviewRequired: z.literal(true), digest
}).strict();
export function createHermesBudgetReceipt(seal, envelope, startup) {
  if (!isHermesStartupReceipt(startup, envelope, seal)) fail("hermes_budget_startup_unproven");
  const budget = assertHermesBudget(seal, envelope);
  const body = { schemaVersion: "roost-hermes-attempt-budget-v1", policy: hermesBudgetPolicy,
    attemptId: envelope.identity.executionId, taskId: envelope.identity.taskId, attempt: 1,
    readyRevision: envelope.revisions.ready, inputSeal: envelope.seal, startupReceiptDigest: startup.digest, configDigest: startup.configDigest,
    maxTurns: 24, apiMaxRetries: 2, maxAttempts: 1, wholeTaskRetries: 0,
    acceptedDeadline: budget.acceptedDeadline, cleanupMarginMs: budget.cleanupMarginMs, runBudgetSeconds: budget.runBudgetSeconds,
    runBudgetEnforcement: "advisory_worker_deadline_authoritative", inputBytes: budget.inputBytes,
    inputByteCap: 131072, inputByteCapScope: "initial_sealed_input_only", maxOutputTokensIntent: envelope.contract.budgets.maxOutputTokens,
    outputTokenEnforcement: "unavailable", costEnforcement: "unavailable", model: startup.modelSelection.model,
    reasoning: startup.modelSelection.reasoningEffort, toolsets: startup.toolsets,
    physicalModelCalls: null, toolCalls: null, transportRetries: null, inputTokens: null, outputTokens: null, totalTokens: null, cost: null,
    resume: false, checkpoints: false, worktree: false, automaticRestart: false, reviewRequired: true };
  const receipt = freeze(hermesBudgetReceiptSchema.parse({ ...body, digest: hash(body) }));
  receipts.set(receipt, { seal, envelope, startup });
  return receipt;
}
export function assertHermesBudgetReceipt(receipt) {
  const proof = receipts.get(receipt);
  if (!proof || !isHermesStartupReceipt(proof.startup, proof.envelope, proof.seal)) fail("hermes_attempt_budget_unproven");
  return assertHermesBudget(proof.seal, proof.envelope);
}
export function hermesBudgetReceiptMatches(receipt, envelope, startup) {
  const proof = receipts.get(receipt);
  return Boolean(proof && proof.envelope === envelope && (!startup || proof.startup === startup));
}
export function hermesBudgetRequiresNativeBoundary(receipt) {
  return receipts.get(receipt)?.startup.profileVersion === "roost-hermes-profile-v4";
}
export function hermesBudgetBlockers(blockers, receipt) {
  try { assertHermesBudgetReceipt(receipt); return blockers.filter(code => code !== hermesBudgetBlocker); }
  catch { return [...blockers]; }
}
export function assertHermesBudgetProcess(receipt, processOptions) {
  assertHermesBudgetReceipt(receipt);
  const proof = receipts.get(receipt);
  if (!hermesStartupProcessMatches(proof.startup, proof.envelope, processOptions)) fail("hermes_attempt_process_changed");
}
export function consumeHermesBudgetReceipt(receipt, { attempt, input, ...processOptions }) {
  assertHermesBudgetProcess(receipt, processOptions);
  const proof = receipts.get(receipt), saved = seals.get(proof.seal);
  // A second receipt for the same seal cannot restart the task either.
  if (saved.used || attempt !== receipt.attemptId || input !== JSON.stringify(proof.envelope)
      || Buffer.byteLength(input) !== receipt.inputBytes) fail("hermes_attempt_budget_reuse_or_input_changed");
  saved.used = true;
  return () => assertHermesBudget(proof.seal, proof.envelope).remainingMs;
}
export function classifyHermesOutcome({ error, ownedTreeReceipt, exitCode }) {
  if (error?.boundaryViolation) return "boundary_violation";
  if (error?.leaseLost) return "policy_blocked";
  const job = isWindowsJobReceipt(ownedTreeReceipt) ? ownedTreeReceipt : null;
  if (error?.durationLimit || ["hermes_quiet_timeout", "hermes_attempt_budget_expired"].includes(error?.message) || job?.terminationReason === "timeout") return "timed_out";
  if (error?.contextStop || /hermes_quiet_(cancelled|interrupted|controller_shutdown)$/.test(error?.message ?? "")
      || ["cancel", "controller_shutdown", "controller_closed", "context_stop"].includes(job?.terminationReason)) return "cancelled";
  if (error?.protocolAdmission || !job || ["lease_lost", "preparation_failed"].includes(job.terminationReason)) return "policy_blocked";
  return job.terminationReason === "root_exit" && exitCode === 0 && job.rootExit === 0 && !error ? "candidate_result" : "process_failed";
}

export function completeHermesBudgetReceipt(receipt, { error, ownedTreeReceipt, wallTimeMs, exitCode }) {
  // Completion may occur after expiry: never re-admit or renew authority here.
  const proof = receipts.get(receipt);
  if (!proof || !seals.get(proof.seal)?.used) fail("hermes_attempt_budget_unproven");
  const job = isWindowsJobReceipt(ownedTreeReceipt) && ownedTreeReceipt.attempt === receipt.attemptId ? ownedTreeReceipt : null;
  const { digest: policyReceiptDigest, ...policy } = receipt;
  const body = { ...policy, policyReceiptDigest, outcome: classifyHermesOutcome({ error, ownedTreeReceipt: job, exitCode }),
    ownedTreeReceipt: job, wallTimeMs: Number.isFinite(wallTimeMs) && wallTimeMs >= 0 ? Math.ceil(wallTimeMs) : null,
    exitCode: Number.isInteger(exitCode) ? exitCode : null };
  return freeze({ ...body, digest: hash(body) });
}
