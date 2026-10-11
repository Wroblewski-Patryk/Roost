import { useEffect, useRef, useState } from "react";
import { AppApiError, api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";

type StepSnapshot = {
  instruction?: string;
  control?: { executorClass?: string; success?: string; maxAttempts?: number; escalation?: string; fallback?: string };
};
type ImprovementProposal = {
  id: string; taskId: string; executionId: string; materialVersion: string; compositionSeal: string;
  procedureId: string; contractVersionId: string; sourceStepId: string; stepKey: string; step: StepSnapshot;
  observation: string; proposedInstruction: string; applicability: string; rollback: string;
  author: { kind: "user" | "agent"; id: string }; expectedVersion: string; createdAt: string;
  decision: null | { id: string; decision: "accept" | "reject"; diagnosis: string; applicability: string;
    rollback: string; reviewerUserId: string; draftProcedureId: string | null; createdAt: string };
};
type ImprovementView = { taskId: string; canPropose: boolean; canDecide: boolean; materialVersion: string | null;
  executionId: string | null; composition: unknown; proposals: ImprovementProposal[]; truncated: boolean };
type DecisionDraft = { decision: "accept" | "reject"; diagnosis: string; applicability: string; rollback: string };
const emptyDraft = (): DecisionDraft => ({ decision: "reject", diagnosis: "", applicability: "", rollback: "" });

const messages = {
  pl: {
    title: "Zmiana procedury po wyniku", boundary: "To osobna decyzja od oceny wyniku zadania. Przyjęcie propozycji tworzy tylko szkic następnej wersji; nie publikuje ani nie aktywuje jej i nie zmienia pinu tego zadania.",
    source: "Powiązany wynik i przypięty krok", result: "Wersja wyniku", execution: "Wykonanie", contract: "Wersja kontraktu procedury", step: "Krok", sourceStep: "Źródłowy krok", author: "Autor propozycji", original: "Dotychczasowa instrukcja", control: "Warunki przypiętego kroku", executor: "Wykonawca", success: "Warunek sukcesu", attempts: "Maksymalna liczba prób", escalation: "Eskalacja", fallback: "Sposób awaryjny", observation: "Zaobserwowany problem", proposed: "Proponowana instrukcja", applicability: "Zastosowanie wskazane przez autora", rollback: "Wycofanie wskazane przez autora", date: "Zgłoszono", decide: "Niezależna ocena propozycji", decision: "Decyzja", accept: "Przyjmij do szkicu", reject: "Odrzuć propozycję", diagnosis: "Niezależna diagnoza przyczyny", assessedApplicability: "Potwierdzony zakres zastosowania", assessedRollback: "Sposób wycofania", save: "Zapisz decyzję o procedurze", saved: "Decyzja o procedurze została zapisana.", accepted: "Przyjęto do szkicu", rejected: "Odrzucono", draft: "Szkic następnej wersji", reviewer: "Ocenił", refresh: "Odśwież propozycje", stale: "Stan zmienił się przed zapisem. Wpisana diagnoza pozostała; sprawdź odświeżoną propozycję przed ponowieniem.", error: "Nie udało się odczytać lub zapisać propozycji. Spróbuj ponownie.", limited: "Pokazano pierwsze 50 propozycji.", noControl: "Ocenę może zapisać upoważniony właściciel niezależny od autora." },
  en: {
    title: "Procedure change after a result", boundary: "This decision is separate from task result review. Accepting a proposal creates only a draft of the next version; it does not publish or activate it or change this task's pin.",
    source: "Linked result and pinned step", result: "Result version", execution: "Execution", contract: "Procedure contract version", step: "Step", sourceStep: "Source step", author: "Proposal author", original: "Current instruction", control: "Pinned step conditions", executor: "Executor", success: "Success condition", attempts: "Maximum attempts", escalation: "Escalation", fallback: "Fallback", observation: "Observed issue", proposed: "Proposed instruction", applicability: "Author's applicability", rollback: "Author's rollback", date: "Proposed", decide: "Independent proposal review", decision: "Decision", accept: "Accept into draft", reject: "Reject proposal", diagnosis: "Independent cause diagnosis", assessedApplicability: "Confirmed applicability", assessedRollback: "Rollback method", save: "Record procedure decision", saved: "Procedure decision recorded.", accepted: "Accepted into draft", rejected: "Rejected", draft: "Next-version draft", reviewer: "Reviewed by", refresh: "Refresh proposals", stale: "The state changed before save. Your diagnosis remains; inspect the refreshed proposal before retrying.", error: "Could not load or save proposals. Try again.", limited: "Showing the first 50 proposals.", noControl: "Only an authorized owner independent from the author may record a decision." }
} as const;

export function ProcedureImprovementPanel({ taskId }: { taskId: string }) {
  const { locale } = useLanguage();
  const c = messages[locale === "pl" ? "pl" : "en"];
  const [view, setView] = useState<ImprovementView | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const mounted = useRef(true);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const root = `/v1/agent-runtime/tasks/${taskId}/procedure-improvements`;

  async function load() {
    setLoading(true);
    try {
      const response = await api<{ data: ImprovementView }>(root);
      if (!mounted.current) return;
      setView(response.data);
      setForbidden(false);
      setError(false);
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof AppApiError && cause.status === 403) setForbidden(true);
      else setError(true);
    } finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => {
    mounted.current = true;
    setView(null); setDrafts({}); setEditingId(null); setError(false); setStale(false); setSaved(false); setForbidden(false);
    request.current = null;
    void load();
    return () => { mounted.current = false; };
  }, [taskId]);

  function edit(proposalId: string, key: keyof DecisionDraft, value: string) {
    setDrafts(previous => ({ ...previous, [proposalId]: { ...(previous[proposalId] ?? emptyDraft()), [key]: value } }));
    setSaved(false);
  }
  async function decide(proposal: ImprovementProposal) {
    const draft = drafts[proposal.id] ?? emptyDraft();
    if (saving || !view?.canDecide || proposal.decision ||
      [draft.diagnosis, draft.applicability, draft.rollback].some(value => value.trim().length < 3)) return;
    const input = { expectedVersion: proposal.expectedVersion, decision: draft.decision,
      diagnosis: draft.diagnosis.trim(), applicability: draft.applicability.trim(), rollback: draft.rollback.trim() };
    const signature = JSON.stringify({ proposalId: proposal.id, input });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    setSaving(true); setError(false); setStale(false); setSaved(false);
    try {
      const response = await api<{ data: { proposal: ImprovementProposal } }>(`${root}/${proposal.id}/decision`, { method: "POST", body: JSON.stringify({ ...input, requestId: request.current.id }) });
      if (!mounted.current) return;
      setView(previous => previous ? { ...previous, proposals: previous.proposals.map(item => item.id === proposal.id ? response.data.proposal : item) } : previous);
      request.current = null;
      setDrafts(previous => { const next = { ...previous }; delete next[proposal.id]; return next; });
      setEditingId(null);
      await load();
      if (mounted.current) setSaved(true);
    } catch (cause) {
      if (!mounted.current) return;
      setStale(cause instanceof AppApiError && cause.status === 409);
      if (!(cause instanceof AppApiError && cause.status === 409)) setError(true);
      else await load();
    } finally { if (mounted.current) setSaving(false); }
  }

  if (forbidden || !view?.proposals?.length) return null;
  return <section aria-labelledby="procedure-improvement-title" className="grid min-w-0 gap-4 border-b border-base-300 pb-5 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="procedure-improvement-title" className="font-bold">{c.title}</h3><p className="mt-1 text-sm text-company-muted">{c.boundary}</p></div><CcButton size="sm" variant="outline" disabled={loading || saving} onClick={() => void load()}>{c.refresh}</CcButton></div>
    {stale ? <CcNotice tone="warning" title={c.stale} live/> : error ? <CcNotice tone="error" title={c.error} live/> : saved ? <CcNotice tone="success" title={c.saved} live/> : null}
    {view.truncated ? <p className="text-sm text-company-muted">{c.limited}</p> : null}
    {view.proposals.map(proposal => {
      const draft = drafts[proposal.id] ?? emptyDraft();
      const editing = editingId === proposal.id;
      return <article key={proposal.id} className="grid min-w-0 gap-3 rounded-company border border-base-300 p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{c.source}</h4><time dateTime={proposal.createdAt}>{c.date}: {new Date(proposal.createdAt).toLocaleString(locale)}</time></div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-company-muted">{c.result}</dt><dd className="break-all font-mono">{proposal.materialVersion}</dd></div>
          <div><dt className="text-company-muted">{c.execution}</dt><dd className="break-all font-mono">{proposal.executionId}</dd></div>
          <div><dt className="text-company-muted">{c.contract}</dt><dd className="break-all font-mono">{proposal.contractVersionId}</dd></div>
          <div><dt className="text-company-muted">{c.step}</dt><dd className="font-mono">{proposal.stepKey}</dd></div>
          <div><dt className="text-company-muted">{c.sourceStep}</dt><dd className="break-all font-mono">{proposal.sourceStepId}</dd></div>
          <div><dt className="text-company-muted">{c.author}</dt><dd className="break-all">{proposal.author.kind} · <span className="font-mono">{proposal.author.id}</span></dd></div>
        </dl>
        {proposal.step?.instruction ? <div><strong>{c.original}</strong><p className="whitespace-pre-wrap">{proposal.step.instruction}</p></div> : null}
        {proposal.step?.control ? <details><summary className="cursor-pointer font-semibold">{c.control}</summary><dl className="mt-2 grid gap-2 sm:grid-cols-2">{([[c.executor, proposal.step.control.executorClass], [c.success, proposal.step.control.success], [c.attempts, proposal.step.control.maxAttempts], [c.escalation, proposal.step.control.escalation], [c.fallback, proposal.step.control.fallback]] as const).map(([label, value]) => <div key={label}><dt className="text-company-muted">{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl></details> : null}
        <div><strong>{c.observation}</strong><p className="whitespace-pre-wrap">{proposal.observation}</p></div>
        <div><strong>{c.proposed}</strong><p className="whitespace-pre-wrap">{proposal.proposedInstruction}</p></div>
        <div><strong>{c.applicability}</strong><p className="whitespace-pre-wrap">{proposal.applicability}</p></div>
        <div><strong>{c.rollback}</strong><p className="whitespace-pre-wrap">{proposal.rollback}</p></div>
        {proposal.decision ? <div className="grid gap-2 border-t border-base-300 pt-3"><strong>{proposal.decision.decision === "accept" ? c.accepted : c.rejected}</strong><p>{c.diagnosis}: {proposal.decision.diagnosis}</p><p>{c.assessedApplicability}: {proposal.decision.applicability}</p><p>{c.assessedRollback}: {proposal.decision.rollback}</p><p>{c.reviewer}: <span className="font-mono">{proposal.decision.reviewerUserId}</span></p>{proposal.decision.draftProcedureId ? <p>{c.draft}: <span className="break-all font-mono">{proposal.decision.draftProcedureId}</span></p> : null}</div> : view.canDecide ? <div className="grid gap-3 border-t border-base-300 pt-3">
          {!editing ? <CcButton size="sm" variant="outline" onClick={() => setEditingId(proposal.id)}>{c.decide}</CcButton> : <>
            <h5 className="font-semibold">{c.decide}</h5>
            <CcField label={c.decision} required>{({ id }) => <CcSelect id={id} value={draft.decision} onChange={event => edit(proposal.id, "decision", event.target.value as DecisionDraft["decision"])}><option value="reject">{c.reject}</option><option value="accept">{c.accept}</option></CcSelect>}</CcField>
            {(["diagnosis", "applicability", "rollback"] as const).map(key => <CcField key={key} label={{ diagnosis: c.diagnosis, applicability: c.assessedApplicability, rollback: c.assessedRollback }[key]} required>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} value={draft[key]} onChange={event => edit(proposal.id, key, event.target.value)}/>}</CcField>)}
            <CcButton size="sm" variant="primary" disabled={saving || loading || [draft.diagnosis, draft.applicability, draft.rollback].some(value => value.trim().length < 3)} onClick={() => void decide(proposal)}>{c.save}</CcButton>
          </>}
        </div> : <p className="text-company-muted">{c.noControl}</p>}
      </article>;
    })}
  </section>;
}
