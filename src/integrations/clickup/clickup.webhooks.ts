import { createHash } from "crypto";
import { withIntegrationLock } from "../sync-lock";
import type { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { createEvent } from "../../modules/events/event.service";
import { decryptSecret, encryptSecret } from "../secrets";
import { getClickUpSettingsForWorkspace } from "../integration-settings.service";
import { IntegrationError } from "../errors";
import { ClickUpClient, type ClickUpTask } from "./clickup.client";
import { mapStatus, mapClickUpTaskToCompanyCoreTask, safeClickUpTaskPayload } from "./clickup.mapper";
import { clickUpImportModes, findOrCreateClickUpTaskList, syncClickUpTasksForWorkspaceWithOptions, type ClickUpImportMode } from "./clickup.sync";
import { verifyClickUpWebhookSignature } from "./webhook-signature";

export const clickUpWebhookEvents = [
  "taskCreated",
  "taskUpdated",
  "taskDeleted",
  "taskPriorityUpdated",
  "taskStatusUpdated",
  "taskDueDateUpdated",
  "taskMoved",
  "taskCommentPosted",
  "taskCommentUpdated"
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
    comment?: {
      id?: string | number | null;
      date?: string | number | null;
      parent?: string | null;
      comment?: Array<{ text?: string | null }> | string | null;
      user?: unknown;
    } | null;
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

function safeProviderEvent(event: {
  id: string;
  provider: string;
  externalWebhookId: string;
  eventName: string;
  externalTaskId: string | null;
  processingStatus: string;
  retryCount: number;
  lastErrorCode: string | null;
  signatureVerified: boolean;
  receivedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: event.id,
    provider: event.provider,
    externalWebhookId: event.externalWebhookId,
    eventName: event.eventName,
    externalTaskId: event.externalTaskId,
    processingStatus: event.processingStatus,
    retryCount: event.retryCount,
    lastErrorCode: event.lastErrorCode,
    signatureVerified: event.signatureVerified,
    receivedAt: event.receivedAt,
    processedAt: event.processedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export async function listClickUpProviderEvents(input: {
  workspaceId: string;
  status?: "pending" | "processed" | "failed";
  limit?: number;
}) {
  const events = await prisma.providerEventInbox.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: "clickup",
      ...(input.status ? { processingStatus: input.status } : {})
    },
    orderBy: { receivedAt: "desc" },
    take: Math.min(input.limit ?? 50, 100)
  });
  return events.map(safeProviderEvent);
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
      let localSecretValid = false;
      try { localSecretValid = Boolean(decryptSecret(existing.secretCiphertext)); } catch { /* Reconcile from provider. */ }
      if (!remoteWebhook || (!localSecretValid && !remoteWebhook.secret)) {
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
        if (remoteWebhook) await client.deleteWebhook(remoteWebhook.id);
        continue;
      }

      let nextStatus = remoteWebhook.health?.status ?? existing.status;
      const configurationChanged = remoteWebhook.endpoint !== endpointUrl ||
        clickUpWebhookEvents.some(event => !remoteWebhook.events?.includes(event));
      if (nextStatus !== "active" || configurationChanged) {
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
          ...(remoteWebhook.secret ? { secretCiphertext: encryptSecret(remoteWebhook.secret) } : {}),
          events: toJson([...clickUpWebhookEvents]),
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
    return `${payload.webhook_id}:${payload.event ?? "unknown"}:${historyId}`;
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

function commentTextFromSegments(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((segment) => {
      if (segment && typeof segment === "object" && "text" in segment) {
        const text = (segment as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("")
    .trim();
}

function clickUpCommentFromWebhook(payload: ClickUpWebhookPayload) {
  const item = payload.history_items?.find((historyItem) => (
    historyItem.field === "comment" && historyItem.comment?.id
  ));
  if (!item?.comment?.id) {
    return null;
  }

  return {
    id: String(item.comment.id),
    content: commentTextFromSegments(item.comment.comment) || "ClickUp comment",
    occurredAt: item.comment.date ? new Date(Number(item.comment.date)) : null,
    actor: item.comment.user ?? item.user ?? null
  };
}

export async function upsertClickUpCommentNote(input: {
  workspaceId: string;
  taskId: string;
  externalCommentId: string;
  content: string;
}, db: Prisma.TransactionClient = prisma) {
  return db.note.upsert({
    where: {
      workspaceId_source_externalId: {
        workspaceId: input.workspaceId,
        source: "clickup",
        externalId: input.externalCommentId
      }
    },
    update: {
      taskId: input.taskId,
      content: input.content
    },
    create: {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      content: input.content,
      externalId: input.externalCommentId,
      source: "clickup"
    }
  });
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

  // Acknowledge the durable inbox before provider reads or a maintenance lock.
  // Failed/pending entries survive a restart and are retried by maintenance.
  void processClickUpProviderEvent(inbox.id).catch(() => console.error("clickup_webhook_processing_deferred"));
  return { status: "accepted", inboxId: inbox.id };
}

export async function processClickUpProviderEvent(inboxId: string) {
  const event = await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } });
  return withIntegrationLock(`clickup:${event.workspaceId}`, () => processClickUpProviderEventLocked(inboxId));
}

async function processClickUpProviderEventLocked(inboxId: string) {
  const inbox = await prisma.providerEventInbox.findUniqueOrThrow({
    where: { id: inboxId },
    include: { webhookRegistration: true }
  });
  const payload = inbox.payload as ClickUpWebhookPayload;

  if (inbox.processingStatus === "processed") {
    return { status: "already_processed", inboxId: inbox.id };
  }

  try {
    let fetchedTask: ClickUpTask | null = null;
    let mappedList: Awaited<ReturnType<typeof findOrCreateClickUpTaskList>> = null;
    if (payload.event !== "taskDeleted" && payload.task_id) {
      const settings = await getClickUpSettingsForWorkspace(inbox.workspaceId);
      if (!settings) throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured.");
      fetchedTask = await new ClickUpClient(settings.token).getTask(payload.task_id);
      mappedList = await findOrCreateClickUpTaskList(inbox.workspaceId, fetchedTask.list?.id);
    }
    return await prisma.$transaction(async tx => {
      let taskId: string | null = null;
      let externalId = payload.task_id ?? null;

      const webhookComment = clickUpCommentFromWebhook(payload);

      if (payload.event === "taskDeleted" && externalId) {
        const where = { workspaceId: inbox.workspaceId, source: "clickup", externalId };
        await tx.task.updateMany({ where, data: { status: "archived" } });
        taskId = (await tx.task.findFirst({ where, select: { id: true } }))?.id ?? null;
      } else if (externalId) {
        const clickUpTask = fetchedTask!;
        const data = mapClickUpTaskToCompanyCoreTask(clickUpTask, inbox.workspaceId);
        const taskList = mappedList;
        if (taskList) {
          data.taskListId = taskList.id;
        }
        const task = await tx.task.upsert({
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

        if (webhookComment) {
          const note = await upsertClickUpCommentNote({
            workspaceId: inbox.workspaceId,
            taskId: task.id,
            externalCommentId: webhookComment.id,
            content: webhookComment.content
          }, tx);

          await tx.agentEventOutbox.create({
            data: {
              workspaceId: inbox.workspaceId,
              eventType: "task_comment_posted_from_clickup",
              targetAgent: null,
              scope: toJson({
                taskId: task.id,
                externalId,
                noteId: note.id,
                externalCommentId: webhookComment.id,
                webhookRegistrationId: inbox.webhookRegistrationId
              }),
              payload: toJson({
                provider: "clickup",
                taskId: task.id,
                externalId,
                noteId: note.id,
                externalCommentId: webhookComment.id,
                content: webhookComment.content,
                actor: webhookComment.actor
              })
            }
          });
        }
      }

      const event = await tx.event.create({ data: {
        type: `clickup_${payload.event}`,
        workspaceId: inbox.workspaceId,
        taskId,
        source: "clickup",
        payload: {
          provider: "clickup",
          inboxId: inbox.id,
          externalId,
          eventName: payload.event, historyItemCount: payload.history_items?.length ?? 0
        } as Prisma.InputJsonValue
      } });

      if (payload.event === "taskStatusUpdated" && taskId && externalId) {
        const change = statusChange(payload);
        await tx.agentEventOutbox.create({
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

      await tx.providerEventInbox.update({
        where: { id: inbox.id },
        data: {
          processingStatus: "processed",
          processedAt: new Date(),
          lastErrorCode: null
        }
      });
      return { status: "processed", inboxId: inbox.id };
    });
  } catch (error) {
    const errorCode = error instanceof IntegrationError ? error.code : "sync_failed";
    await prisma.providerEventInbox.update({
      where: { id: inbox.id },
      data: {
        processingStatus: "failed",
        retryCount: { increment: 1 },
        lastErrorCode: errorCode
      }
    });
    throw error;
  }
}

export async function retryFailedClickUpProviderEvents(input: {
  workspaceId: string;
  eventIds?: string[];
  limit?: number;
}) {
  const events = await prisma.providerEventInbox.findMany({
    where: {
      workspaceId: input.workspaceId,
      provider: "clickup",
      processingStatus: { in: ["failed", "pending"] },
      ...(input.eventIds && input.eventIds.length > 0 ? { id: { in: input.eventIds } } : {})
    },
    orderBy: { receivedAt: "asc" },
    take: Math.min(input.limit ?? 25, 100)
  });

  let processedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const event of events) {
    try {
      const result = await processClickUpProviderEvent(event.id);
      processedCount += result.status === "processed" || result.status === "already_processed" ? 1 : 0;
      results.push({ id: event.id, status: result.status });
    } catch {
      failedCount += 1;
      results.push({ id: event.id, status: "failed" });
    }
  }

  await createEvent({
    type: "clickup_provider_events_retried",
    workspaceId: input.workspaceId,
    source: "clickup",
    payload: {
      provider: "clickup",
      attemptedCount: events.length,
      processedCount,
      failedCount
    }
  });

  return {
    provider: "clickup",
    workspaceId: input.workspaceId,
    attemptedCount: events.length,
    processedCount,
    failedCount,
    results
  };
}

export async function runClickUpMaintenanceForWorkspace(input: {
  workspaceId: string;
  req?: { protocol?: string; get(name: string): string | undefined };
  importMode?: Extract<ClickUpImportMode, "merge" | "skip_existing" | "inspect_only">;
}) {
  const importMode = input.importMode ?? "merge";
  if (!clickUpImportModes.includes(importMode)) {
    throw new IntegrationError("sync_failed", 500, "Unsupported ClickUp maintenance import mode.");
  }

  const [failedBefore, pendingBefore] = await Promise.all([
    prisma.providerEventInbox.count({
      where: {
        workspaceId: input.workspaceId,
        provider: "clickup",
        processingStatus: "failed"
      }
    }),
    prisma.providerEventInbox.count({
      where: {
        workspaceId: input.workspaceId,
        provider: "clickup",
        processingStatus: "pending"
      }
    })
  ]);

  let webhookReconcile;
  try { webhookReconcile = await reconcileClickUpWebhooksForWorkspace(input.workspaceId, input.req); }
  catch (error) {
    webhookReconcile = { errorCode: error instanceof IntegrationError ? error.code : "sync_failed" };
  }
  const retry = await retryFailedClickUpProviderEvents({
    workspaceId: input.workspaceId,
    limit: 100
  });
  const sync = await syncClickUpTasksForWorkspaceWithOptions(input.workspaceId, { importMode });

  const [failedAfter, pendingAfter] = await Promise.all([
    prisma.providerEventInbox.count({
      where: {
        workspaceId: input.workspaceId,
        provider: "clickup",
        processingStatus: "failed"
      }
    }),
    prisma.providerEventInbox.count({
      where: {
        workspaceId: input.workspaceId,
        provider: "clickup",
        processingStatus: "pending"
      }
    })
  ]);

  const result = {
    provider: "clickup",
    workspaceId: input.workspaceId,
    importMode,
    webhookReconcile,
    retry,
    sync,
    inboxHealth: {
      failedBefore,
      failedAfter,
      pendingBefore,
      pendingAfter
    }
  };

  await createEvent({
    type: "clickup_maintenance_completed",
    workspaceId: input.workspaceId,
    source: "clickup",
    payload: toJson({
      provider: "clickup",
      importMode,
      webhookCreatedCount: webhookReconcile.createdCount,
      webhookReactivatedCount: webhookReconcile.reactivatedCount,
      webhookReplacedCount: webhookReconcile.replacedCount,
      retryAttemptedCount: retry.attemptedCount,
      retryProcessedCount: retry.processedCount,
      syncItemCount: sync.itemCount,
      syncCreatedCount: sync.createdCount,
      syncUpdatedCount: sync.updatedCount,
      failedAfter,
      pendingAfter
    })
  });

  return result;
}

export async function createCompanyCoreNoteInClickUp(input: {
  workspaceId: string;
  externalTaskId: string;
  content: string;
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const client = new ClickUpClient(settings.token);
  const comment = await client.createTaskComment(input.externalTaskId, {
    commentText: input.content,
    notifyAll: false
  });
  if (!comment?.id) {
    throw new IntegrationError("integration_unavailable", 502, "ClickUp did not return the created comment identifier.");
  }
  return comment;
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
    archived?: boolean;
  } = {};
  if (input.title !== undefined) payload.name = input.title;
  if (input.description !== undefined) payload.description = input.description || " ";
  if (input.status !== undefined) {
    payload.archived = input.status === "archived";
    if (input.status !== "archived") payload.status = clickUpStatus(input.status);
  }
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
  if (input.task.status && input.task.status !== "archived") {
    payload.status = await resolveClickUpStatus(client, input.listExternalId, input.task.status);
  }
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
    description?: string | null;
    status?: TaskStatus;
    priority?: string | null;
    dueDate?: Date | null;
    taskListId?: string | null;
  };
}) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) {
    throw new IntegrationError("integration_not_configured", 422, "ClickUp integration is not configured for this workspace.");
  }

  const payload = clickUpTaskPayload(input.changes);

  if (Object.keys(payload).length === 0 && input.changes.taskListId === undefined) {
    return null;
  }

  const client = new ClickUpClient(settings.token);
  const remote = (input.changes.status !== undefined && input.changes.status !== "archived") || input.changes.taskListId !== undefined
    ? await client.getTask(input.externalId) : null;
  let listId = remote?.list?.id;
  let destination: { externalId: string | null } | null = null;
  if (input.changes.taskListId !== undefined) {
    destination = input.changes.taskListId ? await prisma.taskList.findFirst({ where: {
      id: input.changes.taskListId, workspaceId: input.workspaceId, source: "clickup"
    } }) : null;
    if (!destination?.externalId || !settings.config.teamId) throw new IntegrationError("sync_failed", 422, "A ClickUp-backed task must remain in a mapped ClickUp List.");
    listId = destination.externalId;
  }
  if (input.changes.status && input.changes.status !== "archived") {
    if (!listId) throw new IntegrationError("sync_failed", 422, "ClickUp task has no List for status mapping.");
    payload.status = remote && !destination && mapStatus({ ...remote, archived: false }) === input.changes.status
      ? remote.status?.status ?? undefined
      : await resolveClickUpStatus(client, listId, input.changes.status);
  }
  if (destination?.externalId && destination.externalId !== remote?.list?.id) {
    const destinationList = await client.getList(destination.externalId);
    const currentStatus = input.changes.status && input.changes.status !== "archived" ? input.changes.status : mapStatus({ ...remote!, archived: false });
    const destinationStatusName = payload.status ?? await resolveClickUpStatus(client, destination.externalId, currentStatus);
    const destinationStatus = destinationList.statuses.find(status => status.status === destinationStatusName);
    const mappings = remote?.status?.id && destinationStatus?.id ? [{ source_status_id: remote.status.id, destination_status_id: destinationStatus.id }] : undefined;
    await client.moveTask(settings.config.teamId!, input.externalId, destination.externalId, mappings);
  }
  return Object.keys(payload).length ? client.updateTask(input.externalId, payload) : client.getTask(input.externalId);
}

async function resolveClickUpStatus(client: ClickUpClient, listId: string, status: TaskStatus) {
  const list = await client.getList(listId);
  const candidates = (list.statuses ?? []).filter(candidate => mapStatus({ id: "", name: "", status: candidate }) === status);
  const exact = candidates.find(candidate => candidate.status.toLowerCase() === clickUpStatus(status));
  if (exact) return exact.status;
  if (candidates.length === 1) return candidates[0].status;
  throw new IntegrationError("sync_failed", 422, "ClickUp List status mapping is missing or ambiguous.");
}

export async function writeBackCompanyCoreNoteToClickUp(input: { workspaceId: string; externalId: string; content?: string; archived?: boolean }) {
  const settings = await getClickUpSettingsForWorkspace(input.workspaceId);
  if (!settings) throw new IntegrationError("integration_not_configured", 422, "ClickUp is not configured.");
  const client = new ClickUpClient(settings.token);
  if (input.archived) {
    try { await client.deleteComment(input.externalId); }
    catch (error) { if (!(error instanceof IntegrationError) || error.code !== "not_found") throw error; }
  } else if (input.content !== undefined) await client.updateComment(input.externalId, input.content);
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
