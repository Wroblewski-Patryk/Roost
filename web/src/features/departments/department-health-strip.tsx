import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { humanizeBusinessValue } from "./shared";

type Health = { score: number; status: string; signals: Record<string, number | Record<string, number>> };
const attentionSignals = [
  ["blockedTasks", "health.blocked", "tasks", "ph-hand-palm", "danger"],
  ["incidentsAndIssues", "health.incidents", "risks", "ph-siren", "danger"],
  ["decisionsRequiringReview", "health.decisions", "decisions", "ph-signpost", "warning"],
  ["activeRisks", "health.risks", "risks", "ph-warning-diamond", "warning"],
  ["openTasks", "health.openTasks", "tasks", "ph-list-checks", "neutral"]
] as const;

export function DepartmentHealthStrip({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage();
  const packet = useOwnerPacket<Health>(`/v1/company-intelligence/health?departmentKey=${encodeURIComponent(departmentKey)}`, true, t);
  if (!packet.data) return null;
  const attention = attentionSignals.map(([key, label, view, icon, tone]) => ({ key, label, view, icon, tone, value: Number(packet.data?.signals[key] || 0) })).filter((signal) => signal.value > 0).slice(0, 4);
  const clear = !attention.some((signal) => signal.tone === "danger" || signal.tone === "warning");
  return <section className="roost-department-health" aria-label={t("health.label")}>
    <div className={`roost-department-health-status${clear ? " is-clear" : " is-attention"}`}>
      <i className={`ph-bold ${clear ? "ph-check-circle" : "ph-warning-circle"}`} aria-hidden="true"></i>
      <span><small>{t("health.label")}</small><strong>{clear ? t("health.clear") : humanizeBusinessValue(packet.data.status, undefined, locale)}</strong></span>
      <b>{packet.data.score}%</b>
    </div>
    {attention.length ? <nav aria-label={t("health.attention")} className="roost-department-health-signals">{attention.map((signal) => <a className={`is-${signal.tone}`} href={`/areas?area=${departmentKey}&view=${signal.view}`} key={signal.key}><i className={`ph-bold ${signal.icon}`} aria-hidden="true"></i><span>{t(signal.label)}</span><strong>{signal.value}</strong></a>)}</nav> : <p>{t("health.noAttention")}</p>}
    <a className="roost-department-health-graph" href={`/areas?area=${departmentKey}&view=company-graph`}><i className="ph-bold ph-graph" aria-hidden="true"></i><span>{t("health.companyGraph")}</span></a>
  </section>;
}
