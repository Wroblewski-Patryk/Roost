import { CcButton } from "../../components/cc-button";
import { useLanguage } from "../../i18n/i18n";
import { PublicLayout } from "../../layout/public-layout";
import { coreAreas } from "../departments/core-area-data";

export function PublicHomeRoute() {
  const { t } = useLanguage();

  return (
    <PublicLayout active="home">
      <section className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl content-center gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)] lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase text-primary">{t("home.kicker")}</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal text-company-ink sm:text-6xl">{t("home.title")}</h1>
          <p className="mt-5 text-lg leading-8 text-company-muted">{t("home.description")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CcButton href="/auth/login" iconRight="ph-arrow-right" variant="primary">{t("home.openWorkspace")}</CcButton>
            <CcButton href="/auth/register" variant="outline">{t("home.createWorkspace")}</CcButton>
          </div>
        </div>
        <div className="grid gap-3 rounded-company border border-base-300 bg-base-200 p-4">
          {coreAreas.map((area) => (
            <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-company border border-base-300 bg-base-100 p-4" key={area.key}>
              <i className={`ph-bold ${area.icon} text-2xl text-primary`} aria-hidden="true"></i>
              <div>
                <p className="text-xs font-black uppercase text-company-muted">{t(area.eyebrowKey)}</p>
                <h2 className="text-lg font-black">{t(area.labelKey)}</h2>
                <p className="text-sm leading-6 text-company-muted">{t(area.descriptionKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
