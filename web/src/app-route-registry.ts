export type AppRouteMeta = {
  id: string;
  href: string;
  label: string;
  title: string;
  icon: string;
  area?: string;
  aliases?: string[];
  match?: "exact" | "prefix";
  private?: boolean;
  uxStage?: "v1-canonical" | "v1-foundation" | "v0-rebuild" | "v0-compatibility" | "v2-deferred";
  canonicalSource?: string;
  rebuildNote?: string;
};

export type AppRouteGroup = {
  id: string;
  label: string;
  routes: AppRouteMeta[];
};

export const canonicalDashboardPath = "/dashboard";

export const publicHomeRoute: AppRouteMeta = {
  id: "home",
  href: "/",
  label: "Home",
  title: "CompanyCore",
  icon: "ph-house",
  private: false,
  uxStage: "v1-canonical",
  canonicalSource: "docs/ux/v1-web-view-index-2026-05-15.md"
};

export const appRouteGroups: AppRouteGroup[] = [
  {
    id: "command",
    label: "Command",
    routes: [
      {
        id: "operations",
        href: "/operations",
        label: "Operations cockpit",
        title: "Operations Cockpit",
        icon: "ph-house-line",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/planning/v1-operations-cockpit-task-contract.md",
        rebuildNote: "Derived V1 workbench for clients, tasks, files/tables, and AI handoff."
      },
      {
        id: "dashboard",
        href: canonicalDashboardPath,
        label: "Company map",
        title: "Company Atlas",
        icon: "ph-map-trifold",
        aliases: ["/react-dashboard"],
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md"
      }
    ]
  },
  {
    id: "areas",
    label: "Areas",
    routes: [
      {
        id: "areas",
        href: "/areas",
        label: "Areas & resources",
        title: "Areas",
        icon: "ph-buildings",
        aliases: ["/react-areas"],
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-area-detail-canonical-spec-2026-05-15.md",
        rebuildNote: "/areas is the V0 all-areas workbench; /areas?area=:areaKey is the V1 selected-area view."
      },
      {
        id: "relationships",
        href: "/relationships",
        label: "Relationship review",
        title: "Relationships",
        icon: "ph-graph",
        private: true,
        uxStage: "v0-rebuild",
        rebuildNote: "Rebuild as area-scoped relationship/provenance view inside selected departments."
      },
      {
        id: "data",
        href: "/data",
        label: "Company data",
        title: "Data",
        icon: "ph-database",
        match: "prefix",
        private: true,
        uxStage: "v1-foundation",
        canonicalSource: "docs/planning/v1-data-evidence-browser-task-contract.md",
        rebuildNote: "V1 evidence browser for department-owned tables, records, source routes, and agent-readable context."
      }
    ]
  },
  {
    id: "workflows",
    label: "Workflows",
    routes: [
      {
        id: "tasks",
        href: "/tasks-adapter",
        label: "Tasks & delivery",
        title: "Tasks",
        icon: "ph-list-checks",
        aliases: ["/react-tasks"],
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/planning/v1-tasks-delivery-workbench-task-contract.md",
        rebuildNote: "V1 tasks and delivery workbench for execution pressure, task creation, status movement, and AI handoff."
      },
      {
        id: "pipeline",
        href: "/pipeline",
        label: "Pipeline / CRM",
        title: "Pipeline",
        icon: "ph-flow-arrow",
        private: true,
        uxStage: "v0-rebuild",
        rebuildNote: "Rebuild around sales/operations workflow pressure and selected-area ownership."
      },
      {
        id: "company-os",
        href: "/react-company-os",
        label: "Company OS",
        title: "Company OS",
        icon: "ph-circles-four",
        private: true,
        uxStage: "v1-foundation",
        rebuildNote: "Keep as command/evidence foundation; polish as contextual area/governance cockpit."
      }
    ]
  },
  {
    id: "integrations-agents",
    label: "Integrations & agents",
    routes: [
      {
        id: "settings",
        href: "/settings",
        label: "Workspace settings",
        title: "Settings",
        icon: "ph-sliders-horizontal",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md"
      },
      {
        id: "integration-health",
        href: "/settings/integrations",
        label: "Integrations",
        title: "Integrations",
        icon: "ph-plugs-connected",
        aliases: ["/react-integrations"],
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md",
        rebuildNote: "Section-aware entry into the unified V1 settings Integrations tab."
      },
      {
        id: "clickup",
        href: "/settings/integrations",
        label: "ClickUp bridge",
        title: "ClickUp Bridge",
        icon: "ph-kanban",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md",
        rebuildNote: "ClickUp opens the unified V1 settings Integrations tab with ClickUp selected by default."
      },
      {
        id: "drive",
        href: "/settings/drive",
        label: "Google Drive",
        title: "Google Drive",
        icon: "ph-cloud",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md",
        rebuildNote: "Section-aware entry into the unified V1 settings Integrations tab with Google Drive selected."
      },
      {
        id: "agent-access",
        href: "/settings/api",
        label: "Agent access",
        title: "Agent Access",
        icon: "ph-key",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md",
        rebuildNote: "Section-aware entry into the unified V1 settings Agent keys tab."
      },
      {
        id: "agent-tools",
        href: "/react-agent-tools",
        label: "MCP",
        title: "Agent Tools",
        icon: "ph-robot",
        private: true,
        uxStage: "v1-canonical",
        canonicalSource: "docs/ux/v1-settings-canonical-spec-2026-05-15.md",
        rebuildNote: "Section-aware entry into the unified V1 settings MCP tab."
      }
    ]
  },
  {
    id: "workspace",
    label: "Workspace",
    routes: [
      {
        id: "account",
        href: "/settings/account",
        label: "Account & readiness",
        title: "Account",
        icon: "ph-user-circle",
        private: true,
        uxStage: "v0-rebuild",
        rebuildNote: "Rebuild as quiet workspace/admin settings flow after core owner journeys."
      }
    ]
  }
];

