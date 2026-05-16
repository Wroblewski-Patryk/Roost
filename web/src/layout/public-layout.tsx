import React from "react";
import { CcButton } from "../components/cc-button";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";

export function PublicLayout({
  active,
  children
}: {
  active: "home" | "login" | "register";
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-base-100 text-base-content" data-theme="companycore">
      <header className="border-b border-base-300 bg-base-100 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <a className="flex items-center gap-3 font-black no-underline text-company-ink" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-company bg-neutral text-neutral-content">CC</span>
            <span>{t("app.name")}</span>
          </a>
          <nav className="flex flex-wrap items-end gap-2">
            <CcButton href="/" size="sm" variant={active === "home" ? "primary" : "ghost"}>{t("nav.home")}</CcButton>
            <CcButton href="/auth/login" size="sm" variant={active === "login" ? "primary" : "ghost"}>{t("nav.signIn")}</CcButton>
            <CcButton href="/auth/register" size="sm" variant={active === "register" ? "primary" : "outline"}>{t("nav.createAccount")}</CcButton>
            <LanguageSelector compact />
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
