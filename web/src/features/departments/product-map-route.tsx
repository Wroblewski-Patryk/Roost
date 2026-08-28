import { CcButton } from "../../components/cc-button";
import { Shell } from "../../layout/shell";
import { useLanguage } from "../../i18n/i18n";
import { coreAreas } from "./core-area-data";

const managementCycle = [
  ["ph-eye", "productMap.cycle.observe"],
  ["ph-gavel", "productMap.cycle.decide"],
  ["ph-list-checks", "productMap.cycle.plan"],
  ["ph-play-circle", "productMap.cycle.execute"],
  ["ph-chart-line-up", "productMap.cycle.measure"],
  ["ph-brain", "productMap.cycle.learn"],
  ["ph-arrows-out", "productMap.cycle.scale"]
] as const;

function AreaCard({ area, central = false }: { area: (typeof coreAreas)[number]; central?: boolean }) {
  const { t } = useLanguage();
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`cc-icon-frame ${central ? "bg-primary text-primary-content" : "bg-primary/10 text-primary"}`}>
          <i aria-hidden="true" className={`ph-bold ${area.icon}`}></i>
        </span>
        <span className="text-xs font-black uppercase tracking-[0.12em] text-company-muted">{area.key.slice(0, 2)}</span>
      </div>
      <h2 className={`${central ? "mt-5 text-2xl" : "mt-4 text-lg"} font-black text-company-ink`}>{t(area.labelKey)}</h2>
      <p className="mt-2 text-sm leading-6 text-company-muted">{t(area.descriptionKey)}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary">
        {t("productMap.openArea")}
        <i aria-hidden="true" className="ph-bold ph-arrow-right"></i>
      </span>
    </>
  );

  if (!area.href) {
    return <article className="rounded-company border border-dashed border-base-300 bg-base-100/70 p-4">{content}</article>;
  }

  return (
    <a
      className={`group rounded-company border bg-base-100 no-underline transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${central ? "border-primary/50 p-6 shadow-company-soft hover:bg-primary/5" : "border-base-300 p-4 hover:border-primary hover:bg-primary/5"}`}
      href={area.href}
    >
      {content}
    </a>
  );
}

export function ProductMapRoute() {
  const { t } = useLanguage();
  const general = coreAreas[0];
  const departments = coreAreas.slice(1);

  return (
    <Shell activeArea="00-ogolny">
      <section className="overflow-hidden rounded-company border border-base-300 bg-base-100 shadow-sm">
        <div className="grid gap-5 border-b border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-accent/10 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="cc-label text-primary">{t("productMap.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">{t("productMap.title")}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("productMap.description")}</p>
          </div>
          <CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-arrow-left" variant="outline">
            {t("productMap.back")}
          </CcButton>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,2fr)] xl:items-stretch">
          <AreaCard area={general} central />
          <div aria-label={t("productMap.departmentsLabel")} className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div aria-hidden="true" className="pointer-events-none absolute inset-6 hidden rounded-company border border-dashed border-primary/20 lg:block"></div>
            {departments.map((area) => <AreaCard area={area} key={area.key} />)}
          </div>
        </div>
      </section>

      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="cc-label text-primary">{t("productMap.flowEyebrow")}</p>
            <h2 className="mt-1 text-xl font-black text-company-ink">{t("productMap.flowTitle")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">{t("productMap.flowDescription")}</p>
          </div>
          <span className="badge badge-outline">{t("productMap.realStateOnly")}</span>
        </div>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {managementCycle.map(([icon, labelKey], index) => (
            <li className="relative rounded-company border border-base-300 bg-base-200/45 p-3" key={labelKey}>
              <div className="flex items-center justify-between gap-2">
                <i aria-hidden="true" className={`ph-bold ${icon} text-lg text-primary`}></i>
                <span className="text-xs font-black text-company-muted">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <strong className="mt-3 block text-sm text-company-ink">{t(labelKey)}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-lg font-black text-company-ink">{t("productMap.howToUseTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-company-muted">{t("productMap.howToUseDescription")}</p>
        </article>
        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-lg font-black text-company-ink">{t("productMap.boundaryTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-company-muted">{t("productMap.boundaryDescription")}</p>
        </article>
      </section>
    </Shell>
  );
}
