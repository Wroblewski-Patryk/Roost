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
type Finding = { id: string; createdAt: string; state: "observed"; verification: "unverified"; body: {
  title: string; category: string; language: string; observed: string; sourceExcerpt: string; interpretation: string;
  uncertainty: string; applicability: string; source: PackageRead["source"]; observationId: string;
  sourceLanguage: string; evidence: Array<{ kind: string; scope: string }> } };
type StudyState = { items: Site[]; reviewEnvironment: "isolated_test" | "production" };
type FindingState = { items: Finding[]; truncated: boolean };
type NewSite = { title: string; referenceUrl: string };
type Review = { classification: "fact" | "observation" | "proposal" | "inference"; provenance: string;
  verificationMethod: string; verificationRef: string; inclusionReason: string; validUntil: string };

const initialSite: NewSite = { title: "", referenceUrl: "" };
const initialReview: Review = { classification: "observation", provenance: "", verificationMethod: "", verificationRef: "", inclusionReason: "",
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) };
function errorCode(error: unknown) { return error instanceof AppApiError ? error.code : "request_failed"; }
function formatTime(value: string, locale: string) { return Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(locale) : value; }
function configuredUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash && url.href === value; }
  catch { return false; }
}

export function ReferenceSiteStudy({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [sites, setSites] = useState<Site[] | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewEnvironment, setReviewEnvironment] = useState<StudyState["reviewEnvironment"] | null>(null);
  const [findings, setFindings] = useState<FindingState | null>(null), [sitePackage, setSitePackage] = useState<PackageRead | null>(null);
  const [siteDraft, setSiteDraft] = useState<NewSite>(initialSite), [reviewDraft, setReviewDraft] = useState<Review>(initialReview);
  const [packageDraft, setPackageDraft] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [success, setSuccess] = useState<string | null>(null);
  const selected = sites?.find(site => site.id === selectedId) ?? null;
  const reviewedPreview = Boolean(selected && sitePackage?.siteId === selected.id &&
    sitePackage.source.contentDigest === selected.packageDigest);
  const root = `/v1/product-engineering/tasks/${encodeURIComponent(taskId)}/reference-sites`;

  async function load(preferredId?: string) {
    setError(null); setSitePackage(null);
    try {
      const response = await api<{ data: StudyState }>(root, { cache: "no-store" });
      setSites(response.data.items);
      setReviewEnvironment(response.data.reviewEnvironment);
      setSelectedId(current => response.data.items.some(site => site.id === (preferredId ?? current))
        ? preferredId ?? current : response.data.items[0]?.id ?? null);
    } catch (caught) { setSites(null); setReviewEnvironment(null); setError(errorCode(caught)); }
  }
  useEffect(() => { void load(); }, [taskId]);
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
    if (busy || !siteDraft.title.trim() || !packageDraft || !configuredUrl(siteDraft.referenceUrl)) return;
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
      await load(selected.id);
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
    setBusy("findings"); setError(null);
    try {
      const response = await api<{ data: FindingState }>(`${root}/${encodeURIComponent(selected.id)}/findings`, { cache: "no-store" });
      setFindings(response.data);
    } catch (caught) { setError(errorCode(caught)); } finally { setBusy(null); }
  }
  return <CcRecordEditorModal titleId="reference-site-study-title" eyebrow="G24a" title={pl ? "Badanie stron referencyjnych" : "Reference site study"}
    description={taskTitle} onClose={onClose} onSubmit={event => event.preventDefault()} maxWidthClassName="max-w-5xl"
    actions={<><CcButton variant="outline" disabled={Boolean(busy)} onClick={() => void load()}>{pl ? "Odśwież źródła" : "Refresh sites"}</CcButton><CcButton variant="ghost" onClick={onClose}>{pl ? "Zamknij" : "Close"}</CcButton></>}>
    <div className="grid gap-6">
      {error ? <CcNotice live tone="error" title={pl ? "Operacja nie powiodła się" : "Operation failed"} detail={error} /> : null}
      {success ? <CcNotice live tone="success" title={success} /> : null}
      <CcNotice tone="info" title={pl ? "Pakiet zachowuje granicę dowodu" : "The package preserves evidence scope"}
        detail={pl ? "Kod, zapisany zrzut i nadzorowane kliknięcie mają osobne oznaczenia. Findings agenta pozostają niezweryfikowane; panel nie publikuje checklisty ani nie zmienia badanych stron." : "Source, saved screenshot and supervised click results have separate labels. Agent findings remain unverified; this panel does not publish a checklist or change the studied sites."} />
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
        <div><CcButton variant="outline" loading={busy === "create"} disabled={Boolean(busy) || !siteDraft.title.trim() || !packageDraft || !configuredUrl(siteDraft.referenceUrl)} onClick={() => void createSite()}>{pl ? "Zapisz pakiet" : "Save package"}</CcButton></div>
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
          {sitePackage.package.observations.map(item => <article key={item.id} className="grid gap-2 border-t border-base-300 pt-3"><h4 className="font-semibold">{item.id} · {item.category} · {item.language} · {item.route}</h4><p className="whitespace-pre-wrap break-words">{item.text}</p><ul className="list-disc pl-5 text-xs text-company-muted">{item.evidence.map((proof, index) => <li key={`${item.id}-${index}`} className="break-all">{proof.scope} · {proof.kind} · {proof.ref} · SHA-256 {proof.sha256}</li>)}</ul></article>)}
          {sitePackage.package.unknowns.length ? <details><summary className="cursor-pointer font-semibold">{pl ? "Niepotwierdzone obszary" : "Unknown areas"}</summary><ul className="mt-2 list-disc pl-5">{sitePackage.package.unknowns.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
        </div> : null}
      </section> : null}
      {selected ? <section className="grid gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{pl ? "Findings agenta dla tego zadania" : "Agent findings for this task"}</h3><CcButton size="sm" variant="outline" disabled={Boolean(busy)} loading={busy === "findings"} onClick={() => void refreshFindings()}>{pl ? "Odśwież Findings" : "Refresh findings"}</CcButton></div>
        {findings === null ? <CcNotice tone="loading" title={pl ? "Wczytywanie obserwacji" : "Loading findings"} /> : findings.items.length === 0 ? <p className="text-sm text-company-muted">{pl ? "Brak zapisanych obserwacji agenta dla tej strony i zadania." : "No agent observations recorded for this site and task."}</p> : <div className="grid gap-3">{findings.items.map(finding => <article key={finding.id} className="grid gap-2 rounded-company border border-base-300 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{finding.body.title}</h4><span className="badge badge-warning">{pl ? "Niezweryfikowany" : "Unverified"}</span></div>
          <p className="text-company-muted">{finding.body.category} · {finding.body.language} · {formatTime(finding.createdAt, locale)}</p>
          <dl className="grid gap-2"><div><dt className="font-semibold">{pl ? "Obserwacja" : "Observation"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.observed}</dd></div><div><dt className="font-semibold">{pl ? "Fragment źródła" : "Source excerpt"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.sourceExcerpt}</dd></div><div><dt className="font-semibold">{pl ? "Interpretacja" : "Interpretation"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.interpretation}</dd></div><div><dt className="font-semibold">{pl ? "Niepewność" : "Uncertainty"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.uncertainty}</dd></div><div><dt className="font-semibold">{pl ? "Zastosowanie" : "Applicability"}</dt><dd className="whitespace-pre-wrap break-words">{finding.body.applicability}</dd></div></dl>
          <details><summary className="cursor-pointer font-semibold">{pl ? "Dowód źródła" : "Source evidence"}</summary><dl className="mt-2 grid gap-1"><div><dt>URL</dt><dd className="break-all font-mono text-xs">{finding.body.source.url}</dd></div><div><dt>SHA-256</dt><dd className="break-all font-mono text-xs">{finding.body.source.contentDigest}</dd></div><div><dt>{pl ? "Wersja" : "Version"}</dt><dd>{finding.body.source.providerVersion} · {finding.body.source.versionStatus}</dd></div><div><dt>{pl ? "Przygotowano" : "Prepared"}</dt><dd>{formatTime(finding.body.source.preparedAt, locale)}</dd></div><div><dt>{pl ? "Obserwacja" : "Observation"}</dt><dd>{finding.body.observationId} · {finding.body.sourceLanguage}</dd></div><div><dt>{pl ? "Zakres dowodu" : "Evidence scope"}</dt><dd>{finding.body.evidence.map(item => `${item.scope}: ${item.kind}`).join(", ")}</dd></div><div><dt>{pl ? "Rewizja rekordu" : "Record revision"}</dt><dd>{formatTime(finding.body.source.recordRevision, locale)}</dd></div></dl></details>
        </article>)}</div>}
        {findings?.truncated ? <p className="text-sm text-warning">{pl ? "Pokazano tylko pierwsze 100 Findings." : "Only the first 100 findings are shown."}</p> : null}
      </section> : null}
    </div>
  </CcRecordEditorModal>;
}
