import { CcButton } from "../../components/cc-button";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue } from "./shared";

type PreviewTask = { id: string; title: string; status: string; priority?: string | null };
type PreviewAsset = { id: string; name: string; type?: string; sourceModel?: string; organization?: { isFolder?: boolean } };
type PreviewAssetsPacket = { resources: PreviewAsset[] };
type DepartmentHealth = { signals: Record<string, number> };

function scopedHref(base: string, departmentKey: CoreAreaKey) {
  return `${base}&department=${encodeURIComponent(departmentKey)}`;
}

export function DepartmentToolsPreview({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const tasks = useOwnerPacket<PreviewTask[]>(`/v1/tasks?departmentKey=${encodeURIComponent(departmentKey)}&includeCompanyWide=true`, true, t);
  const assets = useOwnerPacket<PreviewAssetsPacket>(`/v1/assets/context?areaKey=all&limit=8&departmentKey=${encodeURIComponent(departmentKey)}`, true, t);
  const health = useOwnerPacket<DepartmentHealth>(`/v1/company-intelligence/health?departmentKey=${encodeURIComponent(departmentKey)}`, true, t);
  const taskRows = (tasks.data || []).slice(0, 4);
  const assetRows = (assets.data?.resources || []).slice(0, 4);
  const signals = health.data?.signals || {};
  const tools = [
    { label: polish ? "Cele" : "Goals", count: signals.activeGoals || 0, icon: "ph-target", href: scopedHref("/areas?area=01-strategia&view=goals", departmentKey) },
    { label: polish ? "Decyzje" : "Decisions", count: signals.decisionsRequiringReview || 0, icon: "ph-signpost", href: scopedHref("/areas?area=01-strategia&view=decisions", departmentKey) },
    { label: polish ? "Procedury" : "Procedures", count: signals.applicableProcedures || 0, icon: "ph-list-numbers", href: scopedHref("/areas?area=04-operacje&view=procedures", departmentKey) },
    { label: polish ? "Ludzie i agenci" : "People and agents", count: signals.assignedPeopleAndAgents || 0, icon: "ph-users-three", href: scopedHref("/areas?area=06-kadry&view=directory", departmentKey) },
    { label: polish ? "Projekty" : "Projects", count: signals.activeProjects || 0, icon: "ph-briefcase", href: scopedHref("/areas?area=11-innowacje&view=projects", departmentKey) }
  ];

  return <section className="department-tools-preview" aria-labelledby={`department-tools-${departmentKey}`}>
    <header><div><p>{polish ? "Wspólna warstwa firmy" : "Shared company layer"}</p><h2 id={`department-tools-${departmentKey}`}>{polish ? "Powiązane narzędzia" : "Related company tools"}</h2><span>{departmentLabel(departmentKey, t)} · {polish ? "podgląd danych przypisanych lub dostępnych w całej firmie" : "records assigned here or available company-wide"}</span></div></header>
    <div className="department-tools-preview__primary">
      <section><header><div><i className="ph-bold ph-list-checks" aria-hidden="true"></i><div><strong>{polish ? "Zadania" : "Tasks"}</strong><span>{taskRows.length ? `${taskRows.length} ${polish ? "ostatnie" : "recent"}` : polish ? "Brak przypisanych zadań" : "No assigned tasks"}</span></div></div><CcButton href={scopedHref("/areas?area=04-operacje&view=tasks", departmentKey)} iconRight="ph-arrow-right" size="xs" variant="ghost">{polish ? "Wszystkie" : "View all"}</CcButton></header><div>{taskRows.map((task) => <a href={scopedHref("/areas?area=04-operacje&view=tasks", departmentKey)} key={task.id}><span><strong>{task.title}</strong><small>{humanizeBusinessValue(task.priority || "normal", undefined, locale)}</small></span><b>{humanizeBusinessValue(task.status, undefined, locale)}</b></a>)}</div></section>
      <section><header><div><i className="ph-bold ph-folders" aria-hidden="true"></i><div><strong>{polish ? "Pliki i foldery" : "Files and folders"}</strong><span>{assetRows.length ? `${assetRows.length} ${polish ? "ostatnie" : "recent"}` : polish ? "Brak przypisanych plików" : "No assigned files"}</span></div></div><CcButton href={scopedHref("/areas?area=08-zasoby&view=files", departmentKey)} iconRight="ph-arrow-right" size="xs" variant="ghost">{polish ? "Wszystkie" : "View all"}</CcButton></header><div>{assetRows.map((asset) => <a href={scopedHref("/areas?area=08-zasoby&view=files", departmentKey)} key={asset.id}><span><strong>{asset.name}</strong><small>{humanizeBusinessValue(asset.type || asset.sourceModel || "resource", undefined, locale)}</small></span><i className={`ph-bold ${asset.organization?.isFolder ? "ph-folder" : "ph-file"}`} aria-hidden="true"></i></a>)}</div></section>
    </div>
    <nav aria-label={polish ? "Pozostałe powiązane narzędzia" : "Other related company tools"}>{tools.map((tool) => <a href={tool.href} key={tool.label}><i className={`ph-bold ${tool.icon}`} aria-hidden="true"></i><span><strong>{tool.label}</strong><small>{polish ? "Otwórz przefiltrowany moduł" : "Open filtered module"}</small></span><b>{tool.count}</b><i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a>)}</nav>
  </section>;
}