export const publicRoutes: AppRouteMeta[] = [
  publicHomeRoute,
  {
    id: "login",
    href: "/auth/login",
    label: "Sign in",
    title: "Sign in",
    icon: "ph-sign-in",
    private: false,
    uxStage: "v1-canonical",
    canonicalSource: "docs/ux/v1-web-view-index-2026-05-15.md"
  },
  {
    id: "register",
    href: "/auth/register",
    label: "Create account",
    title: "Create account",
    icon: "ph-user-plus",
    private: false,
    uxStage: "v1-canonical",
    canonicalSource: "docs/ux/v1-web-view-index-2026-05-15.md"
  }
];

export const appRoutes: AppRouteMeta[] = [
  ...appRouteGroups.flatMap((group) => group.routes),
  ...publicRoutes
];

function normalizeRoutePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "") || "/";
}

export function routeMatches(route: Pick<AppRouteMeta, "href" | "aliases" | "match">, pathname: string) {
  const currentPath = normalizeRoutePath(pathname);
  const routePath = normalizeRoutePath(route.href);
  const aliases = (route.aliases || []).map(normalizeRoutePath);

  if (route.match === "prefix") {
    return currentPath === routePath || currentPath.startsWith(`${routePath}/`) || aliases.some((alias) => currentPath === alias || currentPath.startsWith(`${alias}/`));
  }

  return currentPath === routePath || aliases.includes(currentPath);
}

export function resolveRouteMeta(pathname: string) {
  return appRoutes.find((route) => routeMatches(route, pathname));
}

export function canonicalPostAuthPath(pathname?: string | null) {
  if (!pathname) {
    return canonicalDashboardPath;
  }

  const route = resolveRouteMeta(pathname);
  if (!route || route.private === false) {
    return canonicalDashboardPath;
  }

  const currentPath = normalizeRoutePath(pathname);
  const aliases = (route.aliases || []).map(normalizeRoutePath);
  if (currentPath === "/" || aliases.includes(currentPath)) {
    return route.href;
  }

  return currentPath;
}
