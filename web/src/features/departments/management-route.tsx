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
import { DepartmentCatalogPacket, DepartmentCompositionPreview, WorkspaceDepartment } from "../../types";
import { useTranslatedTableLabels } from "./shared";

type Draft = {
  id?: string;
  name: string;
  description: string;
  icon: string;
  position: string;
  linkedViews: string[];
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
  preview,
  saving,
  error,
  onCancel,
  onChange,
  onBack,
  onSubmit
}: {
  draft: Draft;
  packet: DepartmentCatalogPacket | null;
  preview: DepartmentCompositionPreview | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onChange: (draft: Draft) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const viewName = (key: string) => packet?.availableViews.find((view) => view.id === key)?.label || key;
  return (
    <CcRecordEditorModal
      actions={<><CcButton onClick={onCancel} type="button" variant="ghost">{pl ? "Anuluj" : "Cancel"}</CcButton>{preview ? <CcButton disabled={saving} onClick={onBack} type="button" variant="ghost">{pl ? "Wróć do edycji" : "Back to edit"}</CcButton> : null}<CcButton disabled={saving} iconLeft={saving ? "ph-circle-notch" : preview ? "ph-check-circle" : "ph-eye"} type="submit" variant="primary">{saving ? (pl ? "Przetwarzanie…" : "Working…") : preview ? (pl ? "Potwierdź zmianę" : "Confirm change") : (pl ? "Pokaż skutki" : "Preview impact")}</CcButton></>}
      description={pl ? "Zmień układ działu po sprawdzeniu skutków dla istniejących powiązań i widoków." : "Review the impact on existing links and views before changing this department."}
      eyebrow="12 Management · Departments"
      onClose={onCancel}
      onSubmit={onSubmit}
      title={pl ? `Edytuj ${draft.name}` : `Edit ${draft.name}`}
      titleId="department-editor-title"
    >
      {error ? <CcNotice tone="error" title={pl ? "Nie udało się zmienić działu" : "Department could not be changed"} detail={error} live /> : null}
      {preview ? (
        <CcRecordEditorSection title={pl ? "Skutki zmiany" : "Change impact"} description={pl ? "Potwierdzenie dotyczy wyłącznie pokazanej wersji. Jeśli dane się zmienią, potrzebny będzie nowy podgląd." : "Confirmation applies only to this version. A later change requires a new preview."}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-bold">{pl ? "Dział" : "Department"}</dt><dd>{preview.department.key} · {preview.before.name} → {preview.after.name}</dd></div>
            <div><dt className="font-bold">{pl ? "Wersja" : "Version"}</dt><dd>{preview.department.version} → {preview.department.version + 1}</dd></div>
            <div><dt className="font-bold">{pl ? "Pozycja w nawigacji" : "Navigation position"}</dt><dd>{preview.before.position} → {preview.after.position}</dd></div>
            <div><dt className="font-bold">{pl ? "Dodane widoki" : "Attached views"}</dt><dd>{preview.attachedViews.length ? preview.attachedViews.map(viewName).join(", ") : (pl ? "Brak" : "None")}</dd></div>
            <div><dt className="font-bold">{pl ? "Odłączone widoki" : "Detached views"}</dt><dd>{preview.detachedViews.length ? preview.detachedViews.map(viewName).join(", ") : (pl ? "Brak" : "None")}</dd></div>
            <div><dt className="font-bold">{pl ? "Zachowane relacje organizacyjne" : "Preserved organizational relations"}</dt><dd>{preview.preserved.organizationalRelations}</dd></div>
            <div><dt className="font-bold">{pl ? "Zachowane przypisania odpowiedzialności" : "Preserved accountable relations"}</dt><dd>{preview.preserved.accountableRelations}</dd></div>
            <div><dt className="font-bold">{pl ? "Zachowane osoby i agenci" : "Preserved people and agents"}</dt><dd>{preview.preserved.workforce}</dd></div>
            <div><dt className="font-bold">{pl ? "Zachowane mapowania dostawców" : "Preserved provider mappings"}</dt><dd>{preview.preserved.providerMappings}</dd></div>
          </dl>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([{ title: pl ? "Obecna nawigacja" : "Current navigation", entries: preview.navigationBefore }, { title: pl ? "Proponowana nawigacja" : "Proposed navigation", entries: preview.navigationAfter }]).map((group) => (
              <section className="min-w-0 rounded-company border border-base-300 p-3" key={group.title}>
                <h3 className="font-bold">{group.title}</h3>
                <ol className="mt-2 max-h-44 list-inside list-decimal overflow-y-auto text-sm">
                  {group.entries.map((entry) => <li className="break-all" key={entry.viewKey}>{viewName(entry.viewKey)} <span className="text-company-muted">({entry.href})</span></li>)}
                </ol>
              </section>
            ))}
          </div>
          <details className="mt-4 rounded-company border border-base-300 p-3">
            <summary className="cursor-pointer font-bold">{pl ? "Istniejące relacje i odpowiedzialności" : "Existing relations and responsibilities"}</summary>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto break-all text-xs">
              {preview.existingRelations.map((item) => <li key={item.id}>{item.entityType} · {item.entityId} · {item.role}</li>)}
              {preview.existingOwnerships.map((item) => <li key={item.id}>{item.entityType} · {item.entityId} · {pl ? "odpowiedzialność" : "ownership"}</li>)}
              {preview.existingWorkforce.map((item) => <li key={item.id}>{item.type} · {item.id} · {pl ? "przełożony" : "manager"}: {item.managerId || "—"}</li>)}
              {preview.existingProviderMappings.map((item) => <li key={item.id}>{item.provider} · {item.entityType} · {item.externalId} · OperatingArea {item.operatingAreaId || "—"}</li>)}
            </ul>
          </details>
          <p className="mt-3 text-sm text-company-muted">{pl ? "Identyfikator i klucz działu, stare linki, uprawnienia, zakresy zadań i historia rekordów pozostają zachowane. Zmiana nie przenosi danych dostawców ani odpowiedzialności." : "The department ID and key, old links, permissions, task scopes, and record history are preserved. Provider data and responsibility are not moved."}</p>
        </CcRecordEditorSection>
      ) : (
      <>
      <CcRecordEditorSection title={pl ? "Definicja" : "Definition"} description={pl ? "Nazwa i cel widoczne podczas przeglądania struktury firmy." : "The name and purpose people see when they navigate the company structure."}>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label={pl ? "Nazwa" : "Name"} required>{({ id, describedBy, invalid }) => <CcTextInput aria-describedby={describedBy} autoFocus id={id} invalid={invalid} maxLength={120} onChange={(event) => onChange({ ...draft, name: event.target.value })} required value={draft.name} />}</CcField>
          <div className="md:col-span-2"><CcField label={pl ? "Opis" : "Description"} hint={pl ? "Opisz zakres tak, aby odróżnić dział od sąsiednich odpowiedzialności." : "Keep it specific enough to distinguish this department from adjacent responsibilities."}>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" id={id} maxLength={500} onChange={(event) => onChange({ ...draft, description: event.target.value })} value={draft.description} />}</CcField></div>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Nawigacja" : "Navigation"} description={pl ? "Wybierz ikonę i kolejność na pasku bocznym." : "Choose the visual marker and relative sidebar position."}>
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <CcField label={pl ? "Ikona" : "Icon"} hint={pl ? "Wybierz znak czytelny także na wąskim pasku bocznym." : "Pick a symbol that remains recognizable in the compact sidebar."}>{({ id }) => <CcIconPicker id={id} onChange={(icon) => onChange({ ...draft, icon })} value={draft.icon} />}</CcField>
          <CcField label={pl ? "Kolejność" : "Order"} hint={pl ? "Niższa liczba pojawia się wcześniej." : "Lower values appear first."}>{({ id, describedBy }) => <CcTextInput aria-describedby={describedBy} id={id} min={0} onChange={(event) => onChange({ ...draft, position: event.target.value })} type="number" value={draft.position} />}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Powiązane widoki" : "Linked views"} description={pl ? "Wybierz zatwierdzone widoki dostępne z tego działu." : "Select the approved workspace surfaces reachable from this department."}>
        <fieldset>
          <legend className="sr-only">{pl ? "Dostępne widoki" : "Available linked views"}</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {(packet?.availableViews || []).filter((view) => view.sourceDepartmentKey === packet?.departments.find((department) => department.id === draft.id)?.key || view.configurableShared || draft.linkedViews.includes(view.id)).map((view) => {
              const checked = draft.linkedViews.includes(view.id);
              return (
                <label className={`flex min-h-11 items-center gap-3 rounded-company border border-base-300 px-3 py-2 text-sm font-bold transition-colors ${checked ? "bg-primary/8 text-company-ink" : view.enabled ? "bg-base-100/20 text-company-ink hover:bg-base-200/45" : "bg-base-100/10 text-company-muted"}`} key={view.id}>
                  <input checked={checked} className="checkbox checkbox-primary checkbox-sm" disabled={!view.enabled} onChange={(event) => { const nextViews = event.target.checked ? [...draft.linkedViews, view.id] : draft.linkedViews.filter((id) => id !== view.id); onChange({ ...draft, linkedViews: nextViews }); }} type="checkbox" />
                  <i className={`ph-bold ${view.icon} shrink-0 text-company-muted`} aria-hidden="true"></i>
                  <span className="min-w-0 flex-1 truncate">{view.label}</span>
                  {!view.enabled ? <span className="text-[0.65rem] font-bold uppercase tracking-wide text-company-muted">{pl ? "Planowany" : "Planned"}</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      </CcRecordEditorSection>
      </>
      )}
    </CcRecordEditorModal>
  );
}

export function ManagementRoute() {
  const { t } = useLanguage();
  const tableLabels = useTranslatedTableLabels();
  const packetState = useOwnerPacket<DepartmentCatalogPacket>("/v1/departments", true, t);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<DepartmentCompositionPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshedPacketState = useOwnerPacket<DepartmentCatalogPacket>(`/v1/departments?refresh=${refreshKey}`, true, t);
  const packet = refreshedPacketState.data || packetState.data;
  const loading = packetState.status === "loading" && !packet;
  const error = packetState.status === "error" ? packetState.error || t("management.loadError") : null;

  const rows = useMemo(() => (packet?.departments || []).filter((department) => department.status !== "archived"), [packet]);
  const columns = useMemo<Array<CcTableColumn<WorkspaceDepartment>>>(() => [
    {
      key: "name",
      header: t("management.department"),
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
      header: t("management.linkedViews"),
      searchValue: departmentViewLabels,
      cell: (department) => <span className="block max-w-lg truncate text-sm">{departmentViewLabels(department)}</span>
    },
    {
      key: "type",
      header: t("management.type"),
      sortable: true,
      filterable: true,
      filterValue: (department) => department.isSystem ? t("management.builtIn") : t("management.custom"),
      cell: (department) => <span className="text-sm font-bold text-company-muted">{department.isSystem ? t("management.builtIn") : t("management.custom")}</span>
    },
    {
      key: "position",
      header: t("management.order"),
      sortable: true,
      sortValue: (department) => department.position,
      cell: (department) => <span className="font-mono text-sm">{department.position}</span>
    }
  ], [t]);

  async function advanceDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    setSaving(true);
    setSaveError(null);
    try {
      if (!draft.id) return;
      if (!preview) {
        const body = {
          name: draft.name,
          description: draft.description.trim() ? draft.description.trim() : null,
          icon: draft.icon.trim() || "ph-buildings",
          linkedViews: draft.linkedViews,
          position: Number(draft.position || 0)
        };
        const result = await api<{ data: DepartmentCompositionPreview }>(`/v1/departments/${draft.id}/preview`, { method: "POST", body: JSON.stringify(body) });
        setPreview(result.data);
      } else {
        const result = await api<{ data: { id: string; compositionVersion: number; linkedViews: string[] } }>(`/v1/departments/${draft.id}/actions/apply`, {
          method: "POST", body: JSON.stringify({ confirmationToken: preview.confirmationToken })
        });
        const readback = await api<{ data: DepartmentCatalogPacket }>("/v1/departments");
        const changed = readback.data.departments.find((department) => department.id === draft.id);
        if (!changed || changed.compositionVersion !== result.data.compositionVersion
          || [...changed.linkedViews].sort().join("|") !== [...result.data.linkedViews].sort().join("|")) {
          throw new Error("composition_readback_mismatch");
        }
        setDraft(null);
        setPreview(null);
        setRefreshKey((current) => current + 1);
        window.dispatchEvent(new Event("roost:department-catalog-updated"));
      }
    } catch (apiError) {
      if (preview) setPreview(null);
      setSaveError(userErrorMessage(apiError, t));
    } finally {
      setSaving(false);
    }
  }

  function editDepartment(department: WorkspaceDepartment) {
    setPreview(null);
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
        <CcPageHeader description={t("management.description")} eyebrow={t("management.eyebrow")} title={t("management.title")} />

        {draft ? (
          <DepartmentForm
            draft={draft}
            error={saveError}
            onCancel={() => { setDraft(null); setPreview(null); setSaveError(null); }}
            onChange={(next) => { setDraft(next); setPreview(null); setSaveError(null); }}
            onBack={() => setPreview(null)}
            onSubmit={advanceDraft}
            packet={packet || null}
            preview={preview}
            saving={saving}
          />
        ) : null}

        <CcDataTable
          columns={columns}
          density="compact"
          emptyDetail={t("management.emptyDetail")}
          emptyTitle={t("management.empty")}
          enableSearch
          error={error}
          getRowLabel={(department) => department.name}
          initialPageSize={25}
          initialSort={{ key: "position", direction: "asc" }}
          labels={tableLabels}
          loading={loading}
          mobileMode="cards"
          rowActionItems={[
            { key: "edit", label: t("management.edit"), icon: "ph-pencil-simple", tone: "primary", onClick: editDepartment }
          ]}
          rows={rows}
          stickyActions
          tableMinWidthClassName="min-w-[760px]"
        />
      </section>
    </>
  );
}
