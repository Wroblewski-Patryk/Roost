import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { humanizeBusinessValue } from "./shared";

type Health = { score: number; status: string; signals: Record<string, number | Record<string, number>> };
const signals = [
  ["activeGoals", "Goals", "goals", "ph-target"], ["activeProjects", "Projects", "projects", "ph-briefcase"], ["openTasks", "Open tasks", "tasks", "ph-list-checks"],
  ["blockedTasks", "Blocked", "tasks", "ph-hand-palm"], ["applicableProcedures", "Procedures", "procedures", "ph-list-numbers"], ["assignedPeopleAndAgents", "People / Agents", "directory", "ph-users-three"],
  ["resources", "Resources", "resources", "ph-cube"], ["incidentsAndIssues", "Incidents", "risks", "ph-siren"], ["decisionsRequiringReview", "Decisions", "decisions", "ph-signpost"],
  ["activeRisks", "Risks", "risks", "ph-warning-diamond"], ["trackedMetrics", "Metrics", "metrics", "ph-chart-line-up"]
] as const;

export function DepartmentHealthStrip({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage(); const packet = useOwnerPacket<Health>(`/v1/company-intelligence/health?departmentKey=${encodeURIComponent(departmentKey)}`, true, t); if (!packet.data) return null;
  return <section className="roost-work-panel mb-4 rounded-company p-4" aria-label="Department health"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-primary">Contextual company health</p><h2 className="mt-1 text-lg font-black">{packet.data.score}% · {humanizeBusinessValue(packet.data.status, undefined, locale)}</h2></div><a className="btn btn-ghost btn-sm" href={`/areas?area=${departmentKey}&view=company-graph`}><i className="ph-bold ph-graph" aria-hidden="true"></i>Company Graph</a></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{signals.map(([key, label, view, icon]) => <a className="rounded-company border border-base-300 bg-base-100/25 p-3 transition-colors hover:border-primary hover:bg-primary/5" href={`/areas?area=${departmentKey}&view=${view}`} key={key}><span className="flex items-center gap-2 text-xs font-bold text-company-muted"><i className={`ph-bold ${icon}`} aria-hidden="true"></i>{label}</span><strong className="mt-1 block text-xl text-company-ink">{Number(packet.data?.signals[key] || 0)}</strong></a>)}</div></section>;
}
