import React, { Suspense, lazy, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useAppLocation, useClientNavigation } from "./app-navigation";
import {
  canonicalGeneralDashboardPath,
  canonicalProductMapPath,
  canonicalStrategyPath,
  canonicalProductDeliveryPath,
  canonicalSalesPath,
  canonicalManagementDepartmentsPath,
  canonicalOperationsPath,
  canonicalRelationshipsPath,
  canonicalPeopleAgentsPath,
  canonicalFinancePath,
  canonicalTechnologyPath,
  canonicalLegalPath,
  canonicalInnovationPath,
  canonicalApplicationGraphPath,
  resolveRouteMeta
} from "./app-route-registry";
import { isSignedIn } from "./api/auth-token";
import { AuthRoute } from "./features/auth/auth-pages";
import { PublicHomeRoute } from "./features/public/public-home";
import { LanguageProvider, useLanguage } from "./i18n/i18n";
import { CcRouteLoading } from "./components/cc-route-loading";
import { CcRouteBoundary } from "./components/cc-route-boundary";
import { clearRouteAssetRecovery, installRouteAssetRecovery } from "./route-recovery";
import { Shell } from "./layout/shell";
import { AppDocumentMetadata } from "./app-document-metadata";
import "./styles.css";

const AssetsRoute = lazy(() => import("./features/departments/assets-route").then((module) => ({ default: module.AssetsRoute })));
const GeneralDashboard = lazy(() => import("./features/departments/general-dashboard").then((module) => ({ default: module.GeneralDashboard })));
const ProductMapRoute = lazy(() => import("./features/departments/product-map-route").then((module) => ({ default: module.ProductMapRoute })));
const StrategyRoute = lazy(() => import("./features/departments/strategy-route").then((module) => ({ default: module.StrategyRoute })));
const ProductDeliveryRoute = lazy(() => import("./features/departments/product-delivery-route").then((module) => ({ default: module.ProductDeliveryRoute })));
const SalesRoute = lazy(() => import("./features/departments/sales-route").then((module) => ({ default: module.SalesRoute })));
const OperationsRoute = lazy(() => import("./features/departments/operations-route").then((module) => ({ default: module.OperationsRoute })));
const RelationshipsRoute = lazy(() => import("./features/departments/relationships-route").then((module) => ({ default: module.RelationshipsRoute })));
const PeopleAgentsRoute = lazy(() => import("./features/departments/people-agents-route").then((module) => ({ default: module.PeopleAgentsRoute })));
const FinanceRoute = lazy(() => import("./features/departments/finance-route").then((module) => ({ default: module.FinanceRoute })));
const TechnologyRoute = lazy(() => import("./features/departments/technology-route").then((module) => ({ default: module.TechnologyRoute })));
const LegalRoute = lazy(() => import("./features/departments/legal-route").then((module) => ({ default: module.LegalRoute })));
const InnovationRoute = lazy(() => import("./features/departments/innovation-route").then((module) => ({ default: module.InnovationRoute })));
const ApplicationGraphRoute = lazy(() => import("./features/departments/application-graph-route").then((module) => ({ default: module.ApplicationGraphRoute })));
const ManagementRoute = lazy(() => import("./features/departments/management-route").then((module) => ({ default: module.ManagementRoute })));
const AccountSettingsRoute = lazy(() => import("./features/settings/settings-routes").then((module) => ({ default: module.AccountSettingsRoute })));
const WorkspaceSettingsRoute = lazy(() => import("./features/settings/settings-routes").then((module) => ({ default: module.WorkspaceSettingsRoute })));

function LazyRoute({ children }: { children: React.ReactNode }) {
  const locationKey = useAppLocation();
  const { t } = useLanguage();

  return (
    <CcRouteBoundary detail={t("route.error.detail")} key={locationKey} retryLabel={t("route.error.retry")} title={t("route.error.title")}>
      <Suspense fallback={<CcRouteLoading />}>
        <RouteReady />
        {children}
      </Suspense>
    </CcRouteBoundary>
  );
}

function RouteReady() {
  useEffect(() => clearRouteAssetRecovery(), []);
  return null;
}

function currentAreaKey() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("area");
  if (key === "01-strategia" || key === "02-produkt" || key === "03-sprzedaz" || key === "04-operacje" || key === "05-relacje" || key === "06-kadry" || key === "07-finanse" || key === "08-zasoby" || key === "09-technologia" || key === "10-prawo" || key === "11-innowacje" || key === "12-zarzadzanie" || key === "00-ogolny") {
    return key;
  }
  return "00-ogolny";
}

function currentAreaView() {
  return new URLSearchParams(window.location.search).get("view") || "overview";
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const routeKey = window.location.pathname + window.location.search;
  if (!isSignedIn()) {
    window.sessionStorage.setItem("companycorePendingPrivatePath", routeKey);
    return <AuthRoute mode="login" />;
  }
  return <>{children}</>;
}

function PrivateAppRoute({ activeArea, children }: { activeArea?: string; children: React.ReactNode }) {
  return <PrivateRoute><Shell activeArea={activeArea}><LazyRoute>{children}</LazyRoute></Shell></PrivateRoute>;
}

