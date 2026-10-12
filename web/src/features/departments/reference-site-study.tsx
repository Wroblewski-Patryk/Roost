import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";

type Site = { id: string; title: string; url: string; providerVersion: string; recordRevision: string;
  packageDigest: string; versionNumber: number; commitSha: string; observationCount: number;
  approved: boolean; sourceReviewId: string | null };
type PackageRead = { siteId: string; taskId: string; title: string; status: "unverified";
  package: { source: { projectId: string; versionId: string; versionNumber: number; commitSha: string; archiveSha256: string; publishedUrl: string };
    preparedAt: string; observations: Array<{ id: string; category: string; route: string; language: string; text: string;
      evidence: Array<{ kind: string; scope: string; sha256: string; ref: string }> }>; unknowns: string[] };
  source: { url: string; providerVersion: string; versionStatus: string; recordRevision: string; sourceReviewId: string | null;
    preparedAt: string; contentDigest: string; version: { versionNumber: number; commitSha: string } } };
type FindingReview = { id: string; verdict: "confirmed" | "rejected" | "inconclusive"; reviewerUserId: string;
  rationale: string; evidence: string; reviewedAt: string };
type Finding = { id: string; createdAt: string; state: "observed";
  verification: "unverified" | "confirmed" | "rejected" | "inconclusive" | "stale";
  actorId: string; findingDigest: string; review: FindingReview | null; body: {
  title: string; category: string; language: string; observed: string; sourceExcerpt: string; interpretation: string;
  uncertainty: string; applicability: string; source: PackageRead["source"]; observationId: string;
  sourceLanguage: string; evidence: Array<{ kind: string; scope: string }> } };
type StudyState = { items: Site[]; reviewEnvironment: "isolated_test" | "production" };
type FindingState = { items: Finding[]; truncated: boolean };
type NewSite = { title: string; referenceUrl: string };
type Review = { classification: "fact" | "observation" | "proposal" | "inference"; provenance: string;
  verificationMethod: string; verificationRef: string; inclusionReason: string; validUntil: string };
type FindingReviewDraft = { verdict: FindingReview["verdict"]; rationale: string; evidence: string };
type ChecklistItemInput = { findingId: string; itemId: string; instruction: string; applicability: string;
  acceptanceCriterion: string; expectedInput: string; expectedOutput: string; rollback: string };
type ChecklistDraft = ChecklistItemInput & { siteId: string; findingTitle: string };
type ChecklistPreviewItem = ChecklistItemInput & { source: { taskId: string; siteId: string; findingId: string;
  findingVersionId: string; findingDigest: string; reviewId: string; sourceReviewId: string; packageDigest: string;
  metadataDigest: string; recordRevision: string; observationId: string; evidenceScopes: string[] } };
type ChecklistPreview = { preview: { schemaVersion: string; taskId: string; ownerUserId: string; name: string;
  items: ChecklistPreviewItem[] }; digest: string };
type ChecklistRead = { status: "none" | "active" | "stale"; procedure: null | { id: string; familyId: string;
  name: string; version: number; decisionId: string; items: Array<{ id: string; order: number; instruction: string;
    expectedInput: { description: string }; expectedOutput: { description: string }; validationRule: { itemId?: string; applicability?: string;
      acceptanceCriterion?: string; status?: string; ownerUserId?: string; source?: ChecklistPreviewItem["source"] };
    rollbackInstruction: string | null }> } };

const initialSite: NewSite = { title: "", referenceUrl: "" };
const initialReview: Review = { classification: "observation", provenance: "", verificationMethod: "", verificationRef: "", inclusionReason: "",
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) };
const initialFindingReview: FindingReviewDraft = { verdict: "confirmed", rationale: "", evidence: "" };
function checklistPayload(items: ChecklistDraft[]): ChecklistItemInput[] {
  return items.map(({ findingId, itemId, instruction, applicability, acceptanceCriterion, expectedInput, expectedOutput, rollback }) =>
    ({ findingId, itemId: itemId.trim(), instruction: instruction.trim(), applicability: applicability.trim(),
      acceptanceCriterion: acceptanceCriterion.trim(), expectedInput: expectedInput.trim(), expectedOutput: expectedOutput.trim(),
      rollback: rollback.trim() }));
}
function checklistReady(items: ChecklistDraft[]) {
  return items.length > 0 && items.length <= 2 && new Set(items.map(item => item.findingId)).size === items.length &&
    new Set(items.map(item => item.itemId.trim())).size === items.length && items.every(item =>
      /^[a-z][a-z0-9-]{2,79}$/.test(item.itemId.trim()) &&
      ([item.instruction, item.applicability, item.acceptanceCriterion, item.expectedInput, item.expectedOutput, item.rollback]
        .every(value => value.trim().length >= 3 && value.trim().length <= 2000)));
}
function errorCode(error: unknown) { return error instanceof AppApiError ? error.code : "request_failed"; }
function checklistError(error: unknown, pl: boolean) {
  const code = errorCode(error);
  if (["reference_site_source_changed", "reference_site_checklist_preview_stale", "reference_site_independent_review_required"].includes(code))
    return pl ? "Źródło, przegląd lub podgląd zmieniły się. Odśwież Findings i checklistę, a następnie przygotuj nowy podgląd." :
      "The source, review or preview changed. Refresh the findings and checklist, then prepare a new preview.";
  if (["reference_site_review_forbidden", "reference_site_checklist_forbidden"].includes(code))
    return pl ? "To działanie wymaga uprawnienia właściciela do tego zadania." : "This action requires owner authority for this task.";
  return pl ? `Nie udało się zakończyć działania (${code}). Odśwież dane przed ponowną próbą.` :
    `The action could not be completed (${code}). Refresh the data before retrying.`;
}
function evidenceScope(scope: string, pl: boolean) {
  const labels: Record<string, [string, string]> = {
    source_only: ["Tylko kod źródłowy", "Source code only"],
    published_render: ["Zapisany widok opublikowanej strony", "Saved published-page render"],
    supervised_result: ["Wynik nadzorowanego działania", "Supervised action result"]
  };
  const label = labels[scope];
  return label ? label[pl ? 0 : 1] : scope;
}
function formatTime(value: string, locale: string) { return Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(locale) : value; }
function configuredUrl(value: string, sitePackage: { source?: { publishedUrl?: string } } | null) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
    && value === sitePackage?.source?.publishedUrl; }
  catch { return false; }
}

