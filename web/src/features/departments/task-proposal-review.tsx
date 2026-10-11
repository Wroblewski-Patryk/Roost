import { FormEvent, useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";

type Language = "pl" | "en";
type ProposalView = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  title: string;
  outcome: string;
  category: string;
  priorityBand: string;
  priorityRationale: string;
  sourceTitle: string | null;
  sourceRecordId: string;
  sourceRevision: string;
  sourceTaskId: string;
  proposerAgentId: string;
  proposerLabel: string | null;
  createdAt: string;
  acceptedTaskId: string | null;
  decisionReason: string | null;
  sourceCurrent: boolean;
  expectedVersion?: string;
};
type ProposalDetail = ProposalView & { expectedVersion: string; source?: {
  content: { title?: string | null; description?: string | null; businessPurpose?: string | null; desiredState?: string | null; expectedBehavior?: string | null };
  provenance: { reviewId?: string; reviewedByUserId?: string; reviewedAt?: string; verificationMethod?: string | null; verificationRef?: string | null; inclusionReason?: string | null; contentDigest?: string; validUntil?: string };
} | null; historicalProvenance?: {
  reviewId?: string; classification?: string | null; provenance?: string | null; verificationMethod?: string | null; verificationRef?: string | null;
  inclusionReason?: string | null; contentDigest?: string | null; validFrom?: string | null; validUntil?: string | null;
  reviewedAt?: string | null; reviewedByUserId?: string | null;
} | null; occurrences?: Array<{ id: string; agentId: string; createdAt: string; body: unknown }>; occurrencesTruncated?: boolean };

const priorityBands = [
  "security_data_incident_outage",
  "blocked_core_flow",
  "wrong_result_action",
  "incomplete_flow_regression",
  "stability_debt",
  "approved_missing_feature",
  "cosmetic_optimization"
] as const;

