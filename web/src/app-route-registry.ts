export type AppRouteMeta = {
  id: string;
  href: string;
  label: string;
  title: string;
  icon: string;
  aliases?: string[];
  match?: "exact" | "prefix";
  private?: boolean;
  canonicalSource?: string;
};

export type AppRouteGroup = {
  id: string;
  label: string;
  routes: AppRouteMeta[];
};

export const canonicalGeneralDashboardPath = "/areas?area=00-ogolny&view=overview";
export const canonicalOperationsPath = "/areas?area=04-operacje&view=tasks";
export const canonicalPeopleAgentsPath = "/areas?area=06-kadry&view=directory";
export const canonicalAssetsPath = "/areas?area=08-zasoby&view=overview";
export const canonicalManagementDepartmentsPath = "/areas?area=12-zarzadzanie&view=departments";

export const publicHomeRoute: AppRouteMeta = {
  id: "home",
  href: "/",
  label: "Home",
  title: "CompanyCore",
  icon: "ph-house",
  private: false,
  canonicalSource: "docs/architecture/autonomous-company-operating-system.md"
};

export const publicRoutes: AppRouteMeta[] = [
  publicHomeRoute,
  {
    id: "login",
    href: "/auth/login",
    label: "Sign in",
    title: "Sign in",
    icon: "ph-sign-in",
    private: false,
    canonicalSource: "docs/architecture/web-layer-react-ownership.md"
  },
  {
    id: "register",
    href: "/auth/register",
    label: "Create account",
    title: "Create account",
    icon: "ph-user-plus",
    private: false,
    canonicalSource: "docs/architecture/web-layer-react-ownership.md"
  }
];

export const appRouteGroups: AppRouteGroup[] = [
  {
    id: "companycore-core",
    label: "CompanyCore",
    routes: [
      {
        id: "dashboard",
        href: canonicalGeneralDashboardPath,
        label: "00 General",
        title: "00 General Dashboard",
        icon: "ph-map-trifold",
        aliases: ["/dashboard", "/react-dashboard", "/areas"],
        private: true,
        canonicalSource: "docs/architecture/autonomous-company-operating-system.md"
      },
      {
        id: "operations",
        href: canonicalOperationsPath,
        label: "04 Operations",
        title: "04 Operations",
        icon: "ph-list-checks",
        aliases: ["/operations"],
        private: true,
        canonicalSource: "docs/planning/cc-04-002-operations-work-item-read-model-task-contract.md"
      },
      {
        id: "people-agents",
        href: canonicalPeopleAgentsPath,
        label: "06 People / Agents",
        title: "06 People / Agents",
        icon: "ph-users-three",
        aliases: ["/people-agents", "/workforce"],
        private: true,
        canonicalSource: "docs/architecture/unified-organizational-operating-system.md"
      },
      {
        id: "assets",
        href: canonicalAssetsPath,
        label: "08 Assets",
        title: "08 Assets",
        icon: "ph-folder-open",
        private: true,
        canonicalSource: "docs/planning/cc-08-002-assets-context-read-api-task-contract.md"
      },
      {
        id: "management",
        href: canonicalManagementDepartmentsPath,
        label: "12 Management",
        title: "12 Management",
        icon: "ph-chart-line-up",
        private: true,
        canonicalSource: "docs/architecture/department-management-systems-architecture.md"
      },
      {
        id: "account-settings",
        href: "/account/settings",
        label: "Account settings",
        title: "Account settings",
        icon: "ph-user",
        private: true,
        canonicalSource: "docs/architecture/autonomous-company-operating-system.md"
      },
      {
        id: "workspace-settings",
        href: "/workspace/settings",
        label: "Workspace settings",
        title: "Workspace settings",
        icon: "ph-buildings",
        private: true,
        canonicalSource: "docs/architecture/autonomous-company-operating-system.md"
      }
    ]
  }
];

export const appRoutes: AppRouteMeta[] = [
  ...appRouteGroups.flatMap((group) => group.routes),
  ...publicRoutes
];

function normalizeRoutePath(pathname: string) {
  const pathOnly = pathname.split(/[?#]/)[0];
  if (!pathOnly || pathOnly === "/") {
    return "/";
  }
  return pathOnly.replace(/\/+$/, "") || "/";
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
  const [rawPath, rawQuery = ""] = pathname.split("?");
  if (normalizeRoutePath(rawPath) === "/areas") {
    const params = new URLSearchParams(rawQuery);
    const area = params.get("area");
    if (area === "04-operacje") {
      return appRoutes.find((route) => route.id === "operations");
    }
    if (area === "06-kadry") {
      return appRoutes.find((route) => route.id === "people-agents");
    }
    if (area === "08-zasoby") {
      return appRoutes.find((route) => route.id === "assets");
    }
    if (area === "12-zarzadzanie") {
      return appRoutes.find((route) => route.id === "management");
    }
    return appRoutes.find((route) => route.id === "dashboard");
  }

  return appRoutes.find((route) => routeMatches(route, pathname));
}

export function canonicalPostAuthPath(pathname?: string | null) {
  const targetPath = pathname?.trim();
  if (!targetPath) {
    return canonicalGeneralDashboardPath;
  }

  const [rawPath, rawQuery = ""] = targetPath.split("?");
  if (normalizeRoutePath(rawPath) === "/areas") {
    const params = new URLSearchParams(rawQuery);
    const area = params.get("area");
    if (area === "04-operacje") {
      const view = params.get("view");
      return view === "calendar" ? "/areas?area=04-operacje&view=calendar" : canonicalOperationsPath;
    }
    if (area === "06-kadry") {
      return canonicalPeopleAgentsPath;
    }
    if (area === "08-zasoby") {
      const view = params.get("view");
      return view === "files" ? "/areas?area=08-zasoby&view=files" : canonicalAssetsPath;
    }
    if (area === "12-zarzadzanie") {
      return canonicalManagementDepartmentsPath;
    }
    return canonicalGeneralDashboardPath;
  }

  const route = resolveRouteMeta(targetPath);
  if (!route || route.private === false) {
    return canonicalGeneralDashboardPath;
  }

  if (route.id === "operations") {
    return canonicalOperationsPath;
  }

  if (route.id === "people-agents") {
    return canonicalPeopleAgentsPath;
  }

  if (route.id === "assets") {
    return canonicalAssetsPath;
  }

  if (route.id === "management") {
    return canonicalManagementDepartmentsPath;
  }

  if (route.id === "account-settings" || route.id === "workspace-settings") {
    return route.href;
  }

  return canonicalGeneralDashboardPath;
}
