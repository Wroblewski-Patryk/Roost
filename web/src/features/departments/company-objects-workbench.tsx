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

export type CompanyObjectType = "resource" | "risk" | "metric" | "policy";
type Department = { id: string; key: CoreAreaKey; name: string };
type CompanyObject = {
  id: string; name: string; description?: string | null; type?: string; category?: string | null; status?: string; riskLevel?: string;
  measurementType?: string; unit?: string | null; targetValue?: number | null; currentValue?: number | null; url?: string | null; accessLevel?: string;
  appliesTo?: string; ruleType?: string; severity?: string; enforcementMode?: string; updatedAt: string;
  organizationalContext?: { ownerDepartment?: Department | null; relatedDepartments?: Department[]; applicableDepartments?: Department[]; scopes?: Array<{ type: string }> };
};
type Draft = { name: string; description: string; primary: string; secondary: string; tertiary: string; value: string; target: string; status: string; ownerDepartmentKey: string; relatedDepartmentKeys: string[]; applicableDepartmentKeys: string[]; companyWide: boolean };

const config = {
  resource: { canonical: "08-zasoby", icon: "ph-cube", primary: "Resource type", secondary: "URL", tertiary: "Access level", defaults: ["documentation", "", "workspace"] },
  risk: { canonical: "12-zarzadzanie", icon: "ph-warning-diamond", primary: "Category", secondary: "Likelihood", tertiary: "Impact", defaults: ["operational", "possible", ""] },
  metric: { canonical: "01-strategia", icon: "ph-chart-line-up", primary: "Category", secondary: "Measurement type", tertiary: "Unit", defaults: ["company", "manual", ""] },
  policy: { canonical: "10-prawo", icon: "ph-shield-check", primary: "Applies to", secondary: "Rule type", tertiary: "Enforcement mode", defaults: ["company", "guardrail", "soft_warning"] }
} as const;

function titleFor(type: CompanyObjectType, polish: boolean) { return polish ? ({ resource: "Zasoby firmy", risk: "Ryzyka", metric: "Metryki i KPI", policy: "Polityki i guardraile" })[type] : ({ resource: "Company resources", risk: "Risks", metric: "Metrics and KPIs", policy: "Policies and guardrails" })[type]; }
function draftFor(type: CompanyObjectType, record: CompanyObject | null, departmentKey: CoreAreaKey): Draft {
  const defaults = config[type].defaults;
  return { name: record?.name || "", description: record?.description || "", primary: record?.type || record?.category || record?.appliesTo || defaults[0], secondary: record?.url || record?.measurementType || record?.likelihood || record?.ruleType || defaults[1], tertiary: record?.accessLevel || record?.unit || record?.impact || record?.enforcementMode || defaults[2], value: record?.currentValue?.toString() || "", target: record?.targetValue?.toString() || "", status: record?.status || record?.riskLevel || record?.severity || "active", ownerDepartmentKey: record?.organizationalContext?.ownerDepartment?.key || departmentKey, relatedDepartmentKeys: record?.organizationalContext?.relatedDepartments?.map((item) => item.key) || [], applicableDepartmentKeys: record?.organizationalContext?.applicableDepartments?.map((item) => item.key) || [], companyWide: Boolean(record?.organizationalContext?.scopes?.some((scope) => scope.type === "company")) };
}

