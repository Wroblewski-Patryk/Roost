import { useRef, useState } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

export type SpecialistOffer = {
  id: string;
  parentTaskId: string;
  childTaskId: string;
  specialistId: string;
  scope: string[];
  outcome: string;
  contract: Record<string, unknown>;
  budgetCeiling: Record<string, number>;
  status: "pending" | "accepted" | "rejected";
  decision: { id: string; decision: "accept" | "reject"; reason: string | null; createdAt: string } | null;
};

export type SpecialistOfferState =
  | { kind: "loading" | "none" | "error" }
  | { kind: "offer"; offer: SpecialistOffer; expectedVersion: string; canDecide: boolean; canSubmit: boolean };

export function isSpecialistOfferData(value: unknown, taskId: string): value is Omit<Extract<SpecialistOfferState, { kind: "offer" }>, "kind"> {
  if (!value || typeof value !== "object") return false;
  const view = value as Record<string, unknown>;
  const offer = view.offer;
  if (!offer || typeof offer !== "object") return false;
  const row = offer as Record<string, unknown>;
  const budget = row.budgetCeiling;
  return typeof view.expectedVersion === "string" && typeof view.canDecide === "boolean" && typeof view.canSubmit === "boolean"
    && ["id", "parentTaskId", "childTaskId", "specialistId", "outcome"].every(key => typeof row[key] === "string" && Boolean(row[key]))
    && row.childTaskId === taskId && ["pending", "accepted", "rejected"].includes(String(row.status))
    && Array.isArray(row.scope) && row.scope.every(item => typeof item === "string")
    && budget !== null && typeof budget === "object" && !Array.isArray(budget)
    && row.contract !== null && typeof row.contract === "object" && !Array.isArray(row.contract)
    && Object.values(budget).every(amount => typeof amount === "number" && Number.isFinite(amount))
    && (row.decision === null || Boolean(row.decision && typeof row.decision === "object"
      && typeof (row.decision as Record<string, unknown>).createdAt === "string"));
}

const copy = {
  en: {
    title: "Specialist offer", pending: "Awaiting specialist response", accepted: "Accepted by specialist", rejected: "Refused by specialist",
    parent: "Accountable parent task", child: "Specialist child task", recipient: "Exact specialist recipient", scope: "Bounded scope", outcome: "Expected outcome", ceiling: "Budget ceiling",
    maxAttempts: "Maximum attempts", maxDurationSeconds: "Maximum duration (seconds)", maxOutputTokens: "Configured output tokens",
    fullContract: "Full offered contract",
    ownerApproval: "Acceptance confirms the specialist's handoff. The owner must review the selected sources for this child task and separately approve its contract and budget through Ready Submit. Parent source approvals do not transfer. Roost does not measure provider tokens or cost, and the provider may not enforce the output token setting.",
    blocked: "Ready Submit remains unavailable until the exact specialist accepts this offer and the owner approves the child contract.",
    accept: "Accept offer", reject: "Refuse offer", reason: "Reason for refusal", recordReject: "Record refusal", cancel: "Cancel refusal", refresh: "Refresh offer",
    loading: "Loading specialist offer…", error: "The specialist offer could not be confirmed. Refresh before submitting this task.", actionError: "The offer decision was not recorded. Refresh and check its current version.", saved: "Offer decision recorded. Ready approval remains separate."
  },
  pl: {
    title: "Propozycja dla specjalisty", pending: "Oczekuje na odpowiedź specjalisty", accepted: "Przyjęta przez specjalistę", rejected: "Odmówiona przez specjalistę",
    parent: "Odpowiedzialne zadanie nadrzędne", child: "Zadanie podrzędne specjalisty", recipient: "Dokładny odbiorca — specjalista", scope: "Ograniczony zakres", outcome: "Oczekiwany wynik", ceiling: "Górny limit budżetu",
    maxAttempts: "Maksymalna liczba prób", maxDurationSeconds: "Maksymalny czas (sekundy)", maxOutputTokens: "Skonfigurowane tokeny wyjścia",
    fullContract: "Pełny proponowany kontrakt",
    ownerApproval: "Przyjęcie potwierdza odbiór pracy przez specjalistę. Właściciel sprawdza wybrane źródła osobno dla tego zadania podrzędnego oraz zatwierdza jego kontrakt i budżet przez Zgłoś w panelu Ready. Zatwierdzenia źródeł rodzica nie przechodzą na dziecko. Roost nie mierzy tokenów ani kosztu dostawcy, który może nie egzekwować ustawienia tokenów wyjścia.",
    blocked: "Zgłoszenie Ready pozostaje niedostępne, dopóki dokładnie wskazany specjalista nie przyjmie propozycji, a właściciel nie zatwierdzi kontraktu zadania podrzędnego.",
    accept: "Przyjmij propozycję", reject: "Odmów propozycji", reason: "Powód odmowy", recordReject: "Zapisz odmowę", cancel: "Anuluj odmowę", refresh: "Odśwież propozycję",
    loading: "Wczytywanie propozycji dla specjalisty…", error: "Nie udało się potwierdzić propozycji dla specjalisty. Odśwież przed zgłoszeniem zadania.", actionError: "Decyzja nie została zapisana. Odśwież propozycję i sprawdź jej aktualną wersję.", saved: "Decyzja została zapisana. Zatwierdzenie Ready pozostaje osobne."
  }
};

