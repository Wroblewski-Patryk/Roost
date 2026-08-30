import { CcButton } from "../../components/cc-button";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue } from "./shared";

type PreviewRecord = { id: string; title?: string; name?: string; status?: string; priority?: string | null; type?: string; sourceModel?: string };
type PreviewAssetsPacket = { resources: PreviewRecord[] };
type PreviewWorkforcePacket = { entities: PreviewRecord[] };
type PreviewDefinition = { label: string; icon: string; href: string; records: PreviewRecord[]; empty: string };

function scopedHref(base: string, departmentKey: CoreAreaKey) {
  return `${base}&department=${encodeURIComponent(departmentKey)}`;
}

function PreviewSection({ definition, locale, viewAll }: { definition: PreviewDefinition; locale: "en" | "pl"; viewAll: string }) {
  const rows = definition.records.slice(0, 4);
  return <section>
    <header><div><i className={`ph-bold ${definition.icon}`} aria-hidden="true"></i><div><strong>{definition.label}</strong><span>{rows.length ? `${rows.length} ${locale === "pl" ? "ostatnie przypisane" : "recent assigned"}` : definition.empty}</span></div></div><CcButton href={definition.href} iconRight="ph-arrow-right" size="xs" variant="ghost">{viewAll}</CcButton></header>
    <div>{rows.map((record) => <a href={definition.href} key={record.id}><span><strong>{record.title || record.name || "—"}</strong><small>{humanizeBusinessValue(record.priority || record.type || record.sourceModel || "record", undefined, locale)}</small></span>{record.status ? <b>{humanizeBusinessValue(record.status, undefined, locale)}</b> : <i className="ph-bold ph-arrow-right" aria-hidden="true"></i>}</a>)}</div>
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
  const viewAll = polish ? "Wszystkie" : "View all";
  const definitions: PreviewDefinition[] = [
    { label: polish ? "Zadania" : "Tasks", icon: "ph-list-checks", href: scopedHref("/areas?area=04-operacje&view=tasks", departmentKey), records: tasks.data || [], empty: polish ? "Brak przypisanych zadań" : "No assigned tasks" },
    { label: polish ? "Procedury" : "Procedures", icon: "ph-list-numbers", href: scopedHref("/areas?area=04-operacje&view=procedures", departmentKey), records: procedures.data || [], empty: polish ? "Brak przypisanych procedur" : "No assigned procedures" },
    { label: polish ? "Pliki i foldery" : "Files and folders", icon: "ph-folders", href: scopedHref("/areas?area=08-zasoby&view=files", departmentKey), records: assets.data?.resources || [], empty: polish ? "Brak przypisanych plików" : "No assigned files" },
    { label: polish ? "Cele" : "Goals", icon: "ph-target", href: scopedHref("/areas?area=01-strategia&view=goals", departmentKey), records: goals.data || [], empty: polish ? "Brak przypisanych celów" : "No assigned goals" },
    { label: polish ? "Decyzje" : "Decisions", icon: "ph-signpost", href: scopedHref("/areas?area=01-strategia&view=decisions", departmentKey), records: decisions.data || [], empty: polish ? "Brak przypisanych decyzji" : "No assigned decisions" },
    { label: polish ? "Projekty" : "Projects", icon: "ph-briefcase", href: scopedHref("/areas?area=11-innowacje&view=projects", departmentKey), records: projects.data || [], empty: polish ? "Brak przypisanych projektów" : "No assigned projects" },
    { label: polish ? "Ludzie i agenci" : "People and agents", icon: "ph-users-three", href: scopedHref("/areas?area=06-kadry&view=directory", departmentKey), records: workforce.data?.entities || [], empty: polish ? "Brak przypisanych osób i agentów" : "No assigned people or agents" },
    { label: polish ? "Zasoby firmy" : "Company resources", icon: "ph-cube", href: scopedHref("/areas?area=08-zasoby&view=resources", departmentKey), records: resources.data || [], empty: polish ? "Brak przypisanych zasobów" : "No assigned resources" },
    { label: polish ? "Metryki i KPI" : "Metrics and KPIs", icon: "ph-chart-line-up", href: scopedHref("/areas?area=01-strategia&view=metrics", departmentKey), records: metrics.data || [], empty: polish ? "Brak przypisanych metryk" : "No assigned metrics" },
    { label: polish ? "Polityki i guardraile" : "Policies and guardrails", icon: "ph-shield-check", href: scopedHref("/areas?area=10-prawo&view=policies", departmentKey), records: policies.data || [], empty: polish ? "Brak przypisanych polityk" : "No assigned policies" },
    { label: polish ? "Ryzyka" : "Risks", icon: "ph-warning-diamond", href: scopedHref("/areas?area=12-zarzadzanie&view=risks", departmentKey), records: risks.data || [], empty: polish ? "Brak przypisanych ryzyk" : "No assigned risks" }
  ];

  return <section className="department-tools-preview" aria-labelledby={`department-tools-${departmentKey}`}>
    <header><div><p>{polish ? "Wspólna warstwa firmy" : "Shared company layer"}</p><h2 id={`department-tools-${departmentKey}`}>{polish ? "Dane przypisane do działu" : "Records assigned to this department"}</h2><span>{departmentLabel(departmentKey, t)} · {polish ? "tylko rekordy bezpośrednio powiązane z tym działem" : "only records directly linked to this department"}</span></div></header>
    <div className="department-tools-preview__primary">{definitions.map((definition) => <PreviewSection definition={definition} key={definition.label} locale={locale} viewAll={viewAll} />)}</div>
  </section>;
}