function App() {
  const locationKey = useAppLocation();
  useClientNavigation();
  const pathname = window.location.pathname;
  const route = useMemo(() => resolveRouteMeta(pathname + window.location.search), [locationKey]);

  const metadata = <AppDocumentMetadata locationKey={locationKey} route={route} />;

  if (pathname === "/") {
    return <>{metadata}<PublicHomeRoute /></>;
  }

  if (pathname === "/auth/login") {
    return <>{metadata}<AuthRoute mode="login" /></>;
  }

  if (pathname === "/auth/register") {
    return <>{metadata}<AuthRoute mode="register" /></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "00-ogolny" && currentAreaView() === "product-map") {
    if (window.location.search !== "?area=00-ogolny&view=product-map") {
      window.history.replaceState(null, "", canonicalProductMapPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="00-ogolny"><ProductMapRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/dashboard" || pathname === "/react-dashboard" || (pathname === "/areas" && currentAreaKey() === "00-ogolny")) {
    if (pathname !== "/areas" || window.location.search !== "?area=00-ogolny&view=overview") {
      window.history.replaceState(null, "", canonicalGeneralDashboardPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="00-ogolny"><GeneralDashboard /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "01-strategia") {
    if (window.location.search !== "?area=01-strategia&view=overview") {
      window.history.replaceState(null, "", canonicalStrategyPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="01-strategia"><StrategyRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "02-produkt") {
    if (window.location.search !== "?area=02-produkt&view=overview") {
      window.history.replaceState(null, "", canonicalProductDeliveryPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="02-produkt"><ProductDeliveryRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "03-sprzedaz") {
    if (window.location.search !== "?area=03-sprzedaz&view=overview") {
      window.history.replaceState(null, "", canonicalSalesPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="03-sprzedaz"><SalesRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/operations" || (pathname === "/areas" && currentAreaKey() === "04-operacje")) {
    if (pathname !== "/areas") {
      window.history.replaceState(null, "", canonicalOperationsPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="04-operacje"><OperationsRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "05-relacje") {
    if (window.location.search !== "?area=05-relacje&view=overview") {
      window.history.replaceState(null, "", canonicalRelationshipsPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="05-relacje"><RelationshipsRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/people-agents" || pathname === "/workforce" || (pathname === "/areas" && currentAreaKey() === "06-kadry")) {
    if (pathname !== "/areas" || window.location.search !== "?area=06-kadry&view=directory") {
      window.history.replaceState(null, "", canonicalPeopleAgentsPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="06-kadry"><PeopleAgentsRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "07-finanse") {
    if (window.location.search !== "?area=07-finanse&view=overview") {
      window.history.replaceState(null, "", canonicalFinancePath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="07-finanse"><FinanceRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "08-zasoby") {
    return <>{metadata}<PrivateAppRoute activeArea="08-zasoby"><AssetsRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "09-technologia") {
    const view = new URLSearchParams(window.location.search).get("view") || "overview";
    if (!["overview", "integrations", "automations"].includes(view)) {
      window.history.replaceState(null, "", canonicalTechnologyPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="09-technologia"><TechnologyRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "10-prawo") {
    if (window.location.search !== "?area=10-prawo&view=overview") {
      window.history.replaceState(null, "", canonicalLegalPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="10-prawo"><LegalRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "11-innowacje") {
    if (currentAreaView() === "application-graph") {
      if (window.location.search !== "?area=11-innowacje&view=application-graph") {
        window.history.replaceState(null, "", canonicalApplicationGraphPath);
      }
      return <>{metadata}<PrivateAppRoute activeArea="11-innowacje"><ApplicationGraphRoute /></PrivateAppRoute></>;
    }
    if (window.location.search !== "?area=11-innowacje&view=overview") {
      window.history.replaceState(null, "", canonicalInnovationPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="11-innowacje"><InnovationRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/areas" && currentAreaKey() === "12-zarzadzanie") {
    if (window.location.search !== "?area=12-zarzadzanie&view=departments") {
      window.history.replaceState(null, "", canonicalManagementDepartmentsPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="12-zarzadzanie"><ManagementRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/account/settings") {
    return <>{metadata}<PrivateAppRoute><AccountSettingsRoute /></PrivateAppRoute></>;
  }

  if (pathname === "/workspace/settings") {
    return <>{metadata}<PrivateAppRoute><WorkspaceSettingsRoute /></PrivateAppRoute></>;
  }

  if (route?.private) {
    return <>{metadata}<PrivateAppRoute activeArea="00-ogolny"><GeneralDashboard /></PrivateAppRoute></>;
  }

  if (isSignedIn()) {
    window.history.replaceState(null, "", canonicalGeneralDashboardPath);
    return <>{metadata}<PrivateAppRoute activeArea="00-ogolny"><GeneralDashboard /></PrivateAppRoute></>;
  }

  return <>{metadata}<AuthRoute mode="login" /></>;
}

installRouteAssetRecovery();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
