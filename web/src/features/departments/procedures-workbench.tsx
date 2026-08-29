import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, CcTableColumn, CcTableRowAction } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcMultiSelect, CcMultiSelectOption } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { CcTextInput } from "../../components/cc-text-input";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type ProcedureStep = {
  id: string;
  stepOrder: number;
  instruction: string;
  stepType: string;
  requiredToolAdapterId?: string | null;
  expectedInput?: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  validationRule?: Record<string, unknown>;
  rollbackInstruction?: string | null;
};

type ProcedureStepDraft = Omit<ProcedureStep, "id" | "stepOrder"> & { clientId: string };

type ToolAdapter = {
  id: string;
  provider: string;
  name: string;
  connectionStatus: string;
};

type IntegrationCapability = {
  capabilityKey: string;
  requiredPermissions?: unknown;
  toolAdapter?: { name?: string; provider?: string } | null;
};

type ProcessDefinition = {
  id: string;
  name: string;
  department?: string | null;
};

type Procedure = {
  id: string;
  familyId: string;
  name: string;
  purpose: string;
  scope?: string | null;
  expectedResult?: string | null;
  requiredTools: string[];
  requiredPermissions: string[];
  status: string;
  version: number;
  process?: ProcessDefinition | null;
  ownerRole?: { id: string; name: string } | null;
  steps: ProcedureStep[];
  updatedAt: string;
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function departmentScopes(process?: ProcessDefinition | null) {
  const value = process?.department?.trim();
  if (!value) return ["All departments"];
  return [...new Set(value.split(/\s*(?:\/|,|;|\||\+|&)\s*/).map((item) => item.trim()).filter(Boolean))];
}

function statusBadge(status: string) {
  if (status === "active") return "badge-success";
  if (status === "draft") return "badge-warning";
  return "badge-ghost";
}

function updatedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function newStep(index: number): ProcedureStepDraft {
  return {
    clientId: `new-step-${Date.now()}-${index}`,
    instruction: "",
    stepType: "manual",
    requiredToolAdapterId: null,
    expectedInput: {},
    expectedOutput: {},
    validationRule: {},
    rollbackInstruction: null
  };
}

function ProcedureStepsEditor({ steps, onChange }: { steps: ProcedureStepDraft[]; onChange: (steps: ProcedureStepDraft[]) => void }) {
  function update(index: number, patch: Partial<ProcedureStepDraft>) {
    onChange(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      <input name="stepsJson" type="hidden" value={JSON.stringify(steps.map(({ clientId: _clientId, ...step }) => step))} />
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li className="roost-work-panel-muted grid gap-3 rounded-company p-3" key={step.clientId}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>
                <CcSelect
                  aria-label={`Execution type for step ${index + 1}`}
                  className="select-sm"
                  onChange={(event) => update(index, { stepType: event.target.value })}
                  value={step.stepType}
                >
                  <option value="manual">Manual</option>
                  <option value="agent">Agent</option>
                  <option value="human_review">Human review</option>
                  <option value="automated">Automated</option>
                  <option value="integration_call">Integration call</option>
                </CcSelect>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label={`Move step ${index + 1} up`} className="btn btn-ghost btn-xs btn-square" disabled={index === 0} onClick={() => move(index, -1)} title="Move up" type="button"><i className="ph-bold ph-arrow-up" aria-hidden="true"></i></button>
                <button aria-label={`Move step ${index + 1} down`} className="btn btn-ghost btn-xs btn-square" disabled={index === steps.length - 1} onClick={() => move(index, 1)} title="Move down" type="button"><i className="ph-bold ph-arrow-down" aria-hidden="true"></i></button>
                <button aria-label={`Remove step ${index + 1}`} className="btn btn-ghost btn-xs btn-square text-error" disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))} title="Remove step" type="button"><i className="ph-bold ph-trash" aria-hidden="true"></i></button>
              </div>
            </div>
            <textarea
              aria-label={`Instruction for step ${index + 1}`}
              className="textarea textarea-bordered min-h-20 w-full"
              onChange={(event) => update(index, { instruction: event.target.value })}
              placeholder="Describe one clear action and its expected outcome."
              required
              value={step.instruction}
            />
          </li>
        ))}
      </ol>
      <CcButton iconLeft="ph-plus" onClick={() => onChange([...steps, newStep(steps.length)])} size="sm" variant="outline">Add step</CcButton>
    </div>
  );
}

