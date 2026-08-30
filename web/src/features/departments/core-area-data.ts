import {
  canonicalManagementDepartmentsPath,
  canonicalAssetsPath,
  canonicalGeneralDashboardPath,
  canonicalProductMapPath,
  canonicalStrategyPath,
  canonicalStrategyGoalsPath,
  canonicalProductDeliveryPath,
  canonicalSalesPath,
  canonicalOperationsPath,
  canonicalRelationshipsPath,
  canonicalPeopleAgentsPath,
  canonicalFinancePath,
  canonicalTechnologyPath,
  canonicalTechnologyGoalsPath,
  canonicalTechnologyIntegrationsPath,
  canonicalTechnologyAutomationsPath,
  canonicalLegalPath,
  canonicalInnovationPath
} from "../../app-route-registry";
import { CoreArea } from "../../types";

export const coreAreas: CoreArea[] = [
  {
    key: "00-ogolny",
    labelKey: "areas.00.label",
    eyebrowKey: "areas.00.eyebrow",
    href: canonicalGeneralDashboardPath,
    descriptionKey: "areas.00.description",
    icon: "ph-map-trifold",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.00.overview", href: canonicalGeneralDashboardPath, icon: "ph-gauge", enabled: true },
      { key: "company-updates", labelKey: "views.00.routing", href: "/areas?area=00-ogolny&view=company-updates", icon: "ph-broadcast", enabled: true },
      { key: "product-map", labelKey: "views.00.productMap", href: canonicalProductMapPath, icon: "ph-map-trifold", enabled: true }
    ]
  },
  {
    key: "01-strategia",
    labelKey: "departments.01",
    eyebrowKey: "departments.01.eyebrow",
    href: canonicalStrategyPath,
    descriptionKey: "departments.01.description",
    icon: "ph-target",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.default.overview", href: canonicalStrategyPath, icon: "ph-gauge", enabled: true },
      { key: "goals", labelKey: "views.shared.goals", href: canonicalStrategyGoalsPath, icon: "ph-target", enabled: true },
      { key: "initiatives", labelKey: "views.12.portfolio", href: "/areas?area=01-strategia&view=initiatives", icon: "ph-flag", enabled: true },
      { key: "decisions", labelKey: "views.12.approvals", href: "/areas?area=01-strategia&view=decisions", icon: "ph-signpost", enabled: true }
    ]
  },
  {
    key: "02-produkt",
    labelKey: "departments.02",
    eyebrowKey: "departments.02.eyebrow",
    href: canonicalProductDeliveryPath,
    descriptionKey: "departments.02.description",
    icon: "ph-package",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.default.overview", href: canonicalProductDeliveryPath, icon: "ph-gauge", enabled: true },
      { key: "requirements", labelKey: "views.11.requirements", href: "/areas?area=02-produkt&view=requirements", icon: "ph-list-magnifying-glass", enabled: true },
      { key: "deliverables", labelKey: "views.04.tasks", href: "/areas?area=02-produkt&view=deliverables", icon: "ph-package", enabled: true }
    ]
  },
  {
    key: "03-sprzedaz",
    labelKey: "departments.03",
    eyebrowKey: "departments.03.eyebrow",
    href: canonicalSalesPath,
    descriptionKey: "departments.03.description",
    icon: "ph-handshake",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalSalesPath, icon: "ph-gauge", enabled: true }, { key: "offers", labelKey: "views.12.portfolio", href: "/areas?area=03-sprzedaz&view=offers", icon: "ph-file-text", enabled: true }]
  },
  {
    key: "04-operacje",
    labelKey: "areas.04.label",
    eyebrowKey: "areas.04.eyebrow",
    href: canonicalOperationsPath,
    descriptionKey: "areas.04.description",
    icon: "ph-list-checks",
    enabled: true,
    views: [
      { key: "tasks", labelKey: "views.04.tasks", href: canonicalOperationsPath, icon: "ph-list-checks", enabled: true },
      { key: "calendar", labelKey: "views.04.calendar", href: "/areas?area=04-operacje&view=calendar", icon: "ph-calendar-blank", enabled: true },
      { key: "procedures", labelKey: "views.04.procedures", href: "/areas?area=04-operacje&view=procedures", icon: "ph-list-numbers", enabled: true },
      { key: "issues", labelKey: "views.12.escalations", href: "/areas?area=04-operacje&view=issues", icon: "ph-warning-circle", enabled: true },
      { key: "events", labelKey: "views.12.reviews", href: "/areas?area=04-operacje&view=events", icon: "ph-calendar-dots", enabled: true }
    ]
  },
  {
    key: "05-relacje",
    labelKey: "departments.05",
    eyebrowKey: "departments.05.eyebrow",
    href: canonicalRelationshipsPath,
    descriptionKey: "departments.05.description",
    icon: "ph-address-book",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalRelationshipsPath, icon: "ph-gauge", enabled: true }, { key: "feedback", labelKey: "views.12.reviews", href: "/areas?area=05-relacje&view=feedback", icon: "ph-chat-centered-text", enabled: true }]
  },
  {
    key: "06-kadry",
    labelKey: "departments.06",
    eyebrowKey: "departments.06.eyebrow",
    href: canonicalPeopleAgentsPath,
    descriptionKey: "departments.06.description",
    icon: "ph-users-three",
    enabled: true,
    views: [
      { key: "directory", labelKey: "views.06.directory", href: canonicalPeopleAgentsPath, icon: "ph-users-three", enabled: true },
      { key: "competencies", labelKey: "views.06.competencies", href: "/areas?area=06-kadry&view=competencies", icon: "ph-brain", enabled: true }
    ]
  },
  {
    key: "07-finanse",
    labelKey: "departments.07",
    eyebrowKey: "departments.07.eyebrow",
    href: canonicalFinancePath,
    descriptionKey: "departments.07.description",
    icon: "ph-bank",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalFinancePath, icon: "ph-gauge", enabled: true }, { key: "budgets", labelKey: "views.12.kpis", href: "/areas?area=07-finanse&view=budgets", icon: "ph-chart-pie-slice", enabled: true }, { key: "invoices", labelKey: "views.12.reviews", href: "/areas?area=07-finanse&view=invoices", icon: "ph-receipt", enabled: true }]
  },
  {
    key: "08-zasoby",
    labelKey: "areas.08.label",
    eyebrowKey: "areas.08.eyebrow",
    href: canonicalAssetsPath,
    descriptionKey: "areas.08.description",
    icon: "ph-folder-open",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.08.overview", href: canonicalAssetsPath, icon: "ph-gauge", enabled: true },
      { key: "files", labelKey: "views.08.files", href: "/areas?area=08-zasoby&view=files", icon: "ph-folders", enabled: true },
      { key: "knowledge", labelKey: "views.08.knowledge", href: "/areas?area=08-zasoby&view=knowledge", icon: "ph-book-open-text", enabled: true }
    ]
  },
  {
    key: "09-technologia",
    labelKey: "departments.09",
    eyebrowKey: "departments.09.eyebrow",
    href: canonicalTechnologyPath,
    descriptionKey: "departments.09.description",
    icon: "ph-cpu",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.09.overview", href: canonicalTechnologyPath, icon: "ph-gauge", enabled: true },
      { key: "goals", labelKey: "views.shared.goals", href: canonicalTechnologyGoalsPath, icon: "ph-target", enabled: true },
      { key: "integrations", labelKey: "views.09.integrations", href: canonicalTechnologyIntegrationsPath, icon: "ph-plugs-connected", enabled: true },
      { key: "automations", labelKey: "views.09.automations", href: canonicalTechnologyAutomationsPath, icon: "ph-lightning", enabled: true },
      { key: "incidents", labelKey: "views.12.escalations", href: "/areas?area=09-technologia&view=incidents", icon: "ph-siren", enabled: true },
      { key: "environments", labelKey: "views.08.overview", href: "/areas?area=09-technologia&view=environments", icon: "ph-cloud", enabled: true }
    ]
  },
  {
    key: "10-prawo",
    labelKey: "departments.10",
    eyebrowKey: "departments.10.eyebrow",
    href: canonicalLegalPath,
    descriptionKey: "departments.10.description",
    icon: "ph-scales",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalLegalPath, icon: "ph-gauge", enabled: true }, { key: "contracts", labelKey: "views.12.approvals", href: "/areas?area=10-prawo&view=contracts", icon: "ph-file-lock", enabled: true }, { key: "compliance", labelKey: "views.12.reviews", href: "/areas?area=10-prawo&view=compliance", icon: "ph-shield-check", enabled: true }]
  },
  {
    key: "11-innowacje",
    labelKey: "departments.11",
    eyebrowKey: "departments.11.eyebrow",
    href: canonicalInnovationPath,
    descriptionKey: "departments.11.description",
    icon: "ph-lightbulb",
    enabled: true,
    views: [
      { key: "overview", labelKey: "views.default.overview", href: canonicalInnovationPath, icon: "ph-gauge", enabled: true },
      { key: "application-graph", labelKey: "views.11.applicationGraph", href: "/areas?area=11-innowacje&view=application-graph", icon: "ph-graph", enabled: true },
      { key: "requirements", labelKey: "views.11.requirements", href: "/areas?area=11-innowacje&view=requirements", icon: "ph-list-magnifying-glass", enabled: true },
      { key: "experiments", labelKey: "views.12.reviews", href: "/areas?area=11-innowacje&view=experiments", icon: "ph-flask", enabled: true }
    ]
  },
  {
    key: "12-zarzadzanie",
    labelKey: "departments.12",
    eyebrowKey: "departments.12.eyebrow",
    href: canonicalManagementDepartmentsPath,
    descriptionKey: "departments.12.description",
    icon: "ph-chart-line-up",
    enabled: true,
    views: [
      { key: "departments", labelKey: "views.12.departments", href: canonicalManagementDepartmentsPath, icon: "ph-buildings", enabled: true },
      { key: "portfolio", labelKey: "views.12.portfolio", href: "/areas?area=12-zarzadzanie&view=portfolio", icon: "ph-briefcase", enabled: true },
      { key: "escalations", labelKey: "views.12.escalations", href: "/areas?area=12-zarzadzanie&view=escalations", icon: "ph-warning-octagon", enabled: true },
      { key: "reviews", labelKey: "views.12.reviews", href: "/areas?area=12-zarzadzanie&view=reviews", icon: "ph-clipboard-text", enabled: true }
    ]
  }
];

export const plannedDepartments: string[] = [];
