import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcSelect } from "../../components/cc-select";
import type { CatalogEntry, Draft, ReadyEditor, ScopeDraft } from "./task-readiness-model";

export function SingleTaskFields({ editor, draft, update, tr }: { editor: ReadyEditor; draft: Draft; update: (draft: Draft) => void; tr: (key: string) => string }) {
  const s = draft.singleTask, change = (value: Partial<ScopeDraft>) => update({ ...draft, singleTask: { ...s, ...value } });
  function reference(key: "component" | "manager" | "evidence", catalog: CatalogEntry[]) {
    const current = s[key], selected = catalog.find(item => item.id === current?.id), stale = current && current.revision !== selected?.revision;
    return <div className="grid gap-2"><CcField label={tr(`single.${key}`)} required error={stale ? tr("staleRefs") : undefined}>{({ id }) => <CcSelect id={id} required value={current?.id ?? ""} onChange={event => { const found = catalog.find(item => item.id === event.target.value); change({ [key]: found ? { id: found.id, revision: found.revision } : null }); }}><option value="">{tr("choose")}</option>{catalog.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{current && !selected ? <option value={current.id}>{tr("staleRefs")}</option> : null}</CcSelect>}</CcField>{stale && selected ? <CcButton variant="outline" size="sm" onClick={() => change({ [key]: { id: selected.id, revision: selected.revision } })}>{tr("refreshRefs")}</CcButton> : null}</div>;
  }
  function input(key: "metric" | "target" | "unit" | "method" | "mechanism" | "inseparability", multiline = false) {
    return <CcField label={tr(`single.${key}`)} required>{({ id }) => multiline ? <textarea className="textarea textarea-bordered w-full min-h-24" id={id} required maxLength={2000} value={s[key]} onChange={event => change({ [key]: event.target.value })} /> : <input className="input input-bordered w-full" id={id} required type={key === "target" ? "number" : "text"} step={key === "target" ? "any" : undefined} maxLength={2000} value={s[key]} onChange={event => change({ [key]: event.target.value })} />}</CcField>;
  }
  const technical = draft.refs.technical.map(ref => ({ ...ref, label: editor.sources.find(source => source.id === ref.id)?.label ?? tr("staleRefs") }));
  return <section className="grid gap-4 border-t border-base-300 pt-4">
    <h3 className="font-bold">{tr("single.title")}</h3><p className="text-sm text-company-muted">{tr("single.hint")}</p>
    <div className="grid gap-4 sm:grid-cols-2">{reference("component", editor.components ?? [])}{reference("manager", editor.managers ?? [])}<CcField label={tr("single.branch")} hint={tr("single.branchHint")}>{({ id }) => <input id={id} className="input input-bordered w-full font-mono text-xs" readOnly value={editor.taskIdentity?.branch ?? ""} />}</CcField><p className="self-center break-all text-xs text-company-muted">{editor.taskIdentity?.contractId}</p></div>
    <h4 className="font-bold">{tr("single.measurement")}</h4><div className="grid gap-4 sm:grid-cols-2">{input("metric")}<CcField label={tr("single.comparison")} required>{({ id }) => <CcSelect id={id} value={s.comparison} onChange={event => change({ comparison: event.target.value })}>{["eq", "lte", "gte"].map(value => <option key={value} value={value}>{tr(`single.${value}`)}</option>)}</CcSelect>}</CcField>{input("target")}{input("unit")}{input("method", true)}</div>
    {s.problems.map((problem, index) => <div className="grid gap-3 border-t border-base-300 pt-4" key={index}><CcField label={`${tr("single.problem")} ${index + 1}`} required>{({ id }) => <input className="input input-bordered w-full" id={id} required maxLength={400} value={problem.statement} onChange={event => change({ problems: s.problems.map((p, i) => i === index ? { ...p, statement: event.target.value } : p) })} />}</CcField>{s.problems.length > 1 ? <><CcField label={tr("single.causalLink")} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" required minLength={20} maxLength={2000} value={problem.causalLink} onChange={event => change({ problems: s.problems.map((p, i) => i === index ? { ...p, causalLink: event.target.value } : p) })} />}</CcField><CcButton variant="ghost" size="sm" onClick={() => change({ problems: s.problems.filter((_, i) => i !== index) })}>{tr("single.remove")}</CcButton></> : null}</div>)}
    <CcButton variant="outline" size="sm" disabled={s.problems.length >= 3} onClick={() => change({ problems: [...s.problems, { statement: "", causalLink: "" }] })}>{tr("single.addSymptom")}</CcButton>
    {s.problems.length > 1 ? <><CcNotice tone="warning" title={tr("single.exception")} detail={tr("single.exceptionHint")} /><div className="grid gap-4 sm:grid-cols-2">{input("mechanism", true)}{input("inseparability", true)}{reference("evidence", technical)}</div></> : null}
    <p className="text-sm text-company-muted">{tr("single.split")}</p>
  </section>;
}
