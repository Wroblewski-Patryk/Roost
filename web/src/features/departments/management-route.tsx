import React, { FormEvent, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
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
  return department.views.map((view) => view.enabled ? view.label : `${view.label} (planned)`).join(", ");
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
    <form className="grid gap-4 rounded-company border border-base-300 bg-base-100 p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="grid gap-1">
        <strong className="text-lg">{draft.id ? "Edit department" : "New department"}</strong>
        <span className="text-sm text-company-muted">Department rows drive the sidebar. Linked views point to approved module surfaces.</span>
      </div>

      {error ? <CcNotice tone="error" title="Department could not be saved" detail={error} live /> : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <label className="form-control">
          <span className="label py-0"><span className="label-text font-bold">Name</span></span>
          <input className="input input-bordered" maxLength={120} onChange={(event) => onChange({ ...draft, name: event.target.value })} required value={draft.name} />
        </label>
        <label className="form-control">
          <span className="label py-0"><span className="label-text font-bold">Order</span></span>
          <input className="input input-bordered" min={0} onChange={(event) => onChange({ ...draft, position: event.target.value })} type="number" value={draft.position} />
        </label>
        <label className="form-control">
          <span className="label py-0"><span className="label-text font-bold">Icon</span></span>
          <input className="input input-bordered" maxLength={80} onChange={(event) => onChange({ ...draft, icon: event.target.value })} value={draft.icon} />
        </label>
      </div>

      <label className="form-control">
        <span className="label py-0"><span className="label-text font-bold">Description</span></span>
        <textarea className="textarea textarea-bordered min-h-24" maxLength={500} onChange={(event) => onChange({ ...draft, description: event.target.value })} value={draft.description} />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-black">Linked views</legend>
        <div className="grid gap-2 md:grid-cols-2">
          {(packet?.availableViews || []).map((view) => {
            const checked = draft.linkedViews.includes(view.id);
            return (
              <label className={`flex items-center gap-2 rounded-company border border-base-300 px-3 py-2 text-sm font-bold ${view.enabled ? "bg-base-200/45" : "bg-base-200/25 text-company-muted"}`} key={view.id}>
                <input
                  checked={checked}
                  className="checkbox checkbox-sm"
                  disabled={!view.enabled}
                  onChange={(event) => {
                    const nextViews = event.target.checked
                      ? [...draft.linkedViews, view.id]
                      : draft.linkedViews.filter((id) => id !== view.id);
                    onChange({ ...draft, linkedViews: nextViews });
                  }}
                  type="checkbox"
                />
                <i className={`ph-bold ${view.icon}`} aria-hidden="true"></i>
                <span className="min-w-0 truncate">{view.label}</span>
                {!view.enabled ? <span className="ml-auto badge badge-outline">Planned</span> : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        <CcButton onClick={onCancel} type="button" variant="ghost">Cancel</CcButton>
        <CcButton disabled={saving} iconLeft={saving ? "ph-circle-notch" : "ph-floppy-disk"} type="submit" variant="primary">
          {saving ? "Saving" : "Save department"}
        </CcButton>
      </div>
    </form>
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
      filterValue: (department) => department.isSystem ? "System" : "Custom",
      cell: (department) => <span className="badge badge-outline">{department.isSystem ? "System" : "Custom"}</span>
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
    <Shell activeArea="12-zarzadzanie">
      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-company-muted">12 Management</p>
            <h1 className="text-3xl font-black tracking-tight text-company-ink">Departments</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted">Manage the workspace department catalog, sidebar labels, and linked views shared from existing department modules.</p>
          </div>
          <CcButton iconLeft="ph-plus" onClick={() => { setDraft(emptyDraft); setSaveError(null); }} variant="primary">Add department</CcButton>
        </div>

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
          enableColumnVisibility
          enablePagination
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
    </Shell>
  );
}
