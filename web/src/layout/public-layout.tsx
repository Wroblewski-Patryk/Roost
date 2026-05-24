import type { ReactNode } from "react";

import { CcButton } from "../components/cc-button";
import { useLanguage } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { LanguageSelector } from "../i18n/language-selector";

type PublicLayoutActive = "home" | "login" | "register";

const navItems = [
  { href: "#system", key: "nav.features" },
  { href: "#system", key: "nav.forCompanies" },
  { href: "#docs", key: "nav.docs" },
  { href: "#status", key: "nav.status" }
] as const;

const footerColumns = [
  { title: "footer.product.title", items: ["footer.product.0", "footer.product.1", "footer.product.2", "footer.product.3"] },
  { title: "footer.resources.title", items: ["footer.resources.0", "footer.resources.1", "footer.resources.2", "footer.resources.3"] },
  { title: "footer.legal.title", items: ["footer.legal.0", "footer.legal.1", "footer.legal.2", "footer.legal.3"] }
] as const;

function tx(t: (key: MessageKey) => string, key: string) {
  return t(key as MessageKey);
}

function LogoMark() {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/45 bg-base-100/70 shadow-[0_0_32px_rgb(99_102_241_/_0.2)]">
      <span className="absolute inset-[22%] rounded-full border border-accent/50"></span>
      <span className="absolute h-px w-[64%] rotate-[-25deg] bg-gradient-to-r from-primary to-accent"></span>
      <span className="absolute bottom-[26%] h-[29%] w-[58%] rounded-[80%_80%_80%_30%] border border-primary/80"></span>
      <span className="absolute right-[28%] top-[30%] h-1.5 w-1.5 rounded-full bg-accent"></span>
    </span>
  );
}

export function PublicLayout({ active, children }: { active: PublicLayoutActive; children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-base-100 text-base-content" data-theme="roost">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#071019]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[92rem] items-center justify-between px-4 lg:px-8">
          <a className="group flex items-center gap-4" href="/" aria-label="Roost home">
            <LogoMark />
            <span className="grid">
              <span className="text-2xl font-semibold uppercase leading-none tracking-[0.24em] text-white">Roost</span>
              <span className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-primary">{t("app.operatingSystem")}</span>
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
            <CcButton href="/auth/login" iconRight="ph-arrow-right" size="sm" variant="primary">
              {t("home.enterRoost")}
            </CcButton>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-[#070c12] px-4 py-12 lg:px-8" id="docs">
        <div className="mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <a className="flex items-center gap-4" href="/" aria-label="Roost home">
              <LogoMark />
              <span className="grid">
                <span className="text-2xl font-semibold uppercase leading-none tracking-[0.24em] text-white">Roost</span>
                <span className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-primary">{t("app.operatingSystem")}</span>
              </span>
            </a>
            <p className="mt-5 max-w-md text-sm leading-6 text-base-content/62">{t("footer.description")}</p>
            <div className="mt-6 max-w-56">
              <LanguageSelector />
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{tx(t, column.title)}</h2>
                <ul className="mt-4 grid gap-3 text-sm text-base-content/62">
                  {column.items.map((item) => (
                    <li key={item}>
                      <a className="transition hover:text-accent" href="/auth/login">
                        {tx(t, item)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-[92rem] flex-col gap-3 border-t border-white/10 pt-6 text-sm text-base-content/55 sm:flex-row sm:items-center sm:justify-between">
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
