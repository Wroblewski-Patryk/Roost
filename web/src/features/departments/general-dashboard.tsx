import { useEffect, useMemo, useState } from "react";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";
import { DashboardCommandPacket, DashboardPriorityItem } from "../../types";

function formattedDate(value?: string | null) {
  if (!value) return "";
  return formatAppDate(value, { dateStyle: "medium", timeStyle: "short" });
}

function formattedBriefingDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  return formatAppDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function readableKey(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim();
}

function summaryLabel(label: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (label === "pendingAgentEvents") return t("general.pulse.agentEvents");
  if (label === "failedProviderEvents") return t("general.pulse.providerFailures");
  if (label === "pendingProviderEvents") return t("general.pulse.providerQueue");
  if (label === "pendingApprovals") return t("general.pulse.approvals");
  return readableKey(label);
}

function itemMeta(item: DashboardPriorityItem) {
  return [item.source, item.status, item.category].filter(Boolean).join(" · ");
}

function priorityTone(item: DashboardPriorityItem) {
  const value = `${item.severity || ""} ${item.status || ""}`.toLowerCase();
  if (value.includes("critical") || value.includes("blocked") || value.includes("error")) return "is-critical";
  if (value.includes("high") || value.includes("warning") || value.includes("review")) return "is-warning";
  return "is-neutral";
}

function blockedActionText(action: string | { action?: string; reason?: string }) {
  if (typeof action === "string") return { title: readableKey(action), detail: "" };
  return { title: readableKey(action.action || "Blocked action"), detail: action.reason || "" };
}

function pluralLabel(locale: "en" | "pl", count: number, one: string, few: string, many: string) {
  if (locale === "en") return count === 1 ? one : many;
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14) ? few : many;
}

