import { useState } from "react";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";
import type { CoreAreaKey } from "../../types";
import { recordIdFromQuery } from "../../owner-record-navigation";
import { DepartmentScopeControl } from "./department-scope-control";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type HistoricalTask = {
  id: string; title: string; description?: string | null; status: string;
  source?: string | null; externalId?: string | null;
  createdAt?: string | null; updatedAt?: string | null; dueDate?: string | null;
  project?: { name: string } | null; taskList?: { name: string } | null;
  organizationalContext?: { ownerDepartment?: { key: CoreAreaKey } | null } | null;
};

export function taskScopeHref(scope: "current" | "history", search: string, taskId?: string) {
  const params = new URLSearchParams(search);
  params.set("view", "tasks");
  params.delete("taskId");
  params.delete("historicalTaskId");
  if (scope === "history") params.set("scope", "history");
  else params.delete("scope");
  if (scope === "history" && taskId) params.set("historicalTaskId", taskId);
  return `/areas?${params.toString()}`;
}

export function TaskScopeSwitch({ history }: { history: boolean }) {
  const { locale } = useLanguage();
  const polish = locale === "pl";
  return <div aria-label={polish ? "Zakres zadań" : "Task scope"} className="flex flex-wrap gap-2" role="group">
    <a aria-current={!history ? "page" : undefined} className={`btn btn-sm ${!history ? "btn-primary" : "btn-outline"}`} href={taskScopeHref("current", window.location.search)}>{polish ? "Bieżące" : "Current"}</a>
    <a aria-current={history ? "page" : undefined} className={`btn btn-sm ${history ? "btn-primary" : "btn-outline"}`} href={taskScopeHref("history", window.location.search)}>{polish ? "Historia" : "History"}</a>
  </div>;
}