export function ReferenceSiteStudy({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [sites, setSites] = useState<Site[] | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewEnvironment, setReviewEnvironment] = useState<StudyState["reviewEnvironment"] | null>(null);
  const [findings, setFindings] = useState<FindingState | null>(null), [sitePackage, setSitePackage] = useState<PackageRead | null>(null);
  const [siteDraft, setSiteDraft] = useState<NewSite>(initialSite), [reviewDraft, setReviewDraft] = useState<Review>(initialReview);
  const [packageDraft, setPackageDraft] = useState<any>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [findingReviewDraft, setFindingReviewDraft] = useState<FindingReviewDraft>(initialFindingReview);
  const [checklist, setChecklist] = useState<ChecklistRead | null>(null);
  const [checklistDraft, setChecklistDraft] = useState<ChecklistDraft[]>([]);
  const [checklistPreview, setChecklistPreview] = useState<ChecklistPreview | null>(null);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [success, setSuccess] = useState<string | null>(null);
  const selected = sites?.find(site => site.id === selectedId) ?? null;
  const reviewedPreview = Boolean(selected && sitePackage?.siteId === selected.id &&
    sitePackage.source.contentDigest === selected.packageDigest);
  const root = `/v1/product-engineering/tasks/${encodeURIComponent(taskId)}/reference-sites`;
  const checklistRoot = `/v1/product-engineering/tasks/${encodeURIComponent(taskId)}/reference-site-checklist`;
  const previewMatchesDraft = Boolean(checklistPreview && checklistReady(checklistDraft) &&
    JSON.stringify(checklistPayload(checklistDraft)) === JSON.stringify(checklistPreview.preview.items.map(item =>
      ({ findingId: item.findingId, itemId: item.itemId, instruction: item.instruction,
        applicability: item.applicability, acceptanceCriterion: item.acceptanceCriterion,
        expectedInput: item.expectedInput, expectedOutput: item.expectedOutput, rollback: item.rollback }))));

  async function loadChecklist() {
    try {
      const response = await api<{ data: ChecklistRead }>(checklistRoot, { cache: "no-store" });
      setChecklist(response.data);
      return response.data;
    } catch (caught) { setChecklist(null); setError(checklistError(caught, pl)); return null; }
  }

  async function load(preferredId?: string) {
    setError(null); setSitePackage(null); setChecklistPreview(null);
    try {
      const response = await api<{ data: StudyState }>(root, { cache: "no-store" });
      setSites(response.data.items);
      setReviewEnvironment(response.data.reviewEnvironment);
      setSelectedId(current => response.data.items.some(site => site.id === (preferredId ?? current))
        ? preferredId ?? current : response.data.items[0]?.id ?? null);
    } catch (caught) { setSites(null); setReviewEnvironment(null); setError(errorCode(caught)); }
  }
  useEffect(() => {
    setChecklistDraft([]); setChecklistPreview(null); setChecklist(null); setReviewingId(null);
    void load(); void loadChecklist();
  }, [taskId]);
  useEffect(() => {
    setSitePackage(null); setFindings(null);
    if (!selectedId) return;
    let current = true;
    void api<{ data: FindingState }>(`${root}/${encodeURIComponent(selectedId)}/findings`, { cache: "no-store" })
      .then(response => { if (current) setFindings(response.data); })
      .catch(caught => { if (current) setError(errorCode(caught)); });
    return () => { current = false; };
  }, [selectedId, taskId]);

  async function selectPackage(file: File | undefined) {
    setPackageDraft(null); setError(null);
    if (!file) return;
    if (file.size > 256 * 1024) { setError("reference_site_package_too_large"); return; }
    try {
      const value = JSON.parse(await file.text());
      if (value?.schemaVersion !== "roost-reference-site-package-v1" ||
        !/^appgprj_[a-z0-9]+$/.test(value?.source?.projectId ?? "") ||
        !Number.isSafeInteger(value?.source?.versionNumber) || value.source.versionNumber < 1)
        throw new Error("reference_site_package_invalid");
      setPackageDraft(value);
    } catch { setError("reference_site_package_invalid"); }
  }
  async function createSite() {
    if (busy || !siteDraft.title.trim() || !packageDraft || !configuredUrl(siteDraft.referenceUrl, packageDraft)) return;
    setBusy("create"); setError(null); setSuccess(null);
    try {
      const response = await api<{ data: { id: string } }>("/v1/company-records", { method: "POST", body: JSON.stringify({
        recordType: "reference_site", title: siteDraft.title.trim(), status: "active", verificationState: "not_started",
        metadata: { referenceUrl: siteDraft.referenceUrl, providerVersion: `v${packageDraft.source.versionNumber}`,
          sourceKind: "openai_sites", sourceId: packageDraft.source.projectId, package: packageDraft }
      }) });
      setSiteDraft(initialSite); setPackageDraft(null); await load(response.data.id);
      setSuccess(pl ? "Źródło zapisano. Osobno zatwierdź jego bieżącą rewizję dla tego zadania." : "Site saved. Approve its current revision for this task separately.");
    } catch (caught) { setError(errorCode(caught)); } finally { setBusy(null); }
  }
  async function approve() {
    if (!selected || !reviewedPreview || !reviewEnvironment || busy || selected.approved || !reviewDraft.validUntil || !reviewDraft.provenance.trim() ||
      !reviewDraft.verificationMethod.trim() || !reviewDraft.verificationRef.trim() || !reviewDraft.inclusionReason.trim()) return;
    setBusy("approve"); setError(null); setSuccess(null);
    try {
      await api(`/v1/company-records/${encodeURIComponent(selected.id)}/context-reviews`, { method: "POST", body: JSON.stringify({
        requestId: crypto.randomUUID(), taskId, expectedRevision: selected.recordRevision, action: "approve",
        classification: reviewDraft.classification, provenance: reviewDraft.provenance.trim(),
        environment: reviewEnvironment,
        verificationMethod: reviewDraft.verificationMethod.trim(), verificationRef: reviewDraft.verificationRef.trim(),
        inclusionReason: reviewDraft.inclusionReason.trim(), validUntil: new Date(`${reviewDraft.validUntil}T23:59:59.000Z`).toISOString()
      }) });
      await load(selected.id); await loadChecklist();
      setSuccess(pl ? "Zatwierdzono tę rewizję źródła dla wskazanego zadania." : "This source revision was approved for the selected task.");
    } catch (caught) { setError(errorCode(caught)); } finally { setBusy(null); }
  }
  async function readPackage() {
    if (!selected || busy) return;
    setBusy("package"); setSitePackage(null); setError(null); setSuccess(null);
    try {
      const response = await api<{ data: PackageRead }>(`${root}/${encodeURIComponent(selected.id)}/package`, { cache: "no-store" });
      setSitePackage(response.data);
    } catch (caught) { setError(errorCode(caught)); } finally { setBusy(null); }
  }
  async function refreshFindings() {
    if (!selected || busy) return;
    setBusy("findings"); setError(null); setChecklistPreview(null);
    try {
      const response = await api<{ data: FindingState }>(`${root}/${encodeURIComponent(selected.id)}/findings`, { cache: "no-store" });
      setFindings(response.data);
    } catch (caught) { setError(errorCode(caught)); } finally { setBusy(null); }
  }
  async function submitFindingReview(finding: Finding) {
    if (!selected || selected.id !== selectedId || busy || finding.review ||
        findingReviewDraft.rationale.trim().length < 3 || findingReviewDraft.evidence.trim().length < 3) return;
    setBusy(`review:${finding.id}`); setError(null); setSuccess(null); setChecklistPreview(null);
    try {
      await api(`${root}/${encodeURIComponent(selected.id)}/findings/${encodeURIComponent(finding.id)}/review`, {
        method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), expectedFindingDigest: finding.findingDigest,
          verdict: findingReviewDraft.verdict, rationale: findingReviewDraft.rationale.trim(),
          evidence: findingReviewDraft.evidence.trim() })
      });
      const response = await api<{ data: FindingState }>(`${root}/${encodeURIComponent(selected.id)}/findings`, { cache: "no-store" });
      setFindings(response.data); setReviewingId(null); setFindingReviewDraft(initialFindingReview);
      setSuccess(pl ? "Zapisano niezależny przegląd tego Finding." : "Independent review of this finding was saved.");
    } catch (caught) { setError(checklistError(caught, pl)); } finally { setBusy(null); }
  }
  function addChecklistItem(finding: Finding) {
    if (!selected || finding.verification !== "confirmed" || checklistDraft.length >= 2 ||
        checklistDraft.some(item => item.findingId === finding.id)) return;
    setChecklistPreview(null);
    setChecklistDraft(items => [...items, { findingId: finding.id, siteId: selected.id,
      findingTitle: finding.body.title, itemId: "", instruction: "", applicability: finding.body.applicability,
      acceptanceCriterion: "", expectedInput: "", expectedOutput: "", rollback: "" }]);
  }
  function updateChecklistItem(findingId: string, key: keyof ChecklistItemInput, value: string) {
    setChecklistPreview(null);
    setChecklistDraft(items => items.map(item => item.findingId === findingId ? { ...item, [key]: value } : item));
  }
  async function previewChecklist() {
    if (busy || !checklistReady(checklistDraft)) return;
    setBusy("preview"); setError(null); setSuccess(null); setChecklistPreview(null);
    try {
      const response = await api<{ data: ChecklistPreview }>(`${checklistRoot}/preview`, {
        method: "POST", body: JSON.stringify({ items: checklistPayload(checklistDraft) })
      });
      setChecklistPreview(response.data);
    } catch (caught) { setError(checklistError(caught, pl)); } finally { setBusy(null); }
  }
  async function acceptChecklist() {
    if (busy || !checklistPreview || !previewMatchesDraft) return;
    setBusy("accept"); setError(null); setSuccess(null);
    try {
      await api(`${checklistRoot}/accept`, { method: "POST", body: JSON.stringify({
        items: checklistPayload(checklistDraft), requestId: crypto.randomUUID(), expectedDigest: checklistPreview.digest
      }) });
      setChecklistPreview(null); setChecklistDraft([]);
      const current = await loadChecklist();
      if (current?.status === "active")
        setSuccess(pl ? "Przyjęto dokładnie przejrzaną wersję checklisty." : "The exact reviewed checklist version was accepted.");
      else if (current?.status === "stale")
        setError(pl ? "Zapisana decyzja jest już nieaktualna. Odśwież źródło i przygotuj nowy podgląd przed użyciem checklisty." :
          "The saved decision is already stale. Refresh the source and prepare a new preview before using the checklist.");
      else if (current?.status === "none")
        setError(pl ? "Nie znaleziono przyjętej wersji po zapisie. Odśwież checklistę przed ponowną próbą." :
          "The accepted version was not found after saving. Refresh the checklist before retrying.");
    } catch (caught) { setChecklistPreview(null); setError(checklistError(caught, pl)); } finally { setBusy(null); }
  }
  return <CcRecordEditorModal titleId="reference-site-study-title" eyebrow="G24a / G24b" title={pl ? "Badanie stron referencyjnych" : "Reference site study"}
    description={taskTitle} onClose={onClose} onSubmit={event => event.preventDefault()} maxWidthClassName="max-w-5xl"
    actions={<><CcButton variant="outline" disabled={Boolean(busy)} onClick={() => void load()}>{pl ? "Odśwież źródła" : "Refresh sites"}</CcButton><CcButton variant="ghost" onClick={onClose}>{pl ? "Zamknij" : "Close"}</CcButton></>}>
    <div className="grid gap-6">
      {error ? <CcNotice live tone="error" title={pl ? "Operacja nie powiodła się" : "Operation failed"} detail={error} /> : null}
      {success ? <CcNotice live tone="success" title={success} /> : null}
      <CcNotice tone="info" title={pl ? "Pakiet zachowuje granicę dowodu" : "The package preserves evidence scope"}
        detail={pl ? "Kod, zapisany zrzut i nadzorowane kliknięcie mają osobne oznaczenia. Finding agenta wymaga niezależnego przeglądu. Przyjęta checklista korzysta tylko z potwierdzonych Findings; jej użycie w rzeczywistym zadaniu wymaga osobnego dowodu." : "Source, saved screenshot and supervised click results have separate labels. An agent finding needs independent review. An accepted checklist uses confirmed findings only; its use in a real task needs separate evidence."} />
      <section className="grid gap-3 border-b border-base-300 pb-5">
        <h3 className="font-bold">{pl ? "Źródła tego zadania" : "Sites for this task"}</h3>
        {sites === null && !error ? <CcNotice tone="loading" title={pl ? "Wczytywanie źródeł" : "Loading sites"} /> : null}
        {sites?.length === 0 ? <p className="text-sm text-company-muted">{pl ? "Nie skonfigurowano żadnej z dwóch dopuszczonych stron." : "Neither of the two permitted sites is configured."}</p> : null}
        {sites?.length ? <CcField label={pl ? "Strona" : "Site"}>{({ id }) => <CcSelect id={id} value={selectedId ?? ""} onChange={event => setSelectedId(event.target.value)}>{sites.map(site => <option key={site.id} value={site.id}>{site.title} · {site.approved ? pl ? "zatwierdzona" : "approved" : pl ? "wymaga zatwierdzenia" : "approval required"}</option>)}</CcSelect>}</CcField> : null}
        {selected ? <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-company-muted">URL</dt><dd className="break-all font-mono">{selected.url}</dd></div><div><dt className="text-company-muted">{pl ? "Wersja Sites" : "Sites version"}</dt><dd>v{selected.versionNumber} · {selected.observationCount} {pl ? "obserwacji" : "observations"}</dd></div><div><dt className="text-company-muted">{pl ? "Commit źródła" : "Source commit"}</dt><dd className="break-all font-mono text-xs">{selected.commitSha}</dd></div><div><dt className="text-company-muted">{pl ? "Skrót pakietu" : "Package digest"}</dt><dd className="break-all font-mono text-xs">{selected.packageDigest}</dd></div><div><dt className="text-company-muted">{pl ? "Rewizja rekordu" : "Record revision"}</dt><dd>{formatTime(selected.recordRevision, locale)}</dd></div><div><dt className="text-company-muted">{pl ? "Zatwierdzenie źródła" : "Source approval"}</dt><dd>{selected.approved ? pl ? "Bieżące dla tego zadania" : "Current for this task" : pl ? "Brak bieżącego" : "No current approval"}</dd></div></dl> : null}
      </section>
      {sites && sites.length < 2 ? <section className="grid gap-3 border-b border-base-300 pb-5"><h3 className="font-bold">{pl ? "Dodaj pakiet zapisanej wersji Sites" : "Add a saved Sites version package"}</h3>
        <p className="text-sm text-company-muted">{pl ? "Wskaż prywatny, oczyszczony plik JSON oraz jeden z dwóch skonfigurowanych adresów. Plik zostanie zapisany jako wersjonowane źródło w Roost i będzie wymagał osobnego zatwierdzenia dla zadania." : "Select a private, curated JSON package and one of the two configured URLs. Roost will store it as a versioned source that needs separate approval for the task."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CcField label={pl ? "Nazwa źródła" : "Site name"} required>{({ id }) => <input id={id} className="input input-bordered w-full" maxLength={240} value={siteDraft.title} onChange={event => setSiteDraft({ ...siteDraft, title: event.target.value })} />}</CcField>
          <CcField label={pl ? "Dokładny adres HTTPS" : "Exact HTTPS URL"} required>{({ id }) => <input id={id} className="input input-bordered w-full" type="url" maxLength={1000} value={siteDraft.referenceUrl} onChange={event => setSiteDraft({ ...siteDraft, referenceUrl: event.target.value })} />}</CcField>
          <CcField label={pl ? "Oczyszczony pakiet JSON" : "Curated JSON package"} required>{({ id }) => <input id={id} className="file-input file-input-bordered w-full" type="file" accept="application/json,.json" onChange={event => void selectPackage(event.target.files?.[0])} />}</CcField>
        </div>
        {packageDraft ? <p className="text-sm text-company-muted">Sites v{packageDraft.source.versionNumber} · {packageDraft.source.projectId} · {packageDraft.observations?.length ?? 0} {pl ? "obserwacji" : "observations"}</p> : null}
        <div><CcButton variant="outline" loading={busy === "create"} disabled={Boolean(busy) || !siteDraft.title.trim() || !packageDraft || !configuredUrl(siteDraft.referenceUrl, packageDraft)} onClick={() => void createSite()}>{pl ? "Zapisz pakiet" : "Save package"}</CcButton></div>
      </section> : null}
      {selected && !selected.approved ? <section className="grid gap-3 border-b border-base-300 pb-5"><h3 className="font-bold">{pl ? "Zatwierdź tę rewizję dla zadania" : "Approve this revision for the task"}</h3>
        <p className="text-sm text-company-muted">{pl ? "Najpierw odczytaj pakiet poniżej. Zatwierdzenie dotyczy dokładnego rekordu i tego zadania; zmiana rekordu je unieważni." : "Read the package below first. Approval is bound to this exact record and task; changing the record invalidates it."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CcField label={pl ? "Klasyfikacja" : "Classification"}>{({ id }) => <CcSelect id={id} value={reviewDraft.classification} onChange={event => setReviewDraft({ ...reviewDraft, classification: event.target.value as Review["classification"] })}>{(["fact", "observation", "proposal", "inference"] as const).map(value => <option key={value} value={value}>{value}</option>)}</CcSelect>}</CcField>
          <CcField label={pl ? "Ważne do" : "Valid through"} required>{({ id }) => <input id={id} type="date" className="input input-bordered w-full" value={reviewDraft.validUntil} onChange={event => setReviewDraft({ ...reviewDraft, validUntil: event.target.value })} />}</CcField>
          {(["provenance", "verificationMethod", "verificationRef", "inclusionReason"] as const).map(key => <CcField key={key} label={({ provenance: pl ? "Pochodzenie" : "Provenance", verificationMethod: pl ? "Metoda weryfikacji" : "Verification method", verificationRef: pl ? "Dowód weryfikacji" : "Verification reference", inclusionReason: pl ? "Powód włączenia" : "Inclusion reason" })[key]} required>{({ id }) => <input id={id} className="input input-bordered w-full" maxLength={key === "provenance" || key === "verificationMethod" ? 500 : 1000} value={reviewDraft[key]} onChange={event => setReviewDraft({ ...reviewDraft, [key]: event.target.value })} />}</CcField>)}
        </div><div><CcButton variant="primary" loading={busy === "approve"} disabled={Boolean(busy) || !reviewedPreview || !reviewEnvironment || !reviewDraft.validUntil || !reviewDraft.provenance.trim() || !reviewDraft.verificationMethod.trim() || !reviewDraft.verificationRef.trim() || !reviewDraft.inclusionReason.trim()} onClick={() => void approve()}>{pl ? "Zatwierdź źródło" : "Approve source"}</CcButton></div>
      </section> : null}
      {selected ? <section className="grid gap-3 border-b border-base-300 pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{pl ? "Pakiet zapisanej wersji" : "Saved version package"}</h3><CcButton size="sm" variant="outline" disabled={Boolean(busy)} loading={busy === "package"} onClick={() => void readPackage()}>{pl ? "Odczytaj pakiet" : "Read package"}</CcButton></div>
        {!selected.approved ? <p className="text-sm text-company-muted">{pl ? "Przeczytaj cały pakiet przed zatwierdzeniem. Agent nie uzyska dostępu bez bieżącego zatwierdzenia dla zadania." : "Read the complete package before approval. The agent has no access without current task approval."}</p> : null}
        {sitePackage && sitePackage.siteId === selected.id ? <div className="grid gap-3 rounded-company border border-base-300 p-4 text-sm"><p className="font-bold">{sitePackage.title} · {pl ? "niezweryfikowane obserwacje" : "unverified observations"}</p>
          <dl className="grid gap-2 sm:grid-cols-2"><div><dt>{pl ? "Przygotowano" : "Prepared at"}</dt><dd>{formatTime(sitePackage.package.preparedAt, locale)}</dd></div><div><dt>{pl ? "Wersja Sites" : "Sites version"}</dt><dd>v{sitePackage.package.source.versionNumber}</dd></div><div><dt>{pl ? "Projekt Sites" : "Sites project"}</dt><dd className="break-all font-mono text-xs">{sitePackage.package.source.projectId}</dd></div><div><dt>{pl ? "Adres opublikowanej wersji" : "Published version URL"}</dt><dd className="break-all font-mono text-xs">{sitePackage.package.source.publishedUrl}</dd></div><div><dt>{pl ? "Commit źródła" : "Source commit"}</dt><dd className="break-all font-mono text-xs">{sitePackage.package.source.commitSha}</dd></div><div><dt>{pl ? "Skrót pakietu SHA-256" : "Package SHA-256"}</dt><dd className="break-all font-mono text-xs">{sitePackage.source.contentDigest}</dd></div></dl>
          {sitePackage.package.observations.map(item => <article key={item.id} className="grid gap-2 border-t border-base-300 pt-3"><h4 className="font-semibold">{item.id} · {item.category} · {item.language} · {item.route}</h4><p className="whitespace-pre-wrap break-words">{item.text}</p><ul className="list-disc pl-5 text-xs text-company-muted">{item.evidence.map((proof, index) => <li key={`${item.id}-${index}`} className="break-all">{evidenceScope(proof.scope, pl)} · {proof.kind} · {proof.ref} · SHA-256 {proof.sha256}</li>)}</ul></article>)}
          {sitePackage.package.unknowns.length ? <details><summary className="cursor-pointer font-semibold">{pl ? "Niepotwierdzone obszary" : "Unknown areas"}</summary><ul className="mt-2 list-disc pl-5">{sitePackage.package.unknowns.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
        </div> : null}
      </section> : null}
      {selected ? <section className="grid gap-3 border-b border-base-300 pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{pl ? "Findings agenta dla tego zadania" : "Agent findings for this task"}</h3><CcButton size="sm" variant="outline" disabled={Boolean(busy)} loading={busy === "findings"} onClick={() => void refreshFindings()}>{pl ? "Odśwież Findings" : "Refresh findings"}</CcButton></div>
        {findings === null ? <CcNotice tone="loading" title={pl ? "Wczytywanie obserwacji" : "Loading findings"} /> : findings.items.length === 0 ? <p className="text-sm text-company-muted">{pl ? "Brak zapisanych obserwacji agenta dla tej strony i zadania." : "No agent observations recorded for this site and task."}</p> : <div className="grid gap-3">{findings.items.map(finding => <article key={finding.id} className="grid gap-2 rounded-company border border-base-300 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{finding.body.title}</h4><span className={`badge ${finding.verification === "confirmed" ? "badge-success" : finding.verification === "unverified" ? "badge-warning" : "badge-neutral"}`}>{({ unverified: pl ? "Niezweryfikowany" : "Unverified", confirmed: pl ? "Potwierdzony" : "Confirmed", rejected: pl ? "Odrzucony" : "Rejected", inconclusive: pl ? "Nierozstrzygnięty" : "Inconclusive", stale: pl ? "Nieaktualny" : "Stale" })[finding.verification]}</span></div>
          <p className="text-company-muted">{finding.body.category} · {finding.body.language} · {formatTime(finding.createdAt, locale)}</p>
          <dl className="grid gap-2"><div><dt className="font-semibold">{pl ? "Obserwacja" : "Observation"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.observed}</dd></div><div><dt className="font-semibold">{pl ? "Fragment źródła" : "Source excerpt"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.sourceExcerpt}</dd></div><div><dt className="font-semibold">{pl ? "Interpretacja" : "Interpretation"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.interpretation}</dd></div><div><dt className="font-semibold">{pl ? "Niepewność" : "Uncertainty"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.uncertainty}</dd></div><div><dt className="font-semibold">{pl ? "Zastosowanie" : "Applicability"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.applicability}</dd></div></dl>
          <details><summary className="cursor-pointer font-semibold">{pl ? "Dowód źródła" : "Source evidence"}</summary><dl className="mt-2 grid gap-1"><div><dt>URL</dt><dd className="break-all font-mono text-xs">{finding.body.source.url}</dd></div><div><dt>SHA-256</dt><dd className="break-all font-mono text-xs">{finding.body.source.contentDigest}</dd></div><div><dt>{pl ? "Skrót Finding" : "Finding digest"}</dt><dd className="break-all font-mono text-xs">{finding.findingDigest}</dd></div><div><dt>{pl ? "Wersja" : "Version"}</dt><dd>{finding.body.source.providerVersion} · {finding.body.source.versionStatus}</dd></div><div><dt>{pl ? "Przygotowano" : "Prepared"}</dt><dd>{formatTime(finding.body.source.preparedAt, locale)}</dd></div><div><dt>{pl ? "Obserwacja" : "Observation"}</dt><dd>{finding.body.observationId} · {finding.body.sourceLanguage}</dd></div><div><dt>{pl ? "Zakres dowodu" : "Evidence scope"}</dt><dd>{finding.body.evidence.map(item => `${evidenceScope(item.scope, pl)}: ${item.kind}`).join(", ")}</dd></div><div><dt>{pl ? "Rewizja rekordu" : "Record revision"}</dt><dd>{formatTime(finding.body.source.recordRevision, locale)}</dd></div></dl></details>
          {finding.review ? <div className="grid gap-1 border-t border-base-300 pt-3"><p className="font-semibold">{pl ? "Niezależny przegląd" : "Independent review"} · {formatTime(finding.review.reviewedAt, locale)}</p><p>{finding.review.rationale}</p><p className="text-company-muted">{pl ? "Dowód:" : "Evidence:"} {finding.review.evidence}</p><p className="break-all font-mono text-xs text-company-muted">{pl ? "Weryfikator" : "Reviewer"}: {finding.review.reviewerUserId} · {pl ? "Przegląd" : "Review"}: {finding.review.id}</p></div> : null}
          {finding.verification === "confirmed" && !checklistDraft.some(item => item.findingId === finding.id) ? <div><CcButton size="sm" variant="outline" disabled={Boolean(busy) || checklistDraft.length >= 2} onClick={() => addChecklistItem(finding)}>{pl ? "Dodaj do propozycji checklisty" : "Add to checklist proposal"}</CcButton></div> : null}
          {!finding.review && reviewingId !== finding.id ? <div><CcButton size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => { setReviewingId(finding.id); setFindingReviewDraft(initialFindingReview); }}>{pl ? "Oceń niezależnie" : "Review independently"}</CcButton></div> : null}
          {!finding.review && reviewingId === finding.id ? <div className="grid gap-3 border-t border-base-300 pt-3"><p className="text-company-muted">{pl ? "Ocena odnosi się do tego skrótu Finding. Serwer odrzuci autora Finding jako weryfikatora i zmienione źródło." : "This review is bound to the finding digest. The server rejects the finding author as reviewer and a changed source."}</p><CcField label={pl ? "Wynik weryfikacji" : "Review verdict"}>{({ id }) => <CcSelect id={id} value={findingReviewDraft.verdict} onChange={event => setFindingReviewDraft({ ...findingReviewDraft, verdict: event.target.value as FindingReview["verdict"] })}><option value="confirmed">{pl ? "Potwierdzony" : "Confirmed"}</option><option value="rejected">{pl ? "Odrzucony" : "Rejected"}</option><option value="inconclusive">{pl ? "Nierozstrzygnięty" : "Inconclusive"}</option></CcSelect>}</CcField><CcField label={pl ? "Uzasadnienie" : "Rationale"} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" maxLength={2000} value={findingReviewDraft.rationale} onChange={event => setFindingReviewDraft({ ...findingReviewDraft, rationale: event.target.value })} />}</CcField><CcField label={pl ? "Dowód weryfikacji i jego zakres" : "Review evidence and scope"} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" maxLength={2000} value={findingReviewDraft.evidence} onChange={event => setFindingReviewDraft({ ...findingReviewDraft, evidence: event.target.value })} />}</CcField><div className="flex gap-2"><CcButton variant="primary" loading={busy === `review:${finding.id}`} disabled={Boolean(busy) || findingReviewDraft.rationale.trim().length < 3 || findingReviewDraft.evidence.trim().length < 3} onClick={() => void submitFindingReview(finding)}>{pl ? "Zapisz ocenę" : "Save review"}</CcButton><CcButton variant="ghost" disabled={Boolean(busy)} onClick={() => setReviewingId(null)}>{pl ? "Anuluj" : "Cancel"}</CcButton></div></div> : null}
        </article>)}</div>}
        {findings?.truncated ? <p className="text-sm text-warning">{pl ? "Pokazano tylko pierwsze 100 Findings." : "Only the first 100 findings are shown."}</p> : null}
      </section> : null}
      <section className="grid gap-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{pl ? "Wersjonowana checklista strony" : "Versioned website checklist"}</h3><CcButton size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void loadChecklist()}>{pl ? "Odśwież checklistę" : "Refresh checklist"}</CcButton></div>
        <CcNotice tone="info" title={pl ? "Granica przyjęcia" : "Acceptance boundary"} detail={pl ? "Potwierdzone Finding jest źródłem propozycji, a nie punktem checklisty. Dopiero osobne przyjęcie dokładnego podglądu przez właściciela publikuje wersję Procedure. Nadzorowane użycie tej wersji nie jest tu potwierdzane." : "A confirmed finding is proposal evidence, not a checklist item. Only separate owner acceptance of the exact preview publishes a Procedure version. Supervised use of that version is not confirmed here."} />
        {checklist === null && !error ? <CcNotice tone="loading" title={pl ? "Wczytywanie checklisty" : "Loading checklist"} /> : null}
        {checklist?.status === "none" ? <p className="text-sm text-company-muted">{pl ? "Nie przyjęto jeszcze checklisty dla tego zadania." : "No checklist has been accepted for this task yet."}</p> : null}
        {checklist?.status === "stale" ? <CcNotice tone="warning" title={pl ? "Przyjęta wersja wymaga ponownej oceny źródła" : "Accepted version needs source reassessment"} detail={pl ? "Źródło lub Finding nie są już bieżące dla tego zadania. Nie traktuj tej wersji jako aktywnego kontekstu agenta." : "The source or finding is no longer current for this task. Do not treat this version as active agent context."} /> : null}
        {checklist?.procedure ? <div className="grid gap-3 rounded-company border border-base-300 p-4 text-sm"><p className="font-semibold">{checklist.procedure.name} · v{checklist.procedure.version} · {checklist.status === "active" ? pl ? "przyjęta, bieżąca" : "accepted, current" : pl ? "nieaktualna" : "stale"}</p><p className="break-all font-mono text-xs text-company-muted">Procedure {checklist.procedure.id} · {pl ? "decyzja" : "decision"} {checklist.procedure.decisionId}</p>{checklist.procedure.items.map(item => <article key={item.id} className="grid gap-1 border-t border-base-300 pt-3"><h4 className="font-semibold">{item.order}. {item.validationRule?.itemId ?? item.id} · {item.instruction}</h4><p>{pl ? "Zastosowanie" : "Applicability"}: {item.validationRule?.applicability}</p><p>{pl ? "Kryterium" : "Criterion"}: {item.validationRule?.acceptanceCriterion}</p><p>{pl ? "Wymagany materiał wejściowy" : "Required input"}: {item.expectedInput?.description}</p><p>{pl ? "Oczekiwany dowód wyniku" : "Expected output evidence"}: {item.expectedOutput?.description}</p><p>{pl ? "Status" : "Status"}: {item.validationRule?.status} · {pl ? "Właściciel" : "Owner"}: {item.validationRule?.ownerUserId}</p><p>{pl ? "Wycofanie" : "Rollback"}: {item.rollbackInstruction}</p><p className="break-all font-mono text-xs text-company-muted">Finding {item.validationRule?.source?.findingId} · {pl ? "obserwacja" : "observation"} {item.validationRule?.source?.observationId} · {pl ? "pakiet" : "package"} {item.validationRule?.source?.packageDigest}</p><p className="text-company-muted">{pl ? "Zakresy dowodu" : "Evidence scopes"}: {item.validationRule?.source?.evidenceScopes?.map(scope => evidenceScope(scope, pl)).join(", ") || (pl ? "brak" : "none")}</p></article>)}</div> : null}
        <div className="grid gap-3"><h4 className="font-semibold">{pl ? "Propozycja nowej wersji (maks. 2 punkty)" : "New version proposal (up to 2 items)"}</h4><p className="text-sm text-company-muted">{pl ? "Wybierz tylko potwierdzone Findings powyżej. Możesz przełączyć stronę i dodać drugi punkt; podgląd ponownie sprawdzi oba źródła." : "Select confirmed findings above. You can switch sites and add a second item; preview rechecks both sources."}</p>
          {checklistDraft.length === 0 ? <p className="text-sm text-company-muted">{pl ? "Nie wybrano punktów." : "No items selected."}</p> : null}
          {checklistDraft.map((item, index) => <div key={item.findingId} className="grid gap-3 rounded-company border border-base-300 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h5 className="font-semibold">{index + 1}. {item.findingTitle}</h5><p className="break-all font-mono text-xs text-company-muted">Finding {item.findingId} · site {item.siteId}</p></div><CcButton size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => { setChecklistPreview(null); setChecklistDraft(items => items.filter(value => value.findingId !== item.findingId)); }}>{pl ? "Usuń punkt" : "Remove item"}</CcButton></div>
            <div className="grid gap-3 sm:grid-cols-2"><CcField label={pl ? "Stały ID punktu" : "Stable item ID"} hint="a-z, 0-9, -, 3–80" required>{({ id }) => <input id={id} className="input input-bordered w-full" maxLength={80} value={item.itemId} onChange={event => updateChecklistItem(item.findingId, "itemId", event.target.value)} />}</CcField>
              {(["instruction", "applicability", "acceptanceCriterion", "expectedInput", "expectedOutput", "rollback"] as const).map(key => <CcField key={key} label={({ instruction: pl ? "Działanie" : "Action", applicability: pl ? "Zastosowanie" : "Applicability", acceptanceCriterion: pl ? "Sprawdzalne kryterium" : "Testable criterion", expectedInput: pl ? "Wymagany materiał wejściowy" : "Required input", expectedOutput: pl ? "Oczekiwany dowód wyniku" : "Expected output evidence", rollback: pl ? "Wycofanie" : "Rollback" })[key]} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" maxLength={2000} value={item[key]} onChange={event => updateChecklistItem(item.findingId, key, event.target.value)} />}</CcField>)}</div>
          </div>)}
          <div><CcButton variant="outline" loading={busy === "preview"} disabled={Boolean(busy) || !checklistReady(checklistDraft)} onClick={() => void previewChecklist()}>{pl ? "Pokaż dokładny podgląd" : "Show exact preview"}</CcButton></div>
        </div>
        {checklistPreview && previewMatchesDraft ? <div className="grid gap-3 rounded-company border border-info/35 bg-info/5 p-4 text-sm"><h4 className="font-bold">{pl ? "Dokładny podgląd do decyzji właściciela" : "Exact preview for owner decision"}</h4><p className="break-all font-mono text-xs">SHA-256 {checklistPreview.digest}</p><p className="break-all text-xs text-company-muted">{pl ? "Zadanie" : "Task"} {checklistPreview.preview.taskId} · {pl ? "właściciel" : "owner"} {checklistPreview.preview.ownerUserId}</p>{checklistPreview.preview.items.map((item, index) => <article key={item.findingId} className="grid gap-1 border-t border-info/25 pt-3"><h5 className="font-semibold">{index + 1}. {item.itemId} · {item.instruction}</h5><p>{pl ? "Zastosowanie" : "Applicability"}: {item.applicability}</p><p>{pl ? "Kryterium" : "Criterion"}: {item.acceptanceCriterion}</p><p>{pl ? "Wejście" : "Input"}: {item.expectedInput}</p><p>{pl ? "Wynik" : "Output"}: {item.expectedOutput}</p><p>{pl ? "Wycofanie" : "Rollback"}: {item.rollback}</p><p className="break-all font-mono text-xs">Finding {item.source.findingId} · {pl ? "obserwacja" : "observation"} {item.source.observationId} · {pl ? "przegląd" : "review"} {item.source.reviewId}</p><p className="break-all font-mono text-xs">{pl ? "Pakiet" : "Package"} {item.source.packageDigest} · {pl ? "Skrót Finding" : "Finding digest"} {item.source.findingDigest}</p><p className="text-company-muted">{pl ? "Zakresy dowodu" : "Evidence scopes"}: {item.source.evidenceScopes.map(scope => evidenceScope(scope, pl)).join(", ") || (pl ? "brak" : "none")}</p></article>)}<details><summary className="cursor-pointer font-semibold">{pl ? "Pełny kontrakt podglądu" : "Full preview contract"}</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(checklistPreview.preview, null, 2)}</pre></details><div><CcButton variant="primary" loading={busy === "accept"} disabled={Boolean(busy)} onClick={() => void acceptChecklist()}>{pl ? "Przyjmij tę wersję checklisty" : "Accept this checklist version"}</CcButton></div></div> : null}
      </section>
    </div>
  </CcRecordEditorModal>;
}
