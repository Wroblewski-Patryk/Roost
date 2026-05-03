import { createHash } from "crypto";
import type { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { createEvent } from "../../modules/events/event.service";
import { decryptSecret, encryptSecret } from "../secrets";
import { getClickUpSettingsForWorkspace } from "../integration-settings.service";
import { IntegrationError } from "../errors";
import { ClickUpClient, type ClickUpTask } from "./clickup.client";
import { mapClickUpTaskToCompanyCoreTask, safeClickUpTaskPayload } from "./clickup.mapper";
import { findOrCreateClickUpTaskList } from "./clickup.sync";
import { verifyClickUpWebhookSignature } from "./webhook-signature";

export const clickUpWebhookEvents = [
  "taskCreated",
  "taskUpdated",
  "taskDeleted",
  "taskPriorityUpdated",
  "taskStatusUpdated",
  "taskDueDateUpdated",
  "taskMoved"
] as const;

type ClickUpWebhookPayload = {
  webhook_id?: string;
  event?: string;
  task_id?: string;
  history_items?: Array<{
    id?: string;
    field?: string;
    date?: string;
    parent_id?: string;
    before?: unknown;
    after?: unknown;
    user?: unknown;
  }>;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function webhookEndpointUrl(req?: { protocol?: string; get(name: string): string | undefined }) {
  const configuredBase = env.publicApiBaseUrl?.replace(/\/$/, "");
  if (configuredBase) {
    return `${configuredBase}/v1/webhooks/clickup`;
  }

  const proto = req?.get("x-forwarded-proto") ?? req?.protocol ?? "https";
  const host = req?.get("x-forwarded-host") ?? req?.get("host");
  if (!host) {
    throw new IntegrationError("integration_unavailable", 502, "Cannot resolve public webhook endpoint URL.");
  }
  return `${proto}://${host}/v1/webhooks/clickup`;
}

function safeRegistration(registration: {
  id: string;
  provider: string;
  externalId: string;
  scopeType: string;
  scopeExternalId: string | null;
  endpointUrl: string;
  events: unknown;
  status: string;
  lastHealthAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: registration.id,
    provider: registration.provider,
    externalId: registration.externalId,
    scopeType: registration.scopeType,
    scopeExternalId: registration.scopeExternalId,
    endpointUrl: registration.endpointUrl,
    events: registration.events,
    status: registration.status,
    lastHealthAt: registration.lastHealthAt,
    lastErrorCode: registration.lastErrorCode,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt
  };
}

export async function listClickUpWebhookRegistrations(workspaceId: string) {
  const registrations = await prisma.externalWebhookRegistration.findMany({
    where: { workspaceId, provider: "clickup" },
    orderBy: { createdAt: "desc" }
  });
  return registrations.map(safeRegistration);
}

export async function reconcileClickUpWebhooksForWorkspace(
  workspaceId: string,
  req?: { protocol?: string; get(name: string): string | undefined }
) {
  const settings = await getClickUpSettingsForWorkspace(workspaceId);
  if (!settings) {
    throw new IntegrationError( "integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const teamId = settings.config.teamId;
  const listIds = settings.config.listIds ?? [];
  if (!teamId || listIds.length === 0) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp teamId and listIds are required.");
  }

  const endpointUrl = webhookEndpointUrl(req);
  const client = new ClickUpClient(settings.token);
  const remoteWebhooks = await client.getWebhooks(teamId);
  const remoteById = new Map(remoteWebhooks.map((webhook) => [webhook.id, webhook]));
  const reconciled = [];
  let createdCount = 0;
  let existingCount = 0;
  let refreshedCount = 0;
  let reactivatedCount = 0;
  let replacedCount = 0;
  let staleCount = 0;

  await prisma.externalWebhookRegistration.updateMany({
    where: {
      workspaceId,
      provider: "clickup",
      scopeType: "list",
      scopeExternalId: { notIn: listIds },
      status: { not: "inactive" }
    },
    data: {
      status: "inactive",
      lastHealthAt: new Date(),
      lastErrorCode: "scope_removed"
    }
  });

  staleCount = await prisma.externalWebhookRegistration.count({
    where: {
      workspaceId,
      provider: "clickup",
      scopeType: "list",
      scopeExternalId: { notIn: listIds },
      status: "inactive"
    }
  });

  for (const listId of listIds) {
    const existing = await prisma.externalWebhookRegistration.findFirst({
      where: {
        workspaceId,
        provider: "clickup",
        scopeType: "list",
        scopeExternalId: listId
      }
    });

    if (existing) {
      existingCount += 1;
      const remoteWebhook = remoteById.get(existing.externalId);
      if (!remoteWebhook) {
        const webhook = await client.createWebhook({
          teamId,
          endpoint: endpointUrl,
          events: [...clickUpWebhookEvents],
          listId
        });
        const registration = await prisma.externalWebhookRegistration.update({
          where: { id: existing.id },
          data: {
            externalId: webhook.id,
            endpointUrl,
            secretCiphertext: encryptSecret(webhook.secret!),
            events: toJson(webhook.events ?? [...clickUpWebhookEvents]),
            status: webhook.health?.status ?? "active",
            lastHealthAt: new Date(),
            lastErrorCode: null
          }
        });
        replacedCount += 1;
        reconciled.push(safeRegistration(registration));
        continue;
      }

      let nextStatus = remoteWebhook.health?.status ?? existing.status;
      if (nextStatus !== "active") {
        const updated = await client.updateWebhook(existing.externalId, {
          endpoint: endpointUrl,
          events: [...clickUpWebhookEvents],
          status: "active"
        });
        nextStatus = updated?.health?.status ?? "active";
        reactivatedCount += 1;
      }

      const registration = await prisma.externalWebhookRegistration.update({
        where: { id: existing.id },
        data: {
          endpointUrl,
          events: toJson(remoteWebhook.events ?? [...clickUpWebhookEvents]),
          status: nextStatus,
          lastHealthAt: new Date(),
          lastErrorCode: remoteWebhook.health?.fail_count ? `fail_count:${remoteWebhook.health.fail_count}` : null
        }
      });
      refreshedCount += 1;
      reconciled.push(safeRegistration(registration));
      continue;
    }

    const webhook = await client.createWebhook({
      teamId,
      endpoint: endpointUrl,
      events: [...clickUpWebhookEvents],
      listId
    });

    const registration = await prisma.externalWebhookRegistration.create({
      data: {
        workspaceId,
        provider: "clickup",
        externalId: webhook.id,
        scopeType: "list",
        scopeExternalId: listId,
        endpointUrl,
        secretCiphertext: encryptSecret(webhook.secret!),
        events: toJson(webhook.events ?? [...clickUpWebhookEvents]),
        status: webhook.health?.status ?? "active"
      }
    });
    createdCount += 1;
    reconciled.push(safeRegistration(registration));
  }

  await createEvent({
    type: "clickup_webhooks_reconciled",
    workspaceId,
    source: "clickup",
    payload: {
      provider: "clickup",
      listCount: listIds.length,
      createdCount,
      existingCount,
      refreshedCount,
      reactivatedCount,
      replacedCount,
      staleCount
    }
  });

  return {
    provider: "clickup",
    workspaceId,
    endpointUrl,
    createdCount,
    existingCount,
    refreshedCount,
    reactivatedCount,
    replacedCount,
    staleCount,
    registrations: reconciled
  };
}

export async function deleteClickUpWebhookRegistration(input: {
  workspaceId: string;
  registrationId: string;
}) {
  const registration = await prisma.externalWebhookRegistration.findFirst({
    where: {
      id: input.registrationId,
      workspaceId: input.workspaceId,
      provider: "clickup"
    }
  });
  if (!registration) {
    throw new IntegrationError("not_found", 404, "ClickUp webhook registration was not found.");
  }

  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const client = new ClickUpClient(settings.token);
  await client.deleteWebhook(registration.externalId);
  await prisma.externalWebhookRegistration.delete({ where: { id: registration.id } });

  await createEvent({
    type: "clickup_webhook_deleted",
    workspaceId: input.workspaceId,
    source: "clickup",
    payload: {
      provider: "clickup",
      externalId: registration.externalId,
      scopeType: registration.scopeType,
      scopeExternalId: registration.scopeExternalId
    }
  });

  return safeRegistration(registration);
}

function idempotencyKey(payload: ClickUpWebhookPayload, payloadHash: string) {
  const historyId = payload.history_items?.find((item) => item.id)?.id;
  if (payload.webhook_id && historyId) {
    return `${payload.webhook_id}:${historyId}`;
  }
  return `${payload.webhook_id ?? "unknown"}:${payload.event ?? "unknown"}:${payload.task_id ?? "unknown"}:${payloadHash}`;
}

function statusChange(payload: ClickUpWebhookPayload) {
  const item = payload.history_items?.find((historyItem) => historyItem.field === "status");
  return {
    before: item?.before ?? null,
    after: item?.after ?? null,
    actor: item?.user ?? null,
    changedAt: item?.date ?? null,
    parentExternalId: item?.parent_id ?? null
  };
}

export async function ingestClickUpWebhook(input: {
  rawBody: Buffer;
  signature?: string;
}) {
  const payload = JSON.parse(input.rawBody.toString("utf8")) as ClickUpWebhookPayload;
  if (!payload.webhook_id || !payload.event) {
    throw new IntegrationError("invalid_webhook_payload", 400, "ClickUp webhook payload is missing required identifiers.");
  }

  const registration = await prisma.externalWebhookRegistration.findFirst({
    where: {
      provider: "clickup",
      externalId: payload.webhook_id
    }
  });

  if (!registration) {
    throw new IntegrationError("webhook_not_registered", 404, "ClickUp webhook is not registered.");
  }

  const secret = decryptSecret(registration.secretCiphertext);
  const signatureVerified = verifyClickUpWebhookSignature({
    secret,
    rawBody: input.rawBody,
    signature: input.signature
  });
  if (!signatureVerified) {
    throw new IntegrationError("invalid_webhook_signature", 401, "ClickUp webhook signature did not verify.");
  }

  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  const key = idempotencyKey(payload, payloadHash);
  const inbox = await prisma.providerEventInbox.upsert({
    where: {
      workspaceId_provider_idempotencyKey: {
        workspaceId: registration.workspaceId,
        provider: "clickup",
        idempotencyKey: key
      }
    },
    update: {},
    create: {
      workspaceId: registration.workspaceId,
      provider: "clickup",
      webhookRegistrationId: registration.id,
      externalWebhookId: payload.webhook_id,
      eventName: payload.event,
      externalTaskId: payload.task_id,
      idempotencyKey: key,
      payloadHash,
      payload: toJson(payload),
      signatureVerified: true
    }
  });

  if (inbox.processingStatus !== "pending") {
    return { status: "duplicate", inboxId: inbox.id };
  }

  await processClickUpProviderEvent(inbox.id);
  return { status: "accepted", inboxId: inbox.id };
}

export async function processClickUpProviderEvent(inboxId: string) {
  const inbox = await prisma.providerEventInbox.findUniqueOrThrow({
    where: { id: inboxId },
    include: { webhookRegistration: true }
  });
  const payload = inbox.payload as ClickUpWebhookPayload;

  try {
    let taskId: string | null = null;
    let externalId = payload.task_id ?? null;

    if (payload.event === "taskDeleted" && externalId) {
      const archivedTask = await prisma.task.update({
        where: {
          workspaceId_source_externalId: {
            workspaceId: inbox.workspaceId,
            source: "clickup",
            externalId
          }
        },
        data: { status: "archived" }
      }).catch(() => null);
      taskId = archivedTask?.id ?? null;
    } else if (externalId) {
      const settings = await getClickUpSettingsForWorkspace(inbox.workspaceId);
      if (!settings) {
        throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
      }
      const client = new ClickUpClient(settings.token);
      const clickUpTask = await client.getTask(externalId);
      const data = mapClickUpTaskToCompanyCoreTask(clickUpTask, inbox.workspaceId);
      const taskList = await findOrCreateClickUpTaskList(inbox.workspaceId, clickUpTask.list?.id);
      if (taskList) {
        data.taskListId = taskList.id;
      }
      const task = await prisma.task.upsert({
        where: {
          workspaceId_source_externalId: {
            workspaceId: inbox.workspaceId,
            source: "clickup",
            externalId
          }
        },
        update: data,
        create: data
      });
      taskId = task.id;
    }

    const event = await createEvent({
      type: `clickup_${payload.event}`,
      workspaceId: inbox.workspaceId,
      taskId,
      source: "clickup",
      payload: {
        provider: "clickup",
        inboxId: inbox.id,
        externalId,
        raw: payload
      } as Prisma.InputJsonValue
    });

    if (payload.event === "taskStatusUpdated" && taskId && externalId) {
      const change = statusChange(payload);
      await prisma.agentEventOutbox.create({
        data: {
          workspaceId: inbox.workspaceId,
          eventId: event.id,
          eventType: "task_status_updated_from_clickup",
          targetAgent: null,
          scope: toJson({
            taskId,
            externalId,
            externalListId: change.parentExternalId,
            webhookRegistrationId: inbox.webhookRegistrationId
          }),
          payload: toJson({
            provider: "clickup",
            taskId,
            externalId,
            before: change.before,
            after: change.after,
            actor: change.actor,
            changedAt: change.changedAt
          })
        }
      });
    }

    await prisma.providerEventInbox.update({
      where: { id: inbox.id },
      data: {
        processingStatus: "processed",
        processedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.providerEventInbox.update({
      where: { id: inbox.id },
      data: {
        processingStatus: "failed",
        retryCount: { increment: 1 }
      }
    });
    throw error;
  }
}

function clickUpStatus(status: TaskStatus) {
  if (status === "in_progress") return "in progress";
  if (status === "done") return "complete";
  if (status === "blocked") return "blocked";
  if (status === "todo") return "to do";
  return undefined;
}

function clickUpPriority(priority?: string | null) {
  if (!priority) return undefined;
  const value = priority.toLowerCase();
  if (value === "urgent") return 1;
  if (value === "high") return 2;
  if (value === "normal") return 3;
  if (value === "low") return 4;
  return undefined;
}

function clickUpTaskPayload(input: {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: string | null;
  dueDate?: Date | null;
}) {
  const payload: {
    name?: string;
    description?: string;
    status?: string;
    priority?: number | null;
    due_date?: number | null;
  } = {};
  if (input.title !== undefined) payload.name = input.title;
  if (input.description !== undefined) payload.description = input.description || " ";
  if (input.status !== undefined) payload.status = clickUpStatus(input.status);
  if (input.priority !== undefined) payload.priority = clickUpPriority(input.priority) ?? null;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate ? input.dueDate.getTime() : null;
  return payload;
}

export async function createCompanyCoreTaskInClickUp(input: {
  workspaceId: string;
  listExternalId: string;
  task: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: string | null;
    dueDate?: Date | null;
  };
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const payload = clickUpTaskPayload(input.task);
  if (!payload.name) {
    payload.name = input.task.title;
  }

  const client = new ClickUpClient(settings.token);
  return client.createTask(input.listExternalId, payload as {
    name: string;
    description?: string;
    status?: string;
    priority?: number | null;
    due_date?: number | null;
  });
}

export async function writeBackCompanyCoreTaskToClickUp(input: {
  workspaceId: string;
  externalId: string;
  changes: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: string | null;
    dueDate?: Date | null;
  };
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const payload = clickUpTaskPayload(input.changes);

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const client = new ClickUpClient(settings.token);
  return client.updateTask(input.externalId, payload);
}

export async function archiveCompanyCoreTaskInClickUp(input: {
  workspaceId: string;
  externalId: string;
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const client = new ClickUpClient(settings.token);
  return client.updateTask(input.externalId, { archived: true });
}

export async function setCompanyCoreTaskClickUpCustomField(input: {
  workspaceId: string;
  externalTaskId: string;
  externalFieldId: string;
  value: unknown;
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const field = await prisma.externalFieldMapping.findFirst({
    where: {
      workspaceId: input.workspaceId,
      provider: "clickup",
      externalId: input.externalFieldId
    }
  });
  if (!field) {
    throw new IntegrationError("not_found", 404, "ClickUp custom field is not mapped for this workspace.");
  }

  const client = new ClickUpClient(settings.token);
  return client.setCustomFieldValue(input.externalTaskId, input.externalFieldId, input.value);
}
