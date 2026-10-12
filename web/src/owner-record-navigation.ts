const recordIdPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function recordIdFromQuery(search: string, key: "applicationId" | "fromApplicationId" | "decisionId" | "taskId" | "recordId") {
  const values = new URLSearchParams(search).getAll(key);
  return values.length === 1 && recordIdPattern.test(values[0]) ? values[0].toLowerCase() : null;
}

export function innovationRecordPath(search: string, canonicalPath: string) {
  const query = new URLSearchParams(search);
  const applicationId = recordIdFromQuery(search, "applicationId");
  const cockpits = query.getAll("cockpit");
  if (!applicationId || cockpits.length !== 1 || !["overview", "evidence"].includes(cockpits[0])) return canonicalPath;
  return `${canonicalPath}&applicationId=${encodeURIComponent(applicationId)}&cockpit=${cockpits[0]}`;
}

export function applicationReturnPath(applicationId: string) {
  return recordIdPattern.test(applicationId)
    ? `/areas?area=11-innowacje&view=overview&applicationId=${encodeURIComponent(applicationId.toLowerCase())}&cockpit=overview`
    : null;
}

type ApplicationNavigation = { id?: string; operation?: {
  nearestOutcome?: { taskId: string } | null;
  blockers?: Array<{ target?: { kind: string; href: string } | null }>;
  decisions?: Array<{ id: string; relatedTask?: { id: string } | null }>;
  stage?: { decisionId?: string | null; relatedTask?: { id: string } | null };
} };

export async function validateApplicationReturn(applicationId: string, recordId: string, kind: "task" | "decision",
  read: (id: string) => Promise<{ data?: ApplicationNavigation }>) {
  if (!recordIdPattern.test(applicationId) || !recordIdPattern.test(recordId)) throw new Error("invalid_application_return");
  const application = (await read(applicationId)).data;
  if (application?.id !== applicationId) throw new Error("application_return_unavailable");
  const operation = application.operation;
  const linked = kind === "task" ? operation?.nearestOutcome?.taskId === recordId
    || operation?.stage?.relatedTask?.id === recordId
    || operation?.decisions?.some(decision => decision.relatedTask?.id === recordId)
    || operation?.blockers?.some(blocker => blocker.target?.kind === "task" && blocker.target.href.endsWith(`&taskId=${recordId}`))
    : operation?.stage?.decisionId === recordId || operation?.decisions?.some(decision => decision.id === recordId)
      || operation?.blockers?.some(blocker => blocker.target?.kind === "decision" && blocker.target.href.endsWith(`&decisionId=${recordId}`));
  if (!linked) throw new Error("application_return_unavailable");
  return applicationReturnPath(applicationId)!;
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

export function validateGovernedDecisionPacketNavigation(decisionId: string, read: (id: string) => Promise<{ data?: { id?: string; source?: string } }>) {
  return validateDecisionNavigation(decisionId, async id => {
    const record = (await read(id)).data;
    return { selected: record?.source === "roost_decision" ? { decisionId: record.id } : null };
  });
}
