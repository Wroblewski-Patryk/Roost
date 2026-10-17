import { ProcedureContractsModal } from "./procedure-composition";
import { ProcedureLaunchPanel, procedureLaunchMessage } from "./procedure-launch-panel";
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
import { recordIdFromQuery } from "../../owner-record-navigation";
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

type ProcedureStepDraft = Omit<ProcedureStep, "id" | "stepOrder"> & { clientId: string; inputNamesText: string; outputText: string };

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

type ProjectOption = { id: string; name: string; status: string };
type RoleOption = { id: string; name: string; type: string; permissions: unknown; escalationTargetId?: string | null };
type ProcedureContext = { ownerDepartment?: { key: string } | null; relatedDepartments: Array<{ key: string }>;
  applicableDepartments: Array<{ key: string }>; scopes: Array<{ type: string; entityId?: string | null; label?: string | null }> };

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
  organizationalContext?: ProcedureContext;
  steps: ProcedureStep[];
  updatedAt: string;
};

type ProcedureProvenance = {
  procedure: Pick<Procedure, "id" | "name" | "purpose" | "scope" | "version" | "status">;
  origin: { state: "unknown" } | { state: "recorded"; recordKind: "audit" | "event"; action: string; recordedAt: string; actorType: string | null };
  lifecycle: Array<{ id: string; action: string; actorType: string | null; recordedAt: string }>;
  configuration: {
    process: { id: string; name: string; status: string } | null;
    ownerRole: { id: string; name: string } | null;
    stages: Array<{ id: string; name: string; status: string }>;
    policies: Array<{ id: string; name: string; status: string }>;
    applications: Array<{ id: string; name: string; status: string; relationType: string; required: boolean }>;
    capabilities: Array<{ id: string; name: string; deprecated: boolean; relationType: string; required: boolean }>;
  };
  tasks: { current: ProcedureTaskLink[]; history: ProcedureTaskLink[] };
};

type ProcedureTaskLink = { taskId: string; title: string; status: string; basis: "admission" | "composition"; version: number; operation: string | null; current: boolean; recordedAt: string };

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

function activationErrorMessage(error: unknown, pl: boolean) {
  if (!(error instanceof AppApiError)) return pl ? "Nie udało się aktywować procedury. Odśwież widok." : "Could not activate the procedure. Refresh the view.";
  const labels: Record<string, [string, string]> = {
    procedure_activation_exact_review_required: ["Przegląd dokładnej wersji jest wymagany. Odśwież widok.", "Exact version review is required. Refresh the view."],
    procedure_activation_stale: ["Szkic zmienił się. Odśwież widok i sprawdź wersję ponownie.", "The draft changed. Refresh and review this version again."],
    procedure_project_scope_stale: ["Projekt nie jest już aktywny. Wybierz aktywny projekt w szkicu.", "The project is no longer active. Select an active project in the draft."],
    procedure_activation_requirements_missing: ["Uzupełnij kroki i oczekiwany wynik w szkicu.", "Add steps and an expected result to the draft."],
    only_draft_procedure_can_be_activated: ["Ta wersja nie jest już szkicem. Odśwież widok.", "This version is no longer a draft. Refresh the view."]
  };
  if (error.code === "procedure_activation_incomplete") {
    const blockers = error.details && typeof error.details === "object" && "blockers" in error.details && Array.isArray(error.details.blockers)
      ? error.details.blockers.filter((value): value is string => typeof value === "string") : [];
    const intro = pl ? "Uzupełnij definicję przed aktywacją." : "Complete the definition before activation.";
    return blockers.length ? `${intro} ${blockers.map(code => procedureLaunchMessage(code, pl)).join(" ")}` : intro;
  }
  return labels[error.code]?.[pl ? 0 : 1] || (pl ? "Nie udało się aktywować procedury. Odśwież widok." : "Could not activate the procedure. Refresh the view.");
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
    rollbackInstruction: null,
    inputNamesText: "",
    outputText: ""
  };
}

