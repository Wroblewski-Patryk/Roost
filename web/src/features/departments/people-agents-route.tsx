import { FormEvent, useId, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn, type CcTableRowAction } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { WorkforceEntity, WorkforcePacket } from "../../types";

type DetailTab = "profile" | "access" | "work" | "authority" | "files";
type RouteNotice = { tone: "success" | "error"; title: string };
type ConfirmAction = { type: "archive" | "delete"; entity: WorkforceEntity } | null;

const runtimeLabels: Record<WorkforceEntity["runtimeMode"], string> = {
  manual: "Manual",
  semi_autonomous: "Semi-autonomous",
  autonomous: "Autonomous"
};

const bigFiveTraits = [
  { key: "openness", label: "Openness", short: "O" },
  { key: "conscientiousness", label: "Conscientiousness", short: "C" },
  { key: "extraversion", label: "Extraversion", short: "E" },
  { key: "agreeableness", label: "Agreeableness", short: "A" },
  { key: "neuroticism", label: "Neuroticism", short: "N" }
] as const;

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

function normalizedBigFive(profile?: Record<string, number>) {
  return bigFiveTraits.map((trait) => ({
    ...trait,
    value: Math.min(5, Math.max(0, Number(profile?.[trait.key] ?? 0)))
  }));
}

function radarPoint(index: number, value: number, radius = 78, center = 96) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / bigFiveTraits.length;
  const distance = (value / 5) * radius;
  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance
  };
}

