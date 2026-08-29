import React, { useEffect, useMemo, useRef, useState } from "react";
import { canonicalGeneralDashboardPath } from "../app-route-registry";
import { api } from "../api/client";
import { clearOwnerToken, setOwnerToken } from "../api/auth-token";
import { RoostLogoMark } from "../components/roost-logo-mark";
import { coreAreas } from "../features/departments/core-area-data";
import { useOwnerPacket } from "../hooks/use-owner-packet";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";
import { AuthMe, CoreArea, DepartmentCatalogPacket } from "../types";

function displayDepartmentLabel(label: string) {
  return label.replace(/^\d{2}\s+/, "");
}

function currentAreaView() {
  if (typeof window === "undefined") return "overview";
  return new URLSearchParams(window.location.search).get("view") || "overview";
}

function translatedAreaLabel(value: string, t: ReturnType<typeof useLanguage>["t"]) {
  return value.startsWith("areas.") || value.startsWith("departments.") ? t(value) : value;
}

function translatedViewLabel(value: string, t: ReturnType<typeof useLanguage>["t"]) {
  return value.startsWith("views.") ? t(value) : value;
}

function contextualViewLabel(viewLabel: string, areaLabel: string) {
  const escapedArea = areaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutRepeatedArea = viewLabel.replace(new RegExp(`^${escapedArea}(?:\\s*[-–—:>/]\\s*|\\s+)`, "i"), "").trim();
  return withoutRepeatedArea || viewLabel;
}

