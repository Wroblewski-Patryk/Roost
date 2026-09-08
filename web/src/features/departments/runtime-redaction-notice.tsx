import { CcNotice } from "../../components/cc-notice";
import { CcButton } from "../../components/cc-button";
import { useLanguage } from "../../i18n/i18n";
export type RedactionIncident = { fingerprint?: string; incidentId?: string; surface?: string; findings?: { category: string; location: string }[] };
export function RuntimeRedactionNotice({ incidents = [] }: { incidents?: RedactionIncident[] }) {
  const { locale } = useLanguage(); const pl = locale === "pl";
  return <CcNotice tone="warning" title={pl ? "Treść została usunięta" : "Content was removed"} detail={pl ? "Wykryto dane wrażliwe lub nieobsługiwany format. Jeśli dotyczy to danych potrzebnych do wykonania, operacja jest zablokowana. Sprawdź bezpieczne odwołania w incydencie." : "Sensitive content or an unsupported format was detected. Operations requiring that content are blocked. Review the safe references in the incident."}
    action={<CcButton href="/areas?area=09-technologia&view=incidents" size="sm" variant="outline">{pl ? "Incydenty techniczne" : "Technical incidents"}</CcButton>}>
    {incidents.map((incident, i) => <div className="mt-3 break-words text-xs" key={incident.fingerprint || incident.incidentId || i}>
      {incident.fingerprint || incident.incidentId ? <p>{pl ? "Odniesienie" : "Reference"}: <code>{incident.fingerprint || incident.incidentId}</code></p> : null}
      {incident.surface ? <p>{pl ? "Miejsce" : "Surface"}: {incident.surface}</p> : null}
      {incident.findings?.map((finding, j) => <p key={j}><code>{finding.category}</code> · <code>{finding.location}</code></p>)}
    </div>)}
  </CcNotice>;
}
