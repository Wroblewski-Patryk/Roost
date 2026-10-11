import type { Prisma, Task, TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { IntegrationError } from "../errors";
import { getClickUpSettingsForWorkspace, getIntegrationSettingForWorkspace, type ClickUpIntegrationConfig } from "../integration-settings.service";
import { ClickUpClient, type ClickUpTask } from "./clickup.client";
import { mapStatus } from "./clickup.mapper";

const openStates = ["posting", "awaiting_provider", "uncertain", "conflict"];

export async function clickUpDirectActionsDisabled(workspaceId: string) {
  const setting = await getIntegrationSettingForWorkspace(workspaceId, "clickup");
  const config = setting?.config as ClickUpIntegrationConfig | undefined;
  return Boolean(config?.governedStatusListId && config.listIds?.includes(config.governedStatusListId));
}

export async function governedClickUpListForTask(task: Pick<Task, "workspaceId" | "taskListId" | "source" | "externalId">) {
  if (task.source !== "clickup" || !task.externalId || !task.workspaceId || !task.taskListId) return null;
  const setting = await getIntegrationSettingForWorkspace(task.workspaceId, "clickup");
  const config = setting?.config as ClickUpIntegrationConfig | undefined;
  const selected = config?.governedStatusListId;
  if (!selected || !config?.listIds?.includes(selected)) return null;
  const list = await prisma.taskList.findFirst({ where: { id: task.taskListId, workspaceId: task.workspaceId, source: "clickup", externalId: selected } });
  return list ? { externalListId: selected } : null;
}

export async function governedClickUpListForNewTask(workspaceId: string, listExternalId: string | null | undefined) {
  if (!listExternalId) return false;
  const setting = await getIntegrationSettingForWorkspace(workspaceId, "clickup");
  const config = setting?.config as ClickUpIntegrationConfig | undefined;
  return Boolean(config?.governedStatusListId === listExternalId && config.listIds?.includes(listExternalId));
}

export async function clickUpStatusControlForTasks(workspaceId: string, tasks: Array<{ id: string; source: string | null; taskListId: string | null; status: TaskStatus }>) {
  const setting = await getIntegrationSettingForWorkspace(workspaceId, "clickup");
  const config = setting?.config as ClickUpIntegrationConfig | undefined;
  const selected = config?.governedStatusListId;
  if (!selected || !config?.listIds?.includes(selected)) return new Map<string, unknown>();
  const lists = await prisma.taskList.findMany({ where: { workspaceId, source: "clickup", externalId: selected }, select: { id: true } });
  const listIds = new Set(lists.map(list => list.id));
  const clickUpTasks = tasks.filter(task => task.source === "clickup");
  const ids = clickUpTasks.map(task => task.id);
  if (!clickUpTasks.length) return new Map<string, unknown>();
  const [states, intents] = await Promise.all([
    prisma.clickUpStatusState.findMany({ where: { workspaceId, taskId: { in: ids } } }),
    prisma.clickUpStatusIntent.findMany({ where: { workspaceId, taskId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["taskId"] })
  ]);
  const statesById = new Map(states.map(state => [state.taskId, state]));
  const intentsById = new Map(intents.map(intent => [intent.taskId, intent]));
  const tasksById = new Map(tasks.map(task => [task.id, task]));
  return new Map(clickUpTasks.map(task => {
    const id = task.id;
    const governedList = Boolean(task.taskListId && listIds.has(task.taskListId));
    const state = statesById.get(id);
    const intent = intentsById.get(id);
    return [id, {
      governedList,
      directActionsDisabled: true,
      providerStatus: state?.providerStatus ?? null,
      providerStatusName: state?.providerStatusName ?? null,
      providerUpdatedAt: state?.providerUpdatedAt ?? null,
      providerErrorCode: state?.providerErrorCode ?? null,
      providerMismatch: Boolean(state && tasksById.get(id)?.status !== state.providerStatus),
      signedInboxId: state?.signedInboxId ?? null,
      actor: state?.actorProviderUserId ? { providerUserId: state.actorProviderUserId, verification: state.actorVerification } : null,
      intent: intent ? { id: intent.id, requestedStatus: intent.requestedStatus, baseStatus: intent.baseStatus,
        state: intent.state, commentId: intent.commentId, createdAt: intent.createdAt, errorCode: intent.errorCode } : null
    }];
  }));
}

function marker(id: string) { return `[Roost status request ${id}]`; }

export async function requestGovernedClickUpStatus(input: { task: Task; requestedStatus: TaskStatus; requesterUserId: string }) {
  const scope = await governedClickUpListForTask(input.task);
  if (!scope || !input.task.workspaceId || !input.task.externalId) throw new IntegrationError("clickup_status_scope_unavailable", 422, "Selected ClickUp List is unavailable.");
  const workspaceId = input.task.workspaceId;
  const settings = await getClickUpSettingsForWorkspace(workspaceId);
  if (!settings) throw new IntegrationError("integration_not_configured", 422, "ClickUp is disconnected.");
  const registration = await prisma.externalWebhookRegistration.findFirst({ where: { workspaceId, provider: "clickup", scopeType: "list", scopeExternalId: scope.externalListId, status: "active" } });
  if (!registration) throw new IntegrationError("clickup_webhook_required", 422, "An active list webhook is required before status requests.");
  const state = await prisma.clickUpStatusState.findUnique({ where: { taskId: input.task.id } });
  if (state?.providerErrorCode) throw new IntegrationError("clickup_status_version_conflict", 409, "Provider task requires reconciliation before another request.");
  const existingIntent = await prisma.clickUpStatusIntent.findFirst({ where: { taskId: input.task.id, state: { in: openStates } } });
  if (existingIntent) throw new IntegrationError("clickup_status_intent_open", 409, "A status request is already open.");
  const client = new ClickUpClient(settings.token);
  const remote = await client.getTask(input.task.externalId);
  if (remote.list?.id !== scope.externalListId) throw new IntegrationError("clickup_status_scope_mismatch", 409, "Task is outside the selected ClickUp List.");
  if (!remote.status?.status?.trim()) throw new IntegrationError("clickup_status_readback_incomplete", 502, "ClickUp status readback is incomplete.");
  const providerStatus = mapStatus(remote);
  const current = await prisma.task.findFirst({ where: { id: input.task.id, workspaceId } });
  if (!current || current.status !== input.task.status || current.taskListId !== input.task.taskListId) throw new IntegrationError("clickup_status_version_conflict", 409, "Task changed during the request.");
  if (providerStatus !== current.status) {
    try { await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id=${current.id}::uuid FOR UPDATE`;
      const locked = await tx.task.findUniqueOrThrow({ where: { id: current.id } });
      if (locked.status !== current.status || locked.taskListId !== current.taskListId) throw new IntegrationError("clickup_status_version_conflict", 409, "Task changed during the request.");
      await tx.clickUpStatusState.upsert({ where: { taskId: current.id }, update: { providerStatus, providerStatusName: remote.status?.status ?? null, externalListId: scope.externalListId,
        providerErrorCode: null,
        signedInboxId: null, actorProviderUserId: null, providerUpdatedAt: null }, create: {
        taskId: current.id, workspaceId, externalListId: scope.externalListId, providerStatus, providerStatusName: remote.status?.status ?? null
      } });
      await tx.clickUpStatusIntent.create({ data: { workspaceId, taskId: current.id, externalTaskId: remote.id, externalListId: scope.externalListId,
        requesterUserId: input.requesterUserId, baseStatus: current.status, requestedStatus: input.requestedStatus, state: "conflict", errorCode: "provider_status_differs_from_canonical" } });
    }); } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new IntegrationError("clickup_status_intent_open", 409, "A status request is already open.");
      throw error;
    }
    throw new IntegrationError("clickup_status_version_conflict", 409, "ClickUp status differs from Roost; conflict is recorded.");
  }
  if (input.requestedStatus === current.status) return { state: "unchanged" as const };
  let intent;
  try { intent = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tasks WHERE id=${current.id}::uuid FOR UPDATE`;
    const locked = await tx.task.findUniqueOrThrow({ where: { id: current.id } });
    if (locked.status !== current.status || locked.taskListId !== current.taskListId) {
      throw new IntegrationError("clickup_status_version_conflict", 409, "Task changed during the request.");
    }
    const created = await tx.clickUpStatusIntent.create({ data: { workspaceId, taskId: current.id, externalTaskId: remote.id,
      externalListId: scope.externalListId, requesterUserId: input.requesterUserId, baseStatus: current.status,
      requestedStatus: input.requestedStatus, state: "posting" } });
    await tx.event.create({ data: { workspaceId, taskId: current.id, source: "clickup", type: "clickup_status_requested",
      actorType: "user", actorId: input.requesterUserId, payload: { intentId: created.id, baseStatus: current.status,
        requestedStatus: input.requestedStatus, externalListId: scope.externalListId } } });
    return created;
  }); } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new IntegrationError("clickup_status_intent_open", 409, "A status request is already open.");
    }
    throw error;
  }
  const commentText = `${marker(intent.id)}\nRequested task status: ${input.requestedStatus}. Current ClickUp status: ${remote.status?.status ?? current.status}. Roost will wait for a signed ClickUp status event and provider readback.`;
  try {
    const beforePost = await client.getTask(remote.id);
    if (beforePost.list?.id !== scope.externalListId) {
      await quarantineGovernedClickUpStatus({ workspaceId, externalTaskId: remote.id, externalListId: scope.externalListId,
        errorCode: "provider_task_left_selected_list" });
      return prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } });
    }
    if (!beforePost.status?.status?.trim() || beforePost.status.status.trim().toLowerCase() !== remote.status.status.trim().toLowerCase()) {
      await quarantineGovernedClickUpStatus({ workspaceId, externalTaskId: remote.id, externalListId: scope.externalListId,
        errorCode: "provider_status_changed_before_comment" });
      return prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } });
    }
  } catch {
    await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: "posting" }, data: { state: "uncertain", errorCode: "pre_comment_readback_unavailable" } });
    return prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } });
  }
  try {
    const comment = await client.createTaskComment(remote.id, { commentText, notifyAll: false });
    if (!comment?.id) throw new IntegrationError("clickup_comment_result_uncertain", 502, "ClickUp did not return a comment identifier.");
    await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: "posting" }, data: { commentId: comment.id, state: "awaiting_provider" } });
    const comments = await client.getTaskComments(remote.id);
    if (!comments.some(item => item.id === comment.id && JSON.stringify(item.comment ?? item.comment_text ?? "").includes(marker(intent.id)))) {
      await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: "awaiting_provider" }, data: { state: "uncertain", errorCode: "comment_readback_unconfirmed" } });
    }
    const afterPost = await client.getTask(remote.id);
    if (afterPost.list?.id !== scope.externalListId) await quarantineGovernedClickUpStatus({ workspaceId,
      externalTaskId: remote.id, externalListId: scope.externalListId, errorCode: "provider_task_left_selected_list" });
  } catch (error) {
    await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: { in: ["posting", "awaiting_provider"] } }, data: { state: "uncertain", errorCode: error instanceof IntegrationError ? error.code : "comment_post_uncertain" } });
  }
  return prisma.clickUpStatusIntent.findUniqueOrThrow({ where: { id: intent.id } });
}

