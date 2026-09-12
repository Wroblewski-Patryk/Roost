import { useLanguage } from "../../i18n/i18n";

export type ProviderReport = {
  kind: "direct_codex" | "hermes_codex" | "unknown"; pinnedVersion: string | null;
  compatibility: "reference" | "unproven"; blockers: string[];
  brokerContractVerified?: boolean;
  installation?: { status: "verified" | "unverified"; version: string | null; fingerprint: string | null; checkedAt: string | null; signature: "unsigned" | null };
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
  hermes_attestation_missing: ["Brak poświadczenia instalacji", "Installation attestation missing"],
  hermes_attestation_invalid: ["Nieprawidłowe poświadczenie instalacji", "Invalid installation attestation"],
  hermes_integrity_mismatch: ["Pliki instalacji zmieniły się", "Installation files changed"],
  hermes_probe_unsafe: ["Odczyt wersji wymaga katalogu bez prawa zapisu", "Version probe requires a directory without write permission"],
  hermes_version_failed: ["Nie udało się odczytać wersji", "Version probe failed"],
  hermes_version_mismatch: ["Zainstalowana wersja nie pasuje do kontraktu", "Installed version does not match the contract"],
  hermes_version_timeout: ["Przekroczono czas odczytu wersji", "Version probe timed out"],
  hermes_probe_stop_failed: ["Nie potwierdzono zatrzymania diagnostyki", "Diagnostic process stop not confirmed"],
  hermes_native_tools_isolation_unproven: ["Izolacja wbudowanych narzędzi Hermesa niepotwierdzona", "Hermes built-in tool isolation unproven"],
  hermes_output_cost_budget_unproven: ["Egzekwowanie budżetu wyjścia i kosztu niepotwierdzone", "Output and cost budget enforcement unproven"],
  hermes_stop_recovery_unproven: ["Zatrzymanie i odzyskiwanie sesji Hermesa niepotwierdzone", "Hermes session stop and recovery unproven"],
  hermes_mcp_policy_invalid: ["Niekompletne ograniczenia MCP", "MCP restrictions incomplete"],
  hermes_authority_policy_invalid: ["Niekompletne granice uprawnień", "Authority boundaries incomplete"],
  hermes_compatibility_unproven: ["Zgodność Hermesa z Roost niepotwierdzona", "Hermes compatibility with Roost unproven"]
};
export function ExecutionProviderStatus({ report, registry }: { report?: ProviderReport; registry?: ProviderRegistry }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const hermes = registry?.providers.find(provider => provider.kind === "hermes_codex");
  const verified = report?.kind === "hermes_codex" && report.installation?.status === "verified";
  const blockers = [...new Set([...(report?.blockers ?? []), ...(hermes ? ["hermes_compatibility_unproven"] : [])])].filter(code => code in labels);
  return <div className="px-4 py-3 border-t border-base-300" data-testid="execution-provider-status">
    <dl className="roost-connection-facts">
      <div><dt>{pl ? "Provider hosta" : "Host provider"}</dt><dd>{report ? report.kind === "direct_codex" ? "Direct Codex" : report.kind === "hermes_codex" ? "Hermes → Codex" : (pl ? "Nieznany" : "Unknown") : "—"}</dd></div>
      <div><dt>{pl ? "Wersja referencyjna" : "Reference version"}</dt><dd>{report?.pinnedVersion ?? "—"}</dd></div>
      <div><dt>{pl ? "Instalacja" : "Installation"}</dt><dd>{verified ? `${report.installation?.version} · ${pl ? "zweryfikowana przez Worker" : "verified by Worker"}` : (pl ? "niezweryfikowana" : "unverified")}</dd></div>
      {report?.kind === "hermes_codex" ? <div><dt>{pl ? "Broker odczytu MCP" : "Read-only MCP broker"}</dt><dd>{report.brokerContractVerified ? (pl ? "kontrakt przetestowany bez modelu" : "contract tested without a model") : (pl ? "kontrakt niezweryfikowany" : "contract unverified")}</dd></div> : null}
      <div><dt>{pl ? "Wymagany przed pilotażem" : "Required before pilot"}</dt><dd>Hermes → Codex{hermes ? ` · ${hermes.version}` : ""} · {pl ? "jeszcze niegotowy" : "not ready yet"}</dd></div>
    </dl>
    <p className="text-sm mt-2">{pl ? "Następny krok: budżetowany test zgodności Direct Codex i Hermes z modelem na tym samym syntetycznym pakiecie, tylko do odczytu. Uruchamianie zadań wymaga osobnego dopuszczenia." : "Next: a budgeted read-only model compatibility test of Direct Codex and Hermes on the same synthetic packet. Task execution requires separate admission."}</p>
    {blockers.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer focus-visible:outline focus-visible:outline-2">{pl ? "Szczegóły gotowości providera" : "Provider readiness details"}</summary>
      {verified ? <p className="mt-2 text-sm">{pl ? "Odcisk instalacji" : "Installation fingerprint"}: <code>{report.installation?.fingerprint}</code>. {report.installation?.checkedAt ? <><time dateTime={report.installation.checkedAt}>{new Date(report.installation.checkedAt).toLocaleString(pl ? "pl-PL" : "en-GB")}</time>. </> : null}{pl ? "Stan z ostatniej weryfikacji Workera. Źródło bez podpisu. Weryfikacja plików nie potwierdza zgodności z Roost." : "Snapshot from the last Worker check. Unsigned source. File verification does not establish Roost compatibility."}</p> : null}
      <ul className="mt-2 space-y-2">{blockers.map(code => <li key={code}>{labels[code]![pl ? 0 : 1]} <code className="block text-xs break-all">{code}</code></li>)}</ul>
    </details> : null}
  </div>;
}
