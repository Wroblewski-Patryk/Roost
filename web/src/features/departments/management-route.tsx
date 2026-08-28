import React, { FormEvent, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcIconPicker } from "../../components/cc-icon-picker";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcTextInput } from "../../components/cc-text-input";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { DepartmentCatalogPacket, WorkspaceDepartment } from "../../types";

type Draft = {
  id?: string;
  name: string;
  description: string;
  icon: string;
  position: string;
  linkedViews: string[];
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  icon: "ph-buildings",
  position: "",
  linkedViews: []
};

function departmentViewLabels(department: WorkspaceDepartment) {
  if (!department.views.length) {
    return "No linked views";
  }
  const departmentName = department.name.replace(/^\d+\s*/, "").trim();
  return department.views.map((view) => {
    let label = view.label
      .replace(new RegExp(`^${departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "")
      .replace(/^people(?:\s*\/\s*agents|\s+and\s+agents)?\s+/i, "")
      .replace(/^department management$/i, "Departments");
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return view.enabled ? label : `${label} (planned)`;
  }).join(", ");
}

function DepartmentForm({
  draft,
  packet,
  saving,
  error,
  onCancel,
  onChange,
  onSubmit
}: {
  draft: Draft;
  packet: DepartmentCatalogPacket | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onChange: (draft: Draft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <CcRecordEditorModal
      actions={<><CcButton onClick={onCancel} type="button" variant="ghost">Cancel</CcButton><CcButton disabled={saving} iconLeft={saving ? "ph-circle-notch" : "ph-floppy-disk"} type="submit" variant="primary">{saving ? "Saving" : "Save department"}</CcButton></>}
      description="Define how this department appears in navigation and which existing workspace views it exposes."
      eyebrow="12 Management · Departments"
      onClose={onCancel}
      onSubmit={onSubmit}
      title={draft.id ? `Edit ${draft.name}` : "New department"}
      titleId="department-editor-title"
    >
      {error ? <CcNotice tone="error" title="Department could not be saved" detail={error} live /> : null}
      <CcRecordEditorSection title="Definition" description="The name and purpose people see when they navigate the company structure.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Name" required>{({ id, describedBy, invalid }) => <CcTextInput aria-describedby={describedBy} autoFocus id={id} invalid={invalid} maxLength={120} onChange={(event) => onChange({ ...draft, name: event.target.value })} required value={draft.name} />}</CcField>
          <div className="md:col-span-2"><CcField label="Description" hint="Keep it specific enough to distinguish this department from adjacent responsibilities.">{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" id={id} maxLength={500} onChange={(event) => onChange({ ...draft, description: event.target.value })} value={draft.description} />}</CcField></div>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Navigation" description="Choose the visual marker and relative sidebar position.">
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <CcField label="Icon" hint="Pick a symbol that remains recognizable in the compact sidebar.">{({ id }) => <CcIconPicker id={id} onChange={(icon) => onChange({ ...draft, icon })} value={draft.icon} />}</CcField>
          <CcField label="Order" hint="Lower values appear first.">{({ id, describedBy }) => <CcTextInput aria-describedby={describedBy} id={id} min={0} onChange={(event) => onChange({ ...draft, position: event.target.value })} type="number" value={draft.position} />}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Linked views" description="Select the approved workspace surfaces reachable from this department.">
        <fieldset>
          <legend className="sr-only">Available linked views</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {(packet?.availableViews || []).map((view) => {
              const checked = draft.linkedViews.includes(view.id);
              return (
                <label className={`flex min-h-11 items-center gap-3 rounded-company border border-base-300 px-3 py-2 text-sm font-bold transition-colors ${checked ? "bg-primary/8 text-company-ink" : view.enabled ? "bg-base-100/20 text-company-ink hover:bg-base-200/45" : "bg-base-100/10 text-company-muted"}`} key={view.id}>
                  <input checked={checked} className="checkbox checkbox-primary checkbox-sm" disabled={!view.enabled} onChange={(event) => { const nextViews = event.target.checked ? [...draft.linkedViews, view.id] : draft.linkedViews.filter((id) => id !== view.id); onChange({ ...draft, linkedViews: nextViews }); }} type="checkbox" />
                  <i className={`ph-bold ${view.icon} shrink-0 text-company-muted`} aria-hidden="true"></i>
                  <span className="min-w-0 flex-1 truncate">{view.label}</span>
                  {!view.enabled ? <span className="text-[0.65rem] font-bold uppercase tracking-wide text-company-muted">Planned</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      </CcRecordEditorSection>
    </CcRecordEditorModal>
  );
}

export function ManagementRoute() {
  const { t } = useLanguage();
  const packetState = useOwnerPacket<DepartmentCatalogPacket>("/v1/departments", true, t);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshedPacketState = useOwnerPacket<DepartmentCatalogPacket>(`/v1/departments?refresh=${refreshKey}`, true, t);
  const packet = refreshedPacketState.data || packetState.data;
  const loading = packetState.status === "loading" && !packet;
  const error = packetState.status === "error" ? packetState.error || "Department catalog could not load." : null;

  const rows = useMemo(() => (packet?.departments || []).filter((department) => department.status !== "archived"), [packet]);
  const columns = useMemo<Array<CcTableColumn<WorkspaceDepartment>>>(() => [
    {
      key: "name",
      header: "Department",
      sortable: true,
      searchValue: (department) => `${department.name} ${department.description || ""}`,
      cell: (department) => (
        <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-company bg-primary/10 text-primary"><i className={`ph-bold ${department.icon}`} aria-hidden="true"></i></span>
          <span className="min-w-0">
            <strong className="block truncate">{department.name}</strong>
            <small className="block truncate text-company-muted">{department.key}</small>
          </span>
        </span>
      )
    },
    {
      key: "views",
      header: "Linked views",
      searchValue: departmentViewLabels,
      cell: (department) => <span className="block max-w-lg truncate text-sm">{departmentViewLabels(department)}</span>
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      filterable: true,
      filterValue: (department) => department.isSystem ? "Built-in" : "Custom",
      cell: (department) => <span className="text-sm font-bold text-company-muted">{department.isSystem ? "Built-in" : "Custom"}</span>
    },
    {
      key: "position",
      header: "Order",
      sortable: true,
      sortValue: (department) => department.position,
      cell: (department) => <span className="font-mono text-sm">{department.position}</span>
    }
  ], []);

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        name: draft.name,
        description: draft.description.trim() ? draft.description.trim() : null,
        icon: draft.icon.trim() || "ph-buildings",
        linkedViews: draft.linkedViews,
        ...(draft.id ? { position: Number(draft.position || 0) } : {})
      };
      if (draft.id) {
        await api(`/v1/departments/${draft.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/v1/departments", { method: "POST", body: JSON.stringify(body) });
      }
      setDraft(null);
      setRefreshKey((current) => current + 1);
    } catch (apiError) {
      setSaveError(userErrorMessage(apiError, t));
    } finally {
      setSaving(false);
    }
  }

  function editDepartment(department: WorkspaceDepartment) {
    setDraft({
      id: department.id,
      name: department.name,
      description: department.description || "",
      icon: department.icon,
      position: String(department.position),
      linkedViews: department.linkedViews
    });
    setSaveError(null);
  }

  return (
    <>
      <section className="grid gap-5">
        <CcPageHeader actions={<CcButton iconLeft="ph-plus" onClick={() => { setDraft(emptyDraft); setSaveError(null); }} size="sm" variant="primary">Add department</CcButton>} description="Manage the workspace department catalog, sidebar labels, and linked views shared from existing department modules." eyebrow="12 Management" title="Departments" />

        {draft ? (
          <DepartmentForm
            draft={draft}
            error={saveError}
            onCancel={() => { setDraft(null); setSaveError(null); }}
            onChange={setDraft}
            onSubmit={saveDraft}
            packet={packet || null}
            saving={saving}
          />
        ) : null}

        <CcDataTable
          columns={columns}
          density="compact"
          emptyDetail="Add a custom department or restore the default department catalog."
          emptyTitle="No departments"
          enableSearch
          error={error}
          getRowLabel={(department) => department.name}
          initialPageSize={25}
          initialSort={{ key: "position", direction: "asc" }}
          labels={{
            loadingTitle: "Loading departments",
            loadingDetail: "CompanyCore is reading the workspace department catalog.",
            errorTitle: "Departments could not load",
            actions: "Actions",
            previous: "Previous",
            next: "Next",
            pagination: ({ start, end, total }) => `${start}-${end} of ${total}`,
            search: "Search",
            filters: "Filters",
            columns: "Columns",
            rowsPerPage: "Rows",
            selected: (count) => `${count} selected`,
            page: "Page",
            clear: "Clear"
          }}
          loading={loading}
          mobileMode="cards"
          rowActionItems={[
            { key: "edit", label: "Edit", icon: "ph-pencil-simple", tone: "primary", onClick: editDepartment }
          ]}
          rows={rows}
          stickyActions
          tableMinWidthClassName="min-w-[760px]"
        />
      </section>
    </>
  );
}
