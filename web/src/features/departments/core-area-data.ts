import {
  canonicalAssetsPath,
  canonicalGeneralDashboardPath,
  canonicalOperationsPath
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
    descriptionKey: "departments.01.description",
    icon: "ph-target",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "02-produkt",
    labelKey: "departments.02",
    eyebrowKey: "departments.02.eyebrow",
    descriptionKey: "departments.02.description",
    icon: "ph-package",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "03-sprzedaz",
    labelKey: "departments.03",
    eyebrowKey: "departments.03.eyebrow",
    descriptionKey: "departments.03.description",
    icon: "ph-handshake",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
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
    descriptionKey: "departments.05.description",
    icon: "ph-address-book",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "06-kadry",
    labelKey: "departments.06",
    eyebrowKey: "departments.06.eyebrow",
    descriptionKey: "departments.06.description",
    icon: "ph-users-three",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "07-finanse",
    labelKey: "departments.07",
    eyebrowKey: "departments.07.eyebrow",
    descriptionKey: "departments.07.description",
    icon: "ph-bank",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
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
      { key: "files", labelKey: "views.08.files", icon: "ph-folders", enabled: false },
      { key: "knowledge", labelKey: "views.08.knowledge", icon: "ph-book-open-text", enabled: false },
      { key: "graph", labelKey: "views.08.graph", icon: "ph-graph", enabled: false }
    ]
  },
  {
    key: "09-technologia",
    labelKey: "departments.09",
    eyebrowKey: "departments.09.eyebrow",
    descriptionKey: "departments.09.description",
    icon: "ph-cpu",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "10-prawo",
    labelKey: "departments.10",
    eyebrowKey: "departments.10.eyebrow",
    descriptionKey: "departments.10.description",
    icon: "ph-scales",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "11-innowacje",
    labelKey: "departments.11",
    eyebrowKey: "departments.11.eyebrow",
    descriptionKey: "departments.11.description",
    icon: "ph-lightbulb",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  },
  {
    key: "12-zarzadzanie",
    labelKey: "departments.12",
    eyebrowKey: "departments.12.eyebrow",
    descriptionKey: "departments.12.description",
    icon: "ph-chart-line-up",
    enabled: false,
    views: [{ key: "overview", labelKey: "views.default.overview", icon: "ph-gauge", enabled: false }]
  }
];

export const plannedDepartments = [
  "departments.01",
  "departments.02",
  "departments.03",
  "departments.05",
  "departments.06",
  "departments.07",
  "departments.09",
  "departments.10",
  "departments.11",
  "departments.12"
] as const;