export async function acknowledgeGovernedClickUpIntent(input: { workspaceId: string; taskId: string; intentId: string; actorUserId?: string }) {
  return prisma.$transaction(async tx => {
    const updated = await tx.clickUpStatusIntent.updateMany({ where: { id: input.intentId, workspaceId: input.workspaceId,
      taskId: input.taskId, state: { in: ["conflict", "uncertain"] } }, data: { state: "closed" } });
    if (!updated.count) throw new IntegrationError("clickup_status_intent_not_resolvable", 409, "Only a conflict or uncertain request can be closed.");
    const intent = await tx.clickUpStatusIntent.findUniqueOrThrow({ where: { id: input.intentId } });
    await tx.event.create({ data: { workspaceId: input.workspaceId, taskId: input.taskId, source: "clickup", type: "clickup_status_intent_closed",
      actorType: input.actorUserId ? "user" : "system", actorId: input.actorUserId ?? null, payload: { intentId: intent.id } } });
    return intent;
  });
}

export async function recoverStaleClickUpStatusIntents(workspaceId: string) {
  const settings = await getClickUpSettingsForWorkspace(workspaceId);
  if (!settings?.config.governedStatusListId) return { inspected: 0, recovered: 0, uncertain: 0 };
  const stale = await prisma.clickUpStatusIntent.findMany({ where: { workspaceId, externalListId: settings.config.governedStatusListId,
    state: "posting", createdAt: { lt: new Date(Date.now() - 2 * 60_000) } }, orderBy: { createdAt: "asc" }, take: 25 });
  let recovered = 0, uncertain = 0;
  const client = new ClickUpClient(settings.token);
  for (const intent of stale) {
    try {
      const comments = await client.getTaskComments(intent.externalTaskId);
      const found = comments.find(comment => JSON.stringify(comment.comment ?? comment.comment_text ?? "").includes(marker(intent.id)));
      const updated = await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: "posting" }, data: found
        ? { state: "awaiting_provider", commentId: found.id }
        : { state: "uncertain", errorCode: "comment_not_found_after_crash" } });
      if (updated.count) { if (found) recovered += 1; else uncertain += 1; }
    } catch {
      const updated = await prisma.clickUpStatusIntent.updateMany({ where: { id: intent.id, state: "posting" }, data: { state: "uncertain", errorCode: "comment_readback_unavailable_after_crash" } });
      uncertain += updated.count;
    }
  }
  return { inspected: stale.length, recovered, uncertain };
}

