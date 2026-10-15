import { ProcedureContractsModal } from "./procedure-composition";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, CcTableColumn, CcTableRowAction } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcMultiSelect, CcMultiSelectOption } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { CcTextInput } from "../../components/cc-text-input";
import { useLanguage } from "../../i18n/i18n";
import type { AuthMe, CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { DepartmentScopeControl } from "./department-scope-control";
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

type ArchiveLink = { id?: string; scopeId?: string; pipelineId?: string | null; applicationId?: string; capabilityDefinitionId?: string; taskId?: string; status?: string; taskStatus?: string; scopeVersion?: number; current?: boolean; required?: boolean; deprecated?: boolean };
type ArchiveImpact = {
  steps: number;
  procedureContracts: number;
  procedureContractVersions: Array<{ id: string; sourceVersion: string }>;
  pipelineStages: ArchiveLink[];
  pipelineRuns: ArchiveLink[];
  stageRuns: ArchiveLink[];
  policies: ArchiveLink[];
  applicationLinks: ArchiveLink[];
  capabilityLinks: ArchiveLink[];
  taskAdmissions: ArchiveLink[];
  activeExecutions: ArchiveLink[];
  compositionTasks: ArchiveLink[];
  protectedChecklist: boolean;
};
type ArchivePreview = {
  procedure: Pick<Procedure, "id" | "familyId" | "name" | "version" | "status" | "updatedAt">;
  impact: ArchiveImpact;
  blockers: string[];
  digest: string;
  previewToken: string;
  expiresAt: string;
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

function ProcedureDetail({ procedure, busy, archiveOpen = false, canArchive, onActivate, onArchive, onClose, onEdit }: {
  procedure: Procedure;
  busy: boolean;
  onActivate: () => void;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
  archiveOpen?: boolean;
  canArchive: boolean;
}) {
  const { t } = useLanguage();
  const departments = departmentScopes(procedure.process);
  return (
    <div aria-labelledby="procedure-detail-title" aria-modal="true" aria-hidden={archiveOpen} className="fixed inset-0 z-40 grid place-items-center bg-neutral/60 p-3 sm:p-4" role="dialog">
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
          {canArchive && procedure.status !== "archived" ? <CcButton disabled={busy} iconLeft="ph-archive" onClick={onArchive} size="sm" variant="ghost">{t("procedures.archive.open")}</CcButton> : null}
          <div className="flex flex-wrap justify-end gap-2"><CcButton onClick={onClose} size="sm" variant="ghost">Close</CcButton><CcButton iconLeft="ph-pencil-simple" onClick={onEdit} size="sm" variant="outline">{procedure.status === "draft" ? "Edit draft" : "Create improvement draft"}</CcButton>{procedure.status === "draft" ? <CcButton loading={busy} onClick={onActivate} size="sm" variant="primary">Activate</CcButton> : null}</div>
        </footer>
      </article>
    </div>
  );
}

const archiveImpactGroups = [
  ["pipelineStages", "procedures.archive.pipelineStages"],
  ["pipelineRuns", "procedures.archive.pipelineRuns"],
  ["stageRuns", "procedures.archive.stageRuns"],
  ["policies", "procedures.archive.policies"],
  ["applicationLinks", "procedures.archive.applicationLinks"],
  ["capabilityLinks", "procedures.archive.capabilityLinks"],
  ["taskAdmissions", "procedures.archive.taskAdmissions"],
  ["activeExecutions", "procedures.archive.activeExecutions"],
  ["compositionTasks", "procedures.archive.compositionTasks"]
] as const;

const archiveBlockerLabels = {
  protected_checklist: "procedures.archive.blocker.protectedChecklist",
  active_stage_run: "procedures.archive.blocker.activeStageRun",
  active_pipeline_run: "procedures.archive.blocker.activePipelineRun",
  active_task_admission: "procedures.archive.blocker.activeTaskAdmission",
  active_execution: "procedures.archive.blocker.activeExecution",
  active_composition_task: "procedures.archive.blocker.activeCompositionTask",
  active_pipeline_stage: "procedures.archive.blocker.activePipelineStage",
  active_policy: "procedures.archive.blocker.activePolicy",
  required_application_link: "procedures.archive.blocker.requiredApplicationLink",
  required_capability_link: "procedures.archive.blocker.requiredCapabilityLink",
  already_archived: "procedures.archive.blocker.alreadyArchived"
} as const;

function completeArchivePreview(value: ArchivePreview | null): value is ArchivePreview {
  if (!value || !value.procedure?.id || !value.previewToken || !/^[a-f0-9]{64}$/.test(value.digest)
    || !Number.isFinite(new Date(value.expiresAt).getTime()) || !Array.isArray(value.blockers) || !value.impact) return false;
  const impact = value.impact;
  return typeof impact.steps === "number" && typeof impact.procedureContracts === "number"
    && Array.isArray(impact.procedureContractVersions) && impact.procedureContractVersions.length === impact.procedureContracts
    && impact.procedureContractVersions.every((item) => typeof item.id === "string" && typeof item.sourceVersion === "string")
    && typeof impact.protectedChecklist === "boolean"
    && archiveImpactGroups.every(([key]) => Array.isArray(impact[key]));
}

function ProcedureArchiveDialog({ procedure, preview, loading, busy, stale, error, reason, acknowledged, onReason, onAcknowledge, onRefresh, onCancel, onConfirm }: {
  procedure: Procedure;
  preview: ArchivePreview | null;
  loading: boolean;
  busy: boolean;
  stale: boolean;
  error: string | null;
  reason: string;
  acknowledged: boolean;
  onReason: (value: string) => void;
  onAcknowledge: (value: boolean) => void;
  onRefresh: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { locale, t } = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    host.current?.querySelector<HTMLButtonElement>("button")?.focus();
    host.current?.querySelector<HTMLElement>("[data-preview-scroll]")?.scrollTo({ top: 0 });
  }, [preview]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { event.preventDefault(); onCancel(); return; }
      if (event.key !== "Tab" || !host.current) return;
      const focusable = [...host.current.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled]), input:not([disabled])")];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);
  const valid = completeArchivePreview(preview) && preview.procedure.id === procedure.id;
  const identityChanged = valid && (preview.procedure.name !== procedure.name || preview.procedure.version !== procedure.version
    || preview.procedure.status !== procedure.status || preview.procedure.updatedAt !== procedure.updatedAt);
  const expired = !valid || new Date(preview.expiresAt).getTime() <= now;
  const blocked = !valid || preview.blockers.length > 0;
  const canConfirm = valid && !identityChanged && !expired && !stale && !blocked && !loading && !busy && acknowledged && reason.trim().length >= 12;
  const impact = valid ? preview.impact : null;
  return (
    <div ref={host} data-procedure-archive-dialog role="dialog" aria-modal="true" aria-labelledby="procedure-archive-title" aria-describedby="procedure-archive-description" className="fixed inset-0 z-[60] grid place-items-center bg-neutral/70 p-3 sm:p-4">
      <div className="grid max-h-[92vh] w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-company border border-base-300 bg-base-100 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-base-300 p-4 sm:p-5">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-warning">{t("procedures.archive.eyebrow")}</p><h2 id="procedure-archive-title" className="mt-2 text-xl font-black text-company-ink sm:text-2xl">{t("procedures.archive.title")}</h2><p id="procedure-archive-description" className="mt-2 text-sm leading-6 text-company-muted">{t("procedures.archive.description")}</p></div>
          <button type="button" aria-label={t("procedures.archive.close")} className="btn btn-ghost btn-sm btn-circle shrink-0" disabled={busy} onClick={onCancel}><span aria-hidden="true" className="text-xl leading-none">×</span></button>
        </header>
        <div data-preview-scroll className="min-h-0 space-y-4 overflow-y-auto p-4 text-sm sm:p-5" aria-live="polite">
          <div><strong className="block text-company-ink">{valid ? preview.procedure.name : procedure.name}</strong><span className="text-company-muted">{t("procedures.archive.version", { version: valid ? preview.procedure.version : procedure.version })} · {valid ? preview.procedure.familyId : procedure.familyId} · {humanizeBusinessValue(valid ? preview.procedure.status : procedure.status, "Unknown", locale)}</span></div>
          {loading ? <CcNotice tone="loading" title={t("procedures.archive.loading")} /> : null}
          {error && !stale ? <CcNotice tone="error" title={t("procedures.archive.error")} detail={error === "preview_incomplete" ? t("procedures.archive.unavailable") : error === "forbidden" ? t("procedures.archive.forbidden") : t("procedures.archive.retryError", { code: error })} /> : null}
          {stale || expired && valid ? <CcNotice tone="warning" title={t("procedures.archive.stale")} detail={t("procedures.archive.staleDetail")} /> : null}
          {identityChanged ? <CcNotice tone="warning" title={t("procedures.archive.identityChanged")} /> : null}
          {!valid && !loading && !error ? <CcNotice tone="warning" title={t("procedures.archive.unavailable")} /> : null}
          {valid ? <>
            <div className="border-y border-base-300 py-3"><p className="text-xs font-bold text-company-muted">{t("procedures.archive.expires", { at: new Date(preview.expiresAt).toLocaleString(locale) })}</p><p className="mt-1 break-all font-mono text-xs text-company-muted">{t("procedures.archive.digest")}: {preview.digest}</p></div>
            <section aria-label={t("procedures.archive.impact")}><h3 className="font-black text-company-ink">{t("procedures.archive.impact")}</h3><p className="mt-1 text-company-muted">{t("procedures.archive.historyKept")}</p><dl className="mt-2 divide-y divide-base-300 border-t border-base-300">
              <div className="flex justify-between gap-3 py-2"><dt>{t("procedures.archive.steps")}</dt><dd className="font-bold tabular-nums">{impact?.steps}</dd></div>
              <div className="py-2"><div className="flex justify-between gap-3"><dt>{t("procedures.archive.contracts")}</dt><dd className="font-bold tabular-nums">{impact?.procedureContracts}</dd></div>{impact?.procedureContractVersions.length ? <ul className="mt-1 space-y-1 break-all pl-3 font-mono text-xs text-company-muted">{impact.procedureContractVersions.map((contract) => <li key={contract.id}>{contract.id} · {contract.sourceVersion}</li>)}</ul> : null}</div>
              <div className="flex justify-between gap-3 py-2"><dt>{t("procedures.archive.protectedChecklist")}</dt><dd className="font-bold">{impact?.protectedChecklist ? t("procedures.archive.yes") : t("procedures.archive.no")}</dd></div>
              {archiveImpactGroups.map(([key, label]) => <div className="py-2" key={key}><div className="flex justify-between gap-3"><dt>{t(label)}</dt><dd className="font-bold tabular-nums">{impact?.[key].length}</dd></div>{impact?.[key].length ? <ul className="mt-1 space-y-1 break-all pl-3 font-mono text-xs text-company-muted">{impact[key].map((item, index) => <li key={`${key}-${item.id || item.scopeId || item.applicationId || item.capabilityDefinitionId || item.taskId}-${index}`}>{item.id || item.scopeId || item.applicationId || item.capabilityDefinitionId || item.taskId}{item.taskId && (item.id || item.scopeId) ? ` · ${item.taskId}` : ""}{item.pipelineId ? ` · ${item.pipelineId}` : ""}{item.status || item.taskStatus ? ` · ${item.status || item.taskStatus}` : ""}{item.scopeVersion !== undefined ? ` · v${item.scopeVersion}` : ""}{item.current ? ` · ${t("procedures.archive.current")}` : ""}{item.required ? ` · ${t("procedures.archive.required")}` : ""}{item.deprecated ? ` · ${t("procedures.archive.deprecated")}` : ""}</li>)}</ul> : null}</div>)}
            </dl></section>
            {preview.blockers.length ? <section aria-label={t("procedures.archive.blockers")} className="border-l-2 border-warning pl-3"><h3 className="font-black text-company-ink">{t("procedures.archive.blockers")}</h3><ul className="mt-2 list-disc space-y-1 pl-4">{preview.blockers.map((code) => <li key={code}>{code in archiveBlockerLabels ? t(archiveBlockerLabels[code as keyof typeof archiveBlockerLabels]) : t("procedures.archive.unknownBlocker", { code })}</li>)}</ul></section> : null}
            <CcField label={t("procedures.archive.reason")} hint={t("procedures.archive.reasonHint")} required>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-20 w-full" minLength={12} maxLength={1000} required value={reason} onChange={(event) => onReason(event.target.value)} />}</CcField>
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="checkbox checkbox-sm mt-0.5" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} /><span>{t("procedures.archive.acknowledge")}</span></label>
          </> : null}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-base-300 p-4 sm:p-5"><CcButton onClick={onCancel} disabled={busy} variant="ghost">{t("procedures.archive.cancel")}</CcButton><CcButton onClick={onRefresh} disabled={busy || loading} loading={loading} variant="outline">{t("procedures.archive.refresh")}</CcButton><CcButton onClick={onConfirm} disabled={!canConfirm} loading={busy} iconLeft="ph-archive" variant="warning">{t("procedures.archive.confirm")}</CcButton></footer>
      </div>
    </div>
  );
}

