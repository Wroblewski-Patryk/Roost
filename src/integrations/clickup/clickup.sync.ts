import { randomUUID } from "crypto";
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

export async function syncClickUpTasksForWorkspace(workspaceId: string): Promise<SyncResult> {
  return syncClickUpTasksForWorkspaceWithOptions(workspaceId);
}

export async function syncClickUpTasksForWorkspaceWithOptions(
  workspaceId: string,
  options: ClickUpSyncOptions = {}
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
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;
    let wouldCreateCount = 0;
    let wouldUpdateCount = 0;

    if (importMode === "replace_selected_lists") {
      const selectedTaskLists = await prisma.taskList.findMany({
        where: {
          workspaceId,
          source: "clickup",
          externalId: { in: listIds }
        },
        select: { id: true }
      });

      if (selectedTaskLists.length > 0) {
        const deleteResult = await prisma.task.deleteMany({
          where: {
            workspaceId,
            source: "clickup",
            taskListId: {
              in: selectedTaskLists.map((taskList) => taskList.id)
            }
          }
        });
        deletedCount = deleteResult.count;
      }
    }

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
