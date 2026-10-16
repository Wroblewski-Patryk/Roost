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
import { humanizeBusinessValue } from "./shared";

type Version = { id: string; version: number | null; status: string; result: string; metric: string; unit: string;
  targetValue: number; evidenceSource: string; accountableUserId: string; bindingDeadline: string | null;
  forecastDate: string | null; forecastBasis: string | null; executionSchedule: string | null;
  provenance: string; adoptedAt: string | null; createdAt: string };
type Measurement = { id: string; versionId: string; value: number; note: string; observedAt: string;
  status: string; evidenceCurrent: boolean; evidenceId: string; taskId: string | null;
  source: { id: string; entityType: string; entityId: string; reference: string | null;
    url: string | null; verificationStatus: string } | null };
type Execution = { id: string; taskId: string; status: string; attempt: number | null;
  elapsedMs: number | null; modelCost: number | null; providerInputTokens: number | null;
  providerOutputTokens: number | null; startedAt: string | null; completedAt: string | null;
  mandateVersionIdAtQueue: string | null };
type Packet = { goal: { id: string; title: string; status: string }; current: Version | null;
  accountableCurrent: boolean | null;
  versions: Version[]; measurements: Measurement[]; progressStatus: string;
  measurementRowsOmittedCount: number; taskRowsOmittedCount: number;
  progress: { value: number; observedAt: string; evidenceId: string; measurementId: string; versionId: string } | null;
  tasks: Array<{ id: string; title: string; status: string; estimatedDurationMinutes: number | null }>;
  economics: { executions: Execution[]; attemptCount: number; executionRowsOmittedCount: number; acceptedOutcomeCount: number;
    reviewReturnCount: number; observedExecutionElapsedMs: number | null; elapsedUnknownCount: number;
    observedModelCost: number | null; modelCostUnknownCount: number; humanEffortMinutes: number | null;
    providerInputTokens: number | null; providerOutputTokens: number | null;
    historicalUnknownAttributionCount: number } };
type Member = { userId: string; name: string | null; email: string; role: string; taskScopeId: string | null };
type EvidenceOption = { id: string; reference: string; observedAt: string; verificationStatus: string };
type Preview = { previewId: string; expectedCurrentId: string | null; impactDigest: string; expiresAt: string;
  counts: Record<string, number>; examples: Record<string, Array<{ id: string; title: string }>>; effects: string[] };
type RetirementPreview = { goal: { id: string; title: string; status: string };
  head: { id: string; currentVersionId: string } | null; version: { id: string; version: number; status: string } | null;
  impact: { tasks: Array<{ id: string; title: string; status: string; source: string | null;
    externalId: string | null; readiness: string | null }>; targetCount: number; childGoalCount: number;
    measurementCount: number; executionCount: number; activeExecutionCount: number };
  blockers: string[]; digest: string; previewToken: string; expiresAt: string };
type DraftForm = { result: string; metric: string; unit: string; targetValue: string; evidenceSource: string;
  accountableUserId: string; bindingDeadline: string; forecastDate: string; forecastBasis: string;
  executionSchedule: string; provenance: string };
const emptyDraft: DraftForm = { result: "", metric: "", unit: "", targetValue: "", evidenceSource: "",
  accountableUserId: "", bindingDeadline: "", forecastDate: "", forecastBasis: "", executionSchedule: "", provenance: "" };

