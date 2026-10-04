import type { ApplicationOperation } from "./product-engineering-types";

export const operationLabels: Record<string, [string, string]> = {
  unverified: ["Niezweryfikowany", "Unverified"],
  problem_definition: ["Problem i użytkownik", "Problem and intended user"],
  accepted_requirements: ["Zaakceptowane wymagania", "Accepted requirements"],
  solution_design: ["Projekt rozwiązania", "Solution design"],
  implementation: ["Implementacja", "Implementation"],
  verification: ["Weryfikacja", "Verification"],
  product_readiness: ["Gotowość produktu", "Product readiness"],
  sale_readiness: ["Gotowość do sprzedaży", "Sale readiness"],
  operation_improvement: ["Działanie i doskonalenie", "Operation and improvement"],
  owner_accepted_baseline: ["Stan bazowy zaakceptowany przez właściciela", "Owner accepted baseline"],
  bounded_release_proof: ["Dowód wydania w określonym zakresie", "Release proof within the stated scope"],
  unmet: ["Niespełniona", "Unmet"], in_progress: ["W realizacji", "In progress"],
  met: ["Spełniona", "Met"], blocked: ["Zablokowana", "Blocked"],
  explicitly_deferred: ["Jawnie odroczona", "Explicitly deferred"],
  audit: ["Audyt", "Audit"], independent_review: ["Niezależna ocena", "Independent review"], release: ["Wydanie", "Release"],
  pending: ["Oczekuje", "Pending"], proposed: ["Propozycja", "Proposed"],
  accepted: ["Zaakceptowana", "Accepted"], deferred: ["Odroczona", "Deferred"],
  todo: ["Do wykonania", "To do"], done: ["Zakończone", "Done"],
  cancelled: ["Anulowane", "Cancelled"], needs_decision: ["Wymaga decyzji", "Decision required"],
  accountable_manager: ["Odpowiedzialny manager", "Accountable manager"],
  accountableManager: ["Odpowiedzialny manager", "Accountable manager"],
  executor: ["Wykonawca", "Executor"], manager: ["Manager", "Manager"],
  owner: ["Właściciel", "Owner"],
  takeover_baseline_missing: ["Brak zaakceptowanego stanu bazowego przejęcia", "Accepted takeover baseline missing"],
  takeover_baseline_stale: ["Stan bazowy przejęcia wymaga aktualizacji", "Takeover baseline is stale"],
  owner_decision_pending: ["Oczekuje na decyzję właściciela", "Owner decision pending"],
  owner_decision_deferred: ["Decyzja właściciela jest odroczona", "Owner decision deferred"],
  task_blocked: ["Zadanie jest zablokowane", "Task blocked"],
  task_needs_revalidation: ["Zadanie wymaga ponownej walidacji", "Task needs revalidation"],
  task_needs_context: ["Zadanie wymaga uzupełnienia kontekstu", "Task needs complete context"],
  native_execution_failed: ["Uruchomienie natywne nie powiodło się", "Native execution failed"],
  independent_review_rejected: ["Niezależna ocena odrzuciła wynik", "Independent review rejected the result"],
  evidence_unavailable: ["Dowody są niedostępne", "Evidence unavailable"],
  outcome_not_defined: ["Nie określono najbliższego wyniku", "Nearest outcome not defined"],
};

export function operationLabel(key: string, locale: "pl" | "en") {
  return operationLabels[key]?.[locale === "pl" ? 0 : 1] ?? key.replace(/_/g, " ");
}

export function portfolioOperation(operation?: ApplicationOperation): ApplicationOperation | null {
  return operation?.schemaVersion === "roost-application-operation-v1" ? operation : null;
}

export function portfolioRecordHref(href: string) {
  if (!href.startsWith("/areas?") || /[\\\u0000-\u0020]/.test(href)) return null;
  const url = new URL(href, "https://roost.invalid");
  return url.origin === "https://roost.invalid" && url.pathname === "/areas" ? `${url.pathname}${url.search}` : null;
}

export function portfolioTaskHref(taskId: string) {
  return /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(taskId)
    ? `/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(taskId)}` : null;
}