function payloadFor(type: CompanyObjectType, draft: Draft) {
  const organizationalContext = { ownerDepartmentKey: draft.ownerDepartmentKey, relatedDepartmentKeys: draft.relatedDepartmentKeys.filter((key) => key !== draft.ownerDepartmentKey), applicableDepartmentKeys: draft.applicableDepartmentKeys.filter((key) => key !== draft.ownerDepartmentKey), scopes: draft.companyWide ? [{ type: "company" }] : [{ type: "department", entityId: draft.ownerDepartmentKey }] };
  if (type === "resource") return { name: draft.name, type: draft.primary, url: draft.secondary || null, accessLevel: draft.tertiary || "workspace", metadata: { description: draft.description }, organizationalContext };
  if (type === "risk") return { name: draft.name, description: draft.description || null, category: draft.primary || null, likelihood: draft.secondary || null, impact: draft.tertiary || null, riskLevel: draft.status, organizationalContext };
  if (type === "metric") return { name: draft.name, description: draft.description || null, category: draft.primary, measurementType: draft.secondary, unit: draft.tertiary || null, currentValue: draft.value ? Number(draft.value) : null, targetValue: draft.target ? Number(draft.target) : null, organizationalContext };
  return { name: draft.name, description: draft.description || null, appliesTo: draft.primary, ruleType: draft.secondary, enforcementMode: draft.tertiary, severity: draft.status, organizationalContext };
}

