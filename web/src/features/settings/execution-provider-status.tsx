import { useLanguage } from "../../i18n/i18n";

export type ProviderReport = {
  kind: "direct_codex" | "hermes_codex" | "unknown"; pinnedVersion: string | null;
  compatibility: "reference" | "unproven"; blockers: string[];
};
export type ProviderRegistry = { providers: Array<{ kind: string; version: string }> };
const labels: Record<string, [string, string]> = {
  execution_provider_unknown: ["Nieznany provider", "Unknown provider"],
  hermes_disabled: ["Hermes wyłączony w konfiguracji", "Hermes disabled in configuration"],
  hermes_identity_invalid: ["Niepotwierdzone oficjalne źródło", "Official source not confirmed"],
  hermes_pin_invalid: ["Wersja lub commit nie pasuje do kontraktu", "Version or commit does not match the contract"],
  hermes_windows_required: ["Wymagany host Windows", "Windows host required"],
  hermes_executable_invalid: ["Nieprawidłowy plik wykonywalny", "Invalid executable"],
  hermes_executable_missing: ["Brak lokalnego pliku wykonywalnego", "Local executable missing"],
  hermes_mcp_policy_invalid: ["Niekompletne ograniczenia MCP", "MCP restrictions incomplete"],
  hermes_authority_policy_invalid: ["Niekompletne granice uprawnień", "Authority boundaries incomplete"],
  hermes_compatibility_unproven: ["Zgodność Hermesa z Roost niepotwierdzona", "Hermes compatibility with Roost unproven"]
};
export function ExecutionProviderStatus({ report, registry }: { report?: ProviderReport; registry?: ProviderRegistry }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const hermes = registry?.providers.find(provider => provider.kind === "hermes_codex");
  const blockers = [...new Set([...(report?.blockers ?? []), ...(hermes ? ["hermes_compatibility_unproven"] : [])])].filter(code => code in labels);
  return <div className="px-4 py-3 border-t border-base-300" data-testid="execution-provider-status">
    <dl className="roost-connection-facts">
      <div><dt>{pl ? "Provider hosta" : "Host provider"}</dt><dd>{report ? report.kind === "direct_codex" ? "Direct Codex" : report.kind === "hermes_codex" ? "Hermes → Codex" : (pl ? "Nieznany" : "Unknown") : "—"}</dd></div>
      <div><dt>{pl ? "Wersja referencyjna" : "Reference version"}</dt><dd>{report?.pinnedVersion ?? "—"} · {pl ? "instalacja niezweryfikowana" : "installation unverified"}</dd></div>
      <div><dt>{pl ? "Wymagany przed pilotażem" : "Required before pilot"}</dt><dd>Hermes → Codex{hermes ? ` · ${hermes.version}` : ""} · {pl ? "jeszcze niegotowy" : "not ready yet"}</dd></div>
    </dl>
    <p className="text-sm mt-2">{pl ? "Następny krok: prywatny test zgodności z Roost MCP w trybie odczytu. Uruchamianie zadań wymaga osobnego dopuszczenia." : "Next: a private read-only compatibility test through Roost MCP. Task execution requires separate admission."}</p>
    {blockers.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer focus-visible:outline focus-visible:outline-2">{pl ? "Szczegóły gotowości providera" : "Provider readiness details"}</summary>
      <ul className="mt-2 space-y-2">{blockers.map(code => <li key={code}>{labels[code]![pl ? 0 : 1]} <code className="block text-xs break-all">{code}</code></li>)}</ul>
    </details> : null}
  </div>;
}