function radarRingPoints(level: number, radius = 78, center = 96) {
  return bigFiveTraits
    .map((_, index) => {
      const point = radarPoint(index, level, radius, center);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function BigFiveRadarChart({
  profile,
  compact = false
}: {
  profile?: Record<string, number>;
  compact?: boolean;
}) {
  const gradientId = `big-five-radar-${useId().replace(/:/g, "")}`;
  const traits = normalizedBigFive(profile);
  const polygon = traits
    .map((trait, index) => {
      const point = radarPoint(index, trait.value);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
  const strongest = [...traits].sort((left, right) => right.value - left.value).slice(0, 2);

  return (
    <div className={`rounded-company border border-base-300 bg-base-100/75 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">Big Five</p>
          <h3 className="mt-1 font-black text-company-ink">Personality shape</h3>
        </div>
        <div className="text-right text-xs font-bold text-company-muted">
          {strongest.map((trait) => `${trait.short} ${trait.value}`).join(" / ")}
        </div>
      </div>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center"}`}>
        <svg className="mx-auto h-52 w-52 max-w-full" role="img" viewBox="0 0 192 192" aria-label="Big Five radar chart">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(79, 70, 229)" stopOpacity="0.36" />
              <stop offset="100%" stopColor="rgb(14, 165, 233)" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          {[1, 2, 3, 4, 5].map((level) => (
            <polygon
              className="fill-none stroke-base-300"
              key={level}
              points={radarRingPoints(level)}
              strokeWidth={level === 5 ? 1.4 : 1}
            />
          ))}
          {bigFiveTraits.map((trait, index) => {
            const edge = radarPoint(index, 5);
            const label = radarPoint(index, 5.72);
            return (
              <g key={trait.key}>
                <line className="stroke-base-300" x1="96" x2={edge.x} y1="96" y2={edge.y} strokeWidth="1" />
                <text
                  className="fill-company-muted text-[9px] font-bold"
                  textAnchor={label.x < 84 ? "end" : label.x > 108 ? "start" : "middle"}
                  x={label.x}
                  y={label.y}
                >
                  {trait.short}
                </text>
              </g>
            );
          })}
          <polygon points={polygon} fill={`url(#${gradientId})`} stroke="rgb(79, 70, 229)" strokeLinejoin="round" strokeWidth="2.5" />
          {traits.map((trait, index) => {
            const point = radarPoint(index, trait.value);
            return <circle className="fill-primary stroke-base-100" cx={point.x} cy={point.y} key={trait.key} r="4" strokeWidth="2" />;
          })}
        </svg>
        <div className="grid gap-2">
          {traits.map((trait) => (
            <div className="grid grid-cols-[minmax(7rem,1fr)_2.5rem] items-center gap-2 text-sm" key={trait.key}>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-company-ink">{trait.label}</span>
                  <span className="font-black text-primary">{trait.value}/5</span>
                </div>
                <progress className="progress progress-primary h-1.5 w-full" max={5} value={trait.value}></progress>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-company border border-base-300 bg-base-200/70 text-xs font-black text-company-muted">{trait.short}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  mode = "edit",
  managers,
  dictionaries,
  onClose,
  onSaved
}: {
  entity?: WorkforceEntity | null;
  mode?: "create" | "edit";
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
  const isEditMode = mode === "edit" && Boolean(entity?.id);
  const [bigFiveDraft, setBigFiveDraft] = useState<Record<string, number>>(() => {
    const current = values.bigFiveProfile || {};
    return Object.fromEntries(bigFiveTraits.map((trait) => [trait.key, Number(current[trait.key] ?? 0)]));
  });

  function updateBigFiveValue(key: string, value: string) {
    const nextValue = Math.min(5, Math.max(0, Number(value || 0)));
    setBigFiveDraft((current) => ({ ...current, [key]: nextValue }));
  }

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
      await api(isEditMode ? `/v1/workforce/${entity!.id}` : "/v1/workforce", {
        method: isEditMode ? "PATCH" : "POST",
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral/60 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="workforce-form-title">
      <form className="roost-work-surface grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-company shadow-2xl" onSubmit={submit}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 bg-base-100/45 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-primary">06 People / Agents</p>
            <h2 className="mt-1 text-2xl font-black text-company-ink" id="workforce-form-title">{isEditMode ? "Edit workforce entity" : entity ? "Duplicate workforce entity" : "New workforce entity"}</h2>
            <p className="mt-1 text-sm text-company-muted">{isEditMode ? "Update identity, responsibility, runtime access, and generated context." : "Create a human or AI workforce record connected to CompanyCore truth."}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="hidden rounded-company border border-base-300 bg-base-100/75 px-3 py-2 text-right text-xs font-bold text-company-muted sm:block">
              <span className="block text-company-ink">{typeLabel((values.type || "agent") as WorkforceEntity["type"])}</span>
              <span>{values.status || "active"} / {runtimeLabels[(values.runtimeMode || "manual") as WorkforceEntity["runtimeMode"]]}</span>
            </div>
            <button className="btn btn-ghost btn-sm btn-circle" aria-label="Close" onClick={onClose} type="button">
              <i className="ph-bold ph-x" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 sm:px-5">
          {error ? <CcNotice tone="error" title={error} live /> : null}

          <section className="grid gap-4 py-4">
            <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-company-ink">Identity and role</h3>
                  <p className="text-sm text-company-muted">The canonical CompanyCore identity shown in rosters and generated context files.</p>
                </div>
                <span className="rounded-company border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-black uppercase text-primary">source of truth</span>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <CcField label="Name" required>
                  {({ id }) => <CcTextInput autoFocus={!isEditMode} defaultValue={values.name || ""} id={id} name="name" required />}
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
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
                <h3 className="font-black text-company-ink">Runtime and personality</h3>
                <p className="text-sm text-company-muted">Runtime metadata stays in CompanyCore; Paperclip remains the execution layer.</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
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
                </div>
                <fieldset className="mt-4 grid gap-2 rounded-company border border-base-300 bg-base-200/30 p-3">
                  <legend className="px-1 text-sm font-bold text-company-muted">Big Five values</legend>
                  <div className="grid gap-2 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
                    {bigFiveTraits.map((trait) => (
                      <label className="form-control" key={trait.key}>
                        <span className="label"><span className="label-text text-xs font-bold">{trait.label}</span></span>
                        <input
                          className="input input-bordered"
                          max={5}
                          min={0}
                          name={`bigFive${trait.label}`}
                          onChange={(event) => updateBigFiveValue(trait.key, event.target.value)}
                          step={1}
                          type="number"
                          value={bigFiveDraft[trait.key] ?? 0}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <BigFiveRadarChart profile={bigFiveDraft} compact />
            </div>

            <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
              <h3 className="font-black text-company-ink">Access indexes</h3>
              <p className="text-sm text-company-muted">One item per line or comma-separated. These names become the first lightweight map of skills, knowledge, tools, and authority.</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {[
                  ["skillIndex", "Skills index", values.skillIndex],
                  ["knowledgeIndex", "Knowledge index", values.knowledgeIndex],
                  ["toolIndex", "Tools index", values.toolIndex],
                  ["authorityScope", "Authority scope", values.authorityScope]
                ].map(([name, label, value]) => (
                  <label className="form-control" key={String(name)}>
                    <span className="label"><span className="label-text font-bold">{label}</span></span>
                    <textarea
                      className="textarea textarea-bordered min-h-24"
                      defaultValue={Array.isArray(value) ? value.join("\n") : ""}
                      name={String(name)}
                      placeholder="One item per line"
                    ></textarea>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 p-4 sm:p-5">
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

function DetailModal({
  entity,
  tab,
  setTab,
  onEdit,
  onArchive,
  onDelete,
  onClose
}: {
  entity: WorkforceEntity;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  onEdit: (entity: WorkforceEntity) => void;
  onArchive: (entity: WorkforceEntity) => void;
  onDelete: (entity: WorkforceEntity) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-neutral/60 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="workforce-preview-title">
    <aside className="roost-work-surface grid max-h-[92vh] w-full max-w-6xl min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden rounded-company p-4 shadow-2xl sm:p-5">
      <header className="grid gap-3 rounded-company border border-base-300 bg-base-100/50 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <EntityAvatar entity={entity} />
          <div className="min-w-0 space-y-2">
            <div>
              <h2 className="break-words text-xl font-black leading-6 text-company-ink sm:text-2xl" id="workforce-preview-title">{entity.name}</h2>
              <p className="text-sm text-company-muted">{entity.role || "Unassigned role"} / {entity.department || "06-kadry"}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge badge-outline">{typeLabel(entity.type)}</span>
              <span className={`badge ${badgeTone(entity.status)}`}>{entity.status}</span>
              <span className="badge badge-outline">{runtimeLabels[entity.runtimeMode]}</span>
              <span className={`badge ${badgeTone(paperclipRuntime(entity))}`}>runtime {paperclipRuntime(entity)}</span>
            </div>
            <p className="text-xs font-bold uppercase text-company-muted">
              {entity.hierarchyLevel || "No hierarchy"} / manager {entity.manager?.name || "none"} / {entity.directReportCount ?? 0} direct reports
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <CcButton iconLeft="ph-pencil-simple" onClick={() => onEdit(entity)} size="sm" variant="outline">Edit</CcButton>
          {entity.status !== "archived" ? (
            <CcButton iconLeft="ph-archive" onClick={() => onArchive(entity)} size="sm" variant="ghost">Archive</CcButton>
          ) : null}
          {entity.source !== "user" ? (
            <CcButton iconLeft="ph-trash" onClick={() => onDelete(entity)} size="sm" variant="ghost">Delete</CcButton>
          ) : null}
          <CcButton iconLeft="ph-x" onClick={onClose} size="sm" variant="ghost">Close</CcButton>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["profile", "access", "work", "authority", "files"] as DetailTab[]).map((item) => (
          <button className={`btn btn-sm ${tab === item ? "btn-primary" : "btn-outline"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto">
        {tab === "profile" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
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
              {[
                ["Slug", entity.slug],
                ["Manager", entity.manager?.name || "No manager"],
                ["Personality", entity.personalityProfile],
                ["Model", entity.model || "Not configured"],
                ["Hierarchy", entity.hierarchyLevel || "Not configured"],
                ["Paperclip", entity.paperclipAgentId || "Not linked"],
                ["Direct reports", String(entity.directReportCount ?? 0)],
                ["Big Five", bigFiveSummary(entity)]
              ].map(([label, value]) => (
                <div className="rounded-company border border-base-300 bg-base-100/75 p-3" key={label}>
                  <dt className="text-xs font-black uppercase tracking-wide text-company-muted">{label}</dt>
                  <dd className="mt-1 break-words font-bold text-company-ink">{value}</dd>
                </div>
              ))}
              <div className="rounded-company border border-base-300 bg-base-100/75 p-3 md:col-span-2">
                <dt className="text-xs font-black uppercase tracking-wide text-company-muted">Description</dt>
                <dd className="mt-1 leading-6 text-company-ink">{entity.description || "No responsibilities written yet."}</dd>
              </div>
            </dl>
            </div>
            <BigFiveRadarChart profile={entity.bigFiveProfile} compact />
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
    </div>
  );
}

function ConfirmEntityModal({
  action,
  entity,
  onCancel,
  onConfirm
}: {
  action: "archive" | "delete";
  entity: WorkforceEntity;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action === "delete";
  return (
    <dialog className="modal modal-open" open>
      <div className="modal-box max-w-xl border border-base-300 bg-base-100">
        <button className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" aria-label="Close" onClick={onCancel} type="button">
          <i className="ph-bold ph-x" aria-hidden="true"></i>
        </button>
        <p className={`text-sm font-black uppercase ${isDelete ? "text-error" : "text-warning"}`}>
          {isDelete ? "Delete workforce record" : "Archive workforce record"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-company-ink">{entity.name}</h2>
        <p className="mt-3 text-sm leading-6 text-company-muted">
          {isDelete
            ? "This permanently removes the workforce record. It does not delete a user account or the Paperclip runtime, but the CompanyCore source-of-truth row will be gone."
            : "This keeps the record for history, but removes it from active workforce use."}
        </p>
        <div className="mt-4 rounded-company border border-base-300 bg-base-200/50 p-3 text-sm">
          <strong className="text-company-ink">{typeLabel(entity.type)}</strong>
          <span className="mx-2 text-company-muted">/</span>
          <span>{entity.role || "Unassigned role"}</span>
          <span className="mx-2 text-company-muted">/</span>
          <span>{entity.department || "No department"}</span>
        </div>
        <div className="modal-action">
          <CcButton onClick={onCancel} variant="ghost">Cancel</CcButton>
          <CcButton iconLeft={isDelete ? "ph-trash" : "ph-archive"} onClick={onConfirm} variant={isDelete ? "danger" : "warning"}>
            {isDelete ? "Delete" : "Archive"}
          </CcButton>
        </div>
      </div>
      <form className="modal-backdrop" method="dialog">
        <button onClick={onCancel}>close</button>
      </form>
    </dialog>
  );
}

export function PeopleAgentsRoute() {
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editingEntity, setEditingEntity] = useState<{ entity?: WorkforceEntity | null; mode?: "create" | "edit" } | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState<RouteNotice | null>(null);
  const packet = useOwnerPacket<WorkforcePacket>(`/v1/workforce?refresh=${refreshKey}`, true, t);
  const entities = packet.data?.entities || [];
  const selected = selectedId ? entities.find((entity) => entity.id === selectedId) || null : null;
  const duplicateEntity = (entity: WorkforceEntity): WorkforceEntity => ({
    ...entity,
    id: "",
    name: `${entity.name} copy`,
    slug: `${entity.slug || entity.name.toLowerCase().replace(/\s+/g, "-")}-copy`,
    paperclipAgentId: null,
    source: "manual",
    externalId: null,
    syncStatus: "not_synced",
    syncLog: [],
    createdAt: undefined,
    updatedAt: undefined
  });
  const tableColumns = useMemo<Array<CcTableColumn<WorkforceEntity>>>(() => [
    {
      key: "person",
      header: "Person / Agent",
      mobileLabel: "Record",
      required: true,
      sortable: true,
      sortValue: (entity) => entity.name,
      searchValue: (entity) => [
        entity.name,
        entity.slug,
        entity.role,
        entity.department,
        entity.model,
        entity.hierarchyLevel,
        ...(entity.skillIndex || []),
        ...(entity.knowledgeIndex || []),
        ...(entity.toolIndex || [])
      ].filter(Boolean).join(" "),
      className: "min-w-[13rem]",
      cell: (entity) => (
        <div className="flex min-w-0 items-center gap-3">
          <EntityAvatar entity={entity} />
          <div className="min-w-0">
            <strong className="block truncate text-company-ink">{entity.name}</strong>
          </div>
        </div>
      )
    },
    {
      key: "kind",
      header: "Kind",
      mobileLabel: "Kind",
      filterable: true,
      filterLabel: "Type",
      filterValue: (entity) => entity.type,
      filterOptions: [
        { value: "human", label: "Human" },
        { value: "agent", label: "Agent" }
      ],
      sortable: true,
      cell: (entity) => <span className="font-bold text-company-ink">{typeLabel(entity.type)}</span>
    },
    {
      key: "role",
      header: "Role",
      mobileLabel: "Role",
      className: "min-w-[12rem]",
      sortable: true,
      sortValue: (entity) => entity.role || "",
      cell: (entity) => <span className="block truncate text-company-ink">{entity.role || "Unassigned role"}</span>
    },
    {
      key: "department",
      header: "Department",
      mobileLabel: "Department",
      className: "w-32 min-w-32",
      sortable: true,
      sortValue: (entity) => entity.department || "",
      cell: (entity) => <span className="block truncate text-company-ink">{entity.department || "06-kadry"}</span>
    },
    {
      key: "manager",
      header: "Manager",
      mobileLabel: "Manager",
      className: "w-36 min-w-36",
      visibleByDefault: false,
      sortable: true,
      sortValue: (entity) => entity.manager?.name || "",
      cell: (entity) => <span className="block truncate">{entity.manager?.name || "No manager"}</span>
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      className: "w-24 min-w-24",
      filterable: true,
      filterLabel: "Status",
      filterValue: (entity) => entity.status,
      filterOptions: [
        { value: "active", label: "active" },
        { value: "inactive", label: "inactive" },
        { value: "paused", label: "paused" },
        { value: "archived", label: "archived" }
      ],
      sortable: true,
      cell: (entity) => <span className={`badge badge-sm ${badgeTone(entity.status)}`}>{entity.status}</span>
    },
    {
      key: "runtime",
      header: "Runtime",
      mobileLabel: "Runtime",
      className: "w-36 min-w-36",
      visibleByDefault: false,
      filterable: true,
      filterLabel: "Runtime",
      filterValue: (entity) => entity.runtimeMode,
      filterOptions: [
        { value: "manual", label: "Manual" },
        { value: "semi_autonomous", label: "Semi-autonomous" },
        { value: "autonomous", label: "Autonomous" }
      ],
      sortable: true,
      sortValue: (entity) => entity.hierarchyLevel || entity.runtimeMode,
      cell: (entity) => <span className="block truncate text-company-ink">{entity.hierarchyLevel || runtimeLabels[entity.runtimeMode]}</span>
    }
  ], []);
  const rowActionItems = useMemo<Array<CcTableRowAction<WorkforceEntity>>>(() => [
    {
      key: "preview",
      label: "Preview",
      icon: "ph-eye",
      tone: "outline",
      onClick: (entity) => {
        setSelectedId(entity.id);
        setDetailTab("profile");
      }
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: "ph-copy",
      tone: "ghost",
      onClick: (entity) => setEditingEntity({ entity: duplicateEntity(entity), mode: "create" })
    },
    {
      key: "edit",
      label: "Edit",
      icon: "ph-pencil-simple",
      tone: "ghost",
      onClick: (entity) => setEditingEntity({ entity, mode: "edit" })
    },
    {
      key: "archive",
      label: "Archive",
      icon: "ph-archive",
      tone: "warning",
      disabled: (entity) => entity.status === "archived",
      onClick: (entity) => setConfirmAction({ type: "archive", entity })
    },
    {
      key: "delete",
      label: "Delete",
      icon: "ph-trash",
      tone: "danger",
      disabled: (entity) => entity.source === "user",
      disabledLabel: () => "User-backed owner record cannot be deleted",
      onClick: (entity) => setConfirmAction({ type: "delete", entity })
    }
  ], []);

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  async function archiveEntity(entity: WorkforceEntity) {
    setNotice(null);
    try {
      await api(`/v1/workforce/${entity.id}`, { method: "DELETE" });
      setNotice({ tone: "success", title: `${entity.name} was archived.` });
      setSelectedId("");
      setConfirmAction(null);
      refresh();
    } catch (error) {
      setNotice({ tone: "error", title: userErrorMessage(error, t) });
    }
  }

  async function deleteEntity(entity: WorkforceEntity) {
    setNotice(null);
    try {
      await api(`/v1/workforce/${entity.id}/actions/delete`, { method: "POST" });
      setNotice({ tone: "success", title: `${entity.name} was deleted.` });
      setSelectedId("");
      setConfirmAction(null);
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
        <section className="grid min-h-[calc(100vh-10rem)] gap-4">
          <main className="roost-work-surface grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-company p-3">
            <header className="grid gap-3 border-b border-base-300 pb-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary">06 People / Agents</p>
                <h1 className="truncate text-xl font-black text-company-ink">Directory</h1>
                <p className="text-sm text-company-muted">Source-of-truth roster for humans, AI directors, responsibilities, runtime context, and generated files.</p>
              </div>
              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                <span className="rounded-company border border-base-300 bg-base-100/70 px-3 py-2 text-xs font-bold text-company-muted">
                  {entities.length} records loaded
                </span>
                <CcButton iconLeft="ph-plus" onClick={() => setEditingEntity({ entity: null, mode: "create" })} size="sm" variant="primary">New entity</CcButton>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto">
              <CcDataTable
                columns={tableColumns}
                density="compact"
                emptyTitle="No matching workforce entities"
                emptyDetail="Clear filters or create the first person/agent profile."
                getRowClassName={(entity) => needsAttention(entity) ? "bg-warning/5" : ""}
                getRowLabel={(entity) => entity.name}
                initialColumnFilters={{ status: "active" }}
                initialPageSize={25}
                initialSort={{ key: "person", direction: "asc" }}
                rowActionItems={rowActionItems}
                rows={entities}
                searchPlaceholder="Search people, agents, roles..."
                tableMinWidthClassName="min-w-[1000px]"
              />
              </div>
            </main>

        </section>
      ) : null}

      {selected ? (
        <DetailModal
          entity={selected}
          onArchive={(entity) => setConfirmAction({ type: "archive", entity })}
          onClose={() => setSelectedId("")}
          onDelete={(entity) => setConfirmAction({ type: "delete", entity })}
          onEdit={(entity) => {
            setSelectedId("");
            setEditingEntity({ entity, mode: "edit" });
          }}
          setTab={setDetailTab}
          tab={detailTab}
        />
      ) : null}

      {editingEntity !== undefined ? (
        <WorkforceForm
          entity={editingEntity.entity}
          mode={editingEntity.mode}
          managers={entities}
          dictionaries={packet.data?.dictionaries}
          onClose={() => setEditingEntity(undefined)}
          onSaved={refresh}
        />
      ) : null}
      {confirmAction ? (
        <ConfirmEntityModal
          action={confirmAction.type}
          entity={confirmAction.entity}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => confirmAction.type === "archive" ? archiveEntity(confirmAction.entity) : deleteEntity(confirmAction.entity)}
        />
      ) : null}
    </Shell>
  );
}
