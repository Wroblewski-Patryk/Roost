import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { proofLifetimeSeconds } from "../../auth/owner-action-proof";
import { companySourceApprovedContent, companySourceEligible, companySourceProvenance, companySourceReviews } from "./company-source-trust";
import { taskCompanySources } from "./company-source-read";
import {
  createTaskProposalSchema, decideTaskProposalSchema, issueTaskProposalMandateSchema,
  revokeTaskProposalMandateSchema, taskPriorityForProposalBand, taskProposalFingerprint
} from "./task-proposal-contract";

type Db = Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const currentTaskStatuses = ["todo", "in_progress"] as const;

async function lockSourceFence(db: Db) {
  await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
}

async function owner(db: Db, workspaceId: string, actor: AuthContext) {
  if (actor.authType !== "user" || !actor.userId || actor.workspaceId !== workspaceId) return null;
  const [membership, workspace] = await Promise.all([
    db.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: actor.userId } }, select: { role: true } }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } })
  ]);
  return membership?.role === "owner" && workspace?.ownerUserId === actor.userId ? actor.userId : null;
}

function freshOwnerAction(actor: AuthContext) {
  const age = Math.floor(Date.now() / 1000) - (actor.authenticatedAt ?? 0);
  return age >= 0 && age <= proofLifetimeSeconds;
}

async function agent(db: Db, workspaceId: string, actor: AuthContext) {
  if (actor.authType !== "api_key" || !actor.agentId || !actor.apiKeyId || actor.workspaceId !== workspaceId) return null;
  const principal = await resolveReviewPrincipal(db, workspaceId, actor);
  if (principal?.kind !== "agent") return null;
  return principal;
}

async function currentSource(db: Db, workspaceId: string, sourceTaskId: string, agentId: string, sourceRecordId: string) {
  const task = await db.task.findFirst({ where: { id: sourceTaskId, workspaceId, assignedWorkforceEntityId: agentId,
    status: { in: [...currentTaskStatuses] } }, select: { id: true, projectId: true, title: true, assignedWorkforceEntityId: true } });
  if (!task) return null;
  // A project linked to an Application is not a company-only source task.
  if (task.projectId && await db.applicationProject.count({ where: { projectId: task.projectId, application: { workspaceId } } })) return null;
  const record = await db.companyRecord.findFirst({ where: { id: sourceRecordId, workspaceId, applicationId: null } });
  if (!record) return null;
  const review = (await companySourceReviews(db, workspaceId, sourceTaskId, [sourceRecordId])).get(sourceRecordId);
  if (!companySourceEligible(record, review, sourceTaskId, null)) return null;
  return { task, record, review: review! };
}

