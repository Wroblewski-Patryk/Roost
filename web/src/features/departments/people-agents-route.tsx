import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { WorkforceEntity, WorkforcePacket } from "../../types";

type TypeFilter = "all" | WorkforceEntity["type"];
type StatusFilter = "all" | WorkforceEntity["status"];
type DetailTab = "profile" | "access" | "work" | "authority" | "files";
type ScopeFilter = "all" | "humans" | "agents" | "directors" | "attention";
type SortKey = "name" | "department" | "updated" | "work" | "tools" | "knowledge";
type DensityMode = "comfortable" | "compact";
type RouteNotice = { tone: "success" | "error"; title: string };

const runtimeLabels: Record<WorkforceEntity["runtimeMode"], string> = {
  manual: "Manual",
  semi_autonomous: "Semi-autonomous",
  autonomous: "Autonomous"
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CC";
}

function badgeTone(value?: string) {
  if (value === "active" || value === "synced") return "badge-success";
  if (value === "queued" || value === "stale" || value === "paused") return "badge-warning";
  if (value === "archived" || value === "inactive" || value === "failed") return "badge-error";
  return "badge-outline";
}

function typeLabel(type: WorkforceEntity["type"]) {
  return type === "human" ? "Human" : "Agent";
}

function listCount(value?: string[]) {
  return Array.isArray(value) ? value.length : 0;
}

function bigFiveSummary(entity: WorkforceEntity) {
  const profile = entity.bigFiveProfile || {};
  const traits = Object.entries(profile).filter(([, value]) => typeof value === "number");
  if (!traits.length) return "Big5 missing";
  return traits
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 2)
    .map(([key, value]) => `${key.slice(0, 1).toUpperCase()}${key.slice(1, 3)} ${value}`)
    .join(" / ");
}

function paperclipRuntime(entity: WorkforceEntity) {
  return entity.paperclipProfile?.runtimeStatus || entity.syncStatus || "not linked";
}

function needsAttention(entity: WorkforceEntity) {
  return entity.readiness?.status === "needs_attention" || !entity.role
    || !entity.description
    || entity.status !== "active";
}

function readinessItems(entity: WorkforceEntity) {
  if (entity.readiness?.items?.length) {
    return entity.readiness.items;
  }
  return [
    {
      label: "Role assigned",
      done: Boolean(entity.role),
      detail: entity.role || "Add the working role."
    },
    {
      label: "Responsibilities written",
      done: Boolean(entity.description?.trim()),
      detail: entity.description ? "Description feeds management context." : "Add responsibilities before assigning work."
    },
    {
      label: "Active status",
      done: entity.status === "active",
      detail: entity.status === "active" ? "Available for work." : `Current status: ${entity.status}.`
    },
    {
      label: "Authority boundary",
      done: entity.type === "human" || entity.runtimeMode !== "autonomous",
      detail: entity.type === "human" ? "Human workspace authority." : entity.runtimeMode === "autonomous" ? "Review autonomous authority." : "Supervised runtime mode."
    }
  ];
}

function blockedActionText(action: string | { action?: string; reason?: string }) {
  return typeof action === "string" ? { action, reason: "" } : {
    action: action.action || "blocked_action",
    reason: action.reason || ""
  };
}

function EntityAvatar({ entity }: { entity: WorkforceEntity }) {
  if (entity.avatar) {
    return <img alt="" className="h-11 w-11 rounded-company border border-base-300 object-cover" src={entity.avatar} />;
  }
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-company border border-base-300 bg-base-200/70 text-sm font-black text-primary">
      {initials(entity.name)}
    </span>
  );
}

