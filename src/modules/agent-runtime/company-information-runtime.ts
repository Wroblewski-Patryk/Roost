import { createHash, createPublicKey, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import type { ManagedAdmissionSigner } from "./managed-admission";
import { workerClaimAllowed } from "../../auth/worker-ticket-principal";
import { inspectReady, lockReadyTask, submissionVersion, submitReady } from "./task-execution-readiness";
import { requireRuntimeContent } from "./runtime-redaction-policy";

export const companyRuntimeClass = "roost-company-information-runtime-v1";
const load = new Function("p", "return import(p)") as (p: string) => Promise<any>;
const runtime = load(require("node:url").pathToFileURL(require("node:path").resolve(__dirname, "../../../scripts/lib/agent-host-company-information-runtime.mjs")).href);
const pilot = load(require("node:url").pathToFileURL(require("node:path").resolve(__dirname, "../../../scripts/lib/agent-host-trusted-pilot.mjs")).href);
type Db = Prisma.TransactionClient;
const wire = (v: any) => JSON.parse(JSON.stringify(v));
const digest = async (v: any) => createHash("sha256").update((await pilot).trustedPilotBytes(v)).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
export const isInformationRuntime = (c: any) => c?.executionClass === companyRuntimeClass;

export async function informationApproval(db: Db, workspaceId: string, taskId: string, selection: any) {
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
    AND r.body->'managedRuntimeApproval'->>'backend'='codex_responses'
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
  if (!["roost-company-information-v1", companyRuntimeClass].includes(c.executionClass)) return { error: "company_information_scope_invalid" };
  const selected = c.modelSelection?.schemaVersion ? c.modelSelection.modelSelection : c.modelSelection;
  c.executionClass = companyRuntimeClass; c.budgets.maxAttempts = 1;
  c.modelSelection = { schemaVersion: "roost-managed-hermes-backend-v1", agent: "managed_hermes", riskClass: "low", fallback: "none",
    attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: "stop_attempt", restart: "never" }, backend: "codex_responses", provider: "openai-codex", modelSelection: selected, auth: "same_owner_subscription" };
  const approval = await informationApproval(db, auth.workspaceId, taskId, c.modelSelection);
  if (!approval) return { error: "runtime_authority_required" };
  if (await db.agentExecution.count({ where: { workspaceId: auth.workspaceId, taskId, metadata: { path: ["readyContextPin", "runtimeDecisionId"], equals: approval.decisionId } } })) return { error: "information_budget_spent_new_plan_required" };
  c.decisions = { items: [...c.decisions.items.filter((r: any) => r.id !== approval.decisionId), { id: approval.decisionId, revision: approval.revision }], noneReason: null };
  const submitted = await submitReady(db, auth.workspaceId, taskId, { requestId: input.requestId, expectedVersion: await submissionVersion(db, auth.workspaceId, taskId, null), applicationId: null, contract: c, prompt: pin.prompt, baseBranch: null }, { requestedByType: "user", requestedById: auth.userId });
  if ("error" in submitted && submitted.error) return submitted;
  const checked = await inspectReady(db, auth.workspaceId, taskId);
  if (checked.error) return checked;
  const qualified: any = checked.pin;
  const execution = await db.agentExecution.create({ data: { workspaceId: auth.workspaceId, taskId, applicationId: null, baseBranch: null,
    requestedByType: "user", requestedById: auth.userId, prompt: qualified.prompt,
    metadata: { informationStartRequestId: input.requestId, executionContract: c, readyContextPin: { pinId: qualified.pinId, revision: qualified.revision, preparationOnly: false, modelExecutionQualified: true,
      runtimeDecisionId: approval.decisionId, runtimeDecisionVersion: approval.decisionVersion } } } });
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
    const approval = await informationApproval(db, auth.workspaceId, execution.taskId, (ready.pin as any).contract.modelSelection);
    if (!approval || approval.decisionId !== (ready.pin as any).runtimeApproval?.decisionId) throw Error("managed_admission_denied");
    if (await db.agentExecutionEvent.count({ where: { executionId, type: "information_admitted" } })) throw Error("information_attempt_already_admitted");
    const sealed = (await runtime).buildCompanyInformationInput({ claimed: wire({ ...execution, installationId: identity.installationId }), taskContext: ready.taskContext });
    const observed = input.observation as any;
    const now = new Date(), deadline = new Date(execution.startedAt!.getTime() + (ready.pin as any).contract.budgets.maxDurationSeconds * 1000);
    const expiresAt = new Date(Math.min(now.getTime() + 45000, execution.leaseExpiresAt!.getTime(), deadline.getTime() - 5000));
    const payload = (await runtime).informationAdmissionSchema.parse({ schemaVersion: "roost-company-information-admission-v1", domain: "roost-company-information-admission-v1",
      executionId, taskId: execution.taskId, workspaceId: auth.workspaceId, installationId: identity.installationId, hostId: identity.hostId, applicationId: null, attempt: 1,
      readyRevision: sealed.readyRevision, packetRevision: sealed.packetRevision, inputSeal: sealed.inputSeal, selectionDigest: sealed.selectionDigest,
      profileDigest: hash.parse(observed.profileDigest), runtimeDigest: hash.parse(observed.runtimeDigest),
      leaseDigest: await digest({ executionId, hostId: identity.hostId, token: input.leaseToken }),
      issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), decisionId: approval.decisionId, decisionVersion: approval.decisionVersion, tools: [], externalWrites: false, deadline: deadline.toISOString() });
    const signed = { payload, signature: signer.sign((await pilot).trustedPilotBytes(payload)).toString("hex") };
    await db.agentExecutionEvent.create({ data: { workspaceId: auth.workspaceId, executionId, type: "information_admitted", message: "Exact owner decision and current information context admitted once.", payload: { admissionDigest: await digest(signed), inputSeal: sealed.inputSeal, selection: (ready.pin as any).contract.modelSelection } } });
    return signed;
  }, { isolationLevel: "Serializable", timeout: 15000 });
}

