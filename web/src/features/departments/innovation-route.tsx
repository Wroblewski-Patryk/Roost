import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { CcTextInput } from "../../components/cc-text-input";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";
import {
  ApplicationCapability,
  ProductApplication,
  ProductEngineeringCatalog,
  ProductGap,
  ProcedureSummary,
  ProjectSummary,
  Readiness,
} from "./product-engineering-types";

type PortfolioPacket = {
  summary: {
    applications: number;
    activeDevelopment: number;
    prototypes: number;
    productization: number;
    products: number;
    averageReadiness: number;
  };
  applications: ProductApplication[];
};

type CockpitView =
  | "overview"
  | "capabilities"
  | "gaps"
  | "architecture"
  | "interfaces"
  | "execution"
  | "evidence";

const lifecycleStages = [
  "idea",
  "discovery",
  "prototype",
  "mvp",
  "development",
  "validation",
  "productization",
  "productized",
  "archived",
];
const observedStates = [
  "unknown",
  "not_started",
  "missing",
  "partial",
  "complete",
  "verified",
];
const architectureTypes = [
  "frontend",
  "backend",
  "database",
  "orm",
  "cache",
  "queue",
  "realtime",
  "authentication",
  "storage",
  "deployment",
  "hosting",
  "ci_cd",
  "external_service",
  "other",
];
const interfaceTypes = [
  "human_ui",
  "rest_api",
  "graphql",
  "websocket",
  "webhook",
  "event",
  "mcp_resource",
  "mcp_tool",
  "cli",
  "sdk",
];
const applicationTypes = [
  "web_application",
  "mobile_application",
  "desktop_application",
  "api_service",
  "internal_tool",
  "ai_native_application",
  "automation_platform",
  "library",
  "other",
];
const productStages = [
  "not_productized",
  "candidate",
  "launch_preparation",
  "active",
  "growth",
  "mature",
  "maintenance",
  "deprecated",
  "retired",
];
const applicationStatuses = ["active", "paused", "archived", "deprecated"];
const applicationPlatforms = [
  "web",
  "mobile",
  "desktop",
  "api",
  "service",
  "cli",
  "agent_facing",
];

function humanize(value: string) {
  return humanizeBusinessValue(value);
}

function lifecycleIcon(stage: string) {
  if (["productized", "growth", "mature"].includes(stage)) return "ph-rocket-launch";
  if (["validation", "launch_preparation"].includes(stage)) return "ph-seal-check";
  if (["development", "mvp"].includes(stage)) return "ph-code";
  if (["prototype", "discovery"].includes(stage)) return "ph-flask";
  if (["archived", "retired"].includes(stage)) return "ph-archive";
  return "ph-lightbulb";
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-3 text-xs font-bold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <progress
        className="progress progress-primary h-2 w-full"
        max="100"
        value={value}
      ></progress>
    </div>
  );
}

