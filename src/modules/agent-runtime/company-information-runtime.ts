import { createHash, createPublicKey } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import type { ManagedAdmissionSigner } from "./managed-admission";
import { workerClaimAllowed } from "../../auth/worker-ticket-principal";
import { inspectReady, lockReadyTask, submissionVersion, submitReady } from "./task-execution-readiness";
import { riskLevelAdmission } from "./task-risk-admission";
import { assertBoundExecutionContinuation, assertExecutionContinuation } from "./task-execution-continuation";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { reviewDigest } from "./task-review-contract";

export const companyRuntimeClass = "roost-company-information-runtime-v1";
const load = new Function("p", "return import(p)") as (p: string) => Promise<any>;
const runtime = load(require("node:url").pathToFileURL(require("node:path").resolve(__dirname, "../../../scripts/lib/agent-host-company-information-runtime.mjs")).href);
const pilot = load(require("node:url").pathToFileURL(require("node:path").resolve(__dirname, "../../../scripts/lib/agent-host-trusted-pilot.mjs")).href);
type Db = Prisma.TransactionClient;
const wire = (v: any) => JSON.parse(JSON.stringify(v));
const digest = async (v: any) => createHash("sha256").update((await pilot).trustedPilotBytes(v)).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
const ownerDecisionSummary = z.string().trim().min(3).max(2000)
  .refine(value => !/\b(?:Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value));
const informationOwnerDecisionSchema = z.object({ requestId: id, executionId: id, reviewId: id,
  materialVersion: hash, decision: z.enum(["accept", "return"]), summary: ownerDecisionSummary }).strict();
const localDigest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const localPreflight = z.object({ model: z.literal("gpt-oss:20b"), digest: localDigest,
  sizeBytes: z.number().int().positive(), loadedAtStart: z.boolean(), loadedDigestAtStart: localDigest.nullable() }).strict();
const localObservation = z.object({ schemaVersion: z.literal("roost-ollama-observation-v1"),
  backend: z.literal("ollama_loopback"), model: z.literal("gpt-oss:20b"), digest: localDigest,
  endpoint: z.literal("http://127.0.0.1:11434"), requestedAt: z.string().datetime(), completedAt: z.string().datetime(),
  requestCount: z.literal(1), responseModel: z.literal("gpt-oss:20b"), responseChunks: z.number().int().positive(),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().optional(), completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(), reasoning_tokens: z.number().int().nonnegative().optional() }).strict().nullable(),
  tagDigestVerified: z.literal(true), runningDigestVerified: z.literal(true), preflight: localPreflight }).strict();