function ProcedureStepsEditor({ steps, onChange, pl }: { steps: ProcedureStepDraft[]; onChange: (steps: ProcedureStepDraft[]) => void; pl: boolean }) {
  function update(index: number, patch: Partial<ProcedureStepDraft>) {
    onChange(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  }

  function updateInputNames(index: number, raw: string) {
    const previous = steps[index].expectedInput || {};
    const keys = [...new Set(raw.split("\n").map(value => value.trim()).filter(Boolean))];
    update(index, { inputNamesText: raw, expectedInput: Object.fromEntries(keys.map(key => [key, previous[key] ?? {}])) });
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
      <input name="stepsJson" type="hidden" value={JSON.stringify(steps.map(({ clientId: _clientId, inputNamesText: _inputNamesText, outputText: _outputText, ...step }) => step))} />
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li className="roost-work-panel-muted grid gap-3 rounded-company p-3" key={step.clientId}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>
                <CcSelect
                  aria-label={pl ? `Typ wykonawcy kroku ${index + 1}` : `Execution type for step ${index + 1}`}
                  className="select-sm"
                  onChange={(event) => update(index, { stepType: event.target.value })}
                  value={step.stepType}
                >
                  <option value="manual">{pl ? "Ręcznie" : "Manual"}</option>
                  <option value="agent">{pl ? "Agent" : "Agent"}</option>
                  <option value="human_review">{pl ? "Ocena człowieka" : "Human review"}</option>
                  <option value="automated">{pl ? "Automatycznie" : "Automated"}</option>
                  <option value="integration_call">{pl ? "Integracja" : "Integration call"}</option>
                </CcSelect>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label={pl ? `Przenieś krok ${index + 1} w górę` : `Move step ${index + 1} up`} className="btn btn-ghost btn-xs btn-square" disabled={index === 0} onClick={() => move(index, -1)} type="button"><i className="ph-bold ph-arrow-up" aria-hidden="true"></i></button>
                <button aria-label={pl ? `Przenieś krok ${index + 1} w dół` : `Move step ${index + 1} down`} className="btn btn-ghost btn-xs btn-square" disabled={index === steps.length - 1} onClick={() => move(index, 1)} type="button"><i className="ph-bold ph-arrow-down" aria-hidden="true"></i></button>
                <button aria-label={pl ? `Usuń krok ${index + 1}` : `Remove step ${index + 1}`} className="btn btn-ghost btn-xs btn-square text-error" disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))} type="button"><i className="ph-bold ph-trash" aria-hidden="true"></i></button>
              </div>
            </div>
            <textarea
              aria-label={pl ? `Instrukcja kroku ${index + 1}` : `Instruction for step ${index + 1}`}
              className="textarea textarea-bordered min-h-20 w-full"
              onChange={(event) => update(index, { instruction: event.target.value })}
              placeholder={pl ? "Opisz jedną czynność i jej oczekiwany wynik." : "Describe one clear action and its expected outcome."}
              required
              value={step.instruction}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">{pl ? "Pola wejściowe (po jednym w wierszu)" : "Input field names (one per line)"}
                <textarea aria-label={pl ? `Pola wejściowe kroku ${index + 1}` : `Input fields for step ${index + 1}`} className="textarea textarea-bordered min-h-20 w-full font-mono text-sm" value={step.inputNamesText} onChange={event => updateInputNames(index, event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">{pl ? "Wymagany wynik lub dowód" : "Required output or evidence"}
                <textarea aria-label={pl ? `Wynik kroku ${index + 1}` : `Output for step ${index + 1}`} className="textarea textarea-bordered min-h-20 w-full" value={step.outputText} onChange={event => { const { description: _old, ...rest } = step.expectedOutput || {}; update(index, { outputText: event.target.value, expectedOutput: event.target.value.trim() ? { ...rest, description: event.target.value.trim() } : rest }); }} />
              </label>
            </div>
            {Object.keys(step.expectedOutput || {}).some(key => key !== "description") ? <p className="text-xs text-company-muted">{pl ? "Pozostałe pola złożonego wyniku zostaną zachowane." : "Other structured output fields will be preserved."}</p> : null}
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="grid gap-1 text-sm font-semibold">{pl ? "Warunek sukcesu" : "Success condition"}
                <textarea aria-label={pl ? `Warunek sukcesu kroku ${index + 1}` : `Success condition for step ${index + 1}`} className="textarea textarea-bordered min-h-20 w-full" value={typeof step.validationRule?.success === "string" ? step.validationRule.success : ""} onChange={event => update(index, { validationRule: { ...step.validationRule, success: event.target.value } })} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">{pl ? "Maks. prób (1–3)" : "Maximum attempts (1–3)"}
                <input aria-label={pl ? `Limit prób kroku ${index + 1}` : `Attempt limit for step ${index + 1}`} className="input input-bordered w-full" type="number" min={1} max={3} value={typeof step.validationRule?.maxAttempts === "number" ? step.validationRule.maxAttempts : ""} onChange={event => { const { maxAttempts: _old, ...rest } = step.validationRule || {}; update(index, { validationRule: event.target.value ? { ...rest, maxAttempts: Number(event.target.value) } : rest }); }} />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">{pl ? "Plan awaryjny i droga wyjątku" : "Fallback and exception path"}
              <textarea aria-label={pl ? `Plan awaryjny kroku ${index + 1}` : `Fallback for step ${index + 1}`} className="textarea textarea-bordered min-h-20 w-full" value={step.rollbackInstruction || ""} onChange={event => update(index, { rollbackInstruction: event.target.value || null })} />
            </label>
          </li>
        ))}
      </ol>
      <CcButton iconLeft="ph-plus" onClick={() => onChange([...steps, newStep(steps.length)])} size="sm" variant="outline">{pl ? "Dodaj krok" : "Add step"}</CcButton>
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
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const isImprovement = Boolean(procedure && procedure.status !== "draft");
  const savedProjectId = procedure?.organizationalContext?.scopes.length === 1 && procedure.organizationalContext.scopes[0].type === "project"
    ? procedure.organizationalContext.scopes[0].entityId || "" : "";
  const [scopeMode, setScopeMode] = useState<"preserve" | "company" | "project">(procedure ? savedProjectId ? "project" : "preserve" : "project");
  const [projectScopeId, setProjectScopeId] = useState(savedProjectId);
  const [ownerRoleId, setOwnerRoleId] = useState(procedure?.ownerRole?.id || "");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.all([api<{ data: ProjectOption[] }>("/v1/projects"), api<{ data: RoleOption[] }>("/v1/company-os/company-roles?limit=100")])
      .then(([projectResponse, roleResponse]) => { if (alive) { setProjects(projectResponse.data); setRoles(roleResponse.data); setOptionsError(false); } })
      .catch(() => { if (alive) setOptionsError(true); });
    return () => { alive = false; };
  }, []);
  const [requiredTools, setRequiredTools] = useState(procedure?.requiredTools || []);
  const [requiredPermissions, setRequiredPermissions] = useState(procedure?.requiredPermissions || []);
  const [steps, setSteps] = useState<ProcedureStepDraft[]>(procedure?.steps.length
    ? procedure.steps.map(({ id, stepOrder: _stepOrder, ...step }) => ({ ...step, clientId: id,
      inputNamesText: Object.keys(step.expectedInput || {}).join("\n"),
      outputText: typeof step.expectedOutput?.description === "string" ? step.expectedOutput.description : "" }))
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
      actions={<><CcButton onClick={onClose} type="button" variant="ghost">{pl ? "Anuluj" : "Cancel"}</CcButton><CcButton disabled={saving || optionsError} loading={saving} type="submit" variant="primary">{pl ? "Zapisz szkic" : "Save draft"}</CcButton></>}
      description={isImprovement ? pl ? "Zapis utworzy nową wersję roboczą. Aktywna procedura pozostanie bez zmian do osobnego przeglądu i aktywacji." : "Saving creates a new draft. The active procedure stays unchanged until separate review and activation." : pl ? "Opisz rzeczywisty zakres, odpowiedzialność, wejście, wynik i kroki." : "Define the real scope, accountability, inputs, outcome, and steps."}
      eyebrow={pl ? "04 Operacje · Procedury" : "04 Operations · Procedures"}
      maxWidthClassName="max-w-5xl"
      meta={procedure ? <span>{pl ? "Wersja" : "Version"} {procedure.version}</span> : null}
      onClose={onClose}
      closeLabel={pl ? "Zamknij edytor" : "Close editor"}
      onSubmit={onSubmit}
      title={procedure ? (isImprovement ? `${pl ? "Szkic ulepszenia" : "Improve"} ${procedure.name}` : `${pl ? "Edytuj" : "Edit"} ${procedure.name}`) : pl ? "Nowa procedura" : "New procedure"}
      titleId="procedure-editor-title"
    >
      {error ? <CcNotice tone="error" title={error} live /> : null}
      {optionsError ? <CcNotice tone="error" title={pl ? "Nie udało się odczytać projektów i ról. Zamknij i spróbuj ponownie." : "Could not load projects and roles. Close and retry."} live /> : null}
      <CcRecordEditorSection title={pl ? "Definicja" : "Definition"} description={pl ? "Kontrakt pracy widoczny przed uruchomieniem." : "The operating contract shown before launch."}>
        <div className="grid gap-4 md:grid-cols-2">
          <CcField label={pl ? "Nazwa" : "Name"} required>{({ id, describedBy, invalid }) => <CcTextInput aria-describedby={describedBy} autoFocus defaultValue={procedure?.name || ""} id={id} invalid={invalid} name="name" required />}</CcField>
          <CcField label={pl ? "Powiązany proces" : "Related process"} hint={pl ? "Proces określa działy, w których widać procedurę." : "The process supplies the department lens."}>
            {({ id, describedBy, invalid }) => <CcSelect aria-describedby={describedBy} defaultValue={procedure?.process?.id || ""} id={id} invalid={invalid} name="processId"><option value="">{pl ? "Wszystkie działy / bez procesu" : "All departments / no process"}</option>{processes.map((process) => <option key={process.id} value={process.id}>{process.name}{process.department ? ` · ${process.department}` : ""}</option>)}</CcSelect>}
          </CcField>
          <div className="md:col-span-2"><CcField label={pl ? "Cel procedury" : "Purpose"} required>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.purpose || ""} id={id} name="purpose" required />}</CcField></div>
          <CcField label={pl ? "Opis zakresu" : "Scope description"}>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.scope || ""} id={id} name="scope" />}</CcField>
          <CcField label={pl ? "Oczekiwany wynik" : "Expected result"} required>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" defaultValue={procedure?.expectedResult || ""} id={id} name="expectedResult" required />}</CcField>
          <CcField label={pl ? "Zakres uruchomienia" : "Launch applicability"} hint={pl ? "Sam opis zakresu nie przypina procedury do projektu." : "A scope description alone does not bind the procedure to a project."}>
            {({ id, describedBy }) => <CcSelect id={id} aria-describedby={describedBy} name="applicabilityMode" value={scopeMode} onChange={event => setScopeMode(event.target.value as typeof scopeMode)}>
              {procedure ? <option value="preserve">{pl ? "Zachowaj dotychczasowy zakres" : "Keep saved applicability"}</option> : null}
              <option value="project">{pl ? "Dokładny projekt" : "Exact project"}</option>
              <option value="company">{pl ? "Cała firma" : "Company-wide"}</option>
            </CcSelect>}
          </CcField>
          {scopeMode === "project" ? <CcField label={pl ? "Projekt" : "Project"} required>{({ id, describedBy }) => <CcSelect id={id} aria-describedby={describedBy} name="projectScopeId" value={projectScopeId} onChange={event => setProjectScopeId(event.target.value)} required><option value="">{pl ? "Wybierz dokładny projekt" : "Choose an exact project"}</option>{projects.filter(project => project.status === "active" || project.id === savedProjectId).map(project => <option key={project.id} value={project.id}>{project.name} · {project.id}</option>)}</CcSelect>}</CcField> : null}
          <CcField label={pl ? "Odpowiedzialna rola" : "Accountable role"} hint={pl ? "Uruchomienie z zadaniami wymaga roli człowieka i eskalacji lub końcowej decyzji właściciela." : "Task launch needs a human role and escalation or a final owner decision."}>
            {({ id, describedBy }) => <CcSelect id={id} aria-describedby={describedBy} name="ownerRoleId" value={ownerRoleId} onChange={event => setOwnerRoleId(event.target.value)}><option value="">{pl ? "Wybierz rolę" : "Choose a role"}</option>{procedure?.ownerRole && !roles.some(role => role.id === procedure.ownerRole?.id) ? <option value={procedure.ownerRole.id}>{procedure.ownerRole.name}</option> : null}{roles.filter(role => role.type === "human" || role.id === procedure?.ownerRole?.id).map(role => <option key={role.id} value={role.id}>{role.name} · {role.type}</option>)}</CcSelect>}
          </CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Wykonanie" : "Execution"} description={pl ? "Procedury ręczne mogą tworzyć zadania dopiero po aktywacji i podglądzie bez blokad." : "Manual procedures can create tasks only after activation and a blocker-free preview."}>
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <CcField label={pl ? "Wymagane narzędzia" : "Required tools"} hint={pl ? "Ten rodzaj uruchomienia obsługuje tylko Roost, bez zewnętrznych adapterów." : "This launch supports Roost only, without external adapters."}>{({ id }) => <CcMultiSelect id={id} name="requiredTools" onChange={setRequiredTools} options={completeToolOptions} placeholder={pl ? "Bez narzędzi" : "No tools required"} searchPlaceholder={pl ? "Szukaj narzędzia..." : "Search tools..."} value={requiredTools} />}</CcField>
            <CcField label={pl ? "Wymagane uprawnienia" : "Required permissions"} hint={pl ? "Dodatkowe uprawnienia zablokują ten rodzaj uruchomienia." : "Additional permissions block this launch type."}>{({ id }) => <CcMultiSelect id={id} name="requiredPermissions" onChange={setRequiredPermissions} options={completePermissionOptions} placeholder={pl ? "Bez dodatkowych uprawnień" : "No explicit permissions"} searchPlaceholder={pl ? "Szukaj uprawnienia..." : "Search permissions..."} value={requiredPermissions} />}</CcField>
          </div>
          <div className="border-t border-base-300 pt-4">
            <div className="mb-3">
              <h4 className="font-black text-company-ink">{pl ? "Kroki" : "Steps"}</h4>
              <p className="text-sm text-company-muted">{pl ? "Każdy krok ma osobne wejście, wynik, warunek sukcesu, limit prób i plan awaryjny." : "Each step has its own input, output, success condition, attempt limit, and fallback."}</p>
            </div>
            <ProcedureStepsEditor onChange={setSteps} steps={steps} pl={pl} />
          </div>
        </div>
      </CcRecordEditorSection>
    </CcRecordEditorModal>
  );
}

