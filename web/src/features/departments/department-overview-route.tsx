import { CcPageHeader } from "../../components/cc-page-header";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { coreAreas } from "./core-area-data";
import { departmentLabel } from "./department-labels";

export function DepartmentOverviewRoute({ departmentKey }: { departmentKey: CoreAreaKey }) {
  const { locale, t } = useLanguage();
  const area = coreAreas.find((candidate) => candidate.key === departmentKey);
  const polish = locale === "pl";
  return <CcPageHeader
    description={area ? t(area.descriptionKey) : polish ? "Stan działu i przypisane do niego rekordy ze wspólnych modułów firmy." : "Department state and records assigned through shared company modules."}
    eyebrow={departmentLabel(departmentKey, t)}
    title={polish ? "Przegląd działu" : "Department overview"}
  />;
}
