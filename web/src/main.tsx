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
import { InvitationPage } from "./features/auth/invitation-page";
import { PublicHomeRoute } from "./features/public/public-home";
import { LanguageProvider, useLanguage } from "./i18n/i18n";
import { CcRouteLoading } from "./components/cc-route-loading";
import { CcRouteBoundary } from "./components/cc-route-boundary";
import { clearRouteAssetRecovery, installRouteAssetRecovery } from "./route-recovery";
import { Shell } from "./layout/shell";
import { AppDocumentMetadata } from "./app-document-metadata";
import { DepartmentHealthStrip } from "./features/departments/department-health-strip";
import { DepartmentToolsPreview } from "./features/departments/department-tools-preview";
import type { CoreAreaKey } from "./types";
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
const AgentExecutionsRoute = lazy(() => import("./features/departments/agent-executions-route").then((module) => ({ default: module.AgentExecutionsRoute })));
const FinanceRoute = lazy(() => import("./features/departments/finance-route").then((module) => ({ default: module.FinanceRoute })));
const TechnologyRoute = lazy(() => import("./features/departments/technology-route").then((module) => ({ default: module.TechnologyRoute })));
const LegalRoute = lazy(() => import("./features/departments/legal-route").then((module) => ({ default: module.LegalRoute })));
const InnovationRoute = lazy(() => import("./features/departments/innovation-route").then((module) => ({ default: module.InnovationRoute })));
const ApplicationGraphRoute = lazy(() => import("./features/departments/application-graph-route").then((module) => ({ default: module.ApplicationGraphRoute })));
const ManagementRoute = lazy(() => import("./features/departments/management-route").then((module) => ({ default: module.ManagementRoute })));
const CompanyRecordsWorkbench = lazy(() => import("./features/departments/company-records-workbench").then((module) => ({ default: module.CompanyRecordsWorkbench })));
const DecisionsWorkbench = lazy(() => import("./features/departments/decisions-workbench").then((module) => ({ default: module.DecisionsWorkbench })));
const ProceduresWorkbench = lazy(() => import("./features/departments/procedures-workbench").then((module) => ({ default: module.ProceduresWorkbench })));
const GoalsWorkbench = lazy(() => import("./features/departments/goals-workbench").then((module) => ({ default: module.GoalsWorkbench })));
const CompanyObjectsWorkbench = lazy(() => import("./features/departments/company-objects-workbench").then((module) => ({ default: module.CompanyObjectsWorkbench })));
const CompanyGraphRoute = lazy(() => import("./features/departments/company-graph-route").then((module) => ({ default: module.CompanyGraphRoute })));
const EntityInspectorRoute = lazy(() => import("./features/departments/entity-inspector-route").then((module) => ({ default: module.EntityInspectorRoute })));
const ProjectsWorkbench = lazy(() => import("./features/departments/projects-workbench").then((module) => ({ default: module.ProjectsWorkbench })));
const ProjectWorkspaceRoute = lazy(() => import("./features/departments/project-workspace-route").then((module) => ({ default: module.ProjectWorkspaceRoute })));
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

const companyRecordViews: Record<string, { recordType: string; title: string }> = {
  "00-ogolny:company-updates": { recordType: "company_update", title: "Company updates" },
  "01-strategia:initiatives": { recordType: "initiative", title: "Strategic initiatives" },
  "02-produkt:requirements": { recordType: "requirement", title: "Product requirements" },
  "02-produkt:deliverables": { recordType: "deliverable", title: "Product deliverables" },
  "03-sprzedaz:offers": { recordType: "commercial_offer", title: "Commercial offers" },
  "04-operacje:issues": { recordType: "operational_issue", title: "Operational issues" },
  "04-operacje:events": { recordType: "operational_event", title: "Operational events" },
  "05-relacje:feedback": { recordType: "feedback", title: "Feedback and relationship evidence" },
  "06-kadry:competencies": { recordType: "competency", title: "Competencies" },
  "07-finanse:budgets": { recordType: "budget", title: "Budgets" },
  "07-finanse:invoices": { recordType: "invoice", title: "Invoices" },
  "08-zasoby:knowledge": { recordType: "knowledge_record", title: "Knowledge records" },
  "09-technologia:incidents": { recordType: "technical_incident", title: "Technical incidents" },
  "09-technologia:environments": { recordType: "environment", title: "Environments" },
  "10-prawo:contracts": { recordType: "contract", title: "Contracts" },
  "10-prawo:compliance": { recordType: "compliance_item", title: "Compliance register" },
  "11-innowacje:requirements": { recordType: "requirement", title: "Requirements" },
  "11-innowacje:experiments": { recordType: "experiment", title: "Experiments" },
  "12-zarzadzanie:portfolio": { recordType: "portfolio_item", title: "Company portfolio" },
  "12-zarzadzanie:escalations": { recordType: "escalation", title: "Escalations" },
  "12-zarzadzanie:reviews": { recordType: "management_review", title: "Management reviews" }
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const routeKey = window.location.pathname + window.location.search;
  if (!isSignedIn()) {
    window.sessionStorage.setItem("companycorePendingPrivatePath", routeKey);
    return <AuthRoute mode="login" />;
  }
  return <>{children}</>;
}

