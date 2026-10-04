const recordIdPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function recordIdFromQuery(search: string, key: "applicationId" | "decisionId" | "taskId") {
  const values = new URLSearchParams(search).getAll(key);
  return values.length === 1 && recordIdPattern.test(values[0]) ? values[0].toLowerCase() : null;
}

export function innovationRecordPath(search: string, canonicalPath: string) {
  const query = new URLSearchParams(search);
  const applicationId = recordIdFromQuery(search, "applicationId");
  const cockpits = query.getAll("cockpit");
  if (!applicationId || cockpits.length !== 1 || cockpits[0] !== "evidence") return canonicalPath;
  return `${canonicalPath}&applicationId=${encodeURIComponent(applicationId)}&cockpit=evidence`;
}

export async function validateDecisionNavigation(
  decisionId: string,
  read: (id: string) => Promise<{ selected?: { decisionId?: string } | null }>
) {
  if (!recordIdPattern.test(decisionId)) throw new Error("invalid_decision_navigation");
  const packet = await read(decisionId);
  if (packet.selected?.decisionId !== decisionId) throw new Error("decision_navigation_unavailable");
  return decisionId;
}

export async function validateTaskNavigation(taskId: string, read: (id: string) => Promise<{ id?: string }>) {
  if (!recordIdPattern.test(taskId)) throw new Error("invalid_task_navigation");
  const task = await read(taskId);
  if (task.id !== taskId) throw new Error("task_navigation_unavailable");
  return taskId;
}

export function validateTaskPacketNavigation(taskId: string, read: (id: string) => Promise<{ data?: { id?: string } }>) {
  return validateTaskNavigation(taskId, async id => (await read(id)).data ?? {});
}
