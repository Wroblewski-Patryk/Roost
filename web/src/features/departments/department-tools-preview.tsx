import { CcButton } from "../../components/cc-button";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey, LoadState } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue } from "./shared";

type PreviewRecord = { id: string; title?: string; name?: string; status?: string; priority?: string | null; type?: string; sourceModel?: string };
type PreviewAssetsPacket = { resources: PreviewRecord[] };
type PreviewWorkforcePacket = { entities: PreviewRecord[] };
type PreviewDefinition = {
  key: string;
  label: string;
  icon: string;
  href: string;
  records: PreviewRecord[];
  empty: string;
  status: LoadState<unknown>["status"];
  rowLimit?: number;
};
type PreviewGroup = { key: string; label: string; detail: string; definitions: PreviewDefinition[] };

function scopedHref(base: string, departmentKey: CoreAreaKey) {
  return `${base}&department=${encodeURIComponent(departmentKey)}`;
}

function countLabel(count: number, polish: boolean) {
  if (polish) return count === 1 ? "1 przypisany rekord" : `${count} przypisanych rekordów`;
  return count === 1 ? "1 assigned record" : `${count} assigned records`;
}

function statusTone(status?: string) {
  const value = status?.toLowerCase() || "";
  if (["blocked", "critical", "failed", "overdue", "rejected"].some((token) => value.includes(token))) return "danger";
  if (["review", "pending", "waiting", "risk", "warning"].some((token) => value.includes(token))) return "warning";
  if (["complete", "completed", "done", "healthy", "approved"].some((token) => value.includes(token))) return "success";
  return "neutral";
}

function PreviewSection({ definition, locale, viewAll }: { definition: PreviewDefinition; locale: "en" | "pl"; viewAll: string }) {
  const polish = locale === "pl";
  const rows = definition.records.slice(0, definition.rowLimit || 3);
  const titleId = `department-preview-${definition.key}`;
  return <section aria-busy={definition.status === "loading"} aria-labelledby={titleId} className="department-preview-section">
    <header>
      <div className="department-preview-section__identity">
        <span className="department-preview-section__icon"><i className={`ph-bold ${definition.icon}`} aria-hidden="true"></i></span>
        <div><h4 id={titleId}>{definition.label}</h4><p>{definition.status === "loading" ? (polish ? "Pobieranie przypisanych danych…" : "Loading assigned data…") : definition.status === "error" ? (polish ? "Podgląd chwilowo niedostępny" : "Preview temporarily unavailable") : rows.length ? countLabel(definition.records.length, polish) : definition.empty}</p></div>
      </div>
      <CcButton ariaLabel={`${viewAll}: ${definition.label}`} href={definition.href} iconRight="ph-arrow-right" size="sm" variant="ghost">{viewAll}</CcButton>
    </header>

    {definition.status === "loading" ? <div className="department-preview-section__skeleton" aria-hidden="true">{[0, 1, 2].map((row) => <span key={row}><i></i><b></b></span>)}</div> : null}
    {definition.status === "error" ? <a className="department-preview-section__state is-error" href={definition.href}><i className="ph-bold ph-warning-circle" aria-hidden="true"></i><span><strong>{polish ? "Nie udało się wczytać podglądu" : "Preview could not load"}</strong><small>{polish ? "Otwórz moduł, aby spróbować ponownie." : "Open the module to try again."}</small></span><i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a> : null}
    {definition.status === "ready" && !rows.length ? <a className="department-preview-section__state" href={definition.href}><i className="ph-bold ph-plus-circle" aria-hidden="true"></i><span><strong>{definition.empty}</strong><small>{polish ? "Otwórz moduł, aby dodać lub przypisać rekord." : "Open the module to add or assign a record."}</small></span><i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a> : null}
    {definition.status === "ready" && rows.length ? <div className="department-preview-section__rows">{rows.map((record) => {
      const meta = humanizeBusinessValue(record.priority || record.type || record.sourceModel || (polish ? "rekord" : "record"), undefined, locale);
      const status = record.status ? humanizeBusinessValue(record.status, undefined, locale) : null;
      return <a href={definition.href} key={record.id}><span><strong>{record.title || record.name || "—"}</strong><small>{meta}</small></span>{status ? <b className={`is-${statusTone(record.status)}`}>{status}</b> : <i className="ph-bold ph-arrow-right" aria-hidden="true"></i>}</a>;
    })}</div> : null}
  </section>;
}