function PrivateAppRoute({ activeArea, children }: { activeArea?: string; children: React.ReactNode }) {
  const dashboardView = ["overview", "directory", "departments"].includes(currentAreaView()) || (activeArea === "04-operacje" && currentAreaView() === "tasks");
  const showToolPreview = Boolean(activeArea && activeArea !== "00-ogolny" && currentAreaView() === "overview");
  return <PrivateRoute><Shell activeArea={activeArea}><LazyRoute>{activeArea && dashboardView ? <DepartmentHealthStrip departmentKey={activeArea as ReturnType<typeof currentAreaKey>} /> : null}{children}{showToolPreview ? <DepartmentToolsPreview departmentKey={activeArea as CoreAreaKey} /> : null}</LazyRoute></Shell></PrivateRoute>;
}

function App() {
  const locationKey = useAppLocation();
  useClientNavigation();
  const pathname = window.location.pathname;
  const route = useMemo(() => resolveRouteMeta(pathname + window.location.search), [locationKey]);

  const metadata = <AppDocumentMetadata locationKey={locationKey} route={route} />;

  const areaKey = currentAreaKey();
  if (pathname === "/areas" && currentAreaView() === "company-graph") {
    return <>{metadata}<PrivateAppRoute activeArea={areaKey}><CompanyGraphRoute /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "entity") {
    return <>{metadata}<PrivateAppRoute activeArea={areaKey}><EntityInspectorRoute /></PrivateAppRoute></>;
  }
  const companyObjectType = ({ resources: "resource", risks: "risk", metrics: "metric", policies: "policy" } as const)[currentAreaView() as "resources" | "risks" | "metrics" | "policies"];
  if (pathname === "/areas" && companyObjectType) {
    return <>{metadata}<PrivateAppRoute activeArea={areaKey}><CompanyObjectsWorkbench departmentKey={areaKey} type={companyObjectType} /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "projects") {
    if (areaKey !== "11-innowacje") window.history.replaceState(null, "", `/areas?area=11-innowacje&view=projects&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="11-innowacje"><ProjectsWorkbench departmentKey={areaKey === "11-innowacje" ? undefined : areaKey} /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "project-workspace") {
    return <>{metadata}<PrivateAppRoute activeArea="11-innowacje"><ProjectWorkspaceRoute /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "directory" && areaKey !== "06-kadry") {
    window.history.replaceState(null, "", `/areas?area=06-kadry&view=directory&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="06-kadry"><PeopleAgentsRoute departmentKey={areaKey} /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "goals" && areaKey !== "01-strategia" && areaKey !== "09-technologia") {
    window.history.replaceState(null, "", `/areas?area=01-strategia&view=goals&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="01-strategia"><GoalsWorkbench canonical departmentKey="01-strategia" /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "tasks" && areaKey !== "04-operacje") {
    window.history.replaceState(null, "", `/areas?area=04-operacje&view=tasks&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="04-operacje"><OperationsRoute /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "decisions") {
    if (areaKey !== "01-strategia") window.history.replaceState(null, "", `/areas?area=01-strategia&view=decisions&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="01-strategia"><DecisionsWorkbench canonical departmentKey="01-strategia" /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "procedures" && areaKey !== "04-operacje") {
    window.history.replaceState(null, "", `/areas?area=04-operacje&view=procedures&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="04-operacje"><ProceduresWorkbench canonical={false} departmentKey={areaKey} /></PrivateAppRoute></>;
  }
  if (pathname === "/areas" && currentAreaView() === "files" && areaKey !== "08-zasoby") {
    window.history.replaceState(null, "", `/areas?area=08-zasoby&view=files&department=${encodeURIComponent(areaKey)}`);
    return <>{metadata}<PrivateAppRoute activeArea="08-zasoby"><AssetsRoute /></PrivateAppRoute></>;
  }
  const recordView = pathname === "/areas" ? companyRecordViews[`${areaKey}:${currentAreaView()}`] : null;
  if (recordView) {
    return <>{metadata}<PrivateAppRoute activeArea={areaKey}><CompanyRecordsWorkbench departmentKey={areaKey} recordType={recordView.recordType} title={recordView.title} /></PrivateAppRoute></>;
  }

  if (pathname === "/") {
    return <>{metadata}<PublicHomeRoute /></>;
  }

  if (pathname === "/auth/login") {
    return <>{metadata}<AuthRoute mode="login" /></>;
  }

  if (pathname === "/auth/register") {
    return <>{metadata}<AuthRoute mode="register" /></>;
  }
  const invitationMatch = pathname.match(/^\/auth\/invitations\/([^/]+)$/);
  if (invitationMatch) {
    return <>{metadata}<InvitationPage token={invitationMatch[1]} /></>;
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
    if (!["overview", "goals"].includes(currentAreaView())) {
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
    if (pathname === "/areas" && currentAreaView() === "executions") {
      return <>{metadata}<PrivateAppRoute activeArea="06-kadry"><AgentExecutionsRoute /></PrivateAppRoute></>;
    }
    if (pathname !== "/areas" || window.location.search !== "?area=06-kadry&view=directory") {
      window.history.replaceState(null, "", canonicalPeopleAgentsPath);
    }
    return <>{metadata}<PrivateAppRoute activeArea="06-kadry"><PeopleAgentsRoute departmentKey={new URLSearchParams(window.location.search).get("department") || undefined} /></PrivateAppRoute></>;
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
    if (!["overview", "goals", "integrations", "automations"].includes(view)) {
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
