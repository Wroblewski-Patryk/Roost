import React, { useEffect, useMemo, useRef, useState } from "react";
import { canonicalGeneralDashboardPath } from "../app-route-registry";
import { api } from "../api/client";
import { clearOwnerToken, setOwnerToken } from "../api/auth-token";
import { CcIdentityMark } from "../components/cc-identity-picker";
import { RoostLogoMark } from "../components/roost-logo-mark";
import { coreAreas } from "../features/departments/core-area-data";
import { useOwnerPacket } from "../hooks/use-owner-packet";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../i18n/i18n";
import { AuthMe, CoreArea, DepartmentCatalogPacket } from "../types";

function displayDepartmentLabel(label: string) {
  return label.replace(/^\d{2}\s+/, "");
}

function roleLabel(role: string | undefined, t: ReturnType<typeof useLanguage>["t"]) {
  return role && ["owner", "admin", "member", "viewer"].includes(role) ? t(`account.role.${role}`) : t("user.account");
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

type UniversalSearchResult = { entityType: string; recordType?: string; id: string; title: string; subtitle?: string | null };

function searchResultDestination(result: UniversalSearchResult) {
  const entityType = result.recordType === "requirement" ? "requirement" : result.entityType;
  return `/areas?area=00-ogolny&view=entity&type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(result.id)}`;
}

function searchResultIcon(entityType: string) {
  return ({ goal: "ph-target", task: "ph-list-checks", project: "ph-briefcase", company_record: "ph-file-text", application: "ph-cube", feature: "ph-puzzle-piece", client: "ph-address-book", procedure: "ph-list-numbers", resource: "ph-folder-open", workforce: "ph-user", agent: "ph-robot", decision: "ph-signpost", risk: "ph-warning-octagon", metric: "ph-chart-line-up" } as Record<string, string>)[entityType] || "ph-magnifying-glass";
}

function humanizeSearchType(result: UniversalSearchResult) {
  return (result.recordType || result.entityType).replace(/_/g, " ");
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
        key: view.routeView || (view.href ? new URL(view.href, window.location.origin).searchParams.get("view") || view.id : view.id),
        labelKey: view.label,
        href: view.href || undefined,
        icon: view.icon,
        enabled: view.enabled !== false && Boolean(view.href)
      }));
      const seenViewDestinations = new Set<string>();
      const linkedViews = catalogViews.filter((view) => {
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
      <div className="roost-workspace-trigger-row">
        <button aria-expanded={open} aria-haspopup="menu" className="roost-workspace-trigger" onClick={() => setOpen((value) => !value)} type="button">
          <CcIdentityMark className="roost-workspace-mark" name={activeWorkspace?.name} value={activeWorkspace?.logo} />
          <span className="roost-workspace-copy">
            <strong>{activeWorkspace?.name || t("workspace.current")}</strong>
            <small>{roleLabel(activeWorkspace?.role, t)}</small>
          </span>
          <i className={`ph-bold ph-caret-down${open ? " is-open" : ""}`} aria-hidden="true"></i>
        </button>
        <a aria-label={t("workspace.settings")} className="roost-workspace-settings-shortcut" href="/workspace/settings" title={t("workspace.settings")}><i className="ph-bold ph-gear-six" aria-hidden="true"></i></a>
      </div>

      {open ? (
        <div className="roost-workspace-popover" role="menu" aria-label={t("workspace.switch")}>
          <p>{t("workspace.switch")}</p>
          {workspaces.length ? workspaces.map((workspace) => {
            const selected = workspace.id === activeWorkspace?.id;
            return (
              <button aria-current={selected ? "true" : undefined} className={selected ? "is-active" : ""} key={workspace.id} onClick={() => { setOpen(false); onSelect(workspace.id); }} role="menuitem" type="button">
                <CcIdentityMark className="roost-workspace-option-mark" name={workspace.name} value={workspace.logo} />
                <span><strong>{workspace.name}</strong><small>{roleLabel(workspace.role, t)}</small></span>
                {selected ? <i className="ph-bold ph-check" aria-hidden="true"></i> : null}
              </button>
            );
          }) : <span className="roost-workspace-empty">{t("workspace.current")}</span>}
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ children, activeArea }: { children: React.ReactNode; activeArea?: string }) {
  const { t } = useLanguage();
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const [workspaceUpdate, setWorkspaceUpdate] = useState<Partial<NonNullable<AuthMe["workspaces"]>[number]> | null>(null);
  const workspaces = (profile.data?.workspaces || []).map((workspace) => workspace.id === workspaceUpdate?.id ? { ...workspace, ...workspaceUpdate } : workspace);
  const activeWorkspace = workspaces.find((workspace) => workspace.active) || workspaces[0];
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null | undefined>(undefined);
  const userLabel = profileName || profile.data?.user?.name || (activeWorkspace?.role === "owner" ? t("user.admin") : t("user.account"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [searchDepartmentKey, setSearchDepartmentKey] = useState("");
  const [entityResults, setEntityResults] = useState<UniversalSearchResult[]>([]);
  const [entitySearchBusy, setEntitySearchBusy] = useState(false);
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
    const query = commandQuery.trim();
    if (!commandOpen || query.length < 2) { setEntityResults([]); setEntitySearchBusy(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setEntitySearchBusy(true);
      try {
        const response = await api<{ data: UniversalSearchResult[] }>(`/v1/company-intelligence/search?q=${encodeURIComponent(query)}${searchDepartmentKey ? `&departmentKey=${encodeURIComponent(searchDepartmentKey)}` : ""}`, { signal: controller.signal });
        setEntityResults(response.data.slice(0, 20));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setEntityResults([]);
      } finally { if (!controller.signal.aborted) setEntitySearchBusy(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [commandOpen, commandQuery, searchDepartmentKey]);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{ name?: string | null; avatar?: string | null }>).detail;
      const name = detail?.name;
      setProfileName(name || null);
      setProfileAvatar(detail?.avatar || "initials");
    }
    function handleWorkspaceUpdated(event: Event) {
      setWorkspaceUpdate((event as CustomEvent<Partial<NonNullable<AuthMe["workspaces"]>[number]>>).detail);
    }
    window.addEventListener("roost:profile-updated", handleProfileUpdated);
    window.addEventListener("roost:workspace-updated", handleWorkspaceUpdated);
    return () => {
      window.removeEventListener("roost:profile-updated", handleProfileUpdated);
      window.removeEventListener("roost:workspace-updated", handleWorkspaceUpdated);
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeMobileNavigation() {
      setMobileNavOpen(false);
    }

    function handleMobileNavigationKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation();
        return;
      }
      if (event.key !== "Tab" || !mobileNavRef.current) return;

      const focusable = Array.from(mobileNavRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleMobileNavigationKeys);
    window.addEventListener("popstate", closeMobileNavigation);
    window.addEventListener("roost:navigation", closeMobileNavigation);
    const desktopViewport = window.matchMedia("(min-width: 1024px)");
    desktopViewport.addEventListener("change", closeMobileNavigation);

    const focusFrame = window.requestAnimationFrame(() => {
      mobileNavCloseRef.current?.focus();
      mobileNavRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleMobileNavigationKeys);
      window.removeEventListener("popstate", closeMobileNavigation);
      window.removeEventListener("roost:navigation", closeMobileNavigation);
      desktopViewport.removeEventListener("change", closeMobileNavigation);
      document.body.style.overflow = previousOverflow;
      mobileNavTriggerRef.current?.focus();
    };
  }, [mobileNavOpen]);

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

  function sidebar(mobile = false) {
    return (
    <>
      <div className="roost-sidebar-brand-row">
        <a className="roost-sidebar-brand" href={canonicalGeneralDashboardPath} onClick={() => setMobileNavOpen(false)}>
          <RoostLogoMark className="h-8 w-8" />
          <span><strong>{t("app.name")}</strong><small>{t("app.operatingSystem")}</small></span>
        </a>
        {mobile ? <button className="roost-sidebar-close" aria-label={t("sidebar.close")} onClick={() => setMobileNavOpen(false)} ref={mobileNavCloseRef} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button> : null}
      </div>
      <WorkspaceControl activeWorkspaceId={activeWorkspace?.id} onSelect={(id) => void selectWorkspace(id)} workspaces={workspaces} />
      <div className="roost-sidebar-scroll"><DepartmentSidebar activeArea={activeArea} onNavigate={() => setMobileNavOpen(false)} /></div>
      <div className="roost-sidebar-footer">
        <a aria-current={pathname === "/account/settings" ? "page" : undefined} className={`roost-sidebar-account${pathname === "/account/settings" ? " is-active" : ""}`} href="/account/settings" onClick={() => setMobileNavOpen(false)}>
          <CcIdentityMark className="roost-owner-avatar" name={userLabel} value={profileAvatar === undefined ? profile.data?.user?.avatar : profileAvatar} />
          <span><strong>{userLabel}</strong><small>{t("user.myAccount")}</small></span>
          <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
        </a>
        <button className="roost-sidebar-signout" onClick={signOut} type="button"><i className="ph-bold ph-sign-out" aria-hidden="true"></i><span>{t("nav.signOut")}</span></button>
      </div>
    </>
  );
  }

  return (
    <main className="roost-app-shell roost-liquid-shell" data-theme="roost" style={{ "--color-primary": activeWorkspace?.accentColor || "#6366F1", "--roost-workspace-accent": activeWorkspace?.accentColor || "#6366F1" } as React.CSSProperties}>
      <aside className="roost-sidebar hidden lg:grid">{sidebar()}</aside>
      <section className="roost-app-main">
        <header className="roost-command-bar">
          <div className="roost-command-context">
            <button aria-controls="roost-mobile-navigation" aria-expanded={mobileNavOpen} aria-label={`${t("sidebar.open")}: ${activeShellLabel}, ${activeShellViewLabel}`} className="roost-mobile-menu lg:hidden" onClick={() => setMobileNavOpen(true)} ref={mobileNavTriggerRef} type="button">
              <i className="ph-bold ph-list" aria-hidden="true"></i>
              <span className="roost-mobile-context-copy"><strong>{activeShellLabel}</strong><small>{activeShellViewLabel}</small></span>
            </button>
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
              <div className="flex items-center justify-between gap-3"><p>{t("shell.commandHint")}</p><select aria-label="Search department" className="select select-bordered select-sm max-w-52" onChange={(event) => setSearchDepartmentKey(event.target.value)} value={searchDepartmentKey}><option value="">All departments</option>{coreAreas.map((area) => <option key={area.key} value={area.key}>{displayDepartmentLabel(t(area.labelKey))}</option>)}</select></div>
              <nav aria-label={t("sidebar.departments")}>
                {commandResults.map((area) => (
                  <a href={area.href} key={area.key} onClick={() => setCommandOpen(false)}>
                    <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                    <span><strong>{displayDepartmentLabel(t(area.labelKey))}</strong><small>{t(area.eyebrowKey)}</small></span>
                    <i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i>
                  </a>
                ))}
                {entityResults.map((result) => (
                  <a href={searchResultDestination(result)} key={`${result.entityType}:${result.id}`} onClick={() => setCommandOpen(false)}>
                    <i className={`ph-bold ${searchResultIcon(result.entityType)}`} aria-hidden="true"></i>
                    <span><strong>{result.title}</strong><small>{[humanizeSearchType(result), result.subtitle].filter(Boolean).join(" · ")}</small></span>
                    <i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i>
                  </a>
                ))}
                {entitySearchBusy ? <span className="roost-command-empty">{t("table.loading.title")}</span> : null}
                {!commandResults.length && !entityResults.length && !entitySearchBusy ? <span className="roost-command-empty">{t("shell.commandEmpty")}</span> : null}
              </nav>
            </section>
          </div>
        ) : null}

        {mobileNavOpen ? (
          <div className="roost-mobile-navigation" id="roost-mobile-navigation" role="dialog" aria-modal="true" aria-label={t("sidebar.departments")}>
            <button aria-hidden="true" className="roost-mobile-backdrop" onClick={() => setMobileNavOpen(false)} tabIndex={-1} type="button"></button>
            <aside className="roost-sidebar is-mobile" ref={mobileNavRef}>{sidebar(true)}</aside>
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