const copy = {
  pl: {
    title: "Propozycje zadań od agentów", pending: "Oczekujące na przegląd", empty: "Brak propozycji do przeglądu.", emptyPage: "Na tej stronie nie ma oczekujących propozycji. Sprawdź kolejną stronę.",
    loading: "Wczytywanie propozycji", unavailable: "Nie udało się wczytać propozycji.", forbidden: "Nie masz uprawnienia do przeglądu propozycji.",
    retry: "Odśwież", review: "Przejrzyj propozycję", next: "Następna strona", previous: "Poprzednia strona", page: "Strona",
    author: "Autor", category: "Kategoria", source: "Źródło", sourceRevision: "Rewizja źródła", sourceTask: "Zadanie źródłowe", sourceContent: "Zatwierdzona treść", sourceDescription: "Opis", sourcePurpose: "Cel biznesowy", sourceDesired: "Stan docelowy", sourceExpected: "Oczekiwane zachowanie", sourceReview: "Przegląd źródła", historicalReview: "Pierwotny przegląd źródła (historia)", historicalOnly: "Zachowano metadane pierwotnego przeglądu. Treść dawnej rewizji nie jest dostępna w tym widoku.", classification: "Klasyfikacja", provenance: "Pochodzenie", reviewedBy: "Zatwierdził użytkownik", reviewedAt: "Data przeglądu", verificationMethod: "Metoda weryfikacji", verificationRef: "Odwołanie do weryfikacji", inclusionReason: "Powód włączenia", contentDigest: "Skrót zatwierdzonej treści", validFrom: "Zatwierdzenie ważne od", validUntil: "Zatwierdzenie ważne do",
    proposedCategory: "Kategoria propozycji", proposedPriority: "Priorytet propozycji", proposedPriorityReason: "Uzasadnienie priorytetu w propozycji", categoryField: "Kategoria zadania", priority: "Priorytet zadania", priorityReason: "Uzasadnienie priorytetu zadania", outcome: "Oczekiwany wynik", titleField: "Tytuł zadania", occurrences: "Wystąpienia propozycji", occurrencesTruncated: "Pokazano tylko 50 najnowszych wystąpień.", occurrenceAgent: "Agent wystąpienia", occurrenceAt: "Zgłoszono", occurrencePriority: "Priorytet wystąpienia", occurrenceRationale: "Uzasadnienie wystąpienia",
    reason: "Uzasadnienie decyzji właściciela", current: "Źródło jest aktualne.", stale: "Źródło zmieniło się lub zostało wycofane. Odśwież przed decyzją; przyjęcie jest zablokowane.",
    boundary: "Przyjęcie utworzy jedno zadanie Draft lub Needs-context. Nie uruchomi Workera. Wykonanie wymaga później osobnego Submit-for-execution i kompletnego Ready.",
    accept: "Przyjmij do szkicu zadania", reject: "Odrzuć propozycję", close: "Zamknij przegląd", saved: "Propozycja przyjęta. Utworzono szkic zadania.",
    rejected: "Propozycja odrzucona.", openTask: "Otwórz zadanie", conflict: "Propozycja lub źródło zmieniły się. Odśwież listę i przejrzyj aktualny stan.",
    actionError: "Nie udało się zapisać decyzji. Odśwież listę przed kolejną próbą.",
    categories: ["Błąd", "Niedokończona funkcja", "Nieaktualna dokumentacja", "Brakujące założenie", "Usprawnienie"],
    bands: ["Bezpieczeństwo, dane, incydent lub awaria", "Zablokowany główny przepływ", "Błędny wynik lub działanie", "Niekompletny przepływ lub regresja", "Dług blokujący stabilność", "Zatwierdzona brakująca funkcja", "Kosmetyka lub niepotwierdzona optymalizacja"]
  },
  en: {
    title: "Agent task proposals", pending: "Awaiting review", empty: "No proposals need review.", emptyPage: "No pending proposals appear on this page. Check the next page.",
    loading: "Loading proposals", unavailable: "Proposals could not be loaded.", forbidden: "You do not have permission to review proposals.",
    retry: "Refresh", review: "Review proposal", next: "Next page", previous: "Previous page", page: "Page",
    author: "Author", category: "Category", source: "Source", sourceRevision: "Source revision", sourceTask: "Source task", sourceContent: "Approved content", sourceDescription: "Description", sourcePurpose: "Business purpose", sourceDesired: "Desired state", sourceExpected: "Expected behavior", sourceReview: "Source review", historicalReview: "Original source review (historical)", historicalOnly: "Original review metadata is retained. The earlier revision's body is unavailable in this view.", classification: "Classification", provenance: "Provenance", reviewedBy: "Approved by user", reviewedAt: "Reviewed at", verificationMethod: "Verification method", verificationRef: "Verification reference", inclusionReason: "Inclusion reason", contentDigest: "Approved content digest", validFrom: "Approval valid from", validUntil: "Approval valid until",
    proposedCategory: "Proposed category", proposedPriority: "Proposed priority", proposedPriorityReason: "Original priority rationale", categoryField: "Task category", priority: "Task priority", priorityReason: "Task priority rationale", outcome: "Expected outcome", titleField: "Task title", occurrences: "Proposal occurrences", occurrencesTruncated: "Only the 50 most recent occurrences are shown.", occurrenceAgent: "Occurrence agent", occurrenceAt: "Submitted", occurrencePriority: "Occurrence priority", occurrenceRationale: "Occurrence rationale",
    reason: "Owner decision reason", current: "The source is current.", stale: "The source changed or was withdrawn. Refresh before deciding; acceptance is blocked.",
    boundary: "Acceptance creates one Draft or Needs-context task. It does not start the Worker. Execution later requires a separate Submit-for-execution and complete Ready.",
    accept: "Accept into task draft", reject: "Reject proposal", close: "Close review", saved: "Proposal accepted. A task draft was created.",
    rejected: "Proposal rejected.", openTask: "Open task", conflict: "The proposal or source changed. Refresh the list and review the current state.",
    actionError: "The decision could not be saved. Refresh the list before another attempt.",
    categories: ["Defect", "Unfinished function", "Stale documentation", "Missing assumption", "Improvement"],
    bands: ["Security, data, incident or outage", "Blocked core flow", "Wrong result or action", "Incomplete flow or regression", "Stability blocking debt", "Approved missing feature", "Cosmetic or unproven optimization"]
  }
};

