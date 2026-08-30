import { FormEvent, useId, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, type CcTableColumn, type CcTableRowAction } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcIdentityMark, CcIdentityPicker } from "../../components/cc-identity-picker";
import { CcMultiSelect, type CcMultiSelectOption } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { CcTextInput } from "../../components/cc-text-input";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { CoreAreaKey, WorkforceEntity, WorkforcePacket } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue } from "./shared";

type DetailTab = "profile" | "access" | "work" | "authority" | "files";
type RouteNotice = { tone: "success" | "error"; title: string };
type ConfirmAction = { type: "archive" | "delete"; entity: WorkforceEntity } | null;

const runtimeLabels: Record<WorkforceEntity["runtimeMode"], string> = {
  manual: "Manual",
  semi_autonomous: "Semi-autonomous",
  autonomous: "Autonomous"
};

const bigFiveTraits = [
  { key: "openness", label: "Openness", short: "O", icon: "ph-lightbulb" },
  { key: "conscientiousness", label: "Conscientiousness", short: "C", icon: "ph-list-checks" },
  { key: "extraversion", label: "Extraversion", short: "E", icon: "ph-users-three" },
  { key: "agreeableness", label: "Agreeableness", short: "A", icon: "ph-handshake" },
  { key: "neuroticism", label: "Neuroticism", short: "N", icon: "ph-wave-sine" }
] as const;

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
    .sort((a, b) => normalizeBigFiveScore(b[1]) - normalizeBigFiveScore(a[1]))
    .slice(0, 2)
    .map(([key, value]) => `${key.slice(0, 1).toUpperCase()}${key.slice(1, 3)} ${formatBigFiveScore(value)}`)
    .join(" / ");
}

function normalizedBigFive(profile?: Record<string, number>) {
  return bigFiveTraits.map((trait) => ({
    ...trait,
    value: normalizeBigFiveScore(profile?.[trait.key] ?? 0)
  }));
}

function normalizeBigFiveScore(value: unknown) {
  const numeric = Number(value || 0);
  const normalized = numeric > 1 ? numeric / 5 : numeric;
  return Math.min(1, Math.max(0, normalized));
}

function formatBigFiveScore(value: unknown) {
  return normalizeBigFiveScore(value).toFixed(2);
}

