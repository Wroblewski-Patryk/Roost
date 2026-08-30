import { FormEvent, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcMultiSelect } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { DepartmentScopeControl } from "./department-scope-control";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type Department = { id: string; key: CoreAreaKey; name: string; status: string };
type Goal = {
  id: string;
  title: string;
  description?: string | null;
  businessPurpose?: string | null;
  priority: string;
  deadline?: string | null;
  status: string;
  project?: { id: string; name: string } | null;
  targets?: Array<{ id: string }>;
  tasks?: Array<{ id: string }>;
  organizationalContext?: {
    ownerDepartment?: Department | null;
    relatedDepartments?: Department[];
    scopes?: Array<{ type: string; entityId?: string | null; label?: string | null }>;
  };
};

type GoalDraft = {
  title: string;
  description: string;
  businessPurpose: string;
  priority: string;
  status: string;
  deadline: string;
  ownerDepartmentKey: string;
  relatedDepartmentKeys: string[];
  companyWide: boolean;
};

function draftFor(goal: Goal | null, departmentKey?: CoreAreaKey): GoalDraft {
  return {
    title: goal?.title || "",
    description: goal?.description || "",
    businessPurpose: goal?.businessPurpose || "",
    priority: goal?.priority || "normal",
    status: goal?.status || "active",
    deadline: goal?.deadline?.slice(0, 10) || "",
    ownerDepartmentKey: goal?.organizationalContext?.ownerDepartment?.key || departmentKey || "01-strategia",
    relatedDepartmentKeys: goal?.organizationalContext?.relatedDepartments?.map((department) => department.key) || [],
    companyWide: Boolean(goal?.organizationalContext?.scopes?.some((scope) => scope.type === "company"))
  };
}