export const isInformationRuntime = (c: any) => c?.executionClass === companyRuntimeClass;
// Historical G6 event interpretation remains readable after the route closes.
export function informationReviewTaskStatus(source: string | null, decision: "accept" | "return") {
  return source === "clickup" ? null : decision === "accept" ? "done" : "todo";
}
export async function informationNativeProven(db: Db, execution: any) {
  const contract = (execution?.metadata as any)?.executionContract;
  if (!execution || execution.applicationId !== null || !isInformationRuntime(contract)
    || execution.status !== "completed" || !execution.completedAt || execution.contextInvalidatedAt
    || !Array.isArray(execution.changedFiles) || execution.changedFiles.length !== 0) return false;
  const admitted = await db.agentExecutionEvent.findFirst({ where: { workspaceId: execution.workspaceId, executionId: execution.id, type: "information_admitted" } });
  const native: any = (execution.verification as any)?.informationRuntime, owned: any = (execution.verification as any)?.ownedTreeReceipt;
  const selection = contract.modelSelection, local = selection?.backend === "ollama_loopback";
  const observation = localObservation.safeParse(native?.observer);
  const admittedPayload: any = admitted?.payload;
  const localProof = !local || selection.modelSelection?.reasoningEffort === "low"
    && observation.success && native?.backend === "ollama_loopback"
    && native?.observedModel === selection.modelSelection?.model
    && native?.observedDigest === selection.modelSelection?.modelDigest
    && native?.physicalModelCalls === 1
    && observation.data.model === selection.modelSelection?.model
    && observation.data.digest === selection.modelSelection?.modelDigest
    && observation.data.preflight.digest === selection.modelSelection?.modelDigest
    && admittedPayload?.localPreflight && await digest(observation.data.preflight) === await digest(admittedPayload.localPreflight)
    && Date.parse(observation.data.requestedAt) <= Date.parse(observation.data.completedAt);
  return localProof && !!admitted && native?.schemaVersion === "roost-company-information-runtime-verification-v1"
    && hash.safeParse(native?.admissionDigest).success && hash.safeParse(native?.inputSeal).success
    && native?.admissionDigest === (admitted.payload as any).admissionDigest && native?.inputSeal === (admitted.payload as any).inputSeal
    && ((admitted.payload as any).selectionDigest === undefined ? !local
      : native?.selectionDigest === (admitted.payload as any).selectionDigest
        && native?.selectionDigest === await digest(selection))
    && (!local || admittedPayload.backend === "ollama_loopback"
      && admittedPayload.modelDigest === selection.modelSelection?.modelDigest)
    && native?.executionId === execution.id && native?.ownedJob === true && native?.reviewRequired === true
    && native?.externalWrites === false && Array.isArray(native?.nativeTools) && native.nativeTools.length === 0
    && owned?.version === "roost-windows-job-v2" && owned?.attempt === execution.id
    && owned?.cleanup === true && owned?.jobClosed === true && owned?.activeProcesses === 0 && owned?.rootExit === 0;
}
function managedInformationSelection(contract: any) {
  if (contract.modelSelection?.schemaVersion === "roost-managed-hermes-backend-v1") return contract.modelSelection;
  const selected = contract.modelSelection?.schemaVersion ? contract.modelSelection.modelSelection : contract.modelSelection;
  return { schemaVersion: "roost-managed-hermes-backend-v1" as const, agent: "managed_hermes" as const,
    riskClass: "low" as const, fallback: "none" as const,
    attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: "stop_attempt" as const, restart: "never" as const },
    backend: "codex_responses" as const, provider: "openai-codex" as const,
    modelSelection: selected, auth: "same_owner_subscription" as const };
}

export async function informationApprovalCandidate(db: Db, auth: AuthContext, taskId: string) {
  if (process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED !== "true") return { error: "company_runtime_unqualified" };
  const workspace = await db.workspace.findUnique({ where: { id: auth.workspaceId }, select: { ownerUserId: true } });
  if (!workspace || auth.authType !== "user" || auth.userId !== workspace.ownerUserId || auth.workspaceRole !== "owner") return { error: "forbidden" };
  // A proposal must precede the accepted runtime Decision and qualified Ready.
  // Read the current owner-scoped Low assessment; Ready remains mandatory when
  // the owner actually starts an attempt.
  const scopes = await db.$queryRaw<{ contract: any }[]>`SELECT s.input->'contract' AS contract FROM task_risk_scopes s
    WHERE s.workspace_id=${auth.workspaceId}::uuid AND s.task_id=${taskId}::uuid
    AND s.id=(SELECT id FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1)
    AND s.scope_kind='company_information' AND s.actor_user_id=${auth.userId}::uuid
    AND company_information_risk_contract(s.task_id,s.workspace_id,s.actor_user_id,s.input) IS TRUE
    AND EXISTS(SELECT 1 FROM task_risk_assessments a WHERE a.id=task_risk_current(s.task_id)
      AND a.result->>'level'='low' AND a.actor_user_id=${auth.userId}::uuid)
    LIMIT 1`;
  if (scopes.length !== 1) return { error: "company_risk_assessment_required" };
  const contract = scopes[0].contract;
  if (contract?.executionClass !== companyRuntimeClass) return { error: "company_information_scope_invalid" };
  const key = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId: auth.workspaceId }, select: { installationId: true } });
  if (!key) return { error: "managed_installation_unavailable" };
  const previous = await db.$queryRaw<{ id: string; decision: string }[]>`SELECT d.id,r.body->>'decision' AS decision
    FROM decisions d JOIN decision_acceptances a ON a.decision_id=d.id
    JOIN workspaces w ON w.id=d.workspace_id
    JOIN LATERAL (SELECT body FROM decision_revisions WHERE decision_id=d.id ORDER BY version DESC LIMIT 1) r ON true
    WHERE d.workspace_id=${auth.workspaceId}::uuid AND d.status='accepted' AND decision_state(d.id)='accepted'
    AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL
    AND r.body->'managedRuntimeApproval'->>'taskId'=${taskId}
    AND r.body->'managedRuntimeApproval'->>'installationId'=${key.installationId}
    AND r.body->'managedRuntimeApproval'->>'executionClass'=${companyRuntimeClass}
    AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
    LIMIT 2`;
  if (previous.length > 1) return { error: "runtime_authority_ambiguous" };
  const selection = managedInformationSelection(contract);
  if (!(await runtime).companyInformationRuntimeModelAllowed(selection)) return { error: "company_runtime_model_unqualified" };
  return { approval: { schemaVersion: "roost-managed-runtime-approval-v1" as const, taskId, applicationId: null,
    executionClass: companyRuntimeClass, installationId: key.installationId, selectionDigest: await digest(selection),
    backend: selection.backend, riskClass: "low" as const, mode: "trusted_provider_pilot" as const,
    residualRiskAccepted: true as const, acknowledgement: "windows_account_authority_not_os_isolation" as const },
    backend: selection.backend, model: selection.modelSelection.model,
    modelDigest: selection.backend === "ollama_loopback" ? selection.modelSelection.modelDigest : null,
    reasoningEffort: selection.modelSelection.reasoningEffort,
    maxDurationSeconds: contract.budgets.maxDurationSeconds, maxOutputTokensIntent: contract.budgets.maxOutputTokens,
    previousDecision: previous[0] ?? null };
}

