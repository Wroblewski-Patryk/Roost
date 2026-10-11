import { strict as assert } from "node:assert";
import test from "node:test";
import { hasSchedulerCapacity, orderSchedulerQueue, schedulerResources } from "./execution-scheduler";

const now = new Date("2026-10-11T12:00:00.000Z");
const resources = { schemaVersion: "roost-host-resources-v1", observedAt: now.toISOString(),
  freeMemoryBytes: 8 * 1024 ** 3, totalMemoryBytes: 16 * 1024 ** 3,
  freeDiskBytes: 16 * 1024 ** 3, totalDiskBytes: 64 * 1024 ** 3, cpuLogicalCount: 4 };

test("scheduler denies stale, inconsistent or insufficient measured capacity", () => {
  const host = { status: "online", lastSeenAt: now, metadata: { schedulerResources: resources } } as any;
  const valid = schedulerResources(host, now);
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(hasSchedulerCapacity(valid.resources, { applicationId: "application" } as any), true);
  assert.equal(hasSchedulerCapacity({ ...valid.resources, freeDiskBytes: 1024 }, { applicationId: "application" } as any), false);
  assert.equal(hasSchedulerCapacity({ ...valid.resources, freeMemoryBytes: 1024 }, { applicationId: null } as any), false);
  assert.equal(schedulerResources({ ...host, lastSeenAt: new Date(now.getTime() - 61_000) }, now).ok, false);
  assert.equal(schedulerResources({ ...host, metadata: { schedulerResources: { ...resources, freeDiskBytes: resources.totalDiskBytes + 1 } } }, now).ok, false);
});

test("priority ages by one band per day without bypassing task status", () => {
  const entry = (id: string, priority: string, hours: number, status = "todo") => ({
    id, task: { id, priority, status }, createdAt: new Date(now.getTime() - hours * 3600_000)
  }) as any;
  const ordered = orderSchedulerQueue([
    entry("normal", "normal", 1), entry("old-low", "low", 73),
    entry("critical", "critical", 2), entry("done", "critical", 100, "done")
  ], now);
  assert.deepEqual(ordered.map(value => value.id), ["old-low", "critical", "normal"]);
  assert.deepEqual(orderSchedulerQueue([entry("prototype", "constructor", 1), entry("valid", "normal", 1)], now).map(value => value.id), ["valid"]);
});
