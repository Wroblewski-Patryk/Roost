import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

export function humanizeBusinessValue(value?: string | null, fallback = "Unknown") {
  if (!value?.trim()) return fallback;
  const normalized = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function BlockedActions({ actions }: { actions?: Array<string | { action?: string; reason?: string }> }) {
  const { t } = useLanguage();
  if (!actions?.length) {
    return null;
  }

  return (
    <section className="roost-shared-blockers">
      <header>
        <i className="ph-bold ph-warning" aria-hidden="true"></i>
        <h2>{t("state.blockedActions")}</h2>
      </header>
      <div>
        {actions.map((action) => (
          <article key={typeof action === "string" ? action : action.action}>
            <span className="roost-command-marker" aria-hidden="true"></span>
            <div>
              <strong>{humanizeBusinessValue(typeof action === "string" ? action : action.action, "Blocked action")}</strong>
              {typeof action === "string" ? null : <small>{action.reason}</small>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function useTranslatedTableLabels() {
  const { t } = useLanguage();
  return {
    loadingTitle: t("table.loading.title"),
    loadingDetail: t("table.loading.detail"),
    errorTitle: t("table.error.title"),
    actions: t("table.actions"),
    previous: t("table.previous"),
    next: t("table.next"),
    pagination: ({ start, end, total }: { start: number; end: number; total: number }) => (
      t("table.pagination", { start, end, total })
    )
  };
}

export function PacketErrorNotice({ detail }: { detail: string }) {
  return <CcNotice tone="error" title={detail} live />;
}