const categories = ["defect", "unfinished_function", "stale_documentation", "missing_assumption", "improvement"];
function categoryLabel(value: string, locale: Language) {
  const index = categories.indexOf(value);
  return index < 0 ? value : copy[locale].categories[index];
}
function priorityLabel(value: string, locale: Language) {
  const index = priorityBands.indexOf(value as typeof priorityBands[number]);
  return index < 0 ? value : copy[locale].bands[index];
}
function occurrenceTriage(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { priorityBand: null, priorityRationale: null };
  const record = body as Record<string, unknown>;
  return { priorityBand: typeof record.priorityBand === "string" ? record.priorityBand : null,
    priorityRationale: typeof record.priorityRationale === "string" ? record.priorityRationale : null };
}

function ProposalEditor({ proposal, locale, onClose, onResolved, onConflict }: {
  proposal: ProposalDetail;
  locale: Language;
  onClose: () => void;
  onResolved: (result: { status: "accepted" | "rejected"; taskId: string | null }) => void;
  onConflict: () => void;
}) {
  const c = copy[locale];
  const [title, setTitle] = useState(proposal.title);
  const [outcome, setOutcome] = useState(proposal.outcome);
  const [category, setCategory] = useState(proposal.category);
  const [priorityBand, setPriorityBand] = useState(proposal.priorityBand);
  const [priorityRationale, setPriorityRationale] = useState(proposal.priorityRationale);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"conflict" | "forbidden" | "other" | null>(null);
  const canAccept = proposal.sourceCurrent && reason.trim().length >= 3 && title.trim().length >= 3 && outcome.trim().length >= 3 &&
    categories.includes(category) && priorityBands.includes(priorityBand as typeof priorityBands[number]) && priorityRationale.trim().length >= 3;

  async function decide(action: "accept" | "reject") {
    if (busy || error || (action === "accept" && !proposal.sourceCurrent)) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 3 || (action === "accept" && !canAccept)) return;
    setBusy(true);
    try {
      const response = await api<{ data: { record: { taskId: string | null }; taskId: string | null; replayed: boolean } }>(`/v1/agent-runtime/task-proposals/${encodeURIComponent(proposal.id)}/actions/${action}`, {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: proposal.expectedVersion, reason: cleanReason, ...(action === "accept" ? { title: title.trim(), outcome: outcome.trim(), category, priorityBand, priorityRationale: priorityRationale.trim() } : {}) })
      });
      onResolved({ status: action === "accept" ? "accepted" : "rejected", taskId: response.data.taskId ?? response.data.record?.taskId ?? null });
    } catch (caught) {
      if (caught instanceof AppApiError && caught.status === 409) { onConflict(); return; }
      setError(caught instanceof AppApiError && caught.status === 403 ? "forbidden" : "other");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void decide("accept"); }

  return <CcRecordEditorModal titleId="task-proposal-review-title" eyebrow={c.pending} title={proposal.title} description={c.boundary} closeLabel={c.close} onClose={onClose} onSubmit={submit} maxWidthClassName="max-w-4xl" actions={<>
    <CcButton onClick={onClose} variant="ghost" disabled={busy}>{c.close}</CcButton>
    <CcButton onClick={() => void decide("reject")} variant="warning" disabled={busy || Boolean(error) || reason.trim().length < 3}>{c.reject}</CcButton>
    <CcButton type="submit" variant="primary" loading={busy} disabled={Boolean(error) || !canAccept}>{c.accept}</CcButton>
  </>}>
    {error ? <CcNotice tone="error" title={error === "conflict" ? c.conflict : error === "forbidden" ? c.forbidden : c.actionError} live action={<CcButton onClick={onClose} size="sm" variant="outline">{c.retry}</CcButton>} /> : null}
    <CcNotice tone={proposal.sourceCurrent ? "info" : "warning"} title={proposal.sourceCurrent ? c.current : c.stale} />
    <CcRecordEditorSection title={c.source}><dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="font-bold text-company-muted">{c.author}</dt><dd>{proposal.proposerLabel || proposal.proposerAgentId} <span className="break-all text-xs text-company-muted">({proposal.proposerAgentId})</span></dd></div>
      <div><dt className="font-bold text-company-muted">{c.proposedCategory}</dt><dd>{categoryLabel(proposal.category, locale)}</dd></div>
      <div><dt className="font-bold text-company-muted">{c.source}</dt><dd>{proposal.sourceTitle || proposal.sourceRecordId} <span className="break-all text-xs text-company-muted">({proposal.sourceRecordId})</span></dd></div>
      <div><dt className="font-bold text-company-muted">{c.sourceRevision}</dt><dd className="break-all font-mono text-xs">{proposal.sourceRevision}</dd></div>
      <div><dt className="font-bold text-company-muted">{c.sourceTask}</dt><dd className="break-all font-mono text-xs">{proposal.sourceTaskId}</dd></div>
      <div><dt className="font-bold text-company-muted">{c.proposedPriority}</dt><dd>{priorityLabel(proposal.priorityBand, locale)}</dd></div>
    </dl><p className="mt-4 text-sm"><strong>{c.proposedPriorityReason}:</strong> {proposal.priorityRationale}</p>
      {proposal.sourceCurrent && proposal.source ? <div className="mt-4 grid gap-4 border-t border-base-300 pt-4 text-sm">
        <div><h4 className="font-bold">{c.sourceContent}</h4><p className="mt-1 font-semibold">{proposal.source.content.title || proposal.sourceTitle || proposal.sourceRecordId}</p>
          {([ [c.sourceDescription, proposal.source.content.description], [c.sourcePurpose, proposal.source.content.businessPurpose], [c.sourceDesired, proposal.source.content.desiredState], [c.sourceExpected, proposal.source.content.expectedBehavior] ] as Array<[string, string | null | undefined]>).filter(([, value]) => Boolean(value)).map(([label, value]) => <p className="mt-2 whitespace-pre-wrap break-words" key={label}><strong>{label}:</strong> {value}</p>)}
        </div>
        <div><h4 className="font-bold">{c.sourceReview}</h4><dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {([ [c.sourceReview, proposal.source.provenance.reviewId], [c.reviewedBy, proposal.source.provenance.reviewedByUserId], [c.reviewedAt, proposal.source.provenance.reviewedAt], [c.verificationMethod, proposal.source.provenance.verificationMethod], [c.verificationRef, proposal.source.provenance.verificationRef], [c.inclusionReason, proposal.source.provenance.inclusionReason], [c.contentDigest, proposal.source.provenance.contentDigest], [c.validUntil, proposal.source.provenance.validUntil] ] as Array<[string, string | null | undefined]>).filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt className="font-bold text-company-muted">{label}</dt><dd className="break-all">{value}</dd></div>)}
        </dl></div>
      </div> : null}
      {!proposal.sourceCurrent && proposal.historicalProvenance ? <div className="mt-4 border-t border-base-300 pt-4 text-sm"><h4 className="font-bold">{c.historicalReview}</h4><p className="mt-1 text-company-muted">{c.historicalOnly}</p><dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {([ [c.sourceReview, proposal.historicalProvenance.reviewId], [c.classification, proposal.historicalProvenance.classification], [c.provenance, proposal.historicalProvenance.provenance], [c.reviewedBy, proposal.historicalProvenance.reviewedByUserId], [c.reviewedAt, proposal.historicalProvenance.reviewedAt], [c.verificationMethod, proposal.historicalProvenance.verificationMethod], [c.verificationRef, proposal.historicalProvenance.verificationRef], [c.inclusionReason, proposal.historicalProvenance.inclusionReason], [c.contentDigest, proposal.historicalProvenance.contentDigest], [c.validFrom, proposal.historicalProvenance.validFrom], [c.validUntil, proposal.historicalProvenance.validUntil] ] as Array<[string, string | null | undefined]>).filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt className="font-bold text-company-muted">{label}</dt><dd className="break-all">{value}</dd></div>)}
      </dl></div> : null}
    </CcRecordEditorSection>
    {proposal.occurrences?.length || proposal.occurrencesTruncated ? <CcRecordEditorSection title={c.occurrences}>
      {proposal.occurrencesTruncated ? <CcNotice tone="warning" title={c.occurrencesTruncated} /> : null}
      {proposal.occurrences?.length ? <ol className="mt-3 divide-y divide-base-300">{proposal.occurrences.map(occurrence => {
        const triage = occurrenceTriage(occurrence.body);
        return <li key={occurrence.id} className="grid gap-1 py-3 text-sm">
          <p><strong>{c.occurrenceAgent}:</strong> <span className="break-all">{occurrence.agentId}</span></p>
          <p><strong>{c.occurrenceAt}:</strong> {formatAppDate(occurrence.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
          {triage.priorityBand ? <p><strong>{c.occurrencePriority}:</strong> {priorityLabel(triage.priorityBand, locale)}</p> : null}
          {triage.priorityRationale ? <p className="whitespace-pre-wrap break-words"><strong>{c.occurrenceRationale}:</strong> {triage.priorityRationale}</p> : null}
        </li>;
      })}</ol> : null}
    </CcRecordEditorSection> : null}
    <CcRecordEditorSection title={c.outcome}><p className="whitespace-pre-wrap text-sm">{proposal.outcome}</p></CcRecordEditorSection>
    <CcRecordEditorSection title={c.accept}><div className="grid gap-4">
      <CcField label={c.titleField} required>{({ id }) => <input id={id} className="input input-bordered w-full" value={title} onChange={event => setTitle(event.target.value)} maxLength={240} required />}</CcField>
      <CcField label={c.outcome} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-24 w-full" value={outcome} onChange={event => setOutcome(event.target.value)} maxLength={2000} required />}</CcField>
      <CcField label={c.categoryField} required>{({ id }) => <CcSelect id={id} value={category} onChange={event => setCategory(event.target.value)} required>{categories.map(value => <option key={value} value={value}>{categoryLabel(value, locale)}</option>)}</CcSelect>}</CcField>
      <CcField label={c.priority} required>{({ id }) => <CcSelect id={id} value={priorityBand} onChange={event => setPriorityBand(event.target.value)} required>{priorityBands.map(band => <option key={band} value={band}>{priorityLabel(band, locale)}</option>)}</CcSelect>}</CcField>
      <CcField label={c.priorityReason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={priorityRationale} onChange={event => setPriorityRationale(event.target.value)} minLength={3} maxLength={2000} required />}</CcField>
      <CcField label={c.reason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={2000} required />}</CcField>
    </div></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function TaskProposalReview() {
  const { locale } = useLanguage();
  const c = copy[locale];
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<ProposalView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [selected, setSelected] = useState<ProposalDetail | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error" | "forbidden">("idle");
  const [detailNotice, setDetailNotice] = useState(false);
  const [result, setResult] = useState<{ status: "accepted" | "rejected"; taskId: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    setState("loading");
    void api<{ data: { items: ProposalView[]; page: number; hasMore: boolean } }>(`/v1/agent-runtime/task-proposals?page=${page}&status=pending`)
      .then(response => {
        if (!live) return;
        if (!Array.isArray(response.data?.items) || typeof response.data.hasMore !== "boolean" || response.data.page !== page) throw new Error("proposal_packet_invalid");
        setItems(response.data.items.filter(item => item.status === "pending"));
        setHasMore(response.data.hasMore);
        setState("ready");
      })
      .catch(error => { if (live) setState(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error"); });
    return () => { live = false; };
  }, [page, refresh]);

  function reload() { setSelected(null); setDetailNotice(false); setDetailState("idle"); setRefresh(value => value + 1); }
  async function openDetail(id: string, conflict = false) {
    setSelected(null);
    setDetailState("loading");
    setDetailNotice(conflict);
    try {
      const response = await api<{ data: ProposalView }>(`/v1/agent-runtime/task-proposals/${encodeURIComponent(id)}`);
      if (response.data?.id !== id || typeof response.data.expectedVersion !== "string" || !response.data.expectedVersion) throw new Error("proposal_detail_invalid");
      if (response.data.status === "pending") setSelected(response.data as ProposalDetail);
      else setDetailNotice(true);
      setDetailState("idle");
    } catch (error) {
      setDetailState(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error");
    }
    if (conflict) setRefresh(value => value + 1);
  }
  function resolved(next: { status: "accepted" | "rejected"; taskId: string | null }) {
    setSelected(null); setResult(next);
    setDetailNotice(false);
    setRefresh(value => value + 1);
  }

  return <section aria-labelledby="task-proposal-heading" className="roost-work-surface rounded-company p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-company-ink" id="task-proposal-heading">{c.title}</h2><p className="text-sm text-company-muted">{c.boundary}</p></div><CcButton size="sm" variant="outline" onClick={reload} disabled={state === "loading"}>{c.retry}</CcButton></div>
    {result ? <div className="mt-4"><CcNotice tone="success" live title={result.status === "accepted" ? c.saved : c.rejected} action={result.taskId ? <CcButton href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(result.taskId)}`} size="sm" variant="outline">{c.openTask}</CcButton> : undefined} /></div> : null}
    {detailNotice ? <div className="mt-4"><CcNotice tone="warning" live title={c.conflict} /></div> : null}
    {detailState === "loading" ? <div className="mt-4"><CcNotice tone="loading" title={c.loading} /></div> : null}
    {detailState === "error" || detailState === "forbidden" ? <div className="mt-4"><CcNotice tone="error" live title={detailState === "forbidden" ? c.forbidden : c.unavailable} /></div> : null}
    {state === "loading" ? <div className="mt-4"><CcNotice tone="loading" title={c.loading} /></div> : null}
    {state === "error" || state === "forbidden" ? <div className="mt-4"><CcNotice tone="error" live title={state === "forbidden" ? c.forbidden : c.unavailable} /></div> : null}
    {state === "ready" ? <>
      {items.length ? <ul className="mt-4 divide-y divide-base-300 border-y border-base-300">{items.map(proposal => <li key={proposal.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><strong className="block break-words">{proposal.title}</strong><p className="text-sm text-company-muted">{categoryLabel(proposal.category, locale)} · {priorityLabel(proposal.priorityBand, locale)} · {proposal.proposerLabel || proposal.proposerAgentId}</p><p className="text-xs text-company-muted">{proposal.sourceTitle || proposal.sourceRecordId} · {formatAppDate(proposal.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>{!proposal.sourceCurrent ? <p className="text-sm text-warning">{c.stale}</p> : null}</div><CcButton onClick={() => void openDetail(proposal.id)} size="sm" variant="outline" disabled={detailState === "loading"}>{c.review}</CcButton></li>)}</ul> : <p className="mt-4 text-sm text-company-muted">{hasMore ? c.emptyPage : c.empty}</p>}
      {page > 0 || hasMore ? <div className="mt-4 flex items-center justify-end gap-2"><CcButton size="sm" variant="outline" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0}>{c.previous}</CcButton><span className="text-sm text-company-muted">{c.page} {page + 1}</span><CcButton size="sm" variant="outline" onClick={() => setPage(value => value + 1)} disabled={!hasMore}>{c.next}</CcButton></div> : null}
    </> : null}
    {selected ? <ProposalEditor key={`${selected.id}:${selected.expectedVersion}`} proposal={selected} locale={locale} onClose={reload} onResolved={resolved} onConflict={() => void openDetail(selected.id, true)} /> : null}
  </section>;
}