function ProcedureActivationReview({ procedure, busy, error, onClose, onConfirm }: {
  procedure: Procedure; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void;
}) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const scopes = procedure.organizationalContext?.scopes || [];
  return <CcRecordEditorModal titleId="procedure-activation-review" eyebrow={pl ? "Przegląd dokładnej wersji" : "Exact version review"}
    title={`${procedure.name} · v${procedure.version}`} onClose={onClose} closeLabel={pl ? "Zamknij przegląd" : "Close review"}
    description={pl ? "Aktywacja udostępni tę wersję do podglądu uruchomienia. Nie tworzy przebiegu ani zadań." : "Activation makes this version available for launch preview. It does not create a run or tasks."}
    onSubmit={event => { event.preventDefault(); onConfirm(); }}
    actions={<><CcButton type="button" variant="ghost" onClick={onClose}>{pl ? "Wróć" : "Back"}</CcButton><CcButton type="submit" variant="primary" loading={busy} disabled={busy}>{pl ? "Aktywuj tę wersję" : "Activate this version"}</CcButton></>}>
    {error ? <CcNotice tone="error" title={error} live /> : null}
    <dl className="grid gap-2 text-sm">
      <div><dt className="font-bold">{pl ? "Identyfikator" : "ID"}</dt><dd className="break-all font-mono">{procedure.id}</dd></div>
      <div><dt className="font-bold">{pl ? "Zakres strukturalny" : "Structured scope"}</dt><dd>{scopes.length ? scopes.map(scope => `${scope.type}: ${scope.entityId || (pl ? "cała firma" : "company")}`).join(" · ") : pl ? "Brak — podgląd uruchomienia będzie zablokowany" : "Missing — launch preview will be blocked"}</dd></div>
      <div><dt className="font-bold">{pl ? "Odpowiedzialna rola" : "Accountable role"}</dt><dd>{procedure.ownerRole?.name || (pl ? "Brak" : "Missing")}</dd></div>
      <div><dt className="font-bold">{pl ? "Oczekiwany wynik" : "Expected result"}</dt><dd>{procedure.expectedResult || (pl ? "Brak" : "Missing")}</dd></div>
    </dl>
    <ol className="grid gap-3">{procedure.steps.map(step => <li className="rounded-company border border-base-300 p-3 text-sm" key={step.id}>
      <p className="font-bold">{step.stepOrder}. {step.instruction}</p>
      <p>{pl ? "Wykonawca" : "Executor"}: {step.stepType} · {pl ? "Wejścia" : "Inputs"}: {Object.keys(step.expectedInput || {}).join(", ") || (pl ? "brak" : "none")}</p>
      <p>{pl ? "Wynik" : "Output"}: {JSON.stringify(step.expectedOutput || {})}</p>
      <p>{pl ? "Sukces" : "Success"}: {String(step.validationRule?.success || (pl ? "brak" : "missing"))} · {pl ? "Maks. prób" : "Max attempts"}: {String(step.validationRule?.maxAttempts || (pl ? "brak" : "missing"))}</p>
      <p>{pl ? "Plan awaryjny" : "Fallback"}: {step.rollbackInstruction || (pl ? "brak" : "missing")}</p>
    </li>)}</ol>
  </CcRecordEditorModal>;
}