const taskLink = (taskId: string) => `/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(taskId)}`;

export function TaskSpecialistOffer({ taskId, state, onRefresh, onSaved }: { taskId: string; state: SpecialistOfferState; onRefresh: () => Promise<void>; onSaved?: () => void }) {
  const { locale } = useLanguage();
  const c = copy[locale === "pl" ? "pl" : "en"];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const request = useRef<{ body: string; id: string } | null>(null);

  async function decide(decision: "accept" | "reject") {
    if (state.kind !== "offer" || !state.canDecide || state.offer.status !== "pending" || busy || (decision === "reject" && (reason.trim().length < 3 || reason.trim().length > 1000))) return;
    const input = { expectedVersion: state.expectedVersion, decision, ...(decision === "reject" ? { reason: reason.trim() } : {}) };
    const body = JSON.stringify(input);
    if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() };
    setBusy(true); setError(false); setSaved(false);
    try {
      await api(`/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/specialist-offer/actions/${decision}`, { method: "POST", body: JSON.stringify({ ...input, requestId: request.current.id }) });
      request.current = null;
      setRejecting(false); setReason("");
      await onRefresh();
      setSaved(true); onSaved?.();
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  if (state.kind === "none") return null;
  if (state.kind === "loading") return <CcNotice tone="loading" title={c.loading} />;
  if (state.kind === "error") return <CcNotice tone="error" title={c.error} live><CcButton size="sm" variant="outline" onClick={() => void onRefresh()}>{c.refresh}</CcButton></CcNotice>;
  const { offer } = state;
  return <section className="grid min-w-0 gap-4 border-b border-base-300 pb-5" aria-label={c.title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{c.title}</h3><span className={`badge ${offer.status === "accepted" ? "badge-success" : offer.status === "rejected" ? "badge-error" : "badge-warning"}`}>{c[offer.status]}</span></div>
    {error ? <CcNotice tone="error" title={c.actionError} live /> : saved ? <CcNotice tone="success" title={c.saved} live /> : null}
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-company-muted">{c.parent}</dt><dd><a className="link break-all" href={taskLink(offer.parentTaskId)}>{offer.parentTaskId}</a></dd></div>
      <div><dt className="text-company-muted">{c.child}</dt><dd><a className="link break-all" href={taskLink(offer.childTaskId)}>{offer.childTaskId}</a></dd></div>
      <div><dt className="text-company-muted">{c.recipient}</dt><dd className="break-all font-mono">{offer.specialistId}</dd></div>
      <div><dt className="text-company-muted">{c.outcome}</dt><dd className="whitespace-pre-wrap break-words">{offer.outcome}</dd></div>
    </dl>
    <div><h4 className="text-sm font-semibold">{c.scope}</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{offer.scope.map((item, index) => <li key={`${index}-${item}`} className="break-words">{item}</li>)}</ul></div>
    <div><h4 className="text-sm font-semibold">{c.ceiling}</h4><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">{Object.entries(offer.budgetCeiling).map(([key, value]) => <div key={key}><dt className="text-company-muted">{c[key as keyof typeof c] ?? key}</dt><dd>{value}</dd></div>)}</dl></div>
    <details><summary className="cursor-pointer text-sm font-semibold">{c.fullContract}</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-base-200 p-3 text-xs">{JSON.stringify(offer.contract, null, 2)}</pre></details>
    {offer.decision ? <p className="text-sm">{new Date(offer.decision.createdAt).toLocaleString(locale)}{offer.decision.reason ? ` · ${offer.decision.reason}` : ""}</p> : null}
    <CcNotice tone="info" title={c.ownerApproval} />
    {!state.canSubmit ? <p className="text-sm text-company-muted">{c.blocked}</p> : null}
    {state.canDecide && offer.status === "pending" ? <div className="grid gap-3">
      {rejecting ? <CcField label={c.reason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" minLength={3} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} />}</CcField> : null}
      <div className="flex flex-wrap gap-2"><CcButton variant="primary" disabled={busy || rejecting} onClick={() => void decide("accept")}>{c.accept}</CcButton>{rejecting ? <><CcButton variant="warning" disabled={busy || reason.trim().length < 3 || reason.trim().length > 1000} onClick={() => void decide("reject")}>{c.recordReject}</CcButton><CcButton variant="ghost" disabled={busy} onClick={() => { setRejecting(false); setReason(""); }}>{c.cancel}</CcButton></> : <CcButton variant="outline" disabled={busy} onClick={() => setRejecting(true)}>{c.reject}</CcButton>}</div>
    </div> : null}
    <CcButton size="sm" variant="outline" disabled={busy} onClick={() => void onRefresh()}>{c.refresh}</CcButton>
  </section>;
}
