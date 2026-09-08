import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcSelect } from "../../components/cc-select";
import type { Draft, ReadyEditor } from "./task-readiness-model";

export function TaskRoleSummary({ editor, tr }: { editor: ReadyEditor; tr: (key: string) => string }) {
  const roles = editor.accepted?.contract.taskRoles;
  if (!roles) return null;
  return <section className="grid gap-2 text-sm"><h3 className="font-bold">{tr("roles.title")}</h3><dl className="grid gap-3 sm:grid-cols-2">{["requester", "accountableManager", "executor", "verifier", "releaser"].map(name => <div key={name}><dt className="text-company-muted">{tr(name === "accountableManager" ? "single.manager" : `roles.${name}`)}</dt><dd>{name === "requester" ? editor.requester?.label ?? tr("staleRefs") : editor.roleCatalog?.find(item => item.id === roles[name].id)?.label ?? tr("staleRefs")}</dd></div>)}</dl></section>;
}

export function TaskRoleFields({ editor, draft, update, tr }: { editor: ReadyEditor; draft: Draft; update: (draft: Draft) => void; tr: (key: string) => string }) {
  const catalog = editor.roleCatalog ?? [], roles = draft.taskRoles;
  const change = (name: keyof typeof roles, current: { id: string; revision: string } | null) => update({ ...draft, taskRoles: { ...roles, [name]: current ? { id: current.id, revision: current.revision } : null } });
  return <section className="grid gap-4 border-t border-base-300 pt-4">
    <h3 className="font-bold">{tr("roles.title")}</h3><p className="text-sm text-company-muted">{tr("roles.hint")}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {(["requester", "executor"] as const).map(name => {
        const current = name === "requester" ? editor.requester : catalog.find(item => item.id === editor.agent?.id), selected = roles[name];
        const stale = !current || selected?.id !== current.id || selected?.revision !== current.revision;
        return <div key={name} className="grid gap-2"><CcField label={tr(`roles.${name}`)} hint={tr(name === "requester" ? editor.roleOrigin?.established ? "roles.originEstablished" : "roles.originNew" : "roles.executorHint")} error={stale ? tr("roles.reviewReference") : undefined}>{({ id, describedBy }) => <input id={id} aria-describedby={describedBy} className="input input-bordered w-full" readOnly value={current?.label ?? tr("staleRefs")} />}</CcField>{stale && current ? <CcButton size="sm" variant="outline" onClick={() => change(name, current)}>{tr("roles.confirmReference")}</CcButton> : null}</div>;
      })}
      {(["verifier", "releaser"] as const).map(name => {
        const selected = roles[name], current = catalog.find(item => item.id === selected?.id), stale = selected && selected.revision !== current?.revision;
        const conflict = current?.principalKey && (editor.excludedRolePrincipals ?? []).includes(current.principalKey);
        const mandate = name === "verifier" ? "task_verification" : "release_authorization";
        const qualified = current?.eligible && current.mandates.includes(mandate) && (name !== "verifier" || draft.competencies.every(skill => current.competencies.includes(skill)));
        return <div key={name} className="grid gap-2"><CcField label={tr(`roles.${name}`)} required hint={tr(`roles.${name}Hint`)} error={conflict ? tr("roles.conflict") : stale ? tr("staleRefs") : selected && !qualified ? tr("roles.missingEvidence") : undefined}>{({ id, describedBy }) => <CcSelect id={id} aria-describedby={describedBy} required value={selected?.id ?? ""} onChange={event => change(name, catalog.find(item => item.id === event.target.value) ?? null)}><option value="">{tr("choose")}</option>{catalog.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{selected && !current ? <option value={selected.id}>{tr("staleRefs")}</option> : null}</CcSelect>}</CcField>{stale && current ? <CcButton size="sm" variant="outline" onClick={() => change(name, current)}>{tr("refreshRefs")}</CcButton> : null}</div>;
      })}
    </div>
    <p className="text-sm">{tr("roles.managerHint")}</p>
    <CcNotice tone="info" title={tr("roles.boundary")} detail={tr("roles.evidenceHint")} />
    {editor.roleCatalogTruncated ? <p className="text-sm text-company-muted">{tr("limited")}</p> : null}
  </section>;
}
