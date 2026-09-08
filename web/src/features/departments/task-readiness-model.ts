export type Reference = { id: string; revision: string; evidence?: string };
export type CatalogEntry = { id: string; label: string; revision: string; eligible?: boolean; applicationId?: string | null };
export type RoleCatalogEntry = CatalogEntry & { principalKey: string | null; type: string; role: string | null; competencies: string[]; mandates: string[] };
export type ReadyEditor = {
  submissionVersion: string;
  taskIdentity: { contractId: string; branch: string };
  components: CatalogEntry[]; managers: CatalogEntry[];
  roleCatalog: RoleCatalogEntry[]; requester: CatalogEntry | null; excludedRolePrincipals: string[]; roleOrigin: { established: boolean; submissionId: string | null }; roleCatalogTruncated: boolean;
  task: { id: string; title: string; status: string; project: { id: string; name: string } | null; goal: { id: string; title: string } | null };
  agent: { id: string; name: string; role: string; eligible: boolean; competencies: string[]; tools: string[]; permissions: string[] } | null;
  applications: { id: string; name: string }[]; applicationId: string | null;
  projects: { id: string; name: string }[]; goals: { id: string; title: string }[]; agents: { id: string; name: string }[];
  activeExecution: boolean; catalogTruncated: boolean;
  sources: CatalogEntry[]; procedures: CatalogEntry[]; dependencies: CatalogEntry[]; decisions: CatalogEntry[];
  models: { id: string; efforts: string[] }[];
  accepted: { contract: Record<string, any>; prompt: string | null; baseBranch: string | null; applicationId: string } | null;
  acceptance: { validatedAt: string; authorName: string | null; authorType: string } | null;
};
export type ReadyPacket = { status: string; reason?: string; changedSources?: { table: string; id: string; label: string; operation: string; changedAt: string }[]; revision?: string; validationRevision?: string; pinId?: string; canSubmit: boolean; executionEnabled: boolean; editor: ReadyEditor };
export const groups = ["company", "product", "technical", "procedures", "skills", "dependencies", "decisions"] as const;
export type RefGroup = typeof groups[number];
export const fields = {
  intent: ["version", "outcome", "allowed", "forbidden", "prompt", "baseBranch"],
  limits: ["maxAttempts", "maxDurationSeconds", "maxOutputTokens", "restrictions"],
  acceptance: ["criteria", "tests", "evidence"],
  recovery: ["handoff", "failure", "escalation", "rollbackInstructions"]
} as const;
export type FieldName = typeof fields[keyof typeof fields][number];
export type ScopeDraft = { component: Reference | null; manager: Reference | null; metric: string; comparison: string; target: string; unit: string; method: string; problems: { statement: string; causalLink: string }[]; mechanism: string; inseparability: string; evidence: Reference | null };
export type Draft = { taskRoles: { requester: Reference | null; executor: Reference | null; verifier: Reference | null; releaser: Reference | null }; singleTask: ScopeDraft; values: Record<FieldName, string>; model: string; effort: string; competencies: string[]; tools: string[]; permissions: string[]; refs: Record<RefGroup, Reference[]>; none: Record<RefGroup, string>; rollbackMode: string };
const lines = (value: string) => value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
const join = (value: unknown) => Array.isArray(value) ? value.join("\n") : typeof value === "string" || typeof value === "number" ? String(value) : "";
export function draftFrom(editor: ReadyEditor): Draft {
  const c = editor.accepted?.contract ?? {};
  const s = c.singleTask ?? {}, m = s.measurement ?? {};
  const values = {
    version: c.version, outcome: c.objective?.outcome, allowed: c.scope?.allowed, forbidden: c.scope?.forbidden,
    prompt: editor.accepted?.prompt, baseBranch: editor.accepted?.baseBranch, ...c.budgets,
    restrictions: c.access?.restrictions, ...c.acceptance, ...c.recovery, rollbackInstructions: c.recovery?.rollback?.instructions
  };
  return { values: Object.fromEntries(Object.values(fields).flat().map(key => [key, join(values[key])])) as Draft["values"],
    taskRoles: { requester: c.taskRoles?.requester ?? (editor.requester ? { id: editor.requester.id, revision: editor.requester.revision } : null), executor: c.taskRoles?.executor ?? null, verifier: c.taskRoles?.verifier ?? null, releaser: c.taskRoles?.releaser ?? null },
    singleTask: { component: s.component ?? null, manager: s.accountableManager ?? null, metric: m.metric ?? "", comparison: m.comparison ?? "eq", target: m.target === undefined ? "" : String(m.target), unit: m.unit ?? "", method: m.method ?? "",
      problems: (s.problems ?? [{ statement: "" }]).map((p: any) => ({ statement: p.statement, causalLink: p.causalLink ?? "" })), mechanism: s.commonCause?.mechanism ?? "", inseparability: s.commonCause?.inseparability ?? "", evidence: s.commonCause?.evidence ?? null },
    model: c.modelSelection?.model ?? "", effort: c.modelSelection?.reasoningEffort ?? "", competencies: c.assignment?.competencies ?? [], tools: c.access?.tools ?? [], permissions: c.access?.permissions ?? [],
    refs: Object.fromEntries(groups.map(key => [key, key === "skills" ? (c.skills?.items ?? []).map((item: { name: string; version: string }) => ({ id: item.name, revision: item.version })) : c.context?.[key] ?? c[key]?.items ?? []])) as Draft["refs"],
    none: Object.fromEntries(groups.map(key => [key, c[key]?.noneReason ?? ""])) as Draft["none"], rollbackMode: c.recovery?.rollback?.mode ?? "" };
}
export function catalogFor(editor: ReadyEditor, group: RefGroup): CatalogEntry[] {
  if (group === "skills") return (editor.agent?.competencies ?? []).filter(value => value.includes("@")).map(value => ({ id: value.slice(0, value.lastIndexOf("@")), label: value.slice(0, value.lastIndexOf("@")), revision: value.slice(value.lastIndexOf("@") + 1) }));
  if (["company", "product", "technical"].includes(group)) return editor.sources.filter(item => group === "company" ? item.applicationId === null : item.applicationId === editor.applicationId);
  return editor[group as "procedures" | "dependencies" | "decisions"];
}
export function selectReferences(previous: Reference[], catalog: CatalogEntry[], ids: string[], refresh = false): Reference[] {
  return ids.map(id => {
    const old = previous.find(item => item.id === id), current = catalog.find(item => item.id === id);
    return { id, revision: (!refresh && old ? old.revision : current?.revision) ?? old?.revision ?? "", ...(old?.evidence !== undefined ? { evidence: old.evidence } : {}) };
  });
}
export function contractInput(editor: ReadyEditor, draft: Draft) {
  const v = draft.values;
  const s = draft.singleTask;
  const set = (key: RefGroup) => ({ items: draft.refs[key].map(item => key === "skills" ? { name: item.id, version: item.revision } : key === "dependencies" ? { id: item.id, revision: item.revision, evidence: item.evidence ?? "", resolution: "satisfied" } : { id: item.id, revision: item.revision }), noneReason: draft.refs[key].length ? null : draft.none[key] });
  return { expectedVersion: editor.submissionVersion, applicationId: editor.applicationId, prompt: v.prompt || null, baseBranch: v.baseBranch || null, contract: {
    version: v.version, objective: { outcome: v.outcome, goalId: editor.task.goal?.id }, scope: { allowed: lines(v.allowed), forbidden: lines(v.forbidden) },
    taskRoles: { schemaVersion: "roost-task-roles-v1", ...draft.taskRoles, accountableManager: s.manager },
    singleTask: { schemaVersion: "roost-single-task-v1", ...editor.taskIdentity, applicationId: editor.applicationId, component: s.component, accountableManager: s.manager,
      measurement: { metric: s.metric, comparison: s.comparison, target: s.target.trim() ? Number(s.target) : null, unit: s.unit, method: s.method },
      problems: s.problems.map(p => ({ statement: p.statement, componentId: s.component?.id, outcome: v.outcome, causalLink: s.problems.length > 1 ? p.causalLink : null })),
      commonCause: s.problems.length > 1 ? { mechanism: s.mechanism, inseparability: s.inseparability, evidence: s.evidence } : null },
    assignment: { agentId: editor.agent?.id, role: editor.agent?.role, competencies: draft.competencies }, modelSelection: { model: draft.model, reasoningEffort: draft.effort },
    context: Object.fromEntries(["company", "product", "technical"].map(key => [key, draft.refs[key as RefGroup].map(({ id, revision }) => ({ id, revision }))])),
    procedures: set("procedures"), skills: set("skills"), dependencies: set("dependencies"), decisions: set("decisions"),
    access: { tools: draft.tools, permissions: draft.permissions, sandbox: "workspace-write", externalWrites: false, restrictions: lines(v.restrictions) },
    budgets: { maxAttempts: Number(v.maxAttempts), maxDurationSeconds: Number(v.maxDurationSeconds), maxOutputTokens: Number(v.maxOutputTokens) },
    acceptance: { criteria: lines(v.criteria), tests: lines(v.tests), evidence: lines(v.evidence) },
    recovery: { handoff: v.handoff, failure: v.failure, escalation: v.escalation, rollback: { mode: draft.rollbackMode, instructions: v.rollbackInstructions } }
  } };
}

