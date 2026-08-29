import { useLanguage } from "../i18n/i18n";

export function CcRouteLoading() {
  const { t } = useLanguage();

  return (
    <section aria-live="polite" className="cc-route-loading roost-work-surface grid min-h-56 place-items-center rounded-company p-6">
      <div className="flex items-center gap-3 text-company-muted">
        <span className="loading loading-spinner loading-md text-primary" aria-hidden="true"></span>
        <span><strong className="block text-company-ink">{t("app.name")}</strong><span className="text-sm">{t("route.loading")}</span></span>
      </div>
    </section>
  );
}
