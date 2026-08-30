import { useMemo, useState } from "react";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcToast } from "../../components/cc-toast";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { ConnectionPacket } from "../../types";

type AgentHost = {
  id: string;
  name: string;
  status: string;
  platform: string;
  lastSeenAt?: string | null;
  applicationSlugs: string[];
};

type RuntimeReadiness = {
  executionEnabled: boolean;
  mode: string;
  applications: Array<{ readyForHost: boolean }>;
};

function tomlString(value: string) {
  return JSON.stringify(value);
}

function formatHeartbeat(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AgentConnectionsSection({ connection }: { connection: ConnectionPacket | null }) {
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const [setupOpen, setSetupOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const hosts = useOwnerPacket<AgentHost[]>(`/v1/agent-runtime/hosts?refresh=${refreshKey}`, true, t);
  const readiness = useOwnerPacket<RuntimeReadiness>(`/v1/agent-runtime/readiness?refresh=${refreshKey}`, true, t);
  const setup = connection?.agentAccess;
  const onlineHosts = (hosts.data || []).filter((host) => host.status === "online");
  const latestHost = [...(hosts.data || [])].sort((left, right) => String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")))[0];
  const readyApplications = (readiness.data?.applications || []).filter((application) => application.readyForHost).length;

  const mcpConfig = useMemo(() => {
    if (!setup) return "";
    return [
      `[mcp_servers.${setup.mcp.serverName}]`,
      `command = ${tomlString(setup.mcp.bridgeCommand)}`,
      `args = [${setup.mcp.bridgeArgs.map(tomlString).join(", ")}]`,
      `cwd = ${tomlString(setup.mcp.bridgeWorkingDirectory)}`,
      `env_vars = [${tomlString(setup.mcp.secretEnvironmentVariable)}]`,
      "startup_timeout_sec = 15",
      "tool_timeout_sec = 60",
      `default_tools_approval_mode = ${tomlString(setup.codex.defaultToolsApprovalMode)}`,
      "",
      `[mcp_servers.${setup.mcp.serverName}.env]`,
      `${setup.mcp.baseUrlEnvironmentVariable} = ${tomlString(setup.api.baseUrl)}`,
      `${setup.mcp.commandModeEnvironmentVariable} = "read_only"`
    ].join("\n");
  }, [setup]);

  const mcpPowerShell = setup ? [
    `$env:${setup.mcp.secretEnvironmentVariable} = "<WKLEJ_KLUCZ_POKAZANY_TYLKO_RAZ>"`,
    setup.codex.verificationCommand
  ].join("\n") : "";

  const hostPowerShell = setup ? [
    `$env:ROOST_BASE_URL = ${tomlString(setup.api.baseUrl)}`,
    "$env:ROOST_AGENT_API_KEY = \"<WKLEJ_KLUCZ_LOCAL_CODEX_WORKER>\"",
    "$env:ROOST_AGENT_HOST_CONFIG = \"$env:USERPROFILE\\.roost\\agent-host.json\"",
    "npm run agent:codex-host:check",
    setup.agentHost.runtimeCommand
  ].join("\n") : "";

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return <>
    <section className="roost-settings-panel" id="agent-connections" aria-labelledby="agent-connections-heading">
      <header>
        <span className="roost-settings-panel-icon"><i className="ph-bold ph-plugs" aria-hidden="true"></i></span>
        <div>
          <h2 id="agent-connections-heading">{polish ? "Połączenia agentów" : "Agent connections"}</h2>
          <p>{polish ? "Jedno miejsce do podłączenia lokalnego Codexa do API i MCP Roost oraz sprawdzenia Agent Hosta." : "Connect local Codex to the Roost API and MCP, then verify the Agent Host from one place."}</p>
        </div>
        <span className={`roost-settings-status ${connection?.status === "ok" ? "is-ready" : "is-warning"}`}><i aria-hidden="true"></i>{connection?.status === "ok" ? (polish ? "API online" : "API online") : (polish ? "sprawdź API" : "check API")}</span>
      </header>
      <div className="roost-agent-connection-list">
        <div className="roost-agent-connection-row">
          <span className="roost-agent-connection-icon"><i className="ph-bold ph-cloud-check" aria-hidden="true"></i></span>
          <div><strong>Roost API</strong><small>{setup?.api.baseUrl || (polish ? "Adres API niedostępny" : "API address unavailable")}</small></div>
          <span className={`badge badge-outline ${connection?.status === "ok" ? "badge-success" : "badge-warning"}`}>{connection?.status === "ok" ? "online" : "unknown"}</span>
        </div>
        <div className="roost-agent-connection-row">
          <span className="roost-agent-connection-icon"><i className="ph-bold ph-git-branch" aria-hidden="true"></i></span>
          <div><strong>{polish ? "MCP dla Codexa" : "Codex MCP"}</strong><small>{polish ? "Lokalny most STDIO → produkcyjne API przez HTTPS" : "Local STDIO bridge → production API over HTTPS"}</small></div>
          <span className="badge badge-outline badge-info">{polish ? "gotowe do konfiguracji" : "ready to configure"}</span>
        </div>
        <div className="roost-agent-connection-row">
          <span className="roost-agent-connection-icon"><i className="ph-bold ph-laptop" aria-hidden="true"></i></span>
          <div><strong>Windows Agent Host</strong><small>{latestHost ? `${latestHost.name} · ${formatHeartbeat(latestHost.lastSeenAt, locale)}` : (polish ? "Host nie został jeszcze uruchomiony" : "No host has connected yet")}</small></div>
          <span className={`badge badge-outline ${onlineHosts.length ? "badge-success" : "badge-warning"}`}>{onlineHosts.length ? `${onlineHosts.length} online` : "offline"}</span>
        </div>
        <div className="roost-agent-connection-row">
          <span className="roost-agent-connection-icon"><i className="ph-bold ph-shield-check" aria-hidden="true"></i></span>
          <div><strong>{polish ? "Tryb wykonywania" : "Execution mode"}</strong><small>{polish ? `${readyApplications}/${readiness.data?.applications.length || 0} aplikacji ma gotową strukturę lokalną` : `${readyApplications}/${readiness.data?.applications.length || 0} applications have a ready local structure`}</small></div>
          <span className={`badge badge-outline ${readiness.data?.executionEnabled ? "badge-success" : "badge-warning"}`}>{readiness.data?.executionEnabled ? (polish ? "nadzorowany" : "supervised") : (polish ? "fundament" : "foundation")}</span>
        </div>
      </div>
      <div className="roost-settings-actions mt-3">
        <CcButton disabled={!setup} iconLeft="ph-terminal-window" onClick={() => setSetupOpen(true)} variant="primary">{polish ? "Skonfiguruj API i MCP" : "Configure API and MCP"}</CcButton>
        <CcButton href="/areas?area=06-kadry&view=executions" iconLeft="ph-pulse" variant="outline">{polish ? "Podgląd pracy agentów" : "View agent activity"}</CcButton>
        <CcButton iconLeft="ph-arrows-clockwise" onClick={() => setRefreshKey((value) => value + 1)} variant="ghost">{polish ? "Odśwież stan" : "Refresh status"}</CcButton>
      </div>
      {!readiness.data?.executionEnabled ? <div className="roost-settings-next-step"><i className="ph-bold ph-lock-key" aria-hidden="true"></i><div><strong>{polish ? "Triggery i wykonywanie pozostają wyłączone" : "Triggers and execution remain disabled"}</strong><span>{polish ? "Możesz przygotować klucze i MCP bez uruchamiania zadań Codexa." : "You can prepare keys and MCP without starting Codex tasks."}</span></div></div> : null}
    </section>
    {copied ? <CcToast detail={polish ? `Skopiowano: ${copied}` : `Copied: ${copied}`} dismissLabel={polish ? "Zamknij" : "Dismiss"} onDismiss={() => setCopied(null)} title={polish ? "Konfiguracja skopiowana" : "Configuration copied"} tone="success" /> : null}
    {setupOpen && setup ? <CcRecordEditorModal
      actions={<CcButton onClick={() => setSetupOpen(false)} variant="primary">{polish ? "Gotowe" : "Done"}</CcButton>}
      description={polish ? "MCP daje Codexowi narzędzia i kontekst Roost. Agent Host osobno odbiera nadzorowane wykonania z kolejki." : "MCP gives Codex Roost tools and context. The Agent Host separately claims supervised executions from the queue."}
      eyebrow={polish ? "Połączenia agentów" : "Agent connections"}
      maxWidthClassName="max-w-4xl"
      onClose={() => setSetupOpen(false)}
      title={polish ? "Podłącz lokalnego Codexa" : "Connect local Codex"}
      titleId="agent-connection-setup-title"
    >
      <CcRecordEditorSection description={polish ? "Utwórz osobny klucz MCP. Do szkiców procedur wybierz MCP Procedure Author; do samego odczytu wybierz profil Reader." : "Create a separate MCP key. Use MCP Procedure Author for procedure drafts, or a Reader profile for read-only context."} title="1. Roost API">
        <dl className="roost-connection-facts"><div><dt>Base URL</dt><dd>{setup.api.baseUrl}</dd></div><div><dt>{polish ? "Nagłówek klucza" : "Key header"}</dt><dd>{setup.api.authHeader}</dd></div><div><dt>Workspace</dt><dd>{connection?.workspace?.name || "—"}</dd></div></dl>
      </CcRecordEditorSection>
      <CcRecordEditorSection description={polish ? `Wklej ten blok do ${setup.codex.configPath}. Sekret nie trafia do pliku — Codex przekazuje go z lokalnej zmiennej środowiskowej.` : `Paste this block into ${setup.codex.configPath}. The secret stays out of the file and is forwarded from the local environment.`} title="2. Codex MCP">
        <div className="roost-code-block"><pre>{mcpConfig}</pre><CcButton iconLeft="ph-copy" onClick={() => void copy("config.toml", mcpConfig)} size="sm" variant="outline">{polish ? "Kopiuj konfigurację" : "Copy configuration"}</CcButton></div>
        <div className="roost-code-block mt-3"><pre>{mcpPowerShell}</pre><CcButton iconLeft="ph-copy" onClick={() => void copy("PowerShell MCP", mcpPowerShell)} size="sm" variant="outline">{polish ? "Kopiuj polecenia" : "Copy commands"}</CcButton></div>
        <CcNotice detail={polish ? "Klucz jest widoczny tylko podczas tworzenia. Nie zapisuj go w repozytorium, zadaniu, promptach ani pliku config.toml." : "The key is visible only at creation. Never store it in a repository, task, prompt, or config.toml."} title={polish ? "Sekret pozostaje lokalny" : "Keep the secret local"} tone="warning" />
      </CcRecordEditorSection>
      <CcRecordEditorSection description={polish ? `Agent Host może pracować wyłącznie w ${setup.agentHost.workspaceRoot}. Używa osobnego klucza Local Codex Worker i nie wykonuje commitów ani wdrożeń bez osobnej zgody.` : `The Agent Host can work only inside ${setup.agentHost.workspaceRoot}. It uses a separate Local Codex Worker key and cannot commit or deploy without separate authority.`} title="3. Windows Agent Host">
        <div className="roost-code-block"><pre>{hostPowerShell}</pre><CcButton iconLeft="ph-copy" onClick={() => void copy("PowerShell Agent Host", hostPowerShell)} size="sm" variant="outline">{polish ? "Kopiuj polecenia hosta" : "Copy host commands"}</CcButton></div>
      </CcRecordEditorSection>
    </CcRecordEditorModal> : null}
  </>;
}
