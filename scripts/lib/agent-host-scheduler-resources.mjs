import os from "node:os";
import { statfs } from "node:fs/promises";

const boundedInteger = value => Number.isSafeInteger(value) && value >= 0;

// The caller supplies the volume that owns the shared Writer state. No path or
// process inventory is sent to Roost; unknown or inconsistent facts deny claim.
export async function observeSchedulerResources(stateVolumePath, { filesystem = statfs, system = os,
  now = () => new Date() } = {}) {
  const volume = await filesystem(stateVolumePath, { bigint: true });
  const freeDiskBytes = Number(volume.bavail * volume.bsize);
  const totalDiskBytes = Number(volume.blocks * volume.bsize);
  const freeMemoryBytes = system.freemem();
  const totalMemoryBytes = system.totalmem();
  const cpuLogicalCount = system.availableParallelism();
  const observedAt = now().toISOString();
  if (![freeDiskBytes, totalDiskBytes, freeMemoryBytes, totalMemoryBytes, cpuLogicalCount].every(boundedInteger)
      || totalDiskBytes === 0 || totalMemoryBytes === 0 || cpuLogicalCount === 0
      || freeDiskBytes > totalDiskBytes || freeMemoryBytes > totalMemoryBytes
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(observedAt))
    throw new Error("agent_host_resources_unavailable");
  return Object.freeze({ schemaVersion: "roost-host-resources-v1", observedAt,
    freeMemoryBytes, totalMemoryBytes, freeDiskBytes, totalDiskBytes, cpuLogicalCount });
}