function GoalEditor({ goal, departmentKey, departments, onClose, onSaved }: {
  goal: Goal | null;
  departmentKey?: CoreAreaKey;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => draftFor(goal, departmentKey));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = departments.map((department) => ({ value: department.key, label: departmentLabel(department.key, t) }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: draft.title,
        description: draft.description || null,
        businessPurpose: draft.businessPurpose || null,
        priority: draft.priority,
        status: draft.status,
        deadline: draft.deadline ? new Date(`${draft.deadline}T12:00:00.000Z`).toISOString() : null,
        organizationalContext: {
          ownerDepartmentKey: draft.ownerDepartmentKey || null,
          relatedDepartmentKeys: draft.relatedDepartmentKeys.filter((key) => key !== draft.ownerDepartmentKey),
          applicableDepartmentKeys: [],
          scopes: draft.companyWide ? [{ type: "company" }] : draft.relatedDepartmentKeys.concat(draft.ownerDepartmentKey).filter(Boolean).map((key) => ({ type: "department", entityId: key }))
        }
      };
      await api(goal ? `/v1/goals/${goal.id}` : "/v1/goals", { method: goal ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "request_failed");
    } finally {
      setBusy(false);
    }
  }

  return <CcRecordEditorModal
    actions={<><CcButton onClick={onClose} variant="ghost">{t("common.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{goal ? t("common.save") : t("goals.create")}</CcButton></>}
    description={t("goals.editorDescription")}
    eyebrow={t("goals.eyebrow")}
    onClose={onClose}
    onSubmit={submit}
    title={goal ? t("goals.edit") : t("goals.create")}
    titleId="goal-editor-title"
  >
    {error ? <CcNotice live tone="error" title={t("goals.saveError")} detail={humanizeBusinessValue(error)} /> : null}
    <CcRecordEditorSection title={t("goals.definition")}>
      <div className="grid gap-4 md:grid-cols-2">
        <CcField label={t("goals.title")} required>{({ id, describedBy, invalid }) => <input aria-describedby={describedBy} aria-invalid={invalid} className="input input-bordered w-full" id={id} maxLength={240} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} />}</CcField>
        <CcField label={t("goals.businessPurpose")}>{({ id, describedBy }) => <input aria-describedby={describedBy} className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, businessPurpose: event.target.value })} value={draft.businessPurpose} />}</CcField>
        <CcField label={t("common.description")}>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-28 w-full" id={id} onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} />}</CcField>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <CcField label={t("table.status")}>{({ id, describedBy }) => <CcSelect aria-describedby={describedBy} id={id} onChange={(event) => setDraft({ ...draft, status: event.target.value })} value={draft.status}><option value="active">{humanizeBusinessValue("active")}</option><option value="paused">{humanizeBusinessValue("paused")}</option><option value="completed">{humanizeBusinessValue("completed")}</option></CcSelect>}</CcField>
          <CcField label={t("goals.priority")}>{({ id, describedBy }) => <CcSelect aria-describedby={describedBy} id={id} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} value={draft.priority}><option value="critical">{humanizeBusinessValue("critical")}</option><option value="high">{humanizeBusinessValue("high")}</option><option value="normal">{humanizeBusinessValue("normal")}</option><option value="low">{humanizeBusinessValue("low")}</option></CcSelect>}</CcField>
          <CcField label={t("goals.deadline")}>{({ id, describedBy }) => <input aria-describedby={describedBy} className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} type="date" value={draft.deadline} />}</CcField>
        </div>
      </div>
    </CcRecordEditorSection>
    <CcRecordEditorSection description={t("goals.contextDescription")} title={t("goals.organizationalContext")}>
      <div className="grid gap-4 md:grid-cols-2">
        <CcField label={t("goals.ownerDepartment")} required>{({ id, describedBy }) => <CcSelect aria-describedby={describedBy} id={id} onChange={(event) => setDraft({ ...draft, ownerDepartmentKey: event.target.value })} value={draft.ownerDepartmentKey}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</CcSelect>}</CcField>
        <CcField label={t("goals.relatedDepartments")}>{({ id }) => <CcMultiSelect id={id} name="relatedDepartmentKeys" onChange={(value) => setDraft({ ...draft, relatedDepartmentKeys: value })} options={options.filter((option) => option.value !== draft.ownerDepartmentKey)} value={draft.relatedDepartmentKeys.filter((key) => key !== draft.ownerDepartmentKey)} />}</CcField>
        <label className="flex min-h-11 items-center gap-3 rounded-company border border-base-300 px-3 py-2 text-sm font-bold text-company-ink md:col-span-2"><input checked={draft.companyWide} className="checkbox checkbox-primary checkbox-sm" onChange={(event) => setDraft({ ...draft, companyWide: event.target.checked })} type="checkbox" />{t("goals.companyWide")}</label>
      </div>
    </CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function GoalsWorkbench({ departmentKey, canonical = false }: { departmentKey?: CoreAreaKey; canonical?: boolean }) {
  const { t } = useLanguage();
  const requestedDepartment = canonical ? new URLSearchParams(window.location.search).get("department") as CoreAreaKey | null : departmentKey || null;
  const scoped = Boolean(requestedDepartment);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined);
  const [archiveGoal, setArchiveGoal] = useState<Goal | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const query = requestedDepartment ? `?departmentKey=${requestedDepartment}&includeCompanyWide=false` : "";
  const packet = useOwnerPacket<Goal[]>(`/v1/goals${query}${query ? "&" : "?"}refresh=${refreshKey}`, true, t);
  const departmentPacket = useOwnerPacket<{ departments: Department[] }>(`/v1/departments?refresh=${refreshKey}`, true, t);
  const rows = packet.data || [];
  const tableLabels = useTranslatedTableLabels();
  const visibleTitle = scoped ? t("goals.departmentGoals", { department: departmentLabel(requestedDepartment!, t) }) : t("goals.allGoals");
  const departmentOptions = departmentPacket.data?.departments || [];
  const columns = useMemo<Array<CcTableColumn<Goal>>>(() => [
    { key: "goal", header: t("goals.title"), sortable: true, searchValue: (row) => `${row.title} ${row.description || ""} ${row.businessPurpose || ""}`, cell: (row) => <button className="grid text-left" onClick={() => setEditing(row)} type="button"><strong>{row.title}</strong><span className="text-xs text-company-muted">{row.businessPurpose || row.description || t("common.noDescription")}</span></button> },
    { key: "department", header: t("goals.ownerDepartment"), filterable: true, filterValue: (row) => row.organizationalContext?.ownerDepartment?.key || "unassigned", cell: (row) => <span className="text-sm text-company-muted">{row.organizationalContext?.ownerDepartment ? departmentLabel(row.organizationalContext.ownerDepartment.key, t) : t("goals.unassigned")}</span> },
    { key: "status", header: t("table.status"), filterable: true, filterValue: (row) => row.status, cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span> },
    { key: "priority", header: t("goals.priority"), filterable: true, filterValue: (row) => row.priority, cell: (row) => <span className="text-sm text-company-muted">{humanizeBusinessValue(row.priority)}</span> },
    { key: "relations", header: t("goals.relations"), cell: (row) => <span className="text-sm text-company-muted">{(row.targets?.length || 0) + (row.tasks?.length || 0)}</span> },
    { key: "actions", header: t("table.actions"), cell: (row) => <div className="flex justify-end gap-1"><CcButton ariaLabel={t("goals.edit")} iconLeft="ph-pencil-simple" onClick={() => setEditing(row)} size="xs" variant="ghost"><span className="sr-only">{t("goals.edit")}</span></CcButton>{row.status !== "archived" ? <CcButton ariaLabel={t("goals.archive")} iconLeft="ph-archive" onClick={() => setArchiveGoal(row)} size="xs" variant="ghost"><span className="sr-only">{t("goals.archive")}</span></CcButton> : null}</div> }
  ], [t]);

  function refresh() { setEditing(undefined); setRefreshKey((value) => value + 1); }
  async function confirmArchive() {
    if (!archiveGoal) return;
    setArchiveBusy(true);
    try { await api(`/v1/goals/${archiveGoal.id}`, { method: "DELETE" }); setArchiveGoal(null); refresh(); } finally { setArchiveBusy(false); }
  }

  return <>
    <CcPageHeader actions={<><DepartmentScopeControl baseHref="/areas?area=01-strategia&view=goals" value={requestedDepartment} /><CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{t("goals.create")}</CcButton></>} description={scoped ? t("goals.contextualDescription") : t("goals.canonicalDescription")} eyebrow={scoped ? t("goals.contextualEyebrow") : t("goals.canonicalEyebrow")} title={visibleTitle} />
    {packet.status === "error" ? <CcNotice live tone="error" title={packet.error || t("goals.loadError")} /> : null}
    <CcDataTable columns={columns} rows={rows} emptyDetail={canonical ? t("goals.emptyCanonicalDetail") : t("goals.emptyContextualDetail")} emptyTitle={t("goals.emptyTitle")} error={packet.status === "error" ? packet.error || t("goals.loadError") : null} getRowLabel={(row) => row.title} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" />
    {editing !== undefined ? <GoalEditor departmentKey={requestedDepartment || departmentKey} departments={departmentOptions} goal={editing} onClose={() => setEditing(undefined)} onSaved={refresh} /> : null}
    {archiveGoal ? <CcConfirmDialog busy={archiveBusy} confirmIcon="ph-archive" confirmLabel={t("goals.archive")} confirmTone="warning" description={t("goals.archiveDescription")} detail={<strong>{archiveGoal.title}</strong>} eyebrow={t("goals.eyebrow")} onCancel={() => setArchiveGoal(null)} onConfirm={confirmArchive} title={t("goals.archiveTitle")} /> : null}
  </>;
}