function DepartmentSidebar({ activeArea, onNavigate }: { activeArea?: string; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const activeView = currentAreaView();
  const departmentCatalog = useOwnerPacket<DepartmentCatalogPacket>("/v1/departments", true, t);
  const navigationAreas: CoreArea[] = departmentCatalog.data?.departments
    .filter((department) => department.status !== "archived")
    .map((department) => {
      const fallbackArea = coreAreas.find((area) => area.key === department.key);
      const catalogViews = department.views.map((view) => ({
        key: view.id,
        labelKey: view.label,
        href: view.href || undefined,
        icon: view.icon,
        enabled: view.enabled !== false && Boolean(view.href)
      }));
      const fallbackViews = fallbackArea?.views || [];
      const combinedViews = [
        ...fallbackViews.map((fallbackView) => {
          const catalogView = catalogViews.find((view) => view.key === fallbackView.key);
          if (!catalogView) return fallbackView;
          const viewHref = catalogView.href || fallbackView.href;
          return { ...fallbackView, ...catalogView, href: viewHref, enabled: catalogView.enabled !== false && Boolean(viewHref) };
        }),
        ...catalogViews.filter((view) => !fallbackViews.some((fallbackView) => fallbackView.key === view.key))
      ];
      const seenViewDestinations = new Set<string>();
      const linkedViews = combinedViews.filter((view) => {
        const destination = view.href || view.key;
        if (seenViewDestinations.has(destination)) return false;
        seenViewDestinations.add(destination);
        return true;
      });
      const href = department.href || fallbackArea?.href;
      return {
        key: department.key,
        // Keep canonical departments translated even when the runtime catalog
        // supplies their persisted English display names. Custom departments
        // still fall back to the workspace-owned name.
        labelKey: fallbackArea?.labelKey || department.name,
        eyebrowKey: department.description || fallbackArea?.eyebrowKey || "Workspace department",
        descriptionKey: department.description || fallbackArea?.descriptionKey || "",
        href,
        icon: department.icon || fallbackArea?.icon,
        enabled: Boolean(href),
        views: linkedViews
      };
    }) || coreAreas;

  return (
    <nav className="roost-sidebar-navigation" aria-label={t("sidebar.departments")}>
      <p className="roost-sidebar-section-label">{t("sidebar.departments")}</p>
      <div className="roost-sidebar-area-list">
        {navigationAreas.map((area) => {
          const isActive = activeArea === area.key;
          const isEnabled = area.enabled !== false && Boolean(area.href);
          const label = displayDepartmentLabel(translatedAreaLabel(area.labelKey, t));
          const activeViews = isActive ? (area.views || []).filter((view) => view.enabled !== false && view.href) : [];

          return (
            <div className="roost-sidebar-area-group" key={area.key}>
              {isEnabled ? (
                <a aria-current={isActive ? "page" : undefined} className={`roost-sidebar-area${isActive ? " is-active" : ""}`} href={area.href} onClick={onNavigate} title={translatedAreaLabel(area.eyebrowKey, t)}>
                  <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                  <span className="roost-sidebar-area-label">{label}</span>
                </a>
              ) : (
                <div className="roost-sidebar-area is-disabled" aria-disabled="true" title={t("sidebar.planned")}>
                  <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                  <span className="roost-sidebar-area-label">{label}</span>
                </div>
              )}

              {activeViews.length > 1 ? (
                <div className="roost-sidebar-context-nav" aria-label={t("sidebar.currentAreaViews")}>
                  {activeViews.map((view) => (
                    <a aria-current={view.key === activeView ? "page" : undefined} className={view.key === activeView ? "is-active" : ""} href={view.href} key={view.key} onClick={onNavigate}>
                      {contextualViewLabel(translatedViewLabel(view.labelKey, t), label)}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function WorkspaceControl({ activeWorkspaceId, workspaces, onSelect }: { activeWorkspaceId?: string; workspaces: AuthMe["workspaces"]; onSelect: (workspaceId: string) => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="roost-workspace-switcher" ref={rootRef}>
      <span className="roost-workspace-label">{t("workspace.shortLabel")}</span>
      <button aria-expanded={open} aria-haspopup="menu" className="roost-workspace-trigger" onClick={() => setOpen((value) => !value)} type="button">
        <span className="roost-workspace-mark"><RoostLogoMark className="h-5 w-5" /></span>
        <span className="roost-workspace-copy">
          <strong>{activeWorkspace?.name || t("workspace.current")}</strong>
          <small><span className="roost-workspace-status" aria-hidden="true"></span>{t("shell.workspaceSafe")}</small>
        </span>
        <i className={`ph-bold ph-caret-down${open ? " is-open" : ""}`} aria-hidden="true"></i>
      </button>

      {open ? (
        <div className="roost-workspace-popover" role="menu" aria-label={t("workspace.switch")}>
          <p>{t("workspace.switch")}</p>
          {workspaces.length ? workspaces.map((workspace) => {
            const selected = workspace.id === activeWorkspace?.id;
            return (
              <button aria-current={selected ? "true" : undefined} className={selected ? "is-active" : ""} key={workspace.id} onClick={() => { setOpen(false); onSelect(workspace.id); }} role="menuitem" type="button">
                <span className="roost-workspace-option-mark"><RoostLogoMark className="h-4 w-4" /></span>
                <span><strong>{workspace.name}</strong><small><span className="roost-workspace-status" aria-hidden="true"></span>{t("shell.workspaceSafe")}</small></span>
                {selected ? <i className="ph-bold ph-check" aria-hidden="true"></i> : null}
              </button>
            );
          }) : <span className="roost-workspace-empty">{t("workspace.current")}</span>}
          <a href="/workspace/settings"><i className="ph-bold ph-buildings" aria-hidden="true"></i>{t("workspace.manage")}</a>
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ children, activeArea }: { children: React.ReactNode; activeArea?: string }) {
  const { t } = useLanguage();
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const workspaces = profile.data?.workspaces || [];
  const activeWorkspace = workspaces.find((workspace) => workspace.active) || workspaces[0];
  const [profileName, setProfileName] = useState<string | null>(null);
  const userLabel = profileName || profile.data?.user?.name || (activeWorkspace?.role === "owner" ? t("user.admin") : t("user.account"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const activeView = currentAreaView();
  const activeShellArea = coreAreas.find((area) => area.key === activeArea) || coreAreas[0];
  const settingsRoute = pathname === "/workspace/settings" || pathname === "/account/settings";
  const activeShellLabel = settingsRoute ? t("shell.settings") : displayDepartmentLabel(t(activeShellArea.labelKey));
  const activeShellView = activeShellArea.views?.find((view) => view.key === activeView);
  const activeShellViewLabel = pathname === "/workspace/settings"
    ? t("workspace.settings")
    : pathname === "/account/settings"
      ? t("user.myAccount")
      : activeShellView
        ? t(activeShellView.labelKey)
        : t(activeShellArea.eyebrowKey);
  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLocaleLowerCase();
    return coreAreas.filter((area) => {
      const label = displayDepartmentLabel(t(area.labelKey));
      return area.enabled !== false && area.href && (!query || `${label} ${t(area.eyebrowKey)}`.toLocaleLowerCase().includes(query));
    }).slice(0, 8);
  }, [commandQuery, t]);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const name = (event as CustomEvent<{ name?: string | null }>).detail?.name;
      setProfileName(name || null);
    }
    window.addEventListener("roost:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("roost:profile-updated", handleProfileUpdated);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function selectWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === activeWorkspace?.id) return;
    const response = await api<{ data?: { token?: string } }>(`/v1/workspaces/${workspaceId}/actions/select`, { method: "POST" });
    if (response.data?.token) {
      setOwnerToken(response.data.token);
      window.location.assign(canonicalGeneralDashboardPath);
    }
  }

  function signOut() {
    clearOwnerToken();
    window.location.assign("/");
  }

  const sidebar = (
    <>
      <div className="roost-sidebar-brand-row">
        <a className="roost-sidebar-brand" href={canonicalGeneralDashboardPath} onClick={() => setMobileNavOpen(false)}>
          <RoostLogoMark className="h-8 w-8" />
          <span><strong>{t("app.name")}</strong><small>{t("app.operatingSystem")}</small></span>
        </a>
        <button className="roost-sidebar-close lg:hidden" aria-label={t("sidebar.close")} onClick={() => setMobileNavOpen(false)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button>
      </div>
      <WorkspaceControl activeWorkspaceId={activeWorkspace?.id} onSelect={(id) => void selectWorkspace(id)} workspaces={workspaces} />
      <div className="roost-sidebar-scroll"><DepartmentSidebar activeArea={activeArea} onNavigate={() => setMobileNavOpen(false)} /></div>
      <div className="roost-sidebar-footer">
        <a aria-current={pathname === "/workspace/settings" ? "page" : undefined} className={pathname === "/workspace/settings" ? "is-active" : undefined} href="/workspace/settings" onClick={() => setMobileNavOpen(false)}><i className="ph-bold ph-gear-six" aria-hidden="true"></i><span>{t("workspace.settings")}</span></a>
        <a aria-current={pathname === "/account/settings" ? "page" : undefined} className={`roost-sidebar-account${pathname === "/account/settings" ? " is-active" : ""}`} href="/account/settings" onClick={() => setMobileNavOpen(false)}>
          <span className="roost-owner-avatar" aria-hidden="true"><i className="ph-bold ph-user"></i></span>
          <span><strong>{userLabel}</strong><small>{t("user.myAccount")}</small></span>
          <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
        </a>
        <button className="roost-sidebar-signout" onClick={signOut} type="button"><i className="ph-bold ph-sign-out" aria-hidden="true"></i><span>{t("nav.signOut")}</span></button>
      </div>
    </>
  );

  return (
    <main className="roost-app-shell roost-liquid-shell" data-theme="roost">
      <aside className="roost-sidebar hidden lg:grid">{sidebar}</aside>
      <section className="roost-app-main">
        <header className="roost-command-bar">
          <div className="roost-command-context">
            <button aria-expanded={mobileNavOpen} aria-label={t("sidebar.open")} className="roost-mobile-menu lg:hidden" onClick={() => setMobileNavOpen(true)} type="button"><i className="ph-bold ph-list" aria-hidden="true"></i></button>
            <div className="roost-command-breadcrumb"><strong>{activeShellLabel}</strong><i className="ph-bold ph-caret-right" aria-hidden="true"></i><span>{activeShellViewLabel}</span></div>
          </div>
          <button className="roost-command-launch" onClick={() => setCommandOpen(true)} type="button">
            <i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i><span>{t("shell.commandSearch")}</span><kbd>⌘K</kbd>
          </button>
          <div className="roost-command-actions">
            <LanguageSelector compact />
          </div>
        </header>

        {commandOpen ? (
          <div className="roost-command-dialog" role="dialog" aria-modal="true" aria-label={t("shell.commandSearch")}>
            <button className="roost-command-backdrop" aria-label={t("shell.closeCommand")} onClick={() => setCommandOpen(false)} type="button"></button>
            <section className="roost-command-palette">
              <label><i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i><input aria-label={t("shell.commandSearch")} autoFocus onChange={(event) => setCommandQuery(event.target.value)} placeholder={t("shell.commandSearch")} type="search" value={commandQuery} /><kbd aria-hidden="true">ESC</kbd></label>
              <p>{t("shell.commandHint")}</p>
              <nav aria-label={t("sidebar.departments")}>
                {commandResults.map((area) => (
                  <a href={area.href} key={area.key} onClick={() => setCommandOpen(false)}>
                    <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                    <span><strong>{displayDepartmentLabel(t(area.labelKey))}</strong><small>{t(area.eyebrowKey)}</small></span>
                    <i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i>
                  </a>
                ))}
                {!commandResults.length ? <span className="roost-command-empty">{t("shell.commandEmpty")}</span> : null}
              </nav>
            </section>
          </div>
        ) : null}

        {mobileNavOpen ? (
          <div className="roost-mobile-navigation" role="dialog" aria-modal="true" aria-label={t("sidebar.departments")}>
            <button aria-hidden="true" className="roost-mobile-backdrop" onClick={() => setMobileNavOpen(false)} tabIndex={-1} type="button"></button>
            <aside className="roost-sidebar is-mobile">{sidebar}</aside>
          </div>
        ) : null}

        <div className="roost-page-content" data-active-area={settingsRoute ? "settings" : activeArea}>
          {children}
          <footer className="roost-app-footer">
            <span>{t("footer.copy")} {t("footer.madeWith")} <a href="https://luckysparrow.ch" rel="noreferrer" target="_blank">LuckySparrow.ch</a></span>
            <span>{t("shell.ownerConsole")}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