async function activeCredential(db: Db, workspaceId: string, credentialId: string, agentId: string) {
  await db.$queryRaw`SELECT id FROM api_keys WHERE id=${credentialId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const key = await db.apiKey.findFirst({ where: { id: credentialId, workspaceId, boundAgentId: agentId, active: true,
    revokedAt: null, expiresAt: { gt: new Date() } }, include: { boundAgent: true } });
  if (!key || key.boundAgent?.workspaceId !== workspaceId || key.boundAgent.type !== "agent"
    || key.boundAgent.status !== "active" || key.boundAgent.source === "user"
    || !Array.isArray(key.scopes) || !key.scopes.includes("agent-runtime:write")) return null;
  return key;
}

async function mandateStatus(db: Db, mandate: { id: string; workspaceId: string; sourceTaskId: string; sourceRecordId: string;
  sourceReviewId: string; sourceRevision: Date; sourceDigest: string; agentId: string;
  credentialId: string; credentialVersion: number; validUntil: Date }) {
  const [revocation, use, key] = await Promise.all([
    db.taskProposalMandateRevocation.findUnique({ where: { mandateId: mandate.id } }),
    db.taskProposalMandateUse.findUnique({ where: { mandateId: mandate.id } }),
    db.apiKey.findFirst({ where: { id: mandate.credentialId, workspaceId: mandate.workspaceId,
      boundAgentId: mandate.agentId, active: true, revokedAt: null,
      credentialVersion: mandate.credentialVersion }, include: { boundAgent: true } })
  ]);
  const source = await currentSource(db, mandate.workspaceId, mandate.sourceTaskId, mandate.agentId, mandate.sourceRecordId);
  const credentialCurrent = !!key && Array.isArray(key.scopes) && key.scopes.includes("agent-runtime:write")
    && key.boundAgent?.workspaceId === mandate.workspaceId && key.boundAgent.status === "active"
    && key.boundAgent.type === "agent" && key.boundAgent.source !== "user";
  const current = credentialCurrent && !!source && source.review.id === mandate.sourceReviewId
    && source.record.updatedAt.getTime() === mandate.sourceRevision.getTime()
    && source.review.contentDigest === mandate.sourceDigest;
  const status = revocation ? "revoked" : mandate.validUntil <= new Date() ? "expired" : !current ? "stale" : use ? "used" : "active";
  return { status, revokedAt: revocation?.createdAt ?? null, usedProposalId: use?.proposalId ?? null, source };
}

function mandateSafe(mandate: { id: string; sourceRecordId: string; sourceRevision: Date; validUntil: Date; reason: string; credentialId: string },
  status: string, keyPrefix: string | null, revokedAt: Date | null = null, usedProposalId: string | null = null, sourceTitle: string | null = null) {
  return { id: mandate.id, status, sourceTitle, sourceRecordId: mandate.sourceRecordId,
    sourceRevision: mandate.sourceRevision.toISOString(), validUntil: mandate.validUntil.toISOString(),
    revokedAt: revokedAt?.toISOString() ?? null, reason: mandate.reason,
    credentialId: mandate.credentialId, keyPrefix, usedProposalId };
}

export async function taskProposalMandateCatalog(db: Db, workspaceId: string, actor: AuthContext) {
  if (!await owner(db, workspaceId, actor)) return { error: "task_proposal_owner_required" } as const;
  const historicalIds = await db.$queryRaw<Array<{ taskId: string }>>`SELECT source_task_id AS "taskId"
    FROM task_proposal_mandates WHERE workspace_id=${workspaceId}::uuid
    GROUP BY source_task_id ORDER BY max(created_at) DESC,source_task_id DESC LIMIT 51`;
  const historicalTasks = await db.task.findMany({ where: { workspaceId, id: { in: historicalIds.slice(0, 50).map(row => row.taskId) } },
    select: { id: true, title: true } });
  const historicalById = new Map(historicalTasks.map(task => [task.id, task.title]));
  const mandateTasks = historicalIds.slice(0, 50).map(row => ({ taskId: row.taskId, title: historicalById.get(row.taskId) ?? "" }));
  const candidates = await db.task.findMany({ where: { workspaceId, status: { in: [...currentTaskStatuses] },
    assignedWorkforceEntityId: { not: null }, companySourceReviews: { some: { workspaceId } } },
    select: { id: true, title: true, projectId: true, assignedWorkforceEntityId: true,
      assignedWorkforceEntity: { select: { id: true, name: true, workspaceId: true, status: true, type: true, source: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 201 });
  const agentIds = candidates.map(task => task.assignedWorkforceEntityId).filter((id): id is string => !!id);
  const credentials = await db.apiKey.findMany({ where: { workspaceId, boundAgentId: { in: agentIds }, active: true,
    revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, boundAgentId: true, keyPrefix: true, scopes: true } });
  const items: Array<{ taskId: string; title: string; agent: { id: string; label: string }; credential: { id: string; keyPrefix: string | null };
    sources: Array<{ id: string; title: string; revision: string; reviewId: string }> }> = [];
  let truncated = candidates.length > 200;
  for (const task of candidates.slice(0, 200)) {
    const assigned = task.assignedWorkforceEntity;
    if (!assigned || assigned.workspaceId !== workspaceId || assigned.type !== "agent" || assigned.status !== "active" || assigned.source === "user") continue;
    if (task.projectId && await db.applicationProject.count({ where: { projectId: task.projectId, application: { workspaceId } } })) continue;
    const keys = credentials.filter(key => key.boundAgentId === assigned.id && Array.isArray(key.scopes) && key.scopes.includes("agent-runtime:write"));
    if (keys.length !== 1) continue;
    const sources = (await taskCompanySources(db, workspaceId, assigned.id, task.id) ?? [])
      .filter(item => item.content.applicationId === null);
    if (!sources.length) continue;
    if (sources.length > 20) truncated = true;
    items.push({ taskId: task.id, title: task.title, agent: { id: assigned.id, label: assigned.name },
      credential: { id: keys[0].id, keyPrefix: keys[0].keyPrefix },
      sources: sources.slice(0, 20).map(item => ({
        id: item.content.id, title: item.content.title, revision: item.content.revision, reviewId: item.provenance.reviewId
      })) });
    if (items.length === 50) { truncated ||= candidates.length > items.length; break; }
  }
  return { items, truncated,
    mandateTasks, historyTruncated: historicalIds.length > 50 };
}

export async function issueTaskProposalMandate(db: Db, workspaceId: string, sourceTaskId: string, actor: AuthContext, input: unknown) {
  const command = issueTaskProposalMandateSchema.parse(input);
  const ownerId = await owner(db, workspaceId, actor);
  if (!ownerId) return { error: "task_proposal_owner_required" } as const;
  if (!freshOwnerAction(actor)) return { error: "task_proposal_fresh_owner_required" } as const;
  const requestHash = hash({ operation: "issue", workspaceId, sourceTaskId, ownerId, command });
  const prior = await db.taskProposalMandate.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: command.requestId } } });
  if (prior) {
    if (prior.requestHash !== requestHash) return { error: "task_proposal_request_conflict" } as const;
    const state = await mandateStatus(db, prior);
    const key = await db.apiKey.findUnique({ where: { id: prior.credentialId }, select: { keyPrefix: true } });
    return { record: mandateSafe(prior, state.status, key?.keyPrefix ?? null, state.revokedAt, state.usedProposalId, state.source?.record.title ?? null), replayed: true };
  }
  await lockSourceFence(db);
  const key = await db.apiKey.findFirst({ where: { id: command.credentialId, workspaceId, boundAgentId: { not: null } }, select: { boundAgentId: true } });
  if (!key?.boundAgentId) return { error: "task_proposal_credential_invalid" } as const;
  const active = await activeCredential(db, workspaceId, command.credentialId, key.boundAgentId);
  if (!active) return { error: "task_proposal_credential_invalid" } as const;
  const source = await currentSource(db, workspaceId, sourceTaskId, key.boundAgentId, command.sourceRecordId);
  if (!source || source.record.updatedAt.toISOString() !== command.expectedSourceRevision)
    return { error: "task_proposal_source_invalid" } as const;
  const validUntil = new Date(command.validUntil), now = new Date();
  if (validUntil <= now || validUntil.getTime() > now.getTime() + 24 * 60 * 60 * 1000
    || !active.expiresAt || validUntil > active.expiresAt || validUntil > source.review.validUntil)
    return { error: "task_proposal_mandate_window_invalid" } as const;
  const mandate = await db.taskProposalMandate.create({ data: { id: randomUUID(), workspaceId, sourceTaskId,
    sourceRecordId: source.record.id, sourceReviewId: source.review.id, sourceRevision: source.record.updatedAt,
    sourceDigest: source.review.contentDigest, agentId: key.boundAgentId, credentialId: active.id,
    credentialVersion: active.credentialVersion, issuerUserId: ownerId, reason: command.reason,
    validUntil, requestId: command.requestId, requestHash } });
  await db.event.create({ data: { workspaceId, taskId: sourceTaskId, type: "task_proposal_mandate_issued", source: "roost",
    actorType: "user", actorId: ownerId, resourceType: "task_proposal_mandate", resourceId: mandate.id,
    payload: { mandateId: mandate.id, sourceRecordId: source.record.id, agentId: key.boundAgentId } } });
  return { record: mandateSafe(mandate, "active", active.keyPrefix, null, null, source.record.title), replayed: false };
}

export async function listTaskProposalMandates(db: Db, workspaceId: string, sourceTaskId: string, actor: AuthContext) {
  if (!await owner(db, workspaceId, actor)) return { error: "task_proposal_owner_required" } as const;
  const rows = await db.taskProposalMandate.findMany({ where: { workspaceId, sourceTaskId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51 });
  const items = [];
  for (const mandate of rows.slice(0, 50)) {
    const [state, key] = await Promise.all([mandateStatus(db, mandate), db.apiKey.findUnique({ where: { id: mandate.credentialId }, select: { keyPrefix: true } })]);
    items.push(mandateSafe(mandate, state.status, key?.keyPrefix ?? null, state.revokedAt, state.usedProposalId, state.source?.record.title ?? null));
  }
  return { items, hasMore: rows.length > 50 };
}

export async function revokeTaskProposalMandate(db: Db, workspaceId: string, sourceTaskId: string, mandateId: string, actor: AuthContext, input: unknown) {
  const command = revokeTaskProposalMandateSchema.parse(input);
  const ownerId = await owner(db, workspaceId, actor);
  if (!ownerId) return { error: "task_proposal_owner_required" } as const;
  if (!freshOwnerAction(actor)) return { error: "task_proposal_fresh_owner_required" } as const;
  const requestHash = hash({ operation: "revoke", workspaceId, sourceTaskId, mandateId, ownerId, command });
  const prior = await db.taskProposalMandateRevocation.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: command.requestId } } });
  if (prior) return prior.requestHash === requestHash && prior.mandateId === mandateId
    ? { record: { id: mandateId, status: "revoked", revokedAt: prior.createdAt.toISOString() }, replayed: true }
    : { error: "task_proposal_request_conflict" } as const;
  await lockSourceFence(db);
  await db.$queryRaw`SELECT id FROM task_proposal_mandates WHERE id=${mandateId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const mandate = await db.taskProposalMandate.findFirst({ where: { id: mandateId, workspaceId, sourceTaskId } });
  if (!mandate) return { error: "task_proposal_mandate_not_found" } as const;
  if (await db.taskProposalMandateRevocation.findUnique({ where: { mandateId } })) return { error: "task_proposal_mandate_revoked" } as const;
  const revoked = await db.taskProposalMandateRevocation.create({ data: { id: randomUUID(), workspaceId, mandateId,
    actorUserId: ownerId, reason: command.reason, requestId: command.requestId, requestHash } });
  await db.event.create({ data: { workspaceId, taskId: mandate.sourceTaskId, type: "task_proposal_mandate_revoked", source: "roost",
    actorType: "user", actorId: ownerId, resourceType: "task_proposal_mandate", resourceId: mandateId,
    payload: { mandateId } } });
  return { record: { id: mandateId, status: "revoked", revokedAt: revoked.createdAt.toISOString() }, replayed: false };
}

async function proposalCurrent(db: Db, proposal: { id: string; workspaceId: string; sourceTaskId: string; sourceRecordId: string;
  sourceReviewId: string; sourceRevision: Date; sourceDigest: string; authorAgentId: string;
  authorCredentialId: string; authorCredentialVersion: number; originMandateId: string }) {
  // A later valid occurrence may carry current authority after an earlier
  // mandate or credential was revoked. The canonical content stays immutable.
  const authorized = await db.$queryRaw<Array<{ occurrenceId: string; mandateId: string;
    agentId: string; credentialId: string }>>`SELECT o.id AS "occurrenceId",m.id AS "mandateId",
      o.actor_agent_id AS "agentId",o.actor_credential_id AS "credentialId"
    FROM task_proposal_occurrences o
    JOIN task_proposal_mandates m ON m.id=o.mandate_id
    JOIN api_keys k ON k.id=o.actor_credential_id
    JOIN workforce_entities a ON a.id=o.actor_agent_id
    JOIN tasks t ON t.id=m.source_task_id
    WHERE o.proposal_id=${proposal.id}::uuid AND o.workspace_id=${proposal.workspaceId}::uuid
      AND o.source_review_id=${proposal.sourceReviewId}::uuid
      AND o.source_revision=${proposal.sourceRevision}
      AND m.workspace_id=o.workspace_id AND m.source_task_id=${proposal.sourceTaskId}::uuid
      AND m.source_record_id=${proposal.sourceRecordId}::uuid AND m.source_review_id=o.source_review_id
      AND m.source_revision=o.source_revision AND m.source_digest=${proposal.sourceDigest}
      AND m.agent_id=o.actor_agent_id AND m.credential_id=o.actor_credential_id
      AND k.workspace_id=o.workspace_id AND k.bound_agent_id=o.actor_agent_id
      AND k.active AND k.revoked_at IS NULL AND k.credential_version=m.credential_version
      AND k.scopes @> '["agent-runtime:write"]'::jsonb
      AND a.workspace_id=o.workspace_id AND a.status='active' AND a.type='agent' AND a.source<>'user'
      AND t.workspace_id=o.workspace_id AND t.assigned_workforce_entity_id=o.actor_agent_id
      AND t.status IN ('todo','in_progress')
      AND NOT EXISTS(SELECT 1 FROM task_proposal_mandate_revocations x WHERE x.mandate_id=m.id)
    ORDER BY o.created_at DESC,o.id DESC LIMIT 1`;
  const basis = authorized[0] ?? null;
  const source = basis ? await currentSource(db, proposal.workspaceId, proposal.sourceTaskId,
    basis.agentId, proposal.sourceRecordId) : null;
  const current = !!source && source.review.id === proposal.sourceReviewId
    && source.record.updatedAt.getTime() === proposal.sourceRevision.getTime()
    && source.review.contentDigest === proposal.sourceDigest;
  return { current, source, acceptanceBasis: current ? basis : null };
}

export async function createTaskProposal(db: Db, workspaceId: string, sourceTaskId: string, actor: AuthContext, input: unknown) {
  const command = createTaskProposalSchema.parse(input);
  const principal = await agent(db, workspaceId, actor);
  if (!principal) return { error: "task_proposal_agent_required" } as const;
  await lockSourceFence(db);
  await db.$queryRaw`SELECT id FROM task_proposal_mandates WHERE id=${command.mandateId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const mandate = await db.taskProposalMandate.findFirst({ where: { id: command.mandateId, workspaceId, sourceTaskId,
    sourceRecordId: command.sourceRecordId, agentId: principal.id, credentialId: principal.credentialId! } });
  if (!mandate || mandate.credentialVersion !== actor.credentialVersion) return { error: "task_proposal_mandate_invalid" } as const;
  if (mandate.validUntil <= new Date() || await db.taskProposalMandateRevocation.findUnique({ where: { mandateId: mandate.id } }))
    return { error: "task_proposal_mandate_invalid" } as const;
  const source = await currentSource(db, workspaceId, sourceTaskId, principal.id, command.sourceRecordId);
  if (!source || source.review.id !== mandate.sourceReviewId || source.review.contentDigest !== mandate.sourceDigest
    || source.record.updatedAt.getTime() !== mandate.sourceRevision.getTime()
    || source.record.updatedAt.toISOString() !== command.expectedSourceRevision)
    return { error: "task_proposal_source_invalid" } as const;
  const requestHash = hash({ operation: "create", workspaceId, sourceTaskId, principal, command });
  const prior = await db.taskProposalOccurrence.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: command.requestId } } });
  if (prior) {
    if (prior.requestHash !== requestHash || prior.mandateId !== mandate.id) return { error: "task_proposal_request_conflict" } as const;
    const decision = await db.taskProposalDecision.findUnique({ where: { proposalId: prior.proposalId }, select: { action: true } });
    return { record: { id: prior.proposalId, status: decision?.action ?? "pending", sourceRecordId: command.sourceRecordId }, replayed: true, duplicate: true };
  }
  const fingerprint = taskProposalFingerprint(command.sourceRecordId, source.review.id,
    command.category, command.title, command.outcome);
  const used = await db.taskProposalMandateUse.findUnique({ where: { mandateId: mandate.id } });
  if (used && used.fingerprint !== fingerprint) return { error: "task_proposal_mandate_spent" } as const;
  let proposal = await db.taskProposal.findUnique({ where: { workspaceId_fingerprint: { workspaceId, fingerprint } } });
  const duplicate = !!proposal;
  if (used && proposal?.id !== used.proposalId) return { error: "task_proposal_mandate_spent" } as const;
  if (!proposal) {
    proposal = await db.taskProposal.create({ data: { id: randomUUID(), workspaceId, sourceTaskId,
      originMandateId: mandate.id,
      sourceRecordId: source.record.id, sourceReviewId: source.review.id, sourceRevision: source.record.updatedAt,
      sourceDigest: source.review.contentDigest, authorAgentId: principal.id, authorCredentialId: principal.credentialId!,
      authorCredentialVersion: actor.credentialVersion!, title: command.title, outcome: command.outcome,
      category: command.category, priorityBand: command.priorityBand, priorityRationale: command.priorityRationale,
      fingerprint } });
  }
  if (!used) await db.taskProposalMandateUse.create({ data: { id: randomUUID(), workspaceId,
    mandateId: mandate.id, proposalId: proposal.id, fingerprint } });
  await db.taskProposalOccurrence.create({ data: { id: randomUUID(), workspaceId, proposalId: proposal.id,
    mandateId: mandate.id, sourceReviewId: source.review.id, sourceRevision: source.record.updatedAt,
    actorAgentId: principal.id, actorCredentialId: principal.credentialId!, requestId: command.requestId,
    requestHash, body: { title: command.title, outcome: command.outcome, category: command.category,
      priorityBand: command.priorityBand, priorityRationale: command.priorityRationale } } });
  await db.event.create({ data: { workspaceId, taskId: sourceTaskId, type: duplicate ? "task_proposal_occurrence" : "task_proposal_created",
    source: "roost", actorType: "agent", actorId: principal.id, resourceType: "task_proposal", resourceId: proposal.id,
    payload: { proposalId: proposal.id, sourceRecordId: source.record.id, duplicate } } });
  const decision = await db.taskProposalDecision.findUnique({ where: { proposalId: proposal.id }, select: { action: true } });
  return { record: { id: proposal.id, status: decision?.action ?? "pending", sourceRecordId: proposal.sourceRecordId }, replayed: false, duplicate };
}

export async function listTaskProposals(db: Db, workspaceId: string, actor: AuthContext, page = 0, status?: "pending") {
  if (!await owner(db, workspaceId, actor)) return { error: "task_proposal_owner_required" } as const;
  if (!Number.isInteger(page) || page < 0 || page > 1000) return { error: "task_proposal_page_invalid" } as const;
  const rows = status === "pending" ? await (async () => {
    // Filter in SQL before LIMIT/OFFSET so a page never appears empty merely
    // because accepted or rejected proposals occupied its first 50 rows.
    const ids = await db.$queryRaw<Array<{ id: string }>>`SELECT p.id FROM task_proposals p
      WHERE p.workspace_id=${workspaceId}::uuid AND NOT EXISTS
        (SELECT 1 FROM task_proposal_decisions d WHERE d.proposal_id=p.id)
      ORDER BY p.created_at DESC,p.id DESC LIMIT 51 OFFSET ${page * 50}`;
    const records = await db.taskProposal.findMany({ where: { workspaceId, id: { in: ids.map(item => item.id) } } });
    const byId = new Map(records.map(item => [item.id, item]));
    return ids.flatMap(item => byId.get(item.id) ?? []);
  })() : await db.taskProposal.findMany({ where: { workspaceId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: page * 50, take: 51 });
  const items = [];
  for (const proposal of rows.slice(0, 50)) {
    const [{ current, source }, decision, author] = await Promise.all([
      proposalCurrent(db, proposal),
      db.taskProposalDecision.findUnique({ where: { proposalId: proposal.id }, select: { action: true, taskId: true, reason: true } }),
      db.workforceEntity.findUnique({ where: { id: proposal.authorAgentId }, select: { name: true } })
    ]);
    const sourceTitle = source?.record.title ?? (await db.companyRecord.findUnique({ where: { id: proposal.sourceRecordId }, select: { title: true } }))?.title ?? null;
    items.push({ id: proposal.id, status: decision?.action ?? "pending", title: proposal.title,
      outcome: proposal.outcome, category: proposal.category, priorityBand: proposal.priorityBand,
      priorityRationale: proposal.priorityRationale, sourceTitle, sourceRecordId: proposal.sourceRecordId,
      sourceRevision: proposal.sourceRevision.toISOString(), sourceTaskId: proposal.sourceTaskId,
      proposerAgentId: proposal.authorAgentId, proposerLabel: author?.name ?? null,
      createdAt: proposal.createdAt.toISOString(), acceptedTaskId: decision?.taskId ?? null,
      decisionReason: decision?.reason ?? null, sourceCurrent: current });
  }
  return { items, hasMore: rows.length > 50, page };
}

export async function taskProposalDetail(db: Db, workspaceId: string, proposalId: string, actor: AuthContext) {
  if (!await owner(db, workspaceId, actor)) return { error: "task_proposal_owner_required" } as const;
  const proposal = await db.taskProposal.findFirst({ where: { id: proposalId, workspaceId } });
  if (!proposal) return { error: "task_proposal_not_found" } as const;
  const [{ current, source, acceptanceBasis }, decision, occurrences, author, originalReview] = await Promise.all([
    proposalCurrent(db, proposal), db.taskProposalDecision.findUnique({ where: { proposalId } }),
    db.taskProposalOccurrence.findMany({ where: { workspaceId, proposalId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51 }),
    db.workforceEntity.findUnique({ where: { id: proposal.authorAgentId }, select: { name: true } }),
    db.companySourceReview.findFirst({ where: { id: proposal.sourceReviewId, workspaceId,
      taskId: proposal.sourceTaskId, recordId: proposal.sourceRecordId },
      select: { id: true, classification: true, provenance: true, verificationMethod: true,
        verificationRef: true, inclusionReason: true, contentDigest: true, validFrom: true,
        validUntil: true, createdAt: true, actorUserId: true } })
  ]);
  const expectedVersion = hash({ id: proposal.id, fingerprint: proposal.fingerprint,
    decisionId: decision?.id ?? null, sourceCurrent: current, reviewId: source?.review.id ?? null,
    taskAssignment: source?.task.assignedWorkforceEntityId ?? null,
    latestOccurrenceId: occurrences[0]?.id ?? null,
    acceptanceOccurrenceId: acceptanceBasis?.occurrenceId ?? null,
    acceptanceMandateId: acceptanceBasis?.mandateId ?? null });
  const sourceTitle = source?.record.title ?? (await db.companyRecord.findUnique({ where: { id: proposal.sourceRecordId }, select: { title: true } }))?.title ?? null;
  return { id: proposal.id, status: decision?.action ?? "pending", title: proposal.title,
    outcome: proposal.outcome, category: proposal.category, priorityBand: proposal.priorityBand,
    priorityRationale: proposal.priorityRationale, sourceTitle, sourceRecordId: proposal.sourceRecordId,
    sourceRevision: proposal.sourceRevision.toISOString(), sourceTaskId: proposal.sourceTaskId,
    proposerAgentId: proposal.authorAgentId, proposerLabel: author?.name ?? null,
    createdAt: proposal.createdAt.toISOString(), acceptedTaskId: decision?.taskId ?? null,
    decisionReason: decision?.reason ?? null, expectedVersion, sourceCurrent: current,
    acceptanceBasis,
    record: { id: proposal.id, sourceTaskId: proposal.sourceTaskId, sourceRecordId: proposal.sourceRecordId,
      sourceReviewId: proposal.sourceReviewId, sourceRevision: proposal.sourceRevision.toISOString(),
      title: proposal.title, outcome: proposal.outcome, category: proposal.category,
      priorityBand: proposal.priorityBand, priorityRationale: proposal.priorityRationale,
      author: { agentId: proposal.authorAgentId, agentName: author?.name ?? null,
        credentialId: proposal.authorCredentialId }, createdAt: proposal.createdAt.toISOString(),
      status: decision?.action ?? "pending" },
    source: current && source ? { content: companySourceApprovedContent(source.record),
      provenance: companySourceProvenance(source.review, source.record) } : null,
    historicalProvenance: originalReview ? { historical: true, reviewId: originalReview.id,
      classification: originalReview.classification, provenance: originalReview.provenance,
      verificationMethod: originalReview.verificationMethod, verificationRef: originalReview.verificationRef,
      inclusionReason: originalReview.inclusionReason, contentDigest: originalReview.contentDigest,
      validFrom: originalReview.validFrom.toISOString(), validUntil: originalReview.validUntil.toISOString(),
      reviewedAt: originalReview.createdAt.toISOString(), reviewedByUserId: originalReview.actorUserId } : null,
    decision: decision ? { id: decision.id, action: decision.action, reason: decision.reason,
      taskId: decision.taskId, actorUserId: decision.actorUserId, snapshot: decision.snapshot,
      createdAt: decision.createdAt.toISOString() } : null,
    occurrences: occurrences.slice(0, 50).map(item => ({ id: item.id, agentId: item.actorAgentId,
      credentialId: item.actorCredentialId, sourceReviewId: item.sourceReviewId,
      sourceRevision: item.sourceRevision.toISOString(), body: item.body, createdAt: item.createdAt.toISOString() })),
    occurrencesTruncated: occurrences.length > 50 };
}

export async function decideTaskProposal(db: Db, workspaceId: string, proposalId: string, actor: AuthContext, input: unknown) {
  const command = decideTaskProposalSchema.parse(input);
  const ownerId = await owner(db, workspaceId, actor);
  if (!ownerId) return { error: "task_proposal_owner_required" } as const;
  const requestHash = hash({ operation: "decide", workspaceId, proposalId, ownerId, command });
  const prior = await db.taskProposalDecision.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: command.requestId } } });
  if (prior) return prior.requestHash === requestHash && prior.proposalId === proposalId
    ? { record: { id: prior.id, action: prior.action, taskId: prior.taskId }, taskId: prior.taskId, replayed: true }
    : { error: "task_proposal_request_conflict" } as const;
  await lockSourceFence(db);
  await db.$queryRaw`SELECT id FROM task_proposals WHERE id=${proposalId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const view = await taskProposalDetail(db, workspaceId, proposalId, actor);
  if ("error" in view) return view;
  if (view.decision) return { error: "task_proposal_decided" } as const;
  if (command.expectedVersion !== view.expectedVersion) return { error: "task_proposal_stale" } as const;
  if (command.action === "accept" && !view.sourceCurrent) return { error: "task_proposal_source_invalid" } as const;
  if (command.action === "reject" && (command.title || command.outcome || command.category || command.priorityBand || command.priorityRationale))
    return { error: "task_proposal_reject_edits_invalid" } as const;
  const title = command.title ?? view.record.title;
  const outcome = command.outcome ?? view.record.outcome;
  const category = command.category ?? view.record.category;
  const priorityBand = command.priorityBand ?? view.record.priorityBand;
  const priorityRationale = command.priorityRationale ?? view.record.priorityRationale;
  const task = command.action === "accept" ? await db.task.create({ data: { id: randomUUID(), workspaceId,
    ownerUserId: ownerId, title, description: outcome,
    priority: taskPriorityForProposalBand(priorityBand),
    status: "todo", source: "roost", executionReadiness: { status: "draft",
      reason: "proposal_context_required", proposalId } } }) : null;
  const decision = await db.taskProposalDecision.create({ data: { id: randomUUID(), workspaceId, proposalId,
    actorUserId: ownerId, action: command.action, reason: command.reason, taskId: task?.id ?? null,
    snapshot: { title, outcome, category, priorityBand, priorityRationale,
      taskPriority: taskPriorityForProposalBand(priorityBand),
      sourceReviewId: view.record.sourceReviewId, sourceRevision: view.record.sourceRevision,
      acceptanceBasis: command.action === "accept" ? view.acceptanceBasis : null },
    requestId: command.requestId, requestHash } });
  await db.event.create({ data: { workspaceId, taskId: task?.id ?? view.record.sourceTaskId,
    type: command.action === "accept" ? "task_proposal_accepted" : "task_proposal_rejected", source: "roost",
    actorType: "user", actorId: ownerId, resourceType: "task_proposal", resourceId: proposalId,
    payload: { proposalId, taskId: task?.id ?? null } } });
  return { record: { id: decision.id, action: decision.action, taskId: task?.id ?? null }, taskId: task?.id ?? null, replayed: false };
}