const copy = {
  pl: { title: "Wynik i ekonomika celu", close: "Zamknij", refresh: "Odśwież", loading: "Wczytywanie celu",
    failed: "Nie udało się odczytać celu.", unknown: "Nieznane", empty: "Nie ma jeszcze przyjętego mierzalnego wyniku.",
    legacy: "Dawne wartości Target i Metric nie są potwierdzonym pomiarem postępu.", current: "Przyjęty wynik",
    drafts: "Propozycje", history: "Historia wersji", newDraft: "Nowa propozycja", result: "Mierzalny wynik",
    metric: "Miernik", unit: "Jednostka", target: "Wartość docelowa", source: "Źródło dowodu",
    accountable: "Osoba odpowiedzialna", deadline: "Wiążący termin", forecast: "Prognozowana data",
    forecastBasis: "Podstawa prognozy", schedule: "Plan wykonania", provenance: "Podstawa decyzji",
    saveDraft: "Zapisz propozycję", selectDraft: "Wybierz propozycję", preview: "Pokaż skutki",
    previewTitle: "Podgląd skutków", previous: "Obecna wersja", proposed: "Propozycja",
    affected: "Powiązane rekordy", effects: "Skutki", adopt: "Przyjmij wynik", proof: "Potwierdź tę dokładną zmianę hasłem.",
    password: "Obecne hasło", confirm: "Potwierdź i zapisz", cancel: "Anuluj",
    progress: "Postęp z aktualnego dowodu", noProgress: "Brak aktualnego, zaakceptowanego pomiaru.",
    stale: "Ostatnio przyjęty pomiar utracił aktualny dowód; postęp pozostaje nieznany.",
    measurement: "Nowy pomiar", evidenceId: "Zweryfikowany dowód", task: "Powiązane zadanie",
    goalEvidence: "Dowód celu", value: "Zaobserwowana wartość", observed: "Zaobserwowano", note: "Opis pomiaru",
    saveMeasurement: "Zapisz pomiar", measurements: "Pomiary i decyzje", accept: "Przyjmij", reject: "Odrzuć",
    evidenceCurrent: "Aktualny dowód", evidenceStale: "Dowód zmieniony lub nieweryfikowany",
    tasks: "Powiązane zadania", openTask: "Otwórz zadanie", plannedDuration: "Planowany czas zadania", economics: "Praca i koszt",
    attempts: "Próby", accepted: "Przyjęte wyniki", returns: "Zwroty do wykonawcy",
    elapsed: "Zmierzony czas wykonania Workera", effort: "Praca człowieka", cost: "Koszt modelu",
    tokens: "Tokeny dostawcy", executions: "Wykonania", noExecutions: "Brak przypisanych wykonań.",
    elapsedNote: "Czas Workera nie jest czasem pracy człowieka.", unknownAttribution: "Historyczne wykonania bez pewnego przypisania",
    omitted: "Pozostałe rekordy poza tym widokiem",
    missingAccountable: "Osoba odpowiedzialna utraciła uprawnione członkostwo. Przyjmij nową wersję z aktualną osobą; agent nie otrzyma tego mandatu.",
    saved: "Zapisano. Odczytaj nowy stan.", changed: "Stan zmienił się. Odśwież i sprawdź ponownie.",
    uncertain: "Wynik zapisu jest niepewny. Odczytaj stan przed kolejnym działaniem.",
    error: "Nie udało się wykonać operacji.", noMembers: "Brak uprawnionej osoby odpowiedzialnej.",
    retire: "Usuń z bieżącej Strategii", retirementTitle: "Wycofanie celu", retirementDescription: "Sprawdź powiązania przed wycofaniem. Cel przejdzie do Historii jako zarchiwizowany, nie jako osiągnięty.",
    retirementLoading: "Sprawdzanie skutków wycofania", retirementFailed: "Nie udało się pobrać aktualnego podglądu skutków.",
    retirementGoal: "Cel", retirementMandate: "Przyjęty mandat", retirementLinkedTasks: "Powiązane zadania",
    retirementNoTasks: "Brak powiązanych zadań.", retirementTaskPreserved: "Status powiązanych zadań i wpisy w ClickUp pozostaną bez zmian. Zadanie wymagające Ready utraci gotowość, a wycofany mandat nie uruchomi agenta.",
    retirementTrace: "Wersje mandatu, wcześniejsze wykonania i dowody pozostaną w historii.",
    retirementTargets: "Targety", retirementChildren: "Cele podrzędne", retirementMeasurements: "Pomiary", retirementExecutions: "Wykonania", retirementActive: "Aktywne wykonania",
    retirementBlockers: "Wycofanie jest zablokowane", retirementClear: "Brak blokujących zależności.",
    retirementReason: "Powód wycofania", retirementReasonHint: "Co sprawia, że ten cel nie powinien być już bieżący?",
    retirementPassword: "Obecne hasło", retirementConfirm: "Potwierdź wycofanie", retirementExpiry: "Podgląd ważny do", retirementReadiness: "Gotowość",
    retirementDone: "Cel jest w Historii. Mandat wycofano, a status powiązanych zadań pozostał bez zmian.",
    retirementUnknown: "Wynik wycofania jest niepewny. Sprawdź odczyt; ponowienie użyje tego samego żądania.",
    effectLabels: { "The accepted target and measurement source change only after separate owner confirmation.": "Cel i źródło pomiaru zmienią się dopiero po osobnym potwierdzeniu właściciela.",
      "Linked tasks must revalidate Ready before a new execution.": "Powiązane zadania muszą ponownie przejść Ready przed wykonaniem.",
      "Existing Target and Metric values remain legacy, unverified data; they do not establish progress.": "Dawne wartości Target i Metric pozostają niezweryfikowane; nie stanowią postępu." } },
  en: { title: "Goal outcome and economics", close: "Close", refresh: "Refresh", loading: "Loading goal",
    failed: "Could not load the goal.", unknown: "Unknown", empty: "No measurable outcome has been adopted yet.",
    legacy: "Legacy Target and Metric values are not verified progress measurements.", current: "Adopted outcome",
    drafts: "Proposals", history: "Version history", newDraft: "New proposal", result: "Measurable result",
    metric: "Metric", unit: "Unit", target: "Target value", source: "Evidence source",
    accountable: "Accountable person", deadline: "Binding deadline", forecast: "Forecast date",
    forecastBasis: "Forecast basis", schedule: "Execution schedule", provenance: "Decision basis",
    saveDraft: "Save proposal", selectDraft: "Select proposal", preview: "Preview impact",
    previewTitle: "Impact preview", previous: "Current version", proposed: "Proposed version",
    affected: "Linked records", effects: "Effects", adopt: "Adopt outcome", proof: "Confirm this exact change with your password.",
    password: "Current password", confirm: "Confirm and save", cancel: "Cancel",
    progress: "Progress from current evidence", noProgress: "No current, accepted measurement.",
    stale: "The last accepted measurement has lost current evidence; progress is unknown.",
    measurement: "New measurement", evidenceId: "Verified evidence", task: "Linked task",
    goalEvidence: "Goal evidence", value: "Observed value", observed: "Observed at", note: "Measurement note",
    saveMeasurement: "Save measurement", measurements: "Measurements and decisions", accept: "Accept", reject: "Reject",
    evidenceCurrent: "Current evidence", evidenceStale: "Evidence changed or unverified",
    tasks: "Linked tasks", openTask: "Open task", plannedDuration: "Planned task duration", economics: "Effort and cost",
    attempts: "Attempts", accepted: "Accepted outcomes", returns: "Returns to executor",
    elapsed: "Observed Worker elapsed time", effort: "Human effort", cost: "Model cost",
    tokens: "Provider tokens", executions: "Executions", noExecutions: "No attributed executions.",
    elapsedNote: "Worker elapsed time is not human effort.", unknownAttribution: "Historical executions without reliable attribution",
    omitted: "Additional records outside this view",
    missingAccountable: "The accountable person no longer has eligible membership. Adopt a new version with a current person; the agent will not receive this mandate.",
    saved: "Saved. Read back the new state.", changed: "State changed. Refresh and review it again.",
    uncertain: "The write result is uncertain. Read the current state before another action.",
    error: "Could not complete the operation.", noMembers: "No eligible accountable person.",
    retire: "Remove from current Strategy", retirementTitle: "Retire goal", retirementDescription: "Review the links before retiring this goal. It will move to History as archived, not achieved.",
    retirementLoading: "Checking retirement impact", retirementFailed: "Could not load the current impact preview.",
    retirementGoal: "Goal", retirementMandate: "Adopted mandate", retirementLinkedTasks: "Linked tasks",
    retirementNoTasks: "No linked tasks.", retirementTaskPreserved: "Linked task statuses and ClickUp records stay unchanged. Any Ready task loses readiness, and the retired mandate cannot launch an agent.",
    retirementTrace: "Mandate versions, previous executions and evidence remain in history.",
    retirementTargets: "Targets", retirementChildren: "Child goals", retirementMeasurements: "Measurements", retirementExecutions: "Executions", retirementActive: "Active executions",
    retirementBlockers: "Retirement is blocked", retirementClear: "No blocking dependencies.",
    retirementReason: "Retirement reason", retirementReasonHint: "Why should this goal leave the current Strategy?",
    retirementPassword: "Current password", retirementConfirm: "Confirm retirement", retirementExpiry: "Preview valid until", retirementReadiness: "Readiness",
    retirementDone: "Goal is in History. The mandate was retired and linked task statuses stayed unchanged.",
    retirementUnknown: "The retirement result is uncertain. Check the readback; retry will use the same request.",
    effectLabels: {} as Record<string, string> }
};

