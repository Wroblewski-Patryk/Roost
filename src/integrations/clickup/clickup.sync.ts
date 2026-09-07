import { randomUUID } from "crypto";
import { withIntegrationLock } from "../sync-lock";
import { prisma } from "../../db/prisma";
import { createEvent } from "../../modules/events/event.service";
import { IntegrationError } from "../errors";
import { getClickUpSettingsForWorkspace } from "../integration-settings.service";
import { ClickUpClient } from "./clickup.client";
import { mapClickUpTaskToCompanyCoreTask, safeClickUpTaskPayload } from "./clickup.mapper";
import { findClickUpListTable } from "../../operating-model/clickup-structure";

type SyncResult = {
  provider: "clickup";
  workspaceId: string;
  importMode: ClickUpImportMode;
  itemCount: number;
  unavailableCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  deletedCount: number;
  wouldCreateCount: number;
  wouldUpdateCount: number;
};

export const clickUpImportModes = [
  "merge",
  "skip_existing",
  "replace_selected_lists",
  "inspect_only"
] as const;

export type ClickUpImportMode = typeof clickUpImportModes[number];

export type ClickUpSyncOptions = {
  importMode?: ClickUpImportMode;
};

export async function findOrCreateClickUpTaskList(workspaceId: string, listId?: string | null) {
  if (!listId) {
    return null;
  }

  const existing = await prisma.taskList.findFirst({
    where: {
      workspaceId,
      source: "clickup",
      externalId: listId
    }
  });

  if (existing) {
    return existing;
  }

  const mappedTable = await findClickUpListTable(workspaceId, listId);
  return prisma.taskList.create({
    data: {
      workspaceId,
      name: mappedTable?.name ?? `ClickUp List ${listId}`,
      description: mappedTable
        ? "Created from ClickUp structural mapping."
        : "Created from ClickUp task list reference.",
      externalId: listId,
      source: "clickup"
    }
  });
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function hasClickUpTaskDataChanges(
  existing: {
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    dueDate: Date | null;
    taskListId: string | null;
  },
  next: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string | null;
    dueDate?: Date | string | null;
    taskListId?: string | null;
  }
) {
  return (
    (next.title !== undefined && existing.title !== next.title) ||
    (next.description !== undefined && existing.description !== next.description) ||
    (next.status !== undefined && existing.status !== next.status) ||
    (next.priority !== undefined && existing.priority !== next.priority) ||
    (next.taskListId !== undefined && existing.taskListId !== next.taskListId) ||
    (next.dueDate !== undefined &&
      normalizeDateValue(existing.dueDate) !== normalizeDateValue(next.dueDate))
  );
}

export async function syncClickUpTasksForWorkspace(workspaceId: string): Promise<SyncResult> {
  return syncClickUpTasksForWorkspaceWithOptions(workspaceId);
}

export async function syncClickUpTasksForWorkspaceWithOptions(
  workspaceId: string,
  options: ClickUpSyncOptions = {}
): Promise<SyncResult> {
  return withIntegrationLock(`clickup:${workspaceId}`, () => syncClickUpTasks(workspaceId, options));
}