export async function quarantineGovernedClickUpStatus(input: { workspaceId: string; externalTaskId: string; externalListId: string;
  errorCode: string; providerStatus?: TaskStatus; providerStatusName?: string | null }) {
  const task = await prisma.task.findFirst({ where: { workspaceId: input.workspaceId, source: "clickup", externalId: input.externalTaskId } });
  if (!task) return;
  await prisma.$transaction(async tx => {
    await tx.clickUpStatusState.upsert({ where: { taskId: task.id }, update: {
      providerErrorCode: input.errorCode, signedInboxId: null, actorProviderUserId: null, providerUpdatedAt: null,
      ...(input.providerStatus ? { providerStatus: input.providerStatus, providerStatusName: input.providerStatusName ?? null } : {})
    }, create: { taskId: task.id, workspaceId: input.workspaceId, externalListId: input.externalListId,
      providerStatus: input.providerStatus ?? task.status, providerStatusName: input.providerStatusName ?? null,
      providerErrorCode: input.errorCode } });
    await tx.clickUpStatusIntent.updateMany({ where: { taskId: task.id, state: { in: ["posting", "awaiting_provider", "uncertain"] } },
      data: { state: "conflict", errorCode: input.errorCode } });
    await tx.event.create({ data: { workspaceId: input.workspaceId, taskId: task.id, source: "clickup", type: "clickup_status_quarantined",
      payload: { externalListId: input.externalListId, errorCode: input.errorCode } } });
  });
}

