import {
  canonicalManagementDepartmentsPath,
  canonicalAssetsPath,
  canonicalGeneralDashboardPath,
  canonicalStrategyPath,
  canonicalProductDeliveryPath,
  canonicalSalesPath,
  canonicalOperationsPath,
  canonicalRelationshipsPath,
  canonicalPeopleAgentsPath,
  canonicalFinancePath,
  canonicalTechnologyPath,
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
      { key: "routing", labelKey: "views.00.routing", icon: "ph-git-branch", enabled: false },
      { key: "department-map", labelKey: "views.00.departmentMap", icon: "ph-squares-four", enabled: false }
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
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalStrategyPath, icon: "ph-gauge", enabled: true }]
  },
  {
    key: "02-produkt",
    labelKey: "departments.02",
    eyebrowKey: "departments.02.eyebrow",
    href: canonicalProductDeliveryPath,
    descriptionKey: "departments.02.description",
    icon: "ph-package",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalProductDeliveryPath, icon: "ph-gauge", enabled: true }]
  },
  {
    key: "03-sprzedaz",
    labelKey: "departments.03",
    eyebrowKey: "departments.03.eyebrow",
    href: canonicalSalesPath,
    descriptionKey: "departments.03.description",
    icon: "ph-handshake",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalSalesPath, icon: "ph-gauge", enabled: true }]
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
      { key: "pipelines", labelKey: "views.04.pipelines", icon: "ph-kanban", enabled: false },
      { key: "workload", labelKey: "views.04.workload", icon: "ph-users-three", enabled: false }
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
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalRelationshipsPath, icon: "ph-gauge", enabled: true }]
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
      { key: "sync", labelKey: "views.06.sync", icon: "ph-arrows-clockwise", enabled: false },
      { key: "competencies", labelKey: "views.06.competencies", icon: "ph-brain", enabled: false }
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
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalFinancePath, icon: "ph-gauge", enabled: true }]
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
      { key: "knowledge", labelKey: "views.08.knowledge", icon: "ph-book-open-text", enabled: false },
      { key: "graph", labelKey: "views.08.graph", icon: "ph-graph", enabled: false }
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
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalTechnologyPath, icon: "ph-gauge", enabled: true }]
  },
  {
    key: "10-prawo",
    labelKey: "departments.10",
    eyebrowKey: "departments.10.eyebrow",
    href: canonicalLegalPath,
    descriptionKey: "departments.10.description",
    icon: "ph-scales",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalLegalPath, icon: "ph-gauge", enabled: true }]
  },
  {
    key: "11-innowacje",
    labelKey: "departments.11",
    eyebrowKey: "departments.11.eyebrow",
    href: canonicalInnovationPath,
    descriptionKey: "departments.11.description",
    icon: "ph-lightbulb",
    enabled: true,
    views: [{ key: "overview", labelKey: "views.default.overview", href: canonicalInnovationPath, icon: "ph-gauge", enabled: true }]
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
      { key: "approvals", labelKey: "views.12.approvals", icon: "ph-seal-check", enabled: false },
      { key: "portfolio", labelKey: "views.12.portfolio", icon: "ph-briefcase", enabled: false },
      { key: "kpis", labelKey: "views.12.kpis", icon: "ph-chart-line-up", enabled: false },
      { key: "escalations", labelKey: "views.12.escalations", icon: "ph-warning-octagon", enabled: false },
      { key: "reviews", labelKey: "views.12.reviews", icon: "ph-clipboard-text", enabled: false }
    ]
  }
];

export const plannedDepartments: string[] = [];