export async function informationApproval(db: Db, workspaceId: string, taskId: string, selection: any) {
  if (!(await runtime).companyInformationRuntimeModelAllowed(selection)) return null;
  const selectionDigest = await digest(selection);
  const rows = await db.$queryRaw<any[]>`SELECT d.id,r.version,d.updated_at AS revision,r.body,
    a.actor_user_id AS owner FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
    JOIN decision_acceptances a ON a.decision_id=d.id JOIN workspaces w ON w.id=d.workspace_id
    JOIN trusted_provider_ticket_keys k ON k.workspace_id=w.id
    WHERE d.workspace_id=${workspaceId}::uuid AND d.status='accepted' AND decision_state(d.id)='accepted'
    AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL
    AND r.body->'scope' @> ${JSON.stringify([{ type: "task", id: taskId }])}::jsonb
    AND r.body->'managedRuntimeApproval'->>'taskId'=${taskId}
    AND r.body->'managedRuntimeApproval'->'applicationId'='null'::jsonb
    AND r.body->'managedRuntimeApproval'->>'executionClass'=${companyRuntimeClass}
    AND r.body->'managedRuntimeApproval'->>'installationId'=k.installation_id::text
    AND r.body->'managedRuntimeApproval'->>'selectionDigest'=${selectionDigest}
    AND r.body->'managedRuntimeApproval'->>'backend'=${selection.backend}
    AND r.body->'managedRuntimeApproval'->>'riskClass'='low'
    AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
    ORDER BY a.created_at DESC LIMIT 2`;
  if (rows.length !== 1) return null;
  const row = rows[0]; return { decisionId: row.id, decisionVersion: row.version, selectionDigest, ownerUserId: row.owner, revision: row.revision.toISOString() };
}

