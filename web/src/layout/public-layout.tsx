import type { ReactNode } from "react";

import { CcButton } from "../components/cc-button";
import { RoostLogoMark } from "../components/roost-logo-mark";
import { useLanguage } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { LanguageSelector } from "../i18n/language-selector";

type PublicLayoutActive = "home" | "login" | "register";

const navItems = [
  { href: "#system", key: "nav.features" },
  { href: "#workflow", key: "nav.forCompanies" }
] as const;

function tx(t: (key: MessageKey) => string, key: string) {
  return t(key as MessageKey);
}

export function PublicLayout({ active, children }: { active: PublicLayoutActive; children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-base-100 text-base-content" data-theme="roost">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#071019]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-[88rem] items-center justify-between px-4 lg:px-8">
          <a className="group flex min-w-0 items-center gap-3" href="/" aria-label="Roost home">
            <RoostLogoMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <span className="grid">
              <span className="text-lg font-semibold uppercase leading-none tracking-[0.24em] text-white sm:text-xl">Roost</span>
              <span className="mt-1 hidden text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-primary sm:block">{t("app.operatingSystem")}</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-xs font-semibold uppercase tracking-[0.12em] text-base-content/62 md:flex" aria-label="Public navigation">
            {navItems.map((item) => (
              <a className="transition hover:text-accent" href={item.href} key={item.key}>
                {tx(t, item.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a className={`hidden text-sm font-semibold transition sm:inline-flex ${active === "login" ? "text-accent" : "text-base-content/70 hover:text-white"}`} href="/auth/login">
              {t("nav.signIn")}
            </a>
            <CcButton className="!h-11 !min-h-11 whitespace-nowrap" href="/auth/login" iconRight="ph-arrow-right" size="sm" variant="primary">
              {t("home.enterRoost")}
            </CcButton>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-[#070c12] px-4 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[88rem] gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-lg">
            <a className="flex items-center gap-3" href="/" aria-label="Roost home">
              <RoostLogoMark className="h-10 w-10" />
              <span className="grid">
                <span className="text-xl font-semibold uppercase leading-none tracking-[0.24em] text-white">Roost</span>
                <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-primary">{t("app.operatingSystem")}</span>
              </span>
            </a>
            <p className="mt-5 max-w-md text-sm leading-6 text-base-content/62">{t("footer.description")}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[auto_14rem] sm:items-end">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-base-content/65" aria-label={t("footer.navigationLabel")}>
              <a className="transition hover:text-accent" href="#system">{t("nav.features")}</a>
              <a className="transition hover:text-accent" href="/auth/login">{t("nav.signIn")}</a>
            </nav>
            <LanguageSelector />
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-[88rem] flex-col gap-3 border-t border-white/10 pt-6 text-sm text-base-content/55 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copy")}</p>
          <p className="inline-flex items-center gap-2">
            <span>{t("footer.madeWith")}</span>
            <span className="roost-gradient-text text-base" aria-label={t("footer.heartLabel")}>♥</span>
            <span>{t("footer.by")}</span>
            <a className="font-semibold text-base-content transition hover:text-accent" href="https://luckysparrow.ch" rel="noreferrer" target="_blank">
              luckysparrow.ch
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