function ApplicationCard({
  application,
  onOpen,
}: {
  application: ProductApplication;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  return (
    <button
      className="rounded-company border border-base-300 bg-base-100 p-5 text-left transition hover:border-primary hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-company-ink">
            {application.name}
          </h3>
          <p className="mt-1 text-sm text-company-muted">
            {application.description || "No application description yet."}
          </p>
        </div>
        <span
          aria-label={`${t("innovation.stage")}: ${humanize(application.innovationStage)}`}
          className="roost-stage-icon"
          role="img"
          title={humanize(application.innovationStage)}
        >
          <i className={`ph-bold ${lifecycleIcon(application.innovationStage)}`} aria-hidden="true"></i>
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {(application.readiness?.dimensions || [])
          .slice(0, 5)
          .map((dimension) => (
            <Meter
              key={dimension.key}
              label={dimension.name}
              value={dimension.score}
            />
          ))}
        {!application.readiness?.dimensions.length ? (
          <p className="text-sm text-company-muted">
            Assign capabilities to calculate readiness.
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold">
        {application.readiness?.dimensions.length ? <span className="text-company-muted">Overall readiness {application.readiness.overall || 0}%</span> : null}
        {application.gapSummary?.blockers ? <span className="badge badge-error">{application.gapSummary.blockers} blockers</span> : null}
      </div>
    </button>
  );
}

function metadataText(application: ProductApplication, key: string) {
  const value = application.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function OperationalContext({ application }: { application: ProductApplication }) {
  const workspaceRoot = metadataText(application, "localWorkspaceRoot");
  const localDirectory = metadataText(application, "localDirectory");
  const repository = application.repositories?.find((item) => item.isPrimary) || application.repositories?.[0];
  const deploymentUrl = metadataText(application, "deploymentUrl") || application.frontendUrl;
  const localPath = workspaceRoot && localDirectory ? `${workspaceRoot}\\${localDirectory}` : null;

  return (
    <section className="rounded-company border border-base-300 bg-base-100 p-5 lg:col-span-2">
      <div>
        <p className="text-xs font-black uppercase text-primary">Codex + Roost</p>
        <h3 className="text-xl font-black">Operational context</h3>
        <p className="mt-1 text-sm text-company-muted">Canonical locations used to route local Codex work and owner-authorized releases.</p>
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-black uppercase text-company-muted">Local repository</dt>
          <dd className="mt-1 break-all font-mono text-sm">{localPath || "Not configured"}</dd>
        </div>
        <div>
          <dt className="text-xs font-black uppercase text-company-muted">Git repository</dt>
          <dd className="mt-1 break-all text-sm">{repository ? <a className="link link-primary" href={repository.url} rel="noreferrer" target="_blank">{repository.url}</a> : "Not configured"}</dd>
          {repository?.defaultBranch ? <p className="mt-1 text-xs text-company-muted">Default branch: {repository.defaultBranch}</p> : null}
        </div>
        <div>
          <dt className="text-xs font-black uppercase text-company-muted">Deployment</dt>
          <dd className="mt-1 break-all text-sm">{deploymentUrl ? <a className="link link-primary" href={deploymentUrl} rel="noreferrer" target="_blank">{deploymentUrl}</a> : "Not configured"}</dd>
          <p className="mt-1 text-xs text-company-muted">Coolify · triggered by an authorized Git push</p>
        </div>
        <div>
          <dt className="text-xs font-black uppercase text-company-muted">Execution policy</dt>
          <dd className="mt-1 text-sm font-bold">Codex runs locally on Windows</dd>
          <p className="mt-1 text-xs text-company-muted">Commit, push and deployment require explicit owner authority.</p>
        </div>
      </dl>
    </section>
  );
}

function CreateApplicationPanel({
  catalog,
  onCreated,
}: {
  catalog: ProductEngineeringCatalog | null;
  onCreated: (application: ProductApplication) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const response = await api<{ data: ProductApplication }>(
        "/v1/product-engineering/applications",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") || ""),
            slug: String(form.get("slug") || ""),
            description: String(form.get("description") || "") || undefined,
            problemStatement:
              String(form.get("problemStatement") || "") || undefined,
            valueProposition:
              String(form.get("valueProposition") || "") || undefined,
            applicationType: String(
              form.get("applicationType") || "web_application",
            ),
            blueprintId: String(form.get("blueprintId") || "") || undefined,
            targetPlatforms: form.getAll("targetPlatforms"),
          }),
        },
      );
      setOpen(false);
      onCreated(response.data);
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "application_create_failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open)
    return (
      <CcButton iconLeft="ph-plus" onClick={() => setOpen(true)} size="sm" variant="primary">{t("innovation.newApplication")}</CcButton>
    );
  return (
    <CcRecordEditorModal actions={<><CcButton onClick={() => setOpen(false)} type="button" variant="ghost">{t("common.cancel")}</CcButton><CcButton disabled={saving} iconLeft="ph-plus" type="submit" variant="primary">{saving ? t("innovation.creating") : t("innovation.createApplication")}</CcButton></>} description={t("innovation.createDescription")} eyebrow={t("innovation.eyebrow")} onClose={() => setOpen(false)} onSubmit={submit} title={t("innovation.newApplication")} titleId="application-create-title">
      {error ? <CcNotice tone="error" title={error} /> : null}
      <CcRecordEditorSection title="Identity" description="Give the application a durable name, identifier and concise definition.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Name" required>{({ id }) => <CcTextInput autoFocus id={id} name="name" required />}</CcField>
          <CcField label="Stable slug" hint="Lowercase letters, numbers, dots and hyphens.">{({ id, describedBy }) => <CcTextInput aria-describedby={describedBy} id={id} name="slug" pattern="[a-z0-9._-]+" placeholder="soar" required />}</CcField>
          <div className="md:col-span-2"><CcField label="Description">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} name="description" />}</CcField></div>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Product intent" description="Connect the problem, value and reusable blueprint before development starts.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Problem statement">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} name="problemStatement" />}</CcField>
          <CcField label="Value proposition">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} name="valueProposition" />}</CcField>
          <CcField label="Application type">{({ id }) => <CcSelect id={id} name="applicationType">
            <option value="web_application">Web application</option>
            <option value="api_service">API service</option>
            <option value="mobile_application">Mobile application</option>
            <option value="desktop_application">Desktop application</option>
            <option value="ai_native_application">AI-native application</option>
            <option value="internal_tool">Internal tool</option>
          </CcSelect>}</CcField>
          <CcField label="Blueprint" hint="Optional starting contract.">{({ id, describedBy }) => <CcSelect aria-describedby={describedBy} id={id} name="blueprintId">
            <option value="">No blueprint</option>
            {catalog?.blueprints.map((blueprint) => (
              <option key={blueprint.id} value={blueprint.id}>
                {blueprint.name}
              </option>
            ))}
          </CcSelect>}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Target platforms" description="Select every surface the application is expected to support.">
        <fieldset><legend className="sr-only">Target platforms</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "web",
              "mobile",
              "desktop",
              "api",
              "service",
              "cli",
              "agent_facing",
            ].map((platform) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-company border border-base-300 bg-base-100/20 px-3 py-2 text-sm font-bold hover:bg-base-200/45" key={platform}>
                <input
                  className="checkbox checkbox-sm"
                  type="checkbox"
                  name="targetPlatforms"
                  value={platform}
                />
                <span>{humanize(platform)}</span>
              </label>
            ))}
        </div></fieldset>
      </CcRecordEditorSection>
    </CcRecordEditorModal>
  );
}