function radarPoint(index: number, value: number, radius = 78, center = 96) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / bigFiveTraits.length;
  const distance = value * radius;
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
        <div className="flex items-center gap-2 text-right text-xs font-bold text-company-muted">
          {strongest.map((trait) => <span className="inline-flex items-center gap-1" key={trait.key}><i className={`ph-bold ${trait.icon}`} aria-hidden="true"></i>{trait.value.toFixed(2)}</span>)}
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
          {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
            <polygon
              className="fill-none stroke-base-300"
              key={level}
              points={radarRingPoints(level)}
              strokeWidth={level === 1 ? 1.4 : 1}
            />
          ))}
          {bigFiveTraits.map((trait, index) => {
            const edge = radarPoint(index, 1);
            const label = radarPoint(index, 1.08);
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
                  <span className="font-black text-primary">{trait.value.toFixed(2)}</span>
                </div>
                <progress className="progress progress-primary h-1.5 w-full" max={1} value={trait.value}></progress>
              </div>
              <span aria-label={trait.label} className="grid h-8 w-8 place-items-center rounded-company border border-base-300 bg-base-200/70 text-company-muted" title={trait.label}>
                <i className={`ph-bold ${trait.icon} text-base`} aria-hidden="true"></i>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function agentRuntime(entity: WorkforceEntity) {
  return entity.runtimeProfile?.runtimeStatus || entity.syncStatus || "not linked";
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
  return <CcIdentityMark className="h-11 w-11 rounded-company" name={entity.name} value={entity.avatar} />;
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
    bigFiveProfile: { openness: 0.8, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.4 },
    skillIndex: [],
    knowledgeIndex: [],
    toolIndex: [],
    authorityScope: []
  };
}

const textareaClassName = "textarea textarea-bordered w-full";

const defaultAccessCatalogs = {
  skillIndex: ["operations", "product-management", "software-engineering", "design", "research", "sales", "finance", "quality-assurance"],
  knowledgeIndex: ["company-context", "procedures", "products", "customers", "architecture", "security", "operations"],
  toolIndex: ["roost", "clickup", "google-drive", "github", "codex", "n8n"],
  authorityScope: ["companycore:read", "companycore:tasks:write", "companycore:workforce:read", "companycore:assets:read", "companycore:procedures:read"]
} as const;

function accessOptions(key: keyof typeof defaultAccessCatalogs, entities: WorkforceEntity[], current: string[] = []): CcMultiSelectOption[] {
  const values = new Set<string>([...defaultAccessCatalogs[key], ...current]);
  for (const entity of entities) {
    for (const value of entity[key] || []) values.add(value);
    if (key === "authorityScope") for (const value of entity.authority?.supportedCapabilities || []) values.add(value);
  }
  return [...values].sort().map((value) => ({ value, label: humanizeBusinessValue(value.replace(/^companycore:/, ""), "People") }));
}

function workforceIdentityLabels(t: ReturnType<typeof useLanguage>["t"]) {
  return {
    initials: t("identity.initials"), icon: t("identity.icon"), image: t("identity.image"),
    chooseFile: t("identity.chooseFile"), replaceFile: t("identity.replaceFile"), removeFile: t("identity.removeFile"),
    imageHint: t("identity.imageHint"), imageTooLarge: t("identity.imageTooLarge"), imageInvalid: t("identity.imageInvalid"),
    searchIcons: t("identity.searchIcons")
  };
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
  const roleCatalog = dictionaries?.roles || [];
  const statuses = dictionaries?.statuses || ["active", "inactive", "paused", "archived"];
  const runtimeModes = dictionaries?.runtimeModes || Object.keys(runtimeLabels) as WorkforceEntity["runtimeMode"][];
  const personalityProfiles = dictionaries?.personalityProfiles || ["analytical", "creative", "executive", "supportive", "researcher", "custom"];
  const isEditMode = mode === "edit" && Boolean(entity?.id);
  const [entityType, setEntityType] = useState<WorkforceEntity["type"]>((values.type || "agent") as WorkforceEntity["type"]);
  const [departmentKeys, setDepartmentKeys] = useState<string[]>(() => values.departmentKeys?.length
    ? values.departmentKeys
    : values.department ? [values.department] : ["06-kadry"]);
  const [roleIds, setRoleIds] = useState<string[]>(() => values.roleIds?.length
    ? values.roleIds
    : roleCatalog.filter((role) => role.type === values.type && role.name === values.role).map((role) => role.id));
  const [rolesTouched, setRolesTouched] = useState(Boolean(values.roleIds?.length));
  const [identityName, setIdentityName] = useState(values.name || "");
  const [avatar, setAvatar] = useState<string | null>(() => (
    values.avatar === "initials" || values.avatar?.startsWith("icon:") || values.avatar?.startsWith("data:image/")
      ? values.avatar
      : "initials"
  ));
  const [accessIndexes, setAccessIndexes] = useState({
    skillIndex: values.skillIndex || [],
    knowledgeIndex: values.knowledgeIndex || [],
    toolIndex: values.toolIndex || [],
    authorityScope: values.authorityScope || []
  });
  const [bigFiveDraft, setBigFiveDraft] = useState<Record<string, number>>(() => {
    const current = values.bigFiveProfile || {};
    return Object.fromEntries(bigFiveTraits.map((trait) => [trait.key, normalizeBigFiveScore(current[trait.key])]));
  });

  function updateBigFiveValue(key: string, value: string) {
    const nextValue = normalizeBigFiveScore(value);
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
      avatar,
      departmentKeys,
      role: rolesTouched ? undefined : values.role || null,
      roleIds: rolesTouched ? roleIds : undefined,
      managerId: managerId || null,
      personalityProfile: String(form.get("personalityProfile") || "supportive"),
      model: String(form.get("model") || "") || null,
      runtimeMode: String(form.get("runtimeMode") || "manual"),
      runtimeExternalId: String(form.get("runtimeExternalId") || "") || null,
      synchronizationEnabled: Boolean(form.get("synchronizationEnabled")),
      hierarchyLevel: String(form.get("hierarchyLevel") || "") || null,
      bigFiveProfile: {
        openness: normalizeBigFiveScore(form.get("bigFiveOpenness")),
        conscientiousness: normalizeBigFiveScore(form.get("bigFiveConscientiousness")),
        extraversion: normalizeBigFiveScore(form.get("bigFiveExtraversion")),
        agreeableness: normalizeBigFiveScore(form.get("bigFiveAgreeableness")),
        neuroticism: normalizeBigFiveScore(form.get("bigFiveNeuroticism"))
      },
      skillIndex: accessIndexes.skillIndex,
      knowledgeIndex: accessIndexes.knowledgeIndex,
      toolIndex: accessIndexes.toolIndex,
      authorityScope: accessIndexes.authorityScope
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
    <CcRecordEditorModal
      actions={<><CcButton onClick={onClose} type="button" variant="ghost">Cancel</CcButton><CcButton loading={saveState === "saving"} type="submit" variant="primary">Save entity</CcButton></>}
      description={isEditMode ? "Update identity, responsibility, runtime access, and generated context." : "Create a human or AI workforce record connected to CompanyCore truth."}
      eyebrow="06 People / Agents"
      maxWidthClassName="max-w-5xl"
      meta={<span>{typeLabel((values.type || "agent") as WorkforceEntity["type"])} · {values.status || "active"} · {runtimeLabels[(values.runtimeMode || "manual") as WorkforceEntity["runtimeMode"]]}</span>}
      onClose={onClose}
      onSubmit={submit}
      title={isEditMode ? "Edit workforce entity" : entity ? "Duplicate workforce entity" : "New workforce entity"}
      titleId="workforce-form-title"
    >
      {error ? <CcNotice tone="error" title={error} live /> : null}
      <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
              <div>
                <h3 className="font-black text-company-ink">Identity and role</h3>
                <p className="text-sm text-company-muted">The canonical CompanyCore identity shown in rosters and generated context files.</p>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <CcField label="Name" required>
                  {({ id }) => <CcTextInput autoFocus={!isEditMode} id={id} name="name" onChange={(event) => setIdentityName(event.target.value)} required value={identityName} />}
                </CcField>
                <CcField label="Slug">
                  {({ id }) => <CcTextInput defaultValue={values.slug || ""} id={id} name="slug" />}
                </CcField>
                <CcField label="Type">
                  {({ id }) => (
                    <CcSelect id={id} name="type" onChange={(event) => setEntityType(event.target.value as WorkforceEntity["type"])} value={entityType}>
                      <option value="human">Human</option>
                      <option value="agent">Agent</option>
                    </CcSelect>
                  )}
                </CcField>
                <CcField label="Status">
                  {({ id }) => (
                    <CcSelect defaultValue={values.status || "active"} id={id} name="status">
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </CcSelect>
                  )}
                </CcField>
                <CcField label="Departments" hint="Select every department this person or agent works in. The first selected department is the primary owner.">
                  {({ id }) => <CcMultiSelect
                    id={id}
                    name="departmentKeys"
                    onChange={setDepartmentKeys}
                    options={(departments.length ? departments : [{ key: values.department || "06-kadry", backendAreaKey: "people-agents", position: 6 }]).map((department) => ({
                      value: department.key,
                      label: humanizeBusinessValue(department.key.replace(/^\d+-/, ""), "Department"),
                      description: department.key
                    }))}
                    placeholder="Select departments..."
                    searchPlaceholder="Search departments..."
                    value={departmentKeys}
                  />}
                </CcField>
                <CcField label="Roles" hint="Choose one or more governed company roles. The first selected role is used as the primary working role.">
                  {({ id }) => <div className="grid gap-2"><CcMultiSelect
                      id={id}
                      name="roleIds"
                      onChange={(next) => { setRoleIds(next); setRolesTouched(true); }}
                      options={roleCatalog.filter((role) => role.type === entityType || roleIds.includes(role.id)).map((role) => ({
                        value: role.id,
                        label: role.name,
                        description: typeLabel(role.type)
                      }))}
                      placeholder={roleCatalog.length ? "Select roles..." : "No governed roles configured"}
                      searchPlaceholder="Search company roles..."
                      value={roleIds}
                    />
                    {!rolesTouched && values.role && !roleIds.length ? <p className="text-xs text-company-muted">Current legacy role: <strong className="text-company-ink">{values.role}</strong>. Selecting a governed role replaces it.</p> : null}
                  </div>}
                </CcField>
                <div className="md:col-span-2">
                  <CcField label="Description / responsibilities">
                    {({ id }) => <textarea className={`${textareaClassName} min-h-28`} defaultValue={values.description || ""} id={id} name="description"></textarea>}
                  </CcField>
                </div>
                <div className="md:col-span-2">
                  <CcField label={t("people.identity")} hint={t("people.identityHint")}>
                    {() => <CcIdentityPicker labels={workforceIdentityLabels(t)} onChange={setAvatar} previewName={identityName} value={avatar} />}
                  </CcField>
                </div>
                <CcField label="Reports to" hint="The direct supervisor responsible for this person or agent in the workforce hierarchy.">
                  {({ id }) => (
                    <CcSelect defaultValue={values.managerId || ""} id={id} name="managerId">
                      <option value="">No direct supervisor</option>
                      {managers.filter((manager) => manager.id !== entity?.id).map((manager) => (
                        <option key={manager.id} value={manager.id}>{manager.name}{manager.role ? ` · ${manager.role}` : ""}</option>
                      ))}
                    </CcSelect>
                  )}
                </CcField>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
                <h3 className="font-black text-company-ink">Runtime and personality</h3>
                <p className="text-sm text-company-muted">Runtime metadata stays in Roost; local Codex Agent Hosts execute authorized tasks.</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <CcField label="Personality profile">
                    {({ id }) => (
                      <CcSelect defaultValue={values.personalityProfile || "supportive"} id={id} name="personalityProfile">
                        {personalityProfiles.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
                      </CcSelect>
                    )}
                  </CcField>
                  <CcField label="Runtime mode">
                    {({ id }) => (
                      <CcSelect defaultValue={values.runtimeMode || "manual"} id={id} name="runtimeMode">
                        {runtimeModes.map((mode) => <option key={mode} value={mode}>{runtimeLabels[mode]}</option>)}
                      </CcSelect>
                    )}
                  </CcField>
                  <CcField label="Model">
                    {({ id }) => <CcTextInput defaultValue={values.model || ""} id={id} name="model" placeholder="gpt-5.4, claude, local..." />}
                  </CcField>
                  <CcField label="Runtime external ID">
                    {({ id }) => <CcTextInput defaultValue={values.runtimeExternalId || ""} id={id} name="runtimeExternalId" placeholder="Runtime UUID or slug" />}
                  </CcField>
                  <CcField label="Hierarchy level">
                    {({ id }) => <CcTextInput defaultValue={values.hierarchyLevel || ""} id={id} name="hierarchyLevel" placeholder="executive_root, department_director..." />}
                  </CcField>
                  <CcField label="Runtime sync">
                    {({ id }) => (
                      <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-company border border-base-300 bg-base-100 px-3" htmlFor={id}>
                        <input className="checkbox checkbox-primary" defaultChecked={Boolean(values.synchronizationEnabled)} id={id} name="synchronizationEnabled" type="checkbox" />
                        <span className="text-sm font-bold text-company-ink">Enable generated file sync queue</span>
                      </label>
                    )}
                  </CcField>
                </div>
                <fieldset className="mt-4 grid gap-3 rounded-company border border-base-300 bg-base-200/30 p-3">
                  <legend className="px-1 text-sm font-bold text-company-muted">Big Five values, 0.00-1.00</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bigFiveTraits.map((trait) => (
                      <CcField label={trait.label} key={trait.key}>
                        {({ id }) => {
                          const value = formatBigFiveScore(bigFiveDraft[trait.key]);
                          return (
                            <div className="grid gap-2">
                              <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3">
                                <input
                                  aria-label={`${trait.label} slider`}
                                  className="range range-primary range-xs"
                                  max={1}
                                  min={0}
                                  onChange={(event) => updateBigFiveValue(trait.key, event.target.value)}
                                  step={0.01}
                                  type="range"
                                  value={value}
                                />
                                <input
                                  className="input input-bordered w-full text-right tabular-nums"
                                  id={id}
                                  max={1}
                                  min={0}
                                  name={`bigFive${trait.label}`}
                                  onChange={(event) => updateBigFiveValue(trait.key, event.target.value)}
                                  step={0.01}
                                  type="number"
                                  value={value}
                                />
                              </div>
                            </div>
                          );
                        }}
                      </CcField>
                    ))}
                  </div>
                </fieldset>
              </div>
              <BigFiveRadarChart profile={bigFiveDraft} compact />
            </div>

            <div className="rounded-company border border-base-300 bg-base-100/70 p-4">
              <h3 className="font-black text-company-ink">Access indexes</h3>
              <p className="text-sm text-company-muted">Select linked catalog values. This avoids spelling variants and keeps workforce access searchable.</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {[
                  ["skillIndex", "Skills", "Select skills..."],
                  ["knowledgeIndex", "Knowledge", "Select knowledge areas..."],
                  ["toolIndex", "Tools", "Select connected tools..."],
                  ["authorityScope", "Authority", "Select permissions..."]
                ].map(([name, label, placeholder]) => {
                  const key = String(name) as keyof typeof accessIndexes;
                  return <CcField label={String(label)} key={key}>
                    {({ id }) => (
                      <CcMultiSelect
                        id={id}
                        name={key}
                        onChange={(next) => setAccessIndexes((current) => ({ ...current, [key]: next }))}
                        options={accessOptions(key, managers, accessIndexes[key])}
                        placeholder={String(placeholder)}
                        searchPlaceholder={`Search ${String(label).toLocaleLowerCase()}...`}
                        value={accessIndexes[key]}
                      />
                    )}
                  </CcField>;
                })}
              </div>
            </div>
      </section>
    </CcRecordEditorModal>
  );
}

function MarkdownPreview({ files }: { files?: Record<string, string> }) {
  const [selectedFile, setSelectedFile] = useState("agent.md");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const names = Object.keys(files || {});
  const active = files?.[selectedFile] ?? files?.[names[0] || ""] ?? "";
  if (!files || names.length === 0) return <p className="text-sm text-company-muted">Generated files are not available yet.</p>;

  async function copyActiveFile() {
    try {
      await navigator.clipboard.writeText(active);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="grid min-h-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="join">
          {names.map((name) => (
            <button
              className={`btn join-item btn-sm ${selectedFile === name ? "btn-primary" : "btn-outline"}`}
              key={name}
              onClick={() => {
                setSelectedFile(name);
                setCopyState("idle");
              }}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {copyState !== "idle" ? (
            <span className={`text-xs font-bold ${copyState === "copied" ? "text-success" : "text-error"}`}>
              {copyState === "copied" ? "Copied" : "Copy failed"}
            </span>
          ) : null}
          <button className="btn btn-sm btn-outline" onClick={copyActiveFile} type="button">
            <i className="ph-bold ph-copy" aria-hidden="true"></i>
            <span>Copy file</span>
          </button>
        </div>
      </div>
      <pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap break-words rounded-company border border-base-300 bg-base-200/60 p-3 font-mono text-xs leading-6 text-company-ink">{active}</pre>
    </section>
  );
}

function DetailListSection({ title, items }: { title: string; items?: string[] }) {
  const values = items?.length ? items : ["Not configured"];
  return (
    <section className="rounded-company border border-base-300 bg-base-100/75 p-3">
      <h3 className="font-black text-company-ink">{title}</h3>
      <ul className="mt-3 divide-y divide-base-300/70 text-sm">
        {values.map((item) => (
          <li className="flex items-start gap-2 py-2" key={item}>
            <i className="ph-bold ph-dot-outline mt-0.5 text-primary" aria-hidden="true"></i>
            <span className="break-words text-company-ink">{item}</span>
          </li>
        ))}
      </ul>
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
      <header className="grid gap-4 rounded-company border border-base-300 bg-base-100/60 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <EntityAvatar entity={entity} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-primary">{typeLabel(entity.type)} profile</p>
              <h2 className="mt-1 break-words text-xl font-black leading-6 text-company-ink sm:text-2xl" id="workforce-preview-title">{entity.name}</h2>
              <p className="mt-1 text-sm text-company-muted">{entity.role || "Unassigned role"}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Departments", (entity.departmentKeys?.length ? entity.departmentKeys : [entity.department || "06-kadry"]).join(", ")],
              ["Status", entity.status],
              ["Runtime", runtimeLabels[entity.runtimeMode]],
              ["Runtime state", agentRuntime(entity)],
              ["Hierarchy", entity.hierarchyLevel || "No hierarchy"],
              ["Reports to", entity.manager?.name || "No direct supervisor"],
              ["Direct reports", String(entity.directReportCount ?? 0)],
              ["Source", entity.source || "companycore"]
            ].map(([label, value]) => (
              <div className="rounded-company border border-base-300 bg-base-100/75 px-3 py-2" key={label}>
                <dt className="text-[0.68rem] font-black uppercase tracking-wide text-company-muted">{label}</dt>
                <dd className="mt-0.5 break-words font-bold text-company-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <CcButton iconLeft="ph-pencil-simple" onClick={() => onEdit(entity)} size="sm" variant="outline">Edit</CcButton>
          {entity.status !== "archived" && entity.source !== "user" ? (
            <CcButton iconLeft="ph-archive" onClick={() => onArchive(entity)} size="sm" variant="ghost">Archive</CcButton>
          ) : null}
          <CcButton iconLeft={entity.source === "user" ? "ph-user-minus" : "ph-trash"} onClick={() => onDelete(entity)} size="sm" variant="ghost">{entity.source === "user" ? "Remove access" : "Delete"}</CcButton>
          <CcButton iconLeft="ph-x" onClick={onClose} size="sm" variant="ghost">Close</CcButton>
        </div>
      </header>

      <div className="tabs tabs-boxed w-full overflow-x-auto bg-base-100/60">
        {(["profile", "access", "work", "authority", "files"] as DetailTab[]).map((item) => (
          <button className={`tab whitespace-nowrap ${tab === item ? "tab-active" : ""}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto">
        {tab === "profile" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-company-ink">Readiness checklist</h3>
                <span className={`rounded-company px-2 py-1 text-xs font-black uppercase ${entity.readiness?.status === "ready" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {entity.readiness?.status === "ready" ? "ready" : "needs attention"}
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
                ["Reports to", entity.manager?.name || "No direct supervisor"],
                ["Roles", entity.roles?.length ? entity.roles.map((role) => role.name).join(", ") : entity.role || "Not configured"],
                ["Personality", entity.personalityProfile],
                ["Model", entity.model || "Not configured"],
                ["Hierarchy", entity.hierarchyLevel || "Not configured"],
                ["Runtime ID", entity.runtimeExternalId || "Not linked"],
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
            <div className="rounded-company border border-base-300 bg-base-200/35 p-3">
              <h3 className="font-black text-company-ink">Access model</h3>
              <p className="mt-1 text-sm leading-6 text-company-muted">
                These are lightweight source-of-truth indexes for the current V1 record. Future slices can replace each list with linked skill, knowledge, tool, and permission resources.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <DetailListSection title="Skills" items={entity.skillIndex || []} />
              <DetailListSection title="Knowledge" items={entity.knowledgeIndex || []} />
              <DetailListSection title="Tools" items={entity.toolIndex || []} />
              <DetailListSection title="Authority scope" items={entity.authorityScope || []} />
            </div>
            {entity.runtimeProfile?.url ? (
              <a className="btn btn-outline justify-start" href={entity.runtimeProfile.url} rel="noreferrer" target="_blank">
                <i className="ph-bold ph-arrow-square-out" aria-hidden="true"></i>
                <span>Open runtime profile</span>
              </a>
            ) : null}
          </section>
        ) : null}

        {tab === "work" ? (
          <section className="grid gap-4">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <h3 className="font-black text-company-ink">Work and responsibility</h3>
                <p className="text-sm font-bold text-company-muted">{entity.work?.assignmentModel || "not modeled"}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-company-muted">
                Work evidence is shown as assignments and blockers when the backend can connect this profile to operational records. This tab should stay factual rather than estimating responsibility from decorative totals.
              </p>
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
              {(entity.authority?.visibleScopeSample || []).length ? (
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {(entity.authority?.visibleScopeSample || []).slice(0, 8).map((scope) => (
                    <li className="rounded-company border border-base-300 bg-base-100/75 px-3 py-2 font-bold text-company-ink" key={scope}>{scope}</li>
                  ))}
                </ul>
              ) : null}
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
    <CcConfirmDialog
      confirmIcon={isDelete ? entity.source === "user" ? "ph-user-minus" : "ph-trash" : "ph-archive"}
      confirmLabel={isDelete ? entity.source === "user" ? "Remove access" : "Delete" : "Archive"}
      confirmTone={isDelete ? "danger" : "warning"}
      description={isDelete
        ? entity.source === "user"
          ? "This removes the person's access to this workspace and deletes their linked workforce profile. Their global Roost login is preserved. The primary owner and your own account are protected."
          : "This permanently removes the workforce record and its organizational assignments. It does not delete an external runtime."
        : "This keeps the record for history, but removes it from active workforce use."}
      detail={<><strong className="text-company-ink">{typeLabel(entity.type)}</strong><span className="mx-2 text-company-muted">/</span><span>{entity.roles?.length ? entity.roles.map((role) => role.name).join(", ") : entity.role || "Unassigned role"}</span><span className="mx-2 text-company-muted">/</span><span>{entity.departmentKeys?.length ? entity.departmentKeys.join(", ") : entity.department || "No department"}</span></>}
      eyebrow={isDelete ? entity.source === "user" ? "Remove workspace account" : "Delete workforce record" : "Archive workforce record"}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={entity.name}
    />
  );
}

export function PeopleAgentsRoute({ departmentKey }: { departmentKey?: string } = {}) {
  const { locale, t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editingEntity, setEditingEntity] = useState<{ entity?: WorkforceEntity | null; mode?: "create" | "edit" } | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState<RouteNotice | null>(null);
  const packet = useOwnerPacket<WorkforcePacket>(`/v1/workforce?refresh=${refreshKey}${departmentKey ? `&departmentKey=${encodeURIComponent(departmentKey)}` : ""}`, true, t);
  const entities = packet.data?.entities || [];
  const selected = selectedId ? entities.find((entity) => entity.id === selectedId) || null : null;
  const duplicateEntity = (entity: WorkforceEntity): WorkforceEntity => ({
    ...entity,
    id: "",
    name: `${entity.name} copy`,
    slug: `${entity.slug || entity.name.toLowerCase().replace(/\s+/g, "-")}-copy`,
    runtimeExternalId: null,
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
      header: t("people.name"),
      mobileLabel: t("people.name"),
      required: true,
      sortable: true,
      sortValue: (entity) => entity.name,
      searchValue: (entity) => [
        entity.name,
        entity.slug,
        entity.role,
        entity.department,
        ...(entity.roles || []).map((role) => role.name),
        ...(entity.departmentKeys || []),
        entity.model,
        entity.hierarchyLevel,
        ...(entity.skillIndex || []),
        ...(entity.knowledgeIndex || []),
        ...(entity.toolIndex || [])
      ].filter(Boolean).join(" "),
      className: "min-w-[13rem]",
      cell: (entity) => (
        <strong className="block min-w-0 truncate text-company-ink">{entity.name}</strong>
      )
    },
    {
      key: "kind",
      header: t("people.kind"),
      mobileLabel: t("people.kind"),
      filterable: true,
      filterLabel: t("management.type"),
      filterValue: (entity) => entity.type,
      filterOptions: [
        { value: "human", label: t("people.human") },
        { value: "agent", label: t("people.agent") }
      ],
      sortable: true,
      cell: (entity) => <span className="font-bold text-company-ink">{entity.type === "human" ? t("people.human") : t("people.agent")}</span>
    },
    {
      key: "role",
      header: t("people.role"),
      mobileLabel: t("people.role"),
      className: "min-w-[12rem]",
      sortable: true,
      sortValue: (entity) => entity.roles?.map((role) => role.name).join(" ") || entity.role || "",
      cell: (entity) => <span className="block truncate text-company-ink">{entity.roles?.length ? entity.roles.map((role) => role.name).join(", ") : entity.role || t("people.unassignedRole")}</span>
    },
    {
      key: "department",
      header: t("people.department"),
      mobileLabel: t("people.department"),
      className: "w-32 min-w-32",
      sortable: true,
      sortValue: (entity) => entity.departmentKeys?.join(" ") || entity.department || "",
      cell: (entity) => <span className="block truncate text-company-ink">{(entity.departmentKeys?.length ? entity.departmentKeys : [entity.department || "06-kadry"]).map((department) => humanizeBusinessValue(department.replace(/^\d+-/, ""), "People")).join(", ")}</span>
    },
    {
      key: "manager",
      header: t("people.manager"),
      mobileLabel: t("people.manager"),
      className: "w-36 min-w-36",
      visibleByDefault: false,
      sortable: true,
      sortValue: (entity) => entity.manager?.name || "",
      cell: (entity) => <span className="block truncate">{entity.manager?.name || t("people.noManager")}</span>
    },
    {
      key: "status",
      header: t("people.status"),
      mobileLabel: t("people.status"),
      className: "w-24 min-w-24",
      filterable: true,
      filterLabel: t("people.status"),
      filterValue: (entity) => entity.status,
      filterOptions: [
        { value: "active", label: humanizeBusinessValue("active", "Unknown", locale) },
        { value: "inactive", label: humanizeBusinessValue("inactive", "Unknown", locale) },
        { value: "paused", label: humanizeBusinessValue("paused", "Unknown", locale) },
        { value: "archived", label: humanizeBusinessValue("archived", "Unknown", locale) }
      ],
      sortable: true,
      cell: (entity) => <span className={`badge badge-sm ${badgeTone(entity.status)}`}>{humanizeBusinessValue(entity.status, "Unknown", locale)}</span>
    },
    {
      key: "runtime",
      header: t("people.runtime"),
      mobileLabel: t("people.runtime"),
      className: "w-36 min-w-36",
      visibleByDefault: false,
      filterable: true,
      filterLabel: t("people.runtime"),
      filterValue: (entity) => entity.runtimeMode,
      filterOptions: [
        { value: "manual", label: humanizeBusinessValue("manual", "Unknown", locale) },
        { value: "semi_autonomous", label: humanizeBusinessValue("semi autonomous", "Unknown", locale) },
        { value: "autonomous", label: humanizeBusinessValue("autonomous", "Unknown", locale) }
      ],
      sortable: true,
      sortValue: (entity) => entity.hierarchyLevel || entity.runtimeMode,
      cell: (entity) => <span className="block truncate text-company-ink">{entity.hierarchyLevel || runtimeLabels[entity.runtimeMode]}</span>
    }
  ], [locale, t]);
  const rowActionItems = useMemo<Array<CcTableRowAction<WorkforceEntity>>>(() => [
    {
      key: "preview",
      label: t("people.preview"),
      icon: "ph-eye",
      tone: "outline",
      onClick: (entity) => {
        setSelectedId(entity.id);
        setDetailTab("profile");
      }
    },
    {
      key: "duplicate",
      label: t("people.duplicate"),
      icon: "ph-copy",
      tone: "ghost",
      onClick: (entity) => setEditingEntity({ entity: duplicateEntity(entity), mode: "create" })
    },
    {
      key: "edit",
      label: t("people.edit"),
      icon: "ph-pencil-simple",
      tone: "ghost",
      onClick: (entity) => setEditingEntity({ entity, mode: "edit" })
    },
    {
      key: "delete",
      label: "Delete / remove",
      icon: "ph-trash",
      tone: "danger",
      onClick: (entity) => setConfirmAction({ type: "delete", entity })
    }
  ], [t]);

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
      setNotice({ tone: "success", title: entity.source === "user"
        ? `${entity.name} was removed from this workspace.`
        : `${entity.name} was deleted.` });
      setSelectedId("");
      setConfirmAction(null);
      refresh();
    } catch (error) {
      setNotice({ tone: "error", title: userErrorMessage(error, t) });
    }
  }

  return (
    <>
      <CcPageHeader actions={packet.status === "ready" ? <>{departmentKey ? <CcButton href="/areas?area=06-kadry&view=directory" iconLeft="ph-x" size="sm" variant="outline">Show all accessible people and agents</CcButton> : <CcButton href="/areas?area=06-kadry&view=executions" iconLeft="ph-terminal-window" size="sm" variant="outline">Codex runs</CcButton>}<CcButton iconLeft="ph-plus" onClick={() => setEditingEntity({ entity: null, mode: "create" })} size="sm" variant="primary">{t("people.new")}</CcButton></> : null} description={departmentKey ? `People and agents assigned or related to ${departmentLabel(departmentKey as CoreAreaKey, t)}.` : t("people.description")} eyebrow={departmentKey ? departmentLabel(departmentKey as CoreAreaKey, t) : t("people.eyebrow")} title={t("people.title")} />
      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("people.loadError")} live /> : null}
      {notice ? <CcNotice tone={notice.tone} title={notice.title} live /> : null}

      {packet.status === "ready" ? (
        <section className="grid min-h-[calc(100vh-10rem)] gap-4">
          <main className="roost-work-surface grid min-h-0 rounded-company p-3">
            <div className="min-h-0 overflow-y-auto">
              <CcDataTable
                columns={tableColumns}
                density="compact"
                emptyTitle={t("people.empty")}
                emptyDetail={t("people.emptyDetail")}
                getRowClassName={(entity) => needsAttention(entity) ? "bg-warning/5" : ""}
                getRowLabel={(entity) => entity.name}
                initialColumnFilters={{ status: "active" }}
                initialPageSize={25}
                initialSort={{ key: "person", direction: "asc" }}
                mobileMode="cards"
                rowActionItems={rowActionItems}
                rows={entities}
                searchPlaceholder={t("people.search")}
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
    </>
  );
}
