import { CoreAreaKey } from "../../types";
import { MessageKey, Translate } from "../../i18n/i18n";

export function departmentLabelKey(key: CoreAreaKey): MessageKey {
  if (key === "00-ogolny") return "areas.00.label";
  if (key === "04-operacje") return "areas.04.label";
  if (key === "08-zasoby") return "areas.08.label";
  const number = key.slice(0, 2);
  return `departments.${number}` as MessageKey;
}

export function departmentLabel(key: CoreAreaKey, t: Translate) {
  return t(departmentLabelKey(key));
}

export function backendAreaToDepartmentKey(value?: string | null): CoreAreaKey | null {
  if (!value) return null;
  const map: Record<string, CoreAreaKey> = {
    "main-general": "00-ogolny",
    "strategy-governance": "01-strategia",
    "projects-delivery": "02-produkt",
    "sales-crm": "03-sprzedaz",
    "operations-administration": "04-operacje",
    "relationships-client-success": "05-relacje",
    "people-roles": "06-kadry",
    "finance-billing": "07-finanse",
    "assets-storage": "08-zasoby",
    "automations-integrations": "09-technologia",
    "ai-agents-observability": "11-innowacje",
    "knowledge-decisions": "12-zarzadzanie"
  };
  return map[value] ?? null;
}