export async function startInformationTask(db: Db, auth: AuthContext, taskId: string, raw: unknown) {
  if (process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED !== "true") return { error: "company_runtime_unqualified" };
  const input = z.object({ requestId: id }).strict().parse(raw);
  const task = await lockReadyTask(db, auth.workspaceId, taskId);
  if (!task) return { error: "task_not_found" };
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: auth.workspaceId } });
  if (auth.authType !== "user" || auth.userId !== workspace.ownerUserId || auth.workspaceRole !== "owner") return { error: "forbidden" };
  const replay = await db.agentExecution.findFirst({ where: { workspaceId: auth.workspaceId, taskId, requestedById: auth.userId,
    metadata: { path: ["informationStartRequestId"], equals: input.requestId } } });
  if (replay) return { execution: replay, replay: true };
  if (await db.agentExecution.count({ where: { workspaceId: auth.workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } })) return { error: "task_agent_execution_active" };
  const ready = await inspectReady(db, auth.workspaceId, taskId);
  if (ready.error) return ready;
  const pin: any = ready.pin, c = structuredClone(pin.contract);
  const continuation = await assertExecutionContinuation(db, auth.workspaceId, taskId, pin);
  if ("error" in continuation) return continuation;
  if (!["roost-company-information-v1", companyRuntimeClass].includes(c.executionClass)) return { error: "company_information_scope_invalid" };
  c.executionClass = companyRuntimeClass; c.budgets.maxAttempts = 1;
  c.modelSelection = managedInformationSelection(c);
  if (!(await runtime).companyInformationRuntimeModelAllowed(c.modelSelection)) return { error: "company_runtime_model_unqualified" };
  const approval = await informationApproval(db, auth.workspaceId, taskId, c.modelSelection);
  if (!approval) return { error: "runtime_authority_required" };
  if (await db.agentExecution.count({ where: { workspaceId: auth.workspaceId, taskId, metadata: { path: ["readyContextPin", "runtimeDecisionId"], equals: approval.decisionId } } })) return { error: "information_budget_spent_new_plan_required" };
  c.decisions = { items: [...c.decisions.items.filter((r: any) => r.id !== approval.decisionId), { id: approval.decisionId, revision: approval.revision }], noneReason: null };
  const submitted = await submitReady(db, auth.workspaceId, taskId, { requestId: input.requestId, expectedVersion: await submissionVersion(db, auth.workspaceId, taskId, null), applicationId: null, contract: c, prompt: pin.prompt, baseBranch: null }, { requestedByType: "user", requestedById: auth.userId });
  if ("error" in submitted && submitted.error) return submitted;
  const checked = await inspectReady(db, auth.workspaceId, taskId);
  if (checked.error) return checked;
  const qualified: any = checked.pin;
  if (continuation.continuationEventId) {
    const confirmed = await assertExecutionContinuation(db, auth.workspaceId, taskId, qualified,
      { pinId: pin.pinId, revision: pin.revision });
    if ("error" in confirmed || confirmed.continuationEventId !== continuation.continuationEventId)
      return { error: "execution_continuation_stale" };
  }
  const execution = await db.agentExecution.create({ data: { workspaceId: auth.workspaceId, taskId, applicationId: null, baseBranch: null,
    requestedByType: "user", requestedById: auth.userId, prompt: qualified.prompt,
    metadata: { informationStartRequestId: input.requestId, executionContract: c, readyContextPin: { pinId: qualified.pinId, revision: qualified.revision, preparationOnly: false, modelExecutionQualified: true,
      runtimeDecisionId: approval.decisionId, runtimeDecisionVersion: approval.decisionVersion,
      continuationEventId: continuation.continuationEventId,
      ...(continuation.continuationEventId ? { continuationSourcePinId: pin.pinId,
        continuationSourceRevision: pin.revision } : {}) } } } });
  await db.agentExecutionEvent.create({ data: { workspaceId: auth.workspaceId, executionId: execution.id, type: "queued", message: "Owner-authorized information task queued; no repository or native tools." } });
  return { execution };
}