function PreviewGroupSection({ group, locale, viewAll }: { group: PreviewGroup; locale: "en" | "pl"; viewAll: string }) {
  return <section aria-labelledby={`department-preview-group-${group.key}`} className={`department-preview-group department-preview-group--${group.key}`}>
    <header className="department-preview-group__header"><h3 id={`department-preview-group-${group.key}`}>{group.label}</h3><p>{group.detail}</p></header>
    <div className="department-preview-group__grid">{group.definitions.map((definition) => <PreviewSection definition={definition} key={definition.key} locale={locale} viewAll={viewAll} />)}</div>
  </section>;
}

export function DepartmentToolsPreview({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const query = `departmentKey=${encodeURIComponent(departmentKey)}&includeCompanyWide=false`;
  const tasks = useOwnerPacket<PreviewRecord[]>(`/v1/tasks?${query}`, true, t);
  const procedures = useOwnerPacket<PreviewRecord[]>(`/v1/process-core/procedures?${query}`, true, t);
  const assets = useOwnerPacket<PreviewAssetsPacket>(`/v1/assets/context?areaKey=all&limit=8&${query}`, true, t);
  const goals = useOwnerPacket<PreviewRecord[]>(`/v1/goals?${query}`, true, t);
  const decisions = useOwnerPacket<PreviewRecord[]>(`/v1/decisions?${query}`, true, t);
  const projects = useOwnerPacket<PreviewRecord[]>(`/v1/projects?${query}`, true, t);
  const workforce = useOwnerPacket<PreviewWorkforcePacket>(`/v1/workforce?departmentKey=${encodeURIComponent(departmentKey)}`, true, t);
  const resources = useOwnerPacket<PreviewRecord[]>(`/v1/company-objects/resource?${query}`, true, t);
  const metrics = useOwnerPacket<PreviewRecord[]>(`/v1/company-objects/metric?${query}`, true, t);
  const policies = useOwnerPacket<PreviewRecord[]>(`/v1/company-objects/policy?${query}`, true, t);
  const risks = useOwnerPacket<PreviewRecord[]>(`/v1/company-objects/risk?${query}`, true, t);
  const viewAll = polish ? "Otwórz" : "Open";
  const definitions: PreviewDefinition[] = [
    { key: "tasks", label: polish ? "Zadania" : "Tasks", icon: "ph-list-checks", href: scopedHref("/areas?area=04-operacje&view=tasks", departmentKey), records: tasks.data || [], empty: polish ? "Brak przypisanych zadań" : "No assigned tasks", status: tasks.status, rowLimit: 4 },
    { key: "procedures", label: polish ? "Procedury" : "Procedures", icon: "ph-list-numbers", href: scopedHref("/areas?area=04-operacje&view=procedures", departmentKey), records: procedures.data || [], empty: polish ? "Brak przypisanych procedur" : "No assigned procedures", status: procedures.status, rowLimit: 4 },
    { key: "files", label: polish ? "Pliki i foldery" : "Files and folders", icon: "ph-folders", href: scopedHref("/areas?area=08-zasoby&view=files", departmentKey), records: assets.data?.resources || [], empty: polish ? "Brak przypisanych plików" : "No assigned files", status: assets.status, rowLimit: 4 },
    { key: "goals", label: polish ? "Cele" : "Goals", icon: "ph-target", href: scopedHref("/areas?area=01-strategia&view=goals", departmentKey), records: goals.data || [], empty: polish ? "Brak przypisanych celów" : "No assigned goals", status: goals.status },
    { key: "decisions", label: polish ? "Decyzje" : "Decisions", icon: "ph-signpost", href: scopedHref("/areas?area=01-strategia&view=decisions", departmentKey), records: decisions.data || [], empty: polish ? "Brak przypisanych decyzji" : "No assigned decisions", status: decisions.status },
    { key: "projects", label: polish ? "Projekty" : "Projects", icon: "ph-briefcase", href: scopedHref("/areas?area=11-innowacje&view=projects", departmentKey), records: projects.data || [], empty: polish ? "Brak przypisanych projektów" : "No assigned projects", status: projects.status },
    { key: "workforce", label: polish ? "Ludzie i agenci" : "People and agents", icon: "ph-users-three", href: scopedHref("/areas?area=06-kadry&view=directory", departmentKey), records: workforce.data?.entities || [], empty: polish ? "Brak przypisanych osób i agentów" : "No assigned people or agents", status: workforce.status },
    { key: "resources", label: polish ? "Zasoby firmy" : "Company resources", icon: "ph-cube", href: scopedHref("/areas?area=08-zasoby&view=resources", departmentKey), records: resources.data || [], empty: polish ? "Brak przypisanych zasobów" : "No assigned resources", status: resources.status },
    { key: "metrics", label: polish ? "Metryki i KPI" : "Metrics and KPIs", icon: "ph-chart-line-up", href: scopedHref("/areas?area=01-strategia&view=metrics", departmentKey), records: metrics.data || [], empty: polish ? "Brak przypisanych metryk" : "No assigned metrics", status: metrics.status },
    { key: "policies", label: polish ? "Polityki i guardraile" : "Policies and guardrails", icon: "ph-shield-check", href: scopedHref("/areas?area=10-prawo&view=policies", departmentKey), records: policies.data || [], empty: polish ? "Brak przypisanych polityk" : "No assigned policies", status: policies.status },
    { key: "risks", label: polish ? "Ryzyka" : "Risks", icon: "ph-warning-diamond", href: scopedHref("/areas?area=12-zarzadzanie&view=risks", departmentKey), records: risks.data || [], empty: polish ? "Brak przypisanych ryzyk" : "No assigned risks", status: risks.status }
  ];
  const byKey = Object.fromEntries(definitions.map((definition) => [definition.key, definition])) as Record<string, PreviewDefinition>;
  const groups: PreviewGroup[] = [
    { key: "execution", label: polish ? "Bieżąca praca" : "Current work", detail: polish ? "To, co zespół wykonuje i czego potrzebuje do działania." : "What the team is executing and the material it needs.", definitions: [byKey.tasks, byKey.procedures, byKey.files] },
    { key: "direction", label: polish ? "Kierunek i dostarczanie" : "Direction and delivery", detail: polish ? "Cele, decyzje i projekty nadające pracy wspólny kierunek." : "Goals, decisions, and projects that give the work direction.", definitions: [byKey.goals, byKey.decisions, byKey.projects] },
    { key: "governance", label: polish ? "Zdolność i nadzór" : "Capacity and governance", detail: polish ? "Ludzie, zasoby oraz sygnały potrzebne do bezpiecznego działania." : "People, resources, and signals needed to operate safely.", definitions: [byKey.workforce, byKey.resources, byKey.metrics, byKey.policies, byKey.risks] }
  ];
  const readyDefinitions = definitions.filter((definition) => definition.status === "ready");
  const assignedCount = readyDefinitions.reduce((total, definition) => total + definition.records.length, 0);

  return <section className="department-tools-preview" aria-labelledby={`department-tools-${departmentKey}`}>
    <header className="department-tools-preview__header">
      <div><p>{polish ? "Kontekst działu" : "Department context"}</p><h2 id={`department-tools-${departmentKey}`}>{polish ? "Wspólna praca w jednym miejscu" : "Shared work in one place"}</h2><span>{departmentLabel(departmentKey, t)} · {polish ? "wyłącznie rekordy bezpośrednio powiązane z tym działem" : "only records directly linked to this department"}</span></div>
      {readyDefinitions.length ? <p className="department-tools-preview__summary"><strong>{assignedCount}</strong><span>{polish ? "powiązanych rekordów" : "linked records"}</span></p> : null}
    </header>
    <div className="department-tools-preview__groups">{groups.map((group) => <PreviewGroupSection group={group} key={group.key} locale={locale} viewAll={viewAll} />)}</div>
  </section>;
}