function providerActorId(value: unknown) {
  if (!value || typeof value !== "object" || !("id" in value)) return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}

export async function reconcileGovernedClickUpStatus(input: { workspaceId: string; externalListId: string; taskId: string;
  task: ClickUpTask; inboxId: string; actor: unknown; changedAt: string | null;
  statusEvent: boolean; expectedStatusName: string | null; tx: Prisma.TransactionClient }) {
  const status = mapStatus(input.task);
  if (!input.task.archived && !input.task.status?.status) throw new IntegrationError("sync_failed", 502, "ClickUp status readback is incomplete.");
  const actorId = providerActorId(input.actor);
  const changedAt = input.changedAt && Number.isFinite(Number(input.changedAt)) ? new Date(Number(input.changedAt)) : null;
  const tx = input.tx;
    const current = await tx.task.findFirst({ where: { id: input.taskId, workspaceId: input.workspaceId } });
    if (!current) throw new IntegrationError("clickup_task_not_found", 404, "Canonical task is missing.");
    const latest = await tx.clickUpStatusIntent.findFirst({ where: { taskId: current.id, state: { in: openStates } }, orderBy: { createdAt: "desc" } });
    const actualStatusName = input.task.status?.status?.trim() ?? null;
    if (input.statusEvent && (!input.expectedStatusName || input.expectedStatusName.toLowerCase() !== actualStatusName?.toLowerCase())) {
      await tx.clickUpStatusState.upsert({ where: { taskId: current.id }, update: {
        externalListId: input.externalListId, providerStatus: status, providerStatusName: actualStatusName,
        providerUpdatedAt: null, providerErrorCode: "signed_event_readback_diverged", signedInboxId: null,
        actorProviderUserId: null, actorVerification: "unverified"
      }, create: { taskId: current.id, workspaceId: input.workspaceId, externalListId: input.externalListId,
        providerStatus: status, providerStatusName: actualStatusName, providerErrorCode: "signed_event_readback_diverged" } });
      await tx.clickUpStatusIntent.updateMany({ where: { taskId: current.id, state: { in: openStates } },
        data: { state: "conflict", errorCode: "signed_event_readback_diverged" } });
      await tx.event.create({ data: { workspaceId: input.workspaceId, taskId: current.id, source: "clickup",
        type: "clickup_status_readback_diverged", payload: { inboxId: input.inboxId,
          expectedStatusName: input.expectedStatusName, providerStatusName: actualStatusName } } });
      return;
    }
    await tx.clickUpStatusState.upsert({ where: { taskId: current.id }, update: {
      externalListId: input.externalListId, providerStatus: status, providerStatusName: actualStatusName,
      providerUpdatedAt: changedAt, providerErrorCode: null, signedInboxId: input.inboxId, actorProviderUserId: actorId, actorVerification: "unverified"
    }, create: { taskId: current.id, workspaceId: input.workspaceId, externalListId: input.externalListId,
      providerStatus: status, providerStatusName: actualStatusName, providerUpdatedAt: changedAt,
      signedInboxId: input.inboxId, actorProviderUserId: actorId, actorVerification: "unverified" } });
    await tx.task.update({ where: { id: current.id }, data: { status } });
    if (latest && latest.state !== "conflict") await tx.clickUpStatusIntent.update({ where: { id: latest.id }, data: {
      state: status === latest.requestedStatus ? "confirmed" : status === latest.baseStatus ? latest.state : "conflict",
      signedInboxId: input.inboxId, ...(status !== latest.baseStatus && status !== latest.requestedStatus ? { errorCode: "provider_chose_other_status" } : {})
    } });
    await tx.event.create({ data: { workspaceId: input.workspaceId, taskId: current.id, source: "clickup", type: "clickup_status_reconciled",
      actorType: "integration", actorId: null, payload: { inboxId: input.inboxId, providerStatus: status,
        providerStatusName: input.task.status?.status ?? null, providerActorUserId: actorId,
        actorVerification: "unverified", intentId: latest?.id ?? null } } });
}