// Only fixed server field paths/reasons become UI copy. Unknown payloads never render.
export function validationSections(details: unknown): string[] {
  const issues = details && typeof details === "object" && "issues" in details ? (details as { issues: unknown }).issues : [];
  if (!Array.isArray(issues)) return ["general"];
  return [...new Set(issues.map(issue => {
    if (!issue || typeof issue.field !== "string") return "general";
    const field = issue.field as string;
    if (/^contract\.taskRoles/.test(field)) return "taskRoles";
    if (/^contract\.singleTask/.test(field)) return "singleTask";
    if (/^contract\.context\.(company|product|technical)(\.|$)/.test(field)) return field.split(".")[2]!;
    if (/^contract\.(procedures|skills|dependencies|decisions)(\.|$)/.test(field)) return field.split(".")[1]!;
    if (/^contract\.(objective|scope|version)/.test(field)) return "intent";
    if (/^contract\.(assignment|modelSelection|access)/.test(field)) return "assignment";
    if (/^contract\.budgets/.test(field)) return "limits";
    if (/^contract\.acceptance/.test(field)) return "acceptance";
    if (/^contract\.recovery/.test(field)) return "recovery";
    if (/^(taskContext|applicationContext|identity|taskRevision)/.test(field)) return "links";
    return "general";
  }))];
}
