import type { AgentExecution, AgentHost, Prisma, Task } from "@prisma/client";

const GiB = 1024 ** 3;
const freshnessMs = 60_000;
const agingMs = 24 * 60 * 60 * 1000;
const priorityValue = new Map<string, number>([["low", 0], ["normal", 1], ["high", 2], ["critical", 3]]);

type QueueEntry = AgentExecution & { task: Pick<Task, "id" | "status" | "priority"> };

export function schedulerResources(host: Pick<AgentHost, "status" | "lastSeenAt" | "metadata">, now = new Date()) {
  if (host.status !== "online" || !host.lastSeenAt || now.getTime() - host.lastSeenAt.getTime() > freshnessMs || host.lastSeenAt.getTime() > now.getTime() + 5_000)
    return { ok: false, reason: "scheduler_host_offline" } as const;
  const data = (host.metadata as any)?.schedulerResources;
  const observed = typeof data?.observedAt === "string" ? Date.parse(data.observedAt) : NaN;
  if (data?.schemaVersion !== "roost-host-resources-v1" || !Number.isFinite(observed)
    || now.getTime() - observed > freshnessMs || observed > now.getTime() + 5_000
    || !["freeMemoryBytes", "totalMemoryBytes", "freeDiskBytes", "totalDiskBytes", "cpuLogicalCount"].every(key => Number.isSafeInteger(data[key]) && data[key] >= 0)
    || data.cpuLogicalCount < 1 || data.totalMemoryBytes < data.freeMemoryBytes || data.totalDiskBytes < data.freeDiskBytes)
    return { ok: false, reason: "scheduler_resources_unverified" } as const;
  return { ok: true, resources: data as { freeMemoryBytes: number; totalMemoryBytes: number; freeDiskBytes: number; totalDiskBytes: number; cpuLogicalCount: number } } as const;
}

export function hasSchedulerCapacity(resources: { freeMemoryBytes: number; freeDiskBytes: number; cpuLogicalCount: number }, execution: Pick<AgentExecution, "applicationId">) {
  // A coding application may hold a repository and build output; a bounded
  // information run needs less disk. Both require an observed live reserve.
  const memoryFloor = execution.applicationId ? 4 * GiB : 2 * GiB;
  const diskFloor = execution.applicationId ? 8 * GiB : 2 * GiB;
  return resources.cpuLogicalCount >= 2 && resources.freeMemoryBytes >= memoryFloor && resources.freeDiskBytes >= diskFloor;
}

export function schedulerRank(entry: QueueEntry, now = new Date()) {
  const raw = entry.task.priority ?? "normal";
  const base = priorityValue.get(raw);
  if (base === undefined || !["todo", "in_progress"].includes(entry.task.status)) return null;
  const age = Math.max(0, now.getTime() - entry.createdAt.getTime());
  return Math.min(3, base + Math.floor(age / agingMs));
}

export function orderSchedulerQueue<T extends QueueEntry>(entries: T[], now = new Date()) {
  return entries.filter(entry => schedulerRank(entry, now) !== null).sort((a, b) =>
    schedulerRank(b, now)! - schedulerRank(a, now)!
    || a.createdAt.getTime() - b.createdAt.getTime()
    || a.id.localeCompare(b.id));
}

export async function taskDependenciesComplete(db: Prisma.TransactionClient, workspaceId: string, taskId: string) {
  const links = await db.dependency.findMany({ where: { workspaceId, status: { in: ["active", "blocked"] }, OR: [
    { dependencyType: { in: ["depends_on", "requires"] }, fromEntityType: "task", fromEntityId: taskId, toEntityType: "task" },
    { dependencyType: "blocks", toEntityType: "task", toEntityId: taskId, fromEntityType: "task" }
  ] }, select: { dependencyType: true, fromEntityId: true, toEntityId: true } });
  const prerequisites = links.map(link => link.dependencyType === "blocks" ? link.fromEntityId : link.toEntityId);
  if (prerequisites.some(value => !value)) return false;
  const ids = [...new Set(prerequisites.filter((value): value is string => !!value))];
  if (!ids.length) return true;
  const done = await db.task.count({ where: { workspaceId, id: { in: ids }, status: "done" } });
  return done === ids.length;
}