export function ProceduresWorkbench({ departmentKey = "04-operacje", canonical = true }: { departmentKey?: CoreAreaKey; canonical?: boolean }) {
  const { locale, t } = useLanguage();
  const requestedDepartment = canonical ? new URLSearchParams(window.location.search).get("department") as CoreAreaKey | null : departmentKey;
  const scoped = Boolean(requestedDepartment);
  const effectiveDepartment = requestedDepartment || departmentKey;
  const tableLabels = useTranslatedTableLabels();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [toolAdapters, setToolAdapters] = useState<ToolAdapter[]>([]);
  const [integrationCapabilities, setIntegrationCapabilities] = useState<IntegrationCapability[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<string[]>([]);
  const [contractId,setContractId]=useState<string|null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Procedure | null | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [ownerRole, setOwnerRole] = useState(false);
  const [archivePreview, setArchivePreview] = useState<ArchivePreview | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveStale, setArchiveStale] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveAcknowledged, setArchiveAcknowledged] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const archiveRequest = useRef<{ previewToken: string; reason: string; requestId: string } | null>(null);
  const archiveRead = useRef(0);
  const archiveTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    void api<{ data: AuthMe }>("/v1/auth/me").then(({ data }) => {
      if (alive) setOwnerRole(data.authType === "user" && data.workspaces?.some((workspace) => workspace.active && workspace.role === "owner") === true);
    }).catch(() => { if (alive) setOwnerRole(false); });
    return () => { alive = false; };
  }, []);

  const load = useCallback(async (preferredId?: string) => {
    try {
      const [procedureResponse, processResponse, toolResponse, integrationCapabilityResponse, connectionResponse] = await Promise.all([
        api<{ data: Procedure[] }>(scoped ? `/v1/process-core/procedures?departmentKey=${encodeURIComponent(effectiveDepartment)}&includeCompanyWide=false&includeArchived=true` : "/v1/process-core/procedures?includeArchived=true"),
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
  }, [effectiveDepartment, scoped]);

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
        steps: JSON.parse(String(form.get("stepsJson") || "[]")),
        ...(!editing ? { organizationalContext: { ownerDepartmentKey: effectiveDepartment, relatedDepartmentKeys: [], applicableDepartmentKeys: [], scopes: scoped ? [{ type: "department", entityId: effectiveDepartment }] : [{ type: "company" }] } } : {})
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

  function closeArchive() {
    archiveRead.current++;
    setConfirmArchive(false);
    setArchivePreview(null);
    setArchiveError(null);
    setArchiveStale(false);
    setArchiveReason("");
    setArchiveAcknowledged(false);
    archiveRequest.current = null;
    window.setTimeout(() => archiveTrigger.current?.focus(), 0);
  }

  async function refreshArchive(procedureId: string, refreshList = false) {
    const read = ++archiveRead.current;
    setArchiveLoading(true);
    setArchiveError(null);
    setArchiveStale(false);
    setArchivePreview(null);
    setArchiveAcknowledged(false);
    archiveRequest.current = null;
    try {
      if (refreshList) await load(procedureId);
      const response = await api<{ data: ArchivePreview }>(`/v1/process-core/procedures/${encodeURIComponent(procedureId)}/archive-preview`);
      if (read !== archiveRead.current) return;
      if (!completeArchivePreview(response.data) || response.data.procedure.id !== procedureId) throw new Error("preview_incomplete");
      setArchivePreview(response.data);
    } catch (caught) {
      if (read === archiveRead.current) setArchiveError(caught instanceof AppApiError ? caught.code : "preview_incomplete");
    } finally { if (read === archiveRead.current) setArchiveLoading(false); }
  }

  function openArchive() {
    if (!selected || !ownerRole || selected.status === "archived") return;
    archiveTrigger.current = document.activeElement as HTMLElement;
    setArchiveReason("");
    setArchiveSuccess(false);
    setConfirmArchive(true);
    void refreshArchive(selected.id);
  }

  async function archive() {
    if (!selected || !ownerRole || busy || archiveStale || !archiveAcknowledged || archiveReason.trim().length < 12 || !completeArchivePreview(archivePreview)
      || archivePreview.procedure.id !== selected.id || archivePreview.procedure.name !== selected.name || archivePreview.procedure.version !== selected.version
      || archivePreview.procedure.status !== selected.status || archivePreview.procedure.updatedAt !== selected.updatedAt
      || archivePreview.blockers.length || new Date(archivePreview.expiresAt).getTime() <= Date.now()) return;
    const reason = archiveReason.trim();
    if (!archiveRequest.current || archiveRequest.current.previewToken !== archivePreview.previewToken || archiveRequest.current.reason !== reason) {
      archiveRequest.current = { previewToken: archivePreview.previewToken, reason, requestId: crypto.randomUUID() };
    }
    setBusy(true);
    setArchiveError(null);
    try {
      await api(`/v1/process-core/procedures/${encodeURIComponent(selected.id)}/actions/archive`, { method: "POST", body: JSON.stringify(archiveRequest.current) });
      const archivedId = selected.id;
      closeArchive();
      await load(archivedId);
      setArchiveSuccess(true);
    } catch (caught) {
      const code = caught instanceof AppApiError ? caught.code : "procedure_archive_failed";
      if (["procedure_archive_stale", "procedure_archive_preview_expired", "procedure_archive_conflict", "procedure_archive_blocked", "procedure_archive_already_archived"].includes(code)) {
        setArchiveStale(true);
        setArchiveAcknowledged(false);
        archiveRequest.current = null;
      }
      setArchiveError(code);
    } finally { setBusy(false); }
  }

  const columns = useMemo<Array<CcTableColumn<Procedure>>>(() => [
    { key: "name", header: t("procedures.procedure"), required: true, sortable: true, sortValue: (procedure) => procedure.name, searchValue: (procedure) => [procedure.name, procedure.purpose, procedure.scope, procedure.process?.name].filter(Boolean).join(" "), className: "min-w-[18rem]", cell: (procedure) => <div className="min-w-0"><strong className="block truncate text-company-ink">{procedure.name}</strong><span className="block truncate text-xs text-company-muted">{procedure.purpose}</span></div> },
    { key: "departments", header: t("procedures.departments"), filterable: true, filterLabel: t("procedures.department"), filterValue: (procedure) => departmentScopes(procedure.process), searchValue: (procedure) => departmentScopes(procedure.process).join(" "), className: "min-w-[12rem]", cell: (procedure) => <span className="text-sm text-company-ink">{departmentScopes(procedure.process).join(" · ")}</span> },
    { key: "process", header: t("procedures.process"), sortable: true, sortValue: (procedure) => procedure.process?.name || "", className: "min-w-[12rem]", cell: (procedure) => <span className="block truncate text-company-ink">{procedure.process?.name || t("procedures.notLinked")}</span> },
    { key: "status", header: t("procedures.status"), filterable: true, filterValue: (procedure) => procedure.status, filterOptions: ["draft", "active", "archived", "retired"].map((value) => ({ value, label: humanizeBusinessValue(value, "Unknown", locale) })), sortable: true, className: "w-28 min-w-28", cell: (procedure) => <span className={`badge badge-sm ${statusBadge(procedure.status)}`}>{humanizeBusinessValue(procedure.status, "Unknown", locale)}</span> },
    { key: "updated", header: t("procedures.updated"), sortable: true, sortValue: (procedure) => new Date(procedure.updatedAt), className: "w-36 min-w-36", cell: (procedure) => <span className="text-sm text-company-muted">{updatedLabel(procedure.updatedAt)}</span> }
  ], [locale, t]);
  const rowActions = useMemo<Array<CcTableRowAction<Procedure>>>(() => [
    { key:"contracts",label:locale==="pl"?"Kontrakty wykonania":"Execution contracts",icon:"ph-list-checks",tone:"outline",onClick:procedure=>setContractId(procedure.id)},
    { key: "preview", label: t("procedures.open"), icon: "ph-eye", tone: "outline", onClick: (procedure) => setSelectedId(procedure.id) },
    { key: "edit", label: t("procedures.edit"), icon: "ph-pencil-simple", tone: "ghost", onClick: (procedure) => setEditing(procedure) }
  ], [t]);

  return (
    <section className="roost-work-surface grid min-h-[calc(100vh-10rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-company p-3">
      <CcPageHeader actions={<><DepartmentScopeControl baseHref="/areas?area=04-operacje&view=procedures" value={scoped ? effectiveDepartment : null} /><CcButton iconLeft="ph-plus" onClick={() => { setError(null); setEditing(null); }} size="sm" variant="primary">{t("procedures.new")}</CcButton></>} description={scoped ? locale === "pl" ? "Procedury przypisane do wybranego działu." : "Procedures assigned to the selected department." : t("procedures.description")} eyebrow={scoped ? departmentLabel(effectiveDepartment, t) : t("procedures.eyebrow")} title={scoped ? `${t("views.04.procedures")} · ${departmentLabel(effectiveDepartment, t)}` : t("views.04.procedures")} />
      <div className="min-h-0 min-w-0 overflow-y-auto">
        {archiveSuccess ? <CcNotice tone="success" title={t("procedures.archive.success")} /> : null}
        {status === "loading" ? <CcNotice tone="loading" title={t("procedures.loading")} /> : null}
        {status === "error" ? <CcNotice tone="error" title={error || t("procedures.loadError")} /> : null}
        {status === "ready" ? <CcDataTable columns={columns} density="compact" emptyDetail={t("procedures.emptyDetail")} emptyTitle={t("procedures.empty")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} getRowLabel={(procedure) => procedure.name} initialQuickFilter="current" initialSort={{ key: "name", direction: "asc" }} labels={tableLabels} mobileMode="cards" quickFilters={[{ key: "current", label: t("procedures.current"), predicate: (procedure) => !["archived", "retired"].includes(procedure.status) }, { key: "all", label: t("procedures.all"), predicate: () => true }]} rowActionItems={rowActions} rows={procedures} searchPlaceholder={t("procedures.search")} tableMinWidthClassName="min-w-[920px]" /> : null}
      </div>
      {contractId?<ProcedureContractsModal procedureId={contractId} onClose={()=>setContractId(null)}/>:null}
      {selected ? <ProcedureDetail archiveOpen={confirmArchive} canArchive={ownerRole} busy={busy} onActivate={() => void activate()} onArchive={openArchive} onClose={() => { setSelectedId(null); setArchiveSuccess(false); }} onEdit={() => { setSelectedId(null); setError(null); setEditing(selected); }} procedure={selected} /> : null}
      {selected && confirmArchive && ownerRole ? <ProcedureArchiveDialog procedure={selected} preview={archivePreview} loading={archiveLoading} busy={busy} stale={archiveStale} error={archiveError} reason={archiveReason} acknowledged={archiveAcknowledged} onReason={setArchiveReason} onAcknowledge={setArchiveAcknowledged} onRefresh={() => void refreshArchive(selected.id, true)} onCancel={closeArchive} onConfirm={() => void archive()} /> : null}
      {editing !== undefined ? <ProcedureEditor error={error} onClose={() => { setEditing(undefined); setError(null); }} onSubmit={(event) => void submit(event)} permissionOptions={permissionOptions} procedure={editing} processes={processes} saving={busy} toolOptions={toolOptions} /> : null}
    </section>
  );
}
