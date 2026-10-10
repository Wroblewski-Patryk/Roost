import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { DecisionGovernanceModal } from "./decision-governance";

type Candidate = { approval: Record<string, unknown>; model: string; reasoningEffort: string;
  maxDurationSeconds: number; maxOutputTokensIntent: number };

export function CompanyInformationAuthorization({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [candidate, setCandidate] = useState<Candidate | null>(null), [decisionId, setDecisionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => {
    let current = true;
    void api<{ data: Candidate }>(`/v1/agent-runtime/tasks/${taskId}/information-approval-candidate`, { cache: "no-store" })
      .then(response => { if (current) setCandidate(response.data); })
      .catch(caught => { if (current) setError(caught instanceof AppApiError ? caught.code : "request_failed"); });
    return () => { current = false; };
  }, [taskId]);
  async function propose() {
    if (!candidate || !acknowledged || busy) return;
    setBusy(true); setError(null);
    try {
      const governance = await api<{ data: { expectedVersion: string } }>("/v1/decisions/governance", { cache: "no-store" });
      const proposal = await api<{ data: { record: { id: string } } }>("/v1/decisions/governance/proposals", {
        method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: governance.data.expectedVersion,
          title: `One information runtime attempt: ${taskTitle}`,
          context: "The owner accepted this company information Task with one selected current Roost record. The Task remains read only and has no Application or repository authority.",
          decision: "Authorize one low-risk, tool-free installed Worker/Hermes information attempt for this Task only. Owner result acceptance remains separate.",
          rationale: "Obtain the requested source-bound company summary in the owner console.",
          consequences: "One provider attempt under the Task duration limit. Output tokens are an intent, not a provider-enforced cost cap. The Windows account boundary is not OS isolation. No repository, native tool, external write, push or deployment is authorized.",
          scopeReason: "This exact Task and installation are the narrowest available scope; the signed selection digest binds the model choice.",
          scope: [{ type: "task", id: taskId }], supersedesId: null, conflicts: [], managedRuntimeApproval: candidate.approval })
      });
      setDecisionId(proposal.data.record.id);
    } catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); }
    finally { setBusy(false); }
  }
  if (decisionId) return <DecisionGovernanceModal decisionId={decisionId} onClose={onClose} />;
  return <CcRecordEditorModal titleId="information-runtime-authorization-title" eyebrow={pl ? "Zadanie informacyjne" : "Information task"}
    title={pl ? "Decyzja o jednej próbie runtime" : "Decision for one runtime attempt"}
    description={pl ? "Najpierw zapisz propozycję. Przegląd wpływu, dopuszczenie ryzyka i akceptacja właściciela są osobnymi krokami." : "Record a proposal first. Impact review, risk admission and owner acceptance are separate steps."}
    onClose={onClose} actions={<><CcButton variant="ghost" onClick={onClose}>{pl ? "Wróć" : "Back"}</CcButton><CcButton variant="primary" disabled={!candidate || !acknowledged || busy} loading={busy} onClick={() => void propose()}>{pl ? "Zapisz propozycję" : "Record proposal"}</CcButton></>}>
    {error ? <CcNotice tone="error" title={pl ? "Nie można przygotować decyzji" : "Decision could not be prepared"} detail={error} /> : null}
    {!candidate ? <CcNotice tone="loading" title={pl ? "Wczytywanie dokładnego zakresu" : "Loading exact scope"} /> : <div className="grid gap-4 text-sm">
      <p className="font-semibold">{taskTitle}</p>
      <dl className="grid gap-2 sm:grid-cols-2"><div><dt>{pl ? "Model" : "Model"}</dt><dd>{candidate.model} · {candidate.reasoningEffort}</dd></div>
        <div><dt>{pl ? "Granica" : "Boundary"}</dt><dd>{pl ? "Jedna próba, bez narzędzi i zapisów zewnętrznych" : "One attempt, no tools or external writes"}</dd></div>
        <div><dt>{pl ? "Maksymalny czas zadania" : "Maximum task duration"}</dt><dd>{candidate.maxDurationSeconds} s</dd></div>
        <div><dt>{pl ? "Założony limit wyjścia" : "Output token intent"}</dt><dd>{candidate.maxOutputTokensIntent}</dd></div></dl>
      <p>{pl ? "Limit tokenów i kosztu nie jest wymuszany przez dostawcę. Worker działa w granicach uprawnień konta Windows, bez izolacji systemowej." : "The provider does not enforce this token or cost limit. The Worker runs under the Windows account authority without OS isolation."}</p>
      <label className="flex items-start gap-3"><input type="checkbox" className="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
        <span>{pl ? "Rozumiem te ograniczenia i chcę zapisać propozycję dla tego jednego zadania." : "I understand these limits and want to record a proposal for this one Task."}</span></label>
    </div>}
  </CcRecordEditorModal>;
}