function ProcedureDetail({ procedure, focusRunId, focusStepId, fromAttention, provenance, provenanceStatus, provenanceError, onRefreshProvenance, busy, archiveOpen = false, canArchive, onActivate, onArchive, onClose, onEdit }: {
  focusRunId?: string | null;
  focusStepId?: string | null;
  fromAttention?: boolean;
  procedure: Procedure;
  provenance: ProcedureProvenance | null;
  provenanceStatus: "idle" | "loading" | "ready" | "error";
  provenanceError: string | null;
  onRefreshProvenance: () => void;
  busy: boolean;
  onActivate: () => void;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
  archiveOpen?: boolean;
  canArchive: boolean;
}) {
  const { t, locale } = useLanguage();
  const pl = locale === "pl";
  const departments = departmentScopes(procedure.process);
  const host = useRef<HTMLElement>(null);
  const closeAction = useRef(onClose);
  const returnFocus = useRef<HTMLElement | null>(null);
  closeAction.current = onClose;
  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => returnFocus.current?.focus();
  }, []);
  useEffect(() => {
    if (archiveOpen) return;
    host.current?.querySelector<HTMLButtonElement>("[data-procedure-close]")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeAction.current(); return; }
      if (event.key !== "Tab" || !host.current) return;
      const focusable = [...host.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [archiveOpen]);
  return (
    <div aria-labelledby="procedure-detail-title" aria-modal="true" aria-hidden={archiveOpen} className="fixed inset-0 z-40 grid place-items-center bg-neutral/60 p-3 sm:p-4" role="dialog">
      <article className="roost-work-surface grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-company shadow-2xl" ref={host}>
        <header className="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100/45 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className={`badge badge-sm ${statusBadge(procedure.status)}`}>{humanizeBusinessValue(procedure.status, "Unknown", locale)}</span><span className="text-xs font-bold text-company-muted">{pl ? "Wersja" : "Version"} {procedure.version} · {pl ? "Zmieniono" : "Updated"} {updatedLabel(procedure.updatedAt)}</span></div>
            <h2 className="mt-2 text-2xl font-black text-company-ink" id="procedure-detail-title">{procedure.name}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted">{procedure.purpose}</p>
          </div>
          <button aria-label={pl ? "Zamknij procedurę" : "Close procedure"} className="btn btn-ghost btn-sm btn-circle" data-procedure-close onClick={onClose} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button>
        </header>
        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
          <dl className="grid gap-0 border-y border-base-300 text-sm md:grid-cols-2">
            {[[pl ? "Działy" : "Departments", procedure.process?.department ? departments.join(" · ") : pl ? "Wszystkie działy" : "All departments"], [pl ? "Proces" : "Process", procedure.process?.name || (pl ? "Brak powiązania" : "Not linked")], [pl ? "Zakres" : "Scope", procedure.scope || (pl ? "Nie określono" : "Not specified")], [pl ? "Oczekiwany wynik" : "Expected result", procedure.expectedResult || (pl ? "Brak — aktywacja zablokowana" : "Missing — activation is blocked")], [pl ? "Właściciel" : "Owner", procedure.ownerRole?.name || (pl ? "Nie przypisano" : "Not assigned")], [pl ? "Uprawnienia" : "Authority", procedure.requiredPermissions.length ? procedure.requiredPermissions.join(", ") : (pl ? "Brak jawnych wymagań uprawnień" : "No explicit permission requirements")]].map(([label, value]) => (
              <div className="grid gap-1 border-b border-base-300 px-1 py-3 last:border-b-0 md:grid-cols-[8rem_minmax(0,1fr)] md:odd:border-r" key={label}><dt className="font-bold text-company-muted">{label}</dt><dd className="min-w-0 text-company-ink">{value}</dd></div>
            ))}
          </dl>
          {canArchive ? <ProcedureProvenancePanel value={provenance} status={provenanceStatus} error={provenanceError} onRefresh={onRefreshProvenance} /> : null}
          {canArchive ? <ProcedureLaunchPanel procedure={procedure} focusRunId={focusRunId} focusStepId={focusStepId} fromAttention={fromAttention} /> : null}
          <section className="mt-6">
            <div className="flex items-end justify-between gap-3 border-b border-base-300 pb-2"><div><h3 className="font-black text-company-ink">{pl ? "Kroki" : "Steps"}</h3><p className="text-sm text-company-muted">{pl ? "Kolejność wykonania pracy." : "The executable order of work."}</p></div><span className="text-xs font-bold text-company-muted">{procedure.steps.length} {pl ? "kroków" : procedure.steps.length === 1 ? "step" : "steps"}</span></div>
            <ol>{procedure.steps.map((step) => <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-base-300 py-4" key={step.id}><span className="text-right text-sm font-black tabular-nums text-primary">{String(step.stepOrder).padStart(2, "0")}</span><div className="min-w-0"><p className="text-sm font-bold leading-6 text-company-ink">{step.instruction}</p>{step.rollbackInstruction ? <p className="mt-1 text-xs text-warning">{pl ? "Wycofanie:" : "Rollback:"} {step.rollbackInstruction}</p> : null}</div></li>)}</ol>
          </section>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 bg-base-100/35 p-4 sm:px-5">
          {canArchive && procedure.status !== "archived" ? <CcButton disabled={busy} iconLeft="ph-archive" onClick={onArchive} size="sm" variant="ghost">{t("procedures.archive.open")}</CcButton> : null}
          <div className="flex flex-wrap justify-end gap-2"><CcButton onClick={onClose} size="sm" variant="ghost">{pl ? "Zamknij" : "Close"}</CcButton><CcButton iconLeft="ph-pencil-simple" onClick={onEdit} size="sm" variant="outline">{procedure.status === "draft" ? pl ? "Edytuj szkic" : "Edit draft" : pl ? "Utwórz szkic ulepszenia" : "Create improvement draft"}</CcButton>{procedure.status === "draft" ? <CcButton loading={busy} onClick={onActivate} size="sm" variant="primary">{pl ? "Aktywuj" : "Activate"}</CcButton> : null}</div>
        </footer>
      </article>
    </div>
  );
}

function ProcedureProvenancePanel({ value, status, error, onRefresh }: {
  value: ProcedureProvenance | null; status: "idle" | "loading" | "ready" | "error"; error: string | null; onRefresh: () => void;
}) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const date = (at: string) => new Date(at).toLocaleString(pl ? "pl-PL" : "en-US");
  const statusLabel = (value: string) => humanizeBusinessValue(value, pl ? "Nieznany" : "Unknown", locale);
  const actionLabel = (value: string) => ({
    "procedure.create_draft": pl ? "Utworzono szkic" : "Draft created",
    "procedure.propose_revision": pl ? "Zaproponowano rewizję" : "Revision proposed",
    "procedure.update_draft": pl ? "Zmieniono szkic" : "Draft updated",
    "procedure.activate": pl ? "Aktywowano" : "Activated",
    "procedure.archive": pl ? "Zarchiwizowano" : "Archived",
    procedure_draft_created: pl ? "Utworzono szkic" : "Draft created",
    procedure_revision_proposed: pl ? "Zaproponowano rewizję" : "Revision proposed"
  } as Record<string, string>)[value] || (pl ? "Inny zapis cyklu życia" : "Other lifecycle record");
  const recordKindLabel = (value: string) => value === "audit" ? pl ? "audyt" : "audit" : pl ? "zdarzenie" : "event";
  const actorLabel = (value: string | null) => ({ user: pl ? "użytkownik" : "user", agent: "agent", system: pl ? "system" : "system", integration: pl ? "integracja" : "integration" } as Record<string, string>)[value || ""] || (pl ? "nieustalony aktor" : "unknown actor");
  const operationLabel = (value: string) => ({ runtime_execute: pl ? "wykonanie" : "execution", review_decision: pl ? "przegląd" : "review", return_to_executor: pl ? "zwrot do wykonawcy" : "return to executor", create_specialist_task: pl ? "zadanie specjalisty" : "specialist task" } as Record<string, string>)[value] || (pl ? "inna operacja" : "other operation");
  const group = (label: string, rows: string[]) => <div className="border-b border-base-300 py-3 last:border-b-0"><dt className="text-xs font-bold uppercase tracking-wide text-company-muted">{label}</dt><dd className="mt-1 text-sm text-company-ink">{rows.length ? rows.join(" · ") : pl ? "Brak zapisanego powiązania" : "No recorded link"}</dd></div>;
  const taskList = (items: ProcedureTaskLink[], empty: string) => items.length ? <ul className="space-y-2">{items.map((item) => <li className="rounded-lg border border-base-300 p-3" key={`${item.basis}:${item.taskId}:${item.operation}:${item.version}`}><a className="font-bold text-primary underline-offset-2 hover:underline" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(item.taskId)}`}>{item.title}</a><p className="mt-1 text-xs text-company-muted">{statusLabel(item.status)} · {item.basis === "admission" ? pl ? "Dopuszczenie" : "Admission" : pl ? "Kompozycja" : "Composition"} v{item.version}{item.operation ? ` · ${operationLabel(item.operation)}` : ""} · {date(item.recordedAt)}</p></li>)}</ul> : <p className="text-sm text-company-muted">{empty}</p>;
  return <section aria-labelledby="procedure-provenance-title" className="mt-6 border-t border-base-300 pt-5" data-procedure-provenance>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-company-ink" id="procedure-provenance-title">{pl ? "Pochodzenie i użycie" : "Provenance and use"}</h3><p className="text-sm text-company-muted">{pl ? "Zapisane fakty o tej wersji. Powiązanie nie dowodzi udanego wykonania." : "Recorded facts for this version. A link does not prove successful execution."}</p></div><CcButton onClick={onRefresh} size="sm" variant="ghost">{pl ? "Odśwież" : "Refresh"}</CcButton></div>
    {status === "loading" || status === "idle" ? <p className="mt-4 text-sm text-company-muted" role="status">{pl ? "Wczytywanie pochodzenia…" : "Loading provenance…"}</p> : null}
    {status === "error" ? <CcNotice tone="error" title={pl ? "Nie udało się odczytać pochodzenia" : "Could not load provenance"} description={error || undefined} /> : null}
    {status === "ready" && value ? <div className="mt-4 space-y-5">
      <div className="rounded-lg border border-base-300 bg-base-100/40 p-4"><h4 className="font-bold text-company-ink">{pl ? "Zapisany zamiar" : "Recorded intent"}</h4><p className="mt-2 text-sm">{value.procedure.purpose}</p><p className="mt-2 text-sm"><strong>{pl ? "Zakres:" : "Scope:"}</strong> {value.procedure.scope || (pl ? "Nie określono" : "Not specified")}</p></div>
      <div><h4 className="font-bold text-company-ink">{pl ? "Pochodzenie" : "Origin"}</h4>{value.origin.state === "recorded" ? <p className="mt-1 text-sm">{pl ? "Bezpośredni zapis" : "Direct record"}: {actionLabel(value.origin.action)} · {date(value.origin.recordedAt)} · {recordKindLabel(value.origin.recordKind)} · {actorLabel(value.origin.actorType)}</p> : <p className="mt-1 text-sm text-warning">{pl ? "Nieustalone — brak bezpośredniego zapisu utworzenia lub rewizji tej wersji." : "Unknown — no direct creation or revision record for this version."}</p>}{value.lifecycle.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">{pl ? "Dziennik cyklu życia" : "Lifecycle log"} ({value.lifecycle.length})</summary><ul className="mt-2 space-y-1">{value.lifecycle.map((item) => <li key={item.id}>{date(item.recordedAt)} · {actionLabel(item.action)} · {actorLabel(item.actorType)}</li>)}</ul></details> : null}</div>
      <div><h4 className="font-bold text-company-ink">{pl ? "Powiązania konfiguracji" : "Configuration links"}</h4><dl className="mt-1 grid gap-x-5 md:grid-cols-2">{group(pl ? "Proces" : "Process", value.configuration.process ? [`${value.configuration.process.name} (${statusLabel(value.configuration.process.status)})`] : [])}{group(pl ? "Rola właścicielska" : "Owner role", value.configuration.ownerRole ? [value.configuration.ownerRole.name] : [])}{group(pl ? "Etapy pipeline" : "Pipeline stages", value.configuration.stages.map((row) => `${row.name} (${statusLabel(row.status)})`))}{group(pl ? "Zasady" : "Policies", value.configuration.policies.map((row) => `${row.name} (${statusLabel(row.status)})`))}{group(pl ? "Aplikacje" : "Applications", value.configuration.applications.map((row) => `${row.name} (${statusLabel(row.status)}${row.required ? pl ? ", wymagane" : ", required" : ""})`))}{group(pl ? "Kompetencje" : "Capabilities", value.configuration.capabilities.map((row) => `${row.name} (${row.deprecated ? pl ? "wycofana" : "deprecated" : pl ? "bieżąca" : "current"}${row.required ? pl ? ", wymagana" : ", required" : ""})`))}</dl></div>
      <div className="grid gap-4 md:grid-cols-2"><div><h4 className="mb-2 font-bold text-company-ink">{pl ? "Powiązania z bieżącymi zadaniami" : "Links to current tasks"} ({value.tasks.current.length})</h4>{taskList(value.tasks.current, pl ? "Brak bieżących powiązań." : "No current links.")}</div><div><h4 className="mb-2 font-bold text-company-ink">{pl ? "Historyczne powiązania" : "Historical links"} ({value.tasks.history.length})</h4>{taskList(value.tasks.history, pl ? "Brak historycznych powiązań." : "No historical links.")}</div></div>
    </div> : null}
  </section>;
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
  const requestedProcedureId = recordIdFromQuery(window.location.search, "procedureId");
  const requestedRunId = recordIdFromQuery(window.location.search, "runId");
  const requestedStepId = recordIdFromQuery(window.location.search, "stepId");
  const linkQuery = new URLSearchParams(window.location.search);
  const invalidRunLink = (linkQuery.has("procedureId") && !requestedProcedureId) || (linkQuery.has("runId") && (!requestedRunId || !requestedProcedureId))
    || (linkQuery.has("stepId") && (!requestedStepId || !requestedRunId || !requestedProcedureId));
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
  const [selectedId, setSelectedId] = useState<string | null>(invalidRunLink ? null : requestedProcedureId);
  const [editing, setEditing] = useState<Procedure | null | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState(false);
  const [provenance, setProvenance] = useState<ProcedureProvenance | null>(null);
  const [provenanceStatus, setProvenanceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [provenanceError, setProvenanceError] = useState<string | null>(null);
  const [provenanceRefresh, setProvenanceRefresh] = useState(0);
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
  useEffect(() => {
    if (!ownerRole || !selectedId) { setProvenance(null); setProvenanceStatus("idle"); return; }
    let alive = true;
    setProvenance(null);
    setProvenanceStatus("loading");
    setProvenanceError(null);
    void api<{ data: ProcedureProvenance }>(`/v1/process-core/procedures/${encodeURIComponent(selectedId)}/provenance`)
      .then(({ data }) => { if (alive) { setProvenance(data); setProvenanceStatus("ready"); } })
      .catch((caught) => { if (alive) { setProvenanceError(caught instanceof AppApiError ? caught.code : "procedure_provenance_unavailable"); setProvenanceStatus("error"); } });
    return () => { alive = false; };
  }, [ownerRole, selectedId, selected?.updatedAt, provenanceRefresh]);
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
      const applicabilityMode = String(form.get("applicabilityMode") || "preserve");
      const savedContext = editing?.organizationalContext;
      const organizationalContext = applicabilityMode === "preserve" && editing ? undefined : {
        ownerDepartmentKey: savedContext?.ownerDepartment?.key ?? effectiveDepartment,
        relatedDepartmentKeys: savedContext?.relatedDepartments.map(department => department.key) ?? [],
        applicableDepartmentKeys: savedContext?.applicableDepartments.map(department => department.key) ?? [],
        scopes: applicabilityMode === "project"
          ? [{ type: "project", entityId: String(form.get("projectScopeId") || "") }]
          : [{ type: "company" }]
      };
      const payload = {
        name: form.get("name"),
        purpose: form.get("purpose"),
        scope: form.get("scope") || null,
        processId: form.get("processId") || null,
        ownerRoleId: form.get("ownerRoleId") || null,
        expectedResult: form.get("expectedResult"),
        requiredTools: form.getAll("requiredTools").map(String),
        requiredPermissions: form.getAll("requiredPermissions").map(String),
        steps: JSON.parse(String(form.get("stepsJson") || "[]")),
        ...(organizationalContext ? { organizationalContext } : {})
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
    if (!selected || !confirmActivate || selected.status !== "draft" || busy) return;
    setBusy(true);
    setActivationError(null);
    try { await api(`/v1/process-core/procedures/${selected.id}/actions/activate`, { method: "POST", body: JSON.stringify({ expectedVersion: selected.version, expectedUpdatedAt: selected.updatedAt }) }); setConfirmActivate(false); await load(selected.id); }
    catch (caught) { setActivationError(activationErrorMessage(caught, locale === "pl")); }
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
        {invalidRunLink ? <CcNotice live tone="error" title={locale === "pl" ? "Nieprawidłowy link do przebiegu." : "Invalid run link."} /> : null}
        {status === "ready" && requestedProcedureId && !procedures.some(item => item.id === requestedProcedureId) ? <CcNotice live tone="warning" title={locale === "pl" ? "Procedura z linku jest niedostępna w tym workspace." : "The linked procedure is unavailable in this workspace."} /> : null}
        {archiveSuccess ? <CcNotice tone="success" title={t("procedures.archive.success")} /> : null}
        {status === "loading" ? <CcNotice tone="loading" title={t("procedures.loading")} /> : null}
        {status === "error" ? <CcNotice tone="error" title={error || t("procedures.loadError")} /> : null}
        {status === "ready" ? <CcDataTable columns={columns} density="compact" emptyDetail={t("procedures.emptyDetail")} emptyTitle={t("procedures.empty")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} getRowLabel={(procedure) => procedure.name} initialQuickFilter="current" initialSort={{ key: "name", direction: "asc" }} labels={tableLabels} mobileMode="cards" quickFilters={[{ key: "current", label: t("procedures.current"), predicate: (procedure) => !["archived", "retired"].includes(procedure.status) }, { key: "all", label: t("procedures.all"), predicate: () => true }]} rowActionItems={rowActions} rows={procedures} searchPlaceholder={t("procedures.search")} tableMinWidthClassName="min-w-[920px]" /> : null}
      </div>
      {contractId?<ProcedureContractsModal procedureId={contractId} onClose={()=>setContractId(null)}/>:null}
      {selected ? <ProcedureDetail archiveOpen={confirmArchive || confirmActivate} canArchive={ownerRole} busy={busy} focusRunId={selected.id === requestedProcedureId ? requestedRunId : null} focusStepId={selected.id === requestedProcedureId ? requestedStepId : null} fromAttention={linkQuery.get("from") === "attention"} provenance={provenance} provenanceStatus={provenanceStatus} provenanceError={provenanceError} onRefreshProvenance={() => setProvenanceRefresh((value) => value + 1)} onActivate={() => { setActivationError(null); setConfirmActivate(true); }} onArchive={openArchive} onClose={() => { setSelectedId(null); setArchiveSuccess(false); }} onEdit={() => { setSelectedId(null); setError(null); setEditing(selected); }} procedure={selected} /> : null}
      {selected && confirmActivate ? <ProcedureActivationReview procedure={selected} busy={busy} error={activationError} onClose={() => { setConfirmActivate(false); setActivationError(null); }} onConfirm={() => void activate()} /> : null}
      {selected && confirmArchive && ownerRole ? <ProcedureArchiveDialog procedure={selected} preview={archivePreview} loading={archiveLoading} busy={busy} stale={archiveStale} error={archiveError} reason={archiveReason} acknowledged={archiveAcknowledged} onReason={setArchiveReason} onAcknowledge={setArchiveAcknowledged} onRefresh={() => void refreshArchive(selected.id, true)} onCancel={closeArchive} onConfirm={() => void archive()} /> : null}
      {editing !== undefined ? <ProcedureEditor error={error} onClose={() => { setEditing(undefined); setError(null); }} onSubmit={(event) => void submit(event)} permissionOptions={permissionOptions} procedure={editing} processes={processes} saving={busy} toolOptions={toolOptions} /> : null}
    </section>
  );
}
