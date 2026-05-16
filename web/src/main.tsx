import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  canonicalGeneralDashboardPath,
  canonicalOperationsPath,
  resolveRouteMeta
} from "./app-route-registry";
import { isSignedIn } from "./api/auth-token";
import { AuthRoute } from "./features/auth/auth-pages";
import { AssetsRoute } from "./features/departments/assets-route";
import { GeneralDashboard } from "./features/departments/general-dashboard";
import { OperationsRoute } from "./features/departments/operations-route";
import { PublicHomeRoute } from "./features/public/public-home";
import { LanguageProvider } from "./i18n/i18n";
import "./styles.css";

function currentAreaKey() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("area");
  if (key === "04-operacje" || key === "08-zasoby" || key === "00-ogolny") {
    return key;
  }
  return "00-ogolny";
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const routeKey = window.location.pathname + window.location.search;
  if (!isSignedIn()) {
    window.sessionStorage.setItem("companycorePendingPrivatePath", routeKey);
    return <AuthRoute mode="login" />;
  }
  return <>{children}</>;
}

function App() {
  const pathname = window.location.pathname;
  const route = useMemo(() => resolveRouteMeta(pathname + window.location.search), [pathname]);

  if (pathname === "/") {
    return <PublicHomeRoute />;
  }

  if (pathname === "/auth/login") {
    return <AuthRoute mode="login" />;
  }

  if (pathname === "/auth/register") {
    return <AuthRoute mode="register" />;
  }

  if (pathname === "/dashboard" || pathname === "/react-dashboard" || (pathname === "/areas" && currentAreaKey() === "00-ogolny")) {
    if (pathname !== "/areas" || window.location.search !== "?area=00-ogolny&view=overview") {
      window.history.replaceState(null, "", canonicalGeneralDashboardPath);
    }
    return <PrivateRoute><GeneralDashboard /></PrivateRoute>;
  }

  if (pathname === "/operations" || (pathname === "/areas" && currentAreaKey() === "04-operacje")) {
    if (pathname !== "/areas") {
      window.history.replaceState(null, "", canonicalOperationsPath);
    }
    return <PrivateRoute><OperationsRoute /></PrivateRoute>;
  }

  if (pathname === "/areas" && currentAreaKey() === "08-zasoby") {
    return <PrivateRoute><AssetsRoute /></PrivateRoute>;
  }

  if (route?.private) {
    return <PrivateRoute><GeneralDashboard /></PrivateRoute>;
  }

  if (isSignedIn()) {
    window.history.replaceState(null, "", canonicalGeneralDashboardPath);
    return <PrivateRoute><GeneralDashboard /></PrivateRoute>;
  }

  return <AuthRoute mode="login" />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