export function TaskHistoryWorkbench({ departmentScope }: { departmentScope: CoreAreaKey | null }) {
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const [refreshKey, setRefreshKey] = useState(0);
  const query = `archive=only${departmentScope ? `&departmentKey=${encodeURIComponent(departmentScope)}&includeCompanyWide=false` : ""}&refresh=${refreshKey}`;
  const packet = useOwnerPacket<HistoricalTask[]>(`/v1/tasks?${query}`, true, t);
  const labels = useTranslatedTableLabels();
  const rows = packet.data || [];
  const params = new URLSearchParams(window.location.search);
  const requestedId = recordIdFromQuery(window.location.search, "taskId");
  const historicalId = params.has("historicalTaskId") ? recordIdFromQuery(window.location.search, "historicalTaskId") : requestedId;
  const selected = historicalId ? rows.find((row) => row.id.toLowerCase() === historicalId) : null;
  const invalidSelection = params.has("historicalTaskId") && !historicalId;
  const columns: Array<CcTableColumn<HistoricalTask>> = [
    { key: "task", header: polish ? "Zadanie" : "Task", sortable: true, searchValue: (row) => `${row.title} ${row.description || ""} ${row.id}`, cell: (row) => <a className="font-semibold text-company-ink underline-offset-2 hover:underline focus-visible:underline" href={taskScopeHref("history", window.location.search, row.id)}>{row.title}</a> },
    { key: "source", header: polish ? "Źródło" : "Source", filterable: true, filterValue: (row) => row.source || "unknown", cell: (row) => humanizeBusinessValue(row.source, "—", locale) },
    { key: "department", header: polish ? "Dział" : "Department", filterable: true, filterValue: (row) => row.organizationalContext?.ownerDepartment?.key || "unassigned", cell: (row) => row.organizationalContext?.ownerDepartment ? departmentLabel(row.organizationalContext.ownerDepartment.key, t) : "—" },
    { key: "updated", header: polish ? "Zmieniono" : "Updated", sortable: true, sortValue: (row) => row.updatedAt || "", cell: (row) => row.updatedAt ? formatAppDate(row.updatedAt, { dateStyle: "medium" }) : "—" }
  ];
  const scopeBase = new URLSearchParams(window.location.search);
  scopeBase.delete("department");
  scopeBase.delete("taskId");
  scopeBase.delete("historicalTaskId");
  scopeBase.set("area", "04-operacje");
  scopeBase.set("scope", "history");
  scopeBase.set("view", "tasks");
  return <>
    <CcPageHeader actions={<><DepartmentScopeControl baseHref={`/areas?${scopeBase.toString()}`} value={departmentScope} /><TaskScopeSwitch history /></>} description={polish ? "Zachowane archiwalne zadania firmy. Otwórz dokładny zapis bez zmiany statusu ani danych dostawcy." : "Retained archived company tasks. Open an exact record without changing its status or provider data."} eyebrow={departmentScope ? departmentLabel(departmentScope, t) : t("areas.04.label")} title={polish ? "Historia zadań" : "Task history"} />
    {packet.status === "error" ? <CcNotice live tone="error" title={packet.error || (polish ? "Nie udało się wczytać historii." : "Could not load task history.")} action={<CcButton onClick={() => setRefreshKey(value => value + 1)} variant="outline">{polish ? "Ponów" : "Retry"}</CcButton>} /> : <CcDataTable columns={columns} rows={rows} emptyTitle={polish ? "Brak zadań w historii" : "No tasks in history"} emptyDetail={polish ? "Archiwalne zadania w tym zakresie pojawią się tutaj. Bieżąca praca pozostaje w widoku Bieżące." : "Archived tasks in this scope will appear here. Current work remains in Current."} getRowLabel={(row) => row.title} labels={labels} loading={packet.status === "loading"} mobileMode="cards" rowActions={(row) => <CcButton href={taskScopeHref("history", window.location.search, row.id)} size="sm" variant="outline">{polish ? "Otwórz zapis" : "Open record"}</CcButton>} />}
    {invalidSelection || historicalId && packet.status === "ready" && !selected ? <CcNotice live tone="error" title={polish ? "Wskazane zadanie jest niedostępne w tym zakresie." : "The requested task is unavailable in this scope."} /> : null}
    {selected ? <section aria-labelledby="historical-task-title" className="roost-work-panel mt-5 rounded-company p-5" id="historical-task-record">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-company-muted">{polish ? "Zapis historyczny · tylko do odczytu" : "Historical record · read only"}</p><h2 className="mt-1 text-xl font-bold text-company-ink" id="historical-task-title">{selected.title}</h2></div><CcButton href={taskScopeHref("history", window.location.search)} variant="outline">{polish ? "Zamknij zapis" : "Close record"}</CcButton></div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        {([
          ["ID", selected.id], [polish ? "Status" : "Status", humanizeBusinessValue(selected.status, "—", locale)],
          [polish ? "Źródło" : "Source", selected.source || "—"], [polish ? "ID u dostawcy" : "Provider ID", selected.externalId || "—"],
          [polish ? "Dział" : "Department", selected.organizationalContext?.ownerDepartment ? departmentLabel(selected.organizationalContext.ownerDepartment.key, t) : "—"],
          [polish ? "Lista" : "List", selected.taskList?.name || "—"], [polish ? "Projekt" : "Project", selected.project?.name || "—"],
          [polish ? "Utworzono" : "Created", selected.createdAt ? formatAppDate(selected.createdAt, { dateStyle: "medium", timeStyle: "short" }) : "—"],
          [polish ? "Zmieniono" : "Updated", selected.updatedAt ? formatAppDate(selected.updatedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"]
        ] as Array<[string, string]>).map(([label, value]) => <div className="min-w-0" key={label}><dt className="font-semibold text-company-muted">{label}</dt><dd className="mt-1 break-words text-company-ink">{value}</dd></div>)}
      </dl>
      {selected.description ? <div className="mt-5"><h3 className="font-semibold text-company-muted">{polish ? "Opis" : "Description"}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-company-ink">{selected.description}</p></div> : null}
    </section> : null}
  </>;
}