function ProcedureEditor({ procedure, processes, toolOptions, permissionOptions, saving, error, onClose, onSubmit }: {
  procedure: Procedure | null;
  processes: ProcessDefinition[];
  toolOptions: CcMultiSelectOption[];
  permissionOptions: CcMultiSelectOption[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isImprovement = Boolean(procedure && procedure.status !== "draft");
  const [requiredTools, setRequiredTools] = useState(procedure?.requiredTools || []);
  const [requiredPermissions, setRequiredPermissions] = useState(procedure?.requiredPermissions || []);
  const [steps, setSteps] = useState<ProcedureStepDraft[]>(procedure?.steps.length
    ? procedure.steps.map(({ id, stepOrder: _stepOrder, ...step }) => ({ ...step, clientId: id }))
    : [newStep(0)]);
  const completeToolOptions = useMemo(() => {
    const known = new Set(toolOptions.map((option) => option.value));
    return [...toolOptions, ...requiredTools.filter((value) => !known.has(value)).map((value) => ({ value, label: humanize(value), description: "Existing requirement" }))];
  }, [requiredTools, toolOptions]);
  const completePermissionOptions = useMemo(() => {
    const known = new Set(permissionOptions.map((option) => option.value));
    return [...permissionOptions, ...requiredPermissions.filter((value) => !known.has(value)).map((value) => ({ value, label: value, description: "Existing requirement" }))];
  }, [permissionOptions, requiredPermissions]);
  return (
    <CcRecordEditorModal
      actions={<><CcButton onClick={onClose} type="button" variant="ghost">Cancel</CcButton><CcButton loading={saving} type="submit" variant="primary">Save draft</CcButton></>}
      description={isImprovement ? "Saving creates a new draft version. The active procedure stays unchanged until the draft is activated." : "Define the reusable method, its operating scope, expected result, and executable steps."}
      eyebrow="04 Operations · Procedures"
      maxWidthClassName="max-w-5xl"
      meta={procedure ? <span>Version {procedure.version}</span> : null}
      onClose={onClose}
      onSubmit={onSubmit}
      title={procedure ? (isImprovement ? `Improve ${procedure.name}` : `Edit ${procedure.name}`) : "New procedure"}
      titleId="procedure-editor-title"
    >
      {error ? <CcNotice tone="error" title={error} live /> : null}
      <CcRecordEditorSection title="Definition" description="The short operating contract people and agents see before they start work.">
        <div className="grid gap-4 md:grid-cols-2">
          <CcField label="Name" required>{({ id, describedBy, invalid }) => <CcTextInput aria-describedby={describedBy} autoFocus defaultValue={procedure?.name || ""} id={id} invalid={invalid} name="name" required />}</CcField>
          <CcField label="Related process" hint="The process supplies the department lens. A cross-department process can expose this procedure in several departments.">
            {({ id, describedBy, invalid }) => <CcSelect aria-describedby={describedBy} defaultValue={procedure?.process?.id || ""} id={id} invalid={invalid} name="processId"><option value="">All departments / no process</option>{processes.map((process) => <option key={process.id} value={process.id}>{process.name}{process.department ? ` · ${process.department}` : ""}</option>)}</CcSelect>}
          </CcField>
          <div className="md:col-span-2"><CcField label="Purpose" required>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.purpose || ""} id={id} name="purpose" required />}</CcField></div>
          <CcField label="Scope">{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.scope || ""} id={id} name="scope" />}</CcField>
          <CcField label="Expected result" required>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.expectedResult || ""} id={id} name="expectedResult" required />}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Execution" description="Keep only requirements that change how the procedure can be carried out.">
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <CcField label="Required tools" hint="Select registered workspace adapters. Typed values are not accepted.">{({ id }) => <CcMultiSelect id={id} name="requiredTools" onChange={setRequiredTools} options={completeToolOptions} placeholder="No tools required" searchPlaceholder="Search tools..." value={requiredTools} />}</CcField>
            <CcField label="Required permissions" hint="Select capabilities from the current Roost and integration permission catalogs.">{({ id }) => <CcMultiSelect id={id} name="requiredPermissions" onChange={setRequiredPermissions} options={completePermissionOptions} placeholder="No explicit permissions" searchPlaceholder="Search permissions..." value={requiredPermissions} />}</CcField>
          </div>
          <div className="border-t border-base-300 pt-4">
            <div className="mb-3">
              <h4 className="font-black text-company-ink">Steps</h4>
              <p className="text-sm text-company-muted">Each action is a separate ordered record. Add, remove, or move steps without rewriting the whole procedure.</p>
            </div>
            <ProcedureStepsEditor onChange={setSteps} steps={steps} />
          </div>
        </div>
      </CcRecordEditorSection>
    </CcRecordEditorModal>
  );
}