async function syncClickUpTasks(
  workspaceId: string,
  options: ClickUpSyncOptions
): Promise<SyncResult> {
  const correlationId = randomUUID();
  const settings = await getClickUpSettingsForWorkspace(workspaceId);

  if (!settings) {
    throw new IntegrationError(
      "integration_not_configured",
      422,
      "ClickUp integration is not configured for this workspace."
    );
  }

  const listIds = settings.config.listIds ?? [];
  const teamId = settings.config.teamId;
  const importMode = options.importMode ?? settings.config.importMode ?? "merge";

  if (!teamId || listIds.length === 0) {
    throw new IntegrationError(
      "integration_not_configured",
      422,
      "ClickUp teamId and at least one listId are required before sync."
    );
  }

  await createEvent({
    type: "sync_started",
    workspaceId,
    source: "clickup",
    payload: {
      provider: "clickup",
      workspaceId,
      correlationId,
      operation: "sync_tasks",
      importMode,
      listCount: listIds.length
    }
  });

  try {
    const client = new ClickUpClient(settings.token);
    const clickUpTasks = await client.getWorkspaceTasks({ teamId, listIds });
    let unavailableCount = 0;
    // A missing list result is not proof of deletion. Read known tasks directly,
    // including archived tasks and tasks moved to a different List.
    if (importMode === "merge" || importMode === "replace_selected_lists") {
      const returnedIds = new Set(clickUpTasks.map(task => task.id));
      const known = await prisma.task.findMany({
        where: { workspaceId, source: "clickup", externalId: { not: null },
          taskList: { source: "clickup", externalId: { in: listIds } } },
        select: { externalId: true }
      });
      for (const task of known) {
        if (!task.externalId || returnedIds.has(task.externalId)) continue;
        try { clickUpTasks.push(await client.getTask(task.externalId)); }
        catch (error) {
          // The workspace request already authenticated. ClickUp also returns
          // 401/403 for individual tasks whose access has been withdrawn.
          if (!(error instanceof IntegrationError) || !["not_found", "integration_invalid_token"].includes(error.code)) throw error;
          unavailableCount += 1;
          await createEvent({ workspaceId, source: "clickup", type: "clickup_task_access_unavailable",
            payload: { externalId: task.externalId, action: "preserved", correlationId } });
        }
      }
    }
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;
    let wouldCreateCount = 0;
    let wouldUpdateCount = 0;

    for (const clickUpTask of clickUpTasks) {
      if (!clickUpTask.id || !clickUpTask.name) {
        skippedCount += 1;
        continue;
      }

      const existing = await prisma.task.findUnique({
        where: {
          workspaceId_source_externalId: {
            workspaceId,
            source: "clickup",
            externalId: clickUpTask.id
          }
        }
      });

      if (importMode === "inspect_only") {
        if (existing) {
          wouldUpdateCount += 1;
        } else {
          wouldCreateCount += 1;
        }
        skippedCount += 1;
        continue;
      }

      if (existing && importMode === "skip_existing") {
        skippedCount += 1;
        continue;
      }

      const data = mapClickUpTaskToCompanyCoreTask(clickUpTask, workspaceId);
      const taskList = await findOrCreateClickUpTaskList(workspaceId, clickUpTask.list?.id);
      if (taskList) {
        data.taskListId = taskList.id;
      }

      const shouldWrite = !existing || hasClickUpTaskDataChanges(existing, data);
      if (existing && !shouldWrite) {
        skippedCount += 1;
        continue;
      }

      const task = await prisma.task.upsert({
        where: {
          workspaceId_source_externalId: {
            workspaceId,
            source: "clickup",
            externalId: clickUpTask.id
          }
        },
        update: data,
        create: data
      });

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      await createEvent({
        type: "task_synced_from_clickup",
        workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        source: "clickup",
        payload: {
          provider: "clickup",
          workspaceId,
          correlationId,
          taskId: task.id,
          externalId: clickUpTask.id,
          raw: safeClickUpTaskPayload(clickUpTask)
        }
      });
    }

    await createEvent({
      type: "sync_succeeded",
      workspaceId,
      source: "clickup",
      payload: {
        provider: "clickup",
        workspaceId,
        correlationId,
        operation: "sync_tasks",
        importMode,
        itemCount: clickUpTasks.length,
        unavailableCount,
        createdCount,
        updatedCount,
        skippedCount,
        deletedCount,
        wouldCreateCount,
        wouldUpdateCount
      }
    });

    return {
      provider: "clickup",
      workspaceId,
      importMode,
      itemCount: clickUpTasks.length,
      unavailableCount,
      createdCount,
      updatedCount,
      skippedCount,
      deletedCount,
      wouldCreateCount,
      wouldUpdateCount
    };
  } catch (error) {
    const code = error instanceof IntegrationError ? error.code : "sync_failed";

    await createEvent({
      type: "sync_failed",
      workspaceId,
      source: "clickup",
      payload: {
        provider: "clickup",
        workspaceId,
        correlationId,
        operation: "sync_tasks",
        importMode,
        errorCode: code
      }
    });

    throw error;
  }
}