const retirementBlockerLabels: Record<string, [string, string]> = {
  already_archived: ["Cel jest już zarchiwizowany.", "Goal is already archived."],
  mandate_changed: ["Przyjęty mandat zmienił się lub nie jest dostępny.", "The adopted mandate changed or is unavailable."],
  active_child_goal: ["Istnieje bieżący cel podrzędny.", "A current child goal exists."],
  active_target: ["Istnieje bieżący Target.", "A current Target exists."],
  active_execution: ["Powiązane wykonanie nadal jest aktywne.", "A linked execution is still active."]
};
const retirementTaskStatuses: Record<string, [string, string]> = {
  todo: ["Do zrobienia", "To do"], in_progress: ["W toku", "In progress"],
  done: ["Zakończone", "Done"], blocked: ["Zablokowane", "Blocked"],
  cancelled: ["Anulowane", "Cancelled"], archived: ["Zarchiwizowane", "Archived"]
};
const retirementReadinessStatuses: Record<string, [string, string]> = {
  ready: ["Przyjęta", "Accepted"], needs_revalidation: ["Wymaga ponownego sprawdzenia", "Review required"],
  not_ready: ["Nieprzyjęta", "Not accepted"], draft: ["Szkic", "Draft"],
  needs_context: ["Wymaga kontekstu", "Needs context"], needs_decision: ["Wymaga decyzji", "Needs decision"]
};
function retirementValue(value: string, labels: Record<string, [string, string]>, locale: string) {
  return labels[value]?.[locale === "pl" ? 0 : 1] || humanizeBusinessValue(value, "—", locale === "pl" ? "pl" : "en");
}
function retirementSource(value: string, locale: string) {
  return value.toLowerCase() === "clickup" ? "ClickUp" : humanizeBusinessValue(value, "—", locale === "pl" ? "pl" : "en");
}

async function digest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function date(value: string | null | undefined) { return value ? formatAppDate(value, { dateStyle: "medium", timeStyle: "short" }) : "—"; }
function number(value: number | null | undefined, locale: string, unknown: string) {
  return value === null || value === undefined ? unknown : new Intl.NumberFormat(locale).format(value);
}
function versionSummary(item: Version, locale: string) { return `${item.result} · ${number(item.targetValue, locale, "—")} ${item.unit} (${item.metric})`; }

