import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
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

function itemMeta(item: DashboardPriorityItem, locale: "en" | "pl", t: ReturnType<typeof useLanguage>["t"]) {
  return [item.kind ? t(`general.attention.${item.kind}`) : item.source, attentionStatus(item.status, locale)].filter(Boolean).join(" · ");
}

function attentionStatus(status: string | undefined, locale: "en" | "pl") {
  return ({ pending: locale === "pl" ? "oczekuje" : "pending", review: locale === "pl" ? "do odbioru" : "review needed", failed: locale === "pl" ? "nieudany" : "failed", blocked: locale === "pl" ? "zablokowane" : "blocked", active: locale === "pl" ? "aktywny" : "active", todo: locale === "pl" ? "do zrobienia" : "to do", in_progress: locale === "pl" ? "w toku" : "in progress" } as Record<string, string>)[status || ""] || status;
}

function priorityTone(item: DashboardPriorityItem) {
  const value = `${item.severity || ""} ${item.status || ""}`.toLowerCase();
  if (value.includes("critical") || value.includes("blocked") || value.includes("error") || value.includes("failed")) return "is-critical";
  if (value.includes("high") || value.includes("warning") || value.includes("review")) return "is-warning";
  return "is-neutral";
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
  const [refreshKey, setRefreshKey] = useState(0);
  const command = useOwnerPacket<DashboardCommandPacket>("/v1/dashboard/command", true, t, refreshKey);
  const rows = command.data?.latestRouteProposals || [];
  const [moreItems, setMoreItems] = useState<DashboardPriorityItem[]>([]);
  const [moreHasMore, setMoreHasMore] = useState<boolean | null>(null);
  const [moreOffset, setMoreOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const priorityItems = [...(command.data?.priorityItems || []), ...moreItems];
  const hasMoreAttention = moreHasMore ?? Boolean(command.data?.attentionHasMore);
  const departmentSignals = command.data?.departmentSignals || [];
  const summaryEntries = Object.entries(command.data?.summary || {}).filter((entry): entry is [string, number] => typeof entry[1] === "number").slice(0, 4);
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [narrowInspector, setNarrowInspector] = useState(() => window.matchMedia("(max-width: 1279px)").matches);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setMoreItems([]); setMoreHasMore(null); setMoreOffset(command.data?.attentionNextOffset || 0); setMoreError(false); }, [command.data]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1279px)");
    const adaptInspector = (event: MediaQueryListEvent) => setNarrowInspector(event.matches);
    query.addEventListener("change", adaptInspector);
    return () => query.removeEventListener("change", adaptInspector);
  }, []);
  useEffect(() => {
    if (!inspectorOpen || !narrowInspector) return;
    const focusId = window.requestAnimationFrame(() => inspectorRef.current?.querySelector<HTMLElement>("button")?.focus());
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setInspectorOpen(false); triggerRef.current?.focus(); return; }
      if (event.key !== "Tab" || !inspectorRef.current) return;
      const controls = Array.from(inspectorRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => { window.cancelAnimationFrame(focusId); window.removeEventListener("keydown", handleKey); };
  }, [inspectorOpen, narrowInspector]);

  const selectedPriority = priorityItems.find((item) => item.id === selectedPriorityId);
  const pulseMetrics = useMemo(() => {
    const icons = ["ph-check-square-offset", "ph-rocket-launch", "ph-list-checks", "ph-warning-octagon"];
    const base = summaryEntries.map(([label, value], index) => ({ label: summaryLabel(label, t), value, icon: icons[index] || "ph-chart-line-up" }));
    return [
      ...base,
      { label: t("general.routingQueue"), value: rows.length, icon: "ph-git-branch" }
    ].filter((metric) => metric.value > 0).slice(0, 6);
  }, [rows.length, summaryEntries, t]);
  function choosePriority(item: DashboardPriorityItem, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelectedPriorityId(item.id);
    setInspectorOpen(true);
  }
  function closeInspector() { setInspectorOpen(false); triggerRef.current?.focus(); }
  async function loadMoreAttention() {
    if (loadingMore || !hasMoreAttention) return;
    setLoadingMore(true); setMoreError(false);
    try {
      const response = await api<{ data: { items: DashboardPriorityItem[]; hasMore: boolean; nextOffset: number } }>(`/v1/dashboard/attention?offset=${moreOffset}`);
      if (!Array.isArray(response.data?.items) || typeof response.data.hasMore !== "boolean" || !Number.isInteger(response.data.nextOffset)) throw new Error("attention_page_invalid");
      setMoreItems(current => {
        const seen = new Set([...(command.data?.priorityItems || []), ...current].map(item => `${item.kind}:${item.id}`));
        return [...current, ...response.data.items.filter(item => !seen.has(`${item.kind}:${item.id}`))];
      });
      setMoreHasMore(response.data.hasMore); setMoreOffset(response.data.nextOffset);
    } catch { setMoreError(true); }
    finally { setLoadingMore(false); }
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
              {command.status === "ready" && command.data?.generatedAt ? <span className="roost-live-update"><span aria-hidden="true"></span>{formattedDate(command.data.generatedAt)}</span> : null}
            </div>
            <a className="roost-briefing-settings" href="/workspace/settings"><i className="ph-bold ph-sliders-horizontal" aria-hidden="true"></i>{t("general.briefingSettings")}</a>
          </header>

          {command.status === "loading" ? (
            <div className="roost-dashboard-state"><CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /></div>
          ) : command.status === "error" ? (
            <div className="roost-dashboard-state"><CcNotice tone="error" title={command.error || t("general.packetError")} live action={<button className="roost-attention-toggle" type="button" onClick={() => setRefreshKey(value => value + 1)}>{t("general.attention.retry")}</button>} /></div>
          ) : (
            <>
              <section className="roost-owner-decisions" aria-labelledby="owner-decisions-heading">
                <header>
                  <h2 id="owner-decisions-heading">{t("general.ownerDecisions")}</h2>
                  <span>{priorityItems.length}{hasMoreAttention ? "+" : ""} {pluralLabel(locale, priorityItems.length, t("general.signal.one"), t("general.signal.few"), t("general.signal.many"))}</span>
                </header>
                <div className="roost-decision-columns" aria-hidden="true"><span></span><span>{t("general.status")}</span><span>{t("general.source")}</span><span>{t("general.due")}</span><span></span></div>
                {priorityItems.length ? (
                  <div className="roost-decision-list">
                    {(showAllAttention ? priorityItems : priorityItems.slice(0, 5)).map((item, index) => {
                      const selected = item.id === selectedPriority?.id;
                      return (
                        <button aria-pressed={selected} className={`roost-decision-row ${priorityTone(item)}${selected ? " is-selected" : ""}`} key={`${item.kind || item.source}-${item.id}`} onClick={(event) => choosePriority(item, event.currentTarget)} type="button">
                          <span className="roost-decision-number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="roost-decision-copy"><strong>{item.title}</strong><small>{item.outcome || itemMeta(item, locale, t)}</small></span>
                          <span className="roost-decision-impact">{attentionStatus(item.status, locale) || t("state.normal")}</span>
                          <span className="roost-decision-source">{item.kind ? t(`general.attention.${item.kind}`) : item.source}</span>
                          <span className="roost-decision-due">{item.dueDate ? formattedDate(item.dueDate) : "—"}</span>
                          <span className="roost-decision-review">{t("general.review")}<i className="ph-bold ph-arrow-right" aria-hidden="true"></i></span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="roost-empty-inline"><i className="ph-bold ph-check-circle" aria-hidden="true"></i><div><strong>{t("general.noUrgentSignals")}</strong><span>{t("general.noUrgentSignalsDetail")}</span></div></div>
                )}
                {priorityItems.length > 5 ? <button className="roost-attention-toggle" type="button" aria-expanded={showAllAttention} onClick={() => setShowAllAttention(value => !value)}>{showAllAttention ? t("general.attention.showLess") : t("general.attention.showAll")}</button> : null}
                {showAllAttention && hasMoreAttention ? <button className="roost-attention-toggle" type="button" disabled={loadingMore} onClick={() => void loadMoreAttention()}>{loadingMore ? t("table.loading.title") : t("general.attention.loadMore")}</button> : null}
                {moreError ? <CcNotice live tone="error" title={t("general.attention.moreError")} action={<button className="roost-attention-toggle" type="button" onClick={() => void loadMoreAttention()}>{t("general.attention.retry")}</button>} /> : null}
              </section>

              {pulseMetrics.length ? <section className="roost-company-pulse" aria-labelledby="company-pulse-heading">
                <header><h2 id="company-pulse-heading">{t("general.companyPulse")}</h2><span><i aria-hidden="true"></i>{t("general.live")}</span></header>
                <div>
                  {pulseMetrics.map((metric) => (
                    <article key={metric.label}><i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i><span>{metric.label}</span><strong>{metric.value}</strong></article>
                  ))}
                </div>
              </section> : null}

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

        {inspectorOpen && selectedPriority && narrowInspector ? <div className="roost-inspector-backdrop" aria-hidden="true" onClick={closeInspector} /> : null}
        {inspectorOpen && selectedPriority ? (
          <aside ref={inspectorRef} className="roost-decision-inspector" aria-label={t("general.decisionContext")} role={narrowInspector ? "dialog" : undefined} aria-modal={narrowInspector ? "true" : undefined}>
            <header><span>{t("general.decisionContext")}</span><button aria-label={t("general.closeInspector")} onClick={closeInspector} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button></header>
            <section className="roost-inspector-title">
              <div><h2>{selectedPriority.title}</h2><span className={`roost-inspector-tone ${priorityTone(selectedPriority)}`} aria-hidden="true"></span></div>
              <p>{itemMeta(selectedPriority, locale, t)}</p>
              {selectedPriority.dueDate ? <time dateTime={selectedPriority.dueDate}>{t("general.due")}: {formattedDate(selectedPriority.dueDate)}</time> : null}
            </section>
            <section><h3>{t("general.whyItMatters")}</h3><p>{selectedPriority.outcome || t("general.noOutcomeContext")}</p></section>
            <section><h3>{t("general.governanceContext")}</h3><p>{t("general.readOnlyMode")} · {t("general.governedContext")}</p></section>
            <footer>
              {selectedPriority.target ? <a className="roost-inspector-primary" href={selectedPriority.target}>{selectedPriority.kind === "risk" ? t("general.openRegister") : t("general.openSource")}<i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a> : null}
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
