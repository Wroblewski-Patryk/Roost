import { useState } from "react";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";

type Health = { interpretation: "tracked_signals_only"; signals: Record<string, number | Record<string, number>> };
type IssuePage = { signal: string; page: number; hasMore: boolean; items: Array<{ id: string; title: string; state: string; entityType: "task" | "decision" | "risk" | "company_record" | "evidence" }> };
type SignalKey = "blockedTasks" | "overdueTasks" | "decisionsRequiringReview" | "activeRisks" | "technicalIncidents" | "operationalIssues" | "staleOrRejectedEvidence" | "brokenRecords" | "missingRecords" | "openTasks";

const signalDefinitions: Array<{ key: SignalKey; label: string; icon: string; tone: "danger" | "warning" | "neutral" }> = [
  { key: "blockedTasks", label: "health.blocked", icon: "ph-hand-palm", tone: "danger" },
  { key: "overdueTasks", label: "health.overdue", icon: "ph-clock-countdown", tone: "danger" },
  { key: "decisionsRequiringReview", label: "health.decisions", icon: "ph-signpost", tone: "warning" },
  { key: "activeRisks", label: "health.risks", icon: "ph-warning-diamond", tone: "warning" },
  { key: "technicalIncidents", label: "health.incidents", icon: "ph-siren", tone: "warning" },
  { key: "operationalIssues", label: "health.issues", icon: "ph-warning-circle", tone: "warning" },
  { key: "staleOrRejectedEvidence", label: "health.evidence", icon: "ph-seal-warning", tone: "warning" },
  { key: "brokenRecords", label: "health.broken", icon: "ph-bug", tone: "warning" },
  { key: "missingRecords", label: "health.missing", icon: "ph-question", tone: "warning" },
  { key: "openTasks", label: "health.openTasks", icon: "ph-list-checks", tone: "neutral" }
];

function signalCount(health: Health, key: SignalKey) {
  const value = key === "brokenRecords" || key === "missingRecords"
    ? (health.signals.functionalStates as Record<string, number> | undefined)?.[key === "brokenRecords" ? "broken" : "missing"]
    : health.signals[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function recordHref(item: IssuePage["items"][number], departmentKey: CoreAreaKey, signal: SignalKey) {
  const id = encodeURIComponent(item.id);
  const department = encodeURIComponent(departmentKey);
  if (item.entityType === "task") return `/areas?area=04-operacje&view=tasks&department=${department}&taskId=${id}`;
  if (item.entityType === "decision") return `/areas?area=01-strategia&view=decisions&department=${department}&decisionId=${id}`;
  if (item.entityType === "risk") return `/areas?area=12-zarzadzanie&view=risks&department=${department}&riskId=${id}`;
  if (signal === "technicalIncidents") return `/areas?area=09-technologia&view=incidents&department=${department}&recordId=${id}`;
  if (signal === "operationalIssues") return `/areas?area=04-operacje&view=issues&department=${department}&recordId=${id}`;
  return `/areas?area=00-ogolny&view=entity&type=${item.entityType}&id=${id}`;
}

function IssueList({ departmentKey, signal }: { departmentKey: CoreAreaKey; signal: SignalKey }) {
  const { locale, t } = useLanguage();
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const packet = useOwnerPacket<IssuePage>(`/v1/company-intelligence/health/signal-records?departmentKey=${encodeURIComponent(departmentKey)}&signal=${signal}&page=${page}`, true, t, refreshKey);
  const label = signalDefinitions.find((definition) => definition.key === signal)?.label || "health.label";
  const quality = signal === "staleOrRejectedEvidence" || signal === "brokenRecords" || signal === "missingRecords";
  const stateLabel = (state: string) => ({ broken: t("health.stateBroken"), missing: t("health.stateMissing"), stale: t("health.stateStale"), rejected: t("health.stateRejected") })[state] || t("health.stateUnknown");
  return <div className="roost-department-health-issues" aria-live="polite">
    <h3>{t(label)}</h3>
    {packet.status === "loading" ? <p>{t("health.loading")}</p> : null}
    {packet.status === "error" ? <p role="alert">{t("health.error")} <button className="roost-department-health-retry" onClick={() => setRefreshKey(refreshKey + 1)} type="button">{t("health.retry")}</button></p> : null}
    {packet.status === "ready" && !packet.data?.items.length ? <p>{t("health.noIssueRows")}</p> : null}
    {packet.status === "ready" && packet.data?.items.length ? <>
      <ul>{packet.data.items.map((item) => <li key={item.id}><a href={recordHref(item, departmentKey, signal)}><span>{item.title}</span>{quality ? <small>{stateLabel(item.state)}</small> : null}</a></li>)}</ul>
      <div className="roost-department-health-pages">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} type="button">{t("health.previous")}</button>
        <span>{locale === "pl" ? `Strona ${page}` : `Page ${page}`}</span>
        <button disabled={!packet.data.hasMore} onClick={() => setPage(page + 1)} type="button">{t("health.next")}</button>
      </div>
    </> : null}
  </div>;
}

export function DepartmentHealthStrip({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState<SignalKey | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const packet = useOwnerPacket<Health>(`/v1/company-intelligence/health?departmentKey=${encodeURIComponent(departmentKey)}`, true, t, refreshKey);
  const valid = packet.status === "ready" && packet.data?.interpretation === "tracked_signals_only";
  const present = valid ? signalDefinitions.map((definition) => ({ ...definition, value: signalCount(packet.data!, definition.key) })).filter((signal) => signal.value > 0) : [];
  const exceptionCount = present.filter((signal) => signal.key !== "openTasks").length;
  return <section className="roost-department-health" aria-busy={packet.status === "loading"} aria-label={t("health.label")}>
    <div className="roost-department-health-status">
      <i className="ph-bold ph-info" aria-hidden="true"></i>
      <span><small>{t("health.label")}</small><strong>{valid ? exceptionCount ? t("health.someSignals") : t("health.noSignals") : packet.status === "loading" ? t("health.loading") : t("health.error")}</strong></span>
    </div>
    {valid && present.length ? <nav aria-label={t("health.attention")} className="roost-department-health-signals">{present.map((signal) => {
      const inner = <><i className={`ph-bold ${signal.icon}`} aria-hidden="true"></i><span>{t(signal.label)}</span><strong>{signal.value}</strong></>;
      return <button aria-expanded={opened === signal.key} className={`is-${signal.tone}`} key={signal.key} onClick={() => setOpened(opened === signal.key ? null : signal.key)} type="button">{inner}</button>;
    })}</nav> : null}
    {valid && !present.length ? <p>{t("health.noAttention")}</p> : null}
    {!valid && packet.status !== "loading" ? <button className="roost-department-health-retry" onClick={() => setRefreshKey(refreshKey + 1)} type="button">{t("health.retry")}</button> : null}
    <details className="roost-department-health-coverage"><summary>{t("health.coverageTitle")}</summary><p>{t("health.coverageDetail")}</p></details>
    {opened ? <IssueList departmentKey={departmentKey} key={`${departmentKey}:${opened}`} signal={opened} /> : null}
  </section>;
}
