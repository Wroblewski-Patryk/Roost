import React, { useState } from "react";
import { canonicalGeneralDashboardPath } from "../app-route-registry";
import { api } from "../api/client";
import { clearOwnerToken, setOwnerToken } from "../api/auth-token";
import { CcButton } from "../components/cc-button";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";
import { AuthMe, CoreAreaKey } from "../types";
import { coreAreas } from "../features/departments/core-area-data";
import { useOwnerPacket } from "../hooks/use-owner-packet";

function displayDepartmentLabel(label: string) {
  return label.replace(/^\d{2}\s+/, "");
}

function currentAreaView() {
  if (typeof window === "undefined") {
    return "overview";
  }
  return new URLSearchParams(window.location.search).get("view") || "overview";
}

function DepartmentSidebar({
  activeArea
}: {
  activeArea?: CoreAreaKey;
}) {
  const { t } = useLanguage();
  const activeView = currentAreaView();
  const [openAreas, setOpenAreas] = useState<Partial<Record<CoreAreaKey, boolean>>>({
    "00-ogolny": activeArea === "00-ogolny",
    "04-operacje": activeArea === "04-operacje",
    "08-zasoby": activeArea === "08-zasoby"
  });

  return (
    <nav className="mt-5 grid gap-1" aria-label={t("sidebar.departments")}>
      <p className="px-3 text-xs font-black uppercase tracking-wide text-neutral-content/55">{t("sidebar.departments")}</p>
      {coreAreas.map((area) => {
        const isActive = activeArea === area.key;
        const isEnabled = area.enabled !== false && Boolean(area.href);
        const enabledViews = area.views?.filter((view) => view.enabled !== false && view.href) || [];
        const hasExpandableViews = isEnabled && Boolean(area.views && area.views.length > 1);
        const isOpen = Boolean(openAreas[area.key]);
        const label = displayDepartmentLabel(t(area.labelKey));

        return (
          <div className="grid gap-1" key={area.key}>
            <div className={[
              "grid grid-cols-[minmax(0,1fr)_2.25rem] items-stretch rounded-company",
              isActive ? "bg-primary text-primary-content" : "",
              !isActive && isEnabled ? "text-neutral-content/80 hover:bg-white/10 hover:text-neutral-content" : "",
              !isEnabled ? "text-neutral-content/35" : ""
            ].filter(Boolean).join(" ")}>
              {isEnabled ? (
                <a
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-l-company px-3 py-2.5 text-sm no-underline"
                  href={area.href}
                  title={t("sidebar.openMain")}
                >
                  <i className={`ph-bold ${area.icon} mt-1`} aria-hidden="true"></i>
                  <span className="min-w-0">
                    <strong className="block truncate">{label}</strong>
                    <small className={isActive ? "text-primary-content/75" : "text-neutral-content/55"}>{t(area.eyebrowKey)}</small>
                  </span>
                </a>
              ) : (
                <div
                  aria-disabled="true"
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-company px-3 py-2.5 text-sm"
                  title={t("sidebar.planned")}
                >
                  <i className={`ph-bold ${area.icon} mt-1`} aria-hidden="true"></i>
                  <span className="min-w-0">
                    <strong className="block truncate">{label}</strong>
                    <small>{t(area.eyebrowKey)}</small>
                  </span>
                </div>
              )}

              {hasExpandableViews ? (
                <button
                  aria-expanded={isOpen}
                  aria-label={t(isOpen ? "sidebar.collapse" : "sidebar.expand", { department: label })}
                  className={[
                    "grid place-items-center rounded-r-company text-sm transition",
                    isActive ? "text-primary-content hover:bg-black/10" : "text-neutral-content/65 hover:bg-white/10 hover:text-neutral-content"
                  ].join(" ")}
                  onClick={() => setOpenAreas((current) => ({ ...current, [area.key]: !current[area.key] }))}
                  type="button"
                >
                  <i className={`ph-bold ${isOpen ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden="true"></i>
                </button>
              ) : (
                <span aria-hidden="true"></span>
              )}
            </div>

            {hasExpandableViews && isOpen ? (
              <div className="ml-4 grid gap-1 border-l border-neutral-content/10 pl-2">
                {area.views?.map((view) => {
                  const viewEnabled = view.enabled !== false && Boolean(view.href);
                  const viewActive = isActive && enabledViews.some((enabledView) => enabledView.key === view.key) && view.key === activeView;
                  return viewEnabled ? (
                    <a
                      className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-company px-3 py-2 text-xs font-bold no-underline ${viewActive ? "bg-white/15 text-neutral-content" : "text-neutral-content/65 hover:bg-white/10 hover:text-neutral-content"}`}
                      href={view.href}
                      key={view.key}
                    >
                      <i className={`ph-bold ${view.icon || "ph-circle"}`} aria-hidden="true"></i>
                      <span className="truncate">{t(view.labelKey)}</span>
                    </a>
                  ) : (
                    <span
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-company px-3 py-2 text-xs font-bold text-neutral-content/35"
                      key={view.key}
                      title={t("sidebar.viewDisabled")}
                    >
                      <i className={`ph-bold ${view.icon || "ph-circle"}`} aria-hidden="true"></i>
                      <span className="truncate">{t(view.labelKey)}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function Shell({
  children,
  activeArea
}: {
  children: React.ReactNode;
  activeArea?: CoreAreaKey;
}) {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const workspaces = profile.data?.workspaces || [];
  const activeWorkspace = workspaces.find((workspace) => workspace.active) || workspaces[0];
  const userLabel = activeWorkspace?.role === "owner" ? t("user.admin") : t("user.account");

  async function selectWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === activeWorkspace?.id) {
      return;
    }

    const response = await api<{ data?: { token?: string } }>(`/v1/workspaces/${workspaceId}/actions/select`, {
      method: "POST"
    });
    if (response.data?.token) {
      setOwnerToken(response.data.token);
      window.location.assign(canonicalGeneralDashboardPath);
    }
  }

  return (
    <main className="min-h-screen bg-base-200 text-base-content" data-theme="companycore">
      <div className="grid min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-base-300 bg-neutral p-4 text-neutral-content lg:block">
          <a className="flex items-center gap-3 no-underline text-neutral-content" href={canonicalGeneralDashboardPath}>
            <span className="grid h-10 w-10 place-items-center rounded-company bg-primary font-black">CC</span>
            <span>
              <strong className="block">{t("app.name")}</strong>
              <small className="text-neutral-content/65">{t("app.operatingSystem")}</small>
            </span>
          </a>
          <div className="mt-6 grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-neutral-content/55">{t("workspace.label")}</span>
            <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
              <select
                aria-label={t("workspace.label")}
                className="select select-sm w-full border-neutral-content/15 bg-neutral-content/10 text-neutral-content"
                onChange={(event) => void selectWorkspace(event.target.value)}
                value={activeWorkspace?.id || ""}
              >
                {workspaces.length ? workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                )) : (
                  <option value="">{t("workspace.current")}</option>
                )}
              </select>
              <CcButton ariaLabel={t("workspace.settings")} className="px-0" href="/workspace/settings" iconLeft="ph-gear-six" size="sm" variant="ghost">
                <span className="sr-only">{t("workspace.settings")}</span>
              </CcButton>
            </div>
          </div>
          <DepartmentSidebar activeArea={activeArea} />
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <a className="flex items-center gap-2 font-black no-underline text-company-ink lg:hidden" href={canonicalGeneralDashboardPath}>
                <span className="grid h-9 w-9 place-items-center rounded-company bg-neutral text-neutral-content">CC</span>
                <span>{t("app.name")}</span>
              </a>
              <div className="ml-auto dropdown dropdown-end">
                <button className="btn btn-ghost btn-circle" aria-label={t("user.menu")} type="button" tabIndex={0}>
                  <i className="ph-bold ph-user-circle text-2xl" aria-hidden="true"></i>
                </button>
                <ul className="menu dropdown-content z-20 mt-3 w-64 rounded-company border border-base-300 bg-base-100 p-2 shadow-xl" tabIndex={0}>
                  <li className="menu-title px-3 py-2">
                    <span>{t("user.welcome", { name: userLabel })}</span>
                  </li>
                  <li><a href="/account/settings"><i className="ph-bold ph-user" aria-hidden="true"></i>{t("user.myAccount")}</a></li>
                  <li><a href="/workspace/settings"><i className="ph-bold ph-buildings" aria-hidden="true"></i>{t("workspace.settings")}</a></li>
                  <li><a href="/account/settings"><i className="ph-bold ph-gear-six" aria-hidden="true"></i>{t("user.settings")}</a></li>
                  <li>
                    <button
                      onClick={() => {
                        clearOwnerToken();
                        window.location.assign("/");
                      }}
                      type="button"
                    >
                      <i className="ph-bold ph-sign-out" aria-hidden="true"></i>
                      {t("nav.signOut")}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </header>
          <div className="grid w-full max-w-none gap-6 px-4 py-6 lg:px-8">
            {children}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 py-4 text-sm text-company-muted">
              <span>{t("footer.copy")} {t("footer.madeWith")} <a className="font-bold text-primary" href="https://luckysparrow.ch" rel="noreferrer" target="_blank">LuckySparrow.ch</a></span>
              <LanguageSelector compact />
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