function ObjectEditor({ type, record, departmentKey, departments, onClose, onSaved }: { type: CompanyObjectType; record: CompanyObject | null; departmentKey: CoreAreaKey; departments: Department[]; onClose: () => void; onSaved: () => void }) {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const [draft, setDraft] = useState(() => draftFor(type, record, departmentKey)); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const objectConfig = config[type];
  const options = departments.map((department) => ({ value: department.key, label: departmentLabel(department.key, t) }));
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(null); try { await api(`/v1/company-objects/${type}${record ? `/${record.id}` : ""}`, { method: record ? "PATCH" : "POST", body: JSON.stringify(payloadFor(type, draft)) }); onSaved(); } catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); } finally { setBusy(false); } }
  const stateOptions = type === "risk" || type === "policy" ? ["low", "medium", "high", "critical"] : ["active", "draft", "paused", "retired"];
  return <CcRecordEditorModal actions={<><CcButton onClick={onClose} variant="ghost">{t("common.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("common.save")}</CcButton></>} description={polish ? "Jeden obiekt kanoniczny, widoczny we wszystkich przypisanych perspektywach działowych." : "One canonical object, visible in every assigned department perspective."} eyebrow={titleFor(type, polish)} onClose={onClose} onSubmit={submit} title={`${record ? polish ? "Edytuj" : "Edit" : polish ? "Utwórz" : "Create"} ${titleFor(type, polish).toLowerCase()}`} titleId="company-object-editor-title">
    {error ? <CcNotice live tone="error" title={humanizeBusinessValue(error)} /> : null}
    <CcRecordEditorSection title={polish ? "Definicja" : "Definition"}><div className="grid gap-4 md:grid-cols-2">
      <CcField label={polish ? "Nazwa" : "Name"} required>{({ id }) => <input className="input input-bordered w-full" id={id} maxLength={240} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />}</CcField>
      <CcField label={objectConfig.primary} required>{({ id }) => <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, primary: event.target.value })} required value={draft.primary} />}</CcField>
      <CcField label={polish ? "Opis" : "Description"}>{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} />}</CcField>
      <div className="grid gap-4"><CcField label={objectConfig.secondary} required={type === "metric" || type === "policy"}>{({ id }) => <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, secondary: event.target.value })} required={type === "metric" || type === "policy"} type={type === "resource" ? "url" : "text"} value={draft.secondary} />}</CcField><CcField label={objectConfig.tertiary}>{({ id }) => type === "policy" ? <CcSelect id={id} onChange={(event) => setDraft({ ...draft, tertiary: event.target.value })} value={draft.tertiary}>{["soft_warning", "block", "require_approval", "log_only"].map((value) => <option key={value} value={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect> : <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, tertiary: event.target.value })} value={draft.tertiary} />}</CcField></div>
      {type === "metric" ? <><CcField label={polish ? "Wartość bieżąca" : "Current value"}>{({ id }) => <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, value: event.target.value })} type="number" value={draft.value} />}</CcField><CcField label={polish ? "Wartość docelowa" : "Target value"}>{({ id }) => <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, target: event.target.value })} type="number" value={draft.target} />}</CcField></> : null}
      <CcField label={type === "risk" ? (polish ? "Poziom ryzyka" : "Risk level") : type === "policy" ? (polish ? "Dotkliwość" : "Severity") : "Status"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, status: event.target.value })} value={draft.status}>{stateOptions.map((value) => <option key={value} value={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField>
    </div></CcRecordEditorSection>
    <CcRecordEditorSection title={polish ? "Kontekst organizacyjny" : "Organizational context"}><div className="grid gap-4 md:grid-cols-2">
      <CcField label={polish ? "Dział właścicielski" : "Owner department"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, ownerDepartmentKey: event.target.value })} value={draft.ownerDepartmentKey}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</CcSelect>}</CcField>
      <CcField label={polish ? "Powiązane działy" : "Related departments"}>{({ id }) => <CcMultiSelect id={id} name="relatedDepartmentKeys" onChange={(value) => setDraft({ ...draft, relatedDepartmentKeys: value })} options={options.filter((option) => option.value !== draft.ownerDepartmentKey)} value={draft.relatedDepartmentKeys} />}</CcField>
      <CcField label={polish ? "Działy objęte" : "Applicable departments"}>{({ id }) => <CcMultiSelect id={id} name="applicableDepartmentKeys" onChange={(value) => setDraft({ ...draft, applicableDepartmentKeys: value })} options={options.filter((option) => option.value !== draft.ownerDepartmentKey)} value={draft.applicableDepartmentKeys} />}</CcField>
      <label className="flex min-h-11 items-center gap-3 rounded-company border border-base-300 px-3 py-2 text-sm font-bold"><input checked={draft.companyWide} className="checkbox checkbox-primary checkbox-sm" onChange={(event) => setDraft({ ...draft, companyWide: event.target.checked })} type="checkbox" />{polish ? "Zakres całej firmy" : "Company-wide scope"}</label>
    </div></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function CompanyObjectsWorkbench({ type, departmentKey }: { type: CompanyObjectType; departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const [refreshKey, setRefreshKey] = useState(0); const [editing, setEditing] = useState<CompanyObject | null | undefined>(undefined); const [archiving, setArchiving] = useState<CompanyObject | null>(null); const [archiveBusy, setArchiveBusy] = useState(false);
  const requestedDepartment = new URLSearchParams(window.location.search).get("department") as CoreAreaKey | null; const effectiveDepartment = requestedDepartment || departmentKey; const scoped = Boolean(requestedDepartment);
  const packet = useOwnerPacket<CompanyObject[]>(`/v1/company-objects/${type}?${scoped ? `departmentKey=${effectiveDepartment}&includeCompanyWide=false&` : ""}refresh=${refreshKey}`, true, t); const departmentPacket = useOwnerPacket<{ departments: Department[] }>(`/v1/departments?refresh=${refreshKey}`, true, t); const rows = packet.data || []; const labels = useTranslatedTableLabels();
  const columns = useMemo<Array<CcTableColumn<CompanyObject>>>(() => [
    { key: "name", header: titleFor(type, polish), sortable: true, searchValue: (row) => `${row.name} ${row.description || ""} ${row.category || ""} ${row.type || ""}`, cell: (row) => <button className="grid text-left" onClick={() => setEditing(row)} type="button"><strong>{row.name}</strong><span className="text-xs text-company-muted">{row.description || row.type || row.category || row.appliesTo || "—"}</span></button> },
    { key: "owner", header: polish ? "Właściciel" : "Owner", filterable: true, filterValue: (row) => row.organizationalContext?.ownerDepartment?.key || "unassigned", cell: (row) => <span className="text-sm text-company-muted">{row.organizationalContext?.ownerDepartment ? departmentLabel(row.organizationalContext.ownerDepartment.key, t) : "—"}</span> },
    { key: "scope", header: polish ? "Zakres" : "Scope", cell: (row) => <span className="text-sm text-company-muted">{row.organizationalContext?.scopes?.some((scope) => scope.type === "company") ? (polish ? "Firma" : "Company") : `${(row.organizationalContext?.relatedDepartments?.length || 0) + (row.organizationalContext?.applicableDepartments?.length || 0) + 1} dept.`}</span> },
    { key: "state", header: type === "risk" ? (polish ? "Ryzyko" : "Risk") : t("table.status"), filterable: true, filterValue: (row) => row.riskLevel || row.severity || row.status || row.accessLevel, cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.riskLevel || row.severity || row.status || row.accessLevel || "active", undefined, locale)}</span> },
    { key: "actions", header: t("table.actions"), cell: (row) => <div className="flex justify-end gap-1"><CcButton ariaLabel="Edit" iconLeft="ph-pencil-simple" onClick={() => setEditing(row)} size="xs" variant="ghost"><span className="sr-only">Edit</span></CcButton><CcButton ariaLabel="Archive" iconLeft="ph-archive" onClick={() => setArchiving(row)} size="xs" variant="ghost"><span className="sr-only">Archive</span></CcButton></div> }
  ], [locale, polish, t, type]);
  function refresh() { setEditing(undefined); setRefreshKey((value) => value + 1); }
  async function confirmArchive() { if (!archiving) return; setArchiveBusy(true); try { await api(`/v1/company-objects/${type}/${archiving.id}`, { method: "DELETE" }); setArchiving(null); refresh(); } finally { setArchiveBusy(false); } }
  const canonical = departmentKey === config[type].canonical;
  const baseHref = `/areas?area=${config[type].canonical}&view=${type === "resource" ? "resources" : type === "policy" ? "policies" : type === "risk" ? "risks" : "metrics"}`;
  return <><CcPageHeader actions={<><DepartmentScopeControl baseHref={baseHref} value={requestedDepartment} /><CcButton href="/areas?area=00-ogolny&view=company-graph" iconLeft="ph-graph" size="sm" variant="outline">Company Graph</CcButton><CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{polish ? "Utwórz" : "Create"}</CcButton></>} description={canonical ? (polish ? "Kanoniczny, ogólnofirmowy katalog. Filtry działowe pokazują perspektywy bez kopiowania danych." : "Canonical company-wide catalog. Department filters create perspectives without copying data.") : (polish ? "Kontekstowy widok wspólnego katalogu firmy, filtrowany relacjami organizacyjnymi." : "Contextual view of the shared company catalog, filtered by organizational relationships.")} eyebrow={scoped ? departmentLabel(effectiveDepartment, t) : departmentLabel(departmentKey, t)} title={titleFor(type, polish)} />
    {packet.status === "error" ? <CcNotice live tone="error" title={packet.error || "Records could not load."} /> : null}
    <CcDataTable columns={columns} rows={rows} emptyDetail={polish ? "Utwórz pierwszy obiekt i przypisz jego właściciela oraz zakres." : "Create the first object and assign its owner and scope."} emptyTitle={polish ? "Brak rekordów w tym kontekście" : "No records in this context"} error={packet.status === "error" ? packet.error : null} getRowLabel={(row) => row.name} labels={labels} loading={packet.status === "loading"} mobileMode="cards" />
    {editing !== undefined ? <ObjectEditor departmentKey={effectiveDepartment} departments={departmentPacket.data?.departments || []} onClose={() => setEditing(undefined)} onSaved={refresh} record={editing} type={type} /> : null}
    {archiving ? <CcConfirmDialog busy={archiveBusy} confirmIcon="ph-archive" confirmLabel={polish ? "Archiwizuj" : "Archive"} confirmTone="warning" description={polish ? "Obiekt zniknie z aktywnych perspektyw, a historia zdarzeń pozostanie." : "The object leaves active perspectives while its event history remains."} detail={<strong>{archiving.name}</strong>} eyebrow={titleFor(type, polish)} onCancel={() => setArchiving(null)} onConfirm={confirmArchive} title={polish ? "Archiwizować obiekt?" : "Archive object?"} /> : null}
  </>;
}
