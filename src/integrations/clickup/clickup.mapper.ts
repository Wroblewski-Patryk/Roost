import type { Prisma, TaskStatus } from "@prisma/client";
import type { ClickUpTask } from "./clickup.client";

export function mapStatus(task: ClickUpTask): TaskStatus {
  if (task.archived) return "archived";
  const value = `${task.status?.type ?? ""} ${task.status?.status ?? ""}`.toLowerCase();

  if (value.includes("closed") || value.includes("complete") || value.includes("done")) {
    return "done";
  }
  if (value.includes("progress")) {
    return "in_progress";
  }
  if (value.includes("block")) {
    return "blocked";
  }

  if (task.status?.type === "custom") return "in_progress";
  return "todo";
}

function mapDueDate(value?: string | null) {
  if (!value) {
    return value === null ? null : undefined;
  }

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp);
}

export function mapClickUpTaskToCompanyCoreTask(
  task: ClickUpTask,
  workspaceId: string
): Prisma.TaskUncheckedCreateInput {
  return {
    workspaceId,
    title: task.name,
    description: task.markdown_description ?? task.description ?? task.text_content ?? (task.description === null ? null : undefined),
    status: mapStatus(task),
    priority: task.priority === null ? null : task.priority?.priority,
    dueDate: mapDueDate(task.due_date),
    externalId: task.id,
    source: "clickup"
  };
}

export function safeClickUpTaskPayload(task: ClickUpTask): Prisma.InputJsonValue {
  return {
    externalId: task.id,
    name: task.name,
    status: task.status?.status ?? null,
    statusType: task.status?.type ?? null,
    listId: task.list?.id ?? null
  };
}
