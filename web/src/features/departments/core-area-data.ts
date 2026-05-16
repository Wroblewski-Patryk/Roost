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
    icon: "ph-map-trifold"
  },
  {
    key: "04-operacje",
    labelKey: "areas.04.label",
    eyebrowKey: "areas.04.eyebrow",
    href: canonicalOperationsPath,
    descriptionKey: "areas.04.description",
    icon: "ph-list-checks"
  },
  {
    key: "08-zasoby",
    labelKey: "areas.08.label",
    eyebrowKey: "areas.08.eyebrow",
    href: canonicalAssetsPath,
    descriptionKey: "areas.08.description",
    icon: "ph-folder-open"
  }
];

export const plannedDepartments = [
  "01 Strategy",
  "02 Product",
  "03 Sales",
  "05 Relationships",
  "06 People / Agents",
  "07 Finance",
  "09 Technology",
  "10 Legal",
  "11 Innovation",
  "12 Management"
];
