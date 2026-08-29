import type { Locale } from "./locales";

const polishBusinessValues: Record<string, string> = {
  active: "Aktywny",
  autonomous: "Autonomiczny",
  archived: "Zarchiwizowany",
  blocked: "Zablokowany",
  candidate: "Kandydat",
  complete: "Ukończony",
  critical: "Krytyczny",
  disabled: "Wyłączony",
  discovery: "Odkrywanie",
  development: "Rozwój",
  draft: "Wersja robocza",
  failed: "Niepowodzenie",
  high: "Wysoki",
  idea: "Pomysł",
  inactive: "Nieaktywny",
  "launch preparation": "Przygotowanie do startu",
  low: "Niski",
  medium: "Średni",
  manual: "Ręczny",
  missing: "Brak",
  mvp: "MVP",
  negotiation: "Negocjacje",
  "not applicable": "Nie dotyczy",
  "not started": "Nierozpoczęty",
  optional: "Opcjonalny",
  partial: "Częściowy",
  paused: "Wstrzymany",
  productization: "Produktyzacja",
  productized: "Gotowy produkt",
  product: "Produkt",
  service: "Usługa",
  "semi autonomous": "Półautonomiczny",
  "hybrid product + service": "Produkt i usługa",
  proposal: "Oferta",
  prototype: "Prototyp",
  qualified: "Zakwalifikowany",
  ready: "Gotowy",
  recommended: "Zalecany",
  required: "Wymagany",
  retired: "Wycofany",
  "to do": "Do zrobienia",
  todo: "Do zrobienia",
  unknown: "Nieznany",
  validation: "Walidacja",
  verified: "Zweryfikowany",
  "blocked action": "Zablokowana akcja",
  "needs owner decision": "Wymaga decyzji właściciela",
  "needs source": "Wymaga źródła"
};

function activeLocale(): Locale {
  return typeof document !== "undefined" && document.documentElement.lang === "pl" ? "pl" : "en";
}

export function formatBusinessValue(value?: string | null, fallback = "Unknown", locale = activeLocale()) {
  const source = value?.trim() || fallback;
  const normalized = source.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (locale === "pl") {
    const translated = polishBusinessValues[normalized.toLowerCase()];
    if (translated) return translated;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