export function GoalMandatePanel({ goalId, onClose, onEditLegacy, onArchiveLegacy, onChanged, onRetired }: {
  goalId: string; onClose: () => void; onEditLegacy: () => void; onArchiveLegacy: () => void; onChanged: () => void;
  onRetired: () => void;
}) {
  const { locale, t } = useLanguage();
  const c = copy[locale === "pl" ? "pl" : "en"];
  const [refresh, setRefresh] = useState(0);
  const packet = useOwnerPacket<Packet>(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}`, true, t, refresh);
  const profile = useOwnerPacket<{ workspaceId: string }>("/v1/auth/me", true, t);
  const members = useOwnerPacket<Member[]>(profile.data?.workspaceId
    ? `/v1/workspaces/${encodeURIComponent(profile.data.workspaceId)}/access/members` : "", Boolean(profile.data?.workspaceId), t);
  const [form, setForm] = useState<DraftForm>(emptyDraft);
  const [draftId, setDraftId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [prepared, setPrepared] = useState<{ path: string; body: string } | null>(null);
  const [retirementPreview, setRetirementPreview] = useState<RetirementPreview | null>(null);
  const [retirementReason, setRetirementReason] = useState("");
  const [retirementRequestId, setRetirementRequestId] = useState("");
  const [retirementBody, setRetirementBody] = useState<string | null>(null);
  const [retirementError, setRetirementError] = useState<string | null>(null);
  const [retirementPreviewLoading, setRetirementPreviewLoading] = useState(false);
  const [measurement, setMeasurement] = useState({ evidenceId: "", taskId: "", value: "", note: "", observedAt: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const data = packet.data;
  const selected = data?.versions.find(item => item.id === draftId && item.status === "draft") ?? null;
  const current = data?.current ?? null;
  const evidenceEntityType = measurement.taskId ? "task" : "goal";
  const evidenceEntityId = measurement.taskId || goalId;
  const evidencePacket = useOwnerPacket<EvidenceOption[]>(
    `/v1/evidence?entityType=${evidenceEntityType}&entityId=${encodeURIComponent(evidenceEntityId)}&verificationStatus=verified`,
    Boolean(current && data?.accountableCurrent !== false), t, refresh);
  const previewCurrent = Boolean(preview && selected && preview.expectedCurrentId === (current?.id ?? null));
  const eligibleMembers = (members.data ?? []).filter(member => !member.taskScopeId && ["owner", "admin", "member"].includes(member.role));
  function reload() { setPreview(null); setPrepared(null); setRefresh(v => v + 1); }
  function failed(error: unknown) {
    if (error instanceof AppApiError && error.status === 409) { setPreview(null); setNotice({ tone: "warning", text: c.changed }); reload(); }
    else if (error instanceof AppApiError && error.code === "network_error") { setNotice({ tone: "warning", text: c.uncertain }); reload(); }
    else setNotice({ tone: "error", text: c.error });
  }
  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const targetValue = Number(form.targetValue);
    if (!Number.isFinite(targetValue)) return;
    setBusy(true); setNotice(null);
    try {
      const response = await api<{ data: Version }>(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/drafts`, {
        method: "POST", body: JSON.stringify({ result: form.result.trim(), metric: form.metric.trim(), unit: form.unit.trim(),
          targetValue, evidenceSource: form.evidenceSource.trim(), accountableUserId: form.accountableUserId,
          bindingDeadline: form.bindingDeadline ? new Date(`${form.bindingDeadline}T12:00:00.000Z`).toISOString() : null,
          forecastDate: form.forecastDate ? new Date(`${form.forecastDate}T12:00:00.000Z`).toISOString() : null,
          forecastBasis: form.forecastBasis.trim() || null, executionSchedule: form.executionSchedule.trim() || null,
          provenance: form.provenance.trim() }) });
      setDraftId(response.data.id); setForm(emptyDraft); setPreview(null); setNotice({ tone: "success", text: c.saved }); reload();
    } catch (error) { failed(error); } finally { setBusy(false); }
  }
  async function getPreview() {
    if (busy || !selected) return;
    setBusy(true); setNotice(null); setPreview(null);
    try {
      const response = await api<{ data: Preview }>(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/drafts/${encodeURIComponent(selected.id)}/preview`,
        { method: "POST", body: JSON.stringify({}) });
      setPreview(response.data);
    } catch (error) { failed(error); } finally { setBusy(false); }
  }
  function prepareAdopt() {
    if (!previewCurrent || !preview || !selected) return;
    setPrepared({ path: `/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/drafts/${encodeURIComponent(selected.id)}/adopt`,
      body: JSON.stringify({ previewId: preview.previewId, expectedCurrentId: preview.expectedCurrentId, impactDigest: preview.impactDigest }) });
  }
  async function confirmAdopt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !prepared) return;
    const password = String(new FormData(event.currentTarget).get("ownerPassword") || "");
    if (!password) return;
    setBusy(true); setNotice(null);
    try {
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", { method: "POST",
        body: JSON.stringify({ password, method: "POST", path: prepared.path, bodyDigest: await digest(prepared.body) }) });
      await api(prepared.path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      setPrepared(null); setDraftId(""); setPreview(null); reload(); onChanged(); setNotice({ tone: "success", text: c.saved });
    } catch (error) { failed(error); } finally { setBusy(false); }
  }
  async function openRetirement() {
    if (busy || !current || data?.goal.status === "archived") return;
    setBusy(true); setRetirementPreviewLoading(true); setNotice(null); setRetirementError(null);
    try {
      const response = await api<{ data: RetirementPreview }>(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/retirement-preview`);
      setRetirementPreview(response.data); setRetirementReason(""); setRetirementBody(null);
      setRetirementRequestId(crypto.randomUUID());
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof AppApiError && error.status === 409 ? c.changed : c.retirementFailed });
    } finally { setBusy(false); setRetirementPreviewLoading(false); }
  }
  async function readRetiredGoal() {
    const response = await api<{ data: Packet }>(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}`);
    if (response.data.goal.status !== "archived" || response.data.current !== null) return false;
    setRetirementPreview(null); setRetirementBody(null); setRetirementError(null);
    reload(); onRetired(); setNotice({ tone: "success", text: c.retirementDone });
    return true;
  }
  async function confirmRetirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !retirementPreview || retirementPreview.blockers.length || !retirementRequestId ||
      retirementReason.trim().length < 12) return;
    if (Date.now() >= Date.parse(retirementPreview.expiresAt)) {
      setRetirementPreview(null); setRetirementBody(null); setNotice({ tone: "warning", text: c.changed });
      return;
    }
    const password = String(new FormData(event.currentTarget).get("ownerPassword") || "");
    if (!password) return;
    const path = `/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/actions/retire`;
    const body = retirementBody ?? JSON.stringify({ requestId: retirementRequestId,
      previewToken: retirementPreview.previewToken, reason: retirementReason.trim() });
    setRetirementBody(body); setBusy(true); setRetirementError(null);
    try {
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", { method: "POST",
        body: JSON.stringify({ password, method: "POST", path, bodyDigest: await digest(body) }) });
      await api(path, { method: "POST", body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      if (!await readRetiredGoal()) setRetirementError(c.retirementUnknown);
    } catch (error) {
      if (error instanceof AppApiError && error.status === 409) {
        setRetirementPreview(null); setRetirementBody(null); reload(); onChanged();
        setNotice({ tone: "warning", text: c.changed });
      } else if (error instanceof AppApiError && error.code === "network_error") {
        try { if (await readRetiredGoal()) return; } catch { /* Keep the exact request for a safe retry. */ }
        setRetirementError(c.retirementUnknown); reload(); onChanged();
      } else {
        setRetirementError(error instanceof AppApiError && error.code === "invalid_credentials"
          ? (locale === "pl" ? "Niepoprawne hasło. Podgląd nadal czeka." : "Incorrect password. The preview remains available.") : c.error);
      }
    } finally { setBusy(false); }
  }
  async function createMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || busy) return;
    const value = Number(measurement.value);
    if (!Number.isFinite(value)) return;
    setBusy(true); setNotice(null);
    try {
      await api(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/measurements`, { method: "POST",
        body: JSON.stringify({ versionId: current.id, evidenceId: measurement.evidenceId.trim(),
          taskId: measurement.taskId || null, value, note: measurement.note.trim(),
          observedAt: new Date(measurement.observedAt).toISOString() }) });
      setMeasurement({ evidenceId: "", taskId: "", value: "", note: "", observedAt: "" });
      reload(); setNotice({ tone: "success", text: c.saved });
    } catch (error) { failed(error); } finally { setBusy(false); }
  }
  async function decide(item: Measurement, decision: "accept" | "reject") {
    if (busy) return;
    setBusy(true); setNotice(null);
    try { await api(`/v1/goal-mandates/goals/${encodeURIComponent(goalId)}/measurements/${encodeURIComponent(item.id)}/actions`,
      { method: "POST", body: JSON.stringify({ decision }) });
      reload(); setNotice({ tone: "success", text: c.saved });
    } catch (error) { failed(error); } finally { setBusy(false); }
  }

  return <section aria-labelledby="goal-mandate-title" className="roost-work-surface mt-5 rounded-company p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-black" id="goal-mandate-title">{c.title}: {data?.goal.title ?? "…"}</h2><p className="mt-1 text-sm text-company-muted">{c.legacy}</p></div>
      <div className="flex gap-2"><CcButton disabled={busy} onClick={reload} size="sm" variant="outline">{c.refresh}</CcButton><CcButton onClick={onClose} size="sm" variant="ghost">{c.close}</CcButton></div></div>
    {notice ? <div className="mt-4"><CcNotice live tone={notice.tone} title={notice.text} /></div> : null}
    {packet.status === "loading" ? <div className="mt-4"><CcNotice tone="loading" title={c.loading} /></div> : null}
    {packet.status === "error" ? <div className="mt-4"><CcNotice live tone="error" title={packet.error || c.failed} /></div> : null}
    {packet.status === "ready" && data ? <div className="mt-5 grid gap-7">
      <section><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{c.current}</h3>{current && data.goal.status !== "archived" ? <CcButton disabled={busy} loading={retirementPreviewLoading} onClick={() => void openRetirement()} size="xs" variant="outline">{c.retire}</CcButton> : !current && data.goal.status !== "archived" ? <div className="flex gap-2"><CcButton onClick={onEditLegacy} size="xs" variant="outline">{t("goals.edit")}</CcButton><CcButton onClick={onArchiveLegacy} size="xs" variant="outline">{t("goals.archive")}</CcButton></div> : null}</div>
        {retirementPreviewLoading ? <div className="mt-2"><CcNotice live tone="loading" title={c.retirementLoading} /></div> : null}
        {current ? <div className="mt-2 grid gap-2 rounded-company border border-base-300 p-3 text-sm"><strong>{versionSummary(current, locale)}</strong><p>{c.source}: {current.evidenceSource}</p><p>{c.accountable}: {eligibleMembers.find(member => member.userId === current.accountableUserId)?.name || current.accountableUserId}</p>{data.accountableCurrent === false ? <CcNotice tone="warning" title={c.missingAccountable} /> : null}
          <p>{c.deadline}: {date(current.bindingDeadline)} · {c.forecast}: {date(current.forecastDate)} · {c.schedule}: {current.executionSchedule || c.unknown}</p><p>{c.forecastBasis}: {current.forecastBasis || c.unknown}</p><p>{c.provenance}: {current.provenance}</p><p className="text-company-muted">v{current.version} · {date(current.adoptedAt)}</p></div>
          : <p className="mt-2 text-sm text-company-muted">{c.empty}</p>}</section>

      {data.goal.status !== "archived" ? <div className="grid gap-6 lg:grid-cols-2"><section><h3 className="font-bold">{c.newDraft}</h3><form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={createDraft}>
        {(["result", "metric", "unit", "targetValue", "evidenceSource", "provenance"] as const).map(key => <CcField key={key} label={key === "targetValue" ? c.target : key === "evidenceSource" ? c.source : c[key]} required>{({ id }) => <input className="input input-bordered w-full" id={id} required type={key === "targetValue" ? "number" : "text"} step={key === "targetValue" ? "any" : undefined} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />}</CcField>)}
        <CcField label={c.accountable} required>{({ id }) => <CcSelect id={id} required value={form.accountableUserId} onChange={event => setForm({ ...form, accountableUserId: event.target.value })}><option value="">—</option>{eligibleMembers.map(member => <option key={member.userId} value={member.userId}>{member.name || member.email}</option>)}</CcSelect>}</CcField>
        <CcField label={c.deadline}>{({ id }) => <input className="input input-bordered w-full" id={id} type="date" value={form.bindingDeadline} onChange={event => setForm({ ...form, bindingDeadline: event.target.value })} />}</CcField>
        <CcField label={c.forecast}>{({ id }) => <input className="input input-bordered w-full" id={id} type="date" value={form.forecastDate} onChange={event => setForm({ ...form, forecastDate: event.target.value })} />}</CcField>
        <CcField label={c.forecastBasis} required={Boolean(form.forecastDate)}>{({ id }) => <input className="input input-bordered w-full" id={id} required={Boolean(form.forecastDate)} value={form.forecastBasis} onChange={event => setForm({ ...form, forecastBasis: event.target.value })} />}</CcField>
        <CcField label={c.schedule}>{({ id }) => <input className="input input-bordered w-full" id={id} value={form.executionSchedule} onChange={event => setForm({ ...form, executionSchedule: event.target.value })} />}</CcField>
        <div className="sm:col-span-2"><CcButton disabled={!eligibleMembers.length} loading={busy} type="submit" variant="primary">{c.saveDraft}</CcButton>{members.status === "ready" && !eligibleMembers.length ? <p className="mt-1 text-sm text-company-muted">{c.noMembers}</p> : null}</div></form></section>
        <section><h3 className="font-bold">{c.drafts}</h3><div className="mt-3 grid gap-3"><CcField label={c.selectDraft}>{({ id }) => <CcSelect id={id} value={draftId} onChange={event => { setDraftId(event.target.value); setPreview(null); }}><option value="">—</option>{data.versions.filter(item => item.status === "draft").map(item => <option key={item.id} value={item.id}>{versionSummary(item, locale)}</option>)}</CcSelect>}</CcField>
          {selected ? <p className="text-sm">{c.source}: {selected.evidenceSource} · {c.provenance}: {selected.provenance}</p> : null}
          <CcButton disabled={!selected || busy} onClick={getPreview} size="sm" variant="outline">{c.preview}</CcButton>
          {previewCurrent && preview && selected ? <div className="grid gap-3 rounded-company border border-primary/40 p-3 text-sm"><h4 className="font-bold">{c.previewTitle}</h4><p>{c.previous}: {current ? versionSummary(current, locale) : c.empty}</p><p>{c.proposed}: {versionSummary(selected, locale)}</p><p>{c.affected}: {Object.entries(preview.counts).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>{Object.entries(preview.examples).map(([kind, items]) => items.length ? <p key={kind}>{kind}: {items.map(item => item.title).join(", ")}</p> : null)}
            <div><strong>{c.effects}</strong><ul className="list-disc pl-5">{preview.effects.map((effect, index) => <li key={index}>{c.effectLabels[effect as keyof typeof c.effectLabels] || effect}</li>)}</ul></div><p>{date(preview.expiresAt)}</p><CcButton onClick={prepareAdopt} size="sm" variant="primary">{c.adopt}</CcButton></div> : null}</div></section></div> : null}

      <section><h3 className="font-bold">{c.progress}</h3>{data.progress ? <p className="mt-2 text-sm"><strong>{number(data.progress.value, locale, c.unknown)} {current?.unit}</strong> · {date(data.progress.observedAt)} · {c.source}: <code className="break-all">{data.progress.evidenceId}</code></p>
        : <p className="mt-2 text-sm text-company-muted">{data.progressStatus === "stale_evidence" ? c.stale : c.noProgress}</p>}</section>

      {current && data.accountableCurrent !== false ? <section><h3 className="font-bold">{c.measurement}</h3><form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={createMeasurement}>
        <CcField label={c.task}>{({ id }) => <CcSelect id={id} value={measurement.taskId} onChange={event => setMeasurement({ ...measurement, taskId: event.target.value, evidenceId: "" })}><option value="">{c.goalEvidence}</option>{data.tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</CcSelect>}</CcField>
        <CcField label={c.evidenceId} required>{({ id }) => <CcSelect id={id} required value={measurement.evidenceId} onChange={event => setMeasurement({ ...measurement, evidenceId: event.target.value })}><option value="">{evidencePacket.status === "loading" ? c.loading : c.unknown}</option>{(evidencePacket.data ?? []).map(item => <option key={item.id} value={item.id}>{item.reference} · {date(item.observedAt)}</option>)}</CcSelect>}</CcField>
        {evidencePacket.status === "error" ? <CcNotice tone="error" title={evidencePacket.error || c.error} /> : null}
        <CcField label={c.value} required>{({ id }) => <input className="input input-bordered w-full" id={id} required type="number" step="any" value={measurement.value} onChange={event => setMeasurement({ ...measurement, value: event.target.value })} />}</CcField>
        <CcField label={c.observed} required>{({ id }) => <input className="input input-bordered w-full" id={id} required type="datetime-local" value={measurement.observedAt} onChange={event => setMeasurement({ ...measurement, observedAt: event.target.value })} />}</CcField>
        <CcField label={c.note} required>{({ id }) => <textarea className="textarea textarea-bordered w-full" id={id} required value={measurement.note} onChange={event => setMeasurement({ ...measurement, note: event.target.value })} />}</CcField>
        <div className="self-end"><CcButton loading={busy} type="submit" variant="primary">{c.saveMeasurement}</CcButton></div></form></section> : null}

      <section><h3 className="font-bold">{c.measurements}</h3><div className="mt-2 grid gap-2">{data.measurements.map(item => <article className="rounded-company border border-base-300 p-3 text-sm" key={item.id}><p><strong>{number(item.value, locale, c.unknown)} {data.versions.find(version => version.id === item.versionId)?.unit ?? ""}</strong> · {item.status} · {date(item.observedAt)}</p><p>{item.note}</p><p className={item.evidenceCurrent ? "text-company-muted" : "text-warning"}>{item.evidenceCurrent ? c.evidenceCurrent : c.evidenceStale} · {item.source?.reference || item.evidenceId}</p>{item.source?.url?.startsWith("https://") ? <a className="link break-all" href={item.source.url} rel="noreferrer" target="_blank">{c.source}</a> : null}{item.taskId ? <a className="ml-2 link" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(item.taskId)}`}>{c.openTask}</a> : null}
        {item.status === "proposed" && item.evidenceCurrent && item.versionId === current?.id ? <div className="mt-2 flex gap-2"><CcButton disabled={busy} onClick={() => void decide(item, "accept")} size="xs" variant="primary">{c.accept}</CcButton><CcButton disabled={busy} onClick={() => void decide(item, "reject")} size="xs" variant="outline">{c.reject}</CcButton></div> : null}</article>)}</div>{data.measurementRowsOmittedCount > 0 ? <p className="mt-2 text-xs text-company-muted">{c.omitted}: {data.measurementRowsOmittedCount}</p> : null}</section>

      <div className="grid gap-6 lg:grid-cols-2"><section><h3 className="font-bold">{c.tasks}</h3><ul className="mt-2 grid gap-2">{data.tasks.map(task => <li className="rounded-company border border-base-300 p-3 text-sm" key={task.id}><a className="link font-bold" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(task.id)}`}>{task.title}</a><p>{task.status} · {c.plannedDuration}: {task.estimatedDurationMinutes === null ? c.unknown : `${number(task.estimatedDurationMinutes, locale, c.unknown)} min`} · {c.effort}: {c.unknown}</p></li>)}</ul>{data.taskRowsOmittedCount > 0 ? <p className="mt-2 text-xs text-company-muted">{c.omitted}: {data.taskRowsOmittedCount}</p> : null}</section>
        <section><h3 className="font-bold">{c.economics}</h3><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div>{c.attempts}: <strong>{data.economics.attemptCount}</strong></div><div>{c.accepted}: <strong>{data.economics.acceptedOutcomeCount}</strong></div><div>{c.returns}: <strong>{data.economics.reviewReturnCount}</strong></div><div>{c.elapsed}: <strong>{data.economics.observedExecutionElapsedMs === null ? c.unknown : `${number(data.economics.observedExecutionElapsedMs / 60000, locale, c.unknown)} min`}</strong></div><div>{c.effort}: <strong>{number(data.economics.humanEffortMinutes, locale, c.unknown)}</strong></div><div>{c.cost}: <strong>{number(data.economics.observedModelCost, locale, c.unknown)}</strong></div><div>{c.tokens}: <strong>{data.economics.providerInputTokens === null || data.economics.providerOutputTokens === null ? c.unknown : `${data.economics.providerInputTokens} / ${data.economics.providerOutputTokens}`}</strong></div><div>{c.unknownAttribution}: <strong>{data.economics.historicalUnknownAttributionCount}</strong></div></dl><p className="mt-2 text-xs text-company-muted">{c.elapsedNote} {data.economics.elapsedUnknownCount || data.economics.modelCostUnknownCount ? `${data.economics.elapsedUnknownCount} / ${data.economics.modelCostUnknownCount} ${c.unknown.toLowerCase()}.` : ""}</p>
          <h4 className="mt-4 font-bold">{c.executions}</h4>{data.economics.executions.length ? <ul className="mt-2 grid gap-2">{data.economics.executions.map(execution => <li className="rounded-company border border-base-300 p-2 text-xs" key={execution.id}><code className="break-all">{execution.id}</code> · {execution.status} · {c.elapsed}: {execution.elapsedMs === null ? c.unknown : `${number(execution.elapsedMs / 60000, locale, c.unknown)} min`} · {c.cost}: {number(execution.modelCost, locale, c.unknown)}<a className="ml-2 link" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(execution.taskId)}`}>{c.openTask}</a></li>)}</ul> : <p className="mt-2 text-sm text-company-muted">{c.noExecutions}</p>}{data.economics.executionRowsOmittedCount > 0 ? <p className="mt-2 text-xs text-company-muted">{c.omitted}: {data.economics.executionRowsOmittedCount}</p> : null}</section></div>
      <section><h3 className="font-bold">{c.history}</h3><ol className="mt-2 grid gap-2">{data.versions.filter(item => item.status !== "draft").map(item => <li className="rounded-company border border-base-300 p-2 text-sm" key={item.id}>v{item.version} · {versionSummary(item, locale)} · {item.status} · {date(item.adoptedAt)}</li>)}</ol></section>
    </div> : null}
    {retirementPreview ? <CcRecordEditorModal titleId="goal-retirement-confirm" eyebrow={c.title} title={c.retirementTitle} description={c.retirementDescription} closeLabel={c.close} maxWidthClassName="max-w-2xl" onClose={() => { if (!busy) { setRetirementPreview(null); setRetirementBody(null); setRetirementError(null); } }} onSubmit={confirmRetirement} actions={<><CcButton disabled={busy} onClick={() => { setRetirementPreview(null); setRetirementBody(null); setRetirementError(null); }} variant="ghost">{c.cancel}</CcButton><CcButton disabled={retirementPreview.blockers.length > 0 || retirementReason.trim().length < 12 || Date.now() >= Date.parse(retirementPreview.expiresAt)} loading={busy} type="submit" variant="warning">{c.retirementConfirm}</CcButton></>}>
      {retirementError ? <CcNotice live tone="error" title={retirementError} /> : null}
      <div className="grid gap-3 text-sm">
        <p><strong>{c.retirementGoal}:</strong> {retirementPreview.goal.title} · {retirementPreview.goal.status}</p>
        <p><strong>{c.retirementMandate}:</strong> {retirementPreview.version ? `v${retirementPreview.version.version}` : c.unknown}</p>
        <div><strong>{c.retirementLinkedTasks} ({retirementPreview.impact.tasks.length})</strong>{retirementPreview.impact.tasks.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{retirementPreview.impact.tasks.map(task => <li key={task.id}><a className="link" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(task.id)}`}>{task.title}</a> · {retirementValue(task.status, retirementTaskStatuses, locale)}{task.source ? ` · ${retirementSource(task.source, locale)}` : ""}{task.readiness ? ` · ${c.retirementReadiness}: ${retirementValue(task.readiness, retirementReadinessStatuses, locale)}` : ""}</li>)}</ul> : <p className="text-company-muted">{c.retirementNoTasks}</p>}</div>
        <p>{c.retirementTargets}: {retirementPreview.impact.targetCount} · {c.retirementChildren}: {retirementPreview.impact.childGoalCount} · {c.retirementMeasurements}: {retirementPreview.impact.measurementCount} · {c.retirementExecutions}: {retirementPreview.impact.executionCount} · {c.retirementActive}: {retirementPreview.impact.activeExecutionCount}</p>
        <p>{c.retirementTaskPreserved}</p><p>{c.retirementTrace}</p>
        {retirementPreview.blockers.length ? <CcNotice tone="warning" title={c.retirementBlockers}><ul className="list-disc pl-5">{retirementPreview.blockers.map((blocker, index) => <li key={`${blocker}-${index}`}>{retirementBlockerLabels[blocker]?.[locale === "pl" ? 0 : 1] || blocker}</li>)}</ul></CcNotice> : <p className="text-company-muted">{c.retirementClear}</p>}
        <p className="text-xs text-company-muted">{c.retirementExpiry}: {date(retirementPreview.expiresAt)}</p>
      </div>
      <div className="mt-4 grid gap-4"><CcField label={c.retirementReason} hint={c.retirementReasonHint} required>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" disabled={busy || Boolean(retirementBody)} id={id} maxLength={2000} minLength={12} onChange={event => setRetirementReason(event.target.value)} required value={retirementReason} />}</CcField><CcField label={c.retirementPassword} required>{({ id }) => <input autoComplete="current-password" className="input input-bordered w-full" disabled={busy || retirementPreview.blockers.length > 0} id={id} name="ownerPassword" required type="password" />}</CcField></div>
    </CcRecordEditorModal> : null}
    {prepared ? <CcRecordEditorModal titleId="goal-adopt-proof" eyebrow={c.title} title={c.adopt} description={c.proof} onClose={() => !busy && setPrepared(null)} onSubmit={confirmAdopt} actions={<><CcButton disabled={busy} onClick={() => setPrepared(null)} variant="ghost">{c.cancel}</CcButton><CcButton loading={busy} type="submit" variant="primary">{c.confirm}</CcButton></>}><CcField label={c.password} required>{({ id }) => <input autoComplete="current-password" className="input input-bordered w-full" id={id} name="ownerPassword" required type="password" />}</CcField></CcRecordEditorModal> : null}
  </section>;
}
