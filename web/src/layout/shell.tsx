import React from "react";
import { canonicalGeneralDashboardPath } from "../app-route-registry";
import { clearOwnerToken } from "../api/auth-token";
import { CcButton } from "../components/cc-button";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";
import { CoreAreaKey } from "../types";
import { coreAreas } from "../features/departments/core-area-data";

export function Shell({
  children,
  activeArea
}: {
  children: React.ReactNode;
  activeArea?: CoreAreaKey;
}) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-base-200 text-base-content" data-theme="companycore">
      <div className="grid min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-base-300 bg-neutral p-5 text-neutral-content lg:block">
          <a className="flex items-center gap-3 no-underline text-neutral-content" href={canonicalGeneralDashboardPath}>
            <span className="grid h-10 w-10 place-items-center rounded-company bg-primary font-black">CC</span>
            <span>
              <strong className="block">{t("app.name")}</strong>
              <small className="text-neutral-content/65">{t("app.operatingSystem")}</small>
            </span>
          </a>
          <nav className="mt-8 grid gap-2">
            {coreAreas.map((area) => (
              <a
                className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-company px-3 py-3 text-sm no-underline ${activeArea === area.key ? "bg-primary text-primary-content" : "text-neutral-content/75 hover:bg-white/10 hover:text-neutral-content"}`}
                href={area.href}
                key={area.key}
              >
                <i className={`ph-bold ${area.icon} mt-1`} aria-hidden="true"></i>
                <span>
                  <strong className="block">{t(area.labelKey)}</strong>
                  <small>{t(area.eyebrowKey)}</small>
                </span>
              </a>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <a className="flex items-center gap-2 font-black no-underline text-company-ink lg:hidden" href={canonicalGeneralDashboardPath}>
                <span className="grid h-9 w-9 place-items-center rounded-company bg-neutral text-neutral-content">CC</span>
                <span>{t("app.name")}</span>
              </a>
              <nav className="flex flex-wrap gap-2">
                {coreAreas.map((area) => (
                  <CcButton
                    href={area.href}
                    key={area.key}
                    size="sm"
                    variant={activeArea === area.key ? "primary" : "ghost"}
                  >
                    {t(area.labelKey)}
                  </CcButton>
                ))}
              </nav>
              <div className="flex flex-wrap items-end gap-2">
                <LanguageSelector compact />
                <CcButton
                  onClick={() => {
                    clearOwnerToken();
                    window.location.assign("/");
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t("nav.signOut")}
                </CcButton>
              </div>
            </div>
          </header>
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:px-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
