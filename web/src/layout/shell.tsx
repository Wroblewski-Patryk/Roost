import React, { useEffect, useState } from "react";
import { canonicalGeneralDashboardPath } from "../app-route-registry";
import { api } from "../api/client";
import { clearOwnerToken, setOwnerToken } from "../api/auth-token";
import { CcButton } from "../components/cc-button";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";
import { AuthMe, CoreArea, DepartmentCatalogPacket } from "../types";
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
  activeArea,
  onNavigate
}: {
  activeArea?: string;
  onNavigate?: () => void;
}) {
  const { t } = useLanguage();
  const activeView = currentAreaView();
  const departmentCatalog = useOwnerPacket<DepartmentCatalogPacket>("/v1/departments", true, t);
  const navigationAreas: CoreArea[] = departmentCatalog.data?.departments
    .filter((department) => department.status !== "archived")
    .map((department) => ({
      key: department.key,
      labelKey: department.name,
      eyebrowKey: department.description || "Workspace department",
      descriptionKey: department.description || "",
      href: department.href || undefined,
      icon: department.icon,
      enabled: Boolean(department.href),
      views: department.views.map((view) => ({
        key: view.id,
        labelKey: view.label,
        href: view.href || undefined,
        icon: view.icon,
        enabled: view.enabled !== false && Boolean(view.href)
      }))
    }))
    || coreAreas;
  const [openAreas, setOpenAreas] = useState<Partial<Record<string, boolean>>>({
    "00-ogolny": activeArea === "00-ogolny",
    "01-strategia": activeArea === "01-strategia",
    "02-produkt": activeArea === "02-produkt",
    "03-sprzedaz": activeArea === "03-sprzedaz",
    "04-operacje": activeArea === "04-operacje",
    "05-relacje": activeArea === "05-relacje",
    "06-kadry": activeArea === "06-kadry",
    "07-finanse": activeArea === "07-finanse",
    "08-zasoby": activeArea === "08-zasoby",
    "09-technologia": activeArea === "09-technologia",
    "10-prawo": activeArea === "10-prawo",
    "11-innowacje": activeArea === "11-innowacje",
    "12-zarzadzanie": activeArea === "12-zarzadzanie"
  });

  useEffect(() => {
    if (activeArea) {
      setOpenAreas((current) => ({ ...current, [activeArea]: true }));
    }
  }, [activeArea]);

  return (
    <nav className="mt-4 grid gap-0.5" aria-label={t("sidebar.departments")}>
      <p className="px-2.5 pb-1 text-[11px] font-black uppercase tracking-[0.1em] text-neutral-content/50">{t("sidebar.departments")}</p>
      {navigationAreas.map((area) => {
        const isActive = activeArea === area.key;
        const isEnabled = area.enabled !== false && Boolean(area.href);
        const enabledViews = area.views?.filter((view) => view.enabled !== false && view.href) || [];
        const hasExpandableViews = isEnabled && Boolean(area.views && (area.views.length > 1 || area.key === "12-zarzadzanie"));
        const isOpen = Boolean(openAreas[area.key]);
        const label = displayDepartmentLabel(area.labelKey.startsWith("areas.") || area.labelKey.startsWith("departments.") ? t(area.labelKey) : area.labelKey);
        const eyebrow = area.eyebrowKey.startsWith("areas.") || area.eyebrowKey.startsWith("departments.") ? t(area.eyebrowKey) : area.eyebrowKey;

        return (
          <div className="grid gap-0.5" key={area.key}>
            <div className={[
              "group grid grid-cols-[minmax(0,1fr)_1.75rem] items-stretch rounded-company border transition",
              isActive ? "border-primary/35 bg-primary/14 text-neutral-content shadow-[inset_2px_0_0_rgb(99_102_241)]" : "border-transparent",
              !isActive && isEnabled ? "text-neutral-content/72 hover:border-white/10 hover:bg-white/[0.055] hover:text-neutral-content" : "",
              !isEnabled ? "text-neutral-content/30" : ""
            ].filter(Boolean).join(" ")}>
              {isEnabled ? (
                <a
                  className="grid min-w-0 grid-cols-[1.65rem_minmax(0,1fr)] items-center gap-2 rounded-l-company px-2 py-1.5 text-[13px] leading-tight no-underline"
                  href={area.href}
                  onClick={onNavigate}
                  title={t("sidebar.openMain")}
                >
                  <span className={[
                    "grid h-6 w-6 place-items-center rounded-md text-[13px] transition",
                    isActive ? "bg-primary text-primary-content shadow-[0_0_18px_rgb(99_102_241_/_0.25)]" : "bg-white/[0.045] text-neutral-content/62 group-hover:bg-white/[0.08] group-hover:text-neutral-content"
                  ].join(" ")}>
                    <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate font-extrabold">{label}</strong>
                    <small className={["block truncate text-[11px] leading-4", isActive ? "text-neutral-content/72" : "text-neutral-content/48"].join(" ")}>{eyebrow}</small>
                  </span>
                </a>
              ) : (
                <div
                  aria-disabled="true"
                  className="grid min-w-0 grid-cols-[1.65rem_minmax(0,1fr)] items-center gap-2 rounded-company px-2 py-1.5 text-[13px] leading-tight"
                  title={t("sidebar.planned")}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.035] text-[13px]">
                    <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate font-extrabold">{label}</strong>
                    <small className="block truncate text-[11px] leading-4">{eyebrow}</small>
                  </span>
                </div>
              )}

              {hasExpandableViews ? (
                <button
                  aria-expanded={isOpen}
                  aria-label={t(isOpen ? "sidebar.collapse" : "sidebar.expand", { department: label })}
                  className={[
                    "grid place-items-center rounded-r-company text-xs transition",
                    isActive ? "text-primary hover:bg-primary/10" : "text-neutral-content/48 hover:bg-white/10 hover:text-neutral-content"
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
              <div className="ml-[1.35rem] grid gap-0.5 border-l border-neutral-content/10 pl-2">
                {area.views?.map((view) => {
                  const viewEnabled = view.enabled !== false && Boolean(view.href);
                  const viewActive = isActive && enabledViews.some((enabledView) => enabledView.key === view.key) && view.key === activeView;
                  return viewEnabled ? (
                    <a
                      className={`grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-bold no-underline transition ${viewActive ? "bg-white/[0.105] text-neutral-content shadow-[inset_2px_0_0_rgb(255_255_255_/_0.28)]" : "text-neutral-content/58 hover:bg-white/[0.07] hover:text-neutral-content"}`}
                      href={view.href}
                      key={view.key}
                      onClick={onNavigate}
                    >
                      <i className={`ph-bold ${view.icon || "ph-circle"}`} aria-hidden="true"></i>
                      <span className="truncate">{view.labelKey.startsWith("views.") ? t(view.labelKey) : view.labelKey}</span>
                    </a>
                  ) : (
                    <span
                      className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-bold text-neutral-content/32"
                      key={view.key}
                      title={t("sidebar.viewDisabled")}
                    >
                      <i className={`ph-bold ${view.icon || "ph-circle"}`} aria-hidden="true"></i>
                      <span className="truncate">{view.labelKey.startsWith("views.") ? t(view.labelKey) : view.labelKey}</span>
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
  activeArea?: string;
}) {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const workspaces = profile.data?.workspaces || [];
  const activeWorkspace = workspaces.find((workspace) => workspace.active) || workspaces[0];
  const userLabel = activeWorkspace?.role === "owner" ? t("user.admin") : t("user.account");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeView = currentAreaView();
  const activeShellArea = coreAreas.find((area) => area.key === activeArea) || coreAreas[0];
  const activeShellLabel = displayDepartmentLabel(t(activeShellArea.labelKey));
  const activeShellView = activeShellArea.views?.find((view) => view.key === activeView);
  const activeShellViewLabel = activeShellView ? t(activeShellView.labelKey) : t(activeShellArea.eyebrowKey);

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
    <main className="min-h-screen bg-base-200 text-base-content" data-theme="roost">
      <div className="grid min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-base-300 bg-neutral/96 px-3 py-4 text-neutral-content lg:block">
          <a className="flex items-center gap-3 no-underline text-neutral-content" href={canonicalGeneralDashboardPath}>
            <span className="grid h-9 w-9 place-items-center rounded-company bg-primary font-black shadow-[0_0_22px_rgb(99_102_241_/_0.22)]">R</span>
            <span>
              <strong className="block text-sm leading-5">{t("app.name")}</strong>
              <small className="text-xs text-neutral-content/62">{t("app.operatingSystem")}</small>
            </span>
          </a>
          <div className="mt-5 grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-neutral-content/50">{t("workspace.label")}</span>
            <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2">
              <select
                aria-label={t("workspace.label")}
                className="select select-sm h-8 min-h-8 w-full border-neutral-content/12 bg-black/20 text-xs font-bold text-neutral-content"
                onChange={(event) => void selectWorkspace(event.target.value)}
                value={activeWorkspace?.id || ""}
              >
                {workspaces.length ? workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                )) : (
                  <option value="">{t("workspace.current")}</option>
                )}
              </select>
              <CcButton ariaLabel={t("workspace.settings")} className="h-8 min-h-8 px-0 text-neutral-content/70 hover:bg-white/10 hover:text-neutral-content" href="/workspace/settings" iconLeft="ph-gear-six" size="sm" variant="ghost">
                <span className="sr-only">{t("workspace.settings")}</span>
              </CcButton>
            </div>
          </div>
          <DepartmentSidebar activeArea={activeArea} />
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 px-3 py-2 backdrop-blur sm:px-4 lg:px-8 lg:py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 lg:hidden">
                <button
                  aria-expanded={mobileNavOpen}
                  aria-label={mobileNavOpen ? t("sidebar.collapse", { department: t("sidebar.departments") }) : t("sidebar.expand", { department: t("sidebar.departments") })}
                  className="btn btn-ghost btn-sm btn-square text-company-ink"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                >
                  <i className="ph-bold ph-list text-xl" aria-hidden="true"></i>
                </button>
                <a className="flex min-w-0 items-center gap-2 font-black no-underline text-company-ink" href={canonicalGeneralDashboardPath}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-company bg-neutral text-sm text-neutral-content">R</span>
                  <span className="truncate">{t("app.name")}</span>
                </a>
              </div>
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
            <button
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? t("sidebar.collapse", { department: activeShellLabel }) : t("sidebar.expand", { department: activeShellLabel })}
              className="mt-2 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-company border border-base-300 bg-base-200/70 px-3 py-2 text-left text-company-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)] lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
                <i className={`ph-bold ${activeShellArea.icon}`} aria-hidden="true"></i>
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-black leading-5">{activeShellLabel}</strong>
                <small className="block truncate text-xs font-bold text-company-muted">{activeShellViewLabel}</small>
              </span>
              <i className="ph-bold ph-caret-down text-sm text-company-muted" aria-hidden="true"></i>
            </button>
          </header>

          {mobileNavOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("sidebar.departments")}>
              <button className="absolute inset-0 bg-neutral/65" aria-label={t("sidebar.collapse", { department: t("sidebar.departments") })} onClick={() => setMobileNavOpen(false)} type="button"></button>
              <aside className="relative grid h-full w-[min(23rem,92vw)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border-r border-neutral-content/10 bg-neutral px-3 py-4 text-neutral-content shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <a className="flex min-w-0 items-center gap-3 no-underline text-neutral-content" href={canonicalGeneralDashboardPath} onClick={() => setMobileNavOpen(false)}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-company bg-primary font-black shadow-[0_0_22px_rgb(99_102_241_/_0.22)]">R</span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm leading-5">{t("app.name")}</strong>
                      <small className="block truncate text-xs text-neutral-content/62">{t("app.operatingSystem")}</small>
                    </span>
                  </a>
                  <button className="btn btn-ghost btn-sm btn-circle text-neutral-content" aria-label={t("sidebar.collapse", { department: t("sidebar.departments") })} onClick={() => setMobileNavOpen(false)} type="button">
                    <i className="ph-bold ph-x" aria-hidden="true"></i>
                  </button>
                </div>
                <div className="mt-4 grid gap-3 rounded-company border border-neutral-content/10 bg-white/[0.035] p-3">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-content">
                      <i className={`ph-bold ${activeShellArea.icon}`} aria-hidden="true"></i>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-black">{activeShellLabel}</strong>
                      <small className="block truncate text-xs font-bold text-neutral-content/58">{activeShellViewLabel}</small>
                    </span>
                  </div>
                </div>
                <div className="mt-4 min-h-0 overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-neutral-content/50">{t("workspace.label")}</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2">
                      <select
                        aria-label={t("workspace.label")}
                        className="select select-sm h-8 min-h-8 w-full border-neutral-content/12 bg-black/20 text-xs font-bold text-neutral-content"
                        onChange={(event) => void selectWorkspace(event.target.value)}
                        value={activeWorkspace?.id || ""}
                      >
                        {workspaces.length ? workspaces.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                        )) : (
                          <option value="">{t("workspace.current")}</option>
                        )}
                      </select>
                      <CcButton ariaLabel={t("workspace.settings")} className="h-8 min-h-8 px-0 text-neutral-content/70 hover:bg-white/10 hover:text-neutral-content" href="/workspace/settings" iconLeft="ph-gear-six" size="sm" variant="ghost">
                        <span className="sr-only">{t("workspace.settings")}</span>
                      </CcButton>
                    </div>
                  </div>
                  <DepartmentSidebar activeArea={activeArea} onNavigate={() => setMobileNavOpen(false)} />
                </div>
              </aside>
            </div>
          ) : null}

          <div className="grid w-full max-w-none gap-4 px-3 py-4 sm:px-4 sm:py-5 lg:gap-6 lg:px-8 lg:py-6">
            {children}
            <footer className="flex flex-col items-start justify-between gap-3 rounded-company border border-base-300 bg-base-100/55 px-4 py-3 text-sm text-company-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)] sm:flex-row sm:items-center">
              <span className="min-w-0 leading-6">{t("footer.copy")} {t("footer.madeWith")} <a className="font-bold text-primary transition hover:text-secondary" href="https://luckysparrow.ch" rel="noreferrer" target="_blank">LuckySparrow.ch</a></span>
              <LanguageSelector compact />
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