function EditApplicationProfile({
  application,
  onSaved,
}: {
  application: ProductApplication;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await api(`/v1/product-engineering/applications/${application.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          description: String(form.get("description") || "") || null,
          problemStatement: String(form.get("problemStatement") || "") || null,
          targetUsers: String(form.get("targetUsers") || "") || null,
          valueProposition: String(form.get("valueProposition") || "") || null,
          applicationType: String(
            form.get("applicationType") || "web_application",
          ),
          owner: String(form.get("owner") || "") || null,
          productStage: String(form.get("productStage") || "not_productized"),
          status: String(form.get("status") || "active"),
          businessModel: String(form.get("businessModel") || "") || null,
          targetPlatforms: form.getAll("targetPlatforms"),
          frontendUrl: String(form.get("frontendUrl") || "") || null,
          backendUrl: String(form.get("backendUrl") || "") || null,
          documentationUrl: String(form.get("documentationUrl") || "") || null,
        }),
      });
      await onSaved();
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "application_update_failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open)
    return (
      <CcButton iconLeft="ph-pencil-simple" onClick={() => setOpen(true)} variant="outline">Edit application profile</CcButton>
    );
  return (
    <CcRecordEditorModal actions={<><CcButton onClick={() => setOpen(false)} type="button" variant="ghost">Cancel</CcButton><CcButton disabled={saving} iconLeft="ph-floppy-disk" type="submit" variant="primary">{saving ? "Saving…" : "Save application"}</CcButton></>} description="Update the shared application source record used across innovation and productization." eyebrow="11 Innovation · Application" onClose={() => setOpen(false)} onSubmit={submit} title={`Edit ${application.name}`} titleId="application-profile-title">
      {error ? <CcNotice tone="error" title={error} /> : null}
      <CcRecordEditorSection title="Identity" description="The application name, type and operating definition seen throughout Roost.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Name" required>{({ id }) => <CcTextInput autoFocus defaultValue={application.name} id={id} name="name" required />}</CcField>
          <CcField label="Application type">{({ id }) => <CcSelect defaultValue={application.applicationType} id={id} name="applicationType">
            {applicationTypes.map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </CcSelect>}</CcField>
          <div className="md:col-span-2"><CcField label="Description">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" defaultValue={application.description || ""} id={id} name="description" />}</CcField></div>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Product intent" description="Keep the problem, value and audience together so decisions retain their context.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Problem statement">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" defaultValue={application.problemStatement || ""} id={id} name="problemStatement" />}</CcField>
          <CcField label="Value proposition">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" defaultValue={application.valueProposition || ""} id={id} name="valueProposition" />}</CcField>
          <CcField label="Target users">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" defaultValue={application.targetUsers || ""} id={id} name="targetUsers" />}</CcField>
          <CcField label="Business model">{({ id }) => <CcTextInput defaultValue={application.businessModel || ""} id={id} name="businessModel" />}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Ownership and lifecycle" description="Assign operational ownership and the current product state.">
        <div className="grid items-start gap-4 md:grid-cols-3">
          <CcField label="Owner">{({ id }) => <CcTextInput defaultValue={application.owner || ""} id={id} name="owner" />}</CcField>
          <CcField label="Product lifecycle">{({ id }) => <CcSelect defaultValue={application.productStage} id={id} name="productStage">
            {productStages.map((stage) => (
              <option key={stage} value={stage}>
                {humanize(stage)}
              </option>
            ))}
          </CcSelect>}</CcField>
          <CcField label="Operating status">{({ id }) => <CcSelect defaultValue={application.status} id={id} name="status">
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </CcSelect>}</CcField>
        </div>
      </CcRecordEditorSection>
      <CcRecordEditorSection title="Delivery surfaces" description="Link the places where the application runs and where its documentation lives.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CcField label="Frontend URL">{({ id }) => <CcTextInput defaultValue={application.frontendUrl || ""} id={id} name="frontendUrl" type="url" />}</CcField>
          <CcField label="Backend URL">{({ id }) => <CcTextInput defaultValue={application.backendUrl || ""} id={id} name="backendUrl" type="url" />}</CcField>
          <div className="md:col-span-2"><CcField label="Documentation URL">{({ id }) => <CcTextInput defaultValue={application.documentationUrl || ""} id={id} name="documentationUrl" type="url" />}</CcField></div>
        </div>
        <fieldset className="mt-4"><legend className="text-sm font-bold text-company-ink">Target platforms</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {applicationPlatforms.map((platform) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-company border border-base-300 bg-base-100/20 px-3 py-2 text-sm font-bold hover:bg-base-200/45" key={platform}>
                <input
                  className="checkbox checkbox-sm"
                  type="checkbox"
                  name="targetPlatforms"
                  value={platform}
                  defaultChecked={application.targetPlatforms.includes(
                    platform,
                  )}
                />
                <span>{humanize(platform)}</span>
              </label>
            ))}
        </div></fieldset>
      </CcRecordEditorSection>
    </CcRecordEditorModal>
  );
}

function CapabilityMatrix({
  application,
  capabilities,
  catalog,
  procedures,
  onRefresh,
}: {
  application: ProductApplication;
  capabilities: ApplicationCapability[];
  catalog: ProductEngineeringCatalog | null;
  procedures: ProcedureSummary[];
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const tableLabels = useTranslatedTableLabels();
  const [selected, setSelected] = useState<ApplicationCapability | null>(null);
  const assignedIds = new Set(
    capabilities.map((item) => item.capabilityDefinition.id),
  );
  const definitions =
    catalog?.domains.flatMap((domain) =>
      domain.capabilities
        .filter((item) => !assignedIds.has(item.id))
        .map((capability) => ({ capability, domainName: domain.name })),
    ) || [];
  const rows = capabilities;

  useEffect(() => {
    if (selected)
      setSelected(capabilities.find((item) => item.id === selected.id) || null);
  }, [capabilities, selected?.id]);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${application.id}/capabilities`,
      {
        method: "POST",
        body: JSON.stringify({
          capabilityDefinitionId: form.get("capabilityDefinitionId"),
          applicability: form.get("applicability"),
          priority: Number(form.get("priority") || 50),
        }),
      },
    );
    formElement.reset();
    await onRefresh();
  }

  async function recordObserved(
    capability: ApplicationCapability,
    observedState: string,
  ) {
    await api(
      `/v1/product-engineering/applications/${application.id}/observations`,
      {
        method: "POST",
        body: JSON.stringify({
          applicationCapabilityId: capability.id,
          observedState,
          summary: `Observed state set from Application Cockpit to ${observedState}.`,
          source: "human",
        }),
      },
    );
    await onRefresh();
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${application.id}/evidence`,
      {
        method: "POST",
        body: JSON.stringify({
          applicationCapabilityId: selected.id,
          type: form.get("type"),
          reference: form.get("reference"),
          description: form.get("description") || undefined,
          source: "human",
        }),
      },
    );
    formElement.reset();
    await onRefresh();
  }

  async function verifyEvidence(evidenceId: string) {
    await api(`/v1/product-engineering/evidence/${evidenceId}/actions/verify`, {
      method: "POST",
      body: JSON.stringify({ status: "verified" }),
    });
    await onRefresh();
  }

  async function linkProcedure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(`/v1/product-engineering/capability-definitions/${selected.capabilityDefinition.id}/procedures`, {
      method: "POST",
      body: JSON.stringify({ procedureId: form.get("procedureId"), relationType: "implementation", required: true })
    });
    formElement.reset();
    await onRefresh();
  }

  async function unlinkProcedure(procedureId: string) {
    if (!selected) return;
    await api(`/v1/product-engineering/capability-definitions/${selected.capabilityDefinition.id}/procedures/${procedureId}`, { method: "DELETE" });
    await onRefresh();
  }

  const columns: Array<CcTableColumn<ApplicationCapability>> = [
    {
      key: "capability",
      header: t("innovation.capability"),
      sortable: true,
      searchValue: (item) => `${item.capabilityDefinition.name} ${item.capabilityDefinition.domain.name}`,
      filterable: true,
      filterLabel: t("innovation.domain"),
      filterValue: (item) => item.capabilityDefinition.domain.key,
      filterOptions: catalog?.domains.map((item) => ({ value: item.key, label: item.name })),
      cell: (item) => <div className="grid"><strong>{item.capabilityDefinition.name}</strong><span className="text-xs text-company-muted">{item.capabilityDefinition.domain.name}</span></div>
    },
    {
      key: "applicability",
      header: t("innovation.applicability"),
      sortable: true,
      filterable: true,
      filterValue: (item) => item.applicability,
      cell: (item) => <span>{humanize(item.applicability)}</span>
    },
    { key: "target", header: t("innovation.target"), sortable: true, sortValue: (item) => item.targetState, cell: (item) => <span>{humanize(item.targetState)}</span> },
    {
      key: "observed",
      header: t("innovation.observed"),
      sortable: true,
      filterable: true,
      filterValue: (item) => item.observedState,
      cell: (item) => <CcSelect className="select-sm" onClick={(event) => event.stopPropagation()} onChange={(event) => void recordObserved(item, event.target.value)} value={item.observedState} wrapperClassName="min-w-36">{observedStates.map((state) => <option key={state} value={state}>{humanize(state)}</option>)}</CcSelect>
    },
    { key: "evidence", header: t("innovation.evidence"), sortable: true, sortValue: (item) => item.evidence.length, cell: (item) => <span>{item.evidence.length}</span> },
    {
      key: "blocked",
      header: t("innovation.blocked"),
      sortable: true,
      sortValue: (item) => item.dependenciesFrom.some((dependency) => dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState)) ? 1 : 0,
      cell: (item) => item.dependenciesFrom.some((dependency) => dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState)) ? <span className="badge badge-error">{t("common.yes")}</span> : <span className="text-company-muted">{t("common.no")}</span>
    }
  ];

  return (
    <div className="grid gap-5">
      <form
        className="grid gap-3 rounded-company border border-base-300 bg-base-200/35 p-4 md:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={assign}
      >
        <CcSelect
          name="capabilityDefinitionId"
          required
        >
          <option value="">Assign capability…</option>
          {definitions.map(({ capability, domainName }) => (
            <option key={capability.id} value={capability.id}>
              {domainName} / {capability.name}
            </option>
          ))}
        </CcSelect>
        <CcSelect name="applicability">
          <option value="required">Required</option>
          <option value="recommended">Recommended</option>
          <option value="optional">Optional</option>
          <option value="not_applicable">Not applicable</option>
        </CcSelect>
        <input
          className="input input-bordered w-24"
          name="priority"
          type="number"
          min="0"
          max="100"
          defaultValue="50"
          aria-label="Priority"
        />
        <CcButton type="submit">Assign</CcButton>
      </form>
      <CcDataTable
        columns={columns}
        density="compact"
        emptyDetail={t("innovation.capabilities.empty.detail")}
        emptyTitle={t("innovation.capabilities.empty.title")}
        enableColumnVisibility={false}
        enablePagination={false}
        getRowLabel={(item) => item.capabilityDefinition.name}
        labels={tableLabels}
        mobileMode="cards"
        onRowClick={setSelected}
        quickFilters={[
          { key: "all", label: t("table.all"), predicate: () => true },
          { key: "gaps", label: t("innovation.onlyGaps"), predicate: (item) => !["complete", "verified"].includes(item.observedState) }
        ]}
        rows={rows}
        searchPlaceholder={t("innovation.capabilities.search")}
        tableMinWidthClassName="min-w-[840px]"
      />
      {selected ? (
        <section className="rounded-company border border-primary/25 bg-base-100 p-5">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">
                Capability detail
              </p>
              <h3 className="text-xl font-black">
                {selected.capabilityDefinition.name}
              </h3>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm text-company-muted">
                {selected.capabilityDefinition.description ||
                  "No definition description."}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-bold">Lifecycle</dt>
                  <dd>{humanize(selected.lifecycleStatus)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Strategy</dt>
                  <dd>{humanize(selected.implementationStrategy)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Target</dt>
                  <dd>{humanize(selected.targetState)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Observed</dt>
                  <dd>{humanize(selected.observedState)}</dd>
                </div>
              </dl>
              <h4 className="mt-5 font-black">Definition of Done dimensions</h4>
              <div className="mt-2 grid gap-2">
                {selected.dimensions.map((dimension) => (
                  <div
                    className="flex justify-between rounded-company bg-base-200 p-2 text-sm"
                    key={dimension.id}
                  >
                    <span>{dimension.name}</span>
                    <span>{humanize(dimension.observedState)}</span>
                  </div>
                ))}
                {!selected.dimensions.length ? (
                  <p className="text-sm text-company-muted">
                    No explicit dimensions yet.
                  </p>
                ) : null}
              </div>
              <h4 className="mt-5 font-black">Reusable procedures</h4>
              <p className="mt-1 text-xs text-company-muted">These procedures belong to the capability definition and appear in every application that uses it.</p>
              <div className="mt-2 grid gap-2">
                {(selected.capabilityDefinition.procedures || []).map((link) => (
                  <div className="flex items-center justify-between gap-3 rounded-company border border-base-300 p-3 text-sm" key={link.procedure.id}>
                    <span><strong>{link.procedure.name}</strong><small className="block text-company-muted">v{link.procedure.version} · {humanize(link.procedure.status)} · {link.procedure.steps.length} steps</small></span>
                    <button className="btn btn-ghost btn-xs" onClick={() => void unlinkProcedure(link.procedure.id)} type="button">Unlink</button>
                  </div>
                ))}
                {!(selected.capabilityDefinition.procedures || []).length ? <p className="text-sm text-company-muted">No reusable procedure linked.</p> : null}
              </div>
              <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={linkProcedure}>
                <CcSelect name="procedureId" required wrapperClassName="grow">
                  <option value="">Link active procedure…</option>
                  {procedures.filter((procedure) => !(selected.capabilityDefinition.procedures || []).some((link) => link.procedure.id === procedure.id)).map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
                </CcSelect>
                <CcButton type="submit">Link</CcButton>
              </form>
            </div>
            <div>
              <h4 className="font-black">Evidence</h4>
              <div className="mt-2 grid gap-2">
                {selected.evidence.map((evidence) => (
                  <div
                    className="rounded-company border border-base-300 p-3"
                    key={evidence.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{humanize(evidence.type)}</strong>
                      {evidence.verificationStatus === "verified" ? (
                        <span className="badge badge-success">Verified</span>
                      ) : (
                        <button
                          className="btn btn-outline btn-xs"
                          type="button"
                          onClick={() => void verifyEvidence(evidence.id)}
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    <p className="mt-1 break-all text-xs text-company-muted">
                      {evidence.reference}
                    </p>
                  </div>
                ))}
              </div>
              <form className="mt-4 grid gap-2" onSubmit={addEvidence}>
                <select className="select select-bordered" name="type">
                  <option value="source_file">Source file</option>
                  <option value="test">Test</option>
                  <option value="api_endpoint">API endpoint</option>
                  <option value="documentation">Documentation</option>
                  <option value="git_commit">Git commit</option>
                  <option value="deployment">Deployment</option>
                  <option value="manual_verification">
                    Manual verification
                  </option>
                </select>
                <input
                  className="input input-bordered"
                  name="reference"
                  placeholder="Path, endpoint, commit, URL…"
                  required
                />
                <input
                  className="input input-bordered"
                  name="description"
                  placeholder="What does this evidence prove?"
                />
                <CcButton type="submit">Attach evidence</CcButton>
              </form>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CatalogView({
  catalog,
  onRefresh,
}: {
  catalog: ProductEngineeringCatalog | null;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  async function createDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/v1/product-engineering/capability-definitions", {
        method: "POST",
        body: JSON.stringify({
          domainId: form.get("domainId"),
          readinessDimensionId: form.get("readinessDimensionId") || undefined,
          key: form.get("key"),
          name: form.get("name"),
          description: form.get("description") || undefined,
          universal: form.get("universal") === "on",
          defaultApplicability: form.get("defaultApplicability"),
        }),
      });
      formElement.reset();
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "capability_create_failed",
      );
    }
  }
  return (
    <div className="grid gap-5">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-black">Capability Library</h2>
        <p className="mt-1 text-sm text-company-muted">
          One reusable definition, many application-specific implementations.
        </p>
        {error ? <CcNotice tone="error" title={error} /> : null}
        <form
          className="mt-4 grid gap-3 md:grid-cols-3"
          onSubmit={createDefinition}
        >
          <input
            className="input input-bordered"
            name="name"
            placeholder="Capability name"
            required
          />
          <input
            className="input input-bordered"
            name="key"
            placeholder="stable-key"
            required
          />
          <select className="select select-bordered" name="domainId" required>
            <option value="">Domain…</option>
            {catalog?.domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered"
            name="readinessDimensionId"
          >
            <option value="">Readiness follows domain</option>
            {catalog?.dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered"
            name="defaultApplicability"
          >
            <option value="recommended">Recommended</option>
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
          <label className="label cursor-pointer justify-start gap-2">
            <input
              className="checkbox"
              name="universal"
              type="checkbox"
              defaultChecked
            />{" "}
            Universal
          </label>
          <textarea
            className="textarea textarea-bordered md:col-span-2"
            name="description"
            placeholder="Definition"
          ></textarea>
          <CcButton type="submit">Add definition</CcButton>
        </form>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {catalog?.domains.map((domain) => (
          <section
            className="rounded-company border border-base-300 bg-base-100 p-4"
            key={domain.id}
          >
            <div className="flex justify-between">
              <h3 className="font-black">{domain.name}</h3>
              <span className="badge badge-outline">
                {domain.capabilities.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {domain.capabilities.map((capability) => (
                <div
                  className="rounded-company bg-base-200/60 p-3"
                  key={capability.id}
                >
                  <strong>{capability.name}</strong>
                  <p className="mt-1 text-xs text-company-muted">
                    {capability.description || capability.key}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black">Capability Packs</h3>
          {catalog?.packs.map((pack) => (
            <div className="mt-3 rounded-company bg-base-200 p-3" key={pack.id}>
              <strong>{pack.name}</strong>
              <p className="text-xs text-company-muted">
                {pack.items.length} capabilities
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black">Application Blueprints</h3>
          {catalog?.blueprints.map((blueprint) => (
            <div
              className="mt-3 rounded-company bg-base-200 p-3"
              key={blueprint.id}
            >
              <strong>{blueprint.name}</strong>
              <p className="text-xs text-company-muted">
                {blueprint.capabilities.length} baseline capabilities
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function ExecutionWorkbench({
  application,
  procedures,
  projects,
  onRefresh,
}: {
  application: ProductApplication;
  procedures: ProcedureSummary[];
  projects: ProjectSummary[];
  onRefresh: () => Promise<void>;
}) {
  const linkedProcedureIds = new Set((application.procedures || []).map((link) => link.procedure.id));
  const linkedProjectIds = new Set((application.projects || []).map((link) => link.project.id));

  async function linkProcedure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(`/v1/product-engineering/applications/${application.id}/procedures`, {
      method: "POST",
      body: JSON.stringify({ procedureId: form.get("procedureId"), relationType: "governs", required: true })
    });
    formElement.reset();
    await onRefresh();
  }

  async function linkProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(`/v1/product-engineering/applications/${application.id}/projects`, {
      method: "POST",
      body: JSON.stringify({ projectId: form.get("projectId"), relationType: "delivery" })
    });
    formElement.reset();
    await onRefresh();
  }

  async function unlink(kind: "procedures" | "projects", id: string) {
    await api(`/v1/product-engineering/applications/${application.id}/${kind}/${id}`, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-primary">Operating model</p><h3 className="text-xl font-black">Application procedures</h3><p className="mt-1 text-sm text-company-muted">The repeatable way this application is designed, verified, released and improved.</p></div>
          <a className="btn btn-ghost btn-sm" href="/areas?area=04-operacje&view=procedures">Manage procedures</a>
        </div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={linkProcedure}>
          <CcSelect name="procedureId" required wrapperClassName="grow"><option value="">Link application procedure…</option>{procedures.filter((item) => !linkedProcedureIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</CcSelect>
          <CcButton type="submit">Link</CcButton>
        </form>
        <div className="mt-4 divide-y divide-base-300 border-y border-base-300">
          {(application.procedures || []).map((link) => (
            <article className="flex items-start justify-between gap-4 py-4" key={link.procedure.id}>
              <div><div className="flex flex-wrap items-center gap-2"><strong>{link.procedure.name}</strong><span className={`badge badge-sm ${link.procedure.status === "active" ? "badge-success" : "badge-warning"}`}>{humanize(link.procedure.status)}</span></div><p className="mt-1 text-sm text-company-muted">{link.procedure.purpose}</p><p className="mt-2 text-xs font-bold">v{link.procedure.version} · {link.procedure.steps.length} steps · {humanize(link.relationType)}</p></div>
              <button className="btn btn-ghost btn-xs" onClick={() => void unlink("procedures", link.procedure.id)} type="button">Unlink</button>
            </article>
          ))}
          {!(application.procedures || []).length ? <CcNotice tone="empty" title="No application procedure linked" detail="Link a lifecycle, release or verification procedure to make the delivery model explicit." /> : null}
        </div>
      </section>

      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-primary">Execution</p><h3 className="text-xl font-black">Projects & tasks</h3><p className="mt-1 text-sm text-company-muted">Shared work records that expose delivery state to you, the graph and AI agents.</p></div>
          <a className="btn btn-ghost btn-sm" href="/areas?area=04-operacje&view=tasks">Open tasks</a>
        </div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={linkProject}>
          <CcSelect name="projectId" required wrapperClassName="grow"><option value="">Link delivery project…</option>{projects.filter((item) => !linkedProjectIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</CcSelect>
          <CcButton type="submit">Link</CcButton>
        </form>
        <div className="mt-4 divide-y divide-base-300 border-y border-base-300">
          {(application.projects || []).map((link) => {
            const tasks = [...(link.project.tasks || []), ...(link.project.taskLists || []).flatMap((list) => list.tasks)];
            const done = tasks.filter((task) => task.status === "done").length;
            const blocked = tasks.filter((task) => task.status === "blocked").length;
            return <article className="py-4" key={link.project.id}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><strong>{link.project.name}</strong><span className="badge badge-sm badge-outline">{humanize(link.project.status)}</span>{blocked ? <span className="badge badge-sm badge-error">{blocked} blocked</span> : null}</div><p className="mt-1 text-sm text-company-muted">{link.project.description || "No project description."}</p></div><button className="btn btn-ghost btn-xs" onClick={() => void unlink("projects", link.project.id)} type="button">Unlink</button></div><div className="mt-3 flex items-center gap-3 text-xs font-bold"><span>{done}/{tasks.length} tasks done</span><progress className="progress progress-primary h-1.5 max-w-40" max="100" value={tasks.length ? Math.round(done / tasks.length * 100) : 0}></progress></div></article>;
          })}
          {!(application.projects || []).length ? <CcNotice tone="empty" title="No delivery project linked" detail="Link a shared project so tasks and progress become part of this application's live model." /> : null}
        </div>
      </section>
    </div>
  );
}

export function InnovationRoute() {
  const { t } = useLanguage();
  const [portfolio, setPortfolio] = useState<PortfolioPacket | null>(null);
  const [catalog, setCatalog] = useState<ProductEngineeringCatalog | null>(
    null,
  );
  const [selected, setSelected] = useState<ProductApplication | null>(null);
  const [capabilities, setCapabilities] = useState<ApplicationCapability[]>([]);
  const [gaps, setGaps] = useState<ProductGap[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [procedures, setProcedures] = useState<ProcedureSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [view, setView] = useState<CockpitView>("overview");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    try {
      const [portfolioResponse, catalogResponse, proceduresResponse, projectsResponse] = await Promise.all([
        api<{ data: PortfolioPacket }>("/v1/product-engineering/portfolio"),
        api<{ data: ProductEngineeringCatalog }>(
          "/v1/product-engineering/catalog",
        ),
        api<{ data: ProcedureSummary[] }>("/v1/process-core/procedures"),
        api<{ data: ProjectSummary[] }>("/v1/projects"),
      ]);
      setPortfolio(portfolioResponse.data);
      setCatalog(catalogResponse.data);
      setProcedures(proceduresResponse.data.filter((procedure) => procedure.status === "active"));
      setProjects(projectsResponse.data.filter((project) => project.status !== "archived"));
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof AppApiError ? caught.code : "innovation_load_failed",
      );
      setStatus("error");
    }
  }, []);

  const loadCockpit = useCallback(async (applicationId: string) => {
    const [applicationResponse, mapResponse, gapResponse, readinessResponse] =
      await Promise.all([
        api<{ data: ProductApplication }>(
          `/v1/product-engineering/applications/${applicationId}`,
        ),
        api<{ data: { capabilities: ApplicationCapability[] } }>(
          `/v1/product-engineering/applications/${applicationId}/capability-map`,
        ),
        api<{ data: { gaps: ProductGap[] } }>(
          `/v1/product-engineering/applications/${applicationId}/gaps`,
        ),
        api<{ data: { readiness: Readiness } }>(
          `/v1/product-engineering/applications/${applicationId}/readiness`,
        ),
      ]);
    setSelected(applicationResponse.data);
    setCapabilities(mapResponse.data.capabilities);
    setGaps(gapResponse.data.gaps);
    setReadiness(readinessResponse.data.readiness);
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);
  const refreshAll = useCallback(async () => {
    await loadBase();
    if (selected) await loadCockpit(selected.id);
  }, [loadBase, loadCockpit, selected]);
  const dimensions = useMemo(() => readiness?.dimensions || [], [readiness]);

  async function updateStage(stage: string) {
    if (!selected) return;
    await api(`/v1/product-engineering/applications/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({ innovationStage: stage }),
    });
    await refreshAll();
  }

  async function addArchitecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${selected.id}/architecture`,
      {
        method: "POST",
        body: JSON.stringify({
          type: form.get("type"),
          name: form.get("name"),
          description: form.get("description") || undefined,
        }),
      },
    );
    formElement.reset();
    await loadCockpit(selected.id);
  }

  async function addInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${selected.id}/interfaces`,
      {
        method: "POST",
        body: JSON.stringify({
          type: form.get("type"),
          key: form.get("key"),
          name: form.get("name"),
          reference: form.get("reference") || undefined,
          requiresApproval: form.get("requiresApproval") === "on",
          auditRequired: true,
        }),
      },
    );
    formElement.reset();
    await loadCockpit(selected.id);
  }

  return (
    <>
      <CcPageHeader
        actions={<>
            <CcButton
              variant="outline"
              onClick={() => {
                setCatalogOpen(!catalogOpen);
                setSelected(null);
              }}
            >
              {catalogOpen ? t("innovation.portfolio") : t("innovation.library")}
            </CcButton>
            {!catalogOpen ? (
              <CreateApplicationPanel
                catalog={catalog}
                onCreated={(application) => {
                  void loadBase();
                  void loadCockpit(application.id);
                }}
              />
            ) : null}
          </>}
        description={t("innovation.description")}
        eyebrow={t("innovation.eyebrow")}
        title={t("innovation.title")}
      />
      {status === "loading" ? (
        <CcNotice tone="loading" title={t("innovation.loading")} />
      ) : null}
      {status === "error" ? (
        <CcNotice tone="error" title={error || "Innovation could not load"} />
      ) : null}
      {catalogOpen ? (
        <CatalogView catalog={catalog} onRefresh={loadBase} />
      ) : selected ? (
        <section className="grid gap-5">
          <div className="rounded-company border border-base-300 bg-base-100 p-5">
            <button
              className="btn btn-ghost btn-sm mb-3"
              onClick={() => setSelected(null)}
            >
              ← Portfolio
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">{selected.name}</h2>
                <p className="mt-2 max-w-3xl text-company-muted">
                  {selected.description ||
                    "Application definition is incomplete."}
                </p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-black uppercase text-company-muted">
                  Innovation lifecycle
                </span>
                <select
                  className="select select-bordered"
                  value={selected.innovationStage}
                  onChange={(event) => void updateStage(event.target.value)}
                >
                  {lifecycleStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {humanize(stage)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="tabs tabs-box mt-5 overflow-x-auto">
              {(
                [
                  "overview",
                  "capabilities",
                  "gaps",
                  "architecture",
                  "interfaces",
                  "execution",
                  "evidence",
                ] as CockpitView[]
              ).map((item) => (
                <button
                  className={`tab ${view === item ? "tab-active" : ""}`}
                  key={item}
                  onClick={() => setView(item)}
                >
                  {humanize(item)}
                </button>
              ))}
            </div>
          </div>
          {view === "overview" ? (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <section className="rounded-company border border-base-300 bg-base-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black">Product definition</h3>
                  <EditApplicationProfile
                    application={selected}
                    onSaved={() => loadCockpit(selected.id)}
                  />
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Problem
                    </dt>
                    <dd className="mt-1">
                      {selected.problemStatement || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Value proposition
                    </dt>
                    <dd className="mt-1">
                      {selected.valueProposition || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Target users
                    </dt>
                    <dd className="mt-1">
                      {selected.targetUsers || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Platforms
                    </dt>
                    <dd className="mt-1">
                      {selected.targetPlatforms.map(humanize).join(", ") ||
                        "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Product lifecycle
                    </dt>
                    <dd className="mt-1">{humanize(selected.productStage)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Operating status
                    </dt>
                    <dd className="mt-1">{humanize(selected.status)}</dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-company border border-base-300 bg-base-100 p-5">
                <div className="flex justify-between">
                  <h3 className="text-xl font-black">Readiness</h3>
                  <span className="text-2xl font-black text-primary">
                    {readiness?.overall || 0}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {dimensions.map((dimension) => (
                    <Meter
                      key={dimension.key}
                      label={dimension.name}
                      value={dimension.score}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-company-muted">
                  Calculated from observed capability state (60%), Definition of
                  Done dimensions (25%), and verified evidence coverage (15%).
                </p>
              </section>
              <OperationalContext application={selected} />
            </div>
          ) : null}
          {view === "capabilities" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <CapabilityMatrix
                application={selected}
                capabilities={capabilities}
                catalog={catalog}
                procedures={procedures}
                onRefresh={() => loadCockpit(selected.id)}
              />
            </section>
          ) : null}
          {view === "gaps" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">What is missing?</h3>
              <div className="mt-4 grid gap-3">
                {gaps.map((gap) => (
                  <article
                    className={`rounded-company border p-4 ${gap.blocked ? "border-error/50 bg-error/5" : "border-base-300"}`}
                    key={gap.id}
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <strong>{gap.name}</strong>
                        <p className="text-xs text-company-muted">
                          {gap.domain.name} · Target {humanize(gap.targetState)}{" "}
                          · Observed {humanize(gap.observedState)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`badge ${gap.severity === "blocker" ? "badge-error" : "badge-warning"}`}
                        >
                          {humanize(gap.severity)}
                        </span>
                        <span className="badge badge-outline">
                          {gap.evidenceCount} evidence
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
                {!gaps.length ? (
                  <CcNotice tone="success" title="No capability gaps" />
                ) : null}
              </div>
            </section>
          ) : null}
          {view === "architecture" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">Architecture map</h3>
              <form
                className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_2fr_auto]"
                onSubmit={addArchitecture}
              >
                <select className="select select-bordered" name="type">
                  {architectureTypes.map((type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered"
                  name="name"
                  placeholder="Component name"
                  required
                />
                <input
                  className="input input-bordered"
                  name="description"
                  placeholder="Responsibility and boundary"
                />
                <CcButton type="submit">Add</CcButton>
              </form>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {selected.architecture?.map((item) => (
                  <article
                    className="rounded-company border border-base-300 p-4"
                    key={item.id}
                  >
                    <span className="badge badge-outline">
                      {humanize(item.type)}
                    </span>
                    <h4 className="mt-2 font-black">{item.name}</h4>
                    <p className="text-sm text-company-muted">
                      {item.description || "No responsibility description."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {view === "interfaces" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">
                Human, system and agent interfaces
              </h3>
              <form
                className="mt-4 grid gap-3 md:grid-cols-5"
                onSubmit={addInterface}
              >
                <select className="select select-bordered" name="type">
                  {interfaceTypes.map((type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered"
                  name="key"
                  placeholder="stable-key"
                  required
                />
                <input
                  className="input input-bordered"
                  name="name"
                  placeholder="Interface / operation"
                  required
                />
                <input
                  className="input input-bordered"
                  name="reference"
                  placeholder="Route, topic or command"
                />
                <CcButton type="submit">Add</CcButton>
                <label className="label cursor-pointer justify-start gap-2 md:col-span-5">
                  <input
                    className="checkbox checkbox-sm"
                    name="requiresApproval"
                    type="checkbox"
                  />{" "}
                  Requires approval
                </label>
              </form>
              <div className="mt-5 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Interface</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Approval</th>
                      <th>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.interfaces?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{humanize(item.type)}</td>
                        <td>{item.reference || "-"}</td>
                        <td>{item.requiresApproval ? "Required" : "No"}</td>
                        <td>{item.auditRequired ? "Required" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {view === "execution" ? (
            <ExecutionWorkbench
              application={selected}
              procedures={procedures}
              projects={projects}
              onRefresh={() => loadCockpit(selected.id)}
            />
          ) : null}
          {view === "evidence" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">
                Application evidence ledger
              </h3>
              <p className="mt-2 text-company-muted">
                Evidence is attached in capability detail. Verification remains
                a separate audited action and never promotes observed state
                automatically.
              </p>
              <div className="mt-4 grid gap-2">
                {capabilities.flatMap((capability) =>
                  capability.evidence.map((evidence) => (
                    <article
                      className="rounded-company border border-base-300 p-3"
                      key={evidence.id}
                    >
                      <div className="flex justify-between gap-3">
                        <strong>{capability.capabilityDefinition.name}</strong>
                        <span className="badge badge-outline">
                          {humanize(evidence.verificationStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-company-muted">
                        {humanize(evidence.type)} · {evidence.reference}
                      </p>
                    </article>
                  )),
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {portfolio?.applications.map((application) => (
              <ApplicationCard
                application={application}
                key={application.id}
                onOpen={() => {
                  setCatalogOpen(false);
                  setView("overview");
                  void loadCockpit(application.id);
                }}
              />
            ))}
            {portfolio && !portfolio.applications.length ? (
              <div className="lg:col-span-3">
                <CcNotice
                  tone="empty"
                  title={t("innovation.empty.title")}
                  detail={t("innovation.empty.detail")}
                />
              </div>
            ) : null}
          </section>
        </>
      )}
    </>
  );
}
