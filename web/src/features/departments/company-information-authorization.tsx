import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { DecisionGovernanceModal } from "./decision-governance";

type Candidate = { approval: Record<string, unknown>; backend?: "codex_responses" | "ollama_loopback"; model: string; modelDigest?: string | null; reasoningEffort: string;
  maxDurationSeconds: number; maxOutputTokensIntent: number;
  taskOutcome: string;
  previousDecision: { id: string; decision: string } | null };

export function CompanyInformationAuthorization({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [candidate, setCandidate] = useState<Candidate | null>(null), [decisionId, setDecisionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [acknowledged, setAcknowledged] = useState(false);
  const candidateBackend = candidate?.approval.backend;
  const candidateValid = !!candidate && candidate.taskOutcome.trim().length >= 3 && (candidateBackend === "codex_responses" || candidateBackend === "ollama_loopback")
    && (!candidate.backend || candidate.backend === candidateBackend)
    && (candidateBackend !== "ollama_loopback" || candidate.model === "gpt-oss:20b"
      && typeof candidate.modelDigest === "string" && /^sha256:[a-f0-9]{64}$/.test(candidate.modelDigest));
  useEffect(() => {
    let current = true;
    void api<{ data: Candidate }>(`/v1/agent-runtime/tasks/${taskId}/information-approval-candidate`, { cache: "no-store" })
      .then(response => { if (current) setCandidate(response.data); })
      .catch(caught => { if (current) setError(caught instanceof AppApiError ? caught.code : "request_failed"); });
    return () => { current = false; };
  }, [taskId]);
  async function propose() {
    if (!candidate || !candidateValid || !acknowledged || busy) return;
    setBusy(true); setError(null);
    try {
      const governance = await api<{ data: { expectedVersion: string } }>("/v1/decisions/governance", { cache: "no-store" });
      const previous = candidate.previousDecision;
      const backend = candidateBackend;
      const selection = `${backend} / ${candidate.model} / ${candidate.reasoningEffort}${candidate.modelDigest ? ` / ${candidate.modelDigest}` : ""}`;
      const decision = previous
        ? `Renew authority for one additional low-risk, tool-free installed Worker/Hermes information attempt for this Task only: ${selection}. No fallback. Owner result acceptance remains separate.`
        : `Authorize one low-risk, tool-free installed Worker/Hermes information attempt for this Task only: ${selection}. No fallback. Owner result acceptance remains separate.`;
      const proposal = await api<{ data: { record: { id: string } } }>("/v1/decisions/governance/proposals", {
        method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: governance.data.expectedVersion,
          title: `One information runtime attempt: ${taskTitle}`,
          context: "The owner accepted this company information Task with selected current Roost records. The Task remains read only and has no Application or repository authority.",
          decision,
          rationale: candidate.taskOutcome,
          consequences: "One provider attempt under the Task duration limit. Provider token and cost usage remain unknown unless measured; the output token count is intent, not an enforced cap. The Windows account boundary is not OS isolation. No repository, native tool, external write, push or deployment is authorized.",
          scopeReason: "This exact Task and installation are the narrowest available scope; the signed selection digest binds the model choice.",
          scope: [{ type: "task", id: taskId }], supersedesId: previous?.id ?? null,
          conflicts: previous ? [{ kind: "replaces", oldProvision: previous.decision, newProvision: decision,
            explanation: "The prior single attempt has ended. This proposal requests one further attempt under the current Task limits." }] : [],
          managedRuntimeApproval: candidate.approval })
      });
      setDecisionId(proposal.data.record.id);
    } catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); }
    finally { setBusy(false); }
  }
  if (decisionId) return <DecisionGovernanceModal decisionId={decisionId} onClose={onClose} />;
  return <CcRecordEditorModal titleId="information-runtime-authorization-title" eyebrow={pl ? "Zadanie informacyjne" : "Information task"}
    title={pl ? "Decyzja o jednej próbie runtime" : "Decision for one runtime attempt"}
    description={pl ? "Najpierw zapisz propozycję. Przegląd wpływu, dopuszczenie ryzyka i akceptacja właściciela są osobnymi krokami." : "Record a proposal first. Impact review, risk admission and owner acceptance are separate steps."}
    onClose={onClose} actions={<><CcButton variant="ghost" onClick={onClose}>{pl ? "Wróć" : "Back"}</CcButton><CcButton variant="primary" disabled={!candidateValid || !acknowledged || busy} loading={busy} onClick={() => void propose()}>{pl ? "Zapisz propozycję" : "Record proposal"}</CcButton></>}>
    {error ? <CcNotice tone="error" title={pl ? "Nie można przygotować decyzji" : "Decision could not be prepared"}
      detail={error === "company_risk_assessment_required" ? (pl ? "Najpierw zapisz aktualną ocenę ryzyka Low dla tego zadania." : "Record a current Low risk assessment for this task first.") : error} /> : null}
    {!candidate && !error ? <CcNotice tone="loading" title={pl ? "Wczytywanie dokładnego zakresu" : "Loading exact scope"} /> : null}
    {candidate && !candidateValid ? <CcNotice tone="error" title={pl ? "Wybór modelu wymaga odświeżenia" : "Model selection needs refresh"} detail={pl ? "Backend lub dokładny digest modelu nie zgadza się z propozycją. Odśwież Ready przed zapisaniem decyzji." : "Backend or exact model digest does not match the proposal. Refresh Ready before recording the decision."} /> : null}
    {candidate ? <div className="grid gap-4 text-sm">
      <p className="font-semibold">{taskTitle}</p>
      <p className="whitespace-pre-wrap">{candidate.taskOutcome}</p>
      <dl className="grid gap-2 sm:grid-cols-2"><div><dt>Backend</dt><dd>{(candidate.backend ?? candidate.approval.backend) === "ollama_loopback" ? "Ollama · 127.0.0.1" : "Codex Responses"}</dd></div>
        <div><dt>{pl ? "Model" : "Model"}</dt><dd>{candidate.model} · {candidate.reasoningEffort}</dd></div>
        {(candidate.backend ?? candidate.approval.backend) === "ollama_loopback" ? <div className="sm:col-span-2"><dt>{pl ? "Dokładny digest modelu" : "Exact model digest"}</dt><dd className="break-all font-mono">{candidate.modelDigest || (pl ? "Nieustalony" : "Unknown")}</dd></div> : null}
        <div><dt>{pl ? "Granica" : "Boundary"}</dt><dd>{pl ? "Jedna próba, bez narzędzi i zapisów zewnętrznych" : "One attempt, no tools or external writes"}</dd></div>
        <div><dt>{pl ? "Maksymalny czas zadania" : "Maximum task duration"}</dt><dd>{candidate.maxDurationSeconds} s</dd></div>
        <div><dt>{pl ? "Założony limit wyjścia" : "Output token intent"}</dt><dd>{candidate.maxOutputTokensIntent}</dd></div></dl>
      <p>{pl ? "Bez automatycznego fallbacku. Wybór nie potwierdza dostępności modelu ani zasobów. Tokeny i koszt pozostają nieznane, dopóki nie zostaną zmierzone; deklarowany limit wyjścia nie jest wymuszany. Worker działa w granicach uprawnień konta Windows, bez izolacji systemowej." : "No automatic fallback. Selection does not prove model availability or resources. Tokens and cost remain unknown unless measured; the declared output limit is not enforced. The Worker runs under the Windows account authority without OS isolation."}</p>
      {candidate.previousDecision ? <p className="text-warning">{pl ? "Poprzednia decyzja upoważniała do jednej próby. Nowa propozycja zastąpi ją dopiero po odrębnym przeglądzie ryzyka i akceptacji właściciela." : "The prior decision authorized one attempt. This proposal replaces it only after separate risk review and owner acceptance."}</p> : null}
      <label className="flex items-start gap-3"><input type="checkbox" className="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
        <span>{pl ? "Rozumiem te ograniczenia i chcę zapisać propozycję dla tego jednego zadania." : "I understand these limits and want to record a proposal for this one Task."}</span></label>
    </div> : null}
  </CcRecordEditorModal>;
}