export async function informationResult(db: Db, auth: AuthContext, taskId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId: auth.workspaceId } });
  if (!task) return { error: "task_not_found" };
  const execution = await db.agentExecution.findFirst({ where: { taskId, workspaceId: auth.workspaceId, applicationId: null, metadata: { path: ["executionContract", "executionClass"], equals: companyRuntimeClass } }, orderBy: { createdAt: "desc" } });
  if (!execution) return { status: "pending", executionId: null, summary: null, finalResponse: null, reason: null, canReview: false, materialVersion: null, review: null, sources: [], budget: null };
  const contract = (execution.metadata as any).executionContract;
  const sources = await db.companyRecord.findMany({ where: { workspaceId: auth.workspaceId, id: { in: contract.context.company.map((r: any) => r.id) } }, select: { id: true, title: true, updatedAt: true } });
  const materialVersion = await digest({ id: execution.id, finalResponse: execution.finalResponse, summary: execution.summary, metadata: execution.metadata, verification: execution.verification });
  const history = await db.agentExecutionEvent.findFirst({ where: { executionId: execution.id, type: "information_review" }, orderBy: { createdAt: "desc" } });
  const w = await db.workspace.findUniqueOrThrow({ where: { id: auth.workspaceId } });
  const admitted = await db.agentExecutionEvent.findFirst({ where: { executionId: execution.id, type: "information_admitted" } });
  const native: any = (execution.verification as any)?.informationRuntime, owned: any = (execution.verification as any)?.ownedTreeReceipt;
  const nativeProven = !!admitted && native?.admissionDigest === (admitted.payload as any).admissionDigest && native?.inputSeal === (admitted.payload as any).inputSeal
    && native?.executionId === execution.id && native?.ownedJob === true && owned?.version === "roost-windows-job-v2" && owned?.attempt === execution.id
    && owned?.cleanup === true && owned?.jobClosed === true && owned?.activeProcesses === 0 && owned?.rootExit === 0;
  const result = { status: execution.status, executionId: execution.id, summary: execution.summary, finalResponse: execution.finalResponse,
    reason: (execution.errorState as any)?.code ?? null, canReview: nativeProven && execution.status === "completed" && auth.authType === "user" && auth.userId === w.ownerUserId && !history,
    materialVersion, review: history ? { decision: (history.payload as any).decision, summary: (history.payload as any).summary } : null,
    sources: sources.map(s => ({ id: s.id, title: s.title, revision: s.updatedAt.toISOString() })),
    budget: { maxAttempts: contract.budgets.maxAttempts, maxDurationSeconds: contract.budgets.maxDurationSeconds, maxOutputTokensIntent: contract.budgets.maxOutputTokens, tokenCostEnforcement: "unavailable" } };
  requireRuntimeContent(result, "owner.information_result", { workspaceId: auth.workspaceId, taskId }); return result;
}

export async function reviewInformationResult(db: Db, auth: AuthContext, taskId: string, raw: unknown) {
  const input = z.object({ requestId: id, executionId: id, materialVersion: hash, decision: z.enum(["accept", "return"]), summary: z.string().trim().min(3).max(2000) }).strict().parse(raw);
  await lockReadyTask(db, auth.workspaceId, taskId);
  requireRuntimeContent(input, "owner.information_review", { workspaceId: auth.workspaceId, taskId });
  const replay = await db.agentExecutionEvent.findFirst({ where: { workspaceId: auth.workspaceId, executionId: input.executionId, type: "information_review", payload: { path: ["requestId"], equals: input.requestId } } });
  const requestHash = await digest({ ...input, userId: auth.userId });
  if (replay) return (replay.payload as any).requestHash === requestHash ? { review: replay.payload, replay: true } : { error: "information_review_key_conflict" };
  const view = await informationResult(db, auth, taskId);
  if ("error" in view || !view.canReview) return { error: "information_review_forbidden" };
  if (view.executionId !== input.executionId || view.materialVersion !== input.materialVersion) return { error: "information_review_stale" };
  const event = await db.agentExecutionEvent.create({ data: { workspaceId: auth.workspaceId, executionId: input.executionId, type: "information_review", message: input.summary,
    payload: { ...input, requestHash, actorUserId: auth.userId } } });
  await db.task.update({ where: { id: taskId }, data: { status: input.decision === "accept" ? "done" : "todo" } });
  return { review: event.payload, replay: false };
}