export async function informationManagedAdmission(client: PrismaClient, auth: AuthContext, executionId: string, raw: any, signer: ManagedAdmissionSigner) {
  if (process.env.ROOST_COMPANY_INFORMATION_RUNTIME_ENABLED !== "true") throw Error("company_runtime_unqualified");
  const input = z.object({ schemaVersion: z.literal("roost-managed-admission-v1"), phase: z.literal("information"), executionId: id, leaseToken: id,
    observation: z.record(z.unknown()) }).strict().parse(raw);
  const identity = auth.workerTicketIdentity;
  if (!identity || auth.authType !== "api_key" || input.executionId !== executionId) throw Error("managed_admission_denied");
  return client.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${executionId}::uuid FOR UPDATE`;
    const execution = await db.agentExecution.findFirst({ where: { id: executionId, workspaceId: auth.workspaceId, applicationId: null, agentHostId: identity.hostId,
      leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, status: { in: ["claimed", "running"] }, cancelRequestedAt: null, contextInvalidatedAt: null } });
    if (!execution || !isInformationRuntime((execution.metadata as any)?.executionContract) || !await workerClaimAllowed(db, auth, identity.hostId)) throw Error("managed_admission_denied");
    const key = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId: auth.workspaceId } });
    const keyDigest = createHash("sha256").update(createPublicKey(signer.publicKey).export({ format: "der", type: "spki" })).digest("hex");
    if (!key || key.installationId !== identity.installationId || key.publicKeyDigest !== keyDigest) throw Error("managed_admission_denied");
    const ready = await inspectReady(db, auth.workspaceId, execution.taskId, execution, true);
    if (ready.error) throw Error("managed_admission_denied");
    if ("error" in await assertBoundExecutionContinuation(db, execution, ready.pin)) throw Error("managed_admission_denied");
    const approval = await informationApproval(db, auth.workspaceId, execution.taskId, (ready.pin as any).contract.modelSelection);
    if (!approval || approval.decisionId !== (ready.pin as any).runtimeApproval?.decisionId) throw Error("managed_admission_denied");
    if (await db.agentExecutionEvent.count({ where: { executionId, type: "information_admitted" } })) throw Error("information_attempt_already_admitted");
    const sealed = (await runtime).buildCompanyInformationInput({ claimed: wire({ ...execution, installationId: identity.installationId }), taskContext: ready.taskContext });
    const observed = input.observation as any;
    const selection = (ready.pin as any).contract.modelSelection;
    if (!(await runtime).companyInformationRuntimeModelAllowed(selection)) throw Error("managed_admission_denied");
    const local = selection.backend === "ollama_loopback";
    const localPreflight = local ? (await runtime).informationLocalPreflightSchema.safeParse(observed.localPreflight) : null;
    if (local && (!localPreflight?.success || localPreflight.data.model !== selection.modelSelection.model
      || localPreflight.data.digest !== selection.modelSelection.modelDigest)) throw Error("managed_admission_denied");
    const now = new Date(), deadline = new Date(execution.startedAt!.getTime() + (ready.pin as any).contract.budgets.maxDurationSeconds * 1000);
    const expiresAt = new Date(Math.min(now.getTime() + 45000, execution.leaseExpiresAt!.getTime(), deadline.getTime() - 5000));
    const payload = (await runtime).informationAdmissionSchema.parse({ schemaVersion: "roost-company-information-admission-v1", domain: "roost-company-information-admission-v1",
      executionId, taskId: execution.taskId, workspaceId: auth.workspaceId, installationId: identity.installationId, hostId: identity.hostId, applicationId: null, attempt: 1,
      readyRevision: sealed.readyRevision, packetRevision: sealed.packetRevision, inputSeal: sealed.inputSeal, selectionDigest: sealed.selectionDigest,
      profileDigest: hash.parse(observed.profileDigest), runtimeDigest: hash.parse(observed.runtimeDigest),
      backend: selection.backend, model: selection.modelSelection.model,
      modelDigest: local ? selection.modelSelection.modelDigest : null,
      localPreflight: local ? localPreflight!.data : null,
      leaseDigest: await digest({ executionId, hostId: identity.hostId, token: input.leaseToken }),
      issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), decisionId: approval.decisionId, decisionVersion: approval.decisionVersion, tools: [], externalWrites: false, deadline: deadline.toISOString() });
    const signed = { payload, signature: signer.sign((await pilot).trustedPilotBytes(payload)).toString("hex") };
    await db.agentExecutionEvent.create({ data: { workspaceId: auth.workspaceId, executionId, type: "information_admitted", message: "Exact owner decision and current information context admitted once.", payload: { admissionDigest: await digest(signed), inputSeal: sealed.inputSeal,
      selectionDigest: sealed.selectionDigest, backend: selection.backend, modelDigest: local ? selection.modelSelection.modelDigest : null,
      localPreflight: local ? localPreflight!.data : null,
      selection } } });
    return signed;
  }, { isolationLevel: "Serializable", timeout: 15000 });
}

export async function informationResult(db: Db, auth: AuthContext, taskId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId: auth.workspaceId } });
  if (!task) return { error: "task_not_found" };
  const execution = await db.agentExecution.findFirst({ where: { taskId, workspaceId: auth.workspaceId, applicationId: null, metadata: { path: ["executionContract", "executionClass"], equals: companyRuntimeClass } }, orderBy: { createdAt: "desc" } });
  if (!execution) return { status: "empty", executionId: null, summary: null, finalResponse: null, reason: null, canReview: false, materialVersion: null, review: null, sources: [], budget: null };
  const contract = (execution.metadata as any).executionContract;
  const sources = await db.companyRecord.findMany({ where: { workspaceId: auth.workspaceId, id: { in: contract.context.company.map((r: any) => r.id) } }, select: { id: true, title: true, updatedAt: true } });
  const materialVersion = await digest({ id: execution.id, finalResponse: execution.finalResponse, summary: execution.summary, metadata: execution.metadata, verification: execution.verification });
  const history = await db.agentExecutionEvent.findFirst({ where: { executionId: execution.id, type: "information_review" }, orderBy: { createdAt: "desc" } });
  const roleReview = await db.taskReviewDecision.findFirst({ where: { workspaceId: auth.workspaceId, taskId, executionId: execution.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { action: true } });
  const ownerDecision = roleReview?.actorAgentId ? await db.informationOwnerDecision.findUnique({ where: { executionId: execution.id } }) : null;
  const workspace = roleReview?.actorAgentId && auth.authType === "user" && auth.userId
    ? await db.workspace.findUnique({ where: { id: auth.workspaceId }, select: { ownerUserId: true } }) : null;
  const timeline = await db.agentExecutionEvent.findMany({ where: { workspaceId: auth.workspaceId, executionId: execution.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101, select: { id: true, type: true, createdAt: true } });
  const nativeProven = await informationNativeProven(db, execution);
  const ownerEligible = Boolean(roleReview?.actorAgentId && roleReview.decision === "approve" && !ownerDecision
    && nativeProven && workspace?.ownerUserId === auth.userId && task.status !== "done"
    && roleReview.materialVersion && !roleReview.action);
  const [ownerReady, ownerAdmission] = ownerEligible ? await Promise.all([
    inspectReady(db, auth.workspaceId, taskId, undefined, true), riskLevelAdmission(db, taskId, "review_decision")
  ]) : [null, null];
  const result = { status: execution.status, executionId: execution.id, summary: execution.summary, finalResponse: execution.finalResponse,
    reason: (execution.errorState as any)?.code ?? null, canReview: false,
    materialVersion, review: roleReview ? { decision: roleReview.decision === "approve"
      ? roleReview.actorAgentId ? ownerDecision?.decision ?? "verified_pending_owner" : "accept"
      : roleReview.action?.action === "return_to_executor" ? "return" : "reject", summary: ownerDecision?.summary ?? (roleReview.evidence as any)?.summary,
      verifierId: roleReview.verifierId, managerAction: roleReview.action?.action ?? null } : history ? { decision: (history.payload as any).decision, summary: (history.payload as any).summary } : null,
    verifierReview: roleReview?.actorAgentId ? { id: roleReview.id, decision: roleReview.decision,
      summary: (roleReview.evidence as any)?.summary ?? null, materialVersion: roleReview.materialVersion,
      evidence: roleReview.evidence, actorAgentId: roleReview.actorAgentId,
      actorCredentialPrefix: roleReview.actorCredentialPrefix } : null,
    ownerDecision: ownerDecision ? { id: ownerDecision.id, decision: ownerDecision.decision,
      summary: ownerDecision.summary, ownerUserId: ownerDecision.ownerUserId, createdAt: ownerDecision.createdAt } : null,
    canOwnerDecide: Boolean(ownerEligible && ownerReady && !("error" in ownerReady)
      && ownerAdmission?.status === "admitted"),
    sources: sources.map(s => ({ id: s.id, title: s.title, revision: s.updatedAt.toISOString() })),
    budget: { maxAttempts: contract.budgets.maxAttempts, maxDurationSeconds: contract.budgets.maxDurationSeconds, maxOutputTokensIntent: contract.budgets.maxOutputTokens, tokenCostEnforcement: "unavailable" },
    execution: { attempt: execution.attempt, startedAt: execution.startedAt, completedAt: execution.completedAt,
      model: (contract.modelSelection?.modelSelection ?? contract.modelSelection)?.model ?? null,
      effort: (contract.modelSelection?.modelSelection ?? contract.modelSelection)?.reasoningEffort ?? null,
      requestedBackend: contract.modelSelection?.backend ?? null,
      observedBackend: nativeProven ? (execution.verification as any)?.informationRuntime?.backend ?? null : null,
      observedModel: nativeProven ? (execution.verification as any)?.informationRuntime?.observedModel ?? null : null,
      observedDigest: nativeProven ? (execution.verification as any)?.informationRuntime?.observedDigest ?? null : null,
      checkpoint: (execution.checkpoint as any)?.stage ?? null,
      eventsTruncated: timeline.length > 100,
      events: timeline.slice(0, 100).map(event => ({ id: event.id, type: event.type, at: event.createdAt.toISOString() })) } };
  requireRuntimeContent(result, "owner.information_result", { workspaceId: auth.workspaceId, taskId }); return result;
}

export async function reviewInformationResult(db: Db, auth: AuthContext, taskId: string, raw: unknown) {
  const input = informationOwnerDecisionSchema.parse(raw);
  if (auth.authType !== "user" || !auth.userId || auth.taskScopeId) return { error: "information_owner_required" } as const;
  const task = await lockReadyTask(db, auth.workspaceId, taskId);
  if (!task) return { error: "task_not_found" } as const;
  const workspace = await db.workspace.findFirst({ where: { id: auth.workspaceId, ownerUserId: auth.userId } });
  if (!workspace || !await db.workspaceMembership.findFirst({ where: { workspaceId: auth.workspaceId,
    userId: auth.userId, role: "owner", taskScopeId: null } })) return { error: "information_owner_required" } as const;
  const requestHash = reviewDigest({ input, ownerUserId: auth.userId, workspaceId: auth.workspaceId, taskId });
  const prior = await db.informationOwnerDecision.findUnique({ where: { workspaceId_requestId: { workspaceId: auth.workspaceId, requestId: input.requestId } } });
  if (prior) return prior.requestHash === requestHash
    ? { ownerDecision: { id: prior.id, decision: prior.decision, summary: prior.summary }, replayed: true }
    : { error: "information_owner_decision_key_conflict" } as const;
  const execution = await db.agentExecution.findFirst({ where: { workspaceId: auth.workspaceId, taskId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  if (!execution || execution.id !== input.executionId || !await informationNativeProven(db, execution))
    return { error: "information_owner_decision_stale" } as const;
  const review = await db.taskReviewDecision.findFirst({ where: { id: input.reviewId, workspaceId: auth.workspaceId,
    taskId, executionId: execution.id }, include: { action: true } });
  if (!review || review.decision !== "approve" || !review.actorAgentId || review.actorUserId
    || !review.capabilityGrantId || review.materialVersion !== input.materialVersion || review.action
    || !await db.taskCapabilityUse.findFirst({ where: { grantId: review.capabilityGrantId, decisionId: review.id } })
    || await db.informationOwnerDecision.findUnique({ where: { executionId: execution.id } }))
    return { error: "information_owner_decision_stale" } as const;
  try { requireRuntimeContent({ summary: input.summary }, "owner.information_decision", { workspaceId: auth.workspaceId, taskId }); }
  catch { return { error: "agent_runtime_content_blocked" } as const; }
  const saved = await db.informationOwnerDecision.create({ data: { workspaceId: auth.workspaceId, taskId,
    executionId: execution.id, reviewId: review.id, ownerUserId: auth.userId,
    requestId: input.requestId, requestHash, materialVersion: input.materialVersion,
    decision: input.decision, summary: input.summary } });
  if (input.decision === "accept" && task.source !== "clickup") await db.task.update({ where: { id: taskId }, data: { status: "done" } });
  if (input.decision === "return") await db.task.update({ where: { id: taskId }, data: {
    ...(task.source !== "clickup" ? { status: "todo" } : {}),
    executionReadiness: { ...(task.executionReadiness as Record<string, unknown>), status: "needs_revalidation", reason: "owner_returned" } } });
  await db.event.create({ data: { workspaceId: auth.workspaceId, taskId, actorType: "user", actorId: auth.userId,
    type: "information_owner_decision", source: "roost", resourceType: "information_owner_decision",
    resourceId: saved.id, payload: { decision: saved.decision, executionId: saved.executionId,
      reviewId: saved.reviewId, materialVersion: saved.materialVersion } } });
  return { ownerDecision: { id: saved.id, decision: saved.decision, summary: saved.summary }, replayed: false };
}
