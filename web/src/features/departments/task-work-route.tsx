import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { clearOwnerToken } from "../../api/auth-token";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";
import type { AuthMe } from "../../types";
import { reviewMessages } from "./task-review-messages";
import { scopedReviewCommand, type ScopedReview, type ScopedReviewDraft } from "./task-work-model";

type ScopedTask = { id: string; title: string; description?: string | null; status?: string };
const initial: ScopedReviewDraft = { decision: "reject", summary: "", reference: "", testResult: "", reproduction: "", expected: "", observed: "", scope: "", excluded: "", outcome: "", competencies: "" };

export function TaskWorkRoute({ taskId }: { taskId: string }) {
  const { locale, t } = useLanguage();
  const c = reviewMessages[locale === "pl" ? "pl" : "en"];
  const [task, setTask] = useState<ScopedTask | null>(null);
  const [review, setReview] = useState<ScopedReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<ScopedReviewDraft>(initial);
  const request = useRef<{ body: string; id: string } | null>(null);

  async function load() {
    setLoading(true); setError(false);
    try {
      const profile = await api<{ data: AuthMe }>("/v1/auth/me");
      if (profile.data.taskScopeId && profile.data.taskScopeId !== taskId) throw new Error("scope_mismatch");
      const exactTask = await api<{ data: ScopedTask }>(`/v1/tasks/${encodeURIComponent(taskId)}`);
      if (exactTask.data.id !== taskId) throw new Error("task_mismatch");
      setTask(exactTask.data);
      const result = await api<{ data: ScopedReview }>(`/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/review`);
      if (result.data.task.id !== taskId) throw new Error("review_task_mismatch");
      setReview(result.data);
    } catch { setTask(null); setReview(null); setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [taskId]);

  function edit(key: keyof ScopedReviewDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review?.canReview || busy) return;
    const comparable = JSON.stringify({ review: { expectedVersion: review.expectedVersion, materialVersion: review.materialVersion }, draft });
    if (request.current?.body !== comparable) request.current = { body: comparable, id: crypto.randomUUID() };
    let input;
    try { input = scopedReviewCommand(review, draft, request.current.id); }
    catch { setError(true); return; }
    setBusy(true); setError(false); setSaved(false);
    try {
      await api(`/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/actions/review`, { method: "POST", body: JSON.stringify(input) });
      request.current = null;
      setSaved(true);
      setDraft(initial);
      await load();
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  function field(key: keyof Omit<ScopedReviewDraft, "decision">, multiline = false) {
    return <CcField key={key} label={c[key]} required>{({ id, describedBy }) => multiline
      ? <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" id={id} maxLength={2000} minLength={3} onChange={(event) => edit(key, event.target.value)} required value={draft[key]} />
      : <input aria-describedby={describedBy} className="input input-bordered w-full" id={id} maxLength={2000} minLength={3} onChange={(event) => edit(key, event.target.value)} required value={draft[key]} />}</CcField>;
  }

  async function signOut() {
    try { await api("/v1/auth/logout", { method: "POST" }); }
    finally { clearOwnerToken(); window.location.assign("/auth/login"); }
  }

  const approvalProof = review?.informationTask ? review.approvalInformationSeal : review?.approvalCommit;
  return <div className="min-h-screen bg-base-100 text-base-content" data-theme="roost">
    <header className="border-b border-base-300"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5"><strong className="text-xl">Roost · {t("taskWork.title")}</strong><CcButton size="sm" variant="ghost" onClick={() => void signOut()}>{t("taskWork.signOut")}</CcButton></div></header>
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      {loading && !task ? <CcNotice tone="loading" title={c.loading} /> : null}
      {error ? <CcNotice live tone="error" title={t("taskWork.error")} /> : null}
      {task ? <>
        <section className="grid gap-3 rounded-company border border-base-300 bg-base-200/40 p-5"><p className="text-sm font-semibold uppercase tracking-widest text-company-muted">{t("taskWork.exactScope")}</p><h1 className="text-2xl font-bold">{task.title}</h1><p className="text-sm text-company-muted">{taskId}</p>{task.description ? <p className="whitespace-pre-wrap">{task.description}</p> : null}</section>
        {review?.result ? <section className="grid gap-4 rounded-company border border-base-300 p-5"><h2 className="text-xl font-bold">{c.material}</h2><p>{review.result.summary}</p><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt>{c.version}</dt><dd className="break-all font-mono">{review.materialVersion}</dd></div><div><dt>{c.attempt}</dt><dd>{review.result.attempt ?? "—"}</dd></div></dl>{review.result.finalResponse ? <div><h3 className="font-semibold">{c.details}</h3><pre className="whitespace-pre-wrap break-words text-sm">{review.result.finalResponse}</pre></div> : null}</section> : <CcNotice tone="info" title={t("taskWork.awaitingResult")} />}
        {review?.decision ? <CcNotice tone={review.decision.decision === "approve" ? "success" : "warning"} title={review.decision.decision === "approve" ? c.approved : c.reject} detail={review.decision.evidence?.summary} /> : null}
        {saved ? <CcNotice live tone="success" title={c.saved} /> : null}
        {review?.canReview && review.result ? <form className="grid gap-5 rounded-company border border-base-300 p-5" onSubmit={submit}><h2 className="text-xl font-bold">{c.decision}</h2><p className="text-sm text-company-muted">{c.boundary}</p><CcField label={c.decision}>{({ id }) => <select className="select select-bordered w-full" id={id} onChange={(event) => edit("decision", event.target.value)} value={draft.decision}><option value="reject">{c.reject}</option><option disabled={!approvalProof} value="approve">{c.approve}</option></select>}</CcField>
          {field("summary", true)}<div className="grid gap-4 sm:grid-cols-2">{field("reference")}{field("testResult")}</div>
          {draft.decision === "reject" ? <><p className="text-sm text-company-muted">{c.lines}</p>{field("reproduction", true)}<div className="grid gap-4 sm:grid-cols-2">{field("expected", true)}{field("observed", true)}{field("scope", true)}{field("excluded", true)}</div>{field("outcome")}{field("competencies", true)}</> : <p className="break-all text-sm">{review.informationTask ? t("taskWork.informationProof") : c.testPassAttestation} <span className="font-mono">{approvalProof}</span></p>}
          <div className="flex justify-end"><CcButton disabled={busy || draft.decision === "approve" && !approvalProof} loading={busy} type="submit" variant="primary">{c.recordReview}</CcButton></div>
        </form> : <CcNotice tone="info" title={review?.reason ? c[review.reason as keyof typeof c] ?? t("taskWork.awaitingAssignment") : t("taskWork.awaitingAssignment")} detail={!review || review.reason === "verifier_required" || review.reason === "roles_need_context" ? t("taskWork.assignmentDetail") : undefined} />}
        <CcButton onClick={() => void load()} variant="outline">{c.refresh}</CcButton>
      </> : null}
    </main>
  </div>;
}
