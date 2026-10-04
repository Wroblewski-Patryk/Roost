import React from "react";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorSection } from "../../components/cc-record-editor";
import { operationLabel } from "./portfolio-operation-model";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function takeoverRepositoryHref(value: unknown) {
  if (typeof value !== "string" || value.length > 500 || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname !== "/" && !value.includes("?") && !value.includes("#") ? value : null;
  } catch { return null; }
}

export function ApplicationTakeoverSummary({ baseline, locale }: { baseline: unknown; locale: "pl" | "en" }) {
  if (baseline == null) return null;
  const pl = locale === "pl", copy = (polish: string, english: string) => pl ? polish : english;
  const value = record(baseline);
  const title = copy("Stan bazowy przejęcia aplikacji", "Application takeover baseline");
  const readiness = copy("Gotowość produktu: niezweryfikowana · Gotowość do sprzedaży: niezweryfikowana", "Product readiness: unverified · Sale readiness: unverified");
  if (!value || value.schemaVersion !== "roost-application-takeover-v1") return <CcRecordEditorSection title={title}><CcNotice tone="warning" title={copy("Nie można zweryfikować formatu stanu bazowego.", "The baseline format cannot be verified.")} /><p className="mt-4 text-sm font-semibold">{readiness}</p></CcRecordEditorSection>;
  const text = (item: unknown) => typeof item === "string" && item ? item : copy("Nieznane", "Unknown");
  const stateLabels: Record<string, [string, string]> = {
    proposed: ["Propozycja", "Proposed"], accepted: ["Zaakceptowane", "Accepted"], deferred: ["Odroczone", "Deferred"], rejected: ["Odrzucone", "Rejected"], superseded: ["Zastąpione", "Superseded"],
    not_implemented: ["Niezaimplementowane", "Not implemented"], implemented_correctly: ["Zaimplementowane poprawnie", "Implemented correctly"], implemented_incorrectly: ["Zaimplementowane niepoprawnie", "Implemented incorrectly"], unverified: ["Niezweryfikowane", "Unverified"]
  };
  const state = (item: unknown) => typeof item === "string" && stateLabels[item] ? stateLabels[item][pl ? 0 : 1] : copy("Nieznane", "Unknown");
  const repository = takeoverRepositoryHref(value.canonicalRepository);
  const stages = ["problem_definition", "accepted_requirements", "solution_design", "implementation", "verification", "operation_improvement"];
  const stage = typeof value.stage === "string" && stages.includes(value.stage) ? operationLabel(value.stage, locale) : null;
  const assumptions = Array.isArray(value.assumptions) ? value.assumptions.map(record).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
  const limitations = Array.isArray(value.limitations) ? value.limitations.filter((item): item is string => typeof item === "string") : [];
  return <CcRecordEditorSection title={title} description={copy("Ten zapis potwierdza wyłącznie wskazany zakres. Akceptacja nie nadaje uprawnień wykonania ani wydania.", "This record covers only the stated scope. Acceptance grants no execution or release authority.")}>
    <dl className="grid gap-4 text-sm md:grid-cols-2">
      {[[copy("Aplikacja", "Application"), value.applicationId], [copy("Etap w tym zakresie", "Stage within this scope"), stage], [copy("Zakres audytu", "Audit scope"), value.scopeDescription], [copy("Docelowy użytkownik", "Intended user"), value.intendedUser], [copy("Główny problem", "Primary problem"), value.primaryProblem], [copy("Wymagany wynik", "Core outcome"), value.coreOutcome]].map(([label, item], index) => <div key={index}><dt className="text-company-muted">{text(label)}</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text(item)}</dd></div>)}
      <div><dt className="text-company-muted">{copy("Repozytorium bazowe", "Baseline repository")}</dt><dd className="[overflow-wrap:anywhere]">{repository ? <a className="link link-primary" href={repository} target="_blank" rel="noreferrer noopener">{repository}</a> : copy("Adres repozytorium jest niedostępny lub nieprawidłowy.", "Repository URL is unavailable or invalid.")}</dd></div>
      {[[copy("Dokładny commit bazowy", "Exact baseline commit"), value.baselineCommit], [copy("Zadanie audytu", "Audit task"), value.auditTaskId], [copy("Uruchomienie audytora", "Auditor execution"), value.auditorExecutionId], [copy("Skrót dowodu audytora", "Auditor evidence digest"), value.auditorEvidenceDigest], [copy("Uruchomienie niezależnego weryfikatora", "Independent verifier execution"), value.verifierExecutionId], [copy("Skrót dowodu weryfikatora", "Verifier evidence digest"), value.verifierEvidenceDigest]].map(([label, item], index) => <div key={index}><dt className="text-company-muted">{text(label)}</dt><dd className="break-all font-mono text-xs">{text(item)}</dd></div>)}
    </dl>
    <p className="mt-4 text-sm font-semibold">{readiness}</p>
    <h4 className="mt-5 font-semibold">{copy("Założenia i stan implementacji", "Assumptions and implementation state")}</h4>
    {assumptions.length ? <ul className="mt-3 divide-y divide-base-300">{assumptions.map((assumption, index) => <li className="grid gap-2 py-3 text-sm" key={index}><p>{copy("Status decyzji", "Decision status")}: <strong>{state(assumption.decisionStatus)}</strong> · {copy("Implementacja", "Implementation")}: <strong>{state(assumption.implementationState)}</strong></p><dl className="grid gap-2"><div><dt className="text-company-muted">{copy("Dokładny identyfikator założenia", "Exact assumption record ID")}</dt><dd className="break-all font-mono text-xs">{text(assumption.recordId)}</dd></div><div><dt className="text-company-muted">{copy("Dokładna rewizja", "Exact revision")}</dt><dd className="break-all font-mono text-xs">{text(assumption.revision)}</dd></div></dl></li>)}</ul> : <p className="mt-2 text-sm text-company-muted">{copy("Brak zapisanych założeń w tym stanie bazowym.", "No assumptions recorded in this baseline.")}</p>}
    <h4 className="mt-5 font-semibold">{copy("Ograniczenia dowodu", "Evidence limitations")}</h4>
    {limitations.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{limitations.map((item, index) => <li className="whitespace-pre-wrap [overflow-wrap:anywhere]" key={index}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-company-muted">{copy("Nie zapisano dodatkowych ograniczeń; dowód nadal dotyczy wyłącznie wskazanego zakresu.", "No additional limitations recorded; proof remains limited to the stated scope.")}</p>}
  </CcRecordEditorSection>;
}
