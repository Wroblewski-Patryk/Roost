import { FormEvent, useMemo, useState } from "react";
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
type DetailTab = "profile" | "sync" | "files";
type ScopeFilter = "all" | "humans" | "agents" | "attention";
type SortKey = "name" | "department" | "updated" | "sync";
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

function syncLabel(entity: WorkforceEntity) {
  if (entity.type !== "agent") return "human record";
  if (!entity.synchronizationEnabled) return "sync off";
  return entity.syncStatus || "not_synced";
}

function typeLabel(type: WorkforceEntity["type"]) {
  return type === "human" ? "Human" : "Agent";
}

function isSyncBlocked(entity: WorkforceEntity) {
  return entity.type === "agent" && (!entity.synchronizationEnabled || !entity.paperclipAgentId);
}

function needsAttention(entity: WorkforceEntity) {
  return !entity.role
    || !entity.description
    || entity.status !== "active"
    || isSyncBlocked(entity)
    || entity.syncStatus === "failed"
    || entity.syncStatus === "stale";
}

function readinessItems(entity: WorkforceEntity) {
  return [
    {
      label: "Role assigned",
      done: Boolean(entity.role),
      detail: entity.role || "Add the working role."
    },
    {
      label: "Responsibilities written",
      done: Boolean(entity.description?.trim()),
      detail: entity.description ? "Description feeds generated markdown." : "Add responsibilities before sync."
    },
    {
      label: "Active status",
      done: entity.status === "active",
      detail: entity.status === "active" ? "Available for work." : `Current status: ${entity.status}.`
    },
    {
      label: "Runtime link",
      done: entity.type === "human" || Boolean(entity.paperclipAgentId),
      detail: entity.type === "human" ? "Human records do not need Paperclip." : entity.paperclipAgentId || "Link a Paperclip agent ID."
    },
    {
      label: "Sync enabled",
      done: entity.type === "human" || entity.synchronizationEnabled,
      detail: entity.type === "human" ? "Human record only." : entity.synchronizationEnabled ? "Manual sync can be queued." : "Enable sync before runtime update."
    }
  ];
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

function entityMatches(entity: WorkforceEntity, query: string, type: TypeFilter, status: StatusFilter, scope: ScopeFilter) {
  if (scope === "humans" && entity.type !== "human") return false;
  if (scope === "agents" && entity.type !== "agent") return false;
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
    entity.paperclipAgentId,
    entity.model
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
    if (sort === "sync") {
      return syncLabel(a).localeCompare(syncLabel(b)) || a.name.localeCompare(b.name);
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
    synchronizationEnabled: true
  };
}

function WorkforceForm({
  entity,
  managers,
  onClose,
  onSaved
}: {
  entity?: WorkforceEntity | null;
  managers: WorkforceEntity[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const values = entity || defaultEntity();

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
      synchronizationEnabled: form.get("synchronizationEnabled") === "on"
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
              {["active", "inactive", "paused", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <CcField label="Department">
            {({ id }) => <CcTextInput defaultValue={values.department || "06-kadry"} id={id} name="department" />}
          </CcField>
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
              {["analytical", "creative", "executive", "supportive", "researcher", "custom"].map((profile) => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">Runtime mode</span></span>
            <select className="select select-bordered" defaultValue={values.runtimeMode || "manual"} name="runtimeMode">
              {Object.entries(runtimeLabels).map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}
            </select>
          </label>
          <CcField label="Model">
            {({ id }) => <CcTextInput defaultValue={values.model || ""} id={id} name="model" placeholder="gpt-5.4, claude, local..." />}
          </CcField>
          <CcField label="Paperclip agent ID">
            {({ id }) => <CcTextInput defaultValue={values.paperclipAgentId || ""} id={id} name="paperclipAgentId" />}
          </CcField>
          <label className="label cursor-pointer justify-start gap-3 md:col-span-2">
            <input className="toggle toggle-primary" defaultChecked={Boolean(values.synchronizationEnabled)} name="synchronizationEnabled" type="checkbox" />
            <span className="label-text font-bold">Enable Paperclip synchronization</span>
          </label>
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
  onSync,
  onArchive
}: {
  entity: WorkforceEntity | null;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  onEdit: (entity: WorkforceEntity) => void;
  onSync: (entity: WorkforceEntity) => void;
  onArchive: (entity: WorkforceEntity) => void;
}) {
  if (!entity) {
    return (
      <aside className="roost-work-surface grid place-items-center rounded-company p-5 text-center">
        <div>
          <i className="ph-bold ph-user-list text-4xl text-company-muted" aria-hidden="true"></i>
          <h2 className="mt-3 font-black text-company-ink">Select a person or agent</h2>
          <p className="mt-1 text-sm text-company-muted">Profiles, sync state, and generated Paperclip files appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="roost-work-surface grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 rounded-company p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <EntityAvatar entity={entity} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-company-ink">{entity.name}</h2>
            <p className="text-sm text-company-muted">{entity.role || "Unassigned role"} - {entity.department || "06-kadry"}</p>
            <p className="mt-1 text-xs font-bold uppercase text-company-muted">{typeLabel(entity.type)} / {runtimeLabels[entity.runtimeMode]} / {syncLabel(entity)}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <CcButton iconLeft="ph-pencil-simple" onClick={() => onEdit(entity)} size="sm" variant="outline">Edit</CcButton>
          {entity.status !== "archived" ? (
            <CcButton iconLeft="ph-archive" onClick={() => onArchive(entity)} size="sm" variant="ghost">Archive</CcButton>
          ) : null}
        </div>
      </header>

      <div className="join">
        {(["profile", "sync", "files"] as DetailTab[]).map((item) => (
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
                  {readinessItems(entity).filter((item) => item.done).length} / {readinessItems(entity).length} ready
                </span>
              </div>
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
              <div><dt className="font-bold text-company-muted">Paperclip ID</dt><dd className="break-all">{entity.paperclipAgentId || "Not linked"}</dd></div>
              <div><dt className="font-bold text-company-muted">Sync enabled</dt><dd>{entity.synchronizationEnabled ? "yes" : "no"}</dd></div>
              <div className="md:col-span-2"><dt className="font-bold text-company-muted">Description</dt><dd className="mt-1 leading-6">{entity.description || "No responsibilities written yet."}</dd></div>
            </dl>
          </section>
        ) : null}

        {tab === "sync" ? (
          <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-company-ink">Paperclip runtime sync</h3>
                  <p className="text-sm text-company-muted">CompanyCore remains source of truth; Paperclip receives generated files and config.</p>
                </div>
                <CcButton disabled={entity.type !== "agent" || !entity.synchronizationEnabled} iconLeft="ph-arrows-clockwise" onClick={() => onSync(entity)} variant="primary">Manual sync</CcButton>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`badge ${badgeTone(entity.syncStatus)}`}>{entity.syncStatus || "not_synced"}</span>
                <span className="badge badge-outline">{entity.paperclipAgentId || entity.slug}</span>
              </div>
            </div>
            <div className="grid gap-2">
              {(entity.syncLog || []).length ? entity.syncLog!.slice().reverse().map((entry, index) => (
                <div className="rounded-company border border-base-300 bg-base-100 p-3 text-sm" key={`${entry.at}-${index}`}>
                  <strong className="text-company-ink">{entry.status || "log"}</strong>
                  <p className="text-company-muted">{entry.message || "Sync event recorded."}</p>
                  {entry.at ? <span className="text-xs text-company-muted">{entry.at}</span> : null}
                </div>
              )) : <p className="text-sm text-company-muted">No sync log yet.</p>}
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editingEntity, setEditingEntity] = useState<WorkforceEntity | null | undefined>(undefined);
  const [notice, setNotice] = useState<RouteNotice | null>(null);
  const packet = useOwnerPacket<WorkforcePacket>(`/v1/workforce?refresh=${refreshKey}`, true, t);
  const entities = packet.data?.entities || [];
  const filtered = useMemo(
    () => sortEntities(entities.filter((entity) => entityMatches(entity, query, typeFilter, statusFilter, scopeFilter)), sortKey),
    [entities, query, typeFilter, statusFilter, scopeFilter, sortKey]
  );
  const selected = filtered.find((entity) => entity.id === selectedId) || filtered[0] || null;
  const hasActiveFilters = query.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all" || scopeFilter !== "all" || sortKey !== "name";
  const attentionCount = entities.filter(needsAttention).length;

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setScopeFilter("all");
    setSortKey("name");
  }

  async function syncEntity(entity: WorkforceEntity) {
    setNotice("");
    try {
      await api(`/v1/workforce/${entity.id}/actions/sync`, { method: "POST" });
      setNotice({ tone: "success", title: "Paperclip synchronization was queued." });
      refresh();
      setDetailTab("sync");
    } catch (error) {
      setNotice({ tone: "error", title: userErrorMessage(error, t) });
    }
  }

  async function archiveEntity(entity: WorkforceEntity) {
    if (!window.confirm(`Archive ${entity.name}? This keeps the record but removes it from active workforce use.`)) return;
    setNotice("");
    try {
      await api(`/v1/workforce/${entity.id}`, { method: "DELETE" });
      setNotice({ tone: "success", title: `${entity.name} was archived.` });
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
        <section className="grid min-h-[calc(100vh-10rem)] gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
          <main className="roost-work-surface grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-company p-3">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary">06 People / Agents</p>
                <h1 className="truncate text-xl font-black text-company-ink">Directory</h1>
                <p className="text-sm text-company-muted">{filtered.length} of {entities.length} workforce records visible</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected ? <CcButton iconLeft="ph-pencil-simple" onClick={() => setEditingEntity(selected)} size="sm" variant="outline">Edit selected</CcButton> : null}
                <CcButton iconLeft="ph-plus" onClick={() => setEditingEntity(null)} size="sm" variant="primary">New entity</CcButton>
              </div>
            </header>

            <div className="roost-work-panel grid gap-2 rounded-company p-2.5">
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "All"],
                  ["humans", "Humans"],
                  ["agents", "Agents"],
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
                <option value="sync">Sync state</option>
              </select>
              <CcButton className="whitespace-nowrap md:col-span-2 2xl:col-span-1" disabled={!hasActiveFilters} iconLeft="ph-x-circle" onClick={clearFilters} size="sm" variant="ghost">Clear</CcButton>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto">
                {filtered.length ? (
                  <div className="grid gap-2">
                    {filtered.map((entity) => (
                      <button className={`grid gap-2 rounded-company border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${selected?.id === entity.id ? "border-primary/60 bg-primary/10" : "border-base-300 bg-base-100/70"}`} key={entity.id} onClick={() => {
                        setSelectedId(entity.id);
                        setDetailTab("profile");
                      }} type="button">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <EntityAvatar entity={entity} />
                            <div className="min-w-0">
                              <strong className="block truncate text-company-ink">{entity.name}</strong>
                              <span className="block truncate text-sm text-company-muted">{entity.role || "Unassigned role"} - {entity.department || "06-kadry"}</span>
                            </div>
                          </div>
                          <span className={`badge badge-sm shrink-0 ${badgeTone(entity.status)}`}>{entity.status}</span>
                        </div>
                        <div className="grid gap-1 text-xs text-company-muted sm:grid-cols-3">
                          <span className="truncate"><strong className="text-company-ink">{typeLabel(entity.type)}</strong></span>
                          <span className="truncate">{runtimeLabels[entity.runtimeMode]}</span>
                          <span className="truncate">{syncLabel(entity)}</span>
                        </div>
                        {needsAttention(entity) ? (
                          <p className="text-xs font-bold text-warning">
                            {isSyncBlocked(entity) ? "Runtime link needs setup" : "Profile needs completion"}
                          </p>
                        ) : null}
                      </button>
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

            <DetailPanel entity={selected} onArchive={archiveEntity} onEdit={setEditingEntity} onSync={syncEntity} setTab={setDetailTab} tab={detailTab} />
        </section>
      ) : null}

      {editingEntity !== undefined ? (
        <WorkforceForm
          entity={editingEntity}
          managers={entities}
          onClose={() => setEditingEntity(undefined)}
          onSaved={refresh}
        />
      ) : null}
    </Shell>
  );
}