export function GeneralDashboard() {
  const { locale, t } = useLanguage();
  const command = useOwnerPacket<DashboardCommandPacket>("/v1/dashboard/command", true, t);
  const rows = command.data?.latestRouteProposals || [];
  const priorityItems = command.data?.priorityItems || [];
  const nextActions = command.data?.nextActions || [];
  const departmentSignals = command.data?.departmentSignals || [];
  const blockedActions = command.data?.blockedActions || command.data?.agentPacket?.blockedActions || [];
  const summaryEntries = Object.entries(command.data?.summary || {}).filter((entry): entry is [string, number] => typeof entry[1] === "number").slice(0, 4);
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches);

  useEffect(() => {
    if (!selectedPriorityId && priorityItems[0]) setSelectedPriorityId(priorityItems[0].id);
  }, [priorityItems, selectedPriorityId]);

  useEffect(() => {
    const desktopInspector = window.matchMedia("(min-width: 1280px)");
    function adaptInspector(event: MediaQueryListEvent) {
      if (!event.matches) setInspectorOpen(false);
    }
    desktopInspector.addEventListener("change", adaptInspector);
    return () => desktopInspector.removeEventListener("change", adaptInspector);
  }, []);

  const selectedPriority = priorityItems.find((item) => item.id === selectedPriorityId) || priorityItems[0];
  const selectedSource = selectedPriority
    ? departmentSignals.find((signal) => signal.label.toLocaleLowerCase().includes(selectedPriority.source.toLocaleLowerCase()) || selectedPriority.source.toLocaleLowerCase().includes(signal.label.toLocaleLowerCase()))
    : undefined;
  const pulseMetrics = useMemo(() => {
    const icons = ["ph-check-square-offset", "ph-rocket-launch", "ph-list-checks", "ph-warning-octagon"];
    const base = summaryEntries.map(([label, value], index) => ({ label: summaryLabel(label, t), value, icon: icons[index] || "ph-chart-line-up" }));
    return [
      ...base,
      { label: t("general.operatingAreas"), value: departmentSignals.length, icon: "ph-buildings" },
      { label: t("general.routingQueue"), value: rows.length, icon: "ph-git-branch" }
    ].slice(0, 6);
  }, [departmentSignals.length, rows.length, summaryEntries, t]);
  const riskItems = priorityItems.filter((item) => priorityTone(item) !== "is-neutral").slice(0, 5);

  function choosePriority(item: DashboardPriorityItem) {
    setSelectedPriorityId(item.id);
    setInspectorOpen(true);
  }

  return (
    <>
      <div className={`roost-liquid-dashboard${inspectorOpen && selectedPriority ? " has-inspector" : ""}`}>
        <div className="roost-liquid-dashboard-main">
          <header className="roost-briefing-header">
            <div>
              <p className="roost-briefing-date">{formattedBriefingDate(command.data?.generatedAt)}</p>
              <h1>{t("general.briefingTitle")}</h1>
              <p>{t("general.briefingDescription")}</p>
              <span className="roost-live-update"><span aria-hidden="true"></span>{command.data?.generatedAt ? formattedDate(command.data.generatedAt) : t("general.updatedJustNow")}</span>
            </div>
            <a className="roost-briefing-settings" href="/workspace/settings"><i className="ph-bold ph-sliders-horizontal" aria-hidden="true"></i>{t("general.briefingSettings")}</a>
          </header>

          {command.status === "loading" ? (
            <div className="roost-dashboard-state"><CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /></div>
          ) : command.status === "error" ? (
            <div className="roost-dashboard-state"><CcNotice tone="error" title={command.error || t("general.packetError")} live /></div>
          ) : (
            <>
              <section className="roost-owner-decisions" aria-labelledby="owner-decisions-heading">
                <header>
                  <h2 id="owner-decisions-heading">{t("general.ownerDecisions")}</h2>
                  <span>{priorityItems.length} {pluralLabel(locale, priorityItems.length, t("general.signal.one"), t("general.signal.few"), t("general.signal.many"))}</span>
                </header>
                <div className="roost-decision-columns" aria-hidden="true"><span></span><span>{t("general.impact")}</span><span>{t("general.source")}</span><span>{t("general.due")}</span><span></span></div>
                {priorityItems.length ? (
                  <div className="roost-decision-list">
                    {priorityItems.slice(0, 5).map((item, index) => {
                      const selected = item.id === selectedPriority?.id;
                      return (
                        <button aria-pressed={selected} className={`roost-decision-row ${priorityTone(item)}${selected ? " is-selected" : ""}`} key={`${item.source}-${item.id}`} onClick={() => choosePriority(item)} type="button">
                          <span className="roost-decision-number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="roost-decision-copy"><strong>{item.title}</strong><small>{item.outcome || itemMeta(item)}</small></span>
                          <span className="roost-decision-impact">{item.severity || item.status || t("state.normal")}</span>
                          <span className="roost-decision-source">{item.source}</span>
                          <span className="roost-decision-due">{item.dueDate ? formattedDate(item.dueDate) : t("general.needsReview")}</span>
                          <span className="roost-decision-review">{t("general.review")}<i className="ph-bold ph-arrow-right" aria-hidden="true"></i></span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="roost-empty-inline"><i className="ph-bold ph-check-circle" aria-hidden="true"></i><div><strong>{t("general.noUrgentSignals")}</strong><span>{t("general.noUrgentSignalsDetail")}</span></div></div>
                )}
              </section>

              <section className="roost-company-pulse" aria-labelledby="company-pulse-heading">
                <header><h2 id="company-pulse-heading">{t("general.companyPulse")}</h2><span><i aria-hidden="true"></i>{t("general.live")}</span></header>
                <div>
                  {pulseMetrics.map((metric) => (
                    <article key={metric.label}><i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i><span>{metric.label}</span><strong>{metric.value}</strong></article>
                  ))}
                </div>
              </section>

              <div className="roost-operating-ledgers">
                <section aria-labelledby="routing-ledger-heading">
                  <header><h2 id="routing-ledger-heading">{t("general.latestProposals")}</h2><span>{rows.length} {pluralLabel(locale, rows.length, t("general.proposal.one"), t("general.proposal.few"), t("general.proposal.many"))}</span></header>
                  {rows.length ? (
                    <div className="roost-ledger-list">
                      {rows.slice(0, 5).map((row, index) => {
                        const destination = departmentSignals.find((signal) => signal.key === row.targetDepartmentKey);
                        const content = <><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.title || row.id}</strong><small>{row.targetDepartmentKey || t("state.unassigned")}</small><b>{row.status || t("state.review")}</b></>;
                        return destination ? <a href={destination.href} key={row.id}>{content}</a> : <article key={row.id}>{content}</article>;
                      })}
                    </div>
                  ) : <p className="roost-ledger-empty">{t("general.noProposals.detail")}</p>}
                </section>

                <section aria-labelledby="risk-ledger-heading">
                  <header><h2 id="risk-ledger-heading">{t("general.topRisks")}</h2><span>{riskItems.length} {pluralLabel(locale, riskItems.length, t("general.signal.one"), t("general.signal.few"), t("general.signal.many"))}</span></header>
                  {riskItems.length ? (
                    <div className="roost-ledger-list is-risk">
                      {riskItems.map((item, index) => (
                        <button key={item.id} onClick={() => choosePriority(item)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.source}</small><b>{item.severity || item.status}</b></button>
                      ))}
                    </div>
                  ) : <p className="roost-ledger-empty">{t("general.noBlockedActions")}</p>}
                </section>
              </div>

              {departmentSignals.length ? (
                <section className="roost-area-overview" aria-labelledby="area-overview-heading">
                  <header><h2 id="area-overview-heading">{t("general.departmentHealth")}</h2><span>{departmentSignals.length} {pluralLabel(locale, departmentSignals.length, t("general.area.one"), t("general.area.few"), t("general.area.many"))}</span></header>
                  <div>
                    {departmentSignals.map((signal) => (
                      <a href={signal.href} key={signal.key}>
                        <span className={`roost-health-dot is-${signal.health}`} aria-hidden="true"></span>
                        <strong>{signal.label}</strong>
                        <small>{signal.count} {pluralLabel(locale, signal.count, t("general.openSignal.one"), t("general.openSignal.few"), t("general.openSignal.many"))}</small>
                        <b className={`is-${signal.health}`}>{signal.health === "ready" ? t("state.ready") : signal.health}</b>
                        <i className="ph-bold ph-arrow-right" aria-hidden="true"></i>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>

        {inspectorOpen && selectedPriority ? (
          <aside className="roost-decision-inspector" aria-label={t("general.decisionContext")}>
            <header><span>{t("general.decisionContext")}</span><button aria-label={t("general.closeInspector")} onClick={() => setInspectorOpen(false)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button></header>
            <section className="roost-inspector-title">
              <div><h2>{selectedPriority.title}</h2><span className={`roost-inspector-tone ${priorityTone(selectedPriority)}`} aria-hidden="true"></span></div>
              <p>{itemMeta(selectedPriority)}</p>
              {selectedPriority.dueDate ? <time dateTime={selectedPriority.dueDate}>{t("general.due")}: {formattedDate(selectedPriority.dueDate)}</time> : null}
            </section>
            <section><h3>{t("general.whyItMatters")}</h3><p>{selectedPriority.outcome || t("general.noOutcomeContext")}</p></section>
            <section><h3>{t("general.governanceContext")}</h3><p>{t("general.readOnlyMode")} · {t("general.governedContext")}</p></section>
            <section>
              <h3>{t("general.nextActions")}</h3>
              <div className="roost-inspector-actions-list">
                {nextActions.slice(0, 3).map((action) => action.target ? <a href={action.target} key={action.key}><span><strong>{action.label}</strong><small>{action.priority || t("state.normal")}</small></span><i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i></a> : <span key={action.key}><strong>{action.label}</strong><small>{action.priority || t("state.normal")}</small></span>)}
                {!nextActions.length ? <p>{t("general.noImmediateActions")}</p> : null}
              </div>
            </section>
            {blockedActions.length ? (
              <section><h3>{t("state.blockedActions")}</h3><div className="roost-inspector-guardrails">{blockedActions.slice(0, 3).map((action, index) => { const content = blockedActionText(action); return <article key={`${content.title}-${index}`}><i className="ph-bold ph-warning" aria-hidden="true"></i><span><strong>{content.title}</strong>{content.detail ? <small>{content.detail}</small> : null}</span></article>; })}</div></section>
            ) : null}
            <footer>
              {selectedSource ? <a className="roost-inspector-primary" href={selectedSource.href}>{t("general.openSource")}<i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a> : null}
              <button className="roost-inspector-secondary" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} type="button"><i className="ph-bold ph-sparkle" aria-hidden="true"></i>{t("general.askRoost")}</button>
              <small><i className="ph-bold ph-lock" aria-hidden="true"></i>{t("general.governedContext")}</small>
            </footer>
          </aside>
        ) : selectedPriority ? (
          <button className="roost-inspector-reopen" onClick={() => setInspectorOpen(true)} type="button"><i className="ph-bold ph-sidebar-simple" aria-hidden="true"></i><span>{t("general.decisionContext")}</span></button>
        ) : null}
      </div>
    </>
  );
}
