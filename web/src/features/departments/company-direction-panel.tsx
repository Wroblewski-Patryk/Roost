import { type FormEvent, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";

type DirectionVersion = {
  id: string;
  version: number | null;
  text: string;
  provenance: string;
  status: "draft" | "adopted" | "superseded";
  createdAt: string;
  adoptedAt: string | null;
};
type Comparison = {
  id: string;
  subjectType: "task" | "decision";
  subjectId: string;
  subjectTitle: string;
  outcome: string;
  evidence: string;
  assessment: "aligned" | "conflict";
  status: string;
  exceptionRationale: string | null;
  createdAt: string;
  decidedAt: string | null;
  directionVersionId: string;
  currentEvidence: boolean;
  staleReason: string | null;
};
type DirectionPacket = {
  current: DirectionVersion | null;
  versions: DirectionVersion[];
  comparisons: Comparison[];
};
type ImpactPreview = {
  previewId: string;
  expiresAt: string;
  draftId: string;
  expectedCurrentId: string | null;
  impactDigest: string;
  counts: Record<string, number>;
  examples: Record<string, Array<{ id: string; title: string }>>;
  consequences: string[];
};
type PreparedAction = {
  kind: "adopt" | "resolve";
  path: string;
  body: string;
  label: string;
};
type ComparisonAction = "confirm_aligned" | "accept_exception" | "reject_exception";

const copy = {
  pl: {
    heading: "Kierunek firmy",
    description: "Prywatny kierunek przyjęty przez właściciela. Projekty, zadania i decyzje można porównać z aktualną wersją; cele liczbowe pozostają osobno.",
    refresh: "Odśwież",
    loading: "Wczytywanie kierunku firmy",
    loadError: "Nie udało się wczytać kierunku firmy.",
    forbidden: "Brak uprawnień właściciela do tego widoku.",
    empty: "Nie przyjęto jeszcze kierunku firmy.",
    current: "Obecny kierunek",
    adopted: "Przyjęto",
    provenance: "Pochodzenie",
    version: "Wersja",
    newDraft: "Nowa propozycja kierunku",
    draftHelp: "Zapis propozycji nie zmienia kierunku używanego przez agentów. Przed przyjęciem zobaczysz zakres skutków.",
    directionText: "Treść kierunku",
    provenanceInput: "Źródło i uzasadnienie właściciela",
    saveDraft: "Zapisz propozycję",
    drafts: "Propozycje oczekujące",
    selectDraft: "Propozycja do podglądu",
    choose: "Wybierz…",
    preview: "Pokaż skutki",
    previewTitle: "Podgląd skutków",
    previewHelp: "Ten podgląd nie przyjmuje kierunku. Sprawdź poprzednią i proponowaną treść oraz powiązane rekordy, a potem osobno potwierdź przyjęcie.",
    previous: "Dotychczasowy kierunek",
    proposed: "Proponowany kierunek",
    affected: "Powiązane rekordy",
    examples: "Przykłady",
    consequences: "Oczekiwane skutki",
    none: "Brak",
    adopt: "Przyjmij tę wersję",
    history: "Historia kierunku",
    noHistory: "Nie ma jeszcze wcześniejszej przyjętej wersji.",
    created: "Utworzono",
    compare: "Porównaj zadanie lub decyzję",
    compareHelp: "Zapisz proponowany wynik i dowód względem bieżącej przyjętej wersji. Konflikt wymaga osobnej decyzji właściciela.",
    subjectType: "Rodzaj rekordu",
    task: "Zadanie",
    decision: "Decyzja",
    subjectId: "Identyfikator zadania lub decyzji",
    subjectHint: "Wybierz podpowiedź albo wklej identyfikator rekordu.",
    outcome: "Proponowany wynik",
    evidence: "Dowód lub podstawa oceny",
    assessment: "Ocena względem kierunku",
    aligned: "Zgodne",
    conflict: "Konflikt",
    saveComparison: "Zapisz porównanie",
    comparisons: "Porównania i wyjątki",
    noComparisons: "Nie ma jeszcze porównań dla tego kierunku.",
    confirmAligned: "Potwierdź zgodność",
    acceptException: "Przyjmij wyjątek",
    rejectException: "Odrzuć wyjątek",
    rationale: "Uzasadnienie decyzji",
    rationaleHint: "Wyjaśnij trade-off i powód decyzji właściciela.",
    resolved: "Rozstrzygnięto",
    prepared: "Potwierdzenie decyzji właściciela",
    proof: "Potwierdź hasłem dokładnie tę operację. Przyjęcie kierunku lub wyjątku zostanie zapisane dopiero po potwierdzeniu.",
    password: "Obecne hasło",
    confirm: "Potwierdź i zapisz",
    cancel: "Anuluj",
    savedDraft: "Propozycja zapisana. Obecny kierunek pozostaje bez zmian.",
    savedComparison: "Porównanie zapisane.",
    savedAdoption: "Nowy kierunek przyjęty.",
    savedResolution: "Decyzja o porównaniu zapisana.",
    changed: "Stan zmienił się od podglądu. Odśwież i sprawdź go ponownie.",
    uncertain: "Nie udało się potwierdzić wyniku zapisu. Odczytaj aktualny stan przed kolejnym działaniem.",
    writeError: "Nie udało się zapisać operacji.",
    invalidPassword: "Hasło nie zostało potwierdzone.",
    countLabels: { goals: "Cele", projects: "Projekty", tasks: "Zadania", procedures: "Procedury", decisions: "Decyzje" },
    consequenceLabels: {
      review_linked_goals: "Sprawdź powiązane cele względem nowego kierunku.",
      review_linked_projects: "Sprawdź powiązane projekty i ich priorytety.",
      review_open_tasks: "Sprawdź otwarte zadania i ich zakres.",
      review_active_procedures: "Sprawdź aktywne procedury.",
      review_decisions: "Sprawdź decyzje i ich uzasadnienia.",
      decision_acceptance_requires_comparison: "Przyjęcie nowej decyzji wymaga aktualnego porównania z kierunkiem i rozstrzygnięcia przez właściciela.",
      revalidate_agent_ready: "Gotowość zadań agentów wymaga ponownej oceny."
    },
    statuses: { draft: "Propozycja", adopted: "Przyjęta", superseded: "Poprzednia", proposed: "Oczekuje", aligned: "Potwierdzona zgodność", exception_accepted: "Wyjątek przyjęty", exception_rejected: "Wyjątek odrzucony", stale: "Nieaktualne" }
  },
  en: {
    heading: "Company direction",
    description: "A private direction adopted by the owner. Projects, tasks and decisions can be compared with the current version; numeric goals remain separate.",
    refresh: "Refresh",
    loading: "Loading company direction",
    loadError: "Company direction could not be loaded.",
    forbidden: "Owner access is required for this view.",
    empty: "No company direction has been adopted yet.",
    current: "Current direction",
    adopted: "Adopted",
    provenance: "Provenance",
    version: "Version",
    newDraft: "New direction proposal",
    draftHelp: "Saving a proposal does not change the direction used by agents. You will review the affected scope before adoption.",
    directionText: "Direction text",
    provenanceInput: "Owner source and rationale",
    saveDraft: "Save proposal",
    drafts: "Pending proposals",
    selectDraft: "Proposal to preview",
    choose: "Choose…",
    preview: "Preview impact",
    previewTitle: "Impact preview",
    previewHelp: "This preview does not adopt the direction. Review the previous and proposed text and linked records, then confirm adoption separately.",
    previous: "Previous direction",
    proposed: "Proposed direction",
    affected: "Linked records",
    examples: "Examples",
    consequences: "Expected consequences",
    none: "None",
    adopt: "Adopt this version",
    history: "Direction history",
    noHistory: "There is no previous adopted version yet.",
    created: "Created",
    compare: "Compare a task or decision",
    compareHelp: "Record the proposed outcome and evidence against the current adopted version. A conflict needs a separate owner decision.",
    subjectType: "Record type",
    task: "Task",
    decision: "Decision",
    subjectId: "Task or decision identifier",
    subjectHint: "Choose a suggestion or paste the record identifier.",
    outcome: "Proposed outcome",
    evidence: "Evidence or assessment basis",
    assessment: "Assessment against direction",
    aligned: "Aligned",
    conflict: "Conflict",
    saveComparison: "Save comparison",
    comparisons: "Comparisons and exceptions",
    noComparisons: "No comparisons have been recorded for this direction.",
    confirmAligned: "Confirm alignment",
    acceptException: "Accept exception",
    rejectException: "Reject exception",
    rationale: "Decision rationale",
    rationaleHint: "Explain the trade-off and the owner's reason.",
    resolved: "Resolved",
    prepared: "Confirm owner decision",
    proof: "Confirm this exact operation with your password. Adoption or an exception is recorded only after confirmation.",
    password: "Current password",
    confirm: "Confirm and save",
    cancel: "Cancel",
    savedDraft: "Proposal saved. Current direction is unchanged.",
    savedComparison: "Comparison saved.",
    savedAdoption: "New direction adopted.",
    savedResolution: "Comparison decision saved.",
    changed: "The state changed after preview. Refresh and inspect it again.",
    uncertain: "The write result could not be confirmed. Read the current state before another action.",
    writeError: "The operation could not be saved.",
    invalidPassword: "Password confirmation failed.",
    countLabels: { goals: "Goals", projects: "Projects", tasks: "Tasks", procedures: "Procedures", decisions: "Decisions" },
    consequenceLabels: {
      review_linked_goals: "Review linked goals against the new direction.",
      review_linked_projects: "Review linked projects and priorities.",
      review_open_tasks: "Review open tasks and their scope.",
      review_active_procedures: "Review active procedures.",
      review_decisions: "Review decisions and their rationale.",
      decision_acceptance_requires_comparison: "Accepting a new decision requires a current comparison with the direction and an owner resolution.",
      revalidate_agent_ready: "Agent task readiness needs reassessment."
    },
    statuses: { draft: "Proposal", adopted: "Adopted", superseded: "Previous", proposed: "Pending", aligned: "Alignment confirmed", exception_accepted: "Exception accepted", exception_rejected: "Exception rejected", stale: "Stale" }
  }
};

async function bodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function shortId(id: string) { return id.slice(0, 8); }
function date(value: string) { return formatAppDate(value, { dateStyle: "medium", timeStyle: "short" }); }

export function CompanyDirectionPanel({ tasks, decisions }: {
  tasks: Array<{ id: string; title: string }>;
  decisions: Array<{ id: string; title: string }>;
}) {
  const { locale, t } = useLanguage();
  const c = copy[locale === "pl" ? "pl" : "en"];
  const [refresh, setRefresh] = useState(0);
  const packet = useOwnerPacket<DirectionPacket>("/v1/strategy/direction", true, t, refresh);
  const data = packet.data;
  const versions = data?.versions || [];
  const current = data?.current || null;
  const drafts = versions.filter(item => item.status === "draft");
  const previous = versions.filter(item => item.status === "superseded").sort((a, b) => b.version - a.version);
  const [text, setText] = useState("");
  const [provenance, setProvenance] = useState("");
  const [draftId, setDraftId] = useState("");
  const selectedDraft = drafts.find(item => item.id === draftId) || null;
  const [preview, setPreview] = useState<ImpactPreview | null>(null);
  const [subjectType, setSubjectType] = useState<"task" | "decision">("task");
  const [subjectId, setSubjectId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [evidence, setEvidence] = useState("");
  const [assessment, setAssessment] = useState<"aligned" | "conflict">("aligned");
  const [resolutionRationale, setResolutionRationale] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const [prepared, setPrepared] = useState<PreparedAction | null>(null);
  const [proofError, setProofError] = useState("");
  const options = subjectType === "task" ? tasks : decisions;
  const previewCurrent = Boolean(preview && selectedDraft && preview.draftId === selectedDraft.id
    && preview.expectedCurrentId === (current?.id ?? null));

  function reload() { setPreview(null); setPrepared(null); setNotice(null); setRefresh(value => value + 1); }
  function showError(error: unknown) {
    if (error instanceof AppApiError && error.status === 409) {
      setPreview(null);
      setNotice({ tone: "warning", text: c.changed });
      setRefresh(value => value + 1);
    } else if (error instanceof AppApiError && error.code === "network_error") {
      setNotice({ tone: "warning", text: c.uncertain });
      setRefresh(value => value + 1);
    } else {
      setNotice({ tone: "error", text: error instanceof AppApiError && error.status === 403 ? c.forbidden : c.writeError });
    }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !text.trim() || !provenance.trim()) return;
    setBusy(true); setNotice(null);
    try {
      const response = await api<{ data: DirectionVersion }>("/v1/strategy/direction/drafts", {
        method: "POST", body: JSON.stringify({ text: text.trim(), provenance: provenance.trim() })
      });
      setText(""); setProvenance(""); setDraftId(response.data.id); setPreview(null);
      setNotice({ tone: "success", text: c.savedDraft });
      setRefresh(value => value + 1);
    } catch (error) { showError(error); } finally { setBusy(false); }
  }

  async function getPreview() {
    if (busy || !selectedDraft) return;
    setBusy(true); setNotice(null); setPreview(null);
    try {
      const response = await api<{ data: ImpactPreview }>(`/v1/strategy/direction/drafts/${encodeURIComponent(selectedDraft.id)}/preview`, {
        method: "POST", body: JSON.stringify({})
      });
      setPreview(response.data);
    } catch (error) { showError(error); } finally { setBusy(false); }
  }

  function prepareAdoption() {
    if (!previewCurrent || !preview || !selectedDraft || busy) return;
    setProofError("");
    setPrepared({
      kind: "adopt",
      path: `/v1/strategy/direction/drafts/${encodeURIComponent(selectedDraft.id)}/adopt`,
      body: JSON.stringify({ previewId: preview.previewId, expectedCurrentId: preview.expectedCurrentId, impactDigest: preview.impactDigest }),
      label: c.adopt
    });
  }

  async function createComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !current || !subjectId.trim() || !outcome.trim() || !evidence.trim()) return;
    setBusy(true); setNotice(null);
    try {
      await api("/v1/strategy/direction/comparisons", {
        method: "POST", body: JSON.stringify({ subjectType, subjectId: subjectId.trim(), outcome: outcome.trim(), evidence: evidence.trim(), assessment })
      });
      setSubjectId(""); setOutcome(""); setEvidence("");
      setNotice({ tone: "success", text: c.savedComparison });
      setRefresh(value => value + 1);
    } catch (error) { showError(error); } finally { setBusy(false); }
  }

  function prepareResolution(item: Comparison, action: ComparisonAction) {
    if (busy || !current) return;
    const rationale = resolutionRationale[item.id]?.trim() || "";
    if (!rationale) return;
    setProofError("");
    setPrepared({
      kind: "resolve",
      path: `/v1/strategy/direction/comparisons/${encodeURIComponent(item.id)}/actions/resolve`,
      body: JSON.stringify({ action, rationale }),
      label: action === "confirm_aligned" ? c.confirmAligned : action === "accept_exception" ? c.acceptException : c.rejectException
    });
  }

  async function confirmPrepared(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared || busy) return;
    const password = String(new FormData(event.currentTarget).get("ownerPassword") || "");
    if (!password) return;
    setBusy(true); setProofError(""); setNotice(null);
    try {
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", {
        method: "POST", body: JSON.stringify({ password, method: "POST", path: prepared.path, bodyDigest: await bodyDigest(prepared.body) })
      });
      await api(prepared.path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      setNotice({ tone: "success", text: prepared.kind === "adopt" ? c.savedAdoption : c.savedResolution });
      if (prepared.kind === "adopt") { setDraftId(""); setPreview(null); }
      setPrepared(null);
      setRefresh(value => value + 1);
    } catch (error) {
      if (error instanceof AppApiError && error.code === "invalid_credentials") setProofError(c.invalidPassword);
      else {
        setPrepared(null);
        showError(error);
      }
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="company-direction-title" className="roost-work-surface rounded-company p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-black text-company-ink" id="company-direction-title">{c.heading}</h2><p className="mt-1 max-w-3xl text-sm text-company-muted">{c.description}</p></div>
      <CcButton size="sm" variant="outline" onClick={reload} disabled={busy || packet.status === "loading"}>{c.refresh}</CcButton>
    </div>
    {notice ? <div className="mt-4"><CcNotice tone={notice.tone} title={notice.text} live /></div> : null}
    {packet.status === "loading" ? <div className="mt-4"><CcNotice tone="loading" title={c.loading} /></div> : null}
    {packet.status === "error" ? <div className="mt-4"><CcNotice tone="error" title={packet.error || c.loadError} live /></div> : null}
    {packet.status === "ready" ? <>
      <div className="mt-5 border-t border-base-300 pt-5">
        <h3 className="font-bold">{c.current}</h3>
        {current ? <div className="mt-2 grid gap-2 text-sm">
          <p className="whitespace-pre-wrap leading-6">{current.text}</p>
          <p className="text-company-muted">{c.version} {current.version} · {c.adopted} {current.adoptedAt ? date(current.adoptedAt) : "—"}</p>
          <p><strong>{c.provenance}:</strong> {current.provenance}</p>
        </div> : <p className="mt-2 text-sm text-company-muted">{c.empty}</p>}
      </div>

      <div className="mt-6 grid gap-6 border-t border-base-300 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="font-bold">{c.newDraft}</h3><p className="mt-1 text-sm text-company-muted">{c.draftHelp}</p>
          <form className="mt-4 grid gap-3" onSubmit={createDraft}>
            <CcField label={c.directionText} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-32 w-full" value={text} onChange={event => setText(event.target.value)} maxLength={4000} required disabled={busy} />}</CcField>
            <CcField label={c.provenanceInput} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={provenance} onChange={event => setProvenance(event.target.value)} maxLength={1000} required disabled={busy} />}</CcField>
            <div><CcButton type="submit" variant="primary" size="sm" loading={busy} disabled={!text.trim() || !provenance.trim()}>{c.saveDraft}</CcButton></div>
          </form>
        </div>
        <div className="min-w-0">
          <h3 className="font-bold">{c.drafts}</h3>
          {drafts.length ? <div className="mt-4 grid gap-3">
            <CcField label={c.selectDraft}>{({ id }) => <CcSelect id={id} value={draftId} onChange={event => { setDraftId(event.target.value); setPreview(null); }} disabled={busy}><option value="">{c.choose}</option>{drafts.map(item => <option key={item.id} value={item.id}>{c.created} {date(item.createdAt)} · {shortId(item.id)}</option>)}</CcSelect>}</CcField>
            {selectedDraft ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{selectedDraft.text}</p> : null}
            {selectedDraft ? <p className="text-xs text-company-muted">{c.provenance}: {selectedDraft.provenance}</p> : null}
            <div><CcButton size="sm" variant="outline" onClick={() => void getPreview()} disabled={!selectedDraft || busy} loading={busy}>{c.preview}</CcButton></div>
          </div> : <p className="mt-3 text-sm text-company-muted">{c.none}</p>}
        </div>
      </div>

      {preview && selectedDraft && preview.draftId === selectedDraft.id ? <div className="mt-6 border-t border-base-300 pt-5">
        <h3 className="font-bold">{c.previewTitle}</h3><p className="mt-1 text-sm text-company-muted">{c.previewHelp}</p>
        {!previewCurrent ? <div className="mt-3"><CcNotice tone="warning" title={c.changed} /></div> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="min-w-0 border-l-2 border-base-300 pl-3"><h4 className="text-sm font-bold">{c.previous}</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm">{current?.text || c.none}</p></div>
          <div className="min-w-0 border-l-2 border-primary pl-3"><h4 className="text-sm font-bold">{c.proposed}</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm">{selectedDraft.text}</p></div>
        </div>
        <h4 className="mt-5 text-sm font-bold">{c.affected}</h4>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(preview.counts).map(([key, count]) => <div key={key} className="border-l border-base-300 pl-3"><dt className="text-xs text-company-muted">{c.countLabels[key as keyof typeof c.countLabels] || key}</dt><dd className="font-bold tabular-nums">{count}</dd></div>)}</dl>
        {Object.entries(preview.examples).some(([, items]) => items.length) ? <div className="mt-4"><h4 className="text-sm font-bold">{c.examples}</h4><ul className="mt-2 grid gap-1 text-sm">{Object.entries(preview.examples).flatMap(([key, items]) => items.map(item => <li key={`${key}:${item.id}`}><span className="text-company-muted">{c.countLabels[key as keyof typeof c.countLabels] || key}:</span> {item.title} <span className="font-mono text-xs text-company-muted">({shortId(item.id)})</span></li>))}</ul></div> : null}
        <h4 className="mt-5 text-sm font-bold">{c.consequences}</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{preview.consequences.map((item, index) => <li key={index}>{c.consequenceLabels[item as keyof typeof c.consequenceLabels] || item}</li>)}</ul>
        <div className="mt-5"><CcButton variant="primary" onClick={prepareAdoption} disabled={!previewCurrent || busy}>{c.adopt}</CcButton></div>
      </div> : null}

      <div className="mt-6 border-t border-base-300 pt-5">
        <h3 className="font-bold">{c.history}</h3>
        {previous.length ? <ol className="mt-3 divide-y divide-base-300">{previous.map(item => <li key={item.id} className="grid gap-1 py-3 text-sm"><strong>{c.version} {item.version} · {item.adoptedAt ? date(item.adoptedAt) : date(item.createdAt)}</strong><p className="whitespace-pre-wrap break-words">{item.text}</p><p className="text-xs text-company-muted">{c.provenance}: {item.provenance}</p></li>)}</ol> : <p className="mt-2 text-sm text-company-muted">{c.noHistory}</p>}
      </div>

      <div className="mt-6 border-t border-base-300 pt-5">
        <h3 className="font-bold">{c.compare}</h3><p className="mt-1 text-sm text-company-muted">{c.compareHelp}</p>
        {current ? <form className="mt-4 grid gap-3" onSubmit={createComparison}>
          <div className="grid gap-3 md:grid-cols-2">
            <CcField label={c.subjectType}>{({ id }) => <CcSelect id={id} value={subjectType} disabled={busy} onChange={event => { setSubjectType(event.target.value as "task" | "decision"); setSubjectId(""); }}><option value="task">{c.task}</option><option value="decision">{c.decision}</option></CcSelect>}</CcField>
            <CcField label={c.subjectId} hint={c.subjectHint} required>{({ id }) => <><input id={id} list="company-direction-subjects" className="input input-bordered w-full" value={subjectId} onChange={event => setSubjectId(event.target.value)} required disabled={busy} /><datalist id="company-direction-subjects">{options.map(item => <option key={item.id} value={item.id} label={item.title} />)}</datalist></>}</CcField>
          </div>
          {options.find(item => item.id === subjectId) ? <p className="text-sm font-semibold">{options.find(item => item.id === subjectId)?.title}</p> : null}
          <CcField label={c.outcome} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={outcome} onChange={event => setOutcome(event.target.value)} maxLength={2000} required disabled={busy} />}</CcField>
          <CcField label={c.evidence} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={4000} required disabled={busy} />}</CcField>
          <CcField label={c.assessment}>{({ id }) => <CcSelect id={id} value={assessment} onChange={event => setAssessment(event.target.value as "aligned" | "conflict")} disabled={busy}><option value="aligned">{c.aligned}</option><option value="conflict">{c.conflict}</option></CcSelect>}</CcField>
          <div><CcButton type="submit" variant="primary" size="sm" loading={busy} disabled={!subjectId.trim() || !outcome.trim() || !evidence.trim()}>{c.saveComparison}</CcButton></div>
        </form> : <p className="mt-3 text-sm text-company-muted">{c.empty}</p>}
      </div>

      <div className="mt-6 border-t border-base-300 pt-5">
        <h3 className="font-bold">{c.comparisons}</h3>
        {data?.comparisons.length ? <ol className="mt-3 divide-y divide-base-300">{data.comparisons.map(item => <li className="grid gap-2 py-4 text-sm" key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-2"><strong>{item.subjectTitle || item.subjectId}</strong><span className="badge badge-outline">{item.currentEvidence ? c.statuses[item.status as keyof typeof c.statuses] || item.status : `${c.statuses[item.status as keyof typeof c.statuses] || item.status} · ${c.statuses.stale}`}</span></div>
          <p className="text-xs text-company-muted">{item.subjectType === "task" ? c.task : c.decision} · {shortId(item.subjectId)} · {c.version} {versions.find(version => version.id === item.directionVersionId)?.version ?? shortId(item.directionVersionId)} · {date(item.createdAt)} · {item.assessment === "aligned" ? c.aligned : c.conflict}</p>
          <p><strong>{c.outcome}:</strong> {item.outcome}</p><p><strong>{c.evidence}:</strong> {item.evidence}</p>
          {item.exceptionRationale ? <p><strong>{c.rationale}:</strong> {item.exceptionRationale}</p> : null}
          {item.decidedAt ? <p className="text-xs text-company-muted">{c.resolved}: {date(item.decidedAt)}</p> : null}
          {!item.currentEvidence ? <CcNotice tone="warning" title={c.changed} /> : null}
          {item.status === "proposed" && item.currentEvidence ? <div className="mt-1 grid gap-2">
            <CcField label={c.rationale} hint={c.rationaleHint} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={resolutionRationale[item.id] || ""} onChange={event => setResolutionRationale(value => ({ ...value, [item.id]: event.target.value }))} maxLength={2000} disabled={busy} />}</CcField>
            <div className="flex flex-wrap gap-2">{item.assessment === "aligned"
              ? <CcButton size="sm" variant="outline" onClick={() => prepareResolution(item, "confirm_aligned")} disabled={!resolutionRationale[item.id]?.trim() || busy}>{c.confirmAligned}</CcButton>
              : <><CcButton size="sm" variant="warning" onClick={() => prepareResolution(item, "accept_exception")} disabled={!resolutionRationale[item.id]?.trim() || busy}>{c.acceptException}</CcButton><CcButton size="sm" variant="outline" onClick={() => prepareResolution(item, "reject_exception")} disabled={!resolutionRationale[item.id]?.trim() || busy}>{c.rejectException}</CcButton></>}</div>
          </div> : null}
        </li>)}</ol> : <p className="mt-2 text-sm text-company-muted">{c.noComparisons}</p>}
      </div>
    </> : null}
    {prepared ? <CcRecordEditorModal titleId="company-direction-proof-title" eyebrow={c.heading} title={prepared.label} description={c.proof} closeLabel={c.cancel} onClose={() => { if (!busy) { setPrepared(null); setProofError(""); } }} onSubmit={event => void confirmPrepared(event)} actions={<><CcButton variant="ghost" onClick={() => { setPrepared(null); setProofError(""); }} disabled={busy}>{c.cancel}</CcButton><CcButton variant="primary" type="submit" loading={busy}>{c.confirm}</CcButton></>}>
      {proofError ? <CcNotice tone="error" title={proofError} live /> : null}
      {prepared.kind === "adopt" && selectedDraft ? <p className="whitespace-pre-wrap text-sm">{selectedDraft.text}</p> : null}
      <CcField label={c.password} required>{({ id }) => <input id={id} name="ownerPassword" type="password" autoComplete="current-password" className="input input-bordered w-full" required disabled={busy} />}</CcField>
    </CcRecordEditorModal> : null}
  </section>;
}
