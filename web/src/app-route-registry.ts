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
export const canonicalStrategyPath = "/areas?area=01-strategia&view=overview";
export const canonicalProductDeliveryPath = "/areas?area=02-produkt&view=overview";
export const canonicalSalesPath = "/areas?area=03-sprzedaz&view=overview";
export const canonicalOperationsPath = "/areas?area=04-operacje&view=tasks";
export const canonicalRelationshipsPath = "/areas?area=05-relacje&view=overview";
export const canonicalPeopleAgentsPath = "/areas?area=06-kadry&view=directory";
export const canonicalFinancePath = "/areas?area=07-finanse&view=overview";
export const canonicalAssetsPath = "/areas?area=08-zasoby&view=overview";
export const canonicalTechnologyPath = "/areas?area=09-technologia&view=overview";
export const canonicalLegalPath = "/areas?area=10-prawo&view=overview";
export const canonicalInnovationPath = "/areas?area=11-innowacje&view=overview";
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
        id: "strategy",
        href: canonicalStrategyPath,
        label: "01 Strategy",
        title: "01 Strategy",
        icon: "ph-target",
        private: true,
        canonicalSource: "docs/planning/v1-strategy-context-read-api-task-contract.md"
      },
      {
        id: "product-delivery",
        href: canonicalProductDeliveryPath,
        label: "02 Product & Delivery",
        title: "02 Product & Delivery",
        icon: "ph-package",
        private: true,
        canonicalSource: "docs/architecture/department-management-systems-v1-blueprint.md"
      },
      {
        id: "sales",
        href: canonicalSalesPath,
        label: "03 Sales",
        title: "03 Sales",
        icon: "ph-handshake",
        private: true,
        canonicalSource: "docs/planning/dms-03-sales-context-and-board-task-contract.md"
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
        id: "relationships",
        href: canonicalRelationshipsPath,
        label: "05 Relationships",
        title: "05 Relationships",
        icon: "ph-address-book",
        private: true,
        canonicalSource: "docs/planning/dms-next-004-relationships-context-and-board-task-contract.md"
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
        id: "finance",
        href: canonicalFinancePath,
        label: "07 Finance",
        title: "07 Finance",
        icon: "ph-bank",
        private: true,
        canonicalSource: "docs/planning/dms-finance-pricing-candidate-runtime-task-contract.md"
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
        id: "technology",
        href: canonicalTechnologyPath,
        label: "09 Technology",
        title: "09 Technology",
        icon: "ph-cpu",
        private: true,
        canonicalSource: "docs/architecture/department-management-systems-v1-blueprint.md"
      },
      {
        id: "legal",
        href: canonicalLegalPath,
        label: "10 Legal",
        title: "10 Legal",
        icon: "ph-scales",
        private: true,
        canonicalSource: "docs/architecture/department-management-systems-v1-blueprint.md"
      },
      {
        id: "innovation",
        href: canonicalInnovationPath,
        label: "11 Innovation",
        title: "11 Innovation",
        icon: "ph-lightbulb",
        private: true,
        canonicalSource: "docs/architecture/department-management-systems-v1-blueprint.md"
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
    if (area === "03-sprzedaz") {
      return appRoutes.find((route) => route.id === "sales");
    }
    if (area === "02-produkt") {
      return appRoutes.find((route) => route.id === "product-delivery");
    }
    if (area === "04-operacje") {
      return appRoutes.find((route) => route.id === "operations");
    }
    if (area === "01-strategia") {
      return appRoutes.find((route) => route.id === "strategy");
    }
    if (area === "05-relacje") {
      return appRoutes.find((route) => route.id === "relationships");
    }
    if (area === "06-kadry") {
      return appRoutes.find((route) => route.id === "people-agents");
    }
    if (area === "07-finanse") {
      return appRoutes.find((route) => route.id === "finance");
    }
    if (area === "08-zasoby") {
      return appRoutes.find((route) => route.id === "assets");
    }
    if (area === "09-technologia") {
      return appRoutes.find((route) => route.id === "technology");
    }
    if (area === "10-prawo") {
      return appRoutes.find((route) => route.id === "legal");
    }
    if (area === "11-innowacje") {
      return appRoutes.find((route) => route.id === "innovation");
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
    if (area === "01-strategia") {
      return canonicalStrategyPath;
    }
    if (area === "03-sprzedaz") {
      return canonicalSalesPath;
    }
    if (area === "02-produkt") {
      return canonicalProductDeliveryPath;
    }
    if (area === "04-operacje") {
      const view = params.get("view");
      return view === "calendar" ? "/areas?area=04-operacje&view=calendar" : canonicalOperationsPath;
    }
    if (area === "05-relacje") {
      return canonicalRelationshipsPath;
    }
    if (area === "06-kadry") {
      return canonicalPeopleAgentsPath;
    }
    if (area === "07-finanse") {
      return canonicalFinancePath;
    }
    if (area === "08-zasoby") {
      const view = params.get("view");
      return view === "files" ? "/areas?area=08-zasoby&view=files" : canonicalAssetsPath;
    }
    if (area === "09-technologia") {
      return canonicalTechnologyPath;
    }
    if (area === "10-prawo") {
      return canonicalLegalPath;
    }
    if (area === "11-innowacje") {
      return canonicalInnovationPath;
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

  if (route.id === "strategy") {
    return canonicalStrategyPath;
  }

  if (route.id === "sales") {
    return canonicalSalesPath;
  }
  if (route.id === "product-delivery") {
    return canonicalProductDeliveryPath;
  }

  if (route.id === "operations") {
    return canonicalOperationsPath;
  }

  if (route.id === "people-agents") {
    return canonicalPeopleAgentsPath;
  }
  if (route.id === "finance") {
    return canonicalFinancePath;
  }

  if (route.id === "relationships") {
    return canonicalRelationshipsPath;
  }

  if (route.id === "assets") {
    return canonicalAssetsPath;
  }
  if (route.id === "technology") {
    return canonicalTechnologyPath;
  }
  if (route.id === "legal") {
    return canonicalLegalPath;
  }
  if (route.id === "innovation") {
    return canonicalInnovationPath;
  }

  if (route.id === "management") {
    return canonicalManagementDepartmentsPath;
  }

  if (route.id === "account-settings" || route.id === "workspace-settings") {
    return route.href;
  }

  return canonicalGeneralDashboardPath;
}