function ProcedureDetail({ procedure, busy, onActivate, onArchive, onClose, onEdit }: {
  procedure: Procedure;
  busy: boolean;
  onActivate: () => void;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const departments = departmentScopes(procedure.process);
  return (
    <div aria-labelledby="procedure-detail-title" aria-modal="true" className="fixed inset-0 z-40 grid place-items-center bg-neutral/60 p-3 sm:p-4" role="dialog">
      <article className="roost-work-surface grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-company shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100/45 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className={`badge badge-sm ${statusBadge(procedure.status)}`}>{humanize(procedure.status)}</span><span className="text-xs font-bold text-company-muted">Version {procedure.version} · Updated {updatedLabel(procedure.updatedAt)}</span></div>
            <h2 className="mt-2 text-2xl font-black text-company-ink" id="procedure-detail-title">{procedure.name}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted">{procedure.purpose}</p>
          </div>
          <button aria-label="Close procedure" className="btn btn-ghost btn-sm btn-circle" onClick={onClose} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button>
        </header>
        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
          <dl className="grid gap-0 border-y border-base-300 text-sm md:grid-cols-2">
            {[["Departments", departments.join(" · ")], ["Process", procedure.process?.name || "Not linked"], ["Scope", procedure.scope || "Not specified"], ["Expected result", procedure.expectedResult || "Missing — activation is blocked"], ["Owner", procedure.ownerRole?.name || "Not assigned"], ["Authority", procedure.requiredPermissions.length ? procedure.requiredPermissions.join(", ") : "No explicit permission requirements"]].map(([label, value]) => (
              <div className="grid gap-1 border-b border-base-300 px-1 py-3 last:border-b-0 md:grid-cols-[8rem_minmax(0,1fr)] md:odd:border-r" key={label}><dt className="font-bold text-company-muted">{label}</dt><dd className="min-w-0 text-company-ink">{value}</dd></div>
            ))}
          </dl>
          <section className="mt-6">
            <div className="flex items-end justify-between gap-3 border-b border-base-300 pb-2"><div><h3 className="font-black text-company-ink">Steps</h3><p className="text-sm text-company-muted">The executable order of work.</p></div><span className="text-xs font-bold text-company-muted">{procedure.steps.length} {procedure.steps.length === 1 ? "step" : "steps"}</span></div>
            <ol>{procedure.steps.map((step) => <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-base-300 py-4" key={step.id}><span className="text-right text-sm font-black tabular-nums text-primary">{String(step.stepOrder).padStart(2, "0")}</span><div className="min-w-0"><p className="text-sm font-bold leading-6 text-company-ink">{step.instruction}</p>{step.rollbackInstruction ? <p className="mt-1 text-xs text-warning">Rollback: {step.rollbackInstruction}</p> : null}</div></li>)}</ol>
          </section>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 bg-base-100/35 p-4 sm:px-5">
          <CcButton disabled={busy} iconLeft="ph-archive" onClick={onArchive} size="sm" variant="ghost">Archive</CcButton>
          <div className="flex flex-wrap justify-end gap-2"><CcButton onClick={onClose} size="sm" variant="ghost">Close</CcButton><CcButton iconLeft="ph-pencil-simple" onClick={onEdit} size="sm" variant="outline">{procedure.status === "draft" ? "Edit draft" : "Create improvement draft"}</CcButton>{procedure.status === "draft" ? <CcButton loading={busy} onClick={onActivate} size="sm" variant="primary">Activate</CcButton> : null}</div>
        </footer>
      </article>
    </div>
  );
}

export function ProceduresWorkbench() {
  const { locale, t } = useLanguage();
  const tableLabels = useTranslatedTableLabels();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [toolAdapters, setToolAdapters] = useState<ToolAdapter[]>([]);
  const [integrationCapabilities, setIntegrationCapabilities] = useState<IntegrationCapability[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Procedure | null | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const load = useCallback(async (preferredId?: string) => {
    try {
      const [procedureResponse, processResponse, toolResponse, integrationCapabilityResponse, connectionResponse] = await Promise.all([
        api<{ data: Procedure[] }>("/v1/process-core/procedures"),
        api<{ data: ProcessDefinition[] }>("/v1/company-os/processes?limit=100"),
        api<{ data: ToolAdapter[] }>("/v1/company-os/tool-adapters?limit=100"),
        api<{ data: IntegrationCapability[] }>("/v1/company-os/integration-capabilities?limit=100"),
        api<{ data?: { capabilities?: string[] } }>("/v1/connection")
      ]);
      setProcedures(procedureResponse.data);
      setProcesses(processResponse.data);
      setToolAdapters(toolResponse.data);
      setIntegrationCapabilities(integrationCapabilityResponse.data);
      setPermissionCatalog(connectionResponse.data?.capabilities || []);
      setStatus("ready");
      setError(null);
      setSelectedId((current) => { const candidate = preferredId || current; return candidate && procedureResponse.data.some((item) => item.id === candidate) ? candidate : null; });
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "procedures_load_failed");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const selected = procedures.find((item) => item.id === selectedId) || null;
  const toolOptions = useMemo<CcMultiSelectOption[]>(() => [
    { value: "companycore", label: "Roost", description: "Built-in operating system" },
    ...toolAdapters.map((adapter) => ({ value: adapter.provider, label: adapter.name, description: humanize(adapter.connectionStatus) }))
  ], [toolAdapters]);
  const permissionOptions = useMemo<CcMultiSelectOption[]>(() => {
    const options = new Map<string, CcMultiSelectOption>();
    permissionCatalog.forEach((permission) => options.set(permission, { value: permission, label: permission, description: "Roost capability" }));
    integrationCapabilities.forEach((capability) => stringArray(capability.requiredPermissions).forEach((permission) => options.set(permission, {
      value: permission,
      label: permission,
      description: `${capability.toolAdapter?.name || humanize(capability.toolAdapter?.provider || "integration")} · ${humanize(capability.capabilityKey)}`
    })));
    return [...options.values()].sort((left, right) => left.value.localeCompare(right.value));
  }, [integrationCapabilities, permissionCatalog]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        name: form.get("name"),
        purpose: form.get("purpose"),
        scope: form.get("scope") || null,
        processId: form.get("processId") || null,
        expectedResult: form.get("expectedResult"),
        requiredTools: form.getAll("requiredTools").map(String),
        requiredPermissions: form.getAll("requiredPermissions").map(String),
        steps: JSON.parse(String(form.get("stepsJson") || "[]"))
      };
      const response = editing ? await api<{ data: Procedure }>(`/v1/process-core/procedures/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) }) : await api<{ data: Procedure }>("/v1/process-core/procedures", { method: "POST", body: JSON.stringify(payload) });
      setEditing(undefined);
      await load(response.data.id);
      setSelectedId(response.data.id);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "procedure_save_failed");
    } finally { setBusy(false); }
  }

  async function activate() {
    if (!selected) return;
    setBusy(true);
    try { await api(`/v1/process-core/procedures/${selected.id}/actions/activate`, { method: "POST", body: "{}" }); await load(selected.id); }
    catch (caught) { setError(caught instanceof AppApiError ? caught.code : "procedure_activation_failed"); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!selected) return;
    setBusy(true);
    try { await api(`/v1/process-core/procedures/${selected.id}/actions/archive`, { method: "POST", body: "{}" }); setSelectedId(null); await load(); }
    catch (caught) { setError(caught instanceof AppApiError ? caught.code : "procedure_archive_failed"); }
    finally { setBusy(false); setConfirmArchive(false); }
  }

  const columns = useMemo<Array<CcTableColumn<Procedure>>>(() => [
    { key: "name", header: t("procedures.procedure"), required: true, sortable: true, sortValue: (procedure) => procedure.name, searchValue: (procedure) => [procedure.name, procedure.purpose, procedure.scope, procedure.process?.name].filter(Boolean).join(" "), className: "min-w-[18rem]", cell: (procedure) => <div className="min-w-0"><strong className="block truncate text-company-ink">{procedure.name}</strong><span className="block truncate text-xs text-company-muted">{procedure.purpose}</span></div> },
    { key: "departments", header: t("procedures.departments"), filterable: true, filterLabel: t("procedures.department"), filterValue: (procedure) => departmentScopes(procedure.process), searchValue: (procedure) => departmentScopes(procedure.process).join(" "), className: "min-w-[12rem]", cell: (procedure) => <span className="text-sm text-company-ink">{departmentScopes(procedure.process).join(" · ")}</span> },
    { key: "process", header: t("procedures.process"), sortable: true, sortValue: (procedure) => procedure.process?.name || "", className: "min-w-[12rem]", cell: (procedure) => <span className="block truncate text-company-ink">{procedure.process?.name || t("procedures.notLinked")}</span> },
    { key: "status", header: t("procedures.status"), filterable: true, filterValue: (procedure) => procedure.status, filterOptions: ["draft", "active", "archived", "retired"].map((value) => ({ value, label: humanizeBusinessValue(value, "Unknown", locale) })), sortable: true, className: "w-28 min-w-28", cell: (procedure) => <span className={`badge badge-sm ${statusBadge(procedure.status)}`}>{humanizeBusinessValue(procedure.status, "Unknown", locale)}</span> },
    { key: "updated", header: t("procedures.updated"), sortable: true, sortValue: (procedure) => new Date(procedure.updatedAt), className: "w-36 min-w-36", cell: (procedure) => <span className="text-sm text-company-muted">{updatedLabel(procedure.updatedAt)}</span> }
  ], [locale, t]);
  const rowActions = useMemo<Array<CcTableRowAction<Procedure>>>(() => [
    { key: "preview", label: t("procedures.open"), icon: "ph-eye", tone: "outline", onClick: (procedure) => setSelectedId(procedure.id) },
    { key: "edit", label: t("procedures.edit"), icon: "ph-pencil-simple", tone: "ghost", onClick: (procedure) => setEditing(procedure) }
  ], [t]);

  return (
    <section className="roost-work-surface grid min-h-[calc(100vh-10rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-company p-3">
      <CcPageHeader actions={<CcButton iconLeft="ph-plus" onClick={() => { setError(null); setEditing(null); }} size="sm" variant="primary">{t("procedures.new")}</CcButton>} description={t("procedures.description")} eyebrow={t("procedures.eyebrow")} title={t("views.04.procedures")} />
      <div className="min-h-0 min-w-0 overflow-y-auto">
        {status === "loading" ? <CcNotice tone="loading" title={t("procedures.loading")} /> : null}
        {status === "error" ? <CcNotice tone="error" title={error || t("procedures.loadError")} /> : null}
        {status === "ready" ? <CcDataTable columns={columns} density="compact" emptyDetail={t("procedures.emptyDetail")} emptyTitle={t("procedures.empty")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} getRowLabel={(procedure) => procedure.name} initialQuickFilter="current" initialSort={{ key: "name", direction: "asc" }} labels={tableLabels} mobileMode="cards" quickFilters={[{ key: "current", label: t("procedures.current"), predicate: (procedure) => !["archived", "retired"].includes(procedure.status) }, { key: "all", label: t("procedures.all"), predicate: () => true }]} rowActionItems={rowActions} rows={procedures} searchPlaceholder={t("procedures.search")} tableMinWidthClassName="min-w-[920px]" /> : null}
      </div>
      {selected ? <ProcedureDetail busy={busy} onActivate={() => void activate()} onArchive={() => setConfirmArchive(true)} onClose={() => setSelectedId(null)} onEdit={() => { setSelectedId(null); setError(null); setEditing(selected); }} procedure={selected} /> : null}
      {selected && confirmArchive ? <CcConfirmDialog busy={busy} confirmIcon="ph-archive" confirmLabel="Archive" confirmTone="warning" description="This keeps the procedure and its version history, but removes it from current operational use." detail={<><strong className="text-company-ink">{departmentScopes(selected.process).join(" · ")}</strong><span className="mx-2 text-company-muted">/</span><span>Version {selected.version}</span></>} eyebrow="Archive procedure" onCancel={() => setConfirmArchive(false)} onConfirm={() => void archive()} title={selected.name} /> : null}
      {editing !== undefined ? <ProcedureEditor error={error} onClose={() => { setEditing(undefined); setError(null); }} onSubmit={(event) => void submit(event)} permissionOptions={permissionOptions} procedure={editing} processes={processes} saving={busy} toolOptions={toolOptions} /> : null}
    </section>
  );
}
