import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { coreAreas } from "./core-area-data";
import { departmentLabel } from "./department-labels";

export function DepartmentScopeControl({ baseHref, value }: { baseHref: string; value?: CoreAreaKey | null }) {
  const { locale, t } = useLanguage();
  const departments = coreAreas.filter((area) => area.key !== "00-ogolny");

  return <label className="department-scope-control">
    <span>{locale === "pl" ? "Dział" : "Department"}</span>
    <CcSelect aria-label={locale === "pl" ? "Filtruj według działu" : "Filter by department"} onChange={(event) => {
      const next = event.target.value;
      window.location.assign(next ? `${baseHref}&department=${encodeURIComponent(next)}` : baseHref);
    }} value={value || ""}>
      <option value="">{locale === "pl" ? "Wszystkie dostępne" : "All accessible"}</option>
      {departments.map((area) => <option key={area.key} value={area.key}>{departmentLabel(area.key, t)}</option>)}
    </CcSelect>
  </label>;
}