function RowAction({
  label,
  icon,
  tone = "ghost",
  disabled,
  onClick
}: {
  label: string;
  icon: string;
  tone?: "ghost" | "outline" | "error";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass = tone === "error" ? "btn-error btn-outline" : tone === "outline" ? "btn-outline" : "btn-ghost";
  return (
    <button
      aria-label={label}
      className={`btn btn-xs btn-square ${toneClass}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      type="button"
    >
      <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
    </button>
  );
}

function entityMatches(entity: WorkforceEntity, query: string, type: TypeFilter, status: StatusFilter, scope: ScopeFilter) {
  if (scope === "humans" && entity.type !== "human") return false;
  if (scope === "agents" && entity.type !== "agent") return false;
  if (scope === "directors" && entity.hierarchyLevel !== "department_director" && entity.hierarchyLevel !== "executive_root") return false;
  if (scope === "attention" && !needsAttention(entity)) return false;
  if (type !== "all" && entity.type !== type) return false;
  if (status !== "all" && entity.status !== status) return false;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entity.name,
    entity.slug,
    entity.role,
    entity.department,
    entity.model,
    entity.hierarchyLevel,
    ...(entity.skillIndex || []),
    ...(entity.knowledgeIndex || []),
    ...(entity.toolIndex || [])
  ].filter(Boolean).join(" ").toLowerCase().includes(normalized);
}

function sortEntities(entities: WorkforceEntity[], sort: SortKey) {
  return [...entities].sort((a, b) => {
    if (sort === "updated") {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }
    if (sort === "department") {
      return `${a.department || ""} ${a.name}`.localeCompare(`${b.department || ""} ${b.name}`);
    }
    if (sort === "work") {
      return (b.work?.summary.active ?? 0) - (a.work?.summary.active ?? 0) || a.name.localeCompare(b.name);
    }
    if (sort === "tools") {
      return listCount(b.toolIndex) - listCount(a.toolIndex) || a.name.localeCompare(b.name);
    }
    if (sort === "knowledge") {
      return listCount(b.knowledgeIndex) - listCount(a.knowledgeIndex) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

function defaultEntity(): Partial<WorkforceEntity> {
  return {
    type: "agent",
    status: "active",
    name: "",
    department: "06-kadry",
    role: "",
    personalityProfile: "supportive",
    runtimeMode: "semi_autonomous",
    synchronizationEnabled: false,
    hierarchyLevel: "department_director",
    bigFiveProfile: { openness: 4, conscientiousness: 4, extraversion: 3, agreeableness: 4, neuroticism: 2 },
    skillIndex: [],
    knowledgeIndex: [],
    toolIndex: [],
    authorityScope: []
  };
}

function splitIndex(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function WorkforceForm({
  entity,
  managers,
  dictionaries,
  onClose,
  onSaved
}: {
  entity?: WorkforceEntity | null;
  managers: WorkforceEntity[];
  dictionaries?: WorkforcePacket["dictionaries"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const values = entity || defaultEntity();
  const departments = dictionaries?.departments || [];
  const statuses = dictionaries?.statuses || ["active", "inactive", "paused", "archived"];
  const runtimeModes = dictionaries?.runtimeModes || Object.keys(runtimeLabels) as WorkforceEntity["runtimeMode"][];
  const personalityProfiles = dictionaries?.personalityProfiles || ["analytical", "creative", "executive", "supportive", "researcher", "custom"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const managerId = String(form.get("managerId") || "");
    const body = {
      type: String(form.get("type") || "agent"),
      status: String(form.get("status") || "active"),
      name: String(form.get("name") || ""),
      slug: String(form.get("slug") || "") || undefined,
      description: String(form.get("description") || "") || null,
      avatar: String(form.get("avatar") || "") || null,
      department: String(form.get("department") || "") || null,
      role: String(form.get("role") || "") || null,
      managerId: managerId || null,
      personalityProfile: String(form.get("personalityProfile") || "supportive"),
      model: String(form.get("model") || "") || null,
      runtimeMode: String(form.get("runtimeMode") || "manual"),
      paperclipAgentId: String(form.get("paperclipAgentId") || "") || null,
      synchronizationEnabled: Boolean(form.get("synchronizationEnabled")),
      hierarchyLevel: String(form.get("hierarchyLevel") || "") || null,
      bigFiveProfile: {
        openness: Number(form.get("bigFiveOpenness") || 0),
        conscientiousness: Number(form.get("bigFiveConscientiousness") || 0),
        extraversion: Number(form.get("bigFiveExtraversion") || 0),
        agreeableness: Number(form.get("bigFiveAgreeableness") || 0),
        neuroticism: Number(form.get("bigFiveNeuroticism") || 0)
      },
      skillIndex: splitIndex(form.get("skillIndex")),
      knowledgeIndex: splitIndex(form.get("knowledgeIndex")),
      toolIndex: splitIndex(form.get("toolIndex")),
      authorityScope: splitIndex(form.get("authorityScope"))
    };

    setSaveState("saving");
    setError("");
    try {
      await api(entity ? `/v1/workforce/${entity.id}` : "/v1/workforce", {
        method: entity ? "PATCH" : "POST",
        body: JSON.stringify(body)
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setSaveState("error");
      setError(userErrorMessage(saveError, t));
    } finally {
      setSaveState((current) => current === "saving" ? "idle" : current);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="workforce-form-title">
      <form className="roost-work-surface grid max-h-[92vh] w-full max-w-5xl gap-5 overflow-y-auto rounded-company p-5 shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-primary">06 People / Agents</p>
            <h2 className="mt-1 text-2xl font-black text-company-ink" id="workforce-form-title">{entity ? "Edit workforce entity" : "New workforce entity"}</h2>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" aria-label="Close" onClick={onClose} type="button">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
          </button>
        </div>

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <section className="grid gap-4 md:grid-cols-2">
          <CcField label="Name" required>
            {({ id }) => <CcTextInput autoFocus={!entity} defaultValue={values.name || ""} id={id} name="name" required />}
          </CcField>
          <CcField label="Slug">
            {({ id }) => <CcTextInput defaultValue={values.slug || ""} id={id} name="slug" />}
          </CcField>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Type</span></span>
            <select className="select select-bordered" defaultValue={values.type || "agent"} name="type">
              <option value="human">Human</option>
              <option value="agent">Agent</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Status</span></span>
            <select className="select select-bordered" defaultValue={values.status || "active"} name="status">
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Department</span></span>
            <select className="select select-bordered" defaultValue={values.department || "06-kadry"} name="department">
              {departments.length ? departments.map((department) => (
                <option key={department.key} value={department.key}>{department.key}</option>
              )) : <option value={values.department || "06-kadry"}>{values.department || "06-kadry"}</option>}
            </select>
          </label>
          <CcField label="Role">
            {({ id }) => <CcTextInput defaultValue={values.role || ""} id={id} name="role" />}
          </CcField>
          <label className="form-control md:col-span-2">
            <span className="label"><span className="label-text font-bold">Description / responsibilities</span></span>
            <textarea className="textarea textarea-bordered min-h-28" defaultValue={values.description || ""} name="description"></textarea>
          </label>
          <CcField label="Avatar URL">
            {({ id }) => <CcTextInput defaultValue={values.avatar || ""} id={id} name="avatar" />}
          </CcField>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Manager</span></span>
            <select className="select select-bordered" defaultValue={values.managerId || ""} name="managerId">
              <option value="">No manager</option>
              {managers.filter((manager) => manager.id !== entity?.id).map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.name}</option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Personality profile</span></span>
            <select className="select select-bordered" defaultValue={values.personalityProfile || "supportive"} name="personalityProfile">
              {personalityProfiles.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Runtime mode</span></span>
            <select className="select select-bordered" defaultValue={values.runtimeMode || "manual"} name="runtimeMode">
              {runtimeModes.map((mode) => <option key={mode} value={mode}>{runtimeLabels[mode]}</option>)}
            </select>
          </label>
          <CcField label="Model">
            {({ id }) => <CcTextInput defaultValue={values.model || ""} id={id} name="model" placeholder="gpt-5.4, claude, local..." />}
          </CcField>
          <CcField label="Paperclip agent ID">
            {({ id }) => <CcTextInput defaultValue={values.paperclipAgentId || ""} id={id} name="paperclipAgentId" placeholder="Runtime UUID or slug" />}
          </CcField>
          <CcField label="Hierarchy level">
            {({ id }) => <CcTextInput defaultValue={values.hierarchyLevel || ""} id={id} name="hierarchyLevel" placeholder="executive_root, department_director..." />}
          </CcField>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Paperclip sync</span></span>
            <span className="flex min-h-12 items-center gap-3 rounded-company border border-base-300 bg-base-100 px-3">
              <input className="checkbox checkbox-primary" defaultChecked={Boolean(values.synchronizationEnabled)} name="synchronizationEnabled" type="checkbox" />
              <span className="text-sm font-bold text-company-ink">Enable generated file sync queue</span>
            </span>
          </label>
          <fieldset className="grid gap-2 rounded-company border border-base-300 p-3 md:col-span-2">
            <legend className="px-1 text-sm font-bold text-company-muted">Big Five</legend>
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                ["bigFiveOpenness", "Openness", values.bigFiveProfile?.openness],
                ["bigFiveConscientiousness", "Conscientiousness", values.bigFiveProfile?.conscientiousness],
                ["bigFiveExtraversion", "Extraversion", values.bigFiveProfile?.extraversion],
                ["bigFiveAgreeableness", "Agreeableness", values.bigFiveProfile?.agreeableness],
                ["bigFiveNeuroticism", "Neuroticism", values.bigFiveProfile?.neuroticism]
              ].map(([name, label, value]) => (
                <label className="form-control" key={String(name)}>
                  <span className="label"><span className="label-text text-xs font-bold">{label}</span></span>
                  <input className="input input-bordered" defaultValue={Number(value || 0)} max={5} min={0} name={String(name)} step={1} type="number" />
                </label>
              ))}
            </div>
          </fieldset>
          {[
            ["skillIndex", "Skills index", values.skillIndex],
            ["knowledgeIndex", "Knowledge index", values.knowledgeIndex],
            ["toolIndex", "Tools index", values.toolIndex],
            ["authorityScope", "Authority scope", values.authorityScope]
          ].map(([name, label, value]) => (
            <label className="form-control md:col-span-2" key={String(name)}>
              <span className="label"><span className="label-text font-bold">{label}</span></span>
              <textarea className="textarea textarea-bordered min-h-20" defaultValue={Array.isArray(value) ? value.join("\n") : ""} name={String(name)}></textarea>
            </label>
          ))}
        </section>

        <div className="flex justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} type="button" variant="ghost">Cancel</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">Save entity</CcButton>
        </div>
      </form>
    </div>
  );
}

function MarkdownPreview({ files }: { files?: Record<string, string> }) {
  const [selectedFile, setSelectedFile] = useState("agent.md");
  const names = Object.keys(files || {});
  const active = files?.[selectedFile] ?? files?.[names[0] || ""] ?? "";
  if (!files || names.length === 0) return <p className="text-sm text-company-muted">Generated files are not available yet.</p>;

  return (
    <section className="grid min-h-0 gap-3">
      <div className="join">
        {names.map((name) => (
          <button className={`btn join-item btn-sm ${selectedFile === name ? "btn-primary" : "btn-outline"}`} key={name} onClick={() => setSelectedFile(name)} type="button">{name}</button>
        ))}
      </div>
      <pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap break-words rounded-company border border-base-300 bg-base-200/60 p-3 font-mono text-xs leading-6 text-company-ink">{active}</pre>
    </section>
  );
}

function DetailPanel({
  entity,
  tab,
  setTab,
  onEdit,
  onArchive,
  onDelete,
  onClose
}: {
  entity: WorkforceEntity | null;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  onEdit: (entity: WorkforceEntity) => void;
  onArchive: (entity: WorkforceEntity) => void;
  onDelete: (entity: WorkforceEntity) => void;
  onClose: () => void;
}) {
  if (!entity) {
    return (
      <aside className="roost-work-surface grid place-items-center rounded-company p-5 text-center">
        <div>
          <i className="ph-bold ph-user-list text-4xl text-company-muted" aria-hidden="true"></i>
          <h2 className="mt-3 font-black text-company-ink">Select a person or agent</h2>
          <p className="mt-1 text-sm text-company-muted">Profiles, work context, authority, and generated files appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="roost-work-surface grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 rounded-company p-4">
      <header className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <EntityAvatar entity={entity} />
          <div className="min-w-0">
            <h2 className="break-words text-xl font-black leading-6 text-company-ink">{entity.name}</h2>
            <p className="text-sm text-company-muted">{entity.role || "Unassigned role"} - {entity.department || "06-kadry"}</p>
            <p className="mt-1 text-xs font-bold uppercase text-company-muted">{typeLabel(entity.type)} / {runtimeLabels[entity.runtimeMode]} / Paperclip {paperclipRuntime(entity)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CcButton iconLeft="ph-x" onClick={onClose} size="sm" variant="ghost">Close</CcButton>
          <CcButton iconLeft="ph-pencil-simple" onClick={() => onEdit(entity)} size="sm" variant="outline">Edit</CcButton>
          {entity.status !== "archived" ? (
            <CcButton iconLeft="ph-archive" onClick={() => onArchive(entity)} size="sm" variant="ghost">Archive</CcButton>
          ) : null}
          {entity.source !== "user" ? (
            <CcButton iconLeft="ph-trash" onClick={() => onDelete(entity)} size="sm" variant="ghost">Delete</CcButton>
          ) : null}
        </div>
      </header>

      <div className="join">
        {(["profile", "access", "work", "authority", "files"] as DetailTab[]).map((item) => (
          <button className={`btn join-item btn-sm ${tab === item ? "btn-primary" : "btn-outline"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto">
        {tab === "profile" ? (
          <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-company-ink">Configuration readiness</h3>
                <span className="text-sm font-bold text-company-muted">
                  {entity.readiness?.score ?? readinessItems(entity).filter((item) => item.done).length} / {entity.readiness?.total ?? readinessItems(entity).length} ready
                </span>
              </div>
              {entity.readiness?.nextAction ? <p className="mt-2 text-sm font-bold text-primary">{entity.readiness.nextAction}</p> : null}
              <div className="mt-3 grid gap-2">
                {readinessItems(entity).map((item) => (
                  <div className="flex items-start gap-2 rounded-company bg-base-100/70 p-2 text-sm" key={item.label}>
                    <i className={`ph-bold ${item.done ? "ph-check-circle text-success" : "ph-warning-circle text-warning"} mt-0.5`} aria-hidden="true"></i>
                    <div>
                      <p className="font-bold text-company-ink">{item.label}</p>
                      <p className="text-company-muted">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="font-bold text-company-muted">Slug</dt><dd className="break-all text-company-ink">{entity.slug}</dd></div>
              <div><dt className="font-bold text-company-muted">Manager</dt><dd>{entity.manager?.name || "No manager"}</dd></div>
              <div><dt className="font-bold text-company-muted">Personality</dt><dd>{entity.personalityProfile}</dd></div>
              <div><dt className="font-bold text-company-muted">Model</dt><dd>{entity.model || "Not configured"}</dd></div>
              <div><dt className="font-bold text-company-muted">Hierarchy</dt><dd>{entity.hierarchyLevel || "Not configured"}</dd></div>
              <div><dt className="font-bold text-company-muted">Paperclip</dt><dd className="break-all">{entity.paperclipAgentId || "Not linked"}</dd></div>
              <div><dt className="font-bold text-company-muted">Direct reports</dt><dd>{entity.directReportCount ?? 0}</dd></div>
              <div><dt className="font-bold text-company-muted">Big Five</dt><dd>{bigFiveSummary(entity)}</dd></div>
              <div className="md:col-span-2"><dt className="font-bold text-company-muted">Description</dt><dd className="mt-1 leading-6">{entity.description || "No responsibilities written yet."}</dd></div>
            </dl>
          </section>
        ) : null}

        {tab === "access" ? (
          <section className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Skills", entity.skillIndex || []],
                ["Knowledge", entity.knowledgeIndex || []],
                ["Tools", entity.toolIndex || []]
              ].map(([label, values]) => (
                <div className="rounded-company border border-base-300 bg-base-200/45 p-3" key={String(label)}>
                  <p className="text-xs font-bold uppercase text-company-muted">{label}</p>
                  <p className="mt-1 text-2xl font-black text-company-ink">{Array.isArray(values) ? values.length : 0}</p>
                </div>
              ))}
            </div>
            {[
              ["Skills", entity.skillIndex || []],
              ["Knowledge", entity.knowledgeIndex || []],
              ["Tools", entity.toolIndex || []],
              ["Authority", entity.authorityScope || []]
            ].map(([label, values]) => (
              <div className="rounded-company border border-base-300 bg-base-100/75 p-3" key={String(label)}>
                <h3 className="font-black text-company-ink">{label}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Array.isArray(values) && values.length ? values : ["Not configured"]).map((item) => (
                    <span className="rounded-company border border-base-300 bg-base-200/70 px-2 py-1 text-xs font-bold text-company-muted" key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
            {entity.paperclipProfile?.url ? (
              <a className="btn btn-outline justify-start" href={entity.paperclipProfile.url} rel="noreferrer" target="_blank">
                <i className="ph-bold ph-arrow-square-out" aria-hidden="true"></i>
                <span>Open Paperclip profile</span>
              </a>
            ) : null}
          </section>
        ) : null}

        {tab === "work" ? (
          <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-company-ink">Work and responsibility</h3>
                <span className="text-sm font-bold text-company-muted">{entity.work?.assignmentModel || "not modeled"}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  ["Active", entity.work?.summary.active ?? 0],
                  ["Blocked", entity.work?.summary.blocked ?? 0],
                  ["Overdue", entity.work?.summary.overdue ?? 0],
                  ["Lists", entity.work?.summary.taskLists ?? 0]
                ].map(([label, value]) => (
                  <div className="rounded-company bg-base-100/70 p-2" key={label}>
                    <p className="text-xs font-bold uppercase text-company-muted">{label}</p>
                    <p className="text-lg font-black text-company-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            {(entity.work?.gaps || []).map((gap) => (
              <CcNotice key={gap.key} tone="warning" title={gap.label} detail={gap.detail} />
            ))}
            <div className="grid gap-2">
              {(entity.work?.evidence || []).length ? entity.work!.evidence.map((task) => (
                <div className="rounded-company border border-base-300 bg-base-100/75 p-3 text-sm" key={task.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <strong className="text-company-ink">{task.title}</strong>
                      <p className="text-company-muted">{task.project?.name || "No project"} / {task.taskList?.name || "No list"}</p>
                    </div>
                    <span className={`badge ${badgeTone(task.status)}`}>{task.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-company-muted">{task.priority || "medium"} priority{task.dueDate ? ` / due ${task.dueDate.slice(0, 10)}` : ""}</p>
                </div>
              )) : <p className="text-sm text-company-muted">No matching work evidence yet. Direct assignment is not modeled in this V1 slice.</p>}
            </div>
          </section>
        ) : null}

        {tab === "authority" ? (
          <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
              <h3 className="font-black text-company-ink">Authority boundary</h3>
              <p className="mt-1 text-sm text-company-muted">{entity.authority?.mode || "not modeled"} / risk {entity.authority?.riskLevel || "unknown"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(entity.authority?.visibleScopeSample || []).slice(0, 8).map((scope) => (
                  <span className="badge badge-outline" key={scope}>{scope}</span>
                ))}
              </div>
            </div>
            {(entity.authority?.recommendedProfiles || []).length ? (
              <div className="grid gap-2">
                <h4 className="font-black text-company-ink">Recommended access profiles</h4>
                {entity.authority!.recommendedProfiles.map((profile) => (
                  <div className="rounded-company border border-base-300 bg-base-100/75 p-3 text-sm" key={profile.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{profile.label}</strong>
                      <span className={`badge ${badgeTone(profile.riskLevel)}`}>{profile.riskLevel}</span>
                    </div>
                    <p className="mt-1 text-company-muted">{profile.description}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-2">
              <h4 className="font-black text-company-ink">Blocked actions</h4>
              {(entity.authority?.blockedActions || []).map((blocked) => {
                const item = blockedActionText(blocked);
                return (
                  <div className="rounded-company border border-base-300 bg-base-100/75 p-3 text-sm" key={item.action}>
                    <strong className="text-company-ink">{item.action}</strong>
                    {item.reason ? <p className="text-company-muted">{item.reason}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {tab === "files" ? <MarkdownPreview files={entity.generatedFiles} /> : null}
      </div>
    </aside>
  );
}

export function PeopleAgentsRoute() {
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editingEntity, setEditingEntity] = useState<WorkforceEntity | null | undefined>(undefined);
  const [notice, setNotice] = useState<RouteNotice | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const packet = useOwnerPacket<WorkforcePacket>(`/v1/workforce?refresh=${refreshKey}`, true, t);
  const entities = packet.data?.entities || [];
  const filtered = useMemo(
    () => sortEntities(entities.filter((entity) => entityMatches(entity, query, typeFilter, statusFilter, scopeFilter)), sortKey),
    [entities, query, typeFilter, statusFilter, scopeFilter, sortKey]
  );
  const selected = selectedId ? filtered.find((entity) => entity.id === selectedId) || null : null;
  const hasActiveFilters = query.trim().length > 0 || typeFilter !== "all" || statusFilter !== "active" || scopeFilter !== "all" || sortKey !== "name";
  const attentionCount = entities.filter(needsAttention).length;

  useEffect(() => {
    if (!selectedId || typeof window === "undefined" || window.innerWidth >= 1280) return;
    window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }, [selectedId]);

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("active");
    setScopeFilter("all");
    setSortKey("name");
    setSelectedId("");
  }

  async function archiveEntity(entity: WorkforceEntity) {
    if (!window.confirm(`Archive ${entity.name}? This keeps the record but removes it from active workforce use.`)) return;
    setNotice(null);
    try {
      await api(`/v1/workforce/${entity.id}`, { method: "DELETE" });
      setNotice({ tone: "success", title: `${entity.name} was archived.` });
      setSelectedId("");
      refresh();
    } catch (error) {
      setNotice({ tone: "error", title: userErrorMessage(error, t) });
    }
  }

  async function deleteEntity(entity: WorkforceEntity) {
    if (!window.confirm(`Delete ${entity.name}? This permanently removes the workforce record, but does not delete a user account or Paperclip runtime.`)) return;
    setNotice(null);
    try {
      await api(`/v1/workforce/${entity.id}/actions/delete`, { method: "POST" });
      setNotice({ tone: "success", title: `${entity.name} was deleted.` });
      setSelectedId("");
      refresh();
    } catch (error) {
      setNotice({ tone: "error", title: userErrorMessage(error, t) });
    }
  }

  return (
    <Shell activeArea="06-kadry">
      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "People / Agents packet is unavailable."} live /> : null}
      {notice ? <CcNotice tone={notice.tone} title={notice.title} live /> : null}

      {packet.status === "ready" ? (
        <section className={`grid min-h-[calc(100vh-10rem)] gap-4 ${selected ? "xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]" : ""}`}>
          <main className="roost-work-surface grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-company p-3">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary">06 People / Agents</p>
                <h1 className="truncate text-xl font-black text-company-ink">Directory</h1>
                <p className="text-sm text-company-muted">{filtered.length} of {entities.length} workforce records visible</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CcButton iconLeft="ph-plus" onClick={() => setEditingEntity(null)} size="sm" variant="primary">New entity</CcButton>
              </div>
            </header>

            <div className="roost-work-panel grid gap-2 rounded-company p-2.5">
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "All"],
                  ["humans", "Humans"],
                  ["agents", "Agents"],
                  ["directors", "Directors"],
                  ["attention", `Needs attention${attentionCount ? ` (${attentionCount})` : ""}`]
                ] as Array<[ScopeFilter, string]>).map(([scope, label]) => (
                  <button
                    className={`btn btn-sm whitespace-nowrap ${scopeFilter === scope ? "btn-primary" : "btn-outline"}`}
                    key={scope}
                    onClick={() => setScopeFilter(scope)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem_max-content] 2xl:items-center">
              <label className="input input-bordered flex min-w-0 items-center gap-2 bg-base-100/65">
                <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
                <span className="sr-only">Search workforce</span>
                <input className="grow" onChange={(event) => setQuery(event.target.value)} placeholder="Search people, agents, roles..." type="search" value={query} />
              </label>
              <select aria-label="Type filter" className="select select-bordered" onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} value={typeFilter}>
                <option value="all">All types</option>
                <option value="human">Humans</option>
                <option value="agent">Agents</option>
              </select>
              <select aria-label="Status filter" className="select select-bordered" onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}>
                <option value="all">All statuses</option>
                {["active", "inactive", "paused", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select aria-label="Sort workforce" className="select select-bordered" onChange={(event) => setSortKey(event.target.value as SortKey)} value={sortKey}>
                <option value="name">Name</option>
                <option value="department">Department</option>
                <option value="updated">Updated</option>
                <option value="work">Active work</option>
                <option value="tools">Tools</option>
                <option value="knowledge">Knowledge</option>
              </select>
              <CcButton className="whitespace-nowrap md:col-span-2 2xl:col-span-1" disabled={!hasActiveFilters} iconLeft="ph-x-circle" onClick={clearFilters} size="sm" variant="ghost">Clear</CcButton>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-base-300/70 pt-2">
                {(["comfortable", "compact"] as DensityMode[]).map((mode) => (
                  <button className={`btn btn-xs ${density === mode ? "btn-primary" : "btn-outline"}`} key={mode} onClick={() => setDensity(mode)} type="button">
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto">
                {filtered.length ? (
                  <div className="grid gap-2">
                    {filtered.map((entity) => (
                      <article className={`grid gap-2 rounded-company border text-left transition hover:border-primary hover:bg-primary/5 ${density === "compact" ? "p-2" : "p-3"} ${selected?.id === entity.id ? "border-primary/60 bg-primary/10" : "border-base-300 bg-base-100/70"}`} key={entity.id}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            {density === "comfortable" ? <EntityAvatar entity={entity} /> : null}
                            <div className="min-w-0">
                              <strong className="block break-words leading-5 text-company-ink">{entity.name}</strong>
                              <span className="block break-words text-sm leading-5 text-company-muted">{entity.role || "Unassigned role"} - {entity.department || "06-kadry"}</span>
                            </div>
                          </div>
                          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                            <span className={`badge badge-sm ${badgeTone(entity.status)}`}>{entity.status}</span>
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <RowAction icon="ph-eye" label="Preview" onClick={() => {
                                setSelectedId(entity.id);
                                setDetailTab("profile");
                              }} tone="outline" />
                              <RowAction icon="ph-pencil-simple" label="Edit" onClick={() => setEditingEntity(entity)} />
                              <RowAction disabled={entity.status === "archived"} icon="ph-archive" label="Archive" onClick={() => archiveEntity(entity)} />
                              <RowAction disabled={entity.source === "user"} icon="ph-trash" label={entity.source === "user" ? "User-backed owner record cannot be deleted" : "Delete"} onClick={() => deleteEntity(entity)} tone="error" />
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-1 text-xs text-company-muted sm:grid-cols-3 lg:grid-cols-6">
                          <span className="truncate"><strong className="text-company-ink">{typeLabel(entity.type)}</strong></span>
                          <span className="truncate">{entity.hierarchyLevel || runtimeLabels[entity.runtimeMode]}</span>
                          <span className="truncate">Paperclip {paperclipRuntime(entity)}</span>
                          <span className="truncate">{listCount(entity.skillIndex)} skills</span>
                          <span className="truncate">{listCount(entity.knowledgeIndex)} knowledge</span>
                          <span className="truncate">{listCount(entity.toolIndex)} tools</span>
                          <span className="truncate">{entity.work?.summary.active ?? 0} active work</span>
                        </div>
                        <div className="grid gap-1 text-xs text-company-muted sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <span className="truncate">Manager: {entity.manager?.name || "No manager"}</span>
                          <span className="truncate">{bigFiveSummary(entity)}</span>
                        </div>
                        {needsAttention(entity) ? (
                          <p className="text-xs font-bold text-warning">
                            {entity.readiness?.nextAction || "Profile needs completion"}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-full place-items-center rounded-company border border-dashed border-base-300 p-8 text-center">
                    <div>
                      <i className="ph-bold ph-users-three text-3xl text-company-muted" aria-hidden="true"></i>
                      <h2 className="mt-3 font-black text-company-ink">No matching workforce entities</h2>
                      <p className="mt-1 text-sm text-company-muted">Clear filters or create the first person/agent profile.</p>
                    </div>
                  </div>
                )}
              </div>
            </main>

            {selected ? (
              <div className="order-first xl:order-none" ref={detailPanelRef}>
                <DetailPanel
                  entity={selected}
                  onArchive={archiveEntity}
                  onClose={() => setSelectedId("")}
                  onDelete={deleteEntity}
                  onEdit={setEditingEntity}
                  setTab={setDetailTab}
                  tab={detailTab}
                />
              </div>
            ) : null}
        </section>
      ) : null}

      {editingEntity !== undefined ? (
        <WorkforceForm
          entity={editingEntity}
          managers={entities}
          dictionaries={packet.data?.dictionaries}
          onClose={() => setEditingEntity(undefined)}
          onSaved={refresh}
        />
      ) : null}
    </Shell>
  );
}
